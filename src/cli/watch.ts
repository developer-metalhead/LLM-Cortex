import fs from "fs/promises";
import path from "path";
import { CortexWatcher } from "../core/watcher.js";
import { KnowledgeManager } from "../knowledge/writer.js";
import { synthesizeChanges } from "../llm/client.js";
import { CortexMCPServer } from "../mcp/server.js";
import { createDaemonLogger } from "../core/logger.js";
import { loadCortexEnv } from "../core/env.js";

const pendingDiffs: Map<string, string> = new Map();

export async function runWatch(projectRoot: string): Promise<void> {
  loadCortexEnv(projectRoot);
  const knowledge = new KnowledgeManager(projectRoot);
  await knowledge.init();

  const logger = createDaemonLogger(projectRoot).child({ component: "daemon" });

  const lockPath = path.join(projectRoot, ".knowledge", "cortex.lock");

  // Robust Lockfile Check
  try {
    const existingPid = await fs.readFile(lockPath, "utf8");
    try {
      process.kill(parseInt(existingPid), 0);
      logger.error(`Cortex daemon is already running (PID: ${existingPid}).`);
      process.exit(1);
    } catch (e) {
      logger.warn({ stalePid: existingPid }, "Stale lockfile detected. Overwriting...");
    }
  } catch (e) {
    // Lock doesn't exist
  }
  await fs.writeFile(lockPath, process.pid.toString());

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

  // Embedded MCP: after IDE save_synthesis, clear manual-mode queue (already ingested via MCP)
  const mcpServer = new CortexMCPServer(projectRoot, async () => {
    pendingDiffs.clear();
    logger.info("Pending diff queue cleared after MCP save_synthesis.");
  });
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
