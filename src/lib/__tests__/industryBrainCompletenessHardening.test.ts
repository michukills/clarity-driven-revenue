import { describe, it, expect } from "vitest";
import {
  ACTIVE_INDUSTRIES,
  DEFAULT_INDUSTRY_TOOL_ACCESS,
  INDUSTRY_PROFILE_TEMPLATES,
} from "../industryGuardrails";
import {
  buildIndustryToolCoverage,
  metricGroupsForIndustry,
  COVERAGE_PACKAGE_LANES,
  type CategoryAccessRow,
} from "../industryToolCoverage";
import type { ToolCatalogRow } from "../toolCatalog";

const ADMIN_ONLY_KEYS = new Set([
  "revenue_leak_finder",
  "buyer_persona_tool",
  "customer_journey_mapper",
  "process_breakdown_tool",
  "rgs_stability_scorecard",
]);

function tool(key: string): ToolCatalogRow {
  const adminOnly = ADMIN_ONLY_KEYS.has(key);
  return {
    id: `id-${key}`,
    tool_key: key,
    name: key,
    description: null,
    tool_type: adminOnly ? "diagnostic" : "tracking",
    default_visibility: adminOnly ? "admin_only" : "client_available",
    status: "active",
    route_path: null,
    icon_key: null,
    requires_industry: true,
    requires_active_client: true,
  };
}

const REQUIRED_DEEP_CATEGORIES = [
  "revenue_streams",
  "lead_demand_sources",
  "conversion_bottlenecks",
  "operational_bottlenecks",
  "financial_visibility_risks",
  "owner_dependence_risks",
  "staffing_labor",
  "customer_experience",
  "capacity_constraints",
  "margin_profitability",
  "industry_failure_points",
  "monitoring_signals",
  "evidence_sources",
] as const;

const HEALTHCARE_BANNED = [
  "hipaa",
  "patient care",
  "patient intake",
  "clinical workflow",
  "insurance claims",
  "medical billing",
  "healthcare",
];

describe("Industry Brain variable completeness hardening", () => {
  it("every active industry has all required deep categories with meaningful depth", () => {
    for (const industry of ACTIVE_INDUSTRIES) {
      const groups = metricGroupsForIndustry(industry);
      const groupByKey = new Map(groups.map((g) => [g.key, g]));
      for (const cat of REQUIRED_DEEP_CATEGORIES) {
        const g = groupByKey.get(cat);
        expect(g, `${industry} missing category ${cat}`).toBeTruthy();
        expect(
          g!.variables.length,
          `${industry}.${cat} too thin (${g!.variables.length})`,
        ).toBeGreaterThanOrEqual(8);
        // Reject duplicates within a single category.
        const set = new Set(g!.variables.map((v) => v.toLowerCase()));
        expect(set.size, `${industry}.${cat} has duplicates`).toBe(g!.variables.length);
      }
    }
  });

  it("organic search/traffic appears in lead/demand sources for every industry", () => {
    for (const industry of ACTIVE_INDUSTRIES) {
      const t = INDUSTRY_PROFILE_TEMPLATES[industry];
      const joined = t.lead_demand_sources.join(" | ").toLowerCase();
      expect(joined, `${industry} missing organic search/traffic`).toMatch(/organic/);
    }
  });

  it("each industry has industry-specific failure points (not all five identical)", () => {
    const fingerprints = ACTIVE_INDUSTRIES.map((i) =>
      INDUSTRY_PROFILE_TEMPLATES[i].industry_failure_points.join("|"),
    );
    expect(new Set(fingerprints).size).toBe(ACTIVE_INDUSTRIES.length);
  });

  it("cannabis stays cannabis/dispensary operations only — no healthcare logic", () => {
    const t = INDUSTRY_PROFILE_TEMPLATES.mmj_cannabis;
    // Exclude forbidden_assumptions, which legitimately negates these terms
    // ("RGS does NOT model healthcare/HIPAA/...").
    const { forbidden_assumptions: _fa, ...rest } = t;
    const haystack = JSON.stringify(rest).toLowerCase();
    for (const banned of HEALTHCARE_BANNED) {
      expect(haystack, `cannabis must not mention ${banned}`).not.toContain(banned);
    }
  });

  it("general_service template explicitly notes no healthcare vertical exists today", () => {
    const t = INDUSTRY_PROFILE_TEMPLATES.general_service;
    expect(t.forbidden_assumptions.join(" ").toLowerCase()).toContain("healthcare");
  });
});

describe("Industry tool/stage coverage hardening", () => {
  const allKeys = Array.from(
    new Set([
      ...Object.values(DEFAULT_INDUSTRY_TOOL_ACCESS).flat(),
      ...COVERAGE_PACKAGE_LANES.flatMap((l) => l.expectedToolKeys),
    ]),
  );
  const tools = allKeys.map(tool);

  function fullAccess(): CategoryAccessRow[] {
    const rows: CategoryAccessRow[] = [];
    for (const industry of ACTIVE_INDUSTRIES) {
      for (const key of DEFAULT_INDUSTRY_TOOL_ACCESS[industry]) {
        if (ADMIN_ONLY_KEYS.has(key)) continue;
        rows.push({ tool_id: `id-${key}`, industry, enabled: true, package_key: null });
      }
    }
    return rows;
  }

  it("Implementation lane is populated for every supported industry", () => {
    const coverage = buildIndustryToolCoverage(tools, fullAccess());
    for (const row of coverage) {
      const impl = row.packageCoverage.find((l) => l.key === "implementation")!;
      expect(impl.configuredToolKeys.length, `${row.industry} implementation blank`).toBeGreaterThan(0);
      expect(impl.hasMappedTools).toBe(true);
    }
  });

  it("Diagnostic lane is populated for every supported industry (admin-operated counts)", () => {
    const coverage = buildIndustryToolCoverage(tools, fullAccess());
    for (const row of coverage) {
      const diag = row.packageCoverage.find((l) => l.key === "diagnostic")!;
      expect(diag.configuredToolKeys.length, `${row.industry} diagnostic blank`).toBeGreaterThan(0);
    }
  });

  it("Revenue Control lane is populated unless intentionally restricted (cannabis RCC)", () => {
    const coverage = buildIndustryToolCoverage(tools, fullAccess());
    for (const row of coverage) {
      const rcs = row.packageCoverage.find((l) => l.key === "revenue_control")!;
      // mmj_cannabis intentionally restricts RCC/revenue_tracker but still
      // includes quickbooks_sync_health.
      expect(rcs.configuredToolKeys.length, `${row.industry} RCS lane blank`).toBeGreaterThan(0);
    }
  });

  it("a lane with zero mapped tools never reports 100% coverage", () => {
    // Synthesize: build coverage with no access rows AND remove admin-only
    // catalog rows so the diagnostic lane has nothing configured.
    const nonAdmin = tools.filter((t) => !ADMIN_ONLY_KEYS.has(t.tool_key));
    const coverage = buildIndustryToolCoverage(nonAdmin, []);
    for (const row of coverage) {
      for (const lane of row.packageCoverage) {
        if (!lane.hasMappedTools) {
          expect(lane.coveragePct, `${row.industry}.${lane.key} reported 100% on empty`).toBeLessThan(100);
          expect(lane.statusLabel.toLowerCase()).not.toContain("100%");
        }
      }
    }
  });
});