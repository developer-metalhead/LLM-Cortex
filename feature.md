# 🚀 Project Cortex: The Master Feature Guide

Project Cortex is the ultimate architectural memory and governance layer for your codebase. This document is a comprehensive guide to every feature currently implemented, explaining exactly what they do in plain English and how to use them.

---

## 1. Auto-Sync Background Daemon
**What it does:** Cortex sits in the background and watches your codebase. Whenever you save a file or commit code, it uses an AI Librarian to translate raw code changes into structured architectural memory.
**How to use it:** Run `cortex watch` in your terminal.

## 2. Manual Ingestion Engine
**What it does:** Allows you to force a one-off batch synchronization of all uncommitted code changes directly from your IDE, ensuring the knowledge base is perfectly up to date before asking the AI a question.
**How to use it:** Call the `ingest` MCP prompt in your IDE, or run `cortex sync` in the terminal.

## 3. Magic Auto-Setup
**What it does:** Bootstraps Cortex into your project instantly. It auto-detects your IDEs, scaffolds the `.knowledge/` directory, writes the `.gitignore`, and registers the MCP server all in one command.
**How to use it:** Run `cortex init --magic`.

## 4. Developer Control Panel
**What it does:** An interactive CLI to manage Cortex. Check system health, get AI-driven "Next Actions," and dynamically swap between OpenAI, Anthropic, or Gemini without touching JSON config files.
**How to use it:** Run `cortex status`, `cortex status --next`, or `cortex config`.

## 5. Universal IDE Integration
**What it does:** Connects Cortex directly to Claude Code, Cursor, Antigravity, and VSCode via the Model Context Protocol (MCP). It "piggybacks" on your existing IDE LLM subscription to save API costs.
**How to use it:** Run `cortex setup all`.

## 6. Dynamic Root Rebasing
**What it does:** Automatically fixes broken file paths. If your IDE opens from a weird parent directory, Cortex dynamically figures out the true root of your active project to ensure AI commands don't fail.
**How to use it:** The AI uses the `set_project_root` MCP tool when needed.

## 7. Sub-millisecond Architectural Search
**What it does:** Forget using `grep` to blindly search raw code. Cortex gives you a blazing-fast, sub-millisecond exact search engine that queries your *architecture* (Entities, Concepts, Parents) directly.
**How to use it:** Run `cortex find <query>`, or use the `cortex_find` MCP tool.

## 8. Interactive Knowledge Exploration
**What it does:** Lets the AI organically browse the knowledge graph by following `[[WikiLinks]]`, discovering how the system works step-by-step instead of reading the entire codebase at once.
**How to use it:** Type `/explore` in your IDE.

## 9. Layered Architectural Memory
**What it does:** Structures system memory into bite-sized entity pages. Separates what a module *is* (`## Role`), how to *use* it (`## Interface`), and what relies on it (`## Wiring`).
**How to use it:** Run `cortex read -e <entity>`, or use the `read` prompt.

## 10. Failed Approaches Memory
**What it does:** Explicitly records *why* past attempts or architectural decisions failed, so future AI agents never repeat the same mistakes or suggest dead-end refactors.
**How to use it:** Embedded directly inside entity and concept pages.

## 11. Abstract Pattern Storage
**What it does:** Cortex doesn't just memorize files; it stores abstract cross-cutting patterns (like 'Event Sourcing' or 'Auth Strategy') as standalone concept pages, teaching the AI the *theory* behind your codebase.
**How to use it:** Run `cortex read -c <concept>`, or use the `read_concept` MCP tool.

## 12. Knowledge Base Export
**What it does:** Generates a massive, comprehensive `ARCH_SPEC.md` document containing your entire project's synthesized architecture, perfect for external wikis or human review.
**How to use it:** Run `cortex export --spec`.

## 13. Blast-Radius Propagation
**What it does:** When you change a core file, Cortex tracks the dependency tree and automatically flags every single downstream dependent file as `staleSince`, preventing hidden regressions.
**How to use it:** Run `cortex impact <entity>`, or use the `/impact` prompt.

## 14. Outbound Dependency Analysis
**What it does:** The reverse of Blast Radius. Shows you everything that a specific file *relies on* (ranked by hop distance) before you start working on it.
**How to use it:** Run `cortex deps <entity>`, or use the `/deps` prompt.

## 15. Active Guardrails (Policy as Code)
**What it does:** Allows Lead Engineers to set hard rules (e.g., `mustNotImport` or `mustNotBeCalledBy`). Cortex intercepts the AI's system prompt and blocks it from writing code that violates these rules.
**How to use it:** Define rules in a `cortex.constraints.yaml` file in your project root.

## 16. Pre-Flight Safety Checks
**What it does:** The ultimate safety check. Forces the AI to read an entity's invariants and blast-radius *before* it is allowed to open or modify any of your source code.
**How to use it:** Type `/before_change` in your IDE.

