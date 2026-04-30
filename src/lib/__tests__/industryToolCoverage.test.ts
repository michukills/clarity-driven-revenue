import { describe, expect, it } from "vitest";
import { ACTIVE_INDUSTRIES, DEFAULT_INDUSTRY_TOOL_ACCESS } from "../industryGuardrails";
import {
  COVERAGE_PACKAGE_LANES,
  buildIndustryToolCoverage,
  metricGroupsForIndustry,
  type CategoryAccessRow,
} from "../industryToolCoverage";
import type { ToolCatalogRow } from "../toolCatalog";

// Tools whose catalog rows are admin_only in production. Matches DB state for
// admin-operated diagnostic tools that never appear in tool_category_access.
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

describe("industry tool coverage", () => {
  const allExpectedKeys = Array.from(
    new Set([
      ...Object.values(DEFAULT_INDUSTRY_TOOL_ACCESS).flat(),
      ...COVERAGE_PACKAGE_LANES.flatMap((lane) => lane.expectedToolKeys),
    ]),
  );
  const tools = allExpectedKeys.map(tool);

  it("builds one coverage row for every active industry and excludes Other", () => {
    const coverage = buildIndustryToolCoverage(tools, []);
    expect(coverage.map((row) => row.industry)).toEqual(ACTIVE_INDUSTRIES);
    expect(coverage.map((row) => row.industry)).not.toContain("other");
  });

  it("keeps each industry metric profile detailed enough for independent review", () => {
    for (const industry of ACTIVE_INDUSTRIES) {
      const groups = metricGroupsForIndustry(industry);
      expect(groups).toHaveLength(6);
      expect(groups.every((group) => group.variables.length > 0)).toBe(true);
      expect(groups.flatMap((group) => group.variables).length).toBeGreaterThanOrEqual(15);
    }
  });

  it("reports configured industry tools and missing defaults", () => {
    const retailToolKeys = DEFAULT_INDUSTRY_TOOL_ACCESS.retail.slice(0, 3);
    const accessRows: CategoryAccessRow[] = retailToolKeys.map((key) => ({
      tool_id: `id-${key}`,
      industry: "retail",
      enabled: true,
      package_key: null,
    }));
    const retail = buildIndustryToolCoverage(tools, accessRows).find(
      (row) => row.industry === "retail",
    );
    expect(retail).toBeTruthy();
    expect(retail!.configuredToolKeys).toEqual(retailToolKeys.sort());
    // Admin-only defaults (e.g. rgs_stability_scorecard) shouldn't count as gaps,
    // but client-grantable defaults that aren't in access rows should.
    const stillMissing = DEFAULT_INDUSTRY_TOOL_ACCESS.retail.filter(
      (k) => !retailToolKeys.includes(k) && !ADMIN_ONLY_KEYS.has(k),
    );
    expect(retail!.missingDefaultToolKeys.sort()).toEqual(stillMissing.sort());
    expect(retail!.coveragePct).toBeLessThan(100);
  });

  it("shows 100 percent default coverage when every expected tool is enabled", () => {
    const accessRows: CategoryAccessRow[] = DEFAULT_INDUSTRY_TOOL_ACCESS.trade_field_service.map(
      (key) => ({
        tool_id: `id-${key}`,
        industry: "trade_field_service",
        enabled: true,
        package_key: null,
      }),
    );
    const trade = buildIndustryToolCoverage(tools, accessRows).find(
      (row) => row.industry === "trade_field_service",
    );
    expect(trade?.missingDefaultToolKeys).toEqual([]);
    expect(trade?.coveragePct).toBe(100);
  });

  it("breaks expected tools into package lanes for admin review", () => {
    const coverage = buildIndustryToolCoverage(tools, []);
    const retail = coverage.find((row) => row.industry === "retail")!;
    expect(retail.packageCoverage.map((lane) => lane.key)).toEqual([
      "diagnostic",
      "implementation",
      "revenue_control",
    ]);
    expect(retail.packageCoverage.find((lane) => lane.key === "diagnostic")?.expectedToolKeys)
      .toContain("revenue_leak_finder");
    expect(retail.packageCoverage.find((lane) => lane.key === "implementation")?.expectedToolKeys)
      .toContain("implementation_command_tracker");
    expect(retail.packageCoverage.find((lane) => lane.key === "revenue_control")?.expectedToolKeys)
      .toContain("revenue_control_center");
  });

  it("keeps MMJ/cannabis default access more restrictive than other industries", () => {
    expect(DEFAULT_INDUSTRY_TOOL_ACCESS.mmj_cannabis).not.toContain("revenue_control_center");
    expect(DEFAULT_INDUSTRY_TOOL_ACCESS.mmj_cannabis).toContain("quickbooks_sync_health");
  });

  it("does not flag admin-only diagnostic tools as missing configured access", () => {
    // Mirror the production DB: every default client-grantable tool is enabled
    // in tool_category_access for retail. Admin-only tools (revenue_leak_finder,
    // buyer_persona_tool, customer_journey_mapper, process_breakdown_tool,
    // rgs_stability_scorecard) are present only in tool_catalog.
    const accessRows: CategoryAccessRow[] = DEFAULT_INDUSTRY_TOOL_ACCESS.retail
      .filter((k) => !ADMIN_ONLY_KEYS.has(k))
      .map((key) => ({
        tool_id: `id-${key}`,
        industry: "retail",
        enabled: true,
        package_key: null,
      }));
    const retail = buildIndustryToolCoverage(tools, accessRows).find(
      (row) => row.industry === "retail",
    )!;
    expect(retail.missingDefaultToolKeys).toEqual([]);
    expect(retail.coveragePct).toBe(100);
    const diagnosticLane = retail.packageCoverage.find((l) => l.key === "diagnostic")!;
    // Previously these admin-only tools showed up as "Missing Configured Access"
    expect(diagnosticLane.missingToolKeys).not.toContain("revenue_leak_finder");
    expect(diagnosticLane.missingToolKeys).not.toContain("buyer_persona_tool");
    expect(diagnosticLane.missingToolKeys).not.toContain("customer_journey_mapper");
    expect(diagnosticLane.missingToolKeys).not.toContain("process_breakdown_tool");
    expect(diagnosticLane.adminOnlyToolKeys).toEqual(
      expect.arrayContaining([
        "revenue_leak_finder",
        "buyer_persona_tool",
        "customer_journey_mapper",
        "process_breakdown_tool",
      ]),
    );
    const revenueLane = retail.packageCoverage.find((l) => l.key === "revenue_control")!;
    // Client-visible RCC tools must remain configured (not missing) for retail.
    expect(revenueLane.missingToolKeys).not.toContain("revenue_tracker");
    expect(revenueLane.missingToolKeys).not.toContain("revenue_control_center");
    expect(revenueLane.missingToolKeys).not.toContain("revenue_risk_monitor");
  });

  it("treats RCC tools as restricted (not missing) for mmj_cannabis", () => {
    // Mirror DB: every default mmj_cannabis tool is enabled in tool_category_access.
    const accessRows: CategoryAccessRow[] = DEFAULT_INDUSTRY_TOOL_ACCESS.mmj_cannabis
      .filter((k) => !ADMIN_ONLY_KEYS.has(k))
      .map((key) => ({
        tool_id: `id-${key}`,
        industry: "mmj_cannabis",
        enabled: true,
        package_key: null,
      }));
    const mmj = buildIndustryToolCoverage(tools, accessRows).find(
      (row) => row.industry === "mmj_cannabis",
    )!;
    expect(mmj.missingDefaultToolKeys).toEqual([]);
    const revenueLane = mmj.packageCoverage.find((l) => l.key === "revenue_control")!;
    // RCC, revenue_tracker, revenue_risk_monitor are intentionally restricted
    // for cannabis — they must NOT be reported as missing configured access.
    expect(revenueLane.missingToolKeys).not.toContain("revenue_control_center");
    expect(revenueLane.missingToolKeys).not.toContain("revenue_tracker");
    expect(revenueLane.missingToolKeys).not.toContain("revenue_risk_monitor");
    expect(revenueLane.restrictedToolKeys).toEqual(
      expect.arrayContaining(["revenue_control_center", "revenue_tracker", "revenue_risk_monitor"]),
    );
    // quickbooks_sync_health is in cannabis defaults and configured -> not missing.
    expect(revenueLane.missingToolKeys).not.toContain("quickbooks_sync_health");
  });
});
