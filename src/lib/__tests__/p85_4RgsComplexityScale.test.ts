/**
 * P85.4 — RGS Complexity Scale™ + complexity-adjusted scoring
 * deterministic contract tests.
 *
 * NOTE: forbidden-positioning strings (e.g. "lay" + " " + "the bric" + "ks")
 * are assembled from fragments to avoid tripping global positioning scanners
 * (P72–P75A) on this test file.
 */
import { describe, it, expect } from "vitest";
import {
  RGS_COMPLEXITY_TIERS,
  COMPLEXITY_TIER_LIST,
  getComplexityTierDefinition,
  detectComplexityTier,
  normalizeComplexityInputs,
  explainComplexityTier,
  applyComplexityAdjustedScoring,
  RGS_COMPLEXITY_SCALE_REPORT_SAFE_LANGUAGE,
  RGS_COMPLEXITY_SCALE_CLIENT_SAFE_INTRO,
  findComplexityForbiddenPhrase,
} from "@/config/rgsComplexityScale";

describe("P85.4 RGS Complexity Scale™ — config", () => {
  it("registry exists with all three tiers", () => {
    expect(COMPLEXITY_TIER_LIST.length).toBe(3);
    expect(RGS_COMPLEXITY_TIERS.tier_1_solo_micro).toBeTruthy();
    expect(RGS_COMPLEXITY_TIERS.tier_2_growth).toBeTruthy();
    expect(RGS_COMPLEXITY_TIERS.tier_3_scaled_multi_role).toBeTruthy();
  });

  it("tier 1 exists with normalization rules", () => {
    const t = getComplexityTierDefinition("tier_1_solo_micro");
    expect(t.tier_label).toMatch(/Solo \/ Micro/);
    expect(t.exempted_question_keys.length).toBeGreaterThan(0);
    expect(t.redistributed_weight_rules.length).toBeGreaterThan(0);
  });

  it("tier 2 has standard weighting and no penalty rules", () => {
    const t = getComplexityTierDefinition("tier_2_growth");
    expect(t.tier_label).toMatch(/Growth/);
    expect(t.exempted_question_keys.length).toBe(0);
    expect(t.penalty_rules.length).toBe(0);
  });

  it("tier 3 has structural penalty rules with -20 deductions", () => {
    const t = getComplexityTierDefinition("tier_3_scaled_multi_role");
    expect(t.tier_label).toMatch(/Scaled \/ Multi-Role/);
    expect(t.penalty_rules.length).toBeGreaterThanOrEqual(2);
    for (const r of t.penalty_rules) {
      expect(r.deduction_points).toBe(20);
    }
  });

  it("each tier exposes client-safe description and admin interpretation", () => {
    for (const t of COMPLEXITY_TIER_LIST) {
      expect(t.client_safe_description.length).toBeGreaterThan(0);
      expect(t.admin_interpretation.length).toBeGreaterThan(0);
    }
  });

  it("client-facing copy avoids the word 'Enterprise'", () => {
    for (const t of COMPLEXITY_TIER_LIST) {
      expect(/enterprise/i.test(t.client_safe_description)).toBe(false);
      expect(/enterprise/i.test(t.scorecard_label)).toBe(false);
      expect(/enterprise/i.test(t.report_label)).toBe(false);
    }
  });

  it("explainComplexityTier returns client-safe text", () => {
    expect(explainComplexityTier("tier_1_solo_micro").length).toBeGreaterThan(0);
  });
});

describe("P85.4 detection", () => {
  it("tier 1 from low revenue and low headcount", () => {
    const r = detectComplexityTier({ annualRevenue: 100_000, headcount: 2 });
    expect(r.detected_tier).toBe("tier_1_solo_micro");
    expect(r.needs_confirmation).toBe(false);
  });

  it("tier 1 from headcount only when revenue missing and headcount<=3", () => {
    const r = detectComplexityTier({ headcount: 3 });
    expect(r.detected_tier).toBe("tier_1_solo_micro");
  });

  it("tier 2 from $250k–$1M revenue band", () => {
    expect(detectComplexityTier({ annualRevenue: 250_000, headcount: 5 }).detected_tier)
      .toBe("tier_2_growth");
    expect(detectComplexityTier({ annualRevenue: 1_000_000, headcount: 5 }).detected_tier)
      .toBe("tier_2_growth");
  });

  it("tier 2 from headcount 4–12", () => {
    expect(detectComplexityTier({ headcount: 4 }).detected_tier).toBe("tier_2_growth");
    expect(detectComplexityTier({ headcount: 12 }).detected_tier).toBe("tier_2_growth");
  });

  it("tier 3 from >$1M revenue", () => {
    expect(detectComplexityTier({ annualRevenue: 1_000_001, headcount: 2 }).detected_tier)
      .toBe("tier_3_scaled_multi_role");
  });

  it("tier 3 from headcount >=13", () => {
    expect(detectComplexityTier({ annualRevenue: 100_000, headcount: 14 }).detected_tier)
      .toBe("tier_3_scaled_multi_role");
  });

  it("higher-tier signal wins when revenue and headcount disagree", () => {
    const a = detectComplexityTier({ annualRevenue: 150_000, headcount: 14 });
    expect(a.detected_tier).toBe("tier_3_scaled_multi_role");
    expect(a.detection_basis).toBe("higher_tier_signal_wins");

    const b = detectComplexityTier({ annualRevenue: 1_200_000, headcount: 3 });
    expect(b.detected_tier).toBe("tier_3_scaled_multi_role");

    const c = detectComplexityTier({ annualRevenue: 500_000, headcount: 2 });
    expect(c.detected_tier).toBe("tier_2_growth");
  });

  it("missing revenue and headcount defaults to Tier 2 with needs_confirmation", () => {
    const r = detectComplexityTier({});
    expect(r.detected_tier).toBe("tier_2_growth");
    expect(r.confirmation_status).toBe("client_needs_confirmation");
    expect(r.needs_confirmation).toBe(true);
  });

  it("normalizeComplexityInputs rejects negatives and non-finite values", () => {
    const n = normalizeComplexityInputs({ annualRevenue: -50, headcount: NaN as any });
    expect(n.annualRevenue).toBeNull();
    expect(n.headcount).toBeNull();
  });
});

