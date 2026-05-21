import fs from "fs";
import path from "path";
import crypto from "crypto";
import { estimateTokens } from "../knowledge/packer.js";

const DEFAULT_PROXIMITY_WINDOW = 5;
const DEFAULT_SNIPPET_LENGTH = 120;

interface CacheEntry {
  content: string;
  skeleton: string;
  mtime: number;
  readCount: number;
  lastAccessed: number;
  language: string;
}

export interface CacheResult {
  content: string;
  mode: "full" | "skeleton" | "diff";
  cacheStatus: "first_read" | "cached_skeleton" | "delta" | "fallback_full";
  originalChars: number;
  returnedChars: number;
  tokenSavings: number;
  filePath: string;
}

export interface CacheStats {
  cachedFiles: number;
  totalReads: number;
  totalSavingsChars: number;
}

export class SmartReadCache {
  private store = new Map<string, CacheEntry>();
  private maxEntries = 50;
  private totalReads = 0;
  private totalSavingsChars = 0;

  get(filePath: string, mode: "auto" | "full" | "skeleton" | "diff" = "auto", displayPath?: string): CacheResult {
    const resolved = path.resolve(filePath);
    const display = displayPath || filePath;

    if (!fs.existsSync(resolved)) {
      return {
        content: `Error: file not found — ${display}`,
        mode: "full",
        cacheStatus: "fallback_full",
        originalChars: 0,
        returnedChars: 0,
        tokenSavings: 0,
        filePath: display,
      };
    }

    const stat = fs.statSync(resolved);
    const fileSize = stat.size;

    // Skip caching for binary files (>1MB or binary extension)
    const ext = path.extname(resolved).toLowerCase();
    const binaryExts = new Set([".png", ".jpg", ".jpeg", ".gif", ".bmp", ".ico", ".exe", ".dll", ".so", ".dylib", ".zip", ".tar", ".gz", ".bin", ".wasm"]);
    if (binaryExts.has(ext) || fileSize > 1_048_576) {
      const content = fs.readFileSync(resolved, "utf-8");
      return {
        content,
        mode: "full",
        cacheStatus: "fallback_full",
        originalChars: content.length,
        returnedChars: content.length,
        tokenSavings: 0,
        filePath: display,
      };
    }

    const existing = this.store.get(resolved);

    // First read
    if (!existing) {
      const content = fs.readFileSync(resolved, "utf-8");
      const lang = this.detectLanguage(ext);
      const skeleton = this.extractSkeleton(content, lang, display);
      this.store.set(resolved, {
        content,
        skeleton,
        mtime: stat.mtimeMs,
        readCount: 1,
        lastAccessed: Date.now(),
        language: lang,
      });
      this.enforceLimit();
      this.totalReads++;
      return {
        content,
        mode: "full",
        cacheStatus: "first_read",
        originalChars: content.length,
        returnedChars: content.length,
        tokenSavings: 0,
        filePath: display,
      };
    }

    const currentMtime = stat.mtimeMs;

    // Re-read unchanged
    if (currentMtime === existing.mtime) {
      existing.readCount++;
      existing.lastAccessed = Date.now();
      this.totalReads++;

      if (mode === "full") {
        return {
          content: existing.content,
          mode: "full",
          cacheStatus: "cached_skeleton",
          originalChars: existing.content.length,
          returnedChars: existing.content.length,
          tokenSavings: 0,
            filePath: display,
        };
      }

      if (mode === "skeleton" || mode === "auto") {
        // Bypass: skeleton is too large compared to full file
        if (existing.skeleton.length > existing.content.length * 0.7) {
          this.totalSavingsChars += 0;
          return {
            content: existing.content,
            mode: "full",
            cacheStatus: "fallback_full",
            originalChars: existing.content.length,
            returnedChars: existing.content.length,
            tokenSavings: 0,
            filePath: display,
          };
        }
        const savings = existing.content.length - existing.skeleton.length;
        this.totalSavingsChars += savings;
        return {
          content: existing.skeleton,
          mode: "skeleton",
          cacheStatus: "cached_skeleton",
          originalChars: existing.content.length,
          returnedChars: existing.skeleton.length,
          tokenSavings: savings,
            filePath: display,
        };
      }

      // mode === "diff" on unchanged file — return empty diff
      return {
        content: "(file unchanged since last read)",
        mode: "diff",
        cacheStatus: "delta",
        originalChars: existing.content.length,
        returnedChars: 0,
        tokenSavings: existing.content.length,
        filePath: display,
      };
    }

    // Re-read changed — compute diff
    const freshContent = fs.readFileSync(resolved, "utf-8");
    if (mode === "full") {
      return {
        content: freshContent,
        mode: "full",
        cacheStatus: "delta",
        originalChars: freshContent.length,
        returnedChars: freshContent.length,
        tokenSavings: 0,
        filePath: display,
      };
    }

    const diff = this.computeDiff(existing.content, freshContent, display);
    const diffLen = diff.length;
    const skeleton = this.extractSkeleton(freshContent, existing.language, display);

    // Bypass: diff is too large
    if (diffLen > 1500) {
      this.store.set(resolved, {
        content: freshContent,
        skeleton,
        mtime: currentMtime,
        readCount: existing.readCount + 1,
        lastAccessed: Date.now(),
        language: existing.language,
      });
      this.totalReads++;
      return {
        content: freshContent,
        mode: "full",
        cacheStatus: "fallback_full",
        originalChars: freshContent.length,
        returnedChars: freshContent.length,
        tokenSavings: 0,
        filePath: display,
      };
    }

    const savings = freshContent.length - diffLen;
    this.totalSavingsChars += Math.max(0, savings);
    this.store.set(resolved, {
      content: freshContent,
      skeleton,
      mtime: currentMtime,
      readCount: existing.readCount + 1,
      lastAccessed: Date.now(),
      language: existing.language,
    });
    this.totalReads++;
    return {
      content: diff,
      mode: "diff",
      cacheStatus: "delta",
      originalChars: freshContent.length,
      returnedChars: diffLen,
      tokenSavings: Math.max(0, savings),
      filePath: display,
    };
  }

