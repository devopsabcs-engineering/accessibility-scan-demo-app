<!-- markdownlint-disable-file -->
# Implementation Details: Comprehensive Test Coverage & CI Integration (AB#1973)

## Context Reference

Sources:
* `.copilot-tracking/research/2026-03-07/test-coverage-ci-integration-research.md` — Primary research
* `.copilot-tracking/research/subagents/2026-03-07/source-module-analysis-research.md` — Module analysis
* `.copilot-tracking/research/subagents/2026-03-07/vitest-configuration-research.md` — Vitest patterns
* `.copilot-tracking/research/subagents/2026-03-07/github-actions-ci-research.md` — CI workflow design

## Implementation Phase 1: Test Framework Setup (AB#1988)

<!-- parallelizable: true -->

### Step 1.1: Install Vitest and coverage dependencies

Install `vitest` and `@vitest/coverage-v8` as dev dependencies using npm.

```bash
npm install -D vitest @vitest/coverage-v8
```

Files:
* `package.json` - Updated with new devDependencies
* `package-lock.json` - Auto-updated by npm

Success criteria:
* `npx vitest --version` outputs a version ≥3.2
* `package.json` lists both packages under `devDependencies`

Context references:
* research (Lines 215-218) — dev dependencies to install

Dependencies:
* None — first step

### Step 1.2: Create `vitest.config.ts` with path aliases, reporters, and coverage config

Create a new `vitest.config.ts` at the project root. Must mirror the `@/*` path alias from `tsconfig.json`. Use `node` environment (all test targets are server-side). Configure conditional reporters for CI vs local. Set v8 coverage with thresholds.

Files:
* `vitest.config.ts` - NEW: Vitest configuration file

Use the exact configuration from the research Complete Examples section:

```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts'],
    exclude: ['node_modules', '.next', 'dist', 'out'],
    restoreMocks: true,
    clearMocks: true,
    testTimeout: 10000,
    reporters: process.env.GITHUB_ACTIONS
      ? ['default', 'github-actions', 'junit']
      : ['default'],
    outputFile: {
      junit: './test-results/junit.xml',
    },
    coverage: {
      provider: 'v8',
      include: ['src/lib/**/*.ts', 'src/cli/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/__tests__/**',
        'src/lib/types/**',
        'src/app/**',
        'src/components/**',
      ],
      reporter: ['text', 'json-summary', 'json', 'lcov'],
      reportOnFailure: true,
      reportsDirectory: './coverage',
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },
  },
});
```

Key decisions:
* `restoreMocks: true` and `clearMocks: true` for automatic cleanup between tests
* `testTimeout: 10000` to allow headroom for complex mock setups
* Coverage excludes `src/lib/types/**` (type-only files), `src/app/**`, `src/components/**`
* `reportOnFailure: true` ensures coverage output even when tests fail
* `github-actions` reporter auto-enables inline annotations in CI

Discrepancy references:
* Addresses DD-01: config supports both CI and local execution patterns

Success criteria:
* `npx vitest run` executes without config errors (reports "no test files found")
* Path alias `@/` resolves correctly when tests import from `@/lib/...`

Context references:
* research (Lines 151-192) — recommended vitest.config.ts
* research (Lines 300-318) — Scenario 1 requirements

Dependencies:
* Step 1.1 completion (vitest must be installed)

### Step 1.3: Add test scripts to `package.json`

Add four test scripts to the `scripts` section of `package.json`.

Files:
* `package.json` - Add scripts to existing `scripts` object

Scripts to add:

```json
{
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage",
  "test:ci": "vitest run --coverage"
}
```

* `test` — Single run for quick validation
* `test:watch` — Interactive watch mode for development
* `test:coverage` — Single run with coverage report
* `test:ci` — CI-specific (same as coverage; CI reporters activate via `GITHUB_ACTIONS` env var)

Success criteria:
* `npm test` runs without error (reports zero tests)
* `npm run test:coverage` runs without error and creates `./coverage/` directory
* `npm run test:ci` runs without error

Context references:
* research (Lines 210-215) — package.json script additions

Dependencies:
* Step 1.1 completion

### Step 1.4: Add `test-results/` and `coverage/` to `.gitignore`

Append two entries to `.gitignore` to prevent test artifacts from being committed.

Files:
* `.gitignore` - Append entries

Entries to add:

```text
# Test artifacts
test-results/
coverage/
```

Success criteria:
* `git status` does not show `test-results/` or `coverage/` directories after running tests

Context references:
* research (Lines 218-222) — .gitignore additions

Dependencies:
* None

### Step 1.5: Validate framework setup

Run validation commands to confirm the framework is correctly configured.

Validation commands:
* `npm test` — reports zero tests found, exits cleanly
* `npm run lint` — no new lint errors introduced
* `npm run build` — successful build, no regressions

## Implementation Phase 2: Pure Function Unit Tests (AB#1984, AB#1983 partial, AB#1986 partial)

