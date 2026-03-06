# Site Crawling for Accessibility Scanning — Phase 2 Research

## Research Topics

1. Node.js crawling/spidering library comparison
2. Crawling architecture patterns (BFS vs DFS, URL frontier, domain boundaries)
3. Ethical crawling (robots.txt, rate limiting, concurrency, user-agent)
4. Integration with the existing Playwright + axe-core scan engine
5. Sitemap-based URL discovery
6. URL deduplication and canonicalization strategies

---

## 1. Crawling Library Comparison

### Summary Table

| Library | Weekly DLs | Last Update | TypeScript | Maintained | License | JS Rendering | Playwright Integration |
|---|---|---|---|---|---|---|---|
| **crawlee** (Apify) | ~77,882 | 1 day ago | Built-in | Yes (very active) | Apache-2.0 | Yes (Playwright/Puppeteer) | Native `PlaywrightCrawler` |
| **simplecrawler** | ~22,307 | 6 years ago | @types package | **No** (abandoned) | BSD-2-Clause | No (HTTP only) | None |
| **website-scraper** | ~24,444 | 4 months ago | @types package | Yes (moderate) | MIT | Via puppeteer plugin | No native support |
| **headless-chrome-crawler** | ~158 | 8 years ago | No | **No** (abandoned) | MIT | Yes (Puppeteer) | No (Puppeteer only) |
| **sitemapper** | ~56,106 | 13 days ago | Built-in | Yes (active) | MIT | N/A (XML parser) | N/A |
| **sitemap-parser** | ~8,807 | 9 years ago | No | **No** (abandoned) | MIT | N/A (XML parser) | N/A |
| **robots-parser** | ~2,199,799 | 3 years ago | Built-in | Stable (mature) | MIT | N/A | N/A |
| Custom Playwright | N/A | N/A | Yes | N/A | N/A | Yes | 100% |

### Detailed Library Analysis

#### crawlee (Apify) — **RECOMMENDED**

- **What it is**: Full-featured web scraping and crawling framework by Apify. Written in TypeScript with generics.
- **Key features**:
  - `PlaywrightCrawler` class provides native Playwright integration with headless Chromium, Firefox, and WebKit
  - Built-in persistent URL queue (breadth-first and depth-first)
  - `enqueueLinks()` helper auto-discovers and queues same-domain links from the current page
  - `AutoscaledPool` dynamically adjusts concurrency based on CPU/memory
  - Automatic retry on failure with configurable backoff
  - Session management and proxy rotation (not needed for our use case but available)
  - `RequestQueue` handles URL deduplication automatically
  - Pluggable storage for results
  - Configurable routing via `Router` class
  - Browser pool management — reuses browser instances efficiently across pages
- **API example**:
  ```typescript
  import { PlaywrightCrawler } from 'crawlee';

  const crawler = new PlaywrightCrawler({
    maxConcurrency: 3,
    maxRequestsPerCrawl: 100,
    async requestHandler({ request, page, enqueueLinks }) {
      // page is a Playwright Page object — inject axe-core here
      const title = await page.title();

      // Discover and queue same-origin links
      await enqueueLinks({
        strategy: 'same-domain', // or 'same-hostname', 'same-origin', 'all'
      });
    },
  });

  await crawler.run(['https://example.com']);
  ```
- **Strengths for our use case**:
  - Already uses Playwright — aligns with our existing `engine.ts`
  - Built-in URL deduplication via `RequestQueue`
  - `enqueueLinks()` handles dynamic SPA link discovery since it runs in a real browser
  - `maxRequestsPerCrawl` provides page count limiting
  - `maxConcurrency` provides concurrency control
  - TypeScript-first with rich type definitions
  - Very actively maintained (last publish: 1 day ago)
- **Weaknesses**:
  - Large dependency tree (14 direct deps)
  - File-based storage by default (writes to `./storage/`) — needs configuration for in-memory mode
  - Opinionated architecture — may require refactoring the existing `scanUrl()` function
  - Apache-2.0 license (permissive but not MIT)

