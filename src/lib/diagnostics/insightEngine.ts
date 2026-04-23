/* P10.2a — Diagnostic Insight Engine
 *
 * Pure analysis layer. Reads structured data the platform already stores
 * (Stability Score, weekly check-ins, diagnostic intake answers, recent
 * RGS review requests, existing approved recommendations) and returns
 * **suggested** STOP / START / SCALE recommendations plus a structured
 * Stability Score interpretation.
 *
 * IMPORTANT — automation suggests, RGS approves.
 * This module never writes to `report_recommendations` or any other
 * client-facing surface. It only returns structured suggestions for an
 * admin to review, edit, or reject inside the Strategic Guidance panel.
 *
 * Every suggestion carries:
 *   - evidence[] referencing the underlying data points,
 *   - confidence (low/medium/high) based on signal strength + data quality,
 *   - generated_reason (one short, plain-language justification line),
 *   - related_pillar mapped to the RGS Stability System.
 *
 * The engine is intentionally conservative: weak/contradictory data
 * yields fewer suggestions, not louder ones.
 */

import { supabase } from "@/integrations/supabase/client";
import { getScoreBenchmark, type BenchmarkLevel } from "@/lib/scoring/benchmark";
import { loadIntakeAnswers, type IntakeAnswerRow } from "@/lib/diagnostics/intake";
import { loadCustomerStabilityScore, type StabilityScoreRow } from "@/lib/scoring/stabilityScore";
import {
  listRecommendationsForCustomer,
  listRejectedRecommendations,
  type RecommendationCategory,
  type RecommendationPillarKey,
  type RecommendationPriority,
  type RecommendationRow,
} from "@/lib/recommendations/recommendations";
import {
  loadCustomerMemory,
  type CustomerMemoryRow,
} from "@/lib/diagnostics/customerMemory";
import {
  indexPatternsByRule,
  loadActivePatterns,
  type PatternRow,
} from "@/lib/diagnostics/patternIntelligence";

// ─────────────────────────── Public types ───────────────────────────

export type EvidenceSourceType =
  | "diagnostic"
  | "score"
  | "weekly_checkin"
  | "report"
  | "review"
  | "impact"
  | "manual";

export type Confidence = "high" | "medium" | "low";

export interface Evidence {
  source_type: EvidenceSourceType;
  /** Short label, e.g. "Stability Score", "Weekly check-in (Apr 14)". */
  label: string;
  /** One-line specific data point, e.g. "score=320 (Fragile band)". */
  detail: string;
}

export interface RecommendationSuggestion {
  category: RecommendationCategory;
  title: string;
  explanation: string;
  related_pillar: RecommendationPillarKey | null;
  priority: RecommendationPriority;
  confidence: Confidence;
  evidence: Evidence[];
  /** Plain-language sentence explaining *why* the engine produced this. */
  generated_reason: string;
  /** Stable key so duplicates can be detected against existing items. */
  rule_key: string;
  /** True when client memory or global patterns boosted this suggestion. */
  memory_boosted?: boolean;
  /** True when global pattern intelligence softened this suggestion. */
  globally_softened?: boolean;
}

export interface StabilityInterpretation {
  score: number;
  benchmark: BenchmarkLevel;
  /** 2–4 short observation lines tied to underlying signals. */
  observations: string[];
  /** Recommended next strategic focus, written in advisory tone. */
  recommended_focus: string;
  confidence: Confidence;
  evidence: Evidence[];
}

export interface InsightEngineResult {
  customer_id: string;
  generated_at: string;
  stability: StabilityInterpretation | null;
  suggestions: RecommendationSuggestion[];
  /** Summary of which signals were available, for the admin review UI. */
  signal_coverage: {
    has_stability_score: boolean;
    weekly_checkins_count: number;
    diagnostic_answers_count: number;
    open_review_requests: number;
    existing_recommendations: number;
    memory_rows: number;
    global_patterns: number;
  };
  /** Engine notes: gaps, contradictions, low-confidence flags. */
  notes: string[];
}

// ─────────────────────────── Internal types ───────────────────────────

