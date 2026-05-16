# Cortex Task List

Derived from source code inspection + `implementation_plan.md`. Last verified 2026-05-16.

---

## ✅ Done — Phases 1–5 (verified against source)

### Phase 1 — Ingestion & Monitoring Foundation
- [x] `src/core/watcher.ts` — chokidar with 3s debounce, `.gitignore` via `ignore` package, hard-coded ignores (`.git`, `.knowledge`, `node_modules`, `dist`)
- [x] `src/core/diff.ts` — `getFileDiff()` (daemon: single file vs HEAD, untracked fallback) + `getPendingDiff()` (MCP: committed + uncommitted since `.last_sync_commit`)

### Phase 2 — LLM Synthesis Engine
- [x] `src/llm/client.ts` — `generateObject()` via Vercel AI SDK, multi-provider (`CORTEX_PROVIDER`), 3 retries with backoff
- [x] `src/llm/schema.ts` — Zod `SynthesisSchema` (shared by daemon and MCP `save_synthesis`)
- [x] `src/llm/prompts.ts` — `LIBRARIAN_SYSTEM_PROMPT`, `EXTRACTION_PROMPT_TEMPLATE`, `BOOTSTRAP_PROMPT_TEMPLATE`
- [x] `CORTEX_MOCK_AI=true` short-circuit mode

### Phase 3 — Knowledge Storage & Cost Control
- [x] `src/knowledge/writer.ts` — `KnowledgeManager`: entity pages, concept pages, `log.md` append, `index.md` regeneration, `state.json` read/write, migration from legacy markdown
- [x] `.knowledge/state.json` — canonical store with `entities` + `concepts`
- [x] `.knowledge/.last_sync_commit` — HEAD bookkeeping
- [x] `.knowledge/entities/` + `.knowledge/concepts/` — per-entity/concept markdown pages
- [x] `.knowledge/log.md` — append-only synthesis history
- [x] `.knowledge/index.md` — auto-rendered rich index from `state.json`
- [x] Migration: `migrateStateFromDisk()` bootstraps `state.json` from legacy markdown on first init
- [x] Manual sync mode — in-memory diff queue, `cortex sync` stdin trigger batches into one LLM call

### Phase 4 — MCP Server Integration
- [x] `src/mcp/server.ts` — STDIO MCP server, standalone + embedded in `cortex watch`
- [x] Tool: `get_cortex_status`
- [x] Tool: `get_pending_changes` — bootstrap path (empty KB → source-file list) + incremental path (diff since last sync)
- [x] Tool: `save_synthesis` — Zod validation + writer + `.last_sync_commit` update
- [x] Tool: `read_knowledge_index`
- [x] Tool: `read_entity(name)` ← beyond original Phase 4 DoD spec, shipped
- [x] Tool: `read_concept(name)` ← beyond original Phase 4 DoD spec, shipped
- [x] MCP Prompts: `ingest`, `status`, `read`, `explore`

### Phase 4.5 — Dual-Route IDE Integration
- [x] `src/cli/setup.ts` — writes MCP config for `claude-code`, `cursor`, `vscode`, `windsurf`, `claude-desktop`, `antigravity` (global by default, `--local` flag for per-project)
- [x] `src/cli/init.ts` — interactive setup wizard
- [x] `src/core/scan.ts` — `listSourceFiles()` + `renderFileList()` for bootstrap mode; excludes Cortex/IDE/test footprint
- [x] Slash commands for Claude Code: `/ingest_cortex`, `/cortex_status`, `/read_knowledge` (`.claude/commands/`)
- [x] Antigravity workflows: `ingest`, `read`, `status`, `explore` (`.agents/workflows/`)
- [x] Bootstrap fix: `get_pending_changes` returns `mode: "bootstrap"` + source-file list when KB is empty (no diff)
- [x] Antigravity global-config fix: one entry serves all projects via `findProjectRoot()` at runtime

### Phase 5 — CLI Polish & Daemonization
- [x] `cortex init` — interactive setup
- [x] `cortex watch` — background daemon with debounce + lockfile
- [x] `cortex setup [targets...]` — IDE config registration
- [x] `cortex status` — config, knowledge health, daemon lock state, log hint
- [x] `cortex config [-p] [-m] [-i]` — provider/model/mode editor, interactive + flag-driven
- [x] `cortex mcp [--project-root]` — portable STDIO entry point for IDEs
- [x] `cortex read [-e entity] [-c concept]` — print index or drill into entity/concept page ← extra, not in original spec
- [x] Smart root detection — `findProjectRoot()` climbs to `.knowledge` or `.git`
- [x] Structured logging — `pino` to stdout + `cortex.log`; `pino-pretty` routed to STDERR
- [x] Lockfile — `.knowledge/cortex.lock` prevents multiple instances
- [x] Graceful shutdown — `SIGINT`/`SIGTERM` handlers
- [x] Global env — `~/.cortexrc` loaded before project `.env` via `src/core/env.ts`
- [x] Starter tests — `tests/*.test.ts` (schema + writer delete behavior)

