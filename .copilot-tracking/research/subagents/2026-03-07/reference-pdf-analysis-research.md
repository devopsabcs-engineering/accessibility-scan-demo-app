# Reference PDF Analysis Research

## Status: Complete

## Research Topics

1. Extract text content from both reference PDFs in `assets/`
2. Identify section structure, headings, ordering
3. Document scoring format, violation details, code snippets, remediation suggestions
4. Compare both PDFs to each other and to current template structure
5. Gap analysis

## PDFs Under Analysis

- `assets/sample-accessibility-report.pdf` — Accessible site (ontario.ca), 40 pages, ~42,293 chars
- `assets/sample-accessibility-report-BAD.pdf` — Inaccessible site (codepen.io), 42 pages, ~46,823 chars

## PDF Section Structure

Both PDFs share an identical structure. Below is the canonical section ordering found in both reports.

### Page 1: Summary Header / Dashboard

Content present:

- **Headline banner**: "Your website is not inclusive and accessible to people with disabilities." with "Fix issues now >" call to action
- **Total issue count**: "We found {N} issues on your page" (large number displayed prominently)
- **Issue severity breakdown**: Count per level — Critical, Serious, Moderate, Minor
- **Issues detected by category**: Bar/count display across categories:
  - Interactive Content, General, Landmarks, Graphics, ARIA, Forms, Dragging Alternative, Lists, Metadata, Tabs, Tables
- **Scan results header**: "Scan results for {URL}"
- **Compliance badge**: "Non-compliant" (both reports) with explanatory text: "Your scan found serious accessibility issues. Let's fix them now to help you meet accessibility requirements and mitigate legal risk."
- **Date stamp**: "Fri Mar 6, 2026"

**Key observations:**

- No numeric score (0–100) displayed on page 1 — instead a compliance status badge
- No letter grade (A/B/C/D/F) visible
- Severity breakdown uses Critical/Serious/Moderate/Minor counts
- Category breakdown uses their own taxonomy (not WCAG principles directly)
- Good PDF: 27 issues (1 Moderate, 3 Serious, 3 Minor, 20 Critical)
- Bad PDF: 107 issues (0 Moderate, 0 Minor, 2 Serious, 105 Critical)

### Pages 2–34/35: Accessibility Rules / Element Analysis

Each rule/check appears as a numbered item with this structure:

```text
# Element                         Relevant  Successes  Failures  Score
{N} {Description of the           {Yes/No}  {count}    {count}   {0-100 or Pass/Fail or -}
    accessibility check rule
    and why it matters for
    screen reader users...}
```

**Per-rule fields:**

| Field | Description |
|-------|-------------|
| `#` | Sequential rule number (1–60 in both PDFs) |
| `Element` | Multi-line description of the accessibility rule, explaining what it checks and why it matters for screen readers |
| `Relevant` | `Yes` or `No` — whether the rule found applicable elements on the page |
| `Successes` | Count of elements passing the rule (numeric, or `Pass`, or `-`) |
| `Failures` | Count of elements failing the rule (numeric, or `Fail`, or `-`) |
| `Score` | Per-rule score: numeric 0–100, `Pass`, or `Fail` with no number |

**When `Relevant = Yes`:**

- If there are successes: "Code snapshots of successful elements" section with numbered HTML snippets
- If there are failures: "Code snapshots of failed elements" section with numbered HTML snippets
- Code snippets show the actual HTML of each affected element (truncated with `...` if long)
- Up to 10 code snapshots shown per category (successes and failures each)

**When `Relevant = No`:**

- No code snapshots shown
- Successes = 0, Failures = 0

**Rule numbering is the same in both PDFs** — the same 60 rules are checked in the same order. The difference is in the counts and which rules have findings.

### 60 Rules Checked (in order, identical in both PDFs)

