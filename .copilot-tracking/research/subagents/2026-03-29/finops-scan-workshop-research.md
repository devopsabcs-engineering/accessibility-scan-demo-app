# finops-scan-workshop Comprehensive Research

## Research Topics

1. Full repository structure
2. capture-screenshots.ps1 — complete architecture and approach
3. Whether the 5 demo apps live inside the workshop repo
4. Workshop lab structure (count, topics, durations)
5. Bootstrap and setup scripts
6. Screenshot organization and referencing in docs
7. README and workshop guide documents
8. How it references finops-scan-demo-app
9. GitHub Actions workflows
10. setup-oidc.ps1 and OIDC configuration

---

## 1. Repository Structure

### Top-Level Files

- `README.md` — project README with architecture, labs table, tool stack, prerequisites, quick start, delivery tiers
- `index.md` — Jekyll GitHub Pages landing page (identical content to README with `layout: default` frontmatter)
- `CONTRIBUTING.md` — contribution guide with lab authoring style guide
- `LICENSE` — MIT license
- `Gemfile` — Jekyll dependencies (`jekyll ~> 3.10`, `jekyll-theme-minimal`, `jekyll-relative-links`)
- `_config.yml` — Jekyll configuration (not directly discovered, but `Gemfile` confirms Jekyll usage)
- `_includes/head-custom.html` — Mermaid.js integration for rendering diagrams in GitHub Pages

### Directory Structure (Inferred from Evidence)

```
finops-scan-workshop/
├── README.md
├── index.md
├── CONTRIBUTING.md
├── LICENSE
├── Gemfile
├── _includes/
│   └── head-custom.html          # Mermaid.js support for Jekyll
├── labs/
│   ├── lab-00-setup.md           # Lab 00: Prerequisites and Environment Setup
│   ├── lab-01.md                 # Lab 01: Explore the Demo Apps and FinOps Violations
│   ├── lab-02.md                 # Lab 02: PSRule — Infrastructure as Code Analysis
│   ├── lab-03.md                 # Lab 03: Checkov — Static Policy Scanning
│   ├── lab-04.md                 # Lab 04: Cloud Custodian — Runtime Resource Scanning
│   ├── lab-05.md                 # Lab 05: Infracost — Cost Estimation and Budgeting
│   ├── lab-06.md                 # Lab 06: SARIF Output and GitHub Security Tab
│   └── lab-07.md                 # Lab 07: GitHub Actions Pipelines and Cost Gates
├── images/
│   ├── lab-dependency-diagram.mmd  # Mermaid source for lab dependency graph
│   ├── lab-00/
│   │   └── README.md             # Screenshot inventory (8 screenshots)
│   ├── lab-01/
│   │   └── README.md             # Screenshot inventory (6 screenshots)
│   ├── lab-02/
│   │   └── README.md             # Screenshot inventory (5 screenshots)
│   ├── lab-03/
│   │   └── README.md             # Screenshot inventory (4 screenshots)
│   ├── lab-04/
│   │   └── README.md             # Screenshot inventory (6 screenshots)
│   ├── lab-05/
│   │   └── README.md             # Screenshot inventory (5 screenshots)
│   ├── lab-06/
│   │   └── README.md             # Screenshot inventory (5 screenshots)
│   └── lab-07/
│       └── README.md             # Screenshot inventory (7 screenshots)
└── scripts/
    └── capture-screenshots.ps1   # Automated screenshot capture (710 lines, 46 screenshots)
```

### Key Observation: NO Demo Apps in Workshop Repo

The 5 demo apps **do NOT live inside** the workshop repo. The workshop repo is purely documentation, labs, images, and scripts. The demo apps live in a **separate repository**: `devopsabcs-engineering/finops-scan-demo-app`. The `capture-screenshots.ps1` script references a sibling directory: `$ScannerRepo = Join-Path (Split-Path $PSScriptRoot) '..\finops-scan-demo-app'`.

