# Integration Scratch — CodeGraphContext (2026-05-24)

All C/E items with score ≥ 20. Items C9 (18) and C10 (16) excluded per threshold.

---

## To paste into flaws.md

### Flaw #18 append
```
+ New Phase Refinement — Portable camelCase/snake_case Normalization for cortex_find (CodeGraphContext audit, score: 48)
```

---

## To paste into implementation_plan.md

### Phase 13.5 Refinement — Portable Identifier Normalization for cortex_find (E1, score: 48)

**Closes:** Flaw #18 (`cortex_find` returns "No matches" instead of fuzzy suggestions)

```typescript
// src/search/fuzzy.ts

/** Strip separators + lowercase so camelCase/snake_case/spaces compare equally.
 *  "myFunction" → "myfunction"
 *  "my_function" → "myfunction"
 */
function normalizeIdentifier(s: string): string {
  return s.toLowerCase().replace(/[_\s]/g, '');
}

/** Levenshtein distance for short identifiers (no external deps). */
function levenshtein(a: string, b: string): number {
  if (a.length < b.length) return levenshtein(b, a);
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 0; i < a.length; i++) {
    const curr = [i + 1];
    for (let j = 0; j < b.length; j++) {
      curr.push(Math.min(prev[j + 1] + 1, curr[j] + 1, prev[j] + (a[i] !== b[j] ? 1 : 0)));
    }
    prev = curr;
  }
  return prev[prev.length - 1];
}

/**
 * Fuzzy-match a query against a list of candidates.
 * Takes the MINIMUM of raw-Levenshtein and normalized-Levenshtein so that
 * camelCase ↔ snake_case differences don't inflate the distance.
 *
 * @param query   - User's search term (e.g. "getUserNme")
 * @param names   - Candidate entity names from the knowledge index
 * @param maxDist - Maximum allowed edit distance (default 2)
 */
export function fuzzyMatchIdentifiers(
  query: string,
  names: string[],
  maxDist = 2,
): Array<{ name: string; distance: number }> {
  const qRaw = query.toLowerCase();
  const qNorm = normalizeIdentifier(query);

  const scored: Array<{ name: string; distance: number }> = [];
  for (const name of names) {
    const nRaw = name.toLowerCase();
    const nNorm = normalizeIdentifier(name);
    const d = Math.min(levenshtein(qRaw, nRaw), levenshtein(qNorm, nNorm));
    if (d <= maxDist) scored.push({ name, distance: d });
  }
  return scored.sort((a, b) => a.distance - b.distance);
}
```

**Wire into cortex_find:** Replace current exact-match in `cortex_find()` fallback path with `fuzzyMatchIdentifiers(query, allEntityNames, 2)`. Return top-5 by distance when no exact match found.

---

### Phase 0.13 Refinement — Generic Config File Nodes (C1, score: 45)

```typescript
// src/ingestion/parser-registry.ts

/** File extensions that produce minimal File nodes even without a language parser. */
const GENERIC_EXTENSIONS = new Set([
  '.toml', '.sh', '.yaml', '.yml', '.json', '.ini', '.cfg', '.env',
  '.bat', '.ps1', '.dockerignore', '.gitignore', '.md', '.txt',
]);

const GENERIC_FILENAMES = new Set(['Dockerfile', 'Makefile', 'docker-compose.yml']);

/** Returns true if file should be added as a minimal File node (no parsed content). */
export function isGenericFile(filePath: string): boolean {
  const p = path.parse(filePath);
  return GENERIC_EXTENSIONS.has(p.ext) || GENERIC_FILENAMES.has(p.base);
}

/** Build a minimal File node for config/infrastructure files. */
export function buildGenericFileNode(filePath: string, repoPath: string): FileNode {
  return {
    id: `file:${filePath}`,
    path: filePath,
    relativePath: path.relative(repoPath, filePath),
    name: path.basename(filePath),
    lang: 'generic',
    isParsed: false,
  };
}
```

