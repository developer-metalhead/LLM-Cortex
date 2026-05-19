# AGENTS.md

> Auto-loaded by Antigravity (v1.20.3+), Claude Code, Cursor, Cline, and other agentic AI tools at session start. This file describes how AI agents should operate in this project.

## Project Cortex — Architectural Memory

This project uses [Project Cortex](https://www.npmjs.com/package/projectcortex) — a synthesized architectural knowledge base exposed via the `project-cortex` MCP server. The knowledge base lives in `.knowledge/` and contains:

- Per-entity pages with `## Role` / `## Interface` / `## Behavior` / `## Wiring` sections
- Per-concept pages for cross-cutting architectural patterns
- A rich index linking everything via `[[WikiLinks]]`

### MANDATORY: Use Cortex before any code-change task

For any task that **changes code** — implement, fix, refactor, modify, add, build, create, update, migrate, rewrite, rename, move, delete — you MUST:

1. Call `read_knowledge_index` from the `project-cortex` MCP server first.
2. Find the relevant entity from the index.
3. Call `read_entity` to audit its `## Wiring` section — every `[[WikiLink]]` is a downstream consumer that may break.
4. For any concept the entity Implements, call `read_concept` for invariants.
5. State a one-paragraph plan: which entities you'll touch, which dependents could be affected, which invariants apply.
6. ONLY THEN open source files.

Skipping this risks: duplicating existing implementations, breaking dependents you didn't know about, violating documented invariants.

### When NOT to use Cortex

- Pure conceptual questions (*what is X*, *how does Y work*) — `read_knowledge_index` alone is usually sufficient; skip the deep entity reads.
- Trivial single-line fixes (typos, comments) where architectural context isn't relevant.

### When the knowledge base is empty

If `read_knowledge_index` returns no entities, recommend running `/ingest` (or `cortex sync`) before proceeding with the action task.

### MANDATORY: Always Output Brevity Statistics
If brevity mode is active (the tool response contains a `📉 Cortex Brevity Stats` section), you MUST always preserve, copy, and append this exact statistics block at the very bottom of your final response to the user so they can track their token savings. Do not hide, truncate, or prune it.

---

<!-- Add your own project-specific agent instructions below. Cortex will not overwrite this file once it exists. -->
