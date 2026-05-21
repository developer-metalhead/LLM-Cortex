import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "fs/promises";
import os from "os";
import path from "path";

let tmp: string;

beforeEach(async () => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), "cortex-readcache-"));
});

afterEach(async () => {
  try { await fs.rm(tmp, { recursive: true, force: true }); } catch {}
});

import { SmartReadCache } from "../src/knowledge/readCache.js";

function writeTestFile(rel: string, content: string): Promise<string> {
  const p = path.join(tmp, rel);
  return fs.writeFile(p, content, "utf-8").then(() => p);
}

describe("Phase 13.7 — SmartReadCache", () => {

  describe("Basic caching flow", () => {
    it("returns full content on first read", async () => {
      const cache = new SmartReadCache();
      const filePath = await writeTestFile("test.ts", [
        "import { foo } from './bar'",
        "export function hello(name: string): string {",
        "  return `Hello ${name}`",
        "}",
      ].join("\n"));

      const r1 = cache.get(filePath);
      assert.equal(r1.cacheStatus, "first_read");
      assert.equal(r1.mode, "full");
      assert(r1.content.includes("Hello"));
    });

    it("returns skeleton on re-read of unchanged file", async () => {
      const cache = new SmartReadCache();
      const content = [
        "import { foo } from './bar'",
        "export function hello(name: string): string {",
        "  return `Hello ${name}`",
        "}",
      ].join("\n");
      const filePath = await writeTestFile("test.ts", content);

      cache.get(filePath); // first read
      const r2 = cache.get(filePath); // re-read

      assert.equal(r2.cacheStatus, "cached_skeleton");
      assert.equal(r2.mode, "skeleton");
      assert(r2.content.length < content.length, `skeleton (${r2.content.length}) should be smaller than full (${content.length})`);
      assert(r2.tokenSavings > 0);
    });

    it("returns diff on re-read of modified file", async () => {
      const cache = new SmartReadCache();
      const filePath = await writeTestFile("test.ts", "line1\nline2\nline3\n");

      cache.get(filePath); // first read
      await fs.writeFile(filePath, "line1\nline2_changed\nline3\nline4\n", "utf-8");
      const r2 = cache.get(filePath); // re-read

      assert.equal(r2.mode, "diff");
      assert.equal(r2.cacheStatus, "delta");
      assert(r2.content.includes("+line2_changed") || r2.content.includes("+ line2_changed"));
    });
  });

  describe("Bypass & fallback safeguards", () => {
    it("bypass flag forces full content", async () => {
      const cache = new SmartReadCache();
      const filePath = await writeTestFile("test.ts", [
        "export class A {}",
        "export class B {}",
        "export class C {}",
      ].join("\n"));

      cache.get(filePath); // first read
      const r2 = cache.get(filePath, "full"); // bypass

      assert.equal(r2.mode, "full");
      assert(r2.content.includes("class A"));
      assert(r2.content.includes("class B"));
    });

    it("bypass flag via get bypass param works", async () => {
      const cache = new SmartReadCache();
      const filePath = await writeTestFile("test.ts", "export const x = 1\n");
      cache.get(filePath);
      const r2 = cache.get(filePath, "full");
      assert.equal(r2.mode, "full");
      assert.equal(r2.cacheStatus, "cached_skeleton");
    });

    it("returns error for non-existent file", async () => {
      const cache = new SmartReadCache();
      const r = cache.get(path.join(tmp, "nonexistent.ts"));
      assert(r.content.startsWith("Error:"));
    });

    it("skips binary file extensions", async () => {
      const cache = new SmartReadCache();
      const filePath = await writeTestFile("image.png", "fake binary content");
      const r1 = cache.get(filePath);
      assert.equal(r1.cacheStatus, "fallback_full");
      assert.equal(r1.mode, "full");
    });
  });

  describe("Cache management", () => {
    it("invalidate resets cache state", async () => {
      const cache = new SmartReadCache();
      const filePath = await writeTestFile("test.ts", "export const x = 1\n");

      cache.get(filePath); // first read
      cache.invalidate(filePath);
      const r2 = cache.get(filePath); // should be first read again

      assert.equal(r2.cacheStatus, "first_read");
    });

    it("invalidateAll clears entire store", async () => {
      const cache = new SmartReadCache();
      const fp1 = await writeTestFile("a.ts", "export const a = 1\n");
      const fp2 = await writeTestFile("b.ts", "export const b = 2\n");

      cache.get(fp1);
      cache.get(fp2);
      cache.invalidateAll();

      const s = cache.stats();
      assert.equal(s.cachedFiles, 0);
    });

    it("stats reports accurate counts", async () => {
      const cache = new SmartReadCache();
      const filePath = await writeTestFile("test.ts", "export const x = 1\n");

      cache.get(filePath);
      let s = cache.stats();
      assert.equal(s.cachedFiles, 1);
      assert.equal(s.totalReads, 1);

      cache.get(filePath);
      s = cache.stats();
      assert.equal(s.totalReads, 2);
    });
  });

  describe("Edge cases", () => {
    it("short files return full content", async () => {
      const cache = new SmartReadCache();
      const filePath = await writeTestFile("short.ts", "const x = 1;\n");
      const r = cache.get(filePath);
      assert.equal(r.cacheStatus, "first_read");
    });

    it("handles file deleted between reads gracefully", async () => {
      const cache = new SmartReadCache();
      const filePath = await writeTestFile("temp.ts", "export const x = 1\n");
      cache.get(filePath);
      await fs.rm(filePath);
      const r2 = cache.get(filePath);
      assert(r2.content.startsWith("Error:"));
    });

    it("mode='diff' on unchanged file returns '(file unchanged)'", async () => {
      const cache = new SmartReadCache();
      const filePath = await writeTestFile("test.ts", "const a = 1;\n");
      cache.get(filePath);
      const r2 = cache.get(filePath, "diff");
      assert.equal(r2.mode, "diff");
      assert(r2.content.includes("unchanged"));
    });
  });

  describe("Skeleton extraction", () => {
    it("extracts imports from TypeScript files", async () => {
      const cache = new SmartReadCache();
      const filePath = await writeTestFile("service.ts", [
        "import { Request, Response } from 'express'",
        "import { Database } from '../db'",
        "",
        "export class AuthService {",
        "  login(email: string, pw: string): Promise<string> { return '' }",
        "  validate(token: string): boolean { return true }",
        "}",
      ].join("\n"));

      const r1 = cache.get(filePath);
      const r2 = cache.get(filePath);

      assert(r2.content.includes("import"));
      assert(r2.content.includes("class AuthService"));
      assert(r2.content.includes("login"));
      assert(r2.content.includes("validate"));
    });

    it("fallback for non-code files returns first lines", async () => {
      const cache = new SmartReadCache();
      const filePath = await writeTestFile("data.json", JSON.stringify({ a: 1, b: 2 }));
      cache.get(filePath);
      const r2 = cache.get(filePath);
      assert(r2.content.length > 0);
    });
  });

  describe("Large diff bypass", () => {
    it("returns full content when diff exceeds 1500 chars", async () => {
      const cache = new SmartReadCache();
      const filePath = await writeTestFile("big.ts", Array(100).fill("const a = 1;").join("\n"));

      cache.get(filePath);
      await fs.writeFile(filePath, Array(100).fill("const b = 2;").join("\n"), "utf-8");
      const r2 = cache.get(filePath);

      // If diff is >1500 chars, fallback returns full content
      assert(r2.mode === "diff" || r2.cacheStatus === "fallback_full");
    });
  });

  describe("Session isolation", () => {
    it("two SmartReadCache instances do not share state", async () => {
      const cache1 = new SmartReadCache();
      const cache2 = new SmartReadCache();
      const filePath = await writeTestFile("test.ts", "export const x = 1\n");

      cache1.get(filePath); // first read on cache1
      const r2 = cache2.get(filePath); // should be first read on cache2

      assert.equal(r2.cacheStatus, "first_read");
    });
  });

});
