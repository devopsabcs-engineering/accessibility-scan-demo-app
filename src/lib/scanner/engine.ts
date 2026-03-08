import { chromium, type Page } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { getCompliance } from 'accessibility-checker';
import type { MultiEngineResults } from '../types/scan';
import { normalizeAndMerge, type IbmReportResult } from './result-normalizer';
import { runCustomChecks } from './custom-checks';

/**
 * Scan an already-navigated Playwright Page with axe-core only.
 * Used by the crawler where the crawler manages browser lifecycle and speed matters.
 */
export async function scanPage(page: Page): Promise<import('axe-core').AxeResults> {
  return new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .analyze();
}

/**
 * Run IBM Equal Access scan on a page with graceful degradation.
 * If IBM scan fails, returns empty array so the overall scan still succeeds.
 */
async function runIbmScan(page: Page, label: string): Promise<IbmReportResult[]> {
  try {
    const result = await getCompliance(page, label);
    if (result && 'report' in result && result.report && 'results' in result.report) {
      return (result.report.results as IbmReportResult[]) ?? [];
    }
    return [];
  } catch {
    // Graceful degradation — IBM scan failure must not crash the entire scan
    return [];
  }
}

/**
 * Run both axe-core and IBM Equal Access scans in parallel, then normalize and merge.
 */
export async function multiEngineScan(page: Page, url: string): Promise<MultiEngineResults> {
  const [axeResults, ibmResults, customResults] = await Promise.all([
    scanPage(page),
    runIbmScan(page, url),
    runCustomChecks(page),
  ]);
  return normalizeAndMerge(axeResults, ibmResults, customResults);
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
  const context = await browser.newContext({
    viewport: { width: 1280, height: 1024 },
  });
  const page = await context.newPage();

  try {
    // Use 'load' instead of 'networkidle' — some sites never reach network idle.
    // Fall back to domcontentloaded on timeout so the scan still runs.
    try {
      await page.goto(url, { waitUntil: 'load', timeout: 30000 });
    } catch (navError: unknown) {
      if (navError instanceof Error && navError.message.includes('Timeout')) {
        // Page partially loaded — wait for DOM at minimum, then proceed
        await page.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => {});
      } else {
        throw navError;
      }
    }
    onProgress?.('scanning', 40);

    const results = await multiEngineScan(page, url);

    onProgress?.('scoring', 80);
    return results;
  } finally {
    await browser.close();
  }
}
