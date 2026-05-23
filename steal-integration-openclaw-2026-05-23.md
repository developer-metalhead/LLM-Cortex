# Integration Scratch — openclaw — 2026-05-23

> Copy-paste-ready additions for `implementation_plan.md` and `flaws.md`.
> Review and edit before pasting. Items with score ≥ 30 included.
> Source audit: `steal-inventory-openclaw-2026-05-23.json`

---

## To paste into flaws.md

### Flaw #118 — Break-glass flags without runtime warning
**Severity**: 2 (low)
**Description**: Config flags prefixed `dangerous*` (e.g., `dangerouslyDisableDeviceAuth`) lower security posture when activated but surface no in-process warning — only static docs. An operator who forgets they enabled the flag gets no reminder.
**Proposed fix**: Emit a one-time startup `console.warn` (or structured log entry at `WARN` level) when any `dangerous*` flag is active. Include the flag name and a docs link.
**Source-of-lesson**: openclaw/SECURITY.md:297

---

## To paste into implementation_plan.md

> Match existing style: Phase X.Y Refinement — `title` (emoji, dates, brief body, sub-bullets).

---

### Phase 13.X Refinement — Prompt-Cache Ordering Discipline (score: 45)

**What**: Add an explicit rule to CLAUDE.md and any agent skill templates: all maps, sets, registries, plugin lists, file listings, and network results must be sorted in **deterministic order** before being assembled into LLM tool payloads or context packs. Preserve prior transcript bytes unchanged where possible.

**Why**: Non-deterministic iteration order (JS `Map`/`Set`, object key insertion) silently invalidates the Anthropic prompt cache on every call. For Cortex's `build_context_pack` and `source` tools — which prepend the same index + entity headers each call — this can mean paying for a full context re-tokenization on every MCP invocation even when nothing logically changed.

**Where**: 
- `build_context_pack` entity ordering (sort by `entity_id`)
- `cortex_find` result ordering (sort by stable score + path tie-break)
- Any registry or plugin list serialized into prompts

**Source**: openclaw/AGENTS.md:41

---

### Phase 5.7.X Refinement — Standing Orders Template for Cron Skills (score: 36)

**What**: Add a `Standing Order` section to each scheduled skill's SKILL.md template covering: (1) Scope — what programs this authority covers, (2) Triggers — events/schedules that activate execution, (3) Approval gates — which actions require human sign-off, (4) Escalation — what to do after 3 consecutive failures, (5) Execute-Verify-Report discipline — agent must report outcome and evidence, not just completion.

**Why**: Cortex's Phase 5.7 (Scheduled Operations) plans cron-driven ingest and consolidation runs. Without explicit authority + escalation rules, agents either over-act (running destructive consolidations autonomously) or under-report (silently failing). Standing orders give operators a predictable, auditable contract for each scheduled skill.

**Implementation**: Add `standing-orders.md` template to `.claude/skills/_template/` with the five sections above pre-filled with placeholders. Update existing scheduled skills (synthesis cron, ingest cron) to include a `## Standing Order` section.

**Source**: openclaw/docs/automation/standing-orders.md:1

---

### Phase 5.7.Y Refinement — Hook Lifecycle Events for Cortex MCP Server (score: 32)

**What**: Define a typed event bus for Cortex server lifecycle events, modelled on OpenClaw's 15-event hook system. Initial event set for Cortex (simpler than OpenClaw's gateway model):
- `server:start` / `server:stop`
- `ingest:before` / `ingest:after`
- `entity:evicted` (from cache)
- `knowledge:stale` (entity's source file changed)

**Why**: Phase 13.7 already uses hooks for cache invalidation, but the events are ad-hoc. A typed event bus with discoverable hook directories (bundled → workspace) enables: (a) user-authored hooks without forking core code, (b) OTEL tracing with W3C trace context, (c) plugin-supplied hooks for post-ingest notifications.

**Implementation**: ~200–400 lines. Define `CortexHookEvent` union type. Add `hooks/` discovery in `server/index.ts`. First bundled hook: `session-memory` (flush pending writes on `server:stop`).

**Source**: openclaw/docs/automation/hooks.md:36

---

### Phase 5.7.Z Refinement — Staggered Cron Scheduling (score: 30)

**What**: For any top-of-hour cron expression (e.g., `0 * * * *`), automatically jitter the first fire by `random(−300, +300)` seconds. Expose `--exact` flag to opt out.

**Why**: When Cortex's Phase 5.7 ships with multiple scheduled cron skills (ingest, synthesis, garbage-collection), they will all default to round-number schedules. Without jitter, they pile up on the same minute and cause synchronized IO + LLM-cost spikes. Even single-user local deployments see this if the user runs multiple Cortex-monitored repos.

**Implementation**: ≤30 lines in the cron scheduler. Read from `config.cronJitter` (default: 300 seconds).

**Source**: openclaw/docs/automation/cron-jobs.md:75

---

### Phase 7.5.1 Refinement — Prove-First Bugfix Gate for Cortex Agentic Repairs (score: 30)

**What**: Encode the "Peter Review Gate" as a two-phase requirement for any agent skill that proposes code changes to Cortex itself:
1. **Prove phase**: reproduce the failing case → write a failing regression test → produce a dirty diff showing proof.
2. **Review phase**: human reviews dirty diff → approves → agent commits exactly one fix + one changelog entry per accepted item.

**Skip criteria** (agent must not proceed): not-a-bug, uncertain repro, guessed dependency behavior, no focused proof feasible.

**Why**: Cortex modifies its own `.knowledge/` and source files via MCP tools. Without a prove-first gate, agentic "repairs" can introduce regressions that are harder to detect because the system that would catch them (Cortex itself) may be in a broken state.

**Implementation**: Add `## Prove-First Gate` section to CLAUDE.md. Optionally, add a skill template check in `steal`, `ultrareview`, and future repair skills.

**Source**: openclaw/.agents/skills/openclaw-small-bugfix-sweep/SKILL.md:1

---

## E-bucket items (already mapped to existing flaws — no new phases needed)

These close existing flaws. Reference them when implementing the flaw fixes:

### E1 — Hybrid BM25/FTS5 + Vector Search → closes Flaw #18 (cortex_find no fuzzy) + Flaw #26 (false-positive ranking) — score: 32

**Implementation reference**: `extensions/memory-core/src/memory/hybrid.ts:54` — `mergeHybridResults`
- `buildFtsQuery`: joins tokens with AND (precision-first, not recall-first)
- `bm25RankToScore`: normalizes FTS5 BM25 rank to [0,1] via `1 / (1 + Math.abs(rank))`
- `vectorWeight` + `textWeight` configurable merge (no hard-coded 0.5/0.5)

**Cortex adoption path**: SQLite FTS5 is already available (same sqlite dep). Phase 0.9 (fuse.js fuzzy) should use FTS5 directly instead of fuse.js for scale. Vector half is optional (add LanceDB only in Phase 33.5+).

---

### E2 — MMR Diversity Re-ranking → closes Flaw #26 (false-positive ranking) — score: 45 ★ HIGHEST

**Implementation reference**: `extensions/memory-core/src/memory/mmr.ts:152` — `mmrRerank`
- `jaccardSimilarity(setA, setB)`: Jaccard on pre-tokenized token Sets
- `tokenize(text)`: CJK-aware (unigrams + adjacent bigrams for CJK sequences, whitespace split otherwise)
- `mmrRerank<T>(items, config)`: iterative greedy — `score = lambda * relevance - (1-lambda) * maxSimilarityToSelected`
- Pre-tokenizes all items once before the loop (efficiency)
- Normalizes input scores to [0,1] before MMR

**Cortex adoption path**: ~120 lines, zero dependencies. Drop into `src/search/mmr.ts`. Wire into `cortex_find` after RRF ranking stage (Phase 13.5+). Lambda default 0.7; expose in `configure_brevity` or a new `configure_search` tool.

---

### E3 — Temporal Decay Scoring → partially closes Flaw #13 (uniform quality scores) — score: 24

**Implementation reference**: `extensions/memory-core/src/memory/temporal-decay.ts:4`
- `calculateTemporalDecayMultiplier({ageInDays, halfLifeDays})`: `Math.exp(-LN2 / halfLifeDays * ageInDays)`
- `isEvergreenMemoryPath(filePath)`: returns true for `MEMORY.md` and undated topic files; false for `YYYY-MM-DD.md` patterns
- Falls back to file mtime when no date in filename

**Cortex adoption path**: Apply to `audit_quality` scores — entity pages whose source file hasn't changed in >90 days could get a mild freshness penalty (configurable). Evergreen = concept pages (never decay), dated = session summaries / changelogs (decay at halfLife=30 days). ~60 lines in `src/quality/decay.ts`.
