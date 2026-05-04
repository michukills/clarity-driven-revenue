import { supabase } from "@/integrations/supabase/client";

export type AdvisoryNoteStatus =
  | "draft" | "open" | "client_response_needed" | "client_responded"
  | "reviewed" | "closed" | "archived";

export type AdvisoryNoteType =
  | "advisory_note" | "clarification_request" | "client_clarification_response"
  | "report_walkthrough_note" | "implementation_note" | "rgs_control_system_note"
  | "scope_boundary_note" | "follow_up_item" | "other";

export type AdvisoryNotePriority = "low" | "normal" | "high" | "needs_attention";

export type AdvisoryRelatedSourceType =
  | "owner_interview" | "diagnostic_tool" | "diagnostic_report" | "repair_map"
  | "implementation_roadmap" | "sop_training_bible" | "decision_rights"
  | "workflow_process_map" | "tool_training_tracker" | "revenue_risk_monitor"
  | "priority_action_tracker" | "owner_decision_dashboard" | "scorecard_history"
  | "monthly_system_review" | "tool_library" | "other";

export type AdvisoryRelatedGear =
  | "demand_generation" | "revenue_conversion" | "operational_efficiency"
  | "financial_visibility" | "owner_independence" | "general";

export type AdvisoryServiceLane =
  | "diagnostic" | "implementation" | "rgs_control_system" | "revenue_control_system"
  | "admin_only" | "shared_support" | "report_only" | "public_pre_client";

export type AdvisoryJourneyPhase =
  | "public_pre_client" | "paid_diagnostic" | "owner_interview" | "diagnostic_tools"
  | "admin_review" | "report_repair_map" | "implementation_planning"
  | "implementation_execution" | "training_handoff" | "rcs_ongoing_visibility"
  | "renewal_health_monitoring" | "internal_admin_operations";

export type AdvisoryIndustryBehavior =
  | "all_industries_shared" | "industry_aware_copy" | "industry_aware_questions"
  | "industry_aware_outputs" | "industry_specific_benchmarks"
  | "industry_specific_templates" | "industry_restricted" | "general_fallback";

export interface AdminAdvisoryEntry {
  id: string;
  customer_id: string;
  title: string;
  note_type: AdvisoryNoteType;
  status: AdvisoryNoteStatus;
  priority: AdvisoryNotePriority;
  service_lane: AdvisoryServiceLane;
  customer_journey_phase: AdvisoryJourneyPhase;
  industry_behavior: AdvisoryIndustryBehavior;
  related_tool_key: string | null;
  related_source_type: AdvisoryRelatedSourceType | null;
  related_source_id: string | null;
  related_gear: AdvisoryRelatedGear | null;
  client_visible_summary: string | null;
  client_visible_body: string | null;
  client_question: string | null;
  client_response: string | null;
  internal_notes: string | null;
  admin_notes: string | null;
  tags: unknown;
  client_visible: boolean;
  pinned: boolean;
  display_order: number;
  due_date: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface ClientAdvisoryEntry {
  id: string;
  title: string;
  note_type: AdvisoryNoteType;
  priority: AdvisoryNotePriority;
  service_lane: AdvisoryServiceLane;
  customer_journey_phase: AdvisoryJourneyPhase;
  industry_behavior: AdvisoryIndustryBehavior;
  related_tool_key: string | null;
  related_source_type: AdvisoryRelatedSourceType | null;
  related_source_id: string | null;
  related_gear: AdvisoryRelatedGear | null;
  client_visible_summary: string | null;
  client_visible_body: string | null;
  client_question: string | null;
  client_response: string | null;
  tags: unknown;
  pinned: boolean;
  display_order: number;
  due_date: string | null;
  resolved_at: string | null;
  updated_at: string;
}

export const ADVISORY_STATUSES: AdvisoryNoteStatus[] = [
  "draft","open","client_response_needed","client_responded","reviewed","closed","archived",
];
export const ADVISORY_TYPES: AdvisoryNoteType[] = [
  "advisory_note","clarification_request","client_clarification_response",
  "report_walkthrough_note","implementation_note","rgs_control_system_note",
  "scope_boundary_note","follow_up_item","other",
];
export const ADVISORY_PRIORITIES: AdvisoryNotePriority[] = ["low","normal","high","needs_attention"];
export const ADVISORY_SOURCE_TYPES: AdvisoryRelatedSourceType[] = [
  "owner_interview","diagnostic_tool","diagnostic_report","repair_map",
  "implementation_roadmap","sop_training_bible","decision_rights",
  "workflow_process_map","tool_training_tracker","revenue_risk_monitor",
  "priority_action_tracker","owner_decision_dashboard","scorecard_history",
  "monthly_system_review","tool_library","other",
];
export const ADVISORY_GEARS: AdvisoryRelatedGear[] = [
  "demand_generation","revenue_conversion","operational_efficiency",
  "financial_visibility","owner_independence","general",
];
export const ADVISORY_LANES: AdvisoryServiceLane[] = [
  "diagnostic","implementation","rgs_control_system","revenue_control_system",
  "admin_only","shared_support","report_only","public_pre_client",
];
export const ADVISORY_PHASES: AdvisoryJourneyPhase[] = [
  "public_pre_client","paid_diagnostic","owner_interview","diagnostic_tools",
  "admin_review","report_repair_map","implementation_planning",
  "implementation_execution","training_handoff","rcs_ongoing_visibility",
  "renewal_health_monitoring","internal_admin_operations",
];
export const ADVISORY_INDUSTRIES: AdvisoryIndustryBehavior[] = [
  "all_industries_shared","industry_aware_copy","industry_aware_questions",
  "industry_aware_outputs","industry_specific_benchmarks",
  "industry_specific_templates","industry_restricted","general_fallback",
];

export const ADVISORY_TYPE_LABEL: Record<AdvisoryNoteType, string> = {
  advisory_note: "Advisory note",
  clarification_request: "Clarification request",
  client_clarification_response: "Client response",
  report_walkthrough_note: "Report walkthrough note",
  implementation_note: "Implementation note",
  rgs_control_system_note: "RGS Control System note",
  scope_boundary_note: "Scope boundary note",
  follow_up_item: "Follow-up item",
  other: "Other",
};

export const ADVISORY_STATUS_LABEL: Record<AdvisoryNoteStatus, string> = {
  draft: "Draft",
  open: "Open",
  client_response_needed: "Client response needed",
  client_responded: "Client responded",
  reviewed: "Reviewed",
  closed: "Closed",
  archived: "Archived",
};

export const ADVISORY_PRIORITY_LABEL: Record<AdvisoryNotePriority, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  needs_attention: "Needs attention",
};

