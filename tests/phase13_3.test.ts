import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "fs/promises";
import os from "os";
import path from "path";
import {
  estimateTokens,
  calculateSavedUsd,
  appendTransaction,
  readTransactions,
  SavingsTransaction,
} from "../src/knowledge/ledger.js";

describe("Phase 13.3 — Token & Cost Savings Ledger & Analytics Suite", () => {
  describe("Offline Token Estimation Heuristics", () => {
    it("correctly estimates tokens using provider-specific character multipliers", () => {
      const text = "Hello world! This is a simple test text to verify character to token estimates.";
      
      // OpenAI has ratio of ~3.8
      const openaiEst = estimateTokens(text, "openai");
      assert.strictEqual(openaiEst, Math.ceil(text.length / 3.8));

      // Anthropic has ratio of ~3.4
      const anthropicEst = estimateTokens(text, "anthropic");
      assert.strictEqual(anthropicEst, Math.ceil(text.length / 3.4));

      // Fallback has ratio of ~3.5
      const fallbackEst = estimateTokens(text, "unknown_provider");
      assert.strictEqual(fallbackEst, Math.ceil(text.length / 3.5));
    });

    it("returns 0 for empty or null strings", () => {
      assert.strictEqual(estimateTokens("", "openai"), 0);
    });
  });

  describe("Cost Savings Calculation", () => {
    let tmpDir: string;

    beforeEach(async () => {
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "cortex-pricing-"));
    });

    afterEach(async () => {
      try {
        await fs.rm(tmpDir, { recursive: true, force: true });
      } catch {}
    });

    it("calculates exact USD saved based on static fallback provider rates", () => {
      const savedTokens = 500_000;
      
      // Anthropic Input rate is $3.00 per Million
      const anthropicSavings = calculateSavedUsd(savedTokens, "anthropic", tmpDir);
      assert.strictEqual(anthropicSavings, (500_000 / 1_000_000) * 3.0);

      // OpenAI Input rate is $5.00 per Million
      const openaiSavings = calculateSavedUsd(savedTokens, "openai", tmpDir);
      assert.strictEqual(openaiSavings, (500_000 / 1_000_000) * 5.0);
    });

    it("calculates cost savings using custom pricing from cortex.json if configured", async () => {
      const customConfig = {
        pricing: {
          anthropic: { input: 12.0 }, // Custom $12 per Million tokens rate
        },
      };
      await fs.writeFile(path.join(tmpDir, "cortex.json"), JSON.stringify(customConfig), "utf-8");

      const savedTokens = 100_000;
      const customSavings = calculateSavedUsd(savedTokens, "anthropic", tmpDir);
      assert.strictEqual(customSavings, (100_000 / 1_000_000) * 12.0);
    });
  });

  describe("Persistent Local Ledger Appending and Reading", () => {
    let tmpDir: string;

    beforeEach(async () => {
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "cortex-ledger-"));
    });

    afterEach(async () => {
      try {
        await fs.rm(tmpDir, { recursive: true, force: true });
      } catch {}
    });

    it("appends and reads transactional records accurately in YYYY-MM-DD chronological format", async () => {
      const tx1 = {
        category: "brevity_transformation" as const,
        provider: "anthropic",
        model: "claude-3-5-sonnet",
        originalTokens: 2500,
        denseTokens: 1500,
        savedTokens: 1000,
        savedUsd: 0.003,
        details: "Compressed index",
      };

      const tx2 = {
        category: "reference_compression" as const,
        provider: "openai",
        model: "gpt-4o",
        originalTokens: 5000,
        denseTokens: 200,
        savedTokens: 4800,
        savedUsd: 0.024,
        details: "Ref compression on entity A",
      };

      await appendTransaction(tmpDir, tx1);
      await appendTransaction(tmpDir, tx2);

      const records = await readTransactions(tmpDir);
      assert.strictEqual(records.length, 2);

      assert.strictEqual(records[0].category, "brevity_transformation");
      assert.strictEqual(records[0].provider, "anthropic");
      assert.strictEqual(records[0].savedTokens, 1000);
      assert.strictEqual(records[0].savedUsd, 0.003);

      assert.strictEqual(records[1].category, "reference_compression");
      assert.strictEqual(records[1].provider, "openai");
      assert.strictEqual(records[1].savedTokens, 4800);
      assert.strictEqual(records[1].savedUsd, 0.024);
      assert.ok(new Date(records[0].timestamp).getTime() > 0, "Timestamp must be a valid ISO Date");
    });

    it("skips and recovers from malformed/corrupted json lines gracefully", async () => {
      const knowledgeDir = path.join(tmpDir, ".knowledge");
      await fs.mkdir(knowledgeDir, { recursive: true });
      const ledgerPath = path.join(knowledgeDir, "savings_ledger.jsonl");

      // Write one valid line, one corrupted line, and another valid line
      const validTx1 = {
        timestamp: new Date().toISOString(),
        category: "ingest_bypass",
        provider: "openai",
        model: "gpt-4o",
        originalTokens: 100,
        denseTokens: 10,
        savedTokens: 90,
        savedUsd: 0.00045,
      };

      const validTx2 = {
        timestamp: new Date().toISOString(),
        category: "command_minification",
        provider: "google",
        model: "gemini-1.5-pro",
        originalTokens: 200,
        denseTokens: 20,
        savedTokens: 180,
        savedUsd: 0.00063,
      };

      await fs.writeFile(
        ledgerPath,
        JSON.stringify(validTx1) + "\n" +
        "{ malformed json string... " + "\n" +
        JSON.stringify(validTx2) + "\n",
        "utf-8"
      );

      const records = await readTransactions(tmpDir);
      assert.strictEqual(records.length, 2, "Must filter out corrupted lines");
      assert.strictEqual(records[0].category, "ingest_bypass");
      assert.strictEqual(records[1].category, "command_minification");
    });
  });
});
