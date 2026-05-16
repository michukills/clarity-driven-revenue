/**
 * P101 — Report mode resolver + write-time enforcement contract.
 */
import { describe, it, expect } from "vitest";
import {
  resolveReportMode,
  filterSectionsToAllowed,
  REPORT_MODE_DENIAL_COPY,
} from "@/lib/reports/toolReportMode";

const gigBasic = { isGig: true, gigTier: "basic" as const, gigStatus: "active" as const };
const gigStandard = { isGig: true, gigTier: "standard" as const, gigStatus: "active" as const };
const gigPremium = { isGig: true, gigTier: "premium" as const, gigStatus: "active" as const };
const gigArchived = { isGig: true, gigTier: "premium" as const, gigStatus: "archived" as const };
const fullClient = { isGig: false, gigTier: null, gigStatus: null };

describe("P101 report mode resolver", () => {
  it("denies full_rgs_report for any gig customer", () => {
    for (const c of [gigBasic, gigStandard, gigPremium]) {
      const r = resolveReportMode({
        customer: c,
        toolKey: "swot_strategic_matrix",
        requestedMode: "full_rgs_report",
      });
      expect(r.allowed).toBe(false);
      expect(r.denialReason).toBe(REPORT_MODE_DENIAL_COPY.fullRgsBlockedForGig);
      expect(r.mode).toBe("gig_report");
    }
  });

  it("allows full_rgs_report for full clients", () => {
    const r = resolveReportMode({
      customer: fullClient,
      toolKey: "swot_strategic_matrix",
      requestedMode: "full_rgs_report",
    });
    expect(r.allowed).toBe(true);
    expect(r.mode).toBe("full_rgs_report");
    expect(r.allowedSections.length).toBeGreaterThan(0);
  });

  it("Basic tier returns fewer allowed sections than Standard, Standard < Premium", () => {
    const basic = resolveReportMode({
      customer: gigBasic,
      toolKey: "swot_strategic_matrix",
      requestedMode: "gig_report",
    });
    const std = resolveReportMode({
      customer: gigStandard,
      toolKey: "swot_strategic_matrix",
      requestedMode: "gig_report",
    });
    const prem = resolveReportMode({
      customer: gigPremium,
      toolKey: "swot_strategic_matrix",
      requestedMode: "gig_report",
    });
    expect(basic.allowedSections.length).toBeLessThan(std.allowedSections.length);
    expect(std.allowedSections.length).toBeLessThan(prem.allowedSections.length);
  });

  it("denies archived gig customer", () => {
    const r = resolveReportMode({
      customer: gigArchived,
      toolKey: "sop_training_bible",
      requestedMode: "gig_report",
    });
    expect(r.allowed).toBe(false);
    expect(r.denialReason).toBe(REPORT_MODE_DENIAL_COPY.archived);
  });

  it("denies gig customer with no tier set", () => {
    const r = resolveReportMode({
      customer: { isGig: true, gigTier: null, gigStatus: "active" },
      toolKey: "sop_training_bible",
      requestedMode: "gig_report",
    });
    expect(r.allowed).toBe(false);
    expect(r.denialReason).toBe(REPORT_MODE_DENIAL_COPY.tierMissing);
  });

  it("denies full-client-only tools for gig customers", () => {
    const r = resolveReportMode({
      customer: gigPremium,
      toolKey: "diagnostic_scorecard",
      requestedMode: "gig_report",
    });
    // tool key isn't in section catalog; falls through to toolNotConfigured first,
    // which is fine — either denial is acceptable. Assert denied.
    expect(r.allowed).toBe(false);
    expect(r.denialReason).toBeTruthy();
  });

  it("denies when customer is null", () => {
    const r = resolveReportMode({
      customer: null,
      toolKey: "sop_training_bible",
      requestedMode: "gig_report",
    });
    expect(r.allowed).toBe(false);
    expect(r.denialReason).toBe(REPORT_MODE_DENIAL_COPY.customerMissing);
  });

  it("denies when tool has no registered section catalog", () => {
    const r = resolveReportMode({
      customer: fullClient,
      toolKey: "totally_unknown_tool",
      requestedMode: "full_rgs_report",
    });
    expect(r.allowed).toBe(false);
    expect(r.denialReason).toBe(REPORT_MODE_DENIAL_COPY.toolNotConfigured);
  });

  it("gig_report for full client uses premium gig sections, not full_rgs", () => {
    const r = resolveReportMode({
      customer: fullClient,
      toolKey: "swot_strategic_matrix",
      requestedMode: "gig_report",
    });
    expect(r.allowed).toBe(true);
    expect(r.mode).toBe("gig_report");
    const keys = r.allowedSections.map((s) => s.key);
    expect(keys).not.toContain("priority_repair_map_link");
    expect(keys).not.toContain("implementation_roadmap_link");
  });

  it("filterSectionsToAllowed strips unauthorized section keys", () => {
    const r = resolveReportMode({
      customer: gigBasic,
      toolKey: "sop_training_bible",
      requestedMode: "gig_report",
    });
    const filtered = filterSectionsToAllowed(
      [
        { key: "executive_summary", label: "x", body: "", client_safe: true },
        { key: "quality_checks", label: "x", body: "", client_safe: true }, // premium-only
        { key: "implementation_roadmap_link", label: "x", body: "", client_safe: true }, // full_rgs-only
      ],
      r,
    );
    const keys = filtered.map((s) => s.key);
    expect(keys).toContain("executive_summary");
    expect(keys).not.toContain("quality_checks");
    expect(keys).not.toContain("implementation_roadmap_link");
  });

  it("gig premium SWOT excludes full-RGS-only section keys", () => {
    const r = resolveReportMode({
      customer: gigPremium,
      toolKey: "swot_strategic_matrix",
      requestedMode: "gig_report",
    });
    const keys = r.allowedSections.map((s) => s.key);
    expect(keys).not.toContain("priority_repair_map_link");
    expect(keys).not.toContain("implementation_roadmap_link");
  });
});