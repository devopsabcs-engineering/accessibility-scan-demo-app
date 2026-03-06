# Open-Source Accessibility Testing Engines for WCAG 2.2

## Research Status: Complete

## Research Topics & Questions

1. **axe-core** - Architecture, WCAG rules, Node.js integration, output format, WCAG 2.2 support
2. **pa11y** - Comparison with axe-core, WCAG 2.2 support, library usage, output format
3. **Lighthouse Accessibility Audit** - Programmatic usage, axe-core integration, rule coverage
4. **HTML_CodeSniffer** - WCAG 2.2 support, programmatic usage
5. **IBM Equal Access** - Open-source alternative engine, WCAG 2.2 support
6. **QualWeb** - ACT rules based engine
7. **Other W3C WAI tools** - Notable open-source engines from the W3C list
8. **Comparison Matrix** - Rule coverage, maintenance, integration ease, output detail
9. **Reference Implementations** - Existing open-source scanner web apps

---

## 1. axe-core (Deque Systems)

### Overview

- **GitHub**: <https://github.com/dequelabs/axe-core>
- **npm**: `axe-core` (core engine), plus `@axe-core/puppeteer`, `@axe-core/playwright`, `@axe-core/cli`, `@axe-core/react`, `@axe-core/webdriverio`, `@axe-core/webdriverjs`, `@axe-core/reporter-earl`
- **License**: MPL-2.0
- **Stars**: 6.9k | **Used by**: 13M+ | **Contributors**: 244
- **Latest Release**: v4.11.1 (January 2026)
- **Actively Maintained**: Yes (commits within days, new minor releases every 3-5 months)

### What It Is

axe-core is the industry-standard open-source accessibility testing engine for websites and HTML-based user interfaces. It is fast, secure, lightweight, and designed to integrate with any test environment. It can automate accessibility testing alongside regular functional testing.

### WCAG 2.2 Coverage

axe-core has rules for WCAG 2.0 (A, AA, AAA), WCAG 2.1 (A, AA), and **WCAG 2.2 (AA)**. Tags used to filter rules:

| Tag | Description |
|---|---|
| `wcag2a` | WCAG 2.0 Level A |
| `wcag2aa` | WCAG 2.0 Level AA |
| `wcag2aaa` | WCAG 2.0 Level AAA |
| `wcag21a` | WCAG 2.1 Level A |
| `wcag21aa` | WCAG 2.1 Level AA |
| `wcag22aa` | WCAG 2.2 Level AA |
| `best-practice` | Common accessibility best practices |
| `ACT` | W3C Accessibility Conformance Testing rules |

axe-core can automatically find on average **57% of WCAG issues**. Items it cannot determine are returned as "incomplete" for manual review.

### How It Works

1. Load `axe.min.js` into the page under test (or inject via Puppeteer/Playwright)
2. Call `axe.run()` with optional context (CSS selector or element) and options (rule tags, specific rules)
3. Receive JSON results with `violations`, `passes`, `incomplete`, and `inapplicable` arrays
4. Zero false positives policy (bugs notwithstanding)

### Node.js Integration - Programmatic API

#### Direct usage (browser-injected)

```javascript
const axe = require('axe-core');
// axe.run() is called within a browser context
axe.run(document, {
  runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
}).then(results => {
  console.log(results.violations);
});
```

#### With Puppeteer (@axe-core/puppeteer)

```javascript
const { AxePuppeteer } = require('@axe-core/puppeteer');
const puppeteer = require('puppeteer');

const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.goto('https://example.com');

const results = await new AxePuppeteer(page).analyze();
console.log(results.violations);
await browser.close();
```

#### With Playwright (@axe-core/playwright)

```javascript
const { AxeBuilder } = require('@axe-core/playwright');
const { chromium } = require('playwright');

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('https://example.com');

const results = await new AxeBuilder({ page }).analyze();
console.log(results.violations);
await browser.close();
```

### Output Format (JSON)

