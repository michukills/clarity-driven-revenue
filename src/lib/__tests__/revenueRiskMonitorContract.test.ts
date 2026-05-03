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

const CLIENT = "src/pages/portal/tools/RevenueRiskMonitor.tsx";
const ADMIN = "src/pages/admin/RevenueRiskMonitorAdmin.tsx";
const APP = "src/App.tsx";

const BANNED: RegExp[] = [
  /unlimited support/i, /unlimited consulting/i, /emergency support/i,
  /real[- ]time protection/i, /guaranteed (revenue|roi|results|risk|clean data)/i,
  /RGS runs your business/i, /done[- ]for[- ]you/i, /full[- ]service/i,
  /automatic insight from every tool/i,
  /replaces (accounting|legal|tax|compliance|payroll|hr)/i,
  /use anytime/i, /upgrade anytime/i, /ask RGS if/i,
];

describe("P54 — Revenue & Risk Monitor contract", () => {
  it("admin and client routes exist with correct gating", () => {
    const app = read(APP);
    expect(app).toMatch(
      /path="\/portal\/tools\/revenue-risk-monitor"[\s\S]*ClientToolGuard\s+toolKey="revenue_risk_monitor"/,
    );
    expect(app).toMatch(
      /path="\/admin\/customers\/:customerId\/revenue-risk-monitor"[\s\S]*requireRole="admin"/,
    );
  });

  it("migration creates items table, enums, RLS, and client-safe RPC", () => {
    const sql = allMigrations();
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.revenue_risk_monitor_items/);
    expect(sql).toMatch(/CREATE TYPE public\.rrm_signal_category/);
    expect(sql).toMatch(/CREATE TYPE public\.rrm_severity/);
    expect(sql).toMatch(/CREATE TYPE public\.rrm_status/);
    expect(sql).toMatch(/CREATE TYPE public\.rrm_trend/);
    expect(sql).toMatch(/ALTER TABLE public\.revenue_risk_monitor_items ENABLE ROW LEVEL SECURITY/);
    expect(sql).toMatch(/CREATE POLICY "Admin manage rrm items"/);
    expect(sql).toMatch(/CREATE POLICY "Client read own visible rrm items"/);
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\.get_client_revenue_risk_monitor_items/);
  });

  it("client-safe RPC excludes internal_notes / admin review fields", () => {
    const sql = allMigrations();
    const fnMatch = sql.match(
      /CREATE OR REPLACE FUNCTION public\.get_client_revenue_risk_monitor_items[\s\S]*?\$\$;/,
    );
    expect(fnMatch).not.toBeNull();
    const body = fnMatch![0];
    expect(body).not.toMatch(/internal_notes/);
    expect(body).not.toMatch(/admin_review_required/);
    expect(body).not.toMatch(/reviewed_by_admin_at/);
  });

  it("tool_catalog row keeps rgs_control_system / rcs_ongoing_visibility / industry_specific_benchmarks", () => {
    const sql = allMigrations();
    expect(sql).toMatch(
      /service_lane\s*=\s*'rgs_control_system'[\s\S]*customer_journey_phase\s*=\s*'rcs_ongoing_visibility'[\s\S]*industry_behavior\s*=\s*'industry_specific_benchmarks'[\s\S]*WHERE tool_key\s*=\s*'revenue_risk_monitor'/,
    );
  });

  it("only one tool_catalog registration uses tool_key revenue_risk_monitor", () => {
    const sql = allMigrations();
    const inserts = sql.match(/INSERT INTO public\.tool_catalog[\s\S]*?ON CONFLICT/g) ?? [];
    const dupeInserts = inserts.filter(i => /'revenue_risk_monitor'/.test(i));
    expect(dupeInserts.length).toBeLessThanOrEqual(1);
  });

  it("client page does not leak internal admin fields", () => {
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

  it("no banned scope-creep wording on client or admin surfaces", () => {
    for (const f of [CLIENT, ADMIN]) {
      const page = read(f);
      for (const re of BANNED) expect(page, `${f} matched ${re}`).not.toMatch(re);
    }
  });

  it("docs file exists", () => {
    expect(existsSync(join(root, "docs/revenue-risk-monitor.md"))).toBe(true);
  });
});