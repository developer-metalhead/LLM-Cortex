import { test } from "node:test";
import assert from "node:assert";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { KnowledgeManager } from "../src/knowledge/writer.js";
import { LintManager } from "../src/knowledge/lint.js";
import { AuditManager } from "../src/knowledge/audit.js";
import { EvolutionManager } from "../src/knowledge/evolution.js";

test("Phase 7: KnowledgeManager evidence rules and secret redaction", async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "cortex-phase7-"));
  const km = new KnowledgeManager(tmpDir);
  await km.init();

  // Test 1: Reject over-budget evidence (too many entries)
  await assert.rejects(
    km.saveSynthesis({
      summary: "Test",
      entities: [
        {
          name: "TooManyEv",
          action: "create",
          description: "Test",
          relationships: [],
          evidence: [
            { sourceFile: "a", content: "1" },
            { sourceFile: "b", content: "2" },
            { sourceFile: "c", content: "3" },
          ],
        },
      ],
      concepts: [],
      warnings: [],
    }),
    /Evidence Limit Exceeded: Entity 'TooManyEv' has more than 2 evidence entries/,
  );

  // Test 2: Secret Redaction (quoted assignment + Authorization header + JWT)
  const synthesis = {
    summary: "Test Redaction",
    entities: [
      {
        name: "SecretEv",
        action: "create" as const,
        description: "Test",
        relationships: [],
        evidence: [
          {
            sourceFile: "sec.ts",
            content:
              "const API_KEY = 'sk-12345';\nconst normal = 1;",
          },
        ],
      },
    ],
    concepts: [],
    warnings: [] as string[],
  };

  await km.saveSynthesis(synthesis);
  const state = JSON.parse(await fs.readFile(path.join(tmpDir, ".knowledge", "state.json"), "utf8"));
  const savedEv = state.entities["SecretEv"].evidence[0];
  assert.match(savedEv.content, /redacted by Cortex/);
  assert.doesNotMatch(savedEv.content, /sk-12345/);

  // Test 3: JSONL Emission with state snapshot
  const logContent = await fs.readFile(path.join(tmpDir, ".knowledge", "log.jsonl"), "utf8");
  const lines = logContent.split("\n").filter((l) => l.trim());
  assert.strictEqual(lines.length, 1);
  const entry = JSON.parse(lines[0]);
  assert.strictEqual(entry.summary, "Test Redaction");
  assert.deepStrictEqual(entry.entities, ["SecretEv"]);
  assert.ok(entry.state, "log entry should carry a state snapshot");
  assert.ok(entry.state.entities["SecretEv"], "snapshot should include just-saved entity");
});

test("Phase 7: Description secret redaction on entity and concept", async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "cortex-phase7-desc-redact-"));
  const km = new KnowledgeManager(tmpDir);
  await km.init();

  const synthesis = {
    summary: "Test description redaction",
    entities: [
      {
        name: "SecretDescEntity",
        action: "create" as const,
        description: "This is a secret key: sk_test_51NzHomelyHubSecretKey999xyz inline.",
        relationships: [],
      },
    ],
    concepts: [
      {
        name: "SecretDescConcept",
        description: "Concept containing Stripe key: sk_test_5NzHomelyHubSecretKey999xyz in text.",
      },
    ],
    warnings: [] as string[],
  };

  await km.saveSynthesis(synthesis);
  const state = JSON.parse(await fs.readFile(path.join(tmpDir, ".knowledge", "state.json"), "utf8"));
  
  const savedEntity = state.entities["SecretDescEntity"];
  assert.match(savedEntity.description, /redacted by Cortex/);
  assert.doesNotMatch(savedEntity.description, /sk_test_51NzHomelyHubSecretKey999xyz/);

  const savedConcept = state.concepts["SecretDescConcept"];
  assert.match(savedConcept.description, /redacted by Cortex/);
  assert.doesNotMatch(savedConcept.description, /sk_test_5NzHomelyHubSecretKey999xyz/);

  assert.ok(synthesis.warnings.length > 0, "should push warnings for redacted description");
});

