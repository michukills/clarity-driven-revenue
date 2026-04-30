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
import type { CustomerBusinessMetrics } from "@/lib/customerMetrics/types";

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
 * P20.8 — Map structured `client_business_metrics` row → `IndustryDataInput`.
 *
 * Rules:
 *   * Null fields stay null. We never emit `0` from `null`.
 *   * Percentage columns are stored 0..100. Brains expect decimals (0..1)
 *     for fields like foodCostPct/laborCostPct/grossMarginPct/return etc.,
 *     so we divide by 100 here. Cannabis discount/promotion/shrinkage are
 *     consumed by the brain in the same decimal convention.
 *   * Cannabis/MMC mapping is regulated retail / inventory / margin only.
 *     No healthcare/patient/claim/reimbursement/appointment/provider/
 *     clinical fields exist on the source row or in the output.
 */
export function industryDataFromMetrics(
  m: CustomerBusinessMetrics | null | undefined,
  _industry: IndustryCategory,
): IndustryDataInput | undefined {
  if (!m) return undefined;
  const pct = (n: number | null | undefined): number | null =>
    typeof n === "number" ? n / 100 : null;
  const has = (v: unknown): boolean => v !== null && v !== undefined;

  const out: IndustryDataInput = {};

  // Shared
  const shared: NonNullable<IndustryDataInput["shared"]> = {};
  if (has(m.has_weekly_review)) shared.hasWeeklyReview = !!m.has_weekly_review;
  if (has(m.has_assigned_owners)) shared.hasAssignedOwners = !!m.has_assigned_owners;
  if (has(m.owner_is_bottleneck)) shared.ownerIsBottleneck = !!m.owner_is_bottleneck;
  if (has(m.uses_manual_spreadsheet)) shared.usesManualSpreadsheet = !!m.uses_manual_spreadsheet;
  if (has(m.profit_visible)) shared.profitVisible = !!m.profit_visible;
  if (has(m.source_attribution_visible))
    shared.hasSourceAttribution = !!m.source_attribution_visible;
  if (Object.keys(shared).length) out.shared = shared;

  // Trades
  const trades: NonNullable<IndustryDataInput["trades"]> = {};
  if (has(m.estimates_sent)) trades.estimatesSent = m.estimates_sent as number;
  if (has(m.estimates_unsent)) trades.estimatesUnsent = m.estimates_unsent as number;
  if (has(m.jobs_completed)) trades.jobsCompleted = m.jobs_completed as number;
  if (has(m.jobs_completed_not_invoiced))
    trades.jobsCompletedNotInvoiced = m.jobs_completed_not_invoiced as number;
  const tradesGm = pct(m.gross_margin_pct);
  if (tradesGm !== null) trades.grossMarginPct = tradesGm;
  if (has(m.has_job_costing)) trades.hasJobCosting = !!m.has_job_costing;
  if (Object.keys(trades).length) out.trades = trades;

  // Restaurant
  const restaurant: NonNullable<IndustryDataInput["restaurant"]> = {};
  const fc = pct(m.food_cost_pct);
  if (fc !== null) restaurant.foodCostPct = fc;
  const lc = pct(m.labor_cost_pct);
  if (lc !== null) restaurant.laborCostPct = lc;
  const rgm = pct(m.gross_margin_pct_restaurant);
  if (rgm !== null) restaurant.grossMarginPct = rgm;
  if (has(m.tracks_waste)) restaurant.tracksWaste = !!m.tracks_waste;
  if (has(m.has_daily_reporting)) restaurant.hasDailyReporting = !!m.has_daily_reporting;
  if (Object.keys(restaurant).length) out.restaurant = restaurant;

  // Retail
  const retail: NonNullable<IndustryDataInput["retail"]> = {};
  if (has(m.dead_stock_value)) retail.deadStockValue = m.dead_stock_value as number;
  if (has(m.inventory_turnover)) retail.inventoryTurnover = m.inventory_turnover as number;
  if (has(m.stockout_count)) retail.stockoutCount = m.stockout_count as number;
  const rr = pct(m.return_rate_pct);
  if (rr !== null) retail.returnRatePct = rr;
  if (has(m.has_category_margin)) retail.hasCategoryMargin = !!m.has_category_margin;
  if (Object.keys(retail).length) out.retail = retail;

  // Cannabis / MMC (regulated retail — NOT healthcare)
  const cannabis: NonNullable<IndustryDataInput["cannabis"]> = {};
  const cgm = pct(m.cannabis_gross_margin_pct);
  if (cgm !== null) cannabis.grossMarginPct = cgm;
  if (has(m.cannabis_product_margin_visible))
    cannabis.productMarginVisible = !!m.cannabis_product_margin_visible;
  if (has(m.cannabis_category_margin_visible))
    cannabis.categoryMarginVisible = !!m.cannabis_category_margin_visible;
  if (has(m.cannabis_dead_stock_value))
    cannabis.deadStockValue = m.cannabis_dead_stock_value as number;
  if (has(m.cannabis_stockout_count))
    cannabis.stockoutCount = m.cannabis_stockout_count as number;
  if (has(m.cannabis_inventory_turnover))
    cannabis.inventoryTurnover = m.cannabis_inventory_turnover as number;
  const cs = pct(m.cannabis_shrinkage_pct);
  if (cs !== null) cannabis.shrinkagePct = cs;
  const cd = pct(m.cannabis_discount_impact_pct);
  if (cd !== null) cannabis.discountImpactPct = cd;
  const cp = pct(m.cannabis_promotion_impact_pct);
  if (cp !== null) cannabis.promotionImpactPct = cp;
  const cv = pct(m.cannabis_vendor_cost_increase_pct);
  if (cv !== null) cannabis.vendorCostIncreasePct = cv;
  if (has(m.cannabis_payment_reconciliation_gap))
    cannabis.paymentReconciliationGap = !!m.cannabis_payment_reconciliation_gap;
  if (has(m.cannabis_has_daily_or_weekly_reporting))
    cannabis.hasDailyOrWeeklyReporting = !!m.cannabis_has_daily_or_weekly_reporting;
  if (has(m.cannabis_uses_manual_pos_workaround))
    cannabis.usesManualPosWorkaround = !!m.cannabis_uses_manual_pos_workaround;
  if (Object.keys(cannabis).length) out.cannabis = cannabis;

  return Object.keys(out).length ? out : undefined;
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