<!-- markdownlint-disable-file -->
# Implementation Details: Report Output Parity with Reference PDFs (Epic 1975)

## Context Reference

Sources: `.copilot-tracking/research/2026-03-07/report-output-parity-research.md`, `.copilot-tracking/research/subagents/2026-03-07/source-file-verification-research.md`

## Implementation Phase 1: Single-Page Report Template Enhancement (US 1991, US 1993)

<!-- parallelizable: true -->

### Step 1.1: Add helper functions to report-template.ts

Add two helper functions after the existing `escapeHtml()` function (currently at L21-27) in `src/lib/report/templates/report-template.ts`:

1. `extractCategory(tags: string[]): string` — Extracts the `cat.*` tag from a violation's tags array and returns a human-friendly label. Falls back to `'General'` if no `cat.*` tag found.

   Category label map:
   - `cat.aria` → "ARIA"
   - `cat.color` → "Color & Contrast"
   - `cat.forms` → "Forms"
   - `cat.keyboard` → "Keyboard"
   - `cat.language` → "Language"
   - `cat.name-role-value` → "Name / Role / Value"
   - `cat.parsing` → "Parsing"
   - `cat.semantics` → "Semantics"
   - `cat.sensory-and-visual-cues` → "Sensory & Visual Cues"
   - `cat.structure` → "Structure"
   - `cat.tables` → "Tables"
   - `cat.text-alternatives` → "Text Alternatives"
   - `cat.time-and-media` → "Time & Media"

2. `cappedNodes(nodes: AxeNode[], max: number): { shown: AxeNode[]; remaining: number }` — Returns the first `max` nodes and the count of remaining nodes. Use `max = 5`.

Files:
* `src/lib/report/templates/report-template.ts` — Insert after L27 (after `escapeHtml()`)

Discrepancy references:
* Addresses research Gap Analysis priority 5 (category breakdown data extraction)

Success criteria:
* `extractCategory(['wcag143', 'cat.color'])` returns `'Color & Contrast'`
* `extractCategory(['wcag21aa'])` returns `'General'` (no cat tag)
* `cappedNodes(nodes, 5)` with 8 nodes returns `{ shown: [5 nodes], remaining: 3 }`

Context references:
* `src/lib/report/templates/report-template.ts` (Lines 21-27) — Existing `escapeHtml()` function location
* Research document (Lines 110-130) — Category mapping table

Dependencies:
* Import `AxeNode` type from `../../types/scan` if not already imported

### Step 1.2: Add category breakdown section to report-template.ts

Add a "Category Breakdown" section in the HTML output between the WCAG Principles (POUR) section (currently ends around L109) and the Impact Breakdown section (currently starts around L111).

Render a table showing violation counts per axe-core category:
- Iterate over `data.violations`, call `extractCategory(v.tags)` for each
- Aggregate counts per category
- Sort categories by count descending
- Render as a styled table with columns: Category | Violations | Percentage bar

Inline CSS styling consistent with existing template patterns (no external stylesheets).

Files:
* `src/lib/report/templates/report-template.ts` — Insert between POUR section and Impact Breakdown section

Discrepancy references:
* Addresses research Gap Analysis priority 5 (category breakdown section)
* Uses axe-core native `cat.*` tags per DD-01 (deviation from reference PDF vendor taxonomy)

Success criteria:
* Generated HTML contains a "Category Breakdown" heading
* Categories are sorted by violation count descending
* Each category row shows the count and a visual percentage bar
* Categories with zero violations are omitted

Context references:
* `src/lib/report/templates/report-template.ts` (Lines 96-111) — POUR section through Impact Breakdown start
* Research document — Discovery 3: axe-core category mapping

Dependencies:
* Step 1.1 completion (`extractCategory()` function)

### Step 1.3: Enhance violation detail section with code snippets, remediation, and help links

Replace the current violations table (starting around L125) in `generateReportHtml()` with an enhanced violation detail section. For each `AxeViolation` in `data.violations`, render:

1. **Summary header**: Impact badge (colored by severity), `v.help` title, `v.id` rule ID, element count `v.nodes.length`, principle
2. **Rule description**: `v.description` — multi-sentence explanation of the rule (escaped via `escapeHtml()`)
3. **Category**: Extracted via `extractCategory(v.tags)`
4. **Affected elements** (capped at 5 via `cappedNodes()`):
   - For each shown node:
     - CSS selector path: `node.target.join(' > ')` (escaped)
     - HTML code snippet in `<pre><code>` block: `node.html` (escaped via `escapeHtml()`)
     - Failure summary: `node.failureSummary` if present (escaped), rendered in a warning-colored paragraph
