import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { SynthesisSchema } from "../src/llm/schema.js";

describe("SynthesisSchema", () => {
  it("accepts a valid synthesis object", () => {
    const parsed = SynthesisSchema.safeParse({
      summary: "Test summary",
      entities: [
        {
          name: "src/Foo.ts",
          action: "create",
          description: "New module",
          links: ["[[Bar]]"],
        },
      ],
      concepts: [{ name: "Bar", description: "Concept" }],
      warnings: [],
    });
    assert.equal(parsed.success, true);
  });

  it("rejects invalid entity action", () => {
    const parsed = SynthesisSchema.safeParse({
      summary: "x",
      entities: [
        {
          name: "A",
          action: "rename",
          description: "d",
          links: [],
        },
      ],
      concepts: [],
      warnings: [],
    });
    assert.equal(parsed.success, false);
  });
});