#### simplecrawler — **NOT RECOMMENDED**

- **What it is**: Event-driven HTTP-only crawler for Node.js
- **Status**: Last published 6 years ago. Only supports Node 8/10/12. Effectively abandoned.
- **Key features**: robots.txt respect, event-driven API, queue freeze/defrost, configurable depth/concurrency
- **Critical weakness**: HTTP-only — does not render JavaScript. Cannot discover links in SPAs. No Playwright integration.
- **Verdict**: Do not use. Too old, HTTP-only, no TypeScript, no JS rendering.

#### website-scraper — **POSSIBLE BUT POOR FIT**

- **What it is**: Downloads entire websites to disk (HTML, CSS, images, JS). Plugin architecture.
- **Status**: Active (4 months ago), Node >= 20.18.1, ESM-only
- **Key features**: Recursive mode with depth limiting, plugin system, Puppeteer plugin available
- **Critical weakness**: Designed to save websites to disk, not for page-by-page processing. No Playwright support. Would need major adaptation.
- **Verdict**: Not designed for accessibility scanning workflows.

#### headless-chrome-crawler — **NOT RECOMMENDED**

- **What it is**: Distributed crawler powered by Puppeteer/Headless Chrome
- **Status**: Last published 8 years ago. Abandoned. Only 158 weekly downloads.
- **Verdict**: Dead project. Uses outdated Puppeteer APIs. Do not use.

#### Custom Playwright-based link extraction — **VIABLE ALTERNATIVE**

- **What it is**: No library — extract links using `page.$$eval('a[href]', ...)` and manage your own URL queue.
- **Example**:
  ```typescript
  async function extractLinks(page: Page, baseUrl: string): Promise<string[]> {
    const hrefs = await page.$$eval('a[href]', anchors =>
      anchors.map(a => a.href)
    );
    const base = new URL(baseUrl);
    return hrefs
      .filter(href => {
        try {
          const url = new URL(href);
          return url.origin === base.origin;
        } catch { return false; }
      })
      .map(href => normalizeUrl(href));
  }
  ```
- **Strengths**: Zero dependencies, full control, trivial to integrate with existing `engine.ts`, captures JS-rendered links
- **Weaknesses**: Must build queue management, deduplication, concurrency control, depth limiting manually. Significant engineering effort. Error-prone without battle-tested retry logic.
- **Verdict**: Viable for a minimal MVP but crawlee provides all of this ready-made with better reliability.

#### sitemapper — **RECOMMENDED for sitemap discovery**

- **What it is**: XML sitemap parser with sitemap index support, image/video sitemap support.
- **Status**: Active (published 13 days ago), TypeScript built-in, 56K weekly downloads.
- **API**:
  ```typescript
  import Sitemapper from 'sitemapper';

  const sitemap = new Sitemapper({ timeout: 15000, concurrency: 10 });
  const { sites } = await sitemap.fetch('https://example.com/sitemap.xml');
  // sites: string[] of URLs
  ```
- **Features**: Handles sitemap index files, timeout config, concurrency, retry, regex exclusions
- **Verdict**: Excellent for supplementing crawl with sitemap-based discovery. Lightweight and well-maintained.

---

## 2. Crawling Architecture Patterns

### BFS vs DFS for Accessibility Scanning

**BFS (Breadth-First Search) is recommended** for accessibility scanning:

| Factor | BFS | DFS |
|---|---|---|
| Coverage pattern | Level by level from root | Deep into one branch first |
| Typical pages scanned | Homepage → top-level nav → sub-pages | One deep path then backtrack |
| Progress visibility | Scans important pages first | May scan obscure deep pages before important ones |
| Depth limiting | Natural — stops at depth N having scanned all at that depth | Must track depth explicitly |
| Report usefulness early | High — top pages scanned first give meaningful partial results | Low — single branch gives skewed picture |
| Memory | Higher (stores frontier at current level) | Lower (stores only current path) |

**Recommendation**: BFS. Users care most about the homepage and top-level pages. BFS produces useful partial results quickly, and crawlee's default `RequestQueue` uses BFS ordering.

