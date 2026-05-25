# Integration Scratch — Linux Kernel Pass 2 (2026-05-25)

TypeScript skeletons for all C/E items scoring ≥ 20. Items scoring 18 follow (top 3 tie).
Kernel analogue cited for each. Target files are starting points, not production code.

---

## To paste into flaws.md

### Flaw #145 — Unchecked Integer Arithmetic in Accumulation Counters
**Severity**: 2 MEDIUM  
**Description**: Token counts, savings ledger sums, and score computations use bare `+` arithmetic without overflow guards. If a counter approaches `Number.MAX_SAFE_INTEGER` (9007199254740991), results silently lose precision with no error or warning. The Linux kernel uses `check_add_overflow()` for every accumulation counter — Cortex uses none.  
**Source-of-lesson**: `include/linux/overflow.h:61` — `check_add_overflow(a, b, d)` returns true on wrap-around; `wrapping_add(type, a, b)` is the intentional-wraparound variant.  
**Structural enforcement required**: `scripts/check-unsafe-arithmetic.ts` CI grep for `+= ` patterns in counters (token counts, version numbers, ledger sums) missing `isSafeInteger` guard.

---

## To update in flaws.md

```
Flaw #5 — add:
**Addressed by**: Phase 0.17 Refinement — BFS Cycle Detection with Generation Counter (Linux kernel audit pass 2, score: 36)

Flaw #109 — add:
**Addressed by (EWMA signal)**: Phase 0.11 Refinement — DECLARE_EWMA Adaptive Compaction Pressure (Linux kernel audit pass 2, score: 36)

Flaw #141 — add:
**Addressed by**: Phase 5 Refinement — Bounded Event Queue + IN_Q_OVERFLOW Sentinel (Linux kernel audit pass 2, score: 36)

Flaw #144 — add:
**Addressed by**: Phase 0.11 Refinement — cortex.json Schema Bounds Validation (Linux kernel audit pass 2, score: 24)
```

---

## To paste into implementation_plan.md

---

### Phase 0.17 Refinement — BFS Cycle Detection with Generation Counter — closes Flaw #5 (Linux kernel audit pass 2, score: 36)

**Kernel analogue**: `kernel/locking/lockdep.c:1469–2179` — `struct circular_queue` + `dep_gen_id` generation counter + `check_noncircular(src, target)`. BFS over the lock dependency graph; visited nodes marked with current generation ID (no Set clearing between searches).

