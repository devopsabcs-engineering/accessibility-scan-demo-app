# UI Pages, Components & Report Templates Research

## Status: Complete

## Research Topics

1. App Pages to Self-Scan (home, layout, globals.css, scan results, crawl results)
2. UI Components (all 8 components in `src/components/`)
3. Report Templates and generation
4. API Routes for scan/crawl
5. Next.js configuration and Docker setup

---

## 1. App Pages to Self-Scan

### 1.1 Root Layout (`src/app/layout.tsx`, L1-38)

- Sets `<html lang="en">` — good for language identification.
- Loads Geist and Geist_Mono Google Fonts via CSS variables.
- **Skip link** present (L32-34): `<a href="#main-content" className="sr-only focus:not-sr-only ...">Skip to main content</a>` — excellent accessibility practice.
- Main content wrapped in `<main id="main-content">`.
- Uses `antialiased` Tailwind utility on body.
- Metadata: title = "AODA WCAG 2.2 Accessibility Scanner", description provided.

**Accessibility Observations:**

- **Good**: Skip-to-content link, `lang="en"`, semantic `<main>` element.
- **Potential Issue**: No `<nav>` or `<header>` landmark outside `<main>` — entire app lives inside `<main>`.

### 1.2 Home Page (`src/app/page.tsx`, L1-46)

- Single component: uses `ScanForm`.
- Structure: Hero section with `<h1>` and description, the ScanForm component, a 3-column "How It Works" section, and a footer paragraph.
- The "How It Works" section uses numbered divs (1, 2, 3) with `<h2>` headings.

**Components Used:** `ScanForm`

**Accessibility Observations:**

- **Good**: Proper heading hierarchy (`h1` then `h2`s).
- **Potential Issue**: Step numbers (1, 2, 3) are plain `<div className="text-2xl">` — they're decorative numbers, not ordered list items. A screen reader won't understand the step sequence. Should use `<ol>` / `<li>`.
- **Potential Issue**: `text-gray-500` on description text (L26-28) — may have insufficient contrast against white/dark backgrounds depending on the exact Tailwind color values.
- **Potential Issue**: Footer text uses `text-gray-400` (L42) — very low contrast, may fail WCAG 1.4.3 (4.5:1 ratio).

### 1.3 Global CSS (`src/app/globals.css`, L1-33)

- Imports Tailwind CSS.
- Defines CSS custom properties: `--background`, `--foreground`, and score colors.
- Dark mode via `prefers-color-scheme: dark` media query.
- Body font: `Arial, Helvetica, sans-serif`.

**Accessibility Observations:**

- **Good**: Respects user's dark mode preference.
- **Good**: System font stack is readable.
- **Potential Issue**: Score color variables ( `--score-excellent: #22c55e`, `--score-needs-work: #eab308`, etc.) — color alone is used to convey meaning. Should be supplemented with text/icon.

### 1.4 Scan Result Page (`src/app/scan/[id]/page.tsx`, L1-75)

- Client component (`'use client'`).
- Three states: `scanning`, `results`, `error`.
- Uses `ScanProgress` during scanning state.
- Uses `ReportView` for results state.
- Error state shows error message and "Try Again" link back to `/`.

**Components Used:** `ScanProgress`, `ReportView`, `Link`

**Accessibility Observations:**

- **Good**: Error message has styled heading.
- **Potential Issue**: Error heading uses `text-red-600` — relies on color alone to signal error; no icon or `role="alert"`.
- **Potential Issue**: The component returns `null` when state doesn't match any case (L74) — could be confusing for users.

### 1.5 Crawl Result Page (`src/app/crawl/[id]/page.tsx`, L1-210+)

- Client component, three states: `crawling`, `results`, `error`.
- During crawling: shows `CrawlProgress` + Cancel button.
- Results view: shows header, PDF download link, `SiteScoreDisplay`, `PageList`, `ViolationList`.
- Has a `useEffect` to check if crawl is already complete on load.
- Converts `aggregatedViolations` to `AxeViolation[]` format for `ViolationList`.

