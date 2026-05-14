import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildSwotReport,
  swotReportToPdfDoc,
  assertNoAdminNotesLeakage,
  SWOT_CANNABIS_SCOPE_NOTE,
} from "@/lib/swot/swotReportBuilder";
import { STANDALONE_SCOPE_NOTE } from "@/lib/swot/swotMatrixData";
import type { SwotAnalysis, SwotItem } from "@/lib/swot/types";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

function makeAnalysis(over: Partial<SwotAnalysis> = {}): SwotAnalysis {
  return {
    id: "an-1",
    customer_id: "cust-1",
    title: "Q2 Strategic Matrix",
    status: "approved",
    analysis_mode: "full_rgs_client",
    industry: "Professional services",
    business_stage: "0-1k MRR",
    notes: null,
    created_by: null,
    reviewed_by: null,
    approved_by: null,
    reviewed_at: "2026-05-14T00:00:00.000Z",
    approved_at: "2026-05-14T00:00:00.000Z",
    client_visible: true,
    created_at: "2026-05-01T00:00:00.000Z",
    updated_at: "2026-05-14T00:00:00.000Z",
    archived_at: null,
    ...over,
  };
}

function makeItem(over: Partial<SwotItem> = {}): SwotItem {
  return {
    id: "it-1",
    swot_analysis_id: "an-1",
    customer_id: "cust-1",
    category: "weakness",
    title: "Slow follow-up on quotes",
    description: "Quotes go out but no follow-up cadence.",
    evidence_summary: null,
    evidence_confidence: "owner_claim_only",
    source_type: "owner_interview",
    linked_gear: "revenue_conversion",
    severity_or_leverage: "high",
    internal_external: "internal",
    client_safe_summary: "Follow-up cadence is missing on outgoing quotes.",
    admin_only_notes: "INTERNAL: owner is defensive about this; soften language.",
    recommended_action: "Add a 48-hour follow-up cadence for open quotes.",
    repair_map_relevance: true,
    implementation_relevance: true,
    campaign_relevance: false,
    control_system_monitoring_relevance: false,
    reengagement_trigger_relevance: false,
    client_visible: true,
    display_order: 100,
    created_at: "2026-05-01T00:00:00.000Z",
    updated_at: "2026-05-01T00:00:00.000Z",
    ...over,
  };
}

describe("SWOT report builder — admin viewer", () => {
  it("groups items into SWOT quadrants and includes gear/confidence labels", () => {
    const analysis = makeAnalysis();
    const items = [
      makeItem(),
      makeItem({ id: "it-2", category: "strength", title: "Loyal repeat clients", linked_gear: "demand_generation" }),
    ];
    const m = buildSwotReport({ viewer: "admin", analysis, items });
    expect(m.quadrants.weakness.items).toHaveLength(1);
    expect(m.quadrants.strength.items).toHaveLength(1);
    expect(m.quadrants.weakness.items[0].linked_gear_label).toBe("Revenue Conversion");
    expect(m.quadrants.weakness.items[0].evidence_confidence_label).toBe("Owner claim only");
  });

  it("excludes admin_only_notes from every report item", () => {
    const analysis = makeAnalysis();
    const items = [makeItem()];
    const m = buildSwotReport({ viewer: "admin", analysis, items });
    const flat = JSON.stringify(m);
    expect(flat).not.toContain("INTERNAL: owner is defensive");
    for (const cat of ["strength","weakness","opportunity","threat"] as const) {
      for (const it of m.quadrants[cat].items) {
        expect((it as any).admin_only_notes).toBeUndefined();
      }
    }
  });

  it("derives Repair Map and Implementation signal groups from relevance flags", () => {
    const analysis = makeAnalysis();
    const items = [makeItem()];
    const m = buildSwotReport({ viewer: "admin", analysis, items });
    expect(m.signal_groups.repair_map.length).toBeGreaterThan(0);
    expect(m.signal_groups.implementation.length).toBeGreaterThan(0);
  });

  it("includes admin-only signal groups (evidence_needed / reengagement) only for admin viewer", () => {
    const analysis = makeAnalysis();
    const items = [makeItem({
      evidence_confidence: "missing_evidence",
      reengagement_trigger_relevance: true,
    })];
    const m = buildSwotReport({ viewer: "admin", analysis, items });
    expect(m.signal_groups.evidence_needed.length).toBeGreaterThan(0);
    expect(m.signal_groups.reengagement.length).toBeGreaterThan(0);
  });
});

