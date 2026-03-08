<!-- markdownlint-disable-file -->
# Subagent Research: Scanner Gap Analysis Implementation Readiness

## Research Status: Complete

## Research Topics and Questions

1. Does `@axe-core/playwright` v4.11.1 actually support `AxeBuilder` with `.withTags()` and `.analyze()`?
2. Would switching from manual injection to AxeBuilder break the `result-parser.ts` contract?
3. What downstream files consume `ScanResults` and would be affected by type changes?
4. Are there test files that mock the current `page.evaluate()` pattern that would need updating?
5. What is the full dependency map of `engine.ts` across the codebase?
6. Are there any blocking risks or compatibility issues?

---

## 1. AxeBuilder API Verification — CONFIRMED

### Source: `node_modules/@axe-core/playwright/dist/index.d.ts`

The `@axe-core/playwright` v4.11.1 package, already installed as a dependency (`package.json` line 19: `"@axe-core/playwright": "^4.11.1"`), exports a fully functional `AxeBuilder` class:

```typescript
import { AxeResults } from 'axe-core';
import { Page } from 'playwright-core';

declare class AxeBuilder {
    constructor({ page, axeSource }: { page: Page; axeSource?: string });
    include(selector: SerialFrameSelector): this;
    exclude(selector: SerialFrameSelector): this;
    options(options: RunOptions): this;
    withRules(rules: string | string[]): this;    // Cannot combine with withTags
    withTags(tags: string | string[]): this;       // Cannot combine with withRules
    disableRules(rules: string | string[]): this;
    setLegacyMode(legacyMode?: boolean): this;
    analyze(): Promise<AxeResults>;                 // Returns axe-core AxeResults
}
```

### Key Findings

- **`.withTags()` is supported**: Accepts `string | string[]`, returns `this` for chaining.
- **`.analyze()` is supported**: Returns `Promise<AxeResults>` — the same `AxeResults` type from `axe-core`.
- **iframe scanning is automatic**: Internally uses `axe.runPartial()` in each frame + `axe.finishRun()` in a blank page. Cross-origin frames work because Playwright controls all frames via CDP.
- **No new dependencies needed**: The package is already installed and unused.

### VERDICT: AxeBuilder API is fully confirmed and ready to use.

---

## 2. Result-Parser Contract Compatibility — SAFE

### Question: Does AxeBuilder return the same `AxeResults` type that result-parser expects?

**YES.** Both use the identical `AxeResults` type from `axe-core`:

| Component | Import | Type |
|---|---|---|
| Current `engine.ts` | `import('axe-core').AxeResults` (cast) | `AxeResults` |
| `AxeBuilder.analyze()` | Returns `AxeResults` from `axe-core` | `AxeResults` |
| `result-parser.ts` | `import type { AxeResults } from 'axe-core'` | `AxeResults` |

### Target Array Handling (iframe paths)

When scanning across iframes, axe-core uses the `target` field to encode frame paths:

- **Same-frame result**: `target: ['div.class']` — array with single CSS selector string
- **iframe result**: `target: ['iframe#result', 'div.class']` — array with frame + element selector strings
- **Shadow DOM result**: `target: [['host-element', 'shadow-child']]` — nested array

The `result-parser.ts` code handles this correctly:

```typescript
// result-parser.ts line 15
target: n.target.map(String),
```

- For string elements: `String('div.class')` → `'div.class'` ✅
- For string array elements (shadow DOM): `String(['host', 'child'])` → `'host,child'` — functional but not ideal for display

The existing test at `result-parser.test.ts` already verifies multi-element `target` arrays:

```typescript
target: ['#main', '.content', 'li'],  // Multi-element selector path
```

### Internal Type Definition

The `ScanResults` type in `src/lib/types/scan.ts` defines `AxeNode.target` as `string[]`, which is a simplification of axe-core's `UnlabelledFrameSelector` = `(string | string[])[]`. The current `map(String)` flattening approach is compatible.

### Minor Risk: Shadow DOM Selector Display

If a violation occurs inside both an iframe AND a shadow DOM, the `target` array could contain nested string arrays. The `String()` conversion produces comma-separated values (e.g., `'host,child'`). This is a **cosmetic issue only** — it affects display in:
- `ViolationList.tsx` line 92: `node.target.join(' > ')`
- `sarif-generator.ts` line 92: `node.target.join(' ')`

