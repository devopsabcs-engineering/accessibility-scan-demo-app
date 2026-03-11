<!-- markdownlint-disable-file -->
# Implementation Details: Bilingual French/English UI

## Context Reference

Sources: `.copilot-tracking/research/2026-03-11/bilingual-i18n-research.md`, `next-intl` v4.8.3 docs, WCAG 2.2 SC 3.1.1/3.1.2, Government of Canada bilingual patterns

## Implementation Phase 1: i18n Infrastructure Setup

<!-- parallelizable: true -->

### Step 1.1: Install `next-intl` and update `next.config.ts`

Install the `next-intl` package and wrap the Next.js config with the `next-intl` plugin to enable compiler integration.

**Commands:**

```bash
npm install next-intl
```

**Files:**

* `next.config.ts` — Wrap existing config with `createNextIntlPlugin()`
* `package.json` — `next-intl` added to dependencies (automatic via npm install)

**Code change for `next.config.ts`:**

```typescript
import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: [
    // existing list unchanged
  ],
};

export default withNextIntl(nextConfig);
```

Success criteria:

* `npm install` completes without errors
* `next.config.ts` exports wrapped config
* `npm run build` does not regress

Context references:

* Research document (Lines 200-209) — next.config.ts example
* `next.config.ts` (Lines 1-21) — current config

Dependencies:

* None — first step

### Step 1.2: Create i18n configuration files

Create three configuration files under `src/i18n/` that define locales, routing, and request handling.

**Files:**

* `src/i18n/routing.ts` — NEW: Define supported locales and default locale
* `src/i18n/request.ts` — NEW: Configure server-side locale resolution and message loading
* `src/i18n/navigation.ts` — NEW: Export locale-aware `Link`, `redirect`, `usePathname`, `useRouter`

**`src/i18n/routing.ts`:**

```typescript
import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'fr'],
  defaultLocale: 'en',
});
```

**`src/i18n/request.ts`:**

```typescript
import { getRequestConfig } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
```

**`src/i18n/navigation.ts`:**

```typescript
import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

export const { Link, redirect, usePathname, useRouter } = createNavigation(routing);
```

Success criteria:

* All three files compile without TypeScript errors
* `routing.ts` exports `routing` object with `locales: ['en', 'fr']`

Context references:

* Research document (Lines 210-226) — routing, request, and middleware config examples

Dependencies:

* Step 1.1 (next-intl installed)

### Step 1.3: Create TypeScript augmentation file

Create a global type declaration that augments `next-intl`'s `AppConfig` interface for type-safe translation keys.

**Files:**

* `src/global.d.ts` — NEW: TypeScript augmentation for `next-intl`

**`src/global.d.ts`:**

```typescript
import en from '../messages/en.json';

type Messages = typeof en;

declare module 'next-intl' {
  interface AppConfig {
    Messages: Messages;
  }
}
```

Success criteria:

* TypeScript resolves translation key types from `en.json`
* Invalid keys produce compile-time errors

Context references:

* Research document (Lines 185-186) — TypeScript augmentation reference

Dependencies:

* Step 1.2 (routing files exist)
* Step 2.1 (en.json exists — can be created in parallel if type checking is deferred)

## Implementation Phase 2: Translation Files

<!-- parallelizable: true -->

### Step 2.1: Create `messages/en.json`

Extract all hardcoded English strings from pages and components into a structured JSON file. Organize by page/component namespace.

**Files:**

* `messages/en.json` — NEW: ~80 translation keys

**Structure:**

