---
applyTo: '.copilot-tracking/changes/2026-03-06/phase2-crawling-cicd-changes.md'
---
<!-- markdownlint-disable-file -->
# Implementation Plan: Phase 2 — Site Crawling & CI/CD Integration

## Overview

Extend the Phase 1 WCAG 2.2 accessibility scanner with multi-page site crawling (crawlee + Playwright) and CI/CD integration (synchronous API, SARIF output, Commander.js CLI, composite GitHub Action).

## Objectives

### User Requirements

* Multi-page site crawling: accept a root URL, discover sub-pages via sitemap + link extraction, scan each, and produce an aggregated site-wide report — Source: user task request
* CI/CD integration: provide API endpoints and CLI tooling that enables automated accessibility checks in GitHub Actions and Azure DevOps — Source: user task request
* Maintain backward compatibility with Phase 1 single-page scanning — Source: user task request
* Extend existing Next.js API routes and TypeScript types — Source: user task request

### Derived Objectives

* Refactor scanner engine to accept a Playwright `Page` object so the crawler manages browser lifecycle — Derived from: crawlee architecture requires shared browser pool (research Lines 126-140)
* Extend in-memory store with `CrawlRecord` and TTL-based cleanup — Derived from: multi-page crawls produce larger datasets needing lifecycle management (research Lines 176-180)
* Implement SARIF v2.1.0 output for GitHub code scanning integration — Derived from: CI/CD best practice for GitHub-native reporting (research Lines 200-214)
* Implement threshold-based pass/fail evaluation — Derived from: CI pipelines need binary pass/fail exit codes (research Lines 226-237)
* Respect robots.txt and rate-limit crawl requests — Derived from: ethical crawling requirements (research Lines 239-244)

## Context Summary

### Project Files

* `src/lib/scanner/engine.ts` (Lines 1-66) - Phase 1 scanner; launches browser per scan; needs `scanPage(page)` refactor
* `src/lib/scanner/store.ts` (Lines 1-28) - In-memory `Map<string, ScanRecord>`; needs `CrawlRecord` + TTL
* `src/lib/scanner/result-parser.ts` - Axe result parser; reused unchanged per page
* `src/lib/scoring/calculator.ts` (Lines 1-87) - Weighted scoring formula; reused per page; new site-calculator aggregates
* `src/lib/types/scan.ts` (Lines 1-77) - `ScanRecord`, `ScanResults`, `AxeViolation`; unchanged
* `src/lib/types/score.ts` (Lines 1-37) - `ScoreResult`, `PrincipleScores`, `ImpactBreakdown`; unchanged
* `src/app/api/scan/route.ts` (Lines 1-60) - POST endpoint with SSRF protection; unchanged; pattern reused for crawl routes
* `src/app/api/scan/[id]/status/route.ts` - SSE progress stream; pattern reused for crawl progress
* `src/components/ScanForm.tsx` (Lines 1-60) - URL input form; extend with crawl mode toggle
* `Dockerfile` (Lines 1-39) - Multi-stage build with Chromium; needs crawlee dependency + memory tuning
* `package.json` - Current deps: playwright, @axe-core/playwright, next, react, uuid

### References

* `.copilot-tracking/research/2026-03-06/phase2-crawling-cicd-research.md` - Primary research document
* `.copilot-tracking/research/subagents/2026-03-06/site-crawling-research.md` - Crawling library analysis
* `.copilot-tracking/research/subagents/2026-03-06/cicd-integration-research.md` - CI/CD tools and patterns
* `.copilot-tracking/research/subagents/2026-03-06/api-store-aggregation-research.md` - API, store, and scoring design

## Implementation Checklist

### [ ] Implementation Phase 1: Types, Engine Refactor, and Store Extension

<!-- parallelizable: true -->

* [ ] Step 1.1: Create `src/lib/types/crawl.ts` with all crawl/site types
  * Details: .copilot-tracking/details/2026-03-06/phase2-crawling-cicd-details.md (Lines 15-85)
* [ ] Step 1.2: Refactor `src/lib/scanner/engine.ts` — extract `scanPage(page)` and wrap `scanUrl(url)` for backward compatibility
  * Details: .copilot-tracking/details/2026-03-06/phase2-crawling-cicd-details.md (Lines 87-140)
* [ ] Step 1.3: Extend `src/lib/scanner/store.ts` with `CrawlRecord` CRUD and TTL cleanup
  * Details: .copilot-tracking/details/2026-03-06/phase2-crawling-cicd-details.md (Lines 142-200)