**Components Used:** `CrawlProgress`, `SiteScoreDisplay`, `PageList`, `ViolationList`, `Link`

**Accessibility Observations:**

- **Good**: Uses `aria-labelledby` on sections with corresponding heading IDs.
- **Good**: Screen-reader-only headings (`sr-only`) for Page Results and Aggregated Violations sections.
- **Good**: Cancel button has `focus:ring-2` and `disabled:opacity-50` styles.
- **Potential Issue**: Error heading uses `text-red-600` without `role="alert"`.
- **Potential Issue**: The `<a href={crawlData.seedUrl}>` link opens in new tab — no warning to screen reader users that link opens externally (only has `rel="noopener noreferrer"`).

---

## 2. UI Components Analysis

### 2.1 ScanForm (`src/components/ScanForm.tsx`, L1-168)

**Purpose:** Form for URL input, mode selection (single/crawl), and crawl configuration.

**Accessibility Features (Good):**

- `role="radiogroup"` with `aria-label="Scan mode"` (L86).
- `<label htmlFor="scan-url">` properly associated (L104-106).
- Help text with `id="scan-url-help"` connected via `aria-describedby="scan-url-help"` (L108, L115).
- `<input type="url" required>` — native validation.
- Error displayed with `role="alert"` (L161).
- `focus:ring-2` on interactive elements.
- `disabled:opacity-50 disabled:cursor-not-allowed` on submit button.
- Labels on `max-pages` and `max-depth` inputs.

**Potential Issues:**

- Radio button styling uses `accent-blue-600` — no custom focus indicator on the radio itself.
- When loading state is true, button text changes to "Starting..." but there's no `aria-busy` attribute on the form.
- Crawl config inputs (max-pages, max-depth) don't have `aria-describedby` text to explain valid ranges.

### 2.2 ScanProgress (`src/components/ScanProgress.tsx`, L1-72)

**Purpose:** Shows scan progress with a progress bar and stage indicators.

**Accessibility Features (Good):**

- `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-label` (L50-55).
- `aria-live="polite"` on status text (L62) — screen readers will announce changes.
- Stage indicators change style based on current status.

**Potential Issues:**

- Stage indicators (Pending, Navigating, Scanning, Scoring, Complete) are plain `<span>` elements — no `role` or `aria-current` to indicate active stage.
- No timeout handling or "stuck" indicator for the user.

### 2.3 CrawlProgress (`src/components/CrawlProgress.tsx`, L1-145)

**Purpose:** Shows crawl progress with page counts, current page, and recently completed pages.

**Accessibility Features (Good):**

- `role="progressbar"` with full ARIA attributes (L75-80).
- `aria-live="polite"` on status text (L89).
- Stage indicators styled differently for active stage.
- Recently completed pages listed with grade and score.

**Potential Issues:**

- Stage indicators lack `aria-current="step"` attributes.
- Recent pages list uses grade letter with color only (e.g., `gradeColors[page.grade]`) — color is the primary differentiator.
- No `aria-label` on the `<ul>` for recently completed pages.
- `truncate` class on current page URL — may cut off important info without tooltip.

### 2.4 ReportView (`src/components/ReportView.tsx`, L1-138)

**Purpose:** Displays full single-page scan results with scores, issue summary, violations, passes, incomplete items, and AODA note.

**Accessibility Features (Good):**

- `aria-labelledby` on each section with corresponding heading IDs.
- Proper heading hierarchy: `<h1>` → `<h2>` sections.
- Table has `<thead>` and `<th>` for the issue summary.
- `sr-only` heading for violations section.
- `<details>/<summary>` for collapsible passes and incomplete sections — natively keyboard accessible.
- External links have `rel="noopener noreferrer"`.
- AODA compliance note in its own labeled section.
- Disclaimer in `<footer>`.

**Potential Issues:**

- Issue summary `<th>` elements lack `scope="col"` attribute (L67-71) — table headers not explicitly scoped.
- Pass checkmarks use `✓` character and `✕` — these are visual only, not announced meaningfully by screen readers. Need `aria-label` or `<span role="img" aria-label="...">`.
- `?` character for incomplete items (L127) — same issue.
- `text-red-600` / `text-green-600` in table cells — color alone conveys pass/fail meaning.
- The "Learn more" links in the incomplete section have `text-xs` — very small click target.

