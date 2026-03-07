<!-- markdownlint-disable-file -->
# Self-Scan Integration Approach Research

## Research Topics

1. SSRF protection bypass for self-scan
2. Direct engine usage for self-scan tests
3. Self-scan of HTML reports
4. CI integration approaches (Playwright Test vs vitest vs shell script)
5. Playwright/axe-core integration libraries (`@axe-core/playwright` vs manual injection)
6. Test data setup for dynamic pages (`/scan/[id]`, `/crawl/[id]`)

---

## 1. SSRF Protection Analysis

### Current Implementation

The `isValidScanUrl()` function is duplicated identically in four API route files:

- `src/app/api/scan/route.ts` (line 7)
- `src/app/api/ci/scan/route.ts` (line 9)
- `src/app/api/crawl/route.ts` (line 7)
- `src/app/api/ci/crawl/route.ts` (line 12)

Each copy blocks:

- `localhost`, `127.0.0.1`, `::1`, `0.0.0.0`
- Private IP ranges: `10.*`, `192.168.*`, `172.16-31.*`
- IPv6 private prefixes: `fc*`, `fd*`
- `.local` and `.internal` TLD suffixes
- Non-HTTP(S) protocols
- URLs longer than 2048 characters

**The SSRF protection exists only in the API route handlers.** The scanning engine itself (`src/lib/scanner/engine.ts`) has no URL validation — `scanUrl()` and `scanPage()` accept any URL or already-navigated page.

### Safe Self-Scan Approaches (SSRF Not Weakened)

#### Option A: Direct Playwright/Engine Usage (Recommended)

**Bypass the API entirely.** Use `scanPage()` or `scanUrl()` directly from test code. The SSRF protection lives in the API routes, not the engine. Tests that call the engine directly never hit the SSRF check.

```typescript
// Test calls engine directly — no SSRF check involved
import { scanUrl } from '../lib/scanner/engine';
const results = await scanUrl('http://localhost:3000/');
```

**Pros:**

- Zero changes to production SSRF code
- No environment variable flags or conditional logic
- Engine is designed for this — `scanUrl()` handles full browser lifecycle
- Faster — no HTTP round-trip through API

**Cons:**

- Does not test the API layer itself
- Needs Playwright chromium installed in test environment

#### Option B: Environment Variable Flag

Add `ALLOW_SELF_SCAN=true` check in `isValidScanUrl()` to permit localhost when set.

**Pros:**

- Tests the full API flow end-to-end
- Simple to implement

**Cons:**

- Weakens SSRF protection surface (even if gated by env var)
- Risk of misconfiguration in production
- Must be set correctly in every CI environment
- Security reviewers may flag this pattern

#### Option C: Separate Self-Scan Engine Wrapper

Create a dedicated self-scan module that uses the engine directly, separate from the API routes.

**Pros:**

- Clean separation of concerns
- No SSRF changes needed

**Cons:**

- Extra abstraction for little benefit over Option A
- Same as Option A functionally

### SSRF Recommendation

**Option A is clearly superior.** The engine functions `scanPage()` and `scanUrl()` are the correct entry points for self-scanning. The SSRF protection belongs at the API boundary and should not be modified. Self-scan tests should use the engine directly.

---

## 2. Direct Engine Usage for Self-Scan

### Engine API Surface

From `src/lib/scanner/engine.ts`:

#### `scanPage(page: Page): Promise<AxeResults>`

- Accepts an already-navigated Playwright `Page` object
- Injects `axe-core` via `page.evaluate()` with `module = { exports: {} }` shim
- Runs `axe.run()` with WCAG 2.2 AA tags: `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`
- Returns raw `AxeResults` from axe-core
- **Best for**: scanning generated HTML via `page.setContent()`, or scanning pages the test has already navigated to

#### `scanUrl(url: string, onProgress?): Promise<AxeResults>`

- Launches chromium browser, creates context with 1280x1024 viewport
- Navigates to URL with `waitUntil: 'load'`, falls back to `domcontentloaded` on timeout
- Calls `scanPage()` internally
- Closes browser in `finally` block
- **Best for**: scanning live app pages by URL

### Playwright in Vitest

