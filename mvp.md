# Project Cortex — Commercial Tier Matrix & Monetization Strategy

> **Last updated**: 2026-05-21
> **Source of truth**: [implementation_plan.md](implementation_plan.md) (11,409 lines, 70+ phases)
> **Distribution**: npm (`projectcortex`) — all code is public on npmjs

---

## 📊 Phase Inventory Summary

| Category | Phase Count | Status |
|---|---|---|
| ✅ Shipped (core) | 18 phases | Done |
| ⏳ Planned (production) | ~30 phases | Near-term |
| ⏳ Planned (enterprise) | ~25 phases | Enterprise tier |
| ⏳ Planned (research-grade) | ~80+ phases | Long-term R&D |
| ⏳ Planned (add-on / cross-domain) | ~60+ phases | Add-on modules |

---

## 🔓 Monetization on npm — The Open-Core Model

### The Problem

All code ships to npm. Anyone can `npm install projectcortex`. You cannot hide source code. Traditional license-key DRM is trivially bypassable in Node.js (users just patch your `if (hasLicense)` check).

### The Solution: Feature-Flag Gating via Remote License Server

```
┌─────────────────────────────────────────────────────────────┐
│                    npm: projectcortex                        │
│                                                             │
│  ┌───────────┐   ┌──────────────┐   ┌────────────────────┐ │
│  │ Free Core │   │ Pro Features │   │ Enterprise Features│ │
│  │ (always   │   │ (gated by    │   │ (gated by          │ │
│  │  works)   │   │  license     │   │  license           │ │
│  │           │   │  token)      │   │  token)            │ │
│  └───────────┘   └──────┬───────┘   └─────────┬──────────┘ │
│                         │                      │            │
│                    ┌────▼──────────────────────▼────┐       │
│                    │  src/core/license.ts            │       │
│                    │  ──────────────────────────     │       │
│                    │  • Validates JWT license token  │       │
│                    │  • Caches validation offline    │       │
│                    │    (72h grace period)           │       │
│                    │  • Checks tier: free|pro|team|  │       │
│                    │    enterprise                   │       │
│                    │  • Feature flags per tier       │       │
│                    └────────────┬───────────────────┘       │
│                                │                            │
└────────────────────────────────┼────────────────────────────┘
                                 │
                    ┌────────────▼───────────────┐
                    │  license.cortex.dev         │
                    │  ────────────────────────── │
                    │  • Issues signed JWT tokens │
                    │  • Stripe subscription      │
                    │  • Usage metering           │
                    │  • 72h offline grace        │
                    └────────────────────────────┘
```

### How the Gate Works (Technical)

```typescript
// src/core/license.ts — The single paywall enforcement point

export type Tier = 'free' | 'pro' | 'team' | 'enterprise';

interface LicensePayload {
  tier: Tier;
  org: string;
  seats: number;
  features: string[];    // explicit feature flags
  exp: number;           // JWT expiry
  iat: number;
}

// Feature gate — called before any paid feature executes
export function requireTier(minimumTier: Tier): void {
  const current = getCachedLicense();
  if (tierRank(current.tier) < tierRank(minimumTier)) {
    throw new CortexLicenseError(
      `This feature requires Cortex ${minimumTier}. ` +
      `Upgrade at https://cortex.dev/pricing`
    );
  }
}

// Example usage in a paid feature:
export async function runDeepBootstrap(opts: BootstrapOpts) {
  requireTier('pro');  // ← Single line. That's the entire gate.
  // ... actual Phase 33 logic
}
```

### Why This Works Even Though Code is Public

1. **The code is visible, but the server isn't.** `license.cortex.dev` is your private infrastructure. Without a valid JWT from your server, `requireTier()` throws. Users can read the Pro code but can't execute it without paying.

2. **Patching is possible but costly.** A determined hacker can comment out `requireTier()` calls. But:
   - They lose automatic updates (you ship fixes weekly)
   - They lose the license server's online features (usage analytics, team seat management)
   - They have to re-patch every `npm update`
   - Their fork diverges and rots within weeks
   - If they're an enterprise, their legal team won't allow it

3. **72-hour offline grace.** License tokens are cached locally. Cortex works offline for 72 hours after last validation. Respects local-first principle. After 72h without internet, paid features gracefully degrade to free tier (not a hard crash).

4. **The real lock-in is the data, not the code.** After 6 months of use, their `.knowledge/` contains irreplaceable institutional memory. Switching to a cracked fork means losing update compatibility, support, and eventually data migration paths.

---

## 🏗️ Tier Architecture (7 Tiers + OSS Program)

```
  $0          $9/$90     $24/$240   $29/$290     $49/$490     $99/$990      Custom
   │           │           │      /seat  /seat   /seat         /seat         │
   │           │           │      /yr    /yr     /yr           /yr           │
   ▼           ▼           ▼           ▼            ▼            ▼            ▼
 ┌────┐   ┌────────┐   ┌──────┐   ┌─────────┐   ┌──────┐   ┌──────────┐   ┌────────────┐
 │Free│──▶│ Hobby  │──▶│ Pro  │──▶│ Startup │──▶│ Team │──▶│ Business │──▶│ Enterprise │
 │    │   │        │   │      │   │         │   │      │   │          │   │            │
 │∞   │   │∞       │   │∞     │   │∞        │   │∞     │   │∞         │   │∞           │
 │ent.│   │ent.    │   │ent.  │   │ent.     │   │ent.  │   │ent.      │   │ent.        │
 └────┘   └────────┘   └──────┘   └─────────┘   └──────┘   └──────────┘   └────────────┘
   │
   └──▶ 🌿 OSS Program (Free Pro for qualifying open-source projects)