### 2.5 ScoreDisplay (`src/components/ScoreDisplay.tsx`, L1-105)

**Purpose:** Circular SVG score gauge, AODA badge, stats grid, POUR principle bars, impact breakdown.

**Accessibility Features (Good):**

- SVG has `aria-label` with full description: "Accessibility score: X out of 100, grade Y" (L33).
- Clear text labels alongside visual elements.

**Potential Issues:**

- AODA badge uses `✓` and `✕` characters — not announced meaningfully (L56-57).
- Stats grid (Violations, Passed, Needs Review) relies on color alone (red, green, yellow) to differentiate.
- POUR principle progress bars lack individual `role="progressbar"` or `aria-label` — they're decorative `<div>` elements.
- Impact breakdown badges use color alone (red, orange, yellow, blue backgrounds) to communicate severity.

### 2.6 SiteScoreDisplay (`src/components/SiteScoreDisplay.tsx`, L1-125)

**Purpose:** Site-wide score gauge, similar to ScoreDisplay but with site-level metrics.

**Accessibility Features (Good):**

- SVG has `aria-label`: "Site accessibility score: X out of 100, grade Y" (L37).
- Text labels for Lowest, Median, Highest scores.

**Potential Issues:**

- Same issues as ScoreDisplay: `✓`/`✕` characters, color-only differentiation, no `role="progressbar"` on POUR bars.
- Score range section (Lowest, Median, Highest) uses `text-red-500`, `text-yellow-500`, `text-green-500` — color alone.

### 2.7 ViolationList (`src/components/ViolationList.tsx`, L1-113)

**Purpose:** Grouped violation display by WCAG principle, with expandable details per violation.

**Accessibility Features (Good):**

- Uses `<details>/<summary>` for collapsible groups and individual violations — natively keyboard accessible.
- External "Learn more" links with `rel="noopener noreferrer"`.
- Hover states on summaries.
- `<code>` elements for HTML snippets.

**Potential Issues:**

- Nested `<details>` inside `<details>` — while valid HTML, can be confusing for screen reader navigation.
- Impact badges are `<span>` elements with color backgrounds only — no text prefix like "Impact: critical".
- Node count text "X element(s) affected" is part of inline text — works but could be more structured.
- `code` blocks use `break-all` which can make long text hard to read.
- "...and N more elements" message uses `text-gray-500` with `font-style:italic` — low contrast.

### 2.8 PageList (`src/components/PageList.tsx`, L1-77)

**Purpose:** Table of per-page crawl results sorted by score.

**Accessibility Features (Good):**

- `<th scope="col">` on all table headers (L33-38) — properly scoped.
- Table has `<thead>/<tbody>` structure.
- Empty state message when no pages.

**Potential Issues:**

- URLs are truncated with `truncate` class — important information cut off without accessible alternative (only `title` attribute, L48).
- Grade column uses color only (`gradeColors[page.grade]`) to differentiate grades — should be supplemented since grade letter is there but color adds extra emphasis.
- Status badges use color-coded backgrounds — green/red/gray for complete/error/other. The text label ("complete", "error") is present, so this is acceptable.
- No row-level links — users can't click through to individual page reports from the table.

---

## 3. Report Templates

### 3.1 Report Template (`src/lib/report/templates/report-template.ts`, L1-218)

**Purpose:** Generates a complete HTML document for single-page scan reports.

**Structure:** Full HTML document with inline CSS styles. Contains:

- Executive Summary with score circle, AODA badge, violation/pass/incomplete counts.
- WCAG Principles (POUR) section with progress bars.
- Category Breakdown table (ARIA, Color & Contrast, Forms, etc.).
- Impact Breakdown table (critical, serious, moderate, minor).
- Detailed Violations section with capped node display (max 5 per violation).
- AODA Compliance Note.
- Disclaimer.

