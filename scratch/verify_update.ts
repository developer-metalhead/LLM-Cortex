import { KnowledgeManager } from '../src/knowledge/writer.js';
import fs from 'fs/promises';
import path from 'path';

async function verifyUpdate() {
  const rootDir = process.cwd();
  const km = new KnowledgeManager(rootDir);
  const testFilePath = path.join(rootDir, '.knowledge', 'concepts', 'CortexLogic.md');

  try {
    // 1. Get current state
    const statsBefore = await fs.stat(testFilePath);
    const timeBefore = statsBefore.mtimeMs;
    console.log(`🕒 Before Sync: ${statsBefore.mtime}`);

    // 2. Simulate a new synthesis
    console.log('🔄 Simulating Knowledge Update...');
    await km.saveSynthesis({
      summary: "Verification update",
      entities: [],
      concepts: [{ name: "CortexLogic", description: "Updated description for verification." }],
      warnings: []
    });

    // 3. Check new state
    const statsAfter = await fs.stat(testFilePath);
    const timeAfter = statsAfter.mtimeMs;
    console.log(`🕒 After Sync:  ${statsAfter.mtime}`);

    if (timeAfter > timeBefore) {
      console.log('\n✅ UPDATE VERIFIED: The file was successfully overwritten with new data.');
    } else {
      console.log('\n❌ UPDATE FAILED: The file timestamp did not change.');
    }
  } catch (error) {
    console.error('❌ Test Error:', error);
  }
}

verifyUpdate();
