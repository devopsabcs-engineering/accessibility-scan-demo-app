import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

// Read axe-core source once at module load time
const axeSource = fs.readFileSync(
  path.resolve(process.cwd(), 'node_modules', 'axe-core', 'axe.min.js'),
  'utf-8'
);

export async function scanUrl(
  url: string,
  onProgress?: (status: string, progress: number) => void
) {
  onProgress?.('navigating', 10);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 1024 },
  });
  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    onProgress?.('scanning', 40);

    // Inject axe-core with a module shim to avoid "module is not defined" error
    await page.evaluate(`
      var module = { exports: {} };
      ${axeSource}
    `);

    // Run axe analysis with WCAG 2.2 AA tags
    const results = await page.evaluate(() => {
      return (window as unknown as { axe: { run: (options: object) => Promise<unknown> } }).axe.run({
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'],
        },
      });
    });

    onProgress?.('scoring', 80);
    return results as import('axe-core').AxeResults;
  } finally {
    await browser.close();
  }
}
