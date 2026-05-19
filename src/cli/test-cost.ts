import { getPendingDiff } from "../core/diff.js";
import { KnowledgeManager } from "../knowledge/writer.js";
import { LIBRARIAN_SYSTEM_PROMPT } from "../llm/prompts.js";
import { estimateTokens } from "../knowledge/packer.js";

export const PRICING: Record<string, { input: number; output: number }> = {
  "gpt-4o":             { input: 5.00,  output: 15.00 },
  "claude-3-5-sonnet":  { input: 3.00,  output: 15.00 },
  "gemini-1.5-pro":     { input: 3.50,  output: 10.50 },
};

export interface CostEstimate {
  hasDiff: boolean;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costs: Record<string, number>;
  maxCost: number;
}

export async function computeCostEstimate(projectRoot: string): Promise<CostEstimate> {
  const km = new KnowledgeManager(projectRoot);
  const state = await km.getState();
  const lastSyncCommit = (await km.getLastSyncCommit()) ?? "no-commits";
  const diff = await getPendingDiff(projectRoot, lastSyncCommit);

  if (!diff.trim() || diff.startsWith("[Diff Error]")) {
    return { hasDiff: false, inputTokens: 0, outputTokens: 0, totalTokens: 0, costs: {}, maxCost: 0 };
  }

  let contextBlock = `### CURRENT CONTEXT\n\n`;
  for (const [name, entity] of Object.entries(state.entities)) {
    contextBlock += `Name: ${name}\nDescription: ${entity.description}\n\n`;
  }
  for (const [name, concept] of Object.entries(state.concepts)) {
    contextBlock += `Concept: ${name}\nDescription: ${concept.description}\n\n`;
  }

  const simulatedPrompt = LIBRARIAN_SYSTEM_PROMPT + "\n\n" + contextBlock + "\n\n### CODE CHANGES\n" + diff;
  const inputTokens = estimateTokens(simulatedPrompt);
  const outputTokens = Math.max(500, Math.floor(inputTokens * 0.15));
  const totalTokens = inputTokens + outputTokens;

  const costs: Record<string, number> = {};
  let maxCost = 0;
  for (const [model, rates] of Object.entries(PRICING)) {
    const cost = (inputTokens / 1_000_000) * rates.input + (outputTokens / 1_000_000) * rates.output;
    costs[model] = cost;
    maxCost = Math.max(maxCost, cost);
  }

  return { hasDiff: true, inputTokens, outputTokens, totalTokens, costs, maxCost };
}

export async function runTestCost(projectRoot: string, options: { budget?: string }) {
  const estimate = await computeCostEstimate(projectRoot);

  if (!estimate.hasDiff) {
    console.log("No pending changes or unable to get diff.");
    return;
  }

  console.log(`\n📊 Offline Cost Estimate`);
  console.log(`   Estimated Input Tokens:  ~${estimate.inputTokens.toLocaleString()}`);
  console.log(`   Estimated Output Tokens: ~${estimate.outputTokens.toLocaleString()}`);
  console.log(`   Total Tokens:            ~${estimate.totalTokens.toLocaleString()}`);
  console.log(`\n💰 Estimated USD Cost per Sync:`);

  for (const [model, cost] of Object.entries(estimate.costs)) {
    console.log(`   - ${model.padEnd(20)}: $${cost.toFixed(4)}`);
  }

  if (options.budget) {
    const budget = parseFloat(options.budget);
    if (isNaN(budget)) {
      console.error(`❌ Invalid budget: ${options.budget}`);
      process.exit(1);
    }
    if (estimate.maxCost > budget) {
      console.error(`\n🚨 BUDGET EXCEEDED: Estimated cost ($${estimate.maxCost.toFixed(4)}) is higher than budget ($${budget.toFixed(4)})`);
      process.exit(1);
    } else {
      console.log(`\n✅ Within budget ($${budget.toFixed(4)}).`);
    }
  }
}
