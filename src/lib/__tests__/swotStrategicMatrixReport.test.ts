import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  buildSwotReportModelFromAdminInputs,
  buildSwotReportPdfDoc,
  isAnalysisExportable,
  exportDisabledReason,
  assertNoAdminLeakage,
} from "@/lib/swot/swotReportBuilder";
import { normalizeSwotItem } from "@/lib/swot/swotEngine";
import type { SwotAnalysis, SwotItem, SwotItemInput } from "@/lib/swot/types";

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

const baseAnalysis = (over: Partial<SwotAnalysis> = {}): SwotAnalysis => ({
  id: "an-1",
  customer_id: "cust-1",
  title: "Q2 Strategic Matrix",
  status: "approved",
  analysis_mode: "full_rgs_client",
  industry: "Home services",
  business_stage: "0-1k MRR",
  notes: null,
  created_by: null,
  reviewed_by: "admin-1",
  approved_by: "admin-1",
  reviewed_at: new Date().toISOString(),
  approved_at: new Date().toISOString(),
  client_visible: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  archived_at: null,
  ...over,
});

function makeItem(input: SwotItemInput, over: Partial<SwotItem> = {}): SwotItem {
  const norm = normalizeSwotItem(input);
  return {
    id: `it-${Math.random().toString(36).slice(2, 7)}`,
    swot_analysis_id: "an-1",
    customer_id: "cust-1",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...norm,
    ...over,
  } as SwotItem;
}

