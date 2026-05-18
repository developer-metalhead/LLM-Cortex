// Phase 7.5 — Org-Wide Custom Constraint Language.
//
// Loads `cortex.constraints.json` from the project root and evaluates each
// rule against either a single synthesis (at save time) or the entire
// state.json (for `cortex lint`).
//
// JSON (not YAML) was chosen deliberately:
//   - Zero external dependencies (Node's built-in JSON.parse)
//   - Consistent with the rest of Cortex storage (state.json, log.jsonl)
//   - Stricter type semantics (YAML's `yes`/`01`/`date` auto-coercion is a footgun)
//   - Clearer parse errors at exact byte offsets
// Comments are provided via the per-constraint `description` field, which is
// the natural place for human prose about what each rule enforces.
//
// Schema (cortex.constraints.json):
//   {
//     "version": 1,
//     "constraints": [
//       {
//         "id": "<unique-id>",
//         "description": "<human prose explaining what this enforces>",
//         "rule": {
//           "sourcePattern": "<glob>",        // filters which entities the rule applies to
//           "tag": "<string>",                // alternative filter by entity tag (Phase 23+)
//           "mustNotImport": "<glob|glob[]>", // forbidden relationship target patterns
//           "requiresEvidence": true,         // entity must have ≥1 evidence entry
//           "requiresConstraint": "<kind>"    // entity must declare a constraint of this kind
//         },
//         "severity": "error" | "warning"
//       }
//     ]
//   }
//
// Design:
//   - Error severity throws `Org Constraint Violation:` during saveSynthesis,
//     identical exception shape to Phase 6 per-entity constraints. The MCP
//     server catches both via the same handler.
//   - Warning severity surfaces via cortex lint (org_constraint rule category).
//   - Globs use a small bespoke matcher (** matches any path, * matches any
//     segment chars except /). No external dep — keeps the constraint loader
//     tree-shake friendly.
//
// YAML fallback: if cortex.constraints.yaml exists instead of .json, the
// loader emits a clear error pointing the user at the JSON migration path.
// We don't ship a YAML parser to keep the dep footprint at zero.

import fs from "fs";
import path from "path";

// ──────────────────────────────────────────────────────────────────────
// Schema types — kept loose at parse time, validated explicitly.
// ──────────────────────────────────────────────────────────────────────

export type Severity = "error" | "warning";

export interface OrgConstraintRule {
  sourcePattern?: string;
  tag?: string;
  mustNotImport?: string | string[];
  requiresEvidence?: boolean;
  requiresConstraint?: string;
}

export interface OrgConstraint {
  id: string;
  description?: string;
  rule: OrgConstraintRule;
  severity: Severity;
}

export interface OrgConstraintFile {
  version: number;
  constraints: OrgConstraint[];
}

export interface OrgConstraintViolation {
  constraintId: string;
  description?: string;
  severity: Severity;
  entity: string;
  reason: string;
}

// ──────────────────────────────────────────────────────────────────────
// Glob matcher — minimal, deterministic.
//   '**' matches any number of path segments
//   '*'  matches any chars except '/'
//   anything else is literal
// Single-pattern matcher; arrays handled by the caller (any-match).
// ──────────────────────────────────────────────────────────────────────

export function globToRegExp(glob: string): RegExp {
  let re = "^";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*") {
      if (glob[i + 1] === "*") {
        // '**' segment — match anything, including '/'
        re += ".*";
        i++;
      } else {
        // '*' — match anything except '/'
        re += "[^/]*";
      }
    } else if ("()[]{}+.?\\^$|".indexOf(c) >= 0) {
      re += "\\" + c;
    } else {
      re += c;
    }
  }
  re += "$";
  return new RegExp(re);
}

export function globMatch(glob: string, value: string): boolean {
  return globToRegExp(glob).test(value);
}

export function anyGlobMatch(globs: string | string[] | undefined, value: string): boolean {
  if (!globs) return false;
  const list = Array.isArray(globs) ? globs : [globs];
  for (const g of list) if (globMatch(g, value)) return true;
  return false;
}

// ──────────────────────────────────────────────────────────────────────
// Loader — looks for cortex.constraints.json at the project root. Returns
// null if file is absent (org constraints are opt-in). Throws on parse /
// schema failures so the user gets a clear message rather than silent
// degradation. If a legacy .yaml/.yml file is found instead, emit a clear
// migration error rather than failing with a confusing JSON parse error.
// ──────────────────────────────────────────────────────────────────────

