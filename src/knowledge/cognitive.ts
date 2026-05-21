import { CognitiveLens, SoulEngine, MemoryNode, MemoryNodeType } from "./soul.js";

export interface RerankableItem {
  name: string;
  type: string;
  score?: number;
  description?: string;
  sourceFile?: string;
  nodeType?: MemoryNodeType;
}

const LENS_NODE_BOOST: Record<CognitiveLens, Partial<Record<MemoryNodeType, number>>> = {
  ENGINEERING: { decision: 1.3 },
  FORENSIC: { failure: 1.5 },
  STRATEGIC: {},
  CREATIVE: { insight: 1.4 },
  EXECUTION: { decision: 1.5 },
};

const LENS_NODE_PENALTY: Record<CognitiveLens, Partial<Record<MemoryNodeType, number>>> = {
  ENGINEERING: {},
  FORENSIC: {},
  STRATEGIC: {},
  CREATIVE: {},
  EXECUTION: { insight: 0.8 },
};

export function computeLensBoost(
  item: RerankableItem,
  lens: CognitiveLens,
  soulEngine?: SoulEngine,
): number {
  let boost = 1.0;

  const lensBoost = LENS_NODE_BOOST[lens];
  if (lensBoost && item.nodeType && lensBoost[item.nodeType]) {
    boost *= lensBoost[item.nodeType]!;
  }

  const lensPenalty = LENS_NODE_PENALTY[lens];
  if (lensPenalty && item.nodeType && lensPenalty[item.nodeType]) {
    boost *= lensPenalty[item.nodeType]!;
  }

  if (soulEngine) {
    const soul = soulEngine.getState();
    const matchingNodes = soulEngine.getNodes().filter(
      (n: MemoryNode) => n.metadata.source === item.name || n.metadata.source === item.sourceFile,
    );

    for (const node of matchingNodes) {
      if (node.type === "failure") {
        boost *= (2.0 - soul.globalBiases.riskTolerance);
      }
      if (node.type === "insight") {
        boost *= (1.0 + soul.globalBiases.creativityBias);
      }
    }
  }

  return boost;
}

export function rerankFindResults<T extends RerankableItem>(
  results: T[],
  lens: CognitiveLens,
  soulEngine?: SoulEngine,
): T[] {
  if (results.length === 0) return results;

  const scored = results.map(item => ({
    item,
    boost: computeLensBoost(item, lens, soulEngine),
  }));

  scored.sort((a, b) => {
    const aScore = (a.item.score ?? 0) * a.boost;
    const bScore = (b.item.score ?? 0) * b.boost;
    if (Math.abs(bScore - aScore) > 0.0000001) return bScore - aScore;
    return a.item.name.localeCompare(b.item.name);
  });

  return scored.map(s => s.item);
}

export function rerankContextPackNodes<T extends RerankableItem>(
  nodes: T[],
  lens: CognitiveLens,
  soulEngine?: SoulEngine,
): T[] {
  if (nodes.length === 0) return nodes;

  const scored = nodes.map(item => ({
    item,
    boost: computeLensBoost(item, lens, soulEngine),
  }));

  scored.sort((a, b) => {
    const aScore = (a.item.score ?? 1.0) * a.boost;
    const bScore = (b.item.score ?? 1.0) * b.boost;
    if (Math.abs(bScore - aScore) > 0.0000001) return bScore - aScore;
    return a.item.name.localeCompare(b.item.name);
  });

  return scored.map(s => s.item);
}

export function detectLensFromDiff(diff: string): CognitiveLens | null {
  if (!diff) return null;

  const lowerDiff = diff.toLowerCase();

  const emergencyPatterns = [
    /^(fix|hotfix|patch|bug)/im,
    /#\d+\s+(fix|bug|crash|regression)/i,
  ];
  if (emergencyPatterns.some(p => p.test(lowerDiff))) {
    return "FORENSIC";
  }

  const planningPatterns = [
    /^(plan|design|proposal|arch)/im,
    /refactor/i,
    /migrate/i,
  ];
  if (planningPatterns.some(p => p.test(lowerDiff))) {
    return "STRATEGIC";
  }

  const creativePatterns = [
    /^(draft|explore|experiment|feat)/im,
    /poc/i,
    /prototype/i,
  ];
  if (creativePatterns.some(p => p.test(lowerDiff))) {
    return "CREATIVE";
  }

  return null;
}
