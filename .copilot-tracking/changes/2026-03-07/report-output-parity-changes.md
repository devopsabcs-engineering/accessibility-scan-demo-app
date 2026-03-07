<!-- markdownlint-disable-file -->
# Release Changes: Report Output Parity with Reference PDFs

**Related Plan**: report-output-parity-plan.instructions.md
**Implementation Date**: 2026-03-07

## Summary

Enhance accessibility scanner report templates to include per-violation code snippets, remediation guidance, help links, and category breakdowns matching reference PDF structure, then add fixture-based regression tests.

## Changes

### Added

* `src/lib/report/__tests__/report-template.test.ts` — 19 regression tests for single-page report template: 10 structural validation, 7 scenario-based, 2 PDF smoke tests
* `src/lib/report/__tests__/site-report-template.test.ts` — 10 regression tests for site-level report template: 7 structural validation, 3 scenario-based including graceful handling of undefined nodes/tags

### Modified

* `src/lib/report/templates/report-template.ts` — Added `extractCategory()` and `cappedNodes()` helper functions, Category Breakdown section between POUR and Impact Breakdown, enhanced violation detail cards with code snippets, remediation, failure summary, and help links replacing old violations table
* `src/lib/types/crawl.ts` — Added `AxeNode` import and optional `tags` and `nodes` fields to `AggregatedViolation` interface
* `src/lib/scoring/site-calculator.ts` — Updated `aggregateViolations()` to populate `tags` from first occurrence and collect up to 5 representative `nodes` per rule
* `src/lib/report/templates/site-report-template.ts` — Added `categoryLabels`, `extractCategory()`, `cappedNodes()` helpers; Category Breakdown section; replaced Top 10 violations table with card-based detail layout with code snippets and help links

### Removed

## Additional or Deviating Changes

* Fixed unused `CrawlConfig` import in `src/lib/report/__tests__/site-report-template.test.ts` during Phase 5 validation
  * Lint reported unused import; removed to pass lint cleanly

## Release Summary

6 files affected: 2 created, 4 modified, 0 removed.

**Created:**
* `src/lib/report/__tests__/report-template.test.ts` — 19 regression tests for single-page report (structural, scenario, PDF smoke)
* `src/lib/report/__tests__/site-report-template.test.ts` — 10 regression tests for site-level report (structural, scenario, graceful undefined handling)

**Modified:**
* `src/lib/report/templates/report-template.ts` — Added category helpers, Category Breakdown section, enhanced violation detail cards with code snippets/remediation/help links
* `src/lib/report/templates/site-report-template.ts` — Matching site-level enhancements: category helpers, Category Breakdown section, enhanced Top Violations cards
* `src/lib/types/crawl.ts` — Added `tags?` and `nodes?` to `AggregatedViolation`; imported `AxeNode` type
* `src/lib/scoring/site-calculator.ts` — `aggregateViolations()` populates `tags` and up to 5 representative `nodes` per rule

**Validation:** All 281 tests pass (23 files). Lint clean (0 errors). Build succeeds. Coverage thresholds maintained (86.58% statements, 68.97% branches, 88.88% functions, 88.23% lines).

**No changes to CI configuration** — new tests are automatically discovered by existing vitest glob patterns.
