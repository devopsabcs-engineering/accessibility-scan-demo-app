---
applyTo: '.copilot-tracking/changes/2026-03-07/self-testing-accessibility-changes.md'
---
<!-- markdownlint-disable-file -->
# Implementation Plan: Self-Testing Accessibility of the Scanner App (Epic 1974)

## Overview

Use the AODA WCAG scanner to test the accessibility of its own web UI and generated HTML report pages, remediate violations found, and integrate self-scan into CI — creating a dogfooding loop where the product validates its own WCAG 2.2 AA compliance.

## Objectives

### User Requirements

* Self-scan the scanner home page for WCAG 2.2 AA compliance in CI — Source: US 1996 (Feature 1979)
* Self-scan the crawl results page for WCAG 2.2 AA compliance in CI — Source: US 1997 (Feature 1979)
* Self-scan the scan results page for WCAG 2.2 AA compliance in CI — Source: US 1998 (Feature 1979)
* Self-scan generated HTML report pages for WCAG 2.2 AA compliance — Source: US 2000 (Feature 1981)
* Fix WCAG violations found by self-scan in scanner UI components — Source: US 1999 (Feature 1978)
* Fix WCAG violations found by self-scan in HTML report templates — Source: US 2001 (Feature 1978)

### Derived Objectives

* Add `@playwright/test` as a devDependency and create `playwright.config.ts` with `webServer` auto-management — Derived from: all self-scan user stories require Playwright Test infrastructure
* Create shared AxeBuilder fixture with WCAG 2.2 AA tag configuration — Derived from: all tests share the same tag set (`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`)
* Add `test:a11y` npm script and CI workflow steps — Derived from: CI integration requirement across all user stories
* Implement data seeding mechanism for dynamic pages — Derived from: scan results and crawl results pages require populated data for meaningful testing
* Create a final validation phase that runs full project-level checks — Derived from: ensuring no regressions from remediation changes

## Context Summary

### Project Files

* `src/lib/scanner/engine.ts` — Scanner engine with `scanPage()` (L16) and `scanUrl()` (L36); injects axe-core manually with WCAG 2.2 AA tags; no SSRF protection
* `src/lib/scanner/result-parser.ts` — `parseAxeResults()` maps raw AxeResults to app types with scoring
* `src/lib/scanner/store.ts` — In-memory `Map` store for scans/crawls; TTL cleanup
* `src/lib/ci/threshold.ts` — `evaluateThreshold()` with score and violation count checks
* `src/lib/report/templates/report-template.ts` — `generateReportHtml()` (L59) produces self-contained HTML with inline styles
* `src/lib/report/templates/site-report-template.ts` — `generateSiteReportHtml()` (L59) produces site-level report HTML
* `src/lib/report/generator.ts` — `assembleReportData()` (L4) transforms ScanResults → ReportData
* `src/app/page.tsx` — Home page with ScanForm component; "How It Works" section uses divs instead of `<ol>`
* `src/app/scan/[id]/page.tsx` — Scan results page; polls API, renders ReportView
* `src/app/crawl/[id]/page.tsx` — Crawl results page; polls API, renders SiteScoreDisplay + PageList + ViolationList
* `.github/workflows/ci.yml` — Current CI: lint → test:ci → build; no self-scan or Playwright steps
* `package.json` — `@axe-core/playwright` already in dependencies (unused); `@playwright/test` not present

### References

* `.copilot-tracking/research/2026-03-07/self-testing-accessibility-research.md` — Primary research document
* `.copilot-tracking/research/subagents/2026-03-07/scanner-engine-ci-research.md` — Scanner engine and CI research
* `.copilot-tracking/research/subagents/2026-03-07/ui-pages-report-templates-research.md` — UI and report template research
* `.copilot-tracking/research/subagents/2026-03-07/self-scan-integration-approach-research.md` — Integration approach research

### Standards References

* #file:../../.github/instructions/ado-workflow.instructions.md — ADO branching, commit linking, PR workflow

## Implementation Checklist

### [x] Implementation Phase 1: Playwright Test Infrastructure + Home Page Self-Scan (US 1996)

