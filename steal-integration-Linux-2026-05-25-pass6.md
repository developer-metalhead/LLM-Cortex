# Linux Kernel Pass 6 — Integration Scratch

TypeScript skeletons for all items scoring ≥ 30.

---

## P6-E1 · WinMinmax Sliding-Window Min/Max (lib/win_minmax.c, score: 36)

```typescript
// src/knowledge/win-minmax.ts
// Kathleen Nichols' algorithm: tracks min (or max) over a sliding window
// using only 3 samples. O(1) time, O(1) space.

interface MinmaxSample {
  t: number;  // timestamp (monotonic, e.g. Date.now())
  v: number;  // value
}

export class WinMinmax {
  private s: [MinmaxSample, MinmaxSample, MinmaxSample] = [
    { t: 0, v: 0 }, { t: 0, v: 0 }, { t: 0, v: 0 },
  ];

  reset(t: number, v: number): number {
    this.s[0] = this.s[1] = this.s[2] = { t, v };
    return v;
  }

  private subwinUpdate(win: number, val: MinmaxSample): number {
    const dt = val.t - this.s[0].t;
    if (dt > win) {
      this.s[0] = this.s[1]; this.s[1] = this.s[2]; this.s[2] = val;
      if (val.t - this.s[0].t > win) {
        this.s[0] = this.s[1]; this.s[1] = this.s[2]; this.s[2] = val;
      }
    } else if (this.s[1].t === this.s[0].t && dt > win / 4) {
      this.s[2] = this.s[1] = val;
    } else if (this.s[2].t === this.s[1].t && dt > win / 2) {
      this.s[2] = val;
    }
    return this.s[0].v;
  }

  /** Update and return the running minimum over the past `win` ms */
  runningMin(win: number, t: number, meas: number): number {
    const val = { t, v: meas };
    if (meas <= this.s[0].v || t - this.s[2].t > win)
      return this.reset(t, meas);
    if (meas <= this.s[1].v) this.s[2] = this.s[1] = val;
    else if (meas <= this.s[2].v) this.s[2] = val;
    return this.subwinUpdate(win, val);
  }

  /** Update and return the running maximum over the past `win` ms */
  runningMax(win: number, t: number, meas: number): number {
    const val = { t, v: meas };
    if (meas >= this.s[0].v || t - this.s[2].t > win)
      return this.reset(t, meas);
    if (meas >= this.s[1].v) this.s[2] = this.s[1] = val;
    else if (meas >= this.s[2].v) this.s[2] = val;
    return this.subwinUpdate(win, val);
  }
}

// In ExperienceManager alongside ThreeHorizonLoad:
// const hitRateMin = new WinMinmax();
// On each TICK_MS: hitRateMin.runningMin(5 * 60_000, Date.now(), currentHitRate);
// if (hitRateMin.runningMin(...) < LOW_WATERMARK) → structural pressure
```

---

## P6-E2 · DirtyGate max_pending_changes Back-pressure (lib/lru_cache.c:67, score: 36)

```typescript
// src/knowledge/dirty-gate.ts
// Back-pressure gate for dirty entity accumulation.
// When pendingDirty >= maxPendingDirty the gate is "starving" — background
// ingest waits for a flush before adding more dirty entities.

export class DirtyGate {
  private pendingDirty = 0;
  private starving = false;
  private readonly flushWaiters: Array<() => void> = [];

  constructor(private readonly maxPendingDirty: number) {}

  /** Returns false if gate is starving — caller must await flush() first */
  tryMarkDirty(): boolean {
    if (this.starving) return false;
    this.pendingDirty++;
    if (this.pendingDirty >= this.maxPendingDirty) this.starving = true;
    return true;
  }

  /** Await until gate is no longer starving */
  waitForCapacity(): Promise<void> {
    if (!this.starving) return Promise.resolve();
    return new Promise(resolve => this.flushWaiters.push(resolve));
  }

  /** Call after each flush batch — resets pending count and unblocks waiters */
  onFlushed(flushedCount: number): void {
    this.pendingDirty = Math.max(0, this.pendingDirty - flushedCount);
    if (this.pendingDirty < this.maxPendingDirty) {
      this.starving = false;
      this.flushWaiters.splice(0).forEach(r => r());
    }
  }

  get isStarving(): boolean { return this.starving; }
  get pending(): number { return this.pendingDirty; }
}

// In ExperienceManager:
// private readonly dirtyGate = new DirtyGate(config.maxPendingDirty ?? 256);
// On ingest: if (!dirtyGate.tryMarkDirty()) { await dirtyGate.waitForCapacity(); dirtyGate.tryMarkDirty(); }
// After flush: dirtyGate.onFlushed(flushedCount);
// NOTE: only apply to background ingest path — never gate user-triggered save_concept calls.
```

