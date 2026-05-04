import { supabase } from "@/integrations/supabase/client";

export type ClientHealthStatus =
  | "healthy" | "stable" | "watch" | "needs_attention" | "at_risk" | "unknown";
export type ClientRenewalRiskLevel =
  | "low" | "moderate" | "high" | "critical" | "unknown";
export type ClientEngagementStatus =
  | "engaged" | "slow_response" | "stalled" | "inactive"
  | "waiting_on_client" | "waiting_on_rgs" | "unknown";
export type ClientHealthAdminActionType =
  | "none" | "review_needed" | "clarification_needed" | "monthly_review_due"
  | "priority_action_follow_up" | "owner_decision_follow_up"
  | "implementation_offer" | "rgs_control_system_offer" | "renewal_review"
  | "professional_review_recommended" | "payment_or_access_review" | "other";
export type ClientHealthRecordStatus =
  | "draft" | "active" | "reviewed" | "archived";
export type ClientHealthRelatedSourceType =
  | "revenue_risk_monitor" | "priority_action_tracker" | "owner_decision_dashboard"
  | "scorecard_history" | "monthly_system_review" | "tool_library" | "advisory_notes"
  | "financial_visibility" | "rgs_stability_snapshot" | "industry_brain"
  | "payment_access" | "other";

export interface AdminClientHealthRecord {
  id: string;
  customer_id: string;
  title: string;
  health_status: ClientHealthStatus;
  renewal_risk_level: ClientRenewalRiskLevel;
  engagement_status: ClientEngagementStatus;
  admin_action_type: ClientHealthAdminActionType;
  status: ClientHealthRecordStatus;
  service_lane: string;
  customer_journey_phase: string;
  industry_behavior: string;
  related_tool_key: string | null;
  related_source_type: ClientHealthRelatedSourceType | null;
  related_source_id: string | null;
  health_summary: string | null;
  renewal_risk_summary: string | null;
  recommended_admin_action: string | null;
  attention_needed: boolean;
  professional_review_recommended: boolean;
  next_review_date: string | null;
  renewal_date: string | null;
  last_reviewed_at: string | null;
  internal_notes: string | null;
  admin_notes: string | null;
  tags: unknown;
  display_order: number;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export const HEALTH_STATUSES: ClientHealthStatus[] =
  ["healthy","stable","watch","needs_attention","at_risk","unknown"];
export const RENEWAL_RISKS: ClientRenewalRiskLevel[] =
  ["low","moderate","high","critical","unknown"];
export const ENGAGEMENT_STATUSES: ClientEngagementStatus[] =
  ["engaged","slow_response","stalled","inactive","waiting_on_client","waiting_on_rgs","unknown"];
export const ADMIN_ACTION_TYPES: ClientHealthAdminActionType[] =
  ["none","review_needed","clarification_needed","monthly_review_due",
   "priority_action_follow_up","owner_decision_follow_up",
   "implementation_offer","rgs_control_system_offer","renewal_review",
   "professional_review_recommended","payment_or_access_review","other"];
export const RECORD_STATUSES: ClientHealthRecordStatus[] =
  ["draft","active","reviewed","archived"];
export const RELATED_SOURCE_TYPES: ClientHealthRelatedSourceType[] =
  ["revenue_risk_monitor","priority_action_tracker","owner_decision_dashboard",
   "scorecard_history","monthly_system_review","tool_library","advisory_notes",
   "financial_visibility","rgs_stability_snapshot","industry_brain",
   "payment_access","other"];

const labelize = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
export const HEALTH_LABEL = (v: ClientHealthStatus) => labelize(v);
export const RENEWAL_LABEL = (v: ClientRenewalRiskLevel) => labelize(v);
export const ENGAGEMENT_LABEL = (v: ClientEngagementStatus) => labelize(v);
export const ACTION_LABEL = (v: ClientHealthAdminActionType) => labelize(v);
export const STATUS_LABEL = (v: ClientHealthRecordStatus) => labelize(v);
export const SOURCE_LABEL = (v: ClientHealthRelatedSourceType) => labelize(v);

export async function adminListClientHealthRecords(customerId: string) {
  const { data, error } = await supabase
    .from("client_health_records")
    .select("*")
    .eq("customer_id", customerId)
    .order("display_order", { ascending: true })
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as AdminClientHealthRecord[];
}

export async function adminListAllClientHealthRecords() {
  const { data, error } = await supabase
    .from("client_health_records")
    .select("*")
    .is("archived_at", null)
    .order("attention_needed", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as AdminClientHealthRecord[];
}

export async function adminCreateClientHealthRecord(
  customerId: string, p: Partial<AdminClientHealthRecord> & { title?: string }
) {
  const { data, error } = await supabase
    .from("client_health_records")
    .insert({ customer_id: customerId, title: p.title ?? "Client Health Review", ...p } as any)
    .select("*").single();
  if (error) throw error;
  return data as AdminClientHealthRecord;
}

export async function adminUpdateClientHealthRecord(id: string, p: Partial<AdminClientHealthRecord>) {
  const { error } = await supabase
    .from("client_health_records")
    .update(p as any)
    .eq("id", id);
  if (error) throw error;
}

export async function adminArchiveClientHealthRecord(id: string) {
  const { error } = await supabase
    .from("client_health_records")
    .update({ archived_at: new Date().toISOString(), status: "archived" } as any)
    .eq("id", id);
  if (error) throw error;
}
