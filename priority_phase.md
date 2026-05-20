# Cortex Priority Phases — Monetization-Aligned Roadmap

> **Purpose**: A dependency-aware, monetization-tier-aligned ordering of every phase in [implementation_plan.md](implementation_plan.md). Tells you **what to ship first, what to defer, and which tier of buyer each phase unlocks** — without breaking any phase's Definition of Ready.

---

## TL;DR — The Top-Level Sequence

If you have limited bandwidth, ship in this order. Each tier's revenue ceiling depends on the prior tiers being live:

1. **T0 — Production-Critical** (P0 bug fixes): `33-MVP` *(✅ Phase 6 already complete)*
2. **T1 — Free Tier** (drives adoption, $0 ARPU): ✅ `7` done → `7.5` → `7.10` → `5.6` → `8` → `10` → `10.2` → `10.3` → `10.4` → `10.5` → `10.6` → `10.7`
3. **T2 — Indie Pro** ($10-50/mo): `9` → `13` → `13.3` → `13.4` → `13.5` → `13.6` → `13.7` → `14` → `33.1` → `33-Full` → `33.2`
4. **T3 — Team/Startup** ($500/seat, 5-50 seats): `11` → `12` → `12.10` → `12.11` → `12.12` → `12.13` → `12.14` → `21` → `22` → `23` → `28` → `30`
5. **T4 — Mid-Market** ($1500/seat, 50-500 seats): `25` → `26` → `26.1` → `26.3` → `29` → `31` → `32.1`
6. **T5 — Enterprise** ($100K-$1M ACV): `24` → `27` → `26.2` → `26.4` → `29.1` → `29.2` → `25.1` → `32` → `32.2`
7. **T6 — Cortex Pro Add-Ons** (separate paid SKUs): Pro Modules 1-6 (in customer-demand order)
8. **T7 — Cortex+Nexus Bundle** (Extended Vision): `40` → `41` → `42` → `43` → `43.x` → `44` → `45`

**Parallel research track (drives differentiation, not directly monetized)**: 15, 16, 17, 18, 19, 20-20.24. Most slot in alongside T2-T5; some unlock T6+ Pro Modules.

---

## Status Snapshot

| Bucket | Count | Notes |
|---|---|---|
| ✅ Done | 18 | Phases 1, 2, 3, 4, 4.5, 5, 6, 7, 7.5, 8, 9, 10, 13, 13.1, 13.2, 13.3, 13.4, 13.5 (verified 2026-05-20) |
| 🚧 In Progress | 0 | None |
| ⏳ Planned — Tier-Critical | ~20 | Customer-facing phases driving each tier upgrade |
| ⏳ Planned — Research-Grade | ~23 | Phases 14-20.24, drive differentiation |
| ⏳ Planned — Enterprise | ~17 | Phases 22-32 family |
| ⏳ Planned — Extended Vision | ~10 | Phases 40-45 family (Cortex+Nexus bundle) |
| ⏳ Pro Add-On Modules | 6 | Productized as separate SKUs |

---

## The 8 Monetization Tiers

### T0 — Production-Critical (P0, blocks every tier)

**Goal**: Fix the shipped bootstrap bug that prevents Cortex from being usable on any non-trivial codebase. Without this, no tier above can sell.

**Phases (in order)**:

| # | Phase | Why P0 | Effort | Status |
|---|---|---|---|---|
| 1 | **Phase 33-MVP** (a stripped Deep Bootstrap) | Production bug: 1800-file project produced 4 entities. Adoption-blocker. | Medium (2-4 weeks) | ⏳ Planned |
| 2 | **Phase 6** — complete (Active Guardrail) | Foundation for every later guardrail/policy phase. | Done | ✅ **Done 2026-05-19** |

**Phase 33-MVP scope clarification**: Phase 33 in `implementation_plan.md` lists Phase 14, 20.9, 20.10, 13 as dependencies. The **MVP variant ships without these** by substituting:
- Phase 14 clustering → **simple directory-bucket clustering** in Phase A
- Phase 20.9 Leiden → **trivial component detection** (BFS connected components)
- Phase 20.10 PPR → **simple BFS centrality** (in-degree as proxy)
- Phase 13 cost simulator → **char-count heuristic** instead of `tiktoken`

This ships the **autonomous output-budget-aware wave engine, two-tier synthesis, IDE/daemon dual execution, and 60+ entities on a 1800-file project** — without depending on the research-grade phases. Phase 33-Full (with 14, 20.9, 20.10, 13 enhancements) lands later in T2.

---

### T1 — Free Tier ($0 ARPU, drives adoption)

**Goal**: Make Cortex genuinely useful out-of-the-box so a solo developer downloads it, gets value in 10 minutes, and tells others. This is the **GitHub stars + organic growth** tier.

**Phases (dependency-ordered)**:

| Order | Phase | Why this tier | Unlocks | Status |
|---|---|---|---|---|
| 1 | **Phase 7** — Audit & Traceability | Trust ground truth: users see what Cortex changed and why | Required by 7.5, 16, 18, 20.x, 26 | ✅ **Done 2026-05-19** |
| 2 | **Phase 7.5** — Knowledge Quality Foundation | Quality scoring + org-constraint DSL — even free users get quality signal | Required by 21, 23, 24, 26.2 | ✅ **Done 2026-05-19** |
| 2.1 | **Phase 7.6** — Global Architectural Lessons & Retrospective Log | Centralized lessons.md dashboard to avoid repeating historical code errors | Phase 7.5 ✓ | ⏳ Planned |
| 2.2 | **Phase 7.7** — Automated Technical Debt Register | Automatically logs architectural smells and constraint violations to DEBT.md | Phase 7.5 ✓ | ⏳ Planned |
| 2.3 | **Phase 7.8** — Graph-Driven Review Advisories & Untested Hub Analysis | Auto-generated review questions for AI assistants to prevent fragile coupling | Phase 7.5 ✓, Phase 10 | ⏳ Planned |
| 2.4 | **Phase 7.10** — Sensitive Data & API Secret Sanitization Guardrail | Scans and redacts credentials before LLM ingestion and local storage | Phase 7.5 ✓ | ⏳ Planned |
| 3 | **Phase 5.6** — Daemon Watchdog & Self-Healing | Free tier reliability — daemon doesn't silently die | Required by 5.7, 5.8 | ⏳ Planned |
| 4 | **Phase 8** — Visual Knowledge Graph | First "wow" demo for new users; Mermaid graph rendering | Required by 13, 22, 33.2 | ✅ **Done 2026-05-19** |
| 5 | **Phase 10** — Onboarding & Guided Reading | "What does this codebase do?" answer — for new hires + new users | Required by 13 | ✅ **Done 2026-05-19** |
| 5.1 | **Phase 10.2** — Smart Rule File Patching | Automatically inject index location and brevity instructions in .cursorrules | Phase 10 ✓, Phase 13.2 | ⏳ Planned |
| 5.2 | **Phase 10.3** — Zero-Token Startup & AI Ignore Scaffolding | Configure ignore files to prevent auto-loading `.knowledge/` at startup | Phase 10 ✓ | ⏳ Planned |
| 5.3 | **Phase 10.4** — Managed `CLAUDE.md` & AI Rules Orchestration | Create/patch `CLAUDE.md` to guide AI on using MCP tools and commands | Phase 10.3 | ⏳ Planned |
| 5.4 | **Phase 10.5** — Attention-Curve Rule Reordering & Position Optimization | Relocates critical rules (MUST, NEVER) to high-attention zones of files | Phase 10.4 | ⏳ Planned |
| 5.5 | **Phase 10.6** — Compaction-Safe Decision Anchoring & Continuity Breadcrumbs | Injects active tasks and last 3 decisions into startup prompt pointers | Phase 10.3 | ⏳ Planned |
| 5.6 | **Phase 10.7** — Rules File Size Guardrail & Auto-Splitting | Emits lint warning when rules exceed 200 lines and splits into on-demand files | Phase 10.4 | ⏳ Planned |
| 6 | **Phase 4.6** — Developer API & Client SDKs | Programmatic client access for custom workflows, scripts, and hooks | Unlocks automation | ⏳ Planned |
| 6.1 | **Phase 4.8** — Persona-Specific MCP Prompts | Exposes filtered graph views and design rules matching target AI personas | Phase 7.5 ✓ | ⏳ Planned |

