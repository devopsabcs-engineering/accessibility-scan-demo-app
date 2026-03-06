<!-- markdownlint-disable-file -->
# Implementation Details: Phase 2 — Site Crawling & CI/CD Integration

## Context Reference

Sources:
* `.copilot-tracking/research/2026-03-06/phase2-crawling-cicd-research.md` — Primary research
* `.copilot-tracking/research/subagents/2026-03-06/site-crawling-research.md` — Crawling libraries
* `.copilot-tracking/research/subagents/2026-03-06/cicd-integration-research.md` — CI/CD tools
* `.copilot-tracking/research/subagents/2026-03-06/api-store-aggregation-research.md` — API, store, scoring

## Implementation Phase 1: Types, Engine Refactor, and Store Extension

<!-- parallelizable: true -->

### Step 1.1: Create `src/lib/types/crawl.ts` with all crawl/site types

Create a new types file for all Phase 2 crawling and site-wide types. Import existing types from `scan.ts` and `score.ts` to reuse Phase 1 interfaces.

Files:
* `src/lib/types/crawl.ts` - NEW: all crawl, site-score, aggregation, and CI types

Type definitions to include:

```typescript
import type { ScanStatus, ScanResults } from './scan';
import type { ScoreGrade, ScoreResult, PrincipleScores, ImpactBreakdown } from './score';

// ---------- Crawl Core ----------

export type CrawlStatus = 'pending' | 'discovering' | 'scanning' | 'aggregating' | 'complete' | 'error' | 'cancelled';

export interface CrawlConfig {
  maxPages: number;          // default: 50, max: 200
  maxDepth: number;          // default: 3
  concurrency: number;       // default: 3, max: 5
  delayMs: number;           // default: 1000
  includePatterns: string[];
  excludePatterns: string[];
  respectRobotsTxt: boolean; // default: true
  followSitemaps: boolean;   // default: true
  domainStrategy: 'same-hostname' | 'same-domain'; // default: 'same-hostname'
}

export interface CrawlRequest {
  url: string;
  maxPages?: number;
  maxDepth?: number;
  concurrency?: number;
  delayMs?: number;
  includePatterns?: string[];
  excludePatterns?: string[];
  respectRobotsTxt?: boolean;
  followSitemaps?: boolean;
  domainStrategy?: 'same-hostname' | 'same-domain';
}

export interface CrawlRecord {
  id: string;
  seedUrl: string;
  config: CrawlConfig;
  status: CrawlStatus;
  progress: number;
  message: string;
  startedAt: string;
  completedAt?: string;
  error?: string;
  discoveredUrls: string[];
  pageIds: string[];            // references to ScanRecord IDs in store
  completedPageCount: number;
  failedPageCount: number;
  totalPageCount: number;
  siteScore?: SiteScoreResult;
  aggregatedViolations?: AggregatedViolation[];
  abortController?: AbortController; // for cancellation — not serialized
}

// ---------- Page Summary ----------

export interface PageSummary {
  pageId: string;
  url: string;
  score: number;
  grade: ScoreGrade;
  violationCount: number;
  passCount: number;
  status: ScanStatus;
  scannedAt: string;
}

// ---------- Aggregated Violations ----------

export interface AggregatedViolation {
  ruleId: string;
  impact: 'critical' | 'serious' | 'moderate' | 'minor';
  description: string;
  help: string;
  helpUrl: string;
  principle: string;
  totalInstances: number;
  affectedPages: { url: string; pageId: string; nodeCount: number }[];
}

// ---------- Site Score ----------

export interface SiteScoreResult {
  overallScore: number;
  grade: ScoreGrade;
  lowestPageScore: number;
  highestPageScore: number;
  medianPageScore: number;
  pageCount: number;
  principleScores: PrincipleScores;
  impactBreakdown: ImpactBreakdown;
  totalUniqueViolations: number;
  totalViolationInstances: number;
  totalPasses: number;
  aodaCompliant: boolean;
}

// ---------- Site Report ----------

export interface SiteReportData {
  seedUrl: string;
  scanDate: string;
  engineVersion: string;
  siteScore: SiteScoreResult;
  aggregatedViolations: AggregatedViolation[];
  pageSummaries: PageSummary[];
  config: CrawlConfig;
  aodaNote: string;
  disclaimer: string;
}

// ---------- Crawl Progress (SSE) ----------

export interface CrawlProgressEvent {
  status: CrawlStatus;
  progress: number;
  message: string;
  totalPages: number;
  completedPages: number;
  failedPages: number;
  currentPage?: string;
  pagesCompleted: PageSummary[];
}

// ---------- CI/CD Types ----------

export interface CiScanRequest {
  url: string;
  standard?: 'WCAG2A' | 'WCAG2AA' | 'WCAG2AAA';
  threshold?: ThresholdConfig;
  format?: 'json' | 'sarif' | 'junit';
}

export interface CiCrawlRequest extends CiScanRequest {
  maxPages?: number;
  maxDepth?: number;
  concurrency?: number;
}

export interface ThresholdConfig {
  score?: number;                 // minimum score (0-100)
  maxViolations?: {
    critical?: number | null;
    serious?: number | null;
    moderate?: number | null;
    minor?: number | null;
  };
  failOnRules?: string[];         // axe rule IDs that must pass
  ignoreRules?: string[];         // axe rule IDs to exclude
}

export interface CiResult {
  passed: boolean;
  score: number;
  grade: ScoreGrade;
  url: string;
  timestamp: string;
  violationCount: number;
  thresholdEvaluation: ThresholdEvaluation;
  violations: CiViolationSummary[];
}

export interface ThresholdEvaluation {
  scorePassed: boolean;
  countPassed: boolean;
  rulePassed: boolean;
  details: string[];
}

export interface CiViolationSummary {
  ruleId: string;
  impact: string;
  description: string;
  instanceCount: number;
  helpUrl: string;
}

// Re-export Phase 1 types for convenience
export type { ScanStatus, ScanResults, ScanRecord } from './scan';
export type { ScoreResult, ScoreGrade, PrincipleScores, ImpactBreakdown } from './score';
```

Discrepancy references:
* None — types align directly with research Lines 425-530

Success criteria:
* File compiles with `npm run build`
* All interfaces match research type definitions
* Existing Phase 1 type files unchanged

Context references:
* `src/lib/types/scan.ts` (Lines 1-77) — existing Phase 1 scan types
* `src/lib/types/score.ts` (Lines 1-37) — existing Phase 1 score types
* Research (Lines 425-530) — type definitions

Dependencies:
* None — pure type file

### Step 1.2: Refactor `src/lib/scanner/engine.ts` — extract `scanPage(page)` and wrap `scanUrl(url)`

Modify the existing engine to export a new `scanPage(page: Page)` function that accepts an already-created Playwright `Page` object. The existing `scanUrl(url)` function keeps its signature but internally calls `scanPage(page)` for backward compatibility.

Files:
* `src/lib/scanner/engine.ts` - MODIFY: extract `scanPage()`, refactor `scanUrl()` to call it

Refactored structure:

```typescript
import { chromium, type Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const axeSource = fs.readFileSync(
  path.resolve(process.cwd(), 'node_modules', 'axe-core', 'axe.min.js'),
  'utf-8'
);

/**
 * Scan an already-navigated Playwright Page with axe-core.
 * Used by the crawler where the crawler manages browser lifecycle.
 */
export async function scanPage(page: Page): Promise<import('axe-core').AxeResults> {
  // Inject axe-core
  await page.evaluate(`var module = { exports: {} }; ${axeSource}`);
  // Run axe analysis with WCAG 2.2 AA tags
  return page.evaluate(() => {
    return (window as unknown as { axe: { run: (options: object) => Promise<unknown> } }).axe.run({
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'],
      },
    });
  }) as Promise<import('axe-core').AxeResults>;
}

/**
 * Backward-compatible wrapper: launches browser, navigates, scans, closes.
 * Used by Phase 1 single-page scan API.
 */
export async function scanUrl(
  url: string,
  onProgress?: (status: string, progress: number) => void
) {
  onProgress?.('navigating', 10);
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const context = await browser.newContext({ viewport: { width: 1280, height: 1024 } });
  const page = await context.newPage();
  try {
    try {
      await page.goto(url, { waitUntil: 'load', timeout: 30000 });
    } catch (navError: unknown) {
      if (navError instanceof Error && navError.message.includes('Timeout')) {
        await page.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => {});
      } else {
        throw navError;
      }
    }
    onProgress?.('scanning', 40);
    const results = await scanPage(page);
    onProgress?.('scoring', 80);
    return results;
  } finally {
    await browser.close();
  }
}
```

