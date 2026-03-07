# Scanner Engine & CI System — Comprehensive Research

## Research Topics

1. Scanner Engine architecture (axe-core invocation, Playwright browser automation, result parsing)
2. CI Threshold System (pass/fail logic, formatters, default configs)
3. CLI Commands (scan, crawl, config loading, self-scan capability)
4. CI Workflow (GitHub Actions steps, test infrastructure)
5. Package.json (dependencies, scripts, test setup)
6. Vitest Config (test patterns, coverage thresholds)
7. Existing test patterns and coverage

---

## 1. Scanner Engine

### 1.1 engine.ts — [src/lib/scanner/engine.ts](src/lib/scanner/engine.ts)

**Architecture**: Two exported functions — `scanPage()` (low-level) and `scanUrl()` (high-level wrapper).

**axe-core injection** (L5–L9):

- Reads `axe-core/axe.min.js` from `node_modules` at **module load time** via `fs.readFileSync`.
- The `axeSource` is a module-level constant — loaded once, reused for all scans.

**`scanPage(page: Page)` (L16–L28)**:

- Takes an already-navigated Playwright `Page` object.
- Injects axe-core with a `module` shim to avoid "module is not defined" errors: `var module = { exports: {} }; ${axeSource}`.
- Runs `axe.run()` with **WCAG 2.2 AA** tag filters: `['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']`.
- Returns raw `AxeResults`.
- **Used by**: The site crawler (`site-crawler.ts`) where the crawler manages browser lifecycle.

**`scanUrl(url: string, onProgress?)` (L34–L72)**:

- Launches Playwright Chromium in headless mode with `--no-sandbox`, `--disable-setuid-sandbox`.
- Creates a context with viewport `1280x1024`.
- Navigates with `waitUntil: 'load'` (30s timeout), falls back to `domcontentloaded` on timeout.
- Calls `scanPage()` on the page.
- Reports progress via callback: `navigating(10)` → `scanning(40)` → `scoring(80)`.
- **Always closes the browser** in a `finally` block.
- **Used by**: Phase 1 single-page scan API and CLI `scan` command.

**Key Observations**:

- The codebase relies on `playwright` (not `@axe-core/playwright`) for browser automation. axe-core is injected manually as a script.
- `@axe-core/playwright` is listed in `package.json` dependencies but is **not used** in the engine. The manual injection pattern is used instead.
- The scanner runs WCAG 2.2 AA rules specifically.

### 1.2 result-parser.ts — [src/lib/scanner/result-parser.ts](src/lib/scanner/result-parser.ts)

**`parseAxeResults(url, raw)` (L6–L65)**:

- Maps raw `AxeResults` into the app's internal `ScanResults` type.
- **Violations** (L7–L22): Maps each violation to `AxeViolation` with `id`, `impact`, `tags`, `description`, `help`, `helpUrl`, `nodes[]`, and adds `principle` via `mapTagToPrinciple()`.
- **Passes** (L24–L32): Maps to `AxePass` with `id`, `tags`, `description`, `nodes[]`.
- **Incomplete** (L34–L48): Maps to `AxeIncomplete` with optional impact.
- **Inapplicable** (L50–L54): Maps to `AxeInapplicable` (id, tags, description only).
- **Score** (L56): Calls `calculateScore(violations, passes, incomplete.length)` from the scoring module.
- **Returns** `ScanResults` with `url`, `timestamp` (ISO string), `engineVersion` (e.g., "axe-core 4.10.0"), all result arrays, and score.

### 1.3 store.ts — [src/lib/scanner/store.ts](src/lib/scanner/store.ts)

**In-memory store** using two `Map` instances — `scans` and `crawls`.

