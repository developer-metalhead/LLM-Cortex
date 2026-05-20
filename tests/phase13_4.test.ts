import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "fs/promises";
import os from "os";
import path from "path";
import {
  loadSafeguardConfig,
  readSessionUsage,
  writeSessionUsage,
  checkBudgetBeforeSync,
  recordSyncEvent,
} from "../src/knowledge/safeguards.js";
import { synthesizeChanges } from "../src/llm/client.js";
import { CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";

describe("Phase 13.4 — API Budget Gating & Runaway Safeguards Suite", () => {
  let tmpDir: string;
  let oldEnv: NodeJS.ProcessEnv;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "cortex-safeguards-"));
    oldEnv = { ...process.env };
    // Clear out budget-related environment variables for isolation
    delete process.env.CORTEX_MAX_SESSION_COST_USD;
    delete process.env.CORTEX_MAX_SYNC_CALLS_PER_HOUR;
  });

  afterEach(async () => {
    process.env = oldEnv;
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch {}
  });

  describe("Configuration Resolution", () => {
    it("loads configuration from environment variables with top priority", () => {
      process.env.CORTEX_MAX_SESSION_COST_USD = "0.05";
      process.env.CORTEX_MAX_SYNC_CALLS_PER_HOUR = "3";

      const config = loadSafeguardConfig(tmpDir);
      assert.strictEqual(config.maxSessionCostUsd, 0.05);
      assert.strictEqual(config.maxSyncCallsPerHour, 3);
    });

    it("loads configuration from cortex.json with support for camelCase and snake_case", async () => {
      const cortexJson = {
        safeguards: {
          max_session_cost_usd: 1.50,
          max_sync_calls_per_hour: 25,
        },
      };
      await fs.writeFile(path.join(tmpDir, "cortex.json"), JSON.stringify(cortexJson), "utf-8");

      const config = loadSafeguardConfig(tmpDir);
      assert.strictEqual(config.maxSessionCostUsd, 1.50);
      assert.strictEqual(config.maxSyncCallsPerHour, 25);
    });

    it("prioritizes env variables over cortex.json parameters", async () => {
      const cortexJson = {
        safeguards: {
          maxSessionCostUsd: 1.50,
          maxSyncCallsPerHour: 25,
        },
      };
      await fs.writeFile(path.join(tmpDir, "cortex.json"), JSON.stringify(cortexJson), "utf-8");

      process.env.CORTEX_MAX_SESSION_COST_USD = "0.02";
      process.env.CORTEX_MAX_SYNC_CALLS_PER_HOUR = "2";

      const config = loadSafeguardConfig(tmpDir);
      assert.strictEqual(config.maxSessionCostUsd, 0.02);
      assert.strictEqual(config.maxSyncCallsPerHour, 2);
    });
  });

  describe("Volatile Session Usage Tracking", () => {
    it("dynamically reads, writes, and auto-prunes events older than 24 hours", async () => {
      const activeTime = new Date().toISOString();
      const expiredTime = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(); // 25 hours ago

      const initialUsage = {
        events: [
          {
            timestamp: expiredTime,
            cost_usd: 0.005,
            costUsd: 0.005,
            invocation_count: 1,
            invocationCount: 1,
          },
          {
            timestamp: activeTime,
            cost_usd: 0.002,
            costUsd: 0.002,
            invocation_count: 2,
            invocationCount: 2,
          },
        ],
      };

      await writeSessionUsage(tmpDir, initialUsage);

      // Read back and ensure the expired event is pruned automatically
      const usage = await readSessionUsage(tmpDir);
      assert.strictEqual(usage.events.length, 1);
      assert.strictEqual(usage.events[0].timestamp, activeTime);
      assert.strictEqual(usage.events[0].costUsd, 0.002);
    });

    it("correctly appends new sync events and increments invocation counters", async () => {
      await recordSyncEvent(tmpDir, 0.001);
      await recordSyncEvent(tmpDir, 0.003);

      const usage = await readSessionUsage(tmpDir);
      assert.strictEqual(usage.events.length, 2);
      assert.strictEqual(usage.events[0].costUsd, 0.001);
      assert.strictEqual(usage.events[0].invocationCount, 1);
      assert.strictEqual(usage.events[1].costUsd, 0.003);
      assert.strictEqual(usage.events[1].invocationCount, 2);

      // Verify that snake_case and camelCase parameters are both written
      assert.strictEqual(usage.events[0].cost_usd, 0.001);
      assert.strictEqual(usage.events[0].invocation_count, 1);
    });
  });

  describe("Safeguard Enforcement Gates", () => {
    it("aborts execution with an Error when projected cumulative cost exceeds session budget", async () => {
      // Set session limit of $0.05
      const cortexJson = {
        safeguards: {
          maxSessionCostUsd: 0.05,
        },
      };
      await fs.writeFile(path.join(tmpDir, "cortex.json"), JSON.stringify(cortexJson), "utf-8");

      // Record a prior cost of $0.04
      await recordSyncEvent(tmpDir, 0.04);

      // Check budget before making a sync of $0.015 (this should fail as it hits $0.055)
      await assert.rejects(
        async () => {
          await checkBudgetBeforeSync(tmpDir, 0.015);
        },
        (err: Error) => {
          assert.match(err.message, /Budget Exceeded: Cumulative session cost of \$0\.0550 exceeds the hard limit of \$0\.0500\./);
          return true;
        }
      );

      // Verify that smaller cost of $0.005 is still allowed
      await assert.doesNotReject(async () => {
        await checkBudgetBeforeSync(tmpDir, 0.005);
      });
    });

    it("aborts execution with an Error when sync frequency exceeds rolling hourly cap", async () => {
      // Set frequency limit of 2 syncs per hour
      const cortexJson = {
        safeguards: {
          maxSyncCallsPerHour: 2,
        },
      };
      await fs.writeFile(path.join(tmpDir, "cortex.json"), JSON.stringify(cortexJson), "utf-8");

      // Record 2 sync events in the last 10 minutes
      await recordSyncEvent(tmpDir, 0.001);
      await recordSyncEvent(tmpDir, 0.002);

      // Pre-flight check should reject the 3rd sync attempt
      await assert.rejects(
        async () => {
          await checkBudgetBeforeSync(tmpDir, 0.001);
        },
        (err: Error) => {
          assert.match(err.message, /Rate Limit Exceeded: Sync calls capped at 2 per hour to prevent runaway sessions\./);
          return true;
        }
      );
    });
  });

  describe("LLM Client Ingestion Integration", () => {
    it("blocks synthesis and registers usage correctly inside synthesizeChanges", async () => {
      // Create a mock .env file inside project root to emulate a real setup
      process.env.CORTEX_MOCK_AI = "true";
      process.env.CORTEX_MAX_SESSION_COST_USD = "1.00";
      
      const originalCwd = process.cwd;
      process.cwd = () => tmpDir; // Redirect process.cwd to our temporary project directory
      
      try {
        // Create a fake .knowledge folder so findProjectRoot returns tmpDir
        await fs.mkdir(path.join(tmpDir, ".knowledge"), { recursive: true });

        // First mock sync succeeds and logs event
        const res = await synthesizeChanges("diff text", "context text", "guardrails");
        assert.ok(res);
        
        const usage = await readSessionUsage(tmpDir);
        assert.strictEqual(usage.events.length, 1);

        // Perform second sync - this should be blocked because the cost accumulated pushes it above limit
        // Let's set a super tiny budget that will definitely be exceeded
        process.env.CORTEX_MAX_SESSION_COST_USD = "0.000001";
        
        await assert.rejects(
          async () => {
            await synthesizeChanges("diff text", "context text", "guardrails");
          },
          (err: Error) => {
            assert.match(err.message, /Budget Exceeded:/);
            return true;
          }
        );
      } finally {
        process.cwd = originalCwd;
      }
    });
  });

  describe("Safeguards Power Suite (MCP & CLI Clearing)", () => {
    it("clears safeguards successfully using config utility", async () => {
      const { runConfig } = await import("../src/cli/config.js");
      
      // Initialize a fake .env
      const envPath = path.join(tmpDir, ".env");
      await fs.writeFile(envPath, "CORTEX_MAX_SESSION_COST_USD=0.05\nCORTEX_MAX_SYNC_CALLS_PER_HOUR=3\n", "utf-8");

      // Initialize a fake cortex.json
      const cortexJsonPath = path.join(tmpDir, "cortex.json");
      const initialJson = {
        safeguards: {
          maxSessionCostUsd: 0.05,
          maxSyncCallsPerHour: 3,
        }
      };
      await fs.writeFile(cortexJsonPath, JSON.stringify(initialJson), "utf-8");

      // Run config to clear maxCost
      await runConfig(tmpDir, { maxCost: "none" });

      // Verify maxCost is deleted from env and JSON
      const envData1 = await fs.readFile(envPath, "utf-8");
      assert.ok(!envData1.includes("CORTEX_MAX_SESSION_COST_USD"));
      const json1 = JSON.parse(await fs.readFile(cortexJsonPath, "utf-8"));
      assert.strictEqual(json1.safeguards?.maxSessionCostUsd, undefined);
      assert.strictEqual(json1.safeguards?.maxSyncCallsPerHour, 3);

      // Run config to clear maxSyncsHour
      await runConfig(tmpDir, { maxSyncsHour: "none" });

      // Verify maxSyncsHour is deleted from env and safeguards object is removed entirely
      const envData2 = await fs.readFile(envPath, "utf-8");
      assert.ok(!envData2.includes("CORTEX_MAX_SYNC_CALLS_PER_HOUR"));
      const json2 = JSON.parse(await fs.readFile(cortexJsonPath, "utf-8"));
      assert.strictEqual(json2.safeguards, undefined);
    });

    it("allows config to run and set limits when no .env is present (IDE-only setup)", async () => {
      const { runConfig } = await import("../src/cli/config.js");
      
      const cortexJsonPath = path.join(tmpDir, "cortex.json");
      await fs.writeFile(cortexJsonPath, "{}", "utf-8");

      // Verify that running config without an existing .env does NOT throw or abort
      await assert.doesNotReject(async () => {
        await runConfig(tmpDir, { maxCost: "0.10", maxSyncsHour: "5" });
      });

      // Confirm limits are saved inside cortex.json
      const json = JSON.parse(await fs.readFile(cortexJsonPath, "utf-8"));
      assert.strictEqual(json.safeguards?.maxSessionCostUsd, 0.10);
      assert.strictEqual(json.safeguards?.maxSyncCallsPerHour, 5);

      // Confirm a .env is generated with the parameters
      const envPath = path.join(tmpDir, ".env");
      const envContent = await fs.readFile(envPath, "utf-8");
      assert.ok(envContent.includes("CORTEX_MAX_SESSION_COST_USD=0.1"));
      assert.ok(envContent.includes("CORTEX_MAX_SYNC_CALLS_PER_HOUR=5"));
    });

    it("handles configuration updates and clears cleanly via the MCP Server tool", async () => {
      const { Server } = await import("@modelcontextprotocol/sdk/server/index.js");
      const { CortexMCPServer } = await import("../src/mcp/server.js");
      
      const registeredHandlers: { schema: any; handler: any }[] = [];
      
      // Spy/Mock setRequestHandler
      const originalSetRequestHandler = Server.prototype.setRequestHandler;
      Server.prototype.setRequestHandler = function(schema: any, handler: any) {
        registeredHandlers.push({ schema, handler });
        return originalSetRequestHandler.call(this, schema, handler);
      };

      try {
        // Setup initial .env and cortex.json
        const envPath = path.join(tmpDir, ".env");
        await fs.writeFile(envPath, "CORTEX_PROVIDER=openai\n", "utf-8");
        await fs.writeFile(path.join(tmpDir, "cortex.json"), "{}", "utf-8");

        const server = new CortexMCPServer(tmpDir, undefined, true);
        
        let callToolHandler: any = null;
        for (const item of registeredHandlers) {
          try {
            const res = await item.handler({
              method: "tools/call",
              params: {
                name: "configure_safeguards",
                arguments: {
                  maxCost: "0.25",
                  maxSyncsHour: "10",
                },
              },
            });
            if (res && (res.content !== undefined || res.isError !== undefined)) {
              callToolHandler = item.handler;
              break;
            }
          } catch (e) {
            // Not the CallToolRequest handler
          }
        }

        assert.ok(callToolHandler, "MCP CallToolRequest handler should be registered");

        // Verify values were set by the discovery run
        const config = loadSafeguardConfig(tmpDir);
        assert.strictEqual(config.maxSessionCostUsd, 0.25);
        assert.strictEqual(config.maxSyncCallsPerHour, 10);

        // Call tool again to clear them
        const result2 = await callToolHandler({
          method: "tools/call",
          params: {
            name: "configure_safeguards",
            arguments: {
              maxCost: "clear",
              maxSyncsHour: "off",
            },
          },
        });

        assert.ok(!result2.isError);

        // Verify values are cleared
        const clearedConfig = loadSafeguardConfig(tmpDir);
        assert.strictEqual(clearedConfig.maxSessionCostUsd, undefined);
        assert.strictEqual(clearedConfig.maxSyncCallsPerHour, undefined);
      } finally {
        // Restore prototype
        Server.prototype.setRequestHandler = originalSetRequestHandler;
      }
    });
  });
});

