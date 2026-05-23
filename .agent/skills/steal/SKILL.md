---
name: steal
description: Use when the user wants to audit an external project (typically pasted as a folder directory path) against Cortex's implementation_plan.md and flaws.md to identify features worth stealing. Triggers on phrases like "/steal", "what can we steal from this project", "audit this project against cortex", "go through this folder and find what we're missing". Performs an exhaustive, multi-pass feature audit: walks every directory of the target project, reads source files thoroughly, categorizes findings into 7 buckets, applies negative-space analysis, steel-mans every recommendation, scores by severity × fit × inverse-effort, supports diff-mode re-audits, and produces a structured report distinguishing genuine gaps from things Cortex already has (often with a superior version).
---

# Steal — External-Project Feature Audit for Cortex

Systematic, exhaustive, **verified**, **steel-manned**, and **ranked** audit of an external project to identify features that should be incorporated into the LLM-Cortex project. Cross-references every finding against Cortex's `implementation_plan.md` (what's already planned/built) and `flaws.md` (known weaknesses that need closing).

**Prime directive**: no feature is missed, no finding is hallucinated, no recommendation is over-sold. The user will judge you on whether you found the genuinely valuable thing buried in `src/internal/util.ts:340` — not on how many surface-level findings you listed. Every claim in the final report must be backed by a verifiable file path and a line number, AND a written counter-case explaining why it might be a bad idea.

---

## Inputs

1. **Cortex baseline** (read from current working directory):
   - `implementation_plan.md` — all planned/built phases (large, ~16k lines; read systematically, do not skim)
   - `flaws.md` — known weaknesses, ordered by severity

2. **Target project directory** — pasted by the user as an absolute path. If the user has not pasted one yet, ask: *"Paste the absolute path of the project to audit."*

3. **Optional flag**: `--full` — force complete re-audit (ignore any prior inventory artifact). Default behavior is diff-mode when a prior inventory exists.

If `implementation_plan.md` or `flaws.md` are not in the current working directory, ask the user to confirm the Cortex project path. Do not proceed without both files loaded.

---

## Cortex's core principles (use as a filter)

Every finding must be evaluated against these principles before being marked "worth stealing." A feature that violates a principle goes to bucket D unless adapted.

1. **Local-first** — Cortex runs on a developer's machine by default. Features requiring server deployment go to Phase 22+ or are deferred.
2. **MCP-first** — Cortex's primary API is the Model Context Protocol. New API surfaces (REST, GraphQL) need strong justification.
3. **LLM-cost-conscious** — features that add LLM calls must justify the spend; zero-LLM alternatives are preferred.
4. **Knowledge-as-derived-data** — `.knowledge/` is regenerable; never the canonical source of architectural truth.
5. **Surface-don't-act** — Cortex flags issues; humans decide. Auto-mutation of architectural state is rejected.
6. **No third-party API for core features** — local-model fallbacks always exist.
7. **Index-first read surface** — `index.md` remains the primary read path; embeddings/search are augmentations.

A feature contradicting these is not "worth stealing" — it goes to bucket D with the violated principle cited.

---

## Workflow

Execute every step in order. Skipping a step is a defect.

### Step 0 — Prerequisites & sanity checks

Before scanning anything, verify the world:

1. **Cortex baseline files exist**:
   - Glob `implementation_plan.md` and `flaws.md` in the current working directory. If missing, ask the user where Cortex is and `cd` mentally to that directory before continuing.

2. **Target path exists and is not Cortex itself**:
   - Confirm the pasted path is a directory and is **not the same as Cortex's project root**. Auditing Cortex against itself is a defect — refuse and ask for the correct path.
   - Also reject: target is a fork of Cortex (`package.json` name matches), target IS a `.knowledge/` directory, target imports `project-cortex` as a primary dep (likely a downstream user, not a peer project).

3. **Target is git-tracked** (informational, not mandatory):
   - Check for `.git/` in the target. If present, capture: current branch, last commit SHA, last commit date. This data goes in the final report header.
   - If the target has a `CHANGELOG.md`, the most recent entries tell you what's newest — read these first.

4. **Detect target type** to guide depth:
   - Has `package.json` → Node/TS project
   - Has `pyproject.toml` / `setup.py` / `requirements.txt` → Python
   - Has `Cargo.toml` → Rust
   - Has `go.mod` → Go
   - Has `pom.xml` / `build.gradle` → Java/Kotlin
   - Has `pnpm-workspace.yaml` / `lerna.json` / `nx.json` / `turbo.json` / `Cargo.toml` workspace / `go.work` → **monorepo** — each workspace becomes its own scan unit (do not merge them)
   - Has `Dockerfile` / `docker-compose.yml` → containerized deployment details to capture
   - Has `.github/workflows/` → CI features to capture

