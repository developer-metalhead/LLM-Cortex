import { buildGraph, KnowledgeGraph, GraphNode } from "./graph.js";
import fs from "fs";
import path from "path";
import { SmartReadCache } from "./readCache.js";
import { CognitiveLens, SoulEngine } from "./soul.js";
import { rerankContextPackNodes } from "./cognitive.js";

export interface ContextPackOptions {
  budget?: number;       // token budget
  scope?: string;        // central entity/concept
  depth?: number;        // blast radius depth
  format?: "markdown" | "json";
  projectRoot?: string;  // required for Phase 13.7.2 grounded fallback
  lens?: CognitiveLens;
  soulEngine?: SoulEngine;
}

export interface ContextPackResult {
  output: string;
  tokens: number;
  elided: string[];
  expanded?: string[];   // Phase 13.7.2: entities pulled back in via Dynamic Context Expansion
  groundedFallbacks?: { name: string; snippet: string; confidence: string }[];  // Phase 13.7.2: entities resolved via live grep
}

// Industry-standard simple heuristic for code tokenization without heavy libraries
export function estimateTokens(text: string, provider?: string): number {
  let divisor = 3.5;
  if (provider) {
    const p = provider.toLowerCase();
    if (p === "openai" || p.includes("gpt") || p.includes("o1") || p.includes("o3")) {
      divisor = 3.8;
    } else if (p === "anthropic" || p.includes("claude")) {
      divisor = 3.4;
    } else if (p === "google" || p.includes("gemini")) {
      divisor = 3.6;
    }
  }
  return Math.ceil(text.length / divisor);
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

// ──────────────────────────────────────────────────────────────────────────
// Phase 13.7.2 — Speculative Static Verification & Grounded Fallback
// ──────────────────────────────────────────────────────────────────────────

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const ENTITY_PATTERNS = [
  { re: (name: string) => new RegExp(`(?:export\\s+)?(?:abstract\\s+)?class\\s+${escapeRegex(name)}(?:<[^>]*>)?(?:\\s+extends\\s+\\w+(?:<[^>]*>)?)?(?:\\s+implements\\s+[^{]+)?`), confidence: "high" },
  { re: (name: string) => new RegExp(`(?:export\\s+)?interface\\s+${escapeRegex(name)}(?:<[^>]*>)?(?:\\s+extends\\s+[^{]+)?`), confidence: "high" },
  { re: (name: string) => new RegExp(`(?:export\\s+)?enum\\s+${escapeRegex(name)}`), confidence: "high" },
  { re: (name: string) => new RegExp(`(?:export\\s+)?type\\s+${escapeRegex(name)}\\s*=`), confidence: "medium" },
  { re: (name: string) => new RegExp(`(?:export\\s+)?function\\s+${escapeRegex(name)}\\s*\\(`), confidence: "medium" },
  { re: (name: string) => new RegExp(`(?:export\\s+)?(?:const|let|var)\\s+${escapeRegex(name)}\\s*[:=]`), confidence: "medium" },
];

const SOURCE_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".mts", ".cts"]);
const EXCLUDE_DIRS = new Set(["node_modules", "dist", "build", "out", ".git", ".knowledge", ".cortex", ".claude", ".agents", ".antigravity", ".cursor", ".vscode", ".windsurf", ".codeium", "coverage", ".next", ".nuxt", ".turbo", "__pycache__"]);

function searchFile(filePath: string, entityName: string): { snippet: string; confidence: string } | null {
  try {
    const stat = fs.statSync(filePath);
    if (stat.size > 500_000) return null;
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n");
    const searchLines = lines.slice(0, Math.min(lines.length, 200));
    for (let i = 0; i < searchLines.length; i++) {
      const line = searchLines[i];
      for (const { re, confidence } of ENTITY_PATTERNS) {
        if (re(entityName).test(line)) {
          // Use AST skeleton extraction if possible
          try {
            const cache = new SmartReadCache();
            cache.get(filePath, "skeleton"); // Populates cache
            const res = cache.get(filePath, "skeleton"); // Returns cached skeleton
            if (res && res.content && res.content.trim()) {
              return { snippet: res.content, confidence };
            }
          } catch {}

          // Fallback to single line signature
          const sig = line.trim().endsWith("{") ? line.trim() + " ..." : line.trim();
          return { snippet: sig, confidence };
        }
      }
    }
  } catch {}
  return null;
}

