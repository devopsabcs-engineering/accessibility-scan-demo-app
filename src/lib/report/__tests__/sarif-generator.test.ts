import { describe, it, expect } from 'vitest';
import { generateSarif, generateSiteSarif } from '../sarif-generator';
import type { AxeViolation } from '../../types/scan';

function makeViolation(overrides: Partial<AxeViolation> = {}): AxeViolation {
  return {
    id: 'color-contrast',
    impact: 'serious',
    tags: ['wcag143'],
    description: 'Elements must have sufficient color contrast',
    help: 'Ensure contrast ratio is sufficient',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.0/color-contrast',
    nodes: [{ html: '<span style="color:#fff">text</span>', target: ['span'], impact: 'serious' }],
    ...overrides,
  };
}

describe('generateSarif', () => {
  it('produces SARIF v2.1.0 schema and version', () => {
    const sarif = generateSarif('https://example.com', [], '1.0.0');
    expect(sarif.$schema).toContain('sarif-schema-2.1.0');
    expect(sarif.version).toBe('2.1.0');
  });

  it('includes tool driver information', () => {
    const sarif = generateSarif('https://example.com', [], '1.0.0');
    expect(sarif.runs).toHaveLength(1);
    expect(sarif.runs[0].tool.driver.name).toBe('accessibility-scanner');
    expect(sarif.runs[0].tool.driver.version).toBe('1.0.0');
  });

  it('creates one run with results per violation node', () => {
    const violations = [
      makeViolation({
        nodes: [
          { html: '<span>1</span>', target: ['span.a'], impact: 'serious' },
          { html: '<span>2</span>', target: ['span.b'], impact: 'serious' },
        ],
      }),
    ];
    const sarif = generateSarif('https://example.com', violations, '1.0.0');
    expect(sarif.runs[0].results).toHaveLength(2);
  });

  it('creates rule descriptors for each unique violation id', () => {
    const violations = [
      makeViolation({ id: 'color-contrast' }),
      makeViolation({ id: 'image-alt', description: 'Missing alt' }),
    ];
    const sarif = generateSarif('https://example.com', violations, '1.0.0');
    expect(sarif.runs[0].tool.driver.rules).toHaveLength(2);
    expect(sarif.runs[0].tool.driver.rules[0].id).toBe('color-contrast');
    expect(sarif.runs[0].tool.driver.rules[1].id).toBe('image-alt');
  });

  describe('impact to level mapping', () => {
    it.each([
      { impact: 'critical' as const, expected: 'error' },
      { impact: 'serious' as const, expected: 'error' },
      { impact: 'moderate' as const, expected: 'warning' },
      { impact: 'minor' as const, expected: 'note' },
    ])('maps $impact → $expected', ({ impact, expected }) => {
      const violations = [makeViolation({ impact })];
      const sarif = generateSarif('https://example.com', violations, '1.0.0');
      expect(sarif.runs[0].results[0].level).toBe(expected);
    });
  });

  it('produces valid SARIF with empty violations', () => {
    const sarif = generateSarif('https://example.com', [], '1.0.0');
    expect(sarif.runs[0].results).toHaveLength(0);
    expect(sarif.runs[0].tool.driver.rules).toHaveLength(0);
  });

  it('includes location with artifact URI', () => {
    const violations = [makeViolation()];
    const sarif = generateSarif('https://example.com', violations, '1.0.0');
    const location = sarif.runs[0].results[0].locations[0];
    expect(location.physicalLocation.artifactLocation.uri).toBe('https://example.com');
  });
});

describe('generateSiteSarif', () => {
  it('creates one run per page', () => {
    const pages = [
      { url: 'https://example.com/', violations: [makeViolation()] },
      { url: 'https://example.com/about', violations: [] },
    ];
    const sarif = generateSiteSarif(pages, '1.0.0');
    expect(sarif.runs).toHaveLength(2);
  });

  it('produces SARIF v2.1.0 structure', () => {
    const sarif = generateSiteSarif([], '1.0.0');
    expect(sarif.version).toBe('2.1.0');
    expect(sarif.runs).toHaveLength(0);
  });
});
