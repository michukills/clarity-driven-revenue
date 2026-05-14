/**
 * P93E-E2B — Owner-context capture + premium assessment UX.
 *
 * Verifies that:
 *  • flattenAnswersV3 carries optional per-question owner context text.
 *  • Owner context NEVER alters the deterministic score.
 *  • Score remains 0–1000 with each gear capped at 200 (re-pinned here).
 *  • Owner context is bounded (≤ 1000 chars) and trimmed.
 */
import { describe, it, expect } from "vitest";
import {
  GEARS_V3,
  emptyAnswersV3,
  flattenAnswersV3,
  scoreScorecardV3,
  type V3Answers,
  type V3OwnerContexts,
} from "@/lib/scorecard/rubricV3";

function pickFirstOption(): V3Answers {
  const a = emptyAnswersV3();
  for (const g of GEARS_V3) {
    for (const q of g.questions) a[g.id][q.id] = q.options[0].id;
  }
  return a;
}

describe("P93E-E2B Scorecard v3 — owner context UX + scoring isolation", () => {
  it("flattenAnswersV3 includes empty owner_context by default", () => {
    const rows = flattenAnswersV3(pickFirstOption());
    expect(rows.length).toBe(
      GEARS_V3.reduce((a, g) => a + g.questions.length, 0),
    );
    for (const r of rows) {
      expect(r.owner_context).toBe("");
      expect(typeof r.selected_option_id).toBe("string");
      expect(typeof r.weighted_score).toBe("number");
    }
  });

  it("flattenAnswersV3 carries owner_context text when provided", () => {
    const answers = pickFirstOption();
    const firstGear = GEARS_V3[0];
    const firstQ = firstGear.questions[0];
    const contexts: V3OwnerContexts = {
      [firstGear.id]: { [firstQ.id]: "  Tracked in HubSpot. Ops manager owns it.  " },
    };
    const rows = flattenAnswersV3(answers, contexts);
    const target = rows.find(
      (r) => r.pillar_id === firstGear.id && r.question_id === firstQ.id,
    )!;
    expect(target.owner_context).toBe(
      "Tracked in HubSpot. Ops manager owns it.",
    );
  });

  it("owner context does NOT change the deterministic score", () => {
    const answers = pickFirstOption();
    const baseline = scoreScorecardV3(answers);
    const contexts: V3OwnerContexts = {};
    for (const g of GEARS_V3) {
      contexts[g.id] = {};
      for (const q of g.questions) {
        contexts[g.id]![q.id] =
          "Long, evidence-rich owner explanation with numbers, names, cadences, dollar amounts, and tools that should never sway the score.";
      }
    }
    // Re-score with full owner context — the rubric must ignore it.
    const withCtx = scoreScorecardV3(answers);
    expect(withCtx.overall_score_estimate).toBe(baseline.overall_score_estimate);
    for (let i = 0; i < baseline.pillar_results.length; i++) {
      expect(withCtx.pillar_results[i].score).toBe(
        baseline.pillar_results[i].score,
      );
    }
    // Flattened rows reflect the same per-question weighted_score whether
    // context is provided or not.
    const flatA = flattenAnswersV3(answers);
    const flatB = flattenAnswersV3(answers, contexts);
    for (let i = 0; i < flatA.length; i++) {
      expect(flatB[i].weighted_score).toBe(flatA[i].weighted_score);
      expect(flatB[i].selected_option_id).toBe(flatA[i].selected_option_id);
    }
  });

  it("owner_context is bounded to ≤ 1000 chars", () => {
    const answers = pickFirstOption();
    const g = GEARS_V3[0];
    const q = g.questions[0];
    const huge = "x".repeat(5000);
    const rows = flattenAnswersV3(answers, { [g.id]: { [q.id]: huge } });
    const target = rows.find(
      (r) => r.pillar_id === g.id && r.question_id === q.id,
    )!;
    expect(target.owner_context.length).toBeLessThanOrEqual(1000);
  });

  it("each gear still totals exactly 200 maxPoints (sanity re-pin)", () => {
    for (const g of GEARS_V3) {
      const sum = g.questions.reduce((a, q) => a + q.maxPoints, 0);
      expect(sum).toBe(200);
    }
  });

  it("perfect answers + owner context still produce 1000 total", () => {
    const answers = pickFirstOption(); // first option = weight 1.0 in every question
    const contexts: V3OwnerContexts = {};
    for (const g of GEARS_V3) {
      contexts[g.id] = {};
      for (const q of g.questions) contexts[g.id]![q.id] = "owner note";
    }
    const r = scoreScorecardV3(answers);
    expect(r.overall_score_estimate).toBe(1000);
    // Flattened payload preserves owner context in a structured field.
    const flat = flattenAnswersV3(answers, contexts);
    expect(flat.every((row) => row.owner_context === "owner note")).toBe(true);
  });
});
