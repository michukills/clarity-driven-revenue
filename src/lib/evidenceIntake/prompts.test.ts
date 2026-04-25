import { describe, it, expect } from "vitest";
import {
  CLARIFICATION_PROMPTS,
  DIAGNOSTIC_INTERVIEW_SYSTEM_PROMPT,
  EVIDENCE_TIER_LABEL,
  FINDING_REQUIRED_FIELDS,
  PUBLIC_SCORECARD_TRUST_COPY,
  REPORT_GENERATION_SYSTEM_PROMPT,
  clarificationPromptsFor,
  findingMissingFields,
} from "./prompts";

describe("P13.EvidenceIntake.H.1 — prompts contract", () => {
  it("system prompts forbid recommendations during the interview", () => {
    expect(DIAGNOSTIC_INTERVIEW_SYSTEM_PROMPT.toLowerCase()).toContain(
      "never recommend",
    );
  });

  it("report system prompt requires evidence + confidence + missing data", () => {
    const p = REPORT_GENERATION_SYSTEM_PROMPT.toLowerCase();
    expect(p).toContain("evidence");
    expect(p).toContain("confidence");
    expect(p).toContain("missing_data");
    expect(p).toContain("never imply certainty");
  });

  it("trust copy keeps preliminary + self-reported + not-a-diagnosis", () => {
    expect(PUBLIC_SCORECARD_TRUST_COPY.preliminary_label).toBe("Preliminary");
    expect(PUBLIC_SCORECARD_TRUST_COPY.self_reported_label).toBe(
      "Self-reported",
    );
    expect(PUBLIC_SCORECARD_TRUST_COPY.not_a_diagnosis).toMatch(/diagnosis/i);
    expect(PUBLIC_SCORECARD_TRUST_COPY.validation_promise).toMatch(
      /validate/i,
    );
  });

  it("clarificationPromptsFor returns prompts for empty + vague answers", () => {
    expect(clarificationPromptsFor("").length).toBeGreaterThan(0);
    expect(clarificationPromptsFor("yes").length).toBeGreaterThan(0);
    // a long, specific answer should NOT trigger clarifications
    const long =
      "We track every lead in HubSpot weekly with a documented review cadence and a named owner.";
    expect(clarificationPromptsFor(long).length).toBe(0);
  });

  it("findingMissingFields flags blank required fields", () => {
    expect(findingMissingFields({})).toEqual([...FINDING_REQUIRED_FIELDS]);
    expect(
      findingMissingFields({
        issue: "X",
        what_is_happening: "Y",
        why_it_appears: "Z",
        evidence: ["a"],
        confidence: "low",
        missing_data: "n/a",
      }),
    ).toEqual([]);
  });

  it("evidence tier labels separate owner-reported from validated", () => {
    expect(EVIDENCE_TIER_LABEL.owner_reported).toMatch(/owner-reported/i);
    expect(EVIDENCE_TIER_LABEL.admin_validated).toMatch(/admin-validated/i);
    // Sanity: clarifications include the spec-required prompts
    expect(CLARIFICATION_PROMPTS.join(" ")).toMatch(/tracked, estimated/i);
    expect(CLARIFICATION_PROMPTS.join(" ")).toMatch(/20%, 50%, or 80%/);
    expect(CLARIFICATION_PROMPTS.join(" ")).toMatch(/system or report/i);
  });
});