test("Phase 7: Stronger secret redaction patterns", async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "cortex-phase7-secret-"));
  const km = new KnowledgeManager(tmpDir);
  await km.init();

  const cases: Array<{ label: string; content: string; mustRedact: RegExp[] }> = [
    {
      label: "Authorization Bearer header (unquoted)",
      content: "Authorization: Bearer abc123xyz",
      mustRedact: [/abc123xyz/],
    },
    {
      label: "env-style AWS secret",
      content: "AWS_SECRET_ACCESS_KEY=AKIA1234567890ABCDEF",
      mustRedact: [/AKIA1234567890ABCDEF/],
    },
    {
      label: "JWT triplet",
      content: "const t = 'eyJhbGciOIJIUzI.eyJzdWIiOIJ.SflKxwRJSMeKKF';",
      mustRedact: [/eyJhbGciOIJIUzI/],
    },
  ];

  for (const c of cases) {
    await km.saveSynthesis({
      summary: c.label,
      entities: [
        {
          name: `Sec_${c.label.replace(/\W/g, "_")}`,
          action: "create" as const,
          description: "x",
          relationships: [],
          evidence: [{ sourceFile: "x.ts", content: c.content }],
        },
      ],
      concepts: [],
      warnings: [],
    });
  }

  const state = JSON.parse(await fs.readFile(path.join(tmpDir, ".knowledge", "state.json"), "utf8"));
  for (const c of cases) {
    const ev = state.entities[`Sec_${c.label.replace(/\W/g, "_")}`].evidence[0];
    for (const re of c.mustRedact) {
      assert.doesNotMatch(ev.content, re, `${c.label}: should redact ${re}`);
    }
    assert.match(ev.content, /redacted by Cortex/);
  }
});

test("Phase 7: Lint checks — cycle + orphan", async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "cortex-phase7-lint-"));
  const km = new KnowledgeManager(tmpDir);
  await km.init();

  await km.saveSynthesis({
    summary: "Setup",
    entities: [
      { name: "A", action: "create", description: "A", relationships: [{ target: "B", kind: "depends_on" }] },
      { name: "B", action: "create", description: "B", relationships: [{ target: "A", kind: "depends_on" }] },
      { name: "Orphan", action: "create", description: "O", relationships: [] },
    ],
    concepts: [],
    warnings: [],
  });

  const lm = new LintManager(tmpDir);
  const results = await lm.lint();
  const rules = results.map((r) => r.rule);
  assert.ok(rules.includes("cycle"));
  assert.ok(rules.includes("orphan"));

  // Cycle dedupe: A→B→A should produce exactly one cycle finding, not two.
  const cycles = results.filter((r) => r.rule === "cycle");
  assert.strictEqual(cycles.length, 1, "cycle should be reported exactly once");
});

test("Phase 7: Orphan check honors non-usage edges (supports / derived_from)", async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "cortex-phase7-orphan-"));
  const km = new KnowledgeManager(tmpDir);
  await km.init();

  await km.saveSynthesis({
    summary: "Doc-only edges",
    entities: [
      { name: "Claim", action: "create", description: "x", relationships: [{ target: "Evidence", kind: "supports" }] },
      { name: "Evidence", action: "create", description: "y", relationships: [] },
    ],
    concepts: [],
    warnings: [],
  });

  const lm = new LintManager(tmpDir);
  const results = await lm.lint();
  const orphans = results.filter((r) => r.rule === "orphan").map((r) => r.entity);
  assert.ok(!orphans.includes("Claim"), "Claim has outbound 'supports' — not an orphan");
  assert.ok(!orphans.includes("Evidence"), "Evidence has inbound 'supports' — not an orphan");
});

test("Phase 7: Silo detection flags equal-sized components on a 3-component graph", async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "cortex-phase7-silo-"));
  const km = new KnowledgeManager(tmpDir);
  await km.init();

  // Three disjoint 2-node components: (A-B), (C-D), (E-F)
  await km.saveSynthesis({
    summary: "3 silos",
    entities: [
      { name: "A", action: "create", description: "", relationships: [{ target: "B", kind: "depends_on" }] },
      { name: "B", action: "create", description: "", relationships: [] },
      { name: "C", action: "create", description: "", relationships: [{ target: "D", kind: "depends_on" }] },
      { name: "D", action: "create", description: "", relationships: [] },
      { name: "E", action: "create", description: "", relationships: [{ target: "F", kind: "depends_on" }] },
      { name: "F", action: "create", description: "", relationships: [] },
    ],
    concepts: [],
    warnings: [],
  });

  const lm = new LintManager(tmpDir);
  const results = await lm.lint();
  const silos = results.filter((r) => r.rule === "silo");
  // All three components tie at size 2; with 3+ components tied at max, flag all.
  assert.strictEqual(silos.length, 3, `expected 3 silo findings, got ${silos.length}`);
});