5. **Check for prior audit (diff mode)**:
   - Glob `steal-inventory-<target-name>-*.md` and `steal-inventory-<target-name>-*.json` in Cortex's project root.
   - If found, capture the most-recent prior inventory's date AND the target's commit SHA from its header.
   - If prior SHA differs from current target HEAD, switch to **Diff Mode** (default):
     - Compute changed files: `git -C <target> diff --name-only <prior-sha> HEAD`.
     - Also include net-new files since prior SHA.
     - Scan only changed/new files in Step 2c.
     - Inherit unchanged features from the prior inventory's JSON sidecar (mark them `inherited: true` in the new sidecar).
     - The final report header must read: *"Diff audit since <prior-sha> (<prior-date>). <N> changed files scanned, <M> unchanged features inherited."*
   - If `--full` flag was passed, ignore prior inventory and run a complete audit anyway.
   - If no prior inventory exists, this is a fresh audit — proceed normally.

State to the user: *"Step 0 done — target is <type>, last commit <sha> on <branch>, <N> workspaces detected. Mode: <Full | Diff since prior-sha>. Loading Cortex baseline."*

### Step 1 — Load Cortex baseline (build the canonical reference)

Build the **complete mental index** of Cortex's current state. This step ends with two artifacts you will reference throughout the audit:

1. **Phase enumeration** — Grep `implementation_plan.md` for `^## .*Phase ` AND `^### Phase .* Refinement` AND `^### Phase .* —`. Build a flat list:
   ```
   { phaseNumber, title, status (✅ Done / ⏳ Planned / refinement), line }
   ```
   This list is the **only valid source** for "already in Cortex" claims. If a phase is not on this list, it is not in Cortex. Period.

2. **Phase deep-reads** — For phases whose titles match the target project's domain (code intelligence, knowledge graphs, security, embeddings, CI, etc.), Read the full section so you understand what's actually planned vs just titled.

3. **Flaw catalog** — Read `flaws.md` fully. Build the flaw list:
   ```
   { flawNumber, severity (high/med/low), oneLineDescription, status (open/closed) }
   ```

4. **Cortex's existing-feature keywords** — While reading, build a keyword set of features Cortex already plans: `["MinHash", "LSH", "Jaro-Winkler", "Leiden", "RRF", "SCIP", "tree-sitter", "BFS", "Mermaid", "Poincaré", "SHA-256", "Node2Vec", ...]`. Use this set in Step 3 to flag likely "already in Cortex" findings for closer inspection.

Confirm baseline loaded: *"Cortex baseline loaded: <N> phases indexed, <M> flaws catalogued, <K> existing-feature keywords. Ready to audit `<target-path>`."*

### Step 2 — Exhaustive project scan

Do NOT sample. Do NOT rely on the README alone. Coverage failures here are the dominant failure mode of this skill.

**Diff-mode note**: If Step 0 activated diff mode, restrict the source-code pass (2c) to changed/new files only. Steps 2a, 2b, 2d, and 2e still run on the full project — docs and config drift matters even when source didn't change.

#### 2a. Full file inventory

1. **Top-level glance**: List the target's top-level files and directories.

