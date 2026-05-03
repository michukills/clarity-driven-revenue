import { supabase } from "@/integrations/supabase/client";

export type PatActionCategory =
  | "revenue" | "risk" | "operations" | "financial_visibility"
  | "owner_independence" | "customer_follow_up" | "process" | "training"
  | "reporting" | "compliance_sensitive" | "data_quality" | "other";

export type PatGear =
  | "demand_generation" | "revenue_conversion" | "operational_efficiency"
  | "financial_visibility" | "owner_independence" | "cross_gear" | "unknown";

export type PatPriorityLevel = "low" | "medium" | "high" | "critical";

export type PatStatus =
  | "not_started" | "in_progress" | "waiting_on_owner" | "waiting_on_rgs"
  | "blocked" | "review_needed" | "completed" | "archived";

export type PatOwnerRole =
  | "owner" | "manager" | "team_member" | "rgs_admin" | "shared"
  | "outside_professional" | "unknown";

export type PatSourceType =
  | "manual_admin" | "diagnostic_report" | "repair_map" | "implementation_roadmap"
  | "revenue_risk_monitor" | "scorecard" | "monthly_review"
  | "connector_signal" | "other";

export interface AdminPriorityActionItem {
  id: string;
  customer_id: string;
  title: string;
  description: string | null;
  action_category: PatActionCategory;
  gear: PatGear;
  priority_level: PatPriorityLevel;
  status: PatStatus;
  owner_role: PatOwnerRole;
  assigned_to_label: string | null;
  source_type: PatSourceType;
  source_id: string | null;
  source_label: string | null;
  why_it_matters: string | null;
  recommended_next_step: string | null;
  success_signal: string | null;
  due_date: string | null;
  next_review_date: string | null;
  completed_at: string | null;
  reviewed_by_admin_at: string | null;
  client_visible: boolean;
  admin_review_required: boolean;
  internal_notes: string | null;
  client_notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface ClientPriorityActionItem {
  id: string;
  title: string;
  description: string | null;
  action_category: PatActionCategory;
  gear: PatGear;
  priority_level: PatPriorityLevel;
  status: PatStatus;
  owner_role: PatOwnerRole;
  assigned_to_label: string | null;
  source_type: PatSourceType;
  source_label: string | null;
  why_it_matters: string | null;
  recommended_next_step: string | null;
  success_signal: string | null;
  due_date: string | null;
  next_review_date: string | null;
  completed_at: string | null;
  client_notes: string | null;
  sort_order: number;
  updated_at: string;
}

export const PAT_CATEGORIES: PatActionCategory[] = [
  "revenue","risk","operations","financial_visibility","owner_independence",
  "customer_follow_up","process","training","reporting",
  "compliance_sensitive","data_quality","other",
];
export const PAT_GEARS: PatGear[] = [
  "demand_generation","revenue_conversion","operational_efficiency",
  "financial_visibility","owner_independence","cross_gear","unknown",
];
export const PAT_PRIORITY_LEVELS: PatPriorityLevel[] = ["low","medium","high","critical"];
export const PAT_STATUSES: PatStatus[] = [
  "not_started","in_progress","waiting_on_owner","waiting_on_rgs",
  "blocked","review_needed","completed","archived",
];
export const PAT_OWNER_ROLES: PatOwnerRole[] = [
  "owner","manager","team_member","rgs_admin","shared",
  "outside_professional","unknown",
];
export const PAT_SOURCE_TYPES: PatSourceType[] = [
  "manual_admin","diagnostic_report","repair_map","implementation_roadmap",
  "revenue_risk_monitor","scorecard","monthly_review",
  "connector_signal","other",
];

export const PAT_CATEGORY_LABEL: Record<PatActionCategory, string> = {
  revenue: "Revenue", risk: "Risk", operations: "Operations",
  financial_visibility: "Financial visibility",
  owner_independence: "Owner independence",
  customer_follow_up: "Customer follow-up",
  process: "Process", training: "Training", reporting: "Reporting",
  compliance_sensitive: "Compliance-sensitive",
  data_quality: "Data quality", other: "Other",
};
export const PAT_GEAR_LABEL: Record<PatGear, string> = {
  demand_generation: "Demand generation",
  revenue_conversion: "Revenue conversion",
  operational_efficiency: "Operational efficiency",
  financial_visibility: "Financial visibility",
  owner_independence: "Owner independence",
  cross_gear: "Cross-gear", unknown: "Unknown",
};
export const PAT_PRIORITY_LABEL: Record<PatPriorityLevel, string> = {
  low: "Low", medium: "Medium", high: "High", critical: "Critical",
};
export const PAT_STATUS_LABEL: Record<PatStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  waiting_on_owner: "Waiting on owner",
  waiting_on_rgs: "Waiting on RGS",
  blocked: "Blocked",
  review_needed: "Review needed",
  completed: "Completed",
  archived: "Archived",
};
export const PAT_OWNER_ROLE_LABEL: Record<PatOwnerRole, string> = {
  owner: "Owner", manager: "Manager", team_member: "Team member",
  rgs_admin: "RGS admin", shared: "Shared",
  outside_professional: "Outside professional", unknown: "Unknown",
};
export const PAT_SOURCE_LABEL: Record<PatSourceType, string> = {
  manual_admin: "Manual (admin)",
  diagnostic_report: "Diagnostic report",
  repair_map: "Repair map",
  implementation_roadmap: "Implementation roadmap",
  revenue_risk_monitor: "Revenue & Risk Monitor",
  scorecard: "Scorecard",
  monthly_review: "Monthly review",
  connector_signal: "Connector signal",
  other: "Other",
};

export async function adminListPriorityActionItems(
  customerId: string,
): Promise<AdminPriorityActionItem[]> {
  const { data, error } = await (supabase as any)
    .from("priority_action_items")
    .select("*")
    .eq("customer_id", customerId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as AdminPriorityActionItem[];
}

export async function adminCreatePriorityActionItem(
  customerId: string,
  patch: Partial<AdminPriorityActionItem> & { title: string },
): Promise<AdminPriorityActionItem> {
  const { data, error } = await (supabase as any)
    .from("priority_action_items")
    .insert({ customer_id: customerId, ...patch })
    .select("*")
    .single();
  if (error) throw error;
  return data as AdminPriorityActionItem;
}

export async function adminUpdatePriorityActionItem(
  id: string,
  patch: Partial<AdminPriorityActionItem>,
): Promise<void> {
  const { error } = await (supabase as any)
    .from("priority_action_items").update(patch).eq("id", id);
  if (error) throw error;
}

export async function adminArchivePriorityActionItem(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from("priority_action_items")
    .update({ archived_at: new Date().toISOString(), status: "archived" })
    .eq("id", id);
  if (error) throw error;
}

export async function getClientPriorityActionItems(
  customerId: string,
): Promise<ClientPriorityActionItem[]> {
  const { data, error } = await (supabase as any).rpc(
    "get_client_priority_action_items",
    { _customer_id: customerId },
  );
  if (error) throw error;
  return (data ?? []) as ClientPriorityActionItem[];
}