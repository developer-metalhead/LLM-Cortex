import fs from "fs/promises";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { Synthesis, SaveConcept, Relationship, FailedApproach, Constraints, Evidence } from "../llm/schema.js";
import { computeQuality, formatScore, readQualityGate, QualityBreakdown } from "./quality.js";
import { OrgConstraintEvaluator, throwOnErrors } from "./org-constraints.js";

const execAsync = promisify(exec);

const LAST_SYNC_FILE = ".last_sync_commit";
const STATE_FILE = "state.json";
const STATE_VERSION = 2;

// Only "actual-usage" relationships participate in constraint validation and
// blast-radius staleness propagation. `contradicts`, `supports`,
// `derived_from`, `parent_of` document relationships that don't represent
// runtime coupling.
const USAGE_KINDS = new Set<Relationship["kind"]>(["depends_on", "called_by"]);

type EntityRecord = {
  description: string;
  relationships: Relationship[];
  constraints?: Constraints;
  failedApproaches?: FailedApproach[];
  sourceFile?: string;
  evidence?: Evidence[];
  lastRefined: string;
  staleSince?: string;
  // Phase 7.5 — human-review facts (set by `cortex review accept`, used by
  // quality scoring). Optional; absence is treated as "not yet reviewed."
  human_reviewed?: boolean;
  reviewed_by?: string;
};

type ConceptRecord = {
  description: string;
  relationships?: Relationship[];
  failedApproaches?: FailedApproach[];
  lastRefined: string;
};

type KnowledgeState = {
  version: number;
  entities: Record<string, EntityRecord>;
  concepts: Record<string, ConceptRecord>;
};

