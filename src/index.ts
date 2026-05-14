import { CortexWatcher } from './core/watcher.js';
import { synthesizeChanges } from './llm/client.js';
import { KnowledgeManager } from './knowledge/writer.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Watch the root project directory (one level up from src)
const rootDir = path.resolve(__dirname, '..');

const watcher = new CortexWatcher(rootDir);
const knowledge = new KnowledgeManager(rootDir);

// Initialize knowledge directory
await knowledge.init();

// In-memory queue for manual ingestion
const pendingDiffs: Map<string, string> = new Map();

// Listen for manual sync command from terminal
process.stdin.setEncoding('utf8');
process.stdin.on('data', async (data) => {
  const input = data.toString().trim();
  
  if (input === 'cortex-sync') {
    if (pendingDiffs.size === 0) {
      console.log('ℹ️  No pending changes to sync.');
      return;
    }

    console.log(`\n🚀 SYNC STARTING: Processing ${pendingDiffs.size} file(s)...`);
    
    // Combine all diffs into one batch for the LLM
    let batchDiff = '';
    for (const [file, diff] of pendingDiffs.entries()) {
      batchDiff += `\nFILE: ${file}\n${diff}\n-------------------\n`;
    }

    const synthesis = await synthesizeChanges(batchDiff, 'Batch Sync Process');
    
    if (synthesis) {
      console.log(`✨ BATCH INSIGHTS CAPTURED.`);
      await knowledge.saveSynthesis(synthesis);
      pendingDiffs.clear();
    } else {
      console.log(`❌ Sync failed.`);
    }
  }
});

watcher.on('file_changed', async ({ filePath, diff }) => {
  const mode = process.env.INGESTION_MODE || 'auto';
  
  if (mode === 'manual') {
    pendingDiffs.set(filePath, diff);
    console.log(`\n[QUEUED] ${filePath} (Type 'cortex-sync' to ingest)`);
    return;
  }

  console.log(`\n--- DIFF CAPTURED FOR ${filePath} ---`);
  console.log(`🧠 Synthesizing architectural impact...`);
  
  const synthesis = await synthesizeChanges(diff, 'Initial state: Empty Knowledge Base.');
  
  if (synthesis) {
    console.log(`✨ AI INSIGHTS for ${filePath}:`);
    console.log(JSON.stringify(synthesis, null, 2));
    await knowledge.saveSynthesis(synthesis);
  } else {
    console.log(`⏭️  Synthesis skipped (Missing API Key or Error).`);
  }
});

watcher.on('file_deleted', (filePath) => {
  console.log(`\n[ALERT] File deleted: ${filePath}`);
});

await watcher.start();


