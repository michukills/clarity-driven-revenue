/**
 * P20.12 — XLSX importer + Square / Stripe snapshot mappers.
 *
 * Verifies:
 *   - XLSX reaches the same preview shape as CSV for equivalent inputs
 *   - blanks stay null, unknowns ignored, invalid rejected
 *   - Square mapper safely maps only supported fields, never invents
 *     inventory / dead stock / stockouts / margin / vendor cost
 *   - Stripe mapper safely maps only supported fields, never invents
 *     margin / inventory / operations
 *   - cannabis surfaces avoid healthcare wording
 *   - frontend snapshot modules expose no token / secret / refresh
 */

import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import {
  buildPreview,
  parseMetricsCsv,
  previewToPayload,
} from "../csvImport";
import {
  isMetricsSpreadsheetFilename,
  parseMetricsWorkbook,
} from "../xlsxImport";
import {
  mapSquareSummaryToMetrics,
  SQUARE_NOT_DERIVED_FIELDS,
  type SquarePeriodSummary,
} from "../squareSnapshot";
import {
  mapStripeSummaryToMetrics,
  STRIPE_NOT_DERIVED_FIELDS,
  type StripePeriodSummary,
} from "../stripeSnapshot";

function makeXlsx(rows: (string | number | boolean | null)[][]): ArrayBuffer {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Metrics");
  const out = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  return out as ArrayBuffer;
}

describe("P20.12 isMetricsSpreadsheetFilename", () => {
  it("matches xlsx and xls case-insensitively", () => {
    expect(isMetricsSpreadsheetFilename("metrics.xlsx")).toBe(true);
    expect(isMetricsSpreadsheetFilename("Metrics.XLSX")).toBe(true);
    expect(isMetricsSpreadsheetFilename("metrics.xls")).toBe(true);
    expect(isMetricsSpreadsheetFilename("metrics.csv")).toBe(false);
    expect(isMetricsSpreadsheetFilename("notes.txt")).toBe(false);
  });
});

