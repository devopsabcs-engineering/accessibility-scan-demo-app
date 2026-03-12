<!-- markdownlint-disable-file -->
# Implementation Details: Improve SARIF Output for GitHub Code Scanning

## Context Reference

Sources: `.copilot-tracking/research/2026-03-12/sarif-github-code-scanning-research.md`, `src/lib/report/sarif-generator.ts`, `src/lib/scanner/result-normalizer.ts`, `src/lib/types/scan.ts`

## Implementation Phase 1: Fix IBM Equal Access URL and Help Text

<!-- parallelizable: true -->

### Step 1.1: Add `extractIbmHelpUrl()` helper function to `result-normalizer.ts`

Add a helper function above `normalizeIbmResults()` that extracts the base URL (before `#` fragment) from the raw IBM `help` field. The raw IBM `help` field contains a full archive URL like `https://able.ibm.com/rules/archives/2026.03.04/doc/en-US/style_color_misuse.html#...` with an encoded JSON fragment that must be stripped.

```typescript
function extractIbmHelpUrl(rawHelp: string | undefined, ruleId: string): string {
  if (rawHelp) {
    try {
      const url = new URL(rawHelp);
      return `${url.origin}${url.pathname}`;
    } catch {
      // not a URL, fall through
    }
  }
  return `https://able.ibm.com/rules/archives/latest/doc/en-US/${ruleId}.html`;
}
```

Files:
* `src/lib/scanner/result-normalizer.ts` — Add function before `normalizeIbmResults()` (around line 55)

Discrepancy references:
* Addresses research Discovery 3 Bug A (wrong URL pattern)

Success criteria:
* Function parses archive URLs correctly and strips fragments
* Function falls back to `/archives/latest/` URL when `rawHelp` is undefined or not a URL
* No regression in existing normalizer behavior

Context references:
* Research document (Lines 190-210) — IBM helpUrl fix code example
* `src/lib/scanner/result-normalizer.ts` (Lines 60-86) — Current IBM normalizer code

Dependencies:
* None — standalone helper function

### Step 1.2: Fix IBM `help` and `helpUrl` field mapping in `normalizeIbmResults()`

Change two lines in the `.map()` callback of `normalizeIbmResults()`:
- Line 74: Change `help: r.help ?? r.message` to `help: r.message` — since `r.help` is a URL, not text, use `r.message` as the human-readable help text.
- Line 75: Change `helpUrl: \`https://able.ibm.com/rules/tools/help/${r.ruleId}\`` to `helpUrl: extractIbmHelpUrl(r.help, r.ruleId)` — use the working archive URL.

Files:
* `src/lib/scanner/result-normalizer.ts` — Modify lines 74-75

Discrepancy references:
* Addresses research Discovery 3 (both Bug A and Bug B)
* Addresses research Discovery 4 (IBM `help` field is URL, not text)

Success criteria:
* IBM normalized violations have `help` set to the human-readable message text
* IBM normalized violations have `helpUrl` set to the working archive URL
* URLs do not contain `#` fragments with encoded JSON

Context references:
* Research document (Lines 190-215) — Fix code example
* `src/lib/scanner/result-normalizer.ts` (Lines 72-76) — Current mapping

Dependencies:
* Step 1.1 (extractIbmHelpUrl function)

### Step 1.3: Update IBM normalizer tests for new helpUrl and help text behavior

Update existing tests and add new ones in `result-normalizer.test.ts`:

1. **Update existing test** "constructs IBM helpUrl from ruleId" — change expected URL from `https://able.ibm.com/rules/tools/help/img_alt_valid` to the archive URL pattern.
2. **Update existing test** "maps message to description and help" — when `help` is a URL, the normalized `help` should be `r.message`, not the URL.
3. **Add new test** "extracts base URL from IBM help field" — provide a raw IBM `help` URL with fragment, verify `helpUrl` strips the fragment.
4. **Add new test** "falls back to archive URL when help is not a URL" — provide non-URL help, verify fallback.
5. **Update existing test** "falls back to message when help is not provided" — verify `help` is `r.message`.

Files:
* `src/lib/scanner/__tests__/result-normalizer.test.ts` — Update and add tests in the `normalizeIbmResults` describe block

Discrepancy references:
* Validates fixes for DR items related to IBM URLs

Success criteria:
* All IBM normalizer tests pass
* New tests cover archive URL extraction, fragment stripping, and fallback behavior
* Test for `help` field confirms it contains human-readable text, not a URL

Context references:
* `src/lib/scanner/__tests__/result-normalizer.test.ts` (Lines 68-180) — Existing IBM tests
* Research document (Lines 220-245) — IBM help field analysis

