// P93E (E1) — Public clarity guard.
//
// A cold visitor on `/` must be able to tell the free Scorecard apart from
// the paid Diagnostic without reading the whole page. The differentiation
// section on the homepage is the load-bearing surface for that. This test
// pins the section copy and the two outbound CTAs so a future edit can't
// quietly remove or weaken it.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const HOME = readFileSync(join(process.cwd(), "src/pages/Index.tsx"), "utf8");

describe("P93E — Scorecard vs Diagnostic differentiation on homepage", () => {
  it("renders the differentiation eyebrow and headline", () => {
    expect(HOME).toContain("Scorecard vs Diagnostic");
    expect(HOME).toContain(
      "Where the free Scorecard ends and the paid Diagnostic begins",
    );
  });

  it("describes the free Scorecard as a first-pass, self-reported tool", () => {
    expect(HOME).toMatch(/Free\s*·\s*10–15 minutes/);
    expect(HOME).toMatch(/first-pass/i);
    expect(HOME).toMatch(/self-reported/i);
    expect(HOME).toMatch(/0–1000 Business Stability Score/);
  });

  it("describes the paid Diagnostic as deeper, evidence-supported, admin-reviewed", () => {
    expect(HOME).toMatch(/Paid\s*·\s*deeper inspection/);
    expect(HOME).toMatch(/evidence-supported/i);
    expect(HOME).toMatch(/[Aa]dmin (review|interpretation)/);
    expect(HOME).toMatch(/repair sequencing/i);
  });

  it("includes legal-safety language: no guarantees, not legal/tax/accounting advice", () => {
    expect(HOME).toMatch(/Not legal, tax, accounting/i);
    expect(HOME).toMatch(/No revenue or outcome guarantees/i);
  });

  it("links the free column to /scorecard and the paid column to the diagnostic apply path", () => {
    expect(HOME).toMatch(/Take the free 0–1000 Scorecard/);
    expect(HOME).toMatch(/Apply for the Diagnostic/);
    // SCORECARD_PATH and DIAGNOSTIC_APPLY_PATH are imported from @/lib/cta
    expect(HOME).toMatch(/to=\{SCORECARD_PATH\}/);
    expect(HOME).toMatch(/to=\{DIAGNOSTIC_APPLY_PATH\}/);
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