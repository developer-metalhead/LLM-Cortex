import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "fs/promises";
import http from "http";
import os from "os";
import path from "path";
import { KnowledgeManager } from "../src/knowledge/writer.js";
import {
  buildGraph,
  toMermaid,
  toJson,
  qualityColor,
} from "../src/knowledge/graph.js";
import { runServe } from "../src/server/index.js";
import type { Synthesis } from "../src/llm/schema.js";

let tmp: string;
let km: KnowledgeManager;

beforeEach(async () => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), "cortex-phase8-"));
  km = new KnowledgeManager(tmp);
  await km.init();
});

afterEach(async () => {
  try { await fs.rm(tmp, { recursive: true, force: true }); } catch {}
});

function syn(partial: Partial<Synthesis>): Synthesis {
  return { summary: "test", entities: [], concepts: [], warnings: [], ...partial };
}

// ── qualityColor ──────────────────────────────────────────────────────────

describe("Phase 8 — qualityColor thresholds", () => {
  it("score 1.0 → green", () => assert.equal(qualityColor(1.0), "green"));
  it("score 0.8 → green (boundary)", () => assert.equal(qualityColor(0.8), "green"));
  it("score 0.79 → amber", () => assert.equal(qualityColor(0.79), "amber"));
  it("score 0.5 → amber (boundary)", () => assert.equal(qualityColor(0.5), "amber"));
  it("score 0.49 → red", () => assert.equal(qualityColor(0.49), "red"));
  it("score 0.0 → red", () => assert.equal(qualityColor(0.0), "red"));
});

// ── buildGraph — empty state ──────────────────────────────────────────────

describe("Phase 8 — buildGraph: empty state", () => {
  it("returns zero nodes and zero edges", () => {
    const g = buildGraph({ entities: {}, concepts: {} });
    assert.equal(g.nodes.length, 0);
    assert.equal(g.edges.length, 0);
  });
});

// ── buildGraph — single entity ────────────────────────────────────────────

describe("Phase 8 — buildGraph: single entity", () => {
  it("returns one node with correct fields", async () => {
    await km.saveSynthesis(syn({
      entities: [{
        name: "AuthService",
        description: "Handles authentication",
        relationships: [],
        sourceFile: "src/auth.ts",
      }],
    }), tmp);

    const state = await km.getState();
    const g = buildGraph(state);
    assert.equal(g.nodes.length, 1);
    assert.equal(g.edges.length, 0);
    const node = g.nodes[0];
    assert.equal(node.id, "AuthService");
    assert.equal(node.type, "entity");
    assert.equal(node.sourceFile, "src/auth.ts");
    assert.equal(typeof node.qualityScore, "number");
    assert.ok(["green", "amber", "red"].includes(node.qualityColor));
  });
});

// ── buildGraph — multi-edge graph ─────────────────────────────────────────

describe("Phase 8 — buildGraph: multi-edge graph", () => {
  it("builds nodes and edges from relationships", async () => {
    await km.saveSynthesis(syn({
      entities: [
        {
          name: "Server",
          description: "Entry point",
          relationships: [{ target: "UserRoutes", kind: "depends_on" }],
        },
        {
          name: "UserRoutes",
          description: "User endpoints",
          relationships: [{ target: "AuthService", kind: "depends_on" }],
        },
        {
          name: "AuthService",
          description: "Auth logic",
          relationships: [],
        },
      ],
    }), tmp);

    const state = await km.getState();
    const g = buildGraph(state);

    assert.equal(g.nodes.length, 3);
    assert.equal(g.edges.length, 2);
    const edgePairs = g.edges.map((e) => `${e.source}->${e.target}`).sort();
    assert.deepEqual(edgePairs, ["Server->UserRoutes", "UserRoutes->AuthService"]);
  });
});

// ── buildGraph — scope + depth ────────────────────────────────────────────

