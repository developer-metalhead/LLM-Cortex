import { KnowledgeManager } from "../knowledge/writer.js";
import { getPendingDiff } from "../core/diff.js";

export async function runSync(projectRoot: string, options: { lens?: string }): Promise<number> {
  if (options.lens) {
    process.env.CORTEX_LENS = options.lens;
  }

  const km = new KnowledgeManager(projectRoot);
  if (!(await km.exists())) {
    console.log("Knowledge base not initialized. Run `cortex init` first.");
    return 1;
  }

  const lastSync = await km.getLastSyncCommit();
  const diff = await getPendingDiff(projectRoot, lastSync);

  if (!diff || diff.trim().length === 0) {
    console.log("No pending changes — knowledge base is up to date.");
    return 0;
  }

  const lineCount = diff.split("\n").length;
  console.log(`Pending changes detected (~${lineCount} lines of diff)`);
  console.log("Run `cortex ingest` (MCP) or use your IDE to trigger a knowledge sync.");
  if (options.lens) {
    console.log(`Active lens: ${options.lens} (set via --lens flag)`);
  }
  return 0;
}
