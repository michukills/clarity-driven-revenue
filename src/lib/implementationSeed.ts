/**
 * Implementation Completion add-on — admin-triggered helpers.
 *
 * - Seed Implementation Roadmap items from the customer's existing
 *   Priority Action Tracker (which itself is fed by repair-map / diagnostic
 *   findings via source_id). No new repair system is introduced.
 * - Bulk-create Tool Assignment + Training Tracker entries from the
 *   customer's effective tool list. Manual override only — does not
 *   change access gates.
 * - Reorder roadmap items via existing sort_order column.
 *
 * All entry points are admin-only. RLS on the underlying tables is the
 * authoritative gate; these helpers only call admin-managed surfaces.
 */

import { supabase } from "@/integrations/supabase/client";
import {
  adminCreateRoadmapItem,
  adminListRoadmapItems,
  adminUpdateRoadmapItem,
  type AdminRoadmapItem,
  type RoadmapPriority,
} from "@/lib/implementationRoadmap";
import {
  adminCreateTrackerEntry,
  adminListTrackerEntries,
  type AdminToolTrainingTrackerEntry,
} from "@/lib/toolTrainingTracker";
import { getEffectiveToolsForCustomer, type EffectiveTool } from "@/lib/toolCatalog";

export interface PriorityActionSeed {
  id: string;
  title: string;
  description: string | null;
  priority_level: string;
  why_it_matters: string | null;
  recommended_next_step: string | null;
  success_signal: string | null;
  source_label: string | null;
}

export interface SeedRoadmapPreviewItem {
  source_id: string;
  title: string;
  client_summary: string;
  internal_notes: string;
  priority: RoadmapPriority;
  deliverable: string | null;
  success_indicator: string | null;
  duplicate: boolean;
}

export interface SeedRoadmapResult {
  created: number;
  skipped_duplicates: number;
  items: AdminRoadmapItem[];
}

function mapPriority(p: string): RoadmapPriority {
  if (p === "critical" || p === "high" || p === "medium" || p === "low") return p;
  return "medium";
}

export async function loadPriorityActions(customerId: string): Promise<PriorityActionSeed[]> {
  const { data, error } = await (supabase as any)
    .from("priority_action_items")
    .select("id, title, description, priority_level, why_it_matters, recommended_next_step, success_signal, source_label")
    .eq("customer_id", customerId)
    .is("archived_at", null);
  if (error) throw error;
  return (data ?? []) as PriorityActionSeed[];
}

export async function previewSeedRoadmapFromPriorityActions(
  customerId: string,
  roadmapId: string,
): Promise<SeedRoadmapPreviewItem[]> {
  const [actions, existing] = await Promise.all([
    loadPriorityActions(customerId),
    adminListRoadmapItems(roadmapId),
  ]);
  const existingSourceIds = new Set(
    existing
      .map((it: any) => it.source_priority_action_item_id as string | null)
      .filter(Boolean) as string[],
  );
  return actions.map((a) => ({
    source_id: a.id,
    title: a.title,
    client_summary: a.description ?? a.why_it_matters ?? "",
    internal_notes: [
      a.source_label ? `Source: ${a.source_label}` : null,
      a.recommended_next_step ? `Recommended next step: ${a.recommended_next_step}` : null,
      a.success_signal ? `Success signal: ${a.success_signal}` : null,
    ].filter(Boolean).join("\n"),
    priority: mapPriority(a.priority_level),
    deliverable: a.recommended_next_step,
    success_indicator: a.success_signal,
    duplicate: existingSourceIds.has(a.id),
  }));
}

/**
 * Admin action: create roadmap items from priority actions, skipping any that
 * already exist on this roadmap (matched by source_priority_action_item_id).
 * Defaults: status=draft, client_visible=false, owner_type=shared, phase=install.
 */
export async function seedRoadmapFromPriorityActions(
  customerId: string,
  roadmapId: string,
): Promise<SeedRoadmapResult> {
  const preview = await previewSeedRoadmapFromPriorityActions(customerId, roadmapId);
  const created: AdminRoadmapItem[] = [];
  let skipped = 0;
  const items = await adminListRoadmapItems(roadmapId);
  let nextSort = items.reduce((m, it) => Math.max(m, it.sort_order ?? 0), 0) + 10;

  for (const p of preview) {
    if (p.duplicate) { skipped += 1; continue; }
    try {
      const row = await adminCreateRoadmapItem(roadmapId, customerId, {
        title: p.title,
        client_summary: p.client_summary || null,
        internal_notes: p.internal_notes || null,
        priority: p.priority,
        deliverable: p.deliverable,
        success_indicator: p.success_indicator,
        client_visible: false,
        sort_order: nextSort,
        ...({ source_priority_action_item_id: p.source_id } as any),
      });
      created.push(row);
      nextSort += 10;
    } catch (e: any) {
      if (String(e?.message ?? "").includes("uniq_impl_roadmap_items_pat_source")) {
        skipped += 1;
      } else {
        throw e;
      }
    }
  }
  return { created: created.length, skipped_duplicates: skipped, items: created };
}