interface WeeklyCheckinLite {
  id: string;
  week_start: string;
  week_end: string;
  cash_concern_level: string | null;
  pipeline_confidence: string | null;
  utilization_pct: number | null;
  owner_hours: number | null;
  owner_only_decisions: string | null;
  delegatable_work: string | null;
  process_blocker: string | null;
  people_blocker: string | null;
  sales_blocker: string | null;
  cash_blocker: string | null;
  owner_bottleneck: string | null;
  repeated_issue: boolean | null;
  request_rgs_review: boolean | null;
  ar_61_90: number | null;
  ar_90_plus: number | null;
  lost_revenue: number | null;
  best_quality_lead_source: string | null;
  highest_volume_lead_source: string | null;
  capacity_status: string | null;
  data_quality: string | null;
}

interface ReviewRequestLite {
  id: string;
  status: string;
  priority: string;
  requested_at: string;
}

// ─────────────────────────── Loader ───────────────────────────

async function loadRecentWeeklyCheckins(
  customerId: string,
  limit = 6,
): Promise<WeeklyCheckinLite[]> {
  const { data, error } = await supabase
    .from("weekly_checkins")
    .select(
      "id, week_start, week_end, cash_concern_level, pipeline_confidence, utilization_pct, owner_hours, owner_only_decisions, delegatable_work, process_blocker, people_blocker, sales_blocker, cash_blocker, owner_bottleneck, repeated_issue, request_rgs_review, ar_61_90, ar_90_plus, lost_revenue, best_quality_lead_source, highest_volume_lead_source, capacity_status, data_quality",
    )
    .eq("customer_id", customerId)
    .order("week_start", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as WeeklyCheckinLite[];
}

async function loadOpenReviewRequests(
  customerId: string,
): Promise<ReviewRequestLite[]> {
  const { data, error } = await supabase
    .from("rgs_review_requests")
    .select("id, status, priority, requested_at")
    .eq("customer_id", customerId)
    .in("status", ["open", "in_review"])
    .order("requested_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return (data ?? []) as ReviewRequestLite[];
}

// ─────────────────────────── Helpers ───────────────────────────

const isFilled = (s: string | null | undefined): s is string =>
  !!s && s.trim().length > 0;

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso;
  }
}

/** Bucketed cash-concern severity from free-text values stored on check-ins. */
function cashConcernRank(value: string | null | undefined): 0 | 1 | 2 | 3 {
  if (!value) return 0;
  const v = value.toLowerCase();
  if (v.includes("crisis") || v.includes("urgent") || v.includes("severe")) return 3;
  if (v.includes("high") || v.includes("concerned") || v.includes("worried")) return 2;
  if (v.includes("medium") || v.includes("watch") || v.includes("some")) return 1;
  return 0;
}

function pipelineConfidenceRank(value: string | null | undefined): 0 | 1 | 2 | 3 {
  if (!value) return 0;
  const v = value.toLowerCase();
  if (v.includes("low") || v.includes("weak") || v.includes("poor")) return 3;
  if (v.includes("medium") || v.includes("mixed") || v.includes("uncertain")) return 2;
  if (v.includes("high") || v.includes("strong") || v.includes("good")) return 1;
  return 0;
}

/** True if any of the named blocker fields contains content. */
function blockerSignal(c: WeeklyCheckinLite): {
  any: boolean;
  fields: { field: keyof WeeklyCheckinLite; text: string }[];
} {
  const fields: { field: keyof WeeklyCheckinLite; text: string }[] = [];
  for (const k of [
    "process_blocker",
    "people_blocker",
    "sales_blocker",
    "cash_blocker",
    "owner_bottleneck",
    "owner_only_decisions",
  ] as const) {
    const v = c[k];
    if (typeof v === "string" && isFilled(v)) {
      fields.push({ field: k, text: v.trim() });
    }
  }
  return { any: fields.length > 0, fields };
}

function intakeAnswer(
  answers: IntakeAnswerRow[],
  key: string,
): string | null {
  const row = answers.find((a) => a.section_key === key);
  return row?.answer && row.answer.trim() ? row.answer.trim() : null;
}

function ruleKey(category: RecommendationCategory, slug: string): string {
  return `${category}:${slug}`;
}

function existingRuleKeys(rows: RecommendationRow[]): Set<string> {
  // Used so the engine can flag which suggestions duplicate already-curated items.
  // We don't filter the suggestion out — admins should still see it — but we
  // soften priority/confidence so review is calmer.
  const set = new Set<string>();
  for (const r of rows) {
    set.add(`${r.category}:${normalizeTitle(r.title)}`);
  }
  return set;
}

