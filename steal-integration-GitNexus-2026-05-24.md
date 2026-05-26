# Integration Scratch — GitNexus — 2026-05-24

> Copy-paste-ready additions for `implementation_plan.md` and `flaws.md`.
> Review and edit before pasting. E items sorted by score desc; C items ≥30 included.
> Source audit: `steal-inventory-GitNexus-2026-05-24.json`

---

## To paste into flaws.md

### Flaw #121 — FTS query string interpolation enables search injection
**Severity**: 3 (medium)
**Description**: Any FTS or Cypher query builder that interpolates user input as a format string (rather than a bound parameter) is vulnerable to search injection. GitNexus shipped this bug in v1.3.10 and fixed it in v1.3.11: `CALL QUERY_FTS_INDEX(...)` initially embedded the user search term as a raw string literal. An attacker could escape the FTS query and execute arbitrary Cypher.
**Proposed fix**: Separate compile-time schema identifiers (table names, index names — safe to template-interpolate) from runtime user input (must be passed as a bound `$query` parameter). Never interpolate search terms into query strings.
**Source-of-lesson**: gitnexus `CHANGELOG.md:66` — v1.3.11 "Fix FTS Cypher injection by escaping backslashes in search queries"; fixed pattern: gitnexus `src/core/search/bm25-index.ts:36-41`

### Flaw #122 — MCP transport allocates buffer before validating Content-Length cap
**Severity**: 4 (high — OOM security)
**Description**: A transport that reads `Content-Length: N` and allocates an N-byte buffer BEFORE checking whether N exceeds the max buffer size allows a malicious client to trigger an OOM crash by sending `Content-Length: 99999999999`. This is a pre-allocation DoS vector.
**Proposed fix**: Validate Content-Length against `MAX_BUFFER_SIZE` (recommend 10 MB) BEFORE allocating any buffer. If the value exceeds the cap, close the connection with a protocol error. Check first, allocate second.
**Source-of-lesson**: gitnexus `CHANGELOG.md:88-90` — v1.3.10 "MCP transport buffer cap: Added 10 MB MAX_BUFFER_SIZE limit to prevent out-of-memory attacks via oversized Content-Length headers"; fixed in `src/mcp/compatible-stdio-transport.ts:46`

---

## To paste into implementation_plan.md

> Match existing style: Phase X.Y Refinement — `title` (score, source, body with sub-bullets).

---

### Phase 0.1 Refinement — `assertSafePath` Path Traversal Defense — closes Flaw #51 + #74 (score: 75)

**What**: Add `assertSafePath(root: string, rawPath: string): string` to `src/security.ts`. Used by `source`, `read_entity`, and any future tool that accepts a user-supplied file path.

```typescript
function assertSafePath(root: string, rawPath: string): string {
  if (!rawPath || rawPath.includes('\0')) throw new SecurityError('Invalid path');
  const resolvedRoot = path.resolve(root);
  const fullPath = path.resolve(resolvedRoot, rawPath);
  if (fullPath !== resolvedRoot && !fullPath.startsWith(resolvedRoot + path.sep)) {
    throw new SecurityError('Path traversal denied');
  }
  return fullPath;
}
```

**Where**: Called in `source` (before any `fs.readFile`), `read_entity` (before loading entity file), and `save_concept`/`save_synthesis` (before writing). Replaces ad-hoc path joins.

**Source**: gitnexus `src/server/validation.ts:77-90` — `assertSafePath()`
**Closes**: Flaw #51 (CRITICAL — unsandboxed source), Flaw #74 (read_entity path injection)

---

### Phase 0.1 Refinement — `assertString` Type-Confusion Prevention — closes Flaw #74 (score: 60)

**What**: Add `assertString(value: unknown, paramName: string): string` guard applied at every MCP tool entry point that accepts a string parameter.

```typescript
function assertString(value: unknown, paramName: string): string {
  if (Array.isArray(value)) {
    throw new ValidationError(`${paramName}: expected string, got array (duplicate parameter?)`);
  }
  if (typeof value !== 'string') {
    throw new ValidationError(`${paramName}: expected string, got ${typeof value}`);
  }
  return value;
}
```

