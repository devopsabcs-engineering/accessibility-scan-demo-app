import { chromium, type Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

// Read axe-core source once at module load time
const axeSource = fs.readFileSync(
  path.resolve(process.cwd(), 'node_modules', 'axe-core', 'axe.min.js'),
  'utf-8'
);

/**
 * Scan an already-navigated Playwright Page with axe-core.
 * Used by the crawler where the crawler manages browser lifecycle.
 */
export async function scanPage(page: Page): Promise<import('axe-core').AxeResults> {
  // Inject axe-core with a module shim to avoid "module is not defined" error
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

    const results = await scanPage(page);

    onProgress?.('scoring', 80);
    return results;
  } finally {
    await browser.close();
  }
}