**Risk level**: LOW — shadow DOM violations are rare and the output is still functional.

### VERDICT: No breaking changes to the result-parser contract. AxeBuilder returns identical `AxeResults`.

---

## 3. Full Dependency Map of Engine and Result Types

### Direct Consumers of `engine.ts` Functions

| File | Import | Function Used | Impact |
|---|---|---|---|
| `src/app/api/scan/route.ts` | `import { scanUrl }` | `scanUrl()` | None — function signature unchanged |
| `src/app/api/ci/scan/route.ts` | `import { scanUrl }` | `scanUrl()` | None — function signature unchanged |
| `src/cli/commands/scan.ts` | `import { scanUrl }` | `scanUrl()` | None — function signature unchanged |
| `src/lib/crawler/site-crawler.ts` | `import { scanPage }` | `scanPage(page)` | None — function signature unchanged |

**Key insight**: Both `scanPage(page: Page)` and `scanUrl(url: string, onProgress?)` return `AxeResults`. All consumers pass this to `parseAxeResults()`. Since AxeBuilder returns the same type, NO callers need changes.

### Direct Consumers of `ScanResults` Type (output of `parseAxeResults`)

| File | What It Consumes | Fields Accessed | Impact |
|---|---|---|---|
| `src/lib/report/generator.ts` | `ScanResults` | `.url`, `.timestamp`, `.engineVersion`, `.score`, `.violations`, `.passes`, `.incomplete` | None |
| `src/lib/report/sarif-generator.ts` | `AxeViolation[]` | `.id`, `.impact`, `.description`, `.help`, `.helpUrl`, `.tags`, `.nodes[].html`, `.nodes[].target` | None |
| `src/lib/report/pdf-generator.ts` | HTML string (no type dep) | N/A | None |
| `src/components/ReportView.tsx` | `ScanResults` | `.url`, `.timestamp`, `.engineVersion`, `.score`, `.violations`, `.passes`, `.incomplete` | None |
| `src/components/ViolationList.tsx` | `AxeViolation[]` | `.id`, `.impact`, `.principle`, `.description`, `.help`, `.helpUrl`, `.nodes[].html`, `.nodes[].target`, `.nodes[].failureSummary` | None |
| `src/components/ScoreDisplay.tsx` | `ScoreResult` | `.overallScore`, `.grade`, `.aodaCompliant`, `.totalViolations`, `.totalPasses`, `.totalIncomplete`, `.principleScores`, `.impactBreakdown` | None |
| `src/lib/ci/threshold.ts` | `AxeViolation[]` | `.id`, `.impact` | None |
| `src/lib/ci/formatters/sarif.ts` | `AxeViolation[]` | Delegates to `sarif-generator.ts` | None |
| `src/app/api/ci/scan/route.ts` | `ScanResults` | `.score.overallScore`, `.violations`, `.engineVersion`, `.score.grade` | None |
| `src/app/api/ci/crawl/route.ts` | `pageRecords[].results` | `.engineVersion`, `.violations` | None (indirect via store) |
| `src/app/api/scan/[id]/route.ts` | `ScanRecord` (from store) | Entire record | None |
| `src/app/api/scan/[id]/pdf/route.ts` | `ScanResults` (from store) | Via `assembleReportData()` | None |

### VERDICT: Zero downstream type changes required. The `ScanResults` interface is unaffected by the engine refactor.

---

## 4. Test Files Requiring Updates

### Critical: `src/lib/scanner/__tests__/engine.test.ts`

This test file **directly mocks the `page.evaluate()` pattern** and will need a complete rewrite:

**Current mock pattern**:
```typescript
const mockPage = {
  goto: vi.fn().mockResolvedValue(undefined),
  evaluate: vi.fn().mockResolvedValue({ /* AxeResults */ }),
  waitForLoadState: vi.fn().mockResolvedValue(undefined),
};
// Tests verify:
// - page.evaluate called 2x (axe injection + axe.run)
// - fs.readFileSync for axe.min.js loading
// - path.resolve for axe path
```

