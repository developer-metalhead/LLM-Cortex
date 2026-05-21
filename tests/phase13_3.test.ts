import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { minifyProse } from "../src/knowledge/brevity.js";

describe("Phase 13.3 — Brevity Engine (Telegraphic Memory)", () => {
  describe("minifyProse()", () => {
    it("strips conversational filler effectively", () => {
      const text = "Please note that in order to resolve the dependency, we recommend that you check the configuration parameters.";
      const minified = minifyProse(text);
      assert.strictEqual(minified, "To resolve the dep, We recommend check the config params.");
    });

    it("protects fenced code blocks from modification", () => {
      const text = `
Here is a dependency example:
\`\`\`typescript
// Please note that this dependency configuration is strict
function load(parameter: string) {
  return dependency.run(parameter);
}
\`\`\`
For example, it requires two arguments.`;

      const minified = minifyProse(text);
      
      // Inside codeblock, 'dependency', 'configuration', 'Please note that' should NOT be changed
      assert.match(minified, /Please note that this dependency configuration is strict/);
      assert.match(minified, /function load\(parameter: string\)/);
      assert.match(minified, /return dependency\.run\(parameter\);/);

      // Outside codeblock, 'dependency' -> 'dep', 'For example' -> 'e.g.', 'arguments' -> 'args'
      assert.match(minified, /Here is a dep example:/);
      assert.match(minified, /e.g., it requires two args\./);
    });

    it("protects inline code snippets (`...`) from being destroyed", () => {
      const text = "The `dependency` object uses `parameter` and `configuration` elements.";
      const minified = minifyProse(text);
      // 'dependency', 'parameter', 'configuration' inside backticks must remain untouched.
      assert.strictEqual(minified, "The `dependency` object uses `parameter` and `configuration` elements.");
    });

    it("protects markdown link URLs from corruption", () => {
      const text = "See the [implementation details](http://example.com/api/dependency/parameters) for information.";
      const minified = minifyProse(text);
      // The text portion "implementation details" should become "impl details".
      // The text portion "information" should become "info".
      // The URL MUST NOT be changed to "http://example.com/api/dep/params".
      assert.strictEqual(minified, "See the [impl details](http://example.com/api/dependency/parameters) for info.");
    });

    it("handles multiple inline protections on the same line", () => {
      const text = "Pass the `parameter` to [dependency config](https://github.com/dependency) and `arguments`.";
      const minified = minifyProse(text);
      assert.strictEqual(minified, "Pass the `parameter` to [dep config](https://github.com/dependency) and `arguments`.");
    });
  });
});
