import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "fs/promises";
import os from "os";
import path from "path";

let tmp: string;

beforeEach(async () => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), "cortex-1372-"));
});

afterEach(async () => {
  try { await fs.rm(tmp, { recursive: true, force: true }); } catch {}
});

import { buildContextPack } from "../src/knowledge/packer.js";

function makeState(entities: Record<string, any> = {}, concepts: Record<string, any> = {}) {
  return { entities, concepts };
}

describe("Phase 13.7.2 — Speculative Static Verification & Grounded Fallback", () => {

  describe("Dynamic Context Expansion", () => {
    it("expands a dependency not in scope when scope+depth filters it out", () => {
      const state = makeState({
        AuthService: {
          description: "Handles auth",
          relationships: [{ target: "JwtStrategy", kind: "depends_on" }],
        },
        JwtStrategy: {
          description: "Verifies JWT tokens",
          relationships: [],
        },
      });

      // scope=AuthService, depth=0 means only AuthService is in the graph
      // JwtStrategy is NOT in graph nodes, but IS in state entities
      // Verification should detect the missing relationship target and expand it
      const pack = buildContextPack(state, { budget: 200, scope: "AuthService", depth: 0, projectRoot: tmp });

      assert(pack.expanded!.includes("JwtStrategy"), "JwtStrategy should be expanded back in");
      assert(pack.output.includes("JwtStrategy"), "output should contain JwtStrategy");
    });

    it("does NOT expand if the target is already included", () => {
      const state = makeState({
        AuthService: {
          description: "Auth service",
          relationships: [{ target: "JwtStrategy", kind: "depends_on" }],
        },
        JwtStrategy: {
          description: "JWT strategy",
          relationships: [],
        },
      });

      const pack = buildContextPack(state, { budget: 8000, projectRoot: tmp });
      assert.equal(pack.expanded!.length, 0, "no expansion needed when all fit budget");
    });

    it("does NOT expand for non-usage relationship kinds", () => {
      const state = makeState({
        AuthService: {
          description: "Auth service",
          relationships: [
            { target: "OldModule", kind: "contradicts" },
            { target: "NewModule", kind: "supports" },
          ],
        },
        OldModule: { description: "Old", relationships: [] },
        NewModule: { description: "New", relationships: [] },
      });

      const pack = buildContextPack(state, { budget: 90, projectRoot: tmp });
      assert.equal(pack.expanded!.length, 0, "contradicts/supports should not trigger expansion");
    });

    it("does NOT expand when overage exceeds 50% of budget", () => {
      const state = makeState({
        SmallService: {
          description: "Small",
          relationships: [{ target: "HugeEntity", kind: "depends_on" }],
        },
        HugeEntity: {
          description: "X".repeat(5000),
          relationships: [],
        },
      });

      const pack = buildContextPack(state, { budget: 100, projectRoot: tmp });
      assert(!pack.expanded!.includes("HugeEntity"), "HugeEntity should not be expanded — over 50% overage");
    });
  });

  describe("Grounded Fallback", () => {
    it("resolves a missing entity via live source grep", async () => {
      const state = makeState({
        Orchestrator: {
          description: "Orchestrates things",
          relationships: [{ target: "FreshModule", kind: "depends_on" }],
        },
      });

      // Create a source file with the missing entity
      await fs.writeFile(
        path.join(tmp, "fresh-module.ts"),
        [
          "import { z } from 'zod'",
          "",
          "export class FreshModule {",
          "  execute() { return 'ok' }",
          "}",
        ].join("\n"),
        "utf-8"
      );

      const pack = buildContextPack(state, { budget: 8000, projectRoot: tmp });

      assert(pack.groundedFallbacks!.length > 0, "should have a grounded fallback");
      assert.equal(pack.groundedFallbacks![0].name, "FreshModule");
      assert(pack.groundedFallbacks![0].confidence === "high", "class match should be high confidence");
      assert(pack.output.includes("Grounded Fallback Context"), "output should contain fallback marker");
      assert(pack.output.includes("FreshModule"), "output should contain the resolved name");
    });

    it("returns medium confidence for function matches", async () => {
      const state = makeState({
        Orchestrator: {
          description: "Orchestrates things",
          relationships: [{ target: "helperUtil", kind: "depends_on" }],
        },
      });

      await fs.writeFile(
        path.join(tmp, "utils.ts"),
        [
          "export function helperUtil(input: string): number {",
          "  return input.length",
          "}",
        ].join("\n"),
        "utf-8"
      );

      const pack = buildContextPack(state, { budget: 8000, projectRoot: tmp });
      const fb = pack.groundedFallbacks!.find(f => f.name === "helperUtil");
      assert(fb, "helperUtil should be resolved");
      assert(fb!.confidence === "medium", "function match should be medium confidence");
    });

    it("does not resolve if entity already exists in KB", async () => {
      const state = makeState({
        Orchestrator: {
          description: "Orchestrates things",
          relationships: [{ target: "ExistingModule", kind: "depends_on" }],
        },
        ExistingModule: {
          description: "Already in KB",
          relationships: [],
        },
      });

      const pack = buildContextPack(state, { budget: 8000, projectRoot: tmp });
      assert.equal(pack.groundedFallbacks!.length, 0, "should not use fallback when entity is in KB");
      assert.equal(pack.expanded!.length, 0, "ExistingModule already fits budget");
    });

    it("returns empty fallbacks when projectRoot is not provided", () => {
      const state = makeState({
        Orchestrator: {
          description: "Orchestrates things",
          relationships: [{ target: "UnknownEntity", kind: "depends_on" }],
        },
      });

      const pack = buildContextPack(state, { budget: 8000 }); // no projectRoot
      assert.equal(pack.groundedFallbacks!.length, 0, "no fallback without projectRoot");
    });

    it("skips binary files during grep", async () => {
      const state = makeState({
        App: {
          description: "Main app",
          relationships: [{ target: "BinaryDep", kind: "depends_on" }],
        },
      });

      // Create a .png file (should be skipped by searchFile size check, but also by ext)
      await fs.writeFile(path.join(tmp, "icon.png"), "fake png content", "utf-8");

      const pack = buildContextPack(state, { budget: 8000, projectRoot: tmp });
      assert.equal(pack.groundedFallbacks!.length, 0, "binary files should be skipped");
    });
  });

  describe("Pack integrity summary", () => {
    it("includes summary section when expansions or fallbacks are present", async () => {
      const state = makeState({
        Service: {
          description: "A service",
          relationships: [{ target: "MissingDep", kind: "depends_on" }],
        },
      });

      await fs.writeFile(
        path.join(tmp, "missing-dep.ts"),
        "export class MissingDep {}",
        "utf-8"
      );

      const pack = buildContextPack(state, { budget: 8000, projectRoot: tmp });
      assert(pack.output.includes("Pack Integrity Summary"), "should include integrity summary");
      assert(pack.output.includes("Live Source Fallback"), "summary should mention fallback");
    });
  });

  describe("Regression: existing behavior preserved", () => {
    it("still builds normal packs without projectRoot", () => {
      const state = makeState({
        A: { description: "Entity A", relationships: [] },
        B: { description: "Entity B", relationships: [] },
      });

      const pack = buildContextPack(state, { budget: 8000 });
      assert(pack.output.includes("Entity A"));
      assert(pack.output.includes("Entity B"));
      assert(Array.isArray(pack.expanded));
      assert(Array.isArray(pack.groundedFallbacks));
    });

    it("still elides entities that exceed budget", () => {
      const state = makeState({
        Big: { description: "Y".repeat(5000), relationships: [] },
        Small: { description: "Small entity", relationships: [] },
      });

      const pack = buildContextPack(state, { budget: 100 });
      assert(pack.elided.length > 0, "should elide when budget exceeded");
    });
  });
});
