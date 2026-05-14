# Project Cortex

> **The Autonomous Brain for your Codebase.**

Project Cortex is an active knowledge engine designed to eliminate the "context amnesia" inherent in modern AI development. While traditional AI agents rediscover your codebase from scratch every time you ask a question, Cortex runs in the background, continuously "compiling" your source code into a persistent, synthesized, and interlinked knowledge graph.

## The Problem
Most AI coding workflows rely on **RAG (Retrieval-Augmented Generation)**. You ask a question, the AI scans raw files, grabs chunks, and guesses the answer. Tomorrow, it does the exact same work again. Nothing is saved. Nothing compounds. There is no architectural memory.

## The Solution: Compiled Context
Cortex replaces passive searching with **active synthesis**. It functions as a background daemon that watches your file system. When you save a file, Cortex:
1.  **Extracts**: Identifies new concepts, logic flows, and architectural changes.
2.  **Integrates**: Updates existing knowledge pages and creates new ones.
3.  **Links**: Builds synapses (cross-references) between related modules.
4.  **Audit**: Flags contradictions where new code deviates from established architectural patterns.

---

## Architecture
Cortex operates on a three-layer architecture designed for transparency and machine-readability.

### Layer 1: Raw Sources (Immutable)
Your actual source code. Cortex reads this layer but never modifies it. It serves as the ground truth.

### Layer 2: The knowledge (Synthesized)
A structured directory of LLM-generated Markdown files. This is the "Brain" of the project. It includes:
*   **Concept Pages**: High-level explanations of system components.
*   **Relationship Maps**: Visualizable links between files and logic.
*   **The Log**: A chronological record of architectural evolution.
*   **Contradiction Flags**: Critical alerts when code and knowledge diverge.

### Layer 3: The Schema (Logic)
The configuration engine that dictates how Cortex maintains the knowledge. It defines the ingest workflows, linting rules, and formatting standards.

---

## Key Features

*   **Autonomous Ingestion**: Triggered by file-system events (saves/commits). No manual "ingest" commands required.
*   **Human-Readable**: Stored as plain Markdown. Open the `.knowledge` folder in any editor (or Obsidian for a 3D graph view) to read your system's "mental model."
*   **Agent-Native (MCP)**: Exposes the compiled knowledge natively via the **Model Context Protocol**. Any AI agent (Antigravity, Claude Code, Cursor) can query Cortex to get instant, high-level architectural context without scanning the whole repo.
*   **Conflict Detection**: Automatically identifies when new code conflicts with existing documentation or architectural laws.

## Getting Started

```bash
# Install the Cortex Daemon
npm install -g project-cortex

# Initialize Cortex in your repository
cortex init

# Start the background watcher
cortex watch
```

---

## Vision
Cortex aims to be the "Senior Staff Engineer" that never sleeps—the one who maintains the documentation, understands every dependency, and ensures that every AI agent you bring onto the project is instantly up to speed.
