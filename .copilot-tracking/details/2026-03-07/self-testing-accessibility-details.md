<!-- markdownlint-disable-file -->
# Implementation Details: Self-Testing Accessibility of the Scanner App (Epic 1974)

## Context Reference

Sources: `.copilot-tracking/research/2026-03-07/self-testing-accessibility-research.md`, subagent research documents in `.copilot-tracking/research/subagents/2026-03-07/`

## Implementation Phase 1: Playwright Test Infrastructure + Home Page Self-Scan (US 1996)

<!-- parallelizable: false -->

### Step 1.1: Add `@playwright/test` devDependency and create `playwright.config.ts`

Install `@playwright/test` as a devDependency. Create `playwright.config.ts` at the project root with `webServer` configuration to auto-start Next.js for testing.

Files:
* `package.json` — Add `@playwright/test` to devDependencies
* `playwright.config.ts` — New file; Playwright Test configuration

Configuration for `playwright.config.ts`:
```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [['html', { open: 'never' }], ['junit', { outputFile: 'test-results/a11y-junit.xml' }]]
    : [['html', { open: 'on-failure' }]],
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
  },
  webServer: {
    command: 'npm run build && npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

Success criteria:
* `@playwright/test` appears in `devDependencies`
* `playwright.config.ts` exists at project root
* `npx playwright test --list` runs without config errors

Context references:
* `.copilot-tracking/research/2026-03-07/self-testing-accessibility-research.md` (Lines 199-219) — Proposed playwright.config.ts

Dependencies:
* None

### Step 1.2: Create shared AxeBuilder fixture in `e2e/fixtures/axe-fixture.ts`

Create a shared Playwright Test fixture that extends the base `test` object to provide a pre-configured AxeBuilder instance with WCAG 2.2 AA tags.

Files:
* `e2e/fixtures/axe-fixture.ts` — New file; shared fixture

Fixture implementation:
```typescript
import { test as base } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

type AxeFixtures = {
  makeAxeBuilder: () => AxeBuilder;
};

export const test = base.extend<AxeFixtures>({
  makeAxeBuilder: async ({ page }, use) => {
    const makeAxeBuilder = () =>
      new AxeBuilder({ page }).withTags([
        'wcag2a',
        'wcag2aa',
        'wcag21a',
        'wcag21aa',
        'wcag22aa',
      ]);
    await use(makeAxeBuilder);
  },
});

export { expect } from '@playwright/test';
```

Success criteria:
* Fixture file exports `test` and `expect`
* Fixture provides `makeAxeBuilder` function that returns AxeBuilder with correct WCAG tags

Context references:
* `src/lib/scanner/engine.ts` (Lines 22-27) — WCAG tag configuration matching: `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`

Dependencies:
* Step 1.1 completion (`@playwright/test` installed)

### Step 1.3: Create `e2e/self-scan-home.spec.ts` for home page accessibility scan

Create a Playwright Test spec that navigates to the home page and runs AxeBuilder analysis. Test asserts zero violations.

Files:
* `e2e/self-scan-home.spec.ts` — New file; home page self-scan test

Test implementation:
```typescript
import { test, expect } from './fixtures/axe-fixture';
import { evaluateAccessibility } from './fixtures/threshold';

