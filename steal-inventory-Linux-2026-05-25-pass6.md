# Linux Kernel Steal Audit — Pass 6
**Date**: 2026-05-25 | **Commit**: eed108ed | **Pass**: 6  
**Subsystems**: `lib/win_minmax.c`, `lib/errseq.c`, `lib/lru_cache.c`, `lib/timerqueue.c`, `lib/interval_tree.c`, `lib/list_sort.c`, `lib/closure.c`, `lib/ref_tracker.c`, `lib/percpu-refcount.c`, `lib/string_helpers.c`, `io_uring/alloc_cache.h`, `io_uring/io-wq.c`, `io_uring/tw.c`, `io_uring/timeout.c`, `io_uring/cancel.c`, `io_uring/refs.h`, `ipc/mqueue.c`

## Headline Summary

| ID | Name | Bucket | Score | Closes |
|----|------|--------|-------|--------|
| P6-E1 | WinMinmax Sliding-Window Min/Max Tracker | E | 36 | Flaw #153 (new) |
| P6-E2 | LruCache max_pending_changes Back-pressure Gate | E | 36 | Flaw #154 (new) |
| P6-E3 | errseq Error-Subscription Sampling | E | 36 | Flaw #155 (new) |
| P6-C1 | io_alloc_cache Fixed-Size Object Pool | C | 36 | — |
| P6-C2 | TimerQueue rb_root_cached Expiry Queue | C | 24 | — |
| P6-C3 | IntervalTree Line-Range Entity Lookup | C | 24 | — |
| P6-D1 | list_sort Bottom-Up Merge Sort | D | — | JS Array.sort already stable |
| P6-D2 | percpu-refcount Two-Phase Refcount | D | — | Node.js single-threaded |
| P6-D3 | io-wq Bounded Thread Pool | D | — | Node.js single-threaded |
| P6-F1 | Missing Async Re-entrancy Assert on Cache Mutations | F | — | new flaw + CLAUDE.md rule |

---

## Bucket E — Closes Known / New Flaws

### P6-E1 · WinMinmax Sliding-Window Min/Max (score: 36)
**Source**: `lib/win_minmax.c:29` — `minmax_running_min/max(m, win, t, meas)`; keeps track of best, 2nd best, 3rd best samples within a time window `win`; O(1) per update, constant space (3 samples); sub-window updates at 1/4 and 1/2 window boundaries to handle sparse data; resets when a new extreme is found or the window expires.  
**Pattern**: Unlike EWMA (weighted average), WinMinmax tracks the actual minimum (or maximum) in a sliding time window. Used by TCP BBR for bandwidth estimation. On a new minimum: forget all prior samples because they're all ≥ the new value by definition.  
**Cortex application**: Cortex's EWMA (pass 2) tracks the average cache hit rate but cannot answer "what was the worst hit rate in the last 5 minutes?" A WinMinmax alongside the EWMA allows: short-window min < threshold → transient miss burst; long-window min < threshold → structural cache pressure. Complement to ThreeHorizonLoad (pass 5).  
**Counter-case**: Adds 3 extra numbers per tracked metric. EWMA already drives compaction decisions adequately; WinMinmax only adds value if Cortex needs to distinguish "worst case in window" from "average over window."  
**Closes**: New Flaw #153 — EWMA Loses Minimum-in-Window Needed for Burst-vs-Structural Distinction.

### P6-E2 · LruCache max_pending_changes Back-pressure Gate (score: 36)
**Source**: `lib/lru_cache.c:67` — `lc->max_pending_changes`; `lc->pending_changes` counter; `lc->to_be_changed` list; `LC_STARVING` flag set when `pending_changes >= max_pending_changes`; callers that check `lc_is_used()` or `lc_get()` return `NULL` when starving, forcing the caller to commit a transaction before continuing.  
**Pattern**: The cache refuses to accept new "to-be-changed" entries when the pending-changes queue is full. This creates explicit back-pressure: the caller MUST commit the current batch before adding more changes.  
**Cortex application**: Cortex's dirty entity accumulation (`DirtyBitmap`, pass 4) has no cap on how many dirty entities can accumulate before a flush. Under heavy ingest, thousands of entities can go dirty simultaneously, causing a spike-flush on the next flush interval. `max_pending_changes = config.maxDirtyEntities` (e.g. 256) would cap dirty accumulation and trigger incremental flushing.  
**Counter-case**: Adding a "starving" back-pressure gate to ingest would stall MCP tool calls when the dirty queue is full. Acceptable for batch operations; unacceptable for interactive `save_concept` calls. Apply only to the background ingest path, not to user-triggered saves.  
**Closes**: New Flaw #154 — No Back-pressure on Dirty Entity Accumulation.

