# 📋 Project Cortex: Feature List Index

Click on any feature below to jump to the **Master Feature Guide**, which explains what the feature does and how to use it in your terminal or AI IDE.

---

### Core Engine & IDE Integration
- [**1. Auto-Sync Background Daemon**](./feature.md#1-auto-sync-background-daemon)
  *Runs `cortex watch` to automatically ingest codebase changes.*
- [**2. Manual Ingestion Engine**](./feature.md#2-manual-ingestion-engine)
  *Force a batch sync from your IDE before asking architectural questions.*
- [**3. Magic Auto-Setup**](./feature.md#3-magic-auto-setup)
  *Instantly detect IDEs, scaffold `.knowledge/`, and register MCP servers.*
- [**4. Developer Control Panel**](./feature.md#4-developer-control-panel)
  *Manage config, health, and AI models via the CLI.*
- [**5. Universal IDE Integration**](./feature.md#5-universal-ide-integration)
  *Native connection to Claude Code, Cursor, and VSCode via MCP.*
- [**6. Dynamic Root Rebasing**](./feature.md#6-dynamic-root-rebasing)
  *Auto-resolves broken paths when IDEs launch from unexpected root directories.*
- [**7. Sub-millisecond Architectural Search**](./feature.md#7-sub-millisecond-architectural-search)
  *Blazing-fast exact search engine that queries your architecture directly.*
- [**8. Interactive Knowledge Exploration**](./feature.md#8-interactive-knowledge-exploration)
  *Lets the AI browse the knowledge graph by following wiki-links organically.*

### Architectural Memory & Structure
- [**9. Layered Architectural Memory**](./feature.md#9-layered-architectural-memory)
  *Memory split into Role/Interface/Wiring for precise context injection.*
- [**10. Failed Approaches Memory**](./feature.md#10-failed-approaches-memory)
  *Remembers why past attempts failed so AI never repeats mistakes.*
- [**11. Abstract Pattern Storage**](./feature.md#11-abstract-pattern-storage)
  *Stores high-level theory (e.g. 'Event Sourcing') as standalone concepts.*
- [**12. Knowledge Base Export**](./feature.md#12-knowledge-base-export)
  *Generates `ARCH_SPEC.md`, a massive document containing the entire architecture.*

### Safety, Governance & Traceability
- [**13. Blast-Radius Propagation**](./feature.md#13-blast-radius-propagation)
  *Automatically flags downstream dependents to prevent hidden regressions.*
- [**14. Outbound Dependency Analysis**](./feature.md#14-outbound-dependency-analysis)
  *Shows everything a specific file relies on before you start coding.*
- [**15. Active Guardrails (Policy as Code)**](./feature.md#15-active-guardrails-policy-as-code)
  *Hardblocks the AI from violating `mustNotImport` or `mustNotBeCalledBy` rules.*
- [**16. Pre-Flight Safety Checks**](./feature.md#16-pre-flight-safety-checks)
  *Forces the AI to read downstream dependents *before* touching code.*
- [**17. Automated Quality Scoring**](./feature.md#17-automated-quality-scoring)
  *AI grades its own documentation (0.0 to 1.0) on freshness and contradiction.*
- [**18. Human-in-the-Loop Quality Review**](./feature.md#18-human-in-the-loop-quality-review)
  *Permanently boost an entity's Quality Score to 1.0 by marking it Human Reviewed.*
- [**19. Evidence Drift Detection**](./feature.md#19-evidence-drift-detection)
  *Detects if source files changed or were deleted, leaving stale documentation.*
- [**20. Structural Graph Linting**](./feature.md#20-structural-graph-linting)
  *Scans for anti-patterns like cyclical dependencies and orphaned entities.*
- [**21. Stale Knowledge Healing**](./feature.md#21-stale-knowledge-healing)
  *Clears blast-radius warnings locally without forcing a full re-ingestion.*
- [**22. Time-Travel Evolution Tracking**](./feature.md#22-time-travel-evolution-tracking)
  *Reconstructs the architectural history of any file across git commits.*
- [**23. Historical Index Replay**](./feature.md#23-historical-index-replay)
  *Rewind time to view the entire knowledge index at a specific past commit.*
- [**24. Architectural Event Logging**](./feature.md#24-architectural-event-logging)
  *A central ledger of every architectural shift and structural warning.*
- [**25. Git Pre-Commit Guardrails**](./feature.md#25-git-pre-commit-guardrails)
  *A hook that reminds developers to run a sync before they push breaking changes.*

### Visualization & Onboarding
- [**26. Live Interactive Visualizer**](./feature.md#26-live-interactive-visualizer)
  *A local web server rendering a force-directed layout of your entire architecture.*
- [**27. Automated Dependency Graphing**](./feature.md#27-automated-dependency-graphing)
  *Exports Mermaid diagrams directly to the terminal or markdown files.*
- [**28. Tailored Architectural Onboarding**](./feature.md#28-tailored-architectural-onboarding)
  *Generates personalized 5-minute codebase tours using PageRank math.*

### Economics & Token Optimization
- [**29. Token-Bounded Context Packs**](./feature.md#29-token-bounded-context-packs)
  *Packs context into strict token limits using graph centrality algorithms.*
- [**30. API Cost Estimation & Projections**](./feature.md#30-api-cost-estimation--projections)
  *Estimates ingestion costs without hitting APIs and prints weekly ROI.*
- [**31. Tokenized Reference Hashing**](./feature.md#31-tokenized-reference-hashing)
  *Dynamically replaces repetitive text with hashes to save massive API tokens.*
- [**32. Telegraphic Brevity Engine**](./feature.md#32-telegraphic-brevity-engine)
  *Actively strips conversational fluff from AI responses over the wire.*
- [**33. Markdown Compression Engine**](./feature.md#33-markdown-compression-engine)
  *Standalone engine that physically compresses `.knowledge/` markdown files on disk.*
- [**34. Token & Cost Savings Ledger**](./feature.md#34-token--cost-savings-ledger)
  *A live financial dashboard showing exactly how much Cortex has saved you.*

---
*Built incrementally to solve the hardest problem in Agentic AI: **Maintained Architectural Context**.*
