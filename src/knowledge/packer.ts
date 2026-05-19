import { buildGraph, KnowledgeGraph, GraphNode } from "./graph.js";

export interface ContextPackOptions {
  budget?: number;       // token budget
  scope?: string;        // central entity/concept
  depth?: number;        // blast radius depth
  format?: "markdown" | "json";
}

export interface ContextPackResult {
  output: string;
  tokens: number;
  elided: string[];
}

// Industry-standard simple heuristic for code tokenization without heavy libraries
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.5);
}

// ──────────────────────────────────────────────────────────────────────────
// PageRank Centrality
// ──────────────────────────────────────────────────────────────────────────

function computeCentrality(graph: KnowledgeGraph): Map<string, number> {
  const d = 0.85;
  const iters = 20;
  
  const inEdges = new Map<string, string[]>();
  const outDegree = new Map<string, number>();
  
  for (const node of graph.nodes) {
    inEdges.set(node.id, []);
    outDegree.set(node.id, 0);
  }

  // Phase 10 spec: restrict to depends_on / called_by / parent_of to prevent cycles skewing
  const validKinds = new Set(["depends_on", "called_by", "parent_of"]);

  for (const edge of graph.edges) {
    if (!validKinds.has(edge.kind)) continue;
    if (inEdges.has(edge.target)) {
      inEdges.get(edge.target)!.push(edge.source);
    }
    if (outDegree.has(edge.source)) {
      outDegree.set(edge.source, outDegree.get(edge.source)! + 1);
    }
  }

  const N = graph.nodes.length;
  let ranks = new Map<string, number>();
  if (N === 0) return ranks;

  for (const node of graph.nodes) {
    ranks.set(node.id, 1 / N);
  }

  for (let i = 0; i < iters; i++) {
    const newRanks = new Map<string, number>();
    for (const node of graph.nodes) {
      let sum = 0;
      for (const src of inEdges.get(node.id) ?? []) {
        const outD = outDegree.get(src) || 1;
        sum += (ranks.get(src) ?? 0) / outD;
      }
      newRanks.set(node.id, (1 - d) / N + d * sum);
    }
    ranks = newRanks;
  }

  return ranks;
}

export function buildContextPack(
  state: { entities: Record<string, any>; concepts: Record<string, any> },
  options: ContextPackOptions = {}
): ContextPackResult {
  const budget = options.budget ?? 8000;
  const graph = buildGraph(state, { 
    scope: options.scope, 
    depth: options.depth, 
    includeConcepts: true 
  });

  const centrality = computeCentrality(graph);

  // Primary sort: centrality (most-referenced first — never buries important entities).
  // Quality is a tiebreaker only, so a poorly-documented-but-central entity still
  // gets included. Low-quality entities get an inline warning instead of being deprioritized.
  const sortedNodes = [...graph.nodes].sort((a, b) => {
    const ca = centrality.get(a.id) ?? 0;
    const cb = centrality.get(b.id) ?? 0;
    if (ca !== cb) return cb - ca;
    return b.qualityScore - a.qualityScore || a.id.localeCompare(b.id);
  });

  if (options.format === "json") {
    // We don't truncate JSON yet since it's programmatic, but we could filter it
    // For simplicity, we just serialize the subgraph if it fits, else truncate nodes
    const payload = JSON.stringify(graph, null, 2);
    return {
      output: payload,
      tokens: estimateTokens(payload),
      elided: []
    };
  }

  // Markdown builder
  let currentTokens = 0;
  let markdown = `# Cortex Context Pack\n\n`;
  markdown += `Generated from knowledge base with a ${budget} token budget.\n`;
  if (options.scope) markdown += `Scope: **${options.scope}** (Depth: ${options.depth ?? "unlimited"})\n`;
  markdown += `\n---\n\n`;

  const headerTokens = estimateTokens(markdown);
  currentTokens += headerTokens;

  const included = new Set<string>();
  const elided = new Set<string>();
  let finalOutput = markdown;

  for (const node of sortedNodes) {
    let block = `### ${node.type === "concept" ? "💡 Concept" : "📄 Entity"}: ${node.id}\n`;
    if (node.qualityScore < 0.4) {
      block += `> **Warning**: Low confidence — not yet evidence-anchored or human-reviewed.\n`;
    }
    block += `\n${node.description}\n\n`;
    
    // Add raw state stringified for relationships/evidence if it's an entity
    const raw = node.type === "concept" ? state.concepts[node.id] : state.entities[node.id];
    if (raw) {
      if (raw.relationships && raw.relationships.length > 0) {
        block += `**Relationships**:\n`;
        for (const rel of raw.relationships) {
          block += `- ${rel.kind} [[${rel.target}]]\n`;
        }
        block += `\n`;
      }
      if (raw.evidence && raw.evidence.length > 0) {
        block += `**Evidence**:\n`;
        for (const ev of raw.evidence) {
          block += `- ${ev.sourceFile}${ev.lineRange ? ` (lines ${ev.lineRange})` : ""}\n`;
        }
        block += `\n`;
      }
    }

    const blockTokens = estimateTokens(block);
    if (currentTokens + blockTokens > budget) {
      elided.add(node.id);
      continue;
    }

    finalOutput += block;
    currentTokens += blockTokens;
    included.add(node.id);
  }

  // Add elided footnotes
  const actuallyElided = Array.from(elided).filter(id => !included.has(id));
  if (actuallyElided.length > 0) {
    let footer = `---\n\n*The following items were elided to fit the ${budget} token budget:*\n`;
    for (const id of actuallyElided) {
      footer += `- [[${id}]]\n`;
    }
    const footerTokens = estimateTokens(footer);
    if (currentTokens + footerTokens <= budget) {
      finalOutput += footer;
      currentTokens += footerTokens;
    }
  }

  return {
    output: finalOutput,
    tokens: currentTokens,
    elided: actuallyElided
  };
}
