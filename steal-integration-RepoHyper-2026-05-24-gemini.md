# Integration Scratch — RepoHyper (Gemini)

## To update in flaws.md
**Addressed by**: Phase X.Y Refinement — Local Dense Embedding Search (UniXcoder/CodeT5) (RepoHyper audit, score: 6)

## To paste into flaws.md
*(None)*

## To paste into implementation_plan.md
*(None with score >= 30, but including high-value concepts)*

### Phase X.Y Refinement — Proximity Search with BFS Radius Expansion
**Concept**: After finding seed nodes, perform a bounded BFS (radius and max_size constraints) across the topological graph to pull in adjacent context.
**Value**: Enhances `resolve_seed` (Phase 9) by allowing a configurable neighborhood expansion rather than single-node matching.
**Effort**: Medium.
