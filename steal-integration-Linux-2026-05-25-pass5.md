# Linux Kernel Pass 5 — Integration Scratch

TypeScript skeletons for all items scoring ≥ 30.

---

## P5-E1 · CompactionBackoff (defer_compaction, score: 60)

```typescript
// src/knowledge/compaction-backoff.ts
const COMPACT_MAX_DEFER_SHIFT = 6;  // max 64 consecutive skips

export class CompactionBackoff {
  private deferShift = 0;
  private considered = 0;

  /** Returns true → skip compaction this time */
  isDeferred(): boolean {
    if (this.deferShift === 0) return false;
    this.considered++;
    return this.considered < (1 << this.deferShift);
  }

  /** Call after a compaction failure */
  defer(): void {
    if (this.deferShift < COMPACT_MAX_DEFER_SHIFT) this.deferShift++;
    this.considered = 0;
  }

  /** Call after a successful compaction */
  reset(): void {
    this.deferShift = 0;
    this.considered = 0;
  }
}

// In ExperienceManager.maybeCompact():
// const backoff = new CompactionBackoff();
// if (backoff.isDeferred()) return;
// try { await compact(); backoff.reset(); }
// catch (e) { backoff.defer(); throw e; }
```

---

## P5-E2 · EntitySlotAllocator (idr_alloc_cyclic, score: 40)

```typescript
// src/knowledge/slot-allocator.ts
export class EntitySlotAllocator {
  private readonly free: boolean[];
  private next = 0;

  constructor(private readonly capacity: number) {
    this.free = new Array(capacity).fill(true);
  }

  /** Allocates the next available slot starting from idr_next (cyclic). */
  alloc(): number | null {
    for (let i = 0; i < this.capacity; i++) {
      const slot = (this.next + i) % this.capacity;
      if (this.free[slot]) {
        this.free[slot] = false;
        this.next = (slot + 1) % this.capacity;  // idr_alloc_cyclic advance
        return slot;
      }
    }
    return null;  // all slots occupied
  }

  free(slot: number): void {
    this.free[slot] = true;
    // do NOT reset this.next — cyclic behaviour prevents immediate reuse
  }
}

// Paired with DirtyBitmap from pass 4:
// const slots = new EntitySlotAllocator(MAX_ENTITIES);
// On admit: entity.slot = slots.alloc(); dirtyBitmap.clear(entity.slot);
// On evict: slots.free(entity.slot);
```

---

## P5-E3 · ThreeHorizonLoad (loadavg EXP_1/5/15, score: 32)

```typescript
// src/knowledge/load-average.ts
// Fixed-point EWMA matching Linux loadavg.c: FSHIFT=11
const FSHIFT = 11;
const FIXED_1 = 1 << FSHIFT;

// Decay constants: 1/exp(TICK/window) scaled by FIXED_1
// Approximations for 5s tick over 1/5/15 min windows
const EXP_SHORT  = Math.round(FIXED_1 * Math.exp(-5 / 60));    // ~1 min
const EXP_MEDIUM = Math.round(FIXED_1 * Math.exp(-5 / 300));   // ~5 min
const EXP_LONG   = Math.round(FIXED_1 * Math.exp(-5 / 900));   // ~15 min

function calcLoad(load: number, exp: number, active: number): number {
  return Math.round((load * exp + active * (FIXED_1 - exp)) / FIXED_1);
}

export class ThreeHorizonLoad {
  private short  = 0;
  private medium = 0;
  private long   = 0;

  /** Call every TICK_MS (e.g. 5000ms) with current active query count */
  tick(active: number): void {
    this.short  = calcLoad(this.short,  EXP_SHORT,  active);
    this.medium = calcLoad(this.medium, EXP_MEDIUM, active);
    this.long   = calcLoad(this.long,   EXP_LONG,   active);
  }

  get pressure(): 'spike' | 'sustained' | 'normal' {
    const s = this.short / FIXED_1;
    const l = this.long  / FIXED_1;
    if (s > 0.8 && l > 0.8) return 'sustained';
    if (s > 0.8 && l < 0.4) return 'spike';
    return 'normal';
  }

  get readings() {
    return {
      short:  this.short  / FIXED_1,
      medium: this.medium / FIXED_1,
      long:   this.long   / FIXED_1,
    };
  }
}
```

---

## P5-C1 · EventBatchList (llist bulk-pop, score: 60)

```typescript
// src/watcher/event-batch-list.ts
// Discipline: producer (watcher callback) pushes; consumer (drain) pops-all-at-once.
// No event is lost if it arrives during drain — it goes onto the fresh head.

interface EventNode { event: WatchEvent; next: EventNode | null; }

export class EventBatchList {
  private head: EventNode | null = null;

  push(event: WatchEvent): void {
    // llist_add: prepend — newest first
    this.head = { event, next: this.head };
  }

  /** llist_del_all: detach entire chain, return it, reset head to null */
  popAll(): WatchEvent[] {
    const chain = this.head;
    this.head = null;  // atomic in kernel; safe here as single-threaded
    if (!chain) return [];
    // llist_reverse_order: oldest first for deterministic processing
    const events: WatchEvent[] = [];
    let node: EventNode | null = chain;
    while (node) { events.push(node.event); node = node.next; }
    return events.reverse();
  }
}

// Replace BoundedWatcherQueue's drain() with:
// const events = batchList.popAll();
// if (events.length >= MAX_WATCHER_QUEUE_DEPTH) { ... overflow sentinel ... }
```

