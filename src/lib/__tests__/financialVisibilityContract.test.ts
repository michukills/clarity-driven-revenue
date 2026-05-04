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

const CLIENT = "src/pages/portal/tools/FinancialVisibility.tsx";
const ADMIN = "src/pages/admin/FinancialVisibilityAdmin.tsx";
const APP = "src/App.tsx";

const BANNED: RegExp[] = [
  /unlimited support/i, /unlimited consulting/i, /unlimited advisory/i,
  /open[- ]ended consulting/i, /open[- ]ended support/i,
  /emergency support/i, /real[- ]time protection/i,
  /guaranteed (revenue|roi|results|risk|clean data|improvement|stability|opportunity|growth)/i,
  /RGS runs your business/i, /done[- ]for[- ]you/i, /full[- ]service/i,
  /automatic insight from every tool/i,
  /replaces (accounting|legal|tax|compliance|payroll|hr)/i,
  /business valuation/i, /financial forecast/i,
  /use anytime/i, /upgrade anytime/i, /ask us anytime/i, /message us anytime/i,
  /project[- ]management suite/i,
  /trusted by/i, /testimonials?/i, /case stud(y|ies)/i,
  /client success stor(y|ies)/i, /proven results/i, /real client results/i,
];

describe("P62 — Connector UI / Financial Visibility contract", () => {
  it("admin and client routes exist with correct gating", () => {
    const app = read(APP);
    expect(app).toMatch(
      /path="\/portal\/tools\/financial-visibility"[\s\S]*?ClientToolGuard\s+toolKey="connector_financial_visibility"/,
    );
    expect(app).toMatch(
      /path="\/admin\/customers\/:customerId\/financial-visibility"[\s\S]*?requireRole="admin"/,
    );
  });

  it("migration creates table, enums, RLS, and client-safe RPC", () => {
    const sql = allMigrations();
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.financial_visibility_sources/);
    expect(sql).toMatch(/CREATE TYPE public\.financial_visibility_provider/);
    expect(sql).toMatch(/CREATE TYPE public\.financial_visibility_source_type/);
    expect(sql).toMatch(/CREATE TYPE public\.financial_visibility_status/);
    expect(sql).toMatch(/CREATE TYPE public\.financial_visibility_health/);
    expect(sql).toMatch(/CREATE TYPE public\.financial_visibility_related_source_type/);
    expect(sql).toMatch(/ALTER TABLE public\.financial_visibility_sources ENABLE ROW LEVEL SECURITY/);
    expect(sql).toMatch(/CREATE POLICY "Admin manage financial visibility sources"/);
    expect(sql).toMatch(/CREATE POLICY "Client read own visible financial visibility sources"/);
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\.get_client_financial_visibility_sources/);
  });

  it("client RLS policy restricts to client_visible and non-archived", () => {
    const sql = allMigrations();
    const m = sql.match(
      /CREATE POLICY "Client read own visible financial visibility sources"[\s\S]*?;/,
    );
    expect(m).not.toBeNull();
    const body = m![0];
    expect(body).toMatch(/client_visible = true/);
    expect(body).toMatch(/archived_at IS NULL/);
    expect(body).toMatch(/user_owns_customer/);
  });

  it("client-safe RPC excludes internal/admin/secret/audit fields", () => {
    const sql = allMigrations();
    const fnMatch = sql.match(
      /CREATE OR REPLACE FUNCTION public\.get_client_financial_visibility_sources[\s\S]*?\$\$;/,
    );
    expect(fnMatch).not.toBeNull();
    const body = fnMatch![0];
    const returnsBlock = body.match(/RETURNS TABLE \(([\s\S]*?)\)\s*LANGUAGE/);
    expect(returnsBlock).not.toBeNull();
    const ret = returnsBlock![1];
    for (const banned of [
      "internal_notes", "admin_notes", "admin_summary",
      "created_by", "updated_by",
      "token", "refresh_token", "access_token", "api_key",
      "client_secret", "secret",
    ]) {
      expect(ret, `RETURNS TABLE leaks ${banned}`).not.toMatch(new RegExp(`\\b${banned}\\b`));
    }
    expect(body).toMatch(/client_visible = true/);
    expect(body).toMatch(/archived_at IS NULL/);
  });

  it("tool_catalog row uses rgs_control_system / rcs_ongoing_visibility", () => {
    const sql = allMigrations();
    expect(sql).toMatch(
      /'connector_financial_visibility'[\s\S]*?'rgs_control_system'[\s\S]*?'rcs_ongoing_visibility'/,
    );
  });

  it("only one tool_catalog INSERT registers tool_key connector_financial_visibility", () => {
    const sql = allMigrations();
    const inserts = sql.match(/INSERT INTO public\.tool_catalog[\s\S]*?ON CONFLICT/g) ?? [];
    const dupes = inserts.filter(i => /'connector_financial_visibility'/.test(i));
    expect(dupes.length).toBeLessThanOrEqual(1);
  });

  it("client page does not leak internal/admin/secret fields", () => {
    const page = read(CLIENT);
    for (const banned of [
      "internal_notes", "admin_notes", "admin_summary",
      "created_by", "updated_by",
      "refresh_token", "access_token", "api_key", "client_secret",
    ]) {
      expect(page, `client page references ${banned}`).not.toMatch(new RegExp(`\\b${banned}\\b`));
    }
  });

  it("client page references RGS Control System umbrella and includes financial visibility scope disclaimer", () => {
    const page = read(CLIENT);
    expect(page).toMatch(/RGS Control System/);
    expect(page).toMatch(/\/portal\/tools\/rgs-control-system/);
    expect(page).toMatch(/not accounting/i);
    expect(page).toMatch(/qualified professionals/i);
  });

  it("admin page clarifies internal notes are admin-only and tokens/secrets never shown", () => {
    const page = read(ADMIN);
    expect(page).toMatch(/internal_notes/);
    expect(page).toMatch(/admin_notes/);
    expect(page).toMatch(/admin-only/i);
    expect(page).toMatch(/never shown to (the )?client/i);
    expect(page).toMatch(/(tokens|secrets)[\s\S]{0,80}(never|not).{0,40}(browser|shown|displayed)/i);
  });

  it("no banned scope-creep or fake-proof wording on client or admin surfaces", () => {
    for (const f of [CLIENT, ADMIN]) {
      const page = read(f);
      for (const re of BANNED) expect(page, `${f} matched ${re}`).not.toMatch(re);
    }
  });

  it("third-party brand names use exact official capitalization on client and admin", () => {
    for (const f of [CLIENT, ADMIN]) {
      const page = read(f);
      expect(page, `${f} uses lowercase 'quickbooks'`).not.toMatch(/\bquickbooks\b/);
      expect(page, `${f} uses 'Quickbooks'`).not.toMatch(/\bQuickbooks\b/);
    }
  });

  it("docs file exists", () => {
    expect(existsSync(join(root, "docs/connector-financial-visibility.md"))).toBe(true);
  });
});
