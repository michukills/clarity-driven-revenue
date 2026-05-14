/**
 * P93E-E2E — Industry Diagnostic Depth Matrix tests.
 *
 * Proves the matrix exists, is complete across 7 industries × 5 gears,
 * carries all 14 dimensions per cell, never asserts forbidden legal /
 * tax / accounting / compliance / valuation language, never overrides
 * deterministic v3 scoring, and that cannabis rows speak operational
 * documentation visibility only.
 *
 * Also enforces:
 *   - Diagnostic Interview prompt is materially deeper than the
 *     Scorecard prompt for the same cell.
 *   - Each industry has at least one contradiction check, false-green
 *     trap, and repair-map trigger.
 *   - Trades / Restaurant / Retail / Professional Services / E-commerce
 *     each cover the industry-specific topics required by the brief
 *     (callbacks, prime cost, sell-through, scope creep, true margin).
 *   - Cannabis avoids legal/regulatory determination language.
 *   - The matrix never references AI scoring or score values.
 */

import { describe, expect, it } from "vitest";
import {
  CANNABIS_FORBIDDEN_CLAIMS,
  DEPTH_FORBIDDEN_CLAIMS,
  INDUSTRY_DIAGNOSTIC_DEPTH_MATRIX,
  MATRIX_GEAR_KEYS,
  MATRIX_INDUSTRY_KEYS,
  STANDARD_RUBRIC_STATES,
  getDiagnosticDepthCell,
  type DiagnosticDepthCell,
  type MatrixIndustryKey,
} from "@/config/industryDiagnosticDepthMatrix";

describe("P93E-E2E — Industry Diagnostic Depth Matrix shape", () => {
  it("covers all 7 supported industries", () => {
    expect(MATRIX_INDUSTRY_KEYS).toEqual([
      "trades_home_services",
      "restaurant_food_service",
      "retail",
      "professional_services",
      "ecommerce_online_retail",
      "cannabis_mmj_dispensary",
      "general_service_other",
    ]);
    expect(Object.keys(INDUSTRY_DIAGNOSTIC_DEPTH_MATRIX).sort()).toEqual(
      [...MATRIX_INDUSTRY_KEYS].sort(),
    );
  });

  it("uses the canonical RGS 5-Gear keys exactly", () => {
    expect(MATRIX_GEAR_KEYS).toEqual([
      "demand_generation",
      "revenue_conversion",
      "operational_efficiency",
      "financial_visibility",
      "owner_independence",
    ]);
  });

  it("every industry has all 5 gears present", () => {
    for (const ind of MATRIX_INDUSTRY_KEYS) {
      const m = INDUSTRY_DIAGNOSTIC_DEPTH_MATRIX[ind];
      for (const gear of MATRIX_GEAR_KEYS) {
        expect(m[gear], `${ind}.${gear} missing`).toBeDefined();
      }
    }
  });

  it("every cell carries all 14 documented dimensions", () => {
    const required: (keyof DiagnosticDepthCell)[] = [
      "kpi",
      "process",
      "scorecard_question",
      "diagnostic_interview_question",
      "evidence_prompts",
      "evidence_source_hints",
      "rubric_states",
      "contradiction_check",
      "failure_pattern",
      "false_green_trap",
      "repair_map_trigger",
      "priority_sequence",
      "admin_review_note",
      "client_safe_explanation",
    ];
    for (const ind of MATRIX_INDUSTRY_KEYS) {
      for (const gear of MATRIX_GEAR_KEYS) {
        const c = getDiagnosticDepthCell(ind, gear);
        for (const k of required) {
          expect(
            c[k],
            `${ind}.${gear} missing field ${String(k)}`,
          ).toBeDefined();
        }
        expect(c.evidence_prompts.length).toBeGreaterThanOrEqual(2);
        expect(c.evidence_source_hints.length).toBeGreaterThanOrEqual(2);
        expect(c.rubric_states).toEqual(STANDARD_RUBRIC_STATES);
      }
    }
  });
});

