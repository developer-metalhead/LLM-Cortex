#!/usr/bin/env node

import { Command } from "commander";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { setupIDE, getAvailableTargets } from "./setup.js";
import { runInit, runInitMagic } from "./init.js";
import { runWatch } from "./watch.js";
import { runStatus, runStatusNext } from "./status.js";
import { runConfig } from "./config.js";
import { runRead } from "./read.js";
import { CortexMCPServer } from "../mcp/server.js";
import { loadCortexEnv } from "../core/env.js";
import { runAuditStale, runAuditEvidence } from "./audit.js";
import { runExportSpec } from "./export.js";
import { runHookInstall } from "./hook.js";
import { runLog } from "./log.js";
import { runLint } from "./lint.js";
import { runEvolution } from "./evolution.js";

// Smart Root Detection: Climb up until we find .knowledge or .git
function findProjectRoot(startDir: string): string {
  let current = startDir;
  while (current !== path.parse(current).root) {
    if (fs.existsSync(path.join(current, ".knowledge")) || fs.existsSync(path.join(current, ".git"))) {
      return current;
    }
    current = path.dirname(current);
  }
  return startDir;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function readCliVersion(): string {
  const pkgPath = path.join(__dirname, "..", "..", "package.json");
  try {
    const raw = fs.readFileSync(pkgPath, "utf8");
    return JSON.parse(raw).version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

const projectRoot = findProjectRoot(process.cwd());
loadCortexEnv(projectRoot);

const program = new Command();

program
  .name("cortex")
  .description("Project Cortex — The Autonomous Brain for your Codebase")
  .version(readCliVersion());

program
  .command("init")
  .description("Initialize Cortex in this project (interactive setup)")
  .option("--magic", "Non-interactive setup: auto-detect IDEs, scaffold .knowledge/, register all, done")
  .action(async (options) => {
    if (options.magic) {
      await runInitMagic(projectRoot);
    } else {
      await runInit(projectRoot);
    }
  });

program
  .command("watch")
  .description("Start the Cortex background daemon (API keys route)")
  .action(async () => {
    await runWatch(projectRoot);
  });

program
  .command("status")
  .description("Check the health and configuration of Project Cortex")
  .option("--next", "Print a single recommended next action based on current state")
  .action(async (options) => {
    if (options.next) {
      await runStatusNext(projectRoot);
    } else {
      await runStatus(projectRoot);
    }
  });

program
  .command("config")
  .description("Update LLM provider, model, or ingestion mode")
  .option("-p, --provider <provider>", "LLM provider (openai, anthropic, google, local)")
  .option("-m, --model <model>", "LLM model ID")
  .option("-i, --mode <mode>", "Ingestion mode (auto, manual)")
  .action(async (options) => {
    await runConfig(projectRoot, options);
  });

program
  .command("setup")
  .description("Register the Cortex MCP server in IDE configs (IDE route)")
  .argument(
    "[targets...]",
    `IDEs to configure: ${getAvailableTargets().join(", ")}, or "all"`,
    ["all"]
  )
  .option(
    "--local",
    "For Antigravity: write the per-project config (.antigravity/mcp_config.json) instead of the global ~/.gemini/antigravity/mcp_config.json. Other IDEs ignore this flag."
  )
  .action(async (targets: string[], options: { local?: boolean }) => {
    console.log("Registering Project Cortex MCP server...\n");
    await setupIDE(projectRoot, targets, { local: !!options.local });
    console.log("\nDone. Restart your IDE to activate the MCP connection.");
  });

program
  .command("read")
  .description("Print the knowledge index (or a specific entity/concept page)")
  .option("-e, --entity <name>", "Print the full page for a specific entity")
  .option("-c, --concept <name>", "Print the full page for a specific concept")
  .action(async (options) => {
    await runRead(projectRoot, options);
  });

program
  .command("mcp")
  .description("Start the Cortex MCP server (STDIO mode)")
  .option("--project-root <path>", "Explicit project root (overrides auto-detection)")
  .action(async (options) => {
    const explicit = !!options.projectRoot;
    const root = explicit ? path.resolve(options.projectRoot) : projectRoot;
    loadCortexEnv(root);
    // When the CLI was launched without --project-root (the portable-entry
    // case for Antigravity etc.), pass explicit=false so the server queries
    // the client for workspace roots after the MCP handshake.
    const server = new CortexMCPServer(root, undefined, explicit);
    await server.start();
  });

program
  .command("audit")
  .description("Audit the knowledge base")
  .argument("<type>", "Type of audit to perform (currently supports: 'stale', 'evidence')")
  .action(async (type) => {
    let code = 0;
    if (type === "stale") {
      code = await runAuditStale(projectRoot);
    } else if (type === "evidence") {
      code = await runAuditEvidence(projectRoot);
    } else {
      console.log(`Unknown audit type: ${type}. Supported: 'stale', 'evidence'`);
      code = 2;
    }
    process.exitCode = code;
  });

program
  .command("log")
  .description("Query the architectural log")
  .option("-e, --entity <name>", "Filter by entity")
  .option("-s, --since <date|commit>", "Filter since date or git commit hash")
  .option("-w, --warnings-only", "Only show entries with warnings")
  .action(async (options) => {
    await runLog(projectRoot, options);
  });

program
  .command("lint")
  .description("Run graph integrity checks")
  .action(async () => {
    const code = await runLint(projectRoot);
    process.exitCode = code;
  });

program
  .command("evolution")
  .description("Reconstruct timeline for an entity, or replay the index at a past point")
  .argument("[entity]", "Entity name (omit when using --replay)")
  .option("-s, --since <date|commit>", "Filter timeline entries newer than the given date or commit")
  .option("-f, --format <format>", "Output format: markdown (default) or json", "markdown")
  .option("--replay", "Reconstruct the rendered index.md as it stood at a past point")
  .option("--at <date|commit>", "(with --replay) the point in history to replay to")
  .action(async (entity, options) => {
    await runEvolution(projectRoot, entity, {
      since: options.since,
      format: options.format,
      replay: !!options.replay,
      at: options.at,
    });
  });

program
  .command("export")
  .description("Export knowledge base")
  .option("--spec", "Export as ARCH_SPEC.md")
  .action(async (options) => {
    if (options.spec) {
      await runExportSpec(projectRoot);
    } else {
      console.log("Usage: cortex export --spec");
    }
  });

program
  .command("hook")
  .description("Install Git pre-commit hook to remind about architectural sync")
  .action(async () => {
    await runHookInstall(projectRoot);
  });

program.parse();
