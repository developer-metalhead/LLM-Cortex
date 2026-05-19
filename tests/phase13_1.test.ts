import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { estimateTokens } from "../src/knowledge/packer.js";
import { computeCostEstimate, runTestCost } from "../src/cli/test-cost.js";
import { KnowledgeManager } from "../src/knowledge/writer.js";

const execAsync = promisify(exec);

describe("Phase 13.1 — Dense & Raw Token-Reduction Projections Suite", () => {
  describe("Provider-Aware Tokenizer Heuristics", () => {
    it("applies specific divisor heuristics for configured providers", () => {
      const text = "a".repeat(380);

      // Default (no provider): chars / 3.5 = 380 / 3.5 = 109 tokens
      assert.strictEqual(estimateTokens(text), 109);

      // OpenAI / GPT (divisor 3.8): 380 / 3.8 = 100 tokens
      assert.strictEqual(estimateTokens(text, "openai"), 100);
      assert.strictEqual(estimateTokens(text, "gpt-4o"), 100);

      // Anthropic / Claude (divisor 3.4): 380 / 3.4 = 112 tokens
      assert.strictEqual(estimateTokens(text, "anthropic"), 112);
      assert.strictEqual(estimateTokens(text, "claude-3-5-sonnet"), 112);

      // Google / Gemini (divisor 3.6): 380 / 3.6 = 106 tokens
      assert.strictEqual(estimateTokens(text, "google"), 106);
      assert.strictEqual(estimateTokens(text, "gemini-1.5-pro"), 106);
    });
  });

  describe("Comparative Cost Projection Engine", () => {
    let tmpDir: string;
    let km: KnowledgeManager;

    beforeEach(async () => {
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "cortex-phase13_1-"));
      km = new KnowledgeManager(tmpDir);
      await km.init();

      // Initialize git repo to support diffing
      await execAsync("git init", { cwd: tmpDir });
      await execAsync('git config user.name "Test"', { cwd: tmpDir });
      await execAsync('git config user.email "test@test.com"', { cwd: tmpDir });
    });

    afterEach(async () => {
      try {
        await fs.rm(tmpDir, { recursive: true, force: true });
      } catch {}
    });

    it("correctly computes raw input tokens, savings tokens, and savings percentage", async () => {
      // 1. Setup initial codebase with one file
      const testFilePath = path.join(tmpDir, "test.ts");
      const fileContent = "export function hello() {\n  console.log('hello world');\n}\n".repeat(50);
      await fs.writeFile(testFilePath, fileContent);

      await execAsync("git add test.ts", { cwd: tmpDir });
      await execAsync('git commit -m "Initial commit"', { cwd: tmpDir });

      // Save synthesis so we are not empty and have the last commit setup
      const head = (await execAsync("git rev-parse HEAD", { cwd: tmpDir })).stdout.trim();
      await km.saveSynthesis({
        summary: "initial sync",
        entities: [
          {
            name: "HelloFn",
            action: "create",
            description: "Say hello to the world.",
            relationships: [],
            sourceFile: "test.ts"
          }
        ],
        concepts: [],
        warnings: []
      });

      // Write commit marker to last_sync_commit
      await fs.writeFile(path.join(tmpDir, ".knowledge", ".last_sync_commit"), head);

      // 2. Modify file to create a diff
      const modifiedContent = fileContent + "\n// Adding a change to trigger pending diff\n";
      await fs.writeFile(testFilePath, modifiedContent);

      // 3. Compute cost estimate
      const estimate = await computeCostEstimate(tmpDir);

      assert.ok(estimate.hasDiff, "Must detect pending diff");
      assert.ok(estimate.rawInputTokens > 0, "Must calculate non-zero raw input tokens");
      assert.ok(estimate.inputTokens > 0, "Must calculate non-zero dense input tokens");
      assert.ok(estimate.rawInputTokens > estimate.inputTokens, "Raw tokens should be larger than dense tokens");
      assert.strictEqual(estimate.savingsTokens, estimate.rawInputTokens - estimate.inputTokens);
      assert.ok(estimate.savingsPercentage > 0, "Savings percentage must be greater than zero");

      // Verify raw costs are generated per provider
      assert.ok(estimate.rawCosts["gpt-4o"] > 0);
      assert.ok(estimate.rawCosts["claude-3-5-sonnet"] > 0);
      assert.ok(estimate.rawCosts["gemini-1.5-pro"] > 0);

      // Verify that runTestCost executes cleanly with options
      let logged = false;
      const originalLog = console.log;
      console.log = () => { logged = true; };
      try {
        await runTestCost(tmpDir, { compare: true });
        assert.ok(logged, "Should log comparative output");

        logged = false;
        await runTestCost(tmpDir, { projection: true });
        assert.ok(logged, "Should log projection output");

        logged = false;
        await runTestCost(tmpDir, {});
        assert.ok(logged, "Should log standard cost estimate");
      } finally {
        console.log = originalLog;
      }
    });
  });
});
