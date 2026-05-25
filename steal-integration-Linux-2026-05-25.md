# Linux Kernel → Cortex Integration Skeletons

TypeScript implementation sketches for all C/E items scoring ≥ 18.
These are starting points, not production code. Each skeleton notes the target file and the flaw or phase it closes.

---

## E1 (score 36): vfs_cache_pressure as User-Configurable Tunable
**Closes:** flaw #109 (COMPACTION_THRESHOLD_BYTES hardcoded)  
**Target file:** `src/knowledge/experience.ts` + `cortex.json` schema

```typescript
// Replace hardcoded constants with configurable pressure ratio.
// Linux analogue: sysctl_vfs_cache_pressure = 100
// effective_threshold = base_threshold * 100 / pressure
// pressure > 100 = more aggressive compaction
// pressure < 100 = more lenient (keep longer)

interface CortexConfig {
  compaction_pressure: number; // default: 100, range: 1..1000
}

// In experience.ts — replace:
//   const COMPACTION_THRESHOLD_BYTES = 10 * 1024 * 1024;
//   const SIX_MONTHS_MS = 180 * 24 * 60 * 60 * 1000;
// With:

function getEffectiveThreshold(config: CortexConfig): {
  bytes: number;
  maxAgeMs: number;
} {
  const BASE_BYTES = 10 * 1024 * 1024;   // 10 MB base
  const BASE_AGE_MS = 180 * 24 * 60 * 60 * 1000; // 180 days base
  const pressure = config.compaction_pressure ?? 100;

  return {
    bytes: Math.floor((BASE_BYTES * 100) / pressure),
    maxAgeMs: Math.floor((BASE_AGE_MS * 100) / pressure),
  };
}

// cortex.json addition:
// { "compaction_pressure": 100 }
```

---

## E2 (score 24): Rollback-Safe Two-Phase Notifier Chain
**Closes:** flaw #46 (source non-parallelizable — multi-step write path has no rollback)  
**Target file:** `src/knowledge/KnowledgeManager.ts`

```typescript
// Linux analogue: notifier_call_chain_robust(nl, val_up, val_down, v)
// Fires val_up handlers 1..N. On failure at step K, fires val_down for steps 1..K-1 in reverse.

type WriteHandler<T> = {
  name: string;
  forward: (ctx: T) => void | Promise<void>;
  rollback: (ctx: T) => void | Promise<void>;
};

async function writeWithRollback<T>(
  handlers: WriteHandler<T>[],
  ctx: T
): Promise<void> {
  const applied: WriteHandler<T>[] = [];

  for (const handler of handlers) {
    try {
      await handler.forward(ctx);
      applied.push(handler);
    } catch (err) {
      // Rollback in reverse order of applied steps (exactly like notifier_call_chain_robust).
      for (const done of [...applied].reverse()) {
        try {
          await done.rollback(ctx);
        } catch (rollbackErr) {
          console.error(`[writeWithRollback] rollback of ${done.name} failed:`, rollbackErr);
        }
      }
      throw err;
    }
  }
}

// Usage in KnowledgeManager.saveEntity():
await writeWithRollback([
  {
    name: 'skeleton-cache',
    forward:  ctx => skeletonCache.set(ctx.entityId, ctx.skeleton),
    rollback: ctx => skeletonCache.delete(ctx.entityId),
  },
  {
    name: 'entity-file',
    forward:  ctx => fs.writeFile(ctx.path, ctx.content, 'utf8'),
    rollback: ctx => fs.unlink(ctx.path).catch(() => {}),
  },
  {
    name: 'index-update',
    forward:  ctx => updateIndex(ctx.entityId, ctx.meta),
    rollback: ctx => removeFromIndex(ctx.entityId),
  },
], { entityId, skeleton, path, content, meta });
```

---

## E4 (score 24): Negative Cache Tracking + cortex_coverage_gaps Tool
**Closes:** flaw #50 (no coverage query API — no way to ask what Cortex doesn't know)  
**Target file:** `src/knowledge/KnowledgeManager.ts` + new MCP tool `cortex_coverage_gaps`

