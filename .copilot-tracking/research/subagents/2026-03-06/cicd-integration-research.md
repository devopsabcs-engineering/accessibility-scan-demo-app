# CI/CD Pipeline Integration for Accessibility Scanning — Phase 2 Research

## Research Status: Complete

## Table of Contents

- [1. Existing CI/CD Accessibility Tools](#1-existing-cicd-accessibility-tools)
- [2. CI/CD API Design Patterns](#2-cicd-api-design-patterns)
- [3. GitHub Actions Integration](#3-github-actions-integration)
- [4. Azure DevOps Integration](#4-azure-devops-integration)
- [5. CLI Tool Design](#5-cli-tool-design)
- [6. SARIF Format for Accessibility](#6-sarif-format-for-accessibility)
- [7. Threshold Configuration](#7-threshold-configuration)
- [8. Recommendations](#8-recommendations)
- [9. Follow-Up Research](#9-follow-up-research)

---

## 1. Existing CI/CD Accessibility Tools

### Comparison Table

| Tool | Version | Weekly Downloads | License | TypeScript | Maintenance | Engine | CI Focus |
|------|---------|-----------------|---------|------------|-------------|--------|----------|
| `pa11y` | 9.1.1 | 277,051 | LGPL-3.0 | Via @types/pa11y | Active (published 8 days ago) | HTML_CodeSniffer + axe-core | Moderate |
| `pa11y-ci` | 4.1.0 | 120,483 | LGPL-3.0 | No (JS) | Active (published 3 days ago) | Uses pa11y | High |
| `@axe-core/cli` | 4.11.1 | 35,345 | MPL-2.0 | Built-in | Active (published 1 month ago) | axe-core | Moderate |
| `accessibility-insights-action` | v3.10.0 | N/A (ADO ext.) | MIT | Yes (90.6% TS) | Active (3 weeks ago) | axe-core | High |

### Detailed Tool Analysis

#### pa11y-ci (Recommended for Reference)

- **Purpose**: CI-centric accessibility test runner built on pa11y
- **Key Features**:
  - URL list from config file (`.pa11yci` JSON) or sitemap
  - Sitemap support with `--sitemap` flag, find/replace, exclude patterns
  - Threshold-based exit codes via `--threshold <number>` (default: 0)
  - JSON output via `--json` flag or reporter config
  - Concurrency control (`defaults.concurrency`)
  - Custom reporters: `cli`, `json`, or custom npm/local modules
  - Docker support with Puppeteer images
- **Configuration**: `.pa11yci` JSON file with `urls` array and `defaults` object
- **Exit Codes**: 0 = pass, 2 = threshold exceeded (matches pa11y conventions)
- **Standards**: WCAG2A, WCAG2AA (default), WCAG2AAA
- **Runners**: HTML_CodeSniffer (default), axe-core
- **Node.js**: Requires 20, 22, or 24
- **Stars**: 591 | Forks: 74 | Contributors: 26

#### pa11y (Underlying Engine)

- **Version**: 9.1.1 (current major, Node 20/22/24)
- **Exit Codes**: 0 = success, 1 = technical failure, 2 = accessibility errors found
- **Level flag**: `--level` (error/warning/notice/none) controls what triggers exit code 2
- **Threshold**: `--threshold <number>` permits N violations before failing
- **Reporters**: cli, csv, html, json, tsv (built-in), extensible via npm packages
- **Runners**: axe-core or HTML_CodeSniffer
- **Actions**: Pre-test interactions (click, set field, wait, navigate)
- **Key Insight**: Uses Puppeteer internally (not Playwright)

#### @axe-core/cli

- **Purpose**: CLI for axe-core accessibility tests
- **Key Features**:
  - `--exit` (`-q`) flag exits with code 1 on any failure (CI mode)
  - `--stdout` for machine-readable JSON output
  - `--save` / `--dir` for saving JSON results to files
  - `--tags` for WCAG level filtering (e.g., `--tags wcag2a`)
  - `--rules` / `--disable` for specific rule control
  - `--include` / `--exclude` for CSS selector scoping
  - `--timeout` and `--load-delay` for page load handling
  - Multiple browser support via webdrivers (Chrome default headless)
  - Custom axe-core versions via `--axe-source`
- **Versioning**: Follows axe-core major.minor (not SemVer)
- **Browser**: Uses Selenium WebDriver (not Playwright)
- **TypeScript**: Built-in declarations

#### Microsoft Accessibility Insights Action

- **Repository**: `microsoft/accessibility-insights-action`
- **Current Scope**: Azure DevOps extension only (GitHub Action was decommissioned)
- **Key Features**:
  - Single page or crawl mode
  - Static HTML files, local web servers, or remote URLs
  - Uses axe-core engine
  - HTML report output
  - **Currently Microsoft-internal only**
- **Technology**: TypeScript (90.6%), uses Playwright
- **Stars**: 94 | Forks: 44 | Contributors: 39

### Other Notable Tools

| Tool | Description | Status |
|------|-------------|--------|
| `axe-linter` | GitHub App for linting HTML/templates | Separate product by Deque |
| `@microsoft/eslint-formatter-sarif` | ESLint to SARIF converter | Used for GitHub code scanning |
| `lighthouse-ci` | Google Lighthouse CI, includes accessibility | Active, score-based thresholds |

---

## 2. CI/CD API Design Patterns

### Synchronous vs Asynchronous Scan APIs

#### Option A: Synchronous Blocking Endpoint (Recommended for CI)

```
POST /api/ci/scan
Body: { url, options }
Response (after scan completes): { results, score, passed }
```

- **Pros**: Simple to integrate, single HTTP call, works with any CI system
- **Cons**: Long-running HTTP request (30-60s), timeout risks
- **Mitigation**: Set generous timeout (120s), return 504 on failure

#### Option B: Async with Polling (Current Model)

```
POST /api/scan → { scanId } (202)
GET /api/scan/:id/status → SSE progress
GET /api/scan/:id → full results
```

- **Pros**: Non-blocking, progress visibility
- **Cons**: Requires polling loop in CI, more complex client code

#### Option C: Webhook Callback

```
POST /api/scan
Body: { url, callbackUrl }
→ Server POSTs results to callbackUrl when complete
```

- **Pros**: True async, no polling
- **Cons**: Requires callback endpoint, complex for simple CI scripts

### Recommended: CI-Friendly Wrapper Endpoint

Design a new synchronous endpoint that wraps the existing async flow:

```typescript
// POST /api/ci/scan
// Blocks until scan completes (with timeout)
// Returns machine-readable results with pass/fail determination
{
  url: string;
  score: number;
  grade: string;
  passed: boolean;          // based on threshold config
  totalViolations: number;
  criticalCount: number;
  seriousCount: number;
  violations: AxeViolation[];
  timestamp: string;
  duration: number;         // ms
}
```

### Machine-Readable Output Formats

| Format | Use Case | GitHub Integration |
|--------|---------|-------------------|
| JSON | General CI consumption | Via custom parsing |
| JUnit XML | Azure DevOps test results, Jenkins | `PublishTestResults` task |
| SARIF | GitHub Code Scanning | `github/codeql-action/upload-sarif` |
| TAP (Test Anything Protocol) | Node.js test runners | Via tap reporters |

---

## 3. GitHub Actions Integration

### Custom Action Types

| Type | Platform Support | Speed | Complexity |
|------|-----------------|-------|------------|
| **Composite** (recommended) | Linux, macOS, Windows | Fast | Low |
| JavaScript | Linux, macOS, Windows | Fast | Medium |
| Docker | Linux only | Slower | Higher |

### Recommended: Composite Action

Composite actions combine shell steps and other actions. Best for wrapping our CLI tool or API calls.

```yaml
# action.yml
name: 'Accessibility Scan'
description: 'Run WCAG 2.2 accessibility scan'
inputs:
  url:
    description: 'URL to scan'
    required: true
  threshold:
    description: 'Minimum passing score (0-100)'
    required: false
    default: '70'
  fail-on-violation:
    description: 'Fail if any critical/serious violations found'
    required: false
    default: 'true'
  output-format:
    description: 'Output format: json, sarif, junit'
    required: false
    default: 'sarif'
  api-url:
    description: 'Scanner API base URL'
    required: false
    default: 'https://your-scanner.example.com'
outputs:
  score:
    description: 'Overall accessibility score'
  violations:
    description: 'Number of violations found'
  sarif-file:
    description: 'Path to generated SARIF file'
  passed:
    description: 'Whether the scan passed thresholds'
runs:
  using: 'composite'
  steps:
    - name: Run accessibility scan
      shell: bash
      run: |
        npx @your-org/a11y-scan-cli \
          --url "${{ inputs.url }}" \
          --threshold "${{ inputs.threshold }}" \
          --format "${{ inputs.output-format }}" \
          --output ./a11y-results
    - name: Upload SARIF
      if: inputs.output-format == 'sarif'
      uses: github/codeql-action/upload-sarif@v4
      with:
        sarif_file: ./a11y-results/results.sarif
        category: accessibility
```

### Example Workflow YAML

```yaml
name: Accessibility Scan
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]
  schedule:
    - cron: '0 6 * * 1'  # Weekly Monday 6am

jobs:
  accessibility:
    runs-on: ubuntu-latest
    permissions:
      security-events: write  # For SARIF upload
      pull-requests: write    # For PR comments
      contents: read
    steps:
      - uses: actions/checkout@v5

      - name: Deploy preview (or use existing URL)
        id: deploy
        run: echo "url=https://staging.example.com" >> $GITHUB_OUTPUT

      - name: Run Accessibility Scan
        id: scan
        uses: your-org/a11y-scan-action@v1
        with:
          url: ${{ steps.deploy.outputs.url }}
          threshold: 80
          output-format: sarif

      - name: Upload SARIF to GitHub
        if: always()
        uses: github/codeql-action/upload-sarif@v4
        with:
          sarif_file: ./a11y-results/results.sarif
          category: accessibility-scan

      - name: Comment on PR
        if: github.event_name == 'pull_request' && always()
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const results = JSON.parse(fs.readFileSync('./a11y-results/results.json'));
            const body = `## Accessibility Scan Results
            | Metric | Value |
            |--------|-------|
            | Score | ${results.score}/100 (${results.grade}) |
            | Violations | ${results.totalViolations} |
            | Critical | ${results.criticalCount} |
            | Passed | ${results.passed ? '✅' : '❌'} |`;
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body
            });
```

### SARIF Upload for Code Scanning

- Use `github/codeql-action/upload-sarif@v4`
- Requires `security-events: write` permission
- `category` input differentiates multiple SARIF uploads per commit
- Max file size: 10 MB (gzip-compressed)
- Max results per run: 25,000 (top 5,000 displayed)
- `partialFingerprints` needed for deduplication (auto-computed if missing)
- `runAutomationDetails.id` format: `category/run-id`

---

## 4. Azure DevOps Integration

### Pipeline YAML Example

```yaml
trigger:
  branches:
    include:
      - main
  pr:
    branches:
      include:
        - main

pool:
  vmImage: 'ubuntu-latest'

steps:
  - task: NodeTool@0
    inputs:
      versionSpec: '20.x'

  - script: |
      npx @your-org/a11y-scan-cli \
        --url "$(SCAN_URL)" \
        --format junit \
        --output $(Build.ArtifactStagingDirectory)/a11y-results
    displayName: 'Run Accessibility Scan'

  - task: PublishTestResults@2
    condition: always()
    inputs:
      testResultsFormat: 'JUnit'
      testResultsFiles: '$(Build.ArtifactStagingDirectory)/a11y-results/*.xml'
      testRunTitle: 'Accessibility Scan Results'
      failTaskOnFailedTests: true

  - task: PublishBuildArtifacts@1
    condition: always()
    inputs:
      pathToPublish: '$(Build.ArtifactStagingDirectory)/a11y-results'
      artifactName: 'accessibility-report'
```

### JUnit XML Format for Test Results

```xml
<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="Accessibility Scan" tests="4" failures="2" time="12.5">
  <testsuite name="WCAG 2.2 AA - https://example.com" tests="4" failures="2">
    <testcase name="color-contrast" classname="wcag2aa.perceivable">
      <failure message="Elements must meet minimum color contrast ratio thresholds"
               type="serious">
        Found 3 elements with insufficient contrast.
        Selector: .hero-text
        Help: https://dequeuniversity.com/rules/axe/4.11/color-contrast
      </failure>
    </testcase>
    <testcase name="image-alt" classname="wcag2aa.perceivable">
      <failure message="Images must have alternate text"
               type="critical">
        Found 1 image missing alt text.
        Selector: img.logo
      </failure>
    </testcase>
    <testcase name="html-has-lang" classname="wcag2aa.understandable" />
    <testcase name="document-title" classname="wcag2aa.robust" />
  </testsuite>
</testsuites>
```

### Azure DevOps Extension Patterns

Microsoft's `accessibility-insights-action` repo provides a reference implementation:

- ADO extension with task definitions in `packages/` directory
- Uses axe-core + Playwright for scanning
- Generates HTML reports as build artifacts
- Currently internal-only but architecture is instructive

---

## 5. CLI Tool Design

### Recommended Architecture

```
packages/
  cli/
    src/
      index.ts          # Entry point
      commands/
        scan.ts         # Scan command
        report.ts       # Generate report from saved results
      formatters/
        json.ts         # JSON output
        sarif.ts        # SARIF output
        junit.ts        # JUnit XML output
        table.ts        # Console table output
      config/
        loader.ts       # Load .a11yrc.json / CLI args
        schema.ts       # Config validation
      threshold/
        evaluator.ts    # Pass/fail evaluation
      types.ts
    bin/
      a11y-scan.ts      # CLI binary entry
```

### CLI Framework Recommendation: Commander.js

| Framework | Version | Weekly Downloads | TypeScript | License |
|-----------|---------|-----------------|------------|---------|
| **commander** | 14.0.3 | 311,375,327 | Built-in | MIT |
| yargs | 18.0.0 | 164,876,738 | Via @types/yargs | MIT |

**Commander.js is recommended** because:

- Built-in TypeScript declarations
- Zero dependencies
- Most widely used (311M weekly downloads)
- Clean, chainable API
- Supports subcommands, options, arguments, version, help auto-generation
- `@commander-js/extra-typings` for inferred types from option definitions
- Async action handlers via `.parseAsync()`

### CLI Interface Design

```bash
# Basic scan
a11y-scan --url https://example.com

# With thresholds
a11y-scan --url https://example.com --threshold 80 --fail-on critical

# Multiple output formats
a11y-scan --url https://example.com --format sarif --output results.sarif

# Using config file
a11y-scan --config .a11yrc.json

# API mode (call remote scanner)
a11y-scan --url https://example.com --api-url https://scanner.example.com

# Local mode (use built-in Playwright + axe-core)
a11y-scan --url https://example.com --local
```

### Exit Code Conventions

| Code | Meaning | Notes |
|------|---------|-------|
| 0 | Pass | All thresholds met, no blocking violations |
| 1 | Fail | Threshold not met or blocking violations found |
| 2 | Error | Technical error (network failure, invalid URL, config error) |

This matches industry conventions:

- `pa11y`: 0=success, 1=technical fault, 2=accessibility errors
- `@axe-core/cli`: 0=pass, 1=violations found (with `--exit`)
- Our convention: 0=pass, 1=accessibility fail, 2=technical error

### Configuration File Format

```jsonc
// .a11yrc.json
{
  "$schema": "https://your-domain.com/schemas/a11yrc.schema.json",
  "url": "https://example.com",
  "standard": "WCAG2AA",
  "threshold": {
    "score": 80,
    "maxViolations": {
      "critical": 0,
      "serious": 5,
      "moderate": null,
      "minor": null
    }
  },
  "output": {
    "format": ["json", "sarif"],
    "directory": "./a11y-results"
  },
  "scan": {
    "timeout": 60000,
    "viewport": { "width": 1280, "height": 1024 },
    "waitForLoad": 2000
  }
}
```

---

## 6. SARIF Format for Accessibility

### SARIF v2.1.0 Overview

- **Specification**: OASIS Standard, v2.1.0 (with Errata 01, Aug 2023)
- **Schema**: `https://json.schemastore.org/sarif-2.1.0.json`
- **Format**: JSON-based, UTF-8 encoded
- **File Extension**: `.sarif` or `.sarif.json`

### Mapping axe-core Violations to SARIF

```typescript
interface SarifMapping {
  // axe-core violation → SARIF result
  'violation.id'         → 'result.ruleId'
  'violation.impact'     → 'result.level' (mapped)
  'violation.description'→ 'result.message.text'
  'violation.helpUrl'    → 'rule.helpUri'
  'violation.help'       → 'rule.shortDescription.text'
  'violation.tags'       → 'rule.properties.tags'
  'violation.nodes[].target' → 'result.locations[].physicalLocation'
}
```

### Impact to SARIF Level Mapping

| axe-core Impact | SARIF Level | security-severity |
|-----------------|-------------|-------------------|
| critical | error | 9.0 |
| serious | error | 7.0 |
| moderate | warning | 4.0 |
| minor | note | 1.0 |

### Example SARIF Output

```json
{
  "$schema": "https://json.schemastore.org/sarif-2.1.0.json",
  "version": "2.1.0",
  "runs": [
    {
      "tool": {
        "driver": {
          "name": "accessibility-scan-demo-app",
          "semanticVersion": "0.1.0",
          "informationUri": "https://github.com/devopsabcs-engineering/accessibility-scan-demo-app",
          "rules": [
            {
              "id": "color-contrast",
              "name": "color-contrast",
              "shortDescription": {
                "text": "Elements must meet minimum color contrast ratio thresholds"
              },
              "fullDescription": {
                "text": "Ensures the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds"
              },
              "helpUri": "https://dequeuniversity.com/rules/axe/4.11/color-contrast",
              "help": {
                "text": "Elements must meet minimum color contrast ratio thresholds",
                "markdown": "Elements must meet minimum color contrast ratio thresholds. [More info](https://dequeuniversity.com/rules/axe/4.11/color-contrast)"
              },
              "defaultConfiguration": {
                "level": "error"
              },
              "properties": {
                "tags": ["wcag2aa", "wcag143", "accessibility"],
                "precision": "high",
                "problem.severity": "error"
              }
            }
          ]
        }
      },
      "automationDetails": {
        "id": "accessibility-scan/wcag2aa/"
      },
      "results": [
        {
          "ruleId": "color-contrast",
          "ruleIndex": 0,
          "level": "error",
          "message": {
            "text": "Element has insufficient color contrast ratio of 2.5:1 (foreground: #767676, background: #ffffff, font size: 12pt, font weight: normal). Expected contrast ratio of 4.5:1."
          },
          "locations": [
            {
              "physicalLocation": {
                "artifactLocation": {
                  "uri": "https://example.com",
                  "uriBaseId": "%SRCROOT%"
                },
                "region": {
                  "startLine": 1,
                  "startColumn": 1
                }
              }
            }
          ],
          "partialFingerprints": {
            "primaryLocationLineHash": "abc123:1"
          }
        }
      ],
      "columnKind": "utf16CodeUnits"
    }
  ]
}
```

### GitHub Code Scanning Integration

1. Generate SARIF file during scan
2. Upload via `github/codeql-action/upload-sarif@v4`
3. Requires `security-events: write` permission
4. Results appear in Security > Code Scanning tab
5. `partialFingerprints` required for deduplication (auto-calculated if source available)
6. Use `automationDetails.id` with category prefix for multi-tool scenarios
7. Max 10 MB gzip-compressed, 25,000 results per run

### SARIF Libraries

| Library | Language | Notes |
|---------|----------|-------|
| `@microsoft/sarif-node` | Node.js | Microsoft's SARIF SDK for Node |
| Manual generation | TypeScript | Simple enough to build from types |
| `sarif` (npm) | Node.js | Community SARIF utilities |

**Recommendation**: Build a custom SARIF generator since the mapping from our existing `ScanResults` type is straightforward and avoids external dependencies.

---

## 7. Threshold Configuration

### Threshold Types

#### 1. Score-Based

```json
{ "threshold": { "score": 80 } }
```

- Fail if `overallScore < 80`
- Maps to our existing `ScoreResult.overallScore`
- Simple and intuitive for teams

#### 2. Count-Based by Impact

```json
{
  "threshold": {
    "maxViolations": {
      "critical": 0,
      "serious": 3,
      "moderate": null,
      "minor": null
    }
  }
}
```

- Fail if critical violations > 0 OR serious violations > 3
- `null` means no limit for that level
- Maps to our existing `ImpactBreakdown`

#### 3. Rule-Based

```json
{
  "threshold": {
    "failOnRules": ["color-contrast", "image-alt", "html-has-lang"],
    "ignoreRules": ["link-name"]
  }
}
```

- Fail if any of the specified rules are violated
- Ignore specific rules that produce false positives

#### 4. WCAG Level-Based

```json
{
  "threshold": {
    "wcagLevel": "AA",
    "failOnLevelA": true,
    "failOnLevelAA": true,
    "failOnLevelAAA": false
  }
}
```

### How Existing Tools Handle Thresholds

| Tool | Mechanism | Default |
|------|-----------|---------|
| `pa11y-ci` | `--threshold <N>` permits N errors before exit code 2 | 0 |
| `pa11y` | `--threshold <N>` + `--level` (error/warning/notice) | 0 errors |
| `@axe-core/cli` | `--exit` flag (all-or-nothing) | No fail |
| `lighthouse-ci` | Score budgets per category | Configurable |

### Recommended Threshold Evaluation Logic

```typescript
interface ThresholdConfig {
  score?: number;                    // Min overall score
  maxViolations?: {
    critical?: number | null;        // null = unlimited
    serious?: number | null;
    moderate?: number | null;
    minor?: number | null;
  };
  failOnRules?: string[];            // Specific rule IDs
  ignoreRules?: string[];            // Rules to skip
}

function evaluateThreshold(
  results: ScanResults,
  config: ThresholdConfig
): { passed: boolean; reasons: string[] } {
  const reasons: string[] = [];

  if (config.score !== undefined && results.score.overallScore < config.score) {
    reasons.push(`Score ${results.score.overallScore} below threshold ${config.score}`);
  }

  if (config.maxViolations) {
    const { critical, serious, moderate, minor } = config.maxViolations;
    const breakdown = results.score.impactBreakdown;
    if (critical !== null && critical !== undefined && breakdown.critical.failed > critical) {
      reasons.push(`${breakdown.critical.failed} critical violations (max: ${critical})`);
    }
    // ... similar for serious, moderate, minor
  }

  if (config.failOnRules?.length) {
    const violatedRuleIds = results.violations.map(v => v.id);
    const matched = config.failOnRules.filter(r => violatedRuleIds.includes(r));
    if (matched.length > 0) {
      reasons.push(`Violations found for rules: ${matched.join(', ')}`);
    }
  }

  return { passed: reasons.length === 0, reasons };
}
```

---

## 8. Recommendations

### Architecture Overview

```
Phase 2 Components:
┌─────────────────────────────────────────┐
│  Existing Phase 1 App (Next.js)         │
│  ┌─────────────────────────────────┐    │
│  │ POST /api/scan (async)          │    │
│  │ GET  /api/scan/:id              │    │
│  │ GET  /api/scan/:id/status       │    │
│  │ GET  /api/scan/:id/pdf          │    │
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │ NEW: POST /api/ci/scan (sync)   │◄───┼── CI/CD tools call this
│  │ Returns: JSON with pass/fail    │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
         ▲
         │
┌────────┴────────┐    ┌──────────────────┐
│  CLI Tool       │    │  GitHub Action    │
│  (commander.js) │    │  (composite)      │
│                 │    │                   │
│  --url          │    │  inputs:          │
│  --threshold    │    │    url            │
│  --format       │    │    threshold      │
│  --output       │    │    format         │
│                 │    │                   │
│  Outputs:       │    │  Outputs:         │
│  - JSON         │    │  - SARIF upload   │
│  - SARIF        │    │  - PR comment     │
│  - JUnit XML    │    │  - Check status   │
│  - Console      │    │                   │
└─────────────────┘    └──────────────────┘
```

### Implementation Priority

1. **CI-friendly synchronous API endpoint** (`POST /api/ci/scan`)
2. **SARIF output generator** (map axe-core results to SARIF 2.1.0)
3. **CLI tool** using Commander.js with JSON/SARIF/JUnit/console formatters
4. **Threshold evaluator** supporting score, count, and rule-based thresholds
5. **GitHub Action** (composite) wrapping the CLI
6. **JUnit XML output** for Azure DevOps integration

### Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| CLI framework | Commander.js | Built-in TS, zero deps, most popular |
| Action type | Composite | Cross-platform, simple, wraps CLI |
| Primary output | SARIF | GitHub code scanning integration |
| Config format | JSON (`.a11yrc.json`) | Consistent with ecosystem, JSON Schema support |
| Scan mode | API-first + local fallback | Flexibility for different CI setups |
| Threshold default | Score ≥ 70, critical = 0 | Reasonable baseline matching grade B |

---

## 9. Follow-Up Research

### Recommended Next Research (Not Completed)

- [ ] Research `@microsoft/sarif-node` SDK for SARIF generation utilities
- [ ] Investigate `lighthouse-ci` assertion/budget patterns for threshold inspiration
- [ ] Research GitHub Actions Marketplace publishing process and metadata requirements
- [ ] Evaluate Azure DevOps extension SDK (`azure-devops-extension-sdk`) for native ADO tasks
- [ ] Research JUnit XML schema for test results mapping specifics
- [ ] Investigate `@actions/core` toolkit for JavaScript action development patterns
- [ ] Research webhook patterns and retry strategies for async CI notification
- [ ] Evaluate `axe-sarif-converter` npm package (if exists) for existing mapping code

### Clarifying Questions

None — all research questions were answerable through available documentation and source code analysis.

---

## References

- [pa11y npm](https://www.npmjs.com/package/pa11y) — v9.1.1, 277K weekly downloads
- [pa11y-ci npm](https://www.npmjs.com/package/pa11y-ci) — v4.1.0, 120K weekly downloads
- [@axe-core/cli npm](https://www.npmjs.com/package/@axe-core/cli) — v4.11.1, 35K weekly downloads
- [commander npm](https://www.npmjs.com/package/commander) — v14.0.3, 311M weekly downloads
- [yargs npm](https://www.npmjs.com/package/yargs) — v18.0.0, 165M weekly downloads
- [SARIF v2.1.0 Specification](https://docs.oasis-open.org/sarif/sarif/v2.1.0/sarif-v2.1.0.html)
- [GitHub SARIF Support](https://docs.github.com/en/code-security/code-scanning/integrating-with-code-scanning/sarif-support-for-code-scanning)
- [GitHub Upload SARIF](https://docs.github.com/en/code-security/code-scanning/integrating-with-code-scanning/uploading-a-sarif-file-to-github)
- [GitHub Custom Actions](https://docs.github.com/en/actions/sharing-automations/creating-actions/about-custom-actions)
- [microsoft/accessibility-insights-action](https://github.com/microsoft/accessibility-insights-action)
- [pa11y-ci GitHub](https://github.com/pa11y/pa11y-ci) — 591 stars
