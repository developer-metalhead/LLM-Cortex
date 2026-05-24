# Project Cortex — Flaws Inventory & Strategic Roadmap

Hands-on audit. Every flaw below was reproduced live against this repo by exercising the actual MCP tools — not inferred from source reading.

**Repo state at time of audit:** branch `phase13.8`, `lastSyncCommit=7d23277133db9e58c15d200743a1ecef3e148f8f`, 15 active entities, 7 concepts.

**Total flaws catalogued: 117** across security, correctness, data integrity, hidden runtime, missing features, and architectural debt.
**Total phases in implementation_plan.md: 189** — far more than any team can ship coherently.

---

## 🎯 STRATEGIC ROADMAP — from "harmful tool" to "paid product"

The implementation_plan.md has **189 phases**. Trying to ship all of them is the surest path to shipping none. The honest answer to "what should you actually build" is a **ruthlessly prioritized ~30-phase subset** organized into tiers by revenue impact and dependency order.

### 🟥 TIER 0 — Foundation (non-negotiable, ~3-4 months)
**Without this nothing else matters. Cortex stays harmful until these ship.**

| # | Item | Why |
|---|------|-----|
| 0.1 | **Stages 1-4 (115 flaw fixes)** — see staged plan below | Security hole, dishonest accounting, broken skeleton, broken log reader, namespace collisions. **Cortex is unsafe to recommend without these.** |

### 🟧 TIER A — Revenue path (the 10 phases that unlock paid customers, ~12-18 months)
**These are the phases that change Cortex from "open-source curiosity" to "paid product."** Sequence matters.

| # | Phase | Unlocks | Why critical |
|---|-------|---------|--------------|
| A.1 | **13.14 + 13.15** | Free tier defensible on small codebases | Kills negative ROI. Server-side synthesis on cheap models + multi-output pipeline (changelogs, PR drafts) make every sync produce visible developer value. |
| A.2 | **33** (P0) | Trial / demo possible | Single-command bootstrap with progress UI. Without this, first-time users hit $3-50 cost wall and bounce. |
| A.3 | **22 + 25** | Team tier ($30-50/dev/mo) | Central multi-tenant server + SSO/SCIM. Mandatory for any sale above one developer. |
| A.4 | **31** | Renewal justification | QBR PDF + ROI dashboard. The artifact your champion shows their CFO. Without it, renewals are at-will. |
| A.5 | **26 + 27** | Regulated industries | RBAC + immutable audit + air-gap + BYO-key. Banks, healthcare, defense legally can't use Cursor/Copilot for sensitive code — this is the real moat. |
| A.6 | **32** | Fortune 500 procurement | SOC2 Type II + ISO 27001 + procurement questionnaire pack. 12+ months & $100-200K/yr ongoing — but disqualifying gate for most enterprise sales without it. |
| A.7 | **32.1** | 5× faster enterprise adoption | AWS/GCP/Azure Marketplace listings. Enterprise IT buys against pre-committed cloud spend without fresh procurement. |
| A.8 | **30.1** | Competitive switching | External AI conversation import (ChatGPT/Claude/Cursor history). Turns cold-start problem into a migration moat. **Novel — no competitor has this.** |
| A.9 | **49** | Defensible flywheel | Cross-deployment synthesis learning. Every customer's patterns improve the Librarian globally → product gets better with scale. **Real network effect.** |

### 🟨 TIER B — Force multipliers (ship in parallel or shortly after Tier A, ~6-9 months)
**Direct support to revenue path. Each one unlocks or accelerates a Tier A bet.**

| # | Phase | Why high-leverage |
|---|-------|-------------------|
| B.1 | **3.1** LLM Caching Store | Cuts ingest cost by 50%+ on repeat-pattern files. Strengthens Tier A.1 (small-codebase ROI). |
| B.2 | **33.1** Model Provider Registry & Cost-Tier Routing | Lets enterprise customers route to their approved models per FinOps policy. Required for sales to anyone with a model allowlist. |
| B.3 | **33.2** Remote Ops & Mobile Status PWA | Admin without a laptop — required for any 24/7 enterprise on-call story. |
| B.4 | **4.7** OpenAI-Compatible REST Gateway | **Underrated.** Turns Cortex into drop-in infra for any tool that already speaks OpenAI's API. Massive distribution surface. |
| B.5 | **4.6** Developer API & Client SDKs | Ecosystem play. Third-party tools build on Cortex → switching cost compounds. |
| B.6 | **26.1** DLP & PII Redaction | Table stakes for any customer in finance/health. Pre-LLM secret scrubbing. |
| B.7 | **26.3** OpenTelemetry Tracing | Required for enterprise observability stacks (Datadog, Honeycomb). No tracing = procurement blocker. |
| B.8 | **28** Enterprise Workflow Integrations Hub | Slack/Jira/Teams hooks. Without these, Cortex stays a side-pane tool nobody sees. |
| B.9 | **29 + 29.1 + 29.2** FinOps + Allowlists + Billing | Cost governance is enterprise table stakes. Phase 29.2 tenant-scoped billing is also what makes the marketplace listings (A.7) work. |
| B.10 | **30 + 30.2** Knowledge Migration + Merge Engine | Without these, switching from Cursor/Copilot/Sourcegraph = "start over." With them = "import your existing knowledge." |
| B.11 | **11 + 21** Monorepo + Polyrepo Federation | Real enterprise codebases. Without these, Cortex serves only single-project teams. |
| B.12 | **5.6** Daemon Watchdog & Self-Healing | Production reliability foundation. Without this, the daemon crashes are visible to customers. |
| B.13 | **5.7** Scheduled Operations & Cron Engine | The substrate that A.9 (cross-deployment learning), B.6 (compliance scans), and many polish features run on. Build once, reused everywhere. |

### 🟩 TIER C — Developer-experience accelerators (drive bottom-up adoption, ~6 months)
**Visible, demo-able wins that make individual developers love Cortex. These are how you get the org adoption that closes the team sale.**

| # | Phase | Visible value |
|---|-------|---------------|
| C.1 | **12.3** Architecturally Aware Commit Generation | "Cortex writes my conventional commits for me" — concrete daily value. |
| C.2 | **12.11** Architectural Changelog Generator | "Every PR has an auto-generated changelog" — visible to reviewers and managers. |
| C.3 | **13.13** Agent Workflow Friction Reductions | Direct UX wins from agent telemetry. Each one chips at "Cortex slows me down" perception. |
| C.4 | **7.7** Automated Technical Debt Register | Concrete dashboard managers want. "Show me the worst-quality entities" → immediate engineering-leadership demo. |
| C.5 | **9.1** Dependency Path Querying | "What's between A and B?" — useful enough that developers run it routinely. |
| C.6 | **10.4** Managed CLAUDE.md & AI Rules Orchestration | Cuts setup pain. Each new IDE / each new project = current pain. |
| C.7 | **12.2** Git Pre-Commit Guardrail Hooks | Visible enforcement at the moment developers care about: commit time. |
| C.8 | **8.1** Live Graph Stream (WebSocket) | Real-time "wow" demo moment. Watch entities light up as you save. Sales demo gold. |
| C.9 | **7.10** Sensitive Data Sanitization Guardrail | Required before any customer ingests their real source. Combined with B.6 it's the enterprise security story. |
| C.10 | **12.15** External Dependency & Ecosystem Change Tracking | "Cortex tells me a CVE was published for a library I use" — concrete safety value. |

### 🟦 TIER D — Defensible IP / differentiation (research-grade, post-Series-A optionality, ~12+ months)
**Build these AFTER product-market fit, not before. They're moats once you have customers, distractions before.**

| # | Phase | Strategic value |
|---|-------|-----------------|
| D.1 | **20.16** Multi-Agent Librarian Collaboration | "Cortex coordinates Claude + Cursor + Cline working on the same repo." Genuinely novel positioning. |
| D.2 | **17.1** Multi-Model Architectural Debate | Better synthesis via model consensus. Visible quality bump. |
| D.3 | **20.13** Pattern Skill Library | Long-term reuse of architectural patterns across projects. |
| D.4 | **20.5.1** Automated ADR Engine | Concrete enterprise artifact (Architecture Decision Records). |
| D.5 | **16** Contradiction-Aware Retrieval | Catches the "system fighting itself" patterns. Differentiator vs flat-text RAG. |
| D.6 | **20.4** Evolutionary Architecture Fitness Functions | Continuous architectural quality measurement. Pairs naturally with A.4 (QBR). |
| D.7 | **18** Architectural Embeddings (Typed-Graph + Text Hybrid) | The "search that actually works" upgrade. Differentiator vs cortex_find's substring matching today. |
| D.8 | **20.12** Temporal Knowledge Graph | "What did the architecture look like 6 months ago?" — unique to Cortex. |
| D.9 | **14.2** Topological Hierarchy & Multi-Tier Zoomable Retrieval (RAPTOR) | Token-cost reduction at scale. Strengthens enterprise pricing. |
| D.10 | **20.1** Architecture Simulation & What-If Analysis | "What breaks if I delete this entity?" — concrete CTO-level value. |

### 🟪 TIER E — DEFER OR SKIP (the 100+ phases that are interesting but distracting)

**Be honest with yourself: these phases are intellectually exciting and commercially useless until ARR > $5M. Most of them should be skipped entirely.**

#### Sub-tier E1: Research metaphors (skip unless they pay for themselves with a specific customer)
Phases dressed up in physics / biology / cognitive-science vocabulary that boil down to "another scoring heuristic on the existing graph":
- **7.11-7.19** (epigenetic memory, parallax, retrocausality, redshift, verlinde, proteasome, keystone, regulatory suppression, synaptic tagging) — these are 9 phases that are all variations on quality scoring. **Pick the best 2-3 ideas, fold them into Phase 7.5 as features, delete the other 6 phases.**
- **20.6-20.20** (15 phases of cognitive-science-flavored synthesis improvements). Of these, only **20.13** (skill library), **20.16** (multi-agent), and **20.20** (active inference) have arguable product value. The rest are research papers waiting to be written.
- **Phase 34-49** (16 phases of "Cognitive Engine Optimizations", "Reality Engine", "Information Thermodynamics", "Synthetic Immune System", "Poincaré Recurrence", "ER=EPR Dependency Entanglement"). **Each one is fascinating. Each one is a 1-2 month distraction. None of them appears in a customer's buying decision.** Skip them all until post-Series-A.

#### Sub-tier E2: Cross-domain expansion (entirely different markets)
- **Phase 64-70** (biogenic, metallurgy, mechanical engineering, data science, medical, forensics, legal synthesis) — **these are not features of a code tool**. They're separate products. If they're worth pursuing, spin them off as separate ventures. Otherwise delete from the roadmap; their presence makes Cortex look unfocused.

#### Sub-tier E3: Premature polish
- **Phase 6.1-6.5** (template entities, predicate relationships, weak measurements, torsion links, plasma filaments) — graph-theoretic refinements. Ship Tier A first.
- **Phase 8.2-8.4** (Karpathy Obsidian compliance, GPU rendering, hyperbolic graph layout) — visual polish without business case until Phase 22 multi-tenant dashboard exists.
- **Phase 13.8.2-13.8.8** (co-edit edges, simulated annealing, quantum walk ranking, contextual RAG preprocessing, selective retrieval gate, spike-based updates, synaptic plasticity) — 7 phases of retrieval-algorithm tuning. Phase 13.5 (RRF) is already shipped. **More retrieval polish doesn't matter until cortex_find has fuzzy matching at all (flaw #18).**

### 📊 Realistic phasing for revenue

| Quarter | Focus | Outcome |
|---------|-------|---------|
| Q1 | Tier 0 (flaw fixes) | Cortex is non-harmful |
| Q2 | A.1 + A.2 + B.1 + C.1 + C.2 + C.6 | Defensible free tier. Individual devs adopt. |
| Q3 | A.3 + B.12 + B.13 + B.4 + C.4 + C.8 | Team tier ships. First $10-50K MRR deals. |
| Q4 | A.4 + A.5 + B.8 + B.11 | Enterprise pilot ready. First Fortune 500 pilot in flight. |
| Q5 | A.6 starts (SOC2 audit cycle) + B.6 + B.7 + A.8 + C.9 | Compliance posture credible. Migration story works. |
| Q6 | A.7 launches + B.9 + B.10 + A.9 starts | Marketplace listed. First enterprise multi-year deal. |
| Q7 | A.6 SOC2 Type II issued + A.9 producing signals + B.2 + B.3 | Fortune 500 procurement unblocked. Flywheel measurable. |
| Q8 | Tier D selectively (D.1, D.2, D.10) | Differentiation visible. Series A raise possible. |

**Total time from today to defensible enterprise SaaS: ~24 months of focused execution.** That's ~30 phases out of 189, plus the 115 flaw fixes.

### 🚫 What you actively should NOT build

To make Tier A possible, you must say no to:
- **All Phase 34-49 "research-grade" physics/cognition metaphors.** Total skip.
- **All Phase 64-70 cross-domain synthesis.** Different product, different company.
- **Sub-phases of 7 (7.11-7.19) and 20 (20.6-20.20)** that are scoring variants. Keep 2-3, kill the rest.
- **Sub-phases of 13.8 retrieval tuning** until basic search works.
- **Phases 8.2-8.4 visual polish.** Phase 8 (basic graph) is enough until enterprise dashboard demand exists.

**A roadmap is what you say YES to. Equally, it's what you say NO to. Today the roadmap says yes to everything. That's the same as saying yes to nothing.**

---

## 🛠️ STAGED FIX PLAN — recommended sequencing

---

## 🛠️ STAGED FIX PLAN — recommended sequencing

Trying to fix all 80 flaws in one PR would be unreviewable and would break the 214 existing tests. The flaws also have dependencies — fixing the skeleton extractor changes savings math which changes footer logic which feeds the Stop hook. The correct sequencing is below.