function normalizeTitle(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 6)
    .join(" ");
}

// ─────────────────────────── Suggestion rules ───────────────────────────
/* Each rule is a small, well-scoped function that returns 0..1 suggestions.
   Rules are intentionally narrow so each one stays explainable. */

type RuleCtx = {
  customerId: string;
  score: StabilityScoreRow | null;
  band: BenchmarkLevel | null;
  intake: IntakeAnswerRow[];
  checkins: WeeklyCheckinLite[];
  reviews: ReviewRequestLite[];
  existing: Set<string>;
};

type Rule = (ctx: RuleCtx) => RecommendationSuggestion | null;

/* ── STOP rules ── */

const ruleStopOwnerDependence: Rule = (ctx) => {
  // Triggered when recent check-ins repeatedly flag owner-only decisions or
  // owner bottleneck text, OR intake says owner is the bottleneck.
  const ownerSignals = ctx.checkins.filter(
    (c) => isFilled(c.owner_only_decisions) || isFilled(c.owner_bottleneck),
  );
  const intakeOps = intakeAnswer(ctx.intake, "ops_blockers");
  const intakeMentionsOwner =
    !!intakeOps && /owner|me\b|i\s+am|bottleneck/i.test(intakeOps);
  if (ownerSignals.length === 0 && !intakeMentionsOwner) return null;

  const evidence: Evidence[] = [];
  ownerSignals.slice(0, 2).forEach((c) => {
    const text =
      c.owner_only_decisions?.trim() ||
      c.owner_bottleneck?.trim() ||
      "Owner-only decisions flagged";
    evidence.push({
      source_type: "weekly_checkin",
      label: `Weekly check-in (${fmtDate(c.week_start)})`,
      detail: text.slice(0, 160),
    });
  });
  if (intakeMentionsOwner && intakeOps) {
    evidence.push({
      source_type: "diagnostic",
      label: "Intake — operational blockers",
      detail: intakeOps.slice(0, 160),
    });
  }

  const repeated = ownerSignals.length >= 2 || ctx.checkins.some((c) => c.repeated_issue);
  const confidence: Confidence = repeated ? "high" : ownerSignals.length === 1 ? "medium" : "low";
  const priority: RecommendationPriority = repeated ? "high" : "medium";

  return {
    category: "stop",
    title: "Routing routine decisions through the owner",
    explanation:
      "Recent operating signals show the owner is still the gate for routine work. Removing the owner from repeatable approvals frees capacity and reduces fragility.",
    related_pillar: "owner_independence",
    priority,
    confidence,
    evidence,
    generated_reason:
      "Owner-only decisions or owner-as-bottleneck noted across recent check-ins / intake.",
    rule_key: ruleKey("stop", "owner_dependence"),
  };
};

const ruleStopRevenueLeakSource: Rule = (ctx) => {
  // Lost revenue or repeated lost-deal reasons signal a leak worth stopping.
  const lossy = ctx.checkins.filter((c) => (c.lost_revenue ?? 0) > 0);
  if (lossy.length === 0) return null;
  const total = lossy.reduce((s, c) => s + (Number(c.lost_revenue) || 0), 0);
  if (total <= 0) return null;

  return {
    category: "stop",
    title: "Tolerating the recurring revenue leak source",
    explanation:
      "Lost revenue has been logged across recent weeks. Identify the single biggest cause and stop the workflow that keeps producing it before adding new growth activity.",
    related_pillar: "revenue_conversion",
    priority: total > 5000 ? "high" : "medium",
    confidence: lossy.length >= 2 ? "high" : "medium",
    evidence: lossy.slice(0, 2).map((c) => ({
      source_type: "weekly_checkin",
      label: `Weekly check-in (${fmtDate(c.week_start)})`,
      detail: `Lost revenue logged: ${Math.round(Number(c.lost_revenue) || 0).toLocaleString()}`,
    })),
    generated_reason: "Lost revenue logged on recent check-ins.",
    rule_key: ruleKey("stop", "revenue_leak_source"),
  };
};

/* ── START rules ── */