**Why this order**: 7 → 7.5 because quality scoring builds on audit. 5.6 in parallel (no deps). 8 → 10 because onboarding consumes the graph.

**Phase 7 verified at 2026-05-19**: all DoD items met, 12 dedicated tests passing — `log.jsonl` dual-emit with embedded state snapshot, evidence redaction with 6 regex patterns, lint (cycle + orphan + silo + god_module + missing_source + contradiction_heavy), evolution replay with state snapshots, `--since` accepts ISO date OR git commit hash with graceful warning on unresolvable tokens. CLI commands and MCP tools (`log_query`, `audit_evidence`, `lint`, `evolution_entity`) all live.

**Phase 7.5 verified at 2026-05-19**: all DoD items met, 42 dedicated tests passing — `computeQuality()` 5-dimensional pure function, quality badge on `index.md` + per-entity page footer, `human_reviewed`/`reviewed_by` persisted and preserved across re-synthesis, `cortex audit quality` CLI with bottom-decile flagging + `CORTEX_QUALITY_GATE` exit code, `cortex review accept/reject` CLI, `get_entity_quality` MCP tool, `lowQualityCount` in `get_cortex_status`, `cortex.constraints.json` loader (JSON not YAML) with glob matcher, `OrgConstraintEvaluator` with `mustNotImport`/`requiresEvidence`/`requiresConstraint` rules, error-severity blocks `save_synthesis`, warning-severity surfaces in `cortex lint` as `org_constraint` category, malformed constraint file degrades gracefully.

**Tier outcome**: a solo dev runs `cortex bootstrap`, sees a graph, gets a guided tour, trusts the audit log, and recommends Cortex on Reddit/HN. Acquisition cost = zero. **This tier is the moat for everything above.**

---

### T2 — Indie Pro ($10-50/mo per solo dev)

**Goal**: First paid tier. Features that justify a solo dev paying $20/month: pre-change analysis, cost transparency, mobile monitoring, provider flexibility, smart suggestions.

**Phases (dependency-ordered)**:

| Order | Phase | Why this tier | Dependencies |
|---|---|---|---|
| 1 | **Phase 9** — Refactoring Impact Preview | "Before I make this change, what will break?" — high willingness to pay | Phase 6 ✓ | ✅ **Done 2026-05-19** |
| 1.1 | **Phase 9.1** — Dependency Path Querying | "How are these two modules connected?" — path highlighting | Phase 9 ✓ | ⏳ Planned |
| 2 | **Phase 13** — Token Economics & Context Packs | Indie devs care about LLM bill; `cortex test-cost` is a $20/mo feature alone | Phase 8 (T1) | ✅ **Done 2026-05-19** |
| 2.05 | **Phase 13.1** — Dense & Raw Projections | Multi-provider tokenizer multipliers + full-file raw simulated baseline and ROI projections | Phase 13 ✓ | ✅ **Done 2026-05-20** |
| 2.1 | **Phase 3.1** — LLM Caching Store | Sub-second cached response and zero-token consumption for identical prompts | Phase 3 ✓ | ⏳ Planned |
| 2.2 | **Phase 8.1** — Live Graph Stream | Live WebSocket graph updates and transitions in the browser web UI | Phase 8 ✓ | ⏳ Planned |
| 2.3 | **Phase 13.2** — Cortex Brevity Engine & Telegraphic Memory Compression | Save up to 50% token cost by minifying Gemini.md and onboarding docs | Phase 13 ✓ | ✅ **Done 2026-05-20** |
| 2.4 | **Phase 13.3** — Token & Cost Savings Ledger & Analytics | Tracks exact cache hits and compressed tokens saved to show ROI statistics | Phase 13 ✓ | ✅ **Done 2026-05-20** |
| 2.5 | **Phase 13.4** — API Budget Gating & Runaway Safeguards | Hard limits on session spending and sync count to avoid API budget draining | Phase 13.3 ✓ | ✅ **Done 2026-05-20** |
| 2.6 | **Phase 13.5** — Fuzzy Levenshtein & RRF Search Ranker | Typo-tolerant search using Lev-distance and Reciprocal Rank Fusion ranking | Phase 10 ✓ | ✅ **Done 2026-05-20** |
| 2.7 | **Phase 13.6** — Proximity Reranking & Smart Snippets | Boosts adjacent search terms and centers result previews around match window | Phase 13.5 | ⏳ Planned |
| 2.8 | **Phase 13.7** — Hooks-Based Smart Read Cache & AST Skeleton Delta Compression | Intercepts file reads to return diffs and skeletons (Delta Mode & Structure Map) | Phase 10.3 | ⏳ Planned |
| 2.9 | **Phase 13.8** — Persistent Experience & Cognitive Mode-Adaptive Context | Active, local-first co-pilot memory tracking developer preferences, past reverts, and task intent | Phase 13.5 ✓, Phase 13.2 ✓ | ⏳ Planned |
| 3 | **Phase 14** — Large-Diff Clustering | Quality on big refactors — needed to make Phase 33-Full work | Phase 6 ✓, Phase 13 |
| 4 | **Phase 33.1** — Model Provider Registry | Use local Ollama for free; cloud only when needed — direct cost reduction | Phase 33 (T0), Phase 26 partial |
| 4.1 | **Phase 4.7** — OpenAI-Compatible REST Gateway | Proxy local RAG queries to any standard OpenAI-compatible client | Phase 33.1 | ⏳ Planned |
| 4.2 | **Phase 17.1** — Multi-Model Architectural Debate | Structured 3-turn AI design debate for pattern critique and consensus | Phase 33.1 | ⏳ Planned |
| 5 | **Phase 33-Full** — upgrade Bootstrap MVP to use Phase 14, 20.9, 20.10 | Better entity count + quality on the same dollar | Phase 14, 20.9, 20.10 |
| 6 | **Phase 33.2** — Remote Operations & Mobile PWA | Monitor long bootstraps from phone; push notifications | Phase 22 partial, Phase 25 partial |
| 7 | **Phase 20.1** — Architecture Simulation | `cortex simulate remove <entity>` — unique cool feature, viral demo | Phase 8 (T1), Phase 6 |
| 8 | **Phase 20.3** — Design Pattern Suggestion | Lint + suggested-fix; closes the "what should I do?" loop | Phase 7 ✓, Phase 18 (research) |
| 9 | **Phase 20.4** — Fitness Functions | Architecture tests in CI — developer-loved feature | Phase 12 (T3) optional |

**Cross-tier note**: Phase 33.2's "Mobile PWA" requires Phase 22 (Central Server) which is in T3. **Tactical alternative**: ship a local-only PWA that talks to localhost daemon directly (no central server), then upgrade when T3 ships. This unlocks Phase 33.2 in T2 without waiting for T3.

**Tier outcome**: solo devs paying $20-50/mo for the smart features. ARR per customer: $240-600. Hundreds-to-low-thousands of customers at this tier is realistic before T3 features land.

---

### T3 — Team / Startup ($500/seat/month, 5-50 seats per customer)

**Goal**: First real B2B revenue. Multi-developer teams need shared knowledge, CI integration, basic admin. ACV: $5K-$25K per customer.

**Phases (dependency-ordered)**:

| Order | Phase | Why this tier | Dependencies |
|---|---|---|---|
| 1 | **Phase 11** — Monorepo Federation | Same git repo, multiple workspaces — common startup setup | Phase 3 ✓ |
| 2 | **Phase 12** — Git & CI Integration | PR comment with Cortex insights; CI gate; critical for team workflow | Phase 6 ✓, Phase 7 (T1) |
| 2.1 | **Phase 12.2** — Git Pre-Commit Guardrail Hooks | Run lint/audit on commit; block on error constraints or quality drops | Phase 12 |
| 2.2 | **Phase 12.3** — Architecturally Aware Commit Generation | Conventional Commit generation based on changed entities and why | Phase 12 |
| 2.3 | **Phase 12.4** — Diagnostic Run Buffer & Tee Recovery | Capture raw logs on command failure; return compact summaries | Phase 12 |
| 2.4 | **Phase 12.5** — Terminal Command Output Minifier | Smart token-filtering for terminal commands (git, npm test, etc) | Phase 12.4 |
| 2.5 | **Phase 12.6** — Local Command Interception Shims & Agent Rules | Intercept commands inside agent sessions via shims & rule injection | Phase 12.5 |
| 2.6 | **Phase 12.7** — Smart Code Outliner & Signature-Only Reader | Strips code bodies to return outline view of files (JS, TS, Py, Go, Rs) | Phase 12.6 |
| 2.7 | **Phase 12.8** — Log Deduplicator & Web Fetch Parser | Collapses identical log counts; cleans up curl HTML responses to MD | Phase 12.5 |
| 2.8 | **Phase 12.9** — Architectural Graph Diffing | Graph diffing between commits/branches to show structural design changes | Phase 7 (T1), Phase 8 (T1) | ⏳ Planned |
| 2.9 | **Phase 12.10** — Baseline-Driven Quality Gates | Gates PR merges against checked-in quality baseline thresholds in CI/CD | Phase 7.5 (T1), Phase 12 | ⏳ Planned |
| 2.10 | **Phase 12.11** — Architectural Changelog Generator | Generates high-level structural logs between tags for release docs | Phase 7 (T1), Phase 12 | ⏳ Planned |
| 2.11 | **Phase 12.12** — Automated MCP Compliance & Live Integration Suite | CI-runnable JSON-RPC compliance tests verifying tool/resource schema | Phase 12 | ⏳ Planned |
| 2.12 | **Phase 12.13** — Architecturally Aware Commit Scope Linting | Extends commitlint to block commits using non-existent scope entities | Phase 7.5 (T1), Phase 12.3 | ⏳ Planned |
| 2.13 | **Phase 12.14** — Agent Token-Use Discovery & Anti-Pattern Auditor | Scans past session transcripts for tool-bypass/waste behaviors | Phase 12.6, Phase 13 | ⏳ Planned |
| 3 | **Phase 5.7** — Scheduled Operations & Cron Engine | Background scans, automated maintenance | Phase 5.6 (T1) |
| 4 | **Phase 5.8** — Multi-Operator Session Coordination | When 2 devs use Cortex simultaneously, no conflicts | Phase 5.6 (T1), Phase 25 partial |
| 4.1 | **Phase 5.9** — Shell Status Prompt Integration | Output quality score and savings in terminal prompt; cached for speed | Phase 5.6 (T1), Phase 13.2 |
| 5 | **Phase 21** — Polyrepo Federation | Separate git repos, shared knowledge — common team setup | Phase 11, Phase 7.5 (T1), Phase 12 |
| 6 | **Phase 22** — Central Knowledge Server | Org-wide single source of truth; the "real" team product | Phase 21, Phase 8 (T1), Phase 9 (T2) |
| 7 | **Phase 23** — Human-in-the-Loop Review | Senior dev signs off on AI-generated knowledge | Phase 7.5 (T1), Phase 12 |
| 8 | **Phase 28** — Workflow Integrations | Slack/Teams/Jira/GHE — meets team where they live | Phase 22, Phase 25 partial, Phase 26 partial |
| 9 | **Phase 30** — Knowledge Migration | "We have 50K Confluence pages" objection-killer | Phase 18 (research), Phase 2 ✓ |
| 10 | **Phase 30.1** — External AI Conversation Import | Import Claude.ai / ChatGPT / Cursor sessions | Phase 30, Phase 26.1 (T4) |

**Tier outcome**: 50-100 startup customers paying $5K-25K ARR each. Total ARR potential: $250K-$2.5M.

---

### T4 — Mid-Market ($1,500/seat/month, 50-500 seats per customer)

**Goal**: Procurement-eligible enterprise software. SSO is the gate; without it, procurement says no on first read.

**Phases (dependency-ordered)**:

| Order | Phase | Why this tier | Dependencies |
|---|---|---|---|
| 1 | **Phase 25** — Enterprise SSO/SCIM | Table-stakes for any company >500 employees | Phase 22 (T3) |
| 2 | **Phase 26** — RBAC/ABAC + Immutable Audit | SOX/HIPAA/PCI/FedRAMP gate; mid-market security review pass | Phase 25, Phase 22 |
| 3 | **Phase 26.1** — DLP / PII Redaction | Protects knowledge from leaking PII; first-class compliance signal | Phase 7 ✓, Phase 6 ✓, Phase 26 |
| 4 | **Phase 26.3** — OpenTelemetry Export | Cortex visible to SRE/Platform teams via Datadog/Honeycomb/Tempo | Phase 26, Phase 31 |
| 5 | **Phase 29** — FinOps — Budgets & Chargeback | "Why is our LLM bill $40K/month?" answered with per-team breakdown | Phase 22, Phase 19 (research), Phase 25 |
| 6 | **Phase 31** — Executive Analytics & ROI Dashboard | The slide the CTO shows the board to justify renewal | Phase 22, Phase 29 |
| 7 | **Phase 32.1** — Cloud Marketplace Listings | AWS/GCP/Azure Marketplace = pre-approved purchasing path | Phase 22, Phase 25, Phase 29.2 (T5) |

**Tier outcome**: 10-30 mid-market customers paying $200K-$1M ARR each. Total ARR potential: $2M-$30M.

---

### T5 — Enterprise ($100K-$1M ACV per customer, Fortune 500)

**Goal**: Full procurement-track features. Regulated industries (finance, healthcare, defense, federal). These features unlock 9-figure TAMs.

**Phases (dependency-ordered)**:

| Order | Phase | Why this tier | Dependencies |
|---|---|---|---|
| 1 | **Phase 24** — Compliance Constraint Templates | HIPAA/PCI/SOC2/ISO/GDPR/FedRAMP packs — regulated industry unlock | Phase 7.5 (T1), Phase 23 (T3), Phase 12 (T3) |
| 2 | **Phase 27** — Air-Gapped + BYO-Key Deployment | Defense/intel/tier-1 banking — markets where SaaS is forbidden | Phase 22 (T3), Phase 26 (T4) |
| 3 | **Phase 26.2** — Policy-as-Code (OPA/Cedar) | Unified policy engine for customers running OPA on Kubernetes | Phase 7.5 (T1), Phase 26 (T4), Phase 6 ✓ |
| 4 | **Phase 26.4** — Cryptographic Event Signing | Non-repudiation for SOX/HIPAA/PCI/FedRAMP audit | Phase 26 (T4), Phase 25 (T4), Phase 22 (T3), Phase 27 |
| 5 | **Phase 29.1** — Approved Model Allowlists | CISO control over which LLMs are allowed; regulated-industry mandatory | Phase 26 (T4), Phase 25 (T4), Phase 29 (T4) |
| 6 | **Phase 29.2** — Tenant-Scoped Billing & Metering | SaaS-grade billing for multi-tenant deployments | Phase 22, Phase 25, Phase 29, Phase 26 |
| 7 | **Phase 25.1** — Federated Identity for Cross-Tenant | Consulting partnerships, M&A scenarios — bilateral SSO federation | Phase 21 (T3), Phase 25 (T4), Phase 26 (T4) |
| 8 | **Phase 32** — Vendor Risk & Procurement Pack | Pre-filled SIG/CAIQ/MSA/DPA/BAA + SOC2/ISO/FedRAMP roadmap | Phase 26 (T4), Phase 27, Phase 24 |
| 9 | **Phase 32.2** — Supply Chain Security: SBOM/SLSA | US EO 14028, FedRAMP High, EU CRA — federal procurement unlock | Phase 32, Phase 27 |

**Tier outcome**: 5-15 enterprise customers paying $500K-$2M ARR each. Total ARR potential: $5M-$30M from this tier alone. Includes federal/defense market access.

---

### T6 — Cortex Pro Add-On Modules (separate paid SKUs)

