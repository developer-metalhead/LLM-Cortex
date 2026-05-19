// Phase 8 — Knowledge graph builder shared between `cortex graph` CLI and
// `cortex serve`. Pure projection over state.json — no I/O, no LLM calls.
//
// Design:
//   buildGraph()  — state.json → KnowledgeGraph (nodes + edges)
//   toMermaid()   — KnowledgeGraph → Mermaid flowchart LR string
//   toJson()      — KnowledgeGraph → JSON string
//   qualityColor() — score → "green" | "amber" | "red" (spec thresholds)
//
// Quality thresholds per Phase 7.5 spec:
//   green  ≥ 0.8
//   amber  ≥ 0.5
//   red    < 0.5

import { computeQuality } from "./quality.js";

export type QualityColor = "green" | "amber" | "red";

export interface GraphNode {
  id: string;
  type: "entity" | "concept";
  sourceFile?: string;
  isStale: boolean;
  qualityScore: number;        // 0.0–1.0
  qualityColor: QualityColor;
  qualityBreakdown: {
    evidenceFreshness: number;
    contradiction: number;
    staleness: number;
    age: number;
    humanReview: number;
  };
  description: string;
  lastRefined: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  kind: string;
}

export interface KnowledgeGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface BuildGraphOptions {
  scope?: string;
  depth?: number;
  includeConcepts?: boolean;
}

// ──────────────────────────────────────────────────────────────────────────
// qualityColor — maps a 0–1 score to the Phase 7.5-spec colour bucket.
// ──────────────────────────────────────────────────────────────────────────

export function qualityColor(score: number): QualityColor {
  if (score >= 0.8) return "green";
  if (score >= 0.5) return "amber";
  return "red";
}

// ──────────────────────────────────────────────────────────────────────────
// buildGraph — accepts the raw `state.json` object and returns a typed
// KnowledgeGraph. `state` is duck-typed so graph.ts stays decoupled from
// writer.ts's private KnowledgeState type.
// ──────────────────────────────────────────────────────────────────────────

export function buildGraph(
  state: { entities: Record<string, any>; concepts: Record<string, any> },
  options: BuildGraphOptions = {},
): KnowledgeGraph {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const now = Date.now();

  for (const [name, entity] of Object.entries(state.entities ?? {})) {
    const bd = computeQuality(entity, { nowMs: now });
    nodes.push({
      id: name,
      type: "entity",
      sourceFile: entity.sourceFile,
      isStale: !!entity.staleSince,
      qualityScore: bd.score,
      qualityColor: qualityColor(bd.score),
      qualityBreakdown: {
        evidenceFreshness: bd.evidenceFreshness,
        contradiction: bd.contradiction,
        staleness: bd.staleness,
        age: bd.age,
        humanReview: bd.humanReview,
      },
      description: entity.description ?? "",
      lastRefined: entity.lastRefined ?? "",
    });

    for (const rel of entity.relationships ?? []) {
      if (rel.target) {
        edges.push({ source: name, target: rel.target, kind: rel.kind ?? "depends_on" });
      }
    }
  }

  if (options.includeConcepts) {
    for (const [name, concept] of Object.entries(state.concepts ?? {})) {
      nodes.push({
        id: name,
        type: "concept",
        isStale: false,
        qualityScore: 1.0,
        qualityColor: "green",
        qualityBreakdown: { evidenceFreshness: 1, contradiction: 1, staleness: 1, age: 1, humanReview: 1 },
        description: concept.description ?? "",
        lastRefined: concept.lastRefined ?? "",
      });
    }
  }

  // Filter edges whose target has no node (e.g. concept targets when includeConcepts=false)
  const nodeIds = new Set(nodes.map((n) => n.id));
  const filteredEdges = edges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target));

  if (options.scope) {
    return filterByScope({ nodes, edges: filteredEdges }, options.scope, options.depth ?? 2);
  }

  return { nodes, edges: filteredEdges };
}