5. **Overflow text**: If `remaining > 0`, render "...and N more element(s)"
6. **Learn more link**: `<a href="${escapeHtml(v.helpUrl)}">Learn more →</a>`

Each violation renders as a card-like `<div>` with a border, padding, and margin. Use inline CSS consistent with existing template styling patterns.

Impact badge colors (matching existing template pattern):
- critical: `#dc2626` (red)
- serious: `#ea580c` (orange)
- moderate: `#ca8a04` (yellow)
- minor: `#2563eb` (blue)

Files:
* `src/lib/report/templates/report-template.ts` — Replace violation table section (around L125-130)

Discrepancy references:
* Addresses research Gap Analysis priorities 1-4 (code snippets, per-rule detail, remediation, help links)
* DR-01: Passing elements not shown (reference PDFs show successful elements too)

Success criteria:
* Each violation card contains: impact badge, rule title, rule ID, element count, description
* Code snippets rendered in `<pre><code>` blocks with `escapeHtml()` applied
* Failure summary text rendered for nodes that have it
* "Learn more" link with `helpUrl` rendered
* Maximum 5 nodes per violation with overflow text
* All rendered text is HTML-escaped

Context references:
* `src/lib/report/templates/report-template.ts` (Lines 125-130) — Current violations table
* `src/lib/types/scan.ts` — `AxeViolation` and `AxeNode` interfaces
* Research document — Example Code Snippet Enhancement section

Dependencies:
* Step 1.1 completion (helper functions)

## Implementation Phase 2: Site-Level Report Template Enhancement (US 1993)

<!-- parallelizable: false — depends on Phase 1 pattern, requires type extension -->

### Step 2.0: Extend AggregatedViolation type and site-generator aggregation

The `AggregatedViolation` interface in `src/lib/types/crawl.ts` (L68-78) currently lacks `tags` and `nodes` fields needed for category extraction and code snippet display.

1. **Type extension** — Add to `AggregatedViolation` in `src/lib/types/crawl.ts`:
   - `tags?: string[]` — axe-core tags including `cat.*` category tag
   - `nodes?: AxeNode[]` — representative affected element nodes (up to 5)

   Import `AxeNode` from `./scan` at the top of `crawl.ts`.

2. **Aggregation update** — Update `src/lib/report/site-generator.ts` aggregation logic to populate the new fields:
   - When building `AggregatedViolation` from page scan results, copy `tags` from the first occurrence of each rule
   - Collect up to 5 representative `AxeNode` objects from across pages (take first N unique nodes)

Files:
* `src/lib/types/crawl.ts` (L68-78) — Add `tags?` and `nodes?` fields to `AggregatedViolation`
* `src/lib/report/site-generator.ts` — Update aggregation to populate `tags` and `nodes`

Discrepancy references:
* Addresses DR-03 (critical): AggregatedViolation node data availability

Success criteria:
* `AggregatedViolation` type includes optional `tags` and `nodes` fields
* TypeScript compiles without errors after type change
* Site-generator populates `tags` for every aggregated violation
* Site-generator populates up to 5 representative `nodes` per violation

Context references:
* `src/lib/types/crawl.ts` (Lines 68-78) — Current `AggregatedViolation` definition
* `src/lib/types/scan.ts` — `AxeNode` type definition
* `src/lib/report/site-generator.ts` — Aggregation logic to modify

Dependencies:
* None (prerequisite for Phase 2 Steps 2.1-2.3)

### Step 2.1: Add matching helper functions to site-report-template.ts

Add the same `extractCategory()` and `cappedNodes()` helper functions to `src/lib/report/templates/site-report-template.ts`. The site template already duplicates `escapeHtml()` and `gradeColor()` from the single-page template, so this follows the established pattern.

Insert after the existing `escapeHtml()` function in `site-report-template.ts`.

Files:
* `src/lib/report/templates/site-report-template.ts` — Insert after existing `escapeHtml()` function

Discrepancy references:
* Same as Phase 1 Step 1.1

