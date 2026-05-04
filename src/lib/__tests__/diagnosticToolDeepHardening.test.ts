import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { OWNER_INTERVIEW_SECTIONS, ownerInterviewProgress } from "../diagnostics/ownerInterview";

const APP_TSX = readFileSync(join(process.cwd(), "src/App.tsx"), "utf8");
const OWNER_INTERVIEW = readFileSync(
  join(process.cwd(), "src/pages/portal/tools/OwnerDiagnosticInterview.tsx"),
  "utf8",
);
const RPC_MIGRATION = readFileSync(
  join(process.cwd(), "supabase/migrations/20260503080947_7f5baf36-8995-4ff9-8e0d-8f04c9c287dd.sql"),
  "utf8",
);
const ADMIN_INTERVIEWS = readFileSync(join(process.cwd(), "src/pages/admin/DiagnosticInterviews.tsx"), "utf8");
const ADMIN_INTERVIEW_DETAIL = readFileSync(join(process.cwd(), "src/pages/admin/DiagnosticInterviewDetail.tsx"), "utf8");
const ADMIN_SCORECARD_LEADS = readFileSync(join(process.cwd(), "src/pages/admin/ScorecardLeads.tsx"), "utf8");
const ADMIN_SAVED_BENCH = readFileSync(join(process.cwd(), "src/pages/admin/SavedBenchmarks.tsx"), "utf8");
const ADMIN_DX_ORDERS = readFileSync(join(process.cwd(), "src/pages/admin/DiagnosticOrders.tsx"), "utf8");
const PORTAL_SCORECARD = readFileSync(join(process.cwd(), "src/pages/portal/Scorecard.tsx"), "utf8");

const FORBIDDEN = [
  "guaranteed",
  "guarantee results",
  "unlimited support",
  "unlimited consulting",
  "trusted by",
  "case study",
  "testimonial",
  "HIPAA",
  "tax advice",
  "legal advice",
  "accounting advice",
  "compliance advice",
  "lorem ipsum",
  "coming soon",
];