const ruleStartFinancialVisibility: Rule = (ctx) => {
  // Triggered when there is no stability score yet, OR the most recent
  // check-ins lack basic cash signals (no AR aging, no cash concern).
  const noScore = !ctx.score;
  const recent = ctx.checkins[0];
  const sparseCash =
    !recent ||
    (!recent.ar_61_90 &&
      !recent.ar_90_plus &&
      !recent.cash_concern_level &&
      !recent.capacity_status);

  if (!noScore && !sparseCash) return null;

  const evidence: Evidence[] = [];
  if (noScore) {
    evidence.push({
      source_type: "score",
      label: "Stability Score",
      detail: "No score on file yet.",
    });
  }
  if (sparseCash) {
    evidence.push({
      source_type: "weekly_checkin",
      label: recent ? `Weekly check-in (${fmtDate(recent.week_start)})` : "Weekly check-ins",
      detail: recent
        ? "AR aging, cash concern, and capacity left blank."
        : "No recent weekly check-ins on file.",
    });
  }

  return {
    category: "start",
    title: "Tracking weekly revenue, AR aging, and cash position",
    explanation:
      "Without a consistent weekly cash and receivables view, the business is operating on instinct. Establishing a simple weekly check-in restores visibility and unlocks every other improvement.",
    related_pillar: "financial_visibility",
    priority: noScore ? "high" : "medium",
    confidence: noScore && sparseCash ? "high" : "medium",
    evidence,
    generated_reason:
      "Weak or missing financial-visibility signals (no score and/or empty cash fields).",
    rule_key: ruleKey("start", "financial_visibility"),
  };
};

const ruleStartCashRunwayProtection: Rule = (ctx) => {
  // High cash concern across one or more recent check-ins.
  const concerned = ctx.checkins.filter((c) => cashConcernRank(c.cash_concern_level) >= 2);
  if (concerned.length === 0) return null;

  return {
    category: "start",
    title: "Protecting near-term cash runway",
    explanation:
      "Recent check-ins show elevated cash concern. Build a 30/60/90 cash plan, prioritize collections on aging AR, and defer non-essential spend until coverage improves.",
    related_pillar: "financial_visibility",
    priority: concerned.some((c) => cashConcernRank(c.cash_concern_level) === 3)
      ? "high"
      : "medium",
    confidence: concerned.length >= 2 ? "high" : "medium",
    evidence: concerned.slice(0, 2).map((c) => ({
      source_type: "weekly_checkin",
      label: `Weekly check-in (${fmtDate(c.week_start)})`,
      detail: `Cash concern: ${c.cash_concern_level}`,
    })),
    generated_reason: "Elevated cash-concern flag on recent check-ins.",
    rule_key: ruleKey("start", "cash_runway"),
  };
};

const ruleStartPipelineConsistency: Rule = (ctx) => {
  const weak = ctx.checkins.filter(
    (c) => pipelineConfidenceRank(c.pipeline_confidence) >= 2,
  );
  if (weak.length === 0) return null;
  return {
    category: "start",
    title: "Building a consistent weekly demand-generation routine",
    explanation:
      "Pipeline confidence is reading low or mixed. A small, repeatable weekly outbound + nurture routine reduces revenue volatility and creates forecastable demand.",
    related_pillar: "demand_generation",
    priority: weak.length >= 2 ? "high" : "medium",
    confidence: weak.length >= 2 ? "high" : "medium",
    evidence: weak.slice(0, 2).map((c) => ({
      source_type: "weekly_checkin",
      label: `Weekly check-in (${fmtDate(c.week_start)})`,
      detail: `Pipeline confidence: ${c.pipeline_confidence}`,
    })),
    generated_reason: "Low/mixed pipeline confidence reported on recent check-ins.",
    rule_key: ruleKey("start", "pipeline_consistency"),
  };
};

/* ── SCALE rules ── */

const ruleScaleBestLeadSource: Rule = (ctx) => {
  // If the same best-quality lead source repeats, that is a scale candidate.
  const sources = ctx.checkins
    .map((c) => c.best_quality_lead_source?.trim())
    .filter((s): s is string => !!s);
  if (sources.length < 2) return null;
  const counts = new Map<string, number>();
  sources.forEach((s) => counts.set(s, (counts.get(s) ?? 0) + 1));
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  if (!top || top[1] < 2) return null;

  return {
    category: "scale",
    title: `Doubling down on "${top[0]}" as the best-fit lead source`,
    explanation:
      "This source has repeatedly produced the highest-quality leads. Codify the channel, document what makes it work, and increase investment with a tracked weekly cadence.",
    related_pillar: "demand_generation",
    priority: top[1] >= 3 ? "high" : "medium",
    confidence: top[1] >= 3 ? "high" : "medium",
    evidence: [
      {
        source_type: "weekly_checkin",
        label: "Best-quality lead source (last check-ins)",
        detail: `"${top[0]}" cited ${top[1]} times across recent check-ins.`,
      },
    ],
    generated_reason:
      "Best-quality lead source repeats across recent check-ins.",
    rule_key: ruleKey("scale", `best_lead_source_${normalizeTitle(top[0])}`),
  };
};