* [ ] Step 1.4: Validate phase changes
  * Run `npm run lint` and `npm run build` for modified files

### [ ] Implementation Phase 2: Crawler Module

<!-- parallelizable: false -->

* [ ] Step 2.1: Install crawling dependencies (`crawlee`, `sitemapper`, `robots-parser`)
  * Details: .copilot-tracking/details/2026-03-06/phase2-crawling-cicd-details.md (Lines 202-220)
* [ ] Step 2.2: Create `src/lib/crawler/url-utils.ts` — URL normalization, domain filtering, link validation
  * Details: .copilot-tracking/details/2026-03-06/phase2-crawling-cicd-details.md (Lines 222-270)
* [ ] Step 2.3: Create `src/lib/crawler/robots.ts` — robots.txt fetching and compliance checking
  * Details: .copilot-tracking/details/2026-03-06/phase2-crawling-cicd-details.md (Lines 272-310)
* [ ] Step 2.4: Create `src/lib/crawler/sitemap.ts` — sitemap discovery and URL extraction
  * Details: .copilot-tracking/details/2026-03-06/phase2-crawling-cicd-details.md (Lines 312-350)
* [ ] Step 2.5: Create `src/lib/crawler/site-crawler.ts` — crawlee `PlaywrightCrawler` orchestration with combined discovery
  * Details: .copilot-tracking/details/2026-03-06/phase2-crawling-cicd-details.md (Lines 352-450)
* [ ] Step 2.6: Validate phase changes
  * Run `npm run lint` and `npm run build`

### [ ] Implementation Phase 3: Site Scoring and Aggregation

<!-- parallelizable: true -->

* [ ] Step 3.1: Create `src/lib/scoring/site-calculator.ts` — aggregate page scores into `SiteScoreResult`
  * Details: .copilot-tracking/details/2026-03-06/phase2-crawling-cicd-details.md (Lines 452-510)
* [ ] Step 3.2: Validate phase changes
  * Run `npm run lint` and `npm run build`

### [ ] Implementation Phase 4: Crawl API Routes

<!-- parallelizable: false -->

* [ ] Step 4.1: Create `src/app/api/crawl/route.ts` — POST to start crawl (SSRF validation, 202 response)
  * Details: .copilot-tracking/details/2026-03-06/phase2-crawling-cicd-details.md (Lines 512-565)
* [ ] Step 4.2: Create `src/app/api/crawl/[id]/route.ts` — GET crawl status and summary
  * Details: .copilot-tracking/details/2026-03-06/phase2-crawling-cicd-details.md (Lines 567-600)
* [ ] Step 4.3: Create `src/app/api/crawl/[id]/status/route.ts` — SSE progress stream with per-page events
  * Details: .copilot-tracking/details/2026-03-06/phase2-crawling-cicd-details.md (Lines 602-650)
* [ ] Step 4.4: Create `src/app/api/crawl/[id]/pages/route.ts` — GET list of page results
  * Details: .copilot-tracking/details/2026-03-06/phase2-crawling-cicd-details.md (Lines 652-680)
* [ ] Step 4.5: Create `src/app/api/crawl/[id]/pages/[pageId]/route.ts` — GET single page scan result
  * Details: .copilot-tracking/details/2026-03-06/phase2-crawling-cicd-details.md (Lines 682-710)
* [ ] Step 4.6: Create `src/app/api/crawl/[id]/cancel/route.ts` — POST to cancel running crawl
  * Details: .copilot-tracking/details/2026-03-06/phase2-crawling-cicd-details.md (Lines 712-740)
* [ ] Step 4.7: Create `src/app/api/crawl/[id]/report/route.ts` — GET aggregated site report JSON
  * Details: .copilot-tracking/details/2026-03-06/phase2-crawling-cicd-details.md (Lines 742-770)
* [ ] Step 4.8: Validate phase changes
  * Run `npm run lint` and `npm run build`

### [ ] Implementation Phase 5: Site Reports and PDF

<!-- parallelizable: true -->

* [ ] Step 5.1: Create `src/lib/report/site-generator.ts` — site-wide report assembly from crawl data
  * Details: .copilot-tracking/details/2026-03-06/phase2-crawling-cicd-details.md (Lines 772-820)
