---
applyTo: '.copilot-tracking/changes/2026-03-06/aoda-wcag-scanner-changes.md'
---
<!-- markdownlint-disable-file -->
# Implementation Plan: AODA WCAG 2.2 Accessibility Scanner Web App

## Overview

Build a Next.js 15 full-stack web application that accepts a URL, runs WCAG 2.2 Level AA accessibility tests using Playwright and axe-core, computes a weighted compliance score, and generates an in-browser report with PDF export — styled for AODA compliance context.

## Objectives

### User Requirements

* Create a web app that accepts a URL and performs WCAG 2.2 accessibility testing — Source: user prompt
* Generate a compliance report with a score similar to accessibe.com/accessscan — Source: user prompt
* Leverage open-source tools (e.g., from W3C WAI tools list) — Source: user prompt
* Architecture must support future Phase 2 expansion (URL crawling, CI/CD pipelines) — Source: user prompt

### Derived Objectives

* Use axe-core v4.11+ as the primary scanning engine — Derived from: engine comparison research showing axe-core as industry standard with WCAG 2.2 AA support and zero false-positive policy
* Use Playwright as the headless browser — Derived from: browser comparison showing Playwright is faster, more reliable in server environments, with official @axe-core/playwright adapter
* Implement weighted scoring formula (critical=10, serious=7, moderate=3, minor=1) — Derived from: Lighthouse scoring methodology research
* Categorize violations by WCAG POUR principles (Perceivable, Operable, Understandable, Robust) — Derived from: WCAG 2.2 structure and report requirements
* Include AODA compliance context in reports — Derived from: AODA legislation research (WCAG 2.0 AA required, WCAG 2.2 AA provides superset coverage)
* Use SSE for scan progress updates — Derived from: architecture research showing SSE is simpler than WebSockets for one-way progress
* Use TypeScript throughout — Derived from: type safety benefits for complex scan result objects
* Use in-memory storage for Phase 1 — Derived from: simplicity goal for initial version; database deferred to Phase 2

## Context Summary

### Project Files

* `README.md` — Current repo root, contains only project title
* `assets/sample-accessibility-report.pdf` — Reference report from accessibe.com scan of ontario.ca
* `.copilot-tracking/research/2026-03-06/aoda-wcag-accessibility-scanner-research.md` — Primary research document
* `.copilot-tracking/research/subagents/2026-03-06/accessibility-engines-research.md` — Engine comparison research
* `.copilot-tracking/research/subagents/2026-03-06/architecture-scoring-report-research.md` — Architecture and scoring research

### References

