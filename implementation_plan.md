# Project Cortex: Product Blueprint & Implementation Plan

This document serves as the definitive blueprint and systematic, phase-by-phase approach to building Project Cortex. Each phase represents a small, implementable chunk designed to incrementally build the Autonomous Knowledge Engine from the ground up.

> **Status legend:** ✅ Done · 🚧 In progress · ⏳ Planned

| Phase | Title | Status |
|---|---|---|
| 1 | Ingestion & Monitoring Foundation | ✅ Done |
| 2 | LLM Synthesis Engine | ✅ Done |
| 3 | Knowledge Storage & Cost Control | ✅ Done |
| 4 | MCP Server Integration | ✅ Done |
| 4.5 | Dual-Route IDE Integration | ✅ Done (added beyond original plan) |
| 5 | CLI Polish & Daemonization | 🚧 In progress |

---

## 🏗️ Phase 1: Ingestion & Monitoring Foundation (The Eyes) — ✅ Done

**Layman's Terms**
Setting up a background "watchdog" that constantly monitors your project folder. Every time you save a file, it notices exactly what lines of code you changed.

**Technical Terms**
Implement a robust, debounced file-system watcher using `chokidar`. Develop a diffing mechanism to extract precise Git diffs or file delta contents, ensuring we only capture meaningful changes while strictly ignoring noise (like `node_modules` or `.git`).

**Architecture & System Design**
- **Core Components**: `src/core/watcher.ts`, `src/core/diff.ts`
- **Design Pattern**: Event Emitter / Observer Pattern. The watcher will emit standard internal events (`FILE_CHANGED`, `FILE_DELETED`) containing the filepath and the specific text diff.
- **Key Considerations**: Debouncing is critical here (e.g., 3-5 seconds) to prevent overwhelming the system when a user hits `Cmd+S` multiple times rapidly.

**Definition of Ready (DoR)**
- Repository is initialized with TypeScript and basic scaffolding.
- Target directory to watch is defined via CLI or config.

**Definition of Done (DoD)**
- Watcher correctly identifies `add`, `change`, and `unlink` events.
- Debouncing works correctly (rapid saves trigger only one diff extraction).
- Git diffs are successfully extracted and logged to the console.

**Pros & Cons**
- ✅ **Pros**: Extremely lightweight; forms the rock-solid foundation required for all downstream processing.
- ❌ **Cons**: At this stage, the system only sees raw text changes and has zero semantic understanding of what the code actually does.

**Status notes**
- [src/core/watcher.ts](src/core/watcher.ts) wraps `chokidar` with a 3-second debounce, loads the project's `.gitignore` via the `ignore` package, and hard-codes ignores for `.git`, `.knowledge`, `node_modules`, `dist`.
- [src/core/diff.ts](src/core/diff.ts) exposes two surfaces: `getFileDiff()` for the daemon (single file vs. `HEAD`, with an untracked-file fallback) and `getPendingDiff()` for the MCP server (combines committed and uncommitted changes since `.last_sync_commit`).

---

## 🧠 Phase 2: LLM Synthesis Engine (The Brain) — ✅ Done

**Layman's Terms**
Connecting an AI to the watchdog. When the watchdog sees a code change, it hands it to the AI. The AI analyzes the change and summarizes the "why" and "what" in structured, plain English.

**Technical Terms**
Integrate the Vercel AI SDK (`@ai-sdk/core`, `@ai-sdk/openai`). Design strict system prompts for the "Librarian" persona. Utilize `zod` to enforce `generateObject` calls, ensuring the LLM responds purely in structured JSON (e.g., extracting updated concepts, new files, and identifying architectural contradictions).

**Architecture & System Design**
- **Core Components**: `src/llm/client.ts`, `src/llm/prompts.ts`
- **Design Pattern**: Adapter / Strategy Pattern (allowing us to easily swap between OpenAI, Anthropic, or local Ollama models in the future).
- **Key Considerations**: Error handling for LLM timeouts, token limits, or hallucinated JSON formats.

**Definition of Ready (DoR)**
- Phase 1 (Watcher) is complete and reliably emitting diffs.
- API keys (OpenAI/Anthropic) are secured and accessible via environment variables.

**Definition of Done (DoD)**
- The system successfully sends diffs to the LLM using the Vercel AI SDK.
- The LLM responds strictly according to the defined `zod` JSON schema.
- Retries and timeout fallbacks are implemented.

**Pros & Cons**
- ✅ **Pros**: Transforms raw, chaotic code changes into highly valuable, semantic architectural insights.
- ❌ **Cons**: Introduces network latency and API costs. Prompt engineering must be precise to avoid generating "fluff" documentation.

**Status notes**
- [src/llm/client.ts](src/llm/client.ts) calls `generateObject()` against `gpt-4o`.
- The Zod schema lives in its own module ([src/llm/schema.ts](src/llm/schema.ts)) so both the daemon and the MCP `save_synthesis` validator share one source of truth.
- `CORTEX_MOCK_AI=true` short-circuits the LLM call with a deterministic synthesis — used to exercise the pipeline end-to-end without burning tokens.

