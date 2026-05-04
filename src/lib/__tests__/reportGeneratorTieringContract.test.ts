import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  REPORT_TYPE_TEMPLATES,
  P65_REPORT_TIER_KEYS,
  P65_PUBLIC_OFFER_NAMES,
  isBoundedFiverrTier,
  getReportTypeTemplate,
} from "@/lib/reports/reportTypeTemplates";
import type { ReportDraftType } from "@/lib/reports/types";

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

const APP = "src/App.tsx";
const ADMIN_LIST = "src/pages/admin/ReportDrafts.tsx";
const ADMIN_DETAIL = "src/pages/admin/ReportDraftDetail.tsx";
const TEMPLATES = "src/lib/reports/reportTypeTemplates.ts";
const TYPES = "src/lib/reports/types.ts";
const DRAFT_SERVICE = "src/lib/reports/draftService.ts";
const DOCS = "docs/report-generator-tiering.md";

const allMigrations = () =>
  readdirSync(join(root, "supabase/migrations"))
    .filter((f) => f.endsWith(".sql"))
    .map((f) => readFileSync(join(root, "supabase/migrations", f), "utf8"))
    .join("\n");

// ─── Banned wording (client-facing surfaces / docs) ─────────────────────────
const BANNED: RegExp[] = [
  /unlimited support/i,
  /unlimited consulting/i,
  /unlimited advisory/i,
  /emergency support/i,
  /guaranteed (revenue|roi|results|improvement|stability|renewal|compliance|client success|outcomes?)/i,
  /compliance guaranteed/i,
  /keeps you compliant/i,
  /RGS keeps you compliant/i,
  /RGS runs your business/i,
  /RGS handles (implementation|accounting|compliance)/i,
  /done[- ]for[- ]you/i,
  /full[- ]service/i,
  /automatic financial review/i,
  /automatic compliance review/i,
  /business valuation/i,
  /financial forecast/i,
  /\blegal advice\b/i,
  /\btax advice\b/i,
  /\baccounting advice\b/i,
  /\bfinancial advice\b/i,
  /\bHR advice\b/i,
  /healthcare compliance/i,
  /patient care/i,
  /insurance claims/i,
  /\bHIPAA\b/i,
  /trusted by/i,
  /\btestimonials?\b/i,
  /\bcase stud(y|ies)\b/i,
  /client success stor(y|ies)/i,
  /proven results/i,
  /real client results/i,
];

describe("P65 — Report Generator Tiering: routes & access", () => {
  it("admin /admin/report-drafts builder route is protected by requireRole=admin", () => {
    const app = read(APP);
    expect(app).toMatch(
      /path="\/admin\/report-drafts"[\s\S]*?requireRole="admin"[\s\S]*?AdminReportDrafts/,
    );
  });

  it("admin /admin/report-drafts/:id detail route is protected by requireRole=admin", () => {
    const app = read(APP);
    expect(app).toMatch(
      /path="\/admin\/report-drafts\/:id"[\s\S]*?requireRole="admin"[\s\S]*?AdminReportDraftDetail/,
    );
  });

  it("customer-scoped alias /admin/customers/:customerId/reports exists and is admin-protected", () => {
    const app = read(APP);
    expect(app).toMatch(
      /path="\/admin\/customers\/:customerId\/reports"[\s\S]*?requireRole="admin"[\s\S]*?CustomerReportsAlias/,
    );
    // Alias redirects to the existing builder; no duplicate page is created.
    expect(app).toMatch(/CustomerReportsAlias[\s\S]*?\/admin\/report-drafts/);
  });
});

describe("P65 — migration adds the five tier values to report_drafts.report_type", () => {
  it("CHECK constraint on report_drafts.report_type accepts every P65 tier key", () => {
    const sql = allMigrations();
    expect(sql).toMatch(/report_drafts_report_type_check/);
    for (const tier of P65_REPORT_TIER_KEYS) {
      expect(sql, `tier ${tier} missing from migration`).toMatch(
        new RegExp(`'${tier}'`),
      );
    }
  });

  it("does not drop or replace the admin-only RLS policy on report_drafts", () => {
    const sql = allMigrations();
    expect(sql).not.toMatch(/DROP POLICY[\s\S]+report_drafts/i);
  });
});

