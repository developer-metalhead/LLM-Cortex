# Integration Scratch — nexus-os
**Date**: 2026-05-23  
**Target**: C:\Users\kumsatwi\Desktop\StEp\personalProject\connect4private\nexus-os

---

## To paste into flaws.md

### Flaw #116 — CORS wildcard in API server
**Severity**: medium  
**Description**: `allow_origins=["*"]` in FastAPI/any HTTP server that processes code context is a SSRF/data-exfiltration enabler — any origin can make cross-site requests against the local API. Cortex's Phase 22 central server must use an explicit origin allowlist.  
**Source-of-lesson**: nexus-os/api/main.py:25

---

## To paste into implementation_plan.md

### Phase 8.1 Refinement — Safe WebSocket ConnectionManager with Stale-Connection Pruning
When implementing Phase 8.1 (Live Graph Stream WebSocket), adopt the ConnectionManager broadcast pattern from nexus-os:
```python
async def broadcast(self, message: dict):
    for connection in list(self.active_connections):  # iterate a COPY
        try:
            await connection.send_json(message)
        except Exception:
            self.active_connections.remove(connection)  # prune stale
```
This prevents RuntimeError on list mutation during async iteration. The list-copy pattern is critical for any long-lived WebSocket pool.  
**Source**: nexus-os/api/main.py:32 — `ConnectionManager`

---

### Phase 8.1 Refinement — Dual-Endpoint WebSocket Design (Fast Lane + Event Stream)
Consider two separate WebSocket endpoints in Phase 8.1:
- `/ws/graph` — event-stream for graph state changes (low frequency, goes through processing pipeline)
- `/ws/stream` — fast lane for high-frequency streaming output (bypasses bus overhead, direct broadcast)

This separation prevents high-frequency synthesis streaming from starving graph-update events.  
**Source**: nexus-os/api/main.py:170 — `ghost_bridge_socket()` vs `websocket_endpoint()`

---

### Phase 0.11 Refinement — Real Usage Analytics via Claude Code Session Logs
The existing Phase 0.11 "honest benchmarks" approach uses a `worked/` corpus. A more direct approach: read Claude Code's actual session logs from `~/.claude/projects/*/*.jsonl` to get real per-model, per-project, per-day token usage.

Adopt `usage-report.py` pattern:
```python
projects_dir = Path.home() / ".claude" / "projects"
files = list(projects_dir.glob("*/*.jsonl"))
for rec in iter_jsonl(files):
    msg = rec.get("message") or {}
    usage = msg.get("usage")  # real token counts, not theoretical baseline
    model = msg.get("model")
    cwd = rec.get("cwd")
```

This directly contradicts the "147.9k tokens saved" synthetic baseline (flaw #6) by giving the user their actual spend and cache hit rate.  
**Score**: 60 (closes flaws #6 and #7)  
**Source**: nexus-os/scratch/usage-limit-reducer/scripts/usage-report.py:82

Paste-ready as a `cortex usage` CLI command (Phase 29 FinOps building block). Key output:
- Total input/output tokens by model
- Cache hit % (healthy = >60%)
- Estimated API cost (API list prices, subscription is flat — note in output)
- Per-project breakdown
- Per-day trend

---

### Phase 43.1 Refinement — Correlation ID Threading for Tool Call Audit Trail
When implementing Phase 43.1 (Persistent Agent Messaging Substrate), adopt `EventEnvelope.correlation_id` as the primary mechanism for audit trail on mutating tool calls (closes flaw #47).

Schema:
```python
class EventEnvelope(BaseModel):
    event_id: str  # UUID, unique per event
    correlation_id: Optional[str]  # links response back to originating request
    source: str   # @Human, @Claude, @Cortex
    target: Optional[str]
    type: EventType  # typed enum
    payload: Dict[str, Any]
```

Every `save_concept`, `configure_brevity`, `compress` call should carry a correlation_id derived from the originating MCP request's request-id. The `experience.jsonl` audit trail entry (Stage 4 fix) becomes: `{ event_id, correlation_id, tool, args, caller, timestamp }`.  
**Source**: nexus-os/api/schemas.py:21 — `EventEnvelope.correlation_id`

---

### Phase 46 / Phase 14 Fix — Session-Scoped JSONL Event Sourcing (Closes Flaw #14)
`log_query` is broken because `log.jsonl` entries use a schema the reader doesn't match. nexus-os demonstrates a more robust pattern: per-session files (`events_<session_id>.jsonl`) with typed EventEnvelope entries.

Recommendation for fixing flaw #14: adopt session-scoped log files with typed event schemas. The reader must be written for the exact schema the writer produces — no mismatch possible.

```python
def _persist_event(self, event: EventEnvelope):
    filename = f"events_{event.session_id}.jsonl"
    filepath = os.path.join(self.persistence_dir, filename)
    with open(filepath, "a", encoding="utf-8") as f:
        f.write(json.dumps(event.dict()) + "\n")
```

**Source**: nexus-os/api/bus.py:52 — `_persist_event()`
