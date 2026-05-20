import fs from "fs";
import path from "path";

export interface SavingsTransaction {
  timestamp: string;
  category: "ingest_bypass" | "reference_compression" | "brevity_transformation" | "command_minification";
  provider: string;
  model: string;
  originalTokens: number;
  denseTokens: number;
  savedTokens: number;
  savedUsd: number;
  details?: string;
  spentTokens?: number;
  spentUsd?: number;
}

// Token-to-character heuristics to estimate token count when offline
export const CHAR_TO_TOKEN_RATIOS: Record<string, number> = {
  openai: 3.8,      // ~3.8 chars per token
  gpt: 3.8,
  anthropic: 3.4,   // ~3.4 chars per token
  claude: 3.4,
  google: 3.6,      // ~3.6 chars per token
  gemini: 3.6,
  fallback: 3.5,
};

// Blended default model pricing in USD per Million Tokens
export const DEFAULT_PRICING: Record<string, { input: number; output: number }> = {
  anthropic: { input: 3.0, output: 15.0 },
  openai: { input: 5.0, output: 15.0 },
  google: { input: 3.5, output: 10.5 },
  fallback: { input: 3.5, output: 10.5 },
};

/**
 * Resolves the character-to-token ratio based on provider or model.
 */
export function estimateTokens(text: string, providerOrModel: string): number {
  if (!text) return 0;
  const name = providerOrModel.toLowerCase();
  
  let ratio = CHAR_TO_TOKEN_RATIOS.fallback;
  for (const [key, val] of Object.entries(CHAR_TO_TOKEN_RATIOS)) {
    if (name.includes(key)) {
      ratio = val;
      break;
    }
  }
  
  return Math.ceil(text.length / ratio);
}

/**
 * Calculates saved USD based on token counts and provider/model.
 */
export function calculateSavedUsd(
  savedTokens: number,
  provider: string,
  projectRoot: string
): number {
  if (savedTokens <= 0) return 0;
  
  const providerLower = provider.toLowerCase();
  let rate = DEFAULT_PRICING.fallback.input; // default to input price fallback
  
  // Try to load custom pricing from cortex.json
  try {
    const configPath = path.join(projectRoot, "cortex.json");
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      if (config.pricing) {
        // e.g. config.pricing.anthropic.input
        for (const [key, val] of Object.entries(config.pricing)) {
          if (providerLower.includes(key.toLowerCase()) && val && typeof val === "object") {
            const inputRate = (val as any).input || (val as any).inputRate;
            if (typeof inputRate === "number") {
              rate = inputRate;
              break;
            }
          }
        }
      }
    }
  } catch {
    // Ignore config reading errors, fallback to default pricing table
  }

  // Fallback to static pricing table if not found in custom config
  if (rate === DEFAULT_PRICING.fallback.input) {
    for (const [key, val] of Object.entries(DEFAULT_PRICING)) {
      if (providerLower.includes(key)) {
        rate = val.input;
        break;
      }
    }
  }

  // Rate is USD per Million Tokens
  return (savedTokens / 1_000_000) * rate;
}

/**
 * Calculates spent USD based on input/output tokens, provider, and custom pricing.
 */
export function calculateSpentUsd(
  inputTokens: number,
  outputTokens: number,
  provider: string,
  projectRoot: string
): number {
  const providerLower = provider.toLowerCase();
  let rates = DEFAULT_PRICING.fallback;
  
  // Try to load custom pricing from cortex.json
  try {
    const configPath = path.join(projectRoot, "cortex.json");
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      if (config.pricing) {
        for (const [key, val] of Object.entries(config.pricing)) {
          if (providerLower.includes(key.toLowerCase()) && val && typeof val === "object") {
            const inputRate = (val as any).input || (val as any).inputRate;
            const outputRate = (val as any).output || (val as any).outputRate;
            if (typeof inputRate === "number" && typeof outputRate === "number") {
              rates = { input: inputRate, output: outputRate };
              break;
            }
          }
        }
      }
    }
  } catch {
    // Ignore config reading errors, fallback to default pricing table
  }

  // Fallback to static pricing table if not found in custom config
  if (rates === DEFAULT_PRICING.fallback) {
    for (const [key, val] of Object.entries(DEFAULT_PRICING)) {
      if (providerLower.includes(key)) {
        rates = val;
        break;
      }
    }
  }

  return (inputTokens / 1_000_000) * rates.input + (outputTokens / 1_000_000) * rates.output;
}


/**
 * Appends a new transaction atomically to the local savings ledger file.
 */
export async function appendTransaction(
  projectRoot: string,
  tx: Omit<SavingsTransaction, "timestamp">
): Promise<void> {
  try {
    const knowledgeDir = path.join(projectRoot, ".knowledge");
    if (!fs.existsSync(knowledgeDir)) {
      fs.mkdirSync(knowledgeDir, { recursive: true });
    }

    const ledgerPath = path.join(knowledgeDir, "savings_ledger.jsonl");
    const transaction: SavingsTransaction = {
      timestamp: new Date().toISOString(),
      ...tx,
    };

    // Fast atomic append to the file
    await fs.promises.appendFile(
      ledgerPath,
      JSON.stringify(transaction) + "\n",
      "utf-8"
    );
  } catch (err: any) {
    console.error(`[Cortex] Failed to write savings transaction: ${err.message}`);
  }
}

/**
 * Reads all transaction records from the ledger file, parsing them line-by-line.
 */
export async function readTransactions(projectRoot: string): Promise<SavingsTransaction[]> {
  const ledgerPath = path.join(projectRoot, ".knowledge", "savings_ledger.jsonl");
  if (!fs.existsSync(ledgerPath)) {
    return [];
  }

  try {
    const content = await fs.promises.readFile(ledgerPath, "utf-8");
    const lines = content.split("\n");
    const transactions: SavingsTransaction[] = [];

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const tx = JSON.parse(line) as SavingsTransaction;
        transactions.push(tx);
      } catch {
        // Skip malformed/corrupted lines gracefully
      }
    }

    return transactions;
  } catch (err: any) {
    console.error(`[Cortex] Failed to read savings transactions: ${err.message}`);
    return [];
  }
}
