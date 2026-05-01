// P20.18 — RGS Stability Snapshot tests.

import { describe, it, expect } from "vitest";
import {
  generateStabilitySnapshot,
  renderStabilitySnapshotBody,
  GEAR_KEY_TO_NUMBER,
} from "./stabilitySnapshot";
import { buildDeterministicDraft } from "./draftEngine";
import type { EvidenceItem, EvidenceSnapshot } from "./types";

function makeSnap(opts: {
  industry?: string | null;
  items?: EvidenceItem[];
  counts?: Record<string, number>;
  notes?: string[];
}): EvidenceSnapshot {
  const items: EvidenceItem[] = [
    {
      source: "customers",
      module: "Customer profile",
      title: "Test Co",
      value: { industry: opts.industry ?? null },
      detail: "Lifecycle: lead",
      client_safe: true,
    },
    ...(opts.items ?? []),
  ];
  return {
    collected_at: new Date().toISOString(),
    customer_id: "cust-1",
    customer_label: "Test Co",
    is_demo_account: false,
    items,
    counts: opts.counts ?? {},
    notes: opts.notes ?? [],
  };
}

describe("generateStabilitySnapshot — structure", () => {
  it("produces exactly four RGS-labeled sections", () => {
    const s = generateStabilitySnapshot(makeSnap({}));
    expect(s.current_strengths_to_preserve.title).toBe("Current Strengths to Preserve");
    expect(s.system_weaknesses_creating_instability.title).toBe(
      "System Weaknesses Creating Instability",
    );
    expect(s.opportunities_after_stabilization.title).toBe(
      "Opportunities After Stabilization",
    );
    expect(s.threats_to_revenue_control.title).toBe("Threats to Revenue / Control");
    expect(s.client_title).toBe("RGS Stability Snapshot");
    expect(s.internal_description).toBe("SWOT-style diagnostic layer");
  });

  it("uses RGS section labels and never the literal label 'SWOT Analysis'", () => {
    const s = generateStabilitySnapshot(makeSnap({}));
    const body = renderStabilitySnapshotBody(s);
    expect(body).not.toMatch(/SWOT Analysis/i);
    expect(body).toMatch(/Current Strengths to Preserve/);
  });

  it("low evidence (empty snapshot) produces Needs Review overall", () => {
    const s = generateStabilitySnapshot(makeSnap({}));
    expect(s.overall_status).toBe("Needs Review");
  });

  it("snapshot starts unreviewed and is not auto-approved", () => {
    const s = generateStabilitySnapshot(makeSnap({}));
    expect(["Draft", "Needs Review"]).toContain(s.overall_status);
    expect(s.reviewed_at).toBeNull();
    expect(s.reviewed_by).toBeNull();
  });
});

describe("generateStabilitySnapshot — gear mapping", () => {
  it("weaknesses map to gears when evidence supports it", () => {
    const s = generateStabilitySnapshot(
      makeSnap({
        items: [
          {
            source: "owner_dependence_items",
            module: "Owner dependence",
            title: "owner",
            value: { high: 2 },
            client_safe: false,
          },
        ],
        counts: { integrations: 0 },
      }),
    );
    const ws = s.system_weaknesses_creating_instability.items;
    expect(ws.some((w) => w.gears?.includes("owner_independence"))).toBe(true);
    expect(ws.some((w) => w.gears?.includes("financial_visibility"))).toBe(true);
  });

  it("threats map to gears when evidence supports it", () => {
    const s = generateStabilitySnapshot(
      makeSnap({
        items: [
          {
            source: "invoice_entries",
            module: "AR",
            title: "Overdue",
            value: { count: 4, amount: 12000 },
            client_safe: true,
          },
        ],
      }),
    );
    const ts = s.threats_to_revenue_control.items;
    expect(ts.some((t) => t.gears?.includes("financial_visibility"))).toBe(true);
  });

  it("gear keys map to TargetGear 1..5", () => {
    expect(GEAR_KEY_TO_NUMBER.demand_generation).toBe(1);
    expect(GEAR_KEY_TO_NUMBER.revenue_conversion).toBe(2);
    expect(GEAR_KEY_TO_NUMBER.operational_efficiency).toBe(3);
    expect(GEAR_KEY_TO_NUMBER.financial_visibility).toBe(4);
    expect(GEAR_KEY_TO_NUMBER.owner_independence).toBe(5);
  });
});

describe("generateStabilitySnapshot — opportunities framed after stabilization", () => {
  it("opportunities reference stabilization, not raw scaling", () => {
    const s = generateStabilitySnapshot(
      makeSnap({
        counts: { integrations: 0, weekly_checkins: 1 },
      }),
    );
    const opps = s.opportunities_after_stabilization.items;
    expect(opps.length).toBeGreaterThan(0);
    for (const o of opps) {
      expect(o.text.toLowerCase()).toMatch(
        /after|once|stabiliz|reliable|standardized|documented/,
      );
    }
  });
});

