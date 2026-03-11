<!-- markdownlint-disable-file -->
# Task Research: Bilingual French/English UI for Accessibility Scanner

Research the best approach to make the Next.js 15 accessibility scanner application bilingual (French and English) for the web frontend UI.

## Task Implementation Requests

* Add French/English language support to the web UI
* Implement a language switcher for users to toggle between languages
* Translate all user-facing text strings (headings, labels, buttons, status messages, error messages)
* Ensure the `<html lang>` attribute updates dynamically
* Maintain WCAG 2.2 Level AA accessibility compliance for the bilingual implementation

## Scope and Success Criteria

* Scope: Web frontend UI only (not CLI, not PDF reports, not API responses). All user-facing strings in layout, pages, and components.
* Assumptions:
  * Next.js 15.5 App Router with Turbopack is used
  * No existing i18n infrastructure
  * The app uses Tailwind CSS v4, React 19.1, TypeScript 5
  * 8 components and 4 pages with translatable content
  * The app is deployed as a standalone Docker container
  * Existing middleware at `src/middleware.ts` handles HTTP logging
* Success Criteria:
  * All user-facing UI text is available in both English and French
  * Language switching via URL prefix routing (`/en/...`, `/fr/...`)
  * `<html lang>` attribute dynamically reflects the active language
  * Language switcher is accessible per WCAG 2.2 Level AA (SC 3.1.1, 3.1.2)
  * No regression in accessibility compliance
  * API routes (`/api/*`) remain unaffected
  * Implementation follows Next.js 15 App Router best practices

## Outline

1. Next.js App Router i18n approaches (built-in vs libraries)
2. Comparison of i18n libraries (next-intl, next-i18next, react-intl, custom)
3. Routing strategies (prefix-based, cookie-based, subdomain)
4. Translation file management (JSON, ICU messages)
5. Component-level integration patterns (Server vs Client Components)
6. Accessibility requirements for bilingual sites (WCAG 3.1.1, 3.1.2, AODA)
7. Impact on existing middleware
8. Migration path and effort estimation

## Potential Next Research

* Performance profiling of i18n bundle impact
* SEO: `hreflang` link elements and per-locale `sitemap.xml` generation
* Localized `not-found.tsx` error pages
* Whether SARIF/PDF reports should respect UI locale
* E2E test migration for locale-prefixed URLs
* Regional locale variants (`en-CA`, `fr-CA`) vs generic (`en`, `fr`)
* Turbopack compatibility with `next-intl` plugin

## Research Executed

### File Analysis

* `src/app/layout.tsx` (L1-38) — Root layout with hardcoded `<html lang="en">`, Geist fonts, skip-to-content link, `<main>` wrapper
* `src/app/page.tsx` (L1-47) — Home page with 6 hardcoded English strings (title, subtitle, 3 steps, footer)
* `src/app/scan/[id]/page.tsx` (L1-78) — Scan result page with 3 states (scanning/results/error), 3 English strings
* `src/app/crawl/[id]/page.tsx` (L1-80+) — Crawl result page with 3 states, cancel feature, English strings
* `src/components/ScanForm.tsx` (L1-100+) — Client Component with ~15 hardcoded English strings (labels, errors, buttons)
* `src/components/ReportView.tsx` (L1-100+) — Server Component with ~12 English strings (headers, labels, table headings)
* `src/components/ViolationList.tsx` (L1-100+) — Client Component with ~10 English strings (principle names, counts)
* `src/components/ScoreDisplay.tsx` (L1-80+) — Server Component with ~8 English strings (labels, AODA badge)
* `src/components/ScanProgress.tsx` (L1-80) — Client Component with ~6 English strings (stages, messages)
* `src/components/CrawlProgress.tsx` (L1-80+) — Client Component with ~10 English strings (stages, messages)
* `src/components/SiteScoreDisplay.tsx` (L1-120+) — Server Component with ~8 English strings (labels, stats)
* `src/components/PageList.tsx` (L1-80+) — Server Component with ~6 English strings (table headers)
* `src/middleware.ts` (L1-30) — Existing middleware for HTTP logging on `/api/*`, `/scan/*`, `/crawl/*`
* `next.config.ts` (L1-21) — Standalone output, serverExternalPackages list
* `package.json` (L1-55) — Next.js 15.5.12, React 19.1, no i18n libraries installed

