<!-- markdownlint-disable-file -->
# Axe-Core Rule Mapping and Regression Test Strategy Research

## Status: Complete

## Research Topics

1. What data axe-core provides per violation node (html, failureSummary, target, any/all/none checks)
2. How axe-core categories/tags work and whether they map to the reference PDF categories
3. Whether axe-core distinguishes best-practice rules from WCAG rules
4. Recommended regression test approach with rationale
5. Risks and challenges

## Task 1: Axe-Core Data Available Per Violation Node

### AxeResults Top-Level Structure (from axe-core TypeScript definitions)

The `axe.run()` function returns an `AxeResults` object with four result arrays:

| Array | Description |
|-------|-------------|
| `violations` | Elements that failed rules |
| `passes` | Elements that passed rules |
| `incomplete` | Elements that need manual review (aborted checks, JS errors) |
| `inapplicable` | Rules that found no matching elements |

Each entry in these arrays is a `Result` object with:

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique rule identifier (e.g., `color-contrast`, `image-alt`) |
| `description` | `string` | What the rule does |
| `help` | `string` | Short help text describing the test |
| `helpUrl` | `string` | URL to Deque University help page (remediation guidance) |
| `impact` | `ImpactValue` | `minor`, `moderate`, `serious`, `critical`, or `null` |
| `tags` | `string[]` | All tags for this rule (WCAG SC, level, category, etc.) |
| `nodes` | `NodeResult[]` | All elements the rule tested |

### NodeResult Fields (Per-Element Data)

Each `NodeResult` in the `nodes` array contains:

| Field | Type | Description | Currently Used |
|-------|------|-------------|----------------|
| `html` | `string` | **HTML snippet of the affected element** — actual rendered HTML, truncated if long | YES — stored in `AxeNode.html` but **not rendered in report templates** |
| `impact` | `ImpactValue` | Impact severity for this specific node | YES — stored in `AxeNode.impact` |
| `target` | `string[]` | CSS selector path to the element (including iframe/shadow DOM paths) | YES — stored in `AxeNode.target` |
| `failureSummary` | `string` | **Remediation guidance text** — describes what checks failed and how to fix them | YES — stored in `AxeNode.failureSummary` but **not rendered in report templates** |
| `any` | `CheckResult[]` | Checks where at least one must pass — each has `id`, `impact`, `message`, `data`, `relatedNodes` | NOT captured in project types |
| `all` | `CheckResult[]` | Checks where all must pass | NOT captured in project types |
| `none` | `CheckResult[]` | Checks where none must pass | NOT captured in project types |
| `xpath` | `string[]` | XPath selector (if `xpath: true` in run options) | NOT captured |
| `ancestry` | `string[]` | Ancestry selector chain | NOT captured |
| `element` | `HTMLElement` | DOM reference (only in browser context) | NOT applicable |

### CheckResult Fields (Sub-Check Detail)

Each check in `any`, `all`, `none` contains:

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Check identifier |
| `impact` | `string` | Impact of this specific check |
| `message` | `string` | Human-readable pass/fail message — **the most detailed remediation text** |
| `data` | `any` | Check-specific data (e.g., foreground/background colors for contrast checks) |
| `relatedNodes` | `RelatedNode[]` | Other nodes related to this check (e.g., duplicate IDs) |

### What `AxeNode.html` Contains

The `html` field contains the **actual rendered HTML snippet** of the element that triggered the rule. Examples from test fixtures and axe-core documentation:

```html
<p style="color:#ccc">Low contrast</p>
<div aria-label="nav">content</div>
<h3>Skipped</h3>
<span style="color:#fff">text</span>
```

These are meaningful code snippets — the exact HTML of the DOM element. For elements with long inner content, the HTML is truncated with `...`. This is **exactly the "Code snapshots of failed elements"** feature seen in the reference PDFs.

### What `AxeNode.failureSummary` Contains

The `failureSummary` field provides **human-readable remediation guidance**. Examples from test fixtures:

- `"Fix the following: Element has insufficient color contrast"`
- `"Review heading order"`

The format is typically: `"Fix the following:\n  {check message 1}\n  {check message 2}"` — a concatenation of the failed check messages from the `any`/`all`/`none` arrays.

### Current Project Usage vs Available Data

| Data Field | In Project Types | Rendered in Reports | Action Needed |
|------------|-----------------|---------------------|---------------|
| `html` | `AxeNode.html` ✅ | ❌ Not rendered | Add to violation details in templates |
| `failureSummary` | `AxeNode.failureSummary` ✅ | ❌ Not rendered | Add as remediation text |
| `target` | `AxeNode.target` ✅ | ❌ Not rendered | Add for element identification |
| `impact` | `AxeNode.impact` ✅ | ❌ Per-node (only rule-level shown) | Consider per-node display |
| `any/all/none` checks | ❌ Not captured | ❌ | Optional — `failureSummary` covers this |
| `helpUrl` | `AxeViolation.helpUrl` ✅ | ❌ Not rendered | Add as "Learn more" link |
| `description` | `AxeViolation.description` ✅ | ❌ Not rendered (only `help` shown) | Add for rule explanation |

**Key Finding**: The project already captures `html` and `failureSummary` in its type system but does not render them in the HTML report templates. No type changes are needed — only template changes to display the data.

## Task 2: Axe-Core Categories and Tags

### Tag Taxonomy

Axe-core 4.10 has **145 unique tags** across **104 rules**. Tags are organized in these groups:

| Tag Pattern | Purpose | Example |
|-------------|---------|---------|
| `wcag2a`, `wcag2aa`, `wcag2aaa` | WCAG 2.0 conformance level | `wcag2a` = Level A |
| `wcag21a`, `wcag21aa` | WCAG 2.1 conformance level | `wcag21aa` = 2.1 Level AA |
| `wcag22aa` | WCAG 2.2 conformance level | Added in axe-core 4.6+ |
| `wcag{NNN}` | WCAG success criterion reference | `wcag111` = SC 1.1.1 |
| `best-practice` | Non-WCAG recommended practices | Not required for conformance |
| `cat.*` | **Deque category taxonomy** | `cat.forms`, `cat.tables` |
| `section508`, `section508.*` | Old Section 508 rules | US federal requirement |
| `EN-301-549`, `EN-9.*` | European standard | EN 301 549 |
| `RGAAv4`, `RGAA-*` | French accessibility standard | RGAA |
| `TTv5`, `TT*` | Trusted Tester v5 | US testing protocol |
| `ACT` | W3C ACT rules mapping | Accessibility Conformance Testing |
| `experimental` | Experimental rules (disabled by default) | Cutting-edge checks |
| `deprecated` | Deprecated rules | To be removed |

### Axe-Core Category Tags (`cat.*`)

Every axe-core rule has exactly one `cat.*` tag. There are **13 categories**:

| Category Tag | Rule Count | Description |
|-------------|------------|-------------|
| `cat.aria` | 24 | ARIA attribute and role usage |
| `cat.color` | 3 | Color contrast |
| `cat.forms` | 5 | Form controls and labels |
| `cat.keyboard` | 9 | Keyboard accessibility |
| `cat.language` | 4 | Page language attributes |
| `cat.name-role-value` | 7 | Element naming and ARIA roles |
| `cat.parsing` | 4 | HTML parsing and duplicate IDs |
| `cat.semantics` | 14 | Landmarks and heading structure |
| `cat.sensory-and-visual-cues` | 3 | Viewport and target size |
| `cat.structure` | 8 | Lists, definition lists, inline styles |
| `cat.tables` | 6 | Table headers and structure |
| `cat.text-alternatives` | 12 | Images, alt text, video captions |
| `cat.time-and-media` | 5 | Audio, video, blinking, auto-refresh |

### Best-Practice vs WCAG Rules

