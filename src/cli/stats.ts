import { KnowledgeManager } from "../knowledge/writer.js";

export async function runStats(projectRoot: string): Promise<void> {
  const km = new KnowledgeManager(projectRoot);
  if (!(await km.exists())) {
    console.error("  Error: .knowledge directory not found. Initialize first with `cortex init`.");
    process.exit(1);
  }

  const state = await km.getState();
  const stats = state.brevityStats || {
    compressedFilesCount: 0,
    originalBytes: 0,
    compressedBytes: 0,
    originalTokens: 0,
    compressedTokens: 0,
    usdSaved: 0,
  };

  const savedBytes = Math.max(0, stats.originalBytes - stats.compressedBytes);
  const savedTokens = Math.max(0, stats.originalTokens - stats.compressedTokens);
  
  const byteReduction = stats.originalBytes > 0 
    ? ((savedBytes / stats.originalBytes) * 100).toFixed(1) 
    : "0.0";
    
  const tokenReduction = stats.originalTokens > 0 
    ? ((savedTokens / stats.originalTokens) * 100).toFixed(1) 
    : "0.0";

  console.log("\n  ==================================================");
  console.log("  Cortex Brevity & Telegraphic Savings Statistics");
  console.log("  ==================================================");
  console.log(`  Compressed Files Count : ${stats.compressedFilesCount}`);
  console.log(`  Original Bytes         : ${stats.originalBytes.toLocaleString()} B`);
  console.log(`  Compressed Bytes       : ${stats.compressedBytes.toLocaleString()} B`);
  console.log(`  Byte Reduction         : ${savedBytes.toLocaleString()} B (${byteReduction}%)`);
  console.log("  --------------------------------------------------");
  console.log(`  Original Tokens (est)  : ${stats.originalTokens.toLocaleString()}`);
  console.log(`  Compressed Tokens (est): ${stats.compressedTokens.toLocaleString()}`);
  console.log(`  Token Reduction        : ${savedTokens.toLocaleString()} (${tokenReduction}%)`);
  console.log("  --------------------------------------------------");
  console.log(`  Total USD Saved        : $${stats.usdSaved.toFixed(6)}`);
  console.log("  ==================================================\n");
}
