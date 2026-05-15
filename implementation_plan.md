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
| 6 | Active Guardrail — Constraints & Blast-Radius Analysis | ⏳ Planned |
| 7 | Audit & Traceability Tools | ⏳ Planned |
| 8 | Visual & Browseable Knowledge Graph | ⏳ Planned |
| 9 | Refactoring Impact Preview | ⏳ Planned |
| 10 | Onboarding & Guided Reading | ⏳ Planned |
| 11 | Monorepo Federation | ⏳ Planned |
| 12 | Git & CI Integration | ⏳ Planned |

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
- **Supported IDEs**: `claude-code`, `cursor`, `vscode`, `windsurf`, `claude-desktop`, `antigravity` (Antigravity writes the **global** config by default — see Post-Launch Fix #2).
- **Slash commands** shipped for Claude Code: `/ingest_cortex`, `/cortex_status`, `/read_knowledge`.
- **Antigravity workflows** shipped under `.agents/workflows/`: `ingest`, `read`, `status`, `explore`.

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
- ✅ `cortex status` — Reports config, knowledge health, daemon lock state, and `cortex.log` hint.
- ✅ `cortex config` — Supports interactive prompts and direct flags.
- ✅ `cortex mcp` — Provides a portable, "Repo-Aware" entry point for all major IDEs.
- ✅ Smart Root Detection — Implemented `findProjectRoot` to dynamically locate `.knowledge` from any IDE context.
- ✅ Structured logging — `pino` integrated for daemon observability (stdout + `cortex.log`).
- ✅ Lockfile and Graceful Shutdown — Ensures process exclusivity and clean exits.
- ✅ Global env — `~/.cortexrc` loaded before project `.env` via [src/core/env.ts](src/core/env.ts).
- ✅ Starter tests — `npm test` runs `tests/*.test.ts` (schema + writer delete behavior).

---

## 🚧 Phase 6: Active Guardrail — Constraints & Blast-Radius Analysis — ⏳ Planned

**Layman's Terms**
Today, Cortex *remembers* your architecture and tells the AI when it forgets. The next step is to *enforce* it: declare rules like "the Connect 4 module must not import from Chess," and have Cortex reject any synthesis that violates them. Plus, when a foundational module changes shape, automatically flag every entity that depends on it as "potentially broken."

**Technical Terms**
Two related additions:

1. **Declared constraints on entities/concepts.** Extend the synthesis schema with an optional `constraints` field per entity:
   ```ts
   constraints?: {
     mustNotImport?: string[];      // glob patterns of forbidden import targets
     mustNotBeCalledBy?: string[];  // glob patterns of forbidden callers
     contract?: string;             // free-form invariant the LLM must respect
   }
   ```
   Constraints persist in `state.json` once declared. On every subsequent ingest, the LLM is shown the constraints for every touched entity as part of `CURRENT CONTEXT`. `save_synthesis` rejects the call if the resulting synthesis declares a state that violates a constraint (e.g., a new import edge that hits a `mustNotImport` pattern). Rejection returns a structured error pointing at the offending file and the violated rule, forcing the agent to refactor before retrying.

2. **Blast-radius flagging on entity mutation.** When `action: update` materially changes an entity's description or `sourceFile`, the writer walks the inbound link graph (every entity whose `links[]` contains the mutated entity's name) and stamps a `staleSince: <ISO timestamp>` field on each dependent record. `state.json` gains a derived `stalenessIndex` so `cortex status` and `read_knowledge_index` can surface "N entities are downstream of a change you haven't reconciled yet."

**Architecture & System Design**
- **Core Components**: Extend `src/llm/schema.ts` (constraints field), `src/knowledge/writer.ts` (constraint validation + staleness propagation), `src/mcp/server.ts` (`save_synthesis` rejection contract), `src/llm/prompts.ts` (inject constraints into CURRENT CONTEXT).
- **Design Pattern**: The constraints field is a tiny declarative rule engine. Blast-radius is a reverse-graph traversal over `state.json`.
- **Key Considerations**:
  - Constraint **violation detection** is hybrid: the LLM produces structured "edges introduced" output (imports added, callers added) and the writer checks those against declared rules. We do not run an AST parser ourselves — that's brittle across languages. The LLM is the AST.
  - Staleness is informational, not blocking. A stale entity is still readable; it just carries a flag until re-synthesized.
  - Constraints are **opt-in per entity**. Most entities will have none. They exist to encode hard architectural lines (module boundaries, secret-handling rules, layering invariants).

