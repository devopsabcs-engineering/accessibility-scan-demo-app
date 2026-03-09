# AODA WCAG 2.2 Standards Research

## Research Topics

1. AODA and WCAG 2.2 relationship and requirements
2. WCAG 2.2 new success criteria (vs 2.1)
3. Code-level detection patterns for WCAG criteria
4. Static analysis capabilities (axe-core, IBM Equal Access, custom checks)
5. Common accessibility violations in React/Next.js apps
6. Remediation patterns for common violations
7. Ontario AODA-specific requirements beyond WCAG

---

## 1. AODA and WCAG 2.2 Relationship

### Ontario's AODA Framework

The Accessibility for Ontarians with Disabilities Act (AODA) is Ontario provincial legislation requiring organizations to meet accessibility standards. The Integrated Accessibility Standards Regulation (IASR) under AODA mandates WCAG conformance for web content.

### AODA WCAG Conformance Requirements

| Organization Type | Deadline | Required Level |
|---|---|---|
| Ontario Government | January 1, 2021 | WCAG 2.0 Level AA |
| Large organizations (50+ employees) | January 1, 2021 | WCAG 2.0 Level AA |
| Small organizations (1-49 employees) | January 1, 2021 | WCAG 2.0 Level AA |

**Key points:**

- AODA legally references **WCAG 2.0 Level AA** but the Ontario government advises adoption of the latest WCAG version
- WCAG 2.2 is backwards compatible — conforming to WCAG 2.2 Level AA automatically satisfies WCAG 2.0 Level AA
- The W3C recommends WCAG 2.2 as the current standard (published December 12, 2024, as W3C Recommendation)
- **Best practice**: target WCAG 2.2 Level AA to exceed AODA minimums and anticipate policy updates

### AODA-Specific Requirements Beyond WCAG

AODA does not define additional technical criteria beyond WCAG. However, AODA has:

- **Reporting obligations**: organizations must file accessibility compliance reports
- **Training requirements**: staff training on accessibility standards
- **Procurement policies**: accessible procurement requirements
- **Feedback mechanisms**: mandatory processes to receive and respond to accessibility feedback
- **Multi-year accessibility plans**: public organizations must publish and update these
- No additional technical web content criteria beyond WCAG Level AA

---

## 2. WCAG 2.2 Success Criteria (Complete Level A + AA)

### New in WCAG 2.2 (vs 2.1)

WCAG 2.2 adds **9 new success criteria** and removes one (4.1.1 Parsing, obsolete):

| SC | Name | Level | Description |
|---|---|---|---|
| 2.4.11 | Focus Not Obscured (Minimum) | **AA** | Focused component not entirely hidden by author-created content |
| 2.4.12 | Focus Not Obscured (Enhanced) | AAA | No part of focused component hidden by author-created content |
| 2.4.13 | Focus Appearance | AAA | Focus indicator meets size and contrast requirements |
| 2.5.7 | Dragging Movements | **AA** | Drag operations have single-pointer alternative |
| 2.5.8 | Target Size (Minimum) | **AA** | Pointer targets at least 24×24 CSS pixels (with exceptions) |
| 3.2.6 | Consistent Help | **A** | Help mechanisms in same relative position across pages |
| 3.3.7 | Redundant Entry | **A** | Previously entered info auto-populated or selectable |
| 3.3.8 | Accessible Authentication (Minimum) | **AA** | No cognitive function test required for authentication |
| 3.3.9 | Accessible Authentication (Enhanced) | AAA | No object recognition or personal content test for auth |

**New Level AA criteria requiring compliance**: 2.4.11, 2.5.7, 2.5.8, 3.3.8

### Complete WCAG 2.2 Level A + AA Criteria

#### Principle 1: Perceivable

