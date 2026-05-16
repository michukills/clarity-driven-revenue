// P93E (E1) — Public clarity guard, hardened by P96E.
//
// The original public "Scorecard vs Diagnostic" differentiation section
// has been retired: the Scorecard is no longer a public lead magnet and
// only the deeper Diagnostic is described on the public marketing
// surface. This test now pins that absence so the old block cannot
// silently come back, while still enforcing the surrounding legal-safety
// and outcome-promise hygiene.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const HOME = readFileSync(join(process.cwd(), "src/pages/Index.tsx"), "utf8");

describe("P93E — Scorecard-first public differentiation is retired (P96E)", () => {
  it("the old public Scorecard-vs-Diagnostic differentiation section is gone", () => {
    expect(HOME).not.toContain("Scorecard vs Diagnostic");
    expect(HOME).not.toContain(
      "Where the free Scorecard ends and the paid Diagnostic begins",
    );
    expect(HOME).not.toMatch(/Take the FREE Business Stability Scorecard/);
    expect(HOME).not.toMatch(/Apply for the Diagnostic/);
    expect(HOME).not.toMatch(/to=\{SCORECARD_PATH\}/);
  });

  it("the public surface still describes the deeper Diagnostic", () => {
    expect(HOME).toMatch(/data-testid="diagnostic-value-prop"/);
    expect(HOME).toMatch(/Diagnostic Report/);
    expect(HOME).toMatch(/Priority Repair Map/);
    expect(HOME).toMatch(/to=\{DIAGNOSTIC_APPLY_PATH\}/);
    expect(HOME).toMatch(/to=\{SCAN_PATH\}/);
  });

  it("retains legal-safety language: no outcome promises, no legal/tax/accounting advice", () => {
    expect(HOME).toMatch(/Not legal, tax, accounting/i);
    expect(HOME).toMatch(
      /does not promise revenue, profit, growth, funding, compliance, valuation, or business outcomes/i,
    );
  });

  it("does not promise guaranteed revenue/profit/outcome anywhere on the homepage", () => {
    const banned = [
      /\bguaranteed\s+(revenue|profit|results?|growth|outcome)/i,
      /\brisk[-\s]?free\b/i,
      /\bworth\s+\$?\d/i,
    ];
    for (const rx of banned) {
      expect(HOME, `homepage matched forbidden claim ${rx}`).not.toMatch(rx);
    }
  });
});