<!-- parallelizable: true -->

### Step 2.1: Create `src/lib/scoring/__tests__/wcag-mapper.test.ts`

Test the WCAG tag-to-principle mapping functions. This module contains pure functions with no dependencies to mock.

Files:
* `src/lib/scoring/__tests__/wcag-mapper.test.ts` - NEW: unit tests

Test scenarios:
* Known WCAG tags (e.g., `wcag2a`, `wcag21aa`) map to correct principles
* Unknown tags return a default/fallback mapping
* `getPrincipleFromTags()` handles arrays with multiple tags, selecting the most specific
* Edge cases: empty array, undefined, null-like inputs
* All four POUR principles represented in output

Patterns:
* Use `it.each()` for parameterized tag → principle mappings
* Direct import, no mocking needed

Success criteria:
* All exports of `wcag-mapper.ts` have test coverage
* Tests cover happy path, edge cases, and boundary conditions

Context references:
* research (Lines 353-359) — Scenario 2 scoring test requirements
* research source-module-analysis — wcag-mapper module details

Dependencies:
* Phase 1 completion

### Step 2.2: Create `src/lib/scoring/__tests__/calculator.test.ts`

Test the weighted scoring algorithm, grade thresholds, and POUR principle breakdown.

Files:
* `src/lib/scoring/__tests__/calculator.test.ts` - NEW: unit tests

Test scenarios:
* Perfect score (no violations) returns 100 with grade "A"
* Various violation counts/severities produce expected weighted scores
* Grade boundaries: A (90-100), B (80-89), C (70-79), D (60-69), F (<60) — verify exact thresholds
* POUR principle scores calculated correctly from violation categorization
* Impact breakdown (critical, serious, moderate, minor) counted accurately
* Edge cases: empty violations array, all-critical violations, thousands of violations

Patterns:
* Build mock `AxeViolation[]` data with known impact levels
* Use `it.each()` for grade boundary testing
* No mocking needed — pure calculation functions

Success criteria:
* All exported functions of `calculator.ts` tested
* Grade thresholds verified at exact boundary values

Context references:
* research (Lines 353-359) — Scenario 2 scoring test requirements

Dependencies:
* Phase 1 completion

### Step 2.3: Create `src/lib/crawler/__tests__/url-utils.test.ts`

Test URL normalization, domain boundary checking, scannability, and pattern matching.

Files:
* `src/lib/crawler/__tests__/url-utils.test.ts` - NEW: unit tests

Test scenarios:
* `normalizeUrl()`: trailing slash removal, fragment stripping, query parameter sorting, protocol handling
* `isSameDomain()`: same hostname, same domain different subdomain, different domain, edge cases (IP addresses, ports)
* `isScannableUrl()`: http/https accepted, mailto/tel/javascript rejected, data URIs rejected
* `matchesPattern()`: glob patterns, regex patterns, include/exclude list behavior
* Edge cases: malformed URLs, empty strings, URLs with special characters

Patterns:
* Use `it.each()` for parameterized URL pairs
* Direct imports, no mocking

Success criteria:
* All 4 exported functions tested with positive and negative cases
* Malformed URL handling verified

Context references:
* research source-module-analysis — url-utils module details (4 functions, ~90 lines)

Dependencies:
* Phase 1 completion

### Step 2.4: Create `src/lib/ci/__tests__/threshold.test.ts`

Test threshold evaluation logic for score, violation count, and rule-based checks.

Files:
* `src/lib/ci/__tests__/threshold.test.ts` - NEW: unit tests

Test scenarios:
* Score above threshold → pass
* Score at exact threshold → pass (boundary)
* Score below threshold → fail
* Violation count within limit → pass
* Violation count exceeding limit → fail
* Rule-based threshold checks → pass/fail per specific rule
* Combined threshold evaluation (score + count + rules)
* Edge cases: zero thresholds, undefined thresholds, empty results

Patterns:
* Build mock `ThresholdConfig` and `ScanResults` objects
* Use `it.each()` for boundary testing

Success criteria:
* All threshold evaluation paths tested including exact boundaries
* Combined threshold logic verified

Context references:
* research (Lines 353-359) — Scenario 2 CI test requirements

Dependencies:
* Phase 1 completion

### Step 2.5: Create `src/lib/ci/__tests__/formatters/json.test.ts`

Test JSON output formatting for CI results.

Files:
* `src/lib/ci/__tests__/formatters/json.test.ts` - NEW: unit tests

Test scenarios:
* Standard scan results formatted to expected JSON structure
* Output is valid JSON (parseable)
* All required fields present in output
* Edge cases: empty violations, missing optional fields

Patterns:
* Build mock scan result data
* Verify output via `JSON.parse()` and structure checks

Success criteria:
* Output matches expected JSON schema
* Edge cases produce valid output

Context references:
* research source-module-analysis — json formatter (~20 lines)

Dependencies:
* Phase 1 completion

### Step 2.6: Create `src/lib/ci/__tests__/formatters/junit.test.ts`

