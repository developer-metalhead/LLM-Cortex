import { KnowledgeManager } from "../knowledge/writer.js";
import { buildContextPack } from "../knowledge/packer.js";
import fs from "fs";
import path from "path";

export async function runContextBuild(
  projectRoot: string,
  options: { budget?: string; scope?: string; depth?: string; format?: string; output?: string }
) {
  const km = new KnowledgeManager(projectRoot);
  const state = await km.getState();

  const budget = options.budget ? parseInt(options.budget, 10) : 8000;
  if (isNaN(budget)) {
    console.error("❌ Invalid budget provided. Must be a number.");
    process.exit(1);
  }

  const depth = options.depth ? parseInt(options.depth, 10) : undefined;
  if (options.depth && isNaN(depth!)) {
    console.error("❌ Invalid depth provided. Must be a number.");
    process.exit(1);
  }

  const format = (options.format === "json") ? "json" : "markdown";

  console.log(`📦 Building Context Pack (Budget: ${budget} tokens)...`);
  
  const { SoulEngine } = await import("../knowledge/soul.js");
  const soul = new SoulEngine(projectRoot);
  try {
    await soul.load();
  } catch {}
  const activeLens = soul.detectActiveLens();

  const pack = buildContextPack(state, {
    budget,
    scope: options.scope,
    depth,
    format,
    projectRoot,
    lens: activeLens,
    soulEngine: soul,
  });

  const outputContent = pack.output;

  if (options.output) {
    const outPath = path.resolve(projectRoot, options.output);
    fs.writeFileSync(outPath, outputContent, "utf-8");
    console.log(`✅ Context Pack written to: ${outPath}`);
  } else {
    console.log(`\n` + outputContent + `\n`);
  }

  console.log(`📊 Pack Stats:`);
  console.log(`   - Estimated Tokens: ${pack.tokens} / ${budget}`);
  if (pack.elided.length > 0) {
    console.log(`   - Elided items: ${pack.elided.length} (due to budget constraints)`);
  } else {
    console.log(`   - Elided items: 0`);
  }
  if (pack.expanded && pack.expanded.length > 0) {
    console.log(`   - 🔄 Dynamic Expansion: ${pack.expanded.length} entity(s) re-included: ${pack.expanded.join(", ")}`);
  }
  if (pack.groundedFallbacks && pack.groundedFallbacks.length > 0) {
    console.log(`   - ⚡ Grounded Fallbacks: ${pack.groundedFallbacks.length} entity(s) resolved from source: ${pack.groundedFallbacks.map(f => `${f.name} (${f.confidence})`).join(", ")}`);
  }
}
