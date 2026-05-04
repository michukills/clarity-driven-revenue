import { supabase } from "@/integrations/supabase/client";

export type OddDecisionType =
  | "pricing" | "hiring_capacity" | "spending" | "follow_up"
  | "process_change" | "training" | "owner_time" | "risk_review"
  | "vendor" | "customer_experience" | "compliance_sensitive"
  | "financial_visibility" | "other";

export type OddGear =
  | "demand_generation" | "revenue_conversion" | "operational_efficiency"
  | "financial_visibility" | "owner_independence" | "cross_gear" | "unknown";

export type OddPriorityLevel = "low" | "medium" | "high" | "critical";

export type OddStatus =
  | "new" | "review_needed" | "waiting_on_owner" | "decided"
  | "monitoring" | "resolved" | "archived";

export type OddSourceType =
  | "manual_admin" | "priority_action_tracker" | "revenue_risk_monitor"
  | "decision_rights" | "implementation_roadmap" | "diagnostic_report"
  | "repair_map" | "scorecard" | "monthly_review" | "connector_signal" | "other";

export interface AdminOwnerDecisionItem {
  id: string;
  customer_id: string;
  title: string;
  description: string | null;
  decision_type: OddDecisionType;
  gear: OddGear;
  priority_level: OddPriorityLevel;
  status: OddStatus;
  source_type: OddSourceType;
  source_id: string | null;
  source_label: string | null;
  decision_question: string | null;
  context_summary: string | null;
  recommended_owner_review: string | null;
  decision_needed_by: string | null;
  next_review_date: string | null;
  client_visible: boolean;
  admin_review_required: boolean;
  reviewed_by_admin_at: string | null;
  internal_notes: string | null;
  client_notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export type ClientDashboardItemType =
  | "owner_decision" | "priority_action" | "revenue_risk_monitor";

export interface ClientDashboardItem {
  item_id: string;
  item_type: ClientDashboardItemType;
  title: string;
  description: string | null;
  gear: string | null;
  priority_or_severity: string | null;
  status: string | null;
  source_type: string | null;
  source_label: string | null;
  decision_question: string | null;
  recommended_owner_review: string | null;
  why_it_matters: string | null;
  recommended_next_step: string | null;
  success_signal: string | null;
  due_or_decision_date: string | null;
  next_review_date: string | null;
  client_notes: string | null;
  sort_order: number;
  updated_at: string;
}

export const ODD_DECISION_TYPES: OddDecisionType[] = [
  "pricing","hiring_capacity","spending","follow_up","process_change",
  "training","owner_time","risk_review","vendor","customer_experience",
  "compliance_sensitive","financial_visibility","other",
];
export const ODD_GEARS: OddGear[] = [
  "demand_generation","revenue_conversion","operational_efficiency",
  "financial_visibility","owner_independence","cross_gear","unknown",
];
export const ODD_PRIORITY_LEVELS: OddPriorityLevel[] = ["low","medium","high","critical"];
export const ODD_STATUSES: OddStatus[] = [
  "new","review_needed","waiting_on_owner","decided","monitoring","resolved","archived",
];
export const ODD_SOURCE_TYPES: OddSourceType[] = [
  "manual_admin","priority_action_tracker","revenue_risk_monitor",
  "decision_rights","implementation_roadmap","diagnostic_report",
  "repair_map","scorecard","monthly_review","connector_signal","other",
];

export const ODD_DECISION_TYPE_LABEL: Record<OddDecisionType, string> = {
  pricing: "Pricing", hiring_capacity: "Hiring / capacity",
  spending: "Spending", follow_up: "Follow-up",
  process_change: "Process change", training: "Training",
  owner_time: "Owner time", risk_review: "Risk review",
  vendor: "Vendor", customer_experience: "Customer experience",
  compliance_sensitive: "Compliance-sensitive",
  financial_visibility: "Financial visibility", other: "Other",
};
export const ODD_GEAR_LABEL: Record<OddGear, string> = {
  demand_generation: "Demand generation",
  revenue_conversion: "Revenue conversion",
  operational_efficiency: "Operational efficiency",
  financial_visibility: "Financial visibility",
  owner_independence: "Owner independence",
  cross_gear: "Cross-gear", unknown: "Unknown",
};
export const ODD_PRIORITY_LABEL: Record<OddPriorityLevel, string> = {
  low: "Low", medium: "Medium", high: "High", critical: "Critical",
};
export const ODD_STATUS_LABEL: Record<OddStatus, string> = {
  new: "New",
  review_needed: "Review needed",
  waiting_on_owner: "Waiting on owner",
  decided: "Decided",
  monitoring: "Monitoring",
  resolved: "Resolved",
  archived: "Archived",
};
export const ODD_SOURCE_LABEL: Record<OddSourceType, string> = {
  manual_admin: "Manual (admin)",
  priority_action_tracker: "Priority Action Tracker",
  revenue_risk_monitor: "Revenue & Risk Monitor",
  decision_rights: "Decision Rights",
  implementation_roadmap: "Implementation roadmap",
  diagnostic_report: "Diagnostic report",
  repair_map: "Repair map",
  scorecard: "Scorecard",
  monthly_review: "Monthly review",
  connector_signal: "Connector signal",
  other: "Other",
};

export const CLIENT_ITEM_TYPE_LABEL: Record<ClientDashboardItemType, string> = {
  owner_decision: "Owner decision",
  priority_action: "Priority action",
  revenue_risk_monitor: "Revenue & risk signal",
};

export async function adminListOwnerDecisionItems(
  customerId: string,
): Promise<AdminOwnerDecisionItem[]> {
  const { data, error } = await (supabase as any)
    .from("owner_decision_dashboard_items")
    .select("*")
    .eq("customer_id", customerId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as AdminOwnerDecisionItem[];
}

export async function adminCreateOwnerDecisionItem(
  customerId: string,
  patch: Partial<AdminOwnerDecisionItem> & { title: string },
): Promise<AdminOwnerDecisionItem> {
  const { data, error } = await (supabase as any)
    .from("owner_decision_dashboard_items")
    .insert({ customer_id: customerId, ...patch })
    .select("*")
    .single();
  if (error) throw error;
  return data as AdminOwnerDecisionItem;
}

export async function adminUpdateOwnerDecisionItem(
  id: string,
  patch: Partial<AdminOwnerDecisionItem>,
): Promise<void> {
  const { error } = await (supabase as any)
    .from("owner_decision_dashboard_items").update(patch).eq("id", id);
  if (error) throw error;
}

export async function adminArchiveOwnerDecisionItem(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from("owner_decision_dashboard_items")
    .update({ archived_at: new Date().toISOString(), status: "archived" })
    .eq("id", id);
  if (error) throw error;
}

export async function getClientOwnerDecisionDashboard(
  customerId: string,
): Promise<ClientDashboardItem[]> {
  const { data, error } = await (supabase as any).rpc(
    "get_client_owner_decision_dashboard",
    { _customer_id: customerId },
  );
  if (error) throw error;
  return (data ?? []) as ClientDashboardItem[];
}