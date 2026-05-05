/**
 * P70 — Reality Check Flags™ service layer.
 *
 * Tenant-safe CRUD + workflow helpers for `reality_check_flags`.
 * RLS already enforces admin-only mutations and owner-only client
 * reads. This module adds a defensive client-safe phrase scanner so
 * banned legal/compliance language can never reach a client surface
 * even if RLS were misconfigured.
 */
import { supabase } from "@/integrations/supabase/client";
import {
  findRealityCheckForbiddenPhrase,
  type RealityCheckFlagGear,
  type RealityCheckFlagSeverity,
  type RealityCheckFlagStatus,
  type RealityCheckFlagType,
  type RealityCheckRule,
} from "@/config/realityCheckFlags";

export interface RealityCheckFlagRow {
  id: string;
  customer_id: string;
  title: string;
  summary: string | null;
  affected_gear: string | null;
  affected_metric: string | null;
  flag_type: RealityCheckFlagType;
  severity: RealityCheckFlagSeverity;
  status: RealityCheckFlagStatus;
  detected_source: string | null;
  owner_claim: string | null;
  evidence_gap: string | null;
  contradicting_metric: string | null;
  linked_scorecard_run_id: string | null;
  linked_scorecard_item_id: string | null;
  linked_tool_submission_id: string | null;
  linked_evidence_record_id: string | null;
  linked_repair_map_item_id: string | null;
  linked_report_draft_id: string | null;
  linked_connector_provider: string | null;
  admin_only_note: string | null;
  client_visible_explanation: string | null;
  professional_review_recommended: boolean;
  regulated_industry_sensitive: boolean;
  client_visible: boolean;
  approved_for_client: boolean;
  include_in_report: boolean;
  dismissed_reason: string | null;
  resolved_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientRealityCheckFlagRow {
  id: string;
  title: string;
  client_visible_explanation: string | null;
  affected_gear: string | null;
  severity: RealityCheckFlagSeverity;
  status: RealityCheckFlagStatus;
  professional_review_recommended: boolean;
  linked_repair_map_item_id: string | null;
  reviewed_at: string | null;
}

export interface AdminCreateRealityCheckFlagInput {
  customerId: string;
  title: string;
  summary?: string | null;
  affectedGear?: RealityCheckFlagGear | null;
  affectedMetric?: string | null;
  flagType?: RealityCheckFlagType;
  severity?: RealityCheckFlagSeverity;
  detectedSource?: string;
  ownerClaim?: string | null;
  evidenceGap?: string | null;
  contradictingMetric?: string | null;
  adminOnlyNote?: string | null;
  clientVisibleExplanation?: string | null;
  professionalReviewRecommended?: boolean;
  regulatedIndustrySensitive?: boolean;
  linkedEvidenceRecordId?: string | null;
  linkedRepairMapItemId?: string | null;
  linkedScorecardRunId?: string | null;
  ruleId?: string;
}

export async function adminListRealityCheckFlags(
  customerId: string,
): Promise<RealityCheckFlagRow[]> {
  const { data, error } = await supabase
    .from("reality_check_flags")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as RealityCheckFlagRow[];
}

export async function adminCreateRealityCheckFlag(
  input: AdminCreateRealityCheckFlagInput,
): Promise<RealityCheckFlagRow> {
  if (input.clientVisibleExplanation) {
    const bad = findRealityCheckForbiddenPhrase(input.clientVisibleExplanation);
    if (bad) {
      throw new Error(`Forbidden client-facing phrase: "${bad}".`);
    }
  }
  const { data: userData } = await supabase.auth.getUser();
  const createdBy = userData?.user?.id ?? null;

  const { data, error } = await supabase
    .from("reality_check_flags")
    .insert([
      {
        customer_id: input.customerId,
        title: input.title,
        summary: input.summary ?? null,
        affected_gear: input.affectedGear ?? null,
        affected_metric: input.affectedMetric ?? null,
        flag_type: input.flagType ?? "owner_claim_unsupported",
        severity: input.severity ?? "watch",
        status: "detected",
        detected_source: input.detectedSource ?? "admin_manual",
        owner_claim: input.ownerClaim ?? null,
        evidence_gap: input.evidenceGap ?? null,
        contradicting_metric: input.contradictingMetric ?? null,
        admin_only_note: input.adminOnlyNote ?? null,
        client_visible_explanation: input.clientVisibleExplanation ?? null,
        professional_review_recommended:
          input.professionalReviewRecommended ?? false,
        regulated_industry_sensitive:
          input.regulatedIndustrySensitive ?? false,
        linked_evidence_record_id: input.linkedEvidenceRecordId ?? null,
        linked_repair_map_item_id: input.linkedRepairMapItemId ?? null,
        linked_scorecard_run_id: input.linkedScorecardRunId ?? null,
        client_visible: false,
        approved_for_client: false,
        include_in_report: false,
        created_by: createdBy,
      } as never,
    ])
    .select("*")
    .single();
  if (error) throw error;
  return data as RealityCheckFlagRow;
}

export interface AdminUpdateRealityCheckFlagInput {
  title?: string;
  summary?: string | null;
  affectedGear?: RealityCheckFlagGear | null;
  affectedMetric?: string | null;
  flagType?: RealityCheckFlagType;
  severity?: RealityCheckFlagSeverity;
  status?: RealityCheckFlagStatus;
  ownerClaim?: string | null;
  evidenceGap?: string | null;
  contradictingMetric?: string | null;
  adminOnlyNote?: string | null;
  clientVisibleExplanation?: string | null;
  professionalReviewRecommended?: boolean;
  regulatedIndustrySensitive?: boolean;
  clientVisible?: boolean;
  approvedForClient?: boolean;
  includeInReport?: boolean;
  dismissedReason?: string | null;
  linkedEvidenceRecordId?: string | null;
  linkedRepairMapItemId?: string | null;
  linkedScorecardRunId?: string | null;
}

export async function adminUpdateRealityCheckFlag(
  flagId: string,
  input: AdminUpdateRealityCheckFlagInput,
): Promise<void> {
  if (input.clientVisibleExplanation) {
    const bad = findRealityCheckForbiddenPhrase(input.clientVisibleExplanation);
    if (bad) {
      throw new Error(`Forbidden client-facing phrase: "${bad}".`);
    }
  }
  const { data: userData } = await supabase.auth.getUser();
  const reviewer = userData?.user?.id ?? null;

  const patch: Record<string, unknown> = {
    title: input.title,
    summary: input.summary,
    affected_gear: input.affectedGear,
    affected_metric: input.affectedMetric,
    flag_type: input.flagType,
    severity: input.severity,
    status: input.status,
    owner_claim: input.ownerClaim,
    evidence_gap: input.evidenceGap,
    contradicting_metric: input.contradictingMetric,
    admin_only_note: input.adminOnlyNote,
    client_visible_explanation: input.clientVisibleExplanation,
    professional_review_recommended: input.professionalReviewRecommended,
    regulated_industry_sensitive: input.regulatedIndustrySensitive,
    client_visible: input.clientVisible,
    approved_for_client: input.approvedForClient,
    include_in_report: input.includeInReport,
    dismissed_reason: input.dismissedReason,
    linked_evidence_record_id: input.linkedEvidenceRecordId,
    linked_repair_map_item_id: input.linkedRepairMapItemId,
    linked_scorecard_run_id: input.linkedScorecardRunId,
    reviewed_by: reviewer,
    reviewed_at: new Date().toISOString(),
  };
  Object.keys(patch).forEach((k) => {
    if (patch[k] === undefined) delete patch[k];
  });

  const { error } = await supabase
    .from("reality_check_flags")
    .update(patch as never)
    .eq("id", flagId);
  if (error) throw error;
}

export async function adminApproveFlagForClient(
  flagId: string,
  clientVisibleExplanation: string,
): Promise<void> {
  const bad = findRealityCheckForbiddenPhrase(clientVisibleExplanation);
  if (bad) throw new Error(`Forbidden client-facing phrase: "${bad}".`);
  await adminUpdateRealityCheckFlag(flagId, {
    clientVisibleExplanation,
    clientVisible: true,
    approvedForClient: true,
    status: "client_visible",
  });
}

export async function adminDismissFlag(
  flagId: string,
  reason: string,
): Promise<void> {
  await adminUpdateRealityCheckFlag(flagId, {
    status: "dismissed",
    dismissedReason: reason,
    clientVisible: false,
    approvedForClient: false,
    includeInReport: false,
  });
}

export async function adminResolveFlag(flagId: string): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const reviewer = userData?.user?.id ?? null;
  const { error } = await supabase
    .from("reality_check_flags")
    .update({
      status: "resolved",
      resolved_at: new Date().toISOString(),
      reviewed_by: reviewer,
      reviewed_at: new Date().toISOString(),
    } as never)
    .eq("id", flagId);
  if (error) throw error;
}

