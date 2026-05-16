# Project Cortex

> **The Autonomous Brain for your Codebase.**

> ⚠️ **Install globally** — this is a CLI tool, not a library. The npm registry's default `npm i projectcortex` will install it locally and the `cortex` command won't be on your PATH. Use this instead:
>
> ```bash
> npm install -g projectcortex
> ```

Project Cortex is an active knowledge engine that eliminates "context amnesia" in AI development. While traditional AI agents rediscover your codebase from scratch on every query, Cortex runs in the background — continuously compiling your source code into a persistent, synthesized knowledge base that any AI agent can query instantly.

## The Problem

Most AI coding workflows rely on **RAG**. You ask a question, the AI scans raw files, grabs chunks, and guesses. Tomorrow it does the same work again. Nothing compounds. There is no architectural memory.

## The Solution: Compiled Context

Cortex replaces passive searching with **active synthesis**. It watches your file system and on every save:

1. **Extracts** — identifies new concepts, logic flows, and architectural changes
2. **Integrates** — updates existing knowledge pages and creates new ones
3. **Links** — builds cross-references between related modules
4. **Flags** — surfaces contradictions where new code deviates from established patterns

The output lives in a `.knowledge/` folder in your project root — plain Markdown files your IDE and AI agents can read instantly.

---

## Why Cortex Is Different

Most knowledge tools that sit on top of codebases share the same four weaknesses. Cortex is designed to eliminate all of them.

### 1. Automated, Always-On Ingest
Traditional tools require you to manually trigger an update — "please re-read this file." Cortex's `cortex watch` daemon listens to the filesystem via `chokidar` and synthesizes changes automatically on every save. You never have to remember to update the knowledge base; it just stays current as you code.

### 2. Git-Aware Diffs — Not Full File Reads
Every time most tools re-process a file, they re-read the whole thing. Cortex computes a `git diff` and feeds only the delta to the LLM. That means:
- Token usage scales with *what changed*, not with file size.
- The Librarian sees exactly what you touched, making its synthesis more precise.
- Uncommitted changes on top of committed ones are both captured, so nothing slips through.

This applies to both ingestion modes. In `auto` mode each save sends a per-file diff against `HEAD`. In `manual` mode, queued diffs are batched into a single LLM call when you type `cortex sync` into the running watcher's terminal — useful on large refactors where synthesizing every individual save would be wasteful.

### 3. Zero Extra Cost via IDE Integration
If you already pay for Claude Code, Cursor, Windsurf, or VS Code Copilot, you don't need a separate API key. Register Cortex as an MCP server (`cortex setup`) and your IDE's own AI becomes the Librarian — Cortex supplies the diff, the current knowledge context, and the structured output schema; the IDE does the synthesis. Same `.knowledge/` output, same Zod-validated schema, zero marginal cost.

### 4. Code-Specific Architectural Intelligence
Cortex is not a general document summarizer. Its Librarian prompt is tuned for software architecture: it tracks how modules depend on each other, flags when a new commit contradicts an established pattern (e.g. switching from JWTs to session cookies after documenting JWT usage), and links entities across files using Obsidian-style `[[WikiLinks]]`. The result is a knowledge base that answers *architectural* questions — not just "what does this function do" but "how does auth flow through the system and what changed last Tuesday."

---

## Installation

Cortex is a CLI tool — **install it globally**, not as a project dependency:

```bash
npm install -g projectcortex
```

> ⚠️ The `-g` flag is required. A local install (`npm install projectcortex`) will not put the `cortex` binary on your PATH, and IDE integrations (Antigravity in particular) will fail to launch the MCP server.

Verify the install:

```bash
cortex --version
```

If you see a version number, you're ready. If you see "command not found", the install wasn't global — re-run with `-g`.

**Updating:**

```bash
npm install -g projectcortex@latest
```

---

## Setup

### Quick start — one command

Skip the wizard entirely with one command:

```bash
cortex init --magic
```

Cortex checks global IDE installation indicators to detect every IDE installed on your machine — regardless of whether the IDE has touched this project yet. It then scaffolds `.knowledge/`, adds `.env` and `cortex.log` to `.gitignore`, and registers Cortex as an MCP server in all detected IDEs in one shot. Restart your IDE when it finishes.

Detects: **Claude Code** (`~/.claude/`), **Cursor** (`%APPDATA%\Cursor` / `~/.config/Cursor`), **VS Code** (`~/.vscode/`), **Windsurf** (`~/.codeium/windsurf/`), **Antigravity** (`~/.gemini/antigravity/`), **Claude Desktop** (`%APPDATA%\Claude`), **Zed** (`~/.config/zed/`), **Cline** (VS Code extension), **Continue** (`~/.continue/`).

### Interactive setup

For a guided walkthrough or a fresh machine with no IDE directories yet:

```bash
cortex init
```

It will ask you one question: **how do you want Cortex to synthesize your codebase?**

There are two routes depending on what you already pay for:

---

### Route 1: API Keys

For developers with a cloud AI API key or a local LLM running on their machine.

Cortex runs a background daemon that watches your files and synthesizes changes automatically. You pay per token via your API key — no subscription needed. For local models, nothing ever leaves your machine.

`cortex init` will walk you through provider selection and create a `.env` file for you.

**Supported providers:**

| Provider | Key variable | Default model |
|---|---|---|
| `openai` | `OPENAI_API_KEY` | `gpt-4o` |
| `anthropic` | `ANTHROPIC_API_KEY` | `claude-sonnet-4-6` |
| `google` | `GOOGLE_GENERATIVE_AI_API_KEY` | `gemini-1.5-pro` |
| `local` | `LOCAL_BASE_URL` (no API key needed) | any model your server exposes |

**About the `local` provider**

Ollama, LM Studio, Jan, LocalAI, llama.cpp, vLLM, and similar tools all run a local HTTP server that speaks the same API format OpenAI originally designed. This means Cortex can talk to any of them using one adapter — nothing runs on OpenAI's servers, nothing leaves your machine.

The model you run is entirely up to you: Qwen, Llama, Mistral, Phi, DeepSeek, Gemma — whatever your local server is serving. Set `CORTEX_MODEL` to the model name your server exposes.

> `LOCAL_BASE_URL` points Cortex at your local server. No API key is needed — local servers don't authenticate requests.

A typical `.env` looks like one of these (optional: put shared keys in `~/.cortexrc` using the same `KEY=value` format — project `.env` overrides):

```env
# OpenAI cloud
CORTEX_PROVIDER=openai
OPENAI_API_KEY=sk-...
# CORTEX_MODEL=gpt-4o  ← optional, this is the default

# Anthropic cloud
CORTEX_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
# CORTEX_MODEL=claude-sonnet-4-6

# Google cloud
CORTEX_PROVIDER=google
GOOGLE_GENERATIVE_AI_API_KEY=...
# CORTEX_MODEL=gemini-1.5-pro

# Any local model via Ollama, LM Studio, Jan, vLLM, etc.
# Runs entirely on your machine — no data sent anywhere
CORTEX_PROVIDER=local
LOCAL_BASE_URL=http://localhost:11434/v1
CORTEX_MODEL=qwen2.5          # or llama3, mistral, phi4, deepseek-r1, gemma3, etc.
```

Then start the daemon:

```bash
cortex watch
```

---

### Route 2: IDE Integration (MCP)

For developers with a Claude Code, Cursor, Windsurf, Zed, Cline, or Continue subscription — or any IDE that supports MCP.

Your IDE already has a powerful AI. Instead of paying for a separate API key, Cortex plugs into your IDE as an MCP server and lets your IDE's AI do the synthesis — at no extra cost.

Register Cortex in your IDE(s):

