import { vi, describe, it, expect, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  const mockAnalyze = vi.fn().mockResolvedValue({
    violations: [],
    passes: [],
    incomplete: [],
    inapplicable: [],
    testEngine: { name: 'axe-core', version: '4.10.0' },
  });
  const mockWithTags = vi.fn();

  const builderInstance = {
    withTags: mockWithTags,
    analyze: mockAnalyze,
  };

  // withTags returns the builder for chaining
  mockWithTags.mockReturnValue(builderInstance);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const MockAxeBuilder = vi.fn().mockImplementation(function (_opts: unknown) {
    return builderInstance;
  });

  const mockPage = {
    goto: vi.fn().mockResolvedValue(undefined),
    waitForLoadState: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
  };
  const mockIbmPage = {
    goto: vi.fn().mockResolvedValue(undefined),
    waitForLoadState: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
  };
  // Track which page newPage returns: first call -> mockPage (main), second -> mockIbmPage (IBM)
  let newPageCallCount = 0;
  const mockContext = {
    newPage: vi.fn().mockImplementation(() => {
      newPageCallCount++;
      return Promise.resolve(newPageCallCount <= 1 ? mockPage : mockIbmPage);
    }),
    close: vi.fn(),
  };
  const mockBrowser = {
    newContext: vi.fn().mockResolvedValue(mockContext),
    close: vi.fn().mockResolvedValue(undefined),
  };

  const mockGetCompliance = vi.fn().mockResolvedValue({
    report: { results: [] },
  });

  return {
    MockAxeBuilder,
    mockWithTags,
    mockAnalyze,
    mockPage,
    mockIbmPage,
    get newPageCallCount() { return newPageCallCount; },
    set newPageCallCount(v: number) { newPageCallCount = v; },
    mockContext,
    mockBrowser,
    mockGetCompliance,
    chromium: {
      launch: vi.fn().mockResolvedValue(mockBrowser),
    },
  };
});

vi.mock('playwright', () => ({
  chromium: mocks.chromium,
}));

vi.mock('@axe-core/playwright', () => ({
  default: mocks.MockAxeBuilder,
}));

vi.mock('accessibility-checker', () => ({
  getCompliance: mocks.mockGetCompliance,
}));

import { scanPage, scanUrl, multiEngineScan } from '../engine';

