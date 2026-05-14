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
    dotenv.config({ path: homeRc, override: false } as any);
  }
  const envPath = path.join(projectRoot, ".env");
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: true } as any);
  }
}
