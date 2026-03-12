import type { AxeViolation, NormalizedViolation, MultiEngineResults, AxePass, AxeIncomplete, AxeInapplicable } from '../types/scan';
import type { AxeResults } from 'axe-core';
import { mapTagToPrinciple } from '../scoring/wcag-mapper';

/**
 * IBM Equal Access result item (IBaselineResult shape).
 * Defined locally to avoid tight coupling to IBM's internal types.
 */
export interface IbmReportResult {
  ruleId: string;
  value: [string, string]; // [eRulePolicy, eRuleConfidence]
  path: { [ns: string]: string };
  message: string;
  snippet: string;
  reasonId?: number | string;
  messageArgs?: string[];
  apiArgs?: unknown[];
  category?: string;
  level?: string;
  help?: string;
}

/**
 * Custom check result format (used by Phase 3 custom Playwright checks).
 */
export interface CustomCheckResult {
  id: string;
  impact: 'minor' | 'moderate' | 'serious' | 'critical';
  description: string;
  help: string;
  helpUrl: string;
  tags: string[];
  nodes: { html: string; target: string[] }[];
}

const IBM_LEVEL_TO_IMPACT: Record<string, AxeViolation['impact']> = {
  violation: 'critical',
  potentialviolation: 'serious',
  recommendation: 'moderate',
  potentialrecommendation: 'moderate',
  manual: 'minor',
};

const IMPACT_SEVERITY_ORDER: Record<string, number> = {
  critical: 4,
  serious: 3,
  moderate: 2,
  minor: 1,
};

/**
 * Extract the base URL (before # fragment) from the raw IBM help field.
 * Falls back to the /archives/latest/ URL pattern when help is not a valid URL.
 */
function extractIbmHelpUrl(rawHelp: string | undefined, ruleId: string): string {
  if (rawHelp) {
    try {
      const url = new URL(rawHelp);
      const ruleFile = url.pathname.split('/').pop();
      if (ruleFile) {
        return `https://able.ibm.com/rules/archives/latest/doc/en-US/${ruleFile}`;
      }
    } catch {
      // not a URL, fall through
    }
  }
  return `https://able.ibm.com/rules/archives/latest/doc/en-US/${ruleId}.html`;
}

/**
 * Normalize IBM Equal Access results to the unified NormalizedViolation format.
 */
export function normalizeIbmResults(ibmResults: IbmReportResult[]): NormalizedViolation[] {
  if (!ibmResults?.length) return [];

  return ibmResults
    .filter(r => {
      // Only include failures, not passes
      const confidence = r.value?.[1];
      return confidence !== 'PASS';
    })
    .map(r => {
      const level = r.level ?? mapIbmValueToLevel(r.value);
      const impact = IBM_LEVEL_TO_IMPACT[level] ?? 'moderate';
      const domPath = r.path?.dom ?? r.path?.aria ?? '';
      const tags = buildIbmTags(r);

      return {
        id: r.ruleId,
        impact,
        tags,
        description: r.message,
        help: r.message,
        helpUrl: extractIbmHelpUrl(r.help, r.ruleId),
        nodes: [{
          html: r.snippet || '',
          target: [domPath],
          impact: impact,
          failureSummary: r.message,
        }],
        principle: mapTagToPrinciple(tags),
        engine: 'ibm-equal-access' as const,
      };
    });
}

/**
 * Normalize custom Playwright check results to the unified format.
 */
export function normalizeCustomResults(customResults: CustomCheckResult[]): NormalizedViolation[] {
  if (!customResults?.length) return [];

  return customResults.map(r => ({
    id: r.id,
    impact: r.impact,
    tags: r.tags,
    description: r.description,
    help: r.help,
    helpUrl: r.helpUrl,
    nodes: r.nodes.map(n => ({
      html: n.html,
      target: n.target,
      impact: r.impact,
      failureSummary: r.description,
    })),
    principle: mapTagToPrinciple(r.tags),
    engine: 'custom' as const,
  }));
}

/**
 * Normalize axe-core violations, adding the engine tag.
 */
export function normalizeAxeResults(axeViolations: AxeViolation[]): NormalizedViolation[] {
  if (!axeViolations?.length) return [];

  return axeViolations.map(v => ({
    ...v,
    engine: 'axe-core' as const,
  }));
}

/**
 * Deduplicate violations across engines.
 * Key: normalizeSelector(target[0]) + '|' + primaryWcagTag
 * When the same element is flagged for the same WCAG criterion by multiple engines,
 * keep the higher-severity finding.
 */
