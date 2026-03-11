# next-intl Implementation Research for Next.js 15 App Router

## Status: Complete

## Research Topics

1. next-intl setup for Next.js 15 App Router
2. File structure and translation files
3. Server Components vs Client Components
4. Routing structure
5. Dynamic content translation
6. Migration path

---

## 1. Installation and Configuration

### 1.1 Install

```bash
npm install next-intl
```

### 1.2 File Structure Overview (with i18n routing)

```text
├── messages/
│   ├── en.json
│   └── fr.json
├── next.config.ts
└── src/
    ├── i18n/
    │   ├── routing.ts
    │   ├── request.ts
    │   └── navigation.ts
    ├── middleware.ts          # Next.js 15 uses middleware.ts (proxy.ts is for Next.js 16+)
    └── app/
        ├── layout.tsx         # Minimal root layout (passthrough)
        └── [locale]/
            ├── layout.tsx     # Locale-aware layout with NextIntlClientProvider
            ├── page.tsx       # Home page
            ├── scan/
            │   └── [id]/
            │       └── page.tsx
            └── crawl/
                └── [id]/
                    └── page.tsx
```

### 1.3 `src/i18n/routing.ts` — Central Routing Configuration

```typescript
import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'fr'],
  defaultLocale: 'en',
});
```

### 1.4 `src/i18n/navigation.ts` — Locale-Aware Navigation APIs

```typescript
import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

// Lightweight wrappers around Next.js' navigation APIs
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
```

### 1.5 `src/i18n/request.ts` — Server-Side Request Configuration

```typescript
import { getRequestConfig } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
```

### 1.6 `next.config.ts` — Plugin Integration

The `createNextIntlPlugin` wraps the Next.js config and links `i18n/request.ts` automatically.

**Before:**

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: [/* existing packages */],
};

export default nextConfig;
```

**After:**

```typescript
import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: [/* existing packages */],
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
```

### 1.7 `src/middleware.ts` — Composing i18n Middleware with Existing Logging

> **Critical finding:** In Next.js 15.x, the file is called `middleware.ts`. The docs reference `proxy.ts` but that's for Next.js 16+.

The existing middleware does HTTP logging. The `next-intl` middleware handles locale negotiation, redirects, and rewrites. They must be composed:

**Before (current):**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';

const log = createLogger('http');

export function middleware(request: NextRequest) {
  const start = Date.now();
  const { method, url } = request;
  const pathname = new URL(url).pathname;
  const response = NextResponse.next();
  const duration = Date.now() - start;
  log.info(`${method} ${pathname}`, { method, pathname, status: response.status, durationMs: duration, userAgent: request.headers.get('user-agent') ?? undefined });
  return response;
}

export const config = {
  matcher: ['/api/:path*', '/scan/:path*', '/crawl/:path*'],
};
```

**After (composed):**

```typescript
import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';
import { createLogger } from '@/lib/logger';

const log = createLogger('http');
const handleI18nRouting = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  const start = Date.now();
  const { method, url } = request;
  const pathname = new URL(url).pathname;

  // API routes: skip i18n, only log
  if (pathname.startsWith('/api')) {
    const response = NextResponse.next();
    const duration = Date.now() - start;
    log.info(`${method} ${pathname}`, { method, pathname, status: response.status, durationMs: duration, userAgent: request.headers.get('user-agent') ?? undefined });
    return response;
  }

  // All other routes: run i18n middleware, then log
  const response = handleI18nRouting(request);
  const duration = Date.now() - start;
  log.info(`${method} ${pathname}`, { method, pathname, status: response.status, durationMs: duration, userAgent: request.headers.get('user-agent') ?? undefined });
  return response;
}

export const config = {
  matcher: ['/((?!_next|_vercel|.*\\..*).*)'],
};
```

