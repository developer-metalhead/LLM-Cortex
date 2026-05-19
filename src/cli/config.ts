import fs from "fs/promises";
import path from "path";
import readline from "readline";
import { loadCortexEnv } from "../core/env.js";

function ask(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

export async function runConfig(
  projectRoot: string,
  options: { provider?: string; model?: string; mode?: string; brevity?: string }
): Promise<void> {
  loadCortexEnv(projectRoot);
  const envPath = path.join(projectRoot, ".env");
  let envContent = "";

  try {
    envContent = await fs.readFile(envPath, "utf-8");
  } catch {
    console.error("  Error: .env file not found. Run `cortex init` first.");
    return;
  }

  const lines = envContent.split("\n");
  const config: Record<string, string> = {};

  for (const line of lines) {
    const [key, value] = line.split("=");
    if (key && value) config[key.trim()] = value.trim();
  }

  // Update with flags if provided
  if (options.provider) config["CORTEX_PROVIDER"] = options.provider;
  if (options.model) config["CORTEX_MODEL"] = options.model;
  if (options.mode) config["INGESTION_MODE"] = options.mode;
  if (options.brevity) {
    if (options.brevity !== "lite" && options.brevity !== "ultra" && options.brevity !== "off") {
      console.error("  Error: Brevity must be 'lite', 'ultra', or 'off'.");
      process.exit(1);
    }
    config["CORTEX_BREVITY_LEVEL"] = options.brevity;
    
    const cortexJsonPath = path.join(projectRoot, "cortex.json");
    let cortexJson: Record<string, any> = {};
    try {
      const parsed = JSON.parse(await fs.readFile(cortexJsonPath, "utf-8"));
      cortexJson = parsed;
    } catch {}
    cortexJson.brevity = options.brevity;
    await fs.writeFile(cortexJsonPath, JSON.stringify(cortexJson, null, 2), "utf-8");
  }

  // Interactive mode if no flags
  if (!options.provider && !options.model && !options.mode && !options.brevity) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    console.log("\n  Project Cortex — Configuration Editor\n");

    const providerInput = await ask(rl, `  Provider [${config["CORTEX_PROVIDER"] || "openai"}]: `);
    if (providerInput.trim()) config["CORTEX_PROVIDER"] = providerInput.trim();

    const modelInput = await ask(rl, `  Model [${config["CORTEX_MODEL"] || "default"}]: `);
    if (modelInput.trim()) config["CORTEX_MODEL"] = modelInput.trim();

    const modeInput = await ask(rl, `  Mode [${config["INGESTION_MODE"] || "auto"}]: `);
    if (modeInput.trim()) config["INGESTION_MODE"] = modeInput.trim();

    const brevityInput = await ask(rl, `  Brevity Level [off|lite|ultra] [${config["CORTEX_BREVITY_LEVEL"] || "off"}]: `);
    if (brevityInput.trim()) {
      const val = brevityInput.trim();
      if (val === "lite" || val === "ultra" || val === "off") {
        config["CORTEX_BREVITY_LEVEL"] = val;
        const cortexJsonPath = path.join(projectRoot, "cortex.json");
        let cortexJson: Record<string, any> = {};
        try {
          const parsed = JSON.parse(await fs.readFile(cortexJsonPath, "utf-8"));
          cortexJson = parsed;
        } catch {}
        cortexJson.brevity = val;
        await fs.writeFile(cortexJsonPath, JSON.stringify(cortexJson, null, 2), "utf-8");
      } else {
        console.warn("  Warning: Invalid brevity level ignored.");
      }
    }

    rl.close();
  }

  // Write back
  const newEnvContent = Object.entries(config)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n") + "\n";

  await fs.writeFile(envPath, newEnvContent, "utf-8");
  console.log("\n  Configuration updated successfully.");
}