The existing unit tests (`src/lib/scanner/__tests__/engine.test.ts`) fully mock Playwright. For integration self-scan tests, we need **real** Playwright execution.

**Key consideration:** The codebase uses `vitest` (not `@playwright/test`). Vitest can run real Playwright code — it's just Node.js. The engine module already imports Playwright directly. Two approaches:

#### Approach 2A: Use `scanUrl()` Directly in Vitest (Simplest)

```typescript
import { scanUrl } from '@/lib/scanner/engine';
import { parseAxeResults } from '@/lib/scanner/result-parser';

describe('self-scan', () => {
  it('home page meets WCAG 2.2 AA threshold', async () => {
    const axeResults = await scanUrl('http://localhost:3000/');
    const results = parseAxeResults('http://localhost:3000/', axeResults);
    expect(results.score.overallScore).toBeGreaterThanOrEqual(90);
    expect(results.violations.filter(v => v.impact === 'critical')).toHaveLength(0);
  }, 60000);
});
```

**Requires:** Next.js app running on localhost:3000 before tests start.

#### Approach 2B: Use `scanPage()` with Manual Browser Management

```typescript
import { chromium } from 'playwright';
import { scanPage } from '@/lib/scanner/engine';

let browser, page;
beforeAll(async () => {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  page = await context.newPage();
});
afterAll(async () => { await browser?.close(); });

it('home page has no critical violations', async () => {
  await page.goto('http://localhost:3000/');
  const results = await scanPage(page);
  const critical = results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
  expect(critical).toHaveLength(0);
});
```

**Benefit:** Reuses single browser instance across multiple page scans — faster.

#### Approach 2C: Use `@playwright/test` (Separate Test Suite)

Use `@playwright/test` with its `webServer` config for a completely separate self-scan test suite running outside vitest.

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';
export default defineConfig({
  webServer: {
    command: 'npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  use: { baseURL: 'http://localhost:3000' },
});
```

```typescript
// e2e/self-scan.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('home page is accessible', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(results.violations).toEqual([]);
});
```

### Engine Usage Recommendation

**Approach 2C (Playwright Test with webServer) is the strongest option** for self-scanning live app pages because:

- `webServer` config auto-starts Next.js (no manual process management)
- `@playwright/test` provides parallel test execution, retries, HTML reporter
- `@axe-core/playwright` provides cleaner API with `.withTags()`, `.include()`, `.exclude()`
- Completely separate from unit tests — no risk of Playwright processes leaking into vitest
- Standard Playwright pattern documented at <https://playwright.dev/docs/accessibility-testing>
- `@playwright/test` is already in `package-lock.json` (transitive dependency of `@axe-core/playwright`)

**For report HTML scanning**, use Approach 2B with `page.setContent()` — this can run in either vitest or Playwright Test.

---

## 3. Self-Scan of HTML Reports

### Report Generation Pipeline

1. `assembleReportData(results)` in `src/lib/report/generator.ts` — transforms `ScanResults` into `ReportData`
2. `generateReportHtml(data)` in `src/lib/report/templates/report-template.ts` — returns complete HTML string
3. `generateSiteReportHtml(data)` in `src/lib/report/templates/site-report-template.ts` — returns complete site report HTML string
4. `generatePdf(reportHtml)` in `src/lib/report/pdf-generator.ts` — uses Puppeteer to convert HTML to PDF

**The HTML is generated as a string.** It is never served via HTTP — it's only passed to Puppeteer's `page.setContent()` for PDF rendering.

### Scanning Generated HTML

#### Option 3A: `page.setContent()` + axe-core (Recommended)

Use Playwright's `page.setContent()` to load the generated HTML directly into a browser page, then run axe-core on it. No HTTP server needed.

```typescript
import { chromium } from 'playwright';
import { scanPage } from '@/lib/scanner/engine';
import { generateReportHtml } from '@/lib/report/templates/report-template';
import { assembleReportData } from '@/lib/report/generator';