function safeFilename(name: string): string {
  return name.replace(/[/\\:*?"<>|]/g, "_");
}

// Conservative best-effort secret scrubbing for evidence snippets. Safety net,
// not a security boundary — Cortex still warns and lists the file so the
// developer can audit. Patterns derived from common leak shapes (quoted &
// unquoted assignments, Authorization headers, AWS-style env keys, JWT
// triplets, long hex/base64 blobs preceded by a secret-ish identifier).
const SECRET_PATTERNS: RegExp[] = [
  // Quoted assignment: api_key: "...", secret = '...'
  /(api[_-]?key|secret|password|passwd|pwd|bearer|token|auth)\s*[:=]\s*['"][^'"\n]+['"]/gi,
  // Unquoted env-style: AWS_SECRET_ACCESS_KEY=AKIA..., TOKEN=abc
  /\b([A-Z][A-Z0-9_]*(?:KEY|SECRET|TOKEN|PASSWORD|PASSWD|PWD))\s*=\s*[^\s'";]+/g,
  // Authorization header: Authorization: Bearer xxx
  /Authorization\s*:\s*(Bearer|Basic|Token)\s+[^\s'"]+/gi,
  // JWT triplet (3 base64url segments separated by '.')
  /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,
  // Common provider prefixes (OpenAI, GitHub, Slack, AWS, Stripe)
  /\b(sk|pk|rk|xoxb|xoxp|xoxa|ghp|gho|ghs|github_pat|AKIA|ASIA|AIza)[_-]?[A-Za-z0-9_]{16,}\b/g,
  // PEM headers
  /-----BEGIN (?:RSA |DSA |EC |OPENSSH |PGP )?PRIVATE KEY-----[\s\S]*?-----END [^-]+-----/g,
];

export function redactSecrets(content: string): { redacted: string; didRedact: boolean } {
  let out = content;
  let didRedact = false;
  for (const re of SECRET_PATTERNS) {
    re.lastIndex = 0;
    const next = out.replace(re, "// [redacted by Cortex]");
    if (next !== out) {
      didRedact = true;
      out = next;
    }
  }
  return { redacted: out, didRedact };
}

function emptyState(): KnowledgeState {
  return { version: STATE_VERSION, entities: {}, concepts: {} };
}

export class KnowledgeManager {
  private knowledgeDir: string;
  private projectRoot: string;

  constructor(rootDir: string) {
    this.projectRoot = rootDir;
    this.knowledgeDir = path.join(rootDir, ".knowledge");
  }

  get projectRootPath(): string {
    return this.projectRoot;
  }

  async exists(): Promise<boolean> {
    try {
      await fs.access(this.knowledgeDir);
      return true;
    } catch {
      return false;
    }
  }

  // True when the knowledge base has nothing synthesized yet. The MCP server
  // uses this to trigger bootstrap mode in get_pending_changes — first ingest
  // must synthesize from a full source scan, not a recent git diff (which is
  // usually just the installation of Cortex itself).
  async isEmpty(): Promise<boolean> {
    if (!(await this.exists())) return true;
    const state = await this.readState();
    return (
      Object.keys(state.entities).length === 0 &&
      Object.keys(state.concepts).length === 0
    );
  }

  // Returns the rich index — names + descriptions + links + source. This is
  // what the Librarian sees as CURRENT CONTEXT during ingest, and what
  // downstream AIs get when they call read_knowledge_index.
  async getKnowledgeSummary(): Promise<string> {
    try {
      return await fs.readFile(path.join(this.knowledgeDir, "index.md"), "utf8");
    } catch {
      return "No existing knowledge found.";
    }
  }

  // Returns a compact guardrails block for ALL entities that have constraints
  // or failedApproaches. Injected into the ingest prompt as a separate section
  // so the Librarian sees active constraints and past failures WITHOUT bloating
  // the main index with full descriptions.
  //
  // Design rationale: the index stays lean (## Role only); this block adds
  // only the actionable guardrail data — typically 10-50 tokens per entity —
  // so context growth is bounded. For a 50-entity project the block is ~2k
  // tokens vs ~25k if full entity pages were injected.
  async getEntityGuardrails(): Promise<string> {
    const state = await this.readState();
    const lines: string[] = [];

    for (const [name, entity] of Object.entries(state.entities)) {
      const parts: string[] = [];

      if (entity.constraints) {
        const c = entity.constraints;
        if (c.mustNotImport?.length) parts.push(`  mustNotImport: ${c.mustNotImport.join(", ")}`);
        if (c.mustNotBeCalledBy?.length) parts.push(`  mustNotBeCalledBy: ${c.mustNotBeCalledBy.join(", ")}`);
        if (c.contract) parts.push(`  contract: ${c.contract}`);
      }

      if (entity.failedApproaches?.length) {
        // Show at most 3 most recent — enough for the Librarian to recognise
        // a pattern; anything older has low recurrence probability.
        const recent = entity.failedApproaches.slice(-3);
        parts.push(...recent.map(fa => `  [FAILED] ${fa.summary}: ${fa.reason}`));
      }

      if (parts.length > 0) {
        lines.push(`[[${name}]]`);
        lines.push(...parts);
      }
    }

    if (lines.length === 0) return "";
    return [
      "================================================================",
      "### ENTITY GUARDRAILS — Constraints & Known Failed Approaches",
      "================================================================",
      "The following entities have declared constraints or past failed approaches.",
      "Read them before modifying or creating relationships to these entities.",
      "",
      ...lines,
    ].join("\n");
  }

  // Deep-read: full markdown for a specific entity. Used by downstream AIs
  // navigating wiki-links from the index.
  async readEntity(name: string): Promise<string | null> {
    const filePath = path.join(this.knowledgeDir, "entities", `${safeFilename(name)}.md`);
    try {
      return await fs.readFile(filePath, "utf8");
    } catch {
      return null;
    }
  }

  async readConcept(name: string): Promise<string | null> {
    const filePath = path.join(this.knowledgeDir, "concepts", `${safeFilename(name)}.md`);
    try {
      return await fs.readFile(filePath, "utf8");
    } catch {
      return null;
    }
  }

  async getLastSyncCommit(): Promise<string | null> {
    try {
      const content = await fs.readFile(
        path.join(this.knowledgeDir, LAST_SYNC_FILE),
        "utf8"
      );
      return content.trim() || null;
    } catch {
      return null;
    }
  }

  async updateLastSyncCommit(projectRoot: string): Promise<void> {
    try {
      const { stdout } = await execAsync("git rev-parse HEAD", { cwd: projectRoot });
      const commit = stdout.trim();
      await fs.writeFile(path.join(this.knowledgeDir, LAST_SYNC_FILE), commit, "utf8");
    } catch {
      await fs.writeFile(path.join(this.knowledgeDir, LAST_SYNC_FILE), "no-commits", "utf8");
    }
  }

  async init() {
    await fs.mkdir(this.knowledgeDir, { recursive: true });
    await fs.mkdir(path.join(this.knowledgeDir, "entities"), { recursive: true });
    await fs.mkdir(path.join(this.knowledgeDir, "concepts"), { recursive: true });

    // Bootstrap state.json from disk if it doesn't exist yet but entity/concept
    // files do (migration from the old name-only-index layout).
    const statePath = path.join(this.knowledgeDir, STATE_FILE);
    try {
      await fs.access(statePath);
    } catch {
      const migrated = await this.migrateStateFromDisk();
      await this.writeState(migrated);
    }

    // JSONL log backfill
    const logMdPath = path.join(this.knowledgeDir, "log.md");
    const logJsonlPath = path.join(this.knowledgeDir, "log.jsonl");
    try {
      await fs.access(logMdPath);
      try {
        await fs.access(logJsonlPath);
      } catch {
        // log.md exists, log.jsonl doesn't -> backfill
        const mdContent = await fs.readFile(logMdPath, "utf8");
        const jsonlEntries = this.parseLegacyLogToJSONL(mdContent);
        if (jsonlEntries.length > 0) {
          await fs.writeFile(logJsonlPath, jsonlEntries.map(e => JSON.stringify(e)).join("\n") + "\n", "utf8");
        }
      }
    } catch {
      // no log.md, fine
    }

    // Always (re)render the index so the format on disk matches the current
    // renderer — including when state.json was just migrated.
    await this.updateIndex();
  }

  private parseLegacyLogToJSONL(mdContent: string): any[] {
    const entries = [];
    const blocks = mdContent.split("---\n").filter(b => b.trim());
    for (const block of blocks) {
      const match = block.match(/## \[([^\]]+)\]\n\*\*Summary:\*\* ([^\n]*)\n\*\*Impacted:\*\* ([^\n]*)\n\*\*Warnings:\*\* ([^\n]*)/);
      if (match) {
        const timestamp = match[1];
        const summary = match[2];
        const impactedStr = match[3];
        const warningsStr = match[4];
        
        const entities = Array.from(impactedStr.matchAll(/\[\[([^\]]+)\]\]/g)).map(m => m[1]);
        const warnings = warningsStr === "None" ? [] : warningsStr.split("; ");
        
        entries.push({
          timestamp,
          summary,
          entities,
          concepts: [],
          warnings,
          migrated: true
        });
      }
    }
    return entries;
  }

  // ──────────────────────────────────────────────────────────────────────
  // State management
  // ──────────────────────────────────────────────────────────────────────

  private async readState(): Promise<KnowledgeState> {
    const statePath = path.join(this.knowledgeDir, STATE_FILE);
    try {
      const raw = await fs.readFile(statePath, "utf8");
      const parsed = JSON.parse(raw) as any;
      
      const state: KnowledgeState = {
        version: STATE_VERSION,
        entities: parsed.entities || {},
        concepts: parsed.concepts || {},
      };

      // Auto-migrate legacy links to relationships
      for (const [name, entity] of Object.entries(state.entities)) {
        if ((entity as any).links) {
          entity.relationships = ((entity as any).links as string[]).map((t: string) => ({ target: t, kind: "depends_on" }));
          delete (entity as any).links;
        }
        if (!entity.relationships) entity.relationships = [];
      }

      return state;
    } catch (err: any) {
      console.error(`[Cortex] readState failed (root: ${this.knowledgeDir}): ${err?.message ?? err}`);
      return emptyState();
    }
  }

  private async writeState(state: KnowledgeState): Promise<void> {
    const statePath = path.join(this.knowledgeDir, STATE_FILE);
    await fs.writeFile(statePath, JSON.stringify(state, null, 2), "utf8");
  }

  // Best-effort parse of the legacy entity/concept markdown files so existing
  // knowledge bases don't lose data when state.json is introduced.
  private async migrateStateFromDisk(): Promise<KnowledgeState> {
    const state = emptyState();
    const entitiesDir = path.join(this.knowledgeDir, "entities");
    const conceptsDir = path.join(this.knowledgeDir, "concepts");

    try {
      for (const file of await fs.readdir(entitiesDir)) {
        if (!file.endsWith(".md")) continue;
        const name = file.replace(/\.md$/, "");
        const body = await fs.readFile(path.join(entitiesDir, file), "utf8").catch(() => "");
        state.entities[name] = {
          description: extractBlockquote(body) ?? "(description not recovered during migration)",
          relationships: extractLinks(body).map((t: string) => ({ target: t, kind: "depends_on" })),
          sourceFile: extractSourceCitation(body),
          lastRefined: extractLastRefined(body) ?? new Date().toISOString(),
        };
      }
    } catch {
      // entities dir missing — fine
    }

    try {
      for (const file of await fs.readdir(conceptsDir)) {
        if (!file.endsWith(".md")) continue;
        const name = file.replace(/\.md$/, "");
        const body = await fs.readFile(path.join(conceptsDir, file), "utf8").catch(() => "");
        state.concepts[name] = {
          description: extractConceptBody(body) ?? "(description not recovered during migration)",
          lastRefined: extractLastRefined(body) ?? new Date().toISOString(),
        };
      }
    } catch {
      // concepts dir missing — fine
    }

    return state;
  }

  // ──────────────────────────────────────────────────────────────────────
  // Synthesis write
  // ──────────────────────────────────────────────────────────────────────

  async saveSynthesis(synthesis: Synthesis) {
    const timestamp = new Date().toISOString();
    const state = await this.readState();

    // Description & Evidence validation & redaction
    for (const entity of synthesis.entities) {
      if (entity.action === "delete") continue;

      const { redacted: descRedacted, didRedact: descDidRedact } = redactSecrets(entity.description);
      if (descDidRedact) {
        entity.description = descRedacted;
        synthesis.warnings.push(`Secret redacted from description in entity '${entity.name}'`);
      }

      if (!entity.evidence) continue;

      if (entity.evidence.length > 2) {
        throw new Error(`Evidence Limit Exceeded: Entity '${entity.name}' has more than 2 evidence entries.`);
      }

      let totalContentChars = 0;
      for (const ev of entity.evidence) {
        if (!ev.content) continue;
        const lines = ev.content.split("\n");
        if (lines.length > 10) {
          throw new Error(`Evidence Limit Exceeded: Content snippet in '${entity.name}' exceeds 10 lines.`);
        }

        const { redacted, didRedact } = redactSecrets(ev.content);
        if (didRedact) {
          ev.content = redacted;
          synthesis.warnings.push(`Secret redacted from evidence in entity '${entity.name}' (source: ${ev.sourceFile})`);
        }
        totalContentChars += (ev.content ?? "").length;
      }

      if (totalContentChars > 500) {
        throw new Error(`Evidence Limit Exceeded: Total evidence content chars for '${entity.name}' exceed 500 (was ${totalContentChars}).`);
      }
    }

    // Build the post-synthesis "merged" state preview. Two reasons this is done
    // before any write:
    //   1) constraint validation must see in-batch additions (e.g. the same
    //      synthesis creating A→B while B declares mustNotBeCalledBy=[A]);
    //   2) update-without-re-emitting must preserve prior constraints /
    //      failedApproaches / sourceFile rather than silently dropping them.
    const mergedEntities: Record<string, EntityRecord> = { ...state.entities };
    for (const entity of synthesis.entities) {
      if (entity.action === "delete") {
        delete mergedEntities[entity.name];
        continue;
      }
      const existing = mergedEntities[entity.name];

      // Merge failedApproaches: new entries are appended to existing ones,
      // then the combined array is capped at 10 most recent.
      // This prevents unbounded accumulation across many updates while
      // keeping the full recent history visible to the Librarian.
      const mergedFailedApproaches = (() => {
        const incoming = entity.failedApproaches;
        const prior = existing?.failedApproaches ?? [];
        if (!incoming || incoming.length === 0) return prior.length > 0 ? prior.slice(-10) : undefined;
        // Deduplicate by summary to avoid re-recording the same failure.
        const seen = new Set(prior.map(fa => fa.summary));
        const novel = incoming.filter(fa => !seen.has(fa.summary));
        return [...prior, ...novel].slice(-10);
      })();

      mergedEntities[entity.name] = {
        description: entity.description,
        relationships: entity.relationships,
        // `undefined` means "Librarian didn't re-emit this field" → preserve
        // the prior value. An explicit empty object/array clears it.
        constraints: entity.constraints ?? existing?.constraints,
        failedApproaches: mergedFailedApproaches,
        sourceFile: entity.sourceFile ?? existing?.sourceFile,
        evidence: entity.evidence ?? existing?.evidence,
        lastRefined: timestamp,
        staleSince: existing?.staleSince, // recomputed below
        // Phase 7.5 — human-review facts are NEVER re-emitted by the Librarian
        // synthesis (those calls don't know about review state). Preserve them
        // verbatim from the prior record so a re-synthesis doesn't silently
        // wipe out a previous human sign-off.
        human_reviewed: existing?.human_reviewed,
        reviewed_by: existing?.reviewed_by,
      };
    }

    // Constraint Validation (against merged state, restricted to actual-usage
    // edges — `contradicts`/`supports`/etc. document relationships, they
    // shouldn't trigger import/call violations).
    //
    // The two constraint kinds have different applicability:
    //   - mustNotImport: source-side rule, applies regardless of whether the
    //     target is a tracked entity (e.g. forbidding `import 'lodash'`).
    //   - mustNotBeCalledBy: target-side rule, only meaningful when the target
    //     exists as a tracked entity that declared it.
    for (const entity of synthesis.entities) {
      if (entity.action === "delete") continue;
      const entityRecord = mergedEntities[entity.name];
      for (const rel of entity.relationships) {
        if (!USAGE_KINDS.has(rel.kind)) continue;

        if (entityRecord?.constraints?.mustNotImport?.includes(rel.target)) {
          throw new Error(`Constraint Violation: Entity '${entity.name}' must not import '${rel.target}'.`);
        }

        const targetEntity = mergedEntities[rel.target];
        if (targetEntity?.constraints?.mustNotBeCalledBy?.includes(entity.name)) {
          throw new Error(`Constraint Violation: Entity '${rel.target}' must not be called by '${entity.name}'.`);
        }
      }
    }

    // Phase 7.5 — Org-wide constraint validation. Runs AFTER per-entity Phase 6
    // checks against the merged state so in-batch additions are visible. Errors
    // throw with the "Org Constraint Violation:" prefix (parallel to Phase 6's
    // "Constraint Violation:") so the MCP server can surface a clear message.
    // Warnings are forwarded to synthesis.warnings so the rendered log entry
    // records them without blocking the save.
    const orgEvaluator = OrgConstraintEvaluator.load(this.projectRoot);
    if (orgEvaluator) {
      const violations = orgEvaluator.evaluateAll(mergedEntities);
      const { errors, warnings } = orgEvaluator.splitBySeverity(violations);
      throwOnErrors(errors);
      for (const w of warnings) {
        synthesis.warnings.push(
          `[${w.constraintId}] ${w.entity}: ${w.reason}`,
        );
      }
    }

    // Validation passed — commit merged entities into state.
    state.entities = mergedEntities;

    // Recompute staleness:
    //   - Clear staleSince on entities explicitly in this synthesis (they're fresh).
    //   - Propagate staleSince to dependents of every update/delete (not the
    //     create case — a brand-new entity has no prior dependents).
    const synthesisNames = new Set(synthesis.entities.map((e) => e.name));
    for (const name of synthesisNames) {
      if (state.entities[name]) delete state.entities[name].staleSince;
    }

    const stalePropagatedTo = new Set<string>();
    for (const entity of synthesis.entities) {
      if (entity.action === "create") continue;
      for (const [otherName, otherEntity] of Object.entries(state.entities)) {
        if (synthesisNames.has(otherName)) continue;
        if (
          otherEntity.relationships.some(
            (r) => r.target === entity.name && USAGE_KINDS.has(r.kind),
          )
        ) {
          otherEntity.staleSince = timestamp;
          stalePropagatedTo.add(otherName);
        }
      }
    }

    // Filesystem writes — entity files (synthesis + stale-stamped dependents),
    // concept files, deletes, log entry, state.json, index.md.
    for (const entity of synthesis.entities) {
      if (entity.action !== "delete") continue;
      const entityPath = path.join(this.knowledgeDir, "entities", `${safeFilename(entity.name)}.md`);
      try { await fs.unlink(entityPath); } catch {}
    }

    const writtenEntityNames = new Set<string>();
    for (const entity of synthesis.entities) {
      if (entity.action === "delete") continue;
      await this.renderEntityFile(entity.name, state.entities[entity.name]);
      writtenEntityNames.add(entity.name);
    }
    for (const staleName of stalePropagatedTo) {
      if (writtenEntityNames.has(staleName)) continue;
      await this.renderEntityFile(staleName, state.entities[staleName]);
    }

    for (const concept of synthesis.concepts) {
      const { redacted: descRedacted, didRedact: descDidRedact } = redactSecrets(concept.description);
      if (descDidRedact) {
        concept.description = descRedacted;
        synthesis.warnings.push(`Secret redacted from description in concept '${concept.name}'`);
      }
      const existing = state.concepts[concept.name];
      state.concepts[concept.name] = {
        description: concept.description,
        relationships: concept.relationships ?? existing?.relationships,
        failedApproaches: concept.failedApproaches ?? existing?.failedApproaches,
        lastRefined: timestamp,
      };
      await this.renderConceptFile(concept.name, state.concepts[concept.name]);
    }

    // Auto-emit parent summaries for directories with >= 5 entities
    // And cleanup old parent summaries that dropped below 5 entities
    const dirGroups: Record<string, string[]> = {};
    for (const [name, entity] of Object.entries(state.entities)) {
      if (entity.sourceFile) {
        const dir = path.dirname(entity.sourceFile).replace(/\\/g, "/") + "/";
        if (dir && dir !== "./" && dir !== "." && dir !== "/") {
          if (!dirGroups[dir]) dirGroups[dir] = [];
          dirGroups[dir].push(name);
        }
      }
    }

    for (const [conceptName, concept] of Object.entries(state.concepts)) {
      if (conceptName.endsWith("/") && concept.relationships?.some(r => r.kind === "parent_of")) {
        const childEntities = dirGroups[conceptName];
        if (!childEntities || childEntities.length < 5) {
          delete state.concepts[conceptName];
          const conceptPath = path.join(this.knowledgeDir, "concepts", `${safeFilename(conceptName)}.md`);
          try { await fs.unlink(conceptPath); } catch {}
        }
      }
    }
    for (const [dir, childEntities] of Object.entries(dirGroups)) {
      if (childEntities.length >= 5) {
        const conceptName = dir;
        const existing = state.concepts[conceptName];
        const newRels: Relationship[] = childEntities.map(child => ({
          target: child,
          kind: "parent_of"
        }));
        state.concepts[conceptName] = {
          description: existing?.description ?? `Parent summary for the \`${dir}\` module directory.`,
          relationships: newRels,
          failedApproaches: existing?.failedApproaches,
          lastRefined: timestamp
        };
        await this.renderConceptFile(conceptName, state.concepts[conceptName]);
      }
    }

    // Write state.json FIRST — it's the canonical store. If a subsequent log
    // append fails, we can rebuild the log from state; the reverse is not true.
    await this.writeState(state);
    await this.updateIndex();

    const logPath = path.join(this.knowledgeDir, "log.md");
    const logEntry = `\n## [${timestamp}]\n**Summary:** ${synthesis.summary}\n**Impacted:** ${synthesis.entities.map((e) => `[[${e.name}]]`).join(", ")}\n**Warnings:** ${synthesis.warnings.join("; ") || "None"}\n---\n`;
    await fs.appendFile(logPath, logEntry);

    const logJsonlPath = path.join(this.knowledgeDir, "log.jsonl");
    const jsonlEntry = {
      timestamp,
      summary: synthesis.summary,
      entities: synthesis.entities.map((e) => e.name),
      concepts: synthesis.concepts.map((c) => c.name),
      warnings: synthesis.warnings,
      // State snapshot enables `cortex evolution --replay --at <commit|date>`
      // to reconstruct the index as it stood at any prior save. Bounded by
      // total entity/concept count — for typical projects this is a few KB
      // per entry. Pre-snapshot entries are handled by the replay fallback.
      state: { entities: state.entities, concepts: state.concepts },
    };
    await fs.appendFile(logJsonlPath, JSON.stringify(jsonlEntry) + "\n", "utf8");
  }

  private async renderEntityFile(name: string, record: EntityRecord): Promise<void> {
    const entityPath = path.join(this.knowledgeDir, "entities", `${safeFilename(name)}.md`);

    const sourceLine = record.sourceFile ? `**Source:** \`${record.sourceFile}\`\n\n` : "";
    const relsLine = record.relationships.length
      ? record.relationships.map((r) => `- **${r.kind}:** [[${r.target}]]`).join("\n")
      : "_(none)_";
    const staleLine = record.staleSince
      ? `\n> [!WARNING]\n> **Stale Since:** ${record.staleSince}\n> A dependency was modified; re-verify this entity still reflects the current code.\n`
      : "";

    let constraintsLine = "";
    if (record.constraints) {
      const parts: string[] = [];
      if (record.constraints.mustNotImport?.length) parts.push(`- **Must Not Import:** ${record.constraints.mustNotImport.join(", ")}`);
      if (record.constraints.mustNotBeCalledBy?.length) parts.push(`- **Must Not Be Called By:** ${record.constraints.mustNotBeCalledBy.join(", ")}`);
      if (record.constraints.contract) parts.push(`- **Contract:** ${record.constraints.contract}`);
      if (parts.length) constraintsLine = "\n### Constraints\n" + parts.join("\n") + "\n";
    }

    let failedApproachesLine = "";
    if (record.failedApproaches?.length) {
      failedApproachesLine = "\n### Failed Approaches\n" + record.failedApproaches.map((fa) => `- **${fa.summary}**: ${fa.reason}`).join("\n") + "\n";
    }

    let evidenceLine = "";
    if (record.evidence?.length) {
      const parts: string[] = [];
      for (const ev of record.evidence) {
        let evStr = `- **${ev.sourceFile}**`;
        if (ev.lineRange) evStr += ` (lines ${ev.lineRange[0]}-${ev.lineRange[1]})`;
        if (ev.commit) evStr += ` @ commit \`${ev.commit}\``;
        if (ev.content) evStr += `\n  \`\`\`\n  ${ev.content.replace(/\n/g, "\n  ")}\n  \`\`\``;
        parts.push(evStr);
      }
      evidenceLine = "\n### Evidence\n" + parts.join("\n") + "\n";
    }

    const body = isLayeredDescription(record.description) ? record.description.trim() : `> ${record.description}`;
    // Phase 7.5 — surface the quality breakdown + human review status at the
    // bottom of the page so anyone reading the drill-down sees exactly why
    // the score is what it is.
    const breakdown = computeQuality(record);
    const reviewLine = record.human_reviewed
      ? `*Human Reviewed: ✅ by ${record.reviewed_by ?? "human"}*\n`
      : "";
    const qualityLine =
      `*Quality: ${formatScore(breakdown.score)}* ` +
      `(evidence ${formatScore(breakdown.evidenceFreshness)} · ` +
      `contradictions ${formatScore(breakdown.contradiction)} · ` +
      `staleness ${formatScore(breakdown.staleness)} · ` +
      `age ${formatScore(breakdown.age)} · ` +
      `human-review ${formatScore(breakdown.humanReview)})\n`;
    const content = `# Entity: ${name}\n\n${sourceLine}${staleLine}\n${body}\n\n### Relationships\n${relsLine}\n${constraintsLine}${failedApproachesLine}${evidenceLine}\n---\n*Last Refined: ${record.lastRefined}*\n${reviewLine}${qualityLine}`;
    await fs.writeFile(entityPath, content);
  }

  private async renderConceptFile(name: string, record: ConceptRecord): Promise<void> {
    const conceptPath = path.join(this.knowledgeDir, "concepts", `${safeFilename(name)}.md`);

    let failedApproachesLine = "";
    if (record.failedApproaches?.length) {
      failedApproachesLine = "\n### Failed Approaches\n" + record.failedApproaches.map((fa) => `- **${fa.summary}**: ${fa.reason}`).join("\n") + "\n";
    }

    let relsLine = "";
    if (record.relationships?.length) {
      relsLine = "\n### Relationships\n" + record.relationships.map((r) => `- **${r.kind}:** [[${r.target}]]`).join("\n") + "\n";
    }

    const content = `# Concept: ${name}\n\n${record.description}\n${relsLine}${failedApproachesLine}\n---\n*Last Refined: ${record.lastRefined}*\n`;
    await fs.writeFile(conceptPath, content);
  }

  async saveConcept(concept: SaveConcept) {
    const timestamp = new Date().toISOString();
    const state = await this.readState();

    const { redacted: descRedacted, didRedact: descDidRedact } = redactSecrets(concept.description);
    const warnings: string[] = [];
    if (descDidRedact) {
      concept.description = descRedacted;
      warnings.push(`Secret redacted from description in concept '${concept.name}'`);
    }

    const existing = state.concepts[concept.name];
    state.concepts[concept.name] = {
      description: concept.description,
      relationships: concept.relationships ?? existing?.relationships,
      // Same merge semantics as saveSynthesis: undefined preserves prior value.
      failedApproaches: concept.failedApproaches ?? existing?.failedApproaches,
      lastRefined: timestamp,
    };

    await this.renderConceptFile(concept.name, state.concepts[concept.name]);

    await this.writeState(state);
    await this.updateIndex();

    const logPath = path.join(this.knowledgeDir, "log.md");
    const logEntry = `\n## [${timestamp}]\n**Summary:** Saved concept '${concept.name}' directly.\n**Impacted:** [[${concept.name}]]\n**Warnings:** ${warnings.join("; ") || "None"}\n---\n`;
    await fs.appendFile(logPath, logEntry);

    const logJsonlPath = path.join(this.knowledgeDir, "log.jsonl");
    const jsonlEntry = {
      timestamp,
      summary: `Saved concept '${concept.name}' directly.`,
      entities: [],
      concepts: [concept.name],
      warnings,
      state: { entities: state.entities, concepts: state.concepts },
    };
    await fs.appendFile(logJsonlPath, JSON.stringify(jsonlEntry) + "\n", "utf8");
  }

  // ──────────────────────────────────────────────────────────────────────
  // Index rendering — the consumer-facing surface
  // ──────────────────────────────────────────────────────────────────────

  async updateIndex() {
    const state = await this.readState();
    const conceptNames = Object.keys(state.concepts).sort();
    const entityNames = Object.keys(state.entities).sort();

    // Identify parent summaries
    const parentSummaries = conceptNames.filter(name => {
      const c = state.concepts[name];
      return name.endsWith("/") || (c.relationships && c.relationships.some(r => r.kind === "parent_of"));
    });

    const regularConcepts = conceptNames.filter(name => !parentSummaries.includes(name));

    // Keep track of which entities are rendered as children of parent summaries
    const childEntities = new Set<string>();
    for (const pName of parentSummaries) {
      const c = state.concepts[pName];
      if (c.relationships) {
        for (const r of c.relationships) {
          if (r.kind === "parent_of") {
            childEntities.add(r.target);
          }
        }
      }
    }

    let content = `# Project Cortex: Knowledge Index\n\n`;
    content += `*Auto-generated. Read this first. Use \`read_entity\` / \`read_concept\` to drill into any name below.*\n\n`;

    content += `## Core Concepts\n\n`;
    if (regularConcepts.length === 0) {
      content += `_No concepts yet._\n\n`;
    } else {
      for (const name of regularConcepts) {
        const c = state.concepts[name];
        let rels = "";
        if (c.relationships?.length) {
          rels = `\n_Relationships:_ ${c.relationships.map((r) => `[[${r.target}]]`).join(", ")}`;
        }
        content += `### [[${name}]]\n${c.description}${rels}\n\n`;
      }
    }

    content += `## Active Entities\n\n`;
    
    // Render parent summaries first!
    if (parentSummaries.length > 0) {
      content += `### Module Summaries\n\n`;
      for (const pName of parentSummaries) {
        const c = state.concepts[pName];
        content += `#### [[${pName}]]\n${c.description}\n`;
        
        // Render child clusters
        const children = (c.relationships || [])
          .filter(r => r.kind === "parent_of" && state.entities[r.target])
          .map(r => r.target)
          .sort();
          
        if (children.length > 0) {
          content += `\n_Child Entities:_\n`;
          for (const child of children) {
            const e = state.entities[child];
            const source = e.sourceFile ? ` — \`${e.sourceFile}\`` : "";
            const stale = e.staleSince ? ` **[STALE]**` : "";
            const breakdown = computeQuality(e);
            const quality = ` ▸ quality: ${formatScore(breakdown.score)}`;
            const indexSummary = extractRoleSection(e.description);
            content += `- **[[${child}]]**${source}${quality}${stale}\n  ${indexSummary.replace(/\n/g, "\n  ")}\n`;
          }
          content += `\n`;
        } else {
          content += `_No tracked child entities._\n\n`;
        }
      }
    }

    // Render other independent entities
    const independentEntities = entityNames.filter(name => !childEntities.has(name));
    if (independentEntities.length > 0) {
      if (parentSummaries.length > 0) {
        content += `### Independent Entities\n\n`;
      }
      for (const name of independentEntities) {
        const e = state.entities[name];
        const source = e.sourceFile ? ` — \`${e.sourceFile}\`` : "";
        const rels = e.relationships.length
          ? `\n_Relationships:_ ${e.relationships.map((r) => `[[${r.target}]]`).join(", ")}`
          : "";
        const stale = e.staleSince ? ` **[STALE]**` : "";
        const breakdown = computeQuality(e);
        const quality = ` ▸ quality: ${formatScore(breakdown.score)}`;
        const indexSummary = extractRoleSection(e.description);
        content += `### [[${name}]]${source}${quality}${stale}\n${indexSummary}${rels}\n\n`;
      }
    } else if (entityNames.length === 0) {
      content += `_No entities yet._\n\n`;
    }

    await fs.writeFile(path.join(this.knowledgeDir, "index.md"), content);
  }
  async getStaleCount(): Promise<number> {
    const state = await this.readState();
    return Object.values(state.entities).filter(e => !!e.staleSince).length;
  }

  // Phase 7.5 — count of entities whose quality score is below the configured
  // gate (CORTEX_QUALITY_GATE, default 0.5). Surfaced in cortex status and the
  // MCP get_cortex_status response.
  async getLowQualityCount(threshold?: number): Promise<number> {
    const state = await this.readState();
    const gate = threshold ?? readQualityGate();
    let count = 0;
    for (const e of Object.values(state.entities)) {
      if (computeQuality(e).score < gate) count++;
    }
    return count;
  }

  // Phase 7.5 — full quality breakdown for one entity, used by the
  // get_entity_quality MCP tool and the cortex audit quality CLI.
  async getEntityQuality(name: string): Promise<QualityBreakdown | null> {
    const state = await this.readState();
    const entity = state.entities[name];
    if (!entity) return null;
    return computeQuality(entity);
  }

  // Phase 8 — expose raw state for the graph builder (read-only projection).
  async getState(): Promise<KnowledgeState> {
    return this.readState();
  }

  // Phase 7.5 — list every entity with its quality breakdown, sorted by score
  // ascending. Used by cortex audit quality to surface the bottom decile.
  async listEntityQuality(): Promise<Array<{ name: string; sourceFile?: string; breakdown: QualityBreakdown }>> {
    const state = await this.readState();
    const rows = Object.entries(state.entities).map(([name, e]) => ({
      name,
      sourceFile: e.sourceFile,
      breakdown: computeQuality(e),
    }));
    rows.sort((a, b) => a.breakdown.score - b.breakdown.score);
    return rows;
  }

  // Phase 7.5 — set or clear human-review facts on an entity. Used by
  // `cortex review accept/reject`. Re-renders the entity .md + index so the
  // quality badge reflects the new state immediately.
  async setHumanReview(
    name: string,
    accepted: boolean,
    reviewer?: string,
  ): Promise<{ ok: boolean; reason?: string }> {
    const state = await this.readState();
    const entity = state.entities[name];
    if (!entity) return { ok: false, reason: `Entity '${name}' not found.` };
    entity.human_reviewed = accepted;
    entity.reviewed_by = accepted ? (reviewer ?? "human") : undefined;
    await this.writeState(state);
    await this.renderEntityFile(name, entity);
    await this.updateIndex();
    return { ok: true };
  }

  async getStaleEntities(): Promise<Array<{ name: string; staleSince: string; sourceFile?: string }>> {
    const state = await this.readState();
    return Object.entries(state.entities)
      .filter(([_, e]) => !!e.staleSince)
      .map(([name, e]) => ({
        name,
        staleSince: e.staleSince!,
        sourceFile: e.sourceFile,
      }));
  }

  // Mark verified-clean stale entities as fresh without re-emitting their full
  // synthesis. Used by the audit auto-healing path: the AI inspects each stale
  // entity, confirms the dependency change didn't invalidate any invariant, and
  // calls this to clear the flag. Re-renders the entity .md (drops the
  // [!WARNING] block) and refreshes index.md.
  //
  // Returns the names actually cleared, and any names skipped because they
  // weren't stale (or didn't exist) so the AI's report stays honest.
  async refreshStaleEntities(names: string[]): Promise<{ cleared: string[]; skipped: string[] }> {
    const state = await this.readState();
    const cleared: string[] = [];
    const skipped: string[] = [];
    for (const name of names) {
      const entity = state.entities[name];
      if (!entity || !entity.staleSince) {
        skipped.push(name);
        continue;
      }
      delete entity.staleSince;
      cleared.push(name);
      await this.renderEntityFile(name, entity);
    }
    if (cleared.length > 0) {
      const timestamp = new Date().toISOString();
      const logPath = path.join(this.knowledgeDir, "log.md");
      const logEntry = `\n## [${timestamp}]\n**Summary:** Refreshed ${cleared.length} stale entit${cleared.length === 1 ? "y" : "ies"} after audit verification.\n**Impacted:** ${cleared.map((n) => `[[${n}]]`).join(", ")}\n**Warnings:** None\n---\n`;
      await fs.appendFile(logPath, logEntry);
      await this.writeState(state);
      await this.updateIndex();
    }
    return { cleared, skipped };
  }

  async exportSpec(): Promise<string> {
    const state = await this.readState();
    const outputPath = path.join(this.projectRoot, "ARCH_SPEC.md");
    
    let content = "# Architectural Specification\n\nGenerated by Project Cortex.\n\n";

    content += "## Concepts\n\n";
    for (const [name, concept] of Object.entries(state.concepts)) {
      content += `### [[${name}]]\n\n${concept.description}\n\n`;
      if (concept.failedApproaches?.length) {
        content += `#### Failed Approaches\n`;
        for (const fa of concept.failedApproaches) {
          content += `- **${fa.summary}**: ${fa.reason}\n`;
        }
        content += "\n";
      }
    }

    content += "## Entities\n\n";
    for (const [name, entity] of Object.entries(state.entities)) {
      content += `### [[${name}]]\n\n`;
      if (entity.sourceFile) {
        content += `**Source**: \`${entity.sourceFile}\`\n\n`;
      }
      content += `${entity.description}\n\n`;
      
      if (entity.relationships.length > 0) {
        content += `#### Relationships\n`;
        for (const rel of entity.relationships) {
          content += `- **${rel.kind}**: [[${rel.target}]]\n`;
        }
        content += "\n";
      }

      if (entity.constraints) {
        content += `#### Constraints\n`;
        if (entity.constraints.mustNotImport?.length) content += `- **Must Not Import:** ${entity.constraints.mustNotImport.join(", ")}\n`;
        if (entity.constraints.mustNotBeCalledBy?.length) content += `- **Must Not Be Called By:** ${entity.constraints.mustNotBeCalledBy.join(", ")}\n`;
        if (entity.constraints.contract) content += `- **Contract:** ${entity.constraints.contract}\n`;
        content += "\n";
      }

      if (entity.failedApproaches?.length) {
        content += `#### Failed Approaches\n`;
        for (const fa of entity.failedApproaches) {
          content += `- **${fa.summary}**: ${fa.reason}\n`;
        }
        content += "\n";
      }
    }

    await fs.writeFile(outputPath, content, "utf-8");
    return outputPath;
  }
}

// ──────────────────────────────────────────────────────────────────────
// Migration helpers — best-effort parsing of the legacy markdown layout.
// ──────────────────────────────────────────────────────────────────────

function extractBlockquote(body: string): string | null {
  // First "> ..." line is the description in the legacy entity template.
  const match = body.match(/^>\s+(.+)$/m);
  return match ? match[1].trim() : null;
}

function extractConceptBody(body: string): string | null {
  // Legacy concept template: "# Concept: <name>\n\n<body>\n\n---"
  const match = body.match(/^#\s+Concept:[^\n]*\n+([\s\S]*?)\n+---/m);
  return match ? match[1].trim() : null;
}

function extractLinks(body: string): string[] {
  // Pull [[...]] off the "**Links:**" line specifically so we don't include
  // every wiki-link mentioned in the description.
  const linksLine = body.match(/\*\*Links:\*\*\s*(.+)$/m);
  if (!linksLine) return [];
  const refs = Array.from(linksLine[1].matchAll(/\[\[([^\]]+)\]\]/g)).map((m) => m[1].trim());
  return Array.from(new Set(refs));
}

function extractSourceCitation(body: string): string | undefined {
  // New layout: "**Source:** `path/to/file.ts`"
  const explicit = body.match(/\*\*Source:\*\*\s*`([^`]+)`/);
  if (explicit) return explicit[1].trim();

  // Legacy: source jammed into the description as "(src/foo.ts)" or "(lib/bar.py:42)".
  const blockquote = extractBlockquote(body);
  if (!blockquote) return undefined;
  const inline = blockquote.match(/\(((?:src|lib|app|api|server|client|packages)\/[^\s)]+)\)/i);
  return inline ? inline[1] : undefined;
}

function extractLastRefined(body: string): string | null {
  const match = body.match(/\*Last Refined:\s*([^*\n]+)\*/);
  return match ? match[1].trim() : null;
}

// ──────────────────────────────────────────────────────────────────────
// Layered description helpers
//
// The Librarian emits each entity's `description` as a multi-section markdown
// document (## Role / ## Interface / ## Behavior / ## Wiring). The full body
// goes onto the entity's drill-down page; the index renders only the Role
// section to keep the high-level map shallow.
// ──────────────────────────────────────────────────────────────────────

const SECTION_HEADING_RE = /^##\s+(Role|Interface|Lifecycle|Behavior|Verification|Wiring)\s*$/m;

function isLayeredDescription(description: string): boolean {
  return SECTION_HEADING_RE.test(description);
}

// Extract just the `## Role` section content. Falls back to the full description
// when no section markers are present (backward compatibility with legacy
// flat descriptions).
function extractRoleSection(description: string): string {
  if (!isLayeredDescription(description)) return description.trim();
  const match = description.match(/##\s+Role\s*\n([\s\S]*?)(?=\n##\s+\w|\s*$)/);
  return match ? match[1].trim() : description.trim();
}
