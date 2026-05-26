# Integration Scratch — codegraph — 2026-05-24

> Copy-paste ready content for `implementation_plan.md` and `flaws.md`.  
> Review and edit before pasting — this is a draft, not an authoritative plan.

---

## To paste into flaws.md

### Flaw #118 — Synchronous shell-out in PreToolUse hooks
**Severity**: 3 (HIGH)
**Description**: `inject-knowledge.js` uses `execSync` to call `cortex read` before every Read/Grep tool call. This blocks the event loop for 100-500ms on each native tool call and makes the IDE feel sluggish. The correct pattern (per codegraph's `src/sync/git-hooks.ts:73-80`) is async background: `( cortex read >/dev/null 2>&1 & ) >/dev/null 2>&1`. Note: the hook already uses a session-marker guard (fires only once per ppid), so the async version still injects on first call; subsequent calls are no-ops.
**Source-of-lesson**: codegraph/src/sync/git-hooks.ts:73-80

---

## To paste into implementation_plan.md

### Phase 0.5 Refinement — SQLite WAL + Bounded Busy-Timeout + Stale-PID Lock (CodeGraph)

**Source-of-lesson**: codegraph/src/__tests__/concurrent-locking.test.ts:41-55

When Phase 0.5 (OS-Native File Locking) ships, use the following battle-tested configuration:

- **WAL mode** (`PRAGMA journal_mode=WAL`): lets readers proceed during a writer — eliminates "database is locked" on concurrent MCP tool calls.
- **Bounded busy_timeout** (`PRAGMA busy_timeout=N` where N ≤ 30,000ms): fail fast rather than hanging for the old default 120s. Surface a clear error to the user.
- **Stale-PID FileLock**: lock file stores PID. On `acquire()`, check `process.kill(pid, 0)` (no-op signal). If `ESRCH` → PID is dead → auto-remove stale lock and proceed. This handles the case where a prior process crashed without releasing.
- **Test coverage**: assert `busy_timeout ≤ 30000` and `journal_mode = 'wal'` in unit tests (not just in prod).

---

### Phase 0.10 Refinement — Marker-Delimited Async Git Hook Sync (CodeGraph)

**Source-of-lesson**: codegraph/src/sync/git-hooks.ts:19-80

When Phase 0.10 (Defensive Git Hook Rewrite) ships:

1. **Marker-delimited injection**: wrap the injected snippet in `# >>> cortex sync hook >>>` / `# <<< cortex sync hook <<<`. Future runs compare against markers, not full file content — idempotent regardless of user edits outside the block.
2. **Async background only**: `( cortex sync >/dev/null 2>&1 & ) >/dev/null 2>&1`. Never block `git commit`.
3. **Guard with `command -v cortex`**: if CLI not on PATH (e.g. after uninstall), hook is a no-op.
4. **Honor `core.hooksPath`**: resolve hooks dir via `git rev-parse --git-path hooks` (handles git worktrees + custom hook dirs).
5. **Install**: post-commit, post-merge, post-checkout — the three operations that change files on disk.
6. **Uninstall**: remove only the marker block; preserve any user-authored content in the same hook file.
7. **WSL2 fallback**: when live file watcher is disabled (WSL2 /mnt drives, slow recursive fs.watch), git hooks become the primary sync mechanism.

---

### Phase 0.13 Refinement — V8 Turboshaft WASM Zone OOM Fix (CodeGraph)

**Source-of-lesson**: codegraph/src/extraction/wasm-runtime-flags.ts:1-96

When Phase 0.13 (Multi-Language Tree-sitter Extractors) ships, tree-sitter grammar compilation crashes on Node 22/24 with `Fatal process out of memory: Zone` (V8 turboshaft WASM arena OOM). Fix:

1. Define `WASM_RUNTIME_FLAGS = ['--liftoff-only']` as a single source of truth.
2. On startup, check `process.execArgv.includes('--liftoff-only')`. If missing:
   - Set a guard env var (`CORTEX_WASM_RELAUNCHED=1`).
   - `spawnSync(process.execPath, ['--liftoff-only', ...process.execArgv.filter(...), scriptPath, ...process.argv.slice(2)], { stdio: 'inherit', env: { ...process.env, CORTEX_WASM_RELAUNCHED: '1' } })`.
   - `process.exit(result.status ?? 0)`.
3. The guard env var prevents infinite loops if re-exec fails.
4. Write a test that asserts `WASM_RUNTIME_FLAGS.every(f => process.execArgv.includes(f))` — a rename can't silently regress the fix.

---

### Phase 13 Refinement — Adaptive Output Budgeting by Project Size (CodeGraph)

**Source-of-lesson**: codegraph/src/mcp/tools.ts:55-158

Add project-size-tier controls to `build_context_pack` and context output tools. Four tiers based on indexed file count:

| Tier | Files | maxOutputChars | defaultMaxFiles | maxCharsPerFile | Meta-text |
|------|-------|----------------|-----------------|-----------------|-----------|
| Tiny | <500 | 18,000 | 5 | 3,800 | Off |
| Small | <5,000 | 13,000 | 6 | 2,500 | On |
| Medium | <15,000 | 35,000 | 12 | 7,000 | On |
| Large | ≥15,000 | 38,000 | 14 | 7,000 | On |

Meta-text (relationships map, "additional relevant files", completeness signal, budget note) is suppressed for Tiny projects where one rich call is the whole story.

**Key insight**: Smaller codebases need a tighter cap, not just fewer files. An 18k-char cap on a 100-entity project prevents dumping the entire KB on a focused query.

---

### Phase 13.5 Refinement — Field-Qualified Search Query Parser (CodeGraph)

**Source-of-lesson**: codegraph/src/search/query-parser.ts:34-147

Extend `cortex_find` to accept field qualifiers that compose with free text:

```
kind:entity path:src/mcp name:auth synthesize
```

Recognized fields: `kind:` (entity/concept/parent), `path:` (substring of sourceFile), `name:` (substring of entity name). Unknown prefixes pass through to FTS as plain text (no parse error on `TODO:` queries). Quoted values for spaces: `path:"src/some dir"`.

This directly closes flaw #34 (can't filter by file path or directory).

---

### Phase 13.5 Refinement — CamelCase/snake_case Compound Identifier Tokenizer (CodeGraph)

**Source-of-lesson**: codegraph/src/search/query-utils.ts:110-169, 271-309

Replace simple substring matching in `cortex_find` with multi-signal scoring:

1. **Compound identifier tokenizer**: `extractSearchTerms("getUserName")` yields `["getusername", "get", "user", "name"]`. Preserves full compound alongside parts — FTS can match either.
2. **Stem expansion**: `getStemVariants("caching")` yields `["cach", "cache"]`. Enables FTS prefix query `cache*` to find `CacheBuilder`. Use base terms only for path scoring (stems inflate path scores).
3. **nameMatchBonus**: exact=80, single-token=60, prefix=10+30×(queryLen/nameLen), all-terms=15, substring=10. Length-ratio scaling prevents `"Pod"→"PodGCControllerOptions"` from scoring as high as `"PodGCControllerOptions"→"PodGCControllerOptions"`.
4. **kindBonus**: function/method=10, interface/route/protocol=9, class/component=8 … parameter=0.
5. **pathRelevance**: fileName match +10, dir match +5, path match +3; test files -15 unless query contains "test"/"spec".

This directly closes flaws #18 (no fuzzy), #26 (ranks by substring not relevance).

---

### Phase 13.6 Refinement — Line Numbers in Context Pack Source Slices (CodeGraph)

**Source-of-lesson**: codegraph/src/mcp/tools.ts:162-191

Prefix every source line returned by `build_context_pack` with its 1-based line number in `cat -n` format (`<linenum>\t<code>`). This matches the convention of the native `Read` tool, so agents can cite `file:line` directly from the context pack without re-reading the file.

Add `CORTEX_CONTEXT_LINENUMS=0` env var to disable (useful for A/B token-cost measurement: line numbers add ~5-10% overhead but eliminate a round-trip re-read on precise-tracing questions).

---

### Phase 12.17 Refinement — Comprehensive isTestFile Detection (CodeGraph)

**Source-of-lesson**: codegraph/src/search/query-utils.ts:208-247

When Phase 12.17 (Test Coverage as Entity Metadata) ships, use a comprehensive multi-language `isTestFile()` function that covers:

- Python: `test_foo.py`, `foo_test.py`
- Go: `foo_test.go`
- Java/Kotlin/Swift/Scala: CamelCase suffix `FooTest.kt`, `BarSpec.scala` (capital-led, so `latest.kt` is NOT matched)
- Directory patterns: `__tests__/`, `/test/`, `/spec/`, `jvmTest/`, `commonTest/`, `androidTest/`
- Non-production dirs: `integration/`, `sample/`, `examples/`, `fixture/`, `benchmark/`, `demo/`

The function should check both mid-path (`/tests/`) and start-of-path (`tests/`) since relative paths lack a leading slash.

---

### Phase 0.11 Refinement — Agent Evaluation Framework (CodeGraph)

**Source-of-lesson**: codegraph/__tests__/evaluation/scoring.ts, test-cases.ts, corpus.json

When Phase 0.11 (Honest Benchmarks) ships, complement token-cost benchmarks with a **search quality evaluation harness**:

- **Metrics**: recall = found/expected, MRR = 1/firstRank. PASS_THRESHOLD = 0.5.
- **Corpus**: map language + repo size (Small/Medium/Large) + architectural question. Seed with real open-source repos (run `codegraph init` against each).
- **Test cases**: `EvalTestCase` with `{ id, query, api, expectedSymbols, options }`. Covers `searchNodes` (symbol lookup precision) and `findRelevantContext` (exploration quality: recall + edge density).
- **Runner**: build → index → run API calls → score → print pass/fail per case with found/missed symbols.

This produces objective signal on whether a search algorithm change actually improves recall, not just "feels better."

---

### Phase 0.15 Refinement — One-File-Per-Agent Installer Architecture (CodeGraph)

**Source-of-lesson**: codegraph/src/installer/targets/registry.ts, types.ts

When Phase 0.15 (Dual-Track Distribution) extends to more agents (Cursor, Codex, OpenCode, Hermes, Windsurf, Zed, Continue):

Define an `AgentTarget` interface:
- `id: TargetId`
- `detect(loc: Location): { installed: boolean; configPath?: string }`
- `write(loc: Location, serverPath: string): void`
- `remove(loc: Location): void`

Adding a new agent = 1 file in `targets/<id>.ts` + 1 line in `registry.ts`. All other logic (multiselect prompt, `--target=all`, `--target=auto` detection) works automatically.

`resolveTargetFlag('auto')`: runs `detect()` for all targets, returns those with `installed=true`. Falls back to `['claude']` if none detected.

---

### Phase 0.8 / 5.6 Refinement — WSL2 /mnt Drive Watch Policy (CodeGraph)

**Source-of-lesson**: codegraph/src/sync/watch-policy.ts:1-98

When implementing the file watcher (Phase 0.8/5.6), centralize the on/off decision in a `watchDisabledReason(projectRoot, probe)` function:

1. `CORTEX_NO_WATCH=1` → always off (explicit opt-out wins).
2. `CORTEX_FORCE_WATCH=1` → always on (overrides detection).
3. WSL2 + `/mnt/<single-letter>/` path → off (recursive `fs.watch` on NTFS-over-9p is pathologically slow; stalls event loop past host handshake timeouts).

Returns a human-readable reason string or `null` (watch is OK). Use a `WatchProbe` interface (`{ env, isWsl }`) so tests can override detection without touching real env vars or `/proc/version`.

**Fallback for WSL2**: when watcher is disabled, offer git hooks (Phase 0.10) as the sync mechanism.

---

## Scaffolding: `validatePathWithinRoot` for Cortex (closes flaws #51, #64)

Paste into `src/security.ts` (Phase 0.1):

```typescript
import * as path from 'path';
import { constants as fsConstants, openSync, closeSync, writeSync } from 'fs';
import { tmpdir } from 'os';

/**
 * Validate that resolvedFilePath stays within resolvedProjectRoot.
 * Call with `path.resolve()` on both args before passing.
 * Throws if the path escapes root (traversal, symlink escape, drive change).
 */
export function validatePathWithinRoot(filePath: string, projectRoot: string): void {
  const resolved = path.resolve(filePath);
  const root = path.resolve(projectRoot);
  if (!resolved.startsWith(root + path.sep) && resolved !== root) {
    throw new Error(
      `Path traversal rejected: "${filePath}" resolves outside projectRoot "${root}"`
    );
  }
}

/**
 * Write a session marker to tmpdir using O_NOFOLLOW to prevent
 * symlink substitution attacks on world-writable /tmp.
 * Falls back to writeFileSync if O_NOFOLLOW is unsupported (Windows).
 */
export function writeSessionMarkerSafe(markerPath: string, content: string): void {
  try {
    const fd = openSync(markerPath, fsConstants.O_WRONLY | fsConstants.O_CREAT | fsConstants.O_TRUNC | (fsConstants.O_NOFOLLOW ?? 0));
    writeSync(fd, content);
    closeSync(fd);
  } catch {
    // O_NOFOLLOW not available (Windows) — fall through
    import('fs').then(fs => fs.writeFileSync(markerPath, content));
  }
}
```

---

## Scaffolding: SERVER_INSTRUCTIONS pattern for Cortex (closes flaw #41)

Cortex's MCP initialize response should return a tight playbook instead of embedding workflow coaching in tool descriptions. Template:

```typescript
export const CORTEX_SERVER_INSTRUCTIONS = `# Cortex — synthesized architectural knowledge graph

Cortex stores synthesized entity pages, concepts, and relationships in \`.knowledge/\`.
Reads are sub-millisecond. Index lags git commits by one sync cycle.

## Tool selection by intent

- **"What is entity X?"** → \`read_entity\`
- **"What relates to X?"** → \`cortex_find\` → \`read_entity\`
- **"What's the blast radius of changing X?"** → \`impact_analysis\`
- **"What does the architecture look like?"** → \`read_knowledge_index\`
- **"Is my index current?"** → \`get_cortex_status\`

## Common chains

- **Onboarding**: \`read_knowledge_index\` → \`read_entity\` on entry points.
- **Before any edit**: \`before_change\` → \`impact_analysis\`.
- **After sync**: \`audit\` to confirm no stale entities.

## Limitations

- Index covers only ingested entities. New code not yet synced = not in KB.
- Cross-file resolution is heuristic; verify ambiguous callees in source.
`;
```

Move per-tool workflow coaching OUT of tool descriptions and INTO this block. Tool descriptions should describe parameters and return values only.