test.describe('Home page accessibility', () => {
  test('meets WCAG 2.2 AA threshold', async ({ page, makeAxeBuilder }) => {
    await page.goto('/');
    const results = await makeAxeBuilder().analyze();
    const totalChecks = results.passes.length + results.violations.length;
    const score = totalChecks > 0
      ? Math.round((results.passes.length / totalChecks) * 100)
      : 100;
    const evaluation = evaluateAccessibility(score, results.violations);
    expect(evaluation.passed, evaluation.details.join('\n')).toBe(true);
  });

  test('has zero violations after remediation', async ({ page, makeAxeBuilder }) => {
    await page.goto('/');
    const results = await makeAxeBuilder().analyze();
    expect(results.violations).toEqual([]);
  });

  test('has proper heading structure', async ({ page }) => {
    await page.goto('/');
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();
  });
});
```

Note: Two test strategies — one threshold-based (configurable pass/fail for CI gating) and one strict zero-violations (for full compliance tracking). The threshold test gates CI; the zero-violations test provides remediation visibility.

Success criteria:
* Test file exists and is syntactically valid
* Test runs against home page via Playwright (may fail with violations — that is expected pre-remediation)

Context references:
* `src/app/page.tsx` (Lines 1-40) — Home page structure
* `.copilot-tracking/research/2026-03-07/self-testing-accessibility-research.md` (Lines 247-256) — AxeBuilder example

Dependencies:
* Steps 1.1 and 1.2 completion

### Step 1.4: Create configurable threshold helper in `e2e/fixtures/threshold.ts`

Create a threshold evaluation helper that wraps the app's existing `evaluateThreshold()` function for use in Playwright tests. This enables configurable score-based and violation-count-based pass/fail assertions, matching the user requirement for "Threshold-based pass/fail in CI."

Files:
* `e2e/fixtures/threshold.ts` — New file; threshold evaluation helper for tests

Implementation:
```typescript
import { evaluateThreshold } from '../../src/lib/ci/threshold';
import type { ThresholdConfig } from '../../src/lib/types/crawl';
import type { AxeViolation } from '../../src/lib/types/scan';
import type { Result } from 'axe-core';

// Default threshold: score >= 90, zero critical/serious, 3 moderate, 5 minor
const DEFAULT_THRESHOLD: ThresholdConfig = {
  score: 90,
  maxViolations: {
    critical: 0,
    serious: 0,
    moderate: 3,
    minor: 5,
  },
};

/**
 * Convert axe-core Result[] to app's AxeViolation[] for threshold evaluation.
 */
function mapAxeResults(violations: Result[]): AxeViolation[] {
  return violations.map(v => ({
    id: v.id,
    impact: (v.impact ?? 'minor') as AxeViolation['impact'],
    description: v.description,
    help: v.help,
    helpUrl: v.helpUrl,
    tags: v.tags,
    nodes: v.nodes.map(n => ({
      html: n.html,
      target: n.target.map(String),
      failureSummary: n.failureSummary ?? '',
    })),
  }));
}

/**
 * Evaluate axe-core results against configurable thresholds.
 * Returns the evaluation result; callers use expect() on evaluation.passed.
 */
export function evaluateAccessibility(
  score: number,
  violations: Result[],
  config: ThresholdConfig = DEFAULT_THRESHOLD
) {
  const mapped = mapAxeResults(violations);
  return evaluateThreshold(score, mapped, config);
}