Dependencies:
* Steps 1.1 and 1.2 completion

## Implementation Phase 2: Enrich SARIF Rule Descriptors

<!-- parallelizable: true -->

### Step 2.1: Update `SarifRule` interface with all GitHub-supported fields

Expand the `SarifRule` interface in `sarif-generator.ts` to include all fields that GitHub Code Scanning supports and renders:

```typescript
interface SarifRule {
  id: string;
  name: string;
  shortDescription: { text: string };
  fullDescription: { text: string };
  helpUri: string;
  help: {
    text: string;
    markdown: string;
  };
  defaultConfiguration: {
    level: 'error' | 'warning' | 'note';
  };
  properties: {
    tags: string[];
    precision: 'very-high' | 'high' | 'medium' | 'low';
    'problem.severity': 'error' | 'warning' | 'recommendation';
  };
}
```

Also update `SarifRun` to add `informationUri` and `semanticVersion` to `tool.driver`, and add `automationDetails` to the run:

```typescript
interface SarifRun {
  tool: {
    driver: {
      name: string;
      version: string;
      informationUri: string;
      semanticVersion: string;
      rules: SarifRule[];
    };
  };
  automationDetails?: { id: string };
  results: SarifResult[];
}
```

Files:
* `src/lib/report/sarif-generator.ts` — Modify `SarifRule` interface (lines 20-26), `SarifRun` interface (lines 9-18)

Discrepancy references:
* Addresses research Discovery 1 (missing `help.text`/`help.markdown`)
* Addresses research Discovery 6 (missing `fullDescription.text`)

Success criteria:
* Interface includes all GitHub-required and recommended properties
* TypeScript compilation succeeds with the updated interface

Context references:
* Research document (Lines 105-130) — Target SarifRule interface
* `src/lib/report/sarif-generator.ts` (Lines 9-26) — Current interfaces

Dependencies:
* None — interface change only

### Step 2.2: Add `buildHelpMarkdown()` function

Create a function that generates rich Markdown help content from an `AxeViolation`. This content is displayed in GitHub's "Rule help" panel when a developer clicks an alert.

```typescript
function buildHelpMarkdown(violation: AxeViolation): string {
  const lines: string[] = [
    `# ${violation.help}`,
    '',
    violation.description,
    '',
    `**Impact:** ${violation.impact}`,
  ];

  if (violation.principle) {
    lines.push(`**Principle:** ${violation.principle}`);
  }

  if (violation.engine) {
    lines.push(`**Engine:** ${violation.engine}`);
  }

  const wcagTags = violation.tags.filter(t => /^wcag\d/.test(t));
  if (wcagTags.length > 0) {
    lines.push('', '## WCAG Criteria', '');
    for (const tag of wcagTags) {
      lines.push(`- \`${tag}\``);
    }
  }

  lines.push('', '## Learn More', '');
  if (violation.helpUrl) {
    lines.push(`- [Rule documentation](${violation.helpUrl})`);
  }

  return lines.join('\n');
}
```

Files:
* `src/lib/report/sarif-generator.ts` — Add function after `urlToArtifactPath()` (around line 78)

Discrepancy references:
* Addresses research Discovery 1 — core fix for "no rule help available"
* Addresses research Discovery 2 — embeds helpUrl as markdown link instead of relying on `helpUri`

Success criteria:
* Generated markdown includes title, description, impact, WCAG tags, and learn more link
* Markdown renders correctly in GitHub's rule help panel
* Handles violations with no `principle`, no `engine`, and no WCAG tags gracefully

Context references:
* Research document (Lines 225-255) — `buildHelpMarkdown` code example
* Research document (Lines 135-175) — Ideal SARIF rule JSON example

Dependencies:
* `AxeViolation` type import (already present)

### Step 2.3: Add `buildHelpText()` function

Create a plain-text version of the rule help content. GitHub requires `help.text` and falls back to it when `help.markdown` is not supported.

```typescript
function buildHelpText(violation: AxeViolation): string {
  const parts: string[] = [
    violation.help,
    '',
    violation.description,
    '',
    `Impact: ${violation.impact}`,
  ];

  if (violation.principle) {
    parts.push(`Principle: ${violation.principle}`);
  }

  const wcagTags = violation.tags.filter(t => /^wcag\d/.test(t));
  if (wcagTags.length > 0) {
    parts.push('', 'WCAG Criteria:');
    for (const tag of wcagTags) {
      parts.push(`  - ${tag}`);
    }
  }

  if (violation.helpUrl) {
    parts.push('', `Learn more: ${violation.helpUrl}`);
  }

  return parts.join('\n');
}
```

Files:
* `src/lib/report/sarif-generator.ts` — Add function after `buildHelpMarkdown()` (around line 110)

Discrepancy references:
* Addresses research Discovery 1 — `help.text` is Required by GitHub

Success criteria:
* Plain text includes the same information as markdown without formatting
* No markdown syntax in the output

Context references:
* Research document (Lines 105-130) — Target interface shows `help.text` requirement

Dependencies:
* `AxeViolation` type import (already present)

### Step 2.4: Add mapping functions for `defaultConfiguration.level`, `precision`, and `problem.severity`

Add two small mapping functions:

```typescript
function mapEngineToPrecision(engine?: string): 'very-high' | 'high' | 'medium' | 'low' {
  switch (engine) {
    case 'axe-core':
      return 'very-high';
    case 'ibm-equal-access':
      return 'high';
    default:
      return 'medium';
  }
}