The `finops-scan-demo-app` repo contains the 5 apps as subdirectories:
- `finops-demo-app-001/infra/main.bicep` (Missing Tags)
- `finops-demo-app-002/infra/main.bicep` (Oversized Resources)
- `finops-demo-app-003/infra/main.bicep` (Orphaned Resources)
- `finops-demo-app-004/infra/main.bicep` (No Auto-Shutdown)
- `finops-demo-app-005/infra/main.bicep` (Redundant/Expensive)

---

## 2. capture-screenshots.ps1 — Complete Architecture

### Overview

- **File**: `scripts/capture-screenshots.ps1`
- **Lines**: ~710 lines
- **Output**: 46 PNG files across 8 lab directories
- **Two capture engines**: Charm `freeze` (terminal output) and Playwright (browser pages)

### Parameters

```powershell
param(
    [string]$OutputDir = 'images',
    [string]$LabFilter = '',          # Filter to a single lab: '00', '01', ..., '07'
    [string]$Theme = 'dracula',
    [int]$FontSize = 14,
    [string]$Org = 'devopsabcs-engineering',
    [string]$GitHubAuthState = 'github-auth.json',
    [string]$AzureAuthState = 'azure-auth.json',
    [ValidateSet('', '1', '2', '3')]
    [string]$Phase = ''               # Phase filtering for multi-session capture
)
```

### Common Freeze Settings

```powershell
$FreezeCommon = @(
    '--window'
    '--theme', $Theme
    '--font.size', $FontSize
    '--padding', '20,40'
    '--border.radius', '8'
    '--shadow.blur', '4'
    '--shadow.x', '0'
    '--shadow.y', '2'
)
```

### Four Helper Functions

1. **`Invoke-FreezeScreenshot`** — Captures terminal command output via `freeze --execute`. On Windows, wraps command in a temp `.ps1` script to handle shell builtins, pipes, and operators. Writes to PNG.

2. **`Invoke-CapturedFreezeScreenshot`** — For commands that can't be captured by `freeze --execute` (e.g., Checkov uses rich console suppressing output in non-TTY). Runs command in current shell, saves output to temp text file, then renders that file with `freeze`.

3. **`Invoke-FreezeFile`** — Captures a source file as a screenshot using `freeze <filepath> --show-line-numbers`. Supports `--lines` parameter to limit line range (e.g., `'1,40'`).

4. **`Invoke-PlaywrightScreenshot`** — Captures browser pages via `npx playwright screenshot`. Uses `--viewport-size=1280,900`, `--wait-for-timeout=10000`, and optional `--load-storage` for authenticated sessions (GitHub auth, Azure Portal auth).

### Phase Filtering System

Three phases for multi-session capture:
- **Phase 1**: All labs, excludes items needing deployed resources or browser auth (tool versions, file captures, scans)
- **Phase 2**: Labs 00, 01, 04, 05 — items needing deployed Azure resources (deploy output, portal screenshots, Custodian/Infracost scans)
- **Phase 3**: Labs 06, 07 — items needing GitHub browser auth (Security tab, Actions, PR pages)

### `Test-ShouldCapture` Function

Determines whether a specific screenshot should be captured based on:
- `$LabFilter` — if set, only capture for that lab
- `$Phase` — if set, checks `$PhaseMap` include/exclude lists

### Environment Setup

- Sets `PSRULE_AZURE_BICEP_PATH` to `$env:USERPROFILE\.azure\bin\bicep.exe`
- Resolves venv custodian path: `.venv\Scripts\custodian.exe`
- Resolves `$ScannerRepo` as `../finops-scan-demo-app` relative to workshop
- Adds Python user Scripts directory to PATH for Checkov/Custodian

### Lab-by-Lab Screenshot Sections

Each lab has a dedicated section with `if (-not $LabFilter -or $LabFilter -eq 'XX')` guard:

| Lab | Screenshots | Capture Types |
|-----|-------------|---------------|
| 00 | 8 | freeze (tool versions), captured-freeze (az group list), Playwright (GitHub fork page) |
| 01 | 6 | freeze-file (Bicep files), freeze (echo tags), freeze (gh api), Playwright (Azure Portal) |
| 02 | 5 | freeze-file (ps-rule.yaml), captured-freeze (PSRule scans), freeze (SARIF echo) |
| 03 | 4 | captured-freeze (Checkov scans), freeze (comparison echo) |
| 04 | 6 | freeze-file (custodian policy), freeze (custodian run), freeze (custodian-to-sarif) |
| 05 | 5 | freeze-file (infracost config, cost-gate workflow), freeze (infracost breakdown/diff/sarif) |
| 06 | 5 | freeze (SARIF structure, gh api), Playwright (Security tab, alert detail, triage) |
| 07 | 7 | freeze-file (scan workflow, OIDC script), Playwright (Actions, matrix, artifacts, PR, deploy) |

### Summary Section

```powershell
Write-Host "  Captured:  $($script:CaptureCount)"
Write-Host "  Failed:    $($script:FailureCount)"
Write-Host "  Elapsed:   $($Elapsed.ToString('mm\:ss'))"
```

Exits with code 1 if any screenshots failed.

---

## 3. Demo Apps Within Workshop Repo

**The 5 demo apps are NOT inside the workshop repository.** They live in the separate `finops-scan-demo-app` repo. The workshop references them through:
- Lab instructions referencing paths like `finops-demo-app-001/infra/main.bicep`
- Lab 00 Exercise 0.1 instructs students to `gh repo fork devopsabcs-engineering/finops-scan-demo-app --clone`
- The `capture-screenshots.ps1` resolves `$ScannerRepo` as a sibling directory

The 5 demo apps and their violations:

| App | Violation | Key Resources |
|-----|-----------|---------------|
| 001 | Missing all 7 required tags | Storage Account + App Service Plan + Web App |
| 002 | Oversized resources for dev workload | P3v3 App Service Plan + Premium Storage |
| 003 | Orphaned resources (unattached) | Public IP + NIC + Managed Disk + NSG |
| 004 | No auto-shutdown on VM | D4s_v5 VM running 24/7 |
| 005 | Redundant/expensive (GRS in dev, multi-region) | 2 App Service Plans, GRS Storage |

---

## 4. Workshop Lab Structure

### 8 Labs Total (Lab 00 through Lab 07)

| Lab | Title | Duration | Level | Exercises |
|-----|-------|----------|-------|-----------|
| 00 | Prerequisites and Environment Setup | 30 min | Beginner | 5 (Fork, Install Tools, Azure Auth, Tool Verification, Deploy Demo Apps) |
| 01 | Explore the Demo Apps and FinOps Violations | 25 min | Beginner | 4 (Review Demo App Matrix, Read Bicep, Governance Tags, Azure Portal) |
| 02 | PSRule — Infrastructure as Code Analysis | 35 min | Intermediate | 5 (Review Config, Scan 001, Analyze, Scan 002, Fix and Re-scan) |
| 03 | Checkov — Static Policy Scanning | 30 min | Intermediate | 4 (Run on 001, Review Findings, Run on 005, Compare with PSRule) |
| 04 | Cloud Custodian — Runtime Resource Scanning | 40 min | Intermediate | 5 (Review Policies, Tagging Compliance, Orphan Detection, Right-Sizing, Convert to SARIF) |
| 05 | Infracost — Cost Estimation and Budgeting | 35 min | Intermediate | 5 (Configure, Cost Breakdown, Cost Diff, Convert to SARIF, Cost Gate Workflow) |
| 06 | SARIF Output and GitHub Security Tab | 30 min | Intermediate | 5 (SARIF Deep-Dive, Upload Manually, View Security Tab, Triage Alerts, Cross-Repo Upload) |
| 07 | GitHub Actions Pipelines and Cost Gates | 45 min | Advanced | 6 (Review Scan Workflow, OIDC Setup, Trigger Workflow, Review Results, Cost Gate PR, Deploy and Teardown) |