Success criteria:
* Functions are identical to those added in Phase 1
* TypeScript compiles without errors

Context references:
* `src/lib/report/templates/site-report-template.ts` (Lines 21-27) — Existing `escapeHtml()` location
* Phase 1 Step 1.1 — Function specifications

Dependencies:
* None (can be done in parallel with Phase 1)

### Step 2.2: Add category breakdown section to site-report-template.ts

Add a "Category Breakdown" section to the site-level report between the POUR section (ends around L136) and the Impact Breakdown section (starts around L138).

For site-level reports, aggregate categories across `data.aggregatedViolations` (which is `AggregatedViolation[]` from `src/lib/types/crawl.ts`). After Step 2.0, `AggregatedViolation` includes `tags?: string[]` so `extractCategory()` works when tags are populated. Handle the case where `tags` is undefined by falling back to `'General'`.

Files:
* `src/lib/report/templates/site-report-template.ts` — Insert between POUR and Impact Breakdown sections

Success criteria:
* Generated site HTML contains "Category Breakdown" heading
* Categories show aggregated violation counts across all pages

Context references:
* `src/lib/report/templates/site-report-template.ts` (Lines 123-138) — POUR through Impact Breakdown
* `src/lib/types/crawl.ts` — `AggregatedViolation` type

Dependencies:
* Step 2.1 completion

### Step 2.3: Enhance aggregated violation detail in site report template

Enhance the "Top 10 Violations" section (around L155-163) in site-report-template.ts. For each `AggregatedViolation`:

1. **Summary header**: Impact badge, rule title (`v.help`), rule ID (`v.ruleId`), total instances (`v.totalInstances`), affected page count (`v.affectedPages.length`)
2. **Rule description**: `v.description` (escaped)
3. **Category**: Via `extractCategory(v.tags ?? [])` — handle undefined tags gracefully
4. **Sample affected elements**: After Step 2.0, `AggregatedViolation.nodes` contains representative nodes. Show up to 5 using `cappedNodes()` with the same rendering as single-page template. If `v.nodes` is undefined or empty, skip the code snippet section.
5. **Failure summary**: From representative node if available
6. **Learn more link**: `v.helpUrl`

Files:
* `src/lib/report/templates/site-report-template.ts` — Enhance Top 10 Violations section (around L155-163)

Discrepancy references:
* Depends on DR-03 resolution (Step 2.0 type extension)

Success criteria:
* Each aggregated violation rendered with detail card matching single-page format
* Code snippets render when `nodes` data is populated
* Graceful fallback when `nodes` is undefined or empty — no error, no empty code blocks

Context references:
* `src/lib/report/templates/site-report-template.ts` (Lines 155-163) — Current Top 10 section
* `src/lib/types/crawl.ts` — `AggregatedViolation` interface (updated in Step 2.0)
* `src/lib/report/site-generator.ts` — Site report assembly logic (updated in Step 2.0)

Dependencies:
* Step 2.0 (type extension and aggregation update)
* Step 2.1 and 2.2 completion

## Implementation Phase 3: Single-Page Report Regression Tests (US 1994, US 1992)

<!-- parallelizable: true -->

### Step 3.1: Create report-template.test.ts with fixture helpers

Create `src/lib/report/__tests__/report-template.test.ts` with:

1. Import `generateReportHtml` from `../templates/report-template`
2. Import `assembleReportData` from `../generator`
3. Import types: `ScanResults`, `AxeViolation`, `AxeNode` from `../../types/scan`, `ScoreResult` from `../../types/score`

4. Helper factory functions:
   - `makeNode(overrides?)`: Creates a default `AxeNode` with `html`, `target`, `impact`, `failureSummary`
   - `makeViolation(overrides?)`: Creates a default `AxeViolation` with `id`, `impact`, `tags` (including a `cat.*` tag), `description`, `help`, `helpUrl`, `nodes: [makeNode()]`
   - `makePass(overrides?)`: Creates a default pass entry
   - `makeScanResults(violations, passes?, incomplete?)`: Creates `ScanResults` with URL, timestamp, engine version, score result, and provided arrays
   - `makeCleanScanResults()`: Creates results with zero violations, many passes, high score
   - `makeDirtyScanResults()`: Creates results with many violations across all impact levels, low score

Files:
* `src/lib/report/__tests__/report-template.test.ts` — NEW file

