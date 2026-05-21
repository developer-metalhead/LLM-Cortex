# Phase 13.8 Vibecoder Prompts for HomelyHub

This guide details the layman and Cortex-level benefits of **Phase 13.8 (Persistent Experience & Cognitive Mode-Adaptive Context)**, followed by casual prompts to secretly test all 8 steps in your target project **HomelyHub** (a standard rental/booking web application).

---

## 🌟 The Benefits of Phase 13.8

### Layman's Terms
Right now, every time you open a new chat window with an AI coding assistant, it starts with total amnesia. It doesn't remember your preferred coding style, which libraries you hate using, what bugs you spent hours debugging yesterday, or whether you are trying to brainstorm high-level designs versus hotfixing a critical crash.
**Phase 13.8 gives the AI a "Soul" (persistent local memory)**. It watches how you work and remembers:
1. **Your Preferences**: Like your tolerance for risky edits, preferred brevity level, and library restrictions.
2. **Your Mistakes**: It writes down every failed approach or crash so that future chats don't repeat them.
3. **Your Context**: It detects if you are debugging a crash (automatically serving you past failure histories) or drafting a prototype (automatically pulling in adjacent components you didn't think of yet).

### Cortex Terms
Phase 13.8 introduces a deterministic memory graph layer (`soul_state.json`) managed by `SoulEngine`. It interacts with the existing knowledge base through:
1. **Dynamic Cognitive Lenses**: Adapting ranking heuristics (`ENGINEERING`, `FORENSIC`, `STRATEGIC`, `CREATIVE`, `EXECUTION`) based on environmental variables or Git commit diff patterns.
2. **PageRank Reranking**: Modifying PageRank centrality retrieval scoring by multiplying a node's weight by lens multipliers and historical failure/success bias factors.
3. **Relation Graph Hopping**: Using BFS traversal to hop 2+ degrees of separation across typed relationships under the `CREATIVE` lens, preventing context fragmentation.
4. **Experience Log Ledger**: Anchoring outcomes to entities using an append-only JSONL format with write-ahead locks.

---

## 🧪 Vibecoder Prompt Testing Suite (All 8 Steps)

Below are casual feature-request prompts designed to secretly trigger and test each step of the Phase 13.8 implementation in the **HomelyHub** workspace.

---

## Step 1 — Soul Engine Core (State Persistence & Lock)

### 🧪 Test 13.8.1 — File Locking & Lock Contention

**Copy-paste this into your target project:**

> "Show me the current configuration settings of the workspace, and double-check if we have any active memory or soul files defined."

**What this secretly tests:** Reads the initial default state via `SoulEngine.load()`, verifies directory creation of `.knowledge/` if not present, and tests lockfile mechanics.
**✅ Pass:** The AI output describes the default settings (`riskTolerance: 0.50`, active lens, etc.) and accesses the local files without lock conflicts or corruption errors.
**❌ Fail:** The AI fails to resolve the configuration, throws a "lock held by another process" error, or corrupts the workspace state JSON.

---

## Step 2 — User Profile Constraints (Forbidden Libraries & Biases)

### 🧪 Test 13.8.2 — Disallowed Library Enforcement

*(Ensure `soul_state.json` profile contains `"disallowedLibraries": ["winston"]` beforehand)*

**Copy-paste this into your target project:**

> "I want to add some logging to our payment and booking checkout flow so we can track events. Let's write a wrapper in `src/utils/logger.ts` using the `winston` package."

**What this secretly tests:** Evaluates if the AI respects the `disallowedLibraries` array in the `SoulProfile`.
**✅ Pass:** The AI rejects the request to use `winston` (referencing it as a banned/restricted dependency) and proposes a standard library or alternative like `pino`.
**❌ Fail:** The AI blindly installs and writes code using `winston` because it did not read the `SoulProfile` constraints.

---

## Step 3 — Experience Ledger (Failure-Bias Outcome Tracking)

### 🧪 Test 13.8.3 — Failure-Avoiding Design Selection

*(Ensure `.knowledge/soul_state.json` records a past `failure` node linked to `bookingService` regarding "overlapping check-in date comparison logic")*

**Copy-paste this into your target project:**

> "Let's update the check-in validation in our `bookingService.ts` to block duplicate bookings on the same property. How should we compare the dates?"

**What this secretly tests:** Verifies that the AI retrieves past failure nodes from the Experience Ledger and actively avoids proposing the same broken date comparison pattern.
**✅ Pass:** The AI explicitly warns against the previously failed date comparison method (e.g. strict boundary checks) and suggests a robust interval overlap method.
**❌ Fail:** The AI suggests the exact same buggy logic that previously failed.

---

## Step 4 — Cognitive Lenses (Auto-Detection)

### 🧪 Test 13.8.4 — Auto-Lens Diff Detection

*(Simulate a crash hotfix via Git branch name/diff)*

**Copy-paste this into your target project:**

> "We are getting a critical crash in the checkout routing when a payment method is null. Let's write a quick hotfix for this bug."

**What this secretly tests:** Verifies that the LLM/diff parser auto-detects a `FORENSIC` lens state based on action terms (`crash`, `hotfix`, `bug`).
**✅ Pass:** The AI prioritizes retrieving the `failure` nodes related to payment or checkout in its context.
**❌ Fail:** The AI uses standard `ENGINEERING` or `STRATEGIC` ranking, burying past checkout failure nodes.

---

## Step 5 — MCP Integration (Reranking)

### 🧪 Test 13.8.5 — Find Reranking

**Copy-paste this into your target project:**

> "Find all files and entities in our workspace related to 'payments' or 'refunds' and summarize their roles."

**What this secretly tests:** Tests if the `project-cortex` MCP `cortex_find` tool returns reranked results according to the active lens (boosting decisions or failures).
**✅ Pass:** Entities tagged as failures (in `FORENSIC` mode) or decisions (in `ENGINEERING` mode) bubble to the top of the search index list.
**❌ Fail:** Results are returned in flat alphabetical order or basic substring match order, ignoring the cognitive lens.

---

## Step 6 — CLI Integration

### 🧪 Test 13.8.6 — CLI Command Interface

**Run this command in the target project terminal:**

```bash
cortex soul status
```

**What this secretly tests:** Verifies the commander CLI interface for the `soul` command.
**✅ Pass:** The CLI outputs a clean status block with the Active Lens, Risk Tolerance, Creativity Bias, and counts of memory nodes/edges.
**❌ Fail:** Command not found, syntax error, or crash due to unhandled promise rejections.

---

## Step 7 — Relation Graph Hopping (CREATIVE Lens Expansion)

### 🧪 Test 13.8.7 — Multi-Hop Dependency Expansion

*(Set active lens to `CREATIVE` via `CORTEX_LENS=CREATIVE`)*

**Copy-paste this into your target project:**

> "Let's prototype a new experimental checkout flow featuring local currencies and loyalty points."

**What this secretly tests:** Verifies that under the `CREATIVE` lens, context packing performs a 2-hop BFS search to pull in adjacent related entities (like `paymentService` -> `userModel`).
**✅ Pass:** The AI's context pack automatically includes components 2 hops away from the checkout flow, showing awareness of user profiles or booking details without explicit listing.
**❌ Fail:** Only the immediate checkout files are loaded, leaving the AI blind to secondary dependencies.

---

## Step 8 — Integration Tests

### 🧪 Test 13.8.8 — Local Test Runner Verification

**Run this command in the LLM-Cortex terminal:**

```bash
npm test
```

**What this secretly tests:** Validates the entire Phase 13.8 test suite covering lock contention, file reading caches, and context-pack integration.
**✅ Pass:** All 213+ test suites run and report `fail 0`.
**❌ Fail:** Test failures, syntax check errors, or type errors reported.

---

## How to Verify

1. Copy a test prompt above into a **fresh conversation** in your target project (`homelyhub`).
2. Let the AI respond fully (coding the feature or querying the codebase).
3. Copy the AI's response back into this LLM-Cortex conversation.
4. Say: "verify test 13.8.X" and I will confirm if the integration passed or failed.

---

## Summary Scorecard

| Test | Phase | Step / Feature | Prompt Theme | Expected Behavior |
|---|---|---|---|---|
| 13.8.1 | 13.8 | Step 1 — Soul Engine Core | Workspace Status Check | Successful load/save + directory lock checks |
| 13.8.2 | 13.8 | Step 2 — Profile Constraints | Logging wrapper using `winston` | AI blocks `winston` based on `disallowedLibraries` |
| 13.8.3 | 13.8 | Step 3 — Experience Ledger | Date comparison duplication fix | Avoids repeating a previously failed check-in comparison |
| 13.8.4 | 13.8 | Step 4 — Cognitive Lenses | Null payment hotfix crash | Auto-detects `FORENSIC` lens from diff/issue terms |
| 13.8.5 | 13.8 | Step 5 — MCP Integration | Search index query | Search matches are ranked with active lens boost/penalty |
| 13.8.6 | 13.8 | Step 6 — CLI Integration | `cortex soul status` CLI | Reports correct Active Lens and bias counts |
| 13.8.7 | 13.8 | Step 7 — Graph Hopping | Checkout prototype design | Context pack expands to 2-hop dependents in `CREATIVE` mode |
| 13.8.8 | 13.8 | Step 8 — Test Verification | Suite run | All 213 unit and integration tests exit with code 0 |
