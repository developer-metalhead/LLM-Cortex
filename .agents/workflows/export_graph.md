---
description: Export the full architecture as a Mermaid dependency diagram (ARCH_GRAPH.md).
---

# Export Graph (Project Cortex)
// turbo

Export the full knowledge graph as a quality-colored Mermaid dependency diagram written to `ARCH_GRAPH.md` in the project root.

1. Call `project-cortex:export` tool with `type='graph'`.
2. This generates `ARCH_GRAPH.md` containing:
   - A `flowchart LR` Mermaid diagram of every entity and concept.
   - Nodes color-coded by quality score (green ≥ 0.8, amber ≥ 0.5, red < 0.5, grey = stale, purple = concept).
   - Edges typed by relationship kind (`depends_on`, `called_by`, `supports`, `contradicts`, `derived_from`, `parent_of`).
3. Report the output path to the user.
4. Mention that the diagram renders on GitHub and via `cortex serve` for the interactive live view.