| SC | Name | Level | axe-core Tag |
|---|---|---|---|
| 1.1.1 | Non-text Content | A | `wcag111` |
| 1.2.1 | Audio-only and Video-only (Prerecorded) | A | `wcag121` |
| 1.2.2 | Captions (Prerecorded) | A | `wcag122` |
| 1.2.3 | Audio Description or Media Alternative | A | `wcag123` |
| 1.2.4 | Captions (Live) | AA | `wcag124` |
| 1.2.5 | Audio Description (Prerecorded) | AA | `wcag125` |
| 1.3.1 | Info and Relationships | A | `wcag131` |
| 1.3.2 | Meaningful Sequence | A | `wcag132` |
| 1.3.3 | Sensory Characteristics | A | `wcag133` |
| 1.3.4 | Orientation | AA | `wcag134` |
| 1.3.5 | Identify Input Purpose | AA | `wcag135` |
| 1.4.1 | Use of Color | A | `wcag141` |
| 1.4.2 | Audio Control | A | `wcag142` |
| 1.4.3 | Contrast (Minimum) | AA | `wcag143` |
| 1.4.4 | Resize Text | AA | `wcag144` |
| 1.4.5 | Images of Text | AA | `wcag145` |
| 1.4.10 | Reflow | AA | `wcag1410` |
| 1.4.11 | Non-text Contrast | AA | `wcag1411` |
| 1.4.12 | Text Spacing | AA | `wcag1412` |
| 1.4.13 | Content on Hover or Focus | AA | `wcag1413` |

#### Principle 2: Operable

| SC | Name | Level | axe-core Tag |
|---|---|---|---|
| 2.1.1 | Keyboard | A | `wcag211` |
| 2.1.2 | No Keyboard Trap | A | `wcag212` |
| 2.1.4 | Character Key Shortcuts | A | `wcag214` |
| 2.2.1 | Timing Adjustable | A | `wcag221` |
| 2.2.2 | Pause, Stop, Hide | A | `wcag222` |
| 2.3.1 | Three Flashes or Below Threshold | A | `wcag231` |
| 2.4.1 | Bypass Blocks | A | `wcag241` |
| 2.4.2 | Page Titled | A | `wcag242` |
| 2.4.3 | Focus Order | A | `wcag243` |
| 2.4.4 | Link Purpose (In Context) | A | `wcag244` |
| 2.4.5 | Multiple Ways | AA | `wcag245` |
| 2.4.6 | Headings and Labels | AA | `wcag246` |
| 2.4.7 | Focus Visible | AA | `wcag247` |
| 2.4.11 | Focus Not Obscured (Minimum) | AA | `wcag2411` **NEW** |
| 2.5.1 | Pointer Gestures | A | `wcag251` |
| 2.5.2 | Pointer Cancellation | A | `wcag252` |
| 2.5.3 | Label in Name | A | `wcag253` |
| 2.5.4 | Motion Actuation | A | `wcag254` |
| 2.5.7 | Dragging Movements | AA | `wcag257` **NEW** |
| 2.5.8 | Target Size (Minimum) | AA | `wcag258` **NEW** |

#### Principle 3: Understandable

| SC | Name | Level | axe-core Tag |
|---|---|---|---|
| 3.1.1 | Language of Page | A | `wcag311` |
| 3.1.2 | Language of Parts | AA | `wcag312` |
| 3.2.1 | On Focus | A | `wcag321` |
| 3.2.2 | On Input | A | `wcag322` |
| 3.2.3 | Consistent Navigation | AA | `wcag323` |
| 3.2.4 | Consistent Identification | AA | `wcag324` |
| 3.2.6 | Consistent Help | A | `wcag326` **NEW** |
| 3.3.1 | Error Identification | A | `wcag331` |
| 3.3.2 | Labels or Instructions | A | `wcag332` |
| 3.3.3 | Error Suggestion | AA | `wcag333` |
| 3.3.4 | Error Prevention (Legal, Financial, Data) | AA | `wcag334` |
| 3.3.7 | Redundant Entry | A | `wcag337` **NEW** |
| 3.3.8 | Accessible Authentication (Minimum) | AA | `wcag338` **NEW** |

#### Principle 4: Robust

| SC | Name | Level | axe-core Tag |
|---|---|---|---|
| 4.1.2 | Name, Role, Value | A | `wcag412` |
| 4.1.3 | Status Messages | AA | `wcag413` |

**Note**: 4.1.1 Parsing was removed in WCAG 2.2 (obsolete).

---

## 3. Codebase WCAG Mapping

### axe-core Tags Used in Scanning Engine

From `src/lib/scanner/engine.ts` (line ~50), the scanner uses these axe-core tags:

```typescript
.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
```

This covers:

- `wcag2a` — WCAG 2.0 Level A rules
- `wcag2aa` — WCAG 2.0 Level AA rules
- `wcag21a` — WCAG 2.1 Level A rules (new in 2.1)
- `wcag21aa` — WCAG 2.1 Level AA rules (new in 2.1)
- `wcag22aa` — WCAG 2.2 Level AA rules (new in 2.2)
- `best-practice` — Best practice rules beyond WCAG

### WCAG Principle Mapper

From `src/lib/scoring/wcag-mapper.ts`, the mapper extracts the first digit of WCAG tags:

- `1` → Perceivable
- `2` → Operable
- `3` → Understandable
- `4` → Robust
- No WCAG tag → Best Practice

### Custom Checks (src/lib/scanner/custom-checks.ts)

The codebase has **5 custom Playwright-based checks**:

| Check ID | WCAG SC | Tags | Impact | Detection |
|---|---|---|---|---|
| `ambiguous-link-text` | 2.4.4 Link Purpose | `wcag2a`, `wcag244` | serious | Runtime — evaluates link text against ambiguous set |
| `aria-current-page` | 1.3.1 Info and Relationships | `wcag2a`, `wcag131` | moderate | Runtime — checks nav links for `aria-current="page"` |
| `emphasis-strong-semantics` | Best practice | `best-practice` | minor | Runtime — detects `<b>` and `<i>` instead of `<strong>` and `<em>` |
| `discount-price-accessibility` | 1.3.1 Info and Relationships | `wcag2a`, `wcag131` | serious | Runtime — checks `<del>`, `<s>`, `<strike>` for screen reader context |
| `sticky-element-overlap` | 2.4.7 Focus Visible | `wcag2aa`, `wcag247` | serious | Runtime — detects focusable elements hidden behind sticky/fixed elements |

### Multi-Engine Architecture

From `src/lib/scanner/engine.ts` and `result-normalizer.ts`:

1. **axe-core** — primary engine, runs on the Playwright page
2. **IBM Equal Access** — runs in an isolated page context to prevent JS corruption
3. **Custom checks** — Playwright-based checks that run in the main page context
4. **Deduplication** — violations from all engines are deduplicated by selector + WCAG tag, keeping higher severity

### IBM Equal Access Configuration

From `.achecker.yml`:

```yaml
ruleArchive: latest
policies:
  - IBM_Accessibility
  - WCAG_2_1
failLevels:
  - violation
  - potentialviolation
```

---

## 4. Static Analysis Capabilities

### axe-core Detection Coverage

axe-core can detect approximately **57 WCAG rules** statically and at runtime. Key rule-to-WCAG mappings:

| axe-core Rule ID | WCAG SC | What It Checks |
|---|---|---|
| `image-alt` | 1.1.1 | Images have alt text |
| `input-image-alt` | 1.1.1 | Input images have alt text |
| `area-alt` | 1.1.1 | Area elements have alt text |
| `object-alt` | 1.1.1 | Object elements have alt text |
| `svg-img-alt` | 1.1.1 | SVG images have accessible name |
| `video-caption` | 1.2.2 | Videos have captions |
| `aria-required-parent` | 1.3.1 | ARIA roles in required parent |
| `aria-required-children` | 1.3.1 | ARIA roles have required children |
| `definition-list` | 1.3.1 | Proper dl/dt/dd structure |
| `list` | 1.3.1 | Proper list structure |
| `listitem` | 1.3.1 | List items in proper parent |
| `table-fake-caption` | 1.3.1 | Tables don't use fake captions |
| `td-has-header` | 1.3.1 | Table cells have headers |
| `th-has-data-cells` | 1.3.1 | Table headers have data cells |
| `color-contrast` | 1.4.3 | Text contrast ratio ≥ 4.5:1 |
| `color-contrast-enhanced` | 1.4.6 | Text contrast ratio ≥ 7:1 |
| `meta-viewport` | 1.4.4 | Zoom not disabled by viewport meta |
| `link-in-text-block` | 1.4.1 | Links distinguishable from text |
| `bypass` | 2.4.1 | Skip navigation mechanism exists |
| `document-title` | 2.4.2 | Page has title |
| `tabindex` | 2.4.3 | Tabindex values don't create issues |
| `link-name` | 2.4.4 | Links have discernible text |
| `heading-order` | 2.4.6 | Heading levels don't skip |
| `empty-heading` | 2.4.6 | Headings are not empty |
| `html-has-lang` | 3.1.1 | HTML has lang attribute |
| `html-lang-valid` | 3.1.1 | HTML lang is valid |
| `valid-lang` | 3.1.2 | lang attributes are valid |
| `label` | 3.3.2 | Form inputs have labels |
| `select-name` | 3.3.2 | Select elements have labels |
| `input-button-name` | 4.1.2 | Input buttons have accessible name |
| `button-name` | 4.1.2 | Buttons have accessible name |
| `aria-roles` | 4.1.2 | ARIA roles are valid |
| `aria-valid-attr` | 4.1.2 | ARIA attributes are valid |
| `aria-valid-attr-value` | 4.1.2 | ARIA attribute values are valid |
| `duplicate-id-aria` | 4.1.2 | No duplicate ARIA IDs |
| `autocomplete-valid` | 1.3.5 | Autocomplete attributes are valid |
| `target-size` | 2.5.8 | Target size minimum (WCAG 2.2) |
| `landmark-*` | 2.4.1 | Various landmark rules |
| `frame-title` | 2.4.1 | Frames have titles |
| `form-field-multiple-labels` | 3.3.2 | Form fields don't have multiple labels |

