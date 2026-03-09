<!-- markdownlint-disable-file -->

# Implementation Readiness Research: A11y Detector and Resolver Agents

**Research Status:** Complete
**Date:** 2026-03-08

---

## Research Topics and Questions

1. Does `.github/agents/` directory exist in the workspace?
2. What is the full `.agent.md` schema from the HVE Core prompt-builder instructions?
3. What implementation-critical details exist in the 4 subagent research documents?
4. What is the current instructions file format used in this repo?
5. What CLI commands and scripts are available for agent invocation?
6. Do any `.agent.md`, `.prompt.md`, or `SKILL.md` files exist in the workspace?

---

## 1. Directory Structure Readiness

### `.github/agents/` — Does NOT Exist

The `.github/agents/` directory does **not** exist. It must be created.

Current `.github/` structure:

```text
.github/
├── instructions/
│   └── ado-workflow.instructions.md
└── workflows/
    └── (CI workflows)
```

**Required directory creation:**

```text
.github/
├── agents/                           ← NEW (create)
│   ├── a11y-detector.agent.md        ← NEW
│   └── a11y-resolver.agent.md        ← NEW
├── instructions/
│   ├── ado-workflow.instructions.md  ← EXISTS
│   ├── wcag22-rules.instructions.md  ← NEW (optional supporting file)
│   └── a11y-remediation.instructions.md ← NEW (optional supporting file)
└── workflows/
```

### Existing `.agent.md`, `.prompt.md`, or `SKILL.md` Files — NONE

No `.agent.md`, `.prompt.md`, or `SKILL.md` files exist anywhere in the workspace. These agents will be the first custom Copilot artifacts in this repository.

---

## 2. Full `.agent.md` Schema (from HVE Core prompt-builder.instructions.md)

### File Structure

Agent files consist of two parts:

1. **YAML frontmatter header** — configures name, description, tools, and settings
2. **Markdown body** — contains instructions, guidelines, and behavioral prompts

### Required Frontmatter Fields

| Field | Type | Description |
|-------|------|-------------|
| `description` | string | Brief description of the agent's purpose. **Required for all file types.** Write as concise sentence fragments or single sentences. Keep under 120 characters. Front-load the most important information. |

### Optional Frontmatter Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `name` | string | Filename | Human-readable agent name (e.g., `A11y Detector`). Displayed in agent picker. Optional but preferred for agent files. |
| `tools` | array of strings | All tools | List of tool/tool set names available. Supports built-in tools, MCP tools (`<server>/*`), and extension tools. When omitted, all tools are accessible. |
| `agents` | array or `*` or `[]` | `*` | Which agents can run as subagents. `*` = all, `[]` = none, or explicit list of agent names. |
| `model` | string or array | Current model | AI model to use. String for single model, array for prioritized fallback list. |
| `user-invocable` | boolean | `true` | Whether agent appears in the agents dropdown. Set `false` for subagent-only agents. |
| `disable-model-invocation` | boolean | `false` | Prevents agent from being auto-invoked as a subagent. Set `true` for agents causing side effects. |
| `target` | string | Both | Target environment: `vscode` or `github-copilot`. Omit to use in both. |
| `mcp-servers` | list | — | MCP server config JSON for use with GitHub Copilot (`target: github-copilot`). |
| `handoffs` | array of objects | — | Suggested next actions to transition between agents. |
| `argument-hint` | string | — | Hint text shown in chat input to guide usage. |

### Handoffs Schema