const ruleScaleStrongBand: Rule = (ctx) => {
  // If Stability band is stable_scalable or high_performance, suggest a
  // measured scale move tied to the strongest pillar signal we can infer.
  if (!ctx.band) return null;
  if (ctx.band.key !== "stable_scalable" && ctx.band.key !== "high_performance") return null;

  return {
    category: "scale",
    title: "Scaling the proven offer with a tracked weekly cadence",
    explanation:
      "The business is operating from a stable base. Pick the single highest-margin offer, codify its delivery, and expand with a measurable weekly throughput target rather than broad new bets.",
    related_pillar: "revenue_conversion",
    priority: "medium",
    confidence: "medium",
    evidence: [
      {
        source_type: "score",
        label: "Stability Score",
        detail: `Score ${ctx.score?.score} — band ${ctx.band.label}.`,
      },
    ],
    generated_reason: "Stability band indicates a healthy platform to scale from.",
    rule_key: ruleKey("scale", "scale_proven_offer"),
  };
};

const ALL_RULES: Rule[] = [
  ruleStopOwnerDependence,
  ruleStopRevenueLeakSource,
  ruleStartFinancialVisibility,
  ruleStartCashRunwayProtection,
  ruleStartPipelineConsistency,
  ruleScaleBestLeadSource,
  ruleScaleStrongBand,
];

// ─────────────────── Memory + Global pattern integration ───────────────────

const REJECTION_COOLDOWN_DAYS = 30;

function withinCooldown(rejectedAt: string | null | undefined): boolean {
  if (!rejectedAt) return false;
  const ms = Date.now() - new Date(rejectedAt).getTime();
  return ms < REJECTION_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
}

function bumpConfidence(c: Confidence): Confidence {
  return c === "low" ? "medium" : c === "medium" ? "high" : "high";
}
function lowerConfidence(c: Confidence): Confidence {
  return c === "high" ? "medium" : c === "medium" ? "low" : "low";
}
function bumpPriority(p: RecommendationPriority): RecommendationPriority {
  return p === "low" ? "medium" : p === "medium" ? "high" : "high";
}
function lowerPriority(p: RecommendationPriority): RecommendationPriority {
  return p === "high" ? "medium" : p === "medium" ? "low" : "low";
}

/**
 * Apply client memory + global pattern intelligence to a raw suggestion list.
 *  - drop suggestions whose rule_key was rejected within the cooldown window
 *  - drop suggestions whose theme is marked resolved in client memory
 *  - boost priority/confidence when client memory has validated the theme
 *  - soften when global pattern intelligence shows high rejection ratio
 *  - tag duplicates of already-curated items as low priority
 */
