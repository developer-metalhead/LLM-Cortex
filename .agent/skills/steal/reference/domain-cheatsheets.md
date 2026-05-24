# Domain Expected-Feature Cheat-Sheets

For Step 4.5 (negative-space scan). List 5–10 expected features per domain to check against target. Extend with your own domain knowledge if the target straddles multiple domains.

## Code intelligence
- AST cache (parsed-once, reused)
- Incremental parsing (diff-based re-parse)
- Symbol resolution (cross-file)
- Cross-file references (uses + definitions)
- Dead-code detection
- LSP integration
- Type inference / propagation
- Hover / jump-to-definition

## Knowledge graph
- Graph DB or graph store
- Edge weights
- Community detection (Leiden / Louvain)
- Embeddings (nodes, edges)
- Query language (Cypher, SPARQL, GraphQL)
- Schema evolution
- Graph diffing between versions
- Centrality metrics

## Build tool
- Incremental builds
- Dependency graph
- Parallel execution
- Cache invalidation (content-addressed)
- Watch mode
- Sandboxing
- Hermetic builds
- Remote cache

## AI agent / LLM
- Streaming responses
- Tool calling (function calls)
- Conversation memory
- Prompt templates
- Model fallbacks (degrade gracefully)
- Cost tracking
- Retry / backoff with jitter
- Context management / compaction

## CI / CD
- Matrix builds (multi-OS/version)
- Secret management
- Artifact storage
- Deployment gates / approvals
- Rollback mechanism
- Flaky-test detection
- Parallel test sharding
- PR preview environments

## Observability
- Trace propagation (OpenTelemetry)
- Metric aggregation
- Log correlation (trace ID)
- Alerting (rules + routing)
- SLO tracking
- Error grouping / dedup
- Distributed tracing
- Sampling strategies

## Search / retrieval
- BM25 ranking
- Semantic vectors (dense)
- Hybrid ranking (BM25 + vectors)
- Query expansion (synonyms)
- Faceted filters
- Snippet / highlight generation
- Spell correction
- Reciprocal Rank Fusion (RRF)

## ML / GNN / code-completion research
- Code Property Graph construction (AST + call graph + ownership edges)
- Typed edges (import, call, ownership, containment as separate edge types)
- Node embeddings (function/class/file-level, not just token-level)
- KNN or ANN search over embeddings (faiss, HNSW)
- Graph expansion from search centers (BFS radius, PPR, DFS pattern)
- Subgraph extraction (k-hop, random walk, PPR top-k)
- GNN reranking (link prediction as reranker after KNN retrieval)
- Hard-negative mining during training
- Temperature-scaled loss (softmax/NLL with learnable temperature)
- Incremental graph updates (online vs. rebuild-from-scratch)
- Multi-language support (not just Python — Java, TypeScript, Go)
- Evaluation metrics (EM, CodeBLEU, Edit Similarity, top-k accuracy)
- Call graph extraction tooling (PyCG, tree-sitter + regex, ts-morph)

## Security tool
- SAST rules (pattern + AST)
- Dependency scanning (CVE lookup)
- Secret detection
- SBOM emission (CycloneDX, SPDX)
- License compatibility checks
- Vuln database integration
- Severity scoring (CVSS)
- Fix suggestions