### P6-E3 · errseq Error-Subscription Sampling (score: 36)
**Source**: `lib/errseq.c:62` — `errseq_set(eseq, err)` records error + bumps counter if seen; `errseq_sample(eseq)` → opaque cookie; `errseq_check(eseq, since)` → error if changed since sample; `errseq_check_and_advance(eseq, since)` → error + advances subscriber's cursor; ERRSEQ_SEEN bit prevents counter from bumping if no subscriber has sampled since last error.  
**Pattern**: Any number of subscribers can track independent "have I missed an error?" cursors against a shared error source. Zero overhead if no errors. Error sampling is non-blocking.  
**Cortex application**: Cortex's JSONL writer and KnowledgeManager can expose a shared `ioErrSeq: number` field. Any MCP tool handler samples it at the start of the call (`const since = sampleIoErrSeq()`), performs its work, then checks at the end (`checkIoErrSeq(since)`) — if a JSONL write failed during the tool call, the handler returns an error instead of a false-success. Currently, IO errors are logged but the caller that triggered the work never knows.  
**Counter-case**: Node.js is single-threaded; an IO error during `await writeJSONL()` surfaces as a thrown exception that already propagates. `errseq` is most valuable when the error source and subscriber are in different threads. In Cortex the throw already serves this role for synchronous callers. Apply only to fire-and-forget writes where the caller doesn't await.  
**Closes**: New Flaw #155 — Fire-and-Forget IO Writers Have No Mechanism for Callers to Detect Errors.

---

## Bucket C — Worth Stealing

### P6-C1 · io_alloc_cache Fixed-Size Object Pool (score: 36)
**Source**: `io_uring/alloc_cache.h:21` — `IO_ALLOC_CACHE_MAX = 128`; `io_alloc_cache_put(cache, entry)` returns false if at cap; `io_alloc_cache_get(cache)` returns last entry (LIFO) or NULL; `io_cache_alloc(cache, gfp)` falls back to `io_cache_alloc_new` on miss; `io_cache_free(cache, obj)` falls back to `kvfree` if pool is full.  
**Pattern**: Fixed-cap LIFO stack of pre-allocated same-size objects. LIFO gives best cache locality. Fallback to allocator on both get-miss and put-overflow. Zero locking — single-threaded per io_uring ring.  
**Cortex application**: Cortex creates and discards many small objects per tool call: `ContextPackBuilder`, entity metadata objects, search result entries. A pool capped at 128 entries per object type would recycle them without GC pressure. Especially valuable during rapid `cortex_find` calls that allocate 10–50 small result objects each.  
**Counter-case**: Node.js's GC is generational and handles short-lived objects well; manual pooling only beats GC if object creation is measurably hot (>1% of time in a profile). Apply only after profiling shows allocation in the hot path.

### P6-C2 · TimerQueue rb_root_cached O(1) Next-Expiry (score: 24)
**Source**: `lib/timerqueue.c:35` — `timerqueue_add(head, node)` inserts sorted by `expires`; returns true if new node is the soonest expiry; `rb_add_cached` maintains O(1) min via `rb_root_cached.rb_leftmost`; `timerqueue_del` O(log n) removal.  
**Pattern**: Sorted insertion into an rb-tree that tracks the minimum (soonest) element in O(1). No scan needed to find the next-to-expire timer.  
**Cortex application**: Cortex's stale entity eviction currently scans all entities on each tick to find stale ones. A `TimerQueue` keyed by `lastAccessed + maxStaleMs` would make "find next expiry" O(1) and reduce tick overhead from O(n) to O(k) where k is the number of entities expiring in that tick.  
**Counter-case**: At <5000 entities, O(n) tick scan completes in <1ms and is simpler than maintaining a parallel priority queue. `TimerQueue` only matters if tick frequency is high or entity count is large. Profile first.

