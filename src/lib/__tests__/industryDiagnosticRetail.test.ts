/**
 * P93E-E2G-P3B — Retail / Brick-and-Mortar full-depth verification.
 *
 * Locks the Retail bank against the RGS 120/120 live-customer readiness
 * standard: structural depth, evidence prompts, conditional deep dives with
 * trigger wording + valid parent references, retail-specific
 * FindingCalibrations with Repair-Map seeds, no unsafe / generic / overclaim
 * language, admin_only field stripping, and honest maturity status.
 *
 * Other starter industries must remain `starter_bank`.
 */
import { describe, it, expect } from "vitest";
import { RETAIL_BRICK_MORTAR_BANK } from "@/lib/industryDiagnostic/banks/retail";
import { RETAIL_FINDING_CALIBRATIONS } from "@/lib/industryDiagnostic/calibrations/retail";
import {
  auditBank,
  auditCalibration,
  toClientSafeQuestion,
  UNSAFE_PHRASES,
  GENERIC_FINDING_BLOCKLIST,
  REQUIRED_GEARS,
} from "@/lib/industryDiagnostic/depthStandard";
import {
  INDUSTRY_FINDING_CALIBRATIONS,
  INDUSTRY_MATURITY,
  effectivePromptKind,
  summarizeBank,
  FULL_DEPTH_GEAR_MINIMUM,
  FULL_DEPTH_KIND_MINIMUM,
  type IndustryKey,
} from "@/lib/industryDiagnostic";

const RETAIL_TOPICS = [
  "walk", "repeat", "pos", "inventory", "stock", "shrink", "category",
  "sku", "vendor", "discount", "return", "exchange", "coverage", "buying",
  "staff", "cash", "merchandis", "dead stock", "reorder", "margin",
];