export const ADVISORY_LANE_LABEL: Record<AdvisoryServiceLane, string> = {
  diagnostic: "Diagnostic",
  implementation: "Implementation",
  rgs_control_system: "RGS Control System",
  revenue_control_system: "Revenue Control System",
  admin_only: "Admin only",
  shared_support: "Shared support",
  report_only: "Report",
  public_pre_client: "Public",
};

export const ADVISORY_PHASE_LABEL: Record<AdvisoryJourneyPhase, string> = {
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

export const ADVISORY_INDUSTRY_LABEL: Record<AdvisoryIndustryBehavior, string> = {
  all_industries_shared: "All industries",
  industry_aware_copy: "Industry-aware copy",
  industry_aware_questions: "Industry-aware questions",
  industry_aware_outputs: "Industry-aware outputs",
  industry_specific_benchmarks: "Industry benchmarks",
  industry_specific_templates: "Industry templates",
  industry_restricted: "Industry restricted",
  general_fallback: "General fallback",
};

export const ADVISORY_GEAR_LABEL: Record<AdvisoryRelatedGear, string> = {
  demand_generation: "Demand generation",
  revenue_conversion: "Revenue conversion",
  operational_efficiency: "Operational efficiency",
  financial_visibility: "Financial visibility",
  owner_independence: "Owner independence",
  general: "General",
};

export const ADVISORY_SOURCE_LABEL: Record<AdvisoryRelatedSourceType, string> = {
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
  other: "Other",
};

export async function adminListAdvisoryEntries(
  customerId: string,
): Promise<AdminAdvisoryEntry[]> {
  const { data, error } = await (supabase as any)
    .from("advisory_clarification_entries")
    .select("*")
    .eq("customer_id", customerId)
    .order("pinned", { ascending: false })
    .order("display_order", { ascending: true })
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as AdminAdvisoryEntry[];
}

export async function adminCreateAdvisoryEntry(
  customerId: string,
  patch: Partial<AdminAdvisoryEntry> & { title: string },
): Promise<AdminAdvisoryEntry> {
  const { data, error } = await (supabase as any)
    .from("advisory_clarification_entries")
    .insert({ customer_id: customerId, ...patch })
    .select("*")
    .single();
  if (error) throw error;
  return data as AdminAdvisoryEntry;
}

export async function adminUpdateAdvisoryEntry(
  id: string,
  patch: Partial<AdminAdvisoryEntry>,
): Promise<void> {
  const { error } = await (supabase as any)
    .from("advisory_clarification_entries").update(patch).eq("id", id);
  if (error) throw error;
}

export async function adminArchiveAdvisoryEntry(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from("advisory_clarification_entries")
    .update({ archived_at: new Date().toISOString(), status: "archived" })
    .eq("id", id);
  if (error) throw error;
}

export async function getClientAdvisoryEntries(
  customerId: string,
): Promise<ClientAdvisoryEntry[]> {
  const { data, error } = await (supabase as any).rpc(
    "get_client_advisory_clarification_entries",
    { _customer_id: customerId },
  );
  if (error) throw error;
  return (data ?? []) as ClientAdvisoryEntry[];
}
