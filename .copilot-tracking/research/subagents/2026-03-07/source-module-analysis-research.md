# Source Module Analysis for Test Coverage

## Research Status: Complete

## Project Configuration

### package.json

- **Name**: accessibility-scan-demo-app
- **Version**: 0.1.0
- **No test framework configured** — no `jest`, `vitest`, `mocha`, or similar in dependencies or devDependencies
- **No test script** — only `dev`, `build`, `start`, `lint`
- **Path alias**: `@/*` maps to `./src/*` (in tsconfig)
- **TypeScript target**: ES2017, module: esnext, moduleResolution: bundler
- **strict mode**: enabled

### Key External Dependencies (requiring mocks)

| Package | Version | Used By | Mock Strategy |
|---------|---------|---------|---------------|
| `playwright` | ^1.58.2 | scanner/engine, site-crawler | Mock `chromium.launch()`, `Page` |
| `@axe-core/playwright` | ^4.11.1 | scanner/engine | Mock axe injection/run |
| `crawlee` | ^3.16.0 | site-crawler | Mock `PlaywrightCrawler`, `Configuration` |
| `puppeteer` | ^24.38.0 | pdf-generator | Mock `puppeteer.launch()` |
| `robots-parser` | ^3.0.1 | robots.ts | Mock the default export function |
| `sitemapper` | ^4.1.4 | sitemap.ts | Mock `Sitemapper` class |
| `uuid` | ^13.0.0 | site-crawler, crawl command | Mock `v4()` |
| `commander` | ^14.0.3 | CLI commands, entry point | Test via `.parseAsync()` or mock |
| `fs` (Node) | built-in | engine, config/loader, CLI commands | Mock `fs.readFileSync`, `fs.existsSync`, `fs.writeFileSync` |
| `axe-core` | transitive | engine (reads axe.min.js from disk) | Mock fs.readFileSync for axe source |

---

## Module-by-Module Analysis

---

### 1. `src/lib/scanner/engine.ts` (72 lines)

**Exports:**

- `scanPage(page: Page): Promise<AxeResults>` — scans an already-navigated Playwright Page
- `scanUrl(url: string, onProgress?: callback): Promise<AxeResults>` — full lifecycle: launch browser, navigate, scan, close

**Imports:**

- External: `playwright` (`chromium`, `Page`), `fs`, `path`
- Internal: none (but reads `axe-core/axe.min.js` from disk at module load time)

**Key Logic/Edge Cases:**

- Module-level side effect: `fs.readFileSync` reads axe-core source at import time
- `scanPage`: injects axe-core via `page.evaluate()`, runs with WCAG 2.2 AA tags
- `scanUrl`: launches chromium, navigates with `load` waitUntil, falls back to `domcontentloaded` on timeout
- Timeout handling: catches Timeout errors in navigation, continues with partial load
- Browser cleanup in `finally` block
- Progress callback at 10%, 40%, 80%

**Complexity**: High — requires browser mocking (Playwright)

**Mocking Strategy:**

- Mock `fs.readFileSync` for axe source (or isolate module load)
- Mock `chromium.launch()` → returns mock browser/context/page
- Mock `page.evaluate()` → return fake AxeResults
- Mock `page.goto()` for navigation scenarios (success, timeout, error)

**Test Approach:** Mock Playwright entirely. Test `scanPage` logic (axe injection, evaluate call). Test `scanUrl` lifecycle including timeout fallback paths.

---

### 2. `src/lib/scanner/result-parser.ts` (64 lines)

**Exports:**

- `parseAxeResults(url: string, raw: AxeResults): ScanResults`

**Imports:**

- External: `axe-core` (types only)
- Internal: `../types/scan` (types), `../scoring/wcag-mapper` (`mapTagToPrinciple`), `../scoring/calculator` (`calculateScore`)

**Key Logic/Edge Cases:**

- Maps raw axe violations → typed `AxeViolation[]` with principle mapping
- Maps raw passes → typed `AxePass[]`
- Maps incomplete → typed `AxeIncomplete[]`
- Maps inapplicable → typed `AxeInapplicable[]`
- Calls `calculateScore()` on parsed results
- Default impact fallback to `'minor'` if missing
- Handles missing `failureSummary` (undefined pass-through)
- Uses `new Date().toISOString()` for timestamp
- Handles missing `testEngine.version` with `'unknown'` fallback

