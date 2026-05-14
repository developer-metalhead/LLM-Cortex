// Daemon entry point — delegates to the watch CLI command
import path from "path";
import { fileURLToPath } from "url";
import { runWatch } from "./cli/watch.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

runWatch(projectRoot).catch((err) => {
  console.error("Cortex daemon error:", err);
  process.exit(1);
});
