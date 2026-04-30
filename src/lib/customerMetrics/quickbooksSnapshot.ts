/**
 * P20.11 — QuickBooks → client_business_metrics snapshot mapper.
 *
 * Pure function. Takes a `quickbooks_period_summaries` row (already
 * persisted server-side by the `qb-sync` edge function) and returns
 * ONLY the metrics fields QuickBooks can safely support for the given
 * industry.
 *
 * Hard rules:
 *   - We never invent values. Missing inputs → null on output.
 *   - We never derive stockouts, dead stock, menu margin, service-line
 *     visibility, job completion, jobs-not-invoiced, cannabis
 *     compliance, or cannabis stockouts from QuickBooks alone.
 *   - The snapshot may be combined with other sources later but here
 *     it carries only QB-supported fields.
 *   - Tokens are NOT touched here. This module reads from a summary
 *     row that the server-side function has already written.
 *
 * No AI. No network calls. Fully testable.
 */

import type { CustomerBusinessMetrics } from "./types";
import type { IndustryCategory } from "@/lib/priorityEngine/types";

/**
 * Shape of the input summary. We only depend on numeric fields that
 * `qb-sync` is known to populate (revenue/expense totals + open
 * invoices + AR/AP totals).
 */
export interface QuickBooksPeriodSummary {
  revenue_total: number | null;
  expense_total: number | null;
  open_invoices_total: number | null;
  open_invoices_count: number | null;
  ar_total: number | null;
  ap_total: number | null;
  period_start: string;
  period_end: string;
}

export type QbReadinessReason =
  | "no_summary"
  | "no_revenue"
  | "no_cogs_mapping"
  | "no_inventory_mapping"
  | "supported";

export interface QbSnapshotResult {
  /** Subset of metric fields safely populated from QuickBooks. */
  payload: Partial<CustomerBusinessMetrics>;
  /** Display reason for how complete the snapshot is. */
  readiness: QbReadinessReason;
  /** Recommended confidence to write alongside this payload. */
  confidence: "Confirmed" | "Estimated" | "Needs Verification";
  /** Recommended source label. */
  source: "quickbooks";
  /** Field keys we explicitly chose NOT to derive from QuickBooks. */
  notDerived: (keyof CustomerBusinessMetrics)[];
}

function pctOrNull(numerator: number, denominator: number): number | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) return null;
  if (denominator <= 0) return null;
  const v = (numerator / denominator) * 100;
  if (!Number.isFinite(v)) return null;
  // clamp to a sane range
  return Math.max(-100, Math.min(100, Math.round(v * 10) / 10));
}

function moneyOrNull(v: number | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  if (!Number.isFinite(v) || v < 0) return null;
  return Math.round(v);
}

/** Always intentionally NOT inferred from QuickBooks. */
const NOT_DERIVED: (keyof CustomerBusinessMetrics)[] = [
  "stockout_count",
  "menu_margin_visible",
  "service_line_visibility",
  "jobs_completed",
  "jobs_completed_not_invoiced",
  "cannabis_stockout_count",
  "cannabis_payment_reconciliation_gap",
  "cannabis_product_margin_visible",
  "cannabis_category_margin_visible",
  "cannabis_uses_manual_pos_workaround",
  "cannabis_has_daily_or_weekly_reporting",
  "cannabis_discount_impact_pct",
  "cannabis_promotion_impact_pct",
];

export function mapQuickBooksSummaryToMetrics(
  summary: QuickBooksPeriodSummary | null,
  industry: IndustryCategory,
): QbSnapshotResult {
  if (!summary) {
    return {
      payload: {},
      readiness: "no_summary",
      confidence: "Needs Verification",
      source: "quickbooks",
      notDerived: NOT_DERIVED,
    };
  }

  const revenue = Number(summary.revenue_total ?? 0);
  const expense = Number(summary.expense_total ?? 0);
  const grossMarginPct =
    revenue > 0 ? pctOrNull(revenue - expense, revenue) : null;
  const unpaid = moneyOrNull(summary.open_invoices_total ?? summary.ar_total);

  const payload: Partial<CustomerBusinessMetrics> = {
    primary_data_source: "QuickBooks",
    profit_visible: revenue > 0 ? true : null,
  };

  switch (industry) {
    case "trade_field_service": {
      if (unpaid !== null) payload.unpaid_invoice_amount = unpaid;
      if (grossMarginPct !== null) payload.gross_margin_pct = grossMarginPct;
      break;
    }
    case "restaurant": {
      if (grossMarginPct !== null) payload.gross_margin_pct_restaurant = grossMarginPct;
      // daily_sales requires per-day data which qb-sync does NOT
      // currently produce — leave null. food_cost_pct / labor_cost_pct
      // require account mapping we don't yet support — leave null.
      break;
    }
    case "retail": {
      if (grossMarginPct !== null) payload.gross_margin_pct = grossMarginPct;
      // inventory_value requires inventory tracking + account mapping
      // we don't yet pull — leave null. dead_stock_value requires
      // aging data we don't pull — leave null.
      break;
    }
    case "mmj_cannabis": {
      if (grossMarginPct !== null) payload.cannabis_gross_margin_pct = grossMarginPct;
      // cannabis_inventory_value, cannabis_vendor_cost_increase_pct
      // require additional mapping that QuickBooks alone cannot prove
      // for this industry — leave null.
      break;
    }
    default: {
      if (grossMarginPct !== null) payload.gross_margin_pct = grossMarginPct;
      break;
    }
  }

  // Decide readiness/confidence based on what we actually populated.
  if (revenue <= 0) {
    return {
      payload,
      readiness: "no_revenue",
      confidence: "Needs Verification",
      source: "quickbooks",
      notDerived: NOT_DERIVED,
    };
  }

  const populatedCount = Object.values(payload).filter(
    (v) => v !== null && v !== undefined,
  ).length;
  const confidence: QbSnapshotResult["confidence"] =
    populatedCount >= 3 ? "Confirmed" : "Estimated";

  return {
    payload,
    readiness: "supported",
    confidence,
    source: "quickbooks",
    notDerived: NOT_DERIVED,
  };
}

export const QB_NOT_DERIVED_FIELDS = NOT_DERIVED;