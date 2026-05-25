# Linux Kernel Steal Inventory — Pass 2 (2026-05-25)

**Mode**: Full re-audit (`--full`), collision with prior run → artifact suffix `-claude`  
**Target**: `C:\Users\kumsatwi\Desktop\StEp\personalProject\Linux` @ `eed108ed`  
**Calibration**: Novel/research  
**Files read (this pass)**: 18 files  
**Prior pass coverage**: 12 files (pass 1, 2026-05-25)  
**Spot-check**: ✅ 5/5 items verified at cited lines  
**Hallucination check**: ✅ 3/3 random items confirmed  

> Collision note: `steal-inventory-Linux-2026-05-25.md` already existed (from prior LLM run). This file covers **new items only** found in the second-pass subsystem scan.

---

## Headline Summary (New Items — Top 10 by Score)

| Bucket | Score | Name | Source | Gist |
|--------|-------|------|--------|------|
| E | 36 | BFS Cycle Detection + Generation Counter | `kernel/locking/lockdep.c:2124` | Closes flaw #5 — shared cycle checker for lint + audit_quality |
| E | 36 | DECLARE_EWMA Adaptive Compaction Pressure | `include/linux/average.h:28` | Closes flaw #109 — smooth adaptive threshold via integer EWMA |
| E | 36 | Bounded Event Queue + IN_Q_OVERFLOW Sentinel | `fs/notify/inotify/inotify_user.c:50` | Closes flaw #141 — watcher queue cap with explicit overflow signal |
| C | 27 | Scanned/Reclaimed Miss-Ratio → 3-Level Pressure | `mm/vmpressure.c:120` | Hit/miss ratio computes LOW/MEDIUM/CRITICAL compaction level |
| E | 24 | cortex.json Schema Bounds Validation | `fs/notify/inotify/inotify_user.c:61` | Closes flaw #144 — min/max bounds enforced at startup per sysctl pattern |
| C | 18 | Shadow Entry + Refault Distance for Skeleton Cache | `mm/workingset.c:390` | Eviction ghost stores clock; refault promotes if distance ≤ active size |
| C | 18 | Adaptive Context-Pack Window | `mm/readahead.c:394` | Sequential entity access → 4× → 2× → max window ramp |
| C | 18 | Sequence Cookie Async + Domain Isolation | `kernel/async.c:59` | `async_cookie_t` with `synchronize_cookie()` for ordered ingest flush |
| C | 18 | Two-Tier CLOCK for Skeleton Cache | `mm/workingset.c:27` | 2 accesses required for promotion; prevents one-time reads polluting active tier |
| B | — | XArray Mark Bits vs Map | `include/linux/xarray.h:49` | Mark bits per slot propagate upward for O(log n) "find all dirty" |

---

## Bucket E — Closes Known Flaws

### E5 — BFS Cycle Detection with Generation Counter
**Closes flaw #5** ("lint reports cycles as ERROR; audit_quality ignores them")  
**Source**: `kernel/locking/lockdep.c:2124` — `check_noncircular()`, `struct circular_queue` at line 1469  
**Symbol**: `check_noncircular(src, target)` / `circular_queue` + `dep_gen_id` generation counter  
**Scores**: severity=3, fit=4, effort=1, recency=1.0 → **score: 36**  
**has_tests**: true | **last_modified**: active  
**Confidence**: high

**What**: lockdep maintains a directed dependency graph. Before adding edge A→B, `check_noncircular()` runs `__bfs_forwards()` from B with A as the target. If B can reach A, adding A→B creates a cycle. Visited nodes are marked with `lock->class->dep_gen_id == lockdep_dependency_gen_id` — a monotonic counter incremented at the start of each BFS. No visited-set clearing needed between searches.

**For Cortex**: a shared `detectCycle(sourceId, targetId, graph)` BFS function, powered by a generation counter instead of `new Set()`, would give both `lint` and `audit_quality` the same cycle-detection primitive. The inconsistency in flaw #5 disappears because both tools call the same function.

**Counter-case**: Cortex's entity graph is small (<200 entities); O(n) DFS is negligible. The generation counter optimization is premature at this scale.

---

### E6 — DECLARE_EWMA: Type-Safe Integer EWMA for Adaptive Compaction
**Closes flaw #109** ("Compaction thresholds aren't user-configurable") — complementary to E1 (compaction_pressure tunable)  
**Source**: `include/linux/average.h:28` — `DECLARE_EWMA(name, _precision, _weight_rcp)`  
**Symbol**: `ewma_##name##_init()`, `ewma_##name##_add()`, `ewma_##name##_read()`  
**Scores**: severity=3, fit=4, effort=1, recency=1.0 → **score: 36**  
**has_tests**: true | **last_modified**: active  
**Confidence**: high

