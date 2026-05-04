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

const CLIENT = "src/pages/portal/tools/ToolLibrary.tsx";
const ADMIN = "src/pages/admin/ToolLibraryAdmin.tsx";
const APP = "src/App.tsx";

const BANNED: RegExp[] = [
  /unlimited support/i, /unlimited consulting/i, /unlimited advisory/i,
  /emergency support/i, /real[- ]time protection/i,
  /guaranteed (revenue|roi|results|risk|clean data|improvement|stability)/i,
  /RGS runs your business/i, /done[- ]for[- ]you/i, /full[- ]service/i,
  /automatic insight from every tool/i,
  /replaces (accounting|legal|tax|compliance|payroll|hr)/i,
  /business valuation/i, /financial forecast/i,
  /use anytime/i, /upgrade anytime/i, /ask us anytime/i,
  /project[- ]management suite/i,
  /trusted by/i, /testimonials?/i, /case stud(y|ies)/i,
  /client success stor(y|ies)/i, /proven results/i, /real client results/i,
];

describe("P59 — Tool Library / Resource Center contract", () => {
  it("admin and client routes exist with correct gating", () => {
    const app = read(APP);
    expect(app).toMatch(
      /path="\/portal\/tools\/tool-library"[\s\S]*ClientToolGuard\s+toolKey="tool_library_resource_center"/,
    );
    expect(app).toMatch(
      /path="\/admin\/customers\/:customerId\/tool-library"[\s\S]*requireRole="admin"/,
    );
  });

  it("migration creates table, enums, RLS, and client-safe RPC", () => {
    const sql = allMigrations();
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.tool_library_resources/);
    expect(sql).toMatch(/CREATE TYPE public\.tlr_status/);
    expect(sql).toMatch(/CREATE TYPE public\.tlr_resource_type/);
    expect(sql).toMatch(/CREATE TYPE public\.tlr_related_gear/);
    expect(sql).toMatch(/ALTER TABLE public\.tool_library_resources ENABLE ROW LEVEL SECURITY/);
    expect(sql).toMatch(/CREATE POLICY "Admin manage tool library resources"/);
    expect(sql).toMatch(/CREATE POLICY "Client read own visible tool library resources"/);
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\.get_client_tool_library_resources/);
  });

  it("client RLS policy restricts to published, client-visible, non-archived", () => {
    const sql = allMigrations();
    const policyMatch = sql.match(
      /CREATE POLICY "Client read own visible tool library resources"[\s\S]*?;/,
    );
    expect(policyMatch).not.toBeNull();
    const body = policyMatch![0];
    expect(body).toMatch(/client_visible = true/);
    expect(body).toMatch(/archived_at IS NULL/);
    expect(body).toMatch(/status = 'published'/);
    expect(body).toMatch(/user_owns_customer/);
  });

  it("client-safe RPC excludes internal_notes / status / admin-only fields", () => {
    const sql = allMigrations();
    const fnMatch = sql.match(
      /CREATE OR REPLACE FUNCTION public\.get_client_tool_library_resources[\s\S]*?\$\$;/,
    );
    expect(fnMatch).not.toBeNull();
    const body = fnMatch![0];
    expect(body).not.toMatch(/\binternal_notes\b/);
    expect(body).not.toMatch(/\bcreated_by\b/);
    expect(body).not.toMatch(/\bupdated_by\b/);
    expect(body).not.toMatch(/\barchived_at\b(?!\s+IS NULL)/);
    expect(body).toMatch(/client_visible = true/);
    expect(body).toMatch(/status = 'published'/);
    expect(body).toMatch(/archived_at IS NULL/);
  });

  it("status enum covers required values", () => {
    const sql = allMigrations();
    const m = sql.match(/CREATE TYPE public\.tlr_status AS ENUM \(([\s\S]*?)\)/);
    expect(m).not.toBeNull();
    for (const s of ["draft", "published", "archived"]) {
      expect(m![1]).toMatch(new RegExp(`'${s}'`));
    }
  });

  it("resource_type enum covers required values", () => {
    const sql = allMigrations();
    const m = sql.match(/CREATE TYPE public\.tlr_resource_type AS ENUM \(([\s\S]*?)\)/);
    expect(m).not.toBeNull();
    for (const s of ["guide", "template", "checklist", "worksheet", "explainer",
      "sop_support", "training_support", "report_support", "decision_support", "link", "other"]) {
      expect(m![1]).toMatch(new RegExp(`'${s}'`));
    }
  });

  it("tool_catalog row uses shared_support / rcs_ongoing_visibility / all_industries_shared", () => {
    const sql = allMigrations();
    expect(sql).toMatch(
      /'tool_library_resource_center'[\s\S]*'shared_support'[\s\S]*'rcs_ongoing_visibility'[\s\S]*'all_industries_shared'/,
    );
  });

  it("only one tool_catalog INSERT registers tool_key tool_library_resource_center", () => {
    const sql = allMigrations();
    const inserts = sql.match(/INSERT INTO public\.tool_catalog[\s\S]*?ON CONFLICT/g) ?? [];
    const dupes = inserts.filter(i => /'tool_library_resource_center'/.test(i));
    expect(dupes.length).toBeLessThanOrEqual(1);
  });

  it("client page does not leak internal admin or status fields", () => {
    const page = read(CLIENT);
    expect(page).not.toMatch(/internal_notes/);
    expect(page).not.toMatch(/admin_notes/);
    expect(page).not.toMatch(/admin_review_required/);
    expect(page).not.toMatch(/\bstatus\b\s*[:=]/);
    expect(page).not.toMatch(/rcc_subscription_status/);
  });

  it("client page references the RGS Control System umbrella and includes scope disclaimer", () => {
    const page = read(CLIENT);
    expect(page).toMatch(/RGS Control System/);
    expect(page).toMatch(/\/portal\/tools\/rgs-control-system/);
    expect(page).toMatch(/support materials/i);
    expect(page).toMatch(/owner judgment/i);
  });

  it("admin page exposes internal notes field but clarifies admin-only", () => {
    const page = read(ADMIN);
    expect(page).toMatch(/internal_notes/);
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
    expect(existsSync(join(root, "docs/tool-library-resource-center.md"))).toBe(true);
  });
});
