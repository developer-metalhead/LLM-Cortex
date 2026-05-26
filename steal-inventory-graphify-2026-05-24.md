# Steal Inventory — graphify v0.8.15 — 2026-05-24

**Mode**: Full audit | **Calibration**: Novel/research | **Scan**: 27 files across 33 core source files  
**Git**: `b3474924` @ v8 branch (2026-05-22)  
**Spot-check**: PASS (5/5 items confirmed at file+line) | **Hallucination check**: PASS (3/3)  
**Bucket distribution**: A=10, B=2, C=16, D=5, E=3, F=2, G=1 | Total=39

> **Context**: graphify is a prior major inspiration source for Cortex — Phases 0.1 through 0.17, 7 Refinement, 9.1, 10.10, and 14.1 were all directly derived from graphify patterns. This audit targets v0.8.15 on the v8 branch, which introduced ~12 new modules since Cortex's prior absorption: hooks.py, symbol_resolution.py, semantic_cleanup.py, global_graph.py, wiki.py, prs.py, diagnostics.py, manifest.py, multigraph_compat.py, affected.py, scip_ingest.py, and multigraph_compat.py.

---

## Headline Summary

| Bucket | Score | Name | Source | Gist |
|--------|-------|------|--------|------|
| C | 60 | Sensitive File Detection | `detect.py:42` | Two-stage: parent-dir frozenset + regex lookarounds for secrets |
| C | 60 | Dedup Variant-Pair Guards | `dedup.py:55` | Blocks false merges on chip SKUs and short-label length-differing pairs |
| C | 45 | Stat-Based Mtime Fastpath | `cache.py:27` | Skip SHA256 when size+mtime_ns unchanged (make-style) |
| C | 45 | Dynamic Seed Selection | `serve.py:124` | Stop adding seeds when score drops below 20% of top match |
| C | 45 | Non-ASCII Query Preservation | `serve.py:54` | Keep CJK/Arabic/Cyrillic terms; only filter English ≤2-char |
| C | 45 | YAML Frontmatter Strip Before Hash | `cache.py:17` | Don't invalidate body cache on date/tag frontmatter changes |
| C | 45 | Project-Scoped Skill Installs | `__main__.py:71` | `--project` writes to `.claude/skills/` not `~/.claude/skills/` |
| C | 36 | Affected-Nodes BFS + resolve_seed | `affected.py:46` | Fuzzy node lookup (id→label→source_file→contains); BFS over incoming edges |
| C | 36 | Background Git Hook | `hooks.py:46` | nohup rebuild; skip rebase/merge/cherry-pick; Husky-aware |
| C | 36 | Code-Only Skip for LLM Pass | `how-it-works.md:11` | AST-only corpus skips LLM semantic extraction entirely |
| C | 36 | Community ID Stability | `cluster.py:219` | Greedy one-to-one overlap matching preserves hand-edited labels |
| C | 36 | Hub-Exclusion + Majority-Vote | `cluster.py:114` | Exclude degree-percentile hubs from Leiden; reattach by vote |
| C | 36 | Cohesion Second-Pass Split | `cluster.py:170` | Re-split low-cohesion communities caused by doc-hub bridges |
| E | 30 | resolve_seed() — Flaw #2 | `affected.py:46` | Closes: impact_analysis returns "Safe" for non-existent entities |
| C | 32 | Semantic Fragment Validation | `semantic_cleanup.py:35` | Hard caps: 25MB, 10k nodes, 100k edges; ID regex; file_type enum |
| C | 32 | Import-Guided Symbol Resolution | `symbol_resolution.py:121` | (module_stem, symbol) → node_ids; only top-level from-imports |
| C | 30 | INFERRED Confidence Rubric | `how-it-works.md:44` | 6 discrete levels: 0.95→0.55 with named rubric |
| C | 30 | GRAPHIFY_OUT Env Var | `cache.py:14` | Relative or absolute path; enables per-worktree output dirs |
| E | 27 | Community Confidence Breakdown — Flaw #43 | `wiki.py:95` | Audit trail: EXTRACTED/INFERRED/AMBIGUOUS pct per community |
| C | 24 | Global Cross-Project Graph | `global_graph.py:58` | Prefix-namespaced federation; hash-skip; prune-on-replace |
| E | 18 | diagnose_extraction() — Flaw #98 | `diagnostics.py:156` | Edge-collapse categories; producer suppression sites |
| F | — | Bare Filename Stem as Entity ID | `CHANGELOG.md:26` | Silent node collisions on same-named files in different dirs |
| F | — | Partial Manifest Overwrite | `CHANGELOG.md:147` | Incremental run overwrites manifest with changed-subset → re-extracts everything |
| G | — | Global Index: Now or Phase 11? | — | Three options for cross-project knowledge federation timing |