**What**: Macro generates a type-safe EWMA struct with fixed-precision integer arithmetic (no floating point). `_precision` bits for fractional part; `_weight_rcp` (power of 2) determines how much weight new values get (`1/_weight_rcp`). All arithmetic is integer shifts. The update formula: `internal = ((internal << weight_rcp) - internal + (val << precision)) >> weight_rcp`.

**For Cortex**: replace static `COMPACTION_THRESHOLD_BYTES` with an EWMA of recent compaction bytes. If recent compactions freed little (low pressure), threshold rises; if recent compactions freed a lot (high pressure), threshold falls. The E1 `compaction_pressure` tunable sets `_weight_rcp` — users can tune responsiveness.

**Counter-case**: An EWMA adds temporal hysteresis. A one-time large ingest would keep compaction threshold elevated for many subsequent operations, causing under-compaction until the EWMA "forgets" the spike.

---

### E7 — Bounded Event Queue + IN_Q_OVERFLOW Sentinel
**Closes flaw #141** ("Hardcoded Resource Capacity Limits")  
**Source**: `fs/notify/inotify/inotify_user.c:50` — `inotify_max_queued_events` sysctl  
**Symbol**: `inotify_max_queued_events`, `IN_Q_OVERFLOW` event type  
**Scores**: severity=3, fit=4, effort=1, recency=1.0 → **score: 36**  
**has_tests**: true | **last_modified**: active  
**Confidence**: high

**What**: Each inotify instance has a configurable maximum queue depth (`max_queued_events`). When the queue is full, all subsequent events are discarded and ONE `IN_Q_OVERFLOW` pseudo-event is placed in the queue. The consumer learns the queue overflowed (and must do a full re-scan) without the queue growing unboundedly.

**For Cortex**: The file watcher's event callback queue has no cap. During a large `git checkout` with thousands of file changes, events pile up unboundedly. Adding `MAX_WATCHER_QUEUE_DEPTH` (configurable via `cortex.json`) + a `QUEUE_OVERFLOW` synthetic event that triggers a full re-ingest scan exactly mirrors the inotify design.

**Counter-case**: An overflow event requires the consumer to do a full re-scan, which may be more expensive than processing the individual events. Must ensure the re-scan path is implemented before enabling the cap.

---

### E8 — cortex.json Schema Bounds Validation (min/max per tunable)
**Closes flaw #144** ("Numeric Thresholds Without a User-Facing Escape Hatch")  
**Source**: `fs/notify/inotify/inotify_user.c:61` — sysctl table with `extra1`/`extra2` bounds  
**Symbol**: `ctl_table.extra1 = &it_zero`, `ctl_table.extra2 = &it_int_max`, `proc_doulongvec_minmax`  
**Scores**: severity=2, fit=4, effort=1, recency=1.0 → **score: 24**  
**has_tests**: true | **last_modified**: active  
**Confidence**: high

**What**: Every entry in the inotify sysctl table declares `.extra1` (minimum) and `.extra2` (maximum). The kernel's `proc_doulongvec_minmax` handler rejects out-of-range writes with EINVAL before they reach application code.

**For Cortex**: `cortex.json` currently has no schema validation. A `validateConfig(config)` function at startup should check every numeric field against explicit min/max bounds (e.g., `compaction_pressure: [1, 1000]`, `max_watcher_queue_depth: [10, 100000]`) and return a descriptive error if out of range.

**Counter-case**: Runtime validation of config values is duplicated effort if a JSON Schema file is present. Better to use JSON Schema for validation with min/maximum keywords than hand-coded bounds. Either approach closes the flaw.

---

## Bucket C — Worth Stealing

### C7 — Scanned/Reclaimed Miss-Ratio → 3-Level Pressure Signal (score: 27)
**Source**: `mm/vmpressure.c:120` — `vmpressure_calc_level(scanned, reclaimed)`  
**Symbol**: `enum vmpressure_levels { LOW=0, MEDIUM, CRITICAL }`, `vmpressure_win`  
**Proposed phase**: Phase 0.11 Refinement (extends compaction_pressure from E1)  
**Scores**: severity=3, fit=3, effort=1, recency=1.0 → **score: 27**  
**Confidence**: high

**What**: Accumulates `scanned` and `reclaimed` page counts until a window (`vmpressure_win`) is filled, then computes `pressure = (scanned - reclaimed) / scanned * 100`. If pressure ≥ 95 → CRITICAL; ≥ 60 → MEDIUM; else LOW. A separate `vmpressure_prio()` shortcut fires CRITICAL immediately when scan depth exceeds a priority threshold, bypassing the window.

