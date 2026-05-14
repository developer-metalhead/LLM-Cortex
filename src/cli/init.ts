import fs from "fs/promises";
import path from "path";
import readline from "readline";

function ask(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

export async function runInit(projectRoot: string): Promise<void> {
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

      // Add .env to .gitignore if present
      const gitignorePath = path.join(projectRoot, ".gitignore");
      try {
        const gitignore = await fs.readFile(gitignorePath, "utf8");
        if (!gitignore.includes(".env")) {
          await fs.appendFile(gitignorePath, "\n.env\n");
          console.log("  Added .env to .gitignore");
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
    console.log("  Available targets: claude-code, cursor, vscode, windsurf, claude-desktop\n");

    const input = await ask(rl, '  Which IDEs to configure? (comma-separated, or "all"): ');
    const targets = input.trim() === "all"
      ? ["all"]
      : input.split(",").map((s) => s.trim()).filter(Boolean);

    const { setupIDE } = await import("./setup.js");
    await setupIDE(projectRoot, targets);

    console.log("\n  Done. Restart your IDE to activate the MCP connection.");
    console.log("  Then use /ingest_cortex (Claude Code) or @project-cortex (Cursor) to synthesize.\n");
  }

  rl.close();
}
