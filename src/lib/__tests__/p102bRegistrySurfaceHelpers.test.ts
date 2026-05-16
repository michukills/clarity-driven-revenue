/**
 * P102B — Registry-backed surface helpers + hardcoded nav alignment.
 *
 * Verifies that the surface helpers derive from RGS_TOOL_REGISTRY (not a
 * parallel list), that key surfaces (admin nav, client portal, diagnostic /
 * implementation / control workspaces, standalone finder, reports) project
 * the registry through the canonical resolver, and that hardcoded UI nav
 * arrays in PortalShell.tsx cannot drift away from the registry contract.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  listAdminNavTools,
  listClientPortalTools,
  listDiagnosticWorkspaceTools,
  listImplementationWorkspaceTools,
  listControlSystemTools,
  listStandaloneFinderTools,
  listReportCapableTools,
  listRgsToolsForSurfaceWithContext,
} from "@/lib/toolRegistry/rgsToolSurfaces";
import {
  RGS_TOOL_REGISTRY,
  listRgsToolsForSurface,
  resolveToolVisibility,
} from "@/lib/toolRegistry/rgsToolRegistry";
import { TOOL_REPORT_SECTION_CATALOG } from "@/lib/reports/toolReportSectionCatalog";

const PORTAL_SHELL = readFileSync(
  resolve(__dirname, "../../components/portal/PortalShell.tsx"),
  "utf8",
);

describe("P102B — surface helpers derive from RGS_TOOL_REGISTRY", () => {
  it("listAdminNavTools is a subset of admin_visible registry tools and includes Campaign Control", () => {
    const keys = listAdminNavTools({ role: "admin" }).map((t) => t.tool_key);
    expect(keys).toContain("campaign_control");
    // never expose public-only entry as an admin tool surface
    expect(keys).not.toContain("operational_friction_scan");
    // every returned key must be registered
    for (const k of keys) {
      expect(RGS_TOOL_REGISTRY.some((t) => t.tool_key === k)).toBe(true);
    }
  });

  it("non-admin role gets nothing on admin_nav surface", () => {
    expect(listAdminNavTools({ role: "client" })).toEqual([]);
    expect(listAdminNavTools({ role: "anonymous" })).toEqual([]);
  });

  it("listClientPortalTools never returns admin-only or full-client-only tools for gig customers", () => {
    const gig = {
      role: "client" as const,
      customer: {
        id: "c1",
        is_gig: true,
        gig_tier: "premium" as const,
        gig_status: "active" as const,
      },
    };
    const keys = listClientPortalTools(gig).map((t) => t.tool_key);
    for (const k of keys) {
      const t = RGS_TOOL_REGISTRY.find((x) => x.tool_key === k)!;
      expect(t.client_visible, `${k} must be client_visible`).toBe(true);
      expect(t.full_client_only, `${k} must not be full_client_only for gig`).toBe(false);
      expect(t.access_scope, `${k} must not be admin_only`).not.toBe("admin_only");
    }
  });

  it("workspace helpers return only tools flagged for that workspace", () => {
    for (const t of listDiagnosticWorkspaceTools()) {
      expect(RGS_TOOL_REGISTRY.find((x) => x.tool_key === t.tool_key)!.diagnostic_visible).toBe(true);
    }
    for (const t of listImplementationWorkspaceTools()) {
      expect(RGS_TOOL_REGISTRY.find((x) => x.tool_key === t.tool_key)!.implementation_visible).toBe(true);
    }
    for (const t of listControlSystemTools()) {
      expect(RGS_TOOL_REGISTRY.find((x) => x.tool_key === t.tool_key)!.control_system_visible).toBe(true);
    }
  });

  it("expected diagnostic / implementation / control tools are present in their workspace helper", () => {
    const dx = listDiagnosticWorkspaceTools().map((t) => t.tool_key);
    expect(dx).toEqual(expect.arrayContaining([
      "diagnostic_scorecard",
      "owner_interview",
      "diagnostic_report",
      "priority_repair_map",
    ]));
    const impl = listImplementationWorkspaceTools().map((t) => t.tool_key);
    expect(impl).toEqual(expect.arrayContaining([
      "implementation_roadmap",
      "sop_training_bible",
      "workflow_process_mapping",
      "decision_rights_accountability",
    ]));
    const cs = listControlSystemTools().map((t) => t.tool_key);
    expect(cs).toEqual(expect.arrayContaining([
      "revenue_risk_monitor",
      "owner_decision_dashboard",
      "monthly_system_review",
    ]));
  });

  it("standalone finder helper preserves disabled-but-visible entries with denial copy for gig customers", () => {
    const finder = listStandaloneFinderTools({
      role: "admin",
      customer: { id: "c1", is_gig: true, gig_tier: "basic", gig_status: "active" },
    });
    const strategy = finder.find((t) => t.tool_key === "campaign_strategy");
    expect(strategy?.visible).toBe(true);
    expect(strategy?.enabled).toBe(false);
    expect(strategy?.reason).toMatch(/not included in this gig package/i);
    const brief = finder.find((t) => t.tool_key === "campaign_brief");
    expect(brief?.enabled).toBe(true);
  });

  it("standalone finder full-client behavior is preserved (no gig context)", () => {
    const finder = listStandaloneFinderTools({ role: "admin" });
    const keys = finder.filter((t) => t.enabled).map((t) => t.tool_key);
    expect(keys).toEqual(expect.arrayContaining([
      "sop_training_bible",
      "workflow_process_mapping",
      "decision_rights_accountability",
      "buyer_persona_tool",
      "rgs_stability_snapshot",
      "campaign_brief",
      "campaign_strategy",
      "campaign_video_plan",
    ]));
  });

  it("listReportCapableTools aligns with the P101 section catalog", () => {
    const reportable = listReportCapableTools().map((t) => t.tool_key);
    for (const key of Object.keys(TOOL_REPORT_SECTION_CATALOG)) {
      expect(reportable, `${key} should be report-capable`).toContain(key);
    }
  });

  it("gig customers never receive full_rgs_report mode from helpers", () => {
    const gig = {
      role: "admin" as const,
      customer: { id: "c1", is_gig: true, gig_tier: "premium" as const, gig_status: "active" as const },
    };
    const finder = listStandaloneFinderTools(gig);
    for (const t of finder) {
      expect(t.supported_report_modes).not.toContain("full_rgs_report");
    }
  });

  it("listRgsToolsForSurfaceWithContext('public_funnel') only returns the Operational Friction Scan", () => {
    const pub = listRgsToolsForSurfaceWithContext("public_funnel", { role: "anonymous" });
    expect(pub.map((t) => t.tool_key)).toEqual(["operational_friction_scan"]);
  });
});

describe("P102B — PortalShell admin nav alignment with registry", () => {
  it("Campaign Control appears exactly once in the admin nav arrays", () => {
    const matches = PORTAL_SHELL.match(/\/admin\/campaign-control"/g) ?? [];
    expect(matches.length).toBe(1);
  });

  it("admin nav references registry-resolved routes for major workspaces / tools", () => {
    const expectedRoutes = [
      "/admin/diagnostic-workspace",
      "/admin/implementation-workspace",
      "/admin/campaign-control",
      "/admin/standalone-tool-runner",
    ];
    for (const route of expectedRoutes) {
      expect(PORTAL_SHELL).toContain(route);
    }
    // Registry must agree: Campaign Control and Standalone Runner resolve
    // to the same admin hrefs the nav renders.
    const cc = resolveToolVisibility({ toolKey: "campaign_control", surface: "admin_nav", role: "admin" });
    expect(cc.route?.kind === "admin" || cc.route?.kind === "customer").toBe(true);
    const cmd = (cc.route && "href" in cc.route ? cc.route.href : "") as string;
    expect(cmd).toBe("/admin/campaign-control");
    const runner = resolveToolVisibility({ toolKey: "standalone_tool_runner", surface: "admin_nav", role: "admin" });
    const runnerHref = (runner.route && "href" in runner.route ? runner.route.href : "") as string;
    expect(runnerHref).toBe("/admin/standalone-tool-runner");
  });

  it("admin nav does not expose public-only tools as admin tools", () => {
    // /scan is the public funnel; it must not be rendered as an admin tool
    // in the sidebar nav (which only includes /admin/* routes here).
    expect(PORTAL_SHELL).not.toMatch(/to:\s*"\/scan"/);
  });

  it("admin nav does not silently drop full_client_only workspaces — they remain admin-visible", () => {
    // Diagnostic + Implementation workspaces remain admin-reachable even
    // though their underlying tools are full_client_only.
    const adminVisible = listRgsToolsForSurface("admin_nav").map((t) => t.tool_key);
    expect(adminVisible).toEqual(expect.arrayContaining([
      "diagnostic_scorecard",
      "implementation_roadmap",
      "revenue_risk_monitor",
    ]));
  });
});
