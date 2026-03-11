# Next.js 15 App Router Internationalization (i18n) Research

## Status: Complete

## Context

- **Application**: Next.js 15.5.12 accessibility scanner using App Router with Turbopack
- **Current stack**: React 19.1, Tailwind CSS, standalone Docker deployment
- **Target languages**: English (en) and French (fr)
- **Components with hardcoded text**: ~8 React components
- **Existing middleware**: `src/middleware.ts` for HTTP logging (matcher: `/api/:path*`, `/scan/:path*`, `/crawl/:path*`)
- **Root layout**: `src/app/layout.tsx` has `<html lang="en">`

---

## 1. Next.js 15 App Router Built-in i18n Support

### Key Finding: App Router has NO built-in i18n routing

Unlike the Pages Router, which had integrated `i18n` configuration in `next.config.js` (with `locales`, `defaultLocale`, and automatic locale detection/routing), **the App Router does not provide built-in i18n routing**.

The official Next.js docs (updated February 27, 2026) state:

> "Next.js enables you to configure the routing and rendering of content to support multiple languages. Making your site adaptive to different locales includes translated content (localization) and internationalized routes."

### What Next.js App Router provides natively

1. **Dynamic route segments**: Use `app/[lang]/` or `app/[locale]/` to handle locale as a route parameter
2. **Middleware/Proxy**: Use `middleware.ts` (or `proxy.ts` in Next.js 16+) to detect locale from `Accept-Language` header and redirect
3. **Server Components**: Translation dictionaries are loaded server-side only — no client-side bundle impact for translation files
4. **`generateStaticParams`**: Pre-render pages for all supported locales at build time
5. **`PageProps` and `LayoutProps`**: Globally available TypeScript helpers for typed route parameters

### Official recommended pattern (from Next.js docs)

```
app/
  [lang]/
    layout.tsx      ← receives lang param, sets <html lang={lang}>
    page.tsx        ← receives lang param, loads dictionary
    dictionaries.ts ← lazy-loads JSON per locale
    dictionaries/
      en.json
      fr.json
```

**Middleware** detects locale via `Accept-Language` + `@formatjs/intl-localematcher` + `negotiator`, then redirects to `/{locale}/...` if no locale prefix exists.

**Dictionary loader example** (from official docs):

```typescript
// app/[lang]/dictionaries.ts
import 'server-only'

const dictionaries = {
  en: () => import('./dictionaries/en.json').then((module) => module.default),
  fr: () => import('./dictionaries/fr.json').then((module) => module.default),
}

export type Locale = keyof typeof dictionaries
export const hasLocale = (locale: string): locale is Locale =>
  locale in dictionaries
export const getDictionary = async (locale: Locale) => dictionaries[locale]()
```

**Page usage** (from official docs):

```typescript
// app/[lang]/page.tsx
import { notFound } from 'next/navigation'
import { getDictionary, hasLocale } from './dictionaries'

export default async function Page({ params }: PageProps<'/[lang]'>) {
  const { lang } = await params
  if (!hasLocale(lang)) notFound()
  const dict = await getDictionary(lang)
  return <button>{dict.products.cart}</button>
}
```

### Important: Server Components benefit

> "Because all layouts and pages in the app/ directory default to Server Components, we do not need to worry about the size of the translation files affecting our client-side JavaScript bundle size. This code will only run on the server, and only the resulting HTML will be sent to the browser."

---

## 2. Library Comparison for App Router i18n

### 2.1 `next-intl` (by Jan Amann)

| Attribute | Details |
|---|---|
| **Version** | 4.8.3 (as of Feb 2026) |
| **Weekly npm downloads** | ~1,596,527 |
| **GitHub stars** | ~2,500+ (amannn/next-intl) |
| **License** | MIT |
| **Unpacked size** | 390 kB |
| **TypeScript support** | Built-in type declarations, TypeScript augmentation for message keys |
| **Message format** | ICU message syntax (plurals, select, rich text) |
| **App Router support** | First-class — designed for App Router, supports RSC, Server Components, Client Components |
| **React 19 support** | Yes |
| **Next.js 15 support** | Yes |