### Code Search Results

* No existing i18n setup, translation files, or locale references in the codebase
* All user-facing text is hardcoded English in component JSX
* `<html lang="en">` is hardcoded in `src/app/layout.tsx`
* Middleware matcher covers `/api/:path*`, `/scan/:path*`, `/crawl/:path*`

### External Research

* Next.js 15 App Router official i18n docs (updated Feb 27, 2026)
* `next-intl` v4.8.3 documentation and npm registry
* `next-i18next` v15.4.3 npm registry (Pages Router only)
* `react-intl` v8.1.3 npm registry
* W3C WCAG 2.2 Understanding documents for SC 3.1.1 and SC 3.1.2
* W3C International best practices for language switching
* Government of Canada bilingual web patterns
* CAN/ASC - EN 301 549:2024 standard

### Project Conventions

* Standards referenced: WCAG 2.2 Level AA, AODA compliance
* Instructions followed: ado-workflow, wcag22-rules, a11y-remediation
* From `wcag22-rules.instructions.md`: SC 3.1.1 requires `lang` on `<html>`; SC 3.1.2 requires `lang` on parts in different language
* From `a11y-remediation.instructions.md`: `html-has-lang` fix pattern exists

## Key Discoveries

### Project Structure

The application is a Next.js 15.5 App Router project with:

* **4 pages**: Home, Scan Results, Crawl Results (+ API routes that stay outside i18n)
* **8 components**: ScanForm, ReportView, ViolationList, ScoreDisplay, ScanProgress, CrawlProgress, SiteScoreDisplay, PageList
* **~80+ translatable strings** across all pages and components
* **Mix of Server and Client Components**: 4 Client Components (`'use client'`), 4 Server Components
* **Existing middleware**: HTTP logging that must be composed with i18n middleware

### Implementation Patterns

**Next.js App Router has NO built-in i18n routing**. Unlike the Pages Router, the App Router requires either a library or manual implementation using `[locale]` dynamic segments + middleware.

**`next-intl` is the clear best choice** among i18n libraries:
* First library listed in official Next.js i18n docs
* 1.6M weekly npm downloads, v4.8.3, actively maintained
* First-class App Router/RSC support for both Server and Client Components
* ICU message format supports French pluralization rules
* Two modes: URL prefix routing and cookie-based (no URL change)
* TypeScript augmentation for type-safe translation keys

**`next-i18next` is NOT compatible** with App Router — it depends on Pages Router APIs.

**`react-intl`** is mature but has no Next.js-specific integration — requires extensive manual wiring.

### WCAG Accessibility Requirements

* **SC 3.1.1 Language of Page (Level A)**: `<html lang>` must dynamically match the page language. Current hardcoded `lang="en"` must become `lang={locale}`.
* **SC 3.1.2 Language of Parts (Level AA)**: Language switcher text ("Français" on English pages) must have `lang="fr"`. Technical terms (WCAG, AODA, axe-core) are exempt.
* **Language switcher pattern**: W3C recommends simple links (not `<select>`) for bilingual sites. Wrap in `<nav>` with `aria-label` in current page language. Government of Canada uses exactly this pattern.
* **Screen readers auto-switch**: JAWS/NVDA automatically switch pronunciation engines based on `lang` attributes. No explicit ARIA live announcement needed for full page navigations.
* **AODA does not mandate French**: French support is a feature requirement, not an AODA requirement. Both language versions must independently meet WCAG 2.2 AA.

### Complete Examples

**Accessible Language Switcher (Government of Canada pattern):**