**Key points on middleware composition:**
- `createMiddleware(routing)` returns `(request: NextRequest) => NextResponse`
- You can call it conditionally (e.g., skip for `/api` routes)
- The matcher must cover both i18n pages and API paths if you want logging on both
- The matcher `/((?!_next|_vercel|.*\\..*).*)` excludes static files and Next.js internals

---

## 2. Translation File Structure

### 2.1 Location

Translation files live in `messages/` at the project root (sibling to `src/`):

```text
messages/
├── en.json
└── fr.json
```

### 2.2 Recommended Key Structure (Namespaced by Component/Page)

```json
// messages/en.json
{
  "Metadata": {
    "title": "AODA WCAG 2.2 Accessibility Scanner",
    "description": "Scan websites for WCAG 2.2 Level AA accessibility compliance."
  },
  "HomePage": {
    "title": "AODA WCAG 2.2 Accessibility Scanner",
    "subtitle": "Scan a single page or crawl an entire site for WCAG 2.2 Level AA accessibility compliance.",
    "steps": {
      "enterUrl": {
        "title": "Enter URL",
        "description": "Provide the web page address you want to test."
      },
      "automatedScan": {
        "title": "Automated Scan",
        "description": "We use axe-core + Playwright to test against WCAG 2.2 AA criteria."
      },
      "getReport": {
        "title": "Get Report",
        "description": "View your score, violations, and download a PDF report."
      }
    },
    "footer": "Powered by axe-core and Playwright. Open-source accessibility testing for AODA compliance."
  },
  "ScanForm": {
    "modeLabel": "Scan mode",
    "singlePage": "Single Page",
    "siteWideCrawl": "Site-Wide Crawl",
    "urlLabel": "Website URL",
    "urlHelpSingle": "Enter the full URL of the page you want to scan for accessibility issues.",
    "urlHelpCrawl": "Enter the root URL of the site to crawl and scan for accessibility issues.",
    "urlPlaceholder": "https://www.example.com",
    "scanButton": "Scan Now",
    "crawlButton": "Start Crawl",
    "scanning": "Scanning…",
    "crawling": "Starting Crawl…",
    "maxPages": "Max pages",
    "maxDepth": "Max depth",
    "errorEmpty": "Please enter a URL.",
    "errorInvalid": "Please enter a valid URL (e.g., https://www.example.com).",
    "errorProtocol": "Only HTTP and HTTPS URLs are supported.",
    "errorNetwork": "Network error. Please try again.",
    "errorScanFailed": "Failed to start scan.",
    "errorCrawlFailed": "Failed to start crawl."
  },
  "ScanProgress": {
    "title": "Scanning in Progress",
    "connectionLost": "Connection to scan lost. Please refresh the page."
  },
  "CrawlProgress": {
    "title": "Site Crawl in Progress",
    "initializing": "Initializing crawl...",
    "discovering": "Discovering pages...",
    "scanning": "Scanning pages...",
    "aggregating": "Aggregating results...",
    "complete": "Crawl complete!",
    "cancelled": "Crawl was cancelled.",
    "pagesScanned": "{completed} of {total} pages scanned",
    "failedPages": "{count, plural, =0 {} =1 {1 page failed} other {# pages failed}}",
    "cancelButton": "Cancel Crawl",
    "cancelling": "Cancelling..."
  },
  "ReportView": {
    "title": "WCAG 2.2 Level AA Accessibility Report",
    "scannedOn": "Scanned on {date} · Engine: {engine}",
    "violationSummary": "{count} violations across {elements} elements",
    "downloadPdf": "Download PDF Report",
    "scanAnother": "Scan Another URL",
    "executiveSummary": "Executive Summary",
    "issueSummary": "Issue Summary",
    "impactLevel": "Impact Level",
    "failed": "Failed",
    "passed": "Passed",
    "passedRules": "Passed Rules ({count})"
  },
  "ScoreDisplay": {
    "scoreLabel": "Accessibility score: {score} out of 100, grade {grade}",
    "grade": "Grade {grade}",
    "aodaCompliant": "AODA Compliant",
    "needsRemediation": "Needs Remediation",
    "violations": "Violations",
    "violationElements": "({count} elements)",
    "passedLabel": "Passed",
    "needsReview": "Needs Review",
    "wcagPrinciples": "WCAG Principles"
  },
  "ViolationList": {
    "title": "Violations ({count})",
    "noViolations": "No violations found. Great job!",
    "issueCount": "{count, plural, =1 {1 issue} other {# issues}}",
    "elementsAffected": "{count, plural, =1 {1 element} other {# elements}} affected",
    "moreElements": "...and {count} more elements",
    "learnMore": "Learn more about {rule}",
    "perceivable": "Perceivable",
    "operable": "Operable",
    "understandable": "Understandable",
    "robust": "Robust",
    "bestPractice": "Best Practice"
  },
  "SiteScoreDisplay": {
    "scoreLabel": "Site accessibility score: {score} out of 100, grade {grade}",
    "pagesScanned": "{count, plural, =1 {1 page scanned} other {# pages scanned}}",
    "aodaCompliant": "AODA Compliant",
    "needsRemediation": "Needs Remediation"
  },
  "PageList": {
    "title": "Page Results ({count} pages)",
    "url": "URL",
    "score": "Score",
    "grade": "Grade",
    "violations": "Violations",
    "status": "Status"
  },
  "ScanResultPage": {
    "errorTitle": "Scan Error",
    "tryAgain": "Try Again"
  },
  "CrawlResultPage": {
    "errorTitle": "Crawl Error",
    "tryAgain": "Try Again",
    "siteReport": "Site-Wide Accessibility Report",
    "downloadPdf": "Download PDF Report",
    "crawlAnother": "Crawl Another Site"
  },
  "Common": {
    "skipToContent": "Skip to main content",
    "critical": "critical",
    "serious": "serious",
    "moderate": "moderate",
    "minor": "minor"
  }
}
```

