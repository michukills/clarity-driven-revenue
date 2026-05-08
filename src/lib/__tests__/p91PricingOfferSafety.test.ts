import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  EXACT_CHECKOUT_FLOWS,
  FOUNDING_CLIENT_PRICING,
  OFFER_BOUNDARY_COPY,
  PUBLIC_PRICING_SUMMARY,
  RGS_APPROVED_POSITIONING_SENTENCE,
  RGS_PRICING_TIERS,
  SAFE_REPLACEMENT_COST_POSITIONING,
  STANDALONE_DELIVERABLE_PRICING,
  getAdminPricingReference,
  getClientSafePricingReference,
} from "@/config/rgsPricingTiers";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const activePricingSurfaceFiles = [
  "src/config/rgsPricingTiers.ts",
  "src/pages/Index.tsx",
  "src/pages/Diagnostic.tsx",
  "src/pages/DiagnosticApply.tsx",
  "src/pages/Implementation.tsx",
  "src/pages/RevenueControlSystem.tsx",
  "src/pages/admin/Offers.tsx",
  "src/components/admin/RgsPricingReferencePanel.tsx",
  "src/pages/admin/StandaloneToolRunner.tsx",
];

const activePricingSurfaceText = () =>
  activePricingSurfaceFiles.map((file) => read(file)).join("\n");

function clientSafeBlob(): string {
  return JSON.stringify(getClientSafePricingReference()).toLowerCase();
}

