# Linux Kernel Steal Audit — Pass 5
**Date**: 2026-05-25 | **Commit**: eed108ed | **Pass**: 5  
**Subsystems**: `hashtable.h`, `llist.h`, `rbtree.h`, `idr.h`, `plist.h`, `log2.h`, `sort.h`, `glob.h`, `seq_buf.h`, `minmax.h`, `loadavg.c`, `compaction.c`, `swap.c`, `eventpoll.c`, `wait.c`

## Headline Summary

| ID | Name | Bucket | Score | Closes |
|----|------|--------|-------|--------|
| P5-E1 | Compaction Exponential Back-off | E | 60 | Flaw #150 (new) |
| P5-C1 | llist MPSC Bulk-Pop | C | 60 | — |
| P5-C2 | seq_buf Overflow-Safe Writer | C | 40 | — |
| P5-E2 | IDR Cyclic Slot Allocator | E | 40 | Flaw #151 (new) |
| P5-C3 | Type-Safe clamp() | C | 36 | — |
| P5-C9 | glob_match __pure Memoizable Filter | C | 36 | — |
| P5-E3 | Three-Horizon Load Average | E | 32 | Flaw #109 (extends) |
| P5-C4 | eventpoll ovflist Lost-Wakeup-Safe Harvest | C | 32 | — |
| P5-C5 | log2.h roundup_pow_of_two Convention | C | 30 | — |
| P5-C6–C11 | WQ Exclusive, Hashtable, plist, folio_mark, sort_r | C | 24 each | — |
| P5-F1 | Signed/Unsigned Comparison Anti-Pattern | F | — | — |
| P5-D1 | rb_root_cached O(1) Min Tracking | D | — | (wrong scale) |

---

## Bucket E — Closes Known / New Flaws

### P5-E1 · Compaction Exponential Back-off (score: 60)
**Source**: `mm/compaction.c:119` — `COMPACT_MAX_DEFER_SHIFT=6`; line 126 — `defer_compaction()` increments `compact_defer_shift` (capped at 6) and resets `compact_considered=0`; line 141 — `compaction_deferred()` returns true when `++compact_considered < 1 << compact_defer_shift`  
**Pattern**: After a failed compaction, double the skip count (up to 64 consecutive skips). `compaction_deferred()` acts as a gate — callers check it first and abort early if the back-off window hasn't elapsed. The back-off resets on success.  
**Cortex application**: If `experience.ts` compaction fails (locked file, disk full), increment `compactDeferShift` (capped at 6). Skip compaction for `1 << compactDeferShift` subsequent calls. Reset on success. Prevents compaction from hammering a locked JSONL file on every entity access.  
**Counter-case**: Cortex compaction is cheap in-memory; back-off only matters on actual IO errors. Gate the back-off on a caught exception, not on every call.

### P5-E2 · IDR Cyclic Slot Allocator (score: 40)
**Source**: `include/linux/idr.h:20` — `struct idr { idr_rt, idr_base, idr_next }`; line 118 — `idr_alloc_cyclic()` starts from `idr_next` to avoid immediate reuse of freed IDs  
**Pattern**: Radix-tree-backed sparse ID allocator. `idr_alloc_cyclic` distributes IDs evenly and prevents stale references to recently-freed slots from accidentally matching new allocations.  
**Cortex application**: The dirty bitmap (P4-C3) needs a stable `slot: number` per entity. `idr_alloc_cyclic` equivalent: maintain `nextSlot` counter mod `capacity`; on alloc scan forward to find a free slot; on free mark it available. FIFO reuse means a recently-evicted entity's slot number won't collide with a newly-admitted one during the async gap between eviction and slot reuse.  
**Counter-case**: A simple incrementing counter with a `freeSlots: number[]` stack is equivalent at <5000 entities; IDR's radix backing only helps at millions of sparse IDs.

### P5-E3 · Three-Horizon Load Average — EXP_1/5/15 (score: 32)
**Source**: `kernel/sched/loadavg.c:62` — `avenrun[3]` (1/5/15 min); `loadavg.h:21–23` — `EXP_1=1884`, `EXP_5=2014`, `EXP_15=2037` fixed-point with `FSHIFT=11`; line 111 — `fixed_power_int()` for missed-window catch-up  
**Pattern**: Three EWMA accumulators with different decay constants. `calc_load(a, exp, active) = a*exp + active*(FIXED_1-exp)`. `fixed_power_int` applies N missed windows in O(log N) by squaring the decay constant.  
**Cortex application**: Extend the single EWMA from pass 2 to three horizons: short (1-min equivalent), medium (5-min), long (15-min). Short diverging from long = pressure spike (safe to ignore). Short AND long both critical = sustained overload (trigger aggressive compaction). Also: `fixed_power_int` for catch-up after daemon was idle.  
**Counter-case**: Single EWMA already provides a smoothed signal. Three horizons only add diagnostic value for distinguishing spikes from sustained pressure — useful in a dashboard, not strictly needed for operational decisions.

---

## Bucket C — Worth Stealing (top items)

