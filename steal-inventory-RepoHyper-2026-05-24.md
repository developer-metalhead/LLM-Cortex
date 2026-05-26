# Steal Inventory — RepoHyper (2026-05-24)

**Mode**: Full audit (no prior inventory)
**Calibration**: Novel/research — arXiv 2403.06095, GNN-based repo-level code completion
**Target**: C:\Users\kumsatwi\Desktop\StEp\personalProject\RepoHyper
**Git SHA**: d2ba69a
**Files scanned**: 36 source files + README + requirements + ds_config.json
**Spot-check**: 3/3 pass
**Bucket distribution**: A=2 (7%), B=1 (4%), C=8 (29%), D=8 (29%), E=3 (11%), F=4 (14%), G=2 (7%)

---

## Headline Summary — Top E + Top C

| Bucket | Score | Name | Source | Gist |
|--------|-------|------|--------|------|
| E | 29 | Import-fallback text search for edge discovery | matching_repobench_graphs.py:81-97 | Finds reverse file->entity links by scanning import symbol names in code body text |
| E | 14 | PPR top-k subgraph extraction | subgraph_extractors.py:ppr_topk() | Personalized PageRank power iterations for relevance-ranked subgraph retrieval |
| E | 14 | BFS radius expansion from search centers | knn_search.py:ProximitySearchRadius | BFS from initial results with max_size cap to find parallel implementations |
| C | 29 | JSON-configured semantic expansion patterns | knn_search.py + patterns.json | Edge-type sequence allowlists per node type — config-driven graph traversal routing |
| C | 22 | k-hop subgraph via SparseTensor matrix power | subgraph_extractors.py:k_hop_subgraph() | Sparse adjacency matrix exponentiation for k-hop neighborhood |
| C | 19 | Swappable cosine vs MLP scoring decoder | GCN.py:RerankingDecoder | scoring_method param toggles cosine vs MLP — zero-overhead interface |
| C | 19 | Dataset-level pickle caching | train_gnn.py:53-60 | Check-then-load pattern for expensive graph preprocessing |
| C | 19 | Batched processing with .split(N) | repo_to_graph.py:~95 | Prevents OOM by splitting large batches before embedding |
| C | 19 | Dual metric search (Euclidean / cosine toggle) | knn_search.py:ProximitySearch | metric param switches search geometry — same interface |
| C | 10 | PyCG call graph + 2to3 fallback | generate_call_graphs.py:37-65 | Static call graph with Python2->3 auto-translation fallback |

---

## Bucket E — Closes Known Flaws

### E1 — PPR top-k subgraph extraction -> closes Flaw #26

**Source**: src/data/transform_utils/subgraph_extractors.py — ppr_topk() function
**What it does**: Personalized PageRank with power iterations and alpha restart. Returns top-k nodes ranked by PPR score from source set.
**Closes flaw**: Flaw #26 — cortex_find ranks by substring presence, not relevance. PPR gives principled graph-topology-aware ranking.
**Score**: severity=3, fit=3, effort=2, recency=0.8 -> **14**
**Confidence**: high (spot-checked)
**Counter-case**: PPR requires full adjacency matrix and power iteration budget. Cortex knowledge graph is sparse entity-level — PPR density assumptions may not hold at that granularity.

---

### E2 — Import-fallback text search for edge discovery -> closes Flaw #35

**Source**: scripts/data/matching_repobench_graphs.py:81-97 — finding_import_indexes_in_code()
**What it does**: Scans all import-candidate nodes checking if their .split(".")[-1] name appears in code body. Returns called_imported_indexes with frequency-based weights.
**Closes flaw**: Flaw #35 — No reverse lookup from file path -> entity. This resolves "which entity does this code reference" without requiring exact name matches.
**Score**: severity=3, fit=4, effort=1, recency=0.8 -> **29**
**Confidence**: high (spot-checked)
**Counter-case**: Text-based matching is fragile — matches function name "load" in non-import contexts. Tree-sitter already extracts imports more precisely; fallback adds noise when tree-sitter is available.

---

### E3 — BFS radius expansion from search centers -> closes Flaw #30

**Source**: src/repo_graph/search_policy/knn_search.py — ProximitySearchRadius class
**What it does**: Given initial search results, BFS-expands to neighborhood of radius with max_size cap. Returns expanded node set covering nearby related entities.
**Closes flaw**: Flaw #30 — Search for a generic concept misses parallel implementations. BFS from one match discovers co-implementations.
**Score**: severity=3, fit=3, effort=2, recency=0.8 -> **14**
**Confidence**: high (spot-checked)
**Counter-case**: BFS in a code graph (call/import edges) differs from BFS in a concept graph (usage/depends-on). Parallel implementations in Cortex are concepts sharing callers, not direct graph neighbors.

---

## Bucket C — Worth Stealing (Gaps)

### C1 — JSON-configured semantic expansion patterns (score 29)