describe('engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.newPageCallCount = 0;
    mocks.chromium.launch.mockResolvedValue(mocks.mockBrowser);
    mocks.mockBrowser.newContext.mockResolvedValue(mocks.mockContext);
    mocks.mockContext.newPage.mockImplementation(() => {
      mocks.newPageCallCount++;
      return Promise.resolve(mocks.newPageCallCount <= 1 ? mocks.mockPage : mocks.mockIbmPage);
    });
    mocks.mockPage.goto.mockResolvedValue(undefined);
    mocks.mockIbmPage.goto.mockResolvedValue(undefined);
    mocks.mockAnalyze.mockResolvedValue({
      violations: [],
      passes: [],
      incomplete: [],
      inapplicable: [],
      testEngine: { name: 'axe-core', version: '4.10.0' },
    });
  });

  describe('scanPage', () => {
    it('constructs AxeBuilder with the page and runs analysis', async () => {
      const expectedResults = {
        violations: [{ id: 'color-contrast', impact: 'serious' }],
        passes: [{ id: 'html-has-lang' }],
        incomplete: [],
        inapplicable: [],
      };
      mocks.mockAnalyze.mockResolvedValueOnce(expectedResults);

      const results = await scanPage(mocks.mockPage as never);

      expect(mocks.MockAxeBuilder).toHaveBeenCalledWith({ page: mocks.mockPage });
      expect(mocks.mockWithTags).toHaveBeenCalledWith(
        ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'],
      );
      expect(mocks.mockAnalyze).toHaveBeenCalled();
      expect(results).toEqual(expectedResults);
    });

    it('returns empty results when no violations found', async () => {
      const emptyResults = {
        violations: [],
        passes: [{ id: 'html-has-lang' }],
        incomplete: [],
        inapplicable: [],
      };
      mocks.mockAnalyze.mockResolvedValueOnce(emptyResults);

      const results = await scanPage(mocks.mockPage as never);

      expect(results.violations).toHaveLength(0);
    });

    it('includes best-practice in the tags array', async () => {
      await scanPage(mocks.mockPage as never);

      const tagsArg = mocks.mockWithTags.mock.calls[0][0] as string[];
      expect(tagsArg).toContain('best-practice');
    });
  });

  describe('scanUrl', () => {
    it('launches browser, navigates, scans, and closes browser', async () => {
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

      await scanUrl('https://example.com', onProgress);

      expect(onProgress).toHaveBeenCalledWith('navigating', 10);
      expect(onProgress).toHaveBeenCalledWith('scanning', 40);
      expect(onProgress).toHaveBeenCalledWith('scoring', 80);
    });

    it('handles navigation timeout by falling back to domcontentloaded', async () => {
      const timeoutError = new Error('Timeout 30000ms exceeded');
      mocks.mockPage.goto.mockRejectedValueOnce(timeoutError);

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
      mocks.mockAnalyze.mockRejectedValueOnce(new Error('axe eval failed'));

      await expect(scanUrl('https://example.com')).rejects.toThrow('axe eval failed');

      expect(mocks.mockBrowser.close).toHaveBeenCalled();
    });

    it('returns multi-engine results on successful scan', async () => {
      const axeData = {
        violations: [{ id: 'image-alt', impact: 'serious', tags: ['wcag2a'], description: 'Alt', help: 'Alt', helpUrl: '', nodes: [{ html: '<img>', target: ['img'], impact: 'serious', any: [], all: [], none: [] }] }],
        passes: [],
        incomplete: [],
        inapplicable: [],
        testEngine: { name: 'axe-core', version: '4.10.0' },
      };
      mocks.mockAnalyze.mockResolvedValueOnce(axeData);

      const results = await scanUrl('https://example.com');

      // scanUrl now returns MultiEngineResults
      expect(results).toHaveProperty('engineVersions');
      expect(results.violations.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('multiEngineScan', () => {
    it('runs axe-core on main page and IBM in isolated page', async () => {
      const axeData = {
        violations: [],
        passes: [],
        incomplete: [],
        inapplicable: [],
        testEngine: { name: 'axe-core', version: '4.10.0' },
      };
      mocks.mockAnalyze.mockResolvedValueOnce(axeData);
      mocks.mockGetCompliance.mockResolvedValueOnce({
        report: {
          results: [{
            ruleId: 'img_alt_valid',
            value: ['VIOLATION', 'FAIL'],
            path: { dom: 'img.test' },
            message: 'Missing alt',
            snippet: '<img>',
            level: 'violation',
          }],
        },
      });

      const results = await multiEngineScan(mocks.mockPage as never, 'https://example.com', mocks.mockContext as never);

      expect(results.engineVersions['axe-core']).toBe('4.10.0');
      expect(results.engineVersions['ibm-equal-access']).toBe('latest');
      expect(results.violations).toHaveLength(1);
      expect(results.violations[0].engine).toBe('ibm-equal-access');
      // IBM scan should have opened a separate page
      expect(mocks.mockContext.newPage).toHaveBeenCalled();
    });

    it('gracefully degrades when IBM scan fails', async () => {
      const axeData = {
        violations: [{ id: 'color-contrast', impact: 'serious', tags: ['wcag2aa'], description: 'Contrast', help: 'Contrast', helpUrl: '', nodes: [{ html: '<p>', target: ['p'], impact: 'serious', any: [], all: [], none: [] }] }],
        passes: [],
        incomplete: [],
        inapplicable: [],
        testEngine: { name: 'axe-core', version: '4.10.0' },
      };
      mocks.mockAnalyze.mockResolvedValueOnce(axeData);
      mocks.mockGetCompliance.mockRejectedValueOnce(new Error('IBM engine failure'));

      const results = await multiEngineScan(mocks.mockPage as never, 'https://example.com', mocks.mockContext as never);

      // Should still return axe results even though IBM failed
      expect(results.violations).toHaveLength(1);
      expect(results.violations[0].id).toBe('color-contrast');
      expect(results.engineVersions['axe-core']).toBe('4.10.0');
    });

    it('returns MultiEngineResults format with engineVersions', async () => {
      mocks.mockGetCompliance.mockResolvedValueOnce({ report: { results: [] } });

      const results = await multiEngineScan(mocks.mockPage as never, 'https://example.com', mocks.mockContext as never);

      expect(results).toHaveProperty('engineVersions');
      expect(results).toHaveProperty('violations');
      expect(results).toHaveProperty('passes');
      expect(results).toHaveProperty('incomplete');
      expect(results).toHaveProperty('inapplicable');
    });
  });
});
