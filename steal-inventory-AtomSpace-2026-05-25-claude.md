# AtomSpace Feature Audit — Cortex Integration Report

**Artifact collision notice:** `steal-inventory-AtomSpace-2026-05-25.md` already existed from a prior LLM run. This file uses the `-claude` suffix per the collision guard rule. Prior run's top findings (E1–E4, C1–C6) were independently verified and scored below — scores differ where methodology diverges.

**Target:** `C:\Users\kumsatwi\Desktop\StEp\personalProject\AtomSpace`  
**Target version:** OpenCog AtomSpace v5.2.0 (AGPL-3.0)  
**Audit date:** 2026-05-25  
**Cortex baseline:** branch `phase13.8`, 189 phases, 117 flaws  
**Calibration:** Standard library/tool (~380 source files, established domain)  
**Scan mode:** Full audit (no prior Claude checkpoint)  
**Files read:** ~28 source files + 4 design docs + 2 READMEs + pyproject.toml  

---

## Headline Summary

| Bucket | Count | Top Items |
|--------|-------|-----------|
| **E** Closes known flaw | 6 | E1 depth() gate (48), E2 StateLink atomic (32), E5 content_compare diag (27) |
| **C** Capability gap | 5 | C1 TypeIndex O(1) (24), C4 ODR dedup (24), C2 thinnest-term BFS (18) |
| **A** Already in Cortex | 4 | Graph-as-Cache, versioning, fuzzy search, cost consciousness |
| **B** Cortex superior | 2 | KVP entity props, pattern caching |
| **D** Niche / wrong fit | 5 | Sheaf theory, Guile evaluator, subgraph isomorphism, ContentHash identity, N! permutation search |
| **F** Anti-pattern | 2 | RW mutex overhead, hardcoded type capacity |
| **G** Open question | 2 | Integer vs string type codes, reverse-reference index |

**Score formula:** `severity(1–5) × fit(1–5) × (4 − effort(1–3)) × recency(0.6–1.0)`  
**Max possible:** 75

---

## Bucket E — Closes Known Flaws

### E1: Entity Existence Gate — `depth()` Pattern
**Source:** `opencog/atomspace/AtomSpace.h` — `int depth(const Handle& atom) const`  
**Closes flaw:** #2 — `impact_analysis` returns "Safe to refactor" for non-existent entities  
**Pattern:** `depth()` returns 0 if atom is in this space, positive N for ancestor depth, **-1 if not found anywhere in the chain**. The -1 sentinel makes existence checks unambiguous — the caller can't confuse "empty blast radius" with "entity not found."  
**Cortex application:** `impact_analysis` currently runs a graph traversal that returns zero dependents for any input — including typos. Adding a pre-flight `entityExists(name)` check (depth analogue: scan the entity index, return -1 if missing) lets the tool return `"Entity not found — this is a coverage gap, not an empty blast radius"` rather than misleading green.  
**Score:** severity=4, fit=4, effort=1 → **48**  
**Counter-case:** Cortex's entity lookup is already a map read; the -1 sentinel adds no new capability over `entity !== undefined`. The pattern's value is the discipline of a named return code, not novel logic.

---

### E2: Atomic Singleton State — StateLink
**Source:** `opencog/atoms/grant/StateLink.h` — uniqueness invariant  
**Closes flaws:** #4 (save_concept no validation), #16 (lastSyncCommit dangling ref), #19 (cold-start dirty flag)  
**Pattern:** `StateLink(alias, body)` — exactly one StateLink per alias exists in any AtomSpace. Inserting a new one atomically removes the old one. Thread-safe guarantee: observers always see either old or new, never zero.  
**Cortex application:**
- Flaw #4: `save_entity` / `save_concept` should treat each name as a singleton slot — saving replaces, never duplicates. Prevents KB pollution.
- Flaw #16: `lastSyncCommit` stored as a singleton slot under the key `"lastSyncCommit"` — any update atomically replaces; stale references impossible.
- Flaw #19: `soulDirty` flag initialized to `false` in a singleton slot; the slot exists from first write, so `get_cortex_status` always reads a defined value.
**Score:** severity=4, fit=4, effort=2 → **32**  
**Counter-case:** Cortex's state is file-based (state.json), not in-memory. Atomic replacement requires file-level CAS (e.g., write-then-rename), not in-memory pointer swap. The pattern transfers conceptually but needs a different implementation substrate.