describe("P65 — five RGS report tiers are defined", () => {
  const REQUIRED: ReportDraftType[] = [
    "full_rgs_diagnostic",
    "fiverr_basic_diagnostic",
    "fiverr_standard_diagnostic",
    "fiverr_premium_diagnostic",
    "implementation_report",
  ];

  it.each(REQUIRED)("tier %s exists in REPORT_TYPE_TEMPLATES", (key) => {
    expect(REPORT_TYPE_TEMPLATES[key]).toBeTruthy();
    expect(REPORT_TYPE_TEMPLATES[key].key).toBe(key);
  });

  it("public offer names match the spec", () => {
    expect(P65_PUBLIC_OFFER_NAMES.fiverr_basic_diagnostic).toBe(
      "Business Revenue Leak Snapshot",
    );
    expect(P65_PUBLIC_OFFER_NAMES.fiverr_standard_diagnostic).toBe(
      "Business Revenue & Operations Diagnostic",
    );
    expect(P65_PUBLIC_OFFER_NAMES.fiverr_premium_diagnostic).toBe(
      "Business Stability Diagnostic & Revenue Repair Map",
    );
    expect(P65_PUBLIC_OFFER_NAMES.full_rgs_diagnostic).toBe(
      "Full RGS Diagnostic",
    );
  });
});

describe("P65 — tier scope rules: Fiverr ≠ Full RGS Diagnostic", () => {
  it("Full RGS Diagnostic includes the full 0–1000 scorecard and full five-gear analysis", () => {
    const t = getReportTypeTemplate("full_rgs_diagnostic");
    expect(t.isFullRgsDiagnostic).toBe(true);
    expect(t.includesFullScorecard).toBe(true);
    expect(t.includesFullFiveGearAnalysis).toBe(true);
    expect(t.includesRgsStabilitySnapshot).toBe(true);
    expect(
      t.sections.some((s) => s.key === "full_business_stability_scorecard"),
    ).toBe(true);
    // Full five-gear sections must all be present.
    for (const gear of [
      "demand_generation_gear_analysis",
      "revenue_conversion_gear_analysis",
      "operational_efficiency_gear_analysis",
      "financial_visibility_gear_analysis",
      "owner_independence_gear_analysis",
    ]) {
      expect(t.sections.some((s) => s.key === gear)).toBe(true);
    }
  });

  it("Fiverr Basic excludes the full scorecard and full five-gear scoring", () => {
    const t = getReportTypeTemplate("fiverr_basic_diagnostic");
    expect(t.isFullRgsDiagnostic).toBe(false);
    expect(t.includesFullScorecard).toBe(false);
    expect(t.includesFullFiveGearAnalysis).toBe(false);
    expect(
      t.sections.some((s) => s.key === "full_business_stability_scorecard"),
    ).toBe(false);
  });

  it("Fiverr Standard excludes the full scorecard and the full implementation roadmap", () => {
    const t = getReportTypeTemplate("fiverr_standard_diagnostic");
    expect(t.isFullRgsDiagnostic).toBe(false);
    expect(t.includesFullScorecard).toBe(false);
    expect(
      t.sections.some((s) => s.key === "full_business_stability_scorecard"),
    ).toBe(false);
    expect(t.sections.some((s) => s.key === "implementation_roadmap")).toBe(
      false,
    );
    // Lite repair map is allowed.
    expect(t.includesPriorityRepairMap).toBe("lite");
  });

  it("Fiverr Premium includes RGS Stability Snapshot but is not the Full RGS Diagnostic", () => {
    const t = getReportTypeTemplate("fiverr_premium_diagnostic");
    expect(t.isFullRgsDiagnostic).toBe(false);
    expect(t.includesRgsStabilitySnapshot).toBe(true);
    expect(t.includesThirtySixtyNinetyRoadmap).toBe(true);
    // Fiverr Premium is bounded — no flagship full scorecard by default.
    expect(t.includesFullScorecard).toBe(false);
    expect(t.includesFullFiveGearAnalysis).toBe(false);
  });

  it("Implementation Report scaffold exists with implementation roadmap section", () => {
    const t = getReportTypeTemplate("implementation_report");
    expect(t.serviceLane).toBe("implementation");
    expect(t.sections.some((s) => s.key === "implementation_roadmap")).toBe(
      true,
    );
    expect(t.includesImplementationReadinessNotes).toBe(true);
  });

  it("isBoundedFiverrTier flags exactly the three Fiverr tiers", () => {
    expect(isBoundedFiverrTier("fiverr_basic_diagnostic")).toBe(true);
    expect(isBoundedFiverrTier("fiverr_standard_diagnostic")).toBe(true);
    expect(isBoundedFiverrTier("fiverr_premium_diagnostic")).toBe(true);
    expect(isBoundedFiverrTier("full_rgs_diagnostic")).toBe(false);
    expect(isBoundedFiverrTier("implementation_report")).toBe(false);
  });
});

describe("P65 — RGS Stability Snapshot language guard (P20.18–20 preserved)", () => {
  it("templates use the client-facing label 'RGS Stability Snapshot' (never 'SWOT Analysis')", () => {
    const tpl = read(TEMPLATES);
    expect(tpl).toMatch(/RGS Stability Snapshot/);
    // Allow the substring 'SWOT' inside admin/internal comments only — but
    // never as a section title or client-facing label.
    for (const tier of P65_REPORT_TIER_KEYS) {
      const t = REPORT_TYPE_TEMPLATES[tier];
      for (const s of t.sections) {
        expect(s.title).not.toMatch(/SWOT/i);
        expect(s.key).not.toMatch(/swot/i);
      }
    }
  });

  it("client-facing report renderer keeps the snapshot label as 'RGS Stability Snapshot'", () => {
    const engine = read("src/lib/reports/draftEngine.ts");
    expect(engine).toMatch(/label:\s*"RGS Stability Snapshot"/);
  });
});

