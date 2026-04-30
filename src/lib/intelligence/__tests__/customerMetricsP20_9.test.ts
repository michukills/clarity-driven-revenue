// P20.9 — Industry brains consume remaining structured metrics.
// Pure / deterministic. No DB. No network. No AI.

import { describe, it, expect } from "vitest";
import { industryDataFromMetrics } from "@/lib/intelligence/customerContext";
import { runTradesBrain } from "@/lib/intelligence/industryBrains/tradesServices";
import { runRestaurantBrain } from "@/lib/intelligence/industryBrains/restaurants";
import { runRetailBrain } from "@/lib/intelligence/industryBrains/retail";
import { runCannabisBrain } from "@/lib/intelligence/industryBrains/medicalMmc";
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

const ctx = (industry: any) => ({
  industry,
  industryConfirmed: true,
  signals: [],
  existingLeaks: [],
});

describe("P20.9 — extended industryDataFromMetrics mapping", () => {
  it("maps trades unpaid_invoice_amount + service_line_visibility", () => {
    const out = industryDataFromMetrics(
      base({ unpaid_invoice_amount: 12500, service_line_visibility: false }),
      "trade_field_service",
    );
    expect(out?.trades?.unpaidInvoiceAmount).toBe(12500);
    expect(out?.trades?.serviceLineVisibility).toBe(false);
  });

  it("maps restaurant menu_margin_visible + vendor_cost_change_pct (% → decimal) + daily_sales + average_ticket", () => {
    const out = industryDataFromMetrics(
      base({
        menu_margin_visible: false,
        vendor_cost_change_pct: 6,
        daily_sales: 4200,
        average_ticket: 28,
      }),
      "restaurant",
    );
    expect(out?.restaurant?.menuMarginVisible).toBe(false);
    expect(out?.restaurant?.vendorCostChangePct).toBeCloseTo(0.06);
    expect(out?.restaurant?.dailySales).toBe(4200);
    expect(out?.restaurant?.averageTicket).toBe(28);
  });

  it("maps retail high_sales_low_margin_count + inventory_value + average_order_value", () => {
    const out = industryDataFromMetrics(
      base({
        high_sales_low_margin_count: 4,
        inventory_value: 80000,
        average_order_value: 65,
      }),
      "retail",
    );
    expect(out?.retail?.highSalesLowMarginCount).toBe(4);
    expect(out?.retail?.inventoryValue).toBe(80000);
    expect(out?.retail?.averageOrderValue).toBe(65);
  });

  it("maps cannabis high_sales_low_margin_count + inventory_value + vendor cost (% → decimal)", () => {
    const out = industryDataFromMetrics(
      base({
        cannabis_high_sales_low_margin_count: 5,
        cannabis_inventory_value: 60000,
        cannabis_vendor_cost_increase_pct: 6,
      }),
      "mmj_cannabis",
    );
    expect(out?.cannabis?.highSalesLowMarginCount).toBe(5);
    expect(out?.cannabis?.inventoryValue).toBe(60000);
    expect(out?.cannabis?.vendorCostIncreasePct).toBeCloseTo(0.06);
  });

  it("does NOT coerce null new fields to 0/false", () => {
    const out = industryDataFromMetrics(base({ unpaid_invoice_amount: 100 }), "trade_field_service");
    expect(out?.trades?.unpaidInvoiceAmount).toBe(100);
    expect(out?.trades?.serviceLineVisibility).toBeUndefined();
    expect(out?.restaurant).toBeUndefined();
  });
});

describe("P20.9 — trades brain", () => {
  it("unpaid_invoice_amount > 0 produces unpaid invoice finding with estimated impact", () => {
    const data = industryDataFromMetrics(
      base({ unpaid_invoice_amount: 15000 }),
      "trade_field_service",
    );
    const r = runTradesBrain({ ...ctx("trade_field_service"), industryData: data });
    const leak = r.leaks.find((l) => l.type === "unpaid_invoice_visibility_gap");
    expect(leak).toBeDefined();
    expect(leak?.estimated_revenue_impact).toBe(15000);
    expect(leak?.severity).toBe("high");
  });

  it("service_line_visibility=false produces service line visibility finding", () => {
    const data = industryDataFromMetrics(
      base({ service_line_visibility: false }),
      "trade_field_service",
    );
    const r = runTradesBrain({ ...ctx("trade_field_service"), industryData: data });
    expect(r.leaks.map((l) => l.type)).toContain("service_line_visibility_gap");
  });
});