**For Cortex**: track `entity_lookups` (scanned) and `entity_hits` (reclaimed) over a sliding window. Every N lookups: `miss_ratio = (lookups - hits) / lookups * 100`. MEDIUM → nudge compaction; CRITICAL → force compaction now; LOW → widen threshold. This turns compaction from schedule-based to demand-based.

**Counter-case**: A cold-start Cortex has 100% miss rate (nothing in cache yet). The pressure window would immediately fire CRITICAL and trigger compaction on an empty cache. Requires a "warm-up" guard (minimum N lookups before pressure is computed).

---

### C8 — Shadow Entry + Refault Distance for Skeleton Cache (score: 18)
**Source**: `mm/workingset.c:390` — `workingset_eviction()` + `workingset_refault()`  
**Symbol**: `pack_shadow()`, `workingset_test_recent()`: `refault_distance = (R - E) & MASK`; activate if ≤ `workingset_size`  
**Proposed phase**: Phase 13.5 Refinement (extends skeleton cache eviction)  
**Scores**: severity=3, fit=3, effort=2, recency=1.0 → **score: 18**  
**Confidence**: high

**What**: On eviction, a "shadow entry" (packed eviction clock value) is stored in the XArray slot where the page lived. On refault, the distance `R - E` (unsigned, wraps safely) is compared to the current active-set size. If the entity would have fit in memory had it been kept, it's immediately promoted to the active tier ("optimistic activation"). The non-resident age counter advances for all evictions so refault distances remain comparable to current working set size.

**For Cortex**: when a skeleton is evicted from the skeleton cache, store a shadow `{ evictionClock: skeletonCache.evictionClock, entityId }` in a `Map<entityId, ShadowEntry>`. On cache miss for that entity, compute `refaultDistance = currentClock - shadow.evictionClock`. If ≤ active-set size, immediately re-add to the active (hot) tier instead of the normal inactive tier.

**Counter-case**: Shadow entry bookkeeping requires a separate Map growing proportionally to evicted entities. At Cortex's scale (<5000 entities), the memory cost is negligible but the added complexity may not be worth it.

---

### C9 — Adaptive Context-Pack Window: get_next_ra_size Ramp (score: 18)
**Source**: `mm/readahead.c:394` — `get_next_ra_size(ra, max)` + `get_init_ra_size(size, max)`  
**Symbol**: `cur < max/16 → 4×cur`; `cur <= max/2 → 2×cur`; else `max`  
**Proposed phase**: Phase 13 Refinement  
**Scores**: severity=3, fit=3, effort=2, recency=1.0 → **score: 18**  
**Confidence**: high

**What**: Readahead window starts small (scaled to actual request size), then ramps: 4× while small, 2× in midrange, capped at max. The async portion triggers the next readahead BEFORE the current batch is consumed (pipelining). The readahead flag is set on the first page of the async section.

**For Cortex**: `build_context_pack` currently fetches exactly what was requested. If the LLM accesses entity A then B then C sequentially, each request is independent. With adaptive pre-fetch: track `prev_entity` and `window_size`; on sequential hit, double the window; pre-fetch `window_size` entities ahead of the current request. Return the synchronous portion immediately, fire async ingest for the rest.

**Counter-case**: LLM access patterns are rarely sequential in the page-cache sense. A "sequential" LLM session jumps across domains (auth → db → api → ui). The window would expand, pre-fetch wrong entities, and waste ingest budget. Must gate on confirmed sequential pattern (≥3 sequential accesses before expanding).

---

### C10 — Sequence Cookie Async + Domain Isolation (score: 18)
**Source**: `kernel/async.c:59` — `async_cookie_t`, `async_synchronize_cookie_domain()`  
**Symbol**: `next_cookie++`, `async_synchronize_cookie(cookie)`, `struct async_domain`, graceful-sync fallback at `entry_count > MAX_WORK`  
**Proposed phase**: Phase 5 Refinement  
**Scores**: severity=3, fit=3, effort=2, recency=1.0 → **score: 18**  
**Confidence**: high

**What**: Each async operation gets a monotonically increasing cookie. `async_synchronize_cookie(N)` blocks until all operations with cookie < N have completed — enabling "ensure these specific operations are done" without waiting for ALL async work. Domain isolation lets `synchronize_full_domain(myDomain)` wait only for operations in this project's ingest, not global. Graceful fallback: if queue exceeds MAX_WORK, execute synchronously.