```json
{
  "url": "https://example.com",
  "timestamp": "2026-03-06T...",
  "testEngine": { "name": "axe-core", "version": "4.11.1" },
  "testEnvironment": { "userAgent": "...", "windowWidth": 1280, "windowHeight": 1024 },
  "violations": [
    {
      "id": "color-contrast",
      "impact": "serious",
      "tags": ["cat.color", "wcag2aa", "wcag143"],
      "description": "Ensures the contrast...",
      "help": "Elements must have sufficient color contrast",
      "helpUrl": "https://dequeuniversity.com/rules/axe/4.11/color-contrast",
      "nodes": [
        {
          "html": "<p style='color: #aaa'>...",
          "target": ["p.low-contrast"],
          "impact": "serious",
          "any": [],
          "all": [],
          "none": []
        }
      ]
    }
  ],
  "passes": ["..."],
  "incomplete": ["..."],
  "inapplicable": ["..."]
}
```

Key output features:

- **`violations`**: Failed tests with `impact` severity (minor, moderate, serious, critical)
- **`passes`**: Elements that passed
- **`incomplete`**: Needs manual review
- **`inapplicable`**: Rules that didn't apply (no matching DOM elements)
- Each violation has `helpUrl` linking to detailed remediation guidance
- Each node has `target` (CSS selector), `html` snippet, and detailed check results

### Key Strengths

- Industry standard, used by 13M+ projects
- Zero false-positive policy
- WCAG 2.2 AA support
- Official integrations with Puppeteer, Playwright, Selenium, WebDriverIO
- Rich, structured JSON output ideal for report generation
- Configurable: can filter by tags, enable/disable rules, scope to elements
- Supports iframes and Shadow DOM
- 16+ locale translations
- ACT (Accessibility Conformance Testing) rule support

---

## 2. pa11y

### Overview

- **GitHub**: <https://github.com/pa11y/pa11y>
- **npm**: `pa11y`
- **License**: LGPL-3.0
- **Stars**: 4.4k | **Used by**: 8.4k | **Contributors**: 58
- **Latest Release**: v9.1.1 (actively maintained)
- **Node.js**: Requires Node 20, 22, or 24

### What It Is

pa11y is an automated accessibility testing tool that wraps around test runners. It runs accessibility tests on pages via the command line or Node.js with a JavaScript API. It uses **Puppeteer** under the hood for browser control.

### WCAG 2.2 Support

pa11y itself does **NOT directly implement WCAG rules**. Instead, it delegates to **runners**:

- **`htmlcs`** (default): HTML_CodeSniffer - covers WCAG 2.1 (not 2.2)
- **`axe`**: axe-core - covers WCAG 2.2

To get WCAG 2.2 coverage with pa11y, you should use the `axe` runner.

### How It Compares to axe-core

| Feature | pa11y | axe-core |
|---|---|---|
| Architecture | Wrapper/orchestrator (uses Puppeteer + runners) | Pure testing engine |
| Runners | htmlcs (default) + axe | Self-contained |
| CLI | Built-in with reporters (JSON, CSV, HTML, TSV) | Via `@axe-core/cli` |
| Browser Actions | Built-in actions (click, fill forms, wait) | Requires manual setup |
| Programmatic API | `pa11y(url, options)` returns Promise | `axe.run(context, options)` |
| WCAG 2.2 | Only via axe runner | Native |
| Output Reporters | cli, csv, html, json, tsv, markdown | JSON (custom via reporters) |
| Standards Config | `WCAG2A`, `WCAG2AA`, `WCAG2AAA` | Tag-based filtering |

### Node.js Integration

```javascript
const pa11y = require('pa11y');

// Basic usage
const results = await pa11y('https://example.com');

// With axe runner for WCAG 2.2
const results = await pa11y('https://example.com', {
  runners: ['axe'],
  standard: 'WCAG2AA'
});

// With actions (login before testing)
const results = await pa11y('https://example.com/login', {
  actions: [
    'set field #username to testuser',
    'set field #password to pass123',
    'click element #submit',
    'wait for path to be /dashboard'
  ]
});
```

