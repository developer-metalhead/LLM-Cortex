# Linux Kernel Pass 8 — Integration Scratch

Usage patterns for C items (both score 24 — below the ≥30 full-skeleton threshold).
Included for implementation reference; not full TypeScript skeletons.

---

## P8-C1 · RAII Scope Cleanup with TypeScript `using` Keyword (cleanup.h:210, score: 24)

```typescript
// src/utils/disposable.ts
// TypeScript 5.2+ explicit resource management (TC39 stage 4 as of 2023).
// Maps to Linux DEFINE_FREE / __free() / guard() in cleanup.h.
//
// Usage pattern 1: file handle cleanup
// function processFile(path: string): void {
//   using handle = openFileHandle(path);       // handle[Symbol.dispose]() called on exit
//   const data = handle.read();
//   // handle auto-closed on scope exit, even if exception thrown
// }
//
// Usage pattern 2: async resource
// async function withLock(name: string): Promise<void> {
//   await using lock = await acquireLock(name);  // lock[Symbol.asyncDispose]() on exit
//   await doWork();
//   // lock released even on throw
// }
//
// Usage pattern 3: transfer ownership (no_free_ptr analogue)
// function buildAndReturn(): FileHandle {
//   using h = openFileHandle(path);
//   if (!validate(h)) return; // h disposed here
//   return h[Symbol.dispose] = () => {}; // suppress cleanup, transfer to caller
//   // Better: use DisposableStack.move()
// }

// Wrapper class pattern:
class FileHandleWrapper implements Disposable {
  private readonly fd: number;
  constructor(path: string) {
    this.fd = fs.openSync(path, 'r');
  }
  read(): Buffer { return fs.readFileSync(this.fd); }
  [Symbol.dispose](): void { fs.closeSync(this.fd); }
}

// tsconfig.json requirements:
// {
//   "compilerOptions": {
//     "lib": ["ES2022", "ESNext.Disposable"],
//     "target": "ES2022"
//   }
// }

// Definition of Done:
// - Add [Symbol.dispose] to file handle / watcher wrapper classes in src/utils/
// - Replace `const fd = openSync(...)` + try/finally with `using fd = new FileHandleWrapper(...)`
//   in ingest pipeline
// - Update tsconfig.json to include "ESNext.Disposable" in lib
```

---

## P8-C2 · lockdep_assert_held() — assertManagerOwns Debug Assertions (lockdep.h:284, score: 24)

```typescript
// src/utils/assert-owns.ts
// Debug-only assertion that a method is called within a managed context.
// Maps to Linux lockdep_assert_held(l) — compiled out in production (debug_locks gate).

const DEBUG = process.env.NODE_ENV !== 'production';

/**
 * Assert that `manager` is currently in an active/busy state.
 * Throws in development; no-op in production.
 * Use at the top of methods that must only be called from within a managed batch.
 */
export function assertManagerOwns(
  manager: { isBusy(): boolean },
  methodName: string
): void {
  if (DEBUG && !manager.isBusy()) {
    throw new Error(
      `assertManagerOwns: ${methodName} called outside of active manager context. ` +
      `This is a programming error — ensure you are inside a manager.batch() or manager.begin() block.`
    );
  }
}

// Usage in ExperienceManager:
// private _addToIndex(id: string, entity: Entity): void {
//   assertManagerOwns(this, 'ExperienceManager._addToIndex');
//   this._index.set(id, entity);
// }
//
// public isBusy(): boolean { return this._activeBatch !== null; }

// Usage in knowledge writer:
// private _writeJSONL(entry: KnowledgeEntry): void {
//   assertManagerOwns(this, 'KnowledgeWriter._writeJSONL');
//   // ...
// }

// Definition of Done:
// - Add `isBusy(): boolean` method to ExperienceManager and KnowledgeWriter
// - Add `assertManagerOwns(this, 'methodName')` at top of all _private methods
//   that mutate shared state
// - assertManagerOwns is a no-op in production (process.env.NODE_ENV === 'production')
// - Tests: call a manager private method outside of batch() → throws in test env
```

---

## To paste into flaws.md

### New Flaw #157
```
### 157. Stale Entity ID Silent Slot Reuse After LRU Eviction
**Source-of-lesson**: Linux kernel `include/linux/poison.h:19` — `POISON_FREE = 0x6b`, `POISON_INUSE = 0x5a`, `LIST_POISON1 = 0x100`, `LIST_POISON2 = 0x122`; freed memory is written with a distinctive magic value so any stale pointer dereference crashes immediately at a known address rather than silently operating on recycled memory.
**Pattern**: Cortex's LRU evicts entities from the entity Map without tombstoning or marking the evicted slot. If entity IDs are small integers that can be reused, a stale ID held by an in-flight LLM context could silently resolve to a new, unrelated entity that happens to occupy the same slot — producing subtly wrong context packs with no error signal.
**Relevance to Cortex**: After LRU eviction, the entity ID should be logged as evicted. Any subsequent lookup of that ID within the same request window should return a clear error or a tombstone record, not silently succeed. If entity IDs are UUIDs or content hashes (never reused), this flaw does not apply — but that invariant should be documented.
**Severity**: 2 (MEDIUM — silent reuse requires ID recycling; if IDs are content-hashed this never fires. But the invariant is undocumented and code review cannot verify it without an explicit guard.)
**Addressed by**: Phase 0.14 Refinement — Eviction Tombstone Guard (Linux kernel audit pass 8, see `steal-integration-Linux-2026-05-25-pass8.md` P8-F1 analysis).
```
