import { EvolutionManager } from "../knowledge/evolution.js";

export interface EvolutionOptions {
  since?: string;
  format?: "markdown" | "json";
  replay?: boolean;
  at?: string;
}

export async function runEvolution(
  projectRoot: string,
  entity: string | undefined,
  options: EvolutionOptions,
): Promise<void> {
  const em = new EvolutionManager(projectRoot);
  const format = options.format ?? "markdown";

  if (options.replay) {
    if (!options.at) {
      console.error("`--replay` requires `--at <commit|date>`.");
      process.exitCode = 1;
      return;
    }
    try {
      const result = await em.replayAt(options.at);
      if (format === "json") {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(result.index);
        if (!result.hasSnapshot) {
          console.error(
            `\n[cortex] Warning: no state snapshots in log up to ${result.cutoff}; rendered names-only narrative.`,
          );
        }
      }
    } catch (err: any) {
      console.error(`[cortex] ${err.message}`);
      process.exitCode = 1;
    }
    return;
  }

  if (!entity) {
    console.error("Usage: cortex evolution <entity> [--since <commit|date>] [--format markdown|json]");
    console.error("       cortex evolution --replay --at <commit|date> [--format markdown|json]");
    process.exitCode = 1;
    return;
  }

  const entries = await em.getEvolution(entity, options.since);

  if (format === "json") {
    console.log(JSON.stringify(entries, null, 2));
    return;
  }

  if (entries.length === 0) {
    console.log(`No history found for entity '${entity}'.`);
    return;
  }

  console.log(`# Evolution: ${entity}\n`);
  for (const entry of entries) {
    console.log(`## [${entry.timestamp}]`);
    console.log(`Summary: ${entry.summary}`);
    if (entry.warnings && entry.warnings.length > 0) {
      console.log(`Warnings: ${entry.warnings.join("; ")}`);
    }
    console.log("");
  }
}
