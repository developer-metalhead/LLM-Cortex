import fs from "fs/promises";
import path from "path";
import fsSync from "fs";

export async function runHookInstall(projectRoot: string) {
  const gitDir = path.join(projectRoot, ".git");
  
  if (!fsSync.existsSync(gitDir)) {
    console.error("Error: Not a git repository. Cannot install pre-commit hook.");
    return;
  }

  const hooksDir = path.join(gitDir, "hooks");
  if (!fsSync.existsSync(hooksDir)) {
    await fs.mkdir(hooksDir, { recursive: true });
  }

  const hookPath = path.join(hooksDir, "pre-commit");
  
  const hookContent = `#!/bin/sh
# Project Cortex Pre-Commit Hook
# Ensures the knowledge base is updated before committing

echo "🧠 Project Cortex: Checking architectural sync..."

# Check if there are unstaged or uncommitted changes that might need syncing
# This is a soft warning hook. It doesn't block the commit entirely but strongly advises.
# To enforce blocking, you could run a script that checks if state.json is dirty.

echo "⚠️  Reminder: Did you run 'cortex sync' or use the '/ingest' AI workflow?"
echo "If your changes affect architecture, your Cortex knowledge base might be stale."
echo "To bypass this hook in an emergency, use 'git commit --no-verify'."

# For strict enforcement (blocking if out of sync):
# You could query 'cortex status' or diff the knowledge base here.
# For now, this serves as the Guardian Warning.

exit 0
`;

  try {
    await fs.writeFile(hookPath, hookContent, "utf8");
    // Make the hook executable (Unix/Linux/macOS)
    try {
      await fs.chmod(hookPath, 0o755);
    } catch (chmodErr) {
      // Ignore chmod errors on Windows
    }
    console.log(`✅ Project Cortex pre-commit hook installed successfully at: ${hookPath}`);
    console.log("   This will remind developers to sync architecture before committing.");
  } catch (err: any) {
    console.error(`Failed to install pre-commit hook: ${err.message}`);
  }
}
