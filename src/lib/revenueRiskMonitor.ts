import { supabase } from "@/integrations/supabase/client";

export type RrmSignalCategory =
  | "revenue" | "cash_flow" | "receivables" | "expenses" | "payroll"
  | "pipeline" | "conversion" | "customer_retention" | "operations"
  | "inventory" | "vendor" | "compliance_sensitive" | "owner_capacity"
  | "data_quality" | "other";

export type RrmSeverity = "low" | "medium" | "high" | "critical";
export type RrmStatus =
  | "new" | "monitoring" | "needs_owner_review" | "needs_admin_review"
  | "action_recommended" | "resolved" | "archived";
export type RrmTrend = "improving" | "stable" | "worsening" | "unknown";
export type RrmSourceType =
  | "manual_admin" | "owner_submitted" | "diagnostic_report"
  | "revenue_control_system" | "connector_import" | "scorecard" | "other";

export interface AdminRrmItem {
  id: string;
  customer_id: string;
  title: string;
  description: string | null;
  signal_category: RrmSignalCategory;
  severity: RrmSeverity;
  status: RrmStatus;
  trend: RrmTrend;
  owner_review_recommendation: string | null;
  source_type: RrmSourceType;
  source_label: string | null;
  related_metric_name: string | null;
  related_metric_value: string | null;
  observed_at: string | null;
  due_for_review_at: string | null;
  reviewed_by_admin_at: string | null;
  client_visible: boolean;
  admin_review_required: boolean;
  internal_notes: string | null;
  client_notes: string | null;
  industry: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface ClientRrmItem {
  id: string;
  title: string;
  description: string | null;
  signal_category: RrmSignalCategory;
  severity: RrmSeverity;
  status: RrmStatus;
  trend: RrmTrend;
  owner_review_recommendation: string | null;
  source_type: RrmSourceType;
  source_label: string | null;
  related_metric_name: string | null;
  related_metric_value: string | null;
  observed_at: string | null;
  due_for_review_at: string | null;
  client_notes: string | null;
  industry: string | null;
  sort_order: number;
  updated_at: string;
}

export const RRM_CATEGORIES: RrmSignalCategory[] = [
  "revenue","cash_flow","receivables","expenses","payroll",
  "pipeline","conversion","customer_retention","operations",
  "inventory","vendor","compliance_sensitive","owner_capacity",
  "data_quality","other",
];
export const RRM_SEVERITIES: RrmSeverity[] = ["low","medium","high","critical"];
export const RRM_STATUSES: RrmStatus[] = [
  "new","monitoring","needs_owner_review","needs_admin_review",
  "action_recommended","resolved","archived",
];
export const RRM_TRENDS: RrmTrend[] = ["improving","stable","worsening","unknown"];
export const RRM_SOURCE_TYPES: RrmSourceType[] = [
  "manual_admin","owner_submitted","diagnostic_report",
  "revenue_control_system","connector_import","scorecard","other",
];

export const RRM_SEVERITY_LABEL: Record<RrmSeverity, string> = {
  low: "Low", medium: "Medium", high: "High", critical: "Critical",
};
export const RRM_STATUS_LABEL: Record<RrmStatus, string> = {
  new: "New",
  monitoring: "Monitoring",
  needs_owner_review: "Needs owner review",
  needs_admin_review: "Needs admin review",
  action_recommended: "Action recommended",
  resolved: "Resolved",
  archived: "Archived",
};
export const RRM_TREND_LABEL: Record<RrmTrend, string> = {
  improving: "Improving", stable: "Stable",
  worsening: "Worsening", unknown: "Unknown",
};
export const RRM_CATEGORY_LABEL: Record<RrmSignalCategory, string> = {
  revenue: "Revenue",
  cash_flow: "Cash flow",
  receivables: "Receivables",
  expenses: "Expenses",
  payroll: "Payroll",
  pipeline: "Pipeline",
  conversion: "Conversion",
  customer_retention: "Customer retention",
  operations: "Operations",
  inventory: "Inventory",
  vendor: "Vendor",
  compliance_sensitive: "Compliance-sensitive",
  owner_capacity: "Owner capacity",
  data_quality: "Data quality",
  other: "Other",
};

export async function adminListRrmItems(customerId: string): Promise<AdminRrmItem[]> {
  const { data, error } = await (supabase as any)
    .from("revenue_risk_monitor_items")
    .select("*")
    .eq("customer_id", customerId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as AdminRrmItem[];
}

export async function adminCreateRrmItem(
  customerId: string,
  patch: Partial<AdminRrmItem> & { title: string },
): Promise<AdminRrmItem> {
  const { data, error } = await (supabase as any)
    .from("revenue_risk_monitor_items")
    .insert({ customer_id: customerId, ...patch })
    .select("*")
    .single();
  if (error) throw error;
  return data as AdminRrmItem;
}

export async function adminUpdateRrmItem(id: string, patch: Partial<AdminRrmItem>): Promise<void> {
  const { error } = await (supabase as any)
    .from("revenue_risk_monitor_items").update(patch).eq("id", id);
  if (error) throw error;
}

export async function adminArchiveRrmItem(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from("revenue_risk_monitor_items")
    .update({ archived_at: new Date().toISOString(), status: "archived" })
    .eq("id", id);
  if (error) throw error;
}

export async function getClientRrmItems(customerId: string): Promise<ClientRrmItem[]> {
  const { data, error } = await (supabase as any).rpc(
    "get_client_revenue_risk_monitor_items",
    { _customer_id: customerId },
  );
  if (error) throw error;
  return (data ?? []) as ClientRrmItem[];
}