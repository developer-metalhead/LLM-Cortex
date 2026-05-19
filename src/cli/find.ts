import { KnowledgeManager } from "../knowledge/writer.js";
import { FindManager } from "../knowledge/find.js";

export async function runFind(
  projectRoot: string,
  query: string,
  options: { type?: "entity" | "concept" | "parent" | "all" }
): Promise<void> {
  const km = new KnowledgeManager(projectRoot);

  if (!(await km.exists())) {
    console.log("\n  Knowledge base not initialized. Run `cortex init` first.\n");
    return;
  }

  const type = options.type || "all";
  const fm = new FindManager(km);

  console.log(`\n  🔍 Searching category '${type}' for "${query}"...\n`);
  const start = Date.now();
  const results = await fm.find(type, query);
  const duration = Date.now() - start;

  if (results.length === 0) {
    console.log(`  No matches found (completed in ${duration}ms).\n`);
    return;
  }

  console.log(`  Found ${results.length} matches (completed in ${duration}ms):\n`);
  for (const r of results) {
    const typeLabel = r.type === "parent" ? "📁 parent" : r.type === "concept" ? "💡 concept" : "📄 entity";
    console.log(`  * [[${r.name}]] (${typeLabel})`);
    console.log(`    ${r.preview}`);
    console.log();
  }
}
