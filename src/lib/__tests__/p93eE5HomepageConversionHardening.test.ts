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
  // P96E — Hero hardening. The Scorecard is now an internal diagnostic
  // instrument and is no longer the public emotional anchor. The eyebrow
  // pill positions RGS as Operational Intelligence; no scorecard chip,
  // no "Part 1/Part 2" exposure, no "Free 0–1000 Stability Scorecard"
  // marketing surface on the hero.
  it("hero positions RGS as operational intelligence — no public scorecard chip (P96E)", () => {
    expect(HOME).toMatch(/data-testid="hero-eyebrow"/);
    expect(HOME).toMatch(/Operational Intelligence for Owner-Led Businesses/);
    // Old scorecard-first hero framing must not return.
    expect(HOME).not.toMatch(/data-testid="hero-diagnostic-pill"/);
    expect(HOME).not.toMatch(/Inside the Diagnostic — Structured Stability Assessment/);
    expect(HOME).not.toMatch(/Inside the Diagnostic — Part 1: Free 0–1000 Stability Scorecard/);
    expect(HOME).not.toMatch(/Free 0–1000 Stability Scorecard/);
    expect(HOME).not.toMatch(/Take the FREE Business Stability Scorecard/);
  });

  it("primary hero CTA points to the Operational Friction Scan (P96D/P96E)", () => {
    expect(HOME).toMatch(/data-testid="hero-primary-cta"/);
    expect(HOME).toMatch(/to=\{SCAN_PATH\}/);
    expect(CTA).toMatch(/SCAN_CTA_LABEL\s*=\s*"Run the Operational Friction Scan"/);
    // P96D — Scorecard is no longer a public lead magnet. Secondary CTA
    // routes to the deeper Diagnostic application instead.
    expect(HOME).toMatch(/data-testid="hero-secondary-cta"/);
    expect(HOME).toMatch(/DIAGNOSTIC_APPLY_PATH/);
    // No public Scorecard CTA in the hero.
    expect(HOME).not.toMatch(/to=\{SCORECARD_PATH\}/);
  });

  it("CTA helper copy frames the deeper Diagnostic — not the Scorecard (P96E)", () => {
    expect(HOME).toMatch(/data-testid="hero-cta-helper"/);
    // Scorecard helper constants remain in cta.ts (internal/diagnostic
    // surfaces), but the public hero helper no longer leans on them.
    expect(HOME).not.toMatch(/SCORECARD_DIAGNOSTIC_HELPER/);
    expect(HOME).not.toMatch(/SCORECARD_CTA_HELPER/);
    expect(HOME).toMatch(/Diagnostic Report and Priority Repair Map/);
  });

  it("hero subheadline names the architect/structure positioning", () => {
    expect(HOME).toMatch(
      /RGS builds the operating structure owners use to see what is\s+slipping/,
    );
  });

  it("hero operational-visibility panel communicates system pressure (P96E)", () => {
    expect(HOME).toMatch(/data-testid="hero-operational-visibility"/);
    expect(HOME).toMatch(/What RGS Sees/);
    expect(HOME).toMatch(/System pressure building upstream/);
    expect(HOME).toMatch(/Upstream bottleneck/);
    expect(HOME).toMatch(/Downstream strain/);
    for (const g of [
      "Demand Generation",
      "Revenue Conversion",
      "Operational Efficiency",
      "Financial Visibility",
      "Owner Independence",
    ]) {
      expect(HOME).toContain(g);
    }
    // The hero must NOT visually center the scorecard anymore.
    expect(HOME).not.toMatch(/data-testid="hero-score-preview"/);
    expect(HOME).not.toMatch(/Sample Stability Read/);
    expect(HOME).not.toMatch(/Business Stability Score \(illustrative\)/);
    // Numeric "612 / 1000" hero anchor is gone.
    const flat = HOME.replace(/\s+/g, " ");
    expect(flat).not.toMatch(/>\s*612\s*</);
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

  it("public homepage no longer ships a Scorecard value-prop block (P96E)", () => {
    // The public Scorecard-first value-prop block was retired. The deeper
    // Diagnostic value-prop now carries the deliverables narrative on the
    // public surface; the Scorecard remains a protected internal tool.
    expect(HOME).not.toMatch(/data-testid="scorecard-value-prop"/);
    expect(HOME).toMatch(/data-testid="diagnostic-value-prop"/);
    expect(HOME).toMatch(/Diagnostic Report/);
    expect(HOME).toMatch(/Priority Repair Map/);
    expect(HOME).toMatch(/worn-tooth signals/i);
    // No public "0–1000" marketing language on the hero/offer ladder.
    expect(HOME).not.toMatch(/0–1000 Business Stability Score/);
  });

  it("hero scope/safety copy disclaims legal/tax/accounting and outcome promises", () => {
    expect(HOME).toMatch(
      /does not provide legal,\s+tax, accounting, compliance, or valuation advice/,
    );
    const flat = HOME.replace(/\s+/g, " ");
    expect(flat).toMatch(
      /does not promise revenue, profit, growth, funding, compliance, valuation, or business outcomes/,
    );
  });

  it("offer ladder is Scan → Diagnostic → Implementation → Control System (P96E)", () => {
    expect(HOME).toMatch(/data-testid="offer-ladder"/);
    expect(HOME).toMatch(/data-testid="offer-ladder-scan"/);
    expect(HOME).toMatch(/data-testid="offer-ladder-diagnostic"/);
    expect(HOME).toMatch(/data-testid="offer-ladder-implementation"/);
    expect(HOME).toMatch(/data-testid="offer-ladder-control-system"/);
    expect(HOME).not.toMatch(/data-testid="offer-ladder-scorecard"/);
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