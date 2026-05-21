# 🚀 Project Cortex: The Master Feature Guide

Project Cortex is the ultimate architectural memory and governance layer for your codebase. This document is a comprehensive guide to every feature currently implemented, explaining exactly what they do in plain English and how to use them across CLI, MCP tools, and MCP prompts.

---

## 1. Auto-Sync Background Daemon
**What it does:** Cortex sits in the background and watches your codebase. Whenever you save a file or commit code, it uses an AI Librarian to translate raw code changes into structured architectural memory in `.knowledge/`.
**How to use it:**
- **CLI Command:** `cortex watch` (starts the background watcher daemon)
- **MCP Tool Call:** N/A (runs automatically as an OS process)
- **MCP Prompt Trigger:** N/A

---

## 2. Manual Ingestion Engine
**What it does:** Allows you to force a one-off batch synchronization of all uncommitted code changes directly from your terminal or IDE, ensuring the knowledge base is perfectly up to date before asking the AI a question.
**How to use it:**
- **CLI Command:** `cortex sync` (runs a batch sync session)
- **MCP Tool Call:** `ingest` (triggers the ingestion flow)
- **MCP Prompt Trigger:** `/ingest` or select `ingest` prompt

---

## 3. Magic Auto-Setup
**What it does:** Bootstraps Cortex into your project instantly. It auto-detects your IDEs, scaffolds the `.knowledge/` directory, writes the `.gitignore`, and registers the MCP server all in one command.
**How to use it:**
- **CLI Command:** `cortex init --magic` (non-interactive auto-setup) or `cortex init` (interactive setup)
- **MCP Tool Call:** N/A
- **MCP Prompt Trigger:** N/A

---

## 4. Developer Control Panel
**What it does:** An interactive CLI to manage Cortex. Check system health, get AI-driven "Next Actions," and dynamically swap between OpenAI, Anthropic, or Gemini without touching JSON config files.
**How to use it:**
- **CLI Command:** `cortex status` (health check), `cortex status --next` (next action suggestion), or `cortex config` (interactive config manager)
- **MCP Tool Call:** `get_cortex_status`
- **MCP Prompt Trigger:** `/status` or select `status` prompt
- **Tuning:** `CORTEX_PROVIDER` (default `"openai"`) — LLM provider; `CORTEX_MODEL` — model name for that provider. Override the interactive config without touching CLI. Set in `.env` or `~/.cortexrc`.

---

## 5. Universal IDE Integration
**What it does:** Connects Cortex directly to Claude Code, Cursor, Antigravity, and VSCode via the Model Context Protocol (MCP). It "piggybacks" on your existing IDE LLM subscription to save API costs.
**How to use it:**
- **CLI Command:** `cortex setup all` (registers the server across all detected IDEs)
- **MCP Tool Call:** N/A
- **MCP Prompt Trigger:** N/A

---

## 6. Dynamic Root Rebasing
**What it does:** Automatically fixes broken file paths. If your IDE opens from a weird parent directory, Cortex dynamically figures out the true root of your active project to ensure AI commands don't fail.
**How to use it:**
- **CLI Command:** `cortex mcp --project-root <path>` (explicitly force a project root)
- **MCP Tool Call:** `set_project_root` with argument `path="<absolute-path>"`
- **MCP Prompt Trigger:** N/A (handled dynamically by client)

---

## 7. Fuzzy Typo-Tolerant Architectural Search
**What it does:** Forget using `grep` to blindly search raw code. Cortex gives you a blazing-fast, sub-millisecond typo-tolerant search engine combining token substring overlap and Levenshtein edit distance, ranked via Reciprocal Rank Fusion (RRF) to put the most relevant entities at the top despite severe spelling mistakes.
**How to use it:**
- **CLI Command:** `cortex find <query> --type <entity|concept|parent|all>`
- **MCP Tool Call:** `cortex_find` with argument `query="<term>"` and optional `type="all"`
- **MCP Prompt Trigger:** N/A
- **Tuning:** `CORTEX_PROXIMITY_WINDOW` (default `5`) — how close multi-word terms must be to get a ranking boost; `CORTEX_SNIPPET_LENGTH` (default `120`) — character length of centered preview snippets. Set in `.env` or `~/.cortexrc`.

---

## 8. Interactive Knowledge Exploration
**What it does:** Lets the AI organically browse the knowledge graph by following `[[WikiLinks]]`, discovering how the system works step-by-step instead of reading the entire codebase at once.
**How to use it:**
- **CLI Command:** N/A (designed for conversational environments)
- **MCP Tool Call:** N/A
- **MCP Prompt Trigger:** `/explore` or select `explore` prompt