Key changes from existing `engine.ts` (Lines 1-66):
* Extract `scanPage(page: Page)` as new export (Lines 15-28 in refactored file)
* `scanUrl()` calls `scanPage(page)` instead of inline axe evaluation (Line 50 in refactored)
* Import `type Page` from `playwright` (Line 1)
* Existing `scanUrl()` signature and behavior unchanged

Discrepancy references:
* None — aligns with research Lines 126-140

Success criteria:
* `scanUrl()` signature unchanged — Phase 1 API routes compile without changes
* `scanPage()` exported and accepts `Page` parameter
* `npm run build` passes

Context references:
* `src/lib/scanner/engine.ts` (Lines 1-66) — current implementation
* Research (Lines 126-140) — engine refactoring rationale

Dependencies:
* None — refactor of existing file

### Step 1.3: Extend `src/lib/scanner/store.ts` with `CrawlRecord` CRUD and TTL cleanup

Add crawl record management alongside existing scan records. Add TTL-based cleanup to prevent memory leaks from long-running processes. Keep existing `createScan`, `getScan`, `updateScan` unchanged.

Files:
* `src/lib/scanner/store.ts` - MODIFY: add crawl Map, CRUD functions, TTL cleanup

New functions to add:

```typescript
import type { ScanRecord } from '../types/scan';
import type { CrawlRecord } from '../types/crawl';

const scans = new Map<string, ScanRecord>();
const crawls = new Map<string, CrawlRecord>();

// ---------- Scan CRUD (UNCHANGED) ----------
export function createScan(id: string, url: string): ScanRecord { /* existing */ }
export function getScan(id: string): ScanRecord | undefined { /* existing */ }
export function updateScan(id: string, updates: Partial<ScanRecord>): void { /* existing */ }

// ---------- Crawl CRUD (NEW) ----------
export function createCrawl(id: string, seedUrl: string, config: CrawlConfig): CrawlRecord {
  const record: CrawlRecord = {
    id, seedUrl, config,
    status: 'pending', progress: 0, message: 'Crawl queued',
    startedAt: new Date().toISOString(),
    discoveredUrls: [], pageIds: [],
    completedPageCount: 0, failedPageCount: 0, totalPageCount: 0,
  };
  crawls.set(id, record);
  return record;
}

export function getCrawl(id: string): CrawlRecord | undefined {
  return crawls.get(id);
}

export function updateCrawl(id: string, updates: Partial<CrawlRecord>): void {
  const crawl = crawls.get(id);
  if (crawl) Object.assign(crawl, updates);
}

export function deleteCrawl(id: string): void {
  crawls.delete(id);
}

export function getAllCrawls(): CrawlRecord[] {
  return Array.from(crawls.values());
}

// ---------- TTL Cleanup (NEW) ----------
const SCAN_TTL_MS = 60 * 60 * 1000;       // 1 hour
const CRAWL_TTL_MS = 4 * 60 * 60 * 1000;  // 4 hours
const CLEANUP_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

function cleanupExpired(): void {
  const now = Date.now();
  for (const [id, scan] of scans) {
    if (scan.status === 'complete' || scan.status === 'error') {
      const age = now - new Date(scan.startedAt).getTime();
      if (age > SCAN_TTL_MS) scans.delete(id);
    }
  }
  for (const [id, crawl] of crawls) {
    if (crawl.status === 'complete' || crawl.status === 'error' || crawl.status === 'cancelled') {
      const age = now - new Date(crawl.startedAt).getTime();
      if (age > CRAWL_TTL_MS) {
        // Also clean up associated scan records
        for (const pageId of crawl.pageIds) scans.delete(pageId);
        crawls.delete(id);
      }
    }
  }
}

// Start cleanup interval
setInterval(cleanupExpired, CLEANUP_INTERVAL_MS);
```

Key changes from existing `store.ts` (Lines 1-28):
* Add `crawls` Map (Line 5 in refactored)
* Import `CrawlRecord` and `CrawlConfig` from `../types/crawl`
* Five new crawl CRUD functions
* TTL cleanup running every 30 minutes
* Existing scan functions UNCHANGED

Discrepancy references:
* None — aligns with research Lines 155-180

Success criteria:
* Existing `createScan`, `getScan`, `updateScan` signatures unchanged
* New crawl CRUD functions exported
* `npm run build` passes

Context references:
* `src/lib/scanner/store.ts` (Lines 1-28) — current implementation
* Research (Lines 155-180) — store evolution design

Dependencies:
* Step 1.1 completion (crawl types)

### Step 1.4: Validate phase changes

Run lint and build commands for modified files.

Validation commands:
* `npm run lint` — full project lint
* `npm run build` — full project build

## Implementation Phase 2: Crawler Module

<!-- parallelizable: false -->

### Step 2.1: Install crawling dependencies

Install the three crawling libraries identified in research.

Files:
* `package.json` - MODIFY: add dependencies

Commands:
```bash
npm install crawlee sitemapper robots-parser
```

Expected additions to `package.json` dependencies:
* `crawlee` — PlaywrightCrawler, RequestQueue, enqueueLinks, BrowserPool
* `sitemapper` — sitemap XML parsing
* `robots-parser` — robots.txt compliance

Success criteria:
* `npm install` completes without errors
* `package-lock.json` updated
* `crawlee`, `sitemapper`, `robots-parser` in `node_modules`

Context references:
* Research (Lines 72-78) — library selection rationale
* Research (Lines 401-406) — install commands

Dependencies:
* None

### Step 2.2: Create `src/lib/crawler/url-utils.ts` — URL normalization, domain filtering, link validation

Utility functions for URL normalization and domain boundary enforcement. Used by the crawler to deduplicate URLs and filter out-of-scope links.

Files:
* `src/lib/crawler/url-utils.ts` - NEW: URL utility functions

Functions to implement:

```typescript
/**
 * Normalize a URL for deduplication:
 * - Lowercase hostname
 * - Remove fragment (#...)
 * - Remove trailing slash (except root)
 * - Remove tracking parameters (utm_*, fbclid, gclid)
 * - Remove default ports (80 for http, 443 for https)
 * - Sort query parameters alphabetically
 */
export function normalizeUrl(urlString: string): string { ... }

/**
 * Check if a URL matches the domain boundary strategy.
 * 'same-hostname': exact hostname match
 * 'same-domain': same registrable domain (e.g., sub.example.com matches example.com)
 */
export function isWithinDomainBoundary(
  candidateUrl: string,
  seedUrl: string,
  strategy: 'same-hostname' | 'same-domain'
): boolean { ... }

/**
 * Check if a URL should be scanned (HTML page, not binary/asset).
 * Exclude common non-page extensions: .pdf, .jpg, .png, .gif, .svg, .css, .js, .zip, etc.
 */
export function isScannable(url: string): boolean { ... }

/**
 * Apply include/exclude patterns (glob-style) to filter URLs.
 */
export function matchesPatterns(
  url: string,
  includePatterns: string[],
  excludePatterns: string[]
): boolean { ... }
```

Discrepancy references:
* None — aligns with research URL normalization guidance

Success criteria:
* `normalizeUrl` removes fragments, trailing slashes, tracking params
* `isWithinDomainBoundary` enforces both strategies
* `isScannable` excludes binary/asset URLs
* Pure functions, no side effects

Context references:
* Research (Lines 112-118) — domain boundary and defaults
* Research "URL normalization" section in subagent research

Dependencies:
* None — pure utility functions

### Step 2.3: Create `src/lib/crawler/robots.ts` — robots.txt fetching and compliance checking

Wrapper around `robots-parser` for robots.txt compliance. Handles fetching, parsing, caching per hostname, user-agent checking, and crawl delay extraction.

Files:
* `src/lib/crawler/robots.ts` - NEW: robots.txt compliance module

Functions to implement:

```typescript
import robotsParser from 'robots-parser';

const CUSTOM_USER_AGENT = 'AccessibilityScanBot/1.0';

/**
 * Fetch and parse robots.txt for a given URL's origin.
 * Caches per hostname to avoid repeated fetches during a crawl.
 */
export async function getRobotsParser(originUrl: string): Promise<RobotsParser> { ... }

/**
 * Check if a URL is allowed by robots.txt for our user agent.
 */
export async function isAllowedByRobots(url: string): Promise<boolean> { ... }

/**
 * Get the crawl delay from robots.txt (for our user agent or wildcard).
 * Returns delay in milliseconds, or null if not specified.
 */
export async function getCrawlDelay(originUrl: string): Promise<number | null> { ... }

/**
 * Get sitemap URLs listed in robots.txt.
 */
export async function getSitemapUrls(originUrl: string): Promise<string[]> { ... }

/**
 * Clear the robots.txt cache (called when a crawl finishes).
 */
export function clearRobotsCache(): void { ... }
```

