<!-- markdownlint-disable-file -->
# Subagent Research: Complementary Accessibility Scanning Engines

## Research Status: Complete

## Research Topics and Questions

1. What open-source engines complement axe-core and what unique rules does each provide?
2. How does IBM Equal Access integrate with Playwright? What are its unique detection categories?
3. What does HTML_CodeSniffer catch that axe-core doesn't? Can it run in Playwright evaluate context?
4. How to implement custom Playwright-based checks for gaps no engine covers?
5. How to run multiple engines on the same page and deduplicate results?
6. How to report element-level counts to match commercial tool granularity?

---

## 1. Engine Comparison Matrix

### Rule Count Comparison

| Engine | Total Rules | WCAG Coverage | Unique Strength | Active Maintenance | Playwright Support |
|---|---|---|---|---|---|
| **axe-core** | 104 rules | WCAG 2.0/2.1/2.2 A-AAA | Best-practice tag (30 rules), trusted industry standard | Very active (Deque) | Native via `@axe-core/playwright` |
| **IBM Equal Access** | ~163 rule files (counting rule .ts files in repo) | WCAG 2.0/2.1/2.2 + IBM Accessibility policy | CSS analysis, background images, text formatting, application role, landmark validation, form interaction, deprecated element warnings | Active (IBM, v4.0.13) | Native via `accessibility-checker` npm with Playwright Page object |
| **HTML_CodeSniffer** | ~250 individual sniffs across WCAG2A/AA/AAA + Section508 | WCAG 2.1 A-AAA, Section 508 | Advisory notices, technique-level checks, very granular WCAG technique mapping | Stale (last npm publish 6 years ago, v2.5.1) | Via `page.evaluate()` injection |
| **Google Lighthouse** | ~45 accessibility audits | WCAG 2.0/2.1 A-AA subset | Uses axe-core internally + additional audits (tap targets, font-size, language) | Active (Google, embedded in Chrome) | Via Lighthouse Node API with existing Chrome |

### Rule Coverage by Commercial Tool Gap Category

| Commercial Tool Check | axe-core | IBM Equal Access | HTML_CodeSniffer | Custom Playwright |
|---|---|---|---|---|
| **1. Sticky header/footer overlap** | ❌ | `element_tabbable_unobscured` (partial — checks focus obscured by fixed elements) | ❌ | ✅ CSS `getComputedStyle` check |
| **2. Emphasis role** (`<em>` → `role=emphasis`) | ❌ | ❌ | ❌ | ✅ DOM check |
| **3. Strong role** (`<strong>` → `role=strong`) | ❌ | ❌ | ❌ | ✅ DOM check |
| **4. Discounted price accessibility** | ❌ | ❌ | ❌ | ✅ DOM `<del>`/`<s>` + ARIA check |
| **5. Ambiguous link text** | Partial (`link-name` checks existence) | `a_text_purpose` (existence only) | `WCAG2AA.Principle2.Guideline2_4.2_4_4.H77,H78,H79,H80,H81` — checks link purpose/context | ✅ Text pattern matching |
| **6. CSS background images as functional** | ❌ | ✅ `style_background_decorative` — flags CSS background images that may convey info | ❌ | ✅ `getComputedStyle` check |
| **7. role="application" misuse** | ❌ best-practice tag: `aria-allowed-role` | ✅ `application_content_accessible`, `aria_application_labelled`, `aria_application_label_unique` — extensive 3-rule coverage | Partial | N/A |
| **8. role="menu/menubar/menuitem" misuse** | ❌ | ✅ `aria_parent_required`, `aria_child_valid` — validates ARIA role containment | Partial | N/A |
| **9. Empty lists** announced by SR | ❌ | ✅ `list_children_valid`, `list_structure_proper`, `list_markup_review` | ✅ Advisory notices | ✅ DOM check |
| **10. aria-current="page"** | ❌ | ❌ | ❌ | ✅ DOM check |
| **11. Form control context change** | ❌ | ✅ `form_interaction_review`, `input_onchange_review`, `script_select_review` — 3 rules for context changes | ✅ Advisory | N/A |
| **12. type="submit" missing** | ❌ | ✅ `form_submit_button_exists` — checks form has submit button | ❌ | ✅ DOM check |
| **13. Slider single pointer operability** | ❌ | ✅ `draggable_alternative_exists` (draggable elements) | ❌ | ✅ ARIA `role=slider` check |
| **14. Aria labels overriding visible text** | ✅ `label-content-name-mismatch` (best-practice) | ✅ `label_name_visible` — accessible name must match/contain visible label | ❌ | N/A |
| **15. Breadcrumb labeling** | ❌ | ✅ `aria_navigation_label_unique` — navigation landmarks must have labels | ❌ | ✅ DOM `<nav aria-label>` check |
| **16. Decorative SVGs/spans** | Partial: `svg-img-alt` | ✅ `svg_graphics_labelled`, `aria_graphic_labelled` — 2 rules for SVG accessibility | Partial | ✅ DOM check |

