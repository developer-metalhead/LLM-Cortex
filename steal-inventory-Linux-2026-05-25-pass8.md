# steal-inventory-Linux-2026-05-25-pass8.md

**Target**: Linux kernel `eed108ed`
**Audit date**: 2026-05-25 (written 2026-05-26)
**Pass**: 8
**Calibration**: novel/research
**Subsystems covered**: `include/linux/cleanup.h`, `include/linux/poison.h`, `include/linux/lockdep.h`, `lib/rhashtable.c`, `lib/btree.c`, `lib/xarray.c`, `lib/assoc_array.c`, `lib/objagg.c`, `include/linux/min_heap.h`, `include/linux/maple_tree.h`
**Artifact collision**: none

---

## Headline Summary

| ID | Bucket | Name | Score | Closes |
|----|--------|------|-------|--------|
| P8-C1 | C | DEFINE_FREE / guard() RAII scope cleanup | 24 | — |
| P8-C2 | C | lockdep_assert_held() — assertManagerOwns | 24 | — |
| P8-F1 | F | No eviction tombstone / poison value | — | New #157 |
| P8-G1 | G | LIFO unwind ordering for DisposableStack | — | — |
| P8-A1 | A | min_heap.h binary heap | — | P5-C3 |
| P8-D1 | D | rhashtable.c RCU resizable hash | — | D |
| P8-D2 | D | btree.c B+tree cache-line nodes | — | D |
| P8-D3 | D | assoc_array.c two-pass trie iteration | — | D |
| P8-D4 | D | objagg.c hardware object aggregation | — | D |
| P8-D5 | D | maple_tree.h 256B-node RCU range tree | — | D |

**Bucket counts**: A=1, B=0, C=2, D=5, E=0, F=1, G=1  **Total**: 10

---

## Bucket C — Worth Stealing

### P8-C1 · DEFINE_FREE / guard() RAII Scope Cleanup
**Source**: `include/linux/cleanup.h:210`
**Symbol**: `DEFINE_FREE(name, type, free)`, `__free(name)` variable attribute, `guard(mutex)(&lock)`, `no_free_ptr(p)`, `return_ptr(p)`, `DEFINE_CLASS(name, type, exit, init)`, `CLASS(name, var)(args)`
**Severity**: 3 | **Fit**: 4 | **Effort**: 2 | **Score**: 24

Linux uses GCC `__attribute__((cleanup(fn)))` to guarantee a cleanup function runs when a local variable goes out of scope — the C equivalent of TypeScript 5.2's `using` keyword (`Symbol.dispose`). `DEFINE_FREE` binds a cleanup function to a type. `guard()` creates an anonymous scoped lock that releases when the block exits. `no_free_ptr` / `return_ptr` transfer ownership without triggering cleanup (maps to ES2022's `DisposableStack.move()`).

**Applicable to Cortex**: File handle wrappers in the ingest pipeline, temporary FS watchers, test fixture teardown. Any `const handle = openSync(...)` followed by error returns risks leaking the handle.

**Proposed phase**: Phase 0.12 Refinement — ScopedResource RAII with TypeScript `using` Keyword

**Counter-case**: TypeScript `using` requires `lib: ['ES2022']` or `target: 'ES2022'` in tsconfig. Adds a build constraint and requires awareness of TC39 explicit-resource-management proposal semantics.

---

### P8-C2 · lockdep_assert_held() — assertManagerOwns Debug Assertions
**Source**: `include/linux/lockdep.h:284`
**Symbol**: `lockdep_assert_held(l)`, `lockdep_assert_not_held(l)`, `lockdep_assert_held_write(l)`, `lockdep_assert_none_held_once()`, `debug_locks`, `LOCK_STATE_NOT_HELD`, `LOCK_STATE_HELD`
**Severity**: 2 | **Fit**: 4 | **Effort**: 1 | **Score**: 24