Discrepancy references:
* None — aligns with research Lines 239-244

Success criteria:
* Fetches and caches robots.txt per origin
* `isAllowedByRobots` returns false for disallowed paths
* Gracefully handles missing/malformed robots.txt (allow all)
* Custom user-agent string used

Context references:
* Research (Lines 239-244) — ethical crawling requirements
* Research (Lines 102-108) — robots-parser library details

Dependencies:
* Step 2.1 completion (robots-parser installed)

### Step 2.4: Create `src/lib/crawler/sitemap.ts` — sitemap discovery and URL extraction

Sitemap discovery via robots.txt sitemaps + standard `/sitemap.xml` location. Parses sitemap indexes recursively. Returns deduplicated URL list.

Files:
* `src/lib/crawler/sitemap.ts` - NEW: sitemap discovery and parsing

Functions to implement:

```typescript
import Sitemapper from 'sitemapper';

/**
 * Discover and parse sitemaps for a given origin URL.
 * Discovery order:
 * 1. Check robots.txt for Sitemap directives
 * 2. Try standard /sitemap.xml location
 * 3. Try /sitemap_index.xml
 * Returns deduplicated array of page URLs from all discovered sitemaps.
 */
export async function discoverSitemapUrls(
  originUrl: string,
  sitemapUrlsFromRobots: string[]
): Promise<string[]> { ... }
```

Discrepancy references:
* None — aligns with research combined discovery approach

Success criteria:
* Discovers sitemaps from robots.txt and standard locations
* Handles sitemap indexes recursively
* Returns deduplicated URLs
* Gracefully handles missing/invalid sitemaps (returns empty array)

Context references:
* Research (Lines 112-118) — combined discovery approach
* Research subagent site-crawling-research — sitemapper details

Dependencies:
* Step 2.1 completion (sitemapper installed)
* Step 2.3 completion (robots.ts for sitemap URLs from robots.txt)

### Step 2.5: Create `src/lib/crawler/site-crawler.ts` — crawlee PlaywrightCrawler orchestration

Core crawling orchestration using crawlee's `PlaywrightCrawler`. Manages the full lifecycle: robots.txt check → sitemap discovery → BFS crawling with `enqueueLinks()` → per-page axe scanning → result storage → progress events.

Files:
* `src/lib/crawler/site-crawler.ts` - NEW: main crawler module

Functions to implement:

```typescript
import { PlaywrightCrawler, Configuration } from 'crawlee';
import { scanPage } from '../scanner/engine';
import { parseAxeResults } from '../scanner/result-parser';
import { calculateScore } from '../scoring/calculator';
import { createScan, updateScan, getCrawl, updateCrawl } from '../scanner/store';
import { normalizeUrl, isWithinDomainBoundary, isScannable, matchesPatterns } from './url-utils';
import { isAllowedByRobots, getCrawlDelay, clearRobotsCache } from './robots';
import { discoverSitemapUrls } from './sitemap';
import type { CrawlConfig, CrawlRecord, CrawlProgressEvent } from '../types/crawl';

export type ProgressCallback = (event: CrawlProgressEvent) => void;

/**
 * Start a site crawl. Runs asynchronously, updates store as pages complete.
 * 
 * Flow:
 * 1. Validate seed URL and fetch robots.txt
 * 2. Discover sitemap URLs and seed the queue
 * 3. Launch PlaywrightCrawler with BFS traversal
 * 4. For each page: navigate → scanPage() → parse → score → store
 * 5. Emit progress events per page completion
 * 6. On completion: aggregate results and update crawl record
 */
export async function startCrawl(
  crawlId: string,
  seedUrl: string,
  config: CrawlConfig,
  onProgress?: ProgressCallback
): Promise<void> { ... }

/**
 * Cancel a running crawl by aborting its AbortController.
 */
export function cancelCrawl(crawlId: string): boolean { ... }
```

Implementation outline for `startCrawl`:

1. Create `AbortController`, store reference on `CrawlRecord`
2. Update crawl status to `'discovering'`
3. Fetch robots.txt → get crawl delay, sitemap URLs
4. Discover sitemap URLs via `discoverSitemapUrls()`
5. Configure crawlee: `Configuration.getGlobalConfig().set('persistStorage', false)`
6. Create `PlaywrightCrawler` with:
   * `maxRequestsPerCrawl: config.maxPages`
   * `maxConcurrency: config.concurrency`
   * `requestHandlerTimeoutSecs: 60`
   * `launchContext: { launchOptions: { headless: true, args: ['--no-sandbox'] } }`
   * `browserPoolOptions: { useFingerprints: false }`
7. In `requestHandler`: check domain boundary, robots.txt, patterns → `scanPage(page)` → `parseAxeResults()` → `calculateScore()` → store as `ScanRecord` → emit progress
8. In `requestHandler`: call `enqueueLinks({ strategy: 'same-hostname' })` for link discovery
9. Seed queue with sitemap URLs + seed URL
10. `await crawler.run(seedUrls)` with abort signal
11. On completion: update crawl status to `'aggregating'`, compute site score, update to `'complete'`
12. Cleanup: `clearRobotsCache()`

Key design decisions:
* One browser instance with multiple `BrowserContext`s (crawlee default)
* `Promise.allSettled` pattern — failed pages tracked but don't halt crawl
* Progress events emitted per page completion for SSE streaming
* Respect `config.maxDepth` via `enqueueLinks` depth tracking

Discrepancy references:
* None — directly implements research Scenario A architecture

Success criteria:
* Crawl completes with discovered pages scanned
* Respects maxPages, maxDepth, concurrency limits
* Respects robots.txt and domain boundary
* Updates store with per-page ScanRecords and CrawlRecord
* Emits progress events per page
* Handles cancellation via AbortController
* Failed pages don't halt the crawl

Context references:
* Research (Lines 158-175) — crawlee PlaywrightCrawler configuration
* Research (Lines 112-118) — crawl defaults and limits
* Research (Lines 239-244) — ethical crawling
* `src/lib/scanner/engine.ts` (Lines 1-66) — existing scanUrl pattern

Dependencies:
* Step 1.1 completion (crawl types)
* Step 1.2 completion (scanPage function)
* Step 1.3 completion (store crawl CRUD)
* Step 2.2 completion (url-utils)
* Step 2.3 completion (robots)
* Step 2.4 completion (sitemap)

### Step 2.6: Validate phase changes

Run lint and build commands for all modified and new files.

Validation commands:
* `npm run lint` — full project lint
* `npm run build` — full project build

## Implementation Phase 3: Site Scoring and Aggregation

<!-- parallelizable: true -->

### Step 3.1: Create `src/lib/scoring/site-calculator.ts` — aggregate page scores into `SiteScoreResult`

Aggregate individual page `ScoreResult`s into a site-wide `SiteScoreResult`. Also produce `AggregatedViolation` list deduplicating violations by rule ID across pages.

Files:
* `src/lib/scoring/site-calculator.ts` - NEW: site-wide aggregation logic

Functions to implement:

```typescript
import type { ScanRecord, ScanResults } from '../types/scan';
import type { ScoreResult, PrincipleScores, ImpactBreakdown, ScoreGrade } from '../types/score';
import type { SiteScoreResult, AggregatedViolation, PageSummary } from '../types/crawl';
import { mapTagToPrinciple } from './wcag-mapper';

/**
 * Calculate site-wide score from completed page scan records.
 * - overallScore = arithmetic mean of page scores
 * - aodaCompliant = true only if ALL pages have zero violations
 * - principleScores = sum across all pages
 * - Deduplicates violations by rule ID, tracks affected pages
 */
export function calculateSiteScore(pageRecords: ScanRecord[]): SiteScoreResult { ... }

/**
 * Aggregate violations across all pages.
 * Group by rule ID, count total instances, track affected pages.
 */
export function aggregateViolations(pageRecords: ScanRecord[]): AggregatedViolation[] { ... }

/**
 * Generate page summaries from scan records.
 */
export function generatePageSummaries(pageRecords: ScanRecord[]): PageSummary[] { ... }

/**
 * Get the grade for a score value (reuse logic from calculator.ts).
 */
function getGrade(score: number): ScoreGrade { ... }
```

