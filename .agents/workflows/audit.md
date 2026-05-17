---
description: Perform a deep architectural audit to find stale knowledge and blast-radius victims.
---

# Audit (Project Cortex)
// turbo

Perform a deep architectural audit of the project's knowledge base to identify drift and stale documentation.

1. Call `project-cortex:audit` tool.
2. Analyze the output:
   - These entities are "Stale" because one or more of their dependencies (via `depends_on` or `called_by` relationships) have been updated since this entity was last refined.
   - This represents the "Blast Radius" of recent changes.

3. **Auto-Healing (Blast-Radius Resolution)**:
   - For each entity marked as stale, you must proactively heal the knowledge base.
   - Call `project-cortex:read_entity` to understand its previous state.
   - Examine the recent code changes in its `sourceFile` or its dependencies.
   - Run the `/ingest` workflow specifically targeting these stale entities to update their documentation or clear the stale flag.
   - Report back to the user with a summary of the entities you healed and any invariants that were broken by the drift.