### IBM Equal Access Additional Coverage

IBM Equal Access detects issues that axe-core may miss:

- ARIA widget design pattern checks (more granular)
- Content language detection at element level
- Reading order issues
- Keyboard interaction pattern validation
- More detailed table accessibility checks
- Focus management in dynamic content

### Gaps Requiring Custom Checks or Manual Testing

| WCAG SC | Gap | Why |
|---|---|---|
| 2.4.11 Focus Not Obscured | **Partially automated** — codebase has `sticky-element-overlap` custom check but can't detect all overlay scenarios | Requires runtime focus traversal |
| 2.5.7 Dragging Movements | **Not automatable** — must verify single-pointer alternatives exist | Requires understanding of UI intent |
| 2.5.8 Target Size | **Partially automated** — axe-core has `target-size` rule | Complex spacing exceptions need manual review |
| 3.2.6 Consistent Help | **Not automatable** — requires multi-page comparison | Requires cross-page context |
| 3.3.7 Redundant Entry | **Not automatable** — requires understanding of multi-step process | Requires workflow context |
| 3.3.8 Accessible Authentication | **Not automatable** — must verify cognitive function test alternatives | Requires understanding of auth flow |
| 1.2.x Time-Based Media | **Not automatable** — captions, audio descriptions require human review | Content quality assessment |
| 1.3.3 Sensory Characteristics | **Not automatable** — "click the green button" in text | Requires natural language understanding |
| 1.4.1 Use of Color | **Partially automated** — color-only conveying of info needs manual check | Context-dependent meaning |
| 2.4.5 Multiple Ways | **Not automatable** — multiple navigation paths | Structural design check |
| 2.4.3 Focus Order | **Partially automated** — logical order requires human judgment | Context-dependent logic |
| 3.2.3 Consistent Navigation | **Not automatable** — cross-page navigation consistency | Multi-page comparison |
| 3.2.4 Consistent Identification | **Not automatable** — cross-page component naming | Multi-page comparison |

### Detection Categorization Summary

| Category | Approximate Coverage |
|---|---|
| Fully automatable | ~30-40% of WCAG 2.2 Level AA criteria |
| Partially automatable (automated with manual confirmation) | ~20-30% of criteria |
| Manual testing only | ~30-40% of criteria |

---

## 5. Common Violations in React/Next.js Applications

### Top 20 Most Common Violations

Based on axe-core rule frequency data and React/Next.js patterns:

| Rank | axe-core Rule | WCAG SC | Common React/Next.js Cause |
|---|---|---|---|
| 1 | `color-contrast` | 1.4.3 | Tailwind/CSS custom colors with insufficient contrast |
| 2 | `image-alt` | 1.1.1 | `<Image>` components missing alt prop |
| 3 | `link-name` | 2.4.4 | Icon-only links without `aria-label` |
| 4 | `button-name` | 4.1.2 | Icon-only buttons without accessible name |
| 5 | `label` | 3.3.2 | Form inputs without associated labels |
| 6 | `html-has-lang` | 3.1.1 | Missing `lang` attribute in `layout.tsx` |
| 7 | `heading-order` | 2.4.6 | Skipping heading levels (h1 → h3) |
| 8 | `empty-heading` | 2.4.6 | Headings with no text content |
| 9 | `document-title` | 2.4.2 | Missing or generic page titles |
| 10 | `aria-hidden-focus` | 4.1.2 | `aria-hidden` on focusable elements |
| 11 | `duplicate-id` | 4.1.2 | Repeated component IDs in lists |
| 12 | `bypass` | 2.4.1 | No skip-to-content link |
| 13 | `meta-viewport` | 1.4.4 | `maximum-scale=1` in viewport meta |
| 14 | `autocomplete-valid` | 1.3.5 | Missing or invalid autocomplete attributes |
| 15 | `region` | best-practice | Content not in landmark regions |
| 16 | `list` | 1.3.1 | Invalid list structure in JSX |
| 17 | `aria-roles` | 4.1.2 | Invalid ARIA roles on custom components |
| 18 | `select-name` | 3.3.2 | Select elements without labels |
| 19 | `frame-title` | 2.4.1 | Iframes without title attribute |
| 20 | `link-in-text-block` | 1.4.1 | Links only distinguished by color |

### React/Next.js Specific Anti-Patterns

1. **Next.js Image component** — `<Image>` requires explicit `alt` prop; empty string for decorative images
2. **Client-side routing** — focus management not reset on page navigation; no announcements for route changes
3. **Dynamic content loading** — no `aria-live` regions for async updates
4. **Custom components** — div-based buttons/links missing keyboard handlers and ARIA roles
5. **Server Components** — cannot use `useEffect` for focus management; requires Client Components
6. **Conditional rendering** — hidden content remaining in DOM with incorrect `aria-hidden` state
7. **Form state management** — error messages not associated with inputs via `aria-describedby`
8. **Modal dialogs** — focus trapping not implemented, no `role="dialog"` or `aria-modal`
9. **Toast notifications** — missing `role="alert"` or `aria-live="assertive"`
10. **Data tables** — missing `<caption>`, `scope` attributes, or header associations

---

## 6. Standard Remediation Patterns

### Images and Non-Text Content (1.1.1)

| Violation | Fix |
|---|---|
| Missing `alt` on `<img>` | Add descriptive `alt="description"` |
| Decorative image with no alt | Add `alt=""` and optionally `role="presentation"` |
| Next.js `<Image>` missing alt | Add `alt` prop: `<Image src={...} alt="Description" />` |
| Icon-only link/button | Add `aria-label="Purpose"` or visually hidden text |
| SVG without accessible name | Add `role="img" aria-label="Description"` or `<title>` inside SVG |

### Color Contrast (1.4.3)

| Violation | Fix |
|---|---|
| Text contrast below 4.5:1 | Darken text or lighten background; use contrast checker |
| Large text contrast below 3:1 | Adjust colors for large text (18pt or 14pt bold) |
| Non-text contrast below 3:1 (1.4.11) | Adjust UI component/icon colors against adjacent colors |

### Form Labels and Input (3.3.2)

| Violation | Fix |
|---|---|
| Input without label | Add `<label htmlFor="id">` or `aria-label` |
| Multiple labels | Remove duplicate labels, keep one `<label>` |
| Missing error identification | Add `aria-invalid="true"` and `aria-describedby` pointing to error message |
| No error suggestion | Provide specific correction guidance in error text |
| Missing autocomplete | Add `autoComplete="name"` / `autoComplete="email"` etc. (1.3.5) |

### Keyboard and Focus (2.1.1, 2.4.7)

| Violation | Fix |
|---|---|
| Non-interactive element as button | Use `<button>` instead of `<div onClick>` |
| Missing focus indicator | Add CSS `:focus-visible` styles with visible outline |
| Focus trapped in component | Ensure Tab/Shift+Tab can leave component |
| Focus obscured by sticky element (2.4.11) | Add `scroll-padding-top` / `scroll-margin-top` to account for fixed headers |
| No skip navigation link | Add `<a href="#main" className="sr-only focus:not-sr-only">Skip to content</a>` |

