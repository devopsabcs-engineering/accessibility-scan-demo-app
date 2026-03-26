import { PlaywrightCrawler, Configuration, type PlaywrightCrawlingContext } from 'crawlee';
import { v4 as uuidv4 } from 'uuid';
import { scanPage } from '../scanner/engine';
import { parseAxeResults } from '../scanner/result-parser';
import { createScan, updateScan, getCrawl, updateCrawl } from '../scanner/store';
import { normalizeUrl, isWithinDomainBoundary, isScannable, matchesPatterns } from './url-utils';
import { isAllowedByRobots, getCrawlDelay, getSitemapUrls, clearRobotsCache } from './robots';
import { discoverSitemapUrls } from './sitemap';
import type { CrawlConfig, CrawlProgressEvent, PageSummary } from '../types/crawl';

export type ProgressCallback = (event: CrawlProgressEvent) => void;

// Active AbortControllers keyed by crawlId
const activeAbortControllers = new Map<string, AbortController>();

/**
 * Start a site crawl. Runs asynchronously, updates store as pages complete.
 *
 * Flow:
 * 1. Validate seed URL and fetch robots.txt
 * 2. Discover sitemap URLs and seed the queue
 * 3. Launch PlaywrightCrawler with BFS traversal
 * 4. For each page: navigate → scanPage() → parse → score → store
 * 5. Emit progress events per page completion
 * 6. On completion: update crawl record to 'complete'
 */