Scoring logic:
* `overallScore` = `Math.round(sum(pageScores) / pageCount)`
* `lowestPageScore` = `Math.min(...pageScores)`
* `highestPageScore` = `Math.max(...pageScores)`
* `medianPageScore` = sorted middle value
* `principleScores` = sum violations/passes across all pages per principle
* `impactBreakdown` = sum across all pages
* `aodaCompliant` = every page has zero violations
* `totalUniqueViolations` = unique rule IDs across all pages
* `totalViolationInstances` = sum of all violation nodes across all pages

Discrepancy references:
* None — aligns with research Lines 182-200

Success criteria:
* Correctly computes mean, median, min, max across page scores
* Deduplicates violations by rule ID
* AODA compliance requires ALL pages to have zero violations
* Handles edge cases: empty pages, single page, all failures

Context references:
* `src/lib/scoring/calculator.ts` (Lines 1-87) — existing scoring logic to reuse patterns
* `src/lib/scoring/wcag-mapper.ts` — principle mapping
* Research (Lines 182-200) — aggregation design

Dependencies:
* Step 1.1 completion (crawl types)

### Step 3.2: Validate phase changes

Run lint and build commands.

Validation commands:
* `npm run lint` — project lint
* `npm run build` — project build

## Implementation Phase 4: Crawl API Routes

<!-- parallelizable: false -->

### Step 4.1: Create `src/app/api/crawl/route.ts` — POST to start crawl

Accept POST with `CrawlRequest` body. Validate URL (reuse SSRF protection pattern from `src/app/api/scan/route.ts`), validate config bounds, create crawl record, start async crawl, return 202 with `crawlId`.

Files:
* `src/app/api/crawl/route.ts` - NEW: crawl initiation endpoint

Request/response:
```
POST /api/crawl
Body: CrawlRequest (url required, all other fields optional with defaults)
Response 202: { crawlId: string }
Response 400: { error: string }
```

Implementation notes:
* Reuse `isValidScanUrl()` pattern from `src/app/api/scan/route.ts` (Lines 7-40) — extract to shared utility or duplicate
* Validate config bounds: `maxPages` 1-200, `maxDepth` 1-10, `concurrency` 1-5
* Apply defaults: `{ maxPages: 50, maxDepth: 3, concurrency: 3, delayMs: 1000, includePatterns: [], excludePatterns: [], respectRobotsTxt: true, followSitemaps: true, domainStrategy: 'same-hostname' }`
* Call `createCrawl()` then `startCrawl()` (fire-and-forget, no await)
* Return `202 { crawlId }`

Discrepancy references:
* None — aligns with research API design (Lines 144-155)

Success criteria:
* Returns 202 with crawlId on valid request
* Returns 400 on invalid URL or out-of-bounds config
* SSRF protection blocks private/internal URLs
* Config defaults applied when fields omitted
* Crawl starts asynchronously

Context references:
* `src/app/api/scan/route.ts` (Lines 1-60) — existing POST pattern with SSRF protection
* Research (Lines 144-155) — API route design

Dependencies:
* Phase 1 completion (types, engine, store)
* Phase 2 completion (crawler module)

### Step 4.2: Create `src/app/api/crawl/[id]/route.ts` — GET crawl status and summary

Return current crawl status, progress, page counts, and site score (if complete).

Files:
* `src/app/api/crawl/[id]/route.ts` - NEW: crawl status endpoint

Request/response:
```
GET /api/crawl/:id
Response 200: CrawlRecord (sanitized — omit abortController)
Response 404: { error: 'Crawl not found' }
```

Implementation notes:
* Call `getCrawl(id)` from store
* Strip `abortController` field before serializing
* Return full crawl record including `siteScore` and `aggregatedViolations` when available

Success criteria:
* Returns 200 with crawl data for existing crawl
* Returns 404 for unknown crawl ID
* Does not serialize `abortController`

Context references:
* `src/app/api/scan/[id]/route.ts` — existing pattern for single-scan status
* Research (Lines 144-155) — API design

Dependencies:
* Step 1.3 completion (store getCrawl)

### Step 4.3: Create `src/app/api/crawl/[id]/status/route.ts` — SSE progress stream

Server-Sent Events endpoint streaming per-page crawl progress. Reuse the SSE pattern from `src/app/api/scan/[id]/status/route.ts` but emit `CrawlProgressEvent` objects.

Files:
* `src/app/api/crawl/[id]/status/route.ts` - NEW: crawl SSE progress endpoint

Request/response:
```
GET /api/crawl/:id/status
Response: text/event-stream with CrawlProgressEvent data
```

Implementation notes:
* Use `ReadableStream` pattern from existing scan status endpoint
* Poll crawl record every 500ms or subscribe to progress events
* Events include: status, progress percentage, current page URL, completed page summaries
* Stream closes when crawl status is `complete`, `error`, or `cancelled`

Success criteria:
* SSE stream opens and sends progress events
* Events include per-page completion data
* Stream closes on terminal state
* Returns 404 if crawl not found

Context references:
* `src/app/api/scan/[id]/status/route.ts` — existing SSE pattern
* Research SSE design

Dependencies:
* Step 1.3 completion (store getCrawl)

### Step 4.4: Create `src/app/api/crawl/[id]/pages/route.ts` — GET list of page results

Return array of `PageSummary` objects for all pages in a crawl.

Files:
* `src/app/api/crawl/[id]/pages/route.ts` - NEW: page list endpoint

Request/response:
```
GET /api/crawl/:id/pages
Response 200: { pages: PageSummary[] }
Response 404: { error: 'Crawl not found' }
```

Implementation notes:
* Get crawl record → iterate `pageIds` → get each `ScanRecord` → extract summaries
* Use `generatePageSummaries()` from site-calculator

Success criteria:
* Returns page summaries ordered by scan completion time
* Returns 404 for unknown crawl ID
* Returns empty array if no pages scanned yet

Dependencies:
* Phase 3 completion (site-calculator for summaries)

### Step 4.5: Create `src/app/api/crawl/[id]/pages/[pageId]/route.ts` — GET single page scan result

Return full `ScanRecord` for a specific page within a crawl.

Files:
* `src/app/api/crawl/[id]/pages/[pageId]/route.ts` - NEW: single page result endpoint

Request/response:
```
GET /api/crawl/:id/pages/:pageId
Response 200: ScanRecord
Response 404: { error: 'Page not found' }
```

Implementation notes:
* Validate page belongs to crawl (check `crawl.pageIds.includes(pageId)`)
* Return 404 if crawl or page not found

Success criteria:
* Returns full page scan data including violations
* Validates page belongs to specified crawl
* Returns 404 for missing crawl or page

Dependencies:
* Step 1.3 completion (store)

### Step 4.6: Create `src/app/api/crawl/[id]/cancel/route.ts` — POST to cancel running crawl

Cancel a running crawl by triggering its `AbortController`.

Files:
* `src/app/api/crawl/[id]/cancel/route.ts` - NEW: crawl cancellation endpoint

Request/response:
```
POST /api/crawl/:id/cancel
Response 200: { message: 'Crawl cancelled', crawlId: string }
Response 404: { error: 'Crawl not found' }
Response 409: { error: 'Crawl is not running' }
```

Implementation notes:
* Call `cancelCrawl(id)` from site-crawler module
* Return 409 if crawl already completed/cancelled/errored

Success criteria:
* Running crawl transitions to `cancelled` status
* Returns 409 for non-running crawls
* Returns 404 for unknown crawl ID

Dependencies:
* Phase 2 completion (cancelCrawl function)

### Step 4.7: Create `src/app/api/crawl/[id]/report/route.ts` — GET aggregated site report JSON

Return aggregated site report data for a completed crawl.

Files:
* `src/app/api/crawl/[id]/report/route.ts` - NEW: site report JSON endpoint

Request/response:
```
GET /api/crawl/:id/report
Response 200: SiteReportData
Response 404: { error: 'Crawl not found' }
Response 409: { error: 'Crawl not complete' }
```

Implementation notes:
* Use `SiteReportData` type — assemble from crawl record + page records
* Return 409 if crawl not in `complete` status

Success criteria:
* Returns complete site report data
* Returns 409 for incomplete crawls
* Report includes all page summaries and aggregated violations

Dependencies:
* Phase 3 completion (site scoring)