**Complexity**: Low-Medium — pure data transformation, but calls two internal functions

**Mocking Strategy:**

- Mock `mapTagToPrinciple` and `calculateScore` to isolate transformation logic
- OR test integration-style with real scoring functions
- Mock `Date` constructor to get deterministic timestamps

**Test Approach:** Provide mock AxeResults objects with various shapes (zero violations, many violations, missing fields). Verify output structure.

---

### 3. `src/lib/scanner/store.ts` (95 lines)

**Exports:**

- `createScan(id, url): ScanRecord`
- `getScan(id): ScanRecord | undefined`
- `updateScan(id, updates): void`
- `createCrawl(id, seedUrl, config): CrawlRecord`
- `getCrawl(id): CrawlRecord | undefined`
- `updateCrawl(id, updates): void`
- `deleteCrawl(id): void`
- `getAllCrawls(): CrawlRecord[]`

**Imports:**

- Internal: `../types/scan` (types), `../types/crawl` (types)
- External: none

**Key Logic/Edge Cases:**

- Module-level state: two `Map` instances (`scans`, `crawls`)
- `setInterval` side effect for TTL cleanup (runs every 30 minutes)
- `cleanupExpired()`: deletes scans older than 1 hour, crawls older than 4 hours
- Cleanup also deletes associated scan records for expired crawls
- `updateScan`/`updateCrawl` silently no-ops if record not found
- Only cleanup records in terminal states (`complete`, `error`, `cancelled`)

**Complexity**: Low — simple in-memory CRUD with module-level state

**Mocking Strategy:**

- No mocks needed — test directly against module state
- Need to handle `setInterval` side effect (may need `jest.useFakeTimers()`)
- Tests should clean up state between runs (import fresh module or clear maps)

**Test Approach:** Direct testing. Create/get/update/delete operations. Test TTL cleanup with fake timers. Test that update on missing record is a no-op.

---

### 4. `src/lib/crawler/url-utils.ts` (152 lines)

**Exports:**

- `normalizeUrl(urlString: string): string`
- `isWithinDomainBoundary(candidateUrl, seedUrl, strategy): boolean`
- `isScannable(url: string): boolean`
- `matchesPatterns(url, includePatterns, excludePatterns): boolean`

**Imports:**

- External: none
- Internal: none

**Private helpers:** `getRegistrableDomain(hostname)`, `globMatch(input, pattern)`

**Key Logic/Edge Cases:**

- `normalizeUrl`: lowercases hostname, removes fragment, removes trailing slash (except root), removes tracking params (utm_*, fbclid, gclid, etc.), removes default ports, sorts query params, gracefully returns original string on invalid URL
- `isWithinDomainBoundary`: `same-hostname` exact match, `same-domain` extracts registrable domain (simple: last 2 segments). Returns false on invalid URLs
- `isScannable`: only http/https, excludes 30+ file extensions (.pdf, .jpg, .css, .js, .zip, .mp3, etc.)
- `matchesPatterns`: exclude patterns checked first, then include patterns. Empty include = allow all
- `globMatch`: converts glob to regex, supports `*`, `**`, `?`

**Complexity**: Low — pure functions, no dependencies, no state

**Mocking Strategy:** No mocks needed. All pure functions with URL/string inputs.

**Test Approach:** Extensive parameterized tests for each function. Edge cases: invalid URLs, edge-case TLDs, empty patterns, special regex characters in globs, trailing slashes, fragments.

---

### 5. `src/lib/crawler/robots.ts` (80 lines)

**Exports:**

- `getRobotsParser(originUrl: string): Promise<ReturnType<typeof robotsParser>>`
- `isAllowedByRobots(url: string): Promise<boolean>`
- `getCrawlDelay(originUrl: string): Promise<number | null>`
- `getSitemapUrls(originUrl: string): Promise<string[]>`
- `clearRobotsCache(): void`

**Imports:**

- External: `robots-parser` (default import)
- Internal: none

**Key Logic/Edge Cases:**

- Module-level cache: `robotsCache` Map keyed by hostname
- `getRobotsParser`: fetches robots.txt via `fetch()`, caches parsed result per hostname
- Uses `AbortSignal.timeout(10000)` for fetch timeout
- Invalid URL → returns permissive parser
- Network error or non-200 → allows all (empty robots.txt)
- Custom user agent: `AccessibilityScanBot/1.0`
- `isAllowedByRobots`: treats `undefined` result from parser as allowed
- `getCrawlDelay`: converts seconds to milliseconds
- `clearRobotsCache`: clears the module-level Map

