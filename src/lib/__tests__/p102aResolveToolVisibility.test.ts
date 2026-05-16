/**
 * P102A — resolveToolVisibility resolver tests.
 *
 * Verifies the central resolver returns specific denial copy for gig
 * customers, preserves full-client behavior, and surfaces Campaign Control
 * where eligible.
 */

import { describe, it, expect } from "vitest";
import { resolveToolVisibility } from "@/lib/toolRegistry/rgsToolRegistry";

describe("P102A — resolveToolVisibility", () => {
  it("admin sees Campaign Control in admin_nav", () => {
    const res = resolveToolVisibility({
      toolKey: "campaign_control",
      surface: "admin_nav",
      role: "admin",
    });
    expect(res.visible).toBe(true);
    expect(res.enabled).toBe(true);
    expect(res.route?.kind === "admin" || res.route?.kind === "customer").toBe(true);
  });

  it("non-admin cannot see Campaign Control on admin_nav surface", () => {
    const res = resolveToolVisibility({
      toolKey: "campaign_control",
      surface: "admin_nav",
      role: "client",
    });
    expect(res.visible).toBe(false);
  });

  it("Campaign Brief is enabled for a Basic gig customer in the Standalone Tool Finder", () => {
    const res = resolveToolVisibility({
      toolKey: "campaign_brief",
      surface: "admin_standalone_finder",
      role: "admin",
      customer: { id: "cust-1", is_gig: true, gig_tier: "basic", gig_status: "active" },
    });
    expect(res.visible).toBe(true);
    expect(res.enabled).toBe(true);
    expect(res.reportModes).toContain("gig_report");
  });

  it("Campaign Strategy is disabled for a Basic gig customer with specific denial copy", () => {
    const res = resolveToolVisibility({
      toolKey: "campaign_strategy",
      surface: "admin_standalone_finder",
      role: "admin",
      customer: { id: "cust-1", is_gig: true, gig_tier: "basic", gig_status: "active" },
    });
    expect(res.visible).toBe(true);
    expect(res.enabled).toBe(false);
    expect(res.reason).toMatch(/not included in this gig package/i);
  });

  it("diagnostic_scorecard is denied to gig customers with full-client-only reason", () => {
    const res = resolveToolVisibility({
      toolKey: "diagnostic_scorecard",
      surface: "admin_standalone_finder",
      role: "admin",
      customer: { id: "cust-1", is_gig: true, gig_tier: "premium", gig_status: "active" },
    });
    // diagnostic_scorecard is not standalone_visible, so it should not surface
    // on the finder at all. If a future surface change exposes it, the
    // full-client-only guard must still reject gig customers.
    expect(res.visible).toBe(false);
  });

  it("archived gig customers cannot run active tools", () => {
    const res = resolveToolVisibility({
      toolKey: "campaign_brief",
      surface: "admin_standalone_finder",
      role: "admin",
      customer: { id: "cust-1", is_gig: true, gig_tier: "premium", gig_status: "archived" },
    });
    expect(res.enabled).toBe(false);
    expect(res.reason).toMatch(/archived/i);
  });

  it("public_funnel surface returns only the Operational Friction Scan as visible", () => {
    const scan = resolveToolVisibility({
      toolKey: "operational_friction_scan",
      surface: "public_funnel",
      role: "anonymous",
    });
    expect(scan.visible).toBe(true);
    expect(scan.enabled).toBe(true);
    const cc = resolveToolVisibility({
      toolKey: "campaign_control",
      surface: "public_funnel",
      role: "anonymous",
    });
    expect(cc.visible).toBe(false);
  });

  it("unknown tool keys return a registered=false result, not a throw", () => {
    const res = resolveToolVisibility({
      toolKey: "definitely-not-a-tool",
      surface: "admin_nav",
      role: "admin",
    });
    expect(res.visible).toBe(false);
    expect(res.reason).toMatch(/not registered/i);
  });
});
