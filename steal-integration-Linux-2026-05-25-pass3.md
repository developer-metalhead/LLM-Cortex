# Linux Kernel Pass 3 — Integration Scratch

TypeScript skeletons for all items scoring ≥ 24. Paste into implementation phases.

---

## P3-E1 · warnOnce (DO_ONCE_LITE, score: 60)

```typescript
// src/utils/warn-once.ts
const _warned = new Set<string>();

export function warnOnce(msg: string): void {
  // key derived from call site via stack — set once, never fires again
  const key = new Error().stack?.split('\n')[2]?.trim() ?? msg;
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn(`[cortex] ${msg}`);
}

// Usage in entity cache miss:
//   warnOnce(`Entity "${id}" not found in cache — falling back to disk read`);
// Usage in source tool:
//   warnOnce(`source() called on non-TypeScript file: ${ext} — AST skeleton unavailable`);
```

---

## P3-E2 · RatelimitState (ratelimit_state, score: 40)

```typescript
// src/utils/ratelimit.ts
export class RatelimitState {
  private nLeft: number;
  private missed = 0;
  private begin: number;

  constructor(
    private readonly burst: number,
    private readonly intervalMs: number,
    private readonly label: string
  ) {
    this.nLeft = burst;
    this.begin = Date.now();
  }

  allow(): boolean {
    const now = Date.now();
    if (now - this.begin >= this.intervalMs) {
      if (this.missed > 0) {
        console.warn(`[cortex:ratelimit] ${this.label}: ${this.missed} events suppressed in last ${this.intervalMs}ms`);
        this.missed = 0;
      }
      this.nLeft = this.burst;
      this.begin = now;
    }
    if (this.nLeft > 0) {
      this.nLeft--;
      return true;
    }
    this.missed++;
    return false;
  }

  drainOnExit(): void {
    if (this.missed > 0) {
      process.stderr.write(
        JSON.stringify({ type: 'suppressed_summary', component: this.label, count: this.missed }) + '\n'
      );
    }
  }
}

// Usage:
// const ingestRl = new RatelimitState(5, 60_000, 'ingest-warn');
// if (ingestRl.allow()) console.warn('...');
// process.on('exit', () => ingestRl.drainOnExit());
```

---

## P3-E3 · Three-Level Cache Watermarks (WMARK, score: 40)

```typescript
// src/knowledge/cache-pressure.ts
export const enum WatermarkLevel { HIGH = 0, LOW = 1, MIN = 2 }

export interface CacheWatermarks {
  low: number;   // 70% of max — background eviction
  min: number;   // 90% of max — synchronous evict before admit
  max: number;   // 100%      — WARN + full LRU walk
}

export function computeWatermarks(maxEntities: number): CacheWatermarks {
  return {
    low: Math.floor(maxEntities * 0.70),
    min: Math.floor(maxEntities * 0.90),
    max: maxEntities,
  };
}

export function checkWatermark(current: number, wm: CacheWatermarks): WatermarkLevel {
  if (current < wm.low) return WatermarkLevel.HIGH;
  if (current < wm.min) return WatermarkLevel.LOW;
  return WatermarkLevel.MIN;
}

// In the entity cache admit path:
// const level = checkWatermark(cache.size, watermarks);
// if (level === WatermarkLevel.MIN) {
//   evictSynchronous(1);   // must evict before admitting
// } else if (level === WatermarkLevel.LOW) {
//   scheduleBackgroundEviction();
// }
// if (cache.size >= watermarks.max) {
//   warnOnce('Entity cache at capacity — forcing full LRU walk');
//   evictFullLRU();
// }
```

---

## P3-E4 · Missed-Counter Drain Pattern (ratelimit_state_exit, score: 36)

See `RatelimitState.drainOnExit()` above — already included in P3-E2 skeleton.

Register all `RatelimitState` instances in a module-level registry so shutdown can drain all at once:

```typescript
// src/utils/ratelimit.ts (addition)
const _registry: RatelimitState[] = [];

export function registerRatelimit(rs: RatelimitState): RatelimitState {
  _registry.push(rs);
  return rs;
}

export function drainAllRatelimits(): void {
  for (const rs of _registry) rs.drainOnExit();
}

// In daemon shutdown:
// process.on('SIGTERM', () => { drainAllRatelimits(); process.exit(0); });
```

---

## P3-E5 · RCU Generation-Pointer Cache Snapshot (score: 32)

```typescript
// src/knowledge/entity-cache.ts (addition)
class VersionedEntityCache {
  private active: ReadonlyMap<string, CachedEntity>;
  private shadow: Map<string, CachedEntity>;
  private generation = 0;

  constructor() {
    this.active = new Map();
    this.shadow = new Map();
  }

  // MCP tool handlers call this — always reads a consistent snapshot
  read(entityId: string): CachedEntity | undefined {
    return this.active.get(entityId);
  }

  // File watcher calls these — builds shadow, then swaps atomically
  shadowSet(entityId: string, entity: CachedEntity): void {
    this.shadow.set(entityId, entity);
  }

  shadowDelete(entityId: string): void {
    this.shadow.delete(entityId);
  }

  // Atomic swap — RCU assign_pointer equivalent
  // Call at end of watcher batch, not mid-update
  commitShadow(): void {
    this.generation++;
    this.active = new Map(this.shadow);
    // Don't clear shadow — it becomes the base for the next batch
  }

  get currentGeneration(): number {
    return this.generation;
  }
}
```

---

## P3-E6 · BatchedCounter (percpu_counter, score: 24)

