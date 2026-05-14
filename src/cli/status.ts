import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { KnowledgeManager } from "../knowledge/writer.js";

export async function runStatus(projectRoot: string) {
  const envPath = path.join(projectRoot, ".env");
  const env = fs.existsSync(envPath) ? dotenv.parse(fs.readFileSync(envPath)) : {};
  const km = new KnowledgeManager(projectRoot);
  const exists = await km.exists();
  
  let lastSync = "Never";
  try {
    lastSync = fs.readFileSync(path.join(projectRoot, ".knowledge", ".last_sync_commit"), "utf-8");
  } catch (e) {}

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
  `);
}