Axe-core clearly distinguishes between WCAG and best-practice rules:

- **74 rules** have at least one `wcag{NNN}` success criterion tag (WCAG rules)
- **30 rules** have only `best-practice` tag and no `wcag{NNN}` tag (pure best practices)
- **Total**: 104 rules

The project currently filters to WCAG rules only in `engine.ts`:

```typescript
runOnly: {
  type: 'tag',
  values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'],
}
```

This means **best-practice rules are not currently scanned**. The `wcag-mapper.ts` handles this gracefully — if no `wcag{NNN}` tag is found, it returns `'best-practice'`.

### Mapping to Reference PDF Categories

The reference PDFs use these **11 categories**:

| Reference PDF Category | Closest Axe-Core `cat.*` Tag(s) |
|------------------------|---------------------------------|
| Interactive Content | `cat.keyboard` + `cat.name-role-value` |
| General | `cat.semantics` + `cat.structure` + `cat.parsing` |
| Landmarks | `cat.semantics` (landmark-* rules) |
| Graphics | `cat.text-alternatives` (image rules) |
| ARIA | `cat.aria` |
| Forms | `cat.forms` |
| Dragging Alternative | `cat.sensory-and-visual-cues` (partial) |
| Lists | `cat.structure` (list/listitem rules) |
| Metadata | `cat.language` + page-level rules |
| Tabs | `cat.aria` (tab-related rules) |
| Tables | `cat.tables` |

**Key Finding**: The reference PDF categories are a **different vendor's custom taxonomy** (not axe-core or WCAG). The axe-core `cat.*` tags provide a **reasonable but imperfect mapping**. They don't map 1:1, but the axe-core categories are actually more granular and standards-aligned.

### Recommendation for Category Mapping

Use axe-core's native `cat.*` tags rather than trying to replicate the reference PDF's custom taxonomy. Rationale:

1. Axe-core categories are **stable, maintained by Deque**, and documented
2. Every rule has exactly one category tag — no ambiguity
3. The project can add a `category` field to `AxeViolation` by extracting from `tags`
4. Labels can be human-friendly: `cat.forms` → "Forms", `cat.tables` → "Tables", etc.

### Current WCAG-to-POUR Mapping

The `wcag-mapper.ts` maps WCAG success criteria to POUR principles based on the first digit:

| First Digit | POUR Principle | WCAG SC Range |
|-------------|----------------|---------------|
| 1 | Perceivable | 1.x.x |
| 2 | Operable | 2.x.x |
| 3 | Understandable | 3.x.x |
| 4 | Robust | 4.x.x |
| (none) | Best Practice | No `wcag{NNN}` tag |

This mapping is correct and well-implemented. It could be **extended** to also extract the `cat.*` tag for a category dimension alongside the principle dimension.

## Task 3: Regression Test Strategy

### Current Test Infrastructure

**Test Framework**: Vitest (configured in `vitest.config.ts`)

- Environment: `node`
- Pattern: `src/**/__tests__/**/*.test.ts`
- Timeout: 10,000ms
- Coverage: v8 provider, 80% statement/function/line thresholds, 65% branch
- CI: Runs via `npm run test:ci` in GitHub Actions

**Existing Test Files**:

| File | Tests | Pattern |
|------|-------|---------|
| `report/__tests__/generator.test.ts` | 5 tests | Unit: synthetic `AxeViolation` data, tests data assembly |
| `report/__tests__/pdf-generator.test.ts` | 8 tests | Unit: mocked Puppeteer, tests PDF pipeline |
| `report/__tests__/sarif-generator.test.ts` | 8 tests | Unit: synthetic violations, validates SARIF structure |
| `report/__tests__/site-generator.test.ts` | ~8 tests | Unit: mocked dependencies, tests site report assembly |
| `scanner/__tests__/engine.test.ts` | ~10 tests | Unit: mocked Playwright, tests scan pipeline |
| `scanner/__tests__/result-parser.test.ts` | ~10 tests | Unit: synthetic `AxeResults`, validates parsing |
| `scanner/__tests__/store.test.ts` | Tests | Unit: in-memory store |
| `scoring/__tests__/calculator.test.ts` | Tests | Unit: score calculation |
| `scoring/__tests__/wcag-mapper.test.ts` | Tests | Unit: tag-to-principle mapping |
| `cli/__tests__/scan.test.ts` | Tests | Unit: mocked engine + formatters |
| `cli/__tests__/crawl.test.ts` | Tests | Unit: mocked crawler |
| `cli/__tests__/loader.test.ts` | Tests | Unit: config loading |

