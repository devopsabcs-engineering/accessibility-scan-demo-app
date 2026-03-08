<!-- markdownlint-disable-file -->
# Implementation Details: Scanner Gap Analysis — Close 105-Violation Detection Gap

## Context Reference

Sources:
* [scanner-gap-analysis-research.md](../../research/2026-03-07/scanner-gap-analysis-research.md) — Primary research
* [axe-core-iframe-rules-research.md](../../research/subagents/2026-03-07/axe-core-iframe-rules-research.md) — axe-core iframe and rules
* [complementary-engines-research.md](../../research/subagents/2026-03-07/complementary-engines-research.md) — IBM Equal Access
* [implementation-readiness-research.md](../../research/subagents/2026-03-07/implementation-readiness-research.md) — Readiness verification

## Implementation Phase 1: AxeBuilder Migration + Best-Practice Rules

<!-- parallelizable: false -->

### Step 1.1: Refactor `engine.ts` to use `@axe-core/playwright` AxeBuilder

Replace the manual axe-core injection pattern with the already-installed `@axe-core/playwright` `AxeBuilder` class. This enables automatic iframe scanning and simplifies the code.

**Current code to replace** (`src/lib/scanner/engine.ts` Lines 1-29):

```typescript
// REMOVE: manual axe-core file reading and module shim
import * as fs from 'fs';
import * as path from 'path';
const axeSource = fs.readFileSync(
  path.resolve(process.cwd(), 'node_modules', 'axe-core', 'axe.min.js'),
  'utf-8'
);

// REMOVE: manual injection pattern in scanPage()
await page.evaluate(`var module = { exports: {} }; ${axeSource}`);
return page.evaluate(() => {
  return window.axe.run({
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
  });
});
```

**Replace with:**

```typescript
import { AxeBuilder } from '@axe-core/playwright';

export async function scanPage(page: Page): Promise<import('axe-core').AxeResults> {
  return new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .analyze();
}
```

**Key changes:**
* Remove `fs` and `path` imports (AxeBuilder manages axe-core injection internally)
* Remove `axeSource` module-level constant
* Remove the `var module = { exports: {} }` shim hack
* Add `'best-practice'` to the tags array (adds 27 rules: landmarks, headings, ARIA names, skip links, tabindex, etc.)
* `scanUrl()` function remains unchanged — it calls `scanPage()` internally

**Why AxeBuilder handles iframes automatically:**
* Uses Playwright's CDP-level frame access
* Injects axe-core into ALL frames including cross-origin
* Runs `axe.runPartial()` per frame and `axe.finishRun()` to aggregate
* Returns a single `AxeResults` object with multi-frame `target` arrays

Files:
* `src/lib/scanner/engine.ts` - Refactor scanPage(), remove fs/path imports and axeSource constant

Discrepancy references:
* Addresses DD-01: sequential implementation ensures this foundation is solid before adding engines

Success criteria:
* `scanPage()` signature remains `(page: Page) => Promise<AxeResults>`
* `scanUrl()` continues to work without changes
* No `fs` or `path` imports remain in engine.ts
* Tags array includes `'best-practice'`

Context references:
* scanner-gap-analysis-research.md (Lines 199-210) — AxeBuilder proposed code
* implementation-readiness-research.md — AxeBuilder API confirmed

Dependencies:
* `@axe-core/playwright` v4.11.1 already in package.json

### Step 1.2: Rewrite `engine.test.ts` to mock AxeBuilder instead of `page.evaluate()`

The current test file mocks the 2-step `page.evaluate()` pattern. With AxeBuilder, mock the `AxeBuilder` class constructor and its chainable methods.

**Current mock pattern to replace** (`src/lib/scanner/__tests__/engine.test.ts` Lines 3-35):

```typescript
// REMOVE: page.evaluate mocks
const mockPage = {
  goto: vi.fn().mockResolvedValue(undefined),
  evaluate: vi.fn().mockResolvedValue({...}), // Two-call pattern
  waitForLoadState: vi.fn().mockResolvedValue(undefined),
};
vi.mock('fs', ...);
vi.mock('path', ...);
```

