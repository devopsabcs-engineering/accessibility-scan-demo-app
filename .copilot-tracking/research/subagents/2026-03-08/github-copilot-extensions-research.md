<!-- markdownlint-disable-file -->

# GitHub Copilot Extensions Research

## Research Status: Complete

## Research Topics and Questions

1. GitHub Copilot Extensions Architecture — How is it different from `.agent.md` files?
2. Copilot Extension Types — Skillsets vs Agents
3. Skillset-based Extensions — How they work, API endpoints, configuration
4. Agent-based Extensions — Webhook endpoints, message handling
5. Registration and Deployment — GitHub App setup, permissions, OAuth
6. Cross-platform Usage — GitHub.com UI and VS Code
7. Building a Copilot Extension — Technical requirements
8. Alternative: `.agent.md` approach — When to choose one over the other

---

## Related Discoveries

- GitHub has restructured its documentation as of early 2026
- All old Copilot Extensions builder docs (`/en/copilot/building-copilot-extensions/*`) now redirect to MCP docs
- The Copilot customization cheat sheet (March 2026) lists: custom instructions, prompt files, custom agents, subagents, agent skills, and MCP servers — but does NOT list "Copilot Extensions" as a customization feature
- The feature matrix still shows "Extensions" as supported across all VS Code versions (2021-2026)
- The `copilot-extensions` GitHub org still hosts code samples and the `@copilot-extensions/preview-sdk` (last updated Oct 2024)
- The `user-feedback` repo in the org is archived, suggesting public preview feedback collection ended

---

## 1. GitHub Copilot Extensions Architecture

### What Are Copilot Extensions?

GitHub Copilot Extensions are **server-side applications** registered as GitHub Apps that extend Copilot Chat with custom capabilities. Users invoke them via `@extension-name` in chat (on GitHub.com, VS Code, or other IDEs with Copilot).

### Architecture Overview

```text
User → Copilot Chat UI → GitHub Copilot Platform → Your Extension Server
                                                     ↓
                                                  (Process request)
                                                     ↓
                                                  Returns SSE stream ← Your API/Service
```

Key components:

1. **GitHub App**: The extension is registered as a GitHub App with Copilot permissions
2. **Webhook endpoint / API endpoints**: Your server receives requests from the Copilot platform
3. **Response format**: Server-Sent Events (SSE) stream back to the user
4. **Authentication**: GitHub token forwarded via `X-GitHub-Token` header
5. **Signature verification**: Requests signed with GitHub's public key for security

### How It Differs from `.agent.md` Files

| Aspect | Copilot Extensions (GitHub Apps) | `.agent.md` Custom Agents |
|--------|----------------------------------|---------------------------|
| **Type** | Server-side application | Declarative Markdown file |
| **Infrastructure** | Requires deployed web server | No infrastructure needed |
| **Invocation** | `@extension-name` in Copilot Chat | Agent picker dropdown in IDE |
| **LLM control** | Full control — can call any LLM | Uses Copilot's built-in LLM |
| **External APIs** | Can call any external API directly | Uses MCP servers for external access |
| **Distribution** | GitHub Marketplace (or private install) | Committed to repo `.github/agents/` |
| **Maintenance** | Server uptime, security patches, hosting costs | Zero maintenance — files in repo |
| **Cross-IDE** | Works in any Copilot Chat surface | VS Code, JetBrains, Eclipse, Xcode, GitHub.com |
| **Authentication** | OAuth flow, GitHub App permissions | None needed beyond Copilot access |
| **Skill floor** | Requires backend dev skills | Markdown editing only |
| **State management** | Can maintain state across requests | Stateless (context per conversation) |
| **Cost** | Server hosting costs | Free |

---

## 2. Copilot Extension Types: Skillsets vs Agents

GitHub Copilot Extensions come in two architectural patterns:

### Skillset-based Extensions