**Pros:**
- Purpose-built for Next.js App Router; the most recommended library by the Next.js docs (listed first in Resources)
- Two setup modes: **with i18n routing** (`/en/...`, `/fr/...` URL prefixes) and **without i18n routing** (cookie/header-based, no URL change)
- Full RSC support: `useTranslations` hook for components, `getTranslations` for async Server Components
- ICU message format with interpolation, plurals, dates, numbers, lists
- Navigation utilities: `Link`, `redirect`, `usePathname`, `useRouter` wrappers that are locale-aware
- Middleware integration for locale detection and redirection
- Static rendering support via `generateStaticParams` + `setRequestLocale`
- TypeScript augmentation for type-safe message keys (autocomplete + compile-time checks)
- Comprehensive docs with video course (learn.next-intl.dev)
- Active maintenance, frequent releases

**Cons:**
- Adds a dependency (~390 kB unpacked, but tree-shakeable)
- With i18n routing, currently opts into dynamic rendering when using `useTranslations` in Server Components (workaround available with `setRequestLocale`)
- Requires a Next.js plugin in `next.config.ts` when using without routing

**Setup complexity for this project**: Low-Medium. ~5 files to create/modify.

### 2.2 `next-i18next` (by i18next team)

| Attribute | Details |
|---|---|
| **Version** | 15.4.3 (as of Dec 2025) |
| **Weekly npm downloads** | ~408,088 |
| **GitHub stars** | ~5,600+ (i18next/next-i18next) |
| **License** | MIT |
| **Unpacked size** | 145 kB |
| **TypeScript support** | Built-in type declarations |
| **Message format** | i18next format (interpolation, plurals, nesting, context) |
| **App Router support** | **NOT supported** — Pages Router only |

**Critical finding**: The npm page for `next-i18next` explicitly states:

> "If you're using Next.js 13/14/15 with App Router, there is no need for next-i18next, you can directly use i18next and react-i18next."

The library relies on `getStaticProps`/`getServerSideProps`, `_app.tsx` HOC (`appWithTranslation`), and Pages Router `i18n` configuration in `next.config.js` — **none of which exist in the App Router**.

**Verdict**: **Not compatible with App Router. Do not use.**

For App Router projects wanting i18next, the recommendation is to use `i18next` + `react-i18next` directly, but this requires significant manual wiring (no middleware, no routing, no RSC-specific features).

### 2.3 `react-intl` (by FormatJS)

| Attribute | Details |
|---|---|
| **Version** | 8.1.3 (as of Feb 2026) |
| **Weekly npm downloads** | ~2,145,434 |
| **GitHub stars** | ~14,000+ (formatjs/formatjs) |
| **License** | BSD-3-Clause |
| **Unpacked size** | 308 kB |
| **TypeScript support** | Built-in type declarations |
| **Message format** | ICU message syntax (full FormatJS spec) |
| **App Router support** | Partial — primarily a React library, not Next.js-specific |

**Pros:**
- Very mature, widely used across all React projects
- Full ICU message syntax (the most complete implementation)
- Higher npm downloads than any Next.js-specific i18n library
- Works in any React environment

**Cons:**
- **No Next.js-specific integration**: No middleware, no locale routing, no Server Component-specific APIs
- Requires `IntlProvider` context — works in Client Components but needs manual wiring for Server Components
- No built-in locale routing, navigation wrappers, or middleware
- Must manually implement: locale detection, URL routing, `Accept-Language` header parsing, cookie persistence
- Provider-based design conflicts with Server Components pattern (providers are Client Components)
- Significant manual work to integrate with App Router

**Verdict**: Usable but requires extensive manual work. Better suited for SPAs or projects already using FormatJS.

### 2.4 Custom Solution (No Library)

This is the approach described in the official Next.js documentation.

**Pros:**
- Zero library dependencies
- Full control over implementation
- Smallest bundle impact (just JSON imports)
- Follows official Next.js documentation exactly
- Simple for small projects with few languages

