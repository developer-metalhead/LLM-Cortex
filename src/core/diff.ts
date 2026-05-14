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
      // No prior sync — diff everything introduced in all commits
      try {
        const { stdout: root } = await execAsync("git rev-list --max-parents=0 HEAD", { cwd: projectRoot });
        const firstCommit = root.trim();
        const { stdout } = await execAsync(`git diff ${firstCommit}..HEAD`, { cwd: projectRoot });
        if (stdout.trim()) return stdout;
      } catch {
        // No commits yet — fall through to staged/unstaged
      }

      const { stdout: fallback } = await execAsync("git diff HEAD", { cwd: projectRoot });
      return fallback;
    }

    // Changes committed since last sync
    const { stdout: committed } = await execAsync(
      `git diff ${lastSyncCommit}..HEAD`,
      { cwd: projectRoot }
    );

    // Uncommitted changes on top
    const { stdout: uncommitted } = await execAsync("git diff HEAD", { cwd: projectRoot });

    return [committed, uncommitted].filter(Boolean).join("\n");
  } catch (err: any) {
    return `[Diff Error] ${err.message}`;
  }
}
