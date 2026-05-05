/**
 * P71 — Worn Tooth Signals™ service layer (Revenue & Risk Monitor™).
 *
 * Tenant-safe CRUD + workflow helpers for `worn_tooth_signals`. RLS
 * already enforces admin-only mutations and customer-only client-safe
 * reads (via the SECURITY DEFINER RPC). This module also defensively
 * scrubs forbidden phrases before persisting any client-facing text.
 */
import { supabase } from "@/integrations/supabase/client";
import {
  findWornToothSignalForbiddenPhrase,
  WORN_TOOTH_SIGNAL_REGISTRY,
  type WornToothSignalGear,
  type WornToothSignalSeverity,
  type WornToothSignalStatus,
  type WornToothSignalTrend,
} from "@/config/wornToothSignals";

export interface WornToothSignalRow {
  id: string;
  customer_id: string;
  signal_key: string | null;
  signal_title: string;
  signal_category: string | null;
  gear: WornToothSignalGear;
  severity: WornToothSignalSeverity;
  status: WornToothSignalStatus;
  trend: WornToothSignalTrend;
  detected_source: string | null;
  deterministic_trigger_key: string | null;
  supporting_metric_key: string | null;
  supporting_metric_value: string | null;
  supporting_metric_period: string | null;
  benchmark_or_threshold_used: string | null;
  evidence_strength: "low" | "medium" | "high" | null;
  client_safe_summary: string | null;
  client_safe_explanation: string | null;
  admin_interpretation: string | null;
  admin_notes: string | null;
  recommended_owner_action: string | null;
  repair_map_recommendation: string | null;
  linked_reality_check_flag_id: string | null;
  linked_evidence_record_id: string | null;
  linked_repair_map_item_id: string | null;
  linked_scorecard_run_id: string | null;
  professional_review_recommended: boolean;
  regulated_industry_sensitive: boolean;
  approved_for_client: boolean;
  client_visible: boolean;
  include_in_report: boolean;
  dismissed_reason: string | null;
  resolved_at: string | null;
  dismissed_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientWornToothSignalRow {
  id: string;
  signal_title: string;
  client_safe_summary: string | null;
  client_safe_explanation: string | null;
  gear: string;
  severity: WornToothSignalSeverity;
  trend: WornToothSignalTrend;
  status: WornToothSignalStatus;
  recommended_owner_action: string | null;
  professional_review_recommended: boolean;
  linked_repair_map_item_id: string | null;
  linked_evidence_record_id: string | null;
  reviewed_at: string | null;
}

export interface ReportWornToothSignalSummary {
  id: string;
  signal_title: string;
  client_safe_summary: string | null;
  client_safe_explanation: string | null;
  gear: string;
  severity: WornToothSignalSeverity;
  trend: WornToothSignalTrend;
  recommended_owner_action: string | null;
  professional_review_recommended: boolean;
  linked_repair_map_item_id: string | null;
}

function scrubClientSafe(input: {
  clientSafeSummary?: string | null;
  clientSafeExplanation?: string | null;
  recommendedOwnerAction?: string | null;
}) {
  for (const text of [
    input.clientSafeSummary,
    input.clientSafeExplanation,
    input.recommendedOwnerAction,
  ]) {
    const bad = findWornToothSignalForbiddenPhrase(text);
    if (bad) throw new Error(`Forbidden client-facing phrase: "${bad}".`);
  }
}

export interface AdminCreateWornToothSignalInput {
  customerId: string;
  signalTitle: string;
  signalKey?: string | null;
  signalCategory?: string | null;
  gear: WornToothSignalGear;
  severity?: WornToothSignalSeverity;
  detectedSource?: string;
  deterministicTriggerKey?: string | null;
  supportingMetricKey?: string | null;
  supportingMetricValue?: string | null;
  supportingMetricPeriod?: string | null;
  benchmarkOrThresholdUsed?: string | null;
  evidenceStrength?: "low" | "medium" | "high" | null;
  clientSafeSummary?: string | null;
  clientSafeExplanation?: string | null;
  adminInterpretation?: string | null;
  adminNotes?: string | null;
  recommendedOwnerAction?: string | null;
  repairMapRecommendation?: string | null;
  professionalReviewRecommended?: boolean;
  regulatedIndustrySensitive?: boolean;
  linkedRealityCheckFlagId?: string | null;
  linkedEvidenceRecordId?: string | null;
  linkedRepairMapItemId?: string | null;
  linkedScorecardRunId?: string | null;
}

export async function adminListWornToothSignals(
  customerId: string,
): Promise<WornToothSignalRow[]> {
  const { data, error } = await (supabase as any)
    .from("worn_tooth_signals")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as WornToothSignalRow[];
}

export async function adminCreateWornToothSignal(
  input: AdminCreateWornToothSignalInput,
): Promise<WornToothSignalRow> {
  scrubClientSafe(input);
  const { data: userData } = await supabase.auth.getUser();
  const createdBy = userData?.user?.id ?? null;
  const { data, error } = await (supabase as any)
    .from("worn_tooth_signals")
    .insert([
      {
        customer_id: input.customerId,
        signal_key: input.signalKey ?? null,
        signal_title: input.signalTitle,
        signal_category: input.signalCategory ?? null,
        gear: input.gear,
        severity: input.severity ?? "medium",
        status: "detected",
        detected_source: input.detectedSource ?? "admin_manual",
        deterministic_trigger_key: input.deterministicTriggerKey ?? null,
        supporting_metric_key: input.supportingMetricKey ?? null,
        supporting_metric_value: input.supportingMetricValue ?? null,
        supporting_metric_period: input.supportingMetricPeriod ?? null,
        benchmark_or_threshold_used: input.benchmarkOrThresholdUsed ?? null,
        evidence_strength: input.evidenceStrength ?? null,
        client_safe_summary: input.clientSafeSummary ?? null,
        client_safe_explanation: input.clientSafeExplanation ?? null,
        admin_interpretation: input.adminInterpretation ?? null,
        admin_notes: input.adminNotes ?? null,
        recommended_owner_action: input.recommendedOwnerAction ?? null,
        repair_map_recommendation: input.repairMapRecommendation ?? null,
        professional_review_recommended:
          input.professionalReviewRecommended ?? false,
        regulated_industry_sensitive:
          input.regulatedIndustrySensitive ?? false,
        linked_reality_check_flag_id: input.linkedRealityCheckFlagId ?? null,
        linked_evidence_record_id: input.linkedEvidenceRecordId ?? null,
        linked_repair_map_item_id: input.linkedRepairMapItemId ?? null,
        linked_scorecard_run_id: input.linkedScorecardRunId ?? null,
        client_visible: false,
        approved_for_client: false,
        include_in_report: false,
        created_by: createdBy,
      },
    ])
    .select("*")
    .single();
  if (error) throw error;
  return data as WornToothSignalRow;
}

export interface AdminUpdateWornToothSignalInput {
  signalTitle?: string;
  signalCategory?: string | null;
  gear?: WornToothSignalGear;
  severity?: WornToothSignalSeverity;
  status?: WornToothSignalStatus;
  trend?: WornToothSignalTrend;
  supportingMetricKey?: string | null;
  supportingMetricValue?: string | null;
  supportingMetricPeriod?: string | null;
  benchmarkOrThresholdUsed?: string | null;
  evidenceStrength?: "low" | "medium" | "high" | null;
  clientSafeSummary?: string | null;
  clientSafeExplanation?: string | null;
  adminInterpretation?: string | null;
  adminNotes?: string | null;
  recommendedOwnerAction?: string | null;
  repairMapRecommendation?: string | null;
  professionalReviewRecommended?: boolean;
  regulatedIndustrySensitive?: boolean;
  approvedForClient?: boolean;
  clientVisible?: boolean;
  includeInReport?: boolean;
  dismissedReason?: string | null;
  linkedRealityCheckFlagId?: string | null;
  linkedEvidenceRecordId?: string | null;
  linkedRepairMapItemId?: string | null;
  linkedScorecardRunId?: string | null;
}

export async function adminUpdateWornToothSignal(
  signalId: string,
  input: AdminUpdateWornToothSignalInput,
): Promise<void> {
  scrubClientSafe(input);
  const { data: userData } = await supabase.auth.getUser();
  const reviewer = userData?.user?.id ?? null;
  const patch: Record<string, unknown> = {
    signal_title: input.signalTitle,
    signal_category: input.signalCategory,
    gear: input.gear,
    severity: input.severity,
    status: input.status,
    trend: input.trend,
    supporting_metric_key: input.supportingMetricKey,
    supporting_metric_value: input.supportingMetricValue,
    supporting_metric_period: input.supportingMetricPeriod,
    benchmark_or_threshold_used: input.benchmarkOrThresholdUsed,
    evidence_strength: input.evidenceStrength,
    client_safe_summary: input.clientSafeSummary,
    client_safe_explanation: input.clientSafeExplanation,
    admin_interpretation: input.adminInterpretation,
    admin_notes: input.adminNotes,
    recommended_owner_action: input.recommendedOwnerAction,
    repair_map_recommendation: input.repairMapRecommendation,
    professional_review_recommended: input.professionalReviewRecommended,
    regulated_industry_sensitive: input.regulatedIndustrySensitive,
    approved_for_client: input.approvedForClient,
    client_visible: input.clientVisible,
    include_in_report: input.includeInReport,
    dismissed_reason: input.dismissedReason,
    linked_reality_check_flag_id: input.linkedRealityCheckFlagId,
    linked_evidence_record_id: input.linkedEvidenceRecordId,
    linked_repair_map_item_id: input.linkedRepairMapItemId,
    linked_scorecard_run_id: input.linkedScorecardRunId,
    reviewed_by: reviewer,
    reviewed_at: new Date().toISOString(),
  };
  Object.keys(patch).forEach((k) => {
    if (patch[k] === undefined) delete patch[k];
  });
  const { error } = await (supabase as any)
    .from("worn_tooth_signals")
    .update(patch)
    .eq("id", signalId);
  if (error) throw error;
}

export async function adminApproveSignalForClient(
  signalId: string,
  clientSafeExplanation: string,
  opts: { includeInReport?: boolean } = {},
): Promise<void> {
  const bad = findWornToothSignalForbiddenPhrase(clientSafeExplanation);
  if (bad) throw new Error(`Forbidden client-facing phrase: "${bad}".`);
  await adminUpdateWornToothSignal(signalId, {
    clientSafeExplanation,
    approvedForClient: true,
    clientVisible: true,
    status: "client_visible",
    includeInReport: opts.includeInReport ?? false,
  });
}

export async function adminDismissSignal(
  signalId: string,
  reason: string,
): Promise<void> {
  await adminUpdateWornToothSignal(signalId, {
    status: "dismissed",
    dismissedReason: reason,
    approvedForClient: false,
    clientVisible: false,
    includeInReport: false,
  });
}

export async function adminResolveSignal(signalId: string): Promise<void> {
  await adminUpdateWornToothSignal(signalId, { status: "resolved" });
}

/** Client-facing read (RPC enforces admin or owner-of-customer access). */
export async function getClientWornToothSignals(
  customerId: string,
): Promise<ClientWornToothSignalRow[]> {
  const { data, error } = await (supabase as any).rpc(
    "get_client_worn_tooth_signals",
    { _customer_id: customerId },
  );
  if (error) throw error;
  // Defensive scrub: strip any row whose client text accidentally
  // contains a forbidden phrase.
  return ((data ?? []) as ClientWornToothSignalRow[]).filter(
    (r) =>
      !findWornToothSignalForbiddenPhrase(r.client_safe_summary) &&
      !findWornToothSignalForbiddenPhrase(r.client_safe_explanation) &&
      !findWornToothSignalForbiddenPhrase(r.recommended_owner_action),
  );
}

/** Report-builder read (admin-only). Used to inject into Structural Health Report™. */
export async function adminListReportWornToothSignals(
  customerId: string,
): Promise<ReportWornToothSignalSummary[]> {
  const { data, error } = await (supabase as any).rpc(
    "admin_list_report_worn_tooth_signals",
    { _customer_id: customerId },
  );
  if (error) throw error;
  return (data ?? []) as ReportWornToothSignalSummary[];
}

/** Honest report renderer — used by PDF builder and tests. */
export const WORN_TOOTH_SIGNALS_PLACEHOLDER_BODY =
  "No Worn Tooth Signals™ have been reviewed and approved for inclusion " +
  "in this report yet. Worn Tooth Signals™ are early operational warnings " +
  "and do not guarantee future performance.";

export function renderWornToothSignalsForReport(
  signals: ReadonlyArray<ReportWornToothSignalSummary>,
): string {
  if (!signals.length) return WORN_TOOTH_SIGNALS_PLACEHOLDER_BODY;
  const lines = signals.map((s) => {
    const gear = s.gear ? ` · ${s.gear.replace(/_/g, " ")}` : "";
    const sev = ` [${s.severity}]`;
    const trend =
      s.trend && s.trend !== "unknown" ? ` · trend: ${s.trend}` : "";
    const review = s.professional_review_recommended
      ? "\n   Professional review recommended."
      : "";
    const action = s.recommended_owner_action
      ? `\n   Owner action: ${s.recommended_owner_action}`
      : "";
    const body =
      s.client_safe_explanation ?? s.client_safe_summary ?? s.signal_title;
    return `• ${s.signal_title}${gear}${sev}${trend}\n   ${body}${action}${review}`;
  });
  return lines.join("\n");
}

export function getWornToothSignalRegistry() {
  return WORN_TOOTH_SIGNAL_REGISTRY;
}