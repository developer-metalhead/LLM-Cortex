# Explore Agent Prompt Template

Use when spawning parallel Explore agents per top-level source directory (Step 2c, projects with >500 source files). Hard cap: 5 agents per audit (see Budgets in SKILL.md).

## Agent prompt (paste with substitution)

```
Audit `<target-path>/<subdir>` for novel features. Read every source file in this directory exhaustively (do NOT sample). For each file, identify:

- Functions, classes, interfaces, types (with line numbers)
- Algorithms (named: Leiden, MinHash, Jaro-Winkler, BFS, RRF, etc.)
- Security guards (validation, sanitization, SSRF, TOCTOU, rate limits, memory caps)
- Performance optimizations (caching, lazy loading, blocking, content-addressing, worker pools)
- CLI commands, MCP tools, hooks, decorators, middleware
- Config patterns (env vars, config files, feature flags)
- Integration points (webhooks, event listeners, route handlers)
- Anti-patterns / dangerous code (eval, unbounded recursion, missing validation, deprecated markers)

Return a structured list. Every item MUST cite: file path + line number + function/class name + 1–2 sentence description. Skip items you cannot cite with a line number. Search breadth: very thorough.
```

## Orchestration rules

1. **Parallel, not sequential**: Spawn all needed agents in a single message — one `Agent` tool call per subdirectory. They run concurrently.
2. **Cap at 5**: If the target has >5 top-level source dirs, group smaller ones together.
3. **Re-spawn on shallow returns**: If an agent returns <10 features for a directory with >50 source files, re-spawn it with a more targeted prompt (cite specific file patterns to look for). It sampled rather than read.
4. **Merge into single inventory**: All agent outputs feed into Step 2.5's inventory artifacts — agents don't write to disk themselves.
5. **Trust but verify**: Step 6's spot-check applies to agent-found items too. Pick at least one spot-check item from each agent's output.
