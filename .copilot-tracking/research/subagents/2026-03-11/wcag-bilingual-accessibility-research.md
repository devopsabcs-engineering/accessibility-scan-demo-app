# WCAG 2.2 Accessibility Requirements for Bilingual (French/English) Web Applications

## Research Status: Complete

## Research Topics

1. WCAG Success Criteria for Language (3.1.1, 3.1.2)
2. Accessible Language Switcher Patterns
3. AODA/Ontario Specific Requirements
4. RTL/Bidirectional Considerations
5. Screen Reader Behavior with Language Switching
6. Accessibility Considerations for Translation Quality

---

## 1. WCAG Success Criteria for Language

### SC 3.1.1 Language of Page (Level A)

**Requirement**: The default human language of each web page can be programmatically determined.

**Technique (H57)**: Use the `lang` attribute on the `<html>` element.

```html
<!-- English page -->
<html lang="en">

<!-- French page -->
<html lang="fr">
```

**Key rules**:

- The `lang` attribute **must** be present on the `<html>` element.
- The value **must** conform to BCP 47 language tags (IETF standard).
- The value **must** reflect the **primary/predominant language** used on the page.
- For a **fully translated French page**, the `<html>` element must be `lang="fr"`.
- For a **fully English page**, the `<html>` element must be `lang="en"`.
- When a page uses several languages equally, the first language used should be chosen as the default.
- This is inherited by all descendant elements.

**For a bilingual Next.js app**: When the user switches language and the entire page content changes to French, the `<html lang>` attribute **must** change to `lang="fr"`. This is a **dynamic requirement** — the attribute must reflect the current page language.

**W3C note for multilingual sites**: "For multilingual sites targeting Conformance Level A, the Working Group strongly encourages developers to follow Success Criterion 3.1.2 as well even though that is a Level AA success criterion."

**Test rules**:

- HTML page has `lang` attribute
- HTML page `lang` attribute has valid language tag
- HTML page language subtag matches default language

**References**:

- [Understanding SC 3.1.1](https://www.w3.org/WAI/WCAG22/Understanding/language-of-page.html)
- [Technique H57](https://www.w3.org/WAI/WCAG22/Techniques/html/H57)

### SC 3.1.2 Language of Parts (Level AA)

**Requirement**: The human language of each passage or phrase in the content can be programmatically determined except for proper names, technical terms, words of indeterminate language, and words or phrases that have become part of the vernacular of the immediately surrounding text.

**Technique (H58)**: Use `lang` attributes on elements to identify changes in human language.

```html
<!-- English page with French phrase -->
<p>The report is titled "<span lang="fr">Rapport d'accessibilité</span>".</p>

<!-- French page with English technical term -->
<p>L'outil utilise <span lang="en">axe-core</span> pour l'analyse.</p>
```

**Key rules**:

- Mark content in a different language with the appropriate `lang` attribute **on its container element**.
- **Exceptions** — You do **not** need `lang` attributes on:
  - **Proper names** (e.g., "Pierre Trudeau" in an English page)
  - **Technical terms** (e.g., "WCAG", "AODA", "axe-core", "HTML", "CSS")
  - **Words that have become vernacular** (e.g., "rendezvous" in English, "podcast" in French)
  - **Words of indeterminate language**
- The W3C example specifically shows **alternative language links** using `lang` on each link:

```html
<ul>
  <li><a href="..." lang="de">Deutsch</a></li>
  <li><a href="..." lang="fr">Français</a></li>
  <li><a href="..." lang="en">English</a></li>
</ul>
```

**For the language switcher**: The language name displayed in the other language (e.g., "Français" on an English page) **must** have `lang="fr"` on it. The W3C provides this exact pattern as an example in the SC 3.1.2 documentation.

**For mixed-language content**: When the page is in French but contains English technical terms like "WCAG", "axe-core", or "AODA", these are **exempt** as technical terms. No `lang` attribute is needed.

**Test rules**:

- Element with `lang` attribute has valid language tag
- HTML element language subtag matches language

**References**:

- [Understanding SC 3.1.2](https://www.w3.org/WAI/WCAG22/Understanding/language-of-parts.html)
- [Technique H58](https://www.w3.org/WAI/WCAG22/Techniques/html/H58)

### Other Relevant WCAG Criteria for Multilingual Content

| SC | Title | Level | Relevance |
|---|---|---|---|
| 2.4.2 | Page Titled | A | Page `<title>` must be translated and unique per language |
| 3.2.3 | Consistent Navigation | AA | Navigation must appear in same relative order across languages |
| 3.2.4 | Consistent Identification | AA | Components with same function must be identified consistently across languages |
| 3.2.6 | Consistent Help (NEW 2.2) | A | Help mechanisms must appear in same position across language versions |
| 1.3.1 | Info and Relationships | A | Semantic structure must be preserved in translations |
| 2.4.4 | Link Purpose (In Context) | A | Link text must be meaningful in the translated language |
| 2.4.6 | Headings and Labels | AA | Headings must be descriptive in the translated language |
| 4.1.2 | Name, Role, Value | A | ARIA labels and accessible names must be translated |

---

## 2. Accessible Language Switcher Patterns

### Recommended Pattern: Links (Not `<select>`)

The W3C International recommends **against** using `<select>` for language switching when there are only a few options. For a bilingual (2 language) site, **simple links are strongly preferred**.

**Reasons against `<select>`**:

- Users cannot see or access the links straight away
- Hard to find a label for the list that is not language-specific
- Users may not have fonts for all the option text, and graphics cannot be used instead of text

**From W3C**: "If your site supports only a handful of localized versions, it is probably better to avoid using a pull-down menu altogether and simply include links directly on the page."

### Recommended HTML/JSX Pattern for Bilingual Switcher

```tsx
// Language switcher component — accessible bilingual toggle
function LanguageSwitcher({ currentLang }: { currentLang: 'en' | 'fr' }) {
  return (
    <nav aria-label={currentLang === 'en' ? 'Language selection' : 'Sélection de la langue'}>
      <ul role="list" className="flex gap-2">
        {currentLang === 'en' ? (
          <li>
            <a href="/fr" lang="fr" hrefLang="fr">
              Français
            </a>
          </li>
        ) : (
          <li>
            <a href="/en" lang="en" hrefLang="en">
              English
            </a>
          </li>
        )}
      </ul>
    </nav>
  );
}
```

**Alternatively, showing both languages (current highlighted)**:

```tsx
function LanguageSwitcher({ currentLang }: { currentLang: 'en' | 'fr' }) {
  return (
    <nav aria-label={currentLang === 'en' ? 'Language selection' : 'Sélection de la langue'}>
      <ul role="list" className="flex gap-2">
        <li>
          {currentLang === 'en' ? (
            <strong aria-current="true">
              <span lang="en">English</span>
            </strong>
          ) : (
            <a href="/en" lang="en" hrefLang="en">English</a>
          )}
        </li>
        <li>
          {currentLang === 'fr' ? (
            <strong aria-current="true">
              <span lang="fr">Français</span>
            </strong>
          ) : (
            <a href="/fr" lang="fr" hrefLang="fr">Français</a>
          )}
        </li>
      </ul>
    </nav>
  );
}
```

### Required Accessibility Features

| Feature | Requirement | Details |
|---|---|---|
| `<nav>` landmark | Required | Wrap in `<nav>` with `aria-label` in the current page language |
| `lang` on link text | Required (SC 3.1.2) | Each language name in a foreign language needs `lang` attribute |
| `hrefLang` attribute | Recommended | Indicates the language of the linked resource |
| `aria-current` | Recommended | Mark the current language as active (prevents dead link) |
| Position | Top of page, header | Consistent position per SC 3.2.3; W3C recommends top-right |
| Keyboard accessible | Required (SC 2.1.1) | Use native `<a>` elements — they are keyboard-accessible by default |
| Visible focus | Required (SC 2.4.7) | Ensure `:focus-visible` styles apply |
| Target size | Required (SC 2.5.8) | At least 24×24 CSS px |

### Language Change Announcement to Screen Readers

When navigating to a new URL (full page load), screen readers will:

1. Detect the new page's `<html lang>` attribute
2. Automatically switch pronunciation engine
3. Read the new page title

**No explicit ARIA live announcement is needed** for a full page navigation (link click). The page load itself is the announcement.

If using client-side routing (Next.js `<Link>`), consider:

- Updating `document.documentElement.lang` dynamically
- Updating `document.title` with the translated title
- Moving focus to the main heading (`<h1>`) after route change for screen reader announcement

### Canada.ca Government Pattern Reference

The Government of Canada uses a simple link pattern on every page:

```html
<nav>
  <h2 class="sr-only">Language selection</h2>
  <a href="/fr/page" lang="fr">Français</a>
</nav>
```

Key characteristics:

- Single link to the other language (not a toggle, not a dropdown)
- Language name in the target language ("Français" not "French")
- `lang` attribute on the link text
- Appears in the header, top-right position
- Wrapped in a `<nav>` with a visually hidden heading

---

## 3. AODA/Ontario Specific Requirements

### AODA Legal Requirement

**AODA requires WCAG 2.0 Level AA compliance** for:

- Designated public sector organizations
- Businesses and non-profits with 50+ employees
- All public websites with content published after January 1, 2012

**Exceptions**: SC 1.2.4 (live captions) and SC 1.2.5 (pre-recorded audio descriptions) are excluded.

**AODA does NOT have specific French language requirements**. AODA is an Ontario accessibility law focused on disability access, not bilingual compliance. French language requirements in Ontario come from the **French Language Services Act (FLSA)**, which applies to designated Ontario government agencies providing services in both languages.

### AODA Relevant Success Criteria for Bilingual Content

From the AODA compliance list:

- **Level A**: SC 3.1.1 Language of Page — `lang` attribute on `<html>` (required)
- **Level AA**: SC 3.1.2 Language of Parts — `lang` on elements with different language (required)

WCAG 2.2 is backwards-compatible with WCAG 2.0, so conforming to WCAG 2.2 Level AA **automatically satisfies AODA**.

### Canadian Federal Context

**Standard on Web Accessibility** (Government of Canada):

- The federal Standard on Web Accessibility was **rescinded on 2026-03-02**.
- It has been replaced by **CAN/ASC - EN 301 549:2024** — the European harmonized standard for ICT accessibility adopted by Accessibility Standards Canada (ASC).
- The EN 301 549 standard incorporates WCAG 2.1 Level AA as its web content requirements.
- Federal organizations are encouraged to adopt this standard.

**Official Languages Act** (federal):

- Requires federal government institutions to provide services in both English and French.
- This is a **language rights** law, not an accessibility law.
- Drives the bilingual requirement for Government of Canada websites.

**There is no CAN/CSA-SC6.0 standard** — the referenced "Canadian Standard on Web Accessibility" was the Treasury Board Standard on Web Accessibility, now rescinded. The current applicable standard is **CAN/ASC - EN 301 549:2024**.

### For This Project

Since this is an Ontario-focused AODA compliance project:

- AODA compliance = WCAG 2.0 Level AA (minimum)
- Target WCAG 2.2 Level AA to exceed AODA minimums (per workspace instructions)
- French language support is **not an AODA requirement** but is a feature requirement
- When implementing French, all WCAG criteria apply equally to the French version
- Both language versions must independently meet WCAG 2.2 Level AA

---

## 4. RTL/Bidirectional Considerations

**Confirmed: No RTL concerns for English-French bilingual content.**

Both English (`en`) and French (`fr`) are **left-to-right (LTR)** languages using the Latin script. There are:

- No bidirectional text (`dir` attribute) requirements
- No RTL layout considerations
- No script-specific font concerns
- No Unicode bidirectional algorithm considerations

The `dir` attribute does **not** need to be set or changed when switching between English and French. The default LTR direction applies to both languages.

From W3C I18n: "Don't forget to also use the `dir` attribute when dealing with bidirectional text, such as Arabic, Hebrew, etc." — This does NOT apply to English/French.

---

## 5. Screen Reader Behavior with Language Switching

### How Screen Readers Handle `lang` Attribute

| Screen Reader | Platform | Behavior |
|---|---|---|
| **JAWS** | Windows | Uses `lang` to load the correct phonetic engine / phonologic dictionary. Switches pronunciation automatically when encountering elements with different `lang` attributes. |
| **NVDA** | Windows | Uses `lang` in the same way as JAWS — automatically switches speech synthesis voice/pronunciation engine based on `lang` attribute. |
| **VoiceOver (iOS)** | iOS | Auto-switches voices based on `lang` attribute. Can speak a particular language using a different accent when specified. |
| **VoiceOver (macOS)** | macOS | Uses language recognition by default. May not fully respect `lang` attributes. Has a "Detect Languages" setting in VoiceOver Utility → Speech that toggles between automatic detection and relying on `lang` markup. Behavior is less reliable than JAWS/NVDA. |

### Pronunciation Engine Switching

When a screen reader encounters a `lang` attribute:

1. **Speech synthesizer switches** to the pronunciation rules of the specified language
2. The text is spoken with **appropriate accent and pronunciation**
3. Without `lang`, the synthesizer tries to speak foreign words using the **default language's rules** (e.g., French "voiture" would be pronounced "voyture" by an English synthesizer)

**Steve Faulkner's JAWS demo** (referenced in Adrian Roselli's article): The same English text marked up with different `lang` values (`es`/`fr`/`de`) is pronounced differently by JAWS, demonstrating the direct impact of `lang` on pronunciation.

### Key Findings for Bilingual Implementation

1. **`lang` on `<html>` is critical** — Without it, screen readers fall back to the user's default system language setting. A French user visiting a French page without `lang="fr"` would hear French text pronounced with English rules.

2. **`lang` on parts matters for mixed content** — When French text appears on an English page (e.g., "Français" in the language switcher), the `lang="fr"` attribute tells JAWS/NVDA to switch to French pronunciation for that word.

3. **Region subtags are generally ignored** — Use `lang="en"` not `lang="en-US"` and `lang="fr"` not `lang="fr-CA"`. Screen readers typically ignore region subtags. Only use region subtags when differentiating mutually unintelligible dialects.

4. **Braille displays are also affected** — Incorrect `lang` attributes affect Braille translation software, which substitutes control codes for accented characters differently per language.

5. **No explicit announcement needed for page-level switches** — When the page loads with a new `<html lang>`, screen readers detect this automatically. No additional ARIA live region is needed.

### Recommendations

- Always set `<html lang="fr">` on French pages and `<html lang="en">` on English pages.
- Use `lang="fr"` on the "Français" link text in the language switcher.
- Use `lang="en"` on the "English" link text in the language switcher when on a French page.
- Use simple primary language subtags (`en`, `fr`) — avoid unnecessary region subtags.
- For client-side language switching, update `document.documentElement.lang` dynamically.
- Translate `aria-label` values when switching languages.

---

## 6. Accessibility Considerations for Translation Quality

### Impact of Poor Translations on Accessibility

Poor or machine-translated content creates accessibility barriers:

- **Cognitive accessibility**: Users rely on clear, idiomatic language. Awkward translations increase cognitive load.
- **Screen reader pronunciation**: Correctly translated text with correct `lang` attributes ensures proper pronunciation. Untranslated text with wrong `lang` causes pronunciation errors.
- **Form labels and error messages**: Poorly translated form labels (SC 3.3.2) or error messages (SC 3.3.1) may not convey meaning, creating usability barriers.
- **Link purpose**: Translated link text (SC 2.4.4) must describe the destination in the target language.
- **ARIA labels**: All `aria-label`, `aria-labelledby`, and `aria-describedby` values must be translated.

### Handling Untranslatable Technical Terms

Terms that should **not** be translated (and are exempt from SC 3.1.2):

| Term | Reason |
|---|---|
| WCAG | International technical acronym |
| AODA | Ontario legislation acronym |
| axe-core | Software product name |
| HTML, CSS, ARIA | Technical standards |
| URL, HTTP | Protocol names |
| NVDA, JAWS, VoiceOver | Screen reader product names |

These terms are **technical terms** or **proper names** — both explicitly exempted by SC 3.1.2. They do not need `lang="en"` attributes when used in French content.

### Recommendations for Translation Quality

1. **Use professional human translation** for all user-facing content, not machine translation alone.
2. **Translate all accessible names**: `aria-label`, `alt` text, `title` attributes, `placeholder` text.
3. **Translate page metadata**: `<title>`, `<meta name="description">`.
4. **Maintain equivalent information** — the French version must convey the same information as English.
5. **Test with French-speaking screen reader users** if possible.
6. **Leave technical terms in English** — they are universally understood in the WCAG/accessibility domain and are exempt from SC 3.1.2.

---

## 7. Implementation Recommendations for Next.js

### Architecture Approach

For a Next.js application with full bilingual support:

**Option A: Next.js i18n Routing (Recommended)**

Use Next.js middleware-based i18n with path prefixes:

- `/en/scan/[id]` → English scan page (`<html lang="en">`)
- `/fr/scan/[id]` → French scan page (`<html lang="fr">`)

This approach:

- Each URL has a clear language indicator
- `<html lang>` changes per route
- Full page loads handle screen reader language detection naturally
- SEO-friendly with `hreflang` link elements
- Shareable URLs in the correct language

**Dynamic Layout Pattern**:

```tsx
// app/[lang]/layout.tsx
export default function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { lang: 'en' | 'fr' };
}) {
  return (
    <html lang={params.lang}>
      <body>
        <a href="#main-content" className="sr-only focus:not-sr-only ...">
          {params.lang === 'en' ? 'Skip to main content' : 'Passer au contenu principal'}
        </a>
        <header>
          <LanguageSwitcher currentLang={params.lang} />
        </header>
        <main id="main-content">
          {children}
        </main>
      </body>
    </html>
  );
}
```

### Checklist for WCAG 2.2 AA Compliance During i18n

- [ ] `<html lang>` attribute dynamically matches current page language
- [ ] Skip navigation link text is translated
- [ ] `<title>` is translated and unique per language per page
- [ ] Language switcher uses `<nav>` with translated `aria-label`
- [ ] Language switcher link text uses `lang` attribute for the foreign language name
- [ ] All `aria-label` values are translated
- [ ] All `alt` text on images is translated
- [ ] All form labels and error messages are translated
- [ ] Navigation appears in consistent order across languages (SC 3.2.3)
- [ ] Components with same function are identified consistently (SC 3.2.4)
- [ ] Help mechanisms appear in same position across languages (SC 3.2.6)
- [ ] `hreflang` `<link>` elements point to alternate language versions for SEO
- [ ] Color contrast ratios maintained in French version (longer text may wrap differently)
- [ ] Target sizes maintained (French text is typically 15-20% longer than English)
- [ ] Text spacing overrides still work in French (SC 1.4.12)

---

## 8. Workspace Context

### Current State (from `layout.tsx`)

```tsx
<html lang="en">
```

The app currently hardcodes `lang="en"`. For bilingual support, this must become dynamic.

### Workspace Instruction File Highlights

From [wcag22-rules.instructions.md](../../.github/instructions/wcag22-rules.instructions.md):

- SC 3.1.1: "Set `lang="en"` on the `<html>` element in the root `layout.tsx`." → Must be updated for bilingual.
- SC 3.1.2: "Mark content in a different language with the appropriate `lang` attribute on its
container." → Applies directly to language switcher.
- Scoring: Missing `lang` on parts = Moderate violation (score 3).

From [a11y-remediation.instructions.md](../../.github/instructions/a11y-remediation.instructions.md):

- `html-has-lang` (SC 3.1.1): "Add `lang="en"` to `<html>` in root `layout.tsx`." → Must become dynamic.

---

## References

### W3C / WCAG

- [Understanding SC 3.1.1 Language of Page](https://www.w3.org/WAI/WCAG22/Understanding/language-of-page.html)
- [Understanding SC 3.1.2 Language of Parts](https://www.w3.org/WAI/WCAG22/Understanding/language-of-parts.html)
- [Technique H57: Using lang attribute on HTML element](https://www.w3.org/WAI/WCAG22/Techniques/html/H57)
- [Technique H58: Using lang attributes for language changes](https://www.w3.org/WAI/WCAG22/Techniques/html/H58)
- [W3C: Declaring language in HTML](https://www.w3.org/International/questions/qa-html-language-declarations)
- [W3C: Using select to link to localized content](https://www.w3.org/International/questions/qa-navigation-select)
- [W3C: Developing for Web Accessibility](https://www.w3.org/WAI/tips/developing/)
- [BCP 47: Tags for Identifying Languages](https://www.rfc-editor.org/info/bcp47)
- [IANA Language Subtag Registry](https://www.iana.org/assignments/language-subtag-registry/language-subtag-registry)

### AODA / Canadian

- [Ontario: How to make websites accessible](https://www.ontario.ca/page/how-make-websites-accessible)
- [Government of Canada: Standard on Web Accessibility (rescinded)](https://www.tbs-sct.canada.ca/pol/doc-eng.aspx?id=23601)
- [CAN/ASC - EN 301 549:2024](https://accessible.canada.ca/en-301-549-accessibility-requirements-ict-products-and-services-1)

### Screen Reader Behavior

- [Adrian Roselli: On Use of the Lang Attribute](https://adrianroselli.com/2015/01/on-use-of-lang-attribute.html)
- [Steve Faulkner: Effect of lang attribute values on JAWS speech (YouTube)](https://www.youtube.com/watch?v=0uzxu9dQnuU)
- [WebAIM: Document and Content Language](https://webaim.org/techniques/language/)

---

## Recommended Follow-Up Research

- [ ] Research Next.js 15 App Router i18n patterns (middleware + `[lang]` route segment)
- [ ] Evaluate `next-intl` vs `next-i18next` vs custom i18n for translation management
- [ ] Audit all existing components for hardcoded English strings that need translation keys
- [ ] Research `hreflang` `<link>` element requirements for SEO with bilingual Next.js
- [ ] Research French translation standards (terminology for WCAG/accessibility-specific content)
- [ ] Test actual screen reader behavior with Next.js client-side routing and dynamic `lang` changes
- [ ] Research whether `next/font` (Geist) supports French diacritical characters (accents: é, è, ê, ë, ç, à, â, ù, û, ü, ô, î, ï)

## Clarifying Questions

- **Is the app intended for Ontario government use?** If yes, the French Language Services Act may impose additional bilingual requirements beyond AODA.
- **Should the app support client-side language switching (SPA-style) or full page navigation?** This affects screen reader announcement patterns.
- **Are there specific pages/components that should remain English-only?** (e.g., CLI output, technical reports)
