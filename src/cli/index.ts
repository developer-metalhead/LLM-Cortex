#!/usr/bin/env node

import { Command } from "commander";
import path from "path";
import { fileURLToPath } from "url";
import { setupIDE, getAvailableTargets } from "./setup.js";
import { runInit } from "./init.js";
import { runWatch } from "./watch.js";
import { runStatus } from "./status.js";
import { runConfig } from "./config.js";
import { CortexMCPServer } from "../mcp/server.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = process.cwd();

const program = new Command();

program
  .name("cortex")
  .description("Project Cortex — The Autonomous Brain for your Codebase")
  .version("1.0.0");

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
  .command("status")
  .description("Show the current status of Project Cortex")
  .action(async () => {
    await runStatus(projectRoot);
  });

program
  .command("config")
  .description("Update the Project Cortex configuration")
  .option("-p, --provider <provider>", "LLM provider")
  .option("-m, --model <model>", "LLM model")
  .option("-M, --mode <mode>", "Ingestion mode (auto/manual)")
  .action(async (options) => {
    await runConfig(projectRoot, options);
  });

program
  .command("mcp")
  .description("Start the Cortex MCP server (STDIO mode)")
  .option("-r, --root <path>", "Project root directory", projectRoot)
  .action(async (options) => {
    const server = new CortexMCPServer(options.root);
    await server.start();
  });

program.parse();
