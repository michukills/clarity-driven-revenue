import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { getIndustryEmphasis } from "@/lib/industries/interpretation";

/**
 * Industry-adjusted interpretation must be CONSUMED — not just exported —
 * by launch-relevant admin / report / repair-map / implementation /
 * RGS Control / Revenue & Risk Monitor surfaces. The base deterministic
 * 0–1000 score must remain unchanged. The classifier suggestion must be
 * surfaced inside the IndustryAssignmentField (admin classification UI).
 */

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

describe("Industry emphasis launch consumption", () => {
  it("IndustryEmphasisPanel exists", () => {
    expect(existsSync(join(root, "src/components/admin/IndustryEmphasisPanel.tsx"))).toBe(true);
  });

  it.each([
    ["src/pages/admin/DiagnosticInterviewDetail.tsx", "diagnostic_review"],
    ["src/pages/admin/ReportDraftDetail.tsx", "report_builder"],
    ["src/pages/admin/ReportDraftDetail.tsx", "repair_map"],
    ["src/pages/admin/ImplementationRoadmapAdmin.tsx", "implementation"],
    ["src/pages/admin/RgsControlSystemAdmin.tsx", "rgs_control_system"],
    ["src/pages/admin/RevenueRiskMonitorAdmin.tsx", "revenue_risk_monitor"],
  ])("%s mounts IndustryEmphasisPanel with surface=%s", (file, surface) => {
    const src = read(file);
    expect(src).toMatch(/IndustryEmphasisPanel/);
    const re = new RegExp(`IndustryEmphasisPanel[\\s\\S]*?surface=\\\"${surface}\\\"`);
    expect(src).toMatch(re);
  });

  it("emphasis layer is admin-only and labelled 'Score unchanged'", () => {
    const src = read("src/components/admin/IndustryEmphasisPanel.tsx");
    expect(src).toMatch(/Admin only/);
    expect(src).toMatch(/Score unchanged/);
    expect(src).toMatch(/does not change the deterministic 0–1000/);
  });

  it("client portal shell does not import the emphasis panel", () => {
    const portal = read("src/components/portal/PortalShell.tsx");
    expect(portal).not.toMatch(/IndustryEmphasisPanel/);
  });

  it("emphasis returns a stable structure for every supported industry", () => {
    for (const ind of ["trade_field_service", "restaurant", "retail", "mmj_cannabis", "general_service"] as const) {
      const e = getIndustryEmphasis(ind);
      expect(e.label.length).toBeGreaterThan(0);
      expect(e.priority_gears.length).toBeGreaterThan(0);
      expect(e.priority_signals.length).toBeGreaterThan(0);
      expect(e.repair_priority_emphasis.length).toBeGreaterThan(0);
      expect(e.monitoring_emphasis.length).toBeGreaterThan(0);
      if (ind === "mmj_cannabis") {
        expect(e.safety_notes.length).toBeGreaterThan(0);
        const joined = e.safety_notes.join(" ").toLowerCase();
        for (const forbidden of ["hipaa", "patient", "clinical", "insurance claim", "medical billing"]) {
          expect(joined).not.toContain(forbidden);
        }
      } else {
        expect(e.safety_notes.length).toBe(0);
      }
    }
  });

  it("'other' / null falls back to general_service emphasis (no healthcare)", () => {
    const a = getIndustryEmphasis("other");
    const b = getIndustryEmphasis(null);
    expect(a.industry).toBe("general_service");
    expect(b.industry).toBe("general_service");
  });

  it("admin classification field surfaces classifier suggestion + source-of-truth", () => {
    const src = read("src/components/admin/IndustryAssignmentField.tsx");
    expect(src).toMatch(/classifyIndustry/);
    expect(src).toMatch(/shouldApplyClassification/);
    expect(src).toMatch(/Classifier suggestion/);
    expect(src).toMatch(/confidence/i);
    expect(src).toMatch(/Source of truth/);
    expect(src).toMatch(/will not be silently overwritten/);
  });
});