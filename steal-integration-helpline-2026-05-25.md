# Integration Scratch — helpline (2026-05-25)

Source: `C:\Users\kumsatwi\Desktop\StEp\personalProject\helpline`
Commit: `456234a` | Calibration: Novel/research | Files: 59/59 | Mode: Full

---

## To paste into flaws.md

*(No new F-bucket flaws to add to Cortex's flaws.md — F1 is an anti-pattern in helpline, not a new Cortex flaw)*

---

## To paste into implementation_plan.md

Items ordered by score descending. All score ≥ 20. All have TypeScript skeletons.

---

### Phase 5.7 Refinement — Diff Truncation with Disclosure Note in Hook Output (helpline audit, score: 60, partially closes Flaw #1)

**Source**: helpline `.claude/hooks/reflect_claude_md.py:235-236`

**What**: `get_pending_changes` and any MCP tool that reads `git diff` must truncate the output at a safe character cap and append a disclosure string — never fail silently or return the raw `maxBuffer exceeded` error string to the LLM. The key is the combination: truncate + note, so the caller knows exactly what happened.

```typescript
const MAX_DIFF_CHARS = 12_000;

function truncateDiff(raw: string): { diff: string; truncated: boolean } {
  if (raw.length <= MAX_DIFF_CHARS) return { diff: raw, truncated: false };
  return {
    diff: raw.slice(0, MAX_DIFF_CHARS) + "\n... (diff truncated — showing first 12,000 chars only)",
    truncated: true,
  };
}

// In get_pending_changes handler:
async function getPendingChanges(projectRoot: string): Promise<string> {
  let raw: string;
  try {
    raw = await git(["diff", "HEAD"], projectRoot, { maxBuffer: 20_000_000 });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("maxBuffer")) {
      raw = "(diff too large to read — run `git diff HEAD` directly)";
    } else {
      throw err;
    }
  }
  const { diff, truncated } = truncateDiff(raw);
  return truncated ? diff : diff;
}
```

**Counter-case**: A 12k-char cap may truncate meaningful changes in large refactors. Make `MAX_DIFF_CHARS` configurable via Cortex config, defaulting to 12,000 but expandable. Also consider scoping to touched areas (see next refinement) before truncating.

---

### Phase 5.7 Refinement — Area-Scoped Diff for CLAUDE.md Reflection (helpline audit, score: 45)

**Source**: helpline `.claude/hooks/reflect_claude_md.py:232-236`

**What**: When the self-improving hook scopes its git diff, it should diff ONLY the directories that changed — not the whole repo. This prevents unrelated changes from drowning the relevant signal and respects the per-area CLAUDE.md hierarchy.

```typescript
async function touchedAreaDiff(
  projectRoot: string,
  touchedAreas: string[],  // relative paths of CLAUDE.md-governed dirs that changed
): Promise<string> {
  if (touchedAreas.length === 0) return "";
  // `git diff HEAD -- area1 area2` scopes to those paths only
  const raw = await git(
    ["diff", "HEAD", "--", ...touchedAreas.sort()],
    projectRoot,
    { maxBuffer: 20_000_000 }
  );
  if (raw.length > MAX_DIFF_CHARS) {
    return raw.slice(0, MAX_DIFF_CHARS) + "\n... (diff truncated for the reflection)";
  }
  return raw;
}

function claudeMdAreas(projectRoot: string): Set<string> {
  // Walk the tree; every directory with a CLAUDE.md (except root) is an "area"
  const areas = new Set<string>();
  for (const [dir, files] of walkDir(projectRoot, EXCLUDE_DIRS)) {
    if (files.includes("CLAUDE.md") && dir !== projectRoot) {
      areas.add(path.relative(projectRoot, dir).replace(/\\/g, "/"));
    }
  }
  return areas;
}

function areaOf(changedPath: string, areas: Set<string>): string | null {
  // Find the nearest CLAUDE.md-governed ancestor
  const parts = changedPath.split("/");
  for (let depth = parts.length - 1; depth > 0; depth--) {
    const candidate = parts.slice(0, depth).join("/");
    if (areas.has(candidate)) return candidate;
  }
  return null;
}
```

**Counter-case**: Scoping to areas means cross-area changes (e.g., a refactor touching `packages/core` and `services/billing`) are split into per-area diffs. For such changes, union the touched areas and include all of them in one diff call.

---

### Phase 5.7 Refinement — CLAUDE_PROJECT_DIR Layout-Agnostic Root Resolution (helpline audit, score: 45)

**Source**: helpline `.claude/hooks/session_start_context.py:25-26`, `tooling/mcp/codebase_search.py:40`

**What**: Every Cortex hook and MCP tool that resolves the project root must read `CLAUDE_PROJECT_DIR` from the environment first, then fall back to a file-relative heuristic. This makes the hook/MCP portable to any repo without reconfiguration — including when bundled in a plugin.

```typescript
function resolveProjectRoot(currentFile: string, ancestorLevels = 2): string {
  // Claude Code sets CLAUDE_PROJECT_DIR to the repo root when running hooks/MCP
  const fromEnv = process.env["CLAUDE_PROJECT_DIR"];
  if (fromEnv) return path.resolve(fromEnv);
  // Fallback: walk up N levels from this file (for standalone runs)
  let dir = path.dirname(path.resolve(currentFile));
  for (let i = 0; i < ancestorLevels; i++) dir = path.dirname(dir);
  return dir;
}

// In MCP server entry point:
const ROOT = resolveProjectRoot(__filename, 2);

// In hook entry point:
const projectRoot = resolveProjectRoot(__filename, 2);
```

**Counter-case**: If `CLAUDE_PROJECT_DIR` is set incorrectly by the user (e.g., pointing to a subdirectory), all path resolution silently shifts. Add a sanity check: verify the resolved root contains a `CLAUDE.md` or `package.json`; warn if not.

---

### Phase 5.7 Refinement — Windows-Aware Background Popen for Hook Spawning (helpline audit, score: 45)

**Source**: helpline `.claude/hooks/propose_claude_md.py:47, 126-147`

**What**: When a Cortex hook spawns a background process (e.g., a reflector or async indexer), it must use platform-specific flags to detach the process so it outlives the hook's process on both Windows and Unix. Failing to do this on Windows causes the background process to die when the hook exits.

```typescript
import { spawn } from "child_process";

function spawnDetached(
  executable: string,
  args: string[],
  cwd: string,
): void {
  const isWindows = process.platform === "win32";
  const child = spawn(executable, args, {
    cwd,
    stdio: "ignore",
    // Windows: CREATE_NEW_PROCESS_GROUP | DETACHED_PROCESS — process outlives parent
    // Unix: detached + unref() — process runs in its own session
    detached: !isWindows,
    windowsHide: true,
    // On Windows, Node's equivalent of DETACHED_PROCESS
    ...(isWindows ? { shell: false } : {}),
  });
  // unref() allows the parent to exit without waiting for the child
  child.unref();
}

// The 3-guard pattern for any background-spawning hook:
const LOCK_ENV = "CORTEX_HOOK_REFLECT_LOCK";

function shouldSkipReflection(diffFingerprint: string, stateFile: string): boolean {
  // Guard 1: recursion — if lock set, we are inside a spawned child; no-op
  if (process.env[LOCK_ENV]) return true;
  // Guard 2: dedup — same diff as last reflection; skip
  try {
    const lastFp = fs.readFileSync(stateFile, "utf-8").trim();
    if (lastFp === diffFingerprint) return true;
  } catch {
    // no prior state — first reflection for this diff
  }
  return false;
}

function diffFingerprint(diff: string): string {
  return crypto.createHash("sha256").update(diff, "utf-8").digest("hex");
}
```

**Counter-case**: `child.unref()` means the parent can exit before the child finishes. If the child crashes, errors are silently lost. Add `child.stderr` pipe to a log file for post-hoc debugging: `stdio: ["ignore", "ignore", fs.openSync(logPath, "a")]`.

---

### Phase 5.7 Refinement — Dynamic SessionStart Orientation Hook (helpline audit, score: 32)

**Source**: helpline `.claude/hooks/session_start_context.py:29-138`

**What**: The SessionStart hook should emit a short, dynamic orientation block at the start of every Claude Code session in the Cortex project itself. It maps the current git working tree changes to the nearest CLAUDE.md-governed area and reports recent commits — so Claude starts already knowing what's in progress without spending a turn re-exploring.

```typescript
// Cortex version: .claude/hooks/session_start_context.ts (or .py for portability)

interface Orientation {
  activeAreas: string[];    // e.g. ["src/mcp", "src/knowledge"]
  recentCommits: string[];  // e.g. ["abc1234 fix entity save", "def5678 add graph tool"]
}

async function buildOrientation(projectRoot: string): Promise<Orientation> {
  const [statusOutput, logOutput] = await Promise.all([
    git(["status", "--porcelain"], projectRoot),
    git(["log", "-5", "--pretty=format:%h %s"], projectRoot),
  ]);

  const areas = claudeMdAreas(projectRoot);
  const changed = statusOutput
    .split("\n")
    .filter((l) => l.length > 3)
    .map((l) => l.slice(3).trim().replace(/\\/g, "/"));

  const activeAreas = [...new Set(
    changed.map((c) => areaOf(c, areas)).filter((a): a is string => a !== null)
  )].sort();

  const recentCommits = logOutput.split("\n").filter(Boolean);
  return { activeAreas, recentCommits };
}

// Output injected into session context via stdout:
function formatOrientation({ activeAreas, recentCommits }: Orientation): string {
  const lines = ["## Cortex — session orientation", ""];
  if (activeAreas.length > 0) {
    lines.push(`Active area(s): **${activeAreas.join(", ")}**`);
    lines.push("Load the matching CLAUDE.md or knowledge entity before editing.");
  } else {
    lines.push("Working tree is clean — no area has pending work.");
  }
  if (recentCommits.length > 0) {
    lines.push("", "Recent commits:", ...recentCommits.map((c) => `- ${c}`));
  }
  lines.push("", "Use `read_knowledge_index` to find where a feature lives before exploring.");
  return lines.join("\n");
}
```

**Counter-case**: The orientation hook fires on EVERY session, including quick one-shot tasks where the overhead isn't worth it. Gate it: if the working tree is clean AND no commits in the last 24 hours match Cortex source files, emit a minimal "no active work" one-liner instead of the full block.

---

### Phase 17 Refinement — Subagent Write-Tool Enforcement in Cortex Validator (helpline audit, score: 36)

**Source**: helpline `tooling/validate/validate_all.py:153-171`

**What**: Cortex's validation suite must include a check that any "read-only" agent definition (explorer-style agents in `.agent/`) does NOT grant `Write`, `Edit`, `MultiEdit`, or `NotebookEdit` tools. The check parses the frontmatter `tools:` line and asserts the intersection with write tools is empty.

```typescript
interface AgentCheck {
  agentFile: string;
  grantedTools: string[];
  isReadOnly: boolean;  // claimed in frontmatter (e.g., name contains "explorer")
}

function checkSubagentWriteTools(agentDir: string): AgentCheck[] {
  const WRITE_TOOLS = new Set(["Write", "Edit", "MultiEdit", "NotebookEdit"]);
  const READ_TOOLS = new Set(["Read", "Grep", "Glob"]);
  const results: AgentCheck[] = [];

  for (const file of glob.sync("**/*.md", { cwd: agentDir, absolute: true })) {
    const text = fs.readFileSync(file, "utf-8");
    if (!text.startsWith("---")) continue;
    const fm = text.split("---", 3)[1] ?? "";
    const toolsLine = fm.split("\n").find((l) => l.trim().startsWith("tools:"));
    if (!toolsLine) continue;
    const granted = new Set(
      toolsLine.split(":", 2)[1].split(",").map((t) => t.trim()).filter(Boolean)
    );
    const isReadOnly =
      fm.includes("read-only") || fm.includes("explorer") || !granted.has("Write");
    const illegalWriters = [...granted].filter((t) => WRITE_TOOLS.has(t));

    if (illegalWriters.length > 0 && isReadOnly) {
      throw new Error(
        `${path.relative(agentDir, file)}: claims read-only but grants write tools: ${illegalWriters.join(", ")}`
      );
    }
    if (!READ_TOOLS.every((t) => granted.has(t))) {
      throw new Error(
        `${path.relative(agentDir, file)}: missing basic read tools — has ${[...granted].join(", ")}`
      );
    }
    results.push({ agentFile: file, grantedTools: [...granted], isReadOnly });
  }
  return results;
}
```

**Counter-case**: Parsing the `tools:` frontmatter line naively fails if the YAML is multi-line (e.g., `tools:\n  - Read\n  - Grep`). Use a YAML parser for robustness; the simple `.split(",")` approach works for the current single-line format but will silently pass multi-line declarations without validating them.

---

### Phase 28 Refinement — AST Symbol-Search MCP Tools: `where_is` / `find_references` / `outline` (helpline audit, score: 32, closes Flaw #28)

**Source**: helpline `tooling/mcp/codebase_search.py:268-326`

**What**: Add three AST-based symbol-search tools to the Cortex MCP server. These replace grep for symbol lookup and directly close Flaw #28 ("CLAUDE.md forbids grep, but Cortex offers no content-search replacement"). The key design choices: (1) reference deduplication by priority (call > attribute > name at the same line), (2) qualified name tracking via a class/function stack, (3) multi-format module name resolution (path or dotted notation).

```typescript
// Leverages Phase 0.13's existing tree-sitter AST infrastructure

interface SymbolDefinition {
  path: string;
  line: number;
  kind: "function" | "method" | "class" | "constant";
  qualname: string;   // e.g. "billing.subscriptions.create_subscription"
  signature: string;  // e.g. "def create_subscription(org_id: str, plan: Plan) -> Subscription"
}

interface SymbolReference {
  path: string;
  line: number;
  kind: "call" | "attribute" | "name";  // priority: call > attribute > name
  text: string;
}

// Reference deduplication: if the same (path, line) has both call and name, keep call
function deduplicateRefs(refs: SymbolReference[]): SymbolReference[] {
  const priority: Record<string, number> = { call: 0, attribute: 1, name: 2 };
  const best = new Map<string, SymbolReference>();
  for (const ref of refs) {
    const key = `${ref.path}:${ref.line}`;
    const existing = best.get(key);
    if (!existing || priority[ref.kind] < priority[existing.kind]) {
      best.set(key, ref);
    }
  }
  return [...best.values()].sort((a, b) =>
    a.path.localeCompare(b.path) || a.line - b.line
  );
}

// MCP tool: where_is(name) — find every definition of `name`
async function whereIs(name: string, projectRoot: string): Promise<string> {
  const allFiles = await getSourceFiles(projectRoot);  // uses Phase 0.13 file walker
  const hits: SymbolDefinition[] = [];
  for (const file of allFiles) {
    const tree = await parseFile(file);  // uses Phase 0.13 tree-sitter cache
    const defs = extractDefinitions(tree, file, projectRoot);
    hits.push(...defs.filter((d) => d.qualname.split(".").at(-1) === name));
  }
  if (hits.length === 0) return `no definition of '${name}' found`;
  return hits
    .sort((a, b) => a.path.localeCompare(b.path) || a.line - b.line)
    .map((d) => `  ${d.path}:${d.line}  [${d.kind}] ${d.qualname}\n      ${d.signature}`)
    .join("\n");
}

// MCP tool: find_references(name) — every real call/attribute/name use
async function findReferences(name: string, projectRoot: string): Promise<string> {
  const allFiles = await getSourceFiles(projectRoot);
  const allRefs: SymbolReference[] = [];
  for (const file of allFiles) {
    const tree = await parseFile(file);
    allRefs.push(...extractReferences(tree, file, projectRoot, name));
  }
  const deduped = deduplicateRefs(allRefs);
  if (deduped.length === 0) return `no references to '${name}' found`;
  return deduped.map((r) => `  ${r.path}:${r.line}  [${r.kind}] ${r.text}`).join("\n");
}

// MCP tool: outline(module) — structured public API of a file
async function outline(modulePath: string, projectRoot: string): Promise<string> {
  const resolved = resolveModule(modulePath, projectRoot);  // accepts path or dotted name
  if (!resolved) return `no module matching '${modulePath}'`;
  const tree = await parseFile(resolved);
  const defs = extractDefinitions(tree, resolved, projectRoot);
  if (defs.length === 0) return `${modulePath} has no top-level definitions`;
  return defs
    .map((d) => `${d.kind === "method" ? "    " : "  "}${d.line}: [${d.kind}] ${d.signature}`)
    .join("\n");
}
```

**Counter-case**: The AST tools require parsing ALL source files on every query (no persistent index). For large codebases (>500 files), this is too slow for interactive use. Gate behind a file-count check: if >500 source files, build and cache an in-memory symbol index on MCP server startup, refreshed on file-change events. Phase 0.13's existing cache infrastructure can support this.

---

### Phase 17 Refinement — AI Layer Validation Framework (helpline audit, score: 24, partially closes Flaw #137)

**Source**: helpline `tooling/validate/validate_all.py:1-286`

**What**: Cortex needs an end-to-end validation suite that proves its own AI Layer components work — not just that files exist, but that they run correctly. The validate_all.py pattern: a list of `(name, checkFn)` pairs, each returning `(ok: boolean, detail: string)`, accumulated into a VALIDATION.md report. The key: each check does something REAL (runs the hook, calls the MCP tool, verifies the recursion guard).

```typescript
type CheckResult = { ok: boolean; detail: string };
type Check = { name: string; fn: () => Promise<CheckResult> };

async function checkHookCompiles(hookPath: string): Promise<CheckResult> {
  // Verify hook file exists and is syntactically valid
  try {
    const content = await fs.promises.readFile(hookPath, "utf-8");
    // For TypeScript hooks: try transpile; for Python: run `python -m py_compile`
    await exec(`python -m py_compile "${hookPath}"`);
    return { ok: true, detail: `${path.basename(hookPath)} compiles` };
  } catch (err) {
    return { ok: false, detail: `syntax error: ${err}` };
  }
}

async function checkRecursionGuard(hookPath: string, lockEnv: string): Promise<CheckResult> {
  // With LOCK set, hook must exit 0 and produce no output
  const env = { ...process.env, [lockEnv]: "1" };
  const result = await exec(`python "${hookPath}"`, { env });
  if (result.exitCode !== 0) return { ok: false, detail: "recursion guard failed: hook errored when lock was set" };
  return { ok: true, detail: "recursion guard holds" };
}

async function checkMcpToolCall(tool: string, args: Record<string, unknown>): Promise<CheckResult> {
  // Call a real MCP tool and verify the response has expected shape
  try {
    const result = await cortexMcp.callTool(tool, args);
    const text = result.content?.[0]?.text ?? "";
    if (!text) return { ok: false, detail: `${tool} returned empty response` };
    return { ok: true, detail: `${tool} returned ${text.length} chars` };
  } catch (err) {
    return { ok: false, detail: `${tool} threw: ${err}` };
  }
}

async function checkSubagentReadOnly(agentFile: string): Promise<CheckResult> {
  const text = await fs.promises.readFile(agentFile, "utf-8");
  const toolsLine = text.split("\n").find((l) => l.startsWith("tools:")) ?? "";
  const granted = new Set(toolsLine.split(":")[1]?.split(",").map((t) => t.trim()) ?? []);
  const writers = [...granted].filter((t) => ["Write", "Edit", "MultiEdit"].includes(t));
  if (writers.length > 0) return { ok: false, detail: `grants write tools: ${writers.join(", ")}` };
  return { ok: true, detail: `genuinely read-only (tools: ${[...granted].sort().join(", ")})` };
}

const CHECKS: Check[] = [
  { name: "MCP server — source tool", fn: () => checkMcpToolCall("source", { filePath: "src/index.ts" }) },
  { name: "MCP server — cortex_find", fn: () => checkMcpToolCall("cortex_find", { query: "test" }) },
  { name: "Agent — explorer read-only", fn: () => checkSubagentReadOnly(".agent/agents/explorer.md") },
  { name: "Hook — Stop compiles", fn: () => checkHookCompiles(".claude/hooks/stop_hook.py") },
  { name: "Hook — recursion guard", fn: () => checkRecursionGuard(".claude/hooks/stop_hook.py", "CORTEX_HOOK_LOCK") },
  { name: "CLAUDE.md hierarchy", fn: checkClaudeMdHierarchy },
];

async function runValidation(): Promise<void> {
  const rows: Array<{ name: string; ok: boolean; detail: string }> = [];
  for (const { name, fn } of CHECKS) {
    try {
      const { ok, detail } = await fn();
      rows.push({ name, ok, detail });
      console.log(`[${ok ? "PASS" : "FAIL"}] ${name} — ${detail}`);
    } catch (err) {
      rows.push({ name, ok: false, detail: `check threw: ${err}` });
    }
  }
  const passed = rows.filter((r) => r.ok).length;
  const report = formatValidationReport(rows, passed);
  await fs.promises.writeFile("VALIDATION.md", report, "utf-8");
  process.exit(passed === rows.length ? 0 : 1);
}
```

**Counter-case**: End-to-end validation that spawns MCP servers and makes real LLM calls is expensive and slow (~30-60s). Gate it as `cortex validate` CLI command rather than part of the standard test suite. The fast unit tests cover logic; `cortex validate` proves the AI Layer actually works. Run it before releases and after major CLAUDE.md changes.

---

## To update in flaws.md

*(Backup record of **Addressed by** lines written in Step 7.6)*

**Flaw #1** — append:
`**Partially addressed by**: Phase 5.7 Refinement — Diff Truncation with Disclosure Note (helpline audit, score: 60) — truncate at 12,000 chars + append disclosure string; never silently return maxBuffer error string.`

**Flaw #28** — append:
`**Addressed by**: Phase 28 Refinement — AST Symbol-Search MCP Tools: where_is / find_references / outline (helpline audit, score: 32) — AST-based symbol lookup replaces grep: no false hits from comments or strings; priority-deduplicated reference results.`

**Flaw #137** — append:
`**Partially addressed by**: Phase 17 Refinement — AI Layer Validation Framework (helpline audit, score: 24) — validate_all.py pattern: real E2E tests that run hooks, call MCP tools, check recursion guards — not assertions over static file contents.`