it('generated report HTML is accessible', async () => {
  const mockResults = createMockScanResults(); // factory function
  const reportData = assembleReportData(mockResults);
  const html = generateReportHtml(reportData);

  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext()).newPage();
  await page.setContent(html, { waitUntil: 'load' });

  const axeResults = await scanPage(page);
  await browser.close();

  const critical = axeResults.violations.filter(
    v => v.impact === 'critical' || v.impact === 'serious'
  );
  expect(critical).toHaveLength(0);
});
```

**Pros:**

- No HTTP server needed
- Tests the actual HTML template output
- Can test with various data scenarios (empty violations, many violations, etc.)
- Fast — no network latency
- Works in both vitest and `@playwright/test`

**Cons:**

- External resources (fonts, images) won't load unless base URL is set
- The report templates use only inline styles and no external resources, so this is not an issue

#### Option 3B: Temp HTTP Server

Spin up a minimal HTTP server (e.g., `http.createServer`) to serve the HTML, then scan the URL.

**Pros:**

- More realistic (external resources would load)
- Can test with `scanUrl()` directly

**Cons:**

- More complex setup/teardown
- Unnecessary — report HTML is self-contained with inline styles
- Port management complexity

#### Option 3C: `@axe-core/playwright` with `setContent()`

```typescript
import AxeBuilder from '@axe-core/playwright';

const results = await new AxeBuilder({ page })
  .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
  .analyze();
```

**Same as 3A but using AxeBuilder API instead of the custom `scanPage()`.** Either works; AxeBuilder provides a cleaner chainable API.

### Test Data for Reports

The report templates need `ReportData` and `SiteReportData` objects. These can be constructed from mock data:

```typescript
// Factory function for test data
function createMockReportData(): ReportData {
  return {
    url: 'https://example.com',
    scanDate: '2026-03-07',
    engineVersion: 'axe-core 4.10.0',
    score: {
      overallScore: 85,
      grade: 'B',
      aodaCompliant: false,
      totalViolations: 3,
      totalPasses: 25,
      totalIncomplete: 2,
      principleScores: { /* ... */ },
      impactBreakdown: { /* ... */ },
    },
    violations: [ /* mock violations */ ],
    passes: [],
    incomplete: [],
    aodaNote: '...',
    disclaimer: '...',
  };
}
```

### Report Scan Recommendation

**Option 3A/3C (`page.setContent()` + axe-core) is the clear winner.** The HTML is self-contained with inline styles, making `setContent()` perfectly suited. Test with multiple data scenarios: empty violations, many violations, all impact levels.

---

## 4. CI Integration Approaches

### Current CI Pipeline

**GitHub Actions** (`ci.yml`):

- Trigger: push/PR to `main`
- Steps: checkout → Node 20 → `npm ci` → lint → `npm run test:ci` (vitest) → upload artifacts → build
- **No Playwright browser install step**
- **No app startup for integration testing**

**Azure Pipelines** (`azure-pipelines/a11y-scan.yml`):

- Manual trigger (`trigger: none`)
- Steps: Node 20 → `npm ci` → `npx playwright install --with-deps chromium` → CLI scan → publish test results
- Uses the CLI to scan an external URL — not self-scan

### Option A: `@playwright/test` with `webServer` Config (Recommended)

**New file:** `playwright.config.ts` at project root.  
**New directory:** `e2e/` for Playwright self-scan tests.  
**New npm script:** `"test:a11y": "npx playwright test"`.

```typescript
// playwright.config.ts
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

**CI workflow addition:**

```yaml
- name: Install Playwright browsers
  run: npx playwright install --with-deps chromium

- name: Self-scan accessibility tests
  run: npm run test:a11y

- name: Upload a11y results
  uses: actions/upload-artifact@v4
  if: ${{ !cancelled() }}
  with:
    name: a11y-results
    path: playwright-report/
```

**Pros:**

- `webServer` auto-manages Next.js lifecycle (start before tests, stop after)
- Playwright Test provides parallel execution, retries, HTML reporter, trace on failure
- Standard, well-documented approach
- Clean separation from unit tests (separate config, separate test directory)
- JUnit reporter integrates with GitHub Actions test reporter
- `@axe-core/playwright` `AxeBuilder` provides clean, chainable API
- `reuseExistingServer` allows fast local development

**Cons:**

- Requires `npm run build` before `npm run start` (production build, not dev)
- Adds 1-2 minutes to CI (build + start + scan)
- Separate test framework from vitest

### Option B: Vitest Integration Test with Programmatic App Start

