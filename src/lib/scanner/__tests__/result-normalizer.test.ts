import { describe, it, expect } from 'vitest';
import {
  normalizeIbmResults,
  normalizeCustomResults,
  normalizeAxeResults,
  deduplicateViolations,
  normalizeAndMerge,
  type IbmReportResult,
  type CustomCheckResult,
} from '../result-normalizer';
import type { AxeViolation, NormalizedViolation } from '../../types/scan';
import type { AxeResults } from 'axe-core';

function makeIbmResult(overrides: Partial<IbmReportResult> = {}): IbmReportResult {
  return {
    ruleId: 'img_alt_valid',
    value: ['VIOLATION', 'FAIL'],
    path: { dom: 'html > body > img' },
    message: 'Image does not have alt text',
    snippet: '<img src="photo.jpg">',
    reasonId: '1',
    level: 'violation',
    ...overrides,
  };
}

function makeAxeViolation(overrides: Partial<AxeViolation> = {}): AxeViolation {
  return {
    id: 'image-alt',
    impact: 'serious',
    tags: ['wcag2a', 'wcag111'],
    description: 'Images must have alt text',
    help: 'Ensure images have alt text',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.10/image-alt',
    nodes: [{
      html: '<img src="photo.jpg">',
      target: ['img'],
      impact: 'serious',
      failureSummary: 'Fix: add alt attribute',
    }],
    principle: 'perceivable',
    ...overrides,
  };
}

function makeAxeResults(overrides: Partial<AxeResults> = {}): AxeResults {
  return {
    violations: [],
    passes: [],
    incomplete: [],
    inapplicable: [],
    testEngine: { name: 'axe-core', version: '4.10.0' },
    testRunner: { name: 'axe' },
    testEnvironment: {
      userAgent: 'test',
      windowWidth: 1024,
      windowHeight: 768,
      orientationAngle: 0,
      orientationType: 'landscape-primary',
    },
    timestamp: '2026-01-01T00:00:00.000Z',
    url: 'https://example.com',
    toolOptions: {},
    ...overrides,
  } as unknown as AxeResults;
}

describe('normalizeIbmResults', () => {
  it('maps IBM violation level to critical impact', () => {
    const result = normalizeIbmResults([makeIbmResult({ level: 'violation' })]);
    expect(result).toHaveLength(1);
    expect(result[0].impact).toBe('critical');
    expect(result[0].engine).toBe('ibm-equal-access');
  });

  it('maps IBM potentialviolation level to serious impact', () => {
    const result = normalizeIbmResults([makeIbmResult({ level: 'potentialviolation' })]);
    expect(result[0].impact).toBe('serious');
  });

  it('maps IBM recommendation level to moderate impact', () => {
    const result = normalizeIbmResults([makeIbmResult({ level: 'recommendation' })]);
    expect(result[0].impact).toBe('moderate');
  });

  it('maps IBM manual level to minor impact', () => {
    const result = normalizeIbmResults([makeIbmResult({ level: 'manual' })]);
    expect(result[0].impact).toBe('minor');
  });

  it('infers level from value tuple when level not provided', () => {
    const result = normalizeIbmResults([makeIbmResult({ level: undefined, value: ['VIOLATION', 'FAIL'] })]);
    expect(result[0].impact).toBe('critical');
  });

  it('filters out PASS results', () => {
    const result = normalizeIbmResults([makeIbmResult({ value: ['VIOLATION', 'PASS'] })]);
    expect(result).toHaveLength(0);
  });

  it('maps ruleId to id', () => {
    const result = normalizeIbmResults([makeIbmResult({ ruleId: 'aria_label_valid' })]);
    expect(result[0].id).toBe('aria_label_valid');
  });

  it('maps path.dom to target array', () => {
    const result = normalizeIbmResults([makeIbmResult({ path: { dom: 'body > div > p' } })]);
    expect(result[0].nodes[0].target).toEqual(['body > div > p']);
  });

  it('maps message to description and help', () => {
    const result = normalizeIbmResults([makeIbmResult({ message: 'Test message', help: 'Test help' })]);
    expect(result[0].description).toBe('Test message');
    expect(result[0].help).toBe('Test help');
  });

  it('constructs IBM helpUrl from ruleId', () => {
    const result = normalizeIbmResults([makeIbmResult({ ruleId: 'img_alt_valid' })]);
    expect(result[0].helpUrl).toBe('https://able.ibm.com/rules/tools/help/img_alt_valid');
  });

  it('returns empty array for null/undefined/empty input', () => {
    expect(normalizeIbmResults([])).toEqual([]);
    expect(normalizeIbmResults(null as unknown as IbmReportResult[])).toEqual([]);
    expect(normalizeIbmResults(undefined as unknown as IbmReportResult[])).toEqual([]);
  });
});

