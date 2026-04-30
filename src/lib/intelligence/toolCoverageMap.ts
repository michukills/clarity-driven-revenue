// P20.3 — Tool coverage map per industry.
//
// Pure data. Pairs with industryToolCoverage.ts (admin coverage analysis).
// Each entry declares the gear, package availability, required data, output
// type and visibility. Admin-only tools must NEVER be exposed to clients.

import type { IndustryCategory } from "@/lib/priorityEngine/types";
import type { ToolCoverageEntry } from "./types";

const T = (e: ToolCoverageEntry): ToolCoverageEntry => e;

export const TOOL_COVERAGE_MAP: ToolCoverageEntry[] = [
  // Trades
  T({
    tool_key: "revenue_leak_finder",
    industry: "trade_field_service",
    gear: 4,
    packages: ["diagnostic"],
    required_data: ["estimates", "invoices"],
    output_type: "report",
    visibility: "admin_only",
  }),
  T({
    tool_key: "implementation_command_tracker",
    industry: "trade_field_service",
    gear: 3,
    packages: ["implementation"],
    required_data: ["jobs"],
    output_type: "checklist",
    visibility: "admin_only",
  }),
  T({
    tool_key: "revenue_control_center",
    industry: "trade_field_service",
    gear: 4,
    packages: ["revenue_control"],
    required_data: ["invoices", "payments"],
    output_type: "dashboard",
    visibility: "client_visible",
  }),
  T({
    tool_key: "quickbooks_sync_health",
    industry: "trade_field_service",
    gear: 4,
    packages: ["revenue_control"],
    required_data: ["invoices"],
    output_type: "alert",
    visibility: "client_visible",
  }),

  // Restaurant
  T({
    tool_key: "revenue_leak_finder",
    industry: "restaurant",
    gear: 4,
    packages: ["diagnostic"],
    required_data: ["daily_sales", "food_cost", "labor_cost"],
    output_type: "report",
    visibility: "admin_only",
  }),
  T({
    tool_key: "revenue_control_center",
    industry: "restaurant",
    gear: 4,
    packages: ["revenue_control"],
    required_data: ["daily_sales"],
    output_type: "dashboard",
    visibility: "client_visible",
  }),

  // Retail
  T({
    tool_key: "revenue_leak_finder",
    industry: "retail",
    gear: 4,
    packages: ["diagnostic"],
    required_data: ["product_sales", "inventory", "cost_of_goods"],
    output_type: "report",
    visibility: "admin_only",
  }),
  T({
    tool_key: "revenue_control_center",
    industry: "retail",
    gear: 4,
    packages: ["revenue_control"],
    required_data: ["product_sales", "inventory"],
    output_type: "dashboard",
    visibility: "client_visible",
  }),

  // Medical / MMC
  T({
    tool_key: "revenue_leak_finder",
    industry: "mmj_cannabis",
    gear: 4,
    packages: ["diagnostic"],
    required_data: ["billable_services", "billing_status"],
    output_type: "report",
    visibility: "admin_only",
  }),
  T({
    tool_key: "quickbooks_sync_health",
    industry: "mmj_cannabis",
    gear: 4,
    packages: ["revenue_control"],
    required_data: ["billing_status"],
    output_type: "alert",
    visibility: "client_visible",
  }),

  // General / Mixed (universal only)
  T({
    tool_key: "scorecard",
    industry: "general_service",
    gear: 4,
    packages: ["diagnostic"],
    required_data: [],
    output_type: "score",
    visibility: "client_visible",
  }),
];

export function toolsForIndustry(industry: IndustryCategory): ToolCoverageEntry[] {
  return TOOL_COVERAGE_MAP.filter((t) => t.industry === industry);
}

export function clientVisibleToolsForIndustry(industry: IndustryCategory): ToolCoverageEntry[] {
  return toolsForIndustry(industry).filter((t) => t.visibility === "client_visible");
}