Test JUnit XML output formatting.

Files:
* `src/lib/ci/__tests__/formatters/junit.test.ts` - NEW: unit tests

Test scenarios:
* Standard results produce valid JUnit XML structure
* Test suite name and test case names populated correctly
* Failure elements contain violation details
* Pass case (no violations) produces test cases with no failures
* Edge cases: special XML characters in violation messages escaped correctly

Patterns:
* Build mock data, verify output contains expected XML elements
* Check XML well-formedness

Success criteria:
* Valid JUnit XML output in all cases
* Special characters properly escaped

Context references:
* research source-module-analysis — junit formatter (~40 lines)

Dependencies:
* Phase 1 completion

### Step 2.7: Create `src/lib/report/__tests__/sarif-generator.test.ts`

Test SARIF v2.1.0 output structure generation.

Files:
* `src/lib/report/__tests__/sarif-generator.test.ts` - NEW: unit tests

Test scenarios:
* Output matches SARIF v2.1.0 schema: `$schema`, `version`, `runs` array
* Tool information populated (name, version)
* Results array contains one entry per violation
* Rule descriptors match violation rule IDs
* Location objects include URI and region when available
* Level mapping: critical → error, serious → warning, moderate → note, minor → note
* Edge cases: empty violations produces valid SARIF with no results

Patterns:
* Build mock violations with known impact levels
* Verify SARIF structure via property access

Success criteria:
* Output conforms to SARIF v2.1.0 required fields
* Level mapping verified for all impact levels

Context references:
* research source-module-analysis — sarif-generator (~90 lines)

Dependencies:
* Phase 1 completion

### Step 2.8: Create `src/lib/report/__tests__/generator.test.ts`

Test report data assembly logic.

Files:
* `src/lib/report/__tests__/generator.test.ts` - NEW: unit tests

Test scenarios:
* Report generated from scan results includes all required sections
* Score calculation invoked and result included
* Violation categorization groups by rule/impact
* HTML template rendering produces valid HTML string
* Edge cases: empty scan results, scan with only passes

Patterns:
* Build mock `ScanRecord` with known violations
* Verify report structure contains expected data

Success criteria:
* All exported functions of `generator.ts` tested
* Report structure contains score, violations, and metadata

Context references:
* research source-module-analysis — generator (~65 lines)

Dependencies:
* Phase 1 completion

### Step 2.9: Validate phase changes

Run tests and coverage to verify all pure function tests.

Validation commands:
* `npm test` — all pure function tests pass with zero failures
* `npm run test:coverage` — verify coverage output is generated, review coverage percentages

## Implementation Phase 3: Light Mocking Unit Tests (AB#1987 partial, AB#1984, AB#1986 partial)

<!-- parallelizable: true -->

### Step 3.1: Create `src/lib/scanner/__tests__/result-parser.test.ts`

Test axe result transformation. Requires light mocking of scoring/calculator functions for deterministic output.

Files:
* `src/lib/scanner/__tests__/result-parser.test.ts` - NEW: unit tests

Test scenarios:
* Axe results with violations transformed to `ScanResults` structure
* Violation details (id, impact, description, nodes, tags) mapped correctly
* Score calculated via `calculator` and included in results
* WCAG principle mapping via `wcag-mapper` integrated
* Edge cases: empty violations, empty passes, incomplete array, inapplicable results
* Nodes with multiple selectors handled

Patterns:
* Use `vi.mock()` with relative paths for `../scoring/calculator` and `../scoring/wcag-mapper` if needed for isolation
* Build mock axe `AxeResults` objects with known data

Discrepancy references:
* Addresses DR-01 indirectly — result-parser is one of the scoring-dependent modules

Success criteria:
* All fields of `ScanResults` output verified against mock input
* Scoring functions called with correct parameters

Context references:
* research (Lines 367-377) — Scenario 2 result-parser requirements

Dependencies:
* Phase 1 completion

### Step 3.2: Create `src/lib/scoring/__tests__/site-calculator.test.ts`

Test site-wide score aggregation. Uses mock data arrays directly — no module mocking needed.

Files:
* `src/lib/scoring/__tests__/site-calculator.test.ts` - NEW: unit tests

Test scenarios:
* Site score average calculated from multiple page scores
* Weighted average by page violation count (if implemented)
* Minimum/maximum page scores tracked
* Grade assigned to overall site score
* Aggregated violation counts across pages
* Edge cases: single page, all pages same score, one page with zero score

Patterns:
* Build arrays of mock page score data
* Direct import and invocation — no mocking

Success criteria:
* Site-wide aggregation math verified
* Grade boundaries consistent with calculator module

Context references:
* research source-module-analysis — site-calculator (~118 lines)

Dependencies:
* Phase 1 completion

### Step 3.3: Create `src/lib/scanner/__tests__/store.test.ts` with fake timers

Test in-memory store CRUD and TTL cleanup. Requires `vi.useFakeTimers()` for testing the `setInterval` cleanup.

