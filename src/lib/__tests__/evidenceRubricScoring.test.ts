import { describe, it, expect } from "vitest";
import { scoreEvidenceText, RUBRIC_VERSION } from "@/lib/diagnostics/engine";

/**
 * P41.4 — Deterministic rubric scoring contract.
 * The system must classify typed evidence into an EvidenceStatus + severity
 * without any manual judgment from the user.
 */
describe("scoreEvidenceText — deterministic rubric", () => {
  it("empty input returns not_enough_evidence (severity 2)", () => {
    const r = scoreEvidenceText("");
    expect(r.status).toBe("not_enough_evidence");
    expect(r.severity).toBe(2);
    expect(r.scoredBySystem).toBe(true);
    expect(r.rubricVersion).toBe(RUBRIC_VERSION);
  });

  it("'I don't know' returns needs_review", () => {
    expect(scoreEvidenceText("Honestly, I don't know.").status).toBe("needs_review");
  });

  it("lost-revenue language returns critical_gap (severity 5)", () => {
    const r = scoreEvidenceText("We have no system and we lose revenue every month.");
    expect(r.status).toBe("critical_gap");
    expect(r.severity).toBe(5);
  });

  it("owner-dependence language returns significant_gap", () => {
    const r = scoreEvidenceText("It's all in my head — I do everything personally.");
    expect(r.status).toBe("significant_gap");
    expect(r.severity).toBe(4);
  });

  it("'inconsistent / depends' language returns gap_identified", () => {
    const r = scoreEvidenceText("It depends on the person — sometimes manually tracked.");
    expect(r.status).toBe("gap_identified");
    expect(r.severity).toBe(3);
  });

  it("'CRM / dashboard' language returns mostly_supported", () => {
    const r = scoreEvidenceText("We use a CRM with a sales pipeline view.");
    expect(r.status).toBe("mostly_supported");
    expect(r.severity).toBe(1);
  });

  it("automated/documented language returns verified_strength", () => {
    const r = scoreEvidenceText("Every deal is always tracked and fully documented in our automated system.");
    expect(r.status).toBe("verified_strength");
    expect(r.severity).toBe(0);
  });

  it("very short answer with no signal returns not_enough_evidence", () => {
    expect(scoreEvidenceText("ok fine").status).toBe("not_enough_evidence");
  });

  it("longer ambiguous answer returns needs_review", () => {
    const r = scoreEvidenceText("We handle this regularly across the team in various ways.");
    expect(r.status).toBe("needs_review");
  });

  it("severity output never exceeds 0..5 bounds", () => {
    for (const txt of ["", "x", "lost revenue", "automated", "I don't know"]) {
      const r = scoreEvidenceText(txt);
      expect(r.severity).toBeGreaterThanOrEqual(0);
      expect(r.severity).toBeLessThanOrEqual(5);
    }
  });
});