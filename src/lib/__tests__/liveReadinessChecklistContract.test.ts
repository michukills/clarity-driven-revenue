import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

/**
 * P46.2 — Live readiness + first-client smoke test docs contract.
 *
 * Static guarantees that the launch-readiness documentation exists, covers
 * the required manual blockers, and contains no destructive SQL or
 * instructions to delete the RGS / admin owner account.
 */

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

const READINESS = "docs/live-readiness-checklist.md";
const SMOKE = "docs/first-client-smoke-test.md";

describe("P46.2 — live readiness + first client smoke docs", () => {
  it("both docs exist", () => {
    expect(existsSync(join(root, READINESS))).toBe(true);
    expect(existsSync(join(root, SMOKE))).toBe(true);
  });

  it("readiness checklist covers all required sections A–K", () => {
    const doc = read(READINESS);
    for (const heading of [
      "Public site readiness",
      "Domain / DNS / hosting",
      "Legal / scope pages",
      "Stripe / payment readiness",
      "Email / notifications readiness",
      "Account / invite readiness",
      "Diagnostic journey readiness",
      "Admin readiness",
      "Report / repair map readiness",
      "RGS Control System / connector truth-source readiness",
      "Manual launch blockers",
    ]) {
      expect(doc).toContain(heading);
    }
  });

  it("readiness checklist names the manual launch blockers explicitly", () => {
    const doc = read(READINESS);
    expect(doc).toMatch(/[Aa]ttorney review/);
    expect(doc).toMatch(/Stripe/);
    expect(doc).toMatch(/[Ee]mail deliverability/);
    expect(doc).toMatch(/DNS/);
  });

  it("readiness checklist forbids deleting the RGS/admin owner account", () => {
    const doc = read(READINESS);
    expect(doc).toMatch(/[Nn]ever delete the (real )?RGS ?\/ ?admin( owner)? account/);
  });

  it("future cleanup section is documented as not executed", () => {
    const doc = read(READINESS);
    expect(doc).toMatch(/Future demo account and cleanup pass/);
    expect(doc).toMatch(/not executed in P46\.2/);
  });

  it("docs contain no destructive SQL or account-deletion instructions", () => {
    for (const p of [READINESS, SMOKE]) {
      const doc = read(p);
      expect(doc).not.toMatch(/DROP\s+TABLE/i);
      expect(doc).not.toMatch(/TRUNCATE\s+/i);
      expect(doc).not.toMatch(/DELETE\s+FROM\s+auth\.users/i);
      expect(doc).not.toMatch(/auth\.admin\.deleteUser/);
    }
  });

  it("first-client smoke test covers the six required paths", () => {
    const doc = read(SMOKE);
    expect(doc).toMatch(/Path 1 — Public visitor/);
    expect(doc).toMatch(/Path 2 — Paid diagnostic client/);
    expect(doc).toMatch(/Path 3 — Admin review/);
    expect(doc).toMatch(/Path 4 — Client report/);
    expect(doc).toMatch(/Path 5 — Access \/ security checks/);
    expect(doc).toMatch(/Path 6 — Failure states/);
  });
});