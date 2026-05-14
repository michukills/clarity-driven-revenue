/**
 * P93E-E2F — Implementation Depth Engine + Industry Sequencing tests.
 *
 * Proves the Implementation phase consumes Diagnostic findings + the
 * Industry Diagnostic Depth Matrix and produces a premium prioritized
 * implementation plan with dependency mapping, operational forecasting,
 * multi-factor prioritization, industry-specific sequencing, and safe
 * client-facing language. AI cannot move score; admin-only notes do not
 * leak into client-safe surfaces.
 */
import { describe, it, expect } from "vitest";
import {
  INDUSTRY_IMPLEMENTATION_SEQUENCE,
  IMPLEMENTATION_FORBIDDEN_CLAIMS,
  IMPLEMENTATION_CANNABIS_AFFIRMATIVE_BLOCK,
  getIndustrySequence,
  type ImplementationSequenceStep,
} from "@/config/industryImplementationSequencing";
import {
  buildImplementationPlan,
  buildOperationalForecast,
  buildRecommendation,
  IMPLEMENTATION_PRIORITIZATION_FACTORS,
  IMPLEMENTATION_GEARS,
  type DiagnosticFinding,
} from "@/lib/implementation/depthEngine";
import {
  INDUSTRY_DIAGNOSTIC_DEPTH_MATRIX,
  MATRIX_INDUSTRY_KEYS,
  MATRIX_GEAR_KEYS,
  type MatrixIndustryKey,
  type MatrixGearKey,
} from "@/config/industryDiagnosticDepthMatrix";
import { getIndustrySequence as getSeq } from "@/config/industryImplementationSequencing";

const ALL_INDUSTRIES = MATRIX_INDUSTRY_KEYS;

function blob(industry: MatrixIndustryKey): string {
  return getIndustrySequence(industry)
    .flatMap((s) => [
      s.title,
      s.why_first,
      ...s.unblocks,
      ...s.do_not_do_yet,
      ...s.leading_indicators,
      s.owner_bottleneck_reduced,
      s.client_safe_explanation,
      s.admin_sequencing_note,
    ])
    .join(" | ");
}

function makeFindings(industry: MatrixIndustryKey): DiagnosticFinding[] {
  return MATRIX_GEAR_KEYS.map((gear, i) => ({
    industry,
    gear,
    rubric_state:
      i === 0
        ? "absent_or_unknown"
        : i === 1
        ? "informal_or_owner_in_head"
        : i === 2
        ? "documented_but_inconsistent"
        : i === 3
        ? "tracked_with_review"
        : "tracked_reviewed_and_evidence_supported",
    evidence_confidence: i % 3 === 0 ? "low" : i % 3 === 1 ? "medium" : "high",
    contradiction_flagged: i === 0,
    false_green_flagged: i === 2,
  }));
}

describe("P93E-E2F :: Industry sequence completeness", () => {
  it("each industry has at least 5 sequenced steps", () => {
    for (const ind of ALL_INDUSTRIES) {
      const seq = getIndustrySequence(ind);
      expect(seq.length, ind).toBeGreaterThanOrEqual(5);
    }
  });

  it("each step exposes premium dimensions, not generic project-management fields", () => {
    for (const ind of ALL_INDUSTRIES) {
      for (const s of getIndustrySequence(ind)) {
        expect(s.title, ind).toBeTruthy();
        expect(s.why_first, ind).toBeTruthy();
        expect(Array.isArray(s.unblocks)).toBe(true);
        expect(Array.isArray(s.do_not_do_yet)).toBe(true);
        expect(s.do_not_do_yet.length, ind).toBeGreaterThan(0);
        expect(Array.isArray(s.leading_indicators)).toBe(true);
        expect(s.leading_indicators.length, ind).toBeGreaterThan(0);
        expect(s.owner_bottleneck_reduced, ind).toBeTruthy();
        expect(s.client_safe_explanation, ind).toBeTruthy();
        expect(s.admin_sequencing_note, ind).toBeTruthy();
      }
    }
  });

  it("step numbers are unique and monotonically increasing per industry", () => {
    for (const ind of ALL_INDUSTRIES) {
      const nums = getIndustrySequence(ind).map((s) => s.step_number);
      expect(new Set(nums).size, ind).toBe(nums.length);
      const sorted = [...nums].sort((a, b) => a - b);
      expect(nums).toEqual(sorted);
    }
  });
});