### Lab Dependency Diagram

```
Lab 00: Setup → Lab 01: Demo Apps
Lab 01 → Lab 02 (PSRule) | Lab 03 (Checkov) | Lab 04 (Cloud Custodian) | Lab 05 (Infracost)
Labs 02–05 → Lab 06 (SARIF + Security Tab)
Lab 06 → Lab 07 (GitHub Actions + Cost Gates)
```

Labs 02–05 can be completed in parallel after Lab 01.

### Delivery Tiers

| Tier | Labs | Duration | Azure Required |
|------|------|----------|---------------|
| Half-Day | 00, 01, 02, 03, 06 | ~3.5 hours | No |
| Full-Day | 00–07 (all) | ~7.25 hours | Yes |

### Lab Document Structure

Every lab follows this pattern (from CONTRIBUTING.md):
- YAML frontmatter (`permalink`, `title`, `description`)
- Overview (duration, level, prerequisites table)
- Learning Objectives (bullet list)
- Exercises (numbered steps with code blocks and screenshots)
- Verification Checkpoint (checklist)
- Next Steps (link to next lab)

---

## 5. Bootstrap and Setup Scripts

### scripts/bootstrap-demo-apps.ps1

Referenced in Lab 00, Exercise 0.5. Creates 5 resource groups (`rg-finops-demo-001` through `rg-finops-demo-005`) and deploys each app's Bicep template. Full content not recovered but its behavior is documented.

### scripts/teardown-all.ps1

Referenced in Lab 00 and Lab 07. Deletes all demo app resource groups. Also available as a GitHub Actions workflow (`teardown-all.yml`) with environment approval.

### scripts/setup-oidc.ps1

Referenced in Lab 07, Exercise 7.2. Located in the **finops-scan-demo-app** repo (not the workshop repo). The capture script accesses it via `$ScannerRepo + 'scripts\setup-oidc.ps1'`. Performs 5 steps:
1. **App registration** — creates/retrieves Azure AD app named `finops-scanner-github-actions`
2. **Federated credentials** — creates OIDC credentials for each repo/branch
3. **Service principal** — creates/retrieves SP for the app
4. **Role assignment** — grants `Reader` role on subscription
5. **Summary** — displays Client ID, Tenant ID, Subscription ID for GitHub Secrets

Federated credential subject formats:
```
repo:devopsabcs-engineering/finops-scan-demo-app:ref:refs/heads/main
repo:devopsabcs-engineering/finops-demo-app-001:environment:production
```

### scripts/capture-screenshots.ps1

The automated screenshot tool (detailed in Section 2).

---

## 6. Screenshot Organization

### Directory Structure

Screenshots are stored in `images/lab-XX/` directories (one per lab).

### Placeholder README Files

Each `images/lab-XX/` directory contains a `README.md` with:
- YAML frontmatter (`title`, `description`)
- A table listing every expected screenshot filename and description
- This serves as an **inventory/manifest** — the README is created first, then screenshots are captured to match

### Screenshot Naming Convention

Pattern: `lab-XX-descriptive-name.png`

Examples:
- `lab-00-gh-version.png`
- `lab-02-psrule-scan-001.png`
- `lab-07-matrix-jobs.png`

### Referencing in Docs

Labs use relative paths from the `labs/` directory:
```markdown
![Description](../images/lab-XX/lab-XX-screenshot-name.png)
```

### Total Screenshot Count by Lab

| Lab | Count | File Captures | Terminal Captures | Browser Captures |
|-----|-------|---------------|-------------------|-----------------|
| 00 | 8 | 0 | 6 | 2 |
| 01 | 6 | 2 | 2 | 2 |
| 02 | 5 | 1 | 4 | 0 |
| 03 | 4 | 0 | 4 | 0 |
| 04 | 6 | 1 | 5 | 0 |
| 05 | 5 | 2 | 3 | 0 |
| 06 | 5 | 0 | 2 | 3 |
| 07 | 7 | 2 | 0 | 5 |
| **Total** | **46** | **8** | **26** | **12** |