---

## Bucket E — Flaw Closures

### E1 — resolve_seed() fuzzy node lookup — closes Flaw #2
**Score**: 30 | **Confidence**: high | **has_tests**: yes  
**Source**: `graphify/affected.py:46` — `resolve_seed(graph: nx.Graph, query: str) -> str | None`  
**What**: Four-stage fuzzy lookup: (1) exact node ID, (2) exact label (case-insensitive), (3) exact source_file, (4) label-contains match (returns None if >1 match — conservative). Returning None allows callers to emit "entity not found" instead of treating non-existent entities as safe.  
**Closes Flaw #2**: `impact_analysis` currently returns "Safe to refactor" for entities that don't exist. Adopt resolve_seed pattern in `impact_analysis.ts` before running BFS traversal.  
**Counter-case**: Fuzzy label-contains match may hit the wrong entity when two entities share a substring name. Strict exact-match + error is safer but requires the caller to know the exact entity ID.  
**Adoption path**: ~50 lines in `src/analysis/impactAnalysis.ts`. Wire before the main BFS traversal.

---

### E2 — Edge confidence breakdown per community article — partially closes Flaw #43
**Score**: 27 | **Confidence**: medium | **has_tests**: yes  
**Source**: `graphify/wiki.py:95` — `conf_counts: Counter = Counter(); for nid in nodes: for neighbor in G.neighbors(nid): ed = edge_data(G, nid, neighbor); conf_counts[ed.get("confidence", "EXTRACTED")] += 1`  
**What**: Per-community "## Audit Trail" section shows EXTRACTED: N (pct%), INFERRED: N (pct%), AMBIGUOUS: N (pct%). Surfaces how much of the knowledge graph is inference vs verified.  
**Partially closes Flaw #43**: Coverage transparency. Cortex's `audit_quality` tool could add this breakdown per entity cluster.  
**Counter-case**: Flaw #43 ("no coverage transparency") is primarily about software test coverage of entity-described code, not about edge type distribution. These are related but distinct problems.

---

### E3 — diagnose_extraction() edge-collapse diagnostics — partially closes Flaw #98
**Score**: 18 | **Confidence**: high | **has_tests**: yes  
**Source**: `graphify/diagnostics.py:156` — `diagnose_extraction(extraction, *, directed=True, root=None, max_examples=5, extract_path=None) -> dict`  
**What**: Classifies raw edges: non_object_edges, missing_endpoint_edges, dangling_endpoint_edges, self_loop_edges, exact_duplicate_edges, directed_same_endpoint_collapsed_edges, relation_variant_groups, source_file_variant_groups, source_location_variant_groups, context_variant_groups. Also calls `scan_producer_suppression_sites()` to find `seen_*` dedup sets in the extractor source. Measures pre-build vs post-build edge count loss.  
**Partially closes Flaw #98**: Cortex's Phase 0.7 (`cortex doctor`) could include a graph-health sub-check using these categories adapted for Cortex's SQLite entity store.  
**Counter-case**: Edge-collapse analysis is specific to graphify's JSON extraction format. Cortex's health check should focus on stale entity detection and orphaned refs, not raw edge counts.

---

## Bucket C — Worth Stealing (Gap)

### C1 — Sensitive File Detection: _SENSITIVE_DIRS + _SENSITIVE_PATTERNS (score: 60)
**Confidence**: high | **has_tests**: yes | **Source**: `graphify/detect.py:42`  
`_SENSITIVE_DIRS = frozenset({".ssh", ".gnupg", ".aws", ".gcloud", "secrets", ".secrets", "credentials"})`  
`_SENSITIVE_PATTERNS` — 8 regexes using lookarounds (not `\b`) to correctly match underscore-prefixed names:  
- `(^|[\\/])\.(env|envrc)(\.|$)` — .env files  
- `\.(pem|key|p12|pfx|cert|crt|der|p8)$` — TLS certs  
- `(?<![a-zA-Z0-9])(credential|secret|passwd|password|private_key)s?(?![a-zA-Z])` — secret keywords  
- `(?<![a-zA-Z0-9])tokens?(?![a-zA-Z])` — token files (separate because "tokenizer" is a false positive)  
- `id_rsa|id_dsa|id_ecdsa|id_ed25519` — SSH keys  
- `(\.netrc|\.pgpass|\.htpasswd)` — credential stores  
- `aws_credentials|gcloud_credentials|service.account` — cloud creds  