**Replace with AxeBuilder mock pattern:**

```typescript
const mocks = vi.hoisted(() => {
  const mockAnalyze = vi.fn().mockResolvedValue({
    violations: [],
    passes: [],
    incomplete: [],
    inapplicable: [],
    testEngine: { name: 'axe-core', version: '4.10.0' },
  });
  const mockWithTags = vi.fn().mockReturnThis();
  const MockAxeBuilder = vi.fn().mockImplementation(() => ({
    withTags: mockWithTags,
    analyze: mockAnalyze,
  }));

  const mockPage = {
    goto: vi.fn().mockResolvedValue(undefined),
    waitForLoadState: vi.fn().mockResolvedValue(undefined),
  };
  // ... browser/context mocks remain the same
  return { MockAxeBuilder, mockWithTags, mockAnalyze, mockPage, ... };
});

vi.mock('@axe-core/playwright', () => ({
  AxeBuilder: mocks.MockAxeBuilder,
}));
```

**Test cases to update:**
* `scanPage` tests: verify `AxeBuilder` is constructed with `{ page }`, `.withTags()` called with correct tags, `.analyze()` called
* `scanUrl` tests: verify browser lifecycle (launch, newPage, goto, close) unchanged
* Remove `fs`/`path` mock tests (module-level initialization tests no longer applicable)
* Add test: verify `best-practice` is in the tags array

Files:
* `src/lib/scanner/__tests__/engine.test.ts` - Full rewrite of mock setup and test assertions

Success criteria:
* All existing test scenarios preserved (violations found, empty results, navigation timeout)
* New test verifying `best-practice` tag inclusion
* No `fs` or `path` mocking
* `vitest run` passes all scanner tests

Context references:
* `src/lib/scanner/__tests__/engine.test.ts` (Lines 1-100) — current test structure
* implementation-readiness-research.md — only this test file needs changes

Dependencies:
* Step 1.1 completion (engine.ts refactored first)

### Step 1.3: Validate phase changes

Run lint and build commands for scanner module.

Validation commands:
* `npm run lint` — full ESLint check
* `npm run test` — full vitest suite
* `npm run build` — TypeScript compilation

## Implementation Phase 2: IBM Equal Access Integration

<!-- parallelizable: false -->

### Step 2.1: Install `accessibility-checker` and create `.achecker.yml` configuration

Install the IBM Equal Access npm package and create the project-level configuration file.

**Terminal command:**
```bash
npm install accessibility-checker
```

**Create `.achecker.yml` at project root:**
```yaml
ruleArchive: latest
policies:
  - IBM_Accessibility
  - WCAG_2_1
failLevels:
  - violation
  - potentialviolation
reportLevels:
  - violation
  - potentialviolation
  - recommendation
outputFormat:
  - json
```

**Note:** The `accessibility-checker` package includes its own TypeScript definitions. Verify types resolve correctly after installation.

Files:
* `package.json` - Updated by npm install (new dependency added)
* `.achecker.yml` - NEW: IBM Equal Access configuration at project root

Success criteria:
* `npm install` succeeds without errors
* `accessibility-checker` appears in `package.json` dependencies
* `.achecker.yml` exists at project root with correct YAML syntax
* `import { aChecker } from 'accessibility-checker'` compiles without TypeScript errors

Context references:
* scanner-gap-analysis-research.md (Lines 221-232) — .achecker.yml configuration example
* complementary-engines-research.md — IBM API documentation

Dependencies:
* Phase 1 completion (AxeBuilder migration establishes the foundation)

### Step 2.2: Verify IBM `aChecker.getCompliance()` iframe scanning behavior

**This is a blocking verification step (DR-05).** The CodePen test page has ALL content inside an `<iframe id="result">`. If IBM's `aChecker.getCompliance()` does not auto-scan iframe content, Phase 2's projected impact drops significantly.

**Verification approach:**
1. Create a minimal test script that runs `aChecker.getCompliance(page, 'test')` against the CodePen URL
2. Check if results include violations from elements inside the iframe
3. If IBM auto-scans iframes: proceed normally
4. If IBM does NOT auto-scan iframes: implement fallback strategy