describe("P93E-E2F :: Industry-specific sequencing topical coverage", () => {
  it("Trades sequencing covers intake/booking, dispatch, callbacks, job costing, labor utilization", () => {
    const b = blob("trades_home_services").toLowerCase();
    expect(b).toMatch(/intake|booking|inquiry/);
    expect(b).toMatch(/dispatch/);
    expect(b).toMatch(/callback/);
    expect(b).toMatch(/job costing/);
    expect(b).toMatch(/billable hours|paid hours|utilization/);
  });

  it("Restaurant sequencing covers prime cost, waste, comps/voids, menu margin, labor scheduling", () => {
    const b = blob("restaurant_food_service").toLowerCase();
    expect(b).toMatch(/prime cost/);
    expect(b).toMatch(/waste/);
    expect(b).toMatch(/comp|void/);
    expect(b).toMatch(/menu margin/);
    expect(b).toMatch(/labor (scheduling|schedule|%)|labor scheduling/);
  });

  it("Retail sequencing covers sell-through, stockouts, shrink, inventory aging, markdowns", () => {
    const b = blob("retail").toLowerCase();
    expect(b).toMatch(/sell-through/);
    expect(b).toMatch(/stockout/);
    expect(b).toMatch(/shrink/);
    expect(b).toMatch(/aging|inventory aging/);
    expect(b).toMatch(/markdown/);
  });

  it("Professional Services sequencing covers qualification, scope control, utilization, AR/client concentration", () => {
    const b = blob("professional_services").toLowerCase();
    expect(b).toMatch(/qualification/);
    expect(b).toMatch(/scope/);
    expect(b).toMatch(/utilization/);
    expect(b).toMatch(/\bar\b|accounts receivable|client concentration/);
  });

  it("E-commerce sequencing covers margin after shipping/returns/fees/ad cost, stockouts, returns, fulfillment, platform dependence", () => {
    const b = blob("ecommerce_online_retail").toLowerCase();
    expect(b).toMatch(/shipping/);
    expect(b).toMatch(/returns?/);
    expect(b).toMatch(/fees/);
    expect(b).toMatch(/ad (cost|spend)/);
    expect(b).toMatch(/stockout/);
    expect(b).toMatch(/fulfillment/);
    expect(b).toMatch(/platform/);
  });

  it("Cannabis/MMJ sequencing uses operational/documentation visibility language only", () => {
    const b = blob("cannabis_mmj_dispensary").toLowerCase();
    expect(b).toMatch(/seed-to-sale/);
    expect(b).toMatch(/inventory variance|manifest/);
    expect(b).toMatch(/cash control/);
    expect(b).toMatch(/override|discount|void/);
    expect(b).toMatch(/evidence vault|documentation/);
    // affirmative compliance certification claims must not appear
    for (const re of IMPLEMENTATION_CANNABIS_AFFIRMATIVE_BLOCK) {
      expect(b).not.toMatch(re);
    }
  });
});

describe("P93E-E2F :: Safety guards on sequencing copy", () => {
  it("no industry sequence contains forbidden outcome / scope-creep claims", () => {
    for (const ind of ALL_INDUSTRIES) {
      const b = blob(ind);
      for (const re of IMPLEMENTATION_FORBIDDEN_CLAIMS) {
        expect(b, `${ind} :: ${re}`).not.toMatch(re);
      }
    }
  });
});

