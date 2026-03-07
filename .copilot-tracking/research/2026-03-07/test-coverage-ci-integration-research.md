<!-- markdownlint-disable-file -->
# Task Research: Comprehensive Test Coverage & CI Integration (AB#1973)

Establish a complete testing framework for the AODA WCAG accessibility scanner. Includes unit tests for all existing modules (scanner, crawler, scoring, reports, CI formatters, CLI), integration tests, and GitHub Actions workflow integration so that every PR and push triggers automated test execution.

## Task Implementation Requests

* Set up Vitest as the test framework and configure package.json scripts (AB#1988)
* Write unit tests for scanner engine, result parser, and store modules (AB#1987)
* Write unit tests for crawler modules: url-utils, robots, sitemap, site-crawler (AB#1983)
* Write unit tests for scoring modules: calculator, site-calculator, wcag-mapper (AB#1984)
* Write unit tests for report generators, SARIF generator, and CI formatters (AB#1986)
* Write unit tests for CLI config loader and command modules (AB#1985)
* Create GitHub Actions CI workflow with lint, test, and build steps (AB#1990)
* Add code coverage thresholds and reporting to CI workflow (AB#1989)

## ADO Work Item Hierarchy

```text
Epic 1973: Comprehensive Test Coverage & CI Integration
├── Feature 1977: Test Framework Setup & Unit Tests
│   ├── User Story 1988: Set up Vitest test framework and configure package.json scripts
│   ├── User Story 1987: Unit tests for scanner engine, result parser, and store modules
│   ├── User Story 1983: Unit tests for crawler modules (url-utils, robots, sitemap, site-crawler)
│   ├── User Story 1984: Unit tests for scoring modules (calculator, site-calculator, wcag-mapper)
│   ├── User Story 1986: Unit tests for report generators, SARIF generator, and CI formatters
│   └── User Story 1985: Unit tests for CLI config loader and command modules
└── Feature 1976: GitHub Actions CI Workflow with Tests
    ├── User Story 1990: Create GitHub Actions CI workflow with lint, test, and build steps
    └── User Story 1989: Add code coverage thresholds and reporting to CI workflow
```

## Scope and Success Criteria

* Scope: Vitest framework setup, unit tests for all Phase 1 & Phase 2 modules (~24 source modules, ~2,055 LOC), GitHub Actions CI workflow, coverage reporting. Excludes integration/E2E tests, React component tests, performance testing, and accessibility testing of the app itself.
* Assumptions:
  * Project uses TypeScript with Next.js 15 (App Router), `@/*` path alias → `./src/*`
  * No existing test framework, test dependencies, or test scripts exist (confirmed by subagent analysis)
  * Vitest is the selected test runner (per ADO work items)
  * All library modules under `src/lib/` and CLI modules under `src/cli/` need test coverage
  * React component tests and API route tests are out of scope
  * Node.js 20 LTS standardized across all configs (Dockerfile, action.yml, azure-pipelines)
* Success Criteria:
  * Vitest configured with TypeScript support, `@/*` path alias resolution, and `node` environment
  * Unit tests exist for every module category listed in the work items (scanner, crawler, scoring, report, CI, CLI)
  * `npm test`, `npm run test:coverage`, and `npm run test:ci` scripts work
  * GitHub Actions CI workflow runs lint, test, build on push/PR to `main`
  * Code coverage reporting in PRs (soft thresholds initially, hard thresholds once coverage stabilizes)
  * All tests pass with zero errors; `npm run lint` and `npm run build` continue passing

## Outline

1. Project Configuration Baseline
2. Source Module Landscape — 24 modules classified by test complexity
3. Vitest Configuration — `vitest.config.ts`, dependencies, scripts
4. Mocking Strategy — patterns for Playwright, Puppeteer, Crawlee, process, fs
5. Test Organization — file structure, naming conventions, test priority tiers
6. Module-by-Module Test Requirements
7. GitHub Actions CI Workflow Design — single job, reporting, caching
8. Coverage Thresholds and Reporting
9. Alternatives Considered

## Potential Next Research

* Commander.js testing strategy: `.parseAsync()` invocation vs action handler extraction for CLI tests
* `crawlee` mock patterns: no official test utilities, community patterns are sparse
* Coverage badge generation for README (shields.io + coverage JSON endpoint)
* Fork PR workflow: if external contributors are expected, two-workflow pattern needed for security
* E2E/integration test strategy for scanner and crawler modules with real browsers

## Research Executed

### ADO Work Items Analysis

* Epic 1973: "Comprehensive Test Coverage & CI Integration" — State: New, Priority: 2, Tags: Agentic AI
* Feature 1977: "Test Framework Setup & Unit Tests" — 6 child User Stories (1983-1988)
* Feature 1976: "GitHub Actions CI Workflow with Tests" — 2 child User Stories (1989-1990)
* All 8 User Stories in "New" state
* Full hierarchy documented in ADO Work Item Hierarchy section above

### File Analysis

* **24 source modules analyzed** across `src/lib/` and `src/cli/` — ~2,055 lines of production code
* **`package.json`**: No test framework, no test scripts, no test dependencies. Scripts: `dev`, `build`, `start`, `lint`.
* **`tsconfig.json`**: `target: ES2017`, `module: esnext`, `moduleResolution: bundler`, `strict: true`, `paths: { "@/*": ["./src/*"] }`
* **`next.config.ts`**: `output: "standalone"`, `serverExternalPackages` for crawlee ecosystem
* **`eslint.config.mjs`**: Flat config extending `next/core-web-vitals` and `next/typescript`
* **`.github/workflows/deploy.yml`**: Build & deploy to Azure only — no quality gates (no lint/test/build)
* **`action/action.yml`**: Composite action for running accessibility scans, uses `actions/setup-node@v4`, Node 20
* **`azure-pipelines/a11y-scan.yml`**: Azure DevOps pipeline for scans, manually triggered
* **`Dockerfile`**: Multi-stage build, Node 20, installs Playwright + Puppeteer browsers

### Code Search Results

* Zero test files found (`*.test.ts`, `*.spec.ts`) — confirmed greenfield test setup
* Two browser engines used: Playwright (scanner/crawler) and Puppeteer (PDF)
* Module-level side effects in: `engine.ts` (fs.readFileSync at import), `store.ts` (setInterval at import)
* `process.exit()` calls in both CLI commands (scan.ts, crawl.ts)
* No dependency injection — all modules use direct imports

### External Research

* Vitest v3.2+ with v8 coverage provider: AST-aware remapping, default/recommended
* `actions/setup-node@v4`: matches existing project usage, v6 has breaking changes
* `dorny/test-reporter@v2` (v2.6.0): JUnit XML → GitHub Check Runs with annotations
* `davelosert/vitest-coverage-report-action@v2` (v2.9.3): PR coverage comments, requires `json-summary` + `json` reporters
* Vitest `github-actions` reporter auto-enables when `GITHUB_ACTIONS=true`, provides inline annotations

### Project Conventions

* Node.js 20 LTS standardized across all configurations
* `npm ci` is the standard install command (lockfile-based)
* `actions/checkout@v4` used consistently
* ADO workflow: all work items must have `Agentic AI` tag, use `AB#` linking in commits

## Key Discoveries

### Project Structure

**24 source modules** organized into 6 domains:

| Domain | Modules | Lines | Test Complexity |
|--------|---------|-------|-----------------|
| Scanner | engine, result-parser, store | ~231 | High (Playwright, side effects) |
| Crawler | url-utils, robots, sitemap, site-crawler | ~538 | Mixed (pure to very high) |
| Scoring | calculator, site-calculator, wcag-mapper | ~334 | Low (pure functions) |
| Report | generator, pdf-generator, sarif-generator, site-generator, 2 templates | ~502 | Mixed (pure to medium) |
| CI | threshold, json, sarif, junit formatters | ~122 | Low (pure functions) |
| CLI | config/loader, scan command, crawl command, entry point | ~328 | High (fs, process, many deps) |

### Module Classification by Test Complexity

**Tier 1 — Pure Functions (no mocking, ~819 lines, 16 exports):**
`wcag-mapper`, `calculator`, `url-utils`, `threshold`, `json`/`junit`/`sarif` formatters, `generator`, `sarif-generator`, report templates

**Tier 2 — Light Mocking (internal deps, ~426 lines):**
`result-parser`, `site-calculator`, `site-generator`, `ci/formatters/sarif`, `store`

**Tier 3 — Heavy Mocking (external deps, ~796 lines):**
`engine`, `robots`, `sitemap`, `pdf-generator`, `config/loader`, `scan`/`crawl` commands, `site-crawler`

### Implementation Patterns

* **No dependency injection** — all modules use direct `import` statements, requiring `vi.mock()` at module level
* **Module-level side effects** require `vi.hoisted()` pattern:
  * `engine.ts` reads `axe-core/axe.min.js` via `fs.readFileSync` at import time
  * `store.ts` starts `setInterval` for TTL cleanup at import time
* **Two browser engines**: Playwright (scanning + crawling) and Puppeteer (PDF) need separate mock patterns
* **`process.exit()` in CLI** — both `scan.ts` and `crawl.ts` call `process.exit()`, must be intercepted
* **`vi.mock()` path aliases**: `vi.mock()` does NOT resolve `@/` aliases — must use relative paths

### Complete Examples

**Recommended `vitest.config.ts`:**

```ts
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

**Critical mocking pattern — `vi.hoisted()` for module-level side effects:**

```ts
import { vi, describe, it, expect } from 'vitest';

const mocks = vi.hoisted(() => ({
  readFileSync: vi.fn().mockReturnValue('mock-axe-source'),
  resolve: vi.fn().mockReturnValue('/mock/path/axe.min.js'),
}));

vi.mock('fs', () => ({ readFileSync: mocks.readFileSync }));
vi.mock('path', () => ({ resolve: mocks.resolve }));

import { scanUrl } from '../engine';  // Now safe — fs is already mocked
```

**Playwright mock pattern:**

```ts
const mocks = vi.hoisted(() => {
  const mockPage = {
    goto: vi.fn().mockResolvedValue(undefined),
    evaluate: vi.fn().mockResolvedValue({ violations: [], passes: [], incomplete: [], inapplicable: [] }),
    close: vi.fn(),
  };
  const mockBrowser = {
    newContext: vi.fn().mockResolvedValue({ newPage: vi.fn().mockResolvedValue(mockPage), close: vi.fn() }),
    close: vi.fn(),
  };
  return { mockPage, mockBrowser, chromium: { launch: vi.fn().mockResolvedValue(mockBrowser) } };
});
vi.mock('playwright', () => ({ chromium: mocks.chromium }));
```

**Puppeteer mock pattern (default export):**

```ts
vi.mock('puppeteer', () => ({
  default: { launch: mocks.launch },
}));
```

**process.exit mock pattern:**

```ts
const mockExit = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);
```

### Configuration Examples

**package.json script additions:**

```json
{
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage",
  "test:ci": "vitest run --coverage"
}
```

**dev dependencies to install:**

```bash
npm install -D vitest @vitest/coverage-v8
```

**.gitignore additions:**

```text
test-results/
coverage/
```

**Test file structure (co-located `__tests__/` directories):**

```text
src/lib/scanner/__tests__/engine.test.ts
src/lib/scanner/__tests__/store.test.ts
src/lib/scanner/__tests__/result-parser.test.ts
src/lib/crawler/__tests__/url-utils.test.ts
src/lib/crawler/__tests__/robots.test.ts
src/lib/crawler/__tests__/sitemap.test.ts
src/lib/crawler/__tests__/site-crawler.test.ts
src/lib/scoring/__tests__/calculator.test.ts
src/lib/scoring/__tests__/wcag-mapper.test.ts
src/lib/scoring/__tests__/site-calculator.test.ts
src/lib/report/__tests__/generator.test.ts
src/lib/report/__tests__/pdf-generator.test.ts
src/lib/report/__tests__/sarif-generator.test.ts
src/lib/report/__tests__/site-generator.test.ts
src/lib/ci/__tests__/threshold.test.ts
src/lib/ci/__tests__/formatters/json.test.ts
src/lib/ci/__tests__/formatters/sarif.test.ts
src/lib/ci/__tests__/formatters/junit.test.ts
src/cli/__tests__/loader.test.ts
src/cli/__tests__/scan.test.ts
src/cli/__tests__/crawl.test.ts
```

## Technical Scenarios

### Scenario 1: Test Framework Setup (AB#1988)

Set up Vitest as the test framework with TypeScript path aliases, v8 coverage, and CI-aware reporters.

**Requirements:**

* Install `vitest` and `@vitest/coverage-v8` as dev dependencies
* Create `vitest.config.ts` with `@/*` path alias, `node` environment, coverage thresholds
* Add `test`, `test:watch`, `test:coverage`, `test:ci` scripts to `package.json`
* Add `test-results/` and `coverage/` to `.gitignore`
* Conditional reporters: `github-actions` + `junit` in CI, `default` in dev

**Preferred Approach:**

* Separate `vitest.config.ts` (not extending `next.config.ts` — Vitest ignores Next.js config entirely)
* v8 coverage provider (default, faster, AST-aware since v3.2)
* `restoreMocks: true` and `clearMocks: true` for automatic cleanup
* Co-located `__tests__/` directories within each module folder

```text
New files:
  vitest.config.ts

Modified files:
  package.json (add scripts + devDependencies)
  .gitignore (add test-results/ and coverage/)
```

**Implementation Details:**

1. `npm install -D vitest @vitest/coverage-v8`
2. Create `vitest.config.ts` (see Complete Examples above)
3. Add test scripts to `package.json`
4. Add `test-results/` and `coverage/` to `.gitignore`

#### Considered Alternatives

* **Jest with `next/jest`**: More common in older Next.js projects, but requires SWC transform config, slower, poorer ESM support. Vitest is explicitly requested in the work items and better suited for ESM + TypeScript.
* **`vitest-environment-nuxt`-style plugins**: Not needed — all test targets are server-side library code, not React components.

---

### Scenario 2: Unit Tests for Pure Function Modules (AB#1984, AB#1983 partial, AB#1986 partial, AB#1987 partial)

Test all pure-function modules that require zero or minimal mocking.

**Requirements:**

* Test `wcag-mapper.ts` (2 functions, tag → principle mapping)
* Test `calculator.ts` (scoring algorithm, grade thresholds, POUR principles)
* Test `url-utils.ts` (4 functions, URL normalization, domain boundary, scannable check, pattern matching)
* Test `threshold.ts` (threshold evaluation with score, count, rule checks)
* Test `formatters/json.ts`, `formatters/junit.ts`, `formatters/sarif.ts` (output formatting)
* Test `generator.ts` (report data assembly)
* Test `sarif-generator.ts` (SARIF v2.1.0 output structure)
* Test `result-parser.ts` (axe result transformation — light mocking of scoring functions)
* Test `site-calculator.ts` (site-wide aggregation — no mocking needed, uses mock data arrays)

**Preferred Approach:**

* Parameterized tests using `it.each()` for edge cases
* Direct testing without mocks for truly pure functions
* Mock `Date` constructor where deterministic timestamps are needed
* Build reusable mock data factories for `AxeViolation[]`, `ScanRecord[]`, etc.

**Implementation Details:**

Start with Tier 1 (pure functions), then Tier 2 (light mocking). Approximately 10 test files covering ~1,245 lines of production code. This is the highest-value, lowest-effort work.

---

### Scenario 3: Unit Tests for Mocking-Heavy Modules (AB#1987, AB#1983, AB#1985, AB#1986)

Test modules requiring significant mock infrastructure for external dependencies.

**Requirements:**

* Test `engine.ts` (Playwright browser lifecycle, axe injection, timeout fallback)
* Test `store.ts` (CRUD operations, TTL cleanup with fake timers)
* Test `robots.ts` (fetch mocking, cache behavior, error handling)
* Test `sitemap.ts` (Sitemapper class mocking, error handling)
* Test `site-crawler.ts` (Crawlee + 10 internal dep mocks, cancellation)
* Test `pdf-generator.ts` (Puppeteer mocking)
* Test `site-generator.ts` (store + scoring module mocking)
* Test `config/loader.ts` (fs mocking, directory walk, config merging)
* Test `commands/scan.ts` (all deps + process.exit + stdout/stderr)
* Test `commands/crawl.ts` (all deps + process.exit + stdout/stderr)

**Preferred Approach:**

* `vi.hoisted()` + `vi.mock()` pattern for all external dependency mocking
* Separate mock factory files if patterns repeat (e.g., Playwright mock used in engine + crawler tests)
* `vi.useFakeTimers()` for store TTL tests
* `vi.spyOn(process, 'exit')` for CLI command tests
* Commander commands tested via `.parseAsync(['node', 'test', '--url', '...'])`
* `vi.stubGlobal('fetch', mockFetch)` for robots.ts

**Implementation Details:**

~796 lines of production code requiring 10 test files with significant mock setup. `site-crawler.ts` is the most complex (256 lines, ~10 dependencies to mock). CLI commands need full dependency chain mocking.

---

### Scenario 4: GitHub Actions CI Workflow (AB#1990)

Create a CI workflow that runs lint, tests, and build on every push and PR.

**Requirements:**

* Trigger on push to `main` and pull_request to `main`
* Run `npm run lint`, `npm run test:ci`, `npm run build` in sequence
* JUnit test report display in PR via `dorny/test-reporter@v2`
* Coverage report comment in PR via `davelosert/vitest-coverage-report-action@v2`
* Upload test results and coverage as artifacts
* Cache npm packages and Next.js build cache
* Concurrency control to cancel redundant runs

**Preferred Approach: Single Job with Sequential Steps**

Single `ci` job on `ubuntu-latest` with Node 20:
Checkout → Setup Node (cached npm) → `npm ci` → Lint → Test → Upload artifacts → Test report → Coverage report → Cache .next → Build

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
      - run: npm run lint
      - run: npm run test:ci
      - uses: actions/upload-artifact@v4
        if: ${{ !cancelled() }}
        with:
          name: test-results
          path: test-results/
          retention-days: 30
      - uses: actions/upload-artifact@v4
        if: ${{ !cancelled() }}
        with:
          name: coverage
          path: coverage/
          retention-days: 30
      - uses: dorny/test-reporter@v2
        if: ${{ !cancelled() }}
        with:
          name: 'Unit Tests'
          path: test-results/junit.xml
          reporter: java-junit
          fail-on-error: true
      - uses: davelosert/vitest-coverage-report-action@v2
        if: always()
        with:
          name: 'Coverage'
          file-coverage-mode: 'changes'
      - uses: actions/cache@v4
        with:
          path: .next/cache
          key: nextjs-${{ runner.os }}-${{ hashFiles('**/package-lock.json') }}-${{ hashFiles('src/**') }}
          restore-keys: |
            nextjs-${{ runner.os }}-${{ hashFiles('**/package-lock.json') }}-
            nextjs-${{ runner.os }}-
      - run: npm run build
```

```text
New files:
  .github/workflows/ci.yml
```

#### Considered Alternatives

* **Parallel jobs (lint + test + build separately)**: More complex, artifact passing overhead, more GH Actions minutes. Not justified for this project size.
* **`actions/setup-node@v6`**: Breaking changes (auto-caching behavior). v4 matches existing project usage.
* **Codecov/Coveralls for coverage**: Requires external service account. `vitest-coverage-report-action` is self-contained.

---

### Scenario 5: Coverage Thresholds and Reporting (AB#1989)

Configure coverage thresholds and integrate reporting into the CI workflow.

**Requirements:**

* Coverage thresholds for statements, branches, functions, lines
* Coverage displayed in PR comments
* Coverage trend tracking over time

**Preferred Approach: Soft Thresholds Initially, Hard Later**

Start with `davelosert/vitest-coverage-report-action@v2` for visual PR comments with threshold icons. Configure hard thresholds in `vitest.config.ts` at 80/75/80/80 but initially used only for local development awareness. Graduate to CI enforcement once coverage stabilizes.

**Implementation Details:**

Coverage reporters needed: `text` (terminal), `json-summary` + `json` (PR action), `lcov` (optional Codecov). `reportOnFailure: true` ensures coverage output even on test failures.

## Recommended Implementation Sequence

### Phase A: Framework Setup (AB#1988) — Foundation

1. Install `vitest` + `@vitest/coverage-v8`
2. Create `vitest.config.ts`
3. Add test scripts to `package.json`
4. Add `test-results/` and `coverage/` to `.gitignore`
5. Validate with `npm test` (should report zero tests found)

### Phase B: Pure Function Tests — Quick Wins

Start with Tier 1 modules requiring zero mocking (~819 lines, 16 functions):

6. `scoring/wcag-mapper.test.ts` (AB#1984)
7. `scoring/calculator.test.ts` (AB#1984)
8. `crawler/url-utils.test.ts` (AB#1983)
9. `ci/threshold.test.ts` (AB#1986)
10. `ci/formatters/json.test.ts` (AB#1986)
11. `ci/formatters/junit.test.ts` (AB#1986)
12. `report/sarif-generator.test.ts` (AB#1986)
13. `report/generator.test.ts` (AB#1986)

### Phase C: Light Mocking Tests

Modules needing internal dependency mocks only (~426 lines):

14. `scanner/result-parser.test.ts` (AB#1987)
15. `scoring/site-calculator.test.ts` (AB#1984)
16. `scanner/store.test.ts` — fake timers for setInterval (AB#1987)
17. `ci/formatters/sarif.test.ts` (AB#1986)
18. `report/site-generator.test.ts` (AB#1986)

### Phase D: Heavy Mocking Tests

Modules requiring external dependency mocks (~796 lines):

19. `scanner/engine.test.ts` — Playwright + fs mocks (AB#1987)
20. `crawler/robots.test.ts` — fetch + robots-parser mocks (AB#1983)
21. `crawler/sitemap.test.ts` — Sitemapper mock (AB#1983)
22. `report/pdf-generator.test.ts` — Puppeteer mock (AB#1986)
23. `cli/loader.test.ts` — fs + path mocks (AB#1985)
24. `cli/scan.test.ts` — full dep chain + process mocks (AB#1985)
25. `cli/crawl.test.ts` — full dep chain + process mocks (AB#1985)
26. `crawler/site-crawler.test.ts` — Crawlee + 10 dep mocks (AB#1983)

### Phase E: GitHub Actions CI (AB#1990, AB#1989)

27. Create `.github/workflows/ci.yml`
28. Configure coverage reporting in workflow
29. Validate end-to-end CI pipeline

### User Story → Test File Mapping

| User Story | Test Files |
|-----------|------------|
| AB#1988 (Vitest setup) | `vitest.config.ts`, `package.json` scripts, `.gitignore` |
| AB#1987 (Scanner tests) | `engine.test.ts`, `result-parser.test.ts`, `store.test.ts` |
| AB#1983 (Crawler tests) | `url-utils.test.ts`, `robots.test.ts`, `sitemap.test.ts`, `site-crawler.test.ts` |
| AB#1984 (Scoring tests) | `calculator.test.ts`, `site-calculator.test.ts`, `wcag-mapper.test.ts` |
| AB#1986 (Report/CI tests) | `generator.test.ts`, `pdf-generator.test.ts`, `sarif-generator.test.ts`, `site-generator.test.ts`, `json.test.ts`, `sarif.test.ts`, `junit.test.ts` |
| AB#1985 (CLI tests) | `loader.test.ts`, `scan.test.ts`, `crawl.test.ts` |
| AB#1990 (CI workflow) | `.github/workflows/ci.yml` |
| AB#1989 (Coverage) | Coverage config in `vitest.config.ts`, coverage steps in `ci.yml` |

## Subagent Research Documents

* [source-module-analysis-research.md](.copilot-tracking/research/subagents/2026-03-07/source-module-analysis-research.md) — Full analysis of all 24 source modules
* [vitest-configuration-research.md](.copilot-tracking/research/subagents/2026-03-07/vitest-configuration-research.md) — Vitest configuration, mocking patterns, pitfalls
* [github-actions-ci-research.md](.copilot-tracking/research/subagents/2026-03-07/github-actions-ci-research.md) — CI workflow design, tooling, reporting
