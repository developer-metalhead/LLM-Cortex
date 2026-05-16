#!/usr/bin/env node
// Cortex PreToolUse hook — auto-inject the knowledge index before Read/Grep.
// Fires once per agent session (keyed on parent PID) then stays silent.
// Also stashes a token-savings estimate for the Stop hook to surface after
// the agent's response.
// Exit 0 always — never blocks the tool call.

import { execSync } from "child_process";
import { existsSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const sessionMarker = join(tmpdir(), `cortex_injected_${process.ppid}`);
const savingsMarker = join(tmpdir(), `cortex_pending_savings_${process.ppid}`);
if (existsSync(sessionMarker)) process.exit(0);

function formatTokens(n) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return `${n}`;
}

try {
  const index = execSync("cortex read", {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "ignore"],
  }).trim();

  if (!index || index === "No existing knowledge found.") process.exit(0);

  // Estimate token savings: count source files via git, ~1200 tokens/file heuristic.
  let savingsData = null;
  try {
    const files = execSync("git ls-files", {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"],
    })
      .split("\n")
      .filter((f) => {
        const t = f.trim();
        return (
          t &&
          !t.startsWith(".knowledge") &&
          !t.startsWith(".claude") &&
          !t.startsWith(".agents") &&
          !t.startsWith(".antigravity") &&
          !t.startsWith(".cursor") &&
          !t.startsWith(".vscode") &&
          !t.startsWith(".windsurf") &&
          !t.startsWith(".codeium") &&
          !t.startsWith("node_modules") &&
          !t.startsWith("dist/") &&
          !t.endsWith(".lock")
        );
      });
    const indexTokens = Math.round(index.length / 4);
    const sourceTokenEstimate = files.length * 1200;
    const saved = Math.max(0, sourceTokenEstimate - indexTokens);
    if (saved >= 500 && files.length > 0) {
      savingsData = { saved, fileCount: files.length };
    }
  } catch {
    // git unavailable / not a repo — proceed without savings
  }

  writeFileSync(sessionMarker, "");
  if (savingsData) writeFileSync(savingsMarker, JSON.stringify(savingsData));

  const headerSuffix = savingsData
    ? ` (auto-injected — ~${formatTokens(savingsData.saved)} tokens saved vs scanning ${savingsData.fileCount} source files)`
    : ` (auto-injected before source read)`;

  process.stdout.write(
    `## [Cortex] Architectural knowledge index${headerSuffix}\n\n${index}\n`,
  );
} catch {
  // cortex not on PATH, no KB, or any other failure — stay silent
  process.exit(0);
}