### URL Frontier / Queue Management

The URL frontier is the data structure managing discovered-but-unvisited URLs. Key requirements:

1. **Deduplication**: Never enqueue a URL that has already been visited or is already in the queue.
2. **Priority-aware**: Optionally prioritize certain URL patterns (e.g., main navigation over footer links).
3. **Persistence**: For large crawls, the queue should survive process crashes. crawlee's `RequestQueue` supports file-based persistence out of the box.
4. **Concurrency-safe**: Multiple workers pulling URLs must not get duplicates.

**crawlee handles all of this** via its `RequestQueue` class. For our Phase 2, the in-memory queue is sufficient for 50-500 page crawls.

### URL Normalization

URLs that look different but point to the same page must be normalized to avoid duplicate scans:

```typescript
function normalizeUrl(rawUrl: string): string {
  const url = new URL(rawUrl);
  // 1. Remove fragment/hash (e.g., #section)
  url.hash = '';
  // 2. Remove trailing slash (except root)
  if (url.pathname !== '/' && url.pathname.endsWith('/')) {
    url.pathname = url.pathname.slice(0, -1);
  }
  // 3. Lowercase hostname
  url.hostname = url.hostname.toLowerCase();
  // 4. Sort query parameters
  url.searchParams.sort();
  // 5. Remove common tracking params
  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid']
    .forEach(p => url.searchParams.delete(p));
  // 6. Remove default ports
  if ((url.protocol === 'https:' && url.port === '443') ||
      (url.protocol === 'http:' && url.port === '80')) {
    url.port = '';
  }
  return url.toString();
}
```

### Domain Boundary Enforcement

crawlee's `enqueueLinks()` supports multiple strategies:

| Strategy | Behavior |
|---|---|
| `'same-domain'` | Follows links on `example.com` and `*.example.com` |
| `'same-hostname'` | Only `www.example.com` (exact hostname match) |
| `'same-origin'` | Same protocol + hostname + port |
| `'all'` | Follows all links (dangerous for accessibility scanning) |

**Recommendation**: Use `'same-hostname'` by default, optionally configurable to `'same-domain'` for sites that use subdomains (e.g., `blog.example.com` alongside `www.example.com`).

### Depth and Page Count Limiting

Two independent limits should be enforced:

1. **Max depth** (default: 5): How many clicks from the root URL. Prevents crawling into infinitely deep pagination or nested category trees.
2. **Max pages** (default: 50, configurable up to 500): Total number of pages to scan. Hard limit to prevent runaway crawls. Maps directly to crawlee's `maxRequestsPerCrawl`.

### Handling Dynamic SPAs

Since crawlee's `PlaywrightCrawler` uses a real browser:
- Client-side rendered routerlinks (React Router, Next.js, Vue Router) are rendered before link extraction
- `enqueueLinks()` operates on the live DOM after JavaScript execution
- This is a major advantage over HTTP-only crawlers

---

## 3. Ethical Crawling

### robots.txt Parsing

**Library: `robots-parser`** (2.2M weekly downloads, TypeScript built-in, MIT)

```typescript
import robotsParser from 'robots-parser';

async function checkRobotsTxt(rootUrl: string): Promise<{
  isAllowed: (url: string) => boolean;
  crawlDelay: number | undefined;
  sitemaps: string[];
}> {
  const robotsUrl = new URL('/robots.txt', rootUrl).toString();
  const response = await fetch(robotsUrl);
  const robotsTxt = response.ok ? await response.text() : '';

  const robots = robotsParser(robotsUrl, robotsTxt);
  return {
    isAllowed: (url: string) => robots.isAllowed(url, 'AccessibilityScanBot') !== false,
    crawlDelay: robots.getCrawlDelay('AccessibilityScanBot'),
    sitemaps: robots.getSitemaps(),
  };
}
```

