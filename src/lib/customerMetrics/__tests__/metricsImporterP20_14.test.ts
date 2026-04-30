/**
 * P20.14 — Dutchie cannabis/MMC connector scaffold tests.
 *
 * Asserts:
 *   - 'dutchie' is a valid CustomerMetricsSource
 *   - mapper safely returns no_summary / industry_mismatch / supported
 *   - mapper never derives forbidden fields (gross margin, compliance,
 *     vendor cost, manual workaround flag, etc.)
 *   - mapper output and edge function source contain ZERO healthcare /
 *     clinical terminology (cannabis is regulated retail, not medical)
 *   - frontend / mapper / edge function expose no Dutchie tokens
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  mapDutchieSummaryToMetrics,
  DUTCHIE_NOT_DERIVED_FIELDS,
  type DutchiePeriodSummary,
} from "../dutchieSnapshot";
import type { CustomerMetricsSource } from "../types";

const ROOT = join(__dirname, "..", "..", "..", "..");

function fullSummary(overrides: Partial<DutchiePeriodSummary> = {}): DutchiePeriodSummary {
  return {
    gross_sales: 100000,
    net_sales: 92000,
    discounts_total: 8000,
    promotions_total: 4000,
    transaction_count: 2000,
    day_count: 30,
    average_ticket: 46,
    product_sales_total: 70000,
    category_sales_total: 22000,
    inventory_value: 250000,
    dead_stock_value: 12000,
    stockout_count: 5,
    inventory_turnover: 4.25,
    shrinkage_pct: 1.8,
    payment_reconciliation_gap: false,
    has_recurring_period_reporting: true,
    product_margin_visible: true,
    category_margin_visible: true,
    period_start: "2026-04-01",
    period_end: "2026-04-30",
    ...overrides,
  };
}

describe("P20.14 source enum widening", () => {
  it("includes 'dutchie' as a valid source", () => {
    const s: CustomerMetricsSource = "dutchie";
    expect(s).toBe("dutchie");
  });
});

describe("P20.14 mapDutchieSummaryToMetrics readiness", () => {
  it("returns no_summary when summary is null", () => {
    const r = mapDutchieSummaryToMetrics(null, "mmj_cannabis");
    expect(r.readiness).toBe("no_summary");
    expect(r.source).toBe("dutchie");
    expect(r.payload).toEqual({});
  });

  it("returns industry_mismatch for non-cannabis industries", () => {
    const r = mapDutchieSummaryToMetrics(fullSummary(), "trades_services");
    expect(r.readiness).toBe("industry_mismatch");
    expect(r.payload.primary_data_source).toBe("Dutchie");
    // No metrics should populate when industry is not cannabis.
    expect(Object.keys(r.payload)).toEqual(["primary_data_source"]);
  });

  it("returns insufficient_volume when no sales and no transactions", () => {
    const r = mapDutchieSummaryToMetrics(
      fullSummary({ gross_sales: 0, net_sales: 0, transaction_count: 0, average_ticket: 0 }),
      "mmj_cannabis",
    );
    expect(r.readiness).toBe("insufficient_volume");
  });

  it("returns supported with confirmed confidence on a full summary", () => {
    const r = mapDutchieSummaryToMetrics(fullSummary(), "mmj_cannabis");
    expect(r.readiness).toBe("supported");
    expect(r.confidence).toBe("Confirmed");
    expect(r.payload.primary_data_source).toBe("Dutchie");
    expect(r.payload.average_ticket).toBe(46);
    expect(r.payload.daily_sales).toBeGreaterThan(0);
    expect(r.payload.cannabis_inventory_value).toBe(250000);
    expect(r.payload.cannabis_dead_stock_value).toBe(12000);
    expect(r.payload.cannabis_stockout_count).toBe(5);
    expect(r.payload.cannabis_inventory_turnover).toBe(4.25);
    expect(r.payload.cannabis_shrinkage_pct).toBe(1.8);
    expect(r.payload.cannabis_payment_reconciliation_gap).toBe(false);
    expect(r.payload.cannabis_has_daily_or_weekly_reporting).toBe(true);
    expect(r.payload.cannabis_product_margin_visible).toBe(true);
    expect(r.payload.cannabis_category_margin_visible).toBe(true);
    expect(r.payload.cannabis_discount_impact_pct).toBeGreaterThan(0);
    expect(r.payload.cannabis_promotion_impact_pct).toBeGreaterThan(0);
  });

  it("never sets forbidden / not-derived fields", () => {
    const r = mapDutchieSummaryToMetrics(fullSummary(), "mmj_cannabis");
    for (const f of DUTCHIE_NOT_DERIVED_FIELDS) {
      expect(r.payload[f]).toBeUndefined();
    }
    // Spot-check critical exclusions.
    expect(r.payload.cannabis_gross_margin_pct).toBeUndefined();
    expect(r.payload.cannabis_vendor_cost_increase_pct).toBeUndefined();
    expect(r.payload.cannabis_uses_manual_pos_workaround).toBeUndefined();
    expect(r.payload.gross_margin_pct).toBeUndefined();
  });

  it("derives average_ticket from txn + sales when not provided", () => {
    const r = mapDutchieSummaryToMetrics(
      fullSummary({ average_ticket: null }),
      "mmj_cannabis",
    );
    expect(r.payload.average_ticket).toBe(46); // 92000 / 2000
  });

  it("omits margin visibility when summary doesn't prove it", () => {
    const r = mapDutchieSummaryToMetrics(
      fullSummary({ product_margin_visible: null, category_margin_visible: null }),
      "mmj_cannabis",
    );
    expect(r.payload.cannabis_product_margin_visible).toBeUndefined();
    expect(r.payload.cannabis_category_margin_visible).toBeUndefined();
  });

  it("omits recurring reporting flag when not explicitly true", () => {
    const r = mapDutchieSummaryToMetrics(
      fullSummary({ has_recurring_period_reporting: null }),
      "mmj_cannabis",
    );
    expect(r.payload.cannabis_has_daily_or_weekly_reporting).toBeUndefined();
  });
});

describe("P20.14 cannabis/MMC language guard", () => {
  const banned = [
    "patient",
    "clinical",
    "diagnosis",
    "diagnose",
    "insurance",
    "claim",
    "appointment",
    "reimbursement",
    "treatment",
    "medical record",
    // 'provider' is a generic term used for "data provider" in code; we
    // narrow the check to clearly-medical phrasings.
    "healthcare provider",
  ];

  const filesUnderTest = [
    "src/lib/customerMetrics/dutchieSnapshot.ts",
    "supabase/functions/dutchie-sync/index.ts",
  ];

  for (const f of filesUnderTest) {
    it(`contains no medical/clinical wording in ${f}`, () => {
      const src = readFileSync(join(ROOT, f), "utf8").toLowerCase();
      for (const w of banned) {
        expect(src).not.toContain(w);
      }
    });
  }

  it("mapper output JSON contains no medical/clinical wording", () => {
    const r = mapDutchieSummaryToMetrics(fullSummary(), "mmj_cannabis");
    const blob = JSON.stringify(r).toLowerCase();
    for (const w of banned) {
      expect(blob).not.toContain(w);
    }
  });
});

describe("P20.14 no Dutchie tokens/secrets in frontend or mapper", () => {
  const filesUnderTest = [
    "src/lib/customerMetrics/dutchieSnapshot.ts",
  ];
  const banned = [
    "dutchie_api_key",
    "dutchie_client_secret",
    "client_secret",
    "refresh_token",
    "access_token",
    "bearer ",
  ];
  for (const f of filesUnderTest) {
    it(`no token/secret strings in ${f}`, () => {
      const src = readFileSync(join(ROOT, f), "utf8").toLowerCase();
      for (const w of banned) {
        expect(src).not.toContain(w);
      }
    });
  }

  it("dutchie-sync edge function only reads tokens server-side via Deno.env", () => {
    const src = readFileSync(
      join(ROOT, "supabase/functions/dutchie-sync/index.ts"),
      "utf8",
    );
    // Must NOT import client SDK that would imply browser usage.
    expect(src).not.toContain("@/integrations/supabase/client");
    // Must use Deno.env for any provider env reads.
    expect(src).toContain("Deno.env.get");
  });
});