Annual billing saves ~17% ($90/yr vs $108 for month-to-month).
```

---

### 🆓 Tier 0: Free — $0/forever

**Target**: Every developer on Earth. Students, indie hackers, senior staff engineers, open-source maintainers.
**Philosophy**: The free tier IS Cortex. Not a demo, not a trial, not a crippled preview. If the free tier doesn't make you say "holy shit, this is incredible" within 20 minutes, the product has failed — no amount of paid features will save it.
**Hook**: The "holy shit" moment is watching `.knowledge/` auto-populate as you code, then querying it through your AI agent.
**Why generous free works**: Cortex's cost is borne by the user's own LLM API key, not by us. We don't pay for their synthesis calls — they do. Our marginal cost per free user is effectively **zero**. The only cost is the license server infrastructure, which is negligible.

> **💡 First run?** You get a **14-day Pro trial** automatically — no credit card, no activation key, no website visit. Just `npm install projectcortex` and go. All Pro features work immediately. After 14 days, it gracefully downgrades to Free. `cortex subscribe` to keep Pro.

| Phase | Feature |
|---|---|
| 1-5 | Full core pipeline: watcher, auto-synthesis, storage, MCP, CLI |
| 6 | Constraints & blast-radius (unlimited rules) |
| 7 | Full audit trail (`cortex log`, quality scores, lint, evolution) |
| 7.5 | Quality scoring (read-only — view scores, can't customize formulas) |
| 8 | **Live interactive knowledge graph** (WebSocket, not static HTML) |
| 8.1 | Live graph streaming |
| 9 | Refactoring impact preview |
| 10 | Onboarding & guided reading |
| 13, 13.1-2, 13.4-5 | Context packs, brevity, budget gating, fuzzy search |

Everything is **unlimited** — entities, syncs, constraints, workspaces, agents, context tokens. The only thing that varies between tiers is **which phases (features) you get**, not how much of them you can use.

**What Free does NOT include** (these are the upgrade triggers):

| Missing Feature | Upgrade To | Why |
|---|---|---|
| LLM caching, cost analytics | **Hobby** ($9) | Saves 30-60% on API costs — pays for itself. You're paying for the same synthesis twice. |
| Deep bootstrap | **Hobby** ($9) | Without it, `cortex watch` synthesizes one file at a time as you edit. Phase 33 batch-scans the whole project upfront. |
| Soul, advisor, custom quality, CI, tech debt | **Pro** ($24) | Your Librarian learns your patterns, advises on refactors, keeps knowledge healthy. |
| Multi-agent, federation, shared knowledge | **Startup/Team** ($29-49/seat) | Collaboration features teams need — central server, multi-repo, multi-agent. |
| SSO, RBAC, audit, compliance, air-gap | **Business/Enterprise** ($99+/seat) | Procurement-driven. "Legal says yes." |

---

### 🪴 Tier 1: Hobby — $9/month or $90/year (save ~17%)

**Target**: Devs who use Cortex daily and want it to be smarter and cheaper.
**Key unlock**: LLM caching (literally pays for itself), deep bootstrap, cost analytics.
**Hook**: "Costs $9, saves you $30+ on API calls. It's a negative-cost upgrade."
**Pitch**: "Cortex Hobby saves you more on LLM costs than it costs. Within days, caching pays for the subscription and you're net-positive."

| Phase | Feature | Why This Tier |
|---|---|---|
| 3.1 | LLM caching store | **Saves 30-60% on API costs** — pays for itself within days |
| 7.6 | Global architectural lessons log | Institutional memory across sessions |
| 12 | Git & CI integration (basic) | Automated workflow integration |
| 13.3 | Token & cost savings ledger & analytics | See exactly where your LLM budget goes |
| 33 | Deep bootstrap | 4× better first-run experience |

No numeric limits — all caps are **unlimited**. Upgrade unlocks features, not breathing room.

---

### 💎 Tier 2: Pro — $24/month or $240/year (save ~17%)

**Target**: Professional solo devs, freelancers, senior engineers. The core individual tier.
**Key unlock**: Soul, architectural advisor, custom quality formulas, tech debt register.
**Hook**: "Your Librarian learns your patterns, advises on refactors, and keeps your knowledge healthy. After 2 weeks, switching tools feels like losing a teammate."

| Phase | Feature | Why This Tier |
|---|---|---|
| 5.9 | Shell status prompt & statusline badge | DX polish |
| 7.5+ | Custom quality formulas & unlimited constraints | Power-user governance |
| 7.7 | Automated tech debt register | High-value advisor |
| 7.8 | Graph-driven review advisories | Review acceleration |
| 7.9 | Knowledge garbage collection & archive | Auto-maintenance |
| 8.2 | Karpathy-style Obsidian wiki compliance | Premium formatting |
| 9.1 | Dependency path querying | Advanced navigation |
| 12.2 | Git pre-commit guardrail hooks | CI integration |
| 12.3 | Architecturally aware commit generation | Smart commits |
| 13.6 | Proximity reranking & smart snippets | Better search |
| 13.8 | Persistent experience & cognitive context (Soul) | Personalization engine |
| 14 | Large-diff clustering | Big refactors |
| 20 | Intelligent architectural advisor | AI suggestions |
| 20.1 | Architecture simulation & what-if analysis | Modeling |
| 20.3 | Design pattern suggestion | Pattern detection |
| 20.5 | Architecture documentation generation | Auto-docs |
| 20.5.1 | Automated ADR engine | Decision records |
| 20.13 | Pattern skill library (VOYAGER) | Learns your patterns |
| 20.19 | Surgical knowledge editing (ROME/MEMIT) | Precision edits |
| 20.22 | Spaced repetition & forgetting curves | Memory hygiene |
| 20.28 | Agentic retrieval loop (multi-hop, self-correcting) | Complex query mastery |
| 20.29 | Corrective RAG module (quality gate + web fallback) | Hallucination prevention |
| 20.30 | Iterative RAG refinement (gap detection + re-retrieval) | Evidence completeness |
| 33 | Deep bootstrap | Deep first-run |

No numeric limits — all caps are **unlimited**.

---

### 🌱 Tier 3: Startup — $29/seat/month or $290/seat/year — 2-10 seats

**Target**: Early-stage teams, small agencies, indie studios. Team features at startup prices.
**Key unlock**: Multi-agent, shared knowledge, basic federation — everything a small team needs.
**Hook**: "Multi-agent, shared knowledge, polyrepo — team features at startup prices."

#### Everything in Pro, plus:

| Phase | Feature | Why This Tier |
|---|---|---|
| 4.6 | Developer API & client SDKs | Programmatic access |
| 4.8 | Persona-specific MCP prompts | Multiple personas |
| 5.6 | Daemon watchdog & self-healing | Reliability |
| 7.10 | Sensitive data & API secret sanitization | Team security |
| 10.2 | Smart rule file patching | Shared rules |
| 11 | Monorepo federation | Multi-package repos |
| 16 | Contradiction-aware retrieval | Conflict detection |
| 20.7 | Personalized per-developer memory | Per-dev profiles |
| 20.7.2 | Mem0-style memory consolidation pipeline | Self-curating memory |
| 20.7.3 | Prospective memory & belief revision (Kumiho-inspired) | Future-aware memory |
| 53.2 | Universal Librarian definition schema | Shared agents |
| 56 | Multi-operator session coordination | Concurrency |

No numeric limits — all caps are **unlimited**. Upgrade unlocks features, not breathing room.

---

### 👥 Tier 4: Team — $49/seat/month or $490/seat/year — 5-50 seats

**Target**: Mid-size engineering teams. Full multi-agent, multi-repo, shared governance.
**Key unlock**: Central server, polyrepo federation, human-in-the-loop review, compliance templates.
**Hook**: "Central knowledge server, cross-repo federation, human-reviewed quality gates."

#### Everything in Startup, plus:

| Phase | Feature | Why This Tier |
|---|---|---|
| 4.7 | OpenAI-compatible REST gateway | API for internal tools |
| 5.7 | Scheduled operations & cron engine | Automation |
| 14.2 | Topological hierarchy & RAPTOR retrieval | Large codebase nav |
| 17 | Active disambiguation via self-consistency | Quality guard |
| 17.1 | Multi-model architectural debate | Cross-LLM verification |
| 21 | Polyrepo federation | Multi-repo unification |
| 22 | Central knowledge server | Shared dashboard |
| 23 | Human-in-the-loop review | Team review workflow |
| 24 | Compliance constraint templates | Org-wide policy |
| 53.6 | Bidirectional Librarian↔IDE sync | IDE portability |
| 57 | Cross-agent workspace state sync | Agent coordination |
| 58 | Multi-agent Librarian collaboration | Specialist agents |

No numeric limits — all caps are **unlimited**. Upgrade unlocks features, not breathing room.

---

### 🏛️ Tier 5: Business — $99/seat/month or $990/seat/year — 10-200 seats

**Target**: Larger orgs that need compliance, audit trails, and integrations but aren't full enterprise.
**Key unlock**: RBAC, immutable audit, workflow integrations, FinOps, executive dashboards.
**Hook**: "SSO, RBAC, immutable audit, Jira/Slack integration — 'Legal says yes.'"

#### Everything in Team, plus:

| Phase | Feature | Why This Tier |
|---|---|---|
| 25 | Enterprise SSO (SAML 2.0, OIDC) | IT requirement |
| 26 | RBAC, ABAC & immutable audit trail | Compliance |
| 26.1 | DLP & knowledge-layer PII redaction | Data protection |
| 26.3 | OpenTelemetry tracing & observability | Monitoring |
| 28 | Enterprise workflow integrations hub | Jira, Slack, Teams |
| 29 | FinOps — cost governance & chargeback | Finance |
| 30 | Knowledge migration & legacy ingest | Onboarding |
| 31 | Executive analytics, ROI dashboard & KPIs | CTO reporting |
| 33.1 | Model provider registry & cost-tier routing | Multi-LLM governance |
| 33.2 | Remote operations & mobile status PWA | Mobile access |

No numeric limits — all caps are **unlimited**. Upgrade unlocks features, not breathing room.

---

### 🏢 Tier 6: Enterprise — Custom pricing (starts ~$199/seat/month)

**Target**: Large engineering orgs (200-5000+ devs), regulated industries, government, defense.
**Key unlock**: Air-gap, BYO-key, cross-tenant federation, cryptographic signing, SOC2 pack.
**Hook**: "Air-gapped, BYO-key, SOC2-ready. Deploys where your compliance requires it."

#### Everything in Business, plus:

| Phase | Feature | Why This Tier |
|---|---|---|
| 25.1 | Federated identity for cross-tenant workflows | Multi-org |
| 26.2 | Policy-as-code (OPA/Cedar) | Governance automation |
| 26.4 | Cryptographic event signing & non-repudiation | Legal compliance |
| 27 | Air-gapped, sovereign & BYO-key deployment | Government/defense |
| 29.1 | Approved model allowlists & provider governance | Security policy |
| 29.2 | Tenant-scoped billing & metering | Multi-team accounting |
| 30.1 | External AI conversation import | Migration |
| 30.2 | Knowledge base merge engine | M&A consolidation |
| 32 | Vendor risk, procurement pack & certifications | SOC2/ISO |
| 32.1 | Cloud marketplace listings (AWS/GCP/Azure) | Procurement channel |
| 32.2 | SBOM & SLSA supply chain security | Security |
| 50-55 | Distributed cognitive substrate (full suite) | Enterprise memory |
| 53+ | Full agent mesh runtime orchestration | Multi-agent at scale |
| 54 | Cross-agent memory federation protocol | Data governance |
| 55 | Cognitive substrate observability | Operations dashboard |

| Dimension | Enterprise |
|---|---|
| Seats | Unlimited (volume discounts) |
| Deployment | Self-hosted, air-gapped, cloud, hybrid |
| SSO | SAML 2.0, OIDC, SCIM provisioning |
| Audit | Immutable, signed, SOC2-ready |
| SLA | 99.9% uptime guarantee |
| Agents | Unlimited |
| Support | Dedicated account manager, private Slack |

---

### 💵 Refund Policy

**30-day money-back guarantee** on all paid tiers. First purchase only (not repeat cancellations).

Why: Removes purchase anxiety. "Try Pro free for 14 days, buy it, and if it doesn't deliver value within 30 more days, get your money back." The 14-day trial + 30-day refund = 44 risk-free days. Combined with "Cortex saves you $30+/mo on API calls" (Hobby), the financial case is irrefutable.

Processing: `cortex subscribe` → Stripe handles refunds. License key deactivated on refund. Data preserved (`.knowledge/` still works on Free tier — they keep their knowledge base).

### 🌿 OSS Program — Free Pro for Qualifying Open-Source Projects

**Eligibility**: Public repo, ≥100 stars OR accepted into a recognized OSS foundation, active development.
**What they get**: Full Pro tier, no cost. Badge on `cortex status`: `🌿 Open Source Program`.
**Why**: OSS maintainers are the most influential dev segment. They blog, give talks, and write tutorials. One popular OSS project using Cortex = thousands of eyeballs.
**Application**: `cortex apply-oss --repo <github-url>` → auto-verified via GitHub API (public, star count, commit recency).

---

## 🧪 Research-Grade Phases — Not Tiered (Internal R&D)

These phases are **not sold**. They are long-term R&D that feeds into future tier features when mature:

| Phase Range | Category | Purpose |
|---|---|---|
| 15, 18-19 | ML/Research | CI feedback loops, embeddings, distillation |
| 20.2, 20.6, 20.8-20.11 | Memory Research | Advanced memory architectures |
| 20.14-20.15, 20.17-20.18 | Cognitive Research | Causal inference, dual-process, sleep consolidation |
| 20.20-20.24 | Advanced AI | Active inference, episodic memory, tool-use synthesis |
| 34-37 | Engine Optimizations | Gaming/ML-inspired cognitive optimizations |
| 38-49 | Reality Engine | Foundational simulation mechanics |
| 59-63 | Add-On Modules | Ontology, circlon rings, plasma routing, etc. |
| 64-70 | Cross-Domain | Neuroscience, metallurgy, forensics, legal metaphors |

---

## 💰 Revenue Projections (Conservative)

| Tier | Price | Target Conversion | Revenue/1000 free users |
|---|---|---|---|
| Free | $0 | 100% (base) | $0 |
| Hobby | $9/mo | 8-12% | $720-$1,080/mo |
| Pro | $24/mo | 4-6% | $960-$1,440/mo |
| Startup | $29/seat × 4 avg | 1-2% (teams) | $1,160-$2,320/mo |
| Team | $49/seat × 8 avg | 0.5-1% | $1,960-$3,920/mo |
| Business | $99/seat × 25 avg | 0.2-0.5% | $4,950-$12,375/mo |
| Enterprise | $199/seat × 100 avg | 0.05-0.1% | $9,950-$19,900/mo |

**Total projected revenue per 1,000 free users**: $20,700 - $41,035/month.
**Key insight**: The Hobby tier captures the "I'll pay $9 to not be annoyed by limits" crowd — highest volume conversion.

---

## 🔧 License System — Full Implementation Guide

### System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Developer's Machine                         │
│                                                                     │
│  cortex activate <key>                                              │
│       │                                                             │
│       ▼                                                             │
│  ┌──────────────────────────────────────────────────────────┐       │
│  │  src/core/license.ts                                     │       │
│  │  ─────────────────────                                   │       │
│  │  1. Reads CORTEX_LICENSE_KEY from env / ~/.cortexrc      │       │
│  │  2. Sends key to license.cortex.dev/api/validate         │       │
│  │  3. Receives signed JWT with tier + features + expiry    │       │
│  │  4. Caches JWT to ~/.cortex-license.json (72h TTL)       │       │
│  │  5. On every paid feature call: requireTier() checks     │       │
│  │     cached JWT tier. No network call needed.             │       │
│  └──────────────┬───────────────────────────────────────────┘       │
│                 │ (cache miss or expired)                            │
└─────────────────┼───────────────────────────────────────────────────┘
                  │ HTTPS POST (only on activate + every 72h refresh)
                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  license.cortex.dev  (your private server — NOT on npm)             │
│  ─────────────────────────────────────────────────────────          │
│  POST /api/validate   → verify key, return signed JWT               │
│  POST /api/activate   → link key to machine fingerprint             │
│  POST /api/usage      → receive anonymized usage telemetry          │
│  Webhooks from Stripe → create/revoke/downgrade keys                │
│                                                                     │
│  Stack: Node.js + Hono/Express + Stripe SDK + jose (JWT)            │
│  DB: Postgres or SQLite (keys, orgs, seats, usage)                  │
│  Deploy: Fly.io / Railway / Vercel (cheap, global edge)             │
└─────────────────────────────────────────────────────────────────────┘
```

