# Report Template

Emit this report after Step 8 (or Step 7 with `--quick`). Don't omit sections — write `(none)` to make absence explicit. If `--headline-only`, emit only Header + Headline Summary + Recommended Next Actions.

---

```markdown
# Steal Audit — <target-project-name>

**Audited path**: <absolute path>
**Target type**: <type>
**Last commit**: <sha> @ <branch> (<date>)
**Mode**: Full audit | Diff audit since <prior-sha> (<prior-date>) | Partial audit (budget exhausted) | Stratified (100% core + N% peripheral)
**Calibration**: <Boilerplate | Standard | Novel/Research>
**Files scanned**: <N> (+<M> inherited if diff mode)
**Features catalogued**: <total>
**Bucket distribution**: A=<n>, B=<n>, C=<n>, D=<n>, E=<n>, F=<n>, G=<n>
**Verification**: Spot-check <5/5 passed>, Hallucination check <3/3 passed>, --paranoid: <yes|no>
**Inventory artifacts**: `steal-inventory-<target>-<date>.md|.json|-files.json`
**Integration scratch**: `steal-integration-<target>-<date>.md`

---

## Headline Summary (top 10 E + top 10 C)

| Bucket | Score | Name | Source | One-line gist |
|---|---|---|---|---|
| E | 60 | <name> | `<file>:<line>` | <gist> |
| E | 45 | <name> | `<file>:<line>` | <gist> |
| C | 40 | <name> | `<file>:<line>` | <gist> |
| ... | | | | |

(If `--headline-only`, this is the only feature table emitted.)

## Diff-mode deltas (only when Mode = Diff audit)

**Compared to prior audit `<prior-sha>` (`<prior-date>`)**:

- **New C/E items** (didn't exist last time): <list with scores>
- **Bucket migrations** (item moved buckets): <list, e.g. "X: C → E (a flaw was added)">
- **Disappeared** (in prior inventory, not in current): <list — items that were removed from target>
- **Score changes ≥ 15**: <list of items with old-score → new-score and reason>

---

## E. Flaw Closures (highest priority — act on these first)

**Sorted by composite score (severity × fit × (4−effort) × recency), descending.**

For each:
- **Score**: <severity> × <fit> × <4−effort> × <recency> = <total>
- **Flaw**: #<num> — <title from flaws.md>
- **Closed by**: <feature name>
- **Source**: `<target>/<file>:<line>` — `<func/class>`
- **Last modified**: <ISO date>  •  **Has tests**: yes|no
- **How it closes the flaw**: <specific mechanism, 1–2 sentences>
- **Counter-case**: <1-sentence reason this might be a bad idea>
- **Effort**: small (<50 lines) / medium (50–500) / large (>500 or new dep)
- **Confidence**: high / medium / low <⚠ low-confidence if applicable>

## C. Worth Stealing (genuine gaps, no flaw mapped)

**Sorted by composite score, descending.**

For each:
- **Score**: <severity> × <fit> × <4−effort> × <recency> = <total>
- **Name**: <short title>
- **Source**: `<target>/<file>:<line>` — `<func/class>`
- **Last modified**: <ISO date>  •  **Has tests**: yes|no
- **What it does**: <1–2 sentences>
- **Why Cortex benefits**: <specific capability gain>
- **Counter-case**: <1-sentence reason this might be a bad idea>
- **Proposed placement**: refinement to Phase <actual-number> (verified exists in enumeration) / New Phase — <name> (if no existing phase fits)
- **Integration sketch**: <concrete TypeScript function skeleton — signature + body outline. Never pseudocode or a concept summary. If you cannot write a skeleton, say why.>
- **Effort**: small / medium / large
- **Concerns**: <deps, complexity, risk>
- **Confidence**: high / medium / low

## F. Anti-Patterns (lessons to AVOID)

For each:
- **Pattern**: <name>
- **Where**: `<target>/<file>:<line>` — `<func/class>`
- **Why it's bad**: <1–2 sentences>
- **Why the target might have chosen it**: <1 sentence>
- **Proposed Cortex action**: add to `flaws.md` as "<text>" OR CLAUDE.md rule OR design note (see integration scratch)

## G. Open Questions (design decisions Cortex hasn't made)

For each:
- **Question**: <precise interrogative sentence>
- **Triggered by**: `<target>/<file>:<line>` — <what target did>
- **Target's answer**: <1 sentence>
- **Cortex's options**: <2–3 alternatives>

## Expected but Absent (negative-space findings)

Features industry-standard for <domain> that the target does NOT have:

- **Feature**: <name>
- **Why standard for <domain>**: <1 sentence>
- **Cortex status**: has it (Phase <actual-number>) | missing too — potential roadmap item

## Theme-Level Findings

<architectural / operational / security / performance / UX / testing / DX themes>

## B. Cortex Has a Superior Version (skip)

For each:
- **Their feature**: <name> at `<file>`
- **Cortex's version**: Phase <actual-number> — <why Cortex's is better>
- **Case for target's approach**: <1-sentence steel-man>

## A. Already in Cortex (skip)

Group by Cortex phase to compress:
- **Phase <X.Y>**: <their features that match>

## D. Niche / Wrong Fit (skip)

- **Feature**: <name>
- **Cortex principle violated**: <which principle>
- **Why not**: <1 sentence>

## Surprises (optional)

<obscure files with clever tricks, or (none)>

## Audit limitations (only if partial/budget-exhausted/hallucinations-found)

- **Budget hit**: <which cap was reached>
- **What was skipped**: <directories, file types, agent retries>
- **What couldn't be verified**: <spot-checks failed, hallucinations detected, etc.>
- **Recommendation**: <re-run with --full / focus on subdirectory / accept partial>

---

## Recommended next actions

Prioritized (composite score guides order within E and C):
1. **Flaw closures** (E) — top of E by score → see integration scratch for paste-ready text
2. **High-confidence steals** (C) — top of C by score → see integration scratch
3. **Anti-patterns** (F) — file `flaws.md` entries to capture lessons
4. **Open questions** (G) — surface to user for design decisions
5. **Theme-level changes** — often higher leverage than single features
6. **Expected-but-absent items** — Cortex roadmap candidates
7. **Medium/low-confidence items** — design work needed first

## Inventory artifacts

- Human report: `steal-inventory-<target>-<date>.md`
- Canonical JSON: `steal-inventory-<target>-<date>.json`
- File mtime cache: `steal-inventory-<target>-files.json`
- Integration scratch (paste-ready): `steal-integration-<target>-<date>.md`
- Cross-audit ledger: `~/.cortex/steal-ledger.json` (appended)
```
