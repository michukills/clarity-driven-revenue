// P20.3 — Retail industry brain.

import type { Leak } from "@/lib/leakEngine/leakObject";
import type { BrainInput, BrainResult } from "../types";
import { makeLeak } from "./_helpers";

export function runRetailBrain(input: BrainInput): BrainResult {
  const d = input.industryData?.retail ?? {};
  const leaks: Leak[] = [];

  if (typeof d.deadStockValue === "number" && d.deadStockValue > 0) {
    leaks.push(
      makeLeak(input, {
        id: `retail:dead_inventory:${d.deadStockValue}`,
        type: "dead_inventory",
        category: "operations",
        gear: 3,
        severity: d.deadStockValue >= 10000 ? "high" : "medium",
        estimated_revenue_impact: d.deadStockValue,
        confidence: "Estimated",
        source: "manual",
        message: `~$${d.deadStockValue.toLocaleString("en-US")} in dead inventory tying up cash.`,
        recommended_fix: "Mark down or liquidate non-moving SKUs to free working capital.",
      }),
    );
  }

  if (typeof d.inventoryTurnover === "number" && d.inventoryTurnover < 4) {
    leaks.push(
      makeLeak(input, {
        id: "retail:slow_turnover",
        type: "slow_inventory_turnover",
        category: "operations",
        gear: 3,
        severity: "medium",
        estimated_revenue_impact: 0,
        confidence: "Estimated",
        source: "manual",
        message: `Inventory turnover at ${d.inventoryTurnover.toFixed(1)}x — below stable range.`,
        recommended_fix: "Cut reorder quantities on slow SKUs and double down on top sellers.",
      }),
    );
  }

  if (typeof d.stockoutCount === "number" && d.stockoutCount > 0) {
    leaks.push(
      makeLeak(input, {
        id: `retail:stockouts:${d.stockoutCount}`,
        type: "stockouts_on_profitable_items",
        category: "operations",
        gear: 3,
        severity: "high",
        estimated_revenue_impact: 0,
        confidence: "Confirmed",
        source: "manual",
        message: `${d.stockoutCount} stockouts in the current period.`,
        recommended_fix: "Set min/max reorder levels on top-margin SKUs this week.",
      }),
    );
  }

  if (typeof d.returnRatePct === "number" && d.returnRatePct > 0.08) {
    leaks.push(
      makeLeak(input, {
        id: "retail:high_returns",
        type: "high_return_rate",
        category: "retention",
        gear: 4,
        severity: "medium",
        estimated_revenue_impact: 0,
        confidence: "Estimated",
        source: "manual",
        message: `Return rate at ${(d.returnRatePct * 100).toFixed(0)}% — eating margin.`,
        recommended_fix: "Audit the top 3 returned SKUs and fix listing or quality issues.",
      }),
    );
  }

  if (d.hasCategoryMargin === false) {
    leaks.push(
      makeLeak(input, {
        id: "retail:no_category_margin",
        type: "no_category_margin_visibility",
        category: "financial_visibility",
        gear: 4,
        severity: "high",
        estimated_revenue_impact: 0,
        confidence: "Confirmed",
        source: "manual",
        message: "Margin by product category is not visible.",
        recommended_fix: "Tag every SKU to a category and run weekly margin-by-category review.",
      }),
    );
  }

  // P20.9 — High-sales low-margin SKUs
  if (typeof d.highSalesLowMarginCount === "number" && d.highSalesLowMarginCount > 0) {
    leaks.push(
      makeLeak(input, {
        id: `retail:high_sales_low_margin_products:${d.highSalesLowMarginCount}`,
        type: "high_sales_low_margin_products",
        category: "financial_visibility",
        gear: 4,
        severity: "medium",
        estimated_revenue_impact: 0,
        confidence: "Estimated",
        source: "manual",
        message: `${d.highSalesLowMarginCount} top-selling products have weak margin.`,
        recommended_fix:
          "Review high-sales low-margin products so revenue volume does not hide weak profit.",
      }),
    );
  }

  // P20.9 — Dead-stock cash tie-up (ratio of dead stock to inventory value)
  if (
    typeof d.deadStockValue === "number" &&
    typeof d.inventoryValue === "number" &&
    d.inventoryValue > 0
  ) {
    const ratio = d.deadStockValue / d.inventoryValue;
    if (ratio >= 0.15) {
      leaks.push(
        makeLeak(input, {
          id: `retail:dead_inventory_cash_tie_up:${Math.round(ratio * 100)}`,
          type: "dead_inventory_cash_tie_up",
          category: "financial_visibility",
          gear: 4,
          severity: ratio >= 0.3 ? "high" : "medium",
          estimated_revenue_impact: d.deadStockValue,
          confidence: "Estimated",
          source: "manual",
          message: `~${(ratio * 100).toFixed(0)}% of inventory value is tied up in dead stock.`,
          recommended_fix:
            "Create a dead-stock review cadence and stop reordering slow-moving inventory until margin is confirmed.",
        }),
      );
    }
  }

  return { brain: "retail", leaks };
}