### Output Format (JSON)

```json
{
  "pageUrl": "https://example.com",
  "documentTitle": "Example Page",
  "issues": [
    {
      "code": "WCAG2AA.Principle1.Guideline1_1.1_1_1.H30.2",
      "context": "<a href=\"...\"><img src=\"example.jpg\" alt=\"\"/></a>",
      "message": "Img element is the only content of the link...",
      "selector": "html > body > p:nth-child(1) > a",
      "type": "error",
      "typeCode": 1
    }
  ]
}
```

### Key Strengths

- Easy to use CLI with multiple output formats (JSON, CSV, HTML, TSV, markdown)
- Built-in browser actions for testing behind logins or dynamic content
- Can use both HTML_CodeSniffer AND axe-core simultaneously
- Good for CI/CD pipelines with exit codes and thresholds
- Custom reporters are supported
- Active maintenance (v9.1.1 recently released)

### Limitations

- Depends on Puppeteer (heavier dependency)
- WCAG 2.2 only available through axe runner
- Default htmlcs runner is limited to WCAG 2.1
- Less granular output than direct axe-core usage

---

## 3. Google Lighthouse Accessibility Audit

### Overview

- **npm**: `lighthouse`
- **License**: Apache-2.0
- **Engine**: Uses **axe-core** for accessibility rules

### How It Works

Lighthouse's accessibility audit is **powered entirely by axe-core**. It runs a subset of axe-core rules and provides a weighted accessibility score (0-100). The score is a weighted average based on axe user impact assessments.

### Programmatic Usage

```javascript
const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');

const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
const options = {
  logLevel: 'info',
  output: 'json',
  onlyCategories: ['accessibility'],
  port: chrome.port
};

const runnerResult = await lighthouse('https://example.com', options);
const accessibilityScore = runnerResult.lhr.categories.accessibility.score * 100;
const accessibilityAudits = runnerResult.lhr.audits;

await chrome.kill();
```

### Key Characteristics

- **Rules**: Subset of axe-core rules, with weighted scoring
- **Scoring**: Pass/fail per audit, weighted by impact (3, 7, or 10 points)
- **Format**: Lighthouse Report (JSON/HTML) with accessibility category
- **WCAG 2.2**: Inherits axe-core's WCAG 2.2 coverage
- **Limitation**: Runs only a subset of axe-core rules (fewer than direct axe-core usage)
- **Best for**: Quick accessibility scoring alongside performance/SEO audits
- **Not ideal for**: Comprehensive WCAG 2.2 testing (use axe-core directly)

### Why Not Use Lighthouse Directly for a Scanner

- Lighthouse is optimized for page-level auditing with scoring
- It runs fewer accessibility rules than direct axe-core usage
- It adds overhead for non-accessibility audits (performance, SEO, etc.)
- For a dedicated accessibility scanner, direct axe-core integration is recommended

---

## 4. HTML_CodeSniffer (Squiz Labs)

### Overview

- **GitHub**: <https://github.com/squizlabs/HTML_CodeSniffer>
- **npm**: `html_codesniffer`
- **License**: BSD-3-Clause
- **Stars**: 1.1k | **Used by**: 7.5k | **Contributors**: 33
- **Latest Release**: v2.5.1 (January 2021)
- **Actively Maintained**: **NO** - last commit 4 years ago

### What It Is

HTML_CodeSniffer is a client-side JavaScript application that checks HTML documents against accessibility standards including WCAG 2.0 and Section 508. It ships with standards covering all three conformance levels of WCAG.

### WCAG Coverage

- **WCAG 2.0**: Full coverage (A, AA, AAA)
- **WCAG 2.1**: Partial (the "Standards included" section mentions WCAG 2.1, but coverage is limited)
- **WCAG 2.2**: **NOT SUPPORTED**

### Programmatic Usage

