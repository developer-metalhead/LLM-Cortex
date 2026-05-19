import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { KnowledgeManager } from "../src/knowledge/writer.js";
import { OnboardingManager } from "../src/knowledge/onboarding.js";
import { FindManager } from "../src/knowledge/find.js";
import type { Synthesis } from "../src/llm/schema.js";

let tmp: string;
let km: KnowledgeManager;

beforeEach(async () => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), "cortex-phase10-"));
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

describe("Phase 10 — Onboarding & Search Suite", () => {
  // 1. PageRank Centrality Tests
  describe("PageRank Centrality", () => {
    it("sorts entities by node centrality (inbound dependency count)", async () => {
      await km.saveSynthesis(
        syn({
          entities: [
            {
              name: "ComponentA",
              description: "Comp A",
              relationships: [{ target: "ComponentC", kind: "depends_on" }],
              sourceFile: "src/components/a.ts",
            },
            {
              name: "ComponentB",
              description: "Comp B",
              relationships: [
                { target: "ComponentA", kind: "depends_on" },
                { target: "ComponentC", kind: "depends_on" },
              ],
              sourceFile: "src/components/b.ts",
            },
            {
              name: "ComponentC",
              description: "Comp C",
              relationships: [],
              sourceFile: "src/components/c.ts",
            },
          ],
        }),
      );

      const om = new OnboardingManager(km);
      const ranking = await om.getPrioritizedEntities();

      // C should be first (highest score/centrality), B should be last
      assert.equal(ranking[0].name, "ComponentC");
      assert.equal(ranking[ranking.length - 1].name, "ComponentB");
    });
  });

  // 2. Demotion Rules and Warnings Tests
  describe("Quality × Centrality Demotion Rules", () => {
    it("demotes score and injects a warning if low-quality (score < 0.5)", async () => {
      await km.saveSynthesis(
        syn({
          entities: [
            {
              name: "HighlyCentralLowQuality",
              description: "Central but stale/undocumented",
              relationships: [],
              sourceFile: "src/core.ts",
            },
            {
              name: "UserRoutes",
              description: "Routes layer",
              relationships: [
                { target: "HighlyCentralLowQuality", kind: "depends_on" },
              ],
              sourceFile: "src/routes.ts",
            },
            {
              name: "AdminRoutes",
              description: "Admin routes",
              relationships: [
                { target: "HighlyCentralLowQuality", kind: "depends_on" },
              ],
              sourceFile: "src/admin.ts",
            },
          ],
        }),
      );

      // Mutate state.json directly to simulate audit findings / extreme age / staleness
      const statePath = path.join(tmp, ".knowledge", "state.json");
      const state = JSON.parse(await fs.readFile(statePath, "utf8"));
      state.entities["HighlyCentralLowQuality"].staleSince =
        "2026-01-01T00:00:00Z";
      state.entities["HighlyCentralLowQuality"].lastRefined =
        "2020-01-01T00:00:00Z";
      await fs.writeFile(statePath, JSON.stringify(state, null, 2), "utf8");

      const om = new OnboardingManager(km);
      const ranking = await om.getPrioritizedEntities();

      const centralNode = ranking.find(
        (r) => r.name === "HighlyCentralLowQuality",
      );
      assert.ok(centralNode);
      assert.ok(centralNode.quality < 0.5);

      const guide = await om.generateOnboarding({
        audience: "junior",
        depth: "quick",
      });
      assert.ok(guide.includes("Confidence Caveat"));
      assert.ok(
        guide.includes("This entity is central but has low confidence"),
      );
    });
  });

  // 3. Audience Tuning Tests
  describe("Audience Tuning", () => {
    beforeEach(async () => {
      // Set up a graph where CoreController is depended on by multiple things,
      // giving it high centrality, while FormatUtils is a low-centrality leaf node.
      await km.saveSynthesis(
        syn({
          entities: [
            {
              name: "MainServer",
              description: "Main server routing jwt",
              relationships: [{ target: "CoreController", kind: "depends_on" }],
              constraints: {
                contract: "Must run on port 3000",
              },
              sourceFile: "src/server.ts",
            },
            {
              name: "CoreController",
              description: "Main controller managing user login auth",
              relationships: [],
              sourceFile: "src/controllers/core.ts",
            },
            {
              name: "FormatUtils",
              description: "String formatting helper utilities",
              relationships: [],
              sourceFile: "src/utils/format.ts",
            },
          ],
          concepts: [
            {
              name: "JWT",
              description: "JSON Web Token standard used for auth",
              relationships: [{ target: "MainServer", kind: "depends_on" }],
            },
          ],
        }),
      );
    });

    it("audience='junior' includes a definitions glossary and utilities", async () => {
      const om = new OnboardingManager(km);
      const guide = await om.generateOnboarding({
        audience: "junior",
        depth: "thorough",
      });

      assert.ok(guide.includes("Junior Glossary Term Insight"));
      assert.ok(guide.includes("FormatUtils"));
    });

    it("audience='senior' skips helper/utility modules and focuses on entry/core", async () => {
      const om = new OnboardingManager(km);
      const guide = await om.generateOnboarding({
        audience: "senior",
        depth: "thorough",
      });

      assert.ok(!guide.includes("Junior Glossary Term Insight"));
      assert.ok(guide.includes("CoreController"));
      // FormatUtils has lowest score and is a helper, below median, so it should be skipped
      assert.ok(!guide.includes("FormatUtils"));
    });

    it("audience='domain-expert' highlights business domain boundaries/invariants", async () => {
      const om = new OnboardingManager(km);
      const guide = await om.generateOnboarding({
        audience: "domain-expert",
        depth: "thorough",
      });

      assert.ok(guide.includes("MainServer"));
    });
  });

  // 4. Depth Slicing Tests
  describe("Depth Slicing", () => {
    it("slices detailed descriptions based on depth limit", async () => {
      await km.saveSynthesis(
        syn({
          entities: Array.from({ length: 8 }, (_, i) => ({
            name: `Service${i}`,
            description: `Service number ${i}`,
            relationships: [],
            sourceFile: `src/services${i}/service${i}.ts`,
          })),
        }),
      );

      const om = new OnboardingManager(km);
      const quickGuide = await om.generateOnboarding({
        audience: "junior",
        depth: "quick",
      });
      const thoroughGuide = await om.generateOnboarding({
        audience: "junior",
        depth: "thorough",
      });

      // Quick guide lists first 4 (limit 4) with detailed description, others are excluded
      assert.ok(quickGuide.includes("Stop 1"));
      assert.ok(quickGuide.includes("Stop 4"));
      assert.ok(!quickGuide.includes("Stop 5"));

      // Thorough guide lists all of them with full details
      assert.ok(thoroughGuide.includes("Stop 5"));
      assert.ok(thoroughGuide.includes("Stop 8"));
    });
  });

  // 5. Parent Directory and Concept Summaries
  describe("Programmatic Parent Directories and Concept Summaries", () => {
    it("lists concepts", async () => {
      await km.saveSynthesis(
        syn({
          entities: [
            {
              name: "OtherThing",
              description: "Other thing",
              relationships: [],
              sourceFile: "src/other/thing.ts",
            },
          ],
          concepts: [
            {
              name: "EventSourcingStrategy",
              description: "How event sourcing is implemented",
            },
          ],
        }),
      );

      const om = new OnboardingManager(km);
      const guide = await om.generateOnboarding({
        audience: "junior",
        depth: "thorough",
      });

      // It should also list concepts
      assert.ok(guide.includes("EventSourcingStrategy"));
    });
  });

  // 6. Category-scoped Search Tests
  describe("Category-Scoped Search", () => {
    beforeEach(async () => {
      await km.saveSynthesis(
        syn({
          entities: [
            {
              name: "PaymentProcessor",
              description: "Processes client payments",
              relationships: [],
              sourceFile: "src/payments/processor.ts",
            },
            {
              name: "PaymentRoute",
              description: "Payment REST endpoints",
              relationships: [],
              sourceFile: "src/routes/payment.ts",
            },
          ],
          concepts: [
            {
              name: "PaymentRetryPattern",
              description: "Retry logic for failed payments",
            },
          ],
        }),
      );
    });

    it("filters search results by type", async () => {
      const fm = new FindManager(km);

      const allResults = await fm.find("all", "payment");
      assert.equal(allResults.length, 3);

      const entityResults = await fm.find("entity", "payment");
      assert.equal(entityResults.length, 2);
      assert.ok(entityResults.every((r) => r.type === "entity"));

      const conceptResults = await fm.find("concept", "payment");
      assert.equal(conceptResults.length, 1);
      assert.equal(conceptResults[0].name, "PaymentRetryPattern");
      assert.equal(conceptResults[0].type, "concept");
    });

    it("prioritizes exact name matches above description matches", async () => {
      const fm = new FindManager(km);
      const results = await fm.find("all", "PaymentProcessor");
      assert.equal(results[0].name, "PaymentProcessor");
    });
  });
});