describe("Phase 8 — buildGraph: scope filter", () => {
  it("scope with depth 1 includes only direct neighbors", async () => {
    await km.saveSynthesis(syn({
      entities: [
        {
          name: "A",
          description: "root",
          relationships: [{ target: "B", kind: "depends_on" }],
        },
        {
          name: "B",
          description: "mid",
          relationships: [{ target: "C", kind: "depends_on" }],
        },
        {
          name: "C",
          description: "leaf",
          relationships: [],
        },
      ],
    }), tmp);

    const state = await km.getState();
    const g = buildGraph(state, { scope: "A", depth: 1 });
    const ids = g.nodes.map((n) => n.id).sort();
    assert.deepEqual(ids, ["A", "B"]);
    assert.equal(g.edges.length, 1);
  });

  it("scope with depth 2 reaches two hops", async () => {
    await km.saveSynthesis(syn({
      entities: [
        {
          name: "A",
          description: "root",
          relationships: [{ target: "B", kind: "depends_on" }],
        },
        {
          name: "B",
          description: "mid",
          relationships: [{ target: "C", kind: "depends_on" }],
        },
        {
          name: "C",
          description: "leaf",
          relationships: [],
        },
      ],
    }), tmp);

    const state = await km.getState();
    const g = buildGraph(state, { scope: "A", depth: 2 });
    const ids = g.nodes.map((n) => n.id).sort();
    assert.deepEqual(ids, ["A", "B", "C"]);
  });

  it("scope not found returns full graph", async () => {
    await km.saveSynthesis(syn({
      entities: [
        { name: "X", description: "x", relationships: [] },
        { name: "Y", description: "y", relationships: [] },
      ],
    }), tmp);

    const state = await km.getState();
    const g = buildGraph(state, { scope: "DoesNotExist", depth: 1 });
    assert.equal(g.nodes.length, 2);
  });
});

// ── buildGraph — stale node ───────────────────────────────────────────────

describe("Phase 8 — buildGraph: stale entity marked correctly", () => {
  it("isStale is true for stale entities", async () => {
    await km.saveSynthesis(syn({
      entities: [
        { name: "Foundation", description: "base", relationships: [] },
        {
          name: "Consumer",
          description: "depends on foundation",
          relationships: [{ target: "Foundation", kind: "depends_on" }],
        },
      ],
    }), tmp);

    // Second synthesis updates Foundation → marks Consumer stale
    await km.saveSynthesis(syn({
      entities: [
        { name: "Foundation", description: "base updated", relationships: [] },
      ],
    }), tmp);

    const state = await km.getState();
    const g = buildGraph(state);
    const consumer = g.nodes.find((n) => n.id === "Consumer");
    assert.ok(consumer, "Consumer node must exist");
    assert.equal(consumer!.isStale, true);
  });
});

// ── buildGraph — concepts ────────────────────────────────────────────────

describe("Phase 8 — buildGraph: includeConcepts", () => {
  it("concepts excluded by default", async () => {
    await km.saveSynthesis(syn({
      entities: [{ name: "A", description: "a", relationships: [] }],
      concepts: [{ name: "MyConcept", description: "a concept", relationships: [] }],
    }), tmp);

    const state = await km.getState();
    const g = buildGraph(state);
    assert.ok(!g.nodes.some((n) => n.type === "concept"));
  });

  it("concepts included when flag is set", async () => {
    await km.saveSynthesis(syn({
      entities: [{ name: "A", description: "a", relationships: [] }],
      concepts: [{ name: "MyConcept", description: "a concept", relationships: [] }],
    }), tmp);

    const state = await km.getState();
    const g = buildGraph(state, { includeConcepts: true });
    const concept = g.nodes.find((n) => n.type === "concept");
    assert.ok(concept, "concept node must be present");
    assert.equal(concept!.id, "MyConcept");
  });
});

// ── toMermaid ─────────────────────────────────────────────────────────────

describe("Phase 8 — toMermaid: empty graph", () => {
  it("emits an empty-graph placeholder", () => {
    const out = toMermaid({ nodes: [], edges: [] });
    assert.ok(out.startsWith("flowchart LR"), "must start with flowchart directive");
    assert.ok(out.includes("empty"), "must include empty placeholder label");
  });
});

