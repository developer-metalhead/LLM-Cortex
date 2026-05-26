# Integration Scratch — repomix
**Date**: 2026-05-24  
**Target**: C:\Users\kumsatwi\Desktop\StEp\personalProject\repomix  
**Inventory**: steal-inventory-repomix-2026-05-24.json

---

## To paste into flaws.md

### Flaw #125 — secretlint profiler accumulates O(n²) per-mark entries in worker threads
**Severity**: 3 (HIGH — silent 1.2s overhead per security-check worker on 1000-file repos)  
**Description**: `@secretlint/profiler` installs a module-level `PerformanceObserver` that appends to an unbounded `entries[]` array on every `profiler.mark()` call and scans the entire array with `entries.find()` on each append. Across a single worker's lifetime processing ~1000 files, this accumulates to O(n²) profiler overhead (~1.2s per worker, zero functional benefit). The profiler module may be nested under `@secretlint/core/node_modules/@secretlint/profiler`, making direct singleton patching unreliable across npm resolution trees.  
**Fix**: No-op `performance.mark` inside worker threads only (via `Object.defineProperty` with `isMainThread` guard). Protects against all profiler copies simultaneously since all call the single Node.js built-in. Falls back gracefully if Node makes `mark` non-configurable in a future version.  
**Source-of-lesson**: repomix `src/core/security/workers/securityCheckWorker.ts:14-60`

---

## To paste into implementation_plan.md

### Phase 0.13 Refinement — Use web-tree-sitter (WASM) over node-tree-sitter (native bindings) (score: 60, closes Flaw #83)

**Why WASM**: repomix ships `@repomix/tree-sitter-wasms` (WASM grammars for all languages) and uses `web-tree-sitter` instead of `node-tree-sitter`. Rationale confirmed from production use:

1. **Cross-platform**: WASM works identically on all platforms. Native bindings require Python, a C++ compiler, and node-gyp — all of which fail silently on Alpine Linux and in some CI environments.
2. **Easy install**: Single npm package bundles all language parsers. No per-language native packages needed.
3. **Node version stability**: Node.js 23 has known issues with `node-tree-sitter`. WASM has no such breakage.
4. **Performance**: WASM overhead is acceptable for batch extraction (not interactive). For a long-running MCP server, the cold-start cost is amortized.

**Implementation** (replaces the native binding approach in Phase 0.13):
- Replace `node-tree-sitter` + individual `tree-sitter-<lang>` packages with `web-tree-sitter` + `@repomix/tree-sitter-wasms` (or equivalent bundled WASM package).
- Init WASM runtime once via `Parser.init()` before parsing any file.
- Store parser instances per language in a Map; reuse across files.
- Dispose all parsers on MCP server shutdown (`languageParser.dispose()`).

**Source**: repomix `src/core/treeSitter/parseFile.ts:1-19` — comment block + `web-tree-sitter` import  
**Score**: 60 (severity=4, fit=5, effort=1, recency=1.0)

---

### Phase 0.13 Refinement — Chunk separator ⋮---- + duplicate/adjacent chunk consolidation (score: 30)

When Phase 0.13 emits skeleton output for compressed source files, apply two cleanup passes and use the `⋮----` separator:

```typescript
export const CHUNK_SEPARATOR = '⋮----';

// Pass 1: duplicate chunk resolution
// When multiple captures start at the same line, keep the one with the most content
function filterDuplicatedChunks(chunks: CapturedChunk[]): CapturedChunk[] {
  const byStartRow = new Map<number, CapturedChunk[]>();
  for (const chunk of chunks) {
    const arr = byStartRow.get(chunk.startRow) ?? [];
    arr.push(chunk);
    byStartRow.set(chunk.startRow, arr);
  }
  const result: CapturedChunk[] = [];
  for (const rowChunks of byStartRow.values()) {
    rowChunks.sort((a, b) => b.content.length - a.content.length);
    result.push(rowChunks[0]);
  }
  return result.sort((a, b) => a.startRow - b.startRow);
}

// Pass 2: adjacent chunk merging (use string[] accumulation, not += to avoid O(k²) copies)
function mergeAdjacentChunks(chunks: CapturedChunk[]): CapturedChunk[] {
  const merged: CapturedChunk[] = [];
  let parts: string[] = [chunks[0].content];
  let start = chunks[0].startRow, end = chunks[0].endRow;
  for (let i = 1; i < chunks.length; i++) {
    if (end + 1 === chunks[i].startRow) {
      parts.push(chunks[i].content);
      end = chunks[i].endRow;
    } else {
      merged.push({ content: parts.join('\n'), startRow: start, endRow: end });
      parts = [chunks[i].content];
      start = chunks[i].startRow; end = chunks[i].endRow;
    }
  }
  merged.push({ content: parts.join('\n'), startRow: start, endRow: end });
  return merged;
}

// Final output
return mergeAdjacentChunks(filterDuplicatedChunks(captures))
  .map(c => c.content)
  .join(`\n${CHUNK_SEPARATOR}\n`)
  .trim();
```

