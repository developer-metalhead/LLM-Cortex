---
description: Perform a deep architectural audit to find stale knowledge and blast-radius victims.
---

# Audit (Project Cortex)

Perform a deep architectural audit of the project's knowledge base to identify drift and stale documentation.

1. Run the CLI command to list stale entities:
   `run_command("npx tsx src/cli/index.ts audit stale", Cwd=projectRoot)`

2. Analyze the output:
   - These entities are "Stale" because one or more of their dependencies (via `depends_on` or `called_by` relationships) have been updated since this entity was last refined.
   - This represents the "Blast Radius" of recent changes.

3. **Auto-Healing (Blast-Radius Resolution)**:
   - For each entity marked as `[STALE]`, you must proactively heal the knowledge base.
   - Read the entity using `project-cortex:read_entity` to understand its previous state.
   - Examine the recent code changes in its `sourceFile` or its dependencies.
   - Run the `/ingest` workflow specifically targeting these stale entities to update their documentation or clear the stale flag.
   - Report back to the user with a summary of the entities you healed and any invariants that were broken by the drift.