export async function startCrawl(
  crawlId: string,
  seedUrl: string,
  config: CrawlConfig,
  onProgress?: ProgressCallback
): Promise<void> {
  const abortController = new AbortController();
  activeAbortControllers.set(crawlId, abortController);

  // Also store on the CrawlRecord for external access
  updateCrawl(crawlId, { abortController });

  const completedPages: PageSummary[] = [];
  const visitedUrls = new Set<string>();

  try {
    // Phase: discovering
    updateCrawl(crawlId, { status: 'discovering', progress: 5, message: 'Fetching robots.txt and sitemaps...' });
    emitProgress(crawlId, completedPages, onProgress);

    // Fetch robots.txt info
    let robotsCrawlDelay: number | null = null;
    let robotsSitemapUrls: string[] = [];
    if (config.respectRobotsTxt) {
      robotsCrawlDelay = await getCrawlDelay(seedUrl);
      robotsSitemapUrls = await getSitemapUrls(seedUrl);
    }

    // Use robots.txt crawl delay if present and larger than configured delay
    const effectiveDelay = robotsCrawlDelay !== null
      ? Math.max(config.delayMs, robotsCrawlDelay)
      : config.delayMs;

    // Discover sitemap URLs
    let sitemapUrls: string[] = [];
    if (config.followSitemaps) {
      sitemapUrls = await discoverSitemapUrls(seedUrl, robotsSitemapUrls);
    }

    // Build initial seed URLs: sitemap URLs + seed URL
    const seedUrls = new Set<string>();
    seedUrls.add(normalizeUrl(seedUrl));
    for (const url of sitemapUrls) {
      const normalized = normalizeUrl(url);
      if (
        isScannable(normalized) &&
        isWithinDomainBoundary(normalized, seedUrl, config.domainStrategy) &&
        matchesPatterns(normalized, config.includePatterns, config.excludePatterns)
      ) {
        seedUrls.add(normalized);
      }
    }

    const totalEstimate = Math.min(seedUrls.size, config.maxPages);
    updateCrawl(crawlId, {
      status: 'scanning',
      progress: 10,
      message: `Starting crawl of ${totalEstimate} discovered URLs...`,
      discoveredUrls: Array.from(seedUrls),
      totalPageCount: totalEstimate,
    });
    emitProgress(crawlId, completedPages, onProgress);

    // Prevent crawlee from writing state to disk
    Configuration.getGlobalConfig().set('persistStorage', false);

    // Track depth per URL
    const urlDepth = new Map<string, number>();
    for (const url of seedUrls) {
      urlDepth.set(url, 0);
    }

    const crawler = new PlaywrightCrawler({
      // Do NOT set maxRequestsPerCrawl — crawlee counts enqueued (not processed)
      // requests against this limit, which causes premature 0-result shutdowns
      // when many sitemap URLs are seeded. We enforce the page limit ourselves
      // by aborting the crawl once visitedUrls reaches config.maxPages.
      maxConcurrency: config.concurrency,
      requestHandlerTimeoutSecs: 60,
      navigationTimeoutSecs: 30,
      launchContext: {
        launchOptions: {
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        },
      },
      browserPoolOptions: {
        useFingerprints: false,
      },

      async requestHandler(context: PlaywrightCrawlingContext) {
        const { page, request, enqueueLinks } = context;
        const currentUrl = normalizeUrl(request.loadedUrl || request.url);

        // Check abort
        if (abortController.signal.aborted) return;

        // Skip if already visited
        if (visitedUrls.has(currentUrl)) return;

        // Domain boundary check
        if (!isWithinDomainBoundary(currentUrl, seedUrl, config.domainStrategy)) return;

        // Pattern check
        if (!matchesPatterns(currentUrl, config.includePatterns, config.excludePatterns)) return;

        // Scannable check
        if (!isScannable(currentUrl)) return;

        // Robots.txt check
        if (config.respectRobotsTxt) {
          const allowed = await isAllowedByRobots(currentUrl);
          if (!allowed) return;
        }

        visitedUrls.add(currentUrl);

        // Enforce our own page limit — abort crawl when enough pages scanned
        if (visitedUrls.size > config.maxPages) {
          abortController.abort();
          return;
        }

        const pageId = uuidv4();
        createScan(pageId, currentUrl);
        updateScan(pageId, { status: 'scanning', progress: 30, message: 'Running accessibility scan...' });

        try {
          // Scan the page with axe-core
          const axeResults = await scanPage(page);
          const scanResults = parseAxeResults(currentUrl, axeResults);

          // Store scan result
          updateScan(pageId, {
            status: 'complete',
            progress: 100,
            message: 'Scan complete',
            completedAt: new Date().toISOString(),
            results: scanResults,
          });

          // Build page summary
          const pageSummary: PageSummary = {
            pageId,
            url: currentUrl,
            score: scanResults.score.overallScore,
            grade: scanResults.score.grade,
            violationCount: scanResults.violations.length,
            passCount: scanResults.passes.length,
            status: 'complete',
            scannedAt: new Date().toISOString(),
          };
          completedPages.push(pageSummary);

          // Update crawl record
          const crawl = getCrawl(crawlId);
          if (crawl) {
            const newCompletedCount = crawl.completedPageCount + 1;
            const totalPages = Math.max(crawl.totalPageCount, newCompletedCount + crawl.failedPageCount);
            const progressPct = Math.min(90, Math.round(((newCompletedCount + crawl.failedPageCount) / totalPages) * 80) + 10);

            updateCrawl(crawlId, {
              completedPageCount: newCompletedCount,
              totalPageCount: totalPages,
              pageIds: [...crawl.pageIds, pageId],
              progress: progressPct,
              message: `Scanned ${newCompletedCount} of ${totalPages} pages`,
            });
          }
        } catch (scanError: unknown) {
          // Failed page — log but don't halt crawl
          const errorMsg = scanError instanceof Error ? scanError.message : 'Unknown scan error';
          updateScan(pageId, {
            status: 'error',
            progress: 100,
            message: errorMsg,
            error: errorMsg,
            completedAt: new Date().toISOString(),
          });

          const crawl = getCrawl(crawlId);
          if (crawl) {
            updateCrawl(crawlId, {
              failedPageCount: crawl.failedPageCount + 1,
              pageIds: [...crawl.pageIds, pageId],
            });
          }
        }

        // Emit progress
        emitProgress(crawlId, completedPages, onProgress);

        // Enqueue discovered links for BFS (respecting depth)
        const currentDepth = urlDepth.get(currentUrl) ?? 0;
        if (currentDepth < config.maxDepth) {
          await enqueueLinks({
            strategy: 'same-hostname',
            transformRequestFunction: (req) => {
              const normalized = normalizeUrl(req.url);
              if (!isScannable(normalized)) return false;
              if (!isWithinDomainBoundary(normalized, seedUrl, config.domainStrategy)) return false;
              if (!matchesPatterns(normalized, config.includePatterns, config.excludePatterns)) return false;
              if (visitedUrls.has(normalized)) return false;

              // Track depth for newly discovered URLs
              if (!urlDepth.has(normalized)) {
                urlDepth.set(normalized, currentDepth + 1);
              }

              req.url = normalized;
              return req;
            },
          });
        }

        // Respect crawl delay between requests
        if (effectiveDelay > 0) {
          await new Promise(resolve => setTimeout(resolve, effectiveDelay));
        }
      },

      async failedRequestHandler({ request }, error) {
        const failUrl = normalizeUrl(request.url);
        if (visitedUrls.has(failUrl)) return;
        visitedUrls.add(failUrl);

        const pageId = uuidv4();
        createScan(pageId, failUrl);
        const errorMsg = error instanceof Error ? error.message : 'Navigation failed';
        updateScan(pageId, {
          status: 'error',
          progress: 100,
          message: errorMsg,
          error: errorMsg,
          completedAt: new Date().toISOString(),
        });

        const crawl = getCrawl(crawlId);
        if (crawl) {
          updateCrawl(crawlId, {
            failedPageCount: crawl.failedPageCount + 1,
            pageIds: [...crawl.pageIds, pageId],
          });
        }
        emitProgress(crawlId, completedPages, onProgress);
      },
    });

    // Seed the crawler. The primary URL is always first to guarantee it is
    // crawled. Remaining sitemap-discovered URLs are included but capped to
    // avoid very large initial queues that slow startup.
    const primarySeed = normalizeUrl(seedUrl);
    const remainingSeeds = Array.from(seedUrls).filter(u => u !== primarySeed);
    const cappedSeeds = [primarySeed, ...remainingSeeds].slice(0, config.maxPages);
    await crawler.run(cappedSeeds);

    // Aggregation phase
    updateCrawl(crawlId, { status: 'aggregating', progress: 95, message: 'Aggregating results...' });
    emitProgress(crawlId, completedPages, onProgress);

    // Mark crawl complete
    const finalCrawl = getCrawl(crawlId);
    updateCrawl(crawlId, {
      status: 'complete',
      progress: 100,
      message: `Crawl complete: ${finalCrawl?.completedPageCount ?? 0} pages scanned`,
      completedAt: new Date().toISOString(),
    });
    emitProgress(crawlId, completedPages, onProgress);

  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Crawl failed';
    const crawl = getCrawl(crawlId);
    if (crawl && crawl.status !== 'cancelled') {
      updateCrawl(crawlId, {
        status: 'error',
        progress: 100,
        message: errorMsg,
        error: errorMsg,
        completedAt: new Date().toISOString(),
      });
    }
    emitProgress(crawlId, completedPages, onProgress);
  } finally {
    activeAbortControllers.delete(crawlId);
    clearRobotsCache();
  }
}

/**
 * Cancel a running crawl by aborting its AbortController.
 * Returns true if the crawl was found and cancelled.
 */
export function cancelCrawl(crawlId: string): boolean {
  const controller = activeAbortControllers.get(crawlId);
  if (!controller) return false;

  controller.abort();
  activeAbortControllers.delete(crawlId);

  updateCrawl(crawlId, {
    status: 'cancelled',
    progress: 100,
    message: 'Crawl cancelled by user',
    completedAt: new Date().toISOString(),
  });

  return true;
}

function emitProgress(
  crawlId: string,
  completedPages: PageSummary[],
  onProgress?: ProgressCallback
): void {
  if (!onProgress) return;

  const crawl = getCrawl(crawlId);
  if (!crawl) return;

  onProgress({
    status: crawl.status,
    progress: crawl.progress,
    message: crawl.message,
    totalPages: crawl.totalPageCount,
    completedPages: crawl.completedPageCount,
    failedPages: crawl.failedPageCount,
    pagesCompleted: completedPages,
  });
}
