# SARIF Generator Gap Analysis for GitHub Code Scanning

## Research Topics

1. Current SARIF fields produced vs. SARIF v2.1.0 spec requirements for GitHub Code Scanning
2. IBM Equal Access URL pattern mismatch and encoding issues
3. Data available in AxeViolation/AxeNode that should flow into SARIF
4. Missing SARIF properties that GitHub Code Scanning needs for rich display

## Status: Complete

---

## 1. Current SARIF Output — Field Inventory

### Source File

`src/lib/report/sarif-generator.ts` — 142 lines total.

### Current SarifRule (reportingDescriptor) Fields

| Field | Present | Value Source |
|---|---|---|
| `id` | Yes | `violation.id` |
| `name` | Yes | `violation.id` (same as id — not a human-readable name) |
| `shortDescription.text` | Yes | `violation.description` |
| `helpUri` | Yes | `violation.helpUrl` (passed through from normalizer) |
| `properties.tags` | Yes | `violation.tags` |
| `fullDescription.text` | **MISSING** | GitHub marks this **Required** |
| `help.text` | **MISSING** | GitHub marks this **Required** |
| `help.markdown` | **MISSING** | GitHub **Recommended** — when present, displayed instead of `help.text` |
| `defaultConfiguration.level` | **MISSING** | GitHub **Optional** but used for severity display |
| `properties.precision` | **MISSING** | GitHub **Recommended** — affects result ordering |
| `properties.problem.severity` | **MISSING** | GitHub **Recommended** — affects result ordering |

### Current SarifResult Fields

| Field | Present | Value Source |
|---|---|---|
| `ruleId` | Yes | `violation.id` |
| `ruleIndex` | Yes | Index into rules array |
| `level` | Yes | Mapped from `violation.impact` via `mapImpactToLevel()` |
| `message.text` | Yes | `"{help} ({url} — {target})"` — plain text only |
| `locations[0].physicalLocation.artifactLocation.uri` | Yes | `urlToArtifactPath(url)` — converts URL to hostname/path |
| `locations[0].physicalLocation.region.snippet.text` | Yes | `node.html` |
| `partialFingerprints.primaryLocationLineHash` | Yes | Simple hash of `violation.id:target` |
| `relatedLocations` | **MISSING** | Could link multiple affected nodes |
| `codeFlows` | **MISSING** | Not applicable for accessibility |
| `locations[0].physicalLocation.region.startLine` | **MISSING** | Not available from DOM scanning |
| `locations[0].physicalLocation.region.startColumn` | **MISSING** | Not available from DOM scanning |
| `locations[0].message.text` | **MISSING** | Could carry failure summary |

### Current SarifRun Fields

| Field | Present | Value Source |
|---|---|---|
| `tool.driver.name` | Yes | `'accessibility-scanner'` |
| `tool.driver.version` | Yes | Passed as parameter |
| `tool.driver.rules` | Yes | Built from violations |
| `results` | Yes | Built from violation nodes |
| `tool.driver.semanticVersion` | **MISSING** | GitHub prefers this over `version` |
| `tool.driver.informationUri` | **MISSING** | Link to tool documentation |
| `automationDetails.id` | **MISSING** | Enables category-based filtering |
| `columnKind` | **MISSING** | Should be `"utf16CodeUnits"` per spec examples |

### Top-Level SarifLog Fields

| Field | Present | Notes |
|---|---|---|
| `$schema` | Yes | Uses OASIS spec URL |
| `version` | Yes | `'2.1.0'` |
| `runs` | Yes | One per URL scanned |

---

## 2. IBM Equal Access URL Issue — Root Cause Analysis

### Two Different URL Patterns

**Pattern A — IBM raw result `help` field (from actual scan data):**

```text
https://able.ibm.com/rules/archives/2026.03.04/doc/en-US/style_color_misuse.html#...
```

This is the *actual* URL embedded in the IBM Equal Access engine results. It points to a versioned archive path and includes rule-specific URL fragment with encoded JSON context. These URLs work correctly.

**Pattern B — result-normalizer.ts line 75 (hardcoded in normalizer):**

```text
https://able.ibm.com/rules/tools/help/${r.ruleId}
```

This is a *different, generic* URL pattern that the normalizer substitutes. It uses `/rules/tools/help/` instead of the versioned archive path.

