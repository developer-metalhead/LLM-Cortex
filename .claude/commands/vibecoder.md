# Vibecoder Test Generator

Generate casual, realistic feature-request prompts that secretly test Project Cortex features in a target project. The user will copy-paste these prompts into their target project's AI chat, then paste the results back here for pass/fail verification.

## Step 1 — Read the implementation plan

Read `implementation_plan.md` at the project root. Identify every phase that is marked **✅ Done** or **🚧 In progress**. Extract each phase's:
- Phase number and name
- Key features / DoD items
- What Cortex behavior each feature produces in a target project

## Step 2 — Generate vibecoder prompts per phase

For EACH implemented phase, generate **1–3 casual feature-request prompts**. Rules:

- **Sound like a normal developer.** No mentions of Cortex, knowledge base, MCP, synthesis, entities, constraints, guardrails, ingestion, or any internal terminology. Just a person asking the AI to build something.
- **Be a real feature request.** Not "add a console.log" — something that takes 10+ lines of code and touches real architecture (auth, API, database, new service, refactor).
- **Naturally trigger the Cortex feature.** The prompt must force the AI into the exact scenario where that phase's feature activates. The developer doesn't know this — Cortex does the heavy lifting silently.
- **Be generic enough for any web project** — reference common patterns (auth, users, API routes, database, notifications, caching) that exist in most projects.

### Phase-to-prompt mapping guide

Use this reference to know WHAT each phase's features do in a target project, and design prompts that trigger them:

**Phase 1 (Watcher):** File changes are detected and diffed. Prompt: any code change.
**Phase 2 (LLM Synthesis):** Changes are analyzed by the Librarian. Prompt: any meaningful code change followed by /ingest.
**Phase 3 (Storage):** Knowledge persists in .knowledge/. Prompt: check if entities exist after an ingest.
**Phase 4 (MCP Server):** AI tools can read architecture. Prompt: ask the AI to explain or navigate the codebase.
**Phase 4.5 (IDE Integration):** AI auto-reads knowledge before coding. Prompt: ask for a feature — AI should mention existing architecture without being told.
**Phase 5 (CLI):** cortex status, cortex config work. Prompt: ask about project health or run status.
**Phase 6 (Guardrails):**
  - Pre-flight: AI reads index before any code change
  - Failed approaches: AI avoids patterns previously recorded as failed
  - Constraints (mustNotImport): AI is blocked from illegal imports
  - Constraints (mustNotBeCalledBy): AI is blocked from illegal callers
  - Blast-radius staleness: Changing a foundation entity marks dependents [STALE]
  - Auto-healing: /audit fixes stale entities
  - Typed relationships: New entities get depends_on, called_by, supports, etc.
  - Drift detection: Contradicting existing patterns triggers warnings
  - Smart diffs: Formatting-only changes produce no synthesis
  - failedApproaches dedup & cap: Same failure recorded twice doesn't duplicate
  - Git pre-commit hook: Terminal commit triggers architecture reminder
**Phase 7 (Audit & Traceability):** (when implemented) Evidence anchoring, cortex lint, cortex log.
**Phase 8+ (future):** Reference the plan for features.

## Step 3 — Format output

Present the prompts grouped by phase:

```
---
## Phase N — [Phase Name]

### 🧪 Test N.1 — [Feature Name]

**Copy-paste this into your target project:**

> "[casual vibecoder prompt here]"

**What this secretly tests:** [one sentence — what Cortex feature fires]
**✅ Pass:** [what the AI response should contain or do if Cortex is working]
**❌ Fail:** [what happens if Cortex is NOT working — the absence of the guardrail]

---
```

## Step 4 — Verification instructions

At the end, add this section:

```
---
## How to verify

1. Copy each prompt above into a **fresh conversation** in your target project.
2. Let the AI respond fully (code the feature, run /ingest, etc.).
3. Copy the AI's full response back into this LLM-Cortex conversation.
4. Say: "verify test N.M" and I'll confirm pass or fail.
```

## Step 5 — Summary scorecard

End with a table:

| Test | Phase | Feature | Prompt Theme | Expected |
|---|---|---|---|---|
| 1.1 | 1 | ... | ... | ... |

## Important

- If a phase has NO testable features in a generic web project, skip it and note why.
- If a phase is still 🚧 In progress, mark its tests as **(EXPERIMENTAL — phase not finalized)**.
- Always read the latest implementation_plan.md — do NOT use cached phase lists.