**Complexity**: Medium — async, uses `fetch()`, has module-level cache

**Mocking Strategy:**

- Mock global `fetch` to return various robots.txt content
- Mock `robots-parser` default export to control parser behavior
- Test cache behavior by calling multiple times

**Test Approach:** Mock fetch to return different robots.txt content. Test cache hits/misses. Test error handling (network failure, invalid URL, timeout). Test crawl delay conversion.

---

### 6. `src/lib/crawler/sitemap.ts` (50 lines)

**Exports:**

- `discoverSitemapUrls(originUrl: string, sitemapUrlsFromRobots: string[]): Promise<string[]>`

**Imports:**

- External: `sitemapper` (default import `Sitemapper`)
- Internal: none

**Key Logic/Edge Cases:**

- Creates `Sitemapper` instance with 15s timeout and custom User-Agent
- Builds candidate list: robots.txt URLs + `/sitemap.xml` + `/sitemap_index.xml`
- Deduplicates candidates with `Set`
- For each candidate: calls `sitemapper.fetch()`, collects `result.sites`
- Returns deduplicated URL array
- Gracefully handles invalid URLs (returns empty array)
- Catches fetch errors per candidate (continues to next)

**Complexity**: Medium — async, uses external library

**Mocking Strategy:**

- Mock `Sitemapper` class and its `fetch()` method
- Return various shapes: empty, valid sites, error-throwing

**Test Approach:** Mock Sitemapper. Test deduplication, error handling per candidate, invalid origin URL.

---

### 7. `src/lib/crawler/site-crawler.ts` (256 lines)

**Exports:**

- `startCrawl(crawlId, seedUrl, config, onProgress?): Promise<void>`
- `cancelCrawl(crawlId: string): boolean`
- Type: `ProgressCallback = (event: CrawlProgressEvent) => void`

**Imports:**

- External: `crawlee` (`PlaywrightCrawler`, `Configuration`, `PlaywrightCrawlingContext`), `uuid` (`v4`)
- Internal: `../scanner/engine` (`scanPage`), `../scanner/result-parser` (`parseAxeResults`), `../scanner/store` (CRUD functions), `./url-utils` (4 functions), `./robots` (4 functions), `./sitemap` (`discoverSitemapUrls`), `../types/crawl` (types)

**Key Logic/Edge Cases:**

- Module-level state: `activeAbortControllers` Map
- Complex orchestration: robots.txt → sitemap discovery → URL seeding → PlaywrightCrawler BFS
- Effective delay: max of config delay and robots.txt crawl delay
- Request handler: domain boundary check, pattern check, scannable check, robots check, depth tracking
- Creates ScanRecord per page, updates CrawlRecord progress incrementally
- Failed request handler: logs failures without halting
- Abort/cancel support via AbortController
- `Configuration.getGlobalConfig().set('persistStorage', false)` — prevents disk writes
- Post-crawl: aggregation phase, then marks complete
- Error handling: catches crawl-level errors, updates record unless already cancelled
- `finally`: cleans up abort controller and clears robots cache

**Complexity**: Very High — most complex module. Full crawler orchestration with many dependencies.

**Mocking Strategy:**

- Mock ALL internal modules: `scanPage`, `parseAxeResults`, store functions, url-utils, robots, sitemap
- Mock `PlaywrightCrawler` class and its `run()` method
- Mock `Configuration.getGlobalConfig()`
- Mock `uuidv4()`
- Alternatively: heavy integration test approach

**Test Approach:** This is the hardest module to unit test. Recommend:

1. Unit test `cancelCrawl` separately (simpler)
2. Integration-style tests for `startCrawl` with all internal dependencies mocked
3. Test key scenarios: successful crawl, partial failure, cancellation, empty sitemap, robots.txt blocking

---

### 8. `src/lib/scoring/calculator.ts` (95 lines)

**Exports:**

- `calculateScore(violations: AxeViolation[], passes: AxePass[], incompleteCount: number): ScoreResult`

**Imports:**

- Internal: `../types/score` (types), `../types/scan` (types), `./wcag-mapper` (`mapTagToPrinciple`)

