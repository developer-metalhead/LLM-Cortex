import { KnowledgeManager } from "../knowledge/writer.js";
import { AuditManager } from "../knowledge/audit.js";
import { formatScore, readQualityGate } from "../knowledge/quality.js";

// Returns exit code: 0 = no findings, 1 = stale entities present.
export async function runAuditStale(projectRoot: string): Promise<number> {
  const km = new KnowledgeManager(projectRoot);
  if (!(await km.exists())) {
    console.log("Knowledge base not initialized. Run `cortex init` first.");
    return 0;
  }

  const staleEntities = await km.getStaleEntities();
  if (staleEntities.length === 0) {
    console.log("✅ No stale entities found.");
    return 0;
  }

  console.log(`⚠️  Found ${staleEntities.length} stale entities:\n`);
  for (const entity of staleEntities) {
    const safeName = entity.name.replace(/[/\\:*?"<>|]/g, "_");
    console.log(`- ${entity.name}`);
    console.log(`  Stale since: ${entity.staleSince}`);
    if (entity.sourceFile) console.log(`  Source: ${entity.sourceFile}`);
    console.log(`  File: .knowledge/entities/${safeName}.md\n`);
  }

  console.log("To resolve, review these entities and update them via the AI agent (e.g. `/ingest_cortex`).");
  return 1;
}

// Returns exit code: 0 = no findings, 1 = evidence drift present.
export async function runAuditEvidence(projectRoot: string): Promise<number> {
  const am = new AuditManager(projectRoot);
  const issues = await am.auditEvidence();

  if (issues.length === 0) {
    console.log("✅ No evidence drift detected.");
    return 0;
  }

  console.log(`⚠️  Found ${issues.length} evidence issues:\n`);
  for (const issue of issues) {
    console.log(`- ${issue.entity}: ${issue.issue}`);
    console.log(`  Source: ${issue.sourceFile}`);
    if (issue.detail) console.log(`  Detail: ${issue.detail}`);
    console.log("");
  }
  return 1;
}

// Phase 7.5 — rank entities by quality score ascending, flag the bottom
// decile, return exit code 1 if any entity falls below CORTEX_QUALITY_GATE
// (default 0.5). Used as a CI gate alongside `cortex lint`.
export async function runAuditQuality(projectRoot: string): Promise<number> {
  const km = new KnowledgeManager(projectRoot);
  if (!(await km.exists())) {
    console.log("Knowledge base not initialized. Run `cortex init` first.");
    return 0;
  }

  const rows = await km.listEntityQuality();
  if (rows.length === 0) {
    console.log("No entities to evaluate. Knowledge base is empty.");
    return 0;
  }

  const gate = readQualityGate();
  const below = rows.filter((r) => r.breakdown.score < gate);
  const decileSize = Math.max(1, Math.floor(rows.length / 10));
  const bottomDecile = new Set(rows.slice(0, decileSize).map((r) => r.name));

  console.log(`Quality audit — ${rows.length} entities · gate ${formatScore(gate)} · bottom decile flagged ⬇️\n`);
  for (const row of rows) {
    const b = row.breakdown;
    const flag = bottomDecile.has(row.name) ? " ⬇️" : "";
    const fail = b.score < gate ? " ❌" : "";
    const source = row.sourceFile ? ` — \`${row.sourceFile}\`` : "";
    console.log(`${formatScore(b.score).padStart(4)}  ${row.name}${source}${flag}${fail}`);
    console.log(
      `       evidence ${formatScore(b.evidenceFreshness)} · ` +
      `contradictions ${formatScore(b.contradiction)} · ` +
      `staleness ${formatScore(b.staleness)} · ` +
      `age ${formatScore(b.age)} · ` +
      `human-review ${formatScore(b.humanReview)}`,
    );
  }

  console.log("");
  if (below.length === 0) {
    console.log(`✅ All ${rows.length} entities meet the quality gate (${formatScore(gate)}).`);
    return 0;
  }
  console.log(`❌ ${below.length}/${rows.length} entit${below.length === 1 ? "y is" : "ies are"} below the quality gate (${formatScore(gate)}).`);
  return 1;
}
