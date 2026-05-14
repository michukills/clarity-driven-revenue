/**
 * P93H-E — CustomerDetail stability tab panel polish.
 *
 * Source-level contract guards (no rendering). They lock the stability tab
 * shell wrappers added so each panel renders inside an overflow-safe,
 * break-words container, and so cadence / monthly-close share a responsive
 * two-up grid with `items-start`.
 *
 * The nine stability panels themselves continue to be covered by their own
 * dedicated tests; this file only covers the stability-tab wrapper deltas.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const FILE = "src/pages/admin/CustomerDetail.tsx";
const src = readFileSync(join(process.cwd(), FILE), "utf8");

describe("P93H-E — CustomerDetail stability tab uses overflow-safe wrappers", () => {
  it("Stability tab shell wrapper exists with min-w-0 + break-words", () => {
    expect(src).toMatch(/data-testid="stability-tab-shell"/);
    expect(src).toMatch(/flex flex-col gap-6 min-w-0 w-full break-words/);
  });

  it.each([
    ["stability-panel-score", "AdminStabilityScorePanel"],
    ["stability-panel-rescore", "AutoStabilityRescorePanel"],
    ["stability-panel-learning", "LearningControlsCard"],
    ["stability-panel-cadence", "CadenceCompliancePanel"],
    ["stability-panel-monthly-close", "MonthlyClosePanel"],
    ["stability-panel-cash", "CashPositionObligationsPanel"],
    ["stability-panel-guidance", "SuggestedGuidancePanel"],
    ["stability-panel-insights", "InsightSignalsPanel"],
    ["stability-panel-recommendations", "AdminRecommendationsPanel"],
  ])("Panel wrapper %s uses min-w-0 break-words and renders %s", (testid, comp) => {
    const re = new RegExp(
      `data-testid="${testid}"[^>]*className="min-w-0 break-words"[\\s\\S]{0,200}<${comp}\\b`,
    );
    expect(src).toMatch(re);
  });

  it("Cadence + monthly close share a responsive two-up grid with items-start", () => {
    expect(src).toMatch(
      /grid grid-cols-1 xl:grid-cols-2 gap-6 items-start min-w-0/,
    );
  });

  it("Stability tab still renders all nine panels in order", () => {
    const order = [
      "AdminStabilityScorePanel",
      "AutoStabilityRescorePanel",
      "LearningControlsCard",
      "CadenceCompliancePanel",
      "MonthlyClosePanel",
      "CashPositionObligationsPanel",
      "SuggestedGuidancePanel",
      "InsightSignalsPanel",
      "AdminRecommendationsPanel",
    ];
    const stabilitySection = src.split('value="stability"')[1]?.split("</TabsContent>")[0] ?? "";
    let cursor = 0;
    for (const name of order) {
      const idx = stabilitySection.indexOf(`<${name}`, cursor);
      expect(idx, `Expected ${name} after position ${cursor}`).toBeGreaterThanOrEqual(0);
      cursor = idx + name.length;
    }
  });

  it("Stability tab does not introduce admin-only note leakage helpers", () => {
    const stabilitySection = src.split('value="stability"')[1]?.split("</TabsContent>")[0] ?? "";
    expect(stabilitySection).not.toMatch(/admin[_-]?note/i);
    expect(stabilitySection).not.toMatch(/internal[_-]?note/i);
  });
});

describe("P93H-E — Stability tab does not introduce frontend secrets", () => {
  it("No hardcoded API keys or service-role tokens in CustomerDetail stability tab", () => {
    const stabilitySection = src.split('value="stability"')[1]?.split("</TabsContent>")[0] ?? "";
    expect(stabilitySection).not.toMatch(/sk_live_|sk_test_|service_role|SUPABASE_SERVICE_ROLE/);
  });
});