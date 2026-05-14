# Cortex Schema (Layer 3)

This is the behavioral schema for the Project Cortex Engine. It defines exactly how the AI background daemon should extract, link, and maintain the knowledge base for this repository.

## 1. Purpose of the Knowledge Base
The primary goal of the `.knowledge/` directory is to maintain an **up-to-date, architectural mental model** of the software. It must focus on "Why" and "How" components connect, not just repeating the "What" that is already in the source code.

## 2. Directory Conventions
*   **Raw Sources**: The source of truth is the actual codebase (`src/`, `lib/`, `api/`, etc.). These are strictly read-only for Cortex.
*   **knowledge Output**: All generated knowledge must be written to the `.knowledge/` directory.
    *   `.knowledge/index.md` -> The master catalog of all pages.
    *   `.knowledge/log.md` -> Chronological append-only history.
    *   `.knowledge/warnings.md` -> Flagged contradictions.
    *   `.knowledge/entities/` -> Pages mapping 1:1 with specific files/classes.
    *   `.knowledge/concepts/` -> Pages summarizing abstract systems spanning multiple files.

## 3. The Ingest Workflow
When a file is saved or committed, the Cortex AI must follow this exact sequence:
1.  **Analyze**: Read the diff or file content. Ask: "Does this change the architecture, data flow, or module dependencies?"
2.  **Extract**: Identify new entities or concepts. If it is a minor typo fix, ignore it. If it is a new function or structural change, extract the meaning.
3.  **Update Pages**: 
    *   Modify existing entity pages in `.knowledge/entities/` to reflect new parameters or dependencies.
    *   Update `.knowledge/concepts/` if a broader system (e.g., "Authentication") has changed.
4.  **Index**: If a new page was created, append it to `.knowledge/index.md` with a one-line summary.
5.  **Log**: Append a timestamped entry to `.knowledge/log.md` formatted as: `## [YYYY-MM-DD HH:MM] modified | src/file.js - Brief reason`.

## 4. Formatting Rules
To ensure the knowledge remains highly readable for both Humans (in Obsidian) and AI (via MCP):
*   **knowledgelinks**: Always use Obsidian-style double brackets to link related ideas together (e.g., `This module talks to the [[Database Strategy]]`).
*   **Citations**: Every technical claim or architectural decision MUST reference the actual source code file that implements it (e.g., `[Source: src/api/auth.ts]`).
*   **Frontmatter**: Every knowledge page must include YAML frontmatter at the top:
    ```yaml
    ---
    type: entity # or concept
    last_updated: YYYY-MM-DD
    related_files: ["src/api/auth.ts"]
    ---
    ```
*   **Structure**: Every page must begin with a `> **Summary**: ...` block blockquote.

## 5. The Linting & Contradiction Policy
Cortex acts as an Architectural Linter. If an ingested file contradicts existing documentation:
*   **DO NOT silently delete the old knowledge.**
*   Instead, log the conflict in `.knowledge/warnings.md`.
*   Example: *"Warning: `[[Auth Module]]` claims we use JWTs, but the newly ingested `auth.js` uses session cookies. Please resolve."*
*   Update the specific page with a `> [!WARNING]` GitHub-style alert noting the architectural drift.
