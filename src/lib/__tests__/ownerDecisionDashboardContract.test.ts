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

const CLIENT = "src/pages/portal/tools/OwnerDecisionDashboard.tsx";
const ADMIN = "src/pages/admin/OwnerDecisionDashboardAdmin.tsx";
const APP = "src/App.tsx";

const BANNED: RegExp[] = [
  /unlimited support/i, /unlimited consulting/i, /emergency support/i,
  /real[- ]time protection/i,
  /guaranteed (revenue|roi|results|risk|clean data)/i,
  /RGS runs your business/i, /done[- ]for[- ]you/i, /full[- ]service/i,
  /automatic insight from every tool/i,
  /replaces (accounting|legal|tax|compliance|payroll|hr)/i,
  /use anytime/i, /upgrade anytime/i, /ask RGS if/i,
  /project[- ]management suite/i,
];

describe("P56 — Owner Decision Dashboard contract", () => {
  it("admin and client routes exist with correct gating", () => {
    const app = read(APP);
    expect(app).toMatch(
      /path="\/portal\/tools\/owner-decision-dashboard"[\s\S]*ClientToolGuard\s+toolKey="owner_decision_dashboard"/,
    );
    expect(app).toMatch(
      /path="\/admin\/customers\/:customerId\/owner-decision-dashboard"[\s\S]*requireRole="admin"/,
    );
  });

  it("migration creates owner_decision_dashboard_items table, enums, RLS, and unified RPC", () => {
    const sql = allMigrations();
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.owner_decision_dashboard_items/);
    expect(sql).toMatch(/CREATE TYPE public\.odd_decision_type/);
    expect(sql).toMatch(/CREATE TYPE public\.odd_gear/);
    expect(sql).toMatch(/CREATE TYPE public\.odd_priority_level/);
    expect(sql).toMatch(/CREATE TYPE public\.odd_status/);
    expect(sql).toMatch(/CREATE TYPE public\.odd_source_type/);
    expect(sql).toMatch(/ALTER TABLE public\.owner_decision_dashboard_items ENABLE ROW LEVEL SECURITY/);
    expect(sql).toMatch(/CREATE POLICY "Admin manage owner decision dashboard items"/);
    expect(sql).toMatch(/CREATE POLICY "Client read own visible owner decision dashboard items"/);
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\.get_client_owner_decision_dashboard/);
  });

  it("client-safe RPC excludes internal_notes / admin review fields", () => {
    const sql = allMigrations();
    const fnMatch = sql.match(
      /CREATE OR REPLACE FUNCTION public\.get_client_owner_decision_dashboard[\s\S]*?\$\$;/,
    );
    expect(fnMatch).not.toBeNull();
    const body = fnMatch![0];
    expect(body).not.toMatch(/\binternal_notes\b/);
    expect(body).not.toMatch(/\badmin_review_required\b/);
    expect(body).not.toMatch(/\breviewed_by_admin_at\b/);
    // Unified feed must reference all three source tables.
    expect(body).toMatch(/owner_decision_dashboard_items/);
    expect(body).toMatch(/priority_action_items/);
    expect(body).toMatch(/revenue_risk_monitor_items/);
    // Each branch must filter on client_visible.
    const visibleMatches = body.match(/client_visible = true/g) ?? [];
    expect(visibleMatches.length).toBeGreaterThanOrEqual(3);
  });

  it("tool_catalog row uses rgs_control_system / rcs_ongoing_visibility / all_industries_shared", () => {
    const sql = allMigrations();
    expect(sql).toMatch(
      /'owner_decision_dashboard'[\s\S]*'rgs_control_system'[\s\S]*'rcs_ongoing_visibility'[\s\S]*'all_industries_shared'/,
    );
  });

  it("only one tool_catalog INSERT registers tool_key owner_decision_dashboard", () => {
    const sql = allMigrations();
    const inserts = sql.match(/INSERT INTO public\.tool_catalog[\s\S]*?ON CONFLICT/g) ?? [];
    const dupeInserts = inserts.filter(i => /'owner_decision_dashboard'/.test(i));
    expect(dupeInserts.length).toBeLessThanOrEqual(1);
  });

  it("client page does not leak internal admin or payment fields", () => {
    const page = read(CLIENT);
    expect(page).not.toMatch(/internal_notes/);
    expect(page).not.toMatch(/admin_review_required/);
    expect(page).not.toMatch(/reviewed_by_admin_at/);
    expect(page).not.toMatch(/rcc_subscription_status/);
    expect(page).not.toMatch(/stripe_(customer|payment)/i);
  });

  it("client page references the RGS Control System umbrella", () => {
    const page = read(CLIENT);
    expect(page).toMatch(/RGS Control System/);
    expect(page).toMatch(/\/portal\/tools\/rgs-control-system/);
  });

  it("source_type enum covers required source values", () => {
    const sql = allMigrations();
    const enumMatch = sql.match(/CREATE TYPE public\.odd_source_type AS ENUM \(([\s\S]*?)\)/);
    expect(enumMatch).not.toBeNull();
    const body = enumMatch![1];
    for (const s of [
      "priority_action_tracker","revenue_risk_monitor",
      "monthly_review","scorecard","diagnostic_report",
    ]) {
      expect(body).toMatch(new RegExp(`'${s}'`));
    }
  });

  it("gear enum covers the five RGS gears + cross_gear", () => {
    const sql = allMigrations();
    const enumMatch = sql.match(/CREATE TYPE public\.odd_gear AS ENUM \(([\s\S]*?)\)/);
    expect(enumMatch).not.toBeNull();
    const body = enumMatch![1];
    for (const g of [
      "demand_generation","revenue_conversion","operational_efficiency",
      "financial_visibility","owner_independence","cross_gear",
    ]) {
      expect(body).toMatch(new RegExp(`'${g}'`));
    }
  });

  it("no banned scope-creep wording on client or admin surfaces", () => {
    for (const f of [CLIENT, ADMIN]) {
      const page = read(f);
      for (const re of BANNED) expect(page, `${f} matched ${re}`).not.toMatch(re);
    }
  });

  it("docs file exists", () => {
    expect(existsSync(join(root, "docs/owner-decision-dashboard.md"))).toBe(true);
  });
});