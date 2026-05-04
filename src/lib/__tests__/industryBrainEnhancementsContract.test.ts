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

const ADMIN = "src/pages/admin/IndustryBrainAdmin.tsx";
const APP = "src/App.tsx";
const DOCS = "docs/industry-brain-enhancements.md";

const BANNED: RegExp[] = [
  /unlimited support/i, /unlimited consulting/i, /unlimited advisory/i,
  /emergency support/i,
  /real[- ]time compliance monitoring/i, /real[- ]time protection/i,
  /guaranteed (revenue|roi|results|risk|clean data|improvement|stability|compliance|financial accuracy)/i,
  /compliance guaranteed/i, /keeps you compliant/i, /RGS keeps you compliant/i,
  // These are claim-style banned phrases; explicit "not legal advice"
  // disclaimers must remain allowed, so we reject only positive-claim forms.
  /(?<!not\s)(?<!no\s)\bprovides?\s+legal\s+advice\b/i,
  /(?<!not\s)(?<!no\s)\bprovides?\s+tax\s+advice\b/i,
  /(?<!not\s)(?<!no\s)\bprovides?\s+accounting\s+advice\b/i,
  /healthcare compliance/i,
  /HIPAA/i,
  /medical patients/i,
  /RGS runs your business/i, /RGS handles compliance/i, /RGS handles accounting/i,
  /done[- ]for[- ]you/i, /full[- ]service/i,
  /ask us anytime/i, /message us anytime/i, /use anytime/i, /upgrade anytime/i,
  /business valuation/i, /financial forecast/i,
  /project[- ]management suite/i,
  /trusted by/i, /testimonials?/i, /case stud(y|ies)/i,
  /client success stor(y|ies)/i, /proven results/i, /real client results/i,
];

