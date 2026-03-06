<!-- markdownlint-disable-file -->
# Release Changes: AODA WCAG 2.2 Accessibility Scanner Web App

**Related Plan**: aoda-wcag-scanner-plan.instructions.md
**Implementation Date**: 2026-03-06

## Summary

Full-stack Next.js 15 web application that scans URLs for WCAG 2.2 Level AA accessibility compliance using Playwright and axe-core, computes weighted scores, and generates PDF reports — styled for AODA compliance context.

## Changes

### Added

* `src/lib/types/scan.ts` — Scan request, status, results, and axe-core wrapper types
* `src/lib/types/score.ts` — Score result, POUR principle scores, impact breakdown types
* `src/lib/types/report.ts` — PDF report data types
* `src/lib/scanner/engine.ts` — Playwright + axe-core scan engine with WCAG 2.2 AA tags
* `src/lib/scanner/result-parser.ts` — Transforms raw axe-core results into domain types with POUR mapping
* `src/lib/scanner/store.ts` — In-memory scan record store (Map-based)
* `src/lib/scoring/calculator.ts` — Weighted scoring calculator (critical=10, serious=7, moderate=3, minor=1)
* `src/lib/scoring/wcag-mapper.ts` — Maps axe-core tags to WCAG POUR principles
* `src/app/api/scan/route.ts` — POST /api/scan with URL validation and SSRF prevention
* `src/app/api/scan/[id]/route.ts` — GET /api/scan/[id] returns scan record
* `src/app/api/scan/[id]/status/route.ts` — GET SSE endpoint for real-time scan progress
* `src/app/api/scan/[id]/pdf/route.ts` — GET PDF download for completed scans
* `src/components/ScanForm.tsx` — URL input form with client-side validation
* `src/components/ScanProgress.tsx` — Real-time progress bar via SSE with stage indicators
* `src/components/ScoreDisplay.tsx` — SVG score gauge with grade colors, POUR bars, impact badges
* `src/components/ViolationList.tsx` — Expandable violation list grouped by WCAG principle
* `src/components/ReportView.tsx` — Full report layout composing all display components
* `src/app/scan/[id]/page.tsx` — Dynamic scan results page with scanning/results/error states
* `src/lib/report/templates/report-template.ts` — Self-contained HTML template for PDF rendering
* `src/lib/report/generator.ts` — Assembles ReportData from ScanResults with AODA context
* `src/lib/report/pdf-generator.ts` — Puppeteer-based HTML-to-PDF converter

### Modified

* `src/app/layout.tsx` — Updated metadata for AODA scanner, added skip-to-content link
* `src/app/page.tsx` — Replaced default Next.js template with scanner landing page
* `src/app/globals.css` — Added custom CSS variables for score grade colors

### Removed

## Additional or Deviating Changes

* Step 2.7 (unit tests) deferred — no test framework configured in scaffolding; unit tests for scoring/mapper are a follow-on item
* Step 7.2 (end-to-end manual test) requires user to run `npm run dev` and test interactively
* Fixed 4 build errors during Phase 7 validation:
  * Buffer type incompatibility in PDF route → used `new Uint8Array(buffer)`
  * Import path for ReportData in report template → corrected relative path depth
  * ScoreResult not available in scan.ts → added explicit import
  * ESLint `<a>` vs `<Link>` for internal navigation → migrated to Next.js Link

## Release Summary

Implemented a complete AODA WCAG 2.2 accessibility scanner web application across 7 phases (21 files created/modified). The application accepts a URL, runs Playwright + axe-core with WCAG 2.2 AA tags, computes a weighted compliance score, displays an interactive report with POUR principle breakdown, and generates downloadable PDF reports. All files compile, lint passes, and `npm run build` succeeds cleanly.

Files: 21 added, 3 modified, 0 removed. Key paths: `src/lib/` (8 files), `src/app/api/` (4 routes), `src/components/` (5 components), `src/app/` (3 pages/layouts).
