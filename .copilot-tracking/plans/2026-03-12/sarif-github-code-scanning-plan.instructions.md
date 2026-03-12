---
applyTo: '.copilot-tracking/changes/2026-03-12/sarif-github-code-scanning-changes.md'
---
<!-- markdownlint-disable-file -->
# Implementation Plan: Improve SARIF Output for GitHub Code Scanning

## Overview

Enrich the SARIF output produced by the accessibility scanner so that GitHub Code Scanning displays complete, inline rule help with WCAG guidance, correct IBM help URLs, and properly categorized severity/precision metadata for every accessibility alert.

## Objectives

### User Requirements

* Add `fullDescription`, `help` (with `text` and `markdown`), and `defaultConfiguration` to SARIF rule descriptors so GitHub shows "Rule help" content inline — Source: task request
* Fix broken IBM Equal Access `helpUri` URLs (wrong URL pattern in normalizer and `help` field containing URL instead of text) — Source: task request
* Enrich SARIF result `message.text` with structured content including violation details, affected snippet, selector, failure summary (`failureSummary`), element count, and WCAG criteria — Source: task request
* Ensure SARIF `properties` carry `precision` and `problem.severity` so GitHub can categorize, filter, and order results — Source: task request
* Add `tool.driver.informationUri`, `tool.driver.semanticVersion`, and `automationDetails.id` for proper tool identification — Source: task request

### Derived Objectives

* Create `buildHelpMarkdown()` and `buildHelpText()` helper functions to generate rule help content from `AxeViolation` data — Derived from: all rules need `help.text` and `help.markdown`, which require a structured builder
* Add `extractIbmHelpUrl()` helper to extract base URL from raw IBM `help` field — Derived from: IBM URL fix requires stripping the `#fragment` with encoded JSON from the archive URL
* Update existing SARIF and normalizer tests to cover all new fields and IBM URL fix — Derived from: existing test suite must remain green and cover new behavior
* Keep `helpUri` on the SARIF rule for spec compliance even though GitHub does not render it — Derived from: SARIF v2.1.0 spec compliance; removing it would be non-standard

## Context Summary

### Project Files

* `src/lib/report/sarif-generator.ts` — The SARIF generator (142 lines). Produces `SarifRule` with only 5 fields. Missing: `fullDescription`, `help`, `defaultConfiguration`, `precision`, `problem.severity`.
* `src/lib/scanner/result-normalizer.ts` — IBM normalizer. Line 74 maps `r.help` (a URL) to text `help` field. Line 75 constructs a wrong helpUrl pattern.
* `src/lib/types/scan.ts` — `AxeViolation` interface (lines 33–44). Has `description`, `help`, `helpUrl`, `nodes`, `principle`, `engine`, `tags`, `impact`.
* `src/lib/report/__tests__/sarif-generator.test.ts` — 13 existing tests covering SARIF generation.
* `src/lib/scanner/__tests__/result-normalizer.test.ts` — 20+ existing tests covering IBM normalization.
* `src/components/ViolationList.tsx` — HTML report renders all rich data; this is the quality target for SARIF.

### References

* `.copilot-tracking/research/2026-03-12/sarif-github-code-scanning-research.md` — Primary research document with full gap analysis, code examples, and alternative evaluation.
* GitHub SARIF Support: `https://docs.github.com/en/code-security/code-scanning/integrating-with-code-scanning/sarif-support-for-code-scanning`
* SARIF v2.1.0 OASIS Spec: `https://docs.oasis-open.org/sarif/sarif/v2.1.0/sarif-v2.1.0.html`

### Standards References

* #file:../../.github/instructions/a11y-remediation.instructions.md — Accessibility remediation patterns and fix prioritization
* #file:../../.github/instructions/wcag22-rules.instructions.md — WCAG 2.2 Level AA compliance rules
* #file:../../.github/instructions/ado-workflow.instructions.md — ADO workflow with branching, commit messages, and PR conventions

## Implementation Checklist

### [x] Implementation Phase 1: Fix IBM Equal Access URL and Help Text

<!-- parallelizable: true -->

* [x] Step 1.1: Add `extractIbmHelpUrl()` helper function to `result-normalizer.ts`
  * Details: .copilot-tracking/details/2026-03-12/sarif-github-code-scanning-details.md (Lines 15-46)
* [x] Step 1.2: Fix IBM `help` and `helpUrl` field mapping in `normalizeIbmResults()`
  * Details: .copilot-tracking/details/2026-03-12/sarif-github-code-scanning-details.md (Lines 48-72)
