/**
 * P93E-E2D — Classifier client folds classifications into V3Answers
 * deterministically, never lets unknown option_ids leak through, and
 * builds payloads only from the canonical v3 rubric.
 */
import { describe, it, expect } from "vitest";
import {
  buildClassifyPayload,
  classificationsToV3Answers,
  type ClassifierResult,
  type OwnerAnswerInput,
} from "@/lib/scorecard/classifyClient";
import { GEARS_V3, scoreScorecardV3 } from "@/lib/scorecard/rubricV3";

describe("P93E-E2D classifyClient determinism", () => {
  it("payload includes allow-listed options pulled from the canonical rubric", () => {
    const g = GEARS_V3[0];
    const q = g.questions[0];
    const owner: OwnerAnswerInput[] = [
      { question_id: q.id, gear: g.id, prompt: q.prompt, owner_text: "we wing it" },
    ];
    const payload = buildClassifyPayload(owner, "00000000-0000-4000-8000-000000000000");
    expect(payload.rubric_version).toBe("v3_deterministic_gears");
    expect(payload.answers).toHaveLength(1);
    const allowed = payload.answers[0].allowed_options.map((o) => o.id);
    expect(allowed).toEqual(q.options.map((o) => o.id));
  });

  it("classificationsToV3Answers ignores unknown question_ids and option_ids", () => {
    const g = GEARS_V3[0];
    const q = g.questions[0];
    const valid = q.options[0];
    const results: ClassifierResult[] = [
      {
        question_id: q.id,
        gear: g.id,
        owner_text: "x",
        classified_option_id: valid.id,
        classified_option_label: valid.label,
        confidence: "high",
        classification_rationale: "ok",
        insufficient_detail: false,
        follow_up_question: null,
        classifier_type: "ai",
      },
      {
        question_id: "not_a_real_question",
        gear: g.id,
        owner_text: "x",
        classified_option_id: "totally_made_up",
        classified_option_label: "x",
        confidence: "high",
        classification_rationale: "x",
        insufficient_detail: false,
        follow_up_question: null,
        classifier_type: "ai",
      },
      {
        question_id: q.id,
        gear: g.id,
        owner_text: "x",
        classified_option_id: "spoofed_option_id",
        classified_option_label: "x",
        confidence: "high",
        classification_rationale: "x",
        insufficient_detail: false,
        follow_up_question: null,
        classifier_type: "ai",
      },
    ];
    const v3 = classificationsToV3Answers(results);
    // Only the legit one survives.
    expect(v3[g.id]?.[q.id]).toBe(valid.id);
    // Spoofed/unknown entries never become a key on a different gear.
    expect((v3[g.id] || {})["not_a_real_question"]).toBeUndefined();
  });

  it("scoreScorecardV3 only credits classifier-mapped option_ids — confidence cannot move the score", () => {
    const g = GEARS_V3[0];
    const q = g.questions[0];
    const lowOpt = [...q.options].sort((a, b) => a.weight - b.weight)[0];
    const lowConfidenceHigh: ClassifierResult = {
      question_id: q.id,
      gear: g.id,
      owner_text: "x",
      classified_option_id: lowOpt.id,
      classified_option_label: lowOpt.label,
      confidence: "low", // confidence label MUST NOT move score
      classification_rationale: "x",
      insufficient_detail: true,
      follow_up_question: null,
      classifier_type: "rules",
    };
    const highConfidenceLow: ClassifierResult = {
      ...lowConfidenceHigh,
      confidence: "high",
      insufficient_detail: false,
    };
    const a = classificationsToV3Answers([lowConfidenceHigh]);
    const b = classificationsToV3Answers([highConfidenceLow]);
    expect(scoreScorecardV3(a).overall_score_estimate).toBe(
      scoreScorecardV3(b).overall_score_estimate,
    );
  });

  it("v3 gear maxima remain 200 each and total stays 1000", () => {
    let total = 0;
    for (const g of GEARS_V3) {
      const sum = g.questions.reduce((n, q) => n + q.maxPoints, 0);
      expect(sum).toBe(200);
      total += sum;
    }
    expect(total).toBe(1000);
  });
});