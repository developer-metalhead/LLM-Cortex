# Steal Inventory — CodeGraphContext (2026-05-24)

**Mode:** Full audit (no prior inventory)  
**Calibration:** Novel/research — Tree-sitter, graph DB, MCP, 20+ languages, 100+ source files  
**Target:** `C:\Users\kumsatwi\Desktop\StEp\personalProject\CodeGraphContext` @ `6daffa6` (branch: main)  
**Files scanned:** ~100 Python source files + docs + website skeleton  
**Spot-checks:** 3/3 PASS (calls.py:16, post_resolution.py:29, watcher.py:188)  
**Hallucination check:** CLEAR  

---

## Bucket Distribution

| Bucket | Count |
|--------|-------|
| A (Already in Cortex) | 7 |
| B (Cortex superior) | 2 |
| C (Worth stealing) | 10 |
| D (Wrong fit) | 3 |
| E (Closes flaw) | 1 |
| F (Anti-pattern) | 3 |
| G (Open question) | 2 |
| **Total** | **28** |

---

## Headline Summary (Top E + Top C)

| Bucket | Score | Name | Source File | Gist |
|--------|-------|------|-------------|------|
| **E1** | 48 | Portable camelCase/snake_case fuzzy normalization | `code_finder.py:29-40` | Min of raw vs. separator-stripped Levenshtein; closes Flaw #18 |
| **C1** | 45 | Generic config file node indexing | `graph_builder.py:73-80` | .toml/.yaml/.sh/Dockerfile/Makefile become minimal File nodes |
| **C2** | 36 | CGC_REPORT generation pattern | `CGC_REPORT.md` + `code_finder.py` | God nodes, cross-module AMBIGUOUS edges, dead code, Cypher playbook per finding |
| **C3** | 32 | O(k) incremental watcher update | `watcher.py:188-295` | Re-parses only changed file + affected callers/inheritors, not whole repo |
| **C4** | 24 | Post-resolution via inheritance + embeddings | `post_resolution.py:1-206` | Tier 10/11 re-resolve low-confidence CALLS using INHERITS graph + ANN |
| **C5** | 24 | Spring DI semantic edges | `schema_contract.py:47-50` | INJECTS, EXPOSES_ENDPOINT, PROVIDES_BEAN from code annotations |
| **C6** | 24 | Job ETA estimation + idempotency guard | `jobs.py:57-63, 106-121` | `estimated_time_remaining` property + `find_active_job_by_path()` |
| **C7** | 24 | JVM/JS/C++ language-family compatibility | `calls.py:64-80` | `languages_are_compatible()` prevents false negatives in cross-lang calls |
| **C8** | 24 | Schema contract as frozen set | `schema_contract.py:1-70` | NODE_LABELS + RELATIONSHIP_TYPES as frozensets for runtime validation |
| **C9** | 18 | 11-tier confidence labels on CALLS edges | `calls.py:13-34` | EXTRACTED/INFERRED/AMBIGUOUS queryable on graph edge property |
| **C10** | 16 | Pre-scan registry (extension dispatch) | `pre_scan.py:11-116` | Lazy singleton registry dispatching import pre-scans by file extension |

---

## BUCKET E — Closes a Known Flaw

### E1 — Portable camelCase/snake_case Fuzzy Normalization
**Source:** `src/codegraphcontext/tools/code_finder.py:29-244`  
**Flaw closed:** Flaw #18 (`cortex_find` returns "No matches" instead of fuzzy suggestions)  
**Confidence:** High (has_tests: partial — tested via integration; last_modified: recent)  
**Score:** 48 (severity=4, fit=4, effort=1, recency=1.0)  
**Phase:** New Phase — or Phase 13.5 Refinement  

**What it does:**
- `_normalize_identifier(s)` strips all `_` and ` ` and lowercases — so `my_function`, `myFunction`, `MyFunction` all map to `myfunction`.
- Fuzzy search computes BOTH `levenshtein(q_raw, name.lower())` AND `levenshtein(q_norm, name_norm)` and takes the **minimum**.
- This prevents the "distance inflation" bug: `my_functon` vs `myFunction` under raw Levenshtein has distance 3 (underscore + spacing); under normalized it's 1 (typo in "functon").
- Falls back gracefully: for backends with native full-text (Neo4j) uses Lucene; for others (KuzuDB, FalkorDB) uses this portable pure-Python implementation.

