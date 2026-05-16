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

3. For each stale entity:
   - The user may want to review the current source code against the synthesized documentation to ensure no invariants were broken.
   - Suggest running `/ingest` to perform a multi-entity re-synthesis to clear these stale flags.