```bash
# All supported IDEs at once
cortex setup all

# Or pick specific ones
cortex setup claude-code cursor
```

Supported targets:

| Target | Config written | Scope |
|---|---|---|
| `claude-code` | `.claude/settings.json` + hook script | per-project |
| `cursor` | `.cursor/mcp.json` | per-project |
| `vscode` | `.vscode/mcp.json` | per-project (Copilot Agent mode) |
| `windsurf` | `~/.codeium/windsurf/mcp_config.json` | global |
| `claude-desktop` | `%APPDATA%\Claude\claude_desktop_config.json` | global |
| `antigravity` | `~/.gemini/antigravity/mcp_config.json` | global (use `--local` for per-project) |
| `zed` | `~/.config/zed/settings.json` (macOS/Linux) or `%APPDATA%\Zed\settings.json` (Windows) | global |
| `cline` | VS Code globalStorage `saoudrizwan.claude-dev/settings/cline_mcp_settings.json` | global |
| `continue` | `.continue/mcpServers/project-cortex.yaml` | per-project |

**Why this is better than hardcoded paths:**
- **Zero Configuration** — Cortex automatically finds your `node` path and script location; no manual path editing.
- **Repo-Aware** — the MCP server uses the IDE's current working directory and `findProjectRoot()` to climb to the nearest `.knowledge/` or `.git/`. Switch projects and Cortex switches with you — no re-running setup.

**Restart your IDE** after running setup.

---

## 🛠️ Command Reference

There are two layers of commands. **CLI commands** manage the daemon and setup — you run them in a terminal. **Knowledge commands** interact with the knowledge base while you code — you run them inside your IDE or from the daemon terminal.

### CLI commands (terminal)

| Command | When you use it |
|---------|----------------|
| `cortex init` | Once, when setting up a new project. Interactive wizard: creates `.knowledge/`, configures your provider. |
| `cortex init --magic` | Same as above but fully automatic: detects IDEs, scaffolds `.knowledge/`, registers all, done. |
| `cortex setup [target]` | Register Cortex as an MCP server in specific IDEs. Targets: `claude-code`, `cursor`, `vscode`, `windsurf`, `claude-desktop`, `antigravity`, `zed`, `cline`, `continue`, or `all`. |
| `cortex watch` | **Route 1 only.** Starts the background daemon. Leave it running — it synthesizes on every file save automatically. |
| `cortex read` | Print the full knowledge index to the terminal — what Cortex knows about your codebase. |
| `cortex read --entity <name>` | Print the full page for a specific entity (e.g. `cortex read --entity AuthMiddleware`). |
| `cortex read --concept <name>` | Print the full page for a specific concept. |
| `cortex config` | Change your LLM provider, model, or ingestion mode without re-running `cortex init`. |
| `cortex status` | Full status report: last sync commit, provider config, daemon lock state, log path. |
| `cortex status --next` | One-line recommendation: tells you exactly what to do next based on current state (e.g. *"18 files changed since last sync — run `/ingest_cortex`"*). |
| `cortex mcp` | Internal — IDEs call this automatically. You don't run it manually. |

### Knowledge commands (inside your IDE — Route 2 / MCP)

#### In Claude Code — slash commands

| Command | What it does |
|---|---|
| `/ingest_cortex` | **Synthesize pending changes.** Computes the git diff since last sync, runs the Librarian, writes the result to `.knowledge/`. On first run with an empty index, switches to **bootstrap mode** — scans source files directly, diff excluded, so the first synthesis describes your app, not the Cortex install. |
| `/read_knowledge` | **See what the AI knows.** Prints the full rich knowledge index — every entity and concept with its description, source file, and links. |
| `/cortex_status` | **Check sync state.** Shows the last-sync commit SHA and whether the knowledge base is initialized. |

#### In Claude Code — MCP prompts

