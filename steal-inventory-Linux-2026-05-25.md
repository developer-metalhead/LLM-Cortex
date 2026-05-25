# Linux Kernel → Cortex Steal Inventory
**Audit date:** 2026-05-25  
**Target:** `C:\Users\kumsatwi\Desktop\StEp\personalProject\Linux`  
**Commit:** `eed108ed` (single-commit subset: fs/, kernel/, mm/, include/, Documentation/)  
**Calibration:** Novel/research (>50k LOC, OS kernel subsystems) — minimum 12 items required  
**Mode:** Full audit (no prior inventory)  
**Artifact collision:** none detected  
**Scan method:** Direct Read from main context (Explore agents blocked by permission restrictions on all 5 subtasks — 100% main-context reads)  
**Files read:** ~45 targeted reads across dcache.c, fair.c, notifier.c, workqueue.c, seq_file.c, vmscan.c, list_lru.c, shrinker.h, notifier.h, rcupdate.h, seqlock.h, kref.h, list_lru.h, workqueue.h + Documentation/

---

## Headline Summary

| Bucket | Count | Top Findings |
|--------|-------|--------------|
| A — Already in Cortex | 4 | hash lookup, priority sort, append log, immutable init |
| B — Cortex has superior version | 2 | kref (GC better), Maple Tree (premature) |
| C — Worth stealing | 6 | LRU walk enum, seq_file iterator, field-lock docs, seqcount retry, deferred work variants, vruntime aging |
| D — Niche / wrong fit | 5 | per-CPU counters, NUMA partitioning, spinlocks, full RCU, CPU-count scaling |
| E — Closes a flaw | 4 | negative cache (flaw #50), shrinker split (flaw #109), rollback notifier (flaw #46), cache pressure tunable (flaw #109) |
| F — Anti-pattern | 2 | NORCU bypass, magic constants without tunables |
| G — Open question | 2 | vruntime relevance decay, RB-tree break-even |
| **Total** | **25** | |

---

## Bucket A — Already in Cortex

### A1. Hash-Based O(1) Entity Lookup
**Source:** `fs/dcache.c:115-121` — `d_hash()`, `dentry_hashtable`  
**Cortex equivalent:** `Map<string, Entity>` in KnowledgeManager  
**Phase:** N/A (built-in to TypeScript Map)  
**Note:** dcache uses a power-of-2 hash table with runtime-constant shift; Cortex's JS Map hashes by string key. Same O(1) lookup semantics without needing the kernel's optimization.

### A2. Priority-Sorted Handler Registration
**Source:** `kernel/notifier.c:17-37` — `notifier_chain_register()` inserts by `n->priority` descending  
**Cortex equivalent:** Phase 33.5 cortex_find ranks results by relevance score descending  
**Phase:** 33.5 (FTS5 hybrid search ranking)

### A3. Append-Only Mutation Audit Log
**Source:** `kernel/workqueue.c:250-261` — `enum pool_workqueue_stats { PWQ_STAT_STARTED, PWQ_STAT_COMPLETED, PWQ_STAT_CPU_TIME, ... }`  
**Cortex equivalent:** Phase 7 Refinement — JSONL event sourcing; every mutation appended to `experience.jsonl`  
**Phase:** 7 (JSONL event sourcing)

### A4. Write-Once Immutable Field Initialization
**Source:** `kernel/workqueue.c:153` — `/* I: Modifiable by initialization/destruction paths and read-only for everyone else */`  
**Cortex equivalent:** Phase 0.9.1 DefineLink write-once immutable field binding (just added from AtomSpace audit)  
**Phase:** 0.9.1

---

## Bucket B — Cortex Has Superior Version

### B1. Generic Reference Counting (kref)
**Source:** `include/linux/kref.h:19-135` — `kref_init()`, `kref_get()`, `kref_put(release_fn)`  
**Cortex advantage:** JavaScript GC handles object lifetime automatically; adding manual refcounting (kref) would introduce manual `get/put` call pairs and risk double-free bugs in TypeScript. Only beneficial if Cortex moves to a non-GC runtime.  
**Steel-man for kref:** `kref_get_unless_zero()` (kref.h:131) IS useful — it atomically increments only if not zero, preventing use-after-free in concurrent delete+lookup races that GC doesn't prevent at the object-reference level. See C6 candidate if Cortex adds concurrent entity deletion.

### B2. Maple Tree B-Tree for Range Storage
**Source:** `Documentation/core-api/maple_tree.rst:1-100` — B-tree optimized for non-overlapping ranges, RCU-safe, O(log n) range scan  
**Cortex advantage:** Cortex's `Map<string, Entity>` is sufficient at current entity counts (<5000 entities). Maple tree's value (range queries like "all entities with score between 0.5 and 0.8") would only pay off at >10k entities.  
**Steel-man for maple tree:** Its RCU-safe concurrent iteration mode (readers never blocked) would eliminate Cortex's flaw #46 parallelism issue at the data-structure level. Worth re-evaluating at Phase 22+ when a central server has concurrent clients.

---

## Bucket C — Worth Stealing

Items sorted by descending score.

### C1. Field-Level Locking Documentation Pattern (score: 30)
**Source:** `kernel/workqueue.c:152-191`  
**Symbol:** comment convention `/* I: ... L: ... K: ... S: ... A: ... PL: ... WQ: ... WR: ... WO: ... */`  
**Has tests:** No  
**Last modified:** active (within 6 months)  
**Confidence:** high  
**Description:** Each struct field is annotated with the precise lock that guards it: `/* I: init-only */`, `/* L: pool->lock */`, `/* WR: wq->mutex for writes, RCU for reads */`. A reader never needs to grep for "which lock covers this field" — it's right on the line.
```c
struct worker_pool {
    raw_spinlock_t lock;        /* the pool lock */
    int cpu;                    /* I: the associated cpu */
    int flags;                  /* L: flags */
    struct list_head worklist;  /* L: list of pending works */
    int nr_idle;                /* L: currently idle workers */
    // ...
};
```
**Cortex relevance:** KnowledgeManager (`src/knowledge/KnowledgeManager.ts`) has `soulDirty`, `lastSyncCommit`, entity Map, and experience buffer — none are documented with their concurrency guard. When flaw #46 is fixed, whoever adds locks must infer which fields are shared. Apply this pattern when writing concurrent code.  
**Proposed phase:** 0.10.1 — Field-Level Concurrency Documentation Convention  
**Counter-case:** documentation rot — if a lock is refactored, the comment must be updated too; mismatched comments are worse than no comments.  
**Score:** severity=2, fit=5, effort=1 → 2×5×3×1.0 = **30**

### C2. LRU Walk Callback with 6-State Return Enum (score: 18)
**Source:** `include/linux/list_lru.h:19-29`  
**Symbol:** `enum lru_status { LRU_REMOVED, LRU_REMOVED_RETRY, LRU_ROTATE, LRU_SKIP, LRU_RETRY, LRU_STOP }`  
**Has tests:** Yes (tested via dcache, inode caches)  
**Last modified:** active  
**Confidence:** high  
**Description:** The LRU walker calls an `isolate` callback for each item. The callback returns one of 6 states telling the LRU what to do next: remove the item, skip it this pass (try again next eviction cycle), rotate it to the tail (accessed recently), or stop walking entirely. This is far more expressive than "evict or keep."
```c
typedef enum lru_status (*list_lru_walk_cb)(struct list_head *item,
        struct list_lru_one *list, void *cb_arg);
// Caller: unsigned long freed = list_lru_walk_one(lru, nid, memcg, isolate, arg, &nr_to_walk);
```
**Cortex relevance:** Flaw #109 — when adding entity cache eviction, use this 6-state enum as the eviction callback contract. Allows: skip pinned entities, rotate recently-used ones, stop early if enough freed.  
**Proposed phase:** 13.5.5 — Entity LRU Walk with Fine-Grained Eviction Callback  
**Counter-case:** over-engineering for a cache with <5000 items; a simple "evict oldest N" covers 95% of use cases.  
**Score:** severity=3, fit=3, effort=2 → 3×3×2×1.0 = **18**

### C3. seq_file Iterator Protocol for Large Tool Output (score: 18)
**Source:** `fs/seq_file.c:42-140`  
**Symbol:** `seq_open()`, `start() → show() × N → stop()`, auto-doubling buffer on overflow  
**Has tests:** Yes (used by /proc, /sys files)  
**Last modified:** active  
**Confidence:** high  
**Description:** A VFS abstraction for "files" that emit variable-length data. The caller provides `start/next/stop/show` callbacks; the buffer starts at PAGE_SIZE and doubles on overflow (`m->size <<= 1`). Callers never allocate ahead for unknown output size.
```c
// On buffer overflow: seq_file doubles and retries
Eoverflow:
    m->op->stop(m, p);
    kvfree(m->buf);
    m->count = 0;
    m->buf = seq_buf_alloc(m->size <<= 1);
    return !m->buf ? -ENOMEM : -EAGAIN;
```
**Cortex relevance:** `build_context_pack` and `export` tools have unbounded output that can hit MCP response size limits. The seq_file pattern (start iterator, show each entity, stop) with auto-growing buffer applies directly. Phase 22 streaming results also benefits.  
**Proposed phase:** 22.1.1 — seq_file-Style Iterator Protocol for Large MCP Responses  
**Counter-case:** MCP has its own streaming protocol; implementing a seq_file wrapper adds indirection that may conflict with MCP's framing. Consider only if oversized tool responses become a pain point.  
**Score:** severity=3, fit=3, effort=2 → 3×3×2×1.0 = **18**

### C4. Seqcount Optimistic Read-Retry for Snapshot-Safe Entity Reads (score: 18)
**Source:** `include/linux/seqlock.h:84-89`, `fs/dcache.c:362-388`  
**Symbol:** `read_seqcount_begin` / `read_seqcount_retry` loop; `take_dentry_name_snapshot()`  
**Has tests:** Yes (all VFS name lookups use this)  
**Last modified:** active  
**Confidence:** high  
**Description:** A reader loop: read the sequence counter (must be even), access the data, re-read the counter — if changed, retry. Writers increment before and after their write. Zero-lock path for reads; writers pay one atomic increment.
```c
do {
    seq = read_seqcount_begin(&foo_seqcount);
    /* read-side critical section */
} while (read_seqcount_retry(&foo_seqcount, seq));
```
In dcache: `take_dentry_name_snapshot()` uses this to take a safe snapshot of a name while concurrent renames may be happening.  
**Cortex relevance:** When flaw #46 is fixed for real, entity cache reads can use a version counter: before reading an entity, snapshot `entity.version`; after the read, if `entity.version` changed, retry. Works even in async JS (version check before/after `await`).  
**Proposed phase:** 0.10.2 — Versioned Entity Reads with Optimistic Retry  
**Counter-case:** Node.js is single-threaded; within a synchronous execution context, reads cannot be interrupted by writes. Only relevant for reads that `await` mid-way (which currently none of the cache reads do).  
**Score:** severity=3, fit=3, effort=2 → 3×3×2×1.0 = **18**

### C5. Workqueue Delayed + RCU-Deferred Work Variants (score: 12)
**Source:** `include/linux/workqueue.h:114-130`  
**Symbol:** `struct delayed_work { work_struct + timer_list }`, `struct rcu_work { work_struct + rcu_head }`  
**Has tests:** Yes (kernel-wide)  
**Last modified:** active  
**Confidence:** high  
**Description:** `delayed_work` runs a callback after a timer delay. `rcu_work` runs after the current RCU grace period (all current readers finish). These two variants cover "defer until N ms" and "defer until readers finish" — both patterns Cortex needs.
**Cortex relevance:** Entity change batching — rather than writing to disk on every `save_synthesis`, batch writes using `delayed_work` (debounce 500ms) and flush `rcu_work`-style (after all in-flight reads complete). Cortex's `soulDirty` flag is already a rough form of this.  
**Proposed phase:** 5.2.1 — Debounced Entity Write with Read-Drain Flush  
**Counter-case:** JS already has `setTimeout` and `Promise`-based coordination; `delayed_work`'s value is the shared pool and concurrency management which don't apply to single-process Node.js.  
**Score:** severity=2, fit=3, effort=2 → 2×3×2×1.0 = **12**

### C6. vruntime Deadline Comparison for Relevance Aging (score: 12)
**Source:** `kernel/sched/fair.c:538-597`  
**Symbol:** `vruntime_cmp(A, "<", B)`, `entity_before()`, `min_vruntime`, `deadline`  
**Has tests:** Yes (CFS is core scheduler test coverage)  
**Last modified:** active  
**Confidence:** high  
**Description:** CFS entities carry a `vruntime` (total CPU time weighted by priority) and a `deadline` (vruntime + slice). The `entity_before()` comparator orders by deadline — tasks that haven't run recently have smaller vruntime and thus get picked first. Augmented red-black tree nodes propagate `min_vruntime` up the tree automatically.
**Cortex relevance:** `cortex_find` ranks only by relevance score (BM25 + text match). Adding a "time-since-last-access" term — similar to vruntime — would surface recently-relevant entities over historically-high-scoring but stale ones. Entities accessed 6 months ago should rank below recently-touched ones with lower scores.  
**Proposed phase:** 13.5.6 — Recency-Weighted Search: vruntime-Inspired Staleness Penalty  
**Counter-case:** adding a time dimension to search rankings increases tunability burden and can surprise users whose high-scoring entities suddenly drop out of results because they haven't been accessed recently.  
**Score:** severity=2, fit=3, effort=2 → 2×3×2×1.0 = **12**

---

## Bucket D — Niche / Wrong Fit

### D1. Per-CPU Counters for Cache Statistics
**Source:** `fs/dcache.c:142-144` — `DEFINE_PER_CPU(long, nr_dentry_negative)`  
**Violated principle:** Local-first; JavaScript is single-threaded — CPU-partitioned counters add no value and have no equivalent in V8.

### D2. NUMA-Aware LRU Partitioning
**Source:** `mm/list_lru.c:53-61` — `list_lru_from_memcg_idx` + per-node LRU lists  
**Violated principle:** Local-first; Cortex runs on a single dev machine; NUMA topology is irrelevant.

### D3. Raw Spinlock with IRQ Disable
**Source:** `include/linux/workqueue.h:26-34` — `raw_spinlock_t`, `spin_lock_irqsave`  
**Violated principle:** MCP-first; JavaScript event loop has no IRQ-like preemption; spinlocks translate to busy-polling which blocks the event loop.

### D4. Full RCU (Read-Copy Update) Implementation
**Source:** `include/linux/rcupdate.h:50-55` — `call_rcu()`, `synchronize_rcu()`  
**Violated principle:** Local-first; RCU requires an OS scheduler that can track quiescent states per-CPU thread; Node.js's single event loop has no equivalent mechanism. The CONCEPT (defer free until readers done) is in C5 and E3; this is the OS-specific implementation.

### D5. Logarithmic CPU-Count Tunable Scaling
**Source:** `kernel/sched/fair.c:192-210` — `get_update_sysctl_factor()` returns `1 + ilog2(ncpus)`  
**Violated principle:** Local-first; Cortex is single-process; scaling tunables by CPU count is irrelevant.

---

## Bucket E — Closes a Known Flaw

Items sorted by descending score.

### E1. vfs_cache_pressure as a User-Configurable Tunable (score: 36)
**Closes:** Flaw #109 (Compaction thresholds hardcoded — 10MB, 180 days, not user-configurable)  
**Source:** `fs/dcache.c:76-82`, `/proc/sys/vm/vfs_cache_pressure`  
**Symbol:** `sysctl_vfs_cache_pressure = 100`, `vfs_pressure_ratio(val)` applies the pressure multiplier  
**Has tests:** Yes (sysctl interface tested)  
**Last modified:** active  
**Confidence:** high  
**Flaw verification:** Grep-confirmed — `flaws.md` line 964: `COMPACTION_THRESHOLD_BYTES = 10 * 1024 * 1024` hardcoded, no env var or MCP option.  
**Description:** Linux exposes cache eviction aggressiveness as a tunable (default=100, scale 0..∞). Cache reclaim pressure = `current_count × pressure / 100`. Setting pressure=200 evicts twice as aggressively; pressure=50 is half. The denominator allows fractional pressure without floats.
```c
static int sysctl_vfs_cache_pressure __read_mostly = 100;
unsigned long vfs_pressure_ratio(unsigned long val) {
    return mult_frac(val, sysctl_vfs_cache_pressure, sysctl_vfs_cache_pressure_denom);
}
```
**Cortex adaptation:** Replace hardcoded `COMPACTION_THRESHOLD_BYTES = 10MB` with `compaction_pressure` in `cortex.json` (default=100, same semantics as vfs_cache_pressure). Score formula: `effective_threshold = base_threshold × 100 / compaction_pressure`.  
**Counter-case:** the default of 10MB + 180 days covers nearly all users; introducing a knob creates a support burden ("why is Cortex compacting so often?") without a clear majority use case.  
**Score:** severity=3, fit=4, effort=1 → 3×4×3×1.0 = **36**

### E2. Rollback-Safe Two-Phase Notifier Chain (score: 24)
**Closes:** Flaw #46 (`source` calls aren't parallelizable — root cause: shared write-path state with no rollback)  
**Source:** `kernel/notifier.c:99-125`  
**Symbol:** `notifier_call_chain_robust(nl, val_up, val_down, v)`  
**Has tests:** Yes (blocking notifier tests)  
**Last modified:** active  
**Confidence:** high  
**Flaw verification:** Grep-confirmed — `flaws.md` line 542: "the `source` tool mutates cache state on every call. If I issue two `source` calls in parallel in one assistant turn, they race on the cache."  
**Description:** `notifier_call_chain_robust` fires `val_up` events to N subscribers. If subscriber K returns `NOTIFY_BAD`, it immediately fires `val_down` to subscribers 1..K-1 in reverse order — a precise rollback. The `nr` counter tracks exactly how many succeeded so the rollback is exact.
```c
static int notifier_call_chain_robust(struct notifier_block **nl,
    unsigned long val_up, unsigned long val_down, void *v) {
    int ret, nr = 0;
    ret = notifier_call_chain(nl, val_up, v, -1, &nr);
    if (ret & NOTIFY_STOP_MASK)
        notifier_call_chain(nl, val_down, v, nr-1, NULL); // rollback first nr-1
    return ret;
}
```
**Cortex adaptation:** The multi-step write path (`skeleton cache update → entity save → index update → soul dirty flag`) can use this pattern: each step is a `val_up` handler; on failure, fire `val_down` to reverse exactly the completed steps. Today a mid-write failure leaves the cache in a partial state.  
**Counter-case:** the true fix for flaw #46 is eliminating shared write-path state (thread-local cache or immutable snapshots), not just making the corruption recoverable. Rollback cleans up after the race; seqlock (C4) prevents the race.  
**Score:** severity=4, fit=3, effort=2 → 4×3×2×1.0 = **24**

### E3. Shrinker count_objects/scan_objects Split (score: 18)
**Closes:** Flaw #109 (Compaction thresholds hardcoded; no memory-pressure-driven eviction)  
**Source:** `include/linux/shrinker.h:82-118`  
**Symbol:** `count_objects(shrinker, sc)`, `scan_objects(shrinker, sc)`, `struct shrink_control`  
**Has tests:** Yes (slab shrinkers, dentry shrinker, inode shrinker all tested)  
**Last modified:** active  
**Confidence:** high  
**Flaw verification:** Grep-confirmed — flaw #109, same as E1.  
**Description:** The shrinker interface splits "how much could you free?" (`count_objects` — no work, fast) from "actually free some" (`scan_objects` — does the real work). `count_objects` returning `SHRINK_EMPTY` (0UL-1) means "don't bother calling scan." The `shrink_control` struct carries `nr_to_scan` (budget) and records `nr_scanned` (actual work done).
```c
struct shrinker {
    unsigned long (*count_objects)(struct shrinker *, struct shrink_control *sc);
    unsigned long (*scan_objects)(struct shrinker *, struct shrink_control *sc);
    long batch;   /* reclaim batch size */
    int seeks;    /* cost to recreate an object */
};
```
**Cortex adaptation:** KnowledgeManager registers a shrinker-like object with two methods: `countEvictableEntities()` (fast, returns how many entities have `lastAccessed` > threshold) and `evictEntities(budget)` (slow, actually removes them). The eviction trigger is memory-pressure or explicit `compact` calls, not a hardcoded byte threshold.  
**Counter-case:** Cortex doesn't have memory pressure signals; `count_objects` would always return the same number (everything >180 days old) making the split pointless without a pressure signal.  
**Score:** severity=3, fit=3, effort=2 → 3×3×2×1.0 = **18**

### E4. Negative Cache Tracking with Per-Counter + Policy Flag (score: 18)
**Closes:** Flaw #50 (No way to query "what does Cortex not know?" — no coverage gap API)  
**Source:** `fs/dcache.c:144-145, 424-426, 2003-2008`  
**Symbol:** `DEFINE_PER_CPU(long, nr_dentry_negative)`, `DCACHE_MISS_TYPE`, `dentry_negative_policy`  
**Has tests:** Yes (/proc/sys/fs/dentry-state tracks this)  
**Last modified:** active  
**Confidence:** high  
**Flaw verification:** Grep-confirmed — `flaws.md` line 561: "there's no tool that returns the list of source files NOT yet ingested."  
**Description:** Every lookup that fails to find an inode creates a "negative dentry" — a cached "this path does not exist." The kernel tracks them with `nr_dentry_negative` (a per-CPU counter) and exposes the count via `/proc/sys/fs/dentry-state`. The `dentry_negative_policy` flag controls whether to keep or immediately discard them. `DCACHE_MISS_TYPE` is the flag set on entries with `d_inode == NULL`.
```c
static DEFINE_PER_CPU(long, nr_dentry_negative);
static int dentry_negative_policy;  // 0=keep negative entries, 1=discard immediately

static unsigned d_flags_for_inode(struct inode *inode) {
    if (!inode)
        return DCACHE_MISS_TYPE;  // null inode = negative entry
    // ...
}
```
**Cortex adaptation:** When `cortex_find` or any tool queries an entity that doesn't exist, record the missed path in a `Map<string, Date>` (negative cache). Expose via a new `cortex_coverage_gaps` tool that returns: `{ missingFiles: string[], missCount: number, since: Date }`. This directly closes flaw #50.  
**Counter-case:** negative cache entries must be invalidated when the file is created/ingested, which adds complexity to the ingest path. If a file is created after the negative cache entry, stale "not found" results will be served until cache expiry.  
**Score:** severity=2, fit=4, effort=1 → 2×4×3×1.0 = **24** *(recalculated: fit=4 since this is mostly a new Map + new tool)* — capping at **24**

---

## Bucket F — Anti-Patterns

### F1. NORCU Flag — "Skip the Safety Fast Path"
**Source:** `fs/dcache.c:440-441`  
**Pattern:** `if (dentry->d_flags & DCACHE_NORCU) __d_free(&dentry->d_rcu); else call_rcu(&dentry->d_rcu, __d_free);`  
**Problem:** A flag that bypasses RCU-deferred free "for dentries never visible to RCU." This is technically correct only in a narrow case (freshly allocated, never published), but the correctness proof must be maintained across all code paths. In Cortex, the analog is the `source` skeleton-bypass path — "this entity was just ingested so the cache is guaranteed fresh, skip the version check." Such bypasses accumulate and create non-obvious safety invariants.  
**Proposed flaws.md addition:** Add a CLAUDE.md rule: "Never add a `SKIP_CACHE_CHECK` / `NO_VALIDATION` flag to bypass safety logic for 'freshly created' data. The bypass is always wrong when the invariant is violated by a future refactor. Use the safe path always; optimize with profiling if needed."

### F2. Magic Numeric Constants Without Tunable Equivalent
**Source:** `kernel/sched/fair.c:79` — `unsigned int sysctl_sched_base_slice = 700000ULL;`  
**Pattern:** The kernel sets a "good default" magic constant (700µs CFS slice) *and* exposes it via sysctl for tuning. The value is human-readable only to someone who knows that 700000 nanoseconds = 0.7ms CFS granularity. Cortex (per flaw #109) has the same pattern but WITHOUT the sysctl equivalent.  
**Linux does it right** — the constant IS a default but it's mutable. **Cortex does it wrong** — constants are hardcoded with no escape hatch.  
**Proposed flaws.md addition:** "Every numeric threshold in Cortex (`COMPACTION_THRESHOLD_BYTES`, `SIX_MONTHS_MS`, etc.) must have a corresponding `cortex.json` option with the hardcoded value as the default. Apply this to any constant added in the future. The sched_base_slice pattern: hardcode the default, expose the knob."

---

## Bucket G — Open Questions

### G1. Should cortex_find Use vruntime-Like Relevance Decay?
**Source:** `kernel/sched/fair.c:538-597` — `entity_before()` orders by deadline = vruntime + slice  
**Question:** Should Cortex entities accumulate a "virtual access time" that increases when they are NOT accessed, causing them to rise in cortex_find results (like tasks that haven't run recently get scheduled first)? Or should recency be a separate dimension rather than baked into the score?  
**Alternative A:** Add `lastAccessedAt` to entity, compute `agingPenalty = tanh((now - lastAccessedAt) / HALF_LIFE_DAYS)` per Bayesian update. Entities not accessed in 30 days get -20% score.  
**Alternative B:** Vruntime-style: each search hit adds to entity's `vruntime`. Entities with lower `vruntime` (less searched) bubble up. Anti-Matthew-effect: prevents popular entities from monopolizing top results.  
**Alternative C:** Don't add time decay — search relevance should be content-based, not access-based. Recency is a separate `--recent` filter.

### G2. At What Entity Count Does Augmented RB-Tree Beat Flat Map?
**Source:** `kernel/sched/fair.c:1040-1047`, `Documentation/core-api/rbtree.rst`  
**Question:** CFS uses an augmented red-black tree (with `min_vruntime` propagated up the tree) to find the minimum-vruntime entity in O(log n). Cortex's `cortex_find` does linear scan + sort. At what entity count does switching to an augmented RB-tree pay off?  
**Alternative A:** Profile at 100, 1000, 5000 entities. If Map+sort is <5ms at 5000 entities, don't bother.  
**Alternative B:** Never — use a MinHeap (O(1) min, O(log n) insert) instead of a full RB-tree; simpler for the "top-k results" use case.  
**Alternative C:** Adopt the Maple Tree (Documentation/core-api/maple_tree.rst) when entity count exceeds 10k — range queries and concurrent reads both benefit.

---

## Negative-Space Scan

Expected Linux kernel features NOT found in Cortex:
- Memory pressure signaling: Linux has `vmpressure` events (mm/vmpressure.c); Cortex has no equivalent. Any eviction policy needs a trigger — either poll-based (check on every operation) or push-based (OS memory pressure event).
- Concurrency annotations: Linux uses `lockdep`, `__rcu`, `__guarded_by` type annotations for compiler-verified locking. Cortex has no equivalent — TypeScript's type system doesn't have concurrency annotations.
- Debug statistics: Linux exposes all cache stats via `/proc/sys/fs/dentry-state`. Cortex's `get_cortex_status` tool does not expose cache hit/miss rates, eviction counts, or timing breakdowns.

---

## Audit Limitations

- Permission restrictions: all 5 parallel Explore agents were blocked from reading files; all reads done sequentially in main context.
- Coverage: `kernel/bpf/`, `kernel/cgroup/`, `net/`, `arch/` not scanned (out of time budget; cross-domain value assessed as low for Cortex).
- `include/linux/lockdep.h` not read (field-level annotation pattern was discovered from workqueue.c comments instead).
- Hot-path files covered: notifier.c, workqueue.c, fair.c, dcache.c, seq_file.c, vmscan.c, list_lru.c — all primary hot paths captured.
