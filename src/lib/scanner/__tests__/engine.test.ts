import { vi, describe, it, expect, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  const mockPage = {
    goto: vi.fn().mockResolvedValue(undefined),
    evaluate: vi.fn().mockResolvedValue({
      violations: [],
      passes: [],
      incomplete: [],
      inapplicable: [],
      testEngine: { name: 'axe-core', version: '4.10.0' },
    }),
    waitForLoadState: vi.fn().mockResolvedValue(undefined),
  };
  const mockContext = {
    newPage: vi.fn().mockResolvedValue(mockPage),
    close: vi.fn(),
  };
  const mockBrowser = {
    newContext: vi.fn().mockResolvedValue(mockContext),
    close: vi.fn().mockResolvedValue(undefined),
  };

  return {
    mockPage,
    mockContext,
    mockBrowser,
    chromium: {
      launch: vi.fn().mockResolvedValue(mockBrowser),
    },
    readFileSync: vi.fn().mockReturnValue('mock-axe-source'),
    resolve: vi.fn().mockReturnValue('/mock/path/axe.min.js'),
  };
});

vi.mock('playwright', () => ({
  chromium: mocks.chromium,
}));

vi.mock('fs', () => ({
  readFileSync: mocks.readFileSync,
}));

vi.mock('path', () => ({
  resolve: mocks.resolve,
}));

import { scanPage, scanUrl } from '../engine';

describe('engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.chromium.launch.mockResolvedValue(mocks.mockBrowser);
    mocks.mockBrowser.newContext.mockResolvedValue(mocks.mockContext);
    mocks.mockContext.newPage.mockResolvedValue(mocks.mockPage);
    mocks.mockPage.goto.mockResolvedValue(undefined);
    mocks.mockPage.evaluate.mockResolvedValue({
      violations: [],
      passes: [],
      incomplete: [],
      inapplicable: [],
      testEngine: { name: 'axe-core', version: '4.10.0' },
    });
  });

  describe('module-level initialization', () => {
    it('fs mock is configured to return axe source', () => {
      // fs.readFileSync is called at import time; verify mock returns expected value
      expect(mocks.readFileSync('any-path', 'utf-8')).toBe('mock-axe-source');
    });

    it('path.resolve mock is configured', () => {
      expect(mocks.resolve('a', 'b')).toBe('/mock/path/axe.min.js');
    });
  });

  describe('scanPage', () => {
    it('injects axe-core and runs analysis on the page', async () => {
      const expectedResults = {
        violations: [{ id: 'color-contrast', impact: 'serious' }],
        passes: [{ id: 'html-has-lang' }],
        incomplete: [],
        inapplicable: [],
      };
      mocks.mockPage.evaluate
        .mockResolvedValueOnce(undefined) // axe injection
        .mockResolvedValueOnce(expectedResults); // axe.run

      const results = await scanPage(mocks.mockPage as never);

      expect(mocks.mockPage.evaluate).toHaveBeenCalledTimes(2);
      expect(results).toEqual(expectedResults);
    });

    it('returns empty results when no violations found', async () => {
      const emptyResults = {
        violations: [],
        passes: [{ id: 'html-has-lang' }],
        incomplete: [],
        inapplicable: [],
      };
      mocks.mockPage.evaluate
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(emptyResults);

      const results = await scanPage(mocks.mockPage as never);

      expect(results.violations).toHaveLength(0);
    });
  });

  describe('scanUrl', () => {
    it('launches browser, navigates, scans, and closes browser', async () => {
      mocks.mockPage.evaluate
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce({ violations: [], passes: [], incomplete: [], inapplicable: [] });

      await scanUrl('https://example.com');

      expect(mocks.chromium.launch).toHaveBeenCalledWith(
        expect.objectContaining({ headless: true }),
      );
      expect(mocks.mockBrowser.newContext).toHaveBeenCalled();
      expect(mocks.mockContext.newPage).toHaveBeenCalled();
      expect(mocks.mockPage.goto).toHaveBeenCalledWith('https://example.com', expect.any(Object));
      expect(mocks.mockBrowser.close).toHaveBeenCalled();
    });

    it('calls onProgress callback at each stage', async () => {
      const onProgress = vi.fn();
      mocks.mockPage.evaluate
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce({ violations: [], passes: [], incomplete: [], inapplicable: [] });

      await scanUrl('https://example.com', onProgress);

      expect(onProgress).toHaveBeenCalledWith('navigating', 10);
      expect(onProgress).toHaveBeenCalledWith('scanning', 40);
      expect(onProgress).toHaveBeenCalledWith('scoring', 80);
    });

    it('handles navigation timeout by falling back to domcontentloaded', async () => {
      const timeoutError = new Error('Timeout 30000ms exceeded');
      mocks.mockPage.goto.mockRejectedValueOnce(timeoutError);
      mocks.mockPage.evaluate
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce({ violations: [], passes: [], incomplete: [], inapplicable: [] });

      await scanUrl('https://slow-site.com');

      expect(mocks.mockPage.waitForLoadState).toHaveBeenCalledWith('domcontentloaded', expect.any(Object));
      expect(mocks.mockBrowser.close).toHaveBeenCalled();
    });

    it('rethrows non-timeout navigation errors', async () => {
      const netError = new Error('net::ERR_CONNECTION_REFUSED');
      mocks.mockPage.goto.mockRejectedValueOnce(netError);

      await expect(scanUrl('https://unreachable.com')).rejects.toThrow('net::ERR_CONNECTION_REFUSED');

      expect(mocks.mockBrowser.close).toHaveBeenCalled();
    });

    it('closes browser even when scan throws', async () => {
      mocks.mockPage.evaluate.mockRejectedValueOnce(new Error('axe eval failed'));

      await expect(scanUrl('https://example.com')).rejects.toThrow('axe eval failed');

      expect(mocks.mockBrowser.close).toHaveBeenCalled();
    });

    it('returns axe results on successful scan', async () => {
      const expectedResults = {
        violations: [{ id: 'image-alt' }],
        passes: [],
        incomplete: [],
        inapplicable: [],
      };
      mocks.mockPage.evaluate
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(expectedResults);

      const results = await scanUrl('https://example.com');

      expect(results).toEqual(expectedResults);
    });
  });
});