### Step 4.8: Validate phase changes

Run lint and build commands.

Validation commands:
* `npm run lint` — full project lint
* `npm run build` — full project build

## Implementation Phase 5: Site Reports and PDF

<!-- parallelizable: true -->

### Step 5.1: Create `src/lib/report/site-generator.ts` — site-wide report assembly

Assemble a complete `SiteReportData` object from crawl record, page scan records, and site score.

Files:
* `src/lib/report/site-generator.ts` - NEW: site report assembly

Functions to implement:

```typescript
import type { CrawlRecord, SiteReportData } from '../types/crawl';
import { getScan } from '../scanner/store';
import { calculateSiteScore, aggregateViolations, generatePageSummaries } from '../scoring/site-calculator';

/**
 * Generate a complete site report from a completed crawl.
 */
export function generateSiteReport(crawl: CrawlRecord): SiteReportData { ... }
```

Implementation notes:
* Collect all page ScanRecords via `crawl.pageIds`
* Call `calculateSiteScore()`, `aggregateViolations()`, `generatePageSummaries()`
* Assemble `SiteReportData` with AODA disclaimer text

Discrepancy references:
* None

Success criteria:
* Returns complete SiteReportData
* Handles crawls with failed pages (exclude from scoring)
* Includes AODA disclaimer text

Context references:
* `src/lib/report/generator.ts` — existing report pattern
* Research (Lines 182-200) — report structure

Dependencies:
* Phase 3 completion (site-calculator)

### Step 5.2: Create `src/lib/report/templates/site-report-template.ts` — HTML template for site-wide executive summary

HTML/CSS template for rendering site-wide report as PDF. Executive summary format: site score, POUR chart, top violations, per-page score table.

Files:
* `src/lib/report/templates/site-report-template.ts` - NEW: site PDF HTML template

Functions to implement:

```typescript
import type { SiteReportData } from '../../types/crawl';

/**
 * Generate HTML for site-wide executive summary PDF.
 * Sections:
 * 1. Header: site URL, scan date, overall score/grade
 * 2. POUR principle scores bar chart
 * 3. Impact breakdown summary
 * 4. Top 10 violations table (sorted by instance count)
 * 5. Per-page scores table (URL, score, grade, violation count)
 * 6. AODA compliance note
 * 7. Footer with disclaimer
 */
export function generateSiteReportHtml(data: SiteReportData): string { ... }
```

Implementation notes:
* Follow pattern from `src/lib/report/templates/report-template.ts`
* Inline CSS for PDF rendering (Puppeteer)
* Target 5-15 pages for 50-page crawl
* Omit individual violation nodes (too verbose for executive summary)

Success criteria:
* Generates valid HTML with inline CSS
* Includes all sections listed above
* Renders correctly in Puppeteer for PDF conversion
* Scales reasonably for 50-200 page crawls

Context references:
* `src/lib/report/templates/report-template.ts` — existing template pattern
* Research site report design

Dependencies:
* Step 1.1 completion (crawl types)

### Step 5.3: Create `src/app/api/crawl/[id]/pdf/route.ts` — site-wide PDF endpoint

Generate and return site-wide executive summary PDF using Puppeteer.

Files:
* `src/app/api/crawl/[id]/pdf/route.ts` - NEW: site PDF endpoint

Request/response:
```
GET /api/crawl/:id/pdf
Response 200: application/pdf
Response 404: { error: 'Crawl not found' }
Response 409: { error: 'Crawl not complete' }
```

Implementation notes:
* Reuse PDF generation pattern from `src/app/api/scan/[id]/pdf/route.ts`
* Use `generateSiteReport()` → `generateSiteReportHtml()` → Puppeteer render

Success criteria:
* Returns valid PDF for completed crawl
* Returns 409 for incomplete crawls
* PDF contains all executive summary sections

Context references:
* `src/app/api/scan/[id]/pdf/route.ts` — existing PDF pattern
* `src/lib/report/pdf-generator.ts` — existing PDF generation

Dependencies:
* Step 5.1 completion (site-generator)
* Step 5.2 completion (site-report-template)

### Step 5.4: Create `src/app/api/crawl/[id]/pages/[pageId]/pdf/route.ts` — per-page PDF

Per-page PDF reusing Phase 1 pipeline. Look up the page's ScanRecord and generate PDF using existing report generator.

Files:
* `src/app/api/crawl/[id]/pages/[pageId]/pdf/route.ts` - NEW: per-page PDF endpoint

Request/response:
```
GET /api/crawl/:id/pages/:pageId/pdf
Response 200: application/pdf
Response 404: { error: 'Page not found' }
```

Implementation notes:
* Validate page belongs to crawl
* Reuse `generateReport()` and `generatePdf()` from Phase 1 pipeline
* Same output format as single-page scan PDF

Success criteria:
* Returns valid per-page PDF
* Reuses Phase 1 PDF pipeline without modification
* Validates page belongs to crawl

Context references:
* `src/app/api/scan/[id]/pdf/route.ts` — Phase 1 PDF pattern
* `src/lib/report/generator.ts` — existing report generator
* `src/lib/report/pdf-generator.ts` — existing PDF generator

Dependencies:
* Step 1.3 completion (store)

### Step 5.5: Validate phase changes

Validation commands:
* `npm run lint` — project lint
* `npm run build` — project build

## Implementation Phase 6: Crawl UI Components

<!-- parallelizable: true -->

### Step 6.1: Extend `src/components/ScanForm.tsx` with crawl mode toggle

Add a toggle (radio button or tab) allowing users to choose between "Single Page" and "Site-Wide Crawl" modes. In crawl mode, show additional configuration fields (max pages, max depth) and POST to `/api/crawl` instead of `/api/scan`.

Files:
* `src/components/ScanForm.tsx` - MODIFY: add mode toggle and crawl config fields

Implementation notes:
* Add `mode` state: `'single' | 'crawl'` (default `'single'`)
* Conditionally render crawl config fields when `mode === 'crawl'`
* Config fields: max pages (number input, default 50), max depth (number input, default 3)
* Submit to `/api/crawl` when in crawl mode
* Navigate to `/crawl/${crawlId}` instead of `/scan/${scanId}`
* Keep existing single-page flow unchanged when `mode === 'single'`

Key UI elements to add:
```tsx
// Mode toggle (above URL input)
<div role="radiogroup" aria-label="Scan mode">
  <label><input type="radio" value="single" checked={mode === 'single'} onChange={...} /> Single Page</label>
  <label><input type="radio" value="crawl" checked={mode === 'crawl'} onChange={...} /> Site-Wide Crawl</label>
</div>

// Crawl config (conditionally visible)
{mode === 'crawl' && (
  <div>
    <label htmlFor="max-pages">Max Pages <input id="max-pages" type="number" value={maxPages} min={1} max={200} /></label>
    <label htmlFor="max-depth">Max Depth <input id="max-depth" type="number" value={maxDepth} min={1} max={10} /></label>
  </div>
)}
```

Discrepancy references:
* None

Success criteria:
* Toggle switches between single and crawl modes
* Single-page mode behavior unchanged (backward compatible)
* Crawl mode shows config fields and POSTs to `/api/crawl`
* Accessible: proper labels, ARIA attributes, keyboard navigation

Context references:
* `src/components/ScanForm.tsx` (Lines 1-60) — existing form
* Research UI section

Dependencies:
* Phase 4 completion (crawl API route exists)

### Step 6.2: Create `src/components/CrawlProgress.tsx` — multi-page progress display

Real-time crawl progress component showing overall progress bar, per-page status, and current activity. Connects to SSE endpoint `/api/crawl/:id/status`.

Files:
* `src/components/CrawlProgress.tsx` - NEW: crawl progress component

Implementation notes:
* Connect to SSE endpoint on mount
* Display: overall progress bar, status text, page count (X/Y completed)
* Show list of completed pages with mini score badges
* Show current scanning page URL
* Handle terminal states: complete → show results button, error → show error, cancelled → show message
* Follow pattern from `src/components/ScanProgress.tsx`

Success criteria:
* Connects to SSE and renders real-time updates
* Shows per-page progress as pages complete
* Handles all terminal states gracefully
* Accessible: progress bar has ARIA attributes

Context references:
* `src/components/ScanProgress.tsx` — existing progress pattern

Dependencies:
* Phase 4 completion (SSE endpoint exists)

### Step 6.3: Create `src/components/PageList.tsx` — page results table

Table component listing all scanned pages with score, grade, violation count, and link to individual page results.

