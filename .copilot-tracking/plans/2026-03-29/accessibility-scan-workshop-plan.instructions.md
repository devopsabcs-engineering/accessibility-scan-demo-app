---
applyTo: '.copilot-tracking/changes/2026-03-29/accessibility-scan-workshop-changes.md'
---
<!-- markdownlint-disable-file -->
# Implementation Plan: Create accessibility-scan-workshop Repository and Refactor accessibility-scan-demo-app

## Overview

Create a sibling `accessibility-scan-workshop` repository following the `finops-scan-workshop` pattern with 8 labs, placeholder screenshots, and automated capture, while refactoring `accessibility-scan-demo-app` to embed the 5 a11y demo apps as template directories with bootstrap and OIDC scripts.

## Objectives

### User Requirements

* Create `accessibility-scan-workshop` repository with labs, placeholder screenshots, and automated capture script — Source: user task request
* Embed the 5 a11y demo apps (001–005) as template directories inside `accessibility-scan-demo-app` — Source: user task request
* Add `scripts/bootstrap-demo-apps.ps1` to `accessibility-scan-demo-app` — Source: user task request
* Add `scripts/setup-oidc.ps1` to `accessibility-scan-demo-app` — Source: user task request
* Create `scripts/capture-screenshots.ps1` in the workshop repo to auto-generate all lab screenshots — Source: user task request
* Establish a repeatable pattern consistent with `agentic-accelerator-framework` blueprint — Source: user task request

### Derived Objectives

* Update `accessibility-scan-demo-app` README.md to document embedded demo apps, scripts, and quick-start instructions — Derived from: embedding demo apps requires documentation for discoverability
* Create Jekyll GitHub Pages infrastructure (`_config.yml`, `Gemfile`, `_includes/head-custom.html`) for the workshop — Derived from: workshop requires a browsable site matching finops pattern
* Create CONTRIBUTING.md with lab authoring style guide in the workshop repo — Derived from: maintaining consistency across labs requires documented conventions
* Create screenshot inventory README.md files in each `images/lab-XX/` directory — Derived from: automated screenshot capture script needs a manifest of expected outputs per lab
* Create Mermaid lab dependency diagram — Derived from: visualizing lab prerequisites aids both delivery and student self-pacing

## Context Summary

### Project Files

* .github/workflows/deploy-all.yml - Orchestrator dispatching CI/CD to 5 sibling demo app repos
* .github/workflows/ci.yml - CI pipeline: lint, test, build, e2e self-scan
* .github/workflows/a11y-scan.yml - Weekly scheduled scan: matrix of 3 sites
* .github/workflows/scan-all.yml - Dispatches a11y-scan to 5 sibling repos
* .github/agents/a11y-detector.agent.md - WCAG 2.2 detector agent
* .github/agents/a11y-resolver.agent.md - Remediation agent
* infra/main.bicep - ACR + Log Analytics + App Insights + App Service Plan + Web App
* Dockerfile - Multi-stage Node 20 build with Playwright Chromium + Puppeteer Chrome
* action/action.yml - Composite GitHub Action for accessibility scanning
* package.json - Next.js 15.5, axe-core, crawlee, commander, puppeteer

### References

* .copilot-tracking/research/2026-03-29/accessibility-scan-workshop-research.md - Primary research document
* .copilot-tracking/research/subagents/2026-03-29/finops-scan-demo-app-research.md - Finops scanner repo patterns
* .copilot-tracking/research/subagents/2026-03-29/finops-scan-workshop-research.md - Finops workshop repo patterns
* .copilot-tracking/research/subagents/2026-03-29/finops-scripts-deep-dive-research.md - Bootstrap/OIDC/capture script details
* .copilot-tracking/research/subagents/2026-03-29/a11y-demo-apps-research.md - Demo app structure and violations
* .copilot-tracking/research/subagents/2026-03-29/a11y-workspace-analysis-research.md - Current scanner workspace analysis
* .copilot-tracking/research/subagents/2026-03-29/agentic-accelerator-research.md - Framework blueprint patterns

### Standards References

* .github/instructions/ado-workflow.instructions.md — ADO work item tracking, branching, PR workflow
* .github/instructions/a11y-remediation.instructions.md — WCAG fix patterns and code recipes
* .github/instructions/wcag22-rules.instructions.md — WCAG 2.2 Level AA compliance rules

## Implementation Checklist

### [x] Implementation Phase 1: Embed Demo App Template Directories

<!-- parallelizable: true -->

* [x] Step 1.1: Copy a11y-demo-app-001 (Rust) into scanner repo
  * Details: .copilot-tracking/details/2026-03-29/accessibility-scan-workshop-details.md (Lines 15-44)
