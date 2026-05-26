# Repomix Steal Inventory — 2026-05-24

**Target**: `C:\Users\kumsatwi\Desktop\StEp\personalProject\repomix` @ `5f704397`  
**Mode**: Full audit | **Calibration**: Standard library (130 TS files, ~15k LOC)  
**Spot-check**: PASS (3/3 verified)

---

## Headline Summary Table (Top E + Top C by score)

| Bkt | Score | Name | Source | Gist |
|-----|-------|------|--------|------|
| E | 60 | WASM tree-sitter over native | parseFile.ts:1-19 | No node-gyp, cross-platform, bundled grammars |
| E | 48 | Security scan git diff+log | securityCheck.ts:43 | Scan staged diffs, work-tree diffs, git log for secrets |
| C | 45 | tokenCountTree visual tree | tokenCountTreeReporter.ts:11 | Per-dir token budget tree with min threshold |
| C | 45 | MCP grep tool with context lines | grepRepomixOutputTool.ts:80 | grep_knowledge: before/after context, regex, case-insensitive |
| C | 45 | Atomic cache save tmp→rename | tokenCountCache.ts:290 | pid+random suffix, revision counter, prevents torn JSON |
| C | 36 | Git sortByChanges context ordering | outputSort.ts:94 | Most-churned files go last (freshest in LLM attention) |
| C | 36 | Remote config trust gate | configLoad.ts:100 | Skip cortex.json in remote repos unless --remote-trust-config |
| C | 36 | secretlint profiler O(n²) fix | securityCheckWorker.ts:54 | performance.mark no-op in worker threads; isMainThread guard |
| C | 32 | Content-addressed token cache | tokenCountCache.ts:327 | Key: encoding:byteLength:md5_16; FIFO eviction at 100k |
| C | 30 | Markdown backtick delimiter calc | outputGenerate.ts:54 | max(3, maxBackticks+1) avoids code fence conflicts |
| C | 30 | Chunk separator ⋮---- | parseFile.ts:35 | Visual gap marker between non-adjacent AST captures |
| C | 30 | Lazy language parser singleton | parseFile.ts:107 | Init once, share, explicit dispose() on cleanup |
| C | 30 | for...in vs Object.entries large JSON | tokenCountCache.ts:206 | Avoids materializing 100k-tuple array on cold cache load |
| C | 30 | JSON5 config format | configLoad.ts:5 | Comments + trailing commas in cortex.json |

---

## Bucket E — Closes Known Flaws

### E1 — WASM tree-sitter over native node-tree-sitter (closes Flaw #83)
**Score**: 60 | **Phase**: 0.13 | **Confidence**: high

**What repomix does** (`src/core/treeSitter/parseFile.ts:1-19`): Uses `web-tree-sitter` (WASM) instead of `node-tree-sitter` (native C++ bindings). Reasons: cross-platform (no Python/C++ compiler/node-gyp), single `@repomix/tree-sitter-wasms` package bundles all language grammars, works on Node 23 where native bindings have known issues.

**Why for Cortex**: Phase 0.13 currently plans native tree-sitter. Repomix proves the WASM path is production-ready and avoids the install-time failures that will block adoption on CI systems without build toolchains.

**Counter-case**: WASM adds ~10-20ms cold-start vs native. For a long-running MCP server, amortized to near-zero.

---

### E2 — Scan git diff + git log for secrets (extends Phase 7.10 scope)
**Score**: 48 | **Phase**: 7.10 | **Confidence**: high

**What repomix does** (`src/core/security/securityCheck.ts:43-77`): Passes three content streams to secretlint: file contents, working-tree git diff, staged git diff, and git log history. All four are scanned for secrets before the output is written.

**Why for Cortex**: Phase 7.10 (Sensitive Data Sanitization Guardrail) currently describes scanning entity content. Cortex also processes git diffs in Phase 12.2 hooks and context packs. A secret in a diff payload would bypass a file-only scan.

**Counter-case**: Adds runtime to Phase 7.10 scan. Gate behind `enableSecurityCheck` flag already planned.

---

## Bucket C — Worth Stealing

### C1 — tokenCountTree: per-directory token budget tree
**Score**: 45 | **Phase**: 13 | **Confidence**: high