**Fallback strategy (if needed):**
```typescript
async function runIbmScan(page: Page, label: string): Promise<IbmResult[]> {
  // Try scanning the main page first
  const mainResults = await aChecker.getCompliance(page, label);
  
  // Additionally scan iframe content by navigating to iframe src
  const iframes = await page.frames();
  const iframeResults: IbmResult[] = [];
  for (const frame of iframes) {
    if (frame !== page.mainFrame()) {
      try {
        const frameResults = await aChecker.getCompliance(frame, `${label}-iframe`);
        iframeResults.push(...frameResults.report.results);
      } catch { /* frame may not be scannable */ }
    }
  }
  return [...mainResults.report.results, ...iframeResults];
}
```

Files:
* No permanent file changes — this is a verification step
* Results inform Step 2.4 implementation (whether iframe fallback is needed in `runIbmScan()`)

Success criteria:
* IBM iframe behavior documented (auto-scans or requires fallback)
* If fallback needed, pattern validated with at least one iframe-containing page

Dependencies:
* Step 2.1 (accessibility-checker installed)

### Step 2.3: Create `result-normalizer.ts` for multi-engine result merging and deduplication

Create a new module that normalizes results from axe-core, IBM Equal Access, and custom checks into a unified format, then deduplicates overlapping findings.

**New file: `src/lib/scanner/result-normalizer.ts`**

**Key responsibilities:**
1. **Normalize IBM results** to match the `AxeViolation` interface:
   - Map IBM `severity` → axe-core `impact` (Violation → critical, potentialviolation → serious, recommendation → moderate)
   - Map IBM `ruleId` → `id`
   - Map IBM `path.dom` → `target` array (CSS selector)
   - Map IBM `message` → `help` and `description`
   - Map IBM `reasonId` → `helpUrl` (construct IBM rule documentation URL)
   - Map IBM `ruleId` to WCAG tags using IBM's built-in `ruleToWcag` mapping

2. **Normalize custom check results** to match the `AxeViolation` interface:
   - Custom checks return `{ id, impact, description, help, nodes: [{ html, target }] }`
   - Map to AxeViolation format with `tags: ['best-practice']` and helpUrl pointing to WCAG docs

3. **Deduplicate across engines:**
   - Build dedup key: `normalizeSelector(target[0]) + '|' + wcagCriterion`
   - When same element flagged by both engines for same criterion, keep the higher severity
   - When same element flagged for different criteria, keep both entries
   - Track engine source in a metadata field for debugging

**Type definitions to add:**

```typescript
interface NormalizedViolation extends AxeViolation {
  engine: 'axe-core' | 'ibm-equal-access' | 'custom';
}

interface MultiEngineResults {
  violations: NormalizedViolation[];
  passes: AxePass[];
  incomplete: AxeIncomplete[];
  inapplicable: AxeInapplicable[];
  engineVersions: Record<string, string>;
}
```

Files:
* `src/lib/scanner/result-normalizer.ts` - NEW: multi-engine result normalization and deduplication
* `src/lib/types/scan.ts` - Add `engine` optional field to `AxeViolation`, add `MultiEngineResults` type

Discrepancy references:
* Addresses DD-02: normalization enables the multi-engine pipeline that closes 85% of the gap

Success criteria:
* IBM results correctly mapped to AxeViolation format
* Deduplication removes true duplicates (same element + same criterion)
* Higher severity preserved when both engines flag same issue
* Engine source tracked on each violation

Context references:
* scanner-gap-analysis-research.md (Lines 265-280) — dedup key and severity mapping
* complementary-engines-research.md — IBM result schema

Dependencies:
* Step 2.1 completion (accessibility-checker installed)

### Step 2.4: Add IBM scanning function to `engine.ts` and integrate multi-engine pipeline

Add a `runIbmScan()` function and a `multiEngineScan()` orchestrator to `engine.ts`. If Step 2.2 verified that IBM does NOT auto-scan iframes, use the fallback strategy from Step 2.2 in `runIbmScan()`.

**New functions in `src/lib/scanner/engine.ts`:**

