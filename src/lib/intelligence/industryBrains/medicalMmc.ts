// P20.4a — Cannabis / MMC industry brain.
//
// MMC = Medical + Recreational Marijuana / Cannabis / Dispensary retail.
// This is a regulated cannabis retail / inventory / margin business — NOT a
// healthcare practice. Do not add patient, claim, reimbursement, provider,
// appointment, or clinical signals to this brain.
//
// Behaves close to retail but stays separate because cannabis operations have
// regulated inventory sensitivity, vendor cost swings, discount/promo
// erosion risk, dead-stock risk, and cash/payment reconciliation friction.

import type { Leak } from "@/lib/leakEngine/leakObject";
import type { BrainInput, BrainResult } from "../types";
import { makeLeak } from "./_helpers";

export function runCannabisBrain(input: BrainInput): BrainResult {
  const d = input.industryData?.cannabis ?? {};
  const leaks: Leak[] = [];

  // High sales / weak margin
  if (typeof d.grossMarginPct === "number" && d.grossMarginPct < 0.45) {
    leaks.push(
      makeLeak(input, {
        id: `cannabis:high_sales_weak_margin:${Math.round(d.grossMarginPct * 100)}`,
        type: "high_sales_weak_margin",
        category: "financial_visibility",
        gear: 4,
        severity: d.grossMarginPct < 0.35 ? "high" : "medium",
        estimated_revenue_impact: 0,
        confidence: "Estimated",
        source: "manual",
        message: `Gross margin at ${(d.grossMarginPct * 100).toFixed(0)}% — below stable range for cannabis retail.`,
        recommended_fix:
          "Track margin by product category weekly so high sales do not hide weak profit.",
      }),
    );
  }

  // Dead stock
  if (typeof d.deadStockValue === "number" && d.deadStockValue > 0) {
    leaks.push(
      makeLeak(input, {
        id: `cannabis:dead_inventory:${d.deadStockValue}`,
        type: "dead_inventory",
        category: "operations",
        gear: 3,
        severity: d.deadStockValue >= 10000 ? "high" : "medium",
        estimated_revenue_impact: d.deadStockValue,
        confidence: "Estimated",
        source: "manual",
        message: `~$${d.deadStockValue.toLocaleString("en-US")} in dead/slow-moving cannabis inventory.`,
        recommended_fix:
          "Review dead stock and slow-moving inventory every week before reordering.",
      }),
    );
  }

  // Stockout on profitable product
  if (typeof d.stockoutCount === "number" && d.stockoutCount > 0) {
    leaks.push(
      makeLeak(input, {
        id: `cannabis:stockout_on_profitable_product:${d.stockoutCount}`,
        type: "stockout_on_profitable_product",
        category: "operations",
        gear: 3,
        severity: "high",
        estimated_revenue_impact: 0,
        confidence: "Confirmed",
        source: "manual",
        message: `${d.stockoutCount} stockouts on tracked products this period.`,
        recommended_fix:
          "Flag stockouts on high-margin products before they become lost revenue.",
      }),
    );
  }

  // Inventory turnover signal
  if (typeof d.inventoryTurnover === "number" && d.inventoryTurnover < 4) {
    leaks.push(
      makeLeak(input, {
        id: "cannabis:cash_tied_up_in_slow_stock",
        type: "cash_tied_up_in_slow_stock",
        category: "financial_visibility",
        gear: 4,
        severity: "medium",
        estimated_revenue_impact: d.cashTiedUpInSlowStock ?? 0,
        confidence: "Estimated",
        source: "manual",
        message: `Inventory turnover at ${d.inventoryTurnover.toFixed(1)}x — cash tied up in slow stock.`,
        recommended_fix:
          "Cut reorder quantities on slow SKUs and reinvest cash into top sellers.",
      }),
    );
  }

  // Discount erosion
  if (typeof d.discountImpactPct === "number" && d.discountImpactPct > 0.1) {
    leaks.push(
      makeLeak(input, {
        id: "cannabis:discount_eroding_margin",
        type: "discount_eroding_margin",
        category: "financial_visibility",
        gear: 4,
        severity: d.discountImpactPct > 0.2 ? "high" : "medium",
        estimated_revenue_impact: 0,
        confidence: "Estimated",
        source: "manual",
        message: `Discounts reducing margin by ~${(d.discountImpactPct * 100).toFixed(0)}%.`,
        recommended_fix:
          "Review discount impact so promotions do not erase gross margin.",
      }),
    );
  }

  // Promotion erosion
  if (typeof d.promotionImpactPct === "number" && d.promotionImpactPct > 0.1) {
    leaks.push(
      makeLeak(input, {
        id: "cannabis:promotion_eroding_margin",
        type: "promotion_eroding_margin",
        category: "financial_visibility",
        gear: 4,
        severity: "medium",
        estimated_revenue_impact: 0,
        confidence: "Estimated",
        source: "manual",
        message: `Promotions reducing margin by ~${(d.promotionImpactPct * 100).toFixed(0)}%.`,
        recommended_fix:
          "Measure promotion effectiveness against margin before repeating campaigns.",
      }),
    );
  }

  // Vendor cost change not reflected in pricing
  if (typeof d.vendorCostIncreasePct === "number" && d.vendorCostIncreasePct > 0.05) {
    leaks.push(
      makeLeak(input, {
        id: "cannabis:vendor_cost_increase_not_reflected",
        type: "vendor_cost_increase_not_reflected",
        category: "financial_visibility",
        gear: 4,
        severity: "medium",
        estimated_revenue_impact: 0,
        confidence: "Estimated",
        source: "manual",
        message: `Vendor costs up ~${(d.vendorCostIncreasePct * 100).toFixed(0)}% — pricing may not reflect this.`,
        recommended_fix:
          "Compare vendor cost changes against current pricing before promotions are approved.",
      }),
    );
  }

  // Category margin visibility
  if (d.categoryMarginVisible === false) {
    leaks.push(
      makeLeak(input, {
        id: "cannabis:no_category_margin_tracking",
        type: "no_category_margin_tracking",
        category: "financial_visibility",
        gear: 4,
        severity: "high",
        estimated_revenue_impact: 0,
        confidence: "Confirmed",
        source: "manual",
        message: "Margin by product category is not visible.",
        recommended_fix:
          "Tag every SKU to a category and run a weekly margin-by-category review.",
      }),
    );
  }

  // Product margin visibility
  if (d.productMarginVisible === false) {
    leaks.push(
      makeLeak(input, {
        id: "cannabis:no_product_margin_tracking",
        type: "no_product_margin_tracking",
        category: "financial_visibility",
        gear: 4,
        severity: "medium",
        estimated_revenue_impact: 0,
        confidence: "Confirmed",
        source: "manual",
        message: "Margin by product is not visible.",
        recommended_fix:
          "Reconcile COGS to each SKU so product margin is visible weekly.",
      }),
    );
  }

  // Shrinkage / waste tracking
  if (typeof d.shrinkagePct === "number" && d.shrinkagePct > 0.02) {
    leaks.push(
      makeLeak(input, {
        id: "cannabis:shrinkage_or_waste_not_tracked",
        type: "shrinkage_or_waste_not_tracked",
        category: "operations",
        gear: 3,
        severity: d.shrinkagePct > 0.05 ? "high" : "medium",
        estimated_revenue_impact: 0,
        confidence: "Estimated",
        source: "manual",
        message: `Shrinkage/waste at ~${(d.shrinkagePct * 100).toFixed(1)}% — investigate inventory variance.`,
        recommended_fix:
          "Reconcile compliance-safe inventory movement weekly and document variance causes.",
      }),
    );
  }

  // High-revenue low-margin products
  if (typeof d.highSalesLowMarginCount === "number" && d.highSalesLowMarginCount > 0) {
    leaks.push(
      makeLeak(input, {
        id: `cannabis:high_revenue_low_margin_products:${d.highSalesLowMarginCount}`,
        type: "cannabis_high_sales_low_margin_products",
        category: "financial_visibility",
        gear: 4,
        severity: "medium",
        estimated_revenue_impact: 0,
        confidence: "Estimated",
        source: "manual",
        message: `${d.highSalesLowMarginCount} top-selling cannabis products have weak margin.`,
        recommended_fix:
          "Review high-sales low-margin cannabis products by category before approving promotions or reorders.",
      }),
    );
  }

  // P20.9 — Dead stock as ratio of cannabis inventory value
  if (
    typeof d.deadStockValue === "number" &&
    typeof d.inventoryValue === "number" &&
    d.inventoryValue > 0
  ) {
    const ratio = d.deadStockValue / d.inventoryValue;
    if (ratio >= 0.15) {
      leaks.push(
        makeLeak(input, {
          id: `cannabis:dead_stock_cash_tie_up:${Math.round(ratio * 100)}`,
          type: "cannabis_dead_stock_cash_tie_up",
          category: "financial_visibility",
          gear: 4,
          severity: ratio >= 0.3 ? "high" : "medium",
          estimated_revenue_impact: d.deadStockValue,
          confidence: "Estimated",
          source: "manual",
          message: `~${(ratio * 100).toFixed(0)}% of cannabis inventory value is in dead/slow stock.`,
          recommended_fix:
            "Run a weekly cannabis inventory aging review so cash is not trapped in slow-moving products.",
        }),
      );
    }
  }

  // P20.9 — Vendor cost increase combined with discount/promotion erosion
  if (
    typeof d.vendorCostIncreasePct === "number" &&
    d.vendorCostIncreasePct >= 0.05 &&
    ((typeof d.discountImpactPct === "number" && d.discountImpactPct >= 0.1) ||
      (typeof d.promotionImpactPct === "number" && d.promotionImpactPct >= 0.1))
  ) {
    leaks.push(
      makeLeak(input, {
        id: "cannabis:vendor_discount_margin_squeeze",
        type: "cannabis_vendor_discount_margin_squeeze",
        category: "financial_visibility",
        gear: 4,
        severity: "high",
        estimated_revenue_impact: 0,
        confidence: "Estimated",
        source: "manual",
        message:
          "Vendor costs are rising while discounts/promotions are eroding cannabis margin.",
        recommended_fix:
          "Compare vendor cost increases against discounts and promotions before approving cannabis category pricing.",
      }),
    );
  }

  // Reporting rhythm
  if (d.hasDailyOrWeeklyReporting === false) {
    leaks.push(
      makeLeak(input, {
        id: "cannabis:no_daily_or_weekly_reporting_rhythm",
        type: "no_daily_or_weekly_reporting_rhythm",
        category: "operations",
        gear: 4,
        severity: "medium",
        estimated_revenue_impact: 0,
        confidence: "Confirmed",
        source: "manual",
        message: "No daily or weekly sales-to-margin reporting rhythm in place.",
        recommended_fix:
          "Establish a daily sales-to-margin control rhythm with a weekly category review.",
      }),
    );
  }

  // Manual POS / spreadsheet workaround
  if (d.usesManualPosWorkaround === true) {
    leaks.push(
      makeLeak(input, {
        id: "cannabis:manual_pos_or_spreadsheet_workaround",
        type: "manual_pos_or_spreadsheet_workaround",
        category: "operations",
        gear: 3,
        severity: "medium",
        estimated_revenue_impact: 0,
        confidence: "Confirmed",
        source: "manual",
        message: "Operations rely on manual POS exports or spreadsheets for core reporting.",
        recommended_fix:
          "Move sales/inventory to a tracked POS or QuickBooks import discipline.",
      }),
    );
  }

  // Payment reconciliation gap (cash/payment visibility)
  if (d.paymentReconciliationGap === true) {
    leaks.push(
      makeLeak(input, {
        id: "cannabis:payment_reconciliation_gap",
        type: "payment_reconciliation_gap",
        category: "financial_visibility",
        gear: 4,
        severity: "high",
        estimated_revenue_impact: 0,
        confidence: "Confirmed",
        source: "manual",
        message: "Cash and payment totals do not reconcile to recorded sales.",
        recommended_fix:
          "Add a daily payment reconciliation step before close-of-day reporting.",
      }),
    );
  }

  return { brain: "mmj_cannabis", leaks };
}

// Backwards-compatible alias for the previous import name (P20.3 wiring).
// Marked deprecated — prefer runCannabisBrain in new code.
/** @deprecated Use runCannabisBrain. Kept for P20.3 import compatibility. */
export const runMedicalBrain = runCannabisBrain;