Cortex also exposes these as native MCP prompts (accessible via the IDE's prompt picker):

| Prompt | What it does |
|---|---|
| `ingest` | Same as `/ingest_cortex` — synthesizes pending changes. Auto-switches to bootstrap mode when the index is empty. |
| `read` | Reads the rich index and instructs the AI to use it (not re-scan source). |
| `explore` | Reads the index and then navigates links via `read_entity`/`read_concept` to answer architectural questions in depth. |
| `status` | Checks Cortex initialization and last sync. |

#### Auto-context injection (Claude Code PreToolUse hook)

When you run `cortex setup claude-code` (or `cortex init --magic`), Cortex writes a lightweight hook that fires automatically before any `Read` or `Grep` tool call in Claude Code:

```
.claude/hooks/inject-knowledge.js   ← the hook script
.claude/settings.json               ← registers the PreToolUse matcher
```

**What it does:** The first time the AI touches a source file in a session, the hook runs `cortex read` and injects the full knowledge index into the agent's context before the tool executes. Subsequent tool calls in the same session are silent — the hook uses the parent process PID as a session key so it fires once, not on every read.

**Effect:** The AI already knows your architecture before it opens a single file. It navigates via `[[WikiLinks]]` and `read_entity` instead of re-deriving answers from raw source. No manual `/read_knowledge` call needed.

The hook exits 0 silently if `cortex` is not on PATH, the knowledge base is empty, or anything else goes wrong — it never blocks a tool call.

#### In Antigravity

> **Requires a global install** — `npm install -g projectcortex`. The Antigravity entry calls the `cortex` binary directly so one config works across every project.

Run `cortex setup antigravity` (or `cortex setup all`) once. By default this writes to the **global** Antigravity config (`~/.gemini/antigravity/mcp_config.json` on macOS/Linux, `%USERPROFILE%\.gemini\antigravity\mcp_config.json` on Windows) because Antigravity prioritizes the global config over per-project files. The entry is intentionally project-agnostic — `findProjectRoot()` resolves the active workspace at runtime, so switching projects "just works" without re-running setup.

If you specifically want a per-project entry, pass `--local`:

```bash
cortex setup antigravity --local   # writes .antigravity/mcp_config.json instead
```

**Auto-context injection via `GEMINI.md`:** After every ingest, Cortex writes the knowledge index to `GEMINI.md` in your project root. Antigravity reads this file automatically at session start — the same way Claude Code reads `CLAUDE.md`. This means Antigravity already knows your architecture before you type the first message, with no hook or manual prompt needed. Commit `GEMINI.md` to your repo so teammates benefit too.

Type **`/`** in the chat bar to see these **Local Workflows**:
- **`/ingest`** — Synthesizes pending code changes into the brain.
- **`/read`** — Opens the interlinked architectural knowledge index.
- **`/status`** — Checks the health and sync state of the brain.
- **`/explore`** — Reads the index and navigates links to answer architectural questions in depth.

#### In Cursor / Windsurf

Use `@project-cortex` in Agent mode. The MCP tools (`get_pending_changes`, `read_knowledge_index`, `read_entity`, `read_concept`, `save_synthesis`) are available to the agent directly.

#### In Zed

Run `cortex setup zed` once. Cortex registers under Zed's `context_servers` key in your global settings file. Open the **assistant panel** — `project-cortex` will appear as a context server. Use `@project-cortex` to attach it to a conversation, then ask it to ingest or read the knowledge index.

#### In Cline (VS Code extension)

Run `cortex setup cline` once. Cortex is added to Cline's global MCP config (`cline_mcp_settings.json` in VS Code globalStorage). Open the **Cline sidebar → MCP Servers tab** to verify the connection. In chat, Cline's agent can call the Cortex MCP tools directly — ask it to run an ingest or read the knowledge index.

#### In Continue (VS Code / JetBrains extension)

Run `cortex setup continue` once per project. Cortex writes `.continue/mcpServers/project-cortex.yaml` to the project root — Continue picks it up automatically in agent mode. Use `@project-cortex` in the Continue chat panel to call the MCP tools.

### Route 1 (daemon) — how to trigger each action

| Action | How to do it |
|---|---|
| **Ingest** | Automatic — the daemon synthesizes on every file save. In `manual` mode, type `cortex sync` in the terminal where the daemon is running to flush queued changes. |
| **Read knowledge** | `cortex read` — prints the full index to the terminal. `cortex read --entity <name>` to drill into one entity. |
| **Check status** | `cortex status` — full report. `cortex status --next` — one recommended action. |

---

## 📂 Multi-Project Usage

Project Cortex is designed to be **installed once, used everywhere**. Unlike global MCPs (like Figma) which pull from a central cloud, Cortex is **Repo-Aware** — one install, one config, every project.

### How it works

When you run `cortex setup antigravity` (or any IDE target), the config that's written is **project-agnostic**. For Antigravity specifically, the global config at `~/.gemini/antigravity/mcp_config.json` (Windows: `%USERPROFILE%\.gemini\antigravity\mcp_config.json`) contains only this:

```json
{
  "mcpServers": {
    "project-cortex": {
      "command": "cortex",
      "args": ["mcp"],
      "env": { "DOTENV_CONFIG_QUIET": "1" }
    }
  }
}
```

No project paths. Nothing hardcoded. The magic happens at runtime: every time your IDE opens a workspace, it spawns a fresh `cortex mcp` process with the workspace folder as its working directory. Cortex's `findProjectRoot()` climbs up from CWD looking for `.knowledge/` or `.git/` markers — whatever it finds *is* the active project.

### Working on a brand-new project

1. **Open the project in your IDE.** That's it — the MCP server starts automatically because the global config is already in place from your first install.
2. **Type `/ingest`** (or `/ingest_cortex` in Claude Code) in chat. **Bootstrap mode** kicks in: Cortex detects the empty knowledge base, scans the project's source files, ignores the git diff (which would otherwise just describe the install), and synthesizes the application's architecture. The first `save_synthesis` call creates `.knowledge/` for you — no `cortex init` required.

You do **not** re-run `cortex setup antigravity` for new projects. Setup only writes the global config, which is already there.

### Switching between projects

| Scenario | What happens |
|---|---|
| Close IDE, open a different project | Old `cortex mcp` process dies. New project opens → fresh `cortex mcp` spawned with the new CWD → correct `.knowledge/` loaded. **Works automatically.** |
| Open two projects in side-by-side IDE windows | Each window spawns its own `cortex mcp` process with its own CWD. They never collide. **Works automatically.** |
| Switch workspace inside one window without restarting | Depends on the IDE. Most kill and respawn MCP servers on workspace switch — should work. Worst case: restart the window. |

### TL;DR

- Install `cortex` globally once.
- Run `cortex setup all` once (or `cortex init --magic`). Global targets (Antigravity, Cline, Zed, Windsurf, Claude Desktop) write a portable entry that works across every project automatically.
- For every new project: open it, run `/ingest`. Done.

---

## What Cortex Writes

Both routes produce the same output in your project root:

```
.knowledge/
├── index.md             # Rich catalog — names + descriptions + source paths + links (agents read this first)
├── state.json           # Canonical state (index.md is rendered from this)
├── log.md               # Append-only architectural timeline (with warnings)
├── entities/            # Per-file/module knowledge pages (deep-read via read_entity)
├── concepts/            # Abstract architectural patterns (deep-read via read_concept)
└── .last_sync_commit    # Git SHA marking the last synthesized commit

GEMINI.md                # Auto-generated — Antigravity loads this at session start (see below)
```

All plain Markdown (plus one JSON state file). Open `.knowledge/` in [Obsidian](https://obsidian.md) for a visual graph of your architecture.

The `.last_sync_commit` file lets Cortex compute precise git diffs between syncs, so each synthesis only processes work the Librarian hasn't already seen.

**`GEMINI.md`** is written to the project root after every `save_synthesis` call. It contains the same rich knowledge index that lives in `.knowledge/index.md`. Antigravity (and the Gemini CLI) reads `GEMINI.md` automatically at the start of every session — the same role `CLAUDE.md` plays for Claude Code. This gives Antigravity instant architectural context without any hook mechanism or manual prompt.

**Commit `GEMINI.md` to your repo.** It is safe Markdown, benefits all team members using Antigravity or the Gemini CLI, and is updated automatically after each ingest — there is no maintenance burden.

### The index is self-sufficient

`index.md` includes full descriptions, source file paths, and outbound links for every entity and concept — not just names. This means any AI that reads it can immediately answer architectural questions without re-scanning source code.

---

## MCP Tools (IDE Route)

When connected via MCP, your IDE's agent has access to these tools:

| Tool | What it does |
|---|---|
| `get_cortex_status` | Check if Cortex is initialized and when it last synced |
| `get_pending_changes` | Returns either an **incremental** payload (git diff since last sync + current knowledge index) or a **bootstrap** payload (curated source-file list, no diff) when the knowledge base is empty. The `mode` field tells the consumer which path was taken. |
| `save_synthesis` | Accepts the synthesized JSON result, validates it with Zod, and writes it to `.knowledge/` |
| `read_knowledge_index` | Returns the rich `index.md` — names, descriptions, source paths, and links. **Call this first** before reading any source files. Includes a token savings footer (see below) |
| `read_entity` | Returns the full synthesized page for one entity (e.g. `AuthMiddleware`). Follow `[[WikiLinks]]` from the index with this. Includes a token savings footer |
| `read_concept` | Returns the full synthesized page for one concept (e.g. `Authentication Strategy`). Same as above for concepts. Includes a token savings footer |

**Token savings footer:** Every `read_knowledge_index`, `read_entity`, and `read_concept` response ends with a line like:

```
---
*Cortex saved ~12.4k tokens — synthesized knowledge instead of scanning 47 source files*
```

Cortex measures the actual byte size of your source files (via `fs.stat`, cached per session) and compares it against the response size. The number is the tokens the AI *didn't* spend re-deriving what the knowledge base already knows. Only shown when savings exceed 500 tokens.

The synthesis JSON returned to `save_synthesis` must match this shape:

```ts
{
  summary: string,
  entities: {
    name: string,
    action: "create" | "update" | "delete",
    description: string,
    links: string[],
    sourceFile?: string   // repo-relative path, strongly preferred
  }[],
  concepts: { name: string, description: string }[],
  warnings: string[]
}
```

### How the AI uses the knowledge

After an ingest, the AI's knowledge about your codebase lives in `.knowledge/`. The read hierarchy:

1. **`/read_knowledge`** (or `read_knowledge_index`) — the fast skim. Every entity and concept with its description, source file, and links in one view.
2. **`read_entity <name>`** — drill into one entity's full synthesized page when you need more depth.
3. **`read_concept <name>`** — same for abstract concepts.
4. **Source files** — only opened if the knowledge base is visibly stale or doesn't cover the topic.

The AI is instructed to navigate the knowledge graph (following `[[WikiLinks]]` via `read_entity`/`read_concept`) rather than re-scanning raw source. This is what makes it faster and more architecturally precise than vanilla RAG.

---

## 🧪 How to verify the AI is using the knowledge (not re-scanning files)

### Route 1 — API keys / daemon

1. **Check the knowledge exists and is populated:**
   ```bash
   cortex read
   ```
   You should see entities and concepts with full descriptions. If you see `_No entities yet._`, the daemon hasn't synced yet — check `cortex status` for the last sync commit or run `cortex status --next` for a one-line action.

2. **Check what context the daemon sends to the LLM:**
   When `cortex watch` processes a file change, it calls `getKnowledgeSummary()` which returns the rich index (descriptions + links + source paths), not just names. This is the "prior knowledge" the LLM sees before synthesizing a new diff. You can verify exactly what it would see by running `cortex read` — that's the exact string the daemon passes as context.

3. **Check a specific entity is up to date:**
   ```bash
   cortex read --entity CortexMCPServer
   ```
   If the description matches what you know the code does, the knowledge is current. If it's stale or wrong, run a re-ingest.

### Route 2 — IDE / Claude Code

1. **See what the AI currently knows:**
   ```
   /read_knowledge
   ```
   This calls `read_knowledge_index` directly and shows you the exact index the AI will reference before answering questions.

2. **Watch the tools the AI calls:**
   In Claude Code, tool calls are visible in the conversation. When you ask an architectural question, the AI **should** call `read_knowledge_index` or `read_entity` first. If it jumps straight to `Grep` or `Read` on `src/` files without checking the knowledge first — the knowledge base is likely empty or stale, and you need to `/ingest_cortex`.

3. **The litmus test:**
   Ask Claude Code: *"How does authentication work in this codebase?"*
   - **Using knowledge:** It calls `read_knowledge_index`, finds `[[AuthService]]` and `[[JWTStrategy]]`, calls `read_entity` on them, and answers from those synthesized descriptions.
   - **Re-scanning:** It calls `Grep` for `auth` across `src/`, reads multiple raw files, and re-derives the answer from scratch.

   If you see the second pattern, your knowledge base is stale — run `/ingest_cortex` to bring it up to date.

4. **Force a navigation test:**
   After ingesting, ask: *"What is the CortexMCPServer and what does it link to?"* — the exact answer is in the knowledge index. If the AI answers accurately without reading `src/mcp/server.ts`, it's using the knowledge.

---

## Daemonization (Background Execution)

To keep Cortex running permanently in the background without keeping a terminal open, we recommend using a process manager like **PM2**.

### Running with PM2

```bash
# Install PM2 globally
npm install -g pm2

# Start the Cortex daemon
pm2 start "cortex watch" --name cortex

# Monitor logs
pm2 logs cortex

# Ensure it starts on system reboot
pm2 save
pm2 startup
```

Alternatively, you can run it inside a **tmux** or **screen** session.

While `cortex watch` is running, logs are written to **`cortex.log`** in the project root (JSON lines) as well as pretty-printed to the terminal via STDERR — STDOUT is kept clean for the MCP stdio transport.

---

## Publishing and version bumps (maintainers)

This package uses [semantic versioning](https://semver.org/) (`MAJOR.MINOR.PATCH`). For `0.1.x`, breaking changes are still allowed under common `0.x` practice, but prefer bumping **minor** for behavior changes and **patch** for fixes.

1. **Commit** your work on `main` (or your release branch).
2. **Bump the version** (updates `package.json` and creates a git tag):

   ```bash
   npm version patch   # 0.1.0 → 0.1.1 — bugfixes, safe tweaks
   npm version minor   # 0.1.0 → 0.2.0 — new features, larger changes
   npm version major   # 0.1.0 → 1.0.0 — first stable API / breaking changes you want to signal
   ```

   Add `-m "v%s"` if you want a custom tag message: `npm version patch -m "Release v%s"`.

3. **Push** the commit and tag: `git push && git push --tags`
4. **Publish** to npm (runs `prepublishOnly` → `build` + `test` automatically):

   ```bash
   npm publish
   ```

   Use `npm publish --dry-run` first to inspect the tarball without uploading.

To verify the tarball locally before publishing: `npm pack` then `npm install -g ./projectcortex-<version>.tgz`.

---

## Vision

Cortex aims to be the "Senior Staff Engineer" that never sleeps — the one who maintains the documentation, understands every dependency, and ensures every AI agent you bring onto the project is instantly up to speed.