describe("P20.12 XLSX importer", () => {
  it("produces the same preview as CSV for the same headers/values", () => {
    const headers = ["unpaid_invoice_amount", "gross_margin_pct", "has_job_costing"];
    const values = ["10000", "42", "yes"];
    const csv = `${headers.join(",")}\n${values.join(",")}\n`;
    const csvPreview = buildPreview(parseMetricsCsv(csv));

    const xlsxBytes = makeXlsx([headers, values]);
    const xlsxPreview = buildPreview(parseMetricsWorkbook(xlsxBytes));

    expect(xlsxPreview.fields.map((f) => [f.fieldKey, f.parsedValue])).toEqual(
      csvPreview.fields.map((f) => [f.fieldKey, f.parsedValue]),
    );
    expect(xlsxPreview.ignoredColumns).toEqual(csvPreview.ignoredColumns);
    expect(xlsxPreview.invalid).toEqual(csvPreview.invalid);
  });

  it("supports friendly aliases via XLSX (jobs_done, gross_margin, aov)", () => {
    const xlsxBytes = makeXlsx([
      ["unpaid_invoices", "jobs_done", "gross_margin", "aov"],
      ["5000", "17", "30", "55"],
    ]);
    const preview = buildPreview(parseMetricsWorkbook(xlsxBytes));
    const byKey = Object.fromEntries(preview.fields.map((f) => [f.fieldKey, f.parsedValue]));
    expect(byKey.unpaid_invoice_amount).toBe(5000);
    expect(byKey.jobs_completed).toBe(17);
    expect(byKey.gross_margin_pct).toBe(30);
    expect(byKey.average_order_value).toBe(55);
    expect(preview.ignoredColumns).toEqual([]);
  });

  it("blank XLSX cells stay null and clearBlanks=true overwrites", () => {
    const xlsxBytes = makeXlsx([
      ["unpaid_invoice_amount", "has_job_costing", "stockout_count"],
      ["", "", ""],
    ]);
    const preview = buildPreview(parseMetricsWorkbook(xlsxBytes));
    expect(preview.blankFields.sort()).toEqual(
      ["unpaid_invoice_amount", "has_job_costing", "stockout_count"].sort() as any,
    );
    expect(previewToPayload(preview)).toEqual({});
    const cleared = previewToPayload(preview, { clearBlanks: true });
    expect(cleared.unpaid_invoice_amount).toBeNull();
    expect(cleared.has_job_costing).toBeNull();
    expect(cleared.stockout_count).toBeNull();
  });

  it("unknown XLSX columns are ignored, never silently saved", () => {
    const xlsxBytes = makeXlsx([
      ["unpaid_invoice_amount", "marketing_spend", "random_field"],
      ["1000", "500", "abc"],
    ]);
    const preview = buildPreview(parseMetricsWorkbook(xlsxBytes));
    expect(preview.ignoredColumns).toEqual(["marketing_spend", "random_field"]);
    const payload = previewToPayload(preview);
    expect(payload.unpaid_invoice_amount).toBe(1000);
    expect("marketing_spend" in payload).toBe(false);
  });

  it("invalid XLSX values are rejected", () => {
    const xlsxBytes = makeXlsx([
      ["unpaid_invoice_amount", "has_job_costing"],
      ["not-a-number", "maybe"],
    ]);
    const preview = buildPreview(parseMetricsWorkbook(xlsxBytes));
    expect(preview.fields.length).toBe(0);
    expect(preview.invalid.map((v) => v.fieldKey).sort()).toEqual(
      ["has_job_costing", "unpaid_invoice_amount"].sort() as any,
    );
  });

  it("throws on empty workbook bytes", () => {
    expect(() => parseMetricsWorkbook(new ArrayBuffer(0))).toThrow();
  });

  it("throws when XLSX has only a header row", () => {
    const xlsxBytes = makeXlsx([["unpaid_invoice_amount", "gross_margin_pct"]]);
    expect(() => parseMetricsWorkbook(xlsxBytes)).toThrow();
  });
});