### 2.3 French Translation Example (Partial)

```json
// messages/fr.json
{
  "Metadata": {
    "title": "Scanneur d'accessibilité LAPHO WCAG 2.2",
    "description": "Analysez les sites Web pour la conformité d'accessibilité WCAG 2.2 Niveau AA."
  },
  "HomePage": {
    "title": "Scanneur d'accessibilité LAPHO WCAG 2.2",
    "subtitle": "Analysez une seule page ou explorez un site entier pour la conformité d'accessibilité WCAG 2.2 Niveau AA.",
    "steps": {
      "enterUrl": {
        "title": "Entrer l'URL",
        "description": "Fournissez l'adresse de la page Web que vous souhaitez tester."
      },
      "automatedScan": {
        "title": "Analyse automatisée",
        "description": "Nous utilisons axe-core + Playwright pour tester selon les critères WCAG 2.2 AA."
      },
      "getReport": {
        "title": "Obtenir le rapport",
        "description": "Consultez votre score, les violations et téléchargez un rapport PDF."
      }
    },
    "footer": "Propulsé par axe-core et Playwright. Tests d'accessibilité open-source pour la conformité LAPHO."
  },
  "ScanForm": {
    "modeLabel": "Mode d'analyse",
    "singlePage": "Page unique",
    "siteWideCrawl": "Exploration du site",
    "urlLabel": "URL du site Web",
    "urlHelpSingle": "Entrez l'URL complète de la page que vous souhaitez analyser pour les problèmes d'accessibilité.",
    "urlHelpCrawl": "Entrez l'URL racine du site à explorer et analyser pour les problèmes d'accessibilité.",
    "urlPlaceholder": "https://www.exemple.com",
    "scanButton": "Analyser maintenant",
    "crawlButton": "Démarrer l'exploration",
    "scanning": "Analyse en cours…",
    "crawling": "Démarrage de l'exploration…",
    "maxPages": "Pages maximum",
    "maxDepth": "Profondeur maximum",
    "errorEmpty": "Veuillez entrer une URL.",
    "errorInvalid": "Veuillez entrer une URL valide (ex. : https://www.exemple.com).",
    "errorProtocol": "Seules les URL HTTP et HTTPS sont prises en charge.",
    "errorNetwork": "Erreur réseau. Veuillez réessayer.",
    "errorScanFailed": "Échec du démarrage de l'analyse.",
    "errorCrawlFailed": "Échec du démarrage de l'exploration."
  },
  "ViolationList": {
    "title": "Violations ({count})",
    "noViolations": "Aucune violation trouvée. Excellent travail !",
    "issueCount": "{count, plural, =1 {1 problème} other {# problèmes}}",
    "elementsAffected": "{count, plural, =1 {1 élément} other {# éléments}} affecté(s)",
    "moreElements": "...et {count} éléments supplémentaires",
    "learnMore": "En savoir plus sur {rule}",
    "perceivable": "Perceptible",
    "operable": "Utilisable",
    "understandable": "Compréhensible",
    "robust": "Robuste",
    "bestPractice": "Bonne pratique"
  },
  "ReportView": {
    "title": "Rapport d'accessibilité WCAG 2.2 Niveau AA",
    "scannedOn": "Analysé le {date} · Moteur : {engine}",
    "violationSummary": "{count} violations sur {elements} éléments",
    "downloadPdf": "Télécharger le rapport PDF",
    "scanAnother": "Analyser une autre URL",
    "executiveSummary": "Résumé exécutif",
    "issueSummary": "Résumé des problèmes",
    "impactLevel": "Niveau d'impact",
    "failed": "Échoué",
    "passed": "Réussi",
    "passedRules": "Règles réussies ({count})"
  },
  "Common": {
    "skipToContent": "Aller au contenu principal",
    "critical": "critique",
    "serious": "grave",
    "moderate": "modéré",
    "minor": "mineur"
  }
}
```