**Goal**: Productize advanced capabilities as add-on modules, sold on top of T1-T5 base. Each module is a separate purchasable SKU justified by specific high-value use cases.

**Modules (in commercial-priority order)**:

| Order | Module | Justification for prioritization |
|---|---|---|
| 1 | **Pro Module 4 — Compliance Copilot** | Compliance officers have budget (~$200/hr internal cost); conversational interface to Phase 24 + 26 saves them hours weekly |
| 2 | **Pro Module 2 — Governance Workflows** | Durable workflow engine + HITL for regulated approvals — natural T5 upsell |
| 3 | **Pro Module 5 — Librarian Observability** | SLA-grade per-Librarian telemetry — natural T5 upsell when customer signs SLA |
| 4 | **Pro Module 1 — Visual Librarian Designer** | No-code Librarian creation — high adoption value across all tiers |
| 5 | **Pro Module 6 — Tool Marketplace** | Community-contributed Phase 20.23 tools — long-tail value, network effects |
| 6 | **Pro Module 3 — Skill Marketplace** | Phase 20.13 skill sharing — needs critical mass; comes last |

**Module activation gates** (from `implementation_plan.md`):
- All require T1-T2 base (Phases 1-10, 13, 33)
- Module 2, 4, 5 require T4-T5 enterprise track
- Modules 3 and 6 require Phase 20.13 (research-grade) + Phase 20.23 (research-grade) respectively

**Tier outcome**: Per-customer ARR uplift of 20-50% on top of T4/T5 base. For a $500K T5 customer, Pro modules add $100K-$250K per year.

---

### T7 — Extended Vision: Cortex + Nexus Bundle (Distributed Cognitive Substrate)

**Goal**: For customers who buy both Cortex AND Nexus-OS, unify the memory side of the agent fleet. These phases make the bundle qualitatively better than either product alone.

**Phases (dependency-ordered)**:

| Order | Phase | Why this tier | Dependencies |
|---|---|---|---|
| 1 | **Phase 40** — Cognitive Substrate Umbrella | Substrate router; backward-compatible single-tenant mode preserved | Phase 22 (T3), Phase 25 (T4), Phase 26 (T4) |
| 2 | **Phase 41** — Per-Agent Memory Partitions | Each agent gets private + shared memory; the substrate's fundamental data model | Phase 40, Phase 7 ✓ |
| 3 | **Phase 42** — Unified Multi-Workspace Knowledge Graph | Cross-workspace queries with provenance; unlocks consulting + M&A use cases | Phase 40, Phase 18 (research) |
| 4 | **Phase 43** — Agent Mesh Runtime Orchestration | Specialist Librarians (security, performance) as long-running runtime agents | Phase 41, Phase 20.16 (research) |
| 5 | **Phase 43.2** — Universal Librarian Definition Schema | Portable, signed, versioned Librarian definitions; foundation for marketplace | Phase 43, Phase 41, Phase 22, Phase 25 |
| 6 | **Phase 43.5** — Agent Coordination Safety | 6 safety controls (depth, rate, deadlock, spawn, resource, saturation) | Phase 43, Phase 43.1, Phase 26, Phase 33.2 |
| 7 | **Phase 43.1** — Persistent Agent Messaging Substrate | Agent-to-agent messaging as durable, queryable memory entities | Phase 41, Phase 43, Phase 25.1, Phase 26 |
| 8 | **Phase 43.3** — Agent Action Approval Gate | Runtime approval gate for high-risk agent actions | Phase 43, Phase 41, Phase 25, Phase 26, Phase 33.2 |
| 9 | **Phase 43.4** — Sub-Librarian Spawning | Hierarchical agent delegation with Fork/Isolated context modes | Phase 43, Phase 41, Phase 43.5 |
| 10 | **Phase 43.6** — Bidirectional Librarian↔IDE Sync | Import existing IDE rules; export Cortex Librarians to IDE-native formats | Phase 43.2, Phase 26 |
| 11 | **Phase 44** — Cross-Agent Memory Federation Protocol | Formal protocol for cross-tenant memory exchange | Phase 41, Phase 42, Phase 43, Phase 25.1 |
| 12 | **Phase 45** — Cognitive Substrate Observability | Substrate-wide dashboard; **the bundle's killer demo moment** | Phase 22, Phase 26, Phase 29 |

**Tier outcome**: bundle pricing uplift of 30-50% on combined Cortex + Nexus pricing. For a customer paying $500K for Cortex Enterprise + $300K for Nexus, the bundle adds $200K-$400K per year.

---

## Parallel Research Track (Differentiation, drives papers/PR/long-term moat)

These phases drive **defensibility, hiring brand, and PR** rather than direct revenue. They unlock specific Pro Modules and T6+ features, but operate on a parallel timeline.

**Research wave 1** (early differentiation):

| Order | Phase | What it enables | Dependencies |
|---|---|---|---|
| 1 | **Phase 16** — Contradiction-Aware Retrieval | Resolves "the docs are wrong" failure mode; required by 20.x | Phase 6 ✓, Phase 7 (T1) |
| 2 | **Phase 18** — Architectural Embeddings | Required by 19, 30, 41.x; "cortex similar" is a T2 feature | Phase 6 ✓, Phase 7 (T1) |
| 3 | **Phase 15** — CI Feedback Signal Loop | CI quality dimension on entities | Phase 12 (T3), Phase 7 (T1) |
| 4 | **Phase 7.9** — Knowledge Garbage Collection & Archive Consolidation | Keeps index size minimal and prevents context window bloat | Phase 7.5 ✓ |

**Research wave 2** (advanced cognitive features):

| Order | Phase | What it enables | Dependencies |
|---|---|---|---|
| 4 | **Phase 17** — Self-Consistency via N-Sampling | Quality signal without LLM confidence theater | Phase 13 (T2), Phase 14 (T2) |
| 5 | **Phase 19** — Librarian Distillation | 5x cost reduction on routine syntheses; required by 29 + 20.15 + 20.20 | Phase 17, Phase 18 |
| 6 | **Phase 20** — Intelligent Architectural Advisor | The "advisor" surface for T2-T5 | Phase 6 ✓ |

**Research wave 3** (memory & cognition — drives Phase 40+ substrate):

| Order | Phase | What it enables |
|---|---|---|
| 7 | **Phase 20.9** — GraphRAG Community Synthesis | Required by Phase 33-Full + Phase 20.17 |
| 8 | **Phase 20.10** — HippoRAG Retrieval | Required by Phase 33-Full + Phase 20.18 |
| 9 | **Phase 20.6** — MemGPT Hierarchical Tiering | Scale knowledge bases >200 entities |
| 10 | **Phase 20.8** — Memory Stream Scoring (Generative Agents) | Recency × importance × relevance retrieval |
| 11 | **Phase 20.11** — Reflexion Self-Correction | Closes feedback loop; required by 20.15 |
| 12 | **Phase 20.12** — Temporal Knowledge Graph | Time-travel queries; required by Phase 20.17 |

**Research wave 4** (reasoning & advanced coordination):

| Order | Phase | What it enables |
|---|---|---|
| 13 | **Phase 20.15** — Dual-Process Routing | Routes complex syntheses to slow path |
| 14 | **Phase 20.18** — Tree-of-Thoughts & Self-Ask | Implementation of Phase 20.15's slow path |
| 15 | **Phase 20.16** — Multi-Agent Collaboration | Required by Phase 43 agent mesh |
| 16 | **Phase 20.23** — Tool-Use Augmented Synthesis | Required by Phase 20.24 + Pro Module 6 |
| 17 | **Phase 20.24** — Sequential Thinking & Persistent Reasoning Traces | Explainable PR comments |
| 18 | **Phase 20.20** — Active Inference & Predictive Synthesis | Surprise score for routing |

**Research nice-to-haves** (low-priority, ship if bandwidth allows):

