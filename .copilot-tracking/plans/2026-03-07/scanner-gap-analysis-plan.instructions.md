---
applyTo: '.copilot-tracking/changes/2026-03-07/scanner-gap-analysis-changes.md'
---
<!-- markdownlint-disable-file -->
# Implementation Plan: Scanner Gap Analysis — Close 105-Violation Detection Gap

## Overview

Refactor the accessibility scanner engine to close a massive detection gap (1 violation found vs 105+ by commercial tools) through AxeBuilder migration with iframe support, IBM Equal Access dual-engine integration, custom Playwright checks, and element-level reporting parity.

## Objectives

### User Requirements

* Identify and close the detection gap between our scanner (1 violation) and the commercial tool (105 critical + 2 serious findings) — Source: research document (Lines 1-6)
* Determine which complementary engines, custom rules, or additional checks can close the gap — Source: research task requests (Lines 8-11)
* Recommend and implement a phased approach to dramatically improve detection coverage — Source: research task requests (Lines 8-11)

### Derived Objectives

* Migrate from manual `page.evaluate()` axe-core injection to `@axe-core/playwright` `AxeBuilder` — Derived from: AxeBuilder already installed but unused; handles iframe scanning automatically (research Lines 119-127)
* Add `best-practice` tag to axe-core configuration increasing rules from 69 to 96 — Derived from: 30 best-practice rules excluded by current config (research Lines 130-139)
* Integrate IBM `accessibility-checker` as a second scanning engine for ~100 additional unique rules — Derived from: IBM covers 8 of 16 commercial tool gap categories (research Lines 141-155)
* Implement 5 custom Playwright DOM/CSS checks for gaps no open-source engine covers — Derived from: ambiguous links, aria-current, emphasis/strong, discount prices, sticky overlap (research Lines 157-163)
* Add element-level violation counting to match commercial tool reporting granularity — Derived from: commercial tool counts individual element failures vs axe-core rule-level grouping (research Lines 99-101)

## Context Summary

### Project Files

* `src/lib/scanner/engine.ts` (Lines 1-73) - Current scanner engine using manual axe-core injection; does not scan iframes
* `src/lib/scanner/result-parser.ts` (Lines 1-65) - Parses axe-core AxeResults into ScanResults; contract unchanged by AxeBuilder
* `src/lib/scanner/store.ts` - In-memory scan/crawl record store
* `src/lib/scoring/calculator.ts` (Lines 1-100) - Weighted scoring by impact severity; counts rule-level violations only
* `src/lib/scoring/wcag-mapper.ts` (Lines 1-30) - Maps WCAG tags to POUR principles; already supports `best-practice`
* `src/lib/types/scan.ts` (Lines 1-76) - TypeScript types for ScanResults, AxeViolation, AxeNode
* `src/lib/types/score.ts` (Lines 1-35) - TypeScript types for ScoreResult, PrincipleScores, ImpactBreakdown
* `src/lib/scanner/__tests__/engine.test.ts` - Tests that mock `page.evaluate()` pattern; must be rewritten for AxeBuilder
* `src/lib/report/generator.ts` - Report generator consuming ScanResults
* `src/lib/report/sarif-generator.ts` - SARIF output consuming ScanResults
* `src/lib/report/pdf-generator.ts` - PDF report consuming ScanResults
* `src/lib/ci/threshold.ts` - CI threshold checker consuming violation counts
* `src/components/ScoreDisplay.tsx` - UI score display
* `src/components/ViolationList.tsx` - UI violation list; already has `best-practice` label support

### References

* `.copilot-tracking/research/2026-03-07/scanner-gap-analysis-research.md` - Primary research document
* `.copilot-tracking/research/subagents/2026-03-07/axe-core-iframe-rules-research.md` - axe-core iframe and rule inventory
* `.copilot-tracking/research/subagents/2026-03-07/complementary-engines-research.md` - IBM Equal Access and custom checks
* `.copilot-tracking/research/subagents/2026-03-07/implementation-readiness-research.md` - Implementation readiness verification

### Standards References

* #file:../../.github/instructions/ado-workflow.instructions.md - ADO work item tracking, branching, and PR workflow

## Implementation Checklist

### [x] Implementation Phase 1: AxeBuilder Migration + Best-Practice Rules

<!-- parallelizable: false -->

* [x] Step 1.1: Refactor `engine.ts` to use `@axe-core/playwright` AxeBuilder
  * Details: .copilot-tracking/details/2026-03-07/scanner-gap-analysis-details.md (Lines 13-56)
* [x] Step 1.2: Rewrite `engine.test.ts` to mock AxeBuilder instead of `page.evaluate()`
  * Details: .copilot-tracking/details/2026-03-07/scanner-gap-analysis-details.md (Lines 58-103)
* [x] Step 1.3: Validate phase changes
  * Run `npm run lint` and `npm run test` for scanner module
  * Run `npm run build` to verify TypeScript compilation

### [x] Implementation Phase 2: IBM Equal Access Integration

<!-- parallelizable: false -->

* [x] Step 2.1: Install `accessibility-checker` and create `.achecker.yml` configuration
  * Details: .copilot-tracking/details/2026-03-07/scanner-gap-analysis-details.md (Lines 107-141)
* [x] Step 2.2: Verify IBM `aChecker.getCompliance()` iframe scanning behavior
  * Details: .copilot-tracking/details/2026-03-07/scanner-gap-analysis-details.md (Lines 211-251)
  * **Must complete before Step 2.4** — determines whether IBM needs iframe-specific handling (DR-05)
