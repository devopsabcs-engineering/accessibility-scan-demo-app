# Source File Verification Research

Status: **Complete**

---

## 1. `src/lib/report/templates/report-template.ts`

- **Total lines:** 138
- **Imports:** L1 (`import type { ReportData }`)
- **Constants:** L3–8 (`impactColors` record)
- **Helper functions:**
  - `gradeColor(grade: string): string` — L10–18
  - `escapeHtml(str: string): string` — L21–27
- **Main function:** `generateReportHtml(data: ReportData): string` — L29 (export)
  - Violation rows construction: L30–44
  - HTML template return: L46–138

### Section start lines within the HTML template

| Section | Line |
|---|---|
| Executive Summary (`<h2>`) | L81 |
| WCAG Principles (POUR) (`<h2>`) | L96 |
| Impact Breakdown (`<h2>`) | L111 |
| Detailed Violations (`<h2>`) | L125 |
| AODA Compliance Note (`<h2>`) | L131 |
| Disclaimer (`<h2>`) | L136 |

---

## 2. `src/lib/report/templates/site-report-template.ts`

- **Total lines:** 200
- **Imports:** L1 (`import type { SiteReportData }`)
- **Constants:** L3–8 (`impactColors` record)
- **Helper functions:**
  - `gradeColor(grade: string): string` — L10–18
  - `escapeHtml(str: string): string` — L21–27
- **Main function:** `generateSiteReportHtml(data: SiteReportData): string` — L29 (export)
  - Top violations construction: L32–36
  - Top violation rows: L38–52
  - Page rows: L54–65
  - HTML template return: L67–200

### Section start lines within the HTML template

| Section | Line |
|---|---|
| Executive Summary (`<h2>`) | L100 |
| WCAG Principles (POUR) (`<h2>`) | L123 |
| Impact Breakdown (`<h2>`) | L138 |
| Top N Violations (`<h2>`) | L155 |
| Per-Page Scores (`<h2>`) | L165 |
| AODA Compliance Note (`<h2>`) | L175 |
| Disclaimer (`<h2>`) | L180 |

---

## 3. `src/lib/report/generator.ts`

- **Total lines:** 30
- **Imports:** L1–2 (`ScanResults` from types/scan, `ReportData` from types/report)
- **Function:** `assembleReportData(results: ScanResults): ReportData` — L4 (export)
  - Sorts violations by impact severity (critical → serious → moderate → minor): L5–8
  - Returns `ReportData` object: L10–30

### `ReportData` fields populated by `assembleReportData()`

| Field | Source |
|---|---|
| `url` | `results.url` |
| `scanDate` | `new Date(results.timestamp).toLocaleString()` |
| `engineVersion` | `results.engineVersion` |
| `score` | `results.score` (passed through directly) |
| `violations` | `results.violations` (sorted copy) |
| `passes` | `results.passes` (passed through directly) |
| `incomplete` | `results.incomplete` (passed through directly) |
| `aodaNote` | Hardcoded AODA compliance string |
| `disclaimer` | Hardcoded disclaimer string |

---

## 4. `src/lib/types/scan.ts`

- **Total lines:** 75 (plus re-export line)

### `AxeViolation` interface (L36–45)

| Field | Type |
|---|---|
| `id` | `string` |
| `impact` | `'minor' \| 'moderate' \| 'serious' \| 'critical'` |
| `tags` | `string[]` |
| `description` | `string` |
| `help` | `string` |
| `helpUrl` | `string` |
| `nodes` | `AxeNode[]` |
| `principle?` | `string` (optional) |

### `AxeNode` interface (L47–52)

| Field | Type |
|---|---|
| `html` | `string` |
| `target` | `string[]` |
| `impact` | `string` |
| `failureSummary?` | `string` (optional) |

### `ReportData` interface (from `src/lib/types/report.ts`)

| Field | Type |
|---|---|
| `url` | `string` |
| `scanDate` | `string` |
| `engineVersion` | `string` |
| `score` | `ScoreResult` |
| `violations` | `AxeViolation[]` |
| `passes` | `AxePass[]` |
| `incomplete` | `AxeIncomplete[]` |
| `aodaNote` | `string` |
| `disclaimer` | `string` |

---

## 5. Test File Existence

| File | Exists? |
|---|---|
| `src/lib/report/__tests__/report-template.test.ts` | **No** — does not exist |
| `src/lib/report/__tests__/site-report-template.test.ts` | **No** — does not exist |

### Existing test files in `src/lib/report/__tests__/`

- `generator.test.ts`
- `pdf-generator.test.ts`
- `sarif-generator.test.ts`
- `site-generator.test.ts`

---

## 6. CI Workflow (`ci.yml`)

- **Test command:** `npm run test:ci`
- **Resolved script:** `vitest run --coverage`
- **Test reporter:** `dorny/test-reporter@v2` with `java-junit` reporter format
- **JUnit output:** `test-results/junit.xml`

---

## 7. Vitest Configuration (`vitest.config.ts`)

- **Test include pattern:** `src/**/__tests__/**/*.test.ts`
- **Excluded:** `node_modules`, `.next`, `dist`, `out`
- **Environment:** `node`
- **Timeout:** 10000ms
- **Coverage provider:** `v8`
- **Coverage includes:** `src/lib/**/*.ts`, `src/cli/**/*.ts`
- **Mock behavior:** `restoreMocks: true`, `clearMocks: true`

---

## Key Observations

1. **Both template files share duplicated helper functions** (`gradeColor`, `escapeHtml`, `impactColors`). These could be factored into a shared module in a future refactor.
2. **`report-template.ts` renders individual violation rows** using `v.help`, `v.id`, `v.impact`, `v.nodes.length`, and `v.principle`. It does NOT currently render `v.description`, `v.helpUrl`, `v.tags`, or any `AxeNode` detail fields (`html`, `target`, `failureSummary`).
3. **`site-report-template.ts` renders aggregated violations** using `v.help`, `v.ruleId`, `v.impact`, `v.totalInstances`, `v.affectedPages.length`, and `v.principle`. Uses `SiteReportData` type from `types/crawl.ts`.
4. **New test files** for `report-template.test.ts` and `site-report-template.test.ts` would follow the vitest pattern `src/**/__tests__/**/*.test.ts` and be automatically discovered.
5. **`assembleReportData()`** passes `AxeViolation[]` including all fields (`tags`, `description`, `helpUrl`, `nodes` with full `AxeNode` data), but the current template only uses a subset of those fields.

---

## Clarifying Questions

None — all research questions are fully answered.