Success criteria:
* File compiles with `npx tsc --noEmit`
* Factory functions produce valid typed objects
* `assembleReportData()` accepts the synthetic results without errors

Context references:
* `src/lib/report/__tests__/generator.test.ts` — Existing test patterns for mock data
* `src/lib/types/scan.ts` — Type definitions to satisfy
* `src/lib/types/score.ts` — `ScoreResult` shape

Dependencies:
* Phase 1 completion (tests validate enhanced template output)

### Step 3.2: Add structural validation tests for all report sections

Add `describe('generateReportHtml')` block with tests validating the presence of all major sections in the generated HTML:

1. `it('contains Executive Summary section')` — assert `toContain('Executive Summary')`
2. `it('contains WCAG Principles (POUR) section')` — assert `toContain('WCAG Principles')`
3. `it('contains Category Breakdown section')` — assert `toContain('Category Breakdown')` (new section)
4. `it('contains Impact Breakdown section')` — assert `toContain('Impact Breakdown')`
5. `it('contains violation details with code snippets')` — generate with a violation, assert HTML contains escaped code snippet text, CSS selector text, and `<pre>` or `<code>` tags
6. `it('contains failure summary text')` — assert `toContain('Fix the following')` or similar text from the fixture node's `failureSummary`
7. `it('contains help URL link')` — assert `toContain('Learn more')` and `toContain('dequeuniversity.com')`
8. `it('contains AODA Compliance Note')` — assert `toContain('AODA')`
9. `it('contains Disclaimer')` — assert `toContain('Disclaimer')` or `toContain('disclaimer')`
10. `it('escapes HTML in code snippets')` — create a violation node with `html: '<script>alert("xss")</script>'`, assert output contains `&lt;script&gt;` not `<script>alert`

Files:
* `src/lib/report/__tests__/report-template.test.ts` — Add to existing describe block

Success criteria:
* All 10 tests pass
* Tests validate presence of new enhanced sections (category, code snippets, remediation, help links)

Context references:
* Phase 1 Steps 1.2-1.3 — Section names and content to validate

Dependencies:
* Step 3.1 completion (fixture helpers)
* Phase 1 completion (enhanced template must be in place for tests to pass)

### Step 3.3: Add scenario-based tests

Add `describe('report scenarios')` block with scenario-based tests:

1. `it('clean site shows compliant badge and no violations message')` — use `makeCleanScanResults()`, assert HTML contains "Compliant" or "AODA Compliant" and does not contain violation detail cards
2. `it('dirty site shows remediation badge and violation details')` — use `makeDirtyScanResults()`, assert HTML contains "Needs Remediation" and contains violation detail cards with code snippets
3. `it('mixed severity renders all impact levels')` — create fixture with one violation per impact level (critical, serious, moderate, minor), assert all four impact labels appear
4. `it('large violation set renders without error')` — create fixture with 50+ violations, call `generateReportHtml()`, assert it does not throw and output length is reasonable
5. `it('caps nodes at 5 per violation with overflow text')` — create violation with 10 nodes, assert HTML contains exactly 5 code snippet blocks and "and 5 more element(s)" text
6. `it('category breakdown reflects violation categories')` — create violations with different `cat.*` tags, assert HTML contains the category labels
7. `it('handles violations with no failureSummary gracefully')` — create node without `failureSummary`, assert no error and no "Fix the following" text for that node

Files:
* `src/lib/report/__tests__/report-template.test.ts` — Add scenario describe block

Success criteria:
* All 7 scenario tests pass
* Tests cover edge cases (empty violations, large sets, missing optional fields)

Context references:
* Research document — Test scenarios section
* `src/lib/scoring/calculator.ts` — Grade thresholds for score fixtures

Dependencies:
* Step 3.1 and 3.2 completion

### Step 3.4: Add optional PDF smoke test

Add an optional test verifying PDF generation works with the enhanced template:

1. `it('generates valid PDF buffer from enhanced report HTML')` — generate HTML with a fixture containing violations with code snippets, pass to `generatePdf()`, assert:
   - Buffer length > 0
   - Buffer starts with `%PDF-` magic bytes (verify first 5 bytes)

This test requires Puppeteer to be available. Use `it.skipIf(!process.env.CI)` or a similar guard if Puppeteer is not installed locally. Alternatively, follow the existing mocked Puppeteer pattern from `pdf-generator.test.ts`.

