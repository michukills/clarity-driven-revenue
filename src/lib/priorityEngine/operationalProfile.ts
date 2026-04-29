// P19 — Operational profile completeness + conservative score adjustments.
// Admin-only context; never exposed to clients.

import { supabase } from "@/integrations/supabase/client";
import type { PriorityFactors } from "./types";
import type { RecommendationLike } from "./factorHeuristics";

export interface OperationalProfile {
  monthly_leads: number | null;
  monthly_close_rate_pct: number | null;
  average_ticket_usd: number | null;
  monthly_revenue_usd: number | null;
  gross_margin_pct: number | null;
  ar_open_usd: number | null;
  owner_hours_per_week: number | null;
  team_size: number | null;
  crew_or_job_capacity: string | null;
  biggest_constraint: string | null;
  owner_urgency: string | null;
  change_readiness: string | null;
  implementation_capacity: string | null;
  decision_bottleneck: string | null;
  implementation_failure_risk: string | null;
  accountable_owner_name: string | null;
  preferred_cadence: string | null;
}

export type ReadinessLabel = "incomplete" | "usable" | "strong";

export interface ProfileCompleteness {
  completeness_pct: number;
  filled_fields: string[];
  missing_fields: string[];
  critical_missing_fields: string[];
  readiness_label: ReadinessLabel;
}

export const TRACKED_FIELDS: (keyof OperationalProfile)[] = [
  "monthly_leads",
  "monthly_close_rate_pct",
  "average_ticket_usd",
  "monthly_revenue_usd",
  "gross_margin_pct",
  "ar_open_usd",
  "owner_hours_per_week",
  "team_size",
  "crew_or_job_capacity",
  "biggest_constraint",
  "owner_urgency",
  "change_readiness",
  "implementation_capacity",
  "decision_bottleneck",
  "implementation_failure_risk",
  "accountable_owner_name",
  "preferred_cadence",
];

export const CRITICAL_FIELDS: (keyof OperationalProfile)[] = [
  "monthly_revenue_usd",
  "biggest_constraint",
  "owner_urgency",
  "implementation_capacity",
  "decision_bottleneck",
];

const isFilled = (v: unknown): boolean => {
  if (v === null || v === undefined) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (typeof v === "number") return Number.isFinite(v);
  return true;
};

export function computeCompleteness(
  profile: Partial<OperationalProfile> | null
): ProfileCompleteness {
  const filled: string[] = [];
  const missing: string[] = [];
  for (const f of TRACKED_FIELDS) {
    if (profile && isFilled((profile as any)[f])) filled.push(f);
    else missing.push(f);
  }
  const completeness_pct = Math.round((filled.length / TRACKED_FIELDS.length) * 100);
  const critical_missing = CRITICAL_FIELDS.filter((f) => missing.includes(f));

  let readiness_label: ReadinessLabel;
  if (completeness_pct >= 80 && critical_missing.length === 0) readiness_label = "strong";
  else if (completeness_pct >= 50) readiness_label = "usable";
  else readiness_label = "incomplete";

  return {
    completeness_pct,
    filled_fields: filled,
    missing_fields: missing,
    critical_missing_fields: critical_missing as string[],
    readiness_label,
  };
}

export async function loadOperationalProfile(
  customerId: string
): Promise<OperationalProfile | null> {
  const { data } = await supabase
    .from("customer_operational_profile")
    .select(
      [
        "monthly_leads",
        "monthly_close_rate_pct",
        "average_ticket_usd",
        "monthly_revenue_usd",
        "gross_margin_pct",
        "ar_open_usd",
        "owner_hours_per_week",
        "team_size",
        "crew_or_job_capacity",
        "biggest_constraint",
        "owner_urgency",
        "change_readiness",
        "implementation_capacity",
        "decision_bottleneck",
        "implementation_failure_risk",
        "accountable_owner_name",
        "preferred_cadence",
      ].join(",")
    )
    .eq("customer_id", customerId)
    .maybeSingle();
  return (data as any) ?? null;
}

// ---- Score adjustment ----

const clamp = (n: number) => Math.max(1, Math.min(5, n));

const REVENUE_HINTS = ["revenue", "sales", "cash", "lead", "close", "pipeline"];
const CASH_AR_HINTS = ["cash", "ar", "collection", "invoice", "payment", "receivable"];
const PRICING_OPS_HINTS = ["pricing", "margin", "cost", "operations", "process", "labor", "efficiency"];
const OPS_OWNER_HINTS = ["operations", "process", "owner", "delegate", "sop", "bottleneck", "capacity"];

