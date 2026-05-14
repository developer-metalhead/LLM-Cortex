import { CortexWatcher } from './core/watcher.js';
import { synthesizeChanges } from './llm/client.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Watch the root project directory (one level up from src)
const rootDir = path.resolve(__dirname, '..');

const watcher = new CortexWatcher(rootDir);

watcher.on('file_changed', async ({ filePath, diff }) => {
  console.log(`\n--- DIFF CAPTURED FOR ${filePath} ---`);
  
  // PHASE 2: LLM Synthesis
  console.log(`🧠 Synthesizing architectural impact...`);
  
  // For now, context is empty until Phase 3 (Knowledge Manager) is implemented
  const synthesis = await synthesizeChanges(diff, 'Initial state: Empty Knowledge Base.');
  
  if (synthesis) {
    console.log(`✨ AI INSIGHTS for ${filePath}:`);
    console.log(JSON.stringify(synthesis, null, 2));
    console.log('-----------------------------------\n');
  } else {
    console.log(`⏭️  Synthesis skipped (Missing API Key or Error).`);
    console.log('-----------------------------------\n');
  }
});

watcher.on('file_deleted', (filePath) => {
  console.log(`\n[ALERT] File deleted: ${filePath}`);
});

watcher.start();