<!-- parallelizable: false -->

* [x] Step 1.1: Add `@playwright/test` devDependency and create `playwright.config.ts`
  * Details: .copilot-tracking/details/2026-03-07/self-testing-accessibility-details.md (Lines 12-44)
* [x] Step 1.2: Create shared AxeBuilder fixture in `e2e/fixtures/axe-fixture.ts`
  * Details: .copilot-tracking/details/2026-03-07/self-testing-accessibility-details.md (Lines 46-72)
* [x] Step 1.3: Create `e2e/self-scan-home.spec.ts` for home page accessibility scan
  * Details: .copilot-tracking/details/2026-03-07/self-testing-accessibility-details.md (Lines 74-103)
* [x] Step 1.4: Create configurable threshold helper in `e2e/fixtures/threshold.ts`
  * Details: .copilot-tracking/details/2026-03-07/self-testing-accessibility-details.md (Lines 105-140)
* [x] Step 1.5: Add `test:a11y` script to `package.json`
  * Details: .copilot-tracking/details/2026-03-07/self-testing-accessibility-details.md (Lines 142-155)
* [x] Step 1.6: Validate phase — run `npx playwright test` locally to confirm infrastructure works
  * Run lint and build; verify Playwright tests execute against home page

### [x] Implementation Phase 2: Self-Scan Generated HTML Reports (US 2000)

<!-- parallelizable: true -->

* [x] Step 2.1: Create mock report data factories in `e2e/fixtures/report-data.ts`
  * Details: .copilot-tracking/details/2026-03-07/self-testing-accessibility-details.md (Lines 122-158)
* [x] Step 2.2: Create `e2e/self-scan-report.spec.ts` for single-page report HTML
  * Details: .copilot-tracking/details/2026-03-07/self-testing-accessibility-details.md (Lines 160-195)
* [x] Step 2.3: Create `e2e/self-scan-site-report.spec.ts` for site report HTML
  * Details: .copilot-tracking/details/2026-03-07/self-testing-accessibility-details.md (Lines 197-228)
* [x] Step 2.4: Validate phase — run full `test:a11y` suite
  * Confirm report HTML tests execute with mock data via `page.setContent()`

### [x] Implementation Phase 3: Accessibility Remediation of Scanner UI (US 1999)

<!-- parallelizable: false -->

* [x] Step 3.1: Run Phase 1+2 tests and capture violation reports
  * Details: .copilot-tracking/details/2026-03-07/self-testing-accessibility-details.md (Lines 232-246)
* [x] Step 3.2: Fix semantic HTML issues (home page `<ol>`, table `scope` attributes)
  * Details: .copilot-tracking/details/2026-03-07/self-testing-accessibility-details.md (Lines 248-278)
* [x] Step 3.3: Fix ARIA and color-only information issues in score/grade displays
  * Details: .copilot-tracking/details/2026-03-07/self-testing-accessibility-details.md (Lines 280-312)
* [x] Step 3.4: Fix low contrast text (upgrade gray utilities)
  * Details: .copilot-tracking/details/2026-03-07/self-testing-accessibility-details.md (Lines 314-338)
* [x] Step 3.5: Fix step indicator ARIA attributes in progress components
  * Details: .copilot-tracking/details/2026-03-07/self-testing-accessibility-details.md (Lines 340-362)
* [x] Step 3.6: Validate — re-run `test:a11y` to confirm UI violations resolved
  * Iterate on remaining failures

### [x] Implementation Phase 4: Accessibility Remediation of HTML Report Templates (US 2001)

<!-- parallelizable: true -->

* [x] Step 4.1: Add landmarks (`<main>`, `<header>`, `<nav>`) and skip link to report templates
  * Details: .copilot-tracking/details/2026-03-07/self-testing-accessibility-details.md (Lines 366-398)
* [x] Step 4.2: Add `scope="col"` to table headers in report templates
  * Details: .copilot-tracking/details/2026-03-07/self-testing-accessibility-details.md (Lines 400-420)
