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
    expect(sarif.runs[0].tool.driver.informationUri).toBe('https://github.com/devopsabcs-engineering/accessibility-scan-demo-app');
    expect(sarif.runs[0].tool.driver.semanticVersion).toBe('1.0.0');
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

  it('includes location with file-relative artifact URI', () => {
    const violations = [makeViolation()];
    const sarif = generateSarif('https://example.com', violations, '1.0.0');
    const location = sarif.runs[0].results[0].locations[0];
    expect(location.physicalLocation.artifactLocation.uri).toBe('example.com/index');
  });

  it('includes scanned URL in result message', () => {
    const violations = [makeViolation()];
    const sarif = generateSarif('https://example.com/page', violations, '1.0.0');
    expect(sarif.runs[0].results[0].message.text).toContain('Scanned URL: https://example.com/page');
  });

  it('includes automationDetails with scan URL', () => {
    const sarif = generateSarif('https://example.com/page', [makeViolation()], '1.0.0');
    expect(sarif.runs[0].automationDetails).toEqual({ id: 'accessibility-scan/https://example.com/page' });
  });

  it('rule includes fullDescription from violation description', () => {
    const sarif = generateSarif('https://example.com', [makeViolation()], '1.0.0');
    expect(sarif.runs[0].tool.driver.rules[0].fullDescription.text).toBe('Elements must have sufficient color contrast');
  });

  it('rule includes help.text and help.markdown', () => {
    const sarif = generateSarif('https://example.com', [makeViolation()], '1.0.0');
    const rule = sarif.runs[0].tool.driver.rules[0];
    expect(rule.help.text).toBeTruthy();
    expect(rule.help.markdown).toBeTruthy();
    expect(rule.help.text).toContain('Ensure contrast ratio is sufficient');
    expect(rule.help.markdown).toContain('# Ensure contrast ratio is sufficient');
  });

  it('rule help.markdown contains WCAG tags', () => {
    const sarif = generateSarif('https://example.com', [makeViolation({ tags: ['wcag2aa', 'wcag143'] })], '1.0.0');
    const markdown = sarif.runs[0].tool.driver.rules[0].help.markdown;
    expect(markdown).toContain('wcag2aa');
    expect(markdown).toContain('wcag143');
  });

  it('rule includes defaultConfiguration.level', () => {
    const sarif = generateSarif('https://example.com', [makeViolation({ impact: 'critical' })], '1.0.0');
    expect(sarif.runs[0].tool.driver.rules[0].defaultConfiguration.level).toBe('error');
  });

  it('rule properties include precision and problem.severity', () => {
    const sarif = generateSarif('https://example.com', [makeViolation({ engine: 'axe-core', impact: 'serious' })], '1.0.0');
    const props = sarif.runs[0].tool.driver.rules[0].properties;
    expect(props.precision).toBe('very-high');
    expect(props['problem.severity']).toBe('error');
  });

  it('result message includes element count', () => {
    const violations = [makeViolation({
      nodes: [
        { html: '<span>1</span>', target: ['span.a'], impact: 'serious' },
        { html: '<span>2</span>', target: ['span.b'], impact: 'serious' },
      ],
    })];
    const sarif = generateSarif('https://example.com', violations, '1.0.0');
    expect(sarif.runs[0].results[0].message.text).toContain('2 element(s) affected');
  });

  it('rule help.markdown contains learn more link', () => {
    const sarif = generateSarif('https://example.com', [makeViolation()], '1.0.0');
    expect(sarif.runs[0].tool.driver.rules[0].help.markdown).toContain('[Rule documentation](https://dequeuniversity.com/rules/axe/4.0/color-contrast)');
  });

  it('result message includes failureSummary when present', () => {
    const violations = [makeViolation({
      nodes: [{ html: '<span>text</span>', target: ['span'], impact: 'serious', failureSummary: 'Fix any of the following: Element has insufficient contrast' }],
    })];
    const sarif = generateSarif('https://example.com', violations, '1.0.0');
    expect(sarif.runs[0].results[0].message.text).toContain('Fix any of the following: Element has insufficient contrast');
  });

  it('IBM rule IDs with underscores produce valid markdown links', () => {
    const violations = [makeViolation({
      id: 'label_name_visible',
      helpUrl: 'https://able.ibm.com/rules/archives/latest/doc/en-US/label_name_visible.html',
    })];
    const sarif = generateSarif('https://example.com', violations, '1.0.0');
    const markdown = sarif.runs[0].tool.driver.rules[0].help.markdown;
    expect(markdown).toContain('[Rule documentation](https://able.ibm.com/rules/archives/latest/doc/en-US/label_name_visible.html)');
    expect(markdown).not.toContain('label\\_name');
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

  it('generateSiteSarif includes enriched rule fields', () => {
    const pages = [{ url: 'https://example.com/', violations: [makeViolation()] }];
    const sarif = generateSiteSarif(pages, '1.0.0');
    const rule = sarif.runs[0].tool.driver.rules[0];
    expect(rule.fullDescription).toBeDefined();
    expect(rule.help.markdown).toBeTruthy();
  });
});
