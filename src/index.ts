import { CortexWatcher } from './core/watcher.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Watch the root project directory (one level up from src)
const rootDir = path.resolve(__dirname, '..');

const watcher = new CortexWatcher(rootDir);

watcher.on('file_changed', ({ filePath, diff }) => {
  console.log(`\n--- DIFF CAPTURED FOR ${filePath} ---`);
  // Print first 5 lines of diff to avoid spamming console
  console.log(diff.split('\n').slice(0, 5).join('\n'));
  console.log('...\n-----------------------------------\n');
  
  // Here we will eventually pass the diff to the LLM
});

watcher.on('file_deleted', (filePath) => {
  console.log(`\n[ALERT] File deleted: ${filePath}`);
  // Here we will eventually notify the LLM to update concepts
});

watcher.start();
