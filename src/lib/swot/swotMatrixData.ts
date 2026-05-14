// RGS SWOT Strategic Matrix — data access layer.
//
// Wraps the new swot_analyses / swot_items / swot_signals tables with
// customer-scoped admin CRUD and approved-only client reads. RLS enforces
// the security boundary; this layer keeps the contract clean and predictable
// and runs the deterministic engine on approval to persist signals.
//
// Hard rule: never imports Campaign Control internals. Signals are produced
// from the deterministic engine here so other modules can consume them later.

import { supabase } from "@/integrations/supabase/client";
import {
  buildSwotSignalSummary,
  deriveSignalsForItem,
} from "./swotSignals";
import { normalizeSwotItem } from "./swotEngine";
import type {
  SwotAnalysis,
  SwotAnalysisMode,
  SwotAnalysisStatus,
  SwotCategory,
  SwotItem,
  SwotItemInput,
  SwotSignal,
  SwotSignalDraft,
} from "./types";

// ===== Admin: analyses =====

export async function adminListAnalyses(customerId: string): Promise<SwotAnalysis[]> {
  const { data, error } = await supabase
    .from("swot_analyses")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as SwotAnalysis[];
}

export async function adminCreateAnalysis(input: {
  customer_id: string;
  title: string;
  analysis_mode?: SwotAnalysisMode;
  industry?: string | null;
  business_stage?: string | null;
  client_visible?: boolean;
  notes?: string | null;
}): Promise<SwotAnalysis> {
  const { data: auth } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("swot_analyses")
    .insert({
      customer_id: input.customer_id,
      title: input.title.trim(),
      analysis_mode: input.analysis_mode ?? "full_rgs_client",
      industry: input.industry ?? null,
      business_stage: input.business_stage ?? null,
      notes: input.notes ?? null,
      client_visible: !!input.client_visible,
      created_by: auth.user?.id ?? null,
      status: "draft",
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as SwotAnalysis;
}

export async function adminUpdateAnalysis(
  id: string,
  patch: Partial<Pick<SwotAnalysis,
    "title" | "analysis_mode" | "industry" | "business_stage" |
    "notes" | "client_visible" | "status"
  >>,
): Promise<SwotAnalysis> {
  const { data, error } = await supabase
    .from("swot_analyses")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as SwotAnalysis;
}

export async function adminArchiveAnalysis(id: string): Promise<void> {
  const { error } = await supabase
    .from("swot_analyses")
    .update({ status: "archived" as SwotAnalysisStatus, archived_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

// ===== Admin: items =====

export async function adminListItems(analysisId: string): Promise<SwotItem[]> {
  const { data, error } = await supabase
    .from("swot_items")
    .select("*")
    .eq("swot_analysis_id", analysisId)
    .order("category", { ascending: true })
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as SwotItem[];
}

export async function adminCreateItem(
  analysis: Pick<SwotAnalysis, "id" | "customer_id">,
  input: SwotItemInput,
): Promise<SwotItem> {
  const normalized = normalizeSwotItem(input);
  const { data, error } = await supabase
    .from("swot_items")
    .insert({
      ...normalized,
      swot_analysis_id: analysis.id,
      customer_id: analysis.customer_id,
    })
    .select("*")
    .single();
  if (error) throw error;
  await touchAnalysisAfterEdit(analysis.id);
  return data as SwotItem;
}

export async function adminUpdateItem(
  id: string,
  analysisId: string,
  patch: Partial<SwotItemInput>,
): Promise<SwotItem> {
  // Re-normalize relevant fields without overwriting analysis/customer scoping.
  const safePatch: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    if (k === "title" || k === "description" || k === "evidence_summary"
      || k === "client_safe_summary" || k === "admin_only_notes" || k === "recommended_action") {
      safePatch[k] = typeof v === "string" ? v.trim() || null : v;
      if (k === "title" && typeof v === "string") safePatch[k] = v.trim();
    } else {
      safePatch[k] = v;
    }
  }
  const { data, error } = await supabase
    .from("swot_items")
    .update(safePatch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  await touchAnalysisAfterEdit(analysisId);
  return data as SwotItem;
}

export async function adminDeleteItem(id: string, analysisId: string): Promise<void> {
  const { error } = await supabase.from("swot_items").delete().eq("id", id);
  if (error) throw error;
  await touchAnalysisAfterEdit(analysisId);
}

// If admin edits an approved analysis, drop it back to ready_for_review so
// changed client-visible content cannot reach the client without re-approval.
async function touchAnalysisAfterEdit(analysisId: string): Promise<void> {
  const { data } = await supabase
    .from("swot_analyses")
    .select("status")
    .eq("id", analysisId)
    .maybeSingle();
  if (data?.status === "approved") {
    await supabase
      .from("swot_analyses")
      .update({ status: "ready_for_review" as SwotAnalysisStatus, approved_at: null, approved_by: null })
      .eq("id", analysisId);
  }
}

// ===== Admin: signals (preview + persist) =====

/** Generate (do not persist) signal drafts for a current set of items. */
export function previewSignalsForAnalysis(
  customerId: string,
  analysisId: string,
  items: SwotItem[],
): SwotSignalDraft[] {
  return buildSwotSignalSummary(customerId, analysisId, items);
}

export async function adminListSignals(analysisId: string): Promise<SwotSignal[]> {
  const { data, error } = await supabase
    .from("swot_signals")
    .select("*")
    .eq("swot_analysis_id", analysisId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as SwotSignal[];
}

/**
 * Approve an analysis: set status approved, persist deterministic signals,
 * stamp approver. Signals from prior approvals are wiped before re-persist
 * so the row set always matches the current item set.
 */
export async function adminApproveAnalysis(
  analysis: SwotAnalysis,
  items: SwotItem[],
): Promise<{ analysis: SwotAnalysis; signals: SwotSignal[] }> {
  const { data: auth } = await supabase.auth.getUser();

  // Generate signals from deterministic engine (no Campaign Control imports).
  const drafts: SwotSignalDraft[] = [];
  for (const item of items) {
    drafts.push(...deriveSignalsForItem(
      { customer_id: analysis.customer_id, swot_analysis_id: analysis.id, swot_item_id: item.id },
      item,
    ));
  }

  // Replace any existing signals for this analysis.
  const { error: delErr } = await supabase
    .from("swot_signals").delete().eq("swot_analysis_id", analysis.id);
  if (delErr) throw delErr;

  let inserted: SwotSignal[] = [];
  if (drafts.length > 0) {
    const { data, error } = await supabase
      .from("swot_signals")
      .insert(drafts)
      .select("*");
    if (error) throw error;
    inserted = (data ?? []) as SwotSignal[];
  }

  const nowIso = new Date().toISOString();
  const { data: updated, error: upErr } = await supabase
    .from("swot_analyses")
    .update({
      status: "approved" as SwotAnalysisStatus,
      approved_at: nowIso,
      approved_by: auth.user?.id ?? null,
      reviewed_at: nowIso,
      reviewed_by: auth.user?.id ?? null,
    })
    .eq("id", analysis.id)
    .select("*")
    .single();
  if (upErr) throw upErr;
  return { analysis: updated as SwotAnalysis, signals: inserted };
}

// ===== Client: approved-only reads =====

/** RLS will already filter — this is just an explicit, scoped query. */
export async function clientListApprovedAnalyses(customerId: string): Promise<SwotAnalysis[]> {
  const { data, error } = await supabase
    .from("swot_analyses")
    .select("*")
    .eq("customer_id", customerId)
    .eq("status", "approved")
    .eq("client_visible", true)
    .is("archived_at", null)
    .order("approved_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as SwotAnalysis[];
}

export async function clientListApprovedItems(analysisId: string, customerId: string): Promise<SwotItem[]> {
  const { data, error } = await supabase
    .from("swot_items")
    .select("*")
    .eq("swot_analysis_id", analysisId)
    .eq("customer_id", customerId)
    .eq("client_visible", true)
    .order("category", { ascending: true })
    .order("display_order", { ascending: true });
  if (error) throw error;
  // Defense-in-depth: strip admin-only fields client-side as well.
  return (data ?? []).map((row) => ({ ...(row as SwotItem), admin_only_notes: null }));
}

export async function clientListClientSafeSignals(analysisId: string, customerId: string): Promise<SwotSignal[]> {
  const { data, error } = await supabase
    .from("swot_signals")
    .select("*")
    .eq("swot_analysis_id", analysisId)
    .eq("customer_id", customerId)
    .eq("client_safe", true)
    .eq("admin_only", false);
  if (error) throw error;
  return (data ?? []) as SwotSignal[];
}

// ===== Display labels =====

export const CATEGORY_LABEL: Record<SwotCategory, string> = {
  strength: "Strengths",
  weakness: "Weaknesses",
  opportunity: "Opportunities",
  threat: "Threats",
};

export const CATEGORY_BLURB: Record<SwotCategory, string> = {
  strength: "Internal — what is working in the business",
  weakness: "Internal — what is creating instability",
  opportunity: "External — what is worth watching",
  threat: "External — what could destabilize revenue or control",
};

export const CONFIDENCE_LABEL: Record<SwotItem["evidence_confidence"], string> = {
  verified: "Verified",
  partially_supported: "Partially supported",
  owner_claim_only: "Owner claim only",
  assumption: "Assumption",
  missing_evidence: "Missing evidence",
};

export const CONFIDENCE_PLAIN: Record<SwotItem["evidence_confidence"], string> = {
  verified: "Backed by reviewed evidence.",
  partially_supported: "Some supporting evidence — not fully verified.",
  owner_claim_only: "Stated by the owner — not independently verified.",
  assumption: "Working assumption — needs evidence.",
  missing_evidence: "Evidence has not been gathered yet.",
};

export const GEAR_LABEL: Record<SwotItem["linked_gear"], string> = {
  demand_generation: "Demand Generation",
  revenue_conversion: "Revenue Conversion",
  operational_efficiency: "Operational Efficiency",
  financial_visibility: "Financial Visibility",
  owner_independence: "Owner Independence",
  multiple: "Multiple Gears",
};

export const SIGNAL_LABEL: Record<SwotSignal["signal_type"], string> = {
  repair_priority: "Repair Map",
  campaign_input: "Campaign future input",
  buyer_persona_input: "Buyer Persona / ICP",
  implementation_input: "Implementation",
  control_system_watch_item: "Control System watch",
  reengagement_trigger: "Re-engagement trigger",
  evidence_needed: "Evidence needed",
  owner_independence_risk: "Owner Independence risk",
  conversion_risk: "Conversion risk",
  demand_opportunity: "Demand opportunity",
  financial_visibility_risk: "Financial Visibility risk",
  operational_bottleneck: "Operational bottleneck",
};

export const ANALYSIS_MODE_LABEL: Record<SwotAnalysisMode, string> = {
  full_rgs_client: "Full RGS client",
  diagnostic_support: "Diagnostic support",
  implementation_support: "Implementation support",
  control_system_support: "Control System support",
  standalone_gig: "Standalone / gig",
  demo: "Demo",
};

export const ANALYSIS_STATUS_LABEL: Record<SwotAnalysisStatus, string> = {
  draft: "Draft",
  needs_inputs: "Needs inputs",
  ready_for_review: "Ready for review",
  reviewed: "Reviewed",
  approved: "Approved",
  archived: "Archived",
};

export const SCOPE_DISCLAIMER =
  "SWOT findings are strategic and operational guidance. They do not promise " +
  "revenue, profit, growth, valuation, legal, tax, accounting, or compliance " +
  "outcomes. Cannabis or MMJ context is operational and documentation visibility " +
  "only, not regulatory or compliance certification.";

export const STANDALONE_SCOPE_NOTE =
  "This SWOT is a standalone strategic analysis. It does not replace a full RGS " +
  "Diagnostic, Implementation, or Control System engagement unless that scope " +
  "has been purchased or approved.";