function removeSafeNegations(text: string): string {
  return text
    .replace(/does not (?:guarantee|promise|replace)[^."]+/gi, "")
    .replace(/do not (?:say|claim|present|sell|promise)[^."]+/gi, "")
    .replace(/not (?:a |the |an )?[^."]*(?:guarantee|certification|review|advice|operator|checkout|included)[^."]*/gi, "")
    .replace(/no (?:promised|promise|outcome|open-ended|legal|tax|accounting|hr|payroll|investment-duty|valuation|compliance)[^."]*/gi, "");
}

const unsafeClaimPatterns = [
  /compliance certified/i,
  /legally compliant/i,
  /license protection/i,
  /audit-ready/i,
  /audit guaranteed/i,
  /lender ready/i,
  /investor ready/i,
  /valuation ready/i,
  /tax compliance/i,
  /legal compliance/i,
  /fully verified green/i,
  /recover 10 hours guaranteed/i,
  /worth 2x/i,
  /worth 3x/i,
  /done-for-you operator/i,
  /we run your business/i,
  /guaranteed (?:results|revenue|growth|outcomes?|testimonial|case study)/i,
  /safe from penalties/i,
  /enforcement protection/i,
];

describe("P91 — complexity-based pricing config", () => {
  it("pricing tiers exist for Solo / Micro, Growth, and Scaled / Multi-Role", () => {
    expect(RGS_PRICING_TIERS.map((tier) => tier.tier_key)).toEqual([
      "tier_1_solo_micro",
      "tier_2_growth",
      "tier_3_scaled_multi_role",
    ]);
  });

  it("each tier has Diagnostic, Implementation, and RGS Control System pricing guidance", () => {
    for (const tier of RGS_PRICING_TIERS) {
      expect(tier.pricing.diagnostic.display).toBeTruthy();
      expect(tier.pricing.implementation.display).toBeTruthy();
      expect(tier.pricing.rgs_control_system.display).toBeTruthy();
      expect(tier.price_factors.length).toBeGreaterThanOrEqual(5);
      expect(tier.scope_notes.length).toBeGreaterThan(0);
      expect(tier.safety_disclaimers.length).toBeGreaterThan(0);
    }
  });

  it("ties pricing to complexity inputs and review depth", () => {
    const blob = JSON.stringify(RGS_PRICING_TIERS).toLowerCase();
    for (const required of [
      "headcount",
      "locations",
      "industry risk",
      "evidence",
      "implementation depth",
      "systems/tools",
      "hitl",
      "reporting depth",
      "monitoring needs",
    ]) {
      expect(blob).toContain(required);
    }
  });

  it("Founding Client / Beta Partner pricing exists and is clearly marked", () => {
    expect(FOUNDING_CLIENT_PRICING.visibility).toBe("founding_client_only");
    expect(FOUNDING_CLIENT_PRICING.diagnostic.display).toMatch(/\$1,500-\$2,500/);
    expect(FOUNDING_CLIENT_PRICING.implementation.display).toMatch(/\$7,500-\$10,000/);
    expect(FOUNDING_CLIENT_PRICING.rgs_control_system.display).toMatch(/\$1,000-\$1,500\/month/);
  });

  it("founding pricing does not require or promise testimonial, case study, or outcome", () => {
    const text = JSON.stringify(FOUNDING_CLIENT_PRICING).toLowerCase();
    expect(text).toContain("testimonial rights only if ethically and contractually approved");
    expect(text).toContain("permissioned and anonymized case-study material only where approved");
    expect(text).not.toMatch(/guaranteed testimonial|guaranteed case|guaranteed outcome|pay for results|lifetime pricing/);
  });
});

describe("P91 — offer boundary safety", () => {
  it("Diagnostic copy does not imply implementation or ongoing support is included", () => {
    const diagnostic = OFFER_BOUNDARY_COPY.diagnostic;
    expect(diagnostic.includes.join(" ")).toMatch(/0-1000 Business Stability Scorecard/);
    expect(diagnostic.excludes).toContain("implementation");
    expect(diagnostic.excludes).toContain("continuous monitoring");
    expect(diagnostic.transition_copy).toMatch(/Implementation project with a defined scope/);
  });

  it("Implementation copy does not imply indefinite support or RGS acting as operator", () => {
    const implementation = OFFER_BOUNDARY_COPY.implementation;
    expect(implementation.public_summary).toMatch(/Project-based system installation support/);
    expect(implementation.excludes).toContain("indefinite advisory access");
    expect(implementation.excludes).toContain("RGS acting as operator");
  });

  it("RGS Control System copy stays visibility and guided independence", () => {
    const control = OFFER_BOUNDARY_COPY.rgs_control_system;
    expect(control.public_summary).toMatch(/ongoing visibility/);
    expect(control.public_summary).toMatch(/Revenue Control System lives inside/);
    expect(control.excludes).toContain("emergency support");
    expect(control.excludes).toContain("execution inside the business");
  });

  it("Standalone deliverable copy does not imply full Diagnostic access", () => {
    const standalone = OFFER_BOUNDARY_COPY.standalone_deliverable;
    expect(standalone.public_summary).toMatch(/limited-scope output/);
    expect(standalone.excludes.join(" ")).toMatch(/Full Diagnostic access unless purchased separately/);
    expect(standalone.excludes.join(" ")).toMatch(/Implementation unless purchased separately/);
  });

  it("safe sales transition and replacement-cost positioning are present", () => {
    expect(OFFER_BOUNDARY_COPY.diagnostic.transition_copy).toBe(
      "The Diagnostic shows where the system is slipping. If you want help installing the repair map, that becomes an Implementation project with a defined scope, timeline, and deliverables.",
    );
    expect(SAFE_REPLACEMENT_COST_POSITIONING).toMatch(/not a COO/);
    expect(SAFE_REPLACEMENT_COST_POSITIONING).not.toMatch(/replaces a COO|same as hiring a COO|cheaper than a COO/i);
  });
});

describe("P91 — standalone deliverable pricing", () => {
  it("standalone deliverable pricing framework contains all required entry offers", () => {
    expect(STANDALONE_DELIVERABLE_PRICING.map((d) => d.key)).toEqual([
      "sop_training_bible_draft",
      "owner_time_audit",
      "lead_tracking_revenue_leak_review",
      "operational_leakage_snapshot",
      "cannabis_operational_documentation_readiness_snapshot",
      "trades_dispatch_labor_leakage_snapshot",
    ]);
  });

  it("each standalone deliverable is bounded and honest about report workflow", () => {
    for (const item of STANDALONE_DELIVERABLE_PRICING) {
      expect(item.price.display).toMatch(/\$/);
      expect(item.client_safe_description).toBeTruthy();
      expect(item.scope_boundary).toBeTruthy();
      expect(["p90_report_workflow", "admin_review_only"]).toContain(item.report_workflow);
      expect(item.scope_boundary).not.toMatch(/full diagnostic access|implementation included|ongoing support included/i);
    }
  });

  it("cannabis standalone pricing is dispensary operations logic, not healthcare or legal-compliance conclusions", () => {
    const cannabis = STANDALONE_DELIVERABLE_PRICING.find((item) =>
      item.key.includes("cannabis"),
    );
    expect(cannabis?.client_safe_description).toMatch(/cannabis\/dispensary operations/i);
    expect(cannabis?.scope_boundary).toMatch(/qualified counsel\/compliance support where required/i);
    expect(JSON.stringify(cannabis).toLowerCase()).not.toMatch(/healthcare|patient|medical billing|legally compliant/);
  });
});

describe("P91 — checkout, public, and admin visibility safety", () => {
  it("exact checkout/buy language is limited to the wired diagnostic checkout", () => {
    const diagnosticFlow = EXACT_CHECKOUT_FLOWS.find((flow) => flow.offer_slug === "rgs_diagnostic_3000");
    expect(diagnosticFlow?.checkout_status).toBe("wired");
    expect(diagnosticFlow?.route).toBe("/diagnostic-apply");
    const diagnosticApply = read("src/pages/DiagnosticApply.tsx");
    expect(diagnosticApply).toContain("create-diagnostic-checkout");
    expect(diagnosticApply).toContain("Continue to Secure Payment");
    expect(read("src/pages/Implementation.tsx")).not.toContain("Continue to Secure Payment");
    expect(read("src/pages/RevenueControlSystem.tsx")).not.toContain("Continue to Secure Payment");
  });

  it("scope-based pricing uses honest starting/range/review language", () => {
    expect(PUBLIC_PRICING_SUMMARY.diagnostic).toMatch(/starts|often|start/i);
    expect(PUBLIC_PRICING_SUMMARY.implementation).toMatch(/range/i);
    expect(PUBLIC_PRICING_SUMMARY.rgs_control_system).toMatch(/depends|start/i);
    const combined = JSON.stringify(RGS_PRICING_TIERS);
    expect(combined).toMatch(/Final pricing depends on complexity/);
    expect(combined).toMatch(/Quoted after scope review/);
  });

  it("client-safe pricing output strips admin-only notes", () => {
    const client = JSON.stringify(getClientSafePricingReference()).toLowerCase();
    expect(client).not.toContain("admin_only_note");
    expect(client).not.toContain("quote carefully");
    expect(client).not.toContain("use sparingly for early proof-building");
    const admin = JSON.stringify(getAdminPricingReference()).toLowerCase();
    expect(admin).toContain("admin_only_note");
  });

  it("admin pricing reference panel is read-only and does not fake editable backend settings", () => {
    const panel = read("src/components/admin/RgsPricingReferencePanel.tsx");
    expect(panel).toContain("Read-only guidance");
    expect(panel).not.toMatch(/onChange=\{|supabase\.from\("pricing|updatePricing|savePricing/i);
    const offers = read("src/pages/admin/Offers.tsx");
    expect(offers).toContain("RgsPricingReferencePanel");
  });
});

describe("P91 — forbidden sales claim and positioning guards", () => {
  it("public/client-safe pricing copy has no unsafe sales claims", () => {
    const cleaned = removeSafeNegations(clientSafeBlob());
    for (const pattern of unsafeClaimPatterns) {
      expect(cleaned, `unsafe pattern ${pattern}`).not.toMatch(pattern);
    }
  });

  it("active pricing surfaces have no fake automation/live-sync/export claims", () => {
    const text = activePricingSurfaceText();
    expect(text).not.toMatch(/fake automation|automatic insight from every tool|live sync pricing|live-sync pricing/i);
    expect(text).not.toMatch(/export included|download included|pdf included/i);
  });

  it("approved positioning sentence exists and deprecated brick wording does not appear", () => {
    expect(RGS_APPROVED_POSITIONING_SENTENCE).toBe(
      "RGS builds the operating structure owners use to see what is slipping, decide what to fix, and run the business with more control.",
    );

    const brickPhrase = ["lay", "the", "bric" + "ks"].join(" ");
    const deprecatedVariants = [
      ["RGS provides the blue", "print and teaches the owner to ", brickPhrase].join(""),
      ["blue", "print and teaches the owner to ", brickPhrase].join(""),
      ["teaches the owner to ", brickPhrase].join(""),
      brickPhrase,
    ];
    const text = activePricingSurfaceText();
    for (const phrase of deprecatedVariants) {
      expect(text.toLowerCase()).not.toContain(phrase.toLowerCase());
    }
  });

  it("affirmative legal, tax, accounting, professional-duty, valuation, and outcome claims are absent", () => {
    const cleaned = removeSafeNegations(clientSafeBlob());
    for (const pattern of [
      /legal advice included/i,
      /tax advice included/i,
      /accounting advice included/i,
      /professional-duty recommendation/i,
      /valuation ready/i,
      /business valuation included/i,
      /guaranteed outcome/i,
      /guaranteed results/i,
    ]) {
      expect(cleaned).not.toMatch(pattern);
    }
  });
});