### Coverage Summary

- **axe-core alone**: Covers ~4 of 16 commercial tool categories
- **axe-core + IBM Equal Access**: Covers ~12 of 16 categories
- **axe-core + IBM + Custom Playwright**: Covers 16 of 16 categories

---

## 2. IBM Equal Access — Deep Dive

### Package Details

- **npm**: `accessibility-checker` (v4.0.13, published actively)
- **Engine npm**: `accessibility-checker-engine` (the actual rule engine, bundled)
- **License**: Apache-2.0
- **Weekly downloads**: ~26,441
- **Unpacked size**: 5.92 MB
- **GitHub**: `IBMa/equal-access`

### Playwright Integration

IBM Equal Access has **native Playwright support**. The `aChecker.getCompliance()` API accepts a Playwright `Page` object directly:

```typescript
import aChecker from 'accessibility-checker';

// With a Playwright Page object
const results = await aChecker.getCompliance(page, 'my-scan-label');
const report = results.report;
```

### Key Advantages Over axe-core

1. **163+ rule files** vs axe-core's 104 rules
2. **CSS analysis rules**: `style_background_decorative`, `style_color_misuse`, `style_focus_visible`, `style_highcontrast_visible`, `style_hover_persistent`, `style_viewport_resizable`
3. **Form interaction rules**: `form_interaction_review`, `form_submit_button_exists`, `input_onchange_review`
4. **Landmark exhaustive validation**: 20+ landmark-specific rules for banner, contentinfo, complementary, navigation, main, region, article, application, form, toolbar (uniqueness, labeling, visibility)
5. **Application role**: `application_content_accessible`, `aria_application_labelled`, `aria_application_label_unique`
6. **Text analysis**: `text_block_heading`, `text_sensory_misuse`, `text_whitespace_valid`, `text_quoted_correctly`
7. **Windows high contrast**: `style_highcontrast_visible` — unique to IBM
8. **Script behavior**: `script_focus_blur_review`, `script_onclick_misuse`, `script_onclick_avoid`
9. **Target spacing**: `target_spacing_sufficient` — WCAG 2.2 2.5.8 minimum target size
10. **Combobox deep validation**: 7 combobox-specific rules (design, popup, focus, autocomplete, haspopup, active descendant)

### Result Format

IBM Equal Access returns element-level results (each result is one element finding), which naturally provides the **element-level counting** that commercial tools use:

```json
{
  "summary": {
    "counts": {
      "violation": 1,
      "potentialviolation": 0,
      "recommendation": 0,
      "potentialrecommendation": 0,
      "manual": 0
    }
  },
  "results": [
    {
      "ruleId": "aria_hidden_nontabbable",
      "reasonId": "Fail_1",
      "value": ["VIOLATION", "FAIL"],
      "path": { "dom": "/html[1]/body[1]/div[1]", "aria": "/document[1]" },
      "message": "Element should not be focusable...",
      "snippet": "<div aria-hidden=\"true\">",
      "category": "Accessibility",
      "level": "violation"
    }
  ]
}
```

### iframe Scanning