---

## 3. Server Components vs Client Components

### 3.1 API Summary

| Environment | Hook/Function | Import |
|---|---|---|
| Non-async Server Component | `useTranslations('Namespace')` | `from 'next-intl'` |
| Async Server Component | `const t = await getTranslations('Namespace')` | `from 'next-intl/server'` |
| Client Component (`'use client'`) | `useTranslations('Namespace')` | `from 'next-intl'` (requires `NextIntlClientProvider` ancestor) |
| Async metadata | `const t = await getTranslations({locale, namespace})` | `from 'next-intl/server'` |

### 3.2 Non-Async Server Component Example (HomePage)

Works automatically as a Server Component — `useTranslations` detects the environment:

```tsx
// src/app/[locale]/page.tsx
import { useTranslations } from 'next-intl';
import ScanForm from '@/components/ScanForm';

export default function Home() {
  const t = useTranslations('HomePage');

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center space-y-3">
          <h1 className="text-3xl sm:text-4xl font-bold">{t('title')}</h1>
          <p className="text-gray-600 text-lg">{t('subtitle')}</p>
        </div>
        <ScanForm />
        <ol className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8 border-t list-none p-0 m-0">
          <li className="text-center space-y-2">
            <div className="text-2xl" aria-hidden="true">1</div>
            <h2 className="font-medium">{t('steps.enterUrl.title')}</h2>
            <p className="text-sm text-gray-600">{t('steps.enterUrl.description')}</p>
          </li>
          <li className="text-center space-y-2">
            <div className="text-2xl" aria-hidden="true">2</div>
            <h2 className="font-medium">{t('steps.automatedScan.title')}</h2>
            <p className="text-sm text-gray-600">{t('steps.automatedScan.description')}</p>
          </li>
          <li className="text-center space-y-2">
            <div className="text-2xl" aria-hidden="true">3</div>
            <h2 className="font-medium">{t('steps.getReport.title')}</h2>
            <p className="text-sm text-gray-600">{t('steps.getReport.description')}</p>
          </li>
        </ol>
        <p className="text-center text-xs text-gray-600 pt-4">{t('footer')}</p>
      </div>
    </div>
  );
}
```

