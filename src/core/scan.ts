import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";

const execAsync = promisify(exec);

const MAX_FILES = 500;

// Paths that belong to Project Cortex or other IDE tooling — never include
// these in a bootstrap file list, regardless of where they live in the tree.
const CORTEX_FOOTPRINT_PREFIXES = [
  ".knowledge/",
  ".claude/",
  ".agents/",
  ".antigravity/",
  ".cursor/",
  ".vscode/",
  ".windsurf/",
  ".codeium/",
];

const CORTEX_FOOTPRINT_FILES = new Set([
  "cortex.log",
  ".cortexrc",
  ".last_sync_commit",
]);

// Test files — excluded from bootstrap (they bloat the file list with
// non-architectural test scaffolding). User can re-ingest later for tests.
function isTestPath(p: string): boolean {
  return (
    p.startsWith("tests/") ||
    p.startsWith("test/") ||
    p.includes("/tests/") ||
    p.includes("/test/") ||
    p.includes("/__tests__/") ||
    p.includes("/__mocks__/") ||
    /\.(test|spec)\.[a-z0-9]+$/i.test(p)
  );
}

// Preferred source directories — if any of these exist in the project, we
// restrict the bootstrap list to them (plus docs/). Otherwise we return all
// non-footprint, non-test files.
const PREFERRED_SOURCE_DIRS = ["src/", "lib/", "app/", "packages/", "api/", "server/", "client/"];

function isCortexFootprint(p: string): boolean {
  const normalized = p.replace(/\\/g, "/");
  if (CORTEX_FOOTPRINT_FILES.has(path.basename(normalized))) return true;
  return CORTEX_FOOTPRINT_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

async function gitLsFiles(projectRoot: string): Promise<string[] | null> {
  try {
    const { stdout } = await execAsync("git ls-files", {
      cwd: projectRoot,
      maxBuffer: 32 * 1024 * 1024,
    });
    const files = stdout
      .split(/\r?\n/)
      .map((f) => f.trim())
      .filter(Boolean);
    return files;
  } catch {
    return null;
  }
}

// Fallback recursive walk for non-git projects. Skips obvious noise dirs.
async function walkDir(projectRoot: string): Promise<string[]> {
  const out: string[] = [];
  const SKIP = new Set([
    "node_modules",
    "dist",
    "build",
    "out",
    ".git",
    ".knowledge",
    ".claude",
    ".agents",
    ".antigravity",
    ".cursor",
    ".vscode",
    ".windsurf",
    ".codeium",
    ".next",
    ".nuxt",
    ".turbo",
    "coverage",
  ]);

  async function visit(dir: string, rel: string) {
    let entries: any[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (SKIP.has(entry.name)) continue;
      const childAbs = path.join(dir, entry.name);
      const childRel = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        await visit(childAbs, childRel);
      } else if (entry.isFile()) {
        out.push(childRel);
      }
    }
  }

  await visit(projectRoot, "");
  return out;
}

export interface BootstrapFileList {
  files: string[];
  totalFound: number;
  truncated: boolean;
  source: "git" | "walk";
}

// Returns a curated list of source files for bootstrap synthesis.
// Excludes Cortex/IDE footprint, test files, and (when source dirs exist)
// anything outside src/, lib/, app/, etc. Caps at MAX_FILES.
export async function listSourceFiles(projectRoot: string): Promise<BootstrapFileList> {
  const fromGit = await gitLsFiles(projectRoot);
  const raw = fromGit ?? (await walkDir(projectRoot));
  const source: "git" | "walk" = fromGit ? "git" : "walk";

  // Stage 1: drop Cortex footprint + tests
  let filtered = raw
    .map((f) => f.replace(/\\/g, "/"))
    .filter((f) => !isCortexFootprint(f))
    .filter((f) => !isTestPath(f));

  // Stage 2: if any preferred source dir exists, restrict to source + docs.
  const hasSourceDir = filtered.some((f) =>
    PREFERRED_SOURCE_DIRS.some((d) => f.startsWith(d))
  );
  if (hasSourceDir) {
    filtered = filtered.filter(
      (f) =>
        PREFERRED_SOURCE_DIRS.some((d) => f.startsWith(d)) ||
        f.startsWith("docs/") ||
        f === "package.json" ||
        f === "pyproject.toml" ||
        f === "Cargo.toml" ||
        f === "go.mod" ||
        f === "README.md"
    );
  }

  const totalFound = filtered.length;
  const truncated = totalFound > MAX_FILES;
  const files = truncated ? filtered.slice(0, MAX_FILES) : filtered;

  return { files, totalFound, truncated, source };
}

// Render the file list as a string for inclusion in the bootstrap prompt.
export function renderFileList(list: BootstrapFileList): string {
  if (list.files.length === 0) {
    return "(No source files discovered. The project may be empty or only contain ignored files.)";
  }
  const body = list.files.map((f) => `- ${f}`).join("\n");
  if (list.truncated) {
    return `${body}\n\n…and ${list.totalFound - list.files.length} more files. Use \`Glob\` to discover them if needed.`;
  }
  return body;
}
