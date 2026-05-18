import { KnowledgeManager } from "../knowledge/writer.js";
import { AuditManager } from "../knowledge/audit.js";

// Returns exit code: 0 = no findings, 1 = stale entities present.
export async function runAuditStale(projectRoot: string): Promise<number> {
  const km = new KnowledgeManager(projectRoot);
  if (!(await km.exists())) {
    console.log("Knowledge base not initialized. Run `cortex init` first.");
    return 0;
  }

  const staleEntities = await km.getStaleEntities();
  if (staleEntities.length === 0) {
    console.log("✅ No stale entities found.");
    return 0;
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
  return 1;
}

// Returns exit code: 0 = no findings, 1 = evidence drift present.
export async function runAuditEvidence(projectRoot: string): Promise<number> {
  const am = new AuditManager(projectRoot);
  const issues = await am.auditEvidence();

  if (issues.length === 0) {
    console.log("✅ No evidence drift detected.");
    return 0;
  }

  console.log(`⚠️  Found ${issues.length} evidence issues:\n`);
  for (const issue of issues) {
    console.log(`- ${issue.entity}: ${issue.issue}`);
    console.log(`  Source: ${issue.sourceFile}`);
    if (issue.detail) console.log(`  Detail: ${issue.detail}`);
    console.log("");
  }
  return 1;
}
