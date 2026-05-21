# Implementation Plan — Refinement & Risk Analysis

> **Purpose:** Per-phase critique identifying cons not called out in the plan, hidden risks,
>   refinement suggestions, and optimization opportunities. Supplement to the existing
>   Pros & Cons sections. Does NOT reproduce what the plan already says.

---

## Phase 1: Ingestion & Monitoring Foundation

### Risks not in the plan
- **chokidar on Windows** uses `ReadDirectoryChangesW` which has well-known buffering issues
  under heavy file writes (e.g. `npm install`, `git checkout`). The 3s debounce helps but a
  burst of 1000+ events can overflow the OS buffer before chokidar drains it, silently losing
  events. No fallback polling interval is defined for this case.
- **`.gitignore` parity gap:** the watcher loads `.gitignore` via the `ignore` package, but
  this only catches patterns listed there. Nested `.gitignore` files in subdirectories are
  common but not explicitly tested.
- **No watch-limit guard:** `fs.inotify.max_user_watches` (Linux) or equivalent OS limits
  can be hit on large repos. No user-facing error or actionable message when this occurs.

### Refinements
- Add a `CORTEX_WATCH_FALLBACK_POLL_MS` config (default 0 = disabled) that auto-activates
  when the watcher detects an event burst > 100 events/sec.
- Surface a `cortex doctor` check (referenced later in Phase 5.6 but could ship a
  lighter version here) that warns on `--max-user-watches` limits.
- The diff module's `.last_sync_commit` mechanism is clean but has no guard against
  `git gc` or `git rebase` rewriting the referenced commit — will silently break.

### Optimization
- Debounce could use a trailing-edge + max-wait combination (lodash `_.debounce` with
  `maxWait`) to guarantee forward progress during sustained changes.

---

## Phase 2: LLM Synthesis Engine

### Risks not in the plan
- **`generateObject` reliability:** Vercel AI SDK's `generateObject` with Zod parsing is
  generally robust, but certain provider models (especially local/self-hosted) produce
  JSON that passes Zod validation but is semantically garbage. No semantic post-validation
  step is described (e.g., "entity names exist in the codebase").
- **Single point of provider config:** `CORTEX_PROVIDER` drives everything. If the provider
  is unreachable at sync time and the fallback chain isn't wired (Phase 33.1), the entire
  pipeline blocks. No timeout escalation strategy beyond retries.
- **CORTEX_MOCK_AI=true** is useful for testing but has no documentation on behavioral
  differences from real output — could mislead developers debugging pipeline issues.

### Refinements
- Add a semantic sanity check after Zod validation: entity names should appear in
  the provided diff's file list or be recognized codebase identifiers. Reject with a
  structured error if >50% of entity names are ungrounded.
- Wire a `provider` → `fallbackProvider` chain in the env config now (not Phase 33.1),
  even if only two providers are supported initially. The adapter pattern already
  supports it — just missing the wiring.
- Surface `CORTEX_MOCK_AI` mode in `cortex status` so developers know they're in
  simulated mode.

---

## Phase 3: Knowledge Storage & Cost Control

### Risks not in the plan
- **In-memory diff queue loss:** The manual mode buffer is an in-memory `Map`. If the
  daemon crashes between changes and `cortex sync`, all buffered diffs are lost with
  no recovery. The user's code changes are safe (on disk) but their synthesis queue
  disappears silently.
- **`index.md` regeneration cost:** On every sync, `index.md` is fully regenerated from
  disk. On a knowledge base with 200+ entities, this is an O(n) read + write pass with
  no incremental update strategy. At scale this becomes a noticeable pause.

### Refinements
- Persist the pending-diff queue to `~/.cortex/pending.jsonl` so it survives crashes.
  On daemon restart, replay any unprocessed entries.
- Consider an incremental `index.md` update (append new entity lines, remove stale ones
  by pattern match) instead of full regeneration. The current full-regenerate approach
  is simpler but won't scale past ~500 entities without latency complaints.

---

## Phase 3.1: LLM Caching Store

### Risks not in the plan
- **SHA-256 of the full prompt payload** is sensitive to whitespace/formatting changes
  that don't change semantic meaning. A newline difference in a context file produces
  a cache miss despite identical LLM output.
- **TTL of 5 minutes default** is very short for architectural synthesis, which changes
  slowly. Most LLM calls during a coding session will miss the cache because the diff
  changes each time.
- **No cross-session persistence:** ~/.cortex/cache/ is not documented as persistent
  across daemon restarts. If it's in-memory, TTL is misleading.

### Refinements
- Use a semantic hash (normalize whitespace, sort keys in JSON) rather than raw SHA-256.
- Default TTL should be 1 hour for synthesis calls, 5 minutes for lint/quality queries.
- Document the cache directory as persistent; add `cortex cache stats` to report
  hit/miss/eviction counts.

---

## Phase 4: MCP Server Integration

