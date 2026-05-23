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

## Security tool
- SAST rules (pattern + AST)
- Dependency scanning (CVE lookup)
- Secret detection
- SBOM emission (CycloneDX, SPDX)
- License compatibility checks
- Vuln database integration
- Severity scoring (CVSS)
- Fix suggestions