### Page Structure (1.3.1, 2.4.6)

| Violation | Fix |
|---|---|
| Skipped heading levels | Use sequential heading levels (h1 → h2 → h3) |
| Missing page title | Set unique `<title>` via Next.js `metadata` export |
| Missing `lang` attribute | Add `lang="en"` to `<html>` element in `layout.tsx` |
| Content not in landmarks | Wrap content in `<main>`, `<nav>`, `<header>`, `<footer>` |
| Ambiguous link text | Replace "Click here" with descriptive text like "View accessibility report" |

### ARIA and Custom Components (4.1.2)

| Violation | Fix |
|---|---|
| Custom button missing role | Add `role="button"` and `tabIndex={0}` with keydown handler |
| Status message not announced | Add `role="status"` or `aria-live="polite"` to container |
| Invalid ARIA attribute | Remove invalid `aria-*` attributes; check WAI-ARIA spec |
| Duplicate IDs | Generate unique IDs with `useId()` hook or key-based prefixes |
| Modal without focus trap | Implement focus trap with `inert` on background content |

### WCAG 2.2 New Criteria Remediations

| SC | Remediation Pattern |
|---|---|
| 2.4.11 Focus Not Obscured | Use `scroll-padding-top`/`scroll-margin` CSS; avoid fixed overlays covering focusable content |
| 2.5.7 Dragging Movements | Provide button-based alternatives (up/down arrows) for any drag-and-drop |
| 2.5.8 Target Size | Ensure clickable elements are ≥ 24×24px; add padding if needed |
| 3.2.6 Consistent Help | Place help mechanisms (chat, phone, FAQ link) in consistent location across pages |
| 3.3.7 Redundant Entry | Use session storage or form state to auto-populate previously entered data |
| 3.3.8 Accessible Authentication | Allow password managers (no `autocomplete="off"` on password fields); support copy-paste; offer passwordless auth |

---

## 7. Gaps Between Automated and Manual Testing

### What Automated Tools Can Detect Well

- Missing alt text on images
- Color contrast ratio failures
- Missing form labels
- Missing page language
- Invalid ARIA attributes and roles
- Heading hierarchy violations
- Duplicate IDs
- Missing page titles
- Keyboard trap detection (basic)
- Target size measurement (2.5.8)
- Focus not obscured by sticky elements (custom check in codebase)

### What Requires Manual Testing

- **Semantic accuracy** — alt text exists but is it meaningful?
- **Keyboard operability** — can all functions be completed by keyboard?
- **Focus order** — is the tab order logical?
- **Dynamic content** — are screen readers notified of updates?
- **Drag alternatives** — do single-pointer alternatives exist?
- **Authentication flows** — are cognitive function tests avoidable?
- **Cross-page consistency** — navigation, identification, help placement
- **Redundant entry** — is previously entered data auto-populated?
- **Time-based media** — caption quality, audio description accuracy
- **Content on hover/focus** — can tooltip content be dismissed, hovered, and persistent?
- **Sensory characteristics** — does instruction rely solely on shape/color/location?
- **Reading level** — is content appropriately simplified?
- **Error prevention** — can legal/financial submissions be reversed?

### Automated Detection Rate by Principle

| Principle | Auto-Detectable | Partially Auto | Manual Only |
|---|---|---|---|
| Perceivable | ~50% | ~20% | ~30% |
| Operable | ~30% | ~30% | ~40% |
| Understandable | ~20% | ~20% | ~60% |
| Robust | ~70% | ~20% | ~10% |
| **Overall** | **~35-40%** | **~25%** | **~35-40%** |

---

## 8. Codebase-Specific WCAG Coverage Analysis

### axe-core Tags → WCAG Version Coverage

| axe-core Tag | WCAG Version | Level | Active in Codebase |
|---|---|---|---|
| `wcag2a` | 2.0 | A | Yes |
| `wcag2aa` | 2.0 | AA | Yes |
| `wcag21a` | 2.1 | A | Yes |
| `wcag21aa` | 2.1 | AA | Yes |
| `wcag22aa` | 2.2 | AA | Yes |
| `best-practice` | N/A | N/A | Yes |

