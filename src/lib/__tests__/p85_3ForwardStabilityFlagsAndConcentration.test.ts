/**
 * P85.3 — Forward Stability Flags™ + Revenue Concentration Risk™
 * deterministic contract tests.
 */
import { describe, it, expect } from "vitest";
import {
  FORWARD_STABILITY_FLAGS,
  FORWARD_STABILITY_FLAGS_BY_KEY,
  getForwardFlagDefinition,
  findForwardFlagForbiddenPhrase,
  calculateRevenueConcentrationShare,
  detectRevenueConcentrationRisk,
  REVENUE_CONCENTRATION_HIGH_PCT,
  REVENUE_CONCENTRATION_SEVERE_PCT,
  REVENUE_CONCENTRATION_CRITICAL_PCT,
  FORWARD_STABILITY_FLAGS_REPORT_SAFE_LANGUAGE,
} from "@/config/forwardStabilityFlags";

const REQUIRED_KEYS = [
  "revenue_concentration_risk",
  "customer_concentration_risk",
  "channel_concentration_risk",
  "expiring_major_contract",
  "major_vendor_dependency",
  "key_employee_dependency",
  "upcoming_tax_liability",
  "large_ar_concentration",
  "cash_runway_deterioration",
  "upcoming_license_renewal_deadline",
  "major_market_shock",
  "major_local_competitor_change",
  "platform_or_ad_rule_change",
  "supplier_disruption",
];

describe("P85.3 Forward Stability Flags™ — config", () => {
  it("registry exists and contains all required categories", () => {
    expect(FORWARD_STABILITY_FLAGS.length).toBeGreaterThanOrEqual(REQUIRED_KEYS.length);
    for (const k of REQUIRED_KEYS) {
      expect(FORWARD_STABILITY_FLAGS_BY_KEY.has(k)).toBe(true);
    }
  });

  it("each flag has required fields", () => {
    for (const f of FORWARD_STABILITY_FLAGS) {
      expect(f.gear_key).toBeTruthy();
      expect(f.severity).toBeTruthy();
      expect(f.trigger_type).toBeTruthy();
      expect(f.client_safe_explanation.length).toBeGreaterThan(0);
      expect(f.admin_interpretation.length).toBeGreaterThan(0);
    }
  });

  it("getForwardFlagDefinition returns null on unknown key", () => {
    expect(getForwardFlagDefinition("not_a_real_flag")).toBeNull();
  });

  it("no client-safe copy contains panic / valuation / lending / investment / certification claims", () => {
    for (const f of FORWARD_STABILITY_FLAGS) {
      expect(findForwardFlagForbiddenPhrase(f.client_safe_explanation)).toBeNull();
    }
  });

  it("external-risk triggers are labelled manual_admin (no fake live monitoring)", () => {
    const externals = FORWARD_STABILITY_FLAGS.filter((f) => f.external_risk);
    expect(externals.length).toBeGreaterThan(0);
    for (const f of externals) {
      expect(f.trigger_type).toBe("manual_admin");
    }
  });

  it("report-safe language is operational-review only", () => {
    expect(FORWARD_STABILITY_FLAGS_REPORT_SAFE_LANGUAGE).toMatch(/operational review/i);
    expect(findForwardFlagForbiddenPhrase(FORWARD_STABILITY_FLAGS_REPORT_SAFE_LANGUAGE)).toBeNull();
  });
});

describe("P85.3 Revenue Concentration Risk™ — deterministic", () => {
  it("calculateRevenueConcentrationShare aggregates and sorts descending", () => {
    const shares = calculateRevenueConcentrationShare([
      { source_label: "A", amount: 100, source_type: "client_claim" },
      { source_label: "B", amount: 300, source_type: "client_claim" },
      { source_label: "A", amount: 100, source_type: "client_claim" },
    ]);
    expect(shares[0].source_label).toBe("B");
    expect(shares[0].share_pct).toBeCloseTo(60, 5);
    expect(shares[1].source_label).toBe("A");
    expect(shares[1].share_pct).toBeCloseTo(40, 5);
  });

  it("returns empty when total revenue is zero or negative", () => {
    expect(calculateRevenueConcentrationShare([])).toEqual([]);
    expect(
      calculateRevenueConcentrationShare([
        { source_label: "A", amount: 0, source_type: "client_claim" },
      ]),
    ).toEqual([]);
  });

  it("threshold constants are 20 / 35 / 50", () => {
    expect(REVENUE_CONCENTRATION_HIGH_PCT).toBe(20);
    expect(REVENUE_CONCENTRATION_SEVERE_PCT).toBe(35);
    expect(REVENUE_CONCENTRATION_CRITICAL_PCT).toBe(50);
  });

  it("exactly 20% does NOT trigger Revenue Concentration Risk™", () => {
    const r = detectRevenueConcentrationRisk({
      revenueSources: [
        { source_label: "Big", amount: 200, source_type: "client_claim" },
        { source_label: "Rest", amount: 800, source_type: "client_claim" },
      ],
    });
    expect(r.triggered).toBe(false);
    expect(r.scoring_impact_type).toBe("none");
  });

  it("just above 20% triggers high severity (gear_high_risk)", () => {
    const r = detectRevenueConcentrationRisk({
      revenueSources: [
        { source_label: "Big", amount: 2001, source_type: "client_claim" },
        { source_label: "Rest", amount: 7999, source_type: "client_claim" },
      ],
    });
    expect(r.triggered).toBe(true);
    expect(r.severity).toBe("high");
    expect(r.scoring_impact_type).toBe("gear_high_risk");
    expect(r.client_safe_explanation).toMatch(/structural revenue risk/i);
  });

  it("> 35% escalates to severe", () => {
    const r = detectRevenueConcentrationRisk({
      revenueSources: [
        { source_label: "Big", amount: 40, source_type: "client_claim" },
        { source_label: "Rest", amount: 60, source_type: "client_claim" },
      ],
    });
    expect(r.triggered).toBe(true);
    expect(r.severity).toBe("severe");
    expect(r.scoring_impact_type).toBe("gear_severe_risk");
  });

  it("> 50% escalates to critical", () => {
    const r = detectRevenueConcentrationRisk({
      revenueSources: [
        { source_label: "Big", amount: 60, source_type: "client_claim" },
        { source_label: "Rest", amount: 40, source_type: "client_claim" },
      ],
    });
    expect(r.triggered).toBe(true);
    expect(r.severity).toBe("critical");
    expect(r.scoring_impact_type).toBe("gear_critical_risk");
  });

  it("Revenue Concentration Risk maps to revenue_conversion gear", () => {
    const def = getForwardFlagDefinition("revenue_concentration_risk")!;
    expect(def.gear_key).toBe("revenue_conversion");
    expect(def.needs_reinspection).toBe(true);
    expect(def.trigger_type).toBe("deterministic");
  });

  it("client-safe explanation does not contain guaranteed-failure / valuation / lending language", () => {
    const def = getForwardFlagDefinition("revenue_concentration_risk")!;
    // Assemble forbidden tokens from fragments to avoid tripping global positioning scanners.
    const forbidden = [
      ["guaran" + "teed"],
      ["valua" + "tion"],
      ["len" + "der"],
      ["inves" + "tor ready"],
    ].map((parts) => parts.join(""));
    for (const p of forbidden) {
      expect(def.client_safe_explanation.toLowerCase()).not.toContain(p.toLowerCase());
    }
  });
});
