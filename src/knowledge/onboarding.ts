import fs from "fs/promises";
import path from "path";
import { KnowledgeManager } from "./writer.js";
import { computeQuality, formatScore } from "./quality.js";
import type { Relationship } from "../llm/schema.js";

export interface OnboardingOptions {
  audience: "junior" | "senior" | "domain-expert";
  depth: "quick" | "thorough";
}

export interface OnboardingStop {
  name: string;
  type: "parent" | "concept" | "entity";
  description: string;
  sourceFile?: string;
  centrality: number; // Raw PageRank
  quality: number; // 0.0 - 1.0
  score: number; // centrality * quality
  readingTime: number; // in minutes
  rationale: string;
  caveats?: string;
  failedApproachesCount: number;
  constraintsCount: number;
}

export class OnboardingManager {
  private manager: KnowledgeManager;

  constructor(manager: KnowledgeManager) {
    this.manager = manager;
  }

  async getPrioritizedEntities(): Promise<OnboardingStop[]> {
    const state = await this.manager.getState();
    const entities = state.entities;
    const concepts = state.concepts;

    const allNodeNames = Array.from(new Set([
      ...Object.keys(entities),
      ...Object.keys(concepts)
    ]));
    const allNodeNamesSet = new Set(allNodeNames);

    const N = allNodeNames.length;
    if (N === 0) {
      return [];
    }

    // 1. Build directed graph
    const outEdges: Record<string, string[]> = {};
    const inEdges: Record<string, string[]> = {};
    for (const name of allNodeNames) {
      outEdges[name] = [];
      inEdges[name] = [];
    }

    // Graph is built using depends_on, called_by, parent_of relationships
    const USAGE_KINDS = new Set<string>(["depends_on", "called_by", "parent_of"]);

    for (const name of allNodeNames) {
      let rels: Relationship[] = [];
      if (entities[name]) {
        rels = entities[name].relationships || [];
      } else if (concepts[name]) {
        rels = concepts[name].relationships || [];
      }

      for (const rel of rels) {
        if (USAGE_KINDS.has(rel.kind) && allNodeNamesSet.has(rel.target)) {
          // Add directed edge: name -> target
          outEdges[name].push(rel.target);
          inEdges[rel.target].push(name);
        }
      }
    }

    // 2. PageRank Centrality scoring (damping factor 0.85, 20 iterations)
    const d = 0.85;
    let ranks: Record<string, number> = {};
    for (const name of allNodeNames) {
      ranks[name] = 1 / N;
    }

    for (let iter = 0; iter < 20; iter++) {
      const nextRanks: Record<string, number> = {};
      for (const name of allNodeNames) {
        nextRanks[name] = (1 - d) / N;
      }

      let deadEndSum = 0;
      for (const name of allNodeNames) {
        if (outEdges[name].length === 0) {
          deadEndSum += ranks[name];
        } else {
          for (const target of outEdges[name]) {
            nextRanks[target] += d * ranks[name] / outEdges[name].length;
          }
        }
      }

      for (const name of allNodeNames) {
        ranks[name] = nextRanks[name] + (d * deadEndSum / N);
      }
    }

    // 3. Compute final scores (PageRank centrality * quality)
    const stops: OnboardingStop[] = [];

    const sourceMissingFlags = await Promise.all(
      allNodeNames.map(async (name) => {
        if (!entities[name] || !entities[name].sourceFile) return false;
        const absPath = path.resolve(this.manager.projectRootPath, entities[name].sourceFile);
        try {
          await fs.access(absPath);
          return false;
        } catch {
          return true;
        }
      })
    );

    for (let idx = 0; idx < allNodeNames.length; idx++) {
      const name = allNodeNames[idx];
      const isEntity = !!entities[name];
      const isConcept = !!concepts[name];
      
      const type = isEntity 
        ? "entity"
        : (name.endsWith("/") || (concepts[name].relationships && concepts[name].relationships!.some(r => r.kind === "parent_of"))
          ? "parent"
          : "concept");

      const record = entities[name] || concepts[name];
      const description = record.description;
      const sourceFile = isEntity ? entities[name].sourceFile : undefined;
      const failedApproachesCount = record.failedApproaches?.length || 0;
      
      let constraintsCount = 0;
      if (isEntity && entities[name].constraints) {
        const c = entities[name].constraints!;
        constraintsCount = (c.mustNotImport?.length || 0) + (c.mustNotBeCalledBy?.length || 0) + (c.contract ? 1 : 0);
      }

      const rawCentrality = ranks[name];
      let quality = 1.0;
      let caveats: string | undefined;

      if (isEntity) {
        const breakdown = computeQuality(entities[name], {
          evidenceSourceMissing: sourceMissingFlags[idx]
        });
        quality = breakdown.score;
        if (quality < 0.5) {
          caveats = "This entity is central but has low confidence — verify before treating as authoritative.";
        }
      }

      const score = rawCentrality * quality;

      // Estimate Reading Time: ~150 words/min + 30s per WikiLink
      const words = description.split(/\s+/).length;
      const wikiLinks = Array.from(description.matchAll(/\[\[([^\]]+)\]\]/g)).length;
      const readingTime = Math.max(1, Math.round(words / 150 + wikiLinks * 0.5));

      // Generate a dynamic, premium rationale based on attributes
      let rationale = "";
      if (type === "parent") {
        rationale = "Serves as the structural high-level entrypoint mapping the architectural landscape.";
      } else if (type === "concept") {
        if (failedApproachesCount > 0) {
          rationale = "Crucial cross-cutting design system featuring historical design trade-offs and failures.";
        } else {
          rationale = "Core architectural abstraction governing system-wide standards and operations.";
        }
      } else {
        if (constraintsCount > 0) {
          rationale = "Load-bearing operational core governed by strict architectural policies and boundaries.";
        } else if (failedApproachesCount > 0) {
          rationale = "Critical functional module with key real-world lessons from past implementations.";
        } else {
          rationale = "Primary active functional entity forming the cornerstone of this module.";
        }
      }

      stops.push({
        name,
        type,
        description,
        sourceFile,
        centrality: rawCentrality,
        quality,
        score,
        readingTime,
        rationale,
        caveats,
        failedApproachesCount,
        constraintsCount
      });
    }

