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
import { LIBRARIAN_SYSTEM_PROMPT, EXTRACTION_PROMPT_TEMPLATE } from "../llm/prompts.js";
import { getPendingDiff } from "../core/diff.js";
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
        }
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
                text: "Read the project knowledge index using read_knowledge_index.",
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
          description: "Reads the current synthesized knowledge index of the project.",
          inputSchema: { type: "object", properties: {} },
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
                systemPrompt: LIBRARIAN_SYSTEM_PROMPT,
                userPrompt: prompt,
                outputSchema: {
                  summary: "string — 1-2 sentence high-level summary",
                  entities: "array of { name, action: create|update|delete, description, links: string[] }",
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

      throw new Error(`Unknown tool: ${name}`);
    });
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}

// Standalone runner (when launched directly by an IDE via MCP config)
const __selfUrl = new URL(`file:///${path.resolve(process.argv[1]).replace(/\\/g, "/")}`).href;
if (import.meta.url === __selfUrl) {
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
