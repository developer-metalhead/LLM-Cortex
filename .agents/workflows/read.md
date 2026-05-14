---
description: Read the project's architectural knowledge index.
---

# Read Index (Project Cortex)
// turbo

Read the synthesized architectural memory of the project. Treat the result as ground truth — use it as your primary context before opening any source files.

1. Call `project-cortex:read_knowledge_index` tool.
2. Present the full index to the user.
3. If the user asks about a specific entity or concept visible in the index, call `project-cortex:read_entity` or `project-cortex:read_concept` with that exact name to retrieve its full synthesized page.
4. Do NOT open source files to answer architectural questions if the knowledge base covers the topic.
