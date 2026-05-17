import { KnowledgeManager } from "../knowledge/writer.js";

export async function runAuditStale(projectRoot: string): Promise<void> {
  const km = new KnowledgeManager(projectRoot);
  if (!(await km.exists())) {
    console.log("Knowledge base not initialized. Run `cortex init` first.");
    return;
  }

  const staleEntities = await km.getStaleEntities();
  if (staleEntities.length === 0) {
    console.log("✅ No stale entities found.");
    return;
  }

  console.log(`⚠️  Found ${staleEntities.length} stale entities:\n`);
  for (const entity of staleEntities) {
    const safeName = entity.name.replace(/[/\\:*?"<>|]/g, "_");
    console.log(`- ${entity.name}`);
    console.log(`  Stale since: ${entity.staleSince}`);
    if (entity.sourceFile) console.log(`  Source: ${entity.sourceFile}`);
    console.log(`  File: .knowledge/entities/${safeName}.md\n`);
  }

  console.log("To resolve, review these entities and update them via the AI agent (e.g. `/ingest_cortex`).");
}
