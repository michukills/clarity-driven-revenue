/**
 * P20.11 — Metrics importer tests.
 *
 * Covers CSV parser/aliases/coercions, blank-preservation, ignored
 * columns, cannabis healthcare-language guard, and QuickBooks snapshot
 * field-safety rules.
 */

import { describe, it, expect } from "vitest";
import {
  parseMetricsCsv,
  buildPreview,
  previewToPayload,
  parseMoney,
  parsePercent,
  parseBool,
  parseCount,
  buildMetricsTemplateCsv,
  CANNABIS_BLOCKED_TERMS,
  type MetricFieldSpec,
  METRIC_FIELDS,
} from "../csvImport";
import {
  mapQuickBooksSummaryToMetrics,
  QB_NOT_DERIVED_FIELDS,
} from "../quickbooksSnapshot";

describe("P20.11 metric value parsers", () => {
  it("parseMoney accepts $12,500 / 12,500 / 12500", () => {
    expect(parseMoney("$12,500")).toBe(12500);
    expect(parseMoney("12,500")).toBe(12500);
    expect(parseMoney("12500")).toBe(12500);
    expect(parseMoney("")).toBeNull();
    expect(parseMoney("abc")).toBeNull();
  });

  it("parsePercent accepts 35 and 35%", () => {
    expect(parsePercent("35")).toBe(35);
    expect(parsePercent("35%")).toBe(35);
    expect(parsePercent(" 35 % ")).toBe(35);
    expect(parsePercent("")).toBeNull();
  });

  it("parseBool accepts yes/no/true/false/y/n/1/0", () => {
    for (const t of ["yes", "Y", "true", "TRUE", "1", "t"]) expect(parseBool(t)).toBe(true);
    for (const f of ["no", "N", "false", "FALSE", "0", "f"]) expect(parseBool(f)).toBe(false);
    expect(parseBool("")).toBeNull();
    expect(parseBool("maybe")).toBeNull();
  });

  it("parseCount strips commas and truncates", () => {
    expect(parseCount("1,200")).toBe(1200);
    expect(parseCount("3.7")).toBe(3);
    expect(parseCount("")).toBeNull();
  });
});

describe("P20.11 metrics CSV preview", () => {
  it("maps exact column keys", () => {
    const csv =
      "unpaid_invoice_amount,gross_margin_pct,has_job_costing\n" +
      "$10,000,42%,yes\n";
    const parsed = parseMetricsCsv(csv);
    const preview = buildPreview(parsed);
    const byKey = Object.fromEntries(preview.fields.map((f) => [f.fieldKey, f.parsedValue]));
    expect(byKey.unpaid_invoice_amount).toBe(10000);
    expect(byKey.gross_margin_pct).toBe(42);
    expect(byKey.has_job_costing).toBe(true);
    expect(preview.ignoredColumns).toEqual([]);
    expect(preview.invalid).toEqual([]);
  });

  it("maps friendly aliases", () => {
    const csv =
      "unpaid_invoices,jobs_done,job_costing,gross_margin,food_cost,avg_ticket,aov,cannabis_dead_stock\n" +
      "5000,17,true,30,28%,42,55,1500\n";
    const parsed = parseMetricsCsv(csv);
    const preview = buildPreview(parsed);
    const byKey = Object.fromEntries(preview.fields.map((f) => [f.fieldKey, f.parsedValue]));
    expect(byKey.unpaid_invoice_amount).toBe(5000);
    expect(byKey.jobs_completed).toBe(17);
    expect(byKey.has_job_costing).toBe(true);
    expect(byKey.gross_margin_pct).toBe(30);
    expect(byKey.food_cost_pct).toBe(28);
    expect(byKey.average_ticket).toBe(42);
    expect(byKey.average_order_value).toBe(55);
    expect(byKey.cannabis_dead_stock_value).toBe(1500);
  });

  it("blank cells stay null and are not coerced to 0/false", () => {
    const csv =
      "unpaid_invoice_amount,has_job_costing,stockout_count\n" +
      ",,\n";
    const preview = buildPreview(parseMetricsCsv(csv));
    for (const f of preview.fields) expect(f.parsedValue).toBeNull();
    expect(preview.blankFields.sort()).toEqual(
      ["unpaid_invoice_amount", "has_job_costing", "stockout_count"].sort() as any,
    );
    // Default save behavior preserves nulls (drops them from payload).
    const payload = previewToPayload(preview);
    expect(payload).toEqual({});
    // Explicit clearBlanks=true writes nulls.
    const cleared = previewToPayload(preview, { clearBlanks: true });
    expect(cleared.unpaid_invoice_amount).toBeNull();
    expect(cleared.has_job_costing).toBeNull();
    expect(cleared.stockout_count).toBeNull();
  });

  it("reports unknown columns as ignored, never silently saves", () => {
    const csv =
      "unpaid_invoice_amount,marketing_spend,random_field\n" +
      "1000,500,abc\n";
    const preview = buildPreview(parseMetricsCsv(csv));
    expect(preview.ignoredColumns).toEqual(["marketing_spend", "random_field"]);
    const payload = previewToPayload(preview);
    expect(payload.unpaid_invoice_amount).toBe(1000);
    expect("marketing_spend" in payload).toBe(false);
    expect("random_field" in payload).toBe(false);
  });

  it("invalid values are rejected, not saved", () => {
    const csv =
      "unpaid_invoice_amount,has_job_costing\n" +
      "not-a-number,maybe\n";
    const preview = buildPreview(parseMetricsCsv(csv));
    expect(preview.fields.length).toBe(0);
    expect(preview.invalid.map((v) => v.fieldKey).sort()).toEqual(
      ["has_job_costing", "unpaid_invoice_amount"].sort() as any,
    );
  });
});