1. Alt attribute usage on non-image elements
2. Breadcrumb navigation regions
3. Elements with emphasis importance role
4. iframe needs a label
5. Ambiguous links ("Learn More", "Shop Now")
6. role="application" usage
7. Discounted prices screen reader accessibility
8. Elements with strong importance role
9. aria-hidden="true" on visible content
10. Visually hidden but exposed to assistive tech
11. Buttons without visible text need labels
12. Interactive elements identifiable as buttons
13. Sticky footer overlapping focus
14. Anchor links without visible text
15. aria-current='page' for current page link
16. Link purpose distinguishable from text
17. Navigation links without visible text
18. role=menu on navigation elements
19. role=menubar on navigation elements
20. ARIA menu roles (role="menuitem")
21. Interactive elements with ARIA relationship/state attributes
22. autofocus attribute
23. Checkbox control labels
24. Form controls causing context change on input
25. type="submit" on form submission controls
26. Main navigation with role navigation
27. Radio control labels
28. Required field marking (required or aria-required)
29. article tag usage on non-self-contained content
30. Breadcrumb region labeling
31. Navigation landmark accuracy
32. Main landmark content
33. Main landmark tagging
34. Single main landmark
35. Search landmark for forms
36. CSS background functional images with role="img"
37. Decorative/complementary graphics (icons)
38. Images require text alternative
39. Text alternatives accuracy
40. Non-graphical elements marked as images
41. Slider operable with single pointer
42. Aria labels vs element text override
43. Sticky header overlapping focus
44. Empty list announcement
45. Default page language
46. Meta viewport scalability
47. Meta refresh redirect
48. Missing page title
49. Descriptive page titles
50. tablist without role="tablist"
51. role="tablist" without tabs
52. Custom tabs with role="tab"
53. role="tab" not in tab interface
54. role="tabpanel" without this role
55. role="tabpanel" without corresponding tab
56. Column header role/scope
57. Empty table header cell
58. Layout table markup
59. Nested tables
60. Table row header role/scope

### Page 35 (end of rules): WCAG Best Practices Section

Header: **"WCAG Best Practices (Not included in score)"**

Then additional rules numbered 1–13 with same format as above:

1. aria-describedby pointing to missing ID
2. aria-labelledby with invalid ID references
3. Figure elements without figcaption
4. title attribute reliability
5. aria-controls pointing to missing ID
6. Link triggers image appear warning
7. Link triggers mail application warning
8. Link triggers PDF reader warning
9. contentinfo region (footer)
10. Incorrect contentinfo landmark
11. Single contentinfo landmark
12. Valid ISO language value on html lang
13. Meta viewport for mobile

### Final Page: Footer

- "This audit is subject to the Terms of Service"

## Key Differences Between Good and Bad PDFs

| Aspect | Good (ontario.ca) | Bad (codepen.io) |
|--------|-------------------|-------------------|
| Total issues | 27 | 107 |
| Critical | 20 | 105 |
| Serious | 3 | 2 |
| Moderate | 1 | 0 |
| Minor | 3 | 0 |
| Top categories | Interactive Content (12), General (9) | General (83), Graphics (16) |
| Pages | 40 | 42 |
| Rules with findings | Fewer rules have relevant elements | More rules have relevant elements with failures |
| Code snapshots | Moderate amount | Very large amount (many failures) |

Both PDFs:

- Use identical structure and section ordering
- Check the same 60 rules + 13 best practices
- Show "Non-compliant" status
- Display same date (Fri Mar 6, 2026)

## Content Features Analysis

| Feature | Present in Reference PDFs? | Details |
|---------|---------------------------|---------|
| Compliance banner/status | YES | "Non-compliant" badge with explanatory text |
| Total issue count | YES | Prominently displayed number |
| Severity breakdown | YES | Critical/Serious/Moderate/Minor counts |
| Category breakdown | YES | 11 categories with counts |
| Numeric score (0-100) | YES (per rule) | Per-rule scores shown, but no overall page-level score on page 1 |
| Letter grade (A/B/C/D/F) | NO | Not present anywhere |
| Overall score circle | NO | Not present on page 1 |
| Code snippets per violation | YES | HTML code snapshots for both successes and failures |
| Remediation/fix suggestions | NO | Rule descriptions explain *why* each check matters, but no explicit "how to fix" recommendations |
| WCAG success criteria IDs | NO | Not shown (no "2.1.1" style references) |
| WCAG principle mapping | NO | No POUR principle names (Perceivable/Operable/Understandable/Robust) |
| Page metadata display | YES | URL, date shown on page 1 |
| Engine version | NO | Not shown |
| Impact badges per rule | NO | Uses "Relevant/Successes/Failures/Score" rather than impact levels |
| Per-element HTML snippets | YES | Up to 10 per rule, for both successes and failures |
| Scan date | YES | Shown on page 1 |
| Per-rule description | YES | Multi-sentence description explaining screen reader impact |
| Best practices (non-scored) | YES | Separate section with 13 rules |
| Terms of service footer | YES | Final line on last page |

## Gap Analysis: Reference PDFs vs Current Templates

### Current Template Structure (report-template.ts)

The current single-page report template includes these sections:

1. **Title**: "WCAG 2.2 Level AA Accessibility Report"
2. **Page metadata**: URL, scan date, engine version
3. **Executive Summary**: Score circle (0-100), letter grade (A/B/C/D/F), compliance badge (AODA Compliant / Needs Remediation), total violations/passes/needs review counts
4. **WCAG Principles (POUR)**: Perceivable/Operable/Understandable/Robust with scores and progress bars
5. **Impact Breakdown**: Table with Critical/Serious/Moderate/Minor failed/passed counts
6. **Detailed Violations**: Table with columns: Impact, Issue, Rule, Elements, Principle
7. **AODA Compliance Note**: Explanatory text block
8. **Disclaimer**: Disclaimer text

