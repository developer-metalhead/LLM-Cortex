---
name: cortex-knowledge-first
description: Use BEFORE writing new code, modifying existing code, fixing bugs, refactoring, or any task that changes the codebase. Reads project architectural knowledge from the project-cortex MCP server to find existing implementations (avoid duplication), identify downstream dependents (avoid breaking them), and check architectural invariants (avoid drift). Triggers on intent like "implement", "build", "create", "add", "fix", "refactor", "modify", "change", "update", "migrate", "rewrite", "rename", "move", or any task that involves changing or writing code.
---

# Cortex Knowledge-First Workflow

You have access to **Project Cortex** — a synthesized architectural knowledge base for this codebase, exposed via the `project-cortex` MCP server. Use it **BEFORE** opening any source file for action tasks.

## When to apply this skill

Trigger when the user asks you to:
- Implement, build, create, or add a feature, component, module, or function
- Fix a bug, debug, or repair broken behavior
- Refactor, restructure, or reorganize existing code
- Modify, change, update, migrate, rewrite, or replace existing code
- Rename, move, or delete entities that other code may depend on

Do NOT apply when:
- The user is asking purely conceptual questions (*"what is X"*, *"how does Y work"*) — answer from `read_knowledge_index` alone if needed, but skip the full workflow.
- The user is asking you to read or summarize without modifying anything.
- The task is trivially scoped (typo fix, comment edit) where architectural context isn't relevant.

## Workflow

1. Call `read_knowledge_index` from the `project-cortex` MCP server. Treat its output as **ground truth** about what already exists.
2. Find the entity that matches the task:
   - **Implementing new code** → search the index for similar entities. If one exists, prefer extending it over creating a parallel implementation.
   - **Modifying or fixing something** → find the entity by name or by `sourceFile`.
3. Call `read_entity` on the target. Read its `## Wiring` section carefully — every `[[WikiLink]]` listed there is a downstream consumer that may break if you change the entity's behavior or shape.
4. For any concept the entity Implements, call `read_concept` to learn the invariants the entity is supposed to uphold.
5. State a **one-paragraph plan** before writing code, covering:
   - (a) Which entities you will touch
   - (b) Which dependents could be affected
   - (c) Which invariants apply
6. **Only NOW open source files** and write code.

## When the knowledge base is empty or missing

If `read_knowledge_index` returns no entities (`_No entities yet._`) or the relevant entity is missing, say so explicitly and recommend the user run `/ingest` (or `cortex sync` in their terminal) before proceeding. Don't pretend to have knowledge you don't have.

## Why this matters

Skipping this workflow risks:
- **Duplicating** implementations that already exist
- **Breaking** downstream dependents you didn't know about
- **Violating** documented architectural invariants
- **Wasting tokens** re-deriving knowledge that's already synthesized

A typical `read_entity` page replaces 200–500 lines of source-file scanning — and tells you the *why*, not just the *what*.