describe("Phase 8 — toMermaid: single entity", () => {
  it("emits flowchart LR header and a node line", () => {
    const out = toMermaid({
      nodes: [{
        id: "AuthService",
        type: "entity",
        isStale: false,
        qualityScore: 0.94,
        qualityColor: "green",
        qualityBreakdown: { evidenceFreshness: 1, contradiction: 1, staleness: 1, age: 1, humanReview: 0.7 },
        description: "auth",
        lastRefined: new Date().toISOString(),
      }],
      edges: [],
    });
    assert.ok(out.includes("flowchart LR"));
    assert.ok(out.includes("AuthService"), "node ID must appear in output");
    assert.ok(out.includes("class AuthService green"), "quality class must be assigned");
  });
});

describe("Phase 8 — toMermaid: stale entity", () => {
  it("marks stale nodes with [STALE] label and stale class", () => {
    const out = toMermaid({
      nodes: [{
        id: "OldModule",
        type: "entity",
        isStale: true,
        qualityScore: 0.74,
        qualityColor: "amber",
        qualityBreakdown: { evidenceFreshness: 1, contradiction: 1, staleness: 0, age: 1, humanReview: 0.7 },
        description: "stale",
        lastRefined: new Date().toISOString(),
      }],
      edges: [],
    });
    assert.ok(out.includes("[STALE]"), "stale label must appear");
    assert.ok(out.includes("class OldModule stale"), "stale class must be assigned");
  });
});

describe("Phase 8 — toMermaid: concept node shape", () => {
  it("concepts use stadium shape (([...]))", () => {
    const out = toMermaid({
      nodes: [{
        id: "MyConcept",
        type: "concept",
        isStale: false,
        qualityScore: 1.0,
        qualityColor: "green",
        qualityBreakdown: { evidenceFreshness: 1, contradiction: 1, staleness: 1, age: 1, humanReview: 1 },
        description: "a concept",
        lastRefined: new Date().toISOString(),
      }],
      edges: [],
    });
    assert.ok(out.includes('(["'), "concept node must use stadium shape");
    assert.ok(out.includes("class MyConcept concept"), "concept class must be assigned");
  });
});

describe("Phase 8 — toMermaid: multi-edge graph deduplication", () => {
  it("does not emit duplicate edge lines", () => {
    const g = {
      nodes: [
        { id: "A", type: "entity" as const, isStale: false, qualityScore: 0.9, qualityColor: "green" as const,
          qualityBreakdown: { evidenceFreshness:1, contradiction:1, staleness:1, age:1, humanReview:1 },
          description: "", lastRefined: "" },
        { id: "B", type: "entity" as const, isStale: false, qualityScore: 0.9, qualityColor: "green" as const,
          qualityBreakdown: { evidenceFreshness:1, contradiction:1, staleness:1, age:1, humanReview:1 },
          description: "", lastRefined: "" },
      ],
      edges: [
        { source: "A", target: "B", kind: "depends_on" },
        { source: "A", target: "B", kind: "depends_on" }, // duplicate
      ],
    };
    const out = toMermaid(g);
    const edgeLines = out.split("\n").filter((l) => l.includes("-->") && !l.includes("classDef") && !l.includes("|"));
    // Only one A-->B line should appear
    const abLines = edgeLines.filter((l) => l.includes("A_") || l.startsWith("  A "));
    // Count arrows
    const arrows = out.split("\n").filter((l) => /^\s+\w+ -->/.test(l));
    assert.equal(arrows.length, 1, "duplicate edges must be deduplicated");
  });
});

// ── toJson ────────────────────────────────────────────────────────────────

describe("Phase 8 — toJson", () => {
  it("returns valid JSON with nodes and edges arrays", () => {
    const g = buildGraph({ entities: {}, concepts: {} });
    const json = JSON.parse(toJson(g));
    assert.ok(Array.isArray(json.nodes));
    assert.ok(Array.isArray(json.edges));
  });
});

// ── quality-color assignment on known scores ──────────────────────────────