- Define **up to 5 API endpoints** that Copilot can call directly
- **Copilot handles all AI interactions**, prompt engineering, and response formatting
- Your server only provides raw data/results — no LLM integration needed
- Simpler to build, but less control over the conversation

### Agent-based Extensions

- Provide **full control** over the interaction flow
- You craft custom prompts, select specific LLM models, and format responses
- Webhook-based: receive the full conversation, process it, stream back a response
- More complex, but unlimited flexibility

### Decision Matrix

| Criterion | Use Skillsets | Use Agents |
|-----------|--------------|------------|
| Quick API integration | ✓ | |
| No AI logic needed | ✓ | |
| Consistent Copilot UX | ✓ | |
| Minimal infrastructure | ✓ | |
| Custom LLM model control | | ✓ |
| Complex conversation flows | | ✓ |
| Custom prompt engineering | | ✓ |
| Advanced state management | | ✓ |

---

## 3. Skillset-based Extensions — Deep Dive

### How They Work

1. You define up to 5 "skills" — each with a name, description, URL, parameters schema, and return type
2. Copilot's AI decides which skill to invoke based on the user's message and the inference description
3. Copilot calls your endpoint with the parsed parameters
4. Your endpoint returns raw data (string, JSON)
5. Copilot formats the response and presents it to the user

### Configuration (in GitHub App Settings)

In the **Copilot** tab of your GitHub App settings (`https://github.com/settings/apps/<app_name>/agent`), set:

- **App type**: "Skillset"
- **Skills**: Define each skill with:

```text
Name: random_commit_message
Inference description: Generates a random commit message
URL: https://<your-domain>/random-commit-message
Parameters: { "type": "object" }
Return type: String
```

### Example: Skillset Server (Go)

From `copilot-extensions/skillset-example`:

```go
package main

import (
    "net/http"
    "github.com/github/testdatabot/handlers"
)

func main() {
    http.HandleFunc("/random-commit-message", handlers.CommitMessage)
    http.HandleFunc("/random-lorem-ipsum", handlers.Loripsum)
    http.HandleFunc("/random-user", handlers.User)
    http.HandleFunc("/_ping", func(w http.ResponseWriter, r *http.Request) {
        w.Write([]byte("OK"))
    })
    http.ListenAndServe(":8080", nil)
}
```

Each handler is a simple HTTP endpoint returning plain text or JSON. No LLM logic required.

### Setup Steps for Skillsets

1. Create a GitHub App at `https://github.com/settings/apps/new`
2. Set **Callback URL** (e.g., `https://github.com` for testing)
3. Set **Homepage URL**
4. Enable **Permissions > Account Permissions > Copilot Chat > Read Only**
5. In the **Copilot** tab, select "Skillset" and define skills
6. Install the app on your account (`https://github.com/apps/<app_name>`)
7. Deploy your server (or use ngrok for local testing)

---

## 4. Agent-based Extensions — Deep Dive

### How They Work

1. User sends a message mentioning `@your-extension`
2. GitHub Copilot platform forwards the **full conversation history** to your webhook endpoint
3. Your server processes the request, optionally calling external APIs or LLMs
4. Your server streams back a response using **Server-Sent Events (SSE)**
5. Copilot renders the streamed response in the chat UI

### Webhook Request Format

Your endpoint receives a POST request with:

- **Body**: JSON with `messages` array (OpenAI chat format — `role` + `content`)
- **Headers**:
  - `X-GitHub-Token`: User's GitHub token for authentication
  - `Github-Public-Key-Identifier`: Key ID for request verification
  - `Github-Public-Key-Signature`: Request signature for verification

### Response Format (SSE Stream)

Responses use Server-Sent Events with specific event types:

```text
event: copilot_ack
data: {}

event: copilot_text
data: {"body": "Hello, world!"}

event: copilot_references
data: [{"id": "123", "type": "issue", ...}]

event: copilot_confirmation
data: {"id": "123", "title": "Are you sure?", ...}

event: copilot_errors
data: [{"type": "agent", "message": "Something went wrong"}]

event: copilot_done
data: {}
```