**Current CI Workflow** (`.github/workflows/ci.yml`):

```yaml
- name: Lint
  run: npm run lint
- name: Test with coverage
  run: npm run test:ci
- name: Build
  run: npm run build
```

No integration tests, regression tests, or live URL tests exist.

### Approaches Evaluated

#### Approach 1: Live URL Integration Tests

**How**: Scan real URLs (ontario.ca, codepen.io), generate reports, validate output.

**Pros**: Tests the complete pipeline end-to-end, catches real-world regressions.

**Cons**:

- **Flaky**: External sites change content, causing nondeterministic results.
- **Slow**: Navigation + scanning takes 10-30s per URL.
- **CI reliability**: Network issues, rate limiting, site downtime.
- **Nondeterministic**: Violation counts change when sites update.

**Verdict**: ❌ Not recommended as primary strategy. Could be used as optional smoke tests.

#### Approach 2: Snapshot Testing with Recorded Data

**How**: Record real axe results once, save as JSON fixtures, test templates against those.

**Pros**: Deterministic, fast, no network dependency.

**Cons**: Snapshot maintenance when templates change. Snapshots can become stale.

**Verdict**: ⚠️ Partial — good for detecting unintended template changes, but brittle.

#### Approach 3: Fixture-Based Structural Validation (Recommended)

**How**: Create synthetic `ScanResults` / `AxeViolation` fixtures that represent known scenarios, then validate:

1. **HTML template output** — Parse generated HTML, verify structural elements exist.
2. **Data correctness** — Verify violations are sorted, scores calculated correctly.
3. **Content completeness** — Check that all sections from reference PDFs are present.
4. **PDF smoke test** — Generate actual PDF buffer, verify it's valid (magic bytes, length).

**Pros**:

- **Deterministic**: Synthetic data never changes.
- **Fast**: No network calls, runs in milliseconds.
- **Comprehensive**: Can test edge cases (0 violations, 100 violations, all impact levels).
- **Maintainable**: Fixtures are small, self-documenting TypeScript objects.

**Cons**: Doesn't catch issues specific to real-world sites.

**Verdict**: ✅ Recommended as primary strategy.

#### Approach 4: HTML Parsing for Structural Validation

**How**: Use a lightweight HTML parser (like `cheerio` or regex) to validate template output.

Options:

1. **Regex-based**: `/<h2>Executive Summary<\/h2>/` — Simple but fragile.
2. **DOM-based with `linkedom` or `happy-dom`**: Full DOM parsing, query with selectors.
3. **String assertion**: `expect(html).toContain('<h2>Executive Summary</h2>')` — Simple, sufficient for structure.

**Verdict**: String `toContain()` assertions for section headings + specific content patterns are the best balance of simplicity and reliability. Full DOM parsing is overkill.

### Recommended Test Strategy

#### Test Category 1: Report Template Structural Tests

**File**: `src/lib/report/__tests__/report-template.test.ts` (NEW)

Test the `generateReportHtml()` function with synthetic data:

