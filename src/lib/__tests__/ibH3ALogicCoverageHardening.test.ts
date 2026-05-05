/**
 * IB-H3A — Logic Coverage + Clarity Hardening contract tests.
 *
 * Audit-only pass after IB-H2 / IB-H3 / IB-H3B. Proves:
 *  - all IB-H3 hard-truth metrics are mapped at least once by
 *    GEAR_METRIC_QUESTION_MAP (Owner Diagnostic Interview + per-gear tool)
 *  - all IB-H3B industry-depth questions reference only valid IB-H3 metric keys
 *  - every industry-depth question has the full required report/repair-map/admin
 *    field shape needed for IB-H4 wiring
 *  - every depth industry has 25 questions and 5 per gear
 *  - answer-state semantics align across IB-H3 and IB-H3B helpers
 *  - all new metrics/questions remain interpretiveOnly
 *  - registries do not import deterministic scoring or wire AI/secrets/fetch/supabase
 *  - no $297/month pricing reintroduced
 *  - cannabis/MMJ safety: no healthcare/HIPAA/clinical/patient drift in the
 *    new registries
 *  - RGS Control System price remains $1,000/month per the hardening doc
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  GEAR_METRIC_REGISTRY,
  GEAR_METRIC_QUESTION_MAP,
  interpretAnswerState,
  type GearKey,
} from "@/lib/intelligence/gearMetricRegistry";
import {
  INDUSTRY_DEPTH_QUESTIONS,
  INDUSTRY_DEPTH_INDUSTRY_KEYS,
  interpretIndustryDepthAnswer,
} from "@/lib/intelligence/industryDepthQuestionRegistry";

const GEARS: GearKey[] = [
  "demand",
  "conversion",
  "operations",
  "financial",
  "independence",
];

const GEAR_REG_SRC = readFileSync(
  resolve(process.cwd(), "src/lib/intelligence/gearMetricRegistry.ts"),
  "utf8",
);
const DEPTH_REG_SRC = readFileSync(
  resolve(process.cwd(), "src/lib/intelligence/industryDepthQuestionRegistry.ts"),
  "utf8",
);
const PLAN_DOC = readFileSync(
  resolve(process.cwd(), "docs/industry-brain-gear-metrics-hardening-plan.md"),
  "utf8",
);

describe("IB-H3A — Metric ↔ question coverage", () => {
  it("all 25 IB-H3 metrics are mapped at least once", () => {
    expect(GEAR_METRIC_REGISTRY.length).toBe(25);
    const mapped = new Set(GEAR_METRIC_QUESTION_MAP.map((q) => q.metricKey));
    for (const m of GEAR_METRIC_REGISTRY) {
      expect(mapped.has(m.metricKey)).toBe(true);
    }
  });

  it("each metric is mapped to Owner Diagnostic Interview + a gear-specific tool", () => {
    for (const m of GEAR_METRIC_REGISTRY) {
      const rows = GEAR_METRIC_QUESTION_MAP.filter((q) => q.metricKey === m.metricKey);
      const tools = new Set(rows.map((r) => r.toolKey));
      expect(tools.has("owner_diagnostic_interview")).toBe(true);
      expect(tools.has(`${m.gear}_diagnostic`)).toBe(true);
    }
  });

  it("all IB-H3B questions reference only valid IB-H3 metric keys", () => {
    const valid = new Set(GEAR_METRIC_REGISTRY.map((m) => m.metricKey));
    for (const q of INDUSTRY_DEPTH_QUESTIONS) {
      expect(q.metricMappings.length).toBeGreaterThan(0);
      for (const m of q.metricMappings) {
        expect(valid.has(m)).toBe(true);
      }
    }
  });
});

describe("IB-H3A — Industry & gear coverage alignment", () => {
  it("each depth industry has 25 questions split 5 per gear", () => {
    for (const k of INDUSTRY_DEPTH_INDUSTRY_KEYS) {
      const qs = INDUSTRY_DEPTH_QUESTIONS.filter((q) => q.industryKey === k);
      expect(qs.length).toBe(25);
      for (const g of GEARS) {
        expect(qs.filter((q) => q.gear === g).length).toBe(5);
      }
    }
  });

  it("each gear has 5 hard-truth metrics", () => {
    for (const g of GEARS) {
      expect(GEAR_METRIC_REGISTRY.filter((m) => m.gear === g).length).toBe(5);
    }
  });
});

describe("IB-H3A — Report / repair-map / admin field readiness", () => {
  it("every depth question carries report/repair/admin fields for IB-H4", () => {
    for (const q of INDUSTRY_DEPTH_QUESTIONS) {
      expect(q.repairMapTrigger.length).toBeGreaterThan(5);
      expect(q.reportLanguageSeed.length).toBeGreaterThan(5);
      expect(q.clientSafeExplanation.length).toBeGreaterThan(5);
      expect(q.adminOnlyInterpretationNotes.length).toBeGreaterThan(5);
      expect(Array.isArray(q.failurePatternMappings)).toBe(true);
      expect(q.failurePatternMappings.length).toBeGreaterThan(0);
      expect(Array.isArray(q.benchmarkAnchorMappings)).toBe(true);
      expect(q.interpretiveOnly).toBe(true);
      expect(q.aiDraftSupport.adminReviewedOnly).toBe(true);
      expect(q.aiDraftSupport.noAutoPublish).toBe(true);
    }
  });

  it("every gear metric carries IB-H4 wiring fields and stays interpretive", () => {
    for (const m of GEAR_METRIC_REGISTRY) {
      expect(m.interpretiveOnly).toBe(true);
      expect(m.clientSafeExplanation.length).toBeGreaterThan(5);
      expect(m.adminOnlyNotes.length).toBeGreaterThan(5);
      expect(m.deterministicScoringHint.length).toBeGreaterThan(5);
      expect(m.evidenceFields.length).toBeGreaterThan(0);
      // RGS Control + repair-map readiness flagged for IB-H4 consumption.
      expect(m.futureWiring.adminReview).toBe(true);
      expect(m.futureWiring.reportBuilder).toBe(true);
      expect(m.futureWiring.priorityRepairMap).toBe(true);
      expect(m.futureWiring.rgsControlSystem).toBe(true);
      expect(m.futureWiring.revenueRiskMonitor).toBe(true);
      expect(m.futureWiring.clientHealthRenewalRisk).toBe(true);
    }
  });
});

describe("IB-H3A — Answer-state alignment", () => {
  it("IB-H3 and IB-H3B helpers agree on the four states", () => {
    for (const s of ["verified", "incomplete", "unknown", "no"] as const) {
      expect(interpretAnswerState(s)).toEqual(interpretIndustryDepthAnswer(s));
    }
  });

  it("unknown is visibility weakness, incomplete and no are slipping, verified is stable", () => {
    expect(interpretAnswerState("verified").isStable).toBe(true);
    expect(interpretAnswerState("incomplete").isSlipping).toBe(true);
    expect(interpretAnswerState("unknown").isVisibilityWeakness).toBe(true);
    expect(interpretAnswerState("unknown").isSlipping).toBe(true);
    expect(interpretAnswerState("no").isSlipping).toBe(true);
  });
});

describe("IB-H3A — Registry isolation, AI safety, pricing, cannabis safety", () => {
  it("registries do not import deterministic scoring engine", () => {
    for (const src of [GEAR_REG_SRC, DEPTH_REG_SRC]) {
      expect(src).not.toMatch(/from ["']@\/lib\/scoring\//);
      expect(src).not.toMatch(/stabilityScore\(/);
      // Allow doc-comment mentions of customer_stability_scores in the
      // header safety block ("nothing here mutates …"); forbid actual
      // reads/writes to it.
      expect(src).not.toMatch(/from\(["']customer_stability_scores["']\)/);
    }
  });

  it("registries do not wire AI providers, secrets, fetch, or supabase", () => {
    for (const src of [GEAR_REG_SRC, DEPTH_REG_SRC]) {
      expect(src).not.toMatch(/openai/i);
      expect(src).not.toMatch(/anthropic/i);
      expect(src).not.toMatch(/api[_-]?key/i);
      expect(src).not.toMatch(/fetch\(/);
      expect(src).not.toMatch(/from ["']@\/integrations\/supabase/);
    }
  });

  it("registries contain no healthcare / HIPAA / clinical / patient drift outside safety disclaimers", () => {
    const banned = [
      "hipaa",
      "patient care",
      "clinical workflow",
      "medical billing",
      "insurance claim",
    ];
    // Strip block + line comments so the safety-disclaimer header in
    // gearMetricRegistry.ts ("No HIPAA, healthcare, patient care …")
    // does not register as drift. Active code/data must remain clean.
    const stripComments = (s: string) =>
      s
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
    for (const src of [GEAR_REG_SRC, DEPTH_REG_SRC]) {
      const lowered = stripComments(src).toLowerCase();
      for (const b of banned) expect(lowered).not.toContain(b);
    }
  });

  it("registries do not reintroduce $297/month pricing", () => {
    for (const src of [GEAR_REG_SRC, DEPTH_REG_SRC]) {
      expect(src).not.toMatch(/\$297/);
      expect(src).not.toMatch(/297\s*\/\s*month/);
    }
  });

  it("plan doc confirms RGS Control System price is $1,000/month", () => {
    expect(PLAN_DOC).toMatch(/\$1,000\s*\/\s*month/);
  });

  it("plan doc documents IB-H3A audit and Pro Services / E-commerce as tool-depth profiles", () => {
    expect(PLAN_DOC).toMatch(/IB-H3A/);
    expect(PLAN_DOC.toLowerCase()).toContain("tool-depth profile");
  });
});
