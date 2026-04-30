// P20.7 — Deterministic mappers from real customer data sources into the
// existing intelligence pipeline inputs (BrainSignal[] + IndustryDataInput).
//
// PURE / DETERMINISTIC. No AI. No network. The inputs come from already-loaded
// rows. Confidence is preserved from the source (Confirmed when explicit
// stored data, Estimated when inferred from natural-language scorecard
// answers, Needs Verification when source data is missing or contradictory).
//
// Intentionally honest about what we DO NOT have today:
//   * `client_business_snapshots` is currently mostly free-text (no numeric
//     food/labor/margin/inventory/turnover fields). We therefore do NOT
//     fabricate numeric IndustryDataInput values from snapshot prose. TODO
//     fields are listed below — when those columns actually exist they can
//     be wired in here without changing the panel.
//   * Cannabis/MMC mapping uses cannabis retail / inventory / margin only.
//     No healthcare/patient/claim/reimbursement/appointment/provider/
//     clinical fields are read or emitted.

import type { BrainSignal, IndustryDataInput } from "@/lib/intelligence/types";
import type { LeakConfidence } from "@/lib/leakEngine/leakObject";
import type { IndustryCategory } from "@/lib/priorityEngine/types";

/** Minimal shape of `scorecard_runs.pillar_results[i]` we rely on. */
export interface ScorecardPillarResultLike {
  pillar_id: "demand" | "conversion" | "operations" | "financial" | "owner";
  band: 1 | 2 | 3 | 4 | 5;
  confidence: "low" | "medium" | "high";
  rationale?: string | null;
  missing_information?: string[] | null;
}

/** Minimal shape of a `scorecard_runs` row we rely on. */
export interface ScorecardRunLike {
  id?: string;
  created_at?: string;
  pillar_results?: ScorecardPillarResultLike[] | null;
  overall_confidence?: "low" | "medium" | "high" | string | null;
}

/** Minimal shape of `client_business_snapshots` we rely on. */
export interface BusinessSnapshotLike {
  snapshot_status?: string | null; // 'draft' | 'admin_verified'
  industry_verified?: boolean | null;
  what_business_does?: string | null;
  products_services?: string | null;
  revenue_model?: string | null;
  operating_model?: string | null;
}

/**
 * Map scorecard `confidence` → leak `LeakConfidence`.
 *
 * - high   → "Confirmed"   (strong evidence in scorecard answers)
 * - medium → "Estimated"   (inferred from natural-language answers)
 * - low    → "Needs Verification" (vague / missing answers)
 */
function pillarConfidenceToLeak(c: ScorecardPillarResultLike["confidence"]): LeakConfidence {
  if (c === "high") return "Confirmed";
  if (c === "medium") return "Estimated";
  return "Needs Verification";
}

/**
 * Pillar id → universal General-Brain key + plain-English observation.
 * Only emitted as a BrainSignal when the pillar band is 1 or 2 (low
 * maturity). The General Brain currently consumes signals primarily by
 * keyword (`follow_up`, `invoice+delay`, `missing_data`/`unverified`), so
 * we use those substrings on purpose. The remaining pillars route through
 * `industryDataFromScorecard` below as `shared.*` flags, which the General
 * Brain already turns into the matching universal leaks.
 *
 * Bands map (from rubric.ts):
 *   1 = Crisis / no system
 *   2 = Reactive
 *   3 = Stabilizing
 *   4 = Repeatable
 *   5 = Predictable
 */
const PILLAR_TO_SIGNAL: Partial<
  Record<ScorecardPillarResultLike["pillar_id"], { key: string; observation: string }>
> = {
  conversion: {
    // 'follow_up' substring is recognized by the General Brain.
    key: "poor_follow_up_from_scorecard",
    observation:
      "Revenue conversion is leaking: leads / estimates are not being followed up on a reliable cadence.",
  },
};

/**
 * Build deterministic BrainSignal[] from the latest scorecard run.
 *
 * Rules:
 *   * Only pillars at band ≤ 2 emit a signal. Higher bands stay silent —
 *     we never fabricate findings just because data exists.
 *   * Confidence is mapped from pillar.confidence. Vague answers stay at
 *     "Needs Verification".
 *   * No dollar impact is invented — the priority engine has its own
 *     fallback for unknown $ impact.
 *   * If `run` is null/undefined or pillar_results is missing, emit nothing
 *     and let the existing missing-data / Needs-Verification path handle it.
 */
export function brainSignalsFromScorecard(
  run: ScorecardRunLike | null | undefined,
): BrainSignal[] {
  const pillars = run?.pillar_results;
  if (!pillars || pillars.length === 0) return [];
  const out: BrainSignal[] = [];
  for (const p of pillars) {
    if (!p || !p.pillar_id) continue;
    if (p.band > 2) continue;
    const map = PILLAR_TO_SIGNAL[p.pillar_id];
    if (!map) continue;
    out.push({
      key: map.key,
      observation: map.observation,
      severity: p.band === 1 ? "high" : "medium",
      confidence: pillarConfidenceToLeak(p.confidence),
      source_ref: run?.id ? `scorecard_run:${run.id}` : null,
    });
  }
  return out;
}

