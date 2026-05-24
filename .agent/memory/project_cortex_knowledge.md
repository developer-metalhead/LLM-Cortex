# Project Cortex Knowledge

LLM-Cortex is itself ingested into Project Cortex. The `.knowledge/` directory exists at the project root with a full knowledge graph.

**Why:** The project uses its own system on itself. Reading the index first is faster than grepping source files.

**How to apply:** Always read `.knowledge/index.md` first before doing Grep/Read explorations. Use `.knowledge/entities/<Name>.md` to drill into specific components. The canonical entity list is in `state.json`.

Key entities (as of Phase 6 — verify against current state.json):
- `KnowledgeManager` → `src/knowledge/writer.ts`
- `CortexMCPServer` → `src/mcp/server.ts`
- `CortexCLI` → `src/cli/index.ts`
- `CortexDaemon` → `src/cli/watch.ts`
- `DiffLayer` → `src/core/diff.ts`
- `SynthesisSchema` → `src/llm/schema.ts`

Phase 7 entities (AuditManager, LintManager, EvolutionManager) may not yet be in the index — check state.json before assuming.
