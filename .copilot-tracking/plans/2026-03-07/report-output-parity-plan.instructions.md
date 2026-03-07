---
applyTo: '.copilot-tracking/changes/2026-03-07/report-output-parity-changes.md'
---
<!-- markdownlint-disable-file -->
# Implementation Plan: Report Output Parity with Reference PDFs (Epic 1975)

## Overview

Enhance the accessibility scanner report templates to include per-violation code snippets, remediation guidance, help links, and category breakdowns matching reference PDF structure, then add fixture-based regression tests automatically picked up by CI.

## Objectives

### User Requirements

* Generated reports must contain per-violation HTML code snippets of affected elements — Source: Epic 1975 success criteria
* Generated reports must render failure summaries and remediation guidance per violation — Source: Epic 1975 success criteria
* Generated reports must include "Learn more" links (Deque University) per violation — Source: Epic 1975 success criteria
* Generated reports must include a category breakdown section using axe-core `cat.*` tags — Source: Epic 1975 success criteria
* Automated regression tests must validate report structure, score ranges, and violation counts — Source: US 1992, US 1994
* Tests must integrate into GitHub Actions CI with no changes to `ci.yml` — Source: US 1995
* Both single-page and site-level PDF report templates must be enhanced — Source: US 1991, US 1993

### Derived Objectives

* Cap displayed nodes at 5 per violation with overflow text to manage PDF size — Derived from: reference PDFs show up to 10 but axe-core can return 100+ nodes; 5 is a practical middle ground
* Retain existing project enhancements (score circle, letter grade, POUR breakdown, AODA note) — Derived from: these features add value beyond reference PDFs and are not present in the reference PDFs
* Use `escapeHtml()` for all user-facing data rendered in templates — Derived from: existing security pattern in `report-template.ts` L21-27
* Apply matching enhancements to `site-report-template.ts` for site-level reports — Derived from: both templates serve the same report pipeline

## Context Summary

### Project Files

* `src/lib/report/templates/report-template.ts` (138 lines) — Single-page report template; `generateReportHtml()` at L29
* `src/lib/report/templates/site-report-template.ts` (200 lines) — Site-level report template; `generateSiteReportHtml()` at L29
* `src/lib/report/generator.ts` (30 lines) — `assembleReportData()` at L4; passes all `AxeViolation` fields including `tags`, `description`, `helpUrl`, full `nodes`
* `src/lib/types/scan.ts` — `AxeViolation` interface with `tags`, `description`, `helpUrl`, `nodes`; `AxeNode` interface with `html`, `target`, `failureSummary`
* `src/lib/types/report.ts` — `ReportData` interface with `violations`, `passes`, `incomplete`

### References

* `.copilot-tracking/research/2026-03-07/report-output-parity-research.md` — Primary research document with full gap analysis and technical scenarios
* `.copilot-tracking/research/subagents/2026-03-07/source-file-verification-research.md` — Source file line number verification
* `.copilot-tracking/research/subagents/2026-03-07/reference-pdf-analysis-research.md` — Reference PDF text extraction analysis
* `.copilot-tracking/research/subagents/2026-03-07/axe-rules-and-test-strategy-research.md` — Axe-core rule taxonomy and test strategy

### Standards References

* #file:../../.github/instructions/ado-workflow.instructions.md — ADO work item linking and branching conventions

## Implementation Checklist

### [ ] Implementation Phase 1: Single-Page Report Template Enhancement (US 1991, US 1993)

<!-- parallelizable: true -->

* [ ] Step 1.1: Add helper functions `extractCategory()` and `cappedNodes()` to `report-template.ts`
  * Details: .copilot-tracking/details/2026-03-07/report-output-parity-details.md (Lines 14-46)
* [ ] Step 1.2: Add category breakdown section after POUR section in `report-template.ts`
  * Details: .copilot-tracking/details/2026-03-07/report-output-parity-details.md (Lines 48-73)
* [ ] Step 1.3: Enhance violation detail section with code snippets, remediation, and help links
  * Details: .copilot-tracking/details/2026-03-07/report-output-parity-details.md (Lines 75-119)
* [ ] Step 1.4: Validate phase changes
  * Run `npx tsc --noEmit` for type checking on modified template
  * Run `npm run lint` for linting

### [ ] Implementation Phase 2: Site-Level Report Template Enhancement (US 1993)

<!-- parallelizable: false — depends on Phase 1 pattern, and requires type extension -->

* [ ] Step 2.0: Extend `AggregatedViolation` type and site-generator aggregation
  * Details: .copilot-tracking/details/2026-03-07/report-output-parity-details.md (Lines 123-152)
  * Add `tags?: string[]` and `nodes?: AxeNode[]` to `AggregatedViolation` in `src/lib/types/crawl.ts`
  * Update `src/lib/report/site-generator.ts` to populate `tags` and representative `nodes` during aggregation
