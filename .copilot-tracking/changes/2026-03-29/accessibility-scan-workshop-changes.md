<!-- markdownlint-disable-file -->
# Release Changes: Accessibility Scan Workshop

**Related Plan**: accessibility-scan-workshop-plan.instructions.md
**Implementation Date**: 2026-03-29

## Summary

Create accessibility-scan-workshop repository structure and refactor accessibility-scan-demo-app to embed the 5 a11y demo apps as template directories with bootstrap and OIDC scripts.

## Changes

### Added

* a11y-demo-app-001/ - Rust/Actix-web travel booking demo app template (20 files)
* a11y-demo-app-002/ - C#/ASP.NET e-commerce demo app template (18 files)
* a11y-demo-app-003/ - Java/Spring Boot learning platform demo app template (24 files)
* a11y-demo-app-004/ - Python/Flask recipe sharing demo app template (18 files)
* a11y-demo-app-005/ - Go fitness tracker demo app template (18 files)
* scripts/setup-oidc.ps1 - Azure AD OIDC federation setup script (140 lines)
* scripts/bootstrap-demo-apps.ps1 - Demo app repository bootstrapper script (262 lines)

### Modified

* README.md - Added Demo Applications, Scripts, Bootstrap Quick Start, and updated Project Structure sections

### Added (accessibility-scan-workshop repo)

* README.md - Workshop landing page with 8-lab overview, prerequisites, and usage instructions
* index.md - Jekyll GitHub Pages landing page
* _config.yml - Jekyll site configuration (just-the-docs theme)
* Gemfile - Ruby dependency file for Jekyll build
* _includes/head-custom.html - Custom head element for GitHub Pages
* CONTRIBUTING.md - Lab authoring style guide with structure templates
* LICENSE - MIT License
* .gitignore - Ruby/Jekyll/OS ignores
* labs/lab-00-setup.md - Lab 00: Prerequisites and Environment Setup (93 lines)
* labs/lab-01.md - Lab 01: Explore the Demo Apps and WCAG Violations (147 lines)
* labs/lab-02.md - Lab 02: axe-core Automated Accessibility Testing (168 lines)
* labs/lab-03.md - Lab 03: IBM Equal Access Comprehensive Policy Scanning (157 lines)
* labs/lab-04.md - Lab 04: Custom Playwright Checks Manual Inspection (173 lines)
* labs/lab-05.md - Lab 05: SARIF Output and GitHub Security Tab (151 lines)
* labs/lab-06.md - Lab 06: GitHub Actions Pipelines and Scan Gates (159 lines)
* labs/lab-07.md - Lab 07: Remediation Workflows with Copilot Agents (124 lines)
* images/lab-00/README.md - Screenshot inventory for Lab 00 (7 screenshots)
* images/lab-01/README.md - Screenshot inventory for Lab 01 (6 screenshots)
* images/lab-02/README.md - Screenshot inventory for Lab 02 (6 screenshots)
* images/lab-03/README.md - Screenshot inventory for Lab 03 (5 screenshots)
* images/lab-04/README.md - Screenshot inventory for Lab 04 (5 screenshots)
* images/lab-05/README.md - Screenshot inventory for Lab 05 (6 screenshots)
* images/lab-06/README.md - Screenshot inventory for Lab 06 (7 screenshots)
* images/lab-07/README.md - Screenshot inventory for Lab 07 (5 screenshots)
* images/lab-dependency-diagram.mmd - Mermaid lab dependency diagram
* scripts/capture-screenshots.ps1 - Automated screenshot capture script (651 lines, 3 phases, 47 screenshots)

### Removed

## Additional or Deviating Changes

* Workshop repo created as local sibling directory (not yet pushed to GitHub remote)
  * Reason: Repository creation requires `gh repo create` which is a remote operation; local structure is complete
* capture-screenshots.ps1 Phase 2/3 screenshots require running demo apps and GitHub authentication
  * Reason: Screenshots from live apps, Azure portal, and GitHub web UI can only be captured at runtime
* Step 8.4 (bootstrap dry-run) and Step 8.5 (capture Phase 1) deferred to runtime
  * Reason: Bootstrap requires GitHub CLI authentication; capture requires Charm freeze installed

## Release Summary

### Scanner Repo (accessibility-scan-demo-app)

* **7 files added**: 5 demo app template directories (001-005), 2 PowerShell scripts
* **1 file modified**: README.md updated with demo apps, scripts, and quick-start sections
* **0 files removed**
* No changes to existing scanner engine, CLI, API routes, GitHub Actions, or infrastructure code

### Workshop Repo (accessibility-scan-workshop)

* **29 files created**: 8 lab documents, 8 screenshot inventory READMEs, 1 capture script, 1 Mermaid diagram, 10 infrastructure files (Jekyll, LICENSE, CONTRIBUTING, etc.)
* Structure mirrors finops-scan-workshop pattern with just-the-docs Jekyll theme
* 47 screenshots mapped across 3 capture phases (offline, app-dependent, GitHub web UI)
* capture-screenshots.ps1 supports lab filtering, phase filtering, custom themes, and Charm freeze + Playwright dual capture

### Deployment Notes

1. Push scanner repo changes to `main` or feature branch per ADO workflow
2. Create `accessibility-scan-workshop` GitHub repo with `gh repo create`
3. Push workshop directory contents to the new repo
4. Enable GitHub Pages (Settings > Pages > Deploy from branch: main)
5. Run `.\scripts\capture-screenshots.ps1 -Phase 1` for offline screenshots
6. Start demo apps and scanner, then run `-Phase 2` for app screenshots
7. Run `-Phase 3` for GitHub web UI screenshots after workflows complete