function mapImpactToSeverity(impact: string): 'error' | 'warning' | 'recommendation' {
  switch (impact) {
    case 'critical':
    case 'serious':
      return 'error';
    case 'moderate':
      return 'warning';
    case 'minor':
    default:
      return 'recommendation';
  }
}
```

Files:
* `src/lib/report/sarif-generator.ts` — Add functions after `buildHelpText()` (around line 135)

Discrepancy references:
* None — directly implements user requirement for precision/severity properties

Success criteria:
* `mapEngineToPrecision` returns `very-high` for axe, `high` for IBM, `medium` for others
* `mapImpactToSeverity` returns `error`/`warning`/`recommendation` matching `mapImpactToLevel` pattern
* Existing `mapImpactToLevel` function is reused for `defaultConfiguration.level`

Context references:
* Research document (Lines 105-130) — Target properties
* `src/lib/report/sarif-generator.ts` (Lines 49-59) — Existing `mapImpactToLevel`

Dependencies:
* None — standalone mapping functions

### Step 2.5: Update `buildRun()` to populate all new fields on each rule

Modify the `buildRun()` function to populate the expanded `SarifRule` fields in the rule construction block:

```typescript
const rule: SarifRule = {
  id: violation.id,
  name: violation.id,
  shortDescription: { text: violation.help },
  fullDescription: { text: violation.description },
  helpUri: violation.helpUrl,
  help: {
    text: buildHelpText(violation),
    markdown: buildHelpMarkdown(violation),
  },
  defaultConfiguration: {
    level: mapImpactToLevel(violation.impact),
  },
  properties: {
    tags: violation.tags,
    precision: mapEngineToPrecision(violation.engine),
    'problem.severity': mapImpactToSeverity(violation.impact),
  },
};
```

Note: `shortDescription.text` changes from `violation.description` to `violation.help` — the `.help` field is the short one-liner (e.g., "Ensure contrast ratio is sufficient") while `.description` is the longer explanation. The current code uses `description` for short and omits the full description entirely.

Files:
* `src/lib/report/sarif-generator.ts` — Modify the rule construction in `buildRun()` (lines 91-97)

Discrepancy references:
* Implements research Discovery 1, 2, 5, 6 together in the rule builder

Success criteria:
* Every rule in the SARIF output has `fullDescription.text`, `help.text`, `help.markdown`, `defaultConfiguration.level`, `properties.precision`, and `properties.problem.severity`
* `shortDescription` uses `violation.help` (concise) and `fullDescription` uses `violation.description` (detailed)
* TypeScript compiles without errors

Context references:
* `src/lib/report/sarif-generator.ts` (Lines 86-97) — Current rule construction
* Research document (Lines 135-175) — Ideal SARIF rule JSON

Dependencies:
* Steps 2.1-2.4 (interface, helpers, mappers)

## Implementation Phase 3: Enrich SARIF Results and Tool Metadata

<!-- parallelizable: false -->

### Step 3.1: Enrich `SarifResult.message.text` with description, URL, selector, and element count

Update the result message construction in `buildRun()` to provide a more information-dense first sentence. GitHub shows the first line of `message.text` as the alert summary in the list view.

Current (line 105):
```typescript
message: { text: `${violation.help} (${url} — ${target})` },
```

Target:
```typescript
message: {
  text: `${violation.description}: ${violation.help}. Scanned URL: ${url} — Selector: ${target} — ${violation.nodes.length} element(s) affected${node.failureSummary ? ` — ${node.failureSummary}` : ''}`,
},
```

Files:
* `src/lib/report/sarif-generator.ts` — Modify message construction in `buildRun()` (around line 105)

Discrepancy references:
* Addresses research Discovery 5 — rich data available but lost

Success criteria:
* Result message includes violation description, help text, scanned URL, CSS selector, element count, and `failureSummary` when available
* First sentence of message is descriptive enough for the alert list view

Context references:
* Research document (Lines 197-220) — Ideal SARIF result example
* `src/lib/report/sarif-generator.ts` (Lines 99-116) — Current result construction

Dependencies:
* Phase 2 completion (interface changes)

### Step 3.2: Add `tool.driver.informationUri`, `tool.driver.semanticVersion`, and `automationDetails.id`

Update the return object of `buildRun()` to include additional tool metadata:

```typescript
return {
  tool: {
    driver: {
      name: 'accessibility-scanner',
      version: toolVersion,
      informationUri: 'https://github.com/devopsabcs-engineering/accessibility-scan-demo-app',
      semanticVersion: toolVersion,
      rules,
    },
  },
  automationDetails: {
    id: `accessibility-scan/${url}`,
  },
  results,
};
```

Files:
* `src/lib/report/sarif-generator.ts` — Modify the return block of `buildRun()` (lines 118-128)

Discrepancy references:
* Directly addresses user requirement for tool identification

Success criteria:
* `tool.driver.informationUri` points to the GitHub repository
* `tool.driver.semanticVersion` matches the version string
* `automationDetails.id` uniquely identifies the scan run

Context references:
* Research document (Lines 105-130) — Target SarifRun interface
* `src/lib/report/sarif-generator.ts` (Lines 118-128) — Current return block

Dependencies:
* Step 2.1 (SarifRun interface update)

### Step 3.3: Update SARIF generator tests for enriched messages and tool metadata

Add and update tests in `sarif-generator.test.ts`:

1. **Update** "includes tool driver information" — assert `informationUri` and `semanticVersion` are present.
2. **Add** "includes automationDetails with scan URL" — verify `automationDetails.id` contains the scanned URL.
3. **Add** "rule includes fullDescription" — verify `fullDescription.text` is set from `violation.description`.
4. **Add** "rule includes help.text and help.markdown" — verify both are present and non-empty.
5. **Add** "rule help.markdown contains WCAG tags" — provide a violation with WCAG tags, verify they appear in markdown.
6. **Add** "rule includes defaultConfiguration.level" — verify level maps from impact.
7. **Add** "rule properties include precision and problem.severity" — verify both are set correctly.
8. **Update** "includes scanned URL in result message" — update expected message format to match enriched format.
9. **Add** "result message includes element count" — verify the element count appears in the message.
10. **Add** "rule help.markdown contains learn more link" — verify the helpUrl is embedded as a markdown link.
11. **Add** "result message includes failureSummary when present" — provide a violation with `failureSummary` and verify it appears in the message.
12. **Add** "generateSiteSarif includes enriched rule fields" — verify that `generateSiteSarif` output contains `fullDescription` and `help` on rules.
13. **Add** "IBM rule IDs with underscores produce valid markdown links" — verify that a violation with id `label_name_visible` and a helpUrl containing underscores produces an unescaped markdown link in `help.markdown`.

Files:
* `src/lib/report/__tests__/sarif-generator.test.ts` — Add and update tests

Discrepancy references:
* Validates all enrichment changes from Phases 2 and 3

Success criteria:
* All new and updated tests pass
* Tests cover all GitHub-required fields (`fullDescription`, `help.text`, `help.markdown`)
* Tests cover all GitHub-recommended fields (`precision`, `problem.severity`, `defaultConfiguration`)
* Tests verify tool metadata (`informationUri`, `semanticVersion`, `automationDetails`)

Context references:
* `src/lib/report/__tests__/sarif-generator.test.ts` (Lines 1-110) — Existing test suite
* Research document (Lines 135-220) — Expected SARIF output examples

Dependencies:
* Steps 3.1 and 3.2 completion

## Implementation Phase 4: Validation

<!-- parallelizable: false -->

### Step 4.1: Run full project validation

Execute all validation commands for the project:
* `npm run lint` — ESLint across the project
* `npm run build` — Next.js production build to catch type errors
* `npm run test` — Full Vitest test suite

### Step 4.2: Fix minor validation issues

Iterate on lint errors, build warnings, and test failures. Apply fixes directly when corrections are straightforward and isolated.

### Step 4.3: Report blocking issues

When validation failures require changes beyond minor fixes:
* Document the issues and affected files.
* Provide the user with next steps.
* Recommend additional research and planning rather than inline fixes.
* Avoid large-scale refactoring within this phase.

## Dependencies

* Node.js and npm (project build and test toolchain)
* Vitest (test runner)
* ESLint (linter)
* Next.js (build toolchain)

## Success Criteria

* GitHub Code Scanning displays inline rule help for every accessibility alert
* IBM rule URLs resolve to working archive pages
* All existing and new tests pass
* Lint and build produce no errors
