import { randomUUID } from "crypto";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ListRootsResultSchema,
  RootsListChangedNotificationSchema,
} from "@modelcontextprotocol/sdk/types.js";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import { KnowledgeManager } from "../knowledge/writer.js";
import { SynthesisSchema, SaveConceptSchema } from "../llm/schema.js";
import {
  LIBRARIAN_SYSTEM_PROMPT,
  EXTRACTION_PROMPT_TEMPLATE,
  BOOTSTRAP_PROMPT_TEMPLATE,
} from "../llm/prompts.js";
import { getPendingDiff } from "../core/diff.js";
import { listSourceFiles, renderFileList } from "../core/scan.js";
import { loadCortexEnv } from "../core/env.js";
import { AuditManager } from "../knowledge/audit.js";
import { LintManager } from "../knowledge/lint.js";
import { EvolutionManager } from "../knowledge/evolution.js";
import { buildGraph, toMermaid, toJson, buildImpactReport } from "../knowledge/graph.js";
import { readQualityGate } from "../knowledge/quality.js";
import { runExportGraph } from "../cli/export.js";
import { compressResponse, resolveRefs } from "./compression.js";
import { buildContextPack } from "../knowledge/packer.js";
import { computeCostEstimate } from "../cli/test-cost.js";

export class CortexMCPServer {
  private server: Server;
  private knowledgeDir: string;
  private projectRoot: string;
  private knowledge: KnowledgeManager;
  private onAfterKnowledgeSave?: () => Promise<void>;
  private _sourceStats: { tokens: number; fileCount: number } | null = null;
  // When true, an explicit `--project-root` was passed on the CLI — respect it
  // and skip MCP roots discovery. When false, the project root is best-effort
  // from CWD and we should ask the MCP client for its real workspace via
  // `roots/list` (the only deterministic mechanism in IDEs like Antigravity
  // that launch MCP servers from their own install directory, not the user's
  // workspace).
  private projectRootExplicit: boolean;
  private readonly sessionId = randomUUID();

  constructor(
    projectRoot: string,
    onAfterKnowledgeSave?: () => Promise<void>,
    projectRootExplicit: boolean = false,
  ) {
    this.projectRoot = projectRoot;
    this.knowledgeDir = path.join(projectRoot, ".knowledge");
    this.knowledge = new KnowledgeManager(projectRoot);
    this.onAfterKnowledgeSave = onAfterKnowledgeSave;
    this.projectRootExplicit = projectRootExplicit;

    this.server = new Server(
      { name: "project-cortex", version: "1.0.0" },
      { capabilities: { tools: {}, prompts: {} } },
    );

    this.setupHandlers();
    this.setupPromptHandlers();
  }

  // Re-point the server at a new workspace root. Called after MCP roots
  // discovery resolves to a different directory than the CWD default, or when
  // the client sends a `notifications/roots/list_changed`. Re-creates the
  // KnowledgeManager and invalidates the cached source-stats so subsequent
  // tool calls reflect the new project.
  private setProjectRoot(newRoot: string): void {
    const resolved = path.resolve(newRoot);
    if (resolved === this.projectRoot) return;
    this.projectRoot = resolved;
    this.knowledgeDir = path.join(resolved, ".knowledge");
    this.knowledge = new KnowledgeManager(resolved);
    this._sourceStats = null;
    console.error(`[Cortex] Project root resolved via MCP roots: ${resolved}`);
  }

  // Ask the MCP client for its workspace roots and adopt the first file:// one.
  // Antigravity advertises the `roots` capability — this is the only way to
  // know the user's workspace when the IDE doesn't launch us from there.
  private async refreshProjectRootFromClient(): Promise<void> {
    try {
      console.error("[Cortex] Requesting roots from client...");
      const result = await this.server.request(
        { method: "roots/list", params: {} },
        ListRootsResultSchema,
      );
      console.error(
        `[Cortex] Received ${result.roots?.length || 0} roots from client.`,
      );
      const firstFileRoot = result.roots?.find((r) =>
        r.uri.startsWith("file://"),
      );
      if (firstFileRoot) {
        console.error(`[Cortex] Found file root: ${firstFileRoot.uri}`);
        this.setProjectRoot(fileURLToPath(firstFileRoot.uri));
      } else {
        console.error("[Cortex] No file-based roots found in client response.");
      }
    } catch (err: any) {
      console.error(`[Cortex] Failed to refresh roots: ${err.message}`);
    }
  }

  private async getSourceStats(): Promise<{
    tokens: number;
    fileCount: number;
  }> {
    if (this._sourceStats) return this._sourceStats;
    const fileList = await listSourceFiles(this.projectRoot);
    let totalBytes = 0;
    await Promise.all(
      fileList.files.map(async (relPath) => {
        try {
          const stat = await fs.stat(path.join(this.projectRoot, relPath));
          totalBytes += stat.size;
        } catch {
          /* skip */
        }
      }),
    );
    this._sourceStats = {
      tokens: Math.round(totalBytes / 4),
      fileCount: fileList.totalFound,
    };
    return this._sourceStats;
  }

  private async withSavings(
    text: string,
  ): Promise<Array<{ type: "text"; text: string }>> {
    try {
      const { getBrevityLevel } = await import("../knowledge/brevity.js");
      const brevity = getBrevityLevel(this.projectRoot);
      const { tokens: sourceTokens, fileCount } = await this.getSourceStats();
      const responseTokens = Math.round(text.length / 4);
      const saved = Math.max(0, sourceTokens - responseTokens);
      const threshold = brevity !== "off" ? 0 : 500;
      if (saved <= threshold) return [{ type: "text", text }];
      const savedFmt =
        saved >= 1000 ? `~${(saved / 1000).toFixed(1)}k` : `~${saved}`;
      const footer = `\n\n---\n*Cortex saved ${savedFmt} tokens — synthesized knowledge instead of scanning ${fileCount} source files*`;
      return [{ type: "text", text: text + footer }];
    } catch {
      return [{ type: "text", text }];
    }
  }