### Gaps: What Reference PDFs Have That Current Template Lacks

| Gap | Reference PDF Feature | Current Template |
|-----|----------------------|------------------|
| **Code snapshots** | HTML code snippets for each affected element (success + failure) | NOT present — violations table shows count only, no code |
| **Per-rule detail pages** | Full page(s) per rule with description, relevance flag, success/failure counts, and code | NOT present — flat violation table only |
| **Rule description text** | Multi-sentence explanation of why each rule matters for screen readers | Only "help" text (typically one line) |
| **Success elements** | Code of passing elements shown alongside failures | NOT present — only violations shown |
| **Best practices section** | Separate non-scored WCAG best practices (13 rules) | NOT present |
| **Category breakdown** | Counts per category (Interactive Content, General, etc.) | NOT present |
| **Severity counts on page 1** | Prominent severity count (Critical/Serious/Moderate/Minor) | Impact Breakdown exists but in table form, not prominent |
| **Compliance banner** | Large "Non-compliant" banner with call-to-action text | Has badge but minimal |
| **Terms of service** | Footer reference to terms | NOT present |

### Gaps: What Current Template Has That Reference PDFs Lack

| Gap | Current Template Feature | Reference PDFs |
|-----|-------------------------|----------------|
| **Letter grade** | A/B/C/D/F grade display | NOT present |
| **Overall numeric score** | 0-100 score circle on page 1 | NOT present (only per-rule scores) |
| **WCAG principles (POUR)** | Perceivable/Operable/Understandable/Robust breakdown with progress bars | NOT present |
| **Engine version** | Shows axe engine version | NOT present |
| **AODA Compliance Note** | Specific AODA regulation reference | NOT present (generic "accessibility requirements" only) |
| **Disclaimer** | Automation disclaimer | "Terms of Service" reference only |
| **Compliant badge option** | Badge can show "AODA Compliant" for passing sites | Both reference PDFs show "Non-compliant" only |

### Site Report Template (site-report-template.ts) Additional Sections

The site report has these additional sections not in the single-page report:

- Pages scanned count
- Unique violations / total instances
- Highest/lowest/median page scores
- Top 10 violations table (with Instances and Pages columns)
- Per-page scores table (URL, Score, Grade, Violations, Passes)

These are all absent from the reference PDFs (which are single-page reports).

## Summary of Reference PDF Format

The reference PDFs use a fundamentally different structure than the current template:

1. **Dashboard page 1** → Summary with issue count, severity breakdown, category breakdown, compliance status
2. **Per-rule detail pages** → 60 numbered rules, each with description, relevance flag, pass/fail counts, score, and HTML code snapshots
3. **Best practices section** → 13 additional non-scored checks
4. **Terms of service footer**

The current template uses a **summary-first, flat-table** approach:

1. Score circle + grade + compliance badge
2. WCAG principles breakdown
3. Impact breakdown table
4. Flat violations table (one row per violation)
5. AODA note + disclaimer

## Recommendations for Parity

To achieve output parity with the reference PDFs, the current template would need:

1. **Add code snapshots**: Show HTML code of affected elements per violation (highest-impact gap)
2. **Add per-rule detail view**: Expand each rule into its own section with description, relevance, success/failure counts, and code snapshots
3. **Add success elements**: Show passing elements alongside failures
4. **Add best practices section**: Non-scored rules in a separate section
5. **Add category breakdown**: Counts per category (Interactive Content, General, etc.)
6. **Enhance page 1 summary**: More prominent severity counts, compliance banner
7. **Consider removing/keeping**: Letter grades and POUR breakdown are current-template-specific additions (not in reference PDFs), which may still be valuable to keep as enhancements

## Discovered Research Topics

- The reference PDFs appear to be from a third-party accessibility scanning service (not axe-core directly)
- Their rule taxonomy (60 rules + 13 best practices) does not map directly to axe-core rule IDs
- The "category" system (Interactive Content, General, Landmarks, etc.) is their own taxonomy
- The per-rule scoring (0-100, Pass, Fail) differs from axe-core's binary pass/fail per node

## Clarifying Questions

1. Should the current template's letter grade and POUR breakdown be preserved as enhancements on top of reference PDF parity?
2. Should code snapshots be added in a condensed form (to avoid 40+ page PDFs) or match the reference's verbose format?
3. Should the "Best Practices (not scored)" section map to axe-core's "incomplete" results?
4. Should the category taxonomy match the reference PDFs or use axe-core's own categories?
