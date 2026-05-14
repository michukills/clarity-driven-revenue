import { describe, expect, it } from "vitest";
import {
  getDownstreamTools,
  getToolInterlock,
  missingRequiredInputsForTool,
  toolsConsumingSignal,
  toolsProducingSignal,
  validateToolInterlocks,
} from "@/lib/rgsInterlock/interlockEngine";
import { RGS_TOOL_INTERLOCK_REGISTRY } from "@/lib/rgsInterlock/toolInterlockRegistry";

describe("RGS Tool Interlock registry", () => {
  it("defines the core RGS operating tools", () => {
    const keys = new Set(RGS_TOOL_INTERLOCK_REGISTRY.map((tool) => tool.toolKey));
    for (const key of [
      "scorecard",
      "paid_diagnostic",
      "owner_diagnostic_interview",
      "swot_strategic_matrix",
      "buyer_persona_icp",
      "evidence_vault",
      "repair_map",
      "implementation_roadmap",
      "sop_training_bible",
      "workflow_process_mapping",
      "decision_rights_accountability",
      "tool_assignment_training_tracker",
      "rgs_control_system",
      "campaign_control_system",
      "reports_exports",
      "rgs_guide_bot",
      "revenue_risk_monitor",
      "owner_decision_dashboard",
      "priority_action_tracker",
    ]) {
      expect(keys.has(key)).toBe(true);
    }
  });

  it("validates interlock references and client/admin field separation", () => {
    expect(validateToolInterlocks()).toEqual({ ok: true, issues: [] });
  });

  it("shows Campaign Control consuming SWOT, persona, scorecard, repair, and Control System signals", () => {
    const campaign = getToolInterlock("campaign_control_system");
    expect(campaign?.consumesSignals).toEqual(expect.arrayContaining([
      "swot_signal",
      "buyer_persona_signal",
      "gear_scores",
      "repair_map_item",
      "control_system_signal",
    ]));
    expect(campaign?.clientVisibleFields).toContain("approved_assets");
    expect(campaign?.adminOnlyFields).toContain("admin_only_rationale");
    expect(campaign?.safetyBoundaries.join(" ")).toMatch(/No fake GA4/);
  });

  it("preserves deterministic Scorecard as a source, not an AI-recalculated score", () => {
    const scorecard = getToolInterlock("scorecard");
    expect(scorecard?.producesSignals).toEqual(expect.arrayContaining(["deterministic_score", "gear_scores"]));
    expect(scorecard?.safetyBoundaries.join(" ")).toMatch(/Deterministic scoring remains the source of truth/);
  });

  it("can trace signal producers and consumers", () => {
    expect(toolsProducingSignal("swot_signal").map((tool) => tool.toolKey)).toContain("swot_strategic_matrix");
    expect(toolsConsumingSignal("swot_signal").map((tool) => tool.toolKey)).toEqual(expect.arrayContaining([
      "repair_map",
      "implementation_roadmap",
      "campaign_control_system",
    ]));
    expect(getDownstreamTools("swot_strategic_matrix").map((tool) => tool.toolKey)).toContain("campaign_control_system");
  });

  it("reports missing required inputs without granting scope", () => {
    expect(missingRequiredInputsForTool("campaign_control_system", [])).toEqual(["campaign_profile"]);
    expect(missingRequiredInputsForTool("campaign_control_system", ["campaign_profile"])).toEqual([]);
  });
});

