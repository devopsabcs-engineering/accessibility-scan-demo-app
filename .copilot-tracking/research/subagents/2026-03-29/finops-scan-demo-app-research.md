# Research: finops-scan-demo-app Repository

## Status: Complete

## Research Questions

1. Full repository structure (all directories and key files)
2. Whether it contains 5 demo app templates (app-001 to app-005)
3. Bootstrap scripts (bootstrap.ps1, setup-oidc.ps1, etc.)
4. Package.json and key configuration files
5. How it organizes demo apps
6. GitHub Actions workflows
7. Infrastructure-as-code (bicep, terraform, etc.)
8. README structure and content

---

## 1. Full Repository Structure

From the README `Project Structure` section, the repo is organized as:

```text
finops-scan-demo-app/
├── .github/
│   ├── agents/                      # 5 FinOps Copilot agent definitions
│   ├── instructions/                # Governance and workflow rules
│   │   ├── ado-workflow.instructions.md
│   │   └── finops-governance.instructions.md
│   ├── skills/finops-scan/          # Scanner tool knowledge skill
│   ├── prompts/                     # finops-scan and finops-fix prompts
│   └── workflows/
│       ├── finops-scan.yml          # Central scan (PSRule+Checkov+Custodian)
│       ├── finops-cost-gate.yml     # PR cost gate (Infracost)
│       ├── deploy-all.yml           # Deploy all 5 demo apps
│       └── teardown-all.yml         # Teardown all 5 demo apps
├── src/
│   ├── converters/
│   │   ├── custodian-to-sarif.py    # Cloud Custodian → SARIF (with RG filter)
│   │   └── infracost-to-sarif.py    # Infracost → SARIF
│   └── config/
│       ├── ps-rule.yaml             # PSRule (Bicep expansion, GA baseline)
│       ├── .checkov.yaml            # Checkov (Bicep/ARM framework)
│       ├── infracost.yml            # Infracost project config
│       └── custodian/               # Cloud Custodian policies
│           ├── orphan-detection.yml
│           ├── tagging-compliance.yml
│           ├── right-sizing.yml
│           └── idle-resources.yml
├── scripts/
│   ├── bootstrap-demo-apps.ps1      # Create repos, push content, set secrets
│   └── setup-oidc.ps1               # Azure AD OIDC federation (6 repos)
├── finops-demo-app-001/             # Demo app source (Missing Tags)
├── finops-demo-app-002/             # Demo app source (Oversized Resources)
├── finops-demo-app-003/             # Demo app source (Orphaned Resources)
├── finops-demo-app-004/             # Demo app source (No Auto-Shutdown)
├── finops-demo-app-005/             # Demo app source (Redundant/Expensive)
├── docs/                            # Power BI data model + dashboard docs
│   ├── power-bi-data-model.md
│   ├── power-bi-dashboard-design.md
│   ├── power-query-finops-alerts.md
│   ├── power-query-resource-graph.md
│   └── finops-toolkit-integration.md
└── README.md
```

**Key difference from accessibility-scan-demo-app:** This repo does NOT use `package.json` / Node.js / Next.js. It is a **pure infrastructure/scanner** project with Python converters, PowerShell scripts, Bicep IaC, and YAML config. No npm, no `node_modules`.

---

## 2. Demo App Templates (Confirmed: 5 Apps)

The repo contains **5 demo app directories embedded within it** (NOT separate repos by default — they are pushed to separate repos by the bootstrap script):

| Directory | Violation | Key Resources | Scan Findings |
|-----------|-----------|---------------|---------------|
| `finops-demo-app-001/` | Missing required tags (zero tags) | Storage + App Service (B1) + Web App | PSRule: 19, Checkov: 14, Custodian: 1 |
| `finops-demo-app-002/` | Oversized resources for dev | P3v3 App Service Plan + Premium storage | PSRule: 14, Checkov: 14, Custodian: 2 |
| `finops-demo-app-003/` | Orphaned resources | Unattached Public IP + NIC + Disk + NSG | PSRule: 4, Checkov: 3, Custodian: 4 |
| `finops-demo-app-004/` | No auto-shutdown on VM | D4s_v5 VM running 24/7 | Checkov: 7, Custodian: 3 |
| `finops-demo-app-005/` | Redundant/expensive resources | Duplicate S3 plans (westeurope/southeastasia) + GRS | PSRule: 27, Checkov: 23, Custodian: 2 |