describe("P93E-E2E — Diagnostic depth (paid) is materially deeper than Scorecard (free)", () => {
  it("Diagnostic Interview prompt is longer than Scorecard prompt for every cell", () => {
    for (const ind of MATRIX_INDUSTRY_KEYS) {
      for (const gear of MATRIX_GEAR_KEYS) {
        const c = getDiagnosticDepthCell(ind, gear);
        // Diagnostic must require richer context than the Scorecard prompt.
        expect(
          c.diagnostic_interview_question.length,
          `${ind}.${gear} diagnostic prompt not deeper`,
        ).toBeGreaterThan(c.scorecard_question.length + 20);
        expect(c.scorecard_question.length).toBeGreaterThan(20);
        expect(c.diagnostic_interview_question.length).toBeGreaterThan(60);
      }
    }
  });

  it("Scorecard prompts stay open-ended (not yes/no, not 1-10 ratings)", () => {
    for (const ind of MATRIX_INDUSTRY_KEYS) {
      for (const gear of MATRIX_GEAR_KEYS) {
        const q = getDiagnosticDepthCell(ind, gear).scorecard_question;
        expect(/\b1\s*-\s*10\b/.test(q), `${ind}.${gear} uses 1-10 scale`).toBe(false);
        expect(/\brate (?:on|from)\b/i.test(q)).toBe(false);
      }
    }
  });
});

describe("P93E-E2E — Industry-specific topical coverage", () => {
  function joinedText(ind: MatrixIndustryKey): string {
    const m = INDUSTRY_DIAGNOSTIC_DEPTH_MATRIX[ind];
    return MATRIX_GEAR_KEYS.map((g) => {
      const c = m[g];
      return [
        c.kpi,
        c.process,
        c.scorecard_question,
        c.diagnostic_interview_question,
        c.failure_pattern,
        c.false_green_trap,
        c.contradiction_check,
        c.evidence_prompts.join(" "),
      ].join(" ");
    })
      .join(" ")
      .toLowerCase();
  }

  it("Trades covers callbacks, dispatch, utilization, job costing, quote-to-job", () => {
    const t = joinedText("trades_home_services");
    for (const term of [
      "callback",
      "dispatch",
      "utiliz",
      "job cost",
      "quote",
      "service line",
    ]) {
      expect(t.includes(term), `trades missing topic: ${term}`).toBe(true);
    }
  });

  it("Restaurant covers prime cost / margin, waste / prep, comps or voids, ticket time, menu", () => {
    const t = joinedText("restaurant_food_service");
    expect(t).toMatch(/prime cost|prep|waste/);
    expect(t).toMatch(/comp|void/);
    expect(t).toMatch(/ticket time|table turn/);
    expect(t).toMatch(/menu/);
  });

  it("Retail covers sell-through, stockouts, shrink, inventory aging, markdowns, category margin", () => {
    const t = joinedText("retail");
    for (const term of [
      "sell-through",
      "stockout",
      "shrink",
      "markdown",
      "category",
    ]) {
      expect(t.includes(term), `retail missing topic: ${term}`).toBe(true);
    }
  });

  it("Professional Services covers utilization, scope, proposal, AR aging, client concentration", () => {
    const t = joinedText("professional_services");
    expect(t).toMatch(/utilization/);
    expect(t).toMatch(/scope/);
    expect(t).toMatch(/proposal/);
    expect(t).toMatch(/ar aging|a\/r aging|aging/);
  });

  it("E-commerce covers ROAS / CAC, fulfillment, returns, platform concentration, true margin", () => {
    const t = joinedText("ecommerce_online_retail");
    expect(t).toMatch(/roas|cac|acquire a customer/);
    expect(t).toMatch(/fulfillment/);
    expect(t).toMatch(/return/);
    expect(t).toMatch(/platform|channel/);
    expect(t).toMatch(/shipping|fees|landed/);
  });

  it("Cannabis covers seed-to-sale reconciliation, variance, override / void / discount, cash controls", () => {
    const t = joinedText("cannabis_mmj_dispensary");
    expect(t).toMatch(/seed-to-sale|reconcil/);
    expect(t).toMatch(/variance/);
    expect(t).toMatch(/override|void|discount/);
    expect(t).toMatch(/cash/);
  });

  it("General fallback explicitly flags lower industry-specific confidence in admin notes", () => {
    const m = INDUSTRY_DIAGNOSTIC_DEPTH_MATRIX.general_service_other;
    const adminNotes = MATRIX_GEAR_KEYS.map((g) => m[g].admin_review_note)
      .join(" ")
      .toLowerCase();
    expect(adminNotes).toMatch(/(fallback|lower|industry)/);
  });
});

