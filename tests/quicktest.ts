import { SmartReadCache } from "../src/knowledge/readCache.js";
import fs from "fs/promises";
import fsSync from "fs";
import os from "os";
import path from "path";

const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "test-"));
const fp = path.join(tmp, "test.ts");
await fs.writeFile(fp, "line1\nline2\nline3\n", "utf-8");

const cache = new SmartReadCache();
console.log("First read...");
const r1 = cache.get(fp);
console.log("first:", r1.cacheStatus, r1.mode);

console.log("Writing changed content...");
await fs.writeFile(fp, "line1\nline2_changed\nline3\nline4\n", "utf-8");

console.log("Manual statSync...");
const stat1 = fsSync.statSync(fp);
console.log("  size:", stat1.size, "mtimeMs:", stat1.mtimeMs);

console.log("Manual readFileSync...");
const manualContent = fsSync.readFileSync(fp, "utf-8");
console.log("  content:", JSON.stringify(manualContent));

console.log("Now calling cache.get...");
try {
  const r2 = cache.get(fp);
  console.log("re-read:", r2.cacheStatus, r2.mode, "content:", JSON.stringify(r2.content?.substring(0, 200)));
} catch (e) {
  console.log("Error:", e);
}

await fs.rm(tmp, { recursive: true, force: true });
console.log("DONE");