describe("generateStabilitySnapshot — does not invent metrics", () => {
  it("with no evidence, items do not contain fabricated dollar/percent figures", () => {
    const s = generateStabilitySnapshot(makeSnap({}));
    const allText = JSON.stringify(s);
    // A bare-evidence snapshot must not invent a specific dollar/percent.
    expect(allText).not.toMatch(/\$\d/);
    expect(allText).not.toMatch(/\b\d{1,3}\.\d+%/);
  });
});

describe("generateStabilitySnapshot — industry behavior", () => {
  it("trades industry produces operational/job-cost language only when evidence supports it", () => {
    const s = generateStabilitySnapshot(
      makeSnap({ industry: "trade_field_service", counts: { integrations: 0 } }),
    );
    const body = renderStabilitySnapshotBody(s);
    expect(body).toMatch(/job costing|service-line/i);
  });

  it("restaurant industry uses food/labor language only when evidence supports it", () => {
    const s = generateStabilitySnapshot(
      makeSnap({ industry: "restaurant", counts: {} }),
    );
    const body = renderStabilitySnapshotBody(s);
    expect(body).toMatch(/food and labor cost/i);
  });

  it("retail industry uses inventory/POS language only when evidence supports it", () => {
    const s = generateStabilitySnapshot(
      makeSnap({ industry: "retail", counts: { integrations: 0 } }),
    );
    const body = renderStabilitySnapshotBody(s);
    expect(body).toMatch(/dead stock|stockouts|POS/i);
  });

  it("cannabis/MMJ uses retail/POS framing — never healthcare wording", () => {
    const s = generateStabilitySnapshot(
      makeSnap({ industry: "mmj_cannabis", counts: { integrations: 0 } }),
    );
    const body = renderStabilitySnapshotBody(s);
    expect(body).toMatch(/cannabis retail POS/i);
    // Healthcare-language guard.
    for (const banned of [
      "patient",
      "clinical",
      "diagnosis",
      "insurance",
      "claim",
      "appointment",
      "reimbursement",
      "treatment",
      "medical record",
      "healthcare provider",
    ]) {
      expect(body.toLowerCase()).not.toContain(banned);
    }
    // MMC wording must not appear; only MMJ.
    expect(body).not.toMatch(/\bMMC\b/);
  });
});

describe("generateStabilitySnapshot — safety/professional boundaries", () => {
  it("does not contain legal, tax, or medical advice phrasing", () => {
    const s = generateStabilitySnapshot(
      makeSnap({
        counts: { integrations: 0 },
        items: [
          {
            source: "owner_dependence_items",
            module: "Owner dependence",
            title: "owner",
            value: { high: 1 },
            client_safe: false,
          },
        ],
      }),
    );
    const body = renderStabilitySnapshotBody(s).toLowerCase();
    for (const banned of [
      "legal advice",
      "tax advice",
      "medical advice",
      "guaranteed revenue",
      "guarantee revenue",
      "we guarantee",
    ]) {
      expect(body).not.toContain(banned);
    }
  });
});

describe("buildDeterministicDraft integration", () => {
  it("includes the RGS Stability Snapshot section in diagnostic reports", () => {
    const snap: EvidenceSnapshot = makeSnap({
      industry: "general_service",
      counts: { integrations: 0 },
    });
    const draft = buildDeterministicDraft(snap, "diagnostic");
    const sec = draft.sections.find((s) => s.key === "rgs_stability_snapshot");
    expect(sec).toBeDefined();
    expect(sec?.label).toBe("RGS Stability Snapshot");
    // Admin-only until reviewed.
    expect(sec?.client_safe).toBe(false);
    expect(draft.stability_snapshot).toBeDefined();
    expect(draft.stability_snapshot?.client_title).toBe("RGS Stability Snapshot");
  });

  it("places snapshot before Primary Risks", () => {
    const draft = buildDeterministicDraft(makeSnap({}), "diagnostic");
    const idxSnap = draft.sections.findIndex((s) => s.key === "rgs_stability_snapshot");
    const idxRisks = draft.sections.findIndex((s) => s.key === "primary_risks");
    expect(idxSnap).toBeGreaterThanOrEqual(0);
    expect(idxRisks).toBeGreaterThan(idxSnap);
  });

  it("snapshot section is not marked client-ready in draft state", () => {
    const draft = buildDeterministicDraft(makeSnap({}), "diagnostic");
    const sec = draft.sections.find((s) => s.key === "rgs_stability_snapshot");
    expect(sec?.client_safe).toBe(false);
    expect(["Draft", "Needs Review"]).toContain(
      draft.stability_snapshot?.overall_status ?? "Needs Review",
    );
  });

  it("does not use the literal generic 'SWOT Analysis' as a section label", () => {
    const draft = buildDeterministicDraft(makeSnap({}), "diagnostic");
    for (const s of draft.sections) {
      expect(s.label).not.toMatch(/^SWOT Analysis$/i);
    }
  });
});
