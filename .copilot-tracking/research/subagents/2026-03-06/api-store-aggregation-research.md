# Phase 2 Research: API Expansion, Data Store Evolution, and Aggregated Reporting

## Research Topics

1. API Route Expansion for crawl/multi-page, CI/CD integration
2. Data Store Evolution from in-memory Map to support crawl records
3. Multi-Page Scan Orchestration (concurrency, browser management, progress)
4. Aggregated Scoring across multiple pages
5. Aggregated Report and PDF generation for site-wide results
6. Concurrency and Performance (Next.js model, Playwright limits, queues)
7. Type System Evolution for crawl/site-level types

---

## 1. API Route Expansion

### Recommendation: Separate `/api/crawl` Route

**Decision**: Use a separate `/api/crawl` resource rather than extending `/api/scan` with `crawl: true`.

**Rationale**:
- A crawl is a fundamentally different resource — it has child pages, aggregated results, and different lifecycle states
- RESTful design favors distinct resources for entities with distinct lifecycles
- Keeps Phase 1 single-page scan API unchanged and backward compatible
- The crawl resource is hierarchical: crawl → pages → violations

### API Endpoint Table

| Method | Endpoint | Purpose | Response |
|--------|----------|---------|----------|
| `POST` | `/api/scan` | Single-page scan (Phase 1, unchanged) | `202 { scanId }` |
| `GET` | `/api/scan/:id` | Get single scan result | `200 ScanRecord` |
| `GET` | `/api/scan/:id/status` | SSE progress stream (Phase 1) | SSE stream |
| `GET` | `/api/scan/:id/pdf` | Download single-page PDF | PDF binary |
| `POST` | `/api/crawl` | Start multi-page crawl | `202 { crawlId }` |
| `GET` | `/api/crawl/:id` | Get crawl status + summary | `200 CrawlRecord` |
| `GET` | `/api/crawl/:id/status` | SSE crawl progress stream | SSE stream |
| `GET` | `/api/crawl/:id/pages` | List all page results | `200 PageSummary[]` |
| `GET` | `/api/crawl/:id/pages/:pageId` | Get specific page scan result | `200 ScanRecord` |
| `GET` | `/api/crawl/:id/report` | Get aggregated site report JSON | `200 SiteReport` |
| `GET` | `/api/crawl/:id/pdf` | Download site-wide PDF | PDF binary |
| `GET` | `/api/crawl/:id/pages/:pageId/pdf` | Download per-page PDF | PDF binary |
| `POST` | `/api/crawl/:id/cancel` | Cancel a running crawl | `200 { status }` |
| `POST` | `/api/ci/scan` | CI/CD single-page (returns SARIF/JSON) | `200 SarifLog \| ScanResults` |
| `POST` | `/api/ci/crawl` | CI/CD multi-page (returns SARIF/JSON) | `200 SarifLog \| CrawlResults` |

### POST `/api/crawl` Request Body

```typescript
interface CrawlRequest {
  url: string;           // Starting URL (seed)
  maxPages?: number;     // Default: 50, max: 200
  maxDepth?: number;     // Default: 3 (link depth from seed)
  concurrency?: number;  // Default: 3, max: 5
  includePatterns?: string[];  // Glob patterns for URLs to include
  excludePatterns?: string[];  // Glob patterns for URLs to exclude
}
```

### CI/CD Endpoint Design

**Recommendation**: Dedicated `/api/ci/scan` and `/api/ci/crawl` endpoints rather than query params on existing routes.

**Rationale**:
- CI endpoints are **synchronous** (wait for completion, return full results)
- CI endpoints support `Accept` header or `format` query param for output format: `json` (default) or `sarif`
- Separate from interactive endpoints that use async + SSE pattern
- Can enforce different rate limits and authentication for CI usage

**CI Request Headers**:
- `Accept: application/sarif+json` → returns SARIF v2.1.0
- `Accept: application/json` (default) → returns standard scan/crawl results

### API Versioning

**Recommendation**: No versioning for Phase 2. Use path prefix `/api/v1/` only if breaking changes are needed later.