export { DEFAULT_THRESHOLD };
export type { ThresholdConfig };
```

Tests then use:
```typescript
const evaluation = evaluateAccessibility(calculatedScore, results.violations);
expect(evaluation.passed, evaluation.details.join('\n')).toBe(true);
```

Note: The `score` must be calculated from axe results. The app's `parseAxeResults()` in `result-parser.ts` computes this. Tests can import and use it, or compute a simple percentage from passes / (passes + violations).

Success criteria:
* Threshold helper wraps existing `evaluateThreshold()` from `src/lib/ci/threshold.ts`
* Default threshold is configurable (score 90, zero critical/serious)
* Tests can override threshold via parameter

Context references:
* `src/lib/ci/threshold.ts` (Lines 4-30) — `evaluateThreshold()` function with score and violation count checks
* `src/lib/types/crawl.ts` — `ThresholdConfig` type

Dependencies:
* Steps 1.1 and 1.2 completion

### Step 1.5: Add `test:a11y` script to `package.json`

Add a new npm script for running accessibility tests separately from unit tests.

Files:
* `package.json` — Add `test:a11y` script

Add to `"scripts"` section:
```json
"test:a11y": "npx playwright test"
```

Success criteria:
* `npm run test:a11y` executes Playwright tests from the `e2e/` directory

Context references:
* `package.json` (Lines 10-17) — Existing scripts section

Dependencies:
* Step 1.1 completion

### Step 1.6: Validate phase — run `npx playwright test` locally

Run the full test suite locally. Verify Playwright infrastructure works: config loads, webServer starts, browser launches, test executes.

Expected outcome: Tests run but may fail due to accessibility violations. The key validation is that the infrastructure works end-to-end.

## Implementation Phase 2: Self-Scan Generated HTML Reports (US 2000)

<!-- parallelizable: true -->

### Step 2.1: Create mock report data factories in `e2e/fixtures/report-data.ts`

Create factory functions that produce mock `ReportData` and `SiteReportData` objects for generating HTML reports in tests. Mirror the pattern used in existing unit tests.

Files:
* `e2e/fixtures/report-data.ts` — New file; mock data factories

Factory implementation should create:
* `createMockScanResults()` — Returns a minimal valid `ScanResults` object with a mix of passes and violations
* `createMockReportData()` — Returns `ReportData` by calling `assembleReportData()` on mock scan results
* `createMockSiteReportData()` — Returns `SiteReportData` with multiple page results

Key imports:
```typescript
import { assembleReportData } from '../../src/lib/report/generator';
import type { ScanResults } from '../../src/lib/types/scan';
import type { SiteReportData } from '../../src/lib/types/report';
```

Include realistic data to exercise all report template sections:
* At least 1 violation with `critical` impact
* At least 1 violation with `minor` impact
* At least 2 passes
* Score in the 60-80 range to test color-coded rendering

Success criteria:
* Factory functions produce valid typed objects
* Objects have enough data to render all template sections

Context references:
* `src/lib/report/generator.ts` (Line 4) — `assembleReportData()` signature
* `src/lib/types/scan.ts` — `ScanResults` type
* `src/lib/types/report.ts` — `ReportData`, `SiteReportData` types

Dependencies:
* Phase 1 infrastructure (Steps 1.1, 1.2)

### Step 2.2: Create `e2e/self-scan-report.spec.ts` for single-page report HTML

Create a Playwright Test spec that generates a single-page HTML report via `generateReportHtml()`, loads it into a page with `page.setContent()`, and runs AxeBuilder. No HTTP server needed — report HTML is self-contained with inline styles.

Files:
* `e2e/self-scan-report.spec.ts` — New file; single-page report accessibility test

Test implementation:
```typescript
import { test, expect } from './fixtures/axe-fixture';
import { generateReportHtml } from '../src/lib/report/templates/report-template';
import { createMockReportData } from './fixtures/report-data';

test.describe('Generated single-page report accessibility', () => {
  test('has no critical or serious WCAG violations', async ({ page, makeAxeBuilder }) => {
    const reportData = createMockReportData();
    const html = generateReportHtml(reportData);
    await page.setContent(html, { waitUntil: 'load' });
    const results = await makeAxeBuilder().analyze();
    const criticalOrSerious = results.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious'
    );
    expect(criticalOrSerious).toHaveLength(0);
  });
});
```

Success criteria:
* Test loads generated HTML via `page.setContent()`
* AxeBuilder analyzes the loaded report page
* Test filters for critical/serious violations only (allowing minor/moderate initially)

Context references:
* `src/lib/report/templates/report-template.ts` (Line 59) — `generateReportHtml()` function
* `.copilot-tracking/research/2026-03-07/self-testing-accessibility-research.md` (Lines 261-275) — Report HTML scan example

Dependencies:
* Step 2.1 completion (mock data factories)

### Step 2.3: Create `e2e/self-scan-site-report.spec.ts` for site report HTML

Same pattern as Step 2.2 but for the site-level report generated by `generateSiteReportHtml()`.

Files:
* `e2e/self-scan-site-report.spec.ts` — New file; site report accessibility test

Test implementation:
```typescript
import { test, expect } from './fixtures/axe-fixture';
import { generateSiteReportHtml } from '../src/lib/report/templates/site-report-template';
import { createMockSiteReportData } from './fixtures/report-data';