- **Scan CRUD** (L8–L31): `createScan(id, url)`, `getScan(id)`, `updateScan(id, updates)`.
- **Crawl CRUD** (L35–L73): `createCrawl(id, seedUrl, config)`, `getCrawl(id)`, `updateCrawl(id, updates)`, `deleteCrawl(id)`, `getAllCrawls()`.
- **TTL Cleanup** (L77–L98): Automatic garbage collection via `setInterval` every 30 minutes.
  - Scans: removed after 1 hour if status is `complete` or `error`.
  - Crawls: removed after 4 hours; associated page scan records also cleaned up.
  - Pending scans/crawls are **never auto-deleted**.

### 1.4 Scoring System

**calculator.ts** — [src/lib/scoring/calculator.ts](src/lib/scoring/calculator.ts):

- Impact weights: `critical: 10`, `serious: 7`, `moderate: 3`, `minor: 1`.
- Grade scale: A (≥90), B (≥70), C (≥50), D (≥30), F (<30).
- Weighted score formula: `(weightedPassed / weightedTotal) * 100`.
- Empty scans (no violations, no passes) score 100.
- `aodaCompliant` is `true` only when `violations.length === 0`.

**wcag-mapper.ts** — [src/lib/scoring/wcag-mapper.ts](src/lib/scoring/wcag-mapper.ts):

- Maps WCAG tags (e.g., `wcag143`) to POUR principles based on the first digit after "wcag": 1=perceivable, 2=operable, 3=understandable, 4=robust.

**site-calculator.ts** — [src/lib/scoring/site-calculator.ts](src/lib/scoring/site-calculator.ts):

- `calculateSiteScore(pageRecords)`: Averages page scores, computes median/min/max, aggregates principle scores and impact breakdowns.
- `aggregateViolations(pageRecords)`: Deduplicates violations by rule ID across pages, tracking affected pages and total instances.

---

## 2. CI Threshold System

### 2.1 threshold.ts — [src/lib/ci/threshold.ts](src/lib/ci/threshold.ts)

**`evaluateThreshold(score, violations, config)` (L4–L64)**:

Three independent pass/fail checks:

1. **Score check** (L15–L22): Passes if `score >= config.score`. No-op if `config.score` is null/undefined.
2. **Count check** (L25–L37): For each impact level (`critical`, `serious`, `moderate`, `minor`), checks if violation count ≤ `config.maxViolations[impact]`. Skips null/undefined limits.
3. **Rule check** (L40–L51): If `config.failOnRules` contains rule IDs, fails if any of those rules have violations.

**Filtering** (L9–L11): If `config.ignoreRules` is set, violations matching those IDs are filtered out before count and rule checks.

**Returns `ThresholdEvaluation`**: `{ scorePassed, countPassed, rulePassed, details[] }`.

**`getDefaultThreshold()` (L66–L76)**:

```json
{
  "score": 70,
  "maxViolations": { "critical": 0, "serious": 5, "moderate": null, "minor": null },
  "failOnRules": [],
  "ignoreRules": []
}
```

### 2.2 CI Formatters

Three output formatters in [src/lib/ci/formatters/](src/lib/ci/formatters/):

1. **json.ts** (L1–L5): Simple `JSON.stringify(result, null, 2)` of `CiResult`.
2. **sarif.ts** (L1–L6): Delegates to `generateSarif()` from the report module, returns JSON string.
3. **junit.ts** (L1–L31): Generates JUnit XML with `<testsuites>` → `<testsuite>` → `<testcase>` per violation. Includes XML escaping. Violations map to `<failure>` elements.

### 2.3 CI Types — [src/lib/types/crawl.ts](src/lib/types/crawl.ts) (L117–L151)

```typescript
interface ThresholdConfig {
  score?: number;
  maxViolations?: { critical?: number | null; serious?: number | null; moderate?: number | null; minor?: number | null };
  failOnRules?: string[];
  ignoreRules?: string[];
}

interface ThresholdEvaluation {
  scorePassed: boolean;
  countPassed: boolean;
  rulePassed: boolean;
  details: string[];
}

interface CiResult {
  passed: boolean;
  score: number;
  grade: ScoreGrade;
  url: string;
  timestamp: string;
  violationCount: number;
  thresholdEvaluation: ThresholdEvaluation;
  violations: CiViolationSummary[];
}
```

