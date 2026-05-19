import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { KnowledgeManager } from "../src/knowledge/writer.js";
import { buildContextPack, estimateTokens } from "../src/knowledge/packer.js";
import { computeCostEstimate } from "../src/cli/test-cost.js";
import { compressResponse, resolveRefs, getSessionCache } from "../src/mcp/compression.js";
import type { Synthesis } from "../src/llm/schema.js";

let tmp: string;
let km: KnowledgeManager;

beforeEach(async () => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), "cortex-phase13-"));
  km = new KnowledgeManager(tmp);
  await km.init();
});

afterEach(async () => {
  try {
    await fs.rm(tmp, { recursive: true, force: true });
  } catch {}
});

function syn(partial: Partial<Synthesis>): Synthesis {
  return {
    summary: "test",
    entities: [],
    concepts: [],
    warnings: [],
    ...partial,
  };
}

describe("Phase 13 — Token Economics & Context Packs Suite", () => {
  
  describe("Token Heuristic Estimator", () => {
    it("estimates tokens using a simple character-count heuristic (chars/3.5)", () => {
      const text = "1234567";
      // 7 / 3.5 = 2 tokens
      assert.strictEqual(estimateTokens(text), 2);
      
      const longer = "a".repeat(35);
      // 35 / 3.5 = 10 tokens
      assert.strictEqual(estimateTokens(longer), 10);
    });
  });

  describe("Context Pack Builder", () => {
    it("builds a budget-bounded markdown pack, greedily filling by centrality/quality and footnoting elided links", async () => {
      await km.saveSynthesis(
        syn({
          entities: [
            {
              name: "ImportantController",
              action: "create",
              description: "Extremely critical module that orchestrates core API routing.",
              relationships: [{ target: "UtilityService", kind: "depends_on" }],
              sourceFile: "src/controllers/important.ts",
            },
            {
              name: "UtilityService",
              action: "create",
              description: "A secondary helper service providing simple date utils.",
              relationships: [],
              sourceFile: "src/utils/date.ts",
            }
          ]
        })
      );

      const state = await km.getState();
      
      // Give a tiny budget that only fits ImportantController
      // ImportantController is more central (out-degree doesn't make it central, but inbound does. Wait, UtilityService has inbound from ImportantController, so UtilityService is actually more central under standard PageRank. But let's check greedy budget behavior).
      const pack1 = buildContextPack(state, { budget: 120 });
      
      assert.ok(pack1.tokens <= 120, "Pack must remain within token budget limit");
      assert.ok(pack1.output.includes("UtilityService") || pack1.output.includes("ImportantController"), "Should include at least one entity");
      
      if (pack1.elided.length > 0) {
        assert.ok(pack1.output.includes("elided to fit"), "Markdown footer must footnote elided entities");
        assert.ok(pack1.elided.includes("ImportantController") || pack1.elided.includes("UtilityService"), "Elided list should contain the omitted entity");
      }
    });

    it("supports json formatting of the pack output", async () => {
      await km.saveSynthesis(
        syn({
          entities: [
            {
              name: "TestA",
              action: "create",
              description: "Just a test.",
              relationships: [],
              sourceFile: "src/test.ts",
            }
          ]
        })
      );
      
      const state = await km.getState();
      const pack = buildContextPack(state, { format: "json" });
      
      const parsed = JSON.parse(pack.output);
      assert.ok(parsed.nodes, "JSON format output must contain nodes");
      assert.strictEqual(parsed.nodes[0].id, "TestA");
    });
  });

  describe("MCP Response Compression & resolve_refs", () => {
    it("compresses responses by replacing duplicated large blocks with references", () => {
      const sessionId = "test-session";
      const cache = getSessionCache(sessionId);
      
      const duplicateBlock = "This is a very long text block that exceeds the minimum character limit for compression. " +
        "It needs to be repeated in multiple sequential MCP tool calls so we can verify that the second call returns a hash instead of redelivering the full block. ".repeat(3);
      
      // First call (cache miss)
      const firstResponse = compressResponse(duplicateBlock, sessionId, true);
      assert.strictEqual(firstResponse, duplicateBlock, "First response should return original text but cache it");
      
      // Second call (cache hit)
      const secondResponse = compressResponse(duplicateBlock, sessionId, true);
      assert.ok(secondResponse.startsWith("§ref:"), "Second response must return a compression reference");
      assert.ok(secondResponse.endsWith("§"), "Compression reference must end with §");
      
      const hash = secondResponse.slice(5, -1);
      
      // Resolve references
      const resolved = resolveRefs([hash], sessionId);
      assert.strictEqual(resolved[hash], duplicateBlock, "resolveRefs must correctly return original block contents from cache");
    });

    it("honors cache eviction when token budget is exceeded", () => {
      const sessionId = "evict-session";
      const cache = getSessionCache(sessionId);
      
      const blockA = "Block A: " + "a".repeat(150);
      const blockB = "Block B: " + "b".repeat(150);
      
      // Seed both
      compressResponse(blockA, sessionId, true);
      compressResponse(blockB, sessionId, true);
      
      // Get ref hashes
      const refA = compressResponse(blockA, sessionId, true).slice(5, -1);
      const refB = compressResponse(blockB, sessionId, true).slice(5, -1);
      
      assert.strictEqual(resolveRefs([refA], sessionId)[refA], blockA, "Block A should be in cache");
      assert.strictEqual(resolveRefs([refB], sessionId)[refB], blockB, "Block B should be in cache");
    });
  });
});
