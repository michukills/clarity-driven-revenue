import {
  ACTIVE_INDUSTRIES,
  DEFAULT_INDUSTRY_TOOL_ACCESS,
  INDUSTRY_PROFILE_TEMPLATES,
} from "@/lib/industryGuardrails";
import { TOOL_MATRIX, type ToolMatrixEntry } from "@/lib/toolMatrix";
import {
  INDUSTRY_LABEL,
  type IndustryKey,
  type ToolCatalogRow,
} from "@/lib/toolCatalog";

export type CoveragePackageKey = "diagnostic" | "implementation" | "revenue_control";

export type CategoryAccessRow = {
  tool_id: string;
  industry: IndustryKey;
  package_key?: string | null;
  enabled: boolean;
};

export type MetricCoverageGroup = {
  key: string;
  label: string;
  variables: string[];
};

export type PackageCoverage = {
  key: CoveragePackageKey;
  label: string;
  purpose: string;
  expectedToolKeys: string[];
  configuredToolKeys: string[];
  missingToolKeys: string[];
  coveragePct: number;
};

export type IndustryToolCoverage = {
  industry: Exclude<IndustryKey, "other">;
  label: string;
  metricGroups: MetricCoverageGroup[];
  evidenceSources: string[];
  defaultToolKeys: string[];
  configuredToolKeys: string[];
  configuredTools: ToolCatalogRow[];
  missingDefaultToolKeys: string[];
  packageCoverage: PackageCoverage[];
  independentVariableCount: number;
  coveragePct: number;
  regulated: boolean;
};

export const COVERAGE_PACKAGE_LANES: Array<{
  key: CoveragePackageKey;
  label: string;
  purpose: string;
  expectedToolKeys: string[];
}> = [
  {
    key: "diagnostic",
    label: "Diagnostic",
    purpose: "Find what is broken",
    expectedToolKeys: [
      "scorecard",
      "rgs_stability_scorecard",
      "revenue_leak_finder",
      "buyer_persona_tool",
      "customer_journey_mapper",
      "process_breakdown_tool",
    ],
  },
  {
    key: "implementation",
    label: "Implementation",
    purpose: "Fix the system",
    expectedToolKeys: [
      "implementation_foundation_system",
      "implementation_command_tracker",
      "priority_tasks",
      "client_service_requests",
      "evidence_uploads",
    ],
  },
  {
    key: "revenue_control",
    label: "Revenue Control",
    purpose: "Monitor stability after install",
    expectedToolKeys: [
      "revenue_tracker",
      "revenue_control_center",
      "revenue_risk_monitor",
      "quickbooks_sync_health",
      "weekly_alignment_system",
      "reports_and_reviews",
    ],
  },
];

export function metricGroupsForIndustry(
  industry: Exclude<IndustryKey, "other">,
): MetricCoverageGroup[] {
  const t = INDUSTRY_PROFILE_TEMPLATES[industry];
  return [
    { key: "revenue_streams", label: "Revenue streams", variables: t.revenue_streams },
    { key: "lead_demand_sources", label: "Lead / demand sources", variables: t.lead_demand_sources },
    { key: "conversion_bottlenecks", label: "Conversion variables", variables: t.conversion_bottlenecks },
    { key: "operational_bottlenecks", label: "Operational variables", variables: t.operational_bottlenecks },
    { key: "financial_visibility_risks", label: "Financial visibility", variables: t.financial_visibility_risks },
    { key: "owner_dependence_risks", label: "Owner-dependence risks", variables: t.owner_dependence_risks },
  ];
}

export function buildIndustryToolCoverage(
  tools: ToolCatalogRow[],
  accessRows: CategoryAccessRow[],
): IndustryToolCoverage[] {
  const toolById = new Map(tools.map((t) => [t.id, t]));
  const toolByKey = new Map(tools.map((t) => [t.tool_key, t]));
  const matrixKeys = new Set(TOOL_MATRIX.map((t: ToolMatrixEntry) => t.key));

  return ACTIVE_INDUSTRIES.map((industry) => {
    const configuredToolKeys = Array.from(
      new Set(
        accessRows
          .filter((r) => r.industry === industry && r.enabled)
          .map((r) => toolById.get(r.tool_id)?.tool_key)
          .filter((key): key is string => !!key),
      ),
    ).sort();
    const configuredSet = new Set(configuredToolKeys);
    const defaultToolKeys = DEFAULT_INDUSTRY_TOOL_ACCESS[industry];
    const missingDefaultToolKeys = defaultToolKeys.filter((key) => !configuredSet.has(key));
    const metricGroups = metricGroupsForIndustry(industry);

    const packageCoverage = COVERAGE_PACKAGE_LANES.map((lane) => {
      const expectedToolKeys = lane.expectedToolKeys.filter(
        (key) => toolByKey.has(key) || matrixKeys.has(key) || defaultToolKeys.includes(key),
      );
      const configuredToolKeysForLane = expectedToolKeys.filter((key) => configuredSet.has(key));
      const missingToolKeys = expectedToolKeys.filter((key) => !configuredSet.has(key));
      return {
        key: lane.key,
        label: lane.label,
        purpose: lane.purpose,
        expectedToolKeys,
        configuredToolKeys: configuredToolKeysForLane,
        missingToolKeys,
        coveragePct:
          expectedToolKeys.length === 0
            ? 100
            : Math.round((configuredToolKeysForLane.length / expectedToolKeys.length) * 100),
      };
    });

    const independentVariableCount = metricGroups.reduce(
      (sum, group) => sum + group.variables.length,
      0,
    );
    const expectedCount = defaultToolKeys.length;
    const configuredExpectedCount = defaultToolKeys.filter((key) => configuredSet.has(key)).length;

    return {
      industry,
      label: INDUSTRY_LABEL[industry],
      metricGroups,
      evidenceSources: INDUSTRY_PROFILE_TEMPLATES[industry].typical_evidence_sources,
      defaultToolKeys,
      configuredToolKeys,
      configuredTools: configuredToolKeys
        .map((key) => toolByKey.get(key))
        .filter((tool): tool is ToolCatalogRow => !!tool),
      missingDefaultToolKeys,
      packageCoverage,
      independentVariableCount,
      coveragePct: expectedCount === 0 ? 100 : Math.round((configuredExpectedCount / expectedCount) * 100),
      regulated: industry === "mmj_cannabis",
    };
  });
}