**Key detail**: use array accumulation (`parts.push(...)` + `.join('\n')`) instead of string `+=` in `mergeAdjacentChunks` — avoids O(k²) copy cost on large files with many adjacent chunks.

**Source**: repomix `src/core/treeSitter/parseFile.ts:35, 130-186`  
**Score**: 30 (severity=2, fit=5, effort=1, recency=1.0)

---

### Phase 7.10 Refinement — Extend secretlint scan to git diff + git log content (score: 48)

Phase 7.10 (Sensitive Data Sanitization Guardrail) should scan four content streams, not just file contents. Repomix production usage proves all four are necessary:

```typescript
interface SecurityCheckItem {
  filePath: string;
  content: string;
  type: 'file' | 'gitDiff' | 'gitLog';
}

// Build scan items for all four streams
const allItems: SecurityCheckItem[] = [
  ...rawFiles.map(f => ({ filePath: f.path, content: f.content, type: 'file' as const })),
  ...(gitDiffResult?.workTreeDiffContent ? [{
    filePath: 'Working tree changes',
    content: gitDiffResult.workTreeDiffContent,
    type: 'gitDiff' as const,
  }] : []),
  ...(gitDiffResult?.stagedDiffContent ? [{
    filePath: 'Staged changes',
    content: gitDiffResult.stagedDiffContent,
    type: 'gitDiff' as const,
  }] : []),
  ...(gitLogResult?.logContent ? [{
    filePath: 'Git log history',
    content: gitLogResult.logContent,
    type: 'gitLog' as const,
  }] : []),
];
```

