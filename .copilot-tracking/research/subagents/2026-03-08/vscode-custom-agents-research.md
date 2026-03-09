<!-- markdownlint-disable-file -->

# VS Code Custom Copilot Agents Research

## Research Status: Complete

## Research Topics and Questions

1. How does the `.github/agents/*.agent.md` pattern work for defining custom Copilot agents?
2. What is the YAML frontmatter schema? What fields are required?
3. What tools can agents reference? MCP tools, built-in tools, custom tool definitions?
4. How do `.instructions.md` files relate to agents? How does `applyTo` scoping work?
5. How do skills (`SKILL.md`) enhance agent capabilities?
6. What is the relationship between `.agent.md` files and VS Code Chat Participants API?
7. GitHub Copilot Extensions vs VS Code agents — how do they differ?
8. What is VS Code Copilot "agent mode" and how do custom agents integrate?

---

## 1. VS Code Agent Definition Files (`.agent.md`)

### Overview

Custom agents are Markdown files with `.agent.md` extension that define specialized AI personas with tailored behavior, tools, and instructions. They were previously known as "custom chat modes" (`.chatmode.md`) and were renamed in VS Code 1.106.

### File Locations

| Scope | Location |
|-------|----------|
| Workspace | `.github/agents/` folder (auto-detected by VS Code) |
| User profile | `prompts` folder of the current VS Code profile |
| Claude format | `.claude/agents/` folder (cross-tool compatibility) |
| Custom | `chat.agentFilesLocations` setting for additional locations |
| Extension-contributed | Via `chatAgents` contribution point in `package.json` |
| Organization-level | Defined at GitHub organization level, auto-detected when `github.copilot.chat.organizationCustomAgents.enabled` is `true` |

VS Code detects any `.md` files in the `.github/agents` folder as custom agents (not just `.agent.md`).

### File Structure

Agent files consist of two parts:

1. **YAML frontmatter header** (optional) — configures name, description, tools, and settings
2. **Markdown body** — contains instructions, guidelines, and behavioral prompts

---

## 2. Complete YAML Frontmatter Schema for `.agent.md` Files

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `description` | string | Brief description of the agent, shown as placeholder text in chat input. **Required for all file types.** |

### Optional Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `name` | string | Filename | Human-readable agent name (e.g., `Prompt Builder`). Displayed in agent picker. |
| `argument-hint` | string | — | Hint text shown in chat input to guide usage. |
| `tools` | array of strings | All tools | List of tool/tool set names available. Supports built-in tools, MCP tools (`<server>/*`), and extension tools. When omitted, all tools accessible. |
| `agents` | array or `*` or `[]` | `*` | Which agents can run as subagents. `*` = all, `[]` = none, or explicit list of agent names. |
| `model` | string or array | Current model | AI model to use. String for single model (e.g., `gpt-4o`), array for prioritized fallback list. |
| `user-invocable` | boolean | `true` | Whether agent appears in the agents dropdown. Set `false` for subagent-only agents. |
| `disable-model-invocation` | boolean | `false` | Prevents agent from being auto-invoked as a subagent by other agents. Set `true` for user-only explicit invocation. |
| `target` | string | Both | Target environment: `vscode` or `github-copilot`. Omit to use in both. |
| `mcp-servers` | list | — | MCP server config JSON for use with GitHub Copilot (`target: github-copilot`). |
| `handoffs` | array of objects | — | Suggested next actions to transition between agents. |
| `infer` | boolean | `true` | **Deprecated.** Use `user-invocable` and `disable-model-invocation` instead. |

### Handoffs Schema

