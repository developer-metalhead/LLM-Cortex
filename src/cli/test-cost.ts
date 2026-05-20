import { getPendingDiff } from "../core/diff.js";
import { KnowledgeManager } from "../knowledge/writer.js";
import { LIBRARIAN_SYSTEM_PROMPT } from "../llm/prompts.js";
import { estimateTokens } from "../knowledge/packer.js";
import fs from "fs/promises";
import path from "path";
import { loadSafeguardConfig } from "../knowledge/safeguards.js";

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
  rawInputTokens: number;
  rawOutputTokens: number;
  rawTotalTokens: number;
  rawCosts: Record<string, number>;
  savingsTokens: number;
  savingsPercentage: number;
}

export async function computeCostEstimate(projectRoot: string): Promise<CostEstimate> {
  const km = new KnowledgeManager(projectRoot);
  const state = await km.getState();
  const lastSyncCommit = (await km.getLastSyncCommit()) ?? "no-commits";
  const diff = await getPendingDiff(projectRoot, lastSyncCommit);

  if (!diff.trim() || diff.startsWith("[Diff Error]")) {
    return {
      hasDiff: false,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      costs: {},
      maxCost: 0,
      rawInputTokens: 0,
      rawOutputTokens: 0,
      rawTotalTokens: 0,
      rawCosts: {},
      savingsTokens: 0,
      savingsPercentage: 0,
    };
  }

  let contextBlock = `### CURRENT CONTEXT\n\n`;
  for (const [name, entity] of Object.entries(state.entities)) {
    contextBlock += `Name: ${name}\nDescription: ${entity.description}\n\n`;
  }
  for (const [name, concept] of Object.entries(state.concepts)) {
    contextBlock += `Concept: ${name}\nDescription: ${concept.description}\n\n`;
  }

  const simulatedPrompt = LIBRARIAN_SYSTEM_PROMPT + "\n\n" + contextBlock + "\n\n### CODE CHANGES\n" + diff;
  const provider = process.env.CORTEX_PROVIDER || "openai";
  const inputTokens = estimateTokens(simulatedPrompt, provider);
  const outputTokens = Math.max(500, Math.floor(inputTokens * 0.15));
  const totalTokens = inputTokens + outputTokens;

  // Extract changed files from the diff
  const changedFiles = new Set<string>();
  const lines = diff.split("\n");
  for (const line of lines) {
    if (line.startsWith("diff --git a/")) {
      const match = line.match(/^diff --git a\/(.+?) b\/(.+)$/);
      if (match && match[2]) {
        changedFiles.add(match[2].trim());
      }
    }
  }

  let rawFilesContent = "";
  for (const file of changedFiles) {
    const filePath = path.resolve(projectRoot, file);
    try {
      const content = await fs.readFile(filePath, "utf-8");
      rawFilesContent += `\n\n--- FILE: ${file} ---\n${content}`;
    } catch {
      // Ignored if deleted or not readable
    }
  }

  const rawSimulatedPrompt = LIBRARIAN_SYSTEM_PROMPT + "\n\n" + rawFilesContent;
  const rawInputTokens = estimateTokens(rawSimulatedPrompt, provider);
  const rawOutputTokens = Math.max(500, Math.floor(rawInputTokens * 0.15));
  const rawTotalTokens = rawInputTokens + rawOutputTokens;

  const costs: Record<string, number> = {};
  const rawCosts: Record<string, number> = {};
  let maxCost = 0;
  for (const [model, rates] of Object.entries(PRICING)) {
    const cost = (inputTokens / 1_000_000) * rates.input + (outputTokens / 1_000_000) * rates.output;
    costs[model] = cost;
    maxCost = Math.max(maxCost, cost);

    const rawCost = (rawInputTokens / 1_000_000) * rates.input + (rawOutputTokens / 1_000_000) * rates.output;
    rawCosts[model] = rawCost;
  }

  const savingsTokens = Math.max(0, rawInputTokens - inputTokens);
  const savingsPercentage = rawInputTokens > 0 ? (savingsTokens / rawInputTokens) * 100 : 0;

  return {
    hasDiff: true,
    inputTokens,
    outputTokens,
    totalTokens,
    costs,
    maxCost,
    rawInputTokens,
    rawOutputTokens,
    rawTotalTokens,
    rawCosts,
    savingsTokens,
    savingsPercentage,
  };
}