* [x] Step 4.3: Fix ARIA labels and contrast issues in report templates
  * Details: .copilot-tracking/details/2026-03-07/self-testing-accessibility-details.md (Lines 422-446)
* [x] Step 4.4: Validate — re-run report HTML tests to confirm zero critical/serious violations
  * Iterate on remaining failures

### [x] Implementation Phase 5: Dynamic Pages Self-Scan (US 1997, US 1998)

<!-- parallelizable: false -->

* [x] Step 5.1: Implement data seeding mechanism via API calls in test setup
  * Details: .copilot-tracking/details/2026-03-07/self-testing-accessibility-details.md (Lines 450-488)
* [x] Step 5.2: Create `e2e/self-scan-scan-results.spec.ts` for scan results page
  * Details: .copilot-tracking/details/2026-03-07/self-testing-accessibility-details.md (Lines 490-520)
* [x] Step 5.3: Create `e2e/self-scan-crawl-results.spec.ts` for crawl results page
  * Details: .copilot-tracking/details/2026-03-07/self-testing-accessibility-details.md (Lines 522-556)
* [x] Step 5.4: Remediate any new violations found on dynamic pages
  * Details: .copilot-tracking/details/2026-03-07/self-testing-accessibility-details.md (Lines 558-574)
* [x] Step 5.5: Validate — run full `test:a11y` suite with all pages passing

### [x] Implementation Phase 6: CI Workflow Integration

<!-- parallelizable: false -->

* [x] Step 6.1: Add Playwright browser install and self-scan steps to `.github/workflows/ci.yml`
  * Details: .copilot-tracking/details/2026-03-07/self-testing-accessibility-details.md (Lines 578-622)
* [x] Step 6.2: Add artifact upload for Playwright reports and JUnit results
  * Details: .copilot-tracking/details/2026-03-07/self-testing-accessibility-details.md (Lines 624-650)
* [x] Step 6.3: Validate — verify CI workflow YAML syntax and step ordering

### [x] Implementation Phase 7: Final Validation

<!-- parallelizable: false -->

* [x] Step 7.1: Run full project validation
  * Execute `npm run lint`
  * Execute `npm run build`
  * Execute `npm run test:ci` (unit tests)
  * Execute `npm run test:a11y` (self-scan tests)
* [x] Step 7.2: Fix minor validation issues
  * Iterate on lint errors and build warnings
  * Apply fixes directly when corrections are straightforward
* [x] Step 7.3: Report blocking issues
  * Document issues requiring additional research
  * Provide user with next steps and recommended planning
  * Avoid large-scale fixes within this phase

## Planning Log

See [self-testing-accessibility-log.md](.copilot-tracking/plans/logs/2026-03-07/self-testing-accessibility-log.md) for discrepancy tracking, implementation paths considered, and suggested follow-on work.

## Dependencies

* `@playwright/test` — devDependency for test runner, webServer management, HTML reporter
* `@axe-core/playwright` — already in dependencies; provides AxeBuilder API
* `playwright` — already in dependencies; provides browser binaries
* Chromium browser binary — installed via `npx playwright install chromium`
* Next.js build output — required before `npm run start` for webServer
* ADO work items — Epic 1974, Features 1978/1979/1981, User Stories 1996-2001

## Success Criteria

* Home page self-scan test passes with configurable score threshold (default 90+) and violation limits — Traces to: US 1996
* Scan results page self-scan test passes — Traces to: US 1998
* Crawl results page self-scan test passes — Traces to: US 1997
* Generated HTML report has zero critical/serious violations — Traces to: US 2000
* Generated site report has zero critical/serious violations — Traces to: US 2000
* All critical and serious UI violations remediated — Traces to: US 1999
* All critical and serious report template violations remediated — Traces to: US 2001
* CI workflow runs self-scan after build and reports results — Traces to: all user stories
* Threshold-based pass/fail with configurable score and violation count limits — Traces to: user requirement "Threshold-based pass/fail in CI", `evaluateThreshold()` in `src/lib/ci/threshold.ts`
* All existing unit tests continue to pass — Traces to: derived (no regressions)
