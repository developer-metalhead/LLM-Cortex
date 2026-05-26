# CLAUDE.md

> Instructions and guidelines for Claude Code (CLI agent) in this workspace.

## 🛠️ Build and Test Commands
- **Install dependencies**: `npm install`
- **Compile project**: `npm run build`
- **Run test suite**: `npm test`
- **Local Dev / Run CLI**: `npm run dev`
- **Local MCP Server Test**: `npm run mcp`
- **Global symlink refresh**: `npm link`

## 🧠 Project Cortex — Architectural Memory
This project uses **Project Cortex** via the `project-cortex` MCP server. The knowledge base is located in `.knowledge/` and includes per-entity pages with detailed Role, Interface, Behavior, and Wiring guidelines.

### ⚠️ CRITICAL CONSTRAINTS (MUST ALWAYS FOLLOW):
1. **NO Native File Readers for Code**: 
   - You **MUST NOT** use native CLI commands (like `cat`, `less`, `grep`, `type`) or native file-reading tools (like `view_file`) to inspect, check, review, or read any code files (such as `.js`, `.ts`, `.py`, etc.).
   - You **MUST exclusively call the `source` MCP tool** for all code inspections. This ensures dynamic AST skeleton caching, delta-diff compression, and token-saving compliance.
2. **Consult Knowledge Index First**:
   - For any task that implements, refactors, modifies, or deletes code, you **MUST** first call `read_knowledge_index` to find the relevant entity and its Wiring section (blast radius) before making modifications.
3. **Always Output Brevity Statistics**:
   - If the MCP server returns a `📉 Cortex Brevity Stats` section in a tool response, you **MUST** copy, preserve, and append this exact statistics block at the very bottom of your final response to the user.

## 🎨 Code Style & Quality Guidelines
- **TypeScript & ESM**: Use modern ES module imports/exports.
- **Strict Typing**: Leverage strict types in all new modules.
- **Robust Error Handling**: Wrap files/IO in robust try-catches.
- **Testing**: Maintain 100% test coverage for all new cache/analysis rules.
- **Single source for shared constants**: Never define the same constant (`EXCLUDE_DIRS`, `SOURCE_EXTENSIONS`, `MAX_DIFF_CHARS`, etc.) in more than one file. All shared constants live in `src/constants.ts` and are imported from there. If a module needs a variant, extend the base: `new Set([...BASE_EXCLUDE_DIRS, ".mypy_cache"])`. Duplication causes silent divergence — one file gets updated, others drift with no error. Source-of-lesson: helpline F1 (flaw #139).
- **LLM-agnostic enforcement**: Every code quality rule added to this file MUST also have a structural enforcement layer — lint rule, CI check, pre-commit hook, or type-system constraint — that works for any agent or contributor without reading this file. `CLAUDE.md` is a soft hint for Claude Code only. CI is the truth.

## ⚡ Token Economics — Prompt-Cache Ordering
When assembling LLM payloads (context packs, tool responses, registry output):
- **Sort deterministically** before serializing: entity lists by `entity_id`, file lists by path, plugin/registry maps by key. Non-deterministic `Map`/`Set` iteration order silently invalidates the Anthropic prompt cache on every call.
- **Preserve prior transcript bytes** unchanged where possible — don't reorder fields that were stable in the previous turn.
- Applies to: `build_context_pack` entity ordering, `cortex_find` result ordering, any registry or plugin list emitted into prompts.
- Source-of-lesson: openclaw `AGENTS.md:41`

## 🔬 Prove-First Gate — Agentic Code Changes
When an agent (including Claude Code) proposes changes to Cortex's own source or `.knowledge/`:
1. **Prove**: reproduce the failing case → write or cite a regression test → produce a dirty diff showing proof.
2. **Review**: human reviews the dirty diff → approves → agent commits exactly one fix per accepted change.
- **Skip criteria** (do NOT proceed without proof): uncertain repro, guessed dependency behavior, no focused proof feasible.
- Source-of-lesson: openclaw `.agents/skills/openclaw-small-bugfix-sweep/SKILL.md`

## 🚫 Anti-Pattern — Never reduce CLAUDE.md to a redirect
This file MUST contain Claude Code-specific overrides (the `source` MCP mandate, brevity stats rule, cache-ordering rule above) that differ from general agent instructions. Do not collapse this into a single shared AGENTS.md.