### Step 1: `src/core/license.ts` — The Hardened Gate (Client Side)

Previous version had weaknesses: no JWT signature verification, hacky `execSync` HTTP, tier-only gating (no feature flags), no tamper detection, no trial support. This version fixes all of them.

```typescript
// src/core/license.ts
import fs from "fs";
import path from "path";
import os from "os";
import { createHash, createVerify } from "crypto";

// ── Types ──────────────────────────────────────────────────
export type Tier = "free" | "hobby" | "pro" | "startup" | "team" | "business" | "enterprise";

// Feature flags — granular control beyond just tier rank.
// A Startup customer can have a feature flag that a Pro doesn't,
// and vice versa. The server controls this per-key.
export type Feature =
  | "auto_mode"           // auto-synthesis on file save
  | "deep_bootstrap"      // Phase 33 full depth
  | "soul"                // Phase 13.8 persistent experience
  | "live_graph"          // WebSocket graph streaming
  | "ci_hooks"            // Git pre-commit guardrails
  | "advisor"             // Intelligent architectural advisor
  | "multi_agent"         // Multiple Librarian agents
  | "federation"          // Polyrepo/monorepo federation
  | "central_server"      // Central knowledge server
  | "sso"                 // SAML/OIDC SSO
  | "rbac"                // Role-based access control
  | "air_gap"             // Air-gapped deployment
  | "compliance_pack"     // SOC2/ISO procurement
  | "oss_program";        // Open source program badge

interface LicensePayload {
  // Standard JWT claims
  sub: string;              // license key ID
  iss: string;              // "license.cortex.dev"
  aud: string;              // "projectcortex"
  exp: number;              // expiry (epoch seconds)
  iat: number;              // issued at
  jti: string;              // unique token ID (replay protection)
  // Cortex claims
  tier: Tier;
  org: string;
  email: string;
  seats: number;
  features: Feature[];      // explicit feature flags
  limits: TierLimits;
  trial?: {                 // present if this is a trial license
    trialEndsAt: number;    // epoch seconds
    convertedFrom: "free";
  };
}

interface TierLimits {
  maxEntities: number;      // -1 = unlimited
  maxSyncsPerMonth: number; // -1 = unlimited
  maxContextTokens: number;
  maxConstraints: number;
  maxWorkspaces: number;
  maxAgents: number;
  maxFederatedRepos: number;
}

interface LicenseCache {
  jwt: string;
  payload: LicensePayload;
  cachedAt: number;
  machineId: string;
  cacheVersion: 2;         // version for forward-compat migration
}

// ── Tier Limits (defaults — server can override per-key) ───
const TIER_LIMITS: Record<Tier, TierLimits> = {
  free:       { maxEntities: -1, maxSyncsPerMonth: -1, maxContextTokens: -1, maxConstraints: -1, maxWorkspaces: -1, maxAgents: -1, maxFederatedRepos: -1 },
  hobby:      { maxEntities: -1, maxSyncsPerMonth: -1, maxContextTokens: -1, maxConstraints: -1, maxWorkspaces: -1, maxAgents: -1, maxFederatedRepos: -1 },
  pro:        { maxEntities: -1, maxSyncsPerMonth: -1, maxContextTokens: -1, maxConstraints: -1, maxWorkspaces: -1, maxAgents: -1, maxFederatedRepos: -1 },
  startup:    { maxEntities: -1, maxSyncsPerMonth: -1, maxContextTokens: -1, maxConstraints: -1, maxWorkspaces: -1, maxAgents: -1, maxFederatedRepos: -1 },
  team:       { maxEntities: -1, maxSyncsPerMonth: -1, maxContextTokens: -1, maxConstraints: -1, maxWorkspaces: -1, maxAgents: -1, maxFederatedRepos: -1 },
  business:   { maxEntities: -1, maxSyncsPerMonth: -1, maxContextTokens: -1, maxConstraints: -1, maxWorkspaces: -1, maxAgents: -1, maxFederatedRepos: -1 },
  enterprise: { maxEntities: -1, maxSyncsPerMonth: -1, maxContextTokens: -1, maxConstraints: -1, maxWorkspaces: -1, maxAgents: -1, maxFederatedRepos: -1 },
};

// ── Constants ──────────────────────────────────────────────
const LICENSE_API = "https://license.cortex.dev/api";
const CACHE_PATH = path.join(os.homedir(), ".cortex-license.json");
const USAGE_LEDGER_PATH = path.join(os.homedir(), ".cortex-usage.json");
const CACHE_TTL_MS = 72 * 60 * 60 * 1000;  // 72 hours
const TIER_RANK: Record<Tier, number> = {
  free: 0, hobby: 1, pro: 2, startup: 3, team: 4, business: 5, enterprise: 6,
};

// ── RS256 Public Key (embedded in npm package) ─────────────
// The PRIVATE key lives only on license.cortex.dev.
// This public key verifies that a JWT was genuinely signed by
// your server. A user can't forge a valid JWT without the private key.
// Rotate by publishing a new npm version with the new public key.
const RS256_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
(your actual RS256 public key goes here)
...IDAQAB
-----END PUBLIC KEY-----`;

// ── Machine Fingerprint ─────────────────────────────────────
// Used ONLY for trial abuse prevention (one trial per machine).
// NOT used for paid customers — your license key works on all
// your machines regardless of fingerprint. Combining multiple
// OS signals prevents casual re-claiming but is not DRM.
function getMachineId(): string {
  const signals = [
    os.hostname(),
    os.userInfo().username,
    os.platform(),
    os.arch(),
    os.cpus()[0]?.model || "unknown-cpu",
    os.totalmem().toString(),
  ];
  return createHash("sha256").update(signals.join(":")).digest("hex").slice(0, 24);
}

// ── JWT Verification (cryptographic) ───────────────────────
// Verifies the JWT signature against the embedded public key.
// This is the core security mechanism — without the private key,
// nobody can produce a JWT that passes this check.
function verifyJwt(jwt: string): LicensePayload | null {
  try {
    const [headerB64, payloadB64, signatureB64] = jwt.split(".");
    if (!headerB64 || !payloadB64 || !signatureB64) return null;

    // Verify RS256 signature
    const verifier = createVerify("RSA-SHA256");
    verifier.update(`${headerB64}.${payloadB64}`);
    const signatureBuffer = Buffer.from(signatureB64, "base64url");
    if (!verifier.verify(RS256_PUBLIC_KEY, signatureBuffer)) {
      return null;  // Signature invalid — forged or corrupted JWT
    }

    // Decode and validate payload
    const payload: LicensePayload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf-8")
    );

    // Check standard claims
    if (payload.iss !== "license.cortex.dev") return null;
    if (payload.aud !== "projectcortex") return null;
    if (payload.exp * 1000 < Date.now()) return null;  // expired

    return payload;
  } catch { return null; }
}

// ── Cache Operations ───────────────────────────────────────
function readCache(): LicenseCache | null {
  try {
    if (!fs.existsSync(CACHE_PATH)) return null;
    const data: LicenseCache = JSON.parse(fs.readFileSync(CACHE_PATH, "utf-8"));
    if (data.cacheVersion !== 2) return null;  // old format, re-validate
    if (data.machineId !== getMachineId()) return null;
    return data;
  } catch { return null; }
}

function writeCache(jwt: string, payload: LicensePayload): void {
  const cache: LicenseCache = {
    jwt, payload, cachedAt: Date.now(),
    machineId: getMachineId(), cacheVersion: 2,
  };
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2), { mode: 0o600 });
}

function isCacheFresh(cache: LicenseCache): boolean {
  return (Date.now() - cache.cachedAt) < CACHE_TTL_MS;
}

