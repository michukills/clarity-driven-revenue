/**
 * P20.13 — Backend Square/Stripe sync + summary tables.
 *
 * These tests assert the structural / safety guarantees we control from
 * code: source enum widening, mapper output stays free of provider
 * tokens & healthcare wording, and the scaffold edge functions never
 * read tokens in frontend-facing code.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { mapSquareSummaryToMetrics } from "../squareSnapshot";
import { mapStripeSummaryToMetrics } from "../stripeSnapshot";
import type { CustomerMetricsSource } from "../types";

const ROOT = join(__dirname, "..", "..", "..", "..");

describe("P20.13 source enum widening", () => {
  it("includes 'square' and 'stripe' as valid sources", () => {
    const sq: CustomerMetricsSource = "square";
    const st: CustomerMetricsSource = "stripe";
    expect(sq).toBe("square");
    expect(st).toBe("stripe");
  });
});

describe("P20.13 frontend has no provider tokens/secrets", () => {
  const filesUnderTest = [
    "src/lib/customerMetrics/squareSnapshot.ts",
    "src/lib/customerMetrics/stripeSnapshot.ts",
    "src/components/intelligence/AdminMetricsImporterPanel.tsx",
  ];

  const banned = [
    "client_secret",
    "refresh_token",
    "access_token",
    "STRIPE_SECRET_KEY",
    "SQUARE_CLIENT_SECRET",
    "Bearer sk_",
    "Authorization:",
  ];

  for (const f of filesUnderTest) {
    it(`no token/secret strings in ${f}`, () => {
      const src = readFileSync(join(ROOT, f), "utf8");
      for (const word of banned) {
        expect(src.toLowerCase()).not.toContain(word.toLowerCase());
      }
    });
  }
});

describe("P20.13 cannabis snapshot language guard", () => {
  const HEALTHCARE = [
    "patient",
    "clinical",
    "diagnosis",
    "insurance",
    "claim",
    "appointment",
    "reimbursement",
    "treatment",
    "medical record",
  ];

  it("Square cannabis output never contains healthcare wording", () => {
    const result = mapSquareSummaryToMetrics(
      {
        gross_sales: 50000,
        net_sales: 47000,
        discounts_total: 3000,
        refunds_total: 100,
        tips_total: null,
        tax_total: null,
        transaction_count: 800,
        day_count: 30,
        has_recurring_period_reporting: true,
        period_start: "2026-04-01",
        period_end: "2026-04-30",
      },
      "mmj_cannabis",
    );
    const blob = JSON.stringify(result).toLowerCase();
    for (const w of HEALTHCARE) expect(blob).not.toContain(w);
  });

  it("Stripe cannabis output never contains healthcare wording", () => {
    const result = mapStripeSummaryToMetrics({
      gross_volume: 25000,
      net_volume: 24000,
      fees_total: 800,
      refunds_total: 200,
      disputes_total: null,
      successful_payment_count: 400,
      failed_payment_count: 10,
      period_start: "2026-04-01",
      period_end: "2026-04-30",
    });
    const blob = JSON.stringify(result).toLowerCase();
    for (const w of HEALTHCARE) expect(blob).not.toContain(w);
  });
});

describe("P20.13 mapper inference guards", () => {
  it("Square cannabis import does NOT infer inventory / compliance / margin", () => {
    const r = mapSquareSummaryToMetrics(
      {
        gross_sales: 100000,
        net_sales: 95000,
        discounts_total: 5000,
        refunds_total: 0,
        tips_total: 0,
        tax_total: 0,
        transaction_count: 1500,
        day_count: 30,
        has_recurring_period_reporting: true,
        period_start: "2026-04-01",
        period_end: "2026-04-30",
      },
      "mmj_cannabis",
    );
    const banned = [
      "cannabis_inventory_value",
      "cannabis_dead_stock_value",
      "cannabis_stockout_count",
      "cannabis_inventory_turnover",
      "cannabis_shrinkage_pct",
      "cannabis_gross_margin_pct",
      "cannabis_payment_reconciliation_gap",
    ] as const;
    for (const k of banned) {
      expect((r.payload as Record<string, unknown>)[k]).toBeUndefined();
    }
  });

  it("Stripe derived indicators are NOT written into payload", () => {
    const r = mapStripeSummaryToMetrics({
      gross_volume: 25000,
      net_volume: 24000,
      fees_total: 800,
      refunds_total: 1000,
      disputes_total: null,
      successful_payment_count: 400,
      failed_payment_count: 50,
      period_start: "2026-04-01",
      period_end: "2026-04-30",
    });
    expect(r.derivedIndicators.payment_failure_rate_pct).not.toBeNull();
    expect(r.derivedIndicators.refund_rate_pct).not.toBeNull();
    expect((r.payload as Record<string, unknown>).payment_failure_rate_pct).toBeUndefined();
    expect((r.payload as Record<string, unknown>).refund_rate_pct).toBeUndefined();
  });
});

describe("P20.13 edge function scaffolds stay server-side", () => {
  it("square-sync uses service role and does not echo tokens", () => {
    const src = readFileSync(
      join(ROOT, "supabase/functions/square-sync/index.ts"),
      "utf8",
    );
    expect(src).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(src).toContain("square_period_summaries");
    expect(src).toContain("isAdmin");
    // Does not log or return secrets.
    expect(src.toLowerCase()).not.toContain("console.log(token");
    expect(src.toLowerCase()).not.toContain("access_token:");
  });

  it("stripe-sync uses service role and does not echo tokens", () => {
    const src = readFileSync(
      join(ROOT, "supabase/functions/stripe-sync/index.ts"),
      "utf8",
    );
    expect(src).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(src).toContain("stripe_period_summaries");
    expect(src).toContain("isAdmin");
    expect(src.toLowerCase()).not.toContain("console.log(token");
    expect(src.toLowerCase()).not.toContain("access_token:");
  });
});