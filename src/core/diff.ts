import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';

const execAsync = promisify(exec);

export async function getFileDiff(targetDir: string, filePath: string): Promise<string> {
  try {
    // Attempt to get the git diff for the file against HEAD
    // This captures both staged and unstaged changes if we compare against HEAD
    const { stdout: diff } = await execAsync(`git diff HEAD -- "${filePath}"`, { cwd: targetDir });
    
    if (diff.trim()) {
      return diff;
    }
  } catch (error: any) {
    // If HEAD is missing (e.g. no commits yet) or other git error, it falls here
    // We will proceed to check if it's untracked or just read the file
  }

  try {
    // If there is no diff or HEAD failed, it might be a new untracked file or initial state.
    // Let's check if it's untracked.
    const { stdout: status } = await execAsync(`git ls-files --others --exclude-standard "${filePath}"`, { cwd: targetDir });
    
    // If it's untracked OR we are in a repo with no commits (where everything is kind of 'new')
    // We can just read the entire file
    if (status.trim() || true) { // the "or true" is a fallback: if it's modified but no HEAD, just send content
      const content = await fs.readFile(filePath, 'utf-8');
      return `[NEW/UNTRACKED FILE: ${filePath}]\n\n${content}`;
    }

    return '';
  } catch (error) {
    console.error(`[Diff Error] Failed to get diff for ${filePath}:`, error);
    return '';
  }
}