## 17. Automated Quality Scoring
**What it does:** Cortex acts as an automated Staff Engineer, grading its own documentation. Every entity receives a Quality Score (0.0 to 1.0) based on freshness, contradictions, and human review.
**How to use it:** Run `cortex audit quality` or use the `audit_quality` MCP tool.

## 18. Human-in-the-Loop Quality Review
**What it does:** Allows Lead Engineers to permanently boost an entity's Quality Score to 1.0 by officially marking it as "Human Reviewed."
**How to use it:** Run `cortex review accept <entity>`.

## 19. Evidence Drift Detection
**What it does:** Prevents AI hallucinations by checking if the documentation matches reality. Detects if source files were deleted or lines changed but the documentation remained.
**How to use it:** Run `cortex audit evidence`.

## 20. Structural Graph Linting
**What it does:** Scans the architectural graph for anti-patterns, warning you about cyclical dependencies, orphaned entities, silos, and bloated "god modules."
**How to use it:** Run `cortex lint`.

## 21. Stale Knowledge Healing
**What it does:** When blast-radius flags a file as potentially broken, but you verify the code is still safe, Cortex provides a dedicated healing workflow to restore its 1.0 Quality Score without a full re-ingestion.
**How to use it:** Run `cortex audit stale`, or use the `refresh_stale_entities` MCP tool.

## 22. Time-Travel Evolution Tracking
**What it does:** Reconstructs the complete architectural history and refactoring timeline of any entity across multiple git commits, explaining *why* code changed over time.
**How to use it:** Run `cortex evolution <entity>`.

## 23. Historical Index Replay
**What it does:** Allows you to literally rewind time and view the entire Project Cortex knowledge index as it stood at a specific git commit or date in the past.
**How to use it:** Run `cortex evolution --replay --at <commit>`.

## 24. Architectural Event Logging
**What it does:** A central ledger of every architectural shift, structural warning, or AI decision made in the project.
**How to use it:** Run `cortex log`, or use the `log_query` MCP tool.

## 25. Git Pre-Commit Guardrails
**What it does:** Installs a pre-commit hook that reminds developers to run a Cortex sync before they push breaking structural changes to the repository.
**How to use it:** Run `cortex hook`.

## 26. Live Interactive Visualizer
**What it does:** Generates a stunning, interactive web UI of your entire codebase architecture. Drag nodes around, hover for Quality Scores, and click to read documentation—all hosted locally.
**How to use it:** Run `cortex serve` and open `http://127.0.0.1:7842`.

## 27. Automated Dependency Graphing
**What it does:** Instantly maps your codebase's bidirectional dependencies into standard Mermaid.js diagrams, visually color-coding nodes based on technical debt.
**How to use it:** Run `cortex graph` or type `/export_graph`.

## 28. Tailored Architectural Onboarding
**What it does:** Onboards human engineers or AI agents in 5 minutes. Uses PageRank math to find core concepts and writes a tailored "Welcome Guide" based on their seniority.
**How to use it:** Run `cortex onboard` or type `/onboard`.

## 29. Token-Bounded Context Packs
**What it does:** Packs your massive codebase into "Context Packs" that strictly fit within LLM token limits, prioritizing the most important central files first.
**How to use it:** Run `cortex context build --budget 8000`.

## 30. API Cost Estimation & Projections
**What it does:** Accurately estimates exactly how many tokens and dollars an ingestion will cost before any API calls are made, and provides weekly/monthly ROI projections.
**How to use it:** Run `cortex test-cost` or `cortex test-cost --projection`.

## 31. Tokenized Reference Hashing
**What it does:** Dynamically replaces repetitive identical text blocks (like recurring code snippets) with short hash identifiers (e.g., `§ref:ab3f8§`), saving massive amounts of API tokens.
**How to use it:** The AI silently uses the `resolve_refs` MCP tool to expand them back.

## 32. Telegraphic Brevity Engine
**What it does:** Actively strips conversational fluff from AI responses in real-time ("Please note that...", "Here is the implementation"), compressing payload sizes over the wire.
**How to use it:** Use the `/brevity` prompt in your IDE to set compression to `lite` or `ultra`.

## 33. Markdown Compression Engine
**What it does:** A standalone engine that forcefully compresses physical `.knowledge/` markdown files directly on your hard drive, stripping all prose fluff to save tokens during future reads.
**How to use it:** Run `cortex compress <file>` or `cortex compress --inplace`.

## 34. Token & Cost Savings Ledger
**What it does:** A live financial dashboard recording exactly how many tokens and dollars Cortex saves your engineering team across all optimizations, with rolling 30-day ASCII charts.
**How to use it:** Run `cortex savings --graph` or type `/savings`.
