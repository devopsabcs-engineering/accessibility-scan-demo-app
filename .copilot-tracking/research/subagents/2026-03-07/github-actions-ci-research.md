# Research: GitHub Actions CI Workflow for Next.js Test Suite

## Research Topics

1. Workflow structure for Next.js 15 TypeScript CI (lint, test, build)
2. Test execution and reporting with Vitest JUnit output
3. Coverage reporting in PR comments
4. Build validation with Next.js
5. Best practices for GitHub Actions 2025–2026
6. Existing CI/CD configuration in the repo

---

## 1. Existing CI/CD Configuration Found in Repo

### `.github/workflows/deploy.yml` — Build and Deploy to Azure

- **Triggers**: `push` to `main`, `workflow_dispatch`
- **Permissions**: `id-token: write`, `contents: read` (for OIDC Azure login)
- **Job**: Single `build-and-deploy` job on `ubuntu-latest`
- **Steps**: Checkout → Azure Login (OIDC) → Deploy Bicep infra → ACR login → Docker build+push → Restart Web App
- **Does NOT include**: lint, test, or build validation steps
- **Uses**: `actions/checkout@v4`, `azure/login@v2`, `azure/arm-deploy@v2`
- **Env vars**: `RESOURCE_GROUP: rg-a11y-scan-demo`, `APP_NAME: a11y-scan-demo`

### `action/action.yml` — Composite GitHub Action (Accessibility Scan)

- **Purpose**: Reusable action for running WCAG 2.2 accessibility scans on a URL
- **Uses**: `actions/setup-node@v4`, Node.js 20, `npm ci`, `npx playwright install --with-deps chromium`
- **Modes**: `single` or `crawl`
- **Outputs**: SARIF, JUnit, or JSON reports
- **Not CI testing** — this is the deployed scanner action itself

### `azure-pipelines/a11y-scan.yml` — Azure DevOps Pipeline

- **Trigger**: `none` (manually invoked)
- **Pool**: `ubuntu-latest`
- **Steps**: NodeTool@0 (Node 20) → `npm ci` → Playwright install → Run scan → PublishTestResults@2 (JUnit XML)
- **Not CI testing** — runs accessibility scans, not project tests

### `Dockerfile` — Multi-stage Docker Build

- **Base**: `node:20-alpine` for deps/build, `node:20-bookworm-slim` for runtime
- **Build**: `npm ci` → `npx next build`
- **Runtime**: Installs Playwright + Puppeteer browsers, copies standalone output
- **Next.js config**: `output: "standalone"`

### Key Observations

- No existing CI workflow for lint/test/build validation
- The deploy workflow runs on every push to `main` with no quality gates
- Node.js 20 is standardized across all configurations
- `npm ci` is the standard install command (lockfile-based)
- `package-lock.json` exists in the repo

---

## 2. Current Project State

### `package.json` Scripts

```json
{
  "dev": "next dev --turbopack",
  "build": "next build --turbopack",
  "start": "next start",
  "lint": "eslint"
}
```

**Missing scripts** (to be added in the implementation phase):

- `test` — Vitest in watch mode
- `test:ci` — Vitest single-run, JUnit + coverage reporters
- `test:coverage` — Vitest with coverage enabled

### Dependencies Relevant to Testing

- **Currently installed**: playwright, @axe-core/playwright
- **Not installed (needed)**: vitest, @vitest/coverage-v8
- **TypeScript**: ^5
- **Node**: 20 (standardized)

### ESLint Config

- Uses flat config (`eslint.config.mjs`)
- Extends `next/core-web-vitals` and `next/typescript`
- No test-specific ignores yet

### TypeScript Config

- `target: ES2017`, `module: esnext`, `moduleResolution: bundler`
- Path aliases: `@/*` → `./src/*`
- `noEmit: true` (type checking only, Next.js handles compilation)

### Next.js Config

- `output: "standalone"` for Docker deployment
- `serverExternalPackages` configured for crawlee ecosystem

---

## 3. GitHub Actions Tooling Research

### `actions/setup-node` — Latest: v6.3.0

**Breaking changes in v6**:

- Caching is now auto-enabled for npm when `packageManager` field exists in `package.json`
- `always-auth` input removed