```typescript
// src/lib/__tests__/self-scan.integration.test.ts
import { exec } from 'child_process';

let serverProcess;
beforeAll(async () => {
  // Start Next.js
  serverProcess = exec('npm run start');
  await waitForServer('http://localhost:3000', 60000);
}, 120000);

afterAll(() => {
  serverProcess?.kill();
});
```

**Pros:**

- Single test framework (vitest)
- Results in same coverage report

**Cons:**

- Manual process management (start, wait, kill) is fragile
- Need to build first (`npm run build`) — not handled automatically
- Port conflicts if other tests use the same port
- No built-in retry, parallel execution, or HTML reporter for these tests
- Mixing unit and integration tests in one vitest config can cause issues (timeouts, mocks interfering)
- vitest `testTimeout` of 10000ms is too short — need per-file overrides

### Option C: Shell Script

```bash
#!/bin/bash
npm run build
npm run start &
SERVER_PID=$!
npx wait-on http://localhost:3000
npx a11y-scan scan --url http://localhost:3000 --threshold 90 --format junit --output results.xml
EXIT_CODE=$?
kill $SERVER_PID
exit $EXIT_CODE
```

**Pros:**

- Simple, no framework needed
- Uses the existing CLI tool (dogfooding)
- Works in any CI system

**Cons:**

- Can't test individual pages easily (scan results, crawl results need data setup)
- SSRF protection blocks localhost — CLI calls the API, which has the SSRF check
- Platform-specific (bash vs PowerShell)
- No structured test output for per-page results
- Hard to test HTML reports

### CI Approach Recommendation

**Option A (`@playwright/test` with `webServer`) is the strongest choice:**

1. Auto-manages Next.js lifecycle
2. Clean Playwright Test API with `AxeBuilder`
3. Standard, documented pattern
4. Separate from unit tests — no interference
5. JUnit output integrates with existing CI reporting
6. HTML reporter provides detailed failure analysis
7. Retry support for flaky browser tests

---

## 5. Playwright/axe-core Integration Libraries

### Current State

- **`@axe-core/playwright`** (`^4.11.1`): Listed as a dependency in `package.json` but **not used anywhere** in source code
- **`axe-core`**: Used directly — `engine.ts` reads `node_modules/axe-core/axe.min.js` and injects via `page.evaluate()`
- **`@playwright/test`**: Not a direct dependency but present in `package-lock.json` as a transitive dependency of `@axe-core/playwright`

### Manual Injection (Current Engine Approach)

```typescript
// engine.ts current approach
const axeSource = fs.readFileSync(path.resolve(process.cwd(), 'node_modules', 'axe-core', 'axe.min.js'), 'utf-8');

export async function scanPage(page: Page): Promise<AxeResults> {
  await page.evaluate(`var module = { exports: {} }; ${axeSource}`);
  return page.evaluate(() => {
    return (window as any).axe.run({
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    });
  });
}
```

**Pros:**

- Full control over axe configuration
- No dependency on AxeBuilder API
- Works with bare Playwright (no `@playwright/test` required)

**Cons:**

- Module shim workaround (`var module = { exports: {} }`)
- Manual file path resolution
- Less readable than AxeBuilder chainable API

### `@axe-core/playwright` AxeBuilder Approach

```typescript
import AxeBuilder from '@axe-core/playwright';

const results = await new AxeBuilder({ page })
  .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
  .include('#main-content')
  .exclude('#known-issue-element')
  .analyze();
```

**Pros:**

- Clean, chainable API
- Handles axe-core injection automatically
- `.include()` and `.exclude()` for targeted scanning
- `.disableRules()` for suppressing known issues
- Official Deque Labs package, well-maintained
- Already a dependency (just unused)

**Cons:**

- Slightly less control than manual injection
- Primarily designed for `@playwright/test` (but works with bare Playwright too)

### Recommendation

**For self-scan tests: Use `@axe-core/playwright` AxeBuilder.** It's already a dependency, provides a cleaner API, and aligns with Playwright's official accessibility testing documentation. The existing `scanPage()` in `engine.ts` should remain unchanged for the production scanning engine (it works fine for external site scanning).

**Two scanning paths:**

