/**
 * P20.12 — Square → client_business_metrics snapshot mapper.
 *
 * Pure function. Takes a server-persisted Square period summary row and
 * returns ONLY the metrics fields Square sales data can safely support
 * for the given industry.
 *
 * Hard rules (parallel to QuickBooks mapper):
 *   - We never invent values. Missing inputs → undefined on output.
 *   - We never derive inventory, dead stock, stockouts, vendor cost
 *     changes, menu / product / category margin visibility, payment
 *     reconciliation, owner independence, or any cannabis compliance
 *     field that isn't directly proven by the summary.
 *   - Tokens are NOT touched here. This module only consumes a summary
 *     row that the backend has already persisted.
 *
 * Note (setup): the persisted Square summary table is not yet provisioned
 * by an edge function. Until that lands, callers should pass `null` and
 * the mapper returns `no_summary`. See docs/metrics-importers.md for the
 * expected backend shape.
 *
 * No AI. No network calls. Fully testable.
 */

import type { CustomerBusinessMetrics } from "./types";
import type { IndustryCategory } from "@/lib/priorityEngine/types";

/** Documented expected shape of the persisted Square summary. */
export interface SquarePeriodSummary {
  gross_sales: number | null;
  net_sales: number | null;
  discounts_total: number | null;
  refunds_total: number | null;
  tips_total: number | null;
  tax_total: number | null;
  transaction_count: number | null;
  /** Optional — if present, used for `daily_sales`. */
  day_count: number | null;
  /**
   * Optional — true only if the persisted summary explicitly proves
   * recurring period reporting (e.g., a continuous daily roll-up). If
   * unknown, leave null upstream.
   */
  has_recurring_period_reporting: boolean | null;
  period_start: string;
  period_end: string;
}

export type SquareReadinessReason =
  | "no_summary"
  | "supported"
  | "insufficient_volume"
  | "missing_required_fields"
  | "unsupported_schema";

export interface SquareSnapshotResult {
  payload: Partial<CustomerBusinessMetrics>;
  readiness: SquareReadinessReason;
  confidence: "Confirmed" | "Estimated" | "Needs Verification";
  source: "square";
  notDerived: (keyof CustomerBusinessMetrics)[];
}

/** Always intentionally NOT inferred from Square. */
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
  "food_cost_pct",
  "labor_cost_pct",
  "cannabis_inventory_value",
  "cannabis_dead_stock_value",
  "cannabis_stockout_count",
  "cannabis_inventory_turnover",
  "cannabis_shrinkage_pct",
  "cannabis_gross_margin_pct",
  "cannabis_product_margin_visible",
  "cannabis_category_margin_visible",
  "cannabis_vendor_cost_increase_pct",
  "cannabis_payment_reconciliation_gap",
  "cannabis_uses_manual_pos_workaround",
];

function moneyOrNull(v: number | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  if (!Number.isFinite(v) || v < 0) return null;
  return Math.round(v);
}

function pctOrNull(numerator: number, denominator: number): number | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) return null;
  if (denominator <= 0) return null;
  const v = (numerator / denominator) * 100;
  if (!Number.isFinite(v)) return null;
  return Math.max(0, Math.min(100, Math.round(v * 10) / 10));
}

export function mapSquareSummaryToMetrics(
  summary: SquarePeriodSummary | null,
  industry: IndustryCategory,
): SquareSnapshotResult {
  if (!summary) {
    return {
      payload: {},
      readiness: "no_summary",
      confidence: "Needs Verification",
      source: "square",
      notDerived: NOT_DERIVED,
    };
  }

  const gross = Number(summary.gross_sales ?? 0);
  const net = Number(summary.net_sales ?? 0);
  const txn = Number(summary.transaction_count ?? 0);
  const discounts = Number(summary.discounts_total ?? 0);
  const dayCount = Number(summary.day_count ?? 0);

  if (gross <= 0 && net <= 0 && txn <= 0) {
    return {
      payload: { primary_data_source: "Square" },
      readiness: "insufficient_volume",
      confidence: "Needs Verification",
      source: "square",
      notDerived: NOT_DERIVED,
    };
  }

  const payload: Partial<CustomerBusinessMetrics> = {
    primary_data_source: "Square",
  };

  // Average ticket: only when txn count and a sales total support it.
  const ticketBasis = net > 0 ? net : gross;
  if (txn > 0 && ticketBasis > 0) {
    payload.average_ticket = Math.round((ticketBasis / txn) * 100) / 100;
  }

  // Daily sales: only when day_count is explicitly provided.
  if (dayCount > 0 && ticketBasis > 0) {
    const daily = moneyOrNull(ticketBasis / dayCount);
    if (daily !== null) payload.daily_sales = daily;
  }

  // Discount impact (cannabis-only field exists in schema). Only set
  // for cannabis when discounts and a sales total support it.
  if (industry === "mmj_cannabis" && discounts > 0 && (gross > 0 || net > 0)) {
    const basis = gross > 0 ? gross : net + discounts;
    const pct = pctOrNull(discounts, basis);
    if (pct !== null) payload.cannabis_discount_impact_pct = pct;
  }

  // Recurring period reporting flag: only set when the source explicitly
  // proves it. Cannabis schema has the dedicated field; never infer for
  // other industries.
  if (
    industry === "mmj_cannabis" &&
    summary.has_recurring_period_reporting === true
  ) {
    payload.cannabis_has_daily_or_weekly_reporting = true;
  }

  const populatedCount = Object.values(payload).filter(
    (v) => v !== null && v !== undefined,
  ).length;

  // primary_data_source counts as 1; demand at least 2 substantive fields
  // beyond it for "Confirmed".
  const substantive = populatedCount - 1;
  const confidence: SquareSnapshotResult["confidence"] =
    substantive >= 2 ? "Confirmed" : substantive >= 1 ? "Estimated" : "Needs Verification";

  return {
    payload,
    readiness: "supported",
    confidence,
    source: "square",
    notDerived: NOT_DERIVED,
  };
}

export const SQUARE_NOT_DERIVED_FIELDS = NOT_DERIVED;