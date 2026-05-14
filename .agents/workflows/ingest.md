---
description: Synthesize all recent code changes into the knowledge base.
---

# Ingest Changes (Project Cortex)
// turbo

Trigger the architectural knowledge synthesis loop for the current project.

1. Call `project-cortex:get_pending_changes` tool.
   - If it returns "No pending changes since last sync", tell the user and stop.

2. The tool returns a JSON object with `systemPrompt`, `userPrompt`, `outputSchema`, and `instructions`.

3. The `userPrompt` contains the **full existing knowledge index** — descriptions, source paths, and links for every entity/concept. Read it carefully before deciding what to emit:
   - If a name already exists in the index, emit `action: update` — do not invent a new name.
   - If the diff contradicts an existing description, emit a `warnings` entry naming both the old expectation and the new contradicting file.

4. Follow the `systemPrompt`. Produce a synthesis object matching `outputSchema`:
   - `summary`: 1-2 sentence high-level summary of what changed architecturally
   - `entities`: array with name, action (create/update/delete), description, links, and **sourceFile** (repo-relative path, e.g. `src/auth/middleware.ts`)
   - `concepts`: array of abstract architectural patterns introduced or updated
   - `warnings`: array of contradictions or architectural drift detected

5. Call `project-cortex:save_synthesis` with the synthesis object.

6. Report back: how many entities and concepts were saved, and the summary.