/* -------------------- Roadmap reorder -------------------- */

/** Apply a new ordering by writing sort_order = (idx+1)*10 for each id. */
export async function reorderRoadmapItems(orderedIds: string[]): Promise<void> {
  let i = 0;
  for (const id of orderedIds) {
    await adminUpdateRoadmapItem(id, { sort_order: (i + 1) * 10 });
    i += 1;
  }
}

/* -------------------- Bulk tracker creation -------------------- */

export interface BulkTrackerPreviewItem {
  tool_key: string;
  tool_name: string;
  effective_enabled: boolean;
  override_state: EffectiveTool["override_state"];
  duplicate: boolean;
}

export interface BulkTrackerResult {
  created: number;
  skipped_duplicates: number;
  entries: AdminToolTrainingTrackerEntry[];
}

export async function previewBulkTrackerFromEffectiveTools(
  customerId: string,
): Promise<BulkTrackerPreviewItem[]> {
  const [eff, existing] = await Promise.all([
    getEffectiveToolsForCustomer(customerId),
    adminListTrackerEntries(customerId),
  ]);
  const existingKeys = new Set(existing.map((e) => e.tool_key));
  return eff
    .filter((e) => e.tool_type !== "admin_only" && e.default_visibility !== "hidden")
    .map((e) => ({
      tool_key: e.tool_key,
      tool_name: e.name,
      effective_enabled: e.effective_enabled,
      override_state: e.override_state,
      duplicate: existingKeys.has(e.tool_key),
    }));
}

export async function bulkCreateTrackerFromEffectiveTools(
  customerId: string,
): Promise<BulkTrackerResult> {
  const preview = await previewBulkTrackerFromEffectiveTools(customerId);
  const created: AdminToolTrainingTrackerEntry[] = [];
  let skipped = 0;
  for (const p of preview) {
    if (p.duplicate) { skipped += 1; continue; }
    try {
      const row = await adminCreateTrackerEntry(customerId, {
        tool_key: p.tool_key,
        tool_name_snapshot: p.tool_name,
        access_source: p.override_state === "granted"
          ? "manual_grant"
          : p.override_state === "revoked"
          ? "manual_revoke"
          : p.effective_enabled ? "stage_default" : "locked",
        access_status: p.effective_enabled ? "available" : "locked",
        client_visible: false,
        training_required: true,
        training_status: "not_started",
        handoff_status: "not_started",
        status: "draft",
      });
      created.push(row);
    } catch (e: any) {
      if (String(e?.message ?? "").includes("uniq_tool_training_tracker_active")) {
        skipped += 1;
      } else {
        throw e;
      }
    }
  }
  return { created: created.length, skipped_duplicates: skipped, entries: created };
}

/* -------------------- SOP AI assist invoker -------------------- */

export interface SopAiSeedPayload {
  mode: "draft" | "improve";
  customer_id?: string | null;
  sop_entry_id?: string | null;
  industry_context?: string | null;
  task_description?: string | null;
  current_process_notes?: string | null;
  desired_outcome?: string | null;
  role_team?: string | null;
  known_bottlenecks?: string | null;
  software_tools?: string | null;
  customer_handoff_points?: string | null;
  quality_issues?: string | null;
  what_usually_goes_wrong?: string | null;
  what_owner_wants_standardized?: string | null;
  existing?: Record<string, unknown> | null;
}

export interface SopAiDraftResponse {
  sop: {
    title?: string;
    purpose?: string;
    role_team?: string;
    trigger_when_used?: string;
    inputs_tools_needed?: string;
    steps?: { order: number; instruction: string; expected_outcome?: string; note?: string }[];
    quality_standard?: string;
    common_mistakes?: string;
    escalation_point?: string;
    owner_decision_point?: string;
    training_notes?: string;
    client_summary?: string;
    admin_review_notes?: string;
    confidence?: "low" | "medium" | "high";
    missing_validation?: string[];
  };
  defaults: { status: "draft"; client_visible: false; review_state: "not_reviewed" };
  review_required: true;
  client_visible: false;
}

/**
 * Calls the admin-only sop-ai-assist edge function. The frontend never sees
 * the AI gateway URL or LOVABLE_API_KEY; the edge function holds them.
 */
export async function requestSopAiDraft(payload: SopAiSeedPayload): Promise<SopAiDraftResponse> {
  const { data, error } = await supabase.functions.invoke("sop-ai-assist", {
    body: payload,
  });
  if (error) throw error;
  return data as SopAiDraftResponse;
}
