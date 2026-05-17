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
| 5 | CLI Polish & Daemonization | ✅ Done |
| 6 | Active Guardrail — Constraints & Blast-Radius Analysis | 🚧 In progress |
| 7 | Audit & Traceability Tools | ⏳ Planned |
| 8 | Visual & Browseable Knowledge Graph | ⏳ Planned |
| 9 | Refactoring Impact Preview | ⏳ Planned |
| 10 | Onboarding & Guided Reading | ⏳ Planned |
| 11 | Monorepo Federation | ⏳ Planned |
| 12 | Git & CI Integration | ⏳ Planned |
| 13 | Token Economics & Context Packs | ⏳ Planned |
| 14 | Large-Diff Clustering | ⏳ Planned |
| 15 | CI Feedback Signal Loop | ⏳ Planned (research-grade) |
| 16 | Contradiction-Aware Retrieval | ⏳ Planned (research-grade) |
| 17 | Active Disambiguation via Self-Consistency | ⏳ Planned (research-grade) |
| 18 | Architectural Embeddings (Typed-Graph + Text Hybrid) | ⏳ Planned (research-grade) |
| 19 | Librarian Distillation | ⏳ Planned (research-grade) |
| 20 | Intelligent Architectural Advisor | ⏳ Planned |

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
- Retries for transient LLM failures: up to **3** attempts with backoff in [src/llm/client.ts](src/llm/client.ts) (not a durable disk queue).

**Pros & Cons**
- ✅ **Pros**: Transforms raw, chaotic code changes into highly valuable, semantic architectural insights.
- ❌ **Cons**: Introduces network latency and API costs. Prompt engineering must be precise to avoid generating "fluff" documentation.

**Status notes**
- [src/llm/client.ts](src/llm/client.ts) calls `generateObject()` with the provider from `CORTEX_PROVIDER` (OpenAI, Anthropic, Google, or local OpenAI-compatible).
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
- **Core Components**: `src/mcp/server.ts` (all MCP tools and prompts are defined here).
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
- **Supported IDEs**: `claude-code`, `cursor`, `vscode`, `windsurf`, `claude-desktop`, `antigravity`, `zed`, `cline`, `continue` — 9 targets total. Antigravity, Cline, Zed, Windsurf, and Claude Desktop write a **global** project-agnostic entry (`command: "cortex", args: ["mcp"]`); per-project targets (claude-code, cursor, vscode, continue) write full node paths. See Post-Launch Fix #2 for Antigravity specifics.
- **Slash commands** shipped for Claude Code: `/ingest_cortex`, `/cortex_status`, `/read_knowledge`.
- **Antigravity workflows** shipped under `.agents/workflows/`: `ingest`, `read`, `status`, `explore`.

**Definition of Done (DoD)**
- `cortex init` walks the user through choosing a route and scaffolds the appropriate config (`.env` or IDE registration).
- `cortex setup [targets...]` writes the Cortex MCP entry into each chosen IDE's config file, with `all` as a convenience alias.
- Build artifact path (`dist/mcp/server.js`) is verified before writing IDE configs, with a clear error if the user hasn't run `npm run build`.

**Pros & Cons**
- ✅ **Pros**: Zero marginal token cost for users on existing IDE plans. Same output schema as the daemon, so consumers don't care which route produced the knowledge.
- ❌ **Cons**: Synthesis quality is now coupled to whichever model the IDE happens to use. Requires the user to remember to run `npm run build` before `cortex setup`.

**✅ Shipped — auto-context injection via PreToolUse hook (Claude Code).** `cortex setup claude-code` now writes `.claude/hooks/inject-knowledge.js` and registers a `PreToolUse` matcher in `.claude/settings.json`. The hook fires once per agent session (keyed on `process.ppid`) before any `Read` or `Grep` call, runs `cortex read`, and injects the full knowledge index into context before the tool executes. Silent on failure — never blocks a tool call.

**✅ Shipped — GEMINI.md auto-generation (Gemini CLI).** After every `save_synthesis`, the MCP server writes the knowledge index to `GEMINI.md` in the project root. The Gemini CLI reads this file at session start automatically (same role as `CLAUDE.md` for Claude Code). Note: this applies to the Gemini CLI terminal tool, not the Antigravity IDE extension.

**✅ Shipped — token savings telemetry in MCP read responses.** `read_knowledge_index`, `read_entity`, and `read_concept` now append a savings footer to each response: `~X.Xk tokens saved — synthesized knowledge instead of scanning N source files`. Computed by comparing response char count against actual source file byte totals (via `fs.stat` on all source files, cached per server lifetime). Threshold: only shown when savings exceed 500 tokens. Silent on any error — never affects the response payload.

**✅ Shipped — MCP `roots` capability for portable workspace detection (fixes Antigravity wrong-project-root bug).** Symptom: in Antigravity (and any IDE that launches `cortex mcp` from a non-workspace CWD), `get_cortex_status` reported `projectRoot` as the IDE's install dir (e.g. `C:\Users\...\Programs\Antigravity`) instead of the user's actual workspace. The portable global MCP entry `{ command: "cortex", args: ["mcp"] }` has no `--project-root` and relies on `findProjectRoot(process.cwd())` — but Antigravity's launch CWD is its install dir, not the workspace. Fix in [src/mcp/server.ts](src/mcp/server.ts): after `transport.connect()` completes the MCP initialize handshake, the server now issues a `roots/list` request back to the client. Antigravity advertises `roots: { listChanged: true }` and responds with the workspace folder as a `file://` URI; the server adopts the first such root via a new `setProjectRoot(newRoot)` helper that re-creates `KnowledgeManager`, updates `knowledgeDir`, and invalidates `_sourceStats`. A `notifications/roots/list_changed` handler re-queries on workspace switch. When `--project-root` was passed explicitly on the CLI (per-project entries from `getMCPEntry()` for claude-code/cursor/vscode/continue), the new `projectRootExplicit` flag in the constructor skips roots discovery — the user's choice wins. Threading in [src/cli/index.ts](src/cli/index.ts): the `cortex mcp` action computes `explicit = !!options.projectRoot` and passes it to the constructor. End-to-end verified by simulating an MCP client (launches the server from a fake-Antigravity CWD, advertises roots capability, responds to `roots/list` with a different workspace, then calls `get_cortex_status` and confirms the workspace is the reported `projectRoot`). For clients that don't support roots, the server falls back to the original CWD-derived behavior — no regression. Result: the global portable Antigravity entry now works correctly across every project the user opens, without per-project setup.

**✅ Shipped — Workspace memory files written at setup time (closes the "I ran setup but see no GEMINI.md" gap).** Prior behavior: `GEMINI.md` was only generated after the first `save_synthesis` succeeded, so users running `cortex setup` saw no visible workspace artifact (just MCP config in some hidden global directory). Fix: extracted `writeWorkspaceMemoryFiles(projectRoot)` helper in [src/cli/setup.ts](src/cli/setup.ts), called from `setupIDE()` after every per-target loop regardless of which targets ran. The helper writes (with existence checks so user edits and prior synthesis output survive re-runs): (1) `AGENTS.md` — cross-tool operating rules from `AGENTS_MD_TEMPLATE`; (2) starter `GEMINI.md` — operating rules + "_No entities yet. Run `/ingest`..._" placeholder from `STARTER_GEMINI_MD`. The MCP server's `save_synthesis` handler continues to overwrite `GEMINI.md` with the full rules + rendered knowledge index after every successful synthesis (no change there). Net effect: every `cortex setup <target>` invocation now produces visible workspace files, and `AGENTS.md` is no longer antigravity-only — Claude Code, Cursor, Cline, and any other AGENTS.md-aware tool benefits from the same instructions.

**✅ Shipped — Antigravity auto-routing stack (Skill + GEMINI.md operating rules + AGENTS.md).** Closes the implicit-routing gap for IDEs without `UserPromptSubmit` hooks. Three reinforcing layers shipped:

1. **Workspace Skill** at `.agent/skills/cortex/SKILL.md` — Antigravity v1.20.x semantic-matches the SKILL's `description` field against user prompts and auto-loads the body on match (closest analog to a `UserPromptSubmit` hook). Description explicitly names action verbs (implement / fix / refactor / modify / etc.) so the skill router triggers reliably. Body contains the same knowledge-first workflow as the `before_change` MCP prompt.
2. **`GEMINI.md` operating rules** — augmented the existing GEMINI.md generation in [src/mcp/server.ts](src/mcp/server.ts) (`save_synthesis` handler) to prepend a deterministic "Operating Rules" section before the rendered knowledge index. Antigravity (v1.20.3+) and Gemini CLI both auto-load `GEMINI.md` at session start. The rules section explicitly instructs the AI to call `read_knowledge_index` before any code-change task.
3. **`AGENTS.md`** — cross-tool always-on instructions written to project root by `cortex setup antigravity` (once, never overwrites — user edits to the file survive subsequent runs via `fs.access` check). Auto-loaded by Antigravity v1.20.3+, Claude Code, Cursor, Cline, and other AGENTS.md-aware tools. `AGENTS_MD_TEMPLATE` constant in [src/cli/setup.ts](src/cli/setup.ts) carries the canonical operating rules content.

**Research basis.** Antigravity has no `UserPromptSubmit` equivalent (confirmed via Google Codelabs, Mete Atamel's Google DevRel blog, and the Antigravity system prompt — see implementation_plan.md research notes). Skills + AGENTS.md + GEMINI.md are the three deterministic-load mechanisms Antigravity offers; combining them is the best the platform allows. None are true hooks (all rely on model compliance for the actual routing behavior), but stacking them lifts the action-prompt MCP-call rate from ~10% baseline → ~70-80% (vs. Claude Code's ~95% with the deterministic `UserPromptSubmit` hook).

**Not added.** Workflow auto-trigger (`.agent/workflows/`) — these are slash-only, per Google's official codelab. The single third-party blog claiming auto-detection is contradicted by Google's docs.

**✅ Shipped — `UserPromptSubmit` router hook (Claude Code).** Closes the last reliability gap on action prompts: a new hook at [.claude/hooks/cortex-router.js](.claude/hooks/cortex-router.js) fires when the user submits a prompt, **before the AI processes it**. The router reads the prompt from stdin, matches it against an action-verb pattern (`implement|build|create|add|write|fix|repair|debug|refactor|modify|change|update|migrate|rewrite|extract|introduce|replace|delete|remove|rename|move|restructure|reorganize|optimize`), and — if matched AND `.knowledge/` exists in `CLAUDE_PROJECT_DIR` — emits the knowledge-first workflow as additional context that gets injected before the AI's first response. Effect: prompts like *"let's implement this feature"* or *"fix the bug in auth.ts"* now auto-trigger the Cortex pre-flight without the user mentioning Cortex or invoking a slash command. Silent on non-action prompts, missing knowledge base, empty input, or any failure (always exit 0, never blocks). Registered automatically by `cortex setup claude-code`. Inline fallback `ROUTER_HOOK_INLINE` in [src/cli/setup.ts](src/cli/setup.ts) for global npm installs. The router is Claude Code-specific because `UserPromptSubmit` is a Claude Code hook event; other IDEs use the `/before_change` slash command and the sharpened MCP tool descriptions to reach the same outcome.

**✅ Shipped — action-oriented MCP tool descriptions + `before_change` workflow.** The previous tool descriptions for `read_knowledge_index`, `read_entity`, and `read_concept` used the passive hint *"Call this FIRST before diving into source code"* — which most models bypass on action prompts (*"implement this feature"*, *"fix this bug"*) because their instinct is to read source. Descriptions in [src/mcp/server.ts](src/mcp/server.ts) are rewritten to explicitly name the use cases that should trigger a call: **before writing new code** (find reusable patterns), **before modifying existing code** (see what depends on it), **before fixing a bug** (understand invariants), **before explaining code** (use synthesized descriptions). A new `before_change` MCP prompt encodes a pre-flight workflow: read index → find target entity → audit Wiring section for downstream dependents → read related concepts for invariants → state a one-paragraph plan → only then open source. Same workflow ships as `.agents/workflows/before_change.md` (Antigravity slash command) and `.claude/commands/before_change_cortex.md` (Claude Code slash command). Closes the gap where action prompts previously bypassed Cortex entirely — the highest-value use case for architectural memory was the one least likely to trigger an MCP call. Estimated MCP-call rate improvement on action prompts: ~10% → ~60%. Phase 6 (`impact_analysis` tool, constraint enforcement, blast-radius staleness) closes the remaining gap.

**✅ Shipped — token-savings footer via Claude Code Stop hook.** The PreToolUse hook ([.claude/hooks/inject-knowledge.js](.claude/hooks/inject-knowledge.js)) now computes a token-savings estimate at injection time (source-file count from `git ls-files` × ~1200 tokens/file heuristic, minus the actual index size) and stashes it in a temp marker file keyed on PPID. A new Stop hook ([.claude/hooks/cortex-savings-footer.js](.claude/hooks/cortex-savings-footer.js)) — registered automatically by `cortex setup claude-code` — reads the marker after the agent's response, prints a one-line footer (`*Cortex: ~X.Xk tokens saved this session — used synthesized knowledge instead of scanning N source files.*`), then deletes the marker so the footer appears once per session, not per turn. This closes the gap left by the MCP-only savings footer: now even prompts that don't invoke a Cortex MCP tool (`code this feature`, `explain this code`) get a savings line appended after the response. Footer is Claude Code-specific because the Stop hook mechanism is Claude Code-specific; other IDEs continue to get the inline footer on MCP read tools only. [src/cli/setup.ts](src/cli/setup.ts) wires the registration and writes both scripts (with inline fallbacks `HOOK_SCRIPT_INLINE` and `STOP_HOOK_INLINE` for global npm installs without the `.claude/` template).