### The Core Problem

The `normalizeIbmResults()` function at `src/lib/scanner/result-normalizer.ts:75` **discards the IBM raw `help` URL** and replaces it with a constructed URL:

```typescript
helpUrl: `https://able.ibm.com/rules/tools/help/${r.ruleId}`,
```

However, the IBM raw result object has a working `help` field containing the full archive URL:

```json
"help": "https://able.ibm.com/rules/archives/2026.03.04/doc/en-US/style_color_misuse.html#..."
```

The normalizer maps `r.help ?? r.message` to the `help` text field, treating the IBM `help` property as a text description rather than recognizing it as a URL.

### The Underscore Encoding Issue

The user reports GitHub Code Scanning showing broken links like:

```text
Cannot GET /rules/archives/2026.03.04/doc/en-US/label\_name\_visible.html
```

Note the `\_` (backslash-escaped underscores). This happens because:

1. The SARIF `helpUri` contains a URL with underscores in the rule ID (e.g., `label_name_visible`)
2. Somewhere in the rendering pipeline (likely GitHub's markdown processing of SARIF content), underscores are being treated as markdown emphasis delimiters and backslash-escaped
3. The escaped underscores (`\_`) are passed through to the HTTP request, resulting in a 404

### Root Cause Summary

There are actually **two bugs**:

1. **Wrong URL pattern**: The normalizer substitutes `/rules/tools/help/{ruleId}` instead of using the IBM-provided archive URL (`/rules/archives/{version}/doc/en-US/{ruleId}.html`)
2. **Potential markdown escaping**: If the URL passes through any markdown processing step, underscores in rule IDs like `label_name_visible` get backslash-escaped to `label\_name\_visible`

### Fix Approach

- Use the IBM raw `help` URL directly (strip the `#fragment` portion containing encoded JSON context)
- Or construct URLs using the archive pattern: `https://able.ibm.com/rules/archives/{version}/doc/en-US/{ruleId}.html`
- Ensure `helpUri` URLs are never processed as markdown

---

## 3. Data Available in AxeViolation/AxeNode Not Flowing to SARIF

### AxeViolation Fields (from `src/lib/types/scan.ts`)

| Field | Type | Used in SARIF | Notes |
|---|---|---|---|
| `id` | `string` | Yes — `ruleId`, `rule.id`, `rule.name` | `name` should be human-readable, not same as `id` |
| `impact` | `'minor'\|'moderate'\|'serious'\|'critical'` | Yes — mapped to `level` | Also usable for `defaultConfiguration.level` |
| `tags` | `string[]` | Yes — `properties.tags` | Could also drive `properties.precision` |
| `description` | `string` | Yes — `shortDescription.text` | Should also populate `fullDescription.text` |
| `help` | `string` | Partial — used in `message.text` | **Should populate `help.text`** |
| `helpUrl` | `string` | Yes — `helpUri` | Broken for IBM (see section 2) |
| `nodes` | `AxeNode[]` | Partial | Only first node's html used as snippet |
| `principle` | `string?` | **No** | Could be added to `properties.tags` or `properties` bag |
| `engine` | `string?` | **No** | Could be added to `properties` bag |

### AxeNode Fields (from `src/lib/types/scan.ts`)

| Field | Type | Used in SARIF | Notes |
|---|---|---|---|
| `html` | `string` | Yes — `region.snippet.text` | Good |
| `target` | `string[]` | Partial — in `message.text` | Could be in `location.message.text` |
| `impact` | `string` | **No** | Node-level impact ignored |
| `failureSummary` | `string?` | **No** | **Rich data lost** — should appear in help or message |

### Data Available in HTML Report But Missing from SARIF

The `ViolationList.tsx` component renders all this data for each violation:

1. **Impact badge** — severity level (critical/serious/moderate/minor) — ✅ in SARIF as `level`
2. **Help text** (violation.help) — the concise rule summary — ❌ NOT in SARIF `help.text`
3. **Rule ID** (violation.id) — ✅ in SARIF
4. **Affected elements count** (violation.nodes.length) — ❌ NOT in SARIF
5. **Description** (violation.description) — ✅ in `shortDescription` only
6. **HTML snippet** per node (node.html) — ✅ in `region.snippet.text`
7. **Failure summary** per node (node.failureSummary) — ❌ NOT in SARIF
8. **CSS selector** per node (node.target) — partial in `message.text` only
9. **Learn more link** (violation.helpUrl) — ✅ in `helpUri` (but broken for IBM)
10. **Principle grouping** (violation.principle) — ❌ NOT in SARIF properties

