// P93E-E2 — Scorecard rubric v3 deterministic structure + scoring guards.
// Pins v2 preservation + v3 contract: 5 gears, ~25–35 questions, 0–200/gear,
// 0–1000 total, no full credit for unsure, premium results fields present.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  GEARS_V3,
  RUBRIC_VERSION_V3,
  emptyAnswersV3,
  scoreScorecardV3,
  totalQuestionsV3,
  type GearId,
} from "@/lib/scorecard/rubricV3";
import { RUBRIC_VERSION as V2_VERSION, PILLARS as V2_PILLARS } from "@/lib/scorecard/rubric";

describe("P93E-E2 — v2 preservation", () => {
  it("v2 rubric remains available alongside v3", () => {
    expect(V2_VERSION).toBe("v2_natural_language_evidence");
    expect(V2_PILLARS.length).toBe(5);
  });
});

describe("P93E-E2 — v3 rubric structure", () => {
  it("declares the deterministic v3 version", () => {
    expect(RUBRIC_VERSION_V3).toBe("v3_deterministic_gears");
  });

  it("exposes all 5 RGS gears in canonical order", () => {
    const ids: GearId[] = ["demand", "conversion", "operations", "financial", "owner"];
    expect(GEARS_V3.map((g) => g.id)).toEqual(ids);
  });

  it("has 25–35 deterministic questions total, 5–7 per gear", () => {
    const total = totalQuestionsV3();
    expect(total).toBeGreaterThanOrEqual(25);
    expect(total).toBeLessThanOrEqual(35);
    for (const g of GEARS_V3) {
      expect(g.questions.length).toBeGreaterThanOrEqual(5);
      expect(g.questions.length).toBeLessThanOrEqual(7);
    }
  });

  it("every question has 3–5 deterministic options with weights in [0,1]", () => {
    for (const g of GEARS_V3) {
      for (const q of g.questions) {
        expect(q.options.length).toBeGreaterThanOrEqual(3);
        expect(q.options.length).toBeLessThanOrEqual(5);
        for (const o of q.options) {
          expect(o.weight).toBeGreaterThanOrEqual(0);
          expect(o.weight).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it("'Not sure' / lowest-weight option never receives full credit", () => {
    for (const g of GEARS_V3) {
      for (const q of g.questions) {
        const minWeight = Math.min(...q.options.map((o) => o.weight));
        expect(minWeight).toBeLessThan(1);
        const unsure = q.options.find((o) =>
          /not sure|don't track|not at all|inconsistent|not present|unknown/i.test(o.label),
        );
        if (unsure) expect(unsure.weight).toBeLessThan(0.5);
      }
    }
  });
});

describe("P93E-E2 — v3 scoring", () => {
  it("strongest answers score 200 per gear and 1000 total", () => {
    const a = emptyAnswersV3();
    for (const g of GEARS_V3) for (const q of g.questions) a[g.id][q.id] = q.options[0].id;
    const r = scoreScorecardV3(a);
    for (const p of r.pillar_results) expect(p.score).toBe(200);
    expect(r.overall_score_estimate).toBe(1000);
  });

  it("weakest answers score near 0 and total stays 0–1000 bounded", () => {
    const a = emptyAnswersV3();
    for (const g of GEARS_V3) for (const q of g.questions) {
      const last = g.questions.find((qq) => qq.id === q.id)!.options;
      a[g.id][q.id] = last[last.length - 1].id;
    }
    const r = scoreScorecardV3(a);
    expect(r.overall_score_estimate).toBeGreaterThanOrEqual(0);
    expect(r.overall_score_estimate).toBeLessThanOrEqual(1000);
    for (const p of r.pillar_results) {
      expect(p.score).toBeGreaterThanOrEqual(0);
      expect(p.score).toBeLessThanOrEqual(60);
    }
  });

  it("unanswered questions count as 0 (no full credit by default)", () => {
    const r = scoreScorecardV3(emptyAnswersV3());
    expect(r.overall_score_estimate).toBe(0);
    expect(r.overall_confidence).toBe("low");
  });

  it("results include strongest gear, slipping gear, worn-tooth signals, interpretation band", () => {
    const a = emptyAnswersV3();
    // mix: strong demand, weak owner, partial elsewhere
    for (const g of GEARS_V3) {
      for (const q of g.questions) {
        const opts = q.options;
        if (g.id === "demand") a[g.id][q.id] = opts[0].id;
        else if (g.id === "owner") a[g.id][q.id] = opts[opts.length - 1].id;
        else a[g.id][q.id] = opts[Math.floor(opts.length / 2)].id;
      }
    }
    const r = scoreScorecardV3(a);
    expect(r.strongest_gear.pillar_id).toBe("demand");
    expect(r.most_slipping_gear.pillar_id).toBe("owner");
    expect(r.worn_tooth_signals.length).toBeGreaterThan(0);
    expect(r.worn_tooth_signals.length).toBeLessThanOrEqual(5);
    expect(r.interpretation_band.label).toBeTruthy();
    expect(r.interpretation_band.description).toMatch(/./);
  });

  it("partial-credit answers receive partial scores (not 0, not 200)", () => {
    const a = emptyAnswersV3();
    for (const g of GEARS_V3) for (const q of g.questions) {
      const mid = q.options.find((o) => o.weight > 0.3 && o.weight < 0.8) ?? q.options[1];
      a[g.id][q.id] = mid.id;
    }
    const r = scoreScorecardV3(a);
    for (const p of r.pillar_results) {
      expect(p.score).toBeGreaterThan(0);
      expect(p.score).toBeLessThan(200);
    }
  });
});

describe("P93E-E2 — Scorecard page wiring", () => {
  const SRC = readFileSync(join(process.cwd(), "src/pages/Scorecard.tsx"), "utf8");
  it("public Scorecard page imports v3 rubric and writes v3 rubric_version", () => {
    expect(SRC).toMatch(/from\s+["']@\/lib\/scorecard\/rubricV3["']/);
    expect(SRC).toMatch(/RUBRIC_VERSION_V3/);
  });
  it("results page surfaces 0–1000 score, gear scores /200, strongest + slipping, worn-tooth", () => {
    expect(SRC).toMatch(/Business Stability Score/);
    expect(SRC).toMatch(/\/ 1,000/);
    expect(SRC).toMatch(/\/ 200/);
    expect(SRC).toMatch(/Strongest gear/);
    expect(SRC).toMatch(/Most slipping gear/);
    expect(SRC).toMatch(/Worn-tooth signals/);
  });
  it("results page includes self-reported / first-pass disclaimer + Diagnostic differentiation", () => {
    expect(SRC).toMatch(/first-pass/i);
    expect(SRC).toMatch(/self-reported/i);
    expect(SRC).toMatch(/Apply for the Diagnostic/);
    expect(SRC).toMatch(/evidence review.*admin interpretation.*contradiction checks.*repair sequencing/i);
    expect(SRC).toMatch(/Not legal, tax, accounting/i);
    expect(SRC).toMatch(/No revenue, profit, growth/i);
  });
});