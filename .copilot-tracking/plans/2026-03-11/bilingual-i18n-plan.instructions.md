---
applyTo: '.copilot-tracking/changes/2026-03-11/bilingual-i18n-changes.md'
---
<!-- markdownlint-disable-file -->
# Implementation Plan: Bilingual French/English UI

## Overview

Add French/English bilingual support to the Next.js 15 web UI using `next-intl` with URL prefix routing, a language switcher, and dynamic `<html lang>` — scoped to the frontend only.

## Objectives

### User Requirements

* Add French/English language support to the web UI — Source: user request
* Implement a language switcher for users to toggle between languages — Source: user request
* Translate all user-facing text strings (headings, labels, buttons, status messages, error messages) — Source: user request
* Ensure the `<html lang>` attribute updates dynamically — Source: user request
* Maintain WCAG 2.2 Level AA accessibility compliance for the bilingual implementation — Source: user request

### Derived Objectives

* Install and configure `next-intl` v4.x as the i18n library — Derived from: research finding that `next-intl` is the best-fit library for Next.js 15 App Router with RSC support
* Restructure `src/app/` under a `[locale]` dynamic segment — Derived from: `next-intl` URL prefix routing requires `[locale]` route segment
* Compose i18n middleware with existing HTTP logging middleware — Derived from: existing `src/middleware.ts` must not be broken
* Exclude API routes from locale prefixing — Derived from: API routes serve JSON, not UI
* Add TypeScript augmentation for type-safe translation keys — Derived from: research recommends `AppConfig` interface for autocomplete and compile-time safety
* Follow ADO workflow for branching and work item tracking — Derived from: `.github/instructions/ado-workflow.instructions.md`

## Context Summary

### Project Files

* `src/app/layout.tsx` — Root layout with hardcoded `<html lang="en">`, Geist fonts, skip-to-content link (L1-38)
* `src/app/page.tsx` — Home page with 6 hardcoded English strings (L1-47)
* `src/app/scan/[id]/page.tsx` — Scan results page, Client Component, 3 English strings (L1-78)
* `src/app/crawl/[id]/page.tsx` — Crawl results page, Client Component, cancel feature, English strings (L1-90+)
* `src/middleware.ts` — HTTP logging middleware on `/api/*`, `/scan/*`, `/crawl/*` (L1-28)
* `next.config.ts` — Standalone output, serverExternalPackages list (L1-21)
* `package.json` — Next.js 15.5.12, React 19.1, no i18n libraries (L1-55)
* `src/components/ScanForm.tsx` — Client Component, ~15 English strings
* `src/components/ReportView.tsx` — Server Component, ~12 English strings
* `src/components/ViolationList.tsx` — Client Component, ~10 English strings
* `src/components/ScoreDisplay.tsx` — Server Component, ~8 English strings
* `src/components/ScanProgress.tsx` — Client Component, ~6 English strings
* `src/components/CrawlProgress.tsx` — Client Component, ~10 English strings
* `src/components/SiteScoreDisplay.tsx` — Server Component, ~8 English strings
* `src/components/PageList.tsx` — Server Component, ~6 English strings

### References

* `.copilot-tracking/research/2026-03-11/bilingual-i18n-research.md` — Full i18n research document
* `next-intl` v4.8.3 official documentation — Library API, routing, middleware, RSC patterns
* Next.js 15 App Router official i18n docs (Feb 27, 2026) — URL prefix routing pattern
* W3C WCAG 2.2 Understanding SC 3.1.1 and SC 3.1.2 — Language requirements
* Government of Canada bilingual web patterns — Language switcher design

### Standards References

* #file:../../.github/instructions/wcag22-rules.instructions.md — WCAG 2.2 Level AA rules (SC 3.1.1, SC 3.1.2)
* #file:../../.github/instructions/a11y-remediation.instructions.md — Accessibility remediation patterns
* #file:../../.github/instructions/ado-workflow.instructions.md — ADO workflow for branching and work items

## Implementation Checklist

### [ ] Implementation Phase 1: i18n Infrastructure Setup

<!-- parallelizable: true -->

* [ ] Step 1.1: Install `next-intl` and update `next.config.ts`
  * Details: .copilot-tracking/details/2026-03-11/bilingual-i18n-details.md (Lines 12-58)
* [ ] Step 1.2: Create i18n configuration files (`routing.ts`, `request.ts`, `navigation.ts`)
  * Details: .copilot-tracking/details/2026-03-11/bilingual-i18n-details.md (Lines 60-119)
* [ ] Step 1.3: Create TypeScript augmentation file (`global.d.ts`)
  * Details: .copilot-tracking/details/2026-03-11/bilingual-i18n-details.md (Lines 121-159)
* [ ] Step 1.4: Validate phase — run `npm run build` to confirm config is valid
  * Skip if build conflicts with parallel phases

### [ ] Implementation Phase 2: Translation Files

<!-- parallelizable: true -->

