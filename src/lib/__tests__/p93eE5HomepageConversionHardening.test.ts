import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * P93E-E5 — Public homepage + CTA conversion hardening pin.
 *
 * Pins the strengthened hero, "What RGS is (and isn't)" architect/builder
 * positioning, the explicit Scorecard value-prop block, and the safety
 * scope copy. Existing E1 differentiation pin (Scorecard vs Diagnostic)
 * remains separately enforced and must keep passing alongside this.
 */
const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");
const HOME = read("src/pages/Index.tsx");
const CTA = read("src/lib/cta.ts");

describe("P93E-E5 — homepage hero + CTA hardening", () => {
  // P96C — Funnel correction: Scan is now the primary public CTA; the
  // Scorecard is repositioned as Diagnostic Part 1 (secondary surface).
  it("hero exposes the Diagnostic Part 1 Stability Scorecard eyebrow", () => {
    expect(HOME).toMatch(/data-testid="hero-eyebrow"/);
    expect(HOME).toMatch(/Inside the Diagnostic — Part 1: Free 0–1000 Stability Scorecard/);
    expect(HOME).toMatch(/10–15 min/);
  });

  it("primary hero CTA points to the Operational Friction Scan (P96D)", () => {
    expect(HOME).toMatch(/data-testid="hero-primary-cta"/);
    expect(HOME).toMatch(/to=\{SCAN_PATH\}/);
    expect(CTA).toMatch(/SCAN_CTA_LABEL\s*=\s*"Run the Operational Friction Scan"/);
    // P96D — Scorecard is no longer a public lead magnet. Secondary CTA
    // routes to the deeper Diagnostic application instead.
    expect(HOME).toMatch(/data-testid="hero-secondary-cta"/);
    expect(HOME).toMatch(/DIAGNOSTIC_APPLY_PATH/);
  });

  it("CTA helper copy frames the diagnostic-stage scorecard correctly", () => {
    expect(HOME).toMatch(/data-testid="hero-cta-helper"/);
    expect(CTA).toMatch(/SCORECARD_DIAGNOSTIC_HELPER/);
    expect(CTA).toMatch(/SCORECARD_CTA_HELPER/);
  });

  it("hero subheadline names the architect/structure positioning", () => {
    expect(HOME).toMatch(
      /RGS builds the operating structure owners use to see what is\s+slipping/,
    );
  });

  it("hero score-preview card communicates the 0–1000 / 5-gear payoff visually", () => {
    expect(HOME).toMatch(/data-testid="hero-score-preview"/);
    expect(HOME).toMatch(/Sample Stability Read/);
    expect(HOME).toMatch(/\/ 1000/);
    for (const g of [
      "Demand Generation",
      "Revenue Conversion",
      "Operational Efficiency",
      "Financial Visibility",
      "Owner Independence",
    ]) {
      expect(HOME).toContain(g);
    }
    expect(HOME).toMatch(/Strongest gear/);
    expect(HOME).toMatch(/Most slipping/);
  });

  it("explicit 'What RGS is (and isn't)' positioning section is present", () => {
    expect(HOME).toMatch(/data-testid="what-rgs-is"/);
    expect(HOME).toMatch(/architect for your operating system/);
    expect(HOME).toMatch(/Not a marketing or growth agency/);
    expect(HOME).toMatch(/Not an operator running the business for you/);
    expect(HOME).toMatch(/Not generic coaching/);
    expect(HOME).toMatch(/Not legal, tax, accounting, compliance, or valuation advice/);
    expect(HOME).toMatch(
      /Does not promise revenue, profit, growth, funding, compliance, valuation, or business outcomes/,
    );
  });

  it("Scorecard value-prop block enumerates the deliverables", () => {
    expect(HOME).toMatch(/data-testid="scorecard-value-prop"/);
    expect(HOME).toMatch(/0–1000 Business Stability Score/);
    expect(HOME).toMatch(/Gear-by-gear read/);
    expect(HOME).toMatch(/Strongest gear/);
    expect(HOME).toMatch(/Most slipping gear/);
    expect(HOME).toMatch(/worn-tooth signals/);
    expect(HOME).toMatch(/next-step direction/i);
  });

  it("hero scope/safety copy disclaims legal/tax/accounting and outcome promises", () => {
    expect(HOME).toMatch(
      /directional first-pass systems check based\s+on self-reported answers/,
    );
    expect(HOME).toMatch(
      /does not provide legal,\s+tax, accounting, compliance, or valuation advice/,
    );
    const flat = HOME.replace(/\s+/g, " ");
    expect(flat).toMatch(
      /does not promise revenue, profit, growth, funding, compliance, valuation, or business outcomes/,
    );
  });

  it("offer ladder shows Scorecard → Diagnostic → Implementation → Control System", () => {
    expect(HOME).toMatch(/data-testid="offer-ladder"/);
    expect(HOME).toMatch(/data-testid="offer-ladder-scorecard"/);
    expect(HOME).toMatch(/data-testid="offer-ladder-diagnostic"/);
    expect(HOME).toMatch(/data-testid="offer-ladder-implementation"/);
    expect(HOME).toMatch(/data-testid="offer-ladder-control-system"/);
  });

  it("homepage avoids guaranteed revenue/profit/results phrasing", () => {
    const banned = [
      /\bguaranteed\s+(revenue|profit|results?|growth|outcomes?)/i,
      /\brisk[-\s]?free\b/i,
      /\b(double|triple)\s+your\s+revenue\b/i,
    ];
    for (const rx of banned) {
      expect(HOME, `homepage matched forbidden claim ${rx}`).not.toMatch(rx);
    }
  });
});