### 3.3 Client Component Example (ScanForm)

For Client Components marked `'use client'`, four options exist (in performance order):

**Option 1 (Best): Pass translated props from Server Component parent**

```tsx
// Parent Server Component passes translated strings
<ScanForm labels={{ scanButton: t('ScanForm.scanButton'), ... }} />
```

**Option 2: Use `useTranslations` directly in Client Component**

This works because `NextIntlClientProvider` in the locale layout makes messages available:

```tsx
'use client';
import { useTranslations } from 'next-intl';

export default function ScanForm() {
  const t = useTranslations('ScanForm');
  // ...
  return (
    <form>
      <label>{t('urlLabel')}</label>
      <button>{loading ? t('scanning') : t('scanButton')}</button>
    </form>
  );
}
```

**Option 3: Provide subset of messages via nested `NextIntlClientProvider`**

```tsx
import pick from 'lodash/pick';
import { NextIntlClientProvider, useMessages } from 'next-intl';

export default function ScanFormWrapper() {
  const messages = useMessages();
  return (
    <NextIntlClientProvider messages={pick(messages, 'ScanForm')}>
      <ScanForm />
    </NextIntlClientProvider>
  );
}
```

**Option 4 (Simplest): Provide all messages (default)**

When `NextIntlClientProvider` is in the root layout without explicit `messages` prop, it automatically inherits all messages from the server config. This is the default behavior and fine for most apps.

### 3.4 Locale-Aware Layout