**Required changes**:
- Remove mocks for `fs.readFileSync`, `path.resolve` (no longer needed — AxeBuilder manages axe-core injection)
- Remove `page.evaluate` 2-call pattern mock
- Mock `@axe-core/playwright` module: `AxeBuilder` class with `.withTags()`, `.analyze()` chain
- Keep browser lifecycle tests for `scanUrl()` unchanged (still uses Playwright)
- Keep timeout fallback tests for `scanUrl()` unchanged

**Estimated effort**: Moderate — test structure changes but test coverage goals remain the same.

### Moderate: `src/cli/__tests__/scan.test.ts`

Mocks `scanUrl` at the module level:

```typescript
vi.mock('../../lib/scanner/engine', () => ({
  scanUrl: vi.fn(),
}));
```

**This mock will continue to work** because `scanUrl`'s public API signature is unchanged. The mock replaces the entire function. **No changes needed.**

### Moderate: `src/lib/crawler/__tests__/site-crawler.test.ts`

Mocks `scanPage` at the module level:

```typescript
vi.mock('../../scanner/engine', () => ({
  scanPage: vi.fn().mockResolvedValue({ /* AxeResults */ }),
}));
```

**This mock will continue to work** because `scanPage`'s public API signature is unchanged. **No changes needed.**

### No Impact: All Other Test Files

| Test File | Why No Impact |
|---|---|
| `result-parser.test.ts` | Tests `parseAxeResults()` directly with constructed `AxeResults` — no engine dependency |
| `threshold.test.ts` | Tests `evaluateThreshold()` with constructed `AxeViolation[]` — no engine dependency |
| `sarif.test.ts` | Mocks `generateSarif` — no engine dependency |
| `junit.test.ts` | Tests formatter — no engine dependency |
| `json.test.ts` | Tests formatter — no engine dependency |
| `loader.test.ts` | Tests CLI config loading — no engine dependency |
| `crawl.test.ts` (CLI) | Mocks at module level — no engine dependency |

### VERDICT: Only `engine.test.ts` requires rewriting. All other tests work unchanged.

---

## 5. Engine.ts Refactoring Details

### Current Implementation (manual injection)

```typescript
// Module-level: reads axe.min.js from disk
const axeSource = fs.readFileSync(
  path.resolve(process.cwd(), 'node_modules', 'axe-core', 'axe.min.js'), 'utf-8'
);

export async function scanPage(page: Page): Promise<AxeResults> {
  // Step 1: Inject axe-core with module shim
  await page.evaluate(`var module = { exports: {} }; ${axeSource}`);
  // Step 2: Run axe analysis
  return page.evaluate(() => {
    return window.axe.run({
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    });
  });
}
```

### Proposed Implementation (AxeBuilder)

```typescript
import { AxeBuilder } from '@axe-core/playwright';

export async function scanPage(page: Page): Promise<AxeResults> {
  return new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .analyze();
}
```

### Changes Summary

| Aspect | Before | After |
|---|---|---|
| Dependencies | `fs`, `path`, manual axe-core source | `@axe-core/playwright` (already installed) |
| iframe scanning | ❌ Top frame only | ✅ All frames automatically |
| Rule coverage | 69 rules (WCAG only) | 96 rules (WCAG + best-practice) |
| Module-level code | `fs.readFileSync` for axe source | Nothing (AxeBuilder manages internally) |
| `scanPage` signature | `(page: Page) => Promise<AxeResults>` | `(page: Page) => Promise<AxeResults>` — UNCHANGED |
| `scanUrl` signature | `(url: string, onProgress?) => Promise<AxeResults>` | UNCHANGED |
| Cross-origin iframes | ❌ Cannot scan | ✅ Automatic via runPartial/finishRun |

### Lines of Code Impact

| File | Lines Before | Est. Lines After | Change |
|---|---|---|---|
| `engine.ts` | 73 | ~55 | -18 (simpler) |
| `engine.test.ts` | ~170 | ~150 | Rewrite mocking strategy |

---

## 6. Blocking Risks and Compatibility Analysis

### Risk 1: AxeBuilder Creates a Temporary Blank Page (LOW)

AxeBuilder's `finishRun()` creates a temporary blank page (`about:blank`) to aggregate partial results. This happens within the existing browser context. In the `scanUrl()` function, the browser context is already created and managed. In `scanPage()` called by the crawler, the page is provided by the caller which manages the browser lifecycle.

