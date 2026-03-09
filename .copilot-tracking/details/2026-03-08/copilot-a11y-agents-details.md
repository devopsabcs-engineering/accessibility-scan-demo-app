<!-- markdownlint-disable-file -->
# Implementation Details: Custom Copilot Agents for AODA WCAG 2.2 Accessibility

## Context Reference

Sources: [copilot-a11y-agents-research.md](../../research/2026-03-08/copilot-a11y-agents-research.md), [implementation-readiness-research.md](../../research/subagents/2026-03-08/implementation-readiness-research.md), [aoda-wcag22-standards-research.md](../../research/subagents/2026-03-08/aoda-wcag22-standards-research.md), [vscode-custom-agents-research.md](../../research/subagents/2026-03-08/vscode-custom-agents-research.md), [codebase-analysis-research.md](../../research/subagents/2026-03-08/codebase-analysis-research.md)

## Implementation Phase 1: Create Agent Definition Files

<!-- parallelizable: true -->

### Step 1.1: Create A11y Detector Agent

Create `.github/agents/a11y-detector.agent.md` — the detection-focused agent definition.

**YAML Frontmatter:**

```yaml
---
name: A11y Detector
description: 'Detects AODA WCAG 2.2 accessibility violations through static code analysis and runtime scanning'
tools:
  - read_file
  - grep_search
  - semantic_search
  - file_search
  - list_dir
  - run_in_terminal
  - manage_todo_list
  - runSubagent
handoffs:
  - label: "Fix Violations"
    agent: A11y Resolver
    prompt: "Fix the accessibility violations found above"
    send: false
---
```

**Agent Body Structure** (step-based protocol):

1. Introduction section: AODA/WCAG 2.2 context, agent purpose, limitations (automated detection covers ~35-40% of criteria)
2. Step 1 — Understand scope: determine target files, pages, or URLs to scan
3. Step 2 — Static code analysis: read source files and identify WCAG antipatterns using `read_file`, `grep_search`, `semantic_search`
   * Missing `alt` on `<img>` and Next.js `<Image>` components
   * Missing `lang` attribute on `<html>` element
   * Form inputs without associated labels (`<label htmlFor>` or `aria-label`)
   * Icon-only links/buttons without accessible names
   * Heading hierarchy violations (skipped levels, empty headings)
   * Non-semantic interactive elements (`div` as button/link)
   * ARIA misuse (invalid roles, missing required attributes)
   * CSS/Tailwind: missing focus indicators, `maximum-scale=1`, small target sizes
   * WCAG 2.2 specifics: sticky elements obscuring focus, missing drag alternatives
4. Step 3 — Runtime scanning (optional): invoke `npx a11y-scan scan --url <url>` or `npx a11y-scan crawl --url <url>` via terminal
   * Remind user to start dev server (`npm run dev`) if scanning localhost
   * Parse JSON output for structured violation data
5. Step 4 — Report findings: structured markdown output organized by impact severity (critical > serious > moderate > minor)
   * Each violation: WCAG criterion, impact, affected file/element, description, suggested fix
   * Summary: total violations by severity, accessibility score, POUR principle breakdown
6. Handoff guidance: offer handoff button to A11y Resolver for remediation

**Key content from research to embed in agent body:**

* Top 10 React/Next.js violations list (research Lines 106-117)
* WCAG 2.2 new criteria: 2.4.11 Focus Not Obscured, 2.5.7 Dragging Movements, 2.5.8 Target Size, 3.2.6 Consistent Help, 3.3.7 Redundant Entry, 3.3.8 Accessible Authentication
* CLI scanner usage: `a11y-scan scan --url <url> --format json` and `a11y-scan crawl --url <url> --format json`
* Static analysis patterns for grep_search: `<img(?![^>]*alt)`, `<Image(?![^>]*alt)`, `<html(?![^>]*lang)`, `onClick(?!.*role)`, `<div[^>]*onClick`

Files:
* `.github/agents/a11y-detector.agent.md` — New file, the detection agent definition

Success criteria:
* File loads in VS Code agent picker as "A11y Detector"
* YAML frontmatter validates (description under 120 chars, tools array, handoffs array)
* Body content under 30,000 characters
* No `maturity` field in frontmatter

### Step 1.2: Create A11y Resolver Agent

Create `.github/agents/a11y-resolver.agent.md` — the remediation-focused agent definition.

**YAML Frontmatter:**

