import { AuditManager } from "../knowledge/audit.js";

export async function runLog(
  projectRoot: string,
  options: { entity?: string; since?: string; warningsOnly?: boolean },
): Promise<void> {
  const am = new AuditManager(projectRoot);
  const entries = await am.queryLog({
    entity: options.entity,
    since: options.since,
    warningsOnly: options.warningsOnly,
  });

  if (entries.length === 0) {
    console.log("No log entries found matching criteria.");
    return;
  }

  for (const entry of entries) {
    console.log(`## [${entry.timestamp}]`);
    if (entry.clustered) {
      console.log(`[clustered: ${entry.clusterCount} groups]`);
    }
    if (entry.migrated) {
      console.log(`[migrated]`);
    }
    console.log(`Summary: ${entry.summary}`);
    console.log(`Impacted: ${entry.entities.map(e => `[[${e}]]`).join(", ")}`);
    if (entry.warnings && entry.warnings.length > 0) {
      console.log(`Warnings: ${entry.warnings.join("; ")}`);
    }
    console.log("---");
  }
}