---

## 9. Layered Architectural Memory
**What it does:** Structures system memory into bite-sized entity pages. Separates what a module *is* (`## Role`), how to *use* it (`## Interface`), and what relies on it (`## Wiring`).
**How to use it:**
- **CLI Command:** `cortex read -e <entityName>` (prints full page for a specific entity) or `cortex read` (prints the main knowledge index)
- **MCP Tool Call:** `read_entity` with argument `name="<entityName>"` or `read_knowledge_index`
- **MCP Prompt Trigger:** `/read` or select `read` prompt

---

## 10. Failed Approaches Memory
**What it does:** Explicitly records *why* past attempts or architectural decisions failed, so future AI agents never repeat the same mistakes or suggest dead-end refactors.
**How to use it:**
- **CLI Command:** Printed directly within the output of `cortex read -e <entity>` or `cortex read -c <concept>` under the `## Failed Approaches` section.
- **MCP Tool Call:** Embedded in the return payload of `read_entity` or `read_concept`.
- **MCP Prompt Trigger:** N/A

---

## 11. Abstract Pattern Storage
**What it does:** Cortex doesn't just memorize files; it stores abstract cross-cutting patterns (like 'Event Sourcing' or 'Auth Strategy') as standalone concept pages, teaching the AI the *theory* behind your codebase.
**How to use it:**
- **CLI Command:** `cortex read -c <conceptName>` (prints full page for a concept)
- **MCP Tool Call:** `read_concept` with argument `name="<conceptName>"` or `save_concept` to register a new pattern.
- **MCP Prompt Trigger:** N/A

---

## 12. Knowledge Base Export
**What it does:** Generates a massive, comprehensive `ARCH_SPEC.md` document containing your entire project's synthesized architecture, perfect for external wikis or human review.
**How to use it:**
- **CLI Command:** `cortex export --spec`
- **MCP Tool Call:** `export` with argument `type="spec"`
- **MCP Prompt Trigger:** `/export` or select `export` prompt

---

## 13. Blast-Radius Propagation
**What it does:** When you change a core file, Cortex tracks the dependency tree and automatically flags every single downstream dependent file as `staleSince`, preventing hidden regressions.
**How to use it:**
- **CLI Command:** `cortex impact <entityName> --depth <max-hops> --hypothetical <delete>`
- **MCP Tool Call:** `impact_analysis` with arguments `entity="<entityName>"`, `direction="inbound"`, and optional `hypothetical="delete"`
- **MCP Prompt Trigger:** `/impact` or select `impact` prompt (pass `entity` argument)

---

## 14. Outbound Dependency Analysis
**What it does:** The reverse of Blast Radius. Shows you everything that a specific file *relies on* (ranked by hop distance) before you start working on it.
**How to use it:**
- **CLI Command:** `cortex deps <entityName> --depth <max-hops>`
- **MCP Tool Call:** `impact_analysis` with arguments `entity="<entityName>"` and `direction="outbound"`
- **MCP Prompt Trigger:** `/deps` or select `deps` prompt (pass `entity` argument)

---

## 15. Active Guardrails (Policy as Code)
**What it does:** Allows Lead Engineers to set hard rules (e.g., `mustNotImport` or `mustNotBeCalledBy`). Cortex intercepts the AI's system prompt and blocks it from writing code that violates these rules.
**How to use it:**
- **CLI Command:** N/A (automatically loaded on initialization)
- **MCP Tool Call:** Active constraints are verified during ingestion validation.
- **MCP Prompt Trigger:** N/A (automatically injected as context in all code-writing prompts)

---

## 16. Pre-Flight Safety Checks
**What it does:** The ultimate safety check. Forces the AI to read an entity's invariants and blast-radius *before* it is allowed to open or modify any of your source code.
**How to use it:**
- **CLI Command:** N/A (designed for agentic flows)
- **MCP Tool Call:** `before_change` with argument `entity="<entityName>"`
- **MCP Prompt Trigger:** `/before_change` or select `before_change` prompt

---