  invalidate(filePath: string): void {
    this.store.delete(path.resolve(filePath));
  }

  invalidateAll(): void {
    this.store.clear();
  }

  stats(): CacheStats {
    return {
      cachedFiles: this.store.size,
      totalReads: this.totalReads,
      totalSavingsChars: this.totalSavingsChars,
    };
  }

  private enforceLimit(): void {
    if (this.store.size <= this.maxEntries) return;
    let oldest: string | null = null;
    let oldestTime = Infinity;
    for (const [key, entry] of this.store) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldest = key;
      }
    }
    if (oldest) this.store.delete(oldest);
  }

  private detectLanguage(ext: string): string {
    const langMap: Record<string, string> = {
      ".ts": "ts", ".tsx": "tsx", ".js": "js", ".jsx": "jsx",
      ".mjs": "js", ".cjs": "js", ".mts": "ts", ".cts": "ts",
      ".py": "py", ".go": "go", ".rs": "rs", ".java": "java",
      ".rb": "rb", ".php": "php", ".swift": "swift", ".kt": "kt",
    };
    return langMap[ext] || "other";
  }

  private extractSkeleton(content: string, lang: string, filePath: string): string {
    const lines = content.split("\n");

    if (lang === "other" || lines.length < 5) {
      return this.fallbackSkeleton(lines, filePath);
    }

    try {
      switch (lang) {
        case "ts":
        case "tsx":
        case "js":
        case "jsx":
          return this.extractTsJsSkeleton(content, lines, lang, filePath);
        case "py":
          return this.extractPythonSkeleton(lines);
        default:
          return this.extractGenericSkeleton(lines, lang);
      }
    } catch {
      return this.fallbackSkeleton(lines, filePath);
    }
  }

  private extractTsJsSkeleton(content: string, lines: string[], lang: string, filePath: string): string {
    const result: string[] = [];
    const comment = lang.startsWith("ts") ? "//" : "//";

    result.push(`${comment} ${path.basename(filePath) || "file"} — ${lines.length} lines (cached skeleton)`);
    result.push("");

    // Extract imports
    const importRe = /^(import\s+.*?from\s+['"][^'"]+['"]|import\s+['"][^'"]+['"])\s*;?\s*$/;
    const imports = new Set<string>();
    for (const line of lines) {
      const trimmed = line.trim();
      const m = trimmed.match(importRe);
      if (m) imports.add(m[1]);
    }
    if (imports.size > 0) {
      for (const imp of imports) result.push(imp);
      result.push("");
    }

    // Extract structural declarations
    const declRe = /^(export\s+)?(abstract\s+)?(class|interface|type|enum|function|const|let|var)\s+(\w+)/;
    const seen = new Set<string>();
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*")) continue;
      const m = trimmed.match(declRe);
      if (m) {
        const key = m[4];
        if (!seen.has(key)) {
          seen.add(key);
          // For classes and functions, include the opening line (signature)
          const sigLine = trimmed.split("{")[0].trim();
          result.push(sigLine);
        }
      }
    }

    if (result.length <= 2) return this.fallbackSkeleton(lines, content);
    return result.join("\n");
  }

  private extractPythonSkeleton(lines: string[]): string {
    const result: string[] = [];
    result.push(`# ${lines.length} lines (cached skeleton)\n`);

    const imports: string[] = [];
    const decls: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (/^(import |from .* import)/.test(trimmed)) {
        if (!imports.includes(trimmed)) imports.push(trimmed);
      } else if (/^(async\s+)?def \w+|^class \w+|^@\w+/.test(trimmed)) {
        decls.push(trimmed);
      }
    }

    if (imports.length > 0) result.push(...imports, "");
    if (decls.length > 0) result.push(...decls);

    if (result.length <= 2) return lines.slice(0, 15).join("\n");
    return result.join("\n");
  }

  private extractGenericSkeleton(lines: string[], lang: string): string {
    const patterns: Record<string, RegExp[]> = {
      go: [/^func\s+\w+/, /^type\s+\w+/, /^struct/, /^interface/],
      rs: [/^fn\s+\w+/, /^pub\s+(fn|struct|enum|trait|mod|type)/, /^struct\s+\w+/, /^enum\s+\w+/, /^impl/],
      java: [/^(public|private|protected|static)?\s*(class|interface|enum|record)\s+\w+/, /^import\s+/],
      rb: [/^(def |class |module |attr_|include |extend )/],
    };

    const result: string[] = [];
    const rex = patterns[lang] || [];
    const seen = new Set<string>();

    result.push(`// ${lines.length} lines (cached skeleton)\n`);

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      for (const re of rex) {
        if (re.test(trimmed) && !seen.has(trimmed)) {
          seen.add(trimmed);
          result.push(trimmed);
        }
      }
    }

    if (result.length <= 2) return this.fallbackSkeleton(lines, lines.join("\n"));
    return result.join("\n");
  }

  private fallbackSkeleton(lines: string[], source: string): string {
    if (lines.length <= 15) return source;
    const header = lines.slice(0, 1).filter(Boolean);
    const content = lines.slice(0, 15);
    return [...header, `${content.length} lines (first 15 of ${lines.length})`, "", ...content].join("\n");
  }

  private computeDiff(oldContent: string, newContent: string, filePath: string): string {
    const oldLines = oldContent.split("\n");
    const newLines = newContent.split("\n");

    const diff: string[] = [];
    diff.push(`--- ${filePath}`);
    diff.push(`+++ ${filePath}`);

    let i = 0;
    let j = 0;

    while (i < oldLines.length || j < newLines.length) {
      if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
        i++;
        j++;
      } else {
        let matchI = -1;
        let matchJ = -1;
        let found = false;

        for (let limit = 1; limit <= 50; limit++) {
          if (i + limit < oldLines.length && j < newLines.length && oldLines[i + limit] === newLines[j]) {
            matchI = i + limit;
            matchJ = j;
            found = true;
            break;
          }
          if (i < oldLines.length && j + limit < newLines.length && oldLines[i] === newLines[j + limit]) {
            matchI = i;
            matchJ = j + limit;
            found = true;
            break;
          }
        }

        if (found) {
          if (i < matchI) {
            diff.push(`@@ -${i + 1},${matchI - i} +${j + 1},0 @@`);
            for (let k = i; k < matchI; k++) {
              diff.push(`-${oldLines[k]}`);
            }
          }
          if (j < matchJ) {
            diff.push(`@@ -${i + 1},0 +${j + 1},${matchJ - j} @@`);
            for (let k = j; k < matchJ; k++) {
              diff.push(`+${newLines[k]}`);
            }
          }
          i = matchI;
          j = matchJ;
        } else {
          if (i < oldLines.length && j < newLines.length) {
            diff.push(`@@ -${i + 1},1 +${j + 1},1 @@`);
            diff.push(`-${oldLines[i]}`);
            diff.push(`+${newLines[j]}`);
            i++;
            j++;
          } else if (i < oldLines.length) {
            diff.push(`@@ -${i + 1},${oldLines.length - i} +${j + 1},0 @@`);
            for (let k = i; k < oldLines.length; k++) {
              diff.push(`-${oldLines[k]}`);
            }
            i = oldLines.length;
          } else if (j < newLines.length) {
            diff.push(`@@ -${i + 1},0 +${j + 1},${newLines.length - j} @@`);
            for (let k = j; k < newLines.length; k++) {
              diff.push(`+${newLines[k]}`);
            }
            j = newLines.length;
          }
        }
      }
    }

    if (diff.length <= 2) return "(file unchanged)";
    return diff.join("\n");
  }
}