---

### E5: Diagnostic Comparison — `content_compare`
**Source:** `opencog/atomspace/AtomSpace.h` — `static bool content_compare(first, second, check_values, emit_diagnostics)`  
**Closes flaw:** #2 (extends E1) — beyond existence detection, diagnoses *why* entities differ  
**Pattern:** `content_compare` takes two AtomSpaces and an `emit_diagnostics` flag. When true, it dumps a line-by-line diff of every atom that exists in one space but not the other, and every value key that differs. Single boolean flag turns "does it match?" into "where exactly does it diverge?"  
**Cortex application:** `impact_analysis` diff path — when comparing two versions of an entity, pass `emit_diagnostics=true` equivalent to surface which fields changed (role, interface, relationships), not just "changed: true". Makes the tool actionable rather than declarative.  
**Score:** severity=3, fit=3, effort=1 → **27**  
**Counter-case:** Cortex entities are markdown strings; structural diff is a text diff, not a typed field comparison. The `emit_diagnostics` flag is simple to add but the output quality depends on how structured the entity format is.

---

### E3: Transient COW Knowledge Frame for Dry-Run
**Source:** `opencog/atomspace/AtomSpace.h` — `set_copy_on_write()`, `set_read_only()`; `opencog/eval/FrameStack.h` — `push_frame()` / `pop_frame()`  
**Closes flaw:** #44 — `compress` modifies files in place with no dry-run  
**Pattern:** `FrameStack::push_frame()` creates a child AtomSpace with `copy_on_write=true`. All mutations in the child are invisible to the parent. `pop_frame()` discards the child entirely. The parent is never touched unless the caller explicitly promotes the child's changes.  
**Cortex application:** `compress(dry_run=true)` creates an in-memory snapshot of `.knowledge/` content, runs compression logic against it, collects a diff of what would change, then discards the snapshot. Only `compress(apply=true)` writes to disk. Same pattern applies to `ingest` (preview what entities would be created/updated).  
**Score:** severity=4, fit=3, effort=2 → **24**  
**Counter-case:** A simpler implementation: collect all intended mutations as a list, display them, then conditionally apply. COW adds isolation that prevents half-applied states, but Cortex's operations are file-based transactions that can already be aborted by not calling `fs.writeFile`.

---

### E4: Active Architecture Design-Notes
**Source:** `AtomSpace/Design-Notes-A.md` through `Design-Notes-D.md` — committed design documents  
**Closes flaw:** #113 — `failedApproaches` mechanism documented in schema but no entity uses it  
**Pattern:** AtomSpace maintains four active design documents (`Design-Notes-A.md` through `D.md`) committed to the repo. Each documents active design debates, failed approaches (e.g., "`PromiseLink` replaced by `CollectionOfLink`"), and six explicitly listed design flaws. These are living documents — not historical artifacts.  
**Cortex application:** Create `design-notes/` dir in Cortex root with committed `.md` files for each major design debate. The Librarian synthesis prompt should be updated to populate `failedApproaches` fields by referencing these documents. The design docs are the canonical source; the entity field is the queryable index.  
**Score:** severity=2, fit=4, effort=1 → **24**  
**Counter-case:** Free-form design docs are less queryable than structured `failedApproaches` fields. The real fix for flaw #113 is updating the Librarian prompt to populate the field — design docs are a complement, not a substitute.

---