```typescript
import { aChecker } from 'accessibility-checker';

async function runIbmScan(page: Page, label: string): Promise<IbmResult[]> {
  const result = await aChecker.getCompliance(page, label);
  return result.report.results;
}

export async function multiEngineScan(page: Page, url: string): Promise<MultiEngineResults> {
  const [axeResults, ibmResults] = await Promise.all([
    scanPage(page),
    runIbmScan(page, url),
  ]);
  return normalizeAndMerge(axeResults, ibmResults, []);
}
```

**Update `scanUrl()` to use `multiEngineScan()`:**
* Replace `const results = await scanPage(page)` with `const results = await multiEngineScan(page, url)`
* Return `MultiEngineResults` instead of raw `AxeResults`
* Keep `scanPage()` available for backward compatibility (axe-only mode)

**Update `scanPage()` export for backward compatibility:**
* `scanPage()` remains as axe-core-only scan (used by crawler for speed)
* `multiEngineScan()` is the new full-featured scan entry point

Files:
* `src/lib/scanner/engine.ts` - Add `runIbmScan()`, `multiEngineScan()`, update `scanUrl()` to use multi-engine pipeline

Discrepancy references:
* Addresses DD-01: multi-engine pipeline established in Phase 2 after Phase 1 foundation

Success criteria:
* `multiEngineScan()` runs axe-core and IBM in parallel via `Promise.all()`
* `scanUrl()` returns `MultiEngineResults` with violations from both engines
* `scanPage()` still returns `AxeResults` for backward compatibility
* IBM scan errors are caught and logged without failing the entire scan (graceful degradation)

Context references:
* scanner-gap-analysis-research.md (Lines 200-212) — multi-engine architecture diagram
* scanner-gap-analysis-research.md (Lines 260-280) — IBM integration details

Dependencies:
* Step 2.1 (accessibility-checker installed)
* Step 2.2 (IBM iframe behavior verified)
* Step 2.3 (result-normalizer.ts created)

### Step 2.5: Update `result-parser.ts` to handle unified multi-engine results

Update `parseAxeResults()` to accept either `AxeResults` (backward compat) or `MultiEngineResults`.

**Changes:**
* Add overload or union parameter type: `parseAxeResults(url: string, raw: AxeResults | MultiEngineResults)`
* When `raw` has `engineVersions` property, treat as `MultiEngineResults`
* When `raw` is standard `AxeResults`, behavior is unchanged
* Update `ScanResults.engineVersion` to show all engines: `"axe-core 4.10.0, ibm-equal-access 3.x"`

Files:
* `src/lib/scanner/result-parser.ts` - Update parseAxeResults to handle MultiEngineResults
* `src/lib/types/scan.ts` - Update `ScanResults.engineVersion` to `string` (already is; ensure multi-engine format)

Success criteria:
* Existing callers passing `AxeResults` continue to work unchanged
* New `MultiEngineResults` input produces correct `ScanResults` output
* `engineVersion` field shows all engine versions

Context references:
* `src/lib/scanner/result-parser.ts` (Lines 1-65) — current parser implementation

Dependencies:
* Step 2.3 (result-normalizer types defined)
* Step 2.4 (multiEngineScan returns MultiEngineResults)

### Step 2.6: Add tests for IBM integration and result normalization

Create new test files for the IBM integration and result normalization logic.

**New test files:**
* `src/lib/scanner/__tests__/result-normalizer.test.ts` — Unit tests for:
  - IBM severity to axe impact mapping
  - IBM result to AxeViolation conversion
  - Deduplication logic (same element + same criterion)
  - Higher severity preservation
  - Custom check result normalization

* Update `src/lib/scanner/__tests__/engine.test.ts` — Add tests for:
  - `multiEngineScan()` calls both engines
  - IBM scan failure graceful degradation
  - `scanPage()` backward compatibility (still axe-only)

* Update `src/lib/scanner/__tests__/result-parser.test.ts` — Add tests for:
  - `parseAxeResults()` with `MultiEngineResults` input
  - Multi-engine version string in output