```yaml
---
name: A11y Resolver
description: 'Resolves AODA WCAG 2.2 accessibility violations with standards-compliant code fixes'
tools:
  - read_file
  - replace_string_in_file
  - multi_replace_string_in_file
  - create_file
  - grep_search
  - semantic_search
  - file_search
  - list_dir
  - run_in_terminal
  - manage_todo_list
  - get_errors
  - runTests
handoffs:
  - label: "Re-scan"
    agent: A11y Detector
    prompt: "Scan the codebase again to verify the fixes applied"
    send: false
---
```

**Agent Body Structure** (step-based protocol):

1. Introduction section: agent purpose, fix prioritization strategy (critical → serious → moderate → minor)
2. Step 1 — Identify violations: accept input from Detector handoff, scan results, or user description
3. Step 2 — Analyze affected code: read source files containing violations using `read_file`
4. Step 3 — Apply fixes: use remediation patterns for each violation type
   * Embed the complete remediation lookup table (research Lines 218-236)
   * React/Next.js specific patterns: `useId()` for unique IDs, `<Image alt>` prop, `layout.tsx` lang attribute
   * WCAG 2.2 fixes: `scroll-padding-top` for focus obscured, min 24x24px targets, drag alternatives
   * ARIA patterns: correct widget roles, focus management with `useRef`/`useFocusTrap`, `aria-live` regions
5. Step 4 — Verify fixes: re-run scanner (`npx a11y-scan scan --url <url>`) and run tests (`npm run test`)
6. Step 5 — Report: summary of changes made, before/after impact, remaining issues
7. Handoff guidance: offer re-scan via A11y Detector

**Key content from research to embed in agent body:**

* Complete remediation patterns table (18 rows covering top violations)
* React/Next.js best practices for accessibility
* Common anti-patterns to avoid (e.g., `tabIndex > 0`, `role="button"` on div without keyboard handlers, `aria-hidden` on focusable elements)
* Verification workflow using CLI scanner

Files:
* `.github/agents/a11y-resolver.agent.md` — New file, the remediation agent definition

Discrepancy references:
* DD-01: Agent body may approach 30K char limit with full remediation table; may need to reference instructions file instead

Success criteria:
* File loads in VS Code agent picker as "A11y Resolver"
* YAML frontmatter validates (description under 120 chars, tools array with edit capabilities, handoffs array)
* Body content under 30,000 characters
* Remediation patterns cover all 18 top violations from research

## Implementation Phase 2: Create Supporting Instructions Files

<!-- parallelizable: true -->

### Step 2.1: Create WCAG 2.2 Rules Instructions

Create `.github/instructions/wcag22-rules.instructions.md` — auto-applied WCAG compliance rules for all web component files.

**YAML Frontmatter:**

```yaml
---
description: 'AODA WCAG 2.2 Level AA compliance rules for accessibility in web components'
applyTo: '**/*.tsx, **/*.jsx, **/*.ts, **/*.html, **/*.css'
---
```

**Body Content:**

1. AODA/WCAG 2.2 context: AODA requires WCAG 2.0 Level AA, WCAG 2.2 is backwards compatible
2. WCAG 2.2 Level AA rules organized by POUR principles:
   * **Perceivable**: text alternatives (1.1.1), captions (1.2.2), info and relationships (1.3.1), meaningful sequence (1.3.2), sensory characteristics (1.3.3), orientation (1.3.4), input purpose (1.3.5), contrast minimum (1.4.3), resize text (1.4.4), images of text (1.4.5), reflow (1.4.10), non-text contrast (1.4.11), text spacing (1.4.12), content on hover/focus (1.4.13)
   * **Operable**: keyboard (2.1.1), no keyboard trap (2.1.2), timing adjustable (2.2.1), pause/stop/hide (2.2.2), three flashes (2.3.1), bypass blocks (2.4.1), page titled (2.4.2), focus order (2.4.3), link purpose (2.4.4), headings and labels (2.4.6), focus visible (2.4.7), focus not obscured minimum (2.4.11), dragging movements (2.5.7), target size minimum (2.5.8)
   * **Understandable**: language of page (3.1.1), language of parts (3.1.2), on focus (3.2.1), on input (3.2.2), consistent navigation (3.2.3), consistent identification (3.2.4), consistent help (3.2.6), error identification (3.3.1), labels or instructions (3.3.2), error suggestion (3.3.3), error prevention legal/financial/data (3.3.4), redundant entry (3.3.7), accessible authentication minimum (3.3.8)
   * **Robust**: parsing (4.1.1), name/role/value (4.1.2), status messages (4.1.3)
3. React/Next.js specific rules:
   * Always provide `alt` prop on `<Image>` components
   * Use `htmlFor` (not `for`) on `<label>` elements
   * Use `useId()` hook for unique element IDs
   * Include `lang` attribute on `<html>` in root `layout.tsx`
   * Use semantic HTML elements over ARIA when possible