IBM accessibility-checker, when given a Playwright Page object, scans the **current page context**. For iframe content, the approach would be:
1. Navigate to the main page
2. Scan the main page with `aChecker.getCompliance(page, 'main')`  
3. Get iframe frame objects via `page.frames()`
4. For each iframe, use `frame.evaluate()` or navigate separately
5. IBM's engine script can be injected into frame contexts similarly to how we handle axe-core

### Configuration

Create `.achecker.yml` in project root:

```yaml
ruleArchive: latest
policies:
  - IBM_Accessibility
  - WCAG_2_1
failLevels:
  - violation
  - potentialviolation
reportLevels:
  - violation
  - potentialviolation
  - recommendation
  - potentialrecommendation
  - manual
outputFormat:
  - json
```

### Rules NOT in axe-core (IBM-unique rules of high value)

| IBM Rule ID | Description | Relevance to Gap |
|---|---|---|
| `style_background_decorative` | CSS background images that may convey info | Commercial check #6 |
| `application_content_accessible` | Content in `role=application` accessible | Commercial check #7 |
| `form_submit_button_exists` | Form must have submit button | Commercial check #12 |
| `form_interaction_review` | Context change warning on interaction | Commercial check #11 |
| `element_tabbable_unobscured` | Focus not covered by other content (WCAG 2.2) | Commercial check #1 (partial) |
| `style_hover_persistent` | Hover content must be hoverable | Beyond commercial |
| `text_sensory_misuse` | Instructions shouldn't rely on shape/location | Beyond commercial |
| `target_spacing_sufficient` | Target size/spacing (WCAG 2.2 2.5.8) | Beyond commercial |
| `draggable_alternative_exists` | Draggable needs single-pointer alternative | Commercial check #13 |
| `aria_content_in_landmark` | Content must be in landmark | Landmark checks |
| `a_target_warning` | Warn when link opens new window | Best practice |
| `list_markup_review` | Proper HTML list markup | Commercial check #9 |

---

## 3. HTML_CodeSniffer — Analysis

### Package Details

- **npm**: `html_codesniffer` (v2.5.1)
- **License**: BSD-3-Clause
- **Weekly downloads**: ~210,442 (high because Pa11y depends on it)
- **Last published**: 6 years ago (stale, unmaintained)
- **GitHub**: `squizlabs/HTML_CodeSniffer`

### Rule Organization

HTML_CodeSniffer organizes rules into "sniffs" grouped by standard:

- **WCAG2A**: All Level A technique sniffs
- **WCAG2AA**: All Level AA technique sniffs
- **WCAG2AAA**: All Level AAA technique sniffs
- **Section508**: U.S. Section 508 compliance

Each WCAG success criterion has multiple sniffs mapped to specific WCAG techniques (H1, H2, H77, etc.).

### Unique Capabilities vs axe-core

1. **Advisory notices**: Reports both errors AND "advisory" notices for items needing manual review — many more fine-grained warnings
2. **WCAG technique-level mapping**: Maps directly to individual WCAG techniques (e.g., H77, H78) rather than success criteria
3. **Ambiguous link text detection**: Checks for common ambiguous phrases like "click here", "more", "read more" (via WCAG Technique checks for 2.4.4 and 2.4.9)
4. **Granular form labeling**: More detailed checks on label positioning and association

### Playwright Integration

HTML_CodeSniffer can be injected into a Playwright page context:

```typescript
import * as fs from 'fs';
import * as path from 'path';

const htmlcsSource = fs.readFileSync(
  path.resolve('node_modules', 'html_codesniffer', 'build', 'HTMLCS.js'),
  'utf-8'
);

async function runHtmlCodeSniffer(page: Page, standard: string = 'WCAG2AA') {
  // Inject HTML_CodeSniffer
  await page.evaluate(htmlcsSource);
  
  // Run the scan and collect messages
  const messages = await page.evaluate((std) => {
    return new Promise((resolve) => {
      const msgs: Array<{type: number; code: string; msg: string; element: string}> = [];
      window.HTMLCS.process(std, document, () => {
        const messages = window.HTMLCS.getMessages();
        resolve(messages.map(m => ({
          type: m.type,     // 1=Error, 2=Warning, 3=Notice
          code: m.code,     // WCAG technique code
          msg: m.msg,       // Human-readable message
          element: m.element?.outerHTML?.substring(0, 200) || ''
        })));
      });
    });
  }, standard);
  
  return messages;
}
```