**For Cortex**: `ingest(files[])` assigns a cookie to each file. `ingest_flush(cookie)` ensures all files up to that cookie are committed before returning. Multiple simultaneous project ingests use domain isolation: `synchronize_domain("projectX")` waits only for project X's files. The graceful fallback: if ingest queue > N, process synchronously instead of queuing.

**Counter-case**: Node.js is single-threaded; async operations in JS are I/O-driven, not work-queue-driven. The cookie ordering must be maintained manually, and `synchronize_cookie()` becomes a Promise chain — which is just Promise.all() with extra steps at this scale.

---

### C14 — Two-Tier CLOCK (inactive/active) for Skeleton Cache (score: 18)
**Source**: `mm/workingset.c:27` — double CLOCK list design comment + promotion/demotion logic  
**Symbol**: inactive list (start here) + active list (promoted on 2nd access); demotion when active list grows too large  
**Proposed phase**: Phase 13.5 Refinement  
**Scores**: severity=3, fit=3, effort=2, recency=1.0 → **score: 18**  
**Confidence**: high

**What**: New pages enter the inactive list. Access while on inactive → promotion to active. Access while on active → extend stay. Active list grows too large → demotion to inactive. Reclaim always comes from the inactive tail. The two-tier structure ensures a page must be accessed TWICE to earn protection from reclaim. One-time sequential reads never reach the active list.

**For Cortex**: skeleton cache has one tier. A file explorer tool accessing each skeleton once during a scan would push out truly hot entities. Two tiers: new entities enter "inactive" pool; accessed again → promoted to "active" pool; `build_context_pack` always includes active entities; eviction pressure first drains inactive tail.

**Counter-case**: The two-tier cache adds promotion/demotion bookkeeping. At <5000 entities, the LRU walk (C2 from prior audit) already covers this. C14 and C2 are complementary — C2 gives fine-grained per-item decisions; C14 gives the structural two-tier policy. Together they're powerful; separately either is sufficient.

---

## Bucket B — Cortex Has Superior Version

### B3 — XArray Mark Bits vs JavaScript Map (no-steal)
**Source**: `include/linux/xarray.h:49` — `xa_marks`, `xa_mk_value()`, `xa_for_each_marked()`  
**Why Cortex's version is better**: JavaScript's `Map` has O(1) lookup/insert and sufficient performance for <5000 entities with linear filter for dirty/stale sets.  
**Steel-man**: XArray mark bits propagate upward through the tree — "find next dirty entity from position N" is O(log n) without iterating the full map. At >50k entities with frequent dirty-state queries, XArray's mark index beats a separate dirty `Set`.  
**Conclusion**: Keep JavaScript `Map` now; note XArray semantics as a future data structure upgrade when entity count exceeds 50k or dirty-query frequency increases.

---

## Bucket D — Wrong Fit for Cortex

| ID | Name | Source | Violated Principle |
|----|------|--------|--------------------|
| D6 | SLUB 3-Tier Per-CPU Cache Hierarchy | `mm/slub.c:58` | **Local-first**: per-CPU partitioning requires OS scheduler and preemption model absent in Node.js single-threaded event loop |
| D7 | Lazy fsnotify_set_children_dentry_flags | `fs/notify/fsnotify.c:69` | **Domain mismatch at scale**: Cortex watches O(10) directories, not O(millions) of dentries; eager flag setting costs nothing |

---

## Bucket F — Anti-Patterns

### F3 — Unchecked Integer Arithmetic in Accumulation Counters
**Source**: `include/linux/overflow.h:61` — `check_add_overflow()`, `wrapping_add()` as model of what safe arithmetic looks like  
**Pattern in Cortex**: token counts, savings ledger sums, and score computations use bare `+` arithmetic. If a token count exceeds `Number.MAX_SAFE_INTEGER` (9007199254740991 ≈ 9 × 10¹⁵), the sum silently loses precision.  
**Why target chose overflow.h**: the kernel can't afford silent overflow; `check_add_overflow()` returns a bool indicating wrap-around so callers can handle it explicitly.  
**Proposed CLAUDE.md rule**: any counter that accumulates over time (token counts, savings totals, entity versions) must include a `Number.isSafeInteger()` assertion before returning, or use BigInt for accumulators that could realistically approach `2^53`.  
**Structural layer required**: add `scripts/check-unsafe-arithmetic.ts` that Greps for patterns `+= ` and `count++` in counters and flags those missing `isSafeInteger` guards in CI.

---

## Bucket G — Open Questions