```javascript
// With Puppeteer
const puppeteer = require('puppeteer-core');
const page = await browser.newPage();
await page.goto(url);
await page.addScriptTag({ path: 'build/HTMLCS.js' });
await page.evaluate(() => { HTMLCS_RUNNER.run('WCAG2AA'); });

// With Node.js + JSDOM
const { JSDOM } = require('jsdom');
const fs = require('fs');
const HTMLCS = fs.readFileSync('./build/HTMLCS.js', 'utf-8');
const dom = new JSDOM('<img src="test.png" />', { runScripts: "dangerously" });
dom.window.eval(HTMLCS);
dom.window.HTMLCS_RUNNER.run('WCAG2AA');
```

### Key Limitations

- **Not actively maintained** - last release in 2021, last commit 4 years ago
- **No WCAG 2.2 support**
- Used as the default runner in pa11y, but pa11y also supports axe as an alternative
- Output is console-based; no structured JSON API like axe-core
- Still used by pa11y (htmlcs runner) for its broader WCAG 2.0/2.1 "notices" and "warnings"

---

## 5. IBM Equal Access (accessibility-checker)

### Overview

- **GitHub**: <https://github.com/IBMa/equal-access>
- **npm**: `accessibility-checker`
- **License**: Apache-2.0
- **Stars**: 737 | **Contributors**: 34
- **Latest Release**: v4.0.13 (March 4, 2026)
- **Actively Maintained**: **YES** - very active with recent commits

### What It Is

IBM Equal Access is a comprehensive accessibility testing toolkit with its own **independent rule engine** (not based on axe-core). It provides:

- Browser extensions (Chrome, Firefox, Edge)
- Node.js testing package (`accessibility-checker`)
- Cypress integration (`cypress-accessibility-checker`)
- Karma integration (`karma-accessibility-checker`)

### WCAG 2.2 Coverage

Supports **WCAG 2.0, 2.1, and 2.2** according to the W3C WAI tools list. Topic tags include `wcag20`, `wcag21`, `wcag22`.

### Programmatic Usage

```javascript
const { getCompliance } = require('accessibility-checker');

// With Puppeteer
const puppeteer = require('puppeteer');
const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.goto('https://example.com');

const result = await getCompliance(page, 'my-scan-label');
// result.report contains the accessibility report
```

Works with **Selenium**, **Puppeteer**, **Playwright**, and local file scanning.

### Key Strengths

- Independent rule engine (different perspective from axe-core)
- WCAG 2.2 support
- Very actively maintained (release days ago)
- Can validate against baseline files
- Browser extensions with visualization
- Supports scanning local HTML files

### Limitations

- Smaller community than axe-core (737 stars vs 6.9k)
- Less widely adopted in the ecosystem
- Documentation is less extensive than axe-core

---

## 6. QualWeb

### Overview

- **GitHub**: <https://github.com/qualweb/qualweb>
- **npm**: `@qualweb/core`
- **License**: ISC
- **Stars**: 19 | **Contributors**: 11
- **Maintained**: Active (last commit last month)

### What It Is

QualWeb is an automated accessibility checker that assesses webpage conformance to **ACT-Rules** and **WCAG 2.1 HTML and CSS techniques**. It is the engine behind the **Portuguese Accessibility Observatory**.

### WCAG Coverage

- WCAG 2.1 (via ACT rules and WCAG techniques)
- No explicit WCAG 2.2 listing on W3C tools page

### Key Characteristics

- Focuses on W3C ACT (Accessibility Conformance Testing) rules
- Available as CLI, Node.js API, browser extension, and web service
- TypeScript monorepo
- Smaller community but academically backed

---

## 7. Other Notable Open-Source Tools (from W3C WAI List)

### Sa11y (Toronto Metropolitan University)

- **GitHub**: Available as browser plugin, bookmarklet, CMS plugin
- **WCAG**: 2.1
- **Focus**: Content author-facing QA tool with visual highlighting
- **License**: Open source

