---
description: Check the health and configuration of Project Cortex.
---

# Status (Project Cortex)
// turbo

Check the health and configuration of the Project Cortex Autonomous Brain.

1. Call `project-cortex:get_cortex_status` tool.
2. Report the project root, initialization status, and last sync commit.
3. If the last sync commit is "never synced" or very old relative to current work, suggest running the `/ingest` workflow to bring the knowledge base up to date.