### P5-C1 · llist MPSC Bulk-Pop (score: 60)
**Source**: `include/linux/llist.h:56` — `struct llist_head { first }`; line 281 — `llist_del_all()` atomically swaps `first` with NULL via `xchg`; lines 8–31 — SPSC safety table  
**Pattern**: Multi-producer push (`llist_add` uses `cmpxchg`), single-consumer bulk-pop (`llist_del_all` swaps head to null in one op, returns the entire chain). Producer never sees a partially-drained list. `llist_reverse_order()` for oldest-first processing.  
**Cortex application**: Replace the watcher event array with an llist-style pattern: the OS watcher callback pushes events into a singly-linked list; the event-loop drain handler calls `delAll()` — swaps the head to null atomically, processes the detached chain. Events arriving during processing go onto a fresh list, never racing the current drain.

### P5-C2 · seq_buf Overflow-Safe Fixed-Capacity Writer (score: 40)
**Source**: `include/linux/seq_buf.h:21` — `struct seq_buf { buffer, size, len }`; line 53 — `seq_buf_has_overflowed()` checks `len > size`; line 170 — `seq_buf_printf()` sets `len = size+1` sentinel on overflow  
**Pattern**: Write into a fixed buffer tracking `len`; overflow sets `len = size+1` as a sentinel (detectable without a separate flag). After all writes, `seq_buf_has_overflowed()` tells you whether the output was truncated.  
**Cortex application**: `build_context_pack` currently concatenates strings until the budget is hit via `if (tokens > budget) break`. Replace with a `SeqBuf` that tracks bytes written, sets overflow sentinel, and lets the caller check `hasOverflowed()` once at the end — cleaner than sprinkling budget checks throughout.

### P5-C3 · Type-Safe clamp() (score: 36)
**Source**: `include/linux/minmax.h:206` — `clamp(val, lo, hi)`; line 105 — `min()` with `BUILD_BUG_ON_MSG` sign check; `cmp_int` pattern `((l > r) - (l < r))`  
**Cortex application**: All config validation currently throws on out-of-range values. Replace with `clamp(value, schema.min, schema.max)` — accept the value but silently clamp it to the legal range, then log a warning. Matches Linux's philosophy: sysctl writes that exceed bounds are clamped, not rejected.

### P5-C4 · eventpoll ovflist — Lost-Wakeup-Safe Event Harvest (score: 32)
**Source**: `fs/eventpoll.c:131` — `struct epitem { rb_node, rdllink, ovflist next }`; line 201 — `ovflist` active during `ep_send_events` harvest  
**Pattern**: While harvesting the ready list, new-arriving events go onto `ovflist` instead of the main ready list. After harvest, `ovflist` is merged back. No event is lost even if it arrives during the drain window.  
**Cortex application**: While the watcher event handler is processing its drain batch, new watcher callbacks go onto a secondary `pendingList`. After the batch completes, `pendingList` is swapped to become the next batch. Prevents events from being dropped during the processing window.

### P5-C5 · log2.h roundup_pow_of_two Convention (score: 30)
**Source**: `include/linux/log2.h:174` — `roundup_pow_of_two()`; line 45 — `is_power_of_2(n)` = `n && !(n & (n-1))`  
**Cortex application**: Add to `src/utils/math.ts` and add CLAUDE.md rule: **all ring-buffer, queue, and bitmap capacities must be a power of 2** — use `roundupPow2(n)` at construction time. This makes the mask trick (`index & (size-1)`) always correct and prevents off-by-one bugs in capacity checks.

### P5-C9 · glob_match __pure Memoizable Filter (score: 36)
**Source**: `include/linux/glob.h:8` — `bool __pure glob_match(char const *pat, char const *str)`  
**Pattern**: `__pure` signals the result is determined solely by arguments — the compiler may cache/hoist it. No side effects, no global reads.  
**Cortex application**: Cortex re-evaluates glob exclusion patterns (`EXCLUDE_DIRS`, ignore patterns) on every file path during ingest. Add a `Map<string, boolean>` result cache keyed on `${pattern}:${path}`. `__pure` semantics mean the cache is always valid — same inputs always produce same output.

---

## Bucket F — Anti-Pattern

### P5-F1 · Signed/Unsigned Comparison Without Explicit Cast
**Source**: `include/linux/minmax.h:105` — `BUILD_BUG_ON_MSG` in `min()` rejects mixing signed/unsigned  
**Pattern**: Score fields (can be negative on error), size fields (non-negative), and threshold fields (non-negative) are all `number` in Cortex. Comparing them without explicit range checks silently passes in TypeScript.  
**Proposed action**: Add branded types: `type Score = number & { __brand: 'Score' }`, `type Count = number & { __brand: 'Count' }`. Add ESLint rule flagging direct comparison between score-typed and count-typed values without explicit `Number.isFinite()` + range check.

---

## Bucket D — Wrong Fit

### P5-D1 · rb_root_cached O(1) Min Tracking
**Violated principle**: At <5000 entities, IntrusiveLRU tail pointer already provides O(1) eviction candidate; augmented red-black tree adds O(log n) insert cost for zero measurable benefit at Cortex's scale.

---

## New Flaws Surfaced

### Flaw #150 — Compaction Retried Immediately on Failure With No Back-off
Cortex's compaction has no cooldown after a failure — a locked JSONL file causes compaction to be attempted on every subsequent entity access, hammering disk with no exponential back-off.

### Flaw #151 — Entity Slot Assignment for Dirty Bitmap Has No FIFO Reuse Guarantee
The dirty bitmap (P4-C3) needs stable slot numbers per entity but there is no slot allocator — a naïve incrementing counter immediately reuses freed slots, creating a window where a newly-admitted entity inherits a stale dirty bit from the recently-evicted entity that held its slot.
