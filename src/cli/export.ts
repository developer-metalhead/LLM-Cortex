import fs from "fs/promises";
import path from "path";
import { KnowledgeManager } from "../knowledge/writer.js";
import { buildGraph, toMermaid } from "../knowledge/graph.js";

export interface ExportGraphOptions {
  scope?: string;
  depth?: number;
  includeConcepts?: boolean;
}

export async function runExportGraph(projectRoot: string, options: ExportGraphOptions = {}): Promise<string> {
  const km = new KnowledgeManager(projectRoot);
  if (!(await km.exists())) {
    console.log("Knowledge base not initialized. Run `cortex init` first.");
    return "";
  }

  const state = await km.getState();
  const graph = buildGraph(state, {
    scope: options.scope,
    depth: options.depth,
    includeConcepts: options.includeConcepts ?? true,
  });
  const mermaid = toMermaid(graph);
  const initDirective = `%%{init: {'flowchart': {'nodeSpacing': 60, 'rankSpacing': 120}}}%%`;
  const heading = options.scope ? `### Architecture Graph — ${options.scope}` : `### Architecture Graph`;
  const content = `${heading}\n\n\`\`\`mermaid\n${initDirective}\n${mermaid}\n\`\`\`\n`;
  const filename = options.scope
    ? `ARCH_GRAPH_${options.scope.replace(/[^A-Za-z0-9_-]/g, "_")}.md`
    : "ARCH_GRAPH.md";
  const outputPath = path.join(projectRoot, filename);
  await fs.writeFile(outputPath, content, "utf-8");
  console.log(`✅ Architecture graph exported to: ${outputPath} (${graph.nodes.length} nodes, ${graph.edges.length} edges)`);
  return outputPath;
}

export async function runExportSpec(projectRoot: string): Promise<void> {
  const km = new KnowledgeManager(projectRoot);
  if (!(await km.exists())) {
    console.log("Knowledge base not initialized. Run `cortex init` first.");
    return;
  }

  try {
    const outputPath = await km.exportSpec();
    console.log(`✅ Architectural Specification exported to: ${outputPath}`);
  } catch (err: any) {
    console.error("Failed to export specification:", err.message);
  }
}
