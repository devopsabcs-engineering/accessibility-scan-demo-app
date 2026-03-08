---
title: Accessibility Scan Demo App
description: Multi-engine WCAG 2.2 Level AA accessibility scanner with web UI, CLI, and GitHub Action
ms.date: 2026-03-08
---

## Overview

A full-stack accessibility scanning platform that tests websites against WCAG 2.2 Level AA criteria using
three complementary engines: axe-core, IBM Equal Access, and custom Playwright-based checks. Results are
normalized, deduplicated, and scored to produce actionable reports in multiple formats.

Built with Next.js 15, React 19, and TypeScript. Supports single-page scans, full-site crawls with
configurable depth and concurrency, and CI/CD integration through a CLI and GitHub Action.

## Features

* **Multi-engine scanning** — axe-core, IBM Equal Access, and custom checks run together with
  cross-engine deduplication and severity-based prioritization.
* **Single-page scan** — enter a URL in the web UI or call the API to scan one page.
* **Site-wide crawl** — BFS traversal with robots.txt compliance, sitemap discovery, configurable
  max pages (1–200), depth (1–10), and concurrency (1–5).
* **WCAG scoring** — weighted scoring by impact (critical, serious, moderate, minor) mapped to
  WCAG principles (Perceivable, Operable, Understandable, Robust) with A–F grading.
* **AODA compliance** — reports whether the site meets AODA requirements (WCAG 2.0 AA as a subset
  of WCAG 2.2 AA).
* **Multiple output formats** — JSON, SARIF 2.1.0, JUnit XML, PDF, and HTML reports.
* **CLI tool** — `a11y-scan scan` and `a11y-scan crawl` commands with threshold gating and
  configurable output.
* **GitHub Action** — drop-in action for CI pipelines with score/pass outputs and SARIF upload support.
* **CI threshold gating** — fail builds on score, violation count per severity, or specific rule IDs.
* **SSRF prevention** — blocks scans of localhost, private IPs, and internal hostnames.
* **Self-testing** — the app scans itself in CI using Playwright e2e tests to ensure its own
  WCAG compliance.

## Tech Stack

| Category | Technology |
| --- | --- |
| Framework | Next.js 15.5 (standalone output, Turbopack) |
| Language | TypeScript 5, React 19 |
| Styling | Tailwind CSS 4 |
| Scan engines | axe-core 4.11, IBM Equal Access 4.0, custom Playwright checks |
| Crawling | Crawlee 3.16 (Playwright-based) |
| PDF generation | Puppeteer 24 |
| Unit tests | Vitest 4 with coverage-v8 |
| E2E tests | Playwright 1.58 with @axe-core/playwright |
| CLI | Commander 14 |
| Container | Docker (multi-stage, node:20-bookworm-slim) |
| Infrastructure | Azure Bicep (ACR + App Service) |
| CI/CD | GitHub Actions |

## Quick Start

### Prerequisites

* Node.js 20+
* npm 10+
* Docker (optional, for container mode)

### Install dependencies

```bash
npm install
npx playwright install --with-deps chromium
```

### Run locally

```powershell
# Fast dev mode (default) — uses Next.js dev server with Turbopack
.\start-local.ps1

# Docker mode — builds container, closer to production
.\start-local.ps1 -Mode docker
```

The app starts at `http://localhost:3000`.

### Stop

```powershell
# Stop dev server
.\stop-local.ps1

# Stop Docker container
.\stop-local.ps1 -Mode docker
```

## Scanning Engines

### axe-core

The primary engine. Runs axe-core directly on the page via `@axe-core/playwright` with the original
`axe.min.js` read from disk (not the webpack-bundled version) wrapped in a closure to prevent
CommonJS `module` reference errors on sites with AMD loaders.

Tags tested: `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`, `best-practice`.

### IBM Equal Access

Runs IBM's accessibility-checker ACE engine in an **isolated Playwright page** to prevent its
`eval()`-based script injection from corrupting the main page's JavaScript context. If the IBM
scan fails, results gracefully degrade to axe-core only.

### Custom Checks

Playwright-based checks that catch issues the other engines miss:

* **ambiguous-link-text** — detects generic link text ("Learn More", "Click Here", etc.)
* **aria-current-page** — verifies navigation links to the current page have `aria-current="page"`
* **emphasis-strong-semantics** — flags `<b>` and `<i>` tags that should be `<strong>` and `<em>`
* **discount-price-accessibility** — ensures strikethrough pricing provides screen reader context
* **sticky-element-overlap** — detects focusable elements obscured by fixed/sticky positioned elements

## Architecture