---

## 🔲 Remaining small items — before Phase 6

These are planned follow-ups from Phases 4.5 and 5 that are **not yet implemented**:

- [ ] **PreToolUse hook recipe** (Phase 4.5 planned enhancement) — `.claude/hooks/` config that auto-injects `read_knowledge_index` output into context before any Read/Grep tool call. Pure JSON config + one-line shell wrapper. `.claude/hooks/` directory does not exist yet.
- [ ] **`cortex status --next`** (Phase 5 follow-up) — single state-aware recommendation derived from `state.json` + `.last_sync_commit`. e.g. *"N files changed since last sync — run `cortex sync`"*. No `--next` flag on `runStatus` yet.
- [ ] **`cortex init --magic`** (Phase 5 follow-up) — one-command setup: auto-detect IDE (`.claude/`, `.cursor/`, `.vscode/`, `.windsurf/`, `.antigravity/`), run `npm run build` if `dist/` missing, register all IDEs, scaffold `.knowledge/`, write `.gitignore` entries. No `--magic` flag on `runInit` yet.

---

## ⏳ Planned — Phases 6–13

### Phase 6 — Active Guardrail: Constraints & Blast-Radius Analysis
- [ ] `constraints?` field on entities (`mustNotImport`, `mustNotBeCalledBy`, `contract`) — persisted in `state.json`, injected into CURRENT CONTEXT
- [ ] `save_synthesis` rejection when a synthesis violates a declared constraint (structured error, not a warning)
- [ ] `relationships[]` typed edges (`depends_on | called_by | supports | contradicts | derived_from | parent_of`) — replaces flat `links[]`
- [ ] Auto-migrate legacy `links[]` → `relationships[]` with `kind: "depends_on"` on first load
- [ ] Blast-radius staleness — `staleSince` stamped on inbound `depends_on`/`called_by` dependents when an entity is materially updated
- [ ] `failedApproaches[]` on entities/concepts — extracted from `replaces:` clauses, capped at 10, replayed into CURRENT CONTEXT
- [ ] `save_concept` MCP tool — explicit query-result persistence: `{ name, description, links? }` → creates/updates concept page + log append + index regeneration
- [ ] `cortex status` reports stale-entity count; `cortex audit stale` lists them
- [ ] Schema extension in `src/llm/schema.ts` + writer + MCP + prompts
- [ ] Tests: constraint persistence, violation rejection, stale propagation (2-hop), legacy-links migration, failedApproach capture+replay, `save_concept` create vs. update

### Phase 7 — Audit & Traceability Tools
- [ ] `log.jsonl` — structured JSON line emitted alongside `log.md` on every synthesis
- [ ] `evidence?` block per entity (`sourceFile`, `lineRange?`, `commit?`, `content?`) — bounded: ≤2 entries, ≤10 lines, ≤500 chars total
- [ ] Secret-redaction pass on `evidence.content` before persistence; warning emitted naming source file
- [ ] Librarian prompt rule: quote only when it materially clarifies; pointer-only is default
- [ ] CLI: `cortex log --entity <name>`, `--since <commit|date>`, `--warnings`
- [ ] CLI: `cortex audit stale`, `cortex audit evidence`
- [ ] CLI: `cortex evolution <entity> [--since] [--format]` — per-entity semantic timeline from `log.jsonl`
- [ ] CLI: `cortex evolution --replay --at <commit>` — reproduce `index.md` at any past commit
- [ ] CLI: `cortex lint` — orphans, silos, cycles, god-module candidates, contradiction-heavy nodes, duplicate candidates; exit 1 on blocking issues
- [ ] Backfill: parse existing `log.md` → `log.jsonl` on first run, stamped `migrated: true`
- [ ] MCP tools: `audit_entity`, `audit_since`, `audit_evidence`, `evolution_entity`
- [ ] New source files: `src/knowledge/audit.ts`, `src/knowledge/lint.ts`, `src/knowledge/evolution.ts`, `src/cli/log.ts`, `src/cli/lint.ts`, `src/cli/evolution.ts`
- [ ] Tests: dual-emit, query-by-entity, since-filter, warnings-only, evidence-drift detection, silo detection