const PRIMARY_FILE = "cortex.constraints.json";
const LEGACY_YAML_FILES = ["cortex.constraints.yaml", "cortex.constraints.yml"];

export function loadOrgConstraints(projectRoot: string): OrgConstraintFile | null {
  const primaryPath = path.join(projectRoot, PRIMARY_FILE);
  if (fs.existsSync(primaryPath)) {
    const raw = fs.readFileSync(primaryPath, "utf8");
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch (err: any) {
      throw new Error(`Failed to parse ${PRIMARY_FILE}: ${err.message}`);
    }
    return validateFile(parsed, PRIMARY_FILE);
  }

  // Helpful redirect for users who have a leftover YAML file.
  for (const legacy of LEGACY_YAML_FILES) {
    if (fs.existsSync(path.join(projectRoot, legacy))) {
      throw new Error(
        `Found ${legacy} but Cortex uses ${PRIMARY_FILE} (JSON). Convert your file: ` +
        `the shape is identical, just JSON syntax. See docs for the schema.`,
      );
    }
  }

  return null;
}

function validateFile(obj: any, source: string): OrgConstraintFile {
  if (!obj || typeof obj !== "object") {
    throw new Error(`${source}: root must be an object with 'version' and 'constraints'`);
  }
  if (obj.version !== 1) {
    throw new Error(`${source}: unsupported version '${obj.version}' (expected 1)`);
  }
  if (!Array.isArray(obj.constraints)) {
    throw new Error(`${source}: 'constraints' must be an array`);
  }
  const constraints: OrgConstraint[] = [];
  const seenIds = new Set<string>();
  for (const [idx, c] of obj.constraints.entries()) {
    if (!c || typeof c !== "object") {
      throw new Error(`${source}: constraint[${idx}] must be an object`);
    }
    if (typeof c.id !== "string" || !c.id.trim()) {
      throw new Error(`${source}: constraint[${idx}].id must be a non-empty string`);
    }
    if (seenIds.has(c.id)) {
      throw new Error(`${source}: duplicate constraint id '${c.id}'`);
    }
    seenIds.add(c.id);
    if (!c.rule || typeof c.rule !== "object") {
      throw new Error(`${source}: constraint[${idx}] '${c.id}': rule must be an object`);
    }
    const severity: Severity = c.severity === "warning" ? "warning" : c.severity === "error" ? "error" : "error";
    constraints.push({
      id: c.id,
      description: typeof c.description === "string" ? c.description : undefined,
      rule: {
        sourcePattern: typeof c.rule.sourcePattern === "string" ? c.rule.sourcePattern : undefined,
        tag: typeof c.rule.tag === "string" ? c.rule.tag : undefined,
        mustNotImport: c.rule.mustNotImport,
        requiresEvidence: c.rule.requiresEvidence === true,
        requiresConstraint: typeof c.rule.requiresConstraint === "string" ? c.rule.requiresConstraint : undefined,
      },
      severity,
    });
  }
  return { version: 1, constraints };
}

// ──────────────────────────────────────────────────────────────────────
// Evaluator — runs each constraint against each entity-like record. Used
// both at save-time (over a Synthesis batch + merged state) and at lint
// time (over the full state).
//
// Entity here is the writer's EntityRecord shape, but the evaluator only
// touches a small subset of fields (sourceFile, relationships, evidence,
// constraints, tags) — duck-typed for forward compat.
// ──────────────────────────────────────────────────────────────────────

export interface EvaluatableEntity {
  sourceFile?: string;
  relationships?: Array<{ target: string; kind: string }>;
  evidence?: Array<{ sourceFile: string }>;
  constraints?: {
    mustNotImport?: string[];
    mustNotBeCalledBy?: string[];
    contract?: string;
  };
  // Phase 23+ tags surface — optional today, always undefined until then.
  tags?: string[];
}

const USAGE_KINDS = new Set(["depends_on", "called_by"]);

export class OrgConstraintEvaluator {
  constructor(public readonly file: OrgConstraintFile) {}

  static load(projectRoot: string): OrgConstraintEvaluator | null {
    const file = loadOrgConstraints(projectRoot);
    if (!file) return null;
    return new OrgConstraintEvaluator(file);
  }