/**
 * Build the `shared.*` portion of IndustryDataInput from a scorecard run.
 *
 * The General Brain already turns `shared` flags into the right universal
 * leaks (owner_dependent_process, weak_profitability_visibility,
 * missing_source_attribution, manual_workaround_dependency,
 * inconsistent_review_rhythm). We only set a flag when the pillar is at
 * band ≤ 2 AND the scorecard's confidence isn't "low" — otherwise we
 * leave it unset so the missing-data / Needs-Verification path stays
 * honest. We never set a positive flag (e.g. `profitVisible: true`) from
 * a high pillar score; absence is the right default.
 */
export function industryDataFromScorecard(
  run: ScorecardRunLike | null | undefined,
): IndustryDataInput | undefined {
  const pillars = run?.pillar_results;
  if (!pillars || pillars.length === 0) return undefined;
  const shared: NonNullable<IndustryDataInput["shared"]> = {};
  let touched = false;
  for (const p of pillars) {
    if (!p || !p.pillar_id) continue;
    if (p.band > 2) continue;
    if (p.confidence === "low") continue; // too vague to assert
    switch (p.pillar_id) {
      case "owner":
        shared.ownerIsBottleneck = true;
        touched = true;
        break;
      case "financial":
        shared.profitVisible = false;
        touched = true;
        break;
      case "demand":
        shared.hasSourceAttribution = false;
        touched = true;
        break;
      case "operations":
        shared.usesManualSpreadsheet = true;
        touched = true;
        break;
      // 'conversion' is covered by brainSignalsFromScorecard above.
      default:
        break;
    }
  }
  return touched ? { shared } : undefined;
}

/** Shallow merge of two IndustryDataInput objects (later wins per leaf). */
export function mergeIndustryData(
  a: IndustryDataInput | undefined,
  b: IndustryDataInput | undefined,
): IndustryDataInput | undefined {
  if (!a && !b) return undefined;
  return {
    ...(a ?? {}),
    ...(b ?? {}),
    shared: { ...(a?.shared ?? {}), ...(b?.shared ?? {}) },
  };
}

/**
 * Build deterministic IndustryDataInput from the business snapshot.
 *
 * Today's snapshot is mostly free-text and has no numeric metric columns.
 * We therefore do NOT invent numeric values (foodCostPct, grossMarginPct,
 * inventoryTurnover, etc.) from prose. We only emit `shared` flags that
 * can be honestly derived from explicitly stored fields.
 *
 * TODO (when columns exist on `client_business_snapshots` or a new
 * structured table):
 *   * trades:     estimatesSent / estimatesUnsent / jobsCompleted /
 *                 jobsCompletedNotInvoiced / grossMarginPct / hasJobCosting /
 *                 followUpBacklog / serviceLineVisibility
 *   * restaurant: foodCostPct / laborCostPct / grossMarginPct / tracksWaste /
 *                 hasDailyReporting / menuMarginVisible / vendorCostChange
 *   * retail:     deadStockValue / inventoryTurnover / stockoutCount /
 *                 returnRatePct / hasCategoryMargin / highSalesLowMarginCount
 *   * cannabis:   grossMarginPct / productMarginVisible / categoryMarginVisible /
 *                 deadStockValue / stockoutCount / inventoryTurnover /
 *                 shrinkagePct / discountImpactPct / promotionImpactPct /
 *                 vendorCostIncreasePct / paymentReconciliationGap /
 *                 hasDailyOrWeeklyReporting / usesManualPosWorkaround /
 *                 highSalesLowMarginCount   (cannabis retail only — never
 *                 healthcare/patient/claim/reimbursement/appointment/
 *                 provider/clinical)
 *   * shared:     hasWeeklyReview / sourceAttributionVisible / profitVisible
 */
export function industryDataFromSnapshot(
  snapshot: BusinessSnapshotLike | null | undefined,
  _industry: IndustryCategory,
): IndustryDataInput | undefined {
  if (!snapshot) return undefined;
  // Currently snapshot has no boolean operations fields either. We pass an
  // empty object only when the snapshot exists so the brain layer knows
  // structured input was attempted (vs. completely absent). The brain
  // already treats empty / unknown structured input as missing-data.
  return {};
}

/**
 * Combine scorecard signals with any caller-supplied extras. Deduplicate
 * by `key` keeping the strongest confidence (Confirmed > Estimated >
 * Needs Verification) and the worse severity.
 */
export function mergeBrainSignals(...lists: BrainSignal[][]): BrainSignal[] {
  const order: Record<LeakConfidence, number> = {
    Confirmed: 3,
    Estimated: 2,
    "Needs Verification": 1,
  };
  const sevOrder = { high: 3, medium: 2, low: 1 } as const;
  const byKey = new Map<string, BrainSignal>();
  for (const list of lists) {
    for (const s of list) {
      const existing = byKey.get(s.key);
      if (!existing) {
        byKey.set(s.key, { ...s });
        continue;
      }
      const ec = existing.confidence ?? "Needs Verification";
      const nc = s.confidence ?? "Needs Verification";
      const es = existing.severity ?? "low";
      const ns = s.severity ?? "low";
      byKey.set(s.key, {
        ...existing,
        confidence: order[nc] > order[ec] ? nc : ec,
        severity: sevOrder[ns] > sevOrder[es] ? ns : es,
        observation: existing.observation || s.observation,
      });
    }
  }
  return Array.from(byKey.values());
}