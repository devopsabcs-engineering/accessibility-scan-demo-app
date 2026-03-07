import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { CrawlConfig } from '../../types/crawl';

// Capture the handlers passed to PlaywrightCrawler constructor
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let _capturedOptions: Record<string, unknown>;

vi.mock('crawlee', () => ({
  PlaywrightCrawler: vi.fn().mockImplementation(function (this: Record<string, unknown>, options: Record<string, unknown>) {
    _capturedOptions = options;
    this.run = vi.fn().mockResolvedValue(undefined);
    return this;
  }),
  Configuration: {
    getGlobalConfig: vi.fn().mockReturnValue({ set: vi.fn() }),
  },
}));

vi.mock('uuid', () => ({ v4: vi.fn().mockReturnValue('mock-page-id') }));

vi.mock('../../scanner/engine', () => ({
  scanPage: vi.fn().mockResolvedValue({
    violations: [],
    passes: [],
    incomplete: [],
    inapplicable: [],
    testEngine: { name: 'axe-core', version: '4.10.0' },
  }),
}));

vi.mock('../../scanner/result-parser', () => ({
  parseAxeResults: vi.fn().mockReturnValue({
    violations: [],
    passes: [],
    score: { overallScore: 95, grade: 'A' },
  }),
}));

vi.mock('../../scanner/store', () => ({
  createScan: vi.fn(),
  updateScan: vi.fn(),
  getCrawl: vi.fn().mockReturnValue({
    id: 'crawl-1',
    status: 'scanning',
    progress: 10,
    message: '',
    completedPageCount: 0,
    failedPageCount: 0,
    totalPageCount: 1,
    pageIds: [],
  }),
  updateCrawl: vi.fn(),
}));

vi.mock('../url-utils', () => ({
  normalizeUrl: vi.fn((url: string) => url),
  isWithinDomainBoundary: vi.fn().mockReturnValue(true),
  isScannable: vi.fn().mockReturnValue(true),
  matchesPatterns: vi.fn().mockReturnValue(true),
}));

vi.mock('../robots', () => ({
  isAllowedByRobots: vi.fn().mockResolvedValue(true),
  getCrawlDelay: vi.fn().mockResolvedValue(null),
  getSitemapUrls: vi.fn().mockResolvedValue([]),
  clearRobotsCache: vi.fn(),
}));

vi.mock('../sitemap', () => ({
  discoverSitemapUrls: vi.fn().mockResolvedValue([]),
}));

import { startCrawl, cancelCrawl } from '../site-crawler';
import { getCrawlDelay, getSitemapUrls, clearRobotsCache } from '../robots';
import { discoverSitemapUrls } from '../sitemap';
import { updateCrawl, getCrawl } from '../../scanner/store';

const defaultConfig: CrawlConfig = {
  maxPages: 50,
  maxDepth: 3,
  concurrency: 3,
  delayMs: 1000,
  includePatterns: [],
  excludePatterns: [],
  respectRobotsTxt: true,
  followSitemaps: true,
  domainStrategy: 'same-hostname',
};

