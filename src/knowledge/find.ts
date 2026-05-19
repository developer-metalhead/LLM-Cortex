import { KnowledgeManager } from "./writer.js";

export interface FindResult {
  name: string;
  type: "entity" | "concept" | "parent";
  preview: string;
  score: number; // For ranking
}

export class FindManager {
  private manager: KnowledgeManager;

  constructor(manager: KnowledgeManager) {
    this.manager = manager;
  }

  async find(type: "entity" | "concept" | "parent" | "all", query: string): Promise<FindResult[]> {
    const state = await this.manager.getState();
    const results: FindResult[] = [];
    const lowerQuery = query.toLowerCase().trim();
    const queryTokens = lowerQuery.split(/\s+/).filter(t => t.length > 0);

    if (queryTokens.length === 0) {
      return [];
    }

    // Helper to evaluate matching score and generate preview
    const checkMatch = (name: string, description: string, nodeType: "entity" | "concept" | "parent", extraText: string = ""): FindResult | null => {
      const lowerName = name.toLowerCase();
      const lowerDesc = description.toLowerCase();
      const lowerExtra = extraText.toLowerCase();

      let matched = false;
      let score = 0;

      // 1. Exact name match gets highest priority
      if (lowerName === lowerQuery) {
        matched = true;
        score += 1000;
      }
      // 2. Substring name match
      else if (lowerName.includes(lowerQuery)) {
        matched = true;
        score += 500;
      }
      // 3. Token-based name matches
      else {
        const nameHits = queryTokens.filter(t => lowerName.includes(t)).length;
        if (nameHits > 0) {
          matched = true;
          score += 100 * nameHits;
        }
      }

      // Description token matches
      const descHits = queryTokens.filter(t => lowerDesc.includes(t)).length;
      if (descHits > 0) {
        matched = true;
        score += 10 * descHits;
      }

      // Extra text (evidence/source) token matches
      const extraHits = queryTokens.filter(t => lowerExtra.includes(t)).length;
      if (extraHits > 0) {
        matched = true;
        score += 2 * extraHits;
      }

      if (!matched) {
        return null;
      }

      // Build a premium one-line preview: take first sentence or first 120 characters
      let preview = description.trim();
      const firstPeriod = preview.indexOf(".");
      if (firstPeriod !== -1 && firstPeriod > 10 && firstPeriod < 150) {
        preview = preview.slice(0, firstPeriod + 1);
      } else if (preview.length > 120) {
        preview = preview.slice(0, 120) + "...";
      }
      preview = preview.replace(/\n/g, " ");

      return {
        name,
        type: nodeType,
        preview,
        score
      };
    };

    // Scan entities
    if (type === "entity" || type === "all") {
      for (const [name, e] of Object.entries(state.entities)) {
        let extraText = e.sourceFile || "";
        if (e.evidence) {
          extraText += " " + e.evidence.map(ev => ev.content || "").join(" ");
        }
        const match = checkMatch(name, e.description, "entity", extraText);
        if (match) results.push(match);
      }
    }

    // Scan concepts / parents
    if (type === "concept" || type === "parent" || type === "all") {
      for (const [name, c] of Object.entries(state.concepts)) {
        const isParent = name.endsWith("/") || (c.relationships && c.relationships.some(r => r.kind === "parent_of"));
        const actualType = isParent ? "parent" : "concept";

        if (type === "all" || type === actualType) {
          const match = checkMatch(name, c.description, actualType);
          if (match) results.push(match);
        }
      }
    }

    // Sort descending by score, then alphabetically by name
    return results.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.name.localeCompare(b.name);
    });
  }
}