**Private helpers:** `getGrade(score)`, `computePrincipleScore(data)`

**Key Logic/Edge Cases:**

- Impact weights: critical=10, serious=7, moderate=3, minor=1
- Grade thresholds: A>=90, B>=70, C>=50, D>=30, F<30
- Passes counted as minor weight for scoring
- Empty violations + passes → score 100
- Principle scores computed per POUR principle
- `aodaCompliant` = true only if zero violations
- Uses `mapTagToPrinciple` for both violations and passes

**Complexity**: Low — pure computation, single internal dependency

**Mocking Strategy:**

- Mock `mapTagToPrinciple` to control principle assignment
- OR test with real mapper (true unit test of scoring math)

**Test Approach:** Parameterized tests: zero violations, all impact levels, mixed, edge case with zero total. Verify grade boundaries, compliance flag, principle distribution.

---

### 9. `src/lib/scoring/site-calculator.ts` (213 lines)

**Exports:**

- `calculateSiteScore(pageRecords: ScanRecord[]): SiteScoreResult`
- `aggregateViolations(pageRecords: ScanRecord[]): AggregatedViolation[]`
- `generatePageSummaries(pageRecords: ScanRecord[]): PageSummary[]`

**Imports:**

- Internal: `../types/scan`, `../types/score`, `../types/crawl`, `./wcag-mapper` (`mapTagToPrinciple`)

**Private helpers:** `getGrade(score)`, `getCompletedPages(pageRecords)`, `computePrincipleScore(data)`, `emptyPrincipleScores()`, `emptyImpactBreakdown()`

**Key Logic/Edge Cases:**

- `calculateSiteScore`: averages page scores, computes median (handles even/odd array length), aggregates principle scores and impact breakdown across all pages
- Empty completed pages → returns default zero object with `aodaCompliant: true`
- `aggregateViolations`: deduplicates by rule ID, counts total instances and affected pages
- `generatePageSummaries`: maps completed scan records to summary objects
- Filters only `status === 'complete' && results != null`

**Complexity**: Low-Medium — pure computation over arrays of records

**Mocking Strategy:** No external mocks needed. Create mock `ScanRecord[]` with various results.

**Test Approach:** Build arrays of mock ScanRecord objects. Test: empty array, single page, multiple pages, median calculation, violation aggregation across pages.

---

### 10. `src/lib/scoring/wcag-mapper.ts` (26 lines)

**Exports:**

- `mapTagToPrinciple(tags: string[]): WcagPrinciple`
- `getPrincipleLabel(principle: WcagPrinciple): string`
- Type: `WcagPrinciple`

**Imports:**

- External: none
- Internal: none

**Key Logic/Edge Cases:**

- Finds first tag matching `/^wcag\d{3,}$/`
- Maps first digit after "wcag" to principle: 1→perceivable, 2→operable, 3→understandable, 4→robust
- No matching tag → `'best-practice'`
- Unknown first digit → `'best-practice'`

**Complexity**: Very Low — pure functions, no dependencies

**Mocking Strategy:** None needed.

**Test Approach:** Direct testing with various tag arrays. Edge cases: empty array, no wcag tags, multiple wcag tags (first match wins), tags like `wcag111`, `wcag412`.

---

### 11. `src/lib/report/generator.ts` (30 lines)

**Exports:**

- `assembleReportData(results: ScanResults): ReportData`

**Imports:**

- Internal: `../types/scan` (types), `../types/report` (types)

**Key Logic/Edge Cases:**

- Sorts violations by impact severity (critical → minor)
- Builds `ReportData` object with AODA compliance note and disclaimer strings
- Uses `new Date(results.timestamp).toLocaleString()` — locale-dependent output

**Complexity**: Very Low — pure data transformation

**Mocking Strategy:** None needed. May need to mock `Date` or locale for deterministic `toLocaleString()`.

**Test Approach:** Provide mock ScanResults, verify violation sort order and output structure.

---

### 12. `src/lib/report/pdf-generator.ts` (24 lines)

**Exports:**

- `generatePdf(reportHtml: string): Promise<Buffer>`

**Imports:**

- External: `puppeteer`
- Internal: none

**Key Logic/Edge Cases:**

- Launches headless Puppeteer browser
- Sets HTML content, generates A4 PDF with margins and header/footer
- Returns `Buffer.from(pdf)`
- Browser closed in `finally`

