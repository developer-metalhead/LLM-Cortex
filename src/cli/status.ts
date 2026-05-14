import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { KnowledgeManager } from "../knowledge/writer.js";

function describeLock(projectRoot: string): string {
  const lockPath = path.join(projectRoot, ".knowledge", "cortex.lock");
  if (!fs.existsSync(lockPath)) {
    return "No lock file (daemon not running or not holding lock).";
  }
  let pidStr = "";
  try {
    pidStr = fs.readFileSync(lockPath, "utf-8").trim();
  } catch {
    return "Lock file present but unreadable.";
  }
  const pid = parseInt(pidStr, 10);
  if (Number.isNaN(pid)) {
    return `Lock file present (invalid PID: ${pidStr}).`;
  }
  try {
    process.kill(pid, 0);
    return `Daemon lock active (PID ${pid} appears to be running).`;
  } catch {
    return `Stale lock file (PID ${pid} not running).`;
  }
}

export async function runStatus(projectRoot: string): Promise<void> {
  const envPath = path.join(projectRoot, ".env");
  const env = fs.existsSync(envPath) ? dotenv.parse(fs.readFileSync(envPath, "utf8")) : {};
  const km = new KnowledgeManager(projectRoot);
  const exists = await km.exists();

  let lastSync = "Never";
  try {
    lastSync = fs.readFileSync(path.join(projectRoot, ".knowledge", ".last_sync_commit"), "utf-8").trim();
  } catch {
    // ignore
  }

  const lockLine = describeLock(projectRoot);
  const logPath = path.join(projectRoot, "cortex.log");
  const logHint = fs.existsSync(logPath) ? `Daemon log: ${logPath}` : "Daemon log: (none yet — created when you run `cortex watch`)";

  console.log(`
  Project Cortex — Status

  [Config]
  Provider:  ${env.CORTEX_PROVIDER || "not set"}
  Model:     ${env.CORTEX_MODEL || "default"}
  Mode:      ${env.INGESTION_MODE || "auto"}

  [Knowledge Base]
  Location:  ${path.join(projectRoot, ".knowledge")}
  Status:    ${exists ? "Initialized" : "Not Initialized"}
  Last Sync: ${lastSync}

  [Daemon]
  ${lockLine}
  ${logHint}
  `);
}