### 2.4 CI REST APIs

- **POST `/api/ci/scan`** — [src/app/api/ci/scan/route.ts](src/app/api/ci/scan/route.ts): Synchronous single-page scan. Accepts `{ url, threshold?, format? }`. Returns CiResult (JSON), SARIF, or JUnit. Has SSRF protection.
- **POST `/api/ci/crawl`** — [src/app/api/ci/crawl/route.ts](src/app/api/ci/crawl/route.ts): Synchronous site-wide crawl (30min timeout). Accepts `{ url, maxPages?, maxDepth?, concurrency?, threshold?, format? }`. Returns aggregated CiResult.

**SSRF Protection**: Both CI APIs and the main scan API block localhost, private IPs (10.x, 192.168.x, 172.16-31.x), link-local, .local, .internal hostnames.

---

## 3. CLI Commands

### 3.1 Entry point — [src/cli/bin/a11y-scan.ts](src/cli/bin/a11y-scan.ts)

- Uses `commander` library.
- Registers two subcommands: `scan` and `crawl`.
- Binary name: `a11y-scan` (mapped in `package.json` `bin` field to `dist/cli/bin/a11y-scan.js`).

### 3.2 scan command — [src/cli/commands/scan.ts](src/cli/commands/scan.ts)

**Options**:

- `--url <url>` (required)
- `--threshold <score>` (default: 70)
- `--format <format>` (json | sarif | junit, default: json)
- `--output <path>` (file output)
- `--config <path>` (`.a11yrc.json` config)

**Flow** (L20–L102):

1. `loadConfig()` + `mergeConfig()` — loads `.a11yrc.json` and merges with CLI flags.
2. `scanUrl(url, onProgress)` — runs in-process Playwright scan.
3. `parseAxeResults(url, axeResults)` — parses results.
4. Builds `ThresholdConfig`, calls `evaluateThreshold()`.
5. Builds `CiResult` with violation summaries.
6. Formats output (JSON/SARIF/JUnit).
7. Writes to file or stdout.
8. **Exit codes**: `0` = passed, `1` = failed, `2` = error.

### 3.3 crawl command — [src/cli/commands/crawl.ts](src/cli/commands/crawl.ts)

**Additional Options**: `--max-pages`, `--max-depth`, `--concurrency`.

**Flow**: Similar to scan but uses `startCrawl()`, collects page records from store, aggregates with `calculateSiteScore()` and `aggregateViolations()`.

### 3.4 Config Loader — [src/cli/config/loader.ts](src/cli/config/loader.ts)

- `loadConfig(path?)`: Reads explicit path or walks up from CWD looking for `.a11yrc.json`.
- `mergeConfig(config, cliOptions)`: CLI flags override file config.
- Interface `A11yConfig`: `{ url?, standard?, threshold?, output?, crawl? }`.

### 3.5 Self-Scan Capability

**The CLI can scan any URL**, including localhost. Unlike the API routes, the CLI has **no SSRF protection** — it does not block localhost or private IPs. This means:

- `a11y-scan scan --url http://localhost:3000` would work.
- The CLI runs Playwright in-process, so it can scan the app's own dev server.
- For CI self-scanning, the app would need to be running (via `npm run dev` or `npm run start`) before the CLI scan executes.

---

## 4. CI Workflow

### 4.1 ci.yml — [.github/workflows/ci.yml](.github/workflows/ci.yml)

**Triggers**: push to `main`, PR to `main`, `workflow_dispatch`.

**Concurrency**: Groups by workflow + PR number, cancels in-progress runs.

**Permissions**: `contents: read`, `checks: write`, `pull-requests: write`.

**Steps** (single job: `ci`, `ubuntu-latest`, 15min timeout):

