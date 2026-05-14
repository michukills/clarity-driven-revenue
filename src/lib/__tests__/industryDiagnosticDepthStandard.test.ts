import { describe, it, expect } from "vitest";
import {
  INDUSTRY_BANKS,
  INDUSTRY_KEYS,
  INDUSTRY_MATURITY,
  FULL_DEPTH_TOTAL_MINIMUM,
  FULL_DEPTH_KIND_MINIMUM,
  effectivePromptKind,
  summarizeBank,
  auditBank,
  auditCalibration,
  toClientSafeQuestion,
  UNSAFE_PHRASES,
  type FindingCalibration,
} from "@/lib/industryDiagnostic";

describe("P93E-E2G-P1.5 industry diagnostic depth standard", () => {
  it("audits every bank without unsafe phrases or maturity overclaims", () => {
    for (const k of INDUSTRY_KEYS) {
      const audit = auditBank(INDUSTRY_BANKS[k]);
      const errors = audit.issues.filter((i) => i.severity === "error");
      expect(
        errors,
        `bank ${k} has audit errors: ${errors.map((e) => e.message).join("; ")}`,
      ).toHaveLength(0);
    }
  });

  it("never declares > starter_bank unless full-depth thresholds are met", () => {
    for (const k of INDUSTRY_KEYS) {
      const audit = auditBank(INDUSTRY_BANKS[k]);
      if (INDUSTRY_MATURITY[k] !== "starter_bank") {
        expect(audit.meets_full_depth, `${k} promoted but not full-depth`).toBe(true);
        expect(audit.total_questions).toBeGreaterThanOrEqual(FULL_DEPTH_TOTAL_MINIMUM);
      }
    }
  });

  it("Trades / Home Services is the full-depth reference bank", () => {
    expect(INDUSTRY_MATURITY.trades_home_services).toBe("full_depth_ready");
    const audit = auditBank(INDUSTRY_BANKS.trades_home_services);
    expect(audit.meets_full_depth).toBe(true);
    const summary = summarizeBank(INDUSTRY_BANKS.trades_home_services);
    expect(summary.by_kind.core).toBeGreaterThanOrEqual(FULL_DEPTH_KIND_MINIMUM.core);
    expect(summary.by_kind.conditional_deep_dive).toBeGreaterThanOrEqual(FULL_DEPTH_KIND_MINIMUM.conditional_deep_dive);
    expect(summary.by_kind.evidence_source_of_truth).toBeGreaterThanOrEqual(FULL_DEPTH_KIND_MINIMUM.evidence_source_of_truth);
  });

  it("every Trades conditional deep dive resolves to a real parent question", () => {
    const bank = INDUSTRY_BANKS.trades_home_services;
    const keys = new Set(bank.questions.map((q) => q.key));
    const orphans = bank.questions.filter(
      (q) => effectivePromptKind(q) === "conditional_deep_dive" && (!q.parent_key || !keys.has(q.parent_key)),
    );
    expect(orphans.map((o) => o.key)).toEqual([]);
  });

  it("starter banks are honestly labelled and not silently promoted", () => {
    const starters: typeof INDUSTRY_KEYS = [];
    for (const k of starters) {
      expect(INDUSTRY_MATURITY[k]).toBe("starter_bank");
    }
  });

  it("toClientSafeQuestion strips admin_only_notes", () => {
    const q = INDUSTRY_BANKS.cannabis_mmj_dispensary.questions.find((x) => x.admin_only_notes);
    expect(q).toBeTruthy();
    const safe = toClientSafeQuestion(q!);
    expect((safe as Record<string, unknown>).admin_only_notes).toBeUndefined();
  });

  it("auditCalibration rejects unsafe and generic findings", () => {
    const bad: FindingCalibration = {
      key: "trades.bad",
      industry: "trades_home_services",
      gear: "demand",
      finding_title: "Improve marketing",
      why_it_matters: "We guarantee revenue if you follow this.",
      evidence_supports: [],
      evidence_missing_means: "",
      confidence_floor: "low",
      business_risk: "growth_drag",
      owner_independence_lift: "low",
      cash_control_impact: "low",
      client_safe_explanation: "guaranteed roi",
    };
    const issues = auditCalibration(bad);
    expect(issues.some((i) => i.code === "generic_finding")).toBe(true);
    expect(issues.some((i) => i.code === "unsafe_language")).toBe(true);
  });

  it("UNSAFE_PHRASES catches outcome promises and false certifications", () => {
    expect(UNSAFE_PHRASES).toContain("compliance certification");
    expect(UNSAFE_PHRASES).toContain("legal advice");
    expect(UNSAFE_PHRASES).toContain("guarantee revenue");
  });
});
