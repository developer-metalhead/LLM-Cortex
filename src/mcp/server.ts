import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

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
        description: "Reads the synthesized architectural knowledge index of the project. (Currently Mocked for Testing)",
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
          text: "Cortex Engine is online. (Passive Mode: Waiting for external agent to process files).",
        },
      ],
    };
  }

  if (request.params.name === "read_knowledge_index") {
    // In Phase 3, this will read from .knowledge/index.md
    return {
      content: [
        {
          type: "text",
          text: "# Cortex Knowledge Base (MOCK)\n\nThis is a placeholder. In the future, this will contain the AI-synthesized architecture of the project.",
        },
      ],
    };
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