**Where**: Applied to `entity_name`, `file_path`, `query`, `scope` parameters in all MCP tool handlers before any string operation (`.length`, `.includes`, regex, etc.).

**Source**: gitnexus `src/server/validation.ts:57-65` — `assertString()`
**Closes**: Flaw #74 (read_entity accepts path-traversal names — partially; Flaw #51 also partially)

---

### Phase 3.3 Refinement — Schema Version Guard for Incremental State — closes Flaw #63 (score: 45)

**What**: Add `INCREMENTAL_SCHEMA_VERSION = 1` constant to `src/state.ts`. On every cortex analyze/ingest, compare stored `state.json.version` against the constant. If mismatch → log warning + force full rebuild.

```typescript
const INCREMENTAL_SCHEMA_VERSION = 1;  // bump when incremental invariants change

function checkSchemaVersion(stored: number | undefined): boolean {
  if (stored === undefined || stored !== INCREMENTAL_SCHEMA_VERSION) {
    logger.warn(`Schema version mismatch (stored=${stored}, expected=${INCREMENTAL_SCHEMA_VERSION}). Forcing full rebuild.`);
    return false;  // caller should run full ingest
  }
  return true;
}
```

**Source**: gitnexus `src/storage/repo-manager.ts:75-81` — `INCREMENTAL_SCHEMA_VERSION`, `schemaVersion` field
**Closes**: Flaw #63 (state.json version field exists but is never checked)

---

### Phase 0.7 Refinement — Doctor Capabilities Fingerprint — closes Flaw #98 (score: 45)

**What**: Extend `cortex doctor` beyond version info to include runtime capability probing:

```
Cortex Doctor

Runtime
  OS:         win32/x64
  Node:       v22.3.0
  Cortex:     0.9.1

Capabilities
  Knowledge store:     json-files
  Full-text search:    idf-bfs
  Vector index:        not-available
  Embedding backend:   none (Phase 0.14)

Graph
  Entities: 247
  Concepts: 14
  Last ingest: 2026-05-24T12:00:00Z (0 commits behind HEAD)
```

**Where**: `src/cli/doctor.ts` — extend the existing planned command with capability probing via `getRuntimeCapabilities()`.

**Source**: gitnexus `src/cli/doctor.ts:1-32` — `getRuntimeFingerprint()`, `getRuntimeCapabilities()`
**Closes**: Flaw #98 (no cortex doctor / health check)

---

### Phase 0.9 Refinement — RRF K=60 Hybrid Search + BM25 Top-3 Aggregation — closes Flaw #26 (score: 32)

**What**: Replace substring-presence ranking in `cortex_find` with Reciprocal Rank Fusion merging of IDF-scored keyword results and (when available) semantic vector results.

```typescript
const RRF_K = 60;

function mergeWithRRF(
  keywordResults: Array<{ entityId: string; score: number }>,
  semanticResults: Array<{ entityId: string; distance: number }>,
  limit = 10
): RRFResult[] {
  const merged = new Map<string, RRFResult>();

  // Guard against undefined inputs
  for (let i = 0; i < (keywordResults ?? []).length; i++) {
    const r = keywordResults[i];
    const rrfScore = 1 / (RRF_K + i + 1);
    merged.set(r.entityId, { entityId: r.entityId, score: rrfScore, sources: ['keyword'] });
  }
  for (let i = 0; i < (semanticResults ?? []).length; i++) {
    const r = semanticResults[i];
    const rrfScore = 1 / (RRF_K + i + 1);
    const existing = merged.get(r.entityId);
    if (existing) { existing.score += rrfScore; existing.sources.push('semantic'); }
    else merged.set(r.entityId, { entityId: r.entityId, score: rrfScore, sources: ['semantic'] });
  }
  return [...merged.values()].sort((a, b) => b.score - a.score).slice(0, limit);
}
```

Also: **BM25 top-3 aggregation**: when multiple entities come from the same file, sum only the top-3 highest-scoring entities per file — prevents test files with many weak matches from outranking focused hits.

**Source**: gitnexus `src/core/search/hybrid-search.ts:18, 46-119`; `src/core/search/bm25-index.ts:120-131`
**Closes**: Flaw #26 (cortex_find ranks by substring presence, not relevance)

---

### Phase 33.6 Refinement — Crash-Recovery Dirty Flag for Incremental Ingest — closes Flaw #120 (score: 30)

**What**: Add `incrementalInProgress: boolean` to `.cortex/state.json` (or meta file). Written to disk BEFORE any destructive mutation; cleared only on successful commit. On next run, if flag is set, force full rebuild rather than incremental.

```typescript
async function safeIncrementalIngest(options: IngestOptions): Promise<void> {
  await setIncrementalFlag(true);     // write to disk FIRST
  try {
    await runIncrementalIngest(options);
    await setIncrementalFlag(false);  // clear ONLY on success
  } catch (err) {
    // flag stays set → next run forces full rebuild
    throw err;
  }
}
```

**Source**: gitnexus `src/storage/repo-manager.ts:96-101` — `incrementalInProgress` dirty flag pattern
**Closes**: Flaw #120 (partial manifest overwrite on incremental run re-extracts entire corpus)

---

### Phase 0.14 Refinement — SHA1 Embedding Version Hash for Incremental Preservation (score: 45)

**What**: For each embeddable entity, compute `sha1(EMBEDDING_TEXT_VERSION + '\n' + embeddingText)` and store alongside the vector. On incremental embedding runs, skip entities whose hash matches the stored value.

```typescript
const EMBEDDING_TEXT_VERSION = 'v1';  // bump to invalidate all embeddings on template change

function contentHashForEntity(entity: EmbeddableEntity): string {
  const text = generateEmbeddingText(entity);
  return createHash('sha1')
    .update(EMBEDDING_TEXT_VERSION + '\n')
    .update(text)
    .digest('hex');
}
```

Version bump on template change → all embeddings invalidated and regenerated. No hash change → vector preserved from prior run.

**Source**: gitnexus `src/core/embeddings/embedding-pipeline.ts:66-88` — `EMBEDDING_TEXT_VERSION`, `contentHashForNode()`

---

### Phase 0.1 Refinement — Cross-Platform Path Canonicalization (score: 45)

**What**: Wrap all incoming file paths in `canonicalizePath()` before storing in state or using as entity IDs.

```typescript
function canonicalizePath(p: string): string {
  try {
    return fs.realpathSync.native(p);  // resolves symlinks, Windows 8.3 short names, macOS /var→/private/var
  } catch {
    return path.resolve(p);  // graceful fallback for paths that don't exist yet
  }
}
```

Apply at: project root resolution, entity source_file storage, registry lookup (compare canonicalized forms). Fixes entity ID mismatch when the same file is reached via a symlink or a Windows 8.3 path.

**Source**: gitnexus `src/storage/repo-manager.ts:46-53` — `canonicalizePath()`

---

### Phase 2 Refinement — Adaptive Concurrency Reduction on LLM 429 (score: 45)

**What**: When running concurrent LLM synthesis calls (batch entity synthesis, wiki generation), wrap the concurrency pool to detect 429 responses and back off automatically.

```typescript
let activeConcurrency = maxConcurrency;

async function withAdaptiveConcurrency<T>(
  items: T[],
  worker: (item: T) => Promise<void>,
  maxC = 5
): Promise<void> {
  let c = maxC;
  const queue = [...items];
  while (queue.length > 0) {
    const batch = queue.splice(0, c);
    const results = await Promise.allSettled(batch.map(worker));
    for (const r of results) {
      if (r.status === 'rejected' && isRateLimitError(r.reason)) {
        c = Math.max(1, c - 1);  // reduce concurrency
        await sleep(5000);        // backoff
        queue.unshift(/* failed item */);  // re-queue
      }
    }
  }
}
```

**Source**: gitnexus `src/core/wiki/generator.ts:1061-1113` — adaptive rate limiting, `activeConcurrency` reduction

---

### Phase 22 Refinement — IPv6 Rate Limiting Normalization (/56 subnet) (score: 36)

**What**: When implementing per-IP rate limiting for `cortex serve` (Phase 22), normalize IPv6 addresses to their /56 subnet prefix before keying the rate limiter — prevents trivial bypass via per-address rotation across the 2^72 addresses in a /56 network.

```typescript
function ipKeyGenerator(req: Request): string {
  const ip = req.ip ?? req.socket?.remoteAddress ?? 'unknown';
  // Normalize IPv6 to /56 subnet (first 7 bytes)
  if (ip.includes(':')) {
    const parsed = new Address6(ip);
    return parsed.isValid() ? parsed.getBitsBase2().slice(0, 56) : ip;
  }
  return ip;
}
```

**Source**: gitnexus `src/server/validation.ts:102-150` — `ipKeyGenerator`, `createRouteLimiter()`

---

### Phase 11.5 Refinement — Noisy Contract Filter for Health-Check Routes (score: 36)

**What**: Add a configurable exclusion list to the contract matcher to suppress infrastructure-level routes that produce N×M false cross-repo dependencies.

**Two filter categories**:
1. **Exact path exclusions**: `/health`, `/ready`, `/liveness`, `/metrics` — every service has these, and cross-linking them is meaningless.
2. **Param-only paths**: paths that collapse to `/{param}` or `/{param}/{param}` after normalization — they match any route in any service after normalization.

**Config**: `.cortex/groups.yaml`
```yaml
matching:
  exclude_links_paths: ['/health', '/ready', '/liveness', '/metrics']
  exclude_links_param_only_paths: true
```

**Source**: gitnexus `src/core/group/matching.ts:32-52` — `isNoisyContract()`

---

### Phase 2 Refinement — Retry with Full-Jitter Exponential Backoff + Retry-After Honor (score: 36)

**What**: Use full-jitter backoff for all LLM API retries. Honor `Retry-After` header from 429 responses but cap it at `MAX_RETRY_DELAY`.

```typescript
function computeRetryDelay(attempt: number, retryAfterMs?: number): number {
  const BASE = 1000, CAP = 30_000;
  const jittered = Math.random() * Math.min(CAP, BASE * Math.pow(2, attempt));
  if (retryAfterMs !== undefined) {
    return Math.min(retryAfterMs, CAP);  // honor server hint but cap it
  }
  return jittered;
}
```

**Source**: gitnexus `gitnexus-shared/src/integrations/retry.ts:52-105` — `retry()`, full-jitter pattern

---

### Phase 11.5 Refinement — Deadline-Driven Fanout with AbortController Racing (score: 32)

**What**: When `impact_analysis` fans out across multiple repos in a group (Phase 11.5), race each neighbor call against a per-call timeout derived from the global deadline.

```typescript
const deadline = Date.now() + timeoutMs;

for (const neighbor of neighbors) {
  const remainingMs = deadline - Date.now();
  if (remainingMs <= 0) { truncatedRepos.push(neighbor.repo); continue; }

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), remainingMs);
  const { result, timedOut } = await Promise.race([
    neighborImpact(neighbor, ac.signal).then(r => ({ result: r, timedOut: false })),
    new Promise<{ result: null; timedOut: true }>(res =>
      ac.signal.addEventListener('abort', () => res({ result: null, timedOut: true }))
    ),
  ]).finally(() => clearTimeout(timer));

  if (timedOut) truncatedRepos.push(neighbor.repo);
  else results.push(result);
}
```

**Source**: gitnexus `src/core/group/cross-impact.ts:262-298` — `safeNeighborImpact()`, deadline pattern

---

### Phase 10.4 Refinement — Smart Section Preservation (<!-- gitnexus:keep -->) (score: 30)

**What**: Add a `<!-- cortex:keep -->` marker to `CLAUDE.md` / `AGENTS.md` auto-generated sections. When the marker is present on its own line, `cortex onboard` only updates the stats line (entity counts, last indexed date) rather than re-generating the entire section — preserves team-customized CLAUDE.md layouts across re-indexing.

**Line detection** (strict — reject inline prose references):
```typescript
function hasKeepMarker(content: string): boolean {
  return content.split('\n').some(line => {
    const trimmed = line.replace(/\r$/, '');
    return trimmed === '<!-- cortex:keep -->';
  });
}
```

If marker present → update only `<!-- cortex:stats -->` stats line. Otherwise → full regeneration.

**Source**: gitnexus `src/cli/ai-context.ts:235-278` — `<!-- gitnexus:keep -->` pattern

---

### Phase 4 Refinement — MCP Tool Annotations (readOnlyHint, destructiveHint, idempotentHint) (score: 30)

**What**: Add `annotations` field to every MCP tool registration to signal client capabilities.

```typescript
const TOOL_ANNOTATIONS = {
  read_only: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  mutating:  { readOnlyHint: false, destructiveHint: true,  idempotentHint: false, openWorldHint: false },
  search:    { readOnlyHint: true, destructiveHint: false, idempotentHint: false, openWorldHint: true },
} as const;

// Tool registration:
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    { name: 'cortex_find', description: '...', annotations: TOOL_ANNOTATIONS.search, inputSchema: ... },
    { name: 'source',      description: '...', annotations: TOOL_ANNOTATIONS.read_only, inputSchema: ... },
    { name: 'save_concept', description: '...', annotations: TOOL_ANNOTATIONS.mutating, inputSchema: ... },
  ]
}));
```

**Source**: gitnexus `src/mcp/tools.ts:33-52` — `ToolAnnotations`, `QUERY_TOOL_ANNOTATIONS`

---

### Phase 0.14 Refinement — Embedding Metadata Text Header (score: 30)

**What**: Prepend a structured metadata header to each entity's embedding text for improved discriminability across same-named symbols in different files.

```typescript
function generateEmbeddingText(entity: EmbeddableEntity): string {
  const lines = [
    `${entity.label}: ${entity.name}`,
    `Path: ${entity.source_file}`,
    entity.isExported !== undefined ? `Export: ${entity.isExported}` : null,
    entity.description ? truncateAtWordBoundary(entity.description, 200) : null,
  ].filter(Boolean);
  return lines.join('\n') + '\n\n' + cleanCode(entity.content ?? '');
}
```

**Source**: gitnexus `src/core/embeddings/text-generator.ts:63-97` — `generateEmbeddingText()`

---

## E-bucket items (closes flaws — implementation references)

### E — assertSafePath + assertString → closes Flaws #51 and #74

**Implementation reference** (`validation.ts:57-90`):
```typescript
function assertString(value: unknown, paramName: string): string {
  if (Array.isArray(value)) throw new ValidationError(`${paramName}: expected string`);
  if (typeof value !== 'string') throw new ValidationError(`${paramName}: expected string`);
  return value;
}

function assertSafePath(root: string, rawPath: string): string {
  if (!rawPath || rawPath.includes('\0')) throw new SecurityError('Invalid path');
  const resolvedRoot = path.resolve(root);
  const fullPath = path.resolve(resolvedRoot, rawPath);
  if (fullPath !== resolvedRoot && !fullPath.startsWith(resolvedRoot + path.sep))
    throw new SecurityError('Path traversal denied');
  return fullPath;
}
```

**Cortex adoption path**: Add to `src/security.ts`. Call `assertSafePath(projectRoot, rawPath)` in `source`, `read_entity`, `save_concept`. Call `assertString(value, 'entity_name')` at MCP handler entry points. ~30 lines.

### E — Schema version guard → closes Flaw #63

**Implementation reference** (`repo-manager.ts:75-81`):
```typescript
const INCREMENTAL_SCHEMA_VERSION = 1;
if (stored.version !== INCREMENTAL_SCHEMA_VERSION) forceFullRebuild();
```

**Cortex adoption path**: Add constant to `src/state.ts`. Read `state.json.version` on ingest; if missing or mismatched, clear state and run full ingest. Write version on successful completion. ~15 lines.

### E — Doctor capabilities → closes Flaw #98

**Implementation reference** (`doctor.ts:1-32`): `getRuntimeFingerprint()` + `getRuntimeCapabilities()` returns structured object; `doctorCommand()` prints formatted report.

**Cortex adoption path**: Implement `cortex doctor` in `src/cli/doctor.ts`. Add `getRuntimeCapabilities()` that probes: graph store type, FTS availability, entity/concept counts, last ingest date, commits behind HEAD. ~80 lines.