Files:
* `src/lib/scanner/__tests__/result-normalizer.test.ts` - NEW: normalization and dedup tests
* `src/lib/scanner/__tests__/engine.test.ts` - Add multi-engine tests
* `src/lib/scanner/__tests__/result-parser.test.ts` - Add MultiEngineResults parsing tests

Success criteria:
* All new tests pass
* Existing tests still pass
* Coverage for normalization logic (severity mapping, dedup, merge)

Dependencies:
* Steps 2.3, 2.4, 2.5 completion

### Step 2.7: Update downstream `scanUrl()` callers for `MultiEngineResults` type

Phase 2 Step 2.4 changes `scanUrl()` to return `MultiEngineResults` instead of `AxeResults`. Four downstream callers must be verified and updated (DD-04).

**Affected files:**

1. **`src/app/api/scan/route.ts`** — Calls `scanUrl()` and passes result to `parseAxeResults()`. Since `parseAxeResults()` is updated in Step 2.5 to accept `MultiEngineResults`, this caller may need no code changes — verify TypeScript compilation succeeds.

2. **`src/app/api/ci/scan/route.ts`** — Same pattern as above. Verify type compatibility.

3. **`src/cli/commands/scan.ts`** — CLI scan command calls `scanUrl()` and feeds results to the parser. Verify type compatibility and update any explicit `AxeResults` type annotations.

4. **`src/cli/__tests__/scan.test.ts`** — Mocks `scanUrl()` to return `AxeResults` format. Update mock return value to `MultiEngineResults` format (add `engineVersions` property at minimum, ensure `violations` array uses `NormalizedViolation` shape).

**Verification approach:**
* Run `npm run build` after Step 2.4 and 2.5 — TypeScript compiler will flag any type mismatches
* For each caller, check if it uses explicit `AxeResults` type annotation on the return value
* Update type annotations to `MultiEngineResults` or use `Awaited<ReturnType<typeof scanUrl>>`

Files:
* `src/app/api/scan/route.ts` - Verify/update type handling for MultiEngineResults
* `src/app/api/ci/scan/route.ts` - Verify/update type handling for MultiEngineResults
* `src/cli/commands/scan.ts` - Verify/update type annotations
* `src/cli/__tests__/scan.test.ts` - Update mock return value to MultiEngineResults format

Success criteria:
* `npm run build` succeeds with zero type errors across all callers
* CLI scan test mock returns correct MultiEngineResults shape
* All downstream callers produce correct output with multi-engine results

Dependencies:
* Step 2.4 (`scanUrl()` return type changed)
* Step 2.5 (`parseAxeResults()` accepts union type)

### Step 2.8: Validate phase changes

Run full validation for Phase 2.

Validation commands:
* `npm run lint` — ESLint on all files
* `npm run test` — full vitest suite
* `npm run build` — TypeScript compilation

## Implementation Phase 3: Custom Playwright Checks

<!-- parallelizable: false -->

### Step 3.1: Create `custom-checks.ts` framework and implement 5 DOM/CSS checks

Create a new module with a framework for custom Playwright DOM/CSS accessibility checks that fill gaps not covered by axe-core or IBM Equal Access.

**New file: `src/lib/scanner/custom-checks.ts`**

**Framework structure:**

```typescript
import type { Page } from 'playwright';

interface CustomCheckResult {
  id: string;
  impact: 'minor' | 'moderate' | 'serious' | 'critical';
  description: string;
  help: string;
  helpUrl: string;
  tags: string[];
  nodes: { html: string; target: string[]; impact: string; failureSummary: string }[];
}

type CustomCheck = (page: Page) => Promise<CustomCheckResult | null>;
```

**5 checks to implement:**

1. **`ambiguous-link-text`** (serious):
   - Query all `<a>` elements visible on page
   - Check `innerText` against blocklist: "learn more", "click here", "more", "here", "read more", "continue", "details", "link"
   - Case-insensitive, trimmed comparison
   - Return nodes with matching links and their selectors
   - WCAG: 2.4.4 Link Purpose (In Context) — Level A

2. **`aria-current-page`** (moderate):
   - Find `<nav>` elements on page
   - Within each nav, find `<a>` elements whose `href` matches current page URL
   - Check if the active link has `aria-current="page"` attribute
   - Return nodes missing the attribute
   - WCAG: 1.3.1 Info and Relationships — Level A