describe("Diagnostic Tool Deep Hardening", () => {
  it("Owner Diagnostic Interview is wrapped in ClientToolGuard", () => {
    expect(OWNER_INTERVIEW).toMatch(/ClientToolGuard\s+toolKey="owner_diagnostic_interview"/);
  });

  it("admin diagnostic routes remain admin-only in App.tsx", () => {
    const adminDiagRoutes = [
      "/admin/diagnostic-workspace",
      "/admin/diagnostic-orders",
      "/admin/diagnostic-interviews",
      "/admin/scorecard-leads",
      "/admin/saved-benchmarks",
      "/admin/report-drafts",
    ];
    for (const route of adminDiagRoutes) {
      const re = new RegExp(`path="${route}"[^>]*requireRole="admin"`);
      expect(APP_TSX).toMatch(re);
    }
  });

  it("Owner Interview catalogue covers diagnostic evidence themes", () => {
    const themes = [
      "biz_offer",          // primary offer/product/service
      "buyer_profile",      // customer/buyer
      "demand_sources",     // demand generation
      "sales_process",      // conversion process
      "lead_handling",      // lead handling
      "fulfillment_process", // fulfillment / service delivery
      "repeat_purchase",    // repeat / retention
      "ops_bottleneck",     // operational bottlenecks
      "fin_visibility",     // financial visibility
      "owner_decisions_only", // owner dependency
      "owner_already_tried", // what owner already tried
      "owner_first_slipped", // where it started slipping
      "current_tools",      // tools/software in use
      "industry_risks",     // industry-specific risks
    ];
    const keys = OWNER_INTERVIEW_SECTIONS.map((s) => s.key);
    for (const theme of themes) expect(keys).toContain(theme);
  });

  it("does not change the deterministic required-keys contract enforced by the RPC", () => {
    // Required client-side keys must match the RPC's v_required_keys array exactly.
    const required = OWNER_INTERVIEW_SECTIONS.filter((s) => s.required).map((s) => s.key).sort();
    const rpcRequired = [
      "biz_identity","biz_industry","biz_offer","biz_revenue_stage",
      "owner_problem_top","owner_what_changed","owner_already_tried",
      "demand_sources","demand_reliable","demand_unreliable",
      "sales_process","followup_process",
      "ops_bottleneck","ops_owner_dependent",
      "fin_visibility","fin_pricing_confidence",
      "owner_decisions_only","owner_key_person_risk",
    ].sort();
    expect(required).toEqual(rpcRequired);
    // RPC body must still contain the same array (no silent weakening).
    for (const key of rpcRequired) expect(RPC_MIGRATION).toContain(`'${key}'`);
  });

  it("interview progress helper still computes a percentage", () => {
    const empty = ownerInterviewProgress(new Map());
    expect(empty.requiredFilled).toBe(0);
    expect(empty.pct).toBe(0);
    const all = new Map(OWNER_INTERVIEW_SECTIONS.map((s) => [s.key, "answer"]));
    const full = ownerInterviewProgress(all);
    expect(full.requiredFilled).toBe(full.requiredTotal);
    expect(full.pct).toBe(100);
  });

  it("Owner Interview surface uses the premium header and guidance panel", () => {
    expect(OWNER_INTERVIEW).toContain("PremiumToolHeader");
    expect(OWNER_INTERVIEW).toContain("ToolGuidancePanel");
    expect(OWNER_INTERVIEW).toContain('lane="Diagnostic"');
  });

  it("contains no fake-proof, guarantee, or out-of-scope advice language", () => {
    const haystack = (OWNER_INTERVIEW + JSON.stringify(OWNER_INTERVIEW_SECTIONS)).toLowerCase();
    for (const term of FORBIDDEN) {
      expect(haystack.includes(term.toLowerCase())).toBe(false);
    }
  });

  it("admin diagnostic interviews list adds a scope/out-of-scope boundary", () => {
    expect(ADMIN_INTERVIEWS).toContain("DomainBoundary");
  });

  it("admin diagnostic interview detail keeps admin notes labeled as internal-only", () => {
    expect(ADMIN_INTERVIEW_DETAIL).toContain("DomainBoundary");
    expect(ADMIN_INTERVIEW_DETAIL.toLowerCase()).toContain("never shown to the client");
  });

  it("admin scorecard leads surface keeps deterministic-first language", () => {
    expect(ADMIN_SCORECARD_LEADS).toContain("DomainBoundary");
    expect(ADMIN_SCORECARD_LEADS).toMatch(/Deterministic scoring is the source of truth/);
  });

  it("admin saved benchmarks surface explicitly notes per-client tenant scoping", () => {
    expect(ADMIN_SAVED_BENCH.toLowerCase()).toContain("scoped per client");
    expect(ADMIN_SAVED_BENCH.toLowerCase()).toContain("never leak");
  });

  it("admin diagnostic orders does not change payment/access gates and surfaces this", () => {
    expect(ADMIN_DX_ORDERS.toLowerCase()).toContain("payment, fit, and access gates are not changed here");
  });

  it("portal scorecard uses calm loading and empty states instead of bare 'Loading…'", () => {
    expect(PORTAL_SCORECARD).toContain("ToolLoadingState");
    expect(PORTAL_SCORECARD).toContain("ToolEmptyState");
  });

  it("no forbidden language in any audited diagnostic surface", () => {
    const surfaces = [
      ADMIN_INTERVIEWS,
      ADMIN_INTERVIEW_DETAIL,
      ADMIN_SCORECARD_LEADS,
      ADMIN_SAVED_BENCH,
      ADMIN_DX_ORDERS,
      PORTAL_SCORECARD,
    ].join("\n").toLowerCase();
    for (const term of FORBIDDEN) {
      expect(surfaces.includes(term.toLowerCase())).toBe(false);
    }
  });
});