// ── Remote Validation (native fetch, async-safe) ───────────
// Uses Node 18+ native fetch(). No child_process hack.
async function validateRemote(key: string): Promise<LicensePayload | null> {
  try {
    const resp = await fetch(`${LICENSE_API}/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, machine: getMachineId() }),
      signal: AbortSignal.timeout(10000),
    });
    if (!resp.ok) return null;
    const data = await resp.json() as { jwt: string };

    // CRITICAL: Verify JWT signature before trusting it.
    // Even if someone MITM'd the response, they can't forge a valid signature.
    const payload = verifyJwt(data.jwt);
    if (!payload) return null;

    writeCache(data.jwt, payload);
    return payload;
  } catch { return null; }
}

// Synchronous version for startup (blocks once, max 10s)
function validateRemoteSync(key: string): LicensePayload | null {
  try {
    const { execFileSync } = require("child_process");
    // Minimal inline script — just fetch + stdout
    const script = `
      fetch("${LICENSE_API}/validate",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({key:"${key}",machine:"${getMachineId()}"}),
        signal:AbortSignal.timeout(8000)
      }).then(r=>r.json()).then(d=>process.stdout.write(d.jwt||""))
        .catch(()=>process.exit(1))
    `;
    const jwt = execFileSync("node", ["-e", script], {
      timeout: 10000, encoding: "utf-8",
    }).trim();
    if (!jwt) return null;

    const payload = verifyJwt(jwt);
    if (!payload) return null;

    writeCache(jwt, payload);
    return payload;
  } catch { return null; }
}

// ── Trial Auto-Grant ────────────────────────────────────────
// On first run (no cache, no key), the client asks the server
// for a 14-day Pro trial. No user action needed.
async function requestTrial(): Promise<LicensePayload | null> {
  try {
    const resp = await fetch(`${LICENSE_API}/trial`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ machine: getMachineId() }),
      signal: AbortSignal.timeout(5000),
    });
    if (!resp.ok) return null;
    const data = await resp.json() as { jwt: string };
    const payload = verifyJwt(data.jwt);
    if (payload) writeCache(data.jwt, payload);
    return payload;
  } catch { return null; }
}

// ── License Resolution ─────────────────────────────────────
let _resolved: LicensePayload | null = null;

export function getActiveLicense(): LicensePayload {
  if (_resolved) return _resolved;

  // 1. Fresh cache with valid signature
  const cache = readCache();
  if (cache && isCacheFresh(cache)) {
    const verified = verifyJwt(cache.jwt);
    if (verified) { _resolved = verified; return _resolved; }
  }

  // 2. Remote validation with key
  const key = process.env.CORTEX_LICENSE_KEY;
  if (key) {
    const remote = validateRemoteSync(key);
    if (remote) { _resolved = remote; return _resolved; }
  }

  // 3. Stale cache grace (signature still valid, just past 72h refresh)
  if (cache) {
    const verified = verifyJwt(cache.jwt);
    if (verified) { _resolved = verified; return _resolved; }
  }

  // 4. Auto-trial on first run (no cache exists → this is a new install)
  if (!cache) {
    const trial = requestTrial();
    if (trial) { _resolved = trial; return _resolved; }
  }

  // 5. Free tier fallback — NEVER crashes
  _resolved = {
    sub: "free", iss: "local", aud: "projectcortex",
    jti: "local-free",
    tier: "free", org: "", email: "", seats: 1,
    features: [], limits: TIER_LIMITS.free,
    exp: Math.floor(Date.now() / 1000) + 86400 * 365,
    iat: Math.floor(Date.now() / 1000),
  };
  return _resolved;
}

// Async version — call during `cortex watch` startup for non-blocking refresh
export async function refreshLicenseAsync(): Promise<void> {
  const key = process.env.CORTEX_LICENSE_KEY;
  if (!key) return;
  const payload = await validateRemote(key);
  if (payload) _resolved = payload;
}

// Subscribe — polls server until Stripe checkout completes, then auto-activates
export async function subscribeViaCLI(tier: string): Promise<boolean> {
  const subscribeId = crypto.randomUUID();
  const checkoutUrl = `https://cortex.dev/checkout?tier=${tier}&subscribe_id=${subscribeId}&cli=true`;

  console.log(`\nOpening browser to complete your purchase...\n  ${checkoutUrl}\n`);
  await openBrowser(checkoutUrl);

  console.log("Waiting for payment confirmation... (Ctrl+C to cancel)");
  for (let i = 0; i < 120; i++) {  // poll for up to 2 minutes
    await new Promise(r => setTimeout(r, 3000));
    try {
      const resp = await fetch(`${LICENSE_API}/subscribe-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscribe_id: subscribeId }),
        signal: AbortSignal.timeout(5000),
      });
      if (!resp.ok) continue;
      const data = await resp.json() as { key?: string; status: string };
      if (data.status === "completed" && data.key) {
        process.env.CORTEX_LICENSE_KEY = data.key;
        writeKeyToRc(data.key);
        _resolved = null; // force re-resolve
        const license = getActiveLicense();
        console.log(`\n✅ Activated: Cortex ${license.tier.toUpperCase()}`);
        console.log(`   Org: ${license.org || "(personal)"}`);
        return true;
      }
    } catch { /* retry */ }
  }
  console.log("\n⏱ Payment confirmation timed out. Run `cortex activate <key>` with the key emailed to you.");
  return false;
}

function openBrowser(url: string): Promise<void> {
  const { exec } = require("child_process");
  const platform = os.platform();
  const cmd = platform === "win32" ? "start" : platform === "darwin" ? "open" : "xdg-open";
  return new Promise((resolve) => {
    exec(`${cmd} "${url}"`, () => resolve());
  });
}

function writeKeyToRc(key: string): void {
  const rcPath = path.join(os.homedir(), ".cortexrc");
  let rcContent = "";
  try {
    if (fs.existsSync(rcPath)) {
      rcContent = fs.readFileSync(rcPath, "utf-8");
      if (rcContent.includes("CORTEX_LICENSE_KEY=")) {
        rcContent = rcContent.replace(/CORTEX_LICENSE_KEY=.*/, `CORTEX_LICENSE_KEY=${key}`);
      } else {
        rcContent += `\nCORTEX_LICENSE_KEY=${key}\n`;
      }
    } else {
      rcContent = `CORTEX_LICENSE_KEY=${key}\n`;
    }
    fs.writeFileSync(rcPath, rcContent);
  } catch { /* best-effort */ }
}

// ── The Gates ──────────────────────────────────────────────
export class CortexLicenseError extends Error {
  public readonly tier: Tier;
  public readonly requiredTier: Tier;
  constructor(current: Tier, required: Tier, context?: string) {
    const msg = [
      `⚡ ${context || "This feature"} requires Cortex ${required.toUpperCase()}.`,
      `   Current tier: ${current}`,
      `   Upgrade: https://cortex.dev/pricing`,
    ].join("\n");
    super(msg);
    this.name = "CortexLicenseError";
    this.tier = current;
    this.requiredTier = required;
  }
}

// Gate 1: Tier-level check
export function requireTier(minimum: Tier, context?: string): void {
  const license = getActiveLicense();
  if (TIER_RANK[license.tier] < TIER_RANK[minimum]) {
    throw new CortexLicenseError(license.tier, minimum, context);
  }
}

// Gate 2: Feature-flag check (granular, independent of tier rank)
export function requireFeature(feature: Feature, context?: string): void {
  const license = getActiveLicense();
  if (!license.features.includes(feature)) {
    throw new CortexLicenseError(
      license.tier, "pro",  // suggest Pro as minimum
      context || `Feature "${feature}" is not included in your plan`
    );
  }
}

// Gate 3: Numeric limit checks with tamper-detected usage ledger
export function requireEntityLimit(currentCount: number): void {
  const { maxEntities } = getActiveLicense().limits;
  if (maxEntities !== -1 && currentCount >= maxEntities) {
    throw new CortexLicenseError(getActiveLicense().tier, "hobby",
      `Entity limit reached (${currentCount}/${maxEntities})`);
  }
}

export function requireSyncLimit(currentMonthCount: number): void {
  const { maxSyncsPerMonth } = getActiveLicense().limits;
  if (maxSyncsPerMonth !== -1 && currentMonthCount >= maxSyncsPerMonth) {
    throw new CortexLicenseError(getActiveLicense().tier, "hobby",
      `Monthly synthesis limit reached (${currentMonthCount}/${maxSyncsPerMonth})`);
  }
}

export function getContextTokenBudget(): number {
  return getActiveLicense().limits.maxContextTokens;
}

// ── Usage Ledger (tamper-detected) ─────────────────────────
// Tracks entity count, syncs, tokens locally. Hash chain prevents
// naive tampering (resetting counters). Not cryptographically
// unbreakable — but detects accidental or casual manipulation.
interface UsageLedger {
  month: string;            // "2026-05"
  entityCount: number;
  synthesisCount: number;
  contextTokensUsed: number;
  prevHash: string;         // hash of previous month's ledger
  hash: string;             // sha256(month + counts + prevHash)
}

function getCurrentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function computeLedgerHash(ledger: Omit<UsageLedger, "hash">): string {
  const raw = `${ledger.month}:${ledger.entityCount}:${ledger.synthesisCount}:${ledger.contextTokensUsed}:${ledger.prevHash}`;
  return createHash("sha256").update(raw).digest("hex").slice(0, 16);
}

export function readUsageLedger(): UsageLedger {
  const month = getCurrentMonth();
  try {
    if (fs.existsSync(USAGE_LEDGER_PATH)) {
      const data: UsageLedger = JSON.parse(fs.readFileSync(USAGE_LEDGER_PATH, "utf-8"));
      // Tamper check
      const expected = computeLedgerHash(data);
      if (data.hash !== expected) {
        // Tampered — reset to safe state (counts = current actuals)
        return { month, entityCount: 0, synthesisCount: 0, contextTokensUsed: 0, prevHash: "", hash: "" };
      }
      if (data.month === month) return data;
      // New month — roll over
      return { month, entityCount: 0, synthesisCount: 0, contextTokensUsed: 0, prevHash: data.hash, hash: "" };
    }
  } catch { /* fall through */ }
  return { month, entityCount: 0, synthesisCount: 0, contextTokensUsed: 0, prevHash: "", hash: "" };
}

export function incrementUsage(field: "synthesisCount" | "contextTokensUsed", amount: number = 1): void {
  const ledger = readUsageLedger();
  ledger[field] += amount;
  ledger.hash = computeLedgerHash(ledger);
  fs.writeFileSync(USAGE_LEDGER_PATH, JSON.stringify(ledger, null, 2), { mode: 0o600 });
}

// ── Background Heartbeat (for cortex watch) ────────────────
// During `cortex watch`, periodically re-validates the license
// in the background. If the license was revoked (e.g., cancelled
// subscription), the next heartbeat catches it within CACHE_TTL.
let _heartbeatTimer: ReturnType<typeof setInterval> | null = null;

export function startLicenseHeartbeat(): void {
  if (_heartbeatTimer) return;
  _heartbeatTimer = setInterval(async () => {
    await refreshLicenseAsync();
  }, CACHE_TTL_MS / 3);  // refresh at 24h intervals (TTL/3 = well before expiry)
}

export function stopLicenseHeartbeat(): void {
  if (_heartbeatTimer) { clearInterval(_heartbeatTimer); _heartbeatTimer = null; }
}

// ── Trial System ───────────────────────────────────────────
export function isTrialActive(): boolean {
  const license = getActiveLicense();
  return !!license.trial && license.trial.trialEndsAt * 1000 > Date.now();
}

export function isTrialExpired(): boolean {
  const license = getActiveLicense();
  return !!license.trial && license.trial.trialEndsAt * 1000 < Date.now();
}

export function getTrialDaysRemaining(): number {
  const license = getActiveLicense();
  if (!license.trial) return 0;
  const remaining = (license.trial.trialEndsAt * 1000 - Date.now()) / (86400 * 1000);
  return Math.max(0, Math.ceil(remaining));
}

export function getTrialDaysUsed(): number {
  const license = getActiveLicense();
  if (!license.trial) return 0;
  const used = (Date.now() - license.trial.iat * 1000) / (86400 * 1000);
  return Math.min(14, Math.floor(used));
}

// ── Status Display ─────────────────────────────────────────
export function getLicenseStatus(): string {
  const l = getActiveLicense();
  const unlimited = (v: number) => v === -1 ? "∞" : String(v);
  const lines = [
    `Tier: ${l.tier.toUpperCase()}${isTrialActive() ? ` (trial — ${getTrialDaysRemaining()} days left)` : ""}`,
    `Org: ${l.org || "(personal)"}`,
    `Entities: ${unlimited(l.limits.maxEntities)} | Syncs: ${unlimited(l.limits.maxSyncsPerMonth)}/mo`,
    `Context: ${unlimited(l.limits.maxContextTokens)} tokens | Agents: ${unlimited(l.limits.maxAgents)}`,
    `Features: ${l.features.length > 0 ? l.features.join(", ") : "(free tier)"}`,
    `Expires: ${new Date(l.exp * 1000).toLocaleDateString()}`,
  ];
  return lines.join("\n");
}
```

### Step 2: Centralized Phase-to-Tier Config + Enforcement

Instead of sprinkling `requireTier("hobby")` throughout every function, centralize the mapping in one file. Rebalancing tiers becomes a one-line change.

```typescript
// src/core/tier-map.ts — SINGLE SOURCE OF TRUTH
// This is the only file that maps phases to tiers.
// `cortex features`, MCP tool registration, and runtime
// enforcement all read from this config.

import type { Tier } from "./license.js";

export interface PhaseEntry {
  phase: string;
  tier: Tier;
  label: string;
}

// Auto-generated from the master phase list.
// Adding a new phase here automatically gates it everywhere.
export const PHASE_TIER_MAP: Record<string, Tier> = {
  // ── Free ───────────────────────────────────────────
  "1": "free", "2": "free", "3": "free", "4": "free", "5": "free",
  "6": "free", "7": "free", "7.5": "free",
  "8": "free", "8.1": "free",
  "9": "free", "10": "free",
  "13": "free", "13.1": "free", "13.2": "free", "13.4": "free", "13.5": "free",

  // ── Hobby ──────────────────────────────────────────
  "3.1": "hobby",
  "7.6": "hobby",
  "12": "hobby",
  "13.3": "hobby",
  "33": "hobby",

  // ── Pro ────────────────────────────────────────────
  "5.9": "pro",
  "7.5+": "pro", "7.7": "pro", "7.8": "pro", "7.9": "pro",
  "8.2": "pro",
  "9.1": "pro",
  "12.2": "pro", "12.3": "pro",
  "13.6": "pro", "13.8": "pro",
  "14": "pro",
  "20": "pro", "20.1": "pro", "20.3": "pro", "20.5": "pro",
  "20.5.1": "pro", "20.13": "pro", "20.19": "pro", "20.22": "pro",
  "20.28": "pro", "20.29": "pro", "20.30": "pro",

  // ── Startup ────────────────────────────────────────
  "4.6": "startup", "4.8": "startup",
  "5.6": "startup",
  "7.10": "startup",
  "10.2": "startup",
  "11": "startup",
  "16": "startup",
  "20.7": "startup", "20.7.2": "startup", "20.7.3": "startup",
  "53.2": "startup",
  "56": "startup",

  // ── Team ───────────────────────────────────────────
  "4.7": "team",
  "5.7": "team",
  "14.2": "team",
  "17": "team", "17.1": "team",
  "21": "team", "22": "team", "23": "team", "24": "team",
  "53.6": "team",
  "57": "team", "58": "team",

  // ── Business ───────────────────────────────────────
  "25": "business", "26": "business", "26.1": "business", "26.3": "business",
  "28": "business", "29": "business",
  "30": "business", "31": "business",
  "33.1": "business", "33.2": "business",

  // ── Enterprise ─────────────────────────────────────
  "25.1": "enterprise", "26.2": "enterprise", "26.4": "enterprise",
  "27": "enterprise",
  "29.1": "enterprise", "29.2": "enterprise",
  "30.1": "enterprise", "30.2": "enterprise",
  "32": "enterprise", "32.1": "enterprise", "32.2": "enterprise",
  "50": "enterprise", "51": "enterprise", "52": "enterprise",
  "53": "enterprise", "54": "enterprise", "55": "enterprise",
  "53+": "enterprise",
};

// Single runtime gate — replaces all individual requireTier() calls
export function requirePhase(phase: string, context?: string): void {
  const required = PHASE_TIER_MAP[phase];
  if (!required || required === "free") return;  // free for all
  requireTier(required, context || `Phase ${phase}`);
}

// Phase-to-tier lookup for MCP registration and cortex features
export function getPhaseTier(phase: string): Tier {
  return PHASE_TIER_MAP[phase] || "free";
}

export function getPhasesForTier(minTier: Tier): string[] {
  const rank: Record<Tier, number> = {
    free: 0, hobby: 1, pro: 2, startup: 3, team: 4, business: 5, enterprise: 6,
  };
  const min = rank[minTier];
  return Object.entries(PHASE_TIER_MAP)
    .filter(([_, t]) => rank[t] <= min)
    .map(([p]) => p);
}
```

**Usage in feature code** — consistent, grepable, single source of truth:

```typescript
// ── Phase 33: Deep Bootstrap ──────────────────────────
export async function runDeepBootstrap(opts: BootstrapOpts) {
  requirePhase("33");   // ← maps to "hobby" via tier-map.ts
  // ... Phase 33 logic
}

// ── Phase 13.8: Soul ──────────────────────────────────
export async function loadSoulState(projectRoot: string) {
  requirePhase("13.8"); // ← maps to "pro"
  // ... Soul logic
}

// ── Phase 11: Monorepo Federation ─────────────────────
export async function federateMonorepo(config: FederationConfig) {
  requirePhase("11");   // ← maps to "startup"
  // ... federation logic
}

// ── Phase 25: SSO Integration (Enterprise) ────────────
export async function configureSSOProvider(opts: SSOOpts) {
  requirePhase("25");   // ← maps to "enterprise"
  // ... SSO logic
}
```

**Benefits:**
- Add a phase: one line in `PHASE_TIER_MAP`. Every gate picks it up.
- Rebalance a phase (e.g., move deep bootstrap from Hobby to Free): change one value. No hunting through files.
- `cortex features` and MCP tool registration both read `PHASE_TIER_MAP` — single source of truth.
- `requirePhase()` is grepable — find all gated entry points by searching for `requirePhase(`.
- The CLI never needs updating for tier changes. Just `npm update` to get the new `tier-map.ts`.

### MCP Tool Registration — Dynamic Filtering by Tier

Instead of registering all tools and relying on the AI to self-filter, dynamically build the tool list based on the current license. MCP supports `notifications/tools/list_changed` to re-register tools when the license changes.

```typescript
// src/mcp/server.ts — dynamic tool registration

function buildToolList(license: LicensePayload) {
  const tier = license.tier;
  const rank: Record<string, number> = {
    free: 0, hobby: 1, pro: 2, startup: 3, team: 4, business: 5, enterprise: 6,
  };
  const hasTier = (min: string) => rank[tier] >= rank[min];

  const tools = [];

  // ── Free (always available) ────────────────────────────
  tools.push({
    name: "synthesize_entity",
    description: "Synthesize a knowledge entity for the current file",
    inputSchema: { /* ... */ },
    handler: async (args) => { /* ... */ },
  });
  tools.push({
    name: "read_knowledge_index",
    description: "List all entities in the knowledge base",
    handler: async () => { /* ... */ },
  });
  // ... all other Free phase tools

  // ── Hobby ────────────────────────────────────────────
  if (hasTier("hobby")) {
    tools.push({
      name: "run_deep_bootstrap",
      description: "Batch-scan the entire project and synthesize entities upfront",
      handler: async () => { /* ... */ },
    });
    tools.push({
      name: "get_cost_analytics",
      description: "Show LLM token usage and cost breakdown",
      handler: async () => { /* ... */ },
    });
  }

  // ── Pro ──────────────────────────────────────────────
  if (hasTier("pro")) {
    tools.push({
      name: "load_soul_state",
      description: "Load the Librarian's persistent memory of your coding patterns",
      handler: async () => { /* ... */ },
    });
    tools.push({
      name: "run_advisor",
      description: "Run architectural advisor on the current codebase",
      handler: async () => { /* ... */ },
    });
    tools.push({
      name: "get_tech_debt_register",
      description: "View automated tech debt tracking",
      handler: async () => { /* ... */ },
    });
  }

  // ── Startup / Team ─────────────────────────────────────
  if (hasTier("startup")) {
    tools.push({
      name: "federate_monorepo",
      description: "Configure multi-package repository federation",
      handler: async () => { /* ... */ },
    });
    tools.push({
      name: "invoke_librarian_agent",
      description: "Spawn a specialized Librarian agent",
      handler: async () => { /* ... */ },
    });
  }

  return tools;
}

// On MCP startup:
const license = getActiveLicense();
const tools = buildToolList(license);
server.setTools(tools);

// When license changes (trial expires, upgrade, downgrade):
// Send MCP notification so the client re-fetches the tool list
server.sendNotification("notifications/tools/list_changed");

// Background: re-check license periodically
setInterval(async () => {
  await refreshLicenseAsync();
  const newLicense = getActiveLicense();
  if (newLicense.tier !== license.tier) {
    server.setTools(buildToolList(newLicense));
    server.sendNotification("notifications/tools/list_changed");
  }
}, 60 * 60 * 1000);  // every hour
```

The AI agent only sees tools it can actually call. No confusing "you don't have access" errors in the tool list. The `requireTier()` backstop in each handler is still kept as defense-in-depth, but it should never trigger since the tool won't be registered if the tier is insufficient.

### Step 3: `cortex activate` CLI Command

```typescript
// In src/cli/index.ts — add to the commander program:

program
  .command("activate <license-key>")
  .description("Activate a Cortex Pro/Team/Enterprise license")
  .action(async (key: string) => {
    process.env.CORTEX_LICENSE_KEY = key;

    // Write key to ~/.cortexrc so it persists across sessions
    const rcPath = path.join(os.homedir(), ".cortexrc");
    let rcContent = "";
    if (fs.existsSync(rcPath)) {
      rcContent = fs.readFileSync(rcPath, "utf-8");
      // Replace existing key or append
      if (rcContent.includes("CORTEX_LICENSE_KEY=")) {
        rcContent = rcContent.replace(
          /CORTEX_LICENSE_KEY=.*/,
          `CORTEX_LICENSE_KEY=${key}`
        );
      } else {
        rcContent += `\nCORTEX_LICENSE_KEY=${key}\n`;
      }
    } else {
      rcContent = `CORTEX_LICENSE_KEY=${key}\n`;
    }
    fs.writeFileSync(rcPath, rcContent);

    // Force fresh validation (clears cache)
    const license = getActiveLicense();
    console.log(`✅ Activated: Cortex ${license.tier.toUpperCase()}`);
    console.log(`   Org: ${license.org || "(personal)"}`);
    console.log(`   Seats: ${license.seats}`);
    console.log(`   Expires: ${new Date(license.exp * 1000).toLocaleDateString()}`);
  });

program
  .command("deactivate")
  .description("Remove license from this device (revert to free)")
  .option("--device <id>", "Deactivate a specific device remotely (admin only)")
  .option("--all", "Deactivate all devices on this license")
  .action(async (opts: { device?: string; all?: boolean }) => {
    // Remote device management
    if (opts.device || opts.all) {
      const resp = await fetch(`${LICENSE_API}/deactivate-device`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: process.env.CORTEX_LICENSE_KEY,
          deviceId: opts.device,  // null for --all
          all: !!opts.all,
          machine: getMachineId(),
        }),
        signal: AbortSignal.timeout(5000),
      });
      if (resp.ok) {
        console.log(`✅ Device${opts.all ? "s" : ""} deactivated. Free slot available.`);
      } else {
        console.log("❌ Could not deactivate device. Check your license key.");
      }
      return;
    }

    // Local deactivation (this machine only)
    if (fs.existsSync(CACHE_PATH)) fs.unlinkSync(CACHE_PATH);
    const rcPath = path.join(os.homedir(), ".cortexrc");
    if (fs.existsSync(rcPath)) {
      let rc = fs.readFileSync(rcPath, "utf-8");
      rc = rc.replace(/CORTEX_LICENSE_KEY=.*\n?/, "");
      fs.writeFileSync(rcPath, rc);
    }
    console.log("✅ License removed from this device. Reverted to free tier.");
  });

