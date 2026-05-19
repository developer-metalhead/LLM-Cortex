import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import dotenv from "dotenv";
import { KnowledgeManager } from "../knowledge/writer.js";
import { AuditManager } from "../knowledge/audit.js";

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
  let staleCount = 0;
  let evidenceDriftCount = 0;
  let lowQualityCount = 0;
  if (exists) {
    try {
      lastSync = fs.readFileSync(path.join(projectRoot, ".knowledge", ".last_sync_commit"), "utf-8").trim();
      const statePath = path.join(projectRoot, ".knowledge", "state.json");
      const state = JSON.parse(fs.readFileSync(statePath, "utf-8"));
      staleCount = Object.values(state.entities || {}).filter((e: any) => e.staleSince).length;
    } catch {
      // ignore
    }
    try {
      const am = new AuditManager(projectRoot);
      evidenceDriftCount = await am.getEvidenceDriftCount();
    } catch {
      // ignore
    }
    try {
      // Phase 7.5 — entities under the configurable quality gate (CORTEX_QUALITY_GATE).
      lowQualityCount = await km.getLowQualityCount();
    } catch {
      // ignore
    }
  }

  const lockLine = describeLock(projectRoot);
  const logPath = path.join(projectRoot, "cortex.log");
  const logHint = fs.existsSync(logPath) ? `Daemon log: ${logPath}` : "Daemon log: (none yet — created when you run `cortex watch`)";

  console.log(`
  Project Cortex — Status  (tip: \`cortex status --next\` for a single recommended action)

  [Config]
  Provider:  ${env.CORTEX_PROVIDER || "not set"}
  Model:     ${env.CORTEX_MODEL || "default"}
  Mode:      ${env.INGESTION_MODE || "auto"}

  [Knowledge Base]
  Location:  ${path.join(projectRoot, ".knowledge")}
  Status:    ${exists ? "Initialized" : "Not Initialized"}
  Last Sync: ${lastSync}
  Stale Entities: ${staleCount}
  Evidence Drift: ${evidenceDriftCount}
  Low Quality:    ${lowQualityCount}

  [Daemon]
  ${lockLine}
  ${logHint}
  `);
}

export async function runStatusNext(projectRoot: string): Promise<void> {
  const km = new KnowledgeManager(projectRoot);

  if (!(await km.exists())) {
    console.log("Knowledge base not initialized — run `cortex init`");
    return;
  }

  if (await km.isEmpty()) {
    console.log("Knowledge base is empty — run `/ingest_cortex` (IDE route) or `cortex watch` then `cortex sync` (daemon route)");
    return;
  }

  const lastSync = await km.getLastSyncCommit();
  if (!lastSync || lastSync === "never synced" || lastSync === "no-commits") {
    console.log("Never synced — run `/ingest_cortex` to build initial knowledge");
    return;
  }

  try {
    const out = execSync(`git diff --name-only ${lastSync}..HEAD`, {
      cwd: projectRoot,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"],
    }).trim();

    const changed = out
      .split("\n")
      .filter((f) => f && !f.startsWith(".knowledge/") && !f.startsWith("node_modules/"))
      .length;

    if (changed === 0) {
      console.log("Knowledge base is up to date — nothing to sync");
    } else {
      console.log(`${changed} file${changed === 1 ? "" : "s"} changed since last sync — run \`/ingest_cortex\` or \`cortex sync\``);
    }
  } catch {
    console.log("Could not determine pending changes — run `git status` to check");
  }
}
