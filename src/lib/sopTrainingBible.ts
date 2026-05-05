import { supabase } from "@/integrations/supabase/client";
import type { RoadmapGear } from "@/lib/implementationRoadmap";
import { findForbiddenSopPhrases } from "@/lib/sopForbiddenPhrases";

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

// ---------------------------------------------------------------------------
// P75 — Client-side SOP authoring helpers (RPC-only, never direct table writes)
// ---------------------------------------------------------------------------

export interface ClientSopDraft {
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
  ready_for_internal_use: boolean;
  ai_assisted: boolean;
  ai_disclosure_acknowledged: boolean;
  version: number;
  updated_at: string;
  created_at: string;
}

export interface ClientSopUpsertInput {
  id?: string | null;
  customerId: string;
  title: string;
  purpose?: string | null;
  gear?: RoadmapGear | null;
  category?: string | null;
  role_team?: string | null;
  trigger_when_used?: string | null;
  inputs_tools_needed?: string | null;
  quality_standard?: string | null;
  common_mistakes?: string | null;
  escalation_point?: string | null;
  owner_decision_point?: string | null;
  training_notes?: string | null;
  client_summary?: string | null;
  steps?: SopStep[];
  ready_for_internal_use?: boolean;
  ai_assisted?: boolean;
  ai_disclosure_acknowledged?: boolean;
}

export class SopForbiddenContentError extends Error {
  hits: { field: string; phrase: string }[];
  constructor(hits: { field: string; phrase: string }[]) {
    super(
      `This SOP draft contains language we don't put into client SOPs (e.g. "${hits[0]?.phrase}"). Reword and try again.`,
    );
    this.hits = hits;
  }
}

export async function clientListOwnSopDrafts(
  customerId: string,
): Promise<ClientSopDraft[]> {
  const { data, error } = await (supabase as any).rpc(
    "client_list_own_sop_drafts",
    { _customer_id: customerId },
  );
  if (error) throw error;
  return (data ?? []) as ClientSopDraft[];
}

export async function clientUpsertSopEntry(
  input: ClientSopUpsertInput,
): Promise<string> {
  const stringFields: Record<string, string | null | undefined> = {
    title: input.title,
    purpose: input.purpose ?? null,
    role_team: input.role_team ?? null,
    trigger_when_used: input.trigger_when_used ?? null,
    inputs_tools_needed: input.inputs_tools_needed ?? null,
    quality_standard: input.quality_standard ?? null,
    common_mistakes: input.common_mistakes ?? null,
    escalation_point: input.escalation_point ?? null,
    owner_decision_point: input.owner_decision_point ?? null,
    training_notes: input.training_notes ?? null,
    client_summary: input.client_summary ?? null,
  };
  for (const s of input.steps ?? []) {
    stringFields[`step_${s.order}_instruction`] = s.instruction;
    stringFields[`step_${s.order}_expected_outcome`] = s.expected_outcome ?? null;
    stringFields[`step_${s.order}_note`] = s.note ?? null;
  }
  const hits = findForbiddenSopPhrases(stringFields);
  if (hits.length > 0) throw new SopForbiddenContentError(hits);

  const { data, error } = await (supabase as any).rpc("client_upsert_sop_entry", {
    _id: input.id ?? null,
    _customer_id: input.customerId,
    _title: input.title,
    _purpose: input.purpose ?? null,
    _gear: input.gear ?? null,
    _category: input.category ?? null,
    _role_team: input.role_team ?? null,
    _trigger_when_used: input.trigger_when_used ?? null,
    _inputs_tools_needed: input.inputs_tools_needed ?? null,
    _quality_standard: input.quality_standard ?? null,
    _common_mistakes: input.common_mistakes ?? null,
    _escalation_point: input.escalation_point ?? null,
    _owner_decision_point: input.owner_decision_point ?? null,
    _training_notes: input.training_notes ?? null,
    _client_summary: input.client_summary ?? null,
    _steps: (input.steps ?? []) as any,
    _ready_for_internal_use: !!input.ready_for_internal_use,
    _ai_assisted: !!input.ai_assisted,
    _ai_disclosure_acknowledged: !!input.ai_disclosure_acknowledged,
  });
  if (error) throw error;
  return data as string;
}

export async function clientDeleteSopDraft(id: string): Promise<void> {
  const { error } = await (supabase as any).rpc("client_delete_sop_draft", {
    _id: id,
  });
  if (error) throw error;
}

export type ClientSopAiMode =
  | "draft"
  | "improve"
  | "training_checklist"
  | "qa_checklist"
  | "handoff_gaps";

export interface ClientSopAiInput {
  customerId: string;
  mode: ClientSopAiMode;
  industry_context?: string | null;
  process_name?: string | null;
  role_team?: string | null;
  process_purpose?: string | null;
  tools_needed?: string | null;
  source_notes?: string | null;
  common_mistakes?: string | null;
  measurable_completion_standard?: string | null;
  existing?: {
    title?: string | null;
    purpose?: string | null;
    role_team?: string | null;
    trigger_when_used?: string | null;
    inputs_tools_needed?: string | null;
    quality_standard?: string | null;
    common_mistakes?: string | null;
    escalation_point?: string | null;
    owner_decision_point?: string | null;
    training_notes?: string | null;
    client_summary?: string | null;
    steps?: SopStep[];
  } | null;
}

export interface ClientSopAiResult {
  sop: {
    title?: string;
    purpose?: string;
    role_team?: string;
    trigger_when_used?: string;
    inputs_tools_needed?: string;
    steps?: SopStep[];
    quality_standard?: string;
    common_mistakes?: string;
    escalation_point?: string;
    owner_decision_point?: string;
    training_notes?: string;
    training_checklist?: string[];
    qa_checklist?: string[];
    handoff_points?: string[];
    client_summary?: string;
    ai_assisted?: boolean;
  };
  ai_assisted: boolean;
  review_required: boolean;
  client_visible: boolean;
  disclosure: string;
  professional_review_disclosure: string;
}

export async function callClientSopAi(
  input: ClientSopAiInput,
): Promise<ClientSopAiResult> {
  const { data, error } = await (supabase as any).functions.invoke(
    "client-sop-ai-assist",
    { body: { ...input, customer_id: input.customerId } },
  );
  if (error) {
    const msg =
      (error as any)?.context?.error ??
      (error as any)?.message ??
      "AI draft unavailable right now.";
    throw new Error(msg);
  }
  return data as ClientSopAiResult;
}
