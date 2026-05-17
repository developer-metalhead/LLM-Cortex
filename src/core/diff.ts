import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";

const execAsync = promisify(exec);

// Used by the daemon watcher — diff a single file against HEAD
export async function getFileDiff(targetDir: string, filePath: string): Promise<string> {
  try {
    const { stdout } = await execAsync(`git diff HEAD -- "${filePath}"`, { cwd: targetDir });
    if (stdout.trim()) return stdout;
  } catch {
    // No commits yet or git error — fall through
  }

  try {
    const { stdout: status } = await execAsync(
      `git ls-files --others --exclude-standard "${filePath}"`,
      { cwd: targetDir }
    );
    if (status.trim()) {
      const content = await fs.readFile(filePath, "utf-8");
      return `[NEW/UNTRACKED FILE: ${filePath}]\n\n${content}`;
    }
  } catch {
    // ignore
  }

  return "";
}

// Used by the MCP server — all changes since the last synced commit
export async function getPendingDiff(projectRoot: string, lastSyncCommit: string | null): Promise<string> {
  try {
    if (!lastSyncCommit || lastSyncCommit === "no-commits") {
      // No prior sync — snapshot the full current state of all tracked files.
      // Using the empty-tree hash works for clones (shallow or full), midway
      // installs, and single-commit repos — avoids replaying irrelevant history.
      const emptyTree = "4b825dc642cb6eb9a060e54bf8d69288fbee4904";
      try {
        const { stdout } = await execAsync(`git diff -w --ignore-blank-lines ${emptyTree} HEAD`, { cwd: projectRoot });
        if (stdout.trim()) return stdout;
      } catch {
        // No commits yet — fall through to staged/unstaged
      }

      const { stdout: fallback } = await execAsync("git diff -w --ignore-blank-lines HEAD", { cwd: projectRoot });
      return fallback;
    }

    // Changes committed since last sync
    const { stdout: committed } = await execAsync(
      `git diff -w --ignore-blank-lines ${lastSyncCommit}..HEAD`,
      { cwd: projectRoot }
    );

    // Uncommitted changes on top
    const { stdout: uncommitted } = await execAsync("git diff -w --ignore-blank-lines HEAD", { cwd: projectRoot });

    return [committed, uncommitted].filter(Boolean).join("\n");
  } catch (err: any) {
    return `[Diff Error] ${err.message}`;
  }
}
