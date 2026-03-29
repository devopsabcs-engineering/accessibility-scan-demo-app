# Agentic Accelerator Framework & Workshop Research

## Research Topics

1. Full repository structure for both repos
2. How each references finops-scan-demo-app, finops-scan-workshop, accessibility-scan-demo-app
3. The pattern/template established for scan tools and workshops
4. Documentation about relationship between scanner repos and workshop repos
5. README content and architecture docs
6. How the "pattern to be repeated" is defined
7. Shared scripts, templates, or configurations

## Status: Complete

---

## 1. Repository: agentic-accelerator-framework

### 1.1 Purpose

The overarching framework providing a repeatable, org-wide approach to shifting security and compliance left using custom GitHub Copilot agents. Covers four domains: Security, Accessibility, Code Quality, and FinOps.

**Core formula:** Agentic Accelerator = GitHub Advanced Security + GitHub Copilot Custom Agents + Microsoft Defender for Cloud

### 1.2 Repository Structure

```text
agents/                  # 15 custom GHCP agent definitions (.agent.md)
instructions/            # Path-specific instruction files (a11y-remediation, code-quality, wcag22-rules)
prompts/                 # Reusable prompt templates (a11y-fix, a11y-scan)
skills/                  # On-demand domain knowledge (a11y-scan, security-scan, pdf, pptx)
scripts/                 # Agent validation tooling (validate-agents.mjs, generate-exec-summary.cjs)
apm.yml                  # APM dependency manifest
mcp.json                 # MCP server configuration (ADO work items)
index.md                 # Jekyll/docs site index
.github/
  CODEOWNERS             # Mandatory security-team review for agent config paths
  copilot-instructions.md # Repo-wide Copilot conventions
  instructions/          # Workflow instructions (ado-workflow)
  skills/                # Additional skills (docx, pdf, pptx, xlsx, Power BI)
  workflows/             # 7 GitHub Actions CI/CD pipelines
docs/                    # 9 framework documentation guides
  architecture.md
  agent-patterns.md
  agent-extensibility.md
  sarif-integration.md
  platform-comparison.md
  azure-devops-pipelines.md
  centralized-governance.md
  prompt-file-security.md
  implementation-roadmap.md
sample-app/              # Next.js demo application with Bicep infrastructure
samples/
  azure-devops/          # 3 sample ADO pipeline YAML files
```

### 1.3 15 Agent Inventory

| Domain | Agents | Count | SARIF Category | Reference Repository |
|---|---|---|---|---|
| Security | SecurityAgent, SecurityReviewerAgent, SecurityPlanCreator, PipelineSecurityAgent, IaCSecurityAgent, SupplyChainSecurityAgent | 6 | `security/` | `.github-private` |
| Accessibility | A11yDetector, A11yResolver | 2 | `accessibility-scan/` | `accessibility-scan-demo-app` |
| Code Quality | CodeQualityDetector, TestGenerator | 2 | `code-quality/coverage/` | This repository |
| FinOps | CostAnalysisAgent, FinOpsGovernanceAgent, CostAnomalyDetector, CostOptimizerAgent, DeploymentCostGateAgent | 5 | `finops-finding/v1` | `cost-analysis-ai` |

### 1.4 Key Documentation

- `docs/architecture.md` — Architecture overview, core formula, shift-left principle, agent domains, deployment model, SARIF integration, dual-platform data flows
- `docs/agent-patterns.md` — Agent file specification, YAML frontmatter schema, tool namespaces, Detector-Resolver handoff pattern, organization-wide sharing
- `docs/implementation-roadmap.md` — Five-phase rollout (Security → Accessibility → Code Quality → FinOps → Prompt File Security)
- `docs/sarif-integration.md` — SARIF category registry and domain mappings
- `docs/agent-extensibility.md` — Plugin architecture, MCP integration, APM dependency management
- `docs/platform-comparison.md` — GitHub vs Azure DevOps feature matrix
- `docs/azure-devops-pipelines.md` — ADO YAML pipeline equivalents for each workflow

### 1.5 CI/CD Workflows (7 total)