Files:
* `src/components/PageList.tsx` - NEW: page results table

Implementation notes:
* Accept `PageSummary[]` as prop
* Table columns: URL (truncated with tooltip), Score, Grade (color-coded), Violations, Status
* Sort by score ascending (worst first) by default
* Clickable rows link to per-page detail view
* Responsive: horizontal scroll on mobile

Success criteria:
* Renders table with all page summaries
* Score grades color-coded (A=green, F=red)
* Sortable columns
* Accessible: proper table headers, scope attributes

Dependencies:
* Phase 3 completion (PageSummary type)

### Step 6.4: Create `src/components/SiteScoreDisplay.tsx` — site-wide score gauge and summary

Site-wide score display showing overall grade, score gauge, and POUR principle breakdown. Extends the pattern from `src/components/ScoreDisplay.tsx`.

Files:
* `src/components/SiteScoreDisplay.tsx` - NEW: site-wide score display

Implementation notes:
* Accept `SiteScoreResult` as prop
* Display: large circular score gauge, grade letter, page count
* POUR principle score bars (reuse pattern from ScoreDisplay)
* Summary stats: lowest/highest/median page score, total unique violations
* AODA compliance badge

Success criteria:
* Renders site-wide score and all summary statistics
* Visual consistency with Phase 1 ScoreDisplay
* Accessible: all visual elements have text alternatives

Context references:
* `src/components/ScoreDisplay.tsx` — existing score display pattern

Dependencies:
* Step 1.1 completion (SiteScoreResult type)

### Step 6.5: Create `src/app/crawl/[id]/page.tsx` — crawl results page

Page component wiring together `CrawlProgress`, `SiteScoreDisplay`, `PageList`, and `ViolationList` for a completed crawl.

Files:
* `src/app/crawl/[id]/page.tsx` - NEW: crawl results page

Implementation notes:
* Fetch crawl status on load → show `CrawlProgress` if still running
* When complete: show `SiteScoreDisplay` + `PageList` + aggregated `ViolationList`
* Download PDF button linking to `/api/crawl/:id/pdf`
* Follow pattern from `src/app/scan/[id]/page.tsx`

Success criteria:
* Shows progress while crawl is running
* Shows results when crawl is complete
* Links to per-page details and PDFs
* Error state handling

Context references:
* `src/app/scan/[id]/page.tsx` — existing results page pattern

Dependencies:
* Step 6.2, 6.3, 6.4 completion (child components)

### Step 6.6: Extend `src/app/page.tsx` — add crawl mode option on homepage

Minimal update to the homepage to surface the crawl option. The `ScanForm` component handles mode switching internally, but the page may need updated heading or description text.

Files:
* `src/app/page.tsx` - MODIFY: update heading/description for dual-mode

Implementation notes:
* Update heading text to reflect both scan modes
* No structural changes needed if `ScanForm` handles mode toggle internally
* May add a brief description of crawl mode capability

Success criteria:
* Homepage reflects both single-page and site-wide capabilities
* Existing layout preserved

Context references:
* `src/app/page.tsx` — current homepage

Dependencies:
* Step 6.1 completion (ScanForm with crawl toggle)

### Step 6.7: Validate phase changes

Validation commands:
* `npm run lint` — project lint
* `npm run build` — project build

## Implementation Phase 7: SARIF and CI/CD Foundation

<!-- parallelizable: true -->

### Step 7.1: Create `src/lib/report/sarif-generator.ts` — axe-core violations to SARIF v2.1.0

Map axe-core violation results to SARIF v2.1.0 format for GitHub code scanning integration.

Files:
* `src/lib/report/sarif-generator.ts` - NEW: SARIF output generator

Functions to implement:

```typescript
import type { AxeViolation } from '../types/scan';

interface SarifLog {
  $schema: string;
  version: '2.1.0';
  runs: SarifRun[];
}

/**
 * Generate SARIF v2.1.0 log from axe-core violations.
 * Maps:
 * - violation.id → result.ruleId
 * - violation.impact (critical/serious → error, moderate → warning, minor → note)
 * - violation.description → result.message.text
 * - violation.helpUrl → rule.helpUri
 * - violation.nodes[].target → result.locations[].physicalLocation
 * - Adds partialFingerprints for GitHub dedup
 */
export function generateSarif(
  url: string,
  violations: AxeViolation[],
  toolVersion: string
): SarifLog { ... }

/**
 * Generate SARIF for site-wide crawl (multiple URLs).
 * One run per page, all in a single SARIF log.
 */
export function generateSiteSarif(
  pages: { url: string; violations: AxeViolation[] }[],
  toolVersion: string
): SarifLog { ... }
```

Impact to SARIF level mapping:
* `critical` → `error`
* `serious` → `error`
* `moderate` → `warning`
* `minor` → `note`

Discrepancy references:
* None — aligns with research Lines 200-214

Success criteria:
* Generates valid SARIF v2.1.0 JSON
* All violations mapped with correct severity levels
* `partialFingerprints` included for dedup
* Output under 10 MB / 25K results (GitHub limits)

Context references:
* Research (Lines 200-214) — SARIF mapping table
* SARIF v2.1.0 spec (OASIS)

Dependencies:
* Step 1.1 completion (scan types)

### Step 7.2: Create `src/lib/ci/threshold.ts` — threshold evaluation

Evaluate scan results against configurable thresholds. Three-layer: score-based, count-based, rule-based.

Files:
* `src/lib/ci/threshold.ts` - NEW: threshold evaluation logic

Functions to implement:

```typescript
import type { ThresholdConfig, ThresholdEvaluation } from '../types/crawl';
import type { ScoreResult, AxeViolation } from '../types/scan';

/**
 * Evaluate scan results against threshold configuration.
 * Three layers (all must pass for overall pass):
 * 1. Score: overallScore >= threshold.score
 * 2. Count: violation counts by impact <= threshold.maxViolations
 * 3. Rule: no violations with IDs in threshold.failOnRules
 * Also filters out threshold.ignoreRules before evaluation.
 */
export function evaluateThreshold(
  score: ScoreResult,
  violations: AxeViolation[],
  config: ThresholdConfig
): ThresholdEvaluation { ... }

/**
 * Apply default thresholds when none specified.
 * Default: score >= 70, critical: 0, serious: 5
 */
export function getDefaultThreshold(): ThresholdConfig { ... }
```

Success criteria:
* Score threshold evaluates correctly
* Count threshold checks each impact level independently
* Rule threshold checks for specific rule IDs in violations
* `ignoreRules` filters violations before evaluation
* Returns detailed evaluation with per-layer results and explanations

Context references:
* Research (Lines 226-237) — threshold design
* Research (Lines 507-530) — .a11yrc.json schema

Dependencies:
* Step 1.1 completion (crawl types)

### Step 7.3: Create `src/lib/ci/formatters/json.ts` — CI JSON output formatter

Format CI results as structured JSON for machine consumption.

Files:
* `src/lib/ci/formatters/json.ts` - NEW: JSON output formatter

Functions to implement:

```typescript
import type { CiResult } from '../../types/crawl';

/**
 * Format CI result as JSON string.
 * Includes: passed, score, grade, violations, threshold evaluation.
 */
export function formatJson(result: CiResult): string { ... }
```

Success criteria:
* Outputs valid JSON matching CiResult schema
* Includes all fields for CI parsing

Dependencies:
* Step 1.1 completion (crawl types)

### Step 7.4: Create `src/lib/ci/formatters/sarif.ts` — CI SARIF output formatter

Thin wrapper calling `generateSarif()` and serializing to string.

Files:
* `src/lib/ci/formatters/sarif.ts` - NEW: SARIF output formatter

Functions to implement:

```typescript
import type { AxeViolation } from '../../types/scan';
import { generateSarif } from '../../report/sarif-generator';

/**
 * Format violations as SARIF v2.1.0 JSON string.
 */
export function formatSarif(url: string, violations: AxeViolation[], toolVersion: string): string { ... }
```

Success criteria:
* Outputs valid SARIF JSON string
* Delegates to sarif-generator

Dependencies:
* Step 7.1 completion (sarif-generator)

### Step 7.5: Create `src/lib/ci/formatters/junit.ts` — CI JUnit XML output formatter

Format CI results as JUnit XML for Azure DevOps `PublishTestResults` task compatibility.

Files:
* `src/lib/ci/formatters/junit.ts` - NEW: JUnit XML output formatter

Functions to implement:

```typescript
import type { CiResult } from '../../types/crawl';

/**
 * Format CI result as JUnit XML string.
 * Maps:
 * - Test suite = URL scanned
 * - Test case per axe rule: pass = no violation, fail = violation found
 * - Failure message includes violation description and node count
 */
export function formatJunit(result: CiResult): string { ... }
```

Implementation notes:
* Build XML string manually (no external XML library needed for simple JUnit format)
* Properly escape XML special characters in violation descriptions
* Include timestamp, test count, failure count attributes on `<testsuite>`

Success criteria:
* Outputs valid JUnit XML
* Azure DevOps PublishTestResults can parse it
* Each violation = one failed test case
* Passing rules = passed test cases

Dependencies:
* Step 1.1 completion (crawl types)

### Step 7.6: Validate phase changes

Validation commands:
* `npm run lint` — project lint
* `npm run build` — project build

## Implementation Phase 8: CI API Routes

<!-- parallelizable: false -->

### Step 8.1: Create `src/app/api/ci/scan/route.ts` — synchronous single-page CI scan endpoint

Synchronous endpoint for CI/CD systems. Blocks until scan completes, returns results with threshold evaluation.

Files:
* `src/app/api/ci/scan/route.ts` - NEW: synchronous CI scan endpoint

Request/response:
```
POST /api/ci/scan
Body: CiScanRequest { url, standard?, threshold?, format? }
Response 200: CiResult (format depends on Accept header or format field)
Response 400: { error: string }
```

Implementation notes:
* Validate URL (SSRF protection)
* Run `scanUrl()` synchronously (await completion)
* Parse results, calculate score
* Evaluate threshold via `evaluateThreshold()`
* Format response: JSON by default, SARIF if `format: 'sarif'`, JUnit if `format: 'junit'`
* Set appropriate `Content-Type` header
* Timeout: 120 seconds for the entire request

Discrepancy references:
* None — aligns with research CI/CD API design

Success criteria:
* Returns scan results with threshold evaluation
* `passed` boolean reflects threshold evaluation
* Supports JSON/SARIF/JUnit output formats
* SSRF protection active
* Timeout prevents indefinite blocking

Context references:
* Research (Lines 144-155) — CI endpoint design
* `src/app/api/scan/route.ts` — existing scan pattern

Dependencies:
* Phase 7 completion (threshold, formatters)
* Phase 1 completion (engine, scoring)

### Step 8.2: Create `src/app/api/ci/crawl/route.ts` — synchronous site crawl CI endpoint

Synchronous endpoint for CI site crawls. Blocks until crawl completes, returns aggregated results.

Files:
* `src/app/api/ci/crawl/route.ts` - NEW: synchronous CI crawl endpoint

Request/response:
```
POST /api/ci/crawl
Body: CiCrawlRequest { url, maxPages?, maxDepth?, concurrency?, threshold?, format? }
Response 200: CiResult (aggregated, format depends on format field)
Response 400: { error: string }
```

Implementation notes:
* Same pattern as CI scan but starts a full crawl
* Await crawl completion (with timeout: 30 minutes)
* Aggregate results using site-calculator
* Evaluate threshold against site-wide score
* Return aggregated CiResult

Success criteria:
* Returns aggregated site results with threshold evaluation
* Respects crawl config (maxPages, maxDepth, concurrency)
* Timeout prevents indefinite blocking
* SSRF protection active

Dependencies:
* Phase 7 completion (threshold, formatters)
* Phase 2 completion (crawler)
* Phase 3 completion (site-calculator)

### Step 8.3: Validate phase changes

Validation commands:
* `npm run lint` — project lint
* `npm run build` — project build

## Implementation Phase 9: CLI Tool

<!-- parallelizable: false -->

### Step 9.1: Install CLI dependency

Install Commander.js for CLI command parsing.

Files:
* `package.json` - MODIFY: add commander dependency

Commands:
```bash
npm install commander
```

Success criteria:
* `commander` in dependencies
* `npm install` completes without errors

Dependencies:
* None

### Step 9.2: Create `src/cli/bin/a11y-scan.ts` — CLI entry point

Main CLI entry point using Commander.js. Defines top-level program with version, description, and subcommands.

Files:
* `src/cli/bin/a11y-scan.ts` - NEW: CLI entry point

Implementation outline:

```typescript
#!/usr/bin/env node
import { Command } from 'commander';
import { scanCommand } from '../commands/scan';
import { crawlCommand } from '../commands/crawl';

const program = new Command();
program
  .name('a11y-scan')
  .description('WCAG 2.2 accessibility scanner CLI')
  .version('0.1.0');

program.addCommand(scanCommand);
program.addCommand(crawlCommand);

program.parse();
```

Implementation notes:
* Add `"bin": { "a11y-scan": "dist/cli/bin/a11y-scan.js" }` to `package.json`
* Add tsconfig path for CLI compilation if needed
* Exit codes: 0 = pass, 1 = accessibility fail, 2 = technical error

Success criteria:
* `a11y-scan --help` shows usage
* `a11y-scan scan --help` shows scan options
* `a11y-scan crawl --help` shows crawl options

Dependencies:
* Step 9.1 completion (commander installed)

### Step 9.3: Create `src/cli/commands/scan.ts` — single-page scan command

CLI command for single-page accessibility scan. Calls the CI scan API or runs scan directly.

Files:
* `src/cli/commands/scan.ts` - NEW: scan CLI command

Options:
* `--url <url>` (required) — URL to scan
* `--threshold <score>` — minimum score (default: 70)
* `--format <format>` — output format: json, sarif, junit (default: json)
* `--output <path>` — output file path (default: stdout)
* `--config <path>` — path to .a11yrc.json config file

Implementation notes:
* If `--server <url>` provided, call CI API; otherwise run scan directly in-process
* Load config from `.a11yrc.json` if present, CLI flags override
* Write output to file or stdout
* Exit with code 0/1/2

Success criteria:
* `a11y-scan scan --url https://example.com` runs and outputs results
* Threshold evaluation determines exit code
* Output file created when `--output` specified

Context references:
* Research (Lines 222-230) — CLI design

Dependencies:
* Step 9.2 completion (entry point)
* Phase 7 completion (threshold, formatters)

### Step 9.4: Create `src/cli/commands/crawl.ts` — site crawl command

CLI command for site-wide accessibility crawl.

Files:
* `src/cli/commands/crawl.ts` - NEW: crawl CLI command

Options:
* `--url <url>` (required) — seed URL
* `--max-pages <n>` — max pages to scan (default: 50)
* `--max-depth <n>` — max crawl depth (default: 3)
* `--concurrency <n>` — concurrent page scans (default: 3)
* `--threshold <score>` — minimum score (default: 70)
* `--format <format>` — output format: json, sarif, junit (default: json)
* `--output <path>` — output file path (default: stdout)
* `--config <path>` — path to .a11yrc.json config file

Implementation notes:
* Same pattern as scan command but triggers crawl
* Show progress on stderr while outputting results to stdout/file
* Exit with code 0/1/2

Success criteria:
* `a11y-scan crawl --url https://example.com` runs and outputs results
* Respects crawl config options
* Shows progress during crawl
* Threshold evaluation determines exit code

Dependencies:
* Step 9.2 completion (entry point)
* Phase 2 completion (crawler)
* Phase 7 completion (threshold, formatters)

### Step 9.5: Create `src/cli/config/loader.ts` — `.a11yrc.json` configuration file loader

Load and validate `.a11yrc.json` configuration files.

Files:
* `src/cli/config/loader.ts` - NEW: config file loader

Functions to implement:

```typescript
import type { ThresholdConfig } from '../../lib/types/crawl';

interface A11yConfig {
  url?: string;
  standard?: 'WCAG2A' | 'WCAG2AA' | 'WCAG2AAA';
  threshold?: ThresholdConfig;
  output?: {
    format?: ('json' | 'sarif' | 'junit')[];
    directory?: string;
  };
  crawl?: {
    maxPages?: number;
    maxDepth?: number;
    concurrency?: number;
  };
}

/**
 * Load .a11yrc.json from the given path or search up from cwd.
 * Returns parsed config or empty object if not found.
 */
export function loadConfig(configPath?: string): A11yConfig { ... }

/**
 * Merge CLI options with loaded config. CLI flags take precedence.
 */
export function mergeConfig(config: A11yConfig, cliOptions: Record<string, unknown>): A11yConfig { ... }
```

Implementation notes:
* Search for `.a11yrc.json` walking up from cwd if no explicit path
* Validate JSON schema (basic validation, no external validator)
* CLI flags override config file values