**Wire into ingest pipeline:** After the language-parser dispatch in `ingest()`, check `isGenericFile(filePath)` for remaining files and call `buildGenericFileNode()`. Write these as File nodes with no CONTAINS children but proper IMPORTS edges when code files reference them (e.g., a Python `open("config.toml")`).

---

### Phase 7.8 Refinement — CGC_REPORT Pattern for Cortex (C2, score: 36)

```typescript
// src/tools/generate-graph-report.ts

export interface GraphReport {
  godNodes: Array<{ entity: string; inDegree: number }>;
  crossModuleLinks: Array<{ from: string; to: string; confidence: string }>;
  deadEntities: Array<{ entity: string; reason: string }>;
  cypherPlaybook: Array<{ title: string; query: string }>;
}

export function generateGraphReport(db: GraphDB): GraphReport {
  // God nodes: entities referenced by the most others
  const godNodes = db.query(`
    MATCH (e:Entity)<-[:RELATES_TO|WIRES_TO]-(other)
    RETURN e.name AS entity, count(other) AS inDegree
    ORDER BY inDegree DESC LIMIT 10
  `);

  // Cross-module connections (entities in different files linking to each other)
  const crossModuleLinks = db.query(`
    MATCH (a:Entity)-[r:RELATES_TO]->(b:Entity)
    WHERE a.sourceFile <> b.sourceFile
    RETURN a.name AS from, b.name AS to,
           coalesce(r.confidence, 'INFERRED') AS confidence
    ORDER BY confidence
    LIMIT 20
  `);

  // Dead entities: no incoming references
  const deadEntities = db.query(`
    MATCH (e:Entity)
    WHERE NOT ()-[:RELATES_TO|WIRES_TO]->(e) AND NOT e.isEntryPoint
    RETURN e.name AS entity, 'no_callers' AS reason
    LIMIT 20
  `);

  const cypherPlaybook = [
    {
      title: 'Entities with most cross-module dependencies',
      query: `MATCH (a)-[:RELATES_TO]->(b) WHERE a.sourceFile <> b.sourceFile RETURN a.name, count(*) ORDER BY count(*) DESC LIMIT 10`,
    },
    {
      title: 'Entities never referenced (dead knowledge?)',
      query: `MATCH (e:Entity) WHERE NOT ()-[:RELATES_TO]->(e) RETURN e.name, e.sourceFile`,
    },
  ];

  return { godNodes, crossModuleLinks, deadEntities, cypherPlaybook };
}
```

**Wire into Phase 7.8:** Call `generateGraphReport(db)` from the `graph` MCP tool and include report sections in `ARCH_GRAPH.md` output. Add "Suggested Cypher" section per finding type (dead entities → "Delete phantom entities?" Cypher).

---

### Phase 1 Refinement — O(k) Incremental Watcher Update (C3, score: 32)

```typescript
// src/watcher/incremental-update.ts

/**
 * Incremental update algorithm: re-parse only the changed file + affected
 * callers/inheritors (O(k) instead of O(n) full re-index).
 *
 * Steps:
 * 1. Query graph for callers/inheritors of changedFile BEFORE deleting nodes.
 * 2. DETACH DELETE changed file's nodes (cleans all CALLS/INHERITS on those nodes).
 * 3. Delete outgoing CALLS from affected callers (stale edges to old functions).
 * 4. Re-parse changed file + affected subset.
 * 5. Get repo-wide class lookup from DB (avoids re-parsing all files).
 * 6. Re-link CALLS/INHERITS for the subset only.
 */
export async function incrementalFileUpdate(
  db: GraphDB,
  changedFilePath: string,
  repoPath: string,
  ingestor: FileIngestor,
): Promise<void> {
  // Step 1: find affected files BEFORE deleting
  const callerPaths = await db.query<string[]>(`
    MATCH (caller:Function)-[:CALLS]->(fn:Function {path: $path})
    RETURN DISTINCT caller.path AS callerPath
  `, { path: changedFilePath });

  const inheritorPaths = await db.query<string[]>(`
    MATCH (cls:Class {path: $path})<-[:INHERITS]-(child:Class)
    RETURN DISTINCT child.path AS childPath
  `, { path: changedFilePath });

  const affectedPaths = new Set([changedFilePath, ...callerPaths, ...inheritorPaths]);

  // Step 2: delete + re-add changed file's nodes
  await db.run(`
    MATCH (n {path: $path}) DETACH DELETE n
  `, { path: changedFilePath });

  // Step 3: delete outgoing CALLS from affected callers (they'll be re-created)
  for (const callerPath of callerPaths) {
    await db.run(`
      MATCH (caller:Function {path: $path})-[c:CALLS]->() DELETE c
    `, { path: callerPath });
  }

  // Steps 4-6: re-parse and re-link affected subset
  const subsetData = await ingestor.parseFiles([...affectedPaths]);
  const classLookup = await db.getRepoClassLookup(repoPath);
  await ingestor.linkCalls(subsetData, classLookup);
  await ingestor.linkInheritance(subsetData);
}
```