**Rationale**:
- Phase 1 scan endpoints remain unchanged
- New crawl endpoints are additive
- Introducing versioning now adds complexity without benefit
- Can add `/api/v2/` prefix if breaking changes are needed in Phase 3

### SARIF Output Structure

SARIF v2.1.0 maps well to accessibility results:

```typescript
// Simplified SARIF output structure for CI
interface SarifOutput {
  version: '2.1.0';
  $schema: string;
  runs: [{
    tool: {
      driver: {
        name: 'WCAG Scanner';
        version: string;
        rules: SarifRule[];  // Each axe rule → SARIF reportingDescriptor
      }
    };
    results: SarifResult[];  // Each violation node → SARIF result
    artifacts: SarifArtifact[];  // Scanned URLs as artifacts
  }];
}
```

Each axe-core violation maps to a SARIF `result` with:
- `ruleId` = axe rule id (e.g., `color-contrast`)
- `level` = mapped from axe impact (`critical`/`serious` → `error`, `moderate` → `warning`, `minor` → `note`)
- `locations[].physicalLocation.artifactLocation.uri` = page URL
- `message.text` = violation help text

---

## 2. Data Store Evolution

### Recommendation: In-Memory Map with CrawlRecord (Option A)

**Decision**: Keep in-memory `Map` for Phase 2, extend with `CrawlRecord` type that references child `ScanRecord`s.

**Rationale**:
- Phase 2 is still a single-server demo app
- SQLite or PostgreSQL adds deployment complexity (Docker volume, migrations)
- In-memory is sufficient for scanning sessions (results are transient)
- Add cleanup/TTL to prevent unbounded growth
- Can upgrade to SQLite in Phase 3 if persistence is needed

### Store Architecture

```
store.ts (extended)
├── scans: Map<string, ScanRecord>       ← Phase 1 (unchanged)
├── crawls: Map<string, CrawlRecord>     ← NEW
└── cleanup timer (every 30 minutes)     ← NEW
```

### CrawlRecord Schema

```typescript
// New crawl-level record
interface CrawlRecord {
  id: string;
  seedUrl: string;
  config: CrawlConfig;
  status: CrawlStatus;
  progress: number;           // 0-100
  message: string;
  startedAt: string;
  completedAt?: string;
  error?: string;

  // Page tracking
  discoveredUrls: string[];   // All URLs found during crawl
  pageIds: string[];          // Ordered list of ScanRecord IDs
  completedPageCount: number;
  failedPageCount: number;
  totalPageCount: number;

  // Aggregated results (populated on completion)
  siteScore?: SiteScoreResult;
  aggregatedViolations?: AggregatedViolation[];
}

type CrawlStatus = 'pending' | 'discovering' | 'scanning' | 'aggregating' | 'complete' | 'error' | 'cancelled';

interface CrawlConfig {
  maxPages: number;
  maxDepth: number;
  concurrency: number;
  includePatterns: string[];
  excludePatterns: string[];
}
```

### Memory Budget Analysis (100+ Pages)

Per-page scan result memory estimate:
- `ScanResults` object: ~5-50 KB (depends on violations/passes count)
- Typical page with 10 violations, 40 passes: ~15 KB
- 100 pages: ~1.5 MB of results data
- 200 pages: ~3 MB of results data

**Conclusion**: 200 pages of scan results fit comfortably in memory (~5 MB with overhead). Far below typical Node.js heap limits (1.5 GB default).

### Data Retention Strategy

```typescript
const SCAN_TTL = 60 * 60 * 1000;  // 1 hour for single scans
const CRAWL_TTL = 4 * 60 * 60 * 1000;  // 4 hours for crawls

// Cleanup runs every 30 minutes
setInterval(() => {
  const now = Date.now();
  for (const [id, scan] of scans) {
    if (scan.completedAt && now - new Date(scan.completedAt).getTime() > SCAN_TTL) {
      scans.delete(id);
    }
  }
  for (const [id, crawl] of crawls) {
    if (crawl.completedAt && now - new Date(crawl.completedAt).getTime() > CRAWL_TTL) {
      // Delete crawl and its child scans
      for (const pageId of crawl.pageIds) scans.delete(pageId);
      crawls.delete(id);
    }
  }
}, 30 * 60 * 1000);
```

