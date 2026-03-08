<!-- markdownlint-disable-file -->
# Release Changes: Scanner Gap Analysis — Close 105-Violation Detection Gap

**Related Plan**: scanner-gap-analysis-plan.instructions.md
**Implementation Date**: 2026-03-07

## Summary

Refactor the accessibility scanner engine to close a massive detection gap (1 violation found vs 105+ by commercial tools) through AxeBuilder migration with iframe support, IBM Equal Access dual-engine integration, custom Playwright checks, and element-level reporting parity.

## Changes

### Added

* `.achecker.yml` — IBM Equal Access configuration at project root
* `src/lib/scanner/result-normalizer.ts` — Multi-engine result normalization and deduplication
* `src/lib/scanner/__tests__/result-normalizer.test.ts` — 21 normalization tests
* `src/lib/scanner/custom-checks.ts` — 5 custom Playwright DOM/CSS accessibility checks + orchestrator
* `src/lib/scanner/__tests__/custom-checks.test.ts` — 14 custom check tests

### Modified

* `src/lib/scanner/engine.ts` — Replaced manual axe-core injection with `@axe-core/playwright` AxeBuilder; added `best-practice` tag; added `runIbmScan()`, `multiEngineScan()`, IBM import; `scanUrl()` now uses multi-engine pipeline; wired in `runCustomChecks()` as third engine
* `src/lib/scanner/__tests__/engine.test.ts` — Full rewrite to mock AxeBuilder class; added `accessibility-checker` mock and 3 multi-engine tests
* `src/lib/types/scan.ts` — Added `engine?` field to `AxeViolation`, `NormalizedViolation`, `MultiEngineResults` types
* `src/lib/types/score.ts` — Added `totalElementViolations: number` to `ScoreResult`
* `src/lib/scoring/calculator.ts` — Computed `totalElementViolations` as sum of `v.nodes.length`
* `src/lib/scoring/__tests__/calculator.test.ts` — Added element-level counting assertion + new multi-node test
* `src/lib/scanner/result-parser.ts` — Added `MultiEngineResults` union handling with type guard, multi-engine version string
* `src/lib/scanner/__tests__/result-parser.test.ts` — Added 3 MultiEngineResults parsing tests
* `src/cli/__tests__/scan.test.ts` — Updated mock to `MultiEngineResults` shape; added `totalElementViolations` to mock
* `src/cli/__tests__/crawl.test.ts` — Added `totalElementViolations: 0` to mock
* `src/components/ScoreDisplay.tsx` — Added element count display under violations
* `src/components/ReportView.tsx` — Added summary line showing violations + element counts
* `src/lib/report/templates/report-template.ts` — Added element count to HTML template
* `src/lib/report/__tests__/generator.test.ts` — Added `totalElementViolations: 0` to mock
* `src/lib/report/__tests__/report-template.test.ts` — Added `totalElementViolations` to 3 mock constructors
* `src/lib/report/__tests__/site-generator.test.ts` — Added `totalElementViolations: 0` to mock
* `src/lib/scoring/__tests__/site-calculator.test.ts` — Added `totalElementViolations` to 2 mock constructors
* `package.json` — Added `accessibility-checker@^4.0.13` dependency
* `next.config.ts` — Added `accessibility-checker` to `serverExternalPackages`

### Removed

## Additional or Deviating Changes

* `next.config.ts` required `serverExternalPackages` addition for `accessibility-checker` due to dynamic `require()` calls
  * Not in original plan; discovered during Phase 2 installation
* AxeBuilder uses default export instead of named export
  * Plan specified `{ AxeBuilder }`, package exports as default
* Emphasis/strong custom check checks `<b>`/`<i>` tags instead of WAI-ARIA 1.3 roles
  * WAI-ARIA 1.3 roles rarely used; non-semantic tag detection is more actionable

## Release Summary

Total files affected: 22 (7 created, 15 modified, 0 removed)

**Files created:**
* `.achecker.yml` — IBM Equal Access configuration
* `src/lib/scanner/result-normalizer.ts` — Multi-engine result normalization and deduplication
* `src/lib/scanner/custom-checks.ts` — 5 custom Playwright DOM/CSS accessibility checks
* `src/lib/scanner/__tests__/result-normalizer.test.ts` — 21 normalization tests
* `src/lib/scanner/__tests__/custom-checks.test.ts` — 14 custom check tests
* `.copilot-tracking/changes/2026-03-07/scanner-gap-analysis-changes.md` — This changes log
* `.copilot-tracking/plans/logs/2026-03-07/scanner-gap-analysis-log.md` — Planning log (updated)

**Files modified:**
* `src/lib/scanner/engine.ts` — AxeBuilder migration, IBM integration, custom checks, multi-engine pipeline
* `src/lib/scanner/result-parser.ts` — MultiEngineResults union handling
* `src/lib/types/scan.ts` — NormalizedViolation, MultiEngineResults, engine field
* `src/lib/types/score.ts` — totalElementViolations field
* `src/lib/scoring/calculator.ts` — Element-level violation counting
* `src/components/ScoreDisplay.tsx` — Element count display
* `src/components/ReportView.tsx` — Violation + element summary
* `src/lib/report/templates/report-template.ts` — Element count in HTML
* `src/lib/scanner/__tests__/engine.test.ts` — AxeBuilder + multi-engine tests
* `src/lib/scanner/__tests__/result-parser.test.ts` — MultiEngineResults tests
* `src/lib/scoring/__tests__/calculator.test.ts` — Element counting tests
* `src/cli/__tests__/scan.test.ts` — MultiEngineResults mock
* `src/cli/__tests__/crawl.test.ts` — totalElementViolations mock
* Various report/scoring test files — totalElementViolations field additions
* `package.json` — accessibility-checker dependency
* `next.config.ts` — serverExternalPackages

**Dependencies added:**
* `accessibility-checker@^4.0.13`

**Deployment notes:**
* No infrastructure changes required
* `accessibility-checker` bundles its own puppeteer dependency (~150MB); consider impact on container image size
* IBM telemetry may phone home in CI — consider `.achecker.yml` telemetry opt-out for production