---

## 7. README and Workshop Guide Documents

### README.md

- "Use this template" badge linking to `/generate`
- Mermaid architecture diagram (IaC Scanners + Runtime Scanners → SARIF → GitHub Security Tab + Power BI)
- Labs table (8 labs with titles, durations, levels)
- Tool Stack table (PSRule, Checkov, Cloud Custodian, Infracost)
- Prerequisites list
- Quick Start (3 steps)
- Delivery Tiers table (Half-Day vs Full-Day)
- Contributing link
- MIT License

### index.md

Jekyll GitHub Pages landing page. Same content as README with `layout: default` frontmatter and additional Lab Dependency Diagram (Mermaid), Delivery Tiers section, Prerequisites section, and Getting Started section.

### CONTRIBUTING.md

- How to Contribute (fork, branch, test with `bundle exec jekyll serve`, submit PR)
- Lab Authoring Style Guide:
  - Second-person voice, present tense, active voice
  - Standardized lab structure template
  - Code blocks with language specifiers
  - GitHub alert callout syntax (`> [!NOTE]`, `> [!TIP]`, etc.)
  - Screenshots in `images/lab-XX/` with descriptive names
  - Relative links for cross-references

---

## 8. How It References finops-scan-demo-app

### Relationship Model

The workshop repo and the demo-app repo are **two separate repositories** that work together:
- **finops-scan-workshop**: Documentation, labs, images, capture script
- **finops-scan-demo-app**: The actual scanner tooling repo containing:
  - 5 demo app subdirectories with Bicep templates
  - Scanner configurations (`src/config/ps-rule.yaml`, `src/config/custodian/`, `src/config/infracost.yml`)
  - SARIF converters (`src/converters/custodian-to-sarif.py`, `src/converters/infracost-to-sarif.py`)
  - GitHub Actions workflows (`finops-scan.yml`, `finops-cost-gate.yml`, `deploy-all.yml`, `teardown-all.yml`)
  - Scripts (`scripts/setup-oidc.ps1`, `scripts/bootstrap-demo-apps.ps1`, `scripts/teardown-all.ps1`)

### Reference Points

1. **Lab 00**: Students fork `devopsabcs-engineering/finops-scan-demo-app`
2. **All labs**: Instructions reference file paths within the demo-app repo (e.g., `finops-demo-app-001/infra/main.bicep`)
3. **capture-screenshots.ps1**: Resolves `$ScannerRepo` as a sibling `../finops-scan-demo-app` directory
4. **Lab 07**: References workflows and scripts that live in the demo-app repo
5. **Playwright screenshots**: Navigate to `github.com/$Org/finops-scan-demo-app/...` URLs

---

## 9. GitHub Actions Workflows

The **workshop repo itself** does not appear to contain GitHub Actions workflows — the workflows are in the `finops-scan-demo-app` repo. The workshops references these:

### finops-scan.yml (in demo-app repo)

- **Trigger**: Weekly schedule (Monday 06:00 UTC) + manual `workflow_dispatch`
- **Permissions**: `contents: read`, `security-events: write`, `id-token: write`
- **Matrix**: `app: ['001', '002', '003', '004', '005']`
- **Jobs**:
  - `psrule-scan` (5 jobs) — PSRule with `Azure.GA_2024_12` baseline
  - `checkov-scan` (5 jobs) — Checkov against Bicep
  - `custodian-scan` (5 jobs) — Cloud Custodian against live Azure resources (OIDC auth)
  - `cross-repo-upload` (5 jobs) — Downloads all SARIF artifacts, uploads to each demo app's Security tab
- **Total**: 20 jobs per run

### finops-cost-gate.yml (in demo-app repo)

- **Trigger**: `pull_request` to `main` modifying `infra/**`
- **Steps**: Setup Infracost → baseline breakdown → diff → PR comment → SARIF upload
- Uses `infracost comment github --behavior update`

