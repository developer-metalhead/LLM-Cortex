import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

interface IDETarget {
  name: string;
  configPath: string;
  writeConfig: (serverPath: string, configPath: string) => Promise<void>;
}

function getMCPEntry() {
  const nodePath = process.execPath;
  const scriptPath = fileURLToPath(import.meta.url);
  // The entry point is index.js in the same directory (dist/cli/)
  const entryPath = path.join(path.dirname(scriptPath), "index.js");

  return {
    command: nodePath,
    args: [entryPath, "mcp"],
  };
}

async function readJsonSafe(filePath: string): Promise<Record<string, any>> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function writeJsonFile(filePath: string, data: Record<string, any>) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

const home = process.env.HOME || process.env.USERPROFILE || "";

function getIDETargets(projectRoot: string): IDETarget[] {
  return [
    {
      name: "claude-code",
      configPath: path.join(home, ".claude", "settings.json"),
      writeConfig: async (sPath, configPath) => {
        const config = await readJsonSafe(configPath);
        config.mcpServers = config.mcpServers || {};
        config.mcpServers["project-cortex"] = getMCPEntry();
        await writeJsonFile(configPath, config);
      },
    },
    {
      name: "cursor",
      configPath: path.join(projectRoot, ".cursor", "mcp.json"),
      writeConfig: async (sPath, configPath) => {
        const config = await readJsonSafe(configPath);
        config.mcpServers = config.mcpServers || {};
        config.mcpServers["project-cortex"] = getMCPEntry();
        await writeJsonFile(configPath, config);
      },
    },
    {
      name: "vscode",
      configPath: path.join(projectRoot, ".vscode", "mcp.json"),
      writeConfig: async (sPath, configPath) => {
        const config = await readJsonSafe(configPath);
        config.servers = config.servers || {};
        config.servers["project-cortex"] = {
          type: "stdio",
          command: "cortex",
          args: ["mcp"],
        };
        await writeJsonFile(configPath, config);
      },
    },
    {
      name: "windsurf",
      configPath: path.join(
        home,
        ".codeium",
        "windsurf",
        "mcp_config.json"
      ),
      writeConfig: async (sPath, configPath) => {
        const config = await readJsonSafe(configPath);
        config.mcpServers = config.mcpServers || {};
        config.mcpServers["project-cortex"] = getMCPEntry();
        await writeJsonFile(configPath, config);
      },
    },
    {
      name: "claude-desktop",
      configPath: path.join(
        process.env.APPDATA || path.join(home, "Library", "Application Support"),
        "Claude",
        "claude_desktop_config.json"
      ),
      writeConfig: async (sPath, configPath) => {
        const config = await readJsonSafe(configPath);
        config.mcpServers = config.mcpServers || {};
        config.mcpServers["project-cortex"] = getMCPEntry();
        await writeJsonFile(configPath, config);
      },
    },
    {
      name: "antigravity",
      configPath: path.join(projectRoot, ".antigravity", "mcp.json"),
      writeConfig: async (sPath, configPath) => {
        const config = await readJsonSafe(configPath);
        config.mcpServers = config.mcpServers || {};
        config.mcpServers["project-cortex"] = getMCPEntry();
        await writeJsonFile(configPath, config);
      },
    },
  ];
}

export async function setupIDE(
  projectRoot: string,
  targets: string[]
): Promise<void> {
  const cliEntry = path.join(projectRoot, "dist", "cli", "index.js");

  try {
    await fs.access(cliEntry);
  } catch {
    console.error(`Error: CLI not built. Run "npm run build" first.`);
    process.exit(1);
  }

  const allTargets = getIDETargets(projectRoot);
  const validNames = allTargets.map((t) => t.name);

  if (targets.includes("all")) {
    targets = validNames;
  }

  for (const targetName of targets) {
    const target = allTargets.find((t) => t.name === targetName);
    if (!target) {
      console.error(
        `Unknown target: ${targetName}. Valid: ${validNames.join(", ")}`
      );
      continue;
    }

    try {
      await target.writeConfig(cliEntry, target.configPath);
      console.error(`  [ok] ${target.name} → ${target.configPath}`);
    } catch (err: any) {
      console.error(`  [fail] ${target.name}: ${err.message}`);
    }
  }
}

export function getAvailableTargets(): string[] {
  return [
    "claude-code",
    "cursor",
    "vscode",
    "windsurf",
    "claude-desktop",
    "antigravity",
  ];
}