When `build_context_pack` returns, emit a token-count tree sorted by token usage per directory:
```
🔢 Token Count Tree:
├── src/ (12,450 tokens)
│   ├── core/ (8,200 tokens)
│   │   ├── packager.ts (1,240 tokens)
│   │   └── metrics/ (3,400 tokens)
│   └── cli/ (4,250 tokens)
└── tests/ (820 tokens)
```
Optional minimum threshold (`tokenCountTree: 500` shows only entries ≥500 tokens).

**Source**: `src/cli/reporters/tokenCountTreeReporter.ts:11` — `reportTokenCountTree()`  
**Counter-case**: Another display mode adds noise to pack output. Keep optional (default off).

---

### C2 — MCP grep_knowledge tool with context lines
**Score**: 45 | **Phase**: 4 (MCP) | **Confidence**: high

```typescript
mcpServer.registerTool('grep_knowledge', {
  inputSchema: z.object({
    pattern: z.string(),
    contextLines: z.number().default(0),
    beforeLines: z.number().optional(),
    afterLines: z.number().optional(),
    ignoreCase: z.boolean().default(false),
  }),
  annotations: { readOnlyHint: true, idempotentHint: true },
  // ...
});
```
Searches the built context pack with grep-like semantics; returns line numbers, matched text, and surrounding context. Fills the "CLAUDE.md grep ban has no substitute" gap for entity bodies not yet in the knowledge graph.

**Source**: `src/mcp/tools/grepRepomixOutputTool.ts:80` — `registerGrepRepomixOutputTool()`  
**Counter-case**: `cortex_find` and `source` already handle indexed entities. grep_knowledge only adds value for un-synthesized source.

---

### C3 — Atomic cache save: tmp+pid+random → rename
**Score**: 45 | **Phase**: 13 | **Confidence**: high

```typescript
const uniqueSuffix = randomBytes(4).toString('hex');
const tmpFile = `${cacheFile}.${process.pid}.${uniqueSuffix}.tmp`;
await fs.writeFile(tmpFile, JSON.stringify(data), { mode: 0o600 });
await fs.rename(tmpFile, cacheFile);
// Revision counter prevents stale dirty-clear on concurrent saves
if (state.revision === startRevision) {
  state.dirty = false;
} else {
  state.dirty = true; // concurrent setCached ran during our write — re-persist next time
}
```
Also uses `for...in` instead of `Object.entries` to iterate 100k-entry JSON (avoids materializing a large tuple array).

**Source**: `src/core/metrics/tokenCountCache.ts:290` — `saveTokenCountCache()`  
**Counter-case**: Complexity only justified for long-running MCP server. Simpler write-then-rename is fine for single-use CLI.

---

### C4 — Git sortByChanges: most-churned files sorted last
**Score**: 36 | **Phase**: 13 | **Confidence**: high

Sort context pack files by git commit frequency over last N commits. Most-changed files appear last — placed in LLM's recency window (highest attention). Cached per-run to avoid repeated git subprocess spawns.

```typescript
export const prefetchSortData = async (config) => {
  if (!config.output.git?.sortByChanges) return;
  await getFileChangeCounts(config.cwd, config.output.git.sortByChangesMaxCommits, deps);
};
// Called at start of pack() in background, cache hit by the time sortOutputFiles runs
```

**Source**: `src/core/output/outputSort.ts:94`, `packager.ts:91`  
**Counter-case**: Most-changed files may be generated code (lock files, migrations). Needs an extension-type filter.

---

### C5 — Remote config trust gate
**Score**: 36 | **Phase**: 22 | **Confidence**: high

When processing a remote repo (Phase 22 `cortex server` or any future remote-ingest path), skip the local `cortex.json` / `repomix.config.*` found inside the repo **unless** the caller passes `--remote-trust-config`. Logs clearly when a config is skipped.

**Source**: `src/config/configLoad.ts:100-108`  
**Counter-case**: Adds a required flag for trusted remote repos; friction for power users with controlled internal repos.

---

### C6 — secretlint profiler O(n²) fix
**Score**: 36 | **Phase**: 7.10 | **Confidence**: high

`@secretlint/profiler` maintains an unbounded `entries[]` with an `O(n)` find scan per mark, making it `O(n²)` across a single worker's lifetime (~1.2s overhead for 1000 files). Fix: no-op `performance.mark` inside worker threads only:

```typescript
if (!isMainThread) {
  Object.defineProperty(perf_hooks.performance, 'mark', {
    value: () => undefined,
    writable: true,
    configurable: true,
  });
}
// isMainThread guard: main-process callers still use real performance.mark
// Object.defineProperty (not prototype patch): only this instance is affected
```

**Source**: `src/core/security/workers/securityCheckWorker.ts:54-60`  
**Counter-case**: Patches a Node.js built-in. Future Node version making `mark` non-configurable would silently skip the optimization (the `try/catch` handles this).

---

### C7 — Content-addressed token count cache
**Score**: 32 | **Phase**: 13 | **Confidence**: high

Cache key: `${encoding}:${byteLength}:${md5.slice(0,16)}`. Byte length included to make key tolerant to MD5 collisions. FIFO eviction via `Map` insertion-order at 100k entries. Per-repo seen marker (empty file, md5 of resolved rootDirs) to distinguish warm vs cold pre-warm for worker pool.

**Source**: `src/core/metrics/tokenCountCache.ts:327`, `151`  
**Counter-case**: Token counting is rare in Cortex today. Build when pack performance at scale actually matters.

---

### C8-C12 (score 30 each)

- **C8** Markdown backtick delimiter: `max(3, maxBackticks+1)` in entity/pack markdown output. `outputGenerate.ts:54`
- **C9** Chunk separator `⋮----`: Unicode gap marker between non-adjacent AST chunks. `parseFile.ts:35`
- **C10** Lazy singleton + dispose(): `languageParserSingleton` initialized on first use, explicit `cleanupLanguageParser()` export. `parseFile.ts:107-128`
- **C11** `for...in` instead of `Object.entries` for large JSON load: avoids materializing 100k-entry tuple array. `tokenCountCache.ts:206`
- **C12** JSON5 config: `repomix.config.json5` support (comments, trailing commas). `configLoad.ts:5`

---

## Bucket A — Already in Cortex

| ID | Feature | Phase |
|----|---------|-------|
| A1 | Multi-language tree-sitter extractors | 0.13 (planned) |
| A2 | Token counting for context packs | 13 (done) |
| A3 | Secret scanning in files | 7.10 (planned) |
| A4 | MCP server with tool registration | 4 (done) |
| A5 | Fuzzy search with RRF | 13.5 (done) |

## Bucket B — Cortex Superior

- **B1** Handlebars templates: Cortex uses LLM synthesis → richer output.
- **B2** Skill generation (SKILL.md): Cortex generates structured knowledge graph, not flat file packs.

## Bucket D — Wrong Fit

- **D1** GitHub archive streaming download: local-first violation; Phase 22 deferred.
- **D2** Split output by N parts: doesn't apply to knowledge-graph architecture.
- **D3** Tinypool unified bundled worker: Cortex doesn't bundle yet.

---

## Themes

**Performance**: repomix is obsessive about parallelism — file collect, git ops, security check, and metrics all overlap. The warm/cold worker pool heuristic (probe 2 files, save 225ms × N wasted BPE parses) is particularly elegant. Cortex should adopt the same discipline for Phase 13 context pack builds.

**Security**: secretlint scans 4 content streams (files + 2 git diffs + git log). The O(n²) profiler fix is a cautionary tale: third-party security libraries can have performance bugs that negate the value of running them. Always profile in worker thread context.

**Config ergonomics**: 10 config file formats supported (ts/mts/cts/js/mjs/cjs/json5/jsonc/json + global). jiti for TS config. JSON5 for comments. Remote trust gate for security. Cortex's single `cortex.json` is fine, but JSON5 would immediately improve DX.

**MCP design**: repomix's MCP tools use Zod output schemas (typed structured content), in-process output registry (Map<id, filepath>), and outputId for sandboxed environments. These patterns transfer directly to Cortex's MCP layer.

---

## Audit Limitations

- `src/mcp/prompts/` not deeply read (MCP prompt templates; low signal for Cortex).
- `src/cli/actions/defaultAction.ts` (main CLI flow) only read at surface level.
- Website (`website/`) not audited — different product domain.
- Browser bundle (`browser/`) not audited — browser-specific, not relevant to Cortex CLI.