2. **Recursive file inventory**: Use Glob `**/*` to enumerate every file. Exclude only:
   - Build outputs: `node_modules/`, `target/`, `dist/`, `build/`, `out/`, `.next/`, `.nuxt/`, `__pycache__/`, `.venv/`, `venv/`, `.tox/`
   - VCS internals: `.git/objects/`, `.git/refs/`
   - Lockfiles: `*.lock`, `*.lockb`, `package-lock.json` (don't read content; presence is enough)
   - Coverage: `coverage/`, `.nyc_output/`
   - Binary assets: `*.png`, `*.jpg`, `*.jpeg`, `*.svg`, `*.gif`, `*.webp`, `*.ico`, `*.woff*`, `*.ttf`, `*.otf`, `*.mp4`, `*.mov`, `*.mp3`, `*.wav`, `*.zip`, `*.tar`, `*.gz`, `*.tgz`, `*.7z`, `*.exe`, `*.dll`, `*.so`, `*.dylib`, `*.bin`, `*.pdf`

3. **Hidden directories to explicitly include** (often missed):
   - `.github/` — workflows, issue templates, CODEOWNERS
   - `.gitlab/` — CI templates
   - `.claude/` — agent integrations (skills, commands, hooks)
   - `.cursor/` / `.continue/` / `.copilot/` — IDE-AI integrations
   - `.vscode/` / `.idea/` — IDE configs (may reveal hidden tasks/launch configs)
   - `.devcontainer/` — dev environment specs
   - `.husky/` / `.lefthook.yml` / `.pre-commit-config.yaml` — git hook configs

4. **Dependency declarations** — Read `package.json` / `requirements.txt` / `Cargo.toml` / `go.mod` / `pyproject.toml` / `pom.xml`. External deps imply features:
   - `faster-whisper` → audio transcription
   - `datasketch` → MinHash/LSH
   - `tree-sitter*` → AST parsing
   - `sentence-transformers` / `transformers` → embeddings
   - `playwright` / `puppeteer` → browser automation
   - `prisma` / `drizzle` / `typeorm` → ORM + migrations
   - `bullmq` / `celery` / `sidekiq` → job queues
   - `opentelemetry-*` → observability

5. **Capture monorepo workspaces** — if Step 0 flagged a monorepo, list each workspace and treat each as a distinct scan unit.

#### 2b. Documentation pass (before source)

Read all human-written documentation **first**. This calibrates what you're looking for in the source:

- `README.md` (root)
- Every `README.md` in subdirectories (especially `docs/`, `src/`, `packages/*/`)
- `ARCHITECTURE.md`, `DESIGN.md`, `RFC*.md`, `ADR*.md`, `decisions/*`
- `CHANGELOG.md` — most recent N entries reveal what's newest
- `CONTRIBUTING.md` — reveals dev workflow + conventions
- `SECURITY.md` — reveals security model
- All files in `docs/`, `documentation/`, `guides/`, `tutorials/`, `examples/`
- Any inline `*.md` anywhere in the tree

Build a written feature inventory at this stage — even before source reads, you should have a 20–50 item list of "claimed features" derived from docs.

#### 2c. Source code pass (the deep one)

For each non-excluded source file (in diff mode, only changed/new files):

1. **Read the file fully** — actually call the Read tool. For files >2000 lines, read in segments.
2. **Identify features** — apply the grep-pattern library (see "Grep Patterns" section below) to surface common feature signals.
3. **Note exact location** — file path + line number + function/class name. **No location, no inclusion.**

For projects with **>500 source files**, delegate by directory to parallel Explore agents:

> Spawn one Explore agent per top-level source directory (e.g., one for `src/`, one for `lib/`, one for `tools/`, one for `internal/`). Each agent gets the same prompt template with their assigned directory. They run in parallel.
>
> **Agent prompt template**:
> ```
> Audit `<target-path>/<subdir>` for novel features. Read every source file in this directory exhaustively (do NOT sample). For each file, identify:
> - Functions, classes, interfaces, types (with line numbers)
> - Algorithms (named: Leiden, MinHash, Jaro-Winkler, BFS, RRF, etc.)
> - Security guards (validation, sanitization, SSRF, TOCTOU, rate limits, memory caps)
> - Performance optimizations (caching, lazy loading, blocking, content-addressing, worker pools)
> - CLI commands, MCP tools, hooks, decorators, middleware
> - Config patterns (env vars, config files, feature flags)
> - Integration points (webhooks, event listeners, route handlers)
> - Anti-patterns / dangerous code (eval, unbounded recursion, missing validation, deprecated markers)
>
> Return a structured list. Every item MUST cite: file path + line number + function/class name + 1–2 sentence description. Skip items you cannot cite with a line number. Search breadth: very thorough.
> ```

If an Explore agent returns fewer than ~10 features for a directory with substantial source, **re-spawn with a more targeted prompt** — it sampled rather than read.

#### 2d. Anti-miss checklist (non-obvious sources)

After 2a–2c, verify you have NOT skipped any of these (they hide gems):

| Source | Why it matters |
|---|---|
| `migrations/`, `db/migrate/`, `prisma/migrations/` | Schema features, indexes, constraint patterns |
| `plugins/`, `extensions/`, `addons/` | Pluggable architecture patterns |
| `examples/`, `samples/`, `demo/` | Real-world usage; reveals public API surface |
| `benchmarks/`, `bench/`, `*.bench.*` | Performance hotspots + optimizations |
| `scripts/`, `tools/`, `bin/` | One-off utilities often contain crystallized cleverness |
| `tests/e2e/`, `tests/integration/` | Reveal end-to-end flows that unit tests don't |
| `fixtures/`, `__fixtures__/`, `testdata/` | Reveal expected data shapes (often implicit schemas) |
| `.env.example`, `config.example.*` | Environment-variable surface = configuration features |
| `proto/`, `protobuf/`, `*.proto` | Wire-protocol contracts |
| `generated/`, `codegen/` | Reveals what's auto-derived (and what's manually maintained) |
| `i18n/`, `locales/` | User-facing feature surface |
| `Justfile`, `Makefile`, `Taskfile.yml`, `package.json scripts` | Project-defined tasks and workflows |
| `.github/workflows/`, `.gitlab-ci.yml`, `.circleci/` | CI features (release automation, scheduled jobs, gates) |
| `.claude/`, `.cursor/rules/`, `AGENTS.md`, `CLAUDE.md` | Agent-integration patterns |
| `Dockerfile*`, `docker-compose*.yml` | Deployment + runtime features |
| `*.config.{js,ts,json,yaml}` at root | Build/lint/test/release configs reveal tool choices |

Tick each one — if you skipped any, go back.

#### 2e. Coverage check (mandatory gate before Step 2.5)