```json
{
  "Common": {
    "languageSelection": "Language selection",
    "backToHome": "Back to Home",
    "tryAgain": "Try Again",
    "loading": "Loading...",
    "error": "Error",
    "cancel": "Cancel",
    "download": "Download"
  },
  "HomePage": {
    "title": "AODA WCAG 2.2 Accessibility Scanner",
    "subtitle": "Scan a single page or crawl an entire site for WCAG 2.2 Level AA accessibility compliance.",
    "step1Title": "Enter URL",
    "step1Description": "Provide the web page address you want to test.",
    "step2Title": "Automated Scan",
    "step2Description": "We use axe-core + Playwright to test against WCAG 2.2 AA criteria.",
    "step3Title": "Get Report",
    "step3Description": "View your score, violations, and download a PDF report.",
    "footer": "Powered by axe-core and Playwright. Open-source accessibility testing for AODA compliance."
  },
  "ScanForm": {
    "urlLabel": "Website URL",
    "urlPlaceholder": "https://example.com",
    "scanButton": "Scan Page",
    "crawlButton": "Crawl Site",
    "scanning": "Scanning...",
    "crawling": "Crawling...",
    "urlRequired": "Please enter a URL",
    "urlInvalid": "Please enter a valid URL"
  },
  "ScanProgress": {
    "title": "Scanning...",
    "stage_loading": "Loading page...",
    "stage_scanning": "Running accessibility checks...",
    "stage_complete": "Scan complete!"
  },
  "CrawlProgress": {
    "title": "Crawling site...",
    "pagesScanned": "{count, plural, =1 {1 page scanned} other {# pages scanned}}",
    "stage_discovering": "Discovering pages...",
    "stage_scanning": "Scanning pages...",
    "stage_complete": "Crawl complete!",
    "cancelButton": "Cancel Crawl",
    "cancelling": "Cancelling..."
  },
  "ScanResult": {
    "errorTitle": "Scan Error",
    "tryAgain": "Try Again"
  },
  "CrawlResult": {
    "errorTitle": "Crawl Error",
    "tryAgain": "Try Again"
  },
  "ReportView": {
    "title": "Scan Results",
    "url": "URL",
    "scanDate": "Scan Date",
    "violations": "Violations",
    "passes": "Passes",
    "downloadPdf": "Download PDF"
  },
  "ScoreDisplay": {
    "overallScore": "Overall Score",
    "aodaCompliant": "AODA Compliant",
    "aodaNonCompliant": "Not AODA Compliant"
  },
  "SiteScoreDisplay": {
    "siteScore": "Site Score",
    "pagesScanned": "Pages Scanned",
    "averageScore": "Average Score",
    "totalViolations": "Total Violations"
  },
  "ViolationList": {
    "title": "Violations",
    "impact": "Impact",
    "count": "Count",
    "principle": "Principle",
    "noViolations": "No violations found"
  },
  "PageList": {
    "title": "Pages",
    "url": "URL",
    "score": "Score",
    "violations": "Violations"
  },
  "Metadata": {
    "title": "AODA WCAG 2.2 Accessibility Scanner",
    "description": "Scan websites for WCAG 2.2 Level AA accessibility compliance. Get a detailed report with scores, violation details, and AODA compliance status."
  }
}
```

Success criteria:

* JSON is valid and parseable
* Namespaces match component names for easy mapping
* All hardcoded strings from pages and components are extracted

Context references:

* `src/app/page.tsx` (Lines 1-47) — Home page strings
* `src/app/scan/[id]/page.tsx` (Lines 1-78) — Scan result strings
* `src/app/crawl/[id]/page.tsx` (Lines 1-90+) — Crawl result strings
* All 8 components in `src/components/` — Component strings

Dependencies:

* None — can be created independently

### Step 2.2: Create `messages/fr.json`

Create the French translation file with the same structure and keys as `en.json`. Use proper ICU plural rules for French (different from English — French uses `=0 {0 page numérisée} =1 {1 page numérisée} other {# pages numérisées}`).

**Files:**

* `messages/fr.json` — NEW: French translations matching `en.json` structure

**Notes:**

* Technical terms (WCAG, AODA, axe-core, Playwright, PDF, SARIF) remain untranslated
* French plural rules: 0 and 1 are singular, 2+ are plural
* All strings must be reviewed by a French speaker for accuracy
* WCAG SC 3.1.2: The JSON file itself does not need `lang` attributes — those apply to rendered HTML

Success criteria:

* Same keys as `en.json`
* French translations are grammatically correct
* ICU plural rules follow French conventions
* Technical terms are preserved

Context references:

* Research document (Lines 160-167) — ICU message format for French pluralization

Dependencies:

* Step 2.1 (en.json as reference for keys)

## Implementation Phase 3: Routing Restructure and Middleware

<!-- parallelizable: false -->

### Step 3.1: Create `src/app/[locale]/layout.tsx`

