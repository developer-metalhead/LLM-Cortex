import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "fs/promises";
import os from "os";
import path from "path";

let tmp: string;

beforeEach(async () => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), "cortex-138-"));
});

afterEach(async () => {
  try { await fs.rm(tmp, { recursive: true, force: true }); } catch {}
});

import { SoulEngine } from "../src/knowledge/soul.js";
import { buildGraph, graphHop } from "../src/knowledge/graph.js";
import { detectLensFromDiff, rerankFindResults, computeLensBoost } from "../src/knowledge/cognitive.js";

describe("Phase 13.8 — Persistent Experience & Cognitive Mode-Adaptive Context", () => {

  describe("SoulEngine", () => {
    it("detects default ENGINEERING lens when no env/branch set", () => {
      const engine = new SoulEngine(tmp);
      assert.equal(engine.detectActiveLens(), "ENGINEERING");
    });

    it("uses CORTEX_LENS env var override", () => {
      process.env.CORTEX_LENS = "FORENSIC";
      const engine = new SoulEngine(tmp);
      assert.equal(engine.detectActiveLens(), "FORENSIC");
      delete process.env.CORTEX_LENS;
    });

    it("detects FORENSIC from branch name", () => {
      process.env.CORTEX_BRANCH = "fix/login-bug";
      const engine = new SoulEngine(tmp);
      assert.equal(engine.detectActiveLens(), "FORENSIC");
      delete process.env.CORTEX_BRANCH;
    });

    it("detects ENGINEERING from feature branch", () => {
      process.env.CORTEX_BRANCH = "feat/user-api";
      const engine = new SoulEngine(tmp);
      assert.equal(engine.detectActiveLens(), "ENGINEERING");
      delete process.env.CORTEX_BRANCH;
    });

    it("persists and reloads state via load/save", async () => {
      const soulDir = path.join(tmp, ".knowledge");
      await fs.mkdir(soulDir, { recursive: true });

      const engine1 = new SoulEngine(tmp);
      engine1.addNode({
        id: "n1",
        type: "decision",
        content: "Use JWT for auth",
        timestamp: Date.now(),
        metadata: { domain: "auth" },
        weights: { salience: 0.8, successBias: 0.5, failureBias: 0, decay: 0.01, certainty: 0.7, credibility: 0.6, energy: 0.5 },
      });
      await engine1.save();
      assert.equal(engine1.getNodes().length, 1);

      const engine2 = new SoulEngine(tmp);
      await engine2.load();
      assert.equal(engine2.getNodes().length, 1);
      assert.equal(engine2.getNodes()[0].id, "n1");
    });

    it("applies lock contention protection", async () => {
      const soulDir = path.join(tmp, ".knowledge");
      await fs.mkdir(soulDir, { recursive: true });
      const lockPath = path.join(soulDir, "soul_state.json.lock");
      await fs.writeFile(lockPath, "99999", "utf8");

      const engine = new SoulEngine(tmp);
      await assert.rejects(
        () => engine.save(),
        /held by another process/,
      );
    });

    it("reclaims stale lock after 30 seconds", async () => {
      const soulDir = path.join(tmp, ".knowledge");
      await fs.mkdir(soulDir, { recursive: true });
      const lockPath = path.join(soulDir, "soul_state.json.lock");
      const old = new Date(Date.now() - 60_000);
      await fs.writeFile(lockPath, "99999", "utf8");
      await fs.utimes(lockPath, old, old);

      const engine = new SoulEngine(tmp);
      await engine.save();
      const nodes = engine.getNodes();
      assert.ok(Array.isArray(nodes));
    });

    it("adds and retrieves nodes via retrieve()", () => {
      const engine = new SoulEngine(tmp);
      engine.addNode({
        id: "n1", type: "decision", content: "Use JWT", timestamp: Date.now(),
        metadata: {}, weights: { salience: 1, successBias: 0.5, failureBias: 0, decay: 1, certainty: 0.7, credibility: 0.6, energy: 0.5 },
      });
      engine.addNode({
        id: "n2", type: "failure", content: "JWT bug", timestamp: Date.now(),
        metadata: {}, weights: { salience: 0.9, successBias: 0, failureBias: 0.8, decay: 1, certainty: 0.7, credibility: 0.6, energy: 0.5 },
      });
      const results = engine.retrieve("JWT", "FORENSIC", 10, () => 0.5);
      assert.equal(results.length, 2);
      // FORENSIC lens boosts failures — n2 should be ranked first
      assert.equal(results[0].node.id, "n2");
    });

    it("recordCoOccurrence creates association edges", () => {
      const engine = new SoulEngine(tmp);
      engine.addNode({
        id: "a", type: "decision", content: "A", timestamp: Date.now(),
        metadata: {}, weights: { salience: 0.5, successBias: 0, failureBias: 0, decay: 0.01, certainty: 0.5, credibility: 0.5, energy: 0.5 },
      });
      engine.addNode({
        id: "b", type: "decision", content: "B", timestamp: Date.now(),
        metadata: {}, weights: { salience: 0.5, successBias: 0, failureBias: 0, decay: 0.01, certainty: 0.5, credibility: 0.5, energy: 0.5 },
      });
      engine.recordCoOccurrence(["a", "b"]);
      assert.equal(engine.getEdges().length, 1);
      assert.equal(engine.getEdges()[0].type, "association");
    });

    it("evaluateRiskClamping lowers riskTolerance on repeated failures", () => {
      const engine = new SoulEngine(tmp);
      engine.addNode({
        id: "f1", type: "failure", content: "Auth crash", timestamp: Date.now(),
        metadata: { source: "AuthModule" }, weights: { salience: 0.9, successBias: 0, failureBias: 0.7, decay: 0.01, certainty: 0.7, credibility: 0.6, energy: 0.5 },
      });
      engine.evaluateRiskClamping("AuthModule");
      assert.equal(engine.getState().globalBiases.riskTolerance, 0.1);
    });

    it("compressMilestone creates a summary node with edges", () => {
      const engine = new SoulEngine(tmp);
      engine.addNode({
        id: "n1", type: "decision", content: "Old", timestamp: Date.now(),
        metadata: {}, weights: { salience: 0.5, successBias: 0, failureBias: 0, decay: 0.01, certainty: 0.5, credibility: 0.5, energy: 0.5 },
      });
      const milestone = engine.compressMilestone(["n1"], "Phase 1");
      assert.equal(milestone.type, "insight");
      assert.ok(milestone.content.includes("Phase 1"));
      assert.equal(engine.getEdges().length, 1);
    });

    it("recordOutcome updates weights", () => {
      const engine = new SoulEngine(tmp);
      engine.addNode({
        id: "n1", type: "decision", content: "Test", timestamp: Date.now(),
        metadata: {}, weights: { salience: 0.5, successBias: 0.3, failureBias: 0, decay: 0.01, certainty: 0.5, credibility: 0.5, energy: 0.5 },
      });
      engine.recordOutcome("n1", true);
      const node = engine.getNodes()[0];
      assert.ok(node.weights.salience > 0.5);
      assert.ok(node.weights.successBias > 0.3);
    });

    it("applyDecay reduces salience over time", () => {
      const engine = new SoulEngine(tmp);
      engine.addNode({
        id: "n1", type: "decision", content: "Test", timestamp: Date.now(),
        metadata: {}, weights: { salience: 1, successBias: 0, failureBias: 0, decay: 0.5, certainty: 0.5, credibility: 0.5, energy: 1 },
      });
      engine.applyDecay(2000); // 2 seconds
      assert.ok(engine.getNodes()[0].weights.salience < 1);
    });

    it("status() returns readable output", () => {
      const engine = new SoulEngine(tmp);
      const s = engine.status();
      assert.ok(s.includes("Active Lens"));
      assert.ok(s.includes("Memory Nodes: 0"));
    });
  });

  describe("graphHop", () => {
    it("returns hop neighbors from a start entity", () => {
      const state = {
        entities: {
          A: { description: "A", relationships: [{ target: "B", kind: "depends_on" }] },
          B: { description: "B", relationships: [{ target: "C", kind: "depends_on" }] },
          C: { description: "C", relationships: [] },
        },
        concepts: {},
      };
      const graph = buildGraph(state as any);
      const result = graphHop(graph, "A", 2);
      assert.ok(result.includes("B"));
      assert.ok(result.includes("C"));
    });

    it("excludes start entity from results", () => {
      const state = {
        entities: {
          X: { description: "X", relationships: [{ target: "Y", kind: "depends_on" }] },
          Y: { description: "Y", relationships: [] },
        },
        concepts: {},
      };
      const graph = buildGraph(state as any);
      const result = graphHop(graph, "X", 2);
      assert.ok(!result.includes("X"));
      assert.ok(result.includes("Y"));
    });

    it("excludes entities in the exclude set", () => {
      const state = {
        entities: {
          A: { description: "A", relationships: [{ target: "B", kind: "depends_on" }, { target: "C", kind: "depends_on" }] },
          B: { description: "B", relationships: [] },
          C: { description: "C", relationships: [] },
        },
        concepts: {},
      };
      const graph = buildGraph(state as any);
      const result = graphHop(graph, "A", 2, new Set(["B"]));
      assert.ok(!result.includes("B"));
      assert.ok(result.includes("C"));
    });

    it("returns empty for unknown start entity", () => {
      const state = { entities: {}, concepts: {} };
      const graph = buildGraph(state as any);
      const result = graphHop(graph, "NONEXISTENT", 2);
      assert.deepEqual(result, []);
    });
  });

  describe("Cognitive Reranking", () => {
    it("computeLensBoost returns correct ENGINEERING boost", () => {
      const boost = computeLensBoost({ name: "A", type: "entity", nodeType: "decision" }, "ENGINEERING");
      assert.equal(boost, 1.3);
    });

    it("computeLensBoost returns correct FORENSIC boost for failures", () => {
      const boost = computeLensBoost({ name: "A", type: "entity", nodeType: "failure" }, "FORENSIC");
      assert.equal(boost, 1.5);
    });

    it("computeLensBoost returns default 1.0 for mismatched types", () => {
      const boost = computeLensBoost({ name: "A", type: "entity", nodeType: "failure" }, "ENGINEERING");
      assert.equal(boost, 1.0);
    });

    it("detectLensFromDiff returns FORENSIC for fix commits", () => {
      const diff = "fix: resolve login bug\n\ndiff --git a/src/login.ts b/src/login.ts\n-fix login bug";
      const result = detectLensFromDiff(diff);
      assert.equal(result, "FORENSIC");
    });

    it("detectLensFromDiff returns CREATIVE for experimental code", () => {
      const diff = "feat: add new playground experiment\n\ndiff --git a/src/playground.ts b/src/playground.ts\n+tryNewApproach()";
      const result = detectLensFromDiff(diff);
      assert.equal(result, "CREATIVE");
    });

    it("detectLensFromDiff returns null for empty diff", () => {
      const result = detectLensFromDiff("");
      assert.equal(result, null);
    });

    it("rerankFindResults applies ENGINEERING boost correctly", () => {
      const results = [
        { name: "A", type: "entity", nodeType: "decision", score: 1 },
        { name: "B", type: "entity", nodeType: "failure", score: 1 },
        { name: "C", type: "entity", nodeType: "insight", score: 1 },
      ];
      const reranked = rerankFindResults(results, "ENGINEERING");
      // decision type boosted to 1.3 — "A" should be first
      assert.equal(reranked[0].name, "A");
    });
  });

  describe("Lens-Aware Ingestion Prompt", () => {
    it("detectLensFromDiff returns STRATEGIC for planning content", () => {
      const diff = "plan: architecture redesign proposal\n\ndiff --git a/PLAN.md b/PLAN.md\n+architecture redesign proposal";
      const result = detectLensFromDiff(diff);
      assert.equal(result, "STRATEGIC");
    });

    it("detectLensFromDiff returns CREATIVE for experimental code with explore prefix", () => {
      const diff = "explore: prototype new approach\n\ndiff --git a/src/explore.ts b/src/explore.ts\n+prototype code";
      const result = detectLensFromDiff(diff);
      assert.equal(result, "CREATIVE");
    });
  });

  describe("Lock Directory Creation & Context Pack Integration", () => {
    it("SoulEngine load/save succeeds even if .knowledge directory does not exist initially", async () => {
      const emptyTmp = await fs.mkdtemp(path.join(os.tmpdir(), "cortex-locktest-"));
      try {
        const engine = new SoulEngine(emptyTmp);
        await engine.load(); // should create directory and succeed without throwing
        engine.addNode({
          id: "n1", type: "decision", content: "Test", timestamp: Date.now(),
          metadata: {}, weights: { salience: 1, successBias: 0.5, failureBias: 0, decay: 1, certainty: 0.7, credibility: 0.6, energy: 0.5 },
        });
        await engine.save(); // should write soul_state.json and lock file properly
        assert.equal(engine.getNodes().length, 1);
      } finally {
        await fs.rm(emptyTmp, { recursive: true, force: true }).catch(() => {});
      }
    });

    it("buildContextPack applies lens reranking based on cognitive lens", async () => {
      const state = {
        entities: {
          A: { description: "Entity A description", relationships: [{ target: "B", kind: "depends_on" }] },
          B: { description: "Entity B description", relationships: [] }
        },
        concepts: {}
      };
      
      const { buildContextPack } = await import("../src/knowledge/packer.js");
      
      // Default ordering: B is more central (inbound ref from A)
      const packNoLens = buildContextPack(state as any, { budget: 4000 });
      assert.ok(packNoLens.output.indexOf("Entity: B") < packNoLens.output.indexOf("Entity: A"));

      // Configure SoulEngine with failure node for A and low risk tolerance to boost it
      const soul = new SoulEngine(tmp);
      soul.addNode({
        id: "failure-node",
        type: "failure",
        content: "A failed",
        timestamp: Date.now(),
        metadata: { source: "A" },
        weights: { salience: 1.0, successBias: 0.0, failureBias: 1.0, decay: 0.0, certainty: 1.0, credibility: 1.0, energy: 1.0 }
      });
      soul.evaluateRiskClamping("A"); // sets riskTolerance to 0.1, making boost = 1.9

      // With lens + soulEngine: A should bubble to the top (boosted above B)
      const packWithLens = buildContextPack(state as any, {
        budget: 4000,
        lens: "ENGINEERING",
        soulEngine: soul
      });
      assert.ok(packWithLens.output.indexOf("Entity: A") < packWithLens.output.indexOf("Entity: B"));
    });
  });

  describe("MCP Soul Tools Integration", () => {
    it("handles cortex_soul_status, cortex_soul_export and cortex_soul_import correctly", async () => {
      const { Server } = await import("@modelcontextprotocol/sdk/server/index.js");
      const { CortexMCPServer } = await import("../src/mcp/server.js");
      
      const registeredHandlers: { schema: any; handler: any }[] = [];
      const originalSetRequestHandler = Server.prototype.setRequestHandler;
      Server.prototype.setRequestHandler = function(schema: any, handler: any) {
        registeredHandlers.push({ schema, handler });
        return originalSetRequestHandler.call(this, schema, handler);
      };

      try {
        await fs.mkdir(path.join(tmp, ".knowledge"), { recursive: true });
        await fs.writeFile(path.join(tmp, "cortex.json"), "{}", "utf-8");

        const server = new CortexMCPServer(tmp, undefined, true);
        
        let callToolHandler: any = null;
        for (const item of registeredHandlers) {
          try {
            const res = await item.handler({
              method: "tools/call",
              params: {
                name: "cortex_soul_status",
                arguments: {},
              },
            });
            if (res && (res.content !== undefined || res.isError !== undefined)) {
              callToolHandler = item.handler;
              break;
            }
          } catch (e) {
            // Not the CallToolRequest handler
          }
        }

        assert.ok(callToolHandler, "MCP CallToolRequest handler should be registered");

        // 1. Test cortex_soul_status (empty soul state)
        const statusRes = await callToolHandler({
          method: "tools/call",
          params: {
            name: "cortex_soul_status",
            arguments: {},
          },
        });
        assert.ok(!statusRes.isError);
        assert.ok(statusRes.content[0].text.includes("Active Lens:"));

        // 2. Test cortex_soul_export
        const exportFilePath = path.join(tmp, "exported_soul.json");
        const exportRes = await callToolHandler({
          method: "tools/call",
          params: {
            name: "cortex_soul_export",
            arguments: { filePath: exportFilePath },
          },
        });
        assert.ok(!exportRes.isError);
        assert.ok(exportRes.content[0].text.includes("Successfully exported"));
        
        // Verify exported file exists and contains valid JSON
        const exportContent = await fs.readFile(exportFilePath, "utf-8");
        const parsedExport = JSON.parse(exportContent);
        assert.ok(parsedExport.nodes);

        // 3. Test cortex_soul_import
        const importFilePath = path.join(tmp, "imported_soul.json");
        parsedExport.nodes.push({
          id: "imported-node-id",
          type: "decision",
          content: "Imported content",
          timestamp: Date.now(),
          weights: { salience: 1.0, successBias: 0.5, failureBias: 0.0, decay: 0.0, certainty: 0.8, credibility: 0.8, energy: 0.8 },
          metadata: {}
        });
        await fs.writeFile(importFilePath, JSON.stringify(parsedExport), "utf-8");

        const importRes = await callToolHandler({
          method: "tools/call",
          params: {
            name: "cortex_soul_import",
            arguments: { filePath: importFilePath },
          },
        });
        assert.ok(!importRes.isError);
        assert.ok(importRes.content[0].text.includes("Successfully imported"));

        // Check if status now returns the new node
        const statusRes2 = await callToolHandler({
          method: "tools/call",
          params: {
            name: "cortex_soul_status",
            arguments: {},
          },
        });
        assert.ok(statusRes2.content[0].text.includes("Nodes: 1"));

      } finally {
        Server.prototype.setRequestHandler = originalSetRequestHandler;
      }
    });
  });
});
