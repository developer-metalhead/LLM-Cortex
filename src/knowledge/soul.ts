import fs from "fs/promises";
import path from "path";

export type CognitiveLens = "ENGINEERING" | "FORENSIC" | "STRATEGIC" | "CREATIVE" | "EXECUTION";

export type MemoryNodeType = "decision" | "event" | "insight" | "failure" | "success";

export type MemoryEdgeType = "causal" | "contradiction" | "reinforcement" | "dependency" | "association";

export type MemoryNode = {
  id: string;
  type: MemoryNodeType;
  content: string;
  timestamp: number;
  embedding?: number[];
  metadata: {
    domain?: string;
    source?: string;
  };
  weights: {
    salience: number;
    successBias: number;
    failureBias: number;
    decay: number;
    certainty: number;
    credibility: number;
    energy: number;
  };
};

export type MemoryEdge = {
  from: string;
  to: string;
  type: MemoryEdgeType;
  strength: number;
};

export type SoulState = {
  globalBiases: {
    riskTolerance: number;
    creativityBias: number;
    precisionBias: number;
  };
  memoryWeightMultiplier: Record<string, number>;
};

export type SoulProfile = {
  disallowedLibraries?: string[];
  riskTolerance?: number;
  creativityBias?: number;
  precisionBias?: number;
  brevityStyle?: "off" | "lite" | "ultra";
};

export type LedgerEntry = {
  timestamp: string;
  event: string;
  toolName?: string;
  details?: string;
  success?: boolean;
};

export interface RetrieveCandidate {
  node: MemoryNode;
  score: number;
}

const ALL_LENSES: CognitiveLens[] = ["ENGINEERING", "FORENSIC", "STRATEGIC", "CREATIVE", "EXECUTION"];

function getLensWeight(node: MemoryNode, lens: CognitiveLens): number {
  switch (lens) {
    case "ENGINEERING": return node.type === "decision" ? 1.2 : 1.0;
    case "FORENSIC":    return node.type === "failure" ? 1.5 : 1.0;
    case "STRATEGIC":   return node.metadata.domain ? 1.3 : 1.0;
    case "CREATIVE":    return node.type === "insight" ? 1.4 : 1.1;
    case "EXECUTION":   return node.type === "decision" ? 1.5 : 0.8;
    default:            return 1.0;
  }
}

function getSoulBias(node: MemoryNode, soul: SoulState): number {
  let bias = 1.0;
  if (node.type === "failure") bias *= (2.0 - soul.globalBiases.riskTolerance);
  if (node.type === "insight") bias *= (1.0 + soul.globalBiases.creativityBias);
  return bias;
}

export class SoulEngine {
  private projectRoot: string;
  private state: SoulState;
  private nodes: Map<string, MemoryNode>;
  private edges: MemoryEdge[];
  private profile: SoulProfile;
  private ledger: LedgerEntry[];
  private dirty: boolean;
  private lockRetries: number = 3;
  private lockRetryDelay: number = 200;

  private async acquireLock(): Promise<void> {
    const lockPath = this.lockPath();
    for (let attempt = 0; attempt < this.lockRetries; attempt++) {
      try {
        const stat = await fs.stat(lockPath);
        const age = Date.now() - stat.mtimeMs;
        if (age < 30_000) {
          if (attempt < this.lockRetries - 1) {
            await new Promise(r => setTimeout(r, this.lockRetryDelay));
            continue;
          }
          throw new Error("Soul state lock held by another process — try again later");
        }
        // Stale lock — reclaim
      } catch (err: any) {
        if (err.code === "ENOENT") {
          // Lock file doesn't exist — we can create it
        } else if (err.message?.includes("held by another process")) {
          throw err;
        }
        // On ENOENT or other errors, attempt to write the lock
      }
      try {
        await fs.writeFile(lockPath, String(process.pid), "utf8");
        return;
      } catch {
        if (attempt < this.lockRetries - 1) {
          await new Promise(r => setTimeout(r, this.lockRetryDelay));
        }
      }
    }
    throw new Error("Could not acquire soul state lock");
  }

  private async releaseLock(): Promise<void> {
    try {
      await fs.unlink(this.lockPath());
    } catch {
      /* non-fatal */
    }
  }

