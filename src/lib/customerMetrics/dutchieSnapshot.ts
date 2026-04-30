/**
 * P20.14 — Dutchie → client_business_metrics snapshot mapper.
 *
 * Pure function. Takes a server-persisted Dutchie period summary row and
 * returns ONLY the metrics fields Dutchie cannabis-retail data can safely
 * support for the given industry.
 *
 * Cannabis/MMC scope guard: Dutchie is treated strictly as cannabis
 * retail / POS / operations data. This mapper only produces retail and
 * inventory-style fields. Tests assert that no healthcare-style
 * terminology leaks into outputs, labels, or this source file.
 *
 * Hard rules (parallel to Square/Stripe mappers):
 *   - We never invent values. Missing inputs → undefined on output.
 *   - We never derive compliance status, gross margin (unless the
 *     summary directly proves margin visibility), owner independence,
 *     staff process quality, or any accounting value not present in
 *     the persisted summary.
 *   - Tokens are NOT touched here. This module only consumes a summary
 *     row that the backend has already persisted.
 *
 * No AI. No network calls. Fully testable.
 */

import type { CustomerBusinessMetrics } from "./types";
import type { IndustryCategory } from "@/lib/priorityEngine/types";

/** Documented expected shape of the persisted Dutchie summary. */
export interface DutchiePeriodSummary {
  gross_sales: number | null;
  net_sales: number | null;
  discounts_total: number | null;
  promotions_total: number | null;
  transaction_count: number | null;
  /** Optional — if present and > 0 used for `daily_sales`. */
  day_count?: number | null;
  average_ticket: number | null;
  product_sales_total: number | null;
  category_sales_total: number | null;
  inventory_value: number | null;
  dead_stock_value: number | null;
  stockout_count: number | null;
  inventory_turnover: number | null;
  shrinkage_pct: number | null;
  payment_reconciliation_gap: boolean | null;
  /** True only if the persisted summary explicitly proves recurring reporting. */
  has_recurring_period_reporting: boolean | null;
  /** True only if the persisted summary explicitly proves margin visibility. */
  product_margin_visible: boolean | null;
  category_margin_visible: boolean | null;
  period_start: string;
  period_end: string;
}

export type DutchieReadinessReason =
  | "no_summary"
  | "supported"
  | "insufficient_volume"
  | "missing_required_fields"
  | "unsupported_schema"
  | "industry_mismatch";

export interface DutchieSnapshotResult {
  payload: Partial<CustomerBusinessMetrics>;
  readiness: DutchieReadinessReason;
  confidence: "Confirmed" | "Estimated" | "Needs Verification";
  source: "dutchie";
  notDerived: (keyof CustomerBusinessMetrics)[];
}

