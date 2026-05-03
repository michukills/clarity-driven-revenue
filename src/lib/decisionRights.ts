import { supabase } from "@/integrations/supabase/client";
import type { RoadmapGear } from "@/lib/implementationRoadmap";

export type DecisionRightsStatus =
  | "draft" | "ready_for_review" | "client_visible" | "active" | "needs_update" | "archived";
export type DecisionRightsReviewState =
  | "not_reviewed" | "admin_reviewed" | "client_reviewed" | "needs_revision";

export interface AdminDecisionRightsEntry {
  id: string;
  customer_id: string;
  implementation_roadmap_id: string | null;
  implementation_roadmap_item_id: string | null;
  sop_training_entry_id: string | null;
  title: string;
  business_area: string | null;
  gear: RoadmapGear | null;
  industry_context: string | null;
  decision_or_responsibility: string | null;
  current_gap: string | null;
  decision_owner: string | null;
  action_owner: string | null;
  approver: string | null;
  consulted: string | null;
  informed: string | null;
  escalation_path: string | null;
  handoff_trigger: string | null;
  decision_cadence: string | null;
  evidence_source_notes: string | null;
  client_summary: string | null;
  internal_notes: string | null;
  status: DecisionRightsStatus;
  review_state: DecisionRightsReviewState;
  version: number;
  sort_order: number;
  client_visible: boolean;
  last_reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface ClientDecisionRightsEntry {
  id: string;
  title: string;
  business_area: string | null;
  gear: RoadmapGear | null;
  industry_context: string | null;
  decision_or_responsibility: string | null;
  decision_owner: string | null;
  action_owner: string | null;
  approver: string | null;
  consulted: string | null;
  informed: string | null;
  escalation_path: string | null;
  handoff_trigger: string | null;
  decision_cadence: string | null;
  client_summary: string | null;
  status: DecisionRightsStatus;
  version: number;
  sort_order: number;
  updated_at: string;
  implementation_roadmap_item_id: string | null;
  sop_training_entry_id: string | null;
}

export async function adminListDecisionRights(customerId: string): Promise<AdminDecisionRightsEntry[]> {
  const { data, error } = await (supabase as any)
    .from("decision_rights_entries")
    .select("*")
    .eq("customer_id", customerId)
    .order("business_area", { ascending: true })
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as AdminDecisionRightsEntry[];
}

export async function adminCreateDecisionRights(
  customerId: string,
  patch: Partial<AdminDecisionRightsEntry> & { title: string },
): Promise<AdminDecisionRightsEntry> {
  const { data, error } = await (supabase as any)
    .from("decision_rights_entries")
    .insert({ customer_id: customerId, ...patch })
    .select("*")
    .single();
  if (error) throw error;
  return data as AdminDecisionRightsEntry;
}

export async function adminUpdateDecisionRights(
  id: string,
  patch: Partial<AdminDecisionRightsEntry>,
): Promise<void> {
  const { error } = await (supabase as any)
    .from("decision_rights_entries").update(patch).eq("id", id);
  if (error) throw error;
}

export async function adminArchiveDecisionRights(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from("decision_rights_entries")
    .update({ archived_at: new Date().toISOString(), status: "archived" })
    .eq("id", id);
  if (error) throw error;
}

export async function getClientDecisionRights(customerId: string): Promise<ClientDecisionRightsEntry[]> {
  const { data, error } = await (supabase as any).rpc(
    "get_client_decision_rights",
    { _customer_id: customerId },
  );
  if (error) throw error;
  return (data ?? []) as ClientDecisionRightsEntry[];
}

export const DECISION_RIGHTS_STATUS_LABELS: Record<DecisionRightsStatus, string> = {
  draft: "Draft",
  ready_for_review: "Ready for review",
  client_visible: "Client-visible",
  active: "Active",
  needs_update: "Needs update",
  archived: "Archived",
};
