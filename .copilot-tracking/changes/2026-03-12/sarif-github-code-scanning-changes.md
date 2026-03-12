<!-- markdownlint-disable-file -->
# Release Changes: Improve SARIF Output for GitHub Code Scanning

**Related Plan**: sarif-github-code-scanning-plan.instructions.md
**Implementation Date**: 2026-03-12

## Summary

Enrich SARIF output so GitHub Code Scanning displays complete inline rule help with WCAG guidance, correct IBM help URLs, properly categorized severity/precision metadata, and enriched result messages for every accessibility alert.

## Changes

### Added

* `src/lib/scanner/result-normalizer.ts` — Added `extractIbmHelpUrl()` helper function that parses IBM Equal Access archive URLs, strips `#` fragments, and falls back to `/archives/latest/` pattern when help field is missing or not a URL
* `src/lib/report/sarif-generator.ts` — Added `buildHelpMarkdown()` function generating rich Markdown rule help with title, description, impact, principle, engine, WCAG tags, and learn-more links
* `src/lib/report/sarif-generator.ts` — Added `buildHelpText()` function generating plain-text rule help as GitHub fallback
* `src/lib/report/sarif-generator.ts` — Added `mapEngineToPrecision()` mapping axe-core → very-high, ibm-equal-access → high, default → medium
* `src/lib/report/sarif-generator.ts` — Added `mapImpactToSeverity()` mapping critical/serious → error, moderate → warning, minor → recommendation

### Modified

* `src/lib/scanner/result-normalizer.ts` — Changed `help` field mapping in `normalizeIbmResults()` from `r.help ?? r.message` to `r.message` (IBM `r.help` contains a URL, not text)
* `src/lib/scanner/result-normalizer.ts` — Changed `helpUrl` mapping from broken `/rules/tools/help/` pattern to `extractIbmHelpUrl(r.help, r.ruleId)` using working archive URLs
* `src/lib/report/sarif-generator.ts` — Expanded `SarifRule` interface with `fullDescription`, `help` (text + markdown), `defaultConfiguration`, enriched `properties` (precision, problem.severity)
* `src/lib/report/sarif-generator.ts` — Expanded `SarifRun` interface with `informationUri`, `semanticVersion` on tool.driver and optional `automationDetails`
* `src/lib/report/sarif-generator.ts` — Updated `buildRun()` rule construction to populate all new fields; `shortDescription` changed from `violation.description` to `violation.help`
* `src/lib/report/sarif-generator.ts` — Enriched `SarifResult.message.text` with description, help, scanned URL, selector, element count, and optional failureSummary
* `src/lib/report/sarif-generator.ts` — Added `automationDetails.id` to `buildRun()` return block
* `src/lib/scanner/__tests__/result-normalizer.test.ts` — Updated 2 existing IBM tests, added 3 new tests for archive URL extraction, fallback, and help text separation (48 total)
* `src/lib/report/__tests__/sarif-generator.test.ts` — Updated 2 existing tests, added 11 new tests for enriched fields, tool metadata, failureSummary, site SARIF, and IBM markdown links (24 total)

### Removed

* None

## Additional or Deviating Changes

* DD-01: `shortDescription.text` changed from `violation.description` to `violation.help` per plan design decision — the concise one-liner is more appropriate for GitHub's brief label display
* DD-02: `failureSummary` included in enriched `message.text` per DR-06 remediation — appended conditionally when present on the node
* Phase 2 subagent pre-added `informationUri` and `semanticVersion` to the return block; Phase 3 only needed to add `automationDetails`

## Release Summary

Total files affected: 4 (2 production, 2 test)

**Created:** None
**Modified:**
* `src/lib/scanner/result-normalizer.ts` — IBM URL fix and `extractIbmHelpUrl()` helper
* `src/lib/report/sarif-generator.ts` — Full SARIF enrichment (interfaces, helpers, rule/result/metadata construction)
* `src/lib/scanner/__tests__/result-normalizer.test.ts` — 48 tests (3 new, 2 updated)
* `src/lib/report/__tests__/sarif-generator.test.ts` — 24 tests (11 new, 2 updated)
**Removed:** None

**Dependencies:** No new dependencies added
**Infrastructure:** No infrastructure changes
**Deployment notes:** SARIF output format enriched — GitHub Code Scanning will display inline rule help and enriched metadata on next SARIF upload
