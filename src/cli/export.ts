import { KnowledgeManager } from "../knowledge/writer.js";

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
