import type { Page } from 'playwright';
import type { CustomCheckResult } from './result-normalizer';

const AMBIGUOUS_LINK_TEXTS = new Set([
  'learn more', 'click here', 'more', 'here', 'read more',
  'continue', 'details', 'link',
]);

async function checkAmbiguousLinkText(page: Page): Promise<CustomCheckResult | null> {
  const nodes = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a'));
    const results: { html: string; target: string[] }[] = [];
    const ambiguous = new Set([
      'learn more', 'click here', 'more', 'here', 'read more',
      'continue', 'details', 'link',
    ]);
    for (const link of links) {
      const text = (link.innerText ?? '').trim().toLowerCase();
      if (text && ambiguous.has(text)) {
        results.push({
          html: link.outerHTML,
          target: [link.tagName.toLowerCase() + (link.className ? '.' + link.className.split(/\s+/).join('.') : '')],
        });
      }
    }
    return results;
  });

  if (!nodes.length) return null;

  return {
    id: 'ambiguous-link-text',
    impact: 'serious',
    description: 'Links must have descriptive text that conveys their purpose without surrounding context.',
    help: 'Avoid generic link text like "Learn More", "Click Here", etc.',
    helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/link-purpose-in-context.html',
    tags: ['wcag2a', 'wcag244'],
    nodes,
  };
}

async function checkAriaCurrentPage(page: Page): Promise<CustomCheckResult | null> {
  const nodes = await page.evaluate(() => {
    const results: { html: string; target: string[] }[] = [];
    const navs = Array.from(document.querySelectorAll('nav'));
    const currentPath = window.location.pathname;
    const currentHref = window.location.href;

    for (const nav of navs) {
      const links = Array.from(nav.querySelectorAll('a[href]'));
      for (const link of links) {
        const href = link.getAttribute('href') ?? '';
        const resolvedHref = (link as HTMLAnchorElement).href;
        const isCurrentPage = href === currentPath || resolvedHref === currentHref;
        if (isCurrentPage && link.getAttribute('aria-current') !== 'page') {
          results.push({
            html: link.outerHTML,
            target: [link.tagName.toLowerCase() + (link.className ? '.' + link.className.split(/\s+/).join('.') : '')],
          });
        }
      }
    }
    return results;
  });

  if (!nodes.length) return null;

  return {
    id: 'aria-current-page',
    impact: 'moderate',
    description: 'Navigation links pointing to the current page should have aria-current="page".',
    help: 'Add aria-current="page" to navigation links that point to the current page.',
    helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html',
    tags: ['wcag2a', 'wcag131'],
    nodes,
  };
}

async function checkEmphasisStrongSemantics(page: Page): Promise<CustomCheckResult | null> {
  const nodes = await page.evaluate(() => {
    const results: { html: string; target: string[] }[] = [];
    const elements = Array.from(document.querySelectorAll('b, i'));

    for (const el of elements) {
      // Skip if aria-hidden (decorative use is fine)
      if (el.getAttribute('aria-hidden') === 'true') continue;
      // Skip if inside <code>, <pre>, or used as icon container (common pattern)
      if (el.closest('code, pre')) continue;

      results.push({
        html: el.outerHTML,
        target: [el.tagName.toLowerCase()],
      });
    }
    return results;
  });

  if (!nodes.length) return null;

  return {
    id: 'emphasis-strong-semantics',
    impact: 'minor',
    description: '<b> and <i> elements convey no semantic meaning. Use <strong> and <em> instead for meaningful emphasis.',
    help: 'Replace <b> with <strong> and <i> with <em> for semantic emphasis.',
    helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html',
    tags: ['best-practice'],
    nodes,
  };
}

async function checkDiscountPriceAccessibility(page: Page): Promise<CustomCheckResult | null> {
  const nodes = await page.evaluate(() => {
    const results: { html: string; target: string[] }[] = [];
    const strikethroughElements = Array.from(document.querySelectorAll('del, s, strike'));

    for (const el of strikethroughElements) {
      // Check for aria-label on the element itself
      if (el.getAttribute('aria-label')) continue;

      // Check for visually-hidden/sr-only adjacent context
      const parent = el.parentElement;
      if (parent) {
        const siblingText = parent.textContent?.toLowerCase() ?? '';
        const contextPatterns = ['original price', 'was', 'regular price', 'old price', 'previously'];
        if (contextPatterns.some(p => siblingText.includes(p))) continue;

        // Check for sr-only / visually-hidden class in siblings or children
        const srOnly = parent.querySelector('.sr-only, .visually-hidden, [class*="sr-only"], [class*="visually-hidden"]');
        if (srOnly) continue;
      }

      results.push({
        html: el.outerHTML,
        target: [el.tagName.toLowerCase()],
      });
    }
    return results;
  });

  if (!nodes.length) return null;

  return {
    id: 'discount-price-accessibility',
    impact: 'serious',
    description: 'Strikethrough pricing must provide screen reader context so users understand the visual meaning.',
    help: 'Add aria-label or visually-hidden text to indicate strikethrough pricing context.',
    helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html',
    tags: ['wcag2a', 'wcag131'],
    nodes,
  };
}

async function checkStickyElementOverlap(page: Page): Promise<CustomCheckResult | null> {
  const nodes = await page.evaluate(() => {
    const results: { html: string; target: string[] }[] = [];

    // Find all fixed/sticky elements
    const allElements = Array.from(document.querySelectorAll('*'));
    const stickyRects: DOMRect[] = [];
    for (const el of allElements) {
      const style = window.getComputedStyle(el);
      if (style.position === 'fixed' || style.position === 'sticky') {
        stickyRects.push(el.getBoundingClientRect());
      }
    }

    if (!stickyRects.length) return results;

    // Find focusable elements
    const focusable = Array.from(document.querySelectorAll(
      'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ));

    for (const el of focusable) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) continue;

      for (const stickyRect of stickyRects) {
        const overlaps =
          rect.top < stickyRect.bottom &&
          rect.bottom > stickyRect.top &&
          rect.left < stickyRect.right &&
          rect.right > stickyRect.left;

        if (overlaps) {
          results.push({
            html: el.outerHTML,
            target: [el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).split(/\s+/).join('.') : '')],
          });
          break; // Only report each focusable element once
        }
      }
    }
    return results;
  });

  if (!nodes.length) return null;

  return {
    id: 'sticky-element-overlap',
    impact: 'serious',
    description: 'Focusable elements must not be obscured by fixed or sticky positioned elements.',
    help: 'Ensure focusable elements are not hidden behind sticky or fixed headers/footers.',
    helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html',
    tags: ['wcag2aa', 'wcag247'],
    nodes,
  };
}

/**
 * Run all custom Playwright-based accessibility checks on a page.
 * Each check is independently wrapped in try/catch for resilience.
 */
export async function runCustomChecks(page: Page): Promise<CustomCheckResult[]> {
  const checks = [
    checkAmbiguousLinkText,
    checkAriaCurrentPage,
    checkEmphasisStrongSemantics,
    checkDiscountPriceAccessibility,
    checkStickyElementOverlap,
  ];
  const results: CustomCheckResult[] = [];
  for (const check of checks) {
    try {
      const result = await check(page);
      if (result && result.nodes.length > 0) {
        results.push(result);
      }
    } catch {
      // Individual check failures should not block other checks
    }
  }
  return results;
}

// Exported for testing
export {
  checkAmbiguousLinkText,
  checkAriaCurrentPage,
  checkEmphasisStrongSemantics,
  checkDiscountPriceAccessibility,
  checkStickyElementOverlap,
  AMBIGUOUS_LINK_TEXTS,
};
