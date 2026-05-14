import fs from "fs/promises";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { Synthesis } from "../llm/schema.js";

const execAsync = promisify(exec);

const LAST_SYNC_FILE = ".last_sync_commit";

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

  async getKnowledgeSummary(): Promise<string> {
    try {
      return await fs.readFile(path.join(this.knowledgeDir, "index.md"), "utf8");
    } catch {
      return "No existing knowledge found.";
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
      // No commits yet — write a sentinel so we know we've synced
      await fs.writeFile(path.join(this.knowledgeDir, LAST_SYNC_FILE), "no-commits", "utf8");
    }
  }

  async init() {
    await fs.mkdir(this.knowledgeDir, { recursive: true });
    await fs.mkdir(path.join(this.knowledgeDir, "entities"), { recursive: true });
    await fs.mkdir(path.join(this.knowledgeDir, "concepts"), { recursive: true });

    const indexPath = path.join(this.knowledgeDir, "index.md");
    try {
      await fs.access(indexPath);
    } catch {
      await fs.writeFile(
        indexPath,
        "# Project Cortex Knowledge Index\n\nThis index is automatically managed by Project Cortex.\n\n## Concepts\n\n## Entities\n",
        "utf8"
      );
    }
  }

  async saveSynthesis(synthesis: Synthesis) {
    const timestamp = new Date().toISOString();

    const logPath = path.join(this.knowledgeDir, "log.md");
    const logEntry = `\n## [${timestamp}]\n**Summary:** ${synthesis.summary}\n**Impacted:** ${synthesis.entities.map((e) => `[[${e.name}]]`).join(", ")}\n**Warnings:** ${synthesis.warnings.join("; ") || "None"}\n---\n`;
    await fs.appendFile(logPath, logEntry);

    for (const entity of synthesis.entities) {
      const safeName = entity.name.replace(/[/\\:*?"<>|]/g, "_");
      const entityPath = path.join(this.knowledgeDir, "entities", `${safeName}.md`);
      const content = `# Entity: ${entity.name}\n\n> ${entity.description}\n\n### Relations\n- **Action:** ${entity.action}\n- **Links:** ${entity.links.map((l) => `[[${l.replace(/[\[\]]/g, "")}]]`).join(", ")}\n\n---\n*Last Refined: ${timestamp}*`;
      await fs.writeFile(entityPath, content);
    }

    for (const concept of synthesis.concepts) {
      const safeName = concept.name.replace(/[/\\:*?"<>|]/g, "_");
      const conceptPath = path.join(this.knowledgeDir, "concepts", `${safeName}.md`);
      const content = `# Concept: ${concept.name}\n\n${concept.description}\n\n---\n*Last Refined: ${timestamp}*`;
      await fs.writeFile(conceptPath, content);
    }

    await this.updateIndex();
  }

  async updateIndex() {
    const entities = await fs.readdir(path.join(this.knowledgeDir, "entities"));
    const concepts = await fs.readdir(path.join(this.knowledgeDir, "concepts"));

    let content = `# Project Cortex: Knowledge Index\n\n*Automatically maintained by the Librarian.*\n\n`;
    content += `## Core Concepts\n`;
    for (const c of concepts) content += `- [[${c.replace(".md", "")}]]\n`;
    content += `\n## Active Entities\n`;
    for (const e of entities) content += `- [[${e.replace(".md", "")}]]\n`;

    await fs.writeFile(path.join(this.knowledgeDir, "index.md"), content);
  }
}
