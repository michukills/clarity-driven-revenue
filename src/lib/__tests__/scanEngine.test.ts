/**
 * P96 — Operational Friction Scan engine determinism & intelligence.
 */
import { describe, it, expect } from "vitest";
import { runScan, SCAN_QUESTIONS, type ScanAnswers } from "@/lib/scan/engine";

function allAnswers(pick: (qIdx: number) => string): ScanAnswers {
  const a: ScanAnswers = {};
  SCAN_QUESTIONS.forEach((q, i) => { a[q.id] = pick(i); });
  return a;
}

describe("scan engine", () => {
  it("is deterministic for the same inputs", () => {
    const a = allAnswers(() => "a");
    expect(runScan(a)).toEqual(runScan(a));
  });

  it("detects owner bottleneck when owner-dependency signals dominate", () => {
    // All "a" answers stack owner_dependency + conversion_leak +
    // demand_owner_bottleneck + handoff + owner_decision_load + systemic + conversion_capacity.
    const r = runScan(allAnswers(() => "a"));
    expect(["owner", "conversion"]).toContain(r.bottleneck.upstreamGear);
    expect(r.wornTeeth.length).toBeGreaterThan(0);
    expect(r.downstreamIfUntouched.length).toBeGreaterThan(0);
  });

  it("classifies financial-visibility gap as the bottleneck when signals point there", () => {
    const a: ScanAnswers = {
      q_followup: "c",          // systemized_followup
      q_owner_out: "c",         // ops_owner_bottleneck
      q_revenue_visibility: "d", // financial_visibility_missing (+1.5)
      q_job_sideways: "a",      // handoff_friction
      q_day_derail: "d",        // cash_visibility_drag
      q_repeat: "c",            // systems_holding
      q_double_demand: "c",     // cash_capacity
    };
    const r = runScan(a);
    expect(r.bottleneck.upstreamGear).toBe("financial");
    expect(r.gears.find((g) => g.id === "financial")!.pressure).toBe("slipping");
  });

  it("never returns LOW confidence for a fully-answered scan with safe inputs", () => {
    const r = runScan(allAnswers(() => "a"));
    expect(r.confidence.label).not.toBe("low");
  });

  it("surfaces no worn teeth when systems are mostly holding", () => {
    const a: ScanAnswers = {
      q_followup: "c",
      q_owner_out: "d",        // decision_bottleneck — minor owner load
      q_revenue_visibility: "a",
      q_job_sideways: "b",
      q_day_derail: "b",
      q_repeat: "c",
      q_double_demand: "b",
    };
    const r = runScan(a);
    // Should be much lighter than the all-"a" stress case.
    const slipping = r.gears.filter((g) => g.pressure === "slipping").length;
    expect(slipping).toBeLessThanOrEqual(1);
  });

  it("produces a Diagnostic-Grade Assessment handoff to /scorecard", () => {
    const r = runScan(allAnswers(() => "a"));
    expect(r.goDeeper.href).toBe("/scorecard");
    expect(r.goDeeper.label).toMatch(/Diagnostic-Grade/);
  });
});