**Cons:**
- No ICU message format (no built-in plurals, interpolation, date/number formatting)
- Must build your own: locale detection middleware, navigation helpers, type safety
- No TypeScript autocomplete for message keys without manual typing
- Pluralization requires custom code
- Date/number formatting must use `Intl` APIs directly
- No community support or ecosystem

**Verdict**: Viable for very simple cases (< 50 translation keys, no pluralization/formatting needs). For 8 components with 2 languages, this could be sufficient if translation needs are simple.

### Comparison Summary Table

| Feature | `next-intl` | `next-i18next` | `react-intl` | Custom |
|---|---|---|---|---|
| App Router support | ✅ First-class | ❌ Pages only | ⚠️ Partial | ✅ Manual |
| RSC support | ✅ Full | ❌ | ⚠️ Manual | ✅ Manual |
| i18n routing | ✅ Built-in | ❌ | ❌ | ⚠️ Manual |
| Middleware | ✅ Built-in | ❌ | ❌ | ⚠️ Manual |
| ICU messages | ✅ | ✅ (i18next) | ✅ (full) | ❌ |
| TypeScript safety | ✅ Augmented | ✅ Basic | ✅ Basic | ⚠️ Manual |
| Bundle impact | Low | N/A | Medium | None |
| Setup effort | Low-Med | N/A | High | Med-High |
| Maintenance | Active | Declining | Active | Self |
| Next.js 15 tested | ✅ | ❌ | ⚠️ | ✅ |

---

## 3. Routing Strategies for i18n in App Router

### 3.1 URL Prefix (`/en/scan/123`, `/fr/scan/123`)

**Implementation**: `app/[locale]/` dynamic segment + middleware redirect.

**Pros:**
- **SEO**: Best for SEO — search engines index each language version separately, can use `hreflang` tags effectively
- **Accessibility**: Clear language indicator in URL; users can bookmark/share language-specific links; assistive technology can detect language from URL
- **Cacheability**: Each locale is a separate URL, enabling CDN/edge caching per language
- **WCAG**: Supports WCAG 3.1.1 (Language of Page) — `<html lang>` is set per route
- **User experience**: Users can manually change language by modifying URL; shareable links maintain language
- **Standards**: The most common and recommended approach; how most international sites work

**Cons:**
- **Implementation complexity**: Medium — requires restructuring `app/` folder under `[locale]/` segment
- **Existing routes change**: All current URLs like `/scan/123` become `/en/scan/123` (need redirects)
- **API routes**: Need to decide whether API routes (`/api/...`) get locale prefix (usually no)
- **Middleware**: Must modify existing middleware to handle locale detection + redirect

**Recommended for**: This project. AODA/WCAG compliance demands clear language identification.

### 3.2 Cookie/Header-Based Detection (No URL Change)

**Implementation**: Store locale in cookie; `i18n/request.ts` reads cookie; no URL changes.

**Pros:**
- **Simplest migration**: No folder restructuring; URLs stay the same (`/scan/123`)
- **Implementation complexity**: Low — just add cookie reading to request config
- **No route changes**: API routes, scan routes unchanged

**Cons:**
- **SEO**: Poor — search engines can't index different language versions (same URL, different content)
- **Accessibility**: Violates best practices — language not discoverable from URL; users can't share language-specific links
- **Caching**: Problematic — CDN would need to vary by cookie, reducing cache hit rate
- **WCAG**: Weaker support for WCAG 3.1.1 — language changes invisibly without URL indication
- **User experience**: Can't bookmark a specific language; sharing URL doesn't preserve language

**Recommended for**: Internal tools, MVPs, or apps where SEO doesn't matter.

### 3.3 Subdomain-Based (`en.example.com`, `fr.example.com`)

**Implementation**: Domain configuration + middleware that reads hostname.

**Pros:**
- **SEO**: Good — each subdomain is treated as a separate property, clear language signal
- **Clean URLs**: URLs stay short (`/scan/123` on `fr.example.com`)