Linux's lockdep provides `lockdep_assert_held(l)` — an assertion that a lock IS held before entering a critical section, compiled out in production (`debug_locks` gate). In Node.js single-threaded context, the equivalent is an `assertManagerOwns(manager)` debug-only guard at the top of methods that should only be called from within a managed context (e.g., `ExperienceManager._add()` should only be called from within an active batch).

**Applicable to Cortex**: ExperienceManager internal methods, index mutation paths, knowledge write paths. Catches "called from wrong scope" bugs that are currently silent.

**Proposed phase**: Phase 0.13 Refinement — assertManagerOwns Debug Assertions (lockdep pattern)

**Counter-case**: Node.js is single-threaded; "who owns this" violations typically manifest as explicit null-dereference errors anyway. Primary value is documentation intent, not runtime safety.

---

## Bucket F — Anti-Patterns

### P8-F1 · No Eviction Tombstone / Poison Value
**Source**: `include/linux/poison.h:19`
**Symbol**: `POISON_FREE = 0x6b`, `POISON_INUSE = 0x5a`, `LIST_POISON1 = 0x100`, `LIST_POISON2 = 0x122`, `SLUB_RED_INACTIVE = 0xbb`
**Anti-pattern**: Cortex's LRU evicts entities without tombstoning their ID slot. After eviction, a stale entity ID held by an LLM request silently resolves to a new entity that happens to reuse the same slot — or returns `undefined` with no diagnostic context. Linux poisons freed memory with `0x6b` so any stale pointer dereference crashes immediately at a known address.
**Proposed flaw**: New flaw #157 — Stale Entity ID Silent Slot Reuse After LRU Eviction
**Counter-case**: TypeScript Map.get() returns `undefined` for a missing key, which is self-documenting. Silent reuse only occurs if the entity ID is explicitly recycled, which requires ID-reuse logic that Cortex may not have. Only critical if entity IDs are small integers that wrap.

---

## Bucket G — Open Questions

### P8-G1 · LIFO Unwind Ordering for DisposableStack
**Question**: cleanup.h explicitly guarantees LIFO (last-in, first-out) unwind order for scoped resources. Should Cortex's TypeScript `using` convention also document and enforce LIFO disposal order?
- **Alt A**: Yes — LIFO is the natural expectation for resource acquisition reversal; document it as a MUST in CLAUDE.md.
- **Alt B**: Document as convention but not enforce — cleanup order rarely matters for independent resources like file handles.
- **Alt C**: Use `using` only for atomic single-resource cleanup; complex multi-resource sequences use `DisposableStack` with explicit LIFO management.

---

## Bucket A — Already in Cortex

### P8-A1 · min_heap.h Binary Min-Heap
**Source**: `include/linux/min_heap.h`
**Existing phase**: Pass 5 — PriorityIngestQueue (`include/linux/plist.h` priority-sorted list). Binary heap is an implementation detail subsumed by that phase.

---

## Bucket D — Niche / Wrong Fit

| ID | Name | Source | Violated Principle |
|----|------|--------|--------------------|
| P8-D1 | rhashtable.c RCU resizable hash | `lib/rhashtable.c` | Local-first, single-threaded JS. JS Map auto-resizes; no RCU concerns. |
| P8-D2 | btree.c B+tree cache-line nodes | `lib/btree.c` | At <5000 entities, JS Map outperforms B+trees in V8. |
| P8-D3 | assoc_array.c two-pass trie iteration | `lib/assoc_array.c` | Concurrency pattern (leaves before metadata). Cortex has no concurrent trie writes. |
| P8-D4 | objagg.c hardware object aggregation | `lib/objagg.c` | Niche hardware networking (nic flow offload). No delta/root object hierarchy in Cortex. |
| P8-D5 | maple_tree.h 256B-node RCU range tree | `include/linux/maple_tree.h` | Cache-line-optimized B-tree for VMA range allocation. No VMA-style ranges in Cortex. |