**Source**: src/repo_graph/search_policy/knn_search.py:~180, src/repo_graph/search_policy/patterns.json
**What it does**: patterns.json defines allowed edge-type sequences per source node type. ProximitySearchPattern.walking() DFS-traverses matching edge sequences against allowlists.
**Phase placement**: Phase 7 Refinement (graph traversal routing)
**Score**: severity=3, fit=4, effort=1, recency=0.8 -> **29**
**Counter-case**: Cortex graph edges already typed at entity level — JSON config adds maintenance overhead over simple BFS.

### C2 — k-hop subgraph via SparseTensor matrix power (score 22)

**Source**: src/data/transform_utils/subgraph_extractors.py — k_hop_subgraph()
**What it does**: Computes k-hop neighborhood via sparse adjacency matrix exponentiation (A^k gives reachability in k hops).
**Phase placement**: Phase 7 Refinement or Phase 4 Refinement (blast radius)
**Score**: severity=3, fit=3, effort=1, recency=0.8 -> **22**
**Counter-case**: TypeScript rewrite of SparseTensor ops is non-trivial; graphology adjacency lists may suffice at Cortex scale (<500 entities).

### C3 — Swappable cosine vs MLP scoring decoder (score 19)

**Source**: src/models/GCN.py:35-60 — RerankingDecoder(scoring_method="cosine")
**What it does**: Single scoring_method param toggles cosine dot-product (Identity scorer) vs learned MLP. Same forward interface, different computation.
**Phase placement**: Future Phase (entity ranking / context pack prioritization)
**Score**: severity=2, fit=4, effort=1, recency=0.8 -> **19**
**Counter-case**: Cortex lacks entity ranking — swappable interface before any ranker exists is premature abstraction.

### C4 — Dataset-level pickle caching (score 19)

**Source**: train_gnn.py:53-60
**What it does**: Check-then-load — if not os.path.exists(cache_path): compute_and_save() else: load(). Caches entire preprocessed dataset.
**Phase placement**: Phase 3 Refinement (caching) or Phase 0 Refinement (graph preprocessing)
**Score**: severity=2, fit=4, effort=1, recency=0.8 -> **19**
**Counter-case**: Cortex already uses mtime-based stale detection; additional pickle cache duplicates state management.

### C5 — Batched processing with .split(N) (score 19)

**Source**: src/repo_graph/repo_to_graph.py:~95 — embed_code_unix_dict()
**What it does**: embeddings.split(256) chunks large batch before embedding to avoid OOM. Concatenates results after.
**Phase placement**: Phase 3 Refinement (LLM batch processing) or bulk ingest path
**Score**: severity=2, fit=4, effort=1, recency=0.8 -> **19**
**Counter-case**: Cortex LLM calls are token-window-limited not GPU-memory-limited; .split() for GPU OOM doesn't translate to API throughput management.

### C6 — Dual metric search (Euclidean / cosine toggle) (score 19)

**Source**: src/repo_graph/search_policy/knn_search.py — ProximitySearch metric parameter
**What it does**: metric="cosine" vs metric="euclidean" changes distance function for KNN. Same interface, different geometry.
**Phase placement**: Future Phase (semantic search)
**Score**: severity=2, fit=4, effort=1, recency=0.8 -> **19**
**Counter-case**: Cortex does not use vector search in core path; applies only if semantic embedding search added (Phase 22+).

### C7 — PyCG call graph + 2to3 auto-translation fallback (score 10)

**Source**: scripts/data/generate_call_graphs.py:37-65
**What it does**: Generates static call graph with PyCG. If Python 3 analysis fails, 2to3 translates and retries. Parallel via joblib 30 threads.
**Phase placement**: Phase 0 Refinement (call graph extraction)
**Score**: severity=2, fit=3, effort=2, recency=0.8 -> **10**
**Counter-case**: PyCG and 2to3 are Python-specific; Cortex handles TypeScript. Retry-with-translation pattern is valuable but not directly reusable.

### C8 — Five-typed edge Code Property Graph (score 6, low-confidence)

**Source**: src/repo_graph/repo_to_graph.py:load_contexts_then_embed() — 5 typed edge dicts
**What it does**: CPG with 5 typed edge categories: 0=file->import, 1=call, 2=code->fn_call, 3=ownership, 4=class->method.
**Phase placement**: Phase 22+ (graph schema upgrade)
**Score**: severity=4, fit=2, effort=3, recency=0.8 -> **6**
**Counter-case**: Cortex entity graph is at module/class level; regraining to function/call-site level requires full re-ingestion redesign.

---

## Bucket F — Anti-Patterns (Avoid)

### F1 — Hardcoded absolute paths for grammar/data
Pattern: Language('/datadrive05/huypn16/treesitter-build/python-java.so', 'python') in parse_source_code.py:1 and matching_repobench_graphs.py:16
Why bad: Breaks on any machine that is not the researcher server. Zero reproducibility.
Proposed addition: Never hardcode data or model paths — derive from config or env var with local default.

### F2 — Module-level hardcoded device = "cuda:0"
Pattern: Top-level device = "cuda:0" in repo_to_graph.py
Why bad: Silent failure on CPU-only environments; not overridable without source edit.
Proposed addition: Derive device from os.environ.get("DEVICE", "cpu") or argparse argument.