**Definition of Ready (DoR)**
- Phases 1–5 are stable. Schema is owned end-to-end by `src/llm/schema.ts`.
- We have at least one real-world repo with a clear architectural boundary to test against (e.g., a games-hub project where each game must not import another).

**Definition of Done (DoD)**
- `constraints` field accepted by the schema, persisted in `state.json`, rendered in `index.md`.
- `save_synthesis` rejects (with a structured error) syntheses that introduce a forbidden import/caller edge against a declared constraint.
- `update` actions that mutate an entity's description propagate `staleSince` to every entity linking inbound.
- `cortex status` reports stale-entity count and a `cortex audit stale` command lists them.
- Tests cover: constraint persistence, violation rejection, stale propagation across a 2-hop graph.

**Pros & Cons**
- ✅ **Pros**: Moves Cortex from "passive memory" to "active guardrail" — the stated north star. Blast-radius surfaces the hidden cost of an architectural change *before* it ships. Constraint enforcement gives teams a hard line, not a soft warning.
- ❌ **Cons**: LLM-driven edge detection has false-negative risk (the model may miss an import). Mitigated by treating constraints as defense-in-depth, not the only line of defense. Staleness can be noisy on large refactors — needs a "mark all reconciled" escape hatch.

---

## 🔍 Phase 7: Audit & Traceability Tools — ⏳ Planned

**Layman's Terms**
Right now, `log.md` is a wall of every architectural change ever made. Useful, but you can't ask it questions. Phase 7 turns the log into something you can query: "Which entities were touched in the last 10 commits?", "When did `[[AuthMiddleware]]` first appear?", "Show me every warning generated against `[[PaymentService]]`."

**Technical Terms**
Add a structured query layer over `log.md` + `state.json`. The log already contains the data — timestamp, summary, impacted entities (as `[[WikiLinks]]`), warnings — but only as free-text markdown. Phase 7 adds:

1. **Structured log emission alongside markdown.** Every `saveSynthesis()` also appends a JSON line to `.knowledge/log.jsonl` with `{ timestamp, commit?, summary, entities: [], concepts: [], warnings: [] }`. Markdown stays as the human-readable surface; JSONL is the queryable one.
2. **CLI query commands.**
   - `cortex log --entity <name>` — every log entry that touched a given entity.
   - `cortex log --since <commit|date>` — entries since a given point.
   - `cortex log --warnings` — only entries that emitted warnings.
   - `cortex audit stale` — list entities flagged stale by Phase 6.
3. **MCP audit tool.** `audit_entity(name)` and `audit_since(commit)` expose the same surface to IDE agents, so the AI can ask "what changed in `[[AuthModule]]` over the last sprint?" without grepping `log.md`.

**Architecture & System Design**
- **Core Components**: `src/knowledge/writer.ts` (dual-emit log entries), new `src/knowledge/audit.ts` (query layer), new `src/cli/log.ts` (CLI command), additions to `src/mcp/server.ts`.
- **Design Pattern**: Event-sourced query over an append-only log. JSONL is the canonical event stream; markdown is the projection for humans.
- **Key Considerations**:
  - JSONL append is atomic on POSIX; on Windows, use a write-and-rename strategy.
  - Backfill: on first run after upgrade, parse existing `log.md` into `log.jsonl` best-effort. Stamp pre-existing entries with `migrated: true` and an estimated timestamp.
  - The query surface stays read-only — no mutation of historical entries.

**Definition of Ready (DoR)**
- Phase 6 (or at least its schema additions) is stable, so `staleSince` and constraint-violation events are part of the log shape.

**Definition of Done (DoD)**
- `log.jsonl` is written alongside `log.md` on every synthesis.
- The four CLI subcommands above work against a real `.knowledge/`.
- `audit_entity` and `audit_since` are registered MCP tools.
- Backfill migration runs cleanly on a pre-Phase-7 `.knowledge/` directory.
- Tests cover: dual-emit, query-by-entity, since-filter, warnings-only filter.

