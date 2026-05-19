// Phase 8 — `cortex graph` CLI command.
// Loads state.json, builds the knowledge graph, and emits Mermaid / JSON
// to stdout (or to --output file).

import fs from "fs/promises";
import path from "path";
import { KnowledgeManager } from "../knowledge/writer.js";
import { buildGraph, toMermaid, toJson } from "../knowledge/graph.js";

export interface RunGraphOptions {
  scope?: string;
  depth?: number;
  includeConcepts?: boolean;
  format?: "mermaid" | "json";
  output?: string;
}

export async function runGraph(
  projectRoot: string,
  options: RunGraphOptions = {},
): Promise<number> {
  const km = new KnowledgeManager(projectRoot);

  if (!(await km.exists())) {
    console.error("Knowledge base not initialized. Run `cortex init` first.");
    return 1;
  }

  const state = await km.getState();
  const entityCount = Object.keys(state.entities).length;
  const conceptCount = Object.keys(state.concepts).length;

  if (entityCount === 0 && conceptCount === 0) {
    console.error("Knowledge base is empty. Run `/ingest_cortex` to populate it first.");
    return 1;
  }

  const graph = buildGraph(state, {
    scope: options.scope,
    depth: options.depth,
    includeConcepts: options.includeConcepts,
  });

  const format = options.format ?? "mermaid";
  let output: string;

  if (format === "json") {
    output = toJson(graph);
  } else {
    output = toMermaid(graph);
  }

  if (options.output) {
    const outPath = path.resolve(projectRoot, options.output);
    await fs.writeFile(outPath, output, "utf8");
    console.log(`Graph written to ${outPath} (${graph.nodes.length} nodes, ${graph.edges.length} edges)`);
  } else {
    process.stdout.write(output + "\n");
  }

  return 0;
}
