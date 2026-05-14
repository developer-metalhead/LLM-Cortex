import path from "path";
import { CortexWatcher } from "../core/watcher.js";
import { KnowledgeManager } from "../knowledge/writer.js";
import { synthesizeChanges } from "../llm/client.js";
import { CortexMCPServer } from "../mcp/server.js";

const pendingDiffs: Map<string, string> = new Map();

export async function runWatch(projectRoot: string): Promise<void> {
  const knowledge = new KnowledgeManager(projectRoot);
  await knowledge.init();

  const mode = process.env.INGESTION_MODE || "auto";
  console.log(`  Cortex daemon starting (mode: ${mode})`);
  console.log(`  Watching: ${projectRoot}\n`);

  async function performSync() {
    if (pendingDiffs.size === 0) {
      console.log("  Nothing to sync.");
      return;
    }

    let batchDiff = "";
    for (const [file, diff] of pendingDiffs.entries()) {
      batchDiff += `\nFILE: ${file}\n${diff}\n-------------------\n`;
    }

    console.log(`  Synthesizing ${pendingDiffs.size} pending change(s)...`);
    const context = await knowledge.getKnowledgeSummary();
    const synthesis = await synthesizeChanges(batchDiff, context);

    if (synthesis) {
      await knowledge.saveSynthesis(synthesis);
      await knowledge.updateLastSyncCommit(projectRoot);
      pendingDiffs.clear();
      console.log("  Sync complete. Knowledge base updated.");
    } else {
      console.log("  Synthesis failed — check your API key.");
    }
  }

  // Start MCP server embedded in daemon so IDE tools also trigger real syncs
  const mcpServer = new CortexMCPServer(projectRoot, performSync);
  await mcpServer.start();

  const watcher = new CortexWatcher(projectRoot);
  await watcher.start();

  watcher.on("file_changed", async ({ filePath, diff }: { filePath: string; diff: string }) => {
    if (mode === "manual") {
      pendingDiffs.set(filePath, diff);
      console.log(`  Queued: ${filePath} (type "cortex sync" to flush)`);
      return;
    }

    console.log(`  Change detected: ${filePath}`);
    const context = await knowledge.getKnowledgeSummary();
    const synthesis = await synthesizeChanges(diff, context);
    if (synthesis) {
      await knowledge.saveSynthesis(synthesis);
      await knowledge.updateLastSyncCommit(projectRoot);
      console.log(`  Synthesized: ${filePath}`);
    }
  });

  watcher.on("file_deleted", (filePath: string) => {
    console.log(`  Deleted: ${filePath}`);
  });

  // Manual sync via stdin when in manual mode
  if (process.stdin.isTTY) {
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", async (data: string) => {
      if (data.trim() === "cortex sync") {
        await performSync();
      }
    });
    if (mode === "manual") {
      console.log('  Manual mode active. Type "cortex sync" to flush pending changes.\n');
    }
  }
}
