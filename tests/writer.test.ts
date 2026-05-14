import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { KnowledgeManager } from "../src/knowledge/writer.js";

describe("KnowledgeManager", () => {
  let tmp: string;

  before(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), "cortex-writer-"));
  });

  it("removes entity file when action is delete", async () => {
    const km = new KnowledgeManager(tmp);
    await km.init();

    await km.saveSynthesis({
      summary: "add entity",
      entities: [
        {
          name: "ToRemove",
          action: "create",
          description: "temp",
          links: [],
        },
      ],
      concepts: [],
      warnings: [],
    });

    const entityPath = path.join(tmp, ".knowledge", "entities", "ToRemove.md");
    await fs.access(entityPath);

    await km.saveSynthesis({
      summary: "remove entity",
      entities: [
        {
          name: "ToRemove",
          action: "delete",
          description: "gone",
          links: [],
        },
      ],
      concepts: [],
      warnings: [],
    });

    await assert.rejects(() => fs.access(entityPath));
  });
});
