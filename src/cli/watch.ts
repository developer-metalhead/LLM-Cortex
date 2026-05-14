import fs from "fs/promises";
import path from "path";
import { CortexWatcher } from "../core/watcher.js";
import { KnowledgeManager } from "../knowledge/writer.js";
import { synthesizeChanges } from "../llm/client.js";
import { CortexMCPServer } from "../mcp/server.js";
import { daemonLogger as logger } from "../core/logger.js";

const pendingDiffs: Map<string, string> = new Map();

export async function runWatch(projectRoot: string): Promise<void> {
  const knowledge = new KnowledgeManager(projectRoot);
  await knowledge.init();

  const lockPath = path.join(projectRoot, ".knowledge", "cortex.lock");

  // Check for lockfile
  try {
    await fs.access(lockPath);
    logger.error("Cortex daemon is already running (lockfile exists).");
    process.exit(1);
  } catch {
    // Lock doesn't exist, create it
    await fs.writeFile(lockPath, process.pid.toString());
  }

  const mode = process.env.INGESTION_MODE || "auto";
  logger.info({ mode, projectRoot }, "Cortex daemon starting");

  async function performSync() {
    if (pendingDiffs.size === 0) {
      logger.info("Nothing to sync.");
      return;
    }

    let batchDiff = "";
    for (const [file, diff] of pendingDiffs.entries()) {
      batchDiff += `\nFILE: ${file}\n${diff}\n-------------------\n`;
    }

    logger.info({ count: pendingDiffs.size }, "Synthesizing pending changes...");
    const context = await knowledge.getKnowledgeSummary();
    const synthesis = await synthesizeChanges(batchDiff, context);

    if (synthesis) {
      await knowledge.saveSynthesis(synthesis);
      await knowledge.updateLastSyncCommit(projectRoot);
      pendingDiffs.clear();
      logger.info("Sync complete. Knowledge base updated.");
    } else {
      logger.error("Synthesis failed — check your API key.");
    }
  }

  // Graceful shutdown
  const shutdown = async () => {
    logger.info("Cortex daemon shutting down...");
    try {
      await fs.unlink(lockPath);
    } catch (e) {}
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  // Start MCP server embedded in daemon so IDE tools also trigger real syncs
  const mcpServer = new CortexMCPServer(projectRoot, performSync);
  await mcpServer.start();

  const watcher = new CortexWatcher(projectRoot);
  await watcher.start();

  watcher.on("file_changed", async ({ filePath, diff }: { filePath: string; diff: string }) => {
    if (mode === "manual") {
      pendingDiffs.set(filePath, diff);
      logger.info({ filePath }, "Queued change (manual mode)");
      return;
    }

    logger.info({ filePath }, "Change detected");
    const context = await knowledge.getKnowledgeSummary();
    const synthesis = await synthesizeChanges(diff, context);
    if (synthesis) {
      await knowledge.saveSynthesis(synthesis);
      await knowledge.updateLastSyncCommit(projectRoot);
      logger.info({ filePath }, "Synthesized successfully");
    }
  });

  watcher.on("file_deleted", (filePath: string) => {
    logger.info({ filePath }, "File deleted");
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