describe("P20.12 Square snapshot mapper", () => {
  const fullSummary: SquarePeriodSummary = {
    gross_sales: 50000,
    net_sales: 47500,
    discounts_total: 2500,
    refunds_total: 500,
    tips_total: 1200,
    tax_total: 0,
    transaction_count: 1000,
    day_count: 30,
    has_recurring_period_reporting: true,
    period_start: "2026-04-01",
    period_end: "2026-04-30",
  };

  it("returns no_summary when summary is null", () => {
    const r = mapSquareSummaryToMetrics(null, "retail");
    expect(r.readiness).toBe("no_summary");
    expect(r.confidence).toBe("Needs Verification");
    expect(r.payload).toEqual({});
    expect(r.source).toBe("square");
  });

  it("derives average_ticket only when txn count and sales support it", () => {
    const r = mapSquareSummaryToMetrics(fullSummary, "retail");
    expect(r.payload.average_ticket).toBeCloseTo(47.5, 1);
    expect(r.payload.primary_data_source).toBe("Square");

    const noTxn = mapSquareSummaryToMetrics({ ...fullSummary, transaction_count: 0 }, "retail");
    expect(noTxn.payload.average_ticket).toBeUndefined();

    const noSales = mapSquareSummaryToMetrics(
      { ...fullSummary, gross_sales: 0, net_sales: 0 },
      "retail",
    );
    expect(noSales.readiness).toBe("insufficient_volume");
  });

  it("derives daily_sales only when day_count is provided", () => {
    const withDays = mapSquareSummaryToMetrics(fullSummary, "retail");
    expect(withDays.payload.daily_sales).toBeDefined();

    const noDays = mapSquareSummaryToMetrics({ ...fullSummary, day_count: 0 }, "retail");
    expect(noDays.payload.daily_sales).toBeUndefined();
  });

  it("does NOT infer inventory, dead stock, stockouts, vendor cost, margin", () => {
    for (const industry of ["trade_field_service", "restaurant", "retail", "mmj_cannabis"] as const) {
      const r = mapSquareSummaryToMetrics(fullSummary, industry);
      for (const banned of [
        "inventory_value",
        "dead_stock_value",
        "stockout_count",
        "vendor_cost_change_pct",
        "menu_margin_visible",
        "gross_margin_pct",
        "food_cost_pct",
        "labor_cost_pct",
        "cannabis_inventory_value",
        "cannabis_dead_stock_value",
        "cannabis_stockout_count",
        "cannabis_payment_reconciliation_gap",
        "cannabis_uses_manual_pos_workaround",
      ] as const) {
        expect(r.payload[banned]).toBeUndefined();
        expect(SQUARE_NOT_DERIVED_FIELDS).toContain(banned);
      }
    }
  });

  it("cannabis discount impact is only set when cannabis + discounts present", () => {
    const cannabis = mapSquareSummaryToMetrics(fullSummary, "mmj_cannabis");
    expect(cannabis.payload.cannabis_discount_impact_pct).toBeCloseTo(5, 1);
    expect(cannabis.payload.cannabis_has_daily_or_weekly_reporting).toBe(true);

    const retail = mapSquareSummaryToMetrics(fullSummary, "retail");
    expect(retail.payload.cannabis_discount_impact_pct).toBeUndefined();
    expect(retail.payload.cannabis_has_daily_or_weekly_reporting).toBeUndefined();

    const noDiscounts = mapSquareSummaryToMetrics(
      { ...fullSummary, discounts_total: 0 },
      "mmj_cannabis",
    );
    expect(noDiscounts.payload.cannabis_discount_impact_pct).toBeUndefined();
  });

  it("cannabis recurring reporting flag stays null when summary doesn't prove it", () => {
    const r = mapSquareSummaryToMetrics(
      { ...fullSummary, has_recurring_period_reporting: null },
      "mmj_cannabis",
    );
    expect(r.payload.cannabis_has_daily_or_weekly_reporting).toBeUndefined();
  });
});

describe("P20.12 Stripe snapshot mapper", () => {
  const fullSummary: StripePeriodSummary = {
    gross_volume: 100000,
    net_volume: 96500,
    fees_total: 3500,
    refunds_total: 2000,
    disputes_total: 0,
    successful_payment_count: 800,
    failed_payment_count: 50,
    period_start: "2026-04-01",
    period_end: "2026-04-30",
  };

  it("returns no_summary when summary is null", () => {
    const r = mapStripeSummaryToMetrics(null);
    expect(r.readiness).toBe("no_summary");
    expect(r.confidence).toBe("Needs Verification");
    expect(r.payload).toEqual({});
    expect(r.derivedIndicators.payment_failure_rate_pct).toBeNull();
  });

  it("derives average_order_value only when payment count and volume exist", () => {
    const r = mapStripeSummaryToMetrics(fullSummary);
    expect(r.payload.average_order_value).toBeCloseTo(120.63, 2);
    expect(r.payload.primary_data_source).toBe("Stripe");

    const noCount = mapStripeSummaryToMetrics({ ...fullSummary, successful_payment_count: 0 });
    expect(noCount.payload.average_order_value).toBeUndefined();
  });

  it("derives payment failure rate only when counts exist", () => {
    const r = mapStripeSummaryToMetrics(fullSummary);
    // 50 / (50 + 800) ≈ 5.9
    expect(r.derivedIndicators.payment_failure_rate_pct).toBeCloseTo(5.9, 1);

    const noCounts = mapStripeSummaryToMetrics({
      ...fullSummary,
      successful_payment_count: 0,
      failed_payment_count: 0,
    });
    expect(noCounts.derivedIndicators.payment_failure_rate_pct).toBeNull();
  });

  it("derives refund rate only when refunds and gross volume exist", () => {
    const r = mapStripeSummaryToMetrics(fullSummary);
    expect(r.derivedIndicators.refund_rate_pct).toBeCloseTo(2, 1);

    const noRefunds = mapStripeSummaryToMetrics({ ...fullSummary, refunds_total: 0 });
    expect(noRefunds.derivedIndicators.refund_rate_pct).toBeNull();
  });

  it("does NOT infer inventory, margin, food/labor cost, or operations", () => {
    const r = mapStripeSummaryToMetrics(fullSummary);
    for (const banned of [
      "inventory_value",
      "dead_stock_value",
      "stockout_count",
      "gross_margin_pct",
      "gross_margin_pct_restaurant",
      "food_cost_pct",
      "labor_cost_pct",
      "owner_is_bottleneck",
      "menu_margin_visible",
      "cannabis_payment_reconciliation_gap",
      "cannabis_discount_impact_pct",
      "cannabis_uses_manual_pos_workaround",
    ] as const) {
      expect(r.payload[banned]).toBeUndefined();
      expect(STRIPE_NOT_DERIVED_FIELDS).toContain(banned);
    }
  });

  it("zero-volume Stripe summary → insufficient_volume", () => {
    const r = mapStripeSummaryToMetrics({
      ...fullSummary,
      gross_volume: 0,
      net_volume: 0,
      successful_payment_count: 0,
    });
    expect(r.readiness).toBe("insufficient_volume");
    expect(r.confidence).toBe("Needs Verification");
  });
});

