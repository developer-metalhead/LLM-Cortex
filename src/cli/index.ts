#!/usr/bin/env node

import { Command } from "commander";
import path from "path";
import { fileURLToPath } from "url";
import { setupIDE, getAvailableTargets } from "./setup.js";
import { runInit } from "./init.js";
import { runWatch } from "./watch.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../..");

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

program.parse();