---

## P6-E3 · ErrSeq Error Subscription (lib/errseq.c:62, score: 36)

```typescript
// src/utils/err-seq.ts
// errseq_t equivalent: records errors in one place; subscribers sample once
// and check later whether a new error occurred since their sample.

export type ErrSeqCookie = number;  // opaque sample value

export class ErrSeq {
  private seq = 0;        // high bits: counter; low bit: SEEN flag
  private lastErr = 0;    // last error code (positive)
  private seen = true;    // true → counter bumps on next set()

  /** Record an error. Bumps counter only if the last error has been seen. */
  set(errCode: number): void {
    if (errCode === 0) return;
    if (this.seen) this.seq++;
    this.lastErr = errCode;
    this.seen = false;
  }

  /** Sample current state. Later pass to check() to detect new errors. */
  sample(): ErrSeqCookie {
    this.seen = true;  // mark as sampled
    return this.seq;
  }

  /** Returns error code if a new error occurred since `since`, else 0. */
  check(since: ErrSeqCookie): number {
    if (this.seq === since) return 0;
    return this.lastErr;
  }

  /** Check and advance subscriber's cursor to current. */
  checkAndAdvance(sinceRef: { value: ErrSeqCookie }): number {
    const err = this.check(sinceRef.value);
    if (err !== 0) sinceRef.value = this.sample();
    return err;
  }
}

// In KnowledgeManager:
// export const ioErrSeq = new ErrSeq();
// In writeJSONL catch: ioErrSeq.set(1);  // fire-and-forget write failed
//
// In any MCP tool handler:
// const since = { value: ioErrSeq.sample() };
// await doWork();
// const err = ioErrSeq.checkAndAdvance(since);
// if (err) return { error: 'IO error occurred during operation' };
```

---

## P6-C1 · ObjectPool Fixed-Size Slab Cache (io_uring/alloc_cache.h:21, score: 36)

```typescript
// src/utils/object-pool.ts
// Fixed-cap LIFO object pool. Fallback to allocator on miss, kvfree on overflow.
// LIFO gives best cache locality for recently-used objects.

export class ObjectPool<T> {
  private readonly stack: T[] = [];

  constructor(
    private readonly maxCached: number,
    private readonly factory: () => T,
    private readonly reset?: (obj: T) => void,
  ) {}

  /** Get an object from the pool or allocate a new one */
  get(): T {
    const obj = this.stack.pop();
    if (obj !== undefined) {
      this.reset?.(obj);
      return obj;
    }
    return this.factory();
  }

  /** Return an object to the pool, or discard if at capacity */
  put(obj: T): void {
    if (this.stack.length < this.maxCached) {
      this.stack.push(obj);
    }
    // else: let GC handle it (kvfree equivalent)
  }

  get size(): number { return this.stack.length; }
  clear(): void { this.stack.length = 0; }
}

// Usage example for ContextPackBuilder objects:
// const builderPool = new ObjectPool(128, () => new ContextPackBuilder(), b => b.clear());
// In build_context_pack: const builder = builderPool.get(); ... builderPool.put(builder);
```