Before proceeding, verify:

- [ ] Every top-level directory visited
- [ ] Every config file read
- [ ] All `*.md` documentation read
- [ ] Source files in every subdirectory read (or delegated; or restricted to diff set if diff mode)
- [ ] Test files scanned
- [ ] CI / hooks / `.claude/` configs read
- [ ] Anti-miss checklist (2d) confirmed
- [ ] Monorepo workspaces scanned individually (if applicable)

If any box is unchecked, return to 2a–2d. Report to user: *"Coverage check: <N> files inventoried, <M> source files read, <K> features catalogued (+<I> inherited from prior audit if diff mode)."*

### Step 2.5 — Write the feature inventory artifacts (markdown + JSON)

Before categorization, persist what you found in **two files**. Both are written to Cortex's project root.

**File 1**: `steal-inventory-<target-name>-<YYYY-MM-DD>.md` (human-readable):

```markdown
# Steal Inventory — <target>
**Audited**: <ISO timestamp>
**Target path**: <absolute path>
**Target type**: <node/python/rust/go/java/monorepo>
**Last commit**: <sha> @ <branch> (<date>)
**Mode**: full | diff (since <prior-sha>)

## Features found (raw, pre-categorization)

| # | Feature | Source | Description | Inherited? |
|---|---------|--------|-------------|-----------|
| 1 | <name> | `<file>:<line>` — `<func/class>` | <1-2 sentences> | no |
| ... | | | | |
```

**File 2**: `steal-inventory-<target-name>-<YYYY-MM-DD>.json` (machine-readable, canonical):

```json
{
  "audited_iso": "<ISO timestamp>",
  "target_path": "<absolute path>",
  "target_type": "<node|python|rust|go|java|monorepo>",
  "commit": { "sha": "...", "branch": "...", "date": "..." },
  "mode": "full | diff",
  "prior_sha": "<sha or null>",
  "features": [
    {
      "id": 1,
      "name": "...",
      "file": "...",
      "line": 42,
      "func": "...",
      "description": "...",
      "bucket": null,
      "score": null,
      "severity": null,
      "fit": null,
      "effort": null,
      "confidence": null,
      "counter_case": null,
      "inherited": false
    }
  ]
}
```

Why two artifacts:
- Markdown: human verification — the user can open the cited file and confirm.
- JSON: canonical, machine-readable. Enables future diff-mode audits, downstream automation (`cortex ingest steal-inventory.json`), and cross-audit deduplication.
- Both survive context compaction. If the session resets, the inventory is on disk.
- Both are mandatory. Every item in the final report must trace back to a row in these files.

### Step 3 — Categorize every finding

Each row of the inventory goes into exactly one of seven buckets. **No row may be uncategorized.**