  private setupPromptHandlers() {
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => ({
      prompts: [
        {
          name: "ingest",
          description:
            "Synthesize all recent code changes into the knowledge base.",
        },
        {
          name: "status",
          description: "Check the health and configuration of Project Cortex.",
        },
        {
          name: "read",
          description: "Read the project's architectural knowledge index.",
        },
        {
          name: "explore",
          description:
            "Navigate the knowledge base (index → drill into specific entities/concepts).",
        },
        {
          name: "before_change",
          description:
            "Pre-flight check before implementing, modifying, or fixing code. Forces a knowledge-first workflow so you don't break dependents or duplicate existing patterns.",
        },
        {
          name: "audit",
          description:
            "Find stale entities — knowledge whose dependencies have shifted since it was last synthesized.",
        },
        {
          name: "export",
          description:
            "Generate a comprehensive ARCH_SPEC.md from the project's synthesized knowledge.",
        },
        {
          name: "export_graph",
          description:
            "Export full architecture as ARCH_GRAPH.md (Mermaid, quality-colored nodes).",
          arguments: [
            { name: "scope", description: "Entity name to focus the export around (optional — omit for full graph)", required: false },
            { name: "depth", description: "Max hops from scope entity (default: 2)", required: false },
          ],
        },
        {
          name: "export_graph_scoped",
          description:
            "Export a focused subgraph around one entity to ARCH_GRAPH_<entity>.md — use this to share just the payment, booking, or auth slice.",
          arguments: [
            { name: "entity", description: "The entity to focus the subgraph around (e.g. BookingController, paymentUtils)", required: true },
            { name: "depth", description: "Max hops from entity (default: 2)", required: false },
          ],
        },
        {
          name: "impact",
          description:
            "Show every entity that depends on a given entity, ranked by hop distance. Use before refactoring to understand blast radius.",
          arguments: [
            { name: "entity", description: "The entity to analyse (e.g. AuthMiddleware, paymentUtils)", required: true },
            { name: "hypothetical", description: "Set to 'delete' to simulate removing the entity and see what breaks", required: false },
          ],
        },
        {
          name: "deps",
          description:
            "Show every entity that a given entity depends on, ranked by hop distance (outbound traversal).",
          arguments: [
            { name: "entity", description: "The entity whose dependencies to list", required: true },
          ],
        },
        {
          name: "onboard",
          description: "Generate a tailored onboarding tour of the codebase architecture.",
          arguments: [
            { name: "audience", description: "Target audience: 'junior', 'senior', or 'domain-expert' (default: 'junior')", required: false },
            { name: "depth", description: "Detail level: 'quick' or 'thorough' (default: 'quick')", required: false }
          ]
        },
        {
          name: "context",
          description: "Build a token-bounded knowledge bundle and use it as the working knowledge source for this session.",
          arguments: [
            { name: "scope", description: "Entity or concept to focus the bundle around (optional — omit for full knowledge base)", required: false },
            { name: "budget", description: "Token budget (default: 8000)", required: false },
            { name: "depth", description: "Link traversal depth from scope entity (default: unlimited)", required: false },
          ],
        },
        {
          name: "estimate_cost",
          description: "Generates a formal, structured cost audit report of the next sync.",
          arguments: [
            { name: "budget", description: "Optional USD ceiling to check against (e.g. 0.05)", required: false },
          ],
        },
        {
          name: "compress",
          description: "Compress a specific rules or markdown file on disk to save tokens permanently.",
          arguments: [
            { name: "file", description: "The repo-relative path to the file to compress (e.g. CLAUDE.md or .cursorrules)", required: true },
          ],
        },
        {
          name: "brevity",
          description: "Configure or check the active token-saving brevity level (off, lite, ultra).",
          arguments: [
            { name: "level", description: "The active brevity level to set (off, lite, ultra)", required: false },
          ],
        },
        {
          name: "savings",
          description: "Display cumulative token and cost savings ledger analytics.",
          arguments: [
            { name: "graph", description: "Set to 'true' to render the rolling 30-day savings ASCII chart instead of the summary table", required: false }
          ]
        },
      ],
    }));

    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      if (request.params.name === "ingest") {
        return {
          description:
            "Synthesize all recent code changes into the knowledge base.",
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: "Please run the 'ingest' workflow: call get_pending_changes, follow the Librarian instructions, and save the synthesis.",
              },
            },
          ],
        };
      }
      if (request.params.name === "status") {
        return {
          description: "Check the health and configuration of Project Cortex.",
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: "Show me the current Cortex status using get_cortex_status.",
              },
            },
          ],
        };
      }
      if (request.params.name === "read") {
        return {
          description: "Read the project's architectural knowledge index.",
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: [
                  "Call read_knowledge_index to load the project's architectural memory.",
                  "Treat the result as ground truth: it summarizes the codebase's entities, concepts, and how they connect.",
                  "If you need more detail about a specific [[WikiLink]] in the index, call read_entity or read_concept with that name BEFORE re-reading source files.",
                  "Only fall back to scanning raw source if the knowledge base is clearly stale or silent on the topic you need.",
                ].join(" "),
              },
            },
          ],
        };
      }
      if (request.params.name === "explore") {
        return {
          description: "Navigate the knowledge base by following wiki-links.",
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: [
                  "Explore the project's architectural knowledge:",
                  "1. Call read_knowledge_index for the high-level map.",
                  "2. For any [[WikiLink]] you want to expand, call read_entity(name) or read_concept(name).",
                  "3. Follow links transitively when answering architectural questions — the knowledge base is the source of truth.",
                  "4. Do NOT re-derive architecture from raw source files unless the index is empty or visibly stale; prefer the synthesized knowledge.",
                ].join(" "),
              },
            },
          ],
        };
      }
      if (request.params.name === "audit") {
        return {
          description:
            "Find stale entities, verify each one, and heal the knowledge base.",
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: [
                  "Run the audit-and-heal workflow. Do not stop at reporting — finish the cycle so the knowledge base ends in a synchronized state.",
                  "",
                  "STEP 1 — Gather stale entities with full context.",
                  "Call smart_audit. It returns every stale entity bundled with its full entity page and inbound blast-radius in one shot. No separate read_entity calls needed.",
                  "",
                  "STEP 2 — Verify each stale entity.",
                  "For each entity in the smart_audit result, read the current source for that entity AND for the dependency that triggered the staleness. Ask:",
                  "  (a) Does the entity's ## Behavior or ## Interface section still match the code?",
                  "  (b) Has the upstream change broken any documented invariant, contract, or constraint?",
                  "  (c) Are any [[WikiLinks]] in ## Wiring now wrong (target renamed, removed, or signature changed)?",
                  "",
                  "STEP 3 — Classify each entity into one of two buckets:",
                  "  • VERIFIED-CLEAN — the dependency moved but this entity's documented role, contracts, and wiring are still accurate. The stale flag is a false positive from blast-radius fan-out.",
                  "  • NEEDS-UPDATE — the entity's description, relationships, or constraints are now incorrect because of the upstream change.",
                  "",
                  "STEP 4 — Heal the knowledge base.",
                  "For the VERIFIED-CLEAN bucket: call refresh_stale_entities with all their names in a single call.",
                  "For the NEEDS-UPDATE bucket: call save_synthesis with action: 'update' for each, emitting the corrected description, relationships, and constraints.",
                  "",
                  "STEP 5 — Report.",
                  "Summarize: which entities you refreshed, which you re-synthesized and what changed, and any drift surfaced. End by stating the current stale count.",
                ].join("\n"),
              },
            },
          ],
        };
      }
      if (request.params.name === "export") {
        return {
          description:
            "Generate ARCH_SPEC.md from the synthesized knowledge base.",
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: [
                  "Call the project-cortex:export tool with type='spec'.",
                  "Report the output path of the generated ARCH_SPEC.md.",
                  "Briefly explain that the file contains the full dependency graph, architectural constraints, historical failed approaches, and conceptual patterns from the synthesized knowledge base — suitable for review, handoff, or onboarding.",
                ].join(" "),
              },
            },
          ],
        };
      }
      if (request.params.name === "export_graph") {
        const scope = request.params.arguments?.scope;
        const depth = request.params.arguments?.depth;
        const scopePart = scope ? `, scope='${scope}'${depth ? `, depth=${depth}` : ""}` : "";
        const filePart = scope
          ? `ARCH_GRAPH_${scope.replace(/[^A-Za-z0-9_-]/g, "_")}.md`
          : "ARCH_GRAPH.md";
        return {
          description: "Export a Mermaid dependency diagram to a file.",
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `Call the project-cortex:export tool with type='graph'${scopePart}. Report the output path of the generated ${filePart}.`,
              },
            },
          ],
        };
      }
      if (request.params.name === "export_graph_scoped") {
        const entity = request.params.arguments?.entity;
        const depth = request.params.arguments?.depth;
        const depthPart = depth ? `, depth=${depth}` : "";
        if (!entity) {
          return {
            description: "Export a focused subgraph — asks which entity to scope to.",
            messages: [
              {
                role: "user",
                content: {
                  type: "text",
                  text: "Call read_knowledge_index to list available entities, then ask the user: 'Which entity should I scope the graph export to? (e.g. BookingController, paymentUtils)'. Once they reply, call the project-cortex:export tool with type='graph' and scope set to their answer. Report the output path.",
                },
              },
            ],
          };
        }
        const filePart = `ARCH_GRAPH_${entity.replace(/[^A-Za-z0-9_-]/g, "_")}.md`;
        return {
          description: `Export scoped subgraph around ${entity}.`,
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `Call the project-cortex:export tool with type='graph', scope='${entity}'${depthPart}. Report the output path of the generated ${filePart}.`,
              },
            },
          ],
        };
      }
      if (request.params.name === "before_change") {
        return {
          description:
            "Knowledge-first pre-flight check before implementing, modifying, or fixing code.",
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: [
                  "Before you touch any source file, run the Cortex pre-flight check:",
                  "",
                  "If MODIFYING or FIXING an existing entity:",
                  "  Call before_change(entity=<name>). It returns in one shot: the entity's full page, the complete inbound blast-radius, and any concept invariants. Present the blast-radius to the user before writing any code.",
                  "",
                  "If IMPLEMENTING something new:",
                  "  1. Call read_knowledge_index to check if a similar entity already exists. If one does, prefer extending it over creating a parallel implementation.",
                  "  2. If the new code will depend on an existing entity, call before_change(entity=<that dependency>) to understand its contracts before wiring into it.",
                  "",
                  "Output before writing code: a one-paragraph plan stating (a) which entities you will touch, (b) the blast radius for any entity being modified, (c) which invariants apply.",
                  "",
                  "If the knowledge base is empty or the relevant entity is missing, say so explicitly and recommend running ingest first.",
                ].join("\n"),
              },
            },
          ],
        };
      }
      if (request.params.name === "impact") {
        const entity = request.params.arguments?.entity;
        const hypothetical = request.params.arguments?.hypothetical;
        if (!entity) {
          return {
            description: "Impact analysis — asks which entity to analyse.",
            messages: [{ role: "user", content: { type: "text",
              text: "Call read_knowledge_index to list available entities, then ask the user: 'Which entity should I run impact analysis on? (e.g. AuthMiddleware, paymentUtils)'. Once they reply, call the impact_analysis tool with that entity name.",
            }}],
          };
        }
        const hypoStr = hypothetical === "delete" ? `, hypothetical='delete'` : "";
        return {
          description: `Impact analysis for ${entity}`,
          messages: [{ role: "user", content: { type: "text",
            text: `Call the impact_analysis tool with entity='${entity}'${hypoStr}. Present the hop-ranked list of dependents with quality scores. If any entities are marked low-quality (⚠), note that the blast-radius prediction is less reliable for those.`,
          }}],
        };
      }
      if (request.params.name === "deps") {
        const entity = request.params.arguments?.entity;
        if (!entity) {
          return {
            description: "Dependency listing — asks which entity to analyse.",
            messages: [{ role: "user", content: { type: "text",
              text: "Call read_knowledge_index to list available entities. Then ask the user: 'Which entity\\'s outbound dependencies should I list? (e.g. [pick 3-4 entity names from the index])'. Populate those examples with real names from the index output. Once they reply, call the impact_analysis tool with that entity name and direction='outbound'.",
            }}],
          };
        }
        return {
          description: `Outbound dependencies of ${entity}`,
          messages: [{ role: "user", content: { type: "text",
            text: `Call the impact_analysis tool with entity='${entity}', direction='outbound'. Present the hop-ranked list of dependencies.`,
          }}],
        };
      }
      if (request.params.name === "onboard") {
        const audience = request.params.arguments?.audience;
        const depth = request.params.arguments?.depth;
        
        if (!audience || !depth) {
          return {
            description: "Generate a tailored onboarding tour — asks for audience and depth.",
            messages: [{ role: "user", content: { type: "text", 
              text: "Ask the user: 'Which audience (junior, senior, domain-expert) and depth (quick, thorough) would you like for your onboarding tour?' Briefly explain the differences. Wait for their reply, then call the cortex_onboard tool with their choices." 
            }}],
          };
        }
        
        return {
          description: `Generate a tailored onboarding tour for ${audience} (${depth})`,
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `Run the onboard guide generator. Audience: ${audience}, Depth: ${depth}. Call the cortex_onboard tool to compile the guide. DO NOT use read_knowledge_index or read_entity for this task — you must use cortex_onboard. Once you receive the markdown guide from the tool, you MUST write it directly to a file named '.knowledge/onboarding_${audience}_${depth}.md' in the workspace using your file-writing tool (e.g. write_to_file) to ensure it is successfully synced to the user's physical repository.`,
              },
            },
          ],
        };
      }
      if (request.params.name === "context") {
        const scope = request.params.arguments?.scope;
        const budget = request.params.arguments?.budget;
        const depth = request.params.arguments?.depth;
        
        if (!budget) {
          return {
            description: "Build a context pack — asks for budget and scope.",
            messages: [{
              role: "user",
              content: {
                type: "text",
                text: "Ask the user: 'What token budget (e.g. 3000, 8000) and focus scope (optional entity or concept name) would you like to use for your context pack?' Explain that this compiles a centrality-ranked, budget-bounded knowledge pack. Wait for their reply, then call build_context_pack with their choices."
              }
            }]
          };
        }
        
        const scopePart = scope ? `, scope='${scope}'${depth ? `, depth=${depth}` : ""}` : "";
        return {
          description: "Build a context pack and use it as working knowledge for this session.",
          messages: [{
            role: "user",
            content: {
              type: "text",
              text: [
                `Call build_context_pack with budget=${budget}${scopePart}.`,
                "Once you receive the pack, treat its contents as your authoritative knowledge source for this session.",
                "Prefer the pack over calling read_knowledge_index or read_entity — it is already ranked by importance and fits the token budget.",
                "If the user asks about something not covered in the pack, say so explicitly rather than silently falling back to source files.",
              ].join(" "),
            },
          }],
        };
      }

      if (request.params.name === "estimate_cost") {
        const budget = request.params.arguments?.budget;
        const budgetPart = budget ? ` with budget=${budget}` : "";
        return {
          description: "Generates a formal, structured cost audit report of the next sync.",
          messages: [{
            role: "user",
            content: {
              type: "text",
              text: `Call estimate_cost${budgetPart}. Present the results clearly: input tokens, output tokens, total tokens, and cost per provider. ${budget ? "Highlight whether the estimate is within or over the specified budget." : ""}`.trim(),
            },
          }],
        };
      }

      if (request.params.name === "compress") {
        const file = request.params.arguments?.file;
        if (!file) {
          return {
            description: "Compress a file — asks which file to compress.",
            messages: [{ role: "user", content: { type: "text", 
              text: "Ask the user: 'Which file would you like to permanently compress on disk? (e.g. CLAUDE.md)' and wait for their reply. Once they reply, reload the compress prompt with the file argument."
            }}],
          };
        }
        return {
          description: `Compress ${file} to save tokens permanently.`,
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: [
                  `You are about to permanently compress the file '${file}' on disk using the Cortex Brevity Engine.`,
                  "",
                  "STEP 1 — Check if the file exists.",
                  "Read or check the file using your native filesystem tools to confirm it is present in the workspace.",
                  "",
                  "STEP 2 — Propose and run the CLI compression command.",
                  "Using your terminal command execution tool, execute:",
                  `  cortex compress "${file}" --inplace`,
                  "",
                  "STEP 3 — Verify the compression.",
                  "Read the file again to verify that standard prose fluff was removed and code blocks remain intact.",
                  "",
                  "STEP 4 — Show stats.",
                  "Propose and run the CLI command 'cortex stats' to fetch the cumulative token and dollar savings. Report the stats back to the user.",
                ].join("\n"),
              },
            },
          ],
        };
      }

      if (request.params.name === "brevity") {
        const level = request.params.arguments?.level;
        if (!level) {
          return {
            description: "Set the active brevity level — asks which level to set.",
            messages: [{ role: "user", content: { type: "text", 
              text: "Ask the user: 'Which brevity level would you like to configure? (off, lite, ultra)' and briefly explain the difference. Wait for their reply, then reload the brevity prompt with their choice."
            }}],
          };
        }
        return {
          description: `Configure dynamic brevity level to ${level}`,
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `Set the dynamic brevity level of the workspace to '${level}'. Call the 'configure_brevity' tool with level='${level}'. Once complete, verify that the configuration successfully saved, and explain what features this level enables (e.g., dynamic response minification, compressed tool descriptions, telegraphic ingestion instructions).`,
              },
            },
          ],
        };
      }

      if (request.params.name === "savings") {
        const graphArg = request.params.arguments?.graph;
        if (graphArg === undefined || graphArg === null || graphArg === "") {
          return {
            description: "Display cumulative token and cost savings ledger analytics — asks for graph or normal view.",
            messages: [{
              role: "user",
              content: {
                type: "text",
                text: "Ask the user: 'Would you like to view the **normal** metrics table or the rolling 30-day chronological **graph** of your cost savings?' and wait for their response. Once they reply, reload the savings prompt with the appropriate graph argument ('true' or 'false').",
              },
            }],
          };
        }

        const graph = graphArg === "true";
        const graphPart = graph ? " with graph=true" : "";
        return {
          description: "Display cumulative token and cost savings ledger analytics.",
          messages: [{
            role: "user",
            content: {
              type: "text",
              text: `Call the 'get_savings' tool${graphPart}. Present the resulting metrics table or ASCII chronological graph beautifully formatted in markdown so the user can see their total ROI and category details. Explicitly inform the user that this full savings report has been automatically exported to 'ARCH_SAVINGS.md' in their project root for their convenience.`,
            },
          }],
        };
      }

      throw new Error(`Prompt not found: ${request.params.name}`);
    });
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const { getBrevityLevel, COMPRESSED_TOOL_DESCRIPTIONS } = await import("../knowledge/brevity.js");
      const brevity = getBrevityLevel(this.projectRoot);
      const tools = [
        {
          name: "get_cortex_status",
          description:
            "Check if Project Cortex is initialized in this project.",
          inputSchema: { type: "object", properties: {} },
        },
        {
          name: "ingest",
          description:
            "Run the full Cortex ingest workflow: fetch all git diffs since the last sync, analyze the changes using the Librarian prompt, synthesize entities/concepts/warnings, then call save_synthesis with the result. If the response says 'No pending changes', stop. Otherwise follow the systemPrompt instructions, use the userPrompt to analyze the diff, produce a synthesis object matching outputSchema, and call save_synthesis.",
          inputSchema: { type: "object", properties: {} },
        },
        {
          name: "get_pending_changes",
          description:
            "Returns all git diffs since the last Cortex sync, the current knowledge index, and the Librarian synthesis prompt. Use this to gather everything needed to synthesize knowledge updates.",
          inputSchema: { type: "object", properties: {} },
        },
        {
          name: "save_synthesis",
          description:
            "Saves a structured synthesis result to the knowledge base. Call this after synthesizing pending changes using the Librarian prompt.",
          inputSchema: {
            type: "object",
            required: ["synthesis"],
            properties: {
              synthesis: {
                type: "object",
                description:
                  "The structured synthesis result matching the Cortex schema.",
                required: ["summary", "entities", "concepts", "warnings"],
                properties: {
                  summary: { type: "string" },
                  entities: {
                    type: "array",
                    items: {
                      type: "object",
                      required: [
                        "name",
                        "action",
                        "description",
                        "relationships",
                      ],
                      properties: {
                        name: { type: "string" },
                        action: {
                          type: "string",
                          enum: ["create", "update", "delete"],
                        },
                        description: { type: "string" },
                        relationships: {
                          type: "array",
                          items: {
                            type: "object",
                            required: ["target", "kind"],
                            properties: {
                              target: { type: "string" },
                              kind: {
                                type: "string",
                                enum: [
                                  "depends_on",
                                  "called_by",
                                  "supports",
                                  "contradicts",
                                  "derived_from",
                                  "parent_of",
                                ],
                              },
                            },
                          },
                        },
                        constraints: {
                          type: "object",
                          properties: {
                            mustNotImport: {
                              type: "array",
                              items: { type: "string" },
                            },
                            mustNotBeCalledBy: {
                              type: "array",
                              items: { type: "string" },
                            },
                            contract: { type: "string" },
                          },
                        },
                        failedApproaches: {
                          type: "array",
                          items: {
                            type: "object",
                            required: ["summary", "reason", "recordedAt"],
                            properties: {
                              summary: { type: "string" },
                              reason: { type: "string" },
                              recordedAt: { type: "string" },
                              commit: { type: "string" },
                            },
                          },
                        },
                        sourceFile: {
                          type: "string",
                          description:
                            "Repo-relative path to the file this entity describes (e.g. src/auth/middleware.ts). Optional but strongly preferred.",
                        },
                      },
                    },
                  },
                  concepts: {
                    type: "array",
                    items: {
                      type: "object",
                      required: ["name", "description"],
                      properties: {
                        name: { type: "string" },
                        description: { type: "string" },
                        failedApproaches: {
                          type: "array",
                          items: {
                            type: "object",
                            required: ["summary", "reason", "recordedAt"],
                            properties: {
                              summary: { type: "string" },
                              reason: { type: "string" },
                              recordedAt: { type: "string" },
                              commit: { type: "string" },
                            },
                          },
                        },
                      },
                    },
                  },
                  warnings: { type: "array", items: { type: "string" } },
                },
              },
            },
          },
        },
        {
          name: "save_concept",
          description:
            "Saves a single architectural concept directly to the knowledge base without doing a full synthesis.",
          inputSchema: {
            type: "object",
            required: ["concept"],
            properties: {
              concept: {
                type: "object",
                required: ["name", "description"],
                properties: {
                  name: { type: "string" },
                  description: { type: "string" },
                  relationships: {
                    type: "array",
                    items: {
                      type: "object",
                      required: ["target", "kind"],
                      properties: {
                        target: { type: "string" },
                        kind: { type: "string" },
                      },
                    },
                  },
                  failedApproaches: {
                    type: "array",
                    items: {
                      type: "object",
                      required: ["summary", "reason", "recordedAt"],
                      properties: {
                        summary: { type: "string" },
                        reason: { type: "string" },
                        recordedAt: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        {
          name: "read_knowledge_index",
          description:
            "**ALWAYS call this first — before reading any source file, before modifying any code, before fixing any bug, before answering any question about the codebase.** This is the architectural memory of the project. It tells you what exists, what depends on what, and what invariants apply — in a fraction of the tokens it would take to re-derive from source. Skipping this step means re-deriving knowledge that is already synthesized. Do NOT open source files before calling this.",
          inputSchema: { type: "object", properties: {} },
        },
        {
          name: "read_entity",
          description:
            "Reads the full layered page (Role / Interface / Behavior / Wiring) for a single entity by name — e.g. 'AuthMiddleware'. **Use this when:** you saw a `[[WikiLink]]` in the index and need its details, you're about to modify an entity (read its Wiring section to see what depends on it), or you're implementing something that interacts with an existing entity (read its Interface section instead of inferring the shape from source). One read of this page typically replaces 200–500 lines of source-file scanning.",
          inputSchema: {
            type: "object",
            required: ["name"],
            properties: {
              name: {
                type: "string",
                description:
                  "Entity name exactly as it appears in the knowledge index.",
              },
            },
          },
        },
        {
          name: "read_concept",
          description:
            "Reads the full synthesized page for a single concept — an abstract pattern, strategy, or invariant that spans multiple entities (e.g. 'Authentication Strategy', 'Event Sourcing'). **Use this when:** you're about to introduce or modify a pattern (read the concept first to see how it's already implemented and which entities embody it), or a `[[WikiLink]]` in the index points to a concept rather than a concrete entity. Reading the concept tells you the *why* before you change the *what*.",
          inputSchema: {
            type: "object",
            required: ["name"],
            properties: {
              name: {
                type: "string",
                description:
                  "Concept name exactly as it appears in the knowledge index.",
              },
            },
          },
        },
        {
          name: "set_project_root",
          description:
            "Manually re-point the Cortex server to a specific project root. **Use this ONLY when:** get_cortex_status reports a mismatched path (e.g., the IDE's installation folder instead of your project). This re-initializes the Knowledge Manager and fixes path-based tool failures.",
          inputSchema: {
            type: "object",
            required: ["path"],
            properties: {
              path: {
                type: "string",
                description:
                  "Absolute path to the project root (e.g. C:/Users/name/Desktop/Project).",
              },
            },
          },
        },
        {
          name: "audit",
          description:
            "Perform an architectural audit to find stale entities and blast-radius victims.",
          inputSchema: { type: "object", properties: {} },
        },
        {
          name: "export",
          description:
            "Export knowledge base artifacts. type='spec' (default) generates ARCH_SPEC.md — a full text description of every entity, concept, constraint, and failed approach. type='graph' generates ARCH_GRAPH.md — a Mermaid dependency diagram with quality-colored nodes. Both files are written to the project root.",
          inputSchema: {
            type: "object",
            properties: {
              type: {
                type: "string",
                enum: ["spec", "graph"],
                description: "'spec' (default) exports ARCH_SPEC.md, 'graph' exports ARCH_GRAPH.md (or ARCH_GRAPH_<scope>.md when scope is set)",
              },
              scope: {
                type: "string",
                description: "For type='graph': focus the export around this entity. Writes ARCH_GRAPH_<scope>.md instead of ARCH_GRAPH.md.",
              },
              depth: {
                type: "number",
                description: "For type='graph' with scope: max hops from scope entity (default: 2).",
              },
            },
          },
        },
        {
          name: "refresh_stale_entities",
          description:
            "Clear the stale flag on entities you have verified as still-valid after inspecting them with read_entity. Use this during the audit workflow when a stale entity's dependency changed but the change did NOT invalidate any of the entity's documented behavior, contracts, or invariants. Do NOT use this to silently dismiss real drift — only for verified-clean entities. If an entity actually needs updating because its description is now wrong, re-emit it via save_synthesis instead.",
          inputSchema: {
            type: "object",
            required: ["names"],
            properties: {
              names: {
                type: "array",
                items: { type: "string" },
                description:
                  "Names of stale entities you've verified as unaffected by the upstream change.",
              },
            },
          },
        },
        {
          name: "log_query",
          description: "Query the architectural log JSONL for timeline and events.",
          inputSchema: {
            type: "object",
            properties: {
              entity: { type: "string" },
              since: { type: "string" },
              warningsOnly: { type: "boolean" }
            }
          }
        },
        {
          name: "audit_evidence",
          description: "Check for evidence drift (missing source files or mismatched snippet contents) in the knowledge base.",
          inputSchema: { type: "object", properties: {} }
        },
        {
          name: "lint",
          description: "Perform structural integrity checks on the architectural graph (orphans, silos, cycles, god_modules).",
          inputSchema: { type: "object", properties: {} }
        },
        {
          name: "evolution_entity",
          description: "Reconstruct timeline for a given entity.",
          inputSchema: {
            type: "object",
            required: ["entity"],
            properties: {
              entity: { type: "string" }
            }
          }
        },
        {
          name: "get_entity_quality",
          description: "Phase 7.5 — return the quality breakdown (overall + per-dimension scores) for a named entity. Use this to explain WHY an entity's quality score is what it is: evidence freshness, contradictions, staleness, age, and human-review status are returned as separate 0.0-1.0 components.",
          inputSchema: {
            type: "object",
            required: ["entity"],
            properties: {
              entity: { type: "string", description: "Entity name exactly as in the index." }
            }
          }
        },
        {
          name: "audit_quality",
          description: "List all entities ranked by quality score ascending (lowest quality first). Shows per-dimension breakdown: evidenceFreshness, contradiction, staleness, age, humanReview. Entities below CORTEX_QUALITY_GATE (default 0.5) are flagged. Use this to find the weakest knowledge entries and decide which to re-ingest or human-review.",
          inputSchema: { type: "object", properties: {} },
        },
        {
          name: "review_entity",
          description: "Accept or reject a human review for an entity, directly affecting its quality score. 'accept' sets human_reviewed=true (boosts humanReview dimension from 0.7→1.0). 'reject' clears the flag. Use this after inspecting an entity with read_entity and confirming the synthesis is accurate.",
          inputSchema: {
            type: "object",
            required: ["entity", "action"],
            properties: {
              entity: { type: "string", description: "Entity name exactly as it appears in the knowledge index." },
              action: { type: "string", enum: ["accept", "reject"], description: "'accept' to mark as human-reviewed, 'reject' to clear the flag." },
              reviewer: { type: "string", description: "Optional reviewer name to record alongside the review." },
            },
          },
        },
        {
          name: "impact_analysis",
          description: "Show every entity that depends on a given entity, ranked by hop distance. Use this BEFORE refactoring to understand blast radius. Set direction='outbound' to see what the entity depends on instead (same as `cortex deps`). Set hypothetical='delete' to simulate removing the entity and see what would break.",
          inputSchema: {
            type: "object",
            properties: {
              entity: { type: "string", description: "The entity name to analyse." },
              direction: { type: "string", enum: ["inbound", "outbound"], description: "'inbound' (default) = who depends on this entity; 'outbound' = what this entity depends on." },
              depth: { type: "number", description: "Max traversal depth (default: 10)." },
              hypothetical: { type: "string", enum: ["delete"], description: "Simulate deleting the entity — lists direct dependents that would break." },
            },
            required: ["entity"],
          },
        },
        {
          name: "graph",
          description: "Generate a Mermaid or JSON knowledge graph from the architectural memory. **Always call this tool** when asked for any architecture diagram, dependency map, module relationships, or 'show me what touches X' requests — even for focused/scoped views. Use the `scope` parameter to focus on a single entity (e.g. scope='BookingController' to see only booking-related nodes). Never draw a Mermaid diagram manually — Cortex has the real dependency edges with quality-colored nodes.",
          inputSchema: {
            type: "object",
            properties: {
              scope: { type: "string", description: "Focus the subgraph around this entity name (bidirectional BFS from that node)." },
              depth: { type: "number", description: "Max hops from scope entity (default: unlimited). Only used when scope is set." },
              includeConcepts: { type: "boolean", description: "Include concept nodes in the graph (default: false)." },
              format: { type: "string", enum: ["mermaid", "json"], description: "Output format: 'mermaid' (default) returns a Mermaid flowchart LR string; 'json' returns the raw KnowledgeGraph object." },
            },
          },
        },
        {
          name: "before_change",
          description: "Pre-flight bundle for any modify, refactor, rename, or delete task. Call this INSTEAD of calling read_entity + impact_analysis separately. Returns in one shot: the entity's full page (Role/Interface/Behavior/Wiring), the complete inbound blast-radius (all dependents ranked by hop), and any concept invariants the entity implements. Use this before touching any existing entity — it gives you everything needed to assess risk and plan safely.",
          inputSchema: {
            type: "object",
            properties: {
              entity: { type: "string", description: "The entity you are about to modify, refactor, rename, or delete." },
            },
            required: ["entity"],
          },
        },
        {
          name: "smart_audit",
          description: "Enhanced audit that returns stale entities bundled with their full entity pages and inbound blast-radius — everything needed to triage and fix staleness in one call. Use instead of calling audit + read_entity + impact_analysis separately.",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "cortex_onboard",
          description: "Generate a tailored, PageRank-centrality prioritized onboarding guide for a given audience and depth. Use this INSTEAD of read_knowledge_index when the user asks for an architectural tour, summary, or onboarding guide. If the user has not explicitly chosen an audience and depth, do not guess. Ask them to choose before calling this tool. IMPORTANT: Once you receive the guide, you MUST write it directly to a file named '.knowledge/onboarding_[audience]_[depth].md' using your own file-writing tool (e.g. write_to_file) to ensure it is successfully synced to the user's physical workspace.",
          inputSchema: {
            type: "object",
            properties: {
              audience: { type: "string", enum: ["junior", "senior", "domain-expert"], description: "Target audience (default: 'junior')" },
              depth: { type: "string", enum: ["quick", "thorough"], description: "walkthrough depth (default: 'quick')" }
            }
          }
        },
        {
          name: "cortex_find",
          description: "Perform category-scoped sub-millisecond search across active knowledge (entities, concepts, parents) with exact name priority. Use this INSTEAD of grep or read_knowledge_index when the user asks to find specific concepts or logic.",
          inputSchema: {
            type: "object",
            required: ["query"],
            properties: {
              query: { type: "string", description: "Search query string" },
              type: { type: "string", enum: ["entity", "concept", "parent", "all"], description: "Category filter (default: 'all')" }
            }
          }
        },
        {
          name: "resolve_refs",
          description: "Resolve one or more `§ref:<hash>§` placeholders returned by read_knowledge_index, read_entity, or read_concept in a long session. When the same content block appears multiple times, Cortex replaces repeated occurrences with a short hash reference to save tokens. Call this to expand those references back to their original text.",
          inputSchema: {
            type: "object",
            required: ["refs"],
            properties: {
              refs: {
                type: "array",
                items: { type: "string" },
                description: "Array of hash strings from §ref:<hash>§ placeholders (just the hash part, without §ref: and §).",
              },
            },
          },
        },
        {
          name: "build_context_pack",
          description: "Build a token-bounded knowledge bundle optimised for AI context injection. Ranks entities by graph centrality (most-referenced first) so nothing important is buried, annotates low-quality entities with inline warnings, and hard-caps output at the token budget. Use this instead of read_knowledge_index when the knowledge base is large or when you need a focused slice — it guarantees the highest-signal content fits within the budget.",
          inputSchema: {
            type: "object",
            properties: {
              budget: { type: "number", description: "Token budget (default: 8000)." },
              scope: { type: "string", description: "Root entity or concept to focus the bundle around (optional — omit for full knowledge base)." },
              depth: { type: "number", description: "Max link traversal depth from scope entity (default: unlimited)." },
              format: { type: "string", enum: ["markdown", "json"], description: "Output format (default: markdown)." },
            },
          },
        },
        {
          name: "estimate_cost",
          description: "Estimate the token count and USD cost of the next Cortex sync — no LLM calls made. Returns input/output token estimates and per-provider costs for GPT-4o, Claude-3.5-Sonnet, and Gemini-1.5-Pro. Use this before running ingest to inform the user of expected cost, or to check whether a budget ceiling would be exceeded.",
          inputSchema: {
            type: "object",
            properties: {
              budget: { type: "number", description: "Optional USD ceiling — response flags whether the estimate exceeds it (e.g. 0.05)." },
            },
          },
        },
        {
          name: "configure_brevity",
          description: "Configure the active brevity level for the Cortex context (off, lite, ultra).",
          inputSchema: {
            type: "object",
            required: ["level"],
            properties: {
              level: {
                type: "string",
                enum: ["off", "lite", "ultra"],
                description: "The active brevity level. 'off' disables compression. 'lite' enables dynamic response minification. 'ultra' enables maximum telegraphic compression + system prompt instructions.",
              },
            },
          },
        },
        {
          name: "compress",
          description: "Compress one or more Markdown (.md) files or directories on disk in-place to strip prose fluff and save tokens. Path can be a single file (e.g. '.knowledge/entities/Auth.md') or a directory (e.g. '.knowledge').",
          inputSchema: {
            type: "object",
            required: ["path"],
            properties: {
              path: {
                type: "string",
                description: "The repo-relative path to the file or directory to compress (e.g. '.knowledge').",
              },
            },
          },
        },
        {
          name: "get_savings",
          description: "Retrieve cumulative token and cost savings ledger metrics. Displays total ROI, reduction ratio, counts, and savings totals per category. Optionally renders a rolling 30-day chronological bar chart. NOTE: This tool automatically exports 'ARCH_SAVINGS.md' to the project root when called; you should always inform the user that this file was successfully generated.",
          inputSchema: {
            type: "object",
            properties: {
              graph: {
                type: "boolean",
                description: "If true, renders the rolling 30-day chronological bar chart instead of the summary table.",
              },
            },
          },
        },
      ];
      if (brevity === "lite" || brevity === "ultra") {
        for (const t of tools) {
          if (COMPRESSED_TOOL_DESCRIPTIONS[t.name]) {
            t.description = COMPRESSED_TOOL_DESCRIPTIONS[t.name];
          }
        }
      }
      return { tools };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { getBrevityLevel, minifyProse } = await import("../knowledge/brevity.js");
      const brevity = getBrevityLevel(this.projectRoot);

      const executeHandler = async () => {
        const { name, arguments: args } = request.params;

      if (name === "get_cortex_status") {
        const knowledgeExists = await this.knowledge.exists();
        const lastSync = await this.knowledge.getLastSyncCommit();
        const staleCount = await this.knowledge.getStaleCount();
        // Phase 7.5 — surface low-quality count alongside staleCount so an
        // IDE agent can show "3 entities below quality gate" without a
        // separate audit call.
        let lowQualityCount = 0;
        try {
          lowQualityCount = await this.knowledge.getLowQualityCount();
        } catch {
          // ignore — keep status responsive even if quality compute fails
        }
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  status: knowledgeExists ? "initialized" : "not initialized",
                  lastSyncCommit: lastSync || "never synced",
                  projectRoot: this.projectRoot,
                  staleCount: staleCount,
                  lowQualityCount: lowQualityCount,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      if (name === "configure_brevity") {
        const level = (args as any)?.level;
        if (level !== "off" && level !== "lite" && level !== "ultra") {
          return {
            content: [{ type: "text", text: "configure_brevity requires a 'level' of 'off', 'lite', or 'ultra'." }],
            isError: true,
          };
        }
        const configPath = path.join(this.projectRoot, "cortex.json");
        let config: any = {};
        try {
          const raw = await fs.readFile(configPath, "utf-8");
          config = JSON.parse(raw);
        } catch {
          // ignore, start fresh
        }
        config.brevity = level;
        await fs.writeFile(configPath, JSON.stringify(config, null, 2), "utf-8");
        
        return {
          content: [
            {
              type: "text",
              text: `✅ Dynamic Brevity Level successfully configured to: **${level}** in cortex.json. All subsequent MCP responses and tool descriptions will automatically adapt!`,
            },
          ],
        };
      }

      if (name === "get_savings") {
        const graph = (args as any)?.graph === true;
        const { getSavingsReport } = await import("../cli/savings.js");
        try {
          const report = await getSavingsReport(this.projectRoot, { graph, stripAnsi: true });
          return {
            content: [
              {
                type: "text",
                text: report,
              },
            ],
          };
        } catch (error: any) {
          return {
            content: [
              {
                type: "text",
                text: `Failed to retrieve savings: ${error.message}`,
              },
            ],
            isError: true,
          };
        }
      }

      if (name === "compress") {
        const targetPath = (args as any)?.path;
        if (typeof targetPath !== "string" || !targetPath.trim()) {
          return {
            content: [{ type: "text", text: "compress requires a non-empty 'path' argument." }],
            isError: true,
          };
        }

        const { runCompress } = await import("../cli/compress.js");

        // Capture console.log and console.error outputs
        const originalLog = console.log;
        const originalError = console.error;

        const logs: string[] = [];
        console.log = (...msgs: any[]) => {
          logs.push(msgs.map(m => String(m)).join(" "));
        };
        console.error = (...msgs: any[]) => {
          logs.push(`[ERROR] ` + msgs.map(m => String(m)).join(" "));
        };

        try {
          await runCompress(this.projectRoot, targetPath, { inplace: true });
        } catch (err: any) {
          logs.push(`[ERROR] Failed to run compression: ${err.message}`);
        } finally {
          console.log = originalLog;
          console.error = originalError;
        }

        return {
          content: [
            {
              type: "text",
              text: logs.join("\n"),
            },
          ],
        };
      }

      if (name === "get_entity_quality") {
        const entityName = (args as any)?.entity;
        if (typeof entityName !== "string" || !entityName.trim()) {
          return {
            content: [{ type: "text", text: "get_entity_quality requires a non-empty 'entity' argument." }],
            isError: true,
          };
        }
        const breakdown = await this.knowledge.getEntityQuality(entityName);
        if (breakdown === null) {
          return {
            content: [{ type: "text", text: `No entity named "${entityName}" found.` }],
            isError: true,
          };
        }
        return {
          content: [{ type: "text", text: JSON.stringify({ entity: entityName, ...breakdown }, null, 2) }],
        };
      }

      if (name === "audit") {
        const entities = await this.knowledge.getStaleEntities();
        return {
          content: [
            {
              type: "text",
              text:
                entities.length > 0
                  ? `Found ${entities.length} stale entities:\n\n${entities.map((e) => `- ${e.name} (Stale since: ${e.staleSince})`).join("\n")}`
                  : "✅ No stale entities found. Architecture is fully synchronized.",
            },
          ],
        };
      }

      if (name === "log_query") {
        const am = new AuditManager(this.projectRoot);
        const entries = await am.queryLog(args as any || {});
        return { content: [{ type: "text", text: JSON.stringify(entries, null, 2) }] };
      }

      if (name === "audit_evidence") {
        const am = new AuditManager(this.projectRoot);
        const issues = await am.auditEvidence();
        if (issues.length === 0) return { content: [{ type: "text", text: "✅ No evidence drift detected." }] };
        return { content: [{ type: "text", text: `Found ${issues.length} evidence issues:\n` + issues.map(i => `- ${i.entity}: ${i.issue} (Source: ${i.sourceFile})`).join("\n") }] };
      }

      if (name === "lint") {
        const lm = new LintManager(this.projectRoot);
        const results = await lm.lint();
        if (results.length === 0) return { content: [{ type: "text", text: "✅ No graph integrity issues detected." }] };
        return { content: [{ type: "text", text: `Found ${results.length} lint issues:\n` + results.map(r => `[${r.severity.toUpperCase()}] ${r.rule}: ${r.entity ? `[${r.entity}] ` : ''}${r.message}`).join("\n") }] };
      }

      if (name === "evolution_entity") {
        const entityName = (args as any)?.entity;
        if (typeof entityName !== "string" || !entityName.trim()) {
          return {
            content: [{ type: "text", text: "evolution_entity requires a 'entity' string argument." }],
            isError: true,
          };
        }
        const em = new EvolutionManager(this.projectRoot);
        const entries = await em.getEvolution(entityName);
        return { content: [{ type: "text", text: JSON.stringify(entries, null, 2) }] };
      }

      if (name === "export") {
        const type = (args as any)?.type ?? "spec";
        if (type === "graph") {
          const scope = (args as any)?.scope as string | undefined;
          const depth = (args as any)?.depth as number | undefined;
          const outputPath = await runExportGraph(this.projectRoot, { scope, depth });
          return { content: [{ type: "text", text: `✅ Architecture graph exported to: ${outputPath}` }] };
        }
        const outputPath = await this.knowledge.exportSpec();
        return { content: [{ type: "text", text: `✅ Architectural Specification exported to: ${outputPath}` }] };
      }

      if (name === "refresh_stale_entities") {
        const rawNames = (args as any)?.names;
        if (
          !Array.isArray(rawNames) ||
          rawNames.some((n) => typeof n !== "string")
        ) {
          return {
            content: [
              {
                type: "text",
                text: "refresh_stale_entities requires a 'names' string array.",
              },
            ],
            isError: true,
          };
        }
        const { cleared, skipped } =
          await this.knowledge.refreshStaleEntities(rawNames);
        const lines: string[] = [];
        if (cleared.length > 0) {
          lines.push(
            `✅ Refreshed ${cleared.length} stale entit${cleared.length === 1 ? "y" : "ies"}: ${cleared.join(", ")}`,
          );
        }
        if (skipped.length > 0) {
          lines.push(
            `⚠️ Skipped ${skipped.length} (not stale or not found): ${skipped.join(", ")}`,
          );
        }
        if (lines.length === 0) lines.push("No entities were refreshed.");
        return { content: [{ type: "text", text: lines.join("\n") }] };
      }
      if (name === "cortex_onboard") {
        const audience = ((args as any)?.audience || "junior") as "junior" | "senior" | "domain-expert";
        const depth = ((args as any)?.depth || "quick") as "quick" | "thorough";
        const { OnboardingManager } = await import("../knowledge/onboarding.js");
        const om = new OnboardingManager(this.knowledge);
        const guide = await om.generateOnboarding({ audience, depth });
        const output = `Successfully exported to .knowledge/onboarding_${audience}_${depth}.md\n\n${guide}`;
        return {
          content: [{ type: "text", text: output }],
        };
      }

      if (name === "cortex_find") {
        const query = (args as any)?.query;
        const type = ((args as any)?.type || "all") as "entity" | "concept" | "parent" | "all";
        if (typeof query !== "string" || !query.trim()) {
          return {
            content: [{ type: "text", text: "cortex_find requires a non-empty 'query' string parameter." }],
            isError: true,
          };
        }
        const { FindManager } = await import("../knowledge/find.js");
        const fm = new FindManager(this.knowledge);
        const results = await fm.find(type, query);
        if (results.length === 0) {
          return {
            content: [{ type: "text", text: "No matches found." }],
          };
        }
        const lines = results.map(r => {
          const typeLabel = r.type === "parent" ? "📁 parent" : r.type === "concept" ? "💡 concept" : "📄 entity";
          return `* [[${r.name}]] (${typeLabel})\n  ${r.preview}`;
        });
        return {
          content: [{ type: "text", text: `Found ${results.length} matches:\n\n` + lines.join("\n\n") }],
        };
      }

      if (name === "ingest" || name === "get_pending_changes") {
        let systemPrompt = LIBRARIAN_SYSTEM_PROMPT;
        if (brevity === "ultra") {
          systemPrompt += "\n\nCRITICAL: Output MUST be extremely terse, telegraphic, and dense. Strip all conversational filler, preambles, and polite transitions. Keep descriptions and summaries direct, compact, and completely focused on key architectural facts.";
        }

        // BOOTSTRAP PATH: when the knowledge base is empty, never send a diff —
        // the most recent commits are usually just the installation of Cortex
        // itself (.knowledge/, .antigravity/, etc.), which would poison the
        // first synthesis. Instead, hand the AI a curated source-file list and
        // tell it to scan the user's actual code with its own tools.
        if (await this.knowledge.isEmpty()) {
          const fileList = await listSourceFiles(this.projectRoot);
          const rendered = renderFileList(fileList);
          const prompt = BOOTSTRAP_PROMPT_TEMPLATE(rendered);

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    mode: "bootstrap",
                    systemPrompt: systemPrompt,
                    userPrompt: prompt,
                    outputSchema: {
                      summary:
                        "string — 1-2 sentence description of what this application does",
                      entities:
                        "array of { name, action: 'create', description, relationships: { target, kind }[], constraints?, failedApproaches?, sourceFile? }",
                      concepts:
                        "array of { name, description, failedApproaches? }",
                      warnings: "array of strings (usually empty on bootstrap)",
                    },
                    instructions:
                      "Bootstrap mode — the knowledge base is empty. Use your filesystem tools (Read, Glob, Grep) to inspect the files listed in userPrompt and synthesize the application's full architecture. The git diff has been intentionally excluded because it usually reflects the installation of Project Cortex itself, not the user's code. Emit every documented file as action: 'create'. Then call save_synthesis with the result.",
                    fileListMeta: {
                      totalFound: fileList.totalFound,
                      truncated: fileList.truncated,
                      source: fileList.source,
                    },
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        }

        // INCREMENTAL PATH: knowledge exists — diff against the last sync.
        const lastSync = await this.knowledge.getLastSyncCommit();
        const diff = await getPendingDiff(this.projectRoot, lastSync);
        const knowledgeContext = await this.knowledge.getKnowledgeSummary();
        const staleEntities = await this.knowledge.getStaleEntities();

        if (!diff.trim() && staleEntities.length === 0) {
          return {
            content: [
              { type: "text", text: "No pending changes since last sync." },
            ],
          };
        }

        // When there's no diff but stale entities exist, the user invoked
        // ingest specifically to heal blast-radius staleness. Route them to
        // the audit workflow — it's the dedicated healing path.
        if (!diff.trim() && staleEntities.length > 0) {
          return {
            content: [
              {
                type: "text",
                text: `No pending code changes since last sync, but ${staleEntities.length} entit${staleEntities.length === 1 ? "y is" : "ies are"} stale from prior blast-radius propagation:\n\n${staleEntities.map((e) => `- ${e.name} (stale since ${e.staleSince})`).join("\n")}\n\nRun the /audit workflow to verify and heal them — it inspects each stale entity, refreshes the ones still accurate, and re-synthesizes the ones whose descriptions no longer match the code.`,
              },
            ],
          };
        }

        const guardrails = await this.knowledge.getEntityGuardrails();
        const prompt = EXTRACTION_PROMPT_TEMPLATE(
          diff,
          knowledgeContext,
          staleEntities,
          guardrails,
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  mode: "incremental",
                  systemPrompt: systemPrompt,
                  userPrompt: prompt,
                  staleEntities: staleEntities.map((e) => ({
                    name: e.name,
                    staleSince: e.staleSince,
                    sourceFile: e.sourceFile,
                  })),
                  outputSchema: {
                    summary: "string — 1-2 sentence high-level summary",
                    entities:
                      "array of { name, action: create|update|delete, description, relationships: { target, kind }[], constraints?, failedApproaches?, sourceFile? }",
                    concepts:
                      "array of { name, description, failedApproaches? }",
                    warnings: "array of strings",
                  },
                  instructions:
                    "Follow the systemPrompt. Analyze the userPrompt. Return a synthesis object matching outputSchema. Then call save_synthesis with the result. If the userPrompt lists pre-existing stale entities, follow its instructions for healing them (refresh_stale_entities for verified-clean, include in the synthesis for those needing updates).",
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      if (name === "save_synthesis") {
        const rawSynthesis = (args as any)?.synthesis;
        const parsed = SynthesisSchema.safeParse(rawSynthesis);

        if (!parsed.success) {
          return {
            content: [
              {
                type: "text",
                text: `Invalid synthesis format: ${parsed.error.message}`,
              },
            ],
            isError: true,
          };
        }

        try {
          await this.knowledge.init();
          await this.knowledge.saveSynthesis(parsed.data);
          await this.knowledge.updateLastSyncCommit(this.projectRoot);
        } catch (error: any) {
          if (error.message?.startsWith("Constraint Violation:")) {
            return {
              content: [
                {
                  type: "text",
                  text: `Synthesis rejected due to architectural constraint violation:\n${error.message}\n\nPlease revise your synthesis to adhere to the invariants.`,
                },
              ],
              isError: true,
            };
          }
          throw error;
        }

        // Write the knowledge index plus operating rules to GEMINI.md.
        // Antigravity IDE (v1.20.3+) and the Gemini CLI both auto-load this
        // file at session start — same role CLAUDE.md plays for Claude Code.
        // The operating rules section instructs the AI to use Cortex MCP tools
        // before any code-change task (implement/fix/refactor/etc).
        try {
          const index = await this.knowledge.getKnowledgeSummary();
          if (index && index !== "No existing knowledge found.") {
            const geminiMd = path.join(this.projectRoot, "GEMINI.md");
            const operatingRules = [
              "# Operating Rules — Project Cortex",
              "",
              "This project uses Project Cortex (`project-cortex` MCP server). For any task that **changes code** — implement, fix, refactor, modify, add, build, create, update, migrate, rewrite, rename, move, delete — you MUST run this pre-flight before opening any source file:",
              "",
              "1. Call `read_knowledge_index` (project-cortex MCP) to see what already exists.",
              "2. Find the relevant entity in the index below.",
              "3. Call `read_entity` for it; read the `## Wiring` section to identify every downstream consumer (each `[[WikiLink]]` is something that may break).",
              "4. For related concepts the entity Implements, call `read_concept` to learn the invariants.",
              "5. State a one-paragraph plan: which entities you'll touch, which dependents could be affected, which invariants apply.",
              "6. ONLY THEN open source files and write code.",
              "",
              "Skipping this risks duplicating implementations, breaking unknown dependents, and violating documented invariants. If the knowledge base is empty for the task, say so and recommend `/ingest` first.",
              "",
              "For purely conceptual questions (*what is X*, *how does Y work*), reading the index below is usually sufficient — skip the deep entity reads.",
              "",
              "For any request involving an **architecture diagram, dependency map, module relationships, or 'what touches X'** — **always call `graph` (project-cortex MCP)** rather than drawing a diagram manually. Use the `scope` parameter to focus on a single entity (e.g. `scope: \"BookingController\"`). Never construct Mermaid syntax by hand — Cortex holds the authoritative dependency edges with quality-colored nodes.",
              "",
              "### MANDATORY: Always Output Brevity Statistics",
              "If brevity mode is active (the tool response contains a `📉 Cortex Brevity Stats` section), you MUST always preserve, copy, and append this exact statistics block at the very bottom of your final response to the user so they can track their token savings. Do not hide, truncate, or prune it.",
              "",
              "---",
              "",
            ].join("\n");
            const content = `<!-- Auto-generated by Project Cortex on every synthesis. Do not edit manually. -->\n\n${operatingRules}\n${index}\n`;
            await fs.writeFile(geminiMd, content, "utf-8");
          }
        } catch {
          // non-fatal — knowledge was saved, GEMINI.md update is best-effort
        }

        if (this.onAfterKnowledgeSave) {
          try {
            await this.onAfterKnowledgeSave();
          } catch (err) {
            console.error("[Cortex MCP] onAfterKnowledgeSave failed:", err);
          }
        }

        return {
          content: [
            {
              type: "text",
              text: `Knowledge base updated. Saved ${parsed.data.entities.length} entities, ${parsed.data.concepts.length} concepts.`,
            },
          ],
        };
      }

      if (name === "save_concept") {
        const rawConcept = (args as any)?.concept;
        const parsed = SaveConceptSchema.safeParse(rawConcept);

        if (!parsed.success) {
          return {
            content: [
              {
                type: "text",
                text: `Invalid concept format: ${parsed.error.message}`,
              },
            ],
            isError: true,
          };
        }

        await this.knowledge.init();
        await this.knowledge.saveConcept(parsed.data);

        return {
          content: [
            {
              type: "text",
              text: `Concept '${parsed.data.name}' saved to knowledge base.`,
            },
          ],
        };
      }

      if (name === "resolve_refs") {
        const refs = (args as any)?.refs;
        if (!Array.isArray(refs) || refs.some((r) => typeof r !== "string")) {
          return { content: [{ type: "text", text: "resolve_refs requires a 'refs' string array." }], isError: true };
        }
        const resolved = resolveRefs(refs, this.sessionId);
        return { content: [{ type: "text", text: JSON.stringify(resolved, null, 2) }] };
      }

      if (name === "read_knowledge_index") {
        const content = await this.knowledge.getKnowledgeSummary();
        const compressed = compressResponse(content, this.sessionId, true);
        
        // Ledger reference compression tracking
        const originalTokens = Math.round(content.length / 4);
        const compressedTokens = Math.round(compressed.length / 4);
        const saved = Math.max(0, originalTokens - compressedTokens);
        if (saved > 0) {
          import("../knowledge/ledger.js").then(({ appendTransaction, calculateSavedUsd }) => {
            const provider = process.env.CORTEX_PROVIDER || "openai";
            const model = process.env.CORTEX_MODEL || "gpt-4o";
            const savedUsd = calculateSavedUsd(saved, provider, this.projectRoot);
            return appendTransaction(this.projectRoot, {
              category: "reference_compression",
              provider,
              model,
              originalTokens,
              denseTokens: compressedTokens,
              savedTokens: saved,
              savedUsd,
              details: "Compressed read_knowledge_index response",
            });
          }).catch(() => {});
        }

        return { content: await this.withSavings(compressed) };
      }

      if (name === "read_entity") {
        const entityName = (args as any)?.name;
        if (typeof entityName !== "string" || !entityName.trim()) {
          return {
            content: [
              {
                type: "text",
                text: "read_entity requires a non-empty 'name' argument.",
              },
            ],
            isError: true,
          };
        }
        const body = await this.knowledge.readEntity(entityName);
        if (body === null) {
          return {
            content: [
              {
                type: "text",
                text: `No entity named "${entityName}" found. Call read_knowledge_index to see available entities.`,
              },
            ],
            isError: true,
          };
        }
        const withGuidance = body + `\n\n> **Pre-modification:** If you are about to modify or delete \`${entityName}\`, call \`impact_analysis(entity="${entityName}", direction="inbound")\` first and present the blast-radius to the user before writing any code.`;
        const compressed = compressResponse(withGuidance, this.sessionId, true);

        // Ledger reference compression tracking
        const originalTokens = Math.round(withGuidance.length / 4);
        const compressedTokens = Math.round(compressed.length / 4);
        const saved = Math.max(0, originalTokens - compressedTokens);
        if (saved > 0) {
          import("../knowledge/ledger.js").then(({ appendTransaction, calculateSavedUsd }) => {
            const provider = process.env.CORTEX_PROVIDER || "openai";
            const model = process.env.CORTEX_MODEL || "gpt-4o";
            const savedUsd = calculateSavedUsd(saved, provider, this.projectRoot);
            return appendTransaction(this.projectRoot, {
              category: "reference_compression",
              provider,
              model,
              originalTokens,
              denseTokens: compressedTokens,
              savedTokens: saved,
              savedUsd,
              details: `Compressed read_entity (name: ${entityName}) response`,
            });
          }).catch(() => {});
        }

        return { content: await this.withSavings(compressed) };
      }

      if (name === "read_concept") {
        const conceptName = (args as any)?.name;
        if (typeof conceptName !== "string" || !conceptName.trim()) {
          return {
            content: [
              {
                type: "text",
                text: "read_concept requires a non-empty 'name' argument.",
              },
            ],
            isError: true,
          };
        }
        const body = await this.knowledge.readConcept(conceptName);
        if (body === null) {
          return {
            content: [
              {
                type: "text",
                text: `No concept named "${conceptName}" found. Call read_knowledge_index to see available concepts.`,
              },
            ],
            isError: true,
          };
        }
        const compressed = compressResponse(body, this.sessionId, true);

        // Ledger reference compression tracking
        const originalTokens = Math.round(body.length / 4);
        const compressedTokens = Math.round(compressed.length / 4);
        const saved = Math.max(0, originalTokens - compressedTokens);
        if (saved > 0) {
          import("../knowledge/ledger.js").then(({ appendTransaction, calculateSavedUsd }) => {
            const provider = process.env.CORTEX_PROVIDER || "openai";
            const model = process.env.CORTEX_MODEL || "gpt-4o";
            const savedUsd = calculateSavedUsd(saved, provider, this.projectRoot);
            return appendTransaction(this.projectRoot, {
              category: "reference_compression",
              provider,
              model,
              originalTokens,
              denseTokens: compressedTokens,
              savedTokens: saved,
              savedUsd,
              details: `Compressed read_concept (name: ${conceptName}) response`,
            });
          }).catch(() => {});
        }

        return { content: await this.withSavings(compressed) };
      }

      if (name === "set_project_root") {
        const newPath = (args as any)?.path;
        if (typeof newPath !== "string" || !newPath.trim()) {
          return {
            content: [
              {
                type: "text",
                text: "set_project_root requires a 'path' argument.",
              },
            ],
            isError: true,
          };
        }
        this.setProjectRoot(newPath);
        return {
          content: [
            {
              type: "text",
              text: `Project root manually updated to: ${newPath}. Knowledge Manager re-initialized. Now retry the tool call that failed (e.g. before_change, impact_analysis, smart_audit).`,
            },
          ],
        };
      }

      if (name === "audit_quality") {
        if (!(await this.knowledge.exists())) {
          return { content: [{ type: "text", text: "Knowledge base not initialized. Run `cortex init` first." }] };
        }
        const rows = await this.knowledge.listEntityQuality();
        if (rows.length === 0) {
          return { content: [{ type: "text", text: "No entities to evaluate. Knowledge base is empty." }] };
        }
        const gate = readQualityGate();
        const below = rows.filter((r) => r.breakdown.score < gate);
        const decileSize = Math.max(1, Math.floor(rows.length / 10));
        const bottomDecile = new Set(rows.slice(0, decileSize).map((r) => r.name));
        const lines: string[] = [`Quality audit — ${rows.length} entities · gate ${gate.toFixed(2)} · bottom decile flagged ⬇️\n`];
        for (const row of rows) {
          const b = row.breakdown;
          const flag = bottomDecile.has(row.name) ? " ⬇️" : "";
          const fail = b.score < gate ? " ❌" : "";
          const source = row.sourceFile ? ` — \`${row.sourceFile}\`` : "";
          lines.push(`${b.score.toFixed(2)}  ${row.name}${source}${flag}${fail}`);
          lines.push(`       evidence ${b.evidenceFreshness.toFixed(2)} · contradictions ${b.contradiction.toFixed(2)} · staleness ${b.staleness.toFixed(2)} · age ${b.age.toFixed(2)} · human-review ${b.humanReview.toFixed(2)}`);
        }
        lines.push("");
        if (below.length === 0) {
          lines.push(`✅ All ${rows.length} entities meet the quality gate (${gate.toFixed(2)}).`);
        } else {
          lines.push(`❌ ${below.length}/${rows.length} entit${below.length === 1 ? "y is" : "ies are"} below the quality gate (${gate.toFixed(2)}).`);
        }
        return { content: [{ type: "text", text: lines.join("\n") }] };
      }

      if (name === "review_entity") {
        const entityName = (args as any)?.entity;
        const action = (args as any)?.action;
        const reviewer = (args as any)?.reviewer;
        if (typeof entityName !== "string" || !entityName.trim()) {
          return { content: [{ type: "text", text: "review_entity requires a non-empty 'entity' argument." }], isError: true };
        }
        if (action !== "accept" && action !== "reject") {
          return { content: [{ type: "text", text: "review_entity requires 'action' to be 'accept' or 'reject'." }], isError: true };
        }
        if (!(await this.knowledge.exists())) {
          return { content: [{ type: "text", text: "Knowledge base not initialized. Run `cortex init` first." }], isError: true };
        }
        const result = await this.knowledge.setHumanReview(entityName, action === "accept", reviewer);
        if (!result.ok) {
          return { content: [{ type: "text", text: `❌ ${result.reason}` }], isError: true };
        }
        const msg = action === "accept"
          ? `✅ Marked '${entityName}' as human-reviewed${reviewer ? ` (reviewer: ${reviewer})` : ""}. Quality score updated immediately.`
          : `✅ Cleared human-review flag on '${entityName}'. Entity returns to unreviewed status.`;
        return { content: [{ type: "text", text: msg }] };
      }

      if (name === "impact_analysis") {
        if (!(await this.knowledge.exists())) {
          return { content: [{ type: "text", text: "Knowledge base not initialized. Run `cortex init` first." }] };
        }
        const entity = args?.entity as string;
        if (!entity) {
          return { content: [{ type: "text", text: "Missing required argument: entity" }] };
        }
        const direction = (args?.direction as "inbound" | "outbound") ?? "inbound";
        const depth = typeof args?.depth === "number" ? args.depth : 10;
        const hypothetical = args?.hypothetical as string | undefined;

        const state = await this.knowledge.getState();
        const graph = buildGraph(state);
        const report = buildImpactReport(graph, entity, direction, depth);

        if (report.totalCount === 0) {
          const entityCount = Object.keys(state.entities).length;
          const noEntities = entityCount === 0;
          const msg = direction === "inbound"
            ? `No dependents found for "${entity}". Safe to refactor freely.`
            : `"${entity}" has no outbound dependencies.`;
          const warning = noEntities
            ? `\n\n⚠ Warning: knowledge base appears empty (0 entities loaded from ${this.projectRoot}). This may indicate a wrong project root. Call \`get_cortex_status\` to verify, or use \`set_project_root\` to correct the path.`
            : "";
          return { content: [{ type: "text", text: msg + warning }] };
        }

        if (hypothetical === "delete") {
          const direct = report.entries.filter((e) => e.hop === 1);
          const lines: string[] = [
            `Hypothetical delete of: ${entity}`,
            `⚠  ${report.totalCount} entities affected (${direct.length} direct breakage):`,
            "",
          ];
          for (const e of direct) {
            const badge = e.lowQuality ? " ⚠ low-quality" : "";
            const stale = e.isStale ? " [STALE]" : "";
            lines.push(`  Hop 1  ${e.name}  quality:${e.qualityScore.toFixed(2)}${badge}${stale}  via ${e.via ?? "depends_on"}`);
          }
          const indirect = report.entries.filter((e) => e.hop > 1);
          if (indirect.length) {
            lines.push(`\n  + ${indirect.length} indirect dependents at hop 2+`);
          }
          return { content: [{ type: "text", text: lines.join("\n") }] };
        }

        const label = direction === "inbound" ? "Impact report" : "Dependency report";
        const lines: string[] = [`${label} for: ${entity}`, `Total: ${report.totalCount}`, ""];
        let currentHop = -1;
        for (const e of report.entries) {
          if (e.hop !== currentHop) {
            currentHop = e.hop;
            const hopLabel = direction === "inbound"
              ? (e.hop === 1 ? "Hop 1 (direct)" : `Hop ${e.hop}`)
              : (e.hop === 1 ? "Direct dependencies" : `Hop ${e.hop} (transitive)`);
            lines.push(hopLabel);
          }
          const badge = e.lowQuality ? " ⚠ low-quality" : "";
          const stale = e.isStale ? " [STALE]" : "";
          const via = e.via ? `  via ${e.via}` : "";
          lines.push(`  ${e.name}  quality:${e.qualityScore.toFixed(2)}${badge}${stale}${via}`);
        }
        return { content: [{ type: "text", text: lines.join("\n") }] };
      }

      if (name === "graph") {
        if (!(await this.knowledge.exists())) {
          return { content: [{ type: "text", text: "Knowledge base not initialized. Run `cortex init` first." }] };
        }
        const state = await this.knowledge.getState();
        const format = (args as any)?.format ?? "mermaid";
        const scope = (args as any)?.scope;
        const g = buildGraph(state, {
          scope,
          depth: (args as any)?.depth,
          includeConcepts: !!(args as any)?.includeConcepts,
        });
        const raw = format === "json" ? toJson(g) : toMermaid(g);
        let output = format === "json" ? raw : `\`\`\`mermaid\n${raw}\n\`\`\``;
        // Auto-export the full graph to ARCH_GRAPH.md as a side effect (always full graph, concepts included)
        if (!scope) {
          try {
            await runExportGraph(this.projectRoot);
            if (format !== "json") {
              output += `\n\n> 📄 Also saved to **ARCH_GRAPH.md** in your project root — open that file for the full rendered diagram (GitHub renders it with colors, or use \`cortex serve\` for the interactive viewer).`;
            }
          } catch {
            // non-fatal — return value is still correct
          }
        }
        return { content: [{ type: "text", text: output }] };
      }

      if (name === "before_change") {
        if (!(await this.knowledge.exists())) {
          return { content: [{ type: "text", text: "Knowledge base not initialized. Run `cortex init` first." }] };
        }
        const entity = (args as any)?.entity as string;
        if (!entity) {
          return { content: [{ type: "text", text: "Missing required argument: entity" }] };
        }

        const sections: string[] = [`# Pre-flight report: ${entity}\n> Blast-radius is already bundled below — do NOT call impact_analysis or read_entity separately.\n`];

        // 1 — Entity page
        const entityBody = await this.knowledge.readEntity(entity);
        if (entityBody === null) {
          const state = await this.knowledge.getState();
          const entityCount = Object.keys(state.entities).length;
          const rootWarning = entityCount === 0
            ? ` ⚠ Knowledge base appears empty at ${this.projectRoot} — this likely means the project root is wrong. Call set_project_root with the correct path, then retry before_change.`
            : ` Available entities: ${Object.keys(state.entities).join(", ")}`;
          return { content: [{ type: "text", text: `No entity named "${entity}" found.${rootWarning}` }] };
        }
        sections.push("## Entity\n" + entityBody);

        // 2 — Inbound blast radius
        const state = await this.knowledge.getState();
        const graph = buildGraph(state);
        const report = buildImpactReport(graph, entity, "inbound", 10);
        if (report.totalCount === 0) {
          sections.push("## Blast radius\nNo inbound dependents — safe to modify freely.");
        } else {
          const lines: string[] = [`## Blast radius (${report.totalCount} dependents)\n`];
          let currentHop = -1;
          for (const e of report.entries) {
            if (e.hop !== currentHop) {
              currentHop = e.hop;
              lines.push(e.hop === 1 ? "**Hop 1 — direct (immediate breakage risk)**" : `**Hop ${e.hop}**`);
            }
            const badge = e.lowQuality ? " ⚠ low-quality" : "";
            const stale = e.isStale ? " [STALE]" : "";
            const via = e.via ? `  via ${e.via}` : "";
            lines.push(`- ${e.name}  quality:${e.qualityScore.toFixed(2)}${badge}${stale}${via}`);
          }
          sections.push(lines.join("\n"));
        }

        // 3 — Concept invariants (relationships targeting a known concept)
        const entityData = state.entities[entity];
        const conceptNames = Object.keys(state.concepts);
        const linkedConcepts = (entityData?.relationships ?? [])
          .map(r => r.target)
          .filter(t => conceptNames.includes(t));
        if (linkedConcepts.length > 0) {
          sections.push("## Concept invariants");
          for (const c of linkedConcepts) {
            const conceptBody = await this.knowledge.readConcept(c);
            if (conceptBody) sections.push(`### ${c}\n${conceptBody}`);
          }
        }

        return { content: [{ type: "text", text: sections.join("\n\n---\n\n") }] };
      }

      if (name === "smart_audit") {
        if (!(await this.knowledge.exists())) {
          return { content: [{ type: "text", text: "Knowledge base not initialized. Run `cortex init` first." }] };
        }

        const stale = await this.knowledge.getStaleEntities();

        if (stale.length === 0) {
          return { content: [{ type: "text", text: "No stale entities found. Knowledge base is up to date." }] };
        }

        const state = await this.knowledge.getState();
        const graph = buildGraph(state);
        const sections: string[] = [`# Smart audit — ${stale.length} stale entities\n`];

        for (const entry of stale) {
          const entitySections: string[] = [`## ${entry.name} (stale since ${entry.staleSince})`];
          const body = await this.knowledge.readEntity(entry.name);
          if (body) entitySections.push(body);
          const report = buildImpactReport(graph, entry.name, "inbound", 5);
          if (report.totalCount > 0) {
            entitySections.push(`**Blast radius:** ${report.totalCount} dependents — ${report.entries.filter(e => e.hop === 1).map(e => e.name).join(", ")} are direct.`);
          } else {
            entitySections.push("**Blast radius:** No dependents.");
          }
          sections.push(entitySections.join("\n\n"));
        }

        sections.push("---\nFor each entity above: if the staleness is real, re-ingest to update it. If the dependency changed but the entity is still accurate, call `refresh_stale_entities` to clear the flag.");
        return { content: [{ type: "text", text: sections.join("\n\n---\n\n") }] };
      }

      if (name === "build_context_pack") {
        if (!(await this.knowledge.exists())) {
          return { content: [{ type: "text", text: "Knowledge base not initialized. Run `cortex init` first." }] };
        }
        const state = await this.knowledge.getState();
        const budget = typeof (args as any)?.budget === "number" ? (args as any).budget : 8000;
        const scope = (args as any)?.scope as string | undefined;
        const depth = typeof (args as any)?.depth === "number" ? (args as any).depth : undefined;
        const format = (args as any)?.format === "json" ? "json" as const : "markdown" as const;
        const pack = buildContextPack(state, { budget, scope, depth, format });
        const stats = pack.elided.length > 0
          ? `\n\n---\n*Pack stats: ${pack.tokens}/${budget} tokens used. ${pack.elided.length} item(s) elided due to budget: ${pack.elided.join(", ")}*`
          : `\n\n---\n*Pack stats: ${pack.tokens}/${budget} tokens used. All items included.*`;
        return { content: [{ type: "text", text: pack.output + stats }] };
      }

      if (name === "estimate_cost") {
        const estimate = await computeCostEstimate(this.projectRoot);
        if (!estimate.hasDiff) {
          return { content: [{ type: "text", text: "No pending changes since last sync. Estimated cost: $0.00." }] };
        }
        const budget = typeof (args as any)?.budget === "number" ? (args as any).budget as number : null;
        const lines: string[] = [
          `Estimated Input Tokens:  ~${estimate.inputTokens.toLocaleString()}`,
          `Estimated Output Tokens: ~${estimate.outputTokens.toLocaleString()}`,
          `Total Tokens:            ~${estimate.totalTokens.toLocaleString()}`,
          ``,
          `Cost per provider:`,
          ...Object.entries(estimate.costs).map(([model, cost]) => `  ${model.padEnd(20)}: $${cost.toFixed(4)}`),
        ];
        if (estimate.savingsTokens > 0) {
          lines.push(
            ``,
            `📉 Cortex Token Savings:`,
            `  Reduced input context by ${estimate.savingsTokens.toLocaleString()} tokens (${estimate.savingsPercentage.toFixed(1)}% savings vs Raw baseline of ${estimate.rawInputTokens.toLocaleString()} tokens)`
          );
        }
        if (budget !== null) {
          lines.push(estimate.maxCost > budget
            ? `\nBUDGET EXCEEDED: $${estimate.maxCost.toFixed(4)} > $${budget.toFixed(4)}`
            : `\nWithin budget: $${estimate.maxCost.toFixed(4)} <= $${budget.toFixed(4)}`
          );
        }
        return { content: [{ type: "text", text: lines.join("\n") }] };
      }

      throw new Error(`Unknown tool: ${name}`);
    };

    const response = await executeHandler();
    if ((brevity === "lite" || brevity === "ultra") && response && Array.isArray(response.content)) {
      const { estimateTokens } = await import("../knowledge/packer.js");
      for (const item of response.content) {
        if (item.type === "text" && item.text) {
          const originalText = item.text;
          const minified = minifyProse(originalText);
          
          const originalTokens = estimateTokens(originalText);
          const minifiedTokens = estimateTokens(minified);
          const saved = Math.max(0, originalTokens - minifiedTokens);
          
          // Retrieve cumulative token savings from knowledge state!
          let cumulativeSavingsStr = "";
          let savedTokens = 0;
          let tokenReduction = "0.0";
          try {
            const state = await this.knowledge.getState();
            const stats = state.brevityStats || {
              originalTokens: 0,
              compressedTokens: 0,
            };
            savedTokens = Math.max(0, stats.originalTokens - stats.compressedTokens);
            tokenReduction = stats.originalTokens > 0 
              ? ((savedTokens / stats.originalTokens) * 100).toFixed(1) 
              : "0.0";
          } catch {
            // ignore
          }

          const percent = originalTokens > 0 ? ((saved / originalTokens) * 100).toFixed(1) : "0.0";
          item.text = minified + `\n\n---\n📉 **Cortex Brevity Stats:**\n- **This Call:** Saved **${saved} tokens** (${percent}% reduction)\n- **Cumulative Workspace Savings:** Saved **${savedTokens.toLocaleString()} tokens** (${tokenReduction}% reduction)`;

          this.knowledge.recordBrevitySavings(originalText, minified).catch((err: any) => {
            console.error(`[Cortex] Failed to record brevity savings: ${err.message}`);
          });

          // Ledger logging
          if (saved > 0) {
            import("../knowledge/ledger.js").then(({ appendTransaction, calculateSavedUsd }) => {
              const provider = process.env.CORTEX_PROVIDER || "openai";
              const model = process.env.CORTEX_MODEL || "gpt-4o";
              const savedUsd = calculateSavedUsd(saved, provider, this.projectRoot);
              return appendTransaction(this.projectRoot, {
                category: "brevity_transformation",
                provider,
                model,
                originalTokens,
                denseTokens: minifiedTokens,
                savedTokens: saved,
                savedUsd,
                details: `Compressed tool '${name}' response via minifyProse`,
              });
            }).catch((err: any) => {
              console.error(`[Cortex] Failed to record brevity ledger transaction: ${err.message}`);
            });
          }
        }
      }
    }
    return response;
  });
}

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    // After the MCP initialize handshake completes, ask the client for its
    // workspace roots. Antigravity (and other IDE clients that advertise the
    // `roots` capability) responds with the active workspace folder as a
    // file:// URI. This is the only deterministic way for the server to learn
    // the workspace when the IDE launches us from a non-workspace directory
    // (Antigravity launches from its own install dir).
    //
    // Skip discovery if --project-root was passed explicitly on the CLI — the
    // user's choice wins.
    if (!this.projectRootExplicit) {
      await this.refreshProjectRootFromClient();

      // Re-query on workspace change so an IDE workspace-switch surfaces here.
      this.server.setNotificationHandler(
        RootsListChangedNotificationSchema,
        async () => {
          await this.refreshProjectRootFromClient();
        },
      );
    }
  }
}

// Standalone runner (when launched directly by an IDE via MCP config)
const __selfUrl = process.argv[1]
  ? new URL(`file:///${path.resolve(process.argv[1]).replace(/\\/g, "/")}`).href
  : "";
if (__selfUrl && import.meta.url === __selfUrl) {
  // Parse simple command line args: node server.js --root /path/to/project
  let projectRoot = process.cwd();
  const rootArgIndex = process.argv.indexOf("--root");
  if (rootArgIndex !== -1 && process.argv[rootArgIndex + 1]) {
    projectRoot = path.resolve(process.argv[rootArgIndex + 1]);
  }

  loadCortexEnv(projectRoot);

  console.error(`[Cortex] Starting MCP server with root: ${projectRoot}`);

  const server = new CortexMCPServer(projectRoot);
  server.start().catch((err) => {
    console.error("Failed to start MCP server:", err);
    process.exit(1);
  });
}