describe("P65 — admin generator UI", () => {
  it("includes the five P65 tier values as selectable options", () => {
    const ui = read(ADMIN_LIST);
    for (const tier of P65_REPORT_TIER_KEYS) {
      expect(ui).toContain(`"${tier}"`);
    }
  });

  it("shows the bounded-Fiverr warning copy in the generator UI", () => {
    const ui = read(ADMIN_LIST);
    expect(ui).toMatch(
      /intentionally bounded[\s\S]*?Full RGS Diagnostic Report is selected/i,
    );
  });

  it("clarifies that AI-assisted drafts require admin review before client publish", () => {
    const ui = read(ADMIN_LIST);
    expect(ui).toMatch(/admin review/i);
    expect(ui).toMatch(/client[- ]?visible|client publish|client[- ]facing/i);
  });
});

describe("P65 — PDF export carries tier-specific scope + disclaimer", () => {
  it("ReportDraftDetail.downloadPdf appends the tier scope boundary and professional disclaimer", () => {
    const src = read(ADMIN_DETAIL);
    expect(src).toMatch(/getReportTypeTemplate/);
    expect(src).toMatch(/Scope Boundary/);
    expect(src).toMatch(/Professional Review Disclaimer/);
    // Existing admin-only gating must remain intact.
    expect(src).toMatch(/sections\.filter\(\(s\)\s*=>\s*s\.client_safe\)/);
    expect(src).toMatch(/appendStabilitySnapshotIfClientReady/);
  });
});

describe("P65 — no AI secrets shipped to the frontend", () => {
  it("no client-facing or admin file imports OPENAI/LOVABLE_API_KEY directly", () => {
    const files = [ADMIN_LIST, ADMIN_DETAIL, TEMPLATES, TYPES, DRAFT_SERVICE];
    for (const f of files) {
      const c = read(f);
      expect(c, `${f} must not embed AI provider secrets`).not.toMatch(
        /OPENAI_API_KEY|LOVABLE_API_KEY|ANTHROPIC_API_KEY|GEMINI_API_KEY/,
      );
      expect(c, `${f} must not call AI providers directly`).not.toMatch(
        /api\.openai\.com|api\.anthropic\.com|generativelanguage\.googleapis\.com/,
      );
    }
  });
});

describe("P65 — no banned scope-creep / fake-proof wording", () => {
  const FILES = [TEMPLATES, ADMIN_LIST, DOCS];
  for (const f of FILES) {
    it(`${f} is free of banned phrases`, () => {
      const c = read(f);
      // Strip line + block comments so internal explanatory comments
      // (e.g., describing what's banned) don't trip the scan.
      const stripped = c
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/^\s*\/\/.*$/gm, "");
      for (const re of BANNED) {
        // Allow negative disclaimers like "not legal advice" / "no HIPAA".
        // Match the term, then require it not be preceded by a negation.
        const matches = stripped.match(new RegExp(re.source, "gi")) || [];
        for (const m of matches) {
          const idx = stripped.toLowerCase().indexOf(m.toLowerCase());
          const window = stripped.slice(Math.max(0, idx - 60), idx).toLowerCase();
          const isNegated = /\b(no|not|never|without|excludes?|excluding|avoid|no\s+promise\s+of|does not (include|provide|certify|guarantee))\b[\s\S]{0,40}$/.test(
            window,
          );
          expect(
            isNegated,
            `Banned phrase "${m}" appears non-negated in ${f}: "…${stripped.slice(
              Math.max(0, idx - 40),
              idx + m.length + 10,
            )}…"`,
          ).toBe(true);
        }
      }
    });
  }
});

describe("P65 — docs exist and document tiers, routes, AI deferral, and snapshot rule", () => {
  it("docs/report-generator-tiering.md exists and covers required topics", () => {
    const c = read(DOCS);
    expect(c).toMatch(/Full RGS Diagnostic/);
    expect(c).toMatch(/Business Revenue Leak Snapshot/);
    expect(c).toMatch(/Business Revenue & Operations Diagnostic/);
    expect(c).toMatch(/Business Stability Diagnostic & Revenue Repair Map/);
    expect(c).toMatch(/Implementation Report/);
    expect(c).toMatch(/RGS Stability Snapshot/);
    expect(c).toMatch(/\/admin\/customers\/:customerId\/reports/);
    expect(c).toMatch(/deferred/i);
  });
});