program
  .command("subscribe [tier]")
  .description("Upgrade to a paid tier (default: pro). Usage: cortex subscribe [hobby|pro|team]")
  .action(async (tier: string = "pro") => {
    const valid = ["hobby", "pro", "team"];
    if (!valid.includes(tier)) {
      console.error(`❌ Invalid tier "${tier}". Options: ${valid.join(", ")}`);
      return;
    }
    console.log(`\n🚀 Starting Cortex ${tier.toUpperCase()} subscription...`);
    const ok = await subscribeViaCLI(tier);
    if (ok) {
      console.log(`   Run \`cortex status\` to verify your new tier.`);
    }
  });

program
  .command("features")
  .description("List features. Usage: cortex features [--locked] [search]")
  .option("--locked", "Show only features locked behind higher tiers")
  .argument("[search]", "Search term to filter features")
  .action(async (search: string | undefined, opts: { locked?: boolean }) => {
    const license = getActiveLicense();

    // Fetch feature definitions from server (single source of truth).
    // Falls back to hardcoded defaults if offline.
    const DEFAULT_FEATURES = [
      { tier: "free", phases: "1-10, 13", desc: "Core pipeline, graph, audit, context packs" },
      { tier: "hobby", phases: "3.1, 7.6, 12, 13.3, 33", desc: "LLM caching, cost analytics, deep bootstrap, basic CI" },
      { tier: "pro", phases: "13.8, 20, 7.5, 7.7, 12.2", desc: "Soul, advisor, custom quality, tech debt, CI hooks" },
      { tier: "startup", phases: "4.6, 11, 16, 56", desc: "Multi-agent, monorepo federation, shared knowledge" },
      { tier: "team", phases: "21, 22, 23, 24", desc: "Polyrepo federation, central server, HITL review" },
      { tier: "business", phases: "25, 26, 28, 29", desc: "SSO, RBAC, audit, workflow integrations" },
      { tier: "enterprise", phases: "27, 32, 50-55", desc: "Air-gap, SOC2, cognitive substrate" },
    ];
    let ALL_FEATURES = DEFAULT_FEATURES;
    try {
      const resp = await fetch(`${LICENSE_API}/features`, {
        signal: AbortSignal.timeout(3000),
      });
      if (resp.ok) ALL_FEATURES = await resp.json();
    } catch { /* use defaults */ }
    const current = license.tier;
    const rank: Record<string, number> = { free: 0, hobby: 1, pro: 2, startup: 3, team: 4, business: 5, enterprise: 6 };
    const isLocked = (t: string) => rank[t] > rank[current];

    // Filter by search
    let filtered = ALL_FEATURES;
    if (search) {
      const q = search.toLowerCase();
      filtered = ALL_FEATURES.filter(f =>
        f.desc.toLowerCase().includes(q) || f.phases.includes(q) || f.tier.includes(q)
      );
    }

    // Filter by --locked
    if (opts.locked) {
      filtered = filtered.filter(f => isLocked(f.tier));
    }

    if (filtered.length === 0) {
      if (opts.locked) console.log("\n🎉 All features are unlocked on your current tier!");
      else console.log(`\nNo features matching "${search}".`);
      return;
    }

    const header = opts.locked
      ? `\n🔒 Locked features (upgrade to unlock):\n`
      : search
        ? `\n🔍 Features matching "${search}":\n`
        : `\n📋 Cortex Features — Current tier: ${current.toUpperCase()}\n`;

    console.log(header);
    for (const f of filtered) {
      const icon = isLocked(f.tier) ? "🔒" : "✅";
      const label = isLocked(f.tier) ? `→ ${f.tier.toUpperCase()}` : "AVAILABLE";
      console.log(`  ${icon} ${f.tier.toUpperCase().padEnd(12)} ${f.desc.padEnd(50)} ${label}`);
    }
    console.log(`\n💡 Run \`cortex features --locked\` to see only gated features.`);
    console.log(`💡 Run \`cortex features <search-term>\` to search.`);
  });

