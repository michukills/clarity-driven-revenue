// P20.8 — Mapping tests for industryDataFromMetrics() + brain integration.
// Pure / deterministic. No DB. No network.

import { describe, it, expect } from "vitest";
import { industryDataFromMetrics } from "@/lib/intelligence/customerContext";
import { runTradesBrain } from "@/lib/intelligence/industryBrains/tradesServices";
import { runRestaurantBrain } from "@/lib/intelligence/industryBrains/restaurants";
import { runRetailBrain } from "@/lib/intelligence/industryBrains/retail";
import { runCannabisBrain } from "@/lib/intelligence/industryBrains/medicalMmc";
import { runGeneralBrain } from "@/lib/intelligence/generalBrain";
import type { CustomerBusinessMetrics } from "@/lib/customerMetrics/types";

function base(extra: Partial<CustomerBusinessMetrics>): CustomerBusinessMetrics {
  return {
    id: "m1",
    customer_id: "c1",
    industry: "general_service",
    metric_period_start: null,
    metric_period_end: null,
    source: "manual",
    confidence: "Estimated",
    has_weekly_review: null,
    has_assigned_owners: null,
    owner_is_bottleneck: null,
    uses_manual_spreadsheet: null,
    profit_visible: null,
    source_attribution_visible: null,
    review_cadence: null,
    primary_data_source: null,
    estimates_sent: null,
    estimates_unsent: null,
    follow_up_backlog: null,
    jobs_completed: null,
    jobs_completed_not_invoiced: null,
    gross_margin_pct: null,
    has_job_costing: null,
    service_line_visibility: null,
    unpaid_invoice_amount: null,
    daily_sales: null,
    food_cost_pct: null,
    labor_cost_pct: null,
    gross_margin_pct_restaurant: null,
    tracks_waste: null,
    has_daily_reporting: null,
    menu_margin_visible: null,
    vendor_cost_change_pct: null,
    average_ticket: null,
    dead_stock_value: null,
    inventory_turnover: null,
    stockout_count: null,
    return_rate_pct: null,
    has_category_margin: null,
    high_sales_low_margin_count: null,
    inventory_value: null,
    average_order_value: null,
    cannabis_gross_margin_pct: null,
    cannabis_product_margin_visible: null,
    cannabis_category_margin_visible: null,
    cannabis_dead_stock_value: null,
    cannabis_stockout_count: null,
    cannabis_inventory_turnover: null,
    cannabis_shrinkage_pct: null,
    cannabis_discount_impact_pct: null,
    cannabis_promotion_impact_pct: null,
    cannabis_vendor_cost_increase_pct: null,
    cannabis_payment_reconciliation_gap: null,
    cannabis_has_daily_or_weekly_reporting: null,
    cannabis_uses_manual_pos_workaround: null,
    cannabis_high_sales_low_margin_count: null,
    cannabis_inventory_value: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: null,
    updated_by: null,
    ...extra,
  };
}

describe("P20.8 industryDataFromMetrics — null-safety + percent conversion", () => {
  it("returns undefined when metrics row is null", () => {
    expect(industryDataFromMetrics(null, "general_service")).toBeUndefined();
  });

  it("returns undefined when row exists but every relevant field is null", () => {
    expect(industryDataFromMetrics(base({}), "general_service")).toBeUndefined();
  });

  it("does NOT coerce null numeric fields to 0", () => {
    const out = industryDataFromMetrics(
      base({ estimates_unsent: 5 }),
      "trade_field_service",
    );
    expect(out?.trades?.estimatesUnsent).toBe(5);
    expect(out?.trades?.jobsCompleted).toBeUndefined();
    expect(out?.trades?.grossMarginPct).toBeUndefined();
  });

  it("converts stored 0..100 percentages to 0..1 decimals for brains", () => {
    const out = industryDataFromMetrics(
      base({ food_cost_pct: 35, labor_cost_pct: 33, return_rate_pct: 12 }),
      "restaurant",
    );
    expect(out?.restaurant?.foodCostPct).toBeCloseTo(0.35);
    expect(out?.restaurant?.laborCostPct).toBeCloseTo(0.33);
    expect(out?.retail?.returnRatePct).toBeCloseTo(0.12);
  });

  it("maps shared booleans without inventing positives", () => {
    const out = industryDataFromMetrics(
      base({ owner_is_bottleneck: true, profit_visible: false }),
      "general_service",
    );
    expect(out?.shared?.ownerIsBottleneck).toBe(true);
    expect(out?.shared?.profitVisible).toBe(false);
    expect(out?.shared?.hasWeeklyReview).toBeUndefined();
  });
});