**Breaking changes in v5**:

- Enabled caching by default with package manager detection
- Upgraded to node24 runtime

**Recommendation**: Use `actions/setup-node@v4` for stability (project currently uses v4 in action.yml) — OR upgrade to `actions/setup-node@v6` for latest features.

**Decision**: Use `actions/setup-node@v4` to match existing `action/action.yml` and avoid breaking changes. The project doesn't have `packageManager` field in `package.json`, so auto-caching won't activate. Explicitly set `cache: 'npm'`.

**Configuration**:

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'npm'
```

### `dorny/test-reporter` — Latest: v2.6.0

**Supported reporters**: `java-junit` (works for any JUnit XML), `jest-junit`, `mocha-json`, etc.

**Key features**:

- Creates GitHub Check Runs with test results
- Annotates code at failure locations
- Output parameters: `conclusion`, `passed`, `failed`, `skipped`, `time`
- `if: ${{ !cancelled() }}` ensures report runs even on test failure
- Actions Summary support with `use-actions-summary: 'true'`
- Badge titles with `badge-title`

**Permissions required**: `contents: read`, `actions: read`, `checks: write`

**For Vitest JUnit output**: Use `reporter: java-junit` (Vitest produces standard JUnit XML)

**Fork PR limitation**: For public repos with fork PRs, need a two-workflow approach (CI + Report). For private/org repos, single workflow works.

**Configuration**:

```yaml
- uses: dorny/test-reporter@v2
  if: ${{ !cancelled() }}
  with:
    name: 'Unit Tests'
    path: 'test-results/junit.xml'
    reporter: java-junit
    fail-on-error: true
```

### `davelosert/vitest-coverage-report-action` — Latest: v2.9.3

**Purpose**: Posts coverage summary as PR comment with file-level details.

**Required Vitest coverage reporters**: `json-summary` (required), `json` (recommended)

**Key features**:

- PR comment with coverage table (statements, branches, functions, lines)
- File-level coverage for changed files (`file-coverage-mode: changes`)
- Coverage threshold icons (customizable)
- Coverage trend indicators (compare with base branch)
- Threshold reading from vitest config

**Permissions required**: `pull-requests: write`, `contents: read`

**Vitest config requirements**:

```typescript
coverage: {
  reporter: ['text', 'json-summary', 'json'],
  reportOnFailure: true,
}
```

**Configuration**:

```yaml
- uses: davelosert/vitest-coverage-report-action@v2
  if: always()
  with:
    name: 'Coverage'
    file-coverage-mode: 'changes'
```

### `actions/upload-artifact@v4`

- Upload test results and coverage reports as build artifacts
- Used for artifact retention and downstream jobs

---

## 4. Vitest Reporter Configuration

### JUnit Reporter

Vitest has a built-in JUnit reporter that produces standard JUnit XML:

```typescript
reporters: ['junit', 'default'],
outputFile: {
  junit: './test-results/junit.xml',
}
```

Output format:

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<testsuites name="vitest tests" tests="2" failures="1" errors="0" time="0.503">
  <testsuite name="__tests__/test.ts" ...>
    <testcase classname="..." name="..." time="0.01">
    </testcase>
  </testsuite>
</testsuites>
```

### GitHub Actions Reporter

Vitest auto-enables `github-actions` reporter when `process.env.GITHUB_ACTIONS === 'true'`. If using custom reporters, must explicitly add it:

```typescript
reporters: process.env.GITHUB_ACTIONS
  ? ['default', 'github-actions', 'junit']
  : ['default'],
```

**Important**: The `github-actions` reporter provides inline annotations for test failures directly in PR file diffs.

### Coverage Reporters for CI

For `davelosert/vitest-coverage-report-action`, need:

- `json-summary` → `coverage/coverage-summary.json`
- `json` → `coverage/coverage-final.json`