test("Phase 7: god_module threshold respects CORTEX_GOD_MODULE_THRESHOLD env", async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "cortex-phase7-god-"));
  const km = new KnowledgeManager(tmpDir);
  await km.init();

  // Hub depends on 4 targets — under default threshold of 10 but over 3.
  const targets = ["X", "Y", "Z", "W"];
  await km.saveSynthesis({
    summary: "fan-out",
    entities: [
      ...targets.map((n) => ({ name: n, action: "create" as const, description: "", relationships: [] })),
      { name: "Hub", action: "create", description: "", relationships: targets.map((t) => ({ target: t, kind: "depends_on" as const })) },
    ],
    concepts: [],
    warnings: [],
  });

  const lm = new LintManager(tmpDir);
  const defaultResults = await lm.lint();
  assert.ok(!defaultResults.some((r) => r.rule === "god_module"), "default threshold (10) shouldn't flag fan-out of 4");

  process.env.CORTEX_GOD_MODULE_THRESHOLD = "3";
  try {
    const tunedResults = await lm.lint();
    const god = tunedResults.find((r) => r.rule === "god_module");
    assert.ok(god, "lowered threshold should flag fan-out of 4");
    assert.strictEqual(god?.entity, "Hub");
  } finally {
    delete process.env.CORTEX_GOD_MODULE_THRESHOLD;
  }
});

test("Phase 7: JSONL Backfill", async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "cortex-phase7-backfill-"));
  const knowledgeDir = path.join(tmpDir, ".knowledge");
  await fs.mkdir(knowledgeDir, { recursive: true });

  const legacyMd = `
## [2024-01-01T00:00:00.000Z]
**Summary:** Legacy summary
**Impacted:** [[OldEntity]]
**Warnings:** None
---
`;
  await fs.writeFile(path.join(knowledgeDir, "log.md"), legacyMd);

  const km = new KnowledgeManager(tmpDir);
  await km.init();

  const logContent = await fs.readFile(path.join(knowledgeDir, "log.jsonl"), "utf8");
  const lines = logContent.split("\n").filter((l) => l.trim());
  assert.strictEqual(lines.length, 1);
  const entry = JSON.parse(lines[0]);
  assert.strictEqual(entry.summary, "Legacy summary");
  assert.deepStrictEqual(entry.entities, ["OldEntity"]);
  assert.strictEqual(entry.migrated, true);
});

test("Phase 7: queryLog survives corrupt JSONL lines", async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "cortex-phase7-corrupt-"));
  const knowledgeDir = path.join(tmpDir, ".knowledge");
  await fs.mkdir(knowledgeDir, { recursive: true });

  const goodLine = JSON.stringify({
    timestamp: "2025-01-01T00:00:00.000Z",
    summary: "ok",
    entities: ["E"],
    concepts: [],
    warnings: [],
  });
  // Corrupt line in the middle — must not blow up the whole query.
  await fs.writeFile(
    path.join(knowledgeDir, "log.jsonl"),
    goodLine + "\n" + "{not valid json}\n" + goodLine + "\n",
  );

  const am = new AuditManager(tmpDir);
  const entries = await am.queryLog({});
  assert.strictEqual(entries.length, 2, "should skip corrupt line, keep valid ones");
});

test("Phase 7: queryLog --warningsOnly filter", async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "cortex-phase7-warnonly-"));
  const km = new KnowledgeManager(tmpDir);
  await km.init();

  await km.saveSynthesis({
    summary: "Clean save",
    entities: [{ name: "Clean", action: "create", description: "x", relationships: [] }],
    concepts: [],
    warnings: [],
  });
  await km.saveSynthesis({
    summary: "Noisy save",
    entities: [{ name: "Noisy", action: "create", description: "y", relationships: [] }],
    concepts: [],
    warnings: ["had a problem"],
  });

  const am = new AuditManager(tmpDir);
  const warningsOnly = await am.queryLog({ warningsOnly: true });
  assert.strictEqual(warningsOnly.length, 1);
  assert.strictEqual(warningsOnly[0].summary, "Noisy save");
});

test("Phase 7: queryLog --since filter (ISO date)", async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "cortex-phase7-since-"));
  const knowledgeDir = path.join(tmpDir, ".knowledge");
  await fs.mkdir(knowledgeDir, { recursive: true });
  const lines = [
    JSON.stringify({ timestamp: "2024-01-01T00:00:00.000Z", summary: "old", entities: [], concepts: [], warnings: [] }),
    JSON.stringify({ timestamp: "2026-01-01T00:00:00.000Z", summary: "new", entities: [], concepts: [], warnings: [] }),
  ];
  await fs.writeFile(path.join(knowledgeDir, "log.jsonl"), lines.join("\n") + "\n");

  const am = new AuditManager(tmpDir);
  const recent = await am.queryLog({ since: "2025-06-01" });
  assert.strictEqual(recent.length, 1);
  assert.strictEqual(recent[0].summary, "new");
});

