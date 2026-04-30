// P20.2 — Standardized Leak object.
//
// Pure types + small helpers. No network, no AI. Deterministic so it can be
// unit tested and surfaced in both admin and client views.
//
// A "Leak" is a normalized representation of a single revenue-system issue
// derived from any signal source (estimate friction, invoice status, uploads,
// connector data, etc.). Downstream the priority engine ranks Leaks into the
// Top-3 actionable issues for a customer.

import type { TargetGear } from "@/lib/gears/targetGear";
import type { IndustryCategory } from "@/lib/priorityEngine/types";

export type LeakCategory =
  | "conversion"
  | "workflow"
  | "financial_visibility"
  | "operations"
  | "retention"
  | "demand";

export type LeakSeverity = "low" | "medium" | "high";

export type LeakConfidence = "Confirmed" | "Estimated" | "Needs Verification";

export type LeakSource =
  | "estimates"
  | "invoices"
  | "uploads"
  | "connector"
  | "manual"
  | "scorecard";

/**
 * A standardized Leak object. The shape is intentionally additive so it can
 * be consumed by the priority engine, admin surfaces, and client surfaces
 * without forcing a UI redesign.
 */
export interface Leak {
  id: string;
  /** Stable issue key (e.g. "estimate_stale_sent"). Drives priority dedupe. */
  type: string;
  category: LeakCategory;
  /** RGS gear (1..5). See src/lib/gears/targetGear.ts */
  gear: TargetGear;
  severity: LeakSeverity;
  /** Estimated dollars at risk for this leak. 0 if unknown. */
  estimated_revenue_impact: number;
  confidence: LeakConfidence;
  source: LeakSource;
  message: string;
  /** Initial fix suggestion. Industry layer may override this. */
  recommended_fix: string;
  /** Industry the leak was generated against. Used by recommendation layer. */
  industry_context: IndustryCategory;
  /** Optional pointer back to the source row (estimate id, invoice id, etc.) */
  source_ref?: string | null;
  /** Optional human label for the affected client/job/account. */
  client_or_job?: string | null;
}

/** Sum dollars at risk across leaks. */
export function leakDollarsAtRisk(leaks: Leak[]): number {
  return leaks.reduce((s, l) => s + (l.estimated_revenue_impact || 0), 0);
}

/** Group leaks by category. Useful for admin breakdowns. */
export function groupLeaksByCategory(leaks: Leak[]): Record<LeakCategory, Leak[]> {
  const out: Record<LeakCategory, Leak[]> = {
    conversion: [],
    workflow: [],
    financial_visibility: [],
    operations: [],
    retention: [],
    demand: [],
  };
  for (const l of leaks) out[l.category].push(l);
  return out;
}