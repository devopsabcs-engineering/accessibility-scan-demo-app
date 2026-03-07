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

### [x] Implementation Phase 1: Types, Engine Refactor, and Store Extension

<!-- parallelizable: true -->

* [x] Step 1.1: Create `src/lib/types/crawl.ts` with all crawl/site types
  * Details: .copilot-tracking/details/2026-03-06/phase2-crawling-cicd-details.md (Lines 15-85)
* [x] Step 1.2: Refactor `src/lib/scanner/engine.ts` — extract `scanPage(page)` and wrap `scanUrl(url)` for backward compatibility
  * Details: .copilot-tracking/details/2026-03-06/phase2-crawling-cicd-details.md (Lines 87-140)
* [x] Step 1.3: Extend `src/lib/scanner/store.ts` with `CrawlRecord` CRUD and TTL cleanup
  * Details: .copilot-tracking/details/2026-03-06/phase2-crawling-cicd-details.md (Lines 142-200)
* [x] Step 1.4: Validate phase changes
  * Run `npm run lint` and `npm run build` for modified files

### [x] Implementation Phase 2: Crawler Module

<!-- parallelizable: false -->

* [x] Step 2.1: Install crawling dependencies (`crawlee`, `sitemapper`, `robots-parser`)
  * Details: .copilot-tracking/details/2026-03-06/phase2-crawling-cicd-details.md (Lines 202-220)
* [x] Step 2.2: Create `src/lib/crawler/url-utils.ts`
  * Details: .copilot-tracking/details/2026-03-06/phase2-crawling-cicd-details.md (Lines 222-270)
* [x] Step 2.3: Create `src/lib/crawler/robots.ts`
  * Details: .copilot-tracking/details/2026-03-06/phase2-crawling-cicd-details.md (Lines 272-310)
* [x] Step 2.4: Create `src/lib/crawler/sitemap.ts`
  * Details: .copilot-tracking/details/2026-03-06/phase2-crawling-cicd-details.md (Lines 312-350)
* [x] Step 2.5: Create `src/lib/crawler/site-crawler.ts`
  * Details: .copilot-tracking/details/2026-03-06/phase2-crawling-cicd-details.md (Lines 352-450)
* [x] Step 2.6: Validate phase changes
  * Run `npm run lint` and `npm run build`

### [x] Implementation Phase 3: Site Scoring and Aggregation

<!-- parallelizable: true -->

* [x] Step 3.1: Create `src/lib/scoring/site-calculator.ts`
  * Details: .copilot-tracking/details/2026-03-06/phase2-crawling-cicd-details.md (Lines 452-510)
* [x] Step 3.2: Validate phase changes
  * Run `npm run lint` and `npm run build`

### [x] Implementation Phase 4: Crawl API Routes

<!-- parallelizable: false -->

* [x] Step 4.1: Create `src/app/api/crawl/route.ts`
  * Details: .copilot-tracking/details/2026-03-06/phase2-crawling-cicd-details.md (Lines 512-565)
* [x] Step 4.2: Create `src/app/api/crawl/[id]/route.ts`
  * Details: .copilot-tracking/details/2026-03-06/phase2-crawling-cicd-details.md (Lines 567-600)
* [x] Step 4.3: Create `src/app/api/crawl/[id]/status/route.ts`
  * Details: .copilot-tracking/details/2026-03-06/phase2-crawling-cicd-details.md (Lines 602-650)
* [x] Step 4.4: Create `src/app/api/crawl/[id]/pages/route.ts`
  * Details: .copilot-tracking/details/2026-03-06/phase2-crawling-cicd-details.md (Lines 652-680)
* [x] Step 4.5: Create `src/app/api/crawl/[id]/pages/[pageId]/route.ts`
  * Details: .copilot-tracking/details/2026-03-06/phase2-crawling-cicd-details.md (Lines 682-710)
* [x] Step 4.6: Create `src/app/api/crawl/[id]/cancel/route.ts`
  * Details: .copilot-tracking/details/2026-03-06/phase2-crawling-cicd-details.md (Lines 712-740)
* [x] Step 4.7: Create `src/app/api/crawl/[id]/report/route.ts`
  * Details: .copilot-tracking/details/2026-03-06/phase2-crawling-cicd-details.md (Lines 742-770)
* [x] Step 4.8: Validate phase changes
  * Run `npm run lint` and `npm run build`

### [x] Implementation Phase 5: Site Reports and PDF

<!-- parallelizable: true -->

* [x] Step 5.1: Create `src/lib/report/site-generator.ts`
  * Details: .copilot-tracking/details/2026-03-06/phase2-crawling-cicd-details.md (Lines 772-820)
* [x] Step 5.2: Create `src/lib/report/templates/site-report-template.ts`
  * Details: .copilot-tracking/details/2026-03-06/phase2-crawling-cicd-details.md (Lines 822-870)
* [x] Step 5.3: Create `src/app/api/crawl/[id]/pdf/route.ts`
  * Details: .copilot-tracking/details/2026-03-06/phase2-crawling-cicd-details.md (Lines 872-910)
* [x] Step 5.4: Create `src/app/api/crawl/[id]/pages/[pageId]/pdf/route.ts`
  * Details: .copilot-tracking/details/2026-03-06/phase2-crawling-cicd-details.md (Lines 912-940)
* [x] Step 5.5: Validate phase changes
  * Run `npm run lint` and `npm run build`

### [x] Implementation Phase 6: Crawl UI Components

<!-- parallelizable: true -->

* [x] Step 6.1: Extend `src/components/ScanForm.tsx` with crawl mode toggle
  * Details: .copilot-tracking/details/2026-03-06/phase2-crawling-cicd-details.md (Lines 942-985)