3. **`emphasis-strong-semantics`** (minor):
   - Find all `<em>` and `<strong>` elements on page
   - Check if they have `role="emphasis"` or `role="strong"` respectively
   - Return nodes missing the semantic role
   - Note: WAI-ARIA 1.3 draft — flag as informational
   - WCAG: 1.3.1 Info and Relationships — Level A (forward-looking)

4. **`discount-price-accessibility`** (serious):
   - Find all `<del>`, `<s>`, and `<strike>` elements on page
   - Check if the element or its container provides screen reader context (e.g., `aria-label`, visually hidden text like "Original price:", `<span class="sr-only">`)
   - Return nodes with strikethrough content lacking SR context
   - WCAG: 1.3.1 Info and Relationships — Level A

5. **`sticky-element-overlap`** (serious):
   - Find all elements with `position: fixed` or `position: sticky` via `getComputedStyle()`
   - Find all focusable elements (`a`, `button`, `input`, `select`, `textarea`, `[tabindex]`)
   - Check if any focusable element's bounding rect overlaps with a sticky/fixed element's rect
   - Return overlapping focusable nodes
   - WCAG: 2.4.7 Focus Visible — Level AA

**Orchestrator function:**

```typescript
export async function runCustomChecks(page: Page): Promise<CustomCheckResult[]> {
  const checks: CustomCheck[] = [
    checkAmbiguousLinkText,
    checkAriaCurrentPage,
    checkEmphasisStrongSemantics,
    checkDiscountPriceAccessibility,
    checkStickyElementOverlap,
  ];
  const results: CustomCheckResult[] = [];
  for (const check of checks) {
    const result = await check(page);
    if (result && result.nodes.length > 0) {
      results.push(result);
    }
  }
  return results;
}
```

**Each check runs `page.evaluate()` or `page.$$eval()` to query the DOM and return structured data. Checks run within the page context for performance.**

Files:
* `src/lib/scanner/custom-checks.ts` - NEW: 5 custom accessibility checks with framework

Discrepancy references:
* Addresses DD-02: these 5 checks cover the remaining ~15% gap that neither axe nor IBM addresses
* References DR-04: emphasis/strong check is forward-looking (WAI-ARIA 1.3 draft)

Success criteria:
* Each check returns null or a `CustomCheckResult` with zero or more nodes
* Ambiguous link text check detects "Learn More", "Click Here" etc.
* aria-current check only flags links within `<nav>` elements
* Discount price check only flags `<del>`/`<s>`/`<strike>` without SR context
* Sticky overlap check uses computed styles and bounding rects

Context references:
* scanner-gap-analysis-research.md (Lines 310-340) — custom check list and descriptions
* complementary-engines-research.md — gaps not covered by axe or IBM

Dependencies:
* Phase 2 completion (result-normalizer handles custom check normalization)

### Step 3.2: Integrate custom checks into multi-engine pipeline in `engine.ts`

Wire the `runCustomChecks()` function into the `multiEngineScan()` orchestrator.

**Update `multiEngineScan()` in `src/lib/scanner/engine.ts`:**

```typescript
import { runCustomChecks } from './custom-checks';

export async function multiEngineScan(page: Page, url: string): Promise<MultiEngineResults> {
  const [axeResults, ibmResults, customResults] = await Promise.all([
    scanPage(page),
    runIbmScan(page, url),
    runCustomChecks(page),
  ]);
  return normalizeAndMerge(axeResults, ibmResults, customResults);
}
```

**Note:** All three engines run in parallel via `Promise.all()` since they are read-only DOM operations on the same page snapshot.

Files:
* `src/lib/scanner/engine.ts` - Update multiEngineScan() to include custom checks

Success criteria:
* `multiEngineScan()` runs all three engines in parallel
* Custom check results appear in the unified violations array
* Custom check failures don't block axe-core or IBM results

Context references:
* scanner-gap-analysis-research.md (Lines 200-212) — multi-engine architecture

Dependencies:
* Step 3.1 (custom-checks.ts created)
* Phase 2 (normalizeAndMerge handles custom results)

