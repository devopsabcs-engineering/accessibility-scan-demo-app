import type { AxeViolation } from '../types/scan';

interface SarifLog {
  $schema: string;
  version: '2.1.0';
  runs: SarifRun[];
}

interface SarifRun {
  tool: {
    driver: {
      name: string;
      version: string;
      rules: SarifRule[];
    };
  };
  results: SarifResult[];
}

interface SarifRule {
  id: string;
  name: string;
  shortDescription: { text: string };
  helpUri: string;
  properties: { tags: string[] };
}

interface SarifResult {
  ruleId: string;
  ruleIndex: number;
  level: 'error' | 'warning' | 'note';
  message: { text: string };
  locations: SarifLocation[];
  partialFingerprints: Record<string, string>;
}

interface SarifLocation {
  physicalLocation: {
    artifactLocation: { uri: string };
    region: { snippet: { text: string } };
  };
}

function mapImpactToLevel(impact: string): 'error' | 'warning' | 'note' {
  switch (impact) {
    case 'critical':
    case 'serious':
      return 'error';
    case 'moderate':
      return 'warning';
    case 'minor':
    default:
      return 'note';
  }
}

function simpleHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

function urlToArtifactPath(url: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname === '/' ? '/index' : parsed.pathname;
    return `${parsed.hostname}${path}`;
  } catch {
    return url;
  }
}

function buildRun(url: string, violations: AxeViolation[], toolVersion: string): SarifRun {
  const rulesMap = new Map<string, { rule: SarifRule; index: number }>();
  const rules: SarifRule[] = [];
  const results: SarifResult[] = [];

  for (const violation of violations) {
    if (!rulesMap.has(violation.id)) {
      const index = rules.length;
      const rule: SarifRule = {
        id: violation.id,
        name: violation.id,
        shortDescription: { text: violation.description },
        helpUri: violation.helpUrl,
        properties: { tags: violation.tags },
      };
      rules.push(rule);
      rulesMap.set(violation.id, { rule, index });
    }

    const ruleEntry = rulesMap.get(violation.id)!;

    for (const node of violation.nodes) {
      const target = node.target.join(' ');
      results.push({
        ruleId: violation.id,
        ruleIndex: ruleEntry.index,
        level: mapImpactToLevel(violation.impact),
        message: { text: `${violation.help} (${url} — ${target})` },
        locations: [
          {
            physicalLocation: {
              artifactLocation: { uri: urlToArtifactPath(url) },
              region: { snippet: { text: node.html } },
            },
          },
        ],
        partialFingerprints: {
          primaryLocationLineHash: simpleHash(`${violation.id}:${target}`),
        },
      });
    }
  }

  return {
    tool: {
      driver: {
        name: 'accessibility-scanner',
        version: toolVersion,
        rules,
      },
    },
    results,
  };
}

export function generateSarif(
  url: string,
  violations: AxeViolation[],
  toolVersion: string
): SarifLog {
  return {
    $schema:
      'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/main/sarif-2.1/schema/sarif-schema-2.1.0.json',
    version: '2.1.0',
    runs: [buildRun(url, violations, toolVersion)],
  };
}

export function generateSiteSarif(
  pages: { url: string; violations: AxeViolation[] }[],
  toolVersion: string
): SarifLog {
  return {
    $schema:
      'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/main/sarif-2.1/schema/sarif-schema-2.1.0.json',
    version: '2.1.0',
    runs: pages.map((page) => buildRun(page.url, page.violations, toolVersion)),
  };
}
