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
      const { tokens: sourceTokens, fileCount } = await this.getSourceStats();
      const responseTokens = Math.round(text.length / 4);
      const saved = Math.max(0, sourceTokens - responseTokens);
      if (saved < 500) return [{ type: "text", text }];
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
                  "STEP 1 — List stale entities.",
                  "Call project-cortex:audit. Each entity returned is stale because a dependency it tracks via depends_on or called_by was updated after this entity's last refine. That is the blast radius of recent changes.",
                  "",
                  "STEP 2 — Verify each stale entity.",
                  "For every name in the audit result, call read_entity(name) to load its full layered page (Role / Interface / Behavior / Wiring). Then read the current source for that entity AND for the dependency that triggered the staleness. Ask:",
                  "  (a) Does the entity's ## Behavior or ## Interface section still match the code?",
                  "  (b) Has the upstream change broken any documented invariant, contract, or constraint?",
                  "  (c) Are any [[WikiLinks]] in ## Wiring now wrong (target renamed, removed, or signature changed)?",
                  "",
                  "STEP 3 — Classify each entity into one of two buckets:",
                  "  • VERIFIED-CLEAN — the dependency moved but this entity's documented role, contracts, and wiring are still accurate. Nothing in its description needs to change. The stale flag is a false positive from blast-radius fan-out.",
                  "  • NEEDS-UPDATE — the entity's description, relationships, or constraints are now incorrect because of the upstream change. The knowledge needs to be re-synthesized.",
                  "",
                  "STEP 4 — Heal the knowledge base.",
                  "For the VERIFIED-CLEAN bucket: call refresh_stale_entities with all their names in a single call. This clears the staleSince flag without touching their descriptions.",
                  "For the NEEDS-UPDATE bucket: call save_synthesis with action: 'update' for each, emitting the corrected layered description, relationships, and (if relevant) constraints / failedApproaches. Re-synthesis automatically clears the stale flag for the entities included.",
                  "",
                  "STEP 5 — Report.",
                  "Summarize for the user: which entities you refreshed, which you re-synthesized (and what specifically you changed in each), and any drift that surfaced. End by stating the current stale count is now zero — or, if any new staleness was propagated by your re-syntheses, note the next-iteration plan.",
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
                  "Call the project-cortex:export tool.",
                  "Report the output path of the generated ARCH_SPEC.md.",
                  "Briefly explain that the file contains the full dependency graph, architectural constraints, historical failed approaches, and conceptual patterns from the synthesized knowledge base — suitable for review, handoff, or onboarding.",
                ].join(" "),
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
                  "1. Call read_knowledge_index. Treat its output as ground truth about what already exists.",
                  "2. Identify the entity (or absence) that matches the task:",
                  "   - Implementing something new → search the index for similar entities. If one exists, prefer extending it over creating a parallel implementation.",
                  "   - Modifying or fixing something → find the entity by name or sourceFile.",
                  "3. For the target entity, call read_entity and read its Wiring section. Every [[WikiLink]] in Wiring is a downstream consumer that may break if you change the entity's behavior or shape.",
                  "4. For any concept the entity Implements, call read_concept. The concept describes the invariant the entity is supposed to uphold — violate it and you introduce drift.",
                  "5. Only NOW open source files. By this point you know: what exists, what depends on it, and what rules apply.",
                  "",
                  "Output before writing code: a one-paragraph plan stating (a) which entities you will touch, (b) which dependents could be affected, (c) which invariants apply. Then proceed.",
                  "",
                  "If the knowledge base is empty or the relevant entity is missing, say so explicitly and recommend running /ingest first.",
                ].join("\n"),
              },
            },
          ],
        };
      }
      throw new Error(`Prompt not found: ${request.params.name}`);
    });
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "get_cortex_status",
          description:
            "Check if Project Cortex is initialized in this project.",
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
            "Reads the project's architectural memory — entities, concepts, source paths, and their relationships. **Call this BEFORE writing new code** (to find reusable patterns and avoid duplicate implementations), **before modifying existing code** (to see what depends on it — breaking a dependent you didn't know about is the #1 way to introduce regressions), **before fixing a bug** (to understand the invariants you might violate), and **before explaining code** (the synthesized description is denser than re-reading source). Use Grep/Read on raw source only AFTER you've established what already exists here. Skipping this step on a non-trivial codebase task means re-deriving knowledge that's already been synthesized — wasted tokens and missed context.",
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
            "Generate a comprehensive ARCH_SPEC.md from the project's synthesized knowledge.",
          inputSchema: { type: "object", properties: {} },
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
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
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
        const outputPath = await this.knowledge.exportSpec();
        return {
          content: [
            {
              type: "text",
              text: `✅ Architectural Specification exported to: ${outputPath}`,
            },
          ],
        };
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

      if (name === "get_pending_changes") {
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
                    systemPrompt: LIBRARIAN_SYSTEM_PROMPT,
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
                  systemPrompt: LIBRARIAN_SYSTEM_PROMPT,
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

      if (name === "read_knowledge_index") {
        const content = await this.knowledge.getKnowledgeSummary();
        return { content: await this.withSavings(content) };
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
        return { content: await this.withSavings(body) };
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
        return { content: await this.withSavings(body) };
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
              text: `Project root manually updated to: ${newPath}. Knowledge Manager re-initialized.`,
            },
          ],
        };
      }

      throw new Error(`Unknown tool: ${name}`);
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
