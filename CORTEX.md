# Cortex Schema (Layer 3)

This is the behavioral schema for the Project Cortex Engine — both the daemon (API-keys route) and any IDE agent ingesting via MCP must conform to it. It defines exactly how the Librarian should extract, link, and maintain the knowledge base.

## 1. Purpose of the Knowledge Base
The primary goal of the `.knowledge/` directory is to maintain an **up-to-date architectural mental model** of the software. It must focus on *why* and *how* components connect, not on repeating the *what* that already lives in the source code.

## 2. Directory Conventions
* **Raw Sources**: The source of truth is the actual codebase (`src/`, `lib/`, `api/`, etc.). These are strictly read-only for Cortex.
* **Knowledge Output**: All generated knowledge must be written to `.knowledge/`.
* **Secrets**: Optional global defaults live in `~/.cortexrc` (`KEY=value`, same as `.env`). Project-local `.env` overrides those values when both are present.
  * `.knowledge/index.md` — **Rich master index.** Lists every entity and concept with its full description, links, and source citation. Regenerated from `state.json` on every sync. This is what downstream AIs read first and what the Librarian sees as `CURRENT CONTEXT` during ingest.
  * `.knowledge/state.json` — **Canonical state.** Holds `{ entities: { name → { description, links, sourceFile, lastRefined } }, concepts: { name → { description, lastRefined } } }`. The `index.md` is rendered from this; the per-entity/concept markdown pages are mirrors of the same data. If `state.json` is missing on startup, it is migrated from the existing markdown pages.
  * `.knowledge/log.md` — Chronological append-only history. Each entry carries summary + impacted entities + warnings.
  * `.knowledge/entities/` — Per-entity pages, 1:1 with files/classes/modules. Each page is the "deep read" target of `read_entity(name)`.
  * `.knowledge/concepts/` — Per-concept pages for abstract systems spanning multiple files. Each page is the "deep read" target of `read_concept(name)`.
  * `.knowledge/.last_sync_commit` — Internal bookkeeping. The git SHA at the time of the last successful sync; used by the MCP server to compute the diff for the next sync. **Never written or referenced by the Librarian.**

> Earlier drafts of this schema described a separate `warnings.md`. Warnings are now embedded inline in each `log.md` entry (and surfaced by the MCP `save_synthesis` flow), keeping the contradiction history aligned with the change that introduced it.

## 3. The Ingest Workflow
When a file is saved (daemon) or `/ingest_cortex` is invoked (IDE route), the Librarian must follow this exact sequence:

1. **Analyze** — Read the diff or file content. Ask: *"Does this change the architecture, data flow, or module dependencies?"*
2. **Extract** — Identify new or modified entities and concepts. Ignore trivial edits (typo fixes, formatting). For a new function or structural change, extract the meaning.
3. **Synthesize** — Emit a JSON object matching the schema in §4. Do not write files directly; the Knowledge Manager owns all writes.
4. **Persist** — In the API-keys route this is automatic. In the IDE route, the agent must call `save_synthesis` with the JSON; the MCP server validates it with Zod, writes the pages, regenerates `index.md`, appends to `log.md`, and bumps `.last_sync_commit`.

## 4. The Synthesis JSON Schema
The Librarian's output is enforced by [src/llm/schema.ts](src/llm/schema.ts):

```ts
{
  summary: string,                                  // 1–2 sentence high-level summary
  entities: {
    name: string,                                   // file or module identifier
    action: "create" | "update" | "delete",
    description: string,                            // why this matters architecturally
    links: string[],                                // related [[WikiLinks]]
    sourceFile?: string                             // repo-relative path (strongly preferred)
  }[],
  concepts: {
    name: string,                                   // abstract system / pattern
    description: string
  }[],
  warnings: string[]                                // contradictions / architectural drift
}
```

Any deviation (missing field, wrong action enum) is rejected by `save_synthesis` and must be retried.

## 5. Formatting Rules
To keep the knowledge readable for both humans (in Obsidian) and AI agents (via MCP):

* **Wikilinks**: Use Obsidian-style double brackets to link related ideas, e.g. *"This module talks to the [[Database Strategy]]"*. Populate the `links` array on each entity with these.
* **Synthesis over Summary**: Prefer *"Modified [[AuthStrategy]] to support JWT-based persistence"* over *"Added a variable."* — the Librarian's job is to connect changes to the broader system.
* **Compounding Knowledge**: Reference existing entities/concepts in the current index (provided as context in the user prompt) rather than re-creating them under new names.

## 6. The Linting & Contradiction Policy
Cortex acts as an architectural linter. When new code contradicts an established pattern documented in the knowledge base:

* **Do not silently overwrite the old knowledge.**
* Include a clear warning in the `warnings[]` array of the synthesis (e.g. *"`[[Auth Module]]` claims we use JWTs, but the newly ingested `auth.ts` uses session cookies. Please resolve."*).
* The Knowledge Manager surfaces these warnings inline in the matching `log.md` entry, where they remain part of the architectural timeline.

## 7. The Read / Navigate Flow
Cortex is designed so downstream AIs **read the knowledge**, not re-derive it from source. The MCP surface for consumers:

1. **`read_knowledge_index`** — Returns the rich `index.md`: every entity and concept, with description, source file, and outbound links. Call this first.
2. **`read_entity(name)`** — Returns the full markdown page for a specific entity. Use this to follow a `[[WikiLink]]` you saw in the index.
3. **`read_concept(name)`** — Same, for concepts.

The MCP prompts `read` and `explore` instruct consumers to navigate via these tools rather than re-scanning `src/`. Source files should only be opened when the knowledge base is visibly stale or silent on the topic.

## 8. Mock Mode (Testing)
Setting `CORTEX_MOCK_AI=true` in the daemon's environment short-circuits the LLM call and returns a deterministic synthesis. Use this when wiring up the watcher → writer → MCP pipeline without burning tokens or requiring a real key. Mock-mode output is intentionally tagged with a `"Mock Mode is active."` warning so it is never mistaken for real synthesis.
