import { EventEmitter } from 'events';
import chokidar from 'chokidar';
import path from 'path';
import { getFileDiff } from './diff.js';

export class CortexWatcher extends EventEmitter {
  private watcher: chokidar.FSWatcher | null = null;
  private pendingChanges: Set<string> = new Set();
  private debounceTimer: NodeJS.Timeout | null = null;
  private targetDir: string;

  constructor(targetDir: string) {
    super();
    this.targetDir = targetDir;
  }

  start() {
    console.log(`🚀 Starting Project Cortex Watcher...`);
    console.log(`📂 Watching directory: ${this.targetDir}`);

    this.watcher = chokidar.watch(this.targetDir, {
      ignored: [
        /(^|[\/\\])\../, // ignore dotfiles
        '**/node_modules/**',
        '**/.knowledge/**',
        '**/dist/**',
      ],
      persistent: true,
      ignoreInitial: true,
    });

    this.watcher
      .on('add', (filePath) => this.queueChange(filePath))
      .on('change', (filePath) => this.queueChange(filePath))
      .on('unlink', (filePath) => this.emit('file_deleted', path.relative(this.targetDir, filePath)));
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

    console.log(`⏳ Processing ${filesToProcess.length} changed files...`);

    for (const filePath of filesToProcess) {
      const relPath = path.relative(this.targetDir, filePath);
      const diff = await getFileDiff(this.targetDir, filePath);
      
      if (diff) {
        console.log(`[SYNTHESIS REQUIRED] ${relPath}`);
        this.emit('file_changed', { filePath: relPath, diff });
      } else {
         console.log(`[IGNORED] ${relPath} (No significant diff)`);
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