Two-stage `_is_sensitive(path)`: parent dir check first (parts[:-1] only — root-level "credentials" file is NOT blocked by dir check), then filename patterns.  
**Counter-case**: Pattern maintenance burden; new secret file formats need pattern updates. A denylist is never complete.  
**Adoption path**: ~60 lines in `src/security.ts`. Integrate into file ingest pipeline before content read.

---

### C2 — Dedup Variant-Pair Guards (score: 60)
**Confidence**: high | **has_tests**: yes | **Source**: `graphify/dedup.py:55`  

```python
def _is_variant_pair(a: str, b: str) -> bool:
    """True if a and b have same stem but different numeric/alpha suffix (chip SKU variants)."""
    if a == b or max(len(a), len(b)) >= 12: return False
    ma, mb = _VARIANT_SUFFIX.match(a), _VARIANT_SUFFIX.match(b)
    if not (ma and mb): return False
    return ma.group(1) == mb.group(1) and ma.group(2) != mb.group(2)

def _short_label_blocked(a: str, b: str, jw_score: float) -> bool:
    """Block short-label fuzzy merge unless exact same-length single-char substitution."""
    if max(len(a), len(b)) >= 12: return False
    if jw_score >= 97.0 and len(a) == len(b) and DamerauLevenshtein.distance(a, b) <= 1:
        return False  # True typo — allow merge
    return True  # Block all other short-label merges
```

`_VARIANT_SUFFIX = re.compile(r"^(.*[a-z])([0-9]+[a-z]*|[a-z]{2,})$")`  
**Counter-case**: Software entity names rarely follow chip-SKU patterns; the guard may add dead code for Cortex's use case.  
**Adoption path**: ~30 lines added to `src/dedup.ts` Phase 0.6 implementation.

---

### C3 — Stat-Based Mtime Fastpath for File Hashing (score: 45)
**Confidence**: high | **has_tests**: yes | **Source**: `graphify/cache.py:27`  

```python
_stat_index: dict[str, dict] = {}  # abs_path → {size, mtime_ns, hash}
# file_hash(): stat() first → if size+mtime_ns unchanged, return cached hash → else SHA256
# _flush_stat_index(): atexit + tempfile.mkstemp + os.replace(tmp, path)  # atomic write
# _normalize_path(): strips Windows \\?\ extended-length prefix
# _body_content(): strips YAML frontmatter (--- ... ---) before hash
```

**Counter-case**: NFS second-resolution mtime means same-size edits within 1 second pass as unchanged (same as make — acceptable).  
**Adoption path**: ~80 lines in `src/cache.ts`. Replaces current SHA256-on-every-read approach.

---

### C4 — Dynamic Seed Selection with Score-Gap Threshold (score: 45)
**Confidence**: high | **has_tests**: yes | **Source**: `graphify/serve.py:124`  

```python
def _pick_seeds(scored: list[tuple[float, str]], max_k: int = 3, gap_ratio: float = 0.2) -> list[str]:
    if not scored: return []
    top_score = scored[0][0]
    seeds = []
    for score, nid in scored[:max_k]:
        if seeds and score < top_score * gap_ratio: break
        seeds.append(nid)
    return seeds
```

When `FooBarService` scores 1000 and `error` nodes score 1.0, only `FooBarService` seeded.  
**Counter-case**: Hard-coded 0.2 may drop legitimate secondary seeds when query has two equally important concepts.  
**Adoption path**: ~15 lines in `src/search/cortexFind.ts`. Used after IDF scoring, before BFS traversal.

---

### C5 — Non-ASCII Query Term Preservation (score: 45)
**Confidence**: high | **has_tests**: yes | **Source**: `graphify/serve.py:54`  

```python
def _query_terms(question: str) -> list[str]:
    for raw in question.split():
        term = raw.lower().strip()
        is_english_only = all("a" <= ch <= "z" for ch in term)
        if not is_english_only or len(term) > 2:  # CJK/Arabic always pass
            terms.append(term)
```

