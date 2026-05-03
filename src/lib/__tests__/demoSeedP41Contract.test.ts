import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * P41.1 — The showcase seed must declare the Owner Diagnostic Interview
 * gate state explicitly for every demo customer so the P41 RPC gate is
 * visible in demo accounts (atlas/northstar locked, summit/keystone
 * unlocked with a persisted diagnostic_tool_sequences row).
 */
const src = readFileSync(join(process.cwd(), "src/lib/admin/showcaseSeed.ts"), "utf8");

describe("P41.1 demo seed gate state", () => {
  it("atlas keeps the Owner Interview gate active (null)", () => {
    expect(/key:\s*"atlas"[\s\S]*?owner_interview_completed_days_ago:\s*null/.test(src)).toBe(true);
  });
  it("northstar keeps the Owner Interview gate active (null)", () => {
    expect(/key:\s*"northstar"[\s\S]*?owner_interview_completed_days_ago:\s*null/.test(src)).toBe(true);
  });
  it("summit has the Owner Interview marked complete", () => {
    expect(/key:\s*"summit"[\s\S]*?owner_interview_completed_days_ago:\s*\d+/.test(src)).toBe(true);
  });
  it("keystone has the Owner Interview marked complete", () => {
    expect(/key:\s*"keystone"[\s\S]*?owner_interview_completed_days_ago:\s*\d+/.test(src)).toBe(true);
  });
  it("seed never force-unlocks diagnostic tools without admin opt-in", () => {
    expect(/diagnostic_tools_force_unlocked:\s*false/.test(src)).toBe(true);
    expect(/diagnostic_tools_force_unlocked:\s*true/.test(src)).toBe(false);
  });
  it("ensureDiagnosticToolSequence is invoked when the gate is satisfied", () => {
    expect(/ensureDiagnosticToolSequence\(spec, c\.id, ctx\)/.test(src)).toBe(true);
  });
  it("seed payload writes owner_interview_completed_at + diagnostic_tools_force_unlocked", () => {
    expect(/owner_interview_completed_at:[\s\S]{0,200}owner_interview_completed_days_ago/.test(src)).toBe(true);
  });
});