---
description: Check the health and configuration of Project Cortex.
---

# Status (Project Cortex)
// turbo

Check the health and configuration of the Project Cortex Autonomous Brain.

1. Call `project-cortex:get_cortex_status` tool.
2. Report the project root, initialization status, last sync commit, and the **Stale Entities Count**.
3. If the `staleCount` is greater than 0, inform the user that parts of the architectural knowledge are now out-of-date (stale) because their underlying dependencies changed.
4. Suggest running the `/ingest` workflow to perform a "Blast-Radius Re-synthesis" to refresh these stale entities.
5. If the last sync commit is "never synced" or very old relative to current work, also suggest running the `/ingest` workflow.