| Bucket | Definition |
|---|---|
| **A. Already in Cortex** | Cortex's `implementation_plan.md` has a phase / refinement implementing the same thing. **Required**: cite the phase number (verified via Step 1's enumeration). |
| **B. Cortex has a superior version** | Cortex's design is more advanced or correct. **Required**: cite phase + 1-sentence reason why Cortex's is better + 1-sentence steel-man for the target's approach. |
| **C. Worth stealing — genuine gap** | Cortex does NOT have this; it fits Cortex's principles; it would improve a real capability. **Required**: propose target phase placement + integration sketch + counter-case + composite score. |
| **D. Niche / wrong fit** | Feature violates a Cortex principle (Step 0's principle list) or is too narrow. **Required**: cite the violated principle. |
| **E. Solves a known flaw** | Feature directly closes a flaw from `flaws.md`. **Required**: cite the flaw number + counter-case + composite score. Can also be C (gap that closes a flaw → upgrade to E). |
| **F. Anti-pattern** | Target did something Cortex should EXPLICITLY avoid (security hole, performance trap, design smell, deprecated approach). **Required**: cite pattern + propose either a `flaws.md` entry text OR a CLAUDE.md rule. |
| **G. Open question** | Target makes a design choice that raises a question Cortex hasn't yet answered. **Required**: state the question precisely (one interrogative sentence) + target's answer + 2–3 alternative answers Cortex could choose. |

#### Verification rules for categorization

- **Bucket A/B claims** must reference a phase number from Step 1's enumeration. If you cannot produce a phase number with a Grep against `implementation_plan.md`, the finding is NOT in bucket A or B — re-classify as C.
- **Bucket C claims** must include a proposed phase placement (existing refinement OR new phase number not currently in use). Verify the proposed new phase number is not taken by Greping the index.
- **Bucket D claims** must cite a specific Cortex principle from the list above.
- **Bucket E claims** must cite a flaw number that exists in `flaws.md` (Grep to verify).
- **Bucket F claims** must cite the specific anti-pattern with a file:line and propose either a `flaws.md` entry text or a CLAUDE.md rule.
- **Bucket G claims** must phrase the open question as a precise interrogative sentence and list 2–3 alternative answers.

After categorization, count rows per bucket. Distribution sanity check: if A=0 and B=0, you probably haven't actually read Cortex's plan. If C is most of the inventory, you probably haven't read Cortex's plan either. Cortex is large — typical distributions for mature target projects look like: A=20–40%, B=5–10%, C=15–30%, D=10–20%, E=5–15%, F=0–5%, G=0–5%.

### Step 4 — Cross-reference against flaws.md (the highest-value lens)

Two passes:

**Pass 1 (C → E upgrade)**: For every feature in bucket C, ask: *"Does this also close a flaw in `flaws.md`?"* Re-read the relevant section of `flaws.md` for each candidate. If yes, **upgrade to E** and cite the flaw number. A feature can simultaneously be a "genuine gap" AND a "flaw closure" — its bucket is E.

**Pass 2 (reverse: flaw → target re-scan)**: For each **open** flaw in `flaws.md`, ask: *"Did the target project address this in some way I missed?"* If a flaw has no candidate closure in your inventory, do a **targeted re-scan** of the target — Grep the target for keywords from the flaw description. Flaws are the highest-value lens; missing one is a worse failure than missing a generic feature.

After this step, your bucket E should be the most carefully verified part of the inventory.

### Step 4.5 — Negative-space scan (what's NOT here?)

Item-by-item analysis finds what the target HAS. This step finds what a project of the target's domain SHOULD have but **doesn't** — a powerful lens for spotting industry-standard features Cortex AND the target are both missing. Without this step, the audit can only ever surface things the target already does; it cannot surface industry blind spots.

1. **Identify the target's domain** — code intelligence, knowledge graph, build tool, CI/CD, AI agent, observability, etc. A target may straddle multiple domains; list each.

2. **List 5–10 expected features per domain** (use the cheat-sheets below as starting points; extend with your own domain knowledge):
   - **Code intelligence**: AST cache, incremental parsing, symbol resolution, cross-file refs, dead-code detection, LSP integration, type inference
   - **Knowledge graph**: graph DB, edge weights, community detection, embeddings, query language, schema evolution, graph diffing
   - **Build tool**: incremental builds, dependency graph, parallel execution, cache invalidation, watch mode, sandboxing, hermetic builds
   - **AI agent**: streaming responses, tool calling, conversation memory, prompt templates, model fallbacks, cost tracking, retry/backoff
   - **CI/CD**: matrix builds, secret management, artifact storage, deployment gates, rollback, flaky-test detection, parallel test sharding
   - **Observability**: trace propagation, metric aggregation, log correlation, alerting, SLO tracking, error grouping
   - **Search / retrieval**: BM25, semantic vectors, hybrid ranking, query expansion, faceted filters, snippet generation
   - **Security tool**: SAST rules, dependency scanning, secret detection, SBOM emission, license checks, vuln DB

3. **Cross-check against your inventory**:
   - Expected AND found in target → already in inventory; nothing new to add.
   - Expected AND NOT found in target → record in "Expected but absent" report section.
     - Cross-check Cortex: if Cortex also lacks it → flag as a potential Cortex roadmap candidate (not a steal, but a signal worth surfacing).
     - If Cortex has it → no action; Cortex is ahead of the target on this axis.

4. **Output**: "Expected but absent" section in the final report. These items don't have a file:line citation (they're absences, by definition) but ARE auditable — the user can verify by searching the target.

The most damaging miss is rarely the obscure feature in a weird file — it's the industry-standard feature that everyone assumes but nobody is shipping yet. This step is what catches it.

### Step 5 — Theme-level analysis (anti-miss insurance)

Item-by-item analysis misses patterns. Step back and ask:

1. **Architectural themes** — Does the target make a design choice Cortex hasn't considered? (event-sourced vs state-based, push vs pull, deterministic vs LLM-driven, monolithic vs plugin-based)
2. **Operational themes** — Ops practices missing from Cortex? (observability, deployment models, multi-tenant isolation, backup strategies, graceful degradation)
3. **Security themes** — Entire classes of guard Cortex lacks? (SSRF, TOCTOU, fragment-size DoS, signature verification, secret rotation)
4. **Performance themes** — Optimization layers Cortex is missing? (content-addressed caching, lazy loading, pre-filtering, worker pools, blocking, write coalescing)
5. **UX themes** — Interaction patterns that would change how Cortex feels? (interactive prompts, progressive disclosure, dashboards, real-time updates, error message style)
6. **Testing themes** — Test approaches Cortex doesn't use? (snapshot tests, property-based tests, fuzz tests, golden files, mutation testing)
7. **Developer-ergonomics themes** — Pleasantness features? (debug mode, dry-run flags, verbose output options, tab-completion, shell wrappers)

If a theme stands out, add it as a top-level finding even if no single feature captured it. Themes appear in the report under "Theme-Level Findings."

