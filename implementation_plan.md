# Project Cortex: Product Blueprint & Implementation Plan

This document serves as the definitive blueprint and systematic, phase-by-phase approach to building Project Cortex. Each phase represents a small, implementable chunk designed to incrementally build the Autonomous Knowledge Engine from the ground up.

---

## 🏗️ Phase 1: Ingestion & Monitoring Foundation (The Eyes)

**Layman's Terms**
Setting up a background "watchdog" that constantly monitors your project folder. Every time you save a file, it notices exactly what lines of code you changed.

**Technical Terms**
Implement a robust, debounced file-system watcher using `chokidar`. Develop a diffing mechanism to extract precise Git diffs or file delta contents, ensuring we only capture meaningful changes while strictly ignoring noise (like `node_modules` or `.git`).

**Architecture & System Design**
- **Core Components**: `src/core/watcher.ts`, `src/core/diff.ts`
- **Design Pattern**: Event Emitter / Observer Pattern. The watcher will emit standard internal events (`FILE_CHANGED`, `FILE_DELETED`) containing the filepath and the specific text diff.
- **Key Considerations**: Debouncing is critical here (e.g., 3-5 seconds) to prevent overwhelming the system when a user hits `Cmd+S` multiple times rapidly.

**Definition of Ready (DoR)**
- Repository is initialized with TypeScript and basic scaffolding.
- Target directory to watch is defined via CLI or config.

**Definition of Done (DoD)**
- Watcher correctly identifies `add`, `change`, and `unlink` events.
- Debouncing works correctly (rapid saves trigger only one diff extraction).
- Git diffs are successfully extracted and logged to the console.

**Pros & Cons**
- ✅ **Pros**: Extremely lightweight; forms the rock-solid foundation required for all downstream processing.
- ❌ **Cons**: At this stage, the system only sees raw text changes and has zero semantic understanding of what the code actually does.

---

## 🧠 Phase 2: LLM Synthesis Engine (The Brain)

**Layman's Terms**
Connecting an AI to the watchdog. When the watchdog sees a code change, it hands it to the AI. The AI analyzes the change and summarizes the "why" and "what" in structured, plain English.

**Technical Terms**
Integrate the Vercel AI SDK (`@ai-sdk/core`, `@ai-sdk/openai`). Design strict system prompts for the "Librarian" persona. Utilize `zod` to enforce `generateObject` calls, ensuring the LLM responds purely in structured JSON (e.g., extracting updated concepts, new files, and identifying architectural contradictions).

**Architecture & System Design**
- **Core Components**: `src/llm/client.ts`, `src/llm/prompts.ts`
- **Design Pattern**: Adapter / Strategy Pattern (allowing us to easily swap between OpenAI, Anthropic, or local Ollama models in the future).
- **Key Considerations**: Error handling for LLM timeouts, token limits, or hallucinated JSON formats.

**Definition of Ready (DoR)**
- Phase 1 (Watcher) is complete and reliably emitting diffs.
- API keys (OpenAI/Anthropic) are secured and accessible via environment variables.

**Definition of Done (DoD)**
- The system successfully sends diffs to the LLM using the Vercel AI SDK.
- The LLM responds strictly according to the defined `zod` JSON schema.
- Retries and timeout fallbacks are implemented.

**Pros & Cons**
- ✅ **Pros**: Transforms raw, chaotic code changes into highly valuable, semantic architectural insights.
- ❌ **Cons**: Introduces network latency and API costs. Prompt engineering must be precise to avoid generating "fluff" documentation.

---

## 💾 Phase 3: Knowledge Storage & Cost Control (The Memory)

**Layman's Terms**
Taking the AI's brilliant insights and neatly organizing them into a permanent `.knowledge` folder. To save you money, we're adding a "Manual Sync" mode—the AI only thinks when you type `cortex-sync`.

**Technical Terms**
Implement a dual-mode ingestion pipeline (Auto/Manual). In Manual mode, file diffs are buffered in an in-memory queue. Upon receiving the `cortex-sync` command via `stdin`, the system batches these diffs into a single LLM request. The resulting structured JSON is then serialized into Markdown files with Obsidian-style bidirectional links (`[[Concept]]`).

**Architecture & System Design**
- **Core Components**: `src/knowledge/writer.ts`, `src/index.ts` (Sync logic).
- **Design Pattern**: Command Pattern for the sync trigger; Batch Processing for LLM calls.
- **Key Considerations**: 
    - **Cost Efficiency**: Batching multiple file changes into a single prompt significantly reduces token overhead.
    - **File Integrity**: Ensure atomic writes to `index.md` to prevent corruption during heavy ingestion.

**Definition of Ready (DoR)**
- Phase 2 (LLM Client) is integrated and supports synthesis.
- `INGESTION_MODE` is configurable via `.env`.

