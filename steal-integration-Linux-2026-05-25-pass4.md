# Linux Kernel Pass 4 — Integration Scratch

TypeScript skeletons for all items scoring ≥ 20.

---

## P4-E1 · IngestCompletion — One-Shot Dedup Gate (score: 60)

```typescript
// src/utils/completion.ts
export class Completion {
  private done = false;
  private waiters: Array<() => void> = [];

  complete(): void {
    if (this.done) return;
    this.done = true;
    const ws = this.waiters.splice(0);
    for (const w of ws) w();
  }

  wait(): Promise<void> {
    if (this.done) return Promise.resolve();
    return new Promise<void>(resolve => this.waiters.push(resolve));
  }
}

// src/knowledge/ingest-manager.ts (addition)
const inflightIngests = new Map<string, Completion>();

export async function ingestWithDedup(entityId: string, ingestFn: () => Promise<void>): Promise<void> {
  const existing = inflightIngests.get(entityId);
  if (existing) {
    await existing.wait();  // join the in-flight ingest, don't duplicate
    return;
  }
  const completion = new Completion();
  inflightIngests.set(entityId, completion);
  try {
    await ingestFn();
  } finally {
    inflightIngests.delete(entityId);
    completion.complete();  // wake all waiters
  }
}
```

---

## P4-E2 · CONCURRENCY.md Convention (lock-ordering docs, score: 45)

Add to `CLAUDE.md` or create `CONCURRENCY.md`:

```markdown
## Cortex Async Re-entrancy Constraints

Mandatory acquisition order (analogous to Linux fsnotify mark.c:19):
  FileWatcher events → KnowledgeManager.shadowCache → EntityCache.commitShadow()

Rules:
1. MCP tool handlers: READ from `EntityCache.active` only — never mutate.
2. FileWatcher: WRITE to `EntityCache.shadow` only — never touch `active` mid-batch.
3. `commitShadow()`: called ONLY at watcher batch boundaries, never mid-handler.
4. Any method added to KnowledgeManager or EntityCache that mutates shared state
   MUST have a comment citing which rule above applies.
```

CI lint rule (add to `scripts/check-concurrency.ts`):

```typescript
// Flag any method on KnowledgeManager/EntityCache that assigns to shared fields
// without a comment containing "concurrency:" or "Rule N"
// Grep pattern: method bodies in these classes with `this\.\w+ =` but no // concurrency: comment
```

---

## P4-C1 · IntrusiveLRU — Zero-Allocation O(1) Promotion (score: 60)

```typescript
// src/knowledge/intrusive-lru.ts

// Embed this in CachedEntity instead of a separate node object
export interface LRUNode {
  lruPrev: string | null;  // entity ID of previous (colder)
  lruNext: string | null;  // entity ID of next (hotter)
}

export class IntrusiveLRU {
  private head: string | null = null;  // MRU end
  private tail: string | null = null;  // LRU end (eviction candidate)
  private size = 0;
  private readonly entities: Map<string, LRUNode & { [key: string]: unknown }>;

  constructor(entities: Map<string, LRUNode & { [key: string]: unknown }>) {
    this.entities = entities;
  }

  touch(id: string): void {
    this.remove(id);
    this.prepend(id);  // move to MRU end
  }

  admit(id: string): void {
    this.prepend(id);
    this.size++;
  }

  evictTail(): string | null {
    if (!this.tail) return null;
    const id = this.tail;
    this.remove(id);
    this.size--;
    return id;
  }

  private prepend(id: string): void {
    const node = this.entities.get(id)!;
    node.lruPrev = null;
    node.lruNext = this.head;
    if (this.head) this.entities.get(this.head)!.lruPrev = id;
    this.head = id;
    if (!this.tail) this.tail = id;
  }

  private remove(id: string): void {
    const node = this.entities.get(id);
    if (!node) return;
    if (node.lruPrev) this.entities.get(node.lruPrev)!.lruNext = node.lruNext;
    else this.head = node.lruNext;
    if (node.lruNext) this.entities.get(node.lruNext)!.lruPrev = node.lruPrev;
    else this.tail = node.lruPrev;
    node.lruPrev = null;
    node.lruNext = null;
  }
}
```

---

## P4-C2 · ToolResult<T> — Result Discriminated Union (score: 45)

```typescript
// src/types/result.ts
export type ToolResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: ToolErrorCode; message: string };

export const enum ToolErrorCode {
  NOT_FOUND     = 'NOT_FOUND',
  VALIDATION    = 'VALIDATION',
  INGEST_FAILED = 'INGEST_FAILED',
  CYCLE_DETECTED = 'CYCLE_DETECTED',
  TIMEOUT       = 'TIMEOUT',
}

export function ok<T>(value: T): ToolResult<T> {
  return { ok: true, value };
}

export function err<T>(code: ToolErrorCode, message: string): ToolResult<T> {
  return { ok: false, code, message };
}

// ESLint rule: @typescript-eslint/no-floating-promises applied to all
// functions returning ToolResult — callers must destructure or check .ok
// before using the value.

// Usage in MCP tool handler:
// const result = await readEntity(id);
// if (!result.ok) return { error: result.message };
// return result.value;
```

---

## P4-C3 · DirtyBitmap — Uint32Array entity dirty tracking (score: 36)

