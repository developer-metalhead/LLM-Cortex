import fs from "fs/promises";
import path from "path";
import { createReadStream } from "fs";
import * as readline from "readline";

export type ExperienceEvent =
  | "sync"
  | "failure"
  | "success"
  | "revert"
  | "tool_call"
  | "ingest"
  | "synthesis"
  | "outcome";

export type ExperienceEntry = {
  timestamp: string;
  event: ExperienceEvent;
  details?: string;
  entity?: string;
  toolName?: string;
  success?: boolean;
  durationMs?: number;
};

const EXPERIENCE_FILE = "experience.jsonl";
const COMPACTION_THRESHOLD_BYTES = 10 * 1024 * 1024;
const SIX_MONTHS_MS = 180 * 24 * 60 * 60 * 1000;

export class ExperienceManager {
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  get experiencePath(): string {
    return path.join(this.projectRoot, ".knowledge", EXPERIENCE_FILE);
  }

  async append(entry: ExperienceEntry): Promise<void> {
    const expPath = this.experiencePath;
    const expDir = path.dirname(expPath);
    await fs.mkdir(expDir, { recursive: true });

    const line = JSON.stringify({
      ...entry,
      timestamp: entry.timestamp || new Date().toISOString(),
    }) + "\n";

    await fs.appendFile(expPath, line, "utf8");
    await this.maybeCompact();
  }

  async query(options: {
    entity?: string;
    event?: ExperienceEvent;
    since?: string;
    limit?: number;
    warningsOnly?: boolean;
  } = {}): Promise<ExperienceEntry[]> {
    const entries: ExperienceEntry[] = [];
    const sinceTime = options.since ? new Date(options.since).getTime() : 0;

    try {
      const rl = readline.createInterface({
        input: createReadStream(this.experiencePath, { encoding: "utf8" }),
        crlfDelay: Infinity,
      });

      for await (const line of rl) {
        if (!line.trim()) continue;
        try {
          const entry = JSON.parse(line) as ExperienceEntry;
          const entryTime = new Date(entry.timestamp).getTime();

          if (sinceTime > 0 && entryTime < sinceTime) continue;
          if (options.entity && entry.entity !== options.entity) continue;
          if (options.event && entry.event !== options.event) continue;

          entries.push(entry);
        } catch {
          continue;
        }
      }
    } catch {
      return entries;
    }

    if (options.limit && entries.length > options.limit) {
      return entries.slice(-options.limit);
    }

    return entries;
  }

  async getRecentFailures(entity?: string, limit: number = 10): Promise<ExperienceEntry[]> {
    return this.query({
      entity,
      event: "failure",
      limit,
    });
  }

  async getRecentOutcomes(entity?: string, limit: number = 10): Promise<ExperienceEntry[]> {
    return this.query({
      entity,
      event: "outcome",
      limit,
    });
  }

  async count(): Promise<number> {
    try {
      const stat = await fs.stat(this.experiencePath);
      if (stat.size === 0) return 0;
      const content = await fs.readFile(this.experiencePath, "utf8");
      return content.trim().split("\n").filter(l => l.trim().length > 0).length;
    } catch {
      return 0;
    }
  }

  private async maybeCompact(): Promise<void> {
    try {
      const stat = await fs.stat(this.experiencePath);
      if (stat.size < COMPACTION_THRESHOLD_BYTES) return;

      const now = Date.now();
      const cutoff = now - SIX_MONTHS_MS;
      const recent: ExperienceEntry[] = [];
      const oldEntries: ExperienceEntry[] = [];

      const rl = readline.createInterface({
        input: createReadStream(this.experiencePath, { encoding: "utf8" }),
        crlfDelay: Infinity,
      });

      for await (const line of rl) {
        if (!line.trim()) continue;
        try {
          const entry = JSON.parse(line) as ExperienceEntry;
          const entryTime = new Date(entry.timestamp).getTime();
          if (entryTime >= cutoff) {
            recent.push(entry);
          } else {
            oldEntries.push(entry);
          }
        } catch {
          recent.push(JSON.parse(line));
        }
      }

      if (oldEntries.length > 0) {
        const monthlySummary = this.buildMonthlySummary(oldEntries);
        const lines = recent.map(e => JSON.stringify(e)).join("\n") +
          "\n" + JSON.stringify(monthlySummary) + "\n";
        await fs.writeFile(this.experiencePath, lines, "utf8");
      }
    } catch {
      /* non-fatal */
    }
  }

  private buildMonthlySummary(oldEntries: ExperienceEntry[]): ExperienceEntry {
    const failures = oldEntries.filter(e => e.event === "failure").length;
    const successes = oldEntries.filter(e => e.event === "success").length;
    const reverts = oldEntries.filter(e => e.event === "revert").length;

    return {
      timestamp: new Date().toISOString(),
      event: "sync",
      details: `Compacted ${oldEntries.length} entries older than 6 months. ` +
        `Summary: ${successes} successes, ${failures} failures, ${reverts} reverts.`,
    };
  }
}