Create the new locale-aware layout that becomes the primary layout for all pages. This layout sets `<html lang>` dynamically and wraps children in `NextIntlClientProvider`.

**Files:**

* `src/app/[locale]/layout.tsx` — NEW: Main layout with dynamic lang, fonts, skip-to-content, provider

**Code:**

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import "../globals.css";
import LanguageSwitcher from '@/components/LanguageSwitcher';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });
  return {
    title: t('title'),
    description: t('description'),
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html lang={locale}>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded">
          {locale === 'en' ? 'Skip to main content' : 'Passer au contenu principal'}
        </a>
        <NextIntlClientProvider>
          <header className="flex justify-end p-2">
            <LanguageSwitcher />
          </header>
          <main id="main-content">
            {children}
          </main>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

**WCAG compliance notes:**

* `<html lang={locale}>` satisfies SC 3.1.1 (Language of Page)
* Skip-to-content link preserved (SC 2.4.1)
* `generateStaticParams` enables static rendering for both locales

Discrepancy references:

* DD-01: Skip-to-content link text uses inline conditional instead of translation key for bootstrap ordering

Success criteria:

* `<html lang>` renders `en` for English pages and `fr` for French pages
* `NextIntlClientProvider` wraps all page content
* Metadata (title, description) is localized
* Skip-to-content link present and functional

Context references:

* `src/app/layout.tsx` (Lines 1-38) — Current root layout to replicate
* Research document (Lines 116-135) — Locale layout example

Dependencies:

* Phase 1 complete (next-intl installed and configured)
* Phase 2 in progress (messages files needed for runtime)

### Step 3.2: Convert root layout and page

Reduce the root `src/app/layout.tsx` to a minimal passthrough (required by Next.js) and convert `src/app/page.tsx` to redirect visitors from `/` to `/en`.

**Files:**

* `src/app/layout.tsx` — MODIFIED: Strip to minimal HTML wrapper (no fonts, no skip link)
* `src/app/page.tsx` — MODIFIED: Redirect from `/` to default locale

**Root layout (`src/app/layout.tsx`):**

```tsx
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
```

Note: The root layout becomes a passthrough — all rendering moves to `[locale]/layout.tsx`. The `<html>` and `<body>` tags are rendered in the locale layout.

**Root page (`src/app/page.tsx`):**

```tsx
import { redirect } from 'next/navigation';
import { routing } from '@/i18n/routing';

export default function RootPage() {
  redirect(`/${routing.defaultLocale}`);
}
```

Success criteria:

* Visiting `/` redirects to `/en`
* No duplicate `<html>` or `<body>` tags in rendered output
* Metadata export removed from root layout (moved to locale layout)

Context references:

* `src/app/layout.tsx` (Lines 1-38) — Current root layout
* `src/app/page.tsx` (Lines 1-47) — Current home page

Dependencies:

* Step 3.1 (locale layout exists to receive redirected traffic)

### Step 3.3: Move page files under `[locale]` segment

Move the home page, scan results page, and crawl results page under the `[locale]` directory.

**File operations:**

* `src/app/page.tsx` content → `src/app/[locale]/page.tsx` (NEW)
* `src/app/scan/[id]/page.tsx` → `src/app/[locale]/scan/[id]/page.tsx` (MOVE)
* `src/app/crawl/[id]/page.tsx` → `src/app/[locale]/crawl/[id]/page.tsx` (MOVE)

**Changes in moved files:**

* Add `setRequestLocale(locale)` call at the start of each page (for static rendering)
* Replace `next/link` `Link` with `@/i18n/navigation` `Link` (deferred to Phase 4, Step 4.7)
* Page content remains unchanged at this step — translation comes in Phase 4

**API routes stay in place:**

* `src/app/api/` — NO CHANGE, remains outside `[locale]`

Success criteria:

* `/en`, `/en/scan/[id]`, `/en/crawl/[id]` routes resolve
* `/fr`, `/fr/scan/[id]`, `/fr/crawl/[id]` routes resolve
* `/api/*` routes continue to work unchanged
* No 404 errors on existing routes

Context references:

* `src/app/scan/[id]/page.tsx` (Lines 1-78) — Scan results page
* `src/app/crawl/[id]/page.tsx` (Lines 1-90+) — Crawl results page

Dependencies:

* Step 3.1 (locale layout exists)
* Step 3.2 (root page redirects to locale)

### Step 3.4: Rewrite middleware to compose i18n routing with HTTP logging

Replace the existing middleware with a composed version that handles i18n routing for UI pages and preserves HTTP logging for API routes.

**Files:**

* `src/middleware.ts` — MODIFIED: Compose i18n middleware with logging

**Code:**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';
import { createLogger } from '@/lib/logger';

const log = createLogger('http');
const handleI18nRouting = createMiddleware(routing);

export function middleware(request: NextRequest) {
  const start = Date.now();
  const { method, url } = request;
  const pathname = new URL(url).pathname;

  // Skip i18n for API routes — let them pass through with logging only
  if (pathname.startsWith('/api')) {
    const response = NextResponse.next();
    const duration = Date.now() - start;
    log.info(`${method} ${pathname}`, {
      method,
      pathname,
      status: response.status,
      durationMs: duration,
      userAgent: request.headers.get('user-agent') ?? undefined,
    });
    return response;
  }

  // For UI routes: apply i18n routing (locale detection, redirect)
  const response = handleI18nRouting(request);
  const duration = Date.now() - start;
  log.info(`${method} ${pathname}`, {
    method,
    pathname,
    status: response.status,
    durationMs: duration,
    userAgent: request.headers.get('user-agent') ?? undefined,
  });
  return response;
}

export const config = {
  matcher: ['/((?!_next|_vercel|.*\\..*).*)'],
};
```

**Key changes:**

* Matcher broadened to catch all non-static routes (required by `next-intl`)
* API routes explicitly skip i18n routing
* HTTP logging preserved for all matched routes
* i18n middleware handles locale detection, `Accept-Language` header, redirect

Success criteria:

* `/` redirects to `/en` (or `/fr` based on browser language)
* `/api/scan/123` returns JSON without locale redirect
* HTTP logging works for both API and UI routes
* No middleware errors in server logs

Context references:

* `src/middleware.ts` (Lines 1-28) — Current middleware
* Research document (Lines 227-240) — Middleware composition example

Dependencies:

* Step 1.2 (routing.ts exists)

## Implementation Phase 4: Component Internationalization

<!-- parallelizable: false -->

### Step 4.1: Create LanguageSwitcher component

Create an accessible language switcher following the Government of Canada pattern. Uses `<nav>` with `aria-label`, `lang` on foreign text, and proper `hrefLang`.

**Files:**

* `src/components/LanguageSwitcher.tsx` — NEW: Accessible language switcher

**Code:**

```tsx
'use client';

import { Link, usePathname } from '@/i18n/navigation';
import { useLocale, useTranslations } from 'next-intl';

export default function LanguageSwitcher() {
  const locale = useLocale();
  const t = useTranslations('Common');
  const pathname = usePathname();

  return (
    <nav aria-label={t('languageSelection')}>
      {locale === 'en' ? (
        <Link
          href={pathname}
          locale="fr"
          lang="fr"
          hrefLang="fr"
          className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          Français
        </Link>
      ) : (
        <Link
          href={pathname}
          locale="en"
          lang="en"
          hrefLang="en"
          className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          English
        </Link>
      )}
    </nav>
  );
}
```

**WCAG compliance:**

* SC 3.1.2: `lang="fr"` on "Français", `lang="en"` on "English" — language of parts
* SC 2.1.1: `<a>` element is keyboard accessible
* SC 2.4.7: `focus-visible` outline provides visible focus indicator
* SC 2.5.8: Padding provides 24×24px minimum target size
* SC 2.4.1: Wrapped in `<nav>` with descriptive `aria-label`
* `hrefLang` attribute aids user agents and assistive technology

Success criteria:

* Renders "Français" on English pages, "English" on French pages
* Preserves current pathname when switching (e.g., `/en/scan/123` → `/fr/scan/123`)
* Meets all WCAG target size and focus requirements
* Screen readers announce the nav landmark

Context references:

* Research document (Lines 307-340) — Language switcher pattern and alternatives

Dependencies:

* Phase 1 (i18n infrastructure)
* Phase 3, Step 3.1 (included in locale layout)

### Step 4.2: Migrate Home page to use translations

Replace hardcoded English strings in `src/app/[locale]/page.tsx` with `useTranslations` calls.

**Files:**

* `src/app/[locale]/page.tsx` — MODIFIED: Use `useTranslations('HomePage')` for all strings

**Pattern:**

```tsx
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import ScanForm from '@/components/ScanForm';

export default function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = useTranslations('HomePage');

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center space-y-3">
          <h1 className="text-3xl sm:text-4xl font-bold">{t('title')}</h1>
          <p className="text-gray-600 text-lg">{t('subtitle')}</p>
        </div>
        <ScanForm />
        {/* Steps and footer similarly use t() calls */}
      </div>
    </div>
  );
}
```

Success criteria:

* All 6 hardcoded strings replaced with `t()` calls
* Page renders correctly in both `/en` and `/fr`

Context references:

* `src/app/page.tsx` (Lines 1-47) — Current home page content

Dependencies:

* Phase 2 (translation files exist)
* Phase 3, Step 3.3 (page moved under `[locale]`)

### Step 4.3: Migrate Scan Results page to use translations

Replace hardcoded English strings in the scan results page with translation calls.

**Files:**

* `src/app/[locale]/scan/[id]/page.tsx` — MODIFIED: Use `useTranslations('ScanResult')` and `useTranslations('Common')`

**Key strings to replace:**

* "Scan Error" → `t('errorTitle')`
* "Try Again" → `tCommon('tryAgain')`
* Error message text passed through (dynamic, not translated)

Success criteria:

* All 3 hardcoded strings replaced
* Error state renders correctly in both languages
* `Link` to home uses locale-aware navigation

Context references:

* `src/app/scan/[id]/page.tsx` (Lines 1-78) — Current scan results page

Dependencies:

* Step 4.2 approach established

### Step 4.4: Migrate Crawl Results page to use translations

Replace hardcoded English strings in the crawl results page with translation calls.

**Files:**

* `src/app/[locale]/crawl/[id]/page.tsx` — MODIFIED: Use `useTranslations('CrawlResult')` and `useTranslations('Common')`

**Key strings to replace:**

* "Crawl Error" → `t('errorTitle')`
* "Try Again" → `tCommon('tryAgain')`
* Cancel button text

Success criteria:

* All hardcoded strings replaced
* Cancel functionality preserved
* Both languages render correctly

Context references:

* `src/app/crawl/[id]/page.tsx` (Lines 1-90+) — Current crawl results page

Dependencies:

* Step 4.3 approach established

### Step 4.5: Migrate Client Components

Migrate the 4 Client Components to use `useTranslations`. Client Components in `next-intl` use the same `useTranslations` hook — messages are provided by `NextIntlClientProvider` in the layout.

**Files:**

* `src/components/ScanForm.tsx` — MODIFIED: Use `useTranslations('ScanForm')` (~15 strings)
* `src/components/ScanProgress.tsx` — MODIFIED: Use `useTranslations('ScanProgress')` (~6 strings)
* `src/components/CrawlProgress.tsx` — MODIFIED: Use `useTranslations('CrawlProgress')` (~10 strings, includes ICU plurals)
* `src/components/ViolationList.tsx` — MODIFIED: Use `useTranslations('ViolationList')` (~10 strings)

**Pattern for Client Components:**

```tsx
'use client';
import { useTranslations } from 'next-intl';

