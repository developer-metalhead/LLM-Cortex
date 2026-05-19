import fs from "fs";
import path from "path";

export type BrevityLevel = "lite" | "ultra" | "off";

/**
 * Resolves the active brevity level in priority order:
 * 1. Environment variable CORTEX_BREVITY_LEVEL
 * 2. Configuration file cortex.json
 * 3. Default fallback: "off"
 */
export function getBrevityLevel(projectRoot: string): BrevityLevel {
  const envVal = process.env.CORTEX_BREVITY_LEVEL;
  if (envVal === "lite" || envVal === "ultra" || envVal === "off") {
    return envVal;
  }

  try {
    const configPath = path.join(projectRoot, "cortex.json");
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      const configVal = config.brevity || config.brevityLevel || config.CORTEX_BREVITY_LEVEL;
      if (configVal === "lite" || configVal === "ultra" || configVal === "off") {
        return configVal;
      }
    }
  } catch {
    // Ignore parsing errors and fallback
  }

  return "off";
}

/**
 * Minifies markdown prose text by stripping conversational filler
 * while leaving code blocks, Mermaid diagrams, and links intact.
 */
export function minifyProse(content: string): string {
  if (!content) return "";

  const lines = content.split("\n");
  let inCodeBlock = false;
  const processedLines: string[] = [];

  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      processedLines.push(line);
      continue;
    }

    if (inCodeBlock) {
      processedLines.push(line);
      continue;
    }

    let next = line;
    
    // Core filler/prose-pruning regex rules
    next = next.replace(/\bPlease note that\b\s*/gi, "");
    next = next.replace(/\bIt is important to note that\b\s*/gi, "");
    next = next.replace(/\bIt should be noted that\b\s*/gi, "");
    next = next.replace(/\bplease feel free to\b\s*/gi, "");
    next = next.replace(/\bIn order to\b/gi, "To");
    next = next.replace(/\bAs a matter of fact\b\s*/gi, "");
    next = next.replace(/\bWe recommend that you\b/gi, "We recommend");
    next = next.replace(/\bWith respect to\b/gi, "On");
    next = next.replace(/\bRegarding\b/gi, "On");
    next = next.replace(/\bconsecutive occurrences\b/gi, "repeats");
    next = next.replace(/\bconfiguration\b/gi, "config");
    next = next.replace(/\bimplementations\b/gi, "impls");
    next = next.replace(/\bimplementation\b/gi, "impl");
    next = next.replace(/\bdependencies\b/gi, "deps");
    next = next.replace(/\bdependency\b/gi, "dep");
    next = next.replace(/\bfunctionality\b/gi, "func");
    next = next.replace(/\bparameter\b/gi, "param");
    next = next.replace(/\bparameters\b/gi, "params");
    next = next.replace(/\binterface\b/gi, "iface");
    next = next.replace(/\barguments\b/gi, "args");
    next = next.replace(/\bargument\b/gi, "arg");
    next = next.replace(/\binformation\b/gi, "info");
    next = next.replace(/\bFor example\b/gi, "e.g.");
    next = next.replace(/\bThat is to say\b/gi, "i.e.");
    next = next.replace(/\bIn other words\b/gi, "i.e.");
    next = next.replace(/\bsuccessfully completed\b/gi, "done");
    next = next.replace(/\bsuccessfully executed\b/gi, "done");
    next = next.replace(/\bhas been designed to\b/gi, "designs to");
    next = next.replace(/\btakes care of\b/gi, "handles");
    next = next.replace(/\bis responsible for\b/gi, "handles");
    next = next.replace(/\bis used to\b/gi, "does");
    next = next.replace(/\ballows us to\b/gi, "lets us");
    next = next.replace(/\ballows the user to\b/gi, "lets user");
    next = next.replace(/\bprovides the ability to\b/gi, "lets");

    processedLines.push(next);
  }

  return processedLines.join("\n");
}

/**
 * Minified tool descriptions to save input token budget in the client's prompt context.
 */
export const COMPRESSED_TOOL_DESCRIPTIONS: Record<string, string> = {
  get_cortex_status: "Check if Cortex is initialized.",
  ingest: "Run ingest to sync recent git diff changes to knowledge base.",
  get_pending_changes: "Get git diffs and Librarian prompt for updates.",
  save_synthesis: "Save structured synthesis results to knowledge base.",
  save_concept: "Save single concept directly to knowledge base.",
  read_knowledge_index: "Read architectural index. ALWAYS call first before editing code.",
  read_entity: "Read layered page (Role/Interface/Behavior/Wiring) for named entity.",
  read_concept: "Read page for a single architectural concept.",
  set_project_root: "Manually re-point Cortex to a project root.",
  audit: "Find stale entities and blast-radius victims.",
  export: "Export ARCH_SPEC.md or ARCH_GRAPH.md.",
  refresh_stale_entities: "Clear stale flag on verified-clean entities.",
  log_query: "Query JSONL architectural log.",
  audit_evidence: "Check for evidence drift.",
  lint: "Perform graph integrity and cycle checks.",
  evolution_entity: "Reconstruct timeline for an entity.",
  get_entity_quality: "Get quality score and metrics for named entity.",
  audit_quality: "List all entities ranked by quality score.",
  review_entity: "Accept/reject human review for quality boost.",
  impact_analysis: "Show entity dependents or dependencies with hops.",
  graph: "Generate Mermaid or JSON dependency graph.",
  before_change: "Get pre-flight entity page, blast-radius, and concepts in one call.",
  smart_audit: "Get all stale entities, pages, and blast-radius in one call.",
  cortex_onboard: "Generate centrality-prioritized onboarding tour.",
  cortex_find: "Category-scoped fast search across knowledge names.",
  resolve_refs: "Resolve §ref:<hash>§ placeholder text.",
  build_context_pack: "Build token-bounded, PageRank-centrality knowledge pack.",
  estimate_cost: "Estimate token/USD cost for next sync.",
};