## 17. Automated Quality Scoring
**What it does:** Cortex acts as an automated Staff Engineer, grading its own documentation. Every entity receives a Quality Score (0.0 to 1.0) based on freshness, contradictions, and human review.
**How to use it:**
- **CLI Command:** `cortex audit quality` (prints a ranked list of entities, highlighting anything below the gate threshold)
- **MCP Tool Call:** `audit_quality` (returns the full score table) or `get_entity_quality` with `entity="<entityName>"`
- **MCP Prompt Trigger:** N/A
- **Tuning:** `CORTEX_QUALITY_GATE` (default `0.5`) — score below this exits 1 in CI; `CORTEX_QUALITY_AGE_DECAY_DAYS` (default `180`) — days before age score decays to minimum. Set in `.env` or `~/.cortexrc`.

---

## 18. Human-in-the-Loop Quality Review
**What it does:** Allows Lead Engineers to permanently boost an entity's Quality Score to 1.0 by officially marking it as "Human Reviewed."
**How to use it:**
- **CLI Command:** `cortex review accept <entityName> --reviewer <name>` or `cortex review reject <entityName>`
- **MCP Tool Call:** `review_entity` with arguments `entity="<entityName>"` and `action="accept|reject"`
- **MCP Prompt Trigger:** N/A

---

## 19. Evidence Drift Detection
**What it does:** Prevents AI hallucinations by checking if the documentation matches reality. Detects if source files were deleted or lines changed but the documentation remained.
**How to use it:**
- **CLI Command:** `cortex audit evidence` (exits 1 if mismatch found)
- **MCP Tool Call:** `audit_evidence` (returns a list of drifted entities)
- **MCP Prompt Trigger:** `/audit` or select `audit` prompt

---

## 20. Structural Graph Linting
**What it does:** Scans the architectural graph for anti-patterns, warning you about cyclical dependencies, orphaned entities, silos, and bloated "god modules."
**How to use it:**
- **CLI Command:** `cortex lint` (scans the entire active graph)
- **MCP Tool Call:** `lint`
- **MCP Prompt Trigger:** N/A
- **Tuning:** `CORTEX_GOD_MODULE_THRESHOLD` (default `10`) — inbound+outbound edges before an entity is flagged as a god module. Set in `.env` or `~/.cortexrc`.

---

## 21. Stale Knowledge Healing
**What it does:** When blast-radius flags a file as potentially broken, but you verify the code is still safe, Cortex provides a dedicated healing workflow to restore its 1.0 Quality Score without a full re-ingestion.
**How to use it:**
- **CLI Command:** `cortex audit stale` (interactive terminal manager to clean stale flags)
- **MCP Tool Call:** `refresh_stale_entities` with argument `names=["<entity1>", "<entity2>"]`
- **MCP Prompt Trigger:** N/A

---

## 22. Time-Travel Evolution Tracking
**What it does:** Reconstructs the complete architectural history and refactoring timeline of any entity across multiple git commits, explaining *why* code changed over time.
**How to use it:**
- **CLI Command:** `cortex evolution <entityName> --since <date|commit>`
- **MCP Tool Call:** `evolution_entity` with argument `entity="<entityName>"`
- **MCP Prompt Trigger:** N/A

---

## 23. Historical Index Replay
**What it does:** Allows you to rewind time and view the entire Project Cortex knowledge index as it stood at a specific git commit or date in the past.
**How to use it:**
- **CLI Command:** `cortex evolution --replay --at <commit-or-date>`
- **MCP Tool Call:** N/A
- **MCP Prompt Trigger:** N/A

---

## 24. Architectural Event Logging
**What it does:** A central ledger of every architectural shift, structural warning, or AI decision made in the project, structured as a queryable JSONL stream.
**How to use it:**
- **CLI Command:** `cortex log --entity <name> --since <date|commit> --warnings-only`
- **MCP Tool Call:** `log_query` with optional arguments `entity`, `since`, and `warningsOnly`
- **MCP Prompt Trigger:** N/A

---

## 25. Git Pre-Commit Guardrails
**What it does:** Installs a pre-commit hook that reminds developers to run a Cortex sync before they push breaking structural changes to the repository.
**How to use it:**
- **CLI Command:** `cortex hook` (injects pre-commit script into `.git/hooks`)
- **MCP Tool Call:** N/A
- **MCP Prompt Trigger:** N/A

---

## 26. Live Interactive Visualizer
**What it does:** Generates a stunning, interactive web UI of your entire codebase architecture. Drag nodes around, hover for Quality Scores, and click to read documentation—all hosted locally.
**How to use it:**
- **CLI Command:** `cortex serve --port <port> --host <host> --include-concepts`
- **MCP Tool Call:** N/A
- **MCP Prompt Trigger:** N/A

---