**Complexity**: Medium — Puppeteer dependency, async browser operations

**Mocking Strategy:**

- Mock `puppeteer.launch()` → mock browser → mock page → mock `page.pdf()` returning Buffer
- Verify that `setContent`, `pdf()` options are correct

**Test Approach:** Mock Puppeteer completely. Verify browser lifecycle (launch, close). Verify PDF options passed correctly.

---

### 13. `src/lib/report/sarif-generator.ts` (121 lines)

**Exports:**

- `generateSarif(url, violations, toolVersion): SarifLog`
- `generateSiteSarif(pages: {url, violations}[], toolVersion): SarifLog`

**Imports:**

- Internal: `../types/scan` (`AxeViolation` type)

**Private helpers:** `mapImpactToLevel(impact)`, `simpleHash(input)`, `buildRun(url, violations, toolVersion)`

**Key Logic/Edge Cases:**

- SARIF 2.1.0 schema compliance
- Maps impact to SARIF levels: critical/serious→error, moderate→warning, minor→note
- Deduplicates rules by violation ID
- `simpleHash`: basic string hash for partial fingerprints
- `generateSiteSarif`: one SARIF run per page
- Results include physical location with HTML snippet

**Complexity**: Low — pure data transformation, no external dependencies

**Mocking Strategy:** None needed.

**Test Approach:** Provide mock violations, verify SARIF schema structure. Test impact mapping, rule deduplication, multi-page output.

---

### 14. `src/lib/report/site-generator.ts` (47 lines)

**Exports:**

- `generateSiteReport(crawl: CrawlRecord): SiteReportData`

**Imports:**

- Internal: `../types/crawl`, `../types/scan`, `../scanner/store` (`getScan`), `../scoring/site-calculator` (`calculateSiteScore`, `aggregateViolations`, `generatePageSummaries`)

**Key Logic/Edge Cases:**

- Iterates `crawl.pageIds`, fetches each ScanRecord from store
- Filters completed pages for engine version
- Calls site scoring functions
- Falls back to `'unknown'` engine version if no completed pages
- Static AODA note and disclaimer

**Complexity**: Low-Medium — depends on store and scoring modules

**Mocking Strategy:**

- Mock `getScan` to return controlled ScanRecord objects
- Mock `calculateSiteScore`, `aggregateViolations`, `generatePageSummaries` OR let them run

**Test Approach:** Mock store to provide controlled data. Verify output structure and edge cases (empty pageIds, all failed pages).

---

### 15. `src/lib/report/templates/report-template.ts` (105 lines)

**Exports:**

- `generateReportHtml(data: ReportData): string`

**Imports:**

- Internal: `../../types/report` (types)

**Private helpers:** `escapeHtml(str)`, `gradeColor(grade)`, module-level `impactColors` map

**Key Logic/Edge Cases:**

- Generates full HTML document with inline CSS
- XSS-safe via `escapeHtml()` on all dynamic content
- Score circle visualization, principle bars, impact breakdown table
- Violation rows with impact badges
- Empty violations → "No violations found" message
- Handles all grade colors and impact colors

**Complexity**: Low — pure string template function

**Mocking Strategy:** None needed.

**Test Approach:** Provide mock ReportData, verify HTML contains expected elements. Test escapeHtml with special characters. Test empty violations path.

---

### 16. `src/lib/report/templates/site-report-template.ts` (~175 lines)

**Exports:**

- `generateSiteReportHtml(data: SiteReportData): string`

**Imports:**

- Internal: `../../types/crawl` (types)

**Private helpers:** `escapeHtml(str)`, `gradeColor(grade)`, module-level `impactColors` map

**Key Logic/Edge Cases:**

- Similar to report-template but for multi-page site reports
- Top 10 violations sorted by totalInstances descending
- Per-page scores table
- Site-wide stats (highest/lowest/median scores)
- XSS-safe escaping

**Complexity**: Low — pure string template function

**Mocking Strategy:** None needed.

**Test Approach:** Similar to report-template. Test with varying page counts and violation lists.

---

### 17. `src/lib/ci/threshold.ts` (75 lines)

**Exports:**

- `evaluateThreshold(score, violations, config): ThresholdEvaluation`
- `getDefaultThreshold(): ThresholdConfig`

**Imports:**