Files:
* `src/lib/scanner/__tests__/store.test.ts` - NEW: unit tests

Test scenarios:
* `createScan()` / `createCrawl()` returns new record with correct initial state
* `getScan()` / `getCrawl()` returns existing record by ID
* `getScan()` / `getCrawl()` returns undefined for nonexistent ID
* `updateScan()` / `updateCrawl()` modifies record fields
* `deleteScan()` / `deleteCrawl()` removes record
* TTL cleanup: advance fake timers past TTL, verify expired records are removed
* TTL cleanup: records within TTL are preserved
* Concurrent operations: multiple records managed independently

Patterns:
* `vi.useFakeTimers()` in `beforeEach`, `vi.useRealTimers()` in `afterEach`
* `vi.advanceTimersByTime(ms)` to trigger cleanup interval
* Use `vi.hoisted()` pattern if `setInterval` executes at import time — must mock timer before importing store

Critical implementation note:
`store.ts` starts `setInterval` at module load. Use this pattern:

```typescript
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});
```

If the `setInterval` fires before fake timers are set, use `vi.hoisted()` with dynamic import:

```typescript
const mocks = vi.hoisted(() => {
  vi.useFakeTimers();
  return {};
});

const { createScan, getScan } = await import('../store');
```

Discrepancy references:
* Research Key Discoveries: `store.ts` starts `setInterval` at import time

Success criteria:
* All CRUD operations verified
* TTL cleanup tested with fake timer advancement
* No real `setInterval` timers leak between tests

Context references:
* research (Lines 193-200) — vi.hoisted pattern for side effects
* research source-module-analysis — store module details

Dependencies:
* Phase 1 completion

### Step 3.4: Create `src/lib/ci/__tests__/formatters/sarif.test.ts`

Test CI-specific SARIF formatter (distinct from report SARIF generator). Requires light mocking of upstream data sources.

Files:
* `src/lib/ci/__tests__/formatters/sarif.test.ts` - NEW: unit tests

Test scenarios:
* CI SARIF output formatted for GitHub code scanning integration
* Threshold results embedded in SARIF metadata
* Output structure matches expected CI SARIF format
* Edge cases: no violations, all passing thresholds

Patterns:
* Build mock CI result data
* Verify SARIF structure

Success criteria:
* CI SARIF output matches expected format
* All fields populated correctly

Context references:
* research source-module-analysis — ci/formatters/sarif (~28 lines)

Dependencies:
* Phase 1 completion

### Step 3.5: Create `src/lib/report/__tests__/site-generator.test.ts`

Test site-wide report assembly. Requires mocking of store and scoring modules.

Files:
* `src/lib/report/__tests__/site-generator.test.ts` - NEW: unit tests

Test scenarios:
* Site report generated from crawl record with multiple page results
* Aggregated violations collected across pages
* Site score included in report
* HTML template rendered with site-specific data
* Edge cases: crawl with single page, crawl with failed pages

Patterns:
* Use `vi.mock()` for store access functions (relative paths)
* Build mock `CrawlRecord` with `pageIds` pointing to mock `ScanRecord` entries

Success criteria:
* Site report contains all page summaries
* Aggregated data matches expected calculations

Context references:
* research source-module-analysis — site-generator (~80 lines)

Dependencies:
* Phase 1 completion

### Step 3.6: Validate phase changes

Validation commands:
* `npm test` — all tests pass (Phase 2 + Phase 3)
* `npm run test:coverage` — verify coverage increased over Phase 2

## Implementation Phase 4: Heavy Mocking Unit Tests — Scanner & Crawler (AB#1987, AB#1983)

<!-- parallelizable: false -->

### Step 4.1: Create `src/lib/scanner/__tests__/engine.test.ts` with Playwright + fs mocks

Test the scanner engine module. Requires `vi.hoisted()` because `engine.ts` reads `axe-core/axe.min.js` via `fs.readFileSync` at import time. Also requires full Playwright browser mock chain.

Files:
* `src/lib/scanner/__tests__/engine.test.ts` - NEW: unit tests

Test scenarios:
* `scanUrl()` launches browser, creates context, navigates, injects axe, evaluates, returns results
* `scanPage()` accepts existing Page, injects axe, evaluates, returns results (no browser launch)
* Browser cleanup on successful scan (context.close, browser.close)
* Browser cleanup on error (ensures finally block runs)
* Timeout handling — scan times out, returns partial/error result
* Network error during page navigation
* Axe evaluation returns violations — results correctly returned
* Axe evaluation returns empty results — clean report generated

Critical implementation pattern — `vi.hoisted()` required:

```typescript
import { vi, describe, it, expect, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  readFileSync: vi.fn().mockReturnValue('mock-axe-source'),
  resolve: vi.fn().mockReturnValue('/mock/path/axe.min.js'),
  mockPage: {
    goto: vi.fn().mockResolvedValue(undefined),
    evaluate: vi.fn().mockResolvedValue({
      violations: [], passes: [], incomplete: [], inapplicable: []
    }),
    close: vi.fn(),
  },
  mockContext: { newPage: vi.fn(), close: vi.fn() },
  mockBrowser: { newContext: vi.fn(), close: vi.fn() },
  chromium: { launch: vi.fn() },
}));

// Mock fs BEFORE engine.ts imports it at module level
vi.mock('fs', () => ({ readFileSync: mocks.readFileSync }));
vi.mock('path', () => ({ resolve: mocks.resolve }));
vi.mock('playwright', () => ({ chromium: mocks.chromium }));

// Setup mock chain
beforeEach(() => {
  mocks.mockContext.newPage.mockResolvedValue(mocks.mockPage);
  mocks.mockBrowser.newContext.mockResolvedValue(mocks.mockContext);
  mocks.chromium.launch.mockResolvedValue(mocks.mockBrowser);
});

import { scanUrl, scanPage } from '../engine';
```

Discrepancy references:
* Research Key Discoveries: `engine.ts` `fs.readFileSync` at import time requires `vi.hoisted()`

Success criteria:
* Both `scanUrl()` and `scanPage()` tested
* Browser lifecycle (launch → context → page → close) verified
* Error and timeout paths tested
* `fs.readFileSync` called with correct axe-core path

Context references:
* research (Lines 193-200) — vi.hoisted pattern
* research (Lines 201-216) — Playwright mock pattern
* research source-module-analysis — engine module analysis

Dependencies:
* Phase 1 completion

### Step 4.2: Create `src/lib/crawler/__tests__/robots.test.ts` with fetch mocking

Test robots.txt parsing and caching. Requires global `fetch` mock.

Files:
* `src/lib/crawler/__tests__/robots.test.ts` - NEW: unit tests

Test scenarios:
* `isAllowed(url)` returns true for URL allowed by robots.txt
* `isAllowed(url)` returns false for URL disallowed by robots.txt
* Cache behavior: second call for same domain uses cached result (fetch called once)
* Network error fetching robots.txt → defaults to allowed (graceful fallback)
* HTTP 404 for robots.txt → defaults to allowed
* Malformed robots.txt content → defaults to allowed
* `clearCache()` resets cached entries

Patterns:
* `vi.stubGlobal('fetch', vi.fn())` for fetch mocking
* Build mock Response objects with robots.txt content
* Test cache by verifying fetch call count

Success criteria:
* All exported functions tested
* Cache mechanism verified
* Error fallback behavior confirmed

Context references:
* research (Lines 379-407) — Scenario 3 robots.ts requirements

Dependencies:
* Phase 1 completion

### Step 4.3: Create `src/lib/crawler/__tests__/sitemap.test.ts` with Sitemapper mocking

Test sitemap URL extraction. Requires `Sitemapper` class mock.

Files:
* `src/lib/crawler/__tests__/sitemap.test.ts` - NEW: unit tests

Test scenarios:
* `getSitemapUrls(url)` returns array of URLs from sitemap.xml
* Multiple URLs parsed correctly
* Empty sitemap returns empty array
* Network error fetching sitemap → returns empty array (graceful)
* Invalid XML in sitemap → returns empty array

Patterns:
* `vi.mock('sitemapper', ...)` to mock Sitemapper constructor and `.fetch()` method
* Return mock sitemap data

Success criteria:
* URL extraction tested with multiple URLs
* Error handling verified — no thrown errors, empty array fallback

Context references:
* research source-module-analysis — sitemap module (~48 lines)

Dependencies:
* Phase 1 completion

### Step 4.4: Create `src/lib/crawler/__tests__/site-crawler.test.ts` with Crawlee + multi-dep mocking

Test the site crawler. This is the most complex test file (~256 lines of production code, ~10 dependencies). Requires mocking of crawlee, playwright, robots, sitemap, url-utils, engine, and store.

Files:
* `src/lib/crawler/__tests__/site-crawler.test.ts` - NEW: unit tests

Test scenarios:
* `crawlSite(config)` discovers pages and scans each
* Respects `maxPages` limit — stops after reaching limit
* Respects `maxDepth` — does not crawl beyond depth
* Respects `concurrency` — concurrent requests limited
* Robots.txt respected when `respectRobotsTxt: true`
* Sitemap URLs included when `followSitemaps: true`
* URL normalization applied to discovered URLs
* Domain boundary enforced (`same-hostname` vs `same-domain`)
* Include/exclude patterns filter URLs
* Cancellation via `AbortController` stops crawl
* Error in single page scan does not abort entire crawl
* Progress updates emitted during crawl
* Crawl status transitions: pending → discovering → scanning → aggregating → complete