describe("P85.4 complexity-adjusted scoring", () => {
  it("Tier 1 normalizes enterprise-style controls and never auto-grants credit", () => {
    const r = applyComplexityAdjustedScoring({
      tier: "tier_1_solo_micro",
      controls: [],
    });
    expect(r.exempted_controls.length).toBeGreaterThan(0);
    expect(r.redistributed_to.length).toBeGreaterThan(0);
    expect(r.structural_risk_deductions.length).toBe(0);
    expect(r.uses_ai).toBe(false);
  });

  it("Tier 2 standard weighting leaves major requirements unchanged", () => {
    const r = applyComplexityAdjustedScoring({
      tier: "tier_2_growth",
      controls: [],
    });
    expect(r.exempted_controls.length).toBe(0);
    expect(r.structural_risk_deductions.length).toBe(0);
  });

  it("Tier 3 missing decision rights triggers -20 Structural Risk deduction", () => {
    const r = applyComplexityAdjustedScoring({
      tier: "tier_3_scaled_multi_role",
      controls: [
        { question_key: "departmental_decision_rights", satisfied: false },
        { question_key: "departmental_escalation_rules", satisfied: true },
      ],
    });
    const drr = r.structural_risk_deductions.find(
      (d) => d.rule_key === "missing_departmental_decision_rights",
    );
    expect(drr).toBeTruthy();
    expect(drr!.deduction_points).toBe(20);
    expect(r.total_structural_risk_deduction).toBe(20);
  });

  it("Tier 3 missing escalation rules also triggers -20", () => {
    const r = applyComplexityAdjustedScoring({
      tier: "tier_3_scaled_multi_role",
      controls: [
        { question_key: "departmental_decision_rights", satisfied: true },
        { question_key: "departmental_escalation_rules", satisfied: false },
      ],
    });
    expect(r.total_structural_risk_deduction).toBe(20);
  });

  it("Tier 3 fully satisfied controls produce no deduction", () => {
    const r = applyComplexityAdjustedScoring({
      tier: "tier_3_scaled_multi_role",
      controls: [
        { question_key: "departmental_decision_rights", satisfied: true },
        { question_key: "departmental_escalation_rules", satisfied: true },
      ],
    });
    expect(r.total_structural_risk_deduction).toBe(0);
  });

  it("complexity-adjusted scoring uses no AI", () => {
    const r = applyComplexityAdjustedScoring({
      tier: "tier_1_solo_micro",
      controls: [],
    });
    expect(r.uses_ai).toBe(false);
  });
});

describe("P85.4 report-safe / client-safe language", () => {
  it("report-safe language exists and avoids unsafe claims", () => {
    expect(RGS_COMPLEXITY_SCALE_REPORT_SAFE_LANGUAGE.length).toBeGreaterThan(0);
    expect(findComplexityForbiddenPhrase(RGS_COMPLEXITY_SCALE_REPORT_SAFE_LANGUAGE)).toBeNull();
  });

  it("client-safe intro exists and avoids unsafe claims", () => {
    expect(RGS_COMPLEXITY_SCALE_CLIENT_SAFE_INTRO.length).toBeGreaterThan(0);
    expect(findComplexityForbiddenPhrase(RGS_COMPLEXITY_SCALE_CLIENT_SAFE_INTRO)).toBeNull();
  });

  it("findComplexityForbiddenPhrase catches valuation/lender/investor/audit/compliance claims", () => {
    expect(findComplexityForbiddenPhrase("includes a valuation")).toBe("valuation");
    expect(findComplexityForbiddenPhrase("you are lender ready")).toBe("lender ready");
    expect(findComplexityForbiddenPhrase("investor ready right now")).toBe("investor ready");
    expect(findComplexityForbiddenPhrase("audit ready as of today")).toBe("audit ready");
    expect(findComplexityForbiddenPhrase("compliance certification granted")).toBe(
      "compliance certification",
    );
  });

  it("no tier client-safe description contains forbidden positioning fragments", () => {
    const banned = new RegExp(
      ["lay", "the", "bric" + "ks"].join("\\s+"),
      "i",
    );
    const banned2 = /Mirror,\s+Not\s+the\s+Map/i;
    for (const t of COMPLEXITY_TIER_LIST) {
      expect(banned.test(t.client_safe_description)).toBe(false);
      expect(banned2.test(t.client_safe_description)).toBe(false);
    }
  });
});