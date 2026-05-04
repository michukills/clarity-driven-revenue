import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  brainKeyForCustomerIndustry,
  getIndustryBrainContextForCustomer,
  buildIndustryBrainPromptContext,
} from "@/lib/industryBrainContext";
import type { IndustryCategory } from "@/lib/priorityEngine/types";

const ALL_INDUSTRIES: IndustryCategory[] = [
  "trade_field_service",
  "restaurant",
  "retail",
  "mmj_cannabis",
  "general_service",
  "other",
];

function read(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), "utf8");
}

describe("Industry Brain Launch Integration", () => {
  it("maps every supported customer industry to a brain key", () => {
    for (const i of ALL_INDUSTRIES) {
      const key = brainKeyForCustomerIndustry(i);
      expect(key).toBeTruthy();
    }
    expect(brainKeyForCustomerIndustry(null)).toBe("general_small_business");
    expect(brainKeyForCustomerIndustry(undefined)).toBe("general_small_business");
    expect(brainKeyForCustomerIndustry("other")).toBe("general_small_business");
    expect(brainKeyForCustomerIndustry("mmj_cannabis")).toBe("cannabis_mmj_mmc");
  });

  it("returns dense context for every industry (failure points, repair map, control signals)", () => {
    for (const i of ALL_INDUSTRIES) {
      const ctx = getIndustryBrainContextForCustomer(i);
      expect(ctx.industrySpecificFailurePoints.length).toBeGreaterThan(0);
      expect(ctx.repairMapImplications.length).toBeGreaterThan(0);
      expect(ctx.controlSystemSignals.length).toBeGreaterThan(0);
      expect(ctx.softwareEvidenceSources.length).toBeGreaterThan(0);
      expect(ctx.toolReportMappings.length).toBeGreaterThan(0);
      expect(ctx.ownerDependenceRisks.length).toBeGreaterThan(0);
      expect(ctx.reportLanguageCues.length).toBeGreaterThan(0);
    }
  });

  it("falls back to General when industry is missing/other", () => {
    expect(getIndustryBrainContextForCustomer(null).fellBackToGeneral).toBe(true);
    expect(getIndustryBrainContextForCustomer("other").fellBackToGeneral).toBe(true);
    expect(getIndustryBrainContextForCustomer("trade_field_service").fellBackToGeneral).toBe(false);
  });

  it("attaches cannabis safety notes only for cannabis", () => {
    const cannabis = getIndustryBrainContextForCustomer("mmj_cannabis");
    expect(cannabis.cannabisSafetyNotes.length).toBeGreaterThan(0);
    const joined = cannabis.cannabisSafetyNotes.join(" ").toLowerCase();
    expect(joined).toMatch(/dispensary|regulated retail|compliance-sensitive/);
    // The first safety note explicitly negates healthcare/HIPAA terms — that's
    // the point. We just verify the negation framing is present.
    expect(joined).toMatch(/not healthcare/);
    expect(joined).toMatch(/not legal advice/);
    expect(joined).toMatch(/not a compliance guarantee/);

    for (const i of ["trade_field_service", "restaurant", "retail", "general_service", "other"] as IndustryCategory[]) {
      expect(getIndustryBrainContextForCustomer(i).cannabisSafetyNotes.length).toBe(0);
    }
  });

  it("never references healthcare/HIPAA in the cannabis catalog context", () => {
    const ctx = getIndustryBrainContextForCustomer("mmj_cannabis");
    const flat = [
      ...ctx.industrySpecificFailurePoints,
      ...ctx.repairMapImplications,
      ...ctx.controlSystemSignals,
      ...ctx.softwareEvidenceSources,
      ...ctx.toolReportMappings,
      ...ctx.ownerDependenceRisks,
    ].join(" ").toLowerCase();
    expect(flat).not.toMatch(/hipaa/);
    expect(flat).not.toMatch(/patient care|patient workflow|clinical workflow/);
    expect(flat).not.toMatch(/insurance claim|medical billing/);
  });

  it("buildIndustryBrainPromptContext returns a compact prompt-safe payload", () => {
    const p = buildIndustryBrainPromptContext("trade_field_service");
    expect(p.industry_label).toMatch(/Trades/);
    expect(p.failure_points.length).toBeGreaterThan(0);
    expect(p.failure_points.length).toBeLessThanOrEqual(16);
    expect(p.cannabis_safety_notes.length).toBe(0);
    const c = buildIndustryBrainPromptContext("mmj_cannabis");
    expect(c.cannabis_safety_notes.length).toBeGreaterThan(0);
  });

  it("ReportDraftDetail mounts IndustryBrainContextPanel for report_builder + repair_map", () => {
    const src = read("src/pages/admin/ReportDraftDetail.tsx");
    expect(src).toMatch(/IndustryBrainContextPanel/);
    expect(src).toMatch(/surface=\"report_builder\"/);
    expect(src).toMatch(/surface=\"repair_map\"/);
  });

  it("DiagnosticInterviewDetail mounts IndustryBrainContextPanel for diagnostic_review", () => {
    const src = read("src/pages/admin/DiagnosticInterviewDetail.tsx");
    expect(src).toMatch(/IndustryBrainContextPanel/);
    expect(src).toMatch(/surface=\"diagnostic_review\"/);
  });

  it("ImplementationRoadmapAdmin mounts IndustryBrainContextPanel for implementation", () => {
    const src = read("src/pages/admin/ImplementationRoadmapAdmin.tsx");
    expect(src).toMatch(/IndustryBrainContextPanel/);
    expect(src).toMatch(/surface=\"implementation\"/);
  });

  it("RgsControlSystemAdmin and RevenueRiskMonitorAdmin mount the panel for rgs_control_system", () => {
    const a = read("src/pages/admin/RgsControlSystemAdmin.tsx");
    const b = read("src/pages/admin/RevenueRiskMonitorAdmin.tsx");
    expect(a).toMatch(/IndustryBrainContextPanel[\s\S]*surface=\"rgs_control_system\"/);
    expect(b).toMatch(/IndustryBrainContextPanel[\s\S]*surface=\"rgs_control_system\"/);
  });

  it("report-ai-assist edge function wires Industry Brain context safely", () => {
    const src = read("supabase/functions/report-ai-assist/index.ts");
    expect(src).toMatch(/buildIndustryBrainPromptBlock/);
    expect(src).toMatch(/Industry Brain context/);
    // Cannabis stays cannabis-only inside the AI prompt block.
    expect(src).toMatch(/dispensary and regulated retail operations only/);
    expect(src).toMatch(/NOT healthcare/);
    expect(src).toMatch(/NOT HIPAA/);
    // Customer industry is fetched from customers, not invented.
    expect(src).toMatch(/from\("customers"\)[\s\S]*select\("industry"\)/);
    // Output stays admin-only — client_safe = false is enforced elsewhere
    // in the file; ensure this pass did not relax that.
    expect(src).toMatch(/client_safe: false/);
  });

  it("client portal shell does not mount IndustryBrainContextPanel", () => {
    const portal = read("src/components/portal/PortalShell.tsx");
    expect(portal).not.toMatch(/IndustryBrainContextPanel/);
  });

  it("the panel itself is admin-only and labels itself as such", () => {
    const src = read("src/components/admin/IndustryBrainContextPanel.tsx");
    expect(src).toMatch(/Admin only/);
    expect(src).toMatch(/does not override deterministic scorecard/);
  });
});