Combined CI config:

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    reporters: process.env.GITHUB_ACTIONS
      ? ['default', 'github-actions', 'junit']
      : ['default'],
    outputFile: {
      junit: './test-results/junit.xml',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'json', 'lcov'],
      reportOnFailure: true,
      reportsDirectory: './coverage',
    },
  },
})
```

---

## 5. Workflow Design Decisions

### Single Job vs. Multi-Job

**Option A: Single Job** (Recommended)

- Lint → Test → Build in sequence within one job
- Pros: Simpler, faster (no artifact passing overhead), lower GitHub Actions minutes
- Cons: All-or-nothing failure (but that's desired — if lint fails, no point testing)

**Option B: Parallel Jobs** (lint + test in parallel, build depends on both)

- Pros: Faster wall-clock time if lint and test are both slow
- Cons: More complex, needs artifact passing for coverage/test results, more GH Actions minutes
- Not recommended for this project size

**Decision**: Single job with sequential steps. Rationale:

1. Lint is fast (~5-10s)
2. Test execution is fast for unit tests (no browser needed for Vitest unit tests)
3. Build validates TypeScript compilation
4. Simpler workflow maintenance

### Trigger Events

```yaml
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
```

### Concurrency Settings

Cancel in-progress runs for the same PR to save resources:

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true
```

### Node.js Version

- Use Node.js 20 LTS (matches Dockerfile, action.yml, azure-pipelines)
- Single version, no matrix needed for this project

### Caching Strategy

1. **npm cache**: Built into `actions/setup-node@v4` with `cache: 'npm'`
2. **Next.js build cache**: Cache `.next/cache` directory between runs

```yaml
- uses: actions/cache@v4
  with:
    path: ${{ github.workspace }}/.next/cache
    key: nextjs-${{ runner.os }}-${{ hashFiles('**/package-lock.json') }}-${{ hashFiles('src/**') }}
    restore-keys: |
      nextjs-${{ runner.os }}-${{ hashFiles('**/package-lock.json') }}-
      nextjs-${{ runner.os }}-
```

### Timeout

- Job timeout: 15 minutes (generous for lint+test+build)
- Individual step timeouts not needed for this project size

---

## 6. Recommended Workflow YAML Structure

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
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Run tests
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

---

## 7. Required npm Script Additions

The `test:ci` script should run Vitest with coverage and JUnit output:

```json
{
  "scripts": {
    "test": "vitest",
    "test:ci": "vitest run --coverage.enabled --reporter=default --reporter=junit --outputFile.junit=./test-results/junit.xml",
    "test:coverage": "vitest run --coverage"
  }
}
```

Alternatively, configure in `vitest.config.ts` and use simpler scripts:

```json
{
  "scripts": {
    "test": "vitest",
    "test:ci": "vitest run --coverage.enabled",
    "test:coverage": "vitest run --coverage"
  }
}
```

With the `vitest.config.ts` handling reporters conditionally:

```typescript
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    reporters: process.env.GITHUB_ACTIONS
      ? ['default', 'github-actions', 'junit']
      : ['default'],
    outputFile: {
      junit: './test-results/junit.xml',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'json', 'lcov'],
      reportOnFailure: true,
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        '.next/',
        'coverage/',
        'test-results/',
        '**/*.d.ts',
        '**/*.config.*',
        'src/app/**/layout.tsx',
        'src/app/**/page.tsx',
      ],
    },
  },
})
```

---

## 8. Coverage Thresholds

### Option A: In Vitest Config (Recommended)

Fail `test:ci` if coverage drops below thresholds:

```typescript
coverage: {
  thresholds: {
    lines: 70,
    branches: 70,
    functions: 70,
    statements: 70,
  },
}
```

### Option B: Soft Thresholds via Action Icons

Use `threshold-icons` in the coverage action for visual feedback without failing:

```yaml
- uses: davelosert/vitest-coverage-report-action@v2
  with:
    threshold-icons: "{0: '🔴', 50: '🟠', 70: '🟡', 80: '🟢'}"
```

**Decision**: Start with Option B (soft thresholds) since this is a new test suite. Graduate to Option A once coverage stabilizes above 70%.

---

## 9. Integration Points with Vitest Output

### Output Files Produced by `test:ci`

| File | Path | Consumer |
|------|------|----------|
| JUnit XML | `test-results/junit.xml` | `dorny/test-reporter@v2` |
| Coverage Summary JSON | `coverage/coverage-summary.json` | `vitest-coverage-report-action@v2` |
| Coverage Final JSON | `coverage/coverage-final.json` | `vitest-coverage-report-action@v2` |
| Coverage LCOV | `coverage/lcov.info` | Optional: Codecov/Coveralls |
| Coverage Text | Terminal output | Developer visibility |

