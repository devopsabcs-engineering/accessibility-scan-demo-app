---
applyTo: '.copilot-tracking/changes/2026-03-08/copilot-a11y-agents-changes.md'
---
<!-- markdownlint-disable-file -->
# Implementation Plan: Custom Copilot Agents for AODA WCAG 2.2 Accessibility

## Overview

Create two declarative GitHub Copilot agents — A11y Detector and A11y Resolver — with supporting WCAG 2.2 instructions and prompt files, all authored as `.agent.md`, `.instructions.md`, and `.prompt.md` files in `.github/`.

## Objectives

### User Requirements

* Create a custom Copilot agent that detects AODA WCAG 2.2 accessibility issues in a web app repository — Source: user task description
* Create a custom Copilot agent that is an expert at addressing and resolving accessibility issues in code — Source: user task description
* Both agents must work in VS Code as custom agents and in GitHub UI as custom Copilot agents — Source: user task description
* Agents should leverage the existing accessibility scanning capabilities in this repository — Source: user task description

### Derived Objectives

* Create WCAG 2.2 Level AA compliance instructions file auto-applied to TSX/JSX/HTML/CSS files — Derived from: agents need shared WCAG knowledge base; passive compliance guidance benefits all development
* Create remediation patterns instructions file for the Resolver agent — Derived from: remediation patterns are too extensive for the agent body; separate instructions keep agent under 30K char limit
* Create quick-action prompt files for scanning and fixing — Derived from: streamlines common workflows without full agent invocation
* Implement handoff from Detector to Resolver agent — Derived from: seamless detection-to-remediation workflow
* Follow ADO workflow for work item tracking and branching — Derived from: `.github/instructions/ado-workflow.instructions.md` requires work items and AB# commit linking

## Context Summary

### Project Files

* [src/lib/scanner/engine.ts](src/lib/scanner/engine.ts) — Three-engine scanner (axe-core + IBM Equal Access + custom checks) with WCAG 2.2 tag support
* [src/lib/scoring/calculator.ts](src/lib/scoring/calculator.ts) — Weighted impact scoring (critical=10, serious=7, moderate=3, minor=1), grades A–F
* [src/lib/scoring/wcag-mapper.ts](src/lib/scoring/wcag-mapper.ts) — Maps WCAG tags to POUR principles
* [src/lib/scanner/custom-checks.ts](src/lib/scanner/custom-checks.ts) — Five custom Playwright checks
* [src/cli/commands/scan.ts](src/cli/commands/scan.ts) — CLI single-page scan command
* [src/cli/commands/crawl.ts](src/cli/commands/crawl.ts) — CLI site-wide crawl command
* [src/lib/types/scan.ts](src/lib/types/scan.ts) — TypeScript interfaces for scan results
* [src/lib/ci/threshold.ts](src/lib/ci/threshold.ts) — CI threshold evaluation
* [src/lib/report/sarif-generator.ts](src/lib/report/sarif-generator.ts) — SARIF 2.1.0 output for GitHub Security

### References

* [copilot-a11y-agents-research.md](.copilot-tracking/research/2026-03-08/copilot-a11y-agents-research.md) — Primary research document with full architecture, agent definitions, and remediation patterns
* [vscode-custom-agents-research.md](.copilot-tracking/research/subagents/2026-03-08/vscode-custom-agents-research.md) — VS Code `.agent.md` schema, tools API, cross-platform analysis
* [aoda-wcag22-standards-research.md](.copilot-tracking/research/subagents/2026-03-08/aoda-wcag22-standards-research.md) — All WCAG 2.2 Level AA criteria, detection capabilities, remediation patterns
* [codebase-analysis-research.md](.copilot-tracking/research/subagents/2026-03-08/codebase-analysis-research.md) — Scanner architecture, CLI commands, type system
* [implementation-readiness-research.md](.copilot-tracking/research/subagents/2026-03-08/implementation-readiness-research.md) — Agent schema validation, CLI commands, project readiness

### Standards References

* [ado-workflow.instructions.md](.github/instructions/ado-workflow.instructions.md) — ADO work item hierarchy, branching, commit messages with AB# linking
* HVE Core `prompt-builder.instructions.md` — `.agent.md` schema, frontmatter fields, body authoring standards
* HVE Core `commit-message.instructions.md` — Conventional Commits with scopes, footer format
* HVE Core `markdown.instructions.md` — YAML frontmatter required, heading hierarchy, ATX style

## Implementation Checklist

### [ ] Implementation Phase 1: Create Agent Definition Files

<!-- parallelizable: true -->

* [ ] Step 1.1: Create `.github/agents/` directory and `a11y-detector.agent.md`
  * Details: [copilot-a11y-agents-details.md](.copilot-tracking/details/2026-03-08/copilot-a11y-agents-details.md) (Lines 12-75)
