# AtomSpace → Cortex Integration Skeletons

TypeScript implementation sketches for all C/E items scoring ≥ 20.
These are starting points, not production code. Each skeleton notes the target file and the flaw or phase it closes.

---

## E1 (score 48): Entity Existence Gate — depth() pattern
**Closes:** flaw #2  
**Target file:** `src/tools/impact_analysis.ts` (wherever impact_analysis is implemented)

```typescript
// Before computing blast radius, verify entity actually exists.
// AtomSpace analogue: depth(handle) === -1 means "not found anywhere in chain".
function assertEntityExists(name: string, index: EntityIndex): void {
  if (!index.has(name)) {
    throw new EntityNotFoundError(
      `Entity "${name}" not found in knowledge base — ` +
      `this is a coverage gap, not an empty blast radius`
    );
  }
}

// In impact_analysis handler:
export async function impactAnalysis(params: { entity: string }): Promise<ImpactResult> {
  assertEntityExists(params.entity, this.entityIndex);
  // ... existing blast-radius computation
}
```

---

## E2 (score 32): Atomic Singleton State — StateLink pattern
**Closes:** flaws #4, #16, #19  
**Target file:** `src/knowledge/KnowledgeManager.ts` (state persistence layer)

```typescript
// Singleton slot: keyed write that atomically replaces, never appends.
// AtomSpace analogue: StateLink(alias, body) — inserting new removes old atomically.

class SingletonStateStore {
  private slots = new Map<string, unknown>();

  // Atomic set: always replaces. Observers never see zero (old removed before new set).
  set<T>(key: string, value: T): void {
    this.slots.set(key, value);
  }

  // Returns undefined only if the slot was never written, not if it was cleared.
  get<T>(key: string): T | undefined {
    return this.slots.get(key) as T | undefined;
  }

  // Flaw #19: initialize all flags on construction so cold-start reads never see undefined.
  constructor() {
    this.set('soulDirty', false);
    this.set('lastSyncCommit', null);
  }
}

// Flaw #16: wrap lastSyncCommit in the singleton store so dangling references are detectable:
function setLastSyncCommit(sha: string): void {
  if (!isReachableFromHead(sha)) {
    throw new DanglingRefError(`Commit ${sha} is not reachable from HEAD`);
  }
  singletonState.set('lastSyncCommit', sha);
}
```

---

## E5 (score 27): Diagnostic Comparison — content_compare pattern
**Closes:** flaw #2 (extends E1)  
**Target file:** `src/tools/impact_analysis.ts`

```typescript
// AtomSpace analogue: content_compare(first, second, check_values=true, emit_diagnostics=true)
// Returns diff of exactly which fields changed between two entity versions.

interface EntityDiff {
  changedFields: Array<{ field: string; old: unknown; new: unknown }>;
  addedFields: string[];
  removedFields: string[];
}

function compareEntityVersions(
  before: EntityRecord,
  after: EntityRecord,
  emitDiagnostics = false
): { identical: boolean; diff?: EntityDiff } {
  const changed: EntityDiff['changedFields'] = [];
  const added: string[] = [];
  const removed: string[] = [];

  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const key of allKeys) {
    if (!(key in before)) added.push(key);
    else if (!(key in after)) removed.push(key);
    else if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      changed.push({ field: key, old: before[key], new: after[key] });
    }
  }

  const identical = changed.length === 0 && added.length === 0 && removed.length === 0;
  if (identical) return { identical: true };

  return {
    identical: false,
    diff: emitDiagnostics ? { changedFields: changed, addedFields: added, removedFields: removed } : undefined,
  };
}
```

---

## E3 (score 24): Transient COW Knowledge Frame for Dry-Run
**Closes:** flaw #44  
**Target file:** `src/tools/compress.ts`

