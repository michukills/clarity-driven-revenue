/**
 * IB-H1 — Industry Brain + Gear Metrics hardening plan doc contract.
 *
 * Audit/planning pass only. This test proves the plan doc exists and
 * preserves the non-negotiables: deterministic scoring, admin-reviewed
 * AI, cannabis/MMJ safety, and $1,000/month pricing.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const DOC = resolve(
  process.cwd(),
  "docs/industry-brain-gear-metrics-hardening-plan.md",
);
const text = readFileSync(DOC, "utf8");

describe("IB-H1 hardening plan doc contract", () => {
  it("references IB-H2 through IB-H6", () => {
    for (const tag of ["IB-H2", "IB-H3", "IB-H4", "IB-H5", "IB-H6"]) {
      expect(text).toContain(tag);
    }
  });

  it("preserves deterministic scoring as source of truth", () => {
    expect(text.toLowerCase()).toContain("deterministic");
    expect(text).toMatch(/0[\u2013-]1000/);
  });

  it("preserves admin-reviewed AI rules", () => {
    expect(text.toLowerCase()).toContain("admin-review");
    expect(text.toLowerCase()).toMatch(/backend|edge-only|edge\b/);
  });

  it("preserves cannabis/MMJ dispensary-only safety", () => {
    expect(text.toLowerCase()).toContain("dispensary");
    expect(text.toLowerCase()).toMatch(/no healthcare|not.*healthcare/);
  });

  it("confirms $1,000/month subscription pricing", () => {
    expect(text).toMatch(/\$1,000\s*\/\s*month/);
  });

  it("does not mention $297/month as current pricing", () => {
    // The doc may reference the old number only as historical/forbidden.
    // Forbid any phrasing that frames $297/month as active/current.
    const lowered = text.toLowerCase();
    expect(lowered).not.toMatch(/current[^.]*\$297\s*\/\s*month/);
    expect(lowered).not.toMatch(/\$297\s*\/\s*month[^.]*current/);
  });
});