**Definition of Done (DoD)**
- Markdown files are correctly generated in the `.knowledge` folder.
- `cortex-sync` successfully triggers a batch synthesis of all queued changes.
- The MCP server successfully serves the content of these real files (replacing mock strings).

**Pros & Cons**
- ✅ **Pros**: Gives the user total control over API billing. Persists knowledge in a human-readable, searchable wiki.
- ❌ **Cons**: Manual mode requires the user to remember to sync their changes.

---

## 🔌 Phase 4: MCP Server Integration (The Mouth)

**Layman's Terms**
Exposing our automated Wikipedia so that other AI tools (like Cursor or Claude Code) can plug in and read it instantly, giving them full context of your project without you having to explain it.

**Technical Terms**
Implement the Model Context Protocol (MCP) using `@modelcontextprotocol/sdk`. Stand up a local STDIO or HTTP server that exposes specific tools (`read_architecture`, `get_concept`, `list_warnings`) to external AI clients.

**Architecture & System Design**
- **Core Components**: `src/mcp/server.ts`, `src/mcp/tools.ts`
- **Design Pattern**: RPC (Remote Procedure Call) Server pattern.
- **Key Considerations**: Mapping the Markdown folder structure into clean, easily digestible text streams for external agents to consume efficiently.

**Definition of Ready (DoR)**
- Phase 3 is complete, and the `.knowledge` folder contains structured, predictable Markdown.

**Definition of Done (DoD)**
- An external client (e.g., Claude Desktop or MCP Inspector) can successfully connect to the Cortex MCP server.
- The `read_architecture` and `get_concept` tools successfully return the correct content from `.knowledge`.
- Server handles disconnects and query errors gracefully.

**Pros & Cons**
- ✅ **Pros**: Solves the core "lost context" problem for AI coding assistants. Massively boosts the capabilities of any connected agent.
- ❌ **Cons**: Requires the user to manually configure their external IDE/Agent to point to the Cortex MCP server.

---

## ⚙️ Phase 5: CLI Polish & Daemonization (The Operations)

**Layman's Terms**
Wrapping everything up into a sleek command-line tool so you can simply type `cortex start` and let it run quietly in the background.

**Technical Terms**
Finalize the `commander` implementation. Add commands for `init` (bootstrapping `.knowledge`), `start` (running the watcher), and `status`. Investigate basic daemonization or recommend running via `pm2`/`tmux` for persistent background execution.

**Architecture & System Design**
- **Core Components**: `src/cli/index.ts`, `bin/cortex.js`
- **Design Pattern**: Command Pattern.
- **Key Considerations**: Ensuring graceful shutdown handlers (`SIGINT`, `SIGTERM`) so the watcher cleans up and any pending LLM writes finish before the process exits.

**Definition of Ready (DoR)**
- All prior phases (1-4) are fully functional and integrated.

**Definition of Done (DoD)**
- `cortex init` successfully scaffolds a project.
- `cortex start` successfully launches the watcher and MCP server together.
- Process gracefully exits on `SIGINT` without corrupting files.
- NPM package is structured properly for global execution (`npm link` / `npx`).

**Pros & Cons**
- ✅ **Pros**: Provides a professional, polished Developer Experience (DX).
- ❌ **Cons**: True background daemonization across different OS (Windows/Mac/Linux) can introduce environment-specific bugs.

---

## 🛡️ Product Viability & Production Readiness

To elevate Project Cortex from a prototype to a **Viable Product**, the following cross-cutting concerns are established as global requirements:

1.  **Testing Strategy**
    *   **Unit Tests**: Core utilities (diff extraction, JSON parsing, Markdown writing) must be isolated and tested.
    *   **Integration Tests**: Test the Watcher -> LLM -> Writer pipeline using mocked LLM responses.
    *   **End-to-End (E2E)**: Simulate file saves in a mock repository and verify the resulting `.knowledge` outputs.

2.  **Telemetry, Logging, and Observability**
    *   Transition from `console.log` to a structured logger (e.g., `pino` or `winston`) in Phase 5.
    *   Implement clear log levels: `DEBUG` (diff contents), `INFO` (file changes), `WARN` (LLM retries), `ERROR` (write failures).
    *   Write logs to a local file (`cortex.log`) so the daemon's health can be monitored when running in the background.

3.  **Security & Secrets Management**
    *   API Keys must never be logged.
    *   Support loading keys from a global `~/.cortexrc` or project-local `.env`.
    *   `cortex init` MUST automatically add `.env` to the project's `.gitignore`.

4.  **Error Recovery & Resiliency**
    *   **LLM Outages**: If the AI API is down, the watcher should queue diffs and retry later, rather than dropping knowledge.
    *   **File Locking**: Implement a lockfile mechanism (`.knowledge/cortex.lock`) to prevent multiple `cortex` instances from running in the same directory simultaneously and corrupting the index.
