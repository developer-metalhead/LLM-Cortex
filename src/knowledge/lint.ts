import fs from "fs/promises";
import path from "path";
import { OrgConstraintEvaluator, EvaluatableEntity } from "./org-constraints.js";

export interface LintResult {
  rule: string;
  severity: "error" | "warning";
  message: string;
  entity?: string;
}

const USAGE_KINDS = new Set(["depends_on", "called_by"]);
const ALL_RELATIONSHIP_KINDS = new Set([
  "depends_on",
  "called_by",
  "supports",
  "contradicts",
  "derived_from",
  "parent_of",
]);

function getGodModuleThreshold(): number {
  const raw = process.env.CORTEX_GOD_MODULE_THRESHOLD;
  if (!raw) return 10;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 10;
}

export class LintManager {
  private knowledgeDir: string;
  private projectRoot: string;

  constructor(rootDir: string) {
    this.projectRoot = rootDir;
    this.knowledgeDir = path.join(rootDir, ".knowledge");
  }

  async lint(): Promise<LintResult[]> {
    const statePath = path.join(this.knowledgeDir, "state.json");
    const results: LintResult[] = [];
    let state: any;
    try {
      state = JSON.parse(await fs.readFile(statePath, "utf8"));
    } catch {
      return results;
    }
    const entities = state.entities || {};

    // Two graph projections:
    //   - usageGraph: only depends_on/called_by — used for cycle, god_module
    //   - fullGraph: every relationship kind — used for orphan + silo so that
    //     a node linked via `supports` or `derived_from` is not a false-positive
    const usageGraph: Record<string, string[]> = {};
    const usageReverse: Record<string, string[]> = {};
    const fullGraph: Record<string, string[]> = {};
    const fullReverse: Record<string, string[]> = {};
    for (const name of Object.keys(entities)) {
      usageGraph[name] = [];
      usageReverse[name] = [];
      fullGraph[name] = [];
      fullReverse[name] = [];
    }
    for (const [name, entity] of Object.entries<any>(entities)) {
      if (!entity.relationships) continue;
      for (const rel of entity.relationships) {
        if (!ALL_RELATIONSHIP_KINDS.has(rel.kind)) continue;
        fullGraph[name].push(rel.target);
        if (!fullReverse[rel.target]) fullReverse[rel.target] = [];
        fullReverse[rel.target].push(name);
        if (USAGE_KINDS.has(rel.kind)) {
          usageGraph[name].push(rel.target);
          if (!usageReverse[rel.target]) usageReverse[rel.target] = [];
          usageReverse[rel.target].push(name);
        }
      }
    }

    // Missing source file
    for (const [name, entity] of Object.entries<any>(entities)) {
      if (!entity.sourceFile) continue;
      try {
        await fs.access(path.join(this.projectRoot, entity.sourceFile));
      } catch {
        results.push({
          rule: "missing_source",
          severity: "error",
          entity: name,
          message: `Source file '${entity.sourceFile}' is missing.`,
        });
      }
    }

    // Orphans — no inbound or outbound edges across ANY relationship kind.
    for (const name of Object.keys(entities)) {
      if ((fullGraph[name]?.length ?? 0) === 0 && (fullReverse[name]?.length ?? 0) === 0) {
        results.push({
          rule: "orphan",
          severity: "warning",
          entity: name,
          message: `Entity '${name}' is an orphan (no inbound or outbound relationships).`,
        });
      }
    }

    // Cycles — DFS over the usage graph, dedupe by canonical member set.
    const reportedCycles = new Set<string>();
    const visited = new Set<string>();
    const stack = new Set<string>();
    const stackList: string[] = [];
    const detectCycle = (node: string) => {
      if (stack.has(node)) {
        // Extract the cycle (from where node first appears in the stack).
        const startIdx = stackList.indexOf(node);
        if (startIdx >= 0) {
          const members = stackList.slice(startIdx);
          const key = [...members].sort().join("|");
          if (!reportedCycles.has(key)) {
            reportedCycles.add(key);
            results.push({
              rule: "cycle",
              severity: "error",
              entity: members[0],
              message: `Cycle detected: ${members.join(" -> ")} -> ${node}`,
            });
          }
        }
        return;
      }
      if (visited.has(node)) return;
      visited.add(node);
      stack.add(node);
      stackList.push(node);
      for (const neighbor of usageGraph[node] || []) {
        detectCycle(neighbor);
      }
      stack.delete(node);
      stackList.pop();
    };
    for (const name of Object.keys(usageGraph)) {
      if (!visited.has(name)) detectCycle(name);
    }

    // God modules — threshold from CORTEX_GOD_MODULE_THRESHOLD env (default 10).
    const godThreshold = getGodModuleThreshold();
    for (const [name, edges] of Object.entries(usageGraph)) {
      if (edges.length > godThreshold) {
        results.push({
          rule: "god_module",
          severity: "warning",
          entity: name,
          message: `Entity '${name}' has ${edges.length} outbound dependencies (threshold: ${godThreshold}).`,
        });
      }
    }

    // Contradiction-heavy
    for (const [name] of Object.entries<any>(entities)) {
      let contradicts = 0;
      let supports = 0;
      for (const other of Object.values<any>(entities)) {
        if (!other.relationships) continue;
        for (const r of other.relationships) {
          if (r.target !== name) continue;
          if (r.kind === "contradicts") contradicts++;
          if (r.kind === "supports") supports++;
        }
      }
      if (contradicts > 0 && contradicts > supports) {
        results.push({
          rule: "contradiction_heavy",
          severity: "warning",
          entity: name,
          message: `Entity '${name}' has more inbound contradicts (${contradicts}) than supports (${supports}).`,
        });
      }
    }

    // Silos — connected components over the FULL graph (any relationship
    // kind). Flag every non-largest non-trivial component; ties for largest
    // are flagged too (so two equal 5-node clusters both surface).
    const components: Set<string>[] = [];
    const ccVisited = new Set<string>();
    for (const name of Object.keys(fullGraph)) {
      if (ccVisited.has(name)) continue;
      const component = new Set<string>();
      const q = [name];
      ccVisited.add(name);
      while (q.length > 0) {
        const curr = q.shift()!;
        component.add(curr);
        const neighbors = [
          ...(fullGraph[curr] || []),
          ...(fullReverse[curr] || []),
        ];
        for (const n of neighbors) {
          if (entities[n] && !ccVisited.has(n)) {
            ccVisited.add(n);
            q.push(n);
          }
        }
      }
      components.push(component);
    }
    if (components.length > 1) {
      const mainSize = Math.max(...components.map((c) => c.size));
      // If there's a clear largest, only flag the smaller ones. If multiple
      // components tie for largest AND there are 3+ components, flag all of
      // them — that's a genuinely fragmented graph.
      const tiedAtMax = components.filter((c) => c.size === mainSize).length;
      for (const c of components) {
        if (c.size < 2) continue;
        const isLargest = c.size === mainSize;
        const shouldFlag = !isLargest || (tiedAtMax > 1 && components.length >= 3);
        if (!shouldFlag) continue;
        results.push({
          rule: "silo",
          severity: "warning",
          message: `Disconnected knowledge silo detected with ${c.size} entities: ${Array.from(c).slice(0, 3).join(", ")}${c.size > 3 ? "..." : ""}`,
        });
      }
    }

    // Phase 7.5 — org-constraint violations surfaced as a separate rule
    // category. Failures of either severity are emitted; `error`-severity
    // violations don't reach this layer at save-time (saveSynthesis rejects
    // those), but lint runs over the current persisted state so it catches
    // anything that pre-dated the constraint file OR was loaded externally.
    try {
      const orgEvaluator = OrgConstraintEvaluator.load(this.projectRoot);
      if (orgEvaluator) {
        const evaluatable: Record<string, EvaluatableEntity> = {};
        for (const [name, entity] of Object.entries<any>(entities)) {
          evaluatable[name] = {
            sourceFile: entity.sourceFile,
            relationships: entity.relationships,
            evidence: entity.evidence,
            constraints: entity.constraints,
            tags: entity.tags,
          };
        }
        const violations = orgEvaluator.evaluateAll(evaluatable);
        for (const v of violations) {
          results.push({
            rule: "org_constraint",
            severity: v.severity,
            entity: v.entity,
            message: `[${v.constraintId}] ${v.reason}${v.description ? ` (${v.description})` : ""}`,
          });
        }
      }
    } catch (err: any) {
      // Constraint file present but malformed — surface as a lint warning
      // rather than aborting the whole lint pass.
      results.push({
        rule: "org_constraint",
        severity: "warning",
        message: `Failed to load cortex.constraints.json: ${err.message}`,
      });
    }

    return results;
  }
}
