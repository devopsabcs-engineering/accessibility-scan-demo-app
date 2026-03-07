<!-- markdownlint-disable-file -->
# Release Changes: Phase 2 — Site Crawling & CI/CD Integration

**Related Plan**: phase2-crawling-cicd-plan.instructions.md
**Implementation Date**: 2026-03-06

## Summary

Extends the Phase 1 WCAG 2.2 accessibility scanner with multi-page site crawling (crawlee + Playwright), CI/CD integration (synchronous API, SARIF output, Commander.js CLI, composite GitHub Action), and Azure DevOps pipeline support.

## Changes

### Added

* `src/lib/types/crawl.ts` — All Phase 2 types: CrawlStatus, CrawlConfig, CrawlRequest, CrawlRecord, PageSummary, AggregatedViolation, SiteScoreResult, SiteReportData, CrawlProgressEvent, CI/CD types, with Phase 1 re-exports
* `src/lib/crawler/url-utils.ts` — URL normalization, domain boundary checking, scannable detection, glob pattern matching
* `src/lib/crawler/robots.ts` — robots.txt fetching/parsing/caching with AccessibilityScanBot user agent
* `src/lib/crawler/sitemap.ts` — Sitemap discovery from robots.txt + standard locations with deduplication
* `src/lib/crawler/site-crawler.ts` — PlaywrightCrawler orchestration with per-page scanning, progress events, cancellation
* `src/lib/scoring/site-calculator.ts` — Site-wide score aggregation (calculateSiteScore, aggregateViolations, generatePageSummaries)
* `src/app/api/crawl/route.ts` — POST to start crawl with SSRF validation and config defaults
* `src/app/api/crawl/[id]/route.ts` — GET crawl status/summary
* `src/app/api/crawl/[id]/status/route.ts` — SSE progress stream for crawl
* `src/app/api/crawl/[id]/pages/route.ts` — GET page summaries list
* `src/app/api/crawl/[id]/pages/[pageId]/route.ts` — GET single page result
* `src/app/api/crawl/[id]/cancel/route.ts` — POST to cancel running crawl
* `src/app/api/crawl/[id]/report/route.ts` — GET site report JSON
* `src/lib/report/site-generator.ts` — Site-wide report assembly from crawl data
* `src/lib/report/templates/site-report-template.ts` — HTML template for site-wide executive summary PDF
* `src/app/api/crawl/[id]/pdf/route.ts` — Site-wide PDF endpoint
* `src/app/api/crawl/[id]/pages/[pageId]/pdf/route.ts` — Per-page PDF within crawl (reuses Phase 1 pipeline)
* `src/components/CrawlProgress.tsx` — Multi-page SSE progress display with per-page status
* `src/components/PageList.tsx` — Page results table with scores, grades, violation counts
* `src/components/SiteScoreDisplay.tsx` — Site-wide score gauge with POUR bars and AODA badge
* `src/app/crawl/[id]/page.tsx` — Crawl results page wiring all components
* `src/lib/report/sarif-generator.ts` — SARIF v2.1.0 output from axe-core violations (single + site-wide)
* `src/lib/ci/threshold.ts` — Threshold evaluation (score, count, rule-based) with defaults
* `src/lib/ci/formatters/json.ts` — CI JSON output formatter
* `src/lib/ci/formatters/sarif.ts` — CI SARIF output formatter wrapper
* `src/lib/ci/formatters/junit.ts` — CI JUnit XML output formatter
* `src/app/api/ci/scan/route.ts` — Synchronous single-page CI scan endpoint with threshold evaluation
* `src/app/api/ci/crawl/route.ts` — Synchronous site crawl CI endpoint with 30-min timeout
* `src/cli/bin/a11y-scan.ts` — CLI entry point with Commander.js
* `src/cli/commands/scan.ts` — Single-page scan CLI command
* `src/cli/commands/crawl.ts` — Site crawl CLI command
* `src/cli/config/loader.ts` — .a11yrc.json configuration file loader
* `action/action.yml` — Composite GitHub Action wrapping CLI for CI/CD
* `azure-pipelines/a11y-scan.yml` — Azure DevOps pipeline example with JUnit publishing

### Modified

* `src/lib/scanner/engine.ts` — Extracted `scanPage(page: Page)` for crawler use; `scanUrl()` now delegates to it (backward compatible)
* `src/lib/scanner/store.ts` — Added crawl CRUD (createCrawl, getCrawl, updateCrawl, deleteCrawl, getAllCrawls) and TTL cleanup
* `package.json` — Added crawlee, sitemapper, robots-parser dependencies
* `next.config.ts` — Added serverExternalPackages for crawlee ecosystem (Turbopack fix)
* `src/components/ScanForm.tsx` — Added crawl mode toggle, crawl config fields, dual-path submit
* `src/app/page.tsx` — Updated hero description for dual-mode
* `package.json` — Added bin field for CLI distribution
* `Dockerfile` — Added NODE_OPTIONS memory tuning and crawlee runtime module copies

### Removed

## Additional or Deviating Changes

## Release Summary
