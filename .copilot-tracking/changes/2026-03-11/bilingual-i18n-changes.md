<!-- markdownlint-disable-file -->
# Release Changes: Bilingual French/English UI

**Related Plan**: bilingual-i18n-plan.instructions.md
**Implementation Date**: 2026-03-11

## Summary

Add French/English bilingual support to the Next.js 15 web UI using `next-intl` with URL prefix routing, a language switcher, and dynamic `<html lang>`.

## Changes

### Added

* `src/i18n/routing.ts` — Locale routing definition (en, fr) with en as default
* `src/i18n/request.ts` — Server-side request config with dynamic message loading
* `src/i18n/navigation.ts` — Locale-aware navigation exports (Link, redirect, usePathname, useRouter)
* `src/global.d.ts` — TypeScript augmentation for type-safe translation keys via next-intl AppConfig
* `messages/en.json` — English translation file with 152 keys across 14 namespaces
* `messages/fr.json` — French translation file with 152 keys, Canadian French, proper ICU plural rules
* `src/app/[locale]/layout.tsx` — Locale-aware layout with NextIntlClientProvider, dynamic html lang, skip-to-content, LanguageSwitcher
* `src/app/[locale]/page.tsx` — Home page under locale segment
* `src/app/[locale]/scan/[id]/page.tsx` — Scan results page under locale segment
* `src/app/[locale]/crawl/[id]/page.tsx` — Crawl results page under locale segment
* `src/components/LanguageSwitcher.tsx` — Placeholder language switcher (to be implemented in Phase 4)

### Modified

* `next.config.ts` — Wrapped export with createNextIntlPlugin() for next-intl compiler integration
* `package.json` — Added next-intl dependency
* `src/app/layout.tsx` — Converted to passthrough (html/body rendered in locale layout)
* `src/app/page.tsx` — Converted to redirect to /en default locale
* `src/middleware.ts` — Composed i18n middleware with HTTP logging, API routes bypass i18n

* `src/components/LanguageSwitcher.tsx` — Full accessible language switcher with lang, hrefLang, aria-label, focus-visible
* `src/app/[locale]/page.tsx` — Home page uses getTranslations for all strings
* `src/app/[locale]/scan/[id]/page.tsx` — Scan results uses useTranslations, Link from i18n/navigation
* `src/app/[locale]/crawl/[id]/page.tsx` — Crawl results uses useTranslations, translated 15+ strings
* `src/components/ScanForm.tsx` — Translated 10+ strings, useRouter from i18n/navigation
* `src/components/ScanProgress.tsx` — Translated title, stages, aria-labels, error messages
* `src/components/CrawlProgress.tsx` — Translated title, stages, page counts, aria-labels
* `src/components/ViolationList.tsx` — Translated title, principle labels, issue/element counts
* `src/components/ReportView.tsx` — Translated all headings, labels, AODA description, Link from i18n/navigation
* `src/components/ScoreDisplay.tsx` — Translated score label, grade, badges, stats, sr-only text
* `src/components/SiteScoreDisplay.tsx` — Translated score label, grade, page count, stats, sr-only text
* `src/components/PageList.tsx` — Translated title, column headers, empty state

### Removed

* `src/app/scan/[id]/page.tsx` — Moved to src/app/[locale]/scan/[id]/page.tsx
* `src/app/crawl/[id]/page.tsx` — Moved to src/app/[locale]/crawl/[id]/page.tsx

## Additional or Deviating Changes

## Release Summary

Total files affected: 22 (8 added, 14 modified, 2 removed)

### Files Created

* `src/i18n/routing.ts` — Locale routing definition (en, fr)
* `src/i18n/request.ts` — Server-side request config with dynamic message loading
* `src/i18n/navigation.ts` — Locale-aware navigation exports
* `src/global.d.ts` — TypeScript augmentation for type-safe translation keys
* `messages/en.json` — English translation file (152 keys, 14 namespaces)
* `messages/fr.json` — French translation file (152 keys, Canadian French)
* `src/app/[locale]/layout.tsx` — Locale-aware layout with dynamic html lang
* `src/app/[locale]/page.tsx` — Home page under locale segment

### Files Modified

* `next.config.ts` — Wrapped with createNextIntlPlugin()
* `package.json` — Added next-intl dependency
* `src/app/layout.tsx` — Converted to passthrough
* `src/app/page.tsx` — Converted to redirect to /en
* `src/middleware.ts` — Composed i18n middleware with HTTP logging
* `src/components/LanguageSwitcher.tsx` — Accessible language switcher (WCAG SC 3.1.2, 2.1.1, 2.4.7)
* `src/components/ScanForm.tsx` — Translated 15+ strings, useRouter from i18n/navigation
* `src/components/ScanProgress.tsx` — Translated title, stages, aria-labels
* `src/components/CrawlProgress.tsx` — Translated title, stages, page counts
* `src/components/ViolationList.tsx` — Translated title, principle labels, issue counts
* `src/components/ReportView.tsx` — Translated headings, labels, AODA description
* `src/components/ScoreDisplay.tsx` — Translated score label, grade, badges, stats
* `src/components/SiteScoreDisplay.tsx` — Translated score label, page count, stats
* `src/components/PageList.tsx` — Translated title, column headers, empty state

### Files Moved

* `src/app/scan/[id]/page.tsx` → `src/app/[locale]/scan/[id]/page.tsx`
* `src/app/crawl/[id]/page.tsx` → `src/app/[locale]/crawl/[id]/page.tsx`

### Dependencies

* Added: `next-intl` v4.x

### Deployment Notes

* URL structure changed: all UI routes now use `/en/` or `/fr/` prefix
* API routes (`/api/*`) are unchanged
* Root `/` redirects to `/en` by default
* `<html lang>` attribute dynamically reflects active language