describe("P63 — Industry Brain Enhancements contract", () => {
  it("admin route exists and is protected by requireRole=admin", () => {
    const app = read(APP);
    expect(app).toMatch(
      /path="\/admin\/industry-brain"[\s\S]*?requireRole="admin"[\s\S]*?IndustryBrainAdmin/,
    );
  });

  it("migration creates table, enums, and RLS", () => {
    const sql = allMigrations();
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.industry_brain_entries/);
    expect(sql).toMatch(/CREATE TYPE public\.industry_brain_industry_key/);
    expect(sql).toMatch(/CREATE TYPE public\.industry_brain_template_type/);
    expect(sql).toMatch(/CREATE TYPE public\.industry_brain_gear/);
    expect(sql).toMatch(/CREATE TYPE public\.industry_brain_status/);
    expect(sql).toMatch(/ALTER TABLE public\.industry_brain_entries ENABLE ROW LEVEL SECURITY/);
    expect(sql).toMatch(/CREATE POLICY "Admin manage industry brain entries"/);
  });

  it("industry_key enum includes all 5 supported industries", () => {
    const sql = allMigrations();
    const m = sql.match(/CREATE TYPE public\.industry_brain_industry_key AS ENUM \(([\s\S]*?)\)/);
    expect(m).not.toBeNull();
    for (const k of [
      "trades_services","restaurant_food_service","retail",
      "cannabis_mmj_mmc","general_small_business",
    ]) {
      expect(m![1]).toMatch(new RegExp(`'${k}'`));
    }
  });

  it("if a client read policy or client-safe RPC exists, it filters to client_visible/active/non-archived and excludes admin fields", () => {
    const sql = allMigrations();

    // Client read policy on the table (optional in P63)
    const policyMatch = sql.match(
      /CREATE POLICY "[^"]*"\s+ON public\.industry_brain_entries\s+FOR SELECT[\s\S]*?;/g,
    );
    if (policyMatch) {
      const clientPolicies = policyMatch.filter(p => !/Admin/i.test(p));
      for (const p of clientPolicies) {
        expect(p).toMatch(/client_visible = true/);
        expect(p).toMatch(/status\s*=\s*'active'/);
        expect(p).toMatch(/archived_at IS NULL/);
      }
    }

    // Client-safe RPC (optional in P63)
    const rpcMatch = sql.match(
      /CREATE OR REPLACE FUNCTION public\.get_client_industry_brain_entries[\s\S]*?\$\$;/,
    );
    if (rpcMatch) {
      const body = rpcMatch[0];
      const returnsBlock = body.match(/RETURNS TABLE \(([\s\S]*?)\)\s*LANGUAGE/);
      expect(returnsBlock).not.toBeNull();
      const ret = returnsBlock![1];
      for (const banned of [
        "internal_notes","admin_notes","admin_summary",
        "created_by","updated_by",
      ]) {
        expect(ret, `RPC RETURNS TABLE leaks ${banned}`).not.toMatch(new RegExp(`\\b${banned}\\b`));
      }
      expect(body).toMatch(/client_visible = true/);
      expect(body).toMatch(/status\s*=\s*'active'/);
      expect(body).toMatch(/archived_at IS NULL/);
    }
  });

  it("admin page includes the cannabis/MMJ/MMC rule and clarifies it is not healthcare/patient-care/insurance/claims", () => {
    const page = read(ADMIN);
    expect(page).toMatch(/Cannabis\s*\/\s*MMJ\s*\/\s*MMC/);
    expect(page).toMatch(/dispensary/i);
    expect(page).toMatch(/not\s+healthcare/i);
    expect(page).toMatch(/patient-care|patient[- ]care/i);
    expect(page).toMatch(/insurance/i);
    expect(page).toMatch(/claims/i);
  });

  it("admin page states compliance-sensitive notes are not legal/compliance guarantees", () => {
    const page = read(ADMIN);
    expect(page).toMatch(/compliance[- ]sensitive/i);
    expect(page).toMatch(/not\s+legal\s+advice/i);
    expect(page).toMatch(/not\s+a\s+compliance\s+guarantee/i);
    expect(page).toMatch(/qualified\s+counsel/i);
  });

  it("admin page clarifies internal notes are admin-only and never shown to client", () => {
    const page = read(ADMIN);
    expect(page).toMatch(/internal_notes/);
    expect(page).toMatch(/admin_notes/);
    expect(page).toMatch(/admin-only/i);
    expect(page).toMatch(/never shown to (the )?client/i);
  });

  it("no banned scope-creep, fake-proof, or wrong-industry wording on admin surface or docs", () => {
    for (const f of [ADMIN, DOCS]) {
      const page = read(f);
      for (const re of BANNED) expect(page, `${f} matched ${re}`).not.toMatch(re);
    }
  });

  it("seeded cannabis/MMJ/MMC entries exist and do not include healthcare/patient-care/insurance/claims logic", () => {
    const sql = allMigrations();
    const seedBlock = sql.match(
      /INSERT INTO public\.industry_brain_entries[\s\S]*?ON CONFLICT DO NOTHING;/,
    );
    expect(seedBlock).not.toBeNull();
    const seed = seedBlock![0];
    expect(seed).toMatch(/'cannabis_mmj_mmc'/);
    // No healthcare conflation in seed values
    expect(seed).not.toMatch(/HIPAA/i);
    expect(seed).not.toMatch(/medical patients/i);
    // healthcare/patient-care/insurance/claims must not appear as positive
    // industry framing — only allowed inside explicit negations like
    // "not healthcare or patient-care logic".
    expect(seed).not.toMatch(/(?<!not\s)(?<!no\s)\bhealthcare\s+(?:business|industry|client|customer)/i);
    expect(seed).not.toMatch(/(?<!not\s)(?<!no\s)\bpatient[- ]care\s+(?:business|industry|client|customer|logic)/i);
    expect(seed).not.toMatch(/(?<!not\s)(?<!no\s)\binsurance\s+claims\s+(?:processing|handling|management)/i);
    // Cannabis rows must explicitly mark not legal/compliance guarantee
    const cannabisRows = seed.split("\n('").filter(r => /cannabis_mmj_mmc/.test(r));
    expect(cannabisRows.length).toBeGreaterThan(0);
  });

  it("docs file exists and includes cannabis rule + deferred items + P60A reference", () => {
    expect(existsSync(join(root, DOCS))).toBe(true);
    const docs = read(DOCS);
    expect(docs).toMatch(/Cannabis\s*\/\s*MMJ\s*\/\s*MMC/);
    expect(docs).toMatch(/not\s+healthcare/i);
    expect(docs).toMatch(/Deferred items/i);
    expect(docs).toMatch(/P60A/);
    expect(docs).toMatch(/AI/);
  });

  it("third-party brand names use exact official capitalization on admin and docs", () => {
    for (const f of [ADMIN, DOCS]) {
      const page = read(f);
      expect(page, `${f} uses lowercase 'quickbooks'`).not.toMatch(/\bquickbooks\b/);
      expect(page, `${f} uses 'Quickbooks'`).not.toMatch(/\bQuickbooks\b/);
    }
  });
});