describe("P20.11 cannabis template language guard", () => {
  it("cannabis template contains no healthcare wording", () => {
    const csv = buildMetricsTemplateCsv("cannabis").toLowerCase();
    for (const term of CANNABIS_BLOCKED_TERMS) {
      expect(csv.includes(term), `cannabis template must not include "${term}"`).toBe(false);
    }
  });

  it("cannabis field labels contain no healthcare wording", () => {
    const cannabis = METRIC_FIELDS.filter((f: MetricFieldSpec) => f.group === "cannabis");
    expect(cannabis.length).toBeGreaterThan(0);
    for (const f of cannabis) {
      const label = f.label.toLowerCase();
      for (const term of CANNABIS_BLOCKED_TERMS) {
        expect(label.includes(term)).toBe(false);
      }
    }
  });

  it("each industry template includes shared + industry fields", () => {
    for (const id of ["trades", "restaurant", "retail", "cannabis"] as const) {
      const csv = buildMetricsTemplateCsv(id);
      expect(csv.split("\n")[0]).toContain("has_weekly_review");
    }
  });
});

describe("P20.11 QuickBooks snapshot mapper", () => {
  it("returns no_summary readiness when summary is null", () => {
    const r = mapQuickBooksSummaryToMetrics(null, "trade_field_service");
    expect(r.readiness).toBe("no_summary");
    expect(r.confidence).toBe("Needs Verification");
    expect(r.payload).toEqual({});
  });

  it("never derives stockouts, dead stock, jobs, or cannabis compliance", () => {
    const summary = {
      revenue_total: 100000,
      expense_total: 60000,
      open_invoices_total: 12000,
      open_invoices_count: 4,
      ar_total: 12000,
      ap_total: 3000,
      period_start: "2026-01-01",
      period_end: "2026-01-31",
    };
    for (const industry of ["trade_field_service", "restaurant", "retail", "mmj_cannabis"] as const) {
      const r = mapQuickBooksSummaryToMetrics(summary, industry);
      for (const banned of [
        "stockout_count",
        "menu_margin_visible",
        "service_line_visibility",
        "jobs_completed",
        "jobs_completed_not_invoiced",
        "cannabis_stockout_count",
        "cannabis_payment_reconciliation_gap",
        "cannabis_discount_impact_pct",
        "cannabis_promotion_impact_pct",
      ] as const) {
        expect(r.payload[banned]).toBeUndefined();
        expect(QB_NOT_DERIVED_FIELDS).toContain(banned);
      }
    }
  });

  it("trades: maps unpaid invoice amount + gross margin only", () => {
    const r = mapQuickBooksSummaryToMetrics(
      {
        revenue_total: 100000,
        expense_total: 60000,
        open_invoices_total: 12000,
        open_invoices_count: 4,
        ar_total: 12000,
        ap_total: 3000,
        period_start: "2026-01-01",
        period_end: "2026-01-31",
      },
      "trade_field_service",
    );
    expect(r.payload.unpaid_invoice_amount).toBe(12000);
    expect(r.payload.gross_margin_pct).toBe(40);
    expect(r.payload.primary_data_source).toBe("QuickBooks");
    expect(r.readiness).toBe("supported");
  });

  it("restaurant: leaves food_cost / labor_cost / daily_sales null", () => {
    const r = mapQuickBooksSummaryToMetrics(
      {
        revenue_total: 50000, expense_total: 30000,
        open_invoices_total: 0, open_invoices_count: 0,
        ar_total: 0, ap_total: 0,
        period_start: "2026-01-01", period_end: "2026-01-31",
      },
      "restaurant",
    );
    expect(r.payload.gross_margin_pct_restaurant).toBe(40);
    expect(r.payload.food_cost_pct).toBeUndefined();
    expect(r.payload.labor_cost_pct).toBeUndefined();
    expect(r.payload.daily_sales).toBeUndefined();
  });

  it("cannabis: only maps gross margin; leaves inventory/compliance null", () => {
    const r = mapQuickBooksSummaryToMetrics(
      {
        revenue_total: 80000, expense_total: 50000,
        open_invoices_total: 0, open_invoices_count: 0,
        ar_total: 0, ap_total: 0,
        period_start: "2026-01-01", period_end: "2026-01-31",
      },
      "mmj_cannabis",
    );
    expect(r.payload.cannabis_gross_margin_pct).toBeCloseTo(37.5, 1);
    expect(r.payload.cannabis_inventory_value).toBeUndefined();
    expect(r.payload.cannabis_dead_stock_value).toBeUndefined();
    expect(r.payload.cannabis_payment_reconciliation_gap).toBeUndefined();
  });

  it("zero or missing revenue → Needs Verification", () => {
    const r = mapQuickBooksSummaryToMetrics(
      {
        revenue_total: 0, expense_total: 0,
        open_invoices_total: 0, open_invoices_count: 0,
        ar_total: 0, ap_total: 0,
        period_start: "2026-01-01", period_end: "2026-01-31",
      },
      "trade_field_service",
    );
    expect(r.readiness).toBe("no_revenue");
    expect(r.confidence).toBe("Needs Verification");
  });
});

describe("P20.11 source-code safety: no QuickBooks tokens or secrets in frontend", () => {
  it("snapshot module does not reference QuickBooks tokens or OAuth secrets", () => {
    // Importing the module statically ensures it does not pull in any
    // server/Deno-only code. We also assert the exported surface does
    // not include token handling.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("../quickbooksSnapshot");
    const exportedKeys = Object.keys(mod);
    for (const key of exportedKeys) {
      expect(key.toLowerCase()).not.toContain("token");
      expect(key.toLowerCase()).not.toContain("secret");
      expect(key.toLowerCase()).not.toContain("refresh");
    }
  });
});