Each handoff object:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `label` | string | Yes | Display text on the handoff button. Supports emoji. |
| `agent` | string | Yes | Target agent identifier (human-readable `name` from target agent's frontmatter). |
| `prompt` | string | No | Prompt text to send to the target agent (e.g., a slash command). |
| `send` | boolean | No | Auto-submit the prompt. Default `false`. |
| `model` | string | No | Model to use for this handoff (format: `Model Name (vendor)`). |

### Frontmatter Examples

**Full agent with tools and subagents:**

```yaml
---
name: Task Planner
description: 'Implementation planner for creating actionable plans'
disable-model-invocation: true
agents:
  - Researcher Subagent
  - Plan Validator
handoffs:
  - label: "⚡ Implement"
    agent: Task Implementor
    prompt: /task-implement
    send: true
  - label: "Compact"
    agent: Task Planner
    send: true
    prompt: "/compact summarize state"
---
```

**Subagent with tool restrictions:**

```yaml
---
name: Prompt Tester
description: 'Tests prompt files in a sandbox environment'
user-invocable: false
tools:
  - read_file
  - create_file
  - run_in_terminal
---
```

**Planning agent (read-only):**

```yaml
---
description: Generate an implementation plan
tools: ['search', 'fetch']
handoffs:
  - label: Start Implementation
    agent: implementation
    prompt: Now implement the plan outlined above.
    send: false
---
```

**TDD coordinator with restricted subagents:**

```yaml
---
name: TDD
tools: ['agent']
agents: ['Red', 'Green', 'Refactor']
---
```

**Cross-environment agent:**

```yaml
---
name: test-specialist
description: Focuses on test coverage and quality
target: github-copilot
---
```

---

## 3. Agent Tool Capabilities

### Tool Types Agents Can Reference

1. **Built-in VS Code tools**: `read`, `edit`, `search`, `fetch`, `agent`, `runSubagent`, etc.
2. **Tool sets**: Named groups of tools.
3. **MCP tools**: Individual tools from MCP servers (e.g., `my-mcp-server/tool-1`) or all tools from a server (`my-mcp-server/*`).
4. **Extension-contributed tools**: Tools registered by VS Code extensions.

### Tool List Priority

When tools are specified in multiple places:

1. Tools specified in the prompt file (highest priority)
2. Tools from the referenced custom agent in the prompt file
3. Default tools for the selected agent

If a tool is not available at runtime, it is silently ignored.

### Tool Restriction Patterns

- **Omit `tools`**: Agent gets all available tools (default).
- **Explicit list**: Only listed tools are available.
- **Read-only agent**: `tools: ['read', 'search', 'fetch']`
- **Full editing**: `tools: ['read', 'edit', 'search', 'agent']`
- **MCP server access**: `tools: ['read', 'edit', 'some-server/*']`

### `#tool:<tool-name>` References

In the body text of agent files, use `#tool:<tool-name>` syntax to reference specific tools (e.g., `#tool:githubRepo`).

---

## 4. Instructions Files (`.instructions.md`)

### How Instructions Relate to Agents

Instructions files define coding standards, conventions, and patterns that Copilot automatically follows. They complement agents by providing always-applied or conditionally-applied context:

- Agents can reference instructions via Markdown links in their body
- Instructions apply automatically based on `applyTo` glob patterns
- Instructions can also match by `description` (semantic matching against current task)

### Instructions File Format

```yaml
---
name: 'Python Standards'              # Optional, display name
description: 'Coding conventions'      # Optional, shown on hover
applyTo: '**/*.py'                     # Optional glob, auto-applies to matching files
---
# Instructions content in Markdown
```

### `applyTo` Scoping Rules

- Glob patterns relative to the workspace root
- `**` applies to all files
- `**/*.py` applies to all Python files
- `src/frontend/**` applies to files in the frontend folder
- If `applyTo` is omitted, instructions are not auto-applied but can be manually attached
- Matching logic uses the `description` for semantic relevance when no glob match

### Instruction Locations

| Scope | Location |
|-------|----------|
| Workspace | `.github/instructions/` folder |
| User profile | `prompts` folder of the current VS Code profile |
| Claude format | `.claude/rules/` folder (uses `paths` instead of `applyTo`) |
| Custom | `chat.instructionsFilesLocations` setting |
| Extension-contributed | Via `chatInstructions` contribution point in `package.json` |

### Types of Instructions

1. **Always-on**: `.github/copilot-instructions.md`, `AGENTS.md`, `CLAUDE.md` — applied to every request
2. **File-based**: `*.instructions.md` files with `applyTo` patterns
3. **Organization-level**: Shared across repos in a GitHub organization

### Priority Order

1. Personal instructions (user-level, highest)
2. Repository instructions (`.github/copilot-instructions.md`, `AGENTS.md`)
3. Organization instructions (lowest)

### Extension Integration

Extensions register instructions via `chatInstructions` contribution point:

```json
{
  "contributes": {
    "chatInstructions": [
      { "path": "./.github/instructions/hve-core/commit-message.instructions.md" }
    ]
  }
}
```

---

## 5. Skills (`SKILL.md`)

### Overview

Skills are self-contained packages of instructions, scripts, and resources that Copilot loads on demand. They differ from instructions by providing concrete utilities rather than just guidelines.

### Skill vs Instructions

| Aspect | Agent Skills | Custom Instructions |
|--------|-------------|-------------------|
| Purpose | Teach specialized capabilities | Define coding standards |
| Portability | VS Code, Copilot CLI, Copilot coding agent | VS Code and GitHub.com only |
| Content | Instructions, scripts, examples, resources | Instructions only |
| Scope | Task-specific, loaded on-demand | Always applied or glob-based |
| Standard | Open standard (agentskills.io) | VS Code-specific |

### Skill File Format

```yaml
---
name: skill-name                    # Required, must match directory name
description: Description of skill   # Required, max 1024 chars
argument-hint: '[test file]'        # Optional
user-invocable: true                # Optional, default true
disable-model-invocation: false     # Optional, default false
---
# Skill Instructions
```

### Skill Directory Structure

```text
.github/skills/<skill-name>/
├── SKILL.md                    # Main definition (required)
├── scripts/                    # Executable scripts (optional)
│   ├── <action>.sh
│   └── <action>.ps1
├── references/                 # On-demand docs (optional)
│   ├── REFERENCE.md
│   └── FORMS.md
└── assets/                     # Templates, images, data (optional)
```

### Skill Locations

| Scope | Location |
|-------|----------|
| Project | `.github/skills/`, `.claude/skills/`, `.agents/skills/` |
| Personal | `~/.copilot/skills/`, `~/.claude/skills/`, `~/.agents/skills/` |
| Extension | Via `chatSkills` contribution point in `package.json` |

### Progressive Disclosure (3-Level Loading)

1. **Level 1 - Discovery**: `name` + `description` frontmatter (~100 tokens)
2. **Level 2 - Instructions**: Full `SKILL.md` body loads when skill activates (<5000 tokens recommended)
3. **Level 3 - Resources**: Scripts, examples, references load on demand

### How Skills Enhance Agents

- Skills provide specialized capabilities agents can invoke
- Available as slash commands (`/skill-name`)
- Automatically loaded when task matches description
- Can be invoked by agents through natural language task delegation
- Work across VS Code, GitHub Copilot CLI, and GitHub Copilot coding agent

---

## 6. Chat Participants API vs `.agent.md` Files

### Key Distinction

**They are different systems that serve different purposes:**

| Aspect | `.agent.md` Custom Agents | Chat Participants API |
|--------|--------------------------|----------------------|
| Definition | Markdown files with YAML frontmatter | VS Code Extension API (TypeScript) |
| Creation | Simple file creation, no coding | Requires building a VS Code extension |
| Mechanism | Instructions + tool restrictions | Programmatic request/response handler |
| Invocation | Agent picker dropdown | `@participant` mention in chat |
| Distribution | Files in workspace, profile, or extension `chatAgents` | VS Code Extension Marketplace |
| Capabilities | Persona + tools + instructions | Full programmatic control, custom UI, follow-ups |

### Chat Participants API (Extension-based)

- **Registered via `vscode.chat.createChatParticipant()`** in TypeScript
- Invoked with `@participantName` in chat
- Can register slash commands, provide follow-up suggestions, and render custom markdown
- Declared in `package.json` under `contributes.chatParticipants`
- Full access to VS Code API for reading files, running commands, etc.

### `.agent.md` Custom Agents (File-based)

- No code required — pure Markdown with YAML frontmatter
- Selected from agents dropdown (not `@` mention)
- Behavior defined entirely through instructions and tool restrictions
- Extensions can contribute agents via `chatAgents` contribution point in `package.json`
- Can orchestrate subagents for complex workflows

### Relationship

Custom agents (`.agent.md`) are the **no-code, declarative** approach. Chat Participants are the **programmatic, extension-based** approach. Both can coexist. Extensions like HVE Core use the `chatAgents` contribution point to distribute `.agent.md` files without writing Chat Participant handler code.

---

## 7. GitHub Copilot Extensions vs VS Code Custom Agents

### GitHub Copilot Extensions

- **Server-side components** that run as GitHub Apps
- Accessed via `@extension-name` in GitHub.com Copilot Chat
- Built with the Copilot Extensions API (webhooks + REST API)
- Can integrate with external services, databases, APIs
- Deployed as web services
- Listed in the GitHub Marketplace

### VS Code Custom Agents (`.agent.md`)

- **File-based** definitions in workspace or user profile
- Selected from the agents dropdown in VS Code
- Work with `target: vscode` (VS Code only), `target: github-copilot` (GitHub only), or both (omit `target`)
- No server infrastructure required
- Use MCP servers for external service integration

### Cross-Environment Compatibility

The `.agent.md` format works across multiple environments:

| Environment | Support |
|-------------|---------|
| VS Code | Full support, auto-detected in `.github/agents/` |
| GitHub.com (Copilot coding agent) | Full support, reads `.github/agents/` from repo |
| JetBrains IDEs | Supported (public preview) |
| Eclipse | Supported (public preview) |
| Xcode | Supported (public preview) |
| GitHub Copilot CLI | Supported |
| Claude Code | `.claude/agents/` format supported |

### Making Agents Work in Both VS Code and GitHub

1. Place `.agent.md` files in `.github/agents/` directory
2. Omit the `target` field (or set both environments explicitly)
3. Use `mcp-servers` property for GitHub Copilot environment-specific MCP servers
4. Be aware that some fields may behave differently between environments:
   - `model` field works in IDEs but may be ignored on GitHub.com
   - `handoffs` are VS Code-specific
   - `agents` (subagent restrictions) is VS Code-specific
   - `mcp-servers` in frontmatter is primarily for `target: github-copilot`

### These Are NOT the Same as GitHub Copilot Extensions

GitHub Copilot Extensions (the `@extension` pattern) and VS Code custom agents (`.agent.md`) are fundamentally different:

- Extensions are server-side GitHub Apps
- Custom agents are declarative Markdown files
- They cannot be interchanged
- Custom agents are much simpler to create and maintain

---

## 8. Agent Mode and Custom Agent Integration

### What is Agent Mode?

Agent mode is VS Code's built-in Copilot capability for autonomous multi-step task execution. In agent mode, Copilot can:

- Plan and execute multi-step tasks
- Read and write files
- Run terminal commands
- Use MCP tools
- Iterate on errors and fix them

### How Custom Agents Integrate with Agent Mode

Custom agents effectively **are** agent mode configurations:

- When you select a custom agent, it replaces the default agent configuration
- The agent's tools, instructions, and model settings are applied
- The agent can orchestrate subagents via the `runSubagent` tool
- Handoffs enable transitioning between specialized agents during workflows

### Built-in Agents

VS Code provides several built-in agents:

- **Agent** (default): Full tool access for coding tasks
- **Ask**: Read-only, conversation-focused
- **Plan**: Creates implementation plans before coding
- **Edit**: Focuses on file editing

Custom agents extend this set with specialized personas.

---

## 9. Extension Distribution of Agents

### Contributing Agents via VS Code Extensions

Extensions use the `chatAgents` contribution point in `package.json`:

```json
{
  "contributes": {
    "chatAgents": [
      { "path": "./.github/agents/hve-core/task-planner.agent.md" },
      { "path": "./.github/agents/hve-core/subagents/researcher-subagent.agent.md" }
    ],
    "chatPromptFiles": [
      { "path": "./.github/prompts/hve-core/task-research.prompt.md" }
    ],
    "chatInstructions": [
      { "path": "./.github/instructions/hve-core/commit-message.instructions.md" }
    ],
    "chatSkills": [
      { "path": "./.github/skills/shared/pr-reference/SKILL.md" }
    ]
  }
}
```

### HVE Core Extension as a Reference Implementation

The HVE Core extension (`ise-hve-essentials.hve-core`) from Microsoft provides a comprehensive example:

- **10 agents**: Task Researcher, Task Planner, Task Implementor, Task Reviewer, PR Review, Doc Ops, Memory, Prompt Builder, RPI Agent
- **8 subagents**: Researcher Subagent, Phase Implementor, Plan Validator, Prompt Evaluator, Prompt Tester, Prompt Updater, Implementation Validator, RPI Validator
- **15 prompt files**: For research, planning, implementation, review, commits, merges, PRs
- **6 instruction files**: Commit messages, git merge, markdown, prompt builder, pull requests, writing style
- **1 skill**: PR Reference

---

## 10. Agent Orchestration Patterns (from HVE Core and VS Code Docs)

### Coordinator and Worker Pattern

A coordinator agent delegates to specialized worker subagents:

```yaml
---
name: Feature Builder
tools: ['agent', 'edit', 'search', 'read']
agents: ['Planner', 'Implementer', 'Reviewer']
---
```

### Subagent Hierarchy

- Parent agents declare subagent dependencies in `agents:` frontmatter
- Subagents set `user-invocable: false` to hide from user picker
- Subagents cannot run their own subagents — only the root orchestrator manages subagent calls
- Explicit `agents:` list overrides `disable-model-invocation: true`

### Parallel Execution

VS Code can run multiple subagents in parallel when tasks are independent:

```markdown
Run these subagents in parallel:
- Security reviewer
- Performance reviewer
- Accessibility reviewer
```

### Handoff Workflows

Sequential workflows using handoffs:

```
Task Researcher → Task Planner → Task Implementor → Task Reviewer
```

Each agent defines handoff buttons to the next step.

---

## 11. Prompt Files (`.prompt.md`) and Their Relationship to Agents

### Prompt File Format

```yaml
---
description: 'Task description'
agent: Task Researcher              # Delegates to a custom agent
argument-hint: "topic=... [chat={true|false}]"
tools: ['read', 'search']          # Optional tool overrides
model: gpt-4o                      # Optional model override
---
# Prompt instructions in Markdown body
```

### Prompt-Agent Relationship

- Prompts can set `agent:` to delegate execution to a custom agent
- When delegated, the prompt inherits the agent's protocol, phases, and subagent orchestration
- Prompts can override tools but inherit agent tools if not specified
- Prompts add requirements or scope limits on top of the agent's default behavior

### Prompt Locations

| Scope | Location |
|-------|----------|
| Workspace | `.github/prompts/` folder |
| User profile | `prompts` folder of current VS Code profile |
| Extension | Via `chatPromptFiles` contribution point |

---

## 12. Key Limitations and Requirements

1. **No `@agent` mentions**: Custom agents are selected from the dropdown, not invoked with `@` syntax (that's for Chat Participants API extensions)
2. **Subagent depth = 1**: Subagents cannot run their own subagents
3. **No programmatic handlers**: Custom agents are purely declarative — no code execution callbacks
4. **Tool availability**: If a tool listed in frontmatter is not available, it is silently ignored
5. **Context window limits**: Subagents get their own context window but don't inherit the parent's conversation history
6. **Max prompt size**: Agent body content maximum is 30,000 characters (GitHub.com limit)
7. **Cross-environment differences**: Some properties (`handoffs`, `agents`, `model`) may not work identically across VS Code and GitHub.com
8. **Claude format compatibility**: VS Code also detects `.md` files in `.claude/agents/` following the Claude sub-agents format

---

## 13. Creating a Custom Agent: Step-by-Step

### Using the VS Code UI

1. Open Chat view → agents dropdown → **Configure Custom Agents** → **Create new custom agent**
2. Choose location (Workspace in `.github/agents/` or User profile)
3. Enter filename
4. Configure YAML frontmatter and Markdown body

### Using AI Generation

Type `/create-agent` in Agent mode chat and describe the persona. Copilot will:
- Ask clarifying questions
- Generate the `.agent.md` file with tools, instructions, and frontmatter
- You can also extract from a conversation: "make an agent for this kind of task"

### Manual File Creation

1. Create `.github/agents/` directory in workspace
2. Create `my-agent.agent.md` file
3. Add YAML frontmatter with at least `description`
4. Add behavioral instructions in Markdown body

---

## References and Evidence

| Source | URL | Key Content |
|--------|-----|-------------|
| VS Code Custom Agents Docs | https://code.visualstudio.com/docs/copilot/customization/custom-agents | Official schema, file structure, handoffs |
| VS Code Subagents Docs | https://code.visualstudio.com/docs/copilot/agents/subagents | Subagent execution, orchestration patterns |
| VS Code Custom Instructions | https://code.visualstudio.com/docs/copilot/customization/custom-instructions | `.instructions.md` format, `applyTo`, priority |
| VS Code Agent Skills | https://code.visualstudio.com/docs/copilot/customization/agent-skills | `SKILL.md` format, progressive disclosure |
| VS Code Prompt Files | https://code.visualstudio.com/docs/copilot/customization/prompt-files | `.prompt.md` format, agent delegation |
| VS Code Customization Overview | https://code.visualstudio.com/docs/copilot/customization/overview | Full customization taxonomy |
| GitHub Creating Custom Agents | https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/create-custom-agents | GitHub.com agent profiles, cross-environment |
| HVE Core Extension | `ise-hve-essentials.hve-core-3.0.2` | Real-world implementation with 10+ agents |
| HVE Core prompt-builder.instructions.md | Local file | Comprehensive authoring standards |
| Agent Skills Standard | https://agentskills.io/ | Open standard specification |

---

## Discovered Topics for Further Research

- [ ] VS Code Hooks (`hooks`) lifecycle automation and how they interact with agents
- [ ] Agent Plugins (Preview) — pre-packaged bundles from plugin marketplaces
- [ ] Background agents and cloud agents support for custom agent definitions
- [ ] Organization-level agent sharing via `.github-private` repository
- [ ] `chat.agentFilesLocations` setting for centralized agent management
- [ ] Claude format mapping differences between VS Code and Claude Code
- [ ] Agent Skills open standard specification details at agentskills.io