## 27. Automated Dependency Graphing
**What it does:** Instantly maps your codebase's bidirectional dependencies into standard Mermaid.js diagrams, visually color-coding nodes based on technical debt.
**How to use it:**
- **CLI Command:** `cortex graph --scope <entity> --depth <hops> --include-concepts --output <file>`
- **MCP Tool Call:** `graph` with optional arguments `scope`, `depth`, and `includeConcepts`
- **MCP Prompt Trigger:** `/export_graph` or `/export_graph_scoped`

---

## 28. Tailored Architectural Onboarding
**What it does:** Onboards human engineers or AI agents in 5 minutes. Uses PageRank math to find core concepts and writes a tailored "Welcome Guide" based on their seniority.
**How to use it:**
- **CLI Command:** `cortex onboard --audience <junior|senior|domain-expert> --depth <quick|thorough>`
- **MCP Tool Call:** `cortex_onboard` with optional arguments `audience` and `depth`
- **MCP Prompt Trigger:** `/onboard` or select `onboard` prompt

---

## 29. AST Skeleton Smart Read Cache
**What it does:** Intercepts file reads and caches them in memory. First read returns full content; subsequent reads return a compact AST skeleton (~90% smaller for TS/JS/Py/Go/Rs/Java) showing imports and structural declarations. If the file was modified between reads, it returns a unified diff instead. This slashes repetitive re-read costs and reduces context window bloat when the same files are read multiple times per session.
**How to use it:**
- **CLI Command:** `cortex source <file-path> --mode auto|full|skeleton|diff`
- **MCP Tool Call:** `source` with arguments `filePath`, `mode` (auto/full/skeleton/diff), and optional `bypass=true`
- **MCP Prompt Trigger:** N/A (handled automatically by MCP agent)
- **Tuning:** Cache holds up to 50 files per session with LRU eviction. Binary files (>1MB) and binary extensions are auto-excluded. Set in `.env` or `~/.cortexrc`.

---

## 30. Token-Bounded Context Packs
**What it does:** Packs your massive codebase into "Context Packs" that strictly fit within LLM token limits, prioritizing the most important central files first.
**How to use it:**
- **CLI Command:** `cortex context build --budget <tokens> --scope <entity> --depth <hops> --output <file>`
- **MCP Tool Call:** `build_context_pack` with arguments `budget`, `scope`, and `depth`
- **MCP Prompt Trigger:** `/context` or select `context` prompt

---

## 31. API Cost Estimation & Projections
**What it does:** Accurately estimates exactly how many tokens and dollars an ingestion will cost before any API calls are made, and provides weekly/monthly ROI projections.
**How to use it:**
- **CLI Command:** `cortex test-cost --budget <usd> --compare --projection --runs-per-day <count>`
- **MCP Tool Call:** `estimate_cost` with optional argument `budget`
- **MCP Prompt Trigger:** `/estimate_cost` or select `estimate_cost` prompt

---

## 32. Tokenized Reference Hashing
**What it does:** Dynamically replaces repetitive identical text blocks (like recurring code snippets) with short hash identifiers (e.g., `§ref:ab3f8§`), saving massive amounts of API tokens.
**How to use it:**
- **CLI Command:** N/A (handled silently during data query operations)
- **MCP Tool Call:** `resolve_refs` with argument `refs=["<hash1>", "<hash2>"]` (silently triggered by the client/agent)
- **MCP Prompt Trigger:** N/A

---

## 33. Telegraphic Brevity Engine
**What it does:** Actively strips conversational fluff from AI responses in real-time ("Please note that...", "Here is the implementation"), compressing payload sizes over the wire.
**How to use it:**
- **CLI Command:** `cortex config --brevity <off|lite|ultra>`
- **MCP Tool Call:** `configure_brevity` with argument `level="off|lite|ultra"`
- **MCP Prompt Trigger:** `/brevity` or select `brevity` prompt (pass `level` argument)
- **Tuning:** `CORTEX_BREVITY_LEVEL` (default `"off"`) — overrides CLI config when set. Values: `off`, `lite`, `ultra`. Set in `.env` or `~/.cortexrc`.

---

## 34. Markdown Compression Engine
**What it does:** A standalone engine that forcefully compresses physical markdown files directly on your hard drive, stripping all prose fluff to save tokens during future reads.
**How to use it:**
- **CLI Command:** `cortex compress <file-or-dir> --inplace` or `cortex compress <file> --output <dest>`
- **MCP Tool Call:** `compress` with argument `path="<file-or-dir>"` (forces in-place compression)
- **MCP Prompt Trigger:** `/compress` or select `compress` prompt (pass `file` argument)

