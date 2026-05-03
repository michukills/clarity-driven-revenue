import { supabase } from "@/integrations/supabase/client";
import type { RoadmapGear } from "@/lib/implementationRoadmap";

export type WorkflowMapStatus =
  | "draft" | "ready_for_review" | "client_visible" | "active" | "needs_update" | "archived";
export type WorkflowMapReviewState =
  | "not_reviewed" | "admin_reviewed" | "client_reviewed" | "needs_revision";

export interface WorkflowProcessStep {
  order: number;
  step_name: string;
  role_owner?: string;
  action?: string;
  tool_or_system_used?: string;
  input?: string;
  output?: string;
  handoff_to?: string;
  decision_required?: boolean;
  bottleneck_flag?: boolean;
  note?: string;
}

export interface AdminWorkflowProcessMap {
  id: string;
  customer_id: string;
  implementation_roadmap_id: string | null;
  implementation_roadmap_item_id: string | null;
  sop_training_entry_id: string | null;
  decision_rights_entry_id: string | null;
  title: string;
  business_area: string | null;
  gear: RoadmapGear | null;
  industry_context: string | null;
  process_purpose: string | null;
  process_trigger: string | null;
  current_state_summary: string | null;
  desired_future_state_summary: string | null;
  process_owner: string | null;
  primary_roles: string | null;
  systems_tools_used: string | null;
  inputs_needed: string | null;
  outputs_deliverables: string | null;
  handoff_points: string | null;
  decision_points: string | null;
  approval_points: string | null;
  bottlenecks: string | null;
  rework_loops: string | null;
  revenue_time_risk_leaks: string | null;
  steps: WorkflowProcessStep[];
  client_summary: string | null;
  internal_notes: string | null;
  status: WorkflowMapStatus;
  review_state: WorkflowMapReviewState;
  version: number;
  sort_order: number;
  client_visible: boolean;
  last_reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface ClientWorkflowProcessMap {
  id: string;
  title: string;
  business_area: string | null;
  gear: RoadmapGear | null;
  industry_context: string | null;
  process_purpose: string | null;
  process_trigger: string | null;
  current_state_summary: string | null;
  desired_future_state_summary: string | null;
  process_owner: string | null;
  primary_roles: string | null;
  systems_tools_used: string | null;
  inputs_needed: string | null;
  outputs_deliverables: string | null;
  handoff_points: string | null;
  decision_points: string | null;
  approval_points: string | null;
  bottlenecks: string | null;
  rework_loops: string | null;
  revenue_time_risk_leaks: string | null;
  steps: WorkflowProcessStep[];
  client_summary: string | null;
  status: WorkflowMapStatus;
  version: number;
  sort_order: number;
  updated_at: string;
  implementation_roadmap_item_id: string | null;
  sop_training_entry_id: string | null;
  decision_rights_entry_id: string | null;
}

export async function adminListWorkflowMaps(customerId: string): Promise<AdminWorkflowProcessMap[]> {
  const { data, error } = await (supabase as any)
    .from("workflow_process_maps")
    .select("*")
    .eq("customer_id", customerId)
    .order("business_area", { ascending: true })
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r: any) => ({ ...r, steps: Array.isArray(r.steps) ? r.steps : [] })) as AdminWorkflowProcessMap[];
}

export async function adminCreateWorkflowMap(
  customerId: string,
  patch: Partial<AdminWorkflowProcessMap> & { title: string },
): Promise<AdminWorkflowProcessMap> {
  const { data, error } = await (supabase as any)
    .from("workflow_process_maps")
    .insert({ customer_id: customerId, ...patch })
    .select("*")
    .single();
  if (error) throw error;
  return data as AdminWorkflowProcessMap;
}

export async function adminUpdateWorkflowMap(
  id: string,
  patch: Partial<AdminWorkflowProcessMap>,
): Promise<void> {
  const { error } = await (supabase as any)
    .from("workflow_process_maps").update(patch).eq("id", id);
  if (error) throw error;
}

export async function adminArchiveWorkflowMap(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from("workflow_process_maps")
    .update({ archived_at: new Date().toISOString(), status: "archived" })
    .eq("id", id);
  if (error) throw error;
}

export async function getClientWorkflowMaps(customerId: string): Promise<ClientWorkflowProcessMap[]> {
  const { data, error } = await (supabase as any).rpc(
    "get_client_workflow_process_maps",
    { _customer_id: customerId },
  );
  if (error) throw error;
  return (data ?? []).map((r: any) => ({ ...r, steps: Array.isArray(r.steps) ? r.steps : [] })) as ClientWorkflowProcessMap[];
}

export const WORKFLOW_MAP_STATUS_LABELS: Record<WorkflowMapStatus, string> = {
  draft: "Draft",
  ready_for_review: "Ready for review",
  client_visible: "Client-visible",
  active: "Active",
  needs_update: "Needs update",
  archived: "Archived",
};
