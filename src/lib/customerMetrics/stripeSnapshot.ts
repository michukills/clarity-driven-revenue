/**
 * P20.12 — Stripe → client_business_metrics snapshot mapper.
 *
 * Pure function. Takes a server-persisted Stripe period summary row and
 * returns ONLY the metrics fields Stripe payment data can safely support.
 *
 * Hard rules:
 *   - We never invent values. Missing inputs → undefined on payload.
 *   - We never derive inventory, gross margin, labor cost, food cost,
 *     dead stock, vendor cost changes, operational visibility, owner
 *     independence, Square/POS-only metrics, or any cannabis compliance
 *     field.
 *   - Tokens are NOT touched here. This module only consumes a summary
 *     row that the backend has already persisted.
 *
 * Stripe-derived fields the schema persists today:
 *   - average_order_value
 *   - primary_data_source = "Stripe"
 *
 * Additional indicators we can SAFELY compute from Stripe but do NOT
 * yet have schema columns for are surfaced on `derivedIndicators` so
 * the importer UI can show them without saving them. They are NOT
 * silently mapped to unrelated schema columns.
 *
 *   - payment_failure_rate_pct
 *   - refund_rate_pct
 *
 * Note (setup): the persisted Stripe summary table is not yet
 * provisioned by an edge function. Until that lands, callers should
 * pass `null`; the mapper returns `no_summary`. See
 * docs/metrics-importers.md for the expected backend shape.
 */

import type { CustomerBusinessMetrics } from "./types";

/** Documented expected shape of the persisted Stripe summary. */
export interface StripePeriodSummary {
  gross_volume: number | null;
  net_volume: number | null;
  fees_total: number | null;
  refunds_total: number | null;
  disputes_total: number | null;
  successful_payment_count: number | null;
  failed_payment_count: number | null;
  period_start: string;
  period_end: string;
}

export type StripeReadinessReason =
  | "no_summary"
  | "supported"
  | "insufficient_volume"
  | "missing_required_fields"
  | "unsupported_schema";

export interface StripeDerivedIndicators {
  /** Computed when both failed and successful counts are present. */
  payment_failure_rate_pct: number | null;
  /** Computed when refunds_total > 0 and gross_volume > 0. */
  refund_rate_pct: number | null;
}

export interface StripeSnapshotResult {
  payload: Partial<CustomerBusinessMetrics>;
  readiness: StripeReadinessReason;
  confidence: "Confirmed" | "Estimated" | "Needs Verification";
  source: "stripe";
  notDerived: (keyof CustomerBusinessMetrics)[];
  /** Display-only signals; not written to client_business_metrics. */
  derivedIndicators: StripeDerivedIndicators;
}

/** Always intentionally NOT inferred from Stripe. */
const NOT_DERIVED: (keyof CustomerBusinessMetrics)[] = [
  "inventory_value",
  "dead_stock_value",
  "stockout_count",
  "vendor_cost_change_pct",
  "menu_margin_visible",
  "has_category_margin",
  "service_line_visibility",
  "jobs_completed",
  "jobs_completed_not_invoiced",
  "gross_margin_pct",
  "gross_margin_pct_restaurant",
  "food_cost_pct",
  "labor_cost_pct",
  "owner_is_bottleneck",
  "has_assigned_owners",
  "has_weekly_review",
  "uses_manual_spreadsheet",
  "cannabis_inventory_value",
  "cannabis_dead_stock_value",
  "cannabis_stockout_count",
  "cannabis_inventory_turnover",
  "cannabis_shrinkage_pct",
  "cannabis_gross_margin_pct",
  "cannabis_product_margin_visible",
  "cannabis_category_margin_visible",
  "cannabis_discount_impact_pct",
  "cannabis_promotion_impact_pct",
  "cannabis_vendor_cost_increase_pct",
  "cannabis_payment_reconciliation_gap",
  "cannabis_uses_manual_pos_workaround",
  "cannabis_has_daily_or_weekly_reporting",
];

function pctOrNull(numerator: number, denominator: number): number | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) return null;
  if (denominator <= 0) return null;
  const v = (numerator / denominator) * 100;
  if (!Number.isFinite(v)) return null;
  return Math.max(0, Math.min(100, Math.round(v * 10) / 10));
}

export function mapStripeSummaryToMetrics(
  summary: StripePeriodSummary | null,
): StripeSnapshotResult {
  const emptyIndicators: StripeDerivedIndicators = {
    payment_failure_rate_pct: null,
    refund_rate_pct: null,
  };

  if (!summary) {
    return {
      payload: {},
      readiness: "no_summary",
      confidence: "Needs Verification",
      source: "stripe",
      notDerived: NOT_DERIVED,
      derivedIndicators: emptyIndicators,
    };
  }

  const gross = Number(summary.gross_volume ?? 0);
  const net = Number(summary.net_volume ?? 0);
  const successCount = Number(summary.successful_payment_count ?? 0);
  const failCount = Number(summary.failed_payment_count ?? 0);
  const refunds = Number(summary.refunds_total ?? 0);

  const indicators: StripeDerivedIndicators = { ...emptyIndicators };
  if (successCount > 0 || failCount > 0) {
    indicators.payment_failure_rate_pct = pctOrNull(
      failCount,
      failCount + successCount,
    );
  }
  if (refunds > 0 && gross > 0) {
    indicators.refund_rate_pct = pctOrNull(refunds, gross);
  }

  if (gross <= 0 && net <= 0 && successCount <= 0) {
    return {
      payload: { primary_data_source: "Stripe" },
      readiness: "insufficient_volume",
      confidence: "Needs Verification",
      source: "stripe",
      notDerived: NOT_DERIVED,
      derivedIndicators: indicators,
    };
  }

  const payload: Partial<CustomerBusinessMetrics> = {
    primary_data_source: "Stripe",
  };

  // Average order value: only when payment count and a volume support it.
  const aovBasis = net > 0 ? net : gross;
  if (successCount > 0 && aovBasis > 0) {
    payload.average_order_value = Math.round((aovBasis / successCount) * 100) / 100;
  }

  const populatedCount = Object.values(payload).filter(
    (v) => v !== null && v !== undefined,
  ).length;
  const substantive = populatedCount - 1; // exclude primary_data_source
  const confidence: StripeSnapshotResult["confidence"] =
    substantive >= 2 ? "Confirmed" : substantive >= 1 ? "Estimated" : "Needs Verification";

  return {
    payload,
    readiness: "supported",
    confidence,
    source: "stripe",
    notDerived: NOT_DERIVED,
    derivedIndicators: indicators,
  };
}

export const STRIPE_NOT_DERIVED_FIELDS = NOT_DERIVED;