function applyMemoryAndPatterns(
  raw: RecommendationSuggestion[],
  ctx: {
    existing: Set<string>;
    rejected: RecommendationRow[];
    memory: CustomerMemoryRow[];
    patterns: PatternRow[];
  },
): RecommendationSuggestion[] {
  const patternByRule = indexPatternsByRule(ctx.patterns);
  const cooledRuleKeys = new Set(
    ctx.rejected
      .filter((r) => withinCooldown(r.rejected_at))
      .map((r) => r.rule_key)
      .filter((k): k is string => !!k),
  );

  const out: RecommendationSuggestion[] = [];
  for (const s of raw) {
    // 1. Cooldown: skip rejected rules entirely.
    if (cooledRuleKeys.has(s.rule_key)) continue;

    const norm = normalizeTitle(s.title);

    // 2. Resolved-issue memory: skip if marked resolved recently.
    const resolved = ctx.memory.some(
      (m) => m.status === "resolved" && normalizeTitle(m.title).includes(norm),
    );
    if (resolved) continue;

    let next = { ...s };

    // 3. Validated theme boost (approved guidance / recurring pattern memory).
    const validated = ctx.memory.find(
      (m) =>
        m.status === "active" &&
        (m.memory_type === "approved_guidance" ||
          m.memory_type === "recurring_pattern") &&
        normalizeTitle(m.title).includes(norm),
    );
    if (validated) {
      next.priority = bumpPriority(next.priority);
      next.confidence = bumpConfidence(next.confidence);
      next.memory_boosted = true;
      next.evidence = [
        ...next.evidence,
        {
          source_type: "manual",
          label: "Client memory",
          detail: `Theme previously validated (${validated.memory_type}, seen ${validated.times_seen}×).`,
        },
      ];
    }

    // 4. Global pattern softening (only — never the sole reason to surface).
    const pattern = patternByRule.get(s.rule_key);
    if (pattern) {
      const total = (pattern.approval_count ?? 0) + (pattern.rejection_count ?? 0);
      if (total >= 3) {
        const rejectRatio = (pattern.rejection_count ?? 0) / Math.max(1, total);
        if (rejectRatio >= 0.6) {
          next.priority = lowerPriority(next.priority);
          next.confidence = lowerConfidence(next.confidence);
          next.globally_softened = true;
          next.generated_reason +=
            " Across RGS accounts, similar suggestions are often refined or rejected — review wording carefully.";
        }
      }
    }

    // 5. Already-curated duplicate softening.
    const dupKey = `${s.category}:${norm}`;
    if (ctx.existing.has(dupKey)) {
      next.priority = "low";
      next.confidence = "low";
      next.generated_reason +=
        " (Note: a similar item already exists in this client's curated list.)";
    }

    out.push(next);
  }
  return out;
}

// ─────────────────────────── Stability interpretation ───────────────────────────

function buildStabilityInterpretation(ctx: RuleCtx): StabilityInterpretation | null {
  if (!ctx.score || !ctx.band) return null;
  const obs: string[] = [];
  const evidence: Evidence[] = [
    {
      source_type: "score",
      label: "Stability Score",
      detail: `Score ${ctx.score.score} — ${ctx.band.label}.`,
    },
  ];

  // Pull a few specific, evidence-backed observations.
  const recent = ctx.checkins[0];
  if (recent) {
    if (cashConcernRank(recent.cash_concern_level) >= 2) {
      obs.push("Cash concern is elevated on the most recent weekly check-in.");
      evidence.push({
        source_type: "weekly_checkin",
        label: `Weekly check-in (${fmtDate(recent.week_start)})`,
        detail: `Cash concern: ${recent.cash_concern_level}`,
      });
    }
    if (pipelineConfidenceRank(recent.pipeline_confidence) >= 2) {
      obs.push("Pipeline confidence is reading low or mixed.");
      evidence.push({
        source_type: "weekly_checkin",
        label: `Weekly check-in (${fmtDate(recent.week_start)})`,
        detail: `Pipeline confidence: ${recent.pipeline_confidence}`,
      });
    }
    const ownerBlock = blockerSignal(recent);
    if (ownerBlock.any) {
      obs.push("Operational blockers are still routing through the owner.");
    }
  }

  if (ctx.reviews.length > 0) {
    obs.push(`${ctx.reviews.length} open RGS review request${ctx.reviews.length > 1 ? "s" : ""} on file.`);
    evidence.push({
      source_type: "review",
      label: "RGS review queue",
      detail: `${ctx.reviews.length} open request(s).`,
    });
  }

  // Confidence: needs at least the score + one corroborating signal for "high".
  const corroborating = obs.length;
  const confidence: Confidence =
    corroborating >= 2 ? "high" : corroborating === 1 ? "medium" : "low";

  return {
    score: ctx.score.score,
    benchmark: ctx.band,
    observations: obs,
    recommended_focus: ctx.band.recommendedFocus,
    confidence,
    evidence,
  };
}

// ─────────────────────────── Main entry point ───────────────────────────

/**
 * Run the insight engine for a single customer. Returns structured
 * suggestions and a Stability interpretation. The caller (admin UI) is
 * responsible for presenting these for human approval before they become
 * client-facing.
 */
