# Worked Example

Concrete examples of populated bucket-E and bucket-C entries. Use as templates when filling out Step 7's report. The structure here is more useful than the field-by-field schema — pattern-match against it.

---

## Example: Bucket E entry (closes a known flaw)

```
- **Score**: 5 × 4 × 3 = 60
- **Flaw**: #12 — YAML frontmatter injection allows U+2028 line-separator bypass
- **Closed by**: `yamlSafeString()` escape helper
- **Source**: `tools/manifest-parser/src/safe-yaml.ts:42` — `yamlSafeString(input)`
- **How it closes the flaw**: Normalizes U+2028 / U+2029 / null bytes / ASCII C0 control characters BEFORE writing the YAML frontmatter, preventing injection via unicode line-separators that YAML parsers treat as newlines.
- **Counter-case**: Adds ~8ms latency per manifest write — measurable on large monorepo ingests; may need caching if ingest perf becomes a bottleneck.
- **Effort**: small (~30 lines + 1 test fixture)
- **Confidence**: high
```

Notes on this entry:
- The **Score** field shows the arithmetic so a reviewer can verify the math.
- The **Counter-case** is short but specific — "the latency cost is measurable," not generic "this could be bad."
- The **How it closes the flaw** names the exact threat (unicode line-separators) — not vague hand-waving.

---

## Example: Bucket C entry (genuine gap, no flaw mapped)

```
- **Score**: 4 × 5 × 2 = 40
- **Name**: Content-addressed synthesis cache
- **Source**: `packages/synth/src/cache.ts:88` — `class SynthesisCache`
- **What it does**: Wraps every LLM synthesis call with a SHA-256-keyed cache. Identical (prompt + modelId + template-version) inputs return cached output without paying the LLM cost again.
- **Why Cortex benefits**: Re-ingesting the same project (e.g. on branch switches with no actual changes) would skip ~80% of synthesis LLM calls, cutting cost and latency proportionally.
- **Counter-case**: Cache invalidation rules are subtle — stale cache hits could silently mask synthesis regressions if prompt templates evolve without bumping the version key.
- **Proposed placement**: refinement to Phase 17 (LLM cost optimization). Verified Phase 17 exists and is appropriate; no conflict.
- **Integration sketch**:
  ```ts
  const key = sha256(prompt + modelId + EMBEDDING_TEXT_VERSION);
  const hit = await cache.get(key);
  if (hit) return hit;
  const result = await llm.synthesize(prompt);
  await cache.set(key, result, { ttlDays: 30 });
  return result;
  ```
- **Effort**: medium (~200 lines + sqlite migration for the cache table)
- **Concerns**: Requires bumping `EMBEDDING_TEXT_VERSION` whenever prompts change, otherwise stale-cache risk. Mitigation: add a `--no-cache` flag for verification runs.
- **Confidence**: high
```

Notes on this entry:
- The **Integration sketch** is real code, not "TODO: implement caching." Reviewers can judge feasibility from this.
- The **Concerns** field doesn't just list risks abstractly — it offers a mitigation. That's the bar.
- **Confidence** is set independently of score: a medium-effort item can still be high-confidence as a *finding*. Score measures leverage; confidence measures certainty.

---

## What good counter-cases look like (Step 6 requirement)

Strong counter-cases name a specific cost or risk:
- ✅ "Adds 8ms per manifest write; bottleneck on large ingests."
- ✅ "Cortex's Phase 12 already covers 80% of this via different mechanism."
- ✅ "Requires a new sqlite dependency; conflicts with Cortex's zero-binary-deps preference."
- ✅ "Cache invalidation is subtle — stale hits could mask regressions."

Weak counter-cases are vague or hedging:
- ❌ "Might be complex to implement."
- ❌ "Could have unintended consequences."
- ❌ "Not sure if it fits Cortex's vision."

If your counter-case sounds like the weak examples, you haven't actually thought through the downside. Re-evaluate — the item might belong in A/B/D instead.
