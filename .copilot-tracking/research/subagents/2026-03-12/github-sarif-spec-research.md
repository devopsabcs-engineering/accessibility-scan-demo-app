# GitHub SARIF Specification Research for Code Scanning Display

**Status:** Complete
**Date:** 2026-03-12
**Topic:** SARIF v2.1.0 fields that produce rich display in GitHub Security tab

---

## 1. Executive Summary

GitHub Code Scanning uses a **specific subset** of SARIF v2.1.0 properties. The **critical missing piece** causing "no rule help available" in the current accessibility scanner is the absence of the `help` property (`help.text` and `help.markdown`) on `reportingDescriptor` (rule) objects. Additionally, the current generator is missing `fullDescription` on rules, which GitHub marks as **Required**.

### Key Fix: Add `help.text` and `help.markdown` to every rule

---

## 2. Complete Field Mapping: What GitHub Uses for Display

### 2.1 reportingDescriptor (rules[]) — The Most Important Object

This is where rule metadata lives. GitHub's documentation explicitly lists these properties:

| Property | Required? | GitHub Display Usage |
|---|---|---|
| `id` | **Required** | Unique rule identifier. Used in URLs, filtering, and cross-referencing. |
| `name` | Optional | Displayed to allow filtering by rule. Limited to **255 characters**. |
| `shortDescription.text` | **Required** | Displayed next to associated results. Limited to **1024 characters**. |
| `fullDescription.text` | **Required** | Displayed next to associated results. Limited to **1024 characters**. |
| `defaultConfiguration.level` | Optional | Default severity: `note`, `warning`, `error`. Defaults to `warning`. |
| `help.text` | **Required** | Help documentation shown next to results. **This is the rule help panel content.** |
| `help.markdown` | Optional (Recommended) | **When present, displayed INSTEAD of `help.text`**. This is the rich expandable help content shown in alert detail. |
| `helpUri` | Not listed as supported | **NOT in GitHub's supported properties table.** See section 2.6 below. |
| `properties.tags[]` | Optional | Array of strings for filtering results on GitHub (e.g., `security`, `accessibility`). |
| `properties.precision` | Optional (Recommended) | `very-high`, `high`, `medium`, `low`. Results ordered by precision. |
| `properties.problem.severity` | Optional (Recommended) | For non-security: `error`, `warning`, `recommendation`. |
| `properties.security-severity` | Optional (Recommended for security) | Numeric `0.0–10.0`. Triggers security severity mapping: >9.0=critical, 7.0–8.9=high, 4.0–6.9=medium, 0.1–3.9=low. |

### 2.2 result object — Per-Alert Data

| Property | Required? | GitHub Display Usage |
|---|---|---|
| `ruleId` | Optional | Rule identifier. Used for filtering by rule. |
| `ruleIndex` | Optional | Index into `rules[]` array. |
| `rule` | Optional | Reference to the reporting descriptor. |
| `level` | Optional | Overrides `defaultConfiguration.level`. Values: `note`, `warning`, `error`. |
| `message.text` | **Required** | **Alert title/description.** First sentence shown when space is limited. |
| `locations[]` | **Required** | Physical locations. At least one required. Only first used for file annotation. Max 10. |
| `partialFingerprints` | **Required** | Fingerprint for deduplication. Only `primaryLocationLineHash` is used. |
| `codeFlows[].threadFlows[].locations[]` | Optional | If present, GitHub expands code flow visualization. |
| `relatedLocations[]` | Optional | Linked when embedded in result message via `[text](id)` syntax. |

### 2.3 physicalLocation object

| Property | Required? |
|---|---|
| `artifactLocation.uri` | **Required** — relative path from repo root recommended. |
| `region.startLine` | **Required** |
| `region.startColumn` | **Required** |
| `region.endLine` | **Required** |
| `region.endColumn` | **Required** |

### 2.4 toolComponent object

| Property | Required? |
|---|---|
| `name` | **Required** |
| `version` | Optional (not used if `semanticVersion` present) |
| `semanticVersion` | Optional (preferred over `version`) |
| `rules[]` | **Required** |

### 2.5 sarifLog object

| Property | Required? |
|---|---|
| `$schema` | **Required** — e.g., `https://json.schemastore.org/sarif-2.1.0.json` |
| `version` | **Required** — must be `"2.1.0"` |
| `runs[]` | **Required** |

