# Linux Kernel Steal Audit — Pass 7
**Date**: 2026-05-25 | **Commit**: eed108ed | **Pass**: 7  
**Subsystems**: `include/linux/seqlock.h`, `include/linux/shrinker.h`, `include/linux/circ_buf.h`, `include/linux/notifier.h`, `include/linux/overflow.h`, `include/linux/xarray.h`, `lib/siphash.c`

## Headline Summary

| ID | Name | Bucket | Score | Closes |
|----|------|--------|-------|--------|
| P7-E1 | overflow.h Checked Arithmetic Guards | E | 45 | Flaw #145 (additional annotation) |
| P7-E2 | seqlock Config Read Consistency | E | 36 | Flaw #156 (new) |
| P7-C1 | NotifierChain Priority Callback Registration | C | 24 | — |
| P7-A1 | shrinker count_objects/scan_objects split | A | — | Phase 13.5 pass 1 already |
| P7-A2 | circ_buf CIRC_CNT/CIRC_SPACE macros | A | — | kfifo pass 3 already |
| P7-D1 | XArray eXtensible sparse radix tree | D | — | JS Map is better at <5k entities |
| P7-D2 | SipHash keyed collision-resistant hash | D | — | No adversarial input threat model |
| P7-D3 | jump_label static branch patching | D | — | No JS branch patching |

---

## Bucket E — Closes Known / New Flaws

### P7-E1 · overflow.h Checked Arithmetic Guards (score: 45)
**Source**: `include/linux/overflow.h:61` — `check_add_overflow(a, b, d)` wraps `__builtin_add_overflow`; returns `true` on wrap-around, stores result in `*d` regardless; `check_sub_overflow:107`, `check_mul_overflow:153`, `check_shl_overflow:192`; `wrapping_add(type, a, b):73` — intentionally wrapping addition that explicitly silences overflow sanitizers; `wrapping_assign_add:90`.  
**Pattern**: Checked arithmetic returns a boolean overflow flag AND the result — caller must handle the flag (`__must_check`). The `wrapping_*` variants document intentional overflow (e.g. ring-buffer head++). Two distinct intents: detect-and-fail vs intentionally-wrap, both made explicit in the API name.  
**Cortex application**: Cortex's token budget accumulation (`build_context_pack`), byte counter in `SeqBuf` (pass 5), score accumulation in `cortex_find`, and JSONL byte-size tracking all use raw `+` with no overflow guard. A `safeAdd(a, b): { result: number; overflow: boolean }` utility — wrapping `check_add_overflow` semantics — prevents silent counter wrap-around from producing nonsensical token budgets. The `wrapping_add` naming convention documents the handful of places where modular arithmetic is intentional (ring buffer indices).  
**Counter-case**: JavaScript numbers are 64-bit floats (IEEE 754); integer overflow in the traditional sense requires values >2^53. At Cortex's entity counts (<5000) and token budgets (<200k), overflow is practically impossible. The steal is the naming convention (`safeAdd` vs `wrappingAdd`) and the `__must_check` discipline — not a runtime safety net.  
**Closes**: Flaw #145 (additional annotation) — unchecked integer arithmetic in accumulation counters.

### P7-E2 · seqlock Config Hot-Reload Consistency (score: 36)
**Source**: `include/linux/seqlock.h:42` — `seqcount_t { sequence }`; `read_seqcount_begin(s)` samples the counter; `read_seqcount_retry(s, seq)` returns true if counter changed (write happened during read → retry); `write_seqcount_begin(s)` increments to odd (write in progress); `write_seqcount_end(s)` increments to even (stable). Writer is never blocked by readers.  
**Pattern**: Readers are lock-free (spin on retry only during writes). Writes are serialized externally. Read-side cost: two memory reads + one conditional branch on the happy path (no concurrent write). Zero blocking in any direction.  
**Cortex application**: Cortex's config object (`cortex.json`) is read on every MCP tool call but written rarely (hot-reload on file change). Currently, `configWatcher` writes the new config object at the same time tool handlers are reading it — a torn read is possible (handler reads partial config mid-update). A seqlock-style pattern makes config reads copy-on-read with retry: sample `configSeq`, snapshot config, check `configSeq` again — if changed, retry. Writers increment `configSeq` twice around the swap.  
**Counter-case**: Node.js is single-threaded; within a single microtask tick, no other code can modify config. The torn-read window only exists across `await` boundaries. If `configWatcher` never `await`s in the middle of a config swap, torn reads cannot occur. Audit config-write code for `await`s before implementing seqlock.  
**Closes**: New Flaw #156 — Config Object Torn Read Possible During Hot-Reload Across Await Boundaries.