---

## P5-C2 · SeqBuf (seq_buf overflow-safe writer, score: 40)

```typescript
// src/utils/seq-buf.ts
export class SeqBuf {
  private pos = 0;
  private readonly parts: string[] = [];
  private overflowed = false;

  constructor(private readonly limit: number) {}

  write(s: string): this {
    if (this.overflowed) return this;
    if (this.pos + s.length > this.limit) {
      this.overflowed = true;  // sentinel: len > size
      this.pos = this.limit + 1;
      return this;
    }
    this.parts.push(s);
    this.pos += s.length;
    return this;
  }

  writef(template: string, ...args: unknown[]): this {
    const s = template.replace(/{(\d+)}/g, (_, i) => String(args[+i] ?? ''));
    return this.write(s);
  }

  hasOverflowed(): boolean { return this.overflowed; }
  get length(): number { return this.pos; }
  toString(): string { return this.parts.join(''); }
}

// In build_context_pack:
// const buf = new SeqBuf(TOKEN_BUDGET * AVG_CHARS_PER_TOKEN);
// for (const entity of entities) {
//   buf.write(entity.skeleton);
//   if (buf.hasOverflowed()) { buf.pop(); break; }  // or trim last write
// }
```

---

## P5-C3 · clamp utility + config soft-clamp (score: 36)

```typescript
// src/utils/math.ts (additions)
export function isPow2(n: number): boolean { return n > 0 && (n & (n - 1)) === 0; }
export function roundupPow2(n: number): number {
  if (n <= 1) return 1;
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}
export function clamp(val: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, val));
}

// In validateConfig — soft-clamp instead of throw for non-critical tunables:
// const clamped = clamp(raw.ewmaWeightRcp ?? 8, 2, 64);
// if (clamped !== raw.ewmaWeightRcp) {
//   warnOnce(`ewmaWeightRcp ${raw.ewmaWeightRcp} clamped to [2,64]`);
// }
```

---

## P5-C9 · GlobCache (glob_match __pure memoization, score: 36)

```typescript
// src/utils/glob-cache.ts
import micromatch from 'micromatch';

const _cache = new Map<string, boolean>();

export function globMatch(pattern: string, path: string): boolean {
  const key = `${pattern}\0${path}`;
  const cached = _cache.get(key);
  if (cached !== undefined) return cached;
  const result = micromatch.isMatch(path, pattern);
  _cache.set(key, result);
  return result;
}

export function clearGlobCache(): void { _cache.clear(); }

// Replace all micromatch.isMatch(path, pattern) calls with globMatch(pattern, path).
// __pure semantics: same pattern + path always produces same result — cache is always valid.
```

---

## To paste into flaws.md

### New Flaw #150
```
### 150. Compaction Retried Immediately on Failure With No Back-off
**Source-of-lesson**: Linux kernel `mm/compaction.c:119` — `COMPACT_MAX_DEFER_SHIFT=6`; `defer_compaction()` doubles the skip count after each failure (capped at 64 consecutive skips); `compaction_deferred()` acts as an O(1) gate checked before any compaction attempt.
**Pattern**: Cortex's `maybeCompact()` in `experience.ts` is called on every entity access past the threshold. If compaction fails (JSONL file locked, disk full), it is retried on the very next call with no cooldown, hammering disk on every entity access until the underlying condition resolves.
**Relevance to Cortex**: After a compaction failure, increment `deferShift` (capped at 6); skip compaction for `1 << deferShift` subsequent calls; reset on success. Total back-off ceiling: 64 skips × call_interval — enough to ride out a transient file lock without user-visible latency.
**Severity**: 3 (HIGH — a locked JSONL file turns every entity read into a failed compaction attempt; under a heavy-ingest session this becomes thousands of failed IO operations per second)
**Addressed by**: Phase 0.11 Refinement — CompactionBackoff Exponential Defer (Linux kernel audit pass 5, score: 60). See `steal-integration-Linux-2026-05-25-pass5.md` P5-E1.
```

### New Flaw #151
```
### 151. Entity Slot Assignment for Dirty Bitmap Has No FIFO Reuse Guarantee
**Source-of-lesson**: Linux kernel `include/linux/idr.h:118` — `idr_alloc_cyclic()` starts searching from `idr_next` (the last allocation point) to avoid immediate reuse of recently-freed IDs; prevents a stale reference from accidentally matching a new allocation.
**Pattern**: The dirty bitmap (Phase 0.4, P4-C3) requires a stable integer slot per entity. A naïve `nextSlot++` counter immediately reuses slot numbers after eviction. If an entity is evicted and its slot number is reused by a newly-admitted entity before the next flush, the new entity inherits the old entity's dirty bit — incorrect dirty marking with no error signal.
**Relevance to Cortex**: Use cyclic slot allocation: `next = (lastAllocated + 1) % capacity`; scan forward to find a free slot. The FIFO reuse guarantee ensures a recently-freed slot is the last to be reused, giving any async handlers holding a reference to the old entity's slot number time to complete before the slot is recycled.
**Severity**: 3 (HIGH — stale dirty bits produce phantom writes; the new entity's content is written to disk unnecessarily, creating a TOCTOU race with concurrent reads)
**Addressed by**: Phase 0.4 Refinement — EntitySlotAllocator Cyclic IDR (Linux kernel audit pass 5, score: 40). See `steal-integration-Linux-2026-05-25-pass5.md` P5-E2.
```
