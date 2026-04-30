// P20.7 — Deterministic mapper tests for customerContext.

import { describe, it, expect } from "vitest";
import {
  brainSignalsFromScorecard,
  industryDataFromSnapshot,
  mergeBrainSignals,
} from "@/lib/intelligence/customerContext";

describe("brainSignalsFromScorecard", () => {
  it("emits no signals when scorecard run is missing", () => {
    expect(brainSignalsFromScorecard(null)).toEqual([]);
    expect(brainSignalsFromScorecard(undefined)).toEqual([]);
    expect(brainSignalsFromScorecard({ pillar_results: [] })).toEqual([]);
  });

  it("emits signals only for low-band pillars (band <= 2)", () => {
    const signals = brainSignalsFromScorecard({
      id: "run_1",
      pillar_results: [
        { pillar_id: "demand", band: 1, confidence: "high" },
        { pillar_id: "conversion", band: 2, confidence: "medium" },
        { pillar_id: "operations", band: 3, confidence: "high" },
        { pillar_id: "financial", band: 4, confidence: "high" },
        { pillar_id: "owner", band: 5, confidence: "high" },
      ],
    });
    const keys = signals.map((s) => s.key).sort();
    expect(keys).toEqual(["missing_source_attribution", "poor_follow_up"]);
  });

  it("maps confidence: high→Confirmed, medium→Estimated, low→Needs Verification", () => {
    const signals = brainSignalsFromScorecard({
      pillar_results: [
        { pillar_id: "demand", band: 1, confidence: "high" },
        { pillar_id: "conversion", band: 1, confidence: "medium" },
        { pillar_id: "operations", band: 1, confidence: "low" },
      ],
    });
    const byKey = Object.fromEntries(signals.map((s) => [s.key, s.confidence]));
    expect(byKey["missing_source_attribution"]).toBe("Confirmed");
    expect(byKey["poor_follow_up"]).toBe("Estimated");
    expect(byKey["manual_workaround_dependency"]).toBe("Needs Verification");
  });

  it("never invents dollar impact", () => {
    const signals = brainSignalsFromScorecard({
      pillar_results: [{ pillar_id: "owner", band: 1, confidence: "high" }],
    });
    expect(signals[0].estimated_revenue_impact).toBeUndefined();
  });

  it("attaches the scorecard run as source_ref", () => {
    const signals = brainSignalsFromScorecard({
      id: "run_xyz",
      pillar_results: [{ pillar_id: "owner", band: 1, confidence: "high" }],
    });
    expect(signals[0].source_ref).toBe("scorecard_run:run_xyz");
  });
});

describe("industryDataFromSnapshot", () => {
  it("returns undefined when snapshot is null/undefined", () => {
    expect(industryDataFromSnapshot(null, "trade_field_service")).toBeUndefined();
    expect(industryDataFromSnapshot(undefined, "restaurant")).toBeUndefined();
  });

  it("never fabricates numeric metrics from free-text snapshot prose", () => {
    const out = industryDataFromSnapshot(
      {
        snapshot_status: "admin_verified",
        industry_verified: true,
        what_business_does:
          "We sell artisan baked goods and run a small cafe. Margins feel tight.",
      },
      "restaurant",
    );
    // Whatever shape we return, it must not invent foodCostPct / laborCostPct
    // / grossMarginPct / inventoryTurnover / margins from prose.
    const json = JSON.stringify(out ?? {});
    expect(json).not.toMatch(/foodCostPct|laborCostPct|grossMarginPct|inventoryTurnover|deadStockValue/);
  });

  it("never adds healthcare-shaped fields for cannabis/MMC", () => {
    const out = industryDataFromSnapshot(
      {
        snapshot_status: "admin_verified",
        industry_verified: true,
        what_business_does: "Regulated cannabis dispensary; retail + inventory + margins.",
      },
      "mmj_cannabis",
    );
    const json = JSON.stringify(out ?? {}).toLowerCase();
    for (const banned of [
      "patient",
      "claim",
      "reimbursement",
      "appointment",
      "provider",
      "clinical",
      "diagnosis",
      "insurance",
    ]) {
      expect(json).not.toContain(banned);
    }
  });
});

describe("mergeBrainSignals", () => {
  it("dedupes by key keeping the strongest confidence and worst severity", () => {
    const a = [
      {
        key: "owner_dependent_process",
        observation: "low",
        confidence: "Needs Verification" as const,
        severity: "low" as const,
      },
    ];
    const b = [
      {
        key: "owner_dependent_process",
        observation: "high",
        confidence: "Confirmed" as const,
        severity: "high" as const,
      },
    ];
    const merged = mergeBrainSignals(a, b);
    expect(merged).toHaveLength(1);
    expect(merged[0].confidence).toBe("Confirmed");
    expect(merged[0].severity).toBe("high");
  });
});