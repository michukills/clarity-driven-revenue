import { supabase } from "@/integrations/supabase/client";

export type SwotCategory = "strength" | "weakness" | "opportunity" | "threat";

export type SwotItemStatus = "draft" | "active" | "reviewed" | "converted" | "archived";

export type SwotPriority = "low" | "normal" | "high" | "needs_attention";

export type SwotRelatedSourceType =
  | "owner_interview" | "diagnostic_tool" | "diagnostic_report" | "repair_map"
  | "implementation_roadmap" | "sop_training_bible" | "decision_rights"
  | "workflow_process_map" | "tool_training_tracker" | "revenue_risk_monitor"
  | "priority_action_tracker" | "owner_decision_dashboard" | "scorecard_history"
  | "monthly_system_review" | "tool_library" | "advisory_notes" | "other";

export type SwotRelatedGear =
  | "demand_generation" | "revenue_conversion" | "operational_efficiency"
  | "financial_visibility" | "owner_independence" | "general";

export type SwotServiceLane =
  | "diagnostic" | "implementation" | "rgs_control_system" | "revenue_control_system"
  | "admin_only" | "shared_support" | "report_only" | "public_pre_client";

export type SwotJourneyPhase =
  | "public_pre_client" | "paid_diagnostic" | "owner_interview" | "diagnostic_tools"
  | "admin_review" | "report_repair_map" | "implementation_planning"
  | "implementation_execution" | "training_handoff" | "rcs_ongoing_visibility"
  | "renewal_health_monitoring" | "internal_admin_operations";

export type SwotIndustryBehavior =
  | "all_industries_shared" | "industry_aware_copy" | "industry_aware_questions"
  | "industry_aware_outputs" | "industry_specific_benchmarks"
  | "industry_specific_templates" | "industry_restricted" | "general_fallback";

export interface AdminSwotItem {
  id: string;
  customer_id: string;
  title: string;
  swot_category: SwotCategory;
  status: SwotItemStatus;
  priority: SwotPriority;
  service_lane: SwotServiceLane;
  customer_journey_phase: SwotJourneyPhase;
  industry_behavior: SwotIndustryBehavior;
  related_tool_key: string | null;
  related_source_type: SwotRelatedSourceType | null;
  related_source_id: string | null;
  related_gear: SwotRelatedGear | null;
  client_visible_summary: string | null;
  client_visible_body: string | null;
  evidence_note: string | null;
  recommended_next_step: string | null;
  internal_notes: string | null;
  admin_notes: string | null;
  tags: unknown;
  client_visible: boolean;
  pinned: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface ClientSwotItem {
  id: string;
  title: string;
  swot_category: SwotCategory;
  priority: SwotPriority;
  service_lane: SwotServiceLane;
  customer_journey_phase: SwotJourneyPhase;
  industry_behavior: SwotIndustryBehavior;
  related_tool_key: string | null;
  related_source_type: SwotRelatedSourceType | null;
  related_source_id: string | null;
  related_gear: SwotRelatedGear | null;
  client_visible_summary: string | null;
  client_visible_body: string | null;
  evidence_note: string | null;
  recommended_next_step: string | null;
  tags: unknown;
  pinned: boolean;
  display_order: number;
  updated_at: string;
}

export const SWOT_CATEGORIES: SwotCategory[] = ["strength","weakness","opportunity","threat"];
export const SWOT_STATUSES: SwotItemStatus[] = ["draft","active","reviewed","converted","archived"];
export const SWOT_PRIORITIES: SwotPriority[] = ["low","normal","high","needs_attention"];
export const SWOT_SOURCE_TYPES: SwotRelatedSourceType[] = [
  "owner_interview","diagnostic_tool","diagnostic_report","repair_map",
  "implementation_roadmap","sop_training_bible","decision_rights",
  "workflow_process_map","tool_training_tracker","revenue_risk_monitor",
  "priority_action_tracker","owner_decision_dashboard","scorecard_history",
  "monthly_system_review","tool_library","advisory_notes","other",
];
export const SWOT_GEARS: SwotRelatedGear[] = [
  "demand_generation","revenue_conversion","operational_efficiency",
  "financial_visibility","owner_independence","general",
];
export const SWOT_LANES: SwotServiceLane[] = [
  "diagnostic","implementation","rgs_control_system","revenue_control_system",
  "admin_only","shared_support","report_only","public_pre_client",
];
export const SWOT_PHASES: SwotJourneyPhase[] = [
  "public_pre_client","paid_diagnostic","owner_interview","diagnostic_tools",
  "admin_review","report_repair_map","implementation_planning",
  "implementation_execution","training_handoff","rcs_ongoing_visibility",
  "renewal_health_monitoring","internal_admin_operations",
];
export const SWOT_INDUSTRIES: SwotIndustryBehavior[] = [
  "all_industries_shared","industry_aware_copy","industry_aware_questions",
  "industry_aware_outputs","industry_specific_benchmarks",
  "industry_specific_templates","industry_restricted","general_fallback",
];

export const SWOT_CATEGORY_LABEL: Record<SwotCategory, string> = {
  strength: "Strength",
  weakness: "Weakness",
  opportunity: "Opportunity",
  threat: "Threat",
};

export const SWOT_CATEGORY_PLURAL: Record<SwotCategory, string> = {
  strength: "Strengths to Preserve",
  weakness: "Weaknesses Creating Instability",
  opportunity: "Opportunities After Stabilization",
  threat: "Threats to Revenue / Control",
};

export const SWOT_STATUS_LABEL: Record<SwotItemStatus, string> = {
  draft: "Draft",
  active: "Active",
  reviewed: "Reviewed",
  converted: "Converted",
  archived: "Archived",
};

export const SWOT_PRIORITY_LABEL: Record<SwotPriority, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  needs_attention: "Needs attention",
};