Patterns:
* `vi.hoisted()` for crawlee mock (complex constructor patterns)
* Mock each dependency with `vi.mock()` using relative paths:
  * `crawlee` — mock `PlaywrightCrawler` class and `createPlaywrightRouter`
  * `./robots` — mock `isAllowed()`
  * `./sitemap` — mock `getSitemapUrls()`
  * `./url-utils` — mock normalization and domain check functions
  * `../scanner/engine` — mock `scanPage()`
  * `../scanner/store` — mock CRUD operations

Discrepancy references:
* Addresses DR-02: custom mock patterns for crawlee since no official test utilities exist

Success criteria:
* Core crawl lifecycle tested end-to-end with mocks
* All configuration options verified
* Cancellation and error recovery tested
* Progress callback invoked with expected data

Context references:
* research (Lines 379-407) — Scenario 3 site-crawler requirements
* research (Lines 126-140) — crawlee architecture

Dependencies:
* Phase 1 completion
* Phase 4 Steps 4.1-4.3 recommended first (to establish mock patterns reused here)

### Step 4.5: Validate phase changes

Validation commands:
* `npm test` — all tests pass (Phases 2-4)
* `npm run test:coverage` — verify scanner and crawler modules covered

## Implementation Phase 5: Heavy Mocking Unit Tests — Report & CLI (AB#1986, AB#1985)

<!-- parallelizable: true -->

### Step 5.1: Create `src/lib/report/__tests__/pdf-generator.test.ts` with Puppeteer mocking

Test PDF generation. Requires Puppeteer mock (different from Playwright).

Files:
* `src/lib/report/__tests__/pdf-generator.test.ts` - NEW: unit tests

Test scenarios:
* `generatePdf(htmlContent)` launches Puppeteer, sets content, generates PDF buffer
* PDF content type and buffer returned correctly
* Browser cleanup on success (page.close, browser.close)
* Browser cleanup on error
* Custom page options (format, margins) applied

Patterns:
* Puppeteer uses default export — mock pattern differs from Playwright:

```typescript
const mocks = vi.hoisted(() => {
  const mockPage = {
    setContent: vi.fn().mockResolvedValue(undefined),
    pdf: vi.fn().mockResolvedValue(Buffer.from('mock-pdf')),
    close: vi.fn(),
  };
  const mockBrowser = {
    newPage: vi.fn().mockResolvedValue(mockPage),
    close: vi.fn(),
  };
  return {
    mockPage,
    mockBrowser,
    launch: vi.fn().mockResolvedValue(mockBrowser),
  };
});

vi.mock('puppeteer', () => ({
  default: { launch: mocks.launch },
}));
```

Success criteria:
* PDF generation lifecycle tested
* Browser cleanup verified in success and error paths

Context references:
* research (Lines 217-221) — Puppeteer mock pattern (default export)

Dependencies:
* Phase 1 completion

### Step 5.2: Create `src/cli/__tests__/loader.test.ts` with fs + path mocking

Test config file loading with filesystem mocking.

Files:
* `src/cli/__tests__/loader.test.ts` - NEW: unit tests

Test scenarios:
* `loadConfig(path)` reads and parses JSON config file
* `loadConfig(path)` reads and parses YAML config file
* Config file not found → returns default config
* Config file with invalid JSON → throws descriptive error
* Config directory walk — finds `.a11y-scan.json` or `.a11y-scan.yml` in cwd or parent directories
* Config merging — file config merged with CLI argument overrides
* Environment variable overrides applied

Patterns:
* `vi.mock('fs', ...)` for `readFileSync`, `existsSync`
* `vi.mock('path', ...)` for `resolve`, `join`, `dirname`
* Test each file format separately

Success criteria:
* All config loading paths tested (JSON, YAML, not found, invalid)
* Directory walk logic verified
* Config merging precedence correct

Context references:
* research source-module-analysis — config/loader (~100 lines)

Dependencies:
* Phase 1 completion

### Step 5.3: Create `src/cli/__tests__/scan.test.ts` with full dep chain + process mocks

Test the CLI scan command. Requires mocking of all dependencies plus `process.exit()`.

Files:
* `src/cli/__tests__/scan.test.ts` - NEW: unit tests

Test scenarios:
* Scan command with `--url` flag invokes scanner and produces output
* `--format json` produces JSON output to stdout
* `--format sarif` produces SARIF output to stdout
* `--output` flag writes results to file
* `--threshold-score` flag triggers threshold evaluation
* Threshold failure → `process.exit(1)`
* Threshold pass → `process.exit(0)`
* Scanner error → error message to stderr, `process.exit(1)`
* Missing required `--url` flag → error message

Patterns:
* Mock all internal dependencies via `vi.mock()`:
  * `../config/loader` — mock `loadConfig()`
  * `@/lib/scanner/engine` (use relative path) — mock `scanUrl()`
  * `@/lib/scoring/calculator` (use relative path) — mock `calculateScore()`
  * `@/lib/ci/threshold` (use relative path) — mock `evaluateThresholds()`
  * `@/lib/ci/formatters/*` (use relative paths) — mock each formatter