### Custom Check Coverage Map

| Custom Check | WCAG SC | Principle | Fills Gap |
|---|---|---|---|
| `ambiguous-link-text` | 2.4.4 | Operable | Supplements axe `link-name` with generic text detection |
| `aria-current-page` | 1.3.1 | Perceivable | Not covered by axe-core |
| `emphasis-strong-semantics` | Best practice | N/A | Semantic HTML recommendation |
| `discount-price-accessibility` | 1.3.1 | Perceivable | e-Commerce specific; not in standard tools |
| `sticky-element-overlap` | 2.4.7/2.4.11 | Operable | **Covers new WCAG 2.2 SC 2.4.11** |

### Scoring Architecture

From `src/lib/scoring/calculator.ts`:

- **Impact weights**: critical(10), serious(7), moderate(3), minor(1)
- **Score formula**: `(weightedPassed / weightedTotal) * 100`
- **Grade scale**: A(≥90), B(≥70), C(≥50), D(≥30), F(<30)
- **AODA compliance**: `aodaCompliant = violations.length === 0`
- **Principle scores**: Independent scores per POUR principle

### Threshold Configuration

From `src/lib/ci/threshold.ts`:

- Default minimum score: 70
- Default max critical violations: 0
- Default max serious violations: 5
- Configurable `failOnRules[]` and `ignoreRules[]`
- Supports per-impact-level violation caps

---

## 9. Recommended Custom Checks to Add

Based on gap analysis, these custom checks would improve WCAG 2.2 coverage:

| Priority | Check | WCAG SC | Description |
|---|---|---|---|
| High | `target-size-minimum` | 2.5.8 | Validate interactive elements ≥ 24×24px with spacing |
| High | `focus-visible-style` | 2.4.7 | Verify custom `:focus-visible` outlines exist |
| Medium | `autocomplete-identity` | 1.3.5 | Verify `autocomplete` on identity/payment inputs |
| Medium | `status-message-live-region` | 4.1.3 | Verify dynamic status messages use `aria-live` |
| Medium | `heading-hierarchy-page` | 1.3.1 | Verify single h1 and sequential hierarchy |
| Low | `consistent-help-location` | 3.2.6 | Cross-page help mechanism position check |
| Low | `password-input-pasteable` | 3.3.8 | Verify password fields allow paste |

---

## References and Evidence

- **WCAG 2.2 W3C Recommendation**: https://www.w3.org/TR/WCAG22/ (December 12, 2024)
- **What's New in WCAG 2.2**: https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/
- **axe-core Rule Descriptions**: https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md
- **IBM Equal Access**: https://www.ibm.com/able/
- **AODA IASR**: https://www.ontario.ca/laws/regulation/110191
- **Codebase scanner engine**: `src/lib/scanner/engine.ts` — multi-engine scan with axe-core, IBM Equal Access, and custom checks
- **Codebase custom checks**: `src/lib/scanner/custom-checks.ts` — 5 custom Playwright-based checks
- **Codebase WCAG mapper**: `src/lib/scoring/wcag-mapper.ts` — POUR principle mapping
- **Codebase types**: `src/lib/types/scan.ts`, `src/lib/types/score.ts`, `src/lib/types/crawl.ts`
- **Codebase threshold**: `src/lib/ci/threshold.ts` — CI quality gate with per-impact limits
- **Codebase e2e fixture**: `e2e/fixtures/axe-fixture.ts` — WCAG 2.2 AA tag configuration

---

## Discovered Research Topics

- axe-core rule-to-WCAG mapping completeness for WCAG 2.2 new criteria
- IBM Equal Access rule coverage for WCAG 2.2 (current config references WCAG 2.1)
- React-specific accessibility testing libraries (jest-axe, @testing-library/jest-dom matchers)
- Playwright accessibility snapshot testing patterns
- SARIF format for accessibility violation reporting (already in `src/lib/report/sarif-generator.ts`)

## Clarifying Questions

1. Should the `.achecker.yml` be updated to reference WCAG 2.2 policies when IBM Equal Access supports it?
2. Is there a target for custom check count to close the gap on WCAG 2.2 new criteria?
3. Should the scoring model weight WCAG 2.2 new criteria differently given their recency?