**Mitigation**: None needed — AxeBuilder handles this internally. The blank page is created and closed within `analyze()`.

### Risk 2: Increased Scan Time (LOW-MEDIUM)

Scanning all iframes increases scan time:
- Each iframe requires axe-core injection + `runPartial()` execution
- CodePen pages typically have 1-2 iframes
- Expected increase: ~1-3 seconds per iframe

**Mitigation**: The current timeout configuration (30s navigation + 10s fallback) provides sufficient margin.

### Risk 3: Best-Practice Violations Change Scores (EXPECTED)

Adding 30 best-practice rules will increase violation counts, which will:
- Lower `overallScore` values from the calculator
- Potentially change AODA compliance status for borderline sites
- Change threshold evaluation results in CI pipelines

**Mitigation**: This is the desired behavior. CI thresholds are configurable. The `wcag-mapper.ts` already maps `best-practice` tags to the `'best-practice'` principle. The `ViolationList.tsx` already has a `'best-practice'` principle label.

### Risk 4: `frame-tested` Rule Fires in Best-Practice (LOW)

The `frame-tested` best-practice rule verifies that iframes contain axe-core for testing. With AxeBuilder, this is always satisfied since it injects axe-core into all frames.

**Mitigation**: None needed — the rule will pass, not fail.

### Risk 5: Breaking the `scanPage()` Caller Contract in site-crawler.ts (NONE)

The `site-crawler.ts` calls `scanPage(page)` where `page` is a Playwright `Page` object navigated to a URL. AxeBuilder accepts the same `Page` type from `playwright-core` (which `playwright` extends).

**Mitigation**: None needed — types are compatible.

### Risk 6: Module-Level Side Effects Removed (LOW)

Current code has a module-level `fs.readFileSync` call that reads `axe.min.js` at import time. The refactored code removes this. Tests that mock `fs` at the module level (only `engine.test.ts`) will need updating.

**Mitigation**: Simpler code — no file system access at module load time.

---

## 7. Implementation Readiness Checklist

### Prerequisites — ALL MET

| Prerequisite | Status | Evidence |
|---|---|---|
| `@axe-core/playwright` installed | ✅ | `package.json` line 19: `"@axe-core/playwright": "^4.11.1"` |
| AxeBuilder API confirmed | ✅ | `node_modules/@axe-core/playwright/dist/index.d.ts` — `.withTags()`, `.analyze()` |
| Return type compatible | ✅ | Both return `AxeResults` from `axe-core` |
| `scanPage` signature preserved | ✅ | `(page: Page) => Promise<AxeResults>` unchanged |
| `scanUrl` signature preserved | ✅ | `(url: string, onProgress?) => AxeResults` unchanged |
| No downstream type changes | ✅ | All 12+ consumers use `ScanResults`/`AxeViolation[]` — unaffected |
| `best-practice` principle supported | ✅ | `ViolationList.tsx` has `'best-practice'` label, `wcag-mapper.ts` returns it |

### Files to Modify

| File | Change Type | Effort |
|---|---|---|
| `src/lib/scanner/engine.ts` | Refactor: replace manual injection with AxeBuilder | Small |
| `src/lib/scanner/__tests__/engine.test.ts` | Rewrite: new mock strategy for AxeBuilder | Medium |

### Files Verified Safe (No Changes Needed)

| File | Reason |
|---|---|
| `src/lib/scanner/result-parser.ts` | Consumes `AxeResults` — same type |
| `src/lib/scanner/__tests__/result-parser.test.ts` | Constructs `AxeResults` directly — no engine dep |
| `src/lib/types/scan.ts` | Type definitions unchanged |
| `src/lib/report/generator.ts` | Consumes `ScanResults` — unchanged type |
| `src/lib/report/sarif-generator.ts` | Consumes `AxeViolation[]` — unchanged type |
| `src/lib/report/pdf-generator.ts` | Consumes HTML string — no type dep |
| `src/components/ViolationList.tsx` | Consumes `AxeViolation[]` — unchanged type |
| `src/components/ScoreDisplay.tsx` | Consumes `ScoreResult` — unchanged type |
| `src/components/ReportView.tsx` | Consumes `ScanResults` — unchanged type |
| `src/lib/ci/threshold.ts` | Consumes `AxeViolation[]` — unchanged type |
| `src/lib/ci/__tests__/threshold.test.ts` | Constructs violations directly — no engine dep |
| `src/lib/ci/formatters/sarif.ts` | Delegates to sarif-generator — no engine dep |
| `src/app/api/scan/route.ts` | Calls `scanUrl()` — signature unchanged |
| `src/app/api/ci/scan/route.ts` | Calls `scanUrl()` — signature unchanged |
| `src/cli/commands/scan.ts` | Calls `scanUrl()` — signature unchanged |
| `src/lib/crawler/site-crawler.ts` | Calls `scanPage()` — signature unchanged |
| `src/cli/__tests__/scan.test.ts` | Mocks `scanUrl` at module level — still works |
| `src/lib/crawler/__tests__/site-crawler.test.ts` | Mocks `scanPage` at module level — still works |

