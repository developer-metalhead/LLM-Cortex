import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { KnowledgeManager } from "../src/knowledge/writer.js";
import { computeQuality, formatScore } from "../src/knowledge/quality.js";
import {
  globMatch,
  loadOrgConstraints,
  OrgConstraintEvaluator,
  throwOnErrors,
} from "../src/knowledge/org-constraints.js";
import { LintManager } from "../src/knowledge/lint.js";
import type { Synthesis } from "../src/llm/schema.js";

// Each test gets its own fresh knowledge directory.
let tmp: string;
let km: KnowledgeManager;

beforeEach(async () => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), "cortex-phase7_5-"));
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

// ───────────────────────────────────────────────────────────────────────
// Quality scoring — pure-function unit tests
// ───────────────────────────────────────────────────────────────────────

describe("Phase 7.5 — Quality score: per-dimension computation", () => {
  it("returns 1.0 across all dimensions for a fresh, evidenceless, non-stale, human-reviewed entity", () => {
    const now = Date.parse("2026-05-19T00:00:00Z");
    const b = computeQuality(
      {
        description: "X",
        lastRefined: "2026-05-18T00:00:00Z", // 1 day old
        human_reviewed: true,
      },
      { nowMs: now },
    );
    assert.equal(b.evidenceFreshness, 1.0);
    assert.equal(b.contradiction, 1.0);
    assert.equal(b.staleness, 1.0);
    assert.equal(b.age, 1.0);
    assert.equal(b.humanReview, 1.0);
    assert.equal(b.score, 1.0);
  });

  it("staleness=0 when staleSince is set, even if everything else is perfect", () => {
    const now = Date.parse("2026-05-19T00:00:00Z");
    const b = computeQuality(
      {
        description: "X",
        lastRefined: "2026-05-18T00:00:00Z",
        staleSince: "2026-05-18T00:00:00Z",
        human_reviewed: true,
      },
      { nowMs: now },
    );
    assert.equal(b.staleness, 0.0);
    // mean of (1+1+0+1+1)/5 = 0.8
    assert.equal(b.score, 0.8);
  });

  it("humanReview=0.7 when human_reviewed flag is absent", () => {
    const now = Date.parse("2026-05-19T00:00:00Z");
    const b = computeQuality(
      { description: "X", lastRefined: "2026-05-18T00:00:00Z" },
      { nowMs: now },
    );
    assert.equal(b.humanReview, 0.7);
  });

  it("contradiction score decays linearly by 0.2 per open contradiction", () => {
    const now = Date.parse("2026-05-19T00:00:00Z");
    const e = { description: "X", lastRefined: "2026-05-18T00:00:00Z", human_reviewed: true };
    const close = (a: number, b: number) => Math.abs(a - b) < 1e-9;
    assert.equal(computeQuality(e, { nowMs: now, openContradictionCount: 0 }).contradiction, 1.0);
    assert.ok(close(computeQuality(e, { nowMs: now, openContradictionCount: 1 }).contradiction, 0.8));
    assert.ok(close(computeQuality(e, { nowMs: now, openContradictionCount: 3 }).contradiction, 0.4));
    assert.equal(computeQuality(e, { nowMs: now, openContradictionCount: 10 }).contradiction, 0.0);
  });

  it("evidenceFreshness=0 when source-missing, even with no drift events", () => {
    const now = Date.parse("2026-05-19T00:00:00Z");
    const b = computeQuality(
      {
        description: "X",
        lastRefined: "2026-05-18T00:00:00Z",
        evidence: [{ sourceFile: "deleted.ts" }],
      },
      { nowMs: now, evidenceSourceMissing: true },
    );
    assert.equal(b.evidenceFreshness, 0.0);
  });

  it("evidenceFreshness=1 when no evidence array exists (no claims to verify)", () => {
    const now = Date.parse("2026-05-19T00:00:00Z");
    const b = computeQuality({ description: "X", lastRefined: "2026-05-18T00:00:00Z" }, { nowMs: now });
    assert.equal(b.evidenceFreshness, 1.0);
  });

  it("evidence drift events subtract 0.5 each from freshness, floored at 0", () => {
    const now = Date.parse("2026-05-19T00:00:00Z");
    const e = {
      description: "X",
      lastRefined: "2026-05-18T00:00:00Z",
      evidence: [{ sourceFile: "x.ts" }],
    };
    assert.equal(computeQuality(e, { nowMs: now, evidenceDriftCount: 0 }).evidenceFreshness, 1.0);
    assert.equal(computeQuality(e, { nowMs: now, evidenceDriftCount: 1 }).evidenceFreshness, 0.5);
    assert.equal(computeQuality(e, { nowMs: now, evidenceDriftCount: 2 }).evidenceFreshness, 0.0);
    assert.equal(computeQuality(e, { nowMs: now, evidenceDriftCount: 5 }).evidenceFreshness, 0.0);
  });
});

