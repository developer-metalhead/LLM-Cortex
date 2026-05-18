import fs from "fs/promises";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { LogEntry } from "./audit.js";

const execAsync = promisify(exec);

export interface ReplayResult {
  cutoff: string;
  entryCount: number;
  hasSnapshot: boolean;
  index: string;
  state?: { entities: Record<string, any>; concepts: Record<string, any> };
}

export class EvolutionManager {
  private knowledgeDir: string;
  private projectRoot: string;

  constructor(rootDir: string) {
    this.projectRoot = rootDir;
    this.knowledgeDir = path.join(rootDir, ".knowledge");
  }

  private async readEntries(): Promise<LogEntry[]> {
    const logJsonlPath = path.join(this.knowledgeDir, "log.jsonl");
    let content: string;
    try {
      content = await fs.readFile(logJsonlPath, "utf8");
    } catch {
      return [];
    }
    const entries: LogEntry[] = [];
    for (const line of content.split("\n")) {
      if (!line.trim()) continue;
      try {
        entries.push(JSON.parse(line));
      } catch {
        // skip corrupt line
      }
    }
    return entries;
  }

  private async resolveTimestamp(at: string): Promise<Date | null> {
    const asDate = new Date(at);
    if (!isNaN(asDate.getTime())) return asDate;
    try {
      const { stdout } = await execAsync(
        `git show -s --format=%cI ${at}`,
        { cwd: this.projectRoot },
      );
      const d = new Date(stdout.trim());
      if (!isNaN(d.getTime())) return d;
    } catch {
      // not a commit either
    }
    return null;
  }

  // Per-entity timeline. Optional --since cutoff filters older entries.
  async getEvolution(entity: string, since?: string): Promise<LogEntry[]> {
    const entries = await this.readEntries();
    let sinceDate: Date | null = null;
    if (since) {
      sinceDate = await this.resolveTimestamp(since);
      if (sinceDate === null) {
        console.error(`[cortex] --since '${since}' is neither a date nor a resolvable commit; filter ignored.`);
      }
    }
    return entries.filter((e) => {
      if (!e.entities.includes(entity) && !e.concepts.includes(entity)) return false;
      if (sinceDate && new Date(e.timestamp) < sinceDate) return false;
      return true;
    });
  }

  // Marquee feature: reconstruct the rendered index.md as it stood at `at`
  // (commit hash or ISO date). Walks the append-only log up to that point;
  // uses the `state` snapshot embedded in each JSONL entry (Phase 7+) to
  // rebuild state.json, then renders the index from it.
  //
  // Entries pre-snapshot fall back to a name-only narrative (best effort).
  async replayAt(at: string): Promise<ReplayResult> {
    const cutoff = await this.resolveTimestamp(at);
    if (cutoff === null) {
      throw new Error(`Cannot resolve '${at}' as a commit hash or ISO date.`);
    }

    const entries = await this.readEntries();
    const inRange = entries.filter((e) => new Date(e.timestamp) <= cutoff);

    // Walk backward — the LAST entry in range carries the freshest snapshot.
    let snapshot:
      | { entities: Record<string, any>; concepts: Record<string, any> }
      | undefined;
    for (let i = inRange.length - 1; i >= 0; i--) {
      if (inRange[i].state) {
        snapshot = inRange[i].state;
        break;
      }
    }

    if (snapshot) {
      const index = renderIndex(snapshot, cutoff.toISOString());
      return {
        cutoff: cutoff.toISOString(),
        entryCount: inRange.length,
        hasSnapshot: true,
        index,
        state: snapshot,
      };
    }

    // Fallback: build a name-only narrative from log entries (legacy entries
    // without snapshots).
    const entityNames = new Set<string>();
    const conceptNames = new Set<string>();
    for (const e of inRange) {
      e.entities.forEach((n) => entityNames.add(n));
      e.concepts.forEach((n) => conceptNames.add(n));
    }
    const index = renderNarrativeIndex(
      Array.from(conceptNames).sort(),
      Array.from(entityNames).sort(),
      cutoff.toISOString(),
    );
    return {
      cutoff: cutoff.toISOString(),
      entryCount: inRange.length,
      hasSnapshot: false,
      index,
    };
  }
}

function renderIndex(
  state: { entities: Record<string, any>; concepts: Record<string, any> },
  cutoff: string,
): string {
  const conceptNames = Object.keys(state.concepts ?? {}).sort();
  const entityNames = Object.keys(state.entities ?? {}).sort();

  let content = `# Project Cortex: Knowledge Index (as of ${cutoff})\n\n`;
  content += `*Replay over append-only log. Read-only projection.*\n\n`;

  content += `## Core Concepts\n\n`;
  if (conceptNames.length === 0) {
    content += `_No concepts at this point in history._\n\n`;
  } else {
    for (const name of conceptNames) {
      const c = state.concepts[name];
      content += `### [[${name}]]\n${c.description ?? ""}\n\n`;
    }
  }

  content += `## Active Entities\n\n`;
  if (entityNames.length === 0) {
    content += `_No entities at this point in history._\n\n`;
  } else {
    for (const name of entityNames) {
      const e = state.entities[name];
      const source = e.sourceFile ? ` — \`${e.sourceFile}\`` : "";
      const rels = e.relationships?.length
        ? `\n_Relationships:_ ${e.relationships.map((r: any) => `[[${r.target}]]`).join(", ")}`
        : "";
      const stale = e.staleSince ? ` **[STALE]**` : "";
      content += `### [[${name}]]${source}${stale}\n${e.description ?? ""}${rels}\n\n`;
    }
  }
  return content;
}

function renderNarrativeIndex(
  concepts: string[],
  entities: string[],
  cutoff: string,
): string {
  let content = `# Project Cortex: Knowledge Index (as of ${cutoff})\n\n`;
  content += `*Replay over legacy log (no state snapshots). Names only.*\n\n`;
  content += `## Core Concepts\n\n`;
  content += concepts.length === 0 ? `_None known._\n\n` : concepts.map((n) => `### [[${n}]]\n_(no snapshot)_\n`).join("\n") + "\n";
  content += `## Active Entities\n\n`;
  content += entities.length === 0 ? `_None known._\n\n` : entities.map((n) => `### [[${n}]]\n_(no snapshot)_\n`).join("\n") + "\n";
  return content;
}