  private lockPath(): string {
    return path.join(this.projectRoot, ".knowledge", "soul_state.json.lock");
  }

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.state = {
      globalBiases: { riskTolerance: 0.5, creativityBias: 0.5, precisionBias: 0.5 },
      memoryWeightMultiplier: {},
    };
    this.nodes = new Map();
    this.edges = [];
    this.profile = {};
    this.ledger = [];
    this.dirty = false;
  }

  getState(): SoulState {
    return this.state;
  }

  getNodes(): MemoryNode[] {
    return Array.from(this.nodes.values());
  }

  getEdges(): MemoryEdge[] {
    return this.edges;
  }

  getProfile(): SoulProfile {
    return this.profile;
  }

  getLedger(): LedgerEntry[] {
    return this.ledger;
  }

  detectActiveLens(): CognitiveLens {
    const envLens = process.env.CORTEX_LENS;
    if (envLens && ALL_LENSES.includes(envLens.toUpperCase() as CognitiveLens)) {
      return envLens.toUpperCase() as CognitiveLens;
    }
    try {
      const branch = process.env.CORTEX_BRANCH || "";
      const lowerBranch = branch.toLowerCase();

      if (lowerBranch.includes("fix") || lowerBranch.includes("bug") || lowerBranch.includes("hotfix")) {
        return "FORENSIC";
      }
      if (lowerBranch.includes("feat") || lowerBranch.includes("feature") || lowerBranch.includes("refactor")) {
        return "ENGINEERING";
      }
      if (lowerBranch.includes("plan") || lowerBranch.includes("design") || lowerBranch.includes("research")) {
        return "STRATEGIC";
      }
      if (lowerBranch.includes("exp") || lowerBranch.includes("experiment") || lowerBranch.includes("draft")) {
        return "CREATIVE";
      }
    } catch {
      /* fall through */
    }
    return "ENGINEERING";
  }

  async load(): Promise<void> {
    await this.acquireLock();
    try {
      const soulPath = path.join(this.projectRoot, ".knowledge", "soul_state.json");
      try {
        const raw = await fs.readFile(soulPath, "utf8");
        const parsed = JSON.parse(raw);
        this.state = parsed.state || this.state;
        this.nodes = new Map(
          (parsed.nodes || []).map((n: MemoryNode) => [n.id, n]),
        );
        this.edges = parsed.edges || [];
        this.ledger = parsed.ledger || [];
        this.profile = parsed.profile || {};
        this.dirty = false;
      } catch {
        this.dirty = true;
      }
    } finally {
      await this.releaseLock();
    }
  }

  async save(): Promise<void> {
    await this.acquireLock();
    try {
      const soulDir = path.join(this.projectRoot, ".knowledge");
      const soulPath = path.join(soulDir, "soul_state.json");
      await fs.mkdir(soulDir, { recursive: true });
      const payload = {
        state: this.state,
        nodes: Array.from(this.nodes.values()),
        edges: this.edges,
        ledger: this.ledger.slice(-1000),
        profile: this.profile,
      };
      await fs.writeFile(soulPath + ".tmp", JSON.stringify(payload, null, 2), "utf8");
      await fs.rename(soulPath + ".tmp", soulPath);
      this.dirty = false;
    } finally {
      await this.releaseLock();
    }
  }

  async loadProfile(profile: SoulProfile): Promise<void> {
    this.profile = profile;
    if (profile.riskTolerance !== undefined) this.state.globalBiases.riskTolerance = profile.riskTolerance;
    if (profile.creativityBias !== undefined) this.state.globalBiases.creativityBias = profile.creativityBias;
    if (profile.precisionBias !== undefined) this.state.globalBiases.precisionBias = profile.precisionBias;
    this.dirty = true;
    await this.save();
  }

  addNode(node: MemoryNode): void {
    this.nodes.set(node.id, node);
    this.dirty = true;
  }

  removeNode(id: string): void {
    this.nodes.delete(id);
    this.edges = this.edges.filter(e => e.from !== id && e.to !== id);
    this.dirty = true;
  }

  addEdge(edge: MemoryEdge): void {
    const existing = this.edges.findIndex(
      e => e.from === edge.from && e.to === edge.to && e.type === edge.type,
    );
    if (existing !== -1) {
      this.edges[existing].strength = Math.min(this.edges[existing].strength + edge.strength, 1.0);
    } else {
      this.edges.push(edge);
    }
    this.dirty = true;
  }

  retrieve(
    query: string,
    lens: CognitiveLens,
    K: number = 10,
    similarityFunc?: (node: MemoryNode, query: string) => number,
  ): RetrieveCandidate[] {
    const sim = similarityFunc || ((_node, _q) => 0.5);
    const candidates = Array.from(this.nodes.values());

    return candidates
      .map(node => ({
        node,
        score:
          sim(node, query) *
          node.weights.salience *
          node.weights.decay *
          getLensWeight(node, lens) *
          getSoulBias(node, this.state),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, K);
  }

  retrieveRaw(
    query: string,
    candidates: MemoryNode[],
    lens: CognitiveLens,
    similarityFunc: (node: MemoryNode, q: string) => number,
    K: number,
  ): RetrieveCandidate[] {
    return candidates
      .map(node => ({
        node,
        score:
          similarityFunc(node, query) *
          node.weights.salience *
          node.weights.decay *
          getLensWeight(node, lens) *
          getSoulBias(node, this.state),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, K);
  }

  recordOutcome(nodeId: string, success: boolean): void {
    const node = this.nodes.get(nodeId);
    if (!node) return;

    if (success) {
      node.weights.salience = Math.min(node.weights.salience + 0.1, 1.0);
      node.weights.successBias = Math.min(node.weights.successBias + 0.2, 1.0);
    } else {
      node.weights.failureBias = Math.min(node.weights.failureBias + 0.2, 1.0);
      node.weights.salience = Math.max(node.weights.salience - 0.05, 0.0);
    }
    this.dirty = true;
  }

  applyDecay(deltaTimeMs: number): void {
    for (const node of this.nodes.values()) {
      const deltaSeconds = deltaTimeMs / 1000;
      node.weights.salience *= Math.exp(-node.weights.decay * deltaSeconds);
      node.weights.energy *= Math.exp(-node.weights.decay * deltaSeconds * 0.5);
    }
  }

  applyDrift(candidates: RetrieveCandidate[], driftLevel: number): RetrieveCandidate[] {
    if (driftLevel === 0) return candidates;
    return candidates.map(c => ({
      ...c,
      score: c.score + (Math.random() - 0.5) * 2 * driftLevel,
    })).sort((a, b) => b.score - a.score);
  }

  recordCoOccurrence(entityIds: string[]): void {
    for (let i = 0; i < entityIds.length; i++) {
      for (let j = i + 1; j < entityIds.length; j++) {
        const from = entityIds[i];
        const to = entityIds[j];
        const existing = this.edges.find(
          e => (e.from === from && e.to === to) || (e.from === to && e.to === from),
        );
        if (existing) {
          existing.strength = Math.min(existing.strength + 0.05, 1.0);
        } else {
          this.edges.push({ from, to, type: "association", strength: 0.1 });
        }
      }
    }
    this.dirty = true;
  }

  evaluateRiskClamping(targetEntity: string): number {
    const matchingFailures = Array.from(this.nodes.values()).filter(
      n => n.metadata.source === targetEntity && n.type === "failure",
    );
    const maxFailureBias = Math.max(...matchingFailures.map(n => n.weights.failureBias), 0);
    if (maxFailureBias > 0.6) {
      this.state.globalBiases.riskTolerance = 0.1;
    }
    return this.state.globalBiases.riskTolerance;
  }

  compressMilestone(nodeIds: string[], milestoneName: string): MemoryNode {
    const milestone: MemoryNode = {
      id: `milestone-${Date.now()}`,
      type: "insight",
      content: `Compressed Milestone: ${milestoneName}. Unified lessons from ${nodeIds.length} historical modifications.`,
      timestamp: Date.now(),
      metadata: { domain: "milestone" },
      weights: {
        salience: 0.8,
        successBias: 0.5,
        failureBias: 0.0,
        decay: 0.01,
        certainty: 0.7,
        credibility: 0.6,
        energy: 0.5,
      },
    };
    this.addNode(milestone);

    for (const id of nodeIds) {
      this.addEdge({
        from: milestone.id,
        to: id,
        type: "association",
        strength: 0.8,
      });
    }

    return milestone;
  }

  logExperience(entry: LedgerEntry): void {
    this.ledger.push(entry);
    this.dirty = true;
  }

  isDirty(): boolean {
    return this.dirty;
  }

  status(): string {
    const envLens = this.detectActiveLens();
    return [
      `Active Lens: ${envLens}`,
      `Risk Tolerance: ${this.state.globalBiases.riskTolerance.toFixed(2)}`,
      `Creativity Bias: ${this.state.globalBiases.creativityBias.toFixed(2)}`,
      `Precision Bias: ${this.state.globalBiases.precisionBias.toFixed(2)}`,
      `Memory Nodes: ${this.nodes.size}`,
      `Memory Edges: ${this.edges.length}`,
      `Ledger Entries: ${this.ledger.length}`,
      `Profile Loaded: ${Object.keys(this.profile).length > 0 ? "Yes" : "No"}`,
    ].join("\n");
  }

  reset(): void {
    this.state = {
      globalBiases: { riskTolerance: 0.5, creativityBias: 0.5, precisionBias: 0.5 },
      memoryWeightMultiplier: {},
    };
    this.nodes.clear();
    this.edges = [];
    this.profile = {};
    this.ledger = [];
    this.dirty = true;
  }
}