describe('site-crawler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _capturedOptions = {};
    vi.mocked(getCrawl).mockReturnValue({
      id: 'crawl-1',
      seedUrl: 'https://example.com',
      config: defaultConfig,
      status: 'scanning',
      progress: 10,
      message: '',
      startedAt: new Date().toISOString(),
      completedPageCount: 0,
      failedPageCount: 0,
      totalPageCount: 1,
      pageIds: [],
      discoveredUrls: [],
    });
  });

  describe('startCrawl', () => {
    it('transitions through discovering → scanning → aggregating → complete', async () => {
      await startCrawl('crawl-1', 'https://example.com', defaultConfig);

      const statusCalls = vi.mocked(updateCrawl).mock.calls;
      const statuses = statusCalls
        .filter(([, data]) => data.status)
        .map(([, data]) => data.status);

      expect(statuses).toContain('discovering');
      expect(statuses).toContain('scanning');
      expect(statuses).toContain('aggregating');
      expect(statuses).toContain('complete');
    });

    it('calls getCrawlDelay and getSitemapUrls when respectRobotsTxt is true', async () => {
      await startCrawl('crawl-1', 'https://example.com', {
        ...defaultConfig,
        respectRobotsTxt: true,
      });

      expect(getCrawlDelay).toHaveBeenCalledWith('https://example.com');
      expect(getSitemapUrls).toHaveBeenCalledWith('https://example.com');
    });

    it('skips robot functions when respectRobotsTxt is false', async () => {
      await startCrawl('crawl-1', 'https://example.com', {
        ...defaultConfig,
        respectRobotsTxt: false,
      });

      expect(getCrawlDelay).not.toHaveBeenCalled();
      expect(getSitemapUrls).not.toHaveBeenCalled();
    });

    it('calls discoverSitemapUrls when followSitemaps is true', async () => {
      await startCrawl('crawl-1', 'https://example.com', {
        ...defaultConfig,
        followSitemaps: true,
      });

      expect(discoverSitemapUrls).toHaveBeenCalled();
    });

    it('skips sitemap discovery when followSitemaps is false', async () => {
      await startCrawl('crawl-1', 'https://example.com', {
        ...defaultConfig,
        followSitemaps: false,
      });

      expect(discoverSitemapUrls).not.toHaveBeenCalled();
    });

    it('calls clearRobotsCache in finally block', async () => {
      await startCrawl('crawl-1', 'https://example.com', defaultConfig);

      expect(clearRobotsCache).toHaveBeenCalled();
    });

    it('calls clearRobotsCache even when crawler.run rejects', async () => {
      const crawlee = await import('crawlee');
      vi.mocked(crawlee.PlaywrightCrawler).mockImplementationOnce(function (this: Record<string, unknown>, options: Record<string, unknown>) {
        _capturedOptions = options;
        this.run = vi.fn().mockRejectedValue(new Error('Crawl failed'));
        return this;
      });

      await startCrawl('crawl-err', 'https://example.com', defaultConfig);

      expect(clearRobotsCache).toHaveBeenCalled();
    });

    it('sets status to error when crawl throws', async () => {
      const crawlee = await import('crawlee');
      vi.mocked(crawlee.PlaywrightCrawler).mockImplementationOnce(function (this: Record<string, unknown>, options: Record<string, unknown>) {
        _capturedOptions = options;
        this.run = vi.fn().mockRejectedValue(new Error('Crawl failed'));
        return this;
      });

      await startCrawl('crawl-1', 'https://example.com', defaultConfig);

      const statusCalls = vi.mocked(updateCrawl).mock.calls;
      const errorUpdate = statusCalls.find(([, data]) => data.status === 'error');
      expect(errorUpdate).toBeDefined();
    });

    it('calls onProgress callback during crawl', async () => {
      const onProgress = vi.fn();

      await startCrawl('crawl-1', 'https://example.com', defaultConfig, onProgress);

      expect(onProgress).toHaveBeenCalled();
      // Verify at least one call has the expected shape
      const firstCall = onProgress.mock.calls[0][0];
      expect(firstCall).toHaveProperty('status');
      expect(firstCall).toHaveProperty('progress');
      expect(firstCall).toHaveProperty('message');
    });

    it('stores abortController on the crawl record', async () => {
      await startCrawl('crawl-1', 'https://example.com', defaultConfig);

      const calls = vi.mocked(updateCrawl).mock.calls;
      const abortUpdate = calls.find(([, data]) => 'abortController' in data);
      expect(abortUpdate).toBeDefined();
    });
  });

  describe('cancelCrawl', () => {
    it('returns true and sets cancelled status when crawl exists', async () => {
      // Start a crawl that hangs on run() so we can cancel it
      let resolveRun: () => void;
      const runPromise = new Promise<void>((resolve) => { resolveRun = resolve; });
      const crawlee = await import('crawlee');
      vi.mocked(crawlee.PlaywrightCrawler).mockImplementationOnce(function (this: Record<string, unknown>, options: Record<string, unknown>) {
        _capturedOptions = options;
        this.run = vi.fn().mockReturnValue(runPromise);
        return this;
      });

      // Start without awaiting — crawl will hang on run()
      const crawlPromise = startCrawl('crawl-cancel', 'https://example.com', defaultConfig);

      // Wait for async setup to register the abort controller
      await new Promise(resolve => setTimeout(resolve, 50));

      const result = cancelCrawl('crawl-cancel');

      expect(result).toBe(true);

      const statusCalls = vi.mocked(updateCrawl).mock.calls;
      const cancelUpdate = statusCalls.find(([, data]) => data.status === 'cancelled');
      expect(cancelUpdate).toBeDefined();

      // Resolve the hanging run to let the promise settle
      resolveRun!();
      await crawlPromise;
    });

    it('returns false when crawl does not exist', () => {
      const result = cancelCrawl('nonexistent-crawl');

      expect(result).toBe(false);
    });
  });
});