1. `actions/checkout@v4`
2. `actions/setup-node@v4` — Node 20 with npm cache
3. `npm ci`
4. `npm run lint` (eslint)
5. `npm run test:ci` (vitest with coverage)
6. Upload test results artifact (`test-results/`)
7. Upload coverage artifact (`coverage/`)
8. `dorny/test-reporter@v2` — JUnit test report
9. `davelosert/vitest-coverage-report-action@v2` — Coverage report on PR
10. Cache Next.js build (`.next/cache`)
11. `npm run build` (Next.js build)

**Key Observations**:

- No accessibility self-scan step exists yet.
- No Playwright install step (would be needed for self-scanning).
- No step to start the Next.js dev/preview server.
- The workflow uses `npm run test:ci` which maps to `vitest run --coverage`.

### 4.2 deploy.yml — [.github/workflows/deploy.yml](.github/workflows/deploy.yml)

- Manual trigger only (`workflow_dispatch`), push to main is commented out.
- Azure deployment: Bicep infra → Docker build/push to ACR → Web App restart.
- Not relevant to CI testing.

---

## 5. Package Configuration

### 5.1 package.json — [package.json](package.json)

**Key Dependencies**:

| Package | Version | Purpose |
|---------|---------|---------|
| `playwright` | ^1.58.2 | Browser automation for scanning |
| `@axe-core/playwright` | ^4.11.1 | Listed but **not used** in engine.ts |
| `commander` | ^14.0.3 | CLI argument parsing |
| `crawlee` | ^3.16.0 | Site crawling framework |
| `next` | 15.5.12 | Web framework |
| `uuid` | ^13.0.0 | ID generation |
| `robots-parser` | ^3.0.1 | robots.txt parsing |
| `sitemapper` | ^4.1.4 | Sitemap parsing |

**Dev Dependencies**:

| Package | Version | Purpose |
|---------|---------|---------|
| `vitest` | ^4.0.18 | Test runner |
| `@vitest/coverage-v8` | ^4.0.18 | Coverage provider |
| `typescript` | ^5 | TypeScript compiler |
| `eslint` | ^9 | Linting |

**Scripts**:

| Script | Command |
|--------|---------|
| `test` | `vitest run` |
| `test:watch` | `vitest` |
| `test:coverage` | `vitest run --coverage` |
| `test:ci` | `vitest run --coverage` |
| `build` | `next build --turbopack` |
| `dev` | `next dev --turbopack` |

**Binary**: `"a11y-scan": "dist/cli/bin/a11y-scan.js"` — requires TypeScript compilation to `dist/`.

---

## 6. Vitest Configuration

### 6.1 vitest.config.ts — [vitest.config.ts](vitest.config.ts)

- **Environment**: `node`
- **Test pattern**: `src/**/__tests__/**/*.test.ts`
- **Path alias**: `@` → `./src`
- **Timeout**: 10,000ms per test
- **Mocking**: `restoreMocks: true`, `clearMocks: true`
- **Reporters**: Default + `github-actions` + `junit` (when `GITHUB_ACTIONS` env is set)
- **JUnit output**: `./test-results/junit.xml`

**Coverage**:

- Provider: `v8`
- Include: `src/lib/**/*.ts`, `src/cli/**/*.ts`
- Exclude: Tests, types, app, components, report templates, CLI bin
- Reporters: `text`, `json-summary`, `json`, `lcov`
- **Thresholds**: statements 80%, branches 65%, functions 80%, lines 80%

---

## 7. Existing Test Patterns

### 7.1 Scanner Tests — `src/lib/scanner/__tests__/`