| Workflow | Trigger | Purpose |
|---|---|---|
| `security-scan.yml` | PR and push to `main` | SCA, SAST (CodeQL), IaC, container, and DAST scanning |
| `accessibility-scan.yml` | PR and weekly schedule | Three-engine a11y scan with threshold gating |
| `code-quality.yml` | PR | Lint, type check, test, and 80% coverage gate |
| `finops-cost-gate.yml` | PR (IaC file changes) | Infracost estimate against monthly budget |
| `apm-security.yml` | PR (agent config file changes) | APM audit for prompt file supply chain attacks |
| `ci-full-test.yml` | Push and PR to `main` | Agent validation (structure, cross-refs, domain rules) |
| `deploy-to-github-private.yml` | (implied) | Deploy agents org-wide via `.github-private` |

---

## 2. Repository: agentic-accelerator-workshop

### 2.1 Purpose

A hands-on **workshop template** repository. Students click "Use this template" on GitHub to create their own copy, then work through 12 labs (Lab 00 through Lab 11) that teach how to use the framework's agents, interpret SARIF output, integrate with CI/CD, and build custom agents.

**Tagline:** "Learn to use AI-powered Accelerator agents — from Agents to Hero"

### 2.2 Repository Structure

```text
README.md                # Workshop overview, prerequisites, lab list, delivery tiers
index.md                 # Jekyll/docs site index with lab checklist
CONTRIBUTING.md          # Contribution guidelines (template vs framework repos)
LICENSE
labs/
  lab-00-setup.md        # Prerequisites and Environment Setup (30 min, Beginner)
  lab-01.md              # Explore the Sample App (25 min, Beginner)
  lab-02.md              # Understanding Agents, Skills, and Instructions (20 min, Beginner)
  lab-03.md              # Security Scanning with Copilot Agents (40 min, Intermediate)
  lab-04.md              # Accessibility Scanning with Copilot Agents (35 min, Intermediate)
  lab-05.md              # Code Quality Analysis with Copilot Agents (35 min, Intermediate)
  lab-06.md              # Understanding SARIF Output (30 min, Intermediate)
  lab-07.md              # Setting Up GitHub Actions Pipelines (40 min, Intermediate)
  lab-08.md              # Viewing Results in GitHub Security Tab (25 min, Intermediate)
  lab-09.md              # FinOps Agents and Azure Cost Governance (45 min, Advanced, Optional)
  lab-10.md              # Agent Remediation Workflows (45 min, Advanced)
  lab-11.md              # Creating Your Own Custom Agent (45 min, Advanced)
images/
  lab-dependency-diagram.mmd  # Mermaid source for lab progression
  lab-00/ through lab-11/     # Screenshot placeholder directories with README.md
sample-app/              # Copy of the framework sample app (intentional issues)
.github/
  agents/                # Agent definitions (copied from framework)
  instructions/          # Instruction files (copied from framework)
  prompts/               # Prompt templates (copied from framework)
  skills/                # Skill files (copied from framework)
  workflows/             # CI/CD workflow files
```

### 2.3 Delivery Tiers

| Tier | Labs | Duration | Audience |
|---|---|---|---|
| Half-Day | Labs 00–05 | ~3 hours | First exposure to agent-driven scanning |
| Full-Day | Labs 00–08 | ~5.5 hours | End-to-end pipeline integration |
| Extended | Labs 00–11 | ~7.5 hours | Deep dive with FinOps, remediation, and custom agents |

### 2.4 Lab Dependency Diagram

```text
Lab 00 (Setup) → Lab 01 (Sample App) → Lab 02 (Agents & Skills)
  → Lab 03 (Security) ─┐
  → Lab 04 (A11y) ──────┤→ Lab 06 (SARIF) → Lab 07 (GitHub Actions) → Lab 08 (Security Tab) → Lab 10 (Remediation) → Lab 11 (Custom Agent)
  → Lab 05 (Quality) ───┘                                           → Lab 09 (FinOps, optional)
```

### 2.5 Workshop-Framework Relationship

The CONTRIBUTING.md explicitly documents the relationship:

- The workshop is a **template repository** — students create their own copy
- Framework contributions (agents, skills, scanning logic) go to the framework repo
- Changes to the framework are **periodically synced** into the workshop repo
- The Credits section states: "This workshop is built on the [Agentic Accelerator Framework], which provides the agents, skills, instructions, and sample application used throughout the labs."

---

## 3. How the Framework References Scanner Repos