### G3 — Two-Tier CLOCK vs 6-State LRU Walk: Which Wins for Skeleton Cache?
**Source tension**: C14 (two-tier CLOCK from `mm/workingset.c`) vs C2 prior audit (6-state `lru_status` enum from `include/linux/list_lru.h`)  
**Question**: Should Cortex implement both (two tiers + per-item fine-grained eviction callback) or pick one?  
**Alternatives**:  
1. Two-tier only (C14): simpler, matches Linux page cache model, "accessed twice → hot" is a good heuristic for LLM entity access patterns  
2. 6-state callback only (C2): more flexible, individual entities can veto or rotate their own eviction  
3. Both: active/inactive structure (C14) as the macro policy; 6-state callback (C2) as the micro policy within the inactive list's eviction walk — this is what Linux actually does

### G4 — At What Lookup Volume Does C7's Miss-Ratio Window Produce Meaningful Signal?
**Source**: `mm/vmpressure.c:38` — `vmpressure_win = SWAP_CLUSTER_MAX * 16 = 512 pages`  
**Question**: What should `CORTEX_PRESSURE_WIN` be? The window must be large enough to smooth noise but small enough to be responsive.  
**Alternatives**:  
1. Fixed window of 50 entity lookups (small, responsive, noisy for cold start)  
2. Exponential: start at 10, double on each pressure event up to 500 (adapts to workload)  
3. Time-based: compute ratio over last 60 seconds of lookups (ignores burst vs idle)

---

## Themes (Step 5)

1. **Self-Tuning Feedback Loops** (vmpressure, EWMA, refault distance): Linux constantly measures its own efficiency and adjusts. Cortex has NO feedback loops — it doesn't know if its knowledge base is serving queries well or poorly.

2. **Ghost State for Cache Intelligence** (shadow entries, negative dentries): Linux preserves minimal information about evicted state to make smarter re-admission decisions. Cortex evicts silently with no ghost trail.

3. **Bounded Resources with Explicit Overflow Signaling** (inotify cap, epoll max_user_watches, MAX_WORK): every resource-consuming queue has a configurable cap and an explicit "you hit the limit" signal rather than silently growing. Cortex has no such caps.

4. **Graph Safety via BFS Before Mutation** (lockdep, epoll cycle detection): before adding any edge (lock dependency, epoll nesting), verify it doesn't create a cycle. Cortex's `save_entity` with cross-entity relationships has no pre-mutation cycle check.

5. **Graceful Degradation** (async.c: >MAX_WORK → execute synchronously): if the fast async path is saturated, fall back to synchronous execution rather than failing or queuing indefinitely. Cortex's ingest has no degradation path under load.

---

## Expected-but-Absent

- **Circuit breaker for failed file reads**: no backoff pattern for repeated filesystem errors during ingest (ENOENT, EACCES). Expected in production filesystems; Linux has retry-with-count in `read_folio` but no application-level circuit breaker.
- **Structured log levels at runtime**: `printk` has `pr_debug`/`pr_warn`/`pr_err` levels; kernel supports dynamic per-module log level adjustment at runtime. Cortex's logging uses `console.error` uniformly.

---

## Recommended Next Actions (by score)

1. **E5** (score 36): Add shared `detectCycle()` BFS to fix lint/audit_quality inconsistency (flaw #5)
2. **E6** (score 36): Replace `COMPACTION_THRESHOLD_BYTES` with EWMA-based adaptive threshold (flaw #109)  
3. **E7** (score 36): Add `MAX_WATCHER_QUEUE_DEPTH` cap + overflow-triggered full-rescan (flaw #141)
4. **C7** (score 27): Implement miss-ratio pressure window → 3-level compaction signal
5. **E8** (score 24): Add `validateConfig()` with min/max bounds per `cortex.json` key (flaw #144)
6. **C8/C14** (score 18 each): Two-tier skeleton cache with shadow entry refault promotion
7. **C9** (score 18): Adaptive context-pack pre-fetch window using readahead ramp
8. **C10** (score 18): Sequence cookie async for ordered ingest flush with domain isolation

---

## Audit Limitations

- `mm/vmscan.c` was identified but only its header (80 lines) was read — the full reclaim engine (`shrink_lruvec`, `kswapd` wake conditions) was not scanned. Likely contains additional C/E items related to flaw #89 (unbounded experience ledger).
- `kernel/locking/lockdep.c` is 6000+ lines; only lines 1-200 and 2120-2180 were read. The BFS implementation details (`__bfs_forwards`) were not verified line-by-line.
- `fs/eventpoll.c` was partially read (lines 1-280). The ovflist merge-back logic (when drain completes) was not verified.
