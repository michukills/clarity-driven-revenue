import { describe, expect, it } from "vitest";
import {
  AI_CONFIDENCE_KERNEL_VERSION,
  buildMissingInputQuestions,
  classifyConfidence,
  decideNextBestAction,
  isClientSafeForSurface,
  type ConfidenceInputs,
} from "@/lib/aiConfidence";

const baseInputs: ConfidenceInputs = {
  approvedSignalCount: 2,
  verifiedEvidenceCount: 1,
  coreRequiredSatisfied: true,
  missingContext: [],
  contradictionFlags: [],
  safetyStatus: "passed",
};

describe("AI Confidence Kernel", () => {
  it("exposes a version constant", () => {
    expect(AI_CONFIDENCE_KERNEL_VERSION).toMatch(/^p95x-ai-confidence-kernel/);
  });

  it("returns HIGH when signals + verified evidence + clean safety + no gaps", () => {
    const d = classifyConfidence(baseInputs);
    expect(d.label).toBe("high");
    expect(d.improvementSuggestions).toEqual([]);
  });

  it("never lazily defaults to LOW for partial-but-usable inputs", () => {
    const d = classifyConfidence({ ...baseInputs, verifiedEvidenceCount: 0 });
    expect(d.label).toBe("medium");
    expect(d.improvementSuggestions.length).toBeGreaterThan(0);
  });

  it("returns MEDIUM when only one approved signal is present", () => {
    const d = classifyConfidence({ ...baseInputs, approvedSignalCount: 1 });
    expect(d.label).toBe("medium");
  });

  it("returns LOW when safety is blocked, with an explanation and remediation", () => {
    const d = classifyConfidence({ ...baseInputs, safetyStatus: "blocked" });
    expect(d.label).toBe("low");
    expect(d.rationale).toMatch(/safety/i);
    expect(d.improvementSuggestions[0]).toMatch(/rework/i);
  });

  it("returns LOW for hard contradictions and surfaces them", () => {
    const d = classifyConfidence({
      ...baseInputs,
      contradictionFlags: ["owner claim vs uploaded SOP"],
    });
    expect(d.label).toBe("low");
    expect(d.rationale).toMatch(/contradict/i);
    expect(d.improvementSuggestions.some((s) => /reconcile/i.test(s))).toBe(true);
  });

  it("returns LOW only when core context is genuinely missing AND ≥2 missing items", () => {
    const onlyOneMissing = classifyConfidence({
      ...baseInputs,
      coreRequiredSatisfied: false,
      approvedSignalCount: 0,
      missingContext: ["no scorecard"],
    });
    expect(onlyOneMissing.label).not.toBe("low");

    const reallyMissing = classifyConfidence({
      ...baseInputs,
      coreRequiredSatisfied: false,
      approvedSignalCount: 0,
      missingContext: ["no scorecard", "no diagnostic"],
    });
    expect(reallyMissing.label).toBe("low");
    expect(reallyMissing.improvementSuggestions.length).toBeGreaterThan(0);
  });

  it("uses evidence ladder weights to lift to HIGH without explicit verified count", () => {
    const d = classifyConfidence({
      ...baseInputs,
      verifiedEvidenceCount: 0,
      evidenceLadder: ["imported", "admin_reviewed"],
    });
    expect(d.label).toBe("high");
  });

  it("respects allowMediumWithoutVerifiedProof for surfaces that don't require proof", () => {
    const d = classifyConfidence({
      ...baseInputs,
      verifiedEvidenceCount: 0,
      allowMediumWithoutVerifiedProof: true,
    });
    expect(d.label).toBe("medium");
    // The "attach verified evidence" suggestion is suppressed:
    expect(d.improvementSuggestions.some((s) => /verified/i.test(s))).toBe(false);
  });

  it("buildMissingInputQuestions only emits prompts for absent slots", () => {
    const qs = buildMissingInputQuestions(
      [
        { key: "objective", present: false, prompt: "What is the business objective?" },
        { key: "persona", present: true, prompt: "Which persona?" },
      ],
      ["industry not confirmed"],
    );
    expect(qs).toContain("What is the business objective?");
    expect(qs).not.toContain("Which persona?");
    expect(qs.some((q) => /industry not confirmed/.test(q))).toBe(true);
  });

  it("decideNextBestAction maps safety/confidence to operator-readable actions", () => {
    expect(
      decideNextBestAction({ confidence: "high", safetyStatus: "passed", missingQuestionsCount: 0 }),
    ).toBe("proceed");
    expect(
      decideNextBestAction({ confidence: "high", safetyStatus: "blocked", missingQuestionsCount: 0 }),
    ).toBe("rework_for_safety");
    expect(
      decideNextBestAction({ confidence: "high", safetyStatus: "needs_review", missingQuestionsCount: 0 }),
    ).toBe("escalate_for_admin_review");
    expect(
      decideNextBestAction({ confidence: "low", safetyStatus: "passed", missingQuestionsCount: 0 }),
    ).toBe("request_more_inputs");
    expect(
      decideNextBestAction({
        confidence: "high",
        safetyStatus: "passed",
        missingQuestionsCount: 0,
        requiresAdminReview: true,
      }),
    ).toBe("escalate_for_admin_review");
  });

  it("isClientSafeForSurface gates LOW and unsafe surfaces", () => {
    expect(isClientSafeForSurface("high", "passed")).toBe(true);
    expect(isClientSafeForSurface("medium", "passed")).toBe(true);
    expect(isClientSafeForSurface("low", "passed")).toBe(false);
    expect(isClientSafeForSurface("high", "needs_review")).toBe(false);
    expect(isClientSafeForSurface("high", "blocked")).toBe(false);
  });
});