Key behaviors:
- Returns `true` if no robots.txt exists or URL is not explicitly disallowed
- Provides `getCrawlDelay()` for rate limiting guidance
- Provides `getSitemaps()` to discover sitemap URLs — combined with `sitemapper` for URL discovery
- Supports wildcard patterns and `$` end-of-URL matching

### Rate Limiting

Strategies for polite crawling:

1. **Default delay**: 1000ms between requests to the same host if no `Crawl-delay` in robots.txt
2. **Respect `Crawl-delay`**: If robots.txt specifies a crawl delay, use it (multiply by 1000 for ms)
3. **Implementation in crawlee**:
   ```typescript
   const crawler = new PlaywrightCrawler({
     maxConcurrency: 3,
     navigationTimeoutSecs: 30,
     // Custom delay between requests
     requestHandlerTimeoutSecs: 60,
   });
   ```
4. **Between-request delay**: Add delay in the request handler:
   ```typescript
   async requestHandler({ page, request }) {
     // ... scan logic ...
     await new Promise(resolve => setTimeout(resolve, crawlDelay));
   }
   ```

### Concurrency Control

| Site size | Recommended concurrency | Reasoning |
|---|---|---|
| Small (< 50 pages) | 2-3 | Minimal load on target |
| Medium (50-200 pages) | 3-5 | Balance speed and politeness |
| Large (200-500 pages) | 3-5 | Same — no need to hammer the server |

crawlee's `AutoscaledPool` will automatically reduce concurrency if the system runs low on memory or CPU. For a serverless/container context, keep concurrency at 3 maximum — each Playwright page uses ~50-100MB RAM.

### User-Agent

```
AccessibilityScanBot/1.0 (+https://yoursite.com/about-scanning)
```

- Identify the bot clearly
- Provide a URL where site owners can learn about the scanner and opt out
- Never impersonate Google or other major crawlers

### Meta Robots Tags

After page load, check for `<meta name="robots" content="noindex, nofollow">`:

```typescript
async function shouldScanPage(page: Page): Promise<{ scan: boolean; followLinks: boolean }> {
  const metaRobots = await page.$eval(
    'meta[name="robots"]',
    el => el.getAttribute('content')?.toLowerCase() || ''
  ).catch(() => '');

  return {
    scan: !metaRobots.includes('noindex'),       // Skip scanning if noindex
    followLinks: !metaRobots.includes('nofollow'), // Skip link extraction if nofollow
  };
}
```

---

## 4. Integration with Existing Engine

### Current Architecture (Phase 1)

```
scanUrl(url) → launch browser → new context → new page → goto(url) → inject axe → run → close browser
```

Each scan launches and closes a fresh browser instance. This is fine for single-page scans but terrible for multi-page crawling (launching Chromium takes 1-3 seconds).

### Recommended Architecture (Phase 2): crawlee Integration

```
PlaywrightCrawler → manages BrowserPool → opens new pages (tabs) per URL → runs axe per page
```

#### Option A: crawlee as the crawler + scan engine (RECOMMENDED)

Refactor `scanUrl()` to accept a Playwright `Page` instead of a URL, and let crawlee handle browser lifecycle:

```typescript
// src/lib/scanner/engine.ts — refactored
export async function scanPage(page: import('playwright').Page): Promise<import('axe-core').AxeResults> {
  // Inject axe-core
  await page.evaluate(`var module = { exports: {} }; ${axeSource}`);

  // Run axe analysis
  return page.evaluate(() => {
    return (window as any).axe.run({
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'],
      },
    });
  });
}
```

