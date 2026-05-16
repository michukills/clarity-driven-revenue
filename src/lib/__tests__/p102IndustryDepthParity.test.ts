import { describe, it, expect } from "vitest";
import {
  auditBank,
  auditCalibration,
  getFindingCalibrations,
  INDUSTRY_BANKS,
  summarizeBank,
  REQUIRED_GEARS,
  UNSAFE_PHRASES,
} from "@/lib/industryDiagnostic";

/**
 * P102 — Industry Depth Parity Pass.
 *
 * Validates that Restaurants, Retail, and E-commerce now carry additional
 * failure-pattern calibrations covering the parity gaps called out by the
 * P98A audit, while preserving the existing full-depth contract.
 */

const TARGET_INDUSTRIES = [
  "restaurants_food_service",
  "retail_brick_mortar",
  "ecommerce_online_retail",
] as const;

const REQUIRED_NEW_CALIBRATIONS: Record<(typeof TARGET_INDUSTRIES)[number], string[]> = {
  restaurants_food_service: [
    "restaurants.cash_closeout_leak",
    "restaurants.review_flow_stall",
    "restaurants.recipe_drift",
    "restaurants.catering_followup_drop",
  ],
  retail_brick_mortar: [
    "retail.special_order_drop_off",
    "retail.display_cadence_stall",
  ],
  ecommerce_online_retail: [
    "ecom.stock_sync_risk",
    "ecom.channel_attribution_fog",
    "ecom.abandoned_cart_recovery_gap",
  ],
};

describe("P102 industry depth parity", () => {
  it.each(TARGET_INDUSTRIES)("preserves full-depth audit for %s", (industry) => {
    const audit = auditBank(INDUSTRY_BANKS[industry]);
    const errors = audit.issues.filter((i) => i.severity === "error");
    expect(errors, errors.map((e) => e.message).join("; ")).toHaveLength(0);
    expect(audit.meets_full_depth).toBe(true);
  });

  it.each(TARGET_INDUSTRIES)("covers all 5 RGS gears in the prompt bank for %s", (industry) => {
    const summary = summarizeBank(INDUSTRY_BANKS[industry]);
    for (const gear of REQUIRED_GEARS) {
      expect(summary.by_gear[gear], `${industry} gear ${gear}`).toBeGreaterThan(0);
    }
  });

  it.each(TARGET_INDUSTRIES)("registers all P102 parity calibrations for %s", (industry) => {
    const calibs = getFindingCalibrations(industry);
    const keys = new Set(calibs.map((c) => c.key));
    for (const required of REQUIRED_NEW_CALIBRATIONS[industry]) {
      expect(keys.has(required), `missing P102 calibration ${required}`).toBe(true);
    }
  });

  it.each(TARGET_INDUSTRIES)("every calibration for %s has a repair_map_trigger and maps to a real gear", (industry) => {
    const calibs = getFindingCalibrations(industry);
    expect(calibs.length).toBeGreaterThanOrEqual(12);
    for (const c of calibs) {
      expect(c.industry, c.key).toBe(industry);
      expect(c.repair_map_trigger, `${c.key} missing repair_map_trigger`).toBeTruthy();
      expect(REQUIRED_GEARS).toContain(c.gear);
      const issues = auditCalibration(c);
      expect(issues, issues.map((i) => i.message).join("; ")).toHaveLength(0);
    }
  });

  it.each(TARGET_INDUSTRIES)("client-safe explanations for %s never overclaim or guarantee outcomes", (industry) => {
    const calibs = getFindingCalibrations(industry);
    for (const c of calibs) {
      const blob = `${c.finding_title} ${c.client_safe_explanation} ${c.why_it_matters}`.toLowerCase();
      for (const phrase of UNSAFE_PHRASES) {
        expect(blob.includes(phrase), `${c.key} contains unsafe phrase "${phrase}"`).toBe(false);
      }
      // Report-safe language must hedge when evidence is missing.
      expect(c.evidence_missing_means.length).toBeGreaterThan(0);
    }
  });

  it("restaurants report language reflects restaurant-specific operations", () => {
    const calibs = getFindingCalibrations("restaurants_food_service");
    const blob = calibs.map((c) => `${c.finding_title} ${c.client_safe_explanation}`).join(" ").toLowerCase();
    for (const term of ["prime cost", "shift", "menu", "catering", "cash", "recipe", "review"]) {
      expect(blob, `restaurants missing "${term}"`).toContain(term);
    }
  });

  it("retail report language reflects retail-specific operations", () => {
    const calibs = getFindingCalibrations("retail_brick_mortar");
    const blob = calibs.map((c) => `${c.finding_title} ${c.client_safe_explanation}`).join(" ").toLowerCase();
    for (const term of ["inventory", "margin", "special order", "display", "shrink", "vendor"]) {
      expect(blob, `retail missing "${term}"`).toContain(term);
    }
  });

  it("e-commerce report language reflects e-commerce-specific operations", () => {
    const calibs = getFindingCalibrations("ecommerce_online_retail");
    const blob = calibs.map((c) => `${c.finding_title} ${c.client_safe_explanation}`).join(" ").toLowerCase();
    for (const term of ["checkout", "abandoned cart", "channel", "sync", "shipping", "return"]) {
      expect(blob, `e-commerce missing "${term}"`).toContain(term);
    }
  });
});
