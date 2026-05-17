---
description: Knowledge-first pre-flight check before implementing, modifying, or fixing code.
---

# Before Change (Project Cortex)
// turbo

Run this before touching any source file when the task is to **implement**, **modify**, **refactor**, or **fix**. The goal: know what exists, what depends on it, and what rules apply — before you write a line.

1. Call `project-cortex:read_knowledge_index`. Treat its output as ground truth about what already exists in this codebase.
2. Identify the entity (or absence) that matches the task:
   - **Implementing something new** → search the index for similar entities. If one exists, prefer extending it over creating a parallel implementation.
   - **Modifying or fixing something** → find the entity by name or by `sourceFile`.
3. For the target entity, call `project-cortex:read_entity`. Read its `## Wiring` section carefully — every `[[WikiLink]]` listed there is a downstream consumer that may break if you change the entity's behavior or shape.
4. For any concept the entity Implements, call `project-cortex:read_concept`. The concept describes the invariant the entity is supposed to uphold — violate it and you introduce architectural drift.
5. **Only NOW open source files.** By this point you know: what exists, what depends on it, and what rules apply.

Before writing any code, you MUST output a chat message to the user that starts exactly with "Pre-Flight Check:". In this message, explicitly state:
- (a) Which entities you will touch
- (b) Which dependents could be affected based on the `Wiring` section
- (c) Which invariants you must respect based on the `Concepts` section

If the knowledge base is empty or the relevant entity is missing, say so explicitly and recommend running `/ingest` first.