### Risks not in the plan
- **STDIO transport fragility:** The MCP server uses STDIO which means process lifecycle
  is tied to the client. If `cortex watch` (which embeds the server) restarts, all
  connected IDE clients lose their MCP connection silently. No reconnect logic is
  described on the client side (and most MCP clients don't auto-reconnect).
- **Tool surface drift:** The plan describes the tool surface growing organically
  (`get_cortex_status`, `get_pending_changes`, `save_synthesis`, etc.). Each new tool
  is a new attack surface and a new maintenance burden. No deprecation policy for
  old tools.

### Refinements
- Document an explicit MCP tool versioning strategy (e.g., `save_synthesis_v2` while
  `save_synthesis` is deprecated). Add a `cortex mcp --version` that returns the
  protocol version.
- For the embedded server mode (inside `cortex watch`), add a heartbeat keepalive
  that logs when clients disconnect unexpectedly so the user knows the IDE lost
  access to Cortex.

---

## Phase 4.5: Dual-Route IDE Integration

### Risks not in the plan
- **Nine IDE targets = nine moving targets.** Each IDE has its own MCP registration
  format, config file location, and update cycle. An IDE update can break the
  registration format without the Cortex project noticing until users report it.
  No automated integration tests against real IDE configs are described.
- **Antigravity auto-routing stack (Skill + GEMINI.md + AGENTS.md)** is described as
  achieving ~70-80% MCP call rate vs Claude Code's ~95%. The remaining 20-30% gap
  means a significant portion of action prompts still bypass Cortex. This is a
  reliability gap that's acknowledged but not mitigated.
- **The `UserPromptSubmit` router hook** is Claude Code-specific. Other IDEs rely on
  `/before_change` + sharpened descriptions. No automated validation that these
  alternative routes actually fire in each IDE.

### Refinements
- Add a `cortex test-route <target>` command that emits a synthetic prompt and checks
  whether the MCP tool is invoked (by examining logs). This gives users a way to
  verify their IDE integration works after setup.
- Consider a telemetry opt-in that reports which IDE targets are actively being used,
  so development effort can be prioritized toward the most-used platforms.

---

## Phase 4.6: Developer API & Client SDKs

### Risks not in the plan
- **Daemon REST API not yet stabilized,** yet Phase 6, 7, and 8 all depend on this API
  shape. The risk is that the SDK ships, users depend on it, and then the underlying
  daemon API changes — breaking all SDK consumers.
- **Agentmemory protocol emulation** creates a coupling to an external project's schema.
  If agentmemory changes their schema, Cortex must either update or admit incompatibility.

### Refinements
- Ship the SDK as an internal `@projectcortex/sdk` first (not published to NPM), iterate
  alongside the daemon API, then publish once both are stable for 2+ releases.
- Add an integration test that runs against the actual daemon REST endpoints (not mocks)
  to catch API drift before publishing.

---

## Phase 4.7: OpenAI-Compatible REST Gateway

### Risks not in the plan
- **Latency overhead (100-300ms)** is acknowledged but the compounding effect is not:
  every single IDE chat completion goes through this proxy, so a developer making 100
  requests/hour loses 10-30 seconds to proxy overhead. This will feel sluggish.
- **Context injection on every request** means even simple queries ("what's the weather?")
  trigger a knowledge graph search. No short-circuit for non-code queries.

### Refinements
- Add a fast bypass: if the incoming message has zero code-related keywords (function,
  class, import, etc.), skip the graph search and proxy directly. Saves ~200ms per
  casual query.
- Cache the context injection result per session (not per request) — the knowledge
  base doesn't change intra-session.

---

## Phase 4.8: Persona-Specific MCP Prompts

### Risks not in the plan
- **Four personas means four prompt templates to maintain.** Each requires updating
  whenever the underlying schema or knowledge structure changes. Prompt drift between
  personas is a real maintenance cost.
- **Tagging accuracy dependency:** The Security persona filters on "security-tagged
  entities" — but tagging quality depends entirely on the Librarian's accuracy. If
  an auth helper isn't tagged as security-related, the Security persona misses it.

### Refinements
- Define personas as **composable prompt fragments** rather than standalone templates.
  A base persona prompt + filter criteria + output format — reducing duplication.
- Add a `--persona auto` mode that uses the user's current task context (from the
  IDE agent's active file) to select the best persona automatically.

---

## Phase 5: CLI Polish & Daemonization

### Risks not in the plan
- **Lockfile mechanism** prevents multiple daemon instances but provides no information
  about _which_ PID holds the lock. If a stale lockfile remains after a crash, the user
  sees a generic "already running" error with no recourse beyond manual deletion.
- **`cortex init --magic`** auto-detects IDEs and writes configs. Detecting an IDE by
  directory presence is fragile (a `.vscode/` folder doesn't mean VS Code is installed;
  it could be a shared config in git).

### Refinements
- Store PID + hostname + timestamp in the lockfile. `cortex status` should read it and
  report "locked by PID 12345 since 2026-05-20". Add `cortex unlock --force` with a
  safety confirmation.
- `cortex init --magic` should validate IDE presence by checking for the actual binary,
  not just the config directory.

---

## Phase 5.6: Daemon Watchdog & Self-Healing

### Risks not in the plan
- **Watchdog-as-OS-service** is the recommended pattern but adds significant deployment
  complexity: systemd unit files, launchd plists, Windows Service registration. Each
  requires root/admin privileges. No cross-platform service installer is described.
- **10 baseline components** each emitting heartbeats every 10s = 1 heartbeat/second
  on disk I/O. On a spinning-disk or high-latency filesystem, this is non-trivial wear.
- **Restart-loop anomaly detection** (3 restarts in 5 minutes) is relatively loose.
  A genuinely faulty component can disrupt operations for up to 5 minutes before
  escalation.

### Refinements
- Provide `cortex install-service` that registers the OS-level supervisor with
  appropriate permissions, rather than just documenting it.
- Reduce heartbeat frequency for low-criticality components (e.g., embedding service,
  LSP subprocess) to 30s instead of 10s.
- Tighten the restart-loop detector to 3 restarts in 2 minutes for critical components
  (sync watcher, MCP server).

---

## Phase 5.7: Scheduled Operations & Cron Engine

### Risks not in the plan
- **Six baseline operations** are listed but most (consolidate, embed.rebuild,
  qbr.generate, dlp.scan) don't exist yet. The scheduler ships before the operations
  it schedules. This creates pressure to implement those phases just to validate the
  scheduler.
- **Time zone correctness** is called out but the default is UTC. Most developers'
  machines run in local time. If a schedule says "0 3 * * *" with timezone UTC and the
  user expects it to run at 3am local time, they'll be off by hours.

### Refinements
- Default timezone to `Intl.DateTimeFormat().resolvedOptions().timeZone` (the user's
  local timezone) rather than UTC. Document explicitly that schedules use local time
  unless overridden.
- Ship the scheduler with only 2 operations initially (health.snapshot and a no-op
  "test" operation) and register the remaining 4 as the phases they belong to are
  implemented.

---

## Phase 5.8: Multi-Operator Session Coordination

### Risks not in the plan
- **Per-workspace leadership** means a deployment with 100 workspaces has 100 independent
  leadership tracks. If one developer has 5 workspaces open, they must claim leadership
  on each. No bulk operations.
- **SSO dependency** (Phase 25) is listed as a DoR dependency. This means multi-operator
  cannot ship until enterprise SSO ships — a significant delay. The core mechanism
  (leadership heartbeat + identity) could work with simpler identity first.
- **Forced takeover** audit logging is described as "high severity" but there's no
  escalation mechanism defined (e.g., notify all operators via Phase 33.2 channels
  when a forced takeover occurs).

### Refinements
- Decouple the leadership protocol from SSO: use a simple local identity file
  (`~/.cortex/identity.yaml` with a human-readable name) for single-team deployments.
  SSO integration is an upgrade path, not a prerequisite.
- Add a `cortex session take --all-workspaces --reason "..."` for bulk takeover.
- Define an escalation rule: forced takeover → notify all active sessions immediately
  via Phase 33.2 push channel.

---

## Phase 5.9: Shell Status Prompt Integration

### Risks not in the plan
- **Shell prompt hook latency** target of <10ms relies on a cached file. The plan does
  not specify what invalidates the cache. If the daemon updates state and the cache
  is stale, the prompt shows outdated info for up to the cache TTL.
- **`cortex install-prompt`** modifies shell RC files. Users who already have custom
  prompt logic may get conflicts. No dry-run or diff mode.

### Refinements
- Invalidate the prompt-status cache by having the daemon touch a `.prompt_cache_stale`
  marker file after every synthesis. The CLI checks this marker before reading cache.
- Add `cortex install-prompt --dry-run` that prints the injection without modifying files.
- Support `cortex install-prompt --no-modify-rc` that just prints the config block for
  manual insertion.

---

## Phase 6: Active Guardrail — Constraints & Blast-Radius Analysis

### Risks not in the plan
- **LLM-driven edge detection has known false-negative risk** (called out). But the
  converse — false positives — is also a risk: the LLM may invent relationships that
  don't exist, causing `mustNotBeCalledBy` violations to fire on phantom edges.
- **Staleness noise on large refactors:** The plan mentions a "mark all reconciled"
  escape hatch but doesn't specify it. Without it, touching a foundational entity
  (e.g., `BaseModel`) can cascade `staleSince` to 50+ downstream entities, creating
  a wall of yellow flags that users learn to ignore.
- **`staleInfluence` continuous gradient** is a nice upgrade but adds a graph-traversal
  cost on every synthesis. On a 1000-node graph with depth-3 propagation, this is
  O(n^3) worst-case if not carefully bounded.

### Refinements
- Add a "stale acknowledgment" mechanism: `cortex stale acknowledge <entity>` clears
  the staleness flag without requiring re-synthesis. `cortex stale acknowledge --all`
  clears everything.
- Bound `staleInfluence` propagation to max 5 hops and max 100 reachable entities.
  Beyond that, cap at 0.0 influence and log a warning.
- Add false-positive detection: if an entity's constraint violation is rejected by
  `save_synthesis`, but the IDE agent resubmits the same synthesis with the same
  violation 3+ times, log a "possible constraint misconfiguration" warning.

---

## Phase 6.1: Template Entities

### Risks not in the plan
- **Cascade through templates** means changing one template triggers re-synthesis of
  potentially dozens of entities simultaneously. Each re-synthesis costs tokens.
  A template change could cost $5-10 in LLM calls if 50 instances need re-synthesis.
- **Template → instance inheritance** is one-way (template → instance). No mechanism
  for an instance to override inherited properties, which limits practical use.

### Refinements
- Add a `cortex template update --dry-run` that lists instances and estimates token
  cost before executing.
- Support instance-level override fields (e.g., `overrideDescription` on the
  `instantiated_from` relationship) so instances can diverge from the template
  on specific attributes while staying linked for others.

---

## Phase 6.2: Arbitrary Predicate Relationships & Triple-Store Queries

### Risks not in the plan
- **No predicate validation:** Opening `kind` from enum to string means any typo
  (`depends_on` vs `depends_on`) creates a separate relationship kind that never
  matches queries or constraint rules. No autocorrect or suggestion.
- **N-Triples export** for SPARQL ingestion is described but no import path is defined.
  Export without import is half a bridge.

### Refinements
- Maintain a registry of known predicates (auto-grown from observed usage). When a new
  string is introduced, suggest similar existing predicates via edit distance.
- Add `cortex import --format nt | turtle` to complete the round-trip.

---

## Phase 6.3: Weak Measurements

### Risks not in the plan
- **Confidence accumulation** is linear (+0.2 per application) but real confidence
  should depend on the source: a human applying a hypothesis should count more than
  an LLM auto-tagging. No source weighting.
- **Promotion at threshold** (0.8 after 5 measurements) is irreversible. If a weak
  tag is promoted and then later contradicted, there's no demotion path.

### Refinements
- Weight measurements by source: human = 2×, LLM = 1×, automated = 0.5×.
- Add a "revert promotion" command that demotes a strong tag back to a weak
  measurement with the contradictory evidence recorded.

---

## Phase 6.4: Torsion Links

### Risks not in the plan
- **Context-dependent descriptions add complexity** to the context packer for relatively
  small gain. Most entities have a single coherent role; multi-role entities are rare.
  The engineering effort (schema + packer + graph viewer) may not justify the benefit
  for most knowledge bases.
- **Approach path matching** requires the caller to know which context they're arriving
  from — something the packer doesn't natively track.

### Refinements
- Consider this a Phase 13 packer optimization rather than a Phase 6 schema feature.
  The packer already knows the query context — that's the natural place to apply
  torsion rather than in the storage layer.
- Reduce scope: implement torsion as a packer-side re-ranking step, not a new
  field in the relationship schema.

---

## Phase 6.5: Plasma Filaments

### Risks not in the plan
- **Structural edge flag is binary** but cascade importance is continuous. A flag
  that marks edges as "important" vs "not important" is less useful than a continuous
  criticality score.
- **Deletion simulation** (Phase 9) already handles cascade depth — the structural
  flag adds marginal value because impact analysis already computes the real
  blast radius.

### Refinements
- Replace the binary `structural` flag with `criticalityScore: number (0.0-1.0)`
  derived from graph centrality measures (betweenness centrality of the edge).
  This is computable, not user-assigned.
- Deprecate this sub-phase in favor of the Phase 9 impact analysis being the
  authoritative cascade tool.

---

## Phase 7: Audit & Traceability Tools

### Risks not in the plan
- **Dual-format log (markdown + JSONL)** creates a synchronization contract. If a bug
  in the writer causes one format to write and the other to fail, the logs diverge.
  The plan doesn't describe an integrity check or reconciliation mechanism.
- **Evidence content quoting** (≤500 chars, ≤10 lines) will frequently trigger
  rejections on real-world code, where the evidence justifying an entity's role is
  spread across multiple non-contiguous blocks. The Librarian will either fail to
  quote (reducing evidence quality) or produce a wall of tiny, useless quotes.
- **Secret redaction regex** listed (`(?i)(api[_-]?key|secret|password|bearer|token)`)
  will produce false positives on legitimate code (e.g., `getBearerToken()` is
  a function call, not a secret). No whitelist or context-aware filtering.

### Refinements
- Add a log integrity check: at startup, compare `log.md` line count vs `log.jsonl`
  line count. Warn if they diverge and offer a repair command (`cortex repair logs`).
- Allow evidence blocks to reference the same `sourceFile` with a max total of
  10 lines across all entries, rather than 10 lines per entry. This matches how
  real evidence works.
- Maintain a redaction allowlist: known non-secret patterns that match the regex
  but are safe (e.g., `tokenize()`, `parseToken()`, `PasswordValidator`).
  Hard-code common patterns and allow user extension.

---

## Phase 7.5: Knowledge Quality & Enterprise Governance Foundation

### Risks not in the plan
- **`quality_score` averaging** treats all dimensions equally. Age (0.3-1.0) and
  human review (0.7-1.0) have narrow ranges while contradiction score (0.0-1.0)
  has wide range. Equal weighting means contradictions dominate the score.
- **Age decay** (30 days → 1.0, 180 days → 0.3) assumes codebase velocity is
  uniform. A stable library that hasn't changed in a year may still be perfectly
  accurate. Age-based decay penalizes stability.
- **Org constraint YAML file** adds a second constraint evaluation point. If an
  entity has both a per-entity `mustNotImport` and an org-wide `mustNotImport`,
  they are evaluated independently. Conflicting rules (one allows what the other
  forbids) are not detected.

### Refinements
- Make quality score weights configurable via `CORTEX_QUALITY_WEIGHTS` as a
  JSON object. Default: equal weights. Document that contradiction_weight may
  need tuning.
- Change age decay to use "last code change affecting the entity" (via git log
  on the source file) rather than "time since synthesis." This matches actual
  freshness.
- Add a constraint conflict detector: when both per-entity and org constraints
  apply to the same entity, verify they don't conflict. Throw a structured error
  if they do, with the conflicting rule IDs.

---

## Phase 7.6: Global Architectural Lessons & Retrospective Log

### Risks not in the plan
- **Blocker extraction reliability** is the core dependency but is entirely LLM-driven.
  If the Librarian fails to extract the blocker (e.g., "node < 16") from a commit
  message, the advisory engine never fires when the blocker is resolved.
- **Environment shift monitoring** runs on every sync. Running `npm list` or reading
  `package.json` on every sync adds I/O cost. On a monorepo with 100+ packages,
  this could add 1-2 seconds to every sync.

### Refinements
- Allow manual blocker editing via `cortex lessons edit --blocker`. The advisory
  engine should be good, not perfect — manual override is essential.
- Cache `package.json` parse results and only re-read when the file's mtime changes.
  Use Node's `fs.watchFile` for this.

---

## Phase 7.7: Automated Technical Debt Register

### Risks not in the plan
- **Debt Priority Score** uses entity centrality as a factor. This biases toward
  central modules (which are already well-monitored) and away from peripheral
  but decaying modules that may be silently rotting.
- **Auto-removal** on resolution assumes the fixer runs `cortex sync` after fixing.
  If a developer fixes a lint warning but doesn't sync, the debt register still
  shows the issue. No "stale debt" detection.

### Refinements
- Weight debt priority inversely with centrality: peripheral modules need more
  attention because no one naturally looks at them. Central modules already
  get scrutiny from daily work.
- Add a "last verified" timestamp to debt items. If an item persists across 3
  syncs without changes to the related entity, mark it as "possibly resolved"
  and log a warning.

---

## Phase 7.8: Graph-Driven Review Advisories

### Risks not in the plan
- **Emergent insight generator** (LLM prompt on surprise edges) is gated by
  `CORTEX_EMERGENT_INSIGHTS=true` (default: false). But it's described as
  generating concepts and saving them. If a user enables it without realizing
  the cost, every surprise edge triggers an LLM call — potentially 50+ calls
  on a large refactor.
- **Untested hub detection** uses `*test*` or `*spec*` pattern matching on entity
  names. This misses test files with non-standard naming (e.g., `__tests__/`,
  `.tests.ts`, `check_*.py`).

### Refinements
- Add an explicit cost estimate before the emergent insight generator fires:
  "This would trigger N LLM calls at ~$X total. Enable?" (unless running in
  batch/scheduled mode).
- Make test-file patterns configurable via `CORTEX_TEST_PATTERNS` (comma-separated
  glob list). Default to common patterns; allow user override.

---

## Phase 7.9: Knowledge Garbage Collection & Archive Consolidation

### Risks not in the plan
- **Lazy resurrection** checks if a future git diff "re-introduces the entity name."
  But entity names can collide across modules. A new `SessionManager` class may
  match an archived `SessionManager` from a completely different context, causing
  incorrect context resurrection.
- **Archive append** to a single `ARCHIVE.md` file means the file grows unboundedly.
  Over years of use, this file could reach megabytes with no compaction strategy.

### Refinements
- Add a module path qualifier to resurrection matching: only auto-resurrect if
  the new entity's source file path shares at least N directory levels with the
  archived entity's source file.
- Rotate archives: `ARCHIVE_2026_Q1.md`, `ARCHIVE_2026_Q2.md`, etc. Or use a
  fixed-size rotating buffer (keep last 10MB of archive).

---

## Phase 7.10: Sensitive Data Sanitization

### Risks not in the plan
- **Regex-only detection** is insufficient for structured secrets like JWT tokens
  (three base64 segments separated by dots) or encrypted keys. Shannon entropy
  detection is mentioned but not specified — and entropy detection on code
  (which naturally has high entropy due to identifiers) generates false positives.
- **Redaction happens at ingestion time** but the raw diff was already sent to the
  LLM provider over the network. If the provider logs API requests, the secret
  has already left the building. Redaction must happen before the LLM call, not
  during evidence storage.

### Refinements
- Add pre-LLM redaction: strip secrets from the diff BEFORE sending to the LLM,
  not just from evidence content. The current design redacts during evidence
  storage which is too late.
- Use entropy + pattern matching, not regex alone. Also, maintain a local
  allowlist of known false positives (e.g., test keys like `TEST_API_KEY`).

---

## Phase 7.11: Epigenetic Memory Suppression

### Risks not in the plan
- **Fourth lifecycle concept** (suppression alongside deletion, archival, staleness)
  adds confusion. Users already have deletion (permanent), archival (cold storage),
  and staleness (flagged but visible). Suppression sits between staleness and
  archival — a distinction that's hard to explain and harder to remember.

### Refinements
- Merge suppression into archival: `cortex archive <entity>` already moves to
  cold storage. Add `--preserve-index=false` to suppress from index but keep
  in archive. This reuses an existing concept rather than adding a new one.

---

## Phase 7.12: Astronomical Parallax

### Risks not in the plan
- **Levenshtein ratio on entity descriptions** measures text change, not
  conceptual change. An entity that was rewritten to be clearer but means the
  same thing scores high shift, producing false positives.

### Refinements
- Supplement text diff with relationship diff: if the entity's `relationships[]`
  haven't changed, the conceptual shift is low regardless of text changes.
  Combine signal: `shiftScore = 0.3 * textDiff + 0.7 * relationshipDiff`.

---

## Phase 7.13: Retrocausality

### Risks not in the plan
- **Causal strength dependency** (Phase 20.14, Pearl do-calculus) is listed as
  Stable DoR. This is a research-grade phase. If Phase 20.14 is delayed or
  scoped down, Retrocausality has no causal data to work with.

### Refinements
- Define a simpler proxy for causal strength in the absence of Phase 20.14:
  co-edit frequency (two entities modified in the same commit) as a signal
  of causal relatedness.

---

## Phase 7.14: Intrinsic Redshift

### Risks not in the plan
- **Embedding search at creation time** requires Phase 18 (Architectural
  Embeddings) to be stable. This is a research-grade phase with significant
  uncertainty. Without embeddings, novelty computation has no basis.

### Refinements
- Use a simpler proxy: string overlap between the new entity's description
  and all existing entity descriptions (TF-IDF cosine similarity, no embeddings).
  It's coarser but available immediately.

---

## Phase 7.15: Verlinde Avoidance

### Risks not in the plan
- **High computational cost:** computing pairwise semantic similarity between
  all nodes within 2 hops of every entity's neighborhood is O(n * d^2) where
  d is average degree. On a 500-node graph with average degree 10, this is
  50,000 similarity computations per audit run.

### Refinements
- Add a `CORTEX_BLINDSPOT_MAX_NODES` config to cap computation. Run the
  detector once per day (via scheduler) rather than on every audit.

---

## Phase 7.16: Proteasome Atrophy

### Risks not in the plan
- **Second degradation system** alongside Phase 7.9 GC and Phase 20.22
  forgetting curves creates overlap and ambiguity. Three mechanisms all
  reduce entity visibility/quality over time, each with different rules.
  Users will not understand which one applies when.

### Refinements
- Merge atrophy into Phase 20.22 (Forgetting Curves). The ubiquitin tag
  mechanism can be the SM-2 implementation, not a separate concept.
  Reduces conceptual surface area.

---

## Phase 7.17: Keystone Index

### Risks not in the plan
- **Entity complexity** is approximated as `description length (chars) + relationship
  count + edge complexity`. Description length is a poor proxy for complexity
  — a 200-character description of a complex algorithm is not simpler than a
  500-character description of a simple config file.

### Refinements
- Replace the hand-crafted complexity formula with cyclomatic complexity
  of the entity's source file (if available) or fall back to a simpler
  size metric (lines of code in the source file, from `fs.stat`). The
  current formula is too noisy to be trustworthy.

---

## Phase 7.18: Regulatory Suppression

### Risks not in the plan
- **Sixty-minute suppression cool-down** means a genuine new alert on the
  same entity set is silenced for an hour. If the root cause is fixed
  but a secondary issue remains, the second issue won't alert until the
  cooldown expires.

### Refinements
- Shorten default cool-down to 15 minutes. Make it configurable.

---

## Phase 7.19: Synaptic Tagging

### Risks not in the plan
- **48-hour window** is hardcoded as the default. On a fast-moving codebase
  with daily commits, 48 hours of related entities is very noisy. On a
  slow-moving codebase, 48 hours may capture nothing.

### Refinements
- Make the window relative to the codebase's commit frequency: `CORTEX_TAG_WINDOW_COMMITS`
  (default 20 commits back) rather than a fixed time window.

---

## Phase 8: Visual & Browseable Knowledge Graph

### Risks not in the plan
- **Cytoscape/D3 bundle in `cortex serve`** adds ~500KB to the install footprint.
  The plan says "all assets bundled" but doesn't specify the size budget.
  For a CLI tool, shipping a frontend framework is a notable weight increase.
- **Mermaid output** for PR descriptions is useful but Mermaid rendering in
  GitHub has known limitations: graphs over 50 nodes or with complex edge
  labels frequently fail to render or produce unreadable layouts.

### Refinements
- Size-budget the web UI at <200KB gzipped. Use a lightweight canvas library
  (e.g., PixiJS for graph rendering) rather than a full DOM-based framework.
- Add `cortex graph --format png` or `--format svg` that uses headless
  Mermaid rendering to produce a shareable image, bypassing GitHub's
  Mermaid renderer limitations.

---

## Phase 8.1: Live Graph Stream (WebSocket)

### Risks not in the plan
- **WebSocket + file watcher** means two persistent connections on every
  `cortex serve` session. If the serve process restarts, WebSocket clients
  don't reconnect. No reconnection logic in the frontend is described.

### Refinements
- Add automatic WebSocket reconnection in the browser client with
  exponential backoff (1s, 2s, 4s, max 30s).

---

## Phase 8.2: Obsidian Wiki Compliance & Presets

### Risks not in the plan
- **`.obsidian/` config scaffolding** generates gitignored files, but the
  `.obsidian/graph.json` format is not stable across Obsidian versions.
  An Obsidian update could change the config schema, rendering the
  generated preset ineffective.

### Refinements
- Version-lock the generated `.obsidian/` configs to specific Obsidian
  releases in documentation. Add `cortex setup --obsidian-version <ver>`.
- Better yet, provide the color coding as a CSS snippet that users can
  import, which is more stable than `graph.json`.

---

## Phase 8.3: GPU-Accelerated Graph Rendering

### Risks not in the plan
- **Three.js/WebGL bundle** for a CLI tool's optional web UI is a significant
  dependency (700KB+ minified). For a tool whose core value is backend
  architectural synthesis, shipping a GPU renderer is disproportionate.
- **300-entity threshold** for fallback is arbitrary. A 250-entity graph can
  also lag on CPU rendering depending on edge density.

### Refinements
- Make GPU rendering a separate npm optional dependency
  (`@projectcortex/gpu-renderer`) so users who don't need it don't
  download megabytes of WebGL code.
- Use edge count rather than node count as the threshold (1000 edges is
  a better switch point than 300 nodes).

---

## Phase 8.4: Hyperbolic Graph Layout (Poincaré Disk)

### Risks not in the plan
- **Phase 18 dependency** means this phase cannot ship until the research-grade
  embedding pipeline exists. This is a blocking dependency on an uncertain timeline.
- **Möbius transformation** on every pan/zoom is described as "server-side."
  Server-side layout computation for every interaction means network round-trip
  on every view change — this will feel sluggish compared to client-side layout.

### Refinements
- Move the layout computation to the client (WebAssembly or JS) for sub-16ms
  response. Server-side transform should be a fallback for large graphs.
- Consider shipping this as a Phase 18 sub-phase rather than a Phase 8 sub-phase,
  since it's entirely dependent on Phase 18 data.

---

## Phase 9: Refactoring Impact Preview

### Risks not in the plan
- **Lazy inverse-index construction** (traversing all `links[]` on every query)
  is described as "microseconds for graphs under ~1000 entities." This is true
  for forward traversal but reverse traversal requires scanning every entity's
  `links[]` = O(n * d) where n=entities, d=average link count. At 1000 entities
  with avg 10 links, that's 10,000 checks — still fast, but "microseconds" is
  optimistic.
- **Hypothetical delete mode** depends on the `quoted reason` from each
  dependent's description. If the Librarian didn't quote the reason at
  synthesis time, the hypothetical report is empty or generic.

### Refinements
- Benchmark the traversal and document the actual performance profile.
  Publish the threshold beyond which an inverse index in `state.json`
  becomes necessary.
- For hypothetical delete, fall back to extracting the first sentence
  of the dependent's `## Wiring` section if no specific reason was quoted.

---

## Phase 9.1: Dependency Path Querying

### Risks not in the plan
- **Shortest path via BFS** finds the shortest graph path, not the shortest
  _semantic_ path. Two entities may be connected through a tenuous intermediate
  that the user doesn't care about.

### Refinements
- Add `--weighted` mode that uses edge kind to weight paths:
  `depends_on = 1`, `called_by = 2`, `contradicts = 10` (less likely to
  be a meaningful dependency path).
- Show all paths up to depth N, not just the shortest one. The user
  may want to see multiple connection mechanisms.

---

## Phase 9.2: Torstone Inertia

### Risks not in the plan
- **Leiden community dependency** (Phase 13.2) means inertia cannot be
  computed until community detection exists. Community detection is
  described later in the plan and has its own timeline.
- **Formula weights** (0.4 density + 0.35 cyclicDepth + 0.25 communitySpan)
  are arbitrary. No empirical basis or calibration methodology is described.

### Refinements
- Provide a `cortex audit --calibrate-inertia` that runs the formula on
  the current graph and shows the score distribution, so the team can
  adjust weights based on observed scores.
- Default to `inertiaScore = density` alone until Phase 13.2 community
  detection ships. The other terms add marginal value and block the feature.

---

## Phase 9.3: Hyrum's Law — Implicit Dependency Detection

### Risks not in the plan
- **Temporal log dependency** (Phase 20.12) means implicit deps cannot be
  detected until temporal data exists. Without temporal data, quality-drop
  correlation has no basis.
- **`P(qualityDrop | upstreamChange) > 0.6`** requires enough observations
  to compute a statistically significant probability. With fewer than 10
  observations per entity (typical for a young knowledge base), the
  probability estimate is meaningless.

### Refinements
- Start with a simpler heuristic: entities that always appear together in
  the same commits (high co-occurrence in git log) are implicitly coupled.
  This is available immediately without temporal graph infrastructure.
- Require minimum 5 observations before computing the probability. Below
  that, use the co-occurrence heuristic.

---

## Phase 10: Onboarding & Guided Reading

### Risks not in the plan
- **PageRank over the typed-edge graph** can be skewed by the Librarian's
  linking behavior. If the Librarian over-links a utility entity (e.g.,
  `Logger` appears in every entity's `links[]`), Logger gets inflated
  centrality and tops the onboarding reading list — despite being trivial.
- **Estimated reading time** formula (150 words/min + 30s per link follow)
  assumes linear reading. In practice, developers jump between links
  non-linearly. The estimate will always be wrong and may undermine
  trust in the reading path.

### Refinements
- Add a "boringness" filter: entities whose description length > 2× their
  source file complexity (or that are referenced by >80% of entities) are
  demoted in the reading path. They're infrastructure, not architecture.
- Remove the time estimate (or demote it to secondary). The reading order
  is the valuable output; the timer adds noise.

---

## Phase 10.1: Spherification

### Risks not in the plan
- **Sphere as a new entity type** adds complexity to the entity model for a visualization convenience. Every downstream consumer (packer, linter, impact analysis, MCP tools) must now handle `type: "sphere"` specially.
- **Context packer's atomicity rule** ("all or nothing") is problematic: a sphere containing 12 entities would consume the entire token budget by itself, blocking other relevant entities.

### Refinements
- Model spheres as a viewer-only concept (tags saved in a sidecar file), not a first-class entity type. The graph viewer reads the sidecar and renders clusters; the packer and linter never see sphere entities.
- Add `sphereMode: "split"` that lets the packer include individual sphere members if the full sphere doesn't fit the budget.

---

## Phase 10.2: Smart Rule File Patching

### Risks not in the plan
- **Target files vary by IDE.** `.cursorrules`, `.windsurfrules`, `.copilotinstructions` all use different comment syntaxes (HTML, YAML, TOML). A single marker-based injection (`<!-- cortex-begin -->`) may not be valid in all formats.

### Refinements
- Maintain a per-target-format comment-syntax map. For YAML-based rule files, use `# cortex-begin` / `# cortex-end`. For TOML, use `#`. Only HTML/markdown formats use `<!-- -->`.

---

## Phase 10.3: Zero-Token Startup

### Risks not in the plan
- **Adding `.knowledge/` to `.claudeignore`** is redundant if already in `.gitignore`. More importantly, if a user has manually configured an ignore file to include `.knowledge/` (wanting the AI to read it), the scaffolder overrides their choice.

### Refinements
- Only scaffold ignore files that don't exist. Never modify an existing `.claudeignore` or `.cursorignore` — print a hint instead.

---

## Phase 10.4: Managed CLAUDE.md

### Risks not in the plan
- **Auto-update on every sync** overwrites user customizations unless marker-fencing is used (Phase 10.2), but 10.4 doesn't specify marker fencing.

### Refinements
- Use the same marker-fence approach: `<!-- cortex-begin -->` / `<!-- cortex-end -->` blocks. Only the fenced region updates; everything outside survives.

---

## Phase 10.5: Attention-Curve Rule Reordering

### Risks not in the plan
- **Moving rules from the "attention valley"** assumes a universal attention curve across all models. Unverified.
- **Reordering hand-crafted files** breaks the developer's mental model.

### Refinements
- Apply reordering at render time (viewer-only transformation). Leave the file on disk unchanged. If persisted, show a diff first.

---

## Phase 10.6: Compaction-Safe Decision Anchoring

### Risks not in the plan
- **Decision extraction** requires structured log entries that the Librarian may not produce reliably.
- **150-250 token breadcrumbs** can become stale mid-session if a decision is reversed.

### Refinements
- Use `failedApproaches` (Phase 6) as the primary decision source.
- Invalidate breadcrumbs mid-session when `save_synthesis` touches a referenced entity.

---

## Phase 10.7: Rules File Size Guardrail

### Risks not in the plan
- **200-line threshold** is arbitrary. Larger-context models (Claude 4, GPT-5) handle bigger files fine.
- **Auto-splitting** into `.cortex/rules/` assumes the agent follows reference hooks — many don't.

### Refinements
- Make threshold configurable via `CORTEX_RULES_MAX_LINES`.
- Pre-load split rule files into the context pack rather than relying on agent follow-through.

---

## Phase 11: Monorepo Federation

### Risks not in the plan
- **Cross-workspace `[[WikiLink]]` resolution** has no tiebreaker when two workspaces have same-named entities.
- **Per-workspace `.knowledge/`** drifts independently. Cross-cutting concerns get described differently in each.

### Refinements
- Add `cortex federation audit` to find same-named entities across workspaces and flag divergent descriptions.
- When link prefix is omitted, search all workspaces and return a disambiguation prompt.

---

## Phase 12: Git & CI Integration

### Risks not in the plan
- **GitHub Action fails without CI LLM key.** Fallback to stateless diff-mode provides dramatically less value.
- **PR comment spam risk** on failed updates (GitHub API rate limits).

### Refinements
- Make the CI key optional with clear fallback messaging.
- Use a transaction ID for PR comment updates so failures don't leave stale comments.

---

## Phases 12.x (CI Sub-phases)

### Risks not in the plan
- **13 sub-phases under one umbrella** with significant overlap. Minifier (12.5) and shims (12.6) both intercept command output — should be one module.
- **Pre-commit guardrail (12.2)** must stay LLM-free. Embedding-dependent checks (Phase 18+) would make it too slow.

### Refinements
- Merge 12.4-12.6 into a single "Command Interception & Minification" module.
- Keep pre-commit hook purely graph-integrity checks. Full audits run in CI.
- Require explicit `cortex install-shims` for PATH manipulation.

---

## Phase 13: Token Economics & Context Packs

### Risks not in the plan
- **Token estimation error (±30%)** will cause false CI failures if used with strict budgets.
- **`§ref:§` placeholders** confuse agents that don't understand them.
- **Self-containment** fails small budgets: most links are footnoted, pack is mostly footnotes.

### Refinements
- Define ±20% error margin for cost estimates.
- Use human-readable truncated text `[...see "AuthMiddleware" above]` instead of `§ref:§`.
- Collapse omitted links into a single "Related entities omitted" section at pack end.

---

## Phase 13.1-13.4: Token Savings & Analytics

### Risks not in the plan
- **Projections use static multiplier.** Wrong for every team.

### Refinements
- Compute from observed sync history. Show "insufficient data" if <2 weeks.

---

## Phase 13.2: Brevity Engine

### Risks not in the plan
- **50% reduction aspirational.** Real ratio varies by content type.
- **Telegraphic mode** can strip important caveats and conditional language.

### Refinements
- Category-specific targets: `prose: 20%`, `descriptions: 40%`, `index: 60%`.
- Preservation rule: never strip clauses with "but", "however", "unless", "except".

---

## Phase 13.8: Persistent Experience & Soul

### Risks not in the plan
- **"Soul" concept has 5 types, 6 functions, 4 sub-phases.** Not lightweight.
- **Profile lifecycle absent** — outdated preferences persist when developer leaves.
- **Experience ledger append-only** grows unboundedly.

### Refinements
- Ship only profile + lens-aware re-ranking first. Defer co-occurrence graph and Nemesis feedback.
- Add `cortex profile export/import`.
- Compact at 10MB threshold (collapse entries >6 months old).

---

## Phase 13.8.2: Dynamic Co-Edit Edge Weighting

### Risks not in the plan
- **Tier 1 (60s co-save)** is noisy — opening reference files creates false pairs.
- **Transitive 2-hop inference** assumes transitivity that often doesn't hold.
- **Oja normalization** dilutes hub files' signals to near-zero.

### Refinements
- Require both files to be saved (not opened) within 120s window.
- Disable transitive inference by default (`CORTEX_TRANSITIVE_COEDIT=false`).
- Exempt hub files (>50 partners) from Oja normalization.

---

## Phase 13.8.3: Simulated Annealing

### Refinements
- Seed with 3 greedy heuristics (centrality-first, co-edit-first, diversity-first) not one.
- Document not for <10ms budgets. Keep greedy as default.

---

## Phase 13.8.4: Quantum Walk Ranking

### Refinements
- Benchmark against real `state.json` before committing. If ties <5% of entities, not worth the 4× complexity.
- Rename to "Szegedy Walk" — "quantum" is misleading.

---

## Phase 13.8.5: Contextual RAG Preprocessing

### Refinements
- Add "what NOT to do" to relevance headers: "High-centrality hub — do NOT modify unless instructed."

---

## Phase 13.8.6: Selective Retrieval Gate

### Refinements
- Fast-path: if active file has zero relationships and zero co-edit weights, skip retrieval entirely.

---

## Phase 13.8.7: Spike-Based Updates

### Refinements
- `BRANCH_SWITCH` should decay (×0.5) not reset — losing all learned signals on every switch is too aggressive.
- Start with FILE_SAVE and GIT_COMMIT only. Defer build-tool integration.

---

## Phase 13.8.8: Unified Edge Confidence

### Refinements
- Add "recency" sub-signal: edges reinforced in last N syncs get higher confidence.

---

## Phase 13.9: Grapheme-Safe Compression

### Refinements
- `Intl.Segmenter` is experimental in some Node versions. Add grapheme-safe as opt-in when available.

---

## Phase 14: Large-Diff Clustering

### Risks not in the plan
- **Leiden community detection** is the backbone for ~5 downstream phases. If Phase 14 is delayed, they all block.

### Refinements
- Ship Phase 14 early in the planned queue. Provide TF-IDF + adjacency fallback for dependents.

---

## Phase 16: Contradiction-Aware Retrieval

### Refinements
- Start with a simpler heuristic: entities that have both `depends_on` and `contradicts` edges to the same target. Catches clear-cut cases without LLM inference.

---

## Phase 17: Multi-Model Debate

### Refinements
- Gate with `CORTEX_DEBATE_BUDGET` (default 0 = disabled). Fall back to single-model confidence threshold.

---

## Phase 18: Architectural Embeddings

### Risks not in the plan
- **Most-depended-upon phase** — 10 downstream phases block on it.
- **Local model vs API** tradeoff not addressed. Local adds ~500MB install. API adds cost + latency.

### Refinements
- Ship "Phase 18 Lite": TF-IDF text + node2vec graph embeddings. Zero model dependencies. Full neural pipeline ships as Pro.
- Default to local sentence-transformers with opt-in API endpoint.

---

## Phase 19: Librarian Distillation

### Refinements
- Replace with cached-examples: store last 100 syntheses for few-shot injection. 80% of benefit at 10% of cost vs fine-tuning.

---

## Phase 20: Intelligent Architectural Advisor

### Risks not in the plan
- **30+ sub-phases** (20.1-20.30, most research-grade). This is a full roadmap within a phase.
- **Complex internal dependency graph** — sub-phases depend on each other without explicit mapping.

### Refinements
- Restructure as milestone program: 20.A Memory Systems, 20.B Retrieval, 20.C Synthesis Quality, 20.D Analysis.
- Map sub-phase dependency graph explicitly.

---

## Phases 21-70: Extended, Enterprise & Research-Grade

### General observations
- **Phases 34-48 and 60-70** shift tone from practical engineering to speculative, biologically/physically/philosophically-inspired algorithms. This shift is not acknowledged.
- **Enterprise phases (22-32)** have a prerequisite chain: SSO(25)→RBAC(26)→DLP(26.1)→Audit(26.3)→Compliance(24). Implicit; should be documented.
- **No sunset/removal policy.** The plan only adds phases.

### Refinements
- Create "Vapor Trail" appendix marking the most speculative phases (36-38, 60-70) as "inspiration, not commitment."
- Add `superseded-by: phase-X` annotation to the status legend.
- Document the enterprise prerequisite chain explicitly.

---

## Cross-Cutting Summary

### Highest-risk dependencies
1. **Phase 18 (Embeddings) blocks ~10 downstream phases.** Critical path bottleneck. Mitigate with Phase 18 Lite.
2. **Phase 6 (Constraints) has most downstream consumers** (7, 8, 9, 12, 14). Bugs cascade widely.
3. **Phase 14 (Clustering) blocks community-dependent features** across 4 phases. Ship it early.

### Most valuable but underspecified
- **Context Packs (Phase 13):** Highest-value feature for making Cortex useful outside its ecosystem.
- **Co-Edit Weighting (13.8.2):** Genuinely novel feature. ~50 lines of core logic, high ROI.
- **Onboarding (Phase 10):** Highest human-facing value.

### Most likely to be descoped
- **Soul (13.8), Quantum Walk (13.8.4), Simulated Annealing (13.8.3):** Marginal gain, significant complexity.
- **Cross-domain phases (64-70):** Inspirational, unlikely to ship in current form.
- **Exotic optimizations (34-48, 60-63):** Research-grade, thin specification.
- **GPU rendering (8.3):** Heavy dependency for marginal value.

### Token/API cost profile
- Plan is optimistic. Many phases call LLM per query, not per sync:
  - **Sync-phase costs** (synthesis, constraint check) — bounded by sync frequency
  - **Query-phase costs** (impact analysis, debate, reflexion, ToT) — unbounded, per question
- Cost gating (Phase 13.4) must apply to query-phase costs too, not just sync-phase.