function grepEntityInSource(
  entityName: string,
  projectRoot: string,
  callerSourceFile?: string
): { snippet: string; confidence: string; filePath: string } | null {
  const queue: string[] = [];
  const visited = new Set<string>();

  if (callerSourceFile) {
    const absolutePath = path.isAbsolute(callerSourceFile)
      ? callerSourceFile
      : path.join(projectRoot, callerSourceFile);
    const callerDir = path.dirname(absolutePath);
    if (fs.existsSync(callerDir)) {
      queue.push(callerDir);
    }
  }
  queue.push(projectRoot);

  let scanned = 0;
  const MAX_FILES = 200;
  const startTime = Date.now();
  const TIMEOUT_MS = 15;

  while (queue.length > 0 && scanned < MAX_FILES) {
    if (Date.now() - startTime > TIMEOUT_MS) {
      break;
    }

    const dir = path.resolve(queue.shift()!);
    const dirKey = process.platform === "win32" ? dir.toLowerCase() : dir;
    if (visited.has(dirKey)) continue;
    visited.add(dirKey);

    let entries: any[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch { continue; }

    for (const entry of entries) {
      if (EXCLUDE_DIRS.has(entry.name) || entry.name.startsWith(".")) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        queue.push(fullPath);
      } else if (entry.isFile() && SOURCE_EXTS.has(path.extname(entry.name))) {
        scanned++;
        const match = searchFile(fullPath, entityName);
        if (match) {
          return { ...match, filePath: path.relative(projectRoot, fullPath) };
        }
      }
    }
  }
  return null;
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
  let sortedNodes = [...graph.nodes].sort((a, b) => {
    const ca = centrality.get(a.id) ?? 0;
    const cb = centrality.get(b.id) ?? 0;
    if (ca !== cb) return cb - ca;
    return b.qualityScore - a.qualityScore || a.id.localeCompare(b.id);
  });

  if (options.lens) {
    const rerankable = sortedNodes.map(n => ({
      name: n.id,
      type: n.type,
      score: centrality.get(n.id) ?? 0,
      description: n.description,
      sourceFile: n.sourceFile,
      nodeType: n.type === "entity" ? "decision" as const : "insight" as const
    }));
    const reranked = rerankContextPackNodes(rerankable, options.lens, options.soulEngine);
    const nodeMap = new Map(sortedNodes.map(n => [n.id, n]));
    sortedNodes = reranked.map(item => nodeMap.get(item.name)!).filter(Boolean);
  }

  if (options.format === "json") {
    // We don't truncate JSON yet since it's programmatic, but we could filter it
    // For simplicity, we just serialize the subgraph if it fits, else truncate nodes
    const payload = JSON.stringify(graph, null, 2);
    return {
      output: payload,
      tokens: estimateTokens(payload),
      elided: [],
      expanded: [],
      groundedFallbacks: [],
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

    const softLimit = Math.max(budget - 1000, Math.floor(budget * 0.85));
    const blockTokens = estimateTokens(block);
    if (currentTokens + blockTokens > softLimit && included.size > 0) {
      elided.add(node.id);
      continue;
    }

    finalOutput += block;
    currentTokens += blockTokens;
    included.add(node.id);
  }

  // ─── Phase 13.7.2: Speculative Static Verification & Grounded Fallback ───
  const expanded: string[] = [];
  const groundedFallbacks: { name: string; snippet: string; confidence: string }[] = [];
  const stateEntityNames = new Set(Object.keys(state.entities));
  const maxOverage = budget * 0.5;

  if (options.projectRoot) {
    for (const entityName of included) {
      const entity = state.entities[entityName];
      if (!entity?.relationships) continue;

      for (const rel of entity.relationships) {
        const usageKinds = new Set(["depends_on", "called_by", "parent_of"]);
        if (!usageKinds.has(rel.kind)) continue;

        const target = rel.target;
        if (included.has(target)) continue;

        if (stateEntityNames.has(target)) {
          // Dynamic Context Expansion: target existed in KB but was elided by budget
          if (expanded.includes(target)) continue;
          const node = sortedNodes.find(n => n.id === target);
          const rawEntity = state.entities[target];
          if (!rawEntity) continue;

          let block = `### 📄 Entity: ${target}\n`;
          if (node && node.qualityScore < 0.4) {
            block += `> **Warning**: Low confidence — not yet evidence-anchored or human-reviewed.\n`;
          }
          block += `\n${rawEntity.description || "(no description available)"}\n\n`;
          if (rawEntity.relationships) {
            block += `**Relationships**:\n`;
            for (const r of rawEntity.relationships) {
              block += `- ${r.kind} [[${r.target}]]\n`;
            }
            block += `\n`;
          }
          const blockTokens = estimateTokens(block);
          if (currentTokens + blockTokens <= budget) {
            finalOutput += block;
            currentTokens += blockTokens;
            included.add(target);
            expanded.push(target);
          }
        } else {
          // Grounded Fallback: target not in KB at all — grep source code
          if (groundedFallbacks.some(f => f.name === target)) continue;
          const fallback = grepEntityInSource(target, options.projectRoot, entity.sourceFile);
          if (fallback) {
            const block = `\n### ⚡ Grounded Fallback Context: ${target}\n> Resolved via live source search in \`${fallback.filePath}\` (confidence: ${fallback.confidence}). Not yet in \`.knowledge/\` — run \`ingest\` to promote.\n\n\`\`\`typescript\n${fallback.snippet}\n\`\`\`\n\n`;
            const blockTokens = estimateTokens(block);
            if (currentTokens + blockTokens <= budget) {
              finalOutput += block;
              currentTokens += blockTokens;
              groundedFallbacks.push({ name: target, snippet: fallback.snippet, confidence: fallback.confidence });
            }
          }
        }
      }
    }
  }

  // Add elided footnotes (recalc after potential expansions above)
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

  // Append expanded/grounded summary if any
  if (expanded.length > 0 || groundedFallbacks.length > 0) {
    let summary = `\n---\n\n**Pack Integrity Summary:**\n`;
    if (expanded.length > 0) {
      summary += `- 🔄 Dynamic Context Expansion: ${expanded.length} entity(s) re-included to satisfy dependency contracts: ${expanded.join(", ")}\n`;
    }
    if (groundedFallbacks.length > 0) {
      summary += `- ⚡ Live Source Fallback: ${groundedFallbacks.length} entity(s) resolved from source code (not yet in .knowledge/): ${groundedFallbacks.map(f => `${f.name} (${f.confidence})`).join(", ")}\n`;
    }
    const summaryTokens = estimateTokens(summary);
    if (currentTokens + summaryTokens <= budget) {
      finalOutput += summary;
      currentTokens += summaryTokens;
    }
  }

  return {
    output: finalOutput,
    tokens: currentTokens,
    elided: actuallyElided,
    expanded,
    groundedFallbacks,
  };
}
