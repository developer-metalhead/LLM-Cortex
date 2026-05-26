import fs from "fs";
import path from "path";
import { SoulEngine } from "../knowledge/soul.js";

export async function runSoul(
  projectRoot: string,
  subcommand: string | undefined,
  options: { output?: string; file?: string },
): Promise<number> {
  if (!subcommand) {
    console.log(`
  Project Cortex — Soul Engine v13.8

  Manages the Persistent Experience & Cognitive Mode-Adaptive Context system.

  Usage:
    cortex soul status          — Show current soul state (lens, memory stats, profile)
    cortex soul reset           — Wipe soul state, profile, and experience ledger
    cortex soul export          — Export soul state to JSON (use -o for custom path)
    cortex soul import <file>   — Import soul state from a JSON file

  Examples:
    cortex soul status
    cortex soul export -o /tmp/soul-backup.json
    cortex soul import ./soul-backup.json
    `);
    return 0;
  }

  const soulPath = path.join(projectRoot, ".knowledge", "soul_state.json");
  const profilePath = path.join(projectRoot, ".knowledge", "user_profile.json");
  const experiencePath = path.join(projectRoot, ".knowledge", "experience.jsonl");

  switch (subcommand) {
    case "status": {
      const engine = new SoulEngine(projectRoot);
      await engine.load();
      const status = engine.status();
      console.log(status);
      return 0;
    }

    case "reset": {
      // Remove all three soul-related files
      for (const p of [soulPath, profilePath, experiencePath]) {
        if (fs.existsSync(p)) {
          fs.unlinkSync(p);
        }
      }
      console.log("Soul state, profile, and experience ledger reset.");
      return 0;
    }

    case "export": {
      const outPath = options.output || path.join(projectRoot, ".knowledge", "soul_export.json");
      if (!fs.existsSync(soulPath)) {
        console.log("No soul state to export — run a sync first.");
        return 1;
      }
      // Atomic copy via read + write to a temp file + rename
      const tmp = outPath + ".tmp";
      fs.copyFileSync(soulPath, tmp);
      fs.renameSync(tmp, outPath);
      console.log(`Soul state exported to ${outPath}`);
      return 0;
    }

    case "import": {
      let importPath = options.file;
      if (!importPath) {
        const importIdx = process.argv.indexOf("import");
        if (importIdx !== -1 && process.argv[importIdx + 1] && !process.argv[importIdx + 1].startsWith("-")) {
          importPath = process.argv[importIdx + 1];
        }
      }
      if (!importPath || !fs.existsSync(importPath)) {
        console.log("Usage: cortex soul import <file>");
        return 1;
      }
      const tmp = soulPath + ".tmp";
      fs.copyFileSync(importPath, tmp);
      fs.renameSync(tmp, soulPath);
      console.log(`Soul state imported from ${importPath}`);
      return 0;
    }

    default:
      console.log(`Unknown subcommand: ${subcommand}. Try 'status', 'reset', 'export', or 'import'.`);
      return 1;
  }
}