* [ ] Step 2.1: Add matching helper functions to `site-report-template.ts`
  * Details: .copilot-tracking/details/2026-03-07/report-output-parity-details.md (Lines 154-171)
* [ ] Step 2.2: Add category breakdown section to `site-report-template.ts`
  * Details: .copilot-tracking/details/2026-03-07/report-output-parity-details.md (Lines 173-186)
* [ ] Step 2.3: Enhance aggregated violation detail in site report template
  * Details: .copilot-tracking/details/2026-03-07/report-output-parity-details.md (Lines 188-219)
* [ ] Step 2.4: Validate phase changes
  * Run `npx tsc --noEmit` for type checking on modified types, generator, and template
  * Run `npm run lint` for linting

### [ ] Implementation Phase 3: Single-Page Report Regression Tests (US 1994, US 1992)

<!-- parallelizable: false — depends on Phase 1 template enhancements -->

* [ ] Step 3.1: Create `src/lib/report/__tests__/report-template.test.ts` with fixture helpers
  * Details: .copilot-tracking/details/2026-03-07/report-output-parity-details.md (Lines 190-232)
* [ ] Step 3.2: Add structural validation tests for all report sections
  * Details: .copilot-tracking/details/2026-03-07/report-output-parity-details.md (Lines 234-269)
* [ ] Step 3.3: Add scenario-based tests (clean site, dirty site, mixed severity, large volume)
  * Details: .copilot-tracking/details/2026-03-07/report-output-parity-details.md (Lines 271-314)
* [ ] Step 3.4: Add optional PDF smoke test
  * Details: .copilot-tracking/details/2026-03-07/report-output-parity-details.md (Lines 316-330)
  * Generate PDF buffer from enhanced HTML, validate `length > 0` and `%PDF-` magic bytes
* [ ] Step 3.5: Validate phase changes
  * Run `npx vitest run src/lib/report/__tests__/report-template.test.ts`

### [ ] Implementation Phase 4: Site-Level Report Regression Tests (US 1994, US 1992)

<!-- parallelizable: false — depends on Phase 2 template enhancements -->

* [ ] Step 4.1: Create `src/lib/report/__tests__/site-report-template.test.ts` with fixtures
  * Details: .copilot-tracking/details/2026-03-07/report-output-parity-details.md (Lines 318-348)
* [ ] Step 4.2: Add structural validation and scenario tests for site-level report
  * Details: .copilot-tracking/details/2026-03-07/report-output-parity-details.md (Lines 350-385)
* [ ] Step 4.3: Validate phase changes
  * Run `npx vitest run src/lib/report/__tests__/site-report-template.test.ts`

### [ ] Implementation Phase 5: Validation

<!-- parallelizable: false -->

* [ ] Step 5.1: Run full project validation
  * Execute `npm run lint`
  * Execute `npx tsc --noEmit`
  * Execute `npm run test:ci` (vitest with coverage)
  * Execute `npm run build`
* [ ] Step 5.2: Fix minor validation issues
  * Iterate on lint errors and build warnings
  * Apply fixes directly when corrections are straightforward
* [ ] Step 5.3: Report blocking issues
  * Document issues requiring additional research
  * Provide user with next steps and recommended planning
  * Avoid large-scale fixes within this phase

## Planning Log

See [report-output-parity-log.md](../logs/2026-03-07/report-output-parity-log.md) for discrepancy tracking, implementation paths considered, and suggested follow-on work.

## Dependencies

* TypeScript (project already configured)
* Vitest (test runner, already configured with `src/**/__tests__/**/*.test.ts` discovery)
* axe-core type definitions (already in project — `AxeViolation`, `AxeNode` types)
* Puppeteer (for PDF generation — already a dependency, not changed in this plan)

## Success Criteria

* Generated single-page report HTML contains: code snippets per violation, failure summary text, "Learn more" links, and category breakdown section — Traces to: US 1991, research Gap Analysis priorities 1-5
* Generated site-level report HTML contains: matching enhancements for aggregated violations — Traces to: US 1993
* All code snippets are HTML-escaped via `escapeHtml()` — Traces to: existing security pattern
* Node display capped at 5 per violation with overflow indicator — Traces to: derived objective from research
* Report template tests validate structure for clean site, dirty site, mixed severity, and large violation sets — Traces to: US 1992, US 1994
* Site report template tests validate structure for site-level scenarios — Traces to: US 1992, US 1994
* All tests pass in `npm run test:ci` with no changes to `.github/workflows/ci.yml` — Traces to: US 1995
* Coverage thresholds maintained (80% statement/function/line, 65% branch) — Traces to: existing CI requirement
