---
description: Generate a comprehensive ARCH_SPEC.md from the project's synthesized knowledge.
---

# Export Spec (Project Cortex)

Generate a human-readable Architectural Specification from the synthesized knowledge base.

1. Run the CLI command to export the spec:
   `run_command("npx tsx src/cli/index.ts export --spec", Cwd=projectRoot)`

2. This generates a file named `ARCH_SPEC.md` in the project root.

3. This document contains:
   - Full dependency graph (Relationships).
   - Architectural Constraints (Guardrails).
   - Historical Design Context (Failed Approaches).
   - Conceptual Patterns.

4. Inform the user that the file has been generated and is ready for review or distribution.
