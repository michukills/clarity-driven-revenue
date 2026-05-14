// P93E-E2A — Scorecard v3 weighted-question calibration guard.
// Pins per-question max-point weighting so high-risk system failures
// carry more weight than low-risk signals while preserving the 5×200
// gear architecture and 0–1000 total.
import { describe, it, expect } from "vitest";
import {
  GEARS_V3,
  GEAR_MAX_POINTS_V3,
  TOTAL_MAX_POINTS_V3,
  QUESTION_MAX_POINTS_V3,
  emptyAnswersV3,
  scoreScorecardV3,
} from "@/lib/scorecard/rubricV3";

describe("P93E-E2A — v3 weighting structure", () => {
  it("every v3 question declares a positive integer maxPoints", () => {
    for (const g of GEARS_V3) {
      for (const q of g.questions) {
        expect(q.maxPoints).toBeGreaterThan(0);
        expect(Number.isInteger(q.maxPoints)).toBe(true);
        expect(QUESTION_MAX_POINTS_V3[q.id]).toBe(q.maxPoints);
      }
    }
  });

  it("each gear's question maxPoints sum to exactly 200", () => {
    for (const g of GEARS_V3) {
      const sum = g.questions.reduce((a, q) => a + q.maxPoints, 0);
      expect(sum).toBe(GEAR_MAX_POINTS_V3);
      expect(sum).toBe(200);
    }
  });

  it("total possible v3 score is exactly 1,000", () => {
    const total = GEARS_V3.reduce(
      (a, g) => a + g.questions.reduce((b, q) => b + q.maxPoints, 0),
      0,
    );
    expect(total).toBe(TOTAL_MAX_POINTS_V3);
    expect(total).toBe(1000);
  });

  it("questions inside a gear are not all equally weighted", () => {
    for (const g of GEARS_V3) {
      const weights = new Set(g.questions.map((q) => q.maxPoints));
      expect(weights.size).toBeGreaterThan(1);
    }
  });

  it("highest-risk system-failure questions carry more weight than lowest", () => {
    // Per the E2A weighting rationale.
    const top = {
      demand: "d_source_tracking",
      conversion: "c_response_speed",
      operations: "o_rework_rate",
      financial: "f_cash_position",
      owner: "ow_vacation",
    } as const;
    const bottom = {
      demand: "d_offer_clarity",
      conversion: "c_lost_deal_tracking",
      operations: "o_tool_consistency",
      financial: "f_expense_review",
      owner: "ow_access",
    } as const;
    for (const g of GEARS_V3) {
      const hi = QUESTION_MAX_POINTS_V3[top[g.id]];
      const lo = QUESTION_MAX_POINTS_V3[bottom[g.id]];
      expect(hi).toBeGreaterThan(lo);
    }
  });
});

describe("P93E-E2A — v3 weighted scoring behavior", () => {
  it("strongest answers still produce 200/gear and 1000 total", () => {
    const a = emptyAnswersV3();
    for (const g of GEARS_V3) for (const q of g.questions) a[g.id][q.id] = q.options[0].id;
    const r = scoreScorecardV3(a);
    for (const p of r.pillar_results) expect(p.score).toBe(200);
    expect(r.overall_score_estimate).toBe(1000);
  });

  it("a 'Not sure' / lowest-weight answer on a high-weight question costs more than on a low-weight question", () => {
    // Demand: d_source_tracking (40pt, top-risk) vs d_offer_clarity (25pt, low-risk).
    const demand = GEARS_V3.find((g) => g.id === "demand")!;
    const baseline = emptyAnswersV3();
    for (const g of GEARS_V3) for (const q of g.questions) baseline[g.id][q.id] = q.options[0].id;

    const downgradeOn = (qid: string) => {
      const a = JSON.parse(JSON.stringify(baseline)) as typeof baseline;
      const q = demand.questions.find((qq) => qq.id === qid)!;
      const unsure = q.options[q.options.length - 1]; // last option = "Not sure" / weakest
      a.demand[qid] = unsure.id;
      return scoreScorecardV3(a).overall_score_estimate;
    };

    const lossOnHighRisk = 1000 - downgradeOn("d_source_tracking");
    const lossOnLowRisk = 1000 - downgradeOn("d_offer_clarity");
    expect(lossOnHighRisk).toBeGreaterThan(lossOnLowRisk);
  });

  it("partial-credit (mid-weight) answers produce partial gear scores, not 0 and not 200", () => {
    const a = emptyAnswersV3();
    for (const g of GEARS_V3) for (const q of g.questions) {
      const mid = q.options.find((o) => o.weight > 0.3 && o.weight < 0.8) ?? q.options[1];
      a[g.id][q.id] = mid.id;
    }
    const r = scoreScorecardV3(a);
    for (const p of r.pillar_results) {
      expect(p.score).toBeGreaterThan(0);
      expect(p.score).toBeLessThan(200);
    }
  });

  it("unanswered questions still count as 0 (no full credit by default)", () => {
    const r = scoreScorecardV3(emptyAnswersV3());
    expect(r.overall_score_estimate).toBe(0);
  });
});