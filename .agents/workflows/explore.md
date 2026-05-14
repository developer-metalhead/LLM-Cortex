---
description: Navigate the knowledge graph to answer deep architectural questions.
---

# Explore Knowledge (Project Cortex)
// turbo

Navigate the project's synthesized architectural knowledge graph to answer questions in depth. Use this when a high-level index read isn't enough — follow wiki-links to drill into specific components.

1. Call `project-cortex:read_knowledge_index` to get the full architectural map.
2. Identify which entities or concepts are relevant to the question.
3. For each relevant name, call `project-cortex:read_entity` or `project-cortex:read_concept` to retrieve its full synthesized page.
4. Follow outbound links transitively when the answer requires understanding how components connect.
5. Answer from the synthesized knowledge. Only open source files if the knowledge base is explicitly silent or stale on the topic.