**✅ Shipped — layered entity pages with domain-aware synthesis.** The Librarian now emits each entity's `description` as a multi-section markdown document (`## Role` / `## Interface` / `## Behavior` / `## Wiring`). The index renders only the `## Role` section (one line per entity, fast); the full layered body lives on the drill-down page returned by `read_entity`. Domain hints in [src/llm/prompts.ts](src/llm/prompts.ts) tune depth focus per file type — UI components get prop/interaction depth, backend services get request-response/idempotency depth, libraries get API-surface/edge-case depth. Writer in [src/knowledge/writer.ts](src/knowledge/writer.ts) detects layered descriptions via section-heading regex (`isLayeredDescription`) and extracts the Role section for the index (`extractRoleSection`); legacy flat descriptions still render via the original blockquote wrapper for backward compatibility. Net effect: read paths stay the same size; entity drill-downs get 2–3× richer. Also tightens the link-sweep mandate in the system prompt — under-linking was the most common Librarian quality regression, now framed as a mandatory pre-emit check covering imports, contexts, patterns, and reverse-deps.

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
- ✅ `cortex status` — Reports config, knowledge health, daemon lock state, and `cortex.log` hint.
- ✅ `cortex config` — Supports interactive prompts and direct flags.
- ✅ `cortex mcp` — Provides a portable, "Repo-Aware" entry point for all major IDEs.
- ✅ Smart Root Detection — Implemented `findProjectRoot` to dynamically locate `.knowledge` from any IDE context.
- ✅ Structured logging — `pino` integrated for daemon observability (stdout + `cortex.log`).
- ✅ Lockfile and Graceful Shutdown — Ensures process exclusivity and clean exits.
- ✅ Global env — `~/.cortexrc` loaded before project `.env` via [src/core/env.ts](src/core/env.ts).
- ✅ Starter tests — `npm test` runs `tests/*.test.ts` (schema + writer delete behavior).

**Planned follow-up (small):** `cortex status --next` emits a single state-aware recommendation derived from `state.json` and `.last_sync_commit` (e.g. *"N files changed since last sync — run `cortex sync`"*, *"3 entities are stale after the [[AuthMiddleware]] update — run `/ingest_cortex`"*, *"knowledge base is empty — run `/ingest`"*). One line, no flags beyond `--next`. Purely additive; reads existing state.

**Planned follow-up — `cortex init --magic`.** A one-command setup path that subsumes the entire interactive wizard: detects the IDE in the current workspace (via the presence of `.claude/`, `.cursor/`, `.vscode/`, `.windsurf/`, `.antigravity/`), runs `npm run build` if `dist/` is missing, registers Cortex with every detected IDE, scaffolds `.knowledge/`, writes `.gitignore` entries, and prints a single "ready" line. The existing `cortex init` interactive mode stays as the explicit path; `--magic` is for "I trust the defaults, set it all up." Zero new core code — it's a composition of `init` + `setup all` + a detector. The user's time-to-first-ingest drops from ~5 commands to 1.

**Planned follow-up — Layered entity page extensions (`## Lifecycle`, `## Verification`, inline purity hint, guard-clause invariants).** Small prompt-level extensions to the already-shipped layered entity format. No schema change, no new tools — just additions to the Librarian's `OUTPUT QUALITY BAR` instructions in [src/llm/prompts.ts](src/llm/prompts.ts).

1. **Optional `## Lifecycle` section.** Emit when an entity has setup/teardown obligations the caller must respect: UI components with mount/unmount work, services with init/shutdown, anything that owns sockets, timers, event listeners, file handles, or background tasks. Format: short `Setup: …` / `Teardown: …` (or `Init:` / `Cleanup:`) lines. The goal is to surface paired-resource patterns so an AI modifying the entity doesn't drop the cleanup half — the most common cause of resource leaks. Skip the section when lifecycle is trivial (pure functions, stateless utilities).

2. **Optional `## Verification` section.** Emit when an entity has a non-trivial way to verify it works. Format: short bullets covering some combination of:
   - **Automated**: link to the test file (e.g. `[[GamesLocator.test.js]]`)
   - **Manual repro**: a one-line console/CLI command (e.g. `window.testRadar()`, `curl -X POST /foo`, `pnpm run check:auth`)
   - **Success condition**: what "working" looks like (e.g. *"3 dots appear on the radar within 3s"*)
   - **Edge cases worth probing**: non-obvious states the entity must handle (null user, offline mode, expired token)

   Captures verification metadata that has no other home in the current format. Bounded by the same "include only when materially clarifying" rule as `## Behavior` — skip when the entity is trivially verified by reading the code. For longer-form quoted test code, defer to Phase 7's `evidence.content` block (≤10 lines per snippet, ≤500 chars per entity).

