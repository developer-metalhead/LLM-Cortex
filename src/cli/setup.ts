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
  // When true, the antigravity target writes to the project-scoped
  // .antigravity/mcp_config.json instead of the global ~/.gemini/antigravity/mcp_config.json.
  // Other targets ignore this flag.
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
const appData = process.env.APPDATA || path.join(home, "Library", "Application Support");
const xdgConfig = process.env.XDG_CONFIG_HOME || path.join(home, ".config");

// Inline fallback for the hook script — used when the package-level template
// isn't accessible (e.g. running from a global npm install without the .claude/ dir).
const HOOK_SCRIPT_INLINE = `#!/usr/bin/env node
// Cortex PreToolUse hook — auto-inject the knowledge index before Read/Grep.
// Fires once per agent session (keyed on parent PID) then stays silent.
import { execSync } from "child_process";
import { existsSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
const sessionMarker = join(tmpdir(), \`cortex_injected_\${process.ppid}\`);
if (existsSync(sessionMarker)) process.exit(0);
try {
  const index = execSync("cortex read", { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] }).trim();
  if (!index || index === "No existing knowledge found.") process.exit(0);
  writeFileSync(sessionMarker, "");
  process.stdout.write(\`## [Cortex] Architectural knowledge index (auto-injected)\\n\\n\${index}\\n\`);
} catch { process.exit(0); }
`;

// Antigravity (Google's AI IDE) stores MCP config in ~/.gemini/antigravity/mcp_config.json.
// When --local is passed, the project-scoped .antigravity/mcp_config.json is used instead.
function getAntigravityConfigPath(local: boolean, projectRoot: string): string {
  if (local) return path.join(projectRoot, ".antigravity", "mcp_config.json");
  return path.join(home, ".gemini", "antigravity", "mcp_config.json");
}

// Zed: ~/.config/zed/settings.json on macOS+Linux (Zed follows XDG on all platforms),
// %APPDATA%\Zed\settings.json on Windows.
// MCP servers live under the "context_servers" key (not "mcpServers").
function getZedConfigPath(): string {
  if (process.platform === "win32") return path.join(appData, "Zed", "settings.json");
  return path.join(xdgConfig, "zed", "settings.json");
}

// Cline VS Code extension (saoudrizwan.claude-dev) stores MCP config in VS Code's
// globalStorage directory, which lives under the user data folder for Code.
function getClineConfigPath(): string {
  const codeUser =
    process.platform === "darwin"
      ? path.join(home, "Library", "Application Support", "Code", "User")
      : process.platform === "win32"
        ? path.join(appData, "Code", "User")
        : path.join(xdgConfig, "Code", "User");
  return path.join(codeUser, "globalStorage", "saoudrizwan.claude-dev", "settings", "cline_mcp_settings.json");
}

function getIDETargets(projectRoot: string, options: SetupOptions = {}): IDETarget[] {
  const antigravityConfigPath = getAntigravityConfigPath(!!options.local, projectRoot);

  return [
    {
      name: "claude-code",
      configPath: path.join(projectRoot, ".claude", "settings.json"),
      writeConfig: async (_sPath, configPath) => {
        const config = await readJsonSafe(configPath);

        // MCP server entry
        config.mcpServers = config.mcpServers || {};
        config.mcpServers["project-cortex"] = getMCPEntry(projectRoot);

        // PreToolUse hook — injects knowledge index before Read/Grep
        config.hooks = config.hooks || {};
        config.hooks.PreToolUse = config.hooks.PreToolUse || [];
        const hookMatcher = "Read|Grep";
        const alreadyRegistered = config.hooks.PreToolUse.some(
          (h: any) => h.matcher === hookMatcher
        );
        if (!alreadyRegistered) {
          config.hooks.PreToolUse.push({
            matcher: hookMatcher,
            hooks: [{ type: "command", command: "node .claude/hooks/inject-knowledge.js" }],
          });
        }

        await writeJsonFile(configPath, config);

        // Write the hook script into the project
        const hookDir = path.join(projectRoot, ".claude", "hooks");
        const hookScript = path.join(hookDir, "inject-knowledge.js");
        const hookSource = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", ".claude", "hooks", "inject-knowledge.js");
        try {
          await fs.mkdir(hookDir, { recursive: true });
          const scriptContent = await fs.readFile(hookSource, "utf-8");
          await fs.writeFile(hookScript, scriptContent, "utf-8");
        } catch {
          // If the template isn't present (e.g. running from npm install), write inline
          await fs.mkdir(hookDir, { recursive: true });
          await fs.writeFile(hookScript, HOOK_SCRIPT_INLINE, "utf-8");
        }
      },
    },
    {
      name: "cursor",
      configPath: path.join(projectRoot, ".cursor", "mcp.json"),
      writeConfig: async (_sPath, configPath) => {
        const config = await readJsonSafe(configPath);
        config.mcpServers = config.mcpServers || {};
        config.mcpServers["project-cortex"] = getMCPEntry(projectRoot);
        await writeJsonFile(configPath, config);
      },
    },
    {
      name: "vscode",
      configPath: path.join(projectRoot, ".vscode", "mcp.json"),
      writeConfig: async (_sPath, configPath) => {
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
      writeConfig: async (_sPath, configPath) => {
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
      writeConfig: async (_sPath, configPath) => {
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
          "the 'cortex' binary is not on your PATH. The Gemini CLI entry calls\n" +
          "         it directly, so the MCP server will fail to launch without a global install.\n" +
          "         Fix: npm install -g projectcortex"
        );
      },
      writeConfig: async (_sPath, configPath) => {
        const config = await readJsonSafe(configPath);
        config.mcpServers = config.mcpServers || {};
        config.mcpServers["project-cortex"] = getPortableMCPEntry();
        await writeJsonFile(configPath, config);
      },
    },
    {
      name: "zed",
      configPath: getZedConfigPath(),
      writeConfig: async (_sPath, configPath) => {
        const config = await readJsonSafe(configPath);
        config.context_servers = config.context_servers || {};
        // Zed format: command is a top-level string, args is a top-level array
        config.context_servers["project-cortex"] = {
          command: "cortex",
          args: ["mcp"],
        };
        await writeJsonFile(configPath, config);
      },
    },
    {
      name: "cline",
      configPath: getClineConfigPath(),
      preflight: async () => {
        if (await isCortexOnPath()) return null;
        return (
          "the 'cortex' binary is not on your PATH. The Cline entry calls\n" +
          "         it directly, so the MCP server will fail to launch without a global install.\n" +
          "         Fix: npm install -g projectcortex"
        );
      },
      writeConfig: async (_sPath, configPath) => {
        const config = await readJsonSafe(configPath);
        config.mcpServers = config.mcpServers || {};
        config.mcpServers["project-cortex"] = getPortableMCPEntry();
        await writeJsonFile(configPath, config);
      },
    },
    {
      name: "continue",
      configPath: path.join(projectRoot, ".continue", "mcpServers", "project-cortex.yaml"),
      writeConfig: async (_sPath, configPath) => {
        await fs.mkdir(path.dirname(configPath), { recursive: true });
        // Continue.dev workspace MCP file format — schema: v1 is required
        const yaml = [
          "name: project-cortex",
          "version: 0.0.1",
          "schema: v1",
          "mcpServers:",
          "  - name: project-cortex",
          "    command: cortex",
          "    args:",
          "      - mcp",
          "",
        ].join("\n");
        await fs.writeFile(configPath, yaml, "utf-8");
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
    "zed",
    "cline",
    "continue",
  ];
}