- Internal: `../types/crawl` (types), `../types/scan` (types)

**Key Logic/Edge Cases:**

- `ignoreRules` filter applied first (removes matching violations)
- Score check: score >= threshold
- Count check per impact level: `critical`, `serious`, `moderate`, `minor` — `null`/`undefined` means unlimited
- Rule check: `failOnRules` — any matching violation ID fails
- All three checks independent; each produces detail messages
- Default threshold: score 70, critical max 0, serious max 5, moderate/minor unlimited

**Complexity**: Low — pure logic, no dependencies

**Mocking Strategy:** None needed.

**Test Approach:** Parameterized tests covering: score pass/fail, each impact level count, rule-based failures, ignoreRules filtering, default threshold values.

---

### 18. `src/lib/ci/formatters/json.ts` (5 lines)

**Exports:**

- `formatJson(result: CiResult): string`

**Imports:**

- Internal: `../../types/crawl` (types)

**Complexity**: Trivial — `JSON.stringify` wrapper

**Test Approach:** Verify JSON output is valid and indented. One or two simple tests.

---

### 19. `src/lib/ci/formatters/sarif.ts` (7 lines)

**Exports:**

- `formatSarif(url, violations, toolVersion): string`

**Imports:**

- Internal: `../../types/scan` (types), `../../report/sarif-generator` (`generateSarif`)

**Complexity**: Very Low — thin wrapper around `generateSarif`

**Mocking Strategy:** Mock `generateSarif` to isolate the formatter.

**Test Approach:** Verify it delegates to `generateSarif` and returns stringified output.

---

### 20. `src/lib/ci/formatters/junit.ts` (35 lines)

**Exports:**

- `formatJunit(result: CiResult): string`

**Imports:**

- Internal: `../../types/crawl` (types)

**Private helpers:** `escapeXml(str)`

**Key Logic/Edge Cases:**

- Generates JUnit XML format
- XML-safe escaping of special chars
- Violation count as test count and failure count
- Timestamp from result.timestamp
- Handles plural "instances" vs "instance"

**Complexity**: Low — pure string generation

**Mocking Strategy:** None needed.

**Test Approach:** Provide mock CiResult, verify valid XML output. Test escaping, empty violations, single instance plural handling.

---

### 21. `src/cli/config/loader.ts` (85 lines)

**Exports:**

- `loadConfig(configPath?: string): A11yConfig`
- `mergeConfig(config: A11yConfig, cliOptions: Record<string, unknown>): A11yConfig`
- Interface: `A11yConfig`

**Imports:**

- External: `fs`, `path`
- Internal: `../../lib/types/crawl` (types)

**Key Logic/Edge Cases:**

- `loadConfig`: with explicit path — throws if file not found; without path — walks up directory tree looking for `.a11yrc.json`
- Returns empty `{}` if not found
- `mergeConfig`: CLI options override config file values
- Handles `threshold`, `format`, `maxPages`, `maxDepth`, `concurrency`

**Complexity**: Low-Medium — file system operations

**Mocking Strategy:**

- Mock `fs.existsSync` and `fs.readFileSync`
- Mock `process.cwd()` for directory walk testing
- Mock `path.resolve`, `path.join`, `path.dirname`, `path.parse`

**Test Approach:** Mock fs module. Test: explicit config path (found/not found), directory walk (found at various levels, not found), merge precedence logic.

---

### 22. `src/cli/commands/scan.ts` (96 lines)

**Exports:**

- `scanCommand: Command` (Commander.js command)

**Imports:**

- External: `commander`, `fs`
- Internal: `../../lib/scanner/engine` (`scanUrl`), `../../lib/scanner/result-parser` (`parseAxeResults`), `../../lib/ci/threshold`, `../../lib/ci/formatters/*`, `../config/loader`

**Key Logic/Edge Cases:**

- Full CLI flow: load config → merge → scan → parse → threshold evaluate → format → output
- Writes to file if `--output` specified, else stdout
- Exit code 0 (passed) or 1 (failed) or 2 (error)
- `process.exit()` calls — need to intercept
- Supports json, sarif, junit formats
- `process.stderr.write` for progress/status

**Complexity**: High — many dependencies, async, process.exit/stdin/stdout

**Mocking Strategy:**

- Mock all imported modules: scanUrl, parseAxeResults, threshold, formatters, config loader
- Mock `process.exit`, `process.stderr.write`, `process.stdout.write`
- Mock `fs.writeFileSync` for output file