// BFS from scope node, bidirectional, up to `depth` hops.
function filterByScope(
  graph: KnowledgeGraph,
  scope: string,
  depth: number,
): KnowledgeGraph {
  const nodeExists = graph.nodes.some((n) => n.id === scope);
  if (!nodeExists) return graph; // scope not found → return full graph

  // Build bidirectional adjacency list
  const adj = new Map<string, Set<string>>();
  for (const e of graph.edges) {
    if (!adj.has(e.source)) adj.set(e.source, new Set());
    if (!adj.has(e.target)) adj.set(e.target, new Set());
    adj.get(e.source)!.add(e.target);
    adj.get(e.target)!.add(e.source);
  }

  const visited = new Set<string>();
  const queue: Array<{ id: string; d: number }> = [{ id: scope, d: 0 }];
  while (queue.length > 0) {
    const item = queue.shift()!;
    if (visited.has(item.id)) continue;
    visited.add(item.id);
    if (item.d < depth) {
      for (const neighbor of adj.get(item.id) ?? []) {
        if (!visited.has(neighbor)) queue.push({ id: neighbor, d: item.d + 1 });
      }
    }
  }

  return {
    nodes: graph.nodes.filter((n) => visited.has(n.id)),
    edges: graph.edges.filter((e) => visited.has(e.source) && visited.has(e.target)),
  };
}

// ──────────────────────────────────────────────────────────────────────────
// toMermaid — emits a Mermaid `flowchart LR` string from a KnowledgeGraph.
//
// Node shapes:
//   entity (normal)  →  ["label"]
//   entity (stale)   →  ["label [STALE]"]
//   concept          →  (["label"])
//
// Edge styles by relationship kind:
//   depends_on / default  →  -->
//   called_by             →  -.->
//   supports              →  ==>
//   contradicts           →  -- contradicts -->
//   derived_from          →  -->|derived|
//   parent_of             →  -->|parent|
//
// ClassDef colours follow Phase 7.5 quality thresholds.
// ──────────────────────────────────────────────────────────────────────────

export function toMermaid(graph: KnowledgeGraph): string {
  if (graph.nodes.length === 0) {
    return 'flowchart LR\n  empty["(empty graph)"]';
  }

  const lines: string[] = ["flowchart LR"];
  lines.push("  classDef green fill:#22c55e,color:#fff,stroke:#16a34a");
  lines.push("  classDef amber fill:#f59e0b,color:#fff,stroke:#d97706");
  lines.push("  classDef red fill:#ef4444,color:#fff,stroke:#dc2626");
  lines.push("  classDef stale fill:#9ca3af,color:#fff,stroke:#6b7280");
  lines.push("  classDef concept fill:#a78bfa,color:#fff,stroke:#7c3aed");
  lines.push("");

  const idOf = (name: string) => name.replace(/[^A-Za-z0-9_]/g, "_");
  const labelOf = (name: string) => name.replace(/"/g, "'");

  for (const node of graph.nodes) {
    const id = idOf(node.id);
    const lbl = labelOf(node.id);
    if (node.type === "concept") {
      lines.push(`  ${id}(["${lbl}"])`);
    } else if (node.isStale) {
      lines.push(`  ${id}["${lbl} [STALE]"]`);
    } else {
      lines.push(`  ${id}["${lbl}"]`);
    }
  }

  lines.push("");

  // Deduplicate edges — same source+target+kind only once
  const seen = new Set<string>();
  for (const edge of graph.edges) {
    const key = `${edge.source}~${edge.target}~${edge.kind}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const src = idOf(edge.source);
    const tgt = idOf(edge.target);
    lines.push(`  ${src} ${mermaidArrow(edge.kind)} ${tgt}`);
  }

  lines.push("");

  for (const node of graph.nodes) {
    const id = idOf(node.id);
    if (node.type === "concept") {
      lines.push(`  class ${id} concept`);
    } else if (node.isStale) {
      lines.push(`  class ${id} stale`);
    } else {
      lines.push(`  class ${id} ${node.qualityColor}`);
    }
  }

  return lines.join("\n");
}

function mermaidArrow(kind: string): string {
  switch (kind) {
    case "called_by":    return "-..->";
    case "supports":     return "==>";
    case "contradicts":  return "-- contradicts -->";
    case "derived_from": return "-->|derived|";
    case "parent_of":    return "-->|parent|";
    default:             return "-->";
  }
}

export function toJson(graph: KnowledgeGraph): string {
  return JSON.stringify(graph, null, 2);
}