program
  .command("devices")
  .description("List and manage devices activated on your license")
  .action(async () => {
    const license = getActiveLicense();
    if (license.tier === "free") {
      console.log("Device management is available on paid tiers.");
      return;
    }
    // Fetch from license server
    const resp = await fetch(`${LICENSE_API}/devices`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: process.env.CORTEX_LICENSE_KEY }),
      signal: AbortSignal.timeout(5000),
    });
    if (!resp.ok) { console.log("Could not fetch device list."); return; }
    const data = await resp.json() as { devices: { machineId: string; lastSeen: string }[]; limit: number };
    console.log(`\n💻 Active devices (${data.devices.length}/${data.limit}):\n`);
    for (const d of data.devices) {
      const lastSeen = new Date(d.lastSeen).toLocaleDateString();
      console.log(`  🖥  ${d.machineId.slice(0, 12)}...  Last seen: ${lastSeen}`);
    }
    console.log(`\nTo deactivate a device, run: cortex deactivate --device <id>`);
  });
```

### Step 4: `cortex status` — Show Tier Info

```typescript
// Add to existing src/cli/status.ts output:

import { getLicenseStatus, getActiveLicense, isTrialActive, isTrialExpired, getTrialDaysRemaining, getTrialDaysUsed } from "../core/license.js";

// Inside the status display function, add a section:
const license = getActiveLicense();
const tierEmoji: Record<string, string> = {
  free: "🆓", hobby: "🪴", pro: "💎",
  startup: "🌱", team: "👥", business: "🏛️", enterprise: "🏢",
};

console.log(`\n${tierEmoji[license.tier] || "🔑"} License: Cortex ${license.tier.toUpperCase()}`);
console.log(getLicenseStatus());

// Trial countdown
if (isTrialActive()) {
  const days = getTrialDaysRemaining();
  if (days <= 3) {
    console.log(`\n⚠️  Pro trial ends in ${days} day${days === 1 ? "" : "s"}. Run \`cortex subscribe\` to keep Pro features.`);
  } else {
    console.log(`\n💡 Pro trial — ${days} days remaining. Experience all features before you buy.`);
  }
} else if (isTrialExpired()) {
  console.log(`\n⏱ Pro trial ended (you used ${getTrialDaysUsed()} of 14 days). Run \`cortex subscribe\` to reactivate Pro.`);
}

// Upgrade hint for free users
if (license.tier === "free" && !isTrialExpired()) {
  console.log(`\n💡 Run \`cortex features --locked\` to see what you'd unlock by upgrading.`);
}
```

### Step 5: License Server (`license.cortex.dev`)

This is a **separate, private repo** — never published to npm.

```
license-server/
├── src/
│   ├── index.ts              # Hono/Express app
│   ├── routes/
│   │   ├── validate.ts       # POST /api/validate
│   │   ├── activate.ts       # POST /api/activate
│   │   ├── usage.ts          # POST /api/usage
│   │   └── features.ts       # GET /api/features (single source of truth for feature lists)
│   ├── stripe/
│   │   └── webhooks.ts       # Stripe webhook handlers
│   ├── jwt.ts                # Sign/verify with RS256 private key
│   └── db.ts                 # Postgres: keys, orgs, seats, usage
├── prisma/schema.prisma
├── Dockerfile
└── package.json
```

**Key endpoint — `/api/trial` (auto-grants 14-day Pro trial on first run):**

```typescript
// license-server/src/routes/trial.ts

// One trial per machine fingerprint. Forever. No re-claim.
// This prevents trial cycling. Machine fingerprint is a speed
// bump (not DRM) — a determined user can spoof it, but they're
// paying $24/mo in API overhead (no caching) to save $24/mo on
// subscription. The economics don't work for them.
const TRIAL_DURATION_DAYS = 14;

export async function handleTrial(req: Request) {
  const { machine } = await req.json();
  if (!machine) return Response.json({ error: "machine required" }, { status: 400 });

  // Check if this machine ever had a trial
  const existing = await db.trial.findUnique({ where: { machineId: machine } });
  if (existing) {
    return Response.json({ error: "trial already used" }, { status: 403 });
  }

  // Grant trial
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DURATION_DAYS);

  await db.trial.create({
    data: { machineId: machine, grantedAt: new Date(), trialEndsAt },
  });

  const jwt = await new SignJWT({
    tier: "pro",
    org: "",
    email: "",
    seats: 1,
    features: ALL_PRO_FEATURES,
    limits: TIER_LIMITS.pro,
    trial: { trialEndsAt: Math.floor(trialEndsAt.getTime() / 1000), convertedFrom: "free" },
  })
    .setProtectedHeader({ alg: "RS256" })
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(PRIVATE_KEY);

  return Response.json({ jwt });
}
```

**Key endpoint — `GET /api/features` (single source of truth):**

```typescript
// license-server/src/routes/features.ts

export async function handleFeatures() {
  // This is the single source of truth for `cortex features`.
  // The CLI fetches this at runtime. Update this list when adding
  // new phases — the CLI will reflect it automatically.
  const features = [
    { tier: "free", phases: "1-10, 13", desc: "Core pipeline, graph, audit, context packs" },
    { tier: "hobby", phases: "3.1, 7.6, 12, 13.3, 33", desc: "LLM caching, cost analytics, deep bootstrap, basic CI" },
    { tier: "pro", phases: "13.8, 20, 7.5, 7.7, 12.2", desc: "Soul, advisor, custom quality, tech debt, CI hooks" },
    { tier: "startup", phases: "4.6, 11, 16, 56", desc: "Multi-agent, monorepo federation, shared knowledge" },
    { tier: "team", phases: "21, 22, 23, 24", desc: "Polyrepo federation, central server, HITL review" },
    { tier: "business", phases: "25, 26, 28, 29", desc: "SSO, RBAC, audit, workflow integrations" },
    { tier: "enterprise", phases: "27, 32, 50-55", desc: "Air-gap, SOC2, cognitive substrate" },
  ];
  return Response.json(features);
}
```

**Key endpoint — `/api/validate`:**

```typescript
// license-server/src/routes/validate.ts
import { SignJWT } from "jose";

export async function handleValidate(req: Request) {
  const { key, machine } = await req.json();

  // 1. Look up key in database
  const record = await db.licenseKey.findUnique({ where: { key } });
  if (!record || record.status !== "active") {
    return Response.json({ error: "Invalid or expired key" }, { status: 401 });
  }

  // Device limit: 3 for individual tiers, seats × 2 for team tiers.
  // This prevents casual key-sharing while accommodating a developer's
  // real devices (laptop, desktop, CI machine). Users can deactivate
  // old devices via `cortex devices` CLI or the web dashboard.
  const maxDevices = ["startup", "team", "business", "enterprise"].includes(record.tier)
    ? record.seats * 2
    : 3;

  const machines = await db.activation.findMany({ where: { keyId: record.id } });
  if (!machines.find(m => m.machineId === machine)) {
    if (machines.length >= maxDevices) {
      return Response.json({
        error: `Device limit reached (${machines.length}/${maxDevices}). ` +
               `Run \`cortex devices\` to see your active devices and deactivate old ones.`
      }, { status: 403 });
    }
    await db.activation.create({
      data: { keyId: record.id, machineId: machine, activatedAt: new Date() }
    });
  } else {
    // Update last seen timestamp
    await db.activation.updateMany({
      where: { keyId: record.id, machineId: machine },
      data: { lastSeenAt: new Date() },
    });
  }

  // 3. Build tier limits
  const limits = TIER_LIMITS[record.tier];

  // 4. Sign JWT (RS256 — asymmetric, so client can't forge)
  const jwt = await new SignJWT({
    tier: record.tier,
    org: record.orgName,
    email: record.email,
    seats: record.seats,
    features: record.features,
    limits,
  })
    .setProtectedHeader({ alg: "RS256" })
    .setIssuedAt()
    .setExpirationTime("30d")     // JWT valid 30 days; client re-validates every 72h
    .sign(PRIVATE_KEY);

  // 5. Return JWT + decoded payload for immediate client use
  return Response.json({ jwt, payload: decodeJwt(jwt) });
}

