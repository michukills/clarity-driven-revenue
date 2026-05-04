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

const ADMIN_CUSTOMER = "src/pages/admin/ClientHealthAdmin.tsx";
const ADMIN_OVERVIEW = "src/pages/admin/ClientHealthOverview.tsx";
const APP = "src/App.tsx";

const BANNED: RegExp[] = [
  /unlimited support/i, /unlimited consulting/i, /unlimited advisory/i,
  /emergency support/i,
  /guaranteed (renewal|retention|client success|churn prevention|outcomes?|results)/i,
  /automatic renewal recovery/i, /automatic client rescue/i,
  /RGS guarantees outcomes/i, /RGS runs your business/i,
  /done[- ]for[- ]you/i, /full[- ]service/i,
  /force[d]? renewal/i, /automatic upsell/i,
  /client success guaranteed/i, /proven retention/i, /proven results/i,
  /real client results/i,
  /trusted by/i, /testimonials?/i, /case stud(y|ies)/i,
  /client success stor(y|ies)/i,
  /business valuation/i, /financial forecast/i,
  /\blegal advice\b/i, /\btax advice\b/i, /\baccounting advice\b/i,
  /compliance guaranteed/i, /keeps you compliant/i,
  /healthcare compliance/i, /patient care/i, /insurance claims/i, /HIPAA/i,
];

describe("P64 — Client Health / Renewal Risk contract", () => {
  it("admin overview route is protected by requireRole=admin", () => {
    const app = read(APP);
    expect(app).toMatch(
      /path="\/admin\/client-health"[\s\S]*?requireRole="admin"[\s\S]*?ClientHealthOverview/,
    );
  });

  it("customer-scoped admin route is protected by requireRole=admin", () => {
    const app = read(APP);
    expect(app).toMatch(
      /path="\/admin\/customers\/:customerId\/client-health"[\s\S]*?requireRole="admin"[\s\S]*?ClientHealthAdmin/,
    );
  });

  it("migration creates table, enums, and RLS", () => {
    const sql = allMigrations();
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.client_health_records/);
    expect(sql).toMatch(/CREATE TYPE public\.client_health_status/);
    expect(sql).toMatch(/CREATE TYPE public\.client_renewal_risk_level/);
    expect(sql).toMatch(/CREATE TYPE public\.client_engagement_status/);
    expect(sql).toMatch(/CREATE TYPE public\.client_health_admin_action_type/);
    expect(sql).toMatch(/CREATE TYPE public\.client_health_record_status/);
    expect(sql).toMatch(/CREATE TYPE public\.client_health_related_source_type/);
    expect(sql).toMatch(/ALTER TABLE public\.client_health_records ENABLE ROW LEVEL SECURITY/);
    expect(sql).toMatch(/CREATE POLICY "Admin manage client health records"/);
  });

  it("admin policy uses is_admin and there is no client read policy", () => {
    const sql = allMigrations();
    const adminPol = sql.match(
      /CREATE POLICY "Admin manage client health records"[\s\S]*?;/,
    );
    expect(adminPol).not.toBeNull();
    expect(adminPol![0]).toMatch(/public\.is_admin\(auth\.uid\(\)\)/);
    // No client read policy on this table
    expect(sql).not.toMatch(/CREATE POLICY[^"]*"[^"]*client[^"]*"\s+ON public\.client_health_records FOR SELECT/i);
  });

  it("no client-facing route is registered for this tool in P64", () => {
    const app = read(APP);
    expect(app).not.toMatch(/portal\/tools\/client-health/);
    expect(app).not.toMatch(/portal\/tools\/renewal-risk/);
  });

  it("admin pages clarify admin-only and that internal notes are never shown to client", () => {
    for (const f of [ADMIN_CUSTOMER, ADMIN_OVERVIEW]) {
      const page = read(f);
      expect(page, `${f} mentions admin-only`).toMatch(/admin-only/i);
      expect(page, `${f} mentions never shown to client`).toMatch(/never shown to (the )?client/i);
    }
    const customer = read(ADMIN_CUSTOMER);
    expect(customer).toMatch(/internal_notes/);
    expect(customer).toMatch(/admin_notes/);
  });

  it("admin pages state this does not guarantee outcomes and does not change payment/access gates", () => {
    for (const f of [ADMIN_CUSTOMER, ADMIN_OVERVIEW]) {
      const page = read(f);
      expect(page, `${f} mentions does not guarantee`).toMatch(
        /does not guarantee renewal[\s\S]{0,80}outcomes/i,
      );
      expect(page, `${f} mentions does not change payment or access gates`).toMatch(
        /does not change payment or access gates/i,
      );
    }
  });

  it("no banned scope-creep or fake-proof wording on admin surfaces", () => {
    for (const f of [ADMIN_CUSTOMER, ADMIN_OVERVIEW]) {
      const page = read(f);
      for (const re of BANNED) expect(page, `${f} matched ${re}`).not.toMatch(re);
    }
  });

  it("docs file exists", () => {
    expect(existsSync(join(root, "docs/client-health-renewal-risk.md"))).toBe(true);
  });

  it("CustomerDetail exposes a Client Health button for the admin route", () => {
    const cd = read("src/pages/admin/CustomerDetail.tsx");
    expect(cd).toMatch(/\/admin\/customers\/\$\{c\.id\}\/client-health/);
    expect(cd).toMatch(/Client Health/);
  });

  it("library exposes admin CRUD without client-facing helpers", () => {
    const lib = read("src/lib/clientHealth.ts");
    expect(lib).toMatch(/adminListClientHealthRecords/);
    expect(lib).toMatch(/adminCreateClientHealthRecord/);
    expect(lib).toMatch(/adminUpdateClientHealthRecord/);
    expect(lib).toMatch(/adminArchiveClientHealthRecord/);
    expect(lib).not.toMatch(/clientList|getClientFacing|portal/);
  });
});
