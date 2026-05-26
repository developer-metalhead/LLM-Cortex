# Integration Scratch — graphify — 2026-05-24

> Copy-paste-ready additions for `implementation_plan.md` and `flaws.md`.
> Review and edit before pasting. Items with score ≥ 30 included.
> Source audit: `steal-inventory-graphify-2026-05-24.json`

---

## To paste into flaws.md

### Flaw #119 — Bare filename stem used as entity/node ID prefix causes silent collisions
**Severity**: 3 (medium)
**Description**: Entity IDs that use only the filename stem as their prefix (e.g. `models_UserService`) cause silent node-merge collisions when two files have the same name in different directories (e.g. `auth/models.py` and `payments/models.py`). The second entity overwrites the first silently — no error, no duplicate detection.
**Proposed fix**: Qualify entity IDs with at least the parent directory: `{relative_dir}_{stem}_{entity_name}`. Top-level files use `{stem}_{entity_name}`. Add a post-ingest uniqueness check.
**Source-of-lesson**: graphify/CHANGELOG.md:26 — v0.8.13 fix for SQL extractor and Python import resolver

### Flaw #120 — Partial manifest overwrite on incremental run re-extracts entire corpus
**Severity**: 2 (low)
**Description**: If incremental ingest writes the manifest/state file with only the changed-file subset (not the full merged result), the next incremental run sees all unchanged files as "new" and re-extracts everything. The symptom looks like cache invalidation failure.
**Proposed fix**: Always follow load-merge-write pattern: `existing = load_manifest(); existing.update(changed_subset); write_manifest(existing)`. Never write-subset-only.
**Source-of-lesson**: graphify/CHANGELOG.md:147 — v0.8.10 fix (incremental data loss in save_manifest)

---

## To paste into implementation_plan.md

> Match existing style: Phase X.Y Refinement — `title` (emoji, dates, brief body, sub-bullets).

---

### Phase 0.1 Refinement — Sensitive File Detection: _SENSITIVE_DIRS + _SENSITIVE_PATTERNS (score: 60)

**What**: Add a two-stage sensitive-file skip to the ingest pipeline.

**Stage 1** (parent directory check): any parent directory component matches a frozenset of known secrets directories: `.ssh`, `.gnupg`, `.aws`, `.gcloud`, `secrets`, `.secrets`, `credentials`. Files inside these dirs are always skipped regardless of filename.

**Stage 2** (filename regex): 8 patterns using lookarounds (not `\b` — underscore is a word char, so `api_token.txt` would not match `\btoken\b`):
- `.env` / `.envrc` files
- TLS cert/key files (`.pem`, `.key`, `.p12`, `.pfx`, `.cert`, `.crt`)
- Secret keywords: `credential`, `secret`, `passwd`, `password`, `private_key`
- Token files: `token`/`tokens` (separate regex — avoids "tokenizer" false positive)
- SSH keys: `id_rsa`, `id_dsa`, `id_ecdsa`, `id_ed25519`
- Credential stores: `.netrc`, `.pgpass`, `.htpasswd`
- Cloud creds: `aws_credentials`, `gcloud_credentials`, `service_account`

**Where**: `src/security.ts` — `isSensitive(path: string): boolean`. Call in file ingest before content read.

**Source**: graphify `detect.py:42` — `_SENSITIVE_DIRS`, `_SENSITIVE_PATTERNS`, `_is_sensitive()`

---

### Phase 0.4 Refinement — Stat-Based Mtime Fastpath for File Hashing (score: 45)

**What**: Add a process-lifetime stat index for file hash caching. Maps `absPath → {size, mtimeNs, hash}`. `fileHash(path)` checks `size + mtime_ns` first — skips full SHA256 read if unchanged (same trade-off as `make`). Flush index atomically at process exit via `atexit` + temp-file rename.

```typescript
interface StatEntry { size: number; mtimeNs: bigint; hash: string; }
const _statIndex = new Map<string, StatEntry>();

async function fileHash(path: string): Promise<string> {
  const stat = await fs.stat(path);
  const key = normalizePath(path);
  const cached = _statIndex.get(key);
  if (cached && cached.size === stat.size && cached.mtimeNs === stat.mtimeMs * 1_000_000n) {
    return cached.hash;
  }
  const hash = await sha256(await fs.readFile(path));
  _statIndex.set(key, { size: stat.size, mtimeNs: stat.mtimeMs * 1_000_000n, hash });
  return hash;
}
```