const TIER_LIMITS = {
  free:       { maxEntities: -1, maxSyncsPerMonth: -1, maxContextTokens: -1, maxConstraints: -1, maxWorkspaces: -1, maxAgents: -1 },
  pro:        { maxEntities: -1, maxSyncsPerMonth: -1, maxContextTokens: -1, maxConstraints: -1, maxWorkspaces: -1, maxAgents: -1 },
  team:       { maxEntities: -1, maxSyncsPerMonth: -1, maxContextTokens: -1, maxConstraints: -1, maxWorkspaces: -1, maxAgents: -1 },
  enterprise: { maxEntities: -1, maxSyncsPerMonth: -1, maxContextTokens: -1, maxConstraints: -1, maxWorkspaces: -1, maxAgents: -1 },
};
```

**CLI polling endpoint — `/api/subscribe-status`:**

```typescript
// license-server/src/routes/subscribeStatus.ts

export async function handleSubscribeStatus(req: Request) {
  const { subscribe_id } = await req.json();
  if (!subscribe_id) return Response.json({ error: "subscribe_id required" }, { status: 400 });

  const pending = await db.pendingSubscription.findUnique({ where: { subscribeId: subscribe_id } });
  if (!pending) return Response.json({ status: "unknown" });

  if (pending.status === "completed" && pending.licenseKey) {
    return Response.json({ status: "completed", key: pending.licenseKey });
  }

  return Response.json({ status: pending.status });
}
```
### Step 6: Stripe Webhooks → Key Lifecycle

```typescript
// license-server/src/stripe/webhooks.ts

export async function handleStripeWebhook(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const tier = session.metadata.tier as Tier;
      const email = session.customer_email!;
      const subscribeId = session.metadata.subscribe_id || null;

      // Generate unique license key
      const key = `cortex_${tier}_${randomBytes(24).toString("hex")}`;

      const license = await db.licenseKey.create({
        data: {
          key,
          tier,
          email,
          orgName: session.metadata.org || "",
          seats: parseInt(session.metadata.seats || "1"),
          features: TIER_FEATURES[tier],
          status: "active",
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: session.subscription as string,
        },
      });

      // If this came from `cortex subscribe`, mark the pending subscription
      // so the CLI's poll loop picks it up within seconds.
      if (subscribeId) {
        await db.pendingSubscription.update({
          where: { subscribeId },
          data: { status: "completed", licenseKey: key },
        });
      }

      // Email key to customer (fallback if CLI poll times out)
      await sendEmail(email, "Your Cortex License Key", `
        Run this in your terminal:
        
        cortex activate ${key}
      `);
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object;
      await db.licenseKey.updateMany({
        where: { stripeSubscriptionId: sub.id },
        data: { status: "cancelled" },
      });
      // Cached JWTs will expire naturally within 30 days.
      // On next 72h revalidation, client gets rejected → falls to free.
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object;
      await db.licenseKey.updateMany({
        where: { stripeCustomerId: invoice.customer as string },
        data: { status: "payment_failed", gracePeriodEnds: addDays(new Date(), 7) },
      });
      // Key still validates for 7 more days (grace period).
      break;
    }
  }
}
```

### Step 7: Graceful Degradation & Cancellation Flow

```
Offline degradation (existing customer):

Hour 0:    ✅ Pro features work (JWT cached, fresh)
Hour 71:   ✅ Pro features work (cache still within 72h TTL)
Hour 73:   ⚠️  Cache expired. Cortex tries remote validation.
           ❌ No internet. Remote validation fails.
           ✅ BUT: JWT itself hasn't expired (30-day JWT lifetime).
           ✅ Cortex uses stale cache as grace — Pro features STILL WORK.
Day 30:    ❌ JWT itself expires (30-day lifetime hit).
           ❌ Still no internet. Cannot refresh.
           ⬇️  Graceful downgrade to free tier.
           📢 "Your Cortex Pro license could not be validated.
               Features have been limited to free tier.
               Connect to the internet to restore your license."
```

```
Non-payment / cancellation:

Day 0:     ❌ Stripe invoice fails or user cancels subscription.
           Stripe webhook sets key status → "cancelled".
           🔑 Cached JWT still valid (30-day lifetime).
Day 0-3:   ✅ Pro features still work (fresh cache).
Day 3:     ⚠️  Cache refresh triggers. Client tries remote validation.
           ❌ Server sees key is "cancelled". Returns 401.
           ⬇️  Graceful downgrade to free.
           📢 "Your Cortex Pro subscription was cancelled.
               Features reverted to free tier.
               Reactivate: cortex subscribe"
           💾 Soul data, settings, and .knowledge/ are PRESERVED on disk.
               Re-subscribing restores Pro features immediately — no data lost.
```

```
Trial lifecycle:

Day 0:     ✅ First run. Auto-granted 14-day Pro trial.
           📢 "💡 Pro trial — 14 days remaining. Experience all features."
Day 11:    ✅ Trial still active. Status shows warning.
           📢 "⚠️  Pro trial ends in 3 days. Run \`cortex subscribe\` to keep Pro."
Day 14:    ⬇️  Trial expires. Graceful downgrade to free.
           📢 "⏱ Pro trial ended (you used 14 of 14 days). Run \`cortex subscribe\` to reactivate."
Day 15+:   🆓 Free tier. Trial is one-time — re-installing won't reset it.
           All paid features return CortexLicenseError.
           📢 "⚡ This feature requires Cortex PRO. Upgrade: https://cortex.dev/pricing"
```

```
Downgrade between paid tiers (e.g. Pro → Hobby):

Day 0:     User changes plan from Pro to Hobby on website.
           Stripe webhook updates key: tier → "hobby", features → HOBBY_FEATURES.
           🔑 Cached JWT still signed for Pro (30-day lifetime).
Day 0-3:   ✅ Pro features still work within the 72h cache window.
Day 3:     ⚠️  Cache refresh. Server issues new JWT with Hobby features.
           ⬇️  Soul, advisor, custom quality stop working.
               Caching, deep bootstrap, cost analytics remain.
           📢 "Plan changed to Cortex HOBBY. Soul features suspended.
               Upgrade back anytime — your Soul data is preserved."
```

```
Upgrade with proration (e.g. Hobby → Pro mid-cycle):

Day 0:     User upgrades from Hobby to Pro on website.
           Stripe prorates remaining Hobby balance.
           ⚡ Key is updated immediately on license server.
Day 0:     ✅ Next CLI operation triggers cache refresh.
           ✅ New JWT with Pro features. Soul activates immediately.
           📢 "Upgraded to Cortex PRO! Soul is now active.
               Your pattern history continues uninterrupted."
```

The developer NEVER sees a crash. Paid features
return CortexLicenseError (caught by CLI with friendly message),
free features continue working perfectly. Data from paid features
(Soul, custom formulas, tech debt register) is preserved on disk indefinitely.
Re-subscribing restores everything instantly — the lock-in is the data, not DRM.
Developer has Pro license, goes offline for 3 days:

Hour 0:    ✅ Pro features work (JWT cached, fresh)
Hour 71:   ✅ Pro features work (cache still within 72h TTL)
Hour 73:   ⚠️  Cache expired. Cortex tries remote validation.
           ❌ No internet. Remote validation fails.
           ✅ BUT: JWT itself hasn't expired (30-day JWT lifetime).
           ✅ Cortex uses stale cache as grace — Pro features STILL WORK.
Day 30:    ❌ JWT itself expires (30-day lifetime hit).
           ❌ Still no internet. Cannot refresh.
           ⬇️  Graceful downgrade to free tier.
           📢 "Your Cortex Pro license could not be validated.
               Features have been limited to free tier.
               Connect to the internet to restore your license."

```
Trial lifecycle:

Day 0:     ✅ First run. Auto-granted 14-day Pro trial.
           📢 "💡 Pro trial — 14 days remaining. Experience all features."
Day 11:    ✅ Trial still active. Status shows warning.
           📢 "⚠️  Pro trial ends in 3 days. Run \`cortex subscribe\` to keep Pro."
Day 14:    ⬇️  Trial expires. Graceful downgrade to free.
           📢 "⏱ Pro trial ended (you used 14 of 14 days). Run \`cortex subscribe\` to reactivate."
Day 15+:   🆓 Free tier. All paid features return CortexLicenseError.
           📢 "⚡ This feature requires Cortex PRO. Upgrade: https://cortex.dev/pricing"

The developer NEVER sees a crash. Paid features
return CortexLicenseError (caught by CLI with friendly message),
free features continue working perfectly.
```

### Step 8: Anti-Abuse (Lightweight, Not DRM)

```
┌──────────────────────────────────────────────────────────┐
│  What we do (speed bumps for honest users):              │
│                                                          │
│  ✅ Machine fingerprint — one trial per machine          │
│  ✅ 3-device limit per license — covers laptop, desktop, │
│     and CI; prevents casual key-sharing with 10 friends  │
│  ✅ JWT signed with RS256 — can't forge without priv key │
│  ✅ 72h cache refresh — revoked keys stop working soon   │
│  ✅ `cortex devices` — self-service device management    │
│                                                          │
│  What we DON'T do (walls that destroy trust):            │
│                                                          │
│  ❌ Binary obfuscation or code encryption                │
│  ❌ Phone-home telemetry on every command                 │
│  ❌ TPM/dongle hardware binding                           │
│  ❌ Encrypted .knowledge/ files                          │
│  ❌ Legal threats in error messages                       │
└──────────────────────────────────────────────────────────┘

Philosophy: Make it easier to pay $19/mo than to maintain
a patched fork. The 5 minutes spent patching requireTier()
on every npm update is worth more than $19/mo in eng time.
```

### Step 8.5: Team Seat Management

For team tiers (Startup/Team/Business), seats are managed via the license server. The flow:

**Invite flow:**
```
Admin runs:       cortex invite --email alice@company.com --role editor
Server action:    Creates a pending seat invitation (valid 7 days).
                  Emails alice with: cortex join --org <org> --invite <code>
Alice runs:       cortex join --org acme --invite abc123
Server action:    Verifies invite code, decrements available seats,
                  issues Alice her own signed JWT under the org license.
                  Alice's JWT has: tier=team, seats=N, org=acme
```

**Seat counting:**
- Each activation of an invite consumes one seat.
- `cortex team seats` shows: used/total, with list of active members.
- When a member leaves: `cortex revoke --email alice@company.com` frees their seat.
- If all seats are used, `cortex invite` returns "No seats available. Upgrade at cortex.dev/pricing."

This avoids the complexity of having every team member share one license key. Each member gets their own JWT, enabling per-user audit trails and individual feature flags.

```typescript
// license-server/src/routes/invite.ts

