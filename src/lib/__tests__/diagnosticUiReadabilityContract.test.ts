import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { FACTOR_PROMPTS } from "@/lib/diagnostics/factorPrompts";

/**
 * P41.5 — Readability/layout contract tests.
 *
 * - Diagnostic textareas must use a short, generic placeholder.
 * - Long instructional copy (question + helper) must be rendered OUTSIDE the
 *   textarea, not stuffed into the placeholder where it will be clipped.
 * - Report summary cards must use a responsive auto-fit grid so labels do not
 *   collapse into one-letter-per-line when widths get tight.
 */
describe("P41.5 diagnostic UI readability", () => {
  const root = join(process.cwd(), "src");

  it("FactorScorer textarea uses a short generic placeholder", () => {
    const src = readFileSync(join(root, "components/diagnostics/FactorScorer.tsx"), "utf8");
    expect(src).toMatch(/placeholder=\{"Type your answer here\. \\"I don't know\\" is valid\."\}/);
    // Must not pipe long prompt copy back into the placeholder.
    expect(src).not.toMatch(/placeholder=\{prompt\.placeholder\}/);
  });

  it("SeverityRow textarea uses a short generic placeholder", () => {
    const src = readFileSync(join(root, "components/diagnostics/SeverityRow.tsx"), "utf8");
    expect(src).toMatch(/placeholder=\{"Type your answer here\. \\"I don't know\\" is valid\."\}/);
    expect(src).not.toMatch(/placeholder=\{prompt\.placeholder\}/);
  });

  it("DiagnosticReport summary uses an auto-fit responsive grid (no rigid 3-col)", () => {
    const src = readFileSync(join(root, "components/diagnostics/DiagnosticReport.tsx"), "utf8");
    expect(src).toMatch(/auto-fit, minmax\(220px, 1fr\)/);
    // No truncate on the top-issues list — long category labels must be allowed to wrap.
    expect(src).not.toMatch(/className="truncate" title=\{c\.label\}/);
  });

  it("Factor prompt registry helpers stay non-trivial; placeholders remain available for reference but unused inline", () => {
    for (const [key, p] of Object.entries(FACTOR_PROMPTS)) {
      expect(p.question.trim().length, `question for ${key}`).toBeGreaterThan(10);
      expect(p.helper.trim().length, `helper for ${key}`).toBeGreaterThan(10);
    }
  });
});