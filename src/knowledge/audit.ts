import fs from "fs/promises";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface LogEntry {
  timestamp: string;
  summary: string;
  entities: string[];
  concepts: string[];
  warnings: string[];
  clustered?: boolean;
  clusterCount?: number;
  migrated?: boolean;
  state?: { entities: Record<string, any>; concepts: Record<string, any> };
}

export interface EvidenceIssue {
  entity: string;
  issue: "drift-evidence-lost" | "drift-content-changed" | "drift-source-missing";
  sourceFile: string;
  detail?: string;
}

// Levenshtein distance, capped — we bail out early once `cap` is exceeded so
// long snippets don't burn CPU when they're clearly different.
function editDistance(a: string, b: string, cap: number): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > cap) return cap + 1;
  const m = a.length, n = b.length;
  let prev = new Array(n + 1);
  let curr = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    let rowMin = curr[0];
    for (let j = 1; j <= n; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      if (curr[j] < rowMin) rowMin = curr[j];
    }
    if (rowMin > cap) return cap + 1;
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

function normalizeWhitespace(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

export class AuditManager {
  private knowledgeDir: string;
  private projectRoot: string;

  constructor(rootDir: string) {
    this.projectRoot = rootDir;
    this.knowledgeDir = path.join(rootDir, ".knowledge");
  }

  // Resolve --since: accept ISO date OR a git commit hash. Commit hashes are
  // resolved via `git show -s --format=%cI` (committer ISO date). Returns
  // null if neither parse worked, in which case the filter is skipped (caller
  // also surfaces a warning so the silent-pass bug can't recur).
  private async resolveSince(since: string): Promise<Date | null> {
    const asDate = new Date(since);
    if (!isNaN(asDate.getTime())) return asDate;
    try {
      const { stdout } = await execAsync(
        `git show -s --format=%cI ${since}`,
        { cwd: this.projectRoot },
      );
      const commitDate = new Date(stdout.trim());
      if (!isNaN(commitDate.getTime())) return commitDate;
    } catch {
      // not a commit hash either
    }
    return null;
  }

  async queryLog(options: {
    entity?: string;
    since?: string;
    warningsOnly?: boolean;
  }): Promise<LogEntry[]> {
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
        // Skip corrupt lines — one bad write shouldn't blind the whole query.
      }
    }

    let sinceDate: Date | null = null;
    if (options.since) {
      sinceDate = await this.resolveSince(options.since);
      if (sinceDate === null) {
        console.error(`[cortex] --since '${options.since}' is neither a valid date nor a resolvable commit; filter ignored.`);
      }
    }

    return entries.filter((e) => {
      if (options.entity && !e.entities.includes(options.entity) && !e.concepts.includes(options.entity)) {
        return false;
      }
      if (sinceDate && new Date(e.timestamp) < sinceDate) return false;
      if (options.warningsOnly && (!e.warnings || e.warnings.length === 0)) return false;
      return true;
    });
  }

  async auditEvidence(): Promise<EvidenceIssue[]> {
    const statePath = path.join(this.knowledgeDir, "state.json");
    const issues: EvidenceIssue[] = [];
    let state: any;
    try {
      state = JSON.parse(await fs.readFile(statePath, "utf8"));
    } catch {
      return [];
    }

    for (const [name, entity] of Object.entries<any>(state.entities ?? {})) {
      if (!entity.evidence) continue;
      for (const ev of entity.evidence) {
        const filePath = path.join(this.projectRoot, ev.sourceFile);
        let fileContent: string;
        try {
          fileContent = await fs.readFile(filePath, "utf8");
        } catch {
          issues.push({
            entity: name,
            issue: "drift-source-missing",
            sourceFile: ev.sourceFile,
            detail: "File does not exist at HEAD.",
          });
          continue;
        }

        if (!ev.content) continue; // pointer-only evidence — nothing to compare

        // Prefer line-range comparison when available; fall back to
        // whole-file search.
        const snippet = ev.content as string;
        const fileLines = fileContent.split("\n");
        let target: string | null = null;
        if (
          ev.lineRange &&
          Array.isArray(ev.lineRange) &&
          ev.lineRange.length === 2 &&
          ev.lineRange[0] >= 1 &&
          ev.lineRange[1] <= fileLines.length
        ) {
          target = fileLines.slice(ev.lineRange[0] - 1, ev.lineRange[1]).join("\n");
        }

        const normSnippet = normalizeWhitespace(snippet);
        if (target !== null) {
          const normTarget = normalizeWhitespace(target);
          // Tolerance: 10% of snippet length, min 5, max 50 characters.
          const cap = Math.min(50, Math.max(5, Math.floor(normSnippet.length / 10)));
          if (editDistance(normSnippet, normTarget, cap) > cap) {
            issues.push({
              entity: name,
              issue: "drift-content-changed",
              sourceFile: ev.sourceFile,
              detail: `Cited lines ${ev.lineRange[0]}-${ev.lineRange[1]} no longer match (edit distance > ${cap}).`,
            });
          }
        } else {
          // No lineRange — only check that the normalized snippet still
          // appears somewhere in the file (legacy compat).
          if (!normalizeWhitespace(fileContent).includes(normSnippet)) {
            issues.push({
              entity: name,
              issue: "drift-evidence-lost",
              sourceFile: ev.sourceFile,
              detail: "Snippet no longer found in file (no lineRange recorded).",
            });
          }
        }
      }
    }
    return issues;
  }

  // Count for cortex status — separated so status doesn't pay the per-issue
  // detail-building cost.
  async getEvidenceDriftCount(): Promise<number> {
    const issues = await this.auditEvidence();
    return issues.length;
  }
}
