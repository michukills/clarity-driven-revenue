/**
 * Industry Logic Final QA pass — customer-facing contract.
 *
 * Lightweight, deterministic checks. No AI calls, no scoring changes.
 * Asserts:
 *   1. Customer-facing industry labels frame cannabis as cannabis/dispensary,
 *      never as healthcare.
 *   2. The five official gear names appear in canonical AI prompt source.
 *   3. Third-party brand names use exact official capitalization.
 *   4. Cannabis brain output never leaks healthcare terminology.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { INDUSTRY_LABEL } from "@/lib/toolCatalog";
import { profileFor } from "@/lib/leakEngine";
import { runCannabisBrain } from "@/lib/intelligence";
import { BRANDS } from "@/config/brands";

const HEALTHCARE_TERMS = [
  /\bpatient[s]?\b/i,
  /\bhealthcare\b/i,
  /\bclinical\b/i,
  /\bclinic\b/i,
  /\binsurance claim/i,
  /\breimbursement[s]?\b/i,
  /\bappointment[s]?\b/i,
  /\bprovider[s]?\b/i,
  /\bHIPAA\b/i,
];

describe("Industry Logic Final QA — customer-facing labels", () => {
  it("cannabis label reads as cannabis/MMJ/Rec, not as medical/healthcare", () => {
    const label = INDUSTRY_LABEL.mmj_cannabis;
    expect(label.toLowerCase()).toContain("cannabis");
    // Must include MMJ or Rec framing so 'medical' isn't read as healthcare.
    expect(/mmj|rec/i.test(label)).toBe(true);
    for (const t of HEALTHCARE_TERMS) expect(t.test(label)).toBe(false);
  });

  it("trades label uses 'Trades' framing for owner-facing surfaces", () => {
    expect(INDUSTRY_LABEL.trade_field_service.toLowerCase()).toContain("trade");
  });

  it("general/other fall back to general business framing", () => {
    expect(INDUSTRY_LABEL.general_service.toLowerCase()).toMatch(/general|mixed/);
    expect(INDUSTRY_LABEL.other.toLowerCase()).toMatch(/general|other/);
  });

  it("cannabis profile focus stays in regulated-retail framing", () => {
    const profile = profileFor("mmj_cannabis");
    expect(profile.label.toLowerCase()).toContain("cannabis");
    for (const t of HEALTHCARE_TERMS) {
      expect(t.test(profile.label)).toBe(false);
      expect(t.test(profile.focus)).toBe(false);
    }
  });
});

describe("Industry Logic Final QA — cannabis brain output stays cannabis-retail", () => {
  it("never emits healthcare/patient/insurance/clinical terms", () => {
    const out = runCannabisBrain({
      industry: "mmj_cannabis",
      industryConfirmed: true,
      industryData: {
        cannabis: {
          grossMarginPct: 0.3,
          deadStockValue: 12000,
          stockoutCount: 4,
          discountImpactPct: 0.2,
          shrinkagePct: 0.05,
          paymentReconciliationGap: true,
        },
      },
    });
    expect(out.leaks.length).toBeGreaterThan(0);
    for (const leak of out.leaks) {
      const blob = `${leak.message} ${leak.recommended_fix}`;
      for (const t of HEALTHCARE_TERMS) {
        expect(t.test(blob), `cannabis leak contains ${t}: ${blob}`).toBe(false);
      }
    }
  });
});

describe("Industry Logic Final QA — third-party brand names exact", () => {
  it("BRANDS dictionary uses official capitalization", () => {
    expect(BRANDS.quickbooks).toBe("QuickBooks");
    expect(BRANDS.freshbooks).toBe("FreshBooks");
    expect(BRANDS.paypal).toBe("PayPal");
    expect(BRANDS.hubspot).toBe("HubSpot");
    expect(BRANDS.serviceTitan).toBe("ServiceTitan");
    expect(BRANDS.housecallPro).toBe("Housecall Pro");
    expect(BRANDS.googleAnalytics).toBe("Google Analytics");
    expect(BRANDS.metaAds).toBe("Meta Ads");
  });
});

describe("Industry Logic Final QA — five official gears preserved", () => {
  const canonical = [
    "Demand Generation",
    "Revenue Conversion",
    "Operational Efficiency",
    "Financial Visibility",
    "Owner Independence",
  ];

  it("diagnostic-ai-followup prompt references all five gear names", () => {
    const src = readFileSync(
      resolve(process.cwd(), "supabase/functions/diagnostic-ai-followup/index.ts"),
      "utf8",
    );
    for (const g of canonical) expect(src).toContain(g);
  });
});