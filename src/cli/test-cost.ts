import { getPendingDiff } from "../core/diff.js";
import { KnowledgeManager } from "../knowledge/writer.js";
import { LIBRARIAN_SYSTEM_PROMPT } from "../llm/prompts.js";
import { estimateTokens } from "../knowledge/packer.js";

// Standard pricing (USD per 1M tokens)
const PRICING = {
  "gpt-4o": { input: 5.00, output: 15.00 },
  "claude-3-5-sonnet": { input: 3.00, output: 15.00 },
  "gemini-1.5-pro": { input: 3.50, output: 10.50 }
};

export async function runTestCost(projectRoot: string, options: { budget?: string }) {
  const km = new KnowledgeManager(projectRoot);
  const state = await km.getState();
  
  // Try to get last synced commit to get diff
  const lastSyncCommit = "no-commits"; // In a real run, this would be read from a state file or similar if we tracked it per-workspace
  const diff = await getPendingDiff(projectRoot, lastSyncCommit);

  if (!diff.trim() || diff.startsWith("[Diff Error]")) {
    console.log("No pending changes or unable to get diff.");
    return;
  }

  // Construct a simulated CURRENT CONTEXT block
  let contextBlock = `### CURRENT CONTEXT\n\n`;
  for (const [name, entity] of Object.entries(state.entities)) {
    contextBlock += `Name: ${name}\nDescription: ${entity.description}\n\n`;
  }
  for (const [name, concept] of Object.entries(state.concepts)) {
    contextBlock += `Concept: ${name}\nDescription: ${concept.description}\n\n`;
  }

  const simulatedPrompt = LIBRARIAN_SYSTEM_PROMPT + "\n\n" + contextBlock + "\n\n### CODE CHANGES\n" + diff;
  const inputTokens = estimateTokens(simulatedPrompt);
  
  // Output is typically smaller, heuristics: 10-20% of input or a fixed 500 tokens if small
  const estimatedOutputTokens = Math.max(500, Math.floor(inputTokens * 0.15));
  const totalTokens = inputTokens + estimatedOutputTokens;

  console.log(`\n📊 Offline Cost Estimate`);
  console.log(`   Estimated Input Tokens:  ~${inputTokens.toLocaleString()}`);
  console.log(`   Estimated Output Tokens: ~${estimatedOutputTokens.toLocaleString()}`);
  console.log(`   Total Tokens:            ~${totalTokens.toLocaleString()}`);
  console.log(`\n💰 Estimated USD Cost per Sync:`);

  let maxCost = 0;
  for (const [model, rates] of Object.entries(PRICING)) {
    const cost = (inputTokens / 1_000_000) * rates.input + (estimatedOutputTokens / 1_000_000) * rates.output;
    maxCost = Math.max(maxCost, cost);
    console.log(`   - ${model.padEnd(20)}: $${cost.toFixed(4)}`);
  }

  if (options.budget) {
    const budget = parseFloat(options.budget);
    if (isNaN(budget)) {
      console.error(`❌ Invalid budget: ${options.budget}`);
      process.exit(1);
    }
    
    if (maxCost > budget) {
      console.error(`\n🚨 BUDGET EXCEEDED: Estimated cost ($${maxCost.toFixed(4)}) is higher than budget ($${budget.toFixed(4)})`);
      process.exit(1);
    } else {
      console.log(`\n✅ Within budget ($${budget.toFixed(4)}).`);
    }
  }
}
