---
description: Synthesize all recent code changes into the knowledge base.
---

# Ingest Changes (Project Cortex)
// turbo

Trigger the architectural knowledge synthesis loop for the current project.

1. Call `project-cortex:get_pending_changes` tool.
   - If it returns "No pending changes since last sync", tell the user and stop.

2. The tool returns a JSON object with `mode`, `systemPrompt`, `userPrompt`, `outputSchema`, and `instructions`.

3. **Check the `mode` field** — the tool decided which path to take:
   - **`mode: "bootstrap"`**: the knowledge base is empty. The `userPrompt` contains a curated list of source files and explicitly excludes the git diff. Use your filesystem tools to read the listed files and synthesize the **user's application** architecture. Ignore any recent commits that just installed Project Cortex tooling. Emit every documented file as `action: create`. Skip step 4 below.
   - **`mode: "incremental"`**: the knowledge base has existing entries. The `userPrompt` includes a git diff and the existing knowledge index as `CURRENT CONTEXT`. Proceed normally.

4. (Incremental only) The `userPrompt` contains the **full existing knowledge index** — descriptions, source paths, and links for every entity/concept. Read it carefully before deciding what to emit:
   - If a name already exists in the index, emit `action: update` — do not invent a new name.
   - If the diff contradicts an existing description, emit a `warnings` entry naming both the old expectation and the new contradicting file.

5. Follow the `systemPrompt`. Produce a synthesis object matching `outputSchema`:
   - `summary`: 1-2 sentence high-level summary
   - `entities`: array with name, action (create/update/delete), description, links, and **sourceFile** (repo-relative path, e.g. `src/auth/middleware.ts`)
   - `concepts`: array of abstract architectural patterns introduced or updated
   - `warnings`: array of contradictions or architectural drift detected

6. Call `project-cortex:save_synthesis` with the synthesis object.

7. Report back: how many entities and concepts were saved, and the summary. **Proactively output the exact details of the 'Detective Work' and 'Failed Approaches' you recorded. Do not just say 'it was recorded'; explicitly write out the specific reasons why the old approach failed so the user can review your architectural reasoning.**