export async function handleInvite(req: Request) {
  const { orgLicenseKey, email, role } = await req.json();

  // 1. Validate org license
  const license = await db.licenseKey.findUnique({ where: { key: orgLicenseKey } });
  if (!license || license.status !== "active") {
    return Response.json({ error: "Invalid license" }, { status: 401 });
  }

  // 2. Count current active seats
  const activeSeats = await db.seatAssignment.count({
    where: { orgId: license.id, status: "active" },
  });
  if (activeSeats >= license.seats) {
    return Response.json({ error: "No seats available" }, { status: 403 });
  }

  // 3. Create invitation
  const code = randomBytes(16).toString("hex");
  await db.seatInvitation.create({
    data: { code, email, role, orgId: license.id, expiresAt: addDays(new Date(), 7) },
  });

  await sendEmail(email, "You've been invited to Cortex", `
    Run: cortex join --org ${license.orgName} --invite ${code}
  `);
  return Response.json({ invited: email, seatsRemaining: license.seats - activeSeats - 1 });
}
```

```typescript
// CLI commands
program
  .command("invite <email>")
  .description("Invite a teammate to your Cortex org (requires admin key)")
  .action(async (email: string) => { /* ... */ });

program
  .command("join")
  .description("Accept an org invitation")
  .requiredOption("--org <org>", "Organization name")
  .requiredOption("--invite <code>", "Invitation code")
  .action(async (opts) => { /* ... */ });

program
  .command("revoke <email>")
  .description("Revoke a team member's seat")
  .action(async (email: string) => { /* ... */ });

program
  .command("team seats")
  .description("Show seat usage for your org")
  .action(async () => {
    const license = getActiveLicense();
    if (!["startup", "team", "business"].includes(license.tier)) {
      console.log("Seat management is available on Startup+ plans.");
      return;
    }
    console.log(`Seats: ${used}/${license.seats}`);
    // ...
  });
```

### Step 9: Database Schema (Prisma)

```prisma
// license-server/prisma/schema.prisma

model LicenseKey {
  id                    String       @id @default(cuid())
  key                   String       @unique  // cortex_pro_abc123...
  tier                  String       // free | pro | team | enterprise
  email                 String
  orgName               String       @default("")
  seats                 Int          @default(1)
  features              String[]     // explicit feature flags
  status                String       @default("active") // active | cancelled | payment_failed
  gracePeriodEnds       DateTime?
  stripeCustomerId      String?
  stripeSubscriptionId  String?
  createdAt             DateTime     @default(now())
  activations           Activation[]
  usageRecords          UsageRecord[]
}

model Activation {
  id          String     @id @default(cuid())
  keyId       String
  key         LicenseKey @relation(fields: [keyId], references: [id])
  machineId   String     // SHA256 fingerprint
  activatedAt DateTime   @default(now())
  lastSeenAt  DateTime   @default(now())

  @@unique([keyId, machineId])
}

model UsageRecord {
  id              String     @id @default(cuid())
  keyId           String
  key             LicenseKey @relation(fields: [keyId], references: [id])
  month           String     // "2026-05"
  entityCount     Int        @default(0)
  synthesisCount  Int        @default(0)
  contextTokens   BigInt     @default(0)
  reportedAt      DateTime   @default(now())

  @@unique([keyId, month])
}

model SeatInvitation {
  id        String   @id @default(cuid())
  code      String   @unique
  email     String
  role      String   @default("editor")  // admin | editor | viewer
  orgId     String
  license   LicenseKey @relation(fields: [orgId], references: [id])
  status    String   @default("pending") // pending | accepted | expired
  expiresAt DateTime
  createdAt DateTime @default(now())
}

model SeatAssignment {
  id        String   @id @default(cuid())
  orgId     String
  license   LicenseKey @relation(fields: [orgId], references: [id])
  email     String
  role      String   @default("editor")
  machineId String?  // SHA256 fingerprint, set on first activation
  status    String   @default("active")  // active | revoked
  joinedAt  DateTime @default(now())
  revokedAt DateTime?

  @@unique([orgId, email])
}

model PendingSubscription {
  subscribeId String   @id
  tier        String
  status      String   @default("pending")  // pending | completed | expired
  licenseKey  String?  // set when Stripe webhook fires
  createdAt   DateTime @default(now())
}

model Trial {
  machineId    String   @id
  grantedAt    DateTime @default(now())
  trialEndsAt  DateTime
}
```

### Step 10: Full Implementation Checklist

```
Phase A: Client-Side Gate (ship FIRST — before any paid feature)
──────────────────────────────────────────────────────────────
□  Create src/core/license.ts (code above)
□  Add requireTier() calls to all existing paid-tier functions
□  Add "cortex activate <key>" CLI command
□  Add "cortex deactivate" CLI command
□  Add "cortex subscribe [tier]" CLI command
□  Add "cortex features" CLI command
□  Add trial auto-grant logic (step 4 in getActiveLicense)
□  Add tier display + trial countdown to "cortex status"
□  Test: free tier works with zero config (no key, no internet)
□  Test: first run auto-grants 14-day Pro trial (online)
□  Test: offline first run falls back to free gracefully
□  Test: trial countdown shows at 3 days / expired states
□  Test: paid features throw friendly CortexLicenseError
□  Test: offline cache works for 72h
□  Test: graceful degradation after cache + JWT expiry

Phase B: License Server (ship SECOND — enables first paid customer)
──────────────────────────────────────────────────────────────
□  Init license-server repo (private, NOT on npm)
□  Set up Prisma + Postgres
□  Implement POST /api/validate
□  Implement POST /api/activate
□  Implement POST /api/trial (14-day Pro trial, once per machine)
□  Implement POST /api/subscribe-status (CLI polling)
□  Add Trial + PendingSubscription models to Prisma schema
□  Generate RS256 keypair; embed public key in projectcortex npm package
□  Deploy to Fly.io / Railway
□  Test: cortex activate <valid-key> succeeds
□  Test: cortex activate <invalid-key> shows error
□  Test: trial auto-grant works once per machine (second request returns 403)
□  Test: machine limit enforcement works

Phase C: Stripe Integration (ship THIRD — enables self-serve purchase)
──────────────────────────────────────────────────────────────
□  Create Stripe products: Pro ($19/mo), Team ($49/seat/mo)
□  Build cortex.dev/pricing page with Stripe Checkout links
□  Pass subscribe_id metadata on CLI-initiated checkouts
□  Implement Stripe webhook handlers (checkout, cancel, payment_failed)
□  Mark PendingSubscription as completed on checkout.session.completed
□  Auto-email license key on checkout.session.completed (fallback)
□  7-day grace period on payment failure
□  Test: `cortex subscribe` → browser → pay → auto-activated (no copy-paste)
□  Test: `cortex subscribe` → browser → close → still works via email fallback
□  Test: full purchase → activate → use → cancel → downgrade flow

Phase D: Team Seat Management (ship FOURTH — enables team tiers)
──────────────────────────────────────────────────────────────
□  Implement POST /api/invite & POST /api/join endpoints
□  Add SeatInvitation, SeatAssignment models to Prisma
□  Add `cortex invite <email>` CLI command
□  Add `cortex join --org --invite` CLI command
□  Add `cortex revoke <email>` CLI command
□  Add `cortex team seats` CLI command
□  Test: invite → join → seat consumed → revoke → seat freed flow
□  Test: inviting when all seats full returns clear error
□  Test: expired invitation is rejected

Phase E: Usage Metering (ship FIFTH — optional analytics)
──────────────────────────────────────────────────────────────
□  Track entity count, synthesis count per month in state.json (opt-in)
□  POST /api/usage on each cortex sync (anonymized, opt-out flag)
□  "cortex status --usage" shows monthly consumption (informational only)
```

---

## 📋 Quick Reference — "What Tier Do I Need?"

| I want to... | Tier |
|---|---|
| Use Cortex on any project, unlimited entities & syncs | 🆓 Free |
| See a live interactive knowledge graph | 🆓 Free |
| Auto-synthesize on file save | 🆓 Free |
| Context packs for my AI agent | 🆓 Free |
| Save 30-60% on LLM API costs via caching | 🪴 Hobby ($9) |
| Deep bootstrap | 🪴 Hobby ($9) |
| See exactly where my LLM budget goes | 🪴 Hobby ($9) |
| Personalized Librarian that remembers my patterns (Soul) | 💎 Pro ($24) |
| AI architectural advisor + what-if analysis | 💎 Pro ($24) |
| Custom quality formulas | 💎 Pro ($24) |
| Share knowledge across a 2-5 person team | 🌱 Startup ($29/seat) |
| Run multiple specialized Librarian agents | 🌱 Startup ($29/seat) |
| Full multi-repo federation + central server | 👥 Team ($49/seat) |
| RBAC, audit trails, SSO, workflow integrations | 🏛️ Business ($99/seat) |
| Deploy air-gapped / on-prem with SOC2 pack | 🏢 Enterprise (custom) |
| I maintain an open-source project (≥100 ⭐) | 🌿 OSS Program (free Pro) |

---

## 🛡️ Moat Summary

The moat is **not** DRM. The moat is:

1. **Data depth**: 12 months of `.knowledge/` is irreplaceable
2. **Execution speed**: 70+ phases deep, competitors start at zero
3. **Soul personalization**: The Librarian learns *this team's* patterns
4. **Ecosystem lock-in**: Constraint YAML, Librarian schemas, IDE sync configs
5. **Enterprise features**: SSO/RBAC/audit/air-gap takes years to build properly
6. **Community**: The free tier builds a community that validates and evangelizes
7. **Smooth pricing ramp**: $0 → $9 → $24 → $29/seat → $49/seat → $99/seat eliminates "sticker shock" decision paralysis

The license server is a **speed bump**, not a wall. It keeps honest people honest and enterprises compliant. The real lock-in is that Cortex gets better the longer you use it.

### Why Not Just Use X?

| Instead of Cortex | Gap |
|---|---|
| **Obsidian + manual notes** | No auto-synthesis, no MCP, no AI agent integration. You write everything by hand. |
| **Sourcegraph/Cody** | Code search only, no architectural knowledge graph, no Soul/personalization, no cross-repo federation. |
| **Copilot/Codeium** | Code completion, not architecture understanding. They don't model your codebase structure. |
| **Notion/Confluence wiki** | Manual documentation that rots. Cortex auto-generates and stays current with your code. |
| **`tree` + grep** | Works for file structure, not for relationships, dependencies, intent, or architectural patterns. |
| **A custom script** | You'd be building Phases 1-63 yourself. Cortex is 18 shipped phases + 70+ planned. |
| **Another MCP server** | Almost all are generic "read a file" tools. Cortex has an evolving knowledge graph, quality scoring, blast-radius analysis, and team federation. |

Cortex's real competitor is **the developer who doesn't know they need it yet** — not another tool.