Also: `bodyContent(content: string): string` — strips YAML frontmatter before hashing so `updated_at` field changes in entity pages don't invalidate the body hash.

**Source**: graphify `cache.py:17, 27` — `_body_content()`, `_stat_index`, `_flush_stat_index()`

---

### Phase 0.6 Refinement — Dedup Variant-Pair Guards (score: 60)

**What**: Add two guard functions to the dedup pipeline to prevent false merges:

```typescript
// Blocks merge when labels have same stem but different numeric/alpha suffix (chip SKUs)
function isVariantPair(a: string, b: string): boolean {
  if (a === b || Math.max(a.length, b.length) >= 12) return false;
  const VARIANT = /^(.*[a-z])([0-9]+[a-z]*|[a-z]{2,})$/;
  const ma = VARIANT.exec(a), mb = VARIANT.exec(b);
  if (!ma || !mb) return false;
  return ma[1] === mb[1] && ma[2] !== mb[2];  // same stem, different suffix
}

// Blocks short-label fuzzy merge unless same-length single-char substitution
function isShortLabelBlocked(a: string, b: string, jwScore: number): boolean {
  if (Math.max(a.length, b.length) >= 12) return false;
  // Allow only true typos: same length + Damerau-Levenshtein distance 1
  if (jwScore >= 0.97 && a.length === b.length && damerauLevenshtein(a, b) <= 1) return false;
  return true;  // block all other short-label merges
}
```

Apply in the Jaro-Winkler verification step: skip merge if `isVariantPair(a, b)` OR `isShortLabelBlocked(a, b, jwScore)`.

**Source**: graphify `dedup.py:55` — `_is_variant_pair()`, `_short_label_blocked()`

---

### Phase 0.9 Refinement — Dynamic Seed Selection with Score-Gap Threshold (score: 45)

**What**: In `cortex_find` BFS traversal, after IDF scoring, select seed nodes using a gap threshold instead of always taking top-K:

```typescript
function pickSeeds(scored: [number, string][], maxK = 3, gapRatio = 0.2): string[] {
  if (!scored.length) return [];
  const topScore = scored[0][0];
  const seeds: string[] = [];
  for (const [score, nodeId] of scored.slice(0, maxK)) {
    if (seeds.length && score < topScore * gapRatio) break;
    seeds.push(nodeId);
  }
  return seeds;
}
```

When `FooBarService` scores 1000 and `error` nodes score 1.0, only `FooBarService` is seeded. Multiple identifiers all near the top score still get multiple seeds.

Also add `_query_terms()` non-ASCII preservation: filter only English short terms (≤2 chars); CJK/Arabic/Cyrillic always pass.

**Source**: graphify `serve.py:54, 124` — `_query_terms()`, `_pick_seeds()`

---

### Phase 9 Refinement — resolve_seed() Fuzzy Node Lookup — closes Flaw #2 (score: 30)

**What**: Add a fuzzy node resolution step at the start of `impact_analysis` to prevent "Safe to refactor" false results for non-existent entities.

```typescript
function resolveSeed(graph: Graph, query: string): string | null {
  // 1. Exact node ID
  if (graph.hasNode(query)) return query;
  const q = query.toLowerCase();
  // 2. Exact label match (case-insensitive)
  const exactLabel = [...graph.nodes()].filter(n => graph.getNodeAttribute(n, 'label')?.toLowerCase() === q);
  if (exactLabel.length === 1) return exactLabel[0];
  // 3. Exact source_file match
  const exactFile = [...graph.nodes()].filter(n => graph.getNodeAttribute(n, 'source_file')?.toLowerCase() === q);
  if (exactFile.length === 1) return exactFile[0];
  // 4. Label-contains match (returns null if ambiguous — conservative)
  const containsMatch = [...graph.nodes()].filter(n => graph.getNodeAttribute(n, 'label')?.toLowerCase().includes(q));
  if (containsMatch.length === 1) return containsMatch[0];
  return null;  // not found or ambiguous — caller emits "entity not found" error
}
```