### Future: SQLite Migration Path

If persistence is needed later (Phase 3), migrate to `better-sqlite3`:
- Zero-config, file-based, no additional services
- Schema: `crawls` table, `page_scans` table with foreign key to crawl
- JSON columns for violation/pass data (SQLite supports JSON functions)
- Single migration script to create tables

---

## 3. Multi-Page Scan Orchestration

### Architecture: Single Browser, Multiple Contexts, `p-queue` Concurrency

#### Browser Instance Management

**Recommendation**: One Playwright browser instance per crawl, multiple `BrowserContext`s for page isolation.

```typescript
// crawl-engine.ts
async function runCrawl(crawlId: string, config: CrawlConfig) {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const queue = new PQueue({ concurrency: config.concurrency });

    // Phase 1: Discover URLs
    const urls = await discoverUrls(browser, config);

    // Phase 2: Scan each URL with concurrency control
    const scanPromises = urls.map(url =>
      queue.add(() => scanPage(browser, crawlId, url))
    );

    await Promise.allSettled(scanPromises);  // Continue even if some fail

    // Phase 3: Aggregate results
    aggregateResults(crawlId);
  } finally {
    await browser.close();
  }
}
```

**Why one browser, multiple contexts**:
- Launching a Chromium process is expensive (~100-500 ms, ~50-80 MB RAM)
- `BrowserContext` is lightweight (~5-10 MB), provides full isolation (cookies, storage, cache)
- 5 concurrent contexts ≈ 50 MB extra, vs. 5 browsers ≈ 400 MB extra
- Contexts share the browser process overhead

#### p-queue for Concurrency Control

**Library chosen**: `p-queue` (ESM, zero dependencies, 4.1k stars, 707k dependents)

```typescript
import PQueue from 'p-queue';

const queue = new PQueue({
  concurrency: 3,       // Default concurrent pages
  timeout: 60_000,      // 60s per page timeout
});

// Add pages with progress tracking
queue.on('active', () => {
  updateCrawl(crawlId, {
    progress: calculateProgress(queue.pending, queue.size, totalPages),
    message: `Scanning page ${completedCount + 1} of ${totalPages}...`
  });
});

queue.on('completed', () => { completedCount++; });
queue.on('error', () => { failedCount++; });
```

#### URL Discovery (Crawling)

```typescript
async function discoverUrls(
  browser: Browser,
  config: CrawlConfig
): Promise<string[]> {
  const visited = new Set<string>();
  const toVisit: { url: string; depth: number }[] = [{ url: config.seedUrl, depth: 0 }];
  const discovered: string[] = [];

  while (toVisit.length > 0 && discovered.length < config.maxPages) {
    const { url, depth } = toVisit.shift()!;
    if (visited.has(url) || depth > config.maxDepth) continue;
    visited.add(url);

    // Check include/exclude patterns
    if (!matchesPatterns(url, config)) continue;

    discovered.push(url);

    // Extract links from page
    if (depth < config.maxDepth) {
      const context = await browser.newContext();
      const page = await context.newPage();
      try {
        await page.goto(url, { waitUntil: 'load', timeout: 15000 });
        const links = await extractSameOriginLinks(page, config.seedUrl);
        for (const link of links) {
          if (!visited.has(link)) toVisit.push({ url: link, depth: depth + 1 });
        }
      } catch { /* skip unreachable pages */ }
      finally { await context.close(); }
    }
  }

  return discovered;
}
```

#### Progress Reporting for Multi-Page Crawl

The SSE stream at `/api/crawl/:id/status` sends events with:

```typescript
interface CrawlProgressEvent {
  status: CrawlStatus;
  progress: number;            // 0-100 overall
  message: string;
  totalPages: number;
  completedPages: number;
  failedPages: number;
  currentPage?: string;        // URL currently being scanned
  pagesCompleted: {            // Summary of completed pages
    url: string;
    score: number;
    grade: ScoreGrade;
    violationCount: number;
  }[];
}
```

**Progress calculation**:
- Discovery phase: 0-10%
- Scanning phase: 10-90% (proportional to pages completed)
- Aggregation phase: 90-100%

#### Error Handling

