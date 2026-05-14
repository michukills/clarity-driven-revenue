/**
 * P93E-E2G-P6 — Cannabis / MMJ Dispensary Operations full-depth verification.
 *
 * Locks the Cannabis bank against the RGS 120/120 live-customer readiness
 * standard PLUS Cannabis-specific safety constraints: required disclaimer,
 * no compliance certification language, no legal/tax/accounting/healthcare
 * /patient-care/product-medical/fiduciary advice, 280E references stay
 * CPA-coordinated visibility only, and METRC/BioTrack/seed-to-sale
 * references stay operational/documentation-process visibility only.
 */
import { describe, it, expect } from "vitest";
import { CANNABIS_MMJ_DISPENSARY_BANK } from "@/lib/industryDiagnostic/banks/cannabis";
import { CANNABIS_FINDING_CALIBRATIONS } from "@/lib/industryDiagnostic/calibrations/cannabis";
import {
  auditBank,
  auditCalibration,
  toClientSafeQuestion,
  UNSAFE_PHRASES,
  GENERIC_FINDING_BLOCKLIST,
  REQUIRED_GEARS,
} from "@/lib/industryDiagnostic/depthStandard";
import {
  CANNABIS_DISCLAIMER,
  INDUSTRY_FINDING_CALIBRATIONS,
  INDUSTRY_MATURITY,
  effectivePromptKind,
  summarizeBank,
  FULL_DEPTH_GEAR_MINIMUM,
  FULL_DEPTH_KIND_MINIMUM,
} from "@/lib/industryDiagnostic";

// Cannabis-specific unsafe terms beyond the global UNSAFE_PHRASES list.
const CANNABIS_UNSAFE_EXTRA = [
  "compliance certification",
  "compliance approved",
  "compliance pass",
  "legally compliant",
  "regulatory approval",
  "regulatory assurance",
  "certified compliant",
  "rgs certifies",
  "rgs guarantees",
  "guaranteed compliance",
  "healthcare advice",
  "patient-care advice",
  "patient care advice",
  "medical advice",
  "product-medical advice",
  "fiduciary advice",
  "employment-law advice",
  "platform policy advice",
  "guaranteed sales",
  "guaranteed margin",
  "guaranteed roi",
  "proven to increase sales",
  "accounting-approved",
];

const CANNABIS_TOPICS = [
  "metrc", "biotrack", "seed-to-sale", "manifest", "reconcil", "discrepancy",
  "stop-sell", "waste", "quarantine", "tag", "menu", "pos", "drawer", "safe",
  "deposit", "visitor", "badge", "training", "camera", "security",
  "inventory", "vendor", "loyalty", "budtender", "purchase limit",
  "dutchie", "weedmaps", "leafly", "280e", "cogs", "cpa",
];