describe("Phase 7.5 — Age decay curve", () => {
  // Reference: fresh threshold = 30 days, default decayDays = 180, floor = 0.3
  const now = Date.parse("2026-05-19T00:00:00Z");

  function ageScoreFor(daysOld: number, decayDays?: number) {
    const last = new Date(now - daysOld * 86400000).toISOString();
    return computeQuality(
      { description: "X", lastRefined: last, human_reviewed: true },
      { nowMs: now, ageDecayDays: decayDays },
    ).age;
  }

  it("returns 1.0 for any age ≤ 30 days", () => {
    assert.equal(ageScoreFor(0), 1.0);
    assert.equal(ageScoreFor(15), 1.0);
    assert.equal(ageScoreFor(30), 1.0);
  });

  it("linearly decays from 30 → 180 days, hitting floor of 0.3 at 180 days", () => {
    const at30 = ageScoreFor(30);
    const at105 = ageScoreFor(105); // midpoint between 30 and 180
    const at180 = ageScoreFor(180);
    assert.equal(at30, 1.0);
    assert.equal(at180, 0.3);
    // 75 days into a 150-day decay window — should be ~halfway between 1.0 and 0.3
    assert.ok(Math.abs(at105 - 0.65) < 0.01, `expected ~0.65, got ${at105}`);
  });

  it("stays floored at 0.3 for very old entities", () => {
    assert.equal(ageScoreFor(365), 0.3);
    assert.equal(ageScoreFor(10000), 0.3);
  });

  it("respects configurable decay window", () => {
    // Custom decay of 90 days — entity 60 days old is halfway through the window.
    const at60 = ageScoreFor(60, 90);
    assert.ok(Math.abs(at60 - 0.65) < 0.01, `expected ~0.65 for 60d@90d-window, got ${at60}`);
  });

  it("returns floor (0.3) for unparseable lastRefined", () => {
    const b = computeQuality(
      { description: "X", lastRefined: "not-a-date", human_reviewed: true },
      { nowMs: now },
    );
    assert.equal(b.age, 0.3);
  });
});

describe("Phase 7.5 — formatScore output", () => {
  it("renders a percent string rounded to nearest int", () => {
    assert.equal(formatScore(1.0), "100%");
    assert.equal(formatScore(0.5), "50%");
    assert.equal(formatScore(0.0), "0%");
    assert.equal(formatScore(0.847), "85%");
  });
});

// ───────────────────────────────────────────────────────────────────────
// updateIndex renders quality badges
// ───────────────────────────────────────────────────────────────────────