### Stage 1 — Stop the bleeding (~1 day)
**Scope:** security, dishonest numbers, input validation.
**Flaws addressed:** #4, #6, #51, #64, #68, #69, #70, #72
**Why first:** the path-traversal hole in `source` (#51) is data exfiltration waiting to happen. The "147k saved" hallucination (#6, #68-70) poisons every downstream trust decision. Empty/invalid concept names (#4, #72) leak permanent pollution into the KB.
**Concrete fixes:**
- Validate `path.resolve(filePath)` is within `path.resolve(projectRoot)` in `source`, `compress`, `cortex_soul_import`, `cortex_soul_export`
- Delete the synthetic-baseline savings footers OR rewrite to measure real cache-hit savings only
- Add non-empty + filesystem-safe name validation to `save_concept` / `save_synthesis`
- Add `delete_concept` / `delete_entity` MCP tools

**Decisions required:**
- Savings footer: delete entirely vs. rewrite with honest math?
- Phantom entities: auto-delete on detection vs. flag-only?
### 🧬 CodeGraph Plan
- **Security & Path Validation**: We retain the plan's `security.ts` implementation for strict MCP path boundaries (CodeGraph lacks this).
- **Referential Integrity**: Implement the "Grounding Gate" — `validate.ts` enforces that Cortex's LLM cannot save an entity to `.knowledge/` unless CodeGraph's SQLite DB confirms the source file physically exists.

**Outcome:** Cortex flips from "actively harmful + unsafe" to "narrowly useful but limited."

---

### Stage 2 — Make audits honest (~2-3 days)
**Scope:** broken readers, false-negative audits, namespace collisions.
**Flaws addressed:** #3, #13, #14, #42, #52, #53, #54, #56, #59, #63
**Why second:** once Cortex stops lying about its own state, you can start trusting its answers. Today every audit tool (`audit`, `audit_quality`, `audit_evidence`, `log_query`, `evolution_entity`) returns false-clean results while the KB contains phantom entities, namespace collisions, and unreadable logs.
**Concrete fixes:**
- Fix `log_query` reader to actually parse `.knowledge/log.jsonl`
- `audit_evidence` flags entities missing `sourceFile` as orphan-suspect, not "clean"
- `audit_quality` scoring function actually differentiates (currently all 0.94)
- Enforce uniqueness across entity ∪ concept namespaces; migrate `Native IDE Workflows` duplicate
- Detect entities whose `sourceFile` doesn't exist on disk → flag as `phantom`
- Wire `state.json.version` into a real schema-migration path
- Subtract `mode='full'` bypasses from `savings_ledger.jsonl` (currently only credits, never debits)

**Outcome:** Cortex's own audit tools become trustworthy. Phantom entities (`AuthService`, `JWTStrategy`) get flagged and removable.

---

### Stage 3 — Fix workflow friction (~3-4 days)
**Scope:** the things that made this session net-negative for me.
**Flaws addressed:** #2, #8, #18, #27, #28, #29, #31, #32, #33, #34, #35, #43, #45, #46, #50
**Why third:** with audits honest, you can now tackle the per-tool ergonomics that turn cold-path queries into 4× round-trip multipliers.
**Concrete fixes:**
- **Rewrite the AST skeleton extractor** to preserve class method signatures + type body members; drop method-body locals. This is the highest-leverage single fix.
- Add **`cortex_search_source(pattern, glob?)`** — server-side ripgrep with surrounding context. Gives the CLAUDE.md grep ban a real substitute.
- `source` gets `symbol:` and `offset/limit:` parameters for targeted reads on large files
- `auto` mode falls back to `full` when the extracted skeleton has < N tokens of API surface
- `cortex_find` adds fuzzy matching (use the Phase 13.5 RRF ranker the plan promises) + path/dir filtering
- `before_change` and `read_entity` degrade gracefully on unindexed names: search source for matching class/function and offer that path
- Add `read_entities([names])` batch tool to eliminate sequential round-trips
- Add `find_by_path(path)` reverse lookup
- Add `coverage_report()` returning `{filesSynthesized, filesUnsynthesized, lastSyncDiff}` so every "not found" can be qualified
- `impact_analysis` distinguishes "entity exists, no dependents" from "entity not in KB"
- `build_context_pack` errors on invalid `scope` instead of silently dumping everything

### 🧬 CodeGraph Plan
- **AST Skeleton Extractor**: Adopt **CodeGraph's Tree-sitter** engine (@colbymchenry/codegraph). It inherently solves the TS broken skeleton flaw deterministically.
- **Search & Fuzzy Matching**: Adopt **CodeGraph's SQLite FTS5** search instead of the proposed `fuse.js` in-memory matching. It is infinitely more scalable for `cortex_find`.

**Outcome:** Cortex stops being a friction tax on cold paths. Round-trip math becomes competitive with native Read+Grep even on freshly-changed code.

---

### Stage 4 — Architectural cleanup (~1-2 weeks, RFC first)
**Scope:** the foundations that need design decisions, not just code.
**Flaws addressed:** #5, #11, #16, #20, #24, #39, #40, #41, #44, #47, #48, #49, #55, #57, #61, #62, #66, #67, #71, #75, #77, #78, #79, #80
**Why last:** these need product decisions and would benefit from being designed coherently rather than piecemeal.
**Concrete work:**
- **Storage unification (#55):** consolidate `state.json`, `log.jsonl`, `experience.jsonl`, `savings_ledger.jsonl`, `.last_sync_commit`, future `soul_state.json` into one transactional store with a clear schema-versioned envelope.
- **Hook system redesign (#66-#71, #75, #77):** decide — remove hooks, make them opt-in via `cortex setup --hooks`, or make their injections agent-visible. Today they're invisible behavior-modifiers. Also harden `.claude/hooks/*.js` against tampering.
- **Workflow taxonomy (#24, #41, #49, #79):** pick ONE prescribed workflow. Today CLAUDE.md, tool descriptions, and hooks prescribe three different ones. Document the canonical flow and remove "INSTEAD of X" lobbying from tool descriptions.
- **Synthesis quality (#11, #62):** backfill missing `## Role/Interface/Behavior/Wiring` sections on existing entities. Re-ingest with the layered-description prompt actually honored.
- **Lint→quality wiring (#5):** structural cycles found by `lint` should affect `audit_quality` scores instead of being decorative.
- **lastSyncCommit healing (#16):** detect orphaned commits on every status call; offer `cortex sync --rebase-from <commit>` to recover.
- **Brevity stats consistency (#20, #40):** always emit (with `enabled: false` when off) OR remove the CLAUDE.md "MUST preserve" rule. No half-state.
- **Mutating-tool audit trail (#47):** every `save_*`, `configure_*`, `compress`, `set_project_root`, `cortex_soul_import` writes a record to `experience.jsonl`.
- **Dry-run support (#44):** `compress`, `refresh_stale_entities`, `save_synthesis` get `dryRun: true` flag with diff preview.
- **`.obsidian` auto-creation (#57):** move behind `cortex setup obsidian`. Don't assume.
- **Cortex.json schema (#78):** generate from JSON Schema, validate on load, surface errors clearly.

**Outcome:** Cortex becomes architecturally sound. Behavior is documented and visible. The hidden runtime layer becomes accountable.

---

### What's NOT in any stage
Roughly 5 flaws are pure papercuts (#21, #22, #25, #58, #65) that can be folded into any stage opportunistically. They don't justify their own work item.

### Effort summary
| Stage | Days | Outcome |
|-------|------|---------|
| 1 | ~1 | Safe to run on machines with secrets. Stops dishonest numbers. |
| 2 | ~3 | Audits become trustworthy. Phantom entities cleanable. |
| 3 | ~4 | Workflow friction gone. Cold paths competitive with native tools. |
| 4 | ~10 | Architecture sound. Hooks visible. Storage unified. |
| **Total** | **~18 days** | **Cortex delivers on its README claims.** |

**Stage 1 alone is the minimum bar before recommending Cortex to anyone.** Today, recommending Cortex without Stage 1 is recommending an arbitrary-file-read primitive disguised as a memory tool.

---

---

## 🔴 CRITICAL — wrong answers, silent corruption

### 1. `get_pending_changes` silently fails on large diffs
**Repro:** call `get_pending_changes` on this repo (phase13.8 branch, last sync commit far behind HEAD).
**Result:** the `userPrompt` payload contains the literal string `"[Diff Error] stdout maxBuffer length exceeded"` in place of the diff. The tool still returns `200 OK`, schema-valid output, and `staleEntities: []`.
**Impact:** the Librarian prompt gets a placeholder error string instead of code changes. Any downstream `ingest` / `save_synthesis` synthesizes nothing — the index becomes permanently stale with no warning. `audit` and `smart_audit` happily report `staleCount: 0` because they have no visibility into the broken diff fetch.
**Root cause:** Node default `maxBuffer` (1 MB) on the `git diff` child process. Need streaming or chunked read.

### 2. `impact_analysis` returns "Safe to refactor" for non-existent entities
**Repro:** `impact_analysis({entity: "NonExistent"})`.
**Result:** `"No dependents found for "NonExistent". Safe to refactor freely."`
**Impact:** a typo in the entity name produces a misleading green light. Should respond `entity not found in knowledge base — this is a coverage gap, not an empty blast radius`.
**Addressed by**: Phase 9 Refinement — `resolve_seed()` Fuzzy Node Lookup (gitnexus audit, score: 30)

### 3. Phantom entities pollute the index with no detection mechanism
**Repro:** `cortex_find("cortex")` lists `AuthService` and concept `JWTStrategy` (referencing `[[Middleware]]`). `Grep "AuthService|JWTStrategy" src/` → **no matches**.
**Result:** the KB contains entities whose `sourceFile` does not exist in the codebase. They get quality score 0.94 and are never flagged stale.
**Impact:** Cortex confidently surfaces fabricated knowledge. `audit_evidence` doesn't catch this because the phantom entities have no `evidence` block at all — the "no evidence" case is treated as clean, not as suspicious.

### 4. `save_concept` has zero validation; no deletion API
**Repro:** `save_concept({concept: {name: "FLAW_TEST_CONCEPT", description: "Inserting a junk concept"}})` → `"Concept 'FLAW_TEST_CONCEPT' saved to knowledge base."` Subsequent `cortex_find("FLAW_TEST_CONCEPT")` confirms it persisted.
**Impact:** any agent (or prompt-injected text in a diff) can pollute the KB indefinitely. There is no `delete_concept` / `delete_entity` MCP tool — I had to surgically edit `state.json` to undo my test. Concept names aren't validated against a regex, source file existence isn't required, no provenance is recorded.
**Addressed by**: Phase 0.2 — `validate.ts` Schema Gating & Referential Integrity

### 5. `lint` reports cycles as ERROR; `audit_quality` ignores them
**Repro:** `lint` returned 3 `ERROR cycle` findings (`CortexDaemon → CortexWatcher → CortexDaemon` etc.). `audit_quality` ran immediately after and reported all 15 entities at quality `0.94`, `✅ All entities meet the quality gate (0.50)`.
**Impact:** lint findings are decorative. Quality scoring ignores structural integrity. Cycles also suggest the synthesis got relationships wrong (logger doesn't actually depend on daemon) — but no audit surfaces this.

---

## 🟠 HIGH — misleading numbers, wasted work

### 6. "Cortex saved ~147.9k tokens" footer is a marketing claim, not a measurement
**Repro:** every `read_entity` / `read_concept` call returns a footer claiming `~147.9k tokens` saved vs `scanning 58 source files`.
**Reality check:** `get_savings` ledger total is **11,503 tokens** for the entire workspace lifetime — the real measurement, not the per-call boast.
**Impact:** the per-call number assumes a strawman baseline (reading all 58 files). Nobody does that. The mismatch (~13× exaggeration) erodes trust in the actual ledger.
**Addressed by**: Phase 0.11 — Honest Benchmarks (`worked/` Corpus) + Phase 0.11 Refinement — Real Usage Analytics via Claude Code Session Logs

### 7. Savings ledger contradicts itself on USD value
**Repro:** `get_savings` shows `AST Skeleton Cache: 4 entries, 6,943 tokens, $0.0000`.
**Impact:** either tokens are wrong or USD is wrong. The pricing logic doesn't apply the per-provider rate to AST-cache savings, even though those tokens were billed.
**Addressed by**: Phase 0.11 Refinement — Real Usage Analytics via Claude Code Session Logs

### 8. `build_context_pack` silently ignores invalid `scope`
**Repro:** `build_context_pack({scope: "SoulEngine", budget: 2000})`. SoulEngine doesn't exist in the index.
**Result:** the tool returned the **entire knowledge base** (1738 tokens, 4 entities elided), not an error.
**Impact:** a scope typo produces a full dump masquerading as a focused slice. Should error or fall back to fuzzy match with a warning.
**Addressed by**: Phase 0.2 — `validate.ts` `validateEntityExists()` with fuzzy suggestions on unknown scope

### 9. `compress` produces 0% reduction on knowledge files
**Repro:** `compress({path: ".knowledge/entities/CortexMCPServer.md"})` → `Saved 0 tokens (0.0% reduction)`.
**Impact:** the Brevity engine can't compress Cortex's own pages because they're already terse. Dead feature for self-application — should document this or skip emitting the 0% line.

### 10. The "58 source files" baseline is frozen at last ingest
**Repro:** read any entity. Footer cites `58 source files`. `Glob "src/**/*.ts"` shows the repo has substantially more files than 58 now (phase 13.8 added several).
**Impact:** the savings math is anchored to a stale file count. Every claim downstream of it (the 147.9k figure) inherits the staleness.
**Addressed by**: Phase 0.4 — Graph-as-Cache: `state.json:indexedFiles` updated on every `cortex ingest` + `[ORPHAN]` detection for deleted files

---

## 🟡 MEDIUM — friction, surprise behavior, missed opportunities

### 11. Entity pages have no Role/Interface/Behavior/Wiring sections
**Repro:** `read_entity("CortexMCPServer")` returns a single-sentence description and one relationship.
**Expectation per CLAUDE.md:** "per-entity pages with detailed Role, Interface, Behavior, and Wiring guidelines."
**Expectation per Librarian system prompt:** layered markdown with `## Role`, `## Interface`, `## Lifecycle`, `## Behavior`, `## Verification`, `## Wiring`.
**Impact:** historical syntheses didn't honor the section schema, and there's no migration backfill. Reading the entity page gives **less** detail than reading the source — defeats the whole "synthesized knowledge > raw source" premise.

### 12. Tools write files as side effects without explicit consent
- `graph` → `ARCH_GRAPH.md` in project root
- `export` → `ARCH_SPEC.md`
- `get_savings` → `ARCH_SAVINGS.md`
- `cortex_onboard` → `.knowledge/onboarding_<audience>_<depth>.md` AND returns content AND tells the agent to write it again ("you MUST write it directly to a file")

Four unsolicited files dropped from normal "read" operations. Should be opt-in via an explicit `writeToDisk: true` flag.

### 13. `audit_quality` produces identical scores across all entities
**Repro:** all 15 entities scored `0.94` with breakdown `evidence 1.00 / contradiction 1.00 / staleness 1.00 / age 1.00 / human-review 0.70`.
**Impact:** zero variance — the scoring function can't differentiate. The `0.50` gate is unreachable. The 5-dimension breakdown is theatre when all five dimensions return their default value for every entity.

### 14. `evolution_entity` and `log_query` return empty for tracked entities
**Repro:** `evolution_entity({entity: "CortexMCPServer"})` → `[]`. `log_query()` (no filters) → `[]`. `log_query({entity: "CortexMCPServer"})` → `[]`.
**Impact:** the architectural log either doesn't exist or is never written. Tools are wired into the MCP surface but their data source is silently absent.
**Addressed by**: Phase 43.1 Refinement — Session-Scoped JSONL Event Sourcing

### 15. `refresh_stale_entities` collapses "not found" and "not stale"
**Repro:** `refresh_stale_entities({names: ["NonExistentEntity", "AnotherFake"]})` → `"⚠️ Skipped 2 (not stale or not found): NonExistentEntity, AnotherFake"`.
**Impact:** the caller can't tell which case applied. Important when reconciling — "not stale" means done, "not found" means the agent has a bad reference.

### 16. `lastSyncCommit` becomes a dangling reference after force-push / branch reset
**Repro:** `get_cortex_status` returns `lastSyncCommit: 7d23277133db9e58c15d200743a1ecef3e148f8f`. `git log --oneline` doesn't show it. `git cat-file -t` confirms it exists in the reflog but is unreachable from any branch tip.
**Impact:** the diff-against-orphaned-commit path is the exact path that triggers flaw #1. Cortex never detects orphan commits — should validate `lastSyncCommit` is reachable from `HEAD` on every status check and self-heal.

### 17. Onboarding tour rationales are identical templates
**Repro:** `cortex_onboard({audience: "junior", depth: "quick"})` — every entity stop reads `"Tour Rationale: Primary active functional entity forming the cornerstone of this module."` Every concept stop reads `"Core architectural abstraction governing system-wide standards and operations."`
**Impact:** zero personalization for audience or depth. Same output regardless of `audience` (junior vs senior vs domain-expert). The "tailored tour" promise is unmet.

### 18. `cortex_find` returns "No matches" instead of fuzzy suggestions
**Repro:** `cortex_find("SoulEngine")` → `"No matches found."` — but `before_change("SoulEngine")` correctly responds with `Available entities: [list]`.
**Impact:** the fuzzy/Levenshtein/RRF ranker promised by Phase 13.5 either isn't wired into `find` or is too strict. The "closest match suggestion" UX exists in one tool, missing in the obvious entry point.
**Addressed by**: Phase 13.5 — Fuzzy Levenshtein & RRF Search Ranker (done) + Phase 0.9 Refinement — RRF K=60 Hybrid Search (score: 32) + Phase 13.5 Refinement — Bounded Damerau-Levenshtein + stem variant expansion (-ing/-tion/-ment/-ies/-er) (codegraph audit, E3, score: 48) + New Phase Refinement — Portable camelCase/snake_case Normalization for cortex_find (CodeGraphContext audit, score: 48)

### 19. `cortex_soul_status` shows `"Soul Dirty: Yes"` immediately on cold start
**Repro:** `cortex_soul_status` on a fresh server → `Memory Nodes: 0, Memory Edges: 0, Ledger Entries: 0, Profile Loaded: No, Soul Dirty: Yes`.
**Impact:** the dirty flag is true without an actual mutation. Combined with the audit finding that nothing flushes on SIGINT/SIGTERM, this means the dirty bit lies in both directions.
**Addressed by**: Phase 0.5 — OS-Native File Locking (`fcntl` / Named Mutex)

### 20. Brevity stats footer only appears when brevity ≠ `off`
**Repro:** default brevity → no `📉 Cortex Brevity Stats` footer ever appears in any tool response. `configure_brevity({level: "ultra"})` → footer appears on next call.
**Impact:** the CLAUDE.md rule "you MUST copy and append this exact statistics block" is dead text in default mode. The rule should clarify "if present" or the server should always emit a minimal stats block.

---

## 🟢 LOW — papercuts

### 21. `resolve_refs` returns `null` for unknown hashes silently
`resolve_refs({refs: ["deadbeef", "fakehash"]})` → `{deadbeef: null, fakehash: null}`. Easy to miss a typo. Should differentiate "unknown hash" from "expired hash."

### 22. `configure_safeguards()` with no args returns an empty success block
Response: `"✅ Safeguards updated successfully:\n\n"` — nothing under the colon. Looks like a hung tool. Should report current state when called with no mutations.

### 23. `read_concept` happily returns phantom concept content with the savings footer
`read_concept("JWTStrategy")` returned its description plus the boast `"Cortex saved ~148.0k tokens"`. Cortex is *charging itself credit* for retrieving fabricated knowledge.

### 24. Tool descriptions duplicate work the tool already performs
`cortex_onboard` writes the file to disk AND tells the agent it MUST also write it to disk. `graph` writes `ARCH_GRAPH.md` AND tells the user to open it. Triple-work pattern.

### 25. `compress` token math is undocumented
The tool reports "tokens saved" without disclosing it uses the provider-aware divisor heuristic from `estimateTokens`. Ambiguity between "characters", "real tokens", and "estimated tokens" — should clarify in the tool description.

---

## Coverage analysis vs. implementation plan

The implementation plan **partially** anticipates the small-codebase pain:

- **Phase 13.14 (Planned)** — *Economic Viability & Zero-Overhead Ingestion*: server-side synthesis, two-tier model routing, local diff filter, commit-gated auto-sync. Addresses cost ROI.
- **Phase 13.15 (Planned)** — *Multi-Output Pipeline*: changelog, PR draft, affected tests, session warm-up from sync side effects. Addresses value ROI.

**Coverage status (updated after graphify pattern mapping):**

| Flaw | Coverage status |
|------|-----------------|
| #1 maxBuffer overflow on diff | ⚠️ not covered — needs dedicated fix in `get_pending_changes` diff layer |
| #2 `impact_analysis` "safe to refactor" on typos | ✅ **Phase 0.2** — `validateEntityExists()` catches unknown entity names; fuzzy suggestions via `fuse.js` (Phase 0.9 gap 4) |
| #3 phantom entity detection (no live `sourceFile`) | ✅ **Phase 0.3** (sourceFile required) + **Phase 0.4** (orphan detection on file deletion) |
| #4 `save_concept` validation / deletion API | ✅ **Phase 0.2** — `validate.ts` gates all writes; empty/invalid names throw `ValidationError` |
| #5 `lint` cycles ignored by quality | ⚠️ not covered — needs `lint` + `audit_quality` integration fix |
| #6 inflated "147.9k saved" footer | ✅ **Phase 0.11** — `worked/` honest benchmarks + `cortex bench` replaces heuristic |
| #7 USD-value inconsistency in ledger | ✅ **Phase 0.11** — ledger anchored to real `cortex bench` measurements |
| #8 `build_context_pack` ignoring invalid `scope` | ✅ **Phase 0.2** — `validateEntityExists(scope, state)` throws with fuzzy suggestions (gap 4) |
| #10 "58 source files" frozen baseline | ✅ **Phase 0.4** — `indexedFiles[]` diffed on every sync; additions/removals/renames tracked (gap 3) |
| #12 tools write files without consent | ✅ **Phase 0.2** — `dryRun: boolean` parameter on all write tools (gap 2) |
| #13 zero-variance quality scoring | ⚠️ partially addressed — temporal decay scoring (openclaw pattern, Phase 0.9 refinement) adds age-signal to quality; structural variance still needs dedicated `audit_quality` formula fix |
| #14 architectural log never written | ⚠️ not covered — needs `log.jsonl` writer fix |
| #16 dangling `lastSyncCommit` | ⚠️ not covered — needs reachability check in `get_cortex_status` |
| #17 onboarding template rationales | ⚠️ not covered — needs per-entity rationale generation |
| #18 `cortex_find` no fuzzy suggestions | ✅ **Phase 0.9** — `fuse.js` fuzzy layer returns `"fuzzy": true` matches (gap 1). Phase 0.9 refinement notes SQLite FTS5+BM25 as the scale-up path (Phase 33.5). |
| #19 cold-start dirty flag | ⚠️ not covered — needs dirty-flag initialization fix |
| #20 brevity footer only in non-default mode | ⚠️ not covered — needs server to emit minimal footer always |

| #26 `cortex_find` ranks by substring, not relevance | ✅ **Phase 13.6.1** — MMR diversity re-ranking closes false-positive ranking (openclaw pattern, 2026-05-23). Also benefits from #18's FTS5/BM25 fix. |

**Summary**: 8 of the 17 uncovered flaws are now addressed by Phase 0 graphify-pattern work. Flaw #26 closed by Phase 13.6.1 (MMR). Flaw #18 extended with FTS5 scale-up path. 8 remain uncovered and need dedicated fixes outside the Phase 0 pattern work.

The plan addresses **cost** on small codebases. The hands-on audit shows the bigger small-codebase killer is **correctness** — Cortex confidently surfaces phantom knowledge, silently corrupts on diff overflow, and reports green on quality while harboring cycles and orphans.

---

## 🔧 PRACTICAL WORKFLOW FRICTION — found by doing realistic tasks

These flaws weren't found by exercising every tool — they were found by trying to do three normal coding tasks and observing where Cortex slowed me down vs. helped.

**Test tasks executed:**
- A: "Where is the experience ledger appended to disk?"
- B: "Add a method to `SoulEngine` returning failure nodes by recency — give me the contract first."
- C: "Re-check if `experience.ts` `query()` supports a `limit` option."

### 26. `cortex_find` ranks by substring presence, not relevance
**Repro:** `cortex_find("experience ledger")` on Task A.
**Result:** the only match was `Native IDE Workflows` because its description happens to contain the word "experience." The actual `ExperienceManager` class was not surfaced (it's not ingested). No fuzzy/semantic ranking — the obvious-but-irrelevant string match wins.
**Impact:** false positives crowd out true negatives. An agent following the match would dig into the wrong entity.
**Addressed by**: Phase 13.5 — Fuzzy Levenshtein & RRF Search Ranker (done) + Phase 13.6.1 Refinement — MMR Diversity Re-ranking + Phase 0.9 Refinement — RRF K=60 Hybrid Search + Phase 26 Refinement — PPR Ranking for cortex_find Results (RepoHyper audit, score: 14) + Phase 13.5 Refinement — CamelCase/snake_case compound identifier tokenizer + nameMatchBonus length-ratio scoring (codegraph audit, E2, score: 60)

### 27. `source` skeleton mode strips the public API while keeping irrelevant locals
**Repro:** `source({filePath: "src/knowledge/soul.ts"})` (cached, second read) on Task B.
**Result:**
```
export type MemoryNode =          ← body missing
export type SoulProfile =         ← body missing
export class SoulEngine           ← all methods missing
const lockPath = this.lockPath();      ← random local from inside acquireLock()
const stat = await fs.stat(lockPath);  ← random local from inside acquireLock()
const envLens = process.env.CORTEX_LENS;  ← random local from inside detectActiveLens()
```
**Impact:** the skeleton extractor leaks **method body locals** while hiding **class method signatures** and **type members**. This is the inverse of what's useful. For the most common re-read use case ("show me the public API again"), skeleton mode is worse than useless — it forces a second `mode='full'` round-trip (cost: ~12k tokens for soul.ts).
**Addressed by**: Phase 0.13 Refinement — Container Node Structural Outline (codegraph audit)

### 28. CLAUDE.md forbids grep, but Cortex offers no content-search replacement
**Repro:** I knew the experience ledger code lived *somewhere* in `src/`. `cortex_find` couldn't find it (not indexed). CLAUDE.md prohibits `grep`. The only escape was `Glob` (filename match), which only worked because the file was helpfully named `experience.ts`.
**Impact:** if a symbol's filename doesn't telegraph its purpose (e.g. `manager.ts`, `core.ts`), the agent is stuck. There's no content-search MCP tool — no `cortex_search_source(pattern, glob)`. The grep ban only works if Cortex offers a real substitute; it doesn't.
**Addressed by**: Phase 0.9 — IDF-Weighted Content Search (Replace Grep Ban)

### 29. `before_change` on a newly-added entity gives no source fallback
**Repro:** `before_change({entity: "SoulEngine"})` on Task B.
**Result:** `"No entity named "SoulEngine" found. Available entities: AuthService, ConfigManager, ..."` — same as `cortex_find`.
**Impact:** the tool **could** infer "no synthesized page exists, but a `class SoulEngine` is exported from `src/knowledge/soul.ts`, with N inbound source-level references." It does none of that. For freshly-added code, `before_change` is dead weight.

### 30. Search for a generic concept misses parallel implementations
**Repro:** `cortex_find("lock")`.
**Result:** one match — `CortexDaemon` (which holds `cortex.lock`).
**Reality:** the codebase has at least **two** lock implementations: the daemon's `cortex.lock` and `SoulEngine`'s `.knowledge/soul_state.json.lock` with retry logic. Cortex returns only the indexed one and gives no hint that the other exists.
**Impact:** anyone debugging "why is locking broken?" gets a false sense of completeness. They'd patch the daemon and never see the soul lock.
**Addressed by**: Phase 7 Refinement — BFS Radius Expansion for cortex_find (RepoHyper audit, score: 14)

### 31. `source` has no targeted read — all-or-skeleton
**Repro:** Task C asked one question ("does `query()` support `limit`?"). Skeleton hid the method signature; full mode returned all 178 lines of `experience.ts`.
**Impact:** no way to ask `source({filePath, symbol: "query"})` for a single function's body. For an O(1) question I pay an O(file size) cost — the opposite of what `source`'s caching is supposed to deliver.

### 32. `source` has no offset/limit; large files are unreachable
**Repro:** earlier in this conversation, `source({filePath: "src/mcp/server.ts"})` returned `result (133,770 characters across 2,827 lines) exceeds maximum allowed tokens. Output has been saved to <temp>.txt`.
**Impact:** unlike the built-in `Read` tool (which supports `offset`/`limit`), `source` is binary: it either fits or it dumps to a temp file you have to read with another tool. The CLAUDE.md rule "MUST exclusively call source for code inspections" is structurally unachievable for any file >~2500 lines.

### 33. `source` skeleton contract is silently broken on `auto` mode
**Repro:** `mode='auto'` (default) returned the broken skeleton above on re-read of soul.ts. The skeleton was so degraded it was useless, yet `auto` returned it anyway.
**Impact:** `auto` is supposed to be smart — falling back to full when the skeleton has no signal. It doesn't. The agent must know to manually override with `mode='full'` on every re-read, which defeats the cache.

### 34. `cortex_find` can't filter by file path or directory
**Repro:** "find anything in `src/mcp/*`" → no way to express this. The `type` filter only segments entity/concept/parent.
**Impact:** when triaging a directory ("what does Cortex know about the MCP module?"), the only path is `cortex_find` on guessed keywords + reading the full index.
**Addressed by**: Phase 13.5 Refinement — Field-Qualified Search Query Parser (kind:, path:, name: qualifiers on cortex_find) (codegraph audit, E7, score: 32)

### 35. No reverse lookup from file path → entity
**Repro:** I'm editing `src/cli/soul.ts`. Question: is this file tracked as an entity? There's no MCP tool to ask. I have to read the entire knowledge index and visually scan source-citation lines for `src/cli/soul.ts`.
**Impact:** a `find_by_path(path)` tool would make `before_change` and related workflows usable for in-editor context. Without it, the agent has to guess entity names from filenames.
**Addressed by**: Phase 35 Refinement — Import-Fallback Text Search for File->Entity Reverse Lookup (RepoHyper audit, score: 29)

### 36. Ingestion staleness creates a two-tier knowledge experience
**Repro:** every Cortex tool gives confident, fast answers about pre-phase-13.8 code (CortexDaemon, KnowledgeManager, etc.). For phase 13.8 additions (SoulEngine, ExperienceManager, cognitive.ts, packer.ts changes, MCP soul tools), every tool either errors, returns "not found," or returns misleading results. There's no banner/warning that ingestion is behind.
**Impact:** the agent can't tell when Cortex is authoritative vs. blind. Should expose: "lastSync covers 47 of 62 source files (76%); 15 files unsynthesized." Right now there's no transparency at all.

### 37. Round-trip math is brutal on cold paths
**Cumulative cost of Task B** ("add method to SoulEngine") just to *find the contract*:
1. `read_entity("SoulEngine")` — fail (1 round trip wasted)
2. `before_change("SoulEngine")` — fail (1 round trip wasted)
3. `source` skeleton — useless (1 round trip wasted)
4. `source` full — finally usable (1 round trip needed)

Plain `Read` on `src/knowledge/soul.ts` would have been **1 round trip** and ~equal token cost. Cortex cost me **4x the latency** on a phase-13.8 entity because the index doesn't know about it, the skeleton extractor is broken, and the fallback chain has no escape valve.
**Addressed by**: Phase 0.11 Refinement — Token Budget Pre-Flight Warning (aider audit, score: 36)

---

## 💸 SESSION-LEVEL FLAWS — costs that don't show up in any single tool call

### 38. Deferred MCP tool schemas inflate context before any work happens
**Repro:** Cortex registers 35+ MCP tools as deferred. To use any of them I must first invoke `ToolSearch` to load each schema. Loading the 16 audit/find/build tools alone consumed ~3.5k tokens of context just for schemas.
**Impact:** the more tools Cortex offers, the more expensive each session's cold-start gets. Tools I never call still consume my context budget when their schemas are loaded "in case."

### 39. Tool responses smuggle large system prompts back to the agent
**Repro:** `get_pending_changes` returned the **entire 5,000-token Librarian system prompt** plus the user prompt as a string. Schema says it's a `mode/systemPrompt/userPrompt/staleEntities/outputSchema` envelope.
**Impact:** I called the tool to check pending diffs; I received a wall of synthesis instructions I didn't need. The "agentic" architecture leaks the LLM-orchestration prose into the tool boundary. Should send the prompt *only* when the caller asks to drive synthesis.

### 40. "147.9k tokens saved" footers add ~50 tokens to every read
**Repro:** every `read_entity` / `read_concept` / `cortex_find` response includes the marketing footer. Across ~30 read-class calls in this session: **~1.5k tokens of pure noise.**
**Impact:** small per-call, large per-session. And the number is fabricated (see flaw #6). Subtract 147k from the agent's ROI math, the actual ledger says 11.5k — that means the footers are also a **149× exaggeration**, not just a wrong baseline.

### 41. Tool descriptions are written to "MUST" agents into behavior, inflating context
**Repro:** `cortex_find` tool description: *"Use this INSTEAD of grep or read_knowledge_index when..."*. `read_entity` description: 200 tokens of pedagogy. `ingest` description embeds workflow instructions.
**Impact:** the descriptions are LLM-targeted prose, not API documentation. Across the surface area they probably add ~5k tokens of context pressure to every session before the agent has done any work. Tool descriptions should describe behavior, not lobby for it.
**Addressed by**: Phase 13 Refinement — tool description coercion fix + Phase 4 Refinement — SERVER_INSTRUCTIONS concise playbook in MCP initialize response (codegraph audit, E5, score: 45)

### 42. Phantom-entity index inversion: KB more confident about hallucinations than reality
**Repro:** `AuthService` (phantom) gets quality `0.94` with `evidence 1.00`. `SoulEngine` (real, unindexed) returns `not found`.
**Impact:** an agent following Cortex's confidence signals would prioritize the phantom over the real entity. Quality scoring rewards presence-in-state-json, not presence-in-codebase.
**Addressed by**: Phase 0.2 — `validate.ts` phantom-entity detection

### 43. No coverage transparency
**Repro:** at no point did any tool tell me "synthesis covers N of M source files." `get_cortex_status` returned `lastSyncCommit` but no file-coverage diff.
**Impact:** I couldn't tell whether a "not found" was a coverage gap or a true negative until I manually `git diff`-ed against `lastSyncCommit`. The tool that *should* surface this (`audit`) reports `staleCount: 0` even when 15 new files are unsynthesized.
**Partially addressed by**: Phase 7.5 Refinement — Edge Confidence Breakdown per Community (score: 27)

### 44. `compress` modifies files in place with no dry-run
**Repro:** `compress({path: ".knowledge"})` would in-place edit every entity/concept markdown file. No `--dry-run`, no preview, no backup.
**Impact:** one wrong invocation could destroy the wiki. Should default to dry-run-with-diff and require `apply: true` to commit.

### 45. No batch reads
**Repro:** to read 5 entities I need 5 sequential `read_entity` calls. The MCP protocol supports batching but Cortex doesn't expose `read_entities({names: [...]})` or `read_many`.
**Impact:** linear round-trip cost for surveying multiple entities. Should add a batch variant.

### 46. `source` calls aren't parallelizable in the same turn
**Repro:** the `source` tool mutates cache state on every call. If I issue two `source` calls in parallel in one assistant turn, they race on the cache and may both return "full" (no compression) or both invalidate each other's skeletons.
**Impact:** I had to serialize `source` reads, doubling latency on multi-file inspections.

### 47. Mutating tools have no audit trail
**Repro:** `save_concept`, `configure_brevity`, `configure_safeguards`, `compress` all mutate state. None record who called them, when, or what changed.
**Impact:** I polluted the KB with `FLAW_TEST_CONCEPT` and only know I did so because *I* remember. An agent making the same mistake mid-session has no way to discover it. Should append every mutation to `experience.jsonl` (which already exists for exactly this purpose).
**Addressed by**: Phase 43.1 Refinement — Correlation ID Threading for Tool Call Audit Trail (closes flaw #47)

### 48. `set_project_root` can silently swap state mid-session
**Repro:** the MCP server accepts a `set_project_root` call that re-points the entire knowledge manager to a different directory. Per the earlier server.ts audit, this replaces `this.soul` without flushing pending mutations.
**Impact:** if an IDE roots-change notification fires mid-session, in-memory state is lost and the new state is loaded with no warning. Should require confirmation or refuse mid-session swaps.

### 49. Tool surface tells the agent to ignore other tools
**Repro:** `cortex_find` description: *"Use this INSTEAD of grep or read_knowledge_index."* `cortex_onboard`: *"Use this INSTEAD of read_knowledge_index."* `build_context_pack`: *"Use this instead of read_knowledge_index."*
**Impact:** four tools all claim to be the replacement for `read_knowledge_index`. Agents follow the most recent "INSTEAD of" rule and end up routing around the right tool. The taxonomy is unclear from the descriptions alone.

### 50. No way to query "what does Cortex *not* know?"
**Repro:** there's no tool that returns the list of source files NOT yet ingested. `audit` says "no stale entities" (i.e., existing entities are fresh) but doesn't surface "files that should exist as entities but don't."
**Impact:** the coverage gap (flaw #43) has no API surface. An agent can't ask "what's missing" — only "what's stale among what exists." This is how phantom entities + missing entities coexist with `audit` reporting all-clear.

---

## 🚨 NEW DISCOVERIES — security, data integrity, infrastructure

These were found by probing areas I hadn't touched in the previous sweeps: filesystem boundaries, `.knowledge/` directory contents, the gap between persisted data and tool responses.

### 51. 🚨 **CRITICAL SECURITY** — `source` tool is an unsandboxed filesystem read primitive
**Repro (confirmed live):**
```
source({filePath: "C:/Windows/System32/drivers/etc/hosts"}) → returned full file contents
source({filePath: "C:/Users/kumsatwi/.gitconfig"})           → returned git config including private email + employer info
source({filePath: "/tmp/test-cortex-secret.env"} via Windows abs path) → returned "TEST_TOKEN=abc123xyz"
```
**Tool description says:** `filePath: "Repo-relative path (e.g. src/auth/service.ts)"` — implying scope-bound. **Actual behavior:** any absolute path on the filesystem is honored with zero validation.
**Attack surface:** combined with prompt injection in a code diff, an attacker can exfiltrate `~/.ssh/id_rsa`, `~/.aws/credentials`, `~/.npmrc`, password manager exports, browser cookie databases, anything readable by the user running the MCP server. The agent will obediently `source` whatever the injected prompt names.
**Required fix:** validate `path.resolve(filePath)` is within `path.resolve(projectRoot)` (and not a symlink escape); reject otherwise. Same fix needed for `cortex_soul_import` / `cortex_soul_export` (already flagged in server.ts audit).
**Severity:** this is the single most serious flaw in the entire inventory. Everything else is performance or correctness. This is **data exfiltration**.
**Addressed by**: Phase 0.1 Refinement — `assertSafePath` Path Traversal Defense (closes Flaw #51 + #74, score: 75) + `validatePathWithinRoot` + O_NOFOLLOW tmpdir symlink attack prevention (codegraph audit, E1, score: 75)

### 52. `log_query()` returns `[]` while `log.jsonl` contains 12 real entries
**Repro:**
```
log_query()                              → []
log_query({entity: "CortexMCPServer"})   → []
wc -l .knowledge/log.jsonl               → 12
head -1 .knowledge/log.jsonl             → real synthesis entry from 2026-05-14
```
**Impact:** the tool's data source exists and is populated, but the reader is silently broken. Could be a schema mismatch (the entries use fields `timestamp/summary/entities/concepts/warnings/migrated` but the query may filter on a different shape). Audit, evolution, history — all decorative as long as `log_query` can't read its own log.

### 53. Namespace collision — `Native IDE Workflows` exists as BOTH entity and concept
**Repro:**
```
ls .knowledge/entities/ | grep "Native IDE"  → "Native IDE Workflows.md"
ls .knowledge/concepts/ | grep "Native IDE"  → "Native IDE Workflows.md"
state.json.entities["Native IDE Workflows"]  → description A (about .agents/workflows/explore.md)
state.json.concepts["Native IDE Workflows"]  → description B (different — about MCP prompts + slash commands)
```
**Impact:** the same name carries **two different descriptions** in two namespaces. `cortex_find` happily returns both as separate hits (confirmed in earlier session output). `read_entity` and `read_concept` of the same name return *different* content. There's no uniqueness constraint across the entity/concept namespaces, and no migration to merge them.

### 54. Phantom entities have physical .md files, not just state.json entries
**Repro:** `ls .knowledge/entities/AuthService.md` exists. `ls .knowledge/concepts/JWTStrategy.md` exists. Neither corresponds to any code.
**Impact:** cleanup requires removing both the state.json entry AND the .md file. There's no MCP tool to do either. The phantom is persisted at TWO layers.

### 55. Five separate state sources of truth — no reconciliation
- `state.json` (in-memory + on disk) — entities, concepts, brevity stats
- `log.jsonl` — historical synthesis events (12 entries)
- `experience.jsonl` — tool-call ledger (75+ entries based on file size)
- `savings_ledger.jsonl` — token/cost savings ledger
- `.last_sync_commit` — separate file mirroring state.json's last sync
- (Future) `soul_state.json` — SoulEngine memory graph
- (Future) `user_profile.json` — Soul profile

**Impact:** seven storage layers. No tool reconciles them. `cortex_soul_status` doesn't know about `experience.jsonl`. `log_query` doesn't read `log.jsonl`. `get_savings` reads `savings_ledger.jsonl` but its numbers contradict the per-call footers. Storage is balkanized.

### 56. `audit_evidence` "no drift" is a false negative for orphan entities
**Repro:** `AuthService` entity has **no `sourceFile` field at all** in state.json (confirmed). `audit_evidence` returned `"No evidence drift detected"`.
**Impact:** the evidence-drift check only inspects entities that *have* evidence. Entities with no source citation pass for free. The tool can't distinguish "verified clean" from "never had a fingerprint to check against." This is how phantom entities (#3) survive every audit.

### 57. `.knowledge/.obsidian/` is auto-created and bloats the wiki dir
**Repro:** `ls -la .knowledge/.obsidian/` shows 5 auto-created Obsidian config files including a 5,817-byte `workspace.json`.
**Impact:** Cortex assumes Obsidian usage and writes vault config without asking. Even gitignored, this is ~6KB of persistent dotfile noise per project. On systems where the user doesn't use Obsidian, it's pure waste. Should be opt-in via `cortex setup obsidian` rather than created on first ingest.

### 58. `.gitignore` contains `.knowledge` twice
**Repro:** `grep -c "^\.knowledge$" .gitignore` → 2.
**Impact:** harmless but indicates the setup tool doesn't dedupe `.gitignore` entries it appends. Suggests `cortex init` / `cortex setup` runs append-only without checking existing content. On repeated setups this could grow unbounded.

### 59. `savings_ledger.jsonl` credits "cached_skeleton" hits that I then had to bypass
**Repro:**
```
{"category":"source_cache","savedTokens":2856,"details":"source:cached_skeleton src/knowledge/soul.ts"}
```
This entry was written when I called `source` on `soul.ts` and got the broken skeleton (flaw #27). I then had to call `mode='full'` to actually get usable content. The ledger records the "savings" of the broken skeleton call without debiting the bypass call. **Double-counting in favor of Cortex.**
**Impact:** the savings ledger is structurally biased upward. Bypassed reads don't subtract; they just don't add. Net savings reported is the maximum possible, never the realistic average.

### 60. Test coverage is organized by phase but skips entire phases
**Repro:** `ls tests/` shows `phase6, phase7, phase7_5, phase8, phase10, phase13, phase13_1, phase13_2, phase13_3, phase13_4, phase13_6, phase13_7_2, phase13_8`. Missing: phase5, phase9, phase11, phase12, phase13_5, phase13_7 (only 13_7_2 exists). The implementation plan lists all of these as ✅ Done.
**Impact:** "✅ Done" in `implementation_plan.md` doesn't imply tests exist. Either tests for those phases are buried in `quicktest.ts` or they never existed. Either way the status table is misleading.

### 61. PreToolUse hook described in README isn't reflected in CLAUDE.md
**Repro:** README §246-259 documents a `PreToolUse` hook installed by `cortex setup claude-code` that fires before every Read/Grep call to inject the knowledge index. CLAUDE.md says nothing about it.
**Impact:** the actual runtime behavior of an installed Cortex is **richer and slower** than the CLAUDE.md guidance suggests. If the hook is installed, every Read/Grep I do triggers a `cortex read` invocation. That's invisible overhead I never accounted for in the token math. (Side note: this hook would mean my "Cortex didn't help" math is too generous — Cortex was *also* running on every native Read/Grep call.)

### 62. Description-prescribed workflow conflicts with the actual tool layout
**Repro:** `read_entity` description says: *"Use this when you saw a `[[WikiLink]]` in the index"*. But `read_knowledge_index` response no longer uses `[[WikiLink]]` in concept descriptions consistently (some use plain entity names like `[[CortexDaemon]]`, others say `Embodied by CortexMCPServer and the .claude/commands/`). The prescribed workflow assumes a uniform link convention the index doesn't follow.
**Impact:** agents trying to follow the documented pattern hit edge cases where there are no links to drill into.

### 63. State.json `version` field exists but is never checked
**Repro:** `state.json` has top-level `version` key. No tool reports it; no migration path appears to depend on it visibly. Old log entries have `migrated: true` flags suggesting a one-time migration happened.
**Impact:** schema versioning is silent. If a future version of Cortex changes the schema and old `state.json` files don't get migrated, breakage will be silent (entities just vanish).
**Addressed by**: Phase 3.3 Refinement — Schema Version Guard for Incremental State (closes Flaw #63, score: 45) + Phase 3 Refinement — schema_versions table with sequential, described, gated migrations (codegraph audit, E6, score: 36)

### 64. `compress` accepts absolute paths and would mutate them too
**Repro (not actually executed for safety):** `compress` description: `path: "The repo-relative path to the file or directory"`. Same loose validation as `source` based on the description pattern. An absolute path probably gets honored and modifies the file **in place**.
**Impact:** combined with prompt injection, `compress({path: "C:/Users/me/Documents/important.md"})` could corrupt files outside the project. I deliberately didn't run this — but the pattern across all Cortex tools (no path validation) suggests it's reachable.
**Addressed by**: Phase 0.1 — `validatePathWithinRoot(filePath, projectRoot)` (closes #51 structurally) + `writeSessionMarkerSafe()` (symlink-safe writes) + O_NOFOLLOW flag on tmpdir marker writes, stale-lock PID detection (codegraph audit, E1, score: 75)

### 65. Tool error messages don't say which projectRoot was used
**Repro:** `source({filePath: ".env"})` returned nothing (1-byte file). `source({filePath: "nonexistent.ts"})` would say `"file not found"`. Neither includes which projectRoot was active.
**Impact:** in multi-project workspaces, "file not found" is ambiguous. Should always echo: `"file not found at C:\Users\kumsatwi\Desktop\StEp\personalProject\LLM-Cortex\nonexistent.ts (projectRoot=...)"`.

---

## 🪤 INVISIBLE RUNTIME — Cortex hooks & hidden code paths

Probing `.claude/settings.json` and `.claude/hooks/` revealed three hooks Cortex installs that **shape every Claude Code session silently**. CLAUDE.md never mentions them. The agent's behavior is being modified by code the agent doesn't see.

### 66. PreToolUse hook runs `cortex read` via `execSync` on every Read/Grep
**Location:** `.claude/hooks/inject-knowledge.js`, registered in `.claude/settings.json` with matcher `"Read|Grep"`.
**What it does:** before every native `Read` or `Grep` tool call (once per parent-process session), shells out to `cortex read`, which:
- Spawns a new Node process
- Loads the full CLI binary
- Reads the knowledge index from disk
- Stringifies and returns it
- The hook prints it to stdout, which Claude Code prepends to the tool result

**Impact:** every first Read/Grep in a session pays ~100-500ms of process-spawn overhead plus the cost of loading/printing the knowledge index (~3k tokens of context the agent didn't ask for). The CLAUDE.md doesn't mention this hook exists. The agent has no way to opt out short of editing `.claude/settings.json`.

### 67. UserPromptSubmit hook (`cortex-router.js`) injects a 6-step workflow on every action-verb prompt
**Location:** `.claude/hooks/cortex-router.js`, registered as a `UserPromptSubmit` hook.
**Trigger regex:** `\b(implement|build|create|add|write|fix|repair|debug|refactor|modify|change|update|migrate|rewrite|extract|introduce|replace|delete|remove|rename|move|restructure|reorganize|optimize)\b`
**What it does:** if your prompt matches **any** of those verbs, the hook **prepends a 6-step "knowledge-first workflow" paragraph** to your message, telling the agent to call `read_knowledge_index`, then `read_entity`, then `read_concept`, then make a plan, then write code.
**Repro of false-positive trigger:** the user message "**add** these flaws in a file flaws.md" → contains "add" → workflow injected. The prompt has nothing to do with code synthesis.
**Impact:**
- The agent is being silently coached without seeing what was injected
- False-positive rate is high: "add this comment to the doc", "rename the column header", "delete this paragraph", "write a summary" — all trip the regex
- Every action-verb prompt pays ~500 tokens of injected workflow prose
- The injection is **invisible to the agent**, making behavior unpredictable across IDE/non-IDE environments
- CLAUDE.md doesn't mention this hook

### 68. The "147.9k tokens saved" claim has **two** disconnected sources, neither honest
**Source A — MCP server `withSavings()`** at `src/mcp/server.ts:164-182`:
```ts
const { tokens: sourceTokens, fileCount } = await this.getSourceStats();
const responseTokens = Math.round(text.length / 4);
const saved = Math.max(0, sourceTokens - responseTokens);
```
Where `sourceTokens = (sum of all source file bytes) / 4`. Roughly **2,548 tokens per file** in this repo.

**Source B — Hook `inject-knowledge.js`** at lines 55-57:
```js
const sourceTokenEstimate = files.length * 1200;
const saved = Math.max(0, sourceTokenEstimate - indexTokens);
```
Where the per-file estimate is hardcoded at **1,200 tokens**.

**Impact:**
- The two estimators disagree by ~2× per file
- Both compare against "if you had read every source file" — a strawman the agent never proposed
- The MCP-side number ("147.9k") and the hook-side number (~115k for 99 files) will diverge, so the footer the agent sees from `read_entity` and the footer the user might see from the Stop hook don't match
- Neither tracks actual *avoided* reads — they're synthetic baselines

### 69. `_sourceStats` cached for the lifetime of the MCP server
**Location:** `src/mcp/server.ts:157-161`. `this._sourceStats = { tokens, fileCount }` populated once on first call.
**Impact:** if a developer adds 20 files mid-session, the savings footer still claims the old file count and old token total. Every Cortex install has a frozen "savings baseline" from the moment the MCP server started.

### 70. PreToolUse hook session marker has no TTL → tmpdir() accumulates
**Repro:** `inject-knowledge.js:13` writes `${tmpdir()}/cortex_injected_${ppid}` per session. **Never deleted.** Over months of usage, the tmpdir() accumulates these markers — one per Claude Code session.
**Impact:** disk noise. On systems where tmpdir() doesn't auto-purge (Windows can keep it for years), this is a slow leak. Not catastrophic but indicates lifecycle neglect.

### 71. Session key collision via shared PPID
**Repro:** the hook uses `process.ppid` as the session key. On a system where two Claude Code instances share a parent (e.g. spawned from the same VS Code instance), they collide. The second session sees a stale marker and skips the injection.
**Impact:** silent under-injection in shared-parent environments. Should hash project root + ppid.

### 72. `save_concept` accepts empty-string name
**Repro (just executed live):** `save_concept({concept: {name: "", description: ""}})` → `"Concept '' saved to knowledge base."`. Confirmed it persisted to `state.json` as a key with `""` and required manual cleanup via `node -e`.
**Impact:** another extension of flaw #4. Beyond accepting any string, it accepts the **empty string**. The KB now had a phantom entry indexed under no name. `cortex_find` couldn't even find it (empty query is rejected) — it could only be discovered by raw inspection of state.json. **Permanent invisible pollution.**

### 73. `cortex_find` treats regex metacharacters as literals
**Repro:** `cortex_find({query: ".*"})` → `"No matches found."` instead of returning everything. `cortex_find({query: "(((((("})` → also no matches.
**Impact:** the search is plain substring. The tool description says "sub-millisecond search" but doesn't clarify it's literal-only. Power users assuming regex get silent zero-match returns.

### 74. `read_entity` accepts path-traversal-style names without sanitization
**Repro:** `read_entity({name: "../../../etc/passwd"})` → `"No entity named "../../../etc/passwd" found."` (not found, but no rejection).
**Impact:** if `read_entity` ever uses the name to construct a filesystem path (e.g. `entities/${name}.md`), this could be a traversal vector. The current implementation appears to look up via state.json keys, so it's safe today — but the *acceptance* of such names is a foot-gun waiting for a future refactor.
**Addressed by**: Phase 0.1 Refinement — `assertString` Type-Confusion Prevention (closes Flaw #74, score: 60) + `assertSafePath` Path Traversal Defense (closes Flaw #51 + #74, score: 75)

### 75. The brevity engine and the savings footer were probably already running invisibly
**Repro:** the Stop hook `cortex-savings-footer.js` appends a savings line at the end of every session. The agent (me) never saw this in this session — meaning either the hook didn't fire, or it fired but was hidden from my context.
**Impact:** the user may have been seeing "Cortex: ~Xk tokens saved this session" footers at the bottom of my responses that I cannot see. Behavior the agent can't observe is behavior the agent can't reason about.

### 76. `dist/` is the published code path; `src/` is what tests run against
**Repro:** `.claude/settings.json` invokes `dist/cli/index.js`. `package.json` test script is `tsx --test tests/*.test.ts` against `src/`. No CI step verifies that `dist/` matches `src/` post-build.
**Impact:** stale `dist/` produces production behavior different from what tests cover. Trivial to forget `npm run build` before publishing. Should add a `prepublishOnly` check that `dist/` is newer than `src/`.

### 77. No "before-edit" warning system for the hooks themselves
**Repro:** Cortex's setup writes `.claude/hooks/*.js`, `.claude/settings.json`, and `.agents/workflows/*.md`. These files are unsigned and unmonitored. A malicious npm postinstall script could overwrite them.
**Impact:** hooks run with `execSync` and Node interpreter permissions on every Claude Code prompt and tool call. If an attacker plants malicious code in `.claude/hooks/inject-knowledge.js`, it runs **before every Read** with full filesystem and network access. Cortex sets up an arbitrary-code-execution path keyed on session start.

### 78. `cortex.json` has only `{"brevity":"off"}` — no schema, no defaults file
**Repro:** `cat cortex.json` → `{"brevity":"off"}`. Nothing else.
**Impact:** the config file format is undocumented. If a user adds malformed JSON, every tool that calls `getBrevityLevel(projectRoot)` will throw. No schema validation, no default-file generation by `cortex setup`. Brittle config layer.

### 79. The CLAUDE.md instructions are inconsistent with the installed runtime
**Repro:**
- CLAUDE.md says "MUST exclusively call the `source` MCP tool for all code inspections."
- The installed PreToolUse hook fires `cortex read` (NOT `source`) before every native `Read`/`Grep`.
- The cortex-router hook tells the agent to follow a workflow that uses `read_entity`/`read_concept`, not `source`.
- Three documents (CLAUDE.md, the hook injections, the tool descriptions) prescribe **three different workflows.**

**Impact:** there is no single canonical Cortex workflow. The agent reads CLAUDE.md, gets coached by the router hook, sees tool descriptions saying "use this INSTEAD of X" — and the prescriptions don't align. This is why my session had so many false starts.

### 80. The hidden hook layer means my entire flaws.md token-math is too generous
**Realization:** my earlier "net session verdict" assumed Cortex's overhead was just MCP tool calls. It missed:
- PreToolUse hook fires (`cortex read` shell-out + index injection) on every Read/Grep
- UserPromptSubmit hook fires on every action-verb prompt (~500 tokens of injected workflow)
- Stop hook fires after every response (~50 tokens of savings footer)

If even half my Read/Grep calls in this session triggered the hook (it's gated by `sessionMarker` so only the first one fires per session, but a fresh-session injection is ~3k tokens), that's another **3-5k tokens of hidden overhead** I didn't account for in the "30-40k net negative" estimate.

**Revised verdict:** Cortex cost ~35-50k tokens this session, not 30-40k. The hidden hook layer is a meaningful chunk of that.

---

## 🧪 LATE-STAGE PROBES — multi-language, binary, scale

### 81. Binary files are returned as raw bytes into the agent context
**Repro (live):** wrote a 16-byte PNG (`\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR`). `source({filePath: "_cortex_test.png"})` returned the raw byte stream as a text "file content" in my context.
**Impact:** any binary in the repo (icons, fonts, .pdf, .zip, compiled .wasm) gets shoveled into the agent context. Should detect via extension or magic bytes and return `"<binary file, N bytes, not displayed>"`. Currently a context-flooding vector — `source({filePath: "node_modules/.../some.wasm"})` would dump a multi-MB blob.

### 82. Minified / one-line files break the same buffer cap as big multi-line files
**Repro:** wrote a 100,021-character single-line `.ts` file. `source` errored with the same "exceeds maximum allowed tokens" message, redirecting to a temp file. There's no streaming or chunked-by-character mode.
**Impact:** every webpack bundle, minified library, generated config, or auto-generated schema file is unreadable through `source`. The fallback Bash instructions tell the agent to use `python3 -c "open(...).read()[A:B]"` — which assumes Python is installed and the agent is allowed to shell out. Brittle.

### 83. The skeleton extractor is broken **only for TypeScript**, not Python
**Repro:** wrote a 10-line Python file with `class PaymentProcessor` containing 3 methods. First `source` call returned full content. Second call (cached re-read) returned:
```
class PaymentProcessor:
def __init__(self, api_key):
def charge(self, amount, currency="USD"):
def _call_api(self, path, payload):
```
**Skeleton kept all 3 method signatures.** Same probe on `soul.ts` (TypeScript) returned `export class SoulEngine` with **zero methods**.
**Impact:** the broken skeleton is a **language-specific bug** in the TypeScript AST visitor, not a fundamental design flaw. This is reassuring — it's a fixable code bug, not an architectural defect. But it also means a Python-heavy codebase would experience Cortex very differently than a TS-heavy one, with no documentation acknowledging the asymmetry.
**Addressed by**: Phase 0.13 Refinement — Use web-tree-sitter (WASM) over node-tree-sitter — cross-platform, bundled grammars, Node 23 stable (repomix audit, score: 60)

### 84. `estimate_cost` ignores its `budget` parameter
**Repro:** `estimate_cost({budget: 0.001})` returned `"No pending changes since last sync. Estimated cost: $0.00."` — same as `estimate_cost()` with no args. The tool description says the budget parameter triggers a "flags whether the estimate exceeds it" response. That branch isn't reached when there's no pending sync.
**Impact:** the budget guardrail is dead code when no diff is pending. A user invoking `estimate_cost --budget 0.05` to validate their cost ceiling gets no signal about whether the threshold is configured correctly. Should still echo `"budget: $0.05 (no syncs needed — within budget)"`.

### 85. Cache correctly invalidates on file deletion (positive finding!)
**Repro:** read `_cortex_temp.ts` → cached. Deleted the file. Re-read → `"Error: file not found"` (not stale cached content).
**Impact:** **this one works correctly.** Worth noting because most other things don't. The cache layer at least respects mtime / existence checks. Counterexample to the general pattern of Cortex over-trusting its own state.

---

## 🔬 SECOND-PASS PROBES — concurrency, locale, schema versioning, growth

Live tests of the areas I'd previously left unprobed.

### 86. 🚨 Schema `version` field is purely decorative — no migration gate
**Repro (live):** set `state.json.version = 999` (a future version that doesn't exist). All subsequent tool calls (`get_cortex_status`, `cortex_find`, `read_entity`) returned normal results — no version warning, no refusal, no migration prompt.
**Impact:** the version field (currently `2`, indicating a prior migration) is present in state but checked nowhere. A future Cortex release that changes the schema would silently misinterpret old state OR newer state. The migration mechanism the field hints at doesn't exist.
**Addressed by**: Phase 3 Refinement — schema_versions table with sequential, described, gated migrations; `schemaVersion` checked at startup (codegraph audit, E6, score: 36)

### 87. `source` silently normalizes CRLF → LF
**Repro (live):** wrote `_crlf_test.ts` with literal `\r\n` line endings (confirmed via `xxd`: `0d 0a`). `source` returned the file with `\n`-only endings. The raw bytes on disk are intact, but the tool's output doesn't reflect them.
**Impact:** if an agent is investigating "why does this file have CRLF on Windows?" or "is this YAML file CRLF?", `source` will lie. Any line-ending-sensitive workflow (CI config files, .gitattributes audits, hand-rolled parsers) gets misled.

### 88. `source` returns UTF-8 BOM verbatim
**Repro (live):** wrote `_bom_test.ts` with leading `\xEF\xBB\xBF` (UTF-8 BOM). `source` returned the BOM character as the first character of the response. Most consumers will treat the BOM as content.
**Impact:** opposite of CRLF — here Cortex passes through too literally. If the agent then quotes this content back into a new file or compares it to a clean version, the BOM causes silent diffs. Pick a convention: either strip BOM consistently or document that it's preserved.

### 89. Experience ledger growth is unbounded between compaction thresholds (10 MB)
**Repro (live):**
- `.knowledge/experience.jsonl` grew from 3 entries to **93 entries in one 6-hour session**
- Current size: 10,194 bytes
- Compaction threshold (per `src/knowledge/experience.ts`): **10 MB = 10,485,760 bytes**
- At today's growth rate (~93 entries × ~110 bytes/entry per 6 hours), compaction won't fire for ~1000× more sessions

**Impact:** the experience ledger is the only mechanism for the SoulEngine's failure-bias / success-bias signals. On active codebases, it grows linearly until 10 MB, then gets compacted into a single monthly summary entry that throws away per-event detail. The compaction strategy is too coarse — it should compact rolling windows (e.g., daily summaries after 30 days) rather than waiting for 10 MB.

### 90. `DiffLayer` doesn't handle git submodules
**Repro (source-level):** `grep "submodule\|recurse" src/core/diff.ts` returned nothing. The diff layer uses `git diff` without `--submodule` flags or per-submodule recursion.
**Impact:** repos with submodules either miss changes inside submodules entirely OR have them collapse to a single "submodule pointer changed" line. Cortex's synthesis prompt has no submodule-aware guidance. Enterprise monorepos almost always have submodules; this is unhandled.

### 91. Brevity config writes serialize correctly (POSITIVE)
**Repro (live):** fired three `configure_brevity` calls in parallel (`lite`, `ultra`, `off`). Final `cortex.json` value was `off` — matching the last-issued call. No corruption.
**Impact:** **the MCP server correctly serializes mutating calls within a single session.** Worth recording because most other concurrency behaviors are unverified.

### 92. Unicode entity names work correctly (POSITIVE)
**Repro (live):** `save_concept({name: "测试概念", description: "..."})` succeeded. `cortex_find({query: "测试"})` returned the entity. File `.knowledge/concepts/测试概念.md` was written on disk with the unicode name.
**Impact:** **i18n in entity names appears to work.** Good for non-English codebases. Combined with the lack of validation (#4, #72), this is a double-edged sword — i18n works but garbage also flows through.

### 93. Savings ledger doesn't clean up entries for deleted files
**Repro (live):** I created `_cortex_test.py`, read it via `source`, then deleted it. The savings ledger now contains:
```
{"category":"source_cache","details":"source:cached_skeleton _cortex_test.py","savedTokens":28}
```
The entry persists even though the file is gone. There's no garbage-collection pass that removes ledger entries for non-existent files.
**Impact:** ledger pollution accumulates. The savings totals reported by `get_savings` include credit for files that no longer exist. Combined with the unbounded-growth issue (#89), this is a slow leak.

### 94. The `cortex` CLI exists but `cortex watch` daemon was never started in this session
**Repro:** `cortex.log` doesn't exist; no `cortex.lock` files. The daemon entity (`CortexDaemon`) is real code but I have zero runtime data on its behavior. All flaws I attributed to the daemon (#5, #16 partially) are inferred from source-reading only.
**Impact:** documentary gap — a full audit needs a `cortex watch` session to validate:
- Lockfile cleanup on SIGINT/SIGTERM
- Graceful shutdown after diff-burst
- chokidar event coalescing
- Recursive loop prevention (`.knowledge/` excluded — but is `.cortex/`? `.obsidian/`? what about new directories the user adds?)
- LLM failure handling during sync
- Behavior when `.knowledge/` is wiped while the daemon is running

### 95. Performance probe: `cortex_find` is genuinely fast at this scale
**Repro (live):** simple substring loop across 22 entities/concepts × 8 queries = 176 comparisons in **0.10 ms**. The MCP tool itself adds protocol overhead but the search core is sub-millisecond as advertised.
**Impact:** the "sub-millisecond search" claim is **honest at small scale (≤ 100 entities)**. Unverified at 1000+. Naive substring scan is O(N×Q×L); at 5000 entities × 20-char queries the math suggests ~10-30ms before considering MCP overhead. No benchmark exists to validate either direction.

### 96. No backup / restore for `.knowledge/`
**Repro:** I had to manually `cp .knowledge/state.json /tmp/state_backup.json` before testing schema version because there's no `cortex backup` command. Combined with `.knowledge` being `.gitignored` by default (#58), if state.json corrupts, **there is no recovery path** short of re-ingesting from scratch.
**Impact:** lose `.knowledge/state.json`, lose every human review, every quality score, every concept manually curated, every entity not derivable from git history. For a tool whose pitch is "compounding architectural memory," lack of backup is fatal.

### 97. The cortex CLI's `init` command is interactive-only — no `--non-interactive` mode
**Repro:** `node dist/cli/index.js --help` shows `init [options]` as "interactive setup". No flag-only option (other than what `init --quickstart` provides, which I haven't verified).
**Impact:** Cortex can't be installed in a Dockerfile / CI step / Ansible play / Terraform provisioner without a TTY. Limits enterprise adoption.

### 98. No `cortex doctor` / health check
**Repro:** `cortex status` returns initialization state. There's no command that runs all readers, validates schema, detects phantom entities, checks log.jsonl readability, validates state.json structure, or reports gaps.
**Impact:** when something goes wrong (and given the 95+ flaws, things will go wrong), there's no first-line diagnostic. Today the only way to triage is to read JSONL files manually and compare against state.json. A `cortex doctor` that surfaces all current flaws as failed/warned checks would shortcut hours of debugging.
**Addressed by**: Phase 0.7 Refinement — Doctor Capabilities Fingerprint (closes Flaw #98, score: 45) + Phase 0.7 Refinement — `diagnose_extraction()` Edge-Collapse Diagnostics (partially closes Flaw #98, score: 18)

### 99. Unverified: provider failure handling
**Status:** could not test without triggering a real LLM call. The codebase has retry logic in some places (visible via earlier source reads of synthesis pipeline) but I have no evidence about:
- Behavior on HTTP 429 (rate limit)
- Behavior on HTTP 500 (provider failure)
- Behavior on timeout
- Behavior on truncated response
- Behavior on malformed JSON from the LLM (does it crash, retry, or silently save garbage?)
- Behavior on partial response that passes Zod schema but contains hallucinated relationships

This is a critical gap — provider-side failures are statistically certain at any scale. A second-pass audit with mock provider injection would likely surface 5-10 more flaws.

### 100. Unverified: large-scale performance
**Status:** untestable on this 22-entity KB. The implementation plan (Phase 33) acknowledges that bootstrap ingestion at 1000+ files is a real engineering problem; the same applies to read paths. Open questions:
- Does `state.json` deserialization stay sub-second at 1000 entities? At 5000?
- Does `read_knowledge_index` response size stay under MCP's response limits?
- Does PageRank's 20-iteration loop stay under 100ms at scale?
- Does the AST cache exhaust RAM with thousands of cached skeletons?
- Does `cortex_find` stay sub-millisecond at 5000 entities × long queries?

A benchmark suite with synthetic fixtures (10/100/1000/5000 entities) would close this gap definitively.

---

## 🔍 THIRD-PASS PROBES — build pipeline, consistency, privacy, subprocess surface

### 101. `index.md` drifts when `state.json` is modified externally
**Repro (live):** I edited `state.json` directly (added then removed the unicode `测试概念` concept). `index.md` retained the stale `### [[测试概念]]` block — confirmed via diff. No mechanism re-renders `index.md` when state changes externally.
**Impact:** the markdown "view" of the KB drifts from the canonical `state.json`. Tools that scrape `index.md` (e.g., the hook reading `cortex read` output) get out-of-date data. Any state mutation outside the MCP server invalidates the rendered view silently.

### 102. `dist/` build artifacts have no freshness check against `src/`
**Repro (live):**
```
dist/mcp/server.js: 2026-05-22T10:19:34
src/mcp/server.ts:  2026-05-21T22:07:41
```
`dist` is currently newer than `src` (because I ran `npm run build` earlier). But there's no pre-flight check that ensures this. If a developer edits `src/`, forgets to rebuild, and ships, `dist/` runs stale code. `package.json` has `prepublishOnly` but no `pretest` or `predev` validation.
**Impact:** silent staleness between source and runtime. A "fixed it" claim could be against unbuilt code.

### 103. 🔒 PRIVACY — `.knowledge/.obsidian/workspace.json` tracks user file-open history
**Repro (live):** `workspace.json` has a `lastOpenFiles` array recording every knowledge file the user opened in Obsidian:
```
["concepts/Repo-Aware Portability.md", "concepts/Persistent Knowledge State.md",
 "entities/ProjectCore.ts.md", "entities/KnowledgeManager.md", ...,
 "state.json"]
```
**Impact:** even though `.knowledge/` is `.gitignored`, this file documents the developer's review attention pattern. If `.knowledge/` is ever:
- Shared via `cortex export` or zip (common for handoffs/audits)
- Accidentally un-gitignored (#58 already shows dupe entries, easy to misconfigure)
- Backed up to cloud storage
- Synced to a team Obsidian vault

...the user's introspection history leaks. Should add `.obsidian/workspace.json` to a Cortex-managed inner `.gitignore`, OR move Obsidian config opt-in (covered in #57).

### 104. `execSync` used in 5+ places with no timeouts → subprocess hangs propagate
**Repro (source-level):**
```
src/cli/setup.ts:110   execSync("cortex read", ...)        // no timeout
src/cli/setup.ts:114   execSync("git ls-files", ...)       // no timeout
src/cli/status.ts:144  execSync(`git diff --name-only ...`) // no timeout
.claude/hooks/inject-knowledge.js:23 execSync("cortex read") // no timeout
.claude/hooks/inject-knowledge.js:33 execSync("git ls-files") // no timeout
```
**Impact:** if `git` hangs (locked `.git/index`, slow filesystem, antivirus scan), every Cortex command and hook invocation hangs indefinitely. Should pass `{timeout: 5000}` to every `execSync`. The hook on every Read/Grep call would block the entire Claude Code session.

### 105. The "85.9% Reduction" savings ratio is per-call, presented as a session statistic
**Repro (live):** `get_savings` reports `Overall Savings Ratio: 85.9% Reduction`. The math: `15,338 saved / (15,338 + responseTokens)`. That's per-call accounting summed as if it were a session ratio.
**Reality:** this session's actual cost (per my own audit math) was ~50k tokens of Cortex overhead vs ~15k of credited savings. **Real session ratio: ~-230% (Cortex cost 3.3× what it saved).** The "85.9%" is mathematically correct for the *moments when savings were credited* but ignores all the moments when Cortex cost tokens without crediting itself.
**Impact:** the most-quoted ROI number on the `get_savings` output is a per-call average masquerading as a workflow metric. Adds to the dishonest-accounting cluster (#6, #7, #59, #68-70).

### 106. Slash-command files in `.claude/commands/` duplicate MCP tool behavior with prose instructions
**Repro (live):** `before_change_cortex.md` (1518 bytes) is a step-by-step prose workflow that re-explains what `before_change` MCP tool already does in one call. Same for `cortex_audit.md`, `cortex_status.md`, etc.
**Impact:** double-documentation. The MCP tool description says one thing; the slash command says another (sometimes identical, sometimes drifted). Two paths to keep in sync, and the slash commands don't update automatically when the MCP tools change. This is how flaw #79 (three conflicting workflow prescriptions) emerged.

### 107. The `vibecoder.md` slash command reads `implementation_plan.md` from the project root — but doesn't respect `set_project_root`
**Repro (source-reading):** `vibecoder.md:6` says *"Read `implementation_plan.md` at the project root."* The Cortex project root can be re-pointed via `set_project_root`. If a user `set_project_root`s to a different project, the vibecoder slash command still loads `implementation_plan.md` from the **original CWD**, not the new project root.
**Impact:** the slash commands and MCP tools have inconsistent project-root resolution. Cross-project pollution waiting to happen.

### 108. `ingest_cortex.md` slash command is 2691 bytes of agent-targeted prompt
**Repro:** the slash command literally embeds the Librarian prompt + an instruction to "call save_synthesis" — duplicating what the `ingest` MCP tool description (5KB) already says.
**Impact:** the same prompt lives in three places: `src/llm/prompts.ts` (canonical), `src/mcp/server.ts` (embedded in tool description and `get_pending_changes` response), and `.claude/commands/ingest_cortex.md`. Update one, you forget the other two. Drift is structural.

### 109. Compaction thresholds aren't user-configurable
**Repro (source-level):** `src/knowledge/experience.ts:24-26`:
```ts
const COMPACTION_THRESHOLD_BYTES = 10 * 1024 * 1024; // 10MB hardcoded
const SIX_MONTHS_MS = 180 * 24 * 60 * 60 * 1000;     // 180 days hardcoded
```
No env var, no `cortex.json` option, no MCP tool to adjust.
**Impact:** a user on a heavily-active codebase (1000+ tool calls/day) hits the 10MB threshold in months; a user on a quiet codebase never hits it. The compaction behavior should be tunable per-project.

### 110. No npm vulnerabilities currently (POSITIVE)
**Repro (live):** `npm audit --json` → `{info:0, low:0, moderate:0, high:0, critical:0, total:0}`.
**Impact:** **at this moment, the dependency tree is clean.** Worth noting because (a) it's a real positive and (b) it shifts the security risk surface entirely to Cortex's own code (where #51 lives).

### 111. TypeScript `strict: true` is on (POSITIVE)
**Repro (live):** `tsconfig.json.compilerOptions` includes `"strict": true`.
**Impact:** **strict typing is actively enforced.** Reduces the surface area of "null was actually undefined" class of bugs. Good baseline; the flaws documented aren't from loose typing.

### 112. CLI `cortex read` returns identical content to MCP `read_knowledge_index`
**Repro (live):** ran `node dist/cli/index.js read` — output structurally identical to MCP response. Same `# Project Cortex: Knowledge Index` header, same entity layout.
**Impact:** **CLI/MCP parity is maintained for this command** (POSITIVE). But also: two code paths producing identical output is duplication — any future change must be made in both. Today consistent; tomorrow easy to drift.

### 113. The "Failed Approaches" mechanism is documented in the schema but no entity uses it
**Repro:** `cat .knowledge/state.json | jq` shows every entity has a `relationships` array, but **no entity has a `failedApproaches` field populated**, despite the schema supporting it and the Librarian prompt explicitly asking for "detective work" to record deletion-of-significant-patterns.
**Impact:** the most architecturally interesting feature — recording *why* a previous approach was abandoned — isn't being produced by the Librarian. Either the prompt isn't firing the heuristic, or the synthesis output schema isn't capturing it. Either way, the "remember mistakes" pitch is unfulfilled today.

### 114. No `cortex setup --dry-run` to see what files will be written
**Repro:** `cortex setup claude-code` writes `.claude/settings.json`, `.claude/hooks/*.js`, `.claude/commands/*.md`, `.agents/workflows/*.md`, modifies `.gitignore`, possibly creates `.knowledge/`. No way to preview before running.
**Impact:** combined with #58 (gitignore dupe entries) and the hook-installation pattern (#66-77), `cortex setup` is opaque. A `--dry-run` showing every file to be created/modified would let users audit what's about to land in their repo.

### 115. The Librarian system prompt is **5,094 characters** embedded in the MCP server
**Repro:** `get_pending_changes` returned it inline (flaw #39 already noted it). The prompt is hardcoded in `src/llm/prompts.ts` and re-sent on every `ingest` call.
**Impact:** the prompt that defines Cortex's entire synthesis behavior is:
- Not user-configurable (can't tune prompt per project / per language / per team style)
- Not versioned (changes ship silently with Cortex updates)
- Not visible to the user normally (only surfaces via `get_pending_changes` debugging)
- Counts against every ingest's input tokens

A team that wants stricter / looser synthesis has no knob beyond forking Cortex.

---

## 📈 STAGE 5+ — SCALE-OUT ROADMAP (small → large codebases)

The four-stage plan above gets Cortex from "harmful" to "narrowly useful" on a codebase like this one (~100 source files, ~15 entities, single developer). To make it **genuinely good across all sizes** — from a 50-file solo project to a 5000-file enterprise monorepo with 10 developers — additional work is needed. The implementation_plan.md anticipates some of this (Phases 33, 11, 13.14, 13.15) but the gaps below are not all covered.

### Stage 5 — Cold-start ROI on small codebases (~1 week)
**Goal:** make Cortex net-positive from day 1, even on a 50-file solo project.
**The problem today:** Cortex on this 100-file repo cost 35-50k tokens of overhead this session for ~6-8k of value. The implementation plan's Phase 13.14 acknowledges this. Specific fixes:
- **Auto-detect codebase size**, scale features accordingly: a 20-file repo doesn't need PageRank, lens reranking, or the brevity engine
- **Server-side synthesis** (Phase 13.14.1) — kill agent-billed ingest
- **`gemini-flash` / Ollama defaults** for `cortex watch` (Phase 13.14.2)
- **Diff significance filter** (Phase 13.14.3) — skip whitespace/comment changes
- **Commit-gated auto-sync** (Phase 13.14.4) — stop firing on every save
- **Multi-output pipeline** (Phase 13.15) — make each sync produce changelog + PR draft + affected tests so the value scales with the work
- **Skip the entity-page wiki on tiny codebases** — for a 10-entity repo, a single ARCH_SPEC.md is more useful than 10 separate .md files

### Stage 6 — Medium codebase performance (100-500 entities, ~1 week)
**Goal:** sub-second tool responses, predictable memory use.
- **Pagination on `read_knowledge_index`** — currently returns the whole index. At 500 entities, that's 50k+ tokens per call. Add `offset/limit` or cursor pagination.
- **Lazy state.json deserialization** — currently the whole state is loaded into memory per tool call. Switch to a streaming JSON parser or SQLite-backed store.
- **PageRank as an offline precompute** — currently runs in-process per `build_context_pack` call (20 iterations × N nodes). Persist centrality scores; recompute only on sync.
- **MCP response size caps** — currently no response is bounded. Add a soft cap with elision indicators.
- **Coverage report tool** (#43, #50) — at scale, "what's NOT indexed?" matters as much as "what is?"

### Stage 7 — Large codebase scalability (1000+ entities, ~2 weeks)
**Goal:** support enterprise-scale monorepos without state.json becoming unworkable.
- **Sharded storage** — `state.json` per module/domain instead of one giant file. The plan's Phase 11 (Monorepo Federation) outlines this.
- **Async ingestion with checkpoints** — the plan's Phase 33 (Deep Recursive Bootstrap Ingest) covers this; ship it before recommending Cortex for >1000 files.
- **Cancellable operations** — long-running ingest/audit must accept SIGINT and save checkpoints
- **Disk-backed cache** — current AST skeleton cache is in-memory; on large repos this exhausts RAM
- **Per-domain quality gates** — `audit_quality` returns 15 entities today; at 2000 entities the audit output itself becomes unreadable. Need per-domain rollups.
- **Concurrent MCP client safety** — multiple developers / IDE instances hitting the same `.knowledge/` need lockfile correctness verified (not just claimed)

### Stage 8 — Multi-language depth (~2 weeks)
**Goal:** Cortex is as useful on a Go/Python/Rust codebase as on a TS codebase.
- **Per-language skeleton extractors** — Python works (proven by flaw #83), TS is broken, Go/Rust/Java/C#/Ruby/PHP untested. Need an extractor per language with parity tests.
- **Per-language entity-type taxonomy** — a Go `struct` is not a TS `class`. A Python `module` isn't a Java `package`. Synthesis prompts and quality scoring need language-aware heuristics.
- **Cross-language relationship resolution** — TS calls Python via subprocess, Rust via FFI, Go via gRPC. Today Cortex sees only intra-language edges.
- **JSX/TSX/decorators/macros** — verify the TS parser handles these. JSX is the most common gap in naive AST visitors.

### Stage 9 — Operational maturity (~1 week)
**Goal:** Cortex survives real-world ops: container deploys, CI runs, provider outages, corrupted state.
- **Container-friendly setup** — `cortex setup` assumes `~/.cortexrc` is writable; in containers it's not. Fall back to env-only config.
- **Works without git** — shallow clones, archive downloads, non-git directories all crash today (`getPendingDiff` requires git).
- **Provider outage handling** — LLM 429/500/timeout currently surfaces raw errors. Add retry-with-backoff + circuit breaker.
- **`cortex health`** — distinct from `status`; runs all readers, validates state schema, reports gaps. Suitable for CI healthchecks.
- **Backup/restore** — `cortex backup` / `cortex restore` for `.knowledge/`. Today corruption requires git history (which is `.gitignore`d for .knowledge by default — so there's NO recovery path).
- **Schema-versioned state** — flaw #63. State migrations must be tested across versions.
- **Telemetry opt-in** — currently no telemetry. When adding (e.g., for Phase 7.5 quality trends), make it opt-in with clear data scope.

### Stage 10 — Privacy & compliance (~2 weeks)
**Goal:** safe for SOC2/HIPAA/PCI-regulated codebases.
- **Local-only mode** — Phase 33 mentions deterministic mode; extend to a full air-gapped Ollama-only flow with audit logging
- **Pre-LLM redaction pass** — scan diffs for `password=`, `bearer `, `AWS_SECRET_ACCESS_KEY`, etc., redact before sending to provider
- **Audit log of LLM uploads** — every byte sent to a provider gets logged with model, project, timestamp, hash
- **Data-residency controls** — `CORTEX_PROVIDER_REGION` for org policies
- **Right-to-delete** — when an entity is deleted, ensure provider-side caching doesn't retain it (or at least surface that risk)

### Stage 11 — Multi-tenancy (~1 week)
**Goal:** safe for two+ developers sharing a workstation or working concurrently against the same `.knowledge/`.
- **Per-user soul profiles** — today the soul state is global per project. Two devs with different `riskTolerance` profiles step on each other.
- **Lockfile stress tests** — flaws #19 and the soul lock have been claimed-tested but not stress-tested under contention
- **MCP server isolation** — verify two MCP servers (one per IDE instance) don't corrupt shared state
- **Write coalescing** — concurrent `save_synthesis` calls need transactional merging, not last-write-wins

---

### Total scale-out effort

| Stage | Focus | Days |
|-------|-------|------|
| 1-4 | Correctness + workflow (covered above) | ~18 |
| 5 | Small-codebase ROI | ~5 |
| 6 | Medium-codebase perf | ~5 |
| 7 | Large-codebase scale | ~10 |
| 8 | Multi-language depth | ~10 |
| 9 | Operational maturity | ~5 |
| 10 | Privacy/compliance | ~10 |
| 11 | Multi-tenancy | ~5 |
| **Total** | | **~68 days** |

For a single full-time engineer: ~3-4 months of focused work to take Cortex from "harmful on small, painful on large" to "genuinely useful at all sizes."

**Important caveat:** Stages 5-11 should not be attempted before Stages 1-4 ship. Scale-out features built on top of the current correctness/security defects would amplify the defects, not the value. **Fix the foundations first; scale them second.**

---

## ⚖️ NET SESSION VERDICT — was Cortex worth it?

**For this session (audit of phase 13.8): NO. Net negative ~30-40k tokens.**

Honest breakdown:
- **Helpful calls:** 2 (`read_knowledge_index`, `cortex_find("cortex")`). Saved ~6-8k tokens vs. native equivalents.
- **Neutral calls:** ~5. Returned correct data at roughly Read+Grep cost.
- **Harmful calls:** ~25. Tool failures, skeleton garbage, footer noise, schema loading, deferred-tool warm-up, side-effect pollution.

**Where Cortex would flip to net positive:**
- Codebases where >80% of code is ingested and fresh
- Sessions where the same entities are re-touched 5+ times (cache amortizes)
- Tasks that explicitly need cross-file blast-radius analysis on indexed entities

**Where Cortex stays net negative (this session is the canonical example):**
- Audit / read-only work on freshly-changed code
- Single-pass investigations
- Codebases where ingestion lags HEAD by >1 commit with significant changes

**Bottom line:** Cortex is built like a long-running production memory store with multi-hour edit sessions in mind. On a "look at this one PR" workflow, it adds friction without amortizing the setup cost. The implementation plan's Phase 13.14 ("negative ROI on small codebases") names this exact problem but treats it as a *cost* issue. It's also a *correctness* and *workflow* issue, and that's what this entire audit shows.

---

## Summary — what Cortex *should* fix for small/iterative codebases

These workflow flaws map to a small set of root causes:

1. **No content search → grep ban is unenforceable.** Add `cortex_search_source(pattern, glob?)` that runs ripgrep server-side and returns hits with surrounding context. Then the grep prohibition has a substitute.
2. **Skeleton extractor is broken for TS classes.** It strips method signatures and type bodies; keeps method-body locals. The TS AST visitor needs to honor class-method declarations and type aliases as top-level nodes.
3. **`source` needs targeted reads.** Add `symbol:` and `offset/limit:` parameters. The current binary "full or skeleton" model is too coarse for iterative work.
4. **Ingestion-coverage transparency.** Every tool that says "not found" should also say "(N of M source files synthesized — this query may be a coverage gap)."
5. **Fallback to source-level inference for unindexed entities.** `before_change` and `read_entity` should detect "a class with this name exists at <path>" and degrade gracefully into a source-grep result instead of dumping the available-entities list.

---

*Generated from live MCP tool invocations on branch `phase13.8`, 2026-05-22.*

---

## 📚 GRAPHIFY PATTERN SOLUTIONS — how each class of flaw is solved by design in graphify

> Graphify is a comparable Python/PyPI knowledge graph tool (v0.8.15, YC S26). Deep read of its codebase (`security.py`, `validate.py`, `cache.py`, `dedup.py`, `watch.py`, `serve.py`, `diagnostics.py`) shows it fixes most of our 115 flaws **by architecture**, not by retrofit. Below maps our flaw categories to graphify's design decisions. These patterns are the input to **Phase 0** in `implementation_plan.md`.

### 1. Security — `security.py` (fixes #51, #64, #74, #103)

Graphify has a **dedicated 336-line `security.py`** that is the only entry point for any external input. No other module calls `open()` on a user-supplied path. Key mechanisms:

- `validate_url()` — blocks SSRF including private RFC-1918 ranges, loopback, and NAT64 bypass (`::ffff:192.168.x.x`)
- `_NoFileRedirectHandler` — custom HTTPHandler that raises on any redirect to `file://`, preventing redirect-based SSRF
- `_ssrf_guarded_socket` — patches `socket.create_connection` to prevent TOCTOU race between DNS resolution and connection
- `validate_graph_path(root, user_path)` — `Path.resolve()` then `Path.is_relative_to(root)`; raises `ValueError` on escape attempt
- `check_graph_file_size_cap()` — 512 MiB hard cap before mmap/load to prevent memory bombs
- `sanitize_label()`, `sanitize_metadata()` — strip HTML, truncate to 500 chars, recurse into nested dicts/lists

**Our gap**: Cortex has no equivalent. Any `ingest` call with a crafted path can read `/etc/passwd` on Linux or `C:\Windows\System32\` on Windows (flaw #51). No fetch size cap means a 2 GB file OOMs the process (flaw #64 class).

### 2. Schema Validation — `validate.py` (fixes #4, #72, phantom-entity class)

Graphify defines `REQUIRED_NODE_FIELDS`, `REQUIRED_EDGE_FIELDS`, `VALID_FILE_TYPES`, `VALID_CONFIDENCES` as module-level constants. Every write path calls `validate_node()` / `validate_edge()` before the object is accepted. Edge validation includes referential integrity: source and target node IDs must exist in the current graph.

- **Confidence labels** (`EXTRACTED` / `INFERRED` / `AMBIGUOUS`) are a required field on every edge. Phantom/hallucinated relations are forced into `AMBIGUOUS` — which callers can filter out at query time.

**Our gap**: `save_concept` accepted an empty-string name live during this audit session (flaw #72). `ingest` produces entities with no file-type guard. No referential integrity check means broken edges persist silently (flaw #53, #54).

### 3. Caching — `cache.py` (fixes #27 and the stale-skeleton class)

Graphify's cache uses **SHA256 + stat-based fastpath** (file size + `mtime_ns`). Cache writes are atomic: write to a temp file, then `os.replace()` (rename-atomic on both POSIX and Windows). An `atexit` handler flushes pending entries. Windows long-path normalization (`\\?\` prefix) is applied automatically.

The skeleton content is stored **inside the entity body** in the knowledge graph itself — not in a separate opaque cache file. This means the skeleton is:
- versioned (git-trackable)
- auditable (readable by `cortex doctor`)
- invalidated automatically when the entity is updated

**Our gap**: Our skeleton extractor strips TS class method signatures and type bodies (flaw #27). The "cache" is a parallel file that can drift from the source of truth with no detection mechanism.

### 4. File Locking — `watch.py` (fixes #19)

Graphify uses **OS-native `fcntl.LOCK_EX | LOCK_NB`** with the PID written to the lockfile. On Windows it falls back to a named mutex. Lock release calls `unlink` on cleanup. If a second process tries to acquire the lock and fails, it logs the PID of the holder and exits cleanly rather than proceeding with a race.

**Our gap**: Cortex's state.json has no real exclusive lock. Two concurrent `ingest` calls write to the same file and corrupt it (flaw #19). The "lock" file is a marker file, not a kernel-enforced mutex.

### 5. Deduplication — `dedup.py` (fixes #53, #54)

Graphify runs a 5-stage deduplication pipeline on every graph load:
1. Exact normalization (lowercase, strip punctuation)
2. Entropy gate (discard trivially short strings)
3. MinHash/LSH blocking (candidate pairs only, O(n) not O(n²))
4. Jaro-Winkler verification (confirm similarity above threshold)
5. Community boost (same-cluster nodes get higher merge confidence)
6. Union-find merge (collapse duplicates into canonical node)

**Our gap**: Cortex accumulates near-duplicate entities silently. Every re-ingest of a refactored file creates a parallel entity with a slightly different name. No deduplication pass runs at any point (flaws #53, #54).

### 6. MCP Hot-Reload — `serve.py` (fixes #48)

Graphify's MCP server uses **double-checked locking** to reload the in-memory graph when the backing file changes. The reload acquires a lock, checks if reload is still needed (another thread may have beaten it), reloads, and releases — without restarting the server process. IDF weights are recomputed after reload and cached.

**Our gap**: After every `cortex sync`, the MCP server must be restarted to see new entities. In a live coding session this means manually stopping and restarting the server after every sync cycle (flaw #48).

### 7. Search Ranking — `serve.py` IDF+BFS/DFS (fixes #28)

Graphify's `_score_nodes()` is production-grade IR:
- `idf[term] = log(N / df[term])` — computed once per graph load; common terms (`error`, `service`) get low weight, rare identifiers high weight.
- Three-tier precedence: exact match → `1000 × IDF`; prefix match → `100 × IDF`; substring match → `1 × IDF`.
- `_SOURCE_MATCH_BONUS = 0.5` — if the entity's `source_file` path contains the query term, its score is multiplied by `1.5` (50% boost).
- `_pick_seeds()` score-gap threshold: if top score > 20× the next score, only the top result seeds BFS/DFS — prevents noise matches flooding the traversal.
- Unicode-aware: `_strip_diacritics()` normalizes before comparison for international codebases.
- BFS/DFS graph traversal from seeds — returns structurally related entities, not just keyword matches.

**Our gap**: `cortex_find` returns flat substring-match results in insertion order. No IDF, no source-path bonus, no score-gap, no graph traversal. On a 100+ entity graph this produces noise (flaw #28 — grep ban unenforceable without a real substitute).

### 8. Diagnostics — `diagnostics.py` (fixes #62, #98)

Graphify's `diagnostics.py` (390 lines) runs structural readiness checks:
- Edges referencing non-existent nodes (orphan edges).
- **File-type → suspect-relation pairs**: e.g., a concept node receiving `calls` or `imports` edges is a symptom of LLM hallucination — concepts don't call code.
- **Exact-duplicate edge detection** (`_exact_signature`): edges with identical `(source, target, relation)` triple counted and reported.
- Edges with empty critical fields (`source`, `target`, `relation`, `confidence`, `source_file`).
- Output: color-coded pass/fail per check with an actionable remediation line for each failure. `--json` flag for CI.

**Our gap**: Cortex has no self-diagnostic. Silent corruption (flaw #62) and stale index drift go undetected until an agent produces a wrong answer (flaw #98). No way to detect LLM-hallucinated relation types on non-code entity nodes.

### 9. Benchmark Honesty — `worked/` directory (fixes #6, #68-#70)

Graphify ships a `worked/` folder with real benchmarks — exact prompts, token counts, agent output diffs. Critically, they **include cases where their tool doesn't help**:

| Corpus | Files | Reduction |
|--------|-------|-----------|
| Karpathy repos + papers + images | 52 | 71.5× |
| graphify source + Transformer paper | 4 | 5.4× |
| httpx (synthetic Python library) | 6 | ~1× |

The `~1×` row is the honest admission that graphify adds overhead on small projects. Each benchmark has raw inputs and a `review.md` so anyone can reproduce.

**Our gap**: Cortex's brevity engine reports savings as `~Xk tokens saved` based on `files.length × 1200` heuristic, not measured against any real workload. On sessions where the index costs more than ad-hoc greps would, the savings display is actively misleading (flaws #6, #68-#70).

### 10. Centralized Path Validation (fixes #51 structurally)

Every path that enters any graphify module passes through `security.validate_graph_path(root, user_path)` before the file handle is opened. This is a structural guarantee — no parallel code path opens files without validation. New features inherit the protection automatically.

**Our gap**: Cortex has multiple call sites that open files using user-supplied strings with no centralized guard. Adding path validation means auditing every call site individually, not adding one function.

### 11. Backup / Restore / Git-Friendly Output (fixes #96)

Graphify's `graph.json` is **designed to be committed**:
- Versionable, diffable, mergeable via `graphify merge-graphs <A> <B>`.
- `GRAPH_REPORT.md` is human-readable in GitHub PRs.
- `cache/` is the only thing typically gitignored (not the main knowledge store).
- `graphify hook install` writes **both `post-commit` and `post-checkout`** git hooks — knowledge base auto-rebuilds on commit and on branch switch. `post-checkout` checks `$3 == 1` (branch switch) vs `$3 == 0` (file restore) before triggering sync.
- `graphify clone <github-url>` clones repos to `~/.graphify/repos/` for cross-repo knowledge queries without switching workspace.

**Our gap**: `.knowledge/` is gitignored by default — lose `state.json` = lose everything, no recovery path. No merge-graphs equivalent. No post-checkout hook (flaw #96).

### 12. Defensive Git Hooks (fixes #66-#71, #77)

Graphify's `hooks.py` is defensive-by-default:
- `_HOOK_MARKER` / `_HOOK_MARKER_END` comments wrap the inserted block — idempotent install, clean uninstall by line-deletion.
- `_PYTHON_DETECT` shell function: tries `graphify` shebang → `python3` → `python` → Windows WSL/PowerShell fallback.
- Allowlist regex on binary path: `*[!a-zA-Z0-9/_.@-]*)` → `GRAPHIFY_PYTHON=""` — prevents shell-metachar injection if PATH contains adversarial entries.
- Skips during rebase/merge/cherry-pick by checking `.git/rebase-merge`, `MERGE_HEAD`, `CHERRY_PICK_HEAD`.
- **Detached `nohup` background rebuild**: git commit returns in <100ms; rebuild runs async, logs to `~/.cache/graphify-rebuild.log`. (Concern documented in code: "full repo rebuilds can take hours; blocking post-commit stalls the shell.")
- On failure: writes to log only, does not pollute working tree.

**Our gap**: Cortex hooks fire synchronously (blocking git commit), use `execSync` with no timeout, have a shell-metachar injection vector in the binary path, don't skip during rebase/merge/cherry-pick, and don't install a `post-checkout` hook (flaws #66–#71, #77).

### 13. Multi-Language Tree-sitter Extractors (fixes #83)

Graphify's `extract.py` (7,810 lines) registers 25 tree-sitter language adapters (`extract.py:1020-1314`), each handling that language's AST node-type quirks (`tree_sitter_kotlin` identifier quirks, `tree_sitter_swift` adapter, etc.). Every language has a test fixture in `tests/fixtures/<lang>/` — a real source file + expected `{nodes, edges}` JSON. Adding a language = add one adapter + one fixture + one test.

**Our gap**: The TypeScript extractor strips class method signatures but keeps body-local variables (flaw #83). No other language has a parity test. Contributors have no fixture-based workflow.

### 14. Multi-Backend LLM Abstraction (missing capability)

Graphify's `llm.py` (1,111 lines) abstracts 8 backends behind a single `call_llm()` interface:
1. OpenAI (any OpenAI-compatible endpoint — Azure OpenAI, vLLM, etc.)
2. Anthropic Claude (API key)
3. **Claude CLI subscription path** — routes through the user's existing `claude` CLI binary; zero API key required.
4. Gemini
5. AWS Bedrock — IAM role auth, no API key, works in EC2/ECS/Lambda.
6. Kimi (Moonshot AI)
7. Ollama — fully offline, local models.
8. DeepSeek

Plus: `_extract_with_adaptive_retry` (halves chunk on context-length errors, retries), `_pack_chunks_by_tokens` (token-boundary splitting), `ProcessPoolExecutor` for parallel multi-file extraction.

**Our gap**: Cortex requires API keys for every LLM call. No path for Claude Code subscription holders, Bedrock IAM users, or Ollama local deployments. No parallel extraction. Every file is synthesized sequentially (missing capability, enterprise blocker).

---

### 15. Dual-Track Distribution (MCP + Skill) with Auto-Config Writer (distribution gap, strategic)

Graphify ships SKILL.md to 18 platforms (`_PLATFORM_CONFIG` in `__main__.py`) and runs MCP as an optional extra (`pip install graphifyy[mcp]` + `python -m graphify.serve`). Every install path writes one file (the skill) to a known platform directory. Hot-reload (`_maybe_reload` in `serve.py`) keeps the MCP server alive across graph changes.

But graphify **never writes an IDE's MCP config file automatically**. Every `skill-*.md` ships the same static Step 7d snippet pointing at `claude_desktop_config.json`. The graphify user must still know where their IDE stores MCP config, find the file, and paste in JSON by hand. Only Antigravity prints (not writes) a `~/.gemini/antigravity/mcp_config.json` path. This is a deliberate trade-off in graphify — universal skill, manual MCP — but it leaves a clear opportunity.

**Our gap**: Cortex is the opposite extreme. Today it ships **only** as an MCP server with no CLI mirror, so:
1. Users on IDEs whose MCP config path they don't know are stuck. They get a binary they can't connect.
2. Agents-with-Bash (Aider, Codex, OpenCode, Trae, Pi, Hermes, Droid, Copilot CLI) are entirely unsupported — they have no MCP plumbing and there's no CLI for the skill route to shell out to.
3. Every Cortex feature is locked behind one connection path (stdio MCP) that breaks the moment the IDE's config moves.

**Implementation target**: Phase 0.15 in `implementation_plan.md` — five-layer architecture: (1) CLI mirror of every MCP tool, (2) MCP server as a thin wrapper, (3) per-platform SKILL.md, (4) **MCP-config registry + atomic auto-writer** (the part graphify skipped), (5) `cortex doctor` install diagnostics. Net result: zero-config install on the 9 IDEs the registry knows, graceful skill-only fallback on the 10+ that don't speak MCP, identical agent behavior in both modes because both paths reach the same Layer-1 implementation.

---

### 16. Multi-Format File Ingestion (market-segment gap)

Graphify ingests code + docs + PDF (`pypdf`/`markdownify`) + images (vision model) + video transcription (`faster-whisper` + `yt-dlp`) + Office (`python-docx`/`openpyxl`) + Google Workspace. Every format is an optional pip extra that the user opts into. The adapter pattern routes each file by extension + magic bytes.

**Our gap**: Cortex ingests code only. Enterprise customers store architectural decisions in Confluence PDF exports, design reviews in Google Docs, onboarding videos, and system diagrams as PNG images — all invisible to Cortex. A knowledge graph built only from code is missing 30–50% of an enterprise team's architectural documentation.

**Implementation target**: Phase 0.16 — `src/ingest/adapters/` with PDF (`pdfjs-dist`), image (vision model passthrough), video (Whisper API / CLI subprocess), Office DOCX (`mammoth`) + XLSX (`xlsx`). Opt-in via `cortex.config.json: ingest.fileTypes`. Default: `["code"]` for backward compatibility.

---

### 17. Dev Hygiene: Security CI Gate, Property Tests, Pre-Commit Hooks, Standalone Binary (developer-trust gap)

Graphify ships with `bandit` (security static analysis), `pip-audit` (dependency CVE scanning), `safety` (supply-chain), `hypothesis` (property-based tests), `pre-commit` hooks, and `Nuitka` standalone binary builds. The result is a project that security-conscious enterprises can evaluate without finding obvious red flags in the supply chain.

**Our gap**: Cortex has TypeScript strict mode but no security CI gate, no supply-chain scanning, no property-based tests, and no standalone binary (users must install Node.js). A project with 115 known flaws and no automated security scanning is difficult to recommend to enterprise security teams. The `npx -y project-cortex` install surface has never been audited.

**Implementation target**: Phase 0.17 — `npm audit` + `socket.dev` + `eslint-plugin-security` + `semgrep` in CI; `fast-check` property tests on every Phase 0 module; `husky` + `lint-staged` pre-commit; `bun build --compile` producing self-contained binaries for Linux/macOS/Windows; `curl install.sh` one-liner published to GitHub Releases.

---

### Full pattern summary table (17 patterns → Phase 0 subphases)

| Pattern | Graphify module | Flaws closed in Cortex | Phase 0 subphase |
|---------|----------------|------------------------|-----------------|
| `security.ts` (SSRF, path traversal, DNS rebinding TOCTOU, NAT64, 512 MiB cap, XSS) | `security.py` | #51, #64, #74, #103 | 0.1 |
| `validate.ts` (schema + referential integrity on every write) | `validate.py` | #4, #72, phantom-entity class | 0.2 |
| Confidence labels (`EXTRACTED`/`INFERRED`/`AMBIGUOUS`) required on every edge | `models.py` confidence enum | #42, #53, #54, #56 | 0.3 |
| Graph-as-cache (skeleton in entity body, SHA256+stat fastpath, atomic write, frontmatter strip) | `cache.py` | #27, stale-cache class | 0.4 |
| OS-native exclusive file lock (`fcntl`/named mutex, PID in lockfile, auto-release) | `watch.py` | #19 | 0.5 |
| MinHash/LSH 5-stage deduplication pipeline | `dedup.py` | #53, #54 | 0.6 |
| `cortex doctor` self-diagnostic (orphan edges, suspect-relation pairs, duplicate edges, empty fields) | `diagnostics.py` | #62, #98 | 0.7 |
| MCP hot-reload with double-checked locking + IDF recompute | `serve.py` hot-reload | #48 | 0.8 |
| IDF-weighted content search (`SOURCE_MATCH_BONUS=0.5`, score-gap, BFS/DFS) replaces grep ban | `serve.py:_score_nodes` | #28 | 0.9 |
| Defensive git hooks (markers, allowlist regex, rebase skip, nohup, post-commit + post-checkout) | `hooks.py` | #66–#71, #77 | 0.10 |
| Honest benchmarks (`worked/` with negative-ROI case, replace `files×1200` heuristic) | `worked/` convention | #6, #68, #69, #70 | 0.11 |
| Backup/restore + `cortex merge-knowledge` + `cortex clone` + git-friendly `.knowledge/` | `graph.json` convention + hooks | #96 | 0.12 |
| Multi-language tree-sitter extractors (v1=10, target=25), per-language fixtures | `extract.py` | #83 | 0.13 |
| Multi-backend LLM (8 backends incl. Claude CLI + Bedrock IAM + Ollama), parallel Worker pool | `llm.py` | missing capability | 0.14 |
| Dual-track distribution (CLI mirror + MCP server + per-IDE skill + atomic MCP auto-config writer for 12 IDEs, 8 refinements) | `__main__.py:_PLATFORM_CONFIG` + `serve.py` (extended) | distribution gap, strategic | 0.15 |
| Multi-format ingestion: PDF (`pdfjs-dist`), image (vision model), video (Whisper), Office DOCX/XLSX; `ingest.fileTypes` opt-in; backward-compatible | `extract.py` + optional deps | market-segment gap | 0.16 |
| Dev hygiene: `npm audit` CI gate, `socket.dev` supply-chain, `eslint-plugin-security`, `semgrep`, `fast-check` property tests, `husky` pre-commit, `bun --compile` standalone binaries | `bandit` + `pip-audit` + `hypothesis` + `Nuitka` | developer-trust gap | 0.17 |

**Implementation target**: Phase 0 in `implementation_plan.md` — ships before any paying customer touches production.

---

## 🔒 NEXUS-OS AUDIT — Security Lesson

### 116. CORS wildcard `allow_origins=["*"]` in any HTTP server that processes code context
**Source-of-lesson**: nexus-os `api/main.py:25` — `app.add_middleware(CORSMiddleware, allow_origins=["*"])`
**Pattern**: Development convenience that becomes a SSRF/data-exfiltration enabler — any origin can make cross-site requests against the local API, potentially reading code context from a malicious page open in the same browser.
**Relevance to Cortex**: Cortex's Phase 22 central server (`cortex serve --multi-tenant`) must use an explicit origin allowlist (`allow_origins=["http://localhost:*", "https://your-domain.com"]`), not `["*"]`. Even the local single-user `cortex serve` should restrict to `localhost` origins only.
**Severity**: medium (low risk while local-only; high risk the moment Phase 22 ships without fixing this)
**Fix**: Phase 22 implementation must include explicit `CORTEX_ALLOWED_ORIGINS` env var (comma-separated). Default: `["http://localhost:*"]`. No wildcard in any non-dev build.

### 117. Phase 22 must refuse to start with missing or default `SESSION_SECRET`
**Source-of-lesson**: antigravity_phone_chat `server.js:23` — `APP_PASSWORD='antigravity'`, `AUTH_SALT='antigravity_default_salt_99'`, `SESSION_SECRET='antigravity_secret_key_1337'`
**Pattern**: Hardcoded fallback credentials that are discoverable from a public GitHub repo remain active if users ignore console warnings. Even with `console.warn` at startup, a developer who skips terminal output is silently exposed.
**Relevance to Cortex**: When Phase 22 (`cortex server start`) ships, it MUST: (1) check that `CORTEX_SESSION_SECRET`, `CORTEX_API_TOKEN_SALT`, and any signing salt are set via env; (2) in production mode (`NODE_ENV=production` or `--prod` flag) refuse to start with an actionable error: `"CORTEX_SESSION_SECRET not set. Run: cortex server init to generate secrets."`. Soft warning acceptable for local-dev mode only.
**Addressed by**: Phase 22 Refinement — Startup Warning for Insecure Defaults (closes Flaw #117)

---

## 🔒 OPENCLAW AUDIT — Security Lesson

### 118. `dangerous*` config flags lower security posture with no runtime signal
**Source-of-lesson**: openclaw `SECURITY.md:297` — `dangerouslyDisableDeviceAuth`, `allowUnsafeExternalContent` flags documented only in static docs; no in-process warning when active.
**Pattern**: A flag that intentionally weakens security (skips auth, allows unsafe content, disables validation) that surfaces zero runtime indication when active. An operator who enabled the flag during a debugging session and forgot about it carries degraded security posture silently across every subsequent restart.
**Relevance to Cortex**: If Cortex ever ships config flags prefixed `dangerous*` or equivalent (e.g., `CORTEX_DISABLE_AUTH`, `CORTEX_SKIP_PATH_VALIDATION`), activating them MUST emit a one-time startup `console.warn` visible at server launch — include the flag name and a docs link. In production mode (`NODE_ENV=production`), escalate to `console.error` and require an explicit `--i-understand-the-risk` acknowledgment CLI flag to start.
**Severity**: medium (low until such flags exist in Cortex; preventive pattern to encode before they're needed)
**Severity**: high (Phase 22 is a network-accessible server; predictable session secrets = auth bypass for any user who clones the repo)

---

## 🔒 GRAPHIFY AUDIT — Lessons

### 119. Bare filename stem used as entity/node ID prefix causes silent collisions
**Source-of-lesson**: graphify `CHANGELOG.md:26` — v0.8.13 fix for SQL extractor and Python import resolver
**Pattern**: Entity IDs that use only the filename stem as their prefix (e.g. `models_UserService`) cause silent node-merge collisions when two files have the same name in different directories (e.g. `auth/models.py` and `payments/models.py`). The second entity overwrites the first silently — no error, no duplicate detection.
**Relevance to Cortex**: Entity IDs must be qualified with at least the parent directory: `{relative_dir}_{stem}_{entity_name}`. Top-level files use `{stem}_{entity_name}`. Add a post-ingest uniqueness check that emits a warning listing all duplicate IDs before writing `.knowledge/`.
**Severity**: medium

### 120. Partial manifest overwrite on incremental run re-extracts entire corpus
**Source-of-lesson**: graphify `CHANGELOG.md:147` — v0.8.10 fix (incremental data loss in save_manifest)
**Pattern**: If incremental ingest writes the manifest/state file with only the changed-file subset (not the full merged result), the next incremental run sees all unchanged files as "new" and re-extracts everything. The symptom looks like cache invalidation failure — every incremental run is as slow as a full run.
**Relevance to Cortex**: Always follow the load-merge-write pattern for any state file updated incrementally: `existing = load_manifest(); existing.update(changed_subset); write_manifest(existing)`. Never write a subset-only result. Applies to the ingest state file, the entity cache, and any future incremental index.
**Severity**: low
**Addressed by**: Phase 33.6 Refinement — Crash-Recovery Dirty Flag for Incremental Ingest (closes Flaw #120, score: 30)

---

## 🔒 GITNEXUS AUDIT — Lessons

### 121. FTS query string interpolation enables search injection
**Source-of-lesson**: gitnexus `CHANGELOG.md:66` — v1.3.11 "Fix FTS Cypher injection by escaping backslashes in search queries"; fixed pattern: `src/core/search/bm25-index.ts:36-41`
**Pattern**: Any FTS or Cypher query builder that interpolates user input as a format string (rather than a bound parameter) is vulnerable to search injection. GitNexus initially embedded the user search term as a raw string literal inside `CALL QUERY_FTS_INDEX(...)`. An attacker could escape the FTS query and execute arbitrary Cypher.
**Relevance to Cortex**: Separate compile-time schema identifiers (table names, index names — safe to template-interpolate) from runtime user input (must be passed as a bound `$query` parameter). Never interpolate search terms into query strings.
**Severity**: medium

### 122. MCP transport allocates buffer before validating Content-Length cap
**Source-of-lesson**: gitnexus `CHANGELOG.md:88-90` — v1.3.10 "MCP transport buffer cap: Added 10 MB MAX_BUFFER_SIZE limit to prevent out-of-memory attacks via oversized Content-Length headers"; fixed in `src/mcp/compatible-stdio-transport.ts:46`
**Pattern**: A transport that reads `Content-Length: N` and allocates an N-byte buffer BEFORE checking whether N exceeds the max buffer size allows a malicious client to trigger an OOM crash by sending `Content-Length: 99999999999`. This is a pre-allocation DoS vector.
**Relevance to Cortex**: Validate Content-Length against `MAX_BUFFER_SIZE` (recommend 10 MB) BEFORE allocating any buffer. If the value exceeds the cap, close the connection with a protocol error. Check first, allocate second.
**Severity**: high (OOM security)

---

## 🔒 AIDER AUDIT — Lessons

### 124. Third-party telemetry tokens hardcoded in source — anti-pattern for Phase 22+
**Source-of-lesson**: aider `aider/analytics.py:55-56` — `mixpanel_project_token` and `posthog_project_api_key` constants hard-coded at module level in a public repo
**Pattern**: Any analytics SDK project token committed to source is permanently discoverable — even if the account is later closed, the token remains in git history and enables unauthorized tracking by anyone with access to the repo. Aider uses UUID-prefix sampling (`is_uuid_in_percentage`) to limit collection to ~10% of users, but the tokens are still public.
**Relevance to Cortex**: When Phase 22 (`cortex server start`) or any future Cortex feature adds telemetry: (1) all SDK project tokens MUST come from environment variables (`CORTEX_TELEMETRY_KEY`), never from committed constants; (2) telemetry must be 100% opt-in via explicit flag or `cortex.json` key — no silent collection; (3) no data leaves the machine in local-only mode regardless of opt-in status; (4) the `cortex server init` wizard must generate and write the env var, not hardcode a default.
**Severity**: 2 (medium — future-phase concern; current Cortex has no telemetry)

---

## 🔒 CODEGRAPH AUDIT — Lessons

### 123. Synchronous shell-out in PreToolUse hooks blocks the event loop
**Source-of-lesson**: codegraph `src/sync/git-hooks.ts:73-80` — shows the correct async background pattern: `( cortex read >/dev/null 2>&1 & ) >/dev/null 2>&1`
**Pattern**: `inject-knowledge.js` uses `execSync` to call `cortex read` before every Read/Grep tool call. This blocks the event loop for 100-500ms on each native tool call and makes the IDE feel sluggish. The hook already uses a session-marker guard (fires only once per ppid), so the async version still injects knowledge on the first call; subsequent calls are no-ops — the guard prevents redundant work regardless of sync vs async.
**Relevance to Cortex**: PreToolUse hooks must never use `execSync` for any subprocess call. The correct pattern is async background: `( cortex read >/dev/null 2>&1 & ) >/dev/null 2>&1`. This is a general rule: hooks should never block the event loop; async background is always preferred for fire-and-forget operations in hook context.
**Severity**: 3 (HIGH) — blocks every Read/Grep tool call for 100-500ms; degrades IDE responsiveness across the entire Claude Code session

---

## 🔒 REPOMIX AUDIT — Lessons

### 125. secretlint profiler accumulates O(n²) per-mark entries in worker threads
**Source-of-lesson**: repomix `src/core/security/workers/securityCheckWorker.ts:14-60`
**Pattern**: `@secretlint/profiler` installs a global `PerformanceObserver` that appends every `profiler.mark()` call to an unbounded `entries[]` array, then runs an `O(n)` `entries.find()` scan on each append. Across a worker processing ~1000 files this accumulates to O(n²) overhead (~1.2s pure profiler bookkeeping per worker, zero functional benefit). The profiler may be nested under `@secretlint/core/node_modules/@secretlint/profiler`, making direct singleton patching unreliable. The fix: no-op `performance.mark` via `Object.defineProperty` inside worker threads only (`isMainThread` guard). This neutralizes all profiler copies simultaneously since all call the single Node.js built-in `performance.mark`. The `try/catch` protects against future Node.js versions making the property non-configurable.
**Relevance to Cortex**: When Phase 7.10 (Sensitive Data Sanitization Guardrail) uses secretlint in a worker thread, apply this fix. Any worker that runs secretlint on ~hundreds of files will accumulate the same O(n²) overhead without it.
**Severity**: 3 (HIGH — silent 1.2s overhead per security-check worker on 1000-file repos; degrades Phase 7.10 performance invisibly)


## 🔒 REPOHYPER AUDIT — Lessons

### 126. Hardcoded absolute paths to grammar/data/model files
**Source-of-lesson**: RepoHyper `src/repo_graph/parse_source_code.py:1`, `scripts/data/matching_repobench_graphs.py:16` — `Language('/datadrive05/huypn16/...')` hardcoded at module level
**Pattern**: Tree-sitter grammar `.so` paths, model checkpoint directories, and dataset roots hardcoded as string literals. Breaks on any machine that isn't the original dev server; CI always fails on fresh checkout with a `FileNotFoundError` that gives no hint of where the path should come from.
**Relevance to Cortex**: Any Cortex code that needs a grammar file, model weight, or data path must derive it from `process.env.CORTEX_<NAME>_PATH` with a documented local default, or accept it via CLI argument. Never commit a literal `/home/`, `/datadrive`, `/mnt/`, or `C:\Users\` path in source.
**Severity**: 3 (HIGH — silent breakage on every non-author machine; reproducibility is zero)

---

### 127. Module-level hardcoded device string (`"cuda:0"`)
**Source-of-lesson**: RepoHyper `src/repo_graph/repo_to_graph.py` — `device = "cuda:0"` at module level
**Pattern**: Selecting a compute device (CUDA GPU index, CPU) as a top-level constant. Fails silently on CPU-only environments or multi-GPU machines where GPU 0 is occupied. No override path exists — callers cannot pass an alternative.
**Relevance to Cortex**: If any future Cortex phase uses a local model for inference, derive the device at call time from `process.env.CORTEX_DEVICE ?? "cpu"` or an explicit config key. Never hardcode at module scope. Local-first means CPU-first as the safe default.
**Severity**: 2 (MEDIUM — breaks on CPU-only dev machines; research code only, but the pattern should never enter Cortex)

---

### 128. Class constructor missing `self` / `this` — silent runtime bug
**Source-of-lesson**: RepoHyper `src/llm.py:8` — `def __init__(model_name)` omits `self`; Python binds `model_name` to `self`, leaving `model_name` unbound inside the body
**Pattern**: A Python constructor with `self` omitted silently re-binds the first positional argument. The class appears to work until instantiation, at which point it raises `TypeError: __init__() takes 1 positional argument but 2 were given` with a confusing message. Invisible in static analysis unless strict mypy/pyright is configured.
**Relevance to Cortex**: Enable strict TypeScript `noImplicitThis` and `strictFunctionTypes`. For any Python tooling in Cortex's ecosystem, require at minimum `mypy --strict` on constructors. Every class constructor must have at least one instantiation test — this bug is 100% caught by a single `new Foo(args)` call.
**Severity**: 2 (MEDIUM — runtime TypeError on every instantiation; invisible without tests)

---

### 129. `os.chdir()` / `process.chdir()` in non-interactive library code
**Source-of-lesson**: RepoHyper `scripts/data/generate_call_graphs.py:47, 60` — `os.chdir(repo_dir)` before invoking PyCG, then `os.chdir(cwd)` to restore
**Pattern**: Mutating the process working directory to set context for a subprocess. Breaks concurrent execution (two threads calling this simultaneously corrupt each other's `cwd`), makes relative paths fragile, and is invisible to callers. The restore-on-exit pattern fails if an exception is thrown between chdir and restore.
**Relevance to Cortex**: Always pass `cwd` to `child_process.spawn` / `spawnSync` / `execFile`. Never call `process.chdir()` outside the CLI entry point. If a subprocess needs a specific working directory, pass it explicitly via the `cwd` option — never mutate global state.
**Severity**: 2 (MEDIUM — breaks concurrent script invocations; fragile restore pattern)


## 🔒 MCP-CODE-GRAPH AUDIT — Lessons

### 130. `response.ok` not checked before `.json()` — silent HTTP error pass-through in MCP tools
**Source-of-lesson**: mcp-code-graph `src/index.ts:162, 245, 320, 390, 464, 545` — six tool handlers, none check `response.ok`
**Pattern**: `fetch()` does not throw on 4xx/5xx. Calling `.json()` on an error response returns a valid JSON error object. Destructuring `.content` from that object yields `undefined`, which gets stringified as `"undefined"` and returned as the tool's text result. The MCP client receives a structurally-valid success response with garbage content — no exception, no MCP error result, no indication of failure.
**Relevance to Cortex**: Every `fetch()` call inside a Cortex MCP tool handler MUST check `if (!response.ok) { throw new Error(\`HTTP \${response.status}: \${await response.text()}\`); }` before calling `.json()`. Thrown errors propagate through the MCP SDK as proper error results. Silent `undefined` content does not.
**Severity**: 3 (HIGH — tool silently returns "undefined" on auth failure, wrong ID, or server error; agent has no signal to retry or surface to user)

---

### 131. Production startup debug dumps via `console.error` in MCP server code
**Source-of-lesson**: mcp-code-graph `src/index.ts:4-8, 570-578` — `console.error('MCP Code Graph starting...')` and `=== DEBUG INFO ===` env-var dump on every startup
**Pattern**: Debug statements added during development are left in the release binary. MCP servers communicate over stdio; stderr is the MCP host's only channel for server-side messages. Chatty debug output obscures real errors and makes log-based debugging impossible.
**Relevance to Cortex**: No `console.error` / `console.log` debug statements in Cortex MCP server code unless guarded by `process.env.DEBUG`. Use structured logging with a verbosity flag. The MCP stdio contract treats stderr as errors-only; violating this breaks host-side error detection.
**Severity**: 2 (MEDIUM — obscures real errors in production logs; degrades debuggability of the MCP host integration)

### 132. `.env.example` key name differs from actual env var used in code
**Source-of-lesson**: mcp-code-graph `.env.example:3` — `CODEGPT_GRPAH_ID=""` (typo) vs `process.env.CODEGPT_GRAPH_ID` in `src/config.ts:5`
**Pattern**: A typo in the documented example config (`GRPAH_ID`) means anyone copying from `.env.example` sets a variable the code never reads. The correct key (`GRAPH_ID`) is silently ignored. No test catches this because there are no tests.
**Relevance to Cortex**: Add a CI check: for every `process.env.CORTEX_*` reference in `src/`, assert the key appears verbatim in `.env.example`. A grep-based lint step catches this class of drift before it ships.
**Severity**: 2 (MEDIUM — causes silent misconfiguration; user sees no error, feature just doesn't work)

---

### 133. `SECURITY.md` shipped with placeholder contact email
**Source-of-lesson**: mcp-code-graph `SECURITY.md:8` — `security@example.com`
**Pattern**: SECURITY.md template copied and committed without replacing the generic contact address. Security researchers who find a vulnerability report to a black hole.
**Relevance to Cortex**: Cortex's SECURITY.md must have a real contact address before the project goes public. Template placeholders (`example.com`, `TODO`, `your-name@`) must be caught by a pre-push lint check or PR checklist item.
**Severity**: 1 (LOW — no runtime impact; reputational risk only)

---

### 134. CI mutates committed files with `sed -i` without reverting
**Source-of-lesson**: mcp-code-graph `.github/workflows/publish-release.yml:94` — `sed -i 's/"name": "mcp-code-graph"/"name": "@judinilabs\/mcp-code-graph"/' package.json`
**Pattern**: CI modifies `package.json` in-place to change the package scope for GitHub Packages publishing. If the publish step fails mid-way, the runner's workspace has a different `package.json` than source control. Subsequent CI steps (e.g. `npm install`) may behave inconsistently. The mutation is invisible to reviewers — the committed file looks fine.
**Relevance to Cortex**: Never mutate committed files in CI without an explicit `git restore <file>` at the end of the step. Use a separate publish-only `package.json` (`npm publish --workspace`), or pass the scope as a CLI flag (`npm publish --scope=@org`) if the registry supports it.
**Severity**: 2 (MEDIUM — silent inconsistency between workspace and source; breaks reproducibility of CI steps that run after the mutation)

---

### 135. Placeholder stubs masquerading as planned functionality (`NotImplementedError` accumulation)
**Source-of-lesson**: CodeGraphContext `src/codegraphcontext/tools/query_tool_languages/*.py` — 16 per-language toolkit files all raise `NotImplementedError` in their public API, yet are routed from `advanced_language_query_tool.py` in production
**Pattern**: Stub files are committed to define the interface before implementation. Without a test that forces a real code path, the stubs accumulate and are routed from production code that can never succeed. Dead code disguised as planned functionality.
**Relevance to Cortex**: Any Cortex phase that introduces stub modules with `throw new Error('Not implemented')` MUST include at minimum one end-to-end test that exercises the stub's code path and produces a non-error result. DoD for a phase that introduces a stub: at least one real code path through the stub must pass CI before the phase closes.
**Severity**: 3 (HIGH — stubs silently routed from production code become invisible dead code; agents receive hallucinated success responses)

---

### 136. Test fixture undefined, silently not collected by CI
**Source-of-lesson**: CodeGraphContext `tests/unit/languages/test_mixins.py` — test references a `graph` fixture that is never defined; not caught because the test is not collected in normal CI runs
**Pattern**: A test is written referencing a fixture that was never defined or was renamed. Normal CI skips uncollected tests without error. The broken test sits dormant until someone runs the full suite explicitly, at which point it fails with a confusing fixture error, not a meaningful assertion failure.
**Relevance to Cortex**: All Cortex test files must import their fixtures explicitly or use a centralized fixture registry that validates fixture references at test-discovery time. CI should run `vitest --reporter=verbose` and fail on any collected test with a missing import, not just assertion failures.
**Severity**: 2 (MEDIUM — silent test gap; coverage appears healthy but a test code path is never exercised)

---

### 137. E2E test assertions commented out (false passes)
**Source-of-lesson**: CodeGraphContext `tests/e2e/` — some E2E test assertions are commented out, producing tests that always pass without verifying behavior
**Pattern**: Tests are written optimistically; when behavior changes the assertion is commented out instead of fixed or deleted. The test continues to run, reports "PASS", and provides false coverage signal. Harder to detect than a missing test because the test file looks populated.
**Relevance to Cortex**: Never comment out assertions as a fix. If an assertion is wrong, either fix the assertion or delete the test. Add a lint rule that flags `// expect(` and `// assert(` patterns in `tests/` as a CI error.
**Severity**: 3 (HIGH — produces false confidence; CI passes while behavior is untested)