* [x] Step 1.2: Copy a11y-demo-app-002 (C#) into scanner repo
  * Details: .copilot-tracking/details/2026-03-29/accessibility-scan-workshop-details.md (Lines 46-56)
* [x] Step 1.3: Copy a11y-demo-app-003 (Java) into scanner repo
  * Details: .copilot-tracking/details/2026-03-29/accessibility-scan-workshop-details.md (Lines 58-68)
* [x] Step 1.4: Copy a11y-demo-app-004 (Python) into scanner repo
  * Details: .copilot-tracking/details/2026-03-29/accessibility-scan-workshop-details.md (Lines 70-80)
* [x] Step 1.5: Copy a11y-demo-app-005 (Go) into scanner repo
  * Details: .copilot-tracking/details/2026-03-29/accessibility-scan-workshop-details.md (Lines 82-92)
* [x] Step 1.6: Validate demo app directories
  * Verify each directory contains Dockerfile, src/, infra/main.bicep, README.md, start-local.ps1, stop-local.ps1
  * Verify .github/workflows/ and .azuredevops/pipelines/ are present in each

### [x] Implementation Phase 2: Create Bootstrap and OIDC Scripts

<!-- parallelizable: true (file creation is independent; script execution requires Step 2.1 before Step 2.2) -->

* [x] Step 2.1: Create scripts/setup-oidc.ps1
  * Details: .copilot-tracking/details/2026-03-29/accessibility-scan-workshop-details.md (Lines 94-140)
* [x] Step 2.2: Create scripts/bootstrap-demo-apps.ps1
  * Details: .copilot-tracking/details/2026-03-29/accessibility-scan-workshop-details.md (Lines 142-215)
* [x] Step 2.3: Validate scripts with syntax check
  * Run `pwsh -c "Get-Command -Syntax scripts/bootstrap-demo-apps.ps1"` and `pwsh -c "Get-Command -Syntax scripts/setup-oidc.ps1"`

### [x] Implementation Phase 3: Update Scanner Repo README

<!-- parallelizable: true -->

* [x] Step 3.1: Update README.md with demo apps section, scripts section, and quick-start
  * Details: .copilot-tracking/details/2026-03-29/accessibility-scan-workshop-details.md (Lines 217-262)

### [x] Implementation Phase 4: Create Workshop Repository Structure

<!-- parallelizable: false -->

* [x] Step 4.1: Initialize accessibility-scan-workshop repository
  * Details: .copilot-tracking/details/2026-03-29/accessibility-scan-workshop-details.md (Lines 264-310)
* [x] Step 4.2: Create Jekyll GitHub Pages infrastructure
  * Details: .copilot-tracking/details/2026-03-29/accessibility-scan-workshop-details.md (Lines 312-365)
* [x] Step 4.3: Create CONTRIBUTING.md with lab authoring style guide
  * Details: .copilot-tracking/details/2026-03-29/accessibility-scan-workshop-details.md (Lines 367-410)

### [x] Implementation Phase 5: Create Workshop Lab Documents

<!-- parallelizable: true -->

* [x] Step 5.1: Create Lab 00 — Prerequisites and Environment Setup
  * Details: .copilot-tracking/details/2026-03-29/accessibility-scan-workshop-details.md (Lines 412-455)
* [x] Step 5.2: Create Lab 01 — Explore the Demo Apps and WCAG Violations
  * Details: .copilot-tracking/details/2026-03-29/accessibility-scan-workshop-details.md (Lines 457-500)
* [x] Step 5.3: Create Lab 02 — axe-core Automated Accessibility Testing
  * Details: .copilot-tracking/details/2026-03-29/accessibility-scan-workshop-details.md (Lines 502-548)
* [x] Step 5.4: Create Lab 03 — IBM Equal Access Comprehensive Policy Scanning
  * Details: .copilot-tracking/details/2026-03-29/accessibility-scan-workshop-details.md (Lines 550-593)
* [x] Step 5.5: Create Lab 04 — Custom Playwright Checks Manual Inspection
  * Details: .copilot-tracking/details/2026-03-29/accessibility-scan-workshop-details.md (Lines 595-638)
* [x] Step 5.6: Create Lab 05 — SARIF Output and GitHub Security Tab
  * Details: .copilot-tracking/details/2026-03-29/accessibility-scan-workshop-details.md (Lines 640-683)
* [x] Step 5.7: Create Lab 06 — GitHub Actions Pipelines and Scan Gates
  * Details: .copilot-tracking/details/2026-03-29/accessibility-scan-workshop-details.md (Lines 685-730)
* [x] Step 5.8: Create Lab 07 — Remediation Workflows with Copilot Agents
  * Details: .copilot-tracking/details/2026-03-29/accessibility-scan-workshop-details.md (Lines 732-775)

### [x] Implementation Phase 6: Create Screenshot Infrastructure

<!-- parallelizable: true -->

* [x] Step 6.1: Create screenshot inventory README.md files for each lab
  * Details: .copilot-tracking/details/2026-03-29/accessibility-scan-workshop-details.md (Lines 777-840)
* [x] Step 6.2: Create images/lab-dependency-diagram.mmd
  * Details: .copilot-tracking/details/2026-03-29/accessibility-scan-workshop-details.md (Lines 842-860)

### [x] Implementation Phase 7: Create Capture-Screenshots Script

<!-- parallelizable: false -->

* [x] Step 7.1: Create scripts/capture-screenshots.ps1 with helper functions
  * Details: .copilot-tracking/details/2026-03-29/accessibility-scan-workshop-details.md (Lines 862-960)
* [x] Step 7.2: Implement Phase 1 captures (offline: tool versions, file content, scan outputs)
  * Details: .copilot-tracking/details/2026-03-29/accessibility-scan-workshop-details.md (Lines 962-1020)
* [x] Step 7.3: Implement Phase 2 captures (Azure-deployed: app pages, portal)
  * Details: .copilot-tracking/details/2026-03-29/accessibility-scan-workshop-details.md (Lines 1022-1065)
* [x] Step 7.4: Implement Phase 3 captures (GitHub web UI: Security tab, Actions, PRs)
  * Details: .copilot-tracking/details/2026-03-29/accessibility-scan-workshop-details.md (Lines 1067-1110)
* [x] Step 7.5: Validate script syntax
  * Run `pwsh -c "Get-Command -Syntax scripts/capture-screenshots.ps1"`

### [x] Implementation Phase 8: Final Validation

<!-- parallelizable: false -->

* [x] Step 8.1: Verify scanner repo structure
  * Confirm 5 demo app directories, scripts/ directory, updated README
  * Verify no changes to existing scanner engine, CLI, or API code
* [x] Step 8.2: Verify workshop repo structure
  * Confirm 8 lab documents, Jekyll config, screenshot inventories, capture script
  * Cross-reference lab screenshot references against inventory READMEs
* [x] Step 8.3: Cross-reference screenshot references
  * Validate all `![Alt](../images/lab-XX/filename.png)` references in lab files against inventory READMEs
* [x] Step 8.4: Run bootstrap script Phase 1 dry-run (if available)
  * Verify idempotent repo creation logic
* [x] Step 8.5: Run capture-screenshots.ps1 Phase 1 (offline captures)
  * Verify terminal and file screenshots are generated
* [x] Step 8.6: Report blocking issues
  * Document issues requiring additional research
  * Provide next steps for Azure-dependent and GitHub-dependent captures

## Planning Log

See .copilot-tracking/plans/logs/2026-03-29/accessibility-scan-workshop-log.md for discrepancy tracking, implementation paths considered, and suggested follow-on work.

## Dependencies

* GitHub CLI (`gh`) — repository creation, secret configuration, workflow dispatch
* Azure CLI (`az`) — OIDC app registration, federated credentials, role assignments
* PowerShell 7+ (`pwsh`) — all scripts
* Node.js 20+ (`node`) — scanner build, lab exercises, Playwright
* Docker Desktop — building and running demo app containers
* Charm `freeze` CLI — terminal screenshot generation
* Playwright — browser screenshot generation, e2e tests
* Jekyll + Ruby — workshop GitHub Pages site build
* Git — branching per ADO workflow instructions

## Success Criteria

* `accessibility-scan-demo-app` contains `a11y-demo-app-001/` through `a11y-demo-app-005/` template directories — Traces to: user requirement (embed demo apps)
* `accessibility-scan-demo-app` contains `scripts/bootstrap-demo-apps.ps1` and `scripts/setup-oidc.ps1` — Traces to: user requirement (add scripts)
* `accessibility-scan-workshop` contains 8 labs (00–07) with consistent structure — Traces to: user requirement (workshop with labs)
* Screenshot inventory READMEs cover ~47 expected screenshots across all labs — Traces to: user requirement (placeholder screenshots)
* `scripts/capture-screenshots.ps1` supports 3 phases, 4 capture methods, and lab filtering — Traces to: user requirement (automated capture)
* Both repos structurally mirror their finops counterparts — Traces to: user requirement (consistent pattern)
* Existing scanner engine, CLI, GitHub Action, and API routes remain unchanged — Traces to: research finding (preserve scanner functionality)
* All scripts follow ADO workflow branching conventions — Traces to: ado-workflow.instructions.md