* [ ] Step 5.2: Create `src/lib/report/templates/site-report-template.ts` — HTML template for site-wide executive summary
  * Details: .copilot-tracking/details/2026-03-06/phase2-crawling-cicd-details.md (Lines 822-870)
* [ ] Step 5.3: Create `src/app/api/crawl/[id]/pdf/route.ts` — site-wide PDF endpoint
  * Details: .copilot-tracking/details/2026-03-06/phase2-crawling-cicd-details.md (Lines 872-910)
* [ ] Step 5.4: Create `src/app/api/crawl/[id]/pages/[pageId]/pdf/route.ts` — per-page PDF (reuse Phase 1 pipeline)
  * Details: .copilot-tracking/details/2026-03-06/phase2-crawling-cicd-details.md (Lines 912-940)
* [ ] Step 5.5: Validate phase changes
  * Run `npm run lint` and `npm run build`

### [ ] Implementation Phase 6: Crawl UI Components

<!-- parallelizable: true -->

* [ ] Step 6.1: Extend `src/components/ScanForm.tsx` with crawl mode toggle (single-page vs site-wide)
  * Details: .copilot-tracking/details/2026-03-06/phase2-crawling-cicd-details.md (Lines 942-985)
* [ ] Step 6.2: Create `src/components/CrawlProgress.tsx` — multi-page progress display with per-page status
  * Details: .copilot-tracking/details/2026-03-06/phase2-crawling-cicd-details.md (Lines 987-1030)
* [ ] Step 6.3: Create `src/components/PageList.tsx` — page results table with scores and links
  * Details: .copilot-tracking/details/2026-03-06/phase2-crawling-cicd-details.md (Lines 1032-1070)
* [ ] Step 6.4: Create `src/components/SiteScoreDisplay.tsx` — site-wide score gauge and summary
  * Details: .copilot-tracking/details/2026-03-06/phase2-crawling-cicd-details.md (Lines 1072-1110)
* [ ] Step 6.5: Create `src/app/crawl/[id]/page.tsx` — crawl results page wiring components
  * Details: .copilot-tracking/details/2026-03-06/phase2-crawling-cicd-details.md (Lines 1112-1155)
* [ ] Step 6.6: Extend `src/app/page.tsx` — add crawl mode option on homepage
  * Details: .copilot-tracking/details/2026-03-06/phase2-crawling-cicd-details.md (Lines 1157-1180)
* [ ] Step 6.7: Validate phase changes
  * Run `npm run lint` and `npm run build`

### [ ] Implementation Phase 7: SARIF and CI/CD Foundation

<!-- parallelizable: true -->

* [ ] Step 7.1: Create `src/lib/report/sarif-generator.ts` — axe-core violations to SARIF v2.1.0 mapping
  * Details: .copilot-tracking/details/2026-03-06/phase2-crawling-cicd-details.md (Lines 1182-1240)
* [ ] Step 7.2: Create `src/lib/ci/threshold.ts` — threshold evaluation (score, count, rule-based)
  * Details: .copilot-tracking/details/2026-03-06/phase2-crawling-cicd-details.md (Lines 1242-1290)
* [ ] Step 7.3: Create `src/lib/ci/formatters/json.ts` — CI JSON output formatter
  * Details: .copilot-tracking/details/2026-03-06/phase2-crawling-cicd-details.md (Lines 1292-1320)
* [ ] Step 7.4: Create `src/lib/ci/formatters/sarif.ts` — CI SARIF output formatter
  * Details: .copilot-tracking/details/2026-03-06/phase2-crawling-cicd-details.md (Lines 1322-1350)
* [ ] Step 7.5: Create `src/lib/ci/formatters/junit.ts` — CI JUnit XML output formatter
  * Details: .copilot-tracking/details/2026-03-06/phase2-crawling-cicd-details.md (Lines 1352-1380)
* [ ] Step 7.6: Validate phase changes
  * Run `npm run lint` and `npm run build`

### [ ] Implementation Phase 8: CI API Routes

<!-- parallelizable: false -->

* [ ] Step 8.1: Create `src/app/api/ci/scan/route.ts` — synchronous single-page CI scan endpoint
  * Details: .copilot-tracking/details/2026-03-06/phase2-crawling-cicd-details.md (Lines 1382-1430)
* [ ] Step 8.2: Create `src/app/api/ci/crawl/route.ts` — synchronous site crawl CI endpoint
  * Details: .copilot-tracking/details/2026-03-06/phase2-crawling-cicd-details.md (Lines 1432-1480)