* [ ] Step 1.2: Create `.github/agents/a11y-resolver.agent.md`
  * Details: [copilot-a11y-agents-details.md](.copilot-tracking/details/2026-03-08/copilot-a11y-agents-details.md) (Lines 77-141)

### [ ] Implementation Phase 2: Create Supporting Instructions Files

<!-- parallelizable: true -->

* [ ] Step 2.1: Create `.github/instructions/wcag22-rules.instructions.md`
  * Details: [copilot-a11y-agents-details.md](.copilot-tracking/details/2026-03-08/copilot-a11y-agents-details.md) (Lines 145-188)
* [ ] Step 2.2: Create `.github/instructions/a11y-remediation.instructions.md`
  * Details: [copilot-a11y-agents-details.md](.copilot-tracking/details/2026-03-08/copilot-a11y-agents-details.md) (Lines 190-250)

### [ ] Implementation Phase 3: Create Prompt Files

<!-- parallelizable: true -->

* [ ] Step 3.1: Create `.github/prompts/a11y-scan.prompt.md`
  * Details: [copilot-a11y-agents-details.md](.copilot-tracking/details/2026-03-08/copilot-a11y-agents-details.md) (Lines 252-285)
* [ ] Step 3.2: Create `.github/prompts/a11y-fix.prompt.md`
  * Details: [copilot-a11y-agents-details.md](.copilot-tracking/details/2026-03-08/copilot-a11y-agents-details.md) (Lines 287-322)

### [ ] Implementation Phase 4: ADO Work Items and Branching

<!-- parallelizable: false -->

* [ ] Step 4.1: Create ADO Epic, Feature, and User Stories for the agent work
  * Details: [copilot-a11y-agents-details.md](.copilot-tracking/details/2026-03-08/copilot-a11y-agents-details.md) (Lines 326-353)
* [ ] Step 4.2: Create feature branch and commit with AB# linking
  * Details: [copilot-a11y-agents-details.md](.copilot-tracking/details/2026-03-08/copilot-a11y-agents-details.md) (Lines 355-377)

### [ ] Implementation Phase 5: Validation

<!-- parallelizable: false -->

* [ ] Step 5.1: Validate agent file structure and frontmatter
  * Verify YAML frontmatter parses correctly in both agent files
  * Confirm `description` under 120 characters
  * Confirm agent body under 30,000 characters (GitHub.com limit)
  * Verify no `maturity` field in agent frontmatter (per prompt-builder rules)
* [ ] Step 5.2: Validate instructions file structure
  * Verify `applyTo` glob patterns match intended file types
  * Confirm instructions files have YAML frontmatter with `description` and `applyTo`
* [ ] Step 5.3: Validate prompt file structure
  * Verify prompt files have `description`, `agent`, and `argument-hint` fields
* [ ] Step 5.4: Run project linting and tests
  * Execute `npm run lint` for ESLint validation
  * Execute `npm run test` for unit test verification
  * Verify no regressions from new files
* [ ] Step 5.5: Fix minor validation issues
  * Iterate on lint errors and formatting issues
  * Apply fixes directly when corrections are straightforward
* [ ] Step 5.6: Report blocking issues
  * Document issues requiring additional research
  * Provide user with next steps rather than large-scale inline fixes

## Planning Log

See [copilot-a11y-agents-log.md](.copilot-tracking/plans/logs/2026-03-08/copilot-a11y-agents-log.md) for discrepancy tracking, implementation paths considered, and suggested follow-on work.

## Dependencies

* VS Code with GitHub Copilot extension (agent resolution)
* Node.js and npm (CLI scanner, linting, testing)
* Existing `a11y-scan` CLI binary (requires `npm run build` for runtime scanning)
* Azure DevOps access to `MngEnvMCAP675646` / `AODA WCAG compliance` project (work items)
* Git access to `devopsabcs-engineering/accessibility-scan-demo-app` (branching, commits)

## Success Criteria

* Two `.agent.md` files in `.github/agents/` load in VS Code agent picker — Traces to: user requirements (detection + remediation agents)
* A11y Detector performs static code analysis and invokes CLI scanner — Traces to: user requirement (detect AODA WCAG 2.2 issues)
* A11y Resolver applies code fixes and verifies with re-scan — Traces to: user requirement (resolve accessibility issues in code)
* Agents work cross-platform (VS Code + GitHub.com) by omitting `target` field — Traces to: user requirement (both VS Code and GitHub UI)
* WCAG 2.2 instructions auto-applied to TSX/JSX/HTML/CSS files — Traces to: derived objective (passive compliance guidance)
* Handoff from Detector to Resolver transfers violation context — Traces to: research finding (agent orchestration via handoffs)
* All commits include `AB#` work item references — Traces to: `ado-workflow.instructions.md`
