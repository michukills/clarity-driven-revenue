/**
 * P20.16 — provider summary ingest validator tests.
 *
 * Verifies normalized-summary safety guarantees:
 *   - accepts valid Square / Stripe / Dutchie payloads
 *   - enforces dates and date order
 *   - rejects token-like keys / values and raw transaction arrays
 *   - rejects non-numeric numerics
 *   - ignores unsupported keys with a warning
 *   - preserves nulls for blanks
 *   - caps payload size
 *   - language guard: no MMC, no healthcare wording in source file
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  validateProviderSummary,
  parseAndValidate,
  ingestEdgeFunctionName,
  listProviderFields,
  MAX_PAYLOAD_BYTES,
} from "../providerSummaryIngest";

const cust = "00000000-0000-0000-0000-000000000001";

describe("validateProviderSummary — Square", () => {
  it("accepts a valid normalized Square summary", () => {
    const r = validateProviderSummary({
      provider: "square",
      customerId: cust,
      raw: {
        period_start: "2026-04-01",
        period_end: "2026-04-30",
        gross_sales: 100000,
        net_sales: 92000,
        discounts_total: 8000,
        transaction_count: 2000,
        day_count: 30,
        has_recurring_period_reporting: true,
      },
    });
    expect(r.ok).toBe(true);
    expect(r.errors).toEqual([]);
    expect(r.fieldCount).toBe(6);
    expect(r.summary.gross_sales).toBe(100000);
    expect(r.summary.has_recurring_period_reporting).toBe(true);
  });

  it("preserves nulls for blank fields", () => {
    const r = validateProviderSummary({
      provider: "square",
      customerId: cust,
      raw: {
        period_start: "2026-04-01",
        period_end: "2026-04-30",
        gross_sales: 100,
        net_sales: "",
        tips_total: null,
      },
    });
    expect(r.ok).toBe(true);
    expect(r.summary.net_sales).toBe(null);
    expect(r.summary.tips_total).toBe(null);
    expect(r.fieldCount).toBe(1);
  });

  it("ignores unsupported fields with a warning", () => {
    const r = validateProviderSummary({
      provider: "square",
      customerId: cust,
      raw: {
        period_start: "2026-04-01",
        period_end: "2026-04-30",
        gross_sales: 1,
        random_field: "hi",
        another_extra: 9,
      },
    });
    expect(r.ok).toBe(true);
    expect(r.ignored.sort()).toEqual(["another_extra", "random_field"]);
    expect(r.warnings.length).toBeGreaterThan(0);
  });
});

describe("validateProviderSummary — Stripe", () => {
  it("accepts a valid normalized Stripe payload", () => {
    const r = validateProviderSummary({
      provider: "stripe",
      customerId: cust,
      raw: {
        period_start: "2026-04-01",
        period_end: "2026-04-30",
        gross_volume: 50000,
        net_volume: 48500,
        fees_total: 1500,
        successful_payment_count: 980,
        failed_payment_count: 20,
      },
    });
    expect(r.ok).toBe(true);
    expect(r.summary.successful_payment_count).toBe(980);
  });
});

describe("validateProviderSummary — Dutchie", () => {
  it("accepts a valid normalized Dutchie payload", () => {
    const r = validateProviderSummary({
      provider: "dutchie",
      customerId: cust,
      raw: {
        period_start: "2026-04-01",
        period_end: "2026-04-30",
        gross_sales: 250000,
        inventory_turnover: 4.2,
        shrinkage_pct: 1.5,
        product_margin_visible: true,
      },
    });
    expect(r.ok).toBe(true);
    expect(r.summary.shrinkage_pct).toBe(1.5);
  });
});

describe("validateProviderSummary — date guards", () => {
  it("rejects bad date format", () => {
    const r = validateProviderSummary({
      provider: "square",
      customerId: cust,
      raw: { period_start: "04/01/2026", period_end: "2026-04-30" },
    });
    expect(r.ok).toBe(false);
    expect(r.errors.join(" ")).toContain("period_start");
  });

  it("rejects period_end before period_start", () => {
    const r = validateProviderSummary({
      provider: "stripe",
      customerId: cust,
      raw: { period_start: "2026-05-01", period_end: "2026-04-30" },
    });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes("on or before"))).toBe(true);
  });
});

describe("validateProviderSummary — security guards", () => {
  it("rejects token-like keys", () => {
    const r = validateProviderSummary({
      provider: "square",
      customerId: cust,
      raw: {
        period_start: "2026-04-01",
        period_end: "2026-04-30",
        access_token: "abc123",
      },
    });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes("blocked key"))).toBe(true);
  });

  it("rejects raw transactions arrays", () => {
    const r = validateProviderSummary({
      provider: "stripe",
      customerId: cust,
      raw: {
        period_start: "2026-04-01",
        period_end: "2026-04-30",
        transactions: [{ id: "ch_1" }],
      },
    });
    expect(r.ok).toBe(false);
  });

  it("rejects token-like values", () => {
    const r = validateProviderSummary({
      provider: "stripe",
      customerId: cust,
      raw: {
        period_start: "2026-04-01",
        period_end: "2026-04-30",
        source_account_id: "sk_live_4eC39HqLyjWDarjtT1zdp7dc",
      },
    });
    expect(r.ok).toBe(false);
  });

  it("rejects non-numeric numeric fields", () => {
    const r = validateProviderSummary({
      provider: "square",
      customerId: cust,
      raw: {
        period_start: "2026-04-01",
        period_end: "2026-04-30",
        gross_sales: "not-a-number",
      },
    });
    expect(r.ok).toBe(false);
    expect(r.invalid.some((i) => i.field === "gross_sales")).toBe(true);
  });

  it("rejects payloads larger than the size cap", () => {
    const big = { period_start: "2026-04-01", period_end: "2026-04-30", note: "x".repeat(MAX_PAYLOAD_BYTES) };
    const r = validateProviderSummary({ provider: "square", customerId: cust, raw: big });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes("too large"))).toBe(true);
  });
});

describe("parseAndValidate", () => {
  it("handles invalid JSON", () => {
    const r = parseAndValidate("square", cust, "{not-json");
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toMatch(/invalid JSON/i);
  });
});

describe("ingestEdgeFunctionName", () => {
  it("maps providers to edge function names", () => {
    expect(ingestEdgeFunctionName("square")).toBe("square-sync");
    expect(ingestEdgeFunctionName("stripe")).toBe("stripe-sync");
    expect(ingestEdgeFunctionName("dutchie")).toBe("dutchie-sync");
  });
});

describe("listProviderFields", () => {
  it("lists fields for a provider", () => {
    const f = listProviderFields("dutchie").map((x) => x.field);
    expect(f).toContain("gross_sales");
    expect(f).toContain("shrinkage_pct");
  });
});

describe("language and healthcare guards (source file)", () => {
  const src = readFileSync(
    join(__dirname, "..", "providerSummaryIngest.ts"),
    "utf-8",
  );
  const lower = src.toLowerCase();

  it("does not use 'MMC' shorthand", () => {
    expect(/\bmmc\b/.test(src)).toBe(false);
  });

  it("does not use healthcare/patient-care language", () => {
    for (const word of ["patient", "clinical", "diagnosis", "appointment", "reimbursement", "treatment", "medical record"]) {
      expect(lower.includes(word)).toBe(false);
    }
  });

  it("does not contain frontend secret/token references", () => {
    expect(/process\.env\.|service_role/i.test(src)).toBe(false);
  });
});