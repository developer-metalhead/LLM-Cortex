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

// Global Claude Code entry — no --project-root so the server auto-detects the
// active workspace. Written to ~/.claude.json so one entry covers every project.
function getGlobalClaudeCodeMCPEntry() {
  const nodePath = process.execPath;
  const scriptPath = fileURLToPath(import.meta.url);
  const entryPath = path.join(path.dirname(scriptPath), "index.js");
  return {
    command: nodePath,
    args: [entryPath, "mcp"],
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
  const cmd =
    process.platform === "win32" ? "where cortex" : "command -v cortex";
  try {
    const { stdout } = await execAsync(cmd);
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}

const home = process.env.HOME || process.env.USERPROFILE || "";
const appData =
  process.env.APPDATA || path.join(home, "Library", "Application Support");
const localAppData =
  process.env.LOCALAPPDATA || path.join(home, "AppData", "Local");
const xdgConfig = process.env.XDG_CONFIG_HOME || path.join(home, ".config");

// Inline fallback for the PreToolUse hook script — used when the package-level
// template isn't accessible (e.g. running from a global npm install without
// the .claude/ dir). Mirrors .claude/hooks/inject-knowledge.js in this repo.
const HOOK_SCRIPT_INLINE = `#!/usr/bin/env node
// Cortex PreToolUse hook — auto-inject knowledge before Read/Grep and stash
// a token-savings estimate for the Stop hook. Fires once per agent session.
import { execSync } from "child_process";
import { existsSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
const sessionMarker = join(tmpdir(), \`cortex_injected_\${process.ppid}\`);
const savingsMarker = join(tmpdir(), \`cortex_pending_savings_\${process.ppid}\`);
if (existsSync(sessionMarker)) process.exit(0);
function fmt(n) { return n >= 1000 ? \`\${(n / 1000).toFixed(1)}k\` : \`\${n}\`; }
try {
  const index = execSync("cortex read", { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] }).trim();
  if (!index || index === "No existing knowledge found.") process.exit(0);
  let savings = null;
  try {
    const files = execSync("git ls-files", { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] })
      .split("\\n")
      .filter((f) => {
        const t = f.trim();
        return t && !t.startsWith(".knowledge") && !t.startsWith(".claude") && !t.startsWith(".agents")
          && !t.startsWith(".antigravity") && !t.startsWith(".cursor") && !t.startsWith(".vscode")
          && !t.startsWith(".windsurf") && !t.startsWith(".codeium") && !t.startsWith("node_modules")
          && !t.startsWith("dist/") && !t.endsWith(".lock");
      });
    const saved = Math.max(0, files.length * 1200 - Math.round(index.length / 4));
    if (saved >= 500 && files.length > 0) savings = { saved, fileCount: files.length };
  } catch {}
  writeFileSync(sessionMarker, "");
  if (savings) writeFileSync(savingsMarker, JSON.stringify(savings));
  const suffix = savings ? \` (auto-injected — ~\${fmt(savings.saved)} tokens saved vs scanning \${savings.fileCount} source files)\` : \` (auto-injected before source read)\`;
  process.stdout.write(\`## [Cortex] Architectural knowledge index\${suffix}\\n\\n\${index}\\n\`);
} catch { process.exit(0); }
`;

// Starter GEMINI.md content. Written at setup time so the file appears
// immediately — before the user has run their first `/ingest`. Once a synthesis
// happens, the MCP server's save_synthesis handler overwrites this with the
// full rendered knowledge index (same operating rules + the actual entities).
// Antigravity (v1.20.3+) and Gemini CLI both auto-load GEMINI.md at session start.
const STARTER_GEMINI_MD = `<!-- Auto-generated by Project Cortex. Will be regenerated on every \`/ingest\`. -->

# Operating Rules — Project Cortex

This project uses Project Cortex (\`project-cortex\` MCP server). For any task that **changes code** — implement, fix, refactor, modify, add, build, create, update, migrate, rewrite, rename, move, delete — you MUST run this pre-flight before opening any source file:

1. Call \`read_knowledge_index\` (project-cortex MCP) to see what already exists.
2. Find the relevant entity in the index below.
3. Call \`read_entity\` for it; read the \`## Wiring\` section to identify every downstream consumer.
4. For related concepts the entity Implements, call \`read_concept\` to learn the invariants.
5. State a one-paragraph plan: which entities you'll touch, which dependents could be affected, which invariants apply.
6. ONLY THEN open source files and write code.

Skipping this risks duplicating implementations, breaking unknown dependents, and violating documented invariants.

For purely conceptual questions (*what is X*, *how does Y work*), reading the index below is usually sufficient — skip the deep entity reads.

For any request involving an **architecture diagram, dependency map, module relationships, or 'what touches X'** — **always call \`graph\` (project-cortex MCP)** rather than drawing a diagram manually. Use the \`scope\` parameter to focus on a single entity (e.g. \`scope: "BookingController"\`). Never construct Mermaid syntax by hand — Cortex holds the authoritative dependency edges with quality-colored nodes.

---

# Project Cortex: Knowledge Index

_No entities yet. Run \`/ingest\` (in your IDE) or \`cortex sync\` (in your terminal with \`cortex watch\` running) to perform the first synthesis. This file will be regenerated with the full knowledge index after that._
`;

// Shared workspace memory writer — called by setupIDE() after the per-target
// loop, regardless of which target(s) ran. Writes the cross-tool memory files
// once per setup invocation. Both files are guarded by existence checks so user
// edits and prior synthesis output survive re-runs.
async function writeWorkspaceMemoryFiles(projectRoot: string): Promise<void> {
  // AGENTS.md — cross-tool convention. Auto-loaded by Antigravity v1.20.3+,
  // Claude Code, Cursor, Cline, etc. Written once; user-edited content survives.
  const agentsMd = path.join(projectRoot, "AGENTS.md");
  try {
    await fs.access(agentsMd);
  } catch {
    await fs.writeFile(agentsMd, AGENTS_MD_TEMPLATE, "utf-8");
  }

  // GEMINI.md starter — operating rules + "no entities yet" placeholder.
  // First save_synthesis overwrites with rules + actual index. We don't want
  // to clobber a real index that already exists, so existence-check here too.
  const geminiMd = path.join(projectRoot, "GEMINI.md");
  try {
    await fs.access(geminiMd);
  } catch {
    await fs.writeFile(geminiMd, STARTER_GEMINI_MD, "utf-8");
  }
}

// Project-root AGENTS.md template. Cross-tool convention: Antigravity (v1.20.3+),
// Claude Code, Cursor, and other agentic AI tools auto-load this file at session
// start. Written once via writeWorkspaceMemoryFiles — never overwritten if the
// file already exists, so user customizations survive subsequent runs.
const AGENTS_MD_TEMPLATE = `# AGENTS.md

> Auto-loaded by Antigravity (v1.20.3+), Claude Code, Cursor, Cline, and other agentic AI tools at session start. This file describes how AI agents should operate in this project.

## Project Cortex — Architectural Memory

This project uses [Project Cortex](https://www.npmjs.com/package/projectcortex) — a synthesized architectural knowledge base exposed via the \`project-cortex\` MCP server. The knowledge base lives in \`.knowledge/\` and contains:

- Per-entity pages with \`## Role\` / \`## Interface\` / \`## Behavior\` / \`## Wiring\` sections
- Per-concept pages for cross-cutting architectural patterns
- A rich index linking everything via \`[[WikiLinks]]\`

### MANDATORY: Use Cortex before any code-change task

For any task that **changes code** — implement, fix, refactor, modify, add, build, create, update, migrate, rewrite, rename, move, delete — you MUST:

1. Call \`read_knowledge_index\` from the \`project-cortex\` MCP server first.
2. Find the relevant entity from the index.
3. Call \`read_entity\` to audit its \`## Wiring\` section — every \`[[WikiLink]]\` is a downstream consumer that may break.
4. For any concept the entity Implements, call \`read_concept\` for invariants.
5. State a one-paragraph plan: which entities you'll touch, which dependents could be affected, which invariants apply.
6. ONLY THEN open source files.

Skipping this risks: duplicating existing implementations, breaking dependents you didn't know about, violating documented invariants.

### When NOT to use Cortex

- Pure conceptual questions (*what is X*, *how does Y work*) — \`read_knowledge_index\` alone is usually sufficient; skip the deep entity reads.
- Trivial single-line fixes (typos, comments) where architectural context isn't relevant.

### When the knowledge base is empty

If \`read_knowledge_index\` returns no entities, recommend running \`/ingest\` (or \`cortex sync\`) before proceeding with the action task.

---

<!-- Add your own project-specific agent instructions below. Cortex will not overwrite this file once it exists. -->
`;

// Inline fallback for the UserPromptSubmit router — on action prompts,
// auto-injects the knowledge-first workflow. Mirrors .claude/hooks/cortex-router.js.
const ROUTER_HOOK_INLINE = `#!/usr/bin/env node
// Cortex UserPromptSubmit hook — routes action prompts through the knowledge-first workflow.
import { readFileSync, existsSync } from "fs";
import { join } from "path";
const ACTION = /\\b(implement|build|create|add|write|fix|repair|debug|refactor|modify|change|update|migrate|rewrite|extract|introduce|replace|delete|remove|rename|move|restructure|reorganize|optimize)\\b/i;
try {
  const raw = readFileSync(0, "utf8");
  let prompt = "";
  try { const p = JSON.parse(raw); prompt = (p.prompt || p.user_message || "").trim(); }
  catch { prompt = raw.trim(); }
  if (!prompt || prompt.length < 5) process.exit(0);
  if (!ACTION.test(prompt)) process.exit(0);
  const cwd = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  if (!existsSync(join(cwd, ".knowledge"))) process.exit(0);
  process.stdout.write([
    "",
    "[Cortex auto-router] This prompt looks like an action task (implement / modify / fix / refactor).",
    "Before opening any source file, follow the knowledge-first workflow:",
    "",
    "1. Call \`read_knowledge_index\` (project-cortex MCP) to see what already exists.",
    "2. Find the entity that matches the task (search by name or sourceFile).",
    "3. Call \`read_entity\` on it. Read the \`## Wiring\` section — every \`[[WikiLink]]\` there is a downstream consumer.",
    "4. For any concept the entity Implements, call \`read_concept\` for invariants.",
    "5. State a one-paragraph plan: which entities you'll touch, which dependents could be affected, which invariants apply.",
    "6. ONLY THEN open source files and write code.",
    "",
    "Skipping this risks duplicating implementations, breaking unknown dependents, violating invariants. If the knowledge base is empty for this task, recommend \`/ingest_cortex\` first.",
    "",
  ].join("\\n"));
} catch { process.exit(0); }
`;

// Inline fallback for the Stop hook script — appends the savings footer once
// per session after the agent's response. Mirrors .claude/hooks/cortex-savings-footer.js.
const STOP_HOOK_INLINE = `#!/usr/bin/env node
// Cortex Stop hook — appends a one-line token-savings footer after the
// agent's response. Reads the savings stashed by inject-knowledge.js, prints,
// deletes its marker so the footer shows once per session.
import { existsSync, readFileSync, unlinkSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
const savingsMarker = join(tmpdir(), \`cortex_pending_savings_\${process.ppid}\`);
if (!existsSync(savingsMarker)) process.exit(0);
try {
  const content = readFileSync(savingsMarker, "utf8").trim();
  unlinkSync(savingsMarker);
  if (!content) process.exit(0);
  const { saved, fileCount } = JSON.parse(content);
  if (typeof saved !== "number" || saved < 500) process.exit(0);
  const f = saved >= 1000 ? \`~\${(saved / 1000).toFixed(1)}k\` : \`~\${saved}\`;
  process.stdout.write(\`\\n---\\n*Cortex: \${f} tokens saved this session — used synthesized knowledge instead of scanning \${fileCount} source files.*\\n\`);
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
  if (process.platform === "win32")
    return path.join(appData, "Zed", "settings.json");
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
  return path.join(
    codeUser,
    "globalStorage",
    "saoudrizwan.claude-dev",
    "settings",
    "cline_mcp_settings.json",
  );
}

function getIDETargets(
  projectRoot: string,
  options: SetupOptions = {},
): IDETarget[] {
  const antigravityConfigPath = getAntigravityConfigPath(
    !!options.local,
    projectRoot,
  );

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
          (h: any) => h.matcher === hookMatcher,
        );
        if (!alreadyRegistered) {
          config.hooks.PreToolUse.push({
            matcher: hookMatcher,
            hooks: [
              {
                type: "command",
                command: "node .claude/hooks/inject-knowledge.js",
              },
            ],
          });
        }

        // Stop hook — appends a token-savings footer after the agent's response.
        config.hooks.Stop = config.hooks.Stop || [];
        const stopCommand = "node .claude/hooks/cortex-savings-footer.js";
        const stopAlreadyRegistered = config.hooks.Stop.some(
          (h: any) =>
            Array.isArray(h.hooks) &&
            h.hooks.some((c: any) => c?.command === stopCommand),
        );
        if (!stopAlreadyRegistered) {
          config.hooks.Stop.push({
            hooks: [{ type: "command", command: stopCommand }],
          });
        }

        // UserPromptSubmit hook — routes action prompts through the knowledge-first workflow.
        config.hooks.UserPromptSubmit = config.hooks.UserPromptSubmit || [];
        const routerCommand = "node .claude/hooks/cortex-router.js";
        const routerAlreadyRegistered = config.hooks.UserPromptSubmit.some(
          (h: any) =>
            Array.isArray(h.hooks) &&
            h.hooks.some((c: any) => c?.command === routerCommand),
        );
        if (!routerAlreadyRegistered) {
          config.hooks.UserPromptSubmit.push({
            hooks: [{ type: "command", command: routerCommand }],
          });
        }

        await writeJsonFile(configPath, config);

        // Write the hook scripts into the project. Prefer the package-level
        // templates; fall back to inline scripts when running from a global
        // npm install without the .claude/ dir alongside the build artifact.
        const hookDir = path.join(projectRoot, ".claude", "hooks");
        await fs.mkdir(hookDir, { recursive: true });

        const injectScript = path.join(hookDir, "inject-knowledge.js");
        const injectSource = path.join(
          path.dirname(fileURLToPath(import.meta.url)),
          "..",
          "..",
          ".claude",
          "hooks",
          "inject-knowledge.js",
        );
        try {
          const scriptContent = await fs.readFile(injectSource, "utf-8");
          await fs.writeFile(injectScript, scriptContent, "utf-8");
        } catch {
          await fs.writeFile(injectScript, HOOK_SCRIPT_INLINE, "utf-8");
        }

        const stopScript = path.join(hookDir, "cortex-savings-footer.js");
        const stopSource = path.join(
          path.dirname(fileURLToPath(import.meta.url)),
          "..",
          "..",
          ".claude",
          "hooks",
          "cortex-savings-footer.js",
        );
        try {
          const scriptContent = await fs.readFile(stopSource, "utf-8");
          await fs.writeFile(stopScript, scriptContent, "utf-8");
        } catch {
          await fs.writeFile(stopScript, STOP_HOOK_INLINE, "utf-8");
        }

        const routerScript = path.join(hookDir, "cortex-router.js");
        const routerSource = path.join(
          path.dirname(fileURLToPath(import.meta.url)),
          "..",
          "..",
          ".claude",
          "hooks",
          "cortex-router.js",
        );
        try {
          const scriptContent = await fs.readFile(routerSource, "utf-8");
          await fs.writeFile(routerScript, scriptContent, "utf-8");
        } catch {
          await fs.writeFile(routerScript, ROUTER_HOOK_INLINE, "utf-8");
        }

        // Write to ~/.claude.json (global Claude Code config) so the MCP
        // server is available across all projects without re-running setup.
        const globalClaudeJson = path.join(home, ".claude.json");
        const globalClaudeConfig = await readJsonSafe(globalClaudeJson);
        globalClaudeConfig.mcpServers = globalClaudeConfig.mcpServers || {};
        globalClaudeConfig.mcpServers["project-cortex"] = getGlobalClaudeCodeMCPEntry();
        await writeJsonFile(globalClaudeJson, globalClaudeConfig);
        console.error(`  [ok] claude-code (global) → ${globalClaudeJson}`);

        // Write to Claude Desktop config(s) — standard install and Windows Store.
        // Only writes if the parent directory already exists (app is installed).
        const desktopPaths: string[] = [];

        if (process.platform === "darwin") {
          desktopPaths.push(path.join(home, "Library", "Application Support", "Claude", "claude_desktop_config.json"));
        } else if (process.platform === "win32") {
          // Standard install
          desktopPaths.push(path.join(appData, "Claude", "claude_desktop_config.json"));
          // Windows Store install — package name has a publisher-hash suffix (e.g.
          // Claude_pzs8sxrjxfjjc) that varies, so scan for any "Claude_*" package.
          try {
            const packagesDir = path.join(localAppData, "Packages");
            const entries = await fs.readdir(packagesDir);
            for (const entry of entries) {
              if (entry.startsWith("Claude_")) {
                desktopPaths.push(path.join(packagesDir, entry, "LocalCache", "Roaming", "Claude", "claude_desktop_config.json"));
              }
            }
          } catch {
            // %LOCALAPPDATA%\Packages not readable — skip Store path.
          }
        } else {
          desktopPaths.push(path.join(xdgConfig, "Claude", "claude_desktop_config.json"));
        }

        for (const desktopPath of desktopPaths) {
          try {
            await fs.access(path.dirname(desktopPath));
            const desktopConfig = await readJsonSafe(desktopPath);
            desktopConfig.mcpServers = desktopConfig.mcpServers || {};
            desktopConfig.mcpServers["project-cortex"] = getMCPEntry(projectRoot);
            await writeJsonFile(desktopPath, desktopConfig);
            console.error(`  [ok] claude-desktop → ${desktopPath}`);
          } catch {
            // Claude Desktop not installed at this path — skip silently.
          }
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
      configPath: path.join(home, ".codeium", "windsurf", "mcp_config.json"),
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
        process.env.APPDATA ||
          path.join(home, "Library", "Application Support"),
        "Claude",
        "claude_desktop_config.json",
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

        // Workspace Skill — Antigravity v1.20.x semantic-matches the SKILL.md
        // description against user prompts and auto-loads the body on hit.
        // Closest analog to Claude Code's UserPromptSubmit hook.
        const skillDir = path.join(projectRoot, ".agent", "skills", "cortex");
        const skillFile = path.join(skillDir, "SKILL.md");
        const skillSource = path.join(
          path.dirname(fileURLToPath(import.meta.url)),
          "..",
          "..",
          ".agent",
          "skills",
          "cortex",
          "SKILL.md",
        );
        try {
          await fs.mkdir(skillDir, { recursive: true });
          const skillBody = await fs.readFile(skillSource, "utf-8");
          await fs.writeFile(skillFile, skillBody, "utf-8");
        } catch {
          // Skill template not bundled — non-fatal, the slash command + GEMINI.md
          // still provide the routing path.
        }

        // Cross-tool memory files (AGENTS.md, starter GEMINI.md) are written
        // once per setupIDE() call via writeWorkspaceMemoryFiles — not here.
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
      configPath: path.join(
        projectRoot,
        ".continue",
        "mcpServers",
        "project-cortex.yaml",
      ),
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
  options: SetupOptions = {},
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
        `Unknown target: ${targetName}. Valid: ${validNames.join(", ")}`,
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

  // After all targets run, write the cross-tool workspace memory files
  // (AGENTS.md + starter GEMINI.md) once. Existence-checked so user edits
  // and prior synthesis output survive re-runs.
  try {
    await writeWorkspaceMemoryFiles(projectRoot);
  } catch (err: any) {
    console.error(`  [warn] workspace memory files: ${err.message}`);
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
