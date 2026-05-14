import fs from 'fs/promises';
import path from 'path';
import { Synthesis } from '../llm/client.js';

export class KnowledgeManager {
  private knowledgeDir: string;

  constructor(rootDir: string) {
    this.knowledgeDir = path.join(rootDir, '.knowledge');
  }

  /**
   * Initializes the .knowledge directory if it doesn't exist.
   */
  async init() {
    try {
      await fs.mkdir(this.knowledgeDir, { recursive: true });
      await fs.mkdir(path.join(this.knowledgeDir, 'entities'), { recursive: true });
      await fs.mkdir(path.join(this.knowledgeDir, 'concepts'), { recursive: true });
      
      // Create index.md if it doesn't exist
      const indexPath = path.join(this.knowledgeDir, 'index.md');
      try {
        await fs.access(indexPath);
      } catch {
        await fs.writeFile(indexPath, '# Project Cortex Knowledge Index\n\nThis index is automatically managed by Project Cortex.\n\n## 🧩 Concepts\n\n## 📄 Entities\n');
      }
    } catch (error) {
      console.error('❌ Failed to initialize Knowledge directory:', error);
    }
  }

  /**
   * Persists a synthesis result into the knowledge base.
   */
  async saveSynthesis(synthesis: Synthesis) {
    const timestamp = new Date().toISOString();
    
    try {
      // 1. Update Log
      const logPath = path.join(this.knowledgeDir, 'log.md');
      const logEntry = `\n### [${timestamp}] ${synthesis.summary}\n\n**Warnings:** ${synthesis.warnings.join(', ') || 'None'}\n`;
      await fs.appendFile(logPath, logEntry);

      // 2. Write Entities
      for (const entity of synthesis.entities) {
        const entityPath = path.join(this.knowledgeDir, 'entities', `${entity.name}.md`);
        const content = `# Entity: ${entity.name}\n\n**Action:** ${entity.action}\n**Description:** ${entity.description}\n\n**Links:** ${entity.links.join(', ')}\n\n--- \n*Last updated: ${timestamp}*`;
        await fs.writeFile(entityPath, content);
      }

      // 3. Write Concepts
      for (const concept of synthesis.concepts) {
        const conceptPath = path.join(this.knowledgeDir, 'concepts', `${concept.name}.md`);
        const content = `# Concept: ${concept.name}\n\n${concept.description}\n\n--- \n*Last updated: ${timestamp}*`;
        await fs.writeFile(conceptPath, content);
      }

      console.log(`💾 Knowledge Base updated successfully.`);
    } catch (error) {
      console.error('❌ Error saving synthesis to knowledge base:', error);
    }
  }
}
