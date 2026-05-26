---
name: steal
description: Use when the user wants to audit an external project against Cortex's implementation_plan.md and flaws.md to identify features worth stealing. Triggers on phrases like "/steal", "what can we steal from this project", "audit this project against cortex", "go through this folder and find what we're missing". Exhaustive multi-pass feature audit with hot-path prioritization, public-surface-first reading, recency + test-coverage signal weighting, negative-space analysis, steel-manned recommendations, composite scoring (severity × fit × inverse-effort), diff-mode re-audits, hallucination spot-check, headline summary, and a copy-paste-ready integration scratch artifact. Designed to be the canonical pipeline for closing Cortex flaws and proposing superior phases from external code.
version: 2.1
---

# Steal — External-Project Feature Audit for Cortex

Systematic audit of an external project to find features worth incorporating into LLM-Cortex. Outputs feed directly into `flaws.md` closures, new phases, and refinements that supersede existing Cortex designs.

**Prime directive**: no feature missed, no finding hallucinated, no recommendation over-sold. Every report claim cites file + line AND a written counter-case.

**Reference files** (load on demand, not upfront):
- `reference/report-template.md` — final report structure (with headline summary + diff-delta sections)
- `reference/grep-patterns.md` — 10-category pattern library
- `reference/domain-cheatsheets.md` — negative-space expected features per domain
- `reference/inventory-schema.json` — JSON sidecar schema
- `reference/explore-agent-prompt.md` — parallel-scan agent template
- `reference/worked-example.md` — concrete populated E + C entries

---

## Inputs

1. **Cortex baseline** (cwd): `implementation_plan.md`, `flaws.md`. If missing, ask for Cortex's path.
2. **Target path**: absolute path of external project. If not provided, ask.
3. **Argument flags** (parsed from the slash-command args):
   - `--full` — force complete re-audit, ignore prior inventory.
   - `--quick` — skip Steps 4.5 (negative-space), 5 (themes), 8 (self-critique). For shallow first-pass audits.
   - `--paranoid` — every C/E claim is double-verified by a second Agent call (Step 6.5 expanded). Expensive but catches false positives.
   - `--headline-only` — emit only the headline summary table; skip detailed E/C/F/G sections in the report.
   - `--resume` — continue from `steal-checkpoint-<target>.json` if a prior audit was interrupted.

## Cortex principles (hard filter)

Features violating any of these go to bucket D unless adapted:
1. **Local-first** — runs on dev's machine; server-dependent → Phase 22+.
2. **MCP-first** — primary API is MCP; new REST/GraphQL needs justification.
3. **LLM-cost-conscious** — zero-LLM alternatives preferred.
4. **Knowledge-as-derived-data** — `.knowledge/` is regenerable, never canonical.
5. **Surface-don't-act** — flag issues; humans decide.
6. **No third-party API for core** — local-model fallbacks always exist.
7. **Index-first** — `index.md` is the primary read path.

## Budgets (hard caps)

On exhaustion, emit **Partial Audit** with disclosure:
- Max 1000 file reads per audit
- Max 5 parallel Explore agents
- Max 200 inventory rows
- Max 50 Grep calls (beyond that, batch or summarize)

Use **plain Read / Grep / Glob / Agent only**. Do NOT call Cortex's MCP tools on the target — they're scoped to Cortex itself and produce misleading results on external projects.

---

## Workflow

Execute every step in order. Skipping is a defect (`--quick` is the only sanctioned shortcut).

### Step 0 — Sanity checks & mode selection

1. **Baseline check**: Glob `implementation_plan.md` and `flaws.md` in cwd. Missing → ask.
2. **Target validation**: Confirm path is a directory and NOT Cortex itself. Reject forks (matching `package.json` name), `.knowledge/` dirs.
3. **Git context**: Capture `<sha> @ <branch> (<date>)` if `.git/` exists.
4. **Target type**: package.json → Node/TS; pyproject.toml → Python; Cargo.toml → Rust; go.mod → Go; pom.xml → Java. Workspace markers → monorepo (each workspace = separate scan unit).
5. **Prior inventory check (diff mode)**: Glob `steal-inventory-<target>-*.json` in cwd.
   - If found AND `--full` NOT passed AND prior `commit.sha` ≠ current HEAD → **Diff Mode**. Use mtime cache (see Step 2.5) to identify changed files; scan only those; inherit unchanged features from prior JSON.
   - Else: full audit.

