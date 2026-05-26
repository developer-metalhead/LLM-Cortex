# Integration Scratch — RepoHyper (2026-05-24)

Audit: full, Novel/research calibration, git d2ba69a
Items scored ≥ 14 included below.

---

## To paste into flaws.md

### New Flaw — Hardcoded grammar/data absolute paths (F1)
**Severity**: High
**Description**: Hardcoding absolute paths to tree-sitter grammar .so files (e.g. /datadrive05/...) breaks reproducibility on any machine that is not the original dev server. The anti-pattern is present in both parse_source_code.py:1 and matching_repobench_graphs.py:16.
**Rule**: Never hardcode data or model paths — always derive from config, env var, or runtime discovery with a local fallback.
**Source-of-lesson**: RepoHyper/src/repo_graph/parse_source_code.py:1

### New Flaw — Module-level hardcoded CUDA device (F2)
**Severity**: Medium
**Description**: module-level `device = "cuda:0"` at import time. Fails silently on CPU-only environments with no override path.
**Rule**: Derive device from os.environ.get("DEVICE", "cpu") or an argparse/config argument. Never hardcode at module level.
**Source-of-lesson**: RepoHyper/src/repo_graph/repo_to_graph.py

### New Flaw — Missing self in class constructor (F3)
**Severity**: Medium
**Description**: LLMModel.__init__(model_name) omits self — Python binds model_name to self, making model_name unbound. The class is never instantiated in tests so the bug is invisible.
**Rule**: Always exercise every class constructor in at least one test. Static analysis (mypy, pyright) with strict mode would have caught this.
**Source-of-lesson**: RepoHyper/src/llm.py:8

### New Flaw — os.chdir() in library/script code (F4)
**Severity**: Medium
**Description**: generate_call_graphs.py:47,60 calls os.chdir() to set the working directory before invoking PyCG. This mutates global process state, breaks concurrent execution, and makes paths fragile.
**Rule**: Always pass cwd= to subprocess.run()/Popen() instead of os.chdir().
**Source-of-lesson**: RepoHyper/scripts/data/generate_call_graphs.py:47

---

## To paste into implementation_plan.md

### Phase 7 Refinement — JSON-Configured Graph Expansion Patterns (RepoHyper audit, score: 29)

RepoHyper ships `patterns.json` that defines allowed edge-type-sequence allowlists per source node type.
`ProximitySearchPattern.walking()` does DFS on the graph matching traversed edge-type sequences against these allowlists.

Adapt for Cortex:

```typescript
// config/graph-expansion-patterns.json
{
  "entity": ["depends_on", "calls", "depends_on.calls"],
  "concept": ["references", "depends_on"],
  "file": ["contains", "imports"]
}

// In Phase 7 graph traversal
interface ExpansionPatterns {
  [nodeType: string]: string[][]; // allowed edge-type sequences
}

function patternExpand(
  startNode: string,
  nodeType: string,
  graph: KnowledgeGraph,
  patterns: ExpansionPatterns,
  maxDepth = 3
): string[] {
  const allowed = patterns[nodeType] ?? [];
  const visited = new Set<string>();
  // DFS matching edge-type sequences against allowed patterns
  function dfs(node: string, edgeSequence: string[]) { ... }
  return [...visited];
}
```

Benefit: config-driven traversal routing without code changes. Operators can tune which paths are explored per node type.

---

### Phase 7 Refinement — k-hop Subgraph via Adjacency Matrix Power (RepoHyper audit, score: 22)

RepoHyper computes k-hop neighborhoods via sparse adjacency matrix exponentiation (A^k).
For Cortex's TypeScript graph:

```typescript
import graphology from 'graphology';
import { adjacencyMatrix, multiplyAdjacency } from './graph-utils';

function kHopNeighborhood(graph: Graph, sourceNodes: string[], k: number): Set<string> {
  // build sparse adjacency representation
  const adj = buildAdjMap(graph);
  let frontier = new Set(sourceNodes);
  const visited = new Set(sourceNodes);
  for (let hop = 0; hop < k; hop++) {
    const nextFrontier = new Set<string>();
    for (const node of frontier) {
      for (const neighbor of adj.get(node) ?? []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          nextFrontier.add(neighbor);
        }
      }
    }
    frontier = nextFrontier;
    if (frontier.size === 0) break;
  }
  return visited;
}
```

Use in impact_analysis: replace current DFS traversal with k-hop to give callers explicit depth control.

---

### Phase 26 Refinement — PPR Ranking for cortex_find Results (closes Flaw #26) (RepoHyper audit, score: 14)