**Wire into Phase 1's `FileWatcher`:** Replace current `fullReIndex(repoPath)` call in `on_modified` handler with `incrementalFileUpdate(db, changedFilePath, repoPath, ingestor)`. Add debounce (2s) on the file path key to batch rapid-fire saves.

---

### Phase 1 Refinement — Job ETA + Idempotency Guard (C6, score: 24)

```typescript
// src/jobs/job-manager.ts

export interface JobInfo {
  jobId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  totalFiles: number;
  processedFiles: number;
  currentFile?: string;
  path: string;
  errors: string[];
}

export class JobManager {
  private jobs = new Map<string, JobInfo>();

  /** Estimated seconds remaining based on throughput so far. */
  etaSeconds(job: JobInfo): number | null {
    if (job.status !== 'running' || job.processedFiles === 0) return null;
    const elapsed = (Date.now() - job.startTime.getTime()) / 1000;
    const avgPerFile = elapsed / job.processedFiles;
    return avgPerFile * (job.totalFiles - job.processedFiles);
  }

  /** Return the active job for a path, or null — prevents duplicate indexing. */
  findActiveJobByPath(path: string): JobInfo | null {
    const resolved = normalizePath(path);
    for (const job of this.jobs.values()) {
      if (normalizePath(job.path) === resolved &&
          (job.status === 'pending' || job.status === 'running')) {
        return job;
      }
    }
    return null;
  }

  /** Remove completed jobs older than maxAgeHours to prevent memory growth. */
  cleanupOldJobs(maxAgeHours = 24): void {
    const cutoff = Date.now() - maxAgeHours * 3600 * 1000;
    for (const [id, job] of this.jobs) {
      if (job.endTime && job.endTime.getTime() < cutoff) this.jobs.delete(id);
    }
  }
}
```

---

### Phase 0.3 Refinement — Language-Family Compatibility (C7, score: 24)

```typescript
// src/ingestion/language-compat.ts

const LANGUAGE_FAMILIES: Set<string>[] = [
  new Set(['java', 'kotlin']),       // JVM: can cross-call freely
  new Set(['c', 'cpp']),             // C/C++: headers shared
  new Set(['javascript', 'typescript']), // JS/TS ecosystem
];

/**
 * Returns true if lang1 and lang2 can realistically call each other.
 * Used to gate CALLS edge creation between functions in different files.
 */
export function languagesAreCompatible(lang1: string | null, lang2: string | null): boolean {
  if (!lang1 || !lang2) return true; // unknown language → optimistic
  if (lang1 === lang2) return true;
  return LANGUAGE_FAMILIES.some(family => family.has(lang1) && family.has(lang2));
}
```

**Wire into Phase 0.3 Refinement — Cross-Language Edge Gating:** In `createCallEdge(caller, callee)`, call `languagesAreCompatible(caller.lang, callee.lang)` before writing the edge. Return `null` (skip) if incompatible.

---

