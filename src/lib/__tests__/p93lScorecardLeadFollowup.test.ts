import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

describe("P93-L — Scorecard lead capture + follow-up email + pipeline intake", () => {
  it("public Scorecard form captures explicit email consent", () => {
    const src = read("src/pages/Scorecard.tsx");
    expect(src).toMatch(/email_consent:\s*boolean/);
    expect(src).toMatch(/email_consent:\s*true/);
    expect(src).toMatch(/checked=\{lead\.email_consent\}/);
  });

  it("Scorecard insert payload tags source = public_scorecard and forwards consent", () => {
    const src = read("src/pages/Scorecard.tsx");
    expect(src).toMatch(/source:\s*"public_scorecard"/);
    expect(src).toMatch(/email_consent:\s*lead\.email_consent/);
  });

  it("Scorecard fires the follow-up dispatcher with the inserted row id (best-effort)", () => {
    const src = read("src/pages/Scorecard.tsx");
    expect(src).toMatch(/\.from\(\s*"scorecard_runs"\s*\)\s*\.insert\([\s\S]*?\.select\(\s*"id"\s*\)/);
    expect(src).toMatch(/functions\.invoke\(\s*"scorecard-followup"\s*,\s*\{\s*body:\s*\{\s*runId:\s*inserted\.id/);
  });

  it("scorecard-followup edge function exists, is configured anonymous-callable, and re-reads the row server-side", () => {
    const fn = read("supabase/functions/scorecard-followup/index.ts");
    expect(fn).toMatch(/from\(\s*"scorecard_runs"\s*\)/);
    expect(fn).toMatch(/admin_record_scorecard_email_result/);
    expect(fn).toMatch(/scorecard_lead_captured/);
    const cfg = read("supabase/config.toml");
    expect(cfg).toMatch(/\[functions\.scorecard-followup\][\s\S]*verify_jwt\s*=\s*false/);
  });

  it("follow-up email default sender is jmchubb@ until info@ is verified", () => {
    const fn = read("supabase/functions/scorecard-followup/index.ts");
    expect(fn).toMatch(/jmchubb@revenueandgrowthsystems\.com/);
    expect(fn).toMatch(/FOLLOWUP_EMAIL_FROM/);
    // Hard rule: never default to info@ in the follow-up sender path.
    const followupFromBlock = fn.match(/DEFAULT_FOLLOWUP_FROM\s*=\s*"[^"]+"/);
    expect(followupFromBlock?.[0] ?? "").not.toMatch(/info@revenueandgrowthsystems\.com/);
  });

  it("missing-consent path is skipped and flagged for manual follow-up", () => {
    const fn = read("supabase/functions/scorecard-followup/index.ts");
    expect(fn).toMatch(/skipped_missing_consent/);
    expect(fn).toMatch(/email_consent/);
  });

  it("admin email helper accepts the new scorecard_lead_captured event", () => {
    const helper = read("supabase/functions/_shared/admin-email.ts");
    expect(helper).toMatch(/scorecard_lead_captured/);
    expect(helper).toMatch(/RGS scorecard lead captured/);
  });

  it("follow-up migration adds tracking columns + customer linkage trigger", () => {
    const dir = join(root, "supabase/migrations");
    const sql = readdirSync(dir)
      .filter((f) => f.endsWith(".sql"))
      .map((f) => readFileSync(join(dir, f), "utf8"))
      .find((c) =>
        c.includes("admin_record_scorecard_email_result") &&
        c.includes("link_customer_to_scorecard_run"),
      );
    expect(sql, "P93-L migration not found").toBeTruthy();
    expect(sql!).toMatch(/email_consent\s+boolean/);
    expect(sql!).toMatch(/follow_up_email_status/);
    expect(sql!).toMatch(/admin_alert_email_status/);
    expect(sql!).toMatch(/manual_followup_required/);
    expect(sql!).toMatch(/linked_customer_id/);
    expect(sql!).toMatch(/linked_scorecard_run_id/);
    expect(sql!).toMatch(/skipped_missing_consent/);
    // RPC must be locked to service_role only.
    expect(sql!).toMatch(/REVOKE ALL ON FUNCTION public\.admin_record_scorecard_email_result[\s\S]*FROM authenticated, anon/);
    expect(sql!).toMatch(/GRANT EXECUTE ON FUNCTION public\.admin_record_scorecard_email_result[\s\S]*TO service_role/);
  });

  it("frontend never references email provider secrets", () => {
    const sc = read("src/pages/Scorecard.tsx");
    expect(sc).not.toMatch(/RESEND_API_KEY/);
    expect(sc).not.toMatch(/FOLLOWUP_EMAIL_FROM/);
    expect(sc).not.toMatch(/ADMIN_EMAIL_FROM/);
  });
});