Files:
* `src/lib/report/__tests__/report-template.test.ts` — Add optional PDF smoke test

Discrepancy references:
* Addresses DR-05 (minor): PDF smoke test coverage

Success criteria:
* Test passes when Puppeteer is available (CI environment)
* Test skips gracefully when Puppeteer is unavailable

Context references:
* `src/lib/report/__tests__/pdf-generator.test.ts` — Existing mocked Puppeteer pattern
* `src/lib/report/pdf-generator.ts` — `generatePdf()` function

Dependencies:
* Step 3.1 completion (fixture helpers)
* Phase 1 completion (enhanced template)

## Implementation Phase 4: Site-Level Report Regression Tests (US 1994, US 1992)

<!-- parallelizable: true -->

### Step 4.1: Create site-report-template.test.ts with fixtures

Create `src/lib/report/__tests__/site-report-template.test.ts` with:

1. Import `generateSiteReportHtml` from `../templates/site-report-template`
2. Import types from `../../types/crawl`: `SiteReportData`, `AggregatedViolation`, `PageSummary`

3. Factory functions:
   - `makeAggregatedViolation(overrides?)`: Creates default `AggregatedViolation` with `id`, `impact`, `tags`, `description`, `help`, `helpUrl`, `count`, `pages`, `nodes` (if type supports it)
   - `makePageSummary(overrides?)`: Creates default `PageSummary` with `url`, `score`, `grade`, `violationCount`
   - `makeSiteReportData(overrides?)`: Creates default `SiteReportData` with URL, scan date, score, violations, page summaries

Files:
* `src/lib/report/__tests__/site-report-template.test.ts` — NEW file

Success criteria:
* File compiles with `npx tsc --noEmit`
* Factory functions produce valid typed objects

Context references:
* `src/lib/types/crawl.ts` — `SiteReportData`, `AggregatedViolation`, `PageSummary` types
* Phase 3 Step 3.1 — Pattern to follow for factory functions

Dependencies:
* Phase 2 completion (site template enhancements must be in place)

### Step 4.2: Add structural validation and scenario tests for site-level report

Add tests in a `describe('generateSiteReportHtml')` block:

Structural tests:
1. `it('contains Executive Summary with site-level stats')` — pages scanned, unique violations, total instances
2. `it('contains WCAG Principles (POUR) section')`
3. `it('contains Category Breakdown section')` — new section
4. `it('contains Impact Breakdown section')`
5. `it('contains enhanced Top Violations section')` — code snippets if node data available
6. `it('contains Per-Page Scores table')`
7. `it('contains AODA note and Disclaimer')`

Scenario tests:
8. `it('clean site scenario shows compliant status')`
9. `it('dirty site scenario shows violations and code snippets')`
10. `it('handles missing node data in aggregated violations gracefully')`

Files:
* `src/lib/report/__tests__/site-report-template.test.ts` — Add test blocks

Success criteria:
* All 10 tests pass
* Site-level specific sections validated (per-page scores, aggregated violations)

Context references:
* `src/lib/report/templates/site-report-template.ts` — Section names to validate
* Phase 2 — Enhanced sections

Dependencies:
* Step 4.1 completion

## Implementation Phase 5: Validation

<!-- parallelizable: false -->

### Step 5.1: Run full project validation

Execute all validation commands for the project:
* `npm run lint` — ESLint across all source files
* `npx tsc --noEmit` — TypeScript type checking
* `npm run test:ci` — Vitest with coverage (includes all new and existing tests)
* `npm run build` — Next.js production build

### Step 5.2: Fix minor validation issues

Iterate on lint errors, build warnings, and test failures. Apply fixes directly when corrections are straightforward and isolated.

### Step 5.3: Report blocking issues

When validation failures require changes beyond minor fixes:
* Document the issues and affected files.
* Provide the user with next steps.
* Recommend additional research and planning rather than inline fixes.
* Avoid large-scale refactoring within this phase.

## Dependencies

* TypeScript, Vitest, Next.js (all already configured in project)

## Success Criteria

* All new and existing tests pass via `npm run test:ci`
* Coverage thresholds maintained (80% statement/function/line, 65% branch)
* `npm run build` succeeds
* `npm run lint` passes