describe("Phase 7.5 — updateIndex renders quality scores", () => {
  it("emits `▸ quality: N%` next to every entity in index.md", async () => {
    await km.saveSynthesis(syn({
      summary: "seed",
      entities: [{
        name: "AuthService",
        action: "create",
        description: "Handles auth",
        relationships: [],
        sourceFile: "src/auth.ts",
      }],
    }));
    const indexMd = await fs.readFile(path.join(tmp, ".knowledge", "index.md"), "utf8");
    // Format: ### [[AuthService]] — `src/auth.ts` ▸ quality: 94%
    assert.match(indexMd, /### \[\[AuthService\]\].*▸ quality: \d+%/);
  });

  it("reflects staleness in the quality score", async () => {
    // Two entities, A depends_on B. Create B first.
    await km.saveSynthesis(syn({
      summary: "seed B",
      entities: [{ name: "B", action: "create", description: "B", relationships: [] }],
    }));
    // Create A that depends on B.
    await km.saveSynthesis(syn({
      summary: "A depends on B",
      entities: [{ name: "A", action: "create", description: "A", relationships: [{ target: "B", kind: "depends_on" }] }],
    }));
    // Now update B — A becomes stale.
    await km.saveSynthesis(syn({
      summary: "update B",
      entities: [{ name: "B", action: "update", description: "B updated", relationships: [] }],
    }));

    const indexMd = await fs.readFile(path.join(tmp, ".knowledge", "index.md"), "utf8");
    // A should be flagged STALE AND its quality should be < 100%
    const lineA = indexMd.split("\n").find((l) => l.includes("[[A]]"));
    assert.ok(lineA, "A should appear in index");
    assert.ok(/\[STALE\]/.test(lineA!), `A line should carry STALE: ${lineA}`);
    const pctMatch = lineA!.match(/quality: (\d+)%/);
    assert.ok(pctMatch, `A line should carry quality: ${lineA}`);
    const pct = parseInt(pctMatch![1], 10);
    assert.ok(pct < 100, `stale entity should score < 100%, got ${pct}%`);
  });
});

// ───────────────────────────────────────────────────────────────────────
// human_reviewed + reviewed_by persistence & preservation
// ───────────────────────────────────────────────────────────────────────

describe("Phase 7.5 — human review facts", () => {
  it("setHumanReview persists human_reviewed=true + reviewed_by in state.json", async () => {
    await km.saveSynthesis(syn({
      summary: "seed",
      entities: [{ name: "X", action: "create", description: "x", relationships: [] }],
    }));
    const res = await km.setHumanReview("X", true, "alice@acme.com");
    assert.equal(res.ok, true);

    const stateRaw = await fs.readFile(path.join(tmp, ".knowledge", "state.json"), "utf8");
    const state = JSON.parse(stateRaw);
    assert.equal(state.entities.X.human_reviewed, true);
    assert.equal(state.entities.X.reviewed_by, "alice@acme.com");
  });

  it("setHumanReview boosts the quality score to 100% on a fresh entity", async () => {
    await km.saveSynthesis(syn({
      summary: "seed",
      entities: [{ name: "X", action: "create", description: "x", relationships: [] }],
    }));
    // Before review: humanReview dim = 0.7 → score = (1+1+1+1+0.7)/5 = 0.94
    const before = await km.getEntityQuality("X");
    assert.equal(before!.humanReview, 0.7);
    assert.ok(Math.abs(before!.score - 0.94) < 0.001);

    await km.setHumanReview("X", true, "alice");
    const after = await km.getEntityQuality("X");
    assert.equal(after!.humanReview, 1.0);
    assert.equal(after!.score, 1.0);
  });

  it("preserves human_reviewed across a later synthesis update that omits the field", async () => {
    await km.saveSynthesis(syn({
      summary: "seed",
      entities: [{ name: "X", action: "create", description: "x", relationships: [] }],
    }));
    await km.setHumanReview("X", true, "alice");

    // Re-synthesize X — Librarian never re-emits human_reviewed
    await km.saveSynthesis(syn({
      summary: "re-emit X",
      entities: [{ name: "X", action: "update", description: "x v2", relationships: [] }],
    }));

    const stateRaw = await fs.readFile(path.join(tmp, ".knowledge", "state.json"), "utf8");
    const state = JSON.parse(stateRaw);
    assert.equal(state.entities.X.human_reviewed, true);
    assert.equal(state.entities.X.reviewed_by, "alice");
  });

  it("setHumanReview returns ok=false for unknown entity", async () => {
    const res = await km.setHumanReview("DoesNotExist", true, "alice");
    assert.equal(res.ok, false);
    assert.match(res.reason!, /not found/);
  });
});

// ───────────────────────────────────────────────────────────────────────
// listEntityQuality + getLowQualityCount
// ───────────────────────────────────────────────────────────────────────

describe("Phase 7.5 — quality aggregations", () => {
  it("listEntityQuality returns rows sorted by score ascending", async () => {
    // Seed two: one reviewed (100%), one stale (low).
    await km.saveSynthesis(syn({
      summary: "seed B",
      entities: [{ name: "B", action: "create", description: "b", relationships: [] }],
    }));
    await km.saveSynthesis(syn({
      summary: "A depends on B",
      entities: [{ name: "A", action: "create", description: "a", relationships: [{ target: "B", kind: "depends_on" }] }],
    }));
    // Mark B reviewed → 100%
    await km.setHumanReview("B", true, "alice");
    // Re-update B → A goes stale, B stays 100%
    await km.saveSynthesis(syn({
      summary: "update B",
      entities: [{ name: "B", action: "update", description: "b v2", relationships: [] }],
    }));

    const rows = await km.listEntityQuality();
    assert.equal(rows.length, 2);
    // A (stale) should sort first.
    assert.equal(rows[0].name, "A");
    assert.ok(rows[0].breakdown.score < rows[1].breakdown.score);
  });

  it("getLowQualityCount counts entities below threshold", async () => {
    await km.saveSynthesis(syn({
      summary: "seed",
      entities: [
        { name: "B", action: "create", description: "b", relationships: [] },
        { name: "A", action: "create", description: "a", relationships: [{ target: "B", kind: "depends_on" }] },
      ],
    }));
    // Both should be at 0.94 (no human review) — none below 0.5 gate.
    assert.equal(await km.getLowQualityCount(0.5), 0);

    // Update B → A becomes stale → A's staleness=0, score = (1+1+0+1+0.7)/5 = 0.74.
    // B is freshly updated → still 0.94.
    await km.saveSynthesis(syn({
      summary: "update B",
      entities: [{ name: "B", action: "update", description: "b v2", relationships: [] }],
    }));
    assert.equal(await km.getLowQualityCount(0.5), 0);   // A (0.74) and B (0.94) both above 0.5
    assert.equal(await km.getLowQualityCount(0.75), 1);  // A (0.74) below 0.75, B (0.94) above
    assert.equal(await km.getLowQualityCount(0.95), 2);  // both below 0.95
  });

  it("getEntityQuality returns null for unknown entity", async () => {
    const q = await km.getEntityQuality("Nope");
    assert.equal(q, null);
  });
});

// ───────────────────────────────────────────────────────────────────────
// Org-constraint loader + glob matcher
// ───────────────────────────────────────────────────────────────────────

describe("Phase 7.5 — globMatch", () => {
  it("** matches across path separators", () => {
    assert.equal(globMatch("src/**", "src/auth/middleware.ts"), true);
    assert.equal(globMatch("src/**", "src/a/b/c/d.ts"), true);
    assert.equal(globMatch("src/**", "lib/x.ts"), false);
  });
  it("* matches segment chars but not /", () => {
    assert.equal(globMatch("src/*.ts", "src/a.ts"), true);
    assert.equal(globMatch("src/*.ts", "src/a/b.ts"), false);
  });
  it("literal segments must match exactly", () => {
    assert.equal(globMatch("payment/api", "payment/api"), true);
    assert.equal(globMatch("payment/api", "payment/web"), false);
  });
});

describe("Phase 7.5 — loadOrgConstraints", () => {
  it("returns null when no file is present", async () => {
    assert.equal(loadOrgConstraints(tmp), null);
  });

  it("loads + validates a JSON file", async () => {
    await fs.writeFile(
      path.join(tmp, "cortex.constraints.json"),
      JSON.stringify({
        version: 1,
        constraints: [
          {
            id: "no-payment-legacy",
            description: "Payment domain must never import Legacy domain",
            rule: { sourcePattern: "src/payment/**", mustNotImport: "src/legacy/**" },
            severity: "error",
          },
        ],
      }),
    );
    const file = loadOrgConstraints(tmp);
    assert.ok(file);
    assert.equal(file!.constraints.length, 1);
    assert.equal(file!.constraints[0].id, "no-payment-legacy");
    assert.equal(file!.constraints[0].severity, "error");
  });

  it("throws on malformed JSON with file name in the error", async () => {
    await fs.writeFile(path.join(tmp, "cortex.constraints.json"), "{ bad json");
    assert.throws(
      () => loadOrgConstraints(tmp),
      /cortex\.constraints\.json/,
    );
  });

  it("throws a clear migration error if a legacy .yaml file is found", async () => {
    await fs.writeFile(path.join(tmp, "cortex.constraints.yaml"), "version: 1\n");
    assert.throws(
      () => loadOrgConstraints(tmp),
      /uses cortex\.constraints\.json \(JSON\)/,
    );
  });

  it("throws on unsupported schema version", async () => {
    await fs.writeFile(
      path.join(tmp, "cortex.constraints.json"),
      JSON.stringify({ version: 99, constraints: [] }),
    );
    assert.throws(() => loadOrgConstraints(tmp), /unsupported version/);
  });

  it("throws on duplicate constraint ids", async () => {
    await fs.writeFile(
      path.join(tmp, "cortex.constraints.json"),
      JSON.stringify({
        version: 1,
        constraints: [
          { id: "dup", rule: {}, severity: "error" },
          { id: "dup", rule: {}, severity: "warning" },
        ],
      }),
    );
    assert.throws(() => loadOrgConstraints(tmp), /duplicate constraint id 'dup'/);
  });
});

// ───────────────────────────────────────────────────────────────────────
// Org-constraint evaluation
// ───────────────────────────────────────────────────────────────────────

describe("Phase 7.5 — OrgConstraintEvaluator", () => {
  it("mustNotImport — error severity throws via throwOnErrors", () => {
    const evaluator = new OrgConstraintEvaluator({
      version: 1,
      constraints: [
        {
          id: "no-payment-legacy",
          description: "Payment must not import legacy",
          rule: { sourcePattern: "src/payment/**", mustNotImport: "src/legacy/**" },
          severity: "error",
        },
      ],
    });
    const violations = evaluator.evaluateAll({
      PaymentService: {
        sourceFile: "src/payment/svc.ts",
        relationships: [{ target: "src/legacy/old.ts", kind: "depends_on" }],
      },
    });
    assert.equal(violations.length, 1);
    assert.equal(violations[0].constraintId, "no-payment-legacy");
    assert.equal(violations[0].severity, "error");
    assert.throws(() => throwOnErrors(violations), /Org Constraint Violation/);
  });

  it("mustNotImport — does not fire when sourcePattern does not match", () => {
    const evaluator = new OrgConstraintEvaluator({
      version: 1,
      constraints: [{
        id: "no-payment-legacy",
        rule: { sourcePattern: "src/payment/**", mustNotImport: "src/legacy/**" },
        severity: "error",
      }],
    });
    const violations = evaluator.evaluateAll({
      AuthService: {
        sourceFile: "src/auth/svc.ts",
        relationships: [{ target: "src/legacy/old.ts", kind: "depends_on" }],
      },
    });
    assert.equal(violations.length, 0);
  });

  it("mustNotImport — only fires for usage edges (not contradicts/supports/etc)", () => {
    const evaluator = new OrgConstraintEvaluator({
      version: 1,
      constraints: [{
        id: "no-payment-legacy",
        rule: { sourcePattern: "src/payment/**", mustNotImport: "src/legacy/**" },
        severity: "error",
      }],
    });
    const violations = evaluator.evaluateAll({
      P: {
        sourceFile: "src/payment/s.ts",
        relationships: [
          { target: "src/legacy/old.ts", kind: "contradicts" },
          { target: "src/legacy/x.ts", kind: "supports" },
        ],
      },
    });
    assert.equal(violations.length, 0);
  });

  it("requiresEvidence — flags entity in scope with no evidence", () => {
    const evaluator = new OrgConstraintEvaluator({
      version: 1,
      constraints: [{
        id: "auth-evidence-required",
        rule: { sourcePattern: "src/auth/**", requiresEvidence: true },
        severity: "warning",
      }],
    });
    const violations = evaluator.evaluateAll({
      A: { sourceFile: "src/auth/a.ts" },           // no evidence → violation
      B: { sourceFile: "src/auth/b.ts", evidence: [{ sourceFile: "src/auth/b.ts" }] },
    });
    assert.equal(violations.length, 1);
    assert.equal(violations[0].entity, "A");
    assert.equal(violations[0].severity, "warning");
  });

  it("requiresConstraint:contract — flags entity in scope without a contract", () => {
    const evaluator = new OrgConstraintEvaluator({
      version: 1,
      constraints: [{
        id: "public-api-needs-contract",
        rule: { tag: "public-api", requiresConstraint: "contract" },
        severity: "error",
      }],
    });
    const violations = evaluator.evaluateAll({
      Endpoint: { tags: ["public-api"] },                                                       // no contract
      Other: { tags: ["public-api"], constraints: { contract: "must be idempotent" } },         // has one
    });
    assert.equal(violations.length, 1);
    assert.equal(violations[0].entity, "Endpoint");
  });

  it("constraints with no scope filter apply globally", () => {
    const evaluator = new OrgConstraintEvaluator({
      version: 1,
      constraints: [{
        id: "all-entities-need-evidence",
        rule: { requiresEvidence: true },
        severity: "warning",
      }],
    });
    const violations = evaluator.evaluateAll({
      A: { sourceFile: "anywhere.ts" },
      B: { sourceFile: "other.ts", evidence: [{ sourceFile: "other.ts" }] },
    });
    assert.equal(violations.length, 1);
    assert.equal(violations[0].entity, "A");
  });

  it("mustNotImport accepts an array of globs (any-match)", () => {
    const evaluator = new OrgConstraintEvaluator({
      version: 1,
      constraints: [{
        id: "no-legacy",
        rule: { sourcePattern: "src/**", mustNotImport: ["src/legacy/**", "src/deprecated/**"] },
        severity: "error",
      }],
    });
    const violations = evaluator.evaluateAll({
      P: { sourceFile: "src/p.ts", relationships: [{ target: "src/deprecated/x.ts", kind: "depends_on" }] },
    });
    assert.equal(violations.length, 1);
  });
});

// ───────────────────────────────────────────────────────────────────────
// Org-constraint integration in saveSynthesis
// ───────────────────────────────────────────────────────────────────────

describe("Phase 7.5 — saveSynthesis enforces org constraints", () => {
  it("rejects a save when an error-severity org rule is violated", async () => {
    await fs.writeFile(
      path.join(tmp, "cortex.constraints.json"),
      JSON.stringify({
        version: 1,
        constraints: [{
          id: "no-payment-legacy",
          rule: { sourcePattern: "src/payment/**", mustNotImport: "src/legacy/**" },
          severity: "error",
        }],
      }),
    );

    await assert.rejects(
      () => km.saveSynthesis(syn({
        summary: "payment imports legacy (illegal)",
        entities: [{
          name: "PaymentService",
          action: "create",
          description: "x",
          sourceFile: "src/payment/svc.ts",
          relationships: [{ target: "src/legacy/old.ts", kind: "depends_on" }],
        }],
      })),
      /Org Constraint Violation:.*no-payment-legacy/,
    );
  });

  it("warning severity surfaces as synthesis.warnings rather than blocking", async () => {
    await fs.writeFile(
      path.join(tmp, "cortex.constraints.json"),
      JSON.stringify({
        version: 1,
        constraints: [{
          id: "auth-needs-evidence",
          rule: { sourcePattern: "src/auth/**", requiresEvidence: true },
          severity: "warning",
        }],
      }),
    );

    await km.saveSynthesis(syn({
      summary: "auth without evidence",
      entities: [{
        name: "AuthService",
        action: "create",
        description: "x",
        sourceFile: "src/auth/svc.ts",
        relationships: [],
      }],
    }));

    // Synthesis was accepted. Read the log to confirm the warning made it through.
    const logMd = await fs.readFile(path.join(tmp, ".knowledge", "log.md"), "utf8");
    assert.match(logMd, /\[auth-needs-evidence\] AuthService/);
  });
});

// ───────────────────────────────────────────────────────────────────────
// cortex lint reports org_constraint
// ───────────────────────────────────────────────────────────────────────

describe("Phase 7.5 — lint surfaces org_constraint violations", () => {
  it("emits org_constraint lint results when an entity violates a rule", async () => {
    // Seed an entity that will violate a warning-severity org constraint.
    await km.saveSynthesis(syn({
      summary: "seed",
      entities: [{
        name: "X",
        action: "create",
        description: "x",
        sourceFile: "src/auth/x.ts",
        relationships: [],
      }],
    }));

    // Add the constraint AFTER the entity was created so it survives the
    // saveSynthesis path (which would have thrown otherwise).
    await fs.writeFile(
      path.join(tmp, "cortex.constraints.json"),
      JSON.stringify({
        version: 1,
        constraints: [{
          id: "auth-needs-evidence",
          rule: { sourcePattern: "src/auth/**", requiresEvidence: true },
          severity: "warning",
        }],
      }),
    );

    const lm = new LintManager(tmp);
    const results = await lm.lint();
    const orgResults = results.filter((r) => r.rule === "org_constraint");
    assert.equal(orgResults.length, 1);
    assert.equal(orgResults[0].severity, "warning");
    assert.equal(orgResults[0].entity, "X");
    assert.match(orgResults[0].message, /auth-needs-evidence/);
  });

  it("surfaces a malformed cortex.constraints.json as a single lint warning rather than aborting", async () => {
    await km.saveSynthesis(syn({
      summary: "seed",
      entities: [{ name: "X", action: "create", description: "x", relationships: [] }],
    }));
    await fs.writeFile(path.join(tmp, "cortex.constraints.json"), "{ malformed");

    const lm = new LintManager(tmp);
    const results = await lm.lint();
    const orgErrors = results.filter((r) => r.rule === "org_constraint");
    assert.equal(orgErrors.length, 1);
    assert.match(orgErrors[0].message, /Failed to load cortex\.constraints\.json/);
  });
});
