import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { minifyProse, getBrevityLevel, clearBrevityCache } from "../src/knowledge/brevity.js";
import { KnowledgeManager } from "../src/knowledge/writer.js";
import { runCompress } from "../src/cli/compress.js";

const execAsync = promisify(exec);

describe("Phase 13.2 — Cortex Brevity Engine & Telegraphic Memory Compression Suite", () => {
  describe("Telegraphic Memory Compiler (minifyProse)", () => {
    it("safely strips conversational prose while preserving code blocks and links", () => {
      const original = [
        "In this section, please note that we are going to showcase the authentication strategy.",
        "As we saw earlier, in order to authenticate the user, you should use the following function:",
        "```typescript",
        "export function authenticate(user: User) {",
        "  // Check the password",
        "  return true;",
        "}",
        "```",
        "For more details, please feel free to take a look at the [[AuthMiddleware]] concept.",
        "This is designed to be very simple and straightforward."
      ].join("\n");

      const compressed = minifyProse(original);

      // Verify conversational filler is removed
      assert.ok(!compressed.includes("please note that"));
      assert.ok(!compressed.includes("in order to"));
      assert.ok(!compressed.includes("please feel free to"));

      // Verify code block is 100% intact
      assert.ok(compressed.includes("export function authenticate(user: User) {"));
      assert.ok(compressed.includes("// Check the password"));

      // Verify wiki link is 100% intact
      assert.ok(compressed.includes("[[AuthMiddleware]]"));
    });
  });

  describe("Brevity Configuration Priorities", () => {
    let tmpDir: string;

    beforeEach(async () => {
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "cortex-brevity-priority-"));
      // Clear process env overrides to test priority logic cleanly
      delete process.env.CORTEX_BREVITY_LEVEL;
      clearBrevityCache();
    });

    afterEach(async () => {
      try {
        await fs.rm(tmpDir, { recursive: true, force: true });
      } catch {}
      delete process.env.CORTEX_BREVITY_LEVEL;
    });

    it("returns 'off' by default when no env or json configuration is present", () => {
      assert.strictEqual(getBrevityLevel(tmpDir), "off");
    });

    it("prioritizes cortex.json over default", async () => {
      const configPath = path.join(tmpDir, "cortex.json");
      await fs.writeFile(configPath, JSON.stringify({ brevity: "lite" }), "utf-8");
      assert.strictEqual(getBrevityLevel(tmpDir), "lite");
    });

    it("prioritizes CORTEX_BREVITY_LEVEL env var over cortex.json", async () => {
      const configPath = path.join(tmpDir, "cortex.json");
      await fs.writeFile(configPath, JSON.stringify({ brevity: "lite" }), "utf-8");
      process.env.CORTEX_BREVITY_LEVEL = "ultra";
      assert.strictEqual(getBrevityLevel(tmpDir), "ultra");
    });
  });

  describe("Brevity Stats & savings tracking", () => {
    let tmpDir: string;
    let km: KnowledgeManager;

    beforeEach(async () => {
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "cortex-brevity-stats-"));
      km = new KnowledgeManager(tmpDir);
      await km.init();
    });

    afterEach(async () => {
      try {
        await fs.rm(tmpDir, { recursive: true, force: true });
      } catch {}
    });

    it("records brevity savings correctly inside state.json", async () => {
      const originalText = "Please note that we have completed phase 13.2 completely. In order to test, feel free to run tests.";
      const compressedText = "Completed phase 13.2 completely. Test, run tests.";

      await km.recordBrevitySavings(originalText, compressedText, true);

      const state = await km.getState();
      assert.ok(state.brevityStats, "Brevity statistics must be populated");
      assert.strictEqual(state.brevityStats.compressedFilesCount, 1);
      assert.ok(state.brevityStats.originalBytes > state.brevityStats.compressedBytes, "Original bytes must be greater");
      assert.ok(state.brevityStats.usdSaved > 0, "USD saved must be greater than zero");
    });
  });

  describe("CLI Command Integration", () => {
    let tmpDir: string;
    let km: KnowledgeManager;

    beforeEach(async () => {
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "cortex-cli-compress-"));
      km = new KnowledgeManager(tmpDir);
      await km.init();
    });

    afterEach(async () => {
      try {
        await fs.rm(tmpDir, { recursive: true, force: true });
      } catch {}
    });

    it("runs runCompress and outputs minified content inplace", async () => {
      const filePath = path.join(tmpDir, "test.md");
      const originalText = "Please note that this is some markdown.\nIn order to test, look at [[Middleware]].";
      await fs.writeFile(filePath, originalText, "utf-8");

      await runCompress(tmpDir, "test.md", { inplace: true });

      const finalContent = await fs.readFile(filePath, "utf-8");
      assert.ok(!finalContent.includes("please note that"));
      assert.ok(!finalContent.includes("in order to"));
      assert.ok(finalContent.includes("[[Middleware]]"));

      const state = await km.getState();
      assert.strictEqual(state.brevityStats?.compressedFilesCount, 1);
    });

    it("recursively compresses all .md files in a directory when passed a folder path", async () => {
      const nestedDir = path.join(tmpDir, "nested");
      await fs.mkdir(nestedDir, { recursive: true });

      const file1 = path.join(tmpDir, "doc1.md");
      const file2 = path.join(nestedDir, "doc2.md");
      const fileNonMd = path.join(tmpDir, "ignore.txt");

      await fs.writeFile(file1, "Please note that file 1 contains details.", "utf-8");
      await fs.writeFile(file2, "In order to use file 2, check [[Concepts]].", "utf-8");
      await fs.writeFile(fileNonMd, "Please note that this is non-md text.", "utf-8");

      await runCompress(tmpDir, ".", { inplace: true });

      const compressed1 = await fs.readFile(file1, "utf-8");
      const compressed2 = await fs.readFile(file2, "utf-8");
      const rawNonMd = await fs.readFile(fileNonMd, "utf-8");

      // doc1.md should be compressed
      assert.ok(!compressed1.includes("Please note that"));
      assert.ok(compressed1.includes("file 1 contains details."));

      // doc2.md should be compressed
      assert.ok(!compressed2.includes("In order to"));
      assert.ok(compressed2.includes("To use file 2, check [[Concepts]]."));

      // ignore.txt should remain untouched (not md)
      assert.ok(rawNonMd.includes("Please note that"));

      const state = await km.getState();
      // Should show both files compressed (2 files total)
      assert.strictEqual(state.brevityStats?.compressedFilesCount, 2);
    });
  });
});
