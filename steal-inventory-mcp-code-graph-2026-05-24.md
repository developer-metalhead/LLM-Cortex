# Steal Inventory — mcp-code-graph — 2026-05-24

**Mode**: Full audit
**Target**: `C:\Users\kumsatwi\Desktop\StEp\personalProject\mcp-code-graph`
**Commit**: `908180f @ main`
**Calibration**: Boilerplate/starter — 3 source files (~200 LOC), entire graph logic lives in CodeGPT cloud; MCP server is pure HTTP proxy
**Files scanned**: 3 source files + README + SECURITY.md + .env.example + .github/workflows/publish-release.yml + 10 .claude/commands/*.md
**Spot-check**: 3/3 PASS (C1, C2, F1 — verified against cited lines)
**Inventory rows**: 17
**Audit date**: 2026-05-24
**Artifact collision guard**: Gemini files exist (`-gemini` suffix). Standard filenames used — no collision.

**Bucket distribution**: A=1 | B=0 | C=3 | D=7 | E=0 | F=5 | G=1

---

## Headline Summary

| Bucket | Score | Name | Source | Gist |
|--------|-------|------|--------|------|
| C | 24 | Runtime-conditional MCP tool schema extension | utils.ts:18 | `createToolSchema()` adds graphId/repository params dynamically based on server config |
| C | 18 | IS_MULTI_REPO + REPO_LIST multi-repo config | config.ts:6, index.ts:40 | Boolean flag + string[] + dynamic schema disambiguation param per tool |
| C | 12 | Idempotent CI release guard + git-log changelog | .github/workflows/publish-release.yml:36 | Check-if-release-exists before creating; auto-changelog from git log since prior tag |
| F | — | Missing `response.ok` before `.json()` | index.ts:162, 245, 320, 390, 464, 545 | Silent 4xx/5xx failures passed as tool content string |
| F | — | Production startup debug dumps | index.ts:4-8, 570-578 | `console.error("=== DEBUG INFO ===")` left in released binary |

---

## C — Worth Stealing (Gaps)

### C1 — Runtime-conditional MCP tool schema extension (score 24)

**Source**: `src/utils.ts:18` — `createToolSchema<T>(baseSchema: T)`
**What it does**: Wraps every tool's base Zod schema with conditional extra params. When `CODEGPT_GRAPH_ID`/`CODEGPT_REPO_URL` are NOT set, appends a required `graphId` field. When `IS_MULTI_REPO` is set, appends a required `repository` disambiguation field. The caller always writes the same `createToolSchema({ ...baseParams })` call; the runtime config decides what extra fields agents must supply.
**Phase placement**: Phase 4 Refinement — MCP tool schema conditioning on server config
**Score**: severity=2, fit=4, effort=1, recency=1.0 → **24**
**Counter-case**: Cortex's config is set at server startup and stable — runtime schema mutation adds complexity with little gain if Cortex always runs single-project mode.

---

### C2 — IS_MULTI_REPO + REPO_LIST multi-repo config (score 18)

**Source**: `src/config.ts:6`, `src/index.ts:40-52`
**What it does**: A boolean `IS_MULTI_REPO` flag + `REPO_LIST: string[]` array enable one server instance to serve multiple repositories. CLI arg parsing (`args.filter(arg => arg.includes('/'))`) auto-detects multi-repo mode. Each tool call then receives a required `repository` param (from `createToolSchema`) so agents specify which repo to query.
**Phase placement**: Phase 11 Refinement — multi-repo server config and per-call disambiguation
**Score**: severity=3, fit=3, effort=2, recency=1.0 → **18**
**Counter-case**: Phase 11 is fundamentally more complex than a flag + array; this thin pattern works only because all state lives in the cloud. Local-knowledge multi-repo needs separate `.knowledge/` loading, locking, and LRU eviction.

---

### C3 — Idempotent CI release guard + git-log changelog (score 12)

**Source**: `.github/workflows/publish-release.yml:36-67`
**What it does**: Before creating a GitHub Release, checks `gh release view $TAG` and skips creation if it already exists. Changelog is generated from `git log ${PREVIOUS_TAG}..HEAD --pretty=format:"- %s (%h)" --reverse` — zero dependencies, just git.
**Phase placement**: Phase 12 Refinement — Cortex release CI
**Score**: severity=2, fit=3, effort=2, recency=1.0 → **12**
**Counter-case**: Cortex could use `release-please` or `changesets` for richer changelog (conventional commits, categorization). Manual git-log format is fragile for large commit histories.

---

## F — Anti-Patterns (Avoid)

### F1 — Missing `response.ok` check before JSON parsing
**Source**: `src/index.ts:162, 245, 320, 390, 464, 545` — all 6 tool handlers
**Pattern**: `const { content } = await response.json()` with no `response.ok` guard. A 4xx (bad graphId, expired key) or 5xx response returns valid JSON error objects from the API — but `.content` on those is `undefined`, which gets stringified as `"undefined"` and silently passed to the MCP client as the tool result. Agents see `"undefined"` with no indication of failure.
**Why target chose it**: Fast path — `fetch` doesn't throw on 4xx/5xx, so no error propagates. The pattern works until the API changes its error response shape.
**Proposed Cortex action**: Add to flaws.md: always check `if (!response.ok) throw new Error(...)` before calling `.json()` on fetch responses inside MCP tool handlers.

### F2 — Production startup debug dumps via `console.error`
**Source**: `src/index.ts:4-8, 570-578`
**Pattern**: `console.error('MCP Code Graph starting...')`, `console.error("=== DEBUG INFO ===")`, full env var dump on every startup. Since MCP uses stdio, `console.error` goes to stderr which is visible to the MCP host. Debug noise in production makes diagnosing real errors harder.
**Why target chose it**: Added during debugging, never removed before release.
**Proposed Cortex action**: CLAUDE.md rule — no `console.error` debug dumps in MCP server code; use a `DEBUG=1` env guard or structured logging.

### F3 — `.env.example` typo creates undiscoverable config key
**Source**: `.env.example:3` — `CODEGPT_GRPAH_ID=""` (should be `CODEGPT_GRAPH_ID`)
**Pattern**: The documented example config key (`GRPAH_ID`) doesn't match the actual code key (`GRAPH_ID`). Anyone copying from the example sets a variable that Cortex never reads.
**Why target chose it**: Typo introduced and not caught by tests (no tests exist).
**Proposed Cortex action**: Add to Cortex CI: `grep -r 'CORTEX_' .env.example | while read line; do key=$(echo $line | cut -d= -f1); grep -r "$key" src/ || echo "UNDOCUMENTED: $key"; done` — verify .env.example keys match actual env var reads.

### F4 — SECURITY.md template placeholder not customized
**Source**: `SECURITY.md:8` — `security@example.com`
**Pattern**: Security contact email is a generic placeholder. Researchers reporting vulns send to `example.com` which is a black hole.
**Why target chose it**: Copied SECURITY.md template, forgot to fill in actual contact.
**Proposed Cortex action**: Cortex SECURITY.md already has a real address — this is a reminder to never merge SECURITY.md templates without filling real contacts.

### F5 — CI mutates `package.json` with `sed -i` without revert
**Source**: `.github/workflows/publish-release.yml:94` — `sed -i 's/"name": "mcp-code-graph"/"name": "@judinilabs\/mcp-code-graph"/' package.json`
**Pattern**: CI modifies `package.json` in-place to change the package name for GitHub Packages, then publishes. If publish fails mid-way, the runner has an inconsistent package.json. More importantly, this mutation is invisible — next CI step sees a different package.json than what's in source control.
**Why target chose it**: npm doesn't support publishing the same package to both npm and GitHub Packages with different scoped names in one step without mutation.
**Proposed Cortex action**: Use `npm publish --workspace` or a separate `package.json` for scoped publishing. Never mutate committed files in CI without explicit `git restore` at the end.

---

## G — Open Questions

### G1 — Should Cortex's MCP tools have conditionally-extended schemas based on server config?

**Question**: Should `register_tool()` calls in Cortex accept a config-time schema extension so agents see different required parameters depending on how the server was started?
**Triggered by**: `src/utils.ts:18` — `createToolSchema()` adds `graphId` or `repository` params based on runtime config
**Target's answer**: Yes — different deployment modes (single-repo, multi-repo, graph-ID-only) present different required params; the server extends the base schema at registration time.
**Cortex's options**:
- A) Yes — add a `conditionalParams(config: CortexConfig): ZodSchema` hook to tool registration. ~30 lines. Enables "if multi-lens configured, add `lens` param to `cortex_find`."
- B) No — Cortex is always single-project; conditional schemas add complexity for a single-project deployment model.
- C) Partial — expose config-driven defaults (e.g. `lens` defaults to active lens) rather than making params required/optional based on config.

---

## A — Already in Cortex

| Feature | Cortex Phase |
|---------|-------------|
| MCP server with stdio transport + tool registration | Phase 4 ✅ |

---

## D — Niche / Wrong Fit (all 7 tools)

| Tool | Violated Cortex principle |
|------|--------------------------|
| list-graphs | No third-party API for core + local-first (calls api-mcp.codegpt.co) |
| get-code | No third-party API for core + local-first |
| find-direct-connections | No third-party API for core + local-first |
| nodes-semantic-search | No third-party API for core + local-first (cloud embeddings) |
| docs-semantic-search | No third-party API for core + local-first |
| get-usage-dependency-links | No third-party API for core + local-first |
| folder-tree-structure | No third-party API for core + local-first |

---

## Expected but Absent

| Feature | Standard for MCP/AI agent? | Cortex status |
|---------|---------------------------|--------------|
| Retry / backoff on transient API failures | Yes (any HTTP client) | Missing — potential roadmap |
| `response.ok` guard before JSON parse | Yes (any HTTP client) | Missing (see F1) |
| Tool `annotations` (readOnlyHint, idempotentHint) | Yes (MCP spec) | Phase 4 Refinement planned (codegraph audit) |
| Rate-limit handling (429 + Retry-After) | Yes (cloud API client) | Not implemented |
| Local fallback when cloud unavailable | Cortex-specific | Domain mismatch — entire tool IS the cloud |

---

## Themes

**Architecture**: Thin proxy. No local logic. Entire value proposition is cloud-delegated. Clean separation: config.ts (state), utils.ts (schema helpers), index.ts (registration). Each tool is ~30 lines of boilerplate.
**Security**: API key in every request header. No input sanitization before passing `name`/`path` to cloud API — injection risk is the cloud provider's problem, but trust is implicit.
**Error handling**: Uniformly absent — all `catch` blocks stringify and return errors as tool content. Agents cannot distinguish success from failure by MCP result structure alone.
**DX**: The `.claude/commands/` directory is genuinely useful — 10 ready-to-use workflow commands (architecture analysis, security audit, onboarding, migration planning) showing how to chain tools for complex analyses. Cortex should have equivalents.
**Testing**: Zero test files. No type coverage beyond TypeScript compilation.
**CI/CD**: Decent release pipeline with idempotency guard and auto-changelog. The `sed -i` mutation is the one flaw.

---

## Surprises

- **`createToolSchema()` is the entire abstraction layer** — a generic HOF that does runtime schema extension. No class, no factory, no plugin system — just one function. Elegant for a 3-file project.
- **`.claude/commands/` ships with the repo** — the repo is designed to be copied into a target project's `.claude/` dir. This is MCP-server-as-developer-tool, not just MCP-server-as-library. The commands directory is the real product.
- **Public graph access with no auth** — `repoUrls.length >= 1` with no `apiKey` is a valid config. DeepGraph public graphs require zero credentials. This is a deliberate zero-friction onboarding path.

---

## Audit Limitations

- `debug-mcp.js` (root) not read — appears to be a local debugging helper, not production code.
- `npm-contributing-docs.md` and `test-coverage-analyzer.md` commands not read — sampled 8 of 10 commands; the two unread follow the same pattern as those read.
- No tests exist so `has_tests` is uniformly false across all items.