### WAVE (WebAIM)

- **URL**: <https://wave.webaim.org/>
- **WCAG**: 2.2
- **Note**: Free browser extensions and online tool, but the API requires a subscription. Not fully open-source engine.

### be-a11y (BeLenka)

- **GitHub**: <https://github.com/be-lenka/be-a11y>
- **Type**: Node.js CLI tool
- **WCAG**: Not specified
- **Focus**: Local directory scanning and remote URL analysis

### Hercules (TestZeus)

- **GitHub**: <https://github.com/test-zeus-ai/testzeus-hercules/>
- **WCAG**: 2.2, 2.1, 2.0
- **Note**: AI-powered, uses axe-core for scanning, open source

---

## 8. Reference Implementations

### Microsoft Accessibility Insights Service

- **GitHub**: <https://github.com/microsoft/accessibility-insights-service>
- **Stars**: 76 | **Language**: TypeScript
- **Description**: Cloud-based accessibility scanning service using axe-core
- **Architecture**: Azure-deployed service that scans websites for accessibility issues periodically
- **Tech stack**: TypeScript, Puppeteer, axe-core, Azure Functions, Docker
- **Relevance**: Enterprise-grade reference for building an accessibility scanning service

### pa11y-dashboard

- **GitHub**: <https://github.com/pa11y/pa11y-dashboard>
- **Description**: Web dashboard for pa11y results, allowing you to monitor accessibility over time
- **Tech stack**: Node.js, MongoDB, pa11y
- **Relevance**: Direct reference for building a web-based accessibility scanner UI

### pa11y-webservice

- **GitHub**: <https://github.com/pa11y/pa11y-webservice>
- **Description**: REST API web service for pa11y results
- **Relevance**: Backend reference for API-driven accessibility scanning

---

## 9. Comparison Matrix

| Feature | axe-core | pa11y | Lighthouse | HTML_CodeSniffer | IBM Equal Access | QualWeb |
|---|---|---|---|---|---|---|
| **WCAG 2.2** | Yes (AA) | Via axe runner | Via axe-core | No | Yes | No (2.1) |
| **WCAG 2.1** | Yes (A, AA) | Yes | Via axe-core | Partial | Yes | Yes |
| **WCAG 2.0** | Yes (A, AA, AAA) | Yes | Via axe-core | Yes (A, AA, AAA) | Yes | Yes |
| **Open Source** | Yes (MPL-2.0) | Yes (LGPL-3.0) | Yes (Apache-2.0) | Yes (BSD-3-Clause) | Yes (Apache-2.0) | Yes (ISC) |
| **npm Package** | `axe-core` | `pa11y` | `lighthouse` | `html_codesniffer` | `accessibility-checker` | `@qualweb/core` |
| **Stars** | 6.9k | 4.4k | (Part of Chrome) | 1.1k | 737 | 19 |
| **Active** | Yes | Yes | Yes | **No (2021)** | Yes | Yes |
| **Node.js API** | Yes | Yes | Yes | Limited | Yes | Yes |
| **Puppeteer** | `@axe-core/puppeteer` | Built-in | Chrome launcher | Manual injection | Built-in | Built-in |
| **Playwright** | `@axe-core/playwright` | No | No | No | Built-in | No |
| **JSON Output** | Rich structured | Simple | Lighthouse report | Console-based | Structured | Structured |
| **CLI** | `@axe-core/cli` | Built-in | lighthouse CLI | Via headless browser | No | Yes |
| **Reporters** | JSON | JSON, CSV, HTML, TSV, markdown | JSON, HTML | None | JSON, HTML | JSON |
| **Impact Levels** | minor, moderate, serious, critical | error, warning, notice | Weighted score | error, warning, notice | Violation, NeedsReview, Recommendation | Passed, Failed, Warning |
| **Rule Count** | ~100+ | Depends on runner | Subset of axe | ~200+ (but dated) | ~200+ | ~100+ ACT rules |
| **False Positives** | Zero policy | Depends on runner | Low (axe-based) | Higher | Low | Low |
| **Browser Actions** | Manual | Built-in (click, fill, wait) | No | No | No | No |
| **iframes** | Yes (infinite depth) | Via Puppeteer | Yes | Limited | Yes | Yes |
| **Shadow DOM** | Yes | No | Via axe-core | No | Unknown | No |
| **Localization** | 16+ languages | Limited | Yes | 5 languages | English | 5 languages |

