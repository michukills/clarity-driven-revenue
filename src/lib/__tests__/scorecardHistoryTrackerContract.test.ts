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

const CLIENT = "src/pages/portal/tools/ScorecardHistory.tsx";
const ADMIN = "src/pages/admin/ScorecardHistoryAdmin.tsx";
const APP = "src/App.tsx";

const BANNED: RegExp[] = [
  /unlimited support/i, /unlimited consulting/i, /emergency support/i,
  /real[- ]time protection/i,
  /guaranteed (revenue|roi|results|risk|clean data|improvement|stability)/i,
  /RGS runs your business/i, /done[- ]for[- ]you/i, /full[- ]service/i,
  /automatic insight from every tool/i,
  /replaces (accounting|legal|tax|compliance|payroll|hr)/i,
  /business valuation/i, /financial forecast/i,
  /use anytime/i, /upgrade anytime/i, /ask RGS if/i,
  /project[- ]management suite/i,
];

describe("P57 — Scorecard History / Stability Trend Tracker contract", () => {
  it("admin and client routes exist with correct gating", () => {
    const app = read(APP);
    expect(app).toMatch(
      /path="\/portal\/tools\/scorecard-history"[\s\S]*ClientToolGuard\s+toolKey="scorecard_history_tracker"/,
    );
    expect(app).toMatch(
      /path="\/admin\/customers\/:customerId\/scorecard-history"[\s\S]*requireRole="admin"/,
    );
  });

  it("migration creates scorecard_history_entries table, enums, RLS, and client-safe RPC", () => {
    const sql = allMigrations();
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.scorecard_history_entries/);
    expect(sql).toMatch(/CREATE TYPE public\.shte_source_type/);
    expect(sql).toMatch(/CREATE TYPE public\.shte_stability_band/);
    expect(sql).toMatch(/CREATE TYPE public\.shte_trend_direction/);
    expect(sql).toMatch(/ALTER TABLE public\.scorecard_history_entries ENABLE ROW LEVEL SECURITY/);
    expect(sql).toMatch(/CREATE POLICY "Admin manage scorecard history entries"/);
    expect(sql).toMatch(/CREATE POLICY "Client read own visible scorecard history entries"/);
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\.get_client_scorecard_history_entries/);
  });

  it("client-safe RPC excludes internal_notes / admin_summary / admin review fields", () => {
    const sql = allMigrations();
    const fnMatch = sql.match(
      /CREATE OR REPLACE FUNCTION public\.get_client_scorecard_history_entries[\s\S]*?\$\$;/,
    );
    expect(fnMatch).not.toBeNull();
    const body = fnMatch![0];
    expect(body).not.toMatch(/\binternal_notes\b/);
    expect(body).not.toMatch(/\badmin_summary\b/);
    expect(body).not.toMatch(/\badmin_review_required\b/);
    // Must filter on client_visible.
    expect(body).toMatch(/client_visible = true/);
    expect(body).toMatch(/archived_at IS NULL/);
  });

  it("score range constraints are enforced", () => {
    const sql = allMigrations();
    expect(sql).toMatch(/shte_total_score_range[\s\S]*0 AND[\s\S]*1000/);
    expect(sql).toMatch(/shte_dg_score_range[\s\S]*0 AND[\s\S]*200/);
    expect(sql).toMatch(/shte_rc_score_range[\s\S]*0 AND[\s\S]*200/);
    expect(sql).toMatch(/shte_oe_score_range[\s\S]*0 AND[\s\S]*200/);
    expect(sql).toMatch(/shte_fv_score_range[\s\S]*0 AND[\s\S]*200/);
    expect(sql).toMatch(/shte_oi_score_range[\s\S]*0 AND[\s\S]*200/);
  });

  it("table covers the five RGS gear score columns", () => {
    const sql = allMigrations();
    for (const col of [
      "demand_generation_score","revenue_conversion_score",
      "operational_efficiency_score","financial_visibility_score",
      "owner_independence_score",
    ]) {
      expect(sql).toMatch(new RegExp(col));
    }
  });

  it("source_type enum covers required source values", () => {
    const sql = allMigrations();
    const enumMatch = sql.match(/CREATE TYPE public\.shte_source_type AS ENUM \(([\s\S]*?)\)/);
    expect(enumMatch).not.toBeNull();
    const body = enumMatch![1];
    for (const s of [
      "public_scorecard","paid_diagnostic","admin_review",
      "monthly_review","manual_import","rgs_control_system_review","other",
    ]) {
      expect(body).toMatch(new RegExp(`'${s}'`));
    }
  });

  it("tool_catalog row uses rgs_control_system / rcs_ongoing_visibility / all_industries_shared", () => {
    const sql = allMigrations();
    expect(sql).toMatch(
      /'scorecard_history_tracker'[\s\S]*'rgs_control_system'[\s\S]*'rcs_ongoing_visibility'[\s\S]*'all_industries_shared'/,
    );
  });

  it("only one tool_catalog INSERT registers tool_key scorecard_history_tracker", () => {
    const sql = allMigrations();
    const inserts = sql.match(/INSERT INTO public\.tool_catalog[\s\S]*?ON CONFLICT/g) ?? [];
    const dupeInserts = inserts.filter(i => /'scorecard_history_tracker'/.test(i));
    expect(dupeInserts.length).toBeLessThanOrEqual(1);
  });

  it("client page does not leak internal admin or payment fields", () => {
    const page = read(CLIENT);
    expect(page).not.toMatch(/internal_notes/);
    expect(page).not.toMatch(/admin_summary/);
    expect(page).not.toMatch(/admin_review_required/);
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
    expect(existsSync(join(root, "docs/scorecard-history-stability-trend-tracker.md"))).toBe(true);
  });
});