```typescript
// Create rich fixture with violations, passes, incomplete
const fixture = makeRichScanResults();
const reportData = assembleReportData(fixture);
const html = generateReportHtml(reportData);

// Structural assertions
expect(html).toContain('<h2>Executive Summary</h2>');
expect(html).toContain('<h2>WCAG Principles (POUR)</h2>');
expect(html).toContain('<h2>Impact Breakdown</h2>');
expect(html).toContain('<h2>Detailed Violations');
expect(html).toContain('<h2>AODA Compliance Note</h2>');
expect(html).toContain('<h2>Disclaimer</h2>');
expect(html).toContain('example.com');

// Content assertions
expect(html).toContain('Grade B'); // from fixture data
expect(html).toContain('Needs Remediation'); // non-compliant
```

When code snippets are added:

```typescript
// Code snippet assertions (after template enhancement)
expect(html).toContain('&lt;img'); // escaped HTML snippet
expect(html).toContain('Fix the following'); // failureSummary text
```

#### Test Category 2: Fixture-Based Scenario Tests

**File**: `src/lib/report/__tests__/report-scenarios.test.ts` (NEW)

Test multiple scenarios with different fixture data:

| Scenario | Fixture | Assertions |
|----------|---------|------------|
| Clean site (0 violations) | Empty violations, many passes | "AODA Compliant", Grade A, "No violations found" |
| Minor issues only | 2 minor violations | Grade A/B, violation table with 2 rows |
| Critical violations | 5 critical, 3 serious | Grade D/F, "Needs Remediation", all shown |
| Mixed severity | 1 of each impact level | All 4 impact badges, sorted critical-first |
| Code snippets present | Violations with `html` and `failureSummary` | HTML snippets rendered (escaped), remediation text |
| Large violation set | 50+ violations | Template handles volume without errors |
| Empty page (no rules matched) | Empty everything | Still generates valid HTML |

#### Test Category 3: PDF Smoke Tests

**File**: `src/lib/report/__tests__/pdf-smoke.test.ts` (NEW or extend `pdf-generator.test.ts`)

```typescript
// Using real Puppeteer (not mocked) — slower but validates actual PDF generation
it('generates a valid PDF buffer from report HTML', async () => {
  const html = generateReportHtml(makeReportData());
  const buffer = await generatePdf(html);
  
  // Check buffer is non-empty
  expect(buffer.length).toBeGreaterThan(1000);
  
  // Check PDF magic bytes (%PDF-1.)
  expect(buffer.slice(0, 5).toString()).toBe('%PDF-');
});
```

**Note**: These tests require Puppeteer/Chromium installed. They should be:

- Marked with a tag or separate test file for conditional CI execution.
- Skipped if Chromium is not available.
- Could use the existing mocked Puppeteer tests as-is for unit tests, with an optional real-Puppeteer test.

#### Test Category 4: SARIF Output Validation

Already well-covered by `sarif-generator.test.ts`. No additional tests needed.

#### Test Category 5: Site Report Template Tests

**File**: `src/lib/report/__tests__/site-report-template.test.ts` (NEW)

Same approach as single-page template tests but for `generateSiteReportHtml()`.

### CI Integration Plan

The existing CI workflow runs `npm run test:ci` which executes all vitest tests. New fixture-based tests will be picked up automatically since they follow the `src/**/__tests__/**/*.test.ts` pattern.

For PDF smoke tests that need real Chromium:

- Ubuntu CI runners have Chromium available (Puppeteer downloads it via `npm ci`).
- The existing `pdf-generator.test.ts` already mocks Puppeteer, so this pattern works.
- A separate "integration" tag could mark tests that need real Chromium.

**No changes to `.github/workflows/ci.yml` are needed** for fixture-based tests. PDF smoke tests with real Puppeteer may need a separate CI step or conditional skip.

## Key Discoveries

### Discovery 1: Data Already Captured but Not Displayed

The project's type system already captures `html` and `failureSummary` on `AxeNode`, and `helpUrl`/`description` on `AxeViolation`. The gap is purely in the templates — no type or parser changes needed to add code snippets and remediation guidance to reports.

### Discovery 2: Axe-Core Categories Map Reasonably to Reference PDF Categories