**Test Approach:** Mock all dependencies. Test command parsing and orchestration logic. Test each output format path. Test error handling.

---

### 23. `src/cli/commands/crawl.ts` (133 lines)

**Exports:**

- `crawlCommand: Command` (Commander.js command)

**Imports:**

- External: `commander`, `uuid`, `fs`
- Internal: `../../lib/scanner/store`, `../../lib/crawler/site-crawler`, `../../lib/scoring/site-calculator`, `../../lib/ci/threshold`, `../../lib/ci/formatters/*`, `../config/loader`

**Key Logic/Edge Cases:**

- Similar to scan but for site-wide crawl
- Creates CrawlConfig, starts crawl, collects results, aggregates, evaluates
- Progress callback writes to stderr
- Same format/output/exit logic as scan command
- Flatten violations across all pages for threshold

**Complexity**: High — many dependencies, async, process control

**Mocking Strategy:** Same pattern as scan command — mock all imported modules and process.*

**Test Approach:** Same approach as scan command. Mock all deps. Test crawl-specific config merging.

---

### 24. `src/cli/bin/a11y-scan.ts` (14 lines)

**Exports:** None (entry point script)

**Imports:**

- External: `commander`
- Internal: `../commands/scan`, `../commands/crawl`

**Key Logic:** Wires up program with scan and crawl subcommands, calls `program.parse()`

**Complexity**: Very Low — wiring only

**Test Approach:** Integration test: import and verify commands are registered. Or skip (tested indirectly through command tests).

---

## Summary Classification

### Pure Functions (Easy to Test — No Mocking Required)

| Module | Lines | Functions |
|--------|-------|-----------|
| `scoring/wcag-mapper.ts` | 26 | `mapTagToPrinciple`, `getPrincipleLabel` |
| `scoring/calculator.ts` | 95 | `calculateScore` |
| `crawler/url-utils.ts` | 152 | `normalizeUrl`, `isWithinDomainBoundary`, `isScannable`, `matchesPatterns` |
| `ci/threshold.ts` | 75 | `evaluateThreshold`, `getDefaultThreshold` |
| `ci/formatters/json.ts` | 5 | `formatJson` |
| `ci/formatters/junit.ts` | 35 | `formatJunit` |
| `report/generator.ts` | 30 | `assembleReportData` |
| `report/sarif-generator.ts` | 121 | `generateSarif`, `generateSiteSarif` |
| `report/templates/report-template.ts` | ~105 | `generateReportHtml` |
| `report/templates/site-report-template.ts` | ~175 | `generateSiteReportHtml` |

**Total: ~819 lines, ~16 exported functions** — these can be tested with zero mocks.

### Light Mocking Required (Internal Dependencies Only)

| Module | Lines | What to Mock |
|--------|-------|--------------|
| `scanner/result-parser.ts` | 64 | `mapTagToPrinciple`, `calculateScore` (or use real) |
| `scoring/site-calculator.ts` | 213 | `mapTagToPrinciple` (or use real) |
| `report/site-generator.ts` | 47 | `getScan` from store, scoring functions |
| `ci/formatters/sarif.ts` | 7 | `generateSarif` (or use real) |
| `scanner/store.ts` | 95 | Timer mocking (`setInterval`) |

**Total: ~426 lines** — minimal mocking of internal modules.

### Heavy Mocking Required (External Dependencies)

| Module | Lines | What to Mock |
|--------|-------|--------------|
| `scanner/engine.ts` | 72 | `playwright`, `fs` (axe-core read) |
| `crawler/robots.ts` | 80 | `fetch`, `robots-parser` |
| `crawler/sitemap.ts` | 50 | `Sitemapper` class |
| `report/pdf-generator.ts` | 24 | `puppeteer` |
| `cli/config/loader.ts` | 85 | `fs`, `path`, `process.cwd()` |
| `cli/commands/scan.ts` | 96 | All internal modules + `process`, `fs` |
| `cli/commands/crawl.ts` | 133 | All internal modules + `process`, `fs` |
| `crawler/site-crawler.ts` | 256 | `crawlee`, `uuid`, all internal modules |

**Total: ~796 lines** — significant mocking infrastructure needed.

### Entry Points (Minimal Testing)