describe("SWOT report builder — client viewer security", () => {
  it("excludes non-client-visible items in client context", () => {
    const analysis = makeAnalysis();
    const items = [
      makeItem(),
      makeItem({ id: "it-2", title: "Internal-only finding", client_visible: false }),
    ];
    const m = buildSwotReport({ viewer: "client", analysis, items });
    const titles = m.quadrants.weakness.items.map((i) => i.title);
    expect(titles).toContain("Slow follow-up on quotes");
    expect(titles).not.toContain("Internal-only finding");
  });

  it("never exposes admin-only signal groups in client viewer", () => {
    const analysis = makeAnalysis();
    const items = [makeItem({
      evidence_confidence: "missing_evidence",
      reengagement_trigger_relevance: true,
    })];
    const m = buildSwotReport({ viewer: "client", analysis, items });
    expect(m.signal_groups.evidence_needed).toEqual([]);
    expect(m.signal_groups.reengagement).toEqual([]);
  });

  it("filters to client_safe signals only in client signal groups", () => {
    const analysis = makeAnalysis();
    // client_visible false on the item makes signals admin-only
    const items = [makeItem({ client_visible: false })];
    const m = buildSwotReport({ viewer: "client", analysis, items });
    expect(m.signal_groups.repair_map).toEqual([]);
  });

  it("ignores items belonging to a different analysis or customer", () => {
    const analysis = makeAnalysis();
    const items = [
      makeItem(),
      makeItem({ id: "it-x", customer_id: "OTHER", title: "Cross-tenant leak" }),
      makeItem({ id: "it-y", swot_analysis_id: "OTHER-ANALYSIS", title: "Wrong analysis" }),
    ];
    const m = buildSwotReport({ viewer: "client", analysis, items });
    const flat = JSON.stringify(m);
    expect(flat).not.toContain("Cross-tenant leak");
    expect(flat).not.toContain("Wrong analysis");
  });
});

describe("SWOT report — export gating", () => {
  it("blocks export when status is not approved", () => {
    const m = buildSwotReport({
      viewer: "admin",
      analysis: makeAnalysis({ status: "ready_for_review" }),
      items: [makeItem()],
    });
    expect(m.exportable).toBe(false);
    expect(m.export_block_reason).toMatch(/after approval/i);
  });

  it("enables export when approved", () => {
    const m = buildSwotReport({
      viewer: "admin",
      analysis: makeAnalysis(),
      items: [makeItem()],
    });
    expect(m.exportable).toBe(true);
  });

  it("blocks client export when analysis is not client_visible", () => {
    const m = buildSwotReport({
      viewer: "client",
      analysis: makeAnalysis({ client_visible: false }),
      items: [makeItem()],
    });
    expect(m.exportable).toBe(false);
  });

  it("warns when approved but no client-visible items exist", () => {
    const m = buildSwotReport({
      viewer: "admin",
      analysis: makeAnalysis(),
      items: [makeItem({ client_visible: false })],
    });
    expect(m.empty_client_visible_warning).toMatch(/no client-visible items/i);
  });
});

describe("SWOT report — scope notes", () => {
  it("adds standalone scope note for standalone_gig mode", () => {
    const m = buildSwotReport({
      viewer: "admin",
      analysis: makeAnalysis({ analysis_mode: "standalone_gig" }),
      items: [makeItem()],
    });
    expect(m.standalone_scope_note).toBe(STANDALONE_SCOPE_NOTE);
  });

  it("adds cannabis/MMJ scope note when industry mentions cannabis", () => {
    const m = buildSwotReport({
      viewer: "client",
      analysis: makeAnalysis({ industry: "Cannabis dispensary" }),
      items: [makeItem()],
    });
    expect(m.cannabis_scope_note).toBe(SWOT_CANNABIS_SCOPE_NOTE);
  });
});

describe("SWOT report — PDF doc + leakage protection", () => {
  it("renders a PDF doc with title, scope disclaimer, and exec snapshot", () => {
    const analysis = makeAnalysis();
    const m = buildSwotReport({ viewer: "client", analysis, items: [makeItem()] });
    const doc = swotReportToPdfDoc(m);
    const flat = JSON.stringify(doc);
    expect(doc.title).toBe("SWOT Strategic Matrix");
    expect(flat).toContain("Executive Snapshot");
    expect(flat).toContain("Scope Boundary");
    expect(flat).toContain("do not promise");
    expect(flat).not.toContain("INTERNAL: owner is defensive");
  });

  it("assertNoAdminNotesLeakage throws if admin notes appear in payload", () => {
    const items = [makeItem()];
    const bad = JSON.stringify({ leak: items[0].admin_only_notes });
    expect(() => assertNoAdminNotesLeakage(bad, items)).toThrow();
  });

  it("assertNoAdminNotesLeakage passes for clean payload", () => {
    const items = [makeItem()];
    const clean = JSON.stringify({ ok: "no notes here" });
    expect(() => assertNoAdminNotesLeakage(clean, items)).not.toThrow();
  });
});

describe("SWOT report — legal/scope copy contract", () => {
  it("scope disclaimer avoids forbidden 'guarantee revenue' phrasing", () => {
    const m = buildSwotReport({
      viewer: "client",
      analysis: makeAnalysis(),
      items: [makeItem()],
    });
    expect(m.scope_disclaimer).not.toMatch(/guarantee\s+revenue/i);
    expect(m.scope_disclaimer).toMatch(/do not promise/i);
  });

  it("report builder + component source contain no banned hype phrases", () => {
    const builder = read("src/lib/swot/swotReportBuilder.ts");
    const comp = read("src/components/swot/SwotStrategicMatrixReport.tsx");
    for (const src of [builder, comp]) {
      expect(src).not.toMatch(/skyrocket|10x your|double your revenue|guaranteed (revenue|growth|leads|roi)/i);
    }
  });
});