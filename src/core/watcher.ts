import { EventEmitter } from 'events';
import chokidar, { FSWatcher } from 'chokidar';
import path from 'path';
import fs from 'fs/promises';
import ignore from 'ignore';
import { getFileDiff } from './diff.js';

export class CortexWatcher extends EventEmitter {
  private watcher: FSWatcher | null = null;
  private pendingChanges: Set<string> = new Set();
  private debounceTimer: NodeJS.Timeout | null = null;
  private targetDir: string;
  private ignoreManager = ignore();

  constructor(targetDir: string) {
    super();
    this.targetDir = targetDir;
  }

  async start() {
    // Load .gitignore patterns
    try {
      const gitignorePath = path.join(this.targetDir, '.gitignore');
      const gitignoreContent = await fs.readFile(gitignorePath, 'utf8');
      this.ignoreManager.add(gitignoreContent);
    } catch (error) {
    }

    // Add internal ignores
    this.ignoreManager.add(['.git/**', '.knowledge/**', 'node_modules/**', 'dist/**']);

    this.watcher = chokidar.watch(this.targetDir, {
      ignored: (filePath) => {
        const relPath = path.relative(this.targetDir, filePath);
        if (!relPath) return false; // Don't ignore the root dir itself
        return this.ignoreManager.ignores(relPath);
      },
      persistent: true,
      ignoreInitial: true,
    });

    this.watcher
      .on('add', (filePath: string) => this.queueChange(filePath))
      .on('change', (filePath: string) => this.queueChange(filePath))
      .on('unlink', (filePath: string) => this.emit('file_deleted', path.relative(this.targetDir, filePath)));
  }

  private queueChange(filePath: string) {
    this.pendingChanges.add(filePath);
    
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // 3 seconds debounce
    this.debounceTimer = setTimeout(() => this.processChanges(), 3000);
  }

  private async processChanges() {
    const filesToProcess = Array.from(this.pendingChanges);
    this.pendingChanges.clear();

    if (filesToProcess.length === 0) return;

    for (const filePath of filesToProcess) {
      const relPath = path.relative(this.targetDir, filePath);
      const diff = await getFileDiff(this.targetDir, filePath);
      
      if (diff) {
        this.emit('file_changed', { filePath: relPath, diff });
      }
    }
  }

  stop() {
    if (this.watcher) {
      this.watcher.close();
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
  }
}
