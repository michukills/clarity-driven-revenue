import { supabase } from "@/integrations/supabase/client";
import type { RoadmapGear } from "@/lib/implementationRoadmap";

export type SopStatus =
  | "draft" | "ready_for_review" | "client_visible" | "active" | "needs_update" | "archived";
export type SopReviewState =
  | "not_reviewed" | "admin_reviewed" | "client_reviewed" | "needs_revision";

export interface SopStep {
  order: number;
  instruction: string;
  expected_outcome?: string | null;
  note?: string | null;
}

export interface AdminSopEntry {
  id: string;
  customer_id: string;
  implementation_roadmap_id: string | null;
  implementation_roadmap_item_id: string | null;
  title: string;
  purpose: string | null;
  gear: RoadmapGear | null;
  category: string | null;
  role_team: string | null;
  trigger_when_used: string | null;
  inputs_tools_needed: string | null;
  quality_standard: string | null;
  common_mistakes: string | null;
  escalation_point: string | null;
  owner_decision_point: string | null;
  training_notes: string | null;
  client_summary: string | null;
  internal_notes: string | null;
  steps: SopStep[];
  status: SopStatus;
  review_state: SopReviewState;
  version: number;
  sort_order: number;
  client_visible: boolean;
  last_reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface ClientSopEntry {
  id: string;
  title: string;
  purpose: string | null;
  gear: RoadmapGear | null;
  category: string | null;
  role_team: string | null;
  trigger_when_used: string | null;
  inputs_tools_needed: string | null;
  quality_standard: string | null;
  common_mistakes: string | null;
  escalation_point: string | null;
  owner_decision_point: string | null;
  training_notes: string | null;
  client_summary: string | null;
  steps: SopStep[];
  status: SopStatus;
  version: number;
  sort_order: number;
  updated_at: string;
  implementation_roadmap_item_id: string | null;
}

export async function adminListSopEntries(customerId: string): Promise<AdminSopEntry[]> {
  const { data, error } = await (supabase as any)
    .from("sop_training_entries")
    .select("*")
    .eq("customer_id", customerId)
    .order("category", { ascending: true })
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as AdminSopEntry[];
}

export async function adminCreateSopEntry(
  customerId: string,
  patch: Partial<AdminSopEntry> & { title: string },
): Promise<AdminSopEntry> {
  const { data, error } = await (supabase as any)
    .from("sop_training_entries")
    .insert({ customer_id: customerId, ...patch })
    .select("*")
    .single();
  if (error) throw error;
  return data as AdminSopEntry;
}

export async function adminUpdateSopEntry(
  id: string,
  patch: Partial<AdminSopEntry>,
): Promise<void> {
  const { error } = await (supabase as any)
    .from("sop_training_entries").update(patch).eq("id", id);
  if (error) throw error;
}

export async function adminArchiveSopEntry(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from("sop_training_entries")
    .update({ archived_at: new Date().toISOString(), status: "archived" })
    .eq("id", id);
  if (error) throw error;
}

export async function getClientSopTrainingBible(customerId: string): Promise<ClientSopEntry[]> {
  const { data, error } = await (supabase as any).rpc(
    "get_client_sop_training_bible",
    { _customer_id: customerId },
  );
  if (error) throw error;
  return (data ?? []) as ClientSopEntry[];
}

export const SOP_STATUS_LABELS: Record<SopStatus, string> = {
  draft: "Draft",
  ready_for_review: "Ready for review",
  client_visible: "Client-visible",
  active: "Active",
  needs_update: "Needs update",
  archived: "Archived",
};