describe('normalizeCustomResults', () => {
  it('maps custom check results to NormalizedViolation', () => {
    const custom: CustomCheckResult = {
      id: 'ambiguous-link',
      impact: 'moderate',
      description: 'Link text is ambiguous',
      help: 'Use descriptive link text',
      helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/link-purpose-in-context',
      tags: ['wcag2a', 'wcag244'],
      nodes: [{ html: '<a href="#">Click here</a>', target: ['a.link'] }],
    };

    const result = normalizeCustomResults([custom]);
    expect(result).toHaveLength(1);
    expect(result[0].engine).toBe('custom');
    expect(result[0].id).toBe('ambiguous-link');
    expect(result[0].impact).toBe('moderate');
  });

  it('returns empty array for empty input', () => {
    expect(normalizeCustomResults([])).toEqual([]);
  });
});

describe('normalizeAxeResults', () => {
  it('adds axe-core engine tag to violations', () => {
    const result = normalizeAxeResults([makeAxeViolation()]);
    expect(result).toHaveLength(1);
    expect(result[0].engine).toBe('axe-core');
    expect(result[0].id).toBe('image-alt');
  });

  it('returns empty array for empty input', () => {
    expect(normalizeAxeResults([])).toEqual([]);
  });
});

describe('deduplicateViolations', () => {
  it('removes duplicate violations for same element + WCAG criterion', () => {
    const v1: NormalizedViolation = {
      ...makeAxeViolation({ impact: 'serious', tags: ['wcag2a', 'wcag111'] }),
      engine: 'axe-core',
    };
    const v2: NormalizedViolation = {
      ...makeAxeViolation({ id: 'ibm-img-alt', impact: 'critical', tags: ['wcag111'] }),
      engine: 'ibm-equal-access',
      nodes: [{ html: '<img src="photo.jpg">', target: ['img'], impact: 'critical', failureSummary: 'No alt' }],
    };

    const result = deduplicateViolations([v1, v2]);
    expect(result).toHaveLength(1);
    // Should keep higher severity (critical from IBM)
    expect(result[0].impact).toBe('critical');
  });

  it('keeps violations with different WCAG criteria for same element', () => {
    const v1: NormalizedViolation = {
      ...makeAxeViolation({ tags: ['wcag111'] }),
      engine: 'axe-core',
    };
    const v2: NormalizedViolation = {
      ...makeAxeViolation({ id: 'color-contrast', tags: ['wcag143'] }),
      engine: 'ibm-equal-access',
      nodes: [{ html: '<img src="photo.jpg">', target: ['img'], impact: 'serious', failureSummary: 'Contrast' }],
    };

    const result = deduplicateViolations([v1, v2]);
    expect(result).toHaveLength(2);
  });

  it('returns empty array for empty input', () => {
    expect(deduplicateViolations([])).toEqual([]);
  });
});

describe('normalizeAndMerge', () => {
  it('merges axe and IBM results', () => {
    const axe = makeAxeResults({
      violations: [{
        id: 'image-alt',
        impact: 'serious',
        tags: ['wcag2a', 'wcag111'],
        description: 'Images must have alt text',
        help: 'Ensure images have alt text',
        helpUrl: 'https://dequeuniversity.com/rules/axe/4.10/image-alt',
        nodes: [{
          html: '<img src="test.jpg">',
          target: ['img.hero'],
          impact: 'serious',
          any: [], all: [], none: [],
        }],
      }],
    } as Partial<AxeResults>);

    const ibm = [makeIbmResult({
      path: { dom: 'body > div > img.thumb' },
      ruleId: 'img_alt_valid',
    })];

    const result = normalizeAndMerge(axe, ibm, []);
    expect(result.violations.length).toBeGreaterThanOrEqual(2);
    expect(result.engineVersions['axe-core']).toBe('4.10.0');
    expect(result.engineVersions['ibm-equal-access']).toBe('latest');
  });

  it('works with no IBM results', () => {
    const axe = makeAxeResults();
    const result = normalizeAndMerge(axe, [], []);
    expect(result.violations).toHaveLength(0);
    expect(result.engineVersions['axe-core']).toBe('4.10.0');
    expect(result.engineVersions['ibm-equal-access']).toBeUndefined();
  });

  it('carries through passes, incomplete, and inapplicable from axe', () => {
    const axe = makeAxeResults({
      passes: [{
        id: 'html-has-lang',
        impact: undefined,
        tags: ['wcag2a'],
        description: 'Page has lang',
        help: 'lang attribute',
        helpUrl: '',
        nodes: [{ html: '<html lang="en">', target: ['html'], impact: undefined, any: [], all: [], none: [] }],
      }],
    } as Partial<AxeResults>);

    const result = normalizeAndMerge(axe, [], []);
    expect(result.passes).toHaveLength(1);
    expect(result.passes[0].id).toBe('html-has-lang');
  });
});