test.describe('Generated site report accessibility', () => {
  test('has no critical or serious WCAG violations', async ({ page, makeAxeBuilder }) => {
    const siteReportData = createMockSiteReportData();
    const html = generateSiteReportHtml(siteReportData);
    await page.setContent(html, { waitUntil: 'load' });
    const results = await makeAxeBuilder().analyze();
    const criticalOrSerious = results.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious'
    );
    expect(criticalOrSerious).toHaveLength(0);
  });
});
```

Success criteria:
* Test loads generated site report HTML via `page.setContent()`
* AxeBuilder analyzes the loaded page
* Test filters for critical/serious violations

Context references:
* `src/lib/report/templates/site-report-template.ts` (Line 59) — `generateSiteReportHtml()` function

Dependencies:
* Step 2.1 completion (mock data factories)

### Step 2.4: Validate phase — run full `test:a11y` suite

Run `npm run test:a11y` to confirm both home page and report HTML tests execute. Report HTML tests may fail due to known template accessibility issues (missing landmarks, missing `scope` attributes). Catalog violations for Phase 4.

## Implementation Phase 3: Accessibility Remediation of Scanner UI (US 1999)

<!-- parallelizable: false -->

### Step 3.1: Run Phase 1+2 tests and capture violation reports

Run `npx playwright test` and collect the full violation output. Use the Playwright HTML reporter to inspect specific violations per page element.

Files:
* No files modified — diagnostic step only

Expected violations based on research:
* Color-only information in score/grade displays (1.4.1)
* Missing ARIA labels on Unicode symbols (1.1.1)
* Low contrast text with `text-gray-400`/`text-gray-500` (1.4.3)
* Missing `aria-current` on step indicators (4.1.2)
* Divs instead of `<ol>` for "How It Works" (1.3.1)
* Missing `scope="col"` on `<th>` elements (1.3.1)

Success criteria:
* Violation report captured and categorized by severity

Dependencies:
* Phases 1 and 2 completion

### Step 3.2: Fix semantic HTML issues (home page `<ol>`, table `scope` attributes)

Fix structural HTML issues identified by axe-core.

Files:
* `src/app/page.tsx` — Convert "How It Works" divs to ordered list `<ol>` with `<li>` children
* `src/components/ReportView.tsx` — Add `scope="col"` to all `<th>` elements

Home page fix — convert the "How It Works" grid of divs to:
```tsx
<ol className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8 border-t border-gray-200 dark:border-gray-700 list-none p-0">
  <li className="text-center space-y-2">
    <div className="text-2xl" aria-hidden="true">1</div>
    <h2 className="font-medium">Enter URL</h2>
    <p className="text-sm text-gray-500">...</p>
  </li>
  ...
</ol>
```

ReportView table header fix:
```tsx
<th scope="col" className="...">Rule</th>
<th scope="col" className="...">Impact</th>
```

Success criteria:
* "How It Works" section uses `<ol>` + `<li>` semantic HTML
* All `<th>` elements have `scope="col"` attribute

Context references:
* `src/app/page.tsx` (Lines 23-37) — "How It Works" section with divs

Dependencies:
* Step 3.1 violation report

### Step 3.3: Fix ARIA and color-only information issues in score/grade displays

Add ARIA labels and text alternatives so score/grade information is not conveyed by color alone.

Files:
* `src/components/ScoreDisplay.tsx` — Add `aria-label` with score value and grade; add visually-hidden text alternative for grade
* `src/components/SiteScoreDisplay.tsx` — Same pattern as ScoreDisplay
* `src/components/ReportView.tsx` — Add `aria-hidden="true"` to decorative symbols (✓, ✕, ?); add `aria-label` to parent elements
* `src/components/ViolationList.tsx` — Add text alternative alongside color-coded impact badges

Pattern for score displays:
```tsx
<div aria-label={`Accessibility score: ${score} out of 100, grade ${grade}`}>
  <span className="..." aria-hidden="true">{grade}</span>
  <span className="sr-only">{grade}</span>
