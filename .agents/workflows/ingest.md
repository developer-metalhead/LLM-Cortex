---
description: Synthesize all recent code changes into the knowledge base.
---

# Ingest Changes (Project Cortex)
// turbo

Trigger the architectural knowledge synthesis loop for the current project.

1. Call `project-cortex:get_pending_changes` tool.
2. Follow the Librarian instructions provided in the tool output.
3. Call `project-cortex:save_synthesis` tool with the result.