| File | Tests | Pattern |
|------|-------|---------|
| [engine.test.ts](src/lib/scanner/__tests__/engine.test.ts) | 8 tests | Uses `vi.hoisted()` for mocks, mocks `playwright`, `fs`, `path`. Tests `scanPage()` and `scanUrl()`. Verifies browser lifecycle, progress callbacks, timeout handling, error propagation. |
| [result-parser.test.ts](src/lib/scanner/__tests__/result-parser.test.ts) | 10 tests | Uses factory function `makeAxeResults()`. Tests mapping of violations, passes, incomplete, inapplicable. Verifies score calculation, engine version extraction, empty arrays. |
| [store.test.ts](src/lib/scanner/__tests__/store.test.ts) | 10+ tests | Uses `vi.useFakeTimers()` for TTL tests. Dynamic `import()` for module isolation. Tests CRUD for scans and crawls, TTL cleanup behavior. |

### 7.2 CI Tests — `src/lib/ci/__tests__/`

| File | Tests | Pattern |
|------|-------|---------|
| [threshold.test.ts](src/lib/ci/__tests__/threshold.test.ts) | 12 tests | Factory function `makeViolation()`. Tests score/count/rule checks, ignoreRules filtering, detail messages, default thresholds. |
| [formatters/json.test.ts](src/lib/ci/__tests__/formatters/json.test.ts) | 3 tests | Factory `makeCiResult()`. Tests JSON validity, structure match, indentation. |
| [formatters/sarif.test.ts](src/lib/ci/__tests__/formatters/sarif.test.ts) | 4 tests | Mocks `generateSarif`, tests delegation and JSON output. |
| [formatters/junit.test.ts](src/lib/ci/__tests__/formatters/junit.test.ts) | 6 tests | Tests XML structure, testcase generation, instance counts, XML escaping. |

### 7.3 CLI Tests — `src/cli/__tests__/`

| File | Tests | Pattern |
|------|-------|---------|
| [scan.test.ts](src/cli/__tests__/scan.test.ts) | 10 tests | Mocks all dependencies (`scanUrl`, `parseAxeResults`, `evaluateThreshold`, formatters, `fs`). Spies on `process.exit`, `process.stdout.write`, `process.stderr.write`. Tests exit codes, format selection, file output, config loading. |
| [crawl.test.ts](src/cli/__tests__/crawl.test.ts) | 6+ tests | Same pattern as scan.test.ts. Mocks `startCrawl`, `getCrawl`, `getScan`, scoring functions. Tests crawl flow, config options, format selection. |
| [loader.test.ts](src/cli/__tests__/loader.test.ts) | 12 tests | Mocks `fs` and `path`. Tests explicit config path, directory walk-up, merge precedence. |

### 7.4 Common Test Patterns

1. **Factory functions**: `makeViolation()`, `makeAxeResults()`, `makeCiResult()` for consistent test data.
2. **Mocking strategy**: `vi.mock()` at module level, `vi.mocked()` for type-safe access. `vi.hoisted()` for mocks needed before imports.
3. **Process spying**: `vi.spyOn(process, 'exit')`, `vi.spyOn(process.stdout, 'write')` for CLI tests.
4. **Cleanup**: `beforeEach(vi.clearAllMocks)`, `afterEach` restores spies.
5. **No integration tests**: All tests mock external dependencies (Playwright, file system, etc.). No tests run actual browser scans.

---

## Key Discoveries

### Discovery 1: Manual axe-core Injection vs @axe-core/playwright

The engine manually injects `axe.min.js` via `page.evaluate()` rather than using the `@axe-core/playwright` package (which is a dependency but unused). This gives full control over WCAG tag filtering and avoids the higher-level API's constraints.

### Discovery 2: No Self-Scan in CI

The CI workflow (`ci.yml`) runs lint, unit tests, and build, but **does not** perform any accessibility self-scan against the built application. There is no step that starts the Next.js server and runs the scanner against it.

### Discovery 3: CLI Designed for CI Use

The CLI (`a11y-scan`) is explicitly designed for CI/CD integration:

- Exit code 0/1/2 semantics
- SARIF, JUnit, JSON output formats
- Threshold-based pass/fail
- Config file support (`.a11yrc.json`)
- Progress on stderr, results on stdout

### Discovery 4: No SSRF Protection in CLI

