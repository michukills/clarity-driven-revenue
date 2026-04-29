import { describe, it, expect } from "vitest";
import {
  industryAccessDecision,
  sameIndustryLearningDecision,
  crossIndustryLearningDecision,
  industrySpecificToolAllowed,
  anonymizeForCrossIndustry,
  INDUSTRY_PROFILE_TEMPLATES,
  INDUSTRY_DIAGNOSTIC_PROMPTS,
  DEFAULT_INDUSTRY_TOOL_ACCESS,
  ACTIVE_INDUSTRIES,
  REGULATED_INDUSTRIES,
} from "../industryGuardrails";

describe("industryAccessDecision", () => {
  it("denies when industry is missing", () => {
    const d = industryAccessDecision({ industry: null, industryConfirmed: false });
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe("industry_missing");
  });
  it("denies when industry is `other`", () => {
    const d = industryAccessDecision({ industry: "other", industryConfirmed: true });
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe("industry_other_restricted");
  });
  it("denies when industry is unconfirmed", () => {
    const d = industryAccessDecision({
      industry: "retail",
      industryConfirmed: false,
    });
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe("industry_unconfirmed");
    expect(d.warning).toMatch(/restricted until industry is confirmed/i);
  });
  it("allows confirmed real industries", () => {
    expect(
      industryAccessDecision({ industry: "retail", industryConfirmed: true }).allowed,
    ).toBe(true);
  });
  it("flags MMJ as regulated even when allowed", () => {
    const d = industryAccessDecision({
      industry: "mmj_cannabis",
      industryConfirmed: true,
    });
    expect(d.allowed).toBe(true);
    expect(d.reason).toBe("industry_confirmed_regulated");
    expect(d.warning).toMatch(/Regulated industry/i);
  });
});

describe("sameIndustryLearningDecision", () => {
  it("blocks when industry is missing/other/unconfirmed", () => {
    expect(
      sameIndustryLearningDecision({ industry: null, industryConfirmed: true }).allowed,
    ).toBe(false);
    expect(
      sameIndustryLearningDecision({
        industry: "other",
        industryConfirmed: true,
      }).allowed,
    ).toBe(false);
    expect(
      sameIndustryLearningDecision({
        industry: "retail",
        industryConfirmed: false,
      }).allowed,
    ).toBe(false);
  });
  it("allows confirmed real industries", () => {
    expect(
      sameIndustryLearningDecision({
        industry: "retail",
        industryConfirmed: true,
      }).allowed,
    ).toBe(true);
  });
});

describe("crossIndustryLearningDecision", () => {
  it("blocks when admin has not flagged cross-industry contribution", () => {
    const d = crossIndustryLearningDecision({
      industry: "retail",
      industryConfirmed: true,
      contributesCrossIndustry: false,
    });
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe("not_admin_approved_cross_industry");
  });
  it("blocks when industry is missing/other/unconfirmed", () => {
    expect(
      crossIndustryLearningDecision({
        industry: "other",
        industryConfirmed: true,
        contributesCrossIndustry: true,
      }).allowed,
    ).toBe(false);
    expect(
      crossIndustryLearningDecision({
        industry: null,
        industryConfirmed: false,
        contributesCrossIndustry: true,
      }).allowed,
    ).toBe(false);
  });
  it("blocks MMJ from cross-industry without explicit generalization approval", () => {
    const d = crossIndustryLearningDecision({
      industry: "mmj_cannabis",
      industryConfirmed: true,
      contributesCrossIndustry: true,
      generalizedApproval: false,
    });
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe("regulated_industry_requires_generalization");
  });
  it("allows MMJ cross-industry only when generalization is explicitly approved", () => {
    const d = crossIndustryLearningDecision({
      industry: "mmj_cannabis",
      industryConfirmed: true,
      contributesCrossIndustry: true,
      generalizedApproval: true,
    });
    expect(d.allowed).toBe(true);
  });
  it("allows non-regulated cross-industry when admin-approved", () => {
    const d = crossIndustryLearningDecision({
      industry: "retail",
      industryConfirmed: true,
      contributesCrossIndustry: true,
    });
    expect(d.allowed).toBe(true);
  });
});

