# Accessibility Scan Demo App - Workspace Analysis Research

## Research Topics

1. Full directory listing of `.github/` and all subdirectories
2. Content of all `.github/workflows/` YAML files
3. Content of any `scripts/` directory
4. Content of `infra/main.bicep`
5. Content of `Dockerfile`
6. Content of `start-local.ps1` and `stop-local.ps1`
7. Listing of `.github/agents/`, `.github/instructions/`, `.github/skills/`, `.github/prompts/`
8. Content of `src/app/page.tsx` and `src/app/layout.tsx`
9. Content of `action/action.yml`
10. Check for root-level `scripts/` directory

---

## 1. Root Directory Structure

```text
.achecker.yml
.azuredevops/
.copilot-tracking/
.dockerignore
.git/
.github/
.gitignore
.next/
action/
assets/
Dockerfile
e2e/
eslint.config.mjs
infra/
messages/
next-env.d.ts
next.config.ts
node_modules/
package-lock.json
package.json
playwright.config.ts
postcss.config.mjs
public/
README.md
results/
src/
start-local.ps1
stop-local.ps1
tsconfig.json
vitest.config.ts
```

**No root-level `scripts/` directory exists.** Scripts only exist inside `.github/skills/` subfolders (xlsx, pptx) — these are HVE skill scripts, not project scripts.

---

## 2. `.github/` Directory Full Listing

```text
.github/
├── agents/
│   ├── a11y-detector.agent.md
│   └── a11y-resolver.agent.md
├── instructions/
│   ├── a11y-remediation.instructions.md
│   ├── ado-workflow.instructions.md
│   └── wcag22-rules.instructions.md
├── prompts/
│   ├── a11y-fix.prompt.md
│   └── a11y-scan.prompt.md
├── skills/
│   ├── .gitkeep
│   ├── docx/
│   ├── pdf/
│   ├── power-bi-dax-optimization/
│   ├── power-bi-model-design-review/
│   ├── power-bi-performance-troubleshooting/
│   ├── power-bi-report-design-consultation/
│   ├── powerbi-modeling/
│   ├── pptx/
│   └── xlsx/
└── workflows/
    ├── a11y-scan.yml
    ├── ci.yml
    ├── deploy-all.yml
    ├── deploy.yml
    └── scan-all.yml
```

---

## 3. `.github/workflows/` - All Workflow YAML Files

### 3.1 `ci.yml` — CI Pipeline

- **Triggers:** push to main, PRs to main, manual dispatch
- **Jobs:** Single job "Lint, Test & Build"
  - npm ci, lint, vitest with coverage, upload test results + coverage artifacts
  - Build Next.js, install Playwright, run self-scan e2e tests
  - Upload a11y results artifact, test reporter for both unit and a11y tests
- **Concurrency:** cancel-in-progress per PR/ref

### 3.2 `deploy.yml` — Build and Deploy to Azure

- **Triggers:** push to main, manual dispatch
- **Jobs:** Single job
  - Azure Login (OIDC federated identity)
  - Deploy infra via `azure/arm-deploy@v2` with `infra/main.bicep`
  - Build and push Docker image to ACR
  - Restart Web App
  - Step summary with deployment link
- **Resource Group:** `rg-a11y-scan-demo`
- **App Name:** `a11y-scan-demo`

### 3.3 `deploy-all.yml` — Deploy All Demo Apps (Orchestrator)

- **Triggers:** manual dispatch only
- **Jobs:**
  1. `dispatch-apps` — matrix dispatches `ci-cd.yml` to 5 sibling repos (a11y-demo-app-001 through 005) via `gh workflow run`, waits for completion
  2. `deploy-scan-demo` — deploys scanner app (self repo) in parallel
  3. `teardown` — requires `teardown` environment approval, deletes all 6 resource groups