* [x] Step 6.2: Create `src/components/CrawlProgress.tsx`
  * Details: .copilot-tracking/details/2026-03-06/phase2-crawling-cicd-details.md (Lines 987-1030)
* [x] Step 6.3: Create `src/components/PageList.tsx`
  * Details: .copilot-tracking/details/2026-03-06/phase2-crawling-cicd-details.md (Lines 1032-1070)
* [x] Step 6.4: Create `src/components/SiteScoreDisplay.tsx`
  * Details: .copilot-tracking/details/2026-03-06/phase2-crawling-cicd-details.md (Lines 1072-1110)
* [x] Step 6.5: Create `src/app/crawl/[id]/page.tsx`
  * Details: .copilot-tracking/details/2026-03-06/phase2-crawling-cicd-details.md (Lines 1112-1155)
* [x] Step 6.6: Extend `src/app/page.tsx`
  * Details: .copilot-tracking/details/2026-03-06/phase2-crawling-cicd-details.md (Lines 1157-1180)
* [x] Step 6.7: Validate phase changes
  * Run `npm run lint` and `npm run build`

### [x] Implementation Phase 7: SARIF and CI/CD Foundation

<!-- parallelizable: true -->

* [x] Step 7.1: Create `src/lib/report/sarif-generator.ts`
  * Details: .copilot-tracking/details/2026-03-06/phase2-crawling-cicd-details.md (Lines 1182-1240)
* [x] Step 7.2: Create `src/lib/ci/threshold.ts`
  * Details: .copilot-tracking/details/2026-03-06/phase2-crawling-cicd-details.md (Lines 1242-1290)
* [x] Step 7.3: Create `src/lib/ci/formatters/json.ts`
  * Details: .copilot-tracking/details/2026-03-06/phase2-crawling-cicd-details.md (Lines 1292-1320)
* [x] Step 7.4: Create `src/lib/ci/formatters/sarif.ts`
  * Details: .copilot-tracking/details/2026-03-06/phase2-crawling-cicd-details.md (Lines 1322-1350)
* [x] Step 7.5: Create `src/lib/ci/formatters/junit.ts`
  * Details: .copilot-tracking/details/2026-03-06/phase2-crawling-cicd-details.md (Lines 1352-1380)
* [x] Step 7.6: Validate phase changes
  * Run `npm run lint` and `npm run build`

### [x] Implementation Phase 8: CI API Routes

<!-- parallelizable: false -->

* [x] Step 8.1: Create `src/app/api/ci/scan/route.ts`
  * Details: .copilot-tracking/details/2026-03-06/phase2-crawling-cicd-details.md (Lines 1382-1430)
* [x] Step 8.2: Create `src/app/api/ci/crawl/route.ts`
  * Details: .copilot-tracking/details/2026-03-06/phase2-crawling-cicd-details.md (Lines 1432-1480)
* [x] Step 8.3: Validate phase changes
  * Run `npm run lint` and `npm run build`

### [x] Implementation Phase 9: CLI Tool

<!-- parallelizable: false -->

* [x] Step 9.1: Install CLI dependency (`commander`)
  * Details: .copilot-tracking/details/2026-03-06/phase2-crawling-cicd-details.md (Lines 1482-1495)
* [x] Step 9.2: Create `src/cli/bin/a11y-scan.ts`
  * Details: .copilot-tracking/details/2026-03-06/phase2-crawling-cicd-details.md (Lines 1497-1540)
* [x] Step 9.3: Create `src/cli/commands/scan.ts`
  * Details: .copilot-tracking/details/2026-03-06/phase2-crawling-cicd-details.md (Lines 1542-1580)
* [x] Step 9.4: Create `src/cli/commands/crawl.ts`
  * Details: .copilot-tracking/details/2026-03-06/phase2-crawling-cicd-details.md (Lines 1582-1620)
* [x] Step 9.5: Create `src/cli/config/loader.ts`
  * Details: .copilot-tracking/details/2026-03-06/phase2-crawling-cicd-details.md (Lines 1622-1660)
* [x] Step 9.6: Validate phase changes
  * Run `npm run lint` and `npm run build`

### [x] Implementation Phase 10: GitHub Action and Docker Updates

<!-- parallelizable: true -->

* [x] Step 10.1: Create `action/action.yml`
  * Details: .copilot-tracking/details/2026-03-06/phase2-crawling-cicd-details.md (Lines 1662-1710)
* [x] Step 10.2: Create `azure-pipelines/a11y-scan.yml`
  * Details: .copilot-tracking/details/2026-03-06/phase2-crawling-cicd-details.md (Lines 1712-1755)
* [x] Step 10.3: Update `Dockerfile`
  * Details: .copilot-tracking/details/2026-03-06/phase2-crawling-cicd-details.md (Lines 1757-1790)
* [x] Step 10.4: Validate phase changes
  * Run `npm run lint` and `npm run build`

### [x] Implementation Phase 11: Final Validation

<!-- parallelizable: false -->

* [x] Step 11.1: Run full project validation
  * Execute `npm run lint` — passed, zero errors
  * Execute `npm run build` — passed, compiled in 16.4s, all routes generated
  * Manual smoke test: deferred to user
* [x] Step 11.2: Fix minor validation issues
  * No issues found — lint and build clean
* [x] Step 11.3: Report blocking issues
  * No blocking issues — 3 pre-existing sitemapper dependency warnings only

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
* Azure DevOps pipeline example documented with JUnit output and `PublishTestResults` — Traces to: user requirement (CI/CD integration), research Lines 601-625
* Phase 1 single-page scanning remains fully backward-compatible — Traces to: user requirement (backward compatibility)
* `npm run lint` and `npm run build` pass with zero errors — Traces to: derived objective (code quality)
