import fs from "fs";
import path from "path";

export async function runAuditStale(projectRoot: string): Promise<void> {
  const statePath = path.join(projectRoot, ".knowledge", "state.json");
  if (!fs.existsSync(statePath)) {
    console.log("Knowledge base not initialized or state.json missing.");
    return;
  }

  try {
    const state = JSON.parse(fs.readFileSync(statePath, "utf-8"));
    const staleEntities = Object.entries(state.entities || {})
      .filter(([_, e]: [string, any]) => e.staleSince)
      .map(([name, e]: [string, any]) => ({ name, staleSince: e.staleSince }));

    if (staleEntities.length === 0) {
      console.log("✅ No stale entities found.");
      return;
    }

    console.log(`⚠️  Found ${staleEntities.length} stale entities:\n`);
    for (const entity of staleEntities) {
      console.log(`- ${entity.name}`);
      console.log(`  Stale since: ${entity.staleSince}`);
      console.log(`  File: .knowledge/entities/${entity.name.replace(/[/\\:*?"<>|]/g, "_")}.md\n`);
    }

    console.log("To resolve, review these entities and update them via the AI agent.");
  } catch (err: any) {
    console.error("Failed to read state.json:", err.message);
  }
}