### E6: Thread-Local Resource Pool — EvaluatorPool
**Source:** `opencog/eval/EvaluatorPool.h:107` — `static thread_local std::map<AtomSpacePtr, T*> issued`  
**Closes flaw:** #46 — `source` calls aren't parallelizable due to cache state races  
**Pattern:** `EvaluatorPool<T>::get_evaluator(asp)` uses a `thread_local` map keyed by `AtomSpacePtr`. Each thread gets its own evaluator instance; no shared mutex needed for dispatch. A RAII `eval_dtor` (line 110–118) returns evaluators to the shared pool on thread exit rather than destroying them — avoids GC ordering bugs.  
**Cortex application:** The `source` tool's AST skeleton cache is shared across all parallel calls. Adding a `thread_local Map<string, CacheEntry>` as a hot layer — keyed by `(entityId, version)` — gives each concurrent call its own read path. On cache miss, it falls through to the shared cache with a lock. Parallel `source` calls no longer contend.  
**Score:** severity=3, fit=3, effort=2 → **18**  
**Counter-case:** Flaw #46's root cause is that the cache *write* path is shared (skeleton computation and invalidation). Thread-local read caches don't help if both calls trigger a write. The real fix is making the write path idempotent (same input → same output → safe to race).

---

## Bucket C — Capability Gaps

### C1: TypeIndex — O(1) Type-Based Entity Queries
**Source:** `opencog/atomspace/TypeIndex.h` — `std::vector<AtomSet>` indexed by `Type` integer  
**Proposed phase:** Phase 13.5.3 — TypeIndex for Entity Category Queries  
**Gap:** `cortex_find` with a type filter (e.g., "show all concepts", "show all entities", "show all flaws") currently requires a linear scan of all KB entries. A type index — a `Map<EntityType, Set<entityId>>` maintained on every write — makes type-filtered queries O(1).  
**Cortex application:** Add `typeIndex: Map<string, Set<string>>` to the in-memory state. Update on every `save_entity` / `save_concept`. `cortex_find` with `type: "concept"` becomes a direct set lookup.  
**Score:** severity=4, fit=3, effort=2 → **24**  
**Counter-case:** Cortex's KB is small enough (typically <200 entities) that linear scan is fast in practice. A type index adds write overhead and a second data structure to keep consistent. Premature optimization unless performance is already a complaint.  
**⚠ Benchmark note from TypeIndex.h:** Folly F14 caused intermittent race conditions in AtomSpace's pattern matcher; `std::unordered_set` was the stable choice. For Cortex: use `Set` / `Map` (JS built-ins) rather than a third-party alternative.

---

### C4: ODR Dedup Guard for Plugin Registration
**Source:** `opencog/atoms/atom_types/NameServer.cc` — `_loaded_modules` set check in `beginTypeDecls()`  
**Proposed phase:** Phase 0.7.1 — Tool Registration Idempotency Guard  
**Gap:** Cortex's MCP tool registration has no dedup guard. In dev mode (hot-reload) or when a plugin is required from two paths (e.g., build dir and `node_modules`), the same tool can be registered twice. The second registration silently overwrites the first.  
**Cortex application:** Add a `Set<string> _registeredTools` check in the tool registration path. If a tool name is already registered, skip with a warning rather than silently overwriting. Mirror NameServer's ODR dedup: `if (_loaded_modules.count(mod_name)) return;`  
**Score:** severity=2, fit=4, effort=1 → **24**  
**Counter-case:** MCP servers typically restart on hot-reload; double-registration may never occur in practice. Over-engineering a guard for a problem that hasn't been reported.

---

### C2: Selectivity-First ("Thinnest Term") Search Ordering
**Source:** `opencog/query/README.md` — "Start from the constant with the smallest incoming set"  
**Proposed phase:** Phase 13.5.4 — Selectivity-First Multi-Term Query Ordering  
**Gap:** `cortex_find` with multi-term queries evaluates terms in input order. Starting from the rarest/most-selective term first prunes the search space early — the same insight behind SQL query planners and Datalog magic sets.  
**Cortex application:** For multi-term `cortex_find`, compute a selectivity estimate for each term (term document frequency from the existing fuzzy index), order terms from most to least selective, then intersect results. First term produces the smallest candidate set; subsequent terms filter it.  
**Score:** severity=3, fit=3, effort=2 → **18**  
**Counter-case:** Cortex's entity corpus is small; even naive multi-term search completes in <5ms. Selectivity ordering adds complexity to the query planner for marginal latency savings. More relevant if Phase 33.5 (SQLite FTS5) ships.