export default function ScanForm() {
  const t = useTranslations('ScanForm');
  return <button>{t('scanButton')}</button>;
}
```

**ICU plural example for CrawlProgress:**

```tsx
const t = useTranslations('CrawlProgress');
// In en.json: "pagesScanned": "{count, plural, =1 {1 page scanned} other {# pages scanned}}"
t('pagesScanned', { count: pageCount });
```

Success criteria:

* All hardcoded strings in 4 Client Components replaced with `t()` calls
* ICU plural formatting works for French (0/1 singular, 2+ plural)
* No `'use client'` directive changes needed
* Components render correctly in both languages

Context references:

* Research document (Lines 145-155) — Client Component translation pattern

Dependencies:

* Phase 2 (translation files with matching namespaces)
* Phase 3 (NextIntlClientProvider in layout)

### Step 4.6: Migrate Server Components

Migrate the 4 Server Components to use `useTranslations` (synchronous in RSC context) or `getTranslations` (async).

**Files:**

* `src/components/ReportView.tsx` — MODIFIED: Use `useTranslations('ReportView')` (~12 strings)
* `src/components/ScoreDisplay.tsx` — MODIFIED: Use `useTranslations('ScoreDisplay')` (~8 strings)
* `src/components/SiteScoreDisplay.tsx` — MODIFIED: Use `useTranslations('SiteScoreDisplay')` (~8 strings)
* `src/components/PageList.tsx` — MODIFIED: Use `useTranslations('PageList')` (~6 strings)

**Pattern for Server Components:**

```tsx
import { useTranslations } from 'next-intl';