</div>
```

Pattern for status symbols:
```tsx
<span aria-hidden="true">✓</span>
<span className="sr-only">Passed</span>
```

Success criteria:
* Score displays announce score and grade to screen readers
* Decorative symbols have `aria-hidden="true"` with text alternatives
* Impact information is available as text, not just color

Context references:
* `.copilot-tracking/research/2026-03-07/self-testing-accessibility-research.md` (Lines 148-156) — Known accessibility concerns table

Dependencies:
* Step 3.1 violation report

### Step 3.4: Fix low contrast text (upgrade gray utilities)

Upgrade Tailwind text color utilities from low-contrast grays to higher-contrast alternatives.

Files:
* `src/app/page.tsx` — Replace `text-gray-400` → `text-gray-600`, `text-gray-500` → `text-gray-700` (dark mode variants adjusted accordingly)
* `src/components/ScanForm.tsx` — Same contrast upgrades where applicable
* `src/components/ScanProgress.tsx` — Same contrast upgrades
* `src/components/CrawlProgress.tsx` — Same contrast upgrades
* `src/components/ViolationList.tsx` — Same contrast upgrades
* `src/components/PageList.tsx` — Same contrast upgrades

Replacement rules:
* `text-gray-400` → `text-gray-600` (light mode), keep `dark:text-gray-400` if present (sufficient against dark backgrounds)
* `text-gray-500` → `text-gray-700` (light mode), keep `dark:text-gray-300` for dark mode

Note: Exact replacements depend on actual axe-core contrast violation reports from Step 3.1. Run violations first and apply targeted fixes.

Success criteria:
* All text meets WCAG 2.2 AA 4.5:1 contrast ratio for normal text
* All large text meets 3:1 contrast ratio
* No `color-contrast` violations in axe-core results

Dependencies:
* Step 3.1 violation report (actual contrast violations may differ from predictions)

### Step 3.5: Fix step indicator ARIA attributes in progress components

Add `aria-current="step"` to the active step in progress indicators for screen reader navigation.

Files:
* `src/components/ScanProgress.tsx` — Add `aria-current="step"` to the currently active step element; add `role="list"` to step container
* `src/components/CrawlProgress.tsx` — Same pattern

Pattern:
```tsx
<ol role="list" aria-label="Scan progress">
  {steps.map((step, i) => (
    <li
      key={step}
      aria-current={i === currentStep ? 'step' : undefined}
      className="..."
    >
      {step}
    </li>
  ))}
</ol>
```

Success criteria:
* Active step has `aria-current="step"` attribute
* Step container uses semantic list markup
* Screen readers can identify the current step

Dependencies:
* Step 3.1 violation report

### Step 3.6: Validate — re-run `test:a11y` to confirm UI violations resolved

Run `npm run test:a11y` after all UI remediation. Home page test should now pass with zero violations. Iterate on remaining failures.

## Implementation Phase 4: Accessibility Remediation of HTML Report Templates (US 2001)

<!-- parallelizable: true -->

### Step 4.1: Add landmarks and skip link to report templates

Add semantic landmark elements (`<main>`, `<header>`, `<nav>`) and a skip-to-content link at the beginning of the report HTML. Both single-page and site report templates need these changes.

Files:
* `src/lib/report/templates/report-template.ts` — Wrap content in `<main>`, add `<header>` for report title, add skip link
* `src/lib/report/templates/site-report-template.ts` — Same pattern

HTML structure to add:
```html
<body>
  <a href="#main-content" class="skip-link" style="position:absolute;left:-10000px;top:auto;width:1px;height:1px;overflow:hidden;">
    Skip to main content
  </a>
  <header>
    <h1>...</h1>
  </header>
  <main id="main-content">
    <!-- existing content -->
  </main>
