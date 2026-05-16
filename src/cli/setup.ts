import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

interface IDETarget {
  name: string;
  configPath: string;
  preflight?: () => Promise<string | null>; // returns error message if check fails, null if ok
  writeConfig: (serverPath: string, configPath: string) => Promise<void>;
}

export interface SetupOptions {
  // When true, the antigravity target writes to the per-project
  // .antigravity/mcp_config.json instead of the global Antigravity config.
  // Other targets ignore this flag (they only have one config location).
  local?: boolean;
}

function getMCPEntry(projectRoot: string) {
  const nodePath = process.execPath;
  const scriptPath = fileURLToPath(import.meta.url);
  // The entry point is index.js in the same directory (dist/cli/)
  const entryPath = path.join(path.dirname(scriptPath), "index.js");

  return {
    command: nodePath,
    args: [entryPath, "mcp", "--project-root", projectRoot],
    cwd: projectRoot,
  };
}

// Project-agnostic entry — relies on `cortex` being on PATH (global install)
// and on the IDE setting CWD to the active workspace when launching the MCP
// server. Used for the global Antigravity config so one entry serves every
// project the user opens.
function getPortableMCPEntry() {
  return {
    command: "cortex",
    args: ["mcp"],
    env: { DOTENV_CONFIG_QUIET: "1" },
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

// Verifies that `cortex` resolves on PATH. The portable Antigravity entry
// invokes `cortex` directly, so without a global install the MCP server will
// silently fail to launch.
async function isCortexOnPath(): Promise<boolean> {
  const cmd = process.platform === "win32" ? "where cortex" : "command -v cortex";
  try {
    const { stdout } = await execAsync(cmd);
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}

const home = process.env.HOME || process.env.USERPROFILE || "";

// Resolves the global Antigravity MCP config path for the current platform.
// Antigravity (a Google IDE) reads from ~/.gemini/antigravity/mcp_config.json
// on macOS/Linux and %USERPROFILE%\.gemini\antigravity\mcp_config.json on Windows.
function getAntigravityGlobalConfigPath(): string {
  return path.join(home, ".gemini", "antigravity", "mcp_config.json");
}

function getIDETargets(projectRoot: string, options: SetupOptions = {}): IDETarget[] {
  const antigravityConfigPath = options.local
    ? path.join(projectRoot, ".antigravity", "mcp_config.json")
    : getAntigravityGlobalConfigPath();

  return [
    {
      name: "claude-code",
      configPath: path.join(projectRoot, ".claude", "settings.json"),
      writeConfig: async (sPath, configPath) => {
        const config = await readJsonSafe(configPath);
        config.mcpServers = config.mcpServers || {};
        config.mcpServers["project-cortex"] = getMCPEntry(projectRoot);
        await writeJsonFile(configPath, config);
      },
    },
    {
      name: "cursor",
      configPath: path.join(projectRoot, ".cursor", "mcp.json"),
      writeConfig: async (sPath, configPath) => {
        const config = await readJsonSafe(configPath);
        config.mcpServers = config.mcpServers || {};
        config.mcpServers["project-cortex"] = getMCPEntry(projectRoot);
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
          args: ["mcp", "--project-root", projectRoot],
          cwd: projectRoot,
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
        config.mcpServers["project-cortex"] = getMCPEntry(projectRoot);
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
        config.mcpServers["project-cortex"] = getMCPEntry(projectRoot);
        await writeJsonFile(configPath, config);
      },
    },
    {
      name: "antigravity",
      configPath: antigravityConfigPath,
      preflight: async () => {
        if (await isCortexOnPath()) return null;
        return (
          "the 'cortex' binary is not on your PATH. The Antigravity entry calls\n" +
          "         it directly, so the MCP server will fail to launch without a global install.\n" +
          "         Fix: npm install -g projectcortex"
        );
      },
      writeConfig: async (sPath, configPath) => {
        const config = await readJsonSafe(configPath);
        config.mcpServers = config.mcpServers || {};
        config.mcpServers["project-cortex"] = getPortableMCPEntry();
        await writeJsonFile(configPath, config);
      },
    },
  ];
}

export async function setupIDE(
  projectRoot: string,
  targets: string[],
  options: SetupOptions = {}
): Promise<void> {
  const allTargets = getIDETargets(projectRoot, options);
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

    if (target.preflight) {
      const err = await target.preflight();
      if (err) {
        console.error(`  [skip] ${target.name}: ${err}`);
        continue;
      }
    }

    try {
      await target.writeConfig("", target.configPath);
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