### Step 0.5 — Relevance gate (early exit)

Short-circuit obviously low-value targets:
- **<50 source files AND no `docs/`** → output "Target too small" + one-paragraph summary. Stop.
- **README contains "ARCHIVED" / "DEPRECATED" / "no longer maintained"** → output "Target abandoned." Stop.
- **Only HTML/CSS/static assets, no business logic** → "Domain mismatch with Cortex." Stop.

**Cross-domain note (read before applying the domain-mismatch exit):** Domain mismatch applies to the *product*, not individual *patterns*. A Python ML training tool, a phone-chat app, or an OS scheduler may have zero product overlap with Cortex but contain algorithmic patterns — fuzzy matching tiers, bounded BFS, config layering, retry strategies, test harness design, progress reporting — that transfer directly. Only exit on domain mismatch if the target is *purely* static assets with no algorithmic logic whatsoever. For everything else, continue the audit and apply the cross-domain lens in Step 2c.

### Step 0.7 — Pre-flight skim (depth calibration)

30-second triage BEFORE the deep scan, to right-size Step 2's effort:
1. List top-level directories (Glob depth 1).
2. Read `package.json`/`pyproject.toml`/etc. dependencies.
3. Read README's first 100 lines.
4. Capture `git log --oneline -20` to see recent activity.
5. Count source files: `glob "**/*.{ts,js,py,rs,go,java}"`.

Output a **calibration verdict**:
- **Boilerplate / starter** (<5k LOC, generic deps, no novel domain): shallow audit (~10 min equivalent budget).
- **Standard library / tool** (5k–50k LOC, established domain): standard audit (full budget).
- **Novel / research** (>50k LOC OR uses Cortex-relevant deps like tree-sitter, embeddings, graph libs): deep audit, prioritize hot paths in Step 1.5.

State the verdict and proceed.

**Minimum item floors by calibration** — hard requirement, not a guideline:
- **Boilerplate/starter**: ≥3 total items (any bucket).
- **Standard library/tool**: ≥8 total items; ≥1 F item (all non-trivial codebases have at least one anti-pattern).
- **Novel/research**: ≥12 total items; ≥1 F item; ≥1 G item. A novel/research target with fewer than 12 findings is under-scanned — return to Step 2 and read more files before proceeding.

If you reach Step 3 and are below the floor: **stop, go back to Step 2, read more files.** "Honesty over volume" applies to padding within buckets, not to missing buckets entirely.

### Step 1 — Load Cortex baseline

1. **Phase enumeration (cached)**:
   - Check for `.cortex-phases.json` in cwd. If exists AND its `implementation_plan_mtime` matches current file's mtime → use cached enumeration.
   - Else: Grep `^## .*Phase ` / `^### Phase .* Refinement` / `^### Phase .* —`. Build the list and write `.cortex-phases.json`:
     ```json
     { "implementation_plan_mtime": "<iso>", "phases": [{"number":"0.1","title":"...","status":"✅","line":42}, ...] }
     ```
   - This enumeration is the **only** valid source for "already in Cortex" claims.
2. **Flaw catalog**: Read `flaws.md` → `{ flawNumber, severity, oneLine, status }` list.
3. **Phase deep-reads**: For phases whose titles match the target's domain (per Step 0.7 verdict), read the full section.

State: *"Baseline loaded: <N> phases, <M> flaws. Mode: <full | diff>. Calibration: <verdict>. Auditing <target>."*

### Step 1.5 — Hot-path identification

Before reading source files in arbitrary order, identify load-bearing files so they're scanned first (budget-resilient — if you run out, you've covered the core):

