// P19 — Operational profile completeness + adjustment tests.

import { describe, it, expect } from "vitest";
import {
  computeCompleteness,
  applyProfileAdjustments,
  TRACKED_FIELDS,
  CRITICAL_FIELDS,
  type OperationalProfile,
} from "../operationalProfile";
import type { RecommendationLike } from "../factorHeuristics";
import type { PriorityFactors } from "../types";

const blankProfile: OperationalProfile = {
  monthly_leads: null,
  monthly_close_rate_pct: null,
  average_ticket_usd: null,
  monthly_revenue_usd: null,
  gross_margin_pct: null,
  ar_open_usd: null,
  owner_hours_per_week: null,
  team_size: null,
  crew_or_job_capacity: null,
  biggest_constraint: null,
  owner_urgency: null,
  change_readiness: null,
  implementation_capacity: null,
  decision_bottleneck: null,
  implementation_failure_risk: null,
  accountable_owner_name: null,
  preferred_cadence: null,
};

const baseFactors: PriorityFactors = {
  impact: 3,
  visibility: 3,
  ease_of_fix: 3,
  dependency: 3,
};

const rec = (overrides: Partial<RecommendationLike> = {}): RecommendationLike => ({
  id: "r1",
  title: "Tighten cash collection cadence",
  category: "cash",
  priority: "medium",
  explanation: "AR is stretching beyond 60 days.",
  related_pillar: null,
  origin: "rule",
  rule_key: null,
  ...overrides,
});

describe("computeCompleteness", () => {
  it("treats fully empty profile as incomplete with all critical missing", () => {
    const c = computeCompleteness(null);
    expect(c.completeness_pct).toBe(0);
    expect(c.readiness_label).toBe("incomplete");
    expect(c.critical_missing_fields.sort()).toEqual([...CRITICAL_FIELDS].sort());
  });

  it("returns usable when >=50% but critical fields missing", () => {
    const half: OperationalProfile = {
      ...blankProfile,
      monthly_leads: 20,
      monthly_close_rate_pct: 25,
      average_ticket_usd: 500,
      gross_margin_pct: 30,
      ar_open_usd: 1000,
      owner_hours_per_week: 40,
      team_size: 3,
      crew_or_job_capacity: "1 crew",
      preferred_cadence: "weekly",
    };
    const c = computeCompleteness(half);
    expect(c.completeness_pct).toBeGreaterThanOrEqual(50);
    expect(c.readiness_label).toBe("usable");
    expect(c.critical_missing_fields.length).toBeGreaterThan(0);
  });

  it("returns strong when >=80% complete and no critical fields missing", () => {
    const profile: OperationalProfile = { ...blankProfile };
    for (const f of TRACKED_FIELDS) {
      (profile as any)[f] =
        f === "owner_urgency"
          ? "high"
          : f === "change_readiness" || f === "implementation_capacity"
          ? "high"
          : f === "preferred_cadence"
          ? "weekly"
          : typeof (blankProfile as any)[f] === "number" || ["monthly_leads","monthly_close_rate_pct","average_ticket_usd","monthly_revenue_usd","gross_margin_pct","ar_open_usd","owner_hours_per_week","team_size"].includes(f)
          ? 10
          : "filled";
    }
    const c = computeCompleteness(profile);
    expect(c.completeness_pct).toBeGreaterThanOrEqual(80);
    expect(c.critical_missing_fields).toEqual([]);
    expect(c.readiness_label).toBe("strong");
  });
});

describe("applyProfileAdjustments — clamping & no-inflation safety", () => {
  it("missing profile applies no adjustments", () => {
    const r = applyProfileAdjustments(baseFactors, rec(), null);
    expect(r.factors).toEqual(baseFactors);
    expect(r.notes).toEqual([]);
  });

  it("never moves a factor outside 1..5", () => {
    const ceiling: PriorityFactors = { impact: 5, visibility: 5, ease_of_fix: 1, dependency: 5 };
    const profile: OperationalProfile = {
      ...blankProfile,
      monthly_revenue_usd: 1_000_000,
      ar_open_usd: 200_000,
      gross_margin_pct: 5,
      owner_urgency: "critical",
      biggest_constraint: "cash collection cadence",
      implementation_capacity: "low",
      change_readiness: "low",
      decision_bottleneck: "owner sign-off only",
      owner_hours_per_week: 70,
    };
    const r = applyProfileAdjustments(
      ceiling,
      rec({ title: "Cash collection process for owner", category: "cash operations" }),
      profile
    );
    for (const v of Object.values(r.factors)) {
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(5);
    }
  });
});

describe("applyProfileAdjustments — directional rules", () => {
  it("high AR nudges impact for cash/AR issues only", () => {
    const profile: OperationalProfile = { ...blankProfile, ar_open_usd: 50_000 };
    const cash = applyProfileAdjustments(baseFactors, rec({ title: "Improve AR follow-up", category: "cash" }), profile);
    expect(cash.factors.impact).toBe(4);
    const unrelated = applyProfileAdjustments(
      baseFactors,
      rec({ title: "Refine onboarding emails", category: "marketing", explanation: "" }),
      profile
    );
    expect(unrelated.factors.impact).toBe(3);
  });

  it("low implementation capacity reduces ease_of_fix", () => {
    const profile: OperationalProfile = { ...blankProfile, implementation_capacity: "low" };
    const r = applyProfileAdjustments(baseFactors, rec(), profile);
    expect(r.factors.ease_of_fix).toBe(2);
    expect(r.notes.some((n) => n.factor === "ease_of_fix" && n.delta === -1)).toBe(true);
  });

  it("high owner urgency raises visibility", () => {
    const profile: OperationalProfile = { ...blankProfile, owner_urgency: "high" };
    const r = applyProfileAdjustments(baseFactors, rec(), profile);
    expect(r.factors.visibility).toBe(4);
  });

  it("missing profile fields cannot raise scores above base on their own", () => {
    const profile: OperationalProfile = { ...blankProfile, owner_urgency: null };
    const r = applyProfileAdjustments(baseFactors, rec(), profile);
    expect(r.factors).toEqual(baseFactors);
  });

  it("decision bottleneck + ops issue increases dependency", () => {
    const profile: OperationalProfile = {
      ...blankProfile,
      decision_bottleneck: "Owner approves every change order.",
    };
    const r = applyProfileAdjustments(
      baseFactors,
      rec({ title: "Document SOP for crew dispatch", category: "operations", explanation: "Process is owner-driven." }),
      profile
    );
    expect(r.factors.dependency).toBe(4);
  });
});