Success criteria:
* Loads and parses `.a11yrc.json`
* CLI options override config file
* Returns empty config when no file found
* Validates basic structure

Context references:
* Research (Lines 507-530) — .a11yrc.json schema

Dependencies:
* Step 1.1 completion (crawl types)

### Step 9.6: Validate phase changes

Validation commands:
* `npm run lint` — project lint
* `npm run build` — project build (may need tsconfig updates for CLI)

## Implementation Phase 10: GitHub Action and Docker Updates

<!-- parallelizable: true -->

### Step 10.1: Create `action/action.yml` — composite GitHub Action

Composite GitHub Action wrapping the CLI for easy CI/CD integration.

Files:
* `action/action.yml` - NEW: GitHub Action definition

Action definition:

```yaml
name: 'Accessibility Scan'
description: 'Run WCAG 2.2 accessibility scan on a URL'
inputs:
  url:
    description: 'URL to scan'
    required: true
  mode:
    description: 'Scan mode: single or crawl'
    required: false
    default: 'single'
  threshold:
    description: 'Minimum accessibility score (0-100)'
    required: false
    default: '70'
  max-pages:
    description: 'Maximum pages to crawl (crawl mode only)'
    required: false
    default: '50'
  output-format:
    description: 'Output format: json, sarif, junit'
    required: false
    default: 'sarif'
  output-directory:
    description: 'Directory for output files'
    required: false
    default: './a11y-results'
outputs:
  score:
    description: 'Accessibility score (0-100)'
    value: ${{ steps.scan.outputs.score }}
  passed:
    description: 'Whether the scan passed the threshold'
    value: ${{ steps.scan.outputs.passed }}
  report-path:
    description: 'Path to the output report file'
    value: ${{ steps.scan.outputs.report-path }}
runs:
  using: 'composite'
  steps:
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
    - name: Install dependencies
      run: npm ci
      shell: bash
      working-directory: ${{ github.action_path }}
    - name: Install Playwright browsers
      run: npx playwright install --with-deps chromium
      shell: bash
    - name: Run scan
      id: scan
      run: |
        # Run scan or crawl based on mode
        ...
      shell: bash
```

Implementation notes:
* Composite action for transparency (no Docker build during action)
* Installs Node.js, project deps, Playwright browsers
* Runs CLI with provided inputs
* Outputs score, passed status, report path
* SARIF upload handled separately by the calling workflow

Success criteria:
* Action can be referenced as `uses: your-org/a11y-scan-action@v1`
* Inputs/outputs properly defined
* Works with both single and crawl modes

Context references:
* Research (Lines 547-577) — GitHub Actions workflow example

Dependencies:
* Phase 9 completion (CLI tool)

### Step 10.2: Create `azure-pipelines/a11y-scan.yml` — Azure DevOps pipeline example

Provide a ready-to-use Azure DevOps pipeline YAML that runs the CLI tool and publishes JUnit results.

Files:
* `azure-pipelines/a11y-scan.yml` - NEW: Azure DevOps pipeline example

Pipeline definition:

```yaml
trigger: none  # Intended for PR or scheduled use

pool:
  vmImage: 'ubuntu-latest'

variables:
  SCAN_URL: ''  # Set via pipeline variable or variable group

steps:
  - task: NodeTool@0
    inputs:
      versionSpec: '20.x'
    displayName: 'Use Node.js 20'

  - script: npm ci
    displayName: 'Install dependencies'

  - script: npx playwright install --with-deps chromium
    displayName: 'Install Playwright browsers'

  - script: |
      npx a11y-scan scan \
        --url "$(SCAN_URL)" \
        --threshold 80 \
        --format junit \
        --output $(Build.ArtifactStagingDirectory)/a11y-results/results.xml
    displayName: 'Run Accessibility Scan'

  - task: PublishTestResults@2
    condition: always()
    inputs:
      testResultsFormat: 'JUnit'
      testResultsFiles: '$(Build.ArtifactStagingDirectory)/a11y-results/*.xml'
      testRunTitle: 'Accessibility Scan Results'
      failTaskOnFailedTests: true
    displayName: 'Publish Accessibility Results'
```

Implementation notes:
* Uses JUnit format for native ADO test results integration
* `PublishTestResults@2` with `failTaskOnFailedTests: true` fails the pipeline on violations
* Pipeline variable `SCAN_URL` set by user or variable group
* Pattern follows research Lines 601-625

Discrepancy references:
* Addresses DR-07: Azure DevOps pipeline example now included

Success criteria:
* Valid Azure DevOps pipeline YAML
* Runs CLI scan with JUnit output
* Publishes test results to ADO test tab
* Pipeline fails when accessibility threshold not met

Context references:
* Research (Lines 601-625) — Azure DevOps pipeline example

Dependencies:
* Phase 9 completion (CLI tool)

### Step 10.3: Update `Dockerfile` — add crawlee dependencies and memory tuning

Update the multi-stage Dockerfile to include crawlee and its Playwright dependency, plus memory settings for crawling workloads.

Files:
* `Dockerfile` - MODIFY: add crawlee to deps, tune memory

Changes needed:

1. **Stage 1 (deps)**: No changes — `npm ci` will pick up new deps from `package.json`
2. **Stage 3 (runner)**: Add `NODE_OPTIONS` for memory tuning
3. **Stage 3 (runner)**: Ensure crawlee's Playwright can find Chromium

Specific modifications:

```dockerfile
# Add after existing ENV block (Line 18)
ENV NODE_OPTIONS="--max-old-space-size=1024"

# Add crawlee runtime deps if needed
# crawlee uses Playwright which is already installed
# No additional system deps required beyond existing Playwright setup
```

Implementation notes:
* crawlee uses Playwright internally — existing Chromium install covers it
* May need to copy crawlee's storage config or ensure `persistStorage: false` prevents disk writes
* Memory tuning: 1024 MB heap for up to 200-page crawls
* Consider B2 App Service Plan for production crawls (research recommendation)

Discrepancy references:
* DD-01: Infrastructure SKU not addressed in plan — may need `infra/main.bicep` update for B2+ plan

Success criteria:
* Docker build succeeds with new dependencies
* Container starts and can run both single-page and crawl operations
* Memory setting prevents OOM for 50-page crawls

Context references:
* `Dockerfile` (Lines 1-39) — current Dockerfile
* Research (Lines 253-258) — memory estimates

Dependencies:
* Step 2.1 completion (new packages in package.json)

### Step 10.4: Validate phase changes

Validation commands:
* `docker build -t a11y-scan .` — verify Docker build
* `npm run lint` — project lint
* `npm run build` — project build

## Implementation Phase 11: Final Validation

<!-- parallelizable: false -->

### Step 11.1: Run full project validation

Execute all validation commands for the project:
* `npm run lint` — full ESLint check
* `npm run build` — Next.js production build
* Manual smoke test: single-page scan (Phase 1 backward compat) — verify `POST /api/scan` and results page still work
* Manual smoke test: site crawl with a small test site — verify `POST /api/crawl`, SSE progress, aggregated report
* Manual smoke test: CI endpoint with threshold evaluation — verify `POST /api/ci/scan` returns JSON with `passed` boolean

### Step 11.2: Fix minor validation issues

Iterate on lint errors, build warnings, and test failures. Apply fixes directly when corrections are straightforward and isolated.

### Step 11.3: Report blocking issues

When validation failures require changes beyond minor fixes:
* Document the issues and affected files.
* Provide the user with next steps.
* Recommend additional research and planning rather than inline fixes.
* Avoid large-scale refactoring within this phase.

## Dependencies

* `crawlee` — PlaywrightCrawler with URL dedup, concurrency, browser pool
* `sitemapper` — Sitemap XML discovery and parsing
* `robots-parser` — robots.txt compliance checking
* `p-queue` — Concurrency control (optional, for CI-mode fallback)
* `commander` — CLI framework
* Node.js 20+, Next.js 15, Playwright, axe-core (existing)

## Success Criteria

* Phase 1 single-page scanning remains fully backward-compatible
* Site crawl discovers and scans pages respecting configurable limits
* Aggregated site report with per-page scores and overall site score
* CI/CD endpoints return JSON/SARIF/JUnit with threshold evaluation
* CLI tool supports scan and crawl commands with exit codes 0/1/2
* GitHub Actions composite action wraps CLI
* Docker build succeeds with new dependencies
* `npm run lint` and `npm run build` pass with zero errors