**Also apply the secretlint O(n²) profiler fix** in any worker thread that runs secretlint (see Flaw #125):
```typescript
if (!isMainThread) {
  try {
    Object.defineProperty(perf_hooks.performance, 'mark', {
      value: () => undefined, writable: true, configurable: true,
    });
  } catch { /* Non-configurable in future Node — silently skip */ }
}
```

**Source**: repomix `src/core/security/securityCheck.ts:43-77`, `workers/securityCheckWorker.ts:54-60`  
**Score**: 48 (severity=4, fit=4, effort=1, recency=1.0) + 36 for profiler fix

---

### Phase 13 Refinement — tokenCountTree: per-directory token budget visualization (score: 45)

Add a `tokenCountTree` option to `build_context_pack`. When enabled, emit a tree view of token usage per directory after the pack is built:

```typescript
interface TokenCountTreeOptions {
  enabled: boolean;
  minTokens?: number;  // Only show entries at or above this threshold
}

function reportTokenCountTree(
  fileTokenCounts: Record<string, number>,
  minTokens = 0,
): string {
  // Build tree from flat file→tokenCount map
  const tree = buildTokenCountTree(fileTokenCounts);
  return formatNode(tree, '', true, minTokens);
}

// Output format:
// 🔢 Token Count Tree:
// ├── src/ (12,450 tokens)
// │   ├── core/ (8,200 tokens)
// │   │   └── packager.ts (1,240 tokens)
// └── tests/ (820 tokens)
```

**Where to emit**: as a structured field in the `build_context_pack` tool response (JSON), not just as console output. Agents can read `result.tokenTree` to understand where the token budget is going and which directories to exclude.

**Source**: repomix `src/cli/reporters/tokenCountTreeReporter.ts:11-102`, `src/core/tokenCount/buildTokenCountStructure.ts`  
**Score**: 45 (severity=3, fit=5, effort=1, recency=1.0)

---

### Phase 13 Refinement — Content-addressed token count cache with FIFO eviction (score: 32)

For context packs built over large repos, cache token counts by content hash to avoid re-tokenizing unchanged files across runs:

```typescript
// Cache key: ${encoding}:${byteLength}:${md5_16chars}
// byteLength included to make key tolerant to MD5 collisions on different-sized inputs
export const contentCacheKey = (encoding: TokenEncoding, content: string): string => {
  const byteLength = Buffer.byteLength(content);
  const digest = createHash('md5').update(content).digest('hex').slice(0, 16);
  return `${encoding}:${byteLength}:${digest}`;
};

// FIFO eviction: Map insertion order = FIFO; delete oldest on overflow
export const setCached = (key: string, tokenCount: number): void => {
  if (!cache.has(key) && cache.size >= MAX_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, tokenCount);
};

// Atomic persistence: tmp+pid+random → rename to prevent torn JSON on crash
const tmpFile = `${cacheFile}.${process.pid}.${randomBytes(4).toString('hex')}.tmp`;
await fs.writeFile(tmpFile, JSON.stringify(data), { mode: 0o600 });
await fs.rename(tmpFile, cacheFile);  // atomic on POSIX; near-atomic on Windows
```

**Load optimization**: use `for...in` to iterate the loaded JSON object instead of `Object.entries` — avoids materializing a 100k-entry `[key, value][]` array that spikes V8 memory.

**Source**: repomix `src/core/metrics/tokenCountCache.ts:206-353`  
**Score**: 32 (severity=4, fit=4, effort=2, recency=1.0)

---

### Phase 13 Refinement — git sortByChanges: order context pack by file churn frequency (score: 36)

When assembling a context pack, optionally sort included files by git commit frequency so the most-frequently-changed files appear last (recency bias: LLM attends more to the end of context):

```typescript
async function sortByGitChurn(
  filePaths: string[],
  cwd: string,
  maxCommits = 100,
): Promise<string[]> {
  const counts = await getFileChangeCount(cwd, maxCommits);
  // Most-changed files go LAST (highest attention position in LLM context window)
  return [...filePaths].sort((a, b) => (counts[a] ?? 0) - (counts[b] ?? 0));
}
```

Pre-fetch the git log in the background at the start of `build_context_pack` so the sort is a cache hit by the time it runs:
```typescript
// Kick off in background at pack() start — overlaps with file collection
const sortDataPromise = prefetchSortData(config).catch(() => {});
// ...
await sortDataPromise;  // resolved by the time we need it
```

**Source**: repomix `src/core/output/outputSort.ts:94-131`, `packager.ts:91-93`  
**Score**: 36 (severity=3, fit=4, effort=1, recency=1.0)

---

### Phase 22 Refinement — Remote config trust gate for cortex.json (score: 36)

When Phase 22 (`cortex server start`) or any future remote-ingest path processes a remote repository, skip the `cortex.json` found inside that repo by default:

```typescript
async function loadProjectConfig(
  rootDir: string,
  options: { remoteMode?: boolean; trustRemoteConfig?: boolean } = {},
): Promise<CortexConfig> {
  const localConfig = path.join(rootDir, 'cortex.json');

  if (options.remoteMode && !options.trustRemoteConfig) {
    const configExists = await fileExists(localConfig);
    if (configExists) {
      logger.warn(
        `Skipping cortex.json found in remote repository: ${rootDir}\n` +
        'Use --remote-trust-config to trust and load it.',
      );
    }
    return defaultConfig();
  }

  return await loadAndValidateConfig(localConfig);
}
```

**Why**: A malicious repo could include a `cortex.json` that enables dangerous features (e.g. disabling security checks, setting paths outside the repo root). Remote repos are untrusted by default.

**Source**: repomix `src/config/configLoad.ts:100-108`  
**Score**: 36 (severity=3, fit=4, effort=1, recency=1.0)

---

### Phase 13 Refinement — Markdown backtick delimiter auto-calculation (score: 30)

When Cortex generates markdown output (context packs, synthesis reports), dynamically compute the code fence delimiter to avoid conflicts with file content that itself contains triple backticks:

```typescript
function calculateMarkdownDelimiter(files: ProcessedFile[]): string {
  const maxBackticks = files
    .flatMap(f => f.content.match(/`+/g) ?? [])
    .reduce((max, m) => Math.max(max, m.length), 0);
  return '`'.repeat(Math.max(3, maxBackticks + 1));
}

// Usage in template:
// ${delimiter}typescript
// ${fileContent}
// ${delimiter}
```

If a file contains ` ``` ` (3 backticks), the delimiter becomes ```` ```` ```` (4 backticks). If it contains ` ```` ` (4 backticks), delimiter becomes ` ````` ` (5 backticks). Minimum is always 3.

**Source**: repomix `src/core/output/outputGenerate.ts:54-59` — `calculateMarkdownDelimiter()`  
**Score**: 30 (severity=2, fit=5, effort=1, recency=1.0)

---

### Phase 5 Refinement — JSON5 support for cortex.json config file (score: 30)

Support `cortex.json5` alongside `cortex.json` for project config. JSON5 allows comments (`//`, `/* */`) and trailing commas, making config files self-documenting:

```json5
// cortex.json5 — Project Cortex configuration
{
  // Enable brevity mode for all MCP responses
  brevity: {
    enabled: true,
    targetLevel: "aggressive",  // options: minimal, moderate, aggressive
  },
  // Synthesis settings
  synthesis: {
    model: "claude-sonnet-4-6",
    maxTokensPerEntity: 2000,
  },
}
```

**Implementation**: Add `cortex.json5` to the config file search priority list. Parse with `json5` npm package (lightweight, zero transitive deps). Fall back to `cortex.json` if `cortex.json5` not found.

**Source**: repomix `src/config/configLoad.ts:5, 21-29` — `JSON5` import + `defaultConfigPaths` array  
**Score**: 30 (severity=2, fit=5, effort=1, recency=1.0)