### 3.1 Direct Repository References

The framework's `docs/architecture.md` defines the **Reference Repository** column in the Agent Domain Categories table:

| Domain | Reference Repository |
|---|---|
| Security | `.github-private` |
| **Accessibility** | **`accessibility-scan-demo-app`** |
| Code Quality | This repository (the framework itself) |
| FinOps | **`cost-analysis-ai`** |

### 3.2 Implementation Roadmap: Phase-by-Phase Scanner Repos

From `docs/implementation-roadmap.md`:

**Phase 2 — Accessibility Agents:**
- Status: Implemented
- Repository: `accessibility-scan-demo-app` (scanner), `.github-private` (agents)
- Agents: A11yDetector, A11yResolver
- SARIF Category: `accessibility-scan/`
- Scanner: Three-engine architecture (axe-core, IBM Equal Access, custom Playwright checks)

**Phase 4 — FinOps / Cost Analysis Agents:**
- Status: Active (agents defined, cost gate workflow implemented)
- Agents: CostAnalysisAgent, FinOpsGovernanceAgent, CostAnomalyDetector, CostOptimizerAgent, DeploymentCostGateAgent
- SARIF Category: `finops-finding/v1`
- (No separate scanner repo named; references `cost-analysis-ai` in architecture table)

### 3.3 CI/CD Integration References

The `skills/a11y-scan/SKILL.md` contains a GitHub Actions snippet referencing:
```yaml
- uses: devopsabcs-engineering/accessibility-scan-demo-app@main
```

The accessibility-scan-demo-app is thus used as a **reusable GitHub Action** in CI/CD pipelines.

### 3.4 Search for "finops-scan-demo-app" and "finops-scan-workshop"

**Neither `finops-scan-demo-app` nor `finops-scan-workshop` appear in either repository.** The FinOps domain references `cost-analysis-ai` as the reference repository. This indicates:

- The FinOps scanner repo might be named `cost-analysis-ai` (not `finops-scan-demo-app`)
- OR `finops-scan-demo-app` is a planned/future repo that does not yet exist in the framework references
- There is no `finops-scan-workshop` referenced anywhere

---

## 4. The Pattern/Template Established for Scan Tools and Workshops

### 4.1 The "Shift-Left Then Scale" Pattern

1. **Shift Left** — Custom GHCP agents run in VS Code before commit and on the GitHub platform during PR review
2. **Automate** — CI/CD pipelines (GitHub Actions + Azure DevOps Pipelines) run the same controls as automated gates
3. **Report** — All findings output SARIF v2.1.0 for unified consumption (GitHub Code Scanning + ADO Advanced Security)
4. **Govern** — Security Overview + Defender for Cloud + Defender for DevOps + Power BI dashboards provide centralized governance

### 4.2 Agent Design Patterns

**Pattern 1: Orchestrator with Sub-Agents**
- A top-level agent delegates to specialized sub-agents based on type of code under review
- Example: SecurityAgent → SecurityReviewerAgent, PipelineSecurityAgent, IaCSecurityAgent

**Pattern 2: Detector–Resolver Handoff (Detect → Fix → Verify)**
- Detector agent scans and produces findings
- Hands off to Resolver agent which applies code fixes
- Resolver hands back to Detector for verification re-scan
- Example: A11yDetector ↔ A11yResolver

### 4.3 Agent File Specification (The Repeatable Template)

Every agent follows this structure:

1. **YAML frontmatter** — `name`, `description`, `model`, `tools` list, `handoffs` list
2. **Markdown body** with consistent sections:
   - Expert persona introduction paragraph
   - Core responsibilities bullet list
   - Domain-specific sections with checklists, rules, and examples
   - Output format specification (Markdown report templates)
   - Review/detection protocol as numbered steps
   - Severity classification (CRITICAL, HIGH, MEDIUM, LOW)
   - Reference standards (links to authoritative sources)
   - Invocation section ("Exit with a complete report. Do not wait for user input.")

### 4.4 Complementary Artifact Types

| Artifact | Activation | Purpose |
|---|---|---|
| **Agent** (`.agent.md`) | Invoked via `@agent-name` in Copilot Chat | Performs analysis, makes decisions, produces output |
| **Skill** (`SKILL.md`) | Loaded by agent when domain knowledge is needed | Provides reference data and procedures |
| **Instruction** (`.instructions.md`) | Always active based on `applyTo` file patterns | Enforces rules and standards automatically |
| **Prompt** (`.prompt.md`) | Invoked on demand as a chat template | Standardizes common requests with input variables |

