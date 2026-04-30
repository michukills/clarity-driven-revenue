// P20.2 — Revenue Leak Engine (industry-aware) main entry.
//
// Pipeline:
//   1. Convert raw signals (currently: estimate friction) into Leak objects.
//   2. Apply industry-specific recommendation overrides.
//   3. Score and rank using the canonical priority engine formula.
//   4. Produce admin view (full breakdown) and client view (simplified).
//   5. Generate initial task seeds for the top issues.
//
// All functions are pure and deterministic. No AI, no network.

import type { IndustryCategory, ClientTaskSeed } from "@/lib/priorityEngine/types";
import type { Estimate } from "@/lib/estimates/types";
import { gearMeta } from "@/lib/gears/targetGear";
import { leakDollarsAtRisk, type Leak } from "./leakObject";
import { leaksFromEstimates } from "./fromEstimates";
import { applyIndustryRecommendations, profileFor } from "./industry";
import { prioritizeLeaks, type RankedLeak } from "./prioritize";

export type { Leak, LeakCategory, LeakConfidence, LeakSeverity, LeakSource } from "./leakObject";
export type { RankedLeak } from "./prioritize";
export { leaksFromEstimates, signalToLeak } from "./fromEstimates";
export { applyIndustryRecommendation, applyIndustryRecommendations, profileFor, INDUSTRY_PROFILES } from "./industry";
export { prioritizeLeaks, leakToScoredIssue, impactFromDollars } from "./prioritize";

export interface AnalyzeLeaksInput {
  industry: IndustryCategory;
  estimates: Estimate[];
  invoiceEstimateLinks?: { source_estimate_id: string | null }[];
  /** Optional already-derived leaks from other sources (uploads, etc.). */
  extraLeaks?: Leak[];
  now?: Date;
}

export interface AdminLeakView {
  ranked: RankedLeak[];
  top3: RankedLeak[];
  totalDollarsAtRisk: number;
  industryLabel: string;
}

export interface ClientLeakItem {
  rank: number;
  title: string;
  estimated_impact: number;
  recommendation: string;
  confidence: Leak["confidence"];
}

export interface ClientLeakView {
  industryLabel: string;
  topIssues: ClientLeakItem[];
  totalDollarsAtRisk: number;
}

export interface LeakAnalysis {
  leaks: Leak[];
  admin: AdminLeakView;
  client: ClientLeakView;
  taskSeeds: ClientTaskSeed[];
}

/**
 * Run the full leak → priority → recommendations pipeline for a customer.
 */
export function analyzeLeaks(input: AnalyzeLeaksInput): LeakAnalysis {
  // 1. Generate leaks from estimate friction.
  const estimateLeaks = leaksFromEstimates({
    industry: input.industry,
    estimates: input.estimates,
    invoiceEstimateLinks: input.invoiceEstimateLinks,
    now: input.now,
  });

  // 2. Combine with any externally-provided leaks (uploads, connectors, etc.).
  const combined = [...estimateLeaks, ...(input.extraLeaks ?? [])];

  // 3. Apply industry-specific recommendations.
  const withIndustry = applyIndustryRecommendations(combined);

  // 4. Prioritize and rank.
  const { ranked, top3 } = prioritizeLeaks(withIndustry);

  const totalDollarsAtRisk = leakDollarsAtRisk(withIndustry);
  const industryLabel = profileFor(input.industry).label;

  // 5. Build views.
  const admin: AdminLeakView = {
    ranked,
    top3,
    totalDollarsAtRisk,
    industryLabel,
  };

  const client: ClientLeakView = {
    industryLabel,
    totalDollarsAtRisk,
    topIssues: top3.map((r) => ({
      rank: r.scored.rank,
      title: r.leak.message,
      estimated_impact: r.leak.estimated_revenue_impact,
      recommendation: r.leak.recommended_fix,
      confidence: r.leak.confidence,
    })),
  };

  // 6. Initial task seeds for top issues. Kept intentionally simple (P20.2 goal).
  const taskSeeds: ClientTaskSeed[] = top3.map((r) => ({
    rank: r.scored.rank,
    issue_title: r.leak.message,
    why_it_matters:
      r.leak.estimated_revenue_impact > 0
        ? `Estimated $${r.leak.estimated_revenue_impact.toLocaleString("en-US")} at risk in ${r.leak.category.replace("_", " ")}.`
        : `Affects ${r.leak.category.replace("_", " ")} stability.`,
    evidence_summary: `${r.leak.confidence} · source: ${r.leak.source}${r.leak.client_or_job ? ` · ${r.leak.client_or_job}` : ""}`,
    priority_band: r.scored.priority_band,
    expected_outcome:
      r.leak.category === "financial_visibility"
        ? "Cash recovered and visible in the next reporting cycle."
        : "Revenue conversion improves on the next cohort of deals.",
    next_step: r.leak.recommended_fix,
    suggestions: [
      {
        label: r.leak.recommended_fix,
        detail: `Gear: ${gearMeta(r.leak.gear)?.short ?? `G${r.leak.gear}`}`,
        source: "report",
        client_visible: true,
      },
    ],
  }));

  return { leaks: withIndustry, admin, client, taskSeeds };
}