```typescript
// src/lib/crawler/site-crawler.ts — new file
import { PlaywrightCrawler, Configuration } from 'crawlee';
import { scanPage } from '../scanner/engine';
import { parseAxeResults } from '../scanner/result-parser';
import type { ScanResults } from '../types/scan';

interface CrawlOptions {
  rootUrl: string;
  maxPages: number;      // default: 50
  maxDepth: number;       // default: 5
  concurrency: number;    // default: 3
  delayMs: number;        // default: 1000
  onPageScanned?: (url: string, results: ScanResults, progress: { scanned: number; total: number }) => void;
}

export async function crawlAndScan(options: CrawlOptions): Promise<Map<string, ScanResults>> {
  const results = new Map<string, ScanResults>();
  let pagesScanned = 0;

  // Disable crawlee's default file storage — use in-memory
  const config = new Configuration({ persistStorage: false });

  const crawler = new PlaywrightCrawler({
    maxConcurrency: options.concurrency,
    maxRequestsPerCrawl: options.maxPages,
    launchContext: {
      launchOptions: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      },
    },
    async requestHandler({ request, page, enqueueLinks }) {
      // Run accessibility scan on this page
      const axeResults = await scanPage(page);
      const scanResults = parseAxeResults(request.loadedUrl || request.url, axeResults);
      results.set(request.loadedUrl || request.url, scanResults);

      pagesScanned++;
      options.onPageScanned?.(
        request.loadedUrl || request.url,
        scanResults,
        { scanned: pagesScanned, total: options.maxPages }
      );

      // Discover more links (BFS, same-hostname)
      await enqueueLinks({
        strategy: 'same-hostname',
        // Only follow HTML pages, not PDFs, images, etc.
        exclude: [/\.(pdf|zip|png|jpg|jpeg|gif|svg|css|js|woff|woff2|ttf|eot|ico)$/i],
      });

      // Rate limiting
      if (options.delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, options.delayMs));
      }
    },
    async failedRequestHandler({ request }) {
      console.error(`Failed to scan: ${request.url}`);
    },
  }, config);

  await crawler.run([options.rootUrl]);
  return results;
}
```

#### Option B: Custom Playwright-based crawler (lightweight alternative)

For minimal dependency overhead, manage the browser and queue manually:

```typescript
import { chromium, type Browser, type Page } from 'playwright';

async function crawlSite(rootUrl: string, maxPages: number = 50): Promise<Map<string, ScanResults>> {
  const browser = await chromium.launch({ headless: true });
  const visited = new Set<string>();
  const queue: string[] = [normalizeUrl(rootUrl)];
  const results = new Map<string, ScanResults>();

  try {
    while (queue.length > 0 && visited.size < maxPages) {
      const url = queue.shift()!;
      if (visited.has(url)) continue;
      visited.add(url);

      const context = await browser.newContext();
      const page = await context.newPage();

      try {
        await page.goto(url, { waitUntil: 'load', timeout: 30000 });

        // Scan
        const axeResults = await scanPage(page);
        results.set(url, parseAxeResults(url, axeResults));

        // Extract links
        const links = await extractLinks(page, rootUrl);
        for (const link of links) {
          if (!visited.has(link) && !queue.includes(link)) {
            queue.push(link);
          }
        }
      } finally {
        await context.close();
      }

      // Rate limit
      await new Promise(r => setTimeout(r, 1000));
    }
  } finally {
    await browser.close();
  }

  return results;
}
```

**Comparison**:
| Aspect | crawlee (Option A) | Custom (Option B) |
|---|---|---|
| Development effort | Low | Medium-High |
| URL deduplication | Built-in | Must implement |
| Retry on failure | Built-in | Must implement |
| Concurrency | AutoscaledPool | Must implement |
| Memory management | Browser pool manages reuse | Must manage manually |
| Depth limiting | Built-in via request metadata | Must implement |
| Dependencies | +crawlee (~36KB package itself, but pulls in many sub-packages) | None beyond existing |
| Customizability | High via hooks | Total |

### Browser Instance Reuse

crawlee's `BrowserPool` automatically:
1. Launches a configurable number of browser instances
2. Opens new **browser contexts** (isolated like incognito windows) for each request
3. Reuses the same browser process across many pages
4. Retires browsers after N pages to prevent memory leaks

For the custom approach, reuse one `Browser` instance but create fresh `BrowserContext` per page to ensure isolation.

### Memory Management for Large Sites (100+ Pages)