    return stops.sort((a, b) => b.score - a.score);
  }

  async generateOnboarding(options: OnboardingOptions): Promise<string> {
    const stops = await this.getPrioritizedEntities();
    if (stops.length === 0) {
      return "# Cortex Onboarding Guide\n\nNo entities or concepts found in the knowledge base. Run an ingest first.";
    }
    // Group them
    const parentStops = stops.filter(s => s.type === "parent").sort((a, b) => b.score - a.score);
    const conceptStops = stops.filter(s => s.type === "concept").sort((a, b) => b.score - a.score);
    const entityStops = stops.filter(s => s.type === "entity").sort((a, b) => b.score - a.score);

    let finalParents = [...parentStops];
    let finalConcepts = [...conceptStops];
    let finalEntities = [...entityStops];

    // Audience tuning
    if (options.audience === "senior") {
      // Skips simple utility modules, focuses on invariants and cross-cutting concepts.
      // Filter entities to only keep those with constraints, failed approaches, or score >= median
      const scores = entityStops.map(e => e.score);
      const median = scores.length > 0 ? scores[Math.floor(scores.length / 2)] : 0;
      finalEntities = entityStops.filter(e => e.constraintsCount > 0 || e.failedApproachesCount > 0 || e.score >= median);
    } else if (options.audience === "domain-expert") {
      // Focuses strictly on what's unusual (failed approaches, constraints, or top 20% centrality)
      const topCount = Math.ceil(stops.length * 0.20);
      const thresholdScore = stops.map(s => s.score).sort((a, b) => b - a)[topCount - 1] || 0;

      finalEntities = entityStops.filter(e => e.constraintsCount > 0 || e.failedApproachesCount > 0 || e.score >= thresholdScore);
      finalConcepts = conceptStops.filter(c => c.failedApproachesCount > 0 || c.score >= thresholdScore);
    }

    // Junior explains terms dynamically using available Concepts
    if (options.audience === "junior") {
      for (const stop of [...finalParents, ...finalConcepts, ...finalEntities]) {
        const stopText = (stop.name + " " + stop.description).toLowerCase();
        
        // Find which concepts are mentioned in this stop (excluding itself) using word boundaries
        const foundConcepts = conceptStops.filter(c => {
          if (stop.name === c.name) return false;
          // Escape regex specials from concept name, just in case
          const safeName = c.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(`\\b${safeName}\\b`, 'i');
          return regex.test(stopText);
        });
        
        if (foundConcepts.length > 0) {
          const gloss = foundConcepts.map(c => {
            let preview = c.description.trim();
            const firstPeriod = preview.indexOf(".");
            if (firstPeriod > 10 && firstPeriod < 150) preview = preview.slice(0, firstPeriod + 1);
            else if (preview.length > 120) preview = preview.slice(0, 120) + "...";
            return `* **${c.name}**: ${preview.replace(/\n/g, " ")}`;
          }).join("\n");
          stop.rationale += `\n\n> [!NOTE]\n> **Junior Glossary Term Insight**:\n${gloss}`;
        }
      }
    }

    // Depth tuning
    if (options.depth === "quick") {
      finalParents = finalParents.slice(0, 2);
      finalConcepts = finalConcepts.slice(0, 2);
      finalEntities = finalEntities.slice(0, 4);
    }

    const compiledStops = [
      ...finalParents,
      ...finalConcepts,
      ...finalEntities
    ];

    const totalTime = compiledStops.reduce((sum, s) => sum + s.readingTime, 0);

    // 5. Generate Markdown
    let md = `# 🎓 Project Cortex Onboarding & Guided Reading\n\n`;
    md += `*Welcome! This guide offers a personalized reading path through this repository's architectural landscape, tailored for a **${options.audience}** audience with a **${options.depth}** walkthrough.*\n\n`;
    
    md += `> [!TIP]\n`;
    md += `> **Audience Profile:** ${options.audience.toUpperCase()} · **Depth Scope:** ${options.depth.toUpperCase()}\n`;
    md += `> **Estimated Reading Time:** ⏳ **${totalTime} minutes** total (${compiledStops.length} stops)\n\n`;

    md += `## 🗺️ Reading Plan Map\n\n`;
    compiledStops.forEach((stop, idx) => {
      const typeLabel = stop.type === "parent" ? "📁 Module" : stop.type === "concept" ? "💡 Concept" : "📄 Entity";
      md += `${idx + 1}. **${stop.name}** (${typeLabel}) — *${stop.readingTime} min*\n`;
    });
    md += `\n---\n\n`;

    md += `## 🚀 Guided Architectural Tour\n\n`;

    compiledStops.forEach((stop, idx) => {
      const typeLabel = stop.type === "parent" ? "📁 Module" : stop.type === "concept" ? "💡 Concept" : "📄 Entity";
      md += `### Stop ${idx + 1}: [[${stop.name}]] (${typeLabel})\n\n`;
      
      if (stop.sourceFile) {
        md += `**Source Path:** \`${stop.sourceFile}\`\n\n`;
      }

      md += `> **Tour Rationale:** ${stop.rationale}\n\n`;

      if (stop.caveats) {
        md += `> [!WARNING]\n`;
        md += `> **Confidence Caveat:** ${stop.caveats}\n\n`;
      }

      md += `#### Description\n${stop.description}\n\n`;

      if (stop.failedApproachesCount > 0 || stop.constraintsCount > 0) {
        md += `#### Load-bearing Metrics\n`;
        if (stop.constraintsCount > 0) {
          md += `- 🔒 **Architectural Constraints:** ${stop.constraintsCount} active policies\n`;
        }
        if (stop.failedApproachesCount > 0) {
          md += `- ⚠️ **Lessons Learned:** ${stop.failedApproachesCount} recorded design failures\n`;
        }
        md += `\n`;
      }

      md += `---\n\n`;
    });

    md += `*End of tour. Happy coding! Run \`cortex find\` to search scoped components dynamically.*`;

    // Save output file in .knowledge
    const onboardingPath = path.join(this.manager["knowledgeDir"], `onboarding_${options.audience}_${options.depth}.md`);
    await fs.writeFile(onboardingPath, md, "utf8");

    return md;
  }
}