describe("P93E-E2G-P3B — Retail full-depth verification", () => {
  const bank = RETAIL_BRICK_MORTAR_BANK;
  const summary = summarizeBank(bank);
  const audit = auditBank(bank);

  it("passes the full-depth audit with zero issues", () => {
    expect(audit.issues, JSON.stringify(audit.issues, null, 2)).toEqual([]);
    expect(audit.meets_full_depth).toBe(true);
  });

  it("declared maturity is full_depth_ready (not over-claimed)", () => {
    expect(INDUSTRY_MATURITY.retail_brick_mortar).toBe("full_depth_ready");
  });

  it("does NOT declare report_ready or live_verified", () => {
    const m = INDUSTRY_MATURITY.retail_brick_mortar;
    expect(m).not.toBe("report_ready");
    expect(m).not.toBe("live_verified");
  });

  it("ships ≥120 total prompts", () => {
    expect(summary.total).toBeGreaterThanOrEqual(120);
  });

  it("ships kind minimums (≥60 core, ≥40 conditional, ≥20 evidence)", () => {
    expect(summary.by_kind.core).toBeGreaterThanOrEqual(FULL_DEPTH_KIND_MINIMUM.core);
    expect(summary.by_kind.conditional_deep_dive).toBeGreaterThanOrEqual(
      FULL_DEPTH_KIND_MINIMUM.conditional_deep_dive,
    );
    expect(summary.by_kind.evidence_source_of_truth).toBeGreaterThanOrEqual(
      FULL_DEPTH_KIND_MINIMUM.evidence_source_of_truth,
    );
  });

  it("meets per-gear minimums on the 5 RGS gears", () => {
    for (const gear of REQUIRED_GEARS) {
      expect(summary.by_gear[gear], gear).toBeGreaterThanOrEqual(FULL_DEPTH_GEAR_MINIMUM[gear]);
    }
  });

  it("every conditional deep dive has trigger_when wording AND a real parent_key", () => {
    const keys = new Set(bank.questions.map((q) => q.key));
    for (const q of bank.questions) {
      if (effectivePromptKind(q) === "conditional_deep_dive") {
        expect(q.trigger_when, q.key).toBeTruthy();
        expect(q.parent_key, q.key).toBeTruthy();
        expect(keys.has(q.parent_key!), `orphan parent for ${q.key}`).toBe(true);
      }
    }
  });

  it("plain_language_question stays script-readable (≤200 chars)", () => {
    for (const q of bank.questions) {
      expect(q.plain_language_question.length, q.key).toBeLessThanOrEqual(200);
      expect(q.plain_language_question.trim().length, q.key).toBeGreaterThan(0);
    }
  });

  it("every evidence prompt is meaningful (≥20 chars of guidance)", () => {
    const evid = bank.questions.filter(
      (q) => effectivePromptKind(q) === "evidence_source_of_truth",
    );
    expect(evid.length).toBeGreaterThanOrEqual(20);
    for (const q of evid) {
      const candidates = [q.source_of_truth_guidance, q.evidence_prompt, q.plain_language_question]
        .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
        .map((s) => s.trim().length);
      const best = Math.max(0, ...candidates);
      expect(best, q.key).toBeGreaterThan(20);
    }
  });

  it("no unsafe phrase appears in any client-visible field", () => {
    for (const q of bank.questions) {
      const blob = [
        q.plain_language_question,
        q.helper_text ?? "",
        q.business_term ?? "",
        q.source_of_truth_guidance ?? "",
        q.evidence_prompt ?? "",
        q.report_finding_seed ?? "",
        q.trigger_when ?? "",
      ].join(" ").toLowerCase();
      for (const phrase of UNSAFE_PHRASES) {
        expect(blob.includes(phrase), `${q.key} contained "${phrase}"`).toBe(false);
      }
    }
  });

  it("toClientSafeQuestion strips admin_only_notes from every prompt", () => {
    for (const q of bank.questions) {
      const safe = toClientSafeQuestion(q) as Record<string, unknown>;
      expect("admin_only_notes" in safe).toBe(false);
    }
  });

  it("admin_interpretation_support prompts exist (messy/contradiction handling)", () => {
    const interp = bank.questions.filter(
      (q) => effectivePromptKind(q) === "admin_interpretation_support",
    );
    expect(interp.length).toBeGreaterThan(0);
  });

  it("ships exactly 15 retail FindingCalibrations", () => {
    expect(RETAIL_FINDING_CALIBRATIONS.length).toBe(15);
    expect(INDUSTRY_FINDING_CALIBRATIONS.retail_brick_mortar.length).toBe(15);
    for (const c of RETAIL_FINDING_CALIBRATIONS) {
      expect(c.industry).toBe("retail_brick_mortar");
    }
  });

  it("calibrations pass auditCalibration and carry Repair-Map triggers + evidence", () => {
    for (const c of RETAIL_FINDING_CALIBRATIONS) {
      const issues = auditCalibration(c);
      expect(issues, `${c.key} -> ${JSON.stringify(issues)}`).toEqual([]);
      expect(c.evidence_supports.length).toBeGreaterThan(0);
      expect(c.evidence_missing_means.length).toBeGreaterThan(20);
      expect(c.repair_map_trigger).toBeTruthy();
    }
  });

  it("calibration titles are not on the generic-findings blocklist", () => {
    for (const c of RETAIL_FINDING_CALIBRATIONS) {
      for (const generic of GENERIC_FINDING_BLOCKLIST) {
        expect(
          c.finding_title.toLowerCase().includes(generic),
          `${c.key} title is generic`,
        ).toBe(false);
      }
    }
  });

  it("Repair-Map trigger seeds are present across the bank", () => {
    const seeds = bank.questions.filter((q) => q.repair_map_trigger_seed && q.repair_map_trigger_seed.length > 0);
    expect(seeds.length).toBeGreaterThan(5);
  });

  it("covers the retail brick-and-mortar operational reality", () => {
    const blob = bank.questions
      .map((q) => `${q.plain_language_question} ${q.helper_text ?? ""} ${q.business_term ?? ""} ${q.section}`)
      .join(" ")
      .toLowerCase();
    const missing = RETAIL_TOPICS.filter((t) => !blob.includes(t));
    expect(missing, `missing retail topics: ${missing.join(", ")}`).toEqual([]);
  });

  it("Cannabis remains starter_bank", () => {
    const starters: IndustryKey[] = [
      "cannabis_mmj_dispensary",
    ];
    for (const k of starters) {
      expect(INDUSTRY_MATURITY[k]).toBe("starter_bank");
      expect(INDUSTRY_FINDING_CALIBRATIONS[k].length).toBe(0);
    }
  });
});