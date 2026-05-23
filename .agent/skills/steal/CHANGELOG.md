# Steal Skill Changelog

## 2.1 — 2026-05-23 (current)

Optimization pass. MCP integration removed (bugged on external targets). Twelve new optimizations added across coverage, efficiency, robustness, and output quality.

### Added
- **Step 0.7 — Pre-flight skim** (depth calibration: boilerplate / standard / novel/research)
- **Step 1.5 — Hot-path identification** — read load-bearing files FIRST (size + git churn + import centrality)
- **Step 2c public-surface-first pass** — for files >500 lines, read top-of-file first; deep-read only on signal
- **Step 2c stratified sampling** — for huge targets (>5000 files), 100% core + 1-in-5 peripheral
- **Step 2.5 mtime file cache** — `steal-inventory-<target>-files.json` for more reliable diff-mode than `git diff`
- **Step 2.5 cross-audit ledger** — `~/.cortex/steal-ledger.json` records every audit; features appearing in 3+ ledger entries get a severity boost
- **Step 6 recency + test-coverage signals** — `last_modified` (mtime) and `has_tests` (boolean) captured per finding; feed confidence and score
- **Step 6 score formula extended with recency factor** — `score = severity × fit × (4 − effort) × recency`
- **Step 6.5 — Hallucination spot-check** — pick 3 random C/E items, re-Read cited 3-line window, fail loud on mismatch
- **Step 7 Headline Summary table** — top-10 E + top-10 C at the top of the report; 30-second user gist
- **Step 7 Diff-mode delta highlights** — new items, bucket migrations, disappearances, score deltas ≥15
- **Step 7.5 — Integration scratch artifact** — `steal-integration-<target>-<date>.md` with paste-ready flaws.md + implementation_plan.md entries
- **Argument flags** — `--quick`, `--paranoid`, `--headline-only`, `--resume` (in addition to existing `--full`)
- **Checkpoint sidecar** — `steal-checkpoint-<target>.json` for `--resume` support
- **Progress streaming** — `[12/47] read src/parsers/python.ts — 3 features` lines during long scans
- **Anti-pattern grep additions** in `reference/grep-patterns.md` (eval, deprecated markers, empty catch, race-condition smells, default-secret patterns, type-system bypass)

### Removed
- **Cortex MCP integration** — `read_knowledge_index` / `cortex_find` / `source` calls and Rule 22 stripped. These tools are scoped to Cortex itself and produce misleading results on external projects.

### Changed
- Skill version bumped to 2.1
- Rules expanded from 23 → 27 to cover hot-path priority, public-surface-first, no-MCP, integration scratch, cross-audit ledger
- Report template reordered: headline summary now precedes detailed sections
- Inventory schema (`reference/inventory-schema.json`) extended with `last_modified`, `has_tests` fields per feature

---

## 2.0 — 2026-05-23 (earlier)

Major restructuring: reference-file extraction + Cortex MCP integration (later reverted).

### Added (kept)
- Reference files: `report-template.md`, `grep-patterns.md`, `domain-cheatsheets.md`, `inventory-schema.json`, `explore-agent-prompt.md`, `worked-example.md`
- Step 0.5 relevance gate
- Step 8 audit-the-auditor
- Phase enumeration cache via `.cortex-phases.json`
- Budget enforcement (1000 reads, 5 agents, 200 rows, 50 greps)
- Partial-audit mode

### Reverted in 2.1
- Cortex MCP integration (was Rule 22 + a dedicated section). Removed because MCP scope is Cortex itself, not external targets.

---

## 1.0 — 2026-05-23 (initial robust version)

### Added
- Diff/incremental mode via prior-inventory detection
- JSON inventory sidecar
- Bucket F (Anti-patterns) and Bucket G (Open questions)
- Step 4.5 Negative-space scan with domain cheat-sheets
- Step 6 steel-man / counter-case mandate
- Step 6 composite scoring (severity × fit × (4 − effort))
- Anti-pattern grep library

---

## 0.x — initial draft

Basic 6-step workflow with 5-bucket categorization (A/B/C/D/E), anti-miss checklist, 9-category grep library.