### Phase 0.2 Refinement — Schema Contract as Frozen Set (C8, score: 24)

```typescript
// src/schema/contract.ts

/** Canonical node labels written by the indexing pipeline.
 *  Any backend emitting a label outside this set is a schema violation. */
export const NODE_LABELS = new Set([
  'Repository', 'Directory', 'File',
  'Function', 'Class', 'Module', 'Variable',
  'Interface', 'Trait', 'Struct', 'Enum', 'Union',
  'Record', 'Property', 'Annotation', 'Parameter', 'Macro',
] as const);

/** Canonical relationship types. */
export const RELATIONSHIP_TYPES = new Set([
  'CONTAINS', 'CALLS', 'IMPORTS', 'INHERITS', 'IMPLEMENTS',
  'HAS_PARAMETER', 'INCLUDES',
] as const);

/** Identity keys used for MERGE operations. */
export const MERGE_KEYS = {
  Function:   ['name', 'path', 'lineNumber'] as const,
  Class:      ['name', 'path', 'lineNumber'] as const,
  File:       ['path'] as const,
  Repository: ['path'] as const,
} as const;

/** Warn (not error) if label not in allowlist — allows dynamic schema evolution. */
export function assertKnownLabel(label: string): void {
  if (!NODE_LABELS.has(label as any)) {
    console.warn(`[schema-contract] Unknown node label emitted: "${label}". Add to NODE_LABELS if intentional.`);
  }
}
```

---

### Phase 0.13 Refinement — Post-Resolution via Inheritance + Embeddings (C4, score: 24)

```typescript
// src/ingestion/post-resolution.ts

/**
 * After initial CALLS graph is written, re-examine low-confidence edges (tiers 8-9).
 * Use INHERITS graph to narrow candidates; fall back to ANN embedding similarity.
 *
 * Returns count of improved edges.
 */
export async function runInheritanceReresolve(
  db: GraphDB,
  repoPath: string,
  vectorResolver?: VectorResolver,
): Promise<number> {
  // Step 1: find all low-confidence same-file CALLS edges
  const lowConfidence = await db.query(`
    MATCH (caller)-[c:CALLS]->(called)
    WHERE (caller.path STARTS WITH $repoPrefix OR called.path STARTS WITH $repoPrefix)
      AND c.resolutionTier IN [8, 9]
    RETURN caller.name, caller.path, called.name, c.lineNumber, c.fullCallName
  `, { repoPrefix: repoPath.replace(/\/?$/, '/') });

  if (!lowConfidence.length) return 0;

  // Step 2: batch-fetch all candidate implementations (UNWIND = one round-trip)
  const uniqueNames = [...new Set(lowConfidence.map(r => r.calledName).filter(Boolean))];
  const implementations = await db.query(`
    UNWIND $names AS name
    MATCH (cls:Class)-[:CONTAINS]->(fn:Function {name: name})
    WHERE fn.path STARTS WITH $repoPrefix
    OPTIONAL MATCH (cls)-[:INHERITS]->(parent:Class)
    RETURN fn.name AS queriedName, fn.path, cls.name, parent.name AS parentName
  `, { names: uniqueNames, repoPrefix: repoPath.replace(/\/?$/, '/') });

  const nameToImpls = groupBy(implementations, r => r.queriedName);

  // Step 3: resolve each low-confidence edge
  const improvements: Array<{ callerPath: string; calledName: string; newCalledPath: string; confidence: number; tier: number }> = [];

  for (const row of lowConfidence) {
    const candidates = (nameToImpls[row.calledName] ?? []).filter(i => i.path !== row.callerPath);
    if (!candidates.length) continue;

    let bestPath: string | null = null;
    let confidence = 0.78; // tier 10: inheritance-resolved
    let tier = 10;

    if (candidates.length === 1) {
      bestPath = candidates[0].path;
    } else {
      const inheriting = candidates.filter(c => c.parentName);
      const pool = inheriting.length ? inheriting : candidates;
      if (pool.length === 1) {
        bestPath = pool[0].path;
      } else if (vectorResolver) {
        bestPath = await vectorResolver.resolve(row.calledName, null, pool.map(p => p.path), repoPath);
        if (bestPath) { confidence = 0.82; tier = 11; } // tier 11: embedding-resolved
      }
    }

    if (bestPath) improvements.push({ callerPath: row.callerPath, calledName: row.calledName, newCalledPath: bestPath, confidence, tier });
  }

  // Step 4: write improvements in batches via UNWIND
  if (improvements.length) {
    await db.run(`
      UNWIND $batch AS row
      MATCH (caller {path: row.callerPath})-[old:CALLS {calledName: row.calledName}]->()
        WHERE old.resolutionTier IN [8, 9]
      DELETE old
      WITH caller, row
      MATCH (newCalled:Function {name: row.calledName, path: row.newCalledPath})
      MERGE (caller)-[c:CALLS {calledName: row.calledName}]->(newCalled)
      SET c.confidence = row.confidence, c.resolutionTier = row.tier
    `, { batch: improvements });
  }

  return improvements.length;
}
```

