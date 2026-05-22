# Project Cortex — Revenue Model (Canonical Reference)

> **Status**: Authoritative source-of-truth for pricing, monetization, licensing, billing operations, and edge-case handling.
> **Supersedes**: any conflicting language in `mvp.md`, `priority_phase.md`, `implementation_plan.md`, or `flaws.md`.
> **Last updated**: 2026-05-22
> **Distribution**: npm (`projectcortex`) — open-core, public source, server-gated paid features.

This document is the contract. If anything in another file disagrees with this one, fix the other file.

---

## TABLE OF CONTENTS

1. [Strategic Summary](#1-strategic-summary)
2. [Pricing Tiers — The Canonical Matrix](#2-pricing-tiers--the-canonical-matrix)
3. [Special Programs](#3-special-programs)
4. [Licensing Architecture](#4-licensing-architecture)
5. [Acquisition Funnel & Conversion Targets](#5-acquisition-funnel--conversion-targets)
6. [Revenue Projections](#6-revenue-projections)
7. [Billing & Payment Operations](#7-billing--payment-operations)
8. [Edge Cases & Failure Modes](#8-edge-cases--failure-modes)
9. [Compete & Switching Programs](#9-compete--switching-programs)
10. [Roadmap → Revenue Mapping](#10-roadmap--revenue-mapping)
11. [Governance, Compliance, Legal](#11-governance-compliance-legal)
12. [Anti-Patterns — What Not to Do](#12-anti-patterns--what-not-to-do)
13. [Metrics & KPIs](#13-metrics--kpis)
14. [Pricing Change Policy](#14-pricing-change-policy)
15. [Open Questions & Decisions Pending](#15-open-questions--decisions-pending)

---

## 1. STRATEGIC SUMMARY

### What we sell
**Cortex is an open-core architectural memory tool.** The core code ships free on npm. Paid features (~70% of phases) are gated by a remote license server. Customers pay for unlocked capability tiers, not for usage volume.

### Pricing principles (immovable)
1. **Free tier IS the product**, not a teaser. If Free isn't "holy shit" within 20 minutes of install, we fail regardless of paid features.
2. **Marginal cost per free user ≈ $0** because the user pays their own LLM bill. We pay only license-server infra (~$0.001/user/month).
3. **No usage caps anywhere.** Tiers unlock *features*, never quotas. Unlimited entities, syncs, workspaces, agents, context tokens across all tiers.
4. **Annual billing saves ~17%.** Monthly = list price; annual = ~10× monthly (instead of 12×).
5. **The moat is data depth + flywheel, not DRM.** License gates keep honest people honest; the real lock-in is 6+ months of `.knowledge/` accumulated institutional memory.
6. **No per-token surcharge.** We never take a cut of the customer's LLM spend. Doing so would put us in competition with Anthropic/OpenAI directly. Bad lane.

### The market positioning
| Vector | Cortex | Cursor / Copilot / Cody |
|--------|--------|-------------------------|
| Code completion | ❌ Not our game | ✅ Their game |
| Architectural memory | ✅ Our moat | ❌ Shallow |
| Compliance / air-gap | ✅ Phase 27/32 unlocks regulated industries | ❌ Cloud-only |
| Cross-AI coordination | ✅ Phase 49 + Phase 43 family | ❌ Each tool siloed |
| Long-term flywheel | ✅ Knowledge compounds | ❌ Reset every session |
| Time-to-wow | ⚠ Bootstrap needed (Phase 33 fixes) | ✅ Tab-completion |

**We do not compete with Cursor for the autocomplete dollar.** We compete for the **architectural-intelligence and compliance** budget — a different procurement line item.

### Revenue ranges (validated against priority_phase.md and mvp.md projections)

| Year | ARR Range | Customer Mix |
|------|-----------|--------------|
| Y1 (post-Stages 1-4 fix + Phase 33 + A.1) | $50K–$500K | Hobby + Pro only |
| Y2 (post-Phase 22 + 25) | $500K–$3M | + Startup + Team |
| Y3 (post-Phase 31 + 26 + 27) | $3M–$15M | + Business |
| Y4 (post-Phase 32 SOC2 + 32.1 marketplaces) | $15M–$50M | + Enterprise |
| Y5 (post-Phase 49 flywheel + Phase 30.1 switching) | $30M–$100M | + Network effects |

These projections are **mid-case**, **conditional on shipping the ~30-phase strategic subset** identified in `flaws.md` Tier A+B, NOT the full 189-phase plan.

---

## 2. PRICING TIERS — THE CANONICAL MATRIX

### Tier overview

```
$0       $9/$90    $24/$240   $29/$290   $49/$490   $99/$990    $199+/custom
 │        │         │          /seat       /seat      /seat       /seat
 ▼        ▼         ▼          ▼           ▼          ▼           ▼
Free → Hobby  →   Pro    →  Startup  →  Team   →  Business →  Enterprise
                                                                  │
Special:   OSS Program  ·  EDU  ·  GOV/Defense  ·  Compete  ·  Reseller
```

All paid tiers offer **annual billing at ~17% discount** (10× monthly).

### Tier 0 — Free ($0/forever)

**Eligibility**: any individual or organization. No verification required.
**Target user**: every developer on Earth — students, indie hackers, senior staff, OSS maintainers.

**Included (this is everything in Phase 1-10, 13.x base, 13.7.2):**
- Full pipeline: watcher, auto-synthesis, storage, MCP, CLI
- Phase 6 constraints & blast-radius (unlimited rules)
- Phase 7 full audit trail (log, quality, lint, evolution)
- Phase 7.5 quality scoring (read-only — view, can't customize formulas)
- Phase 8 live interactive graph + Phase 8.1 WebSocket streaming
- Phase 9 refactoring impact preview
- Phase 10 onboarding & guided reading
- Phase 13 context packs, brevity, budget gating
- Phase 13.5 fuzzy search, Phase 13.7.2 grounded fallback
- Unlimited entities, syncs, constraints, workspaces, agents, context tokens

**NOT included** (these are the upgrade triggers):
- LLM caching (Phase 3.1) → Hobby
- Deep bootstrap (Phase 33) → Hobby
- Soul / advisor / custom quality (Phases 13.8, 20, 7.7) → Pro
- Multi-agent / federation / shared knowledge → Startup / Team
- SSO / RBAC / audit / air-gap → Business / Enterprise

**Cost to us**: license-server hit + telemetry (~$0.001/user/month). Effectively zero.

### Tier 1 — Hobby ($9/month or $90/year)

**Pitch**: *"Costs $9, saves you $30+ on API calls. Negative-cost upgrade."*
**Target**: solo devs who use Cortex daily and want it smarter + cheaper.
**Conversion narrative**: LLM caching pays for itself within days.

**Adds to Free:**
- Phase 3.1 LLM Caching Store (30-60% API cost reduction)
- Phase 7.6 Global Architectural Lessons & Retrospective Log
- Phase 12 (basic) Git & CI Integration
- Phase 13.3 Token & Cost Savings Ledger & Analytics
- Phase 33 Deep Recursive Bootstrap (one-command setup)

**Why $9**: under the "annoyance threshold" — no internal-budget-approval needed for individuals. Aligns with prosumer SaaS norms (1Password $7.99, Tailscale $5).

### Tier 2 — Pro ($24/month or $240/year)

**Pitch**: *"Your Librarian learns your patterns, advises on refactors, and keeps your knowledge healthy."*
**Target**: professional solo devs, freelancers, senior engineers.
**Conversion narrative**: after 2 weeks, switching tools feels like losing a teammate.

**Adds to Hobby:**
- Phase 5.9 Shell Status Prompt
- Phase 7.5+ custom quality formulas + unlimited constraints
- Phase 7.7 Automated Technical Debt Register
- Phase 7.8 Graph-Driven Review Advisories
- Phase 7.9 Knowledge Garbage Collection
- Phase 8.2 Karpathy Obsidian compliance
- Phase 9.1 Dependency Path Querying
- Phase 12.2 Git pre-commit guardrails
- Phase 12.3 Architecturally Aware Commit Generation
- Phase 13.6 Proximity Reranking & Smart Snippets
- Phase 13.8 Persistent Experience & Cognitive Mode-Adaptive Context (Soul)
- Phase 14 Large-Diff Clustering
- Phase 20 Intelligent Architectural Advisor
- Phase 20.1 What-If Simulation
- Phase 20.3 Design Pattern Suggestion
- Phase 20.5 + 20.5.1 ADR Engine
- Phase 20.13 Pattern Skill Library
- Phase 20.19 Surgical Knowledge Editing
- Phase 20.22 Spaced Repetition
- Phase 20.28-20.30 Agentic / Corrective / Iterative RAG
- Phase 33 deep variant (full RAPTOR retrieval)

**Why $24**: aligns with Cursor ($20) and Claude Code Pro ($20) — neither below (perceived as toy) nor above (forces internal approval).

### Tier 3 — Startup ($29/seat/month or $290/seat/year — 2-10 seats)

**Pitch**: *"Multi-agent, shared knowledge, polyrepo — team features at startup prices."*
**Target**: early-stage teams, indie studios, agencies.
**Per-team ACV**: ~$1,000-$3,500/year.

**Adds to Pro:**
- Phase 4.6 Developer API & Client SDKs
- Phase 4.8 Persona-Specific MCP Prompts
- Phase 5.6 Daemon Watchdog & Self-Healing
- Phase 7.10 Sensitive Data & API Secret Sanitization
- Phase 10.2 Smart Rule File Patching
- Phase 11 Monorepo Federation
- Phase 16 Contradiction-Aware Retrieval
- Phase 20.7 Personalized Per-Developer Memory
- Phase 20.7.2 Mem0-style Memory Consolidation
- Phase 20.7.3 Prospective Memory
- Phase 56 (Multi-Operator Session Coordination)

**Seat constraint**: 2-10 seats. Above 10, must upgrade to Team. Below 2, must downgrade to Pro.

### Tier 4 — Team ($49/seat/month or $490/seat/year — 5-50 seats)

**Pitch**: *"Central knowledge server, cross-repo federation, human-reviewed quality gates."*
**Target**: mid-size engineering teams.
**Per-team ACV**: ~$2,500-$25,000/year.

**Adds to Startup:**
- Phase 4.7 OpenAI-Compatible REST Gateway
- Phase 5.7 Scheduled Operations & Cron Engine
- Phase 14.2 RAPTOR Topological Retrieval
- Phase 17 Active Disambiguation
- Phase 17.1 Multi-Model Architectural Debate
- Phase 21 Polyrepo Federation
- Phase 22 Central Knowledge Server
- Phase 23 Human-in-the-Loop Review
- Phase 24 Compliance Constraint Templates
- Phase 57 Cross-Agent Workspace State Sync
- Phase 58 Multi-Agent Librarian Collaboration

**Seat constraint**: 5-50 seats. Above 50, must upgrade to Business.

### Tier 5 — Business ($99/seat/month or $990/seat/year — 10-200 seats)

**Pitch**: *"SSO, RBAC, immutable audit, Jira/Slack — 'Legal says yes.'"*
**Target**: larger orgs needing compliance + integrations but not full enterprise.
**Per-customer ACV**: ~$10,000-$200,000/year.

**Adds to Team:**
- Phase 25 Enterprise SSO/SCIM (SAML 2.0, OIDC)
- Phase 26 RBAC, ABAC & Immutable Audit Trail
- Phase 26.1 DLP & PII Redaction
- Phase 26.3 OpenTelemetry Tracing
- Phase 28 Enterprise Workflow Integrations Hub (Jira/Slack/Teams)
- Phase 29 FinOps — Cost Governance & Chargeback
- Phase 30 Knowledge Migration & Legacy Ingest
- Phase 31 Executive Analytics, ROI Dashboard & QBR Generator
- Phase 33.1 Model Provider Registry & Cost-Tier Routing
- Phase 33.2 Remote Operations & Mobile Status PWA

**Seat constraint**: 10-200 seats. Above 200, must move to Enterprise.

### Tier 6 — Enterprise (Custom, starts ~$199/seat/month)

**Pitch**: *"Air-gapped, BYO-key, SOC2-ready. Deploys where your compliance requires it."*
**Target**: large orgs (200-5000+ devs), regulated industries, government, defense.
**Per-customer ACV**: ~$100,000-$2,000,000/year.

**Adds to Business:**
- Phase 25.1 Federated Identity for Cross-Tenant
- Phase 26.2 Policy-as-Code (OPA/Cedar)
- Phase 26.4 Cryptographic Event Signing & Non-Repudiation
- Phase 27 Air-Gapped, Sovereign & BYO-Key Deployment
- Phase 29.1 Approved Model Allowlists
- Phase 29.2 Tenant-Scoped Billing
- Phase 30.1 External AI Conversation Import (migration moat)
- Phase 30.2 Knowledge Base Merge Engine
- Phase 32 Vendor Risk + SOC2/ISO/FedRAMP Procurement Pack
- Phase 32.1 AWS/GCP/Azure Marketplace listings
- Phase 32.2 SBOM & SLSA Supply Chain Security
- Phase 49 Cross-Deployment Synthesis Learning (with opt-in/opt-out controls)
- Future Phase 40-45 family if/when ships (Cognitive Substrate)

**Custom dimensions**:
| Dimension | Enterprise |
|-----------|------------|
| Seats | Unlimited (volume discounts) |
| Deployment | Self-hosted, air-gapped, cloud, hybrid |
| SSO | SAML 2.0, OIDC, SCIM provisioning |
| Audit | Immutable, signed, SOC2-ready |
| SLA | 99.9% uptime; custom tiers up to 99.99% |
| Support | Dedicated account manager, private Slack channel, 24/7 incident response on Premium support tier |
| Contract | 1, 2, or 3-year terms; multi-year discounts |
| Payment | Invoice (NET 30/60), wire, ACH, marketplace |

---

## 3. SPECIAL PROGRAMS

### 3.1 OSS Program — Free Pro for Qualifying Open-Source Projects

**Eligibility**:
- Public GitHub/GitLab repo
- **≥100 stars** OR accepted into a recognized OSS foundation (Apache, CNCF, Linux Foundation, Eclipse, Software Freedom Conservancy, etc.)
- Active development (≥1 commit in last 90 days)
- License is OSI-approved (MIT, Apache 2.0, BSD, GPL, MPL, etc.)

**What they get**: full Pro tier features, $0 cost. Special badge in `cortex status`: `🌿 Open Source Program`.

**Application**: `cortex apply-oss --repo <github-url>` → auto-verifies via GitHub API (public, star count, commit recency, license).

**Renewal**: re-verified every 6 months. If criteria fail (stars drop, abandonment), revert to Free tier with 30-day notice.

**Abuse mitigation**:
- Same machine fingerprint can hold at most 1 OSS license.
- Star-count fraud detection: cross-check `created_at` distribution, account-age distribution of stargazers; flag anomalies for manual review.
- Forked-and-pumped repos: require the GitHub repo to be the canonical upstream (high inbound network signal).

### 3.2 Education Program

**Eligibility**:
- Verified `.edu` email OR GitHub Education Pack member OR ID upload via SheerID
- Active enrollment (undergrad / grad / bootcamp / faculty)

**What they get**: **50% off Pro** ($12/mo or $120/yr). Or full Pro free for ≤90 days during a verified course.

**Renewal**: re-verified every academic year. Auto-downgrade on graduation/expiry.

### 3.3 Government / Defense Program

**Eligibility**: verified `.gov`, `.mil`, or contracting entity with CAGE code.

**What they get**:
- GSA Schedule pricing (typically 15-25% off list)
- FedRAMP Moderate baseline once Phase 32 ships
- Air-gap deployment (Phase 27) included
- Per-agency MSA template
- US-based support
- ITAR / EAR awareness on personnel access

**Pricing**: starts at $299/seat/month for FedRAMP-tier (Enterprise plus federal premium).

### 3.4 Compete Program — Switching Credits

**Eligibility**: customer demonstrates active paid subscription to Cursor, GitHub Copilot Enterprise, Sourcegraph Cody, JetBrains AI Assistant, Codeium Enterprise, or Tabnine within last 90 days.

**Offer**:
- **6 months of Pro free** (or equivalent at Team tier — 6 months at 50% off)
- **Phase 30.1 conversation import** included free (otherwise Enterprise-only)
- Free white-glove migration assistance (1 engineering session)

**Cap**: max 100 redemptions/quarter to prevent abuse. Eligibility verified via receipt upload or company email check.

### 3.5 Affiliate / Referral Program

**Mechanic**:
- Anyone with a Pro+ license gets a referral link.
- New paid signup via the link → **referrer gets $50 credit + referee gets $20 off first month**.
- Reward cap: $500/quarter per referrer (~10 referrals).
- Stacks with annual billing discount.

**Special "evangelist" tier**: developers referring 25+ paid customers in a year get **lifetime Pro free** + speaker invitations + co-marketing opportunities.

### 3.6 Channel / Reseller Program

**Tiers**:
- **Authorized Reseller**: 15% margin, post-sale support shared
- **Solution Partner** (consulting firms reselling + implementing): 25% margin, co-sell motion, joint customer-success
- **Strategic Partner** (enterprise sales firms): 30% margin, named account list, joint quotas

**Activation gate**: minimum $250K booked ARR through the partner channel within 12 months OR demonstrated enterprise customer pipeline.

### 3.7 Open-Source Contributor Recognition

Contributors to the Cortex GitHub repo (non-trivial PRs merged) get:
- **Lifetime Pro free** for the merged contributor's primary GitHub account.
- Listed on cortex.dev/contributors.
- For PRs that ship a paid-tier phase: **lifetime Team tier free** + co-author credit on release notes.

This creates a **virtuous cycle**: contributors get the product they're building.

---

## 4. LICENSING ARCHITECTURE

### 4.1 The open-core model

**What's open** (Apache 2.0 / MIT — TBD final license):
- All source code on npm and GitHub
- Phase 1-13.7.2 features (the Free tier)
- The MCP protocol implementation
- Schema definitions
- All tests

**What's gated** (server-validated):
- Phase 3.1+ paid features (LLM cache, Soul, Advisor, etc.)
- License-server endpoints
- Marketplace integration code (proprietary integrations)
- Enterprise compliance artifacts (SOC2 templates, etc.)

### 4.2 Trust model

```
┌─────────────────────────────────────────────────────────────┐
│  Customer's machine (any source — npm, fork, clone, audit)  │
│                                                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │ src/core/license.ts                                │    │
│  │   ↳ embeds RS256 public key (rotation-versioned)   │    │
│  │   ↳ verifies JWT signature locally                 │    │
│  │   ↳ caches JWT 72h offline                         │    │
│  │   ↳ requireTier() / requireFeature() gates         │    │
│  └────────────────────┬───────────────────────────────┘    │
└────────────────────────┼───────────────────────────────────┘
                         │ HTTPS, only on activate + 72h refresh
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  license.cortex.dev (private, NOT on npm)                  │
│   ↳ RS256 private key (HSM-backed in prod)                  │
│   ↳ Stripe webhooks                                         │
│   ↳ Per-key policy (tier + feature flags + seats + limits) │
│   ↳ Audit log of every issued JWT                           │
│   ↳ Revocation list (CRL)                                   │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 Why this works even with public code

1. **The code is visible. The private key isn't.** Without the private key on `license.cortex.dev`, nobody can forge a valid JWT. The `requireTier()` check verifies against the embedded public key locally.
2. **Patching is possible but expensive**:
   - Lose automatic updates (we ship weekly)
   - Lose paid features that genuinely depend on server-side compute (Phase 49 cross-deployment learning, Phase 22 central server)
   - Diverge from upstream — fork rots within weeks
   - For enterprises: legal can't approve a patched binary anyway
3. **72h offline grace**: license cached locally, works offline for 72h after last validation. After 72h without internet, gracefully degrades to Free (not a hard crash).
4. **The real lock-in is the data**: 6 months of `.knowledge/` is irreplaceable institutional memory. Patching the license check doesn't get you Phase 49's cross-deployment signal, which is server-side.

### 4.4 JWT payload schema (canonical)

```typescript
interface LicensePayload {
  // Standard JWT claims (RFC 7519)
  sub: string;        // unique license key ID
  iss: "license.cortex.dev";
  aud: "projectcortex";
  exp: number;        // expiry epoch seconds
  iat: number;        // issued at
  jti: string;        // unique token ID (replay protection)
  ver: 1;             // JWT schema version (for forward-compat)

  // Cortex claims
  tier: "free" | "hobby" | "pro" | "startup" | "team" | "business" | "enterprise";
  org: string;        // org name (display)
  email: string;      // primary contact
  seats: number;      // licensed seat count
  features: Feature[]; // explicit feature flags (granular control)
  limits: TierLimits; // -1 = unlimited (default for all tiers, all caps)

  // Optional claims
  trial?: { endsAt: number; convertedFrom: "free" | "previous-tier" };
  oss?: { repo: string; verifiedAt: number };
  edu?: { institution: string; verifiedAt: number };
  gov?: { agency: string; cageCode?: string; fedRampLevel?: "moderate" | "high" };
  partnerOrg?: string; // if sold via channel partner
  channel?: "direct" | "aws-mp" | "gcp-mp" | "azure-mp" | "partner";
}
```

### 4.5 Machine fingerprinting (anti-abuse, not DRM)

**Purpose**: prevent trial recycling. NOT for paid customer DRM.

**Algorithm**: SHA-256 of `(hostname || username || platform || arch || cpu-model || total-mem)`. Truncated to 24 chars.

**Used in**:
- Trial system (one trial per machine)
- OSS program (prevent multi-claim)
- License audit (warn if seat used on >5 machines in 30 days — suggests sharing)

**NOT used in**:
- Paid license enforcement (you can run Pro on as many of your own machines as you want)
- Telemetry (we don't profile machines beyond this hash)

### 4.6 License revocation

**Triggers**:
1. **Payment failure** after grace period (see §7.3)
2. **Refund issued** (see §7.5)
3. **ToS violation** (proven abuse, fraud)
4. **Stripe chargeback** filed and not reversed
5. **Customer request** (e.g., key compromised, employee left)

**Mechanism**:
- License-server maintains a **CRL (certificate revocation list)** — JTI of every revoked JWT.
- On every JWT refresh (every 72h), client checks CRL.
- Revoked JWTs gracefully downgrade to Free tier on next refresh.
- **NEVER force-crash a session** mid-edit. Revocation always lands on next refresh cycle.

### 4.7 Air-gapped license model

**Problem**: Enterprise (Phase 27) deployments have no internet — how do they renew?

**Solution**: **long-life signed offline license file**.
- Customer downloads `cortex-license.bin` from `license.cortex.dev` (one-time, requires internet).
- File contains RS256-signed JWT with 1-year expiry.
- Cortex on the air-gapped machine reads the file from `~/.cortex/offline-license.bin`.
- 30 days before expiry, Cortex emits **strong warning** to renew.
- 7 days before expiry, Cortex emits **critical warning** with renewal URL.
- On expiry: gracefully degrades to Free (Enterprise customer maintains their `.knowledge/`).

**Renewal flow**:
- Customer brings a USB to their secure-enclave machine.
- New `cortex-license.bin` downloaded from connected machine.
- Copied across.
- Cortex auto-loads on next start.

**Multi-year air-gap licenses**: available for $5K premium (annual cost). Mitigates renewal friction for SCIF / classified deployments.

---

## 5. ACQUISITION FUNNEL & CONVERSION TARGETS

### 5.1 The activation funnel (per individual developer)

```
1000 install     →  cortex init
 ↓ (80% activate)
 800 active      →  see graph, run first sync, "holy shit" moment
 ↓ (50% retain)
 400 weekly      →  use Cortex 3+ days/week
 ↓ (auto 14-day Pro trial)
 400 trial Pro   →  experience Soul, Advisor, deep bootstrap
 ↓ (8-15% convert)
  32-60 paid     →  Hobby or Pro subscription
```

**Conversion target**: **8-15% trial-to-paid** within 14 days. Industry benchmark for dev tools is 5-12%; we target the upper end because the cost-saving math (Hobby pays for itself via LLM caching) is concrete.

### 5.2 The 14-day Pro trial — the canonical onboarding

**Mechanic**:
- First `cortex init` → license server auto-issues a 14-day Pro JWT.
- No credit card. No website visit. No activation key.
- All Pro features (including Soul, Advisor, Deep Bootstrap, LLM caching) work immediately.
- After 14 days: gracefully downgrades to Free.
- `cortex subscribe pro` → opens browser, completes Stripe checkout, auto-activates.

**Why this works**:
- Removes activation friction (the #1 dev-tool conversion killer).
- The "holy shit" moment happens within minutes of install (live graph, deep bootstrap progress).
- After 14 days, downgrading is felt — losing Soul and Advisor is sticky.

**Trial abuse mitigation**:
- Machine fingerprint can claim 1 trial only.
- IP/email correlation flag for repeated trials from same network/email.
- Trial extension: support team can grant +14 days on request (manual). Auto-grants ≤2 extensions per machine lifetime.

### 5.3 Per-tier conversion targets

| From | To | Target % | Mechanism |
|------|-----|----------|-----------|
| Install | Activated (first sync) | 80% | Phase 33 P0 fix — single command bootstrap |
| Activated | Weekly active | 50% | Phase 8 live graph + auto-context injection wow |
| Weekly active | Trial → paid (any tier) | 8-15% | Cost-saving math + Soul stickiness |
| Hobby | Pro upgrade | 30% in first 6 months | Advisor + tech-debt register pull |
| Pro | Startup (joins a team) | 10% in first year | Team invite acceptance |
| Startup | Team | 40% in first 24 months | Hit 10-seat cap |
| Team | Business | 25% in first 24 months | Compliance / SSO ask |
| Business | Enterprise | 15% in first 24 months | Air-gap / FedRAMP requirement |

### 5.4 Free-to-paid pull mechanics

Every Free user sees, in `cortex status`:
- Their current synthesis cost this month (real number)
- Their projected savings on Hobby (LLM cache simulation): **"You would have saved $X.XX this month with Hobby tier"**
- Their projected Soul value on Pro: **"Cortex has detected 12 patterns you repeated. Pro Soul would learn these."**
- One-line CTA: `cortex subscribe pro` or `--tier=hobby`

This is the **honest, non-spammy** version of in-product upsell. It quotes real measured cost; no inflated baselines.

### 5.5 Annual billing economics

| Tier | Monthly | Annual (paid yearly) | Annual savings |
|------|---------|----------------------|----------------|
| Hobby | $9 × 12 = $108 | $90 | $18 (17%) |
| Pro | $24 × 12 = $288 | $240 | $48 (17%) |
| Startup | $29 × 12 = $348/seat | $290/seat | $58/seat (17%) |
| Team | $49 × 12 = $588/seat | $490/seat | $98/seat (17%) |
| Business | $99 × 12 = $1,188/seat | $990/seat | $198/seat (17%) |

**Why 17% not 20%**: standard SaaS norm (Notion, Linear, Vercel all sit at 15-20%). Higher discount risks cannibalizing monthly recurring growth.

**Annual prepay accepted only on Pro+**: Hobby is monthly-only to discourage low-conversion friction.

---

## 6. REVENUE PROJECTIONS

### 6.1 Per-1000-free-user revenue (mid-case)

| Tier | Price | Conversion % | Customers per 1000 free | Monthly rev |
|------|-------|--------------|-------------------------|-------------|
| Free | $0 | 100% (base) | 1000 | $0 |
| Hobby | $9/mo | 8-12% | 80-120 | $720-$1,080 |
| Pro | $24/mo | 4-6% | 40-60 | $960-$1,440 |
| Startup | $29/seat × 4 avg seats | 1-2% (teams) | 10-20 teams | $1,160-$2,320 |
| Team | $49/seat × 8 avg seats | 0.5-1% | 5-10 teams | $1,960-$3,920 |
| Business | $99/seat × 25 avg seats | 0.2-0.5% | 2-5 customers | $4,950-$12,375 |
| Enterprise | $199/seat × 100 avg seats | 0.05-0.1% | 0.5-1 customer | $9,950-$19,900 |

**Total per 1000 free users**: **$20,700-$41,035/month** = **$248K-$492K ARR**.

### 6.2 Year-by-year ARR projection (conditional on roadmap execution)

**Assumptions**:
- Free user growth: 1K → 10K → 50K → 200K → 500K across years 1-5
- Conversion targets per §5.3
- 5% monthly churn at Hobby tier, 2% at Pro+, 0.8% at Team+, 0.4% at Business+, 0.2% at Enterprise
- Annual ARPC (avg revenue per customer) growing 10%/yr as upsells convert

| Year | Free users (EOY) | ARR low | ARR mid | ARR high |
|------|-----------------|---------|---------|----------|
| Y1 | 10,000 | $250K | $500K | $900K |
| Y2 | 50,000 | $1.5M | $3M | $5M |
| Y3 | 150,000 | $5M | $15M | $25M |
| Y4 | 300,000 | $15M | $40M | $80M |
| Y5 | 500,000 | $30M | $100M | $200M |

**Mid-case Y5 target: $100M ARR.** Requires:
- ~50K paying customers
- ~500-1000 enterprise customers averaging $300K ARR each
- Strong NRR (120%+) from Business/Enterprise expansion

### 6.3 Cost structure (key lines)

| Line item | Y1 | Y3 | Y5 |
|-----------|-----|-----|-----|
| License server infra | $500/mo | $5K/mo | $50K/mo |
| LLM proxy (we don't pay customer LLM, but central server LLM for Phase 49) | $0 | $20K/mo | $200K/mo |
| Stripe fees (2.9% + $0.30) | ~2.9% of GMV | 2.9% | 2.9% |
| Marketplace fees (AWS/GCP/Azure 3-15%) | $0 | 8% of marketplace GMV | 8% of marketplace GMV |
| SOC2 audit (annual) | $0 | $80K | $80K |
| ISO 27001 audit | $0 | $40K | $40K |
| Pen test (annual) | $0 | $30K | $50K |
| Bug bounty (HackerOne) | $0 | $50K/yr payouts | $200K/yr payouts |
| FedRAMP (one-time + annual) | $0 | $0 | $500K once + $200K/yr |
| Team headcount (eng + sales + support) | 2-3 ppl | 15 ppl | 60 ppl |
| Office / SaaS tools | $50K/yr | $300K/yr | $1M/yr |

**Gross margin targets**: 85% Y1, 80% Y3, 75% Y5 (SOC2/marketplace fees compress).

### 6.4 Per-tier LTV (lifetime value) — for unit-economics modeling

Using monthly churn rates above and $X price × $Y avg lifetime:

| Tier | Price/mo | Monthly churn | LTV (gross) |
|------|----------|---------------|-------------|
| Hobby | $9 | 5% | ~$180 |
| Pro | $24 | 2% | ~$1,200 |
| Startup ($29 × 4) | $116 | 2% | ~$5,800 |
| Team ($49 × 8) | $392 | 0.8% | ~$49,000 |
| Business ($99 × 25) | $2,475 | 0.4% | ~$619,000 |
| Enterprise ($199 × 100) | $19,900 | 0.2% | ~$9,950,000 |

**CAC payback target**: ≤12 months for Hobby/Pro (paid acquisition viable), ≤6 months for Team+ (sales-assisted), ≤3 months for Enterprise (direct outbound).

---

## 7. BILLING & PAYMENT OPERATIONS

### 7.1 Payment processors

**Primary**: Stripe (direct, ~85% of revenue)
**Marketplace**: AWS Marketplace, GCP Marketplace, Azure Marketplace (~10% combined)
**Enterprise**: invoice + ACH + wire (~5%, but high ACV)

### 7.2 Payment methods accepted

| Method | Tiers | Notes |
|--------|-------|-------|
| Credit card (via Stripe) | All paid | Default |
| ACH (US, via Stripe) | Pro+ annual, Team+ | 5-day clearing |
| Wire transfer | Business+, Enterprise | NET 30 default |
| Invoice / PO | Team+, Enterprise | NET 30/60 negotiated |
| AWS Marketplace | Business, Enterprise | Customer's AWS bill |
| GCP Marketplace | Business, Enterprise | Customer's GCP bill |
| Azure Marketplace | Business, Enterprise | Customer's Azure bill |
| Crypto (USDC) | Enterprise only | For international/sanctioned-adjacent customers; manual onboarding |

### 7.3 Payment failure & grace period

**Standard flow** (Hobby through Business):
1. **Day 0 (failed charge)**: Stripe retries automatically with smart retries.
2. **Day 3**: Email customer with payment update link.
3. **Day 7**: Second reminder. Cortex shows in-app banner.
4. **Day 14**: Final notice. License downgrades to Free tier at end of current period.
5. **Day 30**: License revoked. Knowledge base preserved (`.knowledge/` untouched).

**Enterprise/Business flow**:
- Same triggers but with **30/60/90-day grace** based on contract terms.
- Account manager outreach by Day 7.
- For air-gapped Enterprise: invoice-based, no auto-revoke (handled manually with legal review).

### 7.4 Currency, VAT, and international pricing

**Display currency**: USD globally on the website. Stripe handles local currency display at checkout.

**Charged currency**:
- US, Canada: USD
- EU/EEA: EUR (with 0-27% VAT depending on member state; Stripe Tax handles)
- UK: GBP + VAT
- India: INR + GST
- Australia: AUD + GST
- Japan: JPY + consumption tax
- Brazil: BRL + IOF

**Tax compliance**: Stripe Tax for all SaaS subscriptions globally. Reverse-charge for B2B EU customers. ID Vatify for VAT validation.

**Regional pricing**:
- **Purchasing Power Parity (PPP) tiering** for individual tiers (Hobby/Pro) in countries with World Bank GNI per capita < $15K. Up to 50% off list. Verified via IP + payment-method-country match.
- **No PPP for team tiers** (corporate procurement should pay USD).

### 7.5 Refund policy

**30-day money-back guarantee** on all paid tiers. **First purchase only** (no repeat-cancellation refunds).

**Process**:
1. Customer emails `refunds@cortex.dev` or runs `cortex refund-request`.
2. Stripe refund issued within 3 business days.
3. License key deactivated immediately on refund issuance.
4. **`.knowledge/` data preserved** on customer's machine. They keep their knowledge base; only paid features deactivate.

**Marketplace refunds**: governed by the marketplace's refund policy (typically 30-day Microsoft, varies AWS/GCP). We comply with marketplace terms regardless of our internal policy.

### 7.6 Cancellation flow

**Standard cancellation** (any tier):
1. Customer runs `cortex cancel` or clicks "Cancel" in account dashboard.
2. Confirmation: "Your subscription will end on [date]. You'll retain all paid features until then."
3. License auto-downgrades to Free at period end. No mid-period proration unless customer requests refund (and qualifies per §7.5).
4. `.knowledge/` preserved. All Free tier features continue to work.

**Cancellation feedback** (optional, drives roadmap):
- "Why are you canceling?" survey (skippable).
- Auto-credit $20 to customer's next month if they accept a 15-min interview.

### 7.7 Marketplace billing specifics

**AWS Marketplace**:
- Hourly metering posted to AWS Marketplace Metering API.
- Customer pays AWS, AWS pays us minus 3% (SaaS Contracts) or 5% (SaaS Subscriptions) fee.
- Private Offers / CPPO supported for enterprise-negotiated pricing.

**GCP Marketplace**: Producer Portal listing, similar mechanic, 3% fee.

**Azure Marketplace**: Partner Center listing, 3-5% fee.

**Marketplace pricing parity**: list price on marketplaces is **identical** to direct list price. We absorb the marketplace fee (we don't pass it through to the customer). Reason: marketplace is a distribution channel, not a pricing lever. Customers expect price parity; non-parity erodes trust.

### 7.8 Multi-tenant billing (Phase 29.2)

**Use case**: enterprise customer with multiple internal teams wanting separate billing visibility.

**Mechanic**:
- Single contract with the parent org.
- Cortex tracks usage per `workspace_id` (mapped to internal team).
- Monthly report exported to customer: per-team seat count, per-team LLM cost (if using Phase 29 chargeback).
- Customer's internal finance team handles chargeback within their org.
- **We don't bill teams separately** — single PO to parent org.

---

## 8. EDGE CASES & FAILURE MODES

### 8.1 License key sharing

**Detection signals**:
- Same license key with >5 distinct machine fingerprints in 30 days
- Multiple geographically dispersed IPs hitting `/api/validate` simultaneously
- Failed validation patterns suggesting key-cycling

**Response gradient**:
1. **First detection**: silent log + email to license owner: "We noticed unusual usage. Is this expected?"
2. **Continued**: in-app warning to all users of that key.
3. **Egregious (>20 machines)**: license suspended pending verification.
4. **Confirmed abuse**: license revoked, refund offered.

**Crucially**: we never silently revoke. Always email first.

**Legitimate multi-machine use**: a developer with laptop + desktop + cloud dev box can use 1 Pro license on all 3. The threshold is "5+ within 30 days" to catch sharing without blocking power users.

### 8.2 Trial abuse / recycling

**Mitigation**:
- Machine fingerprint enforces 1 trial per machine.
- Email + IP correlation flags suspicious patterns (multiple emails from same IP claiming trials).
- VPN / proxy detection (basic — not foolproof).
- Soft response: trial-claim rejected, "please contact sales for an extended evaluation."

**Legitimate edge**: enterprise evaluator runs Cortex on a fresh VM each test → repeated fingerprints. Mitigation: contact sales for a 30-day eval key.

### 8.3 Tier downgrade — what happens to data

**Hobby → Free**:
- LLM cache deletes after 30-day retention window.
- Tech-debt register stops updating but historical entries preserved.
- Soul state preserved on disk but inactive (re-activates on upgrade).

**Pro → Hobby / Free**:
- Advisor disabled.
- Soul state preserved but inactive.
- Custom quality formulas revert to default.
- Tech-debt register stops accumulating.
- **`.knowledge/` entities and concepts always preserved.** Never deleted by downgrade.

**Team / Business / Enterprise → smaller tier**:
- Central server access revoked.
- Local `.knowledge/` continues to work on the downgraded tier's feature set.
- Federated workspaces revert to local-only.
- Audit log preserved 90 days for compliance, then archived.
- SSO disabled (users log in locally).

**Universal rule**: **data is sacred. Downgrades never destroy customer data.**

### 8.4 Air-gap renewal failures

**Scenario**: enterprise customer in SCIF / regulated facility forgets to renew offline license.

**Behavior**:
- 30 days before expiry: warning at every `cortex` command.
- 7 days before: critical warning + CLI banner.
- Day 0: license expires.
- Day 1+: tools work at Free tier. `.knowledge/` intact.

**Recovery**: customer brings USB, renews on connected machine, copies file. Cortex auto-resumes Enterprise tier on next start.

**No "hard lock"** — they keep their data, they just lose Enterprise features until renewed.

### 8.5 Payment failure cascade (Business+ customer)

**Day 0**: Charge fails. Stripe smart-retry within 3 days.
**Day 3**: Email customer billing contact.
**Day 7**: Account manager outreach (Slack channel + email).
**Day 14**: Second invoice. CFO escalation if no response.
**Day 30**: License auto-downgrades to Team or Pro tier (graceful — keep features they were using before upgrade).
**Day 60**: License auto-downgrades to Free.
**Day 90**: License revoked. Data still on customer machines.

**Key principle**: Business/Enterprise customers get more grace because reasons for delayed payment are usually procurement (not insolvency). Account manager owns the relationship.

### 8.6 Refund + chargeback handling

**Refund**: see §7.5. Customer-initiated, no questions for first purchase.

**Chargeback** (customer disputes charge with their bank):
1. Stripe notifies us. License immediately suspended (not revoked) pending dispute.
2. We submit evidence (license activation logs, usage data, contract).
3. If we lose: license revoked, customer banned from future signups via Stripe dispute hash.
4. If we win: license restored, customer notified.

**Repeat chargebacks**: customers with >2 chargebacks in 12 months are permanently banned (Stripe shared block list).

### 8.7 M&A scenarios — what happens to existing customers under new ownership

**If Cortex is acquired**:
- All existing contracts honored per terms.
- Pricing locked for existing customers for **24 months minimum** post-acquisition.
- Acquiring company can change pricing only with **90-day notice** to existing customers.
- Customers have **right of termination without penalty** in the 90-day window.

**If customer is acquired by another company**:
- Existing Cortex license transfers to acquiring entity (same seat count, same price).
- If acquirer wants to upgrade or change tier, normal pricing applies.
- If acquirer already has Cortex, migration plan offered to consolidate billing.

### 8.8 License key compromise (customer's key leaked)

**Customer-initiated**:
1. Customer runs `cortex revoke-key` or contacts support.
2. Old key immediately added to CRL.
3. New key issued to customer's email.
4. All cached JWTs invalidate on next refresh (within 72h).

**Cortex-detected** (suspicious patterns):
1. License-server detects anomaly (e.g., key used in 50 distinct fingerprints in 1 hour).
2. Account flagged, owner emailed: "Verify this is you within 24h or we'll auto-rotate."
3. If no response: auto-rotate. New key sent to billing email.

### 8.9 BYO LLM provider — pricing implications

**Question**: if a customer brings their own LLM (Ollama, vLLM, Azure OpenAI under their tenant), do we discount?

**Answer**: **No.** We don't take a cut of LLM spend either way. The tier price is for **Cortex features**, not LLM access. The customer pays their LLM provider directly. Same Cortex tier price regardless.

**Exception**: Enterprise contracts may negotiate a small discount (5-10%) for committed multi-year BYO-LLM deployments because we avoid the proxying cost.

### 8.10 What if a customer wants self-hosted Cortex (control plane + license server)?

**Available at Enterprise tier only**. Adds ~30% to base ACV. Customer runs:
- Cortex MCP server (already self-hosted)
- Cortex Central Server (Phase 22)
- Cortex License Server (proprietary code shared under restricted source-available license)

**Operational**: customer manages updates, backups, scaling. We provide:
- Air-gapped installer
- Annual maintenance contract
- Critical-security-patch shipments via signed bundles
- 24/7 incident response SLA

### 8.11 Hybrid deployment — some workspaces cloud, some on-prem

**Supported at Business+ tiers.** Federation engine (Phase 21) supports mixed deployments. Each workspace has its own deployment mode tag (`cloud` / `self-hosted` / `air-gap`). Constraints (Phase 6) can scope by deployment mode (e.g., "this workspace must not import from cloud workspace").

**Pricing**: customer pays for total seat count regardless of deployment mode. No per-deployment surcharge.

### 8.12 Customer asks for unlimited / "all you can eat" pricing

**Response**: not available. All tiers are already unlimited on usage; we sell features not volume. If the customer wants every paid feature → Enterprise tier with custom seat commitment.

### 8.13 Customer asks for forever-free Enterprise (e.g., "we'll be a flagship")

**Response**: **No**. We have OSS Program, EDU Program, GOV pricing, Compete Credits. We do not give free Enterprise even for marquee logos. Exception: pre-revenue startup (YC W26+, Sequoia Arc, etc.) → 12 months Team tier free, then full price. Limited to 50 startups/year.

### 8.14 Multi-currency exchange rate volatility

**Policy**: prices set in USD. Local currency display via Stripe at point of purchase. We don't adjust list prices for FX swings <15%. If a currency moves >15% vs USD over 6 months, we re-price that currency tier (with 60-day customer notice).

### 8.15 Pricing-page A/B testing

**Allowed**: A/B testing of pricing-page copy, CTA wording, tier order, comparison tables.
**Not allowed**: A/B testing actual prices to subsets of users. Universal pricing transparency builds trust. Anything else is dishonest.

### 8.16 What if cross-deployment learning (Phase 49) causes privacy concerns?

**Default**: **opt-in only**. Phase 49 ships with consent gated at the Enterprise tier specifically.
- Customer chooses to participate; we anonymize all signals (no entity names, only aggregated patterns).
- Customer can opt-out at any time. Their historical contribution is preserved (cannot be retroactively withdrawn — but no future contribution accepted).
- Pricing incentive: customers who opt-in get **5% discount** on their Cortex subscription. Aligns incentives.

### 8.17 Dispute resolution

**Jurisdiction**: Delaware (US-incorporated entity).
**Arbitration**: AAA Commercial Arbitration Rules for disputes >$10K.
**Small claims**: customer may pursue in their local jurisdiction for amounts ≤$10K.
**Class action waiver**: in ToS (Pro+ contracts).

### 8.18 Sunset / EOL of features within a tier

**Policy**:
- Features may be removed from a tier with **12-month notice** if usage is <1% of tier customers.
- Affected customers receive equivalent replacement or pricing credit.
- Customers grandfathered if removal happens within 6 months of their renewal date.

**Never**:
- Remove a feature mid-billing-period.
- Remove a feature without notice.
- Force-upgrade to a more expensive tier to keep a feature (the canonical anti-pattern).

---

## 9. COMPETE & SWITCHING PROGRAMS

### 9.1 The competitive landscape

| Competitor | Their pitch | Our differentiator |
|------------|-------------|---------------------|
| **Cursor** ($20/mo + Enterprise tier) | Inline autocomplete + @-codebase | They live in the editor; we live across editors + agents. Cortex coordinates Cursor + Claude Code + Cline. |
| **GitHub Copilot Enterprise** ($39/seat) | Copilot Chat with repo indexing | They're tied to GitHub. We're git-host-agnostic, work on GitLab/Bitbucket/Forgejo/self-hosted. |
| **Sourcegraph Cody** ($9-$59/seat) | Code search + Cody chat | They're search-first. We're synthesis-first — different abstraction. Plus their Cody tier doesn't have architectural memory. |
| **JetBrains AI Assistant** ($10-30/seat) | IDE-bundled AI | IDE-locked. We're IDE-agnostic via MCP. |
| **Codeium Enterprise** | Self-hosted autocomplete | They're completion. We're knowledge. Often co-deployed, not competing. |
| **Continue.dev** (free / paid via providers) | Open-source @-references | Free OSS layer. We provide the persistent memory + enterprise features. Often co-deployed. |
| **Aider** (free) | Pair-programming CLI | CLI tool with repo-map. No persistent memory. We're upstream of them. |
| **Obsidian + manual docs** | DIY knowledge base | Manual. We auto-synthesize. Cortex feeds Obsidian (Phase 8.2 compliance). |

### 9.2 Switching credit program (formalization of §3.4)

**Eligible competitors**: Cursor, Copilot Enterprise, Cody, JetBrains AI, Codeium Enterprise, Tabnine Enterprise.

**Offer mechanics**:
- Customer submits receipt or company-email verification.
- Cortex grants **6 months Pro free** OR **3 months Team free** (for teams ≥5 seats).
- Phase 30.1 conversation import included free (otherwise Enterprise-tier feature).
- White-glove migration: one 60-min session with engineering team (no charge).

**Eligibility caps**:
- Max 1 redemption per organization.
- Max 100 redemptions/quarter globally (prevent program abuse).
- Sales-assisted activation for Team/Business switchers (CSAT priority).

### 9.3 What we DON'T do competitively

- ❌ Disparage competitors publicly. They're competitive but legitimate products.
- ❌ Promise feature parity timelines. We promise our roadmap, not parity.
- ❌ Match prices below sustainable margin. We price at value, not at competitor minus 10%.
- ❌ Sue them or initiate IP disputes. Boring, expensive, doesn't grow the market.

---

## 10. ROADMAP → REVENUE MAPPING

This section is the **canonical link** between `implementation_plan.md` phases and the revenue tiers they unlock. If a phase doesn't appear here, it's research-grade / deferred / not on the revenue path.

### 10.1 Phase-to-tier dependency map

| Phase | Unlocks Tier | Why blocking |
|-------|--------------|---------------|
| **Stages 1-4 (115 flaws)** | All tiers | Without these, no tier is shippable. Security hole, dishonest accounting, broken tools. |
| Phase 33 (P0) | Free → Hobby conversion | First-run experience must work or no trial converts. |
| Phase 33.1 | Hobby | Cost-tier routing makes LLM caching predictable. |
| Phase 3.1 | Hobby | The "30-60% LLM savings" pitch. |
| Phase 13.14 | Hobby | Kills negative ROI on small codebases — defensible Free tier. |
| Phase 13.15 | Hobby | Each sync produces 5+ artifacts → Hobby tier visible value. |
| Phase 7.7, 7.8, 7.9 | Pro | Tech-debt register + review advisories — Pro's daily-value features. |
| Phase 13.8 (Soul) | Pro | The "Cortex learns my patterns" stickiness. |
| Phase 20 + 20.1 + 20.3 + 20.5.1 | Pro | Advisor surface — Pro's intelligence moat. |
| Phase 11 | Startup | Monorepo federation. |
| Phase 56, 57, 58 (multi-agent) | Startup, Team | Team workflows. |
| Phase 21, 22 | Team | Polyrepo + central server — team table-stakes. |
| Phase 25 (SSO/SCIM) | Business | Procurement gate. |
| Phase 26, 26.1, 26.3 | Business | RBAC/audit/OTel — compliance signals. |
| Phase 28 | Business | Jira/Slack/Teams — "meets us where we work." |
| Phase 29, 29.1, 29.2 | Business, Enterprise | FinOps + chargeback. |
| Phase 31 | Business | QBR/ROI dashboard — renewal justification. |
| Phase 33.2 | Business | Mobile PWA for on-call admins. |
| Phase 26.2, 26.4 | Enterprise | Policy-as-code + cryptographic signing. |
| Phase 27 | Enterprise | Air-gap — regulated industries unlock. |
| Phase 30.1 | Enterprise | AI conversation import — competitive switching moat. |
| Phase 32 | Enterprise | SOC2/ISO/FedRAMP — Fortune 500 procurement gate. |
| Phase 32.1 | Enterprise | AWS/GCP/Azure marketplace distribution. |
| Phase 32.2 | Enterprise (Defense/Federal) | SBOM/SLSA — supply-chain compliance. |
| Phase 49 | Enterprise (long-term) | Cross-deployment flywheel — defensibility. |

### 10.2 Per-quarter revenue gating schedule

| Quarter | Phases that must ship | Revenue floor unlocked |
|---------|----------------------|-------------------------|
| Q1 | Stages 1-4 (flaw fixes) | $0 (foundation only) |
| Q2 | Phase 13.14, 13.15, 33-MVP, 3.1, 7.6 | $50K-$200K ARR (Hobby/Pro early adopters) |
| Q3 | Phase 7.7, 7.8, 13.8, 20, 5.6, 5.7 | $200K-$800K ARR (Pro tier robust) |
| Q4 | Phase 11, 22, 25, 56, 57, 58, 12 family | $1M-$3M ARR (Startup + Team tier opens) |
| Q5 | Phase 26, 26.1, 26.3, 28, 29 | $3M-$8M ARR (Business tier opens) |
| Q6 | Phase 31, 33.2, 26.2, 27 | $5M-$15M ARR (Enterprise tier early) |
| Q7 | Phase 32 (SOC2 Type II), 32.1, 30.1 | $10M-$30M ARR (Enterprise tier mature) |
| Q8 | Phase 49 + ongoing | $20M-$50M ARR (network effect kicks in) |

**Beyond Q8**: dependent on category creation and competitive response. Conservative path $50M+; aggressive path $200M+.

### 10.3 Phases we DO NOT prioritize for revenue (deferred indefinitely)

Per `flaws.md` Tier E classification:
- **Phases 34-49** (research-grade physics/cognition metaphors except 49) — academically interesting, commercially irrelevant.
- **Phases 64-70** (cross-domain — medical, forensic, legal synthesis) — separate products, not features.
- **Phases 6.1-6.5, 7.11-7.19, 8.2-8.4, 13.8.2-13.8.7** — polish on top of bases that aren't yet rock-solid.
- **Phase 20.6-20.20** (except 20.13, 20.16) — research-grade scoring variants.

If a customer specifically asks for one of these as a paid request, treat as a **funded research engagement** (custom contract, $200K+, no roadmap commitment).

---

## 11. GOVERNANCE, COMPLIANCE, LEGAL

### 11.1 Terms of Service (ToS) — key terms

- License: open-source code under Apache 2.0 / MIT (TBD final). Paid feature gates ungoverned by open-source license (proprietary call to remote server).
- Acceptable use: no reselling, no automated scraping of license server, no defeating license checks for redistribution.
- Liability cap: 12 months of fees paid.
- Indemnification: Cortex indemnifies customer for IP claims against Cortex code. Customer indemnifies Cortex for misuse.

### 11.2 Data Processing Agreement (DPA)

- GDPR-compliant template with Standard Contractual Clauses (SCCs).
- Sub-processor list maintained at `cortex.dev/trust/subprocessors`.
- Notification of new sub-processor: 30-day advance notice.
- Customer right to object to sub-processor changes; right of termination if objection unresolved.

### 11.3 Sub-processor list (initial)

| Sub-processor | Purpose | Data scope |
|--------------|---------|------------|
| Stripe | Payment processing | Customer billing info |
| AWS / GCP / Azure | Infrastructure | Customer telemetry, license validation |
| Sentry | Error monitoring | Anonymized error stacks |
| PostHog (or similar) | Product analytics | Opt-in, anonymized usage events |
| Datadog | APM | Server-side performance metrics (no customer data) |
| LLM providers (Anthropic, OpenAI, Google) | Optional — only if customer uses our LLM proxy (most don't) | Customer code (only when proxy used; ZDR contracts in place) |

### 11.4 Data residency

**Default**: customer's `.knowledge/` is **local-first**. We never ingest it server-side except for Phase 49 cross-deployment learning (opt-in, anonymized).

**For Phase 22 Central Server customers**: customer chooses region at signup (US, EU, APAC). Data never crosses regions without customer's explicit consent.

**For air-gap Enterprise**: zero data leaves the customer's perimeter. We have no telemetry path. Renewal is the only network call, and it's the customer's USB action.

### 11.5 Audit log retention

- Free / Hobby / Pro: 30 days
- Startup / Team: 90 days
- Business: 1 year
- Enterprise: 7 years (or per customer's regulatory requirement)

Audit logs are immutable (Phase 26) — append-only with cryptographic signing (Phase 26.4 at Enterprise).

### 11.6 License compliance audits (enterprise)

For Business+ customers:
- Quarterly self-attestation of seat count.
- Annual cooperation with Cortex audit (we may request usage telemetry to verify seat count).
- If audit reveals undercount: customer trues-up at current rate for unpaid seats (no penalty for first occurrence).
- Repeated undercount: 1.5× true-up + 30-day cure period.

### 11.7 Export control & sanctions

- We do not knowingly sell to sanctioned countries (US OFAC / EU sanctions list).
- Stripe handles geographic blocks at payment level.
- Air-gap Enterprise sales to defense/intel customers reviewed case-by-case for ITAR / EAR.

---

## 12. ANTI-PATTERNS — WHAT NOT TO DO

Hard-won lessons. Each item is a way Cortex could fail commercially even with a great product.

### 12.1 Pricing anti-patterns

- ❌ **Per-token surcharge or LLM markup.** Puts us in competition with the LLM provider. Bad lane.
- ❌ **Usage caps within a tier** (e.g., "10 syncs/day on Hobby"). Erodes trust; "unlimited within a tier" is the canonical promise.
- ❌ **Removing a feature from a lower tier to upsell.** Existing customers grandfather; new policy goes forward only.
- ❌ **Different prices for same tier in different geographies** (except PPP for individual tiers). Erodes trust.
- ❌ **Hidden fees** (setup fees, "support fees"). All-in pricing only.

### 12.2 Conversion anti-patterns

- ❌ **Hard upsell modals every session.** Single, dismissible, non-blocking nudge in `cortex status`.
- ❌ **Cripple the Free tier to force upgrades.** Free must be excellent or nothing converts. Better to make Pro features deeply valuable than to make Free annoying.
- ❌ **Time-bombing the Pro trial without warning.** Two notifications: day 10 and day 13 of 14.
- ❌ **Credit card required for trial.** Auto-trial is the canonical flow.

### 12.3 Operational anti-patterns

- ❌ **Mid-period license revocation.** Always lands on next 72h refresh.
- ❌ **Data destruction on cancellation.** Customer's `.knowledge/` is sacrosanct.
- ❌ **Telemetry without opt-in.** All analytics opt-in. Default off on enterprise.
- ❌ **Public roadmap commitments to specific phase ship dates.** We say "Q3 2026," not "August 14."

### 12.4 Sales anti-patterns

- ❌ **Selling Enterprise to a 5-person startup.** Wrong tier; they should be Startup or Team. Right-sizing is a courtesy.
- ❌ **Custom discounts >25% off list.** Erodes price discipline. Use marketplace / volume thresholds instead.
- ❌ **Pre-revenue startup giveaways without limit.** Capped at 50/year, time-bound to 12 months.
- ❌ **Promising features in implementation_plan.md as "shipping soon."** Only commit to phases on the public roadmap with quarterly granularity.

### 12.5 Brand / community anti-patterns

- ❌ **Disparaging Cursor / Copilot / Sourcegraph publicly.** Legitimate products. We win on different axes.
- ❌ **Locking down the open-source repo.** Open issues, public PRs, public discussions.
- ❌ **Patenting the open-source code.** We file defensive patents on core IP; we never offensively sue OSS.
- ❌ **Selling user data.** Phase 49 cross-deployment learning is opt-in, anonymized, no individual signal sold.

---

## 13. METRICS & KPIS

### 13.1 Activation funnel KPIs (per cohort)

| Metric | Target | Health flag if |
|--------|--------|----------------|
| Install → first sync (24h) | ≥80% | <60% |
| First sync → 3-day retention | ≥50% | <30% |
| 14-day Pro trial → paid | ≥8% | <5% |
| Trial median session count | ≥10 | <5 |

### 13.2 Revenue KPIs (monthly)

| Metric | Target | Health flag if |
|--------|--------|----------------|
| Net New ARR | growing month-over-month | flat 2 months in a row |
| MRR Churn (Hobby) | <5% | >7% |
| MRR Churn (Pro) | <2% | >3% |
| MRR Churn (Team+) | <1% | >2% |
| Net Revenue Retention (NRR) overall | >115% | <105% |
| Net Revenue Retention (Enterprise) | >130% | <120% |
| CAC Payback (Hobby/Pro) | <12 months | >18 months |
| CAC Payback (Team+) | <6 months | >12 months |
| Annual Contract Value (Enterprise avg) | >$200K | <$100K |
| LTV:CAC overall | >3:1 | <2:1 |

### 13.3 Operational KPIs

| Metric | Target | Health flag if |
|--------|--------|----------------|
| License server p99 latency | <100ms | >500ms |
| JWT validation success rate | >99.9% | <99.5% |
| Trial fraud rate (machine fingerprint hits) | <1% | >5% |
| Support ticket median time-to-first-response (Business+) | <4h | >12h |
| SOC2 audit findings (annual) | 0 high | any high |
| Bug bounty payouts/quarter | <$50K | >$200K (signals security gap) |

### 13.4 Product-health KPIs

| Metric | Target | Health flag if |
|--------|--------|----------------|
| Weekly Active Users (WAU) / Monthly Active Users (MAU) | >50% (sticky) | <30% |
| Sessions/user/week | ≥3 | <1.5 |
| Phase 49 opt-in rate (when shipped, Enterprise) | ≥40% | <20% (privacy concerns) |
| OSS Program participation | >500 verified projects by Y2 | <100 (program not resonating) |
| Refund rate (first 30d) | <3% | >7% |

### 13.5 Strategic / leading indicators

- **Phase 31 (QBR) generation rate**: how often Business+ customers actually run their QBR PDF? Target >1×/quarter per customer. Below this = renewals at risk.
- **Cross-deployment signal volume (Phase 49)**: signals contributed × customers opting in. Leading indicator of flywheel strength.
- **Marketplace listing GMV ratio**: % of revenue via AWS/GCP/Azure. Target 15-25% by Y3.
- **OSS-program-to-paid conversion**: how often does an OSS-Program user's company eventually buy Team/Business? Track 24-month cohort.

---

## 14. PRICING CHANGE POLICY

### 14.1 When we can raise prices

- **List price increases**: 90-day notice. Applies to new customers immediately; existing customers grandfathered for **24 months minimum** at their current price.
- **Existing-customer price raises**: only at renewal, only after the 24-month grandfather period, and only with **120-day notice**.
- **Multi-year contracts**: price locked for contract term. No mid-term increases.

### 14.2 When we can lower prices

- **Anytime, without notice.** Customers paying the old higher price automatically transition to the lower price on next billing cycle, no action needed.
- Bias to be generous here: a customer who'd been overpaying is grateful, not skeptical.

### 14.3 When we change tier feature contents

- **Adding features to a tier**: anytime. Customers love it.
- **Removing features from a tier**: 12-month notice (per §8.18 sunset policy).
- **Moving a feature from lower tier to higher**: grandfather existing customers; new customers get the new packaging.

### 14.4 When we introduce new tiers

- **Between existing tiers**: allowed. Existing customers see their current tier preserved; can opt into new mid-tier.
- **Above Enterprise** (e.g., "Sovereign Enterprise" for nation-state customers): allowed. New ACV captured.
- **Below Free**: never. Free is the floor; there is no negative tier.

### 14.5 Pricing-page changes vs contract changes

- Pricing-page changes affect **prospective customers only**.
- Existing customers continue on their signed/agreed terms regardless of pricing-page edits.
- This is critical for trust: a customer who signed up at $24/mo Pro on day 1 pays $24/mo forever (subject to §14.1 above).

---

## 15. OPEN QUESTIONS & DECISIONS PENDING

Decisions that affect this document but require further input. Each one blocks something concrete.

| # | Question | Blocks | Decision needed by |
|---|----------|--------|---------------------|
| Q1 | Final open-source license (Apache 2.0 vs MIT vs custom)? | Public launch | Pre-marketplace |
| Q2 | Stripe Tax or self-managed VAT? | EU/UK launches | Q1 of EU expansion |
| Q3 | Marketplace pricing parity strictly enforced (no discount for marketplace customers)? | AWS Marketplace listing | Pre-Phase 32.1 |
| Q4 | Trial extension policy (current draft: 2× auto-extension; should it be 1×?) | Trial system MVP | Pre-Phase 33 launch |
| Q5 | Volume discount curve for Enterprise (current draft: 10% off at 500 seats, 20% off at 2000)? | First Fortune 500 deal | Pre first $500K deal |
| Q6 | Currency hedge policy if local currency depreciates >15%? | International expansion | Pre Y2 |
| Q7 | OSS Program threshold: 100 stars vs 250 stars vs foundation membership? | OSS Program launch | Pre Phase 7.7 |
| Q8 | Sovereign Cloud pricing (true air-gap with no telemetry whatsoever) — premium %? | First defense customer | Pre Phase 27 launch |
| Q9 | Phase 49 cross-deployment learning — what % of customers opt-in target? Need data. | Phase 49 product spec | Pre Phase 49 build |
| Q10 | Do we offer single-sign-on at Team tier or only Business+? Affects ACV ladder. | Team-tier launch | Pre Phase 25 launch |

Each open question is a leverage point. Wrong default could cost millions in lost ACV or excess discounting. Resolve deliberately.

---

## APPENDIX A — QUICK-REFERENCE PRICING TABLE

| Tier | Monthly | Annual | Seats | Use case |
|------|---------|--------|-------|----------|
| Free | $0 | $0 | 1 | Individual / OSS |
| Hobby | $9 | $90 | 1 | Power individual |
| Pro | $24 | $240 | 1 | Professional individual |
| Startup | $29/seat | $290/seat | 2-10 | Small team |
| Team | $49/seat | $490/seat | 5-50 | Mid-size team |
| Business | $99/seat | $990/seat | 10-200 | Enterprise-adjacent |
| Enterprise | $199+/seat | Custom | 200+ | Fortune 500 / regulated |
| OSS Program | Free (Pro tier) | — | 1 | Qualifying OSS maintainers |
| EDU | 50% off Pro | — | 1 | Verified students/faculty |
| GOV / Defense | GSA Schedule | Custom | Custom | Federal / military |
| Compete Credits | 6 mo Pro free | — | 1 | Switching from competitor |

---

## APPENDIX B — DECISION TREE: WHAT TIER FOR THIS CUSTOMER?

```
Is this an individual developer?
├── YES
│   ├── Solo / hobby project? → FREE
│   ├── Uses Cortex daily, wants to save on LLM cost? → HOBBY ($9)
│   ├── Professional dev, wants Soul + Advisor? → PRO ($24)
│   ├── OSS maintainer w/ ≥100★? → OSS PROGRAM (free Pro)
│   ├── Student / faculty? → EDU (50% off Pro)
│   └── Switching from Cursor/Copilot/Sourcegraph? → COMPETE CREDITS (6mo Pro free)
└── NO (team / org)
    ├── 2-10 devs, small team? → STARTUP ($29/seat)
    ├── 5-50 devs, mid-size team? → TEAM ($49/seat)
    ├── 10-200 devs, needs SSO/RBAC/audit? → BUSINESS ($99/seat)
    ├── 200+ devs OR regulated industry OR air-gap? → ENTERPRISE (custom $199+/seat)
    └── Federal / defense / FedRAMP required? → GOV (Enterprise + premium)
```

---

## APPENDIX C — CHECKLIST FOR LAUNCHING A NEW PAID FEATURE

When a phase ships, follow this checklist to wire it into the revenue model:

- [ ] Identify which tier(s) the feature belongs to (consult §10.1 phase-to-tier map)
- [ ] Add feature flag to `LicensePayload.features[]` enum
- [ ] Wire `requireFeature()` or `requireTier()` gate in code
- [ ] Update pricing page with new feature in tier matrix
- [ ] Update `cortex status` to surface the feature value (for upsell context)
- [ ] If gating an existing tier: 90-day customer notice
- [ ] If adding to a new tier: announcement + blog post + email campaign
- [ ] Update this revenue.md §2 (Tier Matrix) and §10 (Phase Map)
- [ ] Monitor conversion uplift in §13 KPIs for 60 days post-launch
- [ ] If uplift <50% of projection: post-mortem + iterate

---

*End of canonical revenue model. Treat as binding. Update by PR — never change pricing in code without updating this file first.*