export function deduplicateViolations(violations: NormalizedViolation[]): NormalizedViolation[] {
  if (!violations?.length) return [];

  const dedupMap = new Map<string, NormalizedViolation>();

  for (const v of violations) {
    for (const node of v.nodes) {
      const selector = normalizeSelector(node.target[0] ?? '');
      const wcagTag = getPrimaryWcagTag(v.tags);
      const key = `${selector}|${wcagTag}`;

      const existing = dedupMap.get(key);
      if (!existing) {
        dedupMap.set(key, v);
      } else {
        // Keep higher severity
        const existingSeverity = IMPACT_SEVERITY_ORDER[existing.impact] ?? 0;
        const newSeverity = IMPACT_SEVERITY_ORDER[v.impact] ?? 0;
        if (newSeverity > existingSeverity) {
          dedupMap.set(key, v);
        }
      }
    }
  }

  return Array.from(dedupMap.values());
}

/**
 * Main orchestrator: normalize results from all engines and merge with deduplication.
 */
export function normalizeAndMerge(
  axeResults: AxeResults,
  ibmResults: IbmReportResult[],
  customResults: CustomCheckResult[],
): MultiEngineResults {
  const axeViolations = normalizeAxeResults(
    axeResults.violations.map(v => ({
      id: v.id,
      impact: (v.impact as AxeViolation['impact']) ?? 'minor',
      tags: v.tags,
      description: v.description,
      help: v.help,
      helpUrl: v.helpUrl,
      nodes: v.nodes.map(n => ({
        html: n.html,
        target: n.target.map(String),
        impact: n.impact ?? 'minor',
        failureSummary: n.failureSummary,
      })),
      principle: mapTagToPrinciple(v.tags),
    })),
  );

  const ibmViolations = normalizeIbmResults(ibmResults);
  const customViolations = normalizeCustomResults(customResults);

  const allViolations = [...axeViolations, ...ibmViolations, ...customViolations];
  const deduped = deduplicateViolations(allViolations);

  // Map passes, incomplete, inapplicable from axe (IBM doesn't have equivalent)
  const passes: AxePass[] = axeResults.passes.map(p => ({
    id: p.id,
    tags: p.tags,
    description: p.description,
    nodes: p.nodes.map(n => ({
      html: n.html,
      target: n.target.map(String),
    })),
  }));

  const incomplete: AxeIncomplete[] = axeResults.incomplete.map(i => ({
    id: i.id,
    impact: i.impact ?? null,
    tags: i.tags,
    description: i.description,
    help: i.help,
    helpUrl: i.helpUrl,
    nodes: i.nodes.map(n => ({
      html: n.html,
      target: n.target.map(String),
      impact: n.impact ?? 'minor',
      failureSummary: n.failureSummary,
    })),
  }));

  const inapplicable: AxeInapplicable[] = axeResults.inapplicable.map(ia => ({
    id: ia.id,
    tags: ia.tags,
    description: ia.description,
  }));

  const engineVersions: Record<string, string> = {
    'axe-core': axeResults.testEngine?.version ?? 'unknown',
  };

  if (ibmResults.length > 0) {
    engineVersions['ibm-equal-access'] = 'latest';
  }
  if (customResults.length > 0) {
    engineVersions['custom'] = '1.0.0';
  }

  return {
    violations: deduped,
    passes,
    incomplete,
    inapplicable,
    engineVersions,
  };
}

// --- Internal helpers ---

function normalizeSelector(selector: string): string {
  return selector.trim().toLowerCase().replace(/\s+/g, ' ');
}

function getPrimaryWcagTag(tags: string[]): string {
  const wcag = tags.find(t => /^wcag\d{3,}$/.test(t));
  return wcag ?? tags[0] ?? 'unknown';
}

function mapIbmValueToLevel(value: [string, string]): string {
  const [policy, confidence] = value ?? [];
  if (confidence === 'FAIL' && policy === 'VIOLATION') return 'violation';
  if (confidence === 'POTENTIAL') return 'potentialviolation';
  if (confidence === 'MANUAL') return 'manual';
  if (policy === 'RECOMMENDATION') return 'recommendation';
  return 'recommendation';
}

function buildIbmTags(r: IbmReportResult): string[] {
  const tags: string[] = [];
  if (r.category) {
    tags.push(r.category);
  }
  // IBM category often aligns with WCAG principles: Accessibility, Design, Labeling, etc.
  // Add a generic wcag tag if none present
  if (!tags.some(t => /^wcag/.test(t))) {
    tags.push('best-practice');
  }
  return tags;
}
