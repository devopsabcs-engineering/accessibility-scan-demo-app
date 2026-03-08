import { chromium, type BrowserContext, type Page } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { getCompliance } from 'accessibility-checker';
import type { MultiEngineResults } from '../types/scan';
import { normalizeAndMerge, type IbmReportResult } from './result-normalizer';
import { runCustomChecks } from './custom-checks';

// Lazily read the raw axe-core source from disk on first use.
// We cannot use axe.source because webpack/turbopack mangles the bundled
// axeFunction.toString(), producing a broken single-line script.
// We also cannot use require.resolve at module scope because Next.js
// evaluates it at build time where it returns a webpack module ID (number).
let _safeAxeSource: string | null = null;
function getSafeAxeSource(): string {
  if (!_safeAxeSource) {
    const axeCorePath = join(dirname(require.resolve('axe-core')), 'axe.min.js');
    const rawAxeSource = readFileSync(axeCorePath, 'utf-8');
    _safeAxeSource = `(function(module, exports){${rawAxeSource}})(undefined, undefined);`;
  }
  return _safeAxeSource;
}

/**
 * Scan an already-navigated Playwright Page with axe-core only.
 * Used by the crawler where the crawler manages browser lifecycle and speed matters.
 */
export async function scanPage(page: Page): Promise<import('axe-core').AxeResults> {
  return new AxeBuilder({ page, axeSource: getSafeAxeSource() })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .analyze();
}

/**
 * Run IBM Equal Access scan in an isolated page to prevent its ACE engine
 * injection from corrupting the main page's JS context.
 */
async function runIbmScan(context: BrowserContext, url: string): Promise<IbmReportResult[]> {
  let ibmPage: Page | null = null;
  try {
    ibmPage = await context.newPage();
    await ibmPage.goto(url, { waitUntil: 'load', timeout: 30000 }).catch(() =>
      ibmPage!.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => {})
    );
    const result = await getCompliance(ibmPage, url);
    if (result && 'report' in result && result.report && 'results' in result.report) {
      return (result.report.results as IbmReportResult[]) ?? [];
    }
    return [];
  } catch {
    // Graceful degradation — IBM scan failure must not crash the entire scan
    return [];
  } finally {
    await ibmPage?.close().catch(() => {});
  }
}

/**
 * Navigate a page to a URL with timeout fallback.
 */
async function navigateTo(page: Page, url: string): Promise<void> {
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 30000 });
  } catch (navError: unknown) {
    if (navError instanceof Error && navError.message.includes('Timeout')) {
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => {});
    } else {
      throw navError;
    }
  }
}

/**
 * Run all scan engines. axe-core and custom checks share the main page;
 * IBM Equal Access runs in a separate isolated page to avoid context corruption.
 */
export async function multiEngineScan(
  page: Page,
  url: string,
  context?: BrowserContext,
): Promise<MultiEngineResults> {
  const axeResults = await scanPage(page);
  const customResults = await runCustomChecks(page);

  // IBM scan runs in an isolated page if a context is available
  const ibmResults = context
    ? await runIbmScan(context, url)
    : [];

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
    await navigateTo(page, url);
    onProgress?.('scanning', 40);

    const results = await multiEngineScan(page, url, context);

    onProgress?.('scoring', 80);
    return results;
  } finally {
    await browser.close();
  }
}
