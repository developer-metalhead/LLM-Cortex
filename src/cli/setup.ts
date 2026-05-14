import fs from "fs/promises";
import path from "path";

interface IDETarget {
  name: string;
  configPath: string;
  writeConfig: (serverPath: string, configPath: string) => Promise<void>;
}

function getMCPEntry(serverPath: string, projectRoot: string) {
  return {
    command: "node",
    args: [serverPath, "--root", projectRoot],
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
  const serverPath = path.join(projectRoot, "dist", "mcp", "server.js");

  return [
    {
      name: "claude-code",
      configPath: path.join(home, ".claude", "settings.json"),
      writeConfig: async (sPath, configPath) => {
        const config = await readJsonSafe(configPath);
        config.mcpServers = config.mcpServers || {};
        config.mcpServers["project-cortex"] = getMCPEntry(sPath, projectRoot);
        await writeJsonFile(configPath, config);
      },
    },
    {
      name: "cursor",
      configPath: path.join(projectRoot, ".cursor", "mcp.json"),
      writeConfig: async (sPath, configPath) => {
        const config = await readJsonSafe(configPath);
        config.mcpServers = config.mcpServers || {};
        config.mcpServers["project-cortex"] = getMCPEntry(sPath, projectRoot);
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
          command: "node",
          args: [sPath, "--root", projectRoot],
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
        config.mcpServers["project-cortex"] = getMCPEntry(sPath, projectRoot);
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
        config.mcpServers["project-cortex"] = getMCPEntry(sPath, projectRoot);
        await writeJsonFile(configPath, config);
      },
    },
    {
      name: "antigravity",
      configPath: path.join(projectRoot, ".antigravity", "mcp.json"),
      writeConfig: async (sPath, configPath) => {
        const config = await readJsonSafe(configPath);
        config.mcpServers = config.mcpServers || {};
        config.mcpServers["project-cortex"] = getMCPEntry(sPath, projectRoot);
        await writeJsonFile(configPath, config);
      },
    },
  ];
}

export async function setupIDE(
  projectRoot: string,
  targets: string[]
): Promise<void> {
  const serverPath = path.join(projectRoot, "dist", "mcp", "server.js");

  try {
    await fs.access(serverPath);
  } catch {
    console.error(
      `Error: MCP server not built. Run "npm run build" first.`
    );
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
      await target.writeConfig(serverPath, target.configPath);
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
