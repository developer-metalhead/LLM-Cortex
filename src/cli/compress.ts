import fs from "fs/promises";
import path from "path";
import { minifyProse } from "../knowledge/brevity.js";
import { KnowledgeManager } from "../knowledge/writer.js";

async function getMarkdownFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const res = path.resolve(dir, entry.name);
      if (entry.isDirectory()) {
        return getMarkdownFiles(res);
      } else {
        return entry.isFile() && entry.name.endsWith(".md") ? [res] : [];
      }
    })
  );
  return files.flat();
}

export async function runCompress(
  projectRoot: string,
  filePath: string,
  options: { output?: string; inplace?: boolean }
): Promise<void> {
  const absolutePath = path.resolve(projectRoot, filePath);
  
  let stat;
  try {
    stat = await fs.stat(absolutePath);
  } catch (err: any) {
    console.error(`  Error: Could not access path '${filePath}': ${err.message}`);
    process.exit(1);
  }

  const { estimateTokens } = await import("../knowledge/packer.js");
  const km = new KnowledgeManager(projectRoot);
  const isKnowledgeExists = await km.exists();

  if (stat.isDirectory()) {
    if (!options.inplace) {
      console.error(`  Error: Directory compression requires the --inplace option.`);
      process.exit(1);
    }

    const files = await getMarkdownFiles(absolutePath);
    if (files.length === 0) {
      console.log(`  No markdown (.md) files found in '${filePath}'.`);
      return;
    }

    let totalOriginalBytes = 0;
    let totalCompressedBytes = 0;
    let totalOriginalTokens = 0;
    let totalCompressedTokens = 0;
    let filesCompressed = 0;

    for (const file of files) {
      const content = await fs.readFile(file, "utf-8");
      const compressed = minifyProse(content);
      
      const originalBytes = Buffer.byteLength(content, "utf8");
      const compressedBytes = Buffer.byteLength(compressed, "utf8");
      
      if (originalBytes === compressedBytes && content === compressed) {
        continue;
      }

      const originalTokens = estimateTokens(content);
      const compressedTokens = estimateTokens(compressed);

      totalOriginalBytes += originalBytes;
      totalCompressedBytes += compressedBytes;
      totalOriginalTokens += originalTokens;
      totalCompressedTokens += compressedTokens;

      if (isKnowledgeExists) {
        await km.recordBrevitySavings(content, compressed, true);
      }

      await fs.writeFile(file, compressed, "utf-8");
      filesCompressed++;
    }

    if (filesCompressed === 0) {
      console.log(`  All markdown files in '${filePath}' are already fully compressed!`);
      return;
    }

    const savedTokens = Math.max(0, totalOriginalTokens - totalCompressedTokens);
    const reductionPercent = totalOriginalTokens > 0
      ? ((savedTokens / totalOriginalTokens) * 100).toFixed(1)
      : "0.0";

    console.log(`  Successfully compressed ${filesCompressed} files in '${filePath}' in-place.`);
    console.log(`  [Brevity] Saved ${savedTokens.toLocaleString()} tokens (${reductionPercent}% reduction overall).`);

  } else {
    let content = "";
    try {
      content = await fs.readFile(absolutePath, "utf-8");
    } catch (err: any) {
      console.error(`  Error: Could not read file at '${filePath}': ${err.message}`);
      process.exit(1);
    }

    const compressed = minifyProse(content);

    const originalTokens = estimateTokens(content);
    const compressedTokens = estimateTokens(compressed);
    const savedTokens = Math.max(0, originalTokens - compressedTokens);
    const reductionPercent = originalTokens > 0
      ? ((savedTokens / originalTokens) * 100).toFixed(1)
      : "0.0";

    if (isKnowledgeExists) {
      await km.recordBrevitySavings(content, compressed, true);
    }

    if (options.inplace) {
      await fs.writeFile(absolutePath, compressed, "utf-8");
      console.log(`  Successfully compressed '${filePath}' in-place.`);
      console.log(`  [Brevity] Saved ${savedTokens.toLocaleString()} tokens (${reductionPercent}% reduction).`);
    } else if (options.output) {
      const dest = path.resolve(projectRoot, options.output);
      await fs.writeFile(dest, compressed, "utf-8");
      console.log(`  Successfully compressed '${filePath}' and saved to '${options.output}'.`);
      console.log(`  [Brevity] Saved ${savedTokens.toLocaleString()} tokens (${reductionPercent}% reduction).`);
    } else {
      process.stdout.write(compressed);
    }
  }
}
