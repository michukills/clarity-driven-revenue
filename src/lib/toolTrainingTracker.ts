import { supabase } from "@/integrations/supabase/client";

export type ToolTrainingAccessSource =
  | "stage_default" | "manual_grant" | "manual_revoke" | "admin_only" | "locked";
export type ToolTrainingAccessStatus =
  | "available" | "locked" | "revoked" | "hidden" | "admin_only";
export type ToolTrainingTrainingStatus =
  | "not_required" | "not_started" | "scheduled" | "in_progress"
  | "completed" | "needs_refresh" | "blocked";
export type ToolTrainingHandoffStatus =
  | "not_started" | "in_progress" | "handed_off" | "needs_follow_up" | "not_applicable";
export type ToolTrainingEntryStatus =
  | "draft" | "ready_for_review" | "client_visible" | "active" | "needs_update" | "archived";

export interface AdminToolTrainingTrackerEntry {
  id: string;
  customer_id: string;
  tool_key: string;
  tool_name_snapshot: string | null;
  service_lane: string | null;
  customer_journey_phase: string | null;
  access_source: ToolTrainingAccessSource;
  access_status: ToolTrainingAccessStatus;
  training_required: boolean;
  training_status: ToolTrainingTrainingStatus;
  trained_people: string | null;
  trained_roles: string | null;
  training_method: string | null;
  training_date: string | null;
  next_training_step: string | null;
  client_expectation: string | null;
  rgs_support_scope: string | null;
  handoff_status: ToolTrainingHandoffStatus;
  handoff_notes: string | null;
  client_summary: string | null;
  internal_notes: string | null;
  status: ToolTrainingEntryStatus;
  sort_order: number;
  client_visible: boolean;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface ClientToolTrainingTrackerEntry {
  id: string;
  tool_key: string;
  tool_name_snapshot: string | null;
  service_lane: string | null;
  customer_journey_phase: string | null;
  access_source: ToolTrainingAccessSource;
  access_status: ToolTrainingAccessStatus;
  training_required: boolean;
  training_status: ToolTrainingTrainingStatus;
  trained_people: string | null;
  trained_roles: string | null;
  training_method: string | null;
  training_date: string | null;
  next_training_step: string | null;
  client_expectation: string | null;
  rgs_support_scope: string | null;
  handoff_status: ToolTrainingHandoffStatus;
  client_summary: string | null;
  status: ToolTrainingEntryStatus;
  sort_order: number;
  updated_at: string;
}

export async function adminListTrackerEntries(
  customerId: string,
): Promise<AdminToolTrainingTrackerEntry[]> {
  const { data, error } = await (supabase as any)
    .from("tool_training_tracker_entries")
    .select("*")
    .eq("customer_id", customerId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as AdminToolTrainingTrackerEntry[];
}

export async function adminCreateTrackerEntry(
  customerId: string,
  patch: Partial<AdminToolTrainingTrackerEntry> & { tool_key: string },
): Promise<AdminToolTrainingTrackerEntry> {
  const { data, error } = await (supabase as any)
    .from("tool_training_tracker_entries")
    .insert({ customer_id: customerId, ...patch })
    .select("*")
    .single();
  if (error) throw error;
  return data as AdminToolTrainingTrackerEntry;
}

export async function adminUpdateTrackerEntry(
  id: string,
  patch: Partial<AdminToolTrainingTrackerEntry>,
): Promise<void> {
  const { error } = await (supabase as any)
    .from("tool_training_tracker_entries").update(patch).eq("id", id);
  if (error) throw error;
}

export async function adminArchiveTrackerEntry(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from("tool_training_tracker_entries")
    .update({ archived_at: new Date().toISOString(), status: "archived" })
    .eq("id", id);
  if (error) throw error;
}

export async function getClientTrackerEntries(
  customerId: string,
): Promise<ClientToolTrainingTrackerEntry[]> {
  const { data, error } = await (supabase as any).rpc(
    "get_client_tool_training_tracker_entries",
    { _customer_id: customerId },
  );
  if (error) throw error;
  return (data ?? []) as ClientToolTrainingTrackerEntry[];
}

export const ACCESS_SOURCE_CLIENT_LABEL: Record<ToolTrainingAccessSource, string> = {
  stage_default: "Included in this stage",
  manual_grant: "Granted by RGS",
  manual_revoke: "Not currently available",
  admin_only: "Not currently available",
  locked: "Not currently available",
};

export const ACCESS_SOURCE_ADMIN_LABEL: Record<ToolTrainingAccessSource, string> = {
  stage_default: "Stage-default",
  manual_grant: "Manual grant (override)",
  manual_revoke: "Manual revoke (override)",
  admin_only: "Admin-only",
  locked: "Locked",
};

export const TRAINING_STATUS_LABEL: Record<ToolTrainingTrainingStatus, string> = {
  not_required: "Not required",
  not_started: "Not started",
  scheduled: "Scheduled",
  in_progress: "In progress",
  completed: "Completed",
  needs_refresh: "Needs refresh",
  blocked: "Blocked",
};

export const HANDOFF_STATUS_LABEL: Record<ToolTrainingHandoffStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  handed_off: "Handed off",
  needs_follow_up: "Needs follow-up",
  not_applicable: "Not applicable",
};

export const ENTRY_STATUS_LABEL: Record<ToolTrainingEntryStatus, string> = {
  draft: "Draft",
  ready_for_review: "Ready for review",
  client_visible: "Client-visible",
  active: "Active",
  needs_update: "Needs update",
  archived: "Archived",
};