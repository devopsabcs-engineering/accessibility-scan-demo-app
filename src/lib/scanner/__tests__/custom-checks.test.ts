import { vi, describe, it, expect, beforeEach } from 'vitest';
import {
  checkAmbiguousLinkText,
  checkAriaCurrentPage,
  checkEmphasisStrongSemantics,
  checkDiscountPriceAccessibility,
  checkStickyElementOverlap,
  runCustomChecks,
} from '../custom-checks';
import type { Page } from 'playwright';

function createMockPage(): Page {
  return {
    evaluate: vi.fn(),
  } as unknown as Page;
}

describe('custom-checks', () => {
  let page: Page;

  beforeEach(() => {
    page = createMockPage();
  });

  describe('checkAmbiguousLinkText', () => {
    it('detects ambiguous link text like "Learn More"', async () => {
      (page.evaluate as ReturnType<typeof vi.fn>).mockResolvedValue([
        { html: '<a href="/info">Learn More</a>', target: ['a'] },
        { html: '<a href="/details">Click Here</a>', target: ['a'] },
      ]);

      const result = await checkAmbiguousLinkText(page);

      expect(result).not.toBeNull();
      expect(result!.id).toBe('ambiguous-link-text');
      expect(result!.impact).toBe('serious');
      expect(result!.nodes).toHaveLength(2);
      expect(result!.tags).toContain('wcag244');
    });

    it('returns null when all links have descriptive text', async () => {
      (page.evaluate as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await checkAmbiguousLinkText(page);

      expect(result).toBeNull();
    });

    it('returns null for empty page with no links', async () => {
      (page.evaluate as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await checkAmbiguousLinkText(page);

      expect(result).toBeNull();
    });
  });

  describe('checkAriaCurrentPage', () => {
    it('detects nav links missing aria-current="page"', async () => {
      (page.evaluate as ReturnType<typeof vi.fn>).mockResolvedValue([
        { html: '<a href="/">Home</a>', target: ['a'] },
      ]);

      const result = await checkAriaCurrentPage(page);

      expect(result).not.toBeNull();
      expect(result!.id).toBe('aria-current-page');
      expect(result!.impact).toBe('moderate');
      expect(result!.nodes).toHaveLength(1);
      expect(result!.tags).toContain('wcag131');
    });

    it('returns null when aria-current="page" is present', async () => {
      (page.evaluate as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await checkAriaCurrentPage(page);

      expect(result).toBeNull();
    });
  });

  describe('checkEmphasisStrongSemantics', () => {
    it('detects <b> and <i> tags that should use semantic elements', async () => {
      (page.evaluate as ReturnType<typeof vi.fn>).mockResolvedValue([
        { html: '<b>Bold text</b>', target: ['b'] },
        { html: '<i>Italic text</i>', target: ['i'] },
      ]);

      const result = await checkEmphasisStrongSemantics(page);

      expect(result).not.toBeNull();
      expect(result!.id).toBe('emphasis-strong-semantics');
      expect(result!.impact).toBe('minor');
      expect(result!.nodes).toHaveLength(2);
      expect(result!.tags).toContain('best-practice');
    });

    it('returns null when only <em> and <strong> are used', async () => {
      (page.evaluate as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await checkEmphasisStrongSemantics(page);

      expect(result).toBeNull();
    });
  });

  describe('checkDiscountPriceAccessibility', () => {
    it('detects strikethrough pricing without screen reader context', async () => {
      (page.evaluate as ReturnType<typeof vi.fn>).mockResolvedValue([
        { html: '<del>$19.99</del>', target: ['del'] },
      ]);

      const result = await checkDiscountPriceAccessibility(page);

      expect(result).not.toBeNull();
      expect(result!.id).toBe('discount-price-accessibility');
      expect(result!.impact).toBe('serious');
      expect(result!.nodes).toHaveLength(1);
      expect(result!.tags).toContain('wcag131');
    });

    it('returns null when strikethrough has aria-label', async () => {
      (page.evaluate as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await checkDiscountPriceAccessibility(page);

      expect(result).toBeNull();
    });
  });

  describe('checkStickyElementOverlap', () => {
    it('detects focusable elements obscured by sticky/fixed elements', async () => {
      (page.evaluate as ReturnType<typeof vi.fn>).mockResolvedValue([
        { html: '<button>Submit</button>', target: ['button'] },
      ]);

      const result = await checkStickyElementOverlap(page);

      expect(result).not.toBeNull();
      expect(result!.id).toBe('sticky-element-overlap');
      expect(result!.impact).toBe('serious');
      expect(result!.nodes).toHaveLength(1);
      expect(result!.tags).toContain('wcag247');
    });

    it('returns null when no overlap exists', async () => {
      (page.evaluate as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await checkStickyElementOverlap(page);

      expect(result).toBeNull();
    });
  });

  describe('runCustomChecks', () => {
    it('collects results from all checks that find violations', async () => {
      const evaluateMock = page.evaluate as ReturnType<typeof vi.fn>;
      // Each check calls page.evaluate once; return results for first two, empty for the rest
      evaluateMock
        .mockResolvedValueOnce([{ html: '<a href="#">Read More</a>', target: ['a'] }])  // ambiguous link
        .mockResolvedValueOnce([{ html: '<a href="/">Home</a>', target: ['a'] }])        // aria-current
        .mockResolvedValueOnce([])                                                        // emphasis semantics
        .mockResolvedValueOnce([])                                                        // discount price
        .mockResolvedValueOnce([]);                                                       // sticky overlap

      const results = await runCustomChecks(page);

      expect(results).toHaveLength(2);
      expect(results[0].id).toBe('ambiguous-link-text');
      expect(results[1].id).toBe('aria-current-page');
    });

    it('returns empty array when no violations found', async () => {
      const evaluateMock = page.evaluate as ReturnType<typeof vi.fn>;
      evaluateMock.mockResolvedValue([]);

      const results = await runCustomChecks(page);

      expect(results).toHaveLength(0);
    });

    it('continues running checks even if one throws', async () => {
      const evaluateMock = page.evaluate as ReturnType<typeof vi.fn>;
      evaluateMock
        .mockRejectedValueOnce(new Error('evaluate failed'))                             // ambiguous link throws
        .mockResolvedValueOnce([{ html: '<a href="/">Home</a>', target: ['a'] }])        // aria-current
        .mockResolvedValueOnce([])                                                        // emphasis semantics
        .mockResolvedValueOnce([])                                                        // discount price
        .mockResolvedValueOnce([]);                                                       // sticky overlap

      const results = await runCustomChecks(page);

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('aria-current-page');
    });
  });
});
