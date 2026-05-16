#!/usr/bin/env node
// Cortex Stop hook — appends a token-savings footer once per session after
// the agent's response. Reads the savings estimate stashed by the PreToolUse
// hook (inject-knowledge.js) at session start, prints a one-line footer, then
// deletes its marker so the footer shows once per session, not repeatedly.
// Exit 0 always — never blocks the agent's stop.

import { existsSync, readFileSync, unlinkSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const savingsMarker = join(tmpdir(), `cortex_pending_savings_${process.ppid}`);
if (!existsSync(savingsMarker)) process.exit(0);

try {
  const content = readFileSync(savingsMarker, "utf8").trim();
  unlinkSync(savingsMarker);
  if (!content) process.exit(0);

  const { saved, fileCount } = JSON.parse(content);
  if (typeof saved !== "number" || saved < 500) process.exit(0);

  const savedFmt = saved >= 1000 ? `~${(saved / 1000).toFixed(1)}k` : `~${saved}`;
  process.stdout.write(
    `\n---\n*Cortex: ${savedFmt} tokens saved this session — used synthesized knowledge instead of scanning ${fileCount} source files.*\n`,
  );
} catch {
  process.exit(0);
}
