/**
 * AI Assistant / RGS Brain Customer-Facing QA pass — prompt voice contract.
 *
 * Reads the system-prompt strings out of every customer-facing AI edge
 * function and asserts the finalized RGS/Matt voice + behavior rules are
 * present. This is intentionally lightweight: it does not call the AI
 * gateway, doesn't change scoring, and just keeps the prompts honest if
 * a future edit drifts.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function read(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), "utf8");
}

const FIVE_GEAR_NAMES = [
  "Demand Generation",
  "Revenue Conversion",
  "Operational Efficiency",
  "Financial Visibility",
  "Owner Independence",
];

const BANNED_INSTRUCTION_FILLER = [
  "unlock",
  "supercharge",
  "actionable insights",
  "next level",
  "growth hacks",
  "crush it",
];

describe("AI prompt voice contract — customer-facing surfaces", () => {
  describe("diagnostic-ai-followup", () => {
    const src = read("supabase/functions/diagnostic-ai-followup/index.ts");

    it("forbids advice/recommendations and reveals no internal scoring", () => {
      expect(src).toMatch(/MUST NOT give advice/i);
      expect(src).toMatch(/MUST NOT mention or imply any internal scoring/i);
    });

    it("preserves licensed-professional boundary", () => {
      expect(src).toMatch(/legal, tax, accounting, HR, or compliance/i);
    });

    it("uses the official five-gear names exactly", () => {
      for (const g of FIVE_GEAR_NAMES) expect(src).toContain(g);
    });

    it("treats the Scorecard as a self-reported starting read", () => {
      expect(src).toMatch(/self-reported starting read/i);
      expect(src).toMatch(/not a final diagnosis/i);
    });

    it("preserves scope-lock language (RGS can only diagnose what it can see)", () => {
      expect(src).toMatch(/RGS can only diagnose what it can see/i);
    });
  });

  describe("report-ai-assist", () => {
    const src = read("supabase/functions/report-ai-assist/index.ts");

    it("uses the four evidence levels exactly", () => {
      expect(src).toContain("Observed");
      expect(src).toContain("Indicated");
      expect(src).toContain("Possible");
      expect(src).toContain("Insufficient Data");
    });

    it("uses the official five-gear names exactly", () => {
      for (const g of FIVE_GEAR_NAMES) expect(src).toContain(g);
    });

    it("uses the official five score band names exactly", () => {
      expect(src).toContain("Critical Instability");
      expect(src).toContain("High Risk / Reactive");
      expect(src).toContain("Functional but Fragile");
      expect(src).toContain("Stable with Repair Areas");
      expect(src).toContain("Strong Operating Stability");
    });

    it("preserves decision-rights + owner-final-authority language", () => {
      expect(src).toMatch(/owner keeps final decision authority/i);
      expect(src).toMatch(/separate the FINDING from the DECISION/i);
    });

    it("forbids legal/tax/accounting/HR/compliance advice", () => {
      expect(src).toMatch(/legal, tax, accounting, HR/i);
    });

    it("forbids fake certainty and guaranteed outcomes", () => {
      expect(src).toMatch(/this proves|this guarantees|this will fix/i);
      expect(src).toMatch(/No guaranteed outcomes/i);
    });

    it("keeps every AI-generated section admin-only by default", () => {
      expect(src).toMatch(/Keep all client_safe flags false/i);
      expect(src).toMatch(/client_safe: false/);
    });
  });

  describe("admin-only seed prompts (customer-safe summaries leak to portal)", () => {
    const journey = read("supabase/functions/journey-ai-seed/index.ts");
    const persona = read("supabase/functions/persona-ai-seed/index.ts");
    const process = read("supabase/functions/process-ai-seed/index.ts");

    it.each([
      ["journey", journey],
      ["persona", persona],
      ["process", process],
    ])("%s seed names the official five gears exactly", (_label, src) => {
      for (const g of FIVE_GEAR_NAMES) expect(src).toContain(g);
    });

    it.each([
      ["journey", journey],
      ["persona", persona],
      ["process", process],
    ])("%s seed forbids licensed advice for customer-safe copy", (_label, src) => {
      expect(src).toMatch(/legal, tax, accounting, HR/i);
    });

    it.each([
      ["journey", journey],
      ["persona", persona],
      ["process", process],
    ])(
      "%s seed bans hype filler in instruction list",
      (_label, src) => {
        // The prompt must list these as banned for customer-safe text.
        for (const phrase of BANNED_INSTRUCTION_FILLER) {
          expect(src.toLowerCase()).toContain(phrase.toLowerCase());
        }
      },
    );

    it("cannabis / MMJ / MMC framing is treated as dispensary, not healthcare", () => {
      for (const src of [journey, persona, process]) {
        expect(src).toMatch(/cannabis.*dispensary|dispensary.*not healthcare/i);
      }
    });
  });
});