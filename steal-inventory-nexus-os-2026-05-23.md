# Steal Inventory — nexus-os
**Audited**: 2026-05-23T00:00:00Z
**Target path**: C:\Users\kumsatwi\Desktop\StEp\personalProject\connect4private\nexus-os
**Target type**: node+python hybrid (React/Vite frontend + FastAPI backend)
**Last commit**: b7776cb @ phase-4 (2026-05)
**Files scanned**: 15 source files (excluding node_modules, __pycache__)
**Relevance gate**: <50 files but agent bus + autonomous agent + AI engine are domain-relevant to Cortex — proceeded with focused audit.

## Features found (raw, pre-categorization)

| # | Feature | Source | Description | Bucket | Score |
|---|---------|--------|-------------|--------|-------|
| 1 | NexusEventBus typed pub/sub | `api/bus.py:7` — `NexusEventBus` | In-process typed event bus: subscribe(EventType, Callable), emit(EventEnvelope). Persists events per-session to JSONL. Relays USER_SIGNAL events to JSONL bridge file. | A | — |
| 2 | EventEnvelope with correlation_id | `api/schemas.py:21` — `EventEnvelope` | Pydantic typed event envelope: event_id (UUID), type (enum), timestamp, source, target, correlation_id, session_id, payload. correlation_id chains request→response across async hops. | E | 18 |
| 3 | EventType enum (13 types) | `api/schemas.py:6` — `EventType` | Typed enum: user.signal, agent.thought, agent.response, task.assigned, task.completed, ide.snapshot, system.alert, social.*, text.chunk, text.final. text.chunk/text.final support streaming output. | C | 12 |
| 4 | Session-scoped JSONL event sourcing | `api/bus.py:52` — `_persist_event()` | Each session writes `events_<session_id>.jsonl` to persistence dir. Complete event history per session; survives restarts. | E | 18 |
| 5 | JSONL file-based agent bridge | `api/bus.py:38` — `_relay_to_bridge()` | inbound.jsonl / outbound.jsonl for IDE↔backend messaging. NexusAutopilot polls inbound; main.py watches outbound via file-size polling. | B | — |
| 6 | File-size polling bridge watcher | `api/main.py:92` — `watch_outbound_bridge()` | Polls outbound.jsonl by comparing file size, seeks to last position, reads new lines. Works on any OS without inotify. | B | — |
| 7 | Permissive event enrichment | `api/main.py:104` — `watch_outbound_bridge()` | Fills missing fields (event_id, type, source, target, session_id, timestamp) on partial agent-written events before injecting into bus. Prevents schema failures from incomplete agent output. | C | 18 |
| 8 | Multi-model dispatch (Gemini + OpenAI) | `api/nexus_ai_engine.py:80` — `_call_ai_api()` | Routes to Gemini or OpenAI based on model string prefix. Graceful error on unknown provider. | A | — |
| 9 | Runtime model switching via command | `api/nexus_ai_engine.py:51` — `_handle_agent_logic()` | "use model <name>" command dynamically re-routes an agent to a different LLM at runtime and persists the choice to agent config JSON. | A | — |
| 10 | Agent persona loading from BOOTSTRAP.md | `api/nexus_ai_engine.py:120` — `_load_persona_from_bootstrap()` | Reads BOOTSTRAP.md for `ACTIVATE @<name>` marker; extracts persona line. Fallback persona if missing. Per-agent, file-driven, no server restart needed. | C | 12 |
| 11 | Project context envelope | `api/nexus_ai_engine.py:128` — `_load_project_context()` | Injects ROADMAP.md + ARCH_SPEC.md (first 1000 chars each) as system prompt context for every agent LLM call. Keeps agents grounded in project spec. | A | — |
| 12 | Ghost Bridge dual-WebSocket fast lane | `api/main.py:170` — `ghost_bridge_socket()` | /ws/ghost is a dedicated fast-lane WebSocket separate from /ws/nexus. Receives raw HTML/streaming snapshots from IDE (Antigravity), immediately broadcasts to dashboard clients with no event-bus overhead. | C | 12 |
| 13 | ConnectionManager safe broadcast + stale pruning | `api/main.py:32` — `ConnectionManager` | WebSocket pool: connect, disconnect, broadcast(). Broadcast iterates a COPY of connections list; catches stale sends and removes the dead connection. Prevents RuntimeError on mutation during iteration. | C | 24 |
| 14 | TaskNode with depends_on chain | `api/schemas.py:37` — `TaskNode` | Pydantic schema: task_id, type, description, assigned_agent, status (enum), depends_on: List[str], metadata. Enables DAG-based task dependency tracking. | A | — |
| 15 | AgentState tracking | `api/schemas.py:46` — `AgentState` | Per-agent state: agent_id, status (IDLE/active), current_task_id, last_active. Typed tracking of what each agent is doing. | A | — |
| 16 | text.chunk / text.final streaming event types | `api/schemas.py:18` — `EventType.TEXT_CHUNK/TEXT_FINAL` | Dedicated event types for streaming token output. text.chunk is incremental, text.final is the complete response. Enables client-side progressive rendering. | C | 12 |
| 17 | usage-report.py real Claude Code cost analytics | `scratch/usage-limit-reducer/scripts/usage-report.py:82` — `collect()` | Reads ~/.claude/projects/*/*.jsonl (actual Claude Code session logs). Breaks down by model/project/day. Computes real cache hit %, API cost estimates, heuristic callouts (cache too low, opus overspend). --json flag for machine-readable output. | E | 60 |
| 18 | nexus-launcher.js concurrent process launcher | `nexus-launcher.js:8` — `launch()` | Spawns backend + frontend + ghost bridge concurrently with color-coded stdout/stderr per process. Suppresses DeprecationWarnings from stderr. | D | — |
| 19 | CORS wildcard allow_origins=["*"] | `api/main.py:25` | Development convenience: all origins allowed. Unsafe for any tool that processes sensitive code. | F | — |
| 20 | useRenderBuffer RAF event buffer | `src/NexusStream.jsx:11` — `useRenderBuffer()` | requestAnimationFrame-based queue. Dequeues max N events per frame. Prevents React state thrashing on high-frequency WebSocket events. | D | — |