### P6-C3 · IntervalTree Augmented RB-Tree for Line-Range Lookup (score: 24)
**Source**: `lib/interval_tree.c:10` — `INTERVAL_TREE_DEFINE` macro generates `interval_tree_insert/remove/iter_first/iter_next`; `iter_first(tree, start, last)` finds first node whose `[node->start, node->last]` overlaps `[start, last]`; augmented subtree-max enables O(log n) lookup instead of O(n) scan.  
**Pattern**: Given a query interval [a, b], find all stored intervals that overlap. O(log n + k) where k is the number of results. Standard for range-based search.  
**Cortex application**: `impact_analysis` MCP tool: given a changed line range `[start, end]`, find all code entities (functions, classes) whose source range overlaps. Currently likely a linear scan over all entities. An interval tree indexed by `[entity.startLine, entity.endLine]` would make this O(log n + k).  
**Counter-case**: Building and maintaining an interval tree requires augmenting each rb-node with `__subtree_last` (max last-value in subtree). At <5000 entities, a linear scan is <1ms. Interval tree only pays off if `impact_analysis` is called frequently on large repos.

---

## Bucket D — Wrong Fit

### P6-D1 · list_sort Bottom-Up Merge Sort
**Violated principle**: JavaScript's `Array.prototype.sort()` is already a stable sort (guaranteed since ES2019). Implementing a custom linked-list merge sort adds complexity for zero gain in a TypeScript codebase.

### P6-D2 · percpu-refcount Two-Phase Refcount
**Violated principle**: Designed for multi-CPU systems where per-CPU counters avoid cache-line contention. Node.js is single-threaded; `percpu-refcount` adds complexity (two-phase kill, percpu allocation, PERCPU_COUNT_BIAS) with no benefit.

### P6-D3 · io-wq Bounded Thread Pool
**Violated principle**: io-wq manages a pool of kernel threads with idle timeout, CPU affinity, and per-CPU work queues. Node.js is event-loop based; there are no worker threads in Cortex's hot path. `WORKER_IDLE_TIMEOUT`, `max_workers` are irrelevant.

---

## Bucket F — Anti-Pattern

### P6-F1 · Missing Async Re-entrancy Assert on Cache Mutations
**Source**: `lib/lru_cache.c:28` — `PARANOIA_ENTRY()` macro uses `test_and_set_bit(__LC_PARANOIA, &lc->flags)` — if the bit is already set, the caller is re-entering a non-reentrant method; `BUG_ON` fires.  
**Pattern**: The LRU cache is not thread-safe. Rather than silently corrupting, it asserts single-entry via an atomic bit. Any re-entrant call (e.g. a callback inside an iterator) fails loudly instead of silently producing wrong data.  
**Cortex anti-pattern**: Cortex's `ExperienceManager` is also not re-entrant (it has async methods that assume no concurrent entry). But there is no assertion guarding against re-entrancy via `await` in the middle of a critical section. A stale `await` in `maybeCompact()` can allow a second `get()` to re-enter `maybeCompact()` before the first one finishes, causing double-compaction.  
**Proposed addition**: Add a `_busy: boolean` flag to `ExperienceManager`; assert `!_busy` at entry to `maybeCompact()`, `evict()`, and `flush()`; set it during the operation; clear in `finally`. In dev builds, throw; in prod, log and skip. CLAUDE.md rule: **all async mutating methods on ExperienceManager must be guarded by a `_busy` re-entrancy check**.

---

## New Flaws Surfaced

### Flaw #153 — EWMA Loses Minimum-in-Window Needed for Burst Detection
Cortex's EWMA tracks the average cache hit rate but cannot distinguish a transient miss burst (short dip) from structural under-capacity (sustained low hit rate in the entire window).

### Flaw #154 — No Back-pressure on Dirty Entity Accumulation
The dirty entity accumulation (DirtyBitmap, pass 4) has no cap. Under heavy ingest, thousands of entities can dirty simultaneously, deferring all writes to the next flush interval and causing a spike.

### Flaw #155 — Fire-and-Forget IO Writers Have No Mechanism for Callers to Detect Errors
JSONL write errors that occur during background ingest or flush are logged but never propagated back to the MCP tool handler that initiated the operation. The handler returns success to the LLM even though the write failed.