---

## 4. Missing SARIF Properties for GitHub Code Scanning Rich Display

### Critical Missing Properties (Required by GitHub)

#### `fullDescription.text` — Required

GitHub displays this alongside results. Currently absent; `shortDescription.text` is set to `violation.description` but `fullDescription` is not set at all.

**Fix**: Set `fullDescription.text` to `violation.description` (same as shortDescription, or expand with WCAG criteria).

#### `help.text` — Required

GitHub displays this as "Rule help" documentation. Without it, GitHub shows "no rule help available for this alert."

**Fix**: Set `help.text` to `violation.help` — the concise rule guidance.

#### `help.markdown` — Recommended (displayed instead of `help.text` when present)

This is the key property for rich rule documentation in GitHub Code Scanning. When present, GitHub renders it as formatted markdown alongside alerts.

**Recommended content for `help.markdown`**:

```markdown
## {violation.help}

{violation.description}

**Impact**: {violation.impact}
**WCAG Criteria**: {wcag tags joined}
**Principle**: {violation.principle}

[Learn more]({violation.helpUrl})
```

### Important Missing Properties (Recommended by GitHub)

#### `defaultConfiguration.level`

Maps impact to SARIF level. Used by GitHub to establish default severity when `result.level` is not set.

```typescript
defaultConfiguration: {
  level: mapImpactToLevel(violation.impact)  // 'error' | 'warning' | 'note'
}
```

#### `properties.precision`

GitHub uses this with severity to order results. Accessibility scanner results are generally high confidence.

```typescript
properties: {
  precision: 'high',  // axe-core rules are well-tested
  // or 'medium' for IBM potentialviolation
}
```

#### `properties.problem.severity`

Non-security result severity. Maps to impact:

```typescript
properties: {
  'problem.severity': violation.impact === 'critical' || violation.impact === 'serious'
    ? 'error'
    : violation.impact === 'moderate' ? 'warning' : 'recommendation'
}
```

### Nice-to-Have Missing Properties

#### `tool.driver.semanticVersion`

GitHub prefers this over `version` for tracking tool version changes.

#### `tool.driver.informationUri`

Link to the tool's documentation/homepage.

#### `automationDetails.id`

Enables category-based analysis runs. Example: `"accessibility-scan/wcag2aa/"`.

#### `relatedLocations`

When a violation affects multiple nodes, only the first becomes the primary `location`. Additional nodes could be listed as `relatedLocations` with their own snippets and selectors.

---

## 5. Existing SARIF Examples in Codebase

### Prior Research Example (from `.copilot-tracking/research/subagents/2026-03-06/cicd-integration-research.md`)

Contains an ideal SARIF rule structure with all GitHub-supported fields:

```json
{
  "id": "color-contrast",
  "name": "color-contrast",
  "shortDescription": { "text": "Elements must meet minimum color contrast ratio thresholds" },
  "fullDescription": { "text": "Ensures the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds" },
  "helpUri": "https://dequeuniversity.com/rules/axe/4.11/color-contrast",
  "help": {
    "text": "Elements must meet minimum color contrast ratio thresholds",
    "markdown": "Elements must meet minimum color contrast ratio thresholds. [More info](https://dequeuniversity.com/rules/axe/4.11/color-contrast)"
  },
  "defaultConfiguration": { "level": "error" },
  "properties": {
    "tags": ["wcag2aa", "wcag143", "accessibility"],
    "precision": "high",
    "problem.severity": "error"
  }
}
```

### Test Fixture Example (from `sarif-generator.test.ts`)

Test violations use axe-core help URLs which work fine:

```typescript
helpUrl: 'https://dequeuniversity.com/rules/axe/4.0/color-contrast'
```

### Raw IBM Result Example (from `results/https_/example.com.json`)

IBM results contain full archive URLs in the `help` field:

```json
{
  "ruleId": "style_color_misuse",
  "help": "https://able.ibm.com/rules/archives/2026.03.04/doc/en-US/style_color_misuse.html#...",
  "message": "Verify color is not used as the only visual means of conveying information",
  "snippet": "<style>"
}
```