---

## 💾 Phase 3: Knowledge Storage & Cost Control (The Memory) — ✅ Done

**Layman's Terms**
Taking the AI's brilliant insights and neatly organizing them into a permanent `.knowledge` folder. To save you money, we're adding a "Manual Sync" mode—the AI only thinks when you type `cortex-sync`.

**Technical Terms**
Implement a dual-mode ingestion pipeline (Auto/Manual). In Manual mode, file diffs are buffered in an in-memory queue. Upon receiving the `cortex-sync` command via `stdin`, the system batches these diffs into a single LLM request. The resulting structured JSON is then serialized into Markdown files with Obsidian-style bidirectional links (`[[Concept]]`).

**Architecture & System Design**
- **Core Components**: `src/knowledge/writer.ts`, `src/index.ts` (Sync logic).
- **Design Pattern**: Command Pattern for the sync trigger; Batch Processing for LLM calls.
- **Key Considerations**: 
    - **Cost Efficiency**: Batching multiple file changes into a single prompt significantly reduces token overhead.
    - **File Integrity**: Ensure atomic writes to `index.md` to prevent corruption during heavy ingestion.

**Definition of Ready (DoR)**
- Phase 2 (LLM Client) is integrated and supports synthesis.
- `INGESTION_MODE` is configurable via `.env`.

**Definition of Done (DoD)**
- Markdown files are correctly generated in the `.knowledge` folder.
- `cortex-sync` successfully triggers a batch synthesis of all queued changes.
- The MCP server successfully serves the content of these real files (replacing mock strings).

**Pros & Cons**
- ✅ **Pros**: Gives the user total control over API billing. Persists knowledge in a human-readable, searchable wiki.
- ❌ **Cons**: Manual mode requires the user to remember to sync their changes.

**Status notes**
- [src/knowledge/writer.ts](src/knowledge/writer.ts) owns all `.knowledge/` I/O: per-entity files, per-concept files, `log.md` append, and a fresh `index.md` regenerated from disk on every sync.
- `.knowledge/.last_sync_commit` records the synced HEAD so `getPendingDiff()` can compute a precise delta on the next run.
- Manual mode is wired in [src/cli/watch.ts](src/cli/watch.ts): diffs accumulate in an in-memory `Map`. Typing `cortex sync` into the **same terminal** where `cortex watch` is running (stdin listener, not a CLI subcommand) batches them into a single LLM call.

---

## 🔌 Phase 4: MCP Server Integration (The Mouth) — ✅ Done

**Layman's Terms**
Exposing our automated Wikipedia so that other AI tools (like Cursor or Claude Code) can plug in and read it instantly, giving them full context of your project without you having to explain it.

**Technical Terms**
Implement the Model Context Protocol (MCP) using `@modelcontextprotocol/sdk`. Stand up a local STDIO or HTTP server that exposes specific tools (`read_architecture`, `get_concept`, `list_warnings`) to external AI clients.

**Architecture & System Design**
- **Core Components**: `src/mcp/server.ts`, `src/mcp/tools.ts`
- **Design Pattern**: RPC (Remote Procedure Call) Server pattern.
- **Key Considerations**: Mapping the Markdown folder structure into clean, easily digestible text streams for external agents to consume efficiently.

**Definition of Ready (DoR)**
- Phase 3 is complete, and the `.knowledge` folder contains structured, predictable Markdown.

**Definition of Done (DoD)**
- An external client (e.g., Claude Desktop or MCP Inspector) can successfully connect to the Cortex MCP server.
- The `read_architecture` and `get_concept` tools successfully return the correct content from `.knowledge`.
- Server handles disconnects and query errors gracefully.

**Pros & Cons**
- ✅ **Pros**: Solves the core "lost context" problem for AI coding assistants. Massively boosts the capabilities of any connected agent.
- ❌ **Cons**: Requires the user to manually configure their external IDE/Agent to point to the Cortex MCP server.

**Status notes**
- Implemented in [src/mcp/server.ts](src/mcp/server.ts) over STDIO. The tool surface evolved beyond the original sketch into a *workflow*:
  * `get_cortex_status` — init state + last-sync commit.
  * `get_pending_changes` — returns the diff since `.last_sync_commit`, the current index, and a ready-to-execute Librarian prompt pack. This is what powers the IDE route.
  * `save_synthesis` — Zod-validates incoming synthesis JSON and writes it to `.knowledge/`.
  * `read_knowledge_index` — reads `index.md`.
- The server is constructed two ways: standalone (launched by an IDE config) and embedded inside `cortex watch`, so an IDE-triggered sync can talk to the running daemon.

---

## 🔁 Phase 4.5: Dual-Route IDE Integration — ✅ Done

**Layman's Terms**
Adding a "no API key" option: if you already pay for Claude Code / Cursor / Windsurf / VS Code Copilot, Cortex piggybacks on that subscription. Your IDE's AI does the synthesis. Cortex just hands it the diff and validates the result.

