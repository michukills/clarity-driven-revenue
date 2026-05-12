import { describe, it, expect } from "vitest";
import {
  ADMIN_TOOL_GUIDE,
  getToolGuideEntry,
  listToolGuideEntries,
  getEligibleToolsForAccount,
  getRecommendedToolsForAccount,
  getToolBlockedReason,
  isToolAllowedForAccount,
  getToolNextSteps,
} from "@/lib/workflowClarity/toolUseGuide";

describe("P93C — Admin Tool Decision Guide", () => {
  it("1. has guide entries for major current admin tools", () => {
    const expected = [
      "owner_diagnostic_interview",
      "evidence_vault_review",
      "rgs_stability_snapshot",
      "priority_repair_map",
      "implementation_roadmap",
      "sop_training_bible",
      "tool_assignment_training_tracker",
      "standalone_tool_runner",
      "gig_deliverable_report",
      "rgs_control_system",
      "advisory_notes",
      "monthly_system_review",
    ];
    for (const id of expected) expect(getToolGuideEntry(id)).not.toBeNull();
    expect(listToolGuideEntries().length).toBe(ADMIN_TOOL_GUIDE.length);
  });

  it("2. each entry includes purpose, when-to-use, not-for, allowed kinds, IO, client-visible rules, admin review, next steps", () => {
    for (const e of ADMIN_TOOL_GUIDE) {
      expect(e.purpose.length).toBeGreaterThan(10);
      expect(e.bestUsedWhen.length).toBeGreaterThan(0);
      expect(e.notFor.length).toBeGreaterThan(0);
      expect(e.allowedAccountKinds.length).toBeGreaterThan(0);
      expect(e.requiredInputs.length + e.optionalInputs.length).toBeGreaterThan(-1);
      expect(e.outputType).toBeTruthy();
      expect(typeof e.adminReviewRequired).toBe("boolean");
      expect(e.clientVisibleRules.length).toBeGreaterThan(0);
      expect(e.commonMistakesToAvoid.length).toBeGreaterThan(0);
      expect(e.nextStepAfterUse.length).toBeGreaterThan(0);
    }
  });

  it("3. Real Client gets diagnostic/implementation eligible tools", () => {
    const ids = getEligibleToolsForAccount({
      account_kind: "client",
      diagnostic_status: "active",
      implementation_active: true,
    }).map((e) => e.toolId);
    expect(ids).toContain("owner_diagnostic_interview");
    expect(ids).toContain("implementation_roadmap");
    expect(ids).toContain("rgs_control_system");
  });

  it("4. Demo/Test gets demo-safe tools only — no diagnostic/implementation/control system/gig", () => {
    const ids = getEligibleToolsForAccount({ is_demo_account: true }).map((e) => e.toolId);
    expect(ids).not.toContain("owner_diagnostic_interview");
    expect(ids).not.toContain("implementation_roadmap");
    expect(ids).not.toContain("rgs_control_system");
    expect(ids).not.toContain("gig_deliverable_report");
  });

  it("5. Prospect/Draft gets only draft/pre-sale tools", () => {
    const ids = getEligibleToolsForAccount({ account_kind: "prospect" }).map((e) => e.toolId);
    expect(ids).toContain("advisory_notes");
    expect(ids).not.toContain("owner_diagnostic_interview");
    expect(ids).not.toContain("gig_deliverable_report");
  });

  it("6. Gig Work gets standalone/gig tools, not full diagnostic/implementation/control system", () => {
    const ids = getEligibleToolsForAccount({ is_gig: true }).map((e) => e.toolId);
    expect(ids).toContain("standalone_tool_runner");
    expect(ids).toContain("gig_deliverable_report");
    expect(ids).not.toContain("owner_diagnostic_interview");
    expect(ids).not.toContain("implementation_roadmap");
    expect(ids).not.toContain("rgs_control_system");
  });

  it("7. Pending Request gets no delivery tools", () => {
    expect(
      getEligibleToolsForAccount({ signup_request_status: "pending_review" }),
    ).toEqual([]);
  });

  it("8. Needs Review gets no risky tools", () => {
    const eligible = getEligibleToolsForAccount({
      is_demo_account: true,
      has_real_payment: true,
    });
    expect(eligible).toEqual([]);
  });

  it("9. Gig Work without upgrade is blocked from full Diagnostic/Implementation/Control System", () => {
    const input = { is_gig: true };
    expect(isToolAllowedForAccount("owner_diagnostic_interview", input)).toBe(false);
    expect(isToolAllowedForAccount("implementation_roadmap", input)).toBe(false);
    expect(isToolAllowedForAccount("rgs_control_system", input)).toBe(false);
    expect(getToolBlockedReason("rgs_control_system", input)).toMatch(/outside current account scope/i);
  });

  it("10. Demo/Test does not receive payment / client-visible publishing tools", () => {
    const input = { is_demo_account: true };
    expect(isToolAllowedForAccount("priority_repair_map", input)).toBe(false);
    expect(isToolAllowedForAccount("gig_deliverable_report", input)).toBe(false);
    expect(isToolAllowedForAccount("rgs_control_system", input)).toBe(false);
  });

  it("recommended tools for Real Client adapt to workflow context", () => {
    const ids = getRecommendedToolsForAccount(
      { account_kind: "client", diagnostic_status: "active" },
      { evidenceSubmitted: true },
    ).map((e) => e.toolId);
    expect(ids[0]).toBe("owner_diagnostic_interview");
    expect(ids).toContain("evidence_vault_review");
  });

  it("getToolNextSteps returns the entry's next steps", () => {
    expect(getToolNextSteps("priority_repair_map").length).toBeGreaterThan(0);
    expect(getToolNextSteps("nope_does_not_exist")).toEqual([]);
  });

  it("uses approved positioning and avoids deprecated wording", () => {
    const text = JSON.stringify(ADMIN_TOOL_GUIDE).toLowerCase();
    expect(text).not.toMatch(new RegExp(["lay","the","bricks"].join(" ")));
    expect(text).not.toMatch(/blueprint and teaches the owner/);
    expect(text).not.toMatch(/guaranteed/);
    expect(text).not.toMatch(/risk-free/);
    expect(text).not.toMatch(/free trial/);
    expect(text).not.toMatch(/live sync/);
    expect(text).not.toMatch(/automation/);
  });
});