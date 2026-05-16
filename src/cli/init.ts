import fs from "fs/promises";
import path from "path";
import readline from "readline";
import { exec } from "child_process";
import { promisify } from "util";
import { loadCortexEnv } from "../core/env.js";

const execAsync = promisify(exec);

function ask(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

export async function runInit(projectRoot: string): Promise<void> {
  loadCortexEnv(projectRoot);
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  console.log("\n  Project Cortex — Setup\n");

  // Route choice
  console.log("  How do you want Cortex to synthesize your codebase knowledge?\n");
  console.log("  1) API keys  — Cortex runs a background daemon using your OpenAI/local LLM key");
  console.log("  2) IDE       — Your IDE's AI (Claude Code, Cursor, etc.) does the synthesis via MCP\n");

  let route = "";
  while (!["1", "2"].includes(route)) {
    route = (await ask(rl, "  Choose [1/2]: ")).trim();
  }

  // Create .knowledge directory
  const knowledgeDir = path.join(projectRoot, ".knowledge");
  await fs.mkdir(knowledgeDir, { recursive: true });
  await fs.mkdir(path.join(knowledgeDir, "entities"), { recursive: true });
  await fs.mkdir(path.join(knowledgeDir, "concepts"), { recursive: true });

  const indexPath = path.join(knowledgeDir, "index.md");
  try {
    await fs.access(indexPath);
  } catch {
    await fs.writeFile(
      indexPath,
      "# Project Cortex Knowledge Index\n\nThis index is automatically managed by Project Cortex.\n\n## Concepts\n\n## Entities\n",
      "utf8"
    );
  }

  if (route === "1") {
    // API keys route
    console.log("\n  API keys route selected.\n");

    const envPath = path.join(projectRoot, ".env");
    let envExists = false;
    try {
      await fs.access(envPath);
      envExists = true;
    } catch {
      // doesn't exist
    }

    if (!envExists) {
      console.log("  Supported providers: openai, anthropic, google, local\n");
      const providerInput = await ask(rl, "  LLM provider? [openai / anthropic / google / local] (default: openai): ");
      const provider = providerInput.trim().toLowerCase() || "openai";

      let envContent = `CORTEX_PROVIDER=${provider}\n`;

      if (provider === "local") {
        const baseUrl = await ask(rl, "  Local LLM base URL (e.g. http://localhost:11434/v1): ");
        envContent += `LOCAL_BASE_URL=${baseUrl.trim()}\n`;
      } else if (provider === "anthropic") {
        const key = await ask(rl, "  Anthropic API key (sk-ant-...): ");
        envContent += `ANTHROPIC_API_KEY=${key.trim()}\n`;
      } else if (provider === "google") {
        const key = await ask(rl, "  Google AI API key: ");
        envContent += `GOOGLE_GENERATIVE_AI_API_KEY=${key.trim()}\n`;
      } else {
        const key = await ask(rl, "  OpenAI API key (sk-...): ");
        envContent += `OPENAI_API_KEY=${key.trim()}\n`;
      }

      const modelDefaults: Record<string, string> = {
        openai: "gpt-4o",
        anthropic: "claude-sonnet-4-6",
        google: "gemini-1.5-pro",
        local: "gpt-4o",
      };
      const defaultModel = modelDefaults[provider] || "gpt-4o";
      const modelInput = await ask(rl, `  Model? (default: ${defaultModel}): `);
      const model = modelInput.trim();
      if (model && model !== defaultModel) {
        envContent += `CORTEX_MODEL=${model}\n`;
      }

      const mode = await ask(rl, "  Ingestion mode? [auto / manual] (default: auto): ");
      if (mode.trim() === "manual") {
        envContent += `INGESTION_MODE=manual\n`;
      }

      await fs.writeFile(envPath, envContent, "utf8");
      console.log(`\n  Created .env`);
      console.log("  Optional: put shared API keys in ~/.cortexrc (same KEY=value format); project .env overrides.");

      // Add .env / cortex.log to .gitignore if present
      const gitignorePath = path.join(projectRoot, ".gitignore");
      try {
        const gitignore = await fs.readFile(gitignorePath, "utf8");
        const toAppend: string[] = [];
        if (!gitignore.includes(".env")) {
          toAppend.push(".env");
        }
        if (!gitignore.includes("cortex.log")) {
          toAppend.push("cortex.log");
        }
        if (toAppend.length > 0) {
          await fs.appendFile(gitignorePath, `\n${toAppend.join("\n")}\n`);
          console.log(`  Added to .gitignore: ${toAppend.join(", ")}`);
        }
      } catch {
        // no .gitignore, that's fine
      }
    } else {
      console.log("  .env already exists — skipping.");
    }

    console.log("\n  Done. Run `cortex watch` to start the background daemon.");
  } else {
    // IDE route
    console.log("\n  IDE route selected.\n");
    console.log("  Available targets: claude-code, cursor, vscode, windsurf, claude-desktop, antigravity, zed, cline, continue\n");

    const input = await ask(rl, '  Which IDEs to configure? (comma-separated, or "all"): ');
    const targets = input.trim() === "all"
      ? ["all"]
      : input.split(",").map((s) => s.trim()).filter(Boolean);

    const { setupIDE } = await import("./setup.js");
    await setupIDE(projectRoot, targets);

    console.log("\n  Done. Restart your IDE to activate the MCP connection.");

    const tips: Record<string, string> = {
      "claude-code": "Use /ingest_cortex to synthesize.",
      "cursor": "Use @project-cortex to synthesize.",
      "antigravity": "Ask 'What tools do you have from project-cortex?' to verify.",
      "zed": "Open the assistant panel — project-cortex will appear as a context server.",
      "cline": "Open Cline → MCP Servers tab to verify project-cortex is connected.",
      "continue": "Use @project-cortex in the Continue chat to verify.",
    };
    const relevant = targets.includes("all") ? Object.keys(tips) : targets.filter((t) => tips[t]);
    for (const t of relevant) {
      console.log(`  For ${t}: ${tips[t]}`);
    }
    console.log("");
  }

  rl.close();
}

export async function runInitMagic(projectRoot: string): Promise<void> {
  console.log("\n  Project Cortex — Magic Setup\n");

  // 1. Detect installed IDEs via global installation indicators.
  //    Using global paths (not per-project dirs) so --magic works even on a fresh
  //    project where no IDE has touched the folder yet.
  //    Each IDE gets a list of candidate paths; the first that exists wins.
  const home = process.env.HOME || process.env.USERPROFILE || "";
  // Windows: %APPDATA% = C:\Users\<user>\AppData\Roaming
  // macOS:   ~/Library/Application Support
  // Linux:   falls back to XDG below
  const appData = process.env.APPDATA || path.join(home, "Library", "Application Support");
  // XDG config base: $XDG_CONFIG_HOME or ~/.config (Linux standard; Zed also uses this on macOS)
  const xdgConfig = process.env.XDG_CONFIG_HOME || path.join(home, ".config");

  const globalChecks: Array<[string, string[]]> = [
    // claude-code: ~/.claude.json (user-level global settings) or ~/.claude/ dir at home level
    ["claude-code", [
      path.join(home, ".claude.json"),
      path.join(home, ".claude"),
    ]],
    // cursor:
    //   Windows → %APPDATA%\Cursor\User\settings.json (parent: %APPDATA%\Cursor)
    //   macOS   → ~/Library/Application Support/Cursor
    //   Linux   → ~/.config/Cursor  (XDG standard; NOT ~/.cursor)
    ["cursor", [
      path.join(appData, "Cursor"),       // Windows + macOS
      path.join(xdgConfig, "Cursor"),     // Linux
    ]],
    // vscode: ~/.vscode/ exists on all platforms (extensions dir); user data also in appData/Code
    ["vscode", [
      path.join(home, ".vscode"),
      path.join(appData, "Code"),
      path.join(xdgConfig, "Code"),       // Linux fallback
    ]],
    // windsurf: global config dir (same path setup.ts writes to)
    ["windsurf", [path.join(home, ".codeium", "windsurf")]],
    // antigravity: ~/.gemini/antigravity/ is created on first Antigravity launch
    ["antigravity", [
      path.join(home, ".gemini", "antigravity"),
    ]],
    // claude-desktop: %APPDATA%\Claude on Windows, ~/Library/Application Support/Claude on macOS
    ["claude-desktop", [path.join(appData, "Claude")]],
    // zed: ~/.config/zed/ on macOS+Linux (Zed follows XDG on all platforms), %APPDATA%\Zed\ on Windows
    ["zed", [
      path.join(xdgConfig, "zed"),
      path.join(appData, "Zed"),
    ]],
    // cline: VS Code extension saoudrizwan.claude-dev — detected via its globalStorage directory
    ["cline", [
      path.join(appData, "Code", "User", "globalStorage", "saoudrizwan.claude-dev"),
      path.join(xdgConfig, "Code", "User", "globalStorage", "saoudrizwan.claude-dev"),
    ]],
    // continue.dev: creates ~/.continue/ on first launch across all platforms
    ["continue", [path.join(home, ".continue")]],
  ];

  const detected: string[] = [];
  for (const [ide, candidates] of globalChecks) {
    for (const candidate of candidates) {
      try {
        await fs.access(candidate);
        detected.push(ide);
        break;
      } catch {
        // candidate not present, try next
      }
    }
  }

  if (detected.length === 0) {
    console.log("  No IDEs detected on this machine.");
    console.log("  Checked: ~/.claude.json, ~/.cursor, ~/.vscode, ~/.codeium/windsurf, ~/.gemini/antigravity, and platform AppData.");
    console.log("  Run `cortex init` for the interactive setup instead.\n");
    return;
  }
  console.log(`  Detected IDEs (${detected.length}):`);
  for (const ide of detected) {
    console.log(`    • ${ide}`);
  }
  console.log("");

  // 2. Scaffold .knowledge/
  const knowledgeDir = path.join(projectRoot, ".knowledge");
  await fs.mkdir(path.join(knowledgeDir, "entities"), { recursive: true });
  await fs.mkdir(path.join(knowledgeDir, "concepts"), { recursive: true });
  const indexPath = path.join(knowledgeDir, "index.md");
  try {
    await fs.access(indexPath);
  } catch {
    await fs.writeFile(
      indexPath,
      "# Project Cortex Knowledge Index\n\nThis index is automatically managed by Project Cortex.\n\n## Concepts\n\n## Entities\n",
      "utf8"
    );
  }
  console.log("  Scaffolded .knowledge/");

  // 3. Write .gitignore entries
  const gitignorePath = path.join(projectRoot, ".gitignore");
  try {
    const existing = await fs.readFile(gitignorePath, "utf8");
    const toAppend = [".env", "cortex.log"].filter((e) => !existing.includes(e));
    if (toAppend.length > 0) {
      await fs.appendFile(gitignorePath, `\n${toAppend.join("\n")}\n`);
      console.log(`  Added to .gitignore: ${toAppend.join(", ")}`);
    }
  } catch {
    // no .gitignore — fine
  }

  // 4. Build if dist/cli/index.js is missing (dev-mode only; global installs are pre-built)
  const { fileURLToPath } = await import("url");
  const cliEntry = path.join(path.dirname(fileURLToPath(import.meta.url)), "index.js");
  try {
    await fs.access(cliEntry);
  } catch {
    console.log("\n  dist/ not found — running npm run build...");
    try {
      await execAsync("npm run build", { cwd: projectRoot });
      console.log("  Build complete.");
    } catch (err: any) {
      console.error(`\n  Build failed: ${err.message}`);
      console.error("  Fix the build error and re-run `cortex init --magic`.\n");
      return;
    }
  }

  // 5. Register MCP server with all detected IDEs
  console.log("\n  Registering MCP server...");
  const { setupIDE } = await import("./setup.js");
  await setupIDE(projectRoot, detected);

  // 6. Done
  const tips: Record<string, string> = {
    "claude-code": "use /ingest_cortex to synthesize",
    "cursor": "use @project-cortex to synthesize",
    "antigravity": "ask 'What tools do you have from project-cortex?' to verify",
    "zed": "open the assistant panel — project-cortex appears as a context server",
    "cline": "open Cline → MCP Servers tab to verify project-cortex is connected",
    "continue": "use @project-cortex in the Continue chat to verify",
  };
  console.log("\n  Done. Restart your IDE, then:");
  for (const ide of detected) {
    if (tips[ide]) console.log(`  • ${ide}: ${tips[ide]}`);
  }
  console.log("");
}
