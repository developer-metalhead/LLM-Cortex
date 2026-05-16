import fs from "fs/promises";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { Synthesis } from "../llm/schema.js";

const execAsync = promisify(exec);

const LAST_SYNC_FILE = ".last_sync_commit";
const STATE_FILE = "state.json";
const STATE_VERSION = 1;

type EntityRecord = {
  description: string;
  links: string[];
  sourceFile?: string;
  lastRefined: string;
};

type ConceptRecord = {
  description: string;
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

function emptyState(): KnowledgeState {
  return { version: STATE_VERSION, entities: {}, concepts: {} };
}

export class KnowledgeManager {
  private knowledgeDir: string;

  constructor(rootDir: string) {
    this.knowledgeDir = path.join(rootDir, ".knowledge");
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

    // Always (re)render the index so the format on disk matches the current
    // renderer — including when state.json was just migrated.
    await this.updateIndex();
  }

  // ──────────────────────────────────────────────────────────────────────
  // State management
  // ──────────────────────────────────────────────────────────────────────

  private async readState(): Promise<KnowledgeState> {
    const statePath = path.join(this.knowledgeDir, STATE_FILE);
    try {
      const raw = await fs.readFile(statePath, "utf8");
      const parsed = JSON.parse(raw) as KnowledgeState;
      if (!parsed.entities) parsed.entities = {};
      if (!parsed.concepts) parsed.concepts = {};
      return parsed;
    } catch {
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
          links: extractLinks(body),
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

    const logPath = path.join(this.knowledgeDir, "log.md");
    const logEntry = `\n## [${timestamp}]\n**Summary:** ${synthesis.summary}\n**Impacted:** ${synthesis.entities.map((e) => `[[${e.name}]]`).join(", ")}\n**Warnings:** ${synthesis.warnings.join("; ") || "None"}\n---\n`;
    await fs.appendFile(logPath, logEntry);

    for (const entity of synthesis.entities) {
      const safeName = safeFilename(entity.name);
      const entityPath = path.join(this.knowledgeDir, "entities", `${safeName}.md`);

      if (entity.action === "delete") {
        delete state.entities[entity.name];
        try {
          await fs.unlink(entityPath);
        } catch {
          // already absent
        }
        continue;
      }

      state.entities[entity.name] = {
        description: entity.description,
        links: entity.links,
        sourceFile: entity.sourceFile,
        lastRefined: timestamp,
      };

      const sourceLine = entity.sourceFile
        ? `**Source:** \`${entity.sourceFile}\`\n\n`
        : "";
      const linksLine = entity.links.length
        ? entity.links.map((l) => `[[${l.replace(/[\[\]]/g, "")}]]`).join(", ")
        : "_(none)_";

      // Layered descriptions (with `## Role` / `## Interface` / etc. headings)
      // render as-is. Legacy plain descriptions keep the blockquote wrapper for
      // backward-compatible rendering.
      const body = isLayeredDescription(entity.description)
        ? entity.description.trim()
        : `> ${entity.description}`;

      const content = `# Entity: ${entity.name}\n\n${sourceLine}${body}\n\n### Relations\n- **Action:** ${entity.action}\n- **Links:** ${linksLine}\n\n---\n*Last Refined: ${timestamp}*\n`;
      await fs.writeFile(entityPath, content);
    }

    for (const concept of synthesis.concepts) {
      const safeName = safeFilename(concept.name);
      const conceptPath = path.join(this.knowledgeDir, "concepts", `${safeName}.md`);

      state.concepts[concept.name] = {
        description: concept.description,
        lastRefined: timestamp,
      };

      const content = `# Concept: ${concept.name}\n\n${concept.description}\n\n---\n*Last Refined: ${timestamp}*\n`;
      await fs.writeFile(conceptPath, content);
    }

    await this.writeState(state);
    await this.updateIndex();
  }

  // ──────────────────────────────────────────────────────────────────────
  // Index rendering — the consumer-facing surface
  // ──────────────────────────────────────────────────────────────────────

  async updateIndex() {
    const state = await this.readState();
    const conceptNames = Object.keys(state.concepts).sort();
    const entityNames = Object.keys(state.entities).sort();

    let content = `# Project Cortex: Knowledge Index\n\n`;
    content += `*Auto-generated. Read this first. Use \`read_entity\` / \`read_concept\` to drill into any name below.*\n\n`;

    content += `## Core Concepts\n\n`;
    if (conceptNames.length === 0) {
      content += `_No concepts yet._\n\n`;
    } else {
      for (const name of conceptNames) {
        const c = state.concepts[name];
        content += `### [[${name}]]\n${c.description}\n\n`;
      }
    }

    content += `## Active Entities\n\n`;
    if (entityNames.length === 0) {
      content += `_No entities yet._\n\n`;
    } else {
      for (const name of entityNames) {
        const e = state.entities[name];
        const source = e.sourceFile ? ` — \`${e.sourceFile}\`` : "";
        const links = e.links.length
          ? `\n_Links:_ ${e.links.map((l) => `[[${l.replace(/[\[\]]/g, "")}]]`).join(", ")}`
          : "";
        const indexSummary = extractRoleSection(e.description);
        content += `### [[${name}]]${source}\n${indexSummary}${links}\n\n`;
      }
    }

    await fs.writeFile(path.join(this.knowledgeDir, "index.md"), content);
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

const SECTION_HEADING_RE = /^##\s+(Role|Interface|Behavior|Wiring)\s*$/m;

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