  // Returns true if this constraint's scope filter (sourcePattern OR tag)
  // matches the given entity. If no filter is declared, the constraint applies
  // globally to every entity.
  private appliesTo(constraint: OrgConstraint, _name: string, entity: EvaluatableEntity): boolean {
    const { sourcePattern, tag } = constraint.rule;
    if (!sourcePattern && !tag) return true;
    if (sourcePattern && entity.sourceFile && globMatch(sourcePattern, entity.sourceFile)) return true;
    if (tag && entity.tags && entity.tags.includes(tag)) return true;
    return false;
  }

  private evaluateOne(
    constraint: OrgConstraint,
    name: string,
    entity: EvaluatableEntity,
  ): OrgConstraintViolation | null {
    if (!this.appliesTo(constraint, name, entity)) return null;

    const { rule } = constraint;

    // mustNotImport: any relationship of usage-kind whose target matches the glob
    // (or — for explicit string-target globs against sourceFile) is forbidden.
    if (rule.mustNotImport) {
      for (const rel of entity.relationships ?? []) {
        if (!USAGE_KINDS.has(rel.kind)) continue;
        if (anyGlobMatch(rule.mustNotImport, rel.target)) {
          return mkViolation(
            constraint,
            name,
            `imports '${rel.target}' which matches forbidden pattern '${Array.isArray(rule.mustNotImport) ? rule.mustNotImport.join("|") : rule.mustNotImport}'`,
          );
        }
      }
    }

    if (rule.requiresEvidence) {
      const hasEvidence = !!entity.evidence && entity.evidence.length > 0;
      if (!hasEvidence) {
        return mkViolation(constraint, name, `requires at least one evidence entry, none found`);
      }
    }

    if (rule.requiresConstraint) {
      const declared = entity.constraints;
      if (!declared) {
        return mkViolation(
          constraint,
          name,
          `requires a '${rule.requiresConstraint}' constraint, but no constraints are declared`,
        );
      }
      const has = isConstraintKindDeclared(declared, rule.requiresConstraint);
      if (!has) {
        return mkViolation(
          constraint,
          name,
          `requires a '${rule.requiresConstraint}' constraint, but it is not declared`,
        );
      }
    }

    return null;
  }

  // Evaluate every constraint against every entity in the given map.
  // Used by cortex lint AND by saveSynthesis (after the Phase 6 per-entity pass).
  evaluateAll(entities: Record<string, EvaluatableEntity>): OrgConstraintViolation[] {
    const out: OrgConstraintViolation[] = [];
    for (const [name, entity] of Object.entries(entities)) {
      for (const c of this.file.constraints) {
        const v = this.evaluateOne(c, name, entity);
        if (v) out.push(v);
      }
    }
    return out;
  }

  // Helpers for save_synthesis path — partition by severity so the writer can
  // throw on errors and forward warnings to synthesis.warnings.
  splitBySeverity(violations: OrgConstraintViolation[]): {
    errors: OrgConstraintViolation[];
    warnings: OrgConstraintViolation[];
  } {
    return {
      errors: violations.filter((v) => v.severity === "error"),
      warnings: violations.filter((v) => v.severity === "warning"),
    };
  }
}

function isConstraintKindDeclared(
  declared: NonNullable<EvaluatableEntity["constraints"]>,
  kind: string,
): boolean {
  if (kind === "contract") return typeof declared.contract === "string" && declared.contract.trim().length > 0;
  if (kind === "mustNotImport") return Array.isArray(declared.mustNotImport) && declared.mustNotImport.length > 0;
  if (kind === "mustNotBeCalledBy") return Array.isArray(declared.mustNotBeCalledBy) && declared.mustNotBeCalledBy.length > 0;
  return false;
}

function mkViolation(
  constraint: OrgConstraint,
  entity: string,
  reason: string,
): OrgConstraintViolation {
  return {
    constraintId: constraint.id,
    description: constraint.description,
    severity: constraint.severity,
    entity,
    reason,
  };
}

// Convenience: throw a structured error if any violations are severity=error.
// The MCP server catches messages starting with "Org Constraint Violation:" the
// same way it catches Phase 6 "Constraint Violation:" errors.
export function throwOnErrors(violations: OrgConstraintViolation[]): void {
  const errors = violations.filter((v) => v.severity === "error");
  if (errors.length === 0) return;
  const summary = errors
    .map((v) => `[${v.constraintId}] ${v.entity}: ${v.reason}`)
    .join("; ");
  throw new Error(`Org Constraint Violation: ${summary}`);
}