But the normalizer replaces this with `https://able.ibm.com/rules/tools/help/style_color_misuse`.

---

## 6. Summary of All Gaps

### Gap 1: No Rule Help Content (Critical)

**Symptom**: GitHub shows "no rule help available for this alert."
**Cause**: `help.text` and `help.markdown` are not set in `SarifRule`.
**Fix**: Add `help.text` from `violation.help`, and `help.markdown` with a rich markdown template including description, impact, WCAG criteria, principle, and learn more link.

### Gap 2: No Full Description (Critical)

**Symptom**: GitHub does not display full rule documentation.
**Cause**: `fullDescription.text` is not set in `SarifRule`.
**Fix**: Add `fullDescription.text` from `violation.description` (could be enriched).

### Gap 3: IBM Help URLs Broken (Critical)

**Symptom**: 404 errors when clicking IBM rule links in GitHub Code Scanning.
**Cause**: `normalizeIbmResults()` replaces the working IBM archive URL with a generic `/rules/tools/help/` URL. Additionally, underscores in rule IDs may be markdown-escaped to `\_`.
**Fix**: Either (a) preserve the IBM raw `help` URL (stripped of fragment), or (b) construct archive-pattern URLs. Avoid any markdown escaping of URLs in `helpUri`.

### Gap 4: Missing Default Configuration (Medium)

**Symptom**: GitHub may use wrong default severity for rules.
**Cause**: `defaultConfiguration.level` not set.
**Fix**: Map `violation.impact` to SARIF level in rule definition.

### Gap 5: Missing Precision and Problem Severity (Medium)

**Symptom**: GitHub result ordering may not prioritize critical issues first.
**Cause**: `properties.precision` and `properties.problem.severity` not set.
**Fix**: Add these to `SarifRule.properties`.

### Gap 6: Failure Summary Lost (Low-Medium)

**Symptom**: GitHub alert detail lacks actionable remediation guidance.
**Cause**: `node.failureSummary` is not included anywhere in SARIF output.
**Fix**: Include in `help.markdown` or in `location.message.text` or in `message.text` markdown.

### Gap 7: Principle/Engine Metadata Lost (Low)

**Symptom**: Cannot filter by WCAG principle or engine in GitHub.
**Cause**: `violation.principle` and `violation.engine` not added to properties.
**Fix**: Add to `properties.tags` or `properties` bag.

### Gap 8: No Automation Details (Low)

**Symptom**: Multiple analysis categories cannot be distinguished.
**Cause**: `automationDetails.id` not set on run.
**Fix**: Add `automationDetails: { id: 'accessibility-scan/wcag2aa/' }`.

### Gap 9: Message Text is Plain (Low)

**Symptom**: Alert title in GitHub is plain text without structure.
**Cause**: `message.text` is `"{help} ({url} — {target})"` — functional but not structured.
**Fix**: Consider adding markdown formatting or structured message with violation details, failure summary, and affected selector.

---

## 7. Interface Changes Needed for SarifRule

Current:

```typescript
interface SarifRule {
  id: string;
  name: string;
  shortDescription: { text: string };
  helpUri: string;
  properties: { tags: string[] };
}
```

Needed:

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

---

## 8. Potential Next Research

- [ ] Verify IBM `/rules/tools/help/{ruleId}` URL pattern actually returns content (may be a redirect or deprecated endpoint)
- [ ] Check whether GitHub markdown-escapes `helpUri` values or if the escaping happens elsewhere in the pipeline
- [ ] Investigate whether axe-core `helpUrl` values (Deque University) also need special handling
- [ ] Review SARIF output size limits — 25,000 results per run, 20 runs, 20 tags per rule

## References

- [GitHub SARIF support for code scanning](https://docs.github.com/en/code-security/code-scanning/integrating-with-code-scanning/sarif-support-for-code-scanning)
- [SARIF v2.1.0 OASIS spec](https://docs.oasis-open.org/sarif/sarif/v2.1.0/sarif-v2.1.0.html)
- Source: `src/lib/report/sarif-generator.ts`
- Source: `src/lib/scanner/result-normalizer.ts`
- Source: `src/lib/types/scan.ts`
- Source: `src/components/ViolationList.tsx`
- Sample data: `results/https_/example.com.json`