describe("P20.12 source-code safety: no tokens or secrets in frontend modules", async () => {
  const square = await import("../squareSnapshot");
  const stripe = await import("../stripeSnapshot");
  const xlsx = await import("../xlsxImport");

  it("Square mapper exports no token / secret / refresh handling", () => {
    for (const key of Object.keys(square)) {
      expect(key.toLowerCase()).not.toContain("token");
      expect(key.toLowerCase()).not.toContain("secret");
      expect(key.toLowerCase()).not.toContain("refresh");
      expect(key.toLowerCase()).not.toContain("oauth");
    }
  });

  it("Stripe mapper exports no token / secret / refresh handling", () => {
    for (const key of Object.keys(stripe)) {
      expect(key.toLowerCase()).not.toContain("token");
      expect(key.toLowerCase()).not.toContain("secret");
      expect(key.toLowerCase()).not.toContain("refresh");
      expect(key.toLowerCase()).not.toContain("apikey");
    }
  });

  it("XLSX importer exports no token / secret references", () => {
    for (const key of Object.keys(xlsx)) {
      expect(key.toLowerCase()).not.toContain("token");
      expect(key.toLowerCase()).not.toContain("secret");
    }
  });
});

describe("P20.12 cannabis/MMC language guard for snapshot mappers", () => {
  const HEALTH_TERMS = [
    "patient", "claim", "reimbursement", "appointment", "provider",
    "diagnosis", "insurance", "clinical", "healthcare", "treatment",
  ];

  it("Square mapper output for cannabis contains no healthcare wording", () => {
    const r = mapSquareSummaryToMetrics(
      {
        gross_sales: 10000, net_sales: 9500, discounts_total: 500,
        refunds_total: 0, tips_total: 0, tax_total: 0,
        transaction_count: 100, day_count: 30,
        has_recurring_period_reporting: true,
        period_start: "2026-04-01", period_end: "2026-04-30",
      },
      "mmj_cannabis",
    );
    const json = JSON.stringify(r).toLowerCase();
    for (const term of HEALTH_TERMS) expect(json).not.toContain(term);
  });

  it("Stripe mapper output contains no healthcare wording", () => {
    const r = mapStripeSummaryToMetrics({
      gross_volume: 5000, net_volume: 4800, fees_total: 200,
      refunds_total: 0, disputes_total: 0,
      successful_payment_count: 50, failed_payment_count: 1,
      period_start: "2026-04-01", period_end: "2026-04-30",
    });
    const json = JSON.stringify(r).toLowerCase();
    for (const term of HEALTH_TERMS) expect(json).not.toContain(term);
  });
});