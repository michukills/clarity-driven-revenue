// P20.3 — Restaurants industry brain.

import type { Leak } from "@/lib/leakEngine/leakObject";
import type { BrainInput, BrainResult } from "../types";
import { makeLeak } from "./_helpers";

export function runRestaurantBrain(input: BrainInput): BrainResult {
  const d = input.industryData?.restaurant ?? {};
  const leaks: Leak[] = [];

  if (typeof d.foodCostPct === "number" && d.foodCostPct > 0.33) {
    leaks.push(
      makeLeak(input, {
        id: "restaurant:food_cost_creep",
        type: "food_cost_creep",
        category: "financial_visibility",
        gear: 4,
        severity: d.foodCostPct > 0.4 ? "high" : "medium",
        estimated_revenue_impact: 0,
        confidence: "Estimated",
        source: "manual",
        message: `Food cost at ${(d.foodCostPct * 100).toFixed(0)}% — above target.`,
        recommended_fix: "Audit top 5 menu items by margin and renegotiate the largest vendor cost line.",
      }),
    );
  }

  if (typeof d.laborCostPct === "number" && d.laborCostPct > 0.32) {
    leaks.push(
      makeLeak(input, {
        id: "restaurant:labor_out_of_control",
        type: "labor_out_of_control",
        category: "operations",
        gear: 3,
        severity: d.laborCostPct > 0.4 ? "high" : "medium",
        estimated_revenue_impact: 0,
        confidence: "Estimated",
        source: "manual",
        message: `Labor at ${(d.laborCostPct * 100).toFixed(0)}% — above stable range.`,
        recommended_fix: "Set a daily labor cap by daypart and review schedule weekly.",
      }),
    );
  }

  if (typeof d.grossMarginPct === "number" && d.grossMarginPct < 0.6) {
    leaks.push(
      makeLeak(input, {
        id: "restaurant:high_sales_weak_margin",
        type: "high_sales_weak_margin",
        category: "financial_visibility",
        gear: 4,
        severity: "high",
        estimated_revenue_impact: 0,
        confidence: "Estimated",
        source: "manual",
        message: "High sales but weak gross margin.",
        recommended_fix: "Run a menu-mix analysis and reprice or remove bottom-margin items.",
      }),
    );
  }

  if (d.tracksWaste === false) {
    leaks.push(
      makeLeak(input, {
        id: "restaurant:waste_not_tracked",
        type: "waste_not_tracked",
        category: "operations",
        gear: 3,
        severity: "medium",
        estimated_revenue_impact: 0,
        confidence: "Confirmed",
        source: "manual",
        message: "Waste and spoilage are not tracked.",
        recommended_fix: "Log daily waste for 14 days to expose hidden food cost.",
      }),
    );
  }

  if (d.hasDailyReporting === false) {
    leaks.push(
      makeLeak(input, {
        id: "restaurant:no_daily_reporting",
        type: "no_daily_reporting",
        category: "operations",
        gear: 4,
        severity: "medium",
        estimated_revenue_impact: 0,
        confidence: "Confirmed",
        source: "manual",
        message: "No daily sales / cost reporting rhythm.",
        recommended_fix: "Establish a 5-minute end-of-day sales + cost report.",
      }),
    );
  }

  return { brain: "restaurant", leaks };
}