* [ ] Step 2.1: Create `messages/en.json` with ~80 translation keys
  * Details: .copilot-tracking/details/2026-03-11/bilingual-i18n-details.md (Lines 161-280)
* [ ] Step 2.2: Create `messages/fr.json` with French translations
  * Details: .copilot-tracking/details/2026-03-11/bilingual-i18n-details.md (Lines 282-314)
* [ ] Step 2.3: Validate phase — run TypeScript check for translation key types

### [ ] Implementation Phase 3: Routing Restructure and Middleware

<!-- parallelizable: false -->

* [ ] Step 3.1: Create `src/app/[locale]/layout.tsx` with `NextIntlClientProvider` and dynamic `<html lang>`
  * Details: .copilot-tracking/details/2026-03-11/bilingual-i18n-details.md (Lines 316-419)
* [ ] Step 3.2: Convert root `src/app/layout.tsx` to passthrough and `src/app/page.tsx` to redirect
  * Details: .copilot-tracking/details/2026-03-11/bilingual-i18n-details.md (Lines 421-468)
* [ ] Step 3.3: Move page files under `[locale]` segment
  * Details: .copilot-tracking/details/2026-03-11/bilingual-i18n-details.md (Lines 470-505)
* [ ] Step 3.4: Rewrite `src/middleware.ts` to compose i18n routing with HTTP logging
  * Details: .copilot-tracking/details/2026-03-11/bilingual-i18n-details.md (Lines 507-588)
* [ ] Step 3.5: Validate phase — run `npm run build` and verify `/en` and `/fr` routes exist

### [ ] Implementation Phase 4: Component Internationalization

<!-- parallelizable: false -->

* [ ] Step 4.1: Create `LanguageSwitcher` component following Government of Canada pattern
  * Details: .copilot-tracking/details/2026-03-11/bilingual-i18n-details.md (Lines 590-662)
* [ ] Step 4.2: Migrate Home page (`src/app/[locale]/page.tsx`) to use translations
  * Details: .copilot-tracking/details/2026-03-11/bilingual-i18n-details.md (Lines 664-711)
* [ ] Step 4.3: Migrate Scan Results page to use translations
  * Details: .copilot-tracking/details/2026-03-11/bilingual-i18n-details.md (Lines 713-739)
* [ ] Step 4.4: Migrate Crawl Results page to use translations
  * Details: .copilot-tracking/details/2026-03-11/bilingual-i18n-details.md (Lines 741-767)
* [ ] Step 4.5: Migrate Client Components (ScanForm, ScanProgress, CrawlProgress, ViolationList)
  * Details: .copilot-tracking/details/2026-03-11/bilingual-i18n-details.md (Lines 769-814)
* [ ] Step 4.6: Migrate Server Components (ReportView, ScoreDisplay, SiteScoreDisplay, PageList)
  * Details: .copilot-tracking/details/2026-03-11/bilingual-i18n-details.md (Lines 816-851)
* [ ] Step 4.7: Replace `next/link` imports with `@/i18n/navigation` Link across all components
  * Details: .copilot-tracking/details/2026-03-11/bilingual-i18n-details.md (Lines 853-897)

### [ ] Implementation Phase 5: Validation

<!-- parallelizable: false -->

* [ ] Step 5.1: Run full project validation
  * Execute `npm run lint`
  * Execute `npm run build`
  * Execute `npm run test`
* [ ] Step 5.2: Run accessibility tests
  * Execute `npm run test:a11y` (Playwright e2e tests)
  * Verify both `/en` and `/fr` routes pass accessibility scans
* [ ] Step 5.3: Fix minor validation issues
  * Iterate on lint errors and build warnings
  * Apply fixes directly when corrections are straightforward
* [ ] Step 5.4: Report blocking issues
  * Document issues requiring additional research
  * Provide user with next steps and recommended planning
  * Avoid large-scale fixes within this phase

## Planning Log

See [bilingual-i18n-log.md](../logs/2026-03-11/bilingual-i18n-log.md) for discrepancy tracking, implementation paths considered, and suggested follow-on work.

## Dependencies

* `next-intl` v4.x (~v4.8.3) — npm package
* Next.js 15.5.12 App Router — already installed
* Node.js and npm — already available
* French translation content — must be authored or reviewed by a French speaker

## Success Criteria

* All user-facing UI text is available in both English and French — Traces to: user requirement
* Language switching works via URL prefix routing (`/en/...`, `/fr/...`) — Traces to: user requirement, research Scenario 1
* `<html lang>` attribute dynamically reflects the active language — Traces to: user requirement, WCAG SC 3.1.1
* Language switcher is accessible per WCAG 2.2 Level AA (SC 3.1.1, SC 3.1.2, SC 2.1.1, SC 2.4.7, SC 2.5.8) — Traces to: user requirement, research Scenario 2
* API routes (`/api/*`) remain unaffected by locale routing — Traces to: derived objective
* No regression in existing test suites (`npm run test`, `npm run test:a11y`) — Traces to: user requirement (maintain WCAG compliance)
* Build succeeds with `npm run build` — Traces to: derived objective