The CLI commands do not validate URLs against private/internal IPs. This is intentional — the CLI is a local tool and needs to scan localhost for self-scanning scenarios.

### Discovery 5: Report Output Formats

The CI system produces three output formats:

- **JSON**: `CiResult` with `passed`, `score`, `grade`, `violationCount`, `thresholdEvaluation`, `violations[]`.
- **SARIF**: Standard Static Analysis Results Interchange Format, suitable for GitHub Code Scanning.
- **JUnit**: XML test report format, compatible with CI test reporters.

### Discovery 6: Playwright Requirement

Self-scanning in CI requires Playwright browsers to be installed (`npx playwright install chromium`). The CI workflow currently does not install Playwright browsers.

### Discovery 7: CiResult Structure

The `CiResult` type is the canonical output for CI operations. It contains:

- `passed: boolean` — overall pass/fail
- `score: number` — 0–100
- `grade: ScoreGrade` — A/B/C/D/F
- `url: string`
- `timestamp: string`
- `violationCount: number`
- `thresholdEvaluation: ThresholdEvaluation`
- `violations: CiViolationSummary[]` — each with `ruleId`, `impact`, `description`, `instanceCount`, `helpUrl`

### Discovery 8: Test Coverage Thresholds

Vitest enforces: statements 80%, branches 65%, functions 80%, lines 80%. Coverage includes `src/lib/**/*.ts` and `src/cli/**/*.ts` but excludes app routes, components, types, and templates.

---

## 8. GitHub Action Definition

### 8.1 action.yml — [action/action.yml](action/action.yml)

**Composite GitHub Action** for external use: "Accessibility Scan".

**Inputs**:

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `url` | Yes | — | URL to scan |
| `mode` | No | `single` | `single` or `crawl` |
| `threshold` | No | `70` | Min score 0–100 |
| `max-pages` | No | `50` | Max pages in crawl mode |
| `output-format` | No | `sarif` | `json`, `sarif`, `junit` |
| `output-directory` | No | `./a11y-results` | Output directory |

**Outputs**: `score`, `passed`, `report-path`.

**Steps**:

1. Setup Node.js 20
2. `npm ci` (in action directory)
3. **`npx playwright install --with-deps chromium`** — installs Playwright browsers
4. Run scan via **`npx ts-node src/cli/bin/a11y-scan.ts`** — uses `ts-node` to run CLI directly from TypeScript source (no compile step needed)

**Key Findings**:

- The action uses `ts-node` to run the CLI — no `dist/` compilation required.
- Playwright browsers are installed with `--with-deps` (includes system dependencies).
- The action captures exit code and parses JSON output for `score` and `passed` outputs.
- **No `.a11yrc.json` exists** in the repository — CLI would use default settings or explicit flags.

---

## Outstanding Questions

1. **Self-scan server orchestration**: How to start the Next.js server in CI and wait for readiness before scanning?
2. **Self-scan URL**: Would the self-scan target `http://localhost:3000` (dev server) or use `next start` (production mode)?
3. **Threshold policy for self-scan**: What score threshold should the self-scan enforce? Default is 70.
4. **ts-node vs tsx**: The action uses `ts-node`; should CI self-scan use the same approach or `tsx` which is faster?
5. **Playwright browser caching**: Should Playwright browsers be cached in CI workflow to speed up runs?

---

## Recommended Next Research

- [ ] Examine how `next build` + `next start` could be orchestrated in CI for self-scanning.
- [ ] Research `npx tsx` vs `npx ts-node` for running the CLI in CI.
- [ ] Investigate Playwright CI browser installation and caching strategies.
- [ ] Check if the app pages (`/`, `/scan/[id]`, `/crawl/[id]`) are suitable self-scan targets.
- [ ] Research approaches for starting a Next.js server in CI and waiting for it to be ready (e.g., `wait-on`).
- [ ] Consider whether `scanUrl()` could be used programmatically in a vitest integration test instead of the CLI.
