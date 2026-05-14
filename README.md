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

For developers with an OpenAI key or a local LLM (Ollama, LM Studio, etc.).

Cortex runs a background daemon that watches your files and synthesizes changes automatically using your LLM. You pay per token via your API key — no subscription needed.

`cortex init` will create a `.env` file for you:

```env
# OpenAI
OPENAI_API_KEY=sk-...

# Or a local LLM via any OpenAI-compatible endpoint
OPENAI_BASE_URL=http://localhost:11434/v1
OPENAI_API_KEY=local
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
| `manual` | Queues changes, synthesizes only when you run `cortex sync` |

Set the mode in your `.env`:

```env
INGESTION_MODE=manual
```

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
├── index.md        # The catalog — agents read this first
├── log.md          # Append-only architectural timeline
├── entities/       # Per-file/module knowledge pages
└── concepts/       # Abstract architectural patterns
```

All plain Markdown. Open `.knowledge/` in [Obsidian](https://obsidian.md) for a visual graph of your architecture.

---

## MCP Tools (IDE Route)

When connected via MCP, your IDE's agent has access to these tools:

| Tool | What it does |
|---|---|
| `get_cortex_status` | Check if Cortex is initialized and when it last synced |
| `get_pending_changes` | Returns git diffs since last sync + current knowledge + Librarian synthesis prompt |
| `save_synthesis` | Accepts the synthesized result and writes it to `.knowledge/` |
| `read_knowledge_index` | Returns the current knowledge index |

`/ingest_cortex` orchestrates all of these automatically — you just run the command and Cortex handles the rest.

---

## CLI Reference

| Command | Description |
|---|---|
| `cortex init` | Interactive setup — choose API keys or IDE route |
| `cortex watch` | Start the background daemon (API keys route) |
| `cortex sync` | Manually flush queued changes (manual ingestion mode only) |
| `cortex setup [targets...]` | Register MCP server in IDE configs |

---

## Vision

Cortex aims to be the "Senior Staff Engineer" that never sleeps — the one who maintains the documentation, understands every dependency, and ensures every AI agent you bring onto the project is instantly up to speed.