```typescript
// src/utils/batched-counter.ts
export class BatchedCounter {
  private localDelta = 0;
  private count = 0;
  private readonly BATCH: number;

  constructor(batch = 64) {
    this.BATCH = batch;
  }

  add(amount: number): void {
    this.localDelta += amount;
    if (Math.abs(this.localDelta) >= this.BATCH) {
      this.count += this.localDelta;
      this.localDelta = 0;
    }
  }

  /** Cheap approximate read — may be off by up to BATCH */
  read(): number {
    return this.count;
  }

  /** Exact read — flushes local delta first */
  sum(): number {
    if (this.localDelta !== 0) {
      this.count += this.localDelta;
      this.localDelta = 0;
    }
    return this.count;
  }
}

// Usage:
// const tokenCounter = new BatchedCounter(64);
// tokenCounter.add(responseTokens);  // hot path — no sync
// ledger.totalTokens = tokenCounter.sum();  // billing export — exact
```

---

## P3-C1 · kfifo Power-of-2 Ring Queue (score: 24)

```typescript
// src/utils/ring-queue.ts
function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

export class RingQueue<T> {
  private readonly buf: (T | undefined)[];
  private readonly mask: number;
  private head = 0;  // producer index (in)
  private tail = 0;  // consumer index (out)

  constructor(capacity: number) {
    const size = nextPow2(capacity);
    this.buf = new Array(size);
    this.mask = size - 1;
  }

  get length(): number { return this.head - this.tail; }
  get isFull():  boolean { return this.length > this.mask; }
  get isEmpty(): boolean { return this.head === this.tail; }

  push(item: T): boolean {
    if (this.isFull) return false;
    this.buf[this.head & this.mask] = item;
    this.head++;
    return true;
  }

  shift(): T | undefined {
    if (this.isEmpty) return undefined;
    const item = this.buf[this.tail & this.mask];
    this.buf[this.tail & this.mask] = undefined;
    this.tail++;
    return item;
  }
}

// Usage: replace compaction work queue
// const compactionQueue = new RingQueue<CompactionTask>(64);
// compactionQueue.push({ entityId, priority }) || warnOnce('Compaction queue full — dropping low-priority task');
```

---

## To paste into flaws.md

### New Flaw #146 — No Rate Limiting or Deduplication on Repeated Logs

```
### 146. No Rate Limiting or Deduplication on Repeated Logs
**Source-of-lesson**: Linux kernel `include/linux/ratelimit_types.h:16` + `include/linux/once_lite.h:13` — the kernel has a complete three-layer log discipline: (1) `printk_once` / `pr_warn_once` for one-time notices; (2) `printk_ratelimited` / `ratelimit_state` for burst-capped repeated warnings; (3) `ratelimit_state_exit()` for suppression summaries on teardown.
**Pattern**: Emitting the same warning/info line on every tool invocation (entity-cache-miss, non-TypeScript source warning, config notice) with no throttling, burst cap, or once-sentinel. Long ingest sessions produce thousands of identical lines that drown out meaningful signals.
**Relevance to Cortex**: Wrap all per-invocation warnings behind `warnOnce(msg)` (DO_ONCE_LITE pattern, P3-E1, score: 60) for truly one-time notices, and `RatelimitState { burst: 5, interval: 60_000 }` (P3-E2, score: 40) for recurring-but-throttled warnings. On graceful shutdown, drain all `RatelimitState` instances and emit suppression summaries to the experience ledger (P3-E4, score: 36).
**Severity**: 3 (HIGH — noisy logs erode trust and hide real errors; repeated identical warnings are the most common reason developers disable logging entirely)
```

### New Flaw #147 — Entity Cache Has No Snapshot Consistency Across Async Operations

```
### 147. Entity Cache Has No Snapshot Consistency Across Async Operations
**Source-of-lesson**: Linux kernel `include/linux/rcupdate.h:101` — RCU separates readers (which always see a consistent snapshot, never block) from writers (which build a new version, then atomically swap the pointer). The `__rcu` type annotation enforces that RCU-protected pointers are never accessed outside a read-side critical section.
**Pattern**: The entity cache Map is mutated by the file watcher and read by MCP tool handlers in the same event loop tick. An async handler that reads the cache mid-update may see a partially-updated state (some entities updated, some not) with no indication that the snapshot is inconsistent.
**Relevance to Cortex**: Apply generation-pointer discipline: `activeCache` (read by all MCP handlers, never mutated mid-call) and `shadowCache` (built by the watcher). Watcher calls `commitShadow()` only at batch boundaries. Handlers read `activeCache` and always see a consistent snapshot. See `steal-integration-Linux-2026-05-25-pass3.md` P3-E5 skeleton.
**Severity**: 3 (HIGH — silent partial reads are the hardest class of bug to reproduce; manifests as stale entity data returned to the LLM with no error signal)
```

---

## To update in flaws.md

Flaw #109 — add after existing "Addressed by (EWMA signal)" line:
```
**Addressed by (graduated watermarks)**: Phase 0.11 Refinement — WMARK Three-Level Graduated Cache Pressure (Linux kernel audit pass 3, score: 40) — `CACHE_LOW`/`CACHE_MIN`/`CACHE_MAX` watermarks computed proportionally from `maxEntities`; background eviction at LOW, synchronous eviction at MIN, full LRU walk at MAX. See `steal-integration-Linux-2026-05-25-pass3.md` P3-E3.
```

Flaw #145 — add:
```
**Addressed by**: Phase 7 Refinement — BatchedCounter Approximate Accumulation (Linux kernel audit pass 3, score: 24) — local delta accumulates increments up to `BATCH=64`; flushes to central count only on overflow; `read()` for dashboards (approximate), `sum()` for billing exports (exact). See `steal-integration-Linux-2026-05-25-pass3.md` P3-E6.
```

Flaw #146 (new) — closed by P3-E1 (score 60), P3-E2 (score 40), P3-E4 (score 36)

Flaw #147 (new) — closed by P3-E5 (score 32)