**Counter-case**: Go's `io`, Python's `os`, `db` — important short English identifiers would be dropped.  
**Adoption path**: ~10 lines in `src/search/queryUtils.ts`.

---

### C6 — YAML Frontmatter Strip Before Hash (score: 45)
**Confidence**: high | **has_tests**: yes | **Source**: `graphify/cache.py:17`  

```python
def _body_content(content: bytes) -> bytes:
    text = content.decode(errors="replace")
    if text.startswith("---"):
        end = text.find("\n---", 3)
        if end != -1:
            return text[end + 4:].encode()
    return content
```

Entity pages in `.knowledge/` have YAML headers with `updated_at`. Without this, every Cortex entity update invalidates the body hash unnecessarily.  
**Counter-case**: Frontmatter changes to entity type or status ARE semantically meaningful and should invalidate cache.  
**Adoption path**: ~15 lines in `src/cache.ts`. Apply before SHA256 in `fileHash()`.

---

### C7 — Project-Scoped Skill Installs (score: 45)
**Confidence**: high | **has_tests**: yes | **Source**: `graphify/__main__.py:71`  

```python
def _platform_skill_destination(platform_name, *, project=False, project_dir=None) -> Path:
    if project:
        return (project_dir or Path(".")) / cfg["skill_dst"]  # .claude/skills/graphify/SKILL.md
    return Path.home() / cfg["skill_dst"]  # ~/.claude/skills/graphify/SKILL.md
```

`graphify install --project` writes to local `.claude/skills/`. Enables per-repo MCP/skill configuration without affecting global setup.  
**Counter-case**: Per-repo skill files add maintenance overhead; a global install with project-level config overrides may be cleaner.  
**Adoption path**: 1-flag addition to `cortex install` CLI command.

---

### C8 — Affected-Nodes BFS + resolve_seed (score: 36)
*See E1 section — also a gap in its own right regardless of Flaw #2 closure.*

---

### C9 — Background Git Hook with Rebase/Merge/Cherry-pick Skip (score: 36)
**Confidence**: high | **has_tests**: yes | **Source**: `graphify/hooks.py:46`  

Key patterns beyond Phase 0.10's current design:
- `nohup ... < /dev/null & disown` — detached background rebuild
- `SIGALRM` timeout: `signal.alarm(_timeout)` with `GRAPHIFY_REBUILD_TIMEOUT` env var (default 600s)
- Skip conditions: `[ -d "$GIT_DIR/rebase-merge" ] && exit 0` (4 checks: rebase-merge, rebase-apply, MERGE_HEAD, CHERRY_PICK_HEAD)
- Husky-aware: reads `.git/config` for `core.hooksPath`, validates path stays within repo root
- Linked worktree: `git rev-parse --git-path hooks` (NOT `--path-format=absolute` — fails on git < 2.31)
- Interpreter shebang allowlist: `case "$GRAPHIFY_PYTHON" in *[!a-zA-Z0-9/_.@-]*) GRAPHIFY_PYTHON="" ;;`

**Counter-case**: Background rebuild with disown makes it impossible to check success before next commit; errors only visible in `~/.cache/rebuild.log`.  
**Adoption path**: Add to Phase 0.10 implementation — these are refinements over the existing hook rewrite plan.

---

### C10 — Code-Only Skip for LLM Semantic Pass (score: 36)
**Source**: `graphify/docs/how-it-works.md:11` — 3-pass architecture  
Code files → Pass 1 AST (tree-sitter, free). Docs/papers/images → Pass 3 LLM (costs tokens). If corpus is code-only, Pass 3 is skipped entirely.  
**For Cortex**: When `ingest` detects a code-only directory (no .md/.pdf/.png), skip LLM synthesis calls and use AST-only extraction. Saves tokens on initial ingest of large codebases.  
**Counter-case**: Docstrings and inline comments ARE in code files and carry rationale that AST misses; a pure AST-only mode loses semantic understanding.  
**Adoption path**: Add `codeOnly` flag in ingest pipeline; check file extension set before dispatching LLM synthesis.

---

### C11 — Community ID Stability via Greedy One-to-One Overlap Matching (score: 36)
**Confidence**: high | **has_tests**: yes | **Source**: `graphify/cluster.py:219`  