**Key Function:** `generateReportHtml(data: ReportData): string`

**HTML Features:**

- `<html lang="en">` — correct.
- Uses `escapeHtml()` for XSS prevention.
- Inline styles (no external CSS).
- `@media print` rule for print-friendly output.
- Score circle uses CSS border-radius, not SVG.

**Accessibility in Generated HTML:**

- **Issue**: No skip links in the generated HTML.
- **Issue**: Score circle with `.score-circle` is a `<div>` — not accessible for screen readers; no `aria-label`.
- **Issue**: AODA badge has no accessible label.
- **Issue**: Tables have `<th>` elements but no `scope="col"`.
- **Issue**: Code blocks use `<pre><code>` without `aria-label`.
- **Issue**: Impact colors on badges use `color:white` against colored backgrounds — need to verify contrast.
- **Issue**: Generated HTML has no landmark roles or semantic sections.

### 3.2 Site Report Template (`src/lib/report/templates/site-report-template.ts`, L1-260+)

**Purpose:** Generates HTML for site-wide (multi-page) crawl reports.

**Key Function:** `generateSiteReportHtml(data: SiteReportData): string`

**Structure:** Similar to single-page report but adds:

- Site-level metrics (page count, score range, unique violations, total instances).
- Top 10 violations section.
- Per-page scores table with URL, Score, Grade, Violations, Passes.
- Category breakdown based on aggregated violations.

**Accessibility in Generated HTML:**

- Same issues as single-page template.
- Per-page scores table includes `<th>` but no `scope`.
- URLs in table use `word-break:break-all` — long URLs may be hard to read.

### 3.3 Report Generator (`src/lib/report/generator.ts`, L1-28)

**Purpose:** Assembles `ReportData` from `ScanResults`. Sorts violations by impact severity.

**Key Function:** `assembleReportData(results: ScanResults): ReportData`

### 3.4 PDF Generator (`src/lib/report/pdf-generator.ts`, L1-24)

**Purpose:** Converts HTML report to PDF using Puppeteer.

**Key Function:** `generatePdf(reportHtml: string): Promise<Buffer>`

- Uses `puppeteer.launch({ headless: true, args: ['--no-sandbox'] })`.
- A4 format with 1.5cm margins.
- Includes header ("WCAG 2.2 Accessibility Report") and footer (page numbers).
- `printBackground: true` for colored elements.

**Important:** The HTML report is **only** used as an intermediate step for PDF generation — it is never served directly via an HTTP route.

### 3.5 Site Generator (`src/lib/report/site-generator.ts`, L1-44)

**Purpose:** Generates `SiteReportData` from a `CrawlRecord` by looking up page scan records.

**Key Function:** `generateSiteReport(crawl: CrawlRecord): SiteReportData`

---

## 4. API Routes

### 4.1 Scan API Routes

| Route | Method | Purpose | File |
|---|---|---|---|
| `/api/scan` | POST | Start a new single-page scan | `src/app/api/scan/route.ts` |
| `/api/scan/[id]` | GET | Get scan record/results | `src/app/api/scan/[id]/route.ts` |
| `/api/scan/[id]/status` | GET | SSE stream for scan progress | `src/app/api/scan/[id]/status/route.ts` |
| `/api/scan/[id]/pdf` | GET | Download PDF report | `src/app/api/scan/[id]/pdf/route.ts` |
| `/api/ci/scan` | POST | Synchronous CI scan (JSON/SARIF/JUnit) | `src/app/api/ci/scan/route.ts` |

**POST `/api/scan`:**

- Accepts `{ url: string }`.
- Validates URL: must be HTTP/HTTPS, max 2048 chars.
- **SSRF protection**: Blocks localhost, 127.0.0.1, ::1, 0.0.0.0, private IP ranges (10.x, 192.168.x, 172.16-31.x), .local, .internal.
- Returns `{ scanId }` with 202 status.
- Starts scan asynchronously (fire-and-forget).

**GET `/api/scan/[id]/status`:**

- Server-Sent Events (SSE) stream.
- Polls every 500ms for scan status.
- Returns `{ status, progress, message }`.
- Closes stream on `complete` or `error`.

