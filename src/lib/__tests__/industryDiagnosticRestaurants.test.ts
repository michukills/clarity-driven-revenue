import { describe, it, expect } from "vitest";
import {
  INDUSTRY_BANKS,
  INDUSTRY_MATURITY,
  FULL_DEPTH_KIND_MINIMUM,
  FULL_DEPTH_GEAR_MINIMUM,
  FULL_DEPTH_TOTAL_MINIMUM,
  auditBank,
  auditCalibration,
  effectivePromptKind,
  summarizeBank,
  toClientSafeQuestion,
  getFindingCalibrations,
  UNSAFE_PHRASES,
} from "@/lib/industryDiagnostic";

describe("P93E-E2G-P2 Restaurants / Food Service full-depth bank", () => {
  const bank = INDUSTRY_BANKS.restaurants_food_service;
  const summary = summarizeBank(bank);
  const audit = auditBank(bank);

  it("is promoted to full_depth_ready and passes the audit", () => {
    expect(INDUSTRY_MATURITY.restaurants_food_service).toBe("full_depth_ready");
    const errors = audit.issues.filter((i) => i.severity === "error");
    expect(errors, errors.map((e) => e.message).join("; ")).toHaveLength(0);
    expect(audit.meets_full_depth).toBe(true);
  });

  it("meets the total prompt threshold", () => {
    expect(summary.total).toBeGreaterThanOrEqual(FULL_DEPTH_TOTAL_MINIMUM);
  });

  it("meets per-gear minimums", () => {
    for (const [gear, need] of Object.entries(FULL_DEPTH_GEAR_MINIMUM)) {
      const have = summary.by_gear[gear as keyof typeof summary.by_gear];
      expect(have, `${gear} ${have}/${need}`).toBeGreaterThanOrEqual(need);
    }
  });

  it("meets per-kind minimums (core / conditional / evidence)", () => {
    expect(summary.by_kind.core).toBeGreaterThanOrEqual(FULL_DEPTH_KIND_MINIMUM.core);
    expect(summary.by_kind.conditional_deep_dive).toBeGreaterThanOrEqual(
      FULL_DEPTH_KIND_MINIMUM.conditional_deep_dive,
    );
    expect(summary.by_kind.evidence_source_of_truth).toBeGreaterThanOrEqual(
      FULL_DEPTH_KIND_MINIMUM.evidence_source_of_truth,
    );
  });

  it("every conditional deep dive resolves to a real parent question", () => {
    const keys = new Set(bank.questions.map((q) => q.key));
    const orphans = bank.questions.filter(
      (q) => effectivePromptKind(q) === "conditional_deep_dive" && (!q.parent_key || !keys.has(q.parent_key)),
    );
    expect(orphans.map((o) => o.key)).toEqual([]);
  });

  it("includes all required restaurant risk-trigger deep dives", () => {
    const requiredCdds = [
      "restaurants.cdd_prime_cost_visibility",
      "restaurants.cdd_food_cost_target_gap",
      "restaurants.cdd_labor_control",
      "restaurants.cdd_menu_margin_deep_dive",
      "restaurants.cdd_shift_dependency",
      "restaurants.cdd_waste_inventory_leakage",
      "restaurants.cdd_line_execution",
      "restaurants.cdd_inventory_control",
      "restaurants.cdd_ordering_dependency",
      "restaurants.cdd_delivery_net_margin",
      "restaurants.cdd_revenue_leakage_comp_void",
      "restaurants.cdd_shift_consistency",
      "restaurants.cdd_manager_accountability",
      "restaurants.cdd_review_decline_cause",
      "restaurants.cdd_catering_profitability",
    ];
    const keys = new Set(bank.questions.map((q) => q.key));
    for (const k of requiredCdds) expect(keys.has(k), `missing ${k}`).toBe(true);
  });

  it("contains no unsafe revenue / legal / tax / compliance / guarantee phrases in client-readable text", () => {
    for (const q of bank.questions) {
      const blob = [
        q.plain_language_question,
        q.helper_text ?? "",
        q.business_term ?? "",
        q.source_of_truth_guidance ?? "",
        q.evidence_prompt ?? "",
        q.report_finding_seed ?? "",
        q.trigger_when ?? "",
      ].join(" ").toLowerCase();
      for (const phrase of UNSAFE_PHRASES) {
        expect(blob.includes(phrase), `${q.key} contains "${phrase}"`).toBe(false);
      }
    }
  });

  it("never frames health/safety as compliance certification", () => {
    const health = bank.questions.find((q) => q.key === "restaurants.op_health_readiness")!;
    expect(health.business_term?.toLowerCase()).toContain("operational readiness");
    for (const q of bank.questions) {
      const client = `${q.plain_language_question} ${q.helper_text ?? ""} ${q.business_term ?? ""}`.toLowerCase();
      expect(client).not.toContain("compliance certification");
      expect(client).not.toContain("certified compliant");
      expect(client).not.toContain("food safety certification");
    }
  });

  it("strips admin-only fields when emitting client-safe question shape", () => {
    const withAdmin = bank.questions.find((q) => q.admin_only_notes);
    expect(withAdmin).toBeTruthy();
    const safe = toClientSafeQuestion(withAdmin!);
    expect((safe as Record<string, unknown>).admin_only_notes).toBeUndefined();
  });
});

describe("P93E-E2G-P2 Restaurants FindingCalibration seeds", () => {
  const calibrations = getFindingCalibrations("restaurants_food_service");

  it("registers calibrations for all required restaurant findings", () => {
    const required = [
      "restaurants.prime_cost_visibility_gap",
      "restaurants.menu_profitability_gap",
      "restaurants.shift_dependency_risk",
      "restaurants.waste_inventory_leakage",
      "restaurants.labor_control_gap",
      "restaurants.line_execution_bottleneck",
      "restaurants.delivery_platform_margin_risk",
      "restaurants.comp_void_discount_leakage",
      "restaurants.manager_accountability_gap",
      "restaurants.owner_ordering_dependency",
      "restaurants.guest_experience_recovery_gap",
      "restaurants.catering_event_profitability_gap",
    ];
    const keys = new Set(calibrations.map((c) => c.key));
    for (const k of required) expect(keys.has(k), `missing calibration ${k}`).toBe(true);
  });

  it("every calibration is industry-specific and passes auditCalibration", () => {
    expect(calibrations.length).toBeGreaterThanOrEqual(12);
    for (const c of calibrations) {
      expect(c.industry).toBe("restaurants_food_service");
      const issues = auditCalibration(c);
      expect(issues, issues.map((i) => i.message).join("; ")).toHaveLength(0);
    }
  });

  it("rejects generic restaurant findings via auditCalibration", () => {
    const generic = {
      ...calibrations[0],
      key: "restaurants.bad",
      finding_title: "Improve marketing",
    };
    const issues = auditCalibration(generic);
    expect(issues.some((i) => i.code === "generic_finding")).toBe(true);
  });

  it("no industries remain starter_bank without calibrations", () => {
    expect(getFindingCalibrations("cannabis_mmj_dispensary").length).toBeGreaterThan(0);
  });
});