4. This repository's scoring system reference: grades A–F, impact weights

Files:
* `.github/instructions/wcag22-rules.instructions.md` — New file, auto-applied WCAG rules

Success criteria:
* File auto-applies to TSX/JSX/TS/HTML/CSS files via `applyTo` glob
* All WCAG 2.2 Level AA criteria referenced with SC numbers
* React/Next.js specific guidance included
* YAML frontmatter has `description` and `applyTo` fields

Context references:
* [aoda-wcag22-standards-research.md](../../research/subagents/2026-03-08/aoda-wcag22-standards-research.md) — Full WCAG 2.2 criteria list
* [copilot-a11y-agents-research.md](../../research/2026-03-08/copilot-a11y-agents-research.md) (Lines 68-78) — AODA/WCAG relationship

Dependencies:
* None (standalone file)

### Step 2.2: Create Remediation Patterns Instructions

Create `.github/instructions/a11y-remediation.instructions.md` — remediation patterns reference for code fixes.

**YAML Frontmatter:**

```yaml
---
description: 'AODA WCAG 2.2 accessibility remediation patterns and code fix recipes for web components'
applyTo: '**/*.tsx, **/*.jsx, **/*.ts, **/*.html, **/*.css'
---
```

**Body Content:**

1. Fix prioritization: critical (score impact 10) → serious (7) → moderate (3) → minor (1)
2. Complete remediation lookup table organized by violation ID:
   * `image-alt` / `image-alt-nextjs` → Add `alt="Description"` or `alt=""` for decorative
   * `color-contrast` → Darken text or lighten background to meet 4.5:1 ratio
   * `link-name` → Add `aria-label` or visually hidden text
   * `button-name` → Add `aria-label` or visible text content
   * `label` → Add `<label htmlFor="id">` or `aria-label`
   * `html-has-lang` → Add `lang="en"` to `<html>` in root `layout.tsx`
   * `heading-order` → Use sequential heading levels (h1 → h2 → h3)
   * `bypass` → Add skip navigation link as first focusable element
   * `focus-visible` → Add `:focus-visible` CSS with visible outline
   * `target-size` → Ensure minimum 24x24px with padding
   * `focus-not-obscured` → Add `scroll-padding-top` for sticky headers
   * Additional patterns for ARIA, keyboard, status messages
3. React/Next.js specific patterns:
   * `useId()` for duplicate IDs
   * `<Image alt="...">` for Next.js Image component
   * Focus management with `useRef` and `useEffect`
   * `aria-live="polite"` for dynamic content updates
4. Common anti-patterns to avoid:
   * `tabIndex` values greater than 0
   * `role="button"` on `div` without keyboard event handlers
   * `aria-hidden="true"` on focusable elements
   * Suppressing zoom with `maximum-scale=1`

Files:
* `.github/instructions/a11y-remediation.instructions.md` — New file, remediation patterns reference

Discrepancy references:
* DR-01: Research contains remediation patterns for 18 violations; instructions file should cover all 18 plus additional WCAG 2.2 new criteria fixes

Success criteria:
* All 18 remediation patterns from research included
* React/Next.js specific patterns documented
* Anti-patterns section included
* YAML frontmatter has `description` and `applyTo` fields

Context references:
* [copilot-a11y-agents-research.md](../../research/2026-03-08/copilot-a11y-agents-research.md) (Lines 218-236) — Remediation patterns table

Dependencies:
* None (standalone file)

## Implementation Phase 3: Create Prompt Files

<!-- parallelizable: true -->

### Step 3.1: Create Quick Scan Prompt

Create `.github/prompts/a11y-scan.prompt.md` — quick scan invocation prompt.

**YAML Frontmatter:**

```yaml
---
description: 'Run an AODA WCAG 2.2 accessibility scan on the current project'
agent: A11y Detector
argument-hint: '[url=http://localhost:3000] [scope=page|site]'
---
```

**Body Content:**

1. Determine scan scope from user input (single page vs site crawl)
2. If URL provided, run runtime scan via CLI
3. If no URL, perform static code analysis of the workspace
4. Default URL: `http://localhost:3000`
5. Report findings in structured format

Files:
* `.github/prompts/a11y-scan.prompt.md` — New file, quick scan prompt

Success criteria:
* Prompt delegates to A11y Detector agent via `agent` field
* Argument hint guides user on URL and scope parameters

Context references:
* [copilot-a11y-agents-research.md](../../research/2026-03-08/copilot-a11y-agents-research.md) (Lines 270-280) — Prompt file definitions

