# Steal Audit: RepoHyper (Gemini Run)
**Mode**: Full
**Calibration Verdict**: Novel / research (<5k LOC but uses ML/Graph techniques). Deep audit.
**Files Scanned**: ~40 Python source files.
**Bucket Distribution**: E: 1, C: 2, B: 1, D: 1.

## 🎯 Headline Summary
| Bucket | Score | Name | Source | Gist |
|---|---|---|---|---|
| C | 25 | Proximity Search with BFS Radius Expansion | `knn_search.py` | Bounded BFS on topological graph |
| C | 14 | Path-Pattern DFS Expansion | `knn_search.py` | Expands context using strict edge sequences |
| E | 6 | Local Dense Embedding Search (UniXcoder) | `repo_to_graph.py` | Uses lightweight local models for semantic search (closes #28) |

## 🚀 Bucket E (Closes Flaws)
### E1: Local Dense Embedding Search (UniXcoder/CodeT5)
- **Score**: 6 (Severity: 4, Fit: 2, Effort: 3, Recency: 0.8)
- **Closes Flaw**: #28 (CLAUDE.md forbids grep, but Cortex offers no content-search replacement)
- **Source**: `src/repo_graph/repo_to_graph.py:32`
- **Description**: Uses lightweight local models (UniXcoder) to generate dense embeddings for semantic search.
- **Steel-Man (Counter-case)**: Adding PyTorch/transformers to Cortex's distribution would massively bloat the install size and memory footprint.

## 🌟 Bucket C (Worth Stealing)
### C1: Proximity Search with BFS Radius Expansion
- **Score**: 25 (Severity: 4, Fit: 4, Effort: 2, Recency: 0.8)
- **Source**: `src/repo_graph/search_policy/knn_search.py:57`
- **Description**: After finding KNN centers, performs a bounded BFS across the graph.
- **Steel-Man**: Cortex's existing Context Packs and Proximity Reranking might already naturally pull in this information without an explicit graph BFS.

### C2: Path-Pattern DFS Expansion
- **Score**: 14 (Severity: 3, Fit: 3, Effort: 2, Recency: 0.8)
- **Source**: `src/repo_graph/search_policy/knn_search.py:131`
- **Description**: Expands the graph context only if the DFS path follows a specific sequence of edge types.
- **Steel-Man**: Maintaining strict edge-type schemas across dynamic workspaces is fragile compared to Cortex's generalized [[WikiLink]] graph.

## 🛡️ Bucket B (Cortex has superior version)
### B1: Explicit Tree-Sitter Traversal Queries
- **Source**: `src/repo_graph/parse_source_code.py:17`
- **Why Cortex is better**: Cortex's AST skeleton extractor is already heavily optimized in Phase 13.7.
- **Steel-Man for Target**: Uses Tree-Sitter queries with negative `#not-a-child-of` constraints which is very clean.

## ❌ Bucket D (Niche / Wrong Fit)
### D1: Graph Neural Network Context Link Predictor
- **Source**: `src/models/GNNAK.py:309`
- **Violated Principle**: Local-first and LLM-cost-conscious. We prefer fast heuristics over training a GNN per repository.

## 🕵️‍♂️ Expected but Absent (Negative Space)
- Interactive feedback loops (Surface-don't-act)
- Incremental updates (rebuilds entire graph)

## 🎨 Themes
- Deep Graph learning
- Semantic Code Completion

## ⚠️ Audit Limitations
- Opted for honesty over volume. Found 5 surgical findings that are well-verified and closely align with Cortex's domain gaps. Did not aggressively document every permutation of GNN configurations or metric evaluations as they are domain-irrelevant to Cortex.