---

## 35. Token & Cost Savings Ledger
**What it does:** A live financial dashboard recording exactly how many tokens and dollars Cortex saves your engineering team across all optimizations, with rolling 30-day ASCII charts.
**How to use it:**
- **CLI Command:** `cortex savings` (summary table) or `cortex savings --graph` (chronological bar chart)
- **MCP Tool Call:** `get_savings` with argument `graph=true|false`
- **MCP Prompt Trigger:** `/savings` or select `savings` prompt (pass `graph` argument)

---

## 36. API Budget & Runaway Safeguards
**What it does:** Defends your wallet by enforcing hard session budget caps and rolling hourly frequency gates. It blocks autonomous AI agents or local runs from starting runaway billing loops, with support for real-time telemetry tracking and dynamic constraint clearing.
* **Emergent Cost-Optimal Routing:** When budget limits are armed, smart AI agents will dynamically bypass expensive LLM `ingest` calls and intelligently route requests through free local validation tools (like `refresh_stale_entities` and `export`) to heal state and verify contracts for **$0.00**, delivering maximum quality at zero cost!
**How to use it:**
- **CLI Command:** `cortex config --max-cost <usd> --max-syncs-hour <count>` (configure), `cortex config -c none` (clear limit), or `cortex status` (view spent real-time usage)
- **MCP Tool Call:** `configure_safeguards` with arguments `maxCost` and `maxSyncsHour`
- **MCP Prompt Trigger:** select `safeguards` prompt
- **Tuning:** `CORTEX_MAX_SESSION_COST_USD` — hard session spend cap; `CORTEX_MAX_SYNC_CALLS_PER_HOUR` — rolling sync frequency gate. Override CLI config in CI. Set in `.env` or `~/.cortexrc`.

---

## 37. Time-Travel Architectural Autopsy
**What it does:** Allows developers to inspect the exact historical code crime scenes that triggered past architectural failures or constraint violations. By linking the structural history database directly to Git commits, you can travel back in time to audit mistakes.
**How to use it:**
1. Read the `## Failed Approaches` section of an entity using `cortex read -e <entityName>` or `read_entity`.
2. Grab the specific `commit` hash associated with the failed approach.
3. In your terminal, run `git checkout <commit-hash>`.
4. Open the file in your IDE to see the exact offending code that triggered the architectural alarm at that point in history.

---

## 38. Historical Quality & Debt Progression
**What it does:** Tracks the structural health of your codebase over weeks, months, or years. By leveraging the fact that `.knowledge/state.json` is checked into Git, you can analyze your team's quality progression and visualize how technical debt is evolving.
**How to use it:**
- Check out any historical commit in your project (e.g. `git checkout main@{1.month.ago}`).
- Run `cortex serve` or `cortex graph` to visually inspect the dependency map and quality scores as they stood at that exact moment in history.
- Run `cortex audit quality` to get a quantitative health report of the historical state, allowing you to plot a timeline of architectural health.

---

## 39. Automatic Stale Repair Guide
**What it does:** Converts generic developer onboarding guides into a highly targeted action plan for fixing active technical debt. If you have stale or broken entities, the PageRank onboarding generator automatically appends a step-by-step roadmap to repair them.
**How to use it:**
- **CLI Command:** Run `cortex onboard --audience senior --depth thorough` while you have active stale entities in the codebase.
- **Result:** The system will dynamically generate `.knowledge/onboarding_senior_thorough.md`, mapping out exactly what files are stale, who made the changes that broke them, which downstream dependents are affected, and what failed solutions to avoid.

---

## 40. Self-Vaccinating Architectural Immune System
**What it does:** An emergent cycle that turns failed architectural attempts into active AI wisdom. When a constraint violation is detected during sync, the failed approach is automatically logged into long-term memory via `## Failed Approaches`, so future AI agents can pre-emptively avoid repeating the same design mistakes.
**How to use it:**
- Run `cortex hook` to install a pre-commit hook that reminds developers to sync before pushing changes.
- When a constraint violation is detected during `cortex sync` or `ingest`, the AI Librarian automatically logs the failed approach into the entity's `## Failed Approaches` section.
- In subsequent tasks, the AI reads `failedApproaches` before writing code (via `getEntityGuardrails()`), dynamically guiding you away from making the same mistake twice.

---