**Problem** (Flaw #5): `lint` detects cycles in entity cross-references and reports ERROR. `audit_quality` runs a completely separate code path that ignores cycles entirely. Two tools, two answers, users can't trust either.

**Change** — add shared cycle detector to `src/knowledge/` (or `src/tools/lint.ts`):

```typescript
// Generation counter: increment before each BFS search.
// Visited check: node.visitedGen === currentGen (no Set.clear() needed).
let bfsGeneration = 0;

interface GraphNode {
  id: string;
  visitedGen: number;  // 0 initially; set to bfsGeneration when visited
  parent: GraphNode | null; // for path reconstruction
}

type GraphEdgeFn = (nodeId: string) => string[]; // returns adjacent node IDs

/**
 * BFS path check: can we reach `targetId` starting from `sourceId`?
 * If yes, adding targetId → sourceId would create a cycle.
 * Returns the path from source to target (shortest cycle path), or null if no cycle.
 *
 * Kernel analogue: check_noncircular() calls __bfs_forwards() which uses
 * circular_queue and dep_gen_id to detect cycles in the lock dependency graph.
 */
function detectCycle(
  sourceId: string,
  targetId: string,
  getNeighbors: GraphEdgeFn,
  nodes: Map<string, GraphNode>
): string[] | null {
  bfsGeneration++;
  const queue: GraphNode[] = [];

  const sourceNode = nodes.get(sourceId);
  if (!sourceNode) return null;

  sourceNode.visitedGen = bfsGeneration;
  sourceNode.parent = null;
  queue.push(sourceNode);

  while (queue.length > 0) {
    const current = queue.shift()!;

    for (const neighborId of getNeighbors(current.id)) {
      if (neighborId === targetId) {
        // Found path: source → ... → target. Adding target → source = cycle.
        return reconstructPath(current, nodes, sourceId).concat(targetId);
      }

      const neighbor = nodes.get(neighborId);
      if (!neighbor || neighbor.visitedGen === bfsGeneration) continue;

      neighbor.visitedGen = bfsGeneration;
      neighbor.parent = current;
      queue.push(neighbor);
    }
  }

  return null; // no cycle
}

function reconstructPath(
  node: GraphNode,
  nodes: Map<string, GraphNode>,
  stopAt: string
): string[] {
  const path: string[] = [];
  let current: GraphNode | null = node;
  while (current && current.id !== stopAt) {
    path.unshift(current.id);
    current = current.parent;
  }
  path.unshift(stopAt);
  return path;
}

// Wire into lint tool AND audit_quality tool (same function, same results):
// const cyclePath = detectCycle(entityA, entityB, getEntityDependents, entityNodes);
// if (cyclePath) {
//   findings.push({ severity: 'ERROR', message: `Cycle: ${cyclePath.join(' → ')}` });
// }
```

**Definition of Done**
- `detectCycle()` lives in a shared utility (e.g., `src/knowledge/graph-utils.ts`).
- Both `lint` and `audit_quality` import and use it — no duplicated cycle-detection logic.
- Test: build a 5-entity cycle graph → `detectCycle` returns the shortest path; add entity without cycle → returns null.
- Flaw #5 status: "Resolved" — lint and audit_quality produce identical cycle findings.

**Counter-case**: Cortex's entity graph is small (<200 entities); O(n) DFS is negligible. The generation counter optimization is premature at this scale. Worth adding for the shared-function fix alone, not for the performance gain.

---

### Phase 0.11 Refinement — DECLARE_EWMA: Adaptive Compaction Pressure — closes Flaw #109 (Linux kernel audit pass 2, score: 36)

**Kernel analogue**: `include/linux/average.h:28` — `DECLARE_EWMA(name, _precision, _weight_rcp)`. Integer-only EWMA. `_weight_rcp` must be power of 2; new value weight = `1/_weight_rcp`, old state weight = `1 - 1/_weight_rcp`. Update: `internal = ((internal << shift) - internal + (val << precision)) >> shift`.

**Problem** (Flaw #109): `compaction_pressure` from E1 (pass 1) is a static tunable. It lets users control the threshold but doesn't automatically tighten when knowledge quality degrades. Users must manually diagnose and adjust.

**Change** — add `EntityCacheEWMA` to `src/knowledge/experience.ts`:

```typescript
// EWMA for cache hit rate: precision=8 (fractional bits), weight_rcp=8 (8 samples).
// hit_rate EWMA: 0..255 (maps to 0%..100% via /256).
// Under sustained misses, EWMA decays toward 0 → triggers aggressive compaction.

const EWMA_PRECISION = 8;      // 8 fractional bits
const EWMA_WEIGHT_RCP = 8;     // new value weight = 1/8

class EntityCacheEWMA {
  private internal = 0; // fixed-precision: value = internal >> EWMA_PRECISION

  add(hitRatePct: number): void {
    const val = Math.floor(hitRatePct * (1 << EWMA_PRECISION) / 100);
    if (this.internal === 0) {
      this.internal = val << EWMA_PRECISION;
    } else {
      // ((internal << shift) - internal + (val << precision)) >> shift
      this.internal = (
        ((this.internal << Math.log2(EWMA_WEIGHT_RCP)) - this.internal) +
        (val << EWMA_PRECISION)
      ) >> Math.log2(EWMA_WEIGHT_RCP);
    }
  }

  read(): number {
    // Returns current EWMA hit rate as 0..100 integer
    return (this.internal >> EWMA_PRECISION) * 100 / (1 << EWMA_PRECISION);
  }

  get pressureLevel(): 'low' | 'medium' | 'critical' {
    const rate = this.read();
    if (rate < 10) return 'critical';
    if (rate < 40) return 'medium';
    return 'low';
  }
}

// Usage in experience.ts after every entity lookup:
//   hitRateEWMA.add(hit ? 100 : 0);
//   if (hitRateEWMA.pressureLevel === 'critical') maybeShrink(shrinker, 200);
//   if (hitRateEWMA.pressureLevel === 'medium')   maybeShrink(shrinker, 100);
```

**Definition of Done**
- `EntityCacheEWMA` is called after every `getEntity()` call with `hit ? 100 : 0`.
- When EWMA pressure is `critical`, `maybeShrink()` runs with `pressure=200` (double the default).
- When `low`, compaction is deferred (effectively `pressure=50`).
- The `compaction_pressure` tunable from E1 (pass 1) controls `_weight_rcp` — users can tune responsiveness.
- Test: 20 consecutive misses → `pressureLevel === 'critical'`; 20 consecutive hits → `pressureLevel === 'low'`.

**Counter-case**: EWMA adds temporal hysteresis. A one-time large ingest causes a sustained low hit-rate period, triggering aggressive compaction on healthy cache.

---

### Phase 5 Refinement — Bounded Event Queue + IN_Q_OVERFLOW Sentinel — closes Flaw #141 (Linux kernel audit pass 2, score: 36)

**Kernel analogue**: `fs/notify/inotify/inotify_user.c:50` — `inotify_max_queued_events` sysctl (configurable cap); when exceeded, drops all subsequent events and enqueues exactly one `IN_Q_OVERFLOW` pseudo-event.

**Problem** (Flaw #141): Cortex's file watcher (Phase 5, `chokidar`) emits events with no back-pressure. A `git checkout` with 10k file changes fills the event callback queue unboundedly.

**Change** — add bounded queue wrapper around the watcher event handler in `src/watcher/`:

```typescript
const MAX_WATCHER_QUEUE_DEPTH = config.maxWatcherQueueDepth ?? 1000; // from cortex.json

interface WatchEvent {
  type: 'add' | 'change' | 'unlink' | 'overflow';
  path: string;
}

class BoundedWatcherQueue {
  private queue: WatchEvent[] = [];
  private overflowed = false;

  enqueue(event: WatchEvent): void {
    if (this.overflowed) return; // already in overflow state — discard

    if (this.queue.length >= MAX_WATCHER_QUEUE_DEPTH) {
      // inotify analogue: drop all queued events, enqueue one IN_Q_OVERFLOW
      this.queue = [{ type: 'overflow', path: '' }];
      this.overflowed = true;
      return;
    }

    this.queue.push(event);
  }

  drain(): WatchEvent[] {
    const events = [...this.queue];
    this.queue = [];
    this.overflowed = false; // reset after drain, like inotify after consumer processes overflow
    return events;
  }

  get hasOverflow(): boolean {
    return this.queue.some(e => e.type === 'overflow');
  }
}

// When overflow event is drained by consumer:
//   if (events.some(e => e.type === 'overflow')) {
//     // Re-scan entire watched directory (full re-ingest)
//     await triggerFullRescan(watchedRoot);
//   } else {
//     for (const event of events) await processFileEvent(event);
//   }
```

**Definition of Done**
- `maxWatcherQueueDepth` is a `cortex.json` key with bounds `[10, 100000]`, default `1000`.
- When queue exceeds depth, all pending events are replaced by one `{ type: 'overflow' }`.
- Consumer checks for overflow and triggers `triggerFullRescan()` instead of individual event processing.
- Test: enqueue 1001 events with max=1000 → queue contains exactly 1 event of type `overflow`; drain + re-enqueue normal event → queue returns to normal mode.

**Counter-case**: An overflow event requires a full re-scan, which may be more expensive than processing the original events. Must ensure `triggerFullRescan()` is implemented and bounded (incremental ingest, not full re-index).

---

### Phase 0.11 Refinement — cortex.json Schema Bounds Validation — closes Flaw #144 (Linux kernel audit pass 2, score: 24)

**Kernel analogue**: `fs/notify/inotify/inotify_user.c:61` — `ctl_table` with `.extra1 = &it_zero`, `.extra2 = &it_int_max`; kernel's `proc_doulongvec_minmax()` rejects out-of-range values with EINVAL before they reach the application.

**Problem** (Flaw #144): `cortex.json` has no schema validation. An invalid `compaction_pressure: -5` or `maxWatcherQueueDepth: 999999999` is silently accepted and produces unpredictable behavior.

**Change** — add `validateConfig()` to `src/config.ts` (or wherever `cortex.json` is parsed):

```typescript
interface ConfigBounds<T> {
  min: T;
  max: T;
  default: T;
  description: string;
}

const CONFIG_SCHEMA: Record<string, ConfigBounds<number>> = {
  compaction_pressure:    { min: 1,  max: 1000,    default: 100,  description: "Compaction aggressiveness (100=default, >100=more aggressive)" },
  maxWatcherQueueDepth:   { min: 10, max: 100_000, default: 1000, description: "Max pending watcher events before overflow" },
  ewmaWeightRcp:          { min: 2,  max: 64,      default: 8,    description: "EWMA responsiveness — must be power of 2" },
  pressureWindowSize:     { min: 5,  max: 10_000,  default: 50,   description: "Lookups per pressure window" },
};

function validateConfig(raw: Record<string, unknown>): { config: CortexConfig; errors: string[] } {
  const errors: string[] = [];
  const config: Partial<CortexConfig> = {};

  for (const [key, bounds] of Object.entries(CONFIG_SCHEMA)) {
    const raw_val = raw[key] ?? bounds.default;
    if (typeof raw_val !== 'number' || !Number.isInteger(raw_val)) {
      errors.push(`cortex.json: ${key} must be an integer (got ${JSON.stringify(raw_val)}); using default ${bounds.default}`);
      config[key as keyof CortexConfig] = bounds.default as never;
      continue;
    }
    if (raw_val < bounds.min || raw_val > bounds.max) {
      errors.push(`cortex.json: ${key}=${raw_val} out of range [${bounds.min}, ${bounds.max}]; using default ${bounds.default}`);
      config[key as keyof CortexConfig] = bounds.default as never;
    } else {
      config[key as keyof CortexConfig] = raw_val as never;
    }
  }

  return { config: config as CortexConfig, errors };
}

// In server startup:
// const { config, errors } = validateConfig(rawJson);
// if (errors.length > 0) {
//   console.warn('[cortex] Config validation warnings:\n' + errors.join('\n'));
// }
```

**Definition of Done**
- `validateConfig()` called at MCP server startup; errors printed as warnings (not fatal — use defaults).
- Every numeric key in `cortex.json` has an entry in `CONFIG_SCHEMA` with explicit `min`, `max`, `default`.
- Test: `compaction_pressure: 0` → error logged, value set to 100; `compaction_pressure: 500` → accepted; `compaction_pressure: "fast"` → error logged, value set to 100.

**Counter-case**: Runtime validation duplicates JSON Schema `minimum`/`maximum` keywords. A proper `cortex.schema.json` would let editors show validation errors before startup. Both approaches are correct; this one fires at runtime for guaranteed enforcement.

---

### Phase 0.11 Refinement — Scanned/Reclaimed Miss-Ratio → 3-Level Compaction Pressure (Linux kernel audit pass 2, score: 27)

**Kernel analogue**: `mm/vmpressure.c:120` — `vmpressure_calc_level(scanned, reclaimed)` computes `pressure = (scanned-reclaimed)/scanned*100`; maps to `LOW (<60%)`, `MEDIUM (60–95%)`, `CRITICAL (≥95%)`. Accumulates over a window of `vmpressure_win` pages before firing.

**Problem**: Even with the E6 EWMA, there's no event-driven pressure dispatch. The miss ratio window provides a discrete "fire at N operations" trigger compatible with existing flush intervals.

**Change** — add `KnowledgePressureMonitor` to `src/knowledge/KnowledgeManager.ts`:

```typescript
enum PressureLevel { LOW = 'low', MEDIUM = 'medium', CRITICAL = 'critical' }

const PRESSURE_WIN = config.pressureWindowSize ?? 50; // operations per window
const PRESSURE_MED = 60;      // % miss rate → MEDIUM
const PRESSURE_CRIT = 95;     // % miss rate → CRITICAL

class KnowledgePressureMonitor {
  private windowScanned = 0;
  private windowHits = 0;

  record(hit: boolean): PressureLevel | null {
    this.windowScanned++;
    if (hit) this.windowHits++;

    if (this.windowScanned < PRESSURE_WIN) return null; // window not full yet

    const reclaimed = this.windowHits;
    const scanned = this.windowScanned;

    // vmpressure_calc_level analogue:
    if (reclaimed >= scanned) {
      this.reset();
      return PressureLevel.LOW;
    }

    const missRatio = Math.round((scanned - reclaimed) * 100 / scanned);
    this.reset();

    if (missRatio >= PRESSURE_CRIT) return PressureLevel.CRITICAL;
    if (missRatio >= PRESSURE_MED)  return PressureLevel.MEDIUM;
    return PressureLevel.LOW;
  }

  private reset(): void {
    this.windowScanned = 0;
    this.windowHits = 0;
  }
}

// In KnowledgeManager.getEntity():
//   const hit = entityExists;
//   const level = pressureMonitor.record(hit);
//   if (level === PressureLevel.CRITICAL) await maybeShrink(shrinker, 200);
//   if (level === PressureLevel.MEDIUM)   await maybeShrink(shrinker, 100);
```

**Definition of Done**
- `KnowledgePressureMonitor` fires after every `PRESSURE_WIN` entity lookups.
- CRITICAL → `maybeShrink(shrinker, 200)` (double-rate compaction).
- MEDIUM → `maybeShrink(shrinker, 100)` (normal compaction).
- LOW → no compaction triggered.
- Warm-up guard: no pressure fired until at least `PRESSURE_WIN` lookups have occurred since startup.
- Test: 50 consecutive misses → CRITICAL dispatched; 50 consecutive hits → LOW.

**Counter-case**: Cold-start Cortex has 100% miss rate (nothing cached). Without the warm-up guard, CRITICAL fires immediately on first `PRESSURE_WIN` lookups, triggering compaction on an empty cache.

---

## Items scoring 18 (below threshold but top-tie — reference skeletons)

### C8 — Shadow Entry + Refault Distance (Phase 13.5 Refinement)

```typescript
// Kernel analogue: mm/workingset.c:390 workingset_eviction() + workingset_test_recent()
// On eviction: store eviction clock. On refault: if distance ≤ active-set size, promote immediately.

interface ShadowEntry {
  evictionClock: number;  // value of cache.evictionClock at time of eviction
}

class TwoTierSkeletonCache {
  private active = new Map<string, string>();   // hot entities
  private inactive = new Map<string, string>(); // cold entities (1 access)
  private shadows = new Map<string, ShadowEntry>(); // eviction ghosts
  evictionClock = 0;

  get(entityId: string): string | undefined {
    if (this.active.has(entityId)) return this.active.get(entityId);

    if (this.inactive.has(entityId)) {
      // Second access → promote to active (two-tier CLOCK)
      const val = this.inactive.get(entityId)!;
      this.inactive.delete(entityId);
      this.active.set(entityId, val);
      return val;
    }

    // Cache miss — check shadow for refault distance
    const shadow = this.shadows.get(entityId);
    if (shadow) {
      const refaultDistance = (this.evictionClock - shadow.evictionClock) >>> 0; // unsigned
      const activeSize = this.active.size;
      if (refaultDistance <= activeSize) {
        // workingset_refault analogue: eviction was premature — skip inactive, go straight to active
        this.shadows.delete(entityId);
        // Caller loads entity and sets it directly in active tier (see set() below)
        return undefined; // signal: refault detected, load and promote
      }
      this.shadows.delete(entityId);
    }

    return undefined;
  }

  set(entityId: string, value: string, directToActive = false): void {
    if (directToActive) {
      this.active.set(entityId, value);
    } else {
      this.inactive.set(entityId, value); // new entries start on inactive list
    }
    this.evictionClock++;
  }

  evict(entityId: string): void {
    this.shadows.set(entityId, { evictionClock: this.evictionClock });
    this.active.delete(entityId);
    this.inactive.delete(entityId);
  }
}
```

### C9 — Adaptive Context-Pack Window (Phase 13 Refinement)

```typescript
// Kernel analogue: mm/readahead.c:394 get_next_ra_size()
// Ramp: < max/16 → 4×; <= max/2 → 2×; else max.

const MAX_PREFETCH_WINDOW = 20; // entities
const MIN_PREFETCH_WINDOW = 1;

class AdaptiveContextWindow {
  private windowSize = MIN_PREFETCH_WINDOW;
  private prevEntityId: string | null = null;
  private consecutiveSequential = 0;

  // Returns how many entities to pre-fetch beyond the explicitly requested one.
  onAccess(entityId: string, wasSequential: boolean): number {
    if (wasSequential) {
      this.consecutiveSequential++;
      // Only expand window after 3+ confirmed sequential accesses (guard against false positives)
      if (this.consecutiveSequential >= 3) {
        this.windowSize = getNextWindowSize(this.windowSize, MAX_PREFETCH_WINDOW);
      }
    } else {
      this.consecutiveSequential = 0;
      this.windowSize = MIN_PREFETCH_WINDOW; // reset on random access
    }
    this.prevEntityId = entityId;
    return this.windowSize;
  }
}

function getNextWindowSize(cur: number, max: number): number {
  if (cur < max / 16) return 4 * cur;
  if (cur <= max / 2)  return 2 * cur;
  return max;
}

// In build_context_pack, after fetching the primary entity:
// const additionalCount = window.onAccess(entityId, isSequential);
// const prefetchIds = getNextNEntities(entityId, additionalCount); // ordered by dependency
// // Fetch synchronously first N/2, async the rest (readahead pipelining)
```

### C10 — Sequence Cookie Async (Phase 5 Refinement)

```typescript
// Kernel analogue: kernel/async.c:59 — async_cookie_t, async_synchronize_cookie_domain()

type IngestCookie = number;
let nextCookie: IngestCookie = 1;
const MAX_QUEUE_DEPTH = 500; // graceful sync fallback threshold

interface IngestDomain { name: string; pending: Map<IngestCookie, Promise<void>> }

const domains = new Map<string, IngestDomain>();

async function scheduleIngest(
  filePath: string,
  domain: string,
  ingestFn: (path: string) => Promise<void>
): Promise<IngestCookie> {
  const cookie = nextCookie++;
  const dom = domains.get(domain) ?? (() => {
    const d: IngestDomain = { name: domain, pending: new Map() };
    domains.set(domain, d);
    return d;
  })();

  // async.c graceful-sync fallback: if queue too deep, execute synchronously
  if (dom.pending.size > MAX_QUEUE_DEPTH) {
    await ingestFn(filePath);
    return cookie;
  }

  const promise = ingestFn(filePath).finally(() => dom.pending.delete(cookie));
  dom.pending.set(cookie, promise);
  return cookie;
}

async function synchronizeUpTo(cookie: IngestCookie, domain: string): Promise<void> {
  const dom = domains.get(domain);
  if (!dom) return;
  // Wait for all operations with cookie <= target
  const relevant = [...dom.pending.entries()]
    .filter(([c]) => c <= cookie)
    .map(([, p]) => p);
  await Promise.all(relevant);
}

// Usage:
// const cookies = await Promise.all(files.map(f => scheduleIngest(f, 'projectX', ingestFile)));
// await synchronizeUpTo(Math.max(...cookies), 'projectX'); // wait for all projectX ingest
```

### C14 — Two-Tier CLOCK (Phase 13.5 Refinement)

```typescript
// Kernel analogue: mm/workingset.c:27 — inactive (fault in here) + active (promoted on 2nd access)
// Already partially covered by C8 skeleton above (TwoTierSkeletonCache).
// This skeleton focuses on the demotion path (active list grows too large).

class TwoTierClock<T> {
  private inactive: Map<string, T> = new Map(); // LRU order: head=MRU, tail=LRU
  private active: Map<string, T> = new Map();
  
  constructor(
    private readonly maxActive: number,   // active list size cap before demotion
    private readonly maxInactive: number  // inactive list size cap before eviction
  ) {}

  access(id: string, value?: T): T | undefined {
    if (this.active.has(id)) {
      // Already active: refresh position (move to head)
      const v = this.active.get(id)!;
      this.active.delete(id);
      this.active.set(id, v);
      return v;
    }

    if (this.inactive.has(id)) {
      // Second access on inactive → promote to active
      const v = this.inactive.get(id)!;
      this.inactive.delete(id);
      this.active.set(id, v);

      // Active list too large → demote oldest active to inactive
      if (this.active.size > this.maxActive) {
        const [oldestId, oldestVal] = this.active.entries().next().value;
        this.active.delete(oldestId);
        this.inactive.set(oldestId, oldestVal);
      }
      return v;
    }

    // First access: add to inactive (head)
    if (value !== undefined) {
      if (this.inactive.size >= this.maxInactive) {
        // Evict LRU tail of inactive (reclaim path)
        const [oldestId] = this.inactive.entries().next().value;
        this.inactive.delete(oldestId);
      }
      this.inactive.set(id, value);
    }

    return undefined;
  }
}
```
