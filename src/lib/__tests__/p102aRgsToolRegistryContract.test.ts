/**
 * P102A — RGS Tool Registry contract.
 *
 * Locks the central tool registry as the single source of truth for tool
 * visibility/access metadata. Verifies Campaign Control is registered and
 * surfaced, report-capable tools align with the section catalog, and
 * full-client-only tools never advertise as gig-capable.
 */

import { describe, it, expect } from "vitest";
import {
  RGS_TOOL_REGISTRY,
  getRgsTool,
  listRgsToolsForSurface,
} from "@/lib/toolRegistry/rgsToolRegistry";
import { TOOL_REPORT_SECTION_CATALOG } from "@/lib/reports/toolReportSectionCatalog";

describe("P102A — RGS Tool Registry contract", () => {
  it("every entry has the required identity + visibility fields", () => {
    for (const t of RGS_TOOL_REGISTRY) {
      expect(t.tool_key, "tool_key required").toBeTruthy();
      expect(t.display_name, `display_name required for ${t.tool_key}`).toBeTruthy();
      expect(t.short_description, `short_description required for ${t.tool_key}`).toBeTruthy();
      expect(t.category, `category required for ${t.tool_key}`).toBeTruthy();
      expect(t.lifecycle_zone, `lifecycle_zone required for ${t.tool_key}`).toBeTruthy();
      expect(typeof t.gig_capable).toBe("boolean");
      expect(typeof t.full_client_only).toBe("boolean");
      expect(typeof t.admin_visible).toBe("boolean");
      expect(typeof t.report_capable).toBe("boolean");
      expect(typeof t.resolveRoute).toBe("function");
    }
  });

  it("has no duplicate tool_keys", () => {
    const keys = RGS_TOOL_REGISTRY.map((t) => t.tool_key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("registers Campaign Control + Brief + Strategy + Video Plan", () => {
    expect(getRgsTool("campaign_control")).toBeTruthy();
    expect(getRgsTool("campaign_brief")).toBeTruthy();
    expect(getRgsTool("campaign_strategy")).toBeTruthy();
    expect(getRgsTool("campaign_video_plan")).toBeTruthy();
  });

  it("Campaign Control surfaces on admin nav and campaign_control surface, never public", () => {
    const cc = getRgsTool("campaign_control")!;
    expect(cc.admin_visible).toBe(true);
    expect(cc.access_scope).not.toBe("public");
    expect(listRgsToolsForSurface("public_funnel").map((t) => t.tool_key)).not.toContain("campaign_control");
    expect(listRgsToolsForSurface("admin_nav").map((t) => t.tool_key)).toContain("campaign_control");
    expect(listRgsToolsForSurface("campaign_control").map((t) => t.tool_key)).toContain("campaign_control");
  });

  it("Campaign Brief + Strategy + Video Plan are gig-capable standalone tools and report-capable", () => {
    for (const key of ["campaign_brief", "campaign_strategy", "campaign_video_plan"] as const) {
      const t = getRgsTool(key)!;
      expect(t.gig_capable, `${key} should be gig_capable`).toBe(true);
      expect(t.full_client_only, `${key} should not be full_client_only`).toBe(false);
      expect(t.standalone_visible, `${key} should appear in Standalone Tool Finder`).toBe(true);
      expect(t.report_capable, `${key} should be report_capable`).toBe(true);
      expect(TOOL_REPORT_SECTION_CATALOG[key], `${key} must have a section catalog entry`).toBeTruthy();
    }
  });

  it("full-client-only tools are never gig_capable or standalone-visible", () => {
    const fullOnly = [
      "diagnostic_scorecard",
      "owner_interview",
      "evidence_vault",
      "diagnostic_report",
      "priority_repair_map",
      "implementation_roadmap",
      "revenue_risk_monitor",
    ];
    for (const key of fullOnly) {
      const t = getRgsTool(key)!;
      expect(t.full_client_only, `${key} should be full_client_only`).toBe(true);
      expect(t.gig_capable, `${key} must not be gig_capable`).toBe(false);
      expect(t.standalone_visible, `${key} must not appear in Standalone Tool Finder`).toBe(false);
    }
  });

  it("report-capable tools that align to P101 catalog declare matching section keys", () => {
    for (const t of RGS_TOOL_REGISTRY) {
      if (TOOL_REPORT_SECTION_CATALOG[t.tool_key]) {
        expect(t.report_capable, `${t.tool_key} has section catalog → report_capable must be true`).toBe(true);
      }
    }
  });

  it("Operational Friction Scan is the only public_funnel tool", () => {
    const pub = listRgsToolsForSurface("public_funnel");
    expect(pub.map((t) => t.tool_key)).toEqual(["operational_friction_scan"]);
  });
});