function categoryBlob(rec: RecommendationLike): string {
  return `${rec.title ?? ""} ${rec.category ?? ""} ${rec.explanation ?? ""} ${rec.related_pillar ?? ""}`.toLowerCase();
}

function matches(blob: string, hints: string[]): boolean {
  return hints.some((h) => blob.includes(h));
}

export interface AdjustmentNote {
  factor: keyof PriorityFactors;
  delta: number;
  reason: string;
}

export interface AdjustedFactors {
  factors: PriorityFactors;
  notes: AdjustmentNote[];
}

/**
 * Apply conservative profile-based nudges.
 * - Each factor moves at most ±1 per profile signal.
 * - Missing data NEVER inflates scores. It only suppresses adjustments.
 * - All factors clamped 1–5.
 */
export function applyProfileAdjustments(
  base: PriorityFactors,
  rec: RecommendationLike,
  profile: OperationalProfile | null
): AdjustedFactors {
  const notes: AdjustmentNote[] = [];
  const f: PriorityFactors = { ...base };

  if (!profile) {
    return { factors: f, notes };
  }

  const blob = categoryBlob(rec);

  // ---- Impact ----
  if (
    isFilled(profile.monthly_revenue_usd) &&
    (profile.monthly_revenue_usd ?? 0) >= 50_000 &&
    matches(blob, REVENUE_HINTS)
  ) {
    f.impact = clamp(f.impact + 1);
    notes.push({ factor: "impact", delta: +1, reason: "High monthly revenue + revenue/cash/sales issue" });
  }
  if (
    isFilled(profile.ar_open_usd) &&
    (profile.ar_open_usd ?? 0) >= 10_000 &&
    matches(blob, CASH_AR_HINTS)
  ) {
    f.impact = clamp(f.impact + 1);
    notes.push({ factor: "impact", delta: +1, reason: "Material open AR + cash/AR/payment issue" });
  }
  if (
    isFilled(profile.gross_margin_pct) &&
    (profile.gross_margin_pct ?? 100) <= 25 &&
    matches(blob, PRICING_OPS_HINTS)
  ) {
    f.impact = clamp(f.impact + 1);
    notes.push({ factor: "impact", delta: +1, reason: "Low gross margin + pricing/operations/cost issue" });
  }

  // ---- Visibility ----
  const urg = (profile.owner_urgency ?? "").toLowerCase();
  if (urg === "high" || urg === "critical") {
    f.visibility = clamp(f.visibility + 1);
    notes.push({ factor: "visibility", delta: +1, reason: `Owner urgency = ${urg}` });
  }
  if (isFilled(profile.biggest_constraint)) {
    const constraint = (profile.biggest_constraint ?? "").toLowerCase();
    // Only nudge if the constraint text overlaps the recommendation blob meaningfully.
    const tokens = constraint
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length >= 4);
    const overlap = tokens.some((t) => blob.includes(t));
    if (overlap) {
      f.visibility = clamp(f.visibility + 1);
      notes.push({ factor: "visibility", delta: +1, reason: "Issue aligns with stated biggest constraint" });
    }
  }

  // ---- Ease of fix ----
  if ((profile.implementation_capacity ?? "").toLowerCase() === "low") {
    f.ease_of_fix = clamp(f.ease_of_fix - 1);
    notes.push({ factor: "ease_of_fix", delta: -1, reason: "Low implementation capacity" });
  }
  if ((profile.change_readiness ?? "").toLowerCase() === "low") {
    f.ease_of_fix = clamp(f.ease_of_fix - 1);
    notes.push({ factor: "ease_of_fix", delta: -1, reason: "Low change readiness" });
  }

  // ---- Dependency ----
  const ownerHeavy =
    isFilled(profile.decision_bottleneck) ||
    (isFilled(profile.owner_hours_per_week) && (profile.owner_hours_per_week ?? 0) >= 50);
  if (ownerHeavy && matches(blob, OPS_OWNER_HINTS)) {
    f.dependency = clamp(f.dependency + 1);
    notes.push({
      factor: "dependency",
      delta: +1,
      reason: "Owner-dependent operations + ops/process/owner-independence issue",
    });
  }

  return { factors: f, notes };
}
