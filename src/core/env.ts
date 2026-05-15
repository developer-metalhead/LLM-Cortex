import fs from "fs";
import path from "path";
import os from "os";
import dotenv from "dotenv";

/**
 * Load env in order: ~/.cortexrc (optional), then project `.env` (overrides).
 * API keys in ~/.cortexrc are never logged by callers — avoid echoing process.env.
 */
export function loadCortexEnv(projectRoot: string): void {
  const homeRc = path.join(os.homedir(), ".cortexrc");
  if (fs.existsSync(homeRc)) {
    // quiet: true suppresses dotenv@17's tip log, which would otherwise
    // pollute STDOUT and break MCP STDIO clients (they parse stdout as JSON).
    dotenv.config({ path: homeRc, override: false, quiet: true } as any);
  }
  const envPath = path.join(projectRoot, ".env");
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: true, quiet: true } as any);
  }
}