</body>
```

The skip link becomes visible on focus:
```css
.skip-link:focus {
  position: static;
  width: auto;
  height: auto;
  overflow: visible;
}
```

Success criteria:
* Report HTML has `<main>`, `<header>` landmarks
* Skip link present and functional
* axe-core `landmark-one-main` and `bypass` rules pass

Context references:
* `src/lib/report/templates/report-template.ts` (Line 59) — `generateReportHtml()` generating full HTML document
* `src/lib/report/templates/site-report-template.ts` (Line 59) — `generateSiteReportHtml()` generating full HTML document

Dependencies:
* Phase 2 report tests (to verify fixes against)

### Step 4.2: Add `scope="col"` to table headers in report templates

Add `scope` attributes to all `<th>` elements in the report HTML templates for proper table header association.

Files:
* `src/lib/report/templates/report-template.ts` — Add `scope="col"` to all `<th>` elements
* `src/lib/report/templates/site-report-template.ts` — Add `scope="col"` to all `<th>` elements

Pattern:
```html
<th scope="col" style="...">Rule</th>
<th scope="col" style="...">Impact</th>
<th scope="col" style="...">Element</th>
```

If any tables have row headers, use `scope="row"` for `<th>` in `<tbody>`.

Success criteria:
* All `<th>` elements have appropriate `scope` attribute
* axe-core `th-has-data-cells` rule passes

Dependencies:
* Step 4.1 completion (landmark structure may affect table positioning)

### Step 4.3: Fix ARIA labels and contrast issues in report templates

Add ARIA labels to decorative or icon elements in report templates and ensure inline style color values meet contrast requirements.

Files:
* `src/lib/report/templates/report-template.ts` — Add `aria-hidden="true"` to decorative elements; verify inline color values meet 4.5:1 against background
* `src/lib/report/templates/site-report-template.ts` — Same

Items to check:
* Score gauge or colored indicators — add text alternative
* Impact badge colors — ensure sufficient contrast
* Any Unicode symbols (✓, ✕) — add `aria-hidden="true"` and adjacent text

Success criteria:
* No decorative elements read by screen readers
* All inline colors meet WCAG 2.2 AA contrast ratios
* No `color-contrast` or `image-alt` violations

Dependencies:
* Step 4.1 completion

### Step 4.4: Validate — re-run report HTML tests to confirm zero critical/serious violations

Run `npm run test:a11y` focusing on report tests. All critical and serious violations resolved. Minor/moderate may remain if they require significant template restructuring — document for follow-on work.

## Implementation Phase 5: Dynamic Pages Self-Scan (US 1997, US 1998)

<!-- parallelizable: false -->

### Step 5.1: Implement data seeding mechanism via API calls in test setup

Create a test setup that seeds scan and crawl data by calling the app's API endpoints. The in-memory store accepts data via `POST /api/scan` — tests trigger a scan of a simple known-accessible page, then navigate to the results page.

Files:
* `e2e/fixtures/seed-data.ts` — New file; helper functions to seed data via API

Approach: Use Playwright's `request` fixture to call app APIs from test setup:
```typescript
import { test as base } from '@playwright/test';

export async function seedScanResult(request: APIRequestContext): Promise<string> {
  // Trigger a scan of a static fixture page or known URL
  const response = await request.post('/api/scan', {
    data: { url: 'https://example.com' }
  });
  const { id } = await response.json();
  // Poll until complete
  let status = 'running';
  while (status === 'running') {
    await new Promise(r => setTimeout(r, 1000));
    const poll = await request.get(`/api/scan/${id}`);
    const data = await poll.json();
    status = data.status;
  }
  return id;
}
```

Alternative approach if external URL scanning is too slow in CI: create a static HTML fixture page served by the webServer, and scan that.

Success criteria:
* Helper functions can seed scan and crawl results via API
* Seeded results have `completed` status before test runs
* Test can navigate to `/scan/{id}` and `/crawl/{id}` with populated data

Context references:
* `src/lib/scanner/store.ts` — In-memory store with TTL
* `.copilot-tracking/research/2026-03-07/self-testing-accessibility-research.md` (Lines 287-310) — API documentation

Dependencies:
* Phase 1 infrastructure (webServer running)

### Step 5.2: Create `e2e/self-scan-scan-results.spec.ts` for scan results page

Create a Playwright Test spec that seeds a scan result, navigates to the scan results page, waits for completion rendering, and runs AxeBuilder.

Files:
* `e2e/self-scan-scan-results.spec.ts` — New file; scan results page accessibility test

Test implementation:
```typescript
import { test, expect } from './fixtures/axe-fixture';
import { seedScanResult } from './fixtures/seed-data';