### 2.6 helpUri — The Missing "Learn More" Link

**Critical finding:** `helpUri` is **NOT listed in GitHub's supported properties table** for `reportingDescriptor`. GitHub's documentation does not mention `helpUri` at all in its supported properties section.

This means:
- GitHub does **not** render `helpUri` as a clickable "Learn more" link in the alert detail.
- If a "Learn more" link is desired, include it as a markdown link **within `help.markdown`**.
- The current broken links in alerts are likely because `helpUri` is the only reference and GitHub ignores it.

**Workaround:** Embed the help URL directly in `help.markdown`:
```markdown
[Learn more about this rule](https://dequeuniversity.com/rules/axe/4.10/color-contrast)
```

---

## 3. The `help` Property — The Key Missing Piece

### 3.1 What It Does

Per SARIF v2.1.0 §3.49.13: The `help` property is a `multiformatMessageString` object containing:
- `text` (required on the object): Plain text documentation for the rule.
- `markdown` (optional): GitHub Flavored Markdown documentation.

Per GitHub's documentation:
> **`help.text`** — Required. Documentation for the rule using text format. Code scanning displays this help documentation next to the associated results.
> 
> **`help.markdown`** — Optional (Recommended). Documentation for the rule using Markdown format. Code scanning displays this help documentation next to the associated results. **When `help.markdown` is available, it is displayed instead of `help.text`.**

### 3.2 How CodeQL Structures `help.markdown`

CodeQL produces rich alerts with structured markdown help. The pattern is:

```json
{
  "id": "js/xss",
  "name": "CrossSiteScripting",
  "shortDescription": {
    "text": "Cross-site scripting vulnerability"
  },
  "fullDescription": {
    "text": "Writing user input directly to a web page allows for a cross-site scripting vulnerability."
  },
  "help": {
    "text": "# Cross-site scripting\n\nWriting user input directly to a web page...",
    "markdown": "# Cross-site scripting\n\nWriting user input directly to a web page allows for a cross-site scripting vulnerability.\n\n## Recommendation\n\nSanitize all user input before...\n\n## Example\n\n```javascript\n// BAD\nresponse.write(req.query.name);\n```\n\n## References\n\n- [OWASP XSS Prevention](https://example.com)\n"  
  },
  "defaultConfiguration": {
    "level": "error"
  },
  "properties": {
    "tags": ["security", "external/cwe/cwe-079"],
    "precision": "high",
    "security-severity": "6.1"
  }
}
```

### 3.3 Recommended `help.markdown` Structure for Accessibility Rules

```markdown
# Rule Title (e.g., "Ensure sufficient color contrast")

Brief description of what the rule checks.

## Why This Matters

Explanation of accessibility impact and who is affected.

## How to Fix

Step-by-step remediation guidance.

## WCAG Criteria

