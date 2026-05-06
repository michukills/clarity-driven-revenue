import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { resolve } from "path";

const dir = resolve(process.cwd(), "supabase/migrations");
const sql = readdirSync(dir).filter((f) => f.endsWith(".sql"))
  .map((f) => readFileSync(resolve(dir, f), "utf8")).join("\n");

describe("P86 Migration / RLS shape", () => {
  const tables = [
    "email_communication_consents", "email_notification_attempts",
    "evidence_decay_records", "evidence_expiration_reminders",
    "labor_burden_calculations", "rgs_pulse_check_runs",
    "owner_intervention_log", "external_risk_triggers", "ai_hitl_audit_log",
  ];
  it("all 9 tables exist + RLS enabled", () => {
    for (const t of tables) {
      expect(sql).toContain(`CREATE TABLE IF NOT EXISTS public.${t}`);
      expect(sql).toContain(`ALTER TABLE public.${t} ENABLE ROW LEVEL SECURITY`);
    }
  });
  it("client RPCs exist", () => {
    for (const fn of [
      "get_client_evidence_decay", "get_client_labor_burden",
      "get_client_owner_interventions", "get_client_external_risks",
    ]) expect(sql).toContain(`FUNCTION public.${fn}`);
  });
  it("AI HITL trigger + exact phrase exist", () => {
    expect(sql).toContain("enforce_hitl_gate");
    expect(sql).toContain("I have cross-referenced the AI summary with the raw PDF.");
  });
  it("send_status enum includes blocked/admin_tracked statuses", () => {
    for (const s of [
      "blocked_missing_consent", "blocked_revoked_consent",
      "blocked_no_email_backend", "admin_tracked_only",
    ]) expect(sql).toContain(s);
  });
});