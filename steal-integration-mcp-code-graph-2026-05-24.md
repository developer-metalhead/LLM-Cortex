# Integration Scratch — mcp-code-graph — 2026-05-24

> Copy-paste ready content for `implementation_plan.md` and `flaws.md`.
> C1 (score 24) qualifies threshold ≥20. C2 included as top-2 for Phase 11 context.

---

## To paste into flaws.md

### Flaw #130 — `response.ok` not checked before `.json()` in fetch-based MCP tools
**Severity**: 3 (HIGH)
**Description**: Every tool handler calls `const { content } = await response.json()` without first checking `response.ok`. A 4xx (expired API key, invalid graph ID) or 5xx response from the upstream service contains a valid JSON error body — but `.content` on that body is `undefined`. The tool returns `"undefined"` as its text result, silently masking the failure. Agents receive a successful-looking MCP response with no indication that the call failed.
**Rule**: Always check `if (!response.ok) { throw new Error(\`HTTP \${response.status}: \${await response.text()}\`); }` before calling `.json()`. MCP tool handlers should propagate HTTP errors as thrown exceptions so the MCP SDK can surface them as proper error results.
**Source-of-lesson**: mcp-code-graph/src/index.ts:162, 245, 320, 390, 464, 545

### Flaw #131 — Production startup debug dumps left in released MCP server binary
**Severity**: 2 (MEDIUM)
**Description**: `console.error('MCP Code Graph starting...')` and a full `=== DEBUG INFO ===` env-var dump fire on every server startup. Since MCP servers communicate over stdio, all stderr output is visible to the MCP host. Debug noise makes it impossible to distinguish startup from real errors in production logs.
**Rule**: Never ship `console.error` debug statements in MCP server code. Use a `DEBUG=cortex` / `LOG_LEVEL=debug` guard, or structured logging that respects a verbosity flag. The MCP stdio transport contract assumes stderr is for errors only.
**Source-of-lesson**: mcp-code-graph/src/index.ts:4-8, 570-578

---

## To paste into implementation_plan.md

### Phase 4 Refinement — Runtime-conditional MCP tool schema extension (mcp-code-graph audit, score: 24)

**Source-of-lesson**: mcp-code-graph/src/utils.ts:18 — `createToolSchema<T>(baseSchema: T)`

When Cortex's tool registration grows to support multiple deployment modes (single-project, multi-lens, multi-project), extend tool schemas conditionally based on server config rather than hardcoding fixed params for all deployments:

```typescript
// src/mcp/tool-schema.ts
import { z, ZodRawShape } from 'zod';
import { CortexConfig } from '../config.js';

export function createToolSchema<T extends ZodRawShape>(
  baseSchema: T,
  config: CortexConfig
): ZodRawShape {
  let schema: ZodRawShape = { ...baseSchema };

  // If multiple lenses are configured, require the caller to name one
  if (config.lenses && config.lenses.length > 1) {
    const lensOptions = config.lenses.map(l => l.id) as [string, ...string[]];
    schema = {
      ...schema,
      lens: z
        .enum(lensOptions)
        .optional()
        .describe(`Lens to query. Available: ${lensOptions.join(', ')}. Defaults to active lens.`),
    };
  }

  // If multi-project mode is configured, require project disambiguation
  if (config.projects && config.projects.length > 1) {
    const projectIds = config.projects.map(p => p.id) as [string, ...string[]];
    schema = {
      ...schema,
      project: z
        .enum(projectIds)
        .describe(`Project to query. Available: ${projectIds.join(', ')}.`),
    };
  }

  return schema;
}
```

Pass `config` into `createToolSchema` at server startup and wrap every `server.registerTool()` call with it. Agents see only the params relevant to their deployment — a single-project install never sees a `project` param.

**Counter-case**: Cortex is currently always single-project. Conditional schemas add indirection before any multi-project mode exists — premature unless Phase 11 is actively being built.

---

### Phase 11 Refinement — IS_MULTI_REPO config flag + per-call repo disambiguation (mcp-code-graph audit, score: 18)

**Source-of-lesson**: mcp-code-graph/src/config.ts:6, src/index.ts:40-52

The simplest multi-repo config pattern: a boolean flag + string array, with per-call disambiguation via an injected required param:

```typescript
// Extend CortexConfig with multi-project fields
interface CortexConfig {
  // ... existing fields ...
  IS_MULTI_PROJECT: boolean;
  PROJECT_LIST: Array<{ id: string; root: string }>;
}

// CLI arg parsing for multi-project mode
const projectRoots = args.filter(arg => arg.startsWith('--project='));
if (projectRoots.length > 1) {
  config.IS_MULTI_PROJECT = true;
  config.PROJECT_LIST = projectRoots.map(arg => {
    const [id, root] = arg.replace('--project=', '').split(':');
    return { id, root };
  });
}

// In each tool handler, resolve the target project
function resolveProject(projectId: string | undefined, config: CortexConfig): string {
  if (!config.IS_MULTI_PROJECT) return config.PROJECT_ROOT;
  const project = config.PROJECT_LIST.find(p => p.id === projectId);
  if (!project) throw new Error(`Unknown project: "${projectId}". Available: ${config.PROJECT_LIST.map(p => p.id).join(', ')}`);
  return project.root;
}
```

**Counter-case**: mcp-code-graph's multi-repo works only because all state is in the cloud — one API call, one `repoUrl` param. Cortex's local multi-project requires loading separate `.knowledge/` dirs, separate state.json files, and LRU management (per the GitNexus pattern already noted in Phase 11). This skeleton captures the config shape, not the full local loading complexity.

---

## To update in flaws.md

(None — no E items in this audit. F items above are new flaws to ADD, not annotations on existing ones.)