* [ ] Step 8.3: Validate phase changes
  * Run `npm run lint` and `npm run build`

### [ ] Implementation Phase 9: CLI Tool

<!-- parallelizable: false -->

* [ ] Step 9.1: Install CLI dependency (`commander`)
  * Details: .copilot-tracking/details/2026-03-06/phase2-crawling-cicd-details.md (Lines 1482-1495)
* [ ] Step 9.2: Create `src/cli/bin/a11y-scan.ts` — CLI entry point with Commander.js
  * Details: .copilot-tracking/details/2026-03-06/phase2-crawling-cicd-details.md (Lines 1497-1540)
* [ ] Step 9.3: Create `src/cli/commands/scan.ts` — single-page scan command
  * Details: .copilot-tracking/details/2026-03-06/phase2-crawling-cicd-details.md (Lines 1542-1580)
* [ ] Step 9.4: Create `src/cli/commands/crawl.ts` — site crawl command
  * Details: .copilot-tracking/details/2026-03-06/phase2-crawling-cicd-details.md (Lines 1582-1620)
* [ ] Step 9.5: Create `src/cli/config/loader.ts` — `.a11yrc.json` configuration file loader
  * Details: .copilot-tracking/details/2026-03-06/phase2-crawling-cicd-details.md (Lines 1622-1660)
* [ ] Step 9.6: Validate phase changes
  * Run `npm run lint` and `npm run build`

### [ ] Implementation Phase 10: GitHub Action and Docker Updates

<!-- parallelizable: true -->

* [ ] Step 10.1: Create `action/action.yml` — composite GitHub Action wrapping CLI
  * Details: .copilot-tracking/details/2026-03-06/phase2-crawling-cicd-details.md (Lines 1662-1710)
* [ ] Step 10.2: Update `Dockerfile` — add crawlee dependencies and memory tuning
  * Details: .copilot-tracking/details/2026-03-06/phase2-crawling-cicd-details.md (Lines 1712-1745)
* [ ] Step 10.3: Validate phase changes
  * Run `npm run lint` and `npm run build`

### [ ] Implementation Phase 11: Final Validation

<!-- parallelizable: false -->

* [ ] Step 11.1: Run full project validation
  * Execute `npm run lint`
  * Execute `npm run build`
  * Manual smoke test: single-page scan (Phase 1 backward compat)
  * Manual smoke test: site crawl with a small test site
  * Manual smoke test: CI endpoint with threshold evaluation
* [ ] Step 11.2: Fix minor validation issues
  * Iterate on lint errors and build warnings
  * Apply fixes directly when corrections are straightforward
* [ ] Step 11.3: Report blocking issues
  * Document issues requiring additional research
  * Provide user with next steps and recommended planning
  * Avoid large-scale fixes within this phase

## Planning Log

See [phase2-crawling-cicd-log.md](../logs/2026-03-06/phase2-crawling-cicd-log.md) for discrepancy tracking, implementation paths considered, and suggested follow-on work.

## Dependencies

* `crawlee` — PlaywrightCrawler for site crawling with built-in URL dedup and concurrency
* `sitemapper` — Sitemap XML discovery and parsing
* `robots-parser` — robots.txt compliance checking
* `p-queue` — Lightweight concurrency control for CI-mode orchestration
* `commander` — CLI framework for the `a11y-scan` command-line tool
* Node.js 20+, Next.js 15, Playwright, axe-core (existing)

## Success Criteria

* User can enter a root URL and get a site-wide accessibility report covering discovered sub-pages — Traces to: user requirement (multi-page crawling)
* Crawling respects configurable depth (default 3), page limit (default 50), and same-hostname boundary — Traces to: research Lines 112-118
* Aggregated report shows per-page scores + overall site score with POUR principle breakdown — Traces to: research Lines 182-200
* CI/CD endpoint accepts configuration (URL, thresholds) and returns JSON/SARIF/JUnit results with `passed` boolean — Traces to: user requirement (CI/CD integration)
* `a11y-scan` CLI tool supports `--url`, `--threshold`, `--format`, `--output` with exit codes 0/1/2 — Traces to: research Lines 222-230
* GitHub Actions composite action wraps CLI with SARIF upload support — Traces to: research Lines 530-575
* Phase 1 single-page scanning remains fully backward-compatible — Traces to: user requirement (backward compatibility)
* `npm run lint` and `npm run build` pass with zero errors — Traces to: derived objective (code quality)