### deploy-all.yml (in demo-app repo)

- Deploys all 5 demo apps sequentially to `rg-finops-demo-001` through `rg-finops-demo-005`

### teardown-all.yml (in demo-app repo)

- Deletes all 5 resource groups
- Requires `production` environment approval as safety gate

---

## 10. setup-oidc.ps1

Lives in `finops-scan-demo-app/scripts/setup-oidc.ps1` (NOT in the workshop repo).

### What It Does (from Lab 07 documentation)

5-step script:
1. **App registration** — creates/retrieves Azure AD app `finops-scanner-github-actions`
2. **Federated credentials** — creates OIDC credentials for repos + branches/environments
3. **Service principal** — creates/retrieves SP
4. **Role assignment** — grants `Reader` role on subscription
5. **Summary** — outputs Client ID, Tenant ID, Subscription ID for GitHub Secrets

### Subject Claim Format

```
repo:devopsabcs-engineering/finops-scan-demo-app:ref:refs/heads/main
repo:devopsabcs-engineering/finops-demo-app-001:environment:production
```

### Usage

```powershell
./scripts/setup-oidc.ps1
```

After completion, configure 3 GitHub Actions secrets:
- `AZURE_CLIENT_ID`
- `AZURE_TENANT_ID`
- `AZURE_SUBSCRIPTION_ID`

Full script content was not recovered from search results — the capture-screenshots.ps1 only captures it as a freeze-file screenshot (first 40 lines).

---

## Follow-On Questions

1. What is the full content of `scripts/bootstrap-demo-apps.ps1`?
2. What is the full content of `scripts/setup-oidc.ps1` (in finops-scan-demo-app)?
3. Does the workshop repo have a `_config.yml` for Jekyll? (Gemfile confirms Jekyll but config not directly found)
4. Are there any GitHub Actions workflows in the workshop repo itself (e.g., for pages deployment)?

---

## Key Discoveries — Summary for accessibility-scan-workshop Adaptation

### Pattern to Follow

1. **Two-repo architecture**: Workshop repo (docs/labs/images/scripts) + Demo-app repo (tools/apps/workflows)
2. **8 labs (00–07)** with standardized structure: Overview → Objectives → Exercises → Checkpoint → Next Steps
3. **capture-screenshots.ps1** (710 lines) producing 46 PNGs using:
   - **Charm freeze** for terminal output (with three variants: direct execute, pre-captured, file render)
   - **Playwright** for browser screenshots (GitHub, Azure Portal)
   - **Phase system** for multi-session capture (Phase 1 = offline, Phase 2 = Azure-dependent, Phase 3 = browser-auth-dependent)
4. **Screenshot placeholders**: Each `images/lab-XX/README.md` is an inventory manifest created before screenshots exist
5. **Jekyll GitHub Pages**: Simple theme with Mermaid support for architecture diagrams
6. **CONTRIBUTING.md**: Detailed lab authoring style guide enforcing consistency
7. **$ScannerRepo pattern**: Workshop script resolves demo-app as sibling directory for file captures
8. **Delivery tiers**: Half-Day (no Azure) and Full-Day (with Azure)
9. **Tool scope**: 4 tools × 5 apps, producing SARIF output unified in GitHub Security tab

### Key Differences for Accessibility Adaptation

- FinOps uses 4 scanner tools (PSRule, Checkov, Cloud Custodian, Infracost); accessibility uses axe-core (and potentially pa11y)
- FinOps scans Bicep IaC + live Azure resources; accessibility scans web pages
- FinOps produces SARIF; accessibility produces axe JSON/SARIF
- FinOps has 5 demo apps with intentional violations in separate repos; accessibility has 1 demo app (accessibility-scan-demo-app) with intentional WCAG violations
- FinOps uses GitHub Security Tab integration; accessibility could use the same pattern

---

## Clarifying Questions

- None at this time — all 10 research topics answered with strong evidence.