* `vi.spyOn(process, 'exit').mockImplementation((() => {}) as never)` to capture exit calls
* `vi.spyOn(process.stdout, 'write')` to capture output
* `vi.spyOn(process.stderr, 'write')` to capture error output
* Commander command tested via `.parseAsync(['node', 'test', '--url', 'https://example.com'])`

Discrepancy references:
* Addresses DR-01: uses `.parseAsync()` pattern for Commander testing

Success criteria:
* All CLI flags tested
* Exit codes verified for pass/fail scenarios
* Output goes to correct streams (stdout vs stderr)

Context references:
* research (Lines 225-228) — process.exit mock pattern
* research (Lines 379-407) — Scenario 3 CLI test requirements

Dependencies:
* Phase 1 completion

### Step 5.4: Create `src/cli/__tests__/crawl.test.ts` with full dep chain + process mocks

Test the CLI crawl command. Same mocking strategy as scan command with crawl-specific dependencies.

Files:
* `src/cli/__tests__/crawl.test.ts` - NEW: unit tests

Test scenarios:
* Crawl command with `--url` flag invokes site crawler
* `--max-pages` flag limits crawl scope
* `--max-depth` flag limits crawl depth
* `--format json` produces JSON output
* `--format sarif` produces SARIF output
* `--output` flag writes results to file
* Threshold evaluation on site-wide score
* Threshold failure → `process.exit(1)`
* Crawler error → error message to stderr, `process.exit(1)`
* Missing required `--url` flag → error message

Patterns:
* Mirror scan.test.ts mocking approach
* Additional mocks for crawl-specific deps:
  * `@/lib/crawler/site-crawler` (use relative path) — mock `crawlSite()`
  * `@/lib/scoring/site-calculator` (use relative path) — mock site score functions
  * `@/lib/report/site-generator` (use relative path) — mock site report generation

Success criteria:
* All crawl-specific CLI flags tested
* Site-wide threshold evaluation verified
* Exit codes correct

Context references:
* research source-module-analysis — crawl command (~118 lines)

Dependencies:
* Phase 1 completion

### Step 5.5: Validate phase changes

Validation commands:
* `npm test` — all 21 test files pass with zero failures
* `npm run test:coverage` — verify all 6 domains have coverage

## Implementation Phase 6: GitHub Actions CI Workflow (AB#1990, AB#1989)

<!-- parallelizable: false -->

### Step 6.1: Create `.github/workflows/ci.yml` with lint, test, build pipeline

Create the CI workflow file. Single job running lint → test → build sequentially on every push and PR to `main`.

Files:
* `.github/workflows/ci.yml` - NEW: GitHub Actions workflow

Workflow configuration:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true

permissions:
  contents: read
  checks: write
  pull-requests: write

jobs:
  ci:
    name: Lint, Test & Build
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - name: Lint
        run: npm run lint

      - name: Test with coverage
        run: npm run test:ci

      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: ${{ !cancelled() }}
        with:
          name: test-results
          path: test-results/
          retention-days: 30

      - name: Upload coverage
        uses: actions/upload-artifact@v4
        if: ${{ !cancelled() }}
        with:
          name: coverage
          path: coverage/
          retention-days: 30

      - name: Test report
        uses: dorny/test-reporter@v2
        if: ${{ !cancelled() }}
        with:
          name: 'Unit Tests'
          path: test-results/junit.xml
          reporter: java-junit
          fail-on-error: true

      - name: Coverage report
        uses: davelosert/vitest-coverage-report-action@v2
        if: always()
        with:
          name: 'Coverage'
          file-coverage-mode: 'changes'

      - name: Cache Next.js build
        uses: actions/cache@v4
        with:
          path: .next/cache
          key: nextjs-${{ runner.os }}-${{ hashFiles('**/package-lock.json') }}-${{ hashFiles('src/**') }}
          restore-keys: |
            nextjs-${{ runner.os }}-${{ hashFiles('**/package-lock.json') }}-
            nextjs-${{ runner.os }}-

      - name: Build
        run: npm run build
