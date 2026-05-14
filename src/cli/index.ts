#!/usr/bin/env node

import { Command } from "commander";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { setupIDE, getAvailableTargets } from "./setup.js";
import { runInit } from "./init.js";
import { runWatch } from "./watch.js";
import { runStatus } from "./status.js";
import { runConfig } from "./config.js";
import { CortexMCPServer } from "../mcp/server.js";

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
const projectRoot = findProjectRoot(process.cwd());

const program = new Command();

program
  .name("cortex")
  .description("Project Cortex — The Autonomous Brain for your Codebase")
  .version("0.1.0");

program
  .command("init")
  .description("Initialize Cortex in this project (interactive setup)")
  .action(async () => {
    await runInit(projectRoot);
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
  .action(async () => {
    await runStatus(projectRoot);
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
  .action(async (targets: string[]) => {
    console.log("Registering Project Cortex MCP server...\n");
    await setupIDE(projectRoot, targets);
    console.log("\nDone. Restart your IDE to activate the MCP connection.");
  });

program
  .command("mcp")
  .description("Start the Cortex MCP server (STDIO mode)")
  .action(async () => {
    const server = new CortexMCPServer(projectRoot);
    await server.start();
  });

program.parse();