### 4.5 SARIF Category Convention

Each scan domain uses a distinct `automationDetails.id` category prefix:

| Domain | SARIF Category |
|---|---|
| Security | `security/` |
| Accessibility | `accessibility-scan/` |
| Code Quality | `code-quality/coverage/` |
| FinOps | `finops-finding/v1` |

### 4.6 Sample App Pattern

Both the framework and workshop include a `sample-app/` directory:
- Next.js application with **intentional issues** across all four domains
- Each issue is marked with comment tags: `INTENTIONAL-VULNERABILITY`, `INTENTIONAL-A11Y-VIOLATION`, `INTENTIONAL-QUALITY-ISSUE`, `INTENTIONAL-FINOPS-ISSUE`
- Includes `infra/main.bicep` with FinOps issues (oversized SKUs, missing tags)
- Serves as a testing target for agent validation

### 4.7 Four-Level Deployment Model

| Level | Location | Availability |
|---|---|---|
| Enterprise | `agents/` in enterprise `.github-private` | All enterprise repos |
| Organization | `agents/` in org `.github-private` | All org repos |
| Repository | `.github/agents/` in the repo | That repo only |
| User profile | `~/.copilot/agents/` | All user workspaces (VS Code) |

### 4.8 Workshop Template Pattern

The workshop repo is a **GitHub template repository**:
1. Students use "Use this template" button to create their own copy
2. Copies include the full directory structure, agent definitions, and sample app
3. Labs are progressive (Beginner → Intermediate → Advanced)
4. Framework contributions go to the framework repo; workshop content improvements go to the workshop repo
5. Framework changes are periodically synced into the workshop

---

## 5. Shared Scripts, Templates, and Configurations

### 5.1 Framework Scripts

- `scripts/validate-agents.mjs` — Tier 1–4 structural, cross-reference, and domain checks for all `.agent.md`, `.instructions.md`, `.prompt.md`, and `SKILL.md` files
- `scripts/generate-exec-summary.cjs` — Generates a PptxGenJS executive summary presentation

### 5.2 Framework Configuration Files

- `apm.yml` — APM dependency manifest declaring agent package dependencies
- `mcp.json` — MCP server configuration for ADO work item integration
- `.github/CODEOWNERS` — Mandatory security-team review for agent config paths

### 5.3 ADO Pipeline Samples

`samples/azure-devops/` contains three ready-to-use pipeline definitions:
- `security-pipeline.yml`
- `accessibility-pipeline.yml`
- `quality-pipeline.yml`

### 5.4 Plugin Architecture Pattern

The framework defines a plugin bundle structure for packaging agents:
```text
my-accelerator-plugin/
  plugin.json              # Plugin metadata
  skills/
    security-scan/SKILL.md
    a11y-scan/SKILL.md
  agents/
    security-agent.md
    a11y-detector.agent.md
  hooks/
    post-commit.json
```

---

## 6. How the "Pattern to Be Repeated" Is Defined

The framework establishes a repeatable pattern for each scan domain through:

### 6.1 Per-Domain Blueprint

Each domain follows a consistent formula:

1. **Scanner repository** — a standalone repo containing the scanning engine (e.g., `accessibility-scan-demo-app` for a11y, `cost-analysis-ai` for FinOps)
2. **Agent pair** — a Detector agent and a Resolver agent (or an orchestrator + sub-agents)
3. **Instruction files** — always-on rules for the domain (e.g., `a11y-remediation.instructions.md`, `wcag22-rules.instructions.md`)
4. **Skill files** — progressive domain knowledge (e.g., `a11y-scan/SKILL.md`)
5. **Prompt files** — reusable task templates (e.g., `a11y-scan.prompt.md`, `a11y-fix.prompt.md`)
6. **CI/CD workflow** — GitHub Actions + ADO pipeline for automated scanning
7. **SARIF category** — unique prefix for finding categorization
8. **Sample app targets** — intentional issues for validation

### 6.2 Implementation Roadmap Phases