RepoHyper's `ppr_topk()` uses Personalized PageRank power iterations to rank subgraph nodes by relevance to a source set.
Adapt for cortex_find result ranking:

```typescript
function personalizedPageRank(
  graph: KnowledgeGraph,
  sourceNodes: string[],
  alpha = 0.15,
  maxIter = 20,
  topK = 10
): Array<{ node: string; score: number }> {
  const nodes = graph.nodes();
  const n = nodes.length;
  // initialize uniform distribution
  let ppr = new Map<string, number>(nodes.map(n => [n, 1/n]));
  const personalVector = new Map<string, number>(
    sourceNodes.map(s => [s, 1/sourceNodes.length])
  );
  for (let i = 0; i < maxIter; i++) {
    const newPpr = new Map<string, number>();
    for (const node of nodes) {
      const neighbors = graph.inNeighbors(node);
      const spread = neighbors.reduce((acc, nb) => {
        const out = graph.outDegree(nb);
        return acc + (ppr.get(nb) ?? 0) / (out || 1);
      }, 0);
      newPpr.set(node, alpha * (personalVector.get(node) ?? 0) + (1 - alpha) * spread);
    }
    ppr = newPpr;
  }
  return [...ppr.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topK)
    .map(([node, score]) => ({ node, score }));
}
```

This replaces the current substring-presence ranking in cortex_find with topology-aware relevance.

---

### Phase 7 Refinement — BFS Radius Expansion for cortex_find (closes Flaw #30) (RepoHyper audit, score: 14)

RepoHyper's `ProximitySearchRadius` expands initial search results via BFS with a max_size cap.
Adapt for cortex_find to surface parallel implementations:

```typescript
function bfsExpand(
  initialNodes: string[],
  graph: KnowledgeGraph,
  radius: number,
  maxSize: number
): string[] {
  const visited = new Set(initialNodes);
  let frontier = [...initialNodes];
  for (let r = 0; r < radius && visited.size < maxSize; r++) {
    const nextFrontier: string[] = [];
    for (const node of frontier) {
      for (const neighbor of graph.neighbors(node)) {
        if (!visited.has(neighbor) && visited.size < maxSize) {
          visited.add(neighbor);
          nextFrontier.push(neighbor);
        }
      }
    }
    frontier = nextFrontier;
    if (frontier.length === 0) break;
  }
  return [...visited];
}
```

Use in cortex_find: after initial entity match, call bfsExpand(matches, graph, radius=2, maxSize=20) to surface related co-implementations.

---

### Phase 35 Refinement — Import-Fallback Text Search for File->Entity Reverse Lookup (closes Flaw #35) (RepoHyper audit, score: 29)

RepoHyper's `finding_import_indexes_in_code()` resolves "which graph entity does this code reference" by scanning code body text for entity name fragments (.split(".")[-1]).

Adapt for Cortex's reverse lookup (file path -> entity):

```typescript
function findReferencedEntities(
  codeText: string,
  entityIndex: Map<string, string[]> // entityId -> [name, shortName]
): Array<{ entityId: string; weight: number }> {
  const hits: Map<string, number> = new Map();
  for (const [entityId, names] of entityIndex) {
    const shortName = names[names.length - 1]; // last component of dotted name
    if (shortName.length < 3) continue; // skip trivially common names
    const count = (codeText.match(new RegExp(`\\b${shortName}\\b`, 'g')) ?? []).length;
    if (count > 0) hits.set(entityId, count);
  }
  const total = [...hits.values()].reduce((a, b) => a + b, 0) || 1;
  return [...hits.entries()]
    .map(([entityId, count]) => ({ entityId, weight: count / total }))
    .sort((a, b) => b.weight - a.weight);
}
```

Use in cortex_find as a fallback when exact entity name match fails: search code context for entity short-names and return weighted candidates.

---

## To update in flaws.md

**Addressed by**: Phase 35 Refinement — Import-Fallback Text Search for File->Entity Reverse Lookup (RepoHyper audit, score: 29)
→ Add to Flaw #35 (No reverse lookup from file path → entity)

**Addressed by**: Phase 26 Refinement — PPR Ranking for cortex_find Results (RepoHyper audit, score: 14)
→ Add to Flaw #26 (cortex_find ranks by substring presence, not relevance)

**Addressed by**: Phase 7 Refinement — BFS Radius Expansion for cortex_find (RepoHyper audit, score: 14)
→ Add to Flaw #30 (Search for a generic concept misses parallel implementations)
