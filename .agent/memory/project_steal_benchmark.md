# Steal Skill — LLM Benchmark

User is running a head-to-head benchmark of the `/steal` skill: Gemini vs. Claude on the same external project target.

**Why:** Determine which LLM produces higher-quality steal artifacts before committing to one for future audits.

**Status:** Pending — Gemini run not yet completed.

## Quality signals to compare

When both artifact sets are available, evaluate each on:

| Signal | What to look for |
|--------|-----------------|
| Spot-check pass rate | Did the LLM hallucinate file locations? Re-open cited file:line — does the claimed symbol exist? |
| Counter-case discipline | Every C/E item must have a written reason NOT to steal it. Missing counter-cases = uncritical padding. |
| Score calibration | Are scores differentiated across a range, or everything bunched at 40-60? Padded audits inflate C buckets. |
| Bucket D honesty | 15-20% D items is healthy. Low D% means the auditor is too credulous. |
| Step 7.6 execution | Did it actually write "Addressed by" lines back to flaws.md, or just produce the scratch file? |
| Integration scratch quality | Are the Phase X.Y Refinement blocks detailed enough to paste directly, or vague summaries? |
| Coverage | Did it miss hot-path files or major features? Check against the target's README and top-level exports. |
| Bucket distribution sanity | A mature target should produce: A=20-40%, B=5-10%, C=15-30%, D=10-20%, E=5-15% |