1. **Production scanning** (API routes → `engine.ts`): Keep manual injection. It works, is tested, and handles arbitrary external sites.
2. **Self-scan tests** (`e2e/` tests): Use `AxeBuilder` from `@axe-core/playwright`. Cleaner API, better for test assertions, handles include/exclude.

---

## 6. Test Data Setup for Dynamic Pages

### In-Memory Store Architecture

From `src/lib/scanner/store.ts`:

- **Scans**: `Map<string, ScanRecord>` — keyed by UUID
- **Crawls**: `Map<string, CrawlRecord>` — keyed by UUID
- TTL cleanup: scans expire after 1 hour, crawls after 4 hours
- No persistence — data lost on server restart

### Dynamic Page Behavior

- **`/scan/[id]`** (`src/app/scan/[id]/page.tsx`): Client-side component that:
  1. Polls `GET /api/scan/{id}` for progress
  2. On completion, fetches final results and renders `ReportView` component
  3. If scan not found or error, shows error state

- **`/crawl/[id]`** (`src/app/crawl/[id]/page.tsx`): Client-side component that:
  1. Polls `GET /api/crawl/{id}` for progress
  2. On completion, fetches pages via `GET /api/crawl/{id}/pages`
  3. Renders `SiteScoreDisplay`, `PageList`, `ViolationList`
  4. Includes cancel button

### Challenge

Dynamic pages need actual scan/crawl data in the in-memory store to render meaningful content. Without data, they show loading or error states.

### Test Data Approaches

#### Approach 6A: Trigger Real Scans via API Before Testing (Complex)

1. Start Next.js
2. POST to `/api/scan` with an external URL
3. Wait for scan completion
4. Navigate to `/scan/{id}` to test the results page

**Pros:** Tests the full flow end-to-end  
**Cons:** Requires external URL, slow, flaky (depends on external site), SSRF prevents localhost scanning

#### Approach 6B: Scan Known Static Page (Moderate)

Use a small static HTML file served alongside the app, or scan the app's own home page first.

1. Start Next.js
2. Use `scanUrl('http://localhost:3000/')` directly (engine, no API)
3. Import store functions to populate the store with results
4. Navigate to `/scan/{id}` in test

**Problem:** Store is in-process on the server. Test code runs in a separate process. Can't directly manipulate the server's in-memory store from the test.

#### Approach 6C: Scan the Home Page via API with SSRF Bypass (Not Recommended)

Would require modifying `isValidScanUrl()` to allow localhost — security concern.

#### Approach 6D: Test Only Static Pages + Report HTML (Recommended for MVP)

For the initial self-scan implementation:

1. **Home page** (`/`): Always renders without data. Easy to scan.
2. **Report HTML**: Generated from mock data via `generateReportHtml()` and `generateSiteReportHtml()`. Easy to scan with `page.setContent()`.
3. **Scan/crawl results pages**: Skip for now — they require in-flight or completed scan data.

**For future phases:** To self-scan the results pages, either:

- Add a `/api/test/seed-scan` endpoint (only enabled in test/dev) that populates the store with mock data
- Use Playwright to interact with the app naturally (enter a URL in the form, wait for scan, then test the results page)
- The second approach is a true E2E test but depends on an external URL being available

#### Approach 6E: Use the App to Scan Itself (Inception Pattern)

1. Start Next.js on `http://localhost:3000`
2. In test: navigate to `/`, enter `https://example.com` in the scan form
3. Wait for scan to complete (results page renders)
4. Now scan the results page for accessibility with AxeBuilder

**Pros:** Tests the full user flow, no store manipulation needed  
**Cons:** Slow (waits for real external scan), depends on `example.com` being up, SSRF allows example.com

### Test Data Recommendation

**Phase 1 (MVP):** Scan only the home page and generated report HTML. These cover the most code and don't require data setup:

- Home page (`/`): static content, always available
- Report HTML: generated from mock `ReportData` via `page.setContent()`
- Site report HTML: generated from mock `SiteReportData` via `page.setContent()`

**Phase 2 (Future):** For scan/crawl results pages:

- Add API endpoint or seed mechanism gated by `NODE_ENV=test`
- Or use Approach 6E (inception pattern) with a fast-loading external page

