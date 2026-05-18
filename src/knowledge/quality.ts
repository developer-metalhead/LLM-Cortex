// Phase 7.5 — Knowledge Quality Scoring.
//
// Deterministic quality score (0.0–1.0) over an EntityRecord, derived
// from observable facts only — never an LLM-emitted number.
//
// Formula (5-dimensional mean):
//   quality_score = mean(
//     evidence_freshness_score,    // 1.0 if no drift / 0.0 if source-missing
//     contradiction_score,         // 1.0 if 0 open contradictions, decays by count
//     staleness_score,             // 1.0 if not stale, 0.0 if staleSince set
//     age_score,                   // 1.0 if <30 days old, decays to 0.3 after 180 days
//     human_review_score,          // 1.0 if human_reviewed=true, 0.7 otherwise
//   )
//
// Design:
//   - Pure function. No I/O, no LLM calls. Called from updateIndex() on every
//     synthesis save (must stay fast — ~µs per entity).
//   - Score is a projection, never persisted in state.json. Always re-derived.
//   - `human_reviewed` and `reviewed_by` ARE persisted (they are facts, not scores).
//   - Age decay curve configurable via CORTEX_QUALITY_AGE_DECAY_DAYS env var.

import type { Evidence, FailedApproach } from "../llm/schema.js";

// Subset of EntityRecord that quality scoring needs. Keeps quality.ts decoupled
// from the full writer.ts EntityRecord shape (which carries renderer-only fields).
export interface QualityInputEntity {
  description: string;
  evidence?: Evidence[];
  failedApproaches?: FailedApproach[];
  lastRefined: string;
  staleSince?: string;
  human_reviewed?: boolean;
  reviewed_by?: string;
  sourceFile?: string;
}

export interface QualityBreakdown {
  score: number;                       // overall 0.0–1.0
  evidenceFreshness: number;           // 0.0–1.0
  contradiction: number;               // 0.0–1.0
  staleness: number;                   // 0.0–1.0
  age: number;                         // 0.0–1.0
  humanReview: number;                 // 0.0–1.0
}

const DEFAULT_AGE_DECAY_DAYS = 180;     // 1.0 at <30 days, 0.3 at this value
const FRESH_THRESHOLD_DAYS = 30;        // below this, age_score = 1.0
const AGE_FLOOR = 0.3;                  // age_score never drops below this
const CONTRADICTION_PER_COUNT_PENALTY = 0.2; // each open contradiction subtracts 0.2

export function readAgeDecayDays(): number {
  const raw = process.env.CORTEX_QUALITY_AGE_DECAY_DAYS;
  if (!raw) return DEFAULT_AGE_DECAY_DAYS;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > FRESH_THRESHOLD_DAYS ? n : DEFAULT_AGE_DECAY_DAYS;
}

// Linear decay from 1.0 at FRESH_THRESHOLD_DAYS to AGE_FLOOR at decayDays.
// Anything <= FRESH_THRESHOLD_DAYS → 1.0. Anything >= decayDays → AGE_FLOOR.
function computeAgeScore(lastRefinedIso: string, nowMs: number, decayDays: number): number {
  const refinedMs = Date.parse(lastRefinedIso);
  if (!Number.isFinite(refinedMs)) return AGE_FLOOR; // unparseable date → worst-case
  const ageMs = Math.max(0, nowMs - refinedMs);
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  if (ageDays <= FRESH_THRESHOLD_DAYS) return 1.0;
  if (ageDays >= decayDays) return AGE_FLOOR;
  const fraction = (ageDays - FRESH_THRESHOLD_DAYS) / (decayDays - FRESH_THRESHOLD_DAYS);
  return Math.max(AGE_FLOOR, 1.0 - fraction * (1.0 - AGE_FLOOR));
}

// Evidence freshness:
//   - No evidence array → 1.0 (no claims to verify, no drift possible)
//   - Has evidence but driftCount provided → fraction of evidence still resolving
//   - Has source-missing flag → 0.0
function computeEvidenceFreshness(
  hasEvidence: boolean,
  driftCount: number,
  sourceMissing: boolean,
): number {
  if (sourceMissing) return 0.0;
  if (!hasEvidence) return 1.0;
  if (driftCount <= 0) return 1.0;
  // Each drift event subtracts 0.5; cap floor at 0.
  return Math.max(0, 1.0 - driftCount * 0.5);
}

function computeContradictionScore(openContradictionCount: number): number {
  if (openContradictionCount <= 0) return 1.0;
  return Math.max(0, 1.0 - openContradictionCount * CONTRADICTION_PER_COUNT_PENALTY);
}

function computeStalenessScore(staleSince: string | undefined): number {
  return staleSince ? 0.0 : 1.0;
}

function computeHumanReviewScore(humanReviewed: boolean | undefined): number {
  return humanReviewed ? 1.0 : 0.7;
}

export interface QualityContext {
  // For Phase 16 contradictions — count of open contradictions targeting this entity.
  // Until Phase 16 ships, callers pass 0.
  openContradictionCount?: number;
  // Output of audit_evidence (Phase 7) — number of drift findings for this entity.
  // Defaults to 0 if not supplied.
  evidenceDriftCount?: number;
  // True if the entity's evidence sourceFile cannot be found at HEAD.
  evidenceSourceMissing?: boolean;
  // Override "now" for deterministic tests.
  nowMs?: number;
  // Override age decay (defaults to env var or 180).
  ageDecayDays?: number;
}

export function computeQuality(
  entity: QualityInputEntity,
  ctx: QualityContext = {},
): QualityBreakdown {
  const nowMs = ctx.nowMs ?? Date.now();
  const ageDecayDays = ctx.ageDecayDays ?? readAgeDecayDays();

  const evidenceFreshness = computeEvidenceFreshness(
    !!entity.evidence && entity.evidence.length > 0,
    ctx.evidenceDriftCount ?? 0,
    !!ctx.evidenceSourceMissing,
  );
  const contradiction = computeContradictionScore(ctx.openContradictionCount ?? 0);
  const staleness = computeStalenessScore(entity.staleSince);
  const age = computeAgeScore(entity.lastRefined, nowMs, ageDecayDays);
  const humanReview = computeHumanReviewScore(entity.human_reviewed);

  const score = mean5(evidenceFreshness, contradiction, staleness, age, humanReview);

  return { score, evidenceFreshness, contradiction, staleness, age, humanReview };
}

function mean5(a: number, b: number, c: number, d: number, e: number): number {
  return (a + b + c + d + e) / 5;
}

// Render a percent label suitable for index.md output: "94%", "47%".
export function formatScore(score: number): string {
  return `${Math.round(score * 100)}%`;
}

// Default quality gate for `cortex audit quality`. Configurable via env.
export function readQualityGate(): number {
  const raw = process.env.CORTEX_QUALITY_GATE;
  if (!raw) return 0.5;
  const n = parseFloat(raw);
  return Number.isFinite(n) && n >= 0 && n <= 1 ? n : 0.5;
}