```tsx
function LanguageSwitcher({ locale }: { locale: 'en' | 'fr' }) {
  return (
    <nav aria-label={locale === 'en' ? 'Language selection' : 'Sélection de la langue'}>
      {locale === 'en' ? (
        <a href="/fr" lang="fr" hrefLang="fr">Français</a>
      ) : (
        <a href="/en" lang="en" hrefLang="en">English</a>
      )}
    </nav>
  );
}
```

**Locale-Aware Layout:**

```tsx
// src/app/[locale]/layout.tsx
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { setRequestLocale } from 'next-intl/server';

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

**Translation usage in Server Component:**

```tsx
import { useTranslations } from 'next-intl';

export default function Home() {
  const t = useTranslations('HomePage');
  return <h1>{t('title')}</h1>;
}
```

**Translation usage in Client Component:**

```tsx
'use client';
import { useTranslations } from 'next-intl';

export default function ScanForm() {
  const t = useTranslations('ScanForm');
  return <button>{t('scanButton')}</button>;
}
```

### API and Schema Documentation

* `next-intl` APIs: `useTranslations` (sync), `getTranslations` (async server), `useFormatter` (dates/numbers), `useLocale`, `useRouter`, `Link`, `redirect`
* ICU message syntax: `{count, plural, =1 {1 issue} other {# issues}}` for pluralization
* TypeScript augmentation via `AppConfig` interface for type-safe keys

### Configuration Examples

**next.config.ts:**

```typescript
import createNextIntlPlugin from 'next-intl/plugin';
const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
```

**src/i18n/routing.ts:**

```typescript
import { defineRouting } from 'next-intl/routing';
export const routing = defineRouting({ locales: ['en', 'fr'], defaultLocale: 'en' });
```

**Middleware composition:**

```typescript
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

const handleI18nRouting = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  if (pathname.startsWith('/api')) return NextResponse.next(); // skip i18n for API
  return handleI18nRouting(request); // locale detection + redirect
}

export const config = { matcher: ['/((?!_next|_vercel|.*\\..*).*)'] };
```

## Technical Scenarios

### Scenario 1: `next-intl` with URL Prefix Routing (Selected Approach)

Use `next-intl` v4.x with URL prefix routing (`/en/...`, `/fr/...`) and the `[locale]` dynamic route segment.

**Requirements:**

* URL prefixes for each language (`/en/scan/123`, `/fr/scan/123`)
* Dynamic `<html lang>` attribute
* Middleware for locale detection and redirection
* API routes excluded from locale prefixing
* Mix of Server and Client Component translation support

**Preferred Approach:**

* Install `next-intl`, create 3 config files (`routing.ts`, `request.ts`, `navigation.ts`)
* Restructure `src/app/` to add `[locale]` segment
* Create `messages/en.json` and `messages/fr.json` with ~80 translation keys
* Compose i18n middleware with existing HTTP logging middleware
* Add language switcher component following Government of Canada pattern

```text
src/
  i18n/
    routing.ts          (NEW)
    request.ts          (NEW)
    navigation.ts       (NEW)
  app/
    layout.tsx          (MODIFIED — passthrough)
    page.tsx            (MODIFIED — redirect to /en)
    [locale]/
      layout.tsx        (NEW — main layout with NextIntlClientProvider)
      page.tsx          (MOVED from app/page.tsx)
      scan/[id]/
        page.tsx        (MOVED from app/scan/[id]/page.tsx)
      crawl/[id]/
        page.tsx        (MOVED from app/crawl/[id]/page.tsx)
    api/                (NO CHANGE — stays outside [locale])
  components/
    LanguageSwitcher.tsx (NEW)
  global.d.ts           (NEW — TypeScript augmentation)
messages/
  en.json               (NEW — ~80 translation keys)
  fr.json               (NEW — ~80 translation keys)
```

```mermaid
graph TD
  A[User visits /] --> B{Middleware}
  B -->|Accept-Language: fr| C[Redirect to /fr]
  B -->|Accept-Language: en or default| D[Redirect to /en]
  C --> E[/fr/layout.tsx<br>html lang=fr]
  D --> F[/en/layout.tsx<br>html lang=en]
  E --> G[French UI]
  F --> H[English UI]
  G --> I[Language Switcher → /en]
  H --> J[Language Switcher → /fr]
  K[API request /api/scan] --> L{Middleware}
  L -->|Skip i18n| M[API handler]
```

**Implementation Details:**

1. **Phase 1 — Infrastructure**: Install `next-intl`, create config files, update `next.config.ts`
2. **Phase 2 — Routing**: Restructure `src/app/` under `[locale]`, update middleware
3. **Phase 3 — Components**: Migrate 8 components incrementally (page by page)
4. **Phase 4 — Navigation**: Replace `next/link` with `@/i18n/navigation` Link
5. **Phase 5 — Testing**: Update e2e tests, verify both locales

**Scope**: ~5 new files, ~3 modified files, 8 component updates, 2 JSON translation files

#### Considered Alternatives

**Alternative A: Custom Solution (No Library)**

The official Next.js docs describe a minimal custom approach using `[lang]` dynamic segments, JSON dictionaries, and manual middleware. This was rejected because:

* No ICU message format (no built-in pluralization — critical for French plural rules)
* No TypeScript autocomplete for translation keys
* Manual middleware and navigation helpers required
* Date/number formatting must be implemented manually
* Higher maintenance burden for the project team
* Suitable only for very simple cases (<50 translation keys)

**Alternative B: `react-intl` (FormatJS)**

Mature library with 2.1M weekly npm downloads and full ICU support. Rejected because:

* No Next.js-specific integration (no middleware, routing, or RSC APIs)
* Provider-based design conflicts with Server Components pattern
* Requires extensive manual wiring for locale routing and detection
* Significantly more implementation effort than `next-intl`

**Alternative C: `i18next` + `react-i18next` (Direct)**

Recommended by `next-i18next` for App Router projects. Rejected because:

* No built-in Next.js middleware or routing support
* Requires manual composition of middleware, routing, and RSC support
* `next-intl` provides all i18next capabilities with better Next.js integration

**Alternative D: Cookie-Based Locale (No URL Prefix)**

`next-intl` supports a "without i18n routing" mode using cookies/headers. Rejected because:

* Poor SEO — search engines cannot index separate language versions
* Violates WCAG best practices — language not discoverable from URL
* Users cannot share or bookmark language-specific links
* CDN caching complications (vary by cookie)

**Alternative E: Subdomain-Based (`en.example.com`, `fr.example.com`)**

Rejected as overkill for 2 languages:

* Requires DNS and SSL configuration per subdomain
* Hard to test locally; development complexity
* Significant changes to Docker deployment
* No benefit over URL prefixes for a bilingual site

### Scenario 2: Language Switcher Design

**Requirements:**

* Accessible per WCAG 2.2 Level AA (SC 3.1.2, SC 2.1.1, SC 2.4.7, SC 2.5.8)
* Simple link pattern (not `<select>`)
* `lang` attribute on foreign language text
* Positioned consistently in header/top-right

**Preferred Approach:**

Follow the Government of Canada pattern — a single `<nav>` with a link to the other language:

```tsx
import { Link } from '@/i18n/navigation';
import { useLocale, useTranslations } from 'next-intl';

export default function LanguageSwitcher() {
  const locale = useLocale();
  const t = useTranslations('Common');

  return (
    <nav aria-label={t('languageSelection')}>
      {locale === 'en' ? (
        <Link href="/" locale="fr" lang="fr" hrefLang="fr"
              className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:underline">
          Français
        </Link>
      ) : (
        <Link href="/" locale="en" lang="en" hrefLang="en"
              className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:underline">
          English
        </Link>
      )}
    </nav>
  );
}
```

#### Considered Alternatives

* **`<select>` dropdown**: Rejected per W3C guidance — links are preferred for bilingual sites
* **Toggle button**: Rejected — links provide clearer semantics and better screen reader behavior
* **Showing both languages with current highlighted**: Viable but unnecessary for 2-language site