## 41. Centrality-Weighted Semantic Pruning
**What it does:** An emergent feature in our context packing module. When packing files to fit within a strict LLM token limit, Cortex sorts files by graph centrality (importance) and selectively compresses leaf nodes (fluff, utilities) while preserving full architectural fidelity for core hubs.
**How to use it:**
- **CLI Command:** `cortex context build --budget <tokens> --scope <entity>`
- **Result:** Cortex will automatically allocate higher token budgets to central graph nodes and aggressively compress/elide minor leaf nodes to fit your exact budget limit.

---

## 42. Zero-Cost Human Curation Loop
**What it does:** Allows human curators to prune, update, and manage architectural documentation with zero API costs. You can resolve stale warnings and audit downstream blast-radii using fast, completely offline tools, keeping your database pristine for free.
**How to use it:**
1. Call `cortex audit stale` (or `smart_audit`) to view stale entities.
2. Verify that the files are still structurally valid.
3. Call `cortex review accept <entity>` to mark as reviewed and boost the Quality Score to 1.0.
4. Run `cortex audit stale` and select the entity to clear the stale flag locally—all without spending a single penny on LLM calls.

---

## 43. Graph Linting as a CI Quality Gate
**What it does:** Treats structural technical debt (like cyclical dependencies or bloated god modules) as a CI test failure. Graph lint warnings and Quality Score degradation give you the tools to enforce architectural integrity in your pipeline.
**How to use it:**
- Run `cortex lint` — it scans the graph and exits 1 on `error`-severity findings (cycles, orphans, god modules, silos).
- Run `cortex audit quality` — it exits 1 if any entity's Quality Score falls below your configured threshold (default 0.5).
- Plug these commands into your CI/CD pipeline to block PRs that introduce architectural decay.

---

## 44. Verbatim Source-Code Grounding (Deterministic Proofs)
**What it does:** Prevents AI hallucinations by grounding all architectural descriptions in physical, verbatim code snippets and exact line ranges. Cortex tracks these "proofs" and flags them as drifted the second the physical source code lines diverge.
**How to use it:**
- When reading an entity with `cortex read -e <entity>` or `read_entity`, check the `Evidence` blocks containing physical code snippets.
- If you refactor or edit those exact lines, run `cortex audit evidence` in your terminal or IDE to instantly verify if your documented proofs still match the ground truth.

---

## 45. Automated Structural Contradiction Alarms
**What it does:** Actively flags logical contradictions between your implementation and documented contracts. When the AI Librarian detects a contradiction during sync, it drops the entity's Quality Score below the safety gate, surfacing structural drift.
**How to use it:**
- **How it triggers:** Automatically evaluated during `cortex sync` or `ingest` using the AI Librarian's contradiction engine.
- **Detection:** If a logical contradiction is detected, the Quality Score degrades below `0.5` and the entity is flagged in `cortex audit quality`.
- **CI Integration:** Add `cortex audit quality` to your pipeline — any PR introducing contradictions will fail the build.

---

## 46. Pre-Tool Call Knowledge Context Injection
**What it does:** Automatically injects the Cortex knowledge index into every AI session before Read or Grep tool calls. The PreToolUse hook (`inject-knowledge.js`) runs as a cross-platform Node.js script triggered by Claude Code, reading the knowledge index and appending relevant context to the system prompt — no manual `/read` needed. Each session gets fresh context via PPID-based session key tracking.
**How to use it:**
- **CLI Command:** `cortex setup claude-code` (automatically writes the hook into `.claude/hooks/inject-knowledge.js` and registers the `PreToolUse` matcher in `.claude/settings.json`)
- **MCP Tool Call:** N/A (runs automatically as a Claude Code hook)
- **MCP Prompt Trigger:** N/A

---

## 47. Speculative Context Verification & Grounded Fallback (Adaptive Retrieval)
**What it does:** Ensures that AI co-pilots get a completely self-healing, reliable retrieval safety net. During context-pack compilation (`cortex context build`), Cortex checks if all imports and 1-hop relationships for target entities exist in the pack. If a dependency contract is missing, it dynamically expands the context budget. If a dependency is completely un-ingested (e.g. a brand new utility), it runs a sub-millisecond local source code grep fallback, extracts the missing signature, and appends it to the context pack automatically so the AI never hallucinates or fails.
**How to use it:**
- **CLI Command:** Runs automatically during `cortex context build`
- **MCP Tool Call:** Automatically integrated within `build_context_pack` when `projectRoot` is supplied
- **MCP Prompt Trigger:** N/A