---

## Bucket C — Worth Stealing

### P7-C1 · NotifierChain Priority-Sorted Callback Registration (score: 24)
**Source**: `include/linux/notifier.h:54` — `struct notifier_block { notifier_fn_t notifier_call; struct notifier_block *next; int priority }`; `raw_notifier_chain_register(nh, nb)` inserts in priority order; `raw_notifier_call_chain(nh, val, v)` iterates; `NOTIFY_OK=1`, `NOTIFY_STOP_MASK=0x8000`, `NOTIFY_BAD=(NOTIFY_STOP_MASK|0x0002)`, `NOTIFY_STOP=(NOTIFY_OK|NOTIFY_STOP_MASK)` — returning `NOTIFY_STOP` from any handler aborts the rest of the chain; `blocking_notifier_call_chain_robust:178` — if any handler returns `NOTIFY_BAD`, calls all already-notified handlers with `val_down` for rollback.  
**Pattern**: Plugins/modules register a callback with a priority. Chain fires in priority order. Any handler can veto (`NOTIFY_BAD`) and abort. The robust variant automatically unwinds already-called handlers on veto — transactional notification.  
**Cortex application**: Cortex's ingest/save/compress pipeline has no hook system. External callers (e.g. a plugin that wants to run custom validation before ingest commits) have no injection point. A `NotifierChain` for `beforeIngest`, `afterIngest`, `beforeCompress`, `configChanged` events would enable safe plugin extensibility. The `NOTIFY_STOP` abort enables pre-commit veto (e.g., block ingest if entity is malformed).  
**Counter-case**: Cortex currently has no plugin architecture and CLAUDE.md says "surface-don't-act." A notifier chain adds complexity for a use case (plugins) that doesn't exist yet. Only implement if a specific plugin requirement is identified.

---

## Bucket A — Already in Cortex

### P7-A1 · shrinker count_objects/scan_objects split
**Phase**: Phase 13.5 Refinement — ExperienceShrinker count_objects/scan_objects Split (Linux kernel audit pass 1, score: 18). Already added in pass 1.

### P7-A2 · circ_buf CIRC_CNT/CIRC_SPACE power-of-2 macros
**Phase**: Phase 5 Refinement — kfifo Power-of-2 Ring Queue (Linux kernel audit pass 3, score: 24). Same pattern — power-of-2 head/tail arithmetic with mask trick.

---

## Bucket D — Wrong Fit

### P7-D1 · XArray eXtensible Sparse Array
**Violated principle**: At <5000 entities JavaScript `Map` provides O(1) amortized lookup with no complexity overhead. XArray's radix-tree backing adds O(log n) insert cost; the marks API (dirty iteration) is below score threshold at Cortex's scale.

### P7-D2 · SipHash Keyed Collision-Resistant Hash
**Violated principle**: Local-first — Cortex processes trusted local file paths and entity IDs. Hash-flooding requires attacker-controlled inputs from untrusted sources. No adversarial input threat model applies; keyed hash adds `siphash_key_t` initialization overhead with no security benefit in a local dev tool.

### P7-D3 · jump_label Static Branch Patching
**Violated principle**: Requires compiler/CPU-level branch rewriting. No equivalent exists in JavaScript/Node.js. Not applicable.

---

## New Flaw Surfaced

### Flaw #156 — Config Object Torn Read Possible During Hot-Reload Across Await Boundaries
Cortex's file-watcher hot-reload can write a new config object while an `await`-suspended MCP tool handler holds a reference to partially-updated fields, producing subtly wrong behavior (e.g., wrong `maxEntities` mid-eviction, wrong `tokenBudget` mid-context-pack).