### Each demo app contains

- `Dockerfile` — `FROM nginx:alpine` with `COPY src/index.html`
- `src/index.html` — Simple HTML page describing the violation
- `infra/main.bicep` — Azure Bicep template with intentional violations
- `README.md` — Structured with: Purpose, Intentional Violation, Expected Scanner Findings, Resources Deployed, Local Development, Deploy to Azure, Teardown
- `start-local.ps1` — Docker build + run on ports 8081-8085
- `stop-local.ps1` — Docker stop + rm

### Demo app README structure (each one)

```yaml
---
title: "FinOps Demo App NNN — <Violation Name>"
description: "<description>"
---

## Purpose
## Intentional Violation
## Expected Scanner Findings
## Resources Deployed
## Local Development
## Deploy to Azure
## Teardown
```

---

## 3. Bootstrap Scripts

### `scripts/bootstrap-demo-apps.ps1` (~309 lines)

- **Purpose:** Creates `finops-demo-app-001` through `finops-demo-app-005` repos under `devopsabcs-engineering` using GitHub CLI
- **Idempotent:** Skips repos that already exist
- **Params:** `-Org` (default: `devopsabcs-engineering`), `-ScannerRepo` (default: `finops-scan-demo-app`)
- **What it does:**
  1. Collects OIDC values (env vars or prompted: `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`)
  2. Collects `ORG_ADMIN_TOKEN` for wiki push
  3. Runs `setup-oidc.ps1` if Azure CLI is logged in
  4. For each of 5 apps:
     - Creates public repo (`gh repo create`)
     - Pushes demo app content from local `finops-demo-app-NNN/` directory
     - Sets topics: `finops`, `demo`, `azure`, `cost-governance`
     - Enables code scanning default setup
     - Configures OIDC secrets (`AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`)
     - Creates `production` environment (for teardown approval gate)
     - Configures `ORG_ADMIN_TOKEN` for wiki push
     - Special: configures `VM_ADMIN_PASSWORD` for app-004 (prompted, default: `F1nOps#Demo2026!`)
     - Initializes wiki (or notes manual step needed)
  5. Configures `INFRACOST_API_KEY` on scanner repo
  6. Configures OIDC secrets on scanner repo
  7. Configures `ORG_ADMIN_TOKEN` on scanner repo and initializes scanner wiki
  8. Prints any wikis needing manual initialization

### `scripts/setup-oidc.ps1` (~142 lines)

- **Purpose:** Sets up OIDC federation for GitHub Actions to authenticate with Azure
- **Idempotent:** Safe to run multiple times
- **What it does (5 steps):**
  1. Gets or creates Azure AD app registration (`finops-scanner-github-actions`)
  2. Creates federated credentials for all 6 repos (scanner + 5 demo apps) — each gets a `main` branch credential; demo apps also get a `production` environment credential for teardown
  3. Creates or gets service principal
  4. Assigns Contributor role on subscription
  5. Outputs AZURE_CLIENT_ID / AZURE_TENANT_ID / AZURE_SUBSCRIPTION_ID for GitHub Secrets

---

## 4. Package.json / Key Configuration Files

**There is NO `package.json` in this repo.** This is a pure infrastructure/scanner project.

Key configuration files:

- `src/config/ps-rule.yaml` — PSRule for Azure config (Bicep expansion, GA_2024_12 baseline)
- `src/config/.checkov.yaml` — Checkov config (Bicep/ARM framework)
- `src/config/infracost.yml` — Infracost project config
- `src/config/custodian/` — 4 Cloud Custodian policy YAML files:
  - `orphan-detection.yml`
  - `tagging-compliance.yml`
  - `right-sizing.yml`
  - `idle-resources.yml`

---

## 5. How It Organizes Demo Apps

### Architecture: Hub-and-Spoke

