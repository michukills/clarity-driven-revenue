/**
 * P79 — Client-Facing Tool Access Audit / Guided Independence contract.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CLIENT_TOOL_ACCESS_AUDIT,
  ADMIN_ONLY_TOOL_KEYS,
  getAuditEntry,
} from "@/config/clientToolAccessAudit";
import { TOOL_WALKTHROUGH_VIDEO_REGISTRY } from "@/config/toolWalkthroughVideos";

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

const REQUIRED_TOOLS = [
  "owner_diagnostic_interview",
  "diagnostic_tool_sequence",
  "rgs_stability_scorecard",
  "structural_health_report",
  "rgs_repair_map",
  "evidence_vault",
  "sop_training_bible",
  "cost_of_friction_calculator",
  "stability_to_value_lens",
  "revenue_risk_monitor",
  "worn_tooth_signals",
  "reality_check_flags",
  "buyer_persona_icp_journey",
  "workflow_process_mapping",
  "decision_rights_accountability",
  "owner_decision_dashboard",
  "tool_assignment_training_tracker",
  "advisory_notes_clarification_log",
  "tool_specific_reports",
  "standalone_tool_runner",
  "admin_diagnostic_review_dashboard",
  "payment_access_invite",
  "connector_source_of_truth_matrix",
  "client_health_renewal_risk",
  "ai_system_readiness_brain_registry",
];

describe("P79 — client tool access audit registry", () => {
  it("classifies every required RGS tool", () => {
    for (const k of REQUIRED_TOOLS) {
      const e = getAuditEntry(k);
      expect(e, `missing audit entry for ${k}`).not.toBeNull();
    }
  });

  it("client-facing recommendations declare required gates", () => {
    for (const e of CLIENT_TOOL_ACCESS_AUDIT) {
      if (e.recommended_access === "admin_only") continue;
      expect(e.required_gates.length, `${e.tool_key} missing gates`).toBeGreaterThan(0);
    }
  });

  it("tools that publish/approve official findings require approval controls", () => {
    const mustApprove = [
      "structural_health_report",
      "rgs_repair_map",
      "worn_tooth_signals",
      "reality_check_flags",
      "tool_specific_reports",
      "advisory_notes_clarification_log",
      "rgs_stability_scorecard",
    ];
    for (const k of mustApprove) {
      const e = getAuditEntry(k)!;
      expect(e.approval_controls_required, `${k} must require approval`).toBe(true);
    }
  });

  it("admin-only tools remain admin-only", () => {
    for (const k of [
      "standalone_tool_runner",
      "admin_diagnostic_review_dashboard",
      "payment_access_invite",
      "connector_source_of_truth_matrix",
      "client_health_renewal_risk",
      "ai_system_readiness_brain_registry",
    ]) {
      const e = getAuditEntry(k)!;
      expect(e.recommended_access).toBe("admin_only");
      expect(ADMIN_ONLY_TOOL_KEYS.has(k)).toBe(true);
    }
  });

  it("client-facing AI is gated to specific safe surfaces only", () => {
    for (const e of CLIENT_TOOL_ACCESS_AUDIT) {
      if (!e.ai_allowed_client_side) continue;
      // Only SOP / Training Bible has approved client-facing AI today.
      expect(e.tool_key).toBe("sop_training_bible");
      expect(e.ai_brain_key).toBeTruthy();
      expect(e.approval_controls_required).toBe(false);
      // Even with AI, must not be allowed to publish official findings.
      expect(e.deterministic_override_risk).toBe(false);
    }
  });

  it("walkthrough_video_key references match the P78 walkthrough registry", () => {
    const known = new Set(TOOL_WALKTHROUGH_VIDEO_REGISTRY.map((v) => v.tool_key));
    for (const e of CLIENT_TOOL_ACCESS_AUDIT) {
      if (!e.walkthrough_video_key) continue;
      expect(known.has(e.walkthrough_video_key), `unknown walkthrough key ${e.walkthrough_video_key}`).toBe(true);
    }
  });

  it("client_route entries point at /portal/* paths only (never admin routes)", () => {
    for (const e of CLIENT_TOOL_ACCESS_AUDIT) {
      if (!e.client_route) continue;
      expect(e.client_route.startsWith("/portal/")).toBe(true);
      expect(e.client_route.startsWith("/admin/")).toBe(false);
    }
  });

  it("admin_route entries point at /admin/* paths only", () => {
    for (const e of CLIENT_TOOL_ACCESS_AUDIT) {
      if (!e.admin_route) continue;
      expect(e.admin_route.startsWith("/admin/")).toBe(true);
    }
  });

  it("registry source uses no fake live-sync or banned positioning language", () => {
    const src = read("src/config/clientToolAccessAudit.ts");
    for (const re of [
      /live[- ]sync(ed)?/i,
      /real[- ]time/i,
      /trusted by/i,
      /guaranteed/i,
      /AI advisor/i,
      /Mirror, Not the Map/i,
      new RegExp(["lay", "the", "bricks"].join(" "), "i"),
      /provides the blueprint/i,
    ]) {
      expect(src).not.toMatch(re);
    }
  });
});

describe("P79 — route gating verification (App.tsx)", () => {
  const app = read("src/App.tsx");

  it("client tool routes for SOP, Cost of Friction, Stability-to-Value, and Revenue Risk are wrapped in ClientToolGuard", () => {
    for (const path of [
      "/portal/tools/sop-training-bible",
      "/portal/tools/cost-of-friction",
      "/portal/tools/stability-to-value-lens",
      "/portal/tools/revenue-risk-monitor",
    ]) {
      const line = app.split("\n").find((l) => l.includes(`path="${path}"`));
      expect(line, `${path} route not present in App.tsx`).toBeTruthy();
      expect(line!, `${path} not wrapped in ClientToolGuard`).toMatch(/ClientToolGuard/);
    }
  });

  it("admin routes for standalone runner, report drafts, payments, client health, walkthroughs require admin role", () => {
    for (const path of [
      "/admin",
      "/admin/standalone-tool-runner",
      "/admin/report-drafts",
      "/admin/payments",
      "/admin/client-health",
      "/admin/walkthrough-videos",
      "/admin/diagnostic-workspace",
    ]) {
      const line = app.split("\n").find((l) => l.includes(`path="${path}"`));
      expect(line, `${path} route not present in App.tsx`).toBeTruthy();
      expect(line!, `${path} not admin-protected`).toMatch(/requireRole="admin"/);
    }
  });
});