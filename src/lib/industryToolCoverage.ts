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
  /**
   * Tools intentionally excluded from this industry's default access
   * (e.g. RCC for mmj_cannabis). Not configuration gaps.
   */
  restrictedToolKeys: string[];
  /**
   * Tools covered without per-industry rows because they are admin-only
   * (admin-only tools never appear in tool_category_access).
   */
  adminOnlyToolKeys: string[];
  coveragePct: number;
  /**
   * True only when there are real expected tools for this lane and at least
   * one is configured (or admin-operated). False when the lane has no mapped
   * tools — used by the UI to avoid misleading "100%" badges on empty lanes.
   */
  hasMappedTools: boolean;
  /** Short label such as "Mapped tools", "Default tools mapped", "Needs mapping review". */
  statusLabel: string;
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
    { key: "staffing_labor", label: "Staffing / labor", variables: t.staffing_labor },
    { key: "customer_experience", label: "Customer experience / handoff", variables: t.customer_experience },
    { key: "capacity_constraints", label: "Capacity constraints", variables: t.capacity_constraints },
    { key: "margin_profitability", label: "Margin / profitability", variables: t.margin_profitability },
    { key: "industry_failure_points", label: "Industry-specific failure points", variables: t.industry_failure_points },
    { key: "monitoring_signals", label: "RGS Control System monitoring signals", variables: t.monitoring_signals },
    { key: "evidence_sources", label: "Software / evidence sources", variables: t.typical_evidence_sources },
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
    // A default tool counts as "missing" only if (a) it's a client-grantable
    // tool that should be in tool_category_access but isn't, AND (b) it's not
    // intentionally restricted for this industry. Admin-only tools never live
    // in tool_category_access and are covered by the catalog row alone.
    const isAdminOnlyInCatalog = (key: string): boolean => {
      const t = toolByKey.get(key);
      if (!t) return false;
      return (
        t.status === "active" &&
        (t.default_visibility === "admin_only" || t.tool_type === "admin_only")
      );
    };
    const missingDefaultToolKeys = defaultToolKeys.filter(
      (key) => !configuredSet.has(key) && !isAdminOnlyInCatalog(key),
    );
    const metricGroups = metricGroupsForIndustry(industry);

    const packageCoverage = COVERAGE_PACKAGE_LANES.map((lane) => {
      const expectedToolKeys = lane.expectedToolKeys.filter(
        (key) => toolByKey.has(key) || matrixKeys.has(key) || defaultToolKeys.includes(key),
      );
      const adminOnlyToolKeys = expectedToolKeys.filter(isAdminOnlyInCatalog);
      const restrictedToolKeys = expectedToolKeys.filter(
        (key) => !defaultToolKeys.includes(key) && !isAdminOnlyInCatalog(key),
      );
      const restrictedSet = new Set(restrictedToolKeys);
      const adminOnlySet = new Set(adminOnlyToolKeys);
      // "Configured" = enabled in tool_category_access OR admin-only catalog tool
      // (which is operated by RGS staff against any customer regardless of industry).
      const configuredToolKeysForLane = expectedToolKeys.filter(
        (key) => configuredSet.has(key) || adminOnlySet.has(key),
      );
      // A tool is a real gap only if it's expected, not configured, not admin-only,
      // and not intentionally restricted for this industry.
      const missingToolKeys = expectedToolKeys.filter(
        (key) =>
          !configuredSet.has(key) &&
          !adminOnlySet.has(key) &&
          !restrictedSet.has(key),
      );
      const denominator = expectedToolKeys.length - restrictedToolKeys.length;
      const hasMappedTools = configuredToolKeysForLane.length > 0;
      const statusLabel =
        denominator <= 0 && restrictedToolKeys.length > 0
          ? "Restricted for this industry"
          : !hasMappedTools
            ? "Needs mapping review"
            : configuredToolKeysForLane.length >= denominator
              ? "Default tools mapped"
              : `${configuredToolKeysForLane.length} of ${denominator} default tools mapped`;
      return {
        key: lane.key,
        label: lane.label,
        purpose: lane.purpose,
        expectedToolKeys,
        configuredToolKeys: configuredToolKeysForLane,
        missingToolKeys,
        restrictedToolKeys,
        adminOnlyToolKeys,
        coveragePct:
          denominator <= 0
            ? hasMappedTools
              ? 100
              : 0
            : Math.round((configuredToolKeysForLane.length / denominator) * 100),
        hasMappedTools,
        statusLabel,
      };
    });

    const independentVariableCount = metricGroups.reduce(
      (sum, group) => sum + group.variables.length,
      0,
    );
    // Default-coverage % counts admin-only catalog tools as covered, since they
    // are never represented in tool_category_access.
    const expectedCount = defaultToolKeys.length;
    const configuredExpectedCount = defaultToolKeys.filter(
      (key) => configuredSet.has(key) || isAdminOnlyInCatalog(key),
    ).length;

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