### Limitations

1. **Stale**: Not updated in 6 years — does not cover WCAG 2.2 success criteria
2. **No WCAG 2.2 rules**: Missing 2.4.11 (Focus Not Obscured), 2.5.7 (Dragging), 2.5.8 (Target Size), 3.2.6 (Consistent Help), 3.3.7 (Redundant Entry), 3.3.8 (Accessible Authentication)
3. **Build required**: npm package includes source but may need build step
4. **No iframe support**: Runs only in the DOM context where it's injected
5. **Noisy**: Produces many advisory notices that may not be actionable

### Recommendation on HTML_CodeSniffer

**Low priority complement**. While it has high download counts (driven by Pa11y usage), it's unmaintained and doesn't add enough unique value beyond what IBM Equal Access provides. The ambiguous link text detection is its main unique value, but this is better implemented as a custom Playwright check.

---

## 4. Google Lighthouse Accessibility

### How It Works

Lighthouse accessibility audits primarily use axe-core under the hood, plus a few additional checks:
- Tab index usage
- Tap target sizing
- Font size legibility
- Manual check prompts

### Recommendation

**Skip** — provides minimal value beyond axe-core since it uses axe-core internally. Adding it would add complexity for near-zero incremental rule coverage.

---

## 5. Custom Playwright Checks — Patterns

For the 4-5 commercial tool categories that neither axe-core nor IBM Equal Access covers, we can implement custom checks using Playwright's DOM access.

### Pattern: Custom Check Framework

```typescript
interface CustomCheckResult {
  ruleId: string;
  description: string;
  wcagCriteria: string;
  severity: 'critical' | 'serious' | 'moderate' | 'minor';
  elements: Array<{
    selector: string;
    html: string;
    message: string;
  }>;
}

async function runCustomChecks(page: Page): Promise<CustomCheckResult[]> {
  const results: CustomCheckResult[] = [];
  results.push(...await checkAmbiguousLinkText(page));
  results.push(...await checkEmphasisRole(page));
  results.push(...await checkStrongRole(page));
  results.push(...await checkDiscountedPriceAccessibility(page));
  results.push(...await checkAriaCurrentPage(page));
  results.push(...await checkStickyOverlap(page));
  results.push(...await checkEmptyLists(page));
  return results;
}
```

### Check: Ambiguous Link Text (Commercial #5)

```typescript
async function checkAmbiguousLinkText(page: Page): Promise<CustomCheckResult[]> {
  const ambiguousPatterns = [
    /^click here$/i, /^here$/i, /^more$/i, /^read more$/i,
    /^learn more$/i, /^continue$/i, /^details$/i, /^link$/i,
    /^go$/i, /^more info$/i, /^more information$/i, /^find out more$/i
  ];
  
  return page.evaluate((patterns) => {
    const links = document.querySelectorAll('a');
    const issues = [];
    for (const link of links) {
      const text = (link.textContent || '').trim();
      if (patterns.some(p => new RegExp(p).test(text))) {
        issues.push({
          selector: /* CSS selector */,
          html: link.outerHTML.substring(0, 200),
          message: `Link text "${text}" is ambiguous and does not describe the link destination`
        });
      }
    }
    return issues;
  }, ambiguousPatterns.map(p => p.source));
}
```

### Check: Emphasis/Strong Role (Commercial #2, #3)