Wire into `impact_analysis` tool before BFS: if `resolveSeed(graph, entityName) === null`, return error "Entity not found — provide exact name or node ID."

**Source**: graphify `affected.py:46` — `resolve_seed()`, `AffectedHit`
**Closes**: Flaw #2

---

### Phase 14.1 Refinement — Deterministic Leiden + Community ID Stability (score: 36 each)

**What**: Three improvements to the Phase 14.1 Leiden community detection plan:

**1. Triple-lock determinism**: Sort nodes alphabetically, sort edges by (src, tgt, attrs_json), set `random_seed=42` and `trials=1`. All three are necessary — Leiden is sensitive to insertion order in both node and edge dimensions.

**2. Hub exclusion before partitioning**: `excludeHubsPercentile` (0-100) parameter: compute degree percentile, exclude super-hubs from Leiden, reattach by majority-vote neighbour community. Prevents CLAUDE.md-like files with edges to every node from pulling unrelated subsystems into the same community.

**3. Community ID stability via greedy overlap matching**:
```typescript
function remapCommunitiesToPrevious(
  communities: Map<number, string[]>,
  previousNodeCommunity: Map<string, number>
): Map<number, string[]> {
  // compute all (overlap, oldCid, newCid) triples
  // sort desc by overlap, then asc by oldCid, newCid
  // greedy one-to-one matching
  // assign fresh IDs to unmatched in size-desc + lexical order
}
```

Enables user-edited community label files to persist across rebuilds without drifting.

**4. Cohesion-based second-pass split**: After size-based splitting, re-split communities ≥50 nodes with cohesion < 0.05 (actual intra-edges / maximum possible). Addresses doc-hub bridges.

**Source**: graphify `cluster.py:114, 170, 204, 219` — `cluster()`, `cohesion_score()`, `remap_communities_to_previous()`

---

### Phase 0.15 Refinement — Project-Scoped Skill Installs (score: 45)

**What**: Add `--project` flag to `cortex install` that writes skill files to `.claude/skills/cortex/` (project-local) instead of `~/.claude/skills/cortex/` (global). Enables per-repo MCP or skill customization.

**Implementation**: `cortex install [--project] [--project-dir <path>]`
- Without flag: writes to `~/.claude/skills/cortex/SKILL.md` (global)
- With `--project`: writes to `.claude/skills/cortex/SKILL.md` (project-local, gitignored or checked in)
- `CLAUDE_CONFIG_DIR` env var overrides `~/.claude/` as base for both scopes

**Source**: graphify `__main__.py:71` — `_platform_skill_destination(project=True)`

---

## E-bucket items (closes flaws — implementation references)

### E2 — Community Edge Confidence Breakdown → partially closes Flaw #43

**Implementation reference** (`wiki.py:95`):
```python
conf_counts: Counter = Counter()
for nid in nodes:
    for neighbor in G.neighbors(nid):
        ed = edge_data(G, nid, neighbor)
        conf_counts[ed.get("confidence", "EXTRACTED")] += 1
total_edges = sum(conf_counts.values()) or 1
# Output in ## Audit Trail section:
# EXTRACTED: N (pct%)
# INFERRED: N (pct%)
# AMBIGUOUS: N (pct%)
```

**Cortex adoption path**: Add to `audit_quality` MCP tool output — for each entity/community, include EXTRACTED/INFERRED/AMBIGUOUS edge breakdown. ~30 lines in `src/audit.ts`.

### E3 — diagnose_extraction() → partially closes Flaw #98

**Implementation reference** (`diagnostics.py:156`): Returns `{non_object_edges, missing_endpoint_edges, dangling_endpoint_edges, self_loop_edges, exact_duplicate_edges, directed_same_endpoint_collapsed_edges, relation_variant_groups}`. Key pattern: scan `seen_*` dedup sets in extractor source to identify production suppression sites.

**Cortex adoption path**: Add a `cortex doctor` sub-command that checks: (1) entity ID uniqueness, (2) dangling refs (entity cites source_file that doesn't exist), (3) orphaned relations (edge references unknown entity ID), (4) stale entity ratio. ~150 lines in `src/cli/doctor.ts`.