test("Phase 7: queryLog --since with invalid token does NOT silently pass everything", async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "cortex-phase7-since-bad-"));
  const knowledgeDir = path.join(tmpDir, ".knowledge");
  await fs.mkdir(knowledgeDir, { recursive: true });
  const lines = [
    JSON.stringify({ timestamp: "2024-01-01T00:00:00.000Z", summary: "old", entities: [], concepts: [], warnings: [] }),
    JSON.stringify({ timestamp: "2026-01-01T00:00:00.000Z", summary: "new", entities: [], concepts: [], warnings: [] }),
  ];
  await fs.writeFile(path.join(knowledgeDir, "log.jsonl"), lines.join("\n") + "\n");

  const am = new AuditManager(tmpDir);
  // Bogus token that's neither a date nor a real commit hash in this throwaway dir.
  // Filter must be skipped — but a warning is printed (we don't assert the warning to keep the test quiet).
  const all = await am.queryLog({ since: "not-a-real-token-xyz" });
  // Behavior: filter ignored, both entries returned (with stderr warning).
  assert.strictEqual(all.length, 2);
});

test("Phase 7: Evidence drift — lineRange tolerant of small edits, catches large changes", async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "cortex-phase7-drift-"));
  const km = new KnowledgeManager(tmpDir);
  await km.init();

  // Write a source file the evidence will point at.
  const src = "function authenticate(user) {\n  return user.token === 'xyz';\n}\n";
  await fs.writeFile(path.join(tmpDir, "auth.ts"), src);

  await km.saveSynthesis({
    summary: "anchor",
    entities: [
      {
        name: "Auth",
        action: "create",
        description: "auth fn",
        relationships: [],
        sourceFile: "auth.ts",
        evidence: [
          {
            sourceFile: "auth.ts",
            lineRange: [1, 3],
            content: src.trimEnd(),
          },
        ],
      },
    ],
    concepts: [],
    warnings: [],
  });

  const am = new AuditManager(tmpDir);
  let issues = await am.auditEvidence();
  assert.strictEqual(issues.length, 0, "fresh anchor should not drift");

  // Tiny edit — rename a local var. Should NOT trigger drift (within tolerance).
  const tinyEdit = src.replace("user.token", "u.token");
  await fs.writeFile(path.join(tmpDir, "auth.ts"), tinyEdit);
  issues = await am.auditEvidence();
  assert.strictEqual(issues.length, 0, "tiny edit (within edit-distance tolerance) should not drift");

  // Big edit — replace the function body wholesale.
  const bigEdit = "function authenticate() {\n  throw new Error('not implemented');\n}\n";
  await fs.writeFile(path.join(tmpDir, "auth.ts"), bigEdit);
  issues = await am.auditEvidence();
  assert.strictEqual(issues.length, 1);
  assert.strictEqual(issues[0].issue, "drift-content-changed");

  // File deletion — drift-source-missing.
  await fs.unlink(path.join(tmpDir, "auth.ts"));
  issues = await am.auditEvidence();
  assert.strictEqual(issues.length, 1);
  assert.strictEqual(issues[0].issue, "drift-source-missing");
});

test("Phase 7: Evolution replay reconstructs index at a past cutoff (state snapshot)", async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "cortex-phase7-replay-"));
  const km = new KnowledgeManager(tmpDir);
  await km.init();

  await km.saveSynthesis({
    summary: "v1",
    entities: [{ name: "Auth", action: "create", description: "v1 auth", relationships: [] }],
    concepts: [],
    warnings: [],
  });
  await new Promise((r) => setTimeout(r, 10));
  const t2 = new Date().toISOString();
  await new Promise((r) => setTimeout(r, 10));
  await km.saveSynthesis({
    summary: "v2",
    entities: [
      { name: "Auth", action: "update", description: "v2 auth", relationships: [] },
      { name: "Session", action: "create", description: "sessions", relationships: [] },
    ],
    concepts: [],
    warnings: [],
  });

  const em = new EvolutionManager(tmpDir);
  const replay = await em.replayAt(t2);
  assert.ok(replay.hasSnapshot, "should find a snapshot at cutoff");
  assert.strictEqual(replay.entryCount, 1, "exactly the v1 save is in range");
  assert.ok(replay.state?.entities["Auth"], "Auth present at v1 cutoff");
  assert.strictEqual(replay.state?.entities["Auth"].description, "v1 auth");
  assert.ok(!replay.state?.entities["Session"], "Session not yet created at cutoff");
  assert.match(replay.index, /v1 auth/);
});
