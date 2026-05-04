/**
 * Industry Brain Variable Completeness — depth + coverage contract.
 *
 * Asserts that the structured `INDUSTRY_BRAIN_CATALOG` provides
 * consultant-grade variable coverage across every supported industry
 * and every required category, not just thin lists or duplicated
 * filler.
 *
 * Also asserts:
 *   - obvious demand sources (organic traffic, Google Business Profile,
 *     referrals, repeat customers) are present where expected
 *   - cannabis variables stay dispensary / regulated cannabis
 *     operations only — never healthcare/HIPAA/patient-care/insurance
 *     claims/medical billing/clinical workflows
 *   - "medical" only appears in the cannabis/MMJ sense
 *   - third-party brand names use exact official capitalization
 *   - the admin Industry Brain Catalog Panel renders the structured
 *     catalog (search + collapsible groups + scrollable lists)
 *   - the admin route remains protected
 *   - the structured catalog is not exposed to the customer portal
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CATALOG_CATEGORIES,
  INDUSTRY_BRAIN_CATALOG,
  totalVariablesForIndustry,
  type CatalogCategoryKey,
} from "@/lib/industryBrainCatalog";
import { INDUSTRY_KEYS, type IndustryKey } from "@/lib/industryBrain";

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

// Categories that must be especially deep on every industry. Some
// categories (e.g. industry_specific_failure_points) can be slightly
// smaller because they are intentionally narrow.
const DEEP_CATEGORIES: CatalogCategoryKey[] = [
  "revenue_streams",
  "lead_demand_sources",
  "conversion_variables",
  "operational_variables",
  "financial_visibility",
  "owner_dependence_risks",
  "staffing_labor",
  "customer_experience_handoff",
  "software_evidence_sources",
  "capacity_constraints",
  "margin_profitability",
  "repair_map_implications",
  "tool_report_mappings",
  "rgs_control_system_signals",
];

// Demand sources we expect to see on every industry that has any
// digital presence (which is all of them).
const REQUIRED_DEMAND_SUBSTRINGS = [
  /organic search|organic traffic/i,
  /direct traffic/i,
  /referral/i,
  /repeat customer/i,
];

describe("Industry Brain — variable completeness", () => {
  it("has all 5 supported industries in the catalog", () => {
    for (const k of INDUSTRY_KEYS) {
      expect(INDUSTRY_BRAIN_CATALOG[k], `missing industry ${k}`).toBeTruthy();
    }
  });

  it("each industry has all 15 required categories", () => {
    for (const k of INDUSTRY_KEYS) {
      const cat = INDUSTRY_BRAIN_CATALOG[k];
      for (const c of CATALOG_CATEGORIES) {
        expect(cat[c], `${k} missing category ${c}`).toBeTruthy();
      }
    }
  });

  it("each industry has consultant-grade total depth (>= 150 variables)", () => {
    for (const k of INDUSTRY_KEYS) {
      const total = totalVariablesForIndustry(k);
      expect(total, `${k} total variables`).toBeGreaterThanOrEqual(150);
    }
  });

  it("each deep category has at least 8 variables per industry", () => {
    for (const k of INDUSTRY_KEYS) {
      const cat = INDUSTRY_BRAIN_CATALOG[k];
      for (const c of DEEP_CATEGORIES) {
        expect(cat[c].length, `${k}.${c} too thin`).toBeGreaterThanOrEqual(8);
      }
    }
  });

  it("industry_specific_failure_points has at least 8 entries per industry", () => {
    for (const k of INDUSTRY_KEYS) {
      const items = INDUSTRY_BRAIN_CATALOG[k].industry_specific_failure_points;
      expect(items.length, `${k} failure points`).toBeGreaterThanOrEqual(8);
    }
  });

  it("variables are not duplicated within a category", () => {
    for (const k of INDUSTRY_KEYS) {
      const cat = INDUSTRY_BRAIN_CATALOG[k];
      for (const c of CATALOG_CATEGORIES) {
        const items = cat[c];
        const set = new Set(items.map((s) => s.toLowerCase()));
        expect(set.size, `${k}.${c} has duplicates`).toBe(items.length);
      }
    }
  });

  it("lead/demand sources include organic traffic and other obvious channels per industry", () => {
    for (const k of INDUSTRY_KEYS) {
      const items = INDUSTRY_BRAIN_CATALOG[k].lead_demand_sources.join(" | ");
      for (const re of REQUIRED_DEMAND_SUBSTRINGS) {
        expect(re.test(items), `${k} missing demand source ${re}`).toBe(true);
      }
    }
  });

  it("trades / restaurant / retail / cannabis / general all have industry-specific variables", () => {
    const expectations: Array<[IndustryKey, RegExp[]]> = [
      [
        "trades_services",
        [/dispatch|technician|crew|service-area|callback/i, /AR aging|job-level/i],
      ],
      [
        "restaurant_food_service",
        [/prime cost|food cost|line\s*\/\s*station|ticket time/i, /menu margin|comp/i],
      ],
      [
        "retail",
        [/SKU|sell-through|basket size|stockout|merchandising/i, /shrink|markdown/i],
      ],
      [
        "cannabis_mmj_mmc",
        [/budtender|dispensary|inventory traceability|state traceability|menu|cash handling/i, /purchase[- ]limit|ID and age|Metrc|BioTrack/i],
      ],
      [
        "general_small_business",
        [/recurring|repeat[- ]customer|forecast vs actual|service line/i],
      ],
    ];
    for (const [k, regs] of expectations) {
      const blob = CATALOG_CATEGORIES.flatMap((c) => INDUSTRY_BRAIN_CATALOG[k][c]).join(" | ");
      for (const r of regs) {
        expect(r.test(blob), `${k} missing industry-specific signal ${r}`).toBe(true);
      }
    }
  });

  it("cannabis variables stay dispensary/operations only — no healthcare/HIPAA/patient-care/insurance claims/medical billing/clinical workflows", () => {
    const blob = CATALOG_CATEGORIES.flatMap(
      (c) => INDUSTRY_BRAIN_CATALOG.cannabis_mmj_mmc[c],
    ).join(" | ");
    expect(blob).not.toMatch(/HIPAA/i);
    expect(blob).not.toMatch(/medical billing/i);
    expect(blob).not.toMatch(/patient[- ]care/i);
    expect(blob).not.toMatch(/patient intake/i);
    expect(blob).not.toMatch(/clinical workflow/i);
    expect(blob).not.toMatch(/insurance claim/i);
    expect(blob).not.toMatch(/healthcare provider/i);
    // Allowed: "medical marijuana" and "MMJ" framing.
    expect(blob).toMatch(/medical marijuana|MMJ/);
    // And cannabis must not certify compliance.
    expect(blob).toMatch(/state-specific rules may apply/i);
    expect(blob).toMatch(/not legal advice/i);
    expect(blob).toMatch(/not a compliance guarantee/i);
    expect(blob).not.toMatch(/keeps you compliant|compliance guaranteed/i);
  });

  it('the word "medical" only appears in the cannabis/MMJ sense across the catalog', () => {
    for (const k of INDUSTRY_KEYS) {
      for (const c of CATALOG_CATEGORIES) {
        for (const v of INDUSTRY_BRAIN_CATALOG[k][c]) {
          if (!/medical/i.test(v)) continue;
          expect(
            /medical marijuana|MMJ/i.test(v),
            `${k}.${c} variable "${v}" uses "medical" outside the cannabis/MMJ sense`,
          ).toBe(true);
        }
      }
    }
  });

  it("third-party brand names use exact official capitalization in catalog text", () => {
    const blob = INDUSTRY_KEYS.flatMap((k) =>
      CATALOG_CATEGORIES.flatMap((c) => INDUSTRY_BRAIN_CATALOG[k][c]),
    ).join(" | ");
    // Must not appear in lowercase / wrong casing.
    expect(blob).not.toMatch(/\bquickbooks\b/);
    expect(blob).not.toMatch(/\bQuickbooks\b/);
    expect(blob).not.toMatch(/\bxero\b/);
    expect(blob).not.toMatch(/\bstripe\b/);
    expect(blob).not.toMatch(/\bsquare\b/);
    expect(blob).not.toMatch(/\bpaypal\b/);
    expect(blob).not.toMatch(/\bservicetitan\b/i);
    expect(blob).not.toMatch(/\bhousecall pro\b/i);
    // And the official forms must appear at least once.
    expect(blob).toMatch(/QuickBooks/);
    expect(blob).toMatch(/Xero/);
    expect(blob).toMatch(/Stripe/);
    expect(blob).toMatch(/PayPal/);
    expect(blob).toMatch(/Google Analytics/);
    expect(blob).toMatch(/Google Search Console/);
    expect(blob).toMatch(/Google Business Profile/);
  });

  it("admin Industry Brain Catalog Panel exists with search + collapse + scroll", () => {
    const src = read("src/components/admin/IndustryBrainCatalogPanel.tsx");
    expect(src).toMatch(/INDUSTRY_BRAIN_CATALOG/);
    expect(src).toMatch(/aria-label="Search variables"/);
    expect(src).toMatch(/Expand all|Collapse all/);
    // overflow-y-auto on the variable list keeps cards readable.
    expect(src).toMatch(/overflow-y-auto/);
    expect(src).toMatch(/aria-expanded/);
  });

  it("the admin Industry Brain page renders the catalog panel", () => {
    const page = read("src/pages/admin/IndustryBrainAdmin.tsx");
    expect(page).toMatch(/IndustryBrainCatalogPanel/);
  });

  it("the admin route remains protected by requireRole='admin'", () => {
    const app = read("src/App.tsx");
    expect(app).toMatch(
      /path="\/admin\/industry-brain"[\s\S]*?requireRole="admin"[\s\S]*?IndustryBrainAdmin/,
    );
  });

  it("Industry Brain catalog is not exposed in the customer portal", () => {
    const portalShell = read("src/components/portal/PortalShell.tsx");
    expect(portalShell).not.toMatch(/IndustryBrainCatalogPanel/);
    expect(portalShell).not.toMatch(/href="\/portal\/industry-brain"/);
  });
});