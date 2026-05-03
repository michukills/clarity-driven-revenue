import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

describe("P35 — First-Client Delivery Boundary System", () => {
  const apply = read("src/pages/DiagnosticApply.tsx");
  const diagnostic = read("src/pages/Diagnostic.tsx");
  const implementation = read("src/pages/Implementation.tsx");
  const rcs = read("src/pages/RevenueControlSystem.tsx");

  it("DiagnosticApply collects no-guarantee acknowledgement", () => {
    expect(apply).toMatch(/ack_no_guarantee/);
    expect(apply).toMatch(/does not guarantee revenue/i);
    expect(apply).toMatch(/legal, tax, accounting/i);
  });

  it("DiagnosticApply collects one-primary-scope acknowledgement", () => {
    expect(apply).toMatch(/ack_one_primary_scope/);
    expect(apply).toMatch(/one\s+primary[\s\S]{0,40}product/i);
  });

  it("Acknowledgements are persisted on the intake row", () => {
    expect(apply).toMatch(/ack_no_guarantee:\s*parsed\.data\.ack_no_guarantee/);
    expect(apply).toMatch(/ack_one_primary_scope:\s*parsed\.data\.ack_one_primary_scope/);
    expect(apply).toMatch(/ack_recorded_at:/);
  });

  it("Public checkout copy does not imply instant portal access", () => {
    expect(apply).toMatch(/portal account is created only after RGS reviews/i);
    expect(apply).not.toMatch(/instant access|immediate access|portal unlocks/i);
  });

  it("Success page surfaces a What Happens Next sequence", () => {
    expect(apply).toMatch(/What Happens Next/);
    expect(apply).toMatch(/secure portal invite/i);
    expect(apply).toMatch(/client-safe report/i);
  });

  it("Diagnostic page states no guarantee and no licensed-advice claim", () => {
    expect(diagnostic).toMatch(/Not a guarantee of revenue/i);
    expect(diagnostic).toMatch(/Not a legal, tax, accounting/i);
  });

  it("Diagnostic page states one-primary-scope rule", () => {
    expect(diagnostic).toMatch(/one\s+primary[\s\S]{0,80}product[\s\S]{0,40}service/i);
  });

  it("Implementation page makes ownership boundary explicit", () => {
    expect(implementation).toMatch(/We don't run your business/i);
    expect(implementation).toMatch(/does not guarantee revenue/i);
  });

  it("RCS page exists and is referenced from the offer surfaces", () => {
    expect(rcs.length).toBeGreaterThan(0);
    expect(diagnostic).toMatch(/Revenue Control System/);
  });

  it("Public surfaces never include fake testimonials/case studies", () => {
    for (const src of [apply, diagnostic, implementation, rcs]) {
      expect(src).not.toMatch(/testimonial/i);
      expect(src).not.toMatch(/case study/i);
      expect(src).not.toMatch(/guaranteed (revenue|results|growth)/i);
    }
  });

  it("Public diagnostic flow remains invite-only after payment", () => {
    expect(apply).toMatch(/no public account creation|invite-only|secure invite/i);
  });
});