```typescript
// AtomSpace analogue: push_frame() creates COW child; mutations invisible to parent.
// pop_frame() discards child entirely.
// Cortex adaptation: in-memory snapshot of entity map for dry-run preview.

interface CompressResult {
  dryRun: boolean;
  mutations: Array<{ entityId: string; before: string; after: string }>;
  appliedCount: number;
}

async function compress(params: { path: string; apply?: boolean }): Promise<CompressResult> {
  const isDryRun = !params.apply;

  // "push_frame": shallow clone of entity content map — writes go here, not to disk.
  const frame = new Map<string, string>(await loadEntityContents(params.path));

  const mutations: CompressResult['mutations'] = [];

  for (const [id, content] of frame) {
    const compressed = applyCompressionRules(content);
    if (compressed !== content) {
      mutations.push({ entityId: id, before: content, after: compressed });
      // Write to frame (COW child), not to disk.
      frame.set(id, compressed);
    }
  }

  if (isDryRun) {
    // "pop_frame": discard the COW child; disk unchanged.
    return { dryRun: true, mutations, appliedCount: 0 };
  }

  // Caller passed apply=true: "promote" frame changes to parent (disk).
  await Promise.all(
    mutations.map(m => writeEntityContent(params.path, m.entityId, m.after))
  );
  return { dryRun: false, mutations, appliedCount: mutations.length };
}
```

---

## E4 (score 24): Active Architecture Design-Notes
**Closes:** flaw #113  
**Target:** Create `design-notes/` directory; update Librarian prompt

```
design-notes/
  stream-processing.md       # Why FutureStream over eager evaluation
  entity-identity.md         # Why filepath-based identity over ContentHash
  state-management.md        # Why atomic singleton state over event sourcing
  failed-approaches.md       # Index of approaches tried and abandoned
```

**Librarian prompt addition (src/llm/prompts.ts):**
```
// Add to synthesis instructions:
// When recording an entity's history, check design-notes/ for any documented
// failed approaches related to this entity's domain. If found, populate the
// entity's `failedApproaches` array with:
//   { approach: string, abandonedBecause: string, designNoteRef: string }
// If no design note exists, record any significant pattern deletion you observe
// in the diff with a one-sentence explanation.
```

---

## C1 (score 24): TypeIndex — O(1) Type-Based Entity Queries
**Proposed phase:** 13.5.3  
**Target file:** `src/knowledge/KnowledgeManager.ts`

```typescript
// AtomSpace analogue: TypeIndex = std::vector<AtomSet> indexed by Type integer.
// Cortex adaptation: Map<EntityType, Set<entityId>> maintained on every write.

class TypeIndex {
  private index = new Map<string, Set<string>>();

  add(entityId: string, type: string): void {
    if (!this.index.has(type)) this.index.set(type, new Set());
    this.index.get(type)!.add(entityId);
  }

  remove(entityId: string, type: string): void {
    this.index.get(type)?.delete(entityId);
  }

  // O(1) lookup — replaces O(n) filtered scan in cortex_find.
  getAll(type: string): ReadonlySet<string> {
    return this.index.get(type) ?? new Set();
  }

  // Subtype query support (future G1 work):
  getAllMatching(types: string[]): Set<string> {
    const result = new Set<string>();
    for (const t of types) {
      for (const id of this.getAll(t)) result.add(id);
    }
    return result;
  }
}

// Wire into KnowledgeManager.saveEntity():
// typeIndex.remove(entity.id, entity.previousType); // on type change
// typeIndex.add(entity.id, entity.type);
```

---

## C4 (score 24): ODR Dedup Guard for Plugin Registration
**Proposed phase:** 0.7.1  
**Target file:** `src/server.ts` (MCP tool registration)

```typescript
// AtomSpace analogue: NameServer._loaded_modules set check in beginTypeDecls().
// Prevents double-registration when library loaded from two paths.

class ToolRegistry {
  private registered = new Set<string>();

  register(name: string, handler: ToolHandler): void {
    if (this.registered.has(name)) {
      console.warn(`[ODR] Tool "${name}" already registered — skipping duplicate.`);
      return;
    }
    this.registered.add(name);
    this.mcpServer.registerTool(name, handler);
  }
}
```

---

## Scores below 20 (reference only, no skeleton)

| ID | Name | Score | Why skipped |
|----|------|-------|-------------|
| C2 | Thinnest-term BFS | 18 | Wait until Phase 33.5 (SQLite FTS5) adds selectivity metadata |
| C3 | FutureStream lazy props | 18 | Quality scores already recomputed on read; generic formula system premature |
| E6 | EvaluatorPool thread-local | 18 | Flaw #46 root cause is write-path sharing, not dispatch; thread-local read cache is partial fix only |
| C5 | QueueValue streaming | 12 | Requires Phase 22 (central server) for proper MCP streaming support |