**GET `/api/scan/[id]/pdf`:**

- Calls `assembleReportData()` → `generateReportHtml()` → `generatePdf()`.
- Returns PDF with `Content-Disposition: attachment`.

**POST `/api/ci/scan`:**

- Synchronous scan (blocks until complete).
- Supports output formats: `json`, `sarif`, `junit`.
- Includes threshold evaluation (pass/fail based on score/violation counts).
- Returns `CiResult` with score, grade, violations, threshold evaluation.

### 4.2 Crawl API Routes

| Route | Method | Purpose | File |
|---|---|---|---|
| `/api/crawl` | POST | Start site crawl | `src/app/api/crawl/route.ts` |
| `/api/crawl/[id]` | GET | Get crawl record | `src/app/api/crawl/[id]/route.ts` |
| `/api/crawl/[id]/status` | GET | SSE stream for crawl progress | `src/app/api/crawl/[id]/status/route.ts` |
| `/api/crawl/[id]/pages` | GET | Get all page summaries | `src/app/api/crawl/[id]/pages/route.ts` |
| `/api/crawl/[id]/pages/[pageId]` | GET | Get single page result | `src/app/api/crawl/[id]/pages/[pageId]/route.ts` |
| `/api/crawl/[id]/pages/[pageId]/pdf` | GET | Download per-page PDF | `src/app/api/crawl/[id]/pages/[pageId]/pdf/route.ts` |
| `/api/crawl/[id]/pdf` | GET | Download site-wide PDF | `src/app/api/crawl/[id]/pdf/route.ts` |
| `/api/crawl/[id]/report` | GET | Get full site report JSON | `src/app/api/crawl/[id]/report/route.ts` |
| `/api/crawl/[id]/cancel` | POST | Cancel running crawl | `src/app/api/crawl/[id]/cancel/route.ts` |
| `/api/ci/crawl` | POST | Synchronous CI crawl (JSON/SARIF/JUnit) | `src/app/api/ci/crawl/route.ts` |

**POST `/api/crawl`:**

- Accepts `{ url, maxPages?, maxDepth?, concurrency?, delayMs?, ... }`.
- Same SSRF protection as scan.
- Validates config: maxPages 1-200, maxDepth 1-10, concurrency 1-5.
- Returns `{ crawlId }` with 202 status.

**GET `/api/crawl/[id]/status`:**

- SSE stream, polls every 500ms.
- Returns: `{ status, progress, message, totalPages, completedPages, failedPages, currentPage, pagesCompleted[] }`.

**POST `/api/ci/crawl`:**

- Synchronous with 30-minute timeout.
- Same output formats as CI scan.

### 4.3 Key API Observations for Self-Scanning

1. **SSRF blocks localhost** — The `isValidScanUrl()` function blocks `localhost`, `127.0.0.1`, private IPs, etc. **Self-scanning would require either:**
   - Temporarily disabling the SSRF check, or
   - Adding an explicit allowlist for the app's own URL, or
   - Using a public-facing URL (e.g., deployed instance), or
   - Creating a dedicated self-scan route that bypasses SSRF checks for internal use.

2. **No HTML report route** — The generated HTML is only used as a Puppeteer intermediate for PDF generation. To scan the HTML report, we'd need to either:
   - Serve the HTML via a new route (e.g., `/api/scan/[id]/report/html`), or
   - Save it as a static file and serve it.

3. **In-memory store** — All scan/crawl records are stored in memory (`src/lib/scanner/store.ts`). Records don't persist across server restarts.

---

## 5. Next.js Configuration & Docker

### 5.1 Next.js Config (`next.config.ts`)

- `output: "standalone"` — Builds a self-contained server.
- `serverExternalPackages` — Lists crawlee and related packages as external (not bundled, loaded at runtime).

### 5.2 Dockerfile

