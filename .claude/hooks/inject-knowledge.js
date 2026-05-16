#!/usr/bin/env node
// Cortex PreToolUse hook — auto-inject the knowledge index before Read/Grep.
// Fires once per agent session (keyed on parent PID) then stays silent.
// Exit 0 always — never blocks the tool call.

import { execSync } from "child_process";
import { existsSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const sessionMarker = join(tmpdir(), `cortex_injected_${process.ppid}`);
if (existsSync(sessionMarker)) process.exit(0);

try {
  const index = execSync("cortex read", {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "ignore"],
  }).trim();

  if (!index || index === "No existing knowledge found.") process.exit(0);

  writeFileSync(sessionMarker, "");
  process.stdout.write(
    `## [Cortex] Architectural knowledge index (auto-injected before source read)\n\n${index}\n`,
  );
} catch {
  // cortex not on PATH, no KB, or any other failure — stay silent
  process.exit(0);
}