describe("P93E-E2E — Cannabis safety language", () => {
  it("never affirmatively asserts legal / regulatory / compliance certification language in cannabis rows (disclaimers allowed)", () => {
    const m = INDUSTRY_DIAGNOSTIC_DEPTH_MATRIX.cannabis_mmj_dispensary;
    const blob = MATRIX_GEAR_KEYS.map((g) => {
      const c = m[g];
      return [
        c.kpi,
        c.process,
        c.scorecard_question,
        c.diagnostic_interview_question,
        c.contradiction_check,
        c.failure_pattern,
        c.false_green_trap,
        c.admin_review_note,
        c.client_safe_explanation,
      ].join(" ");
    })
      .join(" ")
      .toLowerCase();
    // Some phrases (e.g. "legal determination", "legal compliance",
    // "regulatory determination", "safe harbor") are forbidden when stated
    // affirmatively but ARE allowed inside RGS safety disclaimers such as
    // "No legal or regulatory determination" / "not legal compliance
    // certification" / "RGS does not provide legal compliance
    // determinations". For those phrases we scan each occurrence and skip
    // it if the preceding ~60 chars contain a negation. Absolute phrases
    // (legally compliant, compliance certified, guaranteed compliant,
    // legally verified, regulatory safe) are blocked unconditionally.
    const NEGATABLE = new Set([
      "legal compliance",
      "legal determination",
      "regulatory determination",
      "safe harbor",
      "compliance certification",
      "enforcement protection",
    ]);
    const NEGATION_RE =
      /\b(?:no|not|never|without|isn'?t|aren'?t|won'?t|does not|do not|don'?t|cannot|can'?t|does\s+not\s+(?:provide|make|certify|guarantee)|never\s+(?:make|provide|certify))\b/i;
    for (const phrase of CANNABIS_FORBIDDEN_CLAIMS) {
      const lower = phrase.toLowerCase();
      const escaped = lower.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
      const re = new RegExp(escaped, "gi");
      let m: RegExpExecArray | null;
      while ((m = re.exec(blob)) !== null) {
        const before = blob.slice(Math.max(0, m.index - 80), m.index);
        if (NEGATABLE.has(lower) && NEGATION_RE.test(before)) continue;
        const ctxStart = Math.max(0, m.index - 40);
        const ctxEnd = Math.min(blob.length, m.index + lower.length + 40);
        const ctx = blob.slice(ctxStart, ctxEnd);
        throw new Error(
          `cannabis must not affirmatively assert "${phrase}" (context: "...${ctx}...")`,
        );
      }
    }
  });

  it("uses operational documentation visibility framing in cannabis admin/client copy", () => {
    const m = INDUSTRY_DIAGNOSTIC_DEPTH_MATRIX.cannabis_mmj_dispensary;
    const adminBlob = MATRIX_GEAR_KEYS.map((g) => m[g].admin_review_note)
      .join(" ")
      .toLowerCase();
    expect(adminBlob).toMatch(/operational/);
    expect(adminBlob).toMatch(/(documentation visibility|documentation|cash visibility|decision-rights)/);
  });
});

describe("P93E-E2E — Forbidden claim hygiene across all industries", () => {
  it("no client_safe_explanation contains a P86C forbidden claim", () => {
    for (const ind of MATRIX_INDUSTRY_KEYS) {
      for (const gear of MATRIX_GEAR_KEYS) {
        const text = getDiagnosticDepthCell(ind, gear).client_safe_explanation.toLowerCase();
        for (const phrase of DEPTH_FORBIDDEN_CLAIMS) {
          expect(
            text.includes(phrase.toLowerCase()),
            `${ind}.${gear} client_safe_explanation contains forbidden phrase: ${phrase}`,
          ).toBe(false);
        }
      }
    }
  });

  it("no admin_review_note promises results, valuations, or guarantees", () => {
    const banned = [
      "guaranteed",
      "valuation opinion",
      "audit-ready",
      "legally verified",
      "investor-ready",
      "lender-ready",
    ];
    for (const ind of MATRIX_INDUSTRY_KEYS) {
      for (const gear of MATRIX_GEAR_KEYS) {
        const text = getDiagnosticDepthCell(ind, gear).admin_review_note.toLowerCase();
        for (const phrase of banned) {
          expect(text.includes(phrase)).toBe(false);
        }
      }
    }
  });

  it("matrix never references AI scoring or score values directly", () => {
    for (const ind of MATRIX_INDUSTRY_KEYS) {
      for (const gear of MATRIX_GEAR_KEYS) {
        const c = getDiagnosticDepthCell(ind, gear);
        const blob = [
          c.scorecard_question,
          c.diagnostic_interview_question,
          c.contradiction_check,
          c.failure_pattern,
          c.false_green_trap,
          c.client_safe_explanation,
          c.admin_review_note,
        ]
          .join(" ")
          .toLowerCase();
        // The matrix is interpretation metadata only. It must not assign
        // or imply AI-driven 0-1000 scoring.
        expect(blob).not.toMatch(/\b\d{2,4}\s*(?:point|pt|\/\s*1000)\b/);
        expect(blob).not.toMatch(/ai\s+(?:scored|assigned|graded|determined)/);
      }
    }
  });
});

describe("P93E-E2E — Repair map triggers and contradiction / false-green coverage", () => {
  const REPAIR_TRIGGERS = new Set([
    "capture_missing_signal",
    "standardize_operating_rhythm",
    "tighten_follow_up",
    "tighten_cash_visibility",
    "pricing_margin_review",
    "capacity_review",
    "training_handoff",
    "inventory_control",
    "vendor_review",
    "customer_experience_review",
    "channel_concentration_review",
    "source_of_truth_review",
  ]);

  it("every cell has a known repair-map trigger", () => {
    for (const ind of MATRIX_INDUSTRY_KEYS) {
      for (const gear of MATRIX_GEAR_KEYS) {
        const t = getDiagnosticDepthCell(ind, gear).repair_map_trigger;
        expect(REPAIR_TRIGGERS.has(t), `${ind}.${gear} unknown trigger ${t}`).toBe(true);
      }
    }
  });

  it("every cell has a non-empty contradiction check and false-green trap", () => {
    for (const ind of MATRIX_INDUSTRY_KEYS) {
      for (const gear of MATRIX_GEAR_KEYS) {
        const c = getDiagnosticDepthCell(ind, gear);
        expect(c.contradiction_check.trim().length).toBeGreaterThan(20);
        expect(c.false_green_trap.trim().length).toBeGreaterThan(20);
      }
    }
  });

  it("priority_sequence uses one of the documented stages", () => {
    const allowed = new Set(["foundational", "stabilize", "tighten", "optimize"]);
    for (const ind of MATRIX_INDUSTRY_KEYS) {
      for (const gear of MATRIX_GEAR_KEYS) {
        const p = getDiagnosticDepthCell(ind, gear).priority_sequence;
        expect(allowed.has(p)).toBe(true);
      }
    }
  });
});