Key considerations:
- Each browser page with rendered content uses ~50-100MB RAM
- A process scanning 100 pages might peak at 500MB-1GB with concurrency of 3-5
- **Strategies**:
  1. Close each `BrowserContext` after scanning (don't keep pages open)
  2. Limit concurrency to 3 for reliability
  3. Process and discard raw axe results immediately, keeping only parsed `ScanResults`
  4. For very large sites (500+), consider breaking into batches
  5. crawlee's `AutoscaledPool` handles this automatically by monitoring system resources

### Progress Reporting (SSE with Per-Page Updates)

Extend the existing SSE status endpoint to report multi-page progress:

```typescript
// Progress payload for site crawl
interface CrawlProgress {
  status: 'crawling' | 'complete' | 'error';
  pagesScanned: number;
  pagesTotal: number;       // estimated or maxPages
  currentUrl: string;
  pageResults: {             // latest page result summary
    url: string;
    score: number;
    violationCount: number;
  };
}
```

The existing SSE pattern in `src/app/api/scan/[id]/status/route.ts` uses polling with `setInterval`. For Phase 2, the crawl's `onPageScanned` callback updates the store, and the SSE endpoint emits per-page events:

```
data: {"status":"crawling","pagesScanned":3,"pagesTotal":50,"currentUrl":"https://...","pageResults":{"url":"...","score":85,"violationCount":12}}

data: {"status":"crawling","pagesScanned":4,"pagesTotal":50,...}

data: {"status":"complete","pagesScanned":47,"pagesTotal":50,...}
```

---

## 5. Sitemap-Based Discovery

### When to Use Sitemaps

| Scenario | Recommended approach |
|---|---|
| Site has sitemap.xml | Fetch sitemap first, combine with crawl |
| No sitemap available | Fall back to link-based crawling only |
| Large site (500+ URLs) | Sitemap preferred — avoids deep/exhaustive crawling |
| SPA with limited server-rendered links | Sitemap essential — links may not be in DOM |

### Implementation with sitemapper

```typescript
import Sitemapper from 'sitemapper';
import robotsParser from 'robots-parser';

async function discoverUrlsFromSitemap(rootUrl: string): Promise<string[]> {
  // 1. Check robots.txt for sitemap directives
  const robotsUrl = new URL('/robots.txt', rootUrl).toString();
  let sitemapUrls: string[] = [];

  try {
    const robotsResponse = await fetch(robotsUrl);
    if (robotsResponse.ok) {
      const robots = robotsParser(robotsUrl, await robotsResponse.text());
      sitemapUrls = robots.getSitemaps();
    }
  } catch { /* robots.txt not available */ }

  // 2. Try default sitemap location if none found in robots.txt
  if (sitemapUrls.length === 0) {
    sitemapUrls = [new URL('/sitemap.xml', rootUrl).toString()];
  }

  // 3. Parse sitemaps
  const sitemap = new Sitemapper({ timeout: 15000, concurrency: 5 });
  const allUrls: string[] = [];

  for (const sitemapUrl of sitemapUrls) {
    try {
      const { sites } = await sitemap.fetch(sitemapUrl);
      allUrls.push(...sites);
    } catch { /* sitemap not available */ }
  }

  return allUrls;
}
```

### Combined Discovery Strategy (RECOMMENDED)

1. **Pre-crawl**: Fetch robots.txt → extract sitemap URLs → parse sitemaps → seed the URL queue
2. **During crawl**: Also discover links via `enqueueLinks()` for completeness
3. **Benefit**: Catches pages listed in sitemaps but not linked from navigation, AND catches pages linked in navigation but not in sitemaps

```typescript
async function initializeCrawlQueue(rootUrl: string): Promise<string[]> {
  const sitemapUrls = await discoverUrlsFromSitemap(rootUrl);
  // Filter to same hostname
  const rootHostname = new URL(rootUrl).hostname;
  const filteredUrls = sitemapUrls.filter(url => {
    try { return new URL(url).hostname === rootHostname; }
    catch { return false; }
  });
  // Always include root URL
  return [rootUrl, ...filteredUrls.filter(u => u !== rootUrl)];
}
```

### Pros/Cons: Sitemap vs Link Crawling

| Factor | Sitemap Discovery | Link Crawling |
|---|---|---|
| Speed of URL collection | Very fast (single XML request) | Slow (one page at a time) |
| Requires sitemap | Yes | No |
| Discovers orphan pages | Yes (if in sitemap) | No |
| Discovers JS-rendered links | No | Yes |
| Coverage of real user paths | Low (lists all pages equally) | High (follows navigation) |
| Handles dynamic/SPA pages | Depends on sitemap accuracy | Yes |

---

## 6. URL Deduplication and Canonicalization

### Comprehensive Strategy

1. **Normalization** (before enqueuing): Apply the `normalizeUrl()` function from Section 2 to every discovered URL
2. **Set-based dedup**: Maintain a `Set<string>` of normalized URLs already visited or queued
3. **Canonical link tags**: After loading a page, check for `<link rel="canonical" href="...">`:
   ```typescript
   const canonical = await page.$eval(
     'link[rel="canonical"]',
     el => el.getAttribute('href')
   ).catch(() => null);

   if (canonical) {
     const normalizedCanonical = normalizeUrl(new URL(canonical, page.url()).toString());
     // Use canonical URL as the "real" URL for dedup and reporting
   }
   ```
4. **Heuristic filters**: Skip URLs that appear to be pagination variants or filter permutations:
   ```typescript
   const SKIP_PATTERNS = [
     /[?&]page=\d+/,           // pagination
     /[?&]sort=/,              // sort order
     /[?&]filter=/,            // filter params
     /[?&]lang=/,              // language variant (debatable)
     /\/print\/?$/,            // print versions
     /\/amp\/?$/,              // AMP versions
   ];
   ```

### crawlee's Built-in Deduplication

crawlee's `RequestQueue` automatically deduplicates URLs using a `uniqueKey` derived from the URL. You can customize the `uniqueKey` generation to use your normalization logic:

```typescript
await enqueueLinks({
  strategy: 'same-hostname',
  transformRequestFunction(req) {
    req.uniqueKey = normalizeUrl(req.url);
    return req;
  },
});
```

---

## 7. Performance Considerations

### Scan Time Estimates

| Site Size | Concurrency | Estimated Time | Memory |
|---|---|---|---|
| 10 pages | 2 | 30-60 sec | ~300 MB |
| 50 pages | 3 | 2-5 min | ~500 MB |
| 100 pages | 3 | 5-10 min | ~600 MB |
| 200 pages | 5 | 10-20 min | ~800 MB |
| 500 pages | 5 | 25-50 min | ~1 GB |

*(Assumes ~3-6 seconds per page: navigation + axe scan + link extraction + rate limit delay)*

### Optimization Strategies

1. **Skip non-HTML resources**: Filter URLs by extension before enqueuing
2. **Reuse browser contexts**: crawlee does this by default via `BrowserPool`
3. **Parallel axe runs**: Concurrency of 3-5 is the sweet spot
4. **Early termination**: If the crawl is taking too long, return partial results
5. **Sitemap seeding**: If sitemap is available, skip link crawling and just scan sitemap URLs directly (much faster for large sites)

---

## 8. Architecture Recommendation

### Recommended Stack

| Concern | Library/Approach |
|---|---|
| Crawling engine | `crawlee` (`PlaywrightCrawler`) |
| Sitemap discovery | `sitemapper` |
| robots.txt | `robots-parser` |
| Accessibility scanning | Existing `axe-core` injection (refactored to accept `Page`) |
| URL normalization | Custom `normalizeUrl()` utility function |
| Progress reporting | Existing SSE pattern (extended for multi-page) |

### New Dependencies to Add

```bash
npm install crawlee sitemapper robots-parser
```

### File Structure (Proposed)

```
src/lib/
  crawler/
    site-crawler.ts       # Main crawl orchestration using crawlee
    url-utils.ts          # normalizeUrl(), domain filtering, skip patterns
    robots.ts             # robots.txt fetching and checking
    sitemap.ts            # Sitemap discovery and parsing
  scanner/
    engine.ts             # Refactored: scanPage(page) instead of scanUrl(url)
    result-parser.ts      # Unchanged
    store.ts              # Extended: site scan records with per-page results
  types/
    crawl.ts              # CrawlOptions, CrawlProgress, SiteScanRecord types
    scan.ts               # Unchanged
```

### Key Design Decisions

1. **crawlee over custom**: Use crawlee's `PlaywrightCrawler` for reliable queue management, deduplication, retry, and browser pooling
2. **Combined discovery**: Sitemap + link crawling for maximum coverage
3. **BFS traversal**: More useful partial results for accessibility scanning
4. **Default limits**: 50 pages max, depth 5, concurrency 3, 1s delay between requests
5. **In-memory storage**: Disable crawlee's file-based persistence via `Configuration({ persistStorage: false })`
6. **Refactored scan engine**: `scanPage(page: Page)` accepts a Playwright Page instead of launching its own browser
7. **Progressive reporting**: SSE events per page scanned, enabling real-time progress UI

---

## Discovered Research Topics

- How to aggregate per-page axe results into a site-wide score (weighted by page importance? simple average?)
- PDF report generation for multi-page site scan (extension of existing single-page report)
- UI design for site crawl results (page list, per-page scores, site-wide summary)
- How to handle authentication-protected pages in the crawl
- Caching/resuming interrupted crawls (crawlee's `RequestQueue` persistence)

## Next Research with Potential Tools

- Research crawlee's `Configuration` API for disabling filesystem storage (use `fetch_webpage` on crawlee docs)
- Research crawlee's `enqueueLinks` `globs`, `pseudoUrls`, and `exclude` patterns for fine-grained filtering
- Research how to pass custom Playwright launch options through crawlee (already partially documented above)
- Look at `normalize-url` npm package as alternative to custom normalization (use `fetch_webpage` on npmjs)

## Clarifying Questions

1. **Page limit default**: Should the default max pages be 50 or 100? Higher default = longer scans but better coverage.
2. **Subdomain handling**: Should crawling include subdomains by default (e.g., `blog.example.com` when scanning `www.example.com`)?
3. **Authentication**: Should Phase 2 support authenticated crawling (login before scan)? This significantly increases complexity.
4. **Sitemap-only mode**: Should there be a "sitemap-only" discovery mode that skips link crawling entirely?
5. **Rate limit override**: Should users be able to configure the crawl delay, or always default to polite settings?

---

## References and Evidence

| Source | URL | Key Finding |
|---|---|---|
| crawlee npm | https://www.npmjs.com/package/crawlee | 77,882 weekly DL, Apache-2.0, TS built-in |
| crawlee docs | https://crawlee.dev/docs/introduction | Full scraping framework, PlaywrightCrawler, enqueueLinks |
| PlaywrightCrawler API | https://crawlee.dev/js/api/playwright-crawler/class/PlaywrightCrawler | BrowserPool, AutoscaledPool, addRequests, run |
| simplecrawler npm | https://www.npmjs.com/package/simplecrawler | 22,307 DL, 6 years old, HTTP-only |
| sitemapper npm | https://www.npmjs.com/package/sitemapper | 56,106 DL, TS built-in, active |
| robots-parser npm | https://www.npmjs.com/package/robots-parser | 2.2M DL, TS built-in, mature |
| sitemap-parser npm | https://www.npmjs.com/package/sitemap-parser | 8,807 DL, 9 years old, abandoned |
| website-scraper npm | https://www.npmjs.com/package/website-scraper | 24,444 DL, disk-oriented, not ideal |
| headless-chrome-crawler npm | https://www.npmjs.com/package/headless-chrome-crawler | 158 DL, 8 years old, dead |
| Existing engine.ts | src/lib/scanner/engine.ts | Launches browser per scan, injects axe-core |
| Existing store.ts | src/lib/scanner/store.ts | In-memory Map, per-scan status tracking |
| Existing SSE status | src/app/api/scan/[id]/status/route.ts | SSE polling pattern for scan progress |