**Policy**: Continue scanning remaining pages when one fails.

```typescript
// Each page scan is wrapped in try/catch
async function scanPage(browser: Browser, crawlId: string, url: string) {
  const scanId = uuidv4();
  createScan(scanId, url);
  addPageToCrawl(crawlId, scanId);

  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 1024 } });
    const page = await context.newPage();
    // ... scan logic ...
    await context.close();
  } catch (error) {
    updateScan(scanId, {
      status: 'error',
      error: error instanceof Error ? error.message : 'Page scan failed',
    });
    incrementCrawlFailedCount(crawlId);
    // Do NOT rethrow — other pages continue scanning
  }
}
```

#### Cancellation Support

```typescript
// CrawlRecord gets an AbortController reference
const controller = new AbortController();
crawlControllers.set(crawlId, controller);

// In the queue, check signal before each page
queue.add(async ({ signal }) => {
  if (signal?.aborted) return;
  await scanPage(browser, crawlId, url);
}, { signal: controller.signal });

// POST /api/crawl/:id/cancel
export async function POST(request, { params }) {
  const controller = crawlControllers.get(params.id);
  controller?.abort();
  updateCrawl(params.id, { status: 'cancelled' });
}
```

---

## 4. Aggregated Scoring

### Site-Wide Score Algorithm

**Recommendation**: Weighted average of page scores, with outlier-aware reporting.

```typescript
interface SiteScoreResult {
  overallScore: number;        // Weighted average of page scores
  grade: ScoreGrade;
  lowestPageScore: number;     // Worst-performing page
  highestPageScore: number;    // Best-performing page
  medianPageScore: number;
  pageCount: number;
  principleScores: PrincipleScores;   // Aggregated across all pages
  impactBreakdown: ImpactBreakdown;   // Aggregated across all pages
  totalUniqueViolations: number;
  totalViolationInstances: number;
  totalPasses: number;
  aodaCompliant: boolean;             // True only if ALL pages are compliant
}
```

**Score calculation**:
1. **Site overall score** = arithmetic mean of all page scores (each page weighted equally)
2. **AODA compliant** = `true` only if every page has zero violations
3. **Principle scores** = sum violations/passes across all pages per principle, recalculate percentage

**Why equal weighting**: Without page-importance data (analytics, sitemap priority), equal weighting is the fairest default. Phase 3 could add configurable weighting.

### Unique Violations vs. Instances

**Recommendation**: Track both, display unique violations with affected-page count.

```typescript
interface AggregatedViolation {
  ruleId: string;              // axe rule id (e.g., 'color-contrast')
  impact: 'critical' | 'serious' | 'moderate' | 'minor';
  description: string;
  help: string;
  helpUrl: string;
  principle: string;
  totalInstances: number;      // Total nodes across all pages
  affectedPages: {
    url: string;
    pageId: string;
    nodeCount: number;         // Number of violating nodes on this page
  }[];
}
```

**Example**: "color-contrast" violated on 50 pages = **1 unique violation** with `affectedPages.length = 50` and `totalInstances` = sum of all nodes.

**Deduplication logic**:
```typescript
function aggregateViolations(pageResults: ScanResults[]): AggregatedViolation[] {
  const violationMap = new Map<string, AggregatedViolation>();

  for (const result of pageResults) {
    for (const violation of result.violations) {
      const existing = violationMap.get(violation.id);
      if (existing) {
        existing.totalInstances += violation.nodes.length;
        existing.affectedPages.push({
          url: result.url,
          pageId: result.url, // or scan ID
          nodeCount: violation.nodes.length,
        });
      } else {
        violationMap.set(violation.id, {
          ruleId: violation.id,
          impact: violation.impact,
          description: violation.description,
          help: violation.help,
          helpUrl: violation.helpUrl,
          principle: violation.principle || 'best-practice',
          totalInstances: violation.nodes.length,
          affectedPages: [{
            url: result.url,
            pageId: result.url,
            nodeCount: violation.nodes.length,
          }],
        });
      }
    }
  }

  // Sort by impact severity, then by affected page count
  return [...violationMap.values()].sort((a, b) => {
    const impactOrder = { critical: 0, serious: 1, moderate: 2, minor: 3 };
    return (impactOrder[a.impact] ?? 4) - (impactOrder[b.impact] ?? 4)
      || b.affectedPages.length - a.affectedPages.length;
  });
}
```

### POUR Principle Breakdown (Aggregated)

Sum all violation counts and pass counts per principle across all pages:

```typescript
function aggregatePrincipleScores(pageResults: ScanResults[]): PrincipleScores {
  const totals = {
    perceivable: { violations: 0, passes: 0 },
    operable: { violations: 0, passes: 0 },
    understandable: { violations: 0, passes: 0 },
    robust: { violations: 0, passes: 0 },
  };

  for (const result of pageResults) {
    for (const p of ['perceivable', 'operable', 'understandable', 'robust'] as const) {
      totals[p].violations += result.score.principleScores[p].violationCount;
      totals[p].passes += result.score.principleScores[p].passCount;
    }
  }

  return {
    perceivable: computePrincipleScore(totals.perceivable),
    operable: computePrincipleScore(totals.operable),
    understandable: computePrincipleScore(totals.understandable),
    robust: computePrincipleScore(totals.robust),
  };
}
```

### Per-Page Dashboard Display

For the UI dashboard/table:

```typescript
interface PageSummary {
  pageId: string;
  url: string;
  score: number;
  grade: ScoreGrade;
  violationCount: number;
  passCount: number;
  status: ScanStatus;
  scannedAt: string;
}
```

Display as a sortable table with columns: URL, Score, Grade, Violations, Passes, Status.

---

## 5. Aggregated Report and PDF

### Site-Wide Report Structure

```
Site-Wide WCAG 2.2 Accessibility Report
├── Executive Summary
│   ├── Site URL, scan date, pages scanned
│   ├── Overall score, grade, AODA compliance status
│   ├── Score distribution chart (how many A/B/C/D/F pages)
│   └── Top 5 most critical issues
├── POUR Principle Breakdown
│   └── Bar chart of 4 principle scores
├── Site-Wide Violations (aggregated, unique)
│   ├── Sorted by impact severity
│   ├── Each violation shows: rule, impact, description, affected page count
│   └── Affected pages list with node counts
├── Page Summary Table
│   └── All pages with score, grade, violation count (sortable)
├── Per-Page Details (optional, can be very long)
│   └── Each page: violations, passes, incomplete (same as Phase 1 report)
├── AODA Compliance Note
└── Disclaimer
```

### PDF Generation for Multi-Page Report

**Challenge**: A 100-page crawl with per-page details could produce a 200+ page PDF.

**Approach**:
1. **Site-wide PDF** (`/api/crawl/:id/pdf`): Executive summary + aggregated violations + page summary table. Omit per-page violation nodes. Target: 5-15 pages.
2. **Per-page PDF** (`/api/crawl/:id/pages/:pageId/pdf`): Same as Phase 1 single-page PDF. Reuse existing `generateReportHtml` + `generatePdf`.

**Implementation**: The site-wide PDF uses a new `site-report-template.ts` that generates HTML, then Puppeteer converts to PDF (same pipeline as Phase 1).

### Report type definitions

```typescript
interface SiteReportData {
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
```

---

## 6. Concurrency and Performance

### Next.js API Route Concurrency Model

**Key insight**: Next.js API routes handle requests independently. Long-running background work (like crawls) must be fire-and-forget from the route handler.

Current pattern (works for Phase 2):
```typescript
// POST /api/crawl — returns immediately
export async function POST(request: NextRequest) {
  const crawlId = uuidv4();
  createCrawl(crawlId, config);

  // Fire and forget — do NOT await
  runCrawl(crawlId, config);

  return NextResponse.json({ crawlId }, { status: 202 });
}
```

**Limitation**: If the Node.js process restarts, in-progress crawls are lost. Acceptable for Phase 2 demo app.

### Playwright Browser Context Limits

Based on Playwright documentation and community benchmarks:

| Concurrent Contexts | RAM Usage (approx) | CPU Impact | Recommendation |
|---------------------|---------------------|------------|----------------|
| 1 | ~150 MB (browser + 1 context) | Low | Minimum |
| 3 | ~180 MB | Moderate | **Default for crawls** |
| 5 | ~210 MB | High | Maximum recommended |
| 10 | ~280 MB | Very High | Not recommended |

**Default concurrency: 3** — Good balance of speed and resource usage. User-configurable up to 5.

### Memory Budget for 100+ Pages

| Component | Memory |
|-----------|--------|
| Node.js base | ~50 MB |
| Chromium browser | ~100-130 MB |
| 3 active BrowserContexts | ~30 MB |
| 100 completed ScanResults | ~1.5 MB |
| Crawl metadata | ~0.1 MB |
| **Total** | **~215 MB** |

Fits well within typical container limits (512 MB+).

### Timeouts and Circuit Breakers

```typescript
// Per-page timeouts
const PAGE_NAVIGATION_TIMEOUT = 30_000;  // 30s to load page
const PAGE_SCAN_TIMEOUT = 60_000;        // 60s total per page
const CRAWL_TOTAL_TIMEOUT = 30 * 60_000; // 30 min max crawl duration

// p-queue timeout handles per-page limit
const queue = new PQueue({
  concurrency: config.concurrency,
  timeout: PAGE_SCAN_TIMEOUT,
});

// Total crawl timeout
const crawlTimeout = setTimeout(() => {
  controller.abort();
  updateCrawl(crawlId, {
    status: 'error',
    error: 'Crawl exceeded maximum duration (30 minutes)',
  });
}, CRAWL_TOTAL_TIMEOUT);
```

### Queue Library Comparison

| Library | Type | Persistence | Dependencies | Best For |
|---------|------|-------------|--------------|----------|
| **p-queue** | In-memory | No | Zero | **Phase 2 — simple, lightweight** |
| p-limit | In-memory | No | Zero | Even simpler, less features |
| bull | Redis-backed | Yes | Redis | Production job queues |
| bee-queue | Redis-backed | Yes | Redis | Simpler Redis queue |

**Chosen: `p-queue`** — ESM-native, zero dependencies, perfect for in-process concurrency control without external backing store.

---

## 7. Type System Evolution

### New Types Needed

```typescript
// ── src/lib/types/crawl.ts ──

export type CrawlStatus =
  | 'pending'
  | 'discovering'
  | 'scanning'
  | 'aggregating'
  | 'complete'
  | 'error'
  | 'cancelled';

export interface CrawlConfig {
  maxPages: number;
  maxDepth: number;
  concurrency: number;
  includePatterns: string[];
  excludePatterns: string[];
}

export interface CrawlRequest {
  url: string;
  maxPages?: number;
  maxDepth?: number;
  concurrency?: number;
  includePatterns?: string[];
  excludePatterns?: string[];
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
  pageIds: string[];
  completedPageCount: number;
  failedPageCount: number;
  totalPageCount: number;
  siteScore?: SiteScoreResult;
  aggregatedViolations?: AggregatedViolation[];
}

export interface PageSummary {
  pageId: string;
  url: string;
  score: number;
  grade: import('./score').ScoreGrade;
  violationCount: number;
  passCount: number;
  status: import('./scan').ScanStatus;
  scannedAt: string;
}

export interface AggregatedViolation {
  ruleId: string;
  impact: 'critical' | 'serious' | 'moderate' | 'minor';
  description: string;
  help: string;
  helpUrl: string;
  principle: string;
  totalInstances: number;
  affectedPages: {
    url: string;
    pageId: string;
    nodeCount: number;
  }[];
}

export interface SiteScoreResult {
  overallScore: number;
  grade: import('./score').ScoreGrade;
  lowestPageScore: number;
  highestPageScore: number;
  medianPageScore: number;
  pageCount: number;
  principleScores: import('./score').PrincipleScores;
  impactBreakdown: import('./score').ImpactBreakdown;
  totalUniqueViolations: number;
  totalViolationInstances: number;
  totalPasses: number;
  aodaCompliant: boolean;
}

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
```

### Backward Compatibility

- **`ScanRecord`** (Phase 1): Unchanged. Single-page scans continue working identically.
- **`ScanResults`** (Phase 1): Unchanged. Reused as per-page results within a crawl.
- **`ScoreResult`** (Phase 1): Unchanged. Reused as per-page score within `SiteScoreResult`.
- **`ReportData`** (Phase 1): Unchanged. Reused for per-page PDF generation.
- **New**: `CrawlRecord`, `CrawlConfig`, `CrawlRequest`, `CrawlStatus`, `PageSummary`, `AggregatedViolation`, `SiteScoreResult`, `SiteReportData`, `CrawlProgressEvent`

### File Organization

```
src/lib/types/
├── scan.ts          ← Phase 1 (unchanged)
├── score.ts         ← Phase 1 (unchanged)
├── report.ts        ← Phase 1 (unchanged)
└── crawl.ts         ← NEW: all crawl/site types

src/lib/scanner/
├── engine.ts        ← Phase 1 (unchanged)
├── result-parser.ts ← Phase 1 (unchanged)
├── store.ts         ← Extended with crawl storage + cleanup
└── crawl-engine.ts  ← NEW: URL discovery + orchestration

src/lib/scoring/
├── calculator.ts    ← Phase 1 (unchanged)
├── wcag-mapper.ts   ← Phase 1 (unchanged)
└── site-calculator.ts ← NEW: aggregated scoring

src/lib/report/
├── generator.ts         ← Phase 1 (unchanged)
├── pdf-generator.ts     ← Phase 1 (unchanged)
├── site-generator.ts    ← NEW: site-wide report assembly
├── sarif-generator.ts   ← NEW: SARIF output generation
└── templates/
    ├── report-template.ts       ← Phase 1 (unchanged)
    └── site-report-template.ts  ← NEW: site-wide HTML template

src/app/api/
├── scan/            ← Phase 1 (unchanged)
├── crawl/           ← NEW: crawl API routes
│   ├── route.ts
│   └── [id]/
│       ├── route.ts
│       ├── status/route.ts
│       ├── pdf/route.ts
│       ├── report/route.ts
│       ├── cancel/route.ts
│       └── pages/
│           ├── route.ts
│           └── [pageId]/
│               ├── route.ts
│               └── pdf/route.ts
└── ci/              ← NEW: CI/CD endpoints
    ├── scan/route.ts
    └── crawl/route.ts
```

---

## Key Discoveries

1. **p-queue** is the ideal concurrency library: zero deps, ESM-native, 707k+ dependents, provides timeout, cancellation via AbortSignal, priority support, and event-based progress tracking.

2. **Playwright browser context reuse** is critical: one browser process + N contexts is 5-10x more memory efficient than N browser processes.

3. **SARIF v2.1.0** maps cleanly to axe-core results: each axe rule maps to a SARIF `reportingDescriptor`, each violation node maps to a SARIF `result`, and impact levels map to SARIF severity levels.

4. **In-memory store is sufficient** for Phase 2: 200 pages of results consume ~3 MB, well within typical limits. TTL-based cleanup prevents unbounded growth.

5. **Aggregated scoring** should use equal weighting across pages with both unique-violation and total-instance tracking. AODA compliance requires ALL pages to pass.

6. **Next.js fire-and-forget pattern** works for background crawls: start async work from the route handler without awaiting, poll via SSE.

---

## Clarifying Questions

1. Should the crawl discovery phase follow `robots.txt` rules? (Affects URL discovery logic)
2. Is there a preference for maximum crawl duration? (Recommended: 30 minutes)
3. Should CI endpoints require API key authentication? (Recommended for Phase 3)
4. Should site-wide PDF include full per-page violation details or just summaries? (Recommended: summaries only)

---

## Recommended Follow-Up Research

- [ ] Crawl URL discovery algorithms: breadth-first vs. sitemap.xml parsing vs. hybrid
- [ ] robots.txt parser libraries for Node.js (e.g., `robots-parser`)
- [ ] Site-wide PDF template HTML/CSS design (executive summary layout)
- [ ] SARIF generator implementation details (mapping axe tags to SARIF taxonomies)
- [ ] Frontend components for crawl dashboard (page list table, progress UI)
- [ ] Docker memory limits and Playwright configuration for container deployments
- [ ] Rate limiting for the CI/CD endpoints to prevent abuse
