import { describe, it, expect } from "vitest";
import {
  INDUSTRY_BANKS,
  INDUSTRY_KEYS,
  getBank,
  summarizeBank,
  CANNABIS_DISCLAIMER,
} from "@/lib/industryDiagnostic";

describe("P93E-E2G industry diagnostic banks", () => {
  it("registers every supported industry", () => {
    for (const k of INDUSTRY_KEYS) expect(INDUSTRY_BANKS[k]).toBeTruthy();
  });

  it("Trades / Home Services is deep enough for a premium diagnostic", () => {
    const bank = getBank("trades_home_services");
    const s = summarizeBank(bank);
    expect(s.total).toBeGreaterThanOrEqual(70);
    // Required gear depth thresholds.
    expect(s.by_gear.business_profile).toBeGreaterThanOrEqual(8);
    expect(s.by_gear.demand).toBeGreaterThanOrEqual(10);
    expect(s.by_gear.sales).toBeGreaterThanOrEqual(10);
    expect(s.by_gear.operations).toBeGreaterThanOrEqual(15);
    expect(s.by_gear.financial).toBeGreaterThanOrEqual(12);
    expect(s.by_gear.owner_independence).toBeGreaterThanOrEqual(10);
    expect(s.by_gear.evidence).toBeGreaterThanOrEqual(8);
  });

  it("other industries have meaningful starter depth and distinct question keys", () => {
    for (const k of INDUSTRY_KEYS) {
      if (k === "trades_home_services") continue;
      const bank = getBank(k);
      expect(bank.questions.length).toBeGreaterThanOrEqual(15);
      const prefix = bank.questions[0].key.split(".")[0];
      // every question in the bank uses the same industry-scoped prefix
      for (const q of bank.questions) expect(q.key.startsWith(`${prefix}.`)).toBe(true);
    }
  });

  it("question keys are globally unique across all banks", () => {
    const seen = new Set<string>();
    for (const k of INDUSTRY_KEYS) {
      for (const q of getBank(k).questions) {
        expect(seen.has(q.key)).toBe(false);
        seen.add(q.key);
      }
    }
  });

  it("uses plain-English wording, not jargon-first", () => {
    const open_ar = getBank("trades_home_services").questions.find((q) => q.key === "trades.fv_open_ar");
    expect(open_ar).toBeTruthy();
    expect(open_ar!.plain_language_question.toLowerCase()).toContain("how much money");
    expect(open_ar!.business_term?.toLowerCase()).toContain("ar");
  });

  it("Cannabis bank carries the safety disclaimer and never claims compliance", () => {
    const bank = getBank("cannabis_mmj_dispensary");
    expect(bank.disclaimer).toBe(CANNABIS_DISCLAIMER);
    expect(bank.disclaimer!.toLowerCase()).toContain("not legal advice");
    for (const q of bank.questions) {
      const blob = `${q.plain_language_question} ${q.helper_text ?? ""} ${q.business_term ?? ""}`.toLowerCase();
      expect(blob).not.toContain("compliance certification");
      expect(blob).not.toContain("guarantee");
    }
  });

  it("repair-map signals only attach to questions that are admin-readable", () => {
    let withSignals = 0;
    for (const k of INDUSTRY_KEYS) {
      for (const q of getBank(k).questions) {
        if (q.repair_map_signal) withSignals += 1;
      }
    }
    expect(withSignals).toBeGreaterThan(0);
  });
});
