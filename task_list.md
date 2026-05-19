# Cortex Task List

Derived from source code inspection + `implementation_plan.md`. Last verified 2026-05-19.

---

## ✅ Done — Phases 1–7.5 (verified against source + 81/81 tests passing)

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

## ✅ Phase 4.5 / 5 follow-ups — now complete

- [x] **PreToolUse hook recipe** — `.claude/hooks/inject-knowledge.js` (cross-platform Node.js, PPID session key). `cortex setup claude-code` now writes the script into `.claude/hooks/` and registers the `PreToolUse` matcher in `.claude/settings.json` automatically.
- [x] **`cortex status --next`** — `src/cli/status.ts:runStatusNext`. Checks KB state → empty → never synced → git diff count vs `.last_sync_commit`. Emits one line. Wired as `cortex status --next`.
- [x] **`cortex init --magic`** — `src/cli/init.ts:runInitMagic`. Detects IDE marker dirs, scaffolds `.knowledge/`, appends `.gitignore` entries, checks for built `dist/`, calls `setupIDE` for all detected IDEs. Wired as `cortex init --magic`.

---

## ✅ Layered entity page extensions (shipped alongside Phase 6/7 prompt updates)

- [x] **`## Lifecycle` section** — optional section for entities with setup/teardown obligations; format `Setup: …` / `Teardown: …` ([src/llm/prompts.ts:126-130](src/llm/prompts.ts#L126-L130))
- [x] **`## Verification` section** — optional section for non-trivial verification paths with automated/manual-repro/success-condition/edge-cases bullets ([src/llm/prompts.ts:142-149](src/llm/prompts.ts#L142-L149))
- [x] **Purity hint inside `## Behavior`** — prose line emitted when purity characteristic is non-obvious ([src/llm/prompts.ts:137](src/llm/prompts.ts#L137))
- [x] **Guard-clause invariants in `## Behavior`** — emitted when guard encodes non-obvious precondition (auth-required, init-must-complete-first, feature-flag-gated, deferred-state) ([src/llm/prompts.ts:138](src/llm/prompts.ts#L138))
- [x] Domain hints by file type (UI / backend / library / infra) ([src/llm/prompts.ts:154-158](src/llm/prompts.ts#L154-L158))

**Explicitly NOT added** (evaluated, rejected): stored test-snippet blobs in entity pages (drift risk, two sources of truth), `Used By (Verification Required)` regression-anchor lists (already covered by Phase 6 staleness + Phase 9 `cortex impact`).

---

## ✅ Phase 6 — Active Guardrail: Constraints & Blast-Radius Analysis (verified 2026-05-19, all DoD met)

- [x] `constraints?` field on entities (`mustNotImport`, `mustNotBeCalledBy`, `contract`) — persisted in `state.json` ([src/llm/schema.ts:22-26](src/llm/schema.ts#L22-L26), [src/knowledge/writer.ts:23](src/knowledge/writer.ts#L23)), injected into CURRENT CONTEXT via `getEntityGuardrails()` ([src/knowledge/writer.ts:133-170](src/knowledge/writer.ts#L133-L170))
- [x] `save_synthesis` rejection on constraint violation — structured `Constraint Violation:` error thrown by writer ([src/knowledge/writer.ts:444-459](src/knowledge/writer.ts#L444-L459)), caught and returned as `isError: true` by MCP server ([src/mcp/server.ts:891-902](src/mcp/server.ts#L891-L902))
- [x] `relationships[]` typed edges (`depends_on | called_by | supports | contradicts | derived_from | parent_of`) — replaces flat `links[]` ([src/llm/schema.ts:17-20](src/llm/schema.ts#L17-L20))
- [x] Auto-migrate legacy `links[]` → `relationships[]` with `kind: "depends_on"` on first load ([src/knowledge/writer.ts:296-303](src/knowledge/writer.ts#L296-L303))
- [x] Blast-radius staleness — `staleSince` stamped on inbound `depends_on`/`called_by` dependents on update; constraint validation + propagation restricted to `USAGE_KINDS` ([src/knowledge/writer.ts:17](src/knowledge/writer.ts#L17), [src/knowledge/writer.ts:463-487](src/knowledge/writer.ts#L463-L487))
- [x] `failedApproaches[]` on entities + concepts — capped at 10 most recent + dedup by summary across updates ([src/knowledge/writer.ts:411-419](src/knowledge/writer.ts#L411-L419))
- [x] `failedApproaches` and `constraints` replayed in CURRENT CONTEXT via `getEntityGuardrails()` (max 3 recent failures per entity to keep prompt bounded)
- [x] `save_concept` MCP tool — explicit query-result persistence with `relationships?` + `failedApproaches?` ([src/mcp/server.ts:958-985](src/mcp/server.ts#L958-L985), [src/knowledge/writer.ts:598-644](src/knowledge/writer.ts#L598-L644))
- [x] `cortex status` reports `Stale Entities:` count ([src/cli/status.ts:73](src/cli/status.ts#L73)); `cortex audit stale` lists them with source paths + .md file refs ([src/cli/audit.ts:5-29](src/cli/audit.ts#L5-L29))
- [x] `cortex export --spec` — renders `state.json` as human-readable `ARCH_SPEC.md` with entities + concepts + constraints + failedApproaches ([src/knowledge/writer.ts:735-788](src/knowledge/writer.ts#L735-L788), [src/cli/export.ts](src/cli/export.ts))
- [x] `refresh_stale_entities` MCP tool — clears stale flags on verified-clean entities without rewriting descriptions ([src/mcp/server.ts:723-754](src/mcp/server.ts#L723-L754), [src/knowledge/writer.ts:710-733](src/knowledge/writer.ts#L710-L733))
- [x] `audit` MCP tool + `audit` slash command — staleness reporting via MCP ([src/mcp/server.ts:663-676](src/mcp/server.ts#L663-L676), prompt at [src/mcp/server.ts:254-289](src/mcp/server.ts#L254-L289))
- [x] `export` MCP tool + `export` slash command ([src/mcp/server.ts:711-720](src/mcp/server.ts#L711-L720))
- [x] Schema extension in `src/llm/schema.ts` + writer + MCP + prompts (full `Phase 6` updates to Librarian prompt at [src/llm/prompts.ts:42-81](src/llm/prompts.ts#L42-L81))
- [x] **Tests (15 passing)** in `tests/phase6.test.ts`: constraint persistence, in-batch violation detection, violation rejection on `mustNotImport` + `mustNotBeCalledBy`, non-violation for `contradicts`/`supports`/`derived_from` edges, 2-hop stale propagation, stale-flag re-render with WARNING block, stale-clearing on re-synthesis, no self-stale within batch, propagation only via usage edges, staleCount + staleEntities, `refreshStaleEntities` round-trip + skip-non-stale, `failedApproaches` cap-at-10 + dedup-by-summary, `sourceFile` + concept-`failedApproaches` preservation on omitted-field updates, `getEntityGuardrails` returns block with constraints + recent failures, `exportSpec` includes all sections, `[STALE]` rendered in index

## ✅ Phase 7 — Audit & Traceability Tools (verified 2026-05-19, all DoD met)

- [x] `log.jsonl` — structured JSON line emitted alongside `log.md` on every `saveSynthesis` AND `saveConcept`, with embedded `state` snapshot per entry for replay ([src/knowledge/writer.ts:527-540, 634-643](src/knowledge/writer.ts#L527-L540))
- [x] `evidence?` block per entity (`sourceFile`, `lineRange?`, `commit?`, `content?`) — bounded by writer: ≤ 2 entries per entity, ≤ 10 lines per snippet, ≤ 500 chars total ([src/llm/schema.ts:3-8](src/llm/schema.ts#L3-L8), [src/knowledge/writer.ts:364-391](src/knowledge/writer.ts#L364-L391))
- [x] Secret-redaction pass on `evidence.content` before persistence — 6 regex patterns covering quoted assignments, env-style `*_KEY/SECRET/TOKEN=`, `Authorization: Bearer/Basic/Token`, JWT triplets, provider prefixes (`sk-`, `ghp-`, `AKIA`, `AIza`, `xoxb-`, etc.), and PEM private-key headers ([src/knowledge/writer.ts:51-76](src/knowledge/writer.ts#L51-L76)); warning emitted naming source file ([src/knowledge/writer.ts:380-384](src/knowledge/writer.ts#L380-L384))
- [x] Librarian prompt rule: quote only when materially clarifies; pointer-only default ([src/llm/prompts.ts:63-69](src/llm/prompts.ts#L63-L69))
- [x] CLI: `cortex log --entity <name>`, `--since <commit|date>`, `--warnings-only` ([src/cli/log.ts](src/cli/log.ts), [src/cli/index.ts:157-165](src/cli/index.ts#L157-L165))
- [x] CLI: `cortex audit stale` + `cortex audit evidence` ([src/cli/audit.ts](src/cli/audit.ts), [src/cli/index.ts:140-155](src/cli/index.ts#L140-L155))
- [x] CLI: `cortex evolution <entity> [--since] [--format markdown|json]` — per-entity timeline from `log.jsonl` ([src/cli/evolution.ts:50-70](src/cli/evolution.ts#L50-L70), [src/knowledge/evolution.ts:63-77](src/knowledge/evolution.ts#L63-L77))
- [x] CLI: `cortex evolution --replay --at <commit|date>` — reproduces `index.md` at past point using embedded `state` snapshot (with name-only fallback for pre-snapshot entries) ([src/cli/evolution.ts:18-41](src/cli/evolution.ts#L18-L41), [src/knowledge/evolution.ts:85-135](src/knowledge/evolution.ts#L85-L135))
- [x] CLI: `cortex lint` — 6 rules implemented: `missing_source`, `orphan` (over full graph), `cycle` (deduped via canonical member set), `god_module` (default >10, configurable via `CORTEX_GOD_MODULE_THRESHOLD`), `contradiction_heavy`, `silo` (handles equal-sized components on 3+ component graphs) ([src/knowledge/lint.ts](src/knowledge/lint.ts), [src/cli/lint.ts](src/cli/lint.ts)); exit code 1 on `error`-severity findings
- [x] Backfill: `parseLegacyLogToJSONL` runs on first `init()` when `log.md` exists but `log.jsonl` doesn't — stamps entries with `migrated: true` ([src/knowledge/writer.ts:229-278](src/knowledge/writer.ts#L229-L278))
- [x] MCP tools: `log_query` (consolidates `audit_entity` + `audit_since`), `audit_evidence`, `lint`, `evolution_entity` ([src/mcp/server.ts:601-633, 678-709](src/mcp/server.ts#L601-L633))
- [x] `--since` resolution accepts ISO date OR git commit hash via `git show -s --format=%cI`; emits stderr warning if neither parses (no silent-pass-everything bug) ([src/knowledge/audit.ts:67-81, 107-112](src/knowledge/audit.ts#L67-L81))
- [x] Evidence drift detection uses Levenshtein edit distance with bounded early-exit (cap = `clamp(snippet/10, 5, 50)`); prefers `lineRange` slice over whole-file search; surfaces `drift-source-missing` / `drift-content-changed` / `drift-evidence-lost` issue kinds ([src/knowledge/audit.ts:124-203](src/knowledge/audit.ts#L124-L203))
- [x] `evidenceDriftCount` surfaces in `cortex status` ([src/cli/status.ts:49-54, 74](src/cli/status.ts#L49-L54))
- [x] New source files: `src/knowledge/audit.ts`, `src/knowledge/lint.ts`, `src/knowledge/evolution.ts`, `src/cli/log.ts`, `src/cli/lint.ts`, `src/cli/evolution.ts` — all present and wired into `src/cli/index.ts`
- [x] **Tests (12 passing)** in `tests/phase7.test.ts`: evidence rules + secret redaction, expanded redaction patterns (Bearer, AWS env-style, JWT triplets), cycle deduplication on synthetic A→B→A graph, orphan check honors non-usage edges, silo detection on 3-component equal-size graph, god_module threshold respects env var, JSONL backfill from legacy `log.md`, queryLog corrupt-line resilience, `--warningsOnly` filter, `--since` ISO date filter, `--since` invalid-token graceful warning (no silent pass), evidence drift tolerance (small edits pass; large changes flagged; source-missing detected), evolution replay reconstructs index from state snapshot

---

## ✅ Phase 7.5 — Knowledge Quality & Enterprise Governance Foundation (verified 2026-05-19, all DoD met, 42 tests passing)

- [x] **`computeQuality()` pure function** in [src/knowledge/quality.ts](src/knowledge/quality.ts) — 5-dimensional `(score, evidenceFreshness, contradiction, staleness, age, humanReview)` deterministic computation; no I/O, no LLM calls
- [x] **Per-dimension formulas** matching the spec: staleSince → 0.0; human_reviewed → 1.0 vs 0.7 default; contradiction decays 0.2 per open count; evidence source-missing → 0.0; evidence drift × 0.5 penalty
- [x] **Age decay curve** — 1.0 ≤30 days, linear decay to 0.3 at 180 days; configurable via `CORTEX_QUALITY_AGE_DECAY_DAYS` ([src/knowledge/quality.ts:48-69](src/knowledge/quality.ts#L48-L69))
- [x] **`updateIndex()` renders quality badge** per entity — `### [[X]] — \`src/x.ts\` ▸ quality: 94%` ([src/knowledge/writer.ts:709-717](src/knowledge/writer.ts#L709-L717))
- [x] **Entity drill-down page footer** shows full breakdown — `*Quality: 94% (evidence 100% · contradictions 100% · staleness 100% · age 100% · human-review 70%)*` ([src/knowledge/writer.ts:614-628](src/knowledge/writer.ts#L614-L628))
- [x] **`human_reviewed` + `reviewed_by` fields** added to `EntityRecord`, persisted in `state.json` ([src/knowledge/writer.ts:30-36](src/knowledge/writer.ts#L30-L36))
- [x] **Merge logic preserves human review** across re-synthesis ([src/knowledge/writer.ts:441-446](src/knowledge/writer.ts#L441-L446)) — Librarian never sees those fields, so always pulled forward from prior record
- [x] **`cortex review accept <entity> [--reviewer <name>]`** + **`cortex review reject <entity>`** CLI in [src/cli/review.ts](src/cli/review.ts), wired in [src/cli/index.ts:182-198](src/cli/index.ts#L182-L198)
- [x] **`cortex audit quality`** CLI: lists every entity by score asc, flags bottom decile (⬇️), exits 1 if any below `CORTEX_QUALITY_GATE` (default 0.5, configurable) ([src/cli/audit.ts:51-93](src/cli/audit.ts#L51-L93))
- [x] **`cortex status` shows `Low Quality:` count** alongside Stale + Evidence Drift ([src/cli/status.ts:46-50, 81](src/cli/status.ts#L46-L50))
- [x] **`get_entity_quality` MCP tool** registered with input `{ entity: string }`, returns full breakdown ([src/mcp/server.ts:632-642, 728-748](src/mcp/server.ts#L632-L642))
- [x] **`get_cortex_status` MCP tool** now includes `lowQualityCount` ([src/mcp/server.ts:644-674](src/mcp/server.ts#L644-L674))

### Phase 7.5 — Org-Wide Custom Constraint Language

- [x] **`cortex.constraints.json` loader** at project root (JSON not YAML — zero new deps, matches rest of Cortex storage; legacy `.yaml/.yml` files trigger a clear migration error) ([src/knowledge/org-constraints.ts:55-95](src/knowledge/org-constraints.ts#L55-L95))
- [x] **Schema validation** — `version: 1` mandatory; duplicate IDs rejected; unsupported schema versions rejected with file-name-bearing error messages ([src/knowledge/org-constraints.ts:97-138](src/knowledge/org-constraints.ts#L97-L138))
- [x] **Glob matcher** — `**` matches any path (incl. `/`); `*` matches segment chars except `/`; literal segments must match exactly. Custom impl, no external dep ([src/knowledge/org-constraints.ts:48-72](src/knowledge/org-constraints.ts#L48-L72))
- [x] **`OrgConstraintEvaluator`** with `evaluateAll()` + `splitBySeverity()` ([src/knowledge/org-constraints.ts:231-300](src/knowledge/org-constraints.ts#L231-L300))
- [x] **4 rule kinds supported**: `mustNotImport` (string or array of globs against relationship targets, usage-kinds only), `requiresEvidence`, `requiresConstraint: contract|mustNotImport|mustNotBeCalledBy`, scope filters via `sourcePattern` AND/OR `tag`
- [x] **Error severity throws** `Org Constraint Violation:` (parallel to Phase 6's `Constraint Violation:`) — caught by MCP server's `save_synthesis` handler and returned as structured `isError: true` response ([src/knowledge/writer.ts:473-490](src/knowledge/writer.ts#L473-L490))
- [x] **Warning severity surfaces in `synthesis.warnings`** rather than blocking; appears in `log.md` + `log.jsonl` for traceability
- [x] **`cortex lint` reports `org_constraint` rule category** for both error- and warning-severity findings; gracefully degrades to a single lint warning if the constraint file is malformed ([src/knowledge/lint.ts:179-216](src/knowledge/lint.ts#L179-L216))

### Phase 7.5 — Tests (42 passing in `tests/phase7_5.test.ts`)

- [x] Per-dimension score computation (evidenceFreshness, contradiction, staleness, age, humanReview)
- [x] Age decay curve (1.0 ≤30d, 0.3 floor ≥180d, linear midpoint, configurable window, unparseable date floor)
- [x] `formatScore()` rounding
- [x] `updateIndex` emits quality badge format
- [x] Quality score reflects staleness propagation across re-synthesis
- [x] `setHumanReview` persists `human_reviewed`/`reviewed_by` in state.json
- [x] `setHumanReview` boosts score from 0.94 → 1.0
- [x] Re-synthesis preserves prior human review (Librarian never re-emits these fields)
- [x] `setHumanReview` returns `{ ok: false, reason }` for unknown entities
- [x] `listEntityQuality` sorts ascending; bottom-decile flagging correct
- [x] `getLowQualityCount` respects threshold (0.5 / 0.75 / 0.95)
- [x] `globMatch` semantics (`**` vs `*` vs literal)
- [x] `loadOrgConstraints` returns null when file absent
- [x] `loadOrgConstraints` parses valid JSON; throws on malformed JSON with file name
- [x] Legacy `.yaml` file triggers migration error
- [x] Schema validation rejects unsupported version + duplicate IDs
- [x] `OrgConstraintEvaluator` mustNotImport error → `throwOnErrors` throws
- [x] sourcePattern filter scopes correctly
- [x] mustNotImport only fires on usage edges (not contradicts/supports/etc.)
- [x] `requiresEvidence` flags scoped entities with no evidence
- [x] `requiresConstraint: contract` flags entities missing the contract
- [x] No-scope constraints apply globally
- [x] `mustNotImport` accepts array of globs (any-match)
- [x] `saveSynthesis` rejects error-severity violations with `Org Constraint Violation:` error
- [x] Warning-severity violations forwarded to `synthesis.warnings` + appear in `log.md`
- [x] `cortex lint` emits `org_constraint` rule for violations
- [x] Malformed constraint file surfaces as single lint warning, doesn't abort lint

---

## ✅ Phase 8 — Visual & Browseable Knowledge Graph (verified 2026-05-19, all DoD met, 22 tests passing)

- [x] `src/knowledge/graph.ts` — `buildGraph()` pure function: state.json → `KnowledgeGraph` (nodes + edges); `toMermaid()` with classDef colour blocks (green/amber/red/stale/concept); `toJson()`; `qualityColor()` (≥0.8 green, ≥0.5 amber, <0.5 red); `filterByScope()` BFS bidirectional with `--depth` limit; concept nodes via `includeConcepts` flag; duplicate edge deduplication in Mermaid output
- [x] `src/cli/graph.ts` — `runGraph()`: loads via `km.getState()`, supports `--scope`, `--depth`, `--include-concepts`, `--format mermaid|json`, `--output <file>`
- [x] `src/server/index.ts` — `runServe()`: Node built-in `http`, binds `127.0.0.1` by default; `GET /` → self-contained HTML+CSS+JS (no external CDN); `GET /api/graph` → live KnowledgeGraph JSON; `GET /api/entity/:name` + `GET /api/concept/:name` → entity/concept markdown; inline vanilla-JS force-directed SVG layout; click node → detail panel with markdown + quality breakdown footer; quality-color coded nodes; stale nodes desaturated; hover tooltip shows quality dimensions
- [x] `KnowledgeManager.getState()` public accessor added to `src/knowledge/writer.ts`
- [x] `cortex graph` + `cortex serve` commands wired into `src/cli/index.ts`
- [x] **Tests (22 passing)** in `tests/phase8.test.ts`: qualityColor boundary thresholds, buildGraph empty/single/multi-edge, scope depth-1/depth-2/not-found, stale flag, concepts include/exclude, toMermaid empty/single/stale/concept/deduplication, toJson round-trip, quality-color on synthetic graph, server lifecycle (GET /api/graph, GET /api/entity/:name, GET / no-CDN check)

## ✅ Phase 9 — Refactoring Impact Preview (verified 2026-05-19, all DoD met)

- [x] `buildImpactReport(graph, entity, direction, depth)` in `src/knowledge/graph.ts` — directional BFS (inbound = who depends on entity; outbound = what entity depends on); groups by hop, annotates quality score + lowQuality badge + via relationship kind
- [x] `cortex impact <entity> [--depth N] [--format text|json] [--hypothetical delete]` — hop-ranked inbound dependents; hypothetical-delete mode lists direct breakage ([src/cli/impact.ts](src/cli/impact.ts))
- [x] `cortex deps <entity> [--depth N] [--format json]` — outbound dependency traversal ([src/cli/impact.ts](src/cli/impact.ts))
- [x] `impact_analysis` MCP tool registered with `entity`, `direction`, `depth`, `hypothetical` args ([src/mcp/server.ts](src/mcp/server.ts))
- [x] MCP prompts: `impact` (inbound, optional hypothetical) + `deps` (outbound) — interactive when entity arg omitted, direct when provided
- [x] Reuses `src/knowledge/graph.ts` from Phase 8 (no duplicate traversal code)
- [x] `cortex impact` + `cortex deps` wired into `src/cli/index.ts`

## 🚧 In Progress — Phase 10 (Onboarding & Guided Reading)

### Phase 10 — Onboarding & Guided Reading
- [/] `cortex onboard [--audience junior|senior|domain-expert] [--depth quick|thorough]` — `.knowledge/onboarding.md` with ordered reading path
- [ ] Centrality scoring (PageRank, damping 0.85, over `depends_on`/`called_by`/`parent_of` edges)
- [ ] Parent-summary concepts — auto-emitted for directories with ≥5 entities; `kind: "parent_of"` edges
- [ ] `cortex find --type entity|concept|parent "<query>"` — substring+token match over `state.json` + `evidence[].content`
- [ ] MCP `onboard` prompt
- [ ] New source files: `src/knowledge/onboarding.ts`, `src/cli/onboard.ts`, `src/cli/find.ts`
- [ ] Tests: empty-base graceful fail, centrality ranking, parent-summary threshold, `cortex find` ordering

## ⏳ Planned — Phases 11–13

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
