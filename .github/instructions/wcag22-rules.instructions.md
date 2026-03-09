---
description: 'AODA WCAG 2.2 Level AA compliance rules for accessibility in web components'
applyTo: '**/*.tsx, **/*.jsx, **/*.ts, **/*.html, **/*.css'
---

# WCAG 2.2 Level AA Compliance Rules

## AODA and WCAG 2.2 Context

Ontario's Accessibility for Ontarians with Disabilities Act (AODA) legally requires WCAG 2.0 Level AA conformance for web content. WCAG 2.2 is backwards compatible with WCAG 2.0 — conforming to WCAG 2.2 Level AA automatically satisfies AODA requirements. Target WCAG 2.2 Level AA to exceed AODA minimums and anticipate policy updates.

## Perceivable

| SC | Title | Rule |
|---|---|---|
| 1.1.1 | Non-text Content | Provide `alt` text on every `<img>` and `<Image>` component; use `alt=""` for decorative images. |
| 1.2.2 | Captions (Prerecorded) | Provide captions for all prerecorded audio content in synchronized media. |
| 1.3.1 | Info and Relationships | Use semantic HTML (`<nav>`, `<main>`, `<header>`, `<table>`) to convey structure, not visual styling alone. |
| 1.3.2 | Meaningful Sequence | Ensure DOM order matches the visual reading order; do not rely on CSS to reorder content. |
| 1.3.3 | Sensory Characteristics | Do not rely solely on shape, color, size, or location to convey instructions (e.g., "click the red button"). |
| 1.3.4 | Orientation | Do not restrict display to a single orientation unless essential. |
| 1.3.5 | Identify Input Purpose | Use `autocomplete` attributes on input fields that collect personal data (name, email, address). |
| 1.4.3 | Contrast (Minimum) | Maintain at least 4.5:1 contrast ratio for normal text and 3:1 for large text (≥18pt or ≥14pt bold). |
| 1.4.4 | Resize Text | Text must be resizable up to 200% without loss of content or functionality; do not set `maximum-scale=1` in viewport meta. |
| 1.4.5 | Images of Text | Use real text instead of images of text; exceptions for logos and essential images. |
| 1.4.10 | Reflow | Content must reflow to a single column at 320 CSS px width without horizontal scrolling. |
| 1.4.11 | Non-text Contrast | UI components and graphical objects must have at least 3:1 contrast against adjacent colors. |
| 1.4.12 | Text Spacing | Content must remain functional when users override line height to 1.5×, letter spacing to 0.12em, word spacing to 0.16em, paragraph spacing to 2×. |
| 1.4.13 | Content on Hover or Focus | Hover/focus-triggered content must be dismissible, hoverable, and persistent until dismissed. |

## Operable

| SC | Title | Rule |
|---|---|---|
| 2.1.1 | Keyboard | All functionality must be operable via keyboard; use `<button>` and `<a>` instead of `div` with click handlers. |
| 2.1.2 | No Keyboard Trap | Ensure focus can leave every component using standard keyboard navigation (Tab, Shift+Tab, Escape). |
| 2.2.1 | Timing Adjustable | If a time limit exists, provide a way to turn off, adjust, or extend it. |
| 2.2.2 | Pause, Stop, Hide | Provide controls to pause, stop, or hide moving, blinking, or auto-updating content. |
| 2.3.1 | Three Flashes | Content must not flash more than three times per second. |
| 2.4.1 | Bypass Blocks | Provide a skip navigation link as the first focusable element on each page. |
| 2.4.2 | Page Titled | Every page must have a unique, descriptive `<title>`. |
| 2.4.3 | Focus Order | Focus order must follow a logical sequence matching the visual layout. |
| 2.4.4 | Link Purpose (In Context) | Link text must describe its destination; avoid "Click here" or "Read more" without context. |
| 2.4.6 | Headings and Labels | Use descriptive headings in sequential order (h1 → h2 → h3); do not skip heading levels. |
| 2.4.7 | Focus Visible | Focused elements must have a visible focus indicator; use `:focus-visible` with a distinct outline. |
| 2.4.11 | Focus Not Obscured (Minimum) | **NEW 2.2** — Focused element must not be entirely hidden by sticky headers, footers, or overlays; use `scroll-padding-top`. |
| 2.5.7 | Dragging Movements | **NEW 2.2** — Any drag operation must have a single-pointer alternative (e.g., tap, click). |
| 2.5.8 | Target Size (Minimum) | **NEW 2.2** — Pointer targets must be at least 24×24 CSS pixels, or provide sufficient spacing. |

