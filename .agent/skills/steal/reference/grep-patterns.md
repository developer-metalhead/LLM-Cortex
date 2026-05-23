# Grep Patterns

Apply during Step 2c (source pass). Extend with target-domain patterns as discovered.

## Architectural surfaces
- `class\s+\w+(Manager|Service|Controller|Repository|Worker|Daemon|Engine|Coordinator)`
- `interface\s+\w+(Config|Options|Strategy|Plugin|Provider)`
- `(export\s+)?async\s+function\s+\w+` — public async API
- `@(decorator|annotation)|@(Get|Post|Put|Delete|Patch)Mapping`

## Performance / caching
- `\b(cache|memoize|lru|memo)\b` (case-insensitive)
- `content[_-]?hash|sha256|sha1\(|md5\(` — content addressing
- `worker[_-]?pool|spawn(Sync)?|cluster\.fork|child_process`
- `WeakMap|WeakSet` — memory-aware caches

## Security
- `validate|sanitize|escape|normalize` (case-insensitive)
- `getaddrinfo|socket\.(connect|getaddrinfo)` — SSRF surface
- `crypto\.timingSafeEqual|hmac|verify(Signature)?`
- `rate[_-]?limit|throttle|debounce`
- `MAX_(NODES|EDGES|SIZE|LENGTH|BYTES|DEPTH)` — DoS guards

## Anti-pattern signals (bucket F)
- `eval\(|new Function\(|exec\(` — code injection surface
- `// TODO: remove|@deprecated|// FIXME:|// HACK:` — known smell markers
- `catch\s*\([^)]*\)\s*\{\s*\}` — empty catch (silenced errors)
- `setTimeout\(.*0\)` — race-condition smell
- `process\.env\.\w+\s*\|\|\s*['"]` — default secrets in code
- `// @ts-ignore|// @ts-nocheck|# type: ignore` — type-system bypass

## Concurrency / resilience
- `retry|backoff|circuit[_-]?breaker|jitter`
- `Mutex|Semaphore|lockfile|flock|fcntl`
- `AbortController|AbortSignal|CancellationToken`

## Knowledge / graph
- `tree[_-]?sitter|treesitter|@ast-grep|babel-parser` — AST
- `leiden|louvain|community[_-]?detection|girvan` — graph clustering
- `pagerank|centrality|betweenness|eigenvector`
- `embedding|cosine|euclidean|hyperbolic|poincare`
- `bm25|tfidf|reciprocal[_-]?rank|rrf`
- `minhash|lsh|jaccard|jaro[_-]?winkler|levenshtein`

## CLI / MCP / agent
- `commander|yargs|clap|cobra|click` — CLI frameworks
- `McpServer|@mcp|tool\(.*description` — MCP tool definitions
- `\.claude/skills|\.claude/commands|AGENTS\.md`
- `hook|pre[_-]?commit|post[_-]?commit|husky`

## Git / VCS integration
- `simple-git|nodegit|gitpython|libgit2|git2`
- `rev-parse|rev-list|diff[_-]?tree|log --`
- `webhook|push[_-]?event|pull[_-]?request`

## Observability
- `opentelemetry|otel|tracer|span|metric`
- `pino|winston|bunyan|structlog|zap` — structured logging
- `prometheus|grafana|datadog|sentry`

## Storage
- `sqlite|better-sqlite|libsql|pgvector|sqlite-vss`
- `jsonl|ndjson|parquet|arrow`
- `migration|schema|prisma|drizzle|alembic`

## Build / release
- `semver|conventional[_-]?commits|changesets|release[_-]?please`
- `tsc|esbuild|swc|rollup|vite|webpack`
- `husky|lefthook|pre-commit`

## Domain-specific extensions (run as relevant)
- Media: `whisper|ffmpeg|transcribe|hls|dash`
- Search: `faiss|hnsw|ivf|product[_-]?quantizer|annoy`
- ML: `pytorch|tensorflow|onnx|jax|huggingface`
- Crypto: `secp256k1|ed25519|ecdsa|hkdf|argon2`
- DB internals: `wal|mvcc|b-?tree|lsm|skiplist`