describe("SWOT Strategic Matrix — report builder", () => {
  it("isAnalysisExportable requires approved + client_visible + not archived", () => {
    expect(isAnalysisExportable(baseAnalysis())).toBe(true);
    expect(isAnalysisExportable(baseAnalysis({ status: "draft" }))).toBe(false);
    expect(isAnalysisExportable(baseAnalysis({ status: "ready_for_review" }))).toBe(false);
    expect(isAnalysisExportable(baseAnalysis({ client_visible: false }))).toBe(false);
    expect(isAnalysisExportable(baseAnalysis({ archived_at: new Date().toISOString() }))).toBe(false);
    expect(isAnalysisExportable(null)).toBe(false);
  });

  it("exportDisabledReason explains each blocked case in client-safe language", () => {
    expect(exportDisabledReason(baseAnalysis(), 1)).toBeNull();
    expect(exportDisabledReason(baseAnalysis({ status: "draft" }), 1))
      .toMatch(/available after approval/i);
    expect(exportDisabledReason(baseAnalysis({ client_visible: false }), 1))
      .toMatch(/client-visible/i);
    expect(exportDisabledReason(baseAnalysis(), 0))
      .toMatch(/no client-visible items/i);
    expect(exportDisabledReason(baseAnalysis({ archived_at: new Date().toISOString() }), 1))
      .toMatch(/archived/i);
  });

  it("throws if asked to build a report from a non-approved analysis", () => {
    expect(() =>
      buildSwotReportModelFromAdminInputs({
        analysis: baseAnalysis({ status: "draft" }),
        items: [],
      }),
    ).toThrow();
  });

  it("excludes non-client-visible items and admin-only notes from the report payload", () => {
    const visible = makeItem({
      category: "weakness",
      title: "Owner approves every quote",
      client_visible: true,
      client_safe_summary: "Quoting depends entirely on the owner.",
      admin_only_notes: "VERY_SECRET_ADMIN_NOTE_XYZ",
      recommended_action: "Schedule a delegation review.",
    });
    const hidden = makeItem({
      category: "strength",
      title: "Strong referral pipeline (DRAFT)",
      client_visible: false,
      admin_only_notes: "DRAFT_ADMIN_NOTE_ZZZ",
    });
    const model = buildSwotReportModelFromAdminInputs({
      analysis: baseAnalysis(),
      items: [visible, hidden],
      business_name: "Acme Plumbing",
    });
    const blob = JSON.stringify(model);
    expect(blob).not.toContain("VERY_SECRET_ADMIN_NOTE_XYZ");
    expect(blob).not.toContain("DRAFT_ADMIN_NOTE_ZZZ");
    expect(blob).not.toContain("Strong referral pipeline (DRAFT)");
    expect(blob).toContain("Owner approves every quote");

    const doc = buildSwotReportPdfDoc(model);
    const docBlob = JSON.stringify(doc);
    expect(docBlob).not.toContain("VERY_SECRET_ADMIN_NOTE_XYZ");
    expect(docBlob).not.toContain("Strong referral pipeline (DRAFT)");
    expect(docBlob).toContain("Owner approves every quote");
    // Should not throw.
    assertNoAdminLeakage(doc, [visible, hidden]);
  });

  it("groups SWOT into four quadrants with correct headings and gear/confidence", () => {
    const items = [
      makeItem({ category: "strength", title: "Loyal customer base", client_visible: true,
        client_safe_summary: "Repeat-buy rate is steady.", linked_gear: "revenue_conversion",
        evidence_confidence: "verified" }),
      makeItem({ category: "opportunity", title: "Untapped service line", client_visible: true,
        linked_gear: "demand_generation", evidence_confidence: "owner_claim_only",
        campaign_relevance: true }),
      makeItem({ category: "threat", title: "Seasonal demand swing", client_visible: true,
        linked_gear: "demand_generation" }),
      makeItem({ category: "weakness", title: "No SOPs", client_visible: true,
        linked_gear: "operational_efficiency", repair_map_relevance: true,
        recommended_action: "Document core fulfillment SOP." }),
    ];
    const model = buildSwotReportModelFromAdminInputs({ analysis: baseAnalysis(), items });

    const cats = model.matrix.map(m => m.category);
    expect(cats).toEqual(["strength", "weakness", "opportunity", "threat"]);
    expect(model.matrix[0].heading).toMatch(/working in your favor/i);
    expect(model.matrix[1].heading).toMatch(/holding the business back/i);
    expect(model.matrix[2].heading).toMatch(/opportunities worth watching/i);
    expect(model.matrix[3].heading).toMatch(/threats or risks/i);

    const strength = model.matrix[0].items[0];
    expect(strength.linked_gear_label).toMatch(/Revenue Conversion/);
    expect(strength.evidence_confidence_label).toMatch(/Verified/);

    expect(model.recommended_next_review).toEqual([
      { item_title: "No SOPs", recommended_action: "Document core fulfillment SOP." },
    ]);
  });

  it("produces downstream signal groups including campaign_input without touching Campaign Control", () => {
    const items = [
      makeItem({ category: "opportunity", title: "Local SEO momentum",
        client_visible: true, client_safe_summary: "Branded search is up.",
        linked_gear: "demand_generation", campaign_relevance: true }),
      makeItem({ category: "weakness", title: "Owner is the bottleneck",
        client_visible: true, client_safe_summary: "Owner approves every quote.",
        linked_gear: "owner_independence", implementation_relevance: true,
        repair_map_relevance: true, control_system_monitoring_relevance: true }),
    ];
    const model = buildSwotReportModelFromAdminInputs({ analysis: baseAnalysis(), items });
    const types = model.signal_groups.map(g => g.type);
    expect(types).toContain("campaign_input");
    expect(types).toContain("repair_priority");
    expect(types).toContain("implementation_input");
    expect(types).toContain("control_system_watch_item");

    // The builder file must not import Campaign Control internals.
    const src = read("src/lib/swot/swotReportBuilder.ts");
    expect(src).not.toMatch(/from\s+["'].*campaign(?!_input|s)/i);
    expect(src).not.toMatch(/campaign_control_engine|campaignControl/);
  });

  it("includes standalone scope note for standalone_gig mode", () => {
    const items = [makeItem({ category: "strength", title: "Niche reputation", client_visible: true })];
    const model = buildSwotReportModelFromAdminInputs({
      analysis: baseAnalysis({ analysis_mode: "standalone_gig" }),
      items,
    });
    expect(model.is_standalone).toBe(true);
    expect(model.standalone_scope_note).toMatch(/standalone strategic analysis/i);
    const docBlob = JSON.stringify(buildSwotReportPdfDoc(model));
    expect(docBlob).toMatch(/standalone strategic analysis/i);
  });

  it("includes cannabis/MMJ documentation-visibility disclaimer when context applies", () => {
    const items = [
      makeItem({ category: "weakness", title: "Inventory tracking gaps in the dispensary",
        client_visible: true, client_safe_summary: "Counts drift between shifts." }),
    ];
    const model = buildSwotReportModelFromAdminInputs({
      analysis: baseAnalysis({ industry: "Cannabis dispensary" }),
      items,
    });
    expect(model.cannabis_context).toBe(true);
    expect(model.cannabis_disclaimer).toMatch(/operational and documentation visibility only/i);
    expect(model.cannabis_disclaimer).not.toMatch(/regulatory or compliance certification[^.]/);
  });

  it("uses safe RGS scope language and avoids forbidden phrases", () => {
    const items = [
      makeItem({ category: "opportunity", title: "Adjacent service expansion", client_visible: true,
        client_safe_summary: "Clear adjacency exists." }),
    ];
    const model = buildSwotReportModelFromAdminInputs({ analysis: baseAnalysis(), items });
    const doc = buildSwotReportPdfDoc(model);
    const text = JSON.stringify(doc).toLowerCase();
    expect(text).not.toMatch(/guarantee revenue/);
    expect(text).not.toMatch(/guaranteed (revenue|growth|leads|roi)/);
    expect(text).not.toMatch(/proven to convert/);
    expect(text).not.toMatch(/legally compliant|compliance approved|valuation lift/);
    expect(text).not.toMatch(/skyrocket|10x|explosive growth/);
    expect(text).toMatch(/do not promise revenue/);
  });
});

describe("SWOT Strategic Matrix — report wiring contract", () => {
  it("admin page wires preview, download PDF action, and disabled reason", () => {
    const src = read("src/pages/admin/SwotStrategicMatrixAdmin.tsx");
    expect(src).toMatch(/buildSwotReportModelFromAdminInputs/);
    expect(src).toMatch(/buildSwotReportPdfDoc/);
    expect(src).toMatch(/generateRunPdf/);
    expect(src).toMatch(/Preview report/);
    expect(src).toMatch(/Download PDF/);
    expect(src).toMatch(/exportDisabledReason/);
    expect(src).toMatch(/SwotStrategicMatrixReport/);
  });

  it("client page wires download report (PDF) and gates by exportable status", () => {
    const src = read("src/pages/portal/tools/SwotStrategicMatrix.tsx");
    expect(src).toMatch(/Download report \(PDF\)/);
    expect(src).toMatch(/isAnalysisExportable/);
    expect(src).toMatch(/buildSwotReportPdfDoc/);
    // Client page must not import admin-only data helpers or reference admin notes.
    expect(src).not.toMatch(/admin_only_notes/);
  });

  it("report component never references admin-only notes", () => {
    const src = read("src/components/swot/SwotStrategicMatrixReport.tsx");
    expect(src).not.toMatch(/admin_only_notes/);
    expect(src).not.toMatch(/Admin-only/);
  });
});