```typescript
async function checkEmphasisStrongRole(page: Page): Promise<CustomCheckResult[]> {
  return page.evaluate(() => {
    const issues = [];
    // Check <em> elements lack role="emphasis" (ARIA 1.3 / best practice)
    document.querySelectorAll('em').forEach(el => {
      if (!el.getAttribute('role')) {
        issues.push({ element: el.outerHTML, type: 'emphasis' });
      }
    });
    // Check <strong> elements lack role="strong"
    document.querySelectorAll('strong').forEach(el => {
      if (!el.getAttribute('role')) {
        issues.push({ element: el.outerHTML, type: 'strong' });
      }
    });
    return issues;
  });
}
```

**Note**: `role="emphasis"` and `role="strong"` were added in WAI-ARIA 1.3. Most screen readers do NOT actually use these roles yet. This is a best-practice/forward-looking check, not a WCAG requirement. Commercial tools flag this for completeness, but it's low-priority.

### Check: aria-current="page" (Commercial #10)

```typescript
async function checkAriaCurrentPage(page: Page): Promise<CustomCheckResult[]> {
  return page.evaluate(() => {
    const navLinks = document.querySelectorAll('nav a, [role="navigation"] a');
    // Check if any navigation link has aria-current="page"
    const hasAriaCurrent = Array.from(navLinks)
      .some(link => link.getAttribute('aria-current') === 'page');
    
    if (navLinks.length > 0 && !hasAriaCurrent) {
      return [{ message: 'Navigation does not use aria-current="page" to indicate current page' }];
    }
    return [];
  });
}
```

### Check: Sticky/Fixed Overlap (Commercial #1)

```typescript
async function checkStickyOverlap(page: Page): Promise<CustomCheckResult[]> {
  return page.evaluate(() => {
    const stickyElements = [];
    const allElements = document.querySelectorAll('*');
    
    for (const el of allElements) {
      const style = getComputedStyle(el);
      if (style.position === 'fixed' || style.position === 'sticky') {
        const rect = el.getBoundingClientRect();
        if (rect.height > 0 && rect.width > 0) {
          stickyElements.push({ el, rect, position: style.position });
        }
      }
    }
    
    // Check if interactive elements could be obscured
    const interactive = document.querySelectorAll(
      'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const issues = [];
    for (const target of interactive) {
      const targetRect = target.getBoundingClientRect();
      for (const sticky of stickyElements) {
        if (rectsOverlap(targetRect, sticky.rect) && !sticky.el.contains(target)) {
          issues.push({
            html: target.outerHTML.substring(0, 200),
            message: `Interactive element may be obscured by ${sticky.position} positioned element`
          });
        }
      }
    }
    return issues;
  });
}
```

### Check: Discounted Price Accessibility (Commercial #4)

```typescript
async function checkDiscountedPrice(page: Page): Promise<CustomCheckResult[]> {
  return page.evaluate(() => {
    // Look for strikethrough text that might indicate original price
    const strikethroughElements = document.querySelectorAll('del, s, [style*="line-through"]');
    const issues = [];
    
    for (const el of strikethroughElements) {
      const text = el.textContent || '';
      // Check if it contains price-like content
      if (/\$|€|£|¥|\d+\.\d{2}/.test(text)) {
        // Check if there's screen reader context
        const hasAriaLabel = el.getAttribute('aria-label');
        const hasSrOnly = el.querySelector('.sr-only, .visually-hidden');
        if (!hasAriaLabel && !hasSrOnly) {
          issues.push({
            html: el.outerHTML.substring(0, 200),
            message: 'Strikethrough price lacks screen reader context (aria-label or visually hidden text)'
          });
        }
      }
    }
    return issues;
  });
}
```

---

## 6. Multi-Engine Architecture

### Recommended Architecture: Dual-Engine + Custom Checks