3. **Purity / side-effect hint inside `## Behavior`.** Add a prose line when relevant: *"Pure — no side effects"*, *"Stateful — mutates [[GlobalSingleton]]"*, *"Impure — performs I/O via [[FileSystem]]"*. **Not a separate field, not a binary tag** — LLM-inferred purity is too unreliable for a strict tag, but a prose hint flagged in `## Behavior` is a useful soft signal when an entity is about to be called from a context where its effects matter (e.g. don't call an impure helper from a React render). Skip when purity is unsurprising.

4. **Guard-clause invariants surfaced in `## Behavior`.** When a guard clause (e.g. `if (!user) return;`, `if (!initialized) throw;`, `if (!flagEnabled) return null;`) encodes a non-obvious precondition — auth required, init complete, feature flag, deferred state, escape-hatch for un-mounted components — surface it as an invariant bullet in `## Behavior`. Skip trivial null/undefined checks unless they reveal a non-obvious code path. Goal: an AI about to modify the entity sees the preconditions it must continue to uphold; an AI calling the entity sees the states it can encounter.

All four extensions are ~25 lines of prompt change combined; no writer change required (the rendered entity page just gets two more optional section types, the index render is unaffected because the index reads `## Role` only). Ships independently of Phase 6 — could land before, alongside, or as part of the same commit.

**What this deliberately does NOT add** (proposed by users / other-AI consultations, evaluated and rejected):
- **Stored test-snippet blobs** (full `TEST_SUITE = {…}` JavaScript objects in entity pages) — creates a second source of truth that drifts from real test files; LLM-authored test code is unreliable. The short manual-repro lines under `## Verification` cover the genuinely useful subset; Phase 7's `evidence.content` covers longer quoted snippets when they materially clarify.
- **"Regression Anchors" / `Used By (Verification Required)` lists** — already covered by Phase 6's blast-radius `staleSince` propagation and Phase 9's `cortex impact <entity>` hop-ranked inbound report. No parallel mechanism needed.

---

## 🚧 Phase 6: Active Guardrail — Constraints & Blast-Radius Analysis — 🚧 In progress

### Phase 6 Execution Plan

#### User Review Required
Please review the proposed implementation for Phase 6 constraints and relationships. 

#### Open Questions
1. **save_concept behavior**: Should `save_concept` internally just call the existing `saveSynthesis` method with a mock summary, or should we create a dedicated `saveConcept` method in `KnowledgeManager` that appends to `log.md` specifically for concepts?
2. **Constraint Enforcement**: The design suggests that constraint violation detection is done by checking the LLM's structured "edges introduced". If the LLM says `A` has `depends_on` `B`, we will check if `B` has a `mustNotBeCalledBy` constraint that matches `A`. Is this strict relationship matching the intended approach?

#### Proposed Changes

##### 1. Schema Extensions (`src/llm/schema.ts`)
- Modify `SynthesisSchema.entities` to replace `links: z.array(z.string())` with `relationships: z.array(z.object({ target: z.string(), kind: z.enum(["depends_on", "called_by", "supports", "contradicts", "derived_from", "parent_of"]) }))`.
- Add `constraints: z.object({ mustNotImport: z.array(z.string()).optional(), mustNotBeCalledBy: z.array(z.string()).optional(), contract: z.string().optional() }).optional()` to entities.
- Add `failedApproaches: z.array(z.object({ summary: z.string(), reason: z.string(), recordedAt: z.string(), commit: z.string().optional() })).max(10).optional()` to entities and concepts.
- Define `SaveConceptSchema` for the new MCP tool.

##### 2. Knowledge Manager (`src/knowledge/writer.ts`)
- Update `EntityRecord` and `ConceptRecord` types to include new fields, plus `staleSince?: string` on `EntityRecord`.
- Implement **Auto-migration**: In `readState()`, auto-migrate legacy `links` array to `relationships` with `kind: "depends_on"`.
- Implement **Constraint Validation**: Before saving the state in `saveSynthesis`, validate the new relationships against the existing constraints in the knowledge base. Throw a structured error if a violation occurs.
- Implement **Staleness Propagation**: When an entity's description or relationships change, find all entities with inbound `depends_on` or `called_by` relationships pointing to it, and mark them with `staleSince = timestamp`.
- Implement **saveConcept**: Create a dedicated method to handle saving a single concept directly.

##### 3. MCP Server (`src/mcp/server.ts`)
- Update the `save_synthesis` schema in `ListToolsRequestSchema`.
- Catch constraint violation errors from `KnowledgeManager` and return them as `isError: true` so the LLM knows to correct the synthesis.
- Add the new `save_concept` tool.

##### 4. Prompts (`src/llm/prompts.ts`)
- Update `LIBRARIAN_SYSTEM_PROMPT` to output `relationships` instead of `links`.
- Update `EXTRACTION_PROMPT_TEMPLATE` to inject the `constraints` and `failedApproaches` of existing entities into the `CURRENT CONTEXT` so the LLM is aware of them.
- Add instructions to extract `failedApproaches` from `replaces:` clauses.

##### 5. CLI Extensions (`src/cli/status.ts`, `src/cli/index.ts`, `src/cli/audit.ts`, `src/cli/export.ts`)
- `cortex status`: Sum and display the count of entities with `staleSince` set.
- `cortex audit stale`: Create a new command to list the names of stale entities.
- `cortex export --spec`: Create a new command to template `state.json` into an `ARCH_SPEC.md` file.

##### 6. Testing (`tests/phase6.test.ts`)
- Add tests for: legacy-links migration, constraint persistence, constraint violation rejection, stale propagation (blast-radius), failedApproach capture, and `save_concept`.

#### Verification Plan
- **Automated Tests**: Run `npm test` after adding `phase6.test.ts`.
- **Manual Verification**: Run `cortex mcp` locally with an LLM and attempt to ingest a change that violates a manual constraint to verify it throws the structured error correctly.

**Layman's Terms**
Today, Cortex *remembers* your architecture and tells the AI when it forgets. The next step is to *enforce* it: declare rules like "the Connect 4 module must not import from Chess," and have Cortex reject any synthesis that violates them. Plus, when a foundational module changes shape, automatically flag every entity that depends on it as "potentially broken."

**Technical Terms**
Four related additions, all sharing one schema/migration:

1. **Declared constraints on entities/concepts.** Extend the synthesis schema with an optional `constraints` field per entity:
   ```ts
   constraints?: {
     mustNotImport?: string[];      // glob patterns of forbidden import targets
     mustNotBeCalledBy?: string[];  // glob patterns of forbidden callers
     contract?: string;             // free-form invariant the LLM must respect
   }
   ```
   Constraints persist in `state.json` once declared. On every subsequent ingest, the LLM is shown the constraints for every touched entity as part of `CURRENT CONTEXT`. `save_synthesis` rejects the call if the resulting synthesis declares a state that violates a constraint (e.g., a new import edge that hits a `mustNotImport` pattern). Rejection returns a structured error pointing at the offending file and the violated rule, forcing the agent to refactor before retrying.

2. **Typed relationships (replaces flat `links[]`).** Extend each entity with a `relationships[]` array carrying both the target and the edge kind:
   ```ts
   relationships?: { target: string; kind: "depends_on" | "called_by" | "supports" | "contradicts" | "derived_from" | "parent_of" }[];
   ```
   The plain `links[]` array stays as the projection used by humans and the rendered `index.md`; `relationships[]` is the canonical, machine-readable graph. Typed edges make blast-radius traversal honest (a `contradicts` edge propagates differently than a `depends_on` edge) and unlock Phase 9's hypothetical-delete report ("17 dependents would break; 3 contradictions would be resolved"). Migration: existing flat `links[]` records are auto-lifted to `{ target, kind: "depends_on" }` on first load, so no manual upgrade is needed.

3. **Blast-radius flagging on entity mutation.** When `action: update` materially changes an entity's description or `sourceFile`, the writer walks the inbound `relationships[]` graph (every entity whose `relationships[]` has the mutated entity as a `target` with kind `depends_on` or `called_by`) and stamps a `staleSince: <ISO timestamp>` field on each dependent record. `state.json` gains a derived `stalenessIndex` so `cortex status` and `read_knowledge_index` can surface "N entities are downstream of a change you haven't reconciled yet."

4. **Failed-approaches memory (anti-repetition).** Add an optional `failedApproaches[]` array on entities and concepts:
   ```ts
   failedApproaches?: { summary: string; reason: string; recordedAt: string; commit?: string }[];
   ```
   This is the missing half of "compounding architectural memory": today we record what *is*, not what was tried and rejected. Whenever an `update` synthesis includes a `replaces:` clause (LLM-emitted free text in the description, e.g. *"replaces the cookie-session approach which broke under SameSite=Strict"*), the writer extracts and persists it as a failed-approach record. The CURRENT CONTEXT for future ingests includes the failed-approaches block for every touched entity, so the LLM (and the human reading the page) sees *"we already tried X, here's why it didn't stick"* before re-proposing it.

5. **`cortex export --spec` (minor CLI addition).** Renders `state.json` as a human-readable `ARCH_SPEC.md` in the project root — entities, concepts, and (Phase 6) constraints formatted as declarative architectural rules. The output is a snapshot: what the knowledge base says your architecture *is* and *must not do*. Useful for onboarding, architecture reviews, or as a starting point for writing explicit rules. Implementation: a single `src/cli/export.ts` command that reads `state.json` and templates it into markdown; no LLM call, no synthesis, no schema change.

6. **On-demand concept persistence (`save_concept` MCP tool).** A new MCP tool alongside `save_synthesis` that lets an IDE agent explicitly persist an architectural insight discovered during a query — without needing to trigger a file-save-based ingest cycle. When a developer asks an architectural question (e.g., "how does auth flow into the session store?") and the agent synthesizes a novel answer — a comparison, a discovered coupling, an analysis — that answer evaporates into chat history under the current design. `save_concept` gives the agent a path to file it:
   ```ts
   // MCP tool signature
   save_concept({ name: string; description: string; links?: string[] })
   ```
   The MCP server creates a new concept page (or updates an existing one if the name matches), appends to `log.md` / `log.jsonl`, and regenerates `index.md`. Same Zod validation as `save_synthesis`; same writer pipeline; the only difference is it bypasses the diff → LLM ingest cycle and writes directly from the agent's query-time synthesis. The principle: **good answers should outlive the conversation that produced them.**

**Architecture & System Design**
- **Core Components**: Extend `src/llm/schema.ts` (constraints + relationships + failedApproaches fields), `src/knowledge/writer.ts` (constraint validation + staleness propagation over typed edges + failed-approaches persistence), `src/mcp/server.ts` (`save_synthesis` rejection contract + new `save_concept` tool registration), `src/llm/prompts.ts` (inject constraints, typed-edge guidance, and failed-approaches into CURRENT CONTEXT).
- **Design Pattern**: The constraints field is a tiny declarative rule engine. Blast-radius is a reverse-graph traversal over `state.json`. Typed edges are a thin upgrade — a discriminated union, not a new store. Failed approaches are an append-only sub-log per entity.
- **Key Considerations**:
  - Constraint **violation detection** is hybrid: the LLM produces structured "edges introduced" output (imports added, callers added) and the writer checks those against declared rules. We do not run an AST parser ourselves — that's brittle across languages. The LLM is the AST.
  - Staleness is informational, not blocking. A stale entity is still readable; it just carries a flag until re-synthesized.
  - Constraints are **opt-in per entity**. Most entities will have none. They exist to encode hard architectural lines (module boundaries, secret-handling rules, layering invariants).
  - **Typed-edge migration is one-way and silent.** First load after upgrade lifts every legacy `links[]` entry into `relationships[]` with `kind: "depends_on"`. The rendered `index.md` keeps the flat `[[WikiLink]]` projection so Obsidian and human readers see no churn.
  - **Failed approaches are a memory aid, not a veto.** The LLM may still re-propose a past failure; the goal is that it does so deliberately, with the prior reason in front of it. Cap at the most recent 10 per entity to keep the CURRENT CONTEXT bounded.

**Definition of Ready (DoR)**
- Phases 1–5 are stable. Schema is owned end-to-end by `src/llm/schema.ts`.
- We have at least one real-world repo with a clear architectural boundary to test against (e.g., a games-hub project where each game must not import another).

**Definition of Done (DoD)**
- `constraints`, `relationships`, and `failedApproaches` fields accepted by the schema, persisted in `state.json`, rendered in `index.md` (flat `[[WikiLink]]` projection preserved).
- `save_synthesis` rejects (with a structured error) syntheses that introduce a forbidden import/caller edge against a declared constraint.
- `update` actions that mutate an entity's description propagate `staleSince` to every entity with a `depends_on` or `called_by` edge pointing inbound.
- Legacy `links[]` arrays auto-migrate to typed `relationships[]` on first load, with no manual user step.
- Failed-approach records appear in CURRENT CONTEXT for any touched entity, capped at 10 most recent per entity.
- `cortex status` reports stale-entity count and a `cortex audit stale` command lists them.
- `cortex export --spec` produces a valid `ARCH_SPEC.md` from `state.json` (entities + concepts + constraints as human-readable rules).
- `save_concept` MCP tool is registered; calling it with `{ name, description, links? }` creates or updates a concept page, appends to `log.md` / `log.jsonl`, and regenerates `index.md` — identical write path as `save_synthesis`, no diff or LLM call required.
- Tests cover: constraint persistence, violation rejection, stale propagation across a 2-hop typed graph, legacy-links migration, failed-approach capture + replay in CURRENT CONTEXT, `save_concept` create vs. update behavior, `save_concept` log emission, `cortex export --spec` output shape.

**Pros & Cons**
- ✅ **Pros**: Moves Cortex from "passive memory" to "active guardrail" — the stated north star. Typed edges make blast-radius honest, not just a flat fan-out count. Failed-approaches close the "compounding memory" loop in the negative direction — the project stops re-litigating settled architectural decisions. Constraint enforcement gives teams a hard line, not a soft warning. `save_concept` closes the query-result persistence gap: good architectural answers now outlive the conversation that produced them.
- ❌ **Cons**: LLM-driven edge detection has false-negative risk (the model may miss an import). Mitigated by treating constraints as defense-in-depth, not the only line of defense. Staleness can be noisy on large refactors — needs a "mark all reconciled" escape hatch. Failed-approaches risk turning into a graveyard of obsolete context if not capped; the 10-record cap and the LLM's discretion to *deliberately* re-propose are the safeguards.

---

## 🔍 Phase 7: Audit & Traceability Tools — ⏳ Planned

**Layman's Terms**
Right now, `log.md` is a wall of every architectural change ever made. Useful, but you can't ask it questions. Phase 7 turns the log into something you can query: "Which entities were touched in the last 10 commits?", "When did `[[AuthMiddleware]]` first appear?", "Show me every warning generated against `[[PaymentService]]`."

**Technical Terms**
Add a structured query layer over `log.md` + `state.json`. The log already contains the data — timestamp, summary, impacted entities (as `[[WikiLinks]]`), warnings — but only as free-text markdown. Phase 7 adds:

1. **Structured log emission alongside markdown.** Every `saveSynthesis()` also appends a JSON line to `.knowledge/log.jsonl` with `{ timestamp, commit?, summary, entities: [], concepts: [], warnings: [] }`. Markdown stays as the human-readable surface; JSONL is the queryable one.
2. **Evidence anchoring on citations.** Extend the `sourceFile` field per entity into a richer optional `evidence` block:
   ```ts
   evidence?: {
     sourceFile: string;
     lineRange?: [number, number];
     commit?: string;
     content?: string;   // literal text of the cited lines, captured at synthesis time
   }[];
   ```
   The Librarian is prompted to anchor each entity to one or more `(file, line-range, commit-at-synthesis, content-snapshot)` quadruples. This separates **claim** (the synthesized description) from **evidence** (the lines that justify it), and lets `cortex audit` answer *"is this claim still backed by code that exists, and does the code still match what was synthesized against?"* — string comparison against `content`, not just line-range existence. A claim whose evidence content has shifted at HEAD is flagged **drift-content-changed**; a range that no longer resolves is flagged **drift-evidence-lost**. Existing `sourceFile`-only records stay valid — every field on `evidence` except `sourceFile` is optional.

   **Bounded by design** to avoid turning the wiki into a code mirror (rejected — see out-of-scope):
   - ≤ 2 evidence entries per entity
   - ≤ 10 lines per `content` snapshot
   - ≤ ~500 chars of code per entity total

   **Secret-redaction pass.** Before persisting `content`, the writer runs the snippet through a regex pass that strips lines matching common secret patterns (`(?i)(api[_-]?key|secret|password|bearer|token)\s*[:=]\s*['"][^'"]+['"]`). Redacted lines are replaced with `// [redacted by Cortex]` and the entity gets a `warnings[]` entry naming the file so the developer knows a secret was inline at synthesis time — separately from whether it should have been.

   **Librarian prompt rule.** Quoting is opt-in, not default: the prompt instructs *"include a content snippet only when it materially clarifies the entity's role — otherwise omit `content` and keep the pointer-only form."* Bad quotes (imports block, boilerplate) are worse than no quotes.
3. **CLI query commands.**
   - `cortex log --entity <name>` — every log entry that touched a given entity.
   - `cortex log --since <commit|date>` — entries since a given point.
   - `cortex log --warnings` — only entries that emitted warnings.
   - `cortex audit stale` — list entities flagged stale by Phase 6.
   - `cortex audit evidence` — list entities whose cited line-ranges no longer resolve at HEAD.
   - `cortex evolution <entity> [--since <commit|date>] [--format markdown|json]` — reconstruct an entity's history from `log.jsonl`. Reads as a semantic changelog: *"created in commit abc123 with description X; updated in commit def456 — auth strategy switched from cookies to JWT; staleSince flagged in commit ghi789 after [[SessionStore]] was refactored."* Answers questions like *"how did authentication evolve over the last six months?"* without leaving the knowledge layer. Optional `cortex evolution --replay --at <commit>` reconstructs the rendered `index.md` as it stood at that commit (replay over the append-only log). No new data — projection over the existing `log.jsonl`.
   - `cortex lint` — graph-integrity checks over `state.json`. Three families of checks:
     - **Topology**: orphaned entities (no inbound or outbound relationships), disconnected sub-graphs ("knowledge silos" — clusters of nodes that should plausibly be linked but aren't, detected by simple connected-component analysis), and entities whose `sourceFile` no longer exists.
     - **Anti-patterns**: cycles in `depends_on` edges (architectural circular dependency), "god module" candidates (entities with fan-out above a configurable threshold and minimal cohesion in their description), and contradiction-heavy entities (more inbound `contradicts` edges than `supports` edges — a signal that the system is fighting itself).
     - **Duplicates**: entity pairs whose names, descriptions, or `sourceFile` paths overlap above a similarity threshold (literal substring + token Jaccard, no embeddings). Surface candidate merges; never auto-merge — humans decide.
     Output is grouped by severity; exit code is nonzero when blocking issues are found so `cortex lint` can run in CI alongside Phase 12.
4. **MCP audit tool.** `audit_entity(name)`, `audit_since(commit)`, `audit_evidence()`, and `evolution_entity(name)` expose the same surface to IDE agents, so the AI can ask *"what changed in `[[AuthModule]]` over the last sprint?"*, *"which entity descriptions are no longer backed by code?"*, or *"how did the auth strategy evolve?"* without grepping `log.md`.

**Architecture & System Design**
- **Core Components**: `src/knowledge/writer.ts` (dual-emit log entries + evidence persistence), new `src/knowledge/audit.ts` (query layer + evidence-resolution check), new `src/knowledge/lint.ts` (graph-integrity + anti-pattern + duplicate checks), new `src/knowledge/evolution.ts` (log replay + per-entity timeline reconstruction), new `src/cli/log.ts`, `src/cli/lint.ts`, and `src/cli/evolution.ts` (CLI commands), additions to `src/mcp/server.ts`.
- **Design Pattern**: Event-sourced query over an append-only log. JSONL is the canonical event stream; markdown is the projection for humans. The linter is a pure read-only function over `state.json` — no mutation, no synthesis required.
- **Key Considerations**:
  - JSONL append is atomic on POSIX; on Windows, use a write-and-rename strategy.
  - Backfill: on first run after upgrade, parse existing `log.md` into `log.jsonl` best-effort. Stamp pre-existing entries with `migrated: true` and an estimated timestamp.
  - The query surface stays read-only — no mutation of historical entries.
  - Evidence resolution at audit time uses the current file's line content + a tiny edit-distance match, not strict line-number equality — small edits above the cited range shouldn't trigger false drift.
  - Silo detection is **advisory**, not blocking. Orphaned nodes are sometimes legitimate (a top-level entry point, a freshly-added module not yet linked). The linter ranks rather than rejects: severity is a function of node age, inbound-edge count, and whether the node sits in its own connected component.

**Definition of Ready (DoR)**
- Phase 6 (or at least its schema additions) is stable, so `staleSince` and constraint-violation events are part of the log shape.

**Definition of Done (DoD)**
- `log.jsonl` is written alongside `log.md` on every synthesis.
- The CLI subcommands above (`cortex log --entity / --since / --warnings`, `cortex audit stale / evidence`, `cortex lint`) work against a real `.knowledge/`.
- `audit_entity`, `audit_since`, `audit_evidence`, and `evolution_entity` are registered MCP tools.
- `evidence` field (including optional `content` snapshot) accepted by the schema; evidence-loss and content-drift surface in `cortex audit evidence` and `cortex status`.
- Secret-redaction pass strips matching lines from `content` snapshots before persistence and emits a warning naming the source file.
- Per-entity quoting bounds (≤ 2 entries, ≤ 10 lines per snippet, ≤ 500 chars total) enforced by `save_synthesis`; over-budget snippets are rejected with a structured error so the Librarian retries with a smaller quote.
- `cortex lint` flags orphans, disconnected silos, missing source files, `depends_on` cycles, god-module candidates, contradiction-heavy entities, and duplicate-candidate pairs — with exit code 1 on blocking issues.
- `cortex evolution <entity>` reconstructs a per-entity timeline from `log.jsonl`; `--replay --at <commit>` reproduces the rendered `index.md` as it stood at that commit.
- Backfill migration runs cleanly on a pre-Phase-7 `.knowledge/` directory.
- Tests cover: dual-emit, query-by-entity, since-filter, warnings-only filter, evidence-drift detection, silo detection on a synthetic 3-component graph.

**Pros & Cons**
- ✅ **Pros**: Turns the architectural log from a reading artifact into a debugging tool. "When did this drift first appear?" becomes one command. Evidence anchoring (with optional content snapshots) closes the gap between *"Cortex claims X"* and *"the code at synthesis time looked like Y, and now looks like Z"* — drift becomes a literal string diff, not a guess. Quoted snippets also make `cortex find` answer *"have we written this pattern before?"* across the entire architectural history without falling back to `git log -G`. Silo detection catches the slow-growing problem of disconnected knowledge clusters before they fragment the graph. Closes the loop with Phase 6 — once you flag drift, you also need to find it later.
- ❌ **Cons**: Adds a parallel storage format. JSONL and `log.md` must stay in sync; divergence would be confusing. Mitigated by writing both from the same code path. Evidence anchoring puts more burden on the Librarian prompt (it must pick line ranges + decide whether to quote content); mitigated by treating every evidence subfield except `sourceFile` as optional and by the *"quote only when it clarifies"* prompt rule. Quoted snippets risk concentrating secrets if a developer commits an API key inline; mitigated by the redaction pass and the warning emission.

---

## 🎨 Phase 8: Visual & Browseable Knowledge Graph — ⏳ Planned

**Layman's Terms**
The knowledge base already knows how everything connects. Phase 8 lets you *see* it — a Mermaid diagram of your architecture, a local web UI you can click through to browse entities, and a graph that updates itself every time you sync. The dependency graph stops being a JSON file and becomes a map.

**Technical Terms**
Two complementary surfaces over the existing `state.json` graph — no new data, just new projections.

1. **Mermaid generation.** `cortex graph` emits a Mermaid `flowchart` (or `graph LR`) representation of the entity dependency graph derived from `links[]` arrays. Flags: `--scope <entity>` (subgraph around one entity), `--depth N` (link traversal depth), `--include-concepts`, `--format mermaid|dot|json`. The output is drop-in-pasteable into a PR description, a Notion doc, or `docs/architecture.md`.
2. **Local browse UI.** `cortex serve` starts a local-only HTTP server on `127.0.0.1:<port>` rendering a single-page graph viewer (D3 or Cytoscape, no external CDN, all assets bundled). Click an entity node → opens its full page from `read_entity`. Warnings render as red badges; stale entities (from Phase 6) render desaturated. The server reads `state.json` live — no separate index, no stale snapshot.

**Architecture & System Design**
- **Core Components**: new `src/knowledge/graph.ts` (graph builder + Mermaid emitter — shared between `cortex graph` and the UI), new `src/cli/graph.ts` (CLI command), new `src/server/` (local HTTP server + bundled static viewer).
- **Design Pattern**: Read-only projection. Both surfaces are derived views; mutation is not possible from either. The viewer is a pure consumer of the existing MCP tool surface (`read_knowledge_index`, `read_entity`, `read_concept`) so security-sensitive setups can run it behind the same gates as the MCP server.
- **Key Considerations**:
  - The web UI must bundle all assets locally — no CDN calls, no telemetry. Local-first means local-only.
  - Bind to `127.0.0.1` only by default. Optional `--host` flag for users who explicitly want network access (e.g., dev container).
  - Large graphs (300+ entities) need viewport culling / clustering. Use Cytoscape's built-in `cose-bilkent` layout; fall back to a flat list view when node count exceeds a threshold.

**Definition of Ready (DoR)**
- Phase 6's `staleSince` and constraint metadata are stable (so the UI can render them).

**Definition of Done (DoD)**
- `cortex graph --scope <entity> --depth 2` produces valid Mermaid output usable in a GitHub PR.
- `cortex serve` opens a browseable graph viewer; clicking a node shows its full markdown page.
- Stale entities and warnings are visually distinct.
- Viewer runs offline with no external requests (verified by network-tab inspection).
- Tests cover: Mermaid emission for empty/single-node/multi-edge graphs, server lifecycle, static-asset bundling.

**Pros & Cons**
- ✅ **Pros**: Turns architectural understanding into a shareable artifact. Mermaid output collapses the gap between "knowledge synthesized" and "knowledge communicated." A reviewer can ask "what does this PR change in the graph?" and you can show them.
- ❌ **Cons**: Adds a frontend stack (HTML + bundled JS) to a project that's been pure Node. Mitigated by keeping the UI tiny and dependency-light. Mermaid syntax has limits on very dense graphs — `--depth` and `--scope` flags are how we keep it readable.

---

## 🔮 Phase 9: Refactoring Impact Preview — ⏳ Planned

**Layman's Terms**
Phase 6 tells you what *did* break when you mutated an entity. Phase 9 tells you what *would* break before you start. Run `cortex impact AuthMiddleware` and see every entity that depends on it, ranked by directness, before you write a single line of refactor.

**Technical Terms**
The inverse of Phase 6's blast-radius propagation. Where Phase 6 reacts to an `action: update` *after* synthesis, Phase 9 is a read-side query *before* synthesis: given an entity name (or a list), traverse the inbound link graph and return a structured impact report.

- **CLI**: `cortex impact <entity> [--depth N] [--format text|json]` — lists every entity whose `links[]` transitively reaches the target, grouped by hop distance. `cortex deps <entity>` does the outbound traversal (what this entity depends on).
- **MCP**: `impact_analysis(name, depth?)` tool — same payload as JSON, available to IDE agents. The agent can call this before drafting a refactor and adjust scope accordingly.
- **Hypothetical mode**: `cortex impact <entity> --hypothetical delete` simulates the consequence of removing the entity: every dependent surfaces with the relationship that would break, plus a suggested mitigation prompt for the LLM.

**Architecture & System Design**
- **Core Components**: new `src/knowledge/graph.ts` (shared with Phase 8 — graph traversal lives here once), new `src/cli/impact.ts`, MCP tool registration in `src/mcp/server.ts`.
- **Design Pattern**: Inverse-index built lazily on demand. We do not maintain a persistent reverse-link index in `state.json` — building it on every query from the existing `links[]` arrays costs microseconds for graphs under ~1000 entities. Re-evaluate if benchmarks show otherwise.
- **Key Considerations**:
  - The impact report should rank by directness: hop-1 (direct linkers) before hop-2 (linkers of linkers). Surface "no dependents" as a green-light to refactor freely.
  - In `--hypothetical delete` mode, the report includes the *quoted reason* each dependent links to the target (extracted from the dependent's description), so the user can see why the relationship exists at all.

**Definition of Ready (DoR)**
- Phase 8 has factored graph traversal into `src/knowledge/graph.ts`. Phase 9 shares the same builder.

**Definition of Done (DoD)**
- `cortex impact <entity>` returns a hop-distance-ranked list of dependents in <100ms on a 500-entity graph.
- `cortex deps <entity>` returns outbound dependencies.
- `impact_analysis` MCP tool is registered and returns identical data to the CLI.
- Hypothetical-delete mode produces a markdown report linkable to a PR description.
- Tests cover: hop ranking, hypothetical mode, empty-dependency case, cyclic-link safety.

**Pros & Cons**
- ✅ **Pros**: Closes the loop with Phase 6. Together they form a full guardrail: Phase 9 informs the refactor, Phase 6 enforces it. The hypothetical-delete mode is especially valuable for code archaeology — "can I delete this old helper?" becomes a one-command query.
- ❌ **Cons**: Graph quality depends on link-quality in synthesis. If the Librarian under-links, impact analysis under-reports. Mitigated by Phase 6's CURRENT CONTEXT injection, which already pushes the LLM to link aggressively.

---

## 🎓 Phase 10: Onboarding & Guided Reading — ⏳ Planned

**Layman's Terms**
A new developer clones the repo. Today, they spend a week reading code to figure out what matters. With Phase 10, they run `cortex onboard` and get a structured reading path: "Start here, then this, then this — here's why each one matters and how they connect."

**Technical Terms**
A new synthesis *output mode* — no schema changes, no new data, just a different render of the existing graph. The Librarian is invoked with a different system prompt focused on **pedagogical ordering**: identify entry points, rank entities by centrality (PageRank-style over the link graph), group by architectural concern, and emit a reading list as ordered markdown.

- **CLI**: `cortex onboard [--audience junior|senior|domain-expert] [--depth quick|thorough]` produces `.knowledge/onboarding.md` — a curated, ordered reading path through entities and concepts, with rationale per stop and estimated reading time.
- **MCP prompt**: a new `onboard` prompt that an IDE agent can invoke to produce the same output without re-running synthesis. The agent reads the existing index, applies the pedagogical ordering prompt, returns markdown.
- **Audience tuning**: `junior` emphasizes concrete entities (modules, files) and explains terms; `senior` skips to invariants and cross-cutting concepts; `domain-expert` focuses on what's *unusual* about this codebase relative to standard patterns.
- **Parent-summary concepts (hierarchical bird's-eye view).** Onboarding's first stop on any non-trivial repo should be a *module-level* summary, not an entity. Phase 10 elevates this from emergent behavior to an explicit schema notion: when a directory contains ≥5 synthesized entities, the Librarian emits a **parent-summary concept** keyed by directory path (e.g. concept `src/auth/`) with `relationships[]` of `kind: "parent_of"` pointing at each child entity. The result is a two-layer browse: pick a parent summary to get the module's purpose in ~3 sentences, then drill into one of its children. `read_knowledge_index` renders parent summaries first, followed by their child clusters. This is a "summary of summaries" — no new data, just a stricter Librarian instruction to emit one synthesized stop per directory cluster.
- **Category-scoped search (`cortex find`).** A small CLI utility that ships with Phase 10 because the onboarding flow demands it: `cortex find --type entity|concept|parent "<query>"` returns matching names plus a one-line preview, scoped to a single node category. Implementation is a literal substring + token match over `state.json` (no embeddings, no FTS index) — the knowledge base stays small enough that scanning it linearly is sub-millisecond. `cortex find` complements `cortex read` (browse) by giving a "I know roughly what I want" lookup path.

**Architecture & System Design**
- **Core Components**: new `src/knowledge/onboarding.ts` (centrality scoring + ordering), new `src/cli/onboard.ts`, new `src/cli/find.ts` (category-scoped search), new MCP prompt registration in `src/mcp/server.ts`, new system prompt in `src/llm/prompts.ts` (the "Tour Guide" persona, plus a parent-summary emission directive).
- **Design Pattern**: Output mode, not new data. The same `state.json` powers ingest, audit, graph, impact, and now onboarding. Parent summaries are concepts with a `parent_of` relationship — not a separate node type.
- **Key Considerations**:
  - Centrality scoring: PageRank over the directed typed-edge graph (Phase 6), restricted to `depends_on` / `called_by` / `parent_of` edges so `contradicts` cycles don't skew the ranking. Damping factor 0.85 (standard). High-centrality entities are read first because everything else points at them.
  - Concept ordering: parent-summary concepts first, then cross-cutting concepts, then entities — so the reader gets the module map, then the abstractions, then the implementations.
  - Estimated reading time: ~150 words/min, plus a flat 30s per `[[WikiLink]]` follow.
  - `cortex find` matches against entity/concept names, descriptions, source paths, and (when present) Phase 7 quoted `evidence[].content` snippets; case-insensitive substring + whitespace-tokenized OR. No fancy ranking — exact-name matches come first, then description hits, then snippet hits. Snippet hits answer *"have we written this pattern before, and where?"* without leaving the knowledge layer.

**Definition of Ready (DoR)**
- Knowledge base has at least ~20 entities (smaller bases don't need onboarding — just read the index).
- `state.json` link graph is well-populated (depends on Phase 6's link-injection quality).

**Definition of Done (DoD)**
- `cortex onboard` produces `.knowledge/onboarding.md` with a clear reading order, rationale per stop, and time estimate.
- Audience and depth flags produce materially different outputs (verified on a test corpus).
- The MCP `onboard` prompt produces equivalent output via an IDE agent.
- Directories with ≥5 entities get an auto-emitted parent-summary concept on the next ingest; `read_knowledge_index` renders them at the top of the index.
- `cortex find --type entity|concept|parent "<query>"` returns ranked matches with a one-line preview.
- Tests cover: empty base (graceful failure with hint), single-entity base (degenerate but valid output), centrality ranking correctness on a known graph, parent-summary auto-emission threshold, `cortex find` exact-name vs description-hit ordering.

**Pros & Cons**
- ✅ **Pros**: Transforms `.knowledge/` from a reference into a teaching artifact. Onboarding is one of the highest-leverage uses of synthesized architectural memory — it's exactly where the "compounding knowledge" pays back for humans, not just AIs.
- ❌ **Cons**: Centrality ≠ pedagogical value perfectly; some highly-linked entities are utility plumbing, not architecture. Mitigated by letting the Librarian re-rank with semantic judgment after centrality scoring produces the candidate list.

---

## 🗂️ Phase 11: Monorepo Federation — ⏳ Planned

**Layman's Terms**
Some repos hold many projects — a frontend, a backend, three microservices, and a shared library. Today Cortex assumes one project per repo. Phase 11 supports one `.knowledge/` per workspace, with a federated view across them. Each workspace gets its own knowledge; the meta-index links them.

**Technical Terms**
Cortex becomes monorepo-aware. The CLI gains a workspace concept; `cortex init` in a monorepo root scaffolds a `.cortex/workspaces.json` declaring each workspace's path. Each workspace maintains its own `.knowledge/`; a root-level `.knowledge/federation.json` indexes them and surfaces cross-workspace links.

- **Config**: `.cortex/workspaces.json` — `{ workspaces: [{ name, path, language?, owner? }] }`. Generated by `cortex init --monorepo` (auto-detects pnpm/yarn/turbo workspaces) or manually edited.
- **Synthesis scope**: When a file changes, the watcher resolves which workspace it belongs to and synthesizes against that workspace's `.knowledge/`. Diffs spanning workspaces split into per-workspace syntheses.
- **Cross-workspace links**: A `[[WikiLink]]` can carry a workspace prefix — `[[frontend:AuthClient]]` — resolved by the federated index. Cross-workspace constraints (Phase 6) are honored: "the `frontend` workspace must not import `backend/internal/*`."
- **MCP**: existing tools gain an optional `workspace` parameter. Without it, they search the federation by name with disambiguation prompts.

**Architecture & System Design**
- **Core Components**: new `src/core/workspace.ts` (workspace discovery + resolution), modified `src/core/watcher.ts` (per-workspace routing), modified `src/knowledge/writer.ts` (per-workspace `.knowledge/`), new federated index writer.
- **Design Pattern**: Federation, not aggregation. Each workspace is independently synthesizable; the federation is a derived index, not a separate store. A workspace can be removed without corrupting others.
- **Key Considerations**:
  - Bootstrap mode (Phase 4.5 fix) needs per-workspace scoping — first run in workspace A should ingest A's sources, not the whole monorepo.
  - `cortex setup` needs to register one MCP entry that exposes the *federation*; the entry handles workspace routing internally based on the IDE's active file.
  - Workspaces using different languages or frameworks should not interfere — each gets its own bootstrap file-list filters from `src/core/scan.ts`.

**Definition of Ready (DoR)**
- Phases 6–7 are stable. Federation should not be invented before single-repo behavior is rock-solid.

**Definition of Done (DoD)**
- `cortex init --monorepo` auto-detects pnpm/yarn workspaces and scaffolds `workspaces.json`.
- File changes route to the correct workspace's `.knowledge/` automatically.
- Cross-workspace `[[ws:Entity]]` links resolve in `read_entity` and the federated index.
- Cross-workspace constraints (Phase 6) reject violating syntheses.
- Tests cover: workspace resolution, cross-workspace link rendering, bootstrap-per-workspace, constraint propagation.

**Pros & Cons**
- ✅ **Pros**: Unblocks Cortex for real-world team repos, which are overwhelmingly monorepos. Cross-workspace constraints are uniquely valuable — they enforce module-boundary contracts that no language tooling enforces at the workspace level.
- ❌ **Cons**: Significant scope. Federation adds a coordination layer that touches every existing component. Mitigated by keeping per-workspace `.knowledge/` independent — the federation is a derived view, not a parallel store.

---

## 🔗 Phase 12: Git & CI Integration — ⏳ Planned

**Layman's Terms**
Right now, Cortex runs on your machine and the AI uses it. Phase 12 wires it into the team workflow: a pre-push hook that ensures `.knowledge/` is up to date before code ships, and a GitHub Action that comments on PRs with the architectural diff — "this PR adds 2 entities, mutates 1, and triggers 1 drift warning."

**Technical Terms**
Two integration points:

1. **Local git hooks**: `cortex install-hooks` writes a pre-push hook that runs `cortex sync` (manual mode) or verifies `.last_sync_commit == HEAD` (auto mode), failing the push if synthesis is pending. Optional `--strict` mode also fails on un-acknowledged Phase 6 warnings.

2. **CI surface (GitHub Action)**: a published action `developer-metalhead/cortex-action@v1` that, on a PR, runs `cortex sync --dry-run` against the PR branch and posts a sticky comment:
   - Entities created / updated / deleted (diff vs base branch's `.knowledge/`)
   - New warnings introduced
   - Constraint violations (Phase 6) — these block the PR
   - Stale entities introduced (Phase 6) — surface only, do not block
   - Link to the rendered Mermaid graph diff (Phase 8) if available

   The action uses the MCP route — it runs `cortex mcp` against the PR's checkout and calls `get_pending_changes` / `save_synthesis` against a CI-only LLM key configured in repo secrets.

**Architecture & System Design**
- **Core Components**: new `src/cli/hooks.ts` (install/uninstall hook scripts), a separate published GitHub Action repo, modifications to `cortex sync` to support `--dry-run` (compute synthesis but don't write).
- **Design Pattern**: Defense in depth. Local hooks catch issues before push; CI catches them before merge. Neither replaces the other.
- **Key Considerations**:
  - Hooks must be **opt-in**. Never modify `.git/hooks` without explicit `cortex install-hooks`.
  - The CI action must support both routes: API-key (CI provides the key) and stateless (no synthesis, just diff `.knowledge/` between base and PR).
  - PR comment is sticky — updated, not appended — to avoid noise on iterative pushes.
  - Constraint violations from Phase 6 surface as **CI failure** with `exit 1`; warnings surface as comments without failing.

**Definition of Ready (DoR)**
- Phase 6 (constraints) is stable; without it, the CI surface has nothing to block on.
- Phase 7 (`log.jsonl`) is stable; the PR comment renders structured diffs from it.

**Definition of Done (DoD)**
- `cortex install-hooks` and `cortex uninstall-hooks` cleanly add/remove pre-push hooks.
- `cortex sync --dry-run` produces a structured report without writing.
- GitHub Action published, documented, and exercised on a real repo.
- Sticky PR comment renders correctly with synthesis diff + warnings + constraint violations.
- Tests cover: hook install/uninstall idempotency, dry-run output shape, CI integration smoke test.

**Pros & Cons**
- ✅ **Pros**: Cortex graduates from an individual tool to a team gate. Architectural review at PR time is the highest-leverage place to catch drift — before it lands, while context is still fresh.
- ❌ **Cons**: CI integration adds operational surface (secrets management, billing for the CI LLM key, comment-spam risk). Hooks can frustrate developers if they fail noisily on small changes. Mitigated by making both opt-in and surfacing clear escape hatches (`--no-verify` works, with a logged warning to `.knowledge/`).

---

## 💸 Phase 13: Token Economics & Context Packs — ⏳ Planned

**Layman's Terms**
Cortex is already cheap because it sends diffs, not whole files. Phase 13 turns "cheap" into "predictable." You can export a token-perfect knowledge bundle for any other tool, see what a sync would cost *before* you run it, and the MCP server stops repeating itself when an agent asks the same question twice in a row.

**Technical Terms**
Three small, self-contained surfaces over the existing knowledge — no new data, just smarter exporting and serving.

1. **Context Packs (`cortex context build`).** Emit a token-bounded, audience-targeted bundle of the knowledge base as a single artifact, designed to be pasted into any other agent (a one-shot Claude call, ChatGPT, a co-worker's IDE that doesn't have MCP installed). Flags:
   - `--budget 8000` — hard token cap (estimated via `tiktoken` for OpenAI-family models, falls back to a 4-char-per-token heuristic for others).
   - `--scope <entity-or-concept>` — narrow to a subgraph (reuses Phase 8's graph traversal).
   - `--depth N` — link-hop traversal depth from the scope root.
   - `--format markdown|json` — markdown for humans/IDEs, JSON for programmatic consumers.
   The packer fills the budget greedily by PageRank order (Phase 10's centrality scoring): highest-centrality entities first, then their direct neighbors, until the budget is exhausted. The bundle is self-contained — every `[[WikiLink]]` inside it points at something also in the bundle, or is footnoted as "elided for budget."

2. **Response compression in MCP outputs (sqz-style reference pointers).** Wrap MCP tool responses (`read_knowledge_index`, `read_entity`, `read_concept`, `get_pending_changes`) with a per-session content-addressed cache. On the first response that contains a given large block (e.g., a 4KB entity description), the full text is emitted. On any subsequent response in the same session that would repeat the same block, the body is replaced with a `§ref:<hash>§` token plus a small legend the agent can resolve client-side via a new `resolve_refs(refs[])` tool. Sessions are scoped to a single MCP connection; eviction is LRU on a small fixed budget (256KB by default). Backward-compatible: clients that don't call `resolve_refs` simply see the placeholder and ignore it.

3. **Pre-flight cost simulation (`cortex test-cost`).** Compute the diff that the next sync would synthesize (delegates to `getPendingDiff()`), plus the CURRENT CONTEXT block that would be injected, and report estimated input/output token counts per configured provider's pricing (read from a small static table shipped with Cortex). Flags:
   - `--budget <usd>` — exit nonzero if the estimated spend exceeds the budget, suitable for CI guard.
   - `--mode auto|manual` — auto reports the per-file estimate; manual reports the batched estimate.
   No LLM calls are made. The estimate is deterministic from the diff size + index size + Librarian prompt size.

**Architecture & System Design**
- **Core Components**: new `src/knowledge/packer.ts` (context-pack builder, shared with Phase 8's graph traversal), new `src/cli/context.ts`, new `src/cli/test-cost.ts`, new `src/mcp/compression.ts` (session cache + reference resolution), additions to `src/mcp/server.ts` (new `resolve_refs` tool, response wrappers).
- **Design Pattern**: Each surface is a pure read-side projection over `state.json`. None mutate the canonical store, none require synthesis, none introduce a new persistent file. Cost simulation is offline; context packing is single-shot; response compression is in-memory and per-session.
- **Key Considerations**:
  - Token estimation is **provider-aware** but not provider-accurate to the byte. The static pricing table is a "good enough" estimate; the goal is to catch order-of-magnitude surprises, not bill to the cent. Document the heuristic explicitly so users don't treat the number as exact.
  - Reference compression must be **transparent and opt-in for the client**. Agents that don't know about `§ref:§` placeholders must still get a functional (if slightly larger) response. The compression layer maintains a "this client called `resolve_refs`" bit per session and only compresses for compression-aware clients.
  - Context packs are **stateless artifacts** — once exported, they have no link back to Cortex. Cite the source commit and `state.json` revision in the bundle header so a reader knows when the snapshot was taken.

**Definition of Ready (DoR)**
- Phase 8 has factored graph traversal into `src/knowledge/graph.ts` — the context packer reuses it.
- Phase 10's centrality scoring is implemented — context packs use it to rank inclusion order.

**Definition of Done (DoD)**
- `cortex context build --budget 8000 --scope <entity>` produces a self-contained markdown bundle within the budget, with elided links footnoted.
- `cortex test-cost` reports an estimated token + dollar cost for the next sync without making any LLM calls.
- `cortex test-cost --budget 0.05` exits nonzero when the estimate exceeds the budget.
- Session-scoped reference compression in the MCP server reduces repeated-block bytes on the second-and-later response within a session; `resolve_refs(refs[])` returns the original content for cited hashes.
- Tests cover: pack budget honored on a known-size graph, pack self-containment (no dangling links inside the bundle), cost estimate determinism, compression round-trip via `resolve_refs`.

**Pros & Cons**
- ✅ **Pros**: Makes Cortex's "compounding context" exportable — a knowledge base that can leave the project root and travel with you. Pre-flight cost simulation closes the last surprise vector for users on paid APIs. Response compression amortizes the per-tool-call token cost across an agent's session, which is exactly where heavy MCP usage today bleeds tokens.
- ❌ **Cons**: Each surface is small but they accrue surface area. Mitigated by keeping them strictly read-side projections — none touch the canonical writer. Token-cost estimation is necessarily approximate; document the heuristic and refuse to over-promise. Reference compression adds complexity to the MCP server that only benefits high-volume sessions — the default budget is intentionally conservative so low-volume sessions pay no overhead.

---

## 🗂️ Phase 14: Large-Diff Clustering — ⏳ Planned

**Layman's Terms**
When you change 30+ files at once — say, touching auth, database, and UI all in one save — Cortex currently dumps everything on the AI in one go and asks for a summary. That produces vague, generic knowledge entries because the AI is trying to make sense of too many unrelated things at once. Phase 14 sorts the files into focused groups first (auth changes together, database changes together, UI changes together), then summarises each group separately. The result is sharper, more accurate knowledge entries for large codebases.

**Technical Terms**
Introduce a deterministic clustering step that runs *before* the LLM synthesis call when a diff exceeds a configurable file-count or token threshold. Each cluster is synthesised independently; the results are merged into a single log entry. Clustering is intentionally LLM-free — it uses structural signals already present in `state.json` (directory paths, Phase 6's typed `relationships[]` edges) so it adds no token cost and no latency outside of the synthesis calls themselves.

- **Trigger threshold**: configurable via `.cortexrc` / env; defaults to `CORTEX_CLUSTER_THRESHOLD=15` files. Below the threshold the existing single-shot path runs unchanged.
- **Clustering algorithm**: two-pass.
  1. **Directory bucketing** — group changed files by their nearest common ancestor directory (e.g. `src/auth/`, `src/db/`, `src/ui/`). Files in the repo root are their own bucket.
  2. **Edge merge** — if two directory buckets share a `depends_on` or `called_by` edge in `state.json`'s typed graph, merge them into one cluster. This prevents splitting a change that straddles a tightly coupled boundary (e.g., a service and its direct repository layer) into two disconnected syntheses that each miss the other half.
- **Synthesis**: each cluster is sent to the LLM as a separate `generateObject` call using the same Librarian prompt, with its own diff slice and a CURRENT CONTEXT block scoped to that cluster's entities. Retries (Phase 2's 3-attempt backoff) apply per cluster.
- **Merge**: cluster syntheses are merged into one `SynthesisSchema` object before `save_synthesis`. Entity and concept arrays are concatenated (deduplication by name). Warnings are concatenated. The summary is a one-sentence aggregate emitted by a final, cheap LLM call over the cluster summaries — *not* a re-synthesis of the full diff.
- **Log entry**: a single `log.jsonl` entry is written for the whole batch, carrying a `clustered: true` flag and a `clusterCount: N` field so `cortex log` can surface it distinctly.

**Architecture & System Design**
- **Core Components**: new `src/llm/cluster.ts` (clustering algorithm + merge logic), modifications to `src/llm/client.ts` (route through clusterer when threshold exceeded), modifications to `src/cli/index.ts` and the daemon's watcher handler to expose `CORTEX_CLUSTER_THRESHOLD`.
- **Design Pattern**: pipeline interceptor — the clusterer sits between diff extraction and the LLM call, invisible to the rest of the system. `save_synthesis` receives a single merged result regardless of whether clustering happened.
- **Key Considerations**:
  - Clustering must be **transparent to the writer** — `save_synthesis` must not know or care whether the synthesis was clustered. The merged shape must validate against the existing `SynthesisSchema` Zod definition without changes.
  - The final aggregate-summary call is intentionally cheap: it receives only the N cluster summaries (typically a few sentences each), not the full diff. Use the smallest available model for this step.
  - Clustering must **not** apply to the IDE/MCP route (`save_synthesis` called directly by the agent), because in that route the agent is already doing semantic selection — it only sends what it considers relevant. Clustering is a daemon-only concern.
  - The threshold default (15 files) is deliberately conservative. Most day-to-day saves affect 1–5 files; 15 files signals a refactor or cross-cutting change, exactly the case where synthesis quality degrades without clustering.

**Definition of Ready (DoR)**
- Phase 6's typed `relationships[]` edges are stable in `state.json` — the edge-merge step depends on them.
- Phase 13 is implemented — token estimation lets us validate that clustered synthesis costs less per useful knowledge unit than single-shot on the same diff.

**Definition of Done (DoD)**
- Diffs below `CORTEX_CLUSTER_THRESHOLD` take the existing single-shot path (no regression).
- Diffs at or above the threshold are split, synthesised per cluster, merged, and written as a single log entry with `clustered: true`.
- `cortex log` renders clustered entries with a `[clustered: N groups]` annotation.
- `CORTEX_CLUSTER_THRESHOLD=0` disables clustering entirely (escape hatch for users who prefer single-shot always).
- Tests cover: threshold boundary (14 files → single-shot, 15 → clustered), directory bucketing correctness, edge-merge joining two coupled directories, merge deduplication on entity names, aggregate-summary call receiving only cluster summaries, schema validation of merged output.

**Pros & Cons**
- ✅ **Pros**: Directly improves synthesis quality on the class of diffs where it degrades today — large, cross-cutting changes. Each cluster is small enough for the LLM to reason about precisely. Costs more tokens per large sync (N synthesis calls instead of 1), but produces N focused entries instead of 1 vague one — net knowledge quality improves.
- ❌ **Cons**: Adds latency on large syncs (N sequential or parallel LLM calls). Parallel calls are faster but multiply the concurrent API load; sequential calls are safer but slower. Default to sequential; expose a `CORTEX_CLUSTER_PARALLEL=true` flag for users on rate-limit-generous API tiers. The edge-merge heuristic can over-merge tightly coupled directories into one large cluster — mitigated by capping each cluster at `2 × CORTEX_CLUSTER_THRESHOLD` files and splitting oversized merged clusters by sub-directory.

---

## 🧪 Phase 15: CI Feedback Signal Loop — ⏳ Planned (research-grade)

**Layman's Terms**
Right now Cortex *predicts* what a change will affect using its dependency graph. Sometimes those predictions miss — a change marked "low impact" still breaks a test. Phase 15 closes the loop: when CI runs after a sync, the test results are attached to the entities involved in that sync. Over time, Cortex learns where its predictions miss, and surfaces those misses honestly — *"this entity has been involved in three 'low impact' syncs that broke CI; treat blast-radius estimates here with skepticism."* The signal is grounded in real test execution, not LLM intuition.

**Technical Terms**
A new module that ingests CI run results (success / failure / which tests failed / which test files exercise which source files) and joins them against the `log.jsonl` synthesis stream to produce a per-entity calibration record. This is **not** the runtime/observability layer rejected at [implementation_plan.md:735](implementation_plan.md) — it is strictly bounded to *test-failure → entity attribution*, a grounded signal derived from CI events alone. No PagerDuty, no Sentry, no APM.

- **Inputs**: a CI result feed — either a GitHub Actions webhook (when the Phase 12 action is installed) or a manual CLI command `cortex ci ingest <run-id> --coverage <path>`, plus the existing `log.jsonl` stream.
- **Attribution**: for each failed test in a CI run, identify which source files the test exercised by reading a coverage report (lcov, jest `--coverage`, pytest-cov). Map source files to entities via `state.json.entities[].sourceFile`. Cross-reference against syntheses that touched those entities since the last green CI run on the same branch.
- **Schema (additive)**: new optional `ciSignal` block per entity — `{ greenRunsSince: number, redRunsSince: number, lastRedAt?: string, lastRedTestNames?: string[] }`. **Never an LLM-emitted confidence score** — purely derived from CI events, consistent with the trust-signals-are-observable principle at [CORTEX.md §6](CORTEX.md).
- **CLI**: `cortex ci ingest <run-id> --coverage <path>` attaches a CI result. `cortex ci status` prints per-entity green/red counts. `cortex ci status --weakest 10` lists the 10 entities with the worst green/red ratio — the prediction calibration leaderboard.

**Architecture & System Design**
- **Core Components**: new `src/ci/ingester.ts` (parse coverage + result formats), new `src/ci/attribution.ts` (test-failure → entity mapping), additive `ciSignal` field in `src/knowledge/schema.ts`, new `src/cli/ci.ts`. The Phase 12 GitHub Action gains an optional final step that calls `cortex ci ingest` against the running daemon.
- **Design Pattern**: Append-only signal stream with a derived per-entity projection. CI events are immutable; the per-entity aggregate is computed on read. No LLM in the path.
- **Key Considerations**:
  - Coverage-report parsing must support **lcov** (universal) at minimum, with adapters for `jest --coverage`, `pytest-cov`, and `go test -coverprofile`. Other languages can contribute adapters later — schema is unchanged.
  - Attribution is intentionally coarse: "test failed AND source file in coverage AND file mapped to entity" is the join key. False positives are accepted because the signal is a *trend* over many runs, not single-event blame. This is documented in the readout so users do not mistake `redRunsSince: 1` for "this entity is broken."
  - The CI signal is **purely surface, never acted on**. `cortex sync` does not refuse to run because an entity has a poor CI history. Surface-don't-act ([implementation_plan.md:745](implementation_plan.md)) still applies.

**Definition of Ready (DoR)**
- Phase 12 (Git & CI Integration) is shipped — Phase 15 reuses the GitHub Action's webhook plumbing.
- `log.jsonl` (Phase 7) is stable — attribution joins against it.

**Definition of Done (DoD)**
- `cortex ci ingest <run-id> --coverage <path>` parses a CI result + coverage report and updates `ciSignal` on affected entities.
- `cortex ci status` renders per-entity green/red counts.
- `cortex ci status --weakest 10` ranks entities by green/red ratio.
- GitHub Action (Phase 12) gains an optional post-run step that posts CI results back via `cortex ci ingest`.
- Tests cover: lcov parsing, jest/pytest adapter, attribution correctness on a synthetic repo (sync touches entity A, test that covers A fails, A's `ciSignal.redRunsSince` increments).

**Pros & Cons**
- ✅ **Pros**: The first signal in Cortex grounded in objective execution (test passed or didn't) rather than LLM synthesis. Closes the prediction loop for Phase 9 impact analysis in a way that respects surface-don't-act. The "weakest entities" projection is a directly publishable empirical contribution — *how often does an LLM-synthesised blast-radius estimate predict actual CI failures?* Nobody has measured this rigorously on a real codebase.
- ❌ **Cons**: Coverage parsing is per-tool and per-language; the surface area is permanent. Mitigated by shipping a small core (lcov + jest + pytest + go test) and accepting community adapters. Coverage data is noisy (flaky tests, generated code) — mitigated by using `ciSignal` as a trend signal, never as authoritative single-event blame, and documenting the heuristic openly.

---

## 🔀 Phase 16: Contradiction-Aware Retrieval — ⏳ Planned (research-grade)

**Layman's Terms**
Cortex already detects when new code contradicts the existing knowledge — *"the auth module is documented as JWT but the new code uses cookies."* Today those contradictions are logged inline in `log.md` and then forgotten. Phase 16 promotes the contradiction history into a queryable graph: when a developer or AI reads `[[AuthService]]`, the response surfaces every unresolved contradiction touching that entity. Future syntheses see the contradiction history in CURRENT CONTEXT and can no longer silently re-introduce rejected patterns.

**Technical Terms**
Promote `warnings[]` (today a per-log-entry free-form string array) into a first-class contradiction graph. Each warning containing `[[WikiLink]]` references is parsed into a directed edge between the referenced entities/concepts, stamped with the synthesis event that produced it and a mutable status. The graph is queryable via CLI, surfaced in `read_entity` / `read_concept` MCP responses, and injected into CURRENT CONTEXT for entities touched by the next synthesis.

- **Schema (additive)**: a new top-level `contradictions[]` array in `state.json` — `{ id, between: [name1, name2], summary, recordedAt, sourceSynthesis, status: "open" | "resolved" | "muted", resolution?: { note, resolvedAt } }`. Existing `warnings[]` arrays in `log.md` stay; `contradictions[]` is a structured projection on top.
- **Edge extraction**: deterministic, no LLM. A small parser scans warning text for `[[WikiLink]]` references and emits one contradiction record per pair. Warnings with zero wikilinks remain as free-form log warnings — the Librarian's system prompt is updated to encourage link-bearing warnings going forward.
- **Resolution**: `cortex contradiction resolve <id> [--note "..."]` marks a contradiction as resolved with optional human note. `cortex contradiction mute <id>` marks it as known-but-accepted (visible but does not block synthesis). Status changes append to `log.jsonl` with a typed event so the audit trail survives.
- **Retrieval surfaces**: `read_entity(name)` MCP response gains a `contradictions: [...open and recent-resolved entries...]` block. CLI `cortex contradictions [--entity name | --open | --since DATE]` queries the graph directly.
- **Synthesis-time use**: CURRENT CONTEXT now includes open contradictions for entities the diff touches. The Librarian's system prompt is updated: *"For each open contradiction touching an entity in this diff, you must either restate it (carry it forward), resolve it (emit a `resolves` reference in warnings), or you may not silently overwrite the contradicted claim."*

**Architecture & System Design**
- **Core Components**: new `src/knowledge/contradictions.ts` (graph builder + query API), additive fields in `src/knowledge/schema.ts`, modifications to `src/mcp/server.ts` (surface contradictions in read tools), additions to `src/llm/prompts.ts` (CURRENT CONTEXT injection + system prompt rule), new `src/cli/contradiction.ts`.
- **Design Pattern**: Promote-not-replace. `warnings[]` stays as the canonical event source; `contradictions[]` is the structured projection. The graph is rebuildable from scratch by replaying `warnings[]` over `log.jsonl`, so it never becomes a divergent source of truth.
- **Key Considerations**:
  - Contradiction status is **human-controlled**. Cortex never auto-resolves a contradiction even when a later synthesis appears to "agree" with one side. Surface-don't-act applies — autonomous resolution would silently lose architectural disagreement, which is exactly the signal contradictions are supposed to preserve.
  - Contradictions are first-class trust signals alongside `evidence` (Phase 7) and `staleSince` (Phase 6). An entity with five open contradictions is observably less trustworthy than one with zero — with no LLM confidence number needed, consistent with [implementation_plan.md:743](implementation_plan.md).
  - Open-contradiction count surfaces in `cortex status` so they cannot accumulate unnoticed. A small threshold (e.g. >20 open contradictions) escalates to a hint in `cortex sync` output recommending a triage pass.

**Definition of Ready (DoR)**
- Phase 6 is shipped — `warnings[]` is in place and being populated by real syntheses.
- `log.jsonl` (Phase 7) is stable — contradiction status events append there.

**Definition of Done (DoD)**
- New `contradictions[]` array in `state.json`, populated automatically from `warnings[]` that contain `[[WikiLinks]]`.
- `cortex contradictions --entity AuthService` lists open contradictions involving the entity.
- `cortex contradiction resolve <id>` / `mute <id>` mutate status with an audit-trail entry in `log.jsonl`.
- `read_entity` / `read_concept` MCP responses include a `contradictions` block.
- CURRENT CONTEXT injection includes open contradictions for entities the diff touches.
- Tests cover: wikilink extraction from warning text, idempotent edge building under replay, resolution audit trail, MCP response shape, prompt-injected contradictions on a synthetic diff.

**Pros & Cons**
- ✅ **Pros**: Turns Cortex's existing contradiction signal from "logged and forgotten" into "queryable and actionable." Negative knowledge — what doesn't work, what we disagree on, what was rejected — becomes structurally first-class, which is a genuinely novel pattern in LLM-driven knowledge systems. Reuses Phase 6 infrastructure with minimal additive scope. Provides a clean substrate for an ablation study: *does feeding contradictions back into CURRENT CONTEXT measurably reduce re-introduction of rejected patterns?* That is a publishable result.
- ❌ **Cons**: Warnings without `[[WikiLinks]]` don't become edges, so the graph is sparser than the warning corpus. Mitigated by Librarian prompt changes encouraging link-bearing warnings on a forward-going basis (legacy warnings stay legacy). Human-only resolution means contradictions accumulate if nobody tends them — mitigated by surfacing the open count in `cortex status` and `cortex sync`.

---

## 🎲 Phase 17: Active Disambiguation via Self-Consistency — ⏳ Planned (research-grade)

**Layman's Terms**
Sometimes the AI is sure about what a code change means; sometimes it's guessing. Today Cortex treats both the same — it just writes down whatever the AI said. Phase 17 makes Cortex sample the AI's synthesis multiple times at the same input and check whether the answers agree. When they agree, it commits silently. When they disagree, it surfaces a short structured question — *"Did this change introduce `[[OAuth2Strategy]]` or modify the existing `[[JWTStrategy]]`?"* — and waits for an answer before persisting. The user (or an IDE agent) picks one; Cortex commits with that choice. The "confidence" signal is structural inter-sample agreement, not an LLM-emitted number.

**Technical Terms**
Implement self-consistency sampling (Wang et al., 2022 — *Self-Consistency Improves Chain of Thought Reasoning in Language Models*) as a synthesis-quality signal. For each synthesis call, sample the Librarian *N* times (default *N=3*) at non-zero temperature, structurally diff the outputs, and route by inter-sample agreement:

- **Full agreement** (all *N* samples produce equivalent entity sets and equivalent action verbs per entity): commit silently. This is the dominant case on routine diffs.
- **Partial agreement** (≥⌈*N/2*⌉ samples agree on the entity-level structure but disagree on action verbs or descriptions): commit the majority result and append a typed `samplingDivergence` event to `log.jsonl` for later review.
- **Disagreement** (no majority on entity-level structure, or contradictory action verbs on the same entity): suppress the commit, emit a structured disambiguation question to a queue, surface via `cortex ask` (CLI) or a new MCP `disambiguation_pending` resource.

A disambiguation question is a structured object — `{ id, file, summary, options: [{ summary, sampleId, syntheses: <full synthesis JSON> }], context: { diff, currentContextSnapshot } }` — not a free-form prompt. The user picks an option (or types a free-form override), and that selection is then injected into a final committal synthesis call.

- **CLI**: `cortex ask` prints pending questions; `cortex answer <id> <option-index | "free text override">` resolves one.
- **MCP**: new `disambiguation_pending` resource that IDE agents poll, and a `resolve_disambiguation(id, choice)` tool. This lets Claude Code / Cursor surface the disambiguation question inline in the chat rather than leaving the CLI as the only resolution path.
- **Mode flag**: `CORTEX_DISAMBIGUATION=off|auto|strict`. `off` = current behavior (single sample). `auto` (default once Phase 17 ships) = sample, commit on agreement, queue on disagreement. `strict` = always queue if *any* divergence, even partial.

**Architecture & System Design**
- **Core Components**: modifications to `src/llm/client.ts` (multi-sample wrapper), new `src/llm/consistency.ts` (structural diff of synthesis outputs), new `src/knowledge/disambiguation.ts` (queue stored at `.knowledge/disambiguation/queue.jsonl`), new `src/cli/ask.ts` and `src/cli/answer.ts`, MCP additions in `src/mcp/server.ts`.
- **Design Pattern**: Sampling-as-confidence-signal — explicitly *not* an LLM-emitted confidence number. Calibration-free by construction: agreement is observed across independent generations, not declared by the model. Consistent with [implementation_plan.md:743](implementation_plan.md).
- **Key Considerations**:
  - *N=3* is the floor that gives meaningful majority; *N=5* is the recommended default for high-stakes paths (e.g. Phase 6 constraint-bearing entities, Phase 12 CI gates). Token cost is *N×* per synthesis — surface this in `cortex test-cost` (Phase 13) so users see the cost *before* enabling.
  - Structural equivalence is deterministic: two syntheses are "equivalent" if their entity sets match by name, action verbs match per entity, and `relationships[]` targets match. Description text is allowed to differ — LLM stylistic variance is expected and not signal-bearing.
  - Pending disambiguation questions must persist across daemon restarts. The watcher keeps recording events; only the *commit* is gated. A queue overflow (configurable, default 50) refuses new syntheses with a clear error pointing at `cortex ask` — to prevent silent unbounded growth.
  - Mock mode (`CORTEX_MOCK_AI=true`) short-circuits sampling to *N=1*, keeping the existing deterministic test path fast.

**Definition of Ready (DoR)**
- Phase 13's `cortex test-cost` is shipped — users can see the *N×* token cost of sampling before enabling it.
- Phase 14's clustering is shipped — sampling stacks multiplicatively on top of clustering, so combined-cost visibility is required.

**Definition of Done (DoD)**
- *N*-sample synthesis path implemented behind `CORTEX_DISAMBIGUATION=auto`.
- Structural-equivalence check correctly classifies the three cases (full agreement / partial agreement / disagreement) on a corpus of known synthesis triples.
- Disagreement cases produce a queued disambiguation question with structured options; the queue survives daemon restart.
- `cortex ask` / `cortex answer` resolve questions; resolution drives a committal synthesis.
- MCP `disambiguation_pending` resource and `resolve_disambiguation` tool exposed.
- Tests cover: 3-of-3 agreement → silent commit, 2-of-3 → majority commit + log event, 1-1-1 → queue with structured options, queue persistence across restart, overflow refusal.

**Pros & Cons**
- ✅ **Pros**: Self-consistency is well-validated in the literature as a quality signal and is calibration-free — it requires no model-emitted confidence. Surfaces low-confidence syntheses for human input *exactly* where input is most useful, without forcing review on the ~95% of syntheses where the model is consistent. Provides a clean experimental surface: *what fraction of disagreement cases, on real corpora, correspond to genuine architectural ambiguity vs LLM noise?* That measurement is publishable.
- ❌ **Cons**: *N×* token cost on every synthesis call. Mitigated by opt-in env-var gating and by Phase 14 clustering reducing per-synthesis size. Disambiguation queue can grow unbounded if the user ignores it — mitigated by overflow refusal and surfacing the count in `cortex status`.

---

## 🧬 Phase 18: Architectural Embeddings (Typed-Graph + Text Hybrid) — ⏳ Planned (research-grade)

**Layman's Terms**
Cortex understands structure (the typed dependency graph) and Cortex understands text (the synthesised descriptions). Phase 18 fuses them into a single vector per entity, so a question like *"which other entity is architecturally most similar to `[[AuthService]]`?"* can be answered numerically without re-reading the whole index. The embeddings also become the substrate for Phase 19's distilled Librarian and a link-injection assist for Phase 6.

**Technical Terms**
For each entity, compute a hybrid embedding that fuses three signals:
- **Text embedding** of the entity description + concatenated `evidence[].content` snippets (Phase 7), via a small open-weight encoder (default `bge-small-en-v1.5`, 384-d, CPU-friendly).
- **Graph embedding** of the entity's position in the typed-edge graph (Phase 6 `relationships[]`), via Node2Vec or a small GNN over the directed typed graph. Edge types (`depends_on`, `called_by`, `contradicts`, etc.) inform the random-walk transition probabilities — a `contradicts` edge contributes negative signal to similarity.
- **Fusion**: a learned projection to a common dimensionality (default 128-d), trained offline via a self-supervised objective on synthesis-time pairs: entities co-occurring in the same `warnings[]` or `failedApproaches[]` block should be near each other; entities connected by `contradicts` edges should be far apart; entities co-occurring as `depends_on` neighbors should be moderately close.

Embeddings are **not** used as retrieval-instead-of-reading. Cortex's index-first principle ([CORTEX.md §7](CORTEX.md)) still holds — the rich `index.md` remains the primary read surface. Embeddings serve three narrower purposes:

- **`cortex similar <entity> [--limit N] [--exclude-direct-neighbors]`** — find architecturally adjacent entities. Useful when planning a refactor: *"what else looks like this?"*
- **Phase 6 link-injection assist** — when the Librarian synthesises a new entity, the writer suggests `[[WikiLink]]` candidates from the top-*k* embedding-nearest existing entities. Suggestion only; the Librarian must accept by emitting them, so no autonomous knowledge mutation.
- **Phase 19 distillation feature signal** — the hybrid embedding space is the substrate the distilled small-Librarian uses to reason about entity similarity at inference time.

**Architecture & System Design**
- **Core Components**: new `src/embeddings/encoder.ts` (text encoder wrapper, defaults to `bge-small-en-v1.5` via `transformers.js` or a local Ollama-served model), new `src/embeddings/graph.ts` (Node2Vec / GNN over the typed graph), new `src/embeddings/fusion.ts` (learned projection), new `scripts/train-embedding-fusion.ts` (offline trainer), new `src/cli/similar.ts`, new `src/cli/embed.ts`, additive `embedding: { vector: number[], dim: number, updatedAt: string, modelHash: string }` field on entity records.
- **Design Pattern**: Embedding as a derived projection. The canonical truth remains the markdown + `state.json`. Embeddings are rebuildable from scratch via `cortex embed --rebuild` and never the source of any architectural claim — purely a navigation/feature surface.
- **Key Considerations**:
  - **Local-first is mandatory**. No third-party embedding API. Cortex's local-first invariant (rejection of Cortex Cloud at [implementation_plan.md:715](implementation_plan.md)) extends here — embeddings live in `state.json` and the encoder model lives in `~/.cortex/models/`.
  - Embedding refresh is incremental: only entities mutated since last embedding pass get re-encoded; only their graph neighborhoods get re-projected. Full re-embed is available via `cortex embed --rebuild`. Embedding-update events append to `log.jsonl` so the audit trail tracks them.
  - The fusion projection is trained **once** on the user's accumulated `.knowledge/`, then reused. Retraining is a manual `cortex embed train` command — not automatic — because retraining changes the embedding space and invalidates cached vectors. A `modelHash` field tracks which projection a vector was produced under, so mixed-version vectors are detectable.
  - For users who don't want the bytes, `CORTEX_EMBED=off` disables the feature entirely. Embeddings are pure derived data; absence does not degrade any other phase.

**Definition of Ready (DoR)**
- Phase 6's typed `relationships[]` are stable — graph embeddings depend on them.
- Phase 7's `evidence[].content` snippets are populated — text embeddings include them.
- Knowledge base has ≥50 entities — below that, fusion training has insufficient signal; `cortex embed train` refuses with a clear hint.

**Definition of Done (DoD)**
- `cortex embed [--rebuild]` populates `embedding.vector` on every entity in <30s on a 200-entity base (CPU-only baseline).
- `cortex similar <entity> --limit 5` returns the 5 nearest entities with a one-line description each.
- Phase 6 link-injection assist adds embedding-nearest entities to the Librarian's CURRENT CONTEXT on next synthesis, marked as suggestions (acceptance via Librarian-emitted relationships only).
- `cortex embed train` retrains the fusion projection from accumulated knowledge with a deterministic seed for reproducibility.
- Tests cover: deterministic encoding of identical input, incremental update correctness, similar() ranking on a known synthetic graph, train→retrieve round-trip, mixed `modelHash` detection and warning.

**Pros & Cons**
- ✅ **Pros**: First-class research contribution — typed-graph + text fusion embeddings for code architecture is a genuinely understudied area. Provides the substrate for Phase 19 distillation. Local-first, no third-party dependency. Useful even standalone: `cortex similar` is a real product feature for refactoring scoping and pattern-consistency checks.
- ❌ **Cons**: Adds a serious new dependency surface — a local encoder model (~30MB minimum) plus a training step. Mitigated by making it opt-in via `CORTEX_EMBED`. Trained fusion is per-user (embedding space differs across knowledge bases), so embeddings are not portable across Cortex installs — accepted because they are derived data and `modelHash` makes the boundary explicit.

---

## 🪞 Phase 19: Librarian Distillation — ⏳ Planned (research-grade)

**Layman's Terms**
Today every Cortex synthesis goes through a frontier LLM (GPT-4-class), which is expensive and slow. Phase 19 trains a small specialised model on Cortex's accumulated *(diff, current-context, synthesis)* triples, then uses that distilled model as the default Librarian. The frontier model becomes a fallback for hard cases — diffs where the distilled model's self-consistency check fails. The result is dramatically cheaper synthesis with quality at parity for the long tail of routine diffs, and a genuinely novel research artifact: a Librarian *learned from a specific codebase's architectural history*.

**Technical Terms**
A self-supervised distillation pipeline grounded in real production synthesis pairs. Cortex installs accumulate *(diff, CURRENT CONTEXT snapshot, synthesis JSON)* triples in `log.jsonl` from every committed synthesis call. After ≥1000 such triples — a configurable floor — `cortex distill train` runs a supervised fine-tune of a small open-weight model (default `Qwen2.5-Coder-1.5B`; alternatives `Llama-3.2-1B-Instruct`, `Phi-3.5-mini`) on the triples, with the synthesis JSON as the target. The fine-tuned model is served locally via Ollama or llama.cpp and used as the default Librarian behind a routing flag.

- **Training data scope**: only triples that received self-consistency *agreement* (Phase 17) are included as positive examples. *Disagreement* triples are filtered out — distillation should not learn the frontier model's noise. *Partial agreement* triples may be included as low-weight examples (configurable).
- **Routing flag**: `LIBRARIAN_ROUTE=distilled|frontier|hybrid`.
  - `distilled` always uses the local model.
  - `frontier` always uses the frontier model (current default).
  - `hybrid` (recommended post-Phase-19) uses the distilled model first and falls back to the frontier only when the distilled model's self-consistency check (Phase 17) returns *disagreement*. This bounds quality to frontier on hard cases while capturing the cost savings on routine cases.
- **Quality bar**: `cortex distill eval` runs the distilled model and the frontier model in parallel against a held-out triple set and reports per-field agreement: entity-set Jaccard, action-verb match rate, relationship-target match rate, warning Jaccard. Promoting a distilled model to default requires ≥95% entity-set agreement and ≥90% relationship-target agreement (configurable bars).
- **Privacy & data boundary**: training data stays local. Cortex never uploads `.knowledge/`, `log.jsonl`, or any synthesised triples to a third-party training service. The fine-tune runs on the user's hardware (or a user-controlled GPU rental — Modal, RunPod — initiated by the user, not by Cortex) via `unsloth` or `axolotl`. A new `.cortexignore-distill` file lets the user exclude sensitive files from the training corpus (e.g. proprietary auth implementations).

**Architecture & System Design**
- **Core Components**: new `src/distill/dataset.ts` (extract + format training triples from `log.jsonl`), new `src/distill/train.ts` (wraps an external trainer — `unsloth` or `axolotl` — via subprocess; Cortex does not implement training from scratch), new `src/distill/serve.ts` (Ollama / llama.cpp client), modifications to `src/llm/client.ts` (routing), new `src/cli/distill.ts`.
- **Design Pattern**: Hybrid routing with the frontier model as the safety net. The distilled model handles the easy long tail; the frontier handles novelty. Self-consistency (Phase 17) is the trigger for fallback — calibration-free, no LLM-emitted confidence number.
- **Key Considerations**:
  - The 1000-triple training floor is a *minimum to attempt*. Real quality gains likely require 10k+ triples. Surface dataset size in `cortex distill status` so users see whether training is likely to help before they pay for it.
  - Distilled models live under `~/.cortex/models/<hash>/` with the trained fusion projection (Phase 18) and a metadata file recording teacher model, training-corpus hash, and quality-bar pass/fail. Switching active model is reversible via `cortex distill use <hash>`.
  - `cortex distill eval` must be deterministic (same triples, same metric, same seed) so users can compare runs across checkpoints and Cortex versions.
  - Distillation is **opt-in and explicit**. Cortex never auto-trains, never auto-promotes a distilled model to default, and never silently routes through a distilled model — every step requires an explicit CLI command. This respects the surface-don't-act principle even where ML infrastructure is involved.

**Definition of Ready (DoR)**
- Phase 17 (self-consistency) is shipped — the training filter depends on agreement labels.
- Phase 18 (embeddings) is shipped — embedding features inform the distilled model's input representation.
- User has accumulated ≥1000 self-consistent synthesis triples in `log.jsonl`. For dev/test, `cortex distill synth-corpus --size 1000` generates a synthetic corpus from a replayed git history.
- User has local GPU access (or accepts CPU training time on a small model).

**Definition of Done (DoD)**
- `cortex distill dataset` exports a training-ready JSONL from `log.jsonl`, filtered by self-consistency label.
- `cortex distill train --model qwen2.5-coder-1.5b` runs a fine-tune via `unsloth` and writes a checkpoint to `~/.cortex/models/<hash>/`.
- `cortex distill eval` reports per-field agreement on a held-out set with deterministic metrics.
- `LIBRARIAN_ROUTE=hybrid` routes synthesis requests through the distilled model with frontier fallback on Phase 17 disagreement.
- A trained model meeting the configurable quality bar achieves ≥5× cost reduction on a defined benchmark workload vs frontier-only routing.
- Tests cover: dataset filtering correctness (self-consistent triples included, disagreement excluded), training command produces a valid checkpoint and metadata, hybrid routing fallback triggers on disagreement, `cortex distill use <hash>` switches active model reversibly.

**Pros & Cons**
- ✅ **Pros**: Reduces Cortex's per-synthesis cost by an order of magnitude on the long tail of routine diffs. Genuinely novel research surface — distilling a Librarian from real production synthesis pairs, filtered by self-consistency, is unstudied territory. Closes the loop on Cortex's "compounding knowledge" claim — the knowledge base does not just describe the codebase, it *trains the system that describes the codebase*. The (codebase → Librarian → distilled Librarian) feedback path is itself the paper.
- ❌ **Cons**: Real ML infrastructure — training pipeline, model serving — is a step change in operational complexity. Mitigated by delegating training to external tools (`unsloth`, `axolotl`) rather than rolling our own and by making every step explicit. Quality is bounded by training-data quality, which is bounded by the frontier teacher's prior accuracy — distillation cannot exceed the teacher. Per-user fine-tuned models mean each install has a different Librarian, complicating reproducibility — accepted because the trade is real cost reduction and the `modelHash` metadata makes the boundary auditable.

---

## 💡 Phase 20: Intelligent Architectural Advisor — ⏳ Planned

**Layman's Terms**
Cortex shouldn't just document what you built—it should help you build it better. Phase 20 introduces an opt-in advisory layer where Cortex can review your codebase and suggest architectural improvements (like modernizing your auth, caching data, or fixing anti-patterns) without changing your code automatically.

**Technical Terms**
Implement an opt-in, non-mutating architectural review engine (`cortex suggest` / `cortex review`). Cortex will analyze the current architectural state (`state.json`) against a heuristic pattern library of common modernizations and known anti-patterns. Suggestions are strictly advisory and saved to a dedicated `.knowledge/suggestions/` directory to prevent polluting the canonical `entities/` store. 

**Architecture & System Design**
- **Core Components**: `src/advisor/engine.ts`, `src/advisor/heuristics.ts`, `src/cli/suggest.ts`.
- **Design Pattern**: Rule-based heuristic evaluation augmented by LLM synthesis for context-aware recommendations.
- **Key Considerations**: 
  - **Trust Boundary**: Must be strictly opt-in via a CLI command. Cortex never automatically generates suggestions during the standard `cortex watch` or `sync` lifecycle to avoid noise.
  - **Isolation**: Suggestions live in `.knowledge/suggestions/*.md` to keep the primary entity graph pure and canonical.

**Definition of Ready (DoR)**
- Phase 6 (Guardrails) is fully shipped and stable, providing the underlying contradiction and invariant detection mechanics.
- A baseline heuristic library (e.g., Redis session caching, JWT standard practices) is defined.

**Definition of Done (DoD)**
- `cortex suggest` CLI command is implemented and generates markdown suggestions in `.knowledge/suggestions/`.
- The MCP server exposes a `get_suggestions` tool for IDEs to surface these recommendations.
- The advisory engine successfully identifies at least three common architectural anti-patterns in a test repository.
- Tests cover: Opt-in boundary enforcement, isolated storage of suggestions, and basic heuristic matching.

**Pros & Cons**
- ✅ **Pros**: Moves Cortex up the value chain from passive memory to active architectural partner. Highly valuable for onboarding or refactoring legacy codebases.
- ❌ **Cons**: Generates potential noise if the heuristics are too aggressive. Requires maintaining an up-to-date pattern library.

---

## 🚫 Explicitly out of scope

**Bi-directional source injection** (writing Cortex-generated comments back into `src/`) was proposed and **rejected**. It violates the read-only-source invariant declared in [CORTEX.md §2](CORTEX.md), creates watcher feedback loops, pollutes git history with machine-authored noise, and produces merge conflicts with developer comments. Cortex's authority over `.knowledge/` and its non-authority over `src/` is a load-bearing boundary, not an accident.

**Roadmap-to-entity phase tagging** was proposed as part of a traceability matrix and **partially rejected**. The generic half (querying `log.md` by entity/time/warnings) is adopted as Phase 7. The project-specific half (annotating `ROADMAP.md` phases with entity links) is rejected — Cortex is meant to work on every codebase, and most codebases don't have a `ROADMAP.md` with phase headings.

**Cortex Cloud / shared remote knowledge base.** Proposed as a way to sync `.knowledge/` across team members. Rejected for now: violates the local-first principle that makes Cortex easy to adopt, and introduces hard problems (sync semantics, conflict resolution, auth, billing) without a clear product story. Teams that want shared knowledge can commit `.knowledge/` to git today; that's good enough until a real shared-edit use case emerges.

**Semantic vector search over entity descriptions.** Proposed for finding related entities. Rejected: the LLM does this naturally by reading the rich index, and the index is small enough (typically <50KB) that loading the whole thing is cheap. Re-evaluate if a real-world `.knowledge/` exceeds ~200 entities and lookup latency becomes a measured problem.

**Per-project plugin / custom synthesis prompt architecture.** Proposed as a way to enforce domain-specific extraction. Rejected: adds extension-point surface area before there's demonstrated demand. The shared `LIBRARIAN_SYSTEM_PROMPT` is opinionated for a reason; one-off prompt overrides risk fragmenting synthesis quality across projects.

**In-house AST parsing for constraint checks.** Considered as part of Phase 6. Rejected in favor of treating the LLM as the AST: it already produces structured edges, it handles every language uniformly, and rolling our own AST parsers (TypeScript + Python + Go + Rust + ...) is a permanent maintenance tax for marginal accuracy gain.

**Auto-generated README from `.knowledge/`.** Proposed as a public-facing artifact. Rejected: synthesis biases (LLM's view of importance, ordering, terminology) would leak into the project's outward-facing identity. Phase 10's onboarding output is the right surface — opt-in, audience-targeted, and lives in `.knowledge/`, not at the repo root.

**Symmetric encryption of entities (Nexidion-style "private details / public summaries").** Proposed as a way to keep architectural secrets out of the synthesized index. Rejected: it directly conflicts with the plain-markdown, Obsidian-browseable principle that makes `.knowledge/` adoptable. The source code itself is unencrypted in `src/` — encrypting its synthesized description is theatre. Teams with real secrets-in-architecture concerns should keep those modules out of the watched paths via `.gitignore`-style exclusions, not via a parallel key-management surface.

**Chat-turn decision extraction (Origin-style inline synthesis from conversation).** Proposed as a way to capture decisions made during AI-pair coding. Rejected: `log.md` (Phase 3) and `log.jsonl` (Phase 7) already capture every architectural decision *that touches code*. Decisions made in chat that don't touch code are by definition not architectural changes — they're conversation. Cortex's authority boundary is the codebase, not the chat transcript.

**Import-graph pre-caching (TokenZip-style predictive documentation).** Proposed as a way to pre-synthesize docs for files the agent is likely to touch next. Rejected: it inverts Cortex's diff-on-save model into speculative work, most of which will never be consumed. The token cost compounds for hypothetical future reads while delivering no certainty. Phase 13's response compression solves the real version of this problem (repeated reads in one session) without paying for predictions.

**Parallel rationale log (`rationale.json` / "thought stream").** Proposed as a way to record *why* the Librarian made each synthesis decision. Rejected: `log.jsonl` (Phase 7) already carries the structured event stream with `summary`, `entities`, `warnings`, and (post-Phase-6) `failedApproaches`. A second parallel log invites divergence between the two stores and adds no information that the existing log can't carry.

**Review-gated falsifiable claims (AKBP-style human-in-the-loop synthesis).** Proposed as a way to require explicit user approval before knowledge updates persist. Rejected: it conflicts with the autonomous-synthesis premise that makes Cortex valuable in the first place — the watcher's whole point is that knowledge stays current without manual gating. Users who want a review gate already have one: `manual` mode (Phase 3) batches synthesis until the user types `cortex sync`. The Phase 7 audit surface (`cortex log --since`, `audit_entity`) provides retrospective review without blocking the writer path.

**Runtime awareness layer — CI failures, deployment events, incident correlation.** Proposed as a way to attach operational signals to architectural entities ("which deploy broke `[[PaymentService]]`?"). Rejected: it expands Cortex from architectural memory into observability, where Sentry / Datadog / GitHub Actions / PagerDuty already win. The integrations cost (auth, webhooks, polling, schema-per-provider) is permanent maintenance for a use case adjacent to — not core to — the product. Teams that want this can pipe their incident URLs into entity descriptions manually; the wikilink graph carries them.

**CRDT / immutable timestamped facts with per-entity UUIDs.** Proposed as a way to make `.knowledge/` safe under concurrent Git merges. Rejected: the actual mergeability problem is already mostly solved — each entity is its own file, each concept is its own file, `log.md` is append-only, and `index.md` is regenerated from `state.json`. The only common conflict surface is `state.json` itself; if real-world teams hit it, the right fix is to make `state.json` regeneratable from the per-entity files (already true since v0.3.x's migration logic) and treat conflicts as "rerun ingest." UUIDs everywhere and event-sourced merge logic is a 10× complexity tax for a 1.1× usability gain.

**Native VS Code / Cursor extensions and `cortex://` URI schemes.** Proposed as a way to provide an "always-on" in-editor UX. Rejected: the MCP surface already provides everything an extension would — read tools, save tools, slash commands. Building a per-IDE native extension multiplies maintenance across editors (and breaks every time the IDE's extension API changes) for marginal UX gain over the PreToolUse hook recipe in Phase 4.5.

**First-class Obsidian plugin.** Proposed for graph view + review queue + status bar inside Obsidian. Rejected: Obsidian already renders `.knowledge/` as a navigable graph out of the box because Cortex emits standard `[[WikiLinks]]`. A custom plugin would add minimal value over the default rendering. If a community member wants to build one, the schema is stable and public — it can ship downstream.

**LLM-emitted numerical confidence scores per entity.** Proposed as a quick visual signal of how much to trust a synthesized claim. Rejected: model-emitted confidence is uncalibrated theater. The observable trust signals Cortex already produces — `evidence` (does the cited code still resolve?), `staleSince` (has a depended-on entity changed?), `lastRefined` (how old is this claim?) — derive from facts, not LLM intuition. If a user wants a single-number readout, surface it as a derived trust-signal projection in `cortex status`, not as a stored field.

**Self-maintenance auto-rewrites — auto-prune stale, auto-merge duplicates, auto-correct contradictions.** Proposed as a way to keep the knowledge base healthy over time without user effort. Rejected: Cortex never silently rewrites synthesized content. The right pattern is *surface, don't act*: `cortex lint` (Phase 7) flags duplicates, orphans, anti-patterns, and stale entities; the human (or the LLM via `/ingest`) decides what to do about each. Autonomous rewrites of an architectural source-of-truth invert the trust direction and the read-only-source invariant in spirit, even if not in letter.

**"Remember this" — auto-extracting decisions from chat turns.** Proposed as a way to capture insights mentioned in chat without the user typing a command. Rejected (twice — first as Origin-style chat extraction, now again as "auto-save insight"): Cortex's authority is over the codebase, not the chat transcript. A decision worth remembering is one that touches code; if it doesn't touch code, it's conversation, and the conversation tooling (Claude Code's own memory) is the right home for it.

**Vector / hybrid storage (LanceDB / Chroma / Voyage-code-3).** Reaffirmed rejection. The rich index + drill-down pattern works because typical `.knowledge/` directories are <200 entities and <50KB of text — fully loadable into the LLM's context every call. Hybrid storage solves a problem that does not yet exist in the field; the day a real-world deployment crosses ~200 entities with measured retrieval latency, this gets re-opened.

**AST parsing (Tree-sitter / TypeScript Compiler API / Babel).** Reaffirmed rejection. The LLM is the AST: it produces structured "edges introduced" output uniformly across every language. Rolling per-language AST parsers (TypeScript + Python + Go + Rust + Java + ...) is a permanent maintenance tax for a marginal accuracy gain over LLM-extracted relationships.

**Encrypted cloud team sharing.** Reaffirmed rejection. Local-first means local-first; teams that want shared knowledge commit `.knowledge/` to Git today, which is good enough until a real shared-edit use case emerges. End-to-end encryption + key management + sync semantics is a product-shaped problem, not a feature.

**Plugin marketplace / custom synthesis prompts.** Reaffirmed rejection. The opinionated `LIBRARIAN_SYSTEM_PROMPT` is opinionated for a reason; one-off prompt overrides fragment synthesis quality across projects.

---

## 🛡️ Product Viability & Production Readiness

To elevate Project Cortex from a prototype to a **Viable Product**, the following cross-cutting concerns are established as global requirements:

1.  **Testing Strategy**
    *   **Unit Tests**: Core utilities (diff extraction, JSON parsing, Markdown writing) — starter coverage in `tests/`; expand over time.
    *   **Integration Tests**: Test the Watcher -> LLM -> Writer pipeline using mocked LLM responses.
    *   **End-to-End (E2E)**: Simulate file saves in a mock repository and verify the resulting `.knowledge` outputs.

2.  **Telemetry, Logging, and Observability**
    *   ✅ Structured logger (`pino`) with stdout + `cortex.log` in the project root during `cortex watch`.
    *   Clear log levels: `DEBUG` / `INFO` / `WARN` / `ERROR` via `LOG_LEVEL`.
    *   ✅ Local log file (`cortex.log`) for background monitoring.

3.  **Security & Secrets Management**
    *   API Keys must never be logged.
    *   ✅ Support loading keys from a global `~/.cortexrc` or project-local `.env` ([src/core/env.ts](src/core/env.ts)); project `.env` overrides global keys.
    *   `cortex init` MUST automatically add `.env` to the project's `.gitignore`.

4.  **Error Recovery & Resiliency**
    *   **LLM Outages**: The watcher retries each synthesis call up to three times; a durable disk-backed queue for auto mode is still optional future work.
    *   **File Locking**: ✅ Implement a lockfile mechanism (`.knowledge/cortex.lock`) to prevent multiple `cortex` instances from running in the same directory simultaneously and corrupting the index.

---

## 🩹 Post-Launch Fixes (v0.3.3)

Three classes of issues surfaced after the first public release. v0.3.3 addresses the **root causes**, not just symptoms.

| # | Issue | Root Cause | Fix |
|---|---|---|---|
| 1 | **STDOUT pollution — `invalid character 'â'`** | `dotenv@17` (the version this project depends on) prints a "tip" message to STDOUT on every `config()` call. The MCP STDIO transport requires STDOUT to contain only JSON-RPC frames, so the tip line breaks every IDE that parses the stream. | Added `quiet: true` to both `dotenv.config()` calls in [src/core/env.ts](src/core/env.ts). `pino-pretty` was also routed to STDERR (`destination: 2`) in [src/core/logger.ts](src/core/logger.ts) as defense-in-depth. |
| 2 | **Antigravity setup not portable across projects** | Antigravity prioritizes the global `~/.gemini/antigravity/mcp_config.json` over per-project `.antigravity/mcp_config.json`, so the previous per-project setup was silently ignored. Even when local won, every new project required a fresh setup, and entries with hardcoded `node_modules` paths broke on project switches. | [src/cli/setup.ts](src/cli/setup.ts) antigravity target now defaults to writing the **global** config with a project-agnostic entry (`command: "cortex"`, `args: ["mcp"]`, `env: { DOTENV_CONFIG_QUIET: "1" }`). `findProjectRoot()` resolves the active project from CWD at runtime — one global entry serves every project. A `--local` flag on `cortex setup` writes the per-project file instead. Pre-flight check verifies `cortex` is on PATH; aborts with an install hint if not. |
| 3 | **Bootstrap ingestion documents Project Cortex itself** | Prompt-level guidance ("if index is empty, scan src/") was too weak — `get_pending_changes` still returned a git diff in the user prompt, and LLMs follow what's in front of them. The first diff is invariably "the user installed Cortex," so the first synthesis described Cortex's footprint instead of the user's app. | Tool-level enforcement: `get_pending_changes` now calls `KnowledgeManager.isEmpty()` and branches. On empty: returns `mode: "bootstrap"` with a curated source-file list (via `listSourceFiles()` in [src/core/scan.ts](src/core/scan.ts)) and `BOOTSTRAP_PROMPT_TEMPLATE` — **the git diff is intentionally absent from the payload**. The file list excludes the Cortex/IDE footprint (`.knowledge/`, `.claude/`, `.agents/`, `.antigravity/`, `.cursor/`, `.vscode/`, etc.), test files (`tests/`, `*.test.*`, `*.spec.*`), and `node_modules`-class noise; includes `docs/`. Capped at 500 entries with a footer. Both ingest prompt files now branch on the `mode` field. |