---

## Summary of Recommendations

### Recommended Architecture

| Aspect | Recommendation | Rationale |
|--------|----------------|-----------|
| **Test framework** | `@playwright/test` (separate from vitest) | webServer config, parallel execution, retries, HTML reporter |
| **axe-core integration** | `@axe-core/playwright` AxeBuilder | Already a dependency, clean API, official |
| **SSRF handling** | Bypass by using engine directly or AxeBuilder on navigated pages | No production code changes needed |
| **App lifecycle** | `webServer` in `playwright.config.ts` | Auto-start/stop Next.js |
| **Report HTML testing** | `page.setContent()` + AxeBuilder | No server needed, fast, deterministic |
| **CI integration** | New step in `ci.yml` after build | `npx playwright install` + `npx playwright test` |
| **Test directory** | `e2e/` at project root | Clean separation from unit tests |
| **Results pages** | Phase 2 — skip in MVP | Need data seeding mechanism |

### Proposed File Structure

```text
playwright.config.ts          # Playwright Test config with webServer
e2e/
  self-scan-home.spec.ts      # Home page accessibility
  self-scan-report.spec.ts    # Generated report HTML accessibility
  self-scan-site-report.spec.ts # Generated site report HTML accessibility
  fixtures/
    axe-fixture.ts            # Shared AxeBuilder configuration
    report-data.ts            # Mock ReportData/SiteReportData factories
```

### New Dependencies

- **`@playwright/test`**: Add as devDependency (currently only transitive). Version should match `playwright` version.
- **`@axe-core/playwright`**: Already in dependencies — move to devDependencies or keep as-is.

### CI Changes

Add to `.github/workflows/ci.yml` after the Build step:

```yaml
- name: Install Playwright browsers
  run: npx playwright install --with-deps chromium

- name: Self-scan accessibility tests
  run: npx playwright test

- name: Upload accessibility report
  uses: actions/upload-artifact@v4
  if: ${{ !cancelled() }}
  with:
    name: a11y-report
    path: playwright-report/
    retention-days: 30
```

---

## Discovered Research Topics

- [ ] Exact `@playwright/test` version compatibility with existing `playwright` `^1.58.2`
- [ ] Whether `@axe-core/playwright` `^4.11.1` works with `@playwright/test` latest
- [ ] Playwright Test `webServer` with Next.js production build vs dev mode performance
- [ ] How to generate meaningful mock `ReportData` with all required fields for report HTML scanning
- [ ] Score type definitions from `src/lib/types/score.ts` needed for mock data factories
- [ ] How to handle Playwright browser installation caching in GitHub Actions

---

## References

| Source | Type | Description |
|--------|------|-------------|
| `src/lib/scanner/engine.ts` | Source | Scanning engine with `scanPage()` and `scanUrl()` |
| `src/app/api/scan/route.ts` | Source | SSRF protection via `isValidScanUrl()` |
| `src/lib/scanner/store.ts` | Source | In-memory scan/crawl store |
| `src/lib/report/generator.ts` | Source | `assembleReportData()` transforms scan results |
| `src/lib/report/templates/report-template.ts` | Source | `generateReportHtml()` produces self-contained HTML |
| `src/lib/report/templates/site-report-template.ts` | Source | `generateSiteReportHtml()` for site reports |
| `src/lib/report/pdf-generator.ts` | Source | Uses `page.setContent()` pattern (validates approach) |
| `src/app/scan/[id]/page.tsx` | Source | Client-side scan results page |
| `src/app/crawl/[id]/page.tsx` | Source | Client-side crawl results page |
| `src/lib/scanner/__tests__/engine.test.ts` | Source | Existing unit tests (fully mocked) |
| `.github/workflows/ci.yml` | CI | Current GitHub Actions pipeline |
| `azure-pipelines/a11y-scan.yml` | CI | Azure Pipelines CLI scan example |
| `vitest.config.ts` | Config | Current test configuration |
| `package.json` | Config | Dependencies including unused `@axe-core/playwright` |
| <https://playwright.dev/docs/accessibility-testing> | Docs | Official Playwright a11y testing guide |
| <https://playwright.dev/docs/test-webserver> | Docs | Playwright webServer config docs |
