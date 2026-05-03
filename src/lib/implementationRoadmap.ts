import { supabase } from "@/integrations/supabase/client";

export type RoadmapStatus =
  | "draft" | "ready_for_client" | "active" | "paused" | "complete" | "archived";
export type RoadmapItemStatus =
  | "draft" | "not_started" | "in_progress" | "waiting_on_client"
  | "waiting_on_rgs" | "blocked" | "complete" | "archived";
export type RoadmapPhase =
  | "stabilize" | "install" | "train" | "handoff" | "ongoing_visibility";
export type RoadmapGear =
  | "demand_generation" | "revenue_conversion" | "operational_efficiency"
  | "financial_visibility" | "owner_independence";
export type RoadmapOwner = "rgs" | "client" | "shared";
export type RoadmapPriority = "low" | "medium" | "high" | "critical";
export type RoadmapImpact = "low" | "medium" | "high";
export type RoadmapEffort = "low" | "medium" | "high";
export type RoadmapDependency = "none" | "has_dependencies" | "blocks_other_work";

export interface AdminRoadmap {
  id: string;
  customer_id: string;
  source_report_id: string | null;
  title: string;
  summary: string | null;
  status: RoadmapStatus;
  client_visible: boolean;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface AdminRoadmapItem {
  id: string;
  roadmap_id: string;
  customer_id: string;
  gear: RoadmapGear | null;
  title: string;
  description: string | null;
  client_summary: string | null;
  internal_notes: string | null;
  priority: RoadmapPriority;
  impact: RoadmapImpact;
  effort: RoadmapEffort;
  dependency: RoadmapDependency;
  phase: RoadmapPhase;
  owner_type: RoadmapOwner;
  status: RoadmapItemStatus;
  sort_order: number;
  deliverable: string | null;
  success_indicator: string | null;
  client_visible: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export async function adminListRoadmaps(customerId: string): Promise<AdminRoadmap[]> {
  const { data, error } = await (supabase as any)
    .from("implementation_roadmaps")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as AdminRoadmap[];
}

export async function adminListRoadmapItems(roadmapId: string): Promise<AdminRoadmapItem[]> {
  const { data, error } = await (supabase as any)
    .from("implementation_roadmap_items")
    .select("*")
    .eq("roadmap_id", roadmapId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as AdminRoadmapItem[];
}

export async function adminCreateRoadmap(
  customerId: string,
  title: string,
  summary?: string,
): Promise<AdminRoadmap> {
  const { data, error } = await (supabase as any)
    .from("implementation_roadmaps")
    .insert({ customer_id: customerId, title, summary: summary ?? null })
    .select("*")
    .single();
  if (error) throw error;
  return data as AdminRoadmap;
}

export async function adminUpdateRoadmap(
  id: string,
  patch: Partial<Pick<AdminRoadmap, "title" | "summary" | "status" | "client_visible">>,
): Promise<void> {
  const { error } = await (supabase as any)
    .from("implementation_roadmaps").update(patch).eq("id", id);
  if (error) throw error;
}

export async function adminArchiveRoadmap(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from("implementation_roadmaps")
    .update({ archived_at: new Date().toISOString(), status: "archived" })
    .eq("id", id);
  if (error) throw error;
}

export async function adminCreateRoadmapItem(
  roadmapId: string,
  customerId: string,
  patch: Partial<AdminRoadmapItem> & { title: string },
): Promise<AdminRoadmapItem> {
  const { data, error } = await (supabase as any)
    .from("implementation_roadmap_items")
    .insert({ roadmap_id: roadmapId, customer_id: customerId, ...patch })
    .select("*").single();
  if (error) throw error;
  return data as AdminRoadmapItem;
}

export async function adminUpdateRoadmapItem(
  id: string,
  patch: Partial<AdminRoadmapItem>,
): Promise<void> {
  const { error } = await (supabase as any)
    .from("implementation_roadmap_items").update(patch).eq("id", id);
  if (error) throw error;
}

export async function adminArchiveRoadmapItem(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from("implementation_roadmap_items")
    .update({ archived_at: new Date().toISOString(), status: "archived" })
    .eq("id", id);
  if (error) throw error;
}

/** Client-safe roadmap row returned by RPC. Never includes internal_notes. */
export interface ClientRoadmapRow {
  roadmap_id: string;
  title: string;
  summary: string | null;
  status: RoadmapStatus;
  updated_at: string;
  item_id: string | null;
  gear: RoadmapGear | null;
  item_title: string | null;
  client_summary: string | null;
  priority: RoadmapPriority | null;
  phase: RoadmapPhase | null;
  owner_type: RoadmapOwner | null;
  item_status: RoadmapItemStatus | null;
  sort_order: number | null;
  deliverable: string | null;
  success_indicator: string | null;
}

export async function getClientImplementationRoadmap(
  customerId: string,
): Promise<ClientRoadmapRow[]> {
  const { data, error } = await (supabase as any).rpc(
    "get_client_implementation_roadmap",
    { _customer_id: customerId },
  );
  if (error) throw error;
  return (data ?? []) as ClientRoadmapRow[];
}

export const PHASE_LABELS: Record<RoadmapPhase, string> = {
  stabilize: "Phase 1 — Stabilize",
  install: "Phase 2 — Install",
  train: "Phase 3 — Train",
  handoff: "Phase 4 — Handoff",
  ongoing_visibility: "Phase 5 — Optional ongoing visibility",
};

export const GEAR_LABELS: Record<RoadmapGear, string> = {
  demand_generation: "Demand Generation",
  revenue_conversion: "Revenue Conversion",
  operational_efficiency: "Operational Efficiency",
  financial_visibility: "Financial Visibility",
  owner_independence: "Owner Independence",
};

export const OWNER_LABELS: Record<RoadmapOwner, string> = {
  rgs: "RGS supports within implementation scope",
  client: "Client / owner responsibility",
  shared: "Shared — RGS guides, client decides and executes",
};