### Step 6 — Second-pass verification, steel-manning, and scoring

Before writing the final report, run all seven sub-steps. Skipping any is a defect.

1. **Random spot-check**: Pick **5 items at random** from buckets C and E (the items that will be acted on). For each, **re-open the cited file at the cited line** and confirm the feature exists as described. If any item fails verification, redo categorization for the whole inventory.

2. **Phase-number verification**: For every bucket A/B claim, re-Grep `implementation_plan.md` for the cited phase number to confirm it exists.

3. **Flaw-number verification**: For every bucket E claim, re-Grep `flaws.md` for the cited flaw number to confirm it exists.

4. **De-duplication**: Same feature found under multiple file paths (common in monorepos with shared utilities) gets merged into one inventory row with multiple source citations.

5. **Confidence scoring**: For each bucket C/E item, assign confidence:
   - **High** — feature is unambiguous, source is clean, fit is obvious
   - **Medium** — feature is real but Cortex-fit needs design work
   - **Low** — feature is real but may not adapt well to Cortex's principles
   Items with **low confidence** appear in the report but with a `⚠ low-confidence` marker.

6. **Steel-man / counter-case** (mandatory honesty step):
   - For every **bucket C and E** item: write a **1-sentence counter-case** — "Why we might NOT want to steal this." Examples: "Adds a new dependency for marginal capability gain," "Violates Cortex's locality principle if scope creeps," "Cortex's existing Phase X already covers 80% of this," "Adds maintenance burden disproportionate to value."
   - For every **bucket B** item: write a **1-sentence case FOR the target's approach** — what they got right that Cortex's design under-weights. Prevents arrogance.
   - For every **bucket F** item: include a sentence explaining why the target might have CHOSEN this anti-pattern (sometimes it's a deliberate tradeoff, not a mistake — capture that).
   - If you cannot write a credible counter-case for a C/E item, **re-evaluate it**: it likely belongs in A, B, or D instead.
   - This step is the single biggest defense against over-recommendation. Skipping it produces a padded, untrustworthy report.

7. **Composite scoring** (for C and E items only; ranks items within their bucket):
   - Assign three integer scores:
     - `severity`: 1–5. For E items, mirror the flaw's severity (low=1, med=3, high=5). For C items, rate capability gain (1 = minor polish, 5 = major capability).
     - `fit`: 1–5. How well does it adapt to Cortex's principles? (1 = needs major redesign, 5 = drop-in).
     - `effort`: 1–3. (1 = small <50 lines, 2 = medium 50–500, 3 = large >500 or new dep).
   - Compute: `score = severity × fit × (4 − effort)`. Maximum is 5 × 5 × 3 = 75.
   - Sort C and E sections in the final report by **descending score**. The top item is the highest-leverage recommendation.

After this step, the inventory is verified, counter-argued, and ranked — ready for the report.

### Step 7 — Produce the final report

Emit a single structured report. Do not omit sections — write `(none)` to make absence explicit.

```markdown
# Steal Audit — <target-project-name>

**Audited path**: <absolute path>
**Target type**: <type>
**Last commit**: <sha> @ <branch> (<date>)
**Mode**: Full audit | Diff audit since <prior-sha> (<prior-date>)
**Files scanned**: <N> (+<M> unchanged features inherited if diff mode)
**Features catalogued**: <total>
**Bucket distribution**: A=<n>, B=<n>, C=<n>, D=<n>, E=<n>, F=<n>, G=<n>
**Verification spot-checks**: <5/5 passed | failures listed below>
**Inventory artifacts**: `steal-inventory-<target>-<date>.md` + `.json`

---

## E. Flaw Closures (highest priority — act on these first)

**Sorted by composite score (severity × fit × (4−effort), descending).**

For each:
- **Score**: <severity> × <fit> × <4−effort> = <total>
- **Flaw**: #<num> — <title from flaws.md>
- **Closed by**: <feature name>
- **Source**: `<target>/<file>:<line>` — `<func/class>`
- **How it closes the flaw**: <specific mechanism, 1–2 sentences>
- **Counter-case**: <1-sentence reason this might be a bad idea>
- **Effort**: small (<50 lines) / medium (50–500) / large (>500 or new dep)
- **Confidence**: high / medium / low

## C. Worth Stealing (genuine gaps, no flaw mapped)

**Sorted by composite score (severity × fit × (4−effort), descending).**

For each:
- **Score**: <severity> × <fit> × <4−effort> = <total>
- **Name**: <short title>
- **Source**: `<target>/<file>:<line>` — `<func/class>`
- **What it does**: <1–2 sentences>
- **Why Cortex benefits**: <specific capability gain>
- **Counter-case**: <1-sentence reason this might be a bad idea>
- **Proposed placement**: refinement to Phase X.Y / new Phase X.Y (Phase X.Y is unused — verified)
- **Integration sketch**: <3–5 lines of pseudocode>
- **Effort**: small / medium / large
- **Concerns**: <deps, complexity, risk — be honest>
- **Confidence**: high / medium / low

## F. Anti-Patterns (lessons to AVOID)

For each:
- **Pattern**: <name>
- **Where**: `<target>/<file>:<line>` — `<func/class>`
- **Why it's bad**: <1–2 sentences>
- **Why the target might have chosen it**: <1 sentence — deliberate tradeoff or mistake?>
- **Proposed Cortex action**: add to `flaws.md` as "<flaw entry text>" OR add rule to CLAUDE.md OR document in design notes

## G. Open Questions (design decisions Cortex hasn't made)

For each:
- **Question**: <precise interrogative sentence>
- **Triggered by**: `<target>/<file>:<line>` — <what target did>
- **Target's answer**: <1 sentence>
- **Cortex's options**: <2–3 alternative answers>

## Expected but Absent (negative-space findings)

Features industry-standard for <domain> that the target does NOT have:

For each:
- **Feature**: <name>
- **Why it's standard for <domain>**: <1 sentence>
- **Cortex status**: <has it (Phase X.Y) | missing too — potential roadmap item>

## Theme-Level Findings

<top-level architectural / operational / security / performance / UX / testing / DX themes>

## B. Cortex Has a Superior Version (skip)

For each:
- **Their feature**: <name> at `<file>`
- **Cortex's version**: Phase <X.Y> — <why Cortex's is better>
- **Case for target's approach**: <1-sentence steel-man — what they got right>

## A. Already in Cortex (skip)

For each (group by Cortex phase to compress):
- **Phase <X.Y>**: <their features that match>

## D. Niche / Wrong Fit (skip)

For each:
- **Feature**: <name>
- **Cortex principle violated**: <which principle from the list>
- **Why not**: <1 sentence>

---

## Recommended next actions

Prioritized (composite score guides order within E and C):
1. **Flaw closures** (E) — top of E section by score
2. **High-confidence steals** (C) — top of C section by score
3. **Anti-patterns** (F) — file `flaws.md` entries to capture lessons
4. **Open questions** (G) — surface to user for design decisions
5. **Theme-level changes** — often higher leverage than single features
6. **Expected-but-absent items** — Cortex roadmap candidates (not stealable, but signal)
7. **Medium/low-confidence items** — design work needed before action

## Inventory artifacts

- Human-readable: `steal-inventory-<target>-<date>.md`
- Machine-readable (canonical, used for future diff-mode audits): `steal-inventory-<target>-<date>.json`
```

---

## Grep Patterns (use these in Step 2c to catch features)

These regexes surface common feature signals. Run them against the target's source files to ensure breadth:

### Architectural surfaces
- `class\s+\w+(Manager|Service|Controller|Repository|Worker|Daemon|Engine|Coordinator)`
- `interface\s+\w+(Config|Options|Strategy|Plugin|Provider)`
- `(export\s+)?async\s+function\s+\w+` — public async API
- `@(decorator|annotation)|@(Get|Post|Put|Delete|Patch)Mapping`

### Performance / caching
- `\b(cache|memoize|lru|memo)\b` (case-insensitive)
- `content[_-]?hash|sha256|sha1\(|md5\(` — content addressing
- `worker[_-]?pool|spawn(Sync)?|cluster\.fork|child_process`
- `WeakMap|WeakSet` — memory-aware caches

### Security
- `validate|sanitize|escape|normalize` (case-insensitive)
- `getaddrinfo|socket\.(connect|getaddrinfo)` — SSRF surface
- `crypto\.timingSafeEqual|hmac|verify(Signature)?`
- `rate[_-]?limit|throttle|debounce`
- `MAX_(NODES|EDGES|SIZE|LENGTH|BYTES|DEPTH)` — DoS guards

### Anti-pattern detection (Bucket F signal)
- `eval\(|new Function\(|exec\(` — code injection surface
- `// TODO: remove|@deprecated|// FIXME:|// HACK:` — known smell markers
- `catch\s*\([^)]*\)\s*\{\s*\}` — empty catch (silenced errors)
- `setTimeout\(.*0\)` — race-condition smell
- `process\.env\.\w+\s*\|\|\s*['"]` — default secrets in code

### Concurrency / resilience
- `retry|backoff|circuit[_-]?breaker|jitter`
- `Mutex|Semaphore|lockfile|flock|fcntl`
- `AbortController|AbortSignal|CancellationToken`

### Knowledge / graph
- `tree[_-]?sitter|treesitter|@ast-grep|babel-parser` — AST
- `leiden|louvain|community[_-]?detection|girvan` — graph clustering
- `pagerank|centrality|betweenness|eigenvector`
- `embedding|cosine|euclidean|hyperbolic|poincare`
- `bm25|tfidf|reciprocal[_-]?rank|rrf`
- `minhash|lsh|jaccard|jaro[_-]?winkler|levenshtein`

### CLI / MCP / agent
- `commander|yargs|clap|cobra|click` — CLI frameworks
- `McpServer|@mcp|tool\(.*description` — MCP tool definitions
- `\.claude/skills|\.claude/commands|AGENTS\.md`
- `hook|pre[_-]?commit|post[_-]?commit|husky`

### Git / VCS integration
- `simple-git|nodegit|gitpython|libgit2|git2`
- `rev-parse|rev-list|diff[_-]?tree|log --`
- `webhook|push[_-]?event|pull[_-]?request`

### Observability
- `opentelemetry|otel|tracer|span|metric`
- `pino|winston|bunyan|structlog|zap` — structured logging
- `prometheus|grafana|datadog|sentry`

### Storage
- `sqlite|better-sqlite|libsql|pgvector|sqlite-vss`
- `jsonl|ndjson|parquet|arrow`
- `migration|schema|prisma|drizzle|alembic`

### Build / release
- `semver|conventional[_-]?commits|changesets|release[_-]?please`
- `tsc|esbuild|swc|rollup|vite|webpack`
- `husky|lefthook|pre-commit`

Run additional patterns relevant to the target's domain. If the target is a media tool, Grep for `whisper|ffmpeg|transcribe`. If it's a search tool, Grep for `faiss|hnsw|ivf|product[_-]?quantizer`.

---

## Rules and pitfalls

1. **Do not skim Cortex's plan.** If you cite "already in Cortex," you must produce the phase number via Grep. No exceptions.
2. **Do not skim the target.** Saying "I looked at the project" without reading the files is THE failure mode this skill exists to prevent.
3. **No location, no inclusion.** Every feature in the inventory and report must cite file + line.
4. **Verify before report.** Step 6's spot-check is mandatory. Do not produce a report you have not verified.
5. **Honesty over volume.** A 4-item Steal list with surgical accuracy beats a 30-item list padded with bucket-A items.
6. **No hallucinated features.** If you cannot cite, do not include.
7. **Theme analysis is mandatory.** Skipping Step 5 is a defect.
8. **Re-classify aggressively.** Bucket assignment is provisional until Step 6's verification confirms it.
9. **Do not modify `implementation_plan.md` or `flaws.md` from inside this skill.** This skill only audits and reports. Modifications are a separate user request.
10. **The principles list is a hard filter.** A feature violating a Cortex principle goes to D, not C — even if it looks valuable.
11. **Bucket E is the gold.** Flaw closures are the highest-leverage findings. Verify these the most rigorously.
12. **Confidence-mark low-fit items.** It's better to say `⚠ low-confidence` than to over-sell.
13. **Don't merge monorepo workspaces** in the inventory. Each gets its own row group.
14. **Deprecated code is poison for stealing, gold for F.** Don't steal a feature the target has marked `@deprecated` or `// TODO: remove` — but DO consider it for bucket F (anti-pattern) if it represents a lesson.
15. **Steel-man every steal.** A C/E item without a written counter-case is not finalized. The counter-case is a quality gate, not optional. If you can't write one, the item probably doesn't belong in C/E.
16. **Negative space is signal too.** Step 4.5 is mandatory. The features the target does NOT have are sometimes the most important finding — they hint at industry standards Cortex may also lack.
17. **Diff mode by default.** If a prior inventory exists for the same target, run in diff mode unless `--full` was passed. Re-reading unchanged files is wasted work and dilutes the report.
18. **Composite scores are ordinal, not absolute.** A score of 60 is "rank above 30" — not "twice as valuable as 30." Use scores to ORDER within a bucket, not to add up or compare across buckets.
19. **F and G are not consolation prizes.** Don't dump uncertain C items into G or B-rejects into F. Each bucket has a precise definition; respect it.
20. **The JSON sidecar is canonical.** Markdown is for humans; JSON is what future diff-mode audits read. Keep them in sync.

---

## Output expectations

- The **final report** is the only mandatory deliverable to the chat.
- Two **inventory artifacts** are written to disk in Cortex's project root: `steal-inventory-<target>-<date>.md` (human) and `steal-inventory-<target>-<date>.json` (machine, schema in Step 2.5). Both paths must appear in the report's header.
- Intermediate updates ("loaded baseline", "scanning src/", "categorizing", "steel-manning", "scoring", "verifying") are encouraged so the user sees progress.
- If the target is genuinely small and there's nothing worth stealing, **say so**. A confident "nothing in this project clears Cortex's bar" is a valid output. Padding the list is a defect.
- If you found something the user will find surprising (an obscure file with a clever trick), call it out in a `## Surprises` mini-section.
- If you discovered the target is in poor shape (low quality, abandoned, anti-patterns), say so before the report — it changes how the user interprets findings.
- In **diff mode**, the report header makes clear that some content was inherited from prior audit. This is for trust: the user should never wonder which items are "fresh."