### Step 3.3: Add tests for custom checks

Create comprehensive unit tests for each custom check.

**New file: `src/lib/scanner/__tests__/custom-checks.test.ts`**

**Test scenarios per check:**
* `ambiguous-link-text`: page with "Learn More" links → detected; page with descriptive links → not detected
* `aria-current-page`: nav with active link missing `aria-current` → detected; nav with attribute present → not detected
* `emphasis-strong-semantics`: `<em>` without role → detected; `<em role="emphasis">` → not detected
* `discount-price-accessibility`: `<del>$10</del>` without context → detected; with `aria-label` → not detected
* `sticky-element-overlap`: fixed header over focusable button → detected; no overlap → not detected

**Mock strategy:** Use Playwright's `page` mock with `page.evaluate()` / `page.$$eval()` returning pre-built DOM query results.

Files:
* `src/lib/scanner/__tests__/custom-checks.test.ts` - NEW: unit tests for all 5 custom checks

Success criteria:
* Each check has positive and negative test cases
* Edge cases covered (empty page, no nav elements, no del elements)
* All tests pass

Dependencies:
* Step 3.1 (custom-checks.ts created)

### Step 3.4: Validate phase changes

Validation commands:
* `npm run lint` — ESLint on all files
* `npm run test` — full vitest suite
* `npm run build` — TypeScript compilation

## Implementation Phase 4: Element-Level Counting and Reporting Parity

<!-- parallelizable: false -->

### Step 4.1: Add `elementViolationCount` to `ScoreResult` type and update calculator

Add element-level counting to the scoring system so the UI and reports can display both rule-level and element-level violation counts.

**Update `src/lib/types/score.ts`:**

```typescript
export interface ScoreResult {
  overallScore: number;
  grade: ScoreGrade;
  principleScores: PrincipleScores;
  impactBreakdown: ImpactBreakdown;
  totalViolations: number;           // existing: rule-level count
  totalElementViolations: number;    // NEW: element-level count (sum of all nodes across violations)
  totalPasses: number;
  totalIncomplete: number;
  aodaCompliant: boolean;
}
```

**Update `src/lib/scoring/calculator.ts`:**

```typescript
// Add element-level counting in calculateScore():
const totalElementViolations = violations.reduce((sum, v) => sum + v.nodes.length, 0);

return {
  overallScore,
  grade: getGrade(overallScore),
  principleScores,
  impactBreakdown,
  totalViolations: violations.length,
  totalElementViolations,             // NEW
  totalPasses: passes.length,
  totalIncomplete: incompleteCount,
  aodaCompliant: violations.length === 0,
};
```

Files:
* `src/lib/types/score.ts` - Add `totalElementViolations` to `ScoreResult`
* `src/lib/scoring/calculator.ts` - Compute `totalElementViolations` as sum of `v.nodes.length`
* `src/lib/scoring/__tests__/calculator.test.ts` - Add test for element-level counting

Discrepancy references:
* Addresses DD-03: additive display preserves rule-level counting while adding element-level

Success criteria:
* `ScoreResult` includes `totalElementViolations` field
* `calculateScore()` correctly sums `nodes.length` across all violations
* Existing tests updated to expect new field
* TypeScript compilation succeeds

Context references:
* scanner-gap-analysis-research.md (Lines 380-400) — element-level counting code
* `src/lib/scoring/calculator.ts` (Lines 1-100) — current calculator

Dependencies:
* Phase 1 completion (AxeBuilder may return more violations with more nodes)

### Step 4.2: Update `result-parser.ts` to include element-level summary

Ensure the result parser passes the new `totalElementViolations` field through correctly.

**The `parseAxeResults()` function calls `calculateScore()` which now returns `totalElementViolations`. No changes needed to the parser itself** — the field flows through automatically since `parseAxeResults` returns `score: calculateScore(...)`.

**Verify only:** Read `parseAxeResults()` and confirm it assigns `score` directly from `calculateScore()` return value.

Files:
* `src/lib/scanner/result-parser.ts` - Verify no changes needed (score field auto-propagates)