export const SWOT_LANE_LABEL: Record<SwotServiceLane, string> = {
  diagnostic: "Diagnostic",
  implementation: "Implementation",
  rgs_control_system: "RGS Control System",
  revenue_control_system: "Revenue Control System",
  admin_only: "Admin only",
  shared_support: "Shared support",
  report_only: "Report",
  public_pre_client: "Public",
};

export const SWOT_PHASE_LABEL: Record<SwotJourneyPhase, string> = {
  public_pre_client: "Public",
  paid_diagnostic: "Paid diagnostic",
  owner_interview: "Owner interview",
  diagnostic_tools: "Diagnostic tools",
  admin_review: "Admin review",
  report_repair_map: "Report / repair map",
  implementation_planning: "Implementation planning",
  implementation_execution: "Implementation execution",
  training_handoff: "Training handoff",
  rcs_ongoing_visibility: "Ongoing visibility",
  renewal_health_monitoring: "Renewal / health monitoring",
  internal_admin_operations: "Internal admin",
};

export const SWOT_INDUSTRY_LABEL: Record<SwotIndustryBehavior, string> = {
  all_industries_shared: "All industries",
  industry_aware_copy: "Industry-aware copy",
  industry_aware_questions: "Industry-aware questions",
  industry_aware_outputs: "Industry-aware outputs",
  industry_specific_benchmarks: "Industry benchmarks",
  industry_specific_templates: "Industry templates",
  industry_restricted: "Industry restricted",
  general_fallback: "General fallback",
};

export const SWOT_GEAR_LABEL: Record<SwotRelatedGear, string> = {
  demand_generation: "Demand generation",
  revenue_conversion: "Revenue conversion",
  operational_efficiency: "Operational efficiency",
  financial_visibility: "Financial visibility",
  owner_independence: "Owner independence",
  general: "General",
};

export const SWOT_SOURCE_LABEL: Record<SwotRelatedSourceType, string> = {
  owner_interview: "Owner interview",
  diagnostic_tool: "Diagnostic tool",
  diagnostic_report: "Diagnostic report",
  repair_map: "Repair map",
  implementation_roadmap: "Implementation roadmap",
  sop_training_bible: "SOP / Training Bible",
  decision_rights: "Decision rights",
  workflow_process_map: "Workflow / process map",
  tool_training_tracker: "Tool / training tracker",
  revenue_risk_monitor: "Revenue & Risk Monitor",
  priority_action_tracker: "Priority Action Tracker",
  owner_decision_dashboard: "Owner Decision Dashboard",
  scorecard_history: "Scorecard history",
  monthly_system_review: "Monthly System Review",
  tool_library: "Tool Library",
  advisory_notes: "Advisory Notes",
  other: "Other",
};

export async function adminListSwotItems(customerId: string): Promise<AdminSwotItem[]> {
  const { data, error } = await (supabase as any)
    .from("swot_analysis_items")
    .select("*")
    .eq("customer_id", customerId)
    .order("swot_category", { ascending: true })
    .order("pinned", { ascending: false })
    .order("display_order", { ascending: true })
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as AdminSwotItem[];
}

export async function adminCreateSwotItem(
  customerId: string,
  patch: Partial<AdminSwotItem> & { title: string },
): Promise<AdminSwotItem> {
  const { data, error } = await (supabase as any)
    .from("swot_analysis_items")
    .insert({ customer_id: customerId, ...patch })
    .select("*")
    .single();
  if (error) throw error;
  return data as AdminSwotItem;
}

export async function adminUpdateSwotItem(
  id: string,
  patch: Partial<AdminSwotItem>,
): Promise<void> {
  const { error } = await (supabase as any)
    .from("swot_analysis_items").update(patch).eq("id", id);
  if (error) throw error;
}

export async function adminArchiveSwotItem(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from("swot_analysis_items")
    .update({ archived_at: new Date().toISOString(), status: "archived" })
    .eq("id", id);
  if (error) throw error;
}

export async function getClientSwotItems(customerId: string): Promise<ClientSwotItem[]> {
  const { data, error } = await (supabase as any).rpc(
    "get_client_swot_analysis_items",
    { _customer_id: customerId },
  );
  if (error) throw error;
  return (data ?? []) as ClientSwotItem[];
}