### Phase 8 — Visual & Browseable Knowledge Graph
- [ ] `cortex graph` — Mermaid/dot/JSON output; `--scope`, `--depth`, `--include-concepts`, `--format` flags
- [ ] `cortex serve` — local-only HTTP server (`127.0.0.1`) with bundled graph viewer (D3 or Cytoscape, no external CDN)
- [ ] Stale entities desaturated; warned entities red-badged in viewer
- [ ] Click node → full entity page
- [ ] Viewport culling for large graphs (300+ entities)
- [ ] New source files: `src/knowledge/graph.ts` (shared builder), `src/cli/graph.ts`, `src/server/` (HTTP + static assets)
- [ ] Tests: Mermaid emission, server lifecycle, no external asset requests

### Phase 9 — Refactoring Impact Preview
- [ ] `cortex impact <entity> [--depth N] [--format text|json]` — hop-ranked inbound dependents
- [ ] `cortex deps <entity>` — outbound dependency traversal
- [ ] `cortex impact <entity> --hypothetical delete` — simulate removal
- [ ] `impact_analysis(name, depth?)` MCP tool
- [ ] Reuses `src/knowledge/graph.ts` from Phase 8
- [ ] New source files: `src/cli/impact.ts`
- [ ] Tests: hop ranking, hypothetical mode, empty-dependency, cyclic-link safety

### Phase 10 — Onboarding & Guided Reading
- [ ] `cortex onboard [--audience junior|senior|domain-expert] [--depth quick|thorough]` — `.knowledge/onboarding.md` with ordered reading path
- [ ] Centrality scoring (PageRank, damping 0.85, over `depends_on`/`called_by`/`parent_of` edges)
- [ ] Parent-summary concepts — auto-emitted for directories with ≥5 entities; `kind: "parent_of"` edges
- [ ] `cortex find --type entity|concept|parent "<query>"` — substring+token match over `state.json` + `evidence[].content`
- [ ] MCP `onboard` prompt
- [ ] New source files: `src/knowledge/onboarding.ts`, `src/cli/onboard.ts`, `src/cli/find.ts`
- [ ] Tests: empty-base graceful fail, centrality ranking, parent-summary threshold, `cortex find` ordering

### Phase 11 — Monorepo Federation
- [ ] `cortex init --monorepo` — auto-detect pnpm/yarn/turbo workspaces; scaffold `.cortex/workspaces.json`
- [ ] Per-workspace `.knowledge/` routing in watcher
- [ ] Cross-workspace `[[ws:Entity]]` WikiLink syntax + federated index
- [ ] Cross-workspace constraints honored
- [ ] New source files: `src/core/workspace.ts`; modified watcher + writer

### Phase 12 — Git & CI Integration
- [ ] `cortex install-hooks` / `cortex uninstall-hooks` — pre-push hook
- [ ] `cortex sync --dry-run` — structured report without writing
- [ ] GitHub Action `developer-metalhead/cortex-action@v1` — sticky PR comment with entity diff + constraint violations (CI fail) + warnings (comment only)
- [ ] New source files: `src/cli/hooks.ts`; separate published action repo

### Phase 13 — Token Economics & Context Packs
- [ ] `cortex context build --budget <tokens> --scope <entity> --depth N --format markdown|json`
- [ ] `cortex test-cost [--budget <usd>]` — offline token + dollar estimate, no LLM calls
- [ ] Session-scoped MCP response compression — `§ref:<hash>§` + `resolve_refs(refs[])` MCP tool; 256KB LRU cache
- [ ] New source files: `src/knowledge/packer.ts`, `src/cli/context.ts`, `src/cli/test-cost.ts`, `src/mcp/compression.ts`

---

## 🚫 Out of Scope (decided, not revisited without strong reason)

- Bi-directional source injection (write back to `src/`)
- Cortex Cloud / remote shared knowledge base
- Semantic vector / hybrid search (LanceDB, Chroma)
- In-house AST parsing (Tree-sitter, TypeScript Compiler API)
- Native VS Code / Cursor / Obsidian extensions
- LLM-emitted confidence scores
- Self-maintenance auto-rewrites (auto-prune, auto-merge, auto-correct)
- Chat-turn decision extraction ("remember this" from conversation)
- CRDT / UUID-per-entity immutable facts
- Encrypted cloud team sharing
- Plugin marketplace / custom synthesis prompts
- Auto-generated README from `.knowledge/`
- Import-graph pre-caching (speculative docs)
- Parallel rationale log (`rationale.json`)
- Review-gated human-in-the-loop synthesis
- Runtime/CI correlation (incident ↔ entity)