describe("industrySpecificToolAllowed", () => {
  it("blocks MMJ tools for non-MMJ clients", () => {
    const d = industrySpecificToolAllowed({
      toolIndustry: "mmj_cannabis",
      customerIndustry: "retail",
      industryConfirmed: true,
    });
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe("industry_mismatch");
  });
  it("blocks retail-specific tools for restaurant clients", () => {
    expect(
      industrySpecificToolAllowed({
        toolIndustry: "retail",
        customerIndustry: "restaurant",
        industryConfirmed: true,
      }).allowed,
    ).toBe(false);
  });
  it("allows tool when industries match and customer industry is confirmed", () => {
    expect(
      industrySpecificToolAllowed({
        toolIndustry: "retail",
        customerIndustry: "retail",
        industryConfirmed: true,
      }).allowed,
    ).toBe(true);
  });
  it("blocks all industry-specific tools when customer industry is missing", () => {
    expect(
      industrySpecificToolAllowed({
        toolIndustry: "retail",
        customerIndustry: null,
        industryConfirmed: false,
      }).allowed,
    ).toBe(false);
  });
  it("admin override grant overrides industry mismatch", () => {
    expect(
      industrySpecificToolAllowed({
        toolIndustry: "mmj_cannabis",
        customerIndustry: "retail",
        industryConfirmed: true,
        hasClientGrantOverride: true,
      }).allowed,
    ).toBe(true);
  });
});

describe("anonymizeForCrossIndustry", () => {
  it("redacts emails", () => {
    expect(anonymizeForCrossIndustry("contact me at john@acme.io please")).toContain(
      "[redacted-email]",
    );
  });
  it("redacts phone-like numbers", () => {
    expect(anonymizeForCrossIndustry("call +1 (555) 123-4567 today")).toContain(
      "[redacted-phone]",
    );
  });
  it("strips possessive customer names", () => {
    expect(anonymizeForCrossIndustry("Acme's quote")).toContain("[customer]");
  });
  it("returns empty for null", () => {
    expect(anonymizeForCrossIndustry(null)).toBe("");
  });
});

describe("vertical templates and prompts", () => {
  const verticals = [
    "trade_field_service",
    "retail",
    "restaurant",
    "mmj_cannabis",
    "general_service",
  ] as const;

  it("provides a profile template for every active vertical", () => {
    for (const v of verticals) {
      const t = INDUSTRY_PROFILE_TEMPLATES[v];
      expect(t).toBeTruthy();
      expect(t.revenue_streams.length).toBeGreaterThan(0);
      expect(t.forbidden_assumptions.length).toBeGreaterThan(0);
    }
  });

  it("provides diagnostic prompts for every active vertical", () => {
    for (const v of verticals) {
      const p = INDUSTRY_DIAGNOSTIC_PROMPTS[v];
      expect(p.considerations.length).toBeGreaterThan(0);
      expect(p.guardrails.length).toBeGreaterThan(0);
    }
  });

  it("retail / restaurant / trade templates remain separate (no shared bottlenecks word-for-word)", () => {
    const overlapRetailRestaurant = INDUSTRY_PROFILE_TEMPLATES.retail.operational_bottlenecks.filter(
      (x) => INDUSTRY_PROFILE_TEMPLATES.restaurant.operational_bottlenecks.includes(x),
    );
    const overlapRetailTrade = INDUSTRY_PROFILE_TEMPLATES.retail.operational_bottlenecks.filter(
      (x) =>
        INDUSTRY_PROFILE_TEMPLATES.trade_field_service.operational_bottlenecks.includes(x),
    );
    expect(overlapRetailRestaurant.length).toBe(0);
    expect(overlapRetailTrade.length).toBe(0);
  });

  it("MMJ template forbids cross-industry promotion of cannabis specifics", () => {
    const forbidden = INDUSTRY_PROFILE_TEMPLATES.mmj_cannabis.forbidden_assumptions.join(" ");
    expect(forbidden).toMatch(/cross-industry/i);
    expect(forbidden).toMatch(/legal|compliance/i);
  });
});

describe("default industry tool access", () => {
  it("MMJ defaults exclude Revenue Tracker / RCC / Risk Monitor", () => {
    const mmj = DEFAULT_INDUSTRY_TOOL_ACCESS.mmj_cannabis;
    expect(mmj).not.toContain("revenue_tracker");
    expect(mmj).not.toContain("revenue_control_center");
    expect(mmj).not.toContain("revenue_risk_monitor");
    expect(mmj).toContain("scorecard");
    expect(mmj).toContain("priority_tasks");
  });
  it("non-MMJ industries include the tracking suite by default", () => {
    for (const k of ["trade_field_service", "retail", "restaurant", "general_service"] as const) {
      const list = DEFAULT_INDUSTRY_TOOL_ACCESS[k];
      expect(list).toContain("revenue_tracker");
      expect(list).toContain("quickbooks_sync_health");
    }
  });
  it("ACTIVE_INDUSTRIES excludes `other`", () => {
    expect(ACTIVE_INDUSTRIES).not.toContain("other");
    expect(ACTIVE_INDUSTRIES.length).toBe(5);
  });
  it("REGULATED_INDUSTRIES contains mmj_cannabis only", () => {
    expect(REGULATED_INDUSTRIES.has("mmj_cannabis")).toBe(true);
    expect(REGULATED_INDUSTRIES.has("retail")).toBe(false);
  });
});