1. **By size**: list top 30 source files by LOC (`wc -l` equivalent via Read line counts or Glob + heuristic).
2. **By git churn**: `git -C <target> log --pretty=format: --name-only --since="6 months ago" | sort | uniq -c | sort -rn | head -30` — top-modified files in last 6 months.
3. **By import centrality** (cheap proxy): Grep for `from ['"]\.\/` / `import.*from ['"]\.\.` and count incoming imports. Top 20 most-imported files = load-bearing.

Merge the three lists into a **hot-paths set** (typically 30–50 files). These get read FIRST in Step 2c. Files not in the set are read after, until budget exhausts. If budget runs out, the inventory still reflects the project's core.

### Step 2 — Exhaustive scan

Do NOT randomly sample. Coverage failures are the dominant failure mode.

- **2a. Inventory**: Glob `**/*`. Exclude `node_modules/`, `dist/`, `build/`, `out/`, `target/`, `.next/`, `.git/objects/`, lockfiles, binary assets. Include hidden dirs (`.github/`, `.gitlab/`, `.claude/`, `.cursor/`, `.continue/`, `.vscode/`, `.idea/`, `.devcontainer/`, `.husky/`).
- **2b. Docs first**: README (root + every subdir), ARCHITECTURE, DESIGN, RFC*, ADR*, CHANGELOG, CONTRIBUTING, SECURITY, every `*.md`. Build 20–50 item "claimed features" list before source.
- **2c. Source pass** (the deep one):
  - **Order**: Step 1.5's hot-paths set first, then everything else.
  - **Public-surface-first for large files**: For files >500 lines, FIRST Read with `limit: 200` to capture top-of-file (imports, exports, class signatures, public API). Only deep-read the full body if pass-1 surfaced a high-value signal (algorithm name, security guard, novel pattern). Cuts read tokens ~60% on large files.
  - **Stratified sampling for huge targets**: If Glob returns >5000 source files (a real monorepo), switch to stratified mode: read 100% of files in `src/core/`, `src/api/`, `lib/`, top-level exports; read 1-in-5 (deterministic by file hash) for `tests/`, `examples/`, `generated/`. Note in report header: "Stratified scan: 100% core + 20% peripheral."
  - **Apply patterns** from `reference/grep-patterns.md`.
  - **Cite file + line + symbol** — no location, no inclusion.
  - **Capture file metadata** for each finding: `last_modified` (mtime), `has_tests` (boolean — is there a `*.test.*` / `*_test.*` / `*_spec.*` for this file or its containing module?). These feed scoring in Step 6.
  - **Cross-domain lens (mandatory):** For every file read, ask TWO questions, not one. (1) "Does this feature exist in Cortex?" — the standard question. (2) "Could this *technique* transfer to Cortex even if the domain doesn't match?" Techniques that transfer regardless of domain: retry/fallback chains, bounded graph traversal, tiered confidence scoring, config merge patterns, progress reporting, DI for testability, parallel I/O prefetch, fuzzy matching pipelines, error classification hierarchies. A fuzzy string matcher in a chat app is as applicable to `cortex_find` as one in a code search tool. Never dismiss a technique solely because the file's product domain differs from Cortex's.
- **2d. Anti-miss checklist**: Confirm visits to `migrations/`, `plugins/`, `examples/`, `benchmarks/`, `scripts/`, `tools/`, `tests/e2e/`, `fixtures/`, `proto/`, `generated/`, `i18n/`, `Justfile`/`Makefile`/`Taskfile.yml`, `.github/workflows/`, `.gitlab-ci.yml`, `Dockerfile*`, `.env.example`, root `*.config.*`.

- **2d.2 Always-read files (never skip, never partial-read — unconditionally high-value)**:
  - **Security files**: any file matching `security*.py`, `security*.ts`, `*_guard*.ts`, `*ssrf*.py`, `*auth*.py`, `*sanitize*.ts`. Read **fully** (not just the first 200 lines). Security patterns live anywhere in the file body and are the single highest-severity findings. Partial-reading a security file is equivalent to not reading it.
  - **Domain-core directories** (read 100% of files, no sampling):
    - `parsers/`, `languages/`, `extractors/`, `resolvers/` — in code-analysis/AST targets, per-language files contain the non-obvious novel techniques (normalization, complexity heuristics, dynamic dispatch detection). These files are dispatched via a registry so they score near-zero on import-centrality — the hot-path algorithm will never surface them. They must be read unconditionally.
    - `core/`, `engine/`, `runtime/` — project's central machinery.
    - `resolution/`, `inference/` — call-graph and type-inference logic.
  - **Top-3 git-churned files**: from Step 1.5's churn list, the three files with the highest change count MUST be fully read regardless of whether they appear in import-centrality. High churn = high author investment = high signal density.

