# Project Cortex

> **The Autonomous Brain for your Codebase.**

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

```bash
npm install -g project-cortex
```

---

## Setup

Run the interactive setup wizard in your project root:

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

A typical `.env` looks like one of these:

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

Cortex will now synthesize your codebase in the background as you code.

**Ingestion modes:**

| Mode | Behavior |
|---|---|
| `auto` (default) | Synthesizes every file save automatically |
| `manual` | Queues changes until you manually flush them |

Set the mode in your `.env`:

```env
INGESTION_MODE=manual
```

**Flushing in manual mode:** `cortex sync` is not a separate CLI command — it is a text trigger you type directly into the terminal where `cortex watch` is already running. When the watcher is in manual mode it prints:

```
Manual mode active. Type "cortex sync" to flush pending changes.
```

Type `cortex sync` and press Enter in that same terminal to batch all queued diffs into a single LLM call.

---

### Route 2: IDE Integration (MCP)

For developers with a Claude Code, Cursor, or Windsurf subscription.

Your IDE already has a powerful AI. Instead of paying for a separate API key, Cortex plugs into your IDE as an MCP server and lets your IDE's AI do the synthesis — at no extra cost.

Register Cortex in your IDE(s):

```bash
# All supported IDEs at once
cortex setup all

# Or pick specific ones
cortex setup claude-code cursor
```

Supported: `claude-code`, `cursor`, `vscode`, `windsurf`, `claude-desktop`

**Restart your IDE** after running setup.

Once connected, trigger synthesis from inside your IDE:

| IDE | How to trigger |
|---|---|
| Claude Code | Type `/ingest_cortex` |
| Cursor / Windsurf | Use `@project-cortex` in Agent mode |
| VS Code Copilot | Agent mode picks it up automatically |

---

## What Cortex Writes

Both routes produce the same output in your project root:

```
.knowledge/
├── index.md             # The catalog — agents read this first
├── log.md               # Append-only architectural timeline (with warnings)
├── entities/            # Per-file/module knowledge pages
├── concepts/            # Abstract architectural patterns
└── .last_sync_commit    # Git SHA marking the last synthesized commit
```

All plain Markdown. Open `.knowledge/` in [Obsidian](https://obsidian.md) for a visual graph of your architecture.

The `.last_sync_commit` file lets Cortex compute precise git diffs between syncs, so each synthesis only processes work the Librarian hasn't already seen.

---

## MCP Tools (IDE Route)

When connected via MCP, your IDE's agent has access to these tools:

| Tool | What it does |
|---|---|
| `get_cortex_status` | Check if Cortex is initialized and when it last synced |
| `get_pending_changes` | Returns the git diff since last sync, the current knowledge index, and the Librarian system + user prompts |
| `save_synthesis` | Accepts the synthesized JSON result, validates it with Zod, and writes it to `.knowledge/` |
| `read_knowledge_index` | Returns the current knowledge index |

The synthesis JSON returned to `save_synthesis` must match this shape:

```ts
{
  summary: string,
  entities: { name, action: "create" | "update" | "delete", description, links: string[] }[],
  concepts: { name, description }[],
  warnings: string[]
}
```

In Claude Code, the included slash commands wire these tools together:

| Command | Effect |
|---|---|
| `/ingest_cortex` | Pulls pending changes, runs the Librarian synthesis, calls `save_synthesis` |
| `/cortex_status` | Reports init status and last-sync commit |
| `/read_knowledge` | Prints the current knowledge index |

---

## CLI Reference

| Command | Description |
|---|---|
| `cortex init` | Interactive setup — choose API keys or IDE route, scaffold `.knowledge/`, write `.env` |
| `cortex watch` | Start the background daemon (API keys route). Also embeds the MCP server so IDE tools can trigger real syncs against the same process. |
| `cortex setup [targets...]` | Register the Cortex MCP server in IDE configs. Targets: `claude-code`, `cursor`, `vscode`, `windsurf`, `claude-desktop`, or `all`. |

**Manual sync (API keys route, `INGESTION_MODE=manual`):** `cortex sync` is not a CLI subcommand — type it directly into the terminal where `cortex watch` is running to flush all queued diffs as a single batched LLM call. This is cheaper than per-save synthesis on large refactors.

> Build before `cortex setup` — the IDE configs point at `dist/mcp/server.js`. Run `npm run build` first.

---

## Vision

Cortex aims to be the "Senior Staff Engineer" that never sleeps — the one who maintains the documentation, understands every dependency, and ensures every AI agent you bring onto the project is instantly up to speed.