```text
┌─────────────────────────────────────────┐
│  Web UI (Next.js)                       │
│  ├── Home — ScanForm                    │
│  ├── /scan/[id] — ScanProgress/Report   │
│  └── /crawl/[id] — CrawlProgress/Report│
├─────────────────────────────────────────┤
│  API Routes                             │
│  ├── POST /api/scan — single-page scan  │
│  ├── POST /api/crawl — site-wide crawl  │
│  ├── GET  /api/scan/[id] — results      │
│  ├── GET  /api/scan/[id]/pdf — PDF      │
│  └── GET  /api/ci — CI threshold check  │
├─────────────────────────────────────────┤
│  Scanner Engine (multi-engine)          │
│  ├── axe-core (main page)               │
│  ├── IBM Equal Access (isolated page)   │
│  └── Custom checks (main page)          │
├─────────────────────────────────────────┤
│  Result Pipeline                        │
│  ├── Normalizer — unified format        │
│  ├── Deduplicator — cross-engine merge  │
│  ├── Scorer — weighted WCAG scoring     │
│  └── Formatters — JSON/SARIF/JUnit/PDF  │
├─────────────────────────────────────────┤
│  Site Crawler (Crawlee + Playwright)    │
│  ├── robots.txt compliance              │
│  ├── Sitemap discovery                  │
│  ├── BFS traversal with depth control   │
│  └── Per-page scan + aggregation        │
└─────────────────────────────────────────┘
```

## CLI

The CLI is available as `a11y-scan` after building:

```bash
npm run build
```

### Single-page scan

```bash
a11y-scan scan --url https://example.com --threshold 80 --format sarif --output results/
```

### Site-wide crawl

```bash
a11y-scan crawl --url https://example.com --max-pages 100 --max-depth 3 --concurrency 3 --threshold 70 --format json
```

### Configuration file

Create `.a11yrc.json` in the project root:

```json
{
  "url": "https://example.com",
  "threshold": 80,
  "output": "./results",
  "format": "sarif",
  "crawl": {
    "maxPages": 100,
    "maxDepth": 3,
    "concurrency": 3
  }
}
```

## GitHub Action

Use the built-in action in your workflow:

```yaml
- uses: devopsabcs-engineering/accessibility-scan-demo-app@main
  with:
    url: https://example.com
    mode: single          # or "crawl"
    threshold: 70
    max-pages: 50         # crawl mode only
    output-format: sarif  # json, sarif, or junit
    output-directory: ./a11y-results
```

**Outputs:** `score` (0–100), `passed` (true/false), `report-path`.

## Testing

### Unit tests

```bash
npm test                # run once
npm run test:watch      # watch mode
npm run test:coverage   # with coverage report
```

356 unit tests covering scanner engines, result normalization, scoring, crawling, CLI commands,
report generation, and CI formatters.

### E2E accessibility tests

```bash
npm run test:a11y
```

7 Playwright tests that scan the app's own pages (home, scan results, crawl results, reports)
against WCAG 2.2 AA to ensure the scanner UI itself is accessible.

### Lint

```bash
npm run lint
```

## Docker

### Build

```bash
docker build -t a11y-scan-demo:local .
```

### Run

```bash
docker run -d --name a11y-scan -p 3000:3000 a11y-scan-demo:local
```

The multi-stage Dockerfile:

1. **deps** — installs npm dependencies (node:20-alpine)
2. **builder** — builds the Next.js standalone output
3. **runner** — production image (node:20-bookworm-slim) with Chromium and Chrome pre-installed

## Infrastructure

Azure deployment is defined in `infra/main.bicep`:

* Azure Container Registry (Basic SKU)
* App Service Plan (Linux)
* Web App for Containers pulling from ACR

Deploy via GitHub Actions (`.github/workflows/deploy.yml`) using OIDC authentication.

## CI/CD Pipeline

The CI workflow (`.github/workflows/ci.yml`) runs on every push to `main` and on pull requests:

1. **Lint** — ESLint
2. **Unit tests** — Vitest with coverage (thresholds: 80% lines, 80% statements, 80% functions, 65% branches)
3. **Build** — Next.js production build
4. **E2E tests** — Playwright self-scan accessibility tests
5. **Reports** — test results, coverage, and accessibility reports uploaded as artifacts

## Scoring

Scores are calculated using weighted impact severity:

| Impact | Weight |
| --- | --- |
| Critical | 10 |
| Serious | 7 |
| Moderate | 3 |
| Minor | 1 |

**Overall score** = (weighted passes / weighted total) × 100

**Grades:** A (90+), B (70+), C (50+), D (30+), F (<30)

**AODA compliant** when zero violations are found.

Site-wide scores aggregate per-page results with overall, lowest, highest, and
median page scores.

## Project Structure

```text
src/
├── app/                    # Next.js pages and API routes
│   ├── api/scan/           # Single-page scan API
│   ├── api/crawl/          # Site crawl API
│   ├── api/ci/             # CI threshold API
│   ├── scan/[id]/          # Scan results page
│   └── crawl/[id]/         # Crawl results page
├── cli/                    # CLI tool (scan, crawl commands)
├── components/             # React components (ScanForm, ReportView, etc.)
└── lib/
    ├── scanner/            # Multi-engine scanner (axe, IBM, custom)
    ├── crawler/            # Site crawler (robots, sitemap, URL utils)
    ├── scoring/            # WCAG scoring and grading
    ├── report/             # Report generators (HTML, PDF, SARIF)
    ├── ci/                 # CI threshold checking and formatters
    └── types/              # TypeScript type definitions
e2e/                        # Playwright self-scan accessibility tests
infra/                      # Azure Bicep infrastructure
action/                     # GitHub Action definition
```

## License

This project is private.