### Example: Agent Server (Node.js/Express)

From `copilot-extensions/blackbeard-extension`:

```javascript
import { Octokit } from "@octokit/core";
import express from "express";
import { Readable } from "node:stream";

const app = express();

app.post("/", express.json(), async (req, res) => {
    // Identify the user via the forwarded GitHub token
    const tokenForUser = req.get("X-GitHub-Token");
    const octokit = new Octokit({ auth: tokenForUser });
    const user = await octokit.request("GET /user");

    // Build messages with custom system prompts
    const messages = req.body.messages;
    messages.unshift({
        role: "system",
        content: "You are a helpful assistant that replies as Blackbeard the Pirate.",
    });
    messages.unshift({
        role: "system",
        content: `Start every response with the user's name: @${user.data.login}`,
    });

    // Call Copilot's LLM API
    const copilotLLMResponse = await fetch(
        "https://api.githubcopilot.com/chat/completions",
        {
            method: "POST",
            headers: {
                authorization: `Bearer ${tokenForUser}`,
                "content-type": "application/json",
            },
            body: JSON.stringify({ messages, stream: true }),
        }
    );

    // Stream the response back to the user
    Readable.from(copilotLLMResponse.body).pipe(res);
});

app.listen(3000);
```

### Preview SDK (`@copilot-extensions/preview-sdk`)

The official SDK simplifies agent development:

```javascript
import {
    verifyRequestByKeyId,
    createAckEvent,
    createTextEvent,
    createDoneEvent,
    parseRequestBody,
    getUserMessage,
} from "@copilot-extensions/preview-sdk";
```

**Key SDK features:**

- **Request verification**: `verifyRequestByKeyId()` validates request signatures
- **Response building**: `createAckEvent()`, `createTextEvent()`, `createDoneEvent()`
- **Confirmations**: `createConfirmationEvent()` for user confirmation dialogs
- **References**: `createReferencesEvent()` to show linked resources
- **Errors**: `createErrorsEvent()` for structured error reporting
- **Parsing**: `parseRequestBody()`, `getUserMessage()`, `getUserConfirmation()`
- **OpenAI compatibility**: `transformPayloadForOpenAICompatibility()` to pipe to OpenAI
- **Custom prompts**: `prompt()` and `prompt.stream()` for LLM calls

### Copilot LLM API

Agent extensions can call the Copilot LLM directly:

- **Endpoint**: `https://api.githubcopilot.com/chat/completions`
- **Auth**: Bearer token from `X-GitHub-Token` header
- **Format**: OpenAI-compatible chat completions API
- **Streaming**: Supports `stream: true` for SSE streaming

---

## 5. Registration and Deployment

### Creating a GitHub App for Copilot Extensions

1. **Create GitHub App**: `https://github.com/settings/apps/new`
2. **Required fields**:
   - **App name**: Unique identifier
   - **Homepage URL**: Any valid URL
   - **Callback URL**: OAuth callback URL
   - **Webhook URL**: Your server endpoint (for agent-based)
3. **Permissions**:
   - **Account Permissions > Copilot Chat**: Read Only (required)
   - Additional permissions depend on your extension's needs
4. **Copilot tab configuration**:
   - For **agents**: Set app type to "Agent", provide webhook URL
   - For **skillsets**: Set app type to "Skillset", define up to 5 skills
5. **Install the app**: `https://github.com/apps/<app_name>`

### OAuth Authentication

- Extensions receive the user's GitHub token via `X-GitHub-Token` header
- This token is scoped to the permissions granted to your GitHub App
- For additional scopes, implement OAuth web flow

### Deployment Options

| Option | Description | Best For |
|--------|-------------|----------|
| Cloud hosting (Azure, AWS, etc.) | Deploy as a web service | Production |
| Codespaces | GitHub-hosted dev environment | Development |
| ngrok | Tunnel local server to public URL | Local testing |
| Docker containers | Containerized deployment | Any environment |