describe("Phase 8 — quality color assignment on synthetic graph", () => {
  it("high-quality entity gets green node", async () => {
    const now = new Date().toISOString();
    await km.saveSynthesis(syn({
      entities: [{
        name: "GoodService",
        description: "well maintained",
        relationships: [],
        evidence: [{ sourceFile: "src/good.ts" }],
      }],
    }), tmp);
    await km.setHumanReview("GoodService", true, "alice");

    const state = await km.getState();
    const g = buildGraph(state);
    const node = g.nodes.find((n) => n.id === "GoodService")!;
    assert.ok(node.qualityScore > 0.8, `expected score > 0.8, got ${node.qualityScore}`);
    assert.equal(node.qualityColor, "green");
  });

  it("stale entity gets stale node regardless of score", async () => {
    await km.saveSynthesis(syn({
      entities: [
        { name: "Base", description: "base", relationships: [] },
        { name: "Dep", description: "dep", relationships: [{ target: "Base", kind: "depends_on" }] },
      ],
    }), tmp);
    await km.saveSynthesis(syn({
      entities: [{ name: "Base", description: "base changed", relationships: [] }],
    }), tmp);

    const state = await km.getState();
    const g = buildGraph(state);
    const dep = g.nodes.find((n) => n.id === "Dep")!;
    assert.equal(dep.isStale, true);
  });
});

// ── server lifecycle ──────────────────────────────────────────────────────

describe("Phase 8 — server lifecycle", () => {
  it("GET /api/graph returns JSON with nodes and edges", async () => {
    await km.saveSynthesis(syn({
      entities: [{ name: "Alpha", description: "alpha", relationships: [] }],
    }), tmp);

    const port = 17842 + Math.floor(Math.random() * 1000);
    const controller = new AbortController();

    // Start server in background
    const serverDone = runServe(tmp, { port, host: "127.0.0.1" });

    // Wait for server to be ready
    await new Promise((r) => setTimeout(r, 150));

    try {
      const body = await httpGet(`http://127.0.0.1:${port}/api/graph`);
      const json = JSON.parse(body);
      assert.ok(Array.isArray(json.nodes), "nodes must be an array");
      assert.ok(Array.isArray(json.edges), "edges must be an array");
      assert.equal(json.nodes.length, 1);
      assert.equal(json.nodes[0].id, "Alpha");
    } finally {
      process.emit("SIGINT" as any);
      await serverDone.catch(() => {});
    }
  });

  it("GET /api/entity/:name returns markdown for existing entity", async () => {
    await km.saveSynthesis(syn({
      entities: [{ name: "Beta", description: "beta entity", relationships: [] }],
    }), tmp);

    const port = 18842 + Math.floor(Math.random() * 1000);
    const serverDone = runServe(tmp, { port, host: "127.0.0.1" });
    await new Promise((r) => setTimeout(r, 150));

    try {
      const body = await httpGet(`http://127.0.0.1:${port}/api/entity/Beta`);
      assert.ok(body.includes("Beta"), "entity markdown must contain the entity name");
    } finally {
      process.emit("SIGINT" as any);
      await serverDone.catch(() => {});
    }
  });

  it("GET / serves HTML with no external CDN references", async () => {
    const port = 19842 + Math.floor(Math.random() * 1000);
    const serverDone = runServe(tmp, { port, host: "127.0.0.1" });
    await new Promise((r) => setTimeout(r, 150));

    try {
      const body = await httpGet(`http://127.0.0.1:${port}/`);
      assert.ok(body.includes("<!DOCTYPE html"), "must serve HTML");
      // No external CDN — these should NOT appear
      const cdnPatterns = ["cdn.jsdelivr.net", "unpkg.com", "cdnjs.cloudflare.com", "fonts.googleapis.com"];
      for (const cdn of cdnPatterns) {
        assert.ok(!body.includes(cdn), `HTML must not reference external CDN: ${cdn}`);
      }
    } finally {
      process.emit("SIGINT" as any);
      await serverDone.catch(() => {});
    }
  });
});

// ── helpers ───────────────────────────────────────────────────────────────

function httpGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => resolve(data));
    }).on("error", reject);
  });
}
