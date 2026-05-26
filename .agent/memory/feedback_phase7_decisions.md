# Phase 7 Decisions

During the Phase 7 review fix pass, three judgment calls were made and accepted by the user:

## 1. Manager classes kept

Codebase convention — `KnowledgeManager`, `ConfigManager` are stateless classes that hold `projectRoot`/`knowledgeDir`. Converting `LintManager` / `AuditManager` / `EvolutionManager` to module functions would have introduced inconsistency. Consistency with existing code wins over OOP purity.

**How to apply:** When a new module needs `projectRoot` derivation, use a class with the same `(rootDir)` constructor signature.

## 2. `log_query` (consolidated) kept

One filter-bearing tool is cleaner than two near-identical ones (`audit_entity` + `audit_since`). The plan was updated to reflect the actual implementation.

**How to apply:** When the original plan and the implementation diverge AND the implementation is better, update the plan — don't undo the better design.

## 3. JSONL log entries embed full `state` snapshot per entry

Required for `cortex evolution --replay --at <commit>` to actually work. Storing only entity names is insufficient to reconstruct an index.

**How to apply:** When adding new fields to `state.json` / `EntityRecord` / `ConceptRecord`, remember they will be persisted in every JSONL entry going forward — be conservative about field additions. Pre-snapshot entries fall back to name-only in `EvolutionManager.replayAt`.