export async function runTestCost(
  projectRoot: string,
  options: { budget?: string; compare?: boolean; projection?: boolean; runsPerDay?: string }
) {
  const estimate = await computeCostEstimate(projectRoot);

  if (!estimate.hasDiff) {
    console.log("No pending changes or unable to get diff.");
    return;
  }

  if (options.compare) {
    console.log(`\n📊 Offline Cost Comparison (Raw vs Dense)`);
    console.log(`────────────────────────────────────────────────────────────────────────`);
    console.log(`   [Raw Payload (Full Files)]`);
    console.log(`   - Input Tokens:     ~${estimate.rawInputTokens.toLocaleString()}`);
    console.log(`   - Output Tokens:    ~${estimate.rawOutputTokens.toLocaleString()}`);
    console.log(`   - Total Tokens:     ~${estimate.rawTotalTokens.toLocaleString()}`);
    console.log(`\n   [Dense Payload (Cortex optimized)]`);
    console.log(`   - Input Tokens:     ~${estimate.inputTokens.toLocaleString()}`);
    console.log(`   - Output Tokens:    ~${estimate.outputTokens.toLocaleString()}`);
    console.log(`   - Total Tokens:     ~${estimate.totalTokens.toLocaleString()}`);
    console.log(`\n   📉 Payload Savings:`);
    console.log(`   - Tokens Saved:     ~${estimate.savingsTokens.toLocaleString()} (${estimate.savingsPercentage.toFixed(1)}% Reduction)`);
    console.log(`\n   💰 Synced Cost Comparison per Sync:`);
    console.log(`     Model                Raw Cost       Dense Cost     Net Savings`);
    
    for (const model of Object.keys(PRICING)) {
      const rawCost = estimate.rawCosts[model];
      const denseCost = estimate.costs[model];
      const netSavings = Math.max(0, rawCost - denseCost);
      console.log(
        `     - ${model.padEnd(18)}: $${rawCost.toFixed(4).padEnd(12)} $${denseCost.toFixed(4).padEnd(13)} $${netSavings.toFixed(4)} (${estimate.savingsPercentage.toFixed(1)}%)`
      );
    }
    console.log(`────────────────────────────────────────────────────────────────────────`);
  } else if (options.projection) {
    const runsPerDay = options.runsPerDay ? parseInt(options.runsPerDay, 10) : 5;
    if (isNaN(runsPerDay) || runsPerDay <= 0) {
      console.error(`❌ Invalid runs-per-day: ${options.runsPerDay}`);
      process.exit(1);
    }
    const daysPerWeek = 5;
    const runsPerWeek = runsPerDay * daysPerWeek;
    const runsPerMonth = runsPerWeek * 4.33;
    const runsPerYear = runsPerWeek * 52;

    console.log(`\n📈 1-Year Financial ROI Projections (Cortex vs Raw)`);
    console.log(`────────────────────────────────────────────────────────────────────────`);
    console.log(`   Assumed Sync Frequency: ${runsPerDay} syncs per day (${daysPerWeek} days/week)`);
    console.log(`   Total Runs: ~${Math.round(runsPerYear).toLocaleString()} syncs / year`);
    console.log(`\n   🔮 Projected Dollar Savings by Model:`);
    console.log(`     Model                Weekly         Monthly        Yearly`);

    for (const model of Object.keys(PRICING)) {
      const rawCost = estimate.rawCosts[model];
      const denseCost = estimate.costs[model];
      const singleSavings = Math.max(0, rawCost - denseCost);

      const weekly = singleSavings * runsPerWeek;
      const monthly = singleSavings * runsPerMonth;
      const yearly = singleSavings * runsPerYear;

      console.log(
        `     - ${model.padEnd(18)}: $${weekly.toFixed(2).padEnd(13)} $${monthly.toFixed(2).padEnd(13)} $${yearly.toFixed(2)}`
      );
    }
    console.log(`────────────────────────────────────────────────────────────────────────`);
  } else {
    console.log(`\n📊 Offline Cost Estimate`);
    console.log(`   Estimated Input Tokens:  ~${estimate.inputTokens.toLocaleString()}`);
    console.log(`   Estimated Output Tokens: ~${estimate.outputTokens.toLocaleString()}`);
    console.log(`   Total Tokens:            ~${estimate.totalTokens.toLocaleString()}`);
    console.log(`\n💰 Estimated USD Cost per Sync:`);

    for (const [model, cost] of Object.entries(estimate.costs)) {
      console.log(`   - ${model.padEnd(20)}: $${cost.toFixed(4)}`);
    }

    if (estimate.savingsTokens > 0) {
      console.log(`\n📉 Cortex Token Savings:`);
      console.log(`   - Reduced input context by ${estimate.savingsTokens.toLocaleString()} tokens (${estimate.savingsPercentage.toFixed(1)}% savings)`);
    }
  }

  let budgetVal: number | undefined = undefined;
  if (options.budget) {
    budgetVal = parseFloat(options.budget);
    if (isNaN(budgetVal)) {
      console.error(`❌ Invalid budget: ${options.budget}`);
      process.exit(1);
    }
  } else {
    const config = loadSafeguardConfig(projectRoot);
    if (config.maxSessionCostUsd !== undefined) {
      budgetVal = config.maxSessionCostUsd;
    }
  }

  if (budgetVal !== undefined) {
    if (estimate.maxCost > budgetVal) {
      console.error(`\n🚨 BUDGET EXCEEDED: Estimated cost ($${estimate.maxCost.toFixed(4)}) is higher than budget ($${budgetVal.toFixed(4)})`);
      process.exit(1);
    } else {
      console.log(`\n✅ Within budget ($${budgetVal.toFixed(4)}).`);
    }
  }
}
