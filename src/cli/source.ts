import { SmartReadCache } from "../knowledge/readCache.js";
import fs from "fs";
import path from "path";

export async function runSource(
  projectRoot: string,
  filePath: string,
  options: { mode?: string; bypass?: boolean; stats?: boolean }
): Promise<number> {
  const cache = new SmartReadCache();

  if (options.stats) {
    console.log(JSON.stringify(cache.stats(), null, 2));
    return 0;
  }

  if (!filePath) {
    console.log("Usage: cortex source <file-path> [--mode auto|full|skeleton|diff] [--bypass]");
    return 1;
  }

  const absolutePath = path.resolve(projectRoot, filePath);

  if (!fs.existsSync(absolutePath)) {
    console.error(`Error: file not found — ${filePath}`);
    return 1;
  }

  const result = cache.get(absolutePath, options.bypass ? "full" : (options.mode as any) || "auto");

  if (result.cacheStatus === "first_read") {
    console.log(result.content);
    console.error(`\n📦 [source] First read — cached for session`);
  } else {
    console.log(result.content);
    const pct = result.originalChars > 0
      ? Math.round((1 - result.returnedChars / result.originalChars) * 100)
      : 0;
    console.error(`\n📦 [source] ${result.cacheStatus} — saved ~${result.tokenSavings} chars (${pct}% reduction)`);
  }

  return 0;
}