### F3 — LLMModel.__init__ missing self parameter
Pattern: src/llm.py:8 — def __init__(model_name): — self not declared, self.llm used inside
Why bad: Python bug — __init__ receives model_name as self. LLMModel() raises TypeError at runtime.
Proposed addition: Always exercise every class constructor in at least one test.

### F4 — os.chdir() in scripts
Pattern: generate_call_graphs.py:47,60 — os.chdir() before PyCG
Why bad: Mutable global cwd breaks concurrent execution; makes paths fragile.
Proposed addition: Pass cwd= to subprocess.run() instead of os.chdir().

---

## Bucket G — Open Questions

### G1 — PyCG complementary or redundant with tree-sitter for TypeScript?
Is there a TypeScript equivalent (ts-morph? dependency-cruiser?) giving Cortex typed call edges without tree-sitter post-processing?
Alt A: dependency-cruiser produces JSON call/import graphs for TypeScript — drop-in for Phase 7.
Alt B: tree-sitter + regex call site detection sufficient for Cortex granularity.
Alt C: Skip call graphs — entity-level graph already captures most dependencies.

### G2 — Should impact_analysis use PPR instead of BFS?
Cortex impact_analysis returns all transitively affected entities without ranking. Should PPR replace BFS to surface most-affected entities first?
Alt A: Yes — PPR surfaces high-centrality dependents (blast radius core). Implement Phase 7.
Alt B: No — PPR convergence too costly for interactive tool use. Sort by depth instead.
Alt C: Hybrid — BFS traversal + sort by incoming-edge count as PPR proxy.

---

## Expected But Absent

| Expected feature | Present? | Cortex signal |
|-----------------|---------|---------------|
| Incremental graph updates | No (batch-only) | Cortex advantage (mtime stale detection) |
| Multi-language support | No (Python only) | Cortex advantage (Phase 0.13 TS/Python) |
| Test suite | No (zero test files) | Validates Cortex 100% test coverage mandate |
| Streaming completions | No (offline batch) | N/A |
| Online model hot-swap | No | Cortex Phase 33.1 advantage |

---

## Bucket A — Already in Cortex

| Feature | Cortex phase |
|---------|-------------|
| Tree-sitter parsing for code structure | Phase 0 (KnowledgeManager) |
| Entity-based graph with named nodes | Phase 0 (state.json + entity pages) |

---

## Bucket B — Cortex Has Superior Version

B1 — Entity-based knowledge graph
Target: Flat index_to_name dict. O(1), minimal metadata.
Cortex: Entity pages with Role/Interface/Behavior/Wiring sections.
Steel-man: RepoHyper flat map is faster for graph ops (no disk I/O); Cortex disk-based entities are slower at traversal time.

---

## Bucket D — Niche / Wrong Fit

| Feature | Violated Cortex principle |
|---------|--------------------------|
| HGT hetero-GNN encoder | Local-first (requires GPU training) |
| ELPH MinHash+HLL hash tables | Local-first + LLM-cost-conscious |
| UniXcoder mode-prefixed tokenization | Local-first (specific HF model) |
| SubgraphsTransform + GNNAK/PPGN pipeline | Local-first (ML training infra) |
| DeepSpeed ZeRO Stage 3 | Local-first (distributed server) |
| Temperature-scaled NLL loss | Local-first (training-time) |
| Node2Vec random walk | Local-first (embedding training) |
| Hard-negative mining (import_indexes) | Local-first (training-time) |

---

## Themes

**Architectural**: Search-Expand-Refine is a clean 3-stage pipeline with each stage independently swappable. This modularity pattern is worth adopting in Cortex search path.
**Operational**: Everything batch/offline — no incremental, streaming, or daemon. Cortex advantage.
**Performance**: GPU-first with hardcoded CUDA assumptions. Batching with .split() is the only memory management.
**Testing**: Zero test files — validates Cortex 100% test coverage mandate as a hard rule.
**DX**: argparse, wandb, joblib. Server-scale assumptions throughout.

---

## Recommended Next Actions (by score)

1. **Implement import-fallback text search** (E2, score 29) — closes Flaw #35. ~50 lines TS, drop-in to Phase 7 graph builder.
2. **Add JSON expansion patterns config** (C1, score 29) — closes graph traversal gap. ~50 lines TS + 1 config file.
3. **Add k-hop subgraph via adjacency matrix power** (C2, score 22) — closes blast radius gap. ~100 lines TS in Phase 7.
4. **Consider PPR ranking for cortex_find** (E1, score 14) — closes Flaw #26. ~100 lines TS, iterative.
5. **Add BFS radius expansion to cortex_find** (E3, score 14) — closes Flaw #30. ~100 lines TS.

---

## Audit Limitations

- inspect.ipynb not read — may contain ablation results showing which graph features matter most
- src/models/PPGN.py, pyg_gnn_wrapper.py, src/models/utils.py not fully read — additional GNN variants may exist
- src/data/dataset_codet5.py not read — CodeT5 dataset variant may differ
- Mtime unavailable (Windows scan) — recency=0.8 applied uniformly as proxy for >6 month research codebase
- No GitHub Actions/CI found — confirms research-grade prototype
