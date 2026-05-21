import { KnowledgeManager } from "./writer.js";

export interface FindResult {
  name: string;
  type: "entity" | "concept" | "parent";
  preview: string;
  score: number; // For ranking
}

function getLevenshteinDistance(a: string, b: string, maxThreshold: number = 3): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  if (Math.abs(a.length - b.length) > maxThreshold) return Infinity;

  // Make 'a' the shorter string to minimize space
  if (a.length > b.length) {
    const temp = a;
    a = b;
    b = temp;
  }

  let prevRow = new Array(a.length + 1);
  let currRow = new Array(a.length + 1);

  for (let i = 0; i <= a.length; i++) prevRow[i] = i;

  for (let j = 1; j <= b.length; j++) {
    currRow[0] = j;
    let minCostInRow = currRow[0];

    for (let i = 1; i <= a.length; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      currRow[i] = Math.min(
        currRow[i - 1] + 1,      // insertion
        prevRow[i] + 1,          // deletion
        prevRow[i - 1] + cost    // substitution
      );
      if (currRow[i] < minCostInRow) minCostInRow = currRow[i];
    }

    // Early bailout if the minimum cost in this row exceeds threshold
    if (minCostInRow > maxThreshold) return Infinity;

    const tempRow = prevRow;
    prevRow = currRow;
    currRow = tempRow;
  }

  return prevRow[a.length] <= maxThreshold ? prevRow[a.length] : Infinity;
}

interface Candidate {
  name: string;
  description: string;
  type: "entity" | "concept" | "parent";
  extraText: string;
  tokenScore: number;
  levensDist: number;
  tokenRank?: number;
  fuzzyRank?: number;
}

export class FindManager {
  private manager: KnowledgeManager;

  constructor(manager: KnowledgeManager) {
    this.manager = manager;
  }

  async find(type: "entity" | "concept" | "parent" | "all", query: string): Promise<FindResult[]> {
    const state = await this.manager.getState();
    const lowerQuery = query.toLowerCase().trim();
    const queryTokens = lowerQuery.split(/\s+/).filter(t => t.length > 0);
    const queryForFuzzy = lowerQuery.replace(/\s+/g, '');

    if (queryTokens.length === 0) {
      return [];
    }

    const candidates: Candidate[] = [];

    const evaluateCandidate = (name: string, description: string, nodeType: "entity" | "concept" | "parent", extraText: string = "") => {
      const lowerName = name.toLowerCase();
      const lowerDesc = description.toLowerCase();
      const lowerExtra = extraText.toLowerCase();

      let tokenScore = 0;

      // 1. Exact name match gets highest priority
      if (lowerName === lowerQuery) {
        tokenScore += 1000;
      }
      // 2. Substring name match
      else if (lowerName.includes(lowerQuery)) {
        tokenScore += 500;
      }
      // 3. Token-based name matches
      else {
        const nameHits = queryTokens.filter(t => lowerName.includes(t)).length;
        if (nameHits > 0) {
          tokenScore += 100 * nameHits;
        }
      }

      // Description token matches
      const descHits = queryTokens.filter(t => lowerDesc.includes(t)).length;
      if (descHits > 0) {
        tokenScore += 10 * descHits;
      }

      // Extra text (evidence/source) token matches
      const extraHits = queryTokens.filter(t => lowerExtra.includes(t)).length;
      if (extraHits > 0) {
        tokenScore += 2 * extraHits;
      }

      // Fuzzy / Levenshtein matching
      let levensDist = Infinity;
      const nameForFuzzy = lowerName.replace(/\s+/g, '');
      // Only compute if length difference is small enough to potentially be a typo
      if (Math.abs(nameForFuzzy.length - queryForFuzzy.length) <= 3) {
        levensDist = getLevenshteinDistance(queryForFuzzy, nameForFuzzy, 3);
      }

      // If it doesn't match either token-wise or fuzzy-wise (distance > 3), skip it
      if (tokenScore === 0 && levensDist > 3) {
        return;
      }

      candidates.push({
        name,
        description,
        type: nodeType,
        extraText,
        tokenScore,
        levensDist
      });
    };

    // Scan entities
    if (type === "entity" || type === "all") {
      for (const [name, e] of Object.entries(state.entities)) {
        let extraText = e.sourceFile || "";
        if (e.evidence) {
          extraText += " " + e.evidence.map(ev => ev.content || "").join(" ");
        }
        evaluateCandidate(name, e.description, "entity", extraText);
      }
    }

    // Scan concepts / parents
    if (type === "concept" || type === "parent" || type === "all") {
      for (const [name, c] of Object.entries(state.concepts)) {
        const isParent = name.endsWith("/") || (c.relationships && c.relationships.some(r => r.kind === "parent_of"));
        const actualType = isParent ? "parent" : "concept";

        if (type === "all" || type === actualType) {
          evaluateCandidate(name, c.description, actualType);
        }
      }
    }

    // Reciprocal Rank Fusion (RRF)
    // 1. Rank by tokenScore (descending) in-place
    candidates.sort((a, b) => {
      if (b.tokenScore !== a.tokenScore) return b.tokenScore - a.tokenScore;
      return a.name.localeCompare(b.name);
    });
    
    let currentRank = 1;
    for (let i = 0; i < candidates.length; i++) {
      if (candidates[i].tokenScore > 0) {
        candidates[i].tokenRank = currentRank++;
      }
    }

    // 2. Rank by levensDist (ascending) in-place
    candidates.sort((a, b) => {
      if (a.levensDist !== b.levensDist) return a.levensDist - b.levensDist;
      return a.name.localeCompare(b.name);
    });

    currentRank = 1;
    for (let i = 0; i < candidates.length; i++) {
      if (candidates[i].levensDist <= 3) {
        candidates[i].fuzzyRank = currentRank++;
      }
    }

    // 3. Compute RRF Score and build final results
    const results: FindResult[] = [];
    const RRF_CONSTANT = 60;

    for (const c of candidates) {
      if (!c.tokenRank && !c.fuzzyRank) continue;

      let rrfScore = 0;
      if (c.tokenRank) rrfScore += 1 / (RRF_CONSTANT + c.tokenRank);
      if (c.fuzzyRank) rrfScore += 1 / (RRF_CONSTANT + c.fuzzyRank);

      // Build a premium one-line preview: take first sentence or first 120 characters
      let preview = c.description.trim();
      const firstPeriod = preview.indexOf(".");
      if (firstPeriod !== -1 && firstPeriod > 10 && firstPeriod < 150) {
        preview = preview.slice(0, firstPeriod + 1);
      } else if (preview.length > 120) {
        preview = preview.slice(0, 120) + "...";
      }
      preview = preview.replace(/\n/g, " ");

      results.push({
        name: c.name,
        type: c.type,
        preview,
        score: rrfScore
      });
    }

    // Sort descending by score, then alphabetically by name
    return results.sort((a, b) => {
      if (Math.abs(b.score - a.score) > 0.0000001) {
        return b.score - a.score;
      }
      return a.name.localeCompare(b.name);
    });
  }
}