```

Key design decisions:
* `concurrency` group cancels redundant runs on same PR
* `permissions` limited to minimum needed: `contents: read`, `checks: write` (for test-reporter), `pull-requests: write` (for coverage comments)
* `if: ${{ !cancelled() }}` ensures artifact upload and reporting run even if tests fail
* `actions/setup-node@v4` with `cache: 'npm'` for dependency caching
* Node 20 matches project convention (Dockerfile, action.yml, azure-pipelines)
* `timeout-minutes: 15` prevents runaway jobs
* Next.js build cache accelerates repeated builds

Success criteria:
* Workflow YAML is syntactically valid
* All action versions match project conventions (v4 for checkout and setup-node)
* Permissions are minimal (no `write-all`)
* Build step runs after test step (sequential)

Context references:
* research (Lines 409-470) — Scenario 4 CI workflow design
* research (Lines 471-510) — Scenario 4 YAML example

Dependencies:
* Phase 1 completion (test scripts must exist)
* Phases 2-5 recommended (tests should exist before CI runs them)

### Step 6.2: Configure coverage reporting and test result display in PRs

Verify the coverage reporting configuration in `vitest.config.ts` produces the output format required by the CI actions.

Files:
* No new files — verification of existing configuration alignment

Verification checklist:
* `vitest.config.ts` coverage reporters include `json-summary` and `json` (required by `davelosert/vitest-coverage-report-action`)
* `vitest.config.ts` JUnit reporter outputs to `./test-results/junit.xml` (required by `dorny/test-reporter`)
* Coverage `reportsDirectory` is `./coverage` (matches artifact upload path)
* `reportOnFailure: true` ensures coverage output even on test failures

Success criteria:
* `npm run test:ci` produces both `test-results/junit.xml` and `coverage/coverage-summary.json`
* Coverage action can read `json-summary` format from `./coverage/`

Context references:
* research (Lines 515-535) — Scenario 5 coverage configuration

Dependencies:
* Step 6.1 completion

### Step 6.3: Validate workflow syntax

Validation commands:
* Review YAML structure manually for syntax correctness
* Verify all action versions: `checkout@v4`, `setup-node@v4`, `upload-artifact@v4`, `cache@v4`, `test-reporter@v2`, `vitest-coverage-report-action@v2`
* Verify trigger configuration: push to main, PR to main

## Implementation Phase 7: Final Validation

<!-- parallelizable: false -->

### Step 7.1: Run full project validation

Execute all validation commands for the project:
* `npm run lint` — no lint errors across entire project
* `npm run build` — successful Next.js build with no errors
* `npm test` — all 21 test files pass with zero failures
* `npm run test:coverage` — coverage meets 80/75/80/80 thresholds (statements/branches/functions/lines)

### Step 7.2: Fix minor validation issues

Iterate on lint errors, build warnings, and test failures. Apply fixes directly when corrections are straightforward and isolated:
* Fix lint errors in test files (unused imports, formatting)
* Fix type errors from incorrect mock types
* Adjust test assertions if module behavior doesn't match expectations from research
* Adjust coverage thresholds if initial implementation falls slightly short

### Step 7.3: Report blocking issues

When validation failures require changes beyond minor fixes:
* Document the issues and affected files
* Provide the user with next steps
* Recommend additional research and planning rather than inline fixes
* Avoid large-scale refactoring within this phase

## Coverage Notes

### Indirectly Tested Modules

* `src/lib/report/templates/report-template.ts` — Tested indirectly via `generator.test.ts` (Step 2.8: "HTML template rendering produces valid HTML string"). No separate test file needed.
* `src/lib/report/templates/site-report-template.ts` — Tested indirectly via `site-generator.test.ts` (Step 3.5: "HTML template rendered with site-specific data"). No separate test file needed.
* `src/cli/bin/a11y-scan.ts` — CLI entry point is a thin Commander shim. Tested indirectly via `scan.test.ts` (Step 5.3) and `crawl.test.ts` (Step 5.4) which invoke commands via `.parseAsync()`. If this file contains non-trivial logic beyond Commander setup, a dedicated test file should be added.

## User Story → Phase Mapping

| User Story | Phase(s) | Test Files |
|-----------|----------|------------|
| AB#1988 (Vitest setup) | Phase 1 | `vitest.config.ts`, `package.json` scripts, `.gitignore` |
| AB#1987 (Scanner tests) | Phase 3, Phase 4 | `engine.test.ts`, `result-parser.test.ts`, `store.test.ts` |
| AB#1983 (Crawler tests) | Phase 2, Phase 4 | `url-utils.test.ts`, `robots.test.ts`, `sitemap.test.ts`, `site-crawler.test.ts` |
| AB#1984 (Scoring tests) | Phase 2, Phase 3 | `calculator.test.ts`, `site-calculator.test.ts`, `wcag-mapper.test.ts` |
| AB#1986 (Report/CI tests) | Phase 2, Phase 3, Phase 5 | `generator.test.ts`, `pdf-generator.test.ts`, `sarif-generator.test.ts`, `site-generator.test.ts`, `json.test.ts`, `sarif.test.ts`, `junit.test.ts` |
| AB#1985 (CLI tests) | Phase 5 | `loader.test.ts`, `scan.test.ts`, `crawl.test.ts` |
| AB#1990 (CI workflow) | Phase 6 | `.github/workflows/ci.yml` |
| AB#1989 (Coverage) | Phase 1, Phase 6 | Coverage config in `vitest.config.ts`, coverage steps in `ci.yml` |

## Dependencies

* `vitest` (v3.2+) — test runner
* `@vitest/coverage-v8` — coverage provider

## Success Criteria

* 21 test files covering all 24 source modules across 6 domains
* `npm test` passes with zero failures
* `npm run test:coverage` meets 80/75/80/80 thresholds
* `.github/workflows/ci.yml` executes lint → test → build on push/PR to main
* No regressions in `npm run lint` or `npm run build`