test.describe('Scan results page accessibility', () => {
  let scanId: string;

  test.beforeAll(async ({ request }) => {
    scanId = await seedScanResult(request);
  });

  test('has no WCAG 2.2 AA violations', async ({ page, makeAxeBuilder }) => {
    await page.goto(`/scan/${scanId}`);
    // Wait for results to render (ReportView component)
    await page.waitForSelector('[data-testid="report-view"]', { timeout: 30_000 });
    const results = await makeAxeBuilder().analyze();
    expect(results.violations).toEqual([]);
  });
});
```

Note: May need to add `data-testid="report-view"` to the `ReportView` component if not present. Alternatively, wait for a specific heading or element.

Success criteria:
* Test seeds a scan result and navigates to results page
* AxeBuilder runs after content is fully rendered
* Violations reported with details

Context references:
* `src/app/scan/[id]/page.tsx` — Scan results page that polls and renders ReportView

Dependencies:
* Step 5.1 completion (data seeding)

### Step 5.3: Create `e2e/self-scan-crawl-results.spec.ts` for crawl results page

Same pattern as Step 5.2 but for the crawl results page.

Files:
* `e2e/self-scan-crawl-results.spec.ts` — New file; crawl results page accessibility test

Test implementation:
```typescript
import { test, expect } from './fixtures/axe-fixture';
import { seedCrawlResult } from './fixtures/seed-data';

test.describe('Crawl results page accessibility', () => {
  let crawlId: string;

  test.beforeAll(async ({ request }) => {
    crawlId = await seedCrawlResult(request);
  });

  test('has no WCAG 2.2 AA violations', async ({ page, makeAxeBuilder }) => {
    await page.goto(`/crawl/${crawlId}`);
    // Wait for results to render
    await page.waitForSelector('[data-testid="site-score-display"]', { timeout: 60_000 });
    const results = await makeAxeBuilder().analyze();
    expect(results.violations).toEqual([]);
  });
});
```

Success criteria:
* Test seeds a crawl result and navigates to crawl results page
* AxeBuilder runs after content is fully rendered
* Violations reported with details

Context references:
* `src/app/crawl/[id]/page.tsx` — Crawl results page that renders SiteScoreDisplay + PageList + ViolationList

Dependencies:
* Step 5.1 completion (data seeding)

### Step 5.4: Remediate any new violations found on dynamic pages

Run the dynamic page tests and fix any new violations not already addressed in Phase 3. Dynamic pages contain additional components (SiteScoreDisplay, PageList, ViolationList) that may surface new issues.

Files:
* Components identified by axe-core violation reports — targeted fixes

Expected areas:
* `SiteScoreDisplay` — may have same color/ARIA issues as `ScoreDisplay` (if not already fixed in Phase 3)
* `PageList` — table accessibility, link text
* `ViolationList` — expandable sections, ARIA expanded states

Success criteria:
* All dynamic page tests pass with zero violations
* No regressions in previously passing tests

Dependencies:
* Steps 5.2 and 5.3 (violation reports from dynamic page tests)
* Phase 3 completion (UI remediation)

### Step 5.5: Validate — run full `test:a11y` suite with all pages passing

Run `npm run test:a11y` with all spec files. All tests green.

## Implementation Phase 6: CI Workflow Integration

<!-- parallelizable: false -->

### Step 6.1: Add Playwright browser install and self-scan steps to `.github/workflows/ci.yml`

Add new steps after the existing build step (which uses the Next.js build cache) to install Playwright Chromium and run accessibility tests.

Files:
* `.github/workflows/ci.yml` — Add steps between build cache and end of job

New steps to add after the `Cache Next.js build` step:
```yaml
      - name: Build Next.js app
        run: npm run build

      - name: Install Playwright Chromium
        run: npx playwright install --with-deps chromium

      - name: Self-scan accessibility tests
        run: npm run test:a11y