describe("P93E-E2F :: Recommendation depth", () => {
  it("recommendations include all premium dimensions, not a generic task list", () => {
    const findings = makeFindings("trades_home_services");
    const plan = buildImplementationPlan("trades_home_services", findings);
    for (const r of plan.recommendations) {
      expect(r.title).toBeTruthy();
      expect(r.problem_being_solved).toBeTruthy();
      expect(r.evidence_basis).toBeTruthy();
      expect(["low", "medium", "high"]).toContain(r.evidence_confidence);
      expect(["critical", "high", "medium", "low"]).toContain(r.severity);
      expect(typeof r.priority_score).toBe("number");
      expect(["critical", "high", "medium", "low"]).toContain(r.priority_level);
      expect(typeof r.sequence_number).toBe("number");
      expect(typeof r.dependency_order).toBe("number");
      expect(Array.isArray(r.prerequisite_step_numbers)).toBe(true);
      expect(Array.isArray(r.unblocks)).toBe(true);
      expect(Array.isArray(r.do_not_do_yet)).toBe(true);
      expect(["easy", "medium", "hard"]).toContain(r.implementation_difficulty);
      expect(["low", "medium", "high"]).toContain(r.owner_involvement_required);
      expect(r.owner_bottleneck_reduced).toBeTruthy();
      expect(r.expected_control_lift).toBeTruthy();
      expect(r.risk_if_ignored).toBeTruthy();
      expect(r.first_three_actions.length).toBe(3);
      expect(r.required_evidence.length).toBeGreaterThan(0);
      expect(r.success_indicators.length).toBeGreaterThan(0);
      expect(r.leading_indicators.length).toBeGreaterThan(0);
      expect(r.control_system_monitoring.length).toBeGreaterThan(0);
      expect(r.client_safe_explanation).toBeTruthy();
      expect(r.admin_only_note).toBeTruthy();
      expect(r.ai_assisted).toBe(false);
      expect(r.admin_approval_required).toBe(true);
    }
  });

  it("ranking depends on more than one factor (severity + evidence + contradiction + dependency + gear bias)", () => {
    const findingHigh: DiagnosticFinding = {
      industry: "general_service_other",
      gear: "financial_visibility",
      rubric_state: "absent_or_unknown",
      evidence_confidence: "high",
      contradiction_flagged: true,
      false_green_flagged: true,
    };
    const findingLow: DiagnosticFinding = {
      industry: "general_service_other",
      gear: "demand_generation",
      rubric_state: "tracked_reviewed_and_evidence_supported",
      evidence_confidence: "low",
      contradiction_flagged: false,
      false_green_flagged: false,
    };
    const cellHigh = INDUSTRY_DIAGNOSTIC_DEPTH_MATRIX.general_service_other.financial_visibility;
    const cellLow = INDUSTRY_DIAGNOSTIC_DEPTH_MATRIX.general_service_other.demand_generation;
    const stepHigh = getSeq("general_service_other").find((s) => s.step_number === 4)!;
    const stepLow = getSeq("general_service_other").find((s) => s.step_number === 1)!;
    const recHigh = buildRecommendation(findingHigh, cellHigh, stepHigh);
    const recLow = buildRecommendation(findingLow, cellLow, stepLow);
    expect(recHigh.priority_score).toBeGreaterThan(recLow.priority_score);
  });

  it("dependency mapping exposes prerequisites and what to defer (do_not_do_yet)", () => {
    const plan = buildImplementationPlan(
      "trades_home_services",
      makeFindings("trades_home_services"),
    );
    const hasPrereqs = plan.recommendations.some((r) => r.prerequisite_step_numbers.length > 0);
    expect(hasPrereqs).toBe(true);
    const defers = plan.recommendations.flatMap((r) => r.do_not_do_yet);
    expect(defers.length).toBeGreaterThan(0);
    expect(plan.repair_sequence.length).toBeGreaterThanOrEqual(5);
  });

  it("plan exposes 'what to fix first' (sequence_number 1) and 'what to defer'", () => {
    const plan = buildImplementationPlan(
      "general_service_other",
      makeFindings("general_service_other"),
    );
    const first = plan.repair_sequence.find((s) => s.sequence_number === 1);
    expect(first).toBeTruthy();
    expect(first!.why_first.length).toBeGreaterThan(10);
    expect(plan.deferred.length + plan.recommendations.flatMap((r) => r.do_not_do_yet).length)
      .toBeGreaterThan(0);
  });

  it("operational forecasting is risk-focused and never outcome-guaranteed", () => {
    const finding: DiagnosticFinding = {
      industry: "retail",
      gear: "financial_visibility",
      rubric_state: "informal_or_owner_in_head",
      evidence_confidence: "low",
      contradiction_flagged: false,
      false_green_flagged: false,
    };
    const f = buildOperationalForecast(finding);
    expect(f.forecast_summary).toMatch(/RGS does not predict/i);
    for (const re of IMPLEMENTATION_FORBIDDEN_CLAIMS) {
      expect(f.forecast_summary).not.toMatch(re);
    }
    expect(f.leading_indicators_to_watch.length).toBeGreaterThan(0);
  });

  it("client-safe explanation never carries admin-only note content", () => {
    const plan = buildImplementationPlan(
      "trades_home_services",
      makeFindings("trades_home_services"),
    );
    for (const r of plan.recommendations) {
      expect(r.client_safe_explanation).not.toContain(r.admin_only_note);
      // and admin notes never leak compliance certification claims
      for (const re of IMPLEMENTATION_CANNABIS_AFFIRMATIVE_BLOCK) {
        expect(r.admin_only_note).not.toMatch(re);
      }
    }
  });

  it("Cannabis recommendation surface keeps operational/documentation framing only", () => {
    const findings = makeFindings("cannabis_mmj_dispensary");
    const plan = buildImplementationPlan("cannabis_mmj_dispensary", findings);
    const surface = plan.recommendations
      .map((r) =>
        [
          r.client_safe_explanation,
          r.expected_control_lift,
          r.risk_if_ignored,
          ...r.do_not_do_yet,
          ...r.success_indicators,
          ...r.control_system_monitoring,
        ].join(" "),
      )
      .join(" | ");
    for (const re of IMPLEMENTATION_CANNABIS_AFFIRMATIVE_BLOCK) {
      expect(surface).not.toMatch(re);
    }
    for (const re of IMPLEMENTATION_FORBIDDEN_CLAIMS) {
      expect(surface).not.toMatch(re);
    }
  });

  it("AI cannot move deterministic score: ai_assisted is false and approval is required at engine layer", () => {
    const findings = makeFindings("professional_services");
    const plan = buildImplementationPlan("professional_services", findings);
    for (const r of plan.recommendations) {
      expect(r.ai_assisted).toBe(false);
      expect(r.admin_approval_required).toBe(true);
    }
  });

  it("Control System continuation value is represented", () => {
    const plan = buildImplementationPlan(
      "general_service_other",
      makeFindings("general_service_other"),
    );
    expect(plan.control_system_monitoring_plan.length).toBeGreaterThanOrEqual(4);
    const txt = plan.control_system_monitoring_plan.join(" ").toLowerCase();
    expect(txt).toMatch(/score history|evidence freshness|owner intervention|leading indicator/);
    expect(plan.scope_boundary_notice.toLowerCase()).toMatch(
      /does not run the business|does not promise|control system/,
    );
    for (const re of IMPLEMENTATION_FORBIDDEN_CLAIMS) {
      expect(plan.scope_boundary_notice).not.toMatch(re);
    }
  });

  it("prioritization factor list documents multi-factor ranking", () => {
    expect(IMPLEMENTATION_PRIORITIZATION_FACTORS.length).toBeGreaterThanOrEqual(10);
    expect(IMPLEMENTATION_PRIORITIZATION_FACTORS).toContain("severity");
    expect(IMPLEMENTATION_PRIORITIZATION_FACTORS).toContain("dependency_order");
    expect(IMPLEMENTATION_PRIORITIZATION_FACTORS).toContain("evidence_confidence");
    expect(IMPLEMENTATION_PRIORITIZATION_FACTORS).toContain("owner_bottleneck_reduction");
  });

  it("implementation plan covers all 5 RGS gears", () => {
    const findings = makeFindings("retail");
    const plan = buildImplementationPlan("retail", findings);
    const gears = new Set(plan.recommendations.map((r) => r.gear));
    expect(gears.size).toBe(IMPLEMENTATION_GEARS.length);
  });

  it("sequence registry exposes all supported industries", () => {
    for (const ind of ALL_INDUSTRIES) {
      expect(INDUSTRY_IMPLEMENTATION_SEQUENCE[ind]).toBeTruthy();
    }
  });
});