```python
def remap_communities_to_previous(communities, previous_node_community):
    new_sets = {cid: set(nodes) for cid, nodes in communities.items()}
    overlaps = [(overlap, old_cid, new_cid) for ...]  # all pairs
    overlaps.sort(key=lambda x: (-x[0], x[1], x[2]))  # desc overlap, stable
    # greedy one-to-one matching: used_old_ids, matched_new_ids sets
    # unmatched → fresh IDs in size-desc + lexical order
```

Enables hand-labeled community names (`.graphify_labels.json`) to persist across rebuilds.  
**Counter-case**: Greedy matching fails gracefully on even splits — one half gets old ID, other gets fresh. Acceptable.  
**Adoption path**: ~40 lines in `src/cluster.ts`. Essential before Phase 10.10 (community skill files) ships.

---

### C12 — Hub-Exclusion Before Partitioning + Majority-Vote Reattachment (score: 36)
**Source**: `graphify/cluster.py:114` — `exclude_hubs_percentile` parameter  
Degree-percentile hub exclusion before Leiden, then majority-vote reattachment. Prevents `CLAUDE.md`-like files that connect to every entity from polluting community assignments.  
**Counter-case**: Changes community shapes; downstream tools depending on community membership may break after hub reattachment.  
**Adoption path**: ~30 lines added to Phase 14.1 `cluster()` function.

---

### C13 — Cohesion-Based Second-Pass Community Re-split (score: 36)
**Source**: `graphify/cluster.py:170` — `cohesion_score() < 0.05` triggers re-split on communities >= 50 nodes  
`cohesion_score(G, community_nodes) = actual_intra_edges / (n*(n-1)/2)`. Communities bridged by a doc-hub have near-zero cohesion — doc like CLAUDE.md touches every node.  
**Counter-case**: 0.05 threshold may over-split legitimate sparse communities (utility modules with few mutual calls but shared architectural role).  
**Adoption path**: ~20 lines added to Phase 14.1 `cluster()` after size-based splitting.

---

### C14 — Semantic Fragment Validation with Hard Size Caps (score: 32)
**Source**: `graphify/semantic_cleanup.py:35`  
Caps: 25 MB payload, 10,000 nodes, 100,000 edges, 10,000 hyperedges, 256 nodes/hyperedge. Node IDs: `^[A-Za-z0-9._:-]+$` (max 256 chars). file_type must be in `{code, document, paper, image, rationale, concept}`. Called before graph insertion — rejects malformed/malicious LLM responses early.  
**Counter-case**: Hard caps may be too low for very large codebases extracted in one LLM call.  
**Adoption path**: ~100 lines in `src/validation/semanticFragment.ts`. Integrate into `save_synthesis` tool before merging.

---

### C15 — Import-Guided Cross-File Symbol Resolution (score: 32)
**Source**: `graphify/symbol_resolution.py:121`  
Two-level lookup: global `label → [node_ids]` + Python-specific `(module_stem, symbol) → [node_ids]`. Only resolves top-level `from module import symbol` (not function-local — wrong scope). Returns None if >1 candidate (conservative).  
**Counter-case**: Python-only; TypeScript import resolution needs different approach. Limited applicability for Cortex's TypeScript-primary codebase.  
**Adoption path**: ~200 lines in `src/extractors/symbolResolution.ts`. Wire into Phase 0.13 call-graph second pass.

---

### C16 — Global Cross-Project Graph Federation (score: 24)
**Source**: `graphify/global_graph.py:58`  
`~/.graphify/global-graph.json` + `global-manifest.json`. `global_add(source_path, repo_tag)`: prefix IDs → merge into global graph → update manifest. Hash-skip when source unchanged. Enables cross-project queries.  
**Counter-case**: A single global graph file can grow unmanageably large and become a serialization bottleneck.  
**Adoption path**: Phase 11 already plans federation. Consider the global_graph.py pattern as the Phase 11 implementation reference.

---

### C17 — INFERRED Confidence Rubric (score: 30)
**Source**: `graphify/docs/how-it-works.md:44`  
6 discrete numeric levels: 0.95 (explicit cross-file ref, one target), 0.85 (naming+context), 0.75 (contextual), 0.65 (naming only), 0.55 (speculative). EXTRACTED = 1.0 always.  
**Counter-case**: Adding sub-levels requires updating every synthesis prompt and all downstream consumers.  
**Adoption path**: Add `confidence_score: number?` field to edge schema in Phase 0.3 Refinement.

---

