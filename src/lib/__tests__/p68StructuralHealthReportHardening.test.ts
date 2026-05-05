/**
 * P68 — RGS Structural Health Report™ + 30/60/90 RGS Repair Map™
 * hardening contract test.
 *
 * Pins the deterministic structure that protects the report from
 * silently regressing to a generic AI essay or losing client/admin
 * trust boundaries.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  STRUCTURAL_HEALTH_REPORT_NAME,
  REPAIR_MAP_NAME,
  STRUCTURAL_HEALTH_REPORT_FORBIDDEN_PHRASES,
  MIRROR_NOT_THE_MAP_REPORT_BODY,
  STRUCTURAL_HEALTH_SCOPE_SAFE_BODY,
  REALITY_CHECK_FLAGS_PLACEHOLDER_BODY,
  NEXT_STEP_OPTIONS_BODY,
  buildStructuralHealthReportSections,
  bucketRepairMap,
  renderRepairMapSlotClientSafe,
  deriveWhatIsWorking,
  deriveWhatIsSlipping,
  isStructuralHealthReportType,
  findForbiddenClientPhrase,
  type RepairMapItemForRender,
} from "@/lib/reports/structuralHealthReport";
import { buildDeterministicDraft } from "@/lib/reports/draftEngine";
import type { EvidenceSnapshot } from "@/lib/reports/types";

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

const baseSnap = (): EvidenceSnapshot => ({
  collected_at: new Date().toISOString(),
  customer_id: "cust-1",
  scorecard_run_id: null,
  customer_label: "Acme Co",
  is_demo_account: false,
  items: [],
  counts: {},
  notes: [],
});

describe("P68 — RGS Structural Health Report™ + Repair Map™ hardening", () => {
  it("uses the canonical RGS Structural Health Report™ name", () => {
    expect(STRUCTURAL_HEALTH_REPORT_NAME).toMatch(/RGS Structural Health Report/);
    expect(REPAIR_MAP_NAME).toMatch(/RGS Repair Map/);
  });

  it("classifies the diagnostic family as Structural Health Report types", () => {
    expect(isStructuralHealthReportType("diagnostic")).toBe(true);
    expect(isStructuralHealthReportType("scorecard")).toBe(true);
    expect(isStructuralHealthReportType("full_rgs_diagnostic")).toBe(true);
    expect(isStructuralHealthReportType("fiverr_premium_diagnostic")).toBe(true);
    expect(isStructuralHealthReportType("implementation_update")).toBe(false);
    expect(isStructuralHealthReportType("tool_specific")).toBe(false);
  });

  it("emits canonical sections: What Is Working, What Is Slipping, Reality Check Flags placeholder, Mirror, Scope-Safe, Next-Step", () => {
    const sections = buildStructuralHealthReportSections(baseSnap());
    const labels = sections.map((s) => s.label);
    expect(labels).toContain("What Is Working");
    expect(labels).toContain("What Is Slipping");
    expect(labels).toContain("Reality Check Flags");
    expect(labels).toContain("Mirror, Not the Map");
    expect(labels).toContain("Next-Step Options");
    expect(labels).toContain("Scope-Safe Disclaimer");
    // All P68 sections are client-safe by design.
    expect(sections.every((s) => s.client_safe)).toBe(true);
  });

  it("Reality Check Flags renders an honest placeholder, not invented contradictions", () => {
    expect(REALITY_CHECK_FLAGS_PLACEHOLDER_BODY).toMatch(/No Reality Check Flags/);
    // No specific contradiction examples should be invented in the placeholder.
    expect(REALITY_CHECK_FLAGS_PLACEHOLDER_BODY).not.toMatch(/contradiction detected/i);
  });

  it("Mirror, Not the Map and Scope-Safe bodies do not certify regulated outcomes", () => {
    for (const body of [
      MIRROR_NOT_THE_MAP_REPORT_BODY,
      STRUCTURAL_HEALTH_SCOPE_SAFE_BODY,
      NEXT_STEP_OPTIONS_BODY,
    ]) {
      expect(findForbiddenClientPhrase(body)).toBeNull();
    }
    expect(MIRROR_NOT_THE_MAP_REPORT_BODY).toMatch(/does not guarantee/i);
    expect(STRUCTURAL_HEALTH_SCOPE_SAFE_BODY).toMatch(/Business Systems Architect/);
  });

  it("forbidden client-facing phrases include the P68 §13 list", () => {
    const list = STRUCTURAL_HEALTH_REPORT_FORBIDDEN_PHRASES.map((p) => p.toLowerCase());
    for (const must of [
      "compliance certified",
      "legally compliant",
      "guaranteed compliance",
      "guaranteed revenue",
      "certified valuation",
      "guaranteed business value",
      "fiduciary approved",
    ]) {
      expect(list).toContain(must);
    }
  });

  it("findForbiddenClientPhrase catches forbidden language in arbitrary text", () => {
    expect(
      findForbiddenClientPhrase("This report is GAAP audited and compliance certified."),
    ).toBeTruthy();
    expect(findForbiddenClientPhrase("Operationally useful, evidence-backed.")).toBeNull();
  });

  it("deterministic draft splices P68 sections into the diagnostic draft", () => {
    const payload = buildDeterministicDraft(baseSnap(), "diagnostic");
    const keys = payload.sections.map((s) => s.key);
    expect(keys).toContain("what_is_working");
    expect(keys).toContain("what_is_slipping");
    expect(keys).toContain("reality_check_flags");
    expect(keys).toContain("mirror_not_the_map");
    expect(keys).toContain("next_step_options");
    expect(keys).toContain("scope_safe_disclaimer");
  });

  it("deterministic draft does NOT add P68 sections to non-Structural-Health types", () => {
    const payload = buildDeterministicDraft(baseSnap(), "implementation_update");
    const keys = payload.sections.map((s) => s.key);
    expect(keys).not.toContain("what_is_working");
    expect(keys).not.toContain("mirror_not_the_map");
  });

  it("What Is Working / Slipping always produce content even with thin evidence", () => {
    const working = deriveWhatIsWorking(baseSnap());
    const slipping = deriveWhatIsSlipping(baseSnap());
    expect(working.length).toBeGreaterThan(0);
    expect(slipping.length).toBeGreaterThan(0);
    // No forbidden language sneaks into the deterministic strings.
    for (const line of [...working, ...slipping]) {
      expect(findForbiddenClientPhrase(line)).toBeNull();
    }
  });

  it("bucketRepairMap groups items into the canonical 30/60/90 slots", () => {
    const items: RepairMapItemForRender[] = [
      mkItem("a", "stabilize"),
      mkItem("b", "install"),
      mkItem("c", "train"),
      mkItem("d", "ongoing_visibility"),
      mkItem("e", "handoff"),
    ];
    const buckets = bucketRepairMap(items);
    expect(buckets.first30.map((i) => i.id)).toEqual(["a"]);
    expect(buckets.days31to60.map((i) => i.id)).toEqual(["b"]);
    expect(buckets.days61to90.map((i) => i.id).sort()).toEqual(["c", "d", "e"]);
  });

  it("Repair Map client-safe render strips admin internal_notes and respects client_visible", () => {
    const items: RepairMapItemForRender[] = [
      {
        ...mkItem("a", "stabilize"),
        internal_notes: "ADMIN-ONLY: do not show this to client",
        client_summary: "Owner-safe summary line",
      },
      { ...mkItem("b", "stabilize"), client_visible: false, internal_notes: "private" },
    ];
    const out = renderRepairMapSlotClientSafe("First 30 Days", items);
    expect(out).toContain("Owner-safe summary line");
    expect(out).not.toContain("ADMIN-ONLY");
    expect(out).not.toContain("private");
    // Hidden item should not appear by id either.
    expect(out).not.toMatch(/\bb\b/);
  });

  it("Repair Map empty slot renders an honest 'no items yet' line, never invented items", () => {
    const out = renderRepairMapSlotClientSafe("Days 31–60", []);
    expect(out).toMatch(/No Repair Map items/);
    expect(out).not.toMatch(/\b(install|train|sample)\b/i);
  });

  it("admin PDF export wires Structural Health Report™ branding + Repair Map injection", () => {
    const src = read("src/pages/admin/ReportDraftDetail.tsx");
    expect(src).toMatch(/STRUCTURAL_HEALTH_REPORT_NAME/);
    expect(src).toMatch(/REPAIR_MAP_NAME/);
    expect(src).toMatch(/bucketRepairMap/);
    expect(src).toMatch(/renderRepairMapSlotClientSafe/);
    expect(src).toMatch(/isStructuralHealthReportType/);
  });

  it("draft engine consumes P68 helpers (no parallel report system created)", () => {
    const src = read("src/lib/reports/draftEngine.ts");
    expect(src).toMatch(/buildStructuralHealthReportSections/);
    expect(src).toMatch(/isStructuralHealthReportType/);
  });

  it("client portal report view continues to use the client-safe column allowlist (no admin notes leak)", () => {
    const src = read("src/pages/portal/ReportView.tsx");
    expect(src).toMatch(/CLIENT_SAFE_REPORT_SELECT/);
    // Defense in depth: still filters to published.
    expect(src).toMatch(/status.*published/);
  });
});

function mkItem(
  id: string,
  phase: RepairMapItemForRender["phase"],
): RepairMapItemForRender {
  return {
    id,
    title: `Item ${id}`,
    client_summary: `Client summary ${id}`,
    internal_notes: null,
    gear: "operational_efficiency",
    phase,
    priority: "medium",
    client_visible: true,
  };
}