```
┌─────────────────────────────────────────────┐
│              Multi-Engine Scanner             │
├─────────────────────────────────────────────┤
│                                              │
│  ┌──────────────┐  ┌───────────────────────┐ │
│  │  axe-core     │  │  IBM Equal Access     │ │
│  │  (104 rules)  │  │  (163+ rules)        │ │
│  │  WCAG + BP    │  │  IBM_Accessibility    │ │
│  └──────┬───────┘  └──────────┬────────────┘ │
│         │                      │              │
│  ┌──────┴──────────────────────┴────────────┐ │
│  │         Custom Playwright Checks          │ │
│  │    (ambiguous links, emphasis/strong,     │ │
│  │     sticky overlap, aria-current,         │ │
│  │     discounted prices)                    │ │
│  └──────────────────┬───────────────────────┘ │
│                     │                         │
│  ┌──────────────────┴───────────────────────┐ │
│  │         Result Normalizer/Merger          │ │
│  │  - Deduplicate by element + rule type     │ │
│  │  - Map to unified severity levels         │ │
│  │  - Element-level counting                 │ │
│  └──────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

### Implementation Approach

```typescript
interface UnifiedResult {
  engine: 'axe-core' | 'ibm-equal-access' | 'custom';
  ruleId: string;
  severity: 'critical' | 'serious' | 'moderate' | 'minor';
  wcagCriteria: string[];
  elementSelector: string;
  elementHtml: string;
  message: string;
  helpUrl?: string;
}

async function multiEngineScan(page: Page): Promise<UnifiedResult[]> {
  // Run engines in parallel where possible
  const [axeResults, ibmResults, customResults] = await Promise.all([
    runAxeCore(page),
    runIbmEqualAccess(page),
    runCustomChecks(page)
  ]);
  
  // Normalize each engine's results to UnifiedResult format
  const normalized = [
    ...normalizeAxeResults(axeResults),
    ...normalizeIbmResults(ibmResults),
    ...normalizeCustomResults(customResults)
  ];
  
  // Deduplicate: same element + same WCAG criterion = keep highest severity
  return deduplicateResults(normalized);
}
```

### Deduplication Strategy

```typescript
function deduplicateResults(results: UnifiedResult[]): UnifiedResult[] {
  const seen = new Map<string, UnifiedResult>();
  
  for (const result of results) {
    // Create key from element selector + WCAG criteria
    const key = `${result.elementSelector}::${result.wcagCriteria.sort().join(',')}`;
    
    const existing = seen.get(key);
    if (!existing || severityRank(result.severity) > severityRank(existing.severity)) {
      seen.set(key, result);
    }
  }
  
  return Array.from(seen.values());
}
```

### Performance Impact

- **axe-core scan**: ~500ms-2s per page (already running)
- **IBM Equal Access scan**: ~1-3s per page (similar DOM traversal)
- **Custom Playwright checks**: ~100-500ms per page (targeted queries)
- **Total parallel**: ~2-4s per page (engines run in parallel)
- **Overhead vs single-engine**: ~1-2s additional per page (acceptable)

---

## 7. Element-Level Counting

### The Problem

axe-core reports **1 violation with N nodes**:
```json
{
  "violations": [{
    "id": "aria-hidden-focus",
    "nodes": [/* 67 elements */]
  }]
}
```

Commercial tools report **67 critical issues** for the same finding.

### The Solution

axe-core already provides element-level data in `violation.nodes[]`. We simply need to count differently:

```typescript
function getElementLevelCounts(axeResults: AxeResults) {
  let totalViolationElements = 0;
  
  for (const violation of axeResults.violations) {
    totalViolationElements += violation.nodes.length;
  }
  
  return {
    ruleViolationCount: axeResults.violations.length,     // e.g., 5 rules
    elementViolationCount: totalViolationElements,         // e.g., 107 elements
  };
}
```

IBM Equal Access already reports at element-level natively — each `result` in the `results[]` array is one element finding, so `results.filter(r => r.level === 'violation').length` gives the element count directly.

### Reporting Both Levels

```typescript
interface ScanSummary {
  // Rule-level (how many distinct accessibility issues)
  uniqueRules: number;
  
  // Element-level (how many element instances, matches commercial tools)
  totalViolationElements: number;
  totalWarningElements: number;
  totalNoticeElements: number;
  
