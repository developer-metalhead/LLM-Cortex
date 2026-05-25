# Linux Kernel Pass 7 — Integration Scratch

TypeScript skeletons for all items scoring ≥ 30.

---

## P7-E1 · SafeAdd / WrappingAdd Checked Arithmetic (overflow.h:61, score: 45)

```typescript
// src/utils/math.ts (additions to existing file)

/**
 * Checked addition — returns { result, overflow }.
 * Maps to Linux check_add_overflow(a, b, d).
 * Use when overflow is an error (token budget, byte counters, score accumulators).
 */
export function safeAdd(a: number, b: number): { result: number; overflow: boolean } {
  const result = a + b;
  // JS numbers are float64; integer overflow occurs above Number.MAX_SAFE_INTEGER
  const overflow = result > Number.MAX_SAFE_INTEGER || result < Number.MIN_SAFE_INTEGER;
  return { result, overflow };
}

/**
 * Wrapping addition — documents intentional modular arithmetic.
 * Maps to Linux wrapping_add(type, a, b).
 * Use for ring-buffer head/tail indices where wrap-around is correct.
 * CONVENTION: never use plain (a + b) % capacity — use wrappingAdd(a, b, capacity) instead.
 */
export function wrappingAdd(a: number, b: number, modulus: number): number {
  return (a + b) & (modulus - 1);  // requires modulus to be a power of 2
}

/**
 * Checked multiply — returns { result, overflow }.
 * Maps to Linux check_mul_overflow(a, b, d).
 */
export function safeMul(a: number, b: number): { result: number; overflow: boolean } {
  const result = a * b;
  const overflow = !Number.isFinite(result) || result > Number.MAX_SAFE_INTEGER;
  return { result, overflow };
}

// Usage in build_context_pack:
// const { result: newLen, overflow } = safeAdd(currentBytes, chunk.length);
// if (overflow || newLen > TOKEN_BUDGET_BYTES) break;
// currentBytes = newLen;

// Usage in ring buffer:
// head = wrappingAdd(head, 1, capacity);  // documents intentional wrap
```

---

## P7-E2 · SeqConfig Config Hot-Reload Consistency (seqlock.h:42, score: 36)

```typescript
// src/utils/seq-config.ts
// Seqlock-style consistent config reads during hot-reload.
// Writer (file watcher) is never blocked. Readers retry only if a write
// happened during their read — O(1) on the happy path (no concurrent write).

export class SeqConfig<T> {
  private seq = 0;   // even = stable, odd = write in progress
  private value: T;

  constructor(initial: T) {
    this.value = initial;
  }

  /**
   * Atomically swap in a new config. Call from file-watcher callback.
   * MUST NOT await inside the swap — complete the assignment synchronously.
   */
  write(newValue: T): void {
    this.seq++;                  // odd: write in progress
    this.value = newValue;       // synchronous assignment — no await allowed here
    this.seq++;                  // even: stable
  }

  /**
   * Read a consistent snapshot. Retries if a write raced the read.
   * In practice retries 0–1 times (writes are rare).
   */
  read(): T {
    let snapshot: T;
    let attempts = 0;
    do {
      const seq = this.seq;
      if (seq & 1) continue;         // odd = write in progress, spin
      snapshot = { ...this.value as object } as T;   // shallow snapshot
      if (this.seq === seq) return snapshot;          // stable read
    } while (++attempts < 100);
    return this.value;  // fallback after too many retries
  }
}

// In ConfigManager:
// const seqConfig = new SeqConfig<CortexConfig>(initialConfig);
//
// File watcher callback (synchronous swap, no await):
// seqConfig.write(parseConfig(fileContent));
//
// In every MCP tool handler (replaces direct config access):
// const config = seqConfig.read();
// ... use config.maxEntities, config.tokenBudget, etc. ...
```

---

## To paste into flaws.md

### New Flaw #156
```
### 156. Config Object Torn Read Possible During Hot-Reload Across Await Boundaries
**Source-of-lesson**: Linux kernel `include/linux/seqlock.h:42` — `seqcount_t { sequence }`; `read_seqcount_begin/retry` for lockless readers; `write_seqcount_begin/end` brackets the write; odd sequence = write in progress (readers retry); even = stable (readers proceed); zero blocking in either direction.
**Pattern**: Cortex's file-watcher hot-reload can overwrite the config object at any point. An MCP tool handler that reads `config.maxEntities` before an `await` and then reads `config.tokenBudget` after the `await` can see two different config versions — maxEntities from the old config, tokenBudget from the new one. Each field is consistent, but the combination is not.
**Relevance to Cortex**: Wrap the config object in a `SeqConfig<T>` that increments a counter around writes and lets readers retry if the counter changed during their read. The seqlock's key property: writes are never blocked by readers, and readers only spin on the rare case of a concurrent write.
**Severity**: 2 (MEDIUM — torn reads produce subtle wrong-behavior rather than crashes; most config fields are independent so the combination error is hard to detect in tests)
**Addressed by**: Phase 0.11 Refinement — SeqConfig Hot-Reload Consistency (Linux kernel audit pass 7, score: 36). See `steal-integration-Linux-2026-05-25-pass7.md` P7-E2.
```