Each handoff object:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `label` | string | Yes | Display text on handoff button. Supports emoji. |
| `agent` | string | Yes | Target agent identifier (human-readable `name` from target agent's frontmatter). |
| `prompt` | string | No | Prompt text to send to the target agent (e.g., a slash command). |
| `send` | boolean | No | Auto-submit the prompt. Default `false`. |

### Frontmatter Validation Rules (from prompt-builder.instructions.md)

- `maturity` is tracked in `collections/*.collection.yml`, **not** in frontmatter. Do **not** include a `maturity` field in artifact frontmatter.
- `agents:` field entries use the human-readable name from each subagent's `name:` frontmatter.
- When `tools` is omitted, all tools are accessible. When specified, list only tools available in the current VS Code context.
- `agent:` field is for prompt files and handoffs only (not agent files themselves).

### Body Content Structure for Agents

From the prompt-builder instructions, agents support two protocol patterns:

#### Step-Based Protocols (for autonomous/bounded tasks)

```markdown
## Required Steps

### Step 1: Summary
* Instructions for step 1

### Step 2: Summary
* Instructions for step 2
```

#### Phase-Based Protocols (for conversational/multi-turn workflows)

```markdown
## Required Phases

### Phase 1: Summary
* Instructions for phase 1, transition criteria

### Phase 2: Summary
* Instructions for phase 2
```

### Prompt Writing Style Rules

- Use `*` bulleted lists for groupings and `1.` ordered lists for sequential steps.
- Use **bold** only for key concepts and *italics* for file names and new terms.
- NO ALL CAPS directives, no `* **Bold Title** - description` pattern, no XML tags in prompt content.
- Descriptions must be under 120 characters.
- File references as markdown links: `[filename](path/to/file)`, never backtick-wrapped paths.

---

## 3. Implementation-Critical Details from Subagent Research

### From vscode-custom-agents-research.md

**Cross-environment compatibility confirmed:**
- `.agent.md` files in `.github/agents/` are auto-detected by VS Code, GitHub.com Copilot coding agent, JetBrains, Eclipse, Xcode, and GitHub Copilot CLI.
- Omitting `target` field makes agents work in **all** environments.
- `handoffs` and `agents` (subagent restrictions) are **VS Code-specific** — they work in VS Code but are ignored on GitHub.com.
- `model` field works in IDEs but may be ignored on GitHub.com.
- Max agent body content: **30,000 characters** (GitHub.com limit).

**Key tool types available:**
1. Built-in VS Code tools: `read_file`, `edit`, `search`, `fetch`, `run_in_terminal`, etc.
2. MCP tools: `<server>/*` for full server access or individual tools.
3. Extension-contributed tools.

**Agent orchestration:**
- A11y Detector could use handoffs to transition to A11y Resolver.
- Subagent depth is limited to 1 (subagents cannot run their own subagents).

### From github-copilot-extensions-research.md

**Key conclusion: Use `.agent.md` files, NOT Copilot Extensions.**
- GitHub's documentation has shifted away from Copilot Extensions (server-side GitHub Apps) toward `.agent.md` + MCP.
- `.agent.md` files require zero infrastructure, zero hosting cost, zero maintenance.
- Copilot Extensions require server deployment, hosting costs, and OAuth configuration.
- The `.agent.md` approach provides all needed capabilities for this use case.

### From aoda-wcag22-standards-research.md

**Implementation-critical WCAG details:**
- AODA legally references WCAG 2.0 Level AA but WCAG 2.2 is backwards compatible.
- 6 new WCAG 2.2 Level A+AA criteria the agents must know: 2.4.11, 2.5.7, 2.5.8, 3.2.6, 3.3.7, 3.3.8.
- Automated detection covers approximately **35-40%** of WCAG 2.2 Level AA criteria.
- The codebase already scans for `wcag22aa` tags in axe-core.
- The Detector agent should communicate what it **can** and **cannot** detect automatically.
- The Resolver agent needs remediation patterns for all 50+ WCAG 2.2 Level AA criteria.
- The aoda-wcag22-standards-research.md file contains complete remediation lookup tables.

### From codebase-analysis-research.md

**CLI commands the agents should invoke:**
- `a11y-scan scan --url <url> [--threshold <n>] [--format json|sarif|junit] [--output <path>]`
- `a11y-scan crawl --url <url> [--max-pages <n>] [--max-depth <n>] [--format json|sarif|junit]`

**Key integration points:**
- Scanner engine at `src/lib/scanner/engine.ts` — three-engine architecture (axe-core + IBM + custom checks)
- Scoring at `src/lib/scoring/calculator.ts` — weighted impact scoring, grades A-F
- WCAG mapper at `src/lib/scoring/wcag-mapper.ts` — POUR principle mapping
- Custom checks at `src/lib/scanner/custom-checks.ts` — 5 custom Playwright checks
- Report generators at `src/lib/report/` — HTML, PDF, SARIF, site reports
- CI threshold at `src/lib/ci/threshold.ts` — min score, per-impact max counts
- Types at `src/lib/types/scan.ts` — TypeScript interfaces for scan results

**Result format:** `ScanResults` → `NormalizedViolation[]` with `id`, `impact`, `description`, `help`, `helpUrl`, `tags`, `nodes[]`, `engine`.

---

## 4. Current Instructions File Format

### Existing file: `.github/instructions/ado-workflow.instructions.md`

Uses the standard HVE Core format:

```yaml
---
description: "Required workflow for Azure DevOps work item tracking, Git branching, pull requests, and branch cleanup in the AODA WCAG compliance project."
applyTo: "**"
maturity: stable
---
```

**Note:** This file includes `maturity: stable` in frontmatter, which the prompt-builder instructions say should be tracked in `collections/*.collection.yml` instead. However, since this repo does not appear to use collection files, and the existing file already uses this pattern, new instructions files can follow the same convention for consistency.

**Key format observations:**
- Uses `description` field (required).
- Uses `applyTo` field with glob pattern.
- Body content uses H1 title, H2 sections, bulleted lists, code blocks.
- Follows proper Markdown formatting with fenced code blocks.

---

## 5. CLI Commands and Scripts from package.json

### Project Identity

| Field | Value |
|-------|-------|
| Name | `accessibility-scan-demo-app` |
| Version | `0.1.0` |
| CLI binary | `a11y-scan` (maps to `dist/cli/bin/a11y-scan.js`) |

### Scripts Available for Agent Invocation

| Script | Command | Purpose |
|--------|---------|---------|
| `dev` | `next dev --turbopack` | Start development server |
| `build` | `next build --turbopack` | Build the Next.js app |
| `start` | `next start` | Start production server |
| `lint` | `eslint` | Run ESLint |
| `test` | `vitest run` | Run unit tests |
| `test:watch` | `vitest` | Run tests in watch mode |
| `test:coverage` | `vitest run --coverage` | Run tests with coverage |
| `test:ci` | `vitest run --coverage` | CI test run |
| `test:a11y` | `npx playwright test` | Run Playwright e2e accessibility tests |

### CLI Commands (via `a11y-scan` binary)

| Command | Usage | Description |
|---------|-------|-------------|
| `scan` | `a11y-scan scan --url <url> [options]` | Single-page accessibility scan |
| `crawl` | `a11y-scan crawl --url <url> [options]` | Site-wide crawl and scan |

### Scan Command Options

| Option | Default | Description |
|--------|---------|-------------|
| `--url <url>` | (required) | URL to scan |
| `--threshold <score>` | 70 | Minimum accessibility score (0-100) |
| `--format <format>` | json | Output format: json, sarif, junit |
| `--output <path>` | stdout | Output file path |
| `--config <path>` | auto-discover | Path to `.a11yrc.json` |

### Crawl Command Options

| Option | Default | Description |
|--------|---------|-------------|
| `--url <url>` | (required) | Seed URL to crawl |
| `--max-pages <n>` | 50 | Maximum pages to scan |
| `--max-depth <n>` | 3 | Maximum crawl depth |
| `--concurrency <n>` | 3 | Concurrent page scans |
| `--threshold <score>` | 70 | Minimum accessibility score |
| `--format <format>` | json | Output format: json, sarif, junit |
| `--output <path>` | stdout | Output file path |

### Configuration File

- Name: `.a11yrc.json`
- Discovery: auto-discovered by walking up from CWD to filesystem root.
- CLI flags always take precedence over config file values.

---

## 6. Gaps, Blockers, and Readiness Assessment

### No Blockers Identified

All prerequisites for implementation are met:

| Requirement | Status | Notes |
|-------------|--------|-------|
| `.github/agents/` directory | **CREATE** | Does not exist, must be created |
| `.agent.md` schema understood | **READY** | Full schema documented from prompt-builder + VS Code docs |
| Codebase analysis complete | **READY** | Scanner engine, CLI, types, scoring fully documented |
| WCAG 2.2 rules documented | **READY** | Complete criteria, remediation patterns, detection gaps |
| CLI integration understood | **READY** | `a11y-scan scan` and `a11y-scan crawl` commands documented |
| Cross-platform compatibility | **READY** | Omit `target` field for VS Code + GitHub.com support |
| HVE Core authoring standards | **READY** | Full schema, writing style, protocol patterns documented |

### Implementation Gaps (Minor)

1. **No MCP servers configured** — The agents will rely on built-in VS Code tools (`run_in_terminal`, `read_file`, `edit`, `search`). MCP servers would enhance capabilities but are not required.
2. **CLI requires build step** — The `a11y-scan` binary runs from `dist/`, so `npm run build` must complete before CLI invocation. Agents should instruct users to build first or use `npx ts-node` alternatives.
3. **No `.a11yrc.json` example in repo root** — Agents could instruct creation of a default config file.
4. **Remediation patterns not packaged** — The AODA/WCAG remediation patterns from research are in the subagent document, not yet in an instructions file the agents can reference. Consider creating `.github/instructions/wcag22-rules.instructions.md` or `.github/instructions/a11y-remediation.instructions.md`.

### Design Decisions Required

1. **Single vs. separate instructions files** — Should WCAG detection rules and remediation patterns be in one or two `.instructions.md` files?
2. **Handoff between agents** — Should A11y Detector handoff to A11y Resolver, or should they be independent?
3. **Tool restrictions** — Should agents restrict tools (read-only for Detector, edit+read for Resolver) or leave unrestricted?
4. **Skill files** — Should remediation patterns be packaged as a SKILL.md with structured lookup tables?

---

## References and Evidence

| Source | Location | Key Content |
|--------|----------|-------------|
| HVE Core prompt-builder.instructions.md | `c:\Users\emknafo\.vscode\extensions\ise-hve-essentials.hve-core-3.0.2\.github\instructions\hve-core\prompt-builder.instructions.md` | Complete authoring standards, frontmatter schema, protocol patterns |
| VS Code custom agents research | `.copilot-tracking/research/subagents/2026-03-08/vscode-custom-agents-research.md` | Full VS Code `.agent.md` schema, cross-environment support |
| GitHub Copilot Extensions research | `.copilot-tracking/research/subagents/2026-03-08/github-copilot-extensions-research.md` | Extensions vs `.agent.md` comparison, decision to use `.agent.md` |
| AODA WCAG 2.2 standards research | `.copilot-tracking/research/subagents/2026-03-08/aoda-wcag22-standards-research.md` | Complete WCAG 2.2 criteria, remediation patterns, detection gaps |
| Codebase analysis research | `.copilot-tracking/research/subagents/2026-03-08/codebase-analysis-research.md` | Scanner architecture, CLI, scoring, types, reports |
| Existing instructions file | `.github/instructions/ado-workflow.instructions.md` | Current frontmatter format convention |
| package.json | `package.json` | Project name, CLI binary, scripts |
