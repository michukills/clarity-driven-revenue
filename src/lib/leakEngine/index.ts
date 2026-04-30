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
import {
  routeBrain,
  dataMapFor,
  clientVisibleToolsForIndustry,
  toolsForIndustry,
  type BrainRouterOutput,
} from "@/lib/intelligence";
import type {
  BrainInput,
  BrainSignal,
  IndustryDataInput,
  RequiredDataField,
} from "@/lib/intelligence/types";
import type { ToolCoverageEntry } from "@/lib/intelligence/types";

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
  /**
   * P20.4 — Optional brain context. When provided, the General RGS Brain and
   * the matching Industry Brain are run via routeBrain() and their leaks are
   * merged into the pipeline. Pure / deterministic. Industry fallback is
   * preserved when industryConfirmed=false.
   */
  industryConfirmed?: boolean;
  brainSignals?: BrainSignal[];
  industryData?: IndustryDataInput;
}

export interface AdminLeakView {
  ranked: RankedLeak[];
  top3: RankedLeak[];
  totalDollarsAtRisk: number;
  industryLabel: string;
  /** P20.4 — General RGS Brain leaks (universal). */
  generalLeaks: Leak[];
  /** P20.4 — Industry brain leaks (vertical-specific). */
  industryLeaks: Leak[];
  /** P20.4 — Estimate-derived leaks (workflow friction). */
  estimateLeaks: Leak[];
  /** P20.4 — true when industry brain fell back to General/Mixed. */
  fellBackToGeneralMixed: boolean;
  /** P20.4 — Tools available for the resolved industry (admin sees all). */
  tools: ToolCoverageEntry[];
  /** P20.4 — Missing-data + industry gap report for admin checklists. */
  industryGapReport: IndustryGapReport;
}

export interface ClientLeakItem {
  rank: number;
  title: string;
  estimated_impact: number;
  recommendation: string;
  confidence: Leak["confidence"];
  gear: Leak["gear"];
}

export interface ClientLeakView {
  industryLabel: string;
  topIssues: ClientLeakItem[];
  totalDollarsAtRisk: number;
  /** P20.4 — Plain-English checklist of data the client still needs to provide. */
  needsVerification: string[];
  /** P20.4 — Tools the client is allowed to see for this industry. */
  visibleTools: ToolCoverageEntry[];
}

/**
 * P20.4 — Admin-only summary of what's missing before industry-specific
 * intelligence can run with high confidence.
 */
export interface IndustryGapReport {
  industry: IndustryCategory;
  industryConfirmed: boolean;
  fellBackToGeneralMixed: boolean;
  missingRequiredFields: RequiredDataField[];
  unverifiedFields: RequiredDataField[];
  /** Leak ids whose confidence is "Needs Verification". */
  needsVerificationLeakIds: string[];
}

export interface LeakAnalysis {
  leaks: Leak[];
  admin: AdminLeakView;
  client: ClientLeakView;
  taskSeeds: ClientTaskSeed[];
  /** P20.4 — raw router output for downstream surfaces that want it. */
  brain?: BrainRouterOutput;
}

/**
 * P20.4 — Admin-only gating helper. Resolves whether a given tool key is
 * client-visible for the resolved industry.
 */
export function clientCanAccessTool(
  industry: IndustryCategory,
  industryConfirmed: boolean,
  toolKey: string,
): boolean {
  // If industry isn't verified we use the general/mixed coverage map — which
  // intentionally excludes industry-specific tools.
  const effective: IndustryCategory = industryConfirmed ? industry : "general_service";
  const visible = clientVisibleToolsForIndustry(effective);
  return visible.some((t) => t.tool_key === toolKey);
}