/** Always intentionally NOT inferred from Dutchie. */
const NOT_DERIVED: (keyof CustomerBusinessMetrics)[] = [
  // Generic accounting / non-cannabis margin
  "gross_margin_pct",
  "food_cost_pct",
  "labor_cost_pct",
  "vendor_cost_change_pct",
  "menu_margin_visible",
  "has_category_margin",
  "service_line_visibility",
  "jobs_completed",
  "jobs_completed_not_invoiced",
  // Cannabis fields we never infer (must be directly proven by summary)
  "cannabis_gross_margin_pct",
  "cannabis_vendor_cost_increase_pct",
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

function clampPct(v: number | null | undefined): number | null {
  if (v === null || v === undefined || !Number.isFinite(v)) return null;
  return Math.max(0, Math.min(100, Math.round(v * 10) / 10));
}

function intOrNull(v: number | null | undefined): number | null {
  if (v === null || v === undefined || !Number.isFinite(v) || v < 0) return null;
  return Math.trunc(v);
}

function turnoverOrNull(v: number | null | undefined): number | null {
  if (v === null || v === undefined || !Number.isFinite(v) || v < 0) return null;
  return Math.round(v * 100) / 100;
}

export function mapDutchieSummaryToMetrics(
  summary: DutchiePeriodSummary | null,
  industry: IndustryCategory,
): DutchieSnapshotResult {
  if (!summary) {
    return {
      payload: {},
      readiness: "no_summary",
      confidence: "Needs Verification",
      source: "dutchie",
      notDerived: NOT_DERIVED,
    };
  }

  // Dutchie is cannabis-only. If the customer industry isn't cannabis,
  // return an empty payload with a clear readiness reason. We still set
  // primary_data_source so the admin knows where the call came from.
  const isCannabis = industry === "mmj_cannabis";

  const gross = Number(summary.gross_sales ?? 0);
  const net = Number(summary.net_sales ?? 0);
  const txn = Number(summary.transaction_count ?? 0);
  const discounts = Number(summary.discounts_total ?? 0);
  const promotions = Number(summary.promotions_total ?? 0);
  const dayCount = Number(summary.day_count ?? 0);
  const ticketBasis = net > 0 ? net : gross;

  if (!isCannabis) {
    return {
      payload: { primary_data_source: "Dutchie" },
      readiness: "industry_mismatch",
      confidence: "Needs Verification",
      source: "dutchie",
      notDerived: NOT_DERIVED,
    };
  }

  if (ticketBasis <= 0 && txn <= 0) {
    return {
      payload: { primary_data_source: "Dutchie" },
      readiness: "insufficient_volume",
      confidence: "Needs Verification",
      source: "dutchie",
      notDerived: NOT_DERIVED,
    };
  }

  const payload: Partial<CustomerBusinessMetrics> = {
    primary_data_source: "Dutchie",
  };

  // Average ticket: prefer explicit value, else derive from txn + sales.
  if (summary.average_ticket !== null && summary.average_ticket !== undefined && summary.average_ticket > 0) {
    payload.average_ticket = Math.round(summary.average_ticket * 100) / 100;
  } else if (txn > 0 && ticketBasis > 0) {
    payload.average_ticket = Math.round((ticketBasis / txn) * 100) / 100;
  }

  // Daily sales: only when day_count is explicitly provided.
  if (dayCount > 0 && ticketBasis > 0) {
    const daily = moneyOrNull(ticketBasis / dayCount);
    if (daily !== null) payload.daily_sales = daily;
  }

  // ---- Cannabis-only fields (only when directly supported) ----

  // Discount impact %.
  if (discounts > 0 && (gross > 0 || net > 0)) {
    const basis = gross > 0 ? gross : net + discounts;
    const pct = pctOrNull(discounts, basis);
    if (pct !== null) payload.cannabis_discount_impact_pct = pct;
  }

  // Promotion impact %.
  if (promotions > 0 && (gross > 0 || net > 0)) {
    const basis = gross > 0 ? gross : net + promotions;
    const pct = pctOrNull(promotions, basis);
    if (pct !== null) payload.cannabis_promotion_impact_pct = pct;
  }

  // Inventory value.
  const invVal = moneyOrNull(summary.inventory_value);
  if (invVal !== null) payload.cannabis_inventory_value = invVal;

  // Dead stock value.
  const deadVal = moneyOrNull(summary.dead_stock_value);
  if (deadVal !== null) payload.cannabis_dead_stock_value = deadVal;

  // Stockout count.
  const stockouts = intOrNull(summary.stockout_count);
  if (stockouts !== null) payload.cannabis_stockout_count = stockouts;

  // Inventory turnover.
  const turnover = turnoverOrNull(summary.inventory_turnover);
  if (turnover !== null) payload.cannabis_inventory_turnover = turnover;

  // Shrinkage %.
  const shrink = clampPct(summary.shrinkage_pct);
  if (shrink !== null) payload.cannabis_shrinkage_pct = shrink;

  // Payment reconciliation gap.
  if (summary.payment_reconciliation_gap === true || summary.payment_reconciliation_gap === false) {
    payload.cannabis_payment_reconciliation_gap = summary.payment_reconciliation_gap;
  }

  // Recurring period reporting flag.
  if (summary.has_recurring_period_reporting === true) {
    payload.cannabis_has_daily_or_weekly_reporting = true;
  }

  // Margin visibility flags — only when explicitly proven.
  if (summary.product_margin_visible === true || summary.product_margin_visible === false) {
    payload.cannabis_product_margin_visible = summary.product_margin_visible;
  }
  if (summary.category_margin_visible === true || summary.category_margin_visible === false) {
    payload.cannabis_category_margin_visible = summary.category_margin_visible;
  }

  const populatedCount = Object.values(payload).filter(
    (v) => v !== null && v !== undefined,
  ).length;

  // primary_data_source counts as 1; demand at least 2 substantive fields beyond it for "Confirmed".
  const substantive = populatedCount - 1;
  const confidence: DutchieSnapshotResult["confidence"] =
    substantive >= 2 ? "Confirmed" : substantive >= 1 ? "Estimated" : "Needs Verification";

  return {
    payload,
    readiness: "supported",
    confidence,
    source: "dutchie",
    notDerived: NOT_DERIVED,
  };
}

export const DUTCHIE_NOT_DERIVED_FIELDS = NOT_DERIVED;