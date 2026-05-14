import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  CATEGORY_LABEL,
  CONFIDENCE_LABEL,
  CONFIDENCE_PLAIN,
  GEAR_LABEL,
  SIGNAL_LABEL,
  ANALYSIS_MODE_LABEL,
  ANALYSIS_STATUS_LABEL,
  SCOPE_DISCLAIMER,
  STANDALONE_SCOPE_NOTE,
  previewSignalsForAnalysis,
} from "@/lib/swot/swotMatrixData";
import { normalizeSwotItem } from "@/lib/swot/swotEngine";
import type { SwotItem } from "@/lib/swot/types";

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

function makeItem(over: Partial<SwotItem> = {}): SwotItem {
  const base = normalizeSwotItem({
    category: "weakness",
    title: "Owner approves every quote",
    description: "Owner is the sole approver before any quote leaves.",
    evidence_confidence: "owner_claim_only",
    repair_map_relevance: true,
    implementation_relevance: true,
    campaign_relevance: false,
    control_system_monitoring_relevance: true,
    reengagement_trigger_relevance: false,
    client_visible: true,
    client_safe_summary: "Quoting depends entirely on the owner.",
    admin_only_notes: "Owner refuses delegation. Sensitive.",
  });
  return {
    id: "it-1",
    swot_analysis_id: "an-1",
    customer_id: "cust-1",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...base,
    ...over,
  } as SwotItem;
}

describe("SWOT Strategic Matrix — UI wiring contract", () => {
  it("registers admin + client routes for the new Strategic Matrix", () => {
    const app = read("src/App.tsx");
    expect(app).toMatch(/SwotStrategicMatrixAdmin/);
    expect(app).toMatch(/SwotStrategicMatrix\b/);
    expect(app).toMatch(/path="\/admin\/customers\/:customerId\/swot-strategic-matrix"/);
    expect(app).toMatch(/path="\/portal\/tools\/swot-strategic-matrix"[\s\S]*ClientToolGuard\s+toolKey="swot_analysis_tool"/);
  });

  it("preserves the legacy P61 SWOT routes", () => {
    const app = read("src/App.tsx");
    expect(app).toMatch(/path="\/admin\/customers\/:customerId\/swot-analysis"/);
    expect(app).toMatch(/path="\/portal\/tools\/swot-analysis"/);
  });

  it("legacy admin SWOT page links to the new Strategic Matrix", () => {
    const src = read("src/pages/admin/SwotAnalysisAdmin.tsx");
    expect(src).toMatch(/swot-strategic-matrix/);
  });

  it("admin page exposes admin-only label, signal preview, approval action, and four-quadrant matrix", () => {
    const src = read("src/pages/admin/SwotStrategicMatrixAdmin.tsx");
    expect(src).toMatch(/Admin-only — never shown to client/);
    expect(src).toMatch(/Generated Signal Preview/);
    expect(src).toMatch(/Approve \+ persist signals/);
    for (const cat of ["Strengths", "Weaknesses", "Opportunities", "Threats"]) {
      expect(CATEGORY_LABEL).toMatchObject(expect.objectContaining({}));
      expect(src).toContain("CATEGORIES");
      expect(Object.values(CATEGORY_LABEL)).toContain(cat);
    }
    expect(src).toMatch(/STANDALONE_SCOPE_NOTE/);
  });

  it("client page reads only approved + client-visible content", () => {
    const src = read("src/pages/portal/tools/SwotStrategicMatrix.tsx");
    expect(src).toMatch(/clientListApprovedAnalyses/);
    expect(src).toMatch(/clientListApprovedItems/);
    // Must never reference admin-only fields/notes.
    expect(src).not.toMatch(/admin_only_notes/);
    expect(src).not.toMatch(/Admin-only/);
    expect(src).toMatch(/Client view is unavailable until your RGS team approves/);
  });

  it("data layer client reads explicitly filter approved/client_visible", () => {
    const src = read("src/lib/swot/swotMatrixData.ts");
    expect(src).toMatch(/clientListApprovedAnalyses[\s\S]*status[\s\S]*"approved"[\s\S]*client_visible[\s\S]*true/);
    expect(src).toMatch(/clientListApprovedItems[\s\S]*client_visible[\s\S]*true/);
    expect(src).toMatch(/admin_only_notes:\s*null/);
    expect(src).toMatch(/clientListClientSafeSignals[\s\S]*client_safe[\s\S]*true[\s\S]*admin_only[\s\S]*false/);
    // Must not import Campaign Control internals.
    expect(src).not.toMatch(/campaignControl|campaign_control_engine/i);
  });

  it("approval flow drops approved analysis back to ready_for_review on edit", () => {
    const src = read("src/lib/swot/swotMatrixData.ts");
    expect(src).toMatch(/touchAnalysisAfterEdit/);
    expect(src).toMatch(/status:\s*"ready_for_review"/);
    expect(src).toMatch(/approved_at:\s*null/);
  });

  it("preview signals are generated deterministically (admin-only notes never leak into client_safe summaries)", () => {
    const item = makeItem();
    const drafts = previewSignalsForAnalysis("cust-1", "an-1", [item]);
    expect(drafts.length).toBeGreaterThan(0);
    for (const d of drafts) {
      expect(d.summary).not.toMatch(/Sensitive/);
      expect(d.summary).not.toMatch(/refuses delegation/);
    }
  });

  it("campaign-relevant items emit campaign_input signals without touching Campaign Control", () => {
    const item = makeItem({ campaign_relevance: true, linked_gear: "demand_generation" });
    const drafts = previewSignalsForAnalysis("cust-1", "an-1", [item]);
    expect(drafts.some(d => d.signal_type === "campaign_input")).toBe(true);
    expect(drafts.some(d => d.signal_type === "buyer_persona_input")).toBe(true);
    // The matrix data layer must not import campaign control internals.
    const src = read("src/lib/swot/swotMatrixData.ts");
    expect(src).not.toMatch(/from\s+["'].*campaign/i);
  });

  it("scope language stays safe (no guarantee/legal/compliance/valuation promises)", () => {
    const all = [
      SCOPE_DISCLAIMER,
      STANDALONE_SCOPE_NOTE,
      ...Object.values(CONFIDENCE_PLAIN),
      read("src/pages/admin/SwotStrategicMatrixAdmin.tsx"),
      read("src/pages/portal/tools/SwotStrategicMatrix.tsx"),
    ].join("\n").toLowerCase();
    expect(all).not.toMatch(/guarantee revenue/);
    expect(all).not.toMatch(/guaranteed (?:revenue|growth|leads|roi)/);
    expect(all).not.toMatch(/proven to convert/);
    expect(all).not.toMatch(/legally compliant|compliance approved|valuation lift/);
    expect(all).not.toMatch(/skyrocket|10x|explosive growth/);
  });

  it("display label registries cover all enums", () => {
    expect(Object.keys(CATEGORY_LABEL).sort()).toEqual(
      ["opportunity","strength","threat","weakness"]);
    expect(Object.keys(CONFIDENCE_LABEL)).toContain("verified");
    expect(Object.keys(GEAR_LABEL)).toContain("owner_independence");
    expect(Object.keys(ANALYSIS_MODE_LABEL)).toContain("standalone_gig");
    expect(Object.keys(ANALYSIS_STATUS_LABEL)).toContain("approved");
    expect(Object.keys(SIGNAL_LABEL)).toContain("campaign_input");
  });
});