- **3-stage build**: deps → builder → runner.
- Base: `node:20-alpine` for build, `node:20-bookworm-slim` for runtime.
- Installs Playwright chromium (`npx playwright install --with-deps chromium`).
- Installs Puppeteer Chrome (`npx puppeteer browsers install chrome`) for PDF generation.
- Copies standalone output + axe-core + crawlee modules.
- Runs as `node server.js` on port 3000.
- `NODE_OPTIONS="--max-old-space-size=1024"`.

---

## 6. Comprehensive Architecture Summary

### Page → Component Map

| Page | Route | Components Used |
|---|---|---|
| Home | `/` | `ScanForm` |
| Scan Result | `/scan/[id]` | `ScanProgress`, `ReportView` → `ScoreDisplay`, `ViolationList` |
| Crawl Result | `/crawl/[id]` | `CrawlProgress`, `SiteScoreDisplay`, `PageList`, `ViolationList` |

### Pages Available to Self-Scan

1. **Home Page** (`/`) — Static form page, always available.
2. **Scan Result** (`/scan/[id]`) — Dynamic, requires an active or completed scan.
3. **Crawl Result** (`/crawl/[id]`) — Dynamic, requires an active or completed crawl.
4. **HTML Report** (generated but not served) — Could be served via new route.

### Report Generation Pipeline

```text
ScanResults → assembleReportData() → ReportData → generateReportHtml() → HTML string → generatePdf() → PDF buffer
CrawlRecord → generateSiteReport() → SiteReportData → generateSiteReportHtml() → HTML string → generatePdf() → PDF buffer
```

---

## 7. Accessibility Concerns Summary

### Cross-Cutting Issues (Affect Multiple Components)

1. **Color-only information conveyance**: Score colors, grade colors, impact severity badges, pass/fail indicators all use color as the primary differentiator. WCAG 1.4.1 requires color not be the sole means.
2. **Unicode symbols without screen reader text**: `✓`, `✕`, `?` characters used as status indicators without `aria-label` or screen reader alternatives.
3. **Low contrast text**: `text-gray-400`, `text-gray-500` on light backgrounds may fail WCAG 1.4.3 contrast requirements (4.5:1 minimum).
4. **No `aria-current` on step indicators**: Both ScanProgress and CrawlProgress show pipeline stages without marking the current one accessibly.
5. **Links opening in new windows**: External links use `target="_blank"` without indicating this to users.

### Component-Specific Issues

| Component | Issue | WCAG Criterion |
|---|---|---|
| `page.tsx` (Home) | Steps use plain divs instead of `<ol>/<li>` | 1.3.1 Info and Relationships |
| `ScanForm` | No `aria-busy` during loading | 4.1.3 Status Messages |
| `ScanProgress` | Stage indicators lack `aria-current` | 4.1.2 Name, Role, Value |
| `CrawlProgress` | Grade colors only on recent pages | 1.4.1 Use of Color |
| `ReportView` | `<th>` without `scope="col"` | 1.3.1 Info and Relationships |
| `ReportView` | `✓`/`✕`/`?` without aria labels | 1.1.1 Non-text Content |
| `ScoreDisplay` | POUR bars lack `role="progressbar"` | 4.1.2 Name, Role, Value |
| `SiteScoreDisplay` | Same as ScoreDisplay | 4.1.2 Name, Role, Value |
| `ViolationList` | Nested `<details>` complexity | 2.4.1 Bypass Blocks |
| `PageList` | Truncated URLs (title only) | 1.3.1 Info and Relationships |
| Report Templates | No landmarks, no skip links, no `scope` on `<th>` | Multiple |

### Report Template Accessibility Issues

The generated HTML reports (used for PDF) have significant accessibility gaps:

- No landmark roles (`<header>`, `<nav>`, `<main>`, `<footer>`)
- No skip links
- Score circle is a styled `<div>` with no ARIA attributes
- Tables lack `scope` attributes on `<th>` elements
- No semantic sections or `aria-labelledby` patterns
- Color contrast concerns on colored badge text against colored backgrounds

While these primarily affect the PDF output (not directly browsed), if we serve the HTML for self-scanning, these issues would be detected.

---

## 8. Self-Scanning Feasibility

### SSRF Blocker

