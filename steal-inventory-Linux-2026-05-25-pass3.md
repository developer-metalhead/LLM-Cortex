# Linux Kernel Steal Audit — Pass 3
**Date**: 2026-05-25 | **Commit**: eed108ed | **Pass**: 3 of 3  
**Subsystems**: `lib/ratelimit.c`, `mm/page_alloc.c` (WMARK), `include/linux/kfifo.h`, `kernel/printk/once_lite.h`, `include/linux/percpu_counter.h`, `kernel/time/timer.c`, `include/linux/rcupdate.h`

## Headline Summary

| ID | Name | Bucket | Score | Closes |
|----|------|--------|-------|--------|
| P3-E1 | DO_ONCE_LITE Print-Exactly-Once Sentinel | E | 60 | Flaw #146 |
| P3-E2 | Ratelimit State — Burst + Interval + Missed | E | 40 | Flaw #146 |
| P3-E3 | WMARK Three-Level Graduated Cache Pressure | E | 40 | Flaw #109 |
| P3-E4 | Missed-Counter Drain on Exit | E | 36 | Flaw #146 |
| P3-E5 | RCU Generation-Pointer Snapshot Reads | E | 32 | Flaw #147 |
| P3-E6 | percpu_counter Batched Approximate Counting | E | 24 | Flaw #145 |
| P3-C1 | kfifo Power-of-2 Mask Ring Queue | C | 24 | — |
| P3-D1 | Timer Wheel Multi-Level Bucket | D | — | (wrong fit) |
| P3-D2 | RCU Segmented Callback List | D | — | (wrong fit) |

---

## Bucket E — Closes Known Flaws

### P3-E1 · DO_ONCE_LITE Print-Exactly-Once Sentinel (score: 60)
**Source**: `include/linux/once_lite.h:13` — `__ONCE_LITE_IF`; `include/linux/printk.h:649` — `printk_once`; `include/linux/printk.h:668` — `pr_warn_once`  
**Pattern**: Static `bool __already_done = false` per call site; on first entry sets `true` and executes; all subsequent calls skip the function body entirely. Cheaper than `DO_ONCE` (no jump-label patch) because it uses a plain memory read on the fast path.  
**Cortex application**: `warnOnce(key, msg)` backed by a module-level `Set<string>`; key is `${callerFile}:${callerLine}` extracted at first call via `new Error().stack`. Wrap entity-cache-miss spam, `source` tool non-TypeScript warnings, and startup config notices.  
**Counter-case**: Set only grows; one string per unique warning site leaks forever — trivial in a long-lived process, acceptable for Cortex's scale.

### P3-E2 · Ratelimit State — Burst + Interval + Missed Counter (score: 40)
**Source**: `include/linux/ratelimit_types.h:16` — `struct ratelimit_state { interval, burst, rs_n_left, missed, begin }`; `include/linux/ratelimit.h:9` — `ratelimit_state_init()`; extern `___ratelimit()`  
**Pattern**: `rs_n_left` decrements on each allowed emission; on hitting zero, `missed++` and returns false. On window rollover (`now - begin >= interval`): reset `rs_n_left = burst`, `begin = now`, and optionally print "N suppressed" via `ratelimit_state_exit()`.  
**Cortex application**: LLM API calls, repeated `ingest` warnings, and MCP tool-invocation logs behind `RatelimitState { interval: 60_000, burst: 5 }`. Emits "N events suppressed in last 60s" on window reset.  
**Counter-case**: Cortex is single-threaded; atomic ops unnecessary — plain `Date.now()` comparison suffices.

### P3-E3 · WMARK Three-Level Graduated Cache Pressure (score: 40)
**Source**: `mm/page_alloc.c:6397` — `__setup_per_zone_wmarks()`; line 4475 — `ALLOC_WMARK_MIN`; lines 5053/5194 — `ALLOC_WMARK_LOW`  
**Pattern**: Three watermarks computed proportionally: `MIN = base`, `LOW = MIN + delta`, `HIGH = LOW + delta`. Below MIN: drastic action (OOM path at line 4596); between MIN and LOW: synchronous reclaim; above HIGH: background kswapd idle.  
**Cortex application**: Replace single `maxEntities` hardcoded limit with `CACHE_LOW` (70% → background eviction), `CACHE_MIN` (90% → synchronous evict before admit), `CACHE_EMPTY` (100% → WARN + full LRU walk). All three tunable via `cortex.json`.  
**Counter-case**: Three thresholds add three config knobs; a simpler high/low pair may suffice for most deployments.

### P3-E4 · Missed-Counter Drain on Exit — Suppression Summary (score: 36)
**Source**: `include/linux/ratelimit.h:52` — `ratelimit_state_exit()`; line 38 — `ratelimit_state_reset_miss()`; flag `RATELIMIT_MSG_ON_RELEASE`  
**Pattern**: On context teardown, if `RATELIMIT_MSG_ON_RELEASE` is set and `missed > 0`, emits `"N output lines suppressed due to ratelimiting"`. Atomic exchange-with-zero makes drain idempotent.  
**Cortex application**: On graceful daemon shutdown, drain all active `RatelimitState` instances and emit structured JSON `{ type: "suppressed_summary", component, count }` to experience ledger before final JSONL flush.  
**Counter-case**: Ctrl-C without clean shutdown bypasses `process.on('exit')` async writes — drain may be silently skipped.