describe("P20.8 industry brains pick up structured metrics", () => {
  const ctx = (industry: any) => ({
    industry,
    industryConfirmed: true,
    signals: [],
    existingLeaks: [],
  });

  it("trades — uninvoiced jobs + no job costing produce findings", () => {
    const data = industryDataFromMetrics(
      base({ jobs_completed_not_invoiced: 3, has_job_costing: false }),
      "trade_field_service",
    );
    const r = runTradesBrain({ ...ctx("trade_field_service"), industryData: data });
    const types = r.leaks.map((l) => l.type);
    expect(types).toContain("jobs_completed_not_invoiced_bulk");
    expect(types).toContain("no_job_costing");
  });

  it("restaurant — high food/labor + no menu margin produce findings", () => {
    const data = industryDataFromMetrics(
      base({
        food_cost_pct: 42,
        labor_cost_pct: 38,
        has_daily_reporting: false,
      }),
      "restaurant",
    );
    const r = runRestaurantBrain({ ...ctx("restaurant"), industryData: data });
    const types = r.leaks.map((l) => l.type);
    expect(types).toContain("food_cost_creep");
    expect(types).toContain("labor_out_of_control");
    expect(types).toContain("no_daily_reporting");
  });

  it("retail — dead stock + stockouts + no category margin produce findings", () => {
    const data = industryDataFromMetrics(
      base({
        dead_stock_value: 12000,
        stockout_count: 4,
        has_category_margin: false,
      }),
      "retail",
    );
    const r = runRetailBrain({ ...ctx("retail"), industryData: data });
    const types = r.leaks.map((l) => l.type);
    expect(types).toContain("dead_inventory");
    expect(types).toContain("stockouts_on_profitable_items");
    expect(types).toContain("no_category_margin_visibility");
  });

  it("cannabis/MMC — discount impact + payment recon gap + dead stock produce findings; no healthcare wording", () => {
    const data = industryDataFromMetrics(
      base({
        cannabis_dead_stock_value: 9000,
        cannabis_stockout_count: 3,
        cannabis_discount_impact_pct: 18,
        cannabis_payment_reconciliation_gap: true,
      }),
      "mmj_cannabis",
    );
    const r = runCannabisBrain({ ...ctx("mmj_cannabis"), industryData: data });
    expect(r.leaks.length).toBeGreaterThan(0);
    const blob = JSON.stringify(r.leaks).toLowerCase();
    expect(blob).not.toMatch(/patient|claim|reimbursement|appointment|provider|clinical|insurance|diagnosis/);
  });

  it("general — owner bottleneck + manual spreadsheet + no profit visibility produce universal leaks", () => {
    const data = industryDataFromMetrics(
      base({
        owner_is_bottleneck: true,
        uses_manual_spreadsheet: true,
        profit_visible: false,
      }),
      "general_service",
    );
    const r = runGeneralBrain({ ...ctx("general_service"), industryData: data });
    expect(r.leaks.length).toBeGreaterThan(0);
  });
});

describe("P20.8 cannabis metrics field surface contains no healthcare fields", () => {
  it("CustomerBusinessMetrics keys exclude healthcare terms", () => {
    const sample = base({});
    const keys = Object.keys(sample).join(",").toLowerCase();
    for (const banned of [
      "patient",
      "claim",
      "reimbursement",
      "appointment",
      "provider",
      "diagnosis",
      "insurance",
      "clinical",
    ]) {
      expect(keys).not.toContain(banned);
    }
  });
});