**Technical Terms**
A second ingestion route where the IDE's own model is the Librarian. The MCP server is registered into each IDE's config and exposes the Librarian prompts via `get_pending_changes`; the IDE runs the synthesis and POSTs the result back via `save_synthesis`. Same Zod schema, same writer, same `.knowledge/` layout — only the executor changes.

**Architecture & System Design**
- **Core Components**: [src/cli/setup.ts](src/cli/setup.ts), [src/cli/init.ts](src/cli/init.ts), [.claude/commands/](.claude/commands/).
- **Design Pattern**: Strategy — the daemon and the IDE are two interchangeable executors of the Librarian role against one shared schema.
- **Supported IDEs**: `claude-code`, `cursor`, `vscode`, `windsurf`, `claude-desktop`.
- **Slash commands** shipped for Claude Code: `/ingest_cortex`, `/cortex_status`, `/read_knowledge`.

**Definition of Done (DoD)**
- `cortex init` walks the user through choosing a route and scaffolds the appropriate config (`.env` or IDE registration).
- `cortex setup [targets...]` writes the Cortex MCP entry into each chosen IDE's config file, with `all` as a convenience alias.
- Build artifact path (`dist/mcp/server.js`) is verified before writing IDE configs, with a clear error if the user hasn't run `npm run build`.

**Pros & Cons**
- ✅ **Pros**: Zero marginal token cost for users on existing IDE plans. Same output schema as the daemon, so consumers don't care which route produced the knowledge.
- ❌ **Cons**: Synthesis quality is now coupled to whichever model the IDE happens to use. Requires the user to remember to run `npm run build` before `cortex setup`.

---

## ⚙️ Phase 5: CLI Polish & Daemonization (The Operations) — ✅ Done

**Layman's Terms**
Wrapping everything up into a sleek command-line tool so you can simply type `cortex start` and let it run quietly in the background. Also giving users a way to change their provider, model, or ingestion mode at any time without re-running `cortex init` from scratch.

**Technical Terms**
Finalize the `commander` implementation. Add commands for `status` (showing current config) and `config` (interactive or flag-driven settings editor). Implement a lockfile mechanism and graceful shutdown handlers. Transition to structured logging.

**Architecture & System Design**
- **Core Components**: `src/cli/index.ts`, `src/cli/status.ts`, `src/cli/config.ts`, `src/core/logger.ts`.
- **Design Pattern**: Command Pattern.
- **Key Considerations**: Ensuring graceful shutdown handlers (`SIGINT`, `SIGTERM`) so the watcher cleans up and any pending LLM writes finish before the process exits.

**Definition of Ready (DoR)**
- All prior phases (1-4.5) are fully functional and integrated.

**Definition of Done (DoD)**
- `cortex status` prints current config (provider, model, mode, last sync).
- `cortex config` lets users change provider, model, and ingestion mode from the terminal.
- Process gracefully exits on `SIGINT` without corrupting files.
- Lockfile (`.knowledge/cortex.lock`) prevents multiple instances.
- Structured logger (`pino`) implemented.
- NPM package is structured properly for global execution.

**Status notes**
- ✅ `cortex init`, `cortex watch`, `cortex setup` implemented.
- ✅ `cortex status` — Reports config, knowledge health, and daemon lock state.
- ✅ `cortex config` — Supports interactive prompts and direct flags.
- ✅ Structured logging — `pino` integrated for daemon observability.
- ✅ Lockfile and Graceful Shutdown — Ensures process exclusivity and clean exits.

---

## 🛡️ Product Viability & Production Readiness

To elevate Project Cortex from a prototype to a **Viable Product**, the following cross-cutting concerns are established as global requirements:

1.  **Testing Strategy**
    *   **Unit Tests**: Core utilities (diff extraction, JSON parsing, Markdown writing) must be isolated and tested.
    *   **Integration Tests**: Test the Watcher -> LLM -> Writer pipeline using mocked LLM responses.
    *   **End-to-End (E2E)**: Simulate file saves in a mock repository and verify the resulting `.knowledge` outputs.

2.  **Telemetry, Logging, and Observability**
    *   Transition from `console.log` to a structured logger (e.g., `pino` or `winston`) in Phase 5.
    *   Implement clear log levels: `DEBUG` (diff contents), `INFO` (file changes), `WARN` (LLM retries), `ERROR` (write failures).
    *   Write logs to a local file (`cortex.log`) so the daemon's health can be monitored when running in the background.

3.  **Security & Secrets Management**
    *   API Keys must never be logged.
    *   Support loading keys from a global `~/.cortexrc` or project-local `.env`.
    *   `cortex init` MUST automatically add `.env` to the project's `.gitignore`.

4.  **Error Recovery & Resiliency**
    *   **LLM Outages**: If the AI API is down, the watcher should queue diffs and retry later, rather than dropping knowledge.
    *   **File Locking**: Implement a lockfile mechanism (`.knowledge/cortex.lock`) to prevent multiple `cortex` instances from running in the same directory simultaneously and corrupting the index.