### P3-E5 · RCU Generation-Pointer Snapshot Reads (score: 32)
**Source**: `include/linux/rcupdate.h:101` — `rcu_read_lock() = preempt_disable()`; lines 617–651 — `rcu_dereference_check()`; lines 660–667 — writer pattern: `rcu_assign_pointer(p, new)` then `synchronize_rcu()`  
**Pattern**: Readers dereference `activePtr` without any lock; writers build a `shadowPtr`, atomically assign to `activePtr`, then wait one grace period before reclaiming. Readers always see a consistent snapshot; writers never block readers.  
**Cortex application**: `activeCache` (read by all MCP tool handlers) + `shadowCache` (built by the file watcher). Watcher completes a batch, atomically does `activeCache = shadowCache`, starts a new shadow. Handlers already mid-read finish on the old generation without blocking.  
**Counter-case**: Node.js is single-threaded; no true concurrent race. The discipline is still valuable for async correctness but not strictly required.

### P3-E6 · percpu_counter Batched Approximate Counting (score: 24)
**Source**: `include/linux/percpu_counter.h:22` — `struct percpu_counter { lock, count, counters[] }`; line 56 — `percpu_counter_add_batch(fbc, amount, batch)`; line 108 — `percpu_counter_read()` returns approximate `fbc->count`  
**Pattern**: Increments accumulate in a local shard; only flush to the central counter when shard overflows `batch`. Two read modes: `read()` for cheap approximate, `sum()` for exact (walks all shards).  
**Cortex application**: `totalTokensUsed`, `cacheHitCount`, `ingestionCount` replaced with `BatchedCounter { localDelta, count, BATCH=64 }`. Increments accumulate locally; flush when `localDelta >= BATCH`. `read()` for dashboards; `sum()` for billing exports.  
**Counter-case**: Single-threaded Node.js; benefit only appears if incrementing thousands of times per second — unlikely except under heavy ingest.

---

## Bucket C — Worth Stealing

### P3-C1 · kfifo Power-of-2 Mask Lockless Ring Queue (score: 24)
**Source**: `include/linux/kfifo.h:49` — `struct __kfifo { in, out, mask, esize, data }`; line 129 — `INIT_KFIFO` sets `mask = size - 1`; line 238 — `kfifo_len = in - out`  
**Pattern**: Ever-increasing `in`/`out` indices (never manually wrapped). Buffer slot = `data[in & mask]`. Full = `len > mask`, empty = `in == out`. Compile-time power-of-2 enforcement via `buf[size & (size-1) ? -1 : size]`.  
**Cortex application**: Replace compaction work queue array (currently unbounded `Array.push`) with fixed-size ring of size `nextPow2(maxPendingCompactions)`. Eliminates `Array.splice` O(n) and prevents unbounded growth under rapid ingest.  
**Proposed phase**: Phase 5 Refinement  
**Counter-case**: V8 JIT handles plain arrays efficiently at Cortex's scale; the lock-free property is irrelevant in single-threaded Node.js.

---

## Bucket D — Wrong Fit

### P3-D1 · Timer Wheel Multi-Level Bucket
**Source**: `kernel/time/timer.c:153` — `LVL_CLK_SHIFT=3, LVL_SIZE=64, LVL_DEPTH=9, WHEEL_SIZE=576`  
**Violated principle**: Node.js `setTimeout` already uses a native libuv timer wheel; building a second wheel in JS adds complexity for a performance gain invisible at Cortex's scale (<100 concurrent timers).

### P3-D2 · RCU Segmented Callback List
**Source**: `include/linux/rcu_segcblist.h:30` — `RCU_DONE_TAIL / WAIT / NEXT_READY / NEXT` four-segment queue  
**Violated principle**: `fs.createWriteStream` backpressure covers the two-state case; four-segment model adds conceptual overhead for no measurable gain at Cortex's write volume.

---

## New Flaws Surfaced

### Flaw #146 — No Rate Limiting or Deduplication on Repeated Logs
**Pattern**: Cortex emits the same warning/info line on every tool invocation (entity-cache-miss, non-TypeScript source warning, config notice) with no throttling, burst cap, or once-sentinel. Long ingest sessions produce thousands of identical lines that drown out meaningful signals.

### Flaw #147 — Entity Cache Has No Snapshot Consistency Across Async Tool Calls
**Pattern**: The entity cache Map is shared between MCP tool handlers and the file watcher. A handler reading while the watcher is mutating may see a partially-updated state. No generation counter or shadow-swap discipline isolates readers from in-progress writes.

---

## Themes

**Logging discipline** is the dominant theme of pass 3: Linux has `printk_once`, `printk_ratelimited`, `RATELIMIT_MSG_ON_RELEASE` — a complete three-layer system (once, rate-limited, drain-on-exit). Cortex has none of these.

**Graduated pressure** (WMARK) vs **binary thresholds**: Linux never has just one threshold. Every resource limit has at least two action levels. Cortex still uses single `if (size > THRESHOLD)` checks.

**Approximate-is-enough counting**: `percpu_counter` shows that not every counter needs exact sync on every increment. For LLM cost dashboards, being off by `BATCH=64` tokens is fine; for billing exports, sync once. Cortex's bare `+` counters conflate these two use cases.