**Pros & Cons**
- ✅ **Pros**: Turns the architectural log from a reading artifact into a debugging tool. "When did this drift first appear?" becomes one command. Closes the loop with Phase 6 — once you flag drift, you also need to find it later.
- ❌ **Cons**: Adds a parallel storage format. JSONL and `log.md` must stay in sync; divergence would be confusing. Mitigated by writing both from the same code path.

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

**Architecture & System Design**
- **Core Components**: new `src/knowledge/onboarding.ts` (centrality scoring + ordering), new `src/cli/onboard.ts`, new MCP prompt registration in `src/mcp/server.ts`, new system prompt in `src/llm/prompts.ts` (the "Tour Guide" persona).
- **Design Pattern**: Output mode, not new data. The same `state.json` powers ingest, audit, graph, impact, and now onboarding.
- **Key Considerations**:
  - Centrality scoring: PageRank over the directed link graph, with a damping factor of 0.85 (standard). High-centrality entities are read first because everything else points at them.
  - Concept ordering: concepts before the entities that embody them, so the reader has the abstraction before the implementation.
  - Estimated reading time: ~150 words/min, plus a flat 30s per `[[WikiLink]]` follow.

**Definition of Ready (DoR)**
- Knowledge base has at least ~20 entities (smaller bases don't need onboarding — just read the index).
- `state.json` link graph is well-populated (depends on Phase 6's link-injection quality).

**Definition of Done (DoD)**
- `cortex onboard` produces `.knowledge/onboarding.md` with a clear reading order, rationale per stop, and time estimate.
- Audience and depth flags produce materially different outputs (verified on a test corpus).
- The MCP `onboard` prompt produces equivalent output via an IDE agent.
- Tests cover: empty base (graceful failure with hint), single-entity base (degenerate but valid output), centrality ranking correctness on a known graph.

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

## 🚫 Explicitly out of scope

**Bi-directional source injection** (writing Cortex-generated comments back into `src/`) was proposed and **rejected**. It violates the read-only-source invariant declared in [CORTEX.md §2](CORTEX.md), creates watcher feedback loops, pollutes git history with machine-authored noise, and produces merge conflicts with developer comments. Cortex's authority over `.knowledge/` and its non-authority over `src/` is a load-bearing boundary, not an accident.

**Roadmap-to-entity phase tagging** was proposed as part of a traceability matrix and **partially rejected**. The generic half (querying `log.md` by entity/time/warnings) is adopted as Phase 7. The project-specific half (annotating `ROADMAP.md` phases with entity links) is rejected — Cortex is meant to work on every codebase, and most codebases don't have a `ROADMAP.md` with phase headings.

**Cortex Cloud / shared remote knowledge base.** Proposed as a way to sync `.knowledge/` across team members. Rejected for now: violates the local-first principle that makes Cortex easy to adopt, and introduces hard problems (sync semantics, conflict resolution, auth, billing) without a clear product story. Teams that want shared knowledge can commit `.knowledge/` to git today; that's good enough until a real shared-edit use case emerges.

**Semantic vector search over entity descriptions.** Proposed for finding related entities. Rejected: the LLM does this naturally by reading the rich index, and the index is small enough (typically <50KB) that loading the whole thing is cheap. Re-evaluate if a real-world `.knowledge/` exceeds ~200 entities and lookup latency becomes a measured problem.

**Per-project plugin / custom synthesis prompt architecture.** Proposed as a way to enforce domain-specific extraction. Rejected: adds extension-point surface area before there's demonstrated demand. The shared `LIBRARIAN_SYSTEM_PROMPT` is opinionated for a reason; one-off prompt overrides risk fragmenting synthesis quality across projects.

**In-house AST parsing for constraint checks.** Considered as part of Phase 6. Rejected in favor of treating the LLM as the AST: it already produces structured edges, it handles every language uniformly, and rolling our own AST parsers (TypeScript + Python + Go + Rust + ...) is a permanent maintenance tax for marginal accuracy gain.

**Auto-generated README from `.knowledge/`.** Proposed as a public-facing artifact. Rejected: synthesis biases (LLM's view of importance, ordering, terminology) would leak into the project's outward-facing identity. Phase 10's onboarding output is the right surface — opt-in, audience-targeted, and lives in `.knowledge/`, not at the repo root.

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