### `.gitignore` Additions

```text
# Test output
test-results/
coverage/
```

---

## 10. Best Practices Applied

1. **Frozen lockfile**: `npm ci` (already the standard in the project)
2. **Concurrency control**: Cancel in-progress runs for the same branch/PR
3. **Artifact retention**: 30 days for test results and coverage (default is 90, reduce for cost)
4. **Conditional steps**: `if: ${{ !cancelled() }}` for reporting steps (run even on test failure)
5. **Permissions principle of least privilege**: Only `contents: read`, `checks: write`, `pull-requests: write`
6. **Timeout**: 15 minutes job-level timeout
7. **Cache**: npm packages via setup-node, Next.js build cache via actions/cache
8. **Environment detection**: Vitest `github-actions` reporter auto-enabled in CI
9. **`reportOnFailure: true`**: Ensures coverage output even when tests fail

---

## 11. Discovered Research Topics

### Addressed During Research

- [x] Latest `actions/setup-node` version and features (v6.3.0, using v4 for compatibility)
- [x] `dorny/test-reporter` configuration for JUnit (v2.6.0, `java-junit` reporter)
- [x] `davelosert/vitest-coverage-report-action` setup (v2.9.3, requires json-summary + json)
- [x] Vitest JUnit reporter format (standard JUnit XML, built-in)
- [x] Vitest GitHub Actions reporter (auto-enabled, provides inline annotations)
- [x] Coverage report formats needed (json-summary, json, lcov, text)
- [x] Next.js build caching strategy (`.next/cache` directory)
- [x] npm caching (via `actions/setup-node` `cache: 'npm'`)
- [x] Concurrency settings for PR workflows
- [x] Permissions model for check runs and PR comments

### Not Addressed (Out of Scope for CI Workflow)

- Vitest installation and config details (separate implementation task)
- Writing actual test files (separate implementation task)
- Docker image build in CI (handled by existing `deploy.yml`)
- E2E/integration testing with Playwright (separate from unit tests)

---

## 12. Key Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Job structure | Single job | Project is small; lint+test+build are fast sequential steps |
| Node.js version | 20 LTS | Matches all existing configs (Dockerfile, action.yml, azure-pipelines) |
| setup-node version | v4 | Matches existing action.yml; v6 has breaking changes |
| Test reporter | dorny/test-reporter@v2 | Active maintenance (v2.6.0), JUnit support, check run annotations |
| Coverage reporter | davelosert/vitest-coverage-report-action@v2 | Native Vitest support (v2.9.3), PR comments, threshold display |
| Coverage thresholds | Soft (icons only) initially | New test suite — enforce hard thresholds once coverage stabilizes |
| Vitest reporters for CI | default + github-actions + junit | Terminal output + GH annotations + JUnit XML for test-reporter |
| Coverage providers | v8 | Default Vitest provider, no extra deps needed (istanbul is alternative) |
| Trigger events | push to main + PR to main | Standard CI pattern for quality gates |
| Caching | npm (setup-node) + .next/cache (actions/cache) | Fast installs + incremental builds |
| Artifact retention | 30 days | Balance between cost and debugging window |

---

## References

- [actions/setup-node@v6 README](https://github.com/actions/setup-node) — Latest v6.3.0, breaking changes documented
- [dorny/test-reporter@v2 README](https://github.com/dorny/test-reporter) — Latest v2.6.0, JUnit XML support
- [davelosert/vitest-coverage-report-action@v2 README](https://github.com/davelosert/vitest-coverage-report-action) — Latest v2.9.3, coverage PR comments
- [Vitest Reporters Guide](https://vitest.dev/guide/reporters.html) — JUnit, JSON, GitHub Actions reporters
- [Vitest Configuration](https://vitest.dev/config/) — coverage, reporters, outputFile options
- Existing repo files: `.github/workflows/deploy.yml`, `action/action.yml`, `azure-pipelines/a11y-scan.yml`, `Dockerfile`, `package.json`
