# Vitest Configuration Research for Next.js 15 TypeScript Project

**Status:** Complete
**Date:** 2026-03-07
**Project:** accessibility-scan-demo-app

---

## Research Topics

1. Vitest installation and configuration for Next.js 15 + TypeScript
2. Mocking patterns for ES modules, Playwright, Puppeteer, Crawlee, and Node.js built-ins
3. Test organization and file structure conventions
4. Coverage configuration (v8 vs istanbul, thresholds, exclusions)
5. package.json script additions
6. Known issues, pitfalls, and gotchas

---

## 1. Vitest Installation and Configuration

### Required Packages

```bash
npm install -D vitest @vitest/coverage-v8
```

**Why `@vitest/coverage-v8` over `@vitest/coverage-istanbul`:**

- v8 is the default and recommended provider since Vitest 3.2+
- Uses AST-based coverage remapping which produces identical reports to Istanbul
- Faster execution, lower memory
- No pre-instrumentation step needed

### vitest.config.ts (Recommended Configuration)

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
    // Use 'node' environment for server-side library code (not React components)
    environment: 'node',

    // Test file patterns
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    exclude: ['node_modules', '.next', 'dist'],

    // Mock configuration
    restoreMocks: true,
    clearMocks: true,

    // Coverage
    coverage: {
      provider: 'v8',
      include: ['src/lib/**/*.ts', 'src/cli/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.test.tsx',
        'src/lib/types/**',
        'src/lib/report/templates/**',
        'src/app/**',
        'src/components/**',
      ],
      reporter: ['text', 'lcov', 'json-summary'],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },

    // Module isolation for side effects (store.ts has setInterval on import)
    fileParallelism: true,
  },
});
```

### Key Configuration Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Config file | `vitest.config.ts` (separate) | Project uses Next.js, not Vite as build tool |
| Path alias | `resolve.alias` | Maps `@/*` to `./src/*`, mirrors tsconfig `paths` |
| Environment | `node` | All test targets are server-side library code, not DOM |
| Coverage provider | `v8` | Default, faster, AST-aware since v3.2 |
| Mock reset | `restoreMocks: true` | Auto-restore all mocks between tests |

### TypeScript Path Alias Resolution

The `@/*` path alias from `tsconfig.json` must be duplicated in `vitest.config.ts` using Vite's `resolve.alias`:

```ts
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
  },
},
```

**Important:** `vi.mock(import('./path'))` with type inference does NOT work with tsconfig `paths` aliases. Always use relative paths in `vi.mock()` calls, not `@/` aliases. This is a known limitation documented by Vitest:

> "If you are using TypeScript with paths aliases configured in tsconfig.json, the compiler won't be able to correctly resolve import types. In order to make it work, replace all aliased imports with their corresponding relative paths."

---

## 2. Mocking Patterns in Vitest

### 2.1 Mocking ES Modules with `vi.mock()`

`vi.mock()` is hoisted to the top of the file. It executes before all imports.

```ts
import { vi, describe, it, expect } from 'vitest';
import { someFunction } from '../module';

vi.mock('../module', () => ({
  someFunction: vi.fn(),
}));
```

For partial mocking (keep some real implementations):

```ts
vi.mock(import('../module'), async (importOriginal) => {
  const mod = await importOriginal();
  return {
    ...mod,
    someFunction: vi.fn(),
  };
});
```

### 2.2 `vi.hoisted()` Pattern for Module-Level Side Effects

**Critical for this project:** `engine.ts` reads `axe-core` at module load time with `fs.readFileSync`. `store.ts` calls `setInterval` at module load time. These must be mocked BEFORE the module evaluates.

`vi.hoisted()` runs code before any imports (it's hoisted even above `vi.mock`):

```ts
import { vi, describe, it, expect } from 'vitest';

// vi.hoisted() creates mocks BEFORE any module import
const mocks = vi.hoisted(() => {
  return {
    readFileSync: vi.fn().mockReturnValue('mock-axe-source'),
    resolve: vi.fn().mockReturnValue('/mock/path/axe.min.js'),
  };
});

// vi.mock() is also hoisted, but vi.hoisted runs first
vi.mock('fs', () => ({
  readFileSync: mocks.readFileSync,
}));

vi.mock('path', () => ({
  resolve: mocks.resolve,
}));

// Now this import won't trigger real fs.readFileSync
import { scanUrl } from '../scanner/engine';
```

### 2.3 Mocking Playwright (chromium.launch, Page, Browser)

The `engine.ts` module uses `chromium` from `playwright`:

```ts
import { vi, describe, it, expect } from 'vitest';

const mocks = vi.hoisted(() => {
  const mockPage = {
    goto: vi.fn().mockResolvedValue(undefined),
    evaluate: vi.fn().mockResolvedValue({ violations: [], passes: [], incomplete: [], inapplicable: [] }),
    waitForLoadState: vi.fn().mockResolvedValue(undefined),
    close: vi.fn(),
  };
  const mockContext = {
    newPage: vi.fn().mockResolvedValue(mockPage),
    close: vi.fn(),
  };
  const mockBrowser = {
    newContext: vi.fn().mockResolvedValue(mockContext),
    close: vi.fn(),
  };
  return {
    mockPage,
    mockContext,
    mockBrowser,
    chromium: {
      launch: vi.fn().mockResolvedValue(mockBrowser),
    },
  };
});

vi.mock('playwright', () => ({
  chromium: mocks.chromium,
}));
```

### 2.4 Mocking Puppeteer (PDF Generation)

The `pdf-generator.ts` module uses `puppeteer`:

```ts
const mocks = vi.hoisted(() => {
  const mockPage = {
    setContent: vi.fn().mockResolvedValue(undefined),
    pdf: vi.fn().mockResolvedValue(Buffer.from('mock-pdf')),
  };
  const mockBrowser = {
    newPage: vi.fn().mockResolvedValue(mockPage),
    close: vi.fn().mockResolvedValue(undefined),
  };
  return {
    mockPage,
    mockBrowser,
    launch: vi.fn().mockResolvedValue(mockBrowser),
  };
});

vi.mock('puppeteer', () => ({
  default: {
    launch: mocks.launch,
  },
}));
```

**Note:** Puppeteer uses `export default` so the mock must include a `default` key.

### 2.5 Mocking Crawlee's PlaywrightCrawler

```ts
const mocks = vi.hoisted(() => {
  const mockCrawler = {
    run: vi.fn().mockResolvedValue(undefined),
    addRequests: vi.fn().mockResolvedValue(undefined),
  };
  return {
    PlaywrightCrawler: vi.fn(() => mockCrawler),
    Configuration: {
      getGlobalConfig: vi.fn().mockReturnValue({}),
    },
    mockCrawler,
  };
});

vi.mock('crawlee', () => ({
  PlaywrightCrawler: mocks.PlaywrightCrawler,
  Configuration: mocks.Configuration,
}));
```

### 2.6 Mocking Node.js Built-ins (fs, fetch)

**Mocking `fs`:**

```ts
vi.mock('fs', () => ({
  readFileSync: vi.fn().mockReturnValue('{}'),
  existsSync: vi.fn().mockReturnValue(false),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));
```

**Mocking global `fetch`:**

```ts
// Use vi.stubGlobal for fetch
const mockFetch = vi.fn().mockResolvedValue({
  ok: true,
  text: vi.fn().mockResolvedValue('User-agent: *\nAllow: /'),
  json: vi.fn().mockResolvedValue({}),
});

vi.stubGlobal('fetch', mockFetch);
```

### 2.7 Mocking `process.exit`, `process.stderr.write`, `process.stdout.write`

**Critical for CLI module tests.** CLI commands call `process.exit()` and write to stderr/stdout.

```ts
const mockExit = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);
const mockStderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
const mockStdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
```

**Alternative using `vi.stubGlobal`:**

```ts
vi.stubGlobal('process', {
  ...process,
  exit: vi.fn(),
  stderr: { write: vi.fn() },
  stdout: { write: vi.fn() },
  cwd: vi.fn().mockReturnValue('/mock/cwd'),
});
```

**Warning:** Be careful with `process` mocking. Using `vi.spyOn` on individual methods is safer than replacing the entire `process` object.

### 2.8 Mocking robots-parser, sitemapper, uuid

**robots-parser (default export is a function):**

```ts
vi.mock('robots-parser', () => ({
  default: vi.fn(() => ({
    isAllowed: vi.fn().mockReturnValue(true),
    getCrawlDelay: vi.fn().mockReturnValue(null),
    getSitemaps: vi.fn().mockReturnValue([]),
  })),
}));
```

**sitemapper (class with default export):**

```ts
vi.mock('sitemapper', () => ({
  default: vi.fn().mockImplementation(() => ({
    fetch: vi.fn().mockResolvedValue({ sites: [] }),
  })),
}));
```

**uuid:**

```ts
vi.mock('uuid', () => ({
  v4: vi.fn().mockReturnValue('test-uuid-1234'),
}));
```

### 2.9 Handling Module-Level Side Effects

**Problem:** `store.ts` has `setInterval(cleanupExpired, CLEANUP_INTERVAL_MS)` at module scope. This fires when the module is first imported during tests.

**Solution: Use `vi.useFakeTimers()` BEFORE importing the module.**

```ts
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});
```

For the store module specifically, since the `setInterval` runs at import time, ensure fake timers are active in a setup file or use `vi.hoisted`:

```ts
vi.hoisted(() => {
  vi.useFakeTimers();
});
```

**Problem:** `engine.ts` reads `axe-core` with `fs.readFileSync` at module scope.

**Solution:** Mock `fs` and `path` with `vi.mock()` (already hoisted) before the import executes.

### 2.10 Mocking commander for CLI Tests

The CLI modules create `Command` instances. For unit testing CLI commands, mock the action handler's dependencies rather than commander itself:

```ts
// Test the command's action by invoking it directly, or by parsing args:
import { scanCommand } from '../commands/scan';

// Mock all dependencies the command action uses
vi.mock('../../lib/scanner/engine', () => ({
  scanUrl: vi.fn(),
}));

it('should scan URL and output JSON', async () => {
  // Invoke the command programmatically
  await scanCommand.parseAsync(['node', 'test', '--url', 'https://example.com']);
});
```

---

## 3. Test Organization

### Recommended File Structure

```text
src/
  lib/
    scanner/
      __tests__/
        engine.test.ts
        store.test.ts
        result-parser.test.ts
      engine.ts
      store.ts
      result-parser.ts
    crawler/
      __tests__/
        site-crawler.test.ts
        robots.test.ts
        sitemap.test.ts
        url-utils.test.ts
      ...
    scoring/
      __tests__/
        calculator.test.ts
        wcag-mapper.test.ts
        site-calculator.test.ts
      ...
    ci/
      __tests__/
        threshold.test.ts
        formatters/
          json.test.ts
          sarif.test.ts
          junit.test.ts
      ...
    report/
      __tests__/
        pdf-generator.test.ts
        generator.test.ts
        sarif-generator.test.ts
        site-generator.test.ts
      ...
  cli/
    __tests__/
      scan.test.ts
      crawl.test.ts
      loader.test.ts
```

**Convention:** Use `__tests__/` directory within each module folder. This:

- Keeps tests close to source
- Makes the test structure mirror the source structure
- Prevents test files from appearing in production builds
- Pattern: `src/**/__tests__/*.test.ts`

### Test Naming Conventions

```ts
describe('module-name', () => {
  describe('functionName', () => {
    it('should do something when given valid input', () => {});
    it('should throw when input is invalid', () => {});
    it('should return default when optional param is missing', () => {});
  });
});
```

### Setup/Teardown Patterns

```ts
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('scanner/engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // tests...
});
```

With `restoreMocks: true` in config, `afterEach` restore is automatic.

---

## 4. Coverage Configuration

### Recommended Coverage Config

```ts
coverage: {
  provider: 'v8',
  include: ['src/lib/**/*.ts', 'src/cli/**/*.ts'],
  exclude: [
    'src/**/*.test.ts',
    'src/**/*.test.tsx',
    'src/**/__tests__/**',
    'src/lib/types/**',
    'src/lib/report/templates/**',
    'src/app/**',
    'src/components/**',
  ],
  reporter: ['text', 'lcov', 'json-summary'],
  thresholds: {
    statements: 80,
    branches: 75,
    functions: 80,
    lines: 80,
  },
},
```

### Coverage Reporters

| Reporter | Purpose |
|---|---|
| `text` | Terminal output during development |
| `lcov` | CI integration (Codecov, Coveralls, Azure DevOps) |
| `json-summary` | Machine-readable summary for CI gates |

### Excluding from Coverage

- **Types files** (`src/lib/types/**`): Only type definitions, no runtime code
- **Templates** (`src/lib/report/templates/**`): HTML template strings, not testable logic
- **App router pages** (`src/app/**`): Next.js pages with React components (separate testing strategy)
- **React components** (`src/components/**`): Would need jsdom/React testing setup

---

## 5. package.json Script Additions

### Recommended Scripts

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build --turbopack",
    "start": "next start",
    "lint": "eslint",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:ci": "vitest run --coverage --reporter=default --reporter=junit --outputFile.junit=test-results.xml"
  }
}
```

| Script | Purpose |
|---|---|
| `test` | Single run, exits after completion |
| `test:watch` | Watch mode for development (default `vitest` behavior) |
| `test:coverage` | Single run with coverage report |
| `test:ci` | CI-optimized: coverage + JUnit XML output for Azure DevOps |

---

## 6. Known Issues and Pitfalls

### 6.1 Vitest + Next.js Compatibility

- **No `next/jest` equivalent needed.** Vitest does not need a Next.js plugin. Unlike Jest which requires `next/jest` for SWC transforms, Vitest uses Vite's own transform pipeline.
- **serverExternalPackages in `next.config.ts`** only affects Next.js server runtime. Vitest has its own module resolution; `serverExternalPackages` does NOT apply to tests.
- **`next.config.ts` is ignored by Vitest.** The separate `vitest.config.ts` is required and does not inherit anything from `next.config.ts`.

### 6.2 ESM Gotchas

- **`vi.mock()` is hoisted** — it runs before all imports. You cannot use variables from outside its scope unless declared with `vi.hoisted()`.
- **Default exports:** When mocking a module with a default export, include the `default` key in the factory return:

  ```ts
  vi.mock('puppeteer', () => ({
    default: { launch: vi.fn() },
  }));
  ```

- **Named vs default imports:** If source code does `import puppeteer from 'puppeteer'`, mock must provide `default`. If source does `import { chromium } from 'playwright'`, mock provides named export.
- **Internal function calls cannot be mocked.** If function A calls function B within the same module file, mocking B will NOT affect A's internal call to B. This is an ES module design constraint.

### 6.3 Module Isolation for Side Effects

**`store.ts`** has `setInterval(cleanupExpired, CLEANUP_INTERVAL_MS)` at the module level. This creates a persistent timer that:

1. Runs during tests causing unexpected behavior
2. May prevent Node.js from exiting cleanly

**Solutions (choose one):**

- **Fake timers in setup file:** Create a setup file that enables fake timers before any test module loads.
- **`vi.useFakeTimers()` in `beforeEach`:** Works if you don't need the timer to actually fire.
- **`vi.hoisted(() => vi.useFakeTimers())`:** Ensures timers are faked before module evaluation.

### 6.4 Timer Mocking for `setInterval` in store.ts

```ts
// In store.test.ts
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

// Import after fake timers are set up via dynamic import if needed:
// const store = await import('../store');
```

If you use static imports, the `setInterval` will have already fired with real timers (since import happens before `beforeEach`). Use `vi.hoisted()` or a setup file to ensure fake timers are active first.

### 6.5 `process.exit()` in CLI Tests

`process.exit()` terminates the Node.js process. In tests, you MUST mock it:

```ts
const mockExit = vi.spyOn(process, 'exit').mockImplementation((() => {
  throw new Error('process.exit called');
}) as never);
```

**Pattern:** Make `process.exit` throw so test execution halts (mimicking real exit) without killing the test runner. Then assert with `toThrow`.

Or mock to no-op and check the mock was called:

```ts
const mockExit = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);
// ... run code ...
expect(mockExit).toHaveBeenCalledWith(2); // exit code 2
```

### 6.6 `fs.readFileSync` at Module Load in engine.ts

`engine.ts` line 6-9:

```ts
const axeSource = fs.readFileSync(
  path.resolve(process.cwd(), 'node_modules', 'axe-core', 'axe.min.js'),
  'utf-8'
);
```

This runs at import time. If `fs` is not mocked before import, tests will either:

1. Fail with "file not found" if `axe-core` isn't installed
2. Read the real 500KB+ axe-core file unnecessarily

**Solution:** Always mock `fs` via `vi.mock('fs', ...)` (hoisted) before importing `engine.ts`.

### 6.7 `vi.mock` Path Resolution

- Use relative paths in `vi.mock()`, NOT `@/` aliases.
- The path is relative to the test file location.
- For npm packages, just use the package name: `vi.mock('playwright')`.

### 6.8 AbortController in Crawl Tests

`site-crawler.ts` uses `AbortController` for cancellation. This is a global in Node.js 16+ and doesn't need mocking, but the signal handling should be tested.

---

## 7. Module-by-Module Mocking Requirements Summary

| Module | Dependencies to Mock | Side Effects |
|---|---|---|
| `scanner/engine.ts` | `playwright`, `fs`, `path` | `fs.readFileSync` at import |
| `scanner/store.ts` | None | `setInterval` at import |
| `scanner/result-parser.ts` | None (pure logic) | None |
| `scoring/calculator.ts` | None (pure logic) | None |
| `scoring/wcag-mapper.ts` | None (pure logic) | None |
| `scoring/site-calculator.ts` | None (pure logic) | None |
| `ci/threshold.ts` | None (pure logic) | None |
| `ci/formatters/*.ts` | None (pure logic) | None |
| `crawler/site-crawler.ts` | `crawlee`, `uuid`, store, engine | None |
| `crawler/robots.ts` | `robots-parser`, `fetch` | None |
| `crawler/sitemap.ts` | `sitemapper` | None |
| `crawler/url-utils.ts` | None (pure logic) | None |
| `report/pdf-generator.ts` | `puppeteer` | None |
| `report/generator.ts` | Likely templates, data | None |
| `report/sarif-generator.ts` | None (pure logic) | None |
| `cli/commands/scan.ts` | `commander`, engine, parsers, `fs`, `process` | `process.exit` |
| `cli/commands/crawl.ts` | `commander`, crawler, store, `uuid`, `fs`, `process` | `process.exit` |
| `cli/config/loader.ts` | `fs`, `path` | None |

### Pure Logic Modules (No Mocking Needed)

These can be tested directly as unit tests without any mocking:

- `scoring/calculator.ts`
- `scoring/wcag-mapper.ts`
- `scoring/site-calculator.ts`
- `ci/threshold.ts`
- `ci/formatters/json.ts`
- `ci/formatters/sarif.ts`
- `ci/formatters/junit.ts`
- `crawler/url-utils.ts`
- `scanner/result-parser.ts`

---

## 8. Complete Recommended `vitest.config.ts`

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
    coverage: {
      provider: 'v8',
      include: ['src/lib/**/*.ts', 'src/cli/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/__tests__/**',
        'src/lib/types/**',
        'src/lib/report/templates/**',
        'src/app/**',
        'src/components/**',
      ],
      reporter: ['text', 'lcov', 'json-summary'],
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

---

## 9. References and Evidence

- [Vitest Getting Started](https://vitest.dev/guide/) — Config basics, `defineConfig`, file patterns
- [Vitest Config Reference](https://vitest.dev/config/) — All config options including `coverage`, `alias`, `environment`
- [Vitest Mocking Guide](https://vitest.dev/guide/mocking) — Cheat sheet for common mocking patterns
- [Vitest Mocking Modules](https://vitest.dev/guide/mocking/modules) — `vi.mock()`, `vi.doMock()`, partial mocking, pitfalls
- [Vitest Mocking Timers](https://vitest.dev/guide/mocking/timers) — `vi.useFakeTimers()`, `advanceTimersByTime`, `setInterval` mocking
- [Vitest vi API](https://vitest.dev/api/vi#vi-hoisted) — `vi.hoisted()`, `vi.mock()`, `vi.fn()`, `vi.spyOn()`
- [Vitest Coverage](https://vitest.dev/guide/coverage) — v8 vs istanbul, reporters, thresholds, exclusions
- Source code analysis: `package.json`, `tsconfig.json`, `next.config.ts`, all source files in `src/lib/` and `src/cli/`

---

## 10. Discovered Research Topics (Completed)

- [x] How `vi.mock()` hoisting works with ESM static imports
- [x] `vi.hoisted()` for pre-import side effect handling
- [x] Default export mocking pattern (puppeteer, robots-parser, sitemapper)
- [x] Named export mocking pattern (playwright, crawlee, uuid)
- [x] `process.exit` mocking strategies for CLI testing
- [x] `setInterval` at module scope handling
- [x] `fs.readFileSync` at module scope handling
- [x] Path alias resolution differences between tsconfig and vitest
- [x] Coverage v8 vs istanbul trade-offs
- [x] Module isolation for stateful modules (store.ts Maps)

---

## 11. Clarifying Questions

No blocking questions remain. All research topics are fully resolved through documentation and source code analysis.

---

## 12. Next Steps (Not Completed During This Session)

- [ ] Create `vitest.config.ts` in project root
- [ ] Add `vitest` and `@vitest/coverage-v8` to `devDependencies`
- [ ] Add test scripts to `package.json`
- [ ] Create first test files for pure logic modules (no mocking needed)
- [ ] Create test files for modules requiring mocking
- [ ] Run initial test suite and verify configuration
- [ ] Integrate coverage reporting with CI pipeline
