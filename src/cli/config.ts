import fs from "fs/promises";
import path from "path";
import readline from "readline";
import { loadCortexEnv } from "../core/env.js";

function ask(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

function isClearValue(str: string): boolean {
  const normalized = str.trim().toLowerCase();
  return normalized === "none" || normalized === "clear" || normalized === "off" || normalized === "0";
}

export async function runConfig(
  projectRoot: string,
  options: { provider?: string; model?: string; mode?: string; brevity?: string; maxCost?: string; maxSyncsHour?: string }
): Promise<void> {
  loadCortexEnv(projectRoot);
  const envPath = path.join(projectRoot, ".env");
  let envContent = "";
  let hasEnv = true;

  try {
    envContent = await fs.readFile(envPath, "utf-8");
  } catch {
    hasEnv = false;
  }

  const config: Record<string, string> = {};
  if (hasEnv) {
    const lines = envContent.split("\n");
    for (const line of lines) {
      const [key, value] = line.split("=");
      if (key && value) config[key.trim()] = value.trim();
    }
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

  if (options.maxCost !== undefined) {
    const rawVal = options.maxCost.trim();
    if (isClearValue(rawVal)) {
      delete config["CORTEX_MAX_SESSION_COST_USD"];
      
      const cortexJsonPath = path.join(projectRoot, "cortex.json");
      let cortexJson: Record<string, any> = {};
      try {
        cortexJson = JSON.parse(await fs.readFile(cortexJsonPath, "utf-8"));
      } catch {}
      if (cortexJson.safeguards) {
        delete cortexJson.safeguards.maxSessionCostUsd;
        if (Object.keys(cortexJson.safeguards).length === 0) {
          delete cortexJson.safeguards;
        }
      }
      await fs.writeFile(cortexJsonPath, JSON.stringify(cortexJson, null, 2), "utf-8");
    } else {
      const val = parseFloat(rawVal);
      if (!isNaN(val)) {
        config["CORTEX_MAX_SESSION_COST_USD"] = val.toString();
        
        const cortexJsonPath = path.join(projectRoot, "cortex.json");
        let cortexJson: Record<string, any> = {};
        try {
          cortexJson = JSON.parse(await fs.readFile(cortexJsonPath, "utf-8"));
        } catch {}
        cortexJson.safeguards = cortexJson.safeguards || {};
        cortexJson.safeguards.maxSessionCostUsd = val;
        await fs.writeFile(cortexJsonPath, JSON.stringify(cortexJson, null, 2), "utf-8");
      } else {
        console.error("  Error: max-cost must be a numeric value, or 'none', 'clear', 'off', '0' to disable.");
        process.exit(1);
      }
    }
  }

  if (options.maxSyncsHour !== undefined) {
    const rawVal = options.maxSyncsHour.trim();
    if (isClearValue(rawVal)) {
      delete config["CORTEX_MAX_SYNC_CALLS_PER_HOUR"];
      
      const cortexJsonPath = path.join(projectRoot, "cortex.json");
      let cortexJson: Record<string, any> = {};
      try {
        cortexJson = JSON.parse(await fs.readFile(cortexJsonPath, "utf-8"));
      } catch {}
      if (cortexJson.safeguards) {
        delete cortexJson.safeguards.maxSyncCallsPerHour;
        if (Object.keys(cortexJson.safeguards).length === 0) {
          delete cortexJson.safeguards;
        }
      }
      await fs.writeFile(cortexJsonPath, JSON.stringify(cortexJson, null, 2), "utf-8");
    } else {
      const val = parseInt(rawVal, 10);
      if (!isNaN(val)) {
        config["CORTEX_MAX_SYNC_CALLS_PER_HOUR"] = val.toString();
        
        const cortexJsonPath = path.join(projectRoot, "cortex.json");
        let cortexJson: Record<string, any> = {};
        try {
          cortexJson = JSON.parse(await fs.readFile(cortexJsonPath, "utf-8"));
        } catch {}
        cortexJson.safeguards = cortexJson.safeguards || {};
        cortexJson.safeguards.maxSyncCallsPerHour = val;
        await fs.writeFile(cortexJsonPath, JSON.stringify(cortexJson, null, 2), "utf-8");
      } else {
        console.error("  Error: max-syncs-hour must be an integer value, or 'none', 'clear', 'off', '0' to disable.");
        process.exit(1);
      }
    }
  }

  // Interactive mode if no flags
  if (!options.provider && !options.model && !options.mode && !options.brevity && options.maxCost === undefined && options.maxSyncsHour === undefined) {
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

    const maxCostInput = await ask(rl, `  Max Session Cost USD [${config["CORTEX_MAX_SESSION_COST_USD"] || "none"}]: `);
    if (maxCostInput.trim()) {
      const inputStr = maxCostInput.trim();
      if (isClearValue(inputStr)) {
        delete config["CORTEX_MAX_SESSION_COST_USD"];
        const cortexJsonPath = path.join(projectRoot, "cortex.json");
        let cortexJson: Record<string, any> = {};
        try {
          cortexJson = JSON.parse(await fs.readFile(cortexJsonPath, "utf-8"));
        } catch {}
        if (cortexJson.safeguards) {
          delete cortexJson.safeguards.maxSessionCostUsd;
          if (Object.keys(cortexJson.safeguards).length === 0) {
            delete cortexJson.safeguards;
          }
        }
        await fs.writeFile(cortexJsonPath, JSON.stringify(cortexJson, null, 2), "utf-8");
      } else {
        const val = parseFloat(inputStr);
        if (!isNaN(val)) {
          config["CORTEX_MAX_SESSION_COST_USD"] = val.toString();
          const cortexJsonPath = path.join(projectRoot, "cortex.json");
          let cortexJson: Record<string, any> = {};
          try {
            cortexJson = JSON.parse(await fs.readFile(cortexJsonPath, "utf-8"));
          } catch {}
          cortexJson.safeguards = cortexJson.safeguards || {};
          cortexJson.safeguards.maxSessionCostUsd = val;
          await fs.writeFile(cortexJsonPath, JSON.stringify(cortexJson, null, 2), "utf-8");
        }
      }
    }

    const maxSyncsHourInput = await ask(rl, `  Max Sync Calls Per Hour [${config["CORTEX_MAX_SYNC_CALLS_PER_HOUR"] || "none"}]: `);
    if (maxSyncsHourInput.trim()) {
      const inputStr = maxSyncsHourInput.trim();
      if (isClearValue(inputStr)) {
        delete config["CORTEX_MAX_SYNC_CALLS_PER_HOUR"];
        const cortexJsonPath = path.join(projectRoot, "cortex.json");
        let cortexJson: Record<string, any> = {};
        try {
          cortexJson = JSON.parse(await fs.readFile(cortexJsonPath, "utf-8"));
        } catch {}
        if (cortexJson.safeguards) {
          delete cortexJson.safeguards.maxSyncCallsPerHour;
          if (Object.keys(cortexJson.safeguards).length === 0) {
            delete cortexJson.safeguards;
          }
        }
        await fs.writeFile(cortexJsonPath, JSON.stringify(cortexJson, null, 2), "utf-8");
      } else {
        const val = parseInt(inputStr, 10);
        if (!isNaN(val)) {
          config["CORTEX_MAX_SYNC_CALLS_PER_HOUR"] = val.toString();
          const cortexJsonPath = path.join(projectRoot, "cortex.json");
          let cortexJson: Record<string, any> = {};
          try {
            cortexJson = JSON.parse(await fs.readFile(cortexJsonPath, "utf-8"));
          } catch {}
          cortexJson.safeguards = cortexJson.safeguards || {};
          cortexJson.safeguards.maxSyncCallsPerHour = val;
          await fs.writeFile(cortexJsonPath, JSON.stringify(cortexJson, null, 2), "utf-8");
        }
      }
    }

    rl.close();
  }

  // Write back
  if (hasEnv || Object.entries(config).length > 0) {
    const newEnvContent = Object.entries(config)
      .map(([key, value]) => `${key}=${value}`)
      .join("\n") + "\n";
    await fs.writeFile(envPath, newEnvContent, "utf-8");
  }
  console.log("\n  Configuration updated successfully.");
}