| Module | Lines | Notes |
|--------|-------|-------|
| `cli/bin/a11y-scan.ts` | 14 | Wiring only, test indirectly |

---

## Key Discoveries

1. **No test framework exists** — `package.json` has no test runner, no test scripts, no test dependencies. A test framework (Jest or Vitest) must be added from scratch.

2. **Path alias `@/*`** — The `tsconfig.json` defines `@/*` → `./src/*`. The test framework must be configured to resolve this alias.

3. **Module-level side effects** in several files:
   - `scanner/engine.ts`: reads axe-core source file at import time
   - `scanner/store.ts`: starts a `setInterval` timer at import time
   - `crawler/site-crawler.ts`: module-level `activeAbortControllers` Map
   - `crawler/robots.ts`: module-level `robotsCache` Map

4. **No dependency injection** — All modules import dependencies directly. Mocking requires module-level mocking (`jest.mock()` or `vi.mock()`).

5. **`process.exit()` in CLI commands** — Both scan and crawl commands call `process.exit()`. Tests need to intercept this (mock or `jest.spyOn`).

6. **Two browser engines** — Playwright (for scanning + crawling) and Puppeteer (for PDF generation). Both need separate mock strategies.

7. **Global `fetch`** used in `robots.ts` — relies on Node.js built-in fetch (Node 18+).

8. **Strict TypeScript** enabled — tests must be type-safe.

9. **The scoring module (`calculator.ts`) is tightly coupled with `wcag-mapper.ts`** — they are always used together and could be tested together.

10. **HTML templates output gigantic strings** — tests should check for specific content patterns rather than exact string matching.

---

## Recommended Test Priority (by impact and ease)

### Tier 1 — High Value, Easy (Pure Functions)

1. `scoring/wcag-mapper.ts` — foundation for all scoring
2. `scoring/calculator.ts` — core scoring algorithm
3. `crawler/url-utils.ts` — many edge cases, critical for crawl correctness
4. `ci/threshold.ts` — CI/CD pass/fail logic

### Tier 2 — High Value, Moderate Effort

5. `scanner/result-parser.ts` — bridges raw axe → typed results
6. `scoring/site-calculator.ts` — site-wide aggregation
7. `report/sarif-generator.ts` — CI pipeline output
8. `ci/formatters/junit.ts` — CI pipeline output

### Tier 3 — Important, Needs Mocking

9. `scanner/store.ts` — in-memory state management
10. `crawler/robots.ts` — robots.txt compliance
11. `crawler/sitemap.ts` — sitemap discovery
12. `cli/config/loader.ts` — configuration loading

### Tier 4 — Complex, Heavy Mocking

13. `scanner/engine.ts` — browser-dependent scanning
14. `report/pdf-generator.ts` — browser-dependent PDF
15. `report/site-generator.ts` — orchestrates store + scoring
16. `report/templates/report-template.ts` — HTML templates
17. `report/templates/site-report-template.ts` — HTML templates

### Tier 5 — Most Complex, Integration-Style

18. `cli/commands/scan.ts` — full CLI orchestration
19. `cli/commands/crawl.ts` — full CLI orchestration
20. `crawler/site-crawler.ts` — full crawl orchestration

---

## Next Research Topics

- [ ] Evaluate Jest vs Vitest for this project (Next.js compatibility, ESM support, speed)
- [ ] Research optimal mock patterns for Playwright and Puppeteer in chosen test framework
- [ ] Research `crawlee` mock patterns (no official test utilities found)
- [ ] Determine if `commander` commands should be tested via `.parseAsync()` or action extraction
- [ ] Research path alias resolution configuration for test runner (`@/*` → `./src/*`)
- [ ] Investigate whether module-level side effects in `engine.ts` and `store.ts` need special handling (e.g., `jest.isolateModules`)
- [ ] Research coverage thresholds and reporting integration

---

## Clarifying Questions

1. **Test framework preference**: Is there a preference for Jest vs Vitest? Vitest may be better suited given the ESM-heavy setup and Next.js context.
2. **Coverage targets**: What minimum code coverage percentage is expected?
3. **Integration tests scope**: Should the CLI commands get true end-to-end tests (spawning the actual process) or only unit tests with mocked dependencies?
4. **Browser test scope**: Should `scanner/engine.ts` and `pdf-generator.ts` get actual browser integration tests, or purely mocked unit tests?