```typescript
// Linux analogue: DEFINE_PER_CPU(long, nr_dentry_negative), DCACHE_MISS_TYPE
// When a lookup fails, cache the miss. Return miss stats via a dedicated tool.

interface NegativeCacheEntry {
  missedAt: Date;
  missCount: number;
}

class NegativeEntityCache {
  private cache = new Map<string, NegativeCacheEntry>();

  recordMiss(entityIdOrPath: string): void {
    const existing = this.cache.get(entityIdOrPath);
    if (existing) {
      existing.missCount++;
      existing.missedAt = new Date();
    } else {
      this.cache.set(entityIdOrPath, { missedAt: new Date(), missCount: 1 });
    }
  }

  // Call this when a file is ingested — invalidate the negative entry.
  // (Linux analogue: when a file is created, the negative dentry is replaced by a positive one.)
  invalidate(entityIdOrPath: string): void {
    this.cache.delete(entityIdOrPath);
  }

  getGaps(): { path: string; missCount: number; firstMissedAt: Date }[] {
    return Array.from(this.cache.entries()).map(([path, e]) => ({
      path,
      missCount: e.missCount,
      firstMissedAt: e.missedAt,
    }));
  }

  get totalMisses(): number {
    return Array.from(this.cache.values()).reduce((n, e) => n + e.missCount, 0);
  }
}

// In KnowledgeManager, after any failed entity lookup:
//   this.negativeCache.recordMiss(entityId);
// In ingest path, after successful file ingestion:
//   this.negativeCache.invalidate(filePath);

// New MCP tool — cortex_coverage_gaps():
// Returns { missingPaths: string[], totalMissCount: number, oldestMiss: Date }
```

---

## E3 (score 18): Shrinker count_objects/scan_objects Split
**Closes:** flaw #109 (no memory-pressure-driven eviction; threshold hardcoded)  
**Target file:** `src/knowledge/KnowledgeManager.ts`

```typescript
// Linux analogue: struct shrinker { count_objects(); scan_objects(); }
// count_objects: fast, no side effects — returns how many items COULD be freed
// scan_objects: slow — actually frees up to nr_to_scan items, returns nr_freed
// SHRINK_EMPTY: count_objects returns this to skip scan entirely

const SHRINK_EMPTY = 0;

interface EntityShrinker {
  countEvictable(): number;       // fast — no I/O
  evict(budget: number): number;  // slow — removes up to budget items, returns removed count
}

class ExperienceShrinker implements EntityShrinker {
  constructor(
    private experienceLog: ExperienceLog,
    private maxAgeMs: number
  ) {}

  countEvictable(): number {
    const cutoff = Date.now() - this.maxAgeMs;
    const count = this.experienceLog.countEntriesBefore(cutoff);
    return count === 0 ? SHRINK_EMPTY : count;
  }

  evict(budget: number): number {
    if (this.countEvictable() === SHRINK_EMPTY) return 0;
    return this.experienceLog.compactBefore(Date.now() - this.maxAgeMs, budget);
  }
}

// Trigger: on each ingest or on explicit compact call:
function maybeShrink(shrinker: EntityShrinker, pressure: number): void {
  const evictable = shrinker.countEvictable();
  if (evictable === SHRINK_EMPTY) return;

  // Scale budget by pressure (vfs_cache_pressure analogue):
  const budget = Math.ceil((evictable * pressure) / 100);
  shrinker.evict(budget);
}
```

---

## C1 (score 30): Field-Level Locking Documentation Convention
**Proposed phase:** 0.10.1  
**Target file:** `src/knowledge/KnowledgeManager.ts` — apply convention to all shared fields

```typescript
// Linux analogue: workqueue.c:152-191 field-level locking comments
// Convention:
//   I:   set once at construction, read-only thereafter
//   M:   protected by this.mutex (or async lock equivalent)
//   R:   read from any context without lock (but only write under M)
//   V:   version counter — increment on every write under M
//   D:   dirty flag — set under M, checked/cleared under M

class KnowledgeManager {
  // I: set in constructor, never reassigned
  private readonly projectRoot: string;
  private readonly config: CortexConfig;

  // M: all writes must hold asyncMutex; reads safe outside lock
  private entities: Map<string, Entity>;    /* M */
  private index: IndexMetadata;             /* M */

  // V: incremented on every entity write — readers can detect stale snapshots
  private entityVersion = 0;               /* M + V */

  // D: set true by any write; cleared by flush to disk
  private soulDirty = false;               /* M + D */

  // R: read-only cache computed from entities under M; invalidated on write
  private skeletonCache: Map<string, string>; /* R (invalidated under M) */
}
```

---

## C2 (score 18): LRU Walk with 6-State Eviction Enum
**Proposed phase:** 13.5.5  
**Target file:** `src/knowledge/EntityLRUCache.ts` (new file)