- Phase 20.2 (Bug Hotspot Prediction)
- Phase 20.5 (ADR + C4 + Conway analysis)
- Phase 20.5.1 (Automated ADR Engine)
- Phase 20.7 (Mem0 per-developer memory)
- Phase 20.7.1 (Cross-Agent Workspace State Synchronization)
- Phase 20.13 (VOYAGER skill library — required by Pro Module 3)
- Phase 20.14 (Pearl Causal Analysis)
- Phase 20.17 (Sleep Consolidation)
- Phase 20.19 (ROME/MEMIT Surgical Editing)
- Phase 20.21 (Tulving Episodic-Semantic)
- Phase 20.22 (Ebbinghaus Spaced Repetition)
- Phase 13.3 (Token & Cost Savings Ledger & Analytics)

---

## Critical Path (Strict Serial Ordering)

These phases form a serial dependency chain — each one **blocks** subsequent tiers. Ship them in this exact order; cannot parallelize:

```
Phase 6 ✓ → Phase 7 ✓ → Phase 7.5 ✓ → Phase 22 → Phase 25 → Phase 26 → Phase 27 → Phase 32
[T0/T1]   [T1]      [T1]        [T3]        [T4]       [T4]       [T5]       [T5]
```

Everything else parallels around this spine. The above 8 phases (5 not done yet) are the **absolute minimum** to reach T5 enterprise revenue.

---

## Quick Wins (Low Effort, High Commercial Impact)

If you want to maximize ARR-unlocked per engineering-hour, prioritize these:

| Phase | Effort | Commercial Impact | Why |
|---|---|---|---|
| **Phase 33-MVP** | Medium | Massive (T0 unlocks T1+) | Fixes adoption-blocker |
| **Phase 6 completion** | Small | High (unlocks T1+) | Already in progress |
| **Phase 33.2 (local-only PWA variant)** | Small | High (T2 differentiator) | Mobile monitoring; viral feature |
| **Phase 5.6 watchdog** | Small | Medium (T1 polish) | Reliability for adoption |
| **Phase 32.2 SBOM/SLSA** | Small | Massive (T5 unlock) | Federal procurement gate |
| **Phase 25 SSO** | Medium | Massive (T4 unlock) | Table-stakes for >500-employee customers |
| **Phase 28 Workflow Integrations** | Medium per integration | High (T3 stickiness) | Slack/Jira/Teams; meets users where they live |
| **Phase 20.4 Fitness Functions** | Small-Medium | High (T2 differentiator) | "Architecture tests in CI" — developer-loved |

---

## Defer or Optional (Look Attractive, But Risky/Expensive)

| Phase | Why defer |
|---|---|
| **Phase 20.7 (Mem0 per-developer memory)** | High UX value but adds per-developer sync surface; ship after T3 team features prove stable |
| **Phase 20.13 (VOYAGER Skill Library)** | Marketplace mechanics require critical mass; ship just-in-time for Pro Module 3 |
| **Phase 20.17 (Sleep Consolidation)** | Heavy LLM cost; defer until customers have >500 entities and observable drift |
| **Phase 20.19 (Knowledge Editing ROME/MEMIT)** | Specialized; ship when customers report "re-synthesis shifts unrelated details" pain |
| **Phase 20.21 (Episodic-Semantic Consolidation)** | Theoretically beautiful but limited immediate customer-visible value |
| **Phase 20.5 (ADR + C4 + Conway)** | Documentation generation; ship if a specific customer asks |
| **Phase 20.5.1 (Automated ADR Engine)** | Automated creation of architecture records from constraint edits |
| **Phase 39 (Voice Mode — from Nexus)** | Not absorbed into Cortex; remains a future Pro Module if commercial demand emerges |

---

## Sprint-Sized Groupings

Each sprint is roughly 4-8 weeks of focused engineering, designed to produce a shippable tier upgrade.

### Sprint 1 (Q1) — "Make Free Tier Actually Work" → unlocks T1

- ✅ **Phase 6 — COMPLETE (verified 2026-05-19, 25/25 Phase 6 tests passing)**
- ✅ **Phase 7 — COMPLETE (verified 2026-05-19, 14/14 Phase 7 tests passing)**
- ✅ **Phase 7.5 — COMPLETE (verified 2026-05-19, 42/42 Phase 7.5 tests passing)**
- Phase 33-MVP (stripped Deep Bootstrap)
- Phase 5.6 (watchdog)
- ✅ **Phase 8 — COMPLETE (verified 2026-05-19, 22/22 Phase 8 tests passing)**
- ✅ **Phase 10 — COMPLETE (verified 2026-05-19, 14/14 Phase 10 tests passing)**

**Outcome**: Free tier becomes genuinely useful. Adoption begins.

**Sprint 1 progress: Phases 6 + 7 + 7.5 + 8 + 9 + 10 done (85% of sprint). Phase 5.6, 33-MVP remaining.**

> Phase 9 (Impact Preview) shipped ahead of schedule in Sprint 1 (2026-05-19). `cortex impact`, `cortex deps`, `impact_analysis` MCP tool + prompts all live.

### Sprint 2 (Q2) — "Indie Pro Launch" → unlocks T2

- ✅ **Phase 9** (impact preview) — Done 2026-05-19
- ✅ **Phase 13** (token economics & context packs) — Done 2026-05-19
- Phase 14 (clustering)
- Phase 16 (contradictions, research)
- Phase 18 (embeddings, research)
- Phase 33.1 (provider registry)
- Phase 33.2 (mobile PWA, local variant)

**Outcome**: First paid SKU at $20-50/month. First $10K-50K MRR.

### Sprint 3 (Q3) — "Team Product" → unlocks T3

- Phase 11 (monorepo)
- Phase 12 (Git/CI)
- Phase 5.7 (cron) + Phase 5.8 (multi-operator)
- Phase 21 (polyrepo)
- Phase 22 (central server)
- Phase 23 (review)
- Phase 33-Full (with 14, 20.9, 20.10 enhancements; ship 20.9, 20.10 here)
- Phase 19 (distillation, research)
- Phase 20 (advisor)
- Phase 20.1 + 20.3 + 20.4 (simulation, patterns, fitness)

**Outcome**: First $250K-$2.5M ARR from startup customers.

### Sprint 4 (Q4) — "Mid-Market Enterprise" → unlocks T4

- Phase 25 (SSO/SCIM)
- Phase 26 (RBAC/Audit)
- Phase 26.1 (DLP)
- Phase 26.3 (OTel)
- Phase 28 (workflow integrations)
- Phase 29 (FinOps)
- Phase 30 (migration)
- Phase 30.1 (conversation import)
- Phase 31 (executive analytics)

**Outcome**: First Fortune 1000 customers. $2M-$30M ARR achievable.

### Sprint 5 (Year 2) — "Full Enterprise" → unlocks T5

- Phase 24 (compliance)
- Phase 27 (air-gap/BYO-Key)
- Phase 26.2 (Policy-as-Code)
- Phase 26.4 (cryptographic signing)
- Phase 29.1 (model allowlists)
- Phase 29.2 (tenant billing)
- Phase 25.1 (federated identity)
- Phase 32 (procurement pack)
- Phase 32.1 (marketplaces)
- Phase 32.2 (SBOM/SLSA)
- Phase 15 (CI feedback, research)
- Phase 17 (self-consistency, research)

**Outcome**: First federal/defense/finance customers. $5M-$30M from enterprise tier.

### Sprint 6 (Year 2-3) — "Pro Add-Ons" → unlocks T6 revenue uplift

- Pro Module 4 (Compliance Copilot)
- Pro Module 2 (Governance Workflows)
- Pro Module 5 (Librarian Observability)
- Pro Module 1 (Visual Librarian Designer)
- Phase 20.23 (Tool-Use, research) — required by Pro Module 6
- Phase 20.13 (Skill Library, research) — required by Pro Module 3
- Pro Module 6 (Tool Marketplace)
- Pro Module 3 (Skill Marketplace)

**Outcome**: 20-50% ARR uplift on T4/T5 customers via add-ons.

### Sprint 7+ (Year 3+) — "Cortex + Nexus Bundle" → unlocks T7

- Phase 20.6 + 20.8 + 20.11 + 20.12 + 20.15 + 20.16 + 20.18 (research-grade cognitive features)
- Phase 40 (substrate umbrella)
- Phase 41 (memory partitions)
- Phase 42 (multi-workspace)
- Phase 43 + 43.1-43.6 (agent mesh + sub-phases)
- Phase 44 (federation protocol)
- Phase 45 (substrate observability)

**Outcome**: Cortex + Nexus bundle as a category-creating product.

---

## Cross-Cutting Dependencies (Watch For)

These dependencies cross tier boundaries — don't get caught flat-footed:

| Dependency arrow | Implication |
|---|---|
| Phase 33-Full → Phase 14, 20.9, 20.10, 13 | Phase 33 ships MVP first; full version follows when research lands |
| Phase 33.2 → Phase 22 | Mobile PWA needs central server; ship local-only variant first |
| Phase 19 → Phase 17 + 18 | Distillation depends on self-consistency + embeddings |
| Phase 29 → Phase 19 | FinOps cost-throttling routes to distilled Librarian |
| Phase 20.15 → Phase 19 + 13 | Dual-process router needs distilled model for fast path |
| Phase 20.18 → Phase 20.15 + 20.10 | ToT is the slow path's implementation |
| Phase 41 → Phase 40 | Memory partitions need substrate umbrella |
| Phase 43.x → Phase 43 + Phase 41 | Every agent mesh sub-phase needs 43 + 41 |
| Phase 45 → Phase 22 + 26 + 29 | Substrate observability piggybacks on enterprise infrastructure |
| Pro Module 3 → Phase 20.13 (research) | Skill marketplace needs skill library landed first |
| Pro Module 6 → Phase 20.23 (research) | Tool marketplace needs tool registry landed first |

---

## Decision Heuristics

When in doubt about what to ship next, apply these in order:

1. **Are there shipped bugs blocking adoption?** → Fix first (currently: Phase 33-MVP)
2. **Is there a customer waiting?** → Ship the phase that unblocks them
3. **Does it unlock a tier upgrade with measurable revenue impact?** → Ship it
4. **Is it a quick win (<2 weeks) with high commercial impact?** → Slot it in any sprint
5. **Is it research-grade with no immediate revenue tie?** → Defer unless it unblocks a tier
6. **Does it look cool but have heavy dependencies?** → Check the dependency chain before committing

---

## Strict Dependency-Ordered Wave Sequence (All 80+ Phases)

> **What this is**: A topological sort of every phase by its Definition-of-Ready dependencies. Phases in the same wave can be built in parallel; phases in later waves require their earlier-wave dependencies to be done. This is **not** the same as the tier-by-tier monetization order above — it's the raw dependency truth from `implementation_plan.md`.
>
> **How to read it**: When picking a phase to build, find the lowest-wave phase that is (a) not yet done, (b) in your target tier, and (c) has all its dependencies satisfied. The wave structure guarantees you won't be blocked on a missing dependency.
>
> **Notation**: `Px · deps: A, B, C` means Phase x has prerequisites A, B, C. Optional/soft dependencies are marked `(opt)`. Phases marked 🅼 are MVP-only variants that ship lighter to avoid heavy research deps.

### Wave 0 — Already Done ✅

The foundation everything else builds on. No further work needed.

- **Phase 1** — Ingestion & Monitoring · deps: (none)
- **Phase 2** — LLM Synthesis · deps: 1
- **Phase 3** — Storage & Knowledge Writer · deps: 2
- **Phase 4** — MCP Server · deps: 3
- **Phase 4.5** — Dual-Route IDE Integration · deps: 4
- **Phase 5** — CLI Polish & Daemonization · deps: 3, 4
- **Phase 6** — Active Guardrail (Constraints + Blast-Radius + Failed Approaches + save_concept) · deps: 5 ✓ · ✅ **Done 2026-05-19**
- **Phase 7** — Audit & Traceability (log.jsonl + evidence + lint + evolution + secret redaction) · deps: 6 ✓ · ✅ **Done 2026-05-19**
- **Phase 7.5** — Knowledge Quality Foundation (quality scoring + org-constraint DSL) · deps: 6 ✓, 7 ✓ · ✅ **Done 2026-05-19**
- **Phase 8** — Visual & Browseable Knowledge Graph (cortex graph + cortex serve) · deps: 3 ✓ · ✅ **Done 2026-05-19**
- **Phase 9** — Refactoring Impact Preview (`cortex impact`, `cortex deps`, `impact_analysis` MCP tool + prompts) · deps: 6 ✓, 7 ✓ · ✅ **Done 2026-05-19**

### Wave 1 — Start Immediately (only Wave 0 required)

These can be picked up today; no planned phase needs to land first.

- **Phase 3.1** — LLM Caching Store · deps: 3 ✓
- **Phase 4.6** — Developer API & Client SDKs · deps: 4.5 ✓
- **Phase 5.6** — Daemon Watchdog & Self-Healing · deps: 5 ✓
- ~~**Phase 8**~~ — moved to Wave 0 (✅ Done 2026-05-19)
- **Phase 8.1** — Live Graph Stream · deps: 8 ✓
- **Phase 7.6** — Global Architectural Lessons & Retrospective Log · deps: 7.5 ✓
- **Phase 7.7** — Automated Technical Debt Register · deps: 7.5 ✓
- **Phase 4.8** — Persona-Specific MCP Prompts · deps: 7.5 ✓
- ~~**Phase 13.2**~~ — Cortex Brevity Engine & Telegraphic Memory Compression · (✅ Done 2026-05-20)
- **Phase 7.10** — Sensitive Data & API Secret Sanitization Guardrail · deps: 7.5 ✓
- ~~**Phase 13.3**~~ — Token & Cost Savings Ledger & Analytics · (✅ Done 2026-05-20)
- **Phase 9.1** — Dependency Path Querying · deps: 9 ✓
- **Phase 10** — Onboarding & Guided Reading · deps: 3 ✓
- **Phase 10.3** — Zero-Token Startup & AI Ignore Scaffolding · deps: 10 ✓
- **Phase 10.6** — Compaction-Safe Decision Anchoring & Continuity Breadcrumbs · deps: 10.3 ✓
- **Phase 11** — Monorepo Federation · deps: 3 ✓
- **Phase 20.23** — Tool-Use Augmented Synthesis · deps: 2 ✓
- **Phase 33-MVP** 🅼 — Stripped Deep Bootstrap · deps: 2 ✓ (full version waits for Wave 5-6)
- ~~**Phase 7.5**~~ — moved to Wave 0 (✅ Done 2026-05-19)
- ~~**Phase 9**~~ — moved to Wave 0 (✅ Done 2026-05-19)
- **Phase 16** — Contradiction-Aware Retrieval · deps: 6 ✓, 7 ✓ (was Wave 3; now unblocked)
- **Phase 18** — Architectural Embeddings · deps: 6 ✓, 7 ✓ (was Wave 3; now unblocked)
- **Phase 20** — Intelligent Architectural Advisor · deps: 6 ✓
- **Phase 20.5** — ADR + C4 + Conway · deps: 8 ✓, 7 ✓
- **Phase 20.7** — Mem0 Personalized Memory · deps: 4 ✓, 7 ✓
- **Phase 20.12** — Temporal Knowledge Graph · deps: 7 ✓
- **Phase 20.14** — Pearl Causal Analysis · deps: 6 ✓, 7 ✓
- **Phase 20.19** — Knowledge Editing (ROME/MEMIT) · deps: 7 ✓

### Wave 2 — After Wave 1