export async function runInsightEngine(
  customerId: string,
): Promise<InsightEngineResult> {
  const [score, intake, checkins, reviews, existing, rejected, memory, patterns] = await Promise.all([
    loadCustomerStabilityScore(customerId).catch(() => null),
    loadIntakeAnswers(customerId).catch(() => [] as IntakeAnswerRow[]),
    loadRecentWeeklyCheckins(customerId).catch(() => [] as WeeklyCheckinLite[]),
    loadOpenReviewRequests(customerId).catch(() => [] as ReviewRequestLite[]),
    listRecommendationsForCustomer(customerId).catch(() => [] as RecommendationRow[]),
    listRejectedRecommendations(customerId).catch(() => [] as RecommendationRow[]),
    loadCustomerMemory(customerId).catch(() => [] as CustomerMemoryRow[]),
    loadActivePatterns().catch(() => [] as PatternRow[]),
  ]);

  const band = score ? getScoreBenchmark(score.score) : null;
  const ctx: RuleCtx = {
    customerId,
    score,
    band,
    intake,
    checkins,
    reviews,
    existing: existingRuleKeys(existing),
  };

  const raw: RecommendationSuggestion[] = [];
  for (const rule of ALL_RULES) {
    try {
      const out = rule(ctx);
      if (out) raw.push(out);
    } catch {
      // Rules must never throw; ignore individual failures so the engine
      // remains safe to call in admin UIs.
    }
  }

  const suggestions = applyMemoryAndPatterns(raw, {
    existing: ctx.existing,
    rejected,
    memory,
    patterns,
  });

  // Engine notes for the admin reviewer.
  const notes: string[] = [];
  if (!score) notes.push("No Stability Score on file — interpretation is omitted.");
  if (checkins.length === 0)
    notes.push("No weekly check-ins on file — most recommendations rely on this signal.");
  if (intake.length === 0)
    notes.push("No diagnostic intake answers on file.");
  if (suggestions.length === 0 && (score || checkins.length > 0)) {
    notes.push(
      "Engine produced no automated suggestions from current data. Add manual recommendations or wait for more weekly data.",
    );
  }
  if (memory.length > 0)
    notes.push(
      `Client memory in use: ${memory.length} active learning row(s) shaped today's suggestions.`,
    );

  return {
    customer_id: customerId,
    generated_at: new Date().toISOString(),
    stability: buildStabilityInterpretation(ctx),
    suggestions,
    signal_coverage: {
      has_stability_score: !!score,
      weekly_checkins_count: checkins.length,
      diagnostic_answers_count: intake.length,
      open_review_requests: reviews.length,
      existing_recommendations: existing.length,
      memory_rows: memory.length,
      global_patterns: patterns.length,
    },
    notes,
  };
}

/** Pure variant for tests / previews — feed a context directly. */
export function runInsightEngineSync(ctx: {
  customerId: string;
  score: StabilityScoreRow | null;
  intake: IntakeAnswerRow[];
  checkins: WeeklyCheckinLite[];
  reviews: ReviewRequestLite[];
  existing: RecommendationRow[];
  rejected?: RecommendationRow[];
  memory?: CustomerMemoryRow[];
  patterns?: PatternRow[];
}): InsightEngineResult {
  const band = ctx.score ? getScoreBenchmark(ctx.score.score) : null;
  const ruleCtx: RuleCtx = {
    customerId: ctx.customerId,
    score: ctx.score,
    band,
    intake: ctx.intake,
    checkins: ctx.checkins,
    reviews: ctx.reviews,
    existing: existingRuleKeys(ctx.existing),
  };
  const raw: RecommendationSuggestion[] = [];
  for (const rule of ALL_RULES) {
    try {
      const out = rule(ruleCtx);
      if (out) raw.push(out);
    } catch {
      /* ignore */
    }
  }
  const suggestions = applyMemoryAndPatterns(raw, {
    existing: ruleCtx.existing,
    rejected: ctx.rejected ?? [],
    memory: ctx.memory ?? [],
    patterns: ctx.patterns ?? [],
  });
  return {
    customer_id: ctx.customerId,
    generated_at: new Date().toISOString(),
    stability: buildStabilityInterpretation(ruleCtx),
    suggestions,
    signal_coverage: {
      has_stability_score: !!ctx.score,
      weekly_checkins_count: ctx.checkins.length,
      diagnostic_answers_count: ctx.intake.length,
      open_review_requests: ctx.reviews.length,
      existing_recommendations: ctx.existing.length,
      memory_rows: ctx.memory?.length ?? 0,
      global_patterns: ctx.patterns?.length ?? 0,
    },
    notes: [],
  };
}