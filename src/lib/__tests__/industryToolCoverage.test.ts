import { describe, expect, it } from "vitest";
import { ACTIVE_INDUSTRIES, DEFAULT_INDUSTRY_TOOL_ACCESS } from "../industryGuardrails";
import {
  COVERAGE_PACKAGE_LANES,
  buildIndustryToolCoverage,
  metricGroupsForIndustry,
  type CategoryAccessRow,
} from "../industryToolCoverage";
import type { ToolCatalogRow } from "../toolCatalog";

function tool(key: string): ToolCatalogRow {
  return {
    id: `id-${key}`,
    tool_key: key,
    name: key,
    description: null,
    tool_type: "tracking",
    default_visibility: "client_available",
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
    expect(retail!.missingDefaultToolKeys.length).toBeGreaterThan(0);
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
});