**Counter-case:** The normalized form loses word-boundary information — `setUser` and `userSet` both normalize to `setuser` / `userset`, which are 2 apart, same as `setUser` vs `setUse`. For pathological cases this produces false fuzzy matches. A trie or n-gram approach would be more precise but is 3× harder.

**Passes Cortex principles filter:** Yes — local-first, zero third-party API, no LLM required.

**To paste into flaws.md:** `+ New Phase Refinement — Portable camelCase/snake_case Normalization for cortex_find (CodeGraphContext audit, score: 48)`

---

## BUCKET C — Worth Stealing

### C1 — Generic Config File Node Indexing (score: 45)
**Source:** `src/codegraphcontext/tools/graph_builder.py:73-80`  
**Confidence:** High  
**Score:** 45 (severity=3, fit=5, effort=1, recency=1.0)  
**Phase:** Phase 0.13 Refinement  

**What it does:** `generic_extensions` set includes `.toml`, `.yaml`, `.yml`, `.sh`, `.json`, `.ini`, `.cfg`, `.md`, `.txt`, `.env`, `.bat`, `.ps1`, `.dockerignore`, `.gitignore`; `generic_filenames = {"Dockerfile", "Makefile"}`. These become minimal `File` nodes in the graph even without parser support. This means the graph captures infrastructure files as nodes that can be IMPORTS-linked from code.

**Counter-case:** Creates noise nodes with no semantic content — a `.gitignore` File node with zero edges adds query overhead. Cortex's `.knowledge/` graph is semantic-first; polluting it with blank config nodes may degrade signal-to-noise.

### C2 — CGC_REPORT Generation Pattern (score: 36)
**Source:** `CGC_REPORT.md` + `src/codegraphcontext/tools/code_finder.py:135-162`  
**Confidence:** High  
**Score:** 36 (severity=3, fit=4, effort=1, recency=1.0)  
**Phase:** Phase 7.8 Refinement  

**What it does:** Generates a structured markdown report with: (1) God Nodes (highest fan-in), (2) Most Complex Functions (cyclomatic > 10), (3) Cross-Module Connections annotated with confidence labels (AMBIGUOUS marked explicitly), (4) Potential Dead Code, (5) Suggested Cypher queries per finding type. Report includes template Cypher for "most-injected Spring beans" and "CALLS edges with low confidence."

**Counter-case:** Cortex's graph is conceptual (entities/relationships), not structural (functions/CALLS). Porting CGC_REPORT's "god nodes" concept to Cortex means "which entity pages are referenced by the most other entities" — possible but semantics differ. Cortex's Phase 7.8 already plans Review Advisories; this is an implementation template, not a new idea.

### C3 — O(k) Incremental Watcher Update (score: 32)
**Source:** `src/codegraphcontext/core/watcher.py:188-295`  
**Confidence:** High  
**Score:** 32 (severity=4, fit=4, effort=2, recency=1.0)  
**Phase:** Phase 1 Refinement — O(k) Incremental File Watcher  

**What it does:** When a file changes, the algorithm:
1. Queries the graph for callers/inheritors of changed file BEFORE deleting nodes.
2. Updates `imports_map` for only the changed file (single file scan).
3. `DETACH DELETE` cleans up all CALLS/INHERITS on changed file's nodes.
4. Deletes outgoing CALLS from affected caller files.
5. Re-parses only the affected subset (changed file + callers + inheritors).
6. Gets full-repo class lookup from DB (no re-parse of all files).
7. Re-creates CALLS/INHERITS for the subset only.

This is **O(k)** where k = affected files, vs Cortex's presumed **O(n)** full re-index on file change.

**Counter-case:** Cortex's "graph" is LLM synthesis of entities, not AST-derived CALLS edges. The incremental re-link algorithm assumes structural edges (CALLS, INHERITS) that are transitive-affected by a file change. If Cortex's Phase 1 only re-ingests the changed file into LLM synthesis, there's less of a "transitive link" problem. The O(k) optimization applies mainly to structural graph maintenance.

### C4 — Post-Resolution via Inheritance + Embeddings (score: 24)
**Source:** `src/codegraphcontext/tools/indexing/resolution/post_resolution.py`  
**Confidence:** High  
**Score:** 24 (severity=4, fit=3, effort=2, recency=1.0)  
**Phase:** Phase 0.13 Refinement — Multi-pass Edge Resolution  

**What it does:** After the initial CALLS graph is written, re-examines edges with confidence tiers 8/9 (lowest confidence). Uses the INHERITS graph to narrow candidates — if there's only one implementation outside the caller file, or only inheriting candidates, resolves to that. As final tiebreaker, calls VectorResolver with ANN similarity. Batches all re-resolution in a single UNWIND query to avoid N round-trips.

