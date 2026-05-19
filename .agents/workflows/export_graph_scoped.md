---
description: Export a focused subgraph around one entity to ARCH_GRAPH_<entity>.md.
---

# Export Scoped Graph (Project Cortex)
// turbo

Export a focused architectural subgraph centered on a single entity — useful for sharing just the payment, booking, auth, or any other slice with teammates.

1. Call `project-cortex:read_knowledge_index` to list available entities.
2. Ask the user: **"Which entity should I scope the graph export to?"** (show 3–5 example entity names from the index).
3. Once the user replies, call `project-cortex:export` with `type='graph'` and `scope=<entity>`. Optionally pass `depth` if the user specified a hop count (default is 2).
4. This generates `ARCH_GRAPH_<entity>.md` in the project root containing only the nodes reachable within `depth` hops of the chosen entity (bidirectional BFS).
5. Report the output path and node/edge count to the user.