```

Note: The `webServer` in `playwright.config.ts` runs `npm run build && npm run start`, but since CI already builds, the webServer command should be adjusted for CI to avoid double-build. Options:
1. Change webServer command to just `npm run start` and rely on CI's prior build step
2. Keep `npm run build && npm run start` for local dev convenience and accept double-build in CI

Recommended: Use `npm run start` as webServer command and add a separate build step in CI before Playwright, since CI already caches the build.

Updated `playwright.config.ts` webServer:
```typescript
webServer: {
  command: 'npm run start',
  url: 'http://localhost:3000',
  reuseExistingServer: !process.env.CI,
  timeout: 120_000,
},
```

For local dev, developers run `npm run build` first, or the webServer config can be:
```typescript
command: process.env.CI ? 'npm run start' : 'npm run build && npm run start',
```

Success criteria:
* CI workflow includes Playwright install and test:a11y steps
* Steps appear after build step
* Steps use correct run commands

Context references:
* `.github/workflows/ci.yml` (Lines 1-80) — Current CI workflow
* `.copilot-tracking/research/2026-03-07/self-testing-accessibility-research.md` (Lines 221-233) — Proposed CI additions

Dependencies:
* All previous phases (tests must be passing)

### Step 6.2: Add artifact upload for Playwright reports and JUnit results

Add artifact upload steps for the Playwright HTML report and JUnit XML results. Add a test reporter step for the JUnit results.

Files:
* `.github/workflows/ci.yml` — Add artifact upload and test reporter steps

New steps:
```yaml
      - name: Upload accessibility report
        uses: actions/upload-artifact@v4
        if: ${{ !cancelled() }}
        with:
          name: a11y-results
          path: |
            playwright-report/
            test-results/a11y-junit.xml
          retention-days: 30

      - name: Accessibility test report
        uses: dorny/test-reporter@v2
        if: ${{ !cancelled() }}
        with:
          name: 'Accessibility Tests'
          path: test-results/a11y-junit.xml
          reporter: java-junit
          fail-on-error: true
```

Success criteria:
* CI uploads Playwright HTML report as artifact
* CI uploads JUnit XML results
* Test reporter displays accessibility test results in PR checks

Context references:
* `.github/workflows/ci.yml` (Lines 42-57) — Existing artifact upload pattern

Dependencies:
* Step 6.1 completion

### Step 6.3: Validate — verify CI workflow YAML syntax and step ordering

Validate the CI workflow file:
* YAML syntax valid
* Steps in correct order: checkout → setup-node → npm ci → lint → test:ci → build → playwright install → test:a11y → upload artifacts
* No duplicate step names

## Implementation Phase 7: Final Validation

<!-- parallelizable: false -->

### Step 7.1: Run full project validation

Execute all validation commands for the project:
* `npm run lint` — ESLint
* `npm run build` — Next.js build
* `npm run test:ci` — Unit tests with coverage
* `npm run test:a11y` — Accessibility self-scan tests

### Step 7.2: Fix minor validation issues

Iterate on lint errors, build warnings, and test failures. Apply fixes directly when corrections are straightforward and isolated.

### Step 7.3: Report blocking issues

When validation failures require changes beyond minor fixes:
* Document the issues and affected files.
* Provide the user with next steps.
* Recommend additional research and planning rather than inline fixes.
* Avoid large-scale refactoring within this phase.

## Dependencies

* `@playwright/test` — devDependency for test runner
* `@axe-core/playwright` — already in package.json dependencies
* `playwright` — already in package.json dependencies
* Chromium browser — installed via `npx playwright install chromium`
* Next.js build — required before `npm run start`

## Success Criteria

* All self-scan tests pass with zero WCAG 2.2 AA violations on all pages
* CI workflow runs self-scan after build and reports results as artifacts
* All existing unit tests continue to pass with coverage thresholds met
