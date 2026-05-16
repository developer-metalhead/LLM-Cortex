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
      { capabilities: { tools: {}, prompts: {} } }
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
      const result = await this.server.request(
        { method: "roots/list", params: {} },
        ListRootsResultSchema,
      );
      const firstFileRoot = result.roots?.find((r) => r.uri.startsWith("file://"));
      if (firstFileRoot) {
        this.setProjectRoot(fileURLToPath(firstFileRoot.uri));
      }
    } catch {
      // Client doesn't support roots, or no roots available — keep CWD default.
    }
  }

  private async getSourceStats(): Promise<{ tokens: number; fileCount: number }> {
    if (this._sourceStats) return this._sourceStats;
    const fileList = await listSourceFiles(this.projectRoot);
    let totalBytes = 0;
    await Promise.all(
      fileList.files.map(async (relPath) => {
        try {
          const stat = await fs.stat(path.join(this.projectRoot, relPath));
          totalBytes += stat.size;
        } catch { /* skip */ }
      })
    );
    this._sourceStats = {
      tokens: Math.round(totalBytes / 4),
      fileCount: fileList.totalFound,
    };
    return this._sourceStats;
  }

  private async withSavings(text: string): Promise<Array<{ type: "text"; text: string }>> {
    try {
      const { tokens: sourceTokens, fileCount } = await this.getSourceStats();
      const responseTokens = Math.round(text.length / 4);
      const saved = Math.max(0, sourceTokens - responseTokens);
      if (saved < 500) return [{ type: "text", text }];
      const savedFmt = saved >= 1000 ? `~${(saved / 1000).toFixed(1)}k` : `~${saved}`;
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
        {
          name: "before_change",
          description: "Pre-flight check before implementing, modifying, or fixing code. Forces a knowledge-first workflow so you don't break dependents or duplicate existing patterns.",
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
      if (request.params.name === "before_change") {
        return {
          description: "Knowledge-first pre-flight check before implementing, modifying, or fixing code.",
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
              name: { type: "string", description: "Entity name exactly as it appears in the knowledge index." },
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

      if (name === "read_knowledge_index") {
        const content = await this.knowledge.getKnowledgeSummary();
        return { content: await this.withSavings(content) };
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
        return { content: await this.withSavings(body) };
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
        return { content: await this.withSavings(body) };
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