---

## To paste into flaws.md

### New Flaw #153
```
### 153. EWMA Loses Minimum-in-Window Needed for Burst Detection
**Source-of-lesson**: Linux kernel `lib/win_minmax.c:29` — Kathleen Nichols' windowed min/max tracker; keeps best/2nd/3rd samples over a window; O(1) per update; used in TCP BBR for minimum RTT estimation over rolling windows.
**Pattern**: EWMA gives the weighted average but cannot answer "what was the worst hit rate in the last 5 minutes?" EWMA smooths over transient spikes; winminmax retains the extreme. The distinction matters when diagnosing burst (short dip from transient miss) vs structural under-capacity (sustained low hit rate throughout the window).
**Relevance to Cortex**: Alongside the ThreeHorizonLoad (pass 5) EWMA, add a `WinMinmax` for the minimum cache hit rate over a 5-minute window. If the minimum is below `LOW_WATERMARK`, structural pressure is confirmed regardless of the EWMA value.
**Severity**: 2 (MEDIUM — wrong diagnosis leads to wrong eviction decisions; EWMA may smooth over a structural problem that WinMinmax would have caught)
**Addressed by**: Phase 0.11 Refinement — WinMinmax Sliding-Window Min/Max (Linux kernel audit pass 6, score: 36). See `steal-integration-Linux-2026-05-25-pass6.md` P6-E1.
```

### New Flaw #154
```
### 154. No Back-pressure on Dirty Entity Accumulation
**Source-of-lesson**: Linux kernel `lib/lru_cache.c:67` — `max_pending_changes` cap; when `pending_changes >= max_pending_changes`, `LC_STARVING` flag is set and `lc_get()` returns `NULL`; callers must commit a transaction (flush) before adding more changes.
**Pattern**: Without a cap on pending changes, a heavy-ingest session can accumulate thousands of dirty entities simultaneously, then spike-flush all of them at once. The STARVING gate forces incremental flushing by blocking new dirty entries when the queue is full.
**Relevance to Cortex**: The DirtyBitmap (pass 4) accumulates dirty entity slots with no maximum. Under a `git clone` ingest of 5000 files, all 5000 entities go dirty in the first second. The flush interval then writes 5000 JSONL entries at once, causing a multi-second IO spike and GC pause.
**Severity**: 3 (HIGH — burst IO spike on large ingests; can exceed OS file-write rate limits and cause visible latency to concurrent MCP tool calls)
**Addressed by**: Phase 0.4 Refinement — DirtyGate max_pending_changes Back-pressure (Linux kernel audit pass 6, score: 36). See `steal-integration-Linux-2026-05-25-pass6.md` P6-E2.
```

### New Flaw #155
```
### 155. Fire-and-Forget IO Writers Provide No Error Propagation to Callers
**Source-of-lesson**: Linux kernel `lib/errseq.c:62` — `errseq_set/sample/check_and_advance`; any subscriber samples once and can later check whether any new error occurred since their sample; the SEEN bit prevents counter churn when no subscriber reads the error.
**Pattern**: Cortex's JSONL write operations that are dispatched without `await` have no mechanism for the MCP tool handler that initiated them to discover whether the write succeeded. The handler returns a success response to the LLM regardless.
**Relevance to Cortex**: A tool call that saves a concept triggers a JSONL write. If the JSONL file is locked by another process and the write fails silently, the LLM receives "saved successfully" and proceeds to reference the concept in follow-up calls — only to discover it doesn't exist on the next read.
**Severity**: 3 (HIGH — false-success responses to LLM cause diverged mental models; LLM assumes data was persisted when it was not)
**Addressed by**: Phase 5 Refinement — ErrSeq Error-Subscription Sampling (Linux kernel audit pass 6, score: 36). See `steal-integration-Linux-2026-05-25-pass6.md` P6-E3.
```