  // By severity
  criticalElements: number;
  seriousElements: number;
  moderateElements: number;
  minorElements: number;
}
```

---

## 8. Recommended Approach

### Phase 1: IBM Equal Access Integration (Highest ROI)

**Why**: Adds ~100 unique rules that axe-core doesn't have. Covers 8 of the 16 commercial tool categories we're missing. Native Playwright support. Well-maintained.

**Implementation**:
1. `npm install --save-dev accessibility-checker`
2. Add IBM scan alongside axe-core in `engine.ts`
3. Normalize IBM results into our existing result format
4. Run both engines on each page (including iframe frames)

**Estimated effort**: 1-2 days
**Coverage gain**: ~50% of the gap closed

### Phase 2: Custom Playwright Checks (Remaining Gaps)

**Why**: 4-5 commercial tool categories that no engine covers. Targeted, lightweight.

**Checks to implement**:
1. Ambiguous link text detection (pattern matching)
2. `aria-current="page"` in navigation
3. Emphasis/Strong role best-practice
4. Discounted price accessibility
5. Sticky/fixed element overlap with focused elements

**Estimated effort**: 1-2 days
**Coverage gain**: ~30% of remaining gap closed

### Phase 3: Element-Level Reporting

**Why**: Match commercial tool granularity in reports.

**Implementation**:
1. Count `violation.nodes.length` for axe-core results
2. Count `results.filter(r => r.level === 'violation').length` for IBM results
3. Update scoring/reporting to show element-level counts
4. Add "X elements affected" to each violation category

**Estimated effort**: 0.5 days

### What NOT to Do

- **Skip HTML_CodeSniffer**: Unmaintained, 6 years stale, no WCAG 2.2
- **Skip Google Lighthouse**: Uses axe-core internally, minimal unique value
- **Don't build a custom rule engine**: Leverage IBM's 163+ rules instead
- **Don't try to match commercial tools 100%**: Some checks (like "emphasis role") are extremely minor and may not be worth the complexity

---

## 9. Integration Architecture for engine.ts

### Proposed Code Structure

```
src/lib/scanner/
  engine.ts          — orchestrator, multi-engine scan
  engines/
    axe-engine.ts    — axe-core scanning (current code extracted)
    ibm-engine.ts    — IBM Equal Access scanning
    custom-checks.ts — custom Playwright DOM checks
  normalizer.ts      — result normalization and deduplication
```

### Key Integration Point

The critical integration point is the `scanPage()` function in `engine.ts`. It currently only runs axe-core. The enhanced version would:

```typescript
export async function scanPage(page: Page): Promise<UnifiedScanResults> {
  const [axeResults, ibmResults, customResults] = await Promise.all([
    runAxeEngine(page),
    runIbmEngine(page),
    runCustomChecks(page),
  ]);
  
  return mergeAndDeduplicate(axeResults, ibmResults, customResults);
}
```

---

## 10. Existing Dependencies Check

### Current package.json

- `@axe-core/playwright` is the only accessibility engine dependency
- No IBM Equal Access packages present
- No HTML_CodeSniffer packages present

### New Dependencies Needed

- `accessibility-checker` (5.92 MB unpacked) — only new dependency needed
- Zero additional deps for custom Playwright checks (uses existing `playwright`)

---

## Discovered Research Topics

1. **IBM Equal Access iframe support depth**: Need to test whether `aChecker.getCompliance()` automatically scans iframe content or requires per-frame invocation
2. **Performance benchmarking**: Need to measure actual scan time impact with dual-engine on real pages
3. **Result deduplication accuracy**: When both engines flag the same element for the same issue, need to verify deduplication doesn't lose information
4. **IBM telemetry opt-out**: IBM accessibility-checker includes telemetry by default — may need to opt out for CI/CD

## Clarifying Questions

1. **Priority on emphasis/strong role checks**: These are WAI-ARIA 1.3 draft features. Most screen readers don't use `role="emphasis"` or `role="strong"` yet. Should we still flag these for completeness, or defer?
2. **IBM telemetry acceptable?**: The `accessibility-checker` package includes IBM telemetry collection by default. Is this acceptable for the project, or should we configure opt-out?
3. **Report format preference**: Should element-level counts be the **primary** display (matching commercial tools) or shown alongside rule-level counts (more nuanced)?