- **Central scanner repo** (`finops-scan-demo-app`) contains:
  - All scanning workflows, converters, config
  - Demo app **source templates** embedded as directories (`finops-demo-app-001/` to `finops-demo-app-005/`)
  - Bootstrap scripts to create separate repos from these templates

- **5 separate repos** (`finops-demo-app-001` to `finops-demo-app-005`) are created at bootstrap time:
  - Each gets its own `deploy.yml` and `teardown.yml` workflows (pushed from the template dirs)
  - Each has its own Bicep IaC, Dockerfile, index.html, start/stop scripts
  - Each deploys to its own Azure resource group (`rg-finops-demo-NNN`)
  - Each has its own GitHub wiki for deployment status

- **Bootstrap flow:** `scripts/bootstrap-demo-apps.ps1` reads local `finops-demo-app-NNN/` directories, creates GitHub repos, and pushes content into them.

### Key pattern: Template directories inside scanner repo

The demo apps live as directories inside the scanner repo and are pushed to separate repos. This means:
- Single source of truth for demo app content
- Bootstrap script handles repo creation, secrets, environments, wiki setup
- Updates to demo apps can be made in the scanner repo and re-pushed

---

## 6. GitHub Actions Workflows

### Scanner repo workflows (`.github/workflows/`)

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `finops-scan.yml` | Weekly (Monday 06:00 UTC) or manual | Central scan — PSRule + Checkov + Cloud Custodian across all 5 apps (matrix strategy). Uploads SARIF to each demo app's Security tab via REST API. |
| `finops-cost-gate.yml` | PR trigger | PR cost gate using Infracost — estimates infrastructure costs from Bicep |
| `deploy-all.yml` | Manual | Deploys all 5 apps sequentially, waits for each, updates scanner wiki with consolidated status |
| `teardown-all.yml` | Manual | Tears down all 5 apps; requires `production` environment approval |

### Demo app workflows (pushed to each demo app repo)

Each demo app repo gets:
- `deploy.yml` — Azure OIDC login, Bicep deployment, static content deploy (zip), Playwright screenshot, wiki update
- `teardown.yml` — Deletes resource group with `production` environment approval gate

### Deployment features

- Azure OIDC login (passwordless via federated identity)
- Bicep deployment (creates RG + deploys IaC)
- Static content deploy (zip deploys `src/index.html` to web apps for 001, 002, 005)
- GitHub Actions job summary (clickable deployment URL)
- **Playwright screenshot** — captures deployed web app and pushes to wiki
- Wiki update — pushes deployment status and screenshot to repo wiki

---

## 7. Infrastructure-as-Code

All IaC is **Bicep** (no Terraform). Each demo app has `infra/main.bicep`:

| App | Bicep Resources | Intentional Issue |
|-----|----------------|-------------------|
| 001 | Storage Account (Standard_LRS) + App Service Plan (B1) + Web App | Zero tags on all resources |
| 002 | App Service Plan (P3v3) + Storage Account (Premium_LRS) + Web App | Oversized SKUs tagged as Development |
| 003 | VNet + Public IP + NIC + Managed Disk (128GB Premium) + NSG | All resources orphaned (not attached) |
| 004 | VNet + NSG + Public IP + NIC + VM (D4s_v5) | No `Microsoft.DevTestLab/schedules` auto-shutdown |
| 005 | 2x App Service Plans (S3 in westeurope + southeastasia) + 2x Web Apps + Storage (GRS) | Non-approved regions, duplicate plans, unnecessary geo-redundancy |

All use `// INTENTIONAL-FINOPS-ISSUE:` comments to document the deliberate violations.

---

## 8. README Structure and Content

### Root README (`README.md`, ~309 lines)

Has YAML frontmatter:
```yaml
---
title: FinOps Cost Governance Scanner
description: Centralized FinOps cost governance scanning platform...
author: devopsabcs-engineering
ms.date: 2026-03-28
---
```

