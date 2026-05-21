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

const PROXIMITY_BONUS_BASE = 0.01;

function computeProximityBonus(text: string, queryTokens: string[], window: number): number {
  if (queryTokens.length < 2) return 0;

  const lowerText = text.toLowerCase();
  const words = lowerText.split(/\s+/);

  const tokenIndices: number[][] = [];
  for (let wi = 0; wi < words.length; wi++) {
    const matchedTokens: number[] = [];
    for (let ti = 0; ti < queryTokens.length; ti++) {
      if (words[wi].includes(queryTokens[ti])) {
        matchedTokens.push(ti);
      }
    }
    if (matchedTokens.length > 0) {
      tokenIndices[wi] = matchedTokens;
    }
  }

  const positions = Object.keys(tokenIndices).map(Number);
  if (positions.length < 1) return 0;

  let bonus = 0;

  // Same-word bonus: multiple query tokens matching the same word (distance 0)
  for (let wi = 0; wi < tokenIndices.length; wi++) {
    if (tokenIndices[wi] && tokenIndices[wi].length >= 2) {
      const indices = tokenIndices[wi];
      for (let ti = 0; ti < indices.length; ti++) {
        for (let tj = ti + 1; tj < indices.length; tj++) {
          bonus += PROXIMITY_BONUS_BASE;
        }
      }
    }
  }

  if (positions.length < 2) return bonus;

  // Cross-word bonus: different tokens at different word positions within window
  for (let i = 0; i < positions.length; i++) {
    const pi = positions[i];
    for (let j = i + 1; j < positions.length; j++) {
      const pj = positions[j];
      const distance = pj - pi;
      if (distance > window) break;

      for (const ti of tokenIndices[pi]) {
        for (const tj of tokenIndices[pj]) {
          if (ti !== tj) {
            const decay = 1 - ((distance - 1) / (window - 1)) * 0.75;
            bonus += PROXIMITY_BONUS_BASE * decay;
          }
        }
      }
    }
  }

  return bonus;
}

function extractSnippet(text: string, queryTokens: string[], maxLength: number): string {
  const trimmed = text.trim().replace(/\n/g, " ");
  if (trimmed.length <= maxLength) return trimmed;

  const lowerText = trimmed.toLowerCase();

  const matchPositions: number[] = [];
  for (const token of queryTokens) {
    let startFrom = 0;
    while (startFrom < lowerText.length) {
      const idx = lowerText.indexOf(token, startFrom);
      if (idx === -1) break;
      matchPositions.push(idx);
      startFrom = idx + 1;
    }
  }

  if (matchPositions.length === 0) {
    return trimmed.slice(0, maxLength - 3) + "...";
  }

  matchPositions.sort((a, b) => a - b);

  const halfWindow = Math.floor(maxLength / 2);
  let bestCenter = matchPositions[0];
  let bestScore = 0;

  for (const center of matchPositions) {
    const winStart = center - halfWindow;
    const winEnd = center + halfWindow;

    let score = 1;
    for (const pos of matchPositions) {
      if (pos === center) continue;
      if (pos >= winStart && pos <= winEnd) {
        const distance = Math.abs(pos - center);
        score += Math.max(0, 1 - distance / halfWindow);
      }
    }

    const midDist = Math.abs(center - trimmed.length / 2);
    if (score > bestScore || (score === bestScore && midDist < Math.abs(bestCenter - trimmed.length / 2))) {
      bestScore = score;
      bestCenter = center;
    }
  }

  const needsPrefix = bestCenter - halfWindow > 0;
  const needsSuffix = bestCenter + halfWindow < trimmed.length;
  const ellipsisBudget = (needsPrefix ? 3 : 0) + (needsSuffix ? 3 : 0);
  const windowBudget = maxLength - ellipsisBudget;
  const adjHalf = Math.floor(windowBudget / 2);

  let start = bestCenter - adjHalf;
  let end = start + windowBudget;

  if (start < 0) {
    end -= start;
    start = 0;
  }
  if (end > trimmed.length) {
    start -= (end - trimmed.length);
    end = trimmed.length;
    start = Math.max(0, start);
  }

  let result = trimmed.slice(start, end);
  if (start > 0) result = "..." + result;
  if (end < trimmed.length) result += "...";

  return result;
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
  proximityBonus: number;
}

const DEFAULT_PROXIMITY_WINDOW = 5;
const DEFAULT_SNIPPET_LENGTH = 120;

function resolveWindow(): number {
  const raw = process.env.CORTEX_PROXIMITY_WINDOW;
  if (raw === undefined) return DEFAULT_PROXIMITY_WINDOW;
  const parsed = parseInt(raw, 10);
  return Number.isNaN(parsed) ? DEFAULT_PROXIMITY_WINDOW : Math.max(2, parsed);
}

function resolveSnippetLength(): number {
  const raw = process.env.CORTEX_SNIPPET_LENGTH;
  if (raw === undefined) return DEFAULT_SNIPPET_LENGTH;
  const parsed = parseInt(raw, 10);
  return Number.isNaN(parsed) ? DEFAULT_SNIPPET_LENGTH : Math.max(10, parsed);
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
    const proxWindow = resolveWindow();
    const snippetLength = resolveSnippetLength();

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

      const searchText = lowerName + " " + lowerDesc + " " + lowerExtra;
      const proximityBonus = queryTokens.length >= 2
        ? computeProximityBonus(searchText, queryTokens, proxWindow)
        : 0;

      candidates.push({
        name,
        description,
        type: nodeType,
        extraText,
        tokenScore,
        levensDist,
        proximityBonus
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
      rrfScore += c.proximityBonus;

      let preview = extractSnippet(c.description, queryTokens, snippetLength);

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