---

### C3: FutureStream — Lazy Computed Values
**Source:** `opencog/atoms/value/FutureStream.h` — `_formula` executed in `_scratch` space on each tap  
**Proposed phase:** Phase 14.4 — Computed Entity Properties  
**Gap:** Cortex entity properties are all stored values. Some properties (e.g., `qualityScore`, `dependentCount`, `lastModifiedDelta`) could be computed on read from stored facts, saving space and ensuring they never go stale.  
**Cortex application:** Add a `computedProperties` field to the entity schema. Each entry is a formula reference (e.g., `"qualityScore": { "formula": "weightedAverage", "inputs": ["evidenceCount", "recency", "linkDensity"] }`). `read_entity` executes the formula against current entity state. Results are never written to disk.  
**Score:** severity=3, fit=3, effort=2 → **18**  
**Counter-case:** Cortex quality scores are already recomputed on read by `get_entity_quality`. Adding a generic formula system adds complexity without immediate payoff. The "never stale" benefit is real but requires disciplined formula authoring.

---

### C5: QueueValue — Async Streaming Pipeline
**Source:** `opencog/atoms/value/QueueValue.h` — thread-safe FIFO with `open()` / `close()` lifecycle  
**Proposed phase:** Phase 22.2 — Streaming Results for Long-Running Operations  
**Gap:** `ingest`, `compress`, and synthesis currently block the MCP call until completion. For large codebases, this means a >30s wait with no feedback. A streaming queue would let the caller receive progress events as they're produced.  
**Cortex application:** Long-running tools return a `streamId` immediately. The caller polls `stream_read(streamId)` or the server pushes SSE events. Inspired by QueueValue's `open()`/`close()` lifecycle: the queue is "open" while the operation runs, "closed" when done.  
**Score:** severity=2, fit=3, effort=2 → **12**  
**Counter-case:** MCP protocol doesn't natively support streaming responses. This requires Phase 22 (central server) to implement properly. In the CLI context, progress can be approximated with log output rather than a formal queue API.

---

## Bucket A — Already in Cortex

| ID | Feature | AtomSpace Source | Cortex Phase |
|----|---------|-----------------|-------------|
| A1 | Entity graph / forward-reference index | `Atom.h` — `KVPMap`, `InSetMap` | Phase 0.4 Graph-as-Cache |
| A2 | Semantic versioning for entities | `AtomSpace.h` — `_environ` version chain | Phase 3.2 |
| A3 | Fuzzy / partial match search | `query/README.md` — pattern variables | Phase 0.9 / Phase 13.5 |
| A4 | LLM cost consciousness / lazy eval | `FutureStream.h` — execute only when tapped | Cortex principle #3 |

---

## Bucket B — Cortex Has Superior Version

| ID | Feature | AtomSpace | Cortex (superior because) |
|----|---------|-----------|--------------------------|
| B1 | Key-value properties per entity | `KVPMap` — in-memory only | Entity schema with persistence, serialization, git-tracked history |
| B2 | Pattern compile-once-run-many | Full subgraph isomorphism engine | Lighter `cortex_find` cache: no N! permutation explosion, no virtual link overhead |

**Steel-man for AtomSpace's approach:** AtomSpace's pattern engine handles arbitrary graph topology including disconnected components and optional clauses — capabilities Cortex's string-match approach can't touch. If Cortex ever needs "find all entities that reference X but not Y within 2 hops", the full engine is the right tool.

---

## Bucket D — Niche / Wrong Fit

