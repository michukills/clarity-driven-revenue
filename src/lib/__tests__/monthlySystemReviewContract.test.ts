import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");
const allMigrations = () =>
  readdirSync(join(root, "supabase/migrations"))
    .filter(f => f.endsWith(".sql"))
    .map(f => readFileSync(join(root, "supabase/migrations", f), "utf8"))
    .join("\n");

const CLIENT = "src/pages/portal/tools/MonthlySystemReview.tsx";
const ADMIN = "src/pages/admin/MonthlySystemReviewAdmin.tsx";
const APP = "src/App.tsx";

const BANNED: RegExp[] = [
  /unlimited support/i, /unlimited consulting/i, /unlimited advisory/i,
  /emergency support/i, /real[- ]time protection/i,
  /guaranteed (revenue|roi|results|risk|clean data|improvement|stability)/i,
  /RGS runs your business/i, /done[- ]for[- ]you/i, /full[- ]service/i,
  /automatic insight from every tool/i,
  /replaces (accounting|legal|tax|compliance|payroll|hr)/i,
  /business valuation/i, /financial forecast/i,
  /use anytime/i, /upgrade anytime/i, /ask RGS if/i,
  /project[- ]management suite/i,
];

describe("P58 — Monthly System Review contract", () => {
  it("admin and client routes exist with correct gating", () => {
    const app = read(APP);
    expect(app).toMatch(
      /path="\/portal\/tools\/monthly-system-review"[\s\S]*ClientToolGuard\s+toolKey="monthly_system_review"/,
    );
    expect(app).toMatch(
      /path="\/admin\/customers\/:customerId\/monthly-system-review"[\s\S]*requireRole="admin"/,
    );
  });

  it("migration creates table, enums, RLS, and client-safe RPC", () => {
    const sql = allMigrations();
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.monthly_system_review_entries/);
    expect(sql).toMatch(/CREATE TYPE public\.msr_review_status/);
    expect(sql).toMatch(/CREATE TYPE public\.msr_overall_signal/);
    expect(sql).toMatch(/CREATE TYPE public\.msr_section_kind/);
    expect(sql).toMatch(/ALTER TABLE public\.monthly_system_review_entries ENABLE ROW LEVEL SECURITY/);
    expect(sql).toMatch(/CREATE POLICY "Admin manage monthly system review entries"/);
    expect(sql).toMatch(/CREATE POLICY "Client read own visible monthly system review entries"/);
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\.get_client_monthly_system_review_entries/);
  });

  it("client RLS policy restricts to shared_with_client status, client-visible, non-archived", () => {
    const sql = allMigrations();
    const policyMatch = sql.match(
      /CREATE POLICY "Client read own visible monthly system review entries"[\s\S]*?;/,
    );
    expect(policyMatch).not.toBeNull();
    const body = policyMatch![0];
    expect(body).toMatch(/client_visible = true/);
    expect(body).toMatch(/archived_at IS NULL/);
    expect(body).toMatch(/status = 'shared_with_client'/);
    expect(body).toMatch(/user_owns_customer/);
  });

  it("client-safe RPC excludes internal_notes / admin_summary / admin review fields", () => {
    const sql = allMigrations();
    const fnMatch = sql.match(
      /CREATE OR REPLACE FUNCTION public\.get_client_monthly_system_review_entries[\s\S]*?\$\$;/,
    );
    expect(fnMatch).not.toBeNull();
    const body = fnMatch![0];
    expect(body).not.toMatch(/\binternal_notes\b/);
    expect(body).not.toMatch(/\badmin_summary\b/);
    expect(body).not.toMatch(/\badmin_review_required\b/);
    expect(body).toMatch(/client_visible = true/);
    expect(body).toMatch(/archived_at IS NULL/);
    expect(body).toMatch(/status = 'shared_with_client'/);
  });

  it("review status enum covers required values", () => {
    const sql = allMigrations();
    const enumMatch = sql.match(/CREATE TYPE public\.msr_review_status AS ENUM \(([\s\S]*?)\)/);
    expect(enumMatch).not.toBeNull();
    const body = enumMatch![1];
    for (const s of ["draft","in_review","ready_for_client","shared_with_client","archived"]) {
      expect(body).toMatch(new RegExp(`'${s}'`));
    }
  });

  it("overall signal enum covers required values", () => {
    const sql = allMigrations();
    const enumMatch = sql.match(/CREATE TYPE public\.msr_overall_signal AS ENUM \(([\s\S]*?)\)/);
    expect(enumMatch).not.toBeNull();
    const body = enumMatch![1];
    for (const s of ["improving","holding_steady","needs_attention","slipping","unknown"]) {
      expect(body).toMatch(new RegExp(`'${s}'`));
    }
  });

  it("review period end must be >= start when both present", () => {
    const sql = allMigrations();
    expect(sql).toMatch(/msr_period_order[\s\S]*review_period_end >= review_period_start/);
  });

  it("tool_catalog row uses rgs_control_system / rcs_ongoing_visibility / all_industries_shared", () => {
    const sql = allMigrations();
    expect(sql).toMatch(
      /'monthly_system_review'[\s\S]*'rgs_control_system'[\s\S]*'rcs_ongoing_visibility'[\s\S]*'all_industries_shared'/,
    );
  });

  it("only one tool_catalog INSERT registers tool_key monthly_system_review", () => {
    const sql = allMigrations();
    const inserts = sql.match(/INSERT INTO public\.tool_catalog[\s\S]*?ON CONFLICT/g) ?? [];
    const dupeInserts = inserts.filter(i => /'monthly_system_review'/.test(i));
    expect(dupeInserts.length).toBeLessThanOrEqual(1);
  });

  it("client page does not leak internal admin or payment fields", () => {
    const page = read(CLIENT);
    expect(page).not.toMatch(/internal_notes/);
    expect(page).not.toMatch(/admin_summary/);
    expect(page).not.toMatch(/admin_review_required/);
    expect(page).not.toMatch(/\bstatus\b\s*[:=]/);
    expect(page).not.toMatch(/rcc_subscription_status/);
    expect(page).not.toMatch(/stripe_(customer|payment)/i);
  });

  it("client page references the RGS Control System umbrella", () => {
    const page = read(CLIENT);
    expect(page).toMatch(/RGS Control System/);
    expect(page).toMatch(/\/portal\/tools\/rgs-control-system/);
  });

  it("no banned scope-creep wording on client or admin surfaces", () => {
    for (const f of [CLIENT, ADMIN]) {
      const page = read(f);
      for (const re of BANNED) expect(page, `${f} matched ${re}`).not.toMatch(re);
    }
  });

  it("docs file exists", () => {
    expect(existsSync(join(root, "docs/monthly-system-review.md"))).toBe(true);
  });
});
