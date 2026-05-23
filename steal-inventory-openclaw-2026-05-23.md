# Steal Inventory — openclaw — 2026-05-23

**Mode**: Full audit | **Calibration**: Novel/Research (13,929 TS/JS source files)  
**Scan strategy**: Stratified — 100% core/docs/skills + 15% extensions  
**Spot-check**: PASS (4/4 hallucination checks passed)  
**Commit**: `4ea089b7feedd79e1ff129ad239451026b720b80` @ main  
**Bucket counts**: A=7, B=3, C=12, D=7, E=3, F=2, G=3

---

## Bucket E — Closes Known Flaws (Gold)

| # | Name | Source | Flaws Closed | Score | Conf |
|---|------|--------|-------------|-------|------|
| 1 | Hybrid BM25/FTS5 + Vector Search with Merge | `extensions/memory-core/src/memory/hybrid.ts:54` `mergeHybridResults` | #18, #26 | 32 | high ✅ |
| 2 | MMR Diversity Re-ranking | `extensions/memory-core/src/memory/mmr.ts:152` `mmrRerank` | #26 | **45** | high ✅ |
| 3 | Temporal Decay Scoring for Knowledge Age | `extensions/memory-core/src/memory/temporal-decay.ts:4` `TemporalDecayConfig` | #13 | 24 | high ✅ |

---

## Bucket C — Worth Stealing (Gap)

| # | Name | Source | Proposed Phase | Score | Conf |
|---|------|--------|---------------|-------|------|
| 4 | Prompt-Cache Ordering Guideline | `AGENTS.md:41` | Phase 13 refinement | **45** | high |
| 5 | Standing Orders Pattern | `docs/automation/standing-orders.md:1` | Phase 5.7 refinement | 36 | high |
| 6 | Hook Lifecycle Event System (15 events) | `docs/automation/hooks.md:36` | Phase 5.7 refinement | 32 | high |
| 7 | Staggered Top-of-Hour Cron Scheduling | `docs/automation/cron-jobs.md:75` | Phase 5.7 refinement | 30 | high |
| 8 | Prove-First / Ship-After-Review Gate | `.agents/skills/openclaw-small-bugfix-sweep/SKILL.md:1` | Phase 7.5.1 | 30 | high |
| 9 | Cron Multi-Session-Style Execution Model | `docs/automation/cron-jobs.md:89` | Phase 5.7 refinement | 24 | high |
| 10 | Heap Leak Detection via FinalizationRegistry | `.agents/skills/openclaw-test-heap-leaks/SKILL.md:1` | Phase 0.11 refinement | 24 | high |
| 11 | Evergreen vs Dated Memory Taxonomy | `extensions/memory-core/src/memory/temporal-decay.ts:71` `isEvergreenMemoryPath` | Phase 7.9 | 24 | high ✅ |
| 12 | Custom CodeQL Per-Boundary Security Scanning | `.github/codeql/codeql-core-auth-secrets-critical-security.yml:1` | Phase 0.17 refinement | 18 | high |
| 13 | Task Ledger (Background Work Tracking) | `docs/automation/tasks.md:1` | Phase 5.7 refinement | 12 | med |
| 14 | Process Lease + Reaper for Spawned Agents | `extensions/acpx/src/process-lease.ts:1` `AcpxProcessLease` | Phase 53.4 refinement | 12 | med |
| 15 | Memory Dreaming (Sleep-Cycle Consolidation) | `extensions/memory-core/src/dreaming.ts:1` | Phase 20.17 | 4 | med |

---

## Bucket F — Anti-Patterns (Avoid)

| # | Name | Source | Action |
|---|------|--------|--------|
| 16 | CLAUDE.md as one-liner redirect to AGENTS.md | `CLAUDE.md:1` | Do NOT adopt; Cortex needs Claude Code-specific rules |
| 17 | Break-glass flags without runtime warning injection | `SECURITY.md:297` | Add one-time startup warning for any `dangerous*` flag |

---

## Bucket G — Open Questions

| # | Question | Source |
|---|----------|--------|
| 18 | On-demand vs cron-scheduled synthesis: which model fits Cortex? | `extensions/memory-core/src/dreaming.ts:1` |
| 19 | In-memory fuse.js vs SQLite FTS5 for cortex_find? | `extensions/memory-core/src/memory/hybrid.ts:54` |
| 20 | Should execute-verify-report be a mandatory Cortex skill template requirement? | `docs/automation/standing-orders.md:177` |

---

## Bucket B — Cortex Has Superior Version

| # | Name | Cortex Phase | Steel-man for target |
|---|------|-------------|---------------------|
| 21 | Phase 13.5 RRF Ranker vs BM25 | 13.5 | BM25 scores are more interpretable than RRF's 1/(k+rank) formula |
| 22 | Phase 2 LLM Synthesis Engine | 2 | OpenClaw's session approach is simpler and requires no AST parsing |
| 23 | Phase 4 MCP Server | 4 | OpenClaw as MCP client is more flexible — connects to any MCP server |

---

## Bucket A — Already in Cortex

| # | Cortex Phase | Feature |
|---|-------------|---------|
| 24 | Phase 4 | MCP server integration |
| 25 | Phase 7.10 | Secret sanitization / pre-commit scanning |
| 26 | Phase 0.17 | Security CI gates (CodeQL) |
| 27 | Phase 5 | CLI polish |
| 28 | Phase 12 | Git integration for change detection |
| 29 | Phase 13.7 | Hooks-based cache invalidation |
| 30 | Phase 3 | File-based knowledge storage |

---

## Bucket D — Wrong Fit / Niche (Cortex Principle Violated)

| # | Name | Violated Principle |
|---|------|------------------|
| 31 | Multi-channel messaging (Telegram/Discord/Slack/Signal) | local-first |
| 32 | Mobile apps (iOS, Android, macOS) | local-first |
| 33 | ACP multi-agent orchestration framework | local-first |
| 34 | ClawHub plugin marketplace | local-first |
| 35 | Live model switching per-session | llm-cost-conscious |
| 36 | Voice/audio transcription pipeline | local-first |
| 37 | Deferred tool loading via meta-tools | mcp-first |

---

## Expected but Absent (Negative-Space)

For an AI code-intelligence platform, these features were expected but NOT found in OpenClaw:
- **Knowledge graph relationships** — memories are flat files; no entity relationship graph linking entries
- **AST-level code understanding** — no tree-sitter or language-server integration (not OpenClaw's domain)
- **Diff-aware incremental memory ingestion** — no "only ingest changed files since last run" in the memory pipeline
- **Per-entity cost/token budget tracking** — bootstrap budget exists at session level, not per-entity

For Cortex: #1 and #3 are roadmap signals (Phase 13.5 graph edges, Phase 33.5 unified ingest already account for these).

---

## Surprises

- **AGENTS.md:41** — a single rule about prompt-cache ordering buried in a 160-line ops doc is the highest-scoring finding (45). High leverage, near-zero effort.
- **CJK-aware MMR tokenizer** — `mmr.ts` handles CJK unigrams + adjacent bigrams without an external NLP library. Drop-in for non-Latin language support.
- **15 distinct CodeQL configs** — one per trust boundary. Most projects have one. This level of granularity in a ~15k LOC project is unusual and reflects genuine security engineering maturity.
- **heapsnapshot-delta.mjs** — bespoke heap-diff tool, not a dependency on clinic.js or heapdump. Shows the team writes their own observability tooling rather than adding dependencies.