## Bucket F — Anti-Patterns (Lessons)

### F1 — Anti-Pattern: Bare Filename Stem as Entity/Node ID
**Source**: `graphify/CHANGELOG.md:26` (v0.8.13 fix)  
SQL extractor and Python import resolver used bare filename stems as node ID prefixes. Two files named `models.py` in `auth/` and `payments/` produced colliding IDs and were silently merged. Fixed by using `{parent_dir}_{filename_stem}_{entity}` format.  
**Lesson for Cortex**: Entity IDs MUST be qualified with at least the containing directory. Pattern: `{relative_dir}_{stem}_{entity_name}`. Top-level files use just `{stem}_{entity_name}`.  
**Proposed flaws.md addition**: Flaw #119 — entity IDs not qualified with directory path.

---

### F2 — Anti-Pattern: Partial Manifest Overwrite on Incremental Run
**Source**: `graphify/CHANGELOG.md:147` (v0.8.10 fix)  
`save_manifest()` was called with only the changed-file subset. Next incremental run re-flagged the entire unchanged corpus as new and re-extracted everything. Fix: load existing manifest → merge changed subset → write full manifest.  
**Pattern**: `existing = load_manifest(); existing.update(changed_subset); write_manifest(existing)`  
**Lesson for Cortex**: Cortex's incremental ingest `manifest.json` / `state.json` must always follow load-merge-write. Never write-subset-only.  
**Proposed flaws.md addition**: If Cortex's `refresh_stale_entities` or `ingest` writes partial state, check for this bug.

---

## Bucket G — Open Questions

### G1 — Global Cross-Project Index: Now or Phase 11?
Should Cortex add a lightweight `~/.cortex/global-index.json` before Phase 11 (Monorepo Federation) lands?

**Options**:
1. Add minimal global index now: prefix-namespaced entity IDs + hash-skip. Enables `cortex_find --global`. Low cost (~200 lines).
2. Wait for Phase 11: proper federation with contract scoring, cross-repo RRF merging, and per-repo access rules. Better design, longer wait.
3. Don't federate: Cortex's value is depth-per-repo; cross-repo breadth is a different product.

---

## Bucket A — Already in Cortex

| Phase | Graphify Feature | Source |
|-------|-----------------|--------|
| Phase 0.1 | SSRF/path-traversal/XSS/sanitize_label | `graphify/security.py` |
| Phase 0.3 | Confidence labels EXTRACTED/INFERRED/AMBIGUOUS + schema validation | `graphify/validate.py` |
| Phase 0.4 | SHA256 file hash cache | `graphify/cache.py` |
| Phase 0.6 | MinHash/LSH + Jaro-Winkler dedup pipeline (without variant-pair guards) | `graphify/dedup.py` |
| Phase 0.7 | cortex doctor (planned) | `graphify/diagnostics.py` |
| Phase 0.10 | Defensive git hook rewrite | `graphify/hooks.py` |
| Phase 0.11 | Honest benchmarks / worked/ corpus | `graphify/worked/` |
| Phase 0.13 | Multi-language tree-sitter extractors (25 languages) | `graphify/extract.py` |
| Phase 14.1 | Leiden community detection | `graphify/cluster.py` |
| Phase 8.2 | Obsidian wiki compliance (planned) | `graphify/wiki.py` |

---

## Bucket B — Cortex Has Superior Version

### B1 — IDF-Weighted Scoring
**Graphify**: `_compute_idf()` cached on graph object (`G.graph['_idf_cache']`) — auto-invalidates on graph reload.  
**Cortex**: Phase 13.5 plans RRF + IDF + MMR (3 ranking stages).  
**Steel-man for graphify**: Cache-on-graph is an elegant zero-maintenance invalidation strategy. Cortex's multi-stage ranking adds complexity without necessarily improving quality.

### B2 — Deterministic Leiden
**Graphify**: Triple-locks: alphabetically sorted nodes, sorted edge rows (src, tgt, attrs_json), `random_seed=42`, `trials=1`.  
**Cortex**: Phase 14.1 likely sets only a random seed.  
**Steel-man for graphify**: Sorting both nodes and edges is necessary because Leiden is sensitive to insertion order in both dimensions.

---

## Bucket D — Niche / Wrong Fit