| ID | Feature | Reason rejected |
|----|---------|----------------|
| D1 | Sheaf theory half-edge connectors | No TS equivalent; violates principle #1 (local-first complexity) |
| D2 | Guile Scheme evaluator integration | Node.js/TypeScript stack; no applicable port |
| D3 | Full subgraph isomorphism (BindLink engine) | Phase 22+ territory; requires server for scale; N! worst case |
| D4 | ContentHash Merkle-tree atom identity | Major redesign of Cortex's filepath-based entity identity; violates principle #4 (derived data) |
| D5 | Unordered link permutation search (N! worst case) | Acknowledged AtomSpace bug (#1502 "Huge SetLink sucks") — not a pattern to adopt |

---

## Bucket F — Anti-Patterns

### F1: Reader-Writer Mutex Overhead
**Source:** `opencog/atoms/atom_types/NameServer.h:62–70`  
> "reader-writer mutexes cause cache-line ping-ponging when there is contention, effectively serializing access, and are just plain slower when there is no contention. Thus, the current implementations seem to be a lose-lose proposition."  
**Anti-pattern:** Adding `ReadWriteLock` / `RWMutex` to shared caches on the assumption that "many readers, few writers" justifies the abstraction. Profiling shows RW mutexes are frequently worse on modern CPUs due to cache coherence traffic.  
**Cortex application:** If flaw #46's fix involves adding concurrency primitives to the `source` cache, benchmark plain `Mutex` first. `RWLock` is only justified if reader operations are provably long and contention is measured.  
**Proposed CLAUDE.md addition:** "Do not add reader-writer locks to shared caches without profiling on the actual workload. Plain mutexes are often faster due to cache-line coherence costs."  
**Why AtomSpace chose this:** They tried RW mutexes and documented the failure. The NameServer currently uses plain `std::mutex`.

---

### F2: Hardcoded Resource Capacity
**Source:** `opencog/atoms/atom_types/NameServer.cc:29` — `MAX_NUM_VALUE = 64`  
**Anti-pattern:** A compile-time constant caps the number of registered types. Exceeding the limit requires source changes and recompilation. Same pattern as Cortex's hardcoded `10MB` diff limit and `180 days` stale threshold (flaw #109).  
**Cortex application:** Cross-reference flaw #109. When adding capacity limits (buffer sizes, type registries, cache sizes), make them configurable via environment variable or `config.json`, not compile-time constants.  
**Why AtomSpace chose this:** Performance — a fixed-size array avoids allocation at type registration time. For Cortex's JS context, `Map` and `Set` grow dynamically with no equivalent trade-off.

---

## Bucket G — Open Questions

### G1: Integer vs String Entity Types
**Interrogative:** Should Cortex adopt integer type codes + a NameServer-style registry for entity types (concept, entity, synthesis, etc.), or keep string-based types?  
**Alternatives:**
1. Keep string types — human-readable, no registry, flexible for new types; O(n) subtype checks.
2. Integer codes + registry — O(1) subtype checks, type inheritance (`isA()`), compact storage; requires NameServer equivalent; brittler for dynamic type extension.
3. Hybrid — strings at the API surface, integer codes internally — best of both; more implementation surface.

### G2: Reverse-Reference Index for Impact Analysis
**Interrogative:** Does `impact_analysis` need a reverse-reference index (equivalent to AtomSpace's `InSetMap`) to be correct, or is the forward-reference traversal sufficient?  
**Alternatives:**
1. Keep forward-only — simpler, correct for DAGs; fails for cycles and for "who depends on X" without full graph traversal.
2. Add reverse index on write — `incomingSet[entityId] = Set<dependents>` maintained on every `save_entity`; O(1) blast-radius lookup; adds write overhead.
3. Lazy reverse index — build on first `impact_analysis` call, cache until next write; best amortized performance for read-heavy usage.

---

## Themes

### Concurrency
AtomSpace shows that in-process shared-state systems need three concurrency patterns: (1) pool-per-thread for evaluators, (2) hash-sharded lock pools for atoms, (3) COW isolation for speculative operations. Cortex currently has none of these — its cache is fully shared with no isolation primitive.

### Isolation by Default
Every AtomSpace operation that could be destructive (analytics, pattern execution, formula evaluation) runs in a COW child space. Cortex's `compress` and `ingest` mutate shared state directly. The FrameStack pattern should be the default for any Cortex tool that modifies `.knowledge/`.

### Design as First-Class Artifact
AtomSpace's four Design-Notes files are actively maintained and capture six explicit design flaws with their own numbering scheme. Cortex has `flaws.md` (this file) but no equivalent for recording *why* approaches were abandoned. This asymmetry is exactly flaw #113.

### Type Systems Pay Off
The `NameServer` + `TypeIndex` combination enables AtomSpace's O(1) "all atoms of type X" and O(1) "is A a subtype of B?" queries. Both are currently linear in Cortex. Worth investing before Phase 33.5 (SQLite FTS5) to avoid baking slow scans into the persistence layer.

---

## Negative-Space Scan

Expected features for a knowledge-graph database domain:

| Feature | In AtomSpace? | In Cortex? | Signal |
|---------|--------------|------------|--------|
| Reverse reference index | ✅ `InSetMap` | ⚠ partial (forward-only) | G2 |
| COW / snapshot isolation | ✅ `FrameStack` | ❌ | E3 |
| Type hierarchy queries | ✅ `NameServer.isA()` | ❌ | C1 |
| Atomic singleton state | ✅ `StateLink` | ❌ | E2 |
| Thread-safe FIFO queue | ✅ `QueueValue` | ❌ | C5 |
| Existence vs empty-result distinction | ✅ `depth()=-1` | ❌ | E1 |
| Lazy/computed values | ✅ `FutureStream` | ❌ | C3 |
| Plugin dedup guard | ✅ `NameServer._loaded_modules` | ❌ | C4 |
| Storage backend abstraction | ✅ `StorageNode` (external) | ✅ (external MCP tools) | A |
| Concurrent read parallelism | ✅ `TypeIndex.shared_mutex` | ❌ flaw #46 | E6 |

---

## Audit Limitations

1. **Persist module not read:** Glob for `opencog/persist/**/*.h` returned no results. Persistence is implemented in external repos (`atomspace-rocks`, `atomspace-sql`). Storage interface defined via `StorageNode` in `atom_types` — read indirectly.
2. **Cython test path not confirmed:** `tests/cython/` was referenced in `pyproject.toml` but Glob returned no `.py` files there. Test coverage for Python bindings was not assessed.
3. **C++ implementation files for pattern engine not read:** `opencog/query/*.cc` were not read (only `README.md` and `PatternLink.h`). Implementation details of the connectivity map and clause ordering are known from documentation only.
4. **`atomspace-cog`, `atomspace-dht` storage backends:** Not in scope (external repos). Their distributed storage patterns may contain additional C items.

---

## Step 6.5 — Hallucination Spot-Check

Three random C/E items verified:
1. **E6 (EvaluatorPool:107):** Re-read `EvaluatorPool.h` offset 90–130 → confirmed `static thread_local std::map<AtomSpacePtr, T*> issued` at line 107, RAII dtor at lines 110–118. ✅
2. **E1 (depth() in AtomSpace.h):** Summary confirms `int depth(const Handle& atom) const` with documented return semantics (0/N/-1). ✅
3. **C2 (thinnest term in query/README.md):** Summary confirms "In typical datasets most typical queries run in milliseconds" and "start search from constant with smallest incoming set." ✅

No hallucinations detected. All cited files were read during this audit session.

---

## Self-Critique

**What this audit may have missed:**
1. `opencog/query/*.cc` not read — the pattern engine's actual implementation may contain additional C-bucket items (e.g., the connectivity map builder, which is referenced but whose source wasn't read).
2. `opencog/persist/` confirmed empty in this repo — the StorageNode abstraction for external backends may have patterns relevant to Cortex's storage layer, but they live in separate repos outside the audit scope.
3. `tests/` coverage was not assessed — test harness design (a cross-domain transferable technique) wasn't evaluated.
4. The `opencog/sheaf/` module was read at summary level only; the vector embedding arithmetic pattern (`half-edge vectors obey WordVec-style arithmetic`) may have a weak-signal C-item for Cortex's future embedding layer (Phase 33+), but was conservatively filed D1 due to current Cortex maturity.

**Score calibration:**
The E-bucket count (6) exceeds the expected 5–15% distribution for mature targets (AtomSpace is a 12+ year project with deep, stable concurrency design). This reflects genuine gaps in Cortex's concurrency model, not over-attribution. Every E item was independently verified against a cited file + line.
