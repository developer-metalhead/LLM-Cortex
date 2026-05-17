import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { KnowledgeManager } from "../src/knowledge/writer.js";
import type { Synthesis } from "../src/llm/schema.js";

// Each test gets its own fresh knowledge directory — no cross-test pollution.
let tmp: string;
let km: KnowledgeManager;

beforeEach(async () => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), "cortex-phase6-"));
  km = new KnowledgeManager(tmp);
  await km.init();
});

afterEach(async () => {
  try { await fs.rm(tmp, { recursive: true, force: true }); } catch {}
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

describe("Phase 6 — Constraint validation", () => {
  it("rejects depends_on edge that violates target's mustNotBeCalledBy", async () => {
    await km.saveSynthesis(syn({
      summary: "seed B with constraint",
      entities: [{
        name: "B",
        action: "create",
        description: "guarded",
        relationships: [],
        constraints: { mustNotBeCalledBy: ["A"] },
      }],
    }));

    await assert.rejects(
      () => km.saveSynthesis(syn({
        summary: "A depends on B (illegal)",
        entities: [{
          name: "A",
          action: "create",
          description: "violator",
          relationships: [{ target: "B", kind: "depends_on" }],
        }],
      })),
      /Constraint Violation: Entity 'B' must not be called by 'A'/,
    );
  });

  it("rejects depends_on edge that violates source's mustNotImport", async () => {
    await assert.rejects(
      () => km.saveSynthesis(syn({
        summary: "A self-declares mustNotImport B then imports B",
        entities: [{
          name: "A",
          action: "create",
          description: "...",
          relationships: [{ target: "B", kind: "depends_on" }],
          constraints: { mustNotImport: ["B"] },
        }],
      })),
      /Constraint Violation: Entity 'A' must not import 'B'/,
    );
  });

  it("does NOT trigger violation for contradicts/supports/derived_from edges", async () => {
    await km.saveSynthesis(syn({
      summary: "seed B with constraint",
      entities: [{
        name: "B",
        action: "create",
        description: "guarded",
        relationships: [],
        constraints: { mustNotBeCalledBy: ["A"] },
      }],
    }));

    // contradicts is a documentation edge, not a usage edge — allowed.
    await km.saveSynthesis(syn({
      summary: "A contradicts B (allowed)",
      entities: [{
        name: "A",
        action: "create",
        description: "...",
        relationships: [{ target: "B", kind: "contradicts" }],
      }],
    }));

    // supports likewise.
    await km.saveSynthesis(syn({
      summary: "A2 supports B (allowed)",
      entities: [{
        name: "A2",
        action: "create",
        description: "...",
        relationships: [{ target: "B", kind: "supports" }],
      }],
    }));
  });

  it("catches in-batch violations (B's constraint and A→B in the same synthesis)", async () => {
    await assert.rejects(
      () => km.saveSynthesis(syn({
        summary: "B and A together — A would call B",
        entities: [
          {
            name: "B",
            action: "create",
            description: "guarded",
            relationships: [],
            constraints: { mustNotBeCalledBy: ["A"] },
          },
          {
            name: "A",
            action: "create",
            description: "violator",
            relationships: [{ target: "B", kind: "called_by" }],
          },
        ],
      })),
      /Constraint Violation/,
    );
  });

  it("preserves mustNotImport across an update that omits the constraints field", async () => {
    await km.saveSynthesis(syn({
      summary: "create A with constraint",
      entities: [{
        name: "A",
        action: "create",
        description: "v1",
        relationships: [],
        constraints: { mustNotImport: ["BadModule"] },
      }],
    }));

    // Update A without re-declaring constraints — old constraint must persist.
    await km.saveSynthesis(syn({
      summary: "update A",
      entities: [{
        name: "A",
        action: "update",
        description: "v2",
        relationships: [],
      }],
    }));

    await assert.rejects(
      () => km.saveSynthesis(syn({
        summary: "A tries to depend on BadModule",
        entities: [{
          name: "A",
          action: "update",
          description: "v3",
          relationships: [{ target: "BadModule", kind: "depends_on" }],
        }],
      })),
      /Constraint Violation: Entity 'A' must not import 'BadModule'/,
    );
  });
});

describe("Phase 6 — Blast-radius staleness", () => {
  async function seedADependsOnB() {
    await km.saveSynthesis(syn({
      summary: "create A and B",
      entities: [
        { name: "B", action: "create", description: "dep", relationships: [] },
        {
          name: "A",
          action: "create",
          description: "depends",
          relationships: [{ target: "B", kind: "depends_on" }],
        },
      ],
    }));
  }

  it("stamps staleSince on dependents when an entity is updated", async () => {
    await seedADependsOnB();
    await km.saveSynthesis(syn({
      summary: "update B",
      entities: [{ name: "B", action: "update", description: "v2", relationships: [] }],
    }));

    const stale = await km.getStaleEntities();
    assert.equal(stale.length, 1);
    assert.equal(stale[0].name, "A");
    assert.ok(stale[0].staleSince);
  });

  it("re-renders dependent .md with a Stale Since warning block", async () => {
    await seedADependsOnB();
    await km.saveSynthesis(syn({
      summary: "update B",
      entities: [{ name: "B", action: "update", description: "v2", relationships: [] }],
    }));

    const aMd = await fs.readFile(path.join(tmp, ".knowledge", "entities", "A.md"), "utf8");
    assert.match(aMd, /Stale Since/);
    assert.match(aMd, /\[!WARNING\]/);
  });

  it("clears staleSince when the stale entity is itself re-synthesized", async () => {
    await seedADependsOnB();
    await km.saveSynthesis(syn({
      summary: "update B",
      entities: [{ name: "B", action: "update", description: "v2", relationships: [] }],
    }));
    assert.equal((await km.getStaleEntities()).length, 1);

    await km.saveSynthesis(syn({
      summary: "refresh A",
      entities: [{
        name: "A",
        action: "update",
        description: "A reviewed",
        relationships: [{ target: "B", kind: "depends_on" }],
      }],
    }));

    assert.equal((await km.getStaleEntities()).length, 0);
    const aMd = await fs.readFile(path.join(tmp, ".knowledge", "entities", "A.md"), "utf8");
    assert.doesNotMatch(aMd, /Stale Since/);
  });

  it("does NOT stamp staleSince on entities included in the same synthesis batch", async () => {
    await seedADependsOnB();
    // Update both A and B in one batch — A should not be marked stale because
    // it was explicitly synthesized.
    await km.saveSynthesis(syn({
      summary: "update both",
      entities: [
        { name: "B", action: "update", description: "v2", relationships: [] },
        {
          name: "A",
          action: "update",
          description: "v2 — handles B's change",
          relationships: [{ target: "B", kind: "depends_on" }],
        },
      ],
    }));

    assert.equal((await km.getStaleEntities()).length, 0);
  });

  it("only propagates via depends_on / called_by, not via supports/contradicts", async () => {
    await km.saveSynthesis(syn({
      summary: "seed B and a non-usage referer",
      entities: [
        { name: "B", action: "create", description: "...", relationships: [] },
        {
          name: "Documenter",
          action: "create",
          description: "merely references B",
          relationships: [{ target: "B", kind: "supports" }],
        },
      ],
    }));

    await km.saveSynthesis(syn({
      summary: "update B",
      entities: [{ name: "B", action: "update", description: "v2", relationships: [] }],
    }));

    assert.equal((await km.getStaleEntities()).length, 0);
  });

  it("staleCount matches staleEntities length", async () => {
    await seedADependsOnB();
    await km.saveSynthesis(syn({
      summary: "update B",
      entities: [{ name: "B", action: "update", description: "v2", relationships: [] }],
    }));
    assert.equal(await km.getStaleCount(), 1);
  });

  it("refreshStaleEntities clears staleSince without rewriting the description", async () => {
    await seedADependsOnB();
    await km.saveSynthesis(syn({
      summary: "update B",
      entities: [{ name: "B", action: "update", description: "v2", relationships: [] }],
    }));
    assert.equal(await km.getStaleCount(), 1);

    const before = await fs.readFile(path.join(tmp, ".knowledge", "entities", "A.md"), "utf8");
    assert.match(before, /Stale Since/);

    const result = await km.refreshStaleEntities(["A"]);
    assert.deepEqual(result.cleared, ["A"]);
    assert.equal(result.skipped.length, 0);
    assert.equal(await km.getStaleCount(), 0);

    const after = await fs.readFile(path.join(tmp, ".knowledge", "entities", "A.md"), "utf8");
    assert.doesNotMatch(after, /Stale Since/);
    // Description body must not have been rewritten — original A description survives.
    assert.match(after, /depends/);
  });

  it("refreshStaleEntities skips entities that are not stale or do not exist", async () => {
    await seedADependsOnB();
    const result = await km.refreshStaleEntities(["A", "Nonexistent"]);
    // A was never stamped stale (no B update happened), Nonexistent doesn't exist.
    assert.deepEqual(result.cleared, []);
    assert.deepEqual(result.skipped.sort(), ["A", "Nonexistent"].sort());
  });
});

describe("Phase 6 — Failed approaches & sourceFile preservation", () => {
  it("preserves failedApproaches when an update omits the field", async () => {
    await km.saveSynthesis(syn({
      summary: "create with failedApproaches",
      entities: [{
        name: "Auth",
        action: "create",
        description: "...",
        relationships: [],
        failedApproaches: [{
          summary: "Tried session cookies",
          reason: "CSRF risk on cross-site embeds",
          recordedAt: "2026-01-15T10:00:00Z",
        }],
      }],
    }));

    await km.saveSynthesis(syn({
      summary: "update Auth without failedApproaches",
      entities: [{
        name: "Auth",
        action: "update",
        description: "v2",
        relationships: [],
      }],
    }));

    const md = await fs.readFile(path.join(tmp, ".knowledge", "entities", "Auth.md"), "utf8");
    assert.match(md, /Tried session cookies/);
    assert.match(md, /CSRF risk/);
  });

  it("preserves sourceFile when an update omits it", async () => {
    await km.saveSynthesis(syn({
      summary: "create with sourceFile",
      entities: [{
        name: "Auth",
        action: "create",
        description: "...",
        relationships: [],
        sourceFile: "src/auth/index.ts",
      }],
    }));

    await km.saveSynthesis(syn({
      summary: "update Auth without sourceFile",
      entities: [{
        name: "Auth",
        action: "update",
        description: "v2",
        relationships: [],
      }],
    }));

    const md = await fs.readFile(path.join(tmp, ".knowledge", "entities", "Auth.md"), "utf8");
    assert.match(md, /src\/auth\/index\.ts/);
  });

  it("preserves concept failedApproaches across saveConcept calls that omit the field", async () => {
    await km.saveConcept({
      name: "JWTStrategy",
      description: "v1",
      failedApproaches: [{
        summary: "tried HS512",
        reason: "key-mgmt burden",
        recordedAt: "2026-01-15T10:00:00Z",
      }],
    });

    await km.saveConcept({
      name: "JWTStrategy",
      description: "v2 — refined",
    });

    const md = await fs.readFile(path.join(tmp, ".knowledge", "concepts", "JWTStrategy.md"), "utf8");
    assert.match(md, /tried HS512/);
  });
});

describe("Phase 6 — Index rendering", () => {
  it("renders [STALE] in index.md for stale entities", async () => {
    await km.saveSynthesis(syn({
      summary: "create A and B",
      entities: [
        { name: "B", action: "create", description: "...", relationships: [] },
        {
          name: "A",
          action: "create",
          description: "...",
          relationships: [{ target: "B", kind: "depends_on" }],
        },
      ],
    }));
    await km.saveSynthesis(syn({
      summary: "update B",
      entities: [{ name: "B", action: "update", description: "v2", relationships: [] }],
    }));

    const index = await fs.readFile(path.join(tmp, ".knowledge", "index.md"), "utf8");
    assert.match(index, /\[\[A\]\].*\[STALE\]/s);
  });

  it("exportSpec includes constraints and failedApproaches sections", async () => {
    await km.saveSynthesis(syn({
      summary: "full entity",
      entities: [{
        name: "Auth",
        action: "create",
        description: "...",
        relationships: [],
        constraints: { contract: "All callers must hold a session token" },
        failedApproaches: [{
          summary: "tried basic auth",
          reason: "no logout semantics",
          recordedAt: "2026-01-15T10:00:00Z",
        }],
      }],
    }));

    const outPath = await km.exportSpec();
    const spec = await fs.readFile(outPath, "utf8");
    assert.match(spec, /All callers must hold a session token/);
    assert.match(spec, /tried basic auth/);
  });
});