| Item | Reason |
|------|--------|
| Video/audio transcription (faster-whisper) | GPU-heavy dep; Cortex plans separately in Phase 0.16 |
| Google Workspace integration | Requires server-side Google APIs; violates local-first |
| Interactive graph HTML (pyvis) | Python-specific visualization; Cortex is TypeScript |
| Multi-LLM backends (DeepSeek, Bedrock, Kimi) | Phase 0.14 concern, not new phases needed |
| Multigraph capability probe | Forward-looking for MultiDiGraph mode; Cortex has no parallel-edge plans |

---

## Expected-but-Absent

- **Vector embeddings**: Explicitly absent by design — "No embeddings needed. The semantic similarity edges Claude extracts are already in the graph." Graph structure IS the similarity signal.
- **Query language (Cypher/SPARQL)**: Explicitly absent — natural language queries via BFS/DFS on graph.
- **Multi-user access control**: Local-first tool; out of scope.

---

## Surprises

1. **env(1) shebang parser** (`detect.py:116`): graphify implements a full parser for GNU/BSD `env -S` shebang lines to extract the Python interpreter — handles `-S`, `--split-string`, `--argv0`, `--unset`, variable assignments, recursion bounded. This is production-grade robustness for an edge case (scripters using `#!/usr/bin/env -S uv run python`).

2. **Community re-split on doc-hub bridges** (`cluster.py:170`): The explicit comment "doc-hub nodes like CLAUDE.md connected to everything" — graphify hit this exact pattern in real use where a project-level doc file connected to every code node and created an artificially merged community.

3. **Graph-aware PR dashboard** (`prs.py:1`): `PRInfo.blast_radius` property returns "N nodes / C communities" — the first time a PR dashboard embeds knowledge-graph impact directly in the review queue UI. Status classification order: WRONG-BASE > CI-FAIL > CHANGES-REQ > DRAFT > STALE > PENDING > APPROVED > READY.

---

## Themes

1. **Incrementality is a feature**: Every subsystem has a skip-if-unchanged path — stat+mtime cache, semantic hash, community ID remapping, global graph hash-skip.
2. **Conservative resolution**: Both symbol_resolution and resolve_seed return None rather than guess — unresolved is better than wrong.
3. **Background-by-default for long operations**: Git hooks background-detach to not block the shell. This is the correct default for any operation that could take minutes.
4. **Cohesion as a quality metric**: Using actual/possible intra-community edge ratio to detect "doc-hub bridge" communities is a simple, powerful signal.
5. **Determinism requires active effort**: graphify sorts nodes, edges, and attrs before Leiden, sets random_seed and trials, remaps community IDs greedily — 4 separate mechanisms just for determinism.

---

## Audit Limitations

1. **`extract.py` not read** (most git-churned file at 86 changes). Per-language extractor implementations, call-graph second passes, and any v8 language additions (ArkTS `.ets`, Fortran variants) are not inventoried.
2. **`security.py` not read in full**. YAML injection claim (`_yaml_str()`) inferred from SECURITY.md threat table — not confirmed at file+line.
3. **`.github/workflows/ci.yml` not read**. CI patterns (property tests, security scan, binary build pipeline) not inventoried.
4. **`prs.py` partially read** (first 120 lines). ThreadPoolExecutor parallel fetch, LLM-powered `--triage`, and `--conflicts` community-sharing algorithm not fully inventoried.

---

## Recommended Next Actions (Score-Ordered)

1. **Add sensitive-file detection** (C1, score 60) to `src/security.ts` — prevents `.env` and cert files from entering the knowledge graph.
2. **Add variant-pair dedup guards** (C2, score 60) to `src/dedup.ts` — prevents false merges on version variants.
3. **Add stat-based mtime fastpath** (C3, score 45) to `src/cache.ts` — skip SHA256 on unchanged files.
4. **Adopt _pick_seeds() gap threshold** (C4, score 45) in `cortex_find` — prevents noise terms from stealing seed slots.
5. **Preserve non-ASCII query terms** (C5, score 45) in query preprocessing.
6. **Add _body_content() frontmatter strip** (C6, score 45) before hash in entity cache.
7. **Add --project flag** (C7, score 45) to `cortex install` for per-repo skill installs.
8. **Adopt resolve_seed()** (E1, score 30) in `impact_analysis.ts` to fix Flaw #2.
9. **Add cohesion second-pass split** (C13, score 36) to Phase 14.1 community detection.
10. **Add community ID stability remapping** (C11, score 36) to Phase 14.1.