The `docs/implementation-roadmap.md` defines five phases:
- Phase 1: Security Agents (`.github-private`)
- Phase 2: Accessibility Agents (`accessibility-scan-demo-app`)
- Phase 3: Code Quality Agents (this repository)
- Phase 4: FinOps / Cost Analysis Agents (`cost-analysis-ai`)
- Phase 5: Prompt File Security

Each phase follows the same attributes table:
| Attribute | Content |
|---|---|
| Status | (status) |
| Repository | (scanner repo), `.github-private` (agents) |
| Agents | (agent names) |
| SARIF Category | (prefix) |
| Proof of Value | (description of scanner/agent working) |
| Actions | (next steps) |

### 6.3 Workshop Lab Mapping

The workshop mirrors the framework phases as labs:
- Lab 03 → Security (Phase 1)
- Lab 04 → Accessibility (Phase 2)
- Lab 05 → Code Quality (Phase 3)
- Lab 09 → FinOps (Phase 4)

A new domain scanner pair would follow the established pattern:
1. Create the scanner repo (e.g., `finops-scan-demo-app`)
2. Define agents in the framework (CostAnalysisAgent, etc.)
3. Add instructions, skills, and prompts to the framework
4. Add a CI/CD workflow
5. Add intentional issues to the sample app
6. Create a workshop lab for that domain

---

## 7. Gaps and Open Questions

### 7.1 Naming Discrepancy

- The framework references `cost-analysis-ai` as the FinOps reference repository, NOT `finops-scan-demo-app`
- There is no mention anywhere of `finops-scan-demo-app` or `finops-scan-workshop` in either repository
- If the intent is to create a FinOps scanner repo named `finops-scan-demo-app`, that would be a NEW repo following the accessibility pattern

### 7.2 Workshop for FinOps

- There is no separate `finops-scan-workshop` repository
- FinOps workshop content is embedded in the main workshop as Lab 09 (optional)
- If following the accessibility pattern (separate scanner repo + separate workshop repo), a separate `finops-scan-workshop` would be a new addition

### 7.3 Accessibility Workshop as Separate Repo

- There is no `accessibility-scan-workshop` referenced in either repository
- All accessibility workshop content is in the unified workshop as Lab 04
- The current workspace (`accessibility-scan-demo-app`) appears to be the standalone scanner repo, matching the framework's Phase 2 reference

### 7.4 Pattern Interpretation for New Domains

To repeat the accessibility pattern for FinOps (or another domain):

| Component | Accessibility Example | FinOps Equivalent (to create) |
|---|---|---|
| Scanner repo | `accessibility-scan-demo-app` | `finops-scan-demo-app` |
| Workshop repo | (part of unified workshop, Lab 04) | `finops-scan-workshop` (if standalone) |
| Framework agents | A11yDetector, A11yResolver | CostAnalysisAgent + 4 others (already defined) |
| Framework instructions | `a11y-remediation.instructions.md`, `wcag22-rules.instructions.md` | (not yet created) |
| Framework skills | `a11y-scan/SKILL.md` | (not yet created, would be `finops-scan/SKILL.md`) |
| Framework prompts | `a11y-scan.prompt.md`, `a11y-fix.prompt.md` | (not yet created) |
| CI/CD workflow | `accessibility-scan.yml` | `finops-cost-gate.yml` (already exists) |
| SARIF category | `accessibility-scan/` | `finops-finding/v1` (already defined) |
| Sample app issues | `INTENTIONAL-A11Y-VIOLATION` | `INTENTIONAL-FINOPS-ISSUE` (already exists) |

---

## 8. References

All findings sourced from:

- https://github.com/devopsabcs-engineering/agentic-accelerator-framework (README.md, docs/architecture.md, docs/implementation-roadmap.md, docs/agent-patterns.md, docs/agent-extensibility.md, docs/sarif-integration.md, docs/azure-devops-pipelines.md, sample-app/README.md, skills/a11y-scan/SKILL.md, scripts/validate-agents.mjs, agents/*.agent.md, instructions/*.instructions.md, prompts/*.prompt.md)
- https://github.com/devopsabcs-engineering/agentic-accelerator-workshop (README.md, index.md, CONTRIBUTING.md, labs/lab-00 through lab-11, sample-app/README.md, images/lab-dependency-diagram.mmd)