```typescript
// Linux analogue: enum lru_status + list_lru_walk_cb
// Fine-grained eviction policy: each item gets to decide its own fate.

enum LruStatus {
  REMOVED,        // item evicted; continue walking
  REMOVED_RETRY,  // item evicted but lock dropped; restart from here
  ROTATE,         // item accessed recently; move to LRU tail (give another pass)
  SKIP,           // item cannot be evicted right now (e.g., in use)
  RETRY,          // item not evictable but may be later; try again
  STOP,           // stop the walk entirely (enough freed)
}

type LruWalkCallback<T> = (item: T, lru: EntityLRUCache<T>) => LruStatus;

class EntityLRUCache<T> {
  private list: T[] = []; // head = most recently used; tail = least recently used

  walk(budget: number, isolate: LruWalkCallback<T>): number {
    let freed = 0;
    let i = this.list.length - 1; // start from LRU tail

    while (i >= 0 && freed < budget) {
      const item = this.list[i];
      const status = isolate(item, this);

      switch (status) {
        case LruStatus.REMOVED:
          this.list.splice(i, 1);
          freed++;
          i--;
          break;
        case LruStatus.ROTATE:
          this.list.splice(i, 1);
          this.list.unshift(item); // move to MRU head
          i--;
          break;
        case LruStatus.SKIP:
        case LruStatus.RETRY:
          i--;
          break;
        case LruStatus.STOP:
          return freed;
        case LruStatus.REMOVED_RETRY:
          freed++;
          i = this.list.length - 1; // restart from new tail
          break;
      }
    }
    return freed;
  }
}
```

---

## C3 (score 18): seq_file Iterator Protocol for Large MCP Responses
**Proposed phase:** 22.1.1  
**Target file:** `src/tools/export.ts` (and any tool with potentially large output)

```typescript
// Linux analogue: seq_file start()/show()/stop() with auto-doubling buffer on overflow
// Pattern: never pre-allocate for unknown output size; grow on demand; page output.

interface SeqOps<T, State> {
  start(cursor: number): State | null;       // return initial state or null if empty
  next(state: State, cursor: number): State | null; // advance; return null at end
  show(state: State): string;                // render current item to string
  stop(state: State | null): void;           // cleanup (e.g., release lock)
}

async function seqRead<T, State>(
  ops: SeqOps<T, State>,
  maxBytes = 64 * 1024 // MCP response limit
): Promise<string> {
  let buf = '';
  let cursor = 0;
  let state = ops.start(cursor);

  try {
    while (state !== null) {
      const chunk = ops.show(state);

      if (buf.length + chunk.length > maxBytes) {
        // Linux Eoverflow analogue: buffer full — could double and retry, or paginate.
        // For MCP tools: return what we have + a pagination cursor.
        buf += `\n<!-- truncated at ${cursor} items; call again with cursor=${cursor} -->`;
        break;
      }

      buf += chunk;
      cursor++;
      state = ops.next(state, cursor);
    }
  } finally {
    ops.stop(state);
  }

  return buf;
}

// Usage in cortex_export or build_context_pack:
const output = await seqRead({
  start: (c) => entities[c] ?? null,
  next:  (s, c) => entities[c] ?? null,
  show:  (entity) => `## ${entity.id}\n${entity.content}\n\n`,
  stop:  () => {},
}, 64 * 1024);
```

---

## C4 (score 18): Seqcount Versioned Entity Reads
**Proposed phase:** 0.10.2  
**Target file:** `src/knowledge/KnowledgeManager.ts`

```typescript
// Linux analogue: do { seq = read_seqcount_begin(); ... } while (read_seqcount_retry(seq));
// In JS: check version before and after any await that could race with a write.

class VersionedEntityReader {
  // Take a snapshot of the entity + its version.
  async readEntity(id: string): Promise<{ entity: Entity; version: number }> {
    const version = this.km.entityVersion;
    const entity = await this.km.getEntity(id); // may await I/O
    // If entity version changed while we were reading, retry.
    if (this.km.entityVersion !== version) {
      return this.readEntity(id); // tail-recursive retry
    }
    return { entity, version };
  }
}

// Note: only needed if readEntity spans an await point while concurrent writes exist.
// Today's single-threaded Node.js with no concurrent writes makes this a no-op.
// Wire this up when Phase 22 (central server with concurrent clients) ships.
```

---

## Scores below 18 (reference only, no skeleton)

| ID | Name | Score | Why skipped |
|----|------|-------|-------------|
| C5 | Workqueue delayed/rcu_work variants | 12 | setTimeout and Promise already handle this in JS; pool management doesn't apply |
| C6 | vruntime relevance aging | 12 | Add as tuneable weight to Phase 13.5.6 scoring formula; premature until flaw #26 baseline is stable |