/** Client-safe RPC. Never returns admin-only fields. */
export async function getClientRealityCheckFlags(
  customerId: string,
): Promise<ClientRealityCheckFlagRow[]> {
  const { data, error } = await (supabase as never as {
    rpc: (
      n: string,
      a: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: { message: string } | null }>;
  }).rpc("get_client_reality_check_flags", { _customer_id: customerId });
  if (error) throw new Error(error.message);
  return (data ?? []) as ClientRealityCheckFlagRow[];
}

/** Admin-only RPC for the report builder. */
export interface ReportRealityCheckFlagRow {
  id: string;
  title: string;
  client_visible_explanation: string | null;
  affected_gear: string | null;
  severity: RealityCheckFlagSeverity;
  professional_review_recommended: boolean;
  linked_repair_map_item_id: string | null;
}

export async function adminListReportRealityCheckFlags(
  customerId: string,
): Promise<ReportRealityCheckFlagRow[]> {
  const { data, error } = await (supabase as never as {
    rpc: (
      n: string,
      a: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: { message: string } | null }>;
  }).rpc("admin_list_report_reality_check_flags", {
    _customer_id: customerId,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as ReportRealityCheckFlagRow[];
}

/** Pure: render approved flags into the report's Reality Check section body. */
export function renderRealityCheckFlagsForReport(
  flags: ReadonlyArray<ReportRealityCheckFlagRow>,
): string {
  if (!flags.length) {
    return (
      "No Reality Check Flags have been reviewed and approved for this report yet. " +
      "Reality Check Flags will appear here after admin review of contradictions " +
      "between owner answers, hard metrics, and evidence."
    );
  }
  const lines = flags.map((f) => {
    const gear = f.affected_gear ? ` · ${f.affected_gear.replace(/_/g, " ")}` : "";
    const sev = ` [${f.severity}]`;
    const review = f.professional_review_recommended
      ? "\n   Professional review recommended."
      : "";
    const body = f.client_visible_explanation ?? f.title;
    return `• ${f.title}${gear}${sev}\n   ${body}${review}`;
  });
  return lines.join("\n");
}

/** Convenience: build a flag from a deterministic rule. */
export function buildFlagDraftFromRule(
  rule: RealityCheckRule,
  customerId: string,
): AdminCreateRealityCheckFlagInput {
  return {
    customerId,
    title: rule.ownerClaimSummary,
    summary: rule.evidenceGapSummary,
    affectedGear: rule.gear,
    flagType: rule.flagType,
    severity: rule.severity,
    detectedSource: "deterministic_rule",
    ownerClaim: rule.ownerClaimSummary,
    evidenceGap: rule.evidenceGapSummary,
    clientVisibleExplanation: rule.clientSafeExplanation,
    professionalReviewRecommended: rule.professionalReviewRecommended ?? false,
    regulatedIndustrySensitive: rule.regulatedIndustrySensitive ?? false,
    ruleId: rule.id,
  };
}