- [WCAG 2.2 Success Criterion X.Y.Z](https://www.w3.org/WAI/WCAG22/Understanding/...)

## Learn More

- [Deque University: rule-name](https://dequeuniversity.com/rules/axe/4.10/rule-name)
- [WCAG Understanding Document](https://www.w3.org/WAI/WCAG22/Understanding/...)
```

---

## 4. `result.message` — Alert Title Display

### 4.1 message.text

**Required.** GitHub displays `message.text` as the alert title. Per GitHub docs:
> Only the first sentence of the message will be displayed when visible space is limited.

### 4.2 message.markdown

The SARIF spec (§3.11.9) supports `markdown` on message objects. However, GitHub's supported properties table for `result` only lists `message.text`. GitHub does **not** list `message.markdown` as a supported property.

**Recommendation:** Use `message.text` with a clear, information-dense first sentence. Do not rely on `message.markdown` for result messages.

---

## 5. Severity Mapping

### 5.1 defaultConfiguration.level

Maps directly to GitHub severity badges:
- `"error"` → Error (red)
- `"warning"` → Warning (yellow)
- `"note"` → Note (blue)

Defaults to `"warning"` if absent.

### 5.2 properties.security-severity

For rules tagged with `security` in `properties.tags`, this numeric score (0.0–10.0) maps to:
- **>9.0** → Critical
- **7.0–8.9** → High
- **4.0–6.9** → Medium
- **0.1–3.9** → Low

### 5.3 properties.problem.severity

For non-security rules: `error`, `warning`, `recommendation`. Used with `precision` to order results.

### 5.4 Recommended Mapping for Accessibility

| axe-core Impact | `defaultConfiguration.level` | `properties.problem.severity` |
|---|---|---|
| critical | `error` | `error` |
| serious | `error` | `error` |
| moderate | `warning` | `warning` |
| minor | `note` | `recommendation` |

---

## 6. Tags and Filtering

`properties.tags[]` on rules allows GitHub filtering. Max **20 tags** per rule (only 10 displayed).

Recommended tags for accessibility:
```json
{
  "tags": [
    "accessibility",
    "WCAG2.2",
    "WCAG2.1",
    "level-A",       // or "level-AA"
    "cat.color",     // axe-core category
    "best-practice"  // for best-practice rules
  ]
}
```

---

## 7. Fingerprinting and Deduplication

### 7.1 partialFingerprints

**Required** by GitHub. Only `primaryLocationLineHash` is used.

GitHub computes fingerprints from `partialFingerprints` if provided. The `upload-sarif` action can auto-compute if missing, but the API endpoint cannot.

### 7.2 Recommended approach

Include a hash based on: `ruleId + target selector + page URL`.

---

## 8. Upload Limits

| Limit | Value | Notes |
|---|---|---|
| File size (gzip) | **10 MB** max | |
| Runs per file | **20** | |
| Results per run | **25,000** | Only top 5,000 shown (by severity) |
| Rules per run | **25,000** | |
| Tool extensions per run | **100** | |
| Thread flow locations per result | **10,000** | Only top 1,000 shown |
| Locations per result | **1,000** | Only 100 shown |
| Tags per rule | **20** | Only 10 shown |
| Total alert limit | **1,000,000** | |

---

## 9. Gaps in Current SARIF Generator

Comparing the existing `sarif-generator.ts` against GitHub requirements:

| Field | Current State | Required State | Priority |
|---|---|---|---|
| `rules[].fullDescription` | **MISSING** | Required by GitHub | **P0** |
| `rules[].help.text` | **MISSING** | Required by GitHub | **P0** |
| `rules[].help.markdown` | **MISSING** | Recommended — renders rich help | **P0** |
| `rules[].helpUri` | Present | **Not used by GitHub** — remove or keep | P2 |
| `rules[].defaultConfiguration.level` | **MISSING** | Optional but important for severity | **P1** |
| `rules[].properties.precision` | **MISSING** | Recommended for ordering | P1 |
| `rules[].properties.problem.severity` | **MISSING** | Recommended for ordering | P1 |
| `rules[].properties.security-severity` | **MISSING** | Only for security-tagged rules | P2 |
| `result.locations[].region.startLine` | **MISSING** (only snippet) | Required by GitHub | **P0** |
| `result.locations[].region.startColumn` | **MISSING** | Required by GitHub | **P0** |
| `result.locations[].region.endLine` | **MISSING** | Required by GitHub | **P0** |
| `result.locations[].region.endColumn` | **MISSING** | Required by GitHub | **P0** |
| `$schema` | Uses OASIS raw URL | Should use `https://json.schemastore.org/sarif-2.1.0.json` | P2 |

---

## 10. Ideal SARIF Structure — Complete Example

```json
{
  "$schema": "https://json.schemastore.org/sarif-2.1.0.json",
  "version": "2.1.0",
  "runs": [
    {
      "tool": {
        "driver": {
          "name": "accessibility-scanner",
          "semanticVersion": "1.0.0",
          "informationUri": "https://github.com/devopsabcs-engineering/accessibility-scan-demo-app",
          "rules": [
            {
              "id": "color-contrast",
              "name": "color-contrast",
              "shortDescription": {
                "text": "Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds."
              },
              "fullDescription": {
                "text": "Ensures the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds. Low contrast text is difficult or impossible for many users to read."
              },
              "help": {
                "text": "Elements must meet minimum color contrast ratio thresholds.\n\nFix any of the following:\n- Increase the contrast ratio between the foreground and background colors.\n- Use larger or bolder text.\n\nWCAG Criteria: 1.4.3 Contrast (Minimum) (Level AA)\n\nLearn more: https://dequeuniversity.com/rules/axe/4.10/color-contrast",
                "markdown": "# Ensure sufficient color contrast\n\nElements must meet minimum color contrast ratio thresholds.\n\n## Why This Matters\n\nLow contrast text is difficult or impossible to read for many users, including those with low vision, color blindness, or age-related vision changes.\n\n## How to Fix\n\n- Increase the contrast ratio between foreground and background colors\n- Use a contrast ratio of at least **4.5:1** for normal text\n- Use a contrast ratio of at least **3:1** for large text (18pt or 14pt bold)\n\n## WCAG Criteria\n\n- [1.4.3 Contrast (Minimum) (Level AA)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)\n\n## Learn More\n\n- [Deque University: color-contrast](https://dequeuniversity.com/rules/axe/4.10/color-contrast)\n"
              },
              "helpUri": "https://dequeuniversity.com/rules/axe/4.10/color-contrast",
              "defaultConfiguration": {
                "level": "error"
              },
              "properties": {
                "tags": [
                  "accessibility",
                  "WCAG2AA",
                  "cat.color",
                  "wcag143"
                ],
                "precision": "very-high",
                "problem.severity": "error"
              }
            }
          ]
        }
      },
      "results": [
        {
          "ruleId": "color-contrast",
          "ruleIndex": 0,
          "level": "error",
          "message": {
            "text": "Element has insufficient color contrast of 2.52 (foreground: #6c757d, background: #ffffff, required ratio: 4.5:1). Found on https://example.com — button.btn-secondary"
          },
          "locations": [
            {
              "physicalLocation": {
                "artifactLocation": {
                  "uri": "example.com/index.html"
                },
                "region": {
                  "startLine": 1,
                  "startColumn": 1,
                  "endLine": 1,
                  "endColumn": 2,
                  "snippet": {
                    "text": "<button class=\"btn-secondary\">Submit</button>"
                  }
                }
              }
            }
          ],
          "partialFingerprints": {
            "primaryLocationLineHash": "a1b2c3d4:1"
          }
        }
      ],
      "columnKind": "utf16CodeUnits"
    }
  ]
}
```

---

## 11. relatedLocations and Embedded Links

GitHub supports `relatedLocations[]` with embedded links in `message.text`:

```json
{
  "message": {
    "text": "Element has insufficient contrast. See [related element](0)."
  },
  "relatedLocations": [
    {
      "id": 0,
      "physicalLocation": { ... },
      "message": { "text": "Related element" }
    }
  ]
}
```

The `[text](id)` syntax in message text creates clickable links to related locations.

---

## 12. codeFlows

GitHub will expand `codeFlows` if present. For accessibility scanning, this is generally not applicable since violations are typically single-location findings rather than execution path issues.

---

## 13. How helpUri Is (Not) Processed

**Key Finding:** `helpUri` is defined in SARIF v2.1.0 spec (§3.49.12) as a localizable absolute URI for primary documentation. However, GitHub's supported properties documentation for `reportingDescriptor` does **not list `helpUri`** at all.

This means:
1. GitHub likely **ignores** `helpUri` entirely.
2. The "broken links" reported in the current tool are likely because `helpUri` is the only reference URL, and GitHub never renders it.
3. **Solution:** Embed help URLs in `help.markdown` as markdown links.

Note: It is still harmless to include `helpUri` in the SARIF output (it's valid SARIF), but do not rely on it for display.

---

## 14. References

- [GitHub SARIF Support Documentation](https://docs.github.com/en/code-security/code-scanning/integrating-with-code-scanning/sarif-support-for-code-scanning)
- [SARIF v2.1.0 Specification (OASIS)](https://docs.oasis-open.org/sarif/sarif/v2.1.0/sarif-v2.1.0.html)
- [SARIF JSON Schema](https://json.schemastore.org/sarif-2.1.0.json)
- [GitHub CodeQL Action Fingerprints](https://github.com/github/codeql-action/blob/main/src/fingerprints.ts)
- [Microsoft SARIF Validator](https://sarifweb.azurewebsites.net/)

---

## 15. Clarifying Questions

None — all research questions have been answered through the GitHub documentation and SARIF specification.