### Security Requirements

1. **Request verification**: Always verify request signatures using GitHub's public keys
2. **Key endpoint**: `https://api.github.com/meta/public_keys/copilot_api`
3. **Signature header**: `Github-Public-Key-Signature`
4. **Key ID header**: `Github-Public-Key-Identifier`

---

## 6. Cross-platform Usage

### Where Copilot Extensions Work

| Surface | Extensions (GitHub Apps) | `.agent.md` Custom Agents |
|---------|------------------------|---------------------------|
| GitHub.com Copilot Chat | ✓ (`@extension`) | ✓ (reads `.github/agents/`) |
| VS Code | ✓ (`@extension`) | ✓ (agent picker) |
| JetBrains IDEs | ✓ | P (preview) |
| Eclipse | ✓ | P (preview) |
| Xcode | ✓ | P (preview) |
| GitHub CLI | ✓ | ✓ |
| GitHub Mobile | ✓ | Limited |

### Key Difference in Cross-platform Support

- **Copilot Extensions**: Work everywhere Copilot Chat is available because they are server-side
- **Custom agents**: Work everywhere the `.github/agents/` convention is supported (increasingly broad)

### Feature Matrix Evidence (March 2026)

From the official Copilot feature matrix:

- "Extensions" column shows ✓ for all VS Code versions from 2021 to latest 2026
- "Custom agents" shows ✓ from mid-2025 onward
- "MCP" shows ✓ from mid-2025 onward

---

## 7. Building a Copilot Extension — Technical Requirements

### Agent-based Extension Requirements

| Requirement | Details |
|-------------|---------|
| **Language** | Any (Node.js, Go, Python, etc.) |
| **Server** | HTTP server with POST endpoint |
| **Response format** | Server-Sent Events (SSE) |
| **Request verification** | Verify signatures against GitHub public keys |
| **GitHub App** | Registered with Copilot Chat permissions |
| **Hosting** | Any publicly accessible URL |
| **SDK (optional)** | `@copilot-extensions/preview-sdk` (JavaScript) |

### Skillset-based Extension Requirements

| Requirement | Details |
|-------------|---------|
| **Language** | Any |
| **Server** | HTTP endpoints (up to 5) |
| **Response format** | Plain text or JSON (Copilot formats it) |
| **Request verification** | Not required (Copilot platform handles) |
| **GitHub App** | Registered with Copilot Chat permissions |
| **Hosting** | Any publicly accessible URL |

### Minimal Agent Example (Node.js)

```javascript
import express from "express";
import {
    createAckEvent,
    createTextEvent,
    createDoneEvent,
    verifyAndParseRequest,
} from "@copilot-extensions/preview-sdk";

const app = express();

app.post("/", express.raw({ type: "*/*" }), async (req, res) => {
    const signature = req.get("Github-Public-Key-Signature") || "";
    const keyId = req.get("Github-Public-Key-Identifier") || "";

    const { isValidRequest, payload } = await verifyAndParseRequest(
        req.body.toString(),
        signature,
        keyId,
        { token: process.env.GITHUB_TOKEN }
    );

    if (!isValidRequest) {
        res.status(401).send("Unauthorized");
        return;
    }

    res.writeHead(200, { "Content-Type": "text/event-stream" });
    res.write(createAckEvent());
    res.write(createTextEvent("Hello from my extension!"));
    res.end(createDoneEvent());
});

app.listen(3000);
```

### Available Official Example Repositories

| Repository | Language | Type | Description |
|-----------|----------|------|-------------|
| `copilot-extensions/blackbeard-extension` | JavaScript | Agent | "Hello world" pirate agent |
| `copilot-extensions/function-calling-extension` | Go | Agent | Function calling + confirmation dialogs |
| `copilot-extensions/rag-extension` | Go | Agent | Retrieval-augmented generation |
| `copilot-extensions/skillset-example` | Go | Skillset | Random test data generation |
| `copilot-extensions/github-models-extension` | TypeScript | Agent | Chat with GitHub Models |
| `copilot-extensions/preview-sdk.js` | JavaScript | SDK | Official development SDK |
| `copilot-extensions/gh-debug-cli` | Go | Tool | Local debugging CLI |

