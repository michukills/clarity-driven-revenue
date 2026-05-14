/**
 * P93E-E2G-P2.7B — Diagnostic-state-aware CustomerWorkState tests.
 */
import { describe, it, expect } from "vitest";
import { getCustomerWorkState } from "@/lib/workflow/customerWorkState";

const base = {
  id: "cust-1",
  lifecycle_state: "diagnostic",
  package_diagnostic: true,
  account_kind: "client",
  email: "owner@example.com",
};

describe("getCustomerWorkState — diagnostic context", () => {
  it("no session → primary CTA reads as Start", () => {
    const s = getCustomerWorkState(base, { diagnostic: { hasInterviewSession: false, industrySelected: true } });
    expect(s.primaryCta?.label).toMatch(/Start Diagnostic Interview/i);
    expect(s.primaryCta?.route).toBe("/admin/industry-interviews");
  });

  it("missing industry → primary CTA asks to choose industry and is blocked", () => {
    const s = getCustomerWorkState(base, { diagnostic: { industrySelected: false } });
    expect(s.primaryCta?.label).toMatch(/Choose Industry/i);
    expect(s.primaryCta?.blockedReason).toMatch(/industry/i);
    expect(s.nextStep).toMatch(/industry/i);
  });

  it("in-progress session → Resume routes to the session", () => {
    const s = getCustomerWorkState(base, {
      diagnostic: {
        hasInterviewSession: true,
        industrySelected: true,
        interviewStatus: "in_progress",
        interviewResumeRoute: "/admin/industry-interviews/sess-9",
      },
    });
    expect(s.primaryCta?.label).toMatch(/Resume/i);
    expect(s.primaryCta?.route).toBe("/admin/industry-interviews/sess-9");
  });

  it("evidence submitted but not reviewed → next step asks for review", () => {
    const s = getCustomerWorkState(base, {
      diagnostic: {
        hasInterviewSession: true,
        industrySelected: true,
        interviewStatus: "completed",
        evidenceSubmitted: true,
        evidenceReviewed: false,
      },
    });
    expect(s.currentWork).toMatch(/Evidence submitted/i);
    expect(s.nextStep).toMatch(/review/i);
  });

  it("undefined diagnostic context never invents completion", () => {
    const s = getCustomerWorkState(base);
    expect(s.primaryCta?.label).toBe("Open Industry Diagnostic Interview");
    expect(s.currentWork).not.toMatch(/complete|published|review/i);
  });
});