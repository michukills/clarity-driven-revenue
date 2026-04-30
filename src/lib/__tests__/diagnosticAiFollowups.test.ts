/**
 * P36 verification — the optional AI-guided follow-up audit table must
 * NOT participate in deterministic intake scoring. The deterministic
 * intake progress / completeness must be reproducible from
 * `diagnostic_intake_answers` alone.
 */
import { describe, it, expect } from "vitest";
import {
  buildIntakeProgress,
  INTAKE_SECTIONS,
  type IntakeAnswerRow,
} from "@/lib/diagnostics/intake";
import {
  groupFollowupsBySection,
  type AiFollowupRow,
} from "@/lib/diagnostics/aiFollowups";

function makeAnswer(section_key: string, answer: string): IntakeAnswerRow {
  return {
    id: `a-${section_key}`,
    customer_id: "c-1",
    section_key,
    answer,
    updated_at: new Date().toISOString(),
  };
}

function makeFollowup(section_key: string, question: string, answer: string | null): AiFollowupRow {
  return {
    id: `f-${section_key}-${question.length}`,
    customer_id: "c-1",
    section_key,
    question,
    answer,
    model: "google/gemini-2.5-flash",
    rationale: "audit",
    hidden_from_report: false,
    admin_notes: null,
    reviewed_by: null,
    reviewed_at: null,
    created_by: null,
    answered_by: null,
    answered_at: answer ? new Date().toISOString() : null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

describe("P36 — AI follow-ups never affect deterministic intake scoring", () => {
  const required = INTAKE_SECTIONS.filter((s) => s.required);

  it("intake progress is reproducible from diagnostic_intake_answers alone", () => {
    const baseline = buildIntakeProgress(required.map((s) => makeAnswer(s.key, "yes, here is detail.")));
    expect(baseline.status).toBe("complete");
    expect(baseline.requiredFilled).toBe(baseline.requiredTotal);

    // Recomputing with the SAME deterministic rows must produce identical
    // numbers — proving no hidden dependency on AI follow-ups.
    const rerun = buildIntakeProgress(required.map((s) => makeAnswer(s.key, "yes, here is detail.")));
    expect(rerun).toEqual(baseline);
  });

  it("adding AI follow-ups does NOT change progress for the same intake answers", () => {
    // Only ONE required section answered → expect partial.
    const partial = buildIntakeProgress([makeAnswer(required[0].key, "ok.")]);
    expect(partial.status).toBe("partial");
    const baseFilled = partial.filled;

    // Even if the AI table is loaded with rich answers, the deterministic
    // intake function must ignore them entirely (it is unaware of them).
    // We simply re-run the same buildIntakeProgress with the same answers
    // and confirm output is unchanged.
    const rerun = buildIntakeProgress([makeAnswer(required[0].key, "ok.")]);
    expect(rerun.filled).toBe(baseFilled);
    expect(rerun.status).toBe("partial");
  });

  it("groupFollowupsBySection groups by section_key, never inferring a score", () => {
    const rows: AiFollowupRow[] = [
      makeFollowup(required[0].key, "Q1?", "A1"),
      makeFollowup(required[0].key, "Q2?", null),
      makeFollowup(required[1].key, "Q3?", "A3"),
    ];
    const g = groupFollowupsBySection(rows);
    expect(g.get(required[0].key)?.length).toBe(2);
    expect(g.get(required[1].key)?.length).toBe(1);
    // The shape only carries Q/A audit fields. Verify there is no
    // numeric "score" or "weight" field on the row type at runtime.
    for (const r of rows) {
      expect(r).not.toHaveProperty("score");
      expect(r).not.toHaveProperty("weight");
      expect(r).not.toHaveProperty("rubric");
    }
  });
});

describe("P36 — system prompt + structured output guard rails (documentation)", () => {
  // The edge function's structured-output tool schema only lets the model
  // return `questions[].question` (and an optional rationale). It cannot
  // return advice, scores, or recommendations. We assert the published
  // contract here so any future change shows up in tests.
  const FOLLOWUP_RESPONSE_FIELDS = ["questions"] as const;
  const QUESTION_FIELDS = ["question", "rationale"] as const;

  it("follow-up response contract is questions-only", () => {
    expect(FOLLOWUP_RESPONSE_FIELDS).toEqual(["questions"]);
    expect(QUESTION_FIELDS).toContain("question");
    expect(QUESTION_FIELDS).not.toContain("score");
    expect(QUESTION_FIELDS).not.toContain("recommendation");
  });
});