---

## 8. Recommended Implementation Plan

### Phase 1: AxeBuilder Migration (Scenario 1 from gap analysis)

1. **Refactor `engine.ts`**: Replace manual axe injection with `AxeBuilder`
   - Remove `fs`/`path` imports and `axeSource` module-level read
   - Import `AxeBuilder` from `@axe-core/playwright`
   - Update `scanPage()` to use `new AxeBuilder({ page }).withTags([...]).analyze()`
   - Add `'best-practice'` to the tags array
   - Keep `scanUrl()` wrapper unchanged (browser lifecycle management)

2. **Rewrite `engine.test.ts`**: New mock strategy
   - Mock `@axe-core/playwright` module instead of `fs`/`path`
   - Create mock `AxeBuilder` class with chainable methods and `analyze()` stub
   - Verify `.withTags()` called with correct tags
   - Verify `.analyze()` called
   - Keep `scanUrl` browser lifecycle and timeout tests

3. **Run full test suite**: Verify all 12+ downstream consumers still pass
4. **Manual verification**: Scan CodePen bad page, expect 20-50+ violations (up from 1)

### Phase 2: Dual-Engine (Scenario 2 — separate work item)

- Add `accessibility-checker` dependency
- Create `src/lib/scanner/ibm-engine.ts`
- Create `src/lib/scanner/result-normalizer.ts`
- Extend `ScanResults` type OR create unified format

### Phase 3: Custom Checks (Scenario 3 — separate work item)

- Create `src/lib/scanner/custom-checks.ts`
- Integrate into scan pipeline
- Add new test coverage

---

## References and Evidence

| Source | Location | Finding |
|---|---|---|
| `@axe-core/playwright` types | `node_modules/@axe-core/playwright/dist/index.d.ts` | AxeBuilder class, withTags, analyze confirmed |
| axe-core types | `node_modules/axe-core/axe.d.ts` | `UnlabelledFrameSelector = CrossTreeSelector[]` |
| package.json | Line 19 | `"@axe-core/playwright": "^4.11.1"` installed |
| engine.ts | Lines 1-73 | Manual injection pattern |
| result-parser.ts | Lines 1-65 | `parseAxeResults(url, raw: AxeResults)` |
| engine.test.ts | Lines 1-170 | Mocks `page.evaluate()` 2-call pattern |
| scan types | `src/lib/types/scan.ts` | `ScanResults`, `AxeViolation`, `AxeNode` |
| gap analysis | `.copilot-tracking/research/2026-03-07/scanner-gap-analysis-research.md` | Root causes, scenarios, implementation approach |
| axe-core iframe research | `.copilot-tracking/research/subagents/2026-03-07/axe-core-iframe-rules-research.md` | iframe scanning mechanisms, AxeBuilder internals |
| complementary engines | `.copilot-tracking/research/subagents/2026-03-07/complementary-engines-research.md` | IBM Equal Access, custom checks |

---

## Discovered Research Topics (Completed)

- [x] AxeBuilder API verification from installed types
- [x] `AxeResults` type compatibility between engine and parser
- [x] `target` array handling for iframe results (UnlabelledFrameSelector)
- [x] Full dependency map of engine.ts across codebase (12+ files)
- [x] Test mock patterns in engine.test.ts
- [x] Test mock patterns in consumer tests (scan.test.ts, site-crawler.test.ts)
- [x] Best-practice principle already supported in UI components
- [x] No downstream type changes required

## Clarifying Questions

None — all research questions have been answered through code analysis and type inspection.
