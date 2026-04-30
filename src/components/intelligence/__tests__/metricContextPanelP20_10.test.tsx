// P20.10 — Metric Context display + impact/source clarity tests.

import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { AdminMetricContextPanel, formatMetric } from "../AdminMetricContextPanel";
import { AdminLeakIntelligencePanel } from "../AdminLeakIntelligencePanel";
import { analyzeLeaks } from "@/lib/leakEngine";
import type { CustomerBusinessMetrics } from "@/lib/customerMetrics/types";

const HEALTHCARE_FORBIDDEN =
  /\b(patient|patients|claim|claims|reimbursement|insurance|appointment|appointments|provider|providers|diagnosis|diagnoses|clinical|healthcare|medical billing)\b/i;

function metricsRow(over: Partial<CustomerBusinessMetrics> = {}): CustomerBusinessMetrics {
  return {
    id: "m1",
    customer_id: "c1",
    industry: "retail",
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
    created_at: "2026-04-30T00:00:00Z",
    updated_at: "2026-04-30T00:00:00Z",
    created_by: null,
    updated_by: null,
    ...over,
  };
}

const customer = { id: "c1", account_kind: "client_workflow" };

describe("AdminMetricContextPanel", () => {
  it("hides null fields and shows non-null values", () => {
    const m = metricsRow({
      inventory_value: 50000,
      dead_stock_value: 7500,
      profit_visible: false,
    });
    render(<AdminMetricContextPanel customer={customer} industry="retail" metrics={m} />);
    expect(screen.getByTestId("metric-row-inventory_value")).toBeTruthy();
    expect(screen.getByTestId("metric-row-dead_stock_value")).toBeTruthy();
    expect(screen.getByTestId("metric-row-profit_visible")).toBeTruthy();
    expect(screen.queryByTestId("metric-row-stockout_count")).toBeNull();
    // Profit visible false renders as "No", not blank.
    expect(within(screen.getByTestId("metric-row-profit_visible")).getByText("No")).toBeTruthy();
  });

  it("formats money / percent / count / boolean correctly", () => {
    expect(formatMetric(7500, "money")).toBe("$7,500");
    expect(formatMetric(32.5, "pct")).toBe("32.5%");
    expect(formatMetric(12, "count")).toBe("12");
    expect(formatMetric(true, "bool")).toBe("Yes");
    expect(formatMetric(false, "bool")).toBe("No");
    expect(formatMetric(null, "money")).toBe("Needs Verification");
  });

  it("marks restaurant context-only fields as Context", () => {
    const m = metricsRow({
      industry: "restaurant",
      daily_sales: 4200,
      average_ticket: 27.5,
      food_cost_pct: 34,
    });
    render(<AdminMetricContextPanel customer={customer} industry="restaurant" metrics={m} />);
    const dailyRow = screen.getByTestId("metric-row-daily_sales");
    expect(within(dailyRow).getByText("Context")).toBeTruthy();
    const avgRow = screen.getByTestId("metric-row-average_ticket");
    expect(within(avgRow).getByText("Context")).toBeTruthy();
    const foodRow = screen.getByTestId("metric-row-food_cost_pct");
    expect(within(foodRow).getByText("Used in findings")).toBeTruthy();
  });

  it("renders retail dead-stock ratio when both inventory and dead stock are present", () => {
    const m = metricsRow({ inventory_value: 50000, dead_stock_value: 10000 });
    render(<AdminMetricContextPanel customer={customer} industry="retail" metrics={m} />);
    expect(screen.getByTestId("derived-dead-stock-ratio")).toBeTruthy();
    expect(screen.getByText("20%")).toBeTruthy();
  });

  it("renders cannabis dead-stock ratio with cannabis-only language", () => {
    const m = metricsRow({
      industry: "mmj_cannabis",
      cannabis_inventory_value: 80000,
      cannabis_dead_stock_value: 12000,
      cannabis_shrinkage_pct: 3,
    });
    const { container } = render(
      <AdminMetricContextPanel customer={customer} industry="mmj_cannabis" metrics={m} />,
    );
    expect(screen.getByTestId("derived-cannabis-dead-stock-ratio")).toBeTruthy();
    expect(screen.getByText("15%")).toBeTruthy();
    expect(container.textContent ?? "").not.toMatch(HEALTHCARE_FORBIDDEN);
  });

  it("does not mount on internal RGS/admin operating accounts", () => {
    const internal = { id: "rgs1", account_kind: "internal_admin" };
    const { container } = render(
      <AdminMetricContextPanel customer={internal} industry="retail" metrics={metricsRow()} />,
    );
    expect(container.firstChild).toBeNull();
  });
});

describe("AdminLeakIntelligencePanel — impact + source clarity (P20.10)", () => {
  it("shows estimated impact and 'from unpaid invoice amount' hint for unpaid-invoice finding", () => {
    const a = analyzeLeaks({
      industry: "trade_field_service",
      industryConfirmed: true,
      estimates: [],
      industryData: { trades: { unpaidInvoiceAmount: 12500 } },
    });
    render(<AdminLeakIntelligencePanel admin={a.admin} />);
    const text = screen.getByTestId("admin-leak-intelligence").textContent ?? "";
    expect(text).toMatch(/\$12,500/);
    expect(text).toMatch(/from unpaid invoice amount/i);
    expect(text).toMatch(/Structured Metrics/);
  });

  it("shows 'from cannabis dead stock value' hint and uses no healthcare wording", () => {
    const a = analyzeLeaks({
      industry: "mmj_cannabis",
      industryConfirmed: true,
      estimates: [],
      industryData: {
        cannabis: { deadStockValue: 9000, inventoryValue: 30000 },
      },
    });
    const { container } = render(<AdminLeakIntelligencePanel admin={a.admin} />);
    const text = container.textContent ?? "";
    expect(text).toMatch(/\$9,000/);
    expect(text).toMatch(/from cannabis dead stock value/i);
    expect(text).not.toMatch(HEALTHCARE_FORBIDDEN);
  });
});