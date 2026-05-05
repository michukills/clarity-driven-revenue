/**
 * IB-H3 — Gear Metric Registry contract tests.
 *
 * Verifies the 25 hard-truth metrics across 5 gears, evidence fields,
 * answer-state semantics (unknown=visibility weakness, incomplete=slips),
 * tool/question mapping, deterministic-scoring safety, cannabis/MMJ
 * dispensary-only safety, and that no $297/month pricing returns.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  GEAR_METRIC_REGISTRY,
  GEAR_METRIC_QUESTION_MAP,
  getMetricsByGear,
  getMetricByKey,
  interpretAnswerState,
  type GearKey,
} from "@/lib/intelligence/gearMetricRegistry";

const ALL_GEARS: GearKey[] = [
  "demand",
  "conversion",
  "operations",
  "financial",
  "independence",
];

const REQUIRED_METRICS = [
  "demand.cpql",
  "demand.channel_concentration",
  "demand.inquiry_to_lead_ratio",
  "demand.mer",
  "demand.lead_quality_buyer_fit",
  "conversion.sales_cycle_length",
  "conversion.lead_to_close_rate",
  "conversion.average_order_value",
  "conversion.no_show_cancellation_rate",
  "conversion.followup_completion_rate",
  "operations.capacity_utilization",
  "operations.rework_error_rate",
  "operations.cycle_time",
  "operations.owner_bottleneck",
  "operations.delivery_consistency",
  "financial.break_even_point",
  "financial.cash_runway",
  "financial.gross_margin",
  "financial.net_margin",
  "financial.ar_aging",
  "independence.vacation_test",
  "independence.decision_frequency",
  "independence.documentation_coverage",
  "independence.single_point_of_failure",
  "independence.delegation_clarity",
];

describe("IB-H3 — Gear Metric Registry", () => {
  it("contains exactly 25 metrics across 5 gears", () => {
    expect(GEAR_METRIC_REGISTRY.length).toBe(25);
    for (const g of ALL_GEARS) {
      expect(getMetricsByGear(g).length).toBeGreaterThanOrEqual(5);
    }
  });

  it("includes every required hard-truth metric key", () => {
    for (const key of REQUIRED_METRICS) {
      expect(getMetricByKey(key)).toBeDefined();
    }
  });

  it.each(REQUIRED_METRICS)("metric %s has full evidence + answer states + safety wording", (key) => {
    const m = getMetricByKey(key)!;
    expect(m.metricKey).toBe(key);
    expect(ALL_GEARS).toContain(m.gear);
    expect(m.metricName.length).toBeGreaterThan(0);
    expect(m.ownerFriendlyQuestion.length).toBeGreaterThan(0);
    expect(m.evidenceFields.length).toBeGreaterThan(0);
    expect(m.answerStates.verified.length).toBeGreaterThan(0);
    expect(m.answerStates.incomplete.length).toBeGreaterThan(0);
    expect(m.answerStates.unknown.length).toBeGreaterThan(0);
    expect(m.answerStates.no.length).toBeGreaterThan(0);
    expect(m.unknownCondition.toLowerCase()).toContain("visibility");
    expect(m.incompleteCondition.toLowerCase()).toContain("slip");
    expect(m.clientSafeExplanation.length).toBeGreaterThan(0);
    expect(m.adminOnlyNotes.length).toBeGreaterThan(0);
    expect(m.interpretiveOnly).toBe(true);
    expect(m.relatedIndustries.length).toBeGreaterThanOrEqual(1);
  });

  it("answer-state interpretation: unknown is visibility weakness, incomplete slips, verified is stable", () => {
    expect(interpretAnswerState("verified").isStable).toBe(true);
    expect(interpretAnswerState("unknown").isVisibilityWeakness).toBe(true);
    expect(interpretAnswerState("unknown").isSlipping).toBe(true);
    expect(interpretAnswerState("incomplete").isSlipping).toBe(true);
    expect(interpretAnswerState("incomplete").isStable).toBe(false);
    expect(interpretAnswerState("no").isSlipping).toBe(true);
  });

  it("every metric has at least one tool/question mapping (Owner Diagnostic Interview + gear tool)", () => {
    for (const m of GEAR_METRIC_REGISTRY) {
      const mappings = GEAR_METRIC_QUESTION_MAP.filter(
        (q) => q.metricKey === m.metricKey,
      );
      expect(mappings.length).toBeGreaterThanOrEqual(2);
      expect(mappings.some((q) => q.toolKey === "owner_diagnostic_interview")).toBe(true);
      expect(mappings.some((q) => q.toolKey === `${m.gear}_diagnostic`)).toBe(true);
      for (const q of mappings) {
        expect(q.evidencePrompt.toLowerCase()).toContain("not tracked");
        expect(q.interpretiveOnly).toBe(true);
      }
    }
  });

  it("does not modify deterministic scoring source files", () => {
    const scoring = readFileSync(join(process.cwd(), "src/lib/scoring/stabilityScore.ts"), "utf8");
    expect(scoring).not.toContain("gearMetricRegistry");
    expect(scoring).not.toContain("GEAR_METRIC_REGISTRY");
  });

  it("cannabis/MMJ metrics use dispensary/operations language only — no healthcare drift", () => {
    const text = JSON.stringify(GEAR_METRIC_REGISTRY).toLowerCase();
    const banned = ["hipaa", "patient care", "medical billing", "insurance claim", "clinical workflow"];
    for (const term of banned) {
      expect(text).not.toContain(term);
    }
    // cannabis nuance present (cycle time industry note)
    const cycle = getMetricByKey("operations.cycle_time")!;
    expect(cycle.industryNotes?.cannabis_mmj_mmc?.toLowerCase()).toMatch(
      /intake|check-in|reconciliation/,
    );
  });

  it("does not introduce $297/month pricing in registry source", () => {
    const src = readFileSync(
      join(process.cwd(), "src/lib/intelligence/gearMetricRegistry.ts"),
      "utf8",
    );
    expect(src).not.toContain("$297");
    expect(src).not.toContain("297/month");
  });

  it("no AI/secret wiring is added prematurely in registry source", () => {
    const src = readFileSync(
      join(process.cwd(), "src/lib/intelligence/gearMetricRegistry.ts"),
      "utf8",
    );
    expect(src.toLowerCase()).not.toContain("openai");
    expect(src.toLowerCase()).not.toContain("api_key");
    expect(src).not.toContain("LOVABLE_API_KEY");
  });
});

describe("IB-H3 — does not duplicate existing tables/migrations", () => {
  it("introduces no new SQL migration for IB-H3 (TS constants chosen)", () => {
    const migrationsDir = join(process.cwd(), "supabase/migrations");
    const files = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql"));
    const hits = files.filter((f) => {
      const txt = readFileSync(join(migrationsDir, f), "utf8");
      return txt.includes("gear_metric_registry") || txt.includes("IB-H3");
    });
    expect(hits.length).toBe(0);
  });
});