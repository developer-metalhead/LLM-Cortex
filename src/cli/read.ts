import { KnowledgeManager } from "../knowledge/writer.js";

export async function runRead(projectRoot: string, options: { entity?: string; concept?: string }): Promise<void> {
  const km = new KnowledgeManager(projectRoot);

  if (!(await km.exists())) {
    console.log("\n  Knowledge base not initialized. Run `cortex init` first.\n");
    return;
  }

  if (options.entity) {
    const body = await km.readEntity(options.entity);
    if (!body) {
      console.log(`\n  No entity named "${options.entity}" found.`);
      console.log("  Run `cortex read` (no flags) to see all available names.\n");
      return;
    }
    console.log("\n" + body);
    return;
  }

  if (options.concept) {
    const body = await km.readConcept(options.concept);
    if (!body) {
      console.log(`\n  No concept named "${options.concept}" found.`);
      console.log("  Run `cortex read` (no flags) to see all available names.\n");
      return;
    }
    console.log("\n" + body);
    return;
  }

  // Default: print the full rich index
  const index = await km.getKnowledgeSummary();
  console.log("\n" + index);
}