Success criteria:
* `parseAxeResults()` output includes `score.totalElementViolations` without code changes
* Confirmed by running existing parser tests

Dependencies:
* Step 4.1 (calculator updated with new field)

### Step 4.3: Update UI components to display both rule-level and element-level counts

Update the score display and report view components to show both counts.

**Update `src/components/ScoreDisplay.tsx`:**
* Display `totalViolations` as "N rules with violations"
* Display `totalElementViolations` as "N total element issues"
* Keep overall score and grade display unchanged

**Update `src/components/ReportView.tsx`:**
* Add element-level count to the summary section
* Display alongside existing rule-level count

Files:
* `src/components/ScoreDisplay.tsx` - Add element-level count display
* `src/components/ReportView.tsx` - Add element-level count to summary

Success criteria:
* UI shows both counts: "X violations (Y element issues)"
* Layout accommodates the additional information without breaking
* Existing functionality preserved

Context references:
* scanner-gap-analysis-research.md (Lines 395-410) — UI update description

Dependencies:
* Step 4.1 (ScoreResult type updated)

### Step 4.4: Update report generators (PDF, SARIF) for element-level counts

Update report generators to include element-level counts in their output.

**`src/lib/report/pdf-generator.ts`:**
* Add "Total Element Issues: N" to the summary section of generated PDFs
* Display alongside existing "Total Violations: N"

**`src/lib/report/sarif-generator.ts`:**
* Add `totalElementViolations` to SARIF `run.properties` for tool consumption
* SARIF `results` array already contains individual nodes — behavior unchanged

**`src/lib/report/generator.ts`:**
* If generator produces a summary, include element-level count

Files:
* `src/lib/report/pdf-generator.ts` - Add element-level count to PDF summary
* `src/lib/report/sarif-generator.ts` - Add element-level count to SARIF properties
* `src/lib/report/generator.ts` - Add element-level count to report summary (if applicable)

Success criteria:
* PDF report shows both violation counts
* SARIF includes element-level count in properties
* Existing report formats not broken

Dependencies:
* Step 4.1 (ScoreResult type updated)

### Step 4.5: Validate phase changes

Validation commands:
* `npm run lint` — ESLint on all files
* `npm run test` — full vitest suite including updated calculator and parser tests
* `npm run build` — TypeScript compilation

## Implementation Phase 5: Final Validation

<!-- parallelizable: false -->

### Step 5.1: Run full project validation

Execute all validation commands for the project:
* `npm run lint` — full ESLint check
* `npm run build` — full Next.js + TypeScript build
* `npm run test` — full vitest suite with all new and existing tests

### Step 5.2: Fix minor validation issues

Iterate on lint errors, build warnings, and test failures. Apply fixes directly when corrections are straightforward and isolated.

### Step 5.3: Manual integration test on CodePen bad page

Scan `https://codepen.io/leezee/pen/eYbXzpJ` and verify:
* Violation count dramatically increases from 1 (expected: 50+ after Phase 1, 70-90+ after Phase 2)
* Violations from iframe content now detected (Phase 1)
* Best-practice violations reported (Phase 1)
* IBM-specific rule violations detected (Phase 2)
* Custom check violations detected (Phase 3)
* Element-level count shown alongside rule-level count (Phase 4)
* Compare findings against commercial tool categories from research PDF

### Step 5.4: Report blocking issues

When validation failures require changes beyond minor fixes:
* Document the issues and affected files
* Provide the user with next steps
* Recommend additional research and planning rather than inline fixes
* Avoid large-scale refactoring within this phase

## Dependencies

* `@axe-core/playwright` v4.11.1 — Already in package.json
* `accessibility-checker` — Install in Phase 2
* `playwright` v1.58.2 — Already installed
* `vitest` v4.0.18 — Already installed
* Node.js, TypeScript 5.x — Already configured

## Success Criteria

* Scanner detects 50+ violations on CodePen bad page (up from 1)
* axe-core runs 96+ rules with best-practice tag (up from 69)
* IBM Equal Access adds ~100 unique rules
* 5 custom checks cover remaining gap categories
* Element-level counts displayed in UI and reports
* All tests pass with zero regressions
