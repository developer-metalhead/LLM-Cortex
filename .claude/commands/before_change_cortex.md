Before touching any source file for an **implement**, **modify**, **refactor**, or **fix** task, run the Cortex pre-flight check.

The goal: know what exists, what depends on it, and what rules apply — before writing a line of code.

1. Call the `read_knowledge_index` tool from the `project-cortex` MCP server. Treat its output as ground truth about what already exists in this codebase.
2. Identify the entity (or absence) that matches the task:
   - **Implementing something new** → search the index for similar entities. If one exists, prefer extending it over creating a parallel implementation.
   - **Modifying or fixing something** → find the entity by name or by `sourceFile`.
3. For the target entity, call `read_entity`. Read its `## Wiring` section carefully — every `[[WikiLink]]` listed there is a downstream consumer that may break if you change the entity's behavior or shape.
4. For any concept the entity implements, call `read_concept`. The concept describes the invariant the entity is supposed to uphold — violating it introduces architectural drift.
5. **Only NOW open source files.** By this point you know: what exists, what depends on it, and what rules apply.

Before writing code, state a one-paragraph plan covering: (a) which entities you will touch, (b) which dependents could be affected, (c) which invariants apply. Then proceed.

If the knowledge base is empty or the relevant entity is missing, say so explicitly and recommend running `/ingest_cortex` first.
