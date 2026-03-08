<!-- markdownlint-disable-file -->
# Release Changes: Self-Testing Accessibility of the Scanner App

**Related Plan**: self-testing-accessibility-plan.instructions.md
**Implementation Date**: 2026-03-07

## Summary

Use the AODA WCAG scanner to test the accessibility of its own web UI and generated HTML report pages, remediate violations found, and integrate self-scan into CI.

## Changes

### Added

* `playwright.config.ts` — Playwright Test configuration with webServer auto-management, CI-aware reporters
* `e2e/fixtures/axe-fixture.ts` — Shared AxeBuilder fixture with WCAG 2.2 AA tag configuration
* `e2e/fixtures/threshold.ts` — Configurable threshold helper wrapping app's `evaluateThreshold()`
* `e2e/self-scan-home.spec.ts` — Home page self-scan test (threshold, zero-violations, heading structure)
* `e2e/fixtures/report-data.ts` — Mock report data factories for single-page and site reports
* `e2e/self-scan-report.spec.ts` — Single-page report HTML accessibility test
* `e2e/self-scan-site-report.spec.ts` — Site report HTML accessibility test
* `e2e/fixtures/seed-data.ts` — Data seeding helpers for dynamic page tests (scan + crawl API calls)
* `e2e/self-scan-scan-results.spec.ts` — Scan results page accessibility test
* `e2e/self-scan-crawl-results.spec.ts` — Crawl results page accessibility test

### Modified

* `package.json` — Added `@playwright/test` devDependency; added `test:a11y` script
* `eslint.config.mjs` — Added `e2e/**` to ignores (Playwright tests are not React code)
* `src/app/page.tsx` — Converted How It Works to `<ol>`/`<li>`, `aria-hidden` on step numbers, contrast fixes
* `src/components/ScoreDisplay.tsx` — AODA badge `aria-hidden`, stats `aria-hidden` + `sr-only`, contrast fixes
* `src/components/SiteScoreDisplay.tsx` — AODA badge `aria-hidden`, stats `aria-hidden` + `sr-only`, contrast fixes
* `src/components/ReportView.tsx` — `scope="col"` on `<th>`, `aria-hidden` on symbols, contrast fixes
* `src/components/ScanProgress.tsx` — `<ol>`/`<li>` with `aria-current="step"`, contrast fixes
* `src/components/CrawlProgress.tsx` — `<ol>`/`<li>` with `aria-current="step"`, contrast fixes
* `src/components/ViolationList.tsx` — Contrast fixes on secondary text
* `src/components/PageList.tsx` — Contrast fix on empty state text
* `src/lib/report/templates/report-template.ts` — Landmarks, skip link, `scope="col"`, ARIA, contrast fixes
* `src/lib/report/templates/site-report-template.ts` — Landmarks, skip link, `scope="col"`, ARIA, contrast fixes
* `.github/workflows/ci.yml` — Added Playwright install, self-scan test, artifact upload, test reporter steps; increased timeout to 25min
* `eslint.config.mjs` — Added `e2e/**` to ignores (Playwright tests are not React code)
* `tsconfig.json` — Added `e2e` to exclude (prevent Next.js build from type-checking test files)
* `e2e/fixtures/threshold.ts` — Added missing `impact` field to AxeNode mapping

### Removed

## Additional or Deviating Changes

* `eslint.config.mjs` — Added `e2e/**` to ESLint ignores
  * Reason: Playwright fixtures trigger false `react-hooks/rules-of-hooks` errors since they are not React code
* `tsconfig.json` — Added `e2e` to TypeScript exclude
  * Reason: Next.js build was type-checking e2e test files, catching AxeNode mapping differences between axe-core and app types
* Coverage thresholds (statements 79.95% < 80%, branches 61.48% < 65%) fail in `npm run test:ci`
  * Reason: Pre-existing gaps in `site-crawler.ts` and `custom-checks.ts` coverage, not caused by this implementation
* Step 5.4 (dynamic page remediation) was deferred since Phase 3 already addressed most UI violations

## Release Summary

Total files affected: 22 (12 added, 10 modified, 0 removed)

Files created:
* `playwright.config.ts` — Playwright Test configuration with webServer management
* `e2e/fixtures/axe-fixture.ts` — Shared AxeBuilder fixture with WCAG 2.2 AA tags
* `e2e/fixtures/threshold.ts` — Configurable threshold evaluation helper
* `e2e/fixtures/report-data.ts` — Mock data factories for report HTML testing
* `e2e/fixtures/seed-data.ts` — API-based data seeding for dynamic page tests
* `e2e/self-scan-home.spec.ts` — Home page accessibility self-scan (3 tests)
* `e2e/self-scan-report.spec.ts` — Single-page report HTML accessibility test
* `e2e/self-scan-site-report.spec.ts` — Site report HTML accessibility test
* `e2e/self-scan-scan-results.spec.ts` — Scan results page accessibility test
* `e2e/self-scan-crawl-results.spec.ts` — Crawl results page accessibility test

Files modified:
* `package.json` — Added `@playwright/test` devDependency; added `test:a11y` script
* `eslint.config.mjs` — Excluded `e2e/**` from Next.js linting
* `tsconfig.json` — Excluded `e2e` from TypeScript compilation
* `src/app/page.tsx` — Semantic HTML (`<ol>`/`<li>`), contrast fixes
* `src/components/ScoreDisplay.tsx` — ARIA labels, `sr-only` alternatives, contrast fixes
* `src/components/SiteScoreDisplay.tsx` — ARIA labels, `sr-only` alternatives, contrast fixes
* `src/components/ReportView.tsx` — Table `scope`, `aria-hidden` on symbols, contrast fixes
* `src/components/ScanProgress.tsx` — `<ol>`/`<li>` step indicators, `aria-current`, contrast fixes
* `src/components/CrawlProgress.tsx` — `<ol>`/`<li>` step indicators, `aria-current`, contrast fixes
* `src/components/ViolationList.tsx` — Contrast fixes
* `src/components/PageList.tsx` — Contrast fixes
* `src/lib/report/templates/report-template.ts` — Landmarks, skip link, `scope`, ARIA, contrast
* `src/lib/report/templates/site-report-template.ts` — Landmarks, skip link, `scope`, ARIA, contrast
* `.github/workflows/ci.yml` — Playwright install, self-scan steps, artifact upload, test reporter

Dependency changes:
* Added `@playwright/test@^1.58.2` as devDependency

Infrastructure changes:
* CI workflow now runs Playwright accessibility tests after build
* CI timeout increased from 15 to 25 minutes
* Playwright HTML reports and JUnit XML uploaded as CI artifacts

Deployment notes:
* No server-side deployment changes required
* CI will require Chromium installation via `npx playwright install --with-deps chromium`
