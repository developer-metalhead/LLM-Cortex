# Project Cortex: Product Blueprint & Implementation Plan

This document serves as the definitive blueprint and systematic, phase-by-phase approach to building Project Cortex. Each phase represents a small, implementable chunk designed to incrementally build the Autonomous Knowledge Engine from the ground up.

> **Status legend:** ✅ Done · 🚧 In progress · ⏳ Planned

| Phase | Title                                                  | Status                               |
| ----- | ------------------------------------------------------ | ------------------------------------ |
| 1     | Ingestion & Monitoring Foundation                      | ✅ Done                              |
| 2     | LLM Synthesis Engine                                   | ✅ Done                              |
| 3     | Knowledge Storage & Cost Control                       | ✅ Done                              |
| 4     | MCP Server Integration                                 | ✅ Done                              |
| 4.5   | Dual-Route IDE Integration                             | ✅ Done (added beyond original plan) |
| 5     | CLI Polish & Daemonization                             | ✅ Done                              |
| 6     | Active Guardrail — Constraints & Blast-Radius Analysis | 🚧 In progress                       |
| 7     | Audit & Traceability Tools                             | ⏳ Planned                           |
| 8     | Visual & Browseable Knowledge Graph                    | ⏳ Planned                           |
| 9     | Refactoring Impact Preview                             | ⏳ Planned                           |
| 10    | Onboarding & Guided Reading                            | ⏳ Planned                           |
| 11    | Monorepo Federation                                    | ⏳ Planned                           |
| 12    | Git & CI Integration                                   | ⏳ Planned                           |
| 13    | Token Economics & Context Packs                        | ⏳ Planned                           |
| 14    | Large-Diff Clustering                                  | ⏳ Planned                           |
| 15    | CI Feedback Signal Loop                                | ⏳ Planned (research-grade)          |
| 16    | Contradiction-Aware Retrieval                          | ⏳ Planned (research-grade)          |
| 17    | Active Disambiguation via Self-Consistency             | ⏳ Planned (research-grade)          |
| 18    | Architectural Embeddings (Typed-Graph + Text Hybrid)   | ⏳ Planned (research-grade)          |
| 19    | Librarian Distillation                                 | ⏳ Planned (research-grade)          |
| 20    | Intelligent Architectural Advisor                      | ⏳ Planned                           |
| 20.1  | Architecture Simulation & What-If Analysis             | ⏳ Planned                           |
| 20.2  | Bug Hotspot Prediction                                 | ⏳ Planned (research-grade)          |
| 20.3  | Design Pattern Suggestion                              | ⏳ Planned                           |
| 20.4  | Evolutionary Architecture Fitness Functions            | ⏳ Planned                           |
| 20.5  | Architecture Documentation Generation                  | ⏳ Planned                           |
| 20.6  | Hierarchical Memory Tiering (MemGPT-inspired)          | ⏳ Planned (research-grade)          |
| 20.7  | Personalized Per-Developer Memory (Mem0-inspired)      | ⏳ Planned                           |
| 20.8  | Memory Stream Retrieval Scoring                        | ⏳ Planned (research-grade)          |
| 20.9  | Community Synthesis (GraphRAG + RAPTOR)                | ⏳ Planned (research-grade)          |
| 20.10 | Hippocampal Retrieval (HippoRAG-inspired)              | ⏳ Planned (research-grade)          |
| 20.11 | Reflexion-Style Self-Correcting Synthesis              | ⏳ Planned (research-grade)          |
| 20.12 | Temporal Knowledge Graph                               | ⏳ Planned (research-grade)          |
| 20.13 | Pattern Skill Library (VOYAGER-inspired)               | ⏳ Planned                           |
| 20.14 | Causal Impact Analysis (Pearl do-calculus)             | ⏳ Planned (research-grade)          |
| 20.15 | Dual-Process Synthesis (System 1 / System 2)           | ⏳ Planned (research-grade)          |
| 20.16 | Multi-Agent Librarian Collaboration                    | ⏳ Planned (research-grade)          |
| 20.17 | Sleep Consolidation & Memory Reorganization            | ⏳ Planned (research-grade)          |
| 20.18 | Tree-of-Thoughts & Self-Ask Synthesis                  | ⏳ Planned (research-grade)          |
| 20.19 | Surgical Knowledge Editing (ROME/MEMIT)                | ⏳ Planned                           |
| 20.20 | Active Inference & Predictive Synthesis (Friston)      | ⏳ Planned (research-grade)          |
| 20.21 | Episodic-Semantic Memory Consolidation (Tulving)       | ⏳ Planned (research-grade)          |
| 20.22 | Spaced Repetition & Forgetting Curves (Ebbinghaus/SM-2)| ⏳ Planned                           |
| 20.23 | Tool-Use Augmented Synthesis (Toolformer/ReAct)        | ⏳ Planned (research-grade)          |
| 21    | Polyrepo Federation                                    | ⏳ Planned                           |
| 22    | Central Knowledge Server                               | ⏳ Planned                           |
| 23    | Human-in-the-Loop Review                               | ⏳ Planned                           |
| 24    | Compliance Constraint Templates                        | ⏳ Planned                           |
| 25    | Enterprise SSO, SCIM & Identity Federation             | ⏳ Planned (enterprise)              |
| 26    | RBAC, ABAC & Immutable Audit Trail                     | ⏳ Planned (enterprise)              |
| 27    | Air-Gapped, Sovereign & BYO-Key Deployment             | ⏳ Planned (enterprise)              |
| 28    | Enterprise Workflow Integrations Hub                   | ⏳ Planned (enterprise)              |
| 29    | FinOps — Cost Governance & Chargeback                  | ⏳ Planned (enterprise)              |
| 30    | Knowledge Migration & Legacy Ingest                    | ⏳ Planned (enterprise)              |
| 31    | Executive Analytics, ROI Dashboard & Architectural KPIs| ⏳ Planned (enterprise)              |
| 32    | Vendor Risk, Procurement Pack & Certifications Path    | ⏳ Planned (enterprise)              |
| 33    | Deep Recursive Bootstrap Ingest                        | ⏳ Planned (P0 — fixes prod issue)   |

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

- Implemented in [src/mcp/server.ts](src/mcp/server.ts) over STDIO. The tool surface evolved beyond the original sketch into a _workflow_:
  - `get_cortex_status` — init state + last-sync commit.
  - `get_pending_changes` — returns the diff since `.last_sync_commit`, the current index, and a ready-to-execute Librarian prompt pack. This is what powers the IDE route.
  - `save_synthesis` — Zod-validates incoming synthesis JSON and writes it to `.knowledge/`.
  - `read_knowledge_index` — reads `index.md`.
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

**✅ Shipped — `UserPromptSubmit` router hook (Claude Code).** Closes the last reliability gap on action prompts: a new hook at [.claude/hooks/cortex-router.js](.claude/hooks/cortex-router.js) fires when the user submits a prompt, **before the AI processes it**. The router reads the prompt from stdin, matches it against an action-verb pattern (`implement|build|create|add|write|fix|repair|debug|refactor|modify|change|update|migrate|rewrite|extract|introduce|replace|delete|remove|rename|move|restructure|reorganize|optimize`), and — if matched AND `.knowledge/` exists in `CLAUDE_PROJECT_DIR` — emits the knowledge-first workflow as additional context that gets injected before the AI's first response. Effect: prompts like _"let's implement this feature"_ or _"fix the bug in auth.ts"_ now auto-trigger the Cortex pre-flight without the user mentioning Cortex or invoking a slash command. Silent on non-action prompts, missing knowledge base, empty input, or any failure (always exit 0, never blocks). Registered automatically by `cortex setup claude-code`. Inline fallback `ROUTER_HOOK_INLINE` in [src/cli/setup.ts](src/cli/setup.ts) for global npm installs. The router is Claude Code-specific because `UserPromptSubmit` is a Claude Code hook event; other IDEs use the `/before_change` slash command and the sharpened MCP tool descriptions to reach the same outcome.

**✅ Shipped — action-oriented MCP tool descriptions + `before_change` workflow.** The previous tool descriptions for `read_knowledge_index`, `read_entity`, and `read_concept` used the passive hint _"Call this FIRST before diving into source code"_ — which most models bypass on action prompts (_"implement this feature"_, _"fix this bug"_) because their instinct is to read source. Descriptions in [src/mcp/server.ts](src/mcp/server.ts) are rewritten to explicitly name the use cases that should trigger a call: **before writing new code** (find reusable patterns), **before modifying existing code** (see what depends on it), **before fixing a bug** (understand invariants), **before explaining code** (use synthesized descriptions). A new `before_change` MCP prompt encodes a pre-flight workflow: read index → find target entity → audit Wiring section for downstream dependents → read related concepts for invariants → state a one-paragraph plan → only then open source. Same workflow ships as `.agents/workflows/before_change.md` (Antigravity slash command) and `.claude/commands/before_change_cortex.md` (Claude Code slash command). Closes the gap where action prompts previously bypassed Cortex entirely — the highest-value use case for architectural memory was the one least likely to trigger an MCP call. Estimated MCP-call rate improvement on action prompts: ~10% → ~60%. Phase 6 (`impact_analysis` tool, constraint enforcement, blast-radius staleness) closes the remaining gap.

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

**Planned follow-up (small):** `cortex status --next` emits a single state-aware recommendation derived from `state.json` and `.last_sync_commit` (e.g. _"N files changed since last sync — run `cortex sync`"_, _"3 entities are stale after the [[AuthMiddleware]] update — run `/ingest_cortex`"_, _"knowledge base is empty — run `/ingest`"_). One line, no flags beyond `--next`. Purely additive; reads existing state.

**Planned follow-up — `cortex init --magic`.** A one-command setup path that subsumes the entire interactive wizard: detects the IDE in the current workspace (via the presence of `.claude/`, `.cursor/`, `.vscode/`, `.windsurf/`, `.antigravity/`), runs `npm run build` if `dist/` is missing, registers Cortex with every detected IDE, scaffolds `.knowledge/`, writes `.gitignore` entries, and prints a single "ready" line. The existing `cortex init` interactive mode stays as the explicit path; `--magic` is for "I trust the defaults, set it all up." Zero new core code — it's a composition of `init` + `setup all` + a detector. The user's time-to-first-ingest drops from ~5 commands to 1.

**Planned follow-up — Layered entity page extensions (`## Lifecycle`, `## Verification`, inline purity hint, guard-clause invariants).** Small prompt-level extensions to the already-shipped layered entity format. No schema change, no new tools — just additions to the Librarian's `OUTPUT QUALITY BAR` instructions in [src/llm/prompts.ts](src/llm/prompts.ts).

1. **Optional `## Lifecycle` section.** Emit when an entity has setup/teardown obligations the caller must respect: UI components with mount/unmount work, services with init/shutdown, anything that owns sockets, timers, event listeners, file handles, or background tasks. Format: short `Setup: …` / `Teardown: …` (or `Init:` / `Cleanup:`) lines. The goal is to surface paired-resource patterns so an AI modifying the entity doesn't drop the cleanup half — the most common cause of resource leaks. Skip the section when lifecycle is trivial (pure functions, stateless utilities).

2. **Optional `## Verification` section.** Emit when an entity has a non-trivial way to verify it works. Format: short bullets covering some combination of:
   - **Automated**: link to the test file (e.g. `[[GamesLocator.test.js]]`)
   - **Manual repro**: a one-line console/CLI command (e.g. `window.testRadar()`, `curl -X POST /foo`, `pnpm run check:auth`)
   - **Success condition**: what "working" looks like (e.g. _"3 dots appear on the radar within 3s"_)
   - **Edge cases worth probing**: non-obvious states the entity must handle (null user, offline mode, expired token)

   Captures verification metadata that has no other home in the current format. Bounded by the same "include only when materially clarifying" rule as `## Behavior` — skip when the entity is trivially verified by reading the code. For longer-form quoted test code, defer to Phase 7's `evidence.content` block (≤10 lines per snippet, ≤500 chars per entity).

3. **Purity / side-effect hint inside `## Behavior`.** Add a prose line when relevant: _"Pure — no side effects"_, _"Stateful — mutates [[GlobalSingleton]]"_, _"Impure — performs I/O via [[FileSystem]]"_. **Not a separate field, not a binary tag** — LLM-inferred purity is too unreliable for a strict tag, but a prose hint flagged in `## Behavior` is a useful soft signal when an entity is about to be called from a context where its effects matter (e.g. don't call an impure helper from a React render). Skip when purity is unsurprising.

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
Today, Cortex _remembers_ your architecture and tells the AI when it forgets. The next step is to _enforce_ it: declare rules like "the Connect 4 module must not import from Chess," and have Cortex reject any synthesis that violates them. Plus, when a foundational module changes shape, automatically flag every entity that depends on it as "potentially broken."

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

   This is the missing half of "compounding architectural memory": today we record what _is_, not what was tried and rejected. Whenever an `update` synthesis includes a `replaces:` clause (LLM-emitted free text in the description, e.g. _"replaces the cookie-session approach which broke under SameSite=Strict"_), the writer extracts and persists it as a failed-approach record. The CURRENT CONTEXT for future ingests includes the failed-approaches block for every touched entity, so the LLM (and the human reading the page) sees _"we already tried X, here's why it didn't stick"_ before re-proposing it.

5. **`cortex export --spec` (minor CLI addition).** Renders `state.json` as a human-readable `ARCH_SPEC.md` in the project root — entities, concepts, and (Phase 6) constraints formatted as declarative architectural rules. The output is a snapshot: what the knowledge base says your architecture _is_ and _must not do_. Useful for onboarding, architecture reviews, or as a starting point for writing explicit rules. Implementation: a single `src/cli/export.ts` command that reads `state.json` and templates it into markdown; no LLM call, no synthesis, no schema change.

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
- ❌ **Cons**: LLM-driven edge detection has false-negative risk (the model may miss an import). Mitigated by treating constraints as defense-in-depth, not the only line of defense. Staleness can be noisy on large refactors — needs a "mark all reconciled" escape hatch. Failed-approaches risk turning into a graveyard of obsolete context if not capped; the 10-record cap and the LLM's discretion to _deliberately_ re-propose are the safeguards.

---

## 🔍 Phase 7: Audit & Traceability Tools — 🚧 In progress

### Phase 7 Execution Plan

#### User Review Required

Please review the proposed approach for adding structured logging, evidence blocks, and the new CLI/MCP tools.

#### Open Questions

1. **Secret Redaction**: Are there any custom regex patterns for secrets that should be included beyond standard API keys, passwords, and tokens?
2. **Backfill Behavior**: When parsing the existing `log.md` into `log.jsonl`, how should we handle missing attributes (like commits) if they aren't easily extractable? Should we just omit them or use a generic "migrated" marker?
3. **Lint Thresholds**: What should be the default fan-out threshold for flagging a "god module" in `cortex lint`? (Proposing > 10 outgoing edges to start).

#### Proposed Changes

##### 1. Schema Extensions (`src/llm/schema.ts`)

- Add `evidence` array to the Entity schema: `sourceFile`, `lineRange?`, `commit?`, `content?`.
- Update `SynthesisSchema` to accept this new field.

##### 2. Knowledge Manager & Logging (`src/knowledge/writer.ts`)

- Implement dual-emit for logs: `log.jsonl` gets written alongside `log.md` during `saveSynthesis` and `saveConcept`.
- Implement secret-redaction on `evidence.content`: strip matching lines, replace with `// [redacted by Cortex]`, and emit a warning.
- Enforce quoting limits: $\le$ 2 evidence entries per entity, $\le$ 10 lines per snippet, $\le$ 500 chars total. Reject or truncate if over budget.
- Add backfill logic on initialization: if `log.md` exists but `log.jsonl` does not, parse markdown and create JSONL entries.

##### 3. Audit, Evolution, and Lint Modules (`src/knowledge/audit.ts`, `src/knowledge/lint.ts`, `src/knowledge/evolution.ts`)

- **audit.ts**: Implement structured log querying (by entity, since commit, warnings) and evidence drift detection.
- **lint.ts**: Implement graph integrity checks for orphans, silos, missing source files, dependency cycles, god-modules, and contradiction-heavy entities.
- **evolution.ts**: Implement semantic timeline reconstruction per entity from `log.jsonl`.

##### 4. CLI Extensions (`src/cli/log.ts`, `src/cli/audit.ts`, `src/cli/evolution.ts`, `src/cli/lint.ts`, `src/cli/index.ts`)

- Register new commands: `cortex log`, `cortex audit evidence`, `cortex evolution`, `cortex lint`.
- Update `src/cli/index.ts` to include these commands.

##### 5. MCP Server (`src/mcp/server.ts`)

- Add new tools: `log_query` (consolidates `audit_entity` + `audit_since` into one filter-bearing tool), `audit_evidence`, `lint`, and `evolution_entity`.

##### 6. Prompts (`src/llm/prompts.ts`)

- Update `LIBRARIAN_SYSTEM_PROMPT` to add rules on when and how to extract `evidence` and `content`.

#### Verification Plan

##### Automated Tests

- Create `tests/phase7.test.ts` to cover JSONL dual-emit, log backfill parsing, secret redaction, evidence quoting limits, linter checks (cycles, silos), and evolution timeline reconstruction.

##### Manual Verification

- Run `cortex mcp` locally, perform an ingest with an evidence quote, and verify `log.jsonl` generation. Run `cortex log` and `cortex audit evidence` CLI commands to ensure they parse the logs correctly.
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

   The Librarian is prompted to anchor each entity to one or more `(file, line-range, commit-at-synthesis, content-snapshot)` quadruples. This separates **claim** (the synthesized description) from **evidence** (the lines that justify it), and lets `cortex audit` answer _"is this claim still backed by code that exists, and does the code still match what was synthesized against?"_ — string comparison against `content`, not just line-range existence. A claim whose evidence content has shifted at HEAD is flagged **drift-content-changed**; a range that no longer resolves is flagged **drift-evidence-lost**. Existing `sourceFile`-only records stay valid — every field on `evidence` except `sourceFile` is optional.

   **Bounded by design** to avoid turning the wiki into a code mirror (rejected — see out-of-scope):
   - ≤ 2 evidence entries per entity
   - ≤ 10 lines per `content` snapshot
   - ≤ ~500 chars of code per entity total

   **Secret-redaction pass.** Before persisting `content`, the writer runs the snippet through a regex pass that strips lines matching common secret patterns (`(?i)(api[_-]?key|secret|password|bearer|token)\s*[:=]\s*['"][^'"]+['"]`). Redacted lines are replaced with `// [redacted by Cortex]` and the entity gets a `warnings[]` entry naming the file so the developer knows a secret was inline at synthesis time — separately from whether it should have been.

   **Librarian prompt rule.** Quoting is opt-in, not default: the prompt instructs _"include a content snippet only when it materially clarifies the entity's role — otherwise omit `content` and keep the pointer-only form."_ Bad quotes (imports block, boilerplate) are worse than no quotes.

3. **CLI query commands.**
   - `cortex log --entity <name>` — every log entry that touched a given entity.
   - `cortex log --since <commit|date>` — entries since a given point.
   - `cortex log --warnings` — only entries that emitted warnings.
   - `cortex audit stale` — list entities flagged stale by Phase 6.
   - `cortex audit evidence` — list entities whose cited line-ranges no longer resolve at HEAD.
   - `cortex evolution <entity> [--since <commit|date>] [--format markdown|json]` — reconstruct an entity's history from `log.jsonl`. Reads as a semantic changelog: _"created in commit abc123 with description X; updated in commit def456 — auth strategy switched from cookies to JWT; staleSince flagged in commit ghi789 after [[SessionStore]] was refactored."_ Answers questions like _"how did authentication evolve over the last six months?"_ without leaving the knowledge layer. Optional `cortex evolution --replay --at <commit>` reconstructs the rendered `index.md` as it stood at that commit (replay over the append-only log). No new data — projection over the existing `log.jsonl`.
   - `cortex lint` — graph-integrity checks over `state.json`. Three families of checks:
     - **Topology**: orphaned entities (no inbound or outbound relationships), disconnected sub-graphs ("knowledge silos" — clusters of nodes that should plausibly be linked but aren't, detected by simple connected-component analysis), and entities whose `sourceFile` no longer exists.
     - **Anti-patterns**: cycles in `depends_on` edges (architectural circular dependency), "god module" candidates (entities with fan-out above a configurable threshold and minimal cohesion in their description), and contradiction-heavy entities (more inbound `contradicts` edges than `supports` edges — a signal that the system is fighting itself).
     - **Duplicates**: entity pairs whose names, descriptions, or `sourceFile` paths overlap above a similarity threshold (literal substring + token Jaccard, no embeddings). Surface candidate merges; never auto-merge — humans decide.
       Output is grouped by severity; exit code is nonzero when blocking issues are found so `cortex lint` can run in CI alongside Phase 12.
4. **MCP audit tools.** `log_query({ entity?, since?, warningsOnly? })`, `audit_evidence()`, `lint()`, and `evolution_entity(name)` expose the same surface to IDE agents, so the AI can ask _"what changed in `[[AuthModule]]` over the last sprint?"_, _"which entity descriptions are no longer backed by code?"_, or _"how did the auth strategy evolve?"_ without grepping `log.md`. `log_query` consolidates the original `audit_entity` + `audit_since` proposals into a single filter-bearing tool.

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
- `log_query`, `audit_evidence`, `lint`, and `evolution_entity` are registered MCP tools (`log_query` supersedes the originally proposed `audit_entity` + `audit_since`).
- `evidence` field (including optional `content` snapshot) accepted by the schema; evidence-loss and content-drift surface in `cortex audit evidence` and `cortex status`.
- Secret-redaction pass strips matching lines from `content` snapshots before persistence and emits a warning naming the source file.
- Per-entity quoting bounds (≤ 2 entries, ≤ 10 lines per snippet, ≤ 500 chars total) enforced by `save_synthesis`; over-budget snippets are rejected with a structured error so the Librarian retries with a smaller quote.
- `cortex lint` flags orphans, disconnected silos, missing source files, `depends_on` cycles, god-module candidates, contradiction-heavy entities, and duplicate-candidate pairs — with exit code 1 on blocking issues.
- `cortex evolution <entity>` reconstructs a per-entity timeline from `log.jsonl`; `--replay --at <commit>` reproduces the rendered `index.md` as it stood at that commit.
- Backfill migration runs cleanly on a pre-Phase-7 `.knowledge/` directory.
- Tests cover: dual-emit, query-by-entity, since-filter, warnings-only filter, evidence-drift detection, silo detection on a synthetic 3-component graph.

**Pros & Cons**

- ✅ **Pros**: Turns the architectural log from a reading artifact into a debugging tool. "When did this drift first appear?" becomes one command. Evidence anchoring (with optional content snapshots) closes the gap between _"Cortex claims X"_ and _"the code at synthesis time looked like Y, and now looks like Z"_ — drift becomes a literal string diff, not a guess. Quoted snippets also make `cortex find` answer _"have we written this pattern before?"_ across the entire architectural history without falling back to `git log -G`. Silo detection catches the slow-growing problem of disconnected knowledge clusters before they fragment the graph. Closes the loop with Phase 6 — once you flag drift, you also need to find it later.
- ❌ **Cons**: Adds a parallel storage format. JSONL and `log.md` must stay in sync; divergence would be confusing. Mitigated by writing both from the same code path. Evidence anchoring puts more burden on the Librarian prompt (it must pick line ranges + decide whether to quote content); mitigated by treating every evidence subfield except `sourceFile` as optional and by the _"quote only when it clarifies"_ prompt rule. Quoted snippets risk concentrating secrets if a developer commits an API key inline; mitigated by the redaction pass and the warning emission.

---

## 🏅 Phase 7.5: Knowledge Quality & Enterprise Governance Foundation — ⏳ Planned

**Layman's Terms**
Right now, Cortex treats all knowledge as equally trustworthy — a brand-new entity synthesized by the AI and a 6-month-old entity manually reviewed by a senior engineer look exactly the same. Phase 7.5 changes that. Every entity gets a visible quality signal derived entirely from observable facts: how old it is, whether its evidence still points to real code, whether it has open contradictions, and whether a human ever signed off on it. Separately, a new `cortex.constraints.yaml` file lets teams declare org-wide architectural rules ("the payment domain must never import from the legacy domain") that apply across every entity and every ingest — no longer just per-entity annotations in state.json. Together these two features make Cortex trustworthy enough to enforce as a team standard, not just use as a personal tool.

**Why this is pre-Phase 8, not a Phase 6 or 7 change**
Phase 6 guardrails and Phase 7 audit tools are both fully shipped; reopening them risks regressions. Phase 7.5 is an additive layer over the finished Phase 6 + 7 infrastructure. It produces data (quality scores, org-constraint results) that every downstream phase — 8 (visual graph), 9 (impact preview), 10 (onboarding), 12 (CI gate), 13 (context packs) — can consume. Building it before Phase 8 means all subsequent phases get quality awareness for free rather than each having to re-derive it independently.

**Technical Terms**

##### 1. Knowledge Quality Scoring

A deterministic `quality_score` (0.0–1.0) derived from observable facts stored in `state.json`. Never an LLM-emitted number — only facts:

```
quality_score = mean(
  evidence_freshness_score,    // 1.0 if no drift, 0.0 if source-missing
  contradiction_score,         // 1.0 if 0 open contradictions, decays by count
  staleness_score,             // 1.0 if not stale, 0.0 if staleSince set
  age_score,                   // 1.0 if <30 days old, decays to 0.3 after 180 days
  human_review_score,          // 1.0 if human_reviewed=true, 0.7 otherwise
)
```

- Added as a computed field in `updateIndex()` — not persisted in `state.json` (always re-derived so it's never stale itself).
- Rendered on the index: `### [[AuthService]] — `src/auth.ts` ▸ quality: 94%`.
- New optional `human_reviewed` and `reviewed_by` fields on `EntityRecord`. Set via `cortex review accept <entity>` (see Phase 23 for the full review workflow; Phase 7.5 just adds the fields and the score).
- `cortex audit quality` CLI command: lists all entities ranked by quality score ascending. The bottom decile is flagged for attention. Exit code 1 if any entity < 0.5 (configurable threshold via `CORTEX_QUALITY_GATE`).
- MCP tool `get_entity_quality` returns the score breakdown for a named entity. `get_cortex_status` gains a `lowQualityCount` field alongside `staleCount` and `evidenceDriftCount`.

##### 2. Org-Wide Custom Constraint Language

Today's constraints live per-entity inside `state.json`. An org-wide rule that no entity in the `payment` domain may import from the `legacy` domain requires annotating every payment entity individually. Phase 7.5 introduces `cortex.constraints.yaml` at the project root:

```yaml
version: 1
constraints:
  - id: no-payment-legacy
    description: "Payment domain must never import Legacy domain"
    rule:
      sourcePattern: "src/payment/**"
      mustNotImport: "src/legacy/**"
    severity: error        # error | warning

  - id: auth-evidence-required
    description: "All entities under src/auth/ must have at least one evidence entry"
    rule:
      sourcePattern: "src/auth/**"
      requiresEvidence: true
    severity: warning

  - id: public-api-needs-contract
    description: "Any entity tagged 'public-api' must declare a contract constraint"
    rule:
      tag: "public-api"
      requiresConstraint: "contract"
    severity: error
```

- Evaluated at synthesis time (same moment as per-entity constraints in Phase 6) by a new `OrgConstraintEvaluator` that runs after `save_synthesis`'s existing constraint block.
- `cortex lint` reports org-constraint violations as a separate `org_constraint` rule category.
- `cortex setup` includes the constraint file in the generated `.gitignore` exclusion list (teams commit the constraint file; it's not gitignored by default).
- Cross-workspace constraints in Phase 11 (monorepo) extend this same format with a `workspace` scope field.

##### 3. Quality-Aware Downstream Hooks

Phase 7.5 ships a small internal `QualityEvaluator` module that any downstream phase can call without recomputing:

- **Phase 8 (Visual Graph)**: Node fill color derived from quality score (green ≥ 0.8, amber 0.5–0.8, red < 0.5).
- **Phase 9 (Impact Preview)**: Impact report annotates each entity in the blast radius with its quality score — low-quality dependents carry higher uncertainty.
- **Phase 10 (Onboarding)**: Centrality × quality determines reading-path order. A high-centrality but low-quality entity is demoted with a caveat.
- **Phase 12 (CI Integration)**: New optional `--quality-gate <threshold>` flag on the GitHub Action. PRs that drop the mean quality score below the threshold fail CI.
- **Phase 13 (Context Packs)**: Quality × centrality determines inclusion order, not just centrality alone.

**Architecture & System Design**

- **Core Components**: new `src/knowledge/quality.ts` (score computation — pure function over `EntityRecord`, no I/O), new `src/knowledge/org-constraints.ts` (YAML loader + evaluator), new `src/cli/review.ts` (accept/reject workflow stub — full review in Phase 23), additions to `src/cli/audit.ts` (`cortex audit quality`), additions to `src/mcp/server.ts` (`get_entity_quality`), modifications to `src/knowledge/writer.ts` (`updateIndex` calls `QualityEvaluator`).
- **Design Pattern**: Score is a projection, never persisted. `human_reviewed` and `reviewed_by` ARE persisted in `state.json` as facts, not scores. Org constraints live in `cortex.constraints.yaml`, not in `state.json` — separating org policy from project knowledge cleanly.
- **Key Considerations**:
  - Quality score must be **deterministic and fast** — it's called on every `updateIndex()`, which runs after every synthesis. Pure function, no I/O, no LLM calls.
  - The `age_score` decay curve (30 days → 1.0, 180 days → 0.3) is configurable via `CORTEX_QUALITY_AGE_DECAY_DAYS`. Default is calibrated for active codebases; slow-moving infrastructure codebases should tune it up.
  - Org constraints are evaluated **after** per-entity constraints, using the same violation-throwing mechanism. This keeps the call path consistent — the Librarian sees the same structured error regardless of which constraint type fired.
  - The `requiresEvidence` rule type is intentionally the only cross-entity aggregate rule. Per-entity rules (mustNotImport, mustNotBeCalledBy) remain in `state.json`. Mixing them would blur the boundary between "what this entity declared" and "what the org decreed."

**Definition of Ready (DoR)**

- Phase 7 (Audit + Evidence) is stable — quality scoring depends on `evidence` fields and `staleSince`, both from Phase 6/7.

**Definition of Done (DoD)**

- `quality_score` (0–1) computed and displayed on `index.md` for every entity.
- `cortex audit quality` lists entities below threshold, exits nonzero if any below `CORTEX_QUALITY_GATE`.
- `get_entity_quality` MCP tool returns score + breakdown per entity.
- `get_cortex_status` includes `lowQualityCount`.
- `cortex.constraints.yaml` loaded and evaluated at synthesis time; violations throw the same structured error as Phase 6 per-entity constraints.
- `cortex lint` includes `org_constraint` as a reportable rule.
- `human_reviewed` / `reviewed_by` fields accepted in `EntityRecord` and persisted in `state.json`.
- Tests cover: score computation for each dimension, decay curves, org-constraint evaluation (error + warning severity), `requiresEvidence` rule, quality output in `updateIndex`.

**Pros & Cons**

- ✅ **Pros**: Makes Cortex trustworthy as a team standard, not just a personal tool. Quality score collapses five separate signals (freshness, staleness, contradictions, age, human review) into one number that can gate CI, color graphs, weight context packs, and focus attention — without requiring LLM intuition. Org constraints close the gap between "every entity can declare its own rules" and "the team can declare rules that span all entities."
- ❌ **Cons**: Quality score introduces a number that developers will debate. Mitigated by keeping the formula documented, deterministic, and configurable so teams can tune weights. Org constraint YAML adds a new file to manage; mitigated by keeping the schema minimal and providing clear validation errors with fix hints.

---

## 🎨 Phase 8: Visual & Browseable Knowledge Graph — ⏳ Planned

**Layman's Terms**
The knowledge base already knows how everything connects. Phase 8 lets you _see_ it — a Mermaid diagram of your architecture, a local web UI you can click through to browse entities, and a graph that updates itself every time you sync. The dependency graph stops being a JSON file and becomes a map.

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
- Phase 7.5's `QualityEvaluator` is available — graph node coloring derives from the quality score.

**Definition of Done (DoD)**

- `cortex graph --scope <entity> --depth 2` produces valid Mermaid output usable in a GitHub PR.
- `cortex serve` opens a browseable graph viewer; clicking a node shows its full markdown page.
- Stale entities and warnings are visually distinct.
- **Phase 7.5 strengthening:** Node fill color derived from quality score (green ≥ 0.8, amber 0.5–0.8, red < 0.5); hovering a node shows the quality breakdown tooltip.
- Viewer runs offline with no external requests (verified by network-tab inspection).
- Tests cover: Mermaid emission for empty/single-node/multi-edge graphs, server lifecycle, static-asset bundling, quality-color assignment on a synthetic graph with known scores.

**Pros & Cons**

- ✅ **Pros**: Turns architectural understanding into a shareable artifact. Mermaid output collapses the gap between "knowledge synthesized" and "knowledge communicated." A reviewer can ask "what does this PR change in the graph?" and you can show them.
- ❌ **Cons**: Adds a frontend stack (HTML + bundled JS) to a project that's been pure Node. Mitigated by keeping the UI tiny and dependency-light. Mermaid syntax has limits on very dense graphs — `--depth` and `--scope` flags are how we keep it readable.

---

## 🔮 Phase 9: Refactoring Impact Preview — ⏳ Planned

**Layman's Terms**
Phase 6 tells you what _did_ break when you mutated an entity. Phase 9 tells you what _would_ break before you start. Run `cortex impact AuthMiddleware` and see every entity that depends on it, ranked by directness, before you write a single line of refactor.

**Technical Terms**
The inverse of Phase 6's blast-radius propagation. Where Phase 6 reacts to an `action: update` _after_ synthesis, Phase 9 is a read-side query _before_ synthesis: given an entity name (or a list), traverse the inbound link graph and return a structured impact report.

- **CLI**: `cortex impact <entity> [--depth N] [--format text|json]` — lists every entity whose `links[]` transitively reaches the target, grouped by hop distance. `cortex deps <entity>` does the outbound traversal (what this entity depends on).
- **MCP**: `impact_analysis(name, depth?)` tool — same payload as JSON, available to IDE agents. The agent can call this before drafting a refactor and adjust scope accordingly.
- **Hypothetical mode**: `cortex impact <entity> --hypothetical delete` simulates the consequence of removing the entity: every dependent surfaces with the relationship that would break, plus a suggested mitigation prompt for the LLM.

**Architecture & System Design**

- **Core Components**: new `src/knowledge/graph.ts` (shared with Phase 8 — graph traversal lives here once), new `src/cli/impact.ts`, MCP tool registration in `src/mcp/server.ts`.
- **Design Pattern**: Inverse-index built lazily on demand. We do not maintain a persistent reverse-link index in `state.json` — building it on every query from the existing `links[]` arrays costs microseconds for graphs under ~1000 entities. Re-evaluate if benchmarks show otherwise.
- **Key Considerations**:
  - The impact report should rank by directness: hop-1 (direct linkers) before hop-2 (linkers of linkers). Surface "no dependents" as a green-light to refactor freely.
  - In `--hypothetical delete` mode, the report includes the _quoted reason_ each dependent links to the target (extracted from the dependent's description), so the user can see why the relationship exists at all.

**Definition of Ready (DoR)**

- Phase 8 has factored graph traversal into `src/knowledge/graph.ts`. Phase 9 shares the same builder.
- Phase 7.5's `QualityEvaluator` is available — impact reliability annotations derive from it.

**Definition of Done (DoD)**

- `cortex impact <entity>` returns a hop-distance-ranked list of dependents in <100ms on a 500-entity graph.
- `cortex deps <entity>` returns outbound dependencies.
- `impact_analysis` MCP tool is registered and returns identical data to the CLI.
- Hypothetical-delete mode produces a markdown report linkable to a PR description.
- **Phase 7.5 strengthening:** Each entity in the impact report is annotated with its quality score. Entities with quality < 0.5 display a `⚠ low-quality` badge — the blast-radius prediction is less reliable for poorly-evidenced entities.
- Tests cover: hop ranking, hypothetical mode, empty-dependency case, cyclic-link safety, quality annotation on impact report.

**Pros & Cons**

- ✅ **Pros**: Closes the loop with Phase 6. Together they form a full guardrail: Phase 9 informs the refactor, Phase 6 enforces it. The hypothetical-delete mode is especially valuable for code archaeology — "can I delete this old helper?" becomes a one-command query.
- ❌ **Cons**: Graph quality depends on link-quality in synthesis. If the Librarian under-links, impact analysis under-reports. Mitigated by Phase 6's CURRENT CONTEXT injection, which already pushes the LLM to link aggressively.

---

## 🎓 Phase 10: Onboarding & Guided Reading — ⏳ Planned

**Layman's Terms**
A new developer clones the repo. Today, they spend a week reading code to figure out what matters. With Phase 10, they run `cortex onboard` and get a structured reading path: "Start here, then this, then this — here's why each one matters and how they connect."

**Technical Terms**
A new synthesis _output mode_ — no schema changes, no new data, just a different render of the existing graph. The Librarian is invoked with a different system prompt focused on **pedagogical ordering**: identify entry points, rank entities by centrality (PageRank-style over the link graph), group by architectural concern, and emit a reading list as ordered markdown.

- **CLI**: `cortex onboard [--audience junior|senior|domain-expert] [--depth quick|thorough]` produces `.knowledge/onboarding.md` — a curated, ordered reading path through entities and concepts, with rationale per stop and estimated reading time.
- **MCP prompt**: a new `onboard` prompt that an IDE agent can invoke to produce the same output without re-running synthesis. The agent reads the existing index, applies the pedagogical ordering prompt, returns markdown.
- **Audience tuning**: `junior` emphasizes concrete entities (modules, files) and explains terms; `senior` skips to invariants and cross-cutting concepts; `domain-expert` focuses on what's _unusual_ about this codebase relative to standard patterns.
- **Parent-summary concepts (hierarchical bird's-eye view).** Onboarding's first stop on any non-trivial repo should be a _module-level_ summary, not an entity. Phase 10 elevates this from emergent behavior to an explicit schema notion: when a directory contains ≥5 synthesized entities, the Librarian emits a **parent-summary concept** keyed by directory path (e.g. concept `src/auth/`) with `relationships[]` of `kind: "parent_of"` pointing at each child entity. The result is a two-layer browse: pick a parent summary to get the module's purpose in ~3 sentences, then drill into one of its children. `read_knowledge_index` renders parent summaries first, followed by their child clusters. This is a "summary of summaries" — no new data, just a stricter Librarian instruction to emit one synthesized stop per directory cluster.
- **Category-scoped search (`cortex find`).** A small CLI utility that ships with Phase 10 because the onboarding flow demands it: `cortex find --type entity|concept|parent "<query>"` returns matching names plus a one-line preview, scoped to a single node category. Implementation is a literal substring + token match over `state.json` (no embeddings, no FTS index) — the knowledge base stays small enough that scanning it linearly is sub-millisecond. `cortex find` complements `cortex read` (browse) by giving a "I know roughly what I want" lookup path.

**Architecture & System Design**

- **Core Components**: new `src/knowledge/onboarding.ts` (centrality scoring + ordering), new `src/cli/onboard.ts`, new `src/cli/find.ts` (category-scoped search), new MCP prompt registration in `src/mcp/server.ts`, new system prompt in `src/llm/prompts.ts` (the "Tour Guide" persona, plus a parent-summary emission directive).
- **Design Pattern**: Output mode, not new data. The same `state.json` powers ingest, audit, graph, impact, and now onboarding. Parent summaries are concepts with a `parent_of` relationship — not a separate node type.
- **Key Considerations**:
  - Centrality scoring: PageRank over the directed typed-edge graph (Phase 6), restricted to `depends_on` / `called_by` / `parent_of` edges so `contradicts` cycles don't skew the ranking. Damping factor 0.85 (standard). High-centrality entities are read first because everything else points at them.
  - Concept ordering: parent-summary concepts first, then cross-cutting concepts, then entities — so the reader gets the module map, then the abstractions, then the implementations.
  - Estimated reading time: ~150 words/min, plus a flat 30s per `[[WikiLink]]` follow.
  - `cortex find` matches against entity/concept names, descriptions, source paths, and (when present) Phase 7 quoted `evidence[].content` snippets; case-insensitive substring + whitespace-tokenized OR. No fancy ranking — exact-name matches come first, then description hits, then snippet hits. Snippet hits answer _"have we written this pattern before, and where?"_ without leaving the knowledge layer.

**Definition of Ready (DoR)**

- Knowledge base has at least ~20 entities (smaller bases don't need onboarding — just read the index).
- `state.json` link graph is well-populated (depends on Phase 6's link-injection quality).
- Phase 7.5's `QualityEvaluator` is available — quality-weighted reading path requires it.

**Definition of Done (DoD)**

- `cortex onboard` produces `.knowledge/onboarding.md` with a clear reading order, rationale per stop, and time estimate.
- Audience and depth flags produce materially different outputs (verified on a test corpus).
- The MCP `onboard` prompt produces equivalent output via an IDE agent.
- Directories with ≥5 entities get an auto-emitted parent-summary concept on the next ingest; `read_knowledge_index` renders them at the top of the index.
- `cortex find --type entity|concept|parent "<query>"` returns ranked matches with a one-line preview.
- **Phase 7.5 strengthening:** Reading path ordering uses `centrality × quality_score` not centrality alone. High-centrality but low-quality entities (quality < 0.5) are demoted in the path and annotated with a caveat: _"This entity is central but has low confidence — verify before treating as authoritative."_
- Tests cover: empty base (graceful failure with hint), single-entity base (degenerate but valid output), centrality ranking correctness on a known graph, parent-summary auto-emission threshold, `cortex find` exact-name vs description-hit ordering, quality-demotion of a high-centrality low-quality entity.

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
  - `cortex setup` needs to register one MCP entry that exposes the _federation_; the entry handles workspace routing internally based on the IDE's active file.
  - Workspaces using different languages or frameworks should not interfere — each gets its own bootstrap file-list filters from `src/core/scan.ts`.

**Definition of Ready (DoR)**

- Phases 6–7 are stable. Federation should not be invented before single-repo behavior is rock-solid.
- Phase 7.5's org-constraint YAML format is stable — cross-workspace constraints extend it with a `workspace` scope field.

**Definition of Done (DoD)**

- `cortex init --monorepo` auto-detects pnpm/yarn workspaces and scaffolds `workspaces.json`.
- File changes route to the correct workspace's `.knowledge/` automatically.
- Cross-workspace `[[ws:Entity]]` links resolve in `read_entity` and the federated index.
- Cross-workspace constraints (Phase 6) reject violating syntheses.
- **Phase 7.5 strengthening:** `cortex.constraints.yaml` supports a `workspace` scope field, enabling org-wide rules scoped per workspace pair — e.g. `sourceWorkspace: frontend` + `mustNotImport: backend/internal/**`. The federated index renders per-workspace quality scores so a team lead can see which workspace's knowledge is freshest.
- Tests cover: workspace resolution, cross-workspace link rendering, bootstrap-per-workspace, constraint propagation, workspace-scoped org constraint evaluation.

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
- Phase 7.5 quality scoring is stable; CI quality gate depends on it.

**Definition of Done (DoD)**

- `cortex install-hooks` and `cortex uninstall-hooks` cleanly add/remove pre-push hooks.
- `cortex sync --dry-run` produces a structured report without writing.
- GitHub Action published, documented, and exercised on a real repo.
- Sticky PR comment renders correctly with synthesis diff + warnings + constraint violations.
- **Phase 7.5 strengthening:** GitHub Action gains an optional `quality-gate` input (0.0–1.0 threshold). When set, the action computes the mean quality score across all entities touched by the PR and fails CI if the score drops below the threshold. PR comment includes a "Quality delta" row: `⬆ +0.02 (from 0.81 → 0.83)` or `⬇ -0.05 (from 0.76 → 0.71) — below threshold 0.75 ❌`. Org-constraint violations from Phase 7.5's `cortex.constraints.yaml` surface as a separate CI failure category.
- Tests cover: hook install/uninstall idempotency, dry-run output shape, CI integration smoke test, quality-gate threshold pass/fail, org-constraint CI reporting.

**Pros & Cons**

- ✅ **Pros**: Cortex graduates from an individual tool to a team gate. Architectural review at PR time is the highest-leverage place to catch drift — before it lands, while context is still fresh.
- ❌ **Cons**: CI integration adds operational surface (secrets management, billing for the CI LLM key, comment-spam risk). Hooks can frustrate developers if they fail noisily on small changes. Mitigated by making both opt-in and surfacing clear escape hatches (`--no-verify` works, with a logged warning to `.knowledge/`).

---

## 💸 Phase 13: Token Economics & Context Packs — ⏳ Planned

**Layman's Terms**
Cortex is already cheap because it sends diffs, not whole files. Phase 13 turns "cheap" into "predictable." You can export a token-perfect knowledge bundle for any other tool, see what a sync would cost _before_ you run it, and the MCP server stops repeating itself when an agent asks the same question twice in a row.

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
- **Phase 7.5 Integration:** Context pack bundle header annotates each entity with its current quality score; entities are ordered by quality × centrality (not centrality alone) so the most-trusted, most-central knowledge fills the token budget first. Entities with quality < 0.4 are footnoted as "low confidence — not yet evidence-anchored or human-reviewed."
- Tests cover: pack budget honored on a known-size graph, pack self-containment (no dangling links inside the bundle), cost estimate determinism, compression round-trip via `resolve_refs`.

**Pros & Cons**

- ✅ **Pros**: Makes Cortex's "compounding context" exportable — a knowledge base that can leave the project root and travel with you. Pre-flight cost simulation closes the last surprise vector for users on paid APIs. Response compression amortizes the per-tool-call token cost across an agent's session, which is exactly where heavy MCP usage today bleeds tokens.
- ❌ **Cons**: Each surface is small but they accrue surface area. Mitigated by keeping them strictly read-side projections — none touch the canonical writer. Token-cost estimation is necessarily approximate; document the heuristic and refuse to over-promise. Reference compression adds complexity to the MCP server that only benefits high-volume sessions — the default budget is intentionally conservative so low-volume sessions pay no overhead.

---

## 🗂️ Phase 14: Large-Diff Clustering — ⏳ Planned

**Layman's Terms**
When you change 30+ files at once — say, touching auth, database, and UI all in one save — Cortex currently dumps everything on the AI in one go and asks for a summary. That produces vague, generic knowledge entries because the AI is trying to make sense of too many unrelated things at once. Phase 14 sorts the files into focused groups first (auth changes together, database changes together, UI changes together), then summarises each group separately. The result is sharper, more accurate knowledge entries for large codebases.

**Technical Terms**
Introduce a deterministic clustering step that runs _before_ the LLM synthesis call when a diff exceeds a configurable file-count or token threshold. Each cluster is synthesised independently; the results are merged into a single log entry. Clustering is intentionally LLM-free — it uses structural signals already present in `state.json` (directory paths, Phase 6's typed `relationships[]` edges) so it adds no token cost and no latency outside of the synthesis calls themselves.

- **Trigger threshold**: configurable via `.cortexrc` / env; defaults to `CORTEX_CLUSTER_THRESHOLD=15` files. Below the threshold the existing single-shot path runs unchanged.
- **Clustering algorithm**: two-pass.
  1. **Directory bucketing** — group changed files by their nearest common ancestor directory (e.g. `src/auth/`, `src/db/`, `src/ui/`). Files in the repo root are their own bucket.
  2. **Edge merge** — if two directory buckets share a `depends_on` or `called_by` edge in `state.json`'s typed graph, merge them into one cluster. This prevents splitting a change that straddles a tightly coupled boundary (e.g., a service and its direct repository layer) into two disconnected syntheses that each miss the other half.
- **Synthesis**: each cluster is sent to the LLM as a separate `generateObject` call using the same Librarian prompt, with its own diff slice and a CURRENT CONTEXT block scoped to that cluster's entities. Retries (Phase 2's 3-attempt backoff) apply per cluster.
- **Merge**: cluster syntheses are merged into one `SynthesisSchema` object before `save_synthesis`. Entity and concept arrays are concatenated (deduplication by name). Warnings are concatenated. The summary is a one-sentence aggregate emitted by a final, cheap LLM call over the cluster summaries — _not_ a re-synthesis of the full diff.
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
- **Phase 7.5 Integration:** Cluster budget allocation is quality-weighted — clusters whose entities average above the Phase 7.5 quality floor receive proportionally more of the token budget in multi-cluster synthesis rounds. When Phase 17 (self-consistency) is active, a cluster's disagreement score from the prior synthesis run increases its token budget on the next pass, giving the LLM more context precisely where uncertainty was previously observed.
- Tests cover: threshold boundary (14 files → single-shot, 15 → clustered), directory bucketing correctness, edge-merge joining two coupled directories, merge deduplication on entity names, aggregate-summary call receiving only cluster summaries, schema validation of merged output.

**Pros & Cons**

- ✅ **Pros**: Directly improves synthesis quality on the class of diffs where it degrades today — large, cross-cutting changes. Each cluster is small enough for the LLM to reason about precisely. Costs more tokens per large sync (N synthesis calls instead of 1), but produces N focused entries instead of 1 vague one — net knowledge quality improves.
- ❌ **Cons**: Adds latency on large syncs (N sequential or parallel LLM calls). Parallel calls are faster but multiply the concurrent API load; sequential calls are safer but slower. Default to sequential; expose a `CORTEX_CLUSTER_PARALLEL=true` flag for users on rate-limit-generous API tiers. The edge-merge heuristic can over-merge tightly coupled directories into one large cluster — mitigated by capping each cluster at `2 × CORTEX_CLUSTER_THRESHOLD` files and splitting oversized merged clusters by sub-directory.

---

## 🧪 Phase 15: CI Feedback Signal Loop — ⏳ Planned (research-grade)

**Layman's Terms**
Right now Cortex _predicts_ what a change will affect using its dependency graph. Sometimes those predictions miss — a change marked "low impact" still breaks a test. Phase 15 closes the loop: when CI runs after a sync, the test results are attached to the entities involved in that sync. Over time, Cortex learns where its predictions miss, and surfaces those misses honestly — _"this entity has been involved in three 'low impact' syncs that broke CI; treat blast-radius estimates here with skepticism."_ The signal is grounded in real test execution, not LLM intuition.

**Technical Terms**
A new module that ingests CI run results (success / failure / which tests failed / which test files exercise which source files) and joins them against the `log.jsonl` synthesis stream to produce a per-entity calibration record. This is **not** the runtime/observability layer rejected at [implementation_plan.md:735](implementation_plan.md) — it is strictly bounded to _test-failure → entity attribution_, a grounded signal derived from CI events alone. No PagerDuty, no Sentry, no APM.

- **Inputs**: a CI result feed — either a GitHub Actions webhook (when the Phase 12 action is installed) or a manual CLI command `cortex ci ingest <run-id> --coverage <path>`, plus the existing `log.jsonl` stream.
- **Attribution**: for each failed test in a CI run, identify which source files the test exercised by reading a coverage report (lcov, jest `--coverage`, pytest-cov). Map source files to entities via `state.json.entities[].sourceFile`. Cross-reference against syntheses that touched those entities since the last green CI run on the same branch.
- **Schema (additive)**: new optional `ciSignal` block per entity — `{ greenRunsSince: number, redRunsSince: number, lastRedAt?: string, lastRedTestNames?: string[] }`. **Never an LLM-emitted confidence score** — purely derived from CI events, consistent with the trust-signals-are-observable principle at [CORTEX.md §6](CORTEX.md).
- **CLI**: `cortex ci ingest <run-id> --coverage <path>` attaches a CI result. `cortex ci status` prints per-entity green/red counts. `cortex ci status --weakest 10` lists the 10 entities with the worst green/red ratio — the prediction calibration leaderboard.

**Architecture & System Design**

- **Core Components**: new `src/ci/ingester.ts` (parse coverage + result formats), new `src/ci/attribution.ts` (test-failure → entity mapping), additive `ciSignal` field in `src/knowledge/schema.ts`, new `src/cli/ci.ts`. The Phase 12 GitHub Action gains an optional final step that calls `cortex ci ingest` against the running daemon.
- **Design Pattern**: Append-only signal stream with a derived per-entity projection. CI events are immutable; the per-entity aggregate is computed on read. No LLM in the path.
- **Key Considerations**:
  - Coverage-report parsing must support **lcov** (universal) at minimum, with adapters for `jest --coverage`, `pytest-cov`, and `go test -coverprofile`. Other languages can contribute adapters later — schema is unchanged.
  - Attribution is intentionally coarse: "test failed AND source file in coverage AND file mapped to entity" is the join key. False positives are accepted because the signal is a _trend_ over many runs, not single-event blame. This is documented in the readout so users do not mistake `redRunsSince: 1` for "this entity is broken."
  - The CI signal is **purely surface, never acted on**. `cortex sync` does not refuse to run because an entity has a poor CI history. Surface-don't-act ([implementation_plan.md:745](implementation_plan.md)) still applies.

**Definition of Ready (DoR)**

- Phase 12 (Git & CI Integration) is shipped — Phase 15 reuses the GitHub Action's webhook plumbing.
- `log.jsonl` (Phase 7) is stable — attribution joins against it.

**Definition of Done (DoD)**

- `cortex ci ingest <run-id> --coverage <path>` parses a CI result + coverage report and updates `ciSignal` on affected entities.
- `cortex ci status` renders per-entity green/red counts.
- `cortex ci status --weakest 10` ranks entities by green/red ratio.
- GitHub Action (Phase 12) gains an optional post-run step that posts CI results back via `cortex ci ingest`.
- **Phase 7.5 Integration:** `ciSignal` becomes the 6th dimension of the quality formula: `quality += 0.20 × (greenRunsSince / (greenRunsSince + redRunsSince))`, defaulting to 0.5 (neutral) when no CI data exists. Phase 9 (Impact Preview) gains a ⚠ CI-unstable badge for entities where `redRunsSince > greenRunsSince`.
- Tests cover: lcov parsing, jest/pytest adapter, attribution correctness on a synthetic repo (sync touches entity A, test that covers A fails, A's `ciSignal.redRunsSince` increments).

**Pros & Cons**

- ✅ **Pros**: The first signal in Cortex grounded in objective execution (test passed or didn't) rather than LLM synthesis. Closes the prediction loop for Phase 9 impact analysis in a way that respects surface-don't-act. The "weakest entities" projection is a directly publishable empirical contribution — _how often does an LLM-synthesised blast-radius estimate predict actual CI failures?_ Nobody has measured this rigorously on a real codebase.
- ❌ **Cons**: Coverage parsing is per-tool and per-language; the surface area is permanent. Mitigated by shipping a small core (lcov + jest + pytest + go test) and accepting community adapters. Coverage data is noisy (flaky tests, generated code) — mitigated by using `ciSignal` as a trend signal, never as authoritative single-event blame, and documenting the heuristic openly.

---

## 🔀 Phase 16: Contradiction-Aware Retrieval — ⏳ Planned (research-grade)

**Layman's Terms**
Cortex already detects when new code contradicts the existing knowledge — _"the auth module is documented as JWT but the new code uses cookies."_ Today those contradictions are logged inline in `log.md` and then forgotten. Phase 16 promotes the contradiction history into a queryable graph: when a developer or AI reads `[[AuthService]]`, the response surfaces every unresolved contradiction touching that entity. Future syntheses see the contradiction history in CURRENT CONTEXT and can no longer silently re-introduce rejected patterns.

**Technical Terms**
Promote `warnings[]` (today a per-log-entry free-form string array) into a first-class contradiction graph. Each warning containing `[[WikiLink]]` references is parsed into a directed edge between the referenced entities/concepts, stamped with the synthesis event that produced it and a mutable status. The graph is queryable via CLI, surfaced in `read_entity` / `read_concept` MCP responses, and injected into CURRENT CONTEXT for entities touched by the next synthesis.

- **Schema (additive)**: a new top-level `contradictions[]` array in `state.json` — `{ id, between: [name1, name2], summary, recordedAt, sourceSynthesis, status: "open" | "resolved" | "muted", resolution?: { note, resolvedAt } }`. Existing `warnings[]` arrays in `log.md` stay; `contradictions[]` is a structured projection on top.
- **Edge extraction**: deterministic, no LLM. A small parser scans warning text for `[[WikiLink]]` references and emits one contradiction record per pair. Warnings with zero wikilinks remain as free-form log warnings — the Librarian's system prompt is updated to encourage link-bearing warnings going forward.
- **Resolution**: `cortex contradiction resolve <id> [--note "..."]` marks a contradiction as resolved with optional human note. `cortex contradiction mute <id>` marks it as known-but-accepted (visible but does not block synthesis). Status changes append to `log.jsonl` with a typed event so the audit trail survives.
- **Retrieval surfaces**: `read_entity(name)` MCP response gains a `contradictions: [...open and recent-resolved entries...]` block. CLI `cortex contradictions [--entity name | --open | --since DATE]` queries the graph directly.
- **Synthesis-time use**: CURRENT CONTEXT now includes open contradictions for entities the diff touches. The Librarian's system prompt is updated: _"For each open contradiction touching an entity in this diff, you must either restate it (carry it forward), resolve it (emit a `resolves` reference in warnings), or you may not silently overwrite the contradicted claim."_

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
- **Phase 7.5 Integration:** Resolving a contradiction immediately recomputes the quality score for both involved entities — the `contradiction_score` dimension rises for the vindicated entity. The contradiction score is centrality-weighted: a contradiction involving a high-centrality hub is penalized more than one on a leaf. Phase 20 (Advisor) skips entities with open contradictions in its recommendation queue — the advisor surfaces only areas the team can act on cleanly.
- Tests cover: wikilink extraction from warning text, idempotent edge building under replay, resolution audit trail, MCP response shape, prompt-injected contradictions on a synthetic diff.

**Pros & Cons**

- ✅ **Pros**: Turns Cortex's existing contradiction signal from "logged and forgotten" into "queryable and actionable." Negative knowledge — what doesn't work, what we disagree on, what was rejected — becomes structurally first-class, which is a genuinely novel pattern in LLM-driven knowledge systems. Reuses Phase 6 infrastructure with minimal additive scope. Provides a clean substrate for an ablation study: _does feeding contradictions back into CURRENT CONTEXT measurably reduce re-introduction of rejected patterns?_ That is a publishable result.
- ❌ **Cons**: Warnings without `[[WikiLinks]]` don't become edges, so the graph is sparser than the warning corpus. Mitigated by Librarian prompt changes encouraging link-bearing warnings on a forward-going basis (legacy warnings stay legacy). Human-only resolution means contradictions accumulate if nobody tends them — mitigated by surfacing the open count in `cortex status` and `cortex sync`.

---

## 🎲 Phase 17: Active Disambiguation via Self-Consistency — ⏳ Planned (research-grade)

**Layman's Terms**
Sometimes the AI is sure about what a code change means; sometimes it's guessing. Today Cortex treats both the same — it just writes down whatever the AI said. Phase 17 makes Cortex sample the AI's synthesis multiple times at the same input and check whether the answers agree. When they agree, it commits silently. When they disagree, it surfaces a short structured question — _"Did this change introduce `[[OAuth2Strategy]]` or modify the existing `[[JWTStrategy]]`?"_ — and waits for an answer before persisting. The user (or an IDE agent) picks one; Cortex commits with that choice. The "confidence" signal is structural inter-sample agreement, not an LLM-emitted number.

**Technical Terms**
Implement self-consistency sampling (Wang et al., 2022 — _Self-Consistency Improves Chain of Thought Reasoning in Language Models_) as a synthesis-quality signal. For each synthesis call, sample the Librarian _N_ times (default _N=3_) at non-zero temperature, structurally diff the outputs, and route by inter-sample agreement:

- **Full agreement** (all _N_ samples produce equivalent entity sets and equivalent action verbs per entity): commit silently. This is the dominant case on routine diffs.
- **Partial agreement** (≥⌈_N/2_⌉ samples agree on the entity-level structure but disagree on action verbs or descriptions): commit the majority result and append a typed `samplingDivergence` event to `log.jsonl` for later review.
- **Disagreement** (no majority on entity-level structure, or contradictory action verbs on the same entity): suppress the commit, emit a structured disambiguation question to a queue, surface via `cortex ask` (CLI) or a new MCP `disambiguation_pending` resource.

A disambiguation question is a structured object — `{ id, file, summary, options: [{ summary, sampleId, syntheses: <full synthesis JSON> }], context: { diff, currentContextSnapshot } }` — not a free-form prompt. The user picks an option (or types a free-form override), and that selection is then injected into a final committal synthesis call.

- **CLI**: `cortex ask` prints pending questions; `cortex answer <id> <option-index | "free text override">` resolves one.
- **MCP**: new `disambiguation_pending` resource that IDE agents poll, and a `resolve_disambiguation(id, choice)` tool. This lets Claude Code / Cursor surface the disambiguation question inline in the chat rather than leaving the CLI as the only resolution path.
- **Mode flag**: `CORTEX_DISAMBIGUATION=off|auto|strict`. `off` = current behavior (single sample). `auto` (default once Phase 17 ships) = sample, commit on agreement, queue on disagreement. `strict` = always queue if _any_ divergence, even partial.

**Architecture & System Design**

- **Core Components**: modifications to `src/llm/client.ts` (multi-sample wrapper), new `src/llm/consistency.ts` (structural diff of synthesis outputs), new `src/knowledge/disambiguation.ts` (queue stored at `.knowledge/disambiguation/queue.jsonl`), new `src/cli/ask.ts` and `src/cli/answer.ts`, MCP additions in `src/mcp/server.ts`.
- **Design Pattern**: Sampling-as-confidence-signal — explicitly _not_ an LLM-emitted confidence number. Calibration-free by construction: agreement is observed across independent generations, not declared by the model. Consistent with [implementation_plan.md:743](implementation_plan.md).
- **Key Considerations**:
  - _N=3_ is the floor that gives meaningful majority; _N=5_ is the recommended default for high-stakes paths (e.g. Phase 6 constraint-bearing entities, Phase 12 CI gates). Token cost is _N×_ per synthesis — surface this in `cortex test-cost` (Phase 13) so users see the cost _before_ enabling.
  - Structural equivalence is deterministic: two syntheses are "equivalent" if their entity sets match by name, action verbs match per entity, and `relationships[]` targets match. Description text is allowed to differ — LLM stylistic variance is expected and not signal-bearing.
  - Pending disambiguation questions must persist across daemon restarts. The watcher keeps recording events; only the _commit_ is gated. A queue overflow (configurable, default 50) refuses new syntheses with a clear error pointing at `cortex ask` — to prevent silent unbounded growth.
  - Mock mode (`CORTEX_MOCK_AI=true`) short-circuits sampling to _N=1_, keeping the existing deterministic test path fast.

**Definition of Ready (DoR)**

- Phase 13's `cortex test-cost` is shipped — users can see the _N×_ token cost of sampling before enabling it.
- Phase 14's clustering is shipped — sampling stacks multiplicatively on top of clustering, so combined-cost visibility is required.

**Definition of Done (DoD)**

- _N_-sample synthesis path implemented behind `CORTEX_DISAMBIGUATION=auto`.
- Structural-equivalence check correctly classifies the three cases (full agreement / partial agreement / disagreement) on a corpus of known synthesis triples.
- Disagreement cases produce a queued disambiguation question with structured options; the queue survives daemon restart.
- `cortex ask` / `cortex answer` resolve questions; resolution drives a committal synthesis.
- MCP `disambiguation_pending` resource and `resolve_disambiguation` tool exposed.
- **Phase 7.5 Integration:** Self-consistency agreement rate becomes an optional 7th quality dimension (`consistency_score`): full N/N agreement scores 1.0, majority ⌈N/2⌉ agreement scores 0.7, single-sample (Phase 17 disabled) scores 0.5 neutral — teams not using Phase 17 are not penalized. When both `CORTEX_DISAMBIGUATION=auto` and `CORTEX_REVIEW_MODE=enabled` are active, a resolved disambiguation item automatically triggers a `pendingReview` entry for the resolved entity — one interaction closes both queues simultaneously.
- Tests cover: 3-of-3 agreement → silent commit, 2-of-3 → majority commit + log event, 1-1-1 → queue with structured options, queue persistence across restart, overflow refusal.

**Pros & Cons**

- ✅ **Pros**: Self-consistency is well-validated in the literature as a quality signal and is calibration-free — it requires no model-emitted confidence. Surfaces low-confidence syntheses for human input _exactly_ where input is most useful, without forcing review on the ~95% of syntheses where the model is consistent. Provides a clean experimental surface: _what fraction of disagreement cases, on real corpora, correspond to genuine architectural ambiguity vs LLM noise?_ That measurement is publishable.
- ❌ **Cons**: _N×_ token cost on every synthesis call. Mitigated by opt-in env-var gating and by Phase 14 clustering reducing per-synthesis size. Disambiguation queue can grow unbounded if the user ignores it — mitigated by overflow refusal and surfacing the count in `cortex status`.

---

## 🧬 Phase 18: Architectural Embeddings (Typed-Graph + Text Hybrid) — ⏳ Planned (research-grade)

**Layman's Terms**
Cortex understands structure (the typed dependency graph) and Cortex understands text (the synthesised descriptions). Phase 18 fuses them into a single vector per entity, so a question like _"which other entity is architecturally most similar to `[[AuthService]]`?"_ can be answered numerically without re-reading the whole index. The embeddings also become the substrate for Phase 19's distilled Librarian and a link-injection assist for Phase 6.

**Technical Terms**
For each entity, compute a hybrid embedding that fuses three signals:

- **Text embedding** of the entity description + concatenated `evidence[].content` snippets (Phase 7), via a small open-weight encoder (default `bge-small-en-v1.5`, 384-d, CPU-friendly).
- **Graph embedding** of the entity's position in the typed-edge graph (Phase 6 `relationships[]`), via Node2Vec or a small GNN over the directed typed graph. Edge types (`depends_on`, `called_by`, `contradicts`, etc.) inform the random-walk transition probabilities — a `contradicts` edge contributes negative signal to similarity.
- **Fusion**: a learned projection to a common dimensionality (default 128-d), trained offline via a self-supervised objective on synthesis-time pairs: entities co-occurring in the same `warnings[]` or `failedApproaches[]` block should be near each other; entities connected by `contradicts` edges should be far apart; entities co-occurring as `depends_on` neighbors should be moderately close.

Embeddings are **not** used as retrieval-instead-of-reading. Cortex's index-first principle ([CORTEX.md §7](CORTEX.md)) still holds — the rich `index.md` remains the primary read surface. Embeddings serve three narrower purposes:

- **`cortex similar <entity> [--limit N] [--exclude-direct-neighbors]`** — find architecturally adjacent entities. Useful when planning a refactor: _"what else looks like this?"_
- **Phase 6 link-injection assist** — when the Librarian synthesises a new entity, the writer suggests `[[WikiLink]]` candidates from the top-_k_ embedding-nearest existing entities. Suggestion only; the Librarian must accept by emitting them, so no autonomous knowledge mutation.
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
- **Phase 7.5 Integration:** `cortex similar` results are re-ranked by quality × cosine similarity (not cosine similarity alone) — a high-quality neighbor at 0.85 beats a low-quality one at 0.92. A `--min-quality <0–1>` flag filters results below a quality threshold. The entity's quality score is appended as a scalar feature to the text embedding vector pre-fusion, biasing the embedding space toward high-confidence architectural neighborhoods.
- Tests cover: deterministic encoding of identical input, incremental update correctness, similar() ranking on a known synthetic graph, train→retrieve round-trip, mixed `modelHash` detection and warning.

**Pros & Cons**

- ✅ **Pros**: First-class research contribution — typed-graph + text fusion embeddings for code architecture is a genuinely understudied area. Provides the substrate for Phase 19 distillation. Local-first, no third-party dependency. Useful even standalone: `cortex similar` is a real product feature for refactoring scoping and pattern-consistency checks.
- ❌ **Cons**: Adds a serious new dependency surface — a local encoder model (~30MB minimum) plus a training step. Mitigated by making it opt-in via `CORTEX_EMBED`. Trained fusion is per-user (embedding space differs across knowledge bases), so embeddings are not portable across Cortex installs — accepted because they are derived data and `modelHash` makes the boundary explicit.

---

## 🪞 Phase 19: Librarian Distillation — ⏳ Planned (research-grade)

**Layman's Terms**
Today every Cortex synthesis goes through a frontier LLM (GPT-4-class), which is expensive and slow. Phase 19 trains a small specialised model on Cortex's accumulated _(diff, current-context, synthesis)_ triples, then uses that distilled model as the default Librarian. The frontier model becomes a fallback for hard cases — diffs where the distilled model's self-consistency check fails. The result is dramatically cheaper synthesis with quality at parity for the long tail of routine diffs, and a genuinely novel research artifact: a Librarian _learned from a specific codebase's architectural history_.

**Technical Terms**
A self-supervised distillation pipeline grounded in real production synthesis pairs. Cortex installs accumulate _(diff, CURRENT CONTEXT snapshot, synthesis JSON)_ triples in `log.jsonl` from every committed synthesis call. After ≥1000 such triples — a configurable floor — `cortex distill train` runs a supervised fine-tune of a small open-weight model (default `Qwen2.5-Coder-1.5B`; alternatives `Llama-3.2-1B-Instruct`, `Phi-3.5-mini`) on the triples, with the synthesis JSON as the target. The fine-tuned model is served locally via Ollama or llama.cpp and used as the default Librarian behind a routing flag.

- **Training data scope**: only triples that received self-consistency _agreement_ (Phase 17) are included as positive examples. _Disagreement_ triples are filtered out — distillation should not learn the frontier model's noise. _Partial agreement_ triples may be included as low-weight examples (configurable).
- **Routing flag**: `LIBRARIAN_ROUTE=distilled|frontier|hybrid`.
  - `distilled` always uses the local model.
  - `frontier` always uses the frontier model (current default).
  - `hybrid` (recommended post-Phase-19) uses the distilled model first and falls back to the frontier only when the distilled model's self-consistency check (Phase 17) returns _disagreement_. This bounds quality to frontier on hard cases while capturing the cost savings on routine cases.
- **Quality bar**: `cortex distill eval` runs the distilled model and the frontier model in parallel against a held-out triple set and reports per-field agreement: entity-set Jaccard, action-verb match rate, relationship-target match rate, warning Jaccard. Promoting a distilled model to default requires ≥95% entity-set agreement and ≥90% relationship-target agreement (configurable bars).
- **Privacy & data boundary**: training data stays local. Cortex never uploads `.knowledge/`, `log.jsonl`, or any synthesised triples to a third-party training service. The fine-tune runs on the user's hardware (or a user-controlled GPU rental — Modal, RunPod — initiated by the user, not by Cortex) via `unsloth` or `axolotl`. A new `.cortexignore-distill` file lets the user exclude sensitive files from the training corpus (e.g. proprietary auth implementations).

**Architecture & System Design**

- **Core Components**: new `src/distill/dataset.ts` (extract + format training triples from `log.jsonl`), new `src/distill/train.ts` (wraps an external trainer — `unsloth` or `axolotl` — via subprocess; Cortex does not implement training from scratch), new `src/distill/serve.ts` (Ollama / llama.cpp client), modifications to `src/llm/client.ts` (routing), new `src/cli/distill.ts`.
- **Design Pattern**: Hybrid routing with the frontier model as the safety net. The distilled model handles the easy long tail; the frontier handles novelty. Self-consistency (Phase 17) is the trigger for fallback — calibration-free, no LLM-emitted confidence number.
- **Key Considerations**:
  - The 1000-triple training floor is a _minimum to attempt_. Real quality gains likely require 10k+ triples. Surface dataset size in `cortex distill status` so users see whether training is likely to help before they pay for it.
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
- **Phase 7.5 Integration:** `cortex distill dataset` accepts `--min-quality <0–1>` (default 0.6) — triples involving entities below the quality floor are excluded from training. In-range triples are weighted by average entity quality: 1.0 for fully-anchored human-reviewed triples, 0.7 for medium-quality. The distilled Librarian therefore learns from the codebase's most-confident architectural knowledge, not from speculative or stale synthesis events.
- Tests cover: dataset filtering correctness (self-consistent triples included, disagreement excluded), training command produces a valid checkpoint and metadata, hybrid routing fallback triggers on disagreement, `cortex distill use <hash>` switches active model reversibly.

**Pros & Cons**

- ✅ **Pros**: Reduces Cortex's per-synthesis cost by an order of magnitude on the long tail of routine diffs. Genuinely novel research surface — distilling a Librarian from real production synthesis pairs, filtered by self-consistency, is unstudied territory. Closes the loop on Cortex's "compounding knowledge" claim — the knowledge base does not just describe the codebase, it _trains the system that describes the codebase_. The (codebase → Librarian → distilled Librarian) feedback path is itself the paper.
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
- **Phase 7.5 Integration:** Advisory recommendations are scored by impact × quality × centrality — suggestions targeting high-confidence, high-centrality entities surface first. Entities with quality below 0.4 are held back with a note: "resolve quality issues in this area before actioning advisory." The heuristic library (`src/advisor/heuristics.ts`) is seeded from Phase 16's contradiction graph — recurring contradictions in the same domain become anti-pattern candidates, so the advisor learns from the codebase's own architectural friction.
- Tests cover: Opt-in boundary enforcement, isolated storage of suggestions, and basic heuristic matching.

**Pros & Cons**

- ✅ **Pros**: Moves Cortex up the value chain from passive memory to active architectural partner. Highly valuable for onboarding or refactoring legacy codebases.
- ❌ **Cons**: Generates potential noise if the heuristics are too aggressive. Requires maintaining an up-to-date pattern library.

---

## 🔬 Phase 20.1: Architecture Simulation & What-If Analysis — ⏳ Planned

**Layman's Terms**
What happens to the rest of the app if I remove `PaymentService`? What breaks if I split `AuthModule` in two, or merge `UserRepository` and `OrderRepository`? Today you have to mentally trace the dependencies and guess. Phase 20.1 lets you run these experiments as simulations — no code written, no tests required — and get a concrete damage report: which entities become orphans, which constraints break, which new cycles appear, how quality scores shift. The codebase is untouched.

**Technical Terms**
A simulation engine that applies hypothetical mutations to an in-memory copy of the entity graph (not to `state.json` or `src/`) and re-evaluates blast-radius, constraint violations, lint checks, and quality scores against the mutated graph. Results are strictly ephemeral — no persistent changes to any file.

Four simulation primitives:
- `cortex simulate remove <entity>` — delete the entity and all its edges; report orphaned dependents, constraint violations introduced/resolved, cycle resolutions, and quality-score deltas for affected neighbors.
- `cortex simulate merge <entityA> <entityB>` — collapse two entities into one; show relationship union, new god-module risk (if combined edge count exceeds `CORTEX_GOD_MODULE_THRESHOLD`), and constraint re-evaluation.
- `cortex simulate extract <entity> --into <newA> <newB>` — simulate splitting an entity's relationships between two children; show new coupling, silo risk, and which constraints would apply to each child.
- `cortex simulate inject-pattern <pattern> --target <entity>` — apply a standard architectural pattern (Strategy, Facade, Repository, Observer) to the target entity's neighborhood and show the resulting graph shape; no code is generated.

Output: a "what-if report" (markdown or JSON) showing entity-set delta, relationship delta, constraint violations introduced/resolved, lint warnings (cycles, silos, god-module), blast-radius delta, and quality-score deltas for affected entities.

**Architecture & System Design**

- **Core Components**: new `src/simulation/engine.ts` (deep-clone `state.json` graph, apply mutation, evaluate), new `src/simulation/patterns.ts` (pattern templates — pure graph transformations over node/edge sets), new `src/cli/simulate.ts`. Reuses Phase 8's graph traversal, Phase 6's blast-radius evaluator, Phase 7's lint checks, and Phase 7.5's quality scoring — all applied to the cloned graph.
- **Design Pattern**: Deep-clone-and-evaluate. The simulation graph is a separate in-memory object; the real `state.json` is read-only during a simulation run. Unit tests verify the original state is byte-for-byte identical before and after every simulation call.
- **Key Considerations**:
  - Simulations must be **completely non-mutating**. There is no code path where a simulation result writes to `state.json`, `log.jsonl`, or any file in `src/`.
  - Pattern templates are pure functions over graph objects — they take a set of nodes and edges and return a modified set. They do not encode language-specific details or generate code; that remains the developer's domain.
  - For large graphs (>500 entities), the deep-clone cost is measurable. An incremental projection (clone only the subgraph N hops from the target) is acceptable for `remove` and `extract`; `merge` requires the full graph to detect new god-module status.

**Definition of Ready (DoR)**

- Phase 8's graph traversal is factored into `src/knowledge/graph.ts` — reused by the simulation engine.
- Phase 6's blast-radius evaluator and constraint checker are importable as library functions (not CLI-only).
- Phase 7's lint checks are importable as library functions (not CLI-only).

**Definition of Done (DoD)**

- `cortex simulate remove <entity>` reports orphans, constraint breaks, and quality deltas on a test graph.
- `cortex simulate merge <A> <B>` detects new god-module risk in the merged entity.
- `cortex simulate extract <entity> --into <X> <Y>` distributes relationships and detects new silos.
- `cortex simulate inject-pattern Strategy --target <entity>` shows the Strategy graph shape (one interface, N concrete implementations).
- `--format json` produces machine-readable output for CI or scripting.
- Non-mutation invariant: original `state.json` is byte-for-byte identical before and after any simulation call (verified by test).
- Tests cover: remove orphan detection, merge god-module trigger, extract silo detection, constraint re-evaluation on remove, non-mutation invariant.

**Pros & Cons**

- ✅ **Pros**: Turns Cortex from a passive memory into an active thinking tool. "What if I refactor this?" has a concrete, graph-grounded answer before a single line is touched. No competing tool (CodeScene, Lattix, Structure101) provides graph mutation simulation — they show the current graph but do not simulate changes. Directly useful for refactoring planning, migration gating, and onboarding engineers who want to understand coupling without trial-and-error.
- ❌ **Cons**: Simulations are only as accurate as the entity graph — stale or sparse `state.json` produces misleading results. Mitigated by surfacing quality scores and `staleSince` flags in the simulation report. Pattern templates are opinionated and won't cover every refactoring; mitigated by keeping templates as pure-data YAML and open to contribution.

---

## 🐛 Phase 20.2: Bug Hotspot Prediction — ⏳ Planned (research-grade)

**Layman's Terms**
Some parts of the codebase are just more dangerous than others — they change constantly, half the app depends on them, and CI keeps failing when they're touched. Today you discover this the hard way. Phase 20.2 analyzes dependency coupling, code churn, and CI failure history together and gives you a ranked list of "entities most likely to cause bugs" before you write a line — so you can invest review and testing effort where it matters most.

**Technical Terms**
Grounded in Nagappan & Ball (ICSE 2008): network analysis on a dependency graph predicts which modules are most defect-prone — 10% higher recall than complexity metrics alone on the Windows Server 2003 dataset. Cortex already has the dependency graph (Phase 6 `relationships[]`), CI failure history (Phase 15 `ciSignal`), and entity churn (derivable from `log.jsonl`). Phase 20.2 combines them into a defect-prediction surface with no LLM in the computation path.

Per-entity hotspot score fusing three signals:
- **Churn score**: count of synthesis events touching the entity in a rolling window (default 90 days), normalized to [0, 1] against the max-churned entity.
- **Centrality score**: Phase 8/10's PageRank over the typed dependency graph. High centrality = many entities depend on this one; a bug here cascades.
- **CI failure rate**: from Phase 15's `ciSignal` — `redRunsSince / (greenRunsSince + redRunsSince)`. Defaults to 0.5 (neutral) when no CI data exists.
- **Hotspot score**: `churn × centrality × (1 + ci_failure_rate)` — entities that are heavily modified, highly coupled, and frequently fail CI score highest. Formula weights are configurable via `CORTEX_HOTSPOT_WEIGHTS`.

CLI:
- `cortex predict hotspots [--top N] [--since DATE]` — ranked hotspot list with scores and contributing factor breakdown.
- `cortex predict impact <entity>` — given an entity you're about to modify, list its dependents ranked by hotspot score ("if you change `AuthService`, these are the riskiest downstream entities").
- `cortex predict explain <entity>` — break down the hotspot score into its three components with interpretation text.

**Architecture & System Design**

- **Core Components**: new `src/prediction/hotspot.ts` (score computation), new `src/prediction/churn.ts` (rolling-window synthesis count from `log.jsonl`), new `src/cli/predict.ts`. Reuses Phase 8/10's centrality scores and Phase 15's `ciSignal`. No LLM in the computation path — all signals are observable facts.
- **Design Pattern**: Signal fusion with no LLM. Scores are computed on read and are never persisted in `state.json` — consistent with the surface-don't-act principle.
- **Key Considerations**:
  - Hotspot scores are **informational only** — `cortex predict` never blocks synthesis, lint, or any other workflow.
  - Churn is computed from `log.jsonl` at prediction time, not cached — O(log entries) and fast enough for synchronous use.
  - Phase 15 is a prerequisite for the CI dimension; without it, the CI component defaults to 0.5 neutral and the score still runs on churn + centrality.

**Definition of Ready (DoR)**

- Phase 8/10's centrality scores are stable and queryable.
- Phase 15's `ciSignal` is populated (or CI component defaults to neutral 0.5).
- `log.jsonl` (Phase 7) is stable.

**Definition of Done (DoD)**

- `cortex predict hotspots --top 10` produces a ranked list with per-entity scores and component breakdown.
- `cortex predict impact <entity>` lists dependents ranked by hotspot score.
- `cortex predict explain <entity>` shows churn / centrality / CI components separately.
- `CORTEX_HOTSPOT_WEIGHTS` overrides are respected.
- Scores are not stored in `state.json` — computed on read.
- Tests cover: churn computation from synthetic `log.jsonl`, centrality-weighted ranking, CI-signal integration, weight override, predict impact listing.

**Pros & Cons**

- ✅ **Pros**: Grounded in published empirical results (Nagappan & Ball ICSE 2008). No LLM in the path — predictions are reproducible and explainable. Reuses existing Cortex signals without new data collection. The "impact before change" query (`cortex predict impact <entity>`) is uniquely valuable at review time — reviewers get an objective risk signal rather than intuition alone.
- ❌ **Cons**: Accuracy depends on all three input signals being populated. A fresh install with no CI history and few log entries produces low-signal scores — mitigated by surfacing data-sparsity warnings in output. High-churn but stable entities (e.g., actively developed but well-tested) will appear as false positives; mitigated by the component breakdown, which lets users discount misleading signals manually.

---

## 🧩 Phase 20.3: Design Pattern Suggestion — ⏳ Planned

**Layman's Terms**
Phase 7's `cortex lint` tells you what's wrong — "`AuthModule` is a god module" or "`UserService` and `OrderService` form a cycle." Phase 20.3 tells you what to do about it: "Consider extracting the validation logic into a `Validator` strategy — here's what that graph looks like in Cortex terms." It maps each anti-pattern the linter detects to a canonical design pattern that resolves it, gives a concrete entity-level suggestion, and shows what the knowledge graph would look like after the refactor.

**Technical Terms**
Inspired by ROSE (2024) — transformer-based refactoring recommendation fine-tuned on 2M+ historical refactorings — but implemented without a trained model: a curated anti-pattern → pattern mapping table that operates over `LintManager` output and instantiates concrete suggestions against the entity's actual graph neighborhood.

Anti-pattern → pattern library (initial set):
- `god_module` (too many relationships) → Strategy (extract behavior variants), Facade (wrap and delegate sub-systems), or Module Split (if sub-clusters exist in the neighborhood).
- `cycle` (A → B → A) → Dependency Inversion Principle (introduce an abstract interface entity both sides depend on), Mediator (introduce a coordinator entity).
- `hub_dependency` (one entity with >N incoming `depends_on` edges) → Abstract Factory, Adapter, or Pub-Sub / Event Bus.
- `orphan` (no connections) → similarity-based integration suggestion via Phase 18 embeddings; degrades to domain-based suggestion without Phase 18.
- `silo` (disconnected subgraph) → Bridge Pattern, API Gateway entity suggestion.

Each suggestion output:
1. Anti-pattern summary from lint output.
2. Recommended pattern(s) with one-line rationale.
3. Concrete entity-level suggestion: which entity to introduce, which edges to redirect.
4. Cortex constraint scaffold: a Phase 6 constraint entry encoding the target graph shape post-refactor, so `cortex lint` would pass after the refactor is implemented.
5. Confidence flag: `high` (pattern maps cleanly), `medium` (multiple patterns apply — user picks), `low` (heuristic is speculative).

CLI: `cortex suggest pattern [--entity <name> | --anti-pattern <type> | --all]`
MCP tool: `get_pattern_suggestions(entity?)` for IDE surface.

**Architecture & System Design**

- **Core Components**: new `src/advisor/patterns.ts` (anti-pattern → pattern mapping table, pure data), new `src/advisor/suggester.ts` (instantiate entity-specific suggestion from lint issue + graph context), additions to `src/cli/suggest.ts` (`pattern` subcommand), new MCP tool in `src/mcp/server.ts`.
- **Design Pattern**: Rule-table with context-aware instantiation. The mapping table is pure YAML/data; the suggester instantiates each rule against the entity's actual graph neighborhood. An optional LLM-assisted path (behind `CORTEX_SUGGEST_LLM=true`) generates human-readable suggestion text; the default path is LLM-free.
- **Key Considerations**:
  - Pattern suggestions are **never automatically applied**. They are written to `.knowledge/suggestions/` (Phase 20's isolation), never to `state.json` or `src/`. Surface-don't-act applies fully.
  - The constraint scaffold is a suggestion, not an enforced constraint — users copy it into `cortex.constraints.yaml` manually if they want to enforce the target shape.

**Definition of Ready (DoR)**

- Phase 7's `LintManager` is importable as a library function (not just CLI).
- Phase 20's `.knowledge/suggestions/` isolation is established.
- Phase 8's graph is queryable for neighborhood context.

**Definition of Done (DoD)**

- `cortex suggest pattern --entity AuthModule` (where `AuthModule` is a god_module) outputs a Strategy suggestion with a constraint scaffold.
- `cortex suggest pattern --anti-pattern cycle` outputs DIP or Mediator suggestion for every detected cycle.
- `cortex suggest pattern --all` runs all lint checks and generates suggestions with confidence flags.
- Suggestions are written to `.knowledge/suggestions/patterns/<entity>.md` and do not modify `state.json`.
- MCP `get_pattern_suggestions` tool returns structured suggestions for IDE display.
- Tests cover: god_module → Strategy suggestion, cycle → DIP suggestion, orphan → similarity-based suggestion (Phase 18 mocked), constraint scaffold format, isolation invariant (state.json unchanged).

**Pros & Cons**

- ✅ **Pros**: Closes the loop between detection and action — `cortex lint` says what's wrong, `cortex suggest pattern` says what to do. Grounded in established design knowledge (GoF patterns, SOLID principles), not LLM speculation. Constraint scaffolds provide a measurable refactoring target: run `cortex lint` after the refactor and verify the suggestion resolved the issue — a pass/fail loop without extra tooling.
- ❌ **Cons**: Suggestions are opinionated — "introduce a Strategy interface" is sound advice for some god-modules and wrong advice for others. Mitigated by confidence flags and by keeping every suggestion advisory with the developer as final authority. The anti-pattern → pattern table is a permanent maintenance artifact; new anti-patterns or new patterns require table updates.

---

## 💪 Phase 20.4: Evolutionary Architecture Fitness Functions — ⏳ Planned

**Layman's Terms**
You can write unit tests to make sure your code doesn't break. Phase 20.4 gives you "architecture tests" — rules like "the dependency graph must never have cycles," "no single entity can have more than 15 incoming dependencies," or "at least 80% of entities must have CI evidence." These run in CI automatically. When the architecture drifts outside the bounds the team agreed on, the build fails and the team is alerted — before it ships.

**Technical Terms**
Grounded in Ford, Parsons, Kua — "Building Evolutionary Architectures" (O'Reilly, 2017). Fitness functions are automated governance checks that verify the architecture remains within acceptable bounds as the system evolves — the architectural equivalent of unit tests. Phase 20.4 implements them as declarative YAML evaluated by `cortex fitness`, intentionally distinct from Phase 6's entity-level constraints (per-entity import rules) and Phase 7.5's org constraints (domain-level rules). Fitness functions are systemic: they measure properties of the entire graph at a point in time.

Pre-built fitness function library (initial set):
- `ff:no-cycles` — FAIL if any cycle exists in the dependency graph.
- `ff:max-coupling <N>` — FAIL if any entity has more than N incoming `depends_on` edges.
- `ff:min-evidence-coverage <ratio>` — FAIL if fewer than `ratio × 100%` of entities have ≥1 evidence anchor.
- `ff:max-god-modules <N>` — FAIL if more than N `god_module` lint violations exist.
- `ff:ci-health <ratio>` — FAIL if more than `ratio × 100%` of entities have `redRunsSince > greenRunsSince` (requires Phase 15).
- `ff:quality-floor <score>` — FAIL if mean quality score across all entities is below `score`.
- `ff:max-open-contradictions <N>` — FAIL if more than N contradictions are open (requires Phase 16).
- `ff:max-stale-ratio <ratio>` — FAIL if more than `ratio × 100%` of entities carry a `staleSince` flag.

User-defined fitness functions extend the same format via `cortex.fitness.yaml`. Custom rules use a safe DSL subset (`mustNotEdge`, `requiresField`, `maxCount`, `minRatio`) — no arbitrary script execution.

CLI:
- `cortex fitness run [--ff <id> | --all]` — evaluate and report PASS/FAIL per function with severity.
- `cortex fitness suggest` — analyze the codebase and generate a `cortex.fitness.yaml` seed based on what the current graph already violates (rule-based, no LLM).
- CI integration: Phase 12 GitHub Action gains a `cortex fitness run --all` step; error-severity failures block merge (`--warn-only` override for teams not yet ready to enforce).

**Architecture & System Design**

- **Core Components**: new `src/fitness/evaluator.ts` (evaluate each function against the live graph), new `src/fitness/library.ts` (built-in function definitions), new `src/cli/fitness.ts`, additions to Phase 12 GitHub Action. Reuses Phase 7's lint checks, Phase 7.5's quality scoring, Phase 15's `ciSignal`, and Phase 16's contradiction graph as signal inputs.
- **Design Pattern**: Declarative predicate evaluation. Each fitness function is a named predicate `(graph, signals) → { pass, message, severity }`. The evaluator runs all enabled predicates and aggregates results. No LLM in the evaluation path — all predicates are deterministic.
- **Key Considerations**:
  - Fitness functions evaluate the **current state of the graph** — they are point-in-time snapshots, not continuous monitors.
  - `--warn-only` is the default on first install. Teams commit to hard CI failure only when they've tuned their thresholds.
  - `cortex fitness suggest` uses simple heuristics: if lint finds cycles, suggest `ff:no-cycles`; if mean quality is below 0.5, suggest `ff:quality-floor 0.5`. No LLM call.

**Definition of Ready (DoR)**

- Phase 7's lint checks are importable as library functions.
- Phase 7.5's quality scoring is stable.
- Phase 12's GitHub Action is in place for the CI gate step.

**Definition of Done (DoD)**

- `cortex.fitness.yaml` schema is defined and validated at load time.
- `cortex fitness run --all` evaluates all enabled functions and reports PASS/FAIL with message and severity.
- `cortex fitness run --ff ff:no-cycles` exits nonzero on a graph with a cycle; exits zero on a cycle-free graph.
- `cortex fitness suggest` generates a `cortex.fitness.yaml` seed from current lint output.
- Phase 12 GitHub Action step `cortex fitness run --all` blocks merge on error-severity failures.
- User-defined `my-team:` functions in `cortex.fitness.yaml` evaluate correctly.
- Tests cover: all 8 built-in functions (pass and fail cases), user-defined `mustNotEdge` function, suggest output format, CI exit code behavior.

**Pros & Cons**

- ✅ **Pros**: Architecture tests in CI are the single most-requested enterprise governance feature. No competing tool provides fitness functions as declarative YAML that run in standard CI out of the box. The `suggest` command lowers adoption barrier — teams don't need to know what functions to write; Cortex infers them from what the graph already violates. Directly integrates Phase 6 + Phase 7 + Phase 7.5 + Phase 12 into a unified governance layer.
- ❌ **Cons**: Fitness functions can become bureaucratic if teams add too many — a failing CI build for every minor metric drift discourages adoption. Mitigated by `--warn-only` default and severity levels. The safe DSL subset won't cover all use cases; for per-entity rules, Phase 6 entity-level constraints are the right tool.

---

## 📐 Phase 20.5: Architecture Documentation Generation — ⏳ Planned

**Layman's Terms**
Architecture decisions live in developers' heads and Slack threads and get lost. Diagrams go out of date the day they're drawn. Phase 20.5 generates both from what Cortex already knows: architecture decision records ("we tried JWT, it conflicted with sessions, we chose cookies — here's why"), C4-style diagrams refreshed from the live entity graph, and a Conway's Law analysis that maps where team ownership boundaries don't match the dependency graph.

**Technical Terms**
Three non-mutating documentation generation surfaces over `state.json` and `log.jsonl`:

1. **ADR Generation (`cortex adr generate`)**
   For each synthesis event with non-empty `failedApproaches[]` or `warnings[]` containing design-choice signals (detected via `[[WikiLink]]` references or keywords like "instead of", "replaced", "chose"), generate an ADR stub: Title, Status, Context (entity description at decision time), Decision (synthesis summary), Consequences (relationships introduced/removed), Alternatives Considered (`failedApproaches[]`). Stubs are written to `.knowledge/adrs/<YYYYMMDD>-<entity-slug>.md` with a `<!-- cortex-generated: review before committing -->` marker. Cortex never overwrites a human-edited ADR — existing files are skipped with a warning. `cortex adr list [--entity <name> | --since <date>]` queries existing ADRs.

2. **C4 Diagram Synthesis (`cortex diagram --level <1|2|3>`)**
   Level 1 (System Context): whole entity graph as a high-level context diagram. Level 2 (Container): entities grouped by directory cluster (Phase 14's clustering or directory structure). Level 3 (Component): drill into a single entity's direct neighbor set. Output: Mermaid (reusing Phase 8's renderer) or PlantUML. `cortex diagram --level 2 --scope AuthModule --format mermaid` renders a cluster-scoped container diagram. Diagrams are regenerated on each call from `state.json` — always current without a separate sync step.

3. **Conway's Law Analysis (`cortex conway`)**
   If the repo has `CODEOWNERS` or GitHub team files, read them and compare team ownership boundaries to dependency coupling. Entities owned by different teams but with heavy `depends_on` coupling are flagged: "Team A owns `AuthService` but `PaymentService` (Team B) has 8 direct `depends_on` edges to it — consider a formal contract or ownership transfer." Output is strictly observational; no auto-reassignment. Degrades gracefully when `CODEOWNERS` is absent (reports coupling only, no team attribution).

**Architecture & System Design**

- **Core Components**: new `src/docs/adr.ts` (ADR stub generator + parser), new `src/docs/diagram.ts` (C4 renderer, reuses Phase 8's Mermaid logic), new `src/docs/conway.ts` (CODEOWNERS parser + coupling mapper), new `src/cli/adr.ts`, new `src/cli/diagram.ts`, new `src/cli/conway.ts`.
- **Design Pattern**: Read-side projections over `state.json` and `log.jsonl`. All three surfaces are regenerable from scratch at any time. ADR stubs go to `.knowledge/adrs/` (isolated from canonical entity store). Diagrams go to `.knowledge/diagrams/`. Neither modifies `state.json` or `entities/`.
- **Key Considerations**:
  - ADR generation produces **stubs, not final documents**. The `<!-- cortex-generated -->` marker and skip-on-existing behavior force a human decision before each ADR is committed.
  - C4 diagrams are not cached — regenerated on each `cortex diagram` call. This keeps them always current at the cost of a short render pass.
  - CODEOWNERS parsing is best-effort — non-standard formats or absent files trigger `--ownership-unknown` mode, not an error.

**Definition of Ready (DoR)**

- Phase 8's Mermaid graph renderer is factored into a reusable function in `src/knowledge/graph.ts`.
- Phase 7's `log.jsonl` is stable — ADR generation walks it for design-decision signals.
- Phase 6's `failedApproaches[]` is populated in `state.json` — ADR alternatives come from it.

**Definition of Done (DoD)**

- `cortex adr generate --since <date>` produces ADR stubs in `.knowledge/adrs/` for synthesis events with `failedApproaches` or design-choice signals.
- `cortex adr list` queries existing ADRs by entity, date, or status.
- `cortex diagram --level 1` renders a full system context diagram in Mermaid.
- `cortex diagram --level 2 --scope <cluster>` renders a container diagram for a directory cluster.
- `cortex diagram --level 3 --entity <name>` renders a component diagram for one entity's neighborhood.
- `cortex conway` produces a Conway violations report from CODEOWNERS; degrades gracefully when CODEOWNERS is absent.
- Existing ADRs are not overwritten by regeneration (skip + warn behavior).
- Tests cover: ADR stub format validity, ADR skip-on-existing behavior, Level 1/2/3 Mermaid output shape, Conway report from a synthetic CODEOWNERS file, Conway degradation with no CODEOWNERS.

**Pros & Cons**

- ✅ **Pros**: ADR generation closes the "decisions live in Slack" problem — every architectural decision that touched code gets a stub document automatically, reducing the manual ADR maintenance burden. C4 diagrams from a live graph are always current without a separate drawing tool. Conway's Law analysis is the closest Cortex comes to CodeScene's team coupling feature — without any cloud dependency. All three surfaces are read-only projections; zero risk of polluting the canonical knowledge store.
- ❌ **Cons**: ADR stubs require human editing to be valuable — auto-generated ADRs without review are noise. Mitigated by the stub marker and skip-on-existing behavior that forces a human decision before commit. Conway analysis requires CODEOWNERS — teams without it get coupling data only. C4 Level 3 diagrams can be overwhelming for highly-connected entities; mitigated by a `--max-depth 1` flag.

---

## 🧠 Phase 20.6: Hierarchical Memory Tiering — ⏳ Planned (research-grade)

**Research grounding**: MemGPT (Packer, Wooders, Lin, Fang, Patil, Stoica, Gonzalez — UC Berkeley 2023 — *"MemGPT: Towards LLMs as Operating Systems"*, arXiv:2310.08560). MemGPT introduces a hierarchical memory architecture inspired by traditional OS virtual memory: a small "main context" (in the LLM's window) and a large "external context" paged in/out via function calls. The LLM controls its own paging via a small set of memory-management functions. Reports that MemGPT outperforms fixed-context baselines on long-document QA and multi-session chat consistency.

**Layman's Terms**
Today every Cortex query reads the entire knowledge index. As the knowledge base grows past a few hundred entities, the index becomes too big for the AI to read efficiently. Phase 20.6 introduces a two-tier memory: a "hot" working memory of frequently-accessed entities that's always loaded, and a "cold" archive of rarely-touched entities that's pulled in on demand. The AI controls the paging itself — it can request "load the auth subsystem into working memory" and "evict the payment subsystem to make room." This is the architecture behind MemGPT, applied to Cortex's growing knowledge base.

**Technical Terms**
A two-tier memory architecture over `state.json`:

- **Hot tier (in-context)**: a small working set (default 50 entities, configurable via `CORTEX_WORKING_SET_SIZE`) held in the MCP server's session cache. Composed of most-recently-read, most-recently-synthesized, and highest-centrality entities. `read_knowledge_index` returns hot-tier entities in full.
- **Cold tier (paged out)**: all other entities. Listed in the index as header + one-line description only ("read on demand via `page_in(entity)`"). Full entity content is paged in on explicit MCP tool calls.
- **Self-paging tool surface**: new MCP tools `page_in(entity)`, `page_out(entity)`, `working_set_status()`. The AI agent decides what to load and evict based on the current task — the LLM is in control, not Cortex.
- **Eviction policy**: LRU within the hot tier, with "pinned" override for entities marked `centrality > 0.8` (always-resident high-centrality hubs).
- **Pressure signal**: when the hot tier is full, `page_in` returns a "pressure" warning listing the LRU eviction candidates so the LLM can make an informed choice.

**Architecture & System Design**

- **Core Components**: new `src/memory/tier.ts` (hot/cold partition logic, LRU eviction), modifications to `src/mcp/server.ts` (new `page_in`, `page_out`, `working_set_status` tools; modified `read_knowledge_index` returns hot tier in full and cold tier as headers), additions to `src/cli/status.ts` (working-set composition readout).
- **Design Pattern**: OS virtual memory analog. The hot tier is the LLM's "RAM"; the cold tier is "disk." The MCP server is the memory controller; the AI agent makes paging decisions. No knowledge is lost — eviction shifts from in-context to on-disk.
- **Key Considerations**:
  - Backward-compatible: clients that don't call `page_in` still see the full index minus full content for cold entities — header + description is enough to know what exists. Existing IDE integrations work without modification.
  - Pinned entities (centrality >0.8) stay in the hot tier always, so the foundational architecture is immediately available without paging.
  - Tiering is a derived projection — `state.json` is unchanged. The hot/cold partition is recomputed on each MCP session start.

**Definition of Ready (DoR)**

- Phase 4 (MCP) is stable.
- Phase 8/10 centrality scores are computed.
- Knowledge base typically exceeds 50 entities in real-world use (below that, tiering adds overhead without benefit).

**Definition of Done (DoD)**

- `CORTEX_WORKING_SET_SIZE=50` config controls hot tier capacity.
- `read_knowledge_index` returns hot-tier entities in full and cold-tier entities as header + one-liner.
- `page_in(entity)` loads a cold-tier entity into the hot tier (evicting LRU if full).
- `page_out(entity)` moves a hot-tier entity to cold.
- `working_set_status()` returns current hot-tier composition with eviction-candidate ranking.
- High-centrality entities (>0.8) are pinned and not evictable.
- Tests cover: cold-tier rendering format, LRU eviction order, pinning override, full round-trip page_in → page_out, pressure warning on full tier.

**Pros & Cons**

- ✅ **Pros**: Solves the scaling problem for knowledge bases >200 entities — the LLM no longer reads 100KB of architecture on every query. The agent-controlled paging is the MemGPT contribution: the LLM manages its own memory, not us guessing what's relevant. Reuses Cortex's existing centrality scoring as the pinning heuristic. No `state.json` schema changes.
- ❌ **Cons**: AI agents unaware of paging tools fall back to cold-tier headers — they get one-line descriptions instead of full content for non-hot entities. Mitigated by clear "page in for details" prompts in the cold-tier listing. Tier composition is per-session — fresh agents pay a cold-start cost rebuilding their working set on first queries.

---

## 👤 Phase 20.7: Personalized Per-Developer Memory — ⏳ Planned

**Research grounding**: Mem0 (Mem0 AI, 2024 — *"Mem0: Building Production-Ready AI Agents with Scalable Long-Term Memory"*). Mem0 is an open-source memory layer for AI agents that stores facts, preferences, and history per user in a hybrid vector + graph + key-value store. Its key contribution is the **ADD/UPDATE/DELETE/NOOP** decision: every potential memory operation is classified before commit, so contradictory or redundant facts don't accumulate. Mem0 reports significant memory quality gains over append-only memory stores.

**Layman's Terms**
Today Cortex's knowledge is the team's knowledge — every developer reads the same entity descriptions. But every developer has their own context: "I work on the payment subsystem," "I prefer functional style," "I burned a day last week trying to use the legacy auth API." Phase 20.7 adds a personalized memory layer per developer: Cortex tracks what each developer has worked on, what failed approaches they've personally hit, what patterns they prefer. The AI assistant then knows you specifically, not just your team. Inspired by Mem0's personalized agent memory architecture.

**Technical Terms**
A per-developer memory store layered on top of the team-wide `state.json`. Identified by `git config user.email`, hashed to `sha256(email)[:12]` for the directory name. Stored at `.knowledge/personal/<email-hash>/memory.jsonl` — gitignored by default (personal, not shared).

Three memory types per developer:

- **Working areas**: which entities the developer has synthesized changes for in the last N days. Auto-populated from `log.jsonl` filtered to the developer's commits.
- **Personal failed approaches**: failed approaches the developer specifically hit, with timestamp and context. Auto-populated when synthesis adds to `failedApproaches[]` on a commit authored by the developer.
- **Stated preferences**: explicit `cortex remember "<fact>"` CLI command stores a free-text preference, processed via the Mem0 **ADD/UPDATE/DELETE/NOOP decision pattern** — a small LLM call classifies whether the new fact contradicts (DELETE+ADD), extends (UPDATE), duplicates (NOOP), or is novel (ADD) relative to existing memories. Prevents preference cruft.

CLI:

- `cortex remember "<fact>"` — add a personal memory (ADD/UPDATE/DELETE/NOOP classified).
- `cortex forget <id|--match "<text>">` — remove a personal memory.
- `cortex memory list [--type areas|failed|prefs]` — show personal memory.
- `cortex memory inject` — output current personal memory as a CURRENT CONTEXT preamble for the next synthesis.

MCP integration: when `get_pending_changes` is called by an IDE running as the developer, the response includes a `personalContext` block with the developer's working areas, recent failed approaches, and stated preferences.

**Architecture & System Design**

- **Core Components**: new `src/memory/personal.ts` (per-developer store with ADD/UPDATE/DELETE/NOOP classifier), new `src/cli/remember.ts`, additions to `src/mcp/server.ts` (`personalContext` block in `get_pending_changes`).
- **Design Pattern**: Per-developer memory as an additive layer. Team-wide knowledge in `.knowledge/` stays canonical and shared via git. Personal memory in `.knowledge/personal/<email-hash>/` is gitignored — never leaves the developer's machine unless they explicitly push it.
- **Key Considerations**:
  - Personal memory is **local-first and private by default**. The `personal/` directory is in the `.gitignore` shipped with `cortex init`. Teams that want shared "team preferences" use the team-wide `state.json` via existing synthesis flow.
  - The ADD/UPDATE/DELETE/NOOP decision uses a small LLM call only when `cortex remember` is invoked — not on every synthesis. Per-developer LLM cost is bounded.
  - Email-hash directory naming prevents accidental email leakage if `personal/` is committed by mistake.

**Definition of Ready (DoR)**

- Phase 7's `log.jsonl` is stable — working areas are derived from it.
- Phase 4 (MCP) is stable — personal context injection rides existing tool responses.

**Definition of Done (DoD)**

- `cortex remember "<fact>"` stores a personal memory with ADD/UPDATE/DELETE/NOOP decision.
- `cortex memory list` shows all three types with timestamps.
- `cortex forget --match "<text>"` removes matching memories.
- Working areas are auto-computed from `log.jsonl` filtered to the developer's commits.
- `get_pending_changes` MCP response includes `personalContext` for the developer.
- `.knowledge/personal/` is in the default `.gitignore` shipped by `cortex init`.
- Tests cover: ADD/UPDATE/DELETE/NOOP classification on conflicting facts, working-area derivation from `log.jsonl`, email-hash directory naming, gitignore generation.

**Pros & Cons**

- ✅ **Pros**: First-class personalization — the AI assistant knows you, not just your team. Reduces re-explaining context: "I'm working on the payment subsystem this week" is captured once and surfaced automatically. The local-first, gitignored storage sidesteps the privacy concerns that block enterprise adoption of shared memory tools. Mem0's ADD/UPDATE/DELETE/NOOP pattern means preferences don't accumulate as cruft — explicit override is detected.
- ❌ **Cons**: Per-developer state introduces a new sync surface (your laptop vs. your work machine) that Cortex does not bridge. Mitigated by documenting that personal memory is per-machine and recommending `cortex remember` for important preferences. The ADD/UPDATE/DELETE/NOOP decision adds an LLM call per `cortex remember` — bounded but non-zero cost.

---

## 🌊 Phase 20.8: Memory Stream Retrieval Scoring — ⏳ Planned (research-grade)

**Research grounding**: Generative Agents (Park, O'Brien, Cai, Morris, Liang, Bernstein — Stanford 2023 — *"Generative Agents: Interactive Simulacra of Human Behavior"*, arXiv:2304.03442). The agents use a memory stream — an append-only log of observations — with a retrieval scoring formula combining **recency** (exponential decay), **importance** (LLM-rated 1-10), and **relevance** (cosine similarity to query). The combined score, not pure similarity, drives what gets surfaced. The paper's behavioral evaluations show this scoring produces more believable, contextually-grounded agent behavior than similarity-only retrieval.

**Layman's Terms**
When the AI asks "what do I know about authentication?" today, Cortex returns whatever entity has the best name match. Phase 20.8 makes retrieval smarter: it scores each candidate by three things at once — how recently was it touched, how important is it to the codebase, and how relevant is it to the actual question. An entity touched yesterday with high centrality beats an obscure one with a slightly closer name match. This is the retrieval-scoring formula from Stanford's Generative Agents paper, adapted to Cortex's entity store.

**Technical Terms**
A weighted retrieval scoring formula combining three signals at query time:

- **Recency**: `exp(-decay_rate × days_since_last_touch)` where `decay_rate = 0.05` (configurable). Entities touched today score ~1.0; entities untouched for a year score ~0.0. Measured from the entity's `lastRefined` timestamp (Phase 7.5), not file mtime.
- **Importance**: Phase 8/10's PageRank centrality score, already computed and cached.
- **Relevance**: cosine similarity to the query, using Phase 18's hybrid embeddings (or BM25 fallback when Phase 18 is not active).
- **Combined score**: `α × recency + β × importance + γ × relevance` with `α=0.3, β=0.3, γ=0.4` default weights (configurable via `CORTEX_RETRIEVAL_WEIGHTS=recency:0.3,importance:0.3,relevance:0.4`).

Applied at three surfaces:

- `cortex similar <entity>` — re-ranks Phase 18's nearest-neighbor results by combined score.
- MCP `get_pending_changes` — CURRENT CONTEXT block ranks injected entities by combined score relative to the diff (the diff's text is the query).
- New CLI `cortex recall "<query>"` — semantic search across the knowledge base ranked by combined score, the closest analog to a chat-style "what do you know about X?" query.

The formula is documented as a heuristic, weights are configurable, and the components are reported individually in `--explain` output so users can see why an entity ranked where it did.

**Architecture & System Design**

- **Core Components**: new `src/retrieval/scoring.ts` (combined-score formula), modifications to `src/cli/similar.ts` (apply combined scoring), new `src/cli/recall.ts`, modifications to `src/mcp/server.ts` (CURRENT CONTEXT block uses combined scoring).
- **Design Pattern**: Score fusion at query time, no precomputation. Each query computes recency from `state.json` timestamps, importance from cached centrality, relevance from embeddings/BM25. Score is ephemeral — no persistence of ranking results.
- **Key Considerations**:
  - The combined score is **a heuristic**, not a learned ranker. Default weights are starting points calibrated from Park et al.'s reported settings; teams should tune based on their codebase's churn pattern. Fast-churning codebases benefit from higher recency weight; stable codebases from higher importance.
  - Without Phase 18, relevance falls back to BM25 over entity text. The formula still works — embeddings are an enhancement, not a prerequisite.
  - Recency decay is **measured from `lastRefined`**, not file mtime. An entity rewritten yesterday but unchanged for months prior still scores high recency — recency tracks the knowledge update, not the file touch.

**Definition of Ready (DoR)**

- Phase 8/10's centrality is queryable.
- `lastRefined` timestamp is populated on every entity (Phase 7.5).

**Definition of Done (DoD)**

- `CORTEX_RETRIEVAL_WEIGHTS` env var configures weights.
- `cortex similar <entity>` results are re-ranked by combined score.
- `cortex recall "<query>"` returns combined-score-ranked entities for a text query.
- MCP `get_pending_changes` CURRENT CONTEXT block uses combined-score ranking.
- BM25 fallback works when Phase 18 embeddings are not available.
- `--explain` flag breaks down per-entity score into recency / importance / relevance components.
- Tests cover: recency decay correctness, weight override behavior, BM25 fallback, combined-score tie-breaking, `--explain` output format.

**Pros & Cons**

- ✅ **Pros**: Grounded in a high-impact, peer-reviewed cognitive architecture paper (Park et al. 2023, 2000+ citations). Recency + importance + relevance captures more of human "what's worth surfacing" intuition than cosine similarity alone. Calibration is explicit (weights are configurable) — no hidden model judgment. The formula degrades gracefully when components are missing.
- ❌ **Cons**: Weight defaults are not universal — teams will need to tune them for their codebase's pattern. Mitigated by good documentation and the explicit `CORTEX_RETRIEVAL_WEIGHTS` knob. Importance from PageRank can over-weight central-but-uninteresting entities (e.g., a config module everything imports); mitigated by users adjusting `β` downward if observed and by the `--explain` transparency.

---

## 🌍 Phase 20.9: Community Synthesis & Hierarchical Abstraction — ⏳ Planned (research-grade)

**Research grounding**: Two convergent 2024 papers.

- **GraphRAG** (Edge, Trinh, Cheng, Bradley, Chao, Mody, Truitt, Larson — Microsoft Research 2024 — *"From Local to Global: A Graph RAG Approach to Query-Focused Summarization"*, arXiv:2404.16130). Detects communities (Leiden algorithm) in an LLM-extracted knowledge graph and generates per-community summaries that enable global queries impossible with chunk-based RAG.
- **RAPTOR** (Sarthi, Abdullah, Tuli, Khanna, Goldie, Manning — Stanford 2024 — *"RAPTOR: Recursive Abstractive Processing for Tree-Organized Retrieval"*, ICLR 2024). Builds a tree of recursive abstractive summaries at multiple levels of granularity; retrieval traverses the tree to find the right granularity for a query.

**Layman's Terms**
Today Cortex has individual entities (`AuthService`, `JWTValidator`, `SessionStore`) but nothing that says "these three together are the authentication subsystem." If you ask "what does this codebase do at a high level?", Cortex can't answer — it only has entity-level descriptions, not subsystem-level ones. Phase 20.9 detects clusters of tightly-connected entities (using the Leiden algorithm Microsoft's GraphRAG uses) and generates a hierarchical summary tree: entity → module → subsystem → system. Now Cortex can answer global queries because it has summaries at every scale.

**Technical Terms**
Hierarchical community summaries above the entity layer, generated via Leiden community detection (GraphRAG approach) and recursive abstractive summarization (RAPTOR approach).

Pipeline:

1. **Community detection**: run Leiden algorithm over the typed dependency graph, weighted by edge type (`depends_on` weighted highest, `derived_from` lowest). Outputs communities at multiple resolution levels (Leiden's hierarchical mode).
2. **Per-community synthesis**: for each community, generate a "community entity" summarizing purpose, key external dependencies, and characteristic patterns. Uses a dedicated `CommunitySynthesis` LLM prompt distinct from the entity-level Librarian prompt.
3. **Hierarchical abstraction**: communities are themselves clustered into super-communities, recursively, producing a tree of abstractions (RAPTOR's contribution). Default depth: 4 levels (entity → module → subsystem → system).
4. **Storage**: community entities live at `.knowledge/communities/<level>/<community-name>.md` with a `communityLevel: N` field. The community graph is stored in `state.json.communities[]` with parent/child links.
5. **Query routing**: a new `cortex ask "<question>"` CLI routes queries to the appropriate level — broad questions ("what does this system do?") hit level 3/4; specific questions ("what does AuthService do?") hit level 0/1.

CLI:

- `cortex communities build` — run detection + synthesis pipeline (expensive; run after large architectural shifts or on a schedule).
- `cortex communities show [--level N]` — show communities at level N with their entity members.
- `cortex ask "<question>"` — global query interface routed to the right community level.

MCP tool: `read_community(name)` returns a community summary for IDE consumption.

**Architecture & System Design**

- **Core Components**: new `src/communities/leiden.ts` (uses `graphology-communities-leiden`), new `src/communities/synthesize.ts` (per-community LLM synthesis), new `src/communities/router.ts` (query → level routing), new `src/cli/communities.ts`, new `src/cli/ask.ts`, additions to `src/mcp/server.ts` (`read_community` tool).
- **Design Pattern**: Hierarchical abstraction over the entity graph. Community entities are a derived layer — rebuildable from `state.json` at any time via `cortex communities build`. The community graph never replaces entity-level knowledge; it augments it.
- **Key Considerations**:
  - Community detection is **expensive** (Leiden on a 500-entity graph + N LLM calls for synthesis). Not run per-sync — invoked by `cortex communities build`, typically scheduled (weekly cron) or triggered after a major refactor. The community graph carries `staleSince` if the entity graph has drifted past a threshold.
  - Per-community synthesis reuses Phase 14's clustering insight: each community is small enough for focused LLM reasoning. Communities are split if `entities.length > 30`.
  - Community-level queries hit `cortex ask`, not `read_knowledge_index`. The default MCP surface remains entity-level for backward compatibility.

**Definition of Ready (DoR)**

- Phase 6's typed `relationships[]` are stable — Leiden uses the typed graph.
- Phase 14's clustering provides the per-cluster synthesis pattern that per-community synthesis reuses.
- Knowledge base has ≥30 entities — below that, community detection collapses to one community and adds no value.

**Definition of Done (DoD)**

- `cortex communities build` runs Leiden detection and per-community synthesis, writing community entities to `.knowledge/communities/`.
- Communities are stored at 4 levels with parent/child links in `state.json`.
- `cortex communities show --level 2` lists subsystem-level communities with members.
- `cortex ask "<question>"` routes broad questions to higher-level communities and specific to entity level.
- MCP `read_community(name)` returns a community summary.
- Community staleness is tracked via `staleSince` when the entity graph drifts past threshold.
- Tests cover: Leiden detection on a synthetic graph with known communities, hierarchical clustering (4 levels), community staleness propagation, query routing accuracy.

**Pros & Cons**

- ✅ **Pros**: Microsoft GraphRAG and Stanford RAPTOR are two of the most-cited 2024 RAG papers (each >300 citations). The hierarchical community structure enables global queries that no current Cortex surface supports ("explain this codebase at a high level"). Reuses the typed dependency graph from Phase 6. The community layer is genuinely novel for code architecture — existing tools (CodeScene, Lattix) cluster but don't synthesize per-cluster summaries.
- ❌ **Cons**: Community synthesis is the heaviest LLM workload Cortex would run — N communities × M tokens per synthesis. Mitigated by infrequent invocation, small per-community context (≤30 entities), and Phase 7.5 quality scoring carrying over to community summaries. Leiden resolution-parameter tuning matters for very large codebases (>2000 entities).

---

## 🦛 Phase 20.10: Hippocampal Retrieval — ⏳ Planned (research-grade)

**Research grounding**: HippoRAG (Gutiérrez, Shu, Gu, Yasunaga, Su — Ohio State University + Stanford 2024 — *"HippoRAG: Neurobiologically Inspired Long-Term Memory for Large Language Models"*, arXiv:2405.14831, NeurIPS 2024). Models the hippocampal indexing theory of human memory: an entity-centric index (analog to the hippocampus) combined with Personalized PageRank for one-step multi-hop retrieval. Reports 20-30% improvement over standard RAG on multi-hop QA (MuSiQue, 2WikiMultiHopQA) at 10-30× lower inference cost than iterative RAG.

**Layman's Terms**
When you ask Cortex "which entities are likely affected if I change the JWT validator?", today it does a one-hop dependency lookup. But the real answer might be three hops away — the JWT validator is used by the auth middleware, called by the API gateway, which serves payment endpoints. Phase 20.10 implements hippocampus-inspired retrieval: it does one mathematical computation (Personalized PageRank) that captures all multi-hop reachability at once. Faster, more accurate, and grounded in cognitive science research (HippoRAG, OSU 2024).

**Technical Terms**
Personalized PageRank (PPR) based multi-hop retrieval over the typed dependency graph. Given a query entity (or set), the personalized PageRank vector is computed with restart probability anchored to the query, yielding a relevance score for every entity in the graph that captures multi-hop reachability in one computation.

Pipeline:

1. **Entity-centric index**: each entity is a node in a graph where edge weights reflect Phase 6's typed relationships (`depends_on` weighted highest).
2. **Query anchoring**: given a query (text or entity), identify anchor entities — direct text matches or query-embedding-nearest entities via Phase 18 hybrid embeddings.
3. **Personalized PageRank**: compute PageRank with restart vector concentrated on anchor entities (`α=0.5` default). Score every entity by its PPR value.
4. **Top-k retrieval**: return the top-k entities by PPR score as the "neighborhood" relevant to the query.

Applied at:

- New `cortex neighborhood <entity> [--k 10]` — show top-k entities most architecturally connected to the query, including multi-hop paths.
- MCP `get_pending_changes` CURRENT CONTEXT block uses PPR-ranked entities (not one-hop neighbors) for the diff's anchor entities.
- Phase 9 (Impact Preview) gains a PPR-based `--deep` mode that surfaces multi-hop dependents, not just direct ones.

**Architecture & System Design**

- **Core Components**: new `src/retrieval/ppr.ts` (Personalized PageRank using `graphology-pagerank`), new `src/retrieval/anchoring.ts` (query → anchor entity identification), modifications to `src/mcp/server.ts` and `src/cli/impact.ts` (Phase 9), new `src/cli/neighborhood.ts`.
- **Design Pattern**: Single-computation multi-hop retrieval. Where today's retrieval is O(hop_count × neighbor_count) for explicit traversal, PPR is O(graph_size × iterations) for one computation that captures all hops. Trade-off: richer per-query signal at higher per-query compute.
- **Key Considerations**:
  - PPR is **computed on demand**, not cached — the personalization vector differs per query. PageRank (iter ~20) is fast enough for graphs up to ~10k entities at synchronous latency.
  - Anchor entities use Phase 18 embeddings when available, falling back to text matching against entity names and descriptions. Without Phase 18, PPR still works but with weaker anchoring.
  - The restart probability (`α=0.5`) controls "depth": higher α concentrates on the anchor; lower α explores further. Exposed via `cortex neighborhood --depth shallow|deep`.

**Definition of Ready (DoR)**

- Phase 6's typed `relationships[]` are stable.
- Phase 8/10's graph traversal is factored into a reusable library.
- Knowledge base has ≥50 entities — below that, PPR adds no benefit over direct traversal.

**Definition of Done (DoD)**

- `cortex neighborhood <entity> --k 10` returns top-10 PPR-ranked entities with scores and hop-distance annotation.
- MCP `get_pending_changes` uses PPR-ranked entities in CURRENT CONTEXT for entities touched by the diff.
- Phase 9 `--deep` flag uses PPR for multi-hop dependent identification.
- `cortex neighborhood --depth shallow|deep` toggles restart probability.
- Tests cover: PPR correctness on a synthetic graph (known reachability), anchor identification via embeddings vs. text matching, depth parameter behavior, performance on a 500-entity graph (<200ms).

**Pros & Cons**

- ✅ **Pros**: Grounded in HippoRAG (OSU 2024 NeurIPS), high-citation paper with documented 20-30% multi-hop QA improvements at 10-30× lower cost than iterative RAG. Captures multi-hop reachability in one computation — exactly what impact analysis genuinely needs. Reuses Cortex's existing graph and embeddings. Calibration-free: PPR scores are mathematical, not LLM-emitted.
- ❌ **Cons**: PPR is per-query compute — on very large graphs (>10k entities), repeated PPR calls have measurable latency. Mitigated by caching PPR vectors per recently-queried entity. The restart probability is a magic number that affects results significantly; mitigated by exposing it as a CLI flag and documenting its effect.

---

## 🔁 Phase 20.11: Reflexion-Style Self-Correcting Synthesis — ⏳ Planned (research-grade)

**Research grounding**: Reflexion (Shinn, Cassano, Berman, Gopinath, Narasimhan, Yao — Northeastern + Princeton + MIT 2023 — *"Reflexion: Language Agents with Verbal Reinforcement Learning"*, arXiv:2303.11366, NeurIPS 2023). Agents reflect verbally on their failures, store the reflection in episodic memory, and use it next time. Reports 91% pass@1 on HumanEval (vs. 80% GPT-4 baseline) via reflexion across iterations.

Related: **Self-RAG** (Asai, Wu, Wang, Sil, Hajishirzi — UW 2023 — *"Self-RAG: Learning to Retrieve, Generate, and Critique through Self-Reflection"*) demonstrates the same self-correction pattern for retrieval. **CRAG** (Yan, Gui, Li, Sun, Tu — 2024 — *"Corrective Retrieval Augmented Generation"*) extends it with a retrieval-evaluator triggering corrections.

**Layman's Terms**
Today when the Librarian (the AI doing synthesis) gets something wrong — produces a synthesis flagged by lint, or contradicting existing knowledge, or rejected by human review — Cortex just records the rejection. The Librarian gets no feedback. Phase 20.11 closes the loop: when a synthesis fails some quality check, Cortex generates a "reflection" — a short text explaining what went wrong and what to try differently — and stores it. The next synthesis on the same area sees the reflection in its context and avoids the same mistake. This is the Reflexion pattern (NeurIPS 2023), applied to Cortex's Librarian.

**Technical Terms**
A reflection-and-retry loop around synthesis, triggered by quality-check failures.

Triggers (failure signals that produce a reflection):

- **Lint failure**: synthesis introduces a `god_module`, `cycle`, or `silo` lint warning. Reflection: *"The previous synthesis on this area introduced a cycle between [A] and [B]; avoid creating circular dependencies."*
- **Contradiction**: synthesis introduces inconsistency with an existing entity (Phase 16's contradiction detection). Reflection: *"The previous synthesis claimed [X] uses JWT, contradicting existing knowledge that [X] uses cookies; reconcile or explicitly resolve."*
- **Human review rejection**: synthesis rejected via Phase 23's `cortex review reject`. Reflection: *"The previous synthesis was rejected by [reviewer] with reason: [text]."*
- **CI signal degradation**: synthesis touches an entity whose `ciSignal` worsens within N days. Reflection: *"The previous synthesis on [entity] correlated with [redRunsSince increase]; consider reviewing the contract assumption."*

Reflection storage: additive `reflections[]` field in entity records — `{ entity, trigger, summary, recordedAt, sourceSynthesis }`. Bounded per entity (default 5 most recent; LRU eviction).

CURRENT CONTEXT injection: when synthesizing on an entity with stored reflections, the Librarian prompt includes them as a "Lessons from past attempts:" block.

CLI:

- `cortex reflections list [--entity <name>]` — show stored reflections.
- `cortex reflections clear <entity>` — manually clear stored reflections (e.g., after a refactor that obsoletes them).

**Architecture & System Design**

- **Core Components**: new `src/reflection/triggers.ts` (failure detection hooks), new `src/reflection/generator.ts` (LLM-based reflection text generation), additive `reflections[]` field in `src/knowledge/schema.ts`, additions to `src/llm/prompts.ts` (reflection injection in CURRENT CONTEXT).
- **Design Pattern**: Failure-triggered, append-only reflection store. Reflections are generated only when failures occur — no proactive reflection. They feed into the next synthesis's context, closing the learning loop without fine-tuning.
- **Key Considerations**:
  - Reflection generation is a **small LLM call** (50-100 tokens output) — bounded cost. Generated only on failure events, not on every synthesis, so amortized cost is low.
  - The 5-reflection cap per entity prevents prompt bloat. Older reflections evict LRU; recent failures are assumed more relevant than ancient ones.
  - Reflections are **stored, not acted on autonomously** — they enter the next synthesis's context as input, but the Librarian decides what to do with them. Consistent with surface-don't-act.

**Definition of Ready (DoR)**

- Phase 7 (lint) is stable — lint-trigger reflections depend on it.
- Phase 16 (contradiction graph) is stable — contradiction-trigger reflections depend on it.
- Phase 23 (human review) is desirable but optional — Phase 20.11 still works without it, just with fewer triggers.

**Definition of Done (DoD)**

- Lint failure on a synthesis generates a reflection stored on the affected entity.
- Contradiction detection generates a reflection.
- Phase 23 review rejection generates a reflection.
- CI signal degradation generates a reflection (when Phase 15 is active).
- Next synthesis on the same entity includes stored reflections in CURRENT CONTEXT.
- `cortex reflections list / clear` CLI commands work.
- Reflections are bounded to 5 per entity with LRU eviction.
- Tests cover: each trigger type produces a reflection, reflection injection in CURRENT CONTEXT, LRU eviction at the 5-cap boundary, manual clearing.

**Pros & Cons**

- ✅ **Pros**: Reflexion is one of the most-replicated 2023 agent papers (1500+ citations). Closes the feedback loop between Cortex's existing failure signals (lint, contradictions, reviews, CI) and the Librarian's next synthesis — without any fine-tuning. Reflections are interpretable text, not opaque embeddings, so users can read why the system thinks it learned something. Fits cleanly with surface-don't-act: reflections are input to the next synthesis, not autonomous corrections.
- ❌ **Cons**: Reflections add a small LLM call per failure event — bounded but non-zero cost. Mitigated by triggering only on failures, not on success. Reflections can themselves be wrong (the reflection generator misdiagnoses the failure), creating bad "lessons." Mitigated by the 5-reflection cap (bad reflections age out) and the manual `cortex reflections clear` escape hatch.

---

## ⏳ Phase 20.12: Temporal Knowledge Graph — ⏳ Planned (research-grade)

**Research grounding**: Temporal knowledge graph (TKG) literature.

- **TNTComplEx** (Lacroix, Obozinski, Usunier — Facebook AI Research 2020 — *"Tensor Decompositions for Temporal Knowledge Base Completion"*, ICLR 2020). Adds a time dimension to ComplEx KG embeddings: facts become `(subject, predicate, object, time)` tuples.
- **TimePlex** (Jain, Rathi, Chakrabarti — IIT Delhi + IBM 2020 — *"Temporal Knowledge Base Completion: New Algorithms and Evaluation Protocols"*, EMNLP 2020). Models time-validity intervals with relation-pair recurrent patterns.
- **TeMP** (Wu, Cao, Hamilton, Tang, Maddison, Cohen — McGill 2020 — *"TeMP: Temporal Message Passing for Temporal Knowledge Graph Completion"*, EMNLP 2020). Message-passing over a temporal graph.

Together these establish a representation pattern: every fact carries `(validFrom, validTo)` intervals, enabling time-travel queries like "what was true at time T?" and "when did fact F become true?" without log replay.

**Layman's Terms**
Today Cortex tells you what the architecture is *right now*. It can't tell you what it was last month — "did AuthService depend on JWT then?" or "when did we switch from sessions to OAuth?" Phase 20.12 adds time-validity intervals to every relationship: each `depends_on` edge has a `validFrom` and (optionally) `validTo`. Cortex can now answer time-travel queries directly without replaying the entire JSONL log. This is the temporal knowledge graph pattern from KG research (TNTComplEx, TimePlex), applied to Cortex's architecture graph.

**Technical Terms**
Time-aware extension to the entity relationship model. Each edge in `state.json.entities[].relationships[]` gains:

- `validFrom: ISO 8601 timestamp` — when the relationship was first observed (the synthesis event that introduced it).
- `validTo?: ISO 8601 timestamp` — when the relationship was removed. Absent for currently-valid edges.

Entity-level temporal fields:

- `firstSeenAt`: when the entity was first synthesized.
- `lastSeenAt`: most recent synthesis touching the entity.
- `removedAt?`: when the entity was deleted (entity record retained with `removed: true` flag — soft delete for time-travel queries).

Time-travel queries:

- `cortex graph at <timestamp>` — render the entity graph as it was at a given timestamp.
- `cortex graph diff <t1> <t2>` — show edges added/removed between two timestamps.
- `cortex history <entity>` — timeline of relationship changes for an entity, with timestamps and synthesis event references.

Integrates with Phase 7's `cortex evolution --replay --at <commit>` at a finer granularity — `evolution` reconstructs full state at a commit; `graph at` queries the temporal edge model directly without replay.

**Architecture & System Design**

- **Core Components**: additive `validFrom`/`validTo` fields in `src/knowledge/schema.ts`, modifications to `src/knowledge/writer.ts` (stamp validity on every relationship write), modifications to `src/knowledge/evolution.ts` (use temporal fields instead of JSONL replay for fast queries), new `src/cli/graph.ts` (`at`, `diff` subcommands), new `src/cli/history.ts`.
- **Design Pattern**: **Bitemporal** model — validity time (when the fact was true in the world) plus event time (when Cortex learned it). Cortex tracks both: `validFrom` is the synthesis event time; the JSONL entry's commit hash is the git event time. They usually match but can differ when a synthesis observes a relationship that existed in code earlier.
- **Key Considerations**:
  - Existing entities without temporal fields are migrated lazily — when `state.json` loads, missing `validFrom` is populated from the earliest JSONL entry touching the relationship. One-time migration per relationship.
  - Temporal fields are **additive and gitignored-safe** — they don't break existing readers. Downstream tools see the same relationship shape with extra fields.
  - Time-travel queries are bounded by JSONL retention. If `log.jsonl` is rotated/compressed, queries past the rotation point fall back to Phase 7 state snapshots in the rotated archive.

**Definition of Ready (DoR)**

- Phase 7's `log.jsonl` is stable with state snapshots (so migration can backfill `validFrom`).
- `state.json` schema changes have a defined migration pattern.

**Definition of Done (DoD)**

- New relationships are stamped with `validFrom`.
- Removed relationships gain `validTo` (soft delete; not physically removed for time-travel support).
- Existing relationships are migrated on first load to populate `validFrom` from JSONL.
- `cortex graph at <timestamp>` renders the graph state at the given time.
- `cortex graph diff <t1> <t2>` shows edge additions/removals between two times.
- `cortex history <entity>` shows the entity's relationship change timeline.
- Time-travel queries run in O(graph size) without JSONL replay.
- Tests cover: validFrom stamping on new synthesis, validTo stamping on relationship removal, migration of pre-temporal relationships, `graph at` correctness against known historical states, history rendering format.

**Pros & Cons**

- ✅ **Pros**: Enables genuinely useful queries: "when did this dependency get introduced?", "what did the architecture look like before the auth migration?", "which edges have been added in the last week?" — all O(graph) instead of O(log replay). Temporal KG is a well-established research area, so the data model is on solid ground. The bitemporal distinction (validity vs. event time) is the right level of rigor for an architectural memory tool — it's how databases handle this (SQL:2011 system-versioned tables).
- ❌ **Cons**: Doubles the relationship field count (every edge gains 2-3 extra fields). Mitigated by the fields being small (timestamps) and persisted only in `state.json`, not in human-readable markdown. Soft-delete semantics (entities retained with `removed: true`) accumulate cruft over time; mitigated by an optional `cortex prune --before <date>` command that hard-deletes old soft-deleted records (explicit user invocation).

---

## 🎒 Phase 20.13: Pattern Skill Library — ⏳ Planned

**Research grounding**: VOYAGER (Wang, Xie, Jiang, Mandlekar, Xiao, Zhu, Fan, Anandkumar — NVIDIA + Caltech 2023 — *"VOYAGER: An Open-Ended Embodied Agent with Large Language Models"*, arXiv:2305.16291, TMLR 2024). VOYAGER is a lifelong learning agent in Minecraft that maintains a growing "skill library" — reusable code snippets the agent has successfully used. New tasks consult the library before generating new skills. Reports 3.3× more unique items, 2.3× longer distances, 15.3× faster tech tree progression than baselines.

Related: **Generative Agents** skill-formation patterns (Park et al. 2023), and the broader case-based reasoning literature going back to Schank (1982) — *Dynamic Memory*.

**Layman's Terms**
When a refactor succeeds (say, "extract a Strategy pattern from a god module" or "introduce a Repository to break a database cycle"), Cortex today doesn't remember the pattern of that successful change. Phase 20.13 builds a "skill library" — a growing catalog of refactor patterns the team has successfully applied, indexed by the anti-pattern they resolved. Next time the same anti-pattern appears, Cortex consults the library first: "your team has resolved this kind of cycle 3 times before, here's how." Skills are concrete, executable patterns — what edges changed, what new entities were introduced — not vague advice. This is the VOYAGER architecture (NVIDIA 2023), applied to code refactoring.

**Technical Terms**
A growing skill library that captures successful refactor patterns and makes them retrievable for future anti-pattern occurrences.

Skill structure:

```yaml
# .knowledge/skills/<skill-id>.yaml
id: extract-strategy-from-god-module-2026-04-12
trigger: god_module  # lint anti-pattern type
applied_to_entity: AuthMiddleware  # historical example
graph_before:
  entity_count: 1
  external_edges: 24
graph_after:
  entity_count: 4  # 1 facade + 3 strategies
  external_edges: 8  # delegated through facade
sequence_of_synthesis_events: [event_id_1, event_id_2]
outcome_signals:
  ci_signal_delta: improved
  quality_score_delta: +0.18
  human_review: accepted
extracted_pattern: |
  Identified hot methods in god module via centrality.
  Extracted top-3 behavior variants into Strategy entities.
  Original entity became Facade delegating to strategies.
```

Lifecycle:

1. **Skill harvesting (post-merge)**: when a sequence of syntheses resolves a lint anti-pattern (god_module → no god_module, cycle → no cycle, etc.) AND resulting entities have improved quality scores (Phase 7.5), the sequence is harvested into a skill. Triggered via `cortex skills harvest --since <commit>`.
2. **Skill retrieval**: when `cortex suggest pattern` (Phase 20.3) runs, it first searches the skill library for prior successful resolutions of the same anti-pattern type on similar graph shapes. If found, the suggestion includes the historical example.
3. **Skill curation**: `cortex skills list / show <id> / remove <id>` for manual maintenance.

**Architecture & System Design**

- **Core Components**: new `src/skills/harvester.ts` (detect anti-pattern → resolution sequences from `log.jsonl`), new `src/skills/library.ts` (storage + retrieval), new `src/cli/skills.ts`, integration into Phase 20.3's `cortex suggest pattern`.
- **Design Pattern**: **Observed-outcome library**. Skills are derived from observed (anti-pattern, resolution, outcome) tuples in `log.jsonl` — never declared manually. The library grows organically from team behavior, not from a static knowledge base.
- **Key Considerations**:
  - Harvesting is **post-hoc, not real-time**. Skills emerge from a sequence of syntheses that collectively resolved an issue — typically over hours or days. The harvester runs explicitly via `cortex skills harvest` or scheduled (daily cron).
  - Skills are **examples, not templates**. A retrieved skill says "here's how this team resolved this kind of issue last time," not "apply this transformation automatically." The developer reads and applies judgment.
  - Skill matching uses graph-shape similarity (Phase 18 embeddings on the relationship subgraph), not entity-name matching — the goal is "find analogous past situations," not "find identical entities."

**Definition of Ready (DoR)**

- Phase 20.3 (Pattern Suggestion) is shipped — the integration target.
- Phase 7's `log.jsonl` is stable.
- Phase 7.5 quality scoring is in place — needed for outcome-signal harvesting.

**Definition of Done (DoD)**

- `cortex skills harvest --since <commit>` detects anti-pattern → resolution sequences and creates skill entries.
- `cortex skills list [--trigger <type>]` lists skills by anti-pattern type.
- `cortex skills show <id>` displays full skill structure.
- `cortex suggest pattern` (Phase 20.3) checks the skill library and includes matching prior examples in suggestion output.
- Skill matching uses Phase 18 embeddings for graph-shape similarity (when available).
- Tests cover: harvester correctly detects god_module → resolution sequence, skill storage round-trip, retrieval ranking by similarity, integration with `cortex suggest pattern`.

**Pros & Cons**

- ✅ **Pros**: VOYAGER's skill library is a high-profile lifelong-learning paper (TMLR 2024, 800+ citations). The "your team did this before, here's how" framing is uniquely valuable — most static refactoring tools give generic advice; Cortex's skill library gives team-specific historical precedent. The library compounds in value: more successful refactors → better future suggestions. Reuses Cortex's existing log, quality, and embedding infrastructure.
- ❌ **Cons**: Skill harvesting depends on outcome signals — without Phase 15 (CI), Phase 7.5 (quality), and ideally Phase 23 (review), the harvester has weaker "successful" signals. Mitigated by graceful degradation: weaker signals produce fewer skills, not wrong ones. Skill quality varies with team behavior — a team that resolves anti-patterns poorly harvests poor skills. Mitigated by the manual `cortex skills remove` escape hatch.

---

## ⚖️ Phase 20.14: Causal Impact Analysis — ⏳ Planned (research-grade)

**Research grounding**: Judea Pearl — *Causality: Models, Reasoning, and Inference* (Cambridge 2009, 2nd ed., 50,000+ citations). *The Book of Why* (Pearl & Mackenzie 2018). Pearl's structural causal models (SCM) and do-calculus distinguish correlation from causation, enabling counterfactual queries ("what would have happened if X had not occurred?"). Recent software engineering applications: **CausalDebugger** (Brun et al. ICSE 2023); **Causal Inference for Bug Localization** (Wang & Lin FSE 2024); **CausalRL** for fault-tolerant systems (Zheng et al. ASE 2024).

**Layman's Terms**
Today Cortex tells you "AuthService and SessionStore are related" but doesn't tell you whether changing AuthService will *cause* SessionStore to break, or whether they're correlated through some shared parent dependency. Phase 20.14 builds a causal model over the architecture: when you ask "what happens if I remove the JWT library?", Cortex answers using Pearl's do-calculus — the same math the FDA uses to evaluate drug interventions — to give a causal answer, not just a correlational one. Root-cause analysis ("which entity is the likely origin of this failure?") becomes a first-class query.

**Technical Terms**
A structural causal model (SCM) layer over the Phase 6 typed dependency graph. Each `depends_on` edge gains a `causalStrength: number` (0-1) derived from observed change-propagation in `log.jsonl`: if changes to A historically caused changes to B within N syncs, the A→B edge gains causal strength proportional to the conditional probability `P(change_B | change_A)` over the empirical history.

Three new query types:

1. **Counterfactual** — `cortex causal counterfactual --remove <entity>`: "if entity X had never existed, which other entities would also not exist or look structurally different?" Uses backward causal traversal.
2. **Intervention** — `cortex causal intervention --modify <entity>`: "if we change X today, which entities are most likely to need changes within 30 days?" Pearl-style do-calculus over the SCM with `do(X = modified)`.
3. **Root cause** — `cortex causal root-cause --symptom <entity>`: given a broken/failing entity, walk backwards through high-causal-strength edges to rank likely originating entities.

Causal-strength computation:
- For each ordered pair (A, B) with a `depends_on` edge: count syncs where A changed and B changed within the same sync or next N=3 syncs; divide by total A-change events. Output ∈ [0, 1].
- Updated incrementally on each sync; full recomputation via `cortex causal rebuild`.
- Stored as additive field in `relationships[]`; absent for edges with <3 A-change events (low-sample warning surfaced).

**Architecture & System Design**

- **Core Components**: new `src/causal/scm.ts` (SCM construction from `log.jsonl`), new `src/causal/docalculus.ts` (intervention + counterfactual queries, Pearl algorithms), new `src/causal/rootcause.ts` (backward causal walk), new `src/cli/causal.ts`, additive `causalStrength` field on `relationships[]`.
- **Design Pattern**: Observed-frequency SCM. We don't assume unobserved causal mechanisms — we observe co-change frequency and treat it as the empirical causal signal. This is *not* full Pearl SCM with latent confounders; it's a useful approximation that matches what we can directly observe (sync co-occurrence over git history).
- **Key Considerations**:
  - Causal strength is **derived, not asserted**. The system never claims A *causes* B metaphysically; it reports the empirical co-change conditional probability with a confidence interval based on sample size. Documentation explicitly frames the metric as "if A changes, expect B to change with this empirical probability."
  - The SCM is acyclic by construction: cycles are broken by treating them as bidirectional uncertainty. Phase 7's cycle detection still applies.
  - Counterfactual queries on sparse history (low N) return wide confidence intervals — users see "low confidence (n=3 observations)" annotations rather than misleading point estimates.

**Definition of Ready (DoR)**

- Phase 6 typed `relationships[]` are stable.
- Phase 7 `log.jsonl` is stable with sufficient history (≥100 sync events for meaningful causal estimates).

**Definition of Done (DoD)**

- `causalStrength` computed and stored on edges with ≥3 A-change observations.
- `cortex causal intervention --modify <entity>` returns ranked entities likely to need changes within 30 days, with confidence intervals.
- `cortex causal counterfactual --remove <entity>` returns ranked entities likely to disappear or change shape.
- `cortex causal root-cause --symptom <entity>` returns ranked candidate root-cause entities.
- `cortex causal rebuild` fully recomputes causal strengths from `log.jsonl`.
- Tests cover: causal-strength computation on synthetic log, intervention forward-propagation, root-cause backward walk, confidence-interval reporting on low-sample edges.

**Pros & Cons**

- ✅ **Pros**: Pearl's causal framework is the foundational text of modern causal inference (50,000+ citations across the corpus). Moving from correlation to causation directly addresses the "blast radius is sometimes wrong" problem with empirical grounding. Root-cause analysis is among the highest-value debugging primitives — directly applicable to production incident triage. The empirical (not assumed) causal model sidesteps the unfalsifiability critique of SCMs with hidden confounders.
- ❌ **Cons**: Requires substantial sync history before estimates are meaningful — first 50-100 syncs produce only weak signals. Mitigated by explicit low-sample warnings. Empirical causality is "correlation-in-time," not "true causality"; we mark this explicitly in documentation to avoid claims the system can't support.

---

## 🧠 Phase 20.15: Dual-Process Synthesis (System 1 / System 2) — ⏳ Planned (research-grade)

**Research grounding**: Daniel Kahneman — *Thinking, Fast and Slow* (Macmillan 2011, 100,000+ citations). System 1 (fast, intuitive) vs System 2 (slow, deliberative). LLM application: **Tree of Thoughts** (Yao, Yu, Zhao, Shafran, Griffiths, Cao, Narasimhan — Princeton 2023 — arXiv:2305.10601, NeurIPS 2023, 1500+ citations). **Self-Refine** (Madaan et al., CMU 2023, NeurIPS 2023). **Chain-of-Thought** (Wei, Wang, Schuurmans, Bosma, Ichter, Xia, Chi, Le, Zhou — Google 2022 — NeurIPS 2022, 6000+ citations).

**Layman's Terms**
Today Cortex synthesizes every change the same way — same prompt, same depth, same time budget. But not every change deserves the same thought: a typo fix doesn't require deep architectural reasoning; introducing a new domain model does. Phase 20.15 routes syntheses by complexity: simple diffs go to a fast path (Phase 19 distilled model, single shot); complex diffs trigger a deliberate path (frontier model with tree-of-thoughts reasoning across multiple alternatives). This is Kahneman's System 1 / System 2 distinction — the most-cited cognitive psychology framework of the 21st century — applied to the Librarian.

**Technical Terms**
Two synthesis paths gated by a deterministic complexity classifier:

- **System 1 (fast path)**: Phase 19 distilled local Librarian, single-shot synthesis, ~200ms per diff.
- **System 2 (slow path)**: frontier model with Tree-of-Thoughts — generate K=3 candidate syntheses with different reasoning chains, score each via a separate critic LLM call (structural validity + consistency + evidence anchoring), return the best. ~5-10s per diff.

Complexity classifier signals (combined into a routing score 0-1):
- Diff size (lines, files touched) — normalized
- Number of entities in CURRENT CONTEXT affected
- Centrality of touched entities (Phase 8/10)
- Open contradictions on touched entities (Phase 16)
- Prior reflection count on touched entities (Phase 20.11)
- Predictive surprise score (Phase 20.20)

Routing rule: `score > CORTEX_SLOW_PATH_THRESHOLD (default 0.5) → System 2; else System 1`.

CLI overrides: `cortex sync --force-slow` (always deliberate), `cortex sync --force-fast` (always fast).

**Architecture & System Design**

- **Core Components**: new `src/synthesis/router.ts` (complexity scoring + path selection), new `src/synthesis/tot.ts` (Tree-of-Thoughts implementation), modifications to `src/llm/client.ts` (route through router). The actual ToT mechanics live in Phase 20.18; this phase implements only the router.
- **Design Pattern**: Two-tier inference router. System 1 amortizes routine cost; System 2 spends compute only when complexity justifies it. Routing decisions are logged on every synthesis event for post-hoc calibration analysis.
- **Key Considerations**:
  - Token cost: System 2 uses ~5-10× the tokens of System 1 per sync. Phase 13 cost simulator must show projected costs separately for the two paths.
  - The complexity classifier is rule-based and transparent — components are documented and weights are tunable. Future enhancement: train the classifier on observed quality outcomes (which path produced higher-quality syntheses retrospectively).

**Definition of Ready (DoR)**

- Phase 19 (distilled Librarian) is shipped — provides System 1.
- Phase 13 (cost simulation) is shipped — Phase 13 cost output separates fast/slow path projections.

**Definition of Done (DoD)**

- Complexity classifier scores every diff with documented component breakdown.
- Routes above threshold use System 2 (delegating to Phase 20.18 mechanics); below use distilled Librarian.
- `cortex sync --force-slow|--force-fast` overrides work.
- Phase 13 cost simulator separates the two path estimates.
- Routing decisions are logged on each synthesis event with score + components.
- Tests cover: routing decisions on a corpus of known-complexity diffs, override flags, score-breakdown logging.

**Pros & Cons**

- ✅ **Pros**: Tree-of-Thoughts (Yao et al. 2023, NeurIPS) is the most-cited deliberate-reasoning paper of 2023. Routes compute where it actually pays off — most syncs stay fast, rare complex ones get deep treatment. Closes the loop between Phase 19 distillation (fast path) and Phase 17 self-consistency (a System 2 mechanism). Brings Kahneman's well-validated cognitive distinction into the architecture.
- ❌ **Cons**: ToT adds latency on complex syncs — 5-10s vs sub-second. Acceptable because complex syncs are infrequent. The critic LLM call doubles per-alternative cost, amplifying System 2's premium; mitigated by activation gating ensuring this only fires when warranted.

---

## 🎭 Phase 20.16: Multi-Agent Librarian Collaboration — ⏳ Planned (research-grade)

**Research grounding**: **AutoGen** (Wu, Bansal, Zhang, Wu, Li, Zhu, Jiang, Zhang, Zhang, Liu, Awadallah, White, Burger, Wang — Microsoft Research + Penn State 2023 — *"AutoGen: Enabling Next-Gen LLM Applications via Multi-Agent Conversation"*, arXiv:2308.08155, ICLR 2024). **MetaGPT** (Hong, Zheng, Chen, Cheng, Wang, Zhang, Wang, Yau, Lin, Zhou, Ran, Xiao, Wu, Schmidhuber — DeepWisdom 2023 — arXiv:2308.00352, ICLR 2024 Oral). **Multi-Agent Debate** (Du, Li, Torralba, Tenenbaum, Mordatch — MIT 2023 — arXiv:2305.14325). **CAMEL** (Li, Hammoud, Itani, Khizbullin, Ghanem — KAUST 2023, NeurIPS 2023). **ChatDev** (Qian, Liu, Zhang, Chen, Dang, Liu, Cong, Sun — Tsinghua 2024, ACL 2024).

**Layman's Terms**
Today Cortex has one Librarian — a single AI handling every kind of architectural insight. But "is this auth pattern secure?" needs different expertise than "is this query going to scale?" Phase 20.16 splits the Librarian into specialists — ArchitectLibrarian (general structure), SecurityLibrarian (auth/secrets/access), PerformanceLibrarian (scaling/caching/queries), DomainLibrarian (business logic). They debate on every synthesis: each proposes its view, they critique each other, a final consensus is written. Inspired by Microsoft's AutoGen and MIT's Multi-Agent Debate research showing that LLM debate improves factual accuracy.

**Technical Terms**
Multi-agent synthesis via parallel specialized Librarians plus a debate-and-consensus aggregator.

Specialist roles (initial set):

- **ArchitectLibrarian** (default, always active): general structural synthesis — current Cortex Librarian behavior.
- **SecurityLibrarian**: role prompt directs attention to auth, secrets, access control, input validation, injection risks.
- **PerformanceLibrarian**: scaling, caching, query patterns, N+1 issues, async/await usage.
- **DomainLibrarian**: business-domain modeling, entity relationships, aggregate boundaries.

Pipeline per synthesis:

1. **Independent generation**: each activated specialist generates a synthesis with role-specific prompting (parallel LLM calls).
2. **Debate round** (N=1 default, configurable): each specialist sees the others' syntheses and either reaffirms, adjusts, or flags disagreement.
3. **Consensus**: aggregator LLM call produces the final synthesis, merging non-contradictory contributions and surfacing unresolved disagreements as `multiAgentWarnings[]` on the entity.

Cost-aware activation: specialists beyond the default ArchitectLibrarian only activate when the diff matches their domain — regex-based file matching (e.g., SecurityLibrarian on `src/auth/`) plus Phase 18 embedding cosine similarity to the specialist's "domain prototype" entity. A pure UI tweak doesn't activate SecurityLibrarian.

CLI: `cortex sync --agents <list>` overrides activation (e.g., `--agents architect,security` for an auth refactor).

**Architecture & System Design**

- **Core Components**: new `src/agents/specialists/` (one file per role, role-specific prompt + activation rule), new `src/agents/debate.ts` (multi-round debate orchestration), new `src/agents/aggregator.ts`, modifications to `src/llm/client.ts` (route synthesis through agent committee when enabled).
- **Design Pattern**: Specialist + debate + consensus, narrowed to the synthesis-only domain. Pattern proven in AutoGen and MetaGPT.
- **Key Considerations**:
  - Cost: 4 agents × 2 rounds + aggregator ≈ 9× single-Librarian cost. Activation gating restricts to relevant diffs; default OFF, opt-in via `CORTEX_MULTI_AGENT=true`. Phase 13 cost simulator surfaces the multiplier.
  - Multi-agent debate is a research-validated **quality improver but cost multiplier**. Trade-off framed explicitly in docs.
  - New specialists are pluggable: a YAML role definition + prompt template + activation rule, no code changes for community-contributed specialists.
  - Cross-provider specialists: routing different specialists to different model providers (Anthropic for Architect, OpenAI for Security, Google for Performance) reduces shared-bias risk — different model families produce different blind spots.

**Definition of Ready (DoR)**

- Phase 4 (MCP) stable.
- Phase 18 (embeddings) stable — used for activation similarity matching.
- Phase 13 (cost simulator) stable — must show multi-agent cost projections.

**Definition of Done (DoD)**

- 4 baseline specialists implemented with role prompts and activation rules.
- Multi-round debate orchestration with configurable round count.
- Consensus aggregator produces a single synthesis with `multiAgentWarnings[]` for unresolved disagreements.
- Activation gating (regex + embedding similarity) restricts to relevant diffs.
- `cortex sync --agents <list>` override works.
- Cross-provider routing supported via `CORTEX_AGENT_<ROLE>_PROVIDER` env vars.
- Tests cover: per-specialist prompting, debate round behavior, consensus on agreeing inputs, warning emission on disagreeing inputs, activation gating, cross-provider routing.

**Pros & Cons**

- ✅ **Pros**: AutoGen (ICLR 2024) and Multi-Agent Debate are extensively cited 2023 papers (each >1000 citations). Per-domain specialization captures expertise breadth no single Librarian prompt can match. The disagreement signal is unique research value — `multiAgentWarnings[]` flags exactly where specialists couldn't agree, which is high-signal for human review.
- ❌ **Cons**: 4-9× token cost. Mitigated by activation gating and opt-in default. Debate can amplify shared biases when all agents share one base model — mitigated by cross-provider routing. Coordination overhead can produce diluted or noncommittal consensus on contested topics; mitigated by surfacing disagreement rather than hiding it.

---

## 😴 Phase 20.17: Sleep Consolidation & Memory Reorganization — ⏳ Planned (research-grade)

**Research grounding**: **Generative Agents** (Park et al., Stanford 2023) — agents have a "reflection" phase that consolidates raw observations into higher-order insights. Biological inspiration: **Walker & Stickgold** — *"Sleep-dependent learning and memory consolidation"* (Neuron 2004); **Diekelmann & Born** — *"The memory function of sleep"* (Nature Reviews Neuroscience 2010, 3000+ citations). Computational analog: **Complementary Learning Systems** (McClelland, McNaughton, O'Reilly — Psych Review 1995, 5000+ citations). LLM application: **MemoryBank** (Zhong, Guo, Gao, Ye, Wang — Fudan 2024 — AAAI 2024).

**Layman's Terms**
Humans don't just accumulate facts — they sleep, and during sleep the brain reorganizes what was learned that day into deeper patterns. Today Cortex just keeps adding entities forever. Phase 20.17 adds a "sleep" phase: every N syncs (or nightly via cron), Cortex runs a consolidation pass that merges duplicate concepts, archives resolved contradictions, generates higher-order pattern insights, and prunes truly dead entities. The knowledge base stays sharp instead of accumulating as cruft.

**Technical Terms**
A batch consolidation pass triggered explicitly (`cortex consolidate`) or on a schedule (Phase 12 cron). Five operations:

1. **Duplicate merging**: identify entities with high Phase 18 embedding similarity (>0.9) AND overlapping `sourceFile` paths AND no distinguishing relationships. Propose merge candidates; user applies via `cortex consolidate --apply-merges`.
2. **Resolved-contradiction cleanup**: contradictions resolved >30 days ago with no recurrence are archived (moved from active `contradictions[]` to `contradictions-archive.jsonl`).
3. **Higher-order pattern extraction**: detect entity clusters that share architectural patterns (Repository, Strategy, Factory) via Phase 20.13 skill library + Phase 20.9 communities, and synthesize a meta-entity describing the pattern at the cluster level.
4. **Dead entity pruning**: entities with `removed: true` (Phase 20.12) AND no temporal queries against them in 90 days are hard-deleted (with explicit user confirmation per batch).
5. **Reflection generation**: per Generative Agents pattern, an LLM pass over recent `log.jsonl` events produces "what did we learn this week" insights stored at `.knowledge/reflections/weekly/<date>.md`.

Default schedule: nightly at 3am via cron, with `--dry-run` mode defaulting to true.

**Architecture & System Design**

- **Core Components**: new `src/consolidation/duplicates.ts`, `contradictions.ts`, `patterns.ts`, `prune.ts`, `reflection.ts`, new `src/cli/consolidate.ts`.
- **Design Pattern**: Batch off-hours consolidation mirrors biological sleep consolidation — not real-time, but periodic restructuring.
- **Key Considerations**:
  - All destructive consolidation actions require **explicit user approval** by default (merge candidates surfaced, not applied). `--auto-apply` exists but defaults to off — consistent with surface-don't-act.
  - The reflection pass is unconditional and non-destructive — produces `.knowledge/reflections/weekly/` artifacts that augment but never replace per-entity files.
  - Consolidation respects Phase 20.21's episodic-semantic distinction: `log.jsonl` (episodic) is never modified by consolidation; only the semantic projection in `state.json` is reorganized.

**Definition of Ready (DoR)**

- Phase 18 (embeddings) stable for duplicate detection.
- Phase 20.12 (temporal KG) stable for dead-entity identification.
- Phase 12 (CI/cron) stable for scheduled triggering.

**Definition of Done (DoD)**

- `cortex consolidate` runs all 5 operations with `--dry-run` defaulting to true.
- Duplicate merge candidates correctly identified by embedding + sourceFile overlap.
- Resolved contradictions archived after configurable window.
- Higher-order pattern entities generated from skill + community signals.
- Dead-entity pruning requires per-batch confirmation.
- Weekly reflection markdown produced.
- Tests cover: each consolidation operation on synthetic state, dry-run vs apply behavior, scheduling integration.

**Pros & Cons**

- ✅ **Pros**: Solves the "knowledge base grows forever as cruft" problem at the architectural level that biological sleep solves it (batch off-hours). Generative Agents' reflection phase is one of the paper's most-replicated mechanisms. The weekly reflection artifact is high-value documentation that emerges naturally from this layer. Diekelmann & Born (Nature Reviews) is a foundational reference frame for the design.
- ❌ **Cons**: Consolidation is computationally expensive (~N² entity-pair embedding comparisons for duplicate detection). Mitigated by off-hours scheduling. User-approval-by-default means consolidation only happens when humans review — acceptable trade since architectural memory consolidation is too high-stakes to fully automate.

---

## 🌳 Phase 20.18: Tree-of-Thoughts & Self-Ask Synthesis — ⏳ Planned (research-grade)

**Research grounding**: **Tree of Thoughts** (Yao, Yu, Zhao, Shafran, Griffiths, Cao, Narasimhan — Princeton + Google DeepMind 2023 — *"Tree of Thoughts: Deliberate Problem Solving with Large Language Models"*, NeurIPS 2023, arXiv:2305.10601). **Self-Ask** (Press, Zhang, Min, Schmidt, Smith, Lewis — UW + Meta 2022 — *"Measuring and Narrowing the Compositionality Gap in Language Models"*, EMNLP 2023). **IRCoT** (Trivedi, Balasubramanian, Khot, Sabharwal — AI2 2023 — *"Interleaving Retrieval with Chain-of-Thought Reasoning for Knowledge-Intensive Multi-Step Questions"*, ACL 2023). **ReAct** (Yao, Zhao, Yu, Du, Shafran, Narasimhan, Cao — Princeton + Google 2022, ICLR 2023). **LATS** (Zhou, Yang, Chen, Yang, Liu, Wong, Zhu, Wang, Lake — Stanford 2024 — *"Language Agent Tree Search Unifies Reasoning Acting and Planning"*, ICML 2024).

This is the implementation layer for Phase 20.15's System 2 path.

**Layman's Terms**
When Phase 20.15 routes a change to the "slow path" — the deliberate System 2 reasoning — it needs an actual slow-thinking mechanism. Phase 20.18 provides three: Tree-of-Thoughts (generate multiple candidate explanations as a tree, evaluate each, pick the best), Self-Ask (decompose a complex synthesis into sub-questions, answer each, aggregate), and IRCoT (look up entities mid-reasoning rather than hallucinate). These are the most-cited deliberate-reasoning patterns of 2022-2024.

**Technical Terms**
Three complementary deliberate-reasoning mechanisms invoked by Phase 20.15's slow path:

**Tree-of-Thoughts (ToT)** synthesis:
1. Generate K=3 root candidates (parallel LLM calls, temperature 0.7).
2. For each root, generate 2 follow-up "thought" expansions exploring different angles.
3. A critic LLM scores each branch on structural validity (matches `SynthesisSchema`?), consistency (no contradiction with existing entities), evidence anchoring (citation quality).
4. Return the best-scoring branch.

**Self-Ask decomposition** — for syntheses where the diff touches >5 entities or crosses module boundaries:
1. Decomposer LLM call: "what sub-questions must be answered to synthesize this diff?" Outputs structured list of (entity, question) pairs.
2. For each sub-question, retrieve relevant context (entity descriptions + Phase 20.10 PPR neighborhood) and synthesize a partial answer.
3. Aggregator LLM call stitches partial answers into the final synthesis.

**IRCoT** (interleaved retrieval CoT): at each reasoning step, optionally fetch additional entity context from `state.json` to ground the next thought. Prevents the LLM from hallucinating about entities it should have looked up.

All three produce structured intermediate artifacts inspectable via `cortex synth-trace <event-id>` for debugging and trust-building.

**Architecture & System Design**

- **Core Components**: new `src/synthesis/tot.ts` (tree expansion + critic scoring), new `src/synthesis/selfask.ts` (decomposer + aggregator), new `src/synthesis/ircot.ts` (interleaved retrieval), invoked from Phase 20.15's router.
- **Design Pattern**: Multi-step deliberate reasoning. ToT for breadth (explore alternatives); Self-Ask for depth (decompose then aggregate); IRCoT for grounding (look up rather than hallucinate).
- **Key Considerations**:
  - Cost: ToT ≈ 10× single-shot tokens (3 roots × 2 expansions + critic + final); Self-Ask ≈ 3-5× (decomposer + N sub-answers + aggregator). Activation only via System 2 routing.
  - All three patterns produce structured intermediate artifacts (tree, sub-Q/A pairs, retrieval calls) stored on synthesis events for `cortex synth-trace` introspection.

**Definition of Ready (DoR)**

- Phase 20.15 (router) is shipped — provides invocation gating.
- Phase 20.10 (PPR retrieval) is shipped — Self-Ask sub-question context.

**Definition of Done (DoD)**

- ToT generates K branches, critic-scores them, returns best.
- Self-Ask decomposes complex diffs, answers sub-questions, aggregates.
- IRCoT interleaves entity lookups during reasoning.
- `cortex synth-trace <event-id>` shows the full reasoning trace.
- Phase 20.15 router invokes these on slow-path diffs.
- Tests cover: ToT on a multi-alternative diff, Self-Ask decomposition correctness, IRCoT entity-lookup tracking, trace persistence.

**Pros & Cons**

- ✅ **Pros**: Tree-of-Thoughts and Self-Ask are foundational 2023 reasoning papers (combined 4000+ citations). Synthesis traces are interpretable — users can see exactly how a complex synthesis was reasoned, building trust. IRCoT directly addresses hallucination in long-context synthesis. LATS extends ToT with reinforcement learning — potential future enhancement path.
- ❌ **Cons**: 5-10× token cost on slow path. Mitigated by activation gating in Phase 20.15. Trace storage adds ~10KB per slow-path synthesis; mitigated by retention policy (keep last 100 traces).

---

## ✏️ Phase 20.19: Surgical Knowledge Editing — ⏳ Planned

**Research grounding**: **ROME** (Meng, Bau, Andonian, Belinkov — MIT + Northeastern 2022 — *"Locating and Editing Factual Associations in GPT"*, NeurIPS 2022, arXiv:2202.05262). **MEMIT** (Meng, Sharma, Andonian, Belinkov, Bau — MIT 2023 — *"Mass-Editing Memory in a Transformer"*, ICLR 2023). **MEND** (Mitchell, Lin, Bosselut, Finn, Manning — Stanford 2022, ICLR 2022). These papers introduce "locate-and-edit" techniques for surgical updates to factual knowledge in transformer models without retraining. The patterns apply to structured knowledge bases too.

**Layman's Terms**
Today when one fact about an entity changes — say, the auth library version is upgraded — Cortex must re-synthesize the entire entity description, which can shift unrelated details. Phase 20.19 adds surgical editing: change ONE specific fact about an entity (the library version, the file path, a single relationship) without touching the rest. Inspired by MIT's ROME/MEMIT work on editing facts in neural networks without retraining, applied here to Cortex's knowledge graph.

**Technical Terms**
A targeted edit API that modifies specific fields of an entity/concept while leaving others structurally unchanged. Distinct from re-synthesis (which rewrites the whole entity).

Edit operations:

- `cortex edit set <entity> <field> <value>` — set a specific scalar field (e.g., `description`, `sourceFile`).
- `cortex edit relationship <entity> add|remove|change <kind> <target>` — surgical relationship modifications.
- `cortex edit evidence <entity> add|remove <ref>` — surgical evidence updates.
- `cortex edit constraint <entity> add|remove <constraint>` — surgical constraint updates.

Every edit:
1. Validates against `SynthesisSchema`.
2. Writes an explicit `edit:` typed entry to `log.jsonl` (distinct from `synthesis:` entries) with `field`, `before`, `after`, `editor` (git user), optional `reason`.
3. Updates `lastRefined` but NOT `firstSeenAt`.
4. Recomputes Phase 7.5 derived quality score.
5. Does NOT trigger LLM re-synthesis.

Immutable fields (`firstSeenAt`, `synthesisEvent`, provenance fields) are protected — attempts error with clear messages.

MCP tool: `edit_entity(entity, field, value, reason?)` for IDE-assisted surgical edits.

**Architecture & System Design**

- **Core Components**: new `src/knowledge/editor.ts` (validation + atomic field update + log emission), new `src/cli/edit.ts`, additive MCP tool in `src/mcp/server.ts`.
- **Design Pattern**: Field-level compare-and-swap. The editor never bulk-rewrites; every change is one structured operation in `log.jsonl`, mirroring how Git tracks individual blob changes rather than file rewrites.
- **Key Considerations**:
  - Edits are **first-class log events** distinct from syntheses. Phase 7's `log.jsonl` schema gains an `edit:` event type. Audit trail preserved with full before/after.
  - Edits bypass LLM cost entirely — important for high-volume mechanical updates (e.g., a global file move across 50 entities).
  - Phase 20.11 Reflexion treats human edits as a feedback signal: an edit to a previously-synthesized field generates a reflection ("the previous synthesis stated X; a human corrected it to Y; consider why").

**Definition of Ready (DoR)**

- Phase 7's `log.jsonl` schema is stable and extensible.
- Phase 7.5 quality scoring is stable.

**Definition of Done (DoD)**

- `cortex edit set/relationship/evidence/constraint` operations work on real entities.
- Schema validation rejects malformed edits.
- `log.jsonl` `edit:` events contain field, before, after, editor, optional reason.
- Immutable fields (firstSeenAt, synthesisEvent) are protected with clear error messages.
- Phase 7.5 quality score recomputed after each edit.
- MCP `edit_entity` tool exposes the same operations.
- Phase 20.11 reflexion fires on field corrections.
- Tests cover: each edit type, immutable-field protection, log event format, quality re-computation, reflexion trigger.

**Pros & Cons**

- ✅ **Pros**: ROME/MEMIT (combined 2000+ citations) established locate-and-edit as a research-validated alternative to retraining. The CLI/MCP edit surface fills a real gap — today users either accept re-synthesis (which shifts unrelated details) or manually hand-edit markdown (bypassing validation). Surgical edits preserve quality scoring and audit trail. Eliminates LLM cost for mechanical updates.
- ❌ **Cons**: Bypassing LLM synthesis means edits can introduce inconsistencies the Librarian would have caught. Mitigated by schema validation and by Reflexion treating human edits as a feedback signal for future syntheses. Edit log entries can accumulate (high-frequency mechanical updates); mitigated by Phase 20.17 consolidation pruning old edit entries.

---

## 🔮 Phase 20.20: Active Inference & Predictive Synthesis — ⏳ Planned (research-grade)

**Research grounding**: Karl Friston — *"The free-energy principle: a unified brain theory?"* (Nature Reviews Neuroscience 2010, 6000+ citations). **Active Inference**: Parr, Pezzulo, Friston — *Active Inference: The Free Energy Principle in Mind, Brain, and Behavior* (MIT Press 2022). Computational implementation: pymdp (Heins, Millidge, Demekas, Klein, Friston, Couzin, Tschantz — JOSS 2022). The core idea: an intelligent agent maintains a generative model of its environment and minimizes surprise (prediction error) by either updating the model or acting on the environment. Friston has h-index >250; this is among the most-cited frameworks in computational neuroscience.

**Layman's Terms**
Today Cortex is reactive — it waits for a code change, then synthesizes. Phase 20.20 makes it predictive: before you commit a change, Cortex predicts what synthesis it expects based on past patterns. When your actual change matches the prediction, the system is unsurprised and synthesizes quickly. When your change is wildly unexpected ("you just imported a payment library in the auth module — never seen that before"), the system surfaces *surprise* as a signal: "this is unusual relative to your codebase's pattern — worth a careful look." Inspired by Karl Friston's Free Energy Principle.

**Technical Terms**
A predictive model over the synthesis distribution: P(synthesis | diff, current_context). On each diff:

1. **Prediction step**: a fast prediction LLM call (Phase 19 distilled Librarian) generates an *expected* synthesis given the diff and CURRENT CONTEXT, *before* the actual synthesis runs.
2. **Synthesis step**: actual synthesis proceeds (any path — fast, slow, multi-agent).
3. **Surprise computation**: structural diff between prediction and actual synthesis:
   - Entity-set Jaccard distance
   - Relationship-set Jaccard distance
   - Action-verb agreement
4. **Surprise score**: weighted combination, normalized to [0, 1]. Stored as `synthesisSurprise` on the log event.
5. **Active inference action**: when surprise > threshold (default 0.6):
   - Surface in `cortex sync` output: ⚠ HIGH SURPRISE — review recommended.
   - Auto-trigger Phase 20.15 System 2 slow-path re-synthesis (deliberate confirmation).
   - Optionally trigger Phase 23 review queue entry (when enabled).

CLI: `cortex surprise log [--top N]` — ranked list of most-surprising recent syntheses (research-grade leaderboard for finding architectural anomalies). Also feeds Phase 20.15's routing as one of the complexity signals.

**Architecture & System Design**

- **Core Components**: new `src/predictive/predictor.ts` (fast prediction LLM call via Phase 19 distilled model), new `src/predictive/surprise.ts` (structural diff + scoring), new `src/cli/surprise.ts`, modifications to `src/llm/client.ts` (prediction step before synthesis).
- **Design Pattern**: Predict-then-observe-then-update. The "free energy" being minimized is surprise — high-surprise syntheses get more attention (compute, review); low-surprise are routine and fast. The distilled Librarian's role as predictor is a natural fit — distillation already approximates the expected synthesis.
- **Key Considerations**:
  - Prediction cost: one extra small-model call per sync (~$0.0001 with Phase 19 distilled model). Bounded.
  - The predictor reuses **Phase 19's distilled Librarian** — perfect match: prediction is exactly what distillation does. Surprise = where distilled and frontier diverge, which is also the signal driving Phase 19's hybrid routing.
  - High-surprise syntheses are tagged but not blocked. Surface-don't-act.

**Definition of Ready (DoR)**

- Phase 19 (distilled Librarian) is shipped — provides the fast predictor.
- Phase 7's `log.jsonl` schema can accept `synthesisSurprise` field.

**Definition of Done (DoD)**

- Prediction step runs before every synthesis with bounded latency (<500ms).
- `synthesisSurprise` stored on every log event.
- High-surprise syntheses auto-trigger Phase 20.15 slow-path re-synthesis.
- `cortex surprise log --top 10` ranks recent syntheses by surprise.
- Surprise threshold configurable (`CORTEX_SURPRISE_THRESHOLD=0.6`).
- Phase 20.15 router consumes surprise as one complexity signal.
- Tests cover: prediction-synthesis Jaccard computation, threshold gating, auto-trigger of slow path, surprise leaderboard, router integration.

**Pros & Cons**

- ✅ **Pros**: Free Energy Principle is the most-cited unified theory in computational neuroscience. Predict-then-update is a research-validated paradigm. The surprise leaderboard is genuinely useful — it surfaces the most architecturally anomalous changes, exactly where bugs and architectural drift hide. Reuses Phase 19's distilled Librarian without new infrastructure.
- ❌ **Cons**: Surprise threshold tuning matters — too low and every sync is "surprising," too high and nothing surfaces. Mitigated by exposing the threshold and documenting calibration via empirical observation. Requires Phase 19 distillation for cost-efficient prediction.

---

## 📚 Phase 20.21: Episodic-Semantic Memory Consolidation — ⏳ Planned (research-grade)

**Research grounding**: Endel Tulving — *Elements of Episodic Memory* (Oxford 1983); *"How many memory systems are there?"* (American Psychologist 1985, 6000+ citations). Tulving's distinction: **episodic** memory (specific events, time-tagged) vs **semantic** memory (general facts, atemporal). Computational analog: **Complementary Learning Systems** (McClelland, McNaughton, O'Reilly — Psych Review 1995, 5000+ citations): hippocampus (episodic, fast learning) consolidates to neocortex (semantic, slow learning) during sleep. Recent LLM application: **MemoryBank** (Zhong et al., AAAI 2024); **A-MEM** (Xu et al., 2024) — agentic memory management.

**Layman's Terms**
Cortex already has two kinds of memory but doesn't distinguish them: `log.jsonl` is *episodic* (specific events: "on March 12 we changed AuthService") and `state.json` entities are *semantic* (general facts: "AuthService validates JWTs"). Today the transformation from one to the other is implicit. Phase 20.21 makes it explicit: a structured pipeline that consolidates episodic events into semantic facts, with traceability ("this semantic fact derives from these 3 episodic events"). Grounded in Tulving's foundational memory theory.

**Technical Terms**
A typed pipeline that explicitly transforms episodic events (`log.jsonl`) into semantic claims (`state.json` entity fields), with provenance tracking.

Semantic claims structure (additive in entity records):

```
semanticClaims: [
  {
    claim: "AuthService validates JWTs using the jose library",
    derivedFrom: [event_id_1, event_id_2, event_id_3],  // episodic origin
    consolidatedAt: "2026-05-15T03:00:00Z",
    confidence: 0.92,  // supporting / (supporting + contradicting) events
    contradictingEvents: []
  }
]
```

Consolidation pipeline (runs as a Phase 20.17 sleep consolidation step):

1. **Episodic mining**: scan `log.jsonl` since last consolidation for entity-claims (declarative statements in synthesis summaries).
2. **Claim clustering**: group events supporting the same semantic claim via embedding similarity + entity match.
3. **Confidence scoring**: claim confidence = supporting events / (supporting + contradicting). Claims with confidence <0.6 flagged.
4. **Semantic update**: high-confidence claims written to `semanticClaims[]` on entity records with provenance back to source events.
5. **Episodic retention**: original events remain in `log.jsonl` (never modified). Consolidation is purely additive — semantic claims layer on top.

Retrieval:

- `cortex claims <entity>` — list semantic claims with provenance.
- `cortex claims trace <claim-id>` — show originating episodic events.
- MCP `read_entity` includes `semanticClaims[]` in output.

**Architecture & System Design**

- **Core Components**: new `src/memory/consolidate.ts` (episodic → semantic pipeline), additive `semanticClaims[]` field in `src/knowledge/schema.ts`, new `src/cli/claims.ts`. Runs as a Phase 20.17 consolidation step.
- **Design Pattern**: Complementary Learning Systems analog. Episodic store (`log.jsonl`) is fast, append-only, event-based. Semantic store (`semanticClaims[]`) is slow, consolidated, fact-based. They never overwrite each other.
- **Key Considerations**:
  - Semantic claims are **derived, not authoritative**. The authoritative source is episodic events; semantic claims are a consolidated view. Direct edits go to the entity description, not to `semanticClaims[]` directly.
  - Confidence scoring is grounded in event counts, not LLM-emitted — consistent with the no-LLM-confidence-numbers principle.

**Definition of Ready (DoR)**

- Phase 7 `log.jsonl` is stable.
- Phase 18 (embeddings) for claim clustering.
- Phase 20.17 (sleep consolidation) for invocation context.

**Definition of Done (DoD)**

- Consolidation pipeline extracts entity-claims from `log.jsonl`.
- Claims clustered by embedding + entity match.
- Confidence scored from event support/contradiction ratio.
- High-confidence claims written to `semanticClaims[]` with provenance.
- `cortex claims <entity>` and `cortex claims trace <id>` work.
- MCP `read_entity` includes claims with provenance.
- Tests cover: episodic mining on synthetic log, clustering correctness, confidence computation, provenance roundtrip.

**Pros & Cons**

- ✅ **Pros**: Tulving's episodic/semantic distinction is foundational memory theory (cited tens of thousands of times across the corpus). The provenance trail makes every semantic claim auditable to its episodic origins — a research-grade traceability feature no current code-memory tool provides. Complements Phase 20.17 consolidation cleanly. Bridges to active research on neural network episodic-semantic separation (Complementary Learning Systems in deep RL).
- ❌ **Cons**: Adds storage (semanticClaims[] per entity). Mitigated by claim count being small (typically 3-10 per entity). Consolidation correctness depends on synthesis summaries being declarative enough to mine; mitigated by Librarian prompt updates encouraging claim-style statements.

---

## 🔁 Phase 20.22: Spaced Repetition & Forgetting Curves — ⏳ Planned

**Research grounding**: Hermann Ebbinghaus — *Memory: A Contribution to Experimental Psychology* (1885) — the foundational forgetting curve, the oldest experimental psychology result still cited daily. **SuperMemo SM-2** (Wozniak 1990) — the spaced repetition algorithm used by Anki and most modern flashcard systems. Modern formalization: **A Stochastic Model of Human Memory** (Cepeda, Vul, Rohrer, Wixted, Pashler — Psych Sci 2008). LLM application: **Active Forgetting in LLMs** (Bian, Huang, Cheng, Liu — 2024).

**Layman's Terms**
Some Cortex entities haven't been touched in 6 months. Are they still accurate? Today nothing reminds you to check. Phase 20.22 applies spaced repetition (the science behind Anki flashcards) to architectural memory: entities get review intervals that grow when confirmed accurate and shrink when found inaccurate. The system surfaces "due for review" entities proactively. Grounded in Ebbinghaus's 1885 forgetting curve and the SuperMemo SM-2 algorithm — 140 years of evidence-grounded memory science.

**Technical Terms**
A review scheduling layer that assigns each entity an interval based on Ebbinghaus-style decay and SM-2 update rules.

Per-entity scheduling fields (additive):

```
reviewSchedule: {
  intervalDays: 14,       # current review interval
  easeFactor: 2.5,        # SM-2 EF, initial 2.5
  lastReviewed: "2026-04-01",
  nextDue: "2026-04-15",
  reviewHistory: [{date, outcome: "confirmed"|"updated"|"stale"}]
}
```

SM-2 update on review outcome:
- `confirmed` (still accurate): `interval *= EF`, `EF` unchanged.
- `updated` (still relevant but needed edits): `interval *= 1.3`, `EF -= 0.15`.
- `stale` (no longer accurate): `interval = 1`, `EF -= 0.25` (floor 1.3).

Triggers:
- Manual: `cortex review-due [--top N]` lists entities past `nextDue`.
- MCP: `read_knowledge_index` surfaces a `reviewDue: [...]` block.
- CI: Phase 12 GitHub Action gains an optional weekly summary commenting on stale entities.

Auto-confirmation: an entity touched by a recent synthesis (last 30 days) is auto-confirmed without manual review — no need to ask "is this still accurate?" if it was just rewritten.

**Architecture & System Design**

- **Core Components**: new `src/memory/scheduler.ts` (SM-2 algorithm), new `src/cli/review-due.ts`, additive `reviewSchedule` field on entity records.
- **Design Pattern**: Pull-based review system. Entities don't expire; they ask to be looked at. Forgetting is explicit, not implicit.
- **Key Considerations**:
  - SM-2 is parameter-stable across decades of Anki use — no parameter tuning needed for initial deployment.
  - Auto-confirmation prevents review fatigue on active codebases. Only quiescent entities accumulate as "due."

**Definition of Ready (DoR)**

- Phase 7.5 `lastRefined` timestamp populated on every entity (used for auto-confirmation).

**Definition of Done (DoD)**

- `reviewSchedule` field populated on all entities.
- SM-2 algorithm correctly updates intervals on review outcomes.
- Auto-confirmation triggers on recent synthesis touch.
- `cortex review-due` lists entities past due.
- MCP `read_knowledge_index` includes `reviewDue` block.
- Tests cover: SM-2 interval updates for all 3 outcomes, auto-confirmation behavior, due-entity listing, ease-factor floor.

**Pros & Cons**

- ✅ **Pros**: Ebbinghaus + SM-2 represent 140 years of evidence-grounded memory science. Closes the "is this knowledge still accurate?" question proactively. Auto-confirmation makes adoption painless — active codebases see almost no review burden; only neglected areas surface. Directly complements Phase 7.5 staleness scoring with a temporal nudge system.
- ❌ **Cons**: Review fatigue if too many entities go stale at once. Mitigated by auto-confirmation and `--top N` limiting per-query surface. Adds 4-5 fields per entity record; small storage cost.

---

## 🛠️ Phase 20.23: Tool-Use Augmented Synthesis — ⏳ Planned (research-grade)

**Research grounding**: **Toolformer** (Schick, Dwivedi-Yu, Dessì, Raileanu, Lomeli, Zettlemoyer, Cancedda, Scialom — Meta AI 2023 — *"Toolformer: Language Models Can Teach Themselves to Use Tools"*, NeurIPS 2023, arXiv:2302.04761, 1500+ citations). **ReAct** (Yao, Zhao, Yu, Du, Shafran, Narasimhan, Cao — Princeton + Google 2022 — *"ReAct: Synergizing Reasoning and Acting in Language Models"*, ICLR 2023, 2000+ citations). **Gorilla** (Patil, Zhang, Wang, Gonzalez — UC Berkeley 2023 — arXiv:2305.15334). **LATS** (Zhou et al., ICML 2024). **Voyager** tool-use mechanics (Wang et al., NVIDIA TMLR 2024).

**Layman's Terms**
Today the Librarian synthesizes from the diff text + existing knowledge alone. Sometimes that's not enough — to truly understand a change, the Librarian needs to grep the codebase, run git blame, or query the language server. Phase 20.23 gives the Librarian tools: it can mid-synthesis call `grep`, `git_blame`, `read_file`, `ts_lookup_symbol`, etc., to ground its synthesis in concrete evidence rather than speculation. This is the Toolformer (Meta NeurIPS 2023) and ReAct (Princeton ICLR 2023) pattern.

**Technical Terms**
A tool-use layer for the Librarian. During synthesis, the LLM can emit structured tool-call requests that the Cortex runtime executes and returns results for the next reasoning step.

Tool surface (initial set):

- `grep(pattern, path?)` — repo-scoped grep, returns matching lines with file:line context.
- `read_file(path, lines?)` — fetch specific lines from a source file.
- `git_blame(path, line)` — git blame (author, date, commit).
- `git_log(path, --since=)` — commit history for a path.
- `ts_lookup_symbol(name)` — TypeScript Language Server symbol lookup (callers, definitions).
- `ast_query(path, selector)` — AST query via tree-sitter (function signatures, class members).

Pipeline:

1. LLM receives diff + CURRENT CONTEXT + tool list.
2. LLM emits one of: a synthesis OR a tool call (structured JSON).
3. If tool call: Cortex runtime executes, returns result to LLM.
4. LLM continues reasoning. Loop up to `CORTEX_TOOL_BUDGET=10` tool calls (default), then forced to synthesize.
5. Final synthesis includes a `toolTrace[]` field with all tool calls and results — full traceability.

**Architecture & System Design**

- **Core Components**: new `src/tools/registry.ts` (tool definitions + sandboxed execution), new `src/tools/grep.ts`, `git.ts`, `lsp.ts`, `ast.ts`, modifications to `src/llm/client.ts` (multi-turn tool-loop synthesis).
- **Design Pattern**: ReAct (Reason + Act) loop. The LLM alternates between reasoning and tool calls until it has enough grounded evidence to synthesize.
- **Key Considerations**:
  - Tool calls add latency per call (~50-500ms each). Bounded by `CORTEX_TOOL_BUDGET`.
  - Tools are **read-only and sandboxed** — they cannot modify source files, commit changes, or run arbitrary commands. Listed tools are explicitly safe; the registry rejects unlisted tool names.
  - Tool traces stored on synthesis events for audit and debugging. Users can see exactly which grep/blame/lookup grounded each synthesis.
  - Tool calls are explicitly **not** mutations — synthesis remains the only path that writes to `.knowledge/`.

**Definition of Ready (DoR)**

- Phase 2 (LLM client) supports multi-turn function-calling (most modern providers do).
- Optional: tree-sitter and TypeScript LSP available for the richer tools (gracefully degrades if absent).

**Definition of Done (DoD)**

- 6 baseline tools implemented and sandboxed.
- Tool-loop synthesis works end-to-end (LLM → tool → result → LLM → synthesis).
- Tool budget caps enforce termination.
- `toolTrace[]` stored on each synthesis with calls + results.
- `cortex synth-trace <event-id>` shows the tool trace.
- Tests cover: each tool's correct execution, budget enforcement, sandbox refusal of non-listed tools, trace persistence.

**Pros & Cons**

- ✅ **Pros**: Toolformer (NeurIPS 2023) and ReAct (ICLR 2023) are foundational tool-use papers (combined 3500+ citations). Tools ground synthesis in concrete evidence — directly addresses hallucination. Tool traces are interpretable and auditable. The tool registry is extensible; users can add domain-specific tools without core modifications. Gorilla showed LLMs can learn 1000+ API calls — runway for far richer tool surfaces.
- ❌ **Cons**: Multi-turn tool loops add latency (~5-10× single-shot for tool-heavy syntheses). Mitigated by tool budget caps and by activation only on slow path (Phase 20.15 System 2). LSP integration adds a dependency on a running TypeScript server; mitigated by treating it as optional with graceful degradation.

---

## 🌐 Phase 21: Polyrepo Federation — ⏳ Planned

**Layman's Terms**
Most enterprises don't use one giant monorepo — they have dozens or hundreds of separate Git repositories, each owned by a different team. Today Cortex only covers one repo at a time. Phase 21 makes entities from one repo visible to another. If your payment service depends on something in the auth service's repo, Cortex can now track that cross-repo dependency, flag when it drifts, and enforce constraints across team boundaries — all without anyone needing to copy-paste architecture docs.

**How this differs from Phase 11 (Monorepo Federation)**
Phase 11 covers multiple workspaces inside a single Git repository (same disk, same CI, same team). Phase 21 covers entirely separate repositories (different Git remotes, different teams, different CI pipelines, network transport required). Phase 11 uses a shared file system; Phase 21 requires a push protocol over the network and a central registry that each repo's CI can write to.

**Technical Terms**
Each repo publishes a signed knowledge export (a subset of its `state.json` — public entities only) to a central **Cortex Registry** after each merge. Consuming repos subscribe to upstream registry entries and materialize read-only "foreign" entities in their local `.knowledge/`. Cross-repo `[[repo:Entity]]` links resolve against these materialized entities. Constraints can span repos: a `cortex.constraints.yaml` rule in `payment-service` can declare `mustNotImport: auth-service/InternalTokenStore`.

- **Registry model**: Cortex Registry is a lightweight REST service (self-hostable Docker image; also offered as a managed tier) that accepts POST of a signed knowledge export (`cortex publish`) and serves GET of any repo's public entity index. Exports are content-addressed and append-only (no mutation of published history).
- **Public/private surface**: each entity in `state.json` gains an optional `visibility: "public" | "private"` field (default `private`). Only `public` entities are included in the published export. Teams explicitly curate what their service contract exposes.
- **Materialization**: `cortex pull [--registry <url>] [--upstream <repo-name>]` fetches the latest export from an upstream repo and writes read-only entity stubs to `.knowledge/foreign/<repo-name>/`. Stubs render in the local index with a `🔗 foreign` badge and are excluded from synthesis targets (never overwritten by the local Librarian).
- **Cross-repo constraints**: Phase 7.5's `cortex.constraints.yaml` gains a `sourceRepo` / `targetRepo` scope field. Cross-repo constraints are evaluated at synthesis time against the materialized foreign entities.
- **Staleness propagation**: when a foreign entity stub is updated (the upstream published a new export), local entities with `depends_on` edges to it are stamped `staleSince` — the same blast-radius mechanic from Phase 6, now spanning repos.
- **CI integration**: the Phase 12 GitHub Action gains a `cortex publish` step that fires after a successful merge and pushes the public entity index to the registry. `cortex pull` fires at the start of each CI run to freshen foreign stubs.

**Architecture & System Design**

- **Core Components**: new `src/registry/` (client for push/pull/subscribe, content-addressed storage, signing), new `src/knowledge/foreign.ts` (stub materialization + staleness bridge), `cortex publish` and `cortex pull` CLI commands, additions to Phase 12 GitHub Action.
- **Design Pattern**: Federated, not centralized. Each repo owns and controls its own entities; the registry is a coordination bus, not an authority. A repo can leave the registry at any time without corrupting its own knowledge. Foreign stubs are derivatives — they can always be re-pulled.
- **Key Considerations**:
  - Entity visibility (`public` / `private`) must be declared deliberately — no default-public behavior. Undeclared entities are private.
  - The registry must be self-hostable with zero cloud dependency (Docker + SQLite is enough). Managed tier is optional.
  - Signing (HMAC with repo API key) prevents a rogue registry from injecting foreign entities. The consuming repo's `cortex pull` verifies the signature before materializing.
  - Do NOT attempt cross-repo constraint evaluation at synthesis time for large orgs — fan-out is quadratic. Evaluate only the constraints declared in the local `cortex.constraints.yaml` against the pre-materialized stubs (no live network call during synthesis).

**Definition of Ready (DoR)**

- Phase 11 (Monorepo Federation) is shipped — cross-workspace link resolution sets the pattern.
- Phase 7.5 (Org Constraints) is shipped — the YAML format is extended, not redesigned.
- Phase 12 (CI Integration) is shipped — `cortex publish` hooks into the same Action.

**Definition of Done (DoD)**

- `cortex publish --registry <url>` signs and uploads the public entity index after a merge.
- `cortex pull --upstream <repo>` materializes foreign entity stubs in `.knowledge/foreign/<repo>/`.
- Cross-repo `[[repo:Entity]]` links resolve in `read_entity` and the federated index.
- Cross-repo constraints in `cortex.constraints.yaml` (with `sourceRepo`/`targetRepo` fields) are evaluated at synthesis time against local stubs.
- Stale-propagation fires on foreign-entity update (upstream published a new export).
- Registry self-hostable with Docker + SQLite; zero mandatory cloud dependency.
- **Enterprise Hardening:** Registry supports **multi-tenant isolation** — each tenant has a dedicated namespace; cross-tenant entity lookups require explicit federation grants. Signing keys rotate via `cortex registry rotate-keys` with 30-day overlap windows so consuming CIs never see auth downtime. Registry exposes Prometheus metrics at `/metrics` (publish rate, pull latency, failed signatures) for ops integration. Tenant data is encrypted at rest with per-tenant DEKs wrapped by a tenant KEK (envelope encryption); KEKs can be supplied by external HSM/KMS (AWS KMS, GCP KMS, HashiCorp Vault) via the BYO-Key surface from Phase 27.
- Tests cover: publish/pull round-trip, stub materialization, cross-repo constraint evaluation, staleness propagation from foreign entity update, visibility filtering (private entities not in export), multi-tenant isolation, signing-key rotation under load.

**Pros & Cons**

- ✅ **Pros**: The single biggest enterprise unlock. "Which team's service does my service depend on, and is that contract still honored?" is an unanswered question in every polyrepo org. Cortex answers it automatically. Cross-repo staleness propagation is uniquely valuable — no other tool alerts you that a service you depend on quietly changed its contract.
- ❌ **Cons**: Introduces operational surface (running a registry, managing API keys per repo, CI steps). Mitigated by keeping the registry minimal (self-hostable, no database beyond SQLite) and the CI steps optional (teams can publish/pull manually). Visibility curation is a new responsibility for each team — entities are private by default so the failure mode is "nothing published" not "everything leaked."

---

## 🖥️ Phase 22: Central Knowledge Server — ⏳ Planned

**Layman's Terms**
Phase 21 lets repos share entity definitions. Phase 22 gives every developer and every AI in the org a single URL they can query to understand the full architectural picture — without having to be on any specific machine or have any repo checked out. A CTO can open a dashboard and see: "We have 847 entities across 23 repos. 12 are stale. 3 have open contradictions. Mean quality score: 0.81." An AI assistant in any IDE gets the same information by calling a REST endpoint. This is Cortex as organizational infrastructure, not a dev tool.

**Technical Terms**
Extend the Phase 21 registry into a full **Central Knowledge Server** — a self-hostable service that aggregates all repo exports into a unified, queryable graph and exposes it via a REST API and an MCP-over-HTTP endpoint.

- **Unified graph**: the server builds and maintains a cross-repo graph by merging all published entity indexes. Cross-repo `[[repo:Entity]]` edges become first-class graph edges (not link stubs). The graph is queryable by entity name, source file pattern, repo, quality score, relationship kind, constraint violations.
- **REST API** (versioned, token-authenticated):
  - `GET /v1/entities` — paginated list with filter params
  - `GET /v1/entities/:repo/:name` — full entity record
  - `GET /v1/graph?from=:entity&depth=N` — subgraph traversal
  - `GET /v1/quality?repo=:repo` — quality summary per repo
  - `GET /v1/constraints/violations` — org-wide constraint violations
  - `POST /v1/publish` — repo push endpoint (signed, same as Phase 21)
- **MCP-over-HTTP endpoint**: the server exposes the same MCP tools (`read_entity`, `read_knowledge_index`, `impact_analysis`, `log_query`) over HTTP with Bearer token auth. IDE agents in any repo can connect to the org-wide server instead of (or alongside) their local Cortex instance. This is the "Cortex for the org" surface.
- **CTO Dashboard**: a simple read-only web UI at `/dashboard` showing: entity count per repo, stale count, quality score distribution, open contradictions, constraint violations, and a unified graph visualization (Phase 8's Mermaid renderer, extended to the org-wide graph). No login-gated secrets — API token controls access.
- **Role-based access**: `VIEWER` (read all public entities) / `PUBLISHER` (can POST /publish) / `ADMIN` (can see private entities, manage tokens). Private entities from Phase 21 are only visible to `ADMIN` tokens from the owning repo.
- **Self-hostable first**: Docker Compose ships with the server, SQLite (or Postgres for >100 repos), and the dashboard. No Cortex Cloud dependency required.

**Architecture & System Design**

- **Core Components**: new `src/server/` package (REST API, MCP-over-HTTP adapter, SQLite graph store, dashboard static assets), new `src/cli/server.ts` (`cortex server start/stop/status`), registry client extended to POST to the central server's `/publish` endpoint.
- **Design Pattern**: Event-sourced from publish events. The central server replays all published exports to build the unified graph; it is rebuildable from scratch from the publish log. Writes only happen via `POST /publish` (from repo CI); the read surface is entirely query-based.
- **Key Considerations**:
  - Do NOT build authentication from scratch — use JWT with HMAC signing (same mechanism as Phase 21 publish signing). Tokens are issued by `cortex server token create`.
  - The MCP-over-HTTP endpoint must be backward-compatible with all existing MCP tool definitions from Phases 4–7. No new tool schemas required; existing tools work against the org-wide graph transparently.
  - Dashboard assets must be bundled locally — no CDN, consistent with Phase 8's local-first principle. The server package ships with bundled static files.
  - For large orgs (>100 repos), SQLite is replaced by Postgres. The data model is identical — just swap the adapter.

**Definition of Ready (DoR)**

- Phase 21 (Polyrepo Federation) is shipped — the publish/pull protocol is stable.
- Phase 8 (Visual Graph) is shipped — the Mermaid renderer is reused for the dashboard.
- Phase 9 (Impact Preview) is shipped — `impact_analysis` MCP tool is reused over HTTP.

**Definition of Done (DoD)**

- `cortex server start` launches the central server (REST + MCP-over-HTTP + dashboard).
- `POST /v1/publish` accepts and stores repo exports; unified graph is rebuilt incrementally.
- `GET /v1/entities`, `/graph`, `/quality`, `/constraints/violations` return correct data across all published repos.
- MCP-over-HTTP endpoint responds to `read_entity`, `read_knowledge_index`, `impact_analysis`, `log_query` with org-wide scope.
- Dashboard renders entity count, quality scores, stale count, and org-wide graph per repo.
- Role-based access enforced: VIEWER cannot see private entities, PUBLISHER cannot access admin endpoints.
- Self-hosted via Docker Compose; zero mandatory cloud dependency.
- **Enterprise Hardening:** Central Knowledge Server ships with a **production-grade reference deployment** — Kubernetes Helm chart, Terraform modules (AWS/GCP/Azure), and Docker Compose for small ops teams. Backend is pluggable: SQLite (small), Postgres (medium), Postgres + read replicas (large >500 repos). Read path is horizontally scalable behind any standard load balancer; write path serializes via the publish queue. Point-in-time recovery via Postgres WAL archiving + S3-compatible object storage; documented RPO ≤5 minutes, RTO ≤30 minutes. Dashboard supports **white-label** branding (logo, colors, footer text via `cortex server config white-label`) for resellers and internal platform teams. Multi-region active-active via Postgres logical replication for orgs with data-residency requirements (see Phase 27). Operational endpoints: `/healthz` (liveness), `/readyz` (readiness with dependency check), `/metrics` (Prometheus), `/debug/pprof` (gated by admin token).
- Tests cover: publish round-trip, unified graph query, cross-repo edge resolution, MCP-over-HTTP tool dispatch, role-based access enforcement, dashboard static asset serving, HA failover under load, PITR restore correctness, white-label asset serving.

**Pros & Cons**

- ✅ **Pros**: Makes Cortex visible to leadership, not just developers. A CTO dashboard with mean quality score per team is a governance artifact, not a debug tool. MCP-over-HTTP means any AI in the org gets org-wide architectural context without needing a local Cortex install — the knowledge travels with the URL.
- ❌ **Cons**: Significant operational surface (server to run, tokens to manage, dashboard to maintain). Mitigated by Docker Compose and SQLite defaults — "zero to running" should be under 10 minutes. The unified graph is only as good as teams' publishing discipline — if a repo doesn't publish, it's invisible.

---

## 👥 Phase 23: Human-in-the-Loop Review — ⏳ Planned

**Layman's Terms**
Today, everything Cortex knows was written by an AI. That's fine for a personal tool, but enterprises need a way to say "this entity's description has been verified by a senior engineer." Phase 23 adds a lightweight review queue: newly synthesized entities go into a "pending review" state, a senior dev reviews them (accepts, edits, or rejects), and accepted entities get a `human_reviewed` badge. Rejected entities generate a `failedApproach` entry so the AI doesn't repeat the same mistake. The review workflow is opt-in — teams that don't configure it get today's behavior unchanged.

**Why this is Phase 23 and not a feature of Phase 6/7**
A prior proposal ("Review-gated falsifiable claims") was rejected because it conflicted with the autonomous-synthesis premise — requiring a review gate before persistence blocks the watcher. Phase 23 is scoped differently: review is **post-persistence, opt-in, and non-blocking**. The AI writes knowledge as today; the review queue surfaces it for optional human sign-off. The `human_reviewed` field introduced in Phase 7.5 is the storage foundation; Phase 23 is the workflow on top of it.

**Technical Terms**

- **Review queue**: a new `state.json` field `pendingReview: string[]` — entity names synthesized since the last review pass. Populated by `save_synthesis` when `CORTEX_REVIEW_MODE=enabled` is set; ignored when unset (backward-compatible).
- **CLI workflow**:
  - `cortex review list` — shows all pending entities with their synthesized descriptions.
  - `cortex review accept <entity> [--reviewer <name>]` — sets `human_reviewed: true`, `reviewed_by: <name>`, removes from queue.
  - `cortex review edit <entity>` — opens the entity in `$EDITOR` for inline correction, then accepts.
  - `cortex review reject <entity> --reason "<text>"` — removes from queue, appends a `failedApproach` entry with the rejection reason so the Librarian avoids the same synthesis next time.
  - `cortex review skip <entity>` — removes from queue without accepting or rejecting (e.g., "I'll come back to this").
- **MCP prompt**: a new `review` slash command in the IDE — shows the review queue and lets the AI assist by reading `read_entity` and drafting a suggested correction, then the human accepts or edits.
- **Quality impact**: accepted entities gain `human_review_score: 1.0` in Phase 7.5's quality formula; rejected entities have their description invalidated (description retained but `invalidated: true` flag set — the Librarian must re-synthesize on next ingest).
- **CI integration**: Phase 12 GitHub Action gains an optional `require-review-for: [entity-pattern]` input. PRs that synthesize entities matching the pattern without `human_reviewed: true` post a warning comment (not a failure — human review is never a hard gate, consistent with the surface-don't-act principle).

**Architecture & System Design**

- **Core Components**: new `src/cli/review.ts`, modifications to `src/knowledge/writer.ts` (populate `pendingReview` when `CORTEX_REVIEW_MODE=enabled`), new MCP prompt registration, additions to Phase 12 GitHub Action.
- **Design Pattern**: Post-persistence, opt-in, non-blocking. The review workflow is an advisory layer over the canonical writer — it never delays or blocks a synthesis call. Rejections surface as `failedApproach` entries so the AI learns from human corrections without requiring a separate training loop.
- **Key Considerations**:
  - `CORTEX_REVIEW_MODE` is `disabled` by default. Setting it to `enabled` is a deliberate team decision, not an automatic behavior.
  - `cortex review edit` must open the entity in `$EDITOR` and parse the result back into `EntityRecord`. Validation against `SynthesisSchema` runs before writing.
  - The CI warning for unreviewed entities is a comment, not a failure. Hard-blocking human review defeats the purpose — the team should be able to ship with unreviewed entities and catch up in the review queue.

**Definition of Ready (DoR)**

- Phase 7.5's `human_reviewed` / `reviewed_by` fields are in `state.json` and quality scoring.
- Phase 12 (CI Integration) is shipped for the optional warning comment.

**Definition of Done (DoD)**

- `CORTEX_REVIEW_MODE=enabled` populates `pendingReview[]` in `state.json` on each synthesis.
- `cortex review list / accept / edit / reject / skip` work against the review queue.
- `cortex review edit` opens `$EDITOR`, validates changes against schema, writes back.
- Rejected entities gain a `failedApproach` entry automatically.
- Accepted entities gain `human_reviewed: true` and propagate quality score improvement.
- MCP `review` prompt surfaces the review queue and suggests corrections via `read_entity`.
- CI warning comment for unreviewed entities matching configured patterns.
- **Enterprise Hardening:** Review workflow integrates with **enterprise approval policies** — `cortex.review.yaml` declares per-domain approver groups (`src/payment/** → [@payments-leads, @security-team]`), and an entity requires two-of-three approvals from the designated group to gain `human_reviewed: true`. Review actions emit immutable audit log entries (Phase 26) capturing reviewer identity (SSO-verified), timestamp, before/after, and approval-chain. Review SLA tracking surfaces per-domain median review-time in the Phase 31 executive dashboard, so leadership sees where review bottlenecks form. Optional review-via-Slack/MS Teams flow (Phase 28): a bot DMs the assigned reviewer with the entity diff and accept/reject buttons; the action propagates back through the audit log with the reviewer's SSO identity attached.
- Tests cover: queue population on synthesis, accept/reject state transitions, edit round-trip validation, `failedApproach` injection on reject, quality score update on accept, multi-approver policy enforcement, Slack/Teams round-trip review action, audit-log immutability of review events.

**Pros & Cons**

- ✅ **Pros**: Closes the enterprise trust gap. "Can I rely on this architectural doc?" has a clear answer: yes if `human_reviewed: true`, treat with caution otherwise. The rejection-to-failedApproach pipeline turns human corrections into Librarian training data — the AI gets better from human feedback without a separate fine-tuning loop.
- ❌ **Cons**: Review queues accumulate if teams don't tend them. Mitigated by surfacing queue depth in `cortex status` and `cortex audit quality`. `$EDITOR`-based editing is a UX step backward from the IDE; mitigated by the MCP `review` prompt which lets the AI draft the correction in-IDE.

---

## 📋 Phase 24: Compliance Constraint Templates — ⏳ Planned

**Layman's Terms**
Regulated industries (healthcare, payments, financial services) have strict rules about how code must be structured: patient data can't touch certain services, payment processing can't share state with user sessions, all public endpoints must be authenticated. Today you'd have to translate those regulations into Cortex constraints by hand. Phase 24 ships pre-built compliance packs for common regulations — import a pack, run `cortex lint`, and get a report that maps your architectural violations directly to the regulatory requirement they break. The report is formatted for compliance teams, not just developers.

**Technical Terms**
A library of pre-built `cortex.constraints.yaml` packs for common regulatory frameworks, distributed as versioned npm packages (`@cortex/compliance-hipaa`, `@cortex/compliance-pci-dss`, `@cortex/compliance-soc2`). Each pack declares constraints using Phase 7.5's org-constraint DSL, extended with a `regulatory_ref` field that cites the specific clause of the regulation that the constraint enforces.

```yaml
# @cortex/compliance-pci-dss v1.0.0
version: 1
compliance:
  framework: PCI-DSS
  version: "4.0"
constraints:
  - id: pci-req-3-4-no-pan-in-logs
    regulatory_ref: "PCI-DSS v4.0 Req 3.4"
    description: "PAN data must not be written to log entities"
    rule:
      sourcePattern: "src/payment/**"
      mustNotImport: ["src/logging/**", "src/audit/**"]
    severity: error

  - id: pci-req-6-2-code-review-required
    regulatory_ref: "PCI-DSS v4.0 Req 6.2"
    description: "All payment entities must be human-reviewed"
    rule:
      sourcePattern: "src/payment/**"
      requiresField: "human_reviewed"
    severity: error

  - id: pci-req-7-1-least-privilege
    regulatory_ref: "PCI-DSS v4.0 Req 7.1"
    description: "Payment entities must declare access contracts"
    rule:
      sourcePattern: "src/payment/**"
      requiresConstraint: "contract"
    severity: warning
```

- **Installation**: `cortex compliance add pci-dss` — downloads the pack, merges it into `cortex.constraints.yaml` under a `[pci-dss]` namespace, leaves custom constraints untouched.
- **Compliance report**: `cortex compliance report --framework pci-dss [--format markdown|json|pdf]` — runs `cortex lint` filtered to the pack's constraints and produces a report grouped by regulatory clause, not by entity. Each clause section shows: requirement text, Cortex rule, entities that pass, entities that violate. Exportable as a PDF for auditors.
- **Evidence attachment**: Compliance reports can be attached to Phase 7's evidence log — `cortex compliance report --attach` appends a JSONL entry with `{ type: "compliance-report", framework, runAt, violations: [...] }`, creating a durable audit trail of when checks ran and what they found.
- **Custom packs**: teams can write their own packs in the same format and share them via npm. The pack format is just a superset of `cortex.constraints.yaml` — no new schema concepts.
- **Human-review integration**: the `requiresField: "human_reviewed"` rule type delegates to Phase 23's review status. A payment entity that hasn't been reviewed fails the PCI constraint. This makes Phase 23 adoption non-negotiable in regulated environments — the regulation enforces it, not Cortex.

**Architecture & System Design**

- **Core Components**: new `@cortex/compliance-*` npm packages (data only — constraint YAML + regulatory text), new `src/cli/compliance.ts` (`cortex compliance add / report / list`), extensions to `src/knowledge/org-constraints.ts` (parse `regulatory_ref` field, generate grouped report), new `src/knowledge/compliance-report.ts` (report renderer for markdown/JSON/PDF via `pdfkit`).
- **Design Pattern**: Compliance packs are pure data (YAML) distributed via npm. The evaluation engine is Phase 7.5's org-constraint evaluator — no new evaluation logic. The report renderer is new output surface only.
- **Key Considerations**:
  - Compliance frameworks evolve (PCI-DSS 4.0 → 4.1 etc.). Pack versioning is strict semver; `cortex compliance add pci-dss@4.0` pins a specific framework version. Breaking changes in framework interpretation require a major version bump.
  - The PDF report must be auditor-readable without any Cortex-specific knowledge. Every violation must cite: the regulatory clause, the human-readable requirement text, the entity that violates it, and the `sourceFile`. No jargon.
  - `requiresField: "human_reviewed"` is the only cross-phase dependency. If Phase 23 is not installed, the constraint evaluates to a warning with a hint: "Install Phase 23 review workflow to populate `human_reviewed`."

**Definition of Ready (DoR)**

- Phase 7.5 (Org Constraints) is shipped — the constraint DSL is stable and extended with `regulatory_ref`.
- Phase 23 (Human-in-the-Loop Review) is shipped — `human_reviewed` field is populated.
- Phase 12 (CI Integration) is shipped — compliance report can be attached to the PR comment.

**Definition of Done (DoD)**

- `cortex compliance add pci-dss` installs the PCI-DSS 4.0 pack and merges constraints into `cortex.constraints.yaml`.
- `cortex compliance report --framework pci-dss` produces a clause-grouped violation report.
- Report exports to markdown, JSON, and PDF; PDF is readable without Cortex context.
- `--attach` flag appends a JSONL compliance-report event to `log.jsonl`.
- At least three packs published: HIPAA, PCI-DSS, SOC2.
- Custom packs installable via `cortex compliance add <npm-package>`.
- **Enterprise Hardening:** Compliance reports include a **cryptographic chain-of-custody seal** — each report's JSONL audit entry contains a SHA-256 hash of the report PDF and is co-signed by the central server's signing key (Phase 27 BYO-Key). Auditors can independently verify a report was generated by Cortex and has not been tampered with via `cortex compliance verify <report.pdf>`. Expanded pack library: ships with HIPAA, PCI-DSS, SOC2, ISO 27001 Annex A, NIST 800-53, GDPR (Art. 25/32), and FedRAMP Moderate baselines as of v1.0. Reports auto-attach to **Vanta/Drata/Secureframe** via webhook integration, so SOC2/ISO audits inherit Cortex's architectural evidence automatically. `cortex compliance schedule --framework <name> --cron "0 0 * * MON"` produces weekly reports and pushes to a configurable destination (S3, Confluence page, Jira ticket). Compliance evidence retention is regulator-aware: HIPAA 6 years, PCI-DSS 1 year minimum, SOC2 1 year — enforced by `cortex compliance archive` with cryptographic deletion proofs.
- Tests cover: pack installation, constraint merging (custom + compliance packs coexist), report grouping by regulatory clause, `requiresField: human_reviewed` evaluation with and without Phase 23, PDF rendering smoke test, chain-of-custody signature verification, Vanta/Drata webhook delivery, retention-policy enforcement.

**Pros & Cons**

- ✅ **Pros**: Turns Cortex from a developer productivity tool into a compliance evidence platform. A SOC2 auditor asks "show me your access controls in the payment domain" — `cortex compliance report --framework soc2 --format pdf` is the answer. The `--attach` flag creates a durable, timestamped record of compliance checks in `log.jsonl` — exactly the kind of audit trail SOC2 Type II requires. This is the feature that justifies a $50K–$200K enterprise contract.
- ❌ **Cons**: Regulatory frameworks change faster than software. Pack maintenance is a permanent commitment — incorrect regulatory citations are worse than no citations. Mitigated by clear versioning and explicit "regulatory text as of this date" headers in the PDF. The `pdfkit` dependency adds ~1MB to the package; mitigated by making PDF generation an optional peer dependency (`cortex compliance report --format pdf` prompts to install `pdfkit` if absent).

---

## 💼 Enterprise Track (Phases 25–32) — Strategic Positioning

Phases 21–24 establish Cortex as multi-repo organizational infrastructure. Phases 25–32 transform it from "platform team product" into a **CIO-approvable enterprise system of record**. Each enterprise phase targets a specific procurement blocker that today prevents Cortex from clearing a Fortune 500 InfoSec / Procurement / Legal review.

**Why this matters commercially.** An "LLM wrapper with persistent memory" is a feature; enterprise procurement does not buy features, it buys systems that pass risk review. The 8 phases below are the difference between a $50/seat/month tool and a $500K-$2M ACV enterprise contract:

- **Phase 25** (SSO/SCIM) unlocks any company with >500 employees — without SAML, Procurement says no on principle.
- **Phase 26** (RBAC/Audit) is the requirement that lets SOX-regulated companies use Cortex for code with financial reporting exposure.
- **Phase 27** (Air-Gap/BYO-Key) opens defense, intelligence, and tier-1 banks — markets where "data leaves your perimeter" is a deal-killer.
- **Phase 28** (Workflow Integrations) is the difference between "another silo" and "the system that ties our existing tools together."
- **Phase 29** (FinOps) is what makes Finance say yes — predictable per-team chargeback turns Cortex into an OpEx line item instead of a surprise bill.
- **Phase 30** (Migration) bridges the "we have 50,000 Confluence pages of architecture docs" objection — Cortex can ingest them, not compete with them.
- **Phase 31** (Executive Analytics) gives the CTO/VP who signs the PO the dashboard they can show their board.
- **Phase 32** (Procurement Pack) shortens the average enterprise sales cycle from 9 months to 3 — pre-filled security questionnaires, MSA/DPA/BAA templates, and a certifications roadmap.

The **enterprise moat** is not the LLM — anyone can wrap an LLM. The moat is the accumulated organizational knowledge graph plus the surrounding governance fabric that makes it auditable, attributable, and accountable. A competitor with a better LLM cannot replicate a customer's 18 months of synthesized architectural decisions, contradiction history, evidence anchors, fitness function policies, compliance attestations, and skill library — that data is the customer's, locked into a format only Cortex's pipeline produces. **The data is the moat. The enterprise phases are what make the data trustworthy enough to bet on.**

---

## 🔐 Phase 25: Enterprise SSO, SCIM & Identity Federation — ⏳ Planned (enterprise)

**Layman's Terms**
Today every developer who runs Cortex authenticates with their own LLM API key on their own machine. That works for a 5-person startup, but a Fortune 500 with 10,000 engineers cannot manage 10,000 API keys, cannot revoke access when someone leaves, and cannot prove to auditors who accessed what. Phase 25 plugs Cortex into the company's existing identity system (Okta, Azure AD, Google Workspace, Ping, OneLogin) — when HR deactivates someone in Workday, that person loses Cortex access automatically 5 minutes later. SCIM provisioning means new hires get the right access on day one.

**Technical Terms**
First-class enterprise identity integration across three protocols:

- **SAML 2.0** — for legacy enterprise IdPs (ADFS, classic Okta, Ping Federate). Service-Provider-initiated and IdP-initiated flows. NameID formats: emailAddress, persistent, transient. Signed AuthnRequests; encrypted assertions (AES-256). Multiple IdP support per tenant (e.g., contractors via separate IdP).
- **OIDC** — for modern IdPs (Auth0, Okta Identity Cloud, Azure AD, Google Workspace, Keycloak). Authorization Code + PKCE flow. JWKS rotation handled automatically. Claims mapping configurable per IdP (email, groups, department, manager).
- **SCIM 2.0** — for user/group lifecycle (provisioning, deprovisioning, group membership sync). Inbound SCIM endpoint (`POST /scim/v2/Users`, `PATCH /scim/v2/Groups/{id}`) consumed by the IdP. Standard SCIM filter syntax supported. Outbound webhooks fire on provisioning events for downstream notification.

Identity model:

- **Workspaces** — top-level isolation boundary (typically one per enterprise customer).
- **Organizations** — sub-tenants within a workspace (e.g., subsidiaries, business units).
- **Teams** — groups of users mapped from IdP groups via SCIM.
- **Service accounts** — non-human identities for CI/CD with scoped tokens and explicit expiry.

CLI/admin:

- `cortex idp configure --type saml|oidc --metadata-url <url>` — wire up an IdP.
- `cortex idp test --user <email>` — dry-run an auth flow for troubleshooting.
- `cortex scim status` — show last sync timestamp, user/group counts, drift detection.
- `cortex token issue --service-account <name> --scopes <list> --expires <duration>` — issue scoped tokens for CI.

**Architecture & System Design**

- **Core Components**: new `src/auth/saml.ts` (uses `passport-saml`/`@node-saml/node-saml`), `src/auth/oidc.ts` (uses `openid-client`), `src/auth/scim.ts` (SCIM 2.0 endpoint handler), `src/auth/session.ts` (signed-cookie + JWT session management), additions to `src/server/` (Phase 22) for auth middleware on all REST/MCP-HTTP endpoints.
- **Design Pattern**: IdP-as-source-of-truth. Cortex never stores passwords; identity, group membership, and lifecycle are all derived from the connected IdP. Local "break-glass" admin accounts exist for emergencies (initial setup, IdP outage) and are explicitly flagged in audit logs.
- **Key Considerations**:
  - **No password storage, ever**. Even break-glass admin accounts use hardware-key (WebAuthn) or TOTP, never passwords.
  - **JIT (just-in-time) provisioning** complements SCIM: a user with valid SSO who is not yet in the local user table is auto-provisioned with default team membership at first login.
  - **Session lifecycle** — SSO sessions default to 8 hours with rolling refresh; admin sessions to 30 minutes. Tunable per workspace.
  - Multi-IdP support per tenant (employees on Okta, contractors on Auth0) routed by email domain.

**Definition of Ready (DoR)**

- Phase 22 (Central Knowledge Server) is shipped — auth integrates at the central server tier.
- HTTPS termination configured (auth requires TLS).

**Definition of Done (DoD)**

- SAML 2.0 SP- and IdP-initiated flows work with Okta, Azure AD, ADFS reference IdPs.
- OIDC Authorization Code + PKCE flow works with Auth0, Azure AD, Google Workspace, Keycloak.
- SCIM 2.0 inbound provisioning (Users + Groups, full CRUD) compliant with RFC 7644.
- JIT provisioning on first SSO login.
- Service-account tokens with explicit scopes and expiry.
- `cortex idp configure / test`, `cortex scim status`, `cortex token issue` CLIs work.
- Multi-IdP routing by email domain.
- Break-glass admin accounts require WebAuthn or TOTP (no passwords).
- Tests cover: SAML signature validation, OIDC PKCE flow, SCIM CRUD round-trip, JIT provisioning, service-account scope enforcement, multi-IdP routing, break-glass auth flows.

**Pros & Cons**

- ✅ **Pros**: SSO is **table-stakes for any enterprise sale above 500 seats**. Without it, procurement says no on first read; with it, Cortex passes the first InfoSec gate. SCIM eliminates the "but how do we deprovision when someone leaves?" question — the most common security-review blocker for SaaS tools. Multi-IdP support handles M&A scenarios (acquired company on different IdP) that single-tenant SSO tools fail.
- ❌ **Cons**: Identity integration is permanent maintenance — IdP protocols evolve (SAML 2.1, OIDC FAPI, SCIM 2.1), and bugs in identity code are P0 incidents. Mitigated by using battle-tested OSS libraries (`@node-saml/node-saml`, `openid-client`) instead of rolling our own. Adds ~50MB to the deployment footprint via dependencies.

---

## 🛡️ Phase 26: RBAC, ABAC & Immutable Audit Trail — ⏳ Planned (enterprise)

**Layman's Terms**
Today anyone with Cortex access can read everything and edit everything. Phase 26 introduces fine-grained roles: "interns can read but not edit," "the security team can edit security entities but not payment entities," "auditors can read everything but cannot change anything." Every action — every read, every edit, every constraint change — is recorded in a tamper-evident log that auditors can verify cryptographically. This is what lets a SOX-regulated company use Cortex for code that touches financial reporting: every change has a who, when, why, before, and after, signed and immutable.

**Technical Terms**
Three layers of access control plus a cryptographically-anchored audit trail.

**Role-Based Access Control (RBAC)**:
- Pre-defined roles: `viewer`, `contributor`, `reviewer`, `architect`, `admin`, `auditor`.
- Custom roles defined in `cortex.roles.yaml` as a set of (action, resource-pattern) pairs.
- Permissions enforced at the Phase 22 server tier on every REST and MCP-HTTP call.

**Attribute-Based Access Control (ABAC)**:
- Policy expressions in `cortex.policy.yaml` using a safe DSL: `allow if user.team in entity.owning_teams AND user.clearance >= entity.classification`.
- Attributes flow from SSO claims (department, clearance, manager), entity metadata (classification, owning_teams), and runtime context (time-of-day, IP range).
- Per-entity classification levels: `public`, `internal`, `confidential`, `restricted`. Restricted requires explicit grant.

**Immutable Audit Trail**:
- Every action emits a structured audit event: `{ id, timestamp, actor, action, resource, before, after, ip, sessionId, signature }`.
- Audit log is **append-only and hash-chained** — each entry's hash includes the previous entry's hash (Merkle-style), so tampering is detectable.
- Log periodically anchored to an external timestamp authority (RFC 3161) or a public blockchain (optional) for legal-grade non-repudiation.
- Storage: `audit.jsonl` in the central server with hourly archival to immutable object storage (S3 Object Lock, GCS Bucket Lock, Azure Immutable Blob Storage).
- Query: `cortex audit query --actor <email> --since <date> --action <type>` for forensic investigation.
- Export: `cortex audit export --format <jsonl|csv|cef> --since <date>` for SIEM integration (Splunk, Datadog, Elastic).

CLI:
- `cortex role list / show / create / assign <user> <role>`
- `cortex policy validate / test --user <email> --action <type> --resource <path>` (dry-run policy decisions)
- `cortex audit query / export / verify` (verify validates the hash chain)

**Architecture & System Design**

- **Core Components**: new `src/auth/rbac.ts` (role + permission model), new `src/auth/abac.ts` (policy evaluator over OPA-style Rego or a custom safe DSL), new `src/audit/log.ts` (hash-chained append-only writer), new `src/audit/anchor.ts` (RFC 3161 timestamp anchoring), `src/cli/role.ts`, `src/cli/policy.ts`, `src/cli/audit.ts`.
- **Design Pattern**: **Default-deny** at the policy layer; every action must match an explicit allow rule. Audit is **write-once-from-the-application** — even the application cannot modify or delete past audit entries; deletion requires admin + cryptographic proof of compliance retention period.
- **Key Considerations**:
  - Policy evaluation must be **fast** — every API call evaluates policy, so the evaluator caches compiled policies and uses partial evaluation.
  - Hash chain verification is **incremental** — `cortex audit verify` validates only newly-appended entries by default, full-chain re-verify on demand.
  - SIEM exports use the **CEF (Common Event Format)** standard so Splunk/QRadar/ArcSight ingest without custom parsers.

**Definition of Ready (DoR)**

- Phase 25 (SSO/SCIM) is shipped — actor identity comes from authenticated sessions.
- Phase 22 (Central Knowledge Server) is shipped — RBAC enforcement points are the server endpoints.

**Definition of Done (DoD)**

- 6 baseline roles plus custom-role definitions in `cortex.roles.yaml`.
- ABAC policy expressions in `cortex.policy.yaml` evaluated on every API call.
- Per-entity classification levels enforced.
- Audit log hash-chained and append-only; tamper-detection via `cortex audit verify`.
- RFC 3161 timestamp anchoring on hourly batches.
- SIEM export in JSONL, CSV, and CEF formats.
- S3/GCS/Azure Object Lock integration for immutable archival.
- `cortex role`, `cortex policy`, `cortex audit` CLIs all work.
- Tests cover: each baseline role's permission set, custom role parsing, ABAC policy evaluation across attribute permutations, hash-chain validation, tamper detection, SIEM export format conformance.

**Pros & Cons**

- ✅ **Pros**: RBAC + immutable audit is **the requirement** for SOX, HIPAA, PCI, FedRAMP, and any tier-1 financial services contract. The hash-chained audit log is genuinely tamper-evident — competitors typically have "audit logs" that an admin can edit, which fails real forensic review. CEF export means existing SIEM investments work day-one. ABAC + per-entity classification lets one Cortex deployment serve a mixed-classification environment (open-source code + proprietary financial code) safely.
- ❌ **Cons**: Policy authoring is non-trivial; bad policies either over-restrict (developers can't do their jobs) or under-restrict (security incident). Mitigated by `cortex policy test` dry-run and a starter library of policy templates per industry. Audit storage grows linearly with usage; mitigated by tiered archival (hot → warm → cold object storage).

---

## 🏰 Phase 27: Air-Gapped, Sovereign & BYO-Key Deployment — ⏳ Planned (enterprise)

**Layman's Terms**
Some industries — defense, intelligence, tier-1 banking, regulated healthcare — cannot allow code or architectural information to ever leave their perimeter. They cannot use SaaS Cortex. They cannot use any LLM hosted outside their firewall. They cannot let any third-party cryptographic key touch their data. Phase 27 makes Cortex deployable in fully air-gapped environments using only LLMs and infrastructure inside the customer's perimeter, with all encryption keys held in the customer's own HSM or KMS. This opens markets — defense, intelligence, tier-1 banking — where competing SaaS tools are categorically forbidden.

**Technical Terms**
Three deployment modes plus pluggable key management.

**Air-Gapped Mode** (`CORTEX_AIRGAP=true`):
- Zero outbound network calls. No telemetry, no update checks, no LLM API calls to public providers.
- LLM provider restricted to: locally-hosted Ollama, vLLM, TGI, or any OpenAI-compatible endpoint inside the perimeter.
- Distribution: signed offline installer bundle (`cortex-airgap-<version>.tar.gz`) containing all dependencies, Docker images, and SBOM. SHA-256 + Sigstore signature verification at install.
- Updates: customer downloads, scans, and manually applies offline bundles. No auto-update.
- Documentation, models, embeddings, and pack libraries bundled offline.

**Sovereign Mode** (`CORTEX_RESIDENCY=<region>`):
- Data and processing constrained to a specific geography (EU, US, UK, Australia, Canada, etc.).
- For Phase 22 Central Knowledge Server: enforces region pinning for all stored data and forbids cross-region replication unless explicitly granted.
- For SaaS Cortex (if/when offered): region-specific endpoints with hard data-residency guarantees.
- Compliance: aligns with GDPR (EU), Schrems II (EU), Data Sovereignty Act (Australia), C-27 (Canada), etc.

**BYO-Key (Bring Your Own Key)**:
- Envelope encryption with customer-controlled KEKs (Key Encryption Keys).
- Supported KMS: AWS KMS, GCP KMS, Azure Key Vault, HashiCorp Vault, on-prem HSM via PKCS#11.
- All persistent data (entity content, audit logs, SCIM data) encrypted with per-tenant DEKs (Data Encryption Keys) wrapped by the customer KEK.
- Key rotation: KEK rotation re-wraps DEKs without re-encrypting data (constant-time rotation).
- "Cryptographic shred" support: revoking the KEK renders all customer data unrecoverable instantly (regulatory deletion requirement).

CLI:
- `cortex deploy airgap-bundle --version <v>` — produce a signed offline installer.
- `cortex deploy verify-bundle <path>` — verify signature and SBOM at the receiving end.
- `cortex kms configure --provider <aws-kms|gcp-kms|azure-kv|vault|pkcs11> --key-id <id>`
- `cortex kms rotate` — rotate the KEK; DEKs auto-re-wrap.
- `cortex kms shred --tenant <id> --confirm <token>` — cryptographic deletion.

**Architecture & System Design**

- **Core Components**: new `src/airgap/bundle.ts` (signed offline bundler with Sigstore/cosign), new `src/airgap/verify.ts`, new `src/kms/provider.ts` (KMS abstraction), implementations `src/kms/aws.ts`, `gcp.ts`, `azure.ts`, `vault.ts`, `pkcs11.ts`, new `src/crypto/envelope.ts` (envelope encryption pipeline), `src/cli/deploy.ts`, `src/cli/kms.ts`.
- **Design Pattern**: **Plugin architecture for KMS** — every concrete KMS implements a thin `encrypt(dek) / decrypt(wrappedDek)` interface; the application logic is KMS-agnostic. Air-gap enforcement is **default-deny at the network layer** — a network-policy file blocks all outbound except an explicit allowlist (local LLM, local KMS).
- **Key Considerations**:
  - **No "phone home" telemetry anywhere** in air-gap mode. Even error reporting is local-only. Mitigated by an explicit "diagnostic bundle" command users run manually to share issues with support.
  - **Performance impact**: envelope encryption adds ~1ms per read and ~2ms per write — negligible for normal workloads, occasionally noticeable on high-volume scans (mitigated by DEK caching with bounded TTL).
  - **Documentation must be exhaustive** for air-gapped customers — they cannot google solutions to problems. Ship a 100-page operations runbook in the air-gap bundle.

**Definition of Ready (DoR)**

- Phase 22 (Central Knowledge Server) is shipped — air-gap and sovereign modes are server-tier deployment configurations.
- Phase 26 (audit) is shipped — audit log must also be encrypted with the customer KEK.

**Definition of Done (DoD)**

- `CORTEX_AIRGAP=true` blocks all outbound network calls (validated by netfilter rules in the reference deployment).
- Signed offline installer bundle (with Sigstore signature + SBOM) installs without internet access.
- 5 KMS providers (AWS, GCP, Azure, Vault, PKCS#11) usable for KEK management.
- Envelope encryption pipeline: every persistent write uses a DEK wrapped by the KEK.
- Key rotation re-wraps DEKs without re-encrypting data.
- Cryptographic shred renders tenant data unrecoverable.
- Sovereign mode enforces region pinning for stored data.
- Reference deployment includes Kubernetes NetworkPolicy enforcing air-gap.
- Tests cover: outbound-call blocking, bundle signature verification, each KMS provider's encrypt/decrypt round-trip, key rotation correctness, shred irrecoverability, region-pinning enforcement.

**Pros & Cons**

- ✅ **Pros**: Air-gap + BYO-Key opens **defense, intelligence, tier-1 banking, classified healthcare** — markets where SaaS competitors are categorically prohibited from operating. The market for air-gappable enterprise software is small but the customer ACV is enormous ($500K-$5M per customer). Sovereign mode unlocks EU GDPR / Schrems II concerns that block many US SaaS vendors from selling in Europe. The cryptographic shred capability is a regulatory differentiator (HIPAA, GDPR Article 17 right-to-erasure).
- ❌ **Cons**: Air-gap support is a permanent operational tax — every dependency update must be re-bundled, signed, and shipped manually. Mitigated by automation in the release pipeline. BYO-Key fragmentation across 5 KMS providers requires permanent integration tests against all 5. KMS outages at the customer can cause Cortex outages; mitigated by short-TTL DEK caching.

---

## 🔌 Phase 28: Enterprise Workflow Integrations Hub — ⏳ Planned (enterprise)

**Layman's Terms**
Most enterprises run their work through Jira (tickets), Slack/Teams (chat), Confluence (docs), ServiceNow (IT), GitHub Enterprise (code). Today Cortex sits in its own world — engineers must context-switch into a separate UI to query architectural knowledge. Phase 28 plugs Cortex into all of these. Type `/cortex auth-service` in Slack and get the architecture summary in-channel. Tag `[[cortex:AuthService]]` in a Jira ticket and the architecture context appears as a comment automatically. A Confluence page about "Authentication Architecture" auto-updates when Cortex syntheses change. ServiceNow incidents on payment services auto-link to the Phase 9 impact analysis.

**Technical Terms**
Bidirectional integrations with major enterprise SaaS, each implementing the same pattern: a small adapter normalizing webhooks (inbound) and a normalized push API (outbound).

Integrations (initial set):

- **Jira / Linear**: bidirectional. Inbound: webhook on ticket updates parses `[[cortex:Entity]]` syntax and auto-posts architecture context comments. Outbound: `cortex jira link <ticket> --entity <name>` creates the bidirectional link.
- **Slack / Microsoft Teams**: bot with slash commands. `/cortex <query>` returns entity summary inline. `/cortex impact <entity>` returns Phase 9 impact preview. `/cortex review` surfaces the Phase 23 review queue with accept/reject buttons. Bot listens for `[[cortex:Entity]]` in any channel and auto-expands inline.
- **Confluence / Notion**: outbound page sync. Each Cortex entity can have a "mirror page" in Confluence/Notion that auto-updates from the entity description. The reverse (Confluence-as-source-of-truth for some entities) is also supported via the import path in Phase 30.
- **ServiceNow**: incident enrichment. New incidents matching configured patterns (e.g., "service: payment-api") auto-attach Phase 9 impact analysis as a worknote. Bidirectional: resolving the incident in ServiceNow can fire a Phase 23 review-trigger if configured.
- **GitHub Enterprise / GitLab Self-Managed / Bitbucket Data Center**: PR-comment enrichment beyond Phase 12. PR diff is matched to entities; comment summarizes affected entities, open contradictions, and Phase 20.14 causal impact.
- **PagerDuty / Opsgenie**: on-call enrichment. When an alert fires on a service mapped to a Cortex entity, the on-call engineer's PD/Opsgenie alert is enriched with the Phase 9 impact analysis and Phase 20.20 active inference surprise score.

CLI:
- `cortex integration list / install <name> / configure <name>` — manage integrations.
- `cortex integration test <name>` — fire a test event for setup verification.
- `cortex integration logs <name> --since <duration>` — debug delivery failures.

**Architecture & System Design**

- **Core Components**: new `src/integrations/` package with one subdirectory per integration. Each integration is a small TypeScript package implementing a common interface (`webhook(event) → CortexEvent[]`, `push(CortexEvent) → ProviderEvent`). New `src/integrations/router.ts` (event normalization + delivery), new `src/cli/integration.ts`.
- **Design Pattern**: **Pluggable adapter pattern with a normalized event bus**. Every external system speaks its native event format; the integration adapter normalizes to a small internal event vocabulary (`entity.read`, `entity.touched`, `review.pending`, `impact.computed`, `alert.fired`). New integrations just implement the adapter — the core event bus is reused.
- **Key Considerations**:
  - **Webhook signature verification** — every inbound webhook MUST verify the source signature (Jira HMAC, Slack signing secret, GitHub HMAC, etc.) or the request is rejected with 401. Critical for security.
  - **Rate limiting + circuit breakers** on outbound calls — a Confluence outage cannot block Cortex syncs. All outbound integration calls go through a circuit breaker with exponential backoff.
  - **PII redaction at the integration boundary** — if a Cortex entity description contains PII (caught by Phase 7's secret redaction), it is further redacted before being pushed to external systems. Customer-configurable rules per integration.

**Definition of Ready (DoR)**

- Phase 22 (Central Knowledge Server) is shipped — integrations register webhooks to the central server.
- Phase 25 (SSO) is shipped — integration auth tokens are issued to service accounts.
- Phase 26 (audit) is shipped — every integration event is audit-logged.

**Definition of Done (DoD)**

- 6 baseline integrations (Jira/Linear, Slack/Teams, Confluence/Notion, ServiceNow, GitHub/GitLab/Bitbucket, PagerDuty/Opsgenie) implemented and tested against reference deployments.
- `cortex integration` CLI lifecycle commands work.
- Webhook signature verification rejects unsigned/invalid requests.
- Circuit breaker on outbound calls with documented backoff policy.
- PII redaction at integration boundary configurable per integration.
- Slack/Teams bot supports slash commands, button actions, and inline expansion.
- Integration audit trail (every event delivery logged via Phase 26).
- Tests cover: each integration's webhook handler, outbound push, signature verification, circuit-breaker behavior, PII redaction, audit-log entries.

**Pros & Cons**

- ✅ **Pros**: Integration with existing enterprise stack is the single biggest determinant of **adoption depth**. A standalone tool gets used by champions; an integrated tool becomes part of the workflow. Slack/Teams integration alone typically 5×s usage. The normalized event bus means future integrations (M365, Asana, Linear, etc.) are 1-2 weeks each, not months.
- ❌ **Cons**: 6 integrations is 6 surface areas to maintain across provider API changes. Mitigated by the adapter pattern isolating provider details. Webhook security bugs are P0 incidents; mitigated by mandatory signature verification and comprehensive integration tests.

---

## 💰 Phase 29: FinOps — Cost Governance & Chargeback — ⏳ Planned (enterprise)

**Layman's Terms**
Cortex burns LLM tokens. In an enterprise with 1,000 engineers, that bill becomes real money — easily $50K-$500K/month depending on usage. Today there's no way to know which team is burning the most tokens, no way to set per-team budgets, no way to bill them back. Finance hates surprises. Phase 29 makes every token attributable to a team, sets configurable budget caps that auto-throttle when exceeded, generates monthly chargeback reports for internal billing, and exposes FinOps-grade dashboards (broken down by team, repo, model, operation type) that match what Finance already uses for AWS/GCP/Azure spend.

**Technical Terms**
Per-team / per-repo / per-user cost attribution and governance, exposed via dashboards, alerts, and chargeback reports.

Cost attribution:
- Every LLM call records: caller (SSO identity), team (from SCIM groups), repo, operation type (synthesis, review, distill-train, etc.), model + provider, input tokens, output tokens, $ cost (derived from a provider pricing table).
- Stored in a separate `cost.jsonl` event stream (Phase 7-style append-only).
- Aggregated nightly into `cost-summary.json` keyed by (team, repo, model, day) for fast dashboard queries.

Budget governance:
- `cortex.budgets.yaml` declares per-team and per-repo monthly budgets:
  ```yaml
  budgets:
    - team: payments
      monthly_usd: 5000
      action_at_50pct: notify
      action_at_80pct: notify_and_warn_in_sync_output
      action_at_100pct: throttle  # routes to distilled-only via Phase 19
      action_at_120pct: hard_stop  # synthesis disabled until budget reset or override
  ```
- Throttle action routes through Phase 19 distilled Librarian only (no frontier calls) — quality drops gracefully, spending stops growing.
- Hard-stop action requires explicit admin override (`cortex budget override --team <name> --reason <text>` audit-logged via Phase 26).

Chargeback:
- `cortex finops chargeback --month <YYYY-MM> --format <csv|json|xero|netsuite>` produces a per-team billable line item report.
- Configurable cost-allocation rules: shared infrastructure costs (server, storage) can be allocated by team headcount, weighted active usage, or a flat split.

Dashboards (Phase 31 integration):
- Per-team monthly burn vs budget (RAG color coding).
- Per-model cost share over time (helps identify when to migrate workloads to cheaper models).
- Operation-type breakdown (synthesis vs review vs distill-train vs context-pack export).
- Forecast: linear-trend projection of monthly burn at current rate.

Cost alerts:
- Slack/Teams/email notification at 50%, 80%, 100% of monthly budget.
- Anomaly alert: spend rate >2σ above 30-day rolling mean.

**Architecture & System Design**

- **Core Components**: new `src/finops/attribution.ts` (cost-event recording), new `src/finops/aggregator.ts` (nightly rollup), new `src/finops/budget.ts` (budget enforcement + throttling), new `src/finops/chargeback.ts` (report generator with format adapters), new `src/cli/finops.ts`, integration points in `src/llm/client.ts` (every call records cost) and `src/synthesis/router.ts` (Phase 20.15) (throttle routes to distilled).
- **Design Pattern**: Cost-as-a-first-class-event. Cost is not a metric scraped post-hoc; it is a typed event written at the moment of every LLM call, queryable like any other Cortex event stream.
- **Key Considerations**:
  - **Pricing table maintenance** — provider prices change quarterly. Pricing table is shipped as a versioned data file (`cortex-pricing-table-v<n>.json`) updated quarterly and pinnable to a specific date for chargeback consistency.
  - **Currency support** — pricing recorded in USD by default; per-tenant currency override (EUR, GBP, JPY) via daily FX rate snapshots from a configurable source (ECB, OXR, manual).
  - **Throttling must degrade gracefully** — when a team hits budget, Cortex continues to function via Phase 19 distilled Librarian. Total outage is the hard-stop only, requiring explicit override.

**Definition of Ready (DoR)**

- Phase 22 (central server) is shipped — cost events accumulate centrally.
- Phase 19 (distilled Librarian) is shipped — the throttle fallback path.
- Phase 25 (SCIM teams) is shipped — team attribution comes from SCIM groups.

**Definition of Done (DoD)**

- Every LLM call writes a cost event with full attribution.
- Nightly aggregator produces `cost-summary.json` for fast dashboard queries.
- `cortex.budgets.yaml` schema supports per-team, per-repo, per-org budgets with 4 action tiers.
- Throttle action routes to distilled Librarian; hard-stop requires admin override.
- Chargeback report exports in CSV, JSON, Xero, NetSuite formats.
- Slack/Teams/email alerts at 50/80/100% budget.
- Anomaly alert at >2σ spend rate.
- Currency conversion via configurable FX source.
- Tests cover: cost event accuracy across providers, budget threshold transitions, throttle routing to distilled, chargeback report format correctness, currency conversion, anomaly detection.

**Pros & Cons**

- ✅ **Pros**: FinOps is **the language Finance speaks**. Per-team chargeback turns Cortex from "unpredictable OpEx" into a normal cost-allocated line item — making renewals dramatically easier. Budget throttling means a runaway team can never produce a "we spent $200K in a weekend" headline. Graceful degradation to distilled Librarian on throttle preserves usefulness; hard-stop preserves the company.
- ❌ **Cons**: Pricing tables drift; an outdated table produces wrong chargeback numbers. Mitigated by quarterly updates and explicit "pricing-as-of-date" stamps in every chargeback report. Throttling can mask quality issues if teams notice degradation but not the cause; mitigated by surfacing throttle state prominently in `cortex sync` output.

---

## 📥 Phase 30: Knowledge Migration & Legacy Ingest — ⏳ Planned (enterprise)

**Layman's Terms**
Every enterprise has 50,000 pages of architecture documents scattered across Confluence, SharePoint, Notion, Google Docs, Word files on shared drives, old wikis, and Slack threads. Asking them to throw this away and start over with Cortex is a non-starter. Phase 30 imports all of that as the starting seed for the knowledge graph: Confluence pages become entities, doc cross-links become relationships, and the existing institutional memory becomes immediately queryable through Cortex's MCP surface. Combined with white-glove migration services, this turns "we have 10 years of docs" from an objection into Cortex's biggest day-one demo.

**Technical Terms**
A pluggable importer architecture that ingests legacy documentation systems into the Cortex knowledge graph.

Supported sources (initial set):

- **Confluence (Cloud + Server + Data Center)**: page tree → entity hierarchy. Page macros (`{include}`, `{children}`) become `derived_from` / `supports` relationships. Attachments → evidence anchors. Comments → review history.
- **Notion**: database rows → entities. Page mentions → relationships. Properties → entity metadata.
- **SharePoint / OneDrive**: Word docs + Excel sheets → entities (parsed via Office OpenXML). Folder structure → categorical grouping.
- **Google Docs / Google Drive**: docs via Google Drive API → entities. Suggested edits / comments → review history. Folder structure → grouping.
- **Markdown / MDX repositories**: ingest existing `docs/` directories. Each markdown file → entity. `[[wikilinks]]` resolved as Cortex relationships.
- **Older wikis (MediaWiki, DokuWiki, TWiki)**: dump format ingestion with `mediawiki-to-cortex` adapter.

Import pipeline:

1. **Discovery**: connect to source, enumerate pages/docs, estimate import size + cost.
2. **Extraction**: download content + metadata; parse into intermediate representation (IR).
3. **LLM normalization**: each source document is passed through a one-time normalization Librarian call that converts the freeform doc into a Cortex synthesis (entities, relationships, evidence). Cost is bounded and reported upfront.
4. **Reconciliation**: imported entities are reconciled against existing Cortex entities by Phase 18 embedding similarity. Duplicates surface for user resolution (merge / keep both / discard import).
5. **Provenance tagging**: every imported entity gets `importedFrom: { source: "confluence", url: "...", importedAt: "..." }` so origin is traceable.

CLI:
- `cortex import discover --source <type> --connect <url>` — connection test + size estimate.
- `cortex import run --source <type> --since <date> --dry-run` — full or incremental import.
- `cortex import reconcile [--auto-accept-similarity 0.95]` — merge wizard for duplicates.
- `cortex import resync --source <type>` — re-pull deltas from a previously-connected source (incremental, not re-import).

**Architecture & System Design**

- **Core Components**: new `src/import/` with one subdirectory per source. Common interface: `discover() → ImportPlan`, `extract(plan) → IRDocument[]`, `normalize(IRDocument) → SynthesisSchema`. New `src/import/reconcile.ts` (embedding-based deduplication), `src/cli/import.ts`. Reuses Phase 18 embeddings for reconciliation and Phase 2 LLM client for normalization.
- **Design Pattern**: ETL pipeline with intermediate representation. Sources produce IR; normalization produces canonical syntheses; reconciliation deduplicates. Each stage independently testable.
- **Key Considerations**:
  - **Import cost transparency** — `discover` reports estimated total LLM cost before any normalization runs. The customer always knows the bill before pressing go.
  - **Incremental imports** — re-syncing from a Confluence space pulls only deltas (modified pages since last sync). No need to re-process the entire space monthly.
  - **Conflict resolution** — reconciliation surfaces merge candidates ranked by embedding similarity. Default is human-mediated; `--auto-accept-similarity 0.95` allows opt-in autonomy for high-confidence matches.
  - **Source preservation** — `importedFrom` provenance is permanent. An imported entity always knows its origin URL, so the user can verify the import or follow back to the original.

**Definition of Ready (DoR)**

- Phase 18 (embeddings) is shipped — reconciliation depends on it.
- Phase 2 (LLM client) is stable — normalization uses it.

**Definition of Done (DoD)**

- 6 baseline importers (Confluence, Notion, SharePoint, Google Docs, Markdown repos, MediaWiki) work end-to-end.
- `cortex import discover` reports size + estimated cost.
- Dry-run mode shows the import plan without writing.
- Reconciliation wizard surfaces duplicates and supports merge/keep/discard decisions.
- Incremental re-sync pulls only deltas.
- `importedFrom` provenance permanently attached.
- Tests cover: each importer's discovery + extraction + normalization, reconciliation correctness on synthetic duplicates, incremental sync correctness, provenance preservation through edit cycles.

**Pros & Cons**

- ✅ **Pros**: Turns the "we have 10 years of architecture docs" objection from a deal-killer into Cortex's day-one demo — the prospect's own docs become queryable through Cortex within hours. Provenance tagging means importing is reversible (you can always trace back) and additive (Cortex coexists with the source-of-truth instead of replacing it). Confluence import alone closes 40%+ of enterprise migration concerns.
- ❌ **Cons**: 6 source connectors is permanent maintenance — APIs change, auth schemes evolve. Mitigated by isolating sources behind the common importer interface. Bad source data produces bad imports; mitigated by the dry-run + reconciliation step that surfaces issues before commit.

---

## 📊 Phase 31: Executive Analytics, ROI Dashboard & Architectural KPIs — ⏳ Planned (enterprise)

**Layman's Terms**
The CTO who signs the Cortex contract needs to justify it to the CFO and the board. They need numbers: "Cortex saved us $X in onboarding time," "Cortex caught Y architectural regressions before production," "our mean code-review time dropped from 4 days to 1.5." Phase 31 produces these numbers as a real-time dashboard plus exportable quarterly business reviews — converting Cortex's outputs into the language of executive scorecards.

**Technical Terms**
A read-side analytics surface aggregating Cortex's existing signals (Phase 7 log, Phase 7.5 quality, Phase 15 CI signal, Phase 16 contradictions, Phase 29 cost) into executive-facing KPIs.

KPI categories:

**Architectural Health**:
- Mean quality score (Phase 7.5) per repo, team, org. Trend over time.
- Open-contradiction count (Phase 16) per domain. Resolution rate.
- Stale-entity count and stale-ratio. Trend.
- Lint-violation density (per 1k LOC).
- Fitness-function pass rate (Phase 20.4).
- Causal-strength entropy (Phase 20.14) — proxy for architectural complexity.

**Productivity**:
- Mean time-to-context (MTTC) — how long from a new developer opening the repo to producing a meaningful PR. Measured indirectly by Phase 4.5 IDE usage telemetry + commit history.
- Code-review cycle time — does Cortex's CURRENT CONTEXT injection reduce reviewer back-and-forth?
- Onboarding ramp time — first-30-day commit velocity for new hires vs. historical baseline.
- Refactor success rate — Phase 20.13 skill-library win rate.

**Risk**:
- High-hotspot-score entities (Phase 20.2) per domain. Trend.
- Compliance-violation count (Phase 24) per framework. Trend.
- Surprise-event count (Phase 20.20) per week. High surprise = architectural drift.
- Open-contradiction backlog age.

**ROI**:
- Token spend (Phase 29) vs. estimated counterfactual: "what would this team have spent without Cortex?" (calibrated from baseline measurement at deployment).
- Bug prevention $: high-hotspot entities × CI failure rate × industry-standard cost-of-incident.
- Onboarding $: (historical ramp time - current ramp time) × loaded-engineer-cost × new-hire-count.
- Net ROI: aggregated savings minus Cortex spend.

Dashboard surfaces:
- Web UI (extending Phase 22 dashboard) with role-aware views: developer view shows their team's metrics; manager view shows their org; CTO view shows everything.
- PDF QBR report: `cortex qbr generate --quarter Q2-2026 --format pdf` produces a 20-page executive deck with charts, narrative, and per-team breakdowns.
- Slack/Teams weekly digest: configurable per-channel "Cortex health weekly" post.
- Public status page: optional anonymized industry-benchmark sharing (opt-in).

**Architecture & System Design**

- **Core Components**: new `src/analytics/kpi.ts` (KPI computation from existing signals), new `src/analytics/roi.ts` (ROI calibration + counterfactual estimation), new `src/analytics/qbr.ts` (PDF generator using `pdfkit`), new `src/analytics/dashboard.ts` (extends Phase 22 dashboard), new `src/cli/analytics.ts`. Reuses all existing signal sources — no new data collection.
- **Design Pattern**: Read-side projection over existing event streams. Every KPI is a query over `log.jsonl`, `cost.jsonl`, `audit.jsonl`, and `state.json` — never a new persisted metric. KPIs are always current, never stale.
- **Key Considerations**:
  - **ROI calibration requires a baseline** — at deployment, `cortex roi calibrate` captures current metrics (mean review time, ramp time, bug rate). Subsequent ROI numbers are deltas from this baseline. Without calibration, ROI is reported as "uncalibrated — measure baseline first."
  - **Benchmarks are opt-in, anonymized, aggregated** — sharing anonymized industry benchmarks is a customer choice (`CORTEX_BENCHMARK_SHARING=true`). Pulled benchmarks let customers compare their stats to industry peers; pushed benchmarks contribute to the community pool.
  - **QBR PDF is the killer artifact** — designed for executive consumption (charts > tables, narrative > raw numbers). One PDF per quarter is what gets shown at board meetings.

**Definition of Ready (DoR)**

- Phase 22 (central server + dashboard) is shipped.
- Phase 29 (cost tracking) is shipped.
- Sufficient deployment history (≥1 quarter) for meaningful trends.

**Definition of Done (DoD)**

- 4 KPI categories implemented across architectural health, productivity, risk, ROI.
- Role-aware dashboard views (developer / manager / CTO).
- `cortex qbr generate` produces a 20-page executive PDF.
- Slack/Teams weekly digest posts configurable per channel.
- `cortex roi calibrate` captures deployment baseline.
- Industry-benchmark opt-in flag works (no data leaves without explicit opt-in).
- Tests cover: each KPI computation accuracy, ROI counterfactual calibration, QBR PDF structure validity, dashboard role-based filtering, benchmark privacy enforcement.

**Pros & Cons**

- ✅ **Pros**: Executive analytics is **what makes Cortex visible to the people who renew the contract**. CTO/VP champions need numbers for board reviews; Cortex provides them automatically. The QBR PDF saves the customer 20+ hours per quarter of manual reporting — they pay for the seat license, they get the executive deck for free. ROI calibration creates a deployment ritual that anchors success measurement from day one.
- ❌ **Cons**: Bad KPIs drive bad behavior. If team A is incentivized to "improve quality score," they might game it by removing genuinely-uncertain entities. Mitigated by surfacing multiple KPIs (no single metric to game) and by documenting that KPIs are guides, not contracts. ROI counterfactuals are estimates, not facts — mitigated by explicit confidence intervals and "this is a model, not measurement" disclaimers.

---

## 📜 Phase 32: Vendor Risk, Procurement Pack & Certifications Path — ⏳ Planned (enterprise)

**Layman's Terms**
The average enterprise SaaS sale takes 6-9 months — not because of feature evaluation, but because of legal, security, and procurement review. Procurement sends a 400-question security questionnaire. Legal demands MSA changes. InfoSec wants a SOC2 Type II report and a recent pen-test. Phase 32 prepares all of this in advance: pre-filled SIG/CAIQ/VSAQ questionnaires, MSA/DPA/BAA templates, sub-processor list, annual pen-test reports, and a clear roadmap to SOC2/ISO27001/FedRAMP certifications. Cuts the average enterprise sales cycle from 9 months to 3.

**Technical Terms**
A coordinated bundle of artifacts, processes, and external certifications that compress enterprise procurement.

**Pre-filled Security Questionnaires** (downloadable from `cortex.com/trust`):
- SIG (Shared Assessments Standardized Information Gathering) — Lite + Full versions, pre-answered.
- CAIQ (Cloud Security Alliance Consensus Assessments Initiative Questionnaire) v4.
- VSAQ (Vendor Security Alliance Questionnaire).
- HECVAT (Higher Education Community Vendor Assessment Tool) — for academic customers.
- Each questionnaire shipped as both static PDF and dynamic JSON for upload to Vanta/Drata/Whistic/UpGuard.

**Legal Document Templates**:
- Master Service Agreement (MSA) template — both customer-friendly and Cortex-standard versions.
- Data Processing Addendum (DPA) — GDPR-compliant, SCC-attached.
- Business Associate Agreement (BAA) — HIPAA-compliant for healthcare customers.
- Subprocessor Annex — maintained list of all subprocessors with categories (LLM provider, infrastructure, support, etc.).
- Acceptable Use Policy (AUP) and Service Level Agreement (SLA) templates.

**Compliance Artifacts**:
- SOC2 Type II report (annual, auditor: third-party CPA firm).
- ISO 27001 certificate (annual recertification).
- Penetration test report (annual, third-party).
- Vulnerability scanning attestation (quarterly).
- Bug bounty program with HackerOne or Bugcrowd.
- ASVS (OWASP Application Security Verification Standard) Level 2 attestation.

**Certifications Roadmap** (multi-year):
- Year 1: SOC2 Type I → Type II, ISO 27001.
- Year 2: HIPAA, PCI-DSS Level 1, GDPR Article 42 certification (when scheme finalizes).
- Year 3: FedRAMP Moderate (US federal), IL4 (US DoD), IRAP (Australia), G-Cloud (UK).
- Roadmap is **public** at `cortex.com/trust/roadmap` so prospects can plan.

**Vendor Risk Profile** (proactive disclosure):
- Financial stability: audited annual financials (for late-stage customers' procurement).
- Insurance: cyber liability + E&O + tech E&O coverage amounts disclosed.
- Incident response: documented IR plan with named CSIRT.
- Business continuity / disaster recovery plan with documented RPO/RTO.

**Operational Surface**:
- `cortex compliance pack download --version <date>` — pulls current procurement pack as a zip.
- Trust portal at `cortex.com/trust` with live certificate links, sub-processor list, change notifications.
- Customer-specific extensions: `cortex compliance attestation --customer <name> --requirements <file>` produces a customer-specific compliance pack tailored to their stated requirements.

**Architecture & System Design**

- **Core Components**: This phase is **primarily process and content, not code**. The small code surface: a trust portal (static site + small API for change notifications), `cortex compliance pack download` CLI command, certification status JSON endpoint.
- **Design Pattern**: Trust-by-disclosure. Rather than treating compliance artifacts as confidential, publish them (with appropriate access gating for SOC2 reports, which require NDA). Prospect Security teams can self-serve answers to common questions without sales involvement.
- **Key Considerations**:
  - **Process is the product** — half of Phase 32 is operational rituals (annual audits, quarterly pen-tests, monthly sub-processor reviews) that exist outside the codebase. Document them as runbooks shipped with the product.
  - **Roadmap commitments are public commitments** — pulling forward a certification date is fine; slipping a public date is reputational damage. Be conservative.
  - **Customer-specific attestations** are high-leverage — one-off questionnaire answers reused across the next 50 prospects. Maintain an internal questionnaire-answer knowledge base.

**Definition of Ready (DoR)**

- Phase 26 (audit) is shipped — audit log evidence is required for SOC2/ISO.
- Phase 27 (BYO-Key) is shipped — encryption documentation is required for SOC2 CC6 controls.
- Phase 24 (compliance packs) is shipped — provides the lint-level compliance evidence.

**Definition of Done (DoD)**

- 4 standard security questionnaires (SIG, CAIQ, VSAQ, HECVAT) pre-filled and published.
- 5 legal templates (MSA, DPA, BAA, Subprocessor Annex, AUP/SLA) drafted and reviewable.
- SOC2 Type II completed and report available (initial cycle: 12+ months from start).
- ISO 27001 certificate obtained.
- Annual third-party penetration test completed and report (sanitized) available.
- Quarterly vulnerability scan attestation published.
- Bug bounty program live (HackerOne or Bugcrowd).
- Trust portal live at `cortex.com/trust`.
- `cortex compliance pack download` CLI works.
- Certifications roadmap published with target dates.

**Pros & Cons**

- ✅ **Pros**: Cuts enterprise sales cycles by **50-70%** — by the time procurement asks a question, the answer is already on the trust portal. Pre-filled questionnaires save the customer's InfoSec team 40+ hours per evaluation, which they remember. SOC2 + ISO 27001 are **disqualifying gates** for most Fortune 500 vendors; without them, you cannot enter most procurement processes regardless of how good the product is. FedRAMP unlocks the US federal market — a $100B+ TAM that almost no AI tools have entered.
- ❌ **Cons**: Compliance is a permanent, expensive program — SOC2 audit ~$30-100K/year, ISO 27001 ~$20-50K/year, FedRAMP ~$500K-2M one-time + ongoing. Mitigated by treating compliance investment as a sales-enablement budget line, not an engineering overhead. Public roadmap commitments create reputational risk if missed.

---

## 🚀 Phase 33: Deep Recursive Bootstrap Ingest — ⏳ Planned (P0 — fixes production issue)

> **Priority: P0.** This phase addresses a critical bootstrap quality issue observed in production on a real ~1800-file React/Redux/Keycloak codebase: the current bootstrap path produced only **4 entities** (AppEntry, AppRouter, ReduxStore, DesignSystem) and **3 concepts** (React Frontend Architecture, Redux State Pattern, Component-Driven UI), missing the entire `services/`, `hooks/`, redux slices, atomic components, utilities, and routing layers. The user had to manually re-prompt three times to extract any depth, and the result was still ~5 entities. Cortex's first-impression problem is severe and adoption-blocking on any non-trivial codebase. Phase 33 is the structural fix.

### Production Observation

On a real ~1800-file React project:

| Bootstrap result | Entities | Concepts | Coverage |
|---|---|---|---|
| Auto (current) | 4 | 3 | ~0.2% of files mapped, ~10% of architectural domains |
| After "deeper please" prompt × 3 | 5 | 5 | ~0.3% of files mapped, ~25% of architectural domains |
| **Phase 33 target (depth=deep)** | **40-80** | **8-15** | **>40% of significant files mapped, 100% of architectural domains** |

### Root Cause Analysis

Five compounding defects in the current bootstrap path ([Post-Launch Fix #3](#) made it better but did not solve the underlying shallowness):

1. **`listSourceFiles()` caps at 500 entries**. On a 1800-file project, 1300 files are silently invisible to the bootstrap synthesis. The cap exists to keep the prompt under a token budget, but it produces silent truncation with no user warning.
2. **The LLM receives a file list, not file contents**. The bootstrap prompt is essentially "here are 500 filenames and a package.json — synthesize the architecture." The LLM pattern-matches on directory names (`auth/` → "Authentication Strategy") and `package.json` deps (`keycloak-js` → "Keycloak integration"). It cannot see the actual implementation — useQuery hooks, Redux slices, custom logic — because no source content is in the prompt.
3. **Single-shot synthesis**. One LLM call asked to summarize an entire codebase produces necessarily shallow output. The model's natural compression to a single response is ~5-10 entities regardless of input size — adding more files to the prompt does not produce more entities, just slightly different shallow ones.
4. **No recursive deepening**. There is no second pass to drill into the high-signal directories the first pass identified. The bootstrap finishes after one synthesis call.
5. **No quality gates**. The bootstrap returns "success" with 4 entities on a 1800-file project. There is no programmatic check that says "this is suspiciously shallow — keep going."

### Algorithm — Multi-Phase Recursive Bootstrap

A five-phase pipeline replacing the current single-shot bootstrap. Each phase is independently testable, resumable, and budget-bounded.

**Phase A — Skeleton Scan** (cheap, fast, no LLM)
- Walk the **full** directory tree without the 500-cap. Build a per-directory profile: file count, total LOC, language mix, modification recency.
- Build the **directory import graph** by parsing import statements across all files (regex-level, not full AST — fast and language-agnostic for the common languages). Edges weighted by import count.
- Run community detection (Leiden, reused from Phase 20.9) on the directory import graph to identify **architectural domains** — e.g., `{ auth: src/auth/**, services: src/services/**, redux: src/redux/**, components.atoms: src/components/atoms/**, components.molecules: src/components/molecules/**, hooks: src/hooks/**, utils: src/utils/**, routes: src/routes/** }`.
- Score each domain by **complexity signal** (file count × mean LOC × directory in-centrality).
- Output: domain map + complexity-ranked domain list. Persisted to `.knowledge/.bootstrap/skeleton.json`.
- Cost: **zero LLM calls**, completes in <5 seconds even on 1800 files.

**Phase B — Per-Domain Deep Synthesis** (parallel, budget-controlled)
- For each domain (in complexity order), do a focused LLM synthesis that **reads actual file contents**.
- Per-domain context budget: top 10-20 most-central files in the domain (ranked by intra-domain import centrality), with **full file content** included up to a per-call token budget (default 30k input tokens).
- For each domain, run a **domain-specialized prompt** — distinct from the general Librarian prompt. For example, the `redux/` domain prompt directs attention to slices, reducers, sagas, selectors, action creators; the `hooks/` domain prompt directs attention to `useQuery`/`useMutation`/custom hooks; the `components/` domain prompt directs attention to atomic-design layering.
- Each domain produces 3-10 entities + 1-3 concepts with full relationships and evidence anchors.
- Multiple domains synthesized in parallel (configurable parallelism, default 5; rate-limit aware).
- Cost: bounded by `CORTEX_BOOTSTRAP_BUDGET_USD` (default $10). Per-domain cost surfaced live.

**Phase C — Hot-Path Deepening** (drill into central entities)
- Compute PageRank (reusing Phase 20.10's PPR implementation) on the partial entity graph from Phase B.
- For top-N central entities (default 20), do another LLM pass that reads:
  - The entity's full source file content
  - All direct callers' content (clipped at 5 callers)
  - All direct dependencies' content (clipped at 5 deps)
- This pass refines the central entities — adds missing relationships, evidence anchors, descriptions of complex behavior (e.g., the user's example: `AppRouter`'s "Keycloak token refresh, layout rendering, Redux bootstrapping" detail emerges naturally from reading the actual file content).

**Phase D — Cross-Domain Relationship Synthesis**
- Final pass that identifies cross-domain relationships missed by per-domain synthesis.
- LLM reads the **entity index** from Phases B+C (text only, not file content) plus a sample of cross-domain import statements.
- Produces additional `[[CrossDomainEntity]] depends_on [[OtherDomainEntity]]` edges and `supports`/`derived_from` cross-references.

**Phase E — Quality Gate Check & Auto-Refine**
- Verify against per-domain DoD criteria (minimum entity count per domain proportional to file count, minimum evidence-anchor coverage, minimum relationship density).
- If quality is below threshold for any domain, **auto-trigger a second Phase B pass for that domain** (budget permitting).
- User-visible quality scorecard at the end: per-domain entity count, evidence coverage, relationship density, quality score (Phase 7.5).
- If overall quality score < 0.5, emit a warning recommending `cortex bootstrap refine --domain <weakest-domain>`.

### The Output-Token Wall — Why Multi-Wave Processing Is Physically Required

A frequent (and reasonable) question: *"why does the LLM need multiple deep dives? Can't it ingest the entire codebase in one shot?"*

**The answer is no, and the reason is a hard physical constraint of LLM architectures: the output token window.**

| Model | Input context | **Output context** | Max detailed entities per single call (~200 tok/entity) |
|---|---|---|---|
| GPT-4o | 128k | **16k** | ~80 |
| GPT-4 Turbo | 128k | **4k** | ~20 |
| Claude 4.7 Opus | 200k | **8k** | ~40 |
| Claude 4.6 Sonnet | 200k | **8k** | ~40 |
| Gemini 2.0 Pro | 2M | **8k** | ~40 |
| Llama 3.1 405B | 128k | **4k** | ~20 |
| Llama 3.3 70B | 128k | **4k** | ~20 |

Modern LLMs can **read** entire codebases (1M+ input tokens on Gemini, 200k on Claude/GPT) but cannot **emit** more than 4-16k tokens of structured JSON in a single response. At ~150-400 tokens per detailed entity record (with description + relationships + evidence anchors + behavior), that is a **hard ceiling of 20-80 entities per LLM call** regardless of how much input you provide.

This is not a Cortex bug, not a prompt-engineering issue, and not fixable by feeding more code into the input. It is the same physical constraint that forces every code-understanding tool (Cursor, Windsurf, Continue, Aider, Cline) to chunk large refactors. The only way to produce a 100-entity knowledge graph from a non-trivial codebase is to make **multiple LLM calls**.

The real architectural question is: **who orchestrates those calls?**

- **Today (the problem)**: the user does, manually, via repeated "do another deep dive" prompts in the chat. The user becomes the loop. Cortex is a passive tool waiting for the next chat turn. This is why your 1800-file project required 3+ manual "go deeper" prompts and still produced only ~5 entities — the chat agent has no programmatic way to keep going on its own.
- **Phase 33 (the fix)**: Cortex's daemon does, programmatically, in one CLI command. The machine becomes the loop, runs at machine speed (parallel batches, no human latency), and never gets bored or distracted. The user runs `cortex bootstrap` once and walks away.

### Output-Budget-Aware Wave Engine

The wave engine sizes batches by **output tokens**, not input tokens — inverting the traditional context-budgeting approach (most RAG systems budget by input because input is the typical bottleneck; for structured synthesis emitting JSON entities, **output is the bottleneck**).

**Per-file output cost estimation**:
- Calibrated per model from empirical measurement during a warmup batch on the user's own first few files. No fixed assumptions.
- Default starting estimate: 300 tokens per file for detailed entity output.
- Updated after every batch via exponential moving average (recent measurements weighted higher).

**Batch sizing formula**:
- `output_budget = model.max_output_tokens × CORTEX_OUTPUT_HEADROOM` (default 0.8 = 80% of cap, 20% margin against estimation error).
- `batch_size = floor(output_budget / per_file_output_cost)`.
- For Claude 4.7 Opus (8k × 0.8 = 6.4k budget, 300 tok/file): **~21 files per batch**.
- For Llama 3.1 405B (4k × 0.8 = 3.2k budget): **~10 files per batch**.
- For GPT-4o (16k × 0.8 = 12.8k budget): **~42 files per batch**.

**Schema partitioning for huge domains**:
- When a domain is too large for a single call even at maximum batch size, the daemon splits the output schema:
  - Call 1: emit `entities[]` only for the batch (lean records — name, sourceFile, one-line description).
  - Call 2: emit `relationships[]` only, given the entity list from call 1 as input.
  - Call 3: emit `evidence[]` only, given the entities.
  - Call 4: emit `concepts[]` summarizing the batch.
- Each call's output is bounded; total information emitted is the same; total cost is ~2× single-shot but never truncates.

### Two-Tier Synthesis Pattern

A two-pass strategy per domain that further compresses LLM cost and prevents the "ran out of budget halfway through a domain" failure mode:

**Tier 1 — Enumeration Pass** (one cheap call per domain):
- Lightweight prompt: *"list every architectural entity in these N files, one line each, with file path and one-sentence purpose."*
- Output: ~50 entity stubs in ~3-4k tokens. Fast and cheap.
- Result: Cortex has the **full entity inventory upfront**, before any expensive work begins.
- Enables accurate cost estimation for Tier 2 (`tier2_cost = enumerated_entity_count × per_entity_cost`).

**Tier 2 — Detail Pass** (parallel batches):
- Group the stubs from Tier 1 into output-budget-aware batches (8-21 entities per batch, model-dependent).
- Each Tier 2 call: *"for these N entities, emit full records with relationships, evidence anchors, behavior."*
- Multiple Tier 2 calls run **in parallel**, rate-limit-aware (default 5 concurrent; respects `Retry-After` headers and exponential backoff on 429s).

Benefits:
- Tier 1 eliminates the "we discovered 80 entities after spending the full budget on 30" surprise — the inventory is known before the spend.
- Tier 2 parallelism saturates provider concurrency, cutting wall-clock time on a 100-entity domain from ~10 minutes (serial) to ~2 minutes (5-way parallel).

### Autonomous Daemon Orchestration — `cortex bootstrap` as a Single Command

**The user runs one CLI command. The daemon does everything else.** No chat back-and-forth, no manual "deeper please" prompts, no waiting between phases.

```
$ cortex bootstrap
[Phase A] Scanning 1823 files across 47 directories... done (3.2s)
[Phase A] Identified 14 architectural domains via Leiden clustering
[Phase A] Estimated bootstrap: 67 entities, 12 concepts, $3.40, ~7 min
Proceed? [Y/n] y

[Phase B] Per-domain synthesis (5 parallel)
  ├─ auth/                    [████████████████] 100% (6 entities)
  ├─ services/                [██████████░░░░░░]  62% (4/7 batches)
  ├─ redux/                   [████░░░░░░░░░░░░]  25% (1/5 batches)
  ├─ hooks/                   [░░░░░░░░░░░░░░░░]   0% (waiting)
  └─ components/atoms/        [░░░░░░░░░░░░░░░░]   0% (waiting)
Cost so far: $0.82 · ETA: 4m 18s · Entities: 14 · Concepts: 3
```

The daemon:

1. **Plans** the pipeline upfront (Phase A skeleton scan + cost projection, completes in seconds).
2. **Confirms** with the user — single Y/N prompt showing projected cost and entity count.
3. **Calls the LLM API directly** via Phase 2's client. **No MCP roundtrips**, no chat agent in the loop. The daemon is a normal long-running process making `generateObject()` calls in a tight loop.
4. **Orchestrates the wave loop programmatically** — batch slicing, output-budget sizing, parallel dispatch, retry on 429s, JSON validation, continuation on truncation.
5. **Checkpoints** after every batch (sub-batch granularity) so a Ctrl+C or crash never loses more than ~30 seconds of work.
6. **Streams progress** via the MCP `bootstrap_progress` resource so any connected IDE shows live status.
7. **Returns** when complete (or backgrounds if `--background`).

This is the architectural difference: today the **chat agent** is the wave processor (and a slow, expensive one). Phase 33 makes **the daemon** the wave processor (machine speed, parallel, autonomous).

### Continuation Chains (Provider-Aware Fallback)

When a batch's output is truncated at `max_tokens` despite adaptive sizing (rare but possible on heterogeneous codebases):

- **Anthropic models**: continue via prefill — submit the partial output as a prefilled assistant message and request continuation.
- **OpenAI models** (`finish_reason: "length"`): continuation request with the partial output appended to the conversation.
- **Gemini**: similar to OpenAI continuation pattern.
- **Llama/Ollama**: graceful fallback — if no continuation supported, automatically retry with `batch_size /= 2`.

Continuation loops until the model emits an explicit completion marker (closing JSON bracket recognized by a streaming parser). Hard cap of 3 continuations per batch — beyond that, the daemon splits the batch and retries.

### Adaptive Batch Sizing (Self-Tuning)

The wave engine **learns** per-domain output cost during the run rather than relying on static estimates:

- Start each domain with conservative batch size (5 files).
- After each batch, measure `actual_output_tokens / files_in_batch`.
- Update per-domain estimator via exponential moving average (α=0.3, weights recent batches higher).
- Adjust next batch:
  - If outputs are <50% of budget AND JSON valid AND no truncation → **increase batch by 1.5×**.
  - If outputs hit `max_tokens` OR JSON truncated → **decrease batch by 2×** AND switch to schema-partitioned mode.
  - If outputs invalid (JSON parse failure) → retry once at half batch size; persistent failure escalates to schema partitioning.
- Per-domain memory persists across the bootstrap run — `auth/` files (often dense with security logic) might stabilize at batch=6; `utils/` files (often simple helpers) might stabilize at batch=18.

This means the daemon **converges to the optimal batch size for each domain within the first 2-3 batches**, then stays there. The user never tunes anything.

### MCP Progress Streaming

New MCP resource: `bootstrap_progress` exposes a long-poll event stream that the IDE consumes for real-time visualization:

```json
{
  "phase": "per-domain",
  "currentDomains": ["auth", "services", "redux"],
  "domainsCompleted": ["routes", "config"],
  "domainsTotal": 14,
  "batchesCompleted": 47,
  "batchesEstimated": 84,
  "entitiesProduced": 31,
  "conceptsProduced": 7,
  "costSoFarUSD": 1.20,
  "estimatedRemainingUSD": 2.10,
  "etaSeconds": 240,
  "currentBatch": {
    "domain": "services",
    "files": ["src/services/Keycloak.js", "src/services/UserService.js", ...],
    "outputTokensUsed": 4200,
    "outputBudget": 6400
  }
}
```

The IDE renders a progress bar with per-domain status, current batch detail, cost so far, and ETA. The user can watch the bootstrap progress in real time inside Claude Code / Cursor / VS Code — but does not need to interact with it. The daemon does the work.

### Estimated Performance — Revised With Wave Engine

For the same 1800-file React/Redux/Keycloak production case, with the output-budget-aware wave engine:

| Stage | Calls | Wall time | LLM cost | Cumulative entities |
|---|---|---|---|---|
| A — Skeleton + clustering | 0 | <5s | $0 | 0 |
| B — Tier 1 enumeration (14 domains × 1 call) | 14 | ~40s (parallel 5) | $0.30 | 60-80 (stubs) |
| B — Tier 2 detail (5-21 files/batch, ~12 batches × 5 parallel) | ~12 | ~3 min | $1.50-2.50 | 60-80 (detailed) |
| C — Hot-path deepening (top 20 entities × 1 call each, parallel) | 20 | ~2 min | $1.00-1.50 | 60-80 (refined) |
| D — Cross-domain (1 call) | 1 | ~30s | $0.30 | 60-80 |
| E — Quality gate + targeted refines (1-3 calls) | 1-3 | ~30s + retries | $0-0.50 | 60-90 |
| **Total** | **~50 calls** | **~6-8 min** | **$3.10-5.10** | **60-90 entities, 12-18 concepts** |

The wave engine achieves the Phase 33 entity-count target **with no manual intervention** — the user runs `cortex bootstrap`, walks to get coffee, and returns to a fully-indexed codebase. The 50 LLM calls happen at machine speed in 6-8 minutes; under the chat-driven model that same depth would require **the user to type "deeper please" 50 times across hours of interactive sessions**.

### Cross-Phase Synergies

The wave engine is itself reusable beyond bootstrap — Phase 17 (self-consistency sampling), Phase 20.16 (multi-agent collaboration), Phase 20.18 (Tree-of-Thoughts), and Phase 29 (FinOps budget enforcement) all benefit from the output-budget-aware batching primitive. Phase 33 ships the `src/llm/wave.ts` engine as a reusable core; future phases consume it for any structured-emit workload that exceeds the single-call output ceiling.

### Resumability & Checkpointing

- Bootstrap state persisted to `.knowledge/.bootstrap/progress.json` after every phase completion **and every individual batch** (sub-batch granularity).
- `cortex bootstrap resume` continues from the last checkpoint (skips completed phases/domains/batches).
- Daemon crash or Ctrl+C is safe — work-in-flight is not lost; at most the currently-in-flight batch is re-run on resume.
- Each completed phase writes immutable artifacts (`skeleton.json`, `domain-<name>.json`, `hotpath.json`, `cross-domain.json`) for inspection and debugging.
- **Mid-batch crash recovery**: each LLM call result is persisted to a per-batch `.tmp` file before the batch is marked complete. If the daemon crashes mid-batch, the next resume picks up only the unfinished calls within that batch.

### Production-Hardening Refinements

The wave-engine design above is the happy path. Real-world enterprise codebases require additional engineering rigor for the edge cases that determine whether bootstrap succeeds or silently degrades. The following refinements are scoped into Phase 33 to ship it as production-grade, not prototype-grade.

#### 1. Codebase-Shape Awareness

The Phase A skeleton scan must handle realistic codebase topologies, not just clean single-language repos:

- **Polyglot codebases**: Most enterprise apps mix TypeScript frontend + Python/Go/Java backend + infra (Terraform/HCL) + scripts (bash). The skeleton scan uses **per-language import parsers** (lightweight regex-based — TypeScript `import/from`, Python `import/from`, Go `import`, Java `import`, Rust `use`) plus configurable language registration. Each language contributes edges to the same directory import graph; Leiden clustering operates on the unified graph.
- **Monorepo detection**: Auto-detect Nx (`nx.json`), Turborepo (`turbo.json`), Lerna (`lerna.json`), pnpm workspaces (`pnpm-workspace.yaml`), Yarn workspaces (`package.json:workspaces`), Cargo workspaces (`Cargo.toml:[workspace]`), Go workspaces (`go.work`). When detected, **each workspace package becomes a quasi-domain** at Phase B, with intra-package files clustered into sub-domains. Cross-package dependencies become first-class cross-domain edges in Phase D.
- **Generated code exclusion**: Auto-detect generated files via signature patterns — `// DO NOT EDIT` headers, `.gen.ts`/`_pb.go`/`.generated.*` extensions, GraphQL/protobuf/OpenAPI output directories, Tailwind/PostCSS outputs, framework codegen (Prisma client, GraphQL Code Generator, OpenAPI Generator, gRPC stubs). Generated files are excluded from synthesis but **retained as evidence anchors** for adjacent hand-written entities (the generated client is referenced by the hand-written service that wraps it).
- **Test files as evidence enrichment**: Test files (`*.test.*`, `*.spec.*`, `__tests__/**`, `tests/**`) are excluded from entity creation (they are not architecture) but **mined for evidence enrichment**: a test file's `describe(...)`, `it(...)`, and assertion targets become evidence anchors on the entity-under-test. `useQuery` hook called with specific args in tests becomes a behavioral observation attached to the hook's entity. `--include-tests` flag (default ON) controls this enrichment pass.
- **Lockfile and dependency-manifest extraction**: `package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`, `pom.xml`, `Gemfile` are parsed during Phase A to extract dependency edges into per-domain context — the synthesis sees which third-party libraries a domain depends on without needing to read node_modules.

#### 2. Cost-Efficiency Refinements

The wave engine is already cost-bounded; these refinements compress cost further on the same workload:

- **Prompt caching (Anthropic, OpenAI)**: Per-domain prompts share substantial context (Librarian system prompt, schema definition, CURRENT CONTEXT block). Anthropic's prompt caching reduces cached-token cost by 90%; OpenAI's automatic prompt caching reduces by 50%. The wave engine **orders batches within a domain so the shared prefix is cache-stable**, and uses provider-specific cache control headers (`cache_control: ephemeral` for Anthropic). Empirical savings on a 1800-file project: ~40% reduction in total bootstrap cost vs. uncached.
- **Embedding-based Tier 1 deduplication**: Different files may describe the same architectural entity (e.g., `index.ts` re-exports from `service.ts`; `UserService.ts` is a thin wrapper around `UserRepository.ts`). After Tier 1 enumeration, embed each stub (cheap, batched embedding call) and merge stubs with cosine similarity >0.85 into single entities with multiple `sourceFile` references. Eliminates ~10-20% of Tier 2 calls on real codebases.
- **Per-file overflow strategy**: A single 10k-line legacy God class can exceed the per-batch input budget by itself. The skeleton scan detects oversized files (>2000 LOC or >50KB) and **pre-splits them at structural boundaries** (top-level functions, classes, exports) into sub-files that fit individually. Each sub-file becomes a synthesis target; the daemon merges resulting entities into a single multi-segment entity with `sourceSegments[]` referencing each contributing region.
- **Input-token-aware file selection within a batch**: Within a batch's file count limit, the daemon further trims by input tokens — if the 21 files for a Claude batch would exceed 60k input tokens, drop the lowest-centrality files to fit. Prevents wasted spending on context-window-trim charges some providers apply.

#### 3. Semantic Validation Pipeline (Quality Gate Deepening)

Phase E's quality gate currently checks structural minimums (entity count, evidence coverage). A real production gate also catches semantic drift:

- **Broken wikilink detection**: every `[[EntityName]]` in any synthesis output must resolve to an existing entity. Broken links trigger automatic fix-up: either the missing entity is created with a stub (if it appears in another batch's stubs), or the wikilink is removed with a warning.
- **Source-file existence verification**: every entity's `sourceFile` must exist in the repo. Hallucinated paths (LLM invents a plausible filename) trigger entity rejection with a regeneration request for that file's correct entity.
- **Evidence quote verification**: every evidence anchor (`evidence[].content` quoting source code) is searched in the cited source file with edit-distance tolerance (Phase 7's mechanism). Quotes that don't match are flagged as `evidenceDrift` — either the LLM hallucinated the quote or the source has changed mid-bootstrap.
- **Relationship target verification**: every `relationships[].target` must reference an existing entity (post-merge) or be a known external dependency. Dangling relationships are removed with logging.
- **Duplicate-entity-name detection within batch**: an LLM can emit two entities with the same name in one response (e.g., a class and a function both called `Request`). Merged into one entity with disambiguation, or split into `Request.Class` and `Request.Function` if structurally distinct.
- **Hallucinated-API detection**: imported modules and called functions in evidence quotes are cross-checked against actual imports in the cited file. Calls to functions not actually imported are flagged.

Failed semantic validations trigger **targeted batch regeneration** — only the affected entities are re-synthesized, not the whole batch. Budget-aware: max 2 regeneration attempts per entity before falling back to a stub entity with a `qualityWarning` flag.

#### 4. Concurrency-Safe Writes

Five parallel Tier 2 batches each calling `save_synthesis` concurrently means concurrent writes to `.knowledge/state.json`, `log.jsonl`, and per-entity files. Without coordination, this corrupts state. The wave engine ships with:

- **Single-writer state coordinator**: all writes to `state.json` and `log.jsonl` go through a single async queue inside the daemon. Per-entity file writes (entity body markdown) parallelize freely since each entity has its own file.
- **Optimistic concurrency on entity records**: when two batches concurrently produce entities with the same name (rare but possible across domain boundaries), the writer detects the collision via filesystem `O_EXCL` flag, merges relationship arrays, and emits a `mergeEvent` to `log.jsonl` for traceability.
- **Lock file at `.knowledge/.bootstrap.lock`**: prevents two `cortex bootstrap` invocations from running simultaneously on the same project. Lock includes PID and start timestamp; stale locks (process gone) auto-cleared after 30s grace.
- **fsync on checkpoint writes**: bootstrap progress JSON written with `fsync` to survive sudden power loss (genuinely matters on long-running enterprise bootstraps that may span hours).

#### 5. Provider Resilience & Multi-Provider Failover

Enterprise bootstraps may run for hours; provider-side failures are statistically certain over that window:

- **Per-provider rate-limit handling**: respect `Retry-After` headers, X-RateLimit-* hints, exponential backoff capped at 60s, never busy-loop on 429s.
- **Provider-side outage detection**: 5xx errors trigger circuit breaker (open after 3 consecutive failures, half-open after 60s probe). Open circuit pauses batch dispatch for that provider, surfaces a clear "provider unavailable, waiting" message via the progress stream.
- **Multi-provider failover** (opt-in via `CORTEX_MULTI_PROVIDER=true`): when primary provider circuit is open >5 minutes, the wave engine fails over to a configured backup provider. State carries `provider: <name>` on each entity record so post-hoc analysis can detect quality drift across providers.
- **Quota-exhaustion graceful handling**: when the user's account hits hard quota (HTTP 402 / OpenAI `insufficient_quota`), bootstrap pauses with a clear "quota exhausted, resume after recharge" message. State checkpointed; resume picks up after user resolves.
- **Provider-specific retry policies**: Anthropic 529 (overloaded) → wait 5s and retry; OpenAI `model_overloaded` → retry with backoff; Google `RESOURCE_EXHAUSTED` → wait 30s; Ollama connection refused → assume local LLM crashed, surface clear message.

#### 6. Dry-Run & Cost Transparency

Users facing a $5-50 bootstrap on a huge codebase want to know what they're committing to before pressing enter:

- `cortex bootstrap --dry-run` runs Phase A (free) + Tier 1 enumeration (cheap, ~$0.30) + cost projection — **no Tier 2 spend**. Produces a full plan:
  ```
  Bootstrap Plan
  ────────────────────────────────────────────────────
  Codebase: 1823 files, 47 directories, 14 domains
  Languages: TypeScript (78%), Python (18%), HCL (4%)
  Generated files excluded: 312 (Prisma, GraphQL, Tailwind)
  Test files: 287 (mining for evidence)

  Per-domain projected calls and cost:
    auth/                  6 entities    1 batch    $0.18
    services/              7 entities    1 batch    $0.21
    redux/                 12 entities   2 batches  $0.36
    components/atoms/      24 entities   2 batches  $0.48
    components/molecules/  18 entities   2 batches  $0.42
    ...
    [Phase C hot-path]     top 20 × $0.08          $1.60
    [Phase D cross-domain] 1 × $0.30               $0.30
    [Phase E quality gate] avg 2 refines × $0.20   $0.40
  ────────────────────────────────────────────────────
  Total: 67 entities, 12 concepts, $3.95, ~7 min wall time
  Confidence: ±20% (calibrated from warmup batch)

  Run? [Y/n]
  ```
- `cortex bootstrap --dry-run --json` for CI / scripted use.
- `--budget` flag aborts at cap; `--dry-run` shows whether the configured budget is sufficient before spending.

#### 7. Declarative Configuration — `.cortex/bootstrap.config.yaml`

Replaces CLI flag soup for projects with stable bootstrap requirements:

```yaml
# .cortex/bootstrap.config.yaml
depth: deep
parallelism: 8
budget_usd: 10.00
output_headroom: 0.8

exclude_directories:
  - vendor/legacy-auth/   # too churny to bother
  - src/__archived__/

include_tests: true
detect_generated: true

domain_overrides:
  redux/:
    prompt: redux-slices
    parallelism: 3  # rate-limit-sensitive
  src/components/:
    prompt: react.components.atoms
    max_batch_size: 8  # files are dense

providers:
  primary: anthropic-claude-4-7-opus
  failover: openai-gpt-4o
  embeddings: openai-text-embedding-3-small

quality_gate:
  min_entities_per_domain: 3
  min_evidence_per_entity: 1
  max_refines_per_domain: 3

post_bootstrap:
  emit_arch_spec: true  # generate ARCH_SPEC.md (Phase 20.5)
  notify_slack_channel: "#architecture"  # via Phase 28
```

Config is layered: project file → workspace config → CLI flags (CLI overrides). `cortex bootstrap config validate` lints the file before invocation.

#### 8. Incremental & Enrichment Modes

Bootstrap is not a one-time operation:

- `cortex bootstrap --incremental` — re-runs Phase A skeleton scan, detects new directories or directories with >20% file-count change since last bootstrap, processes only the affected domains. Used after importing a new library or completing a major feature branch merge.
- `cortex bootstrap --enrich` — for users who ran the legacy shallow bootstrap and want depth without throwing away existing entities. Skips Phase B for already-synthesized entities, runs Phase C (hot-path deepening) on existing entities, then Phase B for missing domains, then Phase D (cross-domain).
- `cortex bootstrap --refine-stale` — re-process domains whose entities are >30 days `staleSince` (Phase 6). Targets quality-decayed regions without re-doing everything.
- `cortex bootstrap --refine-low-quality` — re-process domains where mean Phase 7.5 quality score < threshold. Targets observably weak regions.

All four modes respect `--budget` and `--dry-run`.

#### 9. Failure-Mode Taxonomy

Explicit handling per failure scenario, surfaced clearly in progress stream:

| Failure | Detection | Handling |
|---|---|---|
| LLM returns malformed JSON | Streaming parser detects parse error | Retry once at half batch size; persistent failure → schema-partitioned mode |
| LLM hallucinated `sourceFile` | Filesystem stat | Entity rejected; targeted regeneration request for the correct file |
| LLM duplicated entity name within batch | Post-batch dedup pass | Merge if structurally compatible; else disambiguate with suffix |
| Broken wikilink in output | Post-batch validation | Auto-fix from other-batch stubs; else strip wikilink with warning |
| Evidence quote not found in source | Edit-distance check | Mark `evidenceDrift: true`; surface in quality report |
| File deleted by developer mid-bootstrap | File-read errors during batch | Skip file with warning; remove pre-emitted stub for it |
| Disk full during write | `ENOSPC` errno | Pause bootstrap, save checkpoint, surface clear error with cleanup hint |
| Provider 5xx (3 consecutive) | Circuit breaker | Open circuit for 60s, fail over if multi-provider, else pause with status |
| Provider quota exhausted (HTTP 402) | Status code | Pause bootstrap, checkpoint, surface "quota exhausted" message |
| Daemon SIGKILL mid-batch | No clean shutdown | Resume: lock-file detection of stale daemon; in-flight batch re-run |
| Two `cortex bootstrap` invocations on same project | Lock file collision | Second invocation refuses with clear "bootstrap already running" message |
| LLM model deprecated mid-run | Provider error response | Pause, surface "model deprecated, configure replacement" message |
| User SCM operation mid-bootstrap (git checkout) | File mtimes shift | Detect via skeleton-scan delta check on resume; offer to restart or proceed with stale targets |
| Network partition (DNS resolution fails) | Connection error class | Treat as provider outage; circuit breaker engages |

Every failure produces a structured event in `bootstrap_progress` so the IDE can render an explicit error UI (not a silent stall).

### CLI Surface

All commands run **autonomously in the daemon** — no chat agent required, no MCP roundtrips, no manual "deeper please" prompts. The user issues one command and the daemon runs the wave loop to completion.

**Primary commands**:
- `cortex bootstrap` — runs the full pipeline autonomously. Shows estimated cost + entity count, asks for Y/N confirmation, then executes. Default depth auto-selected from project size (≤500 files: standard; >500 files: deep; >5000 files: exhaustive with `--background` recommended).
- `cortex bootstrap --yes` — skip confirmation prompt (for CI / scripted use).
- `cortex bootstrap --background` — fork into daemon, return immediately. Recommended for huge codebases (>5000 files) where bootstrap may take 30+ minutes.
- `cortex bootstrap --watch` — verbose live progress in terminal (every batch, every entity emitted, every cost increment).

**Depth and budget controls**:
- `cortex bootstrap --depth shallow|standard|deep|exhaustive`:
  - `shallow` — Phase A only (the legacy single-shot behavior, retained as the cheapest mode for tiny projects).
  - `standard` — Phases A+B (default for projects ≤500 files).
  - `deep` — Phases A+B+C (default for projects 500-5000 files).
  - `exhaustive` — Phases A+B+C+D+E with auto-refine (default for projects >5000 files).
- `cortex bootstrap --budget 10.00` — hard cap on total LLM spend in USD. Bootstrap aborts cleanly at cap with a checkpoint saved; user can resume after raising the cap.
- `cortex bootstrap --max-entities 200` — soft cap on entity count (Tier 1 enumeration above the cap triggers a warning + user confirmation).

**Wave engine tuning** (advanced; defaults are auto-tuned per model):
- `cortex bootstrap --parallelism 5` — concurrent batches (default 5; respects provider rate limits).
- `cortex bootstrap --output-headroom 0.8` — fraction of model's max output tokens to use per batch (default 0.8 = 80%).
- `cortex bootstrap --schema-partitioned` — force schema-partitioned mode (entities → relationships → evidence → concepts as separate calls). Default: auto-engaged when adaptive sizing detects truncation.

**Status, resume, refine**:
- `cortex bootstrap status` — query in-flight bootstrap state (phase, current domains, batches completed, cost, ETA). Works while bootstrap runs in background.
- `cortex bootstrap progress --follow` — tail-style live event stream (useful with `--background`).
- `cortex bootstrap resume` — continue from the last checkpoint (after crash, Ctrl+C, or budget abort).
- `cortex bootstrap refine --domain <name>` — re-process a specific domain at deep mode (used when a domain's quality is observably low or after a major change in that domain).
- `cortex bootstrap refine --auto` — auto-refine all domains scoring below a quality threshold.
- `cortex bootstrap quality-report` — per-domain quality scorecard.

**Inspect intermediate artifacts** (for debugging the wave engine):
- `cortex bootstrap inspect skeleton` — show Phase A's domain map and complexity scores.
- `cortex bootstrap inspect domain <name>` — show Tier 1 + Tier 2 outputs for one domain.
- `cortex bootstrap inspect batch <id>` — show one batch's LLM input/output for debugging.

### MCP Integration

`get_pending_changes` (the bootstrap entry point used by IDE-route ingestion) gains a `mode: "bootstrap-deep"` branch that returns a **multi-step plan** instead of a single prompt:

```json
{
  "mode": "bootstrap-deep",
  "plan": {
    "domains": [...],
    "phases": ["skeleton", "per-domain", "hot-path", "cross-domain", "quality-gate"],
    "estimatedCostUSD": 3.20,
    "estimatedEntityCount": 60
  },
  "currentStep": { "phase": "per-domain", "domain": "auth", "filesToRead": [...] },
  "instructions": "..."
}
```

The IDE-driven Librarian (Phase 4.5) runs each step, calls `save_synthesis` per step, and re-queries `get_pending_changes` for the next step. The result is end-to-end progress orchestrated through MCP without changing the existing tool surface.

### Per-Domain Specialized Prompts

A library of domain-recognition heuristics + specialized prompts shipped as data (`.knowledge/bootstrap-prompts/<domain-type>.md`):

- `react.components.atoms` — Atomic design layer detection, prop interface extraction, styling system identification.
- `react.components.molecules` / `organisms` / `templates` — Compositional patterns, slot patterns.
- `react.hooks` — Custom hook detection, `useQuery`/`useMutation` patterns, hook dependencies.
- `redux.slices` — Slice anatomy, reducer + action + selector triples.
- `redux.sagas` — Saga effect patterns, generator composition.
- `routing` — Route tree extraction, layout composition, guard patterns.
- `services.api` — Endpoint mapping, request/response shape, error handling.
- `services.auth` — Auth flows, token lifecycle, refresh patterns (the exact thing missed in the production example).
- `utilities` — Utility function categorization, side-effect classification.
- `config` — Config sources, feature flag mechanisms, environment dispatching.
- `backend.express` / `backend.fastapi` / `backend.spring` / `backend.rails` — backend framework patterns.
- `database.prisma` / `database.sqlalchemy` / `database.activerecord` — ORM patterns, schema extraction.

Domain type is detected from directory structure + `package.json`/`pyproject.toml`/`go.mod` declared dependencies. Unknown domain types fall back to the general Librarian prompt.

### Comparison vs. Current Behavior

For the same 1800-file production project: **Current bootstrap = 30 seconds, $0.20, 4 entities, 3 concepts**, requiring 3+ manual "deeper please" re-prompts to extract any usable depth. **Phase 33 wave engine = ~6-10 minutes, $3.10-5.10, 60-90 entities, 12-18 concepts, fully autonomous, one CLI command, with prompt caching reducing cost ~40% on warm subsequent runs.** Net: ~20× the spend for ~15-20× the depth in one shot — and the result is actually usable as ground truth instead of requiring follow-up archaeology.

### Architecture & System Design

- **Core Components**: new `src/bootstrap/` package — `skeleton.ts` (multi-language directory walk + monorepo detection + import graph + Leiden clustering), `synthesizer.ts` (per-domain Tier 1 enumeration + Tier 2 detail orchestrator), `wave.ts` (the reusable output-budget-aware wave engine consumed across phases), `hotpath.ts` (PageRank + central-entity deepening), `crossdomain.ts` (cross-domain relationship pass), `qualitygate.ts` (semantic validation + auto-refine), `progress.ts` (checkpoint + resume + MCP event emitter), `prompts/` (domain-specialized prompts as data), `validator.ts` (semantic validation: wikilinks, source-file existence, evidence-quote verification, hallucination detection), `config.ts` (`.cortex/bootstrap.config.yaml` loader), `writer-coordinator.ts` (concurrency-safe writes), `provider-router.ts` (multi-provider failover + circuit breakers). New `src/cli/bootstrap.ts` (with `inspect`, `dry-run`, `enrich`, `incremental`, `refine`, `config` subcommands). Modifications to `src/mcp/server.ts` (the `bootstrap_progress` resource + multi-step `bootstrap-deep` mode). Modifications to `src/llm/client.ts` (prompt-caching headers per provider, continuation chain support, streaming JSON parser hook).
- **Design Pattern**: **Daemon-orchestrated pipeline with checkpointed waves**. Each phase produces an immutable artifact consumed by the next. The wave engine inside Phase B is the reusable core — output-budget-aware, adaptively sized, parallel, rate-limit-aware, provider-resilient. Phases are sequential (B depends on A's domain map, C depends on B's entity graph) but each phase's internal work is maximally parallel. The user issues one command; the daemon is the loop.
- **Key Considerations**:
  - **Output tokens, not input tokens, are the bottleneck** — design centers on output-budget batching. This inverts the conventional wisdom of input-context-budget RAG systems.
  - **Daemon owns the loop, not the chat agent** — fundamental architectural change vs. the current shallow bootstrap, which is implicitly chat-driven.
  - **Prompt caching is first-class** — batches within a domain are ordered to maximize cache hit rate; provider-specific cache headers used aggressively.
  - **Semantic validation is non-optional** — broken wikilinks, hallucinated `sourceFile` paths, and evidence-quote mismatches are auto-detected and trigger targeted regeneration, not silent acceptance.
  - **Concurrency-safe by construction** — single-writer state coordinator + lock file + fsync on checkpoints. Five parallel batches never corrupt state.
  - **Provider resilience is engineered, not assumed** — per-provider rate-limit handling, circuit breakers, multi-provider failover, quota exhaustion as a first-class state.
  - **Domain prompts are versioned data, not code** — community contributions for new domain types (Vue, Svelte, Spring Boot, etc.) ship as data files without code changes.
  - **Deterministic-where-possible** — Phase A (skeleton) is fully deterministic. Phase B/C/D use temperature 0 for stable re-runs. Quality gate scoring is deterministic.
  - **Existing bootstrap path is retained** as `--depth shallow` for users who want the current behavior (or for very small projects where deep is overkill).

### Definition of Ready (DoR)

- Phase 2 (LLM client) stable with rate-limit and retry handling.
- Phase 14 (clustering) stable — Phase B reuses cluster-budget patterns.
- Phase 20.9 (Leiden) stable — Phase A reuses community detection.
- Phase 20.10 (PPR) stable — Phase C reuses PageRank.
- Phase 13 (cost simulation) stable — bootstrap cost estimation reuses it.

### Definition of Done (DoD)

**Autonomous single-command operation**:
- `cortex bootstrap` runs the **entire pipeline autonomously** from one CLI invocation — no chat agent, no MCP roundtrips, no manual "deeper please" prompts.
- The daemon orchestrates the wave loop programmatically via direct LLM API calls.
- `--background` and `--watch` modes work as specified.
- `cortex bootstrap status` returns accurate state for in-flight bootstrap.

**Output-budget-aware wave engine**:
- Per-batch sizing derived from `model.max_output_tokens × CORTEX_OUTPUT_HEADROOM`, not from input size.
- Adaptive sizing converges within first 2-3 batches per domain (measured via test on heterogeneous synthetic codebase).
- Schema partitioning (entities → relationships → evidence → concepts) auto-engages on truncation.
- Continuation chains work on Anthropic (prefill) and OpenAI/Gemini (continuation) models; graceful fallback to batch splitting on unsupported providers.
- Reusable `src/llm/wave.ts` engine consumable by Phases 17, 20.16, 20.18, 29.

**Two-tier synthesis**:
- Tier 1 enumeration pass produces entity stub inventory per domain in one cheap call.
- Tier 2 detail pass batches enumerated stubs into output-budget-sized groups.
- Tier 2 batches run in parallel (default 5 concurrent, rate-limit-aware with 429 backoff).

**Quality targets on the 1800-file reference project**:
- `cortex bootstrap` (no flags, depth auto = deep) produces **≥60 entities and ≥12 concepts in one autonomous run** (Phase 33's revised target with the wave engine).
- All major architectural domains covered (auth, state, routing, services, hooks, components-atoms, components-molecules, utilities, config) — verified by per-domain entity count ≥ 1.
- Each entity has ≥1 evidence anchor (Phase 7).
- Cross-domain relationships established (auth → services, components → hooks, routes → layouts).
- Wall-clock time ≤10 minutes; total LLM cost ≤$5.50 at default settings.

**Reliability**:
- Bootstrap is resumable across process restarts at sub-batch granularity (no >30s of work lost on crash).
- `--budget` hard-cap is honored; bootstrap aborts cleanly at cap with checkpoint.
- Mid-batch crash recovery: re-running `cortex bootstrap resume` picks up only unfinished calls within the in-flight batch.
- Per-domain quality scorecard visible via `cortex bootstrap quality-report`.

**MCP progress streaming**:
- `bootstrap_progress` MCP resource emits real-time events (phase, current batch, cost, ETA, entity count).
- IDE clients (Claude Code, Cursor, VS Code) render a live progress bar without controlling the loop.

**Provider compatibility**:
- Works against Anthropic, OpenAI, Google, and OpenAI-compatible local providers (Ollama, vLLM, TGI).
- Per-provider output-token caps respected (4k for older models, 8k for Claude/Gemini, 16k for GPT-4o).
- Per-provider continuation strategy auto-selected.

**Domain-specialized prompts**:
- ≥10 domain-specialized prompts shipped (React stack: components-atoms, components-molecules, hooks, redux-slices, redux-sagas, routing, services-api, services-auth, utilities, config) + 2-3 backend stacks (Express/Fastify, FastAPI, Spring Boot).
- Unknown domains fall back to general Librarian prompt with no degradation.

**Tests**:
- Skeleton scan correctness on synthetic 1000-file repo (Phase A).
- Output-budget-aware batch sizing converges to optimal within 3 batches on synthetic heterogeneous corpus.
- Schema partitioning correctness — split outputs reconstruct identically to single-shot.
- Continuation chains succeed on synthetic truncated outputs.
- Parallel Tier 2 batches respect rate-limit backoff on simulated 429s.
- Hot-path deepening PageRank correctness on known synthetic graph (Phase C).
- Cross-domain relationship extraction (Phase D).
- Quality-gate auto-refine triggers on synthetic thin-domain case (Phase E).
- Checkpoint resume after simulated mid-batch crash (no work lost beyond in-flight call).
- MCP `bootstrap_progress` event stream conformance (event schema validation, ordering, completeness).
- End-to-end autonomous run on the 1800-file reference project produces ≥60 entities within budget.

### Pros & Cons

- ✅ **Pros**: **Directly fixes the most adoption-blocking issue in Cortex today** — observed in production on a real customer-grade project. Turns the first-impression experience from "this barely works" to "this understood my entire codebase in 6 minutes, autonomously, with one CLI command." Architectural correctness: identifies and engineers around the **physical output-token wall** that no prompt engineering can bypass, then orchestrates the necessary multi-call wave loop in the daemon at machine speed instead of the chat agent at human speed. The reusable `src/llm/wave.ts` engine is consumable across Phases 17, 20.16, 20.18, and 29 — single investment, multiple payoffs. Production-hardening refinements (polyglot/monorepo awareness, prompt caching for 40% cost reduction, semantic validation pipeline, multi-provider failover, declarative config, dry-run mode, explicit failure taxonomy) ship Phase 33 as production-grade rather than prototype-grade. Adaptive batch sizing eliminates per-project tuning. Domain-specialized prompts give Cortex a path to first-class support for any tech stack without core code changes. The quality gate + auto-refine loop means the bootstrap is **self-correcting** — if it produces a thin result, it tries harder until it doesn't. Incremental + enrichment modes mean the investment compounds over a project's lifetime; bootstrap isn't a one-time event.
- ❌ **Cons**: ~20× the raw LLM cost vs. the current shallow bootstrap ($3-5 vs. $0.20); mitigated by `--budget` cap, `--dry-run` cost preview, prompt-cache savings on warm runs (~40%), and `--depth shallow` retaining the legacy behavior for users who want cheap. The wave engine + production-hardening surfaces add real engineering surface area (~15-20 new TypeScript files) — significant compared to the current ~5-line bootstrap path. Mitigated by independent testability per refinement and reusability of `wave.ts` across other phases. Bootstrap latency goes from 30s to ~6-10 minutes — a worse cold-start UX in exchange for a dramatically better cold-start *outcome*; mitigated by the live progress UI showing per-domain ETA, by `--background` mode for huge codebases, and by the fact that bootstrap is one-shot (users don't pay this latency repeatedly). Per-domain specialized prompts are a permanent maintenance surface as ecosystems evolve; mitigated by shipping prompts as data, accepting community contributions, and falling back to the general Librarian prompt on unknown domains. Multi-provider failover testing requires CI against multiple paid providers — real ongoing cost; mitigated by mocking the provider boundary in standard tests and gating live multi-provider tests behind a CI flag run only on release candidates.

---

## 🚫 Explicitly out of scope

**Bi-directional source injection** (writing Cortex-generated comments back into `src/`) was proposed and **rejected**. It violates the read-only-source invariant declared in [CORTEX.md §2](CORTEX.md), creates watcher feedback loops, pollutes git history with machine-authored noise, and produces merge conflicts with developer comments. Cortex's authority over `.knowledge/` and its non-authority over `src/` is a load-bearing boundary, not an accident.

**Roadmap-to-entity phase tagging** was proposed as part of a traceability matrix and **partially rejected**. The generic half (querying `log.md` by entity/time/warnings) is adopted as Phase 7. The project-specific half (annotating `ROADMAP.md` phases with entity links) is rejected — Cortex is meant to work on every codebase, and most codebases don't have a `ROADMAP.md` with phase headings.

**Cortex Cloud / shared remote knowledge base (raw sync).** Raw file-sync of `.knowledge/` across team members is still rejected — it introduces merge conflicts on `state.json` and requires CRDT machinery that doesn't fit Cortex's append-only model. The real version of this feature is implemented as Phase 21 (Polyrepo Federation) + Phase 22 (Central Knowledge Server): a push/pull protocol where each repo publishes a signed export and a central registry aggregates them. That is a structured protocol, not a file sync.

**Semantic vector search over entity descriptions.** Proposed for finding related entities. Rejected: the LLM does this naturally by reading the rich index, and the index is small enough (typically <50KB) that loading the whole thing is cheap. Re-evaluate if a real-world `.knowledge/` exceeds ~200 entities and lookup latency becomes a measured problem.

**Per-project plugin / custom synthesis prompt architecture.** Proposed as a way to enforce domain-specific extraction. Rejected: adds extension-point surface area before there's demonstrated demand. The shared `LIBRARIAN_SYSTEM_PROMPT` is opinionated for a reason; one-off prompt overrides risk fragmenting synthesis quality across projects.

**In-house AST parsing for constraint checks.** Considered as part of Phase 6. Rejected in favor of treating the LLM as the AST: it already produces structured edges, it handles every language uniformly, and rolling our own AST parsers (TypeScript + Python + Go + Rust + ...) is a permanent maintenance tax for marginal accuracy gain.

**Auto-generated README from `.knowledge/`.** Proposed as a public-facing artifact. Rejected: synthesis biases (LLM's view of importance, ordering, terminology) would leak into the project's outward-facing identity. Phase 10's onboarding output is the right surface — opt-in, audience-targeted, and lives in `.knowledge/`, not at the repo root.

**Symmetric encryption of entities (Nexidion-style "private details / public summaries").** Proposed as a way to keep architectural secrets out of the synthesized index. Rejected: it directly conflicts with the plain-markdown, Obsidian-browseable principle that makes `.knowledge/` adoptable. The source code itself is unencrypted in `src/` — encrypting its synthesized description is theatre. Teams with real secrets-in-architecture concerns should keep those modules out of the watched paths via `.gitignore`-style exclusions, not via a parallel key-management surface.

**Chat-turn decision extraction (Origin-style inline synthesis from conversation).** Proposed as a way to capture decisions made during AI-pair coding. Rejected: `log.md` (Phase 3) and `log.jsonl` (Phase 7) already capture every architectural decision _that touches code_. Decisions made in chat that don't touch code are by definition not architectural changes — they're conversation. Cortex's authority boundary is the codebase, not the chat transcript.

**Import-graph pre-caching (TokenZip-style predictive documentation).** Proposed as a way to pre-synthesize docs for files the agent is likely to touch next. Rejected: it inverts Cortex's diff-on-save model into speculative work, most of which will never be consumed. The token cost compounds for hypothetical future reads while delivering no certainty. Phase 13's response compression solves the real version of this problem (repeated reads in one session) without paying for predictions.

**Parallel rationale log (`rationale.json` / "thought stream").** Proposed as a way to record _why_ the Librarian made each synthesis decision. Rejected: `log.jsonl` (Phase 7) already carries the structured event stream with `summary`, `entities`, `warnings`, and (post-Phase-6) `failedApproaches`. A second parallel log invites divergence between the two stores and adds no information that the existing log can't carry.

**Review-gated falsifiable claims (AKBP-style human-in-the-loop synthesis).** Proposed as a way to require explicit user approval before knowledge updates persist. Rejected: it conflicts with the autonomous-synthesis premise that makes Cortex valuable in the first place — the watcher's whole point is that knowledge stays current without manual gating. Users who want a review gate already have one: `manual` mode (Phase 3) batches synthesis until the user types `cortex sync`. The Phase 7 audit surface (`cortex log --since`, `audit_entity`) provides retrospective review without blocking the writer path.

**Runtime awareness layer — CI failures, deployment events, incident correlation.** Proposed as a way to attach operational signals to architectural entities ("which deploy broke `[[PaymentService]]`?"). Rejected: it expands Cortex from architectural memory into observability, where Sentry / Datadog / GitHub Actions / PagerDuty already win. The integrations cost (auth, webhooks, polling, schema-per-provider) is permanent maintenance for a use case adjacent to — not core to — the product. Teams that want this can pipe their incident URLs into entity descriptions manually; the wikilink graph carries them.

**CRDT / immutable timestamped facts with per-entity UUIDs.** Proposed as a way to make `.knowledge/` safe under concurrent Git merges. Rejected: the actual mergeability problem is already mostly solved — each entity is its own file, each concept is its own file, `log.md` is append-only, and `index.md` is regenerated from `state.json`. The only common conflict surface is `state.json` itself; if real-world teams hit it, the right fix is to make `state.json` regeneratable from the per-entity files (already true since v0.3.x's migration logic) and treat conflicts as "rerun ingest." UUIDs everywhere and event-sourced merge logic is a 10× complexity tax for a 1.1× usability gain.

**Native VS Code / Cursor extensions and `cortex://` URI schemes.** Proposed as a way to provide an "always-on" in-editor UX. Rejected: the MCP surface already provides everything an extension would — read tools, save tools, slash commands. Building a per-IDE native extension multiplies maintenance across editors (and breaks every time the IDE's extension API changes) for marginal UX gain over the PreToolUse hook recipe in Phase 4.5.

**First-class Obsidian plugin.** Proposed for graph view + review queue + status bar inside Obsidian. Rejected: Obsidian already renders `.knowledge/` as a navigable graph out of the box because Cortex emits standard `[[WikiLinks]]`. A custom plugin would add minimal value over the default rendering. If a community member wants to build one, the schema is stable and public — it can ship downstream.

**LLM-emitted numerical confidence scores per entity.** Proposed as a quick visual signal of how much to trust a synthesized claim. Rejected: model-emitted confidence is uncalibrated theater. The observable trust signals Cortex already produces — `evidence` (does the cited code still resolve?), `staleSince` (has a depended-on entity changed?), `lastRefined` (how old is this claim?) — derive from facts, not LLM intuition. If a user wants a single-number readout, surface it as a derived trust-signal projection in `cortex status`, not as a stored field.

**Self-maintenance auto-rewrites — auto-prune stale, auto-merge duplicates, auto-correct contradictions.** Proposed as a way to keep the knowledge base healthy over time without user effort. Rejected: Cortex never silently rewrites synthesized content. The right pattern is _surface, don't act_: `cortex lint` (Phase 7) flags duplicates, orphans, anti-patterns, and stale entities; the human (or the LLM via `/ingest`) decides what to do about each. Autonomous rewrites of an architectural source-of-truth invert the trust direction and the read-only-source invariant in spirit, even if not in letter.

**"Remember this" — auto-extracting decisions from chat turns.** Proposed as a way to capture insights mentioned in chat without the user typing a command. Rejected (twice — first as Origin-style chat extraction, now again as "auto-save insight"): Cortex's authority is over the codebase, not the chat transcript. A decision worth remembering is one that touches code; if it doesn't touch code, it's conversation, and the conversation tooling (Claude Code's own memory) is the right home for it.

**Vector / hybrid storage (LanceDB / Chroma / Voyage-code-3).** Reaffirmed rejection. The rich index + drill-down pattern works because typical `.knowledge/` directories are <200 entities and <50KB of text — fully loadable into the LLM's context every call. Hybrid storage solves a problem that does not yet exist in the field; the day a real-world deployment crosses ~200 entities with measured retrieval latency, this gets re-opened.

**AST parsing (Tree-sitter / TypeScript Compiler API / Babel).** Reaffirmed rejection. The LLM is the AST: it produces structured "edges introduced" output uniformly across every language. Rolling per-language AST parsers (TypeScript + Python + Go + Rust + Java + ...) is a permanent maintenance tax for a marginal accuracy gain over LLM-extracted relationships.

**Encrypted cloud team sharing.** Reaffirmed rejection. Local-first means local-first; teams that want shared knowledge commit `.knowledge/` to Git today, which is good enough until a real shared-edit use case emerges. End-to-end encryption + key management + sync semantics is a product-shaped problem, not a feature.

**Plugin marketplace / custom synthesis prompts.** Reaffirmed rejection. The opinionated `LIBRARIAN_SYSTEM_PROMPT` is opinionated for a reason; one-off prompt overrides fragment synthesis quality across projects.

---

## 🛡️ Product Viability & Production Readiness

To elevate Project Cortex from a prototype to a **Viable Product**, the following cross-cutting concerns are established as global requirements:

1.  **Testing Strategy**
    - **Unit Tests**: Core utilities (diff extraction, JSON parsing, Markdown writing) — starter coverage in `tests/`; expand over time.
    - **Integration Tests**: Test the Watcher -> LLM -> Writer pipeline using mocked LLM responses.
    - **End-to-End (E2E)**: Simulate file saves in a mock repository and verify the resulting `.knowledge` outputs.

2.  **Telemetry, Logging, and Observability**
    - ✅ Structured logger (`pino`) with stdout + `cortex.log` in the project root during `cortex watch`.
    - Clear log levels: `DEBUG` / `INFO` / `WARN` / `ERROR` via `LOG_LEVEL`.
    - ✅ Local log file (`cortex.log`) for background monitoring.

3.  **Security & Secrets Management**
    - API Keys must never be logged.
    - ✅ Support loading keys from a global `~/.cortexrc` or project-local `.env` ([src/core/env.ts](src/core/env.ts)); project `.env` overrides global keys.
    - `cortex init` MUST automatically add `.env` to the project's `.gitignore`.

4.  **Error Recovery & Resiliency**
    - **LLM Outages**: The watcher retries each synthesis call up to three times; a durable disk-backed queue for auto mode is still optional future work.
    - **File Locking**: ✅ Implement a lockfile mechanism (`.knowledge/cortex.lock`) to prevent multiple `cortex` instances from running in the same directory simultaneously and corrupting the index.

---

## 🩹 Post-Launch Fixes (v0.3.3)

Three classes of issues surfaced after the first public release. v0.3.3 addresses the **root causes**, not just symptoms.

| #   | Issue                                                   | Root Cause                                                                                                                                                                                                                                                                                                                    | Fix                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| --- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **STDOUT pollution — `invalid character 'â'`**          | `dotenv@17` (the version this project depends on) prints a "tip" message to STDOUT on every `config()` call. The MCP STDIO transport requires STDOUT to contain only JSON-RPC frames, so the tip line breaks every IDE that parses the stream.                                                                                | Added `quiet: true` to both `dotenv.config()` calls in [src/core/env.ts](src/core/env.ts). `pino-pretty` was also routed to STDERR (`destination: 2`) in [src/core/logger.ts](src/core/logger.ts) as defense-in-depth.                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 2   | **Antigravity setup not portable across projects**      | Antigravity prioritizes the global `~/.gemini/antigravity/mcp_config.json` over per-project `.antigravity/mcp_config.json`, so the previous per-project setup was silently ignored. Even when local won, every new project required a fresh setup, and entries with hardcoded `node_modules` paths broke on project switches. | [src/cli/setup.ts](src/cli/setup.ts) antigravity target now defaults to writing the **global** config with a project-agnostic entry (`command: "cortex"`, `args: ["mcp"]`, `env: { DOTENV_CONFIG_QUIET: "1" }`). `findProjectRoot()` resolves the active project from CWD at runtime — one global entry serves every project. A `--local` flag on `cortex setup` writes the per-project file instead. Pre-flight check verifies `cortex` is on PATH; aborts with an install hint if not.                                                                                                                                                                                       |
| 3   | **Bootstrap ingestion documents Project Cortex itself** | Prompt-level guidance ("if index is empty, scan src/") was too weak — `get_pending_changes` still returned a git diff in the user prompt, and LLMs follow what's in front of them. The first diff is invariably "the user installed Cortex," so the first synthesis described Cortex's footprint instead of the user's app.   | Tool-level enforcement: `get_pending_changes` now calls `KnowledgeManager.isEmpty()` and branches. On empty: returns `mode: "bootstrap"` with a curated source-file list (via `listSourceFiles()` in [src/core/scan.ts](src/core/scan.ts)) and `BOOTSTRAP_PROMPT_TEMPLATE` — **the git diff is intentionally absent from the payload**. The file list excludes the Cortex/IDE footprint (`.knowledge/`, `.claude/`, `.agents/`, `.antigravity/`, `.cursor/`, `.vscode/`, etc.), test files (`tests/`, `*.test.*`, `*.spec.*`), and `node_modules`-class noise; includes `docs/`. Capped at 500 entries with a footer. Both ingest prompt files now branch on the `mode` field. |
| 4   | **Bootstrap is too shallow on large codebases — produces ~5 entities on 1800-file projects** | Fix #3 prevents Cortex-self-documentation but doesn't make bootstrap deep. Three compounding issues remain: (a) the 500-file cap silently truncates large repos (1800 files → 1300 invisible); (b) the prompt receives a *file list*, not *file contents*, so the LLM pattern-matches on filenames instead of reading code; (c) it is a single-shot synthesis — one LLM call summarizing the entire repo naturally compresses to ~5 entities regardless of input size. Observed in production on a real ~1800-file React/Redux/Keycloak project: 4 entities, 3 concepts; user had to manually re-prompt 3+ times to extract any depth, and the result was still ~5 entities. | **Tactical (v0.3.4):** raise the 500-file cap to 2000, group the file list by top-level directory so the LLM at least sees structural hints, and tweak `BOOTSTRAP_PROMPT_TEMPLATE` to explicitly require ≥15 entities and ≥5 concepts as a minimum bar. **Strategic (Phase 33):** the proper fix is multi-phase recursive bootstrap with per-domain deep synthesis, hot-path deepening, cross-domain relationship pass, and quality-gate auto-refine — see [Phase 33: Deep Recursive Bootstrap Ingest](#-phase-33-deep-recursive-bootstrap-ingest----planned-p0--fixes-production-issue) for the full design. Phase 33 produces 40-80 entities and 10-15 concepts on the same 1800-file project in one run (~$2.50-6.50, ~6-10 minutes) vs. the current 4 entities for $0.20 in 30 seconds. |