Dependencies:
* Step 1.1 (A11y Detector agent must exist for `agent` reference)

### Step 3.2: Create Quick Fix Prompt

Create `.github/prompts/a11y-fix.prompt.md` — quick remediation prompt.

**YAML Frontmatter:**

```yaml
---
description: 'Fix accessibility violations in the current file or project'
agent: A11y Resolver
argument-hint: '[file=current] [violations=...]'
---
```

**Body Content:**

1. Determine fix scope from user input (specific file, specific violations, or full project)
2. If violations provided, apply targeted fixes
3. If no violations specified, scan current file for issues and fix them
4. Verify fixes with tests
5. Report changes made

Files:
* `.github/prompts/a11y-fix.prompt.md` — New file, quick fix prompt

Success criteria:
* Prompt delegates to A11y Resolver agent via `agent` field
* Argument hint guides user on file and violations parameters

Context references:
* [copilot-a11y-agents-research.md](../../research/2026-03-08/copilot-a11y-agents-research.md) (Lines 282-290) — Prompt file definitions

Dependencies:
* Step 1.2 (A11y Resolver agent must exist for `agent` reference)

## Implementation Phase 4: ADO Work Items and Branching

<!-- parallelizable: false -->

### Step 4.1: Create ADO Work Items

Create the work item hierarchy in Azure DevOps project `MngEnvMCAP675646` / `AODA WCAG compliance`:

**Epic** (if not exists):
* Title: "AODA WCAG 2.2 Copilot Integration"
* Tag: `Agentic AI`

**Feature** (under Epic):
* Title: "Custom Copilot Agents for Accessibility"
* Tag: `Agentic AI`

**User Stories** (under Feature):
* US-1: "Create A11y Detector Copilot agent for WCAG 2.2 violation detection" — Tag: `Agentic AI`
* US-2: "Create A11y Resolver Copilot agent for WCAG 2.2 remediation" — Tag: `Agentic AI`
* US-3: "Create WCAG 2.2 compliance instructions for auto-applied accessibility rules" — Tag: `Agentic AI`
* US-4: "Create quick-action prompt files for scan and fix workflows" — Tag: `Agentic AI`

Files:
* No file operations; ADO API calls via MCP tools

Success criteria:
* Epic → Feature → User Stories hierarchy in ADO
* All items tagged with `Agentic AI`
* Work item IDs available for AB# commit linking

Dependencies:
* ADO access to `MngEnvMCAP675646` / `AODA WCAG compliance`

### Step 4.2: Create Feature Branch and Commit

Create feature branch and commit all new files:

1. Create branch: `feature/{US-1-id}-copilot-a11y-agents`
2. Stage all new files in `.github/agents/`, `.github/instructions/`, `.github/prompts/`
3. Commit with message: `feat(agents): add AODA WCAG 2.2 accessibility detector and resolver agents AB#{US-1-id}`
4. Push branch to remote
5. Create PR targeting `main` with `Fixes AB#{US-1-id}` in description

Files:
* All files created in Phases 1-3

Success criteria:
* Feature branch created from `main`
* All files committed with AB# work item reference
* PR created targeting `main`

Dependencies:
* Step 4.1 (work item IDs needed for branch name and AB# references)
* Phases 1-3 complete (all files must exist before committing)

## Implementation Phase 5: Validation

<!-- parallelizable: false -->

### Step 5.1: Run full project validation

Execute all validation commands for the project:
* `npm run lint` — ESLint validation (new files are not TS/JS source, should not break)
* `npm run test` — Unit test verification (no test changes expected)
* Manually verify YAML frontmatter parses in all 6 new files
* Verify agent body content is under 30,000 characters each

### Step 5.2: Fix minor validation issues

Iterate on lint errors, build warnings, and YAML parsing issues. Apply fixes directly when corrections are straightforward and isolated.

### Step 5.3: Report blocking issues

When validation failures require changes beyond minor fixes:
* Document the issues and affected files
* Provide the user with next steps
* Recommend additional research and planning rather than inline fixes
* Avoid large-scale refactoring within this phase

## Dependencies

* VS Code with GitHub Copilot extension
* Node.js and npm
* Azure DevOps CLI or MCP tools for work item creation
* Git CLI for branching and commits

## Success Criteria

* Six new files created across `.github/agents/`, `.github/instructions/`, and `.github/prompts/`
* Both agents appear in VS Code agent picker
* Agents reference WCAG 2.2 Level AA criteria accurately
* Instructions auto-apply to TSX/JSX/TS/HTML/CSS files
* All commits linked to ADO work items via AB# syntax
* PR created targeting main with proper work item references