```tsx
// src/app/[locale]/layout.tsx
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { setRequestLocale } from 'next-intl/server';
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  return (
    <html lang={locale}>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <NextIntlClientProvider>
          <a href="#main-content" className="sr-only focus:not-sr-only ...">
            Skip to main content
          </a>
          <main id="main-content">{children}</main>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

---

## 4. Routing Structure Changes

### 4.1 Directory Restructure

| Before | After |
|---|---|
| `src/app/layout.tsx` | `src/app/layout.tsx` (minimal passthrough) + `src/app/[locale]/layout.tsx` (main layout) |
| `src/app/page.tsx` | `src/app/[locale]/page.tsx` |
| `src/app/scan/[id]/page.tsx` | `src/app/[locale]/scan/[id]/page.tsx` |
| `src/app/crawl/[id]/page.tsx` | `src/app/[locale]/crawl/[id]/page.tsx` |
| `src/app/globals.css` | `src/app/globals.css` (stays in place, imported from `[locale]/layout.tsx`) |
| `src/app/api/*` | `src/app/api/*` (NO CHANGE — API routes stay outside `[locale]`) |

### 4.2 Root Layout (Passthrough)

The root `src/app/layout.tsx` becomes a minimal passthrough:

```tsx
// src/app/layout.tsx — passthrough, no <html>/<body> tags
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
```

### 4.3 Root Page Redirect

Add `src/app/page.tsx` to redirect `/` to the default locale:

```tsx
// src/app/page.tsx
import { redirect } from 'next/navigation';

export default function RootPage() {
  redirect('/en');
}
```

> **Note:** This is only a fallback. The middleware will typically handle `/` → `/en` redirection based on `Accept-Language` headers/cookies before this page is reached.

### 4.4 Static Rendering Support

For static rendering, add `generateStaticParams` and `setRequestLocale`:

```tsx
// src/app/[locale]/layout.tsx (add)
import { routing } from '@/i18n/routing';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
```

```tsx
// Each page must call setRequestLocale:
import { setRequestLocale } from 'next-intl/server';

export default function ScanResultPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  // ...
}
```

### 4.5 Locale-Aware Navigation

Replace `next/link` and `next/navigation` with `@/i18n/navigation` to keep locale context:

```tsx
// Before
import Link from 'next/link';
<Link href="/">Home</Link>
<Link href={`/scan/${scanId}`}>View Scan</Link>

// After
import { Link } from '@/i18n/navigation';
<Link href="/">Home</Link>
<Link href={`/scan/${scanId}`}>View Scan</Link>
// Locale prefix is automatically prepended
```

```tsx
// Before
import { useRouter } from 'next/navigation';
router.push(`/scan/${scanId}`);

// After
import { useRouter } from '@/i18n/navigation';
router.push(`/scan/${scanId}`);
// Automatically routes to /en/scan/123 or /fr/scan/123
```

---

## 5. Dynamic Content Translation

### 5.1 Variable Interpolation

```json
// messages/en.json
{
  "ReportView": {
    "violationSummary": "{count} violations across {elements} elements"
  }
}
```

```tsx
t('violationSummary', { count: results.score.totalViolations, elements: results.score.totalElementViolations })
// → "12 violations across 45 elements"
```

### 5.2 Cardinal Pluralization (ICU syntax)

```json
{
  "ViolationList": {
    "issueCount": "{count, plural, =0 {no issues} =1 {1 issue} other {# issues}}",
    "elementsAffected": "{count, plural, =1 {1 element} other {# elements}} affected"
  }
}
```

```tsx
t('issueCount', { count: 5 })   // → "5 issues"
t('issueCount', { count: 1 })   // → "1 issue"
t('issueCount', { count: 0 })   // → "no issues"
```

The `#` marker formats the count as a locale-aware number (e.g., `3,580` in English, `3 580` in French).

### 5.3 Ordinal Pluralization

```json
{
  "rank": "It's your {year, selectordinal, one {#st} two {#nd} few {#rd} other {#th}} scan!"
}
```

### 5.4 Select (Enum Values)

```json
{
  "status": "{status, select, complete {Complete} error {Error} pending {Pending} other {Unknown}}"
}
```

### 5.5 Rich Text (HTML-Like Tags in Messages)

```json
{
  "learnMore": "Please refer to <link>the documentation</link>."
}
```

```tsx
t.rich('learnMore', {
  link: (chunks) => <a href="/docs">{chunks}</a>,
})
```

### 5.6 Date/Time Formatting

**Standalone formatter:**

```tsx
import { useFormatter } from 'next-intl';

function ScanTimestamp({ timestamp }: { timestamp: string }) {
  const format = useFormatter();
  const date = new Date(timestamp);

  return (
    <time dateTime={timestamp}>
      {format.dateTime(date, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
      })}
    </time>
  );
}
// en: "Nov 20, 2024, 10:36 AM"
// fr: "20 nov. 2024, 10:36"
```

**Date within a message (ICU):**

```json
{
  "scannedOn": "Scanned on {date, date, medium}"
}
```

```tsx
t('scannedOn', { date: new Date(results.timestamp) })
```

**Relative time:**

```tsx
const format = useFormatter();
format.relativeTime(new Date('2024-11-20T10:36:01'), new Date())
// → "2 hours ago" (automatically localized)
```

### 5.7 Number Formatting

```tsx
const format = useFormatter();
format.number(47.5, { style: 'percent' })  // → "47.5%" or "47,5 %"
format.number(1234, { style: 'decimal' })   // → "1,234" or "1 234"
```

---

## 6. TypeScript Integration

### 6.1 Type Augmentation (`global.ts` or `src/global.d.ts`)

```typescript
// src/global.d.ts
import { routing } from '@/i18n/routing';
import messages from '../messages/en.json';

declare module 'next-intl' {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];     // 'en' | 'fr'
    Messages: typeof messages;
  }
}
```

This enables:
- Autocomplete for `t('...')` keys
- Type errors for unknown message keys
- Strict locale typing

### 6.2 Type-Safe Arguments

Add to `tsconfig.json`:

```json
{
  "compilerOptions": {
    "allowArbitraryExtensions": true
  }
}
```

Add to `next.config.ts`:

```typescript
const withNextIntl = createNextIntlPlugin({
  experimental: {
    createMessagesDeclaration: './messages/en.json',
  },
});
```

This generates `messages/en.d.json.ts` for strict argument typing. Add to `.gitignore`:

```
messages/*.d.json.ts
```

---

## 7. Migration Checklist (Step-by-Step)

### Phase 1: Infrastructure (No Visible Changes)

- [ ] Run `npm install next-intl`
- [ ] Create `messages/en.json` with all hardcoded English strings
- [ ] Create `messages/fr.json` (can be a copy of `en.json` initially)
- [ ] Create `src/i18n/routing.ts`
- [ ] Create `src/i18n/request.ts`
- [ ] Create `src/i18n/navigation.ts`
- [ ] Update `next.config.ts` with `createNextIntlPlugin`
- [ ] Create `src/global.d.ts` for TypeScript augmentation

### Phase 2: Routing Restructure

- [ ] Restructure `src/app/layout.tsx` → minimal passthrough
- [ ] Create `src/app/[locale]/layout.tsx` with `NextIntlClientProvider`
- [ ] Move `src/app/page.tsx` → `src/app/[locale]/page.tsx`
- [ ] Move `src/app/scan/[id]/page.tsx` → `src/app/[locale]/scan/[id]/page.tsx`
- [ ] Move `src/app/crawl/[id]/page.tsx` → `src/app/[locale]/crawl/[id]/page.tsx`
- [ ] Add root `src/app/page.tsx` redirect to `/en`
- [ ] Confirm `src/app/api/*` remains OUTSIDE `[locale]` folder
- [ ] Update `src/middleware.ts` to compose i18n routing with logging

### Phase 3: Migrate Pages (Can Be Incremental)

- [ ] Migrate `[locale]/page.tsx` (Home) — replace hardcoded strings with `t()`
- [ ] Migrate `ScanForm` component — use `useTranslations('ScanForm')`
- [ ] Migrate `ReportView` component
- [ ] Migrate `ViolationList` component
- [ ] Migrate `ScoreDisplay` component
- [ ] Migrate `ScanProgress` component
- [ ] Migrate `CrawlProgress` component
- [ ] Migrate `SiteScoreDisplay` component
- [ ] Migrate `PageList` component
- [ ] Migrate `scan/[id]/page.tsx`
- [ ] Migrate `crawl/[id]/page.tsx`

### Phase 4: Navigation and Links

- [ ] Replace `import Link from 'next/link'` → `import { Link } from '@/i18n/navigation'` in all components
- [ ] Replace `useRouter` from `next/navigation` → `@/i18n/navigation`
- [ ] Replace `usePathname` from `next/navigation` → `@/i18n/navigation`
- [ ] Add locale switcher component

### Phase 5: Testing and Polish

- [ ] Verify all routes work with `/en` prefix
- [ ] Verify all routes work with `/fr` prefix
- [ ] Verify `/` redirects correctly based on browser language
- [ ] Verify API routes (`/api/*`) are unaffected
- [ ] Update e2e tests for locale-prefixed URLs
- [ ] Verify PDF download links include locale prefix correctly
- [ ] Test with `Accept-Language: fr` header

---

## 8. Pitfalls and Solutions

### 8.1 API Routes Must NOT be Under `[locale]`

API routes (`src/app/api/*`) must remain outside the `[locale]` folder. The i18n middleware matcher should exclude `/api` paths.

### 8.2 `NextIntlClientProvider` Must Wrap Client Components

Client Components using `useTranslations` need `NextIntlClientProvider` as an ancestor. Place it in the `[locale]/layout.tsx`.

### 8.3 `useRouter.push()` Paths

When using `@/i18n/navigation`'s `useRouter`, paths like `/scan/123` automatically get the locale prefix. Don't manually prepend the locale.

### 8.4 Static Assets and Middleware Matcher

The matcher `/((?!api|_next|_vercel|.*\\..*).*)` correctly excludes:
- `/api/*` routes
- `/_next/*` static assets
- Files with dots (e.g., `favicon.ico`)

### 8.5 Hardcoded `<html lang="en">` Must Become Dynamic

The current root layout has `<html lang="en">`. After migration, the `[locale]/layout.tsx` uses `<html lang={locale}>` from the route params.

### 8.6 `fetch()` URLs in Client Components

API calls like `fetch('/api/scan')` don't need locale prefixes since API routes are outside `[locale]`. No changes needed to API fetch calls.

### 8.7 PDF Download Links

Links like `/api/scan/${scanId}/pdf` are API routes and don't need locale prefixes. No changes needed.

### 8.8 `metadata` Export Must Use Async `getTranslations`

```tsx
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });
  return {
    title: t('title'),
    description: t('description'),
  };
}
```

### 8.9 Incremental Migration Is Fully Supported

You can migrate page by page. Components that still have hardcoded English will continue to work — they just won't be translated yet. The `t.has()` method can check for key existence during a transition period.

### 8.10 `setRequestLocale` Needed for Static Rendering

Each page and layout that uses `next-intl` APIs must call `setRequestLocale(locale)` before any `useTranslations` call, to support static rendering. This is a temporary API requirement in `next-intl`.

---

## 9. Discovered Topics and Follow-On Research

### Topics Fully Researched

- [x] Installation and plugin setup
- [x] File structure for messages
- [x] Middleware composition with existing logging
- [x] Server Component API (`useTranslations`, `getTranslations`)
- [x] Client Component API (4 options)
- [x] ICU message syntax (variables, plurals, select)
- [x] Date/time formatting
- [x] Routing restructure with `[locale]` segment
- [x] TypeScript augmentation
- [x] Static rendering with `generateStaticParams` and `setRequestLocale`

### Recommended Follow-On Research (Not Completed)

- [ ] **Locale switcher component**: Design and implement a language toggle (EN/FR) UI component
- [ ] **E2E test migration**: Update Playwright tests to use locale-prefixed URLs
- [ ] **SEO considerations**: Alternate `hreflang` links (auto-generated by middleware), `sitemap.xml` generation per locale
- [ ] **Error pages**: `not-found.tsx` under `[locale]` for localized 404 pages (see `next-intl` error files docs)
- [ ] **SARIF/PDF report language**: Whether generated reports should respect the UI locale or remain English
- [ ] **CLI tool**: The `src/cli/` portion runs headless — determine if CLI output needs i18n
- [ ] **Cookie-based locale persistence**: Verify the middleware auto-sets a cookie for locale preference
- [ ] **Performance profiling**: Measure bundle impact of loading all messages vs. selective loading

### Clarifying Questions

1. **Should API responses be localized**, or only the web UI? The current research assumes only UI.
2. **AODA/LAPHO terminology**: The French Quebec translation of "AODA" is "LAPHO" (Loi sur l'accessibilité pour les personnes handicapées de l'Ontario). Should this be verified with the team?
3. **Supported locales**: The research assumes `en` and `fr`. Should regional variants like `en-CA` and `fr-CA` be used instead for Canadian formatting preferences?

---

## References

- [next-intl App Router Getting Started](https://next-intl.dev/docs/getting-started/app-router)
- [next-intl Routing Setup (with i18n routing)](https://next-intl.dev/docs/routing/setup)
- [next-intl Server & Client Components](https://next-intl.dev/docs/environments/server-client-components)
- [next-intl Translations (ICU Syntax)](https://next-intl.dev/docs/usage/translations)
- [next-intl Date/Time Formatting](https://next-intl.dev/docs/usage/dates-times)
- [next-intl Middleware Composition](https://next-intl.dev/docs/routing/middleware)
- [next-intl TypeScript Augmentation](https://next-intl.dev/docs/workflows/typescript)
- [next-intl Request Configuration](https://next-intl.dev/docs/usage/configuration)
