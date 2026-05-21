import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { KnowledgeManager } from "../src/knowledge/writer.js";
import { FindManager } from "../src/knowledge/find.js";
import type { Synthesis } from "../src/llm/schema.js";

let tmp: string;
let km: KnowledgeManager;
let fm: FindManager;
const origProxWindow = process.env.CORTEX_PROXIMITY_WINDOW;
const origSnippetLen = process.env.CORTEX_SNIPPET_LENGTH;

beforeEach(async () => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), "cortex-phase13_6-"));
  km = new KnowledgeManager(tmp);
  await km.init();
  fm = new FindManager(km);
  process.env.CORTEX_PROXIMITY_WINDOW = "5";
  process.env.CORTEX_SNIPPET_LENGTH = "120";
});

afterEach(async () => {
  try {
    await fs.rm(tmp, { recursive: true, force: true });
  } catch {}
  if (origProxWindow !== undefined) {
    process.env.CORTEX_PROXIMITY_WINDOW = origProxWindow;
  } else {
    delete process.env.CORTEX_PROXIMITY_WINDOW;
  }
  if (origSnippetLen !== undefined) {
    process.env.CORTEX_SNIPPET_LENGTH = origSnippetLen;
  } else {
    delete process.env.CORTEX_SNIPPET_LENGTH;
  }
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

describe("Phase 13.6 — Proximity Reranking & Smart Snippets", () => {

  describe("Proximity Scoring", () => {
    it("boosts adjacent query terms over scattered ones with same token score", async () => {
      // Both entities match "auth" and "token" in description (descHits=2 → tokenScore=20).
      // Entity Z has adjacent terms (distance=3 < window=5), Entity A has scattered terms (distance=6 ≥ window=5).
      // Proximity bonus should invert the alphabetical ranking: Z overtakes A.
      await km.saveSynthesis(syn({
        entities: [
          {
            name: "A",
            action: "create",
            description: "auth function that does stuff with token but not adjacent",
            relationships: [],
            sourceFile: "src/a.ts",
          },
          {
            name: "Z",
            action: "create",
            description: "handles auth for user token validation in close proximity",
            relationships: [],
            sourceFile: "src/z.ts",
          },
        ],
      }));

      const results = await fm.find("entity", "auth token");
      assert.ok(results.length >= 2, "Must find both entities");
      // Z (adjacent) should rank higher than A (scattered) thanks to proximity bonus
      const zIdx = results.findIndex(r => r.name === "Z");
      const aIdx = results.findIndex(r => r.name === "A");
      assert.ok(zIdx !== -1 && aIdx !== -1, "Both entities must appear in results");
      assert.ok(zIdx < aIdx, "Z (adjacent terms) must rank above A (scattered terms)");
    });

    it("single-word query does not add proximity bonus", async () => {
      // Proximity bonus only applies for multi-token queries (≥2)
      await km.saveSynthesis(syn({
        entities: [
          {
            name: "AuthService",
            action: "create",
            description: "handles auth for user token validation",
            relationships: [],
            sourceFile: "src/auth.ts",
          },
        ],
      }));

      const results = await fm.find("entity", "auth");
      assert.ok(results.length >= 1, "Must find the entity");
      // Score should be pure RRF without proximity bonus
      const expectedRrf = 1 / (60 + 1); // exact name match → lowest rank = 1
      assert.ok(Math.abs(results[0].score - expectedRrf) < 0.0001,
        `Single-word query score (${results[0].score}) should match pure RRF (${expectedRrf})`);
    });

    it("terms in same word get max proximity bonus", async () => {
      // "authtoken" in name matches both query tokens at the same word position (distance=0)
      await km.saveSynthesis(syn({
        entities: [
          {
            name: "AuthTokenService",
            action: "create",
            description: "handles everything",
            relationships: [],
            sourceFile: "src/ats.ts",
          },
        ],
      }));

      const results = await fm.find("entity", "auth token");
      assert.ok(results.length >= 1, "Must find the entity");
      // Should have proximity bonus from same-word match
      assert.ok(results[0].score > 1 / (60 + 1),
        "Same-word proximity bonus must increase score above pure RRF");
    });
  });

  describe("Smart Snippets", () => {
    it("centers preview around matching term in long description", async () => {
      await km.saveSynthesis(syn({
        entities: [
          {
            name: "Target",
            action: "create",
            description: "A".repeat(50) + " auth token " + "B".repeat(50) + " more text at the end for padding C".repeat(20),
            relationships: [],
            sourceFile: "src/target.ts",
          },
        ],
      }));

      const results = await fm.find("entity", "auth");
      assert.ok(results.length >= 1, "Must find the entity");
      const preview = results[0].preview;
      // Preview should contain the matching term
      assert.ok(preview.includes("auth"), "Preview must contain the matched search term");
      // Preview should be roughly maxLength chars (allow ±3 for ellipsis)
      const maxLen = 120;
      assert.ok(preview.length <= maxLen + 3,
        `Preview length ${preview.length} must not exceed maxLength (${maxLen}) + 3 for ellipsis`);
      // Preview should have ellipsis on at least one side since match is centered
      assert.ok(preview.startsWith("...") || preview.endsWith("..."),
        "Long description preview must have ellipsis on at least one side");
    });

    it("returns whole description when shorter than maxLength", async () => {
      const shortDesc = "A short description about auth handling";
      await km.saveSynthesis(syn({
        entities: [
          {
            name: "Short",
            action: "create",
            description: shortDesc,
            relationships: [],
            sourceFile: "src/short.ts",
          },
        ],
      }));

      const results = await fm.find("entity", "auth");
      assert.ok(results.length >= 1, "Must find the entity");
      assert.strictEqual(results[0].preview, shortDesc.replace(/\n/g, " "),
        "Short descriptions must be returned verbatim");
    });

    it("falls back to first N chars when no token matches description", async () => {
      const longDesc = "X".repeat(200);
      await km.saveSynthesis(syn({
        entities: [
          {
            name: "AuthService",
            action: "create",
            description: longDesc,
            relationships: [],
            sourceFile: "src/onlyname.ts",
          },
        ],
      }));

      // Search "zzzzz" — matches by name (fuzzy), not by description
      const results = await fm.find("entity", "AuthService");
      assert.ok(results.length >= 1, "Must find the entity by name");
      const preview = results[0].preview;
      assert.ok(preview.length <= 123, "Fallback preview must not exceed maxLength + 3");
      assert.ok(preview.endsWith("..."), "Fallback preview must end with ellipsis");
    });

    it("respects configurable snippet length via CORTEX_SNIPPET_LENGTH", async () => {
      process.env.CORTEX_SNIPPET_LENGTH = "60";
      const longDesc = "M".repeat(30) + " needle " + "N".repeat(100);
      await km.saveSynthesis(syn({
        entities: [
          {
            name: "Pincushion",
            action: "create",
            description: longDesc,
            relationships: [],
            sourceFile: "src/pin.ts",
          },
        ],
      }));

      const results = await fm.find("entity", "needle");
      assert.ok(results.length >= 1, "Must find the entity");
      const preview = results[0].preview;
      assert.ok(preview.includes("needle"), "Preview must contain matched term at any snippet length");
      assert.ok(preview.length <= 63, "Configurable snippet length (60+3) must be respected");
    });
  });
});
