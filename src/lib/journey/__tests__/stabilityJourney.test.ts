import { describe, it, expect } from "vitest";
import { deriveStabilityJourney } from "../stabilityJourney";
import type { DiagnosticToolSequenceRow } from "@/lib/diagnostics/toolSequence";

const seq = (ranked: string[], override: string[] | null = null): DiagnosticToolSequenceRow => ({
  customer_id: "c1",
  ranked_tool_keys: ranked,
  rationale: ranked.map((k) => ({ tool_key: k, reason: `because ${k}` })),
  admin_override_keys: override,
  admin_override_by: override ? "admin" : null,
  admin_override_at: override ? new Date().toISOString() : null,
  generated_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

describe("Stability Journey derivation", () => {
  it("recommends the Owner Diagnostic Interview before completion", () => {
    const r = deriveStabilityJourney({
      ownerInterviewCompletedAt: null,
      interviewAnswers: new Map(),
      completedToolKeys: new Set(),
      sequence: null,
    });
    expect(r.recommendedNext.key).toBe("owner_diagnostic_interview");
    expect(r.phase).toBe("intake_not_started");
    expect(r.ownerInterviewComplete).toBe(false);
  });

  it("uses persisted sequence order after interview completion", () => {
    const r = deriveStabilityJourney({
      ownerInterviewCompletedAt: new Date().toISOString(),
      interviewAnswers: new Map([["demand_sources", "x"]]),
      completedToolKeys: new Set(),
      sequence: seq(["buyer_persona_tool", "revenue_leak_finder"]),
    });
    expect(r.recommendedNext.key).toBe("buyer_persona_tool");
    expect(r.remainingToolKeys[0]).toBe("buyer_persona_tool");
  });

  it("respects admin override order", () => {
    const r = deriveStabilityJourney({
      ownerInterviewCompletedAt: new Date().toISOString(),
      interviewAnswers: new Map(),
      completedToolKeys: new Set(),
      sequence: seq(["buyer_persona_tool"], ["revenue_leak_finder", "buyer_persona_tool"]),
    });
    expect(r.recommendedNext.key).toBe("revenue_leak_finder");
  });

  it("skips completed tools in next-move selection", () => {
    const r = deriveStabilityJourney({
      ownerInterviewCompletedAt: new Date().toISOString(),
      interviewAnswers: new Map(),
      completedToolKeys: new Set(["buyer_persona_tool"]),
      sequence: seq(["buyer_persona_tool", "process_breakdown_tool"]),
    });
    expect(r.recommendedNext.key).toBe("process_breakdown_tool");
    expect(r.completedToolKeys).toContain("buyer_persona_tool");
  });

  it("never claims report ready without explicit report state", () => {
    const r = deriveStabilityJourney({
      ownerInterviewCompletedAt: new Date().toISOString(),
      interviewAnswers: new Map(),
      completedToolKeys: new Set(["buyer_persona_tool", "revenue_leak_finder", "rgs_stability_scorecard", "customer_journey_mapper", "process_breakdown_tool"]),
      sequence: seq(["buyer_persona_tool"]),
      reportState: null,
    });
    expect(r.reportReadiness).not.toBe("stability_report_ready");
  });

  it("only reports stability_report_ready when report state is ready", () => {
    const r = deriveStabilityJourney({
      ownerInterviewCompletedAt: new Date().toISOString(),
      interviewAnswers: new Map(),
      completedToolKeys: new Set(),
      sequence: seq([]),
      reportState: "ready",
    });
    expect(r.phase).toBe("stability_report_ready");
    expect(r.reportReadiness).toBe("stability_report_ready");
  });

  it("derives gear states deterministically from interview answers", () => {
    const answers = new Map<string, string>([
      ["demand_sources", "Mostly referrals"],
      ["demand_reliable", "Referrals"],
      ["demand_unreliable", "Ads"],
    ]);
    const r = deriveStabilityJourney({
      ownerInterviewCompletedAt: new Date().toISOString(),
      interviewAnswers: answers,
      completedToolKeys: new Set(),
      sequence: null,
    });
    const demand = r.gears.find((g) => g.gear.key === "demand_generation")!;
    expect(demand.state).toBe("evidence_moderate");
    const finance = r.gears.find((g) => g.gear.key === "financial_visibility")!;
    // No finance answers but interview marked complete → in_progress, not fake-complete.
    expect(["in_progress", "not_started"]).toContain(finance.state);
  });

  it("uses no banned scope-language phrases in recommended-move reason", () => {
    const r = deriveStabilityJourney({
      ownerInterviewCompletedAt: null,
      interviewAnswers: new Map(),
      completedToolKeys: new Set(),
      sequence: null,
    });
    const banned = ["quarterly", "ongoing", "after major changes", "ask RGS if", "use anytime", "between reviews"];
    for (const phrase of banned) {
      expect(r.recommendedNext.reason.toLowerCase()).not.toContain(phrase.toLowerCase());
    }
  });
});
