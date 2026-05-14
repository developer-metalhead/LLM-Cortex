import { KnowledgeManager } from "../knowledge/writer.js";
import dotenv from "dotenv";
import path from "path";
import fs from "fs/promises";

export async function runStatus(projectRoot: string): Promise<void> {
  // Reload env to get latest
  dotenv.config({ path: path.join(projectRoot, ".env") });

  const km = new KnowledgeManager(projectRoot);
  const exists = await km.exists();
  const lastSync = await km.getLastSyncCommit();

  console.log("\n  Project Cortex — Status\n");

  // Config Info
  const provider = process.env.CORTEX_PROVIDER || "not set";
  const model = process.env.CORTEX_MODEL || "default";
  const mode = process.env.INGESTION_MODE || "auto";

  console.log(`  [Config]`);
  console.log(`  Provider:  ${provider}`);
  console.log(`  Model:     ${model}`);
  console.log(`  Mode:      ${mode}\n`);

  // Knowledge Info
  console.log(`  [Knowledge Base]`);
  console.log(`  Location:  ${path.join(projectRoot, ".knowledge")}`);
  console.log(`  Status:    ${exists ? "Initialized" : "Not Initialized"}`);
  console.log(`  Last Sync: ${lastSync || "Never"}\n`);

  // Daemon Info
  const lockPath = path.join(projectRoot, ".knowledge", "cortex.lock");
  let isRunning = false;
  let pid = "";
  try {
    pid = await fs.readFile(lockPath, "utf8");
    try {
      process.kill(parseInt(pid), 0);
      isRunning = true;
    } catch {
      isRunning = false;
    }
  } catch {}

  console.log(`  [Daemon]`);
  console.log(`  Process:   ${isRunning ? `Running (PID: ${pid})` : "Stopped"}\n`);
}