- **2d.1 Anti-pattern scan (mandatory, feeds F bucket)**: After reading each source file, actively check for the following patterns — these are almost always present in research/library code and are easy to miss if you wait for them to appear naturally:
  - Hardcoded absolute paths (strings starting with `/` or `C:\` that are data/model/tool paths, not stdlib)
  - Hardcoded device/platform strings (`"cuda:0"`, `"cpu"`, `localhost:8080` at module level)
  - Missing `self` / `this` in class constructors
  - `os.chdir()` / `process.chdir()` in non-CLI code
  - Bare `except: pass` / `catch {}` swallowing errors silently
  - Unbounded growth (append-only lists/files with no eviction)
  - Untested public API (no corresponding test file for the module)
  Any of these found → queue as F candidate. Do not defer; note immediately.

- **2e. Coverage gate**: Every top-level dir visited AND every domain-core subdir (2d.2) fully covered, every config read, all `*.md` read, anti-miss confirmed. A top-level dir that contains a domain-core subdir does NOT count as "visited" until the subdir's files are individually read.

For projects **>500 source files**, delegate per-directory to parallel Explore agents (cap: 5). Prompt template: `reference/explore-agent-prompt.md`.

**Progress streaming**: During Step 2c, emit one short status line per ~20 files: *"[12/47] read src/parsers/python.ts — 3 features"*. User knows it's not stuck.

### Step 2.5 — Persist inventory + sidecars

Write to cwd (Cortex root):
- `steal-inventory-<target>-<YYYY-MM-DD>.md` — human-readable table.
- `steal-inventory-<target>-<YYYY-MM-DD>.json` — canonical, schema: `reference/inventory-schema.json`. Adds per-feature `last_modified`, `has_tests` fields.
- `steal-inventory-<target>-files.json` — file mtime cache for diff mode. Schema:
  ```json
  { "audited_iso": "...", "target_path": "...", "files": { "src/a.ts": "2026-05-20T12:34:56Z", ... } }
  ```
  Future diff audits compare current mtimes against this; more reliable than `git diff` (works on non-git, worktree edits, staged changes).

**Cross-audit ledger update**: Append a summary entry to `~/.cortex/steal-ledger.json`. Schema:
```json
{
  "audits": [
    {
      "iso": "...", "target": "...", "commit_sha": "...",
      "bucket_counts": { "A":12, "B":3, "C":18, "D":7, "E":4, "F":2, "G":1 },
      "top_findings": ["feature name 1", "feature name 2", "feature name 3"]
    }
  ]
}
```
On future audits, if a finding's name appears in **3+** prior audits, auto-boost its `severity` score by 1 (capped at 5) — industry-pattern signal.

**Checkpoint** (for `--resume`): also write `steal-checkpoint-<target>.json` containing `{ "step_completed": "2.5", "inventory_id_max": <n> }`. Update at each step boundary.

**Artifact collision guard**: Before writing any artifact, Glob the exact filename. If a same-named file already exists (e.g. a prior LLM already ran this audit), append `-<llm-name>` to your filename (e.g. `steal-inventory-<target>-<date>-claude.md`) and note the collision in the report header. Never silently overwrite a prior run's artifacts.

### Step 3 — Categorize (7 buckets)

| Bucket | Definition | Required to claim |
|---|---|---|
| **A** | Already in Cortex | Phase number from Step 1 enumeration |
| **B** | Cortex has superior version | Phase + 1-sentence case FOR target's approach (steel-man) |
| **C** | Worth stealing (gap) | Proposed phase placement + counter-case + score |
| **D** | Niche / wrong fit | Cite violated Cortex principle |
| **E** | Closes a known flaw | Flaw # (Grep-verified) + counter-case + score + **passes Cortex principles filter** |
| **F** | Anti-pattern (avoid) | Pattern + proposed flaws.md/CLAUDE.md addition |
| **G** | Open question | Precise interrogative sentence + 2–3 alternative answers |

Distribution sanity (mature targets): A=20–40%, B=5–10%, C=15–30%, D=10–20%, E=5–15%, F=0–5%, G=0–5%.

**Surprises → Bucket drain (mandatory after categorization):** Every item noted under `## Surprises` MUST be formally assigned to a bucket (A–G) or explicitly documented as "outside scope — D" with the violated Cortex principle cited. The Surprises section is a staging area, not a final resting place. An interesting observation that never enters a bucket is a Step 3 defect. After completing initial categorization, re-read every Surprises item and ask: "What bucket does this belong to?" Assign it, then score it if C/E.

### Step 4 — Flaw cross-reference

- **Pass 1 (C→E upgrade)**: For each C, ask "does this also close a flaw?" Yes → upgrade to E.
- **Pass 2 (flaw→target re-scan, active)**: This is NOT a passive question. For the top 20 highest-severity open flaws in `flaws.md`, extract 2–3 keywords from each flaw's description and **actively Grep the target's source files** for those keywords. If a match is found, read the surrounding code and evaluate whether it addresses the flaw. Missing a flaw closure is a worse defect than missing a generic feature — treat this pass as mandatory searching, not optional reflection.

### Step 4.5 — Negative-space scan (`--quick` skips)

Identify target's domain(s). For each, load `reference/domain-cheatsheets.md` and check 5–10 expected features:
- In target? → already in inventory.
- NOT in target? → "Expected but Absent" section. If Cortex also lacks → potential Cortex roadmap signal.

### Step 5 — Theme-level analysis (`--quick` skips)

Step back: architectural, operational, security, performance, UX, testing, DX themes.

### Step 6 — Verify, steel-man, score

1. **Spot-check**: 5 random C/E items — re-open the cited file at the cited line, confirm.
2. **Phase verification**: Re-grep `implementation_plan.md` for every A/B phase cited.
3. **Flaw verification**: Re-grep `flaws.md` for every E flaw cited.
4. **Dedupe**: Merge same-feature rows.
5. **Confidence** (now signal-weighted):
   - Base: high / medium / low per C/E item.
   - **Test-coverage bump**: if the feature's `has_tests` is true → bump confidence by 1 tier (max high). Tested features are more reliable.
   - **Recency penalty**: if `last_modified` is >2 years old → cap confidence at medium. Stale code is suspect.
   Low-confidence items get a `⚠ low-confidence` marker in the report.
6. **Steel-man** (mandatory):
   - Each **C/E item**: 1-sentence counter-case ("why we might NOT want this").
   - Each **B item**: 1-sentence case FOR target's approach.
   - Each **F item**: 1-sentence "why target might have chosen this".
   - Cannot write a credible counter-case for a C/E item → reclassify to A/B/D.
7. **Composite score** (C/E only), now with recency factor:
   - `severity` 1–5 (E: mirror flaw severity; C: capability gain)
   - `fit` 1–5 (1=major redesign, 5=drop-in)
   - `effort` 1–3 (1=<50 lines, 2=50–500, 3=>500 or new dep)
   - `recency` factor: 1.0 if modified in last 6 months, 0.8 if 6–24 months, 0.6 if >24 months
   - `score = round(severity × fit × (4 − effort) × recency)`, max 75
   - **Cross-audit boost**: if feature name appears in 3+ ledger entries → severity +1 (capped at 5) BEFORE the multiplication.
   - Sort C and E by descending score in report.

### Step 6.5 — Hallucination spot-check

Pick **3 random items** from buckets C and E. For each, Read the cited file with `offset: <line-2>, limit: 5`. If the 5-line window does NOT contain the claimed function/class/pattern, FAIL LOUD:
- Mark the item with `⚠ HALLUCINATED — re-verify before action`.
- Re-run Step 6 spot-check on the entire inventory (5 → 10 items).
- Add an "Audit limitations" section noting the hallucination detection.

In `--paranoid` mode, every C/E item gets this check (not just 3 random). Expensive but every claim is bullet-verified.

### Step 6.6 — Resolve documented limitations before reporting (mandatory)

Before writing the report, review every entry in the running "Audit limitations" list. For each flagged file or directory that was NOT read:

1. **Attempt to read it now** if budget permits. Prioritize by: (a) git-churn rank from Step 1.5 — highest-churn unread files first; (b) files flagged as "may contain X" where X matches a domain the audit already found novel findings in.
2. **If budget is exhausted**: explicitly state "Budget exhausted — [file] not read" in the report header. Do NOT silently omit the limitation.
3. **After reading**: run Step 3's Surprises → Bucket drain on any new observations. New C/E items found here get scored and added to the inventory; if score ≥ 20, include in the integration scratch (Step 7.5).

**The rule**: a documented limitation is a promise to the user that something was skipped. That promise must be resolved — either by reading the file, or by explicitly disclosing why it was impossible. Running Steps 7.5 and 7.6 with unresolved limitations produces an incomplete integration scratch.

### Step 7 — Produce report

Use the template at `reference/report-template.md`. Concrete examples in `reference/worked-example.md`. Key sections:

1. **Header**: mode (full/diff/partial), calibration verdict, files scanned, bucket distribution, spot-check pass/fail, inventory artifact paths.
2. **Headline summary table** (new): One row per top-10 E + top-10 C entry. Columns: bucket, score, name, source, 1-line gist. User gets the entire actionable list in 30 seconds before any detail.
3. **Diff-mode delta highlights** (new, when diff mode): "What changed since last audit" — new C items, items that moved buckets, items that disappeared, items whose score changed by ≥15.
4. Detailed sections: E, C, F, G, Expected-but-Absent, Themes, B, A, D, Surprises, Audit-limitations.
5. **Recommended next actions**: ordered list driven by score.

If `--headline-only` was passed, emit only sections 1 + 2 + 5.

### Step 7.5 — Emit integration scratch artifact

Write `steal-integration-<target>-<YYYY-MM-DD>.md` to cwd. Contains **copy-paste-ready** content for `implementation_plan.md` and `flaws.md`.

**"Copy-paste-ready" means code, not summaries.** Each C/E entry in the scratch MUST include a concrete implementation skeleton — function signature + body outline in the target language (TypeScript for Cortex). A one-paragraph "Concept: ..." description does not qualify. If you cannot write a code skeleton, note it explicitly and explain why.

**Phase numbers**: Look up the actual phase number from the Step 1 enumeration or propose a concrete new number (e.g. "Phase 7.3", "Phase 0.15"). **Never write `Phase X.Y` — that is a template placeholder, not a valid phase reference.** If the right phase number is genuinely unclear, write `New Phase — <name>` and leave the number for the human to assign.

**Score threshold**: Include all C/E items with score ≥ 20. If no items score ≥ 20, include the top 3 by score regardless. Never leave the scratch empty for a real audit.

```markdown
# Integration Scratch — <target>

## To paste into flaws.md
<for each F item:>
### Flaw #<next-flaw-num> — <pattern name>
**Severity**: <inferred>
**Description**: <pattern + why-bad>
**Source-of-lesson**: <target>/<file>:<line>

## To paste into implementation_plan.md
<for each C/E item with score ≥ 20 (or top 3 if none qualify):>
### Phase <actual-number> Refinement — <name>
<concrete TypeScript/code skeleton, not a concept summary>

## To update in flaws.md
<backup record of every **Addressed by**: line written in Step 7.6>
```

This artifact bridges the gap between "found this" and "added this." User can review, edit, then paste.

**Multi-file item rule (mandatory before closing Step 7.5):** If a C/E item cites more than one source file (e.g. `propose_claude_md.py:42-200, reflect_claude_md.py:44-268`), ask: "do these files contribute *different behaviors* or just the same behavior implemented across files?" Different behaviors → separate skeleton sections, one per file's contribution. Same behavior → one skeleton is fine. Do NOT let a file's infrastructure (spawning, guards) shadow a file's behavior (the LLM call, the output format) in a single conflated skeleton. Common failure: the spawn/guard code is written, but the actual operation the spawned process performs is omitted.

**Sentence-by-sentence completeness check (mandatory, runs after every skeleton is written):**
1. Re-read the item's "What" description one sentence at a time.
2. For each sentence, find the corresponding line(s) in your skeleton.
3. If a sentence describes behavior with no matching code → add it now.
4. If a sentence describes behavior you cannot implement → note it explicitly with `// TODO: <reason>`.
This check is not optional. An integration scratch that summarizes behavior in prose but omits the code is a Step 7.5 defect.

**Inventory-to-scratch coverage check (mandatory, runs after all skeletons are written):**
Re-read every inventory item with score ≥ 20. Confirm each item has a dedicated skeleton. Items that share source files are NOT automatically merged — each has its own "What" description and must have its own skeleton unless the behaviors are provably identical. If you find an item without a skeleton, add it before finalizing.

### Step 7.6 — Annotate flaws.md with "Addressed by" lines (mandatory)

For **every E item** and **every C item whose `closes_flaw` field is set**, append a ready-to-apply `**Addressed by**:` line directly into that flaw's entry in `flaws.md`:

```
**Addressed by**: Phase <actual-number> Refinement — <name> (<target> audit, score: N)
```

**Never write `Phase X.Y`** — that is a template placeholder. Use the actual phase number from the Step 1 enumeration, or write `New Phase — <name>` if no existing phase applies.

Rules for this step:
1. Locate the flaw in `flaws.md` by Grep-ing for `### <num>.` (e.g. `### 83.`).
2. Read surrounding context to confirm the flaw number matches.
3. Append the `**Addressed by**:` line immediately before the flaw's closing `---` separator (or at the end of the flaw block if no separator exists).
4. If the flaw already has an `**Addressed by**:` line, append to it: `+ Phase X.Y Refinement — <name>` (do not duplicate if the same phase is already cited).
5. For partial closures (e.g., "partially closes Flaw #X"), use `**Partially addressed by**:` instead.
6. Also include these same lines in the integration scratch under a new `## To update in flaws.md` section — so there is always a record of what was written even if the file write fails.

This step makes the flaw→implementation link bidirectional: `implementation_plan.md` says "closes Flaw #X" AND `flaws.md` says "Addressed by Phase Y".

### Step 8 — Audit the auditor (`--quick` skips)

Before publishing, ask:
- *"What would a hostile reviewer say about this report?"*
- *"Which C/E item is the weakest — why didn't I cut it?"*
- *"What did I assume that I should have verified?"*
- *"If I had 2× the budget, what would I have scanned next?"*

Either fix the report, or add an **Audit limitations** section listing what you couldn't verify.

---

## Rules

1. No skim of Cortex plan — phase numbers from the enumeration only.
2. No skim of target — read files, do not assume.
3. No location, no inclusion.
4. Step 6 spot-check is mandatory; Step 6.5 hallucination check is mandatory.
5. Honesty over volume. 4 surgical findings beat 30 padded.
6. No hallucinated features.
7. Theme analysis (Step 5) is mandatory unless `--quick`.
8. Re-classify aggressively; bucket assignment is provisional until verified.
9. Never modify `implementation_plan.md` from inside this skill — emit Step 7.5's scratch file instead. **Exception**: Step 7.6 MUST directly annotate `flaws.md` with `**Addressed by**:` lines; also include those same lines in the scratch file as a backup record.
10. Cortex principles are a hard filter — violators go to D, not C. **This applies to bucket E too.** A feature that violates a Cortex principle cannot be E regardless of which flaw it theoretically closes. If your own counter-case says "requires GPU / requires a cloud API / requires training data", that is a D, not an E.
11. Bucket E is the gold; verify most rigorously.
12. Mark low-confidence items with `⚠ low-confidence`.
13. Monorepo workspaces stay separate in the inventory.
14. Deprecated code → bucket F, not C.
15. Steel-man every C/E — if you can't write a counter-case, it doesn't belong in C/E.
16. Negative-space (Step 4.5) is mandatory unless `--quick`.
17. Diff mode is default when prior inventory exists.
18. Composite scores are ordinal (rank), not absolute (value).
19. F and G are not consolation prizes — respect bucket definitions.
20. JSON sidecar + mtime cache are canonical; keep them in sync with markdown.
21. Budgets are hard caps; emit partial-audit disclosure on exhaustion.
22. Step 8 self-critique is mandatory unless `--quick` — find one weakness before publishing.
23. Hot-path files (Step 1.5) read FIRST. Budget exhaustion must not leave the core unscanned.
24. Public-surface-first for files >500 lines. Full body only on promising signals.
25. Use plain Read/Grep/Glob/Agent only — no Cortex MCP on external targets (scope mismatch).
26. Step 7.5's integration scratch is the bridge from finding to action — emit it every audit.
27. Cross-audit ledger boost applies only when feature *name* matches in 3+ audits — not file path. Avoids treating the same library imported in three repos as three independent findings.
28. Step 7.6 is mandatory for every E item and every C item with `closes_flaw` set — the flaw→implementation link must be bidirectional. Missing an "Addressed by" annotation is treated the same as missing a spot-check.
29. **Multi-file items get multi-section skeletons.** A C/E item citing N source files with distinct behaviors must produce N skeleton sections — one per behavior. Infrastructure (spawn, guards, config) and behavior (the actual operation, LLM call, output format) are always distinct and must never be merged into one skeleton.
30. **Sentence-by-sentence completeness is mandatory.** After writing each skeleton, re-read the item's "What" description sentence by sentence. Every sentence must map to a line of code. Unmapped sentences → add the code or note `// TODO`. Prose summaries without corresponding code are Step 7.5 defects.
31. **Inventory-to-scratch coverage is mandatory.** After writing all skeletons, verify that every inventory item with score ≥ 20 has a dedicated skeleton. Shared source files do not imply merged skeletons — two items from the same file get two skeletons if their described behaviors differ.
32. **F-bucket items require two layers, not one.** Every F item that results in a code-style or pattern rule MUST produce BOTH: (a) a soft layer — `CLAUDE.md` or `flaws.md` entry describing the rule; AND (b) a hard structural layer — a lint rule, CI grep check, pre-commit hook, or `scripts/check-*.ts` that enforces the rule mechanically for ANY agent or contributor regardless of whether they read documentation. A documentation-only addition is a Step 7.5 defect. The structural layer goes in `implementation_plan.md` under the relevant phase (Phase 0.17 for dev hygiene, or the phase that owns the affected module).
33. **LLM-agnostic enforcement is the default.** Any addition to `CLAUDE.md` that encodes a code quality rule must be paired with a structural enforcement mechanism (lint, CI, pre-commit, type system) that works without the agent reading the file. `CLAUDE.md` is a soft hint for Claude Code only. CI is the truth.

---

## Output expectations

- **Final report** is the only mandatory chat deliverable.
- **Three inventory artifacts** written to cwd: `steal-inventory-<target>-<date>.md`, `steal-inventory-<target>-<date>.json`, `steal-inventory-<target>-files.json` (mtime cache).
- **Integration scratch** written to cwd: `steal-integration-<target>-<date>.md` — includes `## To update in flaws.md` section with all `**Addressed by**:` lines (backup record of Step 7.6 writes).
- **Checkpoint** maintained at `steal-checkpoint-<target>.json` for `--resume` support.
- **Cross-audit ledger** updated at `~/.cortex/steal-ledger.json`.
- **Progress streaming** during long Step 2c scans.
- **Partial-audit disclosure** when budgets hit — header explicitly says "Partial Audit" + reason + which budget cap was reached.
- **Confident "nothing worth stealing"** is a valid output; padding is a defect.
- **Surprises** (obscure files with clever tricks) go in `## Surprises`.
- **Low-quality / abandoned / anti-pattern-heavy** targets — say so before the report.
- **In diff mode**, the report headline distinguishes fresh-this-audit vs inherited-from-prior content AND emphasizes deltas.
- **In `--paranoid` mode**, the report header notes "All C/E claims double-verified."