* [x] Step 1.3: Update IBM normalizer tests for new helpUrl and help text behavior
  * Details: .copilot-tracking/details/2026-03-12/sarif-github-code-scanning-details.md (Lines 74-107)
* [x] Step 1.4: Validate phase changes
  * Run `npm run lint` and `npm run test -- src/lib/scanner/__tests__/result-normalizer.test.ts`

### [x] Implementation Phase 2: Enrich SARIF Rule Descriptors

<!-- parallelizable: true -->

* [x] Step 2.1: Update `SarifRule` interface with all GitHub-supported fields
  * Details: .copilot-tracking/details/2026-03-12/sarif-github-code-scanning-details.md (Lines 113-147)
* [x] Step 2.2: Add `buildHelpMarkdown()` function
  * Details: .copilot-tracking/details/2026-03-12/sarif-github-code-scanning-details.md (Lines 149-197)
* [x] Step 2.3: Add `buildHelpText()` function
  * Details: .copilot-tracking/details/2026-03-12/sarif-github-code-scanning-details.md (Lines 199-230)
* [x] Step 2.4: Add mapping functions for `defaultConfiguration.level`, `precision`, and `problem.severity`
  * Details: .copilot-tracking/details/2026-03-12/sarif-github-code-scanning-details.md (Lines 232-268)
* [x] Step 2.5: Update `buildRun()` to populate all new fields on each rule
  * Details: .copilot-tracking/details/2026-03-12/sarif-github-code-scanning-details.md (Lines 270-312)
* [x] Step 2.6: Validate phase changes
  * Run `npm run lint` and `npm run test -- src/lib/report/__tests__/sarif-generator.test.ts`

### [x] Implementation Phase 3: Enrich SARIF Results and Tool Metadata

<!-- parallelizable: false -->
<!-- depends on Phase 2 (SarifRun interface and buildRun changes) -->

* [x] Step 3.1: Enrich `SarifResult.message.text` with description, URL, selector, and element count
  * Details: .copilot-tracking/details/2026-03-12/sarif-github-code-scanning-details.md (Lines 318-348)
* [x] Step 3.2: Add `tool.driver.informationUri`, `tool.driver.semanticVersion`, and `automationDetails.id`
  * Details: .copilot-tracking/details/2026-03-12/sarif-github-code-scanning-details.md (Lines 350-389)
* [x] Step 3.3: Update SARIF generator tests for enriched messages and tool metadata
  * Details: .copilot-tracking/details/2026-03-12/sarif-github-code-scanning-details.md (Lines 391-442)
* [x] Step 3.4: Validate phase changes
  * Run `npm run lint` and `npm run test -- src/lib/report/__tests__/sarif-generator.test.ts`

### [x] Implementation Phase 4: Validation

<!-- parallelizable: false -->

* [x] Step 4.1: Run full project validation
  * Execute `npm run lint`
  * Execute `npm run build`
  * Execute `npm run test`
* [x] Step 4.2: Fix minor validation issues
  * No issues found — all validation passed cleanly
* [x] Step 4.3: Report blocking issues
  * No blocking issues found

## Planning Log

See [sarif-github-code-scanning-log.md](../logs/2026-03-12/sarif-github-code-scanning-log.md) for discrepancy tracking, implementation paths considered, and suggested follow-on work.

## Dependencies

* Node.js and npm (project build and test toolchain)
* Vitest (test runner — `npm run test`)
* ESLint (linting — `npm run lint`)
* Next.js build (`npm run build`)
* No new dependencies required — all enrichment uses existing `AxeViolation` data

## Success Criteria

* GitHub Code Scanning displays inline "Rule help" with description, WCAG mapping, remediation guidance, and learn more links for every accessibility alert — Traces to: user requirement (rule help) + research Discovery 1
* IBM rule links resolve correctly using the archive URL pattern extracted from raw IBM data — Traces to: user requirement (IBM URLs) + research Discovery 3
* Result messages include violation description, scanned URL, selector, affected element count, and `failureSummary` when available — Traces to: user requirement (enriched messages) + research Discovery 5
* Tags and properties (`precision`, `problem.severity`) enable filtering by WCAG principle and severity ordering — Traces to: user requirement (properties) + research GitHub SARIF Support
* `tool.driver.informationUri` and `tool.driver.semanticVersion` present on the tool driver — Traces to: user requirement (tool identification)
* All existing tests pass and new tests cover the added fields — Traces to: derived objective (test coverage)