* [x] Step 2.3: Create `result-normalizer.ts` for multi-engine result merging and deduplication
  * Details: .copilot-tracking/details/2026-03-07/scanner-gap-analysis-details.md (Lines 253-312)
* [x] Step 2.4: Add IBM scanning function to `engine.ts` and integrate multi-engine pipeline
  * Details: .copilot-tracking/details/2026-03-07/scanner-gap-analysis-details.md (Lines 314-365)
* [x] Step 2.5: Update `result-parser.ts` to handle unified multi-engine results
  * Details: .copilot-tracking/details/2026-03-07/scanner-gap-analysis-details.md (Lines 367-391)
* [x] Step 2.6: Add tests for IBM integration and result normalization
  * Details: .copilot-tracking/details/2026-03-07/scanner-gap-analysis-details.md (Lines 393-425)
* [x] Step 2.7: Update downstream `scanUrl()` callers for `MultiEngineResults` type
  * Affected files: `src/app/api/scan/route.ts`, `src/app/api/ci/scan/route.ts`, `src/cli/commands/scan.ts`, `src/cli/__tests__/scan.test.ts` (DD-04)
  * Details: .copilot-tracking/details/2026-03-07/scanner-gap-analysis-details.md (Lines 427-460)
* [x] Step 2.8: Validate phase changes
  * Run `npm run lint`, `npm run test`, and `npm run build`

### [x] Implementation Phase 3: Custom Playwright Checks

<!-- parallelizable: false -->

* [x] Step 3.1: Create `custom-checks.ts` framework and implement 5 DOM/CSS checks
  * Details: .copilot-tracking/details/2026-03-07/scanner-gap-analysis-details.md (Lines 324-412)
* [x] Step 3.2: Integrate custom checks into multi-engine pipeline in `engine.ts`
  * Details: .copilot-tracking/details/2026-03-07/scanner-gap-analysis-details.md (Lines 414-440)
* [x] Step 3.3: Add tests for custom checks
  * Details: .copilot-tracking/details/2026-03-07/scanner-gap-analysis-details.md (Lines 442-480)
* [x] Step 3.4: Validate phase changes
  * Run `npm run lint`, `npm run test`, and `npm run build`

### [x] Implementation Phase 4: Element-Level Counting and Reporting Parity

<!-- parallelizable: false -->

* [x] Step 4.1: Add `elementViolationCount` to `ScoreResult` type and update calculator
  * Details: .copilot-tracking/details/2026-03-07/scanner-gap-analysis-details.md (Lines 484-520)
* [x] Step 4.2: Update `result-parser.ts` to include element-level summary
  * Details: .copilot-tracking/details/2026-03-07/scanner-gap-analysis-details.md (Lines 522-545)
* [x] Step 4.3: Update UI components to display both rule-level and element-level counts
  * Details: .copilot-tracking/details/2026-03-07/scanner-gap-analysis-details.md (Lines 547-575)
* [x] Step 4.4: Update report generators (PDF, SARIF) for element-level counts
  * Details: .copilot-tracking/details/2026-03-07/scanner-gap-analysis-details.md (Lines 577-600)
* [x] Step 4.5: Validate phase changes
  * Run `npm run lint`, `npm run test`, and `npm run build`

### [x] Implementation Phase 5: Final Validation

<!-- parallelizable: false -->

* [x] Step 5.1: Run full project validation
  * Execute `npm run lint`
  * Execute `npm run build`
  * Execute `npm run test` (full test suite)
* [x] Step 5.2: Fix minor validation issues
  * Iterate on lint errors and build warnings
  * Apply fixes directly when corrections are straightforward
* [ ] Step 5.3: Manual integration test on CodePen bad page
  * Scan `https://codepen.io/leezee/pen/eYbXzpJ` and verify violation count increase
  * Compare findings against commercial tool categories from research
  * Document detection coverage improvement
* [x] Step 5.4: Report blocking issues
  * Document issues requiring additional research
  * Provide user with next steps and recommended planning
  * Avoid large-scale fixes within this phase

## Planning Log

See [scanner-gap-analysis-log.md](../../plans/logs/2026-03-07/scanner-gap-analysis-log.md) for discrepancy tracking, implementation paths considered, and suggested follow-on work.

## Dependencies

* `@axe-core/playwright` v4.11.1 — Already installed in `package.json`
* `accessibility-checker` — Must be installed via `npm install accessibility-checker` (Phase 2)
* `playwright` v1.58.2 — Already installed
* `vitest` v4.0.18 — Already installed for testing
* Node.js, TypeScript 5.x — Already configured in project

## Success Criteria

* Scanner detects 50+ violations on CodePen bad page (up from 1) — Traces to: iframe scanning gap (research Lines 95-97)
* axe-core runs 96+ rules with best-practice tag enabled (up from 69) — Traces to: missing rule categories (research Lines 130-139). Note: 5 experimental rules excluded intentionally; IBM coverage in Phase 2 overlaps experimental rule ground (DR-06)
* IBM Equal Access adds ~100 unique rules covering 8 additional commercial tool categories — Traces to: IBM coverage analysis (research Lines 141-155)
* 5 custom checks cover remaining gap categories (ambiguous links, aria-current, emphasis/strong, discount prices, sticky overlap) — Traces to: custom check gap analysis (research Lines 157-163)
* Element-level violation counts displayed alongside rule-level counts — Traces to: counting methodology gap (research Lines 99-101)
* All existing tests pass after refactoring — Traces to: implementation readiness verification (subagent research)
* `engine.test.ts` rewritten with AxeBuilder mocks — Traces to: only test file requiring changes (subagent research)
