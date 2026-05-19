import { KnowledgeManager } from "../knowledge/writer.js";
import { buildGraph, buildImpactReport, ImpactReport } from "../knowledge/graph.js";

export interface ImpactOptions {
  depth?: number;
  format?: "text" | "json";
  hypothetical?: "delete";
}

export async function runImpact(
  projectRoot: string,
  entityName: string,
  options: ImpactOptions = {},
): Promise<void> {
  const km = new KnowledgeManager(projectRoot);
  if (!(await km.exists())) {
    console.log("Knowledge base not initialized. Run `cortex init` first.");
    return;
  }
  const state = await km.getState();
  const graph = buildGraph(state);
  const report = buildImpactReport(graph, entityName, "inbound", options.depth ?? 10);

  if (options.format === "json") {
    if (options.hypothetical === "delete") {
      const direct = report.entries.filter((e) => e.hop === 1);
      console.log(JSON.stringify({ target: entityName, mode: "hypothetical-delete", broken: direct }, null, 2));
    } else {
      console.log(JSON.stringify(report, null, 2));
    }
    return;
  }

  if (report.totalCount === 0) {
    console.log(`No dependents found for "${entityName}". Safe to refactor freely.`);
    return;
  }

  if (options.hypothetical === "delete") {
    const direct = report.entries.filter((e) => e.hop === 1);
    console.log(`\nHypothetical delete of: ${entityName}\n`);
    console.log(`⚠  ${report.totalCount} entities would be affected (${direct.length} direct):\n`);
    const byHop = groupByHop(report);
    for (const [hop, entries] of byHop) {
      const label = hop === 1 ? "Hop 1 (direct — immediate breakage)" : `Hop ${hop}`;
      console.log(label);
      for (const e of entries) {
        const via = e.via ? `  via ${e.via}` : "";
        const badge = e.lowQuality ? "  ⚠ low-quality" : "";
        const stale = e.isStale ? "  [STALE]" : "";
        console.log(`  ${e.name.padEnd(36)} quality: ${e.qualityScore.toFixed(2)}${badge}${stale}${via}`);
      }
      console.log();
    }
    return;
  }

  console.log(`\nImpact report for: ${entityName}`);
  console.log(`Total dependents: ${report.totalCount}\n`);
  const byHop = groupByHop(report);
  for (const [hop, entries] of byHop) {
    const label = hop === 1 ? "Hop 1 (direct)" : `Hop ${hop}`;
    console.log(label);
    for (const e of entries) {
      const via = e.via ? `  via ${e.via}` : "";
      const badge = e.lowQuality ? "  ⚠ low-quality" : "";
      const stale = e.isStale ? "  [STALE]" : "";
      console.log(`  ${e.name.padEnd(36)} quality: ${e.qualityScore.toFixed(2)}${badge}${stale}${via}`);
    }
    console.log();
  }
}

export async function runDeps(
  projectRoot: string,
  entityName: string,
  options: ImpactOptions = {},
): Promise<void> {
  const km = new KnowledgeManager(projectRoot);
  if (!(await km.exists())) {
    console.log("Knowledge base not initialized. Run `cortex init` first.");
    return;
  }
  const state = await km.getState();
  const graph = buildGraph(state);
  const report = buildImpactReport(graph, entityName, "outbound", options.depth ?? 10);

  if (options.format === "json") {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  if (report.totalCount === 0) {
    console.log(`"${entityName}" has no outbound dependencies.`);
    return;
  }

  console.log(`\nDependencies of: ${entityName}`);
  console.log(`Total: ${report.totalCount}\n`);
  const byHop = groupByHop(report);
  for (const [hop, entries] of byHop) {
    const label = hop === 1 ? "Direct dependencies" : `Hop ${hop} (transitive)`;
    console.log(label);
    for (const e of entries) {
      const via = e.via ? `  via ${e.via}` : "";
      const badge = e.lowQuality ? "  ⚠ low-quality" : "";
      const stale = e.isStale ? "  [STALE]" : "";
      console.log(`  ${e.name.padEnd(36)} quality: ${e.qualityScore.toFixed(2)}${badge}${stale}${via}`);
    }
    console.log();
  }
}

function groupByHop(report: ImpactReport): Map<number, ImpactReport["entries"]> {
  const map = new Map<number, ImpactReport["entries"]>();
  for (const e of report.entries) {
    if (!map.has(e.hop)) map.set(e.hop, []);
    map.get(e.hop)!.push(e);
  }
  return new Map([...map.entries()].sort((a, b) => a[0] - b[0]));
}