The biggest barrier to self-scanning: `isValidScanUrl()` in all three scan routes blocks localhost and private IPs. The function appears identically in:

- `src/app/api/scan/route.ts` (L7-38)
- `src/app/api/crawl/route.ts` (L7-38)
- `src/app/api/ci/scan/route.ts` (L9-40)
- `src/app/api/ci/crawl/route.ts` (L12-43)

### Options for Self-Scanning

1. **New dedicated self-scan API route** that bypasses SSRF for the app's own pages only.
2. **Environment variable allowlist** to permit localhost scanning when explicitly configured.
3. **Serve HTML reports** via new routes so they can be scanned externally.
4. **Direct Playwright/axe-core invocation** within the app's test suite (no HTTP API needed).

### Scannable Content

| Content | Currently Servable? | Notes |
|---|---|---|
| Home page `/` | Yes | Static, always available |
| Scan result `/scan/[id]` | Yes | Needs a completed scan first |
| Crawl result `/crawl/[id]` | Yes | Needs a completed crawl first |
| Single-page HTML report | **No** | Only generated for PDF; needs new route |
| Site-wide HTML report | **No** | Only generated for PDF; needs new route |

---

## 9. Discovered Research Topics

- Structure of `src/lib/scanner/store.ts` — in-memory map structure for scan/crawl records.
- Structure of `src/lib/scanner/engine.ts` — how Playwright+axe-core is invoked.
- SARIF generator at `src/lib/report/sarif-generator.ts` — may be useful for CI integration.

## 10. Next Research / Outstanding Questions

- [ ] What is the exact Tailwind color contrast for `text-gray-400` and `text-gray-500` against the `--background` values?
- [ ] Can the generated HTML report be enhanced for accessibility and then served as a scannable route?
- [ ] What is the best approach to bypass SSRF for self-scanning without introducing security risks?
- [ ] Should the self-scan operate at the Next.js page level (scanning live rendered pages) or at the HTML template level?

---

## References

- `src/app/layout.tsx` (L1-38)
- `src/app/page.tsx` (L1-46)
- `src/app/globals.css` (L1-33)
- `src/app/scan/[id]/page.tsx` (L1-75)
- `src/app/crawl/[id]/page.tsx` (L1-210+)
- `src/components/ScanForm.tsx` (L1-168)
- `src/components/ScanProgress.tsx` (L1-72)
- `src/components/CrawlProgress.tsx` (L1-145)
- `src/components/ReportView.tsx` (L1-138)
- `src/components/ScoreDisplay.tsx` (L1-105)
- `src/components/SiteScoreDisplay.tsx` (L1-125)
- `src/components/ViolationList.tsx` (L1-113)
- `src/components/PageList.tsx` (L1-77)
- `src/lib/report/templates/report-template.ts` (L1-218)
- `src/lib/report/templates/site-report-template.ts` (L1-260+)
- `src/lib/report/generator.ts` (L1-28)
- `src/lib/report/pdf-generator.ts` (L1-24)
- `src/lib/report/site-generator.ts` (L1-44)
- `src/app/api/scan/route.ts` (L1-97)
- `src/app/api/scan/[id]/route.ts` (L1-17)
- `src/app/api/scan/[id]/status/route.ts` (L1-45)
- `src/app/api/scan/[id]/pdf/route.ts` (L1-32)
- `src/app/api/crawl/route.ts` (L1-100)
- `src/app/api/crawl/[id]/route.ts` (L1-17)
- `src/app/api/crawl/[id]/status/route.ts` (L1-76)
- `src/app/api/crawl/[id]/pages/route.ts` (L1-22)
- `src/app/api/crawl/[id]/pdf/route.ts` (L1-30)
- `src/app/api/crawl/[id]/report/route.ts` (L1-55)
- `src/app/api/ci/scan/route.ts` (L1-100)
- `src/app/api/ci/crawl/route.ts` (L1-100)
- `next.config.ts` (L1-16)
- `Dockerfile` (L1-49)
- `src/lib/types/scan.ts` (L1-50)
- `src/lib/types/report.ts` (L1-15)
