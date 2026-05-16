import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import path from "path";
import { KnowledgeManager } from "../knowledge/writer.js";
import { SynthesisSchema } from "../llm/schema.js";
import {
  LIBRARIAN_SYSTEM_PROMPT,
  EXTRACTION_PROMPT_TEMPLATE,
  BOOTSTRAP_PROMPT_TEMPLATE,
} from "../llm/prompts.js";
import { getPendingDiff } from "../core/diff.js";
import { listSourceFiles, renderFileList } from "../core/scan.js";
import { loadCortexEnv } from "../core/env.js";

export class CortexMCPServer {
  private server: Server;
  private knowledgeDir: string;
  private projectRoot: string;
  private knowledge: KnowledgeManager;
  // Optional: e.g. embedded in `cortex watch` to clear manual diff queue after IDE-driven save
  private onAfterKnowledgeSave?: () => Promise<void>;

  constructor(projectRoot: string, onAfterKnowledgeSave?: () => Promise<void>) {
    this.projectRoot = projectRoot;
    this.knowledgeDir = path.join(projectRoot, ".knowledge");
    this.knowledge = new KnowledgeManager(projectRoot);
    this.onAfterKnowledgeSave = onAfterKnowledgeSave;

    this.server = new Server(
      { name: "project-cortex", version: "1.0.0" },
      { capabilities: { tools: {}, prompts: {} } }
    );

    this.setupHandlers();
    this.setupPromptHandlers();
  }

  private setupPromptHandlers() {
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => ({
      prompts: [
        {
          name: "ingest",
          description: "Synthesize all recent code changes into the knowledge base.",
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
          description: "Navigate the knowledge base (index → drill into specific entities/concepts).",
        },
      ],
    }));

    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      if (request.params.name === "ingest") {
        return {
          description: "Synthesize all recent code changes into the knowledge base.",
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
      throw new Error(`Prompt not found: ${request.params.name}`);
    });
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "get_cortex_status",
          description: "Check if Project Cortex is initialized in this project.",
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
                description: "The structured synthesis result matching the Cortex schema.",
                required: ["summary", "entities", "concepts", "warnings"],
                properties: {
                  summary: { type: "string" },
                  entities: {
                    type: "array",
                    items: {
                      type: "object",
                      required: ["name", "action", "description", "links"],
                      properties: {
                        name: { type: "string" },
                        action: { type: "string", enum: ["create", "update", "delete"] },
                        description: { type: "string" },
                        links: { type: "array", items: { type: "string" } },
                        sourceFile: {
                          type: "string",
                          description: "Repo-relative path to the file this entity describes (e.g. src/auth/middleware.ts). Optional but strongly preferred.",
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
          name: "read_knowledge_index",
          description:
            "Reads the current synthesized knowledge index — names, descriptions, links, and source citations for every entity and concept. Call this FIRST before diving into source code; it is the project's architectural memory.",
          inputSchema: { type: "object", properties: {} },
        },
        {
          name: "read_entity",
          description:
            "Reads the full synthesized page for a single entity (by name, as shown in the index — e.g. 'AuthMiddleware'). Use this to drill into a [[WikiLink]] you saw in the index instead of re-deriving from source.",
          inputSchema: {
            type: "object",
            required: ["name"],
            properties: {
              name: { type: "string", description: "Entity name exactly as it appears in the knowledge index." },
            },
          },
        },
        {
          name: "read_concept",
          description:
            "Reads the full synthesized page for a single concept (an abstract pattern, e.g. 'Authentication Strategy'). Use this to follow a [[WikiLink]] from the index.",
          inputSchema: {
            type: "object",
            required: ["name"],
            properties: {
              name: { type: "string", description: "Concept name exactly as it appears in the knowledge index." },
            },
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      if (name === "get_cortex_status") {
        const knowledgeExists = await this.knowledge.exists();
        const lastSync = await this.knowledge.getLastSyncCommit();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                status: knowledgeExists ? "initialized" : "not initialized",
                lastSyncCommit: lastSync || "never synced",
                projectRoot: this.projectRoot,
              }, null, 2),
            },
          ],
        };
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
                text: JSON.stringify({
                  mode: "bootstrap",
                  systemPrompt: LIBRARIAN_SYSTEM_PROMPT,
                  userPrompt: prompt,
                  outputSchema: {
                    summary: "string — 1-2 sentence description of what this application does",
                    entities: "array of { name, action: 'create', description, links: string[], sourceFile: string (repo-relative path) }",
                    concepts: "array of { name, description }",
                    warnings: "array of strings (usually empty on bootstrap)",
                  },
                  instructions:
                    "Bootstrap mode — the knowledge base is empty. Use your filesystem tools (Read, Glob, Grep) to inspect the files listed in userPrompt and synthesize the application's full architecture. The git diff has been intentionally excluded because it usually reflects the installation of Project Cortex itself, not the user's code. Emit every documented file as action: 'create'. Then call save_synthesis with the result.",
                  fileListMeta: {
                    totalFound: fileList.totalFound,
                    truncated: fileList.truncated,
                    source: fileList.source,
                  },
                }, null, 2),
              },
            ],
          };
        }

        // INCREMENTAL PATH: knowledge exists — diff against the last sync.
        const lastSync = await this.knowledge.getLastSyncCommit();
        const diff = await getPendingDiff(this.projectRoot, lastSync);
        const knowledgeContext = await this.knowledge.getKnowledgeSummary();

        if (!diff.trim()) {
          return {
            content: [{ type: "text", text: "No pending changes since last sync." }],
          };
        }

        const prompt = EXTRACTION_PROMPT_TEMPLATE(diff, knowledgeContext);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                mode: "incremental",
                systemPrompt: LIBRARIAN_SYSTEM_PROMPT,
                userPrompt: prompt,
                outputSchema: {
                  summary: "string — 1-2 sentence high-level summary",
                  entities: "array of { name, action: create|update|delete, description, links: string[], sourceFile?: string (repo-relative path, strongly preferred) }",
                  concepts: "array of { name, description }",
                  warnings: "array of strings",
                },
                instructions:
                  "Follow the systemPrompt. Analyze the userPrompt. Return a synthesis object matching outputSchema. Then call save_synthesis with the result.",
              }, null, 2),
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

        await this.knowledge.init();
        await this.knowledge.saveSynthesis(parsed.data);
        await this.knowledge.updateLastSyncCommit(this.projectRoot);

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

      if (name === "read_knowledge_index") {
        const content = await this.knowledge.getKnowledgeSummary();
        return { content: [{ type: "text", text: content }] };
      }

      if (name === "read_entity") {
        const entityName = (args as any)?.name;
        if (typeof entityName !== "string" || !entityName.trim()) {
          return {
            content: [{ type: "text", text: "read_entity requires a non-empty 'name' argument." }],
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
        return { content: [{ type: "text", text: body }] };
      }

      if (name === "read_concept") {
        const conceptName = (args as any)?.name;
        if (typeof conceptName !== "string" || !conceptName.trim()) {
          return {
            content: [{ type: "text", text: "read_concept requires a non-empty 'name' argument." }],
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
        return { content: [{ type: "text", text: body }] };
      }

      throw new Error(`Unknown tool: ${name}`);
    });
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
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
