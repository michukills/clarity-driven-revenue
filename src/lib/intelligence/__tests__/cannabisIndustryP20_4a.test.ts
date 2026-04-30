// P20.4a — Cannabis / MMC industry correction guardrails.
//
// Verifies that the mmj_cannabis vertical is treated as regulated
// cannabis retail (inventory / product / category / margin / payment),
// NOT as a healthcare practice. No patients, claims, reimbursements,
// providers, appointments, or clinical billing should leak into this
// industry's brain output, data map, tool coverage map, or labels.

import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import {
  routeBrain,
  dataMapFor,
  toolsForIndustry,
  clientVisibleToolsForIndustry,
  runCannabisBrain,
} from "@/lib/intelligence";
import { profileFor } from "@/lib/leakEngine";

const HEALTHCARE_TERMS = [
  /\bpatient[s]?\b/i,
  /\bappointment[s]?\b/i,
  /\bprovider[s]?\b/i,
  /\binsurance\b/i,
  /\bclaim[s]?\b/i,
  /\breimbursement[s]?\b/i,
  /\bencounter[s]?\b/i,
  /\bvisit[s]?\b/i,
  /\bbillable[_\s]?service[s]?\b/i,
  /\bunbilled[_\s]?service[s]?\b/i,
  /\bclinical\b/i,
  /\btreatment[s]?\b/i,
  /\bdiagnosis|diagnoses\b/i,
  /\bhealthcare\b/i,
];

function expectNoHealthcareTerms(text: string, where: string) {
  for (const pat of HEALTHCARE_TERMS) {
    expect(pat.test(text), `${where} contains banned healthcare term ${pat}`).toBe(false);
  }
}

describe("P20.4a — Cannabis / MMC label and profile", () => {
  it("uses cannabis label, not medical/healthcare", () => {
    const profile = profileFor("mmj_cannabis");
    expect(profile.label.toLowerCase()).toContain("cannabis");
    expectNoHealthcareTerms(profile.label, "profile.label");
    expectNoHealthcareTerms(profile.focus, "profile.focus");
    for (const issue of profile.commonIssues) {
      expectNoHealthcareTerms(issue, `profile.commonIssues: ${issue}`);
    }
    for (const v of Object.values(profile.recommendationOverrides)) {
      expectNoHealthcareTerms(v, `recommendationOverrides: ${v}`);
    }
  });
});

describe("P20.4a — Cannabis / MMC data map", () => {
  const map = dataMapFor("mmj_cannabis");

  it("includes cannabis retail / inventory / margin / payment fields", () => {
    const fields = map.map((f) => f.field);
    for (const required of [
      "daily_sales",
      "product_sales",
      "category_sales",
      "inventory_quantity",
      "inventory_value",
      "product_sku",
      "category",
      "cost_of_goods",
      "gross_margin",
    ]) {
      expect(fields).toContain(required);
    }
  });

  it("does NOT include any healthcare fields", () => {
    for (const f of map) {
      expectNoHealthcareTerms(f.field, `dataMap field ${f.field}`);
      if (f.notes) expectNoHealthcareTerms(f.notes, `dataMap notes for ${f.field}`);
    }
  });
});

describe("P20.4a — Cannabis / MMC tool coverage", () => {
  it("required_data references cannabis retail fields, not healthcare", () => {
    const tools = toolsForIndustry("mmj_cannabis");
    expect(tools.length).toBeGreaterThan(0);
    for (const t of tools) {
      for (const rd of t.required_data) {
        expectNoHealthcareTerms(rd, `tool ${t.tool_key} required_data ${rd}`);
      }
    }
    // Admin-only tools must remain admin-only.
    expect(tools.find((t) => t.tool_key === "revenue_leak_finder")?.visibility).toBe(
      "admin_only",
    );
    // At least one client-visible tool exists when industry is confirmed.
    expect(clientVisibleToolsForIndustry("mmj_cannabis").length).toBeGreaterThan(0);
  });
});

describe("P20.4a — Cannabis brain output", () => {
  it("emits cannabis retail leak types, never healthcare leak types", () => {
    const out = routeBrain({
      industry: "mmj_cannabis",
      industryConfirmed: true,
      industryData: {
        cannabis: {
          grossMarginPct: 0.3,
          deadStockValue: 15000,
          stockoutCount: 5,
          discountImpactPct: 0.22,
          promotionImpactPct: 0.15,
          vendorCostIncreasePct: 0.09,
          categoryMarginVisible: false,
          productMarginVisible: false,
          shrinkagePct: 0.06,
          hasDailyOrWeeklyReporting: false,
          usesManualPosWorkaround: true,
          paymentReconciliationGap: true,
          inventoryTurnover: 2,
          highSalesLowMarginCount: 3,
        },
      },
    });

    const types = out.industryLeaks.map((l) => l.type);
    for (const expected of [
      "high_sales_weak_margin",
      "dead_inventory",
      "stockout_on_profitable_product",
      "discount_eroding_margin",
      "promotion_eroding_margin",
      "vendor_cost_increase_not_reflected",
      "no_category_margin_tracking",
      "no_product_margin_tracking",
      "shrinkage_or_waste_not_tracked",
      "no_daily_or_weekly_reporting_rhythm",
      "manual_pos_or_spreadsheet_workaround",
      "payment_reconciliation_gap",
      "cash_tied_up_in_slow_stock",
    ]) {
      expect(types).toContain(expected);
    }

    for (const banned of [
      "services_not_billed",
      "delayed_claims_or_billing",
      "reimbursement_delays",
      "incomplete_follow_up",
      "appointment_to_billing_lag",
    ]) {
      expect(types).not.toContain(banned);
    }

    for (const l of out.industryLeaks) {
      expectNoHealthcareTerms(l.message, `leak.message ${l.type}`);
      expectNoHealthcareTerms(l.recommended_fix, `leak.recommended_fix ${l.type}`);
    }
  });

  it("differs from generic retail (cannabis ids are namespaced and label-specific)", () => {
    const out = runCannabisBrain({
      industry: "mmj_cannabis",
      industryConfirmed: true,
      industryData: { cannabis: { deadStockValue: 5000 } },
    });
    expect(out.brain).toBe("mmj_cannabis");
    expect(out.leaks.every((l) => l.id.startsWith("cannabis:"))).toBe(true);
  });
});

describe("P20.4a — Source-file scan: cannabis brain holds no healthcare logic", () => {
  it("medicalMmc.ts only contains cannabis-retail logic", () => {
    const src = readFileSync("src/lib/intelligence/industryBrains/medicalMmc.ts", "utf8");
    // Comments may reference the historical name; logic strings (recommended_fix
    // / message templates) must not include healthcare nouns.
    const banned = [
      /encounter\s*→\s*claim/i,
      /unfunded visits/i,
      /reimbursement timelines/i,
      /patients\/customers/i,
      /audit denials and resubmissions/i,
      /payers\b/i,
    ];
    for (const b of banned) {
      expect(b.test(src), `medicalMmc.ts must not contain ${b}`).toBe(false);
    }
  });
});