## Understandable

| SC | Title | Rule |
|---|---|---|
| 3.1.1 | Language of Page | Set `lang="en"` on the `<html>` element in the root `layout.tsx`. |
| 3.1.2 | Language of Parts | Mark content in a different language with the appropriate `lang` attribute on its container. |
| 3.2.1 | On Focus | Focus alone must not trigger a change of context (navigation, form submit). |
| 3.2.2 | On Input | Changing a form input value must not automatically trigger a change of context without warning. |
| 3.2.3 | Consistent Navigation | Navigation menus must appear in the same relative order across pages. |
| 3.2.4 | Consistent Identification | Components with the same function must be identified consistently across pages. |
| 3.2.6 | Consistent Help | **NEW 2.2** — Help mechanisms (contact info, chat, FAQ links) must appear in the same relative position across pages. |
| 3.3.1 | Error Identification | Identify form errors in text and describe the error to the user. |
| 3.3.2 | Labels or Instructions | Provide labels or instructions for user input; every input must have an associated label. |
| 3.3.3 | Error Suggestion | When an input error is detected, suggest a correction if known. |
| 3.3.4 | Error Prevention (Legal, Financial, Data) | For legal/financial submissions, allow review, confirmation, or reversal before final submit. |
| 3.3.7 | Redundant Entry | **NEW 2.2** — Do not require users to re-enter information already provided in the same session; auto-populate or offer selection. |
| 3.3.8 | Accessible Authentication (Minimum) | **NEW 2.2** — Authentication must not require a cognitive function test (memorize, transcribe, calculate) unless an alternative is provided. |

## Robust

| SC | Title | Rule |
|---|---|---|
| 4.1.2 | Name, Role, Value | All UI components must have an accessible name and expose correct role and state via HTML semantics or ARIA. |
| 4.1.3 | Status Messages | Dynamic status updates (success, error, progress) must use `role="status"` or `aria-live="polite"` so screen readers announce them without focus change. |

> **Note**: SC 4.1.1 Parsing was removed in WCAG 2.2 as it is obsolete in modern HTML.

## React and Next.js Rules

* Always provide an `alt` prop on `<Image>` components from `next/image`; use `alt=""` with `aria-hidden="true"` for decorative images.
* Use `htmlFor` (not `for`) on `<label>` elements when associating with form controls.
* Use the `useId()` hook to generate unique element IDs; never hardcode IDs that may duplicate across component instances.
* Include `lang="en"` on the `<html>` element in the root `layout.tsx`.
* Prefer semantic HTML elements (`<button>`, `<nav>`, `<main>`, `<section>`) over ARIA roles on generic elements.
* Use `aria-live="polite"` or `role="status"` regions for dynamic content updates (e.g., loading states, form feedback).
* Manage focus programmatically with `useRef()` and `useEffect()` after route changes or modal opens.
* Add a skip navigation link as the first child of `<body>` using `className="sr-only focus:not-sr-only"`.

## Scoring System Reference

This repository uses a weighted scoring model:

| Impact Level | Weight | Examples |
|---|---|---|
| Critical | 10 | Missing alt text on informative images, no keyboard access |
| Serious | 7 | Color contrast failures, missing form labels |
| Moderate | 3 | Heading order violations, missing lang on parts |
| Minor | 1 | Best practice issues, non-semantic emphasis |

Grades: A (≥90), B (≥70), C (≥50), D (≥30), F (<30).