export default function ScoreDisplay({ score }: Props) {
  const t = useTranslations('ScoreDisplay');
  return <h2>{t('overallScore')}: {score}</h2>;
}
```

Success criteria:

* All hardcoded strings in 4 Server Components replaced
* Server-side rendering works without hydration mismatches
* Components render correctly in both languages

Context references:

* Research document (Lines 137-143) — Server Component translation pattern

Dependencies:

* Phase 2 (translation files)
* Phase 3 (request locale configured)

### Step 4.7: Replace `next/link` with locale-aware navigation

Replace all `import Link from 'next/link'` with `import { Link } from '@/i18n/navigation'` across all pages and components. The locale-aware `Link` automatically prefixes the href with the current locale.

**Files:**

* `src/app/[locale]/scan/[id]/page.tsx` — Update Link import
* `src/app/[locale]/crawl/[id]/page.tsx` — Update Link import
* Any component that uses `next/link` (ScanForm, etc.)

**Pattern:**

```tsx
// Before
import Link from 'next/link';
<Link href="/">Home</Link>

// After
import { Link } from '@/i18n/navigation';
<Link href="/">{t('backToHome')}</Link>
// Renders as /en/ or /fr/ based on current locale
```

**Also replace `useRouter` and `redirect`:**

* `import { useRouter } from 'next/navigation'` → `import { useRouter } from '@/i18n/navigation'`
* `import { redirect } from 'next/navigation'` → `import { redirect } from '@/i18n/navigation'` (in pages only)

Success criteria:

* No remaining `import Link from 'next/link'` in pages or components under `[locale]`
* All internal links preserve locale when navigating
* `router.push('/scan/123')` automatically resolves to `/en/scan/123` or `/fr/scan/123`

Context references:

* Research document (Lines 260-275) — Navigation replacement guidance

Dependencies:

* Step 4.2-4.6 (components already migrated)

## Implementation Phase 5: Validation

<!-- parallelizable: false -->

### Step 5.1: Run full project validation

Execute all validation commands for the project:

* `npm run lint` — ESLint checks across all files
* `npm run build` — Next.js production build with Turbopack
* `npm run test` — Vitest unit tests

### Step 5.2: Run accessibility tests

Execute accessibility-specific validation:

* `npm run test:a11y` — Playwright e2e tests
* Manual verification that `/en` and `/fr` routes both pass
* Verify `<html lang="en">` on English pages and `<html lang="fr">` on French pages
* Verify language switcher has correct `lang` attributes on foreign text

Note: E2e tests may need URL updates for locale prefixes (e.g., `/` → `/en`). This is expected and should be fixed in this phase.

### Step 5.3: Fix minor validation issues

Iterate on lint errors, build warnings, and test failures. Apply fixes directly when corrections are straightforward and isolated.

Expected fixes:

* E2e test URLs updated for locale prefixes
* Import path adjustments for moved files
* Any unused import cleanup

### Step 5.4: Report blocking issues

When validation failures require changes beyond minor fixes:

* Document the issues and affected files
* Provide the user with next steps
* Recommend additional research and planning rather than inline fixes
* Avoid large-scale refactoring within this phase

## Dependencies

* `next-intl` v4.x (~v4.8.3) — npm package for i18n
* Next.js 15.5.12 — already installed
* French translation content — must be authored or reviewed

## Success Criteria

* All user-facing UI text available in English and French
* URL prefix routing works (`/en/...`, `/fr/...`)
* `<html lang>` dynamically matches active language
* Language switcher meets WCAG 2.2 Level AA
* API routes unaffected
* All tests pass
* Build succeeds
