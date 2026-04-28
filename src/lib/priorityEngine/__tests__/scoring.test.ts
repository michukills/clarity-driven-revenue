import { describe, it, expect } from "vitest";
import {
  computePriorityScore,
  bandForScore,
  normalizeFactors,
  rankIssues,
  SCORE_MIN,
  SCORE_MAX,
} from "../scoring";

describe("priority engine scoring", () => {
  it("computes formula impact*2 + visibility + ease + dependency", () => {
    expect(computePriorityScore({ impact: 5, visibility: 5, ease_of_fix: 5, dependency: 5 })).toBe(25);
    expect(computePriorityScore({ impact: 1, visibility: 1, ease_of_fix: 1, dependency: 1 })).toBe(5);
    expect(computePriorityScore({ impact: 4, visibility: 3, ease_of_fix: 2, dependency: 2 })).toBe(15);
  });

  it("clamps out-of-range factors to 1..5 and rounds", () => {
    const n = normalizeFactors({ impact: 9, visibility: -2, ease_of_fix: 3.4, dependency: 4.6 });
    expect(n).toEqual({ impact: 5, visibility: 1, ease_of_fix: 3, dependency: 5 });
  });

  it("respects min/max envelope", () => {
    expect(SCORE_MIN).toBe(5);
    expect(SCORE_MAX).toBe(25);
  });

  it("bands map by score thresholds", () => {
    expect(bandForScore(25)).toBe("critical");
    expect(bandForScore(20)).toBe("critical");
    expect(bandForScore(19)).toBe("high");
    expect(bandForScore(16)).toBe("high");
    expect(bandForScore(15)).toBe("medium");
    expect(bandForScore(11)).toBe("medium");
    expect(bandForScore(10)).toBe("low");
    expect(bandForScore(5)).toBe("low");
  });

  it("ranks issues by score then impact then ease", () => {
    const ranked = rankIssues([
      { issue_key: "a", issue_title: "A", source_recommendation_id: null, impact: 3, visibility: 3, ease_of_fix: 3, dependency: 3 }, // 15
      { issue_key: "b", issue_title: "B", source_recommendation_id: null, impact: 5, visibility: 5, ease_of_fix: 5, dependency: 5 }, // 25
      { issue_key: "c", issue_title: "C", source_recommendation_id: null, impact: 4, visibility: 3, ease_of_fix: 2, dependency: 2 }, // 15
    ]);
    expect(ranked.map((r) => r.issue_key)).toEqual(["b", "c", "a"]);
    expect(ranked[0].rank).toBe(1);
    expect(ranked[0].priority_band).toBe("critical");
  });
});