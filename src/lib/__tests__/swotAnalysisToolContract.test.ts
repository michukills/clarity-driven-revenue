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

const CLIENT = "src/pages/portal/tools/SwotAnalysis.tsx";
const ADMIN = "src/pages/admin/SwotAnalysisAdmin.tsx";
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
  /chooses? the strategy/i, /we make the decision/i,
];

describe("P61 — SWOT Analysis Tool contract", () => {
  it("admin and client routes exist with correct gating", () => {
    const app = read(APP);
    expect(app).toMatch(
      /path="\/portal\/tools\/swot-analysis"[\s\S]*ClientToolGuard\s+toolKey="swot_analysis_tool"/,
    );
    expect(app).toMatch(
      /path="\/admin\/customers\/:customerId\/swot-analysis"[\s\S]*requireRole="admin"/,
    );
  });

  it("migration creates table, enums, RLS, and client-safe RPC", () => {
    const sql = allMigrations();
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.swot_analysis_items/);
    expect(sql).toMatch(/CREATE TYPE public\.swot_category/);
    expect(sql).toMatch(/CREATE TYPE public\.swot_item_status/);
    expect(sql).toMatch(/CREATE TYPE public\.swot_priority/);
    expect(sql).toMatch(/CREATE TYPE public\.swot_related_source_type/);
    expect(sql).toMatch(/CREATE TYPE public\.swot_related_gear/);
    expect(sql).toMatch(/ALTER TABLE public\.swot_analysis_items ENABLE ROW LEVEL SECURITY/);
    expect(sql).toMatch(/CREATE POLICY "Admin manage swot analysis items"/);
    expect(sql).toMatch(/CREATE POLICY "Client read own visible swot analysis items"/);
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\.get_client_swot_analysis_items/);
  });

  it("client RLS policy restricts to client_visible, non-archived, non-draft/archived status", () => {
    const sql = allMigrations();
    const m = sql.match(
      /CREATE POLICY "Client read own visible swot analysis items"[\s\S]*?;/,
    );
    expect(m).not.toBeNull();
    const body = m![0];
    expect(body).toMatch(/client_visible = true/);
    expect(body).toMatch(/archived_at IS NULL/);
    expect(body).toMatch(/status NOT IN \('draft','archived'\)/);
    expect(body).toMatch(/user_owns_customer/);
  });

  it("client-safe RPC excludes internal_notes / admin_notes / status / audit columns", () => {
    const sql = allMigrations();
    const fnMatch = sql.match(
      /CREATE OR REPLACE FUNCTION public\.get_client_swot_analysis_items[\s\S]*?\$\$;/,
    );
    expect(fnMatch).not.toBeNull();
    const body = fnMatch![0];
    expect(body).not.toMatch(/\binternal_notes\b/);
    expect(body).not.toMatch(/\badmin_notes\b/);
    expect(body).not.toMatch(/\bcreated_by\b/);
    expect(body).not.toMatch(/\bupdated_by\b/);
    const returnsBlock = body.match(/RETURNS TABLE \(([\s\S]*?)\)\s*LANGUAGE/);
    expect(returnsBlock).not.toBeNull();
    expect(returnsBlock![1]).not.toMatch(/\bstatus\b/);
    expect(body).toMatch(/client_visible = true/);
    expect(body).toMatch(/archived_at IS NULL/);
    expect(body).toMatch(/status NOT IN \('draft','archived'\)/);
  });

  it("category enum covers SWOT four", () => {
    const sql = allMigrations();
    const m = sql.match(/CREATE TYPE public\.swot_category AS ENUM \(([\s\S]*?)\)/);
    expect(m).not.toBeNull();
    for (const s of ["strength","weakness","opportunity","threat"]) {
      expect(m![1]).toMatch(new RegExp(`'${s}'`));
    }
  });

  it("status enum covers required values", () => {
    const sql = allMigrations();
    const m = sql.match(/CREATE TYPE public\.swot_item_status AS ENUM \(([\s\S]*?)\)/);
    expect(m).not.toBeNull();
    for (const s of ["draft","active","reviewed","converted","archived"]) {
      expect(m![1]).toMatch(new RegExp(`'${s}'`));
    }
  });

  it("tool_catalog row uses shared_support / rcs_ongoing_visibility / all_industries_shared", () => {
    const sql = allMigrations();
    expect(sql).toMatch(
      /'swot_analysis_tool'[\s\S]*'shared_support'[\s\S]*'rcs_ongoing_visibility'[\s\S]*'all_industries_shared'/,
    );
  });

  it("only one tool_catalog INSERT registers tool_key swot_analysis_tool", () => {
    const sql = allMigrations();
    const inserts = sql.match(/INSERT INTO public\.tool_catalog[\s\S]*?ON CONFLICT/g) ?? [];
    const dupes = inserts.filter(i => /'swot_analysis_tool'/.test(i));
    expect(dupes.length).toBeLessThanOrEqual(1);
  });

  it("client page does not leak internal admin or status fields", () => {
    const page = read(CLIENT);
    expect(page).not.toMatch(/internal_notes/);
    expect(page).not.toMatch(/admin_notes/);
    expect(page).not.toMatch(/admin_review_required/);
    expect(page).not.toMatch(/admin_summary/);
    expect(page).not.toMatch(/\bstatus\b\s*[:=]/);
  });

  it("client page is labeled RGS Stability Snapshot, never SWOT Analysis (P20.20 language guard)", () => {
    const page = read(CLIENT);
    expect(page).toMatch(/RGS Stability Snapshot/);
    // Hard guard: no client-facing "SWOT Analysis" label
    expect(page).not.toMatch(/SWOT Analysis/);
  });

  it("client page references RGS Control System umbrella and includes scope disclaimer", () => {
    const page = read(CLIENT);
    expect(page).toMatch(/RGS Control System/);
    expect(page).toMatch(/\/portal\/tools\/rgs-control-system/);
    expect(page).toMatch(/owner judgment/i);
  });

  it("admin page exposes internal/admin notes fields and clarifies admin-only", () => {
    const page = read(ADMIN);
    expect(page).toMatch(/internal_notes/);
    expect(page).toMatch(/admin_notes/);
    expect(page).toMatch(/admin-only/i);
    expect(page).toMatch(/never shown to (the )?client/i);
  });

  it("no banned scope-creep wording on client or admin surfaces", () => {
    for (const f of [CLIENT, ADMIN]) {
      const page = read(f);
      for (const re of BANNED) expect(page, `${f} matched ${re}`).not.toMatch(re);
    }
  });

  it("docs file exists", () => {
    expect(existsSync(join(root, "docs/swot-analysis-tool.md"))).toBe(true);
  });
});