---

## 8. Alternative: The `.agent.md` Approach — When to Choose

### Current State of the Ecosystem (March 2026)

A critical discovery from this research: **GitHub's documentation has shifted away from Copilot Extensions toward MCP and custom agents.** Key evidence:

1. All builder docs at `/en/copilot/building-copilot-extensions/*` now redirect to MCP docs
2. The customization cheat sheet does NOT mention "Copilot Extensions"
3. The `copilot-extensions/user-feedback` repo is archived
4. The Preview SDK last had a release in October 2024 (no updates in ~18 months)
5. GitHub's focus is on: custom agents (`.agent.md`), MCP servers, and agent skills
6. The "Extensions" line in the feature matrix likely refers to the broader VS Code extension ecosystem, not specifically Copilot Extensions

### When to Use `.agent.md` (Recommended for Most Cases)

| Use Case | Why `.agent.md` Works |
|----------|----------------------|
| **Repository-scoped agents** | Lives in `.github/agents/`, zero infrastructure |
| **Accessibility scanning agent** | Can reference tools, instructions, and skills already in repo |
| **Cross-IDE support** | Works in VS Code, JetBrains, Eclipse, Xcode, GitHub.com |
| **Team/org sharing** | Committed to repo, shared via git |
| **MCP tool integration** | `mcp-servers` property in frontmatter for external services |
| **Fast iteration** | Edit a Markdown file, agent updates immediately |
| **Zero cost** | No hosting, no servers, no maintenance |
| **Sub-agent orchestration** | Full support for handoffs and parallel subagents |

### When Copilot Extensions (GitHub Apps) Are Still Needed

| Use Case | Why Server-side Extension Is Required |
|----------|--------------------------------------|
| **Custom LLM model** | Need a specific model not available through Copilot |
| **Real-time external data** | Must call live APIs (e.g., real-time accessibility scan of a URL) |
| **Persistent state** | Need to maintain session state or databases across conversations |
| **Complex computation** | Heavy server-side processing (e.g., running Playwright + axe-core scans) |
| **Marketplace distribution** | Publishing a tool for all GitHub users via GitHub Marketplace |
| **Custom authentication** | OAuth flows to third-party services |
| **User confirmation flows** | Need structured confirmation dialogs |

### Hybrid Approach: `.agent.md` + MCP Server

The most practical modern architecture combines both:

```text
.github/agents/a11y-detector.agent.md  ← Agent definition (instructions, persona)
      ↓ references
.github/agents/mcp-config.json         ← MCP server configuration
      ↓ connects to
Remote MCP Server                       ← Handles external API calls, scanning
```

```yaml
---
name: a11y-detector
description: 'Detects WCAG accessibility issues in web applications'
tools:
  - read_file
  - search
  - a11y-scanner/*
mcp-servers:
  a11y-scanner:
    url: https://your-mcp-server.azurewebsites.net/sse
    auth:
      type: pat
---
```

This gives the best of both worlds:

- **Zero-infrastructure agent** with rich instructions
- **Server-side scanning capabilities** via MCP
- **Cross-platform support** across all IDEs
- **Git-based distribution** through the repository

---

## Recommendation for AODA WCAG Accessibility Agent Use Case

### Primary Recommendation: `.agent.md` + MCP Servers

For the accessibility-scan-demo-app project, the recommended approach is:

1. **Use `.agent.md` files** for agent definitions (detection agent + remediation agent)
2. **Use MCP servers** for external scanning capabilities (axe-core, IBM Equal Access)
3. **Use `.instructions.md` files** for WCAG 2.2 compliance rules
4. **Use `SKILL.md` files** for scanning workflows and remediation patterns