---

## 10. Recommendation for Building a WCAG 2.2 Scanner Web App

### Primary Engine: axe-core

**axe-core is the recommended primary engine** for the following reasons:

1. **Best WCAG 2.2 coverage** among open-source engines
2. **Most actively maintained** (13M+ dependents, 244 contributors, releases every 3-5 months)
3. **Richest JSON output** - structured violations with impact severity, CSS selectors, HTML snippets, help URLs, and remediation guidance
4. **Official Puppeteer/Playwright integrations** via `@axe-core/puppeteer` and `@axe-core/playwright`
5. **Zero false-positive policy** - builds trust in results
6. **Industry standard** - used by Google Lighthouse, pa11y, Microsoft Accessibility Insights, and many others
7. **Configurable** - filter by WCAG version, conformance level, specific rules
8. **Best documentation** with comprehensive API reference

### Recommended Integration Pattern

```javascript
// Recommended: axe-core with Puppeteer for a web app scanner
const { AxePuppeteer } = require('@axe-core/puppeteer');
const puppeteer = require('puppeteer');

async function scanUrl(url) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2' });

  const results = await new AxePuppeteer(page)
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .analyze();

  await browser.close();
  return results;
}
```

### Optional Secondary Engine: IBM Equal Access

For more comprehensive coverage, consider running **IBM Equal Access** as a secondary engine. Since it has an independent rule engine, it can catch issues that axe-core might miss, providing complementary results.

### Packages to Install

```bash
npm install axe-core @axe-core/puppeteer puppeteer
# Optional for secondary scanning:
npm install accessibility-checker
```

---

## References

| Source | URL |
|---|---|
| axe-core GitHub | <https://github.com/dequelabs/axe-core> |
| axe-core npm packages | <https://github.com/dequelabs/axe-core-npm> |
| axe-core API docs | <https://github.com/dequelabs/axe-core/blob/develop/doc/API.md> |
| axe-core rule descriptions | <https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md> |
| pa11y GitHub | <https://github.com/pa11y/pa11y> |
| HTML_CodeSniffer GitHub | <https://github.com/squizlabs/HTML_CodeSniffer> |
| IBM Equal Access GitHub | <https://github.com/IBMa/equal-access> |
| QualWeb GitHub | <https://github.com/qualweb/qualweb> |
| Lighthouse Accessibility Scoring | <https://developer.chrome.com/docs/lighthouse/accessibility/scoring> |
| MS Accessibility Insights Service | <https://github.com/microsoft/accessibility-insights-service> |
| W3C WAI Evaluation Tools List | <https://www.w3.org/WAI/test-evaluate/tools/list/> |

---

## Discovered Topics & Follow-On Research

- [ ] Investigate axe-core rule descriptions in detail (`doc/rule-descriptions.md`) for exact WCAG 2.2 SC mapping
- [ ] Review `@axe-core/puppeteer` README for advanced configuration options
- [ ] Explore pa11y-dashboard and pa11y-webservice as UI/API reference implementations
- [ ] Research AODA (Accessibility for Ontarians with Disabilities Act) specific requirements beyond WCAG
- [ ] Investigate `accessibility-checker` output format for IBM Equal Access integration
- [ ] Review Microsoft Accessibility Insights Service architecture for cloud deployment patterns
- [ ] Explore ACT (Accessibility Conformance Testing) rule coverage across engines

## Clarifying Questions

- None at this time. All provided research topics and questions have been comprehensively addressed.
