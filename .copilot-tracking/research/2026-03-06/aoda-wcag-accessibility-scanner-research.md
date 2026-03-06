<!-- markdownlint-disable-file -->
# Task Research: AODA WCAG 2.2 Accessibility Scanner Web App

Build a web application that performs AODA WCAG 2.2 accessibility testing on any given URL and generates a compliance report with a score, similar to [accessibe.com/accessscan](https://accessibe.com/accessscan).

## Task Implementation Requests

* Create a web app that accepts a URL input and runs WCAG 2.2 accessibility tests
* Generate a compliance report with score (similar to the sample report in `assets/sample-accessibility-report.pdf`)
* Leverage open source accessibility testing tools (e.g., from [W3C WAI tools list](https://www.w3.org/WAI/test-evaluate/tools/list/))
* Phase 2 (future): Crawl sub-URLs from a home URL to generate site-wide reports
* Phase 2 (future): CI/CD pipeline integration for automated accessibility testing

## Scope and Success Criteria

* Scope: Phase 1 — single-page accessibility scanning web app with report generation. Excludes multi-page crawling and CI/CD integration (Phase 2).
* Assumptions:
  * Open-source tools preferred for the accessibility engine
  * WCAG 2.2 Level AA compliance is the primary target (AODA requires WCAG 2.0 Level AA, but 2.2 is the latest standard)
  * Report should include a score, issue categories, and actionable remediation guidance
  * The app should be deployable as a standalone web application
* Success Criteria:
  * User can enter a URL and receive an accessibility scan
  * Report includes WCAG 2.2 violation details categorized by principle (Perceivable, Operable, Understandable, Robust)
  * A compliance score is computed and displayed
  * Report can be viewed in-browser and exported (PDF)
  * Architecture supports future Phase 2 expansion (crawling, CI/CD)

## Outline

1. Open-source accessibility testing engines
2. Web app architecture
3. Scoring methodology
4. Report generation and PDF export
5. AODA-specific requirements
6. Technology stack selection and selected approach
7. Phase 2 considerations (crawling, CI/CD)

---

## Research Executed

### Subagent Research Documents

* [accessibility-engines-research.md](../subagents/2026-03-06/accessibility-engines-research.md) — Deep analysis of axe-core, pa11y, Lighthouse, HTML_CodeSniffer, IBM Equal Access, QualWeb, and reference implementations
* [architecture-scoring-report-research.md](../subagents/2026-03-06/architecture-scoring-report-research.md) — Architecture patterns, scoring methodology, PDF generation, AODA requirements, Phase 2 CI/CD

### External Sources Researched

| Source | Key Finding |
|---|---|
| [axe-core GitHub](https://github.com/dequelabs/axe-core) | v4.11.1, 6.9k stars, 13M+ dependents, WCAG 2.2 AA via `wcag22aa` tag |
| [pa11y GitHub](https://github.com/pa11y/pa11y) | v9.1.1, wrapper over axe-core/htmlcs runners, CLI + Node.js API |
| [IBM Equal Access](https://github.com/IBMa/equal-access) | v4.0.13, independent engine, WCAG 2.2, very active |
| [Microsoft Accessibility Insights Service](https://github.com/microsoft/accessibility-insights-service) | Cloud-based reference architecture, TypeScript, axe-core, Azure |
| [pa11y-dashboard](https://github.com/pa11y/pa11y-dashboard) | Web dashboard UI reference, Node.js + MongoDB |
| [Playwright a11y docs](https://playwright.dev/docs/accessibility-testing) | Official @axe-core/playwright integration |
| [Lighthouse scoring](https://developer.chrome.com/docs/lighthouse/accessibility/scoring) | Weighted average with 3/7/10 impact weights |
| [AODA legislation](https://www.ontario.ca/laws/statute/05a11) | Requires WCAG 2.0 AA, excludes SC 1.2.4 and 1.2.5 |
| [WCAG 2.2 spec](https://www.w3.org/TR/WCAG22/) | 9 new SCs, SC 4.1.1 removed |

---

## Key Discoveries

### 1. Accessibility Testing Engine Landscape

Six open-source engines were evaluated. **axe-core** is the clear industry standard:

| Engine | WCAG 2.2 | Stars | Active | Best For |
|---|---|---|---|---|
| **axe-core** | Yes (AA) | 6.9k | Yes | Primary scanning engine |
| **pa11y** | Via axe runner | 4.4k | Yes | CLI/CI wrapper |
| **IBM Equal Access** | Yes | 737 | Yes | Secondary/complementary engine |
| **Lighthouse** | Via axe-core | N/A | Yes | Quick scoring (subset of axe) |
| **HTML_CodeSniffer** | No | 1.1k | **No** (2021) | Legacy only |
| **QualWeb** | No (2.1) | 19 | Yes | ACT rules niche |

**axe-core strengths**: Zero false-positive policy, rich JSON output with impact severity + CSS selectors + HTML snippets + remediation URLs, official Playwright/Puppeteer adapters, 13M+ project usage.

### 2. AODA Requirements

* AODA requires **WCAG 2.0 Level AA** (Ontario Reg. 191/11)
* **Exclusions**: SC 1.2.4 (live captions) and SC 1.2.5 (audio descriptions)
* **No AODA-specific technical rules** beyond WCAG — only procedural/organizational requirements
* Testing WCAG 2.2 Level AA provides **superset coverage** of AODA requirements
* Penalties: up to $50,000/day (individuals), $100,000/day (corporations)

### 3. WCAG 2.2 New Success Criteria (9 new SCs)

| Success Criterion | Level | Principle |
|---|---|---|
| 2.4.11 Focus Not Obscured (Minimum) | AA | Operable |
| 2.5.7 Dragging Movements | AA | Operable |
| 2.5.8 Target Size (Minimum) | AA | Operable |
| 3.2.6 Consistent Help | A | Understandable |
| 3.3.7 Redundant Entry | A | Understandable |
| 3.3.8 Accessible Authentication (Minimum) | AA | Understandable |
| 2.4.12 Focus Not Obscured (Enhanced) | AAA | Operable |
| 2.4.13 Focus Appearance | AAA | Operable |
| 3.3.9 Accessible Authentication (Enhanced) | AAA | Understandable |

SC 4.1.1 Parsing was **removed** from WCAG 2.2.

### 4. Scoring Methodology

The Lighthouse approach (weighted pass rate by impact) is the most established:

```
Score = 100 × Σ(weight_i × pass_rate_i) / Σ(weight_i)
```

| axe-core Impact | Weight | Description |
|---|---|---|
| critical | 10 | Blocks access completely |
| serious | 7 | Significantly impairs access |
| moderate | 3 | Causes some difficulty |
| minor | 1 | Minor inconvenience |

Violations map to WCAG principles via the SC tag prefix: `1.x` = Perceivable, `2.x` = Operable, `3.x` = Understandable, `4.x` = Robust.

### 5. Headless Browser Choice

**Playwright** is recommended over Puppeteer:
* Multi-browser support (Chromium, Firefox, WebKit)
* Microsoft-maintained, faster, more reliable in server environments
* Official `@axe-core/playwright` adapter (2.2M weekly downloads)
* Better auto-waiting and context isolation
* First-class accessibility testing documentation

### 6. PDF Report Generation

**Puppeteer `page.pdf()`** (HTML→PDF) is recommended for styled reports with charts and branding. Alternatively, **PDFKit** (2.1M weekly downloads, MIT) for lightweight programmatic generation.

### 7. Phase 2: Crawling & CI/CD

* **Crawling**: `crawlee` (Apify) for full-featured site crawling, or `sitemap-parser` + link extraction
* **CI/CD**: `pa11y-ci` (v4.1.0) is the leading CI runner with sitemap support and threshold-based exit codes
* **GitHub Action**: `accessibility-insights-action` (Microsoft) for PR-triggered scans

---

## Technical Scenarios

### Scenario A: Next.js Full-Stack App (axe-core + Playwright) — SELECTED

**Description**: Single Next.js (App Router) application with React frontend and API routes for scanning. Playwright launches a headless browser, navigates to the target URL, injects axe-core via `@axe-core/playwright`, and returns structured results. SSE provides scan progress. Reports render as HTML with PDF export via Puppeteer.

**Requirements:**

* Node.js 20+, Next.js 15 (App Router), TypeScript
* `@axe-core/playwright` for WCAG 2.2 scanning
* Tailwind CSS for UI
* Puppeteer for PDF generation (or share Chromium with Playwright)

**Preferred Approach:**

* Single codebase (frontend + backend) for simplicity
* SSE for progress updates (simpler than WebSockets for one-way communication)
* axe-core WCAG 2.2 tag filtering: `['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']`
* Weighted scoring formula matching Lighthouse methodology
* HTML report template rendered to PDF via Puppeteer
* Phase 2 ready: API routes can be extended for crawling and CI/CD endpoints

```text
accessibility-scan-demo-app/
├── src/
│   ├── app/                           # Next.js App Router
│   │   ├── page.tsx                   # Home — URL input form
│   │   ├── scan/[id]/page.tsx         # Scan results page
│   │   ├── api/
│   │   │   ├── scan/route.ts          # POST: start scan
│   │   │   └── scan/[id]/
│   │   │       ├── route.ts           # GET: scan results
│   │   │       ├── status/route.ts    # GET: SSE progress
│   │   │       └── pdf/route.ts       # GET: PDF download
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ScanForm.tsx               # URL input + submit
│   │   ├── ScanProgress.tsx           # Progress bar
│   │   ├── ScoreDisplay.tsx           # Score gauge
│   │   ├── ViolationList.tsx          # Issues by WCAG principle
│   │   └── ReportView.tsx             # Full report
│   └── lib/
│       ├── scanner/
│       │   ├── engine.ts              # Playwright + axe-core scan
│       │   └── result-parser.ts       # Parse axe results
│       ├── scoring/
│       │   ├── calculator.ts          # Weighted score computation
│       │   └── wcag-mapper.ts         # Map violations → WCAG principles
│       └── report/
│           ├── generator.ts           # Report data assembly
│           └── pdf-generator.ts       # HTML → PDF via Puppeteer
├── public/
├── package.json
├── tsconfig.json
├── next.config.js
└── README.md
```

```mermaid
graph TB
    subgraph "Frontend (Next.js React)"
        A[URL Input Form] --> B[Scan Progress SSE]
        B --> C[Results Dashboard]
        C --> D[Score Gauge + POUR Breakdown]
        C --> E[Violation Details]
        C --> F[PDF Download]
    end

    subgraph "Backend (Next.js API Routes)"
        G[POST /api/scan] --> H[Scan Manager]
        I[GET /api/scan/:id/status] --> H
        J[GET /api/scan/:id] --> K[Report Generator]
        L[GET /api/scan/:id/pdf] --> M[PDF Generator]
    end

    subgraph "Scan Engine"
        N[Playwright - Launch Chromium] --> O[Navigate to URL]
        O --> P[@axe-core/playwright - WCAG 2.2 AA]
        P --> Q[Result Parser + Scorer]
    end

    A -->|Submit URL| G
    B -->|SSE Stream| I
    H -->|Dispatch| N
    Q -->|Store Results| H
    C -->|Fetch| J
    F -->|Request| L
```

**Implementation Details:**

* **Scan flow**: User submits URL → POST /api/scan returns scanId → SSE streams progress → Client fetches results on completion
* **axe-core integration**: `new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']).analyze()`
* **Scoring**: Weighted formula using axe-core impact levels (critical=10, serious=7, moderate=3, minor=1)
* **WCAG principle mapping**: Parse `wcag{digit}{digit}{digit}` tags — first digit determines POUR principle
* **AODA compliance flag**: If WCAG 2.2 AA passes (excluding SC 1.2.4 and 1.2.5), page is AODA-compliant
* **Report sections**: Executive summary, score gauge, POUR breakdown, issue table, detailed violations with HTML snippets and remediation links, passes, incomplete items, AODA compliance note
* **PDF**: Render report HTML → Puppeteer `page.pdf()` with headers/footers
* **Disclaimer**: "Automated testing detects ~57% of WCAG issues. Manual testing recommended for full compliance."

#### Considered Alternatives

**Scenario B: Express.js Backend + React SPA (Separate Projects)**

Single-purpose Express backend with REST API, separate Create React App or Vite frontend. More traditional architecture but requires two projects, separate dev servers, CORS configuration, and more deployment complexity. Rejected because Next.js provides the same capability in a unified project with better DX.

**Scenario C: pa11y-dashboard Fork/Extension**

Fork the pa11y-dashboard project and extend it with WCAG 2.2 support, scoring, and PDF reports. pa11y-dashboard uses Node.js + MongoDB and has an existing web UI. Rejected because pa11y-dashboard is dated (last major update years ago), uses MongoDB (unnecessary dependency for Phase 1), and building on axe-core directly gives more control over output, scoring, and report format.

**Scenario D: Python (Flask/Django) + axe-core via Selenium**

Python backend running axe-core through Selenium WebDriver. Viable for teams with Python expertise but adds complexity (Python + Node.js tooling), Selenium is slower than Playwright, and the ecosystem for axe-core integration is stronger in Node.js. Rejected for this project.

**Scenario E: Dual Engine (axe-core + IBM Equal Access)**

Run both axe-core and IBM Equal Access for complementary coverage. Provides the most comprehensive automated testing. Considered for Phase 2 but rejected for Phase 1 due to added complexity, longer scan times, and the need to reconcile different output formats. The architecture supports adding this later.

---

## Potential Next Research

* **Deployment options**: Azure App Service vs Vercel vs Docker for hosting Playwright/Puppeteer apps (binary compatibility considerations)
* **Browser pool management**: Patterns for concurrent scans under load (playwright browser contexts vs separate browser instances)
* **Rate limiting**: Strategies to prevent abuse (token bucket per IP, configurable limits)
* **Authentication support**: Scanning behind login (Playwright's built-in actions or pa11y's action system)
* **Sample PDF analysis**: Review `assets/sample-accessibility-report.pdf` layout to match report structure
* **Database for scan history**: Whether to persist results (SQLite/PostgreSQL) vs ephemeral for Phase 1

---

## Implementation Packages

```bash
# Core dependencies
npm install next@latest react@latest react-dom@latest typescript
npm install @axe-core/playwright playwright
npm install tailwindcss @tailwindcss/postcss postcss

# PDF generation
npm install puppeteer

# Dev dependencies
npm install -D @types/react @types/node
```

---

## References

| Source | URL |
|---|---|
| axe-core GitHub | https://github.com/dequelabs/axe-core |
| @axe-core/playwright npm | https://www.npmjs.com/package/@axe-core/playwright |
| pa11y GitHub | https://github.com/pa11y/pa11y |
| IBM Equal Access | https://github.com/IBMa/equal-access |
| MS Accessibility Insights Service | https://github.com/microsoft/accessibility-insights-service |
| pa11y-dashboard | https://github.com/pa11y/pa11y-dashboard |
| Playwright Accessibility Testing | https://playwright.dev/docs/accessibility-testing |
| Lighthouse Accessibility Scoring | https://developer.chrome.com/docs/lighthouse/accessibility/scoring |
| AODA Legislation (Ontario) | https://www.ontario.ca/laws/statute/05a11 |
| Ontario WCAG Guide | https://www.ontario.ca/page/how-make-websites-accessible |
| WCAG 2.2 Specification | https://www.w3.org/TR/WCAG22/ |
| WCAG 2.2 What's New | https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/ |
| W3C WAI Evaluation Tools List | https://www.w3.org/WAI/test-evaluate/tools/list/ |
| PDFKit npm | https://www.npmjs.com/package/pdfkit |
| pa11y-ci npm | https://www.npmjs.com/package/pa11y-ci |