describe("P20.9 — restaurant brain", () => {
  it("menu_margin_visible=false produces menu margin finding", () => {
    const data = industryDataFromMetrics(
      base({ menu_margin_visible: false }),
      "restaurant",
    );
    const r = runRestaurantBrain({ ...ctx("restaurant"), industryData: data });
    expect(r.leaks.map((l) => l.type)).toContain("menu_margin_visibility_gap");
  });

  it("vendor_cost_change_pct >= 5% produces vendor cost finding", () => {
    const data = industryDataFromMetrics(
      base({ vendor_cost_change_pct: 8 }),
      "restaurant",
    );
    const r = runRestaurantBrain({ ...ctx("restaurant"), industryData: data });
    expect(r.leaks.map((l) => l.type)).toContain("vendor_cost_change_not_reviewed");
  });

  it("vendor_cost_change_pct < 5% produces no vendor cost finding", () => {
    const data = industryDataFromMetrics(
      base({ vendor_cost_change_pct: 3 }),
      "restaurant",
    );
    const r = runRestaurantBrain({ ...ctx("restaurant"), industryData: data });
    expect(r.leaks.map((l) => l.type)).not.toContain("vendor_cost_change_not_reviewed");
  });
});

describe("P20.9 — retail brain", () => {
  it("high_sales_low_margin_count > 0 produces finding", () => {
    const data = industryDataFromMetrics(
      base({ high_sales_low_margin_count: 3 }),
      "retail",
    );
    const r = runRetailBrain({ ...ctx("retail"), industryData: data });
    expect(r.leaks.map((l) => l.type)).toContain("high_sales_low_margin_products");
  });

  it("dead_stock / inventory_value >= 15% produces cash tie-up finding", () => {
    const data = industryDataFromMetrics(
      base({ dead_stock_value: 20000, inventory_value: 100000 }),
      "retail",
    );
    const r = runRetailBrain({ ...ctx("retail"), industryData: data });
    const leak = r.leaks.find((l) => l.type === "dead_inventory_cash_tie_up");
    expect(leak).toBeDefined();
    expect(leak?.estimated_revenue_impact).toBe(20000);
  });

  it("dead_stock / inventory_value < 15% does not produce cash tie-up finding", () => {
    const data = industryDataFromMetrics(
      base({ dead_stock_value: 5000, inventory_value: 100000 }),
      "retail",
    );
    const r = runRetailBrain({ ...ctx("retail"), industryData: data });
    expect(r.leaks.map((l) => l.type)).not.toContain("dead_inventory_cash_tie_up");
  });
});

describe("P20.9 — cannabis/MMC brain", () => {
  it("cannabis high_sales_low_margin_count > 0 produces cannabis-specific finding", () => {
    const data = industryDataFromMetrics(
      base({ cannabis_high_sales_low_margin_count: 4 }),
      "mmj_cannabis",
    );
    const r = runCannabisBrain({ ...ctx("mmj_cannabis"), industryData: data });
    expect(r.leaks.map((l) => l.type)).toContain("cannabis_high_sales_low_margin_products");
  });

  it("cannabis dead_stock / inventory_value >= 15% produces cash tie-up finding", () => {
    const data = industryDataFromMetrics(
      base({ cannabis_dead_stock_value: 18000, cannabis_inventory_value: 60000 }),
      "mmj_cannabis",
    );
    const r = runCannabisBrain({ ...ctx("mmj_cannabis"), industryData: data });
    const leak = r.leaks.find((l) => l.type === "cannabis_dead_stock_cash_tie_up");
    expect(leak).toBeDefined();
    expect(leak?.estimated_revenue_impact).toBe(18000);
  });

  it("vendor cost rise + discount erosion produces margin squeeze finding", () => {
    const data = industryDataFromMetrics(
      base({
        cannabis_vendor_cost_increase_pct: 7,
        cannabis_discount_impact_pct: 15,
      }),
      "mmj_cannabis",
    );
    const r = runCannabisBrain({ ...ctx("mmj_cannabis"), industryData: data });
    expect(r.leaks.map((l) => l.type)).toContain("cannabis_vendor_discount_margin_squeeze");
  });

  it("output never contains healthcare wording", () => {
    const data = industryDataFromMetrics(
      base({
        cannabis_high_sales_low_margin_count: 4,
        cannabis_dead_stock_value: 18000,
        cannabis_inventory_value: 60000,
        cannabis_vendor_cost_increase_pct: 7,
        cannabis_discount_impact_pct: 15,
        cannabis_promotion_impact_pct: 12,
        cannabis_payment_reconciliation_gap: true,
      }),
      "mmj_cannabis",
    );
    const r = runCannabisBrain({ ...ctx("mmj_cannabis"), industryData: data });
    const blob = JSON.stringify(r.leaks).toLowerCase();
    expect(blob).not.toMatch(/patient|claim|reimbursement|appointment|provider|clinical|insurance|diagnosis/);
  });
});