describe("P93E-E2G-P6 — Cannabis / MMJ full-depth verification", () => {
  const bank = CANNABIS_MMJ_DISPENSARY_BANK;
  const summary = summarizeBank(bank);
  const audit = auditBank(bank);

  it("passes the full-depth audit with zero issues", () => {
    expect(audit.issues, JSON.stringify(audit.issues, null, 2)).toEqual([]);
    expect(audit.meets_full_depth).toBe(true);
  });

  it("declared maturity is full_depth_ready (not over-claimed)", () => {
    expect(INDUSTRY_MATURITY.cannabis_mmj_dispensary).toBe("full_depth_ready");
  });

  it("does NOT declare report_ready or live_verified", () => {
    const m = INDUSTRY_MATURITY.cannabis_mmj_dispensary;
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

  it("every conditional deep dive has trigger_when AND a real parent_key", () => {
    const keys = new Set(bank.questions.map((q) => q.key));
    for (const q of bank.questions) {
      if (effectivePromptKind(q) === "conditional_deep_dive") {
        expect(q.trigger_when, q.key).toBeTruthy();
        expect(q.parent_key, q.key).toBeTruthy();
        expect(keys.has(q.parent_key!), `orphan parent for ${q.key}`).toBe(true);
      }
    }
  });

  it("plain_language_question is script-readable (≤200 chars)", () => {
    for (const q of bank.questions) {
      expect(q.plain_language_question.length, q.key).toBeLessThanOrEqual(200);
      expect(q.plain_language_question.trim().length, q.key).toBeGreaterThan(0);
    }
  });

  it("every evidence prompt has meaningful guidance (≥20 chars)", () => {
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

  it("required disclaimer remains enforced", () => {
    expect(bank.disclaimer).toBe(CANNABIS_DISCLAIMER);
    expect(bank.disclaimer!.toLowerCase()).toContain("not legal advice");
    expect(bank.disclaimer!.toLowerCase()).toContain("documentation-readiness");
  });

  it("no unsafe phrase appears in any client-visible field", () => {
    const allUnsafe = [...UNSAFE_PHRASES, ...CANNABIS_UNSAFE_EXTRA];
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
      for (const phrase of allUnsafe) {
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

  it("admin_interpretation_support prompts exist for messy-answer handling", () => {
    const interp = bank.questions.filter(
      (q) => effectivePromptKind(q) === "admin_interpretation_support",
    );
    expect(interp.length).toBeGreaterThanOrEqual(5);
  });

  it("ships exactly 16 Cannabis FindingCalibrations", () => {
    expect(CANNABIS_FINDING_CALIBRATIONS.length).toBe(16);
    expect(INDUSTRY_FINDING_CALIBRATIONS.cannabis_mmj_dispensary.length).toBe(16);
    for (const c of CANNABIS_FINDING_CALIBRATIONS) {
      expect(c.industry).toBe("cannabis_mmj_dispensary");
    }
  });

  it("calibrations pass auditCalibration and carry Repair-Map triggers + evidence", () => {
    for (const c of CANNABIS_FINDING_CALIBRATIONS) {
      const issues = auditCalibration(c);
      expect(issues, `${c.key} -> ${JSON.stringify(issues)}`).toEqual([]);
      expect(c.evidence_supports.length).toBeGreaterThan(0);
      expect(c.evidence_missing_means.length).toBeGreaterThan(20);
      expect(c.repair_map_trigger).toBeTruthy();
    }
  });

  it("calibration titles are not on the generic-findings blocklist", () => {
    for (const c of CANNABIS_FINDING_CALIBRATIONS) {
      for (const generic of GENERIC_FINDING_BLOCKLIST) {
        expect(
          c.finding_title.toLowerCase().includes(generic),
          `${c.key} title is generic`,
        ).toBe(false);
      }
    }
  });

  it("calibration client_safe_explanation never claims compliance certification", () => {
    for (const c of CANNABIS_FINDING_CALIBRATIONS) {
      const blob = [c.finding_title, c.client_safe_explanation, c.why_it_matters].join(" ").toLowerCase();
      for (const phrase of CANNABIS_UNSAFE_EXTRA) {
        expect(blob.includes(phrase), `${c.key} contained "${phrase}"`).toBe(false);
      }
    }
  });

  it("Repair-Map trigger seeds are present across the bank", () => {
    const seeds = bank.questions.filter(
      (q) => q.repair_map_trigger_seed && q.repair_map_trigger_seed.length > 0,
    );
    expect(seeds.length).toBeGreaterThanOrEqual(8);
  });

  it("report-finding seeds are specific (not generic platitudes)", () => {
    const seeds = bank.questions
      .map((q) => q.report_finding_seed)
      .filter((s): s is string => typeof s === "string" && s.length > 0);
    expect(seeds.length).toBeGreaterThanOrEqual(8);
    for (const s of seeds) {
      for (const generic of GENERIC_FINDING_BLOCKLIST) {
        expect(s.toLowerCase().includes(generic), `seed "${s}" is generic`).toBe(false);
      }
    }
  });

  it("covers cannabis-specific operational reality (METRC, seed-to-sale, etc.)", () => {
    const blob = bank.questions
      .map((q) => `${q.plain_language_question} ${q.helper_text ?? ""} ${q.business_term ?? ""} ${q.section}`)
      .join(" ")
      .toLowerCase();
    const missing = CANNABIS_TOPICS.filter((t) => !blob.includes(t));
    expect(missing, `missing topics: ${missing.join(", ")}`).toEqual([]);
  });

  it("280E references are CPA/tax-professional coordinated only (not advice)", () => {
    const blob = bank.questions
      .map((q) => `${q.plain_language_question} ${q.business_term ?? ""} ${q.helper_text ?? ""}`)
      .join(" ")
      .toLowerCase();
    // 280E may appear, but never as advice or guidance about treatment
    if (blob.includes("280e")) {
      expect(blob).not.toContain("280e advice");
      expect(blob).not.toContain("280e treatment");
      expect(blob).not.toContain("280e strategy");
      // Must be framed alongside CPA coordination
      expect(blob).toContain("cpa");
    }
  });

  it("METRC / BioTrack / seed-to-sale references stay operational-process only", () => {
    const blob = bank.questions
      .map((q) => `${q.plain_language_question} ${q.business_term ?? ""} ${q.evidence_prompt ?? ""}`)
      .join(" ")
      .toLowerCase();
    // No claim that METRC/BioTrack export means compliance
    expect(blob).not.toContain("metrc compliance");
    expect(blob).not.toContain("biotrack compliance");
    expect(blob).not.toContain("compliant via metrc");
    expect(blob).not.toContain("regulatory compliance");
  });
});
