# Steal Inventory — codegraph — 2026-05-24

**Mode**: Full audit  
**Target**: `C:\Users\kumsatwi\Desktop\StEp\personalProject\codegraph`  
**Commit**: `4e34ba8 @ main`  
**Calibration verdict**: Novel/research (tree-sitter, SQLite/FTS5, MCP, graph traversal; deep audit)  
**Files scanned**: ~100 source files (full coverage; <1000 budget cap not hit)  
**Spot-check**: 3/3 PASS  
**Inventory rows**: 32  
**Audit date**: 2026-05-24  

**Bucket distribution**: A=4 | B=2 | C=13 | D=0 | E=9 | F=1 | G=3

> **Critical note**: codegraph's `package.json` lists `"projectcortex": "file:../LLM-Cortex"` as a production dependency. This is a **sister project** that already uses Cortex as its underlying package. The relationship is unidirectional today (codegraph→Cortex), but many codegraph patterns are direct candidates for Cortex adoption.

---

## E — Closes Known Flaws (sorted by score desc)

| ID | Score | Feature | Source | Closes Flaw | Confidence |
|----|-------|---------|--------|-------------|------------|
| E1 | 75 | validatePathWithinRoot + O_NOFOLLOW tmpdir symlink attack prevention | `src/mcp/tools.ts:197`, `src/utils.ts` | #51, #64 | **High** (tested) |
| E2 | 60 | CamelCase/snake_case compound identifier tokenizer + nameMatchBonus length-ratio scoring | `src/search/query-utils.ts:110-169`, `271-309` | #26 | **High** (tested) |
| E3 | 48 | Bounded Damerau-Levenshtein edit distance + stem variant expansion (-ing/-tion/-ment/-ies/-er) | `src/search/query-parser.ts:157-184`, `src/search/query-utils.ts:39-96` | #18 | **High** (tested) |
| E4 | 45 | Marker-delimited git hook sync (post-commit/merge/checkout, async background, PID guard) | `src/sync/git-hooks.ts:19-27`, `72-80` | Phase 0.10 | **High** (tested) |
| E5 | 45 | SERVER_INSTRUCTIONS in MCP initialize (concise playbook — not lobby prose) | `src/mcp/server-instructions.ts:18-67` | #41 | **High** |
| E6 | 36 | Schema migration system with schema_versions table (sequential, described, gated) | `src/db/migrations.ts:12-68` | #63, #86 | **High** |
| E7 | 32 | Field-qualified search query (kind:function path:src/api lang:python name:auth) | `src/search/query-parser.ts:34-147` | #34 | **High** (tested) |
| E8 | 32 | SQLite WAL mode + bounded busy_timeout (≤30s) + stale-PID lock detection + auto-cleanup | `__tests__/concurrent-locking.test.ts:41-55`, `src/utils.ts` (FileLock) | Phase 0.5 | **High** (tested) |
| E9 | 30 | Container node structural outline (class/struct → member signatures, not full body) | `src/mcp/tools.ts:40-42` (CONTAINER_NODE_KINDS) | #27 | **Medium** |

---

## C — Worth Stealing (Gap in Cortex, sorted by score desc)

| ID | Score | Feature | Source | Phase Fit | Confidence |
|----|-------|---------|--------|-----------|------------|
| C1 | 45 | Line numbers in explore output (cat -n style: `<linenum>\t<code>`) | `src/mcp/tools.ts:162-191` | Phase 13.6 complement | **High** |
| C2 | 45 | Path relevance scoring + test-file deprioritization (-15 unless query is about tests) | `src/search/query-utils.ts:175-247` | Phase 13.5 complement | **High** (tested) |
| C3 | 36 | V8 turboshaft WASM Zone OOM fix (`--liftoff-only`) + relaunch guard env var | `src/extraction/wasm-runtime-flags.ts:1-96` | Phase 0.13 prereq | **High** (tested) |
| C4 | 36 | isTestFile comprehensive multi-language detection (Python, Go, Java, Kotlin, directory patterns) | `src/search/query-utils.ts:208-247` | Phase 12.17 | **High** (tested) |
| C5 | 32 | Adaptive output budget (4 project-size tiers: <500, <5k, <15k, 15k+ files) | `src/mcp/tools.ts:55-158` | Phase 13 Token Economics | **High** (tested) |
| C6 | 30 | kindBonus per-kind scoring weights (function/method=10, interface=9, route=9, class=8…) | `src/search/query-utils.ts:316-342` | Phase 13.5 complement | **High** |
| C7 | 30 | WSL2 /mnt drive watch policy (detectWsl + isWindowsDriveMount, env override, testable WatchProbe) | `src/sync/watch-policy.ts:1-98` | Phase 0.8 / 5.6 | **High** (tested) |
| C8 | 24 | BFS structural edge priority sort (contains > calls > other; discovers internal structure first) | `src/graph/traversal.ts:88-91` | Phase 9 | **High** |
| C9 | 24 | Agent evaluation framework (recall/MRR, real-world corpus.json, PASS_THRESHOLD=0.5) | `__tests__/evaluation/` | Phase 0.11 | **High** |
| C10 | 24 | Rust crate/super/self path prefix stripping for symbol resolution | `src/mcp/tools.ts:28-32` | Phase 0.13 | **High** |
| C11 | 24 | CHANGELOG-driven release notes extraction script | `scripts/extract-release-notes.mjs` | Phase 12.11 | **Medium** |
| C12 | 18 | Multi-agent installer architecture (one-file-per-target, detect-all with fallback) | `src/installer/targets/registry.ts`, `types.ts` | Phase 0.15 | **High** (47 tests) |
| C13 | 6 | Self-contained bundled distribution (vendored Node per platform, zero native addons) | `BUNDLING.md`, `scripts/build-bundle.sh` | Phase 0.17 | **High** |

---

## B — Cortex Has Superior Version

| ID | Feature | Target approach | Cortex superior version |
|----|---------|-----------------|------------------------|
| B1 | `codegraph status` CLI (basic index stats) | Simple info command | Phase 0.7 (cortex doctor): deeper health checks, cycle detection, orphan flagging |
| B2 | FTS5 as search backend (keyword only) | BM25-ranked FTS5 | Phase 13.5 plans FTS5+BM25+RRF — more sophisticated pipeline with Levenshtein fallback |

---

## A — Already in Cortex

| ID | Feature | Cortex Phase |
|----|---------|-------------|
| A1 | Impact analysis / blast-radius traversal | Phase 6 ✅ |
| A2 | Context building for AI consumption | Phase 13 ✅ |
| A3 | Basic MCP server with multiple tools | Phase 4 ✅ |
| A4 | Graph traversal foundations (BFS/DFS) | Phase 9 (partial) ✅ |

---

## F — Anti-Pattern (Avoid)

| ID | Pattern | Source of lesson | Proposed addition |
|----|---------|-----------------|-------------------|
| F1 | Synchronous `execSync` in PreToolUse hooks (Cortex flaw #66) | codegraph `src/sync/git-hooks.ts:73-80` shows correct async alternative: `( codegraph sync >/dev/null 2>&1 & ) >/dev/null 2>&1` | Add to flaws.md: hooks should never block the event loop; async background always preferred |

---

## G — Open Questions

| ID | Question | Alternatives |
|----|---------|-------------|
| G1 | Should Cortex adopt codegraph as its underlying AST indexer layer? (codegraph already depends on Cortex; bidirectional integration is possible) | A) Cortex builds its own tree-sitter layer (Phase 0.13) independently; B) Cortex delegates all AST extraction to codegraph; C) optional bridge (Cortex uses codegraph when present, falls back to its own) |
| G2 | Should Cortex expose field-qualified search syntax (`kind:function path:src/api`)? | A) Yes, full query parser; B) Simple filters as separate tool params; C) No (too complex for KB-style search) |
| G3 | Should Cortex's output budgeting be project-size-adaptive (codegraph's 4-tier) or fixed? | A) Same 4-tier (files < 500/5k/15k/∞); B) User-configurable max; C) Token-budget-driven (not file-count) |

---

## Expected but Absent (Negative Space)

| Feature | In codegraph? | In Cortex? | Signal |
|---------|--------------|-----------|--------|
| Semantic/embedding similarity search | No (deliberate: 100% local, no LLM) | Planned Phase 18 | Cortex roadmap covers this; codegraph's absence is a design choice, not a gap |
| LLM-synthesized entity summaries | No (deterministic AST only) | Core feature (Phase 2) | Cortex's differentiator vs codegraph |
| Multi-repo federation | No | Planned Phase 11 | Both lack it |
| Temporal graph (git history) | No | Planned Phase 20.12 | Both lack it |
| Cross-file type inference (beyond name-matching) | No (best-effort name-matching) | No | Neither has real type inference |

---

## Surprises

- **A/B env var for line numbers**: `CODEGRAPH_EXPLORE_LINENUMS=0` disables line-number prefixing — designed for measuring payload-cost vs read-savings tradeoff. Very precise engineering discipline.
- **WatchProbe interface for testable policy**: `watchDisabledReason()` accepts a `WatchProbe` object (`{env, isWsl}`) so WSL detection can be overridden in tests without touching env vars or `/proc/version`. Clean testability pattern.
- **relaunchWithWasmRuntimeFlagsIfNeeded()**: Self-relaunch via `spawnSync` with `--liftoff-only`, guarded by `CODEGRAPH_WASM_RELAUNCHED` env var to prevent infinite loops. Handles the V8 turboshaft OOM that crashes tree-sitter compilation on Node 22+24.
- **agent-eval corpus.json**: A benchmark corpus mapping language + repo + architectural question, used for automated recall/MRR scoring. Codegraph treats search quality as a measurable engineering metric, not a qualitative judgment.

---

## Audit Limitations

- Flaws.md was read through flaw #89 of 117; flaws #90-117 were not read. Low risk: the last section header (`🔬 SECOND-PASS PROBES`) covered edge cases unlikely to yield new E-bucket candidates.
- `src/graph/queries.ts` was not read fully (first 200 lines only). Graph query patterns may contain additional scoring ideas.
- `src/mcp/tools.ts` was not read beyond line 200 (the actual tool handler implementations). Some tool-specific patterns may have been missed.
- `src/resolution/frameworks/` (14 framework route patterns) was not read — relevant to Cortex's Phase 9.5 (API Route Handler Analysis).
