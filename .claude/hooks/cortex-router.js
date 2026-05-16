#!/usr/bin/env node
// Cortex UserPromptSubmit hook — on action prompts ("implement", "fix",
// "refactor", etc.), automatically inject the knowledge-first workflow so the
// AI checks Cortex before touching source. Stays silent on non-action prompts
// and when the knowledge base is missing. Never blocks a prompt.

import { readFileSync, existsSync } from "fs";
import { join } from "path";

const ACTION_PATTERN =
  /\b(implement|build|create|add|write|fix|repair|debug|refactor|modify|change|update|migrate|rewrite|extract|introduce|replace|delete|remove|rename|move|restructure|reorganize|optimize)\b/i;

try {
  const raw = readFileSync(0, "utf8");
  let prompt = "";
  try {
    const parsed = JSON.parse(raw);
    prompt = (parsed.prompt || parsed.user_message || "").trim();
  } catch {
    prompt = raw.trim();
  }

  if (!prompt || prompt.length < 5) process.exit(0);
  if (!ACTION_PATTERN.test(prompt)) process.exit(0);

  // Only nudge when there's a knowledge base to consult.
  const cwd = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  if (!existsSync(join(cwd, ".knowledge"))) process.exit(0);

  process.stdout.write(
    [
      "",
      "[Cortex auto-router] This prompt looks like an action task (implement / modify / fix / refactor).",
      "Before opening any source file, follow the knowledge-first workflow:",
      "",
      "1. Call `read_knowledge_index` (project-cortex MCP) to see what already exists.",
      "2. Find the entity that matches the task (search by name or sourceFile).",
      "3. Call `read_entity` on it. Read the `## Wiring` section — every `[[WikiLink]]` there is a downstream consumer that may break if you change behavior or shape.",
      "4. For any concept the entity Implements, call `read_concept` to learn the invariants you must uphold.",
      "5. State a one-paragraph plan: (a) which entities you'll touch, (b) which dependents could be affected, (c) which invariants apply.",
      "6. ONLY THEN open source files and write code.",
      "",
      "Skipping this risks: duplicating existing implementations, breaking dependents you didn't know about, violating documented invariants. If the knowledge base is empty for this task, say so and recommend `/ingest_cortex` first.",
      "",
    ].join("\n"),
  );
} catch {
  process.exit(0);
}