Sections:
1. **Architecture** — Mermaid diagram showing hub-and-spoke model
2. **Tool Stack** — Table: PSRule, Checkov, Cloud Custodian, Infracost
3. **Demo App Repos** — Table with 5 rows linking to demo app repos, violations, findings
4. **Prerequisites** — Azure CLI, GitHub CLI, PowerShell 7, Azure subscription, Infracost
5. **Secrets Configuration** — Infracost API Key, OIDC Secrets, ORG_ADMIN_TOKEN, VM password
6. **Quick Start** — 6-step guide (OIDC, bootstrap, wikis, deploy, scan, teardown)
7. **Project Structure** — Full directory tree
8. **Agentic Framework Integration** — 5 FinOps Copilot agents (CostAnalysis, Governance, Anomaly, Optimizer, CostGate)
9. **Scanning Pipeline** — PSRule, Checkov, Cloud Custodian, cross-repo SARIF upload
10. **Deployment Features** — OIDC, Bicep, Playwright screenshots, wiki updates
11. **Wiki Pages** — Deployment pages with screenshots
12. **Related Resources** — Links to FinOps Foundation, Azure WAF, Microsoft FinOps Toolkit, PSRule, Checkov, Cloud Custodian, Infracost

---

## 9. Additional Copilot Customization Assets

### `.github/agents/` — 5 FinOps Copilot agent definitions

Agents referenced in README:
- CostAnalysisAgent
- FinOpsGovernanceAgent
- CostAnomalyDetector
- CostOptimizerAgent
- DeploymentCostGateAgent

### `.github/instructions/`

- `ado-workflow.instructions.md`
- `finops-governance.instructions.md`

### `.github/skills/finops-scan/`

Scanner tool knowledge skill for Copilot

### `.github/prompts/`

- `finops-scan` prompt
- `finops-fix` prompt

---

## 10. Docs Directory

Comprehensive Power BI integration documentation:

| File | Purpose |
|------|---------|
| `docs/power-bi-data-model.md` | Star schema data model (Repositories, FinOpsAlerts, CostData, ScanTools, GovernanceTags) |
| `docs/power-bi-dashboard-design.md` | 6-page dashboard design (Compliance, Cost Trend, Tagging, Right-Sizing, Orphans, Budget) |
| `docs/power-query-finops-alerts.md` | Power Query M for GitHub Code Scanning API |
| `docs/power-query-resource-graph.md` | Power Query M for Azure Resource Graph tagging compliance |
| `docs/finops-toolkit-integration.md` | Integration with Microsoft FinOps Toolkit v13 / FOCUS |

---

## 11. Converter Scripts (`src/converters/`)

Two Python scripts that convert tool-specific output to SARIF format:

- `custodian-to-sarif.py` — Converts Cloud Custodian JSON output to SARIF v2.1.0 with `--resource-group` filter
- `infracost-to-sarif.py` — Converts Infracost JSON breakdown to SARIF v2.1.0 with `--threshold` parameter

---

## Key Patterns for accessibility-scan-demo-app to Follow

1. **Hub-and-spoke architecture** — Scanner repo contains demo app templates embedded as directories
2. **Bootstrap script** (`scripts/bootstrap-demo-apps.ps1`) — Creates separate repos from template dirs, sets up secrets, environments, wiki
3. **OIDC setup script** (`scripts/setup-oidc.ps1`) — Federated credentials for all repos
4. **Each demo app has:** Dockerfile, src/index.html, infra/main.bicep, README.md, start-local.ps1, stop-local.ps1
5. **Each demo app has its own `.github/workflows/`** directory with deploy.yml and teardown.yml
6. **Intentional violations** documented with `// INTENTIONAL-*-ISSUE:` comments in Bicep
7. **SARIF output** — All tools produce SARIF, uploaded to GitHub Security tab via REST API
8. **Playwright screenshots** in deploy workflows, pushed to wiki
9. **Power BI integration docs** in `docs/` directory
10. **5 Copilot agents + instructions + skills + prompts** in `.github/`

---

## Remaining Gaps

- [ ] Exact workflow YAML contents not retrieved (only described in README — would need direct file reads)
- [ ] Copilot agent `.md` files content not retrieved (only directory mentioned)
- [ ] `finops-governance.instructions.md` content not retrieved
- [ ] Cloud Custodian policy YAML contents not retrieved
- [ ] PSRule / Checkov / Infracost config file contents not retrieved