* [axe-core API docs](https://github.com/dequelabs/axe-core/blob/develop/doc/API.md) — axe-core programmatic API
* [@axe-core/playwright](https://www.npmjs.com/package/@axe-core/playwright) — Official Playwright adapter
* [Playwright accessibility testing](https://playwright.dev/docs/accessibility-testing) — First-class a11y testing guide
* [Lighthouse accessibility scoring](https://developer.chrome.com/docs/lighthouse/accessibility/scoring) — Scoring methodology reference
* [AODA IASR regulation](https://www.ontario.ca/laws/regulation/110191) — Ontario accessibility standards
* [WCAG 2.2 specification](https://www.w3.org/TR/WCAG22/) — W3C standard

## Implementation Checklist

### [ ] Implementation Phase 1: Project Scaffolding & Configuration

<!-- parallelizable: false -->

* [ ] Step 1.1: Initialize Next.js 15 project with TypeScript and App Router
  * Details: .copilot-tracking/details/2026-03-06/aoda-wcag-scanner-details.md (Lines 15-44)
* [ ] Step 1.2: Install core dependencies (axe-core, Playwright, Tailwind CSS, Puppeteer)
  * Details: .copilot-tracking/details/2026-03-06/aoda-wcag-scanner-details.md (Lines 46-73)
* [ ] Step 1.3: Configure Tailwind CSS and global styles
  * Details: .copilot-tracking/details/2026-03-06/aoda-wcag-scanner-details.md (Lines 75-100)
* [ ] Step 1.4: Install Playwright browsers
  * Details: .copilot-tracking/details/2026-03-06/aoda-wcag-scanner-details.md (Lines 102-110)
* [ ] Step 1.5: Validate phase — run `npm run build` to confirm clean scaffolding
  * Run Next.js build to verify project compiles

### [ ] Implementation Phase 2: Scan Engine (Playwright + axe-core)

<!-- parallelizable: false -->

* [ ] Step 2.1: Create TypeScript types for scan results, scores, and reports
  * Details: .copilot-tracking/details/2026-03-06/aoda-wcag-scanner-details.md (Lines 114-176)
* [ ] Step 2.2: Implement the scan engine (`src/lib/scanner/engine.ts`)
  * Details: .copilot-tracking/details/2026-03-06/aoda-wcag-scanner-details.md (Lines 178-228)
* [ ] Step 2.3: Implement result parser (`src/lib/scanner/result-parser.ts`)
  * Details: .copilot-tracking/details/2026-03-06/aoda-wcag-scanner-details.md (Lines 230-262)
* [ ] Step 2.4: Implement scoring calculator (`src/lib/scoring/calculator.ts`)
  * Details: .copilot-tracking/details/2026-03-06/aoda-wcag-scanner-details.md (Lines 264-318)
* [ ] Step 2.5: Implement WCAG principle mapper (`src/lib/scoring/wcag-mapper.ts`)
  * Details: .copilot-tracking/details/2026-03-06/aoda-wcag-scanner-details.md (Lines 320-356)
* [ ] Step 2.6: Implement in-memory scan store (`src/lib/scanner/store.ts`)
  * Details: .copilot-tracking/details/2026-03-06/aoda-wcag-scanner-details.md (Lines 358-388)
* [ ] Step 2.7: Validate phase — write and run unit tests for scoring calculator and WCAG mapper
  * Run targeted tests for lib modules

### [ ] Implementation Phase 3: API Routes

<!-- parallelizable: false -->

* [ ] Step 3.1: Implement POST `/api/scan` route (start scan, return scanId)
  * Details: .copilot-tracking/details/2026-03-06/aoda-wcag-scanner-details.md (Lines 392-434)
* [ ] Step 3.2: Implement GET `/api/scan/[id]` route (get scan results)
  * Details: .copilot-tracking/details/2026-03-06/aoda-wcag-scanner-details.md (Lines 436-462)
* [ ] Step 3.3: Implement GET `/api/scan/[id]/status` route (SSE progress stream)
  * Details: .copilot-tracking/details/2026-03-06/aoda-wcag-scanner-details.md (Lines 464-510)
* [ ] Step 3.4: Validate phase — test API routes with curl or test client
  * Verify scan lifecycle: POST → SSE → GET results

### [ ] Implementation Phase 4: Frontend Components

<!-- parallelizable: true -->

* [ ] Step 4.1: Create root layout (`src/app/layout.tsx`) with metadata and accessibility features
  * Details: .copilot-tracking/details/2026-03-06/aoda-wcag-scanner-details.md (Lines 514-540)
* [ ] Step 4.2: Create ScanForm component (`src/components/ScanForm.tsx`)
  * Details: .copilot-tracking/details/2026-03-06/aoda-wcag-scanner-details.md (Lines 542-580)
* [ ] Step 4.3: Create ScanProgress component (`src/components/ScanProgress.tsx`)
  * Details: .copilot-tracking/details/2026-03-06/aoda-wcag-scanner-details.md (Lines 582-614)
* [ ] Step 4.4: Create ScoreDisplay component (`src/components/ScoreDisplay.tsx`)
  * Details: .copilot-tracking/details/2026-03-06/aoda-wcag-scanner-details.md (Lines 616-654)
* [ ] Step 4.5: Create ViolationList component (`src/components/ViolationList.tsx`)
  * Details: .copilot-tracking/details/2026-03-06/aoda-wcag-scanner-details.md (Lines 656-700)
* [ ] Step 4.6: Create ReportView component (`src/components/ReportView.tsx`)
  * Details: .copilot-tracking/details/2026-03-06/aoda-wcag-scanner-details.md (Lines 702-738)

### [ ] Implementation Phase 5: Pages & Routing

<!-- parallelizable: false -->

* [ ] Step 5.1: Create home page (`src/app/page.tsx`) with ScanForm
  * Details: .copilot-tracking/details/2026-03-06/aoda-wcag-scanner-details.md (Lines 742-770)
* [ ] Step 5.2: Create scan results page (`src/app/scan/[id]/page.tsx`)
  * Details: .copilot-tracking/details/2026-03-06/aoda-wcag-scanner-details.md (Lines 772-810)
* [ ] Step 5.3: Validate phase — run `npm run build` and manual test the scan flow
  * End-to-end: enter URL → see progress → view report

### [ ] Implementation Phase 6: PDF Report Generation

<!-- parallelizable: true -->

* [ ] Step 6.1: Create report HTML template (`src/lib/report/templates/report-template.ts`)
  * Details: .copilot-tracking/details/2026-03-06/aoda-wcag-scanner-details.md (Lines 814-870)
* [ ] Step 6.2: Implement report data generator (`src/lib/report/generator.ts`)
  * Details: .copilot-tracking/details/2026-03-06/aoda-wcag-scanner-details.md (Lines 872-910)
* [ ] Step 6.3: Implement PDF generator (`src/lib/report/pdf-generator.ts`)
  * Details: .copilot-tracking/details/2026-03-06/aoda-wcag-scanner-details.md (Lines 912-952)
* [ ] Step 6.4: Implement GET `/api/scan/[id]/pdf` route
  * Details: .copilot-tracking/details/2026-03-06/aoda-wcag-scanner-details.md (Lines 954-982)
* [ ] Step 6.5: Add PDF download button to ReportView component
  * Details: .copilot-tracking/details/2026-03-06/aoda-wcag-scanner-details.md (Lines 984-1002)

### [ ] Implementation Phase 7: Validation

<!-- parallelizable: false -->

* [ ] Step 7.1: Run full project validation
  * Execute `npm run lint` (ESLint + Next.js lint)
  * Execute `npm run build` (TypeScript compilation + Next.js build)
  * Execute `npx playwright install` to verify browser dependencies
* [ ] Step 7.2: Run end-to-end manual test
  * Start dev server with `npm run dev`
  * Submit a URL (e.g., https://www.ontario.ca/page/government-ontario)
  * Verify scan progress displays via SSE
  * Verify results page renders with score, POUR breakdown, and violation details
  * Verify PDF download generates a valid file
* [ ] Step 7.3: Fix minor validation issues
  * Iterate on lint errors, build warnings, and visual issues
  * Apply fixes directly when corrections are straightforward
* [ ] Step 7.4: Report blocking issues
  * Document issues requiring additional research
  * Provide user with next steps and recommended planning
  * Avoid large-scale fixes within this phase

## Planning Log

See [aoda-wcag-scanner-log.md](.copilot-tracking/plans/logs/2026-03-06/aoda-wcag-scanner-log.md) for discrepancy tracking, implementation paths considered, and suggested follow-on work.

## Dependencies

* Node.js 20+ (LTS)
* Next.js 15 (App Router)
* TypeScript 5+
* axe-core v4.11+ and @axe-core/playwright
* Playwright (Chromium browser)
* Puppeteer (for PDF generation)
* Tailwind CSS v4+
* uuid (scan ID generation)

## Success Criteria

* User can enter a URL on the home page and initiate an accessibility scan — Traces to: User Requirement 1
* Scan progress is displayed via SSE with status updates — Traces to: Derived Objective (SSE)
* Results page displays an overall weighted accessibility score (0–100) — Traces to: User Requirement 2
* Violations are categorized by WCAG POUR principles with counts per principle — Traces to: Derived Objective (POUR)
* Each violation shows impact level, WCAG SC reference, affected element HTML, and remediation link — Traces to: User Requirement 2, Research (axe-core output format)
* AODA compliance status is indicated ("AODA-compliant" when WCAG 2.2 AA passes) — Traces to: Derived Objective (AODA)
* Report can be downloaded as a styled PDF — Traces to: User Requirement 2
* Application builds and runs without errors (`npm run build` succeeds) — Traces to: standard quality
* Architecture supports adding multi-page crawling and CI/CD endpoints in Phase 2 — Traces to: User Requirement 4
