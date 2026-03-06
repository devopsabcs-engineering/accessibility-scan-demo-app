import type { ScanResults, AxeViolation, AxePass, AxeIncomplete, AxeInapplicable } from '../types/scan';
import type { AxeResults } from 'axe-core';
import { mapTagToPrinciple } from '../scoring/wcag-mapper';
import { calculateScore } from '../scoring/calculator';

export function parseAxeResults(url: string, raw: AxeResults): ScanResults {
  const violations: AxeViolation[] = raw.violations.map(v => ({
    id: v.id,
    impact: (v.impact as AxeViolation['impact']) || 'minor',
    tags: v.tags,
    description: v.description,
    help: v.help,
    helpUrl: v.helpUrl,
    nodes: v.nodes.map(n => ({
      html: n.html,
      target: n.target.map(String),
      impact: n.impact || 'minor',
      failureSummary: n.failureSummary,
    })),
    principle: mapTagToPrinciple(v.tags),
  }));

  const passes: AxePass[] = raw.passes.map(p => ({
    id: p.id,
    tags: p.tags,
    description: p.description,
    nodes: p.nodes.map(n => ({
      html: n.html,
      target: n.target.map(String),
    })),
  }));

  const incomplete: AxeIncomplete[] = raw.incomplete.map(i => ({
    id: i.id,
    impact: i.impact || null,
    tags: i.tags,
    description: i.description,
    help: i.help,
    helpUrl: i.helpUrl,
    nodes: i.nodes.map(n => ({
      html: n.html,
      target: n.target.map(String),
      impact: n.impact || 'minor',
      failureSummary: n.failureSummary,
    })),
  }));

  const inapplicable: AxeInapplicable[] = raw.inapplicable.map(ia => ({
    id: ia.id,
    tags: ia.tags,
    description: ia.description,
  }));

  const score = calculateScore(violations, passes, incomplete.length);

  return {
    url,
    timestamp: new Date().toISOString(),
    engineVersion: `axe-core ${raw.testEngine?.version || 'unknown'}`,
    violations,
    passes,
    incomplete,
    inapplicable,
    score,
  };
}