**Cons:**
- **Infrastructure complexity**: High — requires DNS configuration, SSL certificates per subdomain, Docker/hosting changes
- **Development complexity**: Hard to test locally; need hostfile modifications or reverse proxy
- **Deployment**: Significant changes to current standalone Docker setup
- **Cost**: Additional SSL, DNS management
- **Overkill**: For 2 languages, this adds unnecessary infrastructure complexity

**Recommended for**: Large enterprise sites with many languages and dedicated infrastructure teams.

### Routing Strategy Recommendation

**URL prefix (`/en/...`, `/fr/...`) is the clear winner** for this project because:
1. AODA/WCAG accessibility compliance requires clear language identification
2. SEO benefits for a public-facing accessibility scanner
3. Well-supported by `next-intl` and official Next.js patterns
4. Moderate implementation complexity acceptable for 8 components
5. Users can share and bookmark language-specific results

---

## 4. Official Next.js i18n Documentation

### Source

- **URL**: [https://nextjs.org/docs/app/guides/internationalization](https://nextjs.org/docs/app/guides/internationalization)
- **Last updated**: February 27, 2026
- **Version**: Written for Next.js with App Router (Latest Version section shows 16.1.6, but patterns apply to 15.x)

### What the docs cover

1. **Terminology**: Locale definitions (e.g., `en-US`, `nl-NL`)
2. **Routing overview**: Middleware-based locale detection using `@formatjs/intl-localematcher` and `negotiator`
3. **`[lang]` dynamic segment pattern**: All files nested under `app/[lang]/`
4. **Localization**: Dictionary pattern with `getDictionary()` function, JSON files per locale
5. **Static rendering**: `generateStaticParams` to pre-render for each locale
6. **`hasLocale` utility**: Type narrowing for locale validation with 404 on invalid locales

### Official resources recommended by Next.js docs

The docs list these libraries in the "Resources" section:
1. **next-intl** (listed first) — [next-intl.dev](https://next-intl.dev/)
2. next-international
3. next-i18n-router
4. paraglide-next
5. lingui
6. tolgee
7. next-intlayer
8. gt-next

Also links to: [Minimal i18n routing and translations example](https://github.com/vercel/next.js/tree/canary/examples/i18n-routing)

### Key architectural insight from docs

The official pattern does **not** use any library. It demonstrates a minimal custom approach using:
- Middleware for locale detection and redirect
- `[lang]` dynamic route segment
- JSON dictionary files loaded via dynamic imports
- `server-only` module to prevent client-side loading of dictionaries

---

## 5. Recommendation for This Project

### Recommended approach: `next-intl` with URL prefix routing

**Why `next-intl`:**

1. **Best App Router integration**: Purpose-built for Next.js App Router with first-class RSC support
2. **Listed first in official Next.js docs**: Strong community backing and official endorsement
3. **Highest relevant npm downloads**: 1.6M weekly (highest among Next.js-specific i18n libraries)
4. **Two setup modes**: Can start without routing (simpler) and add routing later
5. **AODA/WCAG compliance**: Proper `<html lang>` handling, works with accessibility patterns
6. **ICU message format**: Handles plurals, dates, numbers — important for French (e.g., plural rules differ from English)
7. **TypeScript safety**: Autocomplete and compile-time checks for translation keys
8. **Active maintenance**: v4.8.3 published Feb 2026, frequent updates
9. **Minimal bundle impact**: Translation JSONs stay server-side only in Server Components

**Why URL prefix routing:**

1. AODA/WCAG compliance requires visible language indication
2. Best SEO practice for bilingual Canadian government-related applications
3. Well-supported pattern by both Next.js and `next-intl`
4. Enables language-specific sharing/bookmarking of scan results

### Implementation outline

1. Install `next-intl`
2. Create `src/i18n/routing.ts` — define `locales: ['en', 'fr']`, `defaultLocale: 'en'`
3. Create `src/i18n/request.ts` — request-scoped config
4. Create `src/i18n/navigation.ts` — locale-aware `Link`, `redirect`, etc.
5. Update `src/middleware.ts` — add `next-intl` middleware for locale detection (merge with existing logging)
6. Move `src/app/layout.tsx` → `src/app/[locale]/layout.tsx` (add locale param, `NextIntlClientProvider`)
7. Move `src/app/page.tsx` → `src/app/[locale]/page.tsx`
8. Move `src/app/scan/[id]/` → `src/app/[locale]/scan/[id]/`
9. Move `src/app/crawl/[id]/` → `src/app/[locale]/crawl/[id]/`
10. Create `messages/en.json` and `messages/fr.json`
11. Update `next.config.ts` to add `next-intl` plugin
12. Extract hardcoded strings from 8 components into message files
13. Update components to use `useTranslations` / `getTranslations`
14. Add `generateStaticParams` for static rendering
15. Update Dockerfile if needed (ensure `messages/` directory is copied)

### Estimated scope

- ~8 components to update with translation hooks
- ~5 new config/routing files
- ~3 existing files to modify (middleware, next.config, layout)
- 2 JSON translation files to create (en.json, fr.json)

---

## References

| Source | URL |
|---|---|
| Next.js i18n docs (App Router) | [https://nextjs.org/docs/app/guides/internationalization](https://nextjs.org/docs/app/guides/internationalization) |
| next-intl docs (App Router setup) | [https://next-intl.dev/docs/getting-started/app-router](https://next-intl.dev/docs/getting-started/app-router) |
| next-intl routing setup | [https://next-intl.dev/docs/routing/setup](https://next-intl.dev/docs/routing/setup) |
| next-intl without routing | [https://next-intl.dev/docs/getting-started/app-router/without-i18n-routing](https://next-intl.dev/docs/getting-started/app-router/without-i18n-routing) |
| next-intl npm | [https://www.npmjs.com/package/next-intl](https://www.npmjs.com/package/next-intl) |
| next-intl GitHub | [https://github.com/amannn/next-intl](https://github.com/amannn/next-intl) |
| next-i18next npm | [https://www.npmjs.com/package/next-i18next](https://www.npmjs.com/package/next-i18next) |
| react-intl npm | [https://www.npmjs.com/package/react-intl](https://www.npmjs.com/package/react-intl) |
| Next.js official i18n example | [https://github.com/vercel/next.js/tree/canary/examples/i18n-routing](https://github.com/vercel/next.js/tree/canary/examples/i18n-routing) |
| FormatJS docs | [https://formatjs.github.io/docs/getting-started/installation](https://formatjs.github.io/docs/getting-started/installation) |

---

## Discovered Research Topics

1. **Middleware merging strategy**: How to merge existing HTTP logging middleware with `next-intl` locale detection middleware — both need to run on the same routes
2. **API route exclusion**: Ensure `/api/*` routes are excluded from locale prefixing (they should remain at `/api/scan`, `/api/crawl`)
3. **Docker standalone build**: Verify `next-intl` works correctly with `output: "standalone"` and that `messages/` directory is included
4. **Turbopack compatibility**: Confirm `next-intl` plugin works with `--turbopack` (the project uses `next dev --turbopack`)
5. **French WCAG terminology**: Research standard French translations for WCAG/accessibility-specific terms (e.g., "violation", "accessibility score", "WCAG 2.2 Level AA")
6. **AODA bilingual requirements**: What are the Ontario AODA requirements for bilingual web applications?

---

## Clarifying Questions

1. **Default language behavior**: Should the default locale (`en`) have a URL prefix (`/en/scan/123`) or should it be prefix-free (`/scan/123` for English, `/fr/scan/123` for French)? `next-intl` supports both patterns.
2. **Language switcher UX**: Where should the language toggle appear? Header? Footer? Both?
3. **API response language**: Should scan results and API responses be translated, or only the UI?
4. **Existing scan result URLs**: Should existing URLs like `/scan/{id}` redirect to `/en/scan/{id}`, or should they 404?
5. **Translation management**: Will translations be managed by developers (JSON files in repo) or by a translation management system (Crowdin, etc.)?
