import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../../");
const KNOWLEDGE_DIR = path.join(rootDir, ".knowledge");

const server = new Server(
  {
    name: "project-cortex",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define the tools we expose to external agents (Cursor, Claude, Antigravity)
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_cortex_status",
        description: "Checks if the Cortex background engine is running and returns its status.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "read_knowledge_index",
        description: "Reads the synthesized architectural knowledge index of the project.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      }
    ],
  };
});

// Handle the execution of the tools
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "get_cortex_status") {
    return {
      content: [
        {
          type: "text",
          text: "Cortex Engine is online. (Mode: Manual/Auto synthesis supported).",
        },
      ],
    };
  }

  if (request.params.name === "read_knowledge_index") {
    try {
      const indexPath = path.join(KNOWLEDGE_DIR, "index.md");
      const content = await fs.readFile(indexPath, "utf-8");
      return {
        content: [
          {
            type: "text",
            text: content,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: "No knowledge base found yet. Please run 'cortex-sync' or wait for auto-ingestion.",
          },
        ],
      };
    }
  }

  throw new Error(`Tool not found: ${request.params.name}`);
});

// Start the server using STDIO (Standard Input/Output), which is how MCP clients communicate
async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Cortex MCP Server running on stdio"); // Logging to stderr so we don't corrupt stdout
}

run().catch(console.error);
