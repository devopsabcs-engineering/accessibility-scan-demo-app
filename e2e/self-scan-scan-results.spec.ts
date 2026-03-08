import { test, expect } from './fixtures/axe-fixture';
import { seedScanResult } from './fixtures/seed-data';

test.describe('Scan results page accessibility', () => {
  test('has no WCAG 2.2 AA violations', async ({
    page,
    request,
    makeAxeBuilder,
  }) => {
    test.setTimeout(120_000); // 2 minutes for scan seeding + rendering
    const scanId = await seedScanResult(request);
    await page.goto(`/scan/${scanId}`);
    // Wait for the report heading to appear (ReportView renders h1)
    await page.waitForSelector('h1', { timeout: 60_000 });
    await page.waitForTimeout(1000);
    const results = await makeAxeBuilder().analyze();
    expect(results.violations).toEqual([]);
  });
});