- **Sibling repos:** a11y-demo-app-001 (Rust), 002 (C#), 003 (Java), 004 (Python), 005 (Go)
- uses `DISPATCH_PAT` secret for cross-repo dispatch

### 3.4 `a11y-scan.yml` — Scheduled Accessibility Scan

- **Triggers:** weekly Monday 06:00 UTC, manual dispatch
- **Matrix:** codepen-sample, a11y-scan-demo-app, ontario-gov
- **Process:** POST to scanner API `/api/ci/scan` for SARIF, upload SARIF to GitHub Security tab
- **Scanner URL:** `https://a11y-scan-demo-app.azurewebsites.net`

### 3.5 `scan-all.yml` — Scan All Demo Apps (Orchestrator)

- **Triggers:** manual dispatch only
- **Matrix:** dispatches `a11y-scan.yml` workflow in repos 001-005 via `gh workflow run`, waits for completion

---

## 4. `.azuredevops/pipelines/` — ADO Pipeline Files

```text
.azuredevops/pipelines/
├── a11y-scan-advancedsecurity.yml
├── a11y-scan.yml
├── adv-sec-scan.yml
├── ci-cd.yml
├── deploy-all.yml
├── scan-all.yml
└── templates/
    ├── deploy-app-stage.yml
    └── teardown-stage.yml
```

### 4.1 `ci-cd.yml` — Full CI/CD Pipeline (ADO)

- **Triggers:** main branch
- **Variable group:** `wiki-access`
- **Service connection:** `AODA-svc-conn`
- **Stages:** Build (deploy infra + ACR build), Deploy (update webapp + restart + screenshot + wiki update)
- Wiki update publishes deployment screenshot to ADO wiki on `wikiMaster` branch

### 4.2 `deploy-all.yml` — Deploy All Demo Apps (ADO)

- Uses repository resources for repos 001-005
- Uses `templates/deploy-app-stage.yml` template for each app
- Uses `templates/teardown-stage.yml` for cleanup
- Deploys scan demo app in parallel stage

### 4.3 `a11y-scan.yml` — Weekly Scheduled Scan (ADO)

- Cron `0 6 * * 1`, matrix scan of 3 sites
- Publishes SARIF to Advanced Security (`AdvancedSecurity-Publish@1`)

### 4.4 `a11y-scan-advancedsecurity.yml` — Same as a11y-scan.yml with Advanced Security

- Identical to `a11y-scan.yml` with slight difference in artifact publishing

### 4.5 `scan-all.yml` — Scan All Demo Apps (ADO)

- Matrix scan of 5 demo app URLs directly (no dispatch, direct scan)
- Publishes SARIF to Advanced Security

### 4.6 `adv-sec-scan.yml` — Advanced Security Scan

- Triggers on main
- Runs CodeQL init (javascript, python), dependency scanning, CodeQL analysis
- Additionally runs accessibility scan and stages SARIF for Advanced Security

### 4.7 `templates/deploy-app-stage.yml` — Reusable Deploy Stage

- Parameters: stageId, stageName, appName, resourceGroup, repository, containerPort
- Steps: checkout sibling repo, deploy infra from that repo's `infra/main.bicep`, ACR build, deploy container

### 4.8 `templates/teardown-stage.yml` — Reusable Teardown Stage

- Parameters: resourceGroups list, dependsOn stages
- Uses `teardown` environment (approval gate)
- Iterates and deletes each resource group with `--no-wait`

---

## 5. Infrastructure (`infra/main.bicep`)

Resources provisioned:

| Resource | Type | Purpose |
|----------|------|---------|
| ACR | `Microsoft.ContainerRegistry/registries` | Basic SKU, admin enabled |
| Log Analytics | `Microsoft.OperationalInsights/workspaces` | PerGB2018, 30-day retention |
| Application Insights | `Microsoft.Insights/components` | Web type, workspace-based |
| App Service Plan | `Microsoft.Web/serverfarms` | Linux, P1v3 SKU |
| Web App | `Microsoft.Web/sites` | Linux container, port 3000, HTTPS only |

Parameters: `appName`, `location` (default: resourceGroup().location), `imageTag` (default: 'latest'), `appServicePlanSku` (default: 'P1v3')

`main.parameters.json` sets `appName = "a11y-scan-demo"`

---

## 6. Dockerfile

Multi-stage build:

1. **deps** — `node:20-alpine`, npm ci
2. **builder** — `node:20-alpine`, copy deps, `npx next build`
3. **runner** — `node:20-bookworm-slim`, production image
   - Installs `procps` (for Crawlee memory monitoring)
   - `npx playwright install --with-deps chromium`
   - `npx puppeteer browsers install chrome` (for PDF generation)
   - Copies standalone output, static, public, and full node_modules
   - Exposes port 3000, runs `node server.js`

---

## 7. Local Dev Scripts

### `start-local.ps1`

- Modes: `local` (npm dev, default) or `docker` (Docker build + run)
- Docker: builds `a11y-scan-demo:local`, runs container on port 3000
- Local: npm install + npm run dev

### `stop-local.ps1`

- Modes: `local` (kills process on port 3000) or `docker` (docker rm -f)

---

## 8. GitHub Action (`action/action.yml`)

- **Name:** Accessibility Scan
- **Inputs:** url (required), mode (single/crawl), threshold (70), max-pages (50), output-format (json/sarif/junit), output-directory (./a11y-results)
- **Outputs:** score, passed, report-path
- **Runs:** composite action — setup Node 20, npm ci, install Playwright, run scan via `npx ts-node src/cli/bin/a11y-scan.ts`

---

## 9. Copilot AI Customization Files

### Agents

| File | Description |
|------|-------------|
| `a11y-detector.agent.md` | Detects WCAG 2.2 violations via static + runtime analysis. Includes top 10 React/Next.js violations, scoring system, handoff to resolver. |
| `a11y-resolver.agent.md` | Fixes violations with code patches. Prioritizes critical→minor. Includes remediation pattern table. Hands off to detector for re-scan. |

### Instructions

| File | Description |
|------|-------------|
| `a11y-remediation.instructions.md` | Fix patterns lookup table, React/Next.js code patterns, anti-patterns. Applied to `**/*.tsx, *.jsx, *.ts, *.html, *.css` |
| `ado-workflow.instructions.md` | ADO org/project, work item hierarchy, branching strategy, commit messages with AB# linking, PR workflow, post-merge cleanup |
| `wcag22-rules.instructions.md` | Full WCAG 2.2 Level AA success criteria table organized by POUR principles. React/Next.js specific rules. Scoring system. |

### Prompts

| File | Description |
|------|-------------|
| `a11y-fix.prompt.md` | Routes to A11y Resolver agent for fixes |
| `a11y-scan.prompt.md` | Routes to A11y Detector agent for scans |

### Skills

Skills directory contains HVE skills (docx, pdf, pptx, xlsx, powerbi variants) — these are general-purpose HVE extension skills, not project-specific.

---

## 10. Application Architecture

### Framework & Config

- **Framework:** Next.js 15.5 with Turbopack, standalone output
- **i18n:** next-intl with en/fr locales
- **Styling:** Tailwind CSS 4
- **Testing:** Vitest (unit), Playwright (e2e)
- **Coverage thresholds:** 80% statements/functions/lines, 65% branches

### Page Structure

```text
src/app/
├── globals.css
├── layout.tsx          → Pass-through root layout (returns children)
├── page.tsx            → Redirects to /{defaultLocale}
└── [locale]/
    ├── layout.tsx      → Full locale layout (html lang, skip nav, header, main)
    ├── page.tsx         → Home page with ScanForm + 3-step instructions
    ├── crawl/[id]/      → Crawl results page
    └── scan/[id]/       → Scan results page
```

### API Routes

```text
src/app/api/
├── ci/
│   ├── crawl/          → CI crawl endpoint
│   └── scan/           → CI scan endpoint
├── crawl/
│   ├── route.ts        → Public crawl POST (creates crawl, returns crawlId)
│   └── [id]/           → Crawl status polling
└── scan/
    ├── route.ts        → Public scan POST (creates scan, returns scanId)
    └── [id]/           → Scan status polling
```

- SSRF prevention: blocks localhost, private IPs, .local, .internal hostnames
- Async processing: scan/crawl starts in background, client polls by ID

### Components (9 total)

- CrawlProgress, LanguageSwitcher, PageList, ReportView, ScanForm, ScanProgress, ScoreDisplay, SiteScoreDisplay, ViolationList

### Library Modules

```text
src/lib/
├── logger.ts           → Structured logging
├── telemetry.ts        → Azure App Insights telemetry
├── ci/                 → CI threshold gating + formatters (json, junit, sarif)
├── crawler/            → Site crawler (robots.txt, sitemap, URL utils, BFS)
├── report/             → Report generators (HTML, PDF, SARIF, site-level)
├── scanner/            → Scan engine (axe-core integration), result parser, store
├── scoring/            → Score calculator (weighted by impact, WCAG mapper)
└── types/              → TypeScript types (crawl, report, scan, score)
```

### CLI

```text
src/cli/
├── commands/
│   ├── crawl.ts        → CLI crawl command
│   └── scan.ts         → CLI scan command
├── config/
│   └── loader.ts       → Config file loader
└── __tests__/
```

### E2E Tests

5 Playwright spec files: self-scan-crawl-results, self-scan-home, self-scan-report, self-scan-scan-results, self-scan-site-report

### Middleware

- next-intl routing for UI routes
- HTTP logging for API routes
- Matcher excludes `_next`, `_vercel`, static files

---

## 11. Key Architectural Observations for FinOps Refactoring

### Current Architecture: Scanner-Only Monolith

The accessibility-scan-demo-app is a **single Next.js application** that is both:
1. The **scanner platform** (scan engine, crawler, scoring, reports, CLI, GitHub Action)
2. The **web UI** (scan form, results display, i18n)

### External Demo Apps: 5 Separate Repositories

Demo apps live in **5 separate sibling repositories** under the same GitHub org:
- `a11y-demo-app-001` (Rust)
- `a11y-demo-app-002` (C#)
- `a11y-demo-app-003` (Java)
- `a11y-demo-app-004` (Python)
- `a11y-demo-app-005` (Go)

Each has its own:
- `ci-cd.yml` workflow
- `a11y-scan.yml` workflow
- `infra/main.bicep` (with `containerPort` parameter)
- Dockerfile

### Orchestration Pattern

- `deploy-all.yml` dispatches workflows to sibling repos via GitHub CLI (`gh workflow run`)
- `scan-all.yml` dispatches scan workflows to sibling repos
- ADO equivalents use `resources.repositories` to reference sibling repos and reusable templates

### Differences from Embedded FinOps Pattern

In the finops-scan-demo-app pattern, the 5 demo apps would be **embedded inside the scanner repository** rather than in separate repos. Key changes needed:

1. **Directory structure:** Add `demo-apps/` folder with subfolders for each demo app (001-005)
2. **Dockerfiles:** Each demo app brings its own Dockerfile inside the monorepo
3. **Infra:** Shared or per-app Bicep modules inside `infra/demo-apps/`
4. **Workflows:** Replace `gh workflow run` dispatch pattern with direct deploy jobs that reference local demo app paths
5. **ADO pipelines:** Remove `resources.repositories`, use local checkout paths
6. **Scan targets:** Demo app URLs remain the same (deployed to separate Azure resource groups)

### What Would NOT Change

- Scanner engine, CLI, GitHub Action, scoring, reports — all stay the same
- The scanner app's own deployment pipeline stays the same
- SARIF upload, Advanced Security integration stays the same
- Copilot AI customization files stay the same

---

## 12. Gaps and Missing Information

1. **No root `scripts/` directory** — confirmed absent. Only skill-level scripts exist.
2. **CI route handlers** (`src/app/api/ci/crawl/` and `src/app/api/ci/scan/`) — not read, but exist.
3. **Scan/crawl [id] routes** — not read, but exist for status polling.
4. **README.md** — partially read (first 50 lines confirm tech stack and feature list).
5. **messages/en.json and messages/fr.json** — not read, but exist for i18n translations.
6. **e2e fixture files** — not read, but exist (axe-fixture, report-data, seed-data, threshold).
7. **Component source code** — only component file names listed, source not read.
8. **Demo app repo contents** — sibling repos (001-005) are external, not in this workspace.

---

## References

- All file paths are workspace-relative from `c:\src\GitHub\devopsabcs-engineering\accessibility-scan-demo-app\`
- ADO Org: `MngEnvMCAP675646`, Project: `AODA WCAG compliance`
- GitHub Org: `devopsabcs-engineering`
- Azure region: `canadacentral`
- Service connection: `AODA-svc-conn`
- Scanner URL: `https://a11y-scan-demo-app.azurewebsites.net`
