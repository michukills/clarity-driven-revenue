// P20.2 — Convert estimate friction signals into standardized Leak objects.
//
// Pure mapper. No network, no AI.

import type { TargetGear } from "@/lib/gears/targetGear";
import type { IndustryCategory } from "@/lib/priorityEngine/types";
import {
  detectEstimateFriction,
  type FrictionInput,
  type FrictionKind,
  type FrictionSignal,
} from "@/lib/estimates/friction";
import type { Leak, LeakCategory } from "./leakObject";

/** Friction kind → leak category + RGS gear mapping. */
const FRICTION_MAP: Record<FrictionKind, { category: LeakCategory; gear: TargetGear }> = {
  estimate_never_sent:           { category: "conversion",           gear: 2 }, // Revenue Conversion
  estimate_stale_sent:           { category: "conversion",           gear: 2 },
  estimate_expired_unanswered:   { category: "conversion",           gear: 2 },
  estimate_approved_not_invoiced:{ category: "financial_visibility", gear: 4 }, // Financial Visibility
  job_completed_not_invoiced:    { category: "financial_visibility", gear: 4 },
};

/** Default English fixes per friction kind. Industry layer may override. */
const DEFAULT_FIX: Record<FrictionKind, string> = {
  estimate_never_sent:
    "Send the draft estimate today and add a reminder cadence so drafts don't sit longer than 48 hours.",
  estimate_stale_sent:
    "Send a one-line follow-up on every estimate sitting beyond 14 days and capture the decision.",
  estimate_expired_unanswered:
    "Re-send the expired estimate with a clear new expiration and a single follow-up touch.",
  estimate_approved_not_invoiced:
    "Invoice every approved estimate within 48 hours of approval — make this a same-week rule.",
  job_completed_not_invoiced:
    "Invoice on completion. Add a daily check that closes 'completed but uninvoiced' jobs.",
};

function stableId(prefix: string, ref: string | null, idx: number): string {
  return `${prefix}:${ref ?? `idx-${idx}`}`;
}

export interface EstimateLeakInput extends FrictionInput {
  industry: IndustryCategory;
}

/**
 * Convert an estimates dataset into Leak objects. Returns Leaks sorted by
 * severity (high → low) then dollar impact.
 */
export function leaksFromEstimates(input: EstimateLeakInput): Leak[] {
  const signals = detectEstimateFriction(input);
  return signals.map((s, i) => signalToLeak(s, input.industry, i));
}

/** Lower-level: convert a single friction signal to a Leak. Exposed for tests. */
export function signalToLeak(
  s: FrictionSignal,
  industry: IndustryCategory,
  idx = 0,
): Leak {
  const map = FRICTION_MAP[s.kind];
  return {
    id: stableId(s.kind, s.estimate_id, idx),
    type: s.kind,
    category: map.category,
    gear: map.gear,
    severity: s.severity,
    estimated_revenue_impact: Math.max(0, Math.round(s.amount || 0)),
    confidence: s.confidence,
    source: "estimates",
    message: s.message,
    recommended_fix: DEFAULT_FIX[s.kind],
    industry_context: industry,
    source_ref: s.estimate_id,
    client_or_job: s.client_or_job,
  };
}