---

### Phase 0.13 Refinement — Spring DI Semantic Edges (C5, score: 24)

```typescript
// src/ingestion/framework-edges.ts

/**
 * Framework-aware semantic edges extracted from Java/Kotlin annotations.
 * These complement structural CALLS edges with contract-level relationships.
 *
 * Patterns detected:
 *   @Autowired field/constructor → INJECTS edge
 *   @GetMapping / @PostMapping → EXPOSES_ENDPOINT edge
 *   @Bean method → PROVIDES_BEAN edge
 */
export function extractFrameworkEdges(
  parsedFile: ParsedFile,
): FrameworkEdge[] {
  const edges: FrameworkEdge[] = [];

  for (const cls of parsedFile.classes) {
    // @Autowired / @Inject → INJECTS
    for (const field of cls.fields ?? []) {
      if (field.decorators?.some(d => ['Autowired', 'Inject'].includes(d))) {
        edges.push({ type: 'INJECTS', from: cls.name, to: field.type, fromPath: parsedFile.path });
      }
    }

    // @GetMapping / @PostMapping / @RequestMapping → EXPOSES_ENDPOINT
    for (const method of cls.methods ?? []) {
      const endpointDecorator = method.decorators?.find(d =>
        ['GetMapping', 'PostMapping', 'PutMapping', 'DeleteMapping', 'RequestMapping'].includes(d)
      );
      if (endpointDecorator) {
        edges.push({ type: 'EXPOSES_ENDPOINT', from: cls.name, to: method.name, fromPath: parsedFile.path, endpoint: method.decoratorArgs?.[0] });
      }

      // @Bean → PROVIDES_BEAN
      if (method.decorators?.includes('Bean')) {
        edges.push({ type: 'PROVIDES_BEAN', from: cls.name, to: method.returnType ?? method.name, fromPath: parsedFile.path });
      }
    }
  }

  return edges;
}
```

**Wire into Phase 0.13 Java/Kotlin parser:** Call `extractFrameworkEdges(parsedFile)` after standard class extraction. Write `INJECTS`/`EXPOSES_ENDPOINT`/`PROVIDES_BEAN` edges to the graph alongside `CALLS`/`INHERITS`. Add these three types to `RELATIONSHIP_TYPES` in the schema contract.

---

## To update in flaws.md

The following `**Addressed by**:` line was appended to Flaw #18 in `flaws.md`:

```
**Addressed by**: Phase 13.5 — Fuzzy Levenshtein & RRF Search Ranker (done) + Phase 0.9 Refinement — RRF K=60 Hybrid Search (score: 32) + Phase 13.5 Refinement — Bounded Damerau-Levenshtein + stem variant expansion (-ing/-tion/-ment/-ies/-er) (codegraph audit, E3, score: 48) + New Phase Refinement — Portable camelCase/snake_case Normalization for cortex_find (CodeGraphContext audit, score: 48)
```