- **Phase 4.7** — OpenAI-Compatible REST Gateway · deps: 33.1
- **Phase 5.7** — Scheduled Operations & Cron Engine · deps: 5.6 (full version needs 26 + 33.2)
- **Phase 5.8** — Multi-Operator Session Coordination · deps: 5.6 (full version needs 25)
- **Phase 12** — Git & CI Integration · deps: 6 ✓
- **Phase 13** — Token Economics & Context Packs · deps: 8, 10
- ~~**Phase 13.4**~~ — API Budget Gating & Runaway Safeguards · (✅ Done 2026-05-20)
- ~~**Phase 13.5**~~ — Fuzzy Levenshtein & RRF Search Ranker · (✅ Done 2026-05-20)
- **Phase 10.4** — Managed `CLAUDE.md` & AI Rules Orchestration · deps: 10.3
- **Phase 10.5** — Attention-Curve Rule Reordering & Position Optimization · deps: 10.4
- **Phase 10.7** — Rules File Size Guardrail & Auto-Splitting · deps: 10.4
- **Phase 13.7** — Hooks-Based Smart Read Cache & AST Skeleton Delta Compression · deps: 10.3
- **Phase 17.1** — Multi-Model Architectural Debate · deps: 33.1
- **Phase 20.5.1** — Automated ADR Engine · deps: 20.5
- **Phase 20.6** — MemGPT Hierarchical Memory Tiering · deps: 4 ✓, 8, 10
- **Phase 20.1** — Architecture Simulation · deps: 8, 6 ✓

### Wave 3 — After 8, 10, 12 are also done (now slim — most of original Wave 3 promoted to Wave 1/2)

- **Phase 12.10** — Baseline-Driven Quality Gates · deps: 7.5 ✓, 12
- **Phase 12.11** — Architectural Changelog Generator · deps: 7 ✓, 12
- **Phase 12.12** — Automated MCP Compliance & Live Integration Suite · deps: 12
- **Phase 12.13** — Architecturally Aware Commit Scope Linting · deps: 7.5 ✓, 12.3
- **Phase 12.14** — Agent Token-Use Discovery & Anti-Pattern Auditor · deps: 12.6, 13
- **Phase 15** — CI Feedback Signal Loop · deps: 12, 7 ✓
- **Phase 13.6** — Proximity Reranking & Smart Snippets · deps: 13.5

### Wave 4 — Mid-Tier Features & Second Research Wave

- **Phase 14** — Large-Diff Clustering · deps: 6, 13
- **Phase 20.3** — Design Pattern Suggestion · deps: 7, 18
- **Phase 20.4** — Fitness Functions · deps: 7 (12 opt)
- **Phase 20.8** — Memory Stream Retrieval Scoring · deps: 8, 7.5, 18
- **Phase 20.11** — Reflexion Self-Correction · deps: 7, 16
- **Phase 20.22** — Spaced Repetition (Ebbinghaus) · deps: 7.5
- **Phase 20.2** — Bug Hotspot Prediction · deps: 8, 15
- **Phase 21** — Polyrepo Federation · deps: 11, 7.5, 12
- **Phase 23** — Human-in-the-Loop Review · deps: 7.5, 12

### Wave 5 — Research wave 2 / Server foundation

- **Phase 17** — Self-Consistency via N-Sampling · deps: 13, 14
- **Phase 19** — Librarian Distillation · deps: 17, 18
- **Phase 20.9** — GraphRAG Community Synthesis · deps: 6, 14
- **Phase 20.10** — HippoRAG Retrieval · deps: 6, 8 (18 opt)
- **Phase 20.13** — VOYAGER Skill Library · deps: 20.3, 7, 7.5
- **Phase 30** — Knowledge Migration & Legacy Ingest · deps: 18, 2 ✓
- **Phase 22** — Central Knowledge Server · deps: 21, 8, 9
- **Phase 24** — Compliance Constraint Templates · deps: 7.5, 23, 12

### Wave 6 — Bootstrap full version, SSO base, late research

- **Phase 33-Full** — Upgrade Phase 33-MVP with full deps · deps: 14, 20.9, 20.10, 13, 2 ✓
- **Phase 25** — Enterprise SSO/SCIM · deps: 22
- **Phase 20.16** — Multi-Agent Librarian Collaboration · deps: 4 ✓, 18, 13
- **Phase 20.17** — Sleep Consolidation · deps: 18, 20.12, 12
- **Phase 20.20** — Active Inference (Friston) · deps: 19

### Wave 7 — Enterprise core + mobile

- **Phase 26** — RBAC/ABAC + Immutable Audit · deps: 25, 22
- **Phase 33.2** — Remote Operations & Mobile PWA · deps: 22, 25, 26 (partial), 33
- **Phase 33.1** — Model Provider Registry · deps: 33, 26 (partial), 29 (partial)
- **Phase 20.15** — Dual-Process Synthesis · deps: 19, 13
- **Phase 20.21** — Episodic-Semantic Consolidation · deps: 7, 18, 20.17

### Wave 8 — Enterprise advanced features

- **Phase 26.1** — DLP & PII Redaction · deps: 7, 6, 26
- **Phase 26.2** — Policy-as-Code (OPA/Cedar) · deps: 7.5, 26, 6
- **Phase 27** — Air-Gapped + BYO-Key Deployment · deps: 22, 26
- **Phase 28** — Workflow Integrations Hub · deps: 22, 25, 26
- **Phase 29** — FinOps — Budgets/Chargeback · deps: 22, 19, 25
- **Phase 20.18** — Tree-of-Thoughts & Self-Ask · deps: 20.15, 20.10
- **Phase 20.24** — Sequential Thinking & Reasoning Traces · deps: 20.23, 20.15, 6, 12

### Wave 9 — Federation, observability, advanced enterprise

- **Phase 25.1** — Federated Identity for Cross-Tenant · deps: 21, 25, 26
- **Phase 26.4** — Cryptographic Event Signing · deps: 26, 25, 22, 27
- **Phase 29.1** — Approved Model Allowlists · deps: 26, 25, 29
- **Phase 29.2** — Tenant-Scoped Billing & Metering · deps: 22, 25, 29, 26
- **Phase 31** — Executive Analytics & ROI Dashboard · deps: 22, 29
- **Phase 30.1** — External AI Conversation Import · deps: 30, 26.1, 33
- **Phase 26.3** — OpenTelemetry Tracing & Export · deps: 26, 31

### Wave 10 — Procurement track + Extended Vision base + first Pro modules

- **Phase 32** — Vendor Risk & Procurement Pack · deps: 26, 27, 24
- **Phase 40** — Distributed Cognitive Substrate Umbrella · deps: 22, 25, 26
- **Pro Module 4** — Compliance Copilot · deps: 24, 26
- **Pro Module 5** — Librarian Observability · deps: 31

### Wave 11 — Marketplaces, supply chain, more Pro modules, substrate primitives

- **Phase 32.1** — Cloud Marketplace Listings · deps: 22, 25, 29.2, 32
- **Phase 32.2** — Supply Chain Security: SBOM & SLSA · deps: 32, 27
- **Phase 41** — Per-Agent Memory Partitions · deps: 40, 7
- **Phase 42** — Unified Multi-Workspace Knowledge Graph · deps: 40, 18
- **Pro Module 1** — Visual Librarian Designer · deps: Cortex Standard (Waves 1-5)
- **Pro Module 2** — Governance Workflows + HITL · deps: 23, 26
- **Pro Module 6** — Tool Marketplace · deps: 20.23

### Wave 12 — Agent mesh runtime + substrate observability

- **Phase 43** — Agent Mesh Runtime Orchestration · deps: 41, 20.16
- **Phase 45** — Cognitive Substrate Observability · deps: 22, 26, 29
- **Pro Module 3** — Private Skill Marketplace · deps: 20.13

### Wave 13 — Agent mesh sub-phases (first batch)

- **Phase 43.2** — Universal Librarian Definition Schema · deps: 43, 41, 22, 25
- **Phase 43.1** — Persistent Agent Messaging Substrate · deps: 41, 43, 25.1, 26
- **Phase 43.3** — Agent Action Approval Gate · deps: 43, 41, 25, 26, 33.2
- **Phase 44** — Cross-Agent Memory Federation Protocol · deps: 41, 42, 43, 25.1

### Wave 14 — Agent mesh sub-phases (second batch)

- **Phase 43.6** — Bidirectional Librarian↔IDE Native Format Sync · deps: 43.2, 26
- **Phase 43.5** — Agent Coordination Safety · deps: 43, 43.1, 26, 33.2

### Wave 15 — Final substrate sub-phase

- **Phase 43.4** — Sub-Librarian Spawning with Context Inheritance · deps: 43, 41, 43.5

---

### Wave Coverage Summary

| Wave | Phases ready | Cumulative count | Tier(s) unlocked |
|---|---|---|---|
| 0 | **11 (done — incl. 6, 7, 7.5, 8, 9 verified 2026-05-19)** | 11 | T0 partially achieved |
| 1 | 13 new (most of original Wave 3 promoted here) | 24 | T0 (via 33-MVP) + most of T1 features |
| 2 | 6 new | 30 | T1 complete; T2 starts |
| 3 | 1 new | 31 | research feedback loop |
| 4 | 9 new | 40 | T2 / research wave 1 |
| 5 | 8 new | 48 | T3 base; research wave 2 |
| 6 | 5 new | 53 | T3 features; 33-Full |
| 7 | 5 new | 58 | T4 starts |
| 8 | 7 new | 65 | T4 enterprise core |
| 9 | 7 new | 72 | T5 advanced enterprise |
| 10 | 4 new | 76 | T5 procurement; T6 + T7 base |
| 11 | 7 new | 83 | T5 complete; T6 mid; T7 building |
| 12 | 3 new | 86 | T7 mesh ready |
| 13 | 4 new | 90 | T7 sub-phases batch 1 |
| 14 | 2 new | 92 | T7 sub-phases batch 2 |
| 15 | 1 new | 93 | T7 complete |

**Total**: 93 distinct phases / sub-phases / Pro Modules across 16 waves (including Wave 0 already done).

---

### Critical Dependency Chains (Cannot Parallelize)

These are the strict serial chains — each link must be done before the next. Slipping any of these blocks the entire downstream chain:

**Chain A — Enterprise spine** (8 hops, blocks all T4+ revenue):
```
6 ✓ → 7 ✓ → 7.5 ✓ → 21 → 22 → 25 → 26 → 27 → 32
                       (5 deeper enterprise sub-phases hang off 26 + 27)
```

**Chain B — Research-to-bootstrap** (6 hops, unlocks Phase 33-Full):
```
6 → 13 → 14 → 20.9 (via 6+14) ─┐
                                ├→ 33-Full
6 → 18 → 20.10 (via 6+8+18) ──┘
```

**Chain C — Distillation pipeline** (5 hops, unlocks Phase 29 + 20.15 + 20.20):
```
6 → 7 → 16/18 → 17 → 19 → 20.15 → 20.18
                          → 20.20
                          → 29 (after 22 + 25)
```

**Chain D — Agent mesh** (full substrate, longest chain — 8 hops):
```
22 → 25 → 26 → 40 → 41 → 43 → 43.1 → 43.5 → 43.4
                       └→ 42, 44, 45, 43.2, 43.3, 43.6 (branches)
```

**Chain E — Compliance to procurement** (5 hops):
```
6 ✓ → 7 ✓ → 7.5 ✓ → 23 → 24 → 32 → 32.2
                              → Pro Module 4 (Compliance Copilot)
```

---

### Quick Lookup: "What's Blocking Phase X?"

If you want to start a specific phase NOW and don't know what's blocking, find it in the wave list above. Its `deps:` line shows the direct prerequisites. Walk back through the waves until everything in the dependency chain is satisfied. Examples:

| Want to build... | Walk back through... | Blocked by (planned, not-yet-done) |
|---|---|---|
| **Phase 33-MVP** | 2 ✓ | Nothing — ship now |
| **Phase 7.5** | 6 ✓, 7 ✓ | ✅ **Done 2026-05-19** |
| **Phase 9 (Impact Preview)** | 6 ✓, 7 ✓ | ✅ **Done 2026-05-19** |
| **Phase 16 (Contradictions)** | 6 ✓, 7 ✓ | **Nothing — newly unblocked 2026-05-19; ship next** |
| **Phase 18 (Embeddings)** | 6 ✓, 7 ✓ | **Nothing — newly unblocked 2026-05-19; ship next** |
| **Phase 26 (RBAC/Audit)** | 25 → 22 → 21 + 8 + 9 → 11, 7.5, 12, 9 → 6 ✓, 7 ✓ | 7.5, 9, 11, 12, 21, 22, 25 — T1-T3 (6 + 7 done) |
| **Phase 33-Full** | 14, 20.9, 20.10, 13 → 6 ✓, 8, 10, 18 | 13, 14, 18, 20.9, 20.10 — Waves 2-5 (6 done) |
| **Pro Module 3 (Skill Marketplace)** | 20.13 → 20.3 → 18 → 6 ✓, 7 ✓ | 18, 20.3, 20.13 — Waves 1-5 (6 + 7 done) |
| **Phase 45 (Substrate Observability)** | 22, 26, 29 | 22, 25, 26, 29 — Waves 5-8 |
| **Phase 43.4 (Sub-Spawning)** | 43.5 → 43.1 → 43 → 41 → 40 → 22, 25, 26 | All of T3-T5 + Wave 12-14 substrate phases |

---

### Sanity Checks (No Circular Dependencies)

Verified pairs that look suspicious but resolve correctly:

- **43.1 ↔ 43.5**: 43.5 depends on 43.1 (one-direction only). No cycle.
- **26.3 ↔ 31**: 26.3 depends on 31; 31 depends on 22 + 29; no cycle.
- **33 ↔ 33.1 ↔ 33.2**: 33 is parent; 33.1 and 33.2 both depend on 33; no cycle between 33.1 and 33.2.
- **Pro Module 4 ↔ 24**: Pro Module 4 depends on 24; 24 does not depend back. No cycle.
- **20.13 ↔ Pro Module 3**: 20.13 is a research prerequisite; Pro Module 3 doesn't feed back. No cycle.

---

### Phases Without Hard Predecessors (Most Flexible Scheduling)

These can be slotted into any sprint where bandwidth allows — useful when blocked on critical-path phases:

- **Phase 3.1** (only needs Phase 3 ✓) — ship in Wave 1
- **Phase 4.6** (only needs Phase 4.5 ✓) — ship in Wave 1
- **Phase 5.6** (only needs Phase 5 ✓) — ship in Wave 1
- **Phase 8** (only needs Phase 3 ✓) — ship in Wave 1
- **Phase 8.1** (only needs Phase 8 ✓) — ship in Wave 1
- **Phase 10** (only needs Phase 3 ✓) — ship in Wave 1
- **Phase 11** (only needs Phase 3 ✓) — ship in Wave 1
- **Phase 20.23** (only needs Phase 2 ✓) — ship in Wave 1
- **Phase 33-MVP** (only needs Phase 2 ✓) — **P0, ship in Wave 1**
- **Phase 9.1** (only needs Phase 9 ✓) — ship in Wave 1
- ~~**Phase 9**~~ (✅ Done 2026-05-19)
- **Phase 7.6** (only needs Phase 7.5 ✓) — ship in Wave 1
- **Phase 7.7** (only needs Phase 7.5 ✓) — ship in Wave 1
- **Phase 4.8** (only needs Phase 7.5 ✓) — ship in Wave 1
- ~~**Phase 13.2**~~ (✅ Done 2026-05-20)
- **Phase 16, 18, 20, 20.5, 20.7, 20.12, 20.14, 20.19** (only need Phase 6 ✓ + Phase 7 ✓) — **newly unblocked 2026-05-19; all safe parallel options for current sprint** *(Phase 7.5 already done)*

If your team has spare cycles waiting on a long-running phase, these are the safe parallel options.

---

## Status of This Document

- **Generated**: 2026-05-18 from `implementation_plan.md` (covering Phases 1 → 45 + all sub-phases + 6 Pro Modules)
- **Last updated**: 2026-05-20 — Phases 13.2, 13.3, 13.4, and 13.5 marked ✅ Done (brevity engine, savings ledger, safeguards gating, fuzzy RRF search, and package projectcortex@0.7.1 published)
- **Strict source of truth**: phase definitions, DoR, DoD — see `implementation_plan.md`
- **This document's job**: ordering + tier-mapping only; does not change phase semantics
- **Refresh trigger**: any time a phase's status changes (✅ done, 🚧 in progress, ⏳ planned) or a new phase is added

When `implementation_plan.md` is updated, regenerate this priority list so the dependencies and tier mappings stay current.
