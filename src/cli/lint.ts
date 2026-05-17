import { LintManager } from "../knowledge/lint.js";

// Returns exit code (0 = clean or warnings only, 1 = errors). Caller decides
// when to exit so the function stays embeddable.
export async function runLint(projectRoot: string): Promise<number> {
  const lm = new LintManager(projectRoot);
  const results = await lm.lint();

  if (results.length === 0) {
    console.log("✅ No graph integrity issues detected.");
    return 0;
  }

  let errorCount = 0;
  let warningCount = 0;

  for (const result of results) {
    if (result.severity === "error") errorCount++;
    else warningCount++;

    const prefix = result.severity === "error" ? "❌" : "⚠️";
    const entityInfo = result.entity ? `[${result.entity}] ` : "";
    console.log(`${prefix} ${result.rule}: ${entityInfo}${result.message}`);
  }

  console.log(`\nLint complete: ${errorCount} errors, ${warningCount} warnings.`);
  return errorCount > 0 ? 1 : 0;
}