function buildIndustryGapReport(
  industry: IndustryCategory,
  industryConfirmed: boolean,
  fellBack: boolean,
  industryData: IndustryDataInput | undefined,
  combinedLeaks: Leak[],
): IndustryGapReport {
  const map = dataMapFor(industry);
  const provided = new Set<string>();
  // Heuristic: treat any non-empty bucket in IndustryDataInput as "this group
  // is being tracked". Field-level presence isn't captured by the brain input
  // shape, so we only flag *required* fields when no data for the industry is
  // present at all. This stays honest about what we can/can't confirm.
  if (industryData) {
    for (const k of Object.keys(industryData) as (keyof IndustryDataInput)[]) {
      const v = industryData[k];
      if (v && typeof v === "object" && Object.keys(v).length > 0) provided.add(k);
    }
  }
  const anyIndustryDataProvided = provided.size > 0;

  const missingRequiredFields = map.filter(
    (f) => f.required && !anyIndustryDataProvided,
  );
  const unverifiedFields = map.filter((f) => f.confidence === "Needs Verification");
  const needsVerificationLeakIds = combinedLeaks
    .filter((l) => l.confidence === "Needs Verification")
    .map((l) => l.id);

  return {
    industry,
    industryConfirmed,
    fellBackToGeneralMixed: fellBack,
    missingRequiredFields,
    unverifiedFields,
    needsVerificationLeakIds,
  };
}

/** Plain-English needs-verification list for the client surface. Hides ids/internals. */
function buildClientNeedsVerification(report: IndustryGapReport): string[] {
  const out: string[] = [];
  if (!report.industryConfirmed) {
    out.push("Confirm your business industry so we can tailor the analysis.");
  }
  for (const f of report.missingRequiredFields.slice(0, 5)) {
    out.push(`We need ${f.field.replace(/_/g, " ")} before we can confirm related issues.`);
  }
  return out;
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

  // 2. Optionally run the brain layer (P20.4 wiring).
  const industryConfirmed = input.industryConfirmed ?? false;
  const shouldRunBrain =
    input.brainSignals !== undefined ||
    input.industryData !== undefined ||
    input.industryConfirmed !== undefined;

  let brain: BrainRouterOutput | undefined;
  let generalLeaks: Leak[] = [];
  let industryLeaks: Leak[] = [];
  if (shouldRunBrain) {
    const brainInput: BrainInput = {
      industry: input.industry,
      industryConfirmed,
      signals: input.brainSignals,
      industryData: input.industryData,
      existingLeaks: estimateLeaks,
      now: input.now,
    };
    brain = routeBrain(brainInput);
    generalLeaks = brain.generalLeaks;
    industryLeaks = brain.industryLeaks;
  }

  // 3. Combine all sources, de-dup by leak id, preserve confidence labels.
  const combinedRaw = [
    ...estimateLeaks,
    ...generalLeaks,
    ...industryLeaks,
    ...(input.extraLeaks ?? []),
  ];
  const seen = new Set<string>();
  const combined: Leak[] = [];
  for (const l of combinedRaw) {
    if (seen.has(l.id)) continue;
    seen.add(l.id);
    combined.push(l);
  }

  // 4. Apply industry-specific recommendations (estimate-friction overrides).
  const withIndustry = applyIndustryRecommendations(combined);

  // 5. Prioritize and rank.
  const { ranked, top3 } = prioritizeLeaks(withIndustry);

  const totalDollarsAtRisk = leakDollarsAtRisk(withIndustry);
  const industryLabel = profileFor(input.industry).label;

  const fellBack = brain?.fellBackToGeneralMixed ?? !industryConfirmed;
  const effectiveIndustryForTools: IndustryCategory =
    industryConfirmed ? input.industry : "general_service";
  const tools = toolsForIndustry(effectiveIndustryForTools);
  const visibleTools = clientVisibleToolsForIndustry(effectiveIndustryForTools);

  const industryGapReport = buildIndustryGapReport(
    input.industry,
    industryConfirmed,
    fellBack,
    input.industryData,
    withIndustry,
  );

  // 6. Build views.
  const admin: AdminLeakView = {
    ranked,
    top3,
    totalDollarsAtRisk,
    industryLabel,
    generalLeaks,
    industryLeaks,
    estimateLeaks,
    fellBackToGeneralMixed: fellBack,
    tools,
    industryGapReport,
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
      gear: r.leak.gear,
    })),
    needsVerification: buildClientNeedsVerification(industryGapReport),
    visibleTools,
  };

  // 7. Initial task seeds for top issues. Kept intentionally simple (P20.2 goal).
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

  return { leaks: withIndustry, admin, client, taskSeeds, brain };
}