**Counter-case:** Cortex doesn't currently have a structural CALLS graph — this applies only if Phase 0.13 ships multi-language parsers that produce CALLS edges. Premature to implement until the structural graph exists.

### C5 — Spring DI Semantic Edges (score: 24)
**Source:** `src/codegraphcontext/tools/indexing/schema_contract.py:47-50`  
**Confidence:** Medium ⚠ low-confidence (no direct test file found for Spring DI extraction)  
**Score:** 24 (severity=3, fit=4, effort=2, recency=1.0)  
**Phase:** Phase 0.13 Refinement — Framework-Aware Semantic Edges  

**What it does:** Defines `INJECTS`, `EXPOSES_ENDPOINT`, `PROVIDES_BEAN` relationships extracted from Java `@Autowired`, `@GetMapping`, `@Bean` annotations. These aren't structural (AST call edges) but semantic (framework-contract edges). Lets queries ask "what beans are injected into this component?" without reading code.

**Counter-case:** Framework-specific edges lock the schema to Spring's vocabulary. Cortex's multi-language Phase 0.13 would need equivalent extraction rules per framework (Django, Rails, Laravel, etc.) — 5× scope expansion. Better to define a generic `FRAMEWORK_INJECTS` / `EXPOSES_ENDPOINT` edge type and plug framework rules in as language-parser extensions.

### C6 — Job ETA Estimation + Idempotency Guard (score: 24)
**Source:** `src/codegraphcontext/core/jobs.py:57-63, 106-121`  
**Confidence:** High  
**Score:** 24 (severity=2, fit=4, effort=1, recency=1.0)  
**Phase:** Phase 1 Refinement — Job Manager Enhancements  

**What it does:** `estimated_time_remaining` property: divides elapsed time by files processed to predict completion. `find_active_job_by_path()`: before creating a new indexing job, checks if an active (PENDING/RUNNING) job for that path already exists — prevents duplicate indexing of the same repo. `cleanup_old_jobs(max_age_hours=24)`: bounded growth, removes completed jobs older than 24h.

**Counter-case:** Cortex's operations are mostly LLM synthesis (seconds per file), not file I/O (milliseconds per file). ETA based on "files processed" may mislead if LLM latency is the bottleneck, not file parsing speed.

### C7 — JVM/JS/C++ Language-Family Compatibility (score: 24)
**Source:** `src/codegraphcontext/tools/indexing/resolution/calls.py:64-80`  
**Confidence:** High  
**Score:** 24 (severity=2, fit=4, effort=1, recency=1.0)  
**Phase:** Phase 0.13 Refinement — Cross-Language Edge Gating  

**What it does:** `languages_are_compatible(lang1, lang2)` returns True for same-family pairs: `{java, kotlin}`, `{c, cpp}`, `{javascript, typescript}`. Prevents false-negative CALLS edges where a `.kt` function calling a `.java` function is rejected because "languages don't match." Drop-in complement to Phase 0.3 Refinement (Cross-Language Edge Gating).

**Counter-case:** This is already planned in Phase 0.3 Refinement (Cross-Language Edge Gating from Graphify audit). Risk of duplication if that refinement already implements family compatibility.

### C8 — Schema Contract as Frozen Set (score: 24)
**Source:** `src/codegraphcontext/tools/indexing/schema_contract.py:1-70`  
**Confidence:** High  
**Score:** 24 (severity=2, fit=4, effort=1, recency=1.0)  
**Phase:** Phase 0.2 Refinement  

**What it does:** `NODE_LABELS = frozenset({...})` and `RELATIONSHIP_TYPES = frozenset({...})` as canonical frozen sets. Any backend or parser that writes a label not in these sets is caught by a simple `assert label in NODE_LABELS`. Merge keys are named constants (`FUNCTION_MERGE_KEYS = ("name", "path", "line_number")`). This is schema-as-documentation that doubles as runtime validation.

**Counter-case:** Cortex's schema is currently in `.knowledge/` and is more fluid — entities evolve via LLM synthesis. Freezing node labels in a constant precludes dynamic schema evolution. Better to treat this as a "known-safe" allowlist that warns but doesn't error on unknown labels.

### C9 — 11-Tier Confidence Labels on CALLS Edges (score: 18)
**Source:** `src/codegraphcontext/tools/indexing/resolution/calls.py:13-34`  
**Confidence:** High  
**Score:** 18 (severity=3, fit=3, effort=2, recency=1.0)  
**Phase:** Phase 0.13 Refinement  

**What it does:** `_TIER_CONFIDENCE` dict maps resolution tiers 1–9 to confidence 1.00–0.08. `_confidence_label()` maps to EXTRACTED/INFERRED/AMBIGUOUS. These are written as properties on CALLS edges (`.confidence`, `.confidence_label`, `.resolution_tier`), enabling queries like `WHERE c.confidence_label = 'AMBIGUOUS'`.

**Counter-case:** Requires Phase 0.13 structural CALLS graph to exist. Premature until the graph has CALLS edges.

### C10 — Pre-scan Registry (Extension Dispatch) (score: 16)
**Source:** `src/codegraphcontext/tools/indexing/pre_scan.py:11-116`  
**Confidence:** High  
**Score:** 16 (severity=2, fit=4, effort=2, recency=1.0)  
**Phase:** Phase 0.13 Refinement  

**What it does:** Lazy-initialized singleton `_PRESCAN_REGISTRY` maps file extensions to pre-scan callables. Groups files by extension, dispatches per-extension scan functions (which build a global symbol→file import map), merges results. Avoids importing all language modules at startup — only loads them on first use.

**Counter-case:** Cortex uses a simpler file-discovery pattern today; the registry pattern is more valuable when the number of supported languages grows past ~10. Implement after Phase 0.13 adds the parsers.

---

## BUCKET A — Already in Cortex

| ID | Feature | Cortex Phase |
|----|---------|--------------|
| A1 | SCIP Ingest | Phase 0.19 (planned) |
| A2 | Multi-Language Tree-sitter Extractors | Phase 0.13 (done) |
| A3 | `doctor` CLI Health Check | Phase 0.7 (done) |
| A4 | MCP Server (JSON-RPC over stdio) | Phase 4 (done) |
| A5 | File System Watcher | Phase 1 (done) |
| A6 | Git Hook Integration | Phase 0.10 (done) |
| A7 | Confidence Labels (EXTRACTED/INFERRED/AMBIGUOUS) | Phase 0.3 (done — on entities, not CALLS edges) |

---

## BUCKET B — Cortex Has Superior Version

### B1 — LLM Knowledge Synthesis
CGC is pure structural (AST nodes/edges). Cortex synthesizes semantic Role/Interface/Behavior/Wiring pages via LLM. CGC's approach is zero-cost and instant; Cortex's is richer but expensive.  
**Case for CGC:** Structural extraction is deterministic and doesn't hallucinate. An LLM describing `AuthService.authenticate()` can confabulate behaviors; Tree-sitter parsing cannot.

### B2 — System Prompt / Persona
CGC's `prompts.py` is a single-role "expert AI pair programmer" prompt with schema reference and SOPs. Cortex Phase 4.8 plans persona-specific prompts (junior/senior/domain-expert, etc.) — clearly superior scope.  
**Case for CGC:** CGC's embedded graph schema reference (showing node labels + property names) directly in the prompt is a good pattern — agents need this for Cypher query formulation. Cortex could adopt this for its own `execute_cypher_query` tool.

---

## BUCKET D — Niche / Wrong Fit

### D1 — Database Schema Ingestion (MySQL/Redis/Cassandra)
Requires live external DB connections. Violates Cortex principles: **Local-first** (requires running MySQL/Redis/Cassandra server) and **No third-party API for core**. Phase 22+ territory.

### D2 — Website with In-Browser Parsing (Vercel serverless)
Requires Vercel deployment, GitHub API, CDN. Violates **Local-first** + **No third-party API for core**.

### D3 — Bundle Registry (GitHub Releases-backed)
Requires GitHub Releases API for download/upload. Violates **No third-party API for core**. Cortex's Phase 4.9 plans ecosystem GTM surface separately.

---

## BUCKET F — Anti-Patterns (Avoid)

### F1 — 16 `*_toolkit.py` Stubs All Raise `NotImplementedError`
**Source:** `src/codegraphcontext/tools/query_tool_languages/*.py` (16 files)  
All 16 per-language toolkit files contain only `raise NotImplementedError` in their public API. They are routed from `advanced_language_query_tool.py` (104 lines) but can never succeed. This is dead code masquerading as planned functionality.  
**Why target chose this:** Placeholder-driven development — stubs were written to define the interface before implementing it. Good intention, but without a test forcing implementation, stubs accumulate.  
**Cortex risk:** Cortex has similar stubs (Phase X.Y planned phases). Ensure Phase DoD requires at minimum one working code path, not just a module stub.

### F2 — Ruby Test Fixture Expects Undefined `graph` Fixture
**Source:** `tests/unit/languages/test_mixins.py` (per ARCHITECTURE.md limitation L19)  
Test will fail silently if collected (fixture `graph` is undefined). Masked by not being collected in normal CI runs.  
**Why target chose this:** Test written before the fixture system was standardized; not caught because test skipping was implicit.

### F3 — E2E Tests with Commented-Out Assertions
**Source:** `tests/e2e/` (per ARCHITECTURE.md limitation L21)  
Some E2E test assertions are commented out, producing false passes — the test reports "PASS" without actually verifying behavior.  
**Why target chose this:** Tests were written optimistically, then disabled when behavior changed, never re-enabled.  
**Proposed flaws.md addition:** "Never comment-out test assertions as a fix. Either fix the assertion or delete the test."

---

## BUCKET G — Open Questions

### G1 — Should Cortex Apply Confidence Scoring to Synthesized-Entity Links?
CGC applies EXTRACTED/INFERRED/AMBIGUOUS to structural CALLS edges. Should Cortex apply an analogous confidence to its synthesized `Wiring` relationships (e.g., "CortexMCPServer wires to CortexDaemon")?  
Alternatives: (a) yes, emit confidence on every link in Wiring sections; (b) use `AMBIGUOUS` only when the synthesis LLM hedges ("possibly", "may", "unclear"); (c) leave confidence on entities only (Phase 0.3 already done).

### G2 — Per-File Embedding Invalidation vs. Full Repo Re-embed
CGC's watcher calls `embed_pipeline.run(str(self.repo_path))` after each file change — this re-embeds ALL un-embedded functions in the repo, not just the changed file. For a large repo this could mean hundreds of embedding calls per file save.  
Alternatives: (a) only re-embed functions in the changed file (CGC has `invalidate_for_file()` but then calls `run()` on the whole repo); (b) queue per-file embedding jobs and batch them; (c) disable auto-embedding on file change, only embed on explicit user request.

---

## Expected-but-Absent

Based on domain (code-graph + MCP + AI assistant):

| Feature | In CGC? | In Cortex? | Notes |
|---------|---------|-----------|-------|
| Incremental SCIP indexing | ❌ Always full re-index | ❌ | Both miss this |
| Cross-repo symbol resolution | ❌ | ❌ Phase 0.15 | Neither has this end-to-end |
| Token-budget pre-flight warning | ❌ | ✅ Phase 0.11 Refinement | Cortex ahead |
| Structured entity schema validation | ❌ | ✅ Phase 0.2 | Cortex ahead |
| Semantic similarity search | ⚠️ Only via Neo4j vector index | ❌ Phase 18 | Both partial |

---

## Surprises

**1. Kotlin ambiguity summarizer in CodeFinder** (`code_finder.py:43-124`): CGC has a dedicated `summarize_kotlin_call_ambiguity()` function that groups multi-target CALLS edges by callsite and sorts by target count. This shows that Kotlin's extension function resolution produces many ambiguous edges — a known hard problem. The function surface this explicitly as a queryable audit tool.

**2. `STARTS WITH` safety pattern** (`post_resolution.py:51-52`): CGC consistently normalizes repo paths as `repo_path.rstrip("/") + "/"` before using `STARTS WITH` in Cypher. This prevents `/opt/repos/myapp` from accidentally matching `/opt/repos/myapp_extra`. Simple, effective, worth adopting in Cortex's path filtering.

**3. Thread-local parser cache** (`graph_builder.py:83`): `self._parsed_cache = threading.local()` — parsers are created per-thread (because Tree-sitter parsers aren't thread-safe). This is a subtle thread-safety invariant done correctly.

---

## Audit Limitations

- Website source (`website/`) not deeply read — TypeScript/React components likely contain additional graph visualization patterns.
- `tests/` glob returned no results (Windows path issue) — test coverage signals estimated from ARCHITECTURE.md descriptions, not direct test file reading.
- SCIP pipeline (`scip_indexer.py`, 468 lines; `scip_pb2.py`, 2456 lines) not deeply read — likely contains additional resolution techniques.
- `cassandra_ingester.py` not read — may contain additional datasource patterns similar to mysql/redis.
- Language parsers (20 × ~500 lines each) read only via summaries in ARCHITECTURE.md, not individually.