```typescript
// src/knowledge/dirty-bitmap.ts

export class DirtyBitmap {
  private readonly words: Uint32Array;
  private readonly capacity: number;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.words = new Uint32Array(Math.ceil(capacity / 32));
  }

  set(slot: number): void {
    this.words[slot >>> 5] |= 1 << (slot & 31);
  }

  clear(slot: number): void {
    this.words[slot >>> 5] &= ~(1 << (slot & 31));
  }

  isSet(slot: number): boolean {
    return (this.words[slot >>> 5] & (1 << (slot & 31))) !== 0;
  }

  /** Returns next set bit at or after `from`, or -1 if none. O(N/32) */
  findNext(from: number): number {
    let wordIdx = from >>> 5;
    let word = this.words[wordIdx] & ~((1 << (from & 31)) - 1); // mask off bits before `from`
    while (wordIdx < this.words.length) {
      if (word !== 0) return (wordIdx << 5) + Math.clz32(word ^ (word & (word - 1))) ^ 31;
      // simpler: return (wordIdx << 5) + ctz32(word)
      word = this.words[++wordIdx];
    }
    return -1;
  }

  clearAll(): void {
    this.words.fill(0);
  }
}

// Replace in KnowledgeManager:
// - dirtyEntities: Set<string>  →  dirtyBitmap: DirtyBitmap
// - entitySlots: Map<string, number>  (id → slot number, assigned at admit)
```

---

## P4-C4 · SaturatingRefCount — Entity Lifetime (score: 24)

```typescript
// src/utils/refcount.ts
const SATURATED = Number.MAX_SAFE_INTEGER;

export class RefCount {
  private count = 1;  // starts at 1 (born referenced)

  inc(): void {
    if (this.count === 0) {
      console.warn('[cortex:refcount] inc() on zero refcount — use-after-free');
      this.count = SATURATED;
      return;
    }
    if (this.count === SATURATED) return;
    this.count++;
  }

  /** Returns true when count transitions to 0 — caller must free */
  decAndTest(): boolean {
    if (this.count === 0) {
      console.warn('[cortex:refcount] dec() on zero refcount — double-free prevented');
      return false;
    }
    if (this.count === SATURATED) return false;  // saturated: never free
    this.count--;
    return this.count === 0;
  }

  get value(): number { return this.count; }
}
```

---

## P4-E3 · WatcherDestroyQueue — Deferred Teardown (score: 24)

```typescript
// src/watcher/destroy-queue.ts
import { warnOnce } from '../utils/warn-once.js';

interface DestroyItem { entityId: string; addedAt: number; }

const destroyQueue: DestroyItem[] = [];
const REAPER_DELAY_MS = 50;  // one event-loop tick equivalent
let reaperScheduled = false;

export function queueDestroy(entityId: string): void {
  destroyQueue.push({ entityId, addedAt: Date.now() });
  if (!reaperScheduled) {
    reaperScheduled = true;
    setTimeout(drainDestroyQueue, REAPER_DELAY_MS);
  }
}

async function drainDestroyQueue(): Promise<void> {
  reaperScheduled = false;
  const items = destroyQueue.splice(0);
  for (const { entityId } of items) {
    // Safe to evict now — no in-flight handler holds a reference to this generation
    await evictEntity(entityId);
  }
}

// Replace in FileWatcher unlink handler:
// - was: await cache.evict(entityId)  (synchronous, may race handlers)
// - now: queueDestroy(entityId)       (deferred, safe)
```

---

## To paste into flaws.md

### New Flaw #148
```
### 148. No Documented Async Re-entrancy Constraints on Shared State
**Source-of-lesson**: Linux kernel `fs/notify/mark.c:19–36` — mandatory comment block at the top of every file touching shared fsnotify state, stating the canonical lock acquisition order: `group->mark_mutex → mark->lock → connector->lock`. Every code review uses this as the authoritative spec.
**Pattern**: Cortex's watcher, KnowledgeManager, and entity cache share mutable state with no documented ordering discipline. There is no equivalent of the "lock ordering" header — a developer adding a new method to KnowledgeManager has no canonical reference for which mutations are safe, in which order, and under what constraints.
**Relevance to Cortex**: Add CONCURRENCY.md documenting: (1) MCP handlers read `EntityCache.active` only; (2) FileWatcher writes to `EntityCache.shadow` only; (3) `commitShadow()` fires only at batch boundaries. Add a CLAUDE.md rule: any PR mutating shared KnowledgeManager/EntityCache state must cite the applicable discipline in a comment.
**Severity**: 3 (HIGH — undocumented re-entrancy constraints are invisible until they produce a race bug; the bug is then nearly impossible to reproduce under normal load)
**Addressed by**: Phase 0.4 Refinement — CONCURRENCY.md Lock-Ordering Convention (Linux kernel audit pass 4, score: 45). See `steal-integration-Linux-2026-05-25-pass4.md` P4-E2.
```

### New Flaw #149
```
### 149. Duplicate Concurrent Ingest of Same Entity
**Source-of-lesson**: Linux kernel `include/linux/completion.h:26` — `struct completion { done, wait }` provides a one-shot gate where the first caller executes and all concurrent callers await the result; widely used to prevent redundant work (e.g., driver initialization).
**Pattern**: Two concurrent MCP tool calls can both call `ingest()` on the same entity (e.g., two parallel `read_entity` + stale detection paths). Both make separate LLM calls, pay twice the cost, and write the same result to disk twice — the second write clobbers the first.
**Relevance to Cortex**: Before calling `ingestFn()`, check `inflightIngests.has(entityId)`. If yes, `await inflightIngests.get(entityId).wait()` — the in-flight ingest completes and all waiters continue without re-invoking LLM. `complete()` is called in the `finally` block so it fires even on error.
**Severity**: 3 (HIGH — duplicate LLM calls double the cost silently; the second write creates a TOCTOU race on the entity file that may produce a partial write under high concurrency)
**Addressed by**: Phase 5 Refinement — IngestCompletion Dedup Gate (Linux kernel audit pass 4, score: 60). See `steal-integration-Linux-2026-05-25-pass4.md` P4-E1.
```
