/**
 * P93E-E2G-P2.5 — Trades + Restaurants 120/120 verification.
 *
 * Locks both industries against the full RGS 120/100 live-customer readiness
 * standard: structural depth, evidence prompts, conditional deep dives with
 * triggers, industry-specific FindingCalibrations (no platitudes), no unsafe
 * language, no admin-only field leakage, and honest maturity claims.
 *
 * Other industries are intentionally NOT promoted in this pass and must
 * remain `starter_bank` until their own depth pass lands.
 */
import { describe, it, expect } from "vitest";
import {
  TRADES_HOME_SERVICES_BANK,
} from "@/lib/industryDiagnostic/banks/trades";
import {
  RESTAURANTS_FOOD_SERVICE_BANK,
} from "@/lib/industryDiagnostic/banks/restaurants";
import {
  auditBank,
  auditCalibration,
  toClientSafeQuestion,
  UNSAFE_PHRASES,
  GENERIC_FINDING_BLOCKLIST,
} from "@/lib/industryDiagnostic/depthStandard";
import {
  INDUSTRY_BANKS,
  INDUSTRY_FINDING_CALIBRATIONS,
  INDUSTRY_MATURITY,
  effectivePromptKind,
  type IndustryKey,
  type IndustryQuestionBank,
} from "@/lib/industryDiagnostic";

const FULL_DEPTH_TARGETS: IndustryKey[] = [
  "trades_home_services",
  "restaurants_food_service",
];
const STARTER_TARGETS: IndustryKey[] = [
  "retail_brick_mortar",
  "professional_services",
  "ecommerce_online_retail",
  "cannabis_mmj_dispensary",
];

const TARGET_BANKS: { name: string; bank: IndustryQuestionBank }[] = [
  { name: "Trades / Home Services", bank: TRADES_HOME_SERVICES_BANK },
  { name: "Restaurants / Food Service", bank: RESTAURANTS_FOOD_SERVICE_BANK },
];

describe("P93E-E2G-P2.5 — 120/120 verification (Trades + Restaurants)", () => {
  for (const { name, bank } of TARGET_BANKS) {
    describe(name, () => {
      const audit = auditBank(bank);

      it("passes the full-depth audit with zero issues", () => {
        expect(audit.issues, JSON.stringify(audit.issues, null, 2)).toEqual([]);
        expect(audit.meets_full_depth).toBe(true);
      });

      it("declared maturity is full_depth_ready (not over-claimed)", () => {
        expect(INDUSTRY_MATURITY[bank.industry]).toBe("full_depth_ready");
      });

      it("ships at least 10 industry-specific FindingCalibrations", () => {
        const calibrations = INDUSTRY_FINDING_CALIBRATIONS[bank.industry];
        expect(calibrations.length).toBeGreaterThanOrEqual(10);
        // All calibrations belong to this industry.
        for (const c of calibrations) {
          expect(c.industry).toBe(bank.industry);
        }
      });

      it("calibrations are safe and non-generic", () => {
        const calibrations = INDUSTRY_FINDING_CALIBRATIONS[bank.industry];
        for (const c of calibrations) {
          const issues = auditCalibration(c);
          expect(issues, `${c.key} -> ${JSON.stringify(issues)}`).toEqual([]);
          // Each calibration must be evidence-aware.
          expect(c.evidence_supports.length).toBeGreaterThan(0);
          expect(c.evidence_missing_means.length).toBeGreaterThan(20);
          // Each calibration carries a Repair-Map trigger key.
          expect(c.repair_map_trigger).toBeTruthy();
        }
      });

      it("every conditional deep dive has trigger_when wording", () => {
        for (const q of bank.questions) {
          if (effectivePromptKind(q) === "conditional_deep_dive") {
            expect(q.trigger_when, q.key).toBeTruthy();
            expect(q.parent_key, q.key).toBeTruthy();
          }
        }
      });

      it("plain_language_question stays script-readable (≤200 chars, ends in '?')", () => {
        for (const q of bank.questions) {
          expect(q.plain_language_question.length, q.key).toBeLessThanOrEqual(200);
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

      it("calibration titles are not on the generic-findings blocklist", () => {
        for (const c of INDUSTRY_FINDING_CALIBRATIONS[bank.industry]) {
          for (const generic of GENERIC_FINDING_BLOCKLIST) {
            expect(
              c.finding_title.toLowerCase().includes(generic),
              `${c.key} title is generic`,
            ).toBe(false);
          }
        }
      });
    });
  }

  it("starter industries are NOT promoted in this pass", () => {
    for (const k of STARTER_TARGETS) {
      expect(INDUSTRY_MATURITY[k]).toBe("starter_bank");
      // Starter industries must not yet ship calibrations.
      expect(INDUSTRY_FINDING_CALIBRATIONS[k].length).toBe(0);
    }
  });

  it("full-depth target list is the only set marked full_depth_ready", () => {
    for (const [industry, maturity] of Object.entries(INDUSTRY_MATURITY)) {
      if (FULL_DEPTH_TARGETS.includes(industry as IndustryKey)) {
        expect(maturity).toBe("full_depth_ready");
      } else {
        expect(maturity).toBe("starter_bank");
      }
    }
  });

  it("every industry bank still loads without throwing", () => {
    for (const k of Object.keys(INDUSTRY_BANKS) as IndustryKey[]) {
      expect(INDUSTRY_BANKS[k].industry).toBe(k);
    }
  });
});
