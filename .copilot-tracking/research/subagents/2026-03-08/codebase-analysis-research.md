# Codebase Analysis Research: Accessibility Scanner

**Research Status:** Complete
**Date:** 2026-03-08

---

## 1. Architecture Overview

The accessibility scanner is a **Next.js 15 application** with a multi-layered architecture:

```text
┌───────────────────────────────────────────────────────┐
│  Presentation Layer                                    │
│  ├── Next.js pages (scan/[id], crawl/[id])            │
│  ├── React components (ScanForm, ReportView, etc.)    │
│  └── API routes (/api/scan, /api/crawl, /api/ci)      │
├───────────────────────────────────────────────────────┤
│  CLI Layer                                             │
│  ├── a11y-scan CLI (commander)                         │
│  ├── scan command (single-page)                        │
│  └── crawl command (site-wide)                         │
├───────────────────────────────────────────────────────┤
│  Core Engine Layer                                     │
│  ├── Scanner Engine (axe-core + IBM + custom checks)   │
│  ├── Result Normalizer (multi-engine deduplication)    │
│  ├── Result Parser (→ unified ScanResults)             │
│  └── In-memory Store (Map-based CRUD)                  │
├───────────────────────────────────────────────────────┤
│  Analysis Layer                                        │
│  ├── Scoring Calculator (weighted impact scoring)      │
│  ├── Site Calculator (aggregate site-wide scores)      │
│  ├── WCAG Mapper (tag → POUR principle)                │
│  └── CI Threshold Evaluator                            │
├───────────────────────────────────────────────────────┤
│  Crawler Layer                                         │
│  ├── Site Crawler (PlaywrightCrawler from crawlee)     │
│  ├── Robots.txt parser                                 │
│  ├── Sitemap discovery (sitemapper)                    │
│  └── URL utilities (normalize, domain boundary, etc.)  │
├───────────────────────────────────────────────────────┤
│  Output Layer                                          │
│  ├── Report Generator (ReportData assembly)            │
│  ├── HTML Report Templates (single + site)             │
│  ├── PDF Generator (puppeteer-based)                   │
│  ├── SARIF Generator (GitHub Security compatible)      │
│  └── CI Formatters (JSON, SARIF, JUnit)                │
└───────────────────────────────────────────────────────┘
```

### Key Dependencies

| Package | Purpose |
|---------|---------|
| `@axe-core/playwright` | Primary scanning engine |
| `accessibility-checker` | IBM Equal Access secondary engine |
| `playwright` | Browser automation for scanning |
| `crawlee` | Site crawler (PlaywrightCrawler) |
| `puppeteer` | PDF generation |
| `commander` | CLI framework |
| `robots-parser` | robots.txt compliance |
| `sitemapper` | sitemap.xml discovery |
| `uuid` | Unique ID generation |

---

## 2. Scanner Engine

### File: [src/lib/scanner/engine.ts](src/lib/scanner/engine.ts)

The scanner uses a **three-engine architecture**:

#### Engine 1: axe-core (Primary)

- **Function:** `scanPage(page: Page)` — [engine.ts#L41-L45](src/lib/scanner/engine.ts#L41-L45)
- Scans an already-navigated Playwright Page
- Configures axe with tags: `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`, `best-practice`
- Loads axe-core source from disk (not bundled) to avoid webpack/turbopack mangling
- Returns `AxeResults` from axe-core

#### Engine 2: IBM Equal Access (Secondary)

- **Function:** `runIbmScan(context, url)` — [engine.ts#L52-L68](src/lib/scanner/engine.ts#L52-L68)
- Runs in an **isolated browser page** to prevent JS context corruption
- Uses `getCompliance()` from `accessibility-checker` package
- Gracefully degrades on failure (returns empty array)
- Catches violations not covered by axe-core

#### Engine 3: Custom Playwright Checks

- **Function:** `runCustomChecks(page)` — imported from [custom-checks.ts](src/lib/scanner/custom-checks.ts)
- Five custom checks that use Playwright `page.evaluate()` to inspect the DOM
- Designed for AODA/Ontario-specific accessibility requirements

#### Multi-Engine Orchestration

- **Function:** `multiEngineScan(page, url, context?)` — [engine.ts#L90-L101](src/lib/scanner/engine.ts#L90-L101)
- Runs all three engines in sequence
- axe-core and custom checks share the main page; IBM runs isolated
- Returns `MultiEngineResults` with combined violations

#### Top-Level Entry Point

- **Function:** `scanUrl(url, onProgress?)` — [engine.ts#L107-L127](src/lib/scanner/engine.ts#L107-L127)
- Launches browser, navigates, scans, closes
- Provides progress callbacks: `navigating` (10%), `scanning` (40%), `scoring` (80%)
- Used by Phase 1 single-page scan API

---

## 3. Custom Accessibility Checks

### File: [src/lib/scanner/custom-checks.ts](src/lib/scanner/custom-checks.ts)

Five custom checks implemented as Playwright DOM evaluations:

### Check 1: Ambiguous Link Text
- **Function:** `checkAmbiguousLinkText(page)` — [custom-checks.ts#L9-L40](src/lib/scanner/custom-checks.ts#L9-L40)
- **ID:** `ambiguous-link-text`
- **Impact:** serious
- **WCAG:** 2.4.4 (wcag244)
- **Detects:** Links with generic text like "Learn More", "Click Here", "More", "Here", "Read More", "Continue", "Details", "Link"
- **Set:** `AMBIGUOUS_LINK_TEXTS` — 8 pattern strings

### Check 2: ARIA Current Page
- **Function:** `checkAriaCurrentPage(page)` — [custom-checks.ts#L42-L73](src/lib/scanner/custom-checks.ts#L42-L73)
- **ID:** `aria-current-page`
- **Impact:** moderate
- **WCAG:** 1.3.1 (wcag131)
- **Detects:** Navigation links pointing to current page without `aria-current="page"`

### Check 3: Emphasis/Strong Semantics
- **Function:** `checkEmphasisStrongSemantics(page)` — [custom-checks.ts#L75-L103](src/lib/scanner/custom-checks.ts#L75-L103)
- **ID:** `emphasis-strong-semantics`
- **Impact:** minor
- **WCAG:** best-practice
- **Detects:** `<b>` and `<i>` elements that should be `<strong>` and `<em>` (skips `aria-hidden`, `<code>`, `<pre>`)

### Check 4: Discount Price Accessibility
- **Function:** `checkDiscountPriceAccessibility(page)` — [custom-checks.ts#L105-L149](src/lib/scanner/custom-checks.ts#L105-L149)
- **ID:** `discount-price-accessibility`
- **Impact:** serious
- **WCAG:** 1.3.1 (wcag131)
- **Detects:** `<del>`, `<s>`, `<strike>` elements without screen reader context (no aria-label, no sr-only sibling, no contextual keywords like "was", "original price")

### Check 5: Sticky Element Overlap
- **Function:** `checkStickyElementOverlap(page)` — [custom-checks.ts#L151-L198](src/lib/scanner/custom-checks.ts#L151-L198)
- **ID:** `sticky-element-overlap`
- **Impact:** serious
- **WCAG:** 2.4.7 (wcag247)
- **Detects:** Focusable elements obscured by fixed/sticky positioned elements (compares bounding rectangles)

### Custom Check Pattern

Each custom check follows this pattern:

```typescript
async function checkXxx(page: Page): Promise<CustomCheckResult | null> {
  const nodes = await page.evaluate(() => {
    // DOM inspection logic
    const results: { html: string; target: string[] }[] = [];
    // ... find violations ...
    return results;
  });
  if (!nodes.length) return null;
  return {
    id: 'check-id',
    impact: 'serious' | 'moderate' | 'minor' | 'critical',
    description: '...',
    help: '...',
    helpUrl: 'https://www.w3.org/WAI/...',
    tags: ['wcag2a', 'wcagXXX'],
    nodes,
  };
}
```

### CustomCheckResult Interface

Defined in [result-normalizer.ts#L31-L41](src/lib/scanner/result-normalizer.ts#L31-L41):

```typescript
interface CustomCheckResult {
  id: string;
  impact: 'minor' | 'moderate' | 'serious' | 'critical';
  description: string;
  help: string;
  helpUrl: string;
  tags: string[];
  nodes: { html: string; target: string[] }[];
}
```

---

## 4. Result Normalization & Deduplication

### File: [src/lib/scanner/result-normalizer.ts](src/lib/scanner/result-normalizer.ts)

The normalizer unifies results from all three engines into `NormalizedViolation[]`:

- **`normalizeAxeResults()`** — [result-normalizer.ts#L98-L106](src/lib/scanner/result-normalizer.ts#L98-L106) — Adds `engine: 'axe-core'` tag
- **`normalizeIbmResults()`** — [result-normalizer.ts#L57-L91](src/lib/scanner/result-normalizer.ts#L57-L91) — Maps IBM severity levels to impact (violation→critical, potential→serious, recommendation→moderate, manual→minor)
- **`normalizeCustomResults()`** — [result-normalizer.ts#L93-L106](src/lib/scanner/result-normalizer.ts#L93-L106) — Wraps custom checks with `engine: 'custom'`
- **`deduplicateViolations()`** — [result-normalizer.ts#L114-L140](src/lib/scanner/result-normalizer.ts#L114-L140) — Keys by `normalizeSelector(target) + '|' + primaryWcagTag`, keeps higher-severity finding
- **`normalizeAndMerge()`** — [result-normalizer.ts#L145-L207](src/lib/scanner/result-normalizer.ts#L145-L207) — Main orchestrator, produces `MultiEngineResults`

### IBM Severity Mapping

| IBM Level | Mapped Impact |
|-----------|---------------|
| violation | critical |
| potentialviolation | serious |
| recommendation | moderate |
| potentialrecommendation | moderate |
| manual | minor |

---

## 5. Scoring System

### File: [src/lib/scoring/calculator.ts](src/lib/scoring/calculator.ts)

#### Impact Weights

```typescript
const IMPACT_WEIGHTS = {
  critical: 10,
  serious: 7,
  moderate: 3,
  minor: 1,
};
```

#### Algorithm

1. Count violations by impact level and WCAG principle
2. Count passes (all treated as minor weight for scoring)
3. Calculate weighted score: `weightedPassed / weightedTotal * 100`
4. If no checks at all, score is 100

#### Grade Scale

| Score Range | Grade |
|-------------|-------|
| ≥ 90 | A |
| ≥ 70 | B |
| ≥ 50 | C |
| ≥ 30 | D |
| < 30 | F |

#### AODA Compliance

`aodaCompliant: violations.length === 0` — strict zero-violation requirement.

#### Function: `calculateScore(violations, passes, incompleteCount)` → `ScoreResult`

Returns:

```typescript
interface ScoreResult {
  overallScore: number;        // 0-100
  grade: ScoreGrade;           // A-F
  principleScores: PrincipleScores;  // POUR breakdown
  impactBreakdown: ImpactBreakdown;  // critical/serious/moderate/minor passed/failed
  totalViolations: number;
  totalElementViolations: number;    // sum of nodes across all violations
  totalPasses: number;
  totalIncomplete: number;
  aodaCompliant: boolean;
}
```

### WCAG Mapper

### File: [src/lib/scoring/wcag-mapper.ts](src/lib/scoring/wcag-mapper.ts)

Maps axe-core/IBM tags to WCAG POUR principles by first digit of WCAG criterion:

| First Digit | Principle |
|-------------|-----------|
| 1 | perceivable |
| 2 | operable |
| 3 | understandable |
| 4 | robust |
| (none) | best-practice |

**Function:** `mapTagToPrinciple(tags: string[])` — finds first tag matching `/^wcag\d{3,}$/` and reads character at index 4.

### Site Calculator

### File: [src/lib/scoring/site-calculator.ts](src/lib/scoring/site-calculator.ts)

Aggregates scores across multiple pages:

- **`calculateSiteScore(pageRecords)`** — [site-calculator.ts#L21-L115](src/lib/scoring/site-calculator.ts#L21-L115) — Averages page scores, computes min/max/median, aggregates principle scores and impact breakdown
- **`aggregateViolations(pageRecords)`** — [site-calculator.ts#L117-L159](src/lib/scoring/site-calculator.ts#L117-L159) — Groups violations by rule ID, tracks affected pages and instance counts, caps sample nodes at 5
- **`generatePageSummaries(pageRecords)`** — [site-calculator.ts#L161-L177](src/lib/scoring/site-calculator.ts#L161-L177) — Produces `PageSummary[]` for each completed page

Returns `SiteScoreResult` with additional site-level metrics: `lowestPageScore`, `highestPageScore`, `medianPageScore`, `pageCount`, `totalUniqueViolations`, `totalViolationInstances`.

---

## 6. Report Generation

### Report Assembly

### File: [src/lib/report/generator.ts](src/lib/report/generator.ts)

**Function:** `assembleReportData(results: ScanResults)` → `ReportData`

- Sorts violations by severity (critical → minor)
- Adds AODA compliance note and disclaimer text
- Used as input for HTML and PDF reports

### HTML Reports

### File: [src/lib/report/templates/report-template.ts](src/lib/report/templates/report-template.ts)

**Function:** `generateReportHtml(data: ReportData)` → `string`

- Full HTML report with embedded CSS (no external dependencies)
- Sections: Executive Summary (score circle, grade badge), WCAG Principles (POUR bars), Category Breakdown, Violation Details
- Accessible: includes skip links, ARIA labels, proper heading structure
- Print-friendly: `@media print` styles

### Site HTML Report

### File: [src/lib/report/templates/site-report-template.ts](src/lib/report/templates/site-report-template.ts)

**Function:** `generateSiteReportHtml(data: SiteReportData)` → `string`

- Site-wide report with page score table
- Top 10 violations by instance count
- Page-by-page score grid

### SARIF Generator

### File: [src/lib/report/sarif-generator.ts](src/lib/report/sarif-generator.ts)

- **`generateSarif(url, violations, toolVersion)`** — Single-page SARIF 2.1.0 log
- **`generateSiteSarif(pages[], toolVersion)`** — Multi-run SARIF for site crawls
- Compatible with GitHub Code Scanning (uploaded via `github/codeql-action/upload-sarif`)
- Maps impact to SARIF level: critical/serious → error, moderate → warning, minor → note
- Generates `partialFingerprints` with hash of `ruleId:target`

### PDF Generator

### File: [src/lib/report/pdf-generator.ts](src/lib/report/pdf-generator.ts)

**Function:** `generatePdf(reportHtml: string)` → `Buffer`

- Uses Puppeteer to render HTML to PDF
- A4 format with headers/footers (page numbers)

### Supported Output Formats

| Format | Generator | Used In |
|--------|-----------|---------|
| HTML | `generateReportHtml()` / `generateSiteReportHtml()` | Web UI |
| PDF | `generatePdf()` | Web UI download |
| SARIF | `generateSarif()` / `generateSiteSarif()` | CI, GitHub Security |
| JSON | `formatJson()` (CI result as JSON) | CLI, CI API |
| JUnit XML | `formatJunit()` | CLI, CI (test runners) |

---

## 7. CLI Interface

### File: [src/cli/bin/a11y-scan.ts](src/cli/bin/a11y-scan.ts)

Entry point: `a11y-scan` binary (registered in package.json as `"bin": {"a11y-scan": "dist/cli/bin/a11y-scan.js"}`)

### Scan Command

### File: [src/cli/commands/scan.ts](src/cli/commands/scan.ts)

```bash
a11y-scan scan --url <url> [options]
```

| Option | Default | Description |
|--------|---------|-------------|
| `--url <url>` | (required) | URL to scan |
| `--threshold <score>` | 70 | Minimum accessibility score (0-100) |
| `--format <format>` | json | Output format: json, sarif, junit |
| `--output <path>` | stdout | Output file path |
| `--config <path>` | auto-discover | Path to .a11yrc.json |

**Flow:** Load config → scan URL → parse results → evaluate threshold → format output → exit(0 if passed, 1 if failed, 2 if error)

### Crawl Command

### File: [src/cli/commands/crawl.ts](src/cli/commands/crawl.ts)

```bash
a11y-scan crawl --url <url> [options]
```

| Option | Default | Description |
|--------|---------|-------------|
| `--url <url>` | (required) | Seed URL to crawl |
| `--max-pages <n>` | 50 | Maximum pages to scan |
| `--max-depth <n>` | 3 | Maximum crawl depth |
| `--concurrency <n>` | 3 | Concurrent page scans |
| `--threshold <score>` | 70 | Minimum accessibility score |
| `--format <format>` | json | Output format: json, sarif, junit |
| `--output <path>` | stdout | Output file path |
| `--config <path>` | auto-discover | Path to .a11yrc.json |

**Flow:** Load config → create crawl → start site crawler → aggregate results → evaluate threshold → format output → exit code

### Configuration File

### File: [src/cli/config/loader.ts](src/cli/config/loader.ts)

**Config file name:** `.a11yrc.json`

**Discovery:** Walks up from CWD to filesystem root looking for `.a11yrc.json`.

```typescript
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
```

CLI flags always take precedence over config file values.

---

## 8. Site Crawler

### File: [src/lib/crawler/site-crawler.ts](src/lib/crawler/site-crawler.ts)

**Function:** `startCrawl(crawlId, seedUrl, config, onProgress?)` — [site-crawler.ts#L29-L235](src/lib/crawler/site-crawler.ts#L29-L235)

### Crawl Flow

1. **Discovery phase:** Fetch robots.txt, discover sitemap URLs
2. **Build seed set:** sitemap URLs + seed URL (normalized, filtered)
3. **Launch PlaywrightCrawler** with BFS traversal
4. **Per page:** navigate → `scanPage()` (axe-core only for speed) → `parseAxeResults()` → store
5. **Link discovery:** `enqueueLinks()` with domain boundary, pattern, and depth checks
6. **Progress events:** SSE-compatible via `ProgressCallback`
7. **Aggregation phase:** Mark complete

### Crawl Configuration

```typescript
interface CrawlConfig {
  maxPages: number;          // default: 50, max: 200
  maxDepth: number;          // default: 3
  concurrency: number;       // default: 3, max: 5
  delayMs: number;           // default: 1000
  includePatterns: string[];
  excludePatterns: string[];
  respectRobotsTxt: boolean; // default: true
  followSitemaps: boolean;   // default: true
  domainStrategy: 'same-hostname' | 'same-domain';
}
```

### Key Design Note

The crawler uses **axe-core only** (not multi-engine) for speed, as noted in the `requestHandler` calling `scanPage()` directly rather than `multiEngineScan()`.

### Robots.txt Support

### File: [src/lib/crawler/robots.ts](src/lib/crawler/robots.ts)

- User agent: `AccessibilityScanBot/1.0`
- Caches parsers per hostname
- **`isAllowedByRobots(url)`** — returns true if allowed or robots.txt unavailable
- **`getCrawlDelay(url)`** — returns delay in ms, used as `Math.max(config.delayMs, robotsDelay)`
- **`getSitemapUrls(url)`** — extracts Sitemap directives from robots.txt

### Sitemap Discovery

### File: [src/lib/crawler/sitemap.ts](src/lib/crawler/sitemap.ts)

**Function:** `discoverSitemapUrls(originUrl, sitemapUrlsFromRobots)` — [sitemap.ts#L12-L51](src/lib/crawler/sitemap.ts#L12-L51)

Discovery order:
1. Sitemap URLs from robots.txt
2. Standard `/sitemap.xml`
3. Fallback `/sitemap_index.xml`

Uses `sitemapper` package with 15-second timeout.

### URL Utilities

### File: [src/lib/crawler/url-utils.ts](src/lib/crawler/url-utils.ts)

- **`normalizeUrl()`** — Lowercase hostname, remove fragments, strip tracking params (utm, fbclid, gclid, etc.), sort query params, remove trailing slashes
- **`isWithinDomainBoundary()`** — `same-hostname` (exact match) or `same-domain` (registrable domain)
- **`isScannable()`** — Filters non-HTML extensions (.pdf, .jpg, .css, .js, etc.)
- **`matchesPatterns()`** — Include/exclude glob patterns

---

## 9. CI/CD Integration

### Threshold Evaluator

### File: [src/lib/ci/threshold.ts](src/lib/ci/threshold.ts)

**Function:** `evaluateThreshold(score, violations, config)` → `ThresholdEvaluation`

Three independent checks:
1. **Score check:** `score >= config.score`
2. **Count check:** Per-impact level (critical, serious, moderate, minor) against `maxViolations`
3. **Rule check:** Specific rule IDs that must have zero violations (`failOnRules`)

Also supports `ignoreRules` to exclude specific rule IDs from evaluation.

### Default Threshold

```typescript
{
  score: 70,
  maxViolations: {
    critical: 0,
    serious: 5,
    moderate: null,  // unlimited
    minor: null,     // unlimited
  },
  failOnRules: [],
  ignoreRules: [],
}
```

### CI Formatters

| File | Function | Output |
|------|----------|--------|
| [src/lib/ci/formatters/json.ts](src/lib/ci/formatters/json.ts) | `formatJson(result)` | Pretty-printed JSON of `CiResult` |
| [src/lib/ci/formatters/sarif.ts](src/lib/ci/formatters/sarif.ts) | `formatSarif(url, violations, version)` | SARIF 2.1.0 JSON |
| [src/lib/ci/formatters/junit.ts](src/lib/ci/formatters/junit.ts) | `formatJunit(result)` | JUnit XML test suite |

### GitHub Action

### File: [action/action.yml](action/action.yml)

A **composite action** that runs the CLI:

**Inputs:**

| Input | Default | Description |
|-------|---------|-------------|
| `url` | (required) | URL to scan |
| `mode` | single | `single` or `crawl` |
| `threshold` | 70 | Minimum score |
| `max-pages` | 50 | Crawl mode max pages |
| `output-format` | sarif | json, sarif, junit |
| `output-directory` | ./a11y-results | Output directory |

**Outputs:** `score`, `passed`, `report-path`

### CI Workflow

### File: [.github/workflows/a11y-scan.yml](.github/workflows/a11y-scan.yml)

- **Schedule:** Every Monday 06:00 UTC
- **Manual trigger:** `workflow_dispatch`
- **Matrix:** Scans 3 URLs (codepen sample, demo app, Ontario gov site)
- **SARIF upload:** Uses `github/codeql-action/upload-sarif` to feed GitHub Security tab
- **Permissions:** `contents: read`, `security-events: write`

### CI API Route

### File: [src/app/api/ci/scan/route.ts](src/app/api/ci/scan/route.ts)

- **Endpoint:** `POST /api/ci/scan`
- **Synchronous:** Blocks until scan completes (unlike the async `/api/scan`)
- **Input:** `CiScanRequest` (url, standard, threshold, format)
- **Output:** JSON `CiResult` or SARIF or JUnit depending on format
- **Security:** SSRF prevention blocks localhost, private IPs, .local, .internal domains

---

## 10. TypeScript Types and Interfaces

### Scan Types — [src/lib/types/scan.ts](src/lib/types/scan.ts)

| Type | Purpose |
|------|---------|
| `ScanStatus` | `'pending' \| 'navigating' \| 'scanning' \| 'scoring' \| 'complete' \| 'error'` |
| `ScanRequest` | `{ url: string }` |
| `ScanRecord` | Full scan lifecycle record with status, progress, results |
| `ScanResults` | Final result: url, timestamp, violations, passes, incomplete, inapplicable, score |
| `AxeViolation` | Violation with id, impact, tags, description, help, helpUrl, nodes[], principle?, engine? |
| `NormalizedViolation` | Extends AxeViolation with required `engine` field |
| `MultiEngineResults` | Combined output from all engines with `engineVersions` map |
| `AxeNode` | DOM node: html, target[], impact, failureSummary |
| `AxePass` | Passed check: id, tags, description, nodes |
| `AxeIncomplete` | Incomplete check needing manual review |
| `AxeInapplicable` | Rule that doesn't apply to page |

### Score Types — [src/lib/types/score.ts](src/lib/types/score.ts)

| Type | Purpose |
|------|---------|
| `ScoreResult` | Overall score, grade, principle scores, impact breakdown, totals, AODA compliance |
| `ScoreGrade` | `'A' \| 'B' \| 'C' \| 'D' \| 'F'` |
| `PrincipleScores` | POUR: perceivable, operable, understandable, robust |
| `PrincipleScore` | `{ score: number; violationCount: number; passCount: number }` |
| `ImpactBreakdown` | Per-impact passed/failed counts |

### Crawl Types — [src/lib/types/crawl.ts](src/lib/types/crawl.ts)

| Type | Purpose |
|------|---------|
| `CrawlStatus` | `'pending' \| 'discovering' \| 'scanning' \| 'aggregating' \| 'complete' \| 'error' \| 'cancelled'` |
| `CrawlConfig` | Crawl parameters (maxPages, maxDepth, concurrency, patterns, robots, sitemaps) |
| `CrawlRequest` | API request with optional overrides |
| `CrawlRecord` | Full crawl lifecycle with discovered URLs, page IDs, counts, site score |
| `PageSummary` | Per-page summary: pageId, url, score, grade, violation/pass counts |
| `AggregatedViolation` | Cross-page violation: ruleId, totalInstances, affectedPages[] |
| `SiteScoreResult` | Site-wide score with lowest/highest/median, page count |
| `SiteReportData` | Combined report data for site-wide HTML/PDF |
| `CrawlProgressEvent` | SSE event with status, progress, page summaries |
| `CiScanRequest` | CI API input with standard and threshold |
| `CiCrawlRequest` | CI crawl input extending scan |
| `ThresholdConfig` | Score, maxViolations per impact, failOnRules, ignoreRules |
| `CiResult` | CI output: passed, score, grade, thresholdEvaluation, violations |
| `ThresholdEvaluation` | Score/count/rule pass status with detail strings |
| `CiViolationSummary` | Simplified violation for CI output |

### Report Types — [src/lib/types/report.ts](src/lib/types/report.ts)

| Type | Purpose |
|------|---------|
| `ReportData` | Assembled report: url, scanDate, engineVersion, score, violations, passes, incomplete, notes |

---

## 11. Result Storage

### In-Memory Store — [src/lib/scanner/store.ts](src/lib/scanner/store.ts)

Two `Map<string, T>` stores:
- **Scans:** `Map<string, ScanRecord>` — CRUD via `createScan()`, `getScan()`, `updateScan()`
- **Crawls:** `Map<string, CrawlRecord>` — CRUD via `createCrawl()`, `getCrawl()`, `updateCrawl()`, `deleteCrawl()`, `getAllCrawls()`

### TTL Cleanup

- Scans: 1 hour TTL
- Crawls: 4 hours TTL (also cleans associated scan records)
- Cleanup interval: 30 minutes

### File-Based Results

The `results/` directory stores JSON files of IBM Equal Access results:
- Structure: `results/https_/{domain}/{path}.json`
- Example: `results/https_/example.com.json`
- Written by the `accessibility-checker` package during IBM scans

---

## 12. API Routes

### Async Scan API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `POST /api/scan` | POST | Start async scan, returns `{ scanId }` with HTTP 202 |
| `GET /api/scan/[id]` | GET | Poll scan status and results |
| `POST /api/crawl` | POST | Start async crawl |
| `GET /api/crawl/[id]` | GET | Poll crawl status with SSE progress |
| `POST /api/ci/scan` | POST | Synchronous CI scan (blocks until complete) |
| `POST /api/ci/crawl` | POST | Synchronous CI crawl |

### Security

All API routes include SSRF prevention that blocks:
- localhost, 127.0.0.1, ::1, 0.0.0.0
- Private ranges: 10.x, 192.168.x, 172.16-31.x
- IPv6 private: fc, fd prefixes
- Internal domains: .local, .internal

---

## 13. Testing Patterns

### E2E Tests — [e2e/](e2e/)

| File | Tests |
|------|-------|
| [self-scan-home.spec.ts](e2e/self-scan-home.spec.ts) | Home page WCAG 2.2 AA compliance, zero violations, heading structure |
| [self-scan-scan-results.spec.ts](e2e/self-scan-scan-results.spec.ts) | Scan results page accessibility after API-triggered scan |
| [self-scan-crawl-results.spec.ts](e2e/self-scan-crawl-results.spec.ts) | Crawl results page accessibility |
| [self-scan-report.spec.ts](e2e/self-scan-report.spec.ts) | Report page accessibility |
| [self-scan-site-report.spec.ts](e2e/self-scan-site-report.spec.ts) | Site report page accessibility |

### E2E Fixtures

| File | Purpose |
|------|---------|
| [fixtures/axe-fixture.ts](e2e/fixtures/axe-fixture.ts) | Playwright test fixture providing `makeAxeBuilder()` with WCAG 2.2 AA tags |
| [fixtures/threshold.ts](e2e/fixtures/threshold.ts) | `evaluateAccessibility()` wrapper with strict threshold (90 score, 0 critical/serious) |
| [fixtures/seed-data.ts](e2e/fixtures/seed-data.ts) | `seedScanResult()` and `seedCrawlResult()` API helpers for test setup |
| [fixtures/report-data.ts](e2e/fixtures/report-data.ts) | `createMockScanResults()` for realistic test data |

### Unit Tests

Located in `__tests__/` directories alongside source modules:
- `src/cli/__tests__/` — CLI command tests
- `src/lib/scanner/__tests__/` — Scanner engine tests
- `src/lib/scoring/__tests__/` — Scoring algorithm tests
- `src/lib/report/__tests__/` — Report generation tests
- `src/lib/crawler/__tests__/` — Crawler tests
- `src/lib/ci/__tests__/` — Threshold evaluation tests

**Test framework:** Vitest (configured in `vitest.config.ts`)
**E2E framework:** Playwright (configured in `playwright.config.ts`)

---

## 14. Patterns Agents Could Leverage

### Invoking Scans Programmatically

```typescript
// Single-page scan (full multi-engine)
import { scanUrl } from './src/lib/scanner/engine';
import { parseAxeResults } from './src/lib/scanner/result-parser';
const raw = await scanUrl('https://example.com');
const results = parseAxeResults('https://example.com', raw);
```

### Evaluating Thresholds

```typescript
import { evaluateThreshold, getDefaultThreshold } from './src/lib/ci/threshold';
const eval = evaluateThreshold(score, violations, { score: 85, maxViolations: { critical: 0 } });
```

### Creating Custom Checks

Follow the pattern in `custom-checks.ts`:
1. Write an `async function checkXxx(page: Page): Promise<CustomCheckResult | null>`
2. Use `page.evaluate()` to inspect the DOM
3. Return `null` if no violations found
4. Add the function to the `checks` array in `runCustomChecks()`

### Generating Reports

```typescript
import { assembleReportData } from './src/lib/report/generator';
import { generateReportHtml } from './src/lib/report/templates/report-template';
import { generateSarif } from './src/lib/report/sarif-generator';
const data = assembleReportData(scanResults);
const html = generateReportHtml(data);
const sarif = generateSarif(url, violations, version);
```

### Running CLI from Agent

```bash
# Single page scan
npx ts-node src/cli/bin/a11y-scan.ts scan --url https://example.com --threshold 85 --format sarif --output report.sarif

# Site crawl
npx ts-node src/cli/bin/a11y-scan.ts crawl --url https://example.com --max-pages 20 --format json --output results.json
```

### Key Extension Points for Agents

1. **Custom checks**: Add new Playwright DOM checks in `custom-checks.ts`
2. **Custom formatters**: Add new CI output formatters in `src/lib/ci/formatters/`
3. **Threshold rules**: Extend `ThresholdConfig` with new evaluation criteria
4. **Report templates**: Create new HTML/PDF templates in `src/lib/report/templates/`
5. **WCAG standard selection**: The `CiScanRequest.standard` field supports `WCAG2A`, `WCAG2AA`, `WCAG2AAA`
6. **Config file**: `.a11yrc.json` allows persistent per-project configuration

---

## 15. Discovered Research Topics

### Completed

- [x] Multi-engine scanning architecture
- [x] Custom check patterns and all 5 checks
- [x] Scoring algorithm with impact weights
- [x] WCAG POUR principle mapping
- [x] Site-wide aggregation and scoring
- [x] All report formats (HTML, PDF, SARIF, JSON, JUnit)
- [x] CLI commands and configuration
- [x] Crawler architecture with robots.txt and sitemap support
- [x] CI/CD threshold evaluation
- [x] GitHub Action composite action
- [x] TypeScript type inventory
- [x] In-memory storage patterns
- [x] API routes and SSRF protection
- [x] E2E testing patterns

### Not Found

- No `.github/workflows/a11y-scan.yml` using the `action/action.yml` directly (CI workflow uses API instead)
- No database persistence (in-memory only with TTL cleanup)
- The crawler uses axe-core only (not multi-engine) for performance

---

## References

| File | Lines | Key Export |
|------|-------|-----------|
| [src/lib/scanner/engine.ts](src/lib/scanner/engine.ts) | L41-L127 | `scanPage()`, `multiEngineScan()`, `scanUrl()` |
| [src/lib/scanner/custom-checks.ts](src/lib/scanner/custom-checks.ts) | L1-L218 | `runCustomChecks()`, 5 individual checks |
| [src/lib/scanner/result-normalizer.ts](src/lib/scanner/result-normalizer.ts) | L1-L220 | `normalizeAndMerge()`, `deduplicateViolations()` |
| [src/lib/scanner/result-parser.ts](src/lib/scanner/result-parser.ts) | L1-L96 | `parseAxeResults()` |
| [src/lib/scanner/store.ts](src/lib/scanner/store.ts) | L1-L95 | CRUD for scans and crawls |
| [src/lib/scoring/calculator.ts](src/lib/scoring/calculator.ts) | L1-L100 | `calculateScore()` |
| [src/lib/scoring/wcag-mapper.ts](src/lib/scoring/wcag-mapper.ts) | L1-L28 | `mapTagToPrinciple()` |
| [src/lib/scoring/site-calculator.ts](src/lib/scoring/site-calculator.ts) | L1-L185 | `calculateSiteScore()`, `aggregateViolations()` |
| [src/lib/report/generator.ts](src/lib/report/generator.ts) | L1-L25 | `assembleReportData()` |
| [src/lib/report/sarif-generator.ts](src/lib/report/sarif-generator.ts) | L1-L130 | `generateSarif()`, `generateSiteSarif()` |
| [src/lib/report/pdf-generator.ts](src/lib/report/pdf-generator.ts) | L1-L24 | `generatePdf()` |
| [src/lib/ci/threshold.ts](src/lib/ci/threshold.ts) | L1-L72 | `evaluateThreshold()`, `getDefaultThreshold()` |
| [src/lib/ci/formatters/json.ts](src/lib/ci/formatters/json.ts) | L1-L5 | `formatJson()` |
| [src/lib/ci/formatters/sarif.ts](src/lib/ci/formatters/sarif.ts) | L1-L7 | `formatSarif()` |
| [src/lib/ci/formatters/junit.ts](src/lib/ci/formatters/junit.ts) | L1-L37 | `formatJunit()` |
| [src/lib/crawler/site-crawler.ts](src/lib/crawler/site-crawler.ts) | L1-L235 | `startCrawl()` |
| [src/lib/crawler/robots.ts](src/lib/crawler/robots.ts) | L1-L80 | `isAllowedByRobots()`, `getCrawlDelay()` |
| [src/lib/crawler/sitemap.ts](src/lib/crawler/sitemap.ts) | L1-L51 | `discoverSitemapUrls()` |
| [src/lib/crawler/url-utils.ts](src/lib/crawler/url-utils.ts) | L1-L130 | `normalizeUrl()`, `isWithinDomainBoundary()`, `isScannable()` |
| [src/cli/bin/a11y-scan.ts](src/cli/bin/a11y-scan.ts) | L1-L14 | CLI entry point |
| [src/cli/commands/scan.ts](src/cli/commands/scan.ts) | L1-L100 | `scanCommand` |
| [src/cli/commands/crawl.ts](src/cli/commands/crawl.ts) | L1-L145 | `crawlCommand` |
| [src/cli/config/loader.ts](src/cli/config/loader.ts) | L1-L85 | `loadConfig()`, `mergeConfig()` |
| [src/lib/types/scan.ts](src/lib/types/scan.ts) | L1-L88 | All scan-related interfaces |
| [src/lib/types/score.ts](src/lib/types/score.ts) | L1-L38 | Score interfaces |
| [src/lib/types/crawl.ts](src/lib/types/crawl.ts) | L1-L165 | Crawl and CI interfaces |
| [src/lib/types/report.ts](src/lib/types/report.ts) | L1-L15 | `ReportData` |
| [action/action.yml](action/action.yml) | L1-L80 | GitHub Action definition |
| [.github/workflows/a11y-scan.yml](.github/workflows/a11y-scan.yml) | L1-L60 | CI workflow with SARIF upload |