### Why NOT Build a Full Copilot Extension

1. **Documentation deprecation signals**: GitHub is clearly moving away from the Extensions API toward MCP/agents
2. **Maintenance burden**: Server hosting, uptime monitoring, security patches
3. **Limited advantage**: MCP servers provide the same external API access with less complexity
4. **Portability**: `.agent.md` works across more surfaces than Extensions
5. **Time-to-value**: Agent files can be created in minutes vs days for a server-side extension

### When to Reconsider

Consider building a full Copilot Extension only if:

- You need to distribute to all GitHub users via Marketplace
- You need persistent server-side state (scan result caching, historical trending)
- You need to run headless browsers (Playwright + axe-core) on demand against live URLs
- The MCP server approach proves insufficient for the scanning workload

---

## References and Evidence

### Official GitHub Documentation

- [Copilot customization cheat sheet](https://docs.github.com/en/copilot/reference/customization-cheat-sheet) — March 2026
- [Copilot feature matrix](https://docs.github.com/en/copilot/reference/copilot-feature-matrix) — March 2026
- [MCP documentation](https://docs.github.com/en/copilot/concepts/context/mcp) — March 2026

### Code Repositories

- [copilot-extensions org](https://github.com/copilot-extensions) — Official examples
- [preview-sdk.js](https://github.com/copilot-extensions/preview-sdk.js) — JavaScript SDK (last release Oct 2024)
- [blackbeard-extension](https://github.com/copilot-extensions/blackbeard-extension) — Hello world agent example
- [skillset-example](https://github.com/copilot-extensions/skillset-example) — Skillset example (Go)
- [function-calling-extension](https://github.com/copilot-extensions/function-calling-extension) — Function calling example
- [rag-extension](https://github.com/copilot-extensions/rag-extension) — RAG example

### Related Workspace Research

- [VS Code Custom Agents Research](vscode-custom-agents-research.md) — `.agent.md` deep dive
- [Parent research doc](../../2026-03-08/copilot-a11y-agents-research.md) — AODA WCAG agents task

### SDK Documentation Links (from preview-sdk.js README)

- [Using Copilot Extensions](https://docs.github.com/en/copilot/using-github-copilot/using-extensions-to-integrate-external-tools-with-copilot-chat) — now redirects to MCP docs
- [About building Copilot Extensions](https://docs.github.com/en/copilot/building-copilot-extensions/about-building-copilot-extensions) — now redirects to MCP docs
- [Set up process](https://docs.github.com/en/copilot/building-copilot-extensions/setting-up-copilot-extensions) — now returns 404
- [Communicating with the Copilot platform](https://docs.github.com/en/copilot/building-copilot-extensions/building-a-copilot-agent-for-your-copilot-extension/configuring-your-copilot-agent-to-communicate-with-the-copilot-platform) — now returns 404

---

## Discovered Research Topics

1. **MCP server for accessibility scanning**: How to build an MCP server that wraps axe-core for remote scanning — this would be the optimal integration path
2. **Remote MCP server deployment on Azure**: How to deploy and authenticate a remote MCP server for cross-platform agent use
3. **GitHub Marketplace alternatives**: With Extensions docs deprecated, what is the future of distributing custom Copilot capabilities?
4. **Extensions API sunset timeline**: No official deprecation announcement found — the API still works, but documentation removal is a strong signal

---

## Clarifying Questions

1. **Is there a formal deprecation announcement for Copilot Extensions?** — Research could not find one. The documentation removal and redirect to MCP is the strongest signal.
2. **Does the existing accessibility scanning engine need to run server-side?** — If yes, an MCP server would need to wrap it for remote access. If the scanning can run locally in the IDE terminal, `.agent.md` with terminal tools suffices.
3. **Is Marketplace distribution a requirement?** — If the agents only need to work within the project's repository, `.agent.md` is optimal. If external distribution is needed, an MCP server registered in the GitHub MCP Registry may be the new path forward.
