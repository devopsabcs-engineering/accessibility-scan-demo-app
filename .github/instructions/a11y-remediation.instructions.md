---
description: 'AODA WCAG 2.2 accessibility remediation patterns and code fix recipes for web components'
applyTo: '**/*.tsx, **/*.jsx, **/*.ts, **/*.html, **/*.css'
---

# Accessibility Remediation Patterns

## Fix Prioritization

Apply fixes in order of impact severity:

1. **Critical** (score impact 10) — missing alt on informative images, no keyboard access, focus traps
2. **Serious** (score impact 7) — color contrast failures, missing form labels, ambiguous links
3. **Moderate** (score impact 3) — heading order violations, missing lang on parts
4. **Minor** (score impact 1) — best practice issues, non-semantic emphasis elements

## Remediation Lookup Table

| Violation ID | WCAG SC | Fix |
|---|---|---|
| `image-alt` | 1.1.1 | Add `alt="Description"` for informative images or `alt=""` for decorative images. |
| `image-alt-nextjs` | 1.1.1 | Add `alt` prop to `<Image>` component: `<Image alt="Description" ... />`. |
| `color-contrast` | 1.4.3 | Darken text or lighten background to achieve at least 4.5:1 ratio for normal text and 3:1 for large text. |
| `link-name` | 2.4.4 | Add `aria-label="Purpose"` or include visually hidden text inside the link. |
| `button-name` | 4.1.2 | Add `aria-label="Action"` or visible text content inside `<button>`. |
| `label` | 3.3.2 | Add `<label htmlFor="inputId">Label text</label>` or `aria-label` on the input. |
| `html-has-lang` | 3.1.1 | Add `lang="en"` to `<html>` in root `layout.tsx`. |
| `heading-order` | 2.4.6 | Use sequential heading levels only (h1 → h2 → h3); do not skip levels. |
| `bypass` | 2.4.1 | Add a skip navigation link as the first focusable element on the page. |
| `focus-visible` | 2.4.7 | Add `:focus-visible` CSS rule with a visible outline (e.g., `outline: 2px solid`). |
| `target-size` | 2.5.8 | Ensure interactive target is at least 24×24 CSS pixels using padding or min-width/min-height. |
| `focus-not-obscured` | 2.4.11 | Add `scroll-padding-top` matching the sticky header height to prevent focus obscuring. |
| `aria-live` | 4.1.3 | Add `role="status"` or `aria-live="polite"` on containers with dynamic content updates. |
| `duplicate-id` | 4.1.2 | Replace hardcoded IDs with `useId()` hook to guarantee uniqueness across instances. |
| `meta-viewport` | 1.4.4 | Remove `maximum-scale=1` and `user-scalable=no` from viewport meta tag. |
| `link-in-text-block` | 2.4.4 | Replace "Click here" or "Read more" with descriptive link text that conveys the destination. |
| `aria-current-page` | 1.3.1 | Add `aria-current="page"` to the active navigation link. |
| `non-semantic-emphasis` | Best practice | Replace `<b>` with `<strong>` and `<i>` with `<em>` for semantic emphasis. |
| `div-as-button` | 4.1.2 | Replace `<div onClick={...}>` with a `<button>` element that provides keyboard and screen reader support. |

## React and Next.js Code Patterns

### Unique IDs with useId

```tsx
import { useId } from 'react';

function FormField({ label }: { label: string }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <input id={id} type="text" />
    </div>
  );
}
```

### Next.js Image with Alt Text

```tsx
import Image from 'next/image';

// Informative image
<Image src="/hero.jpg" alt="Team collaborating in a meeting room" width={800} height={400} />

// Decorative image
<Image src="/bg-pattern.svg" alt="" aria-hidden="true" width={200} height={200} />
```

### Focus Management After Navigation

```tsx
import { useRef, useEffect } from 'react';

function PageContent({ title }: { title: string }) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return <h1 ref={headingRef} tabIndex={-1}>{title}</h1>;
}
```

### Live Region for Dynamic Content

```tsx
import { useState } from 'react';

function StatusMessage() {
  const [message, setMessage] = useState('');

  return (
    <div aria-live="polite" role="status">
      {message}
    </div>
  );
}
```

### Skip Navigation Link

```tsx
<a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:p-2 focus:bg-white focus:z-50">
  Skip to main content
</a>
```

### Focus Visible CSS

```css
:focus-visible {
  outline: 2px solid #1a73e8;
  outline-offset: 2px;
}
```

### Scroll Padding for Sticky Headers

```css
html {
  scroll-padding-top: 4rem; /* Match the sticky header height */
}
```

## Common Anti-Patterns to Avoid

* **`tabIndex` greater than 0** — Creates unpredictable focus order. Use `tabIndex={0}` for custom focusable elements or `tabIndex={-1}` for programmatic focus only.
* **`role="button"` on `div` without keyboard handlers** — Must also add `onKeyDown` for Enter and Space. Prefer a native `<button>` element instead.
* **`aria-hidden="true"` on focusable elements** — Hides the element from screen readers while it remains in the tab order, creating a "ghost" tab stop. Remove `aria-hidden` or remove the element from tab order.
* **`maximum-scale=1` in viewport meta** — Prevents pinch-to-zoom, violating SC 1.4.4. Remove `maximum-scale` and `user-scalable=no` from the viewport meta tag.
* **Empty headings** — Screen readers announce "heading level N" with no content. Remove empty headings or add descriptive text.
* **Generic link text** — "Click here", "Read more", "Learn more" without context. Use descriptive text or `aria-label` that explains the destination.