The 13 `cat.*` tags provide a built-in category taxonomy that's more granular than the reference PDFs' 11 categories. Using axe-core's native categories is better than reverse-engineering the reference PDFs' custom taxonomy.

### Discovery 3: Best Practices Are Currently Excluded from Scans

The `engine.ts` `runOnly` configuration only runs WCAG level tags. Best-practice rules (30 rules) are excluded. To match the reference PDFs' "WCAG Best Practices" section, `best-practice` would need to be added to the `runOnly` values.

### Discovery 4: CheckResult Messages Provide Rich Remediation Data

The `any`/`all`/`none` CheckResult arrays contain detailed `message` fields that explain exactly what passed or failed. The `failureSummary` field concatenates these into a single string. For most use cases, `failureSummary` is sufficient, but accessing individual check messages could provide even richer remediation guidance.

### Discovery 5: helpUrl Points to Deque University

Every rule's `helpUrl` points to a Deque University page with detailed remediation guidance, examples, and WCAG references. This is already captured in `AxeViolation.helpUrl` and could be rendered as "Learn more" links in the report.

### Discovery 6: Per-Rule Success/Failure Counting Matches Reference PDF Pattern

The reference PDFs show per-rule: `Relevant: Yes/No`, `Successes: N`, `Failures: N`, `Score: N`. Axe-core's `passes` and `violations` arrays provide exactly this data — each rule appears in either `passes` or `violations` (or both if some elements pass and others fail for the same rule). The `nodes.length` gives the count.

### Discovery 7: Existing Test Pattern Is Well-Established

All existing tests use the same pattern:

1. Create synthetic mock data matching axe-core or project type structures
2. Pass through the function under test
3. Assert on output properties

New regression tests should follow this exact pattern. No new test infrastructure needed.

## Risks and Challenges

### Risk 1: Template Changes May Break Existing Snapshot Tests

If snapshot-based assertions are used (`toMatchSnapshot()`), any template change triggers a cascading test update. **Mitigation**: Use structural assertions (`toContain()`) instead of snapshots.

### Risk 2: PDF Smoke Tests Add CI Time

Real Puppeteer PDF generation takes 2-5 seconds per test. **Mitigation**: Keep smoke tests minimal (1-2 tests), mark as slow, or run only on main branch.

### Risk 3: Category Mapping Is Approximate

Axe-core's `cat.*` tags don't map 1:1 to the reference PDFs' categories. **Mitigation**: Use axe-core's native categories with clear documentation that they differ from the reference PDFs.

### Risk 4: Best-Practice Rule Addition Changes Scan Results

Adding `best-practice` to `runOnly` values in `engine.ts` would change violation counts for all existing reports. **Mitigation**: Add best practices as a separate section (non-scored), matching the reference PDF pattern.

### Risk 5: Large Reports May Cause PDF Generation Issues

Templates with code snippets for 100+ violations will produce very large HTML. **Mitigation**: Limit code snippet display (e.g., first 5 nodes per rule, with "and N more" text).

## Discovered Research Topics (Completed During This Session)

- ✅ Full axe-core NodeResult data model documented
- ✅ Category tag taxonomy enumerated (13 categories, 104 rules)
- ✅ Best-practice vs WCAG rule distinction verified (30 vs 74 rules)
- ✅ Reference PDF category mapping analyzed
- ✅ Existing test patterns documented
- ✅ CI workflow integration plan assessed

## Clarifying Questions

1. **Best-practice rules**: Should the scan engine be updated to include `best-practice` in `runOnly` tags? The reference PDFs include these as a separate non-scored section.
2. **Code snippet limit**: Should there be a cap on code snippets per violation (e.g., max 5 or 10 nodes)? The reference PDFs show up to 10.
3. **Category vs POUR display**: Should the category breakdown replace POUR display, supplement it, or be an additional section?
4. **Template format**: Should code snippets be rendered in `<pre><code>` blocks with monospace font, or in styled cards like the reference PDFs?
