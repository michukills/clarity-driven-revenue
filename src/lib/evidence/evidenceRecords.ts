/**
 * P67B — Evidence Vault™ service layer.
 *
 * Persists rich metadata for uploaded evidence into `evidence_records`,
 * powering the admin review lifecycle, scorecard/report/repair-map
 * linking, and version/history. Reuses the existing `customer_uploads`
 * row + `client-uploads` storage bucket for file storage; this layer
 * adds the metadata only.
 *
 * Safety: all admin-only fields (admin_only_note, admin_only_regulatory_tag,
 * admin_review_status, include_in_client_report, client_visible_status,
 * evidence_sufficiency_status, reviewed_by/at, is_current_version) are
 * blocked from client mutation by RLS + trigger. Clients query the
 * `evidence_records_client_safe` view which does not expose those
 * columns at all.
 */
import { supabase } from "@/integrations/supabase/client";
import {
  ADMIN_ONLY_REGULATED_TAGS,
  CLIENT_FORBIDDEN_EVIDENCE_PHRASES,
  EVIDENCE_SUFFICIENCY_STATUSES,
  EVIDENCE_USE_CONTEXTS,
  type AdminOnlyRegulatedTag,
  type EvidenceSufficiencyStatus,
  type EvidenceUseContext,
} from "@/config/evidenceVault";

export const EVIDENCE_ADMIN_REVIEW_STATUSES = [
  "pending",
  "in_review",
  "approved",
  "rejected",
  "needs_clarification",
] as const;
export type EvidenceAdminReviewStatus =
  (typeof EVIDENCE_ADMIN_REVIEW_STATUSES)[number];

export const EVIDENCE_CLIENT_VISIBLE_STATUSES = [
  "private",
  "client_visible",
  "client_safe_summary_only",
] as const;
export type EvidenceClientVisibleStatus =
  (typeof EVIDENCE_CLIENT_VISIBLE_STATUSES)[number];

export interface CreateClientEvidenceInput {
  customerId: string;
  customerUploadId?: string | null;
  evidenceTitle?: string | null;
  evidenceDescription?: string | null;
  evidenceType?: string | null;
  evidenceCategory?: string | null;
  relatedGear?: string | null;
  relatedMetric?: string | null;
  relatedToolKey?: string | null;
  evidenceUseContext?: EvidenceUseContext;
  ownerRedactionConfirmed: boolean;
  isRegulatedIndustrySensitive?: boolean;
  containsPossiblePiiPhi?: boolean;
  officialRecordWarningAcknowledged?: boolean;
}

/**
 * Client-side insert. RLS + trigger block any attempt to set admin-only
 * fields. We deliberately omit them here too.
 */
export async function createClientEvidenceRecord(
  input: CreateClientEvidenceInput,
): Promise<{ id: string } | null> {
  if (!input.ownerRedactionConfirmed) {
    throw new Error(
      "owner_redaction_confirmed is required before evidence can be saved.",
    );
  }
  const { data: userData } = await supabase.auth.getUser();
  const uploadedBy = userData?.user?.id ?? null;

  const { data, error } = await supabase
    .from("evidence_records")
    .insert([
      {
        customer_id: input.customerId,
        customer_upload_id: input.customerUploadId ?? null,
        uploaded_by: uploadedBy,
        uploaded_by_role: "client",
        evidence_title: input.evidenceTitle ?? null,
        evidence_description: input.evidenceDescription ?? null,
        evidence_type: input.evidenceType ?? null,
        evidence_category: input.evidenceCategory ?? null,
        related_gear: input.relatedGear ?? null,
        related_metric: input.relatedMetric ?? null,
        related_tool_key: input.relatedToolKey ?? null,
        evidence_use_context: input.evidenceUseContext ?? "diagnostic",
        owner_redaction_confirmed: true,
        is_regulated_industry_sensitive:
          input.isRegulatedIndustrySensitive ?? false,
        contains_possible_pii_phi: input.containsPossiblePiiPhi ?? false,
        official_record_warning_acknowledged:
          input.officialRecordWarningAcknowledged ?? false,
        // explicit safe defaults — RLS would also enforce these:
        admin_review_status: "pending",
        client_visible_status: "private",
        client_self_certification_blocked: true,
        include_in_client_report: false,
      } as never,
    ])
    .select("id")
    .maybeSingle();

  if (error) throw error;
  return data ? { id: (data as { id: string }).id } : null;
}

export interface AdminEvidenceUpdateInput {
  evidenceTitle?: string | null;
  evidenceDescription?: string | null;
  evidenceType?: string | null;
  evidenceCategory?: string | null;
  relatedGear?: string | null;
  relatedMetric?: string | null;
  relatedScorecardRunId?: string | null;
  relatedScorecardItemKey?: string | null;
  relatedReportDraftId?: string | null;
  relatedReportFindingKey?: string | null;
  relatedRepairMapItemId?: string | null;
  relatedToolKey?: string | null;
  evidenceUseContext?: EvidenceUseContext;
  evidenceSufficiencyStatus?: EvidenceSufficiencyStatus;
  adminReviewStatus?: EvidenceAdminReviewStatus;
  clientVisibleStatus?: EvidenceClientVisibleStatus;
  adminOnlyNote?: string | null;
  clientVisibleNote?: string | null;
  adminOnlyRegulatoryTag?: AdminOnlyRegulatedTag | null;
  isRegulatedIndustrySensitive?: boolean;
  containsPossiblePiiPhi?: boolean;
  officialRecordWarningAcknowledged?: boolean;
  includeInClientReport?: boolean;
  reviewedBy?: string | null;
}

/**
 * Admin-only update. RLS restricts to admins. We additionally validate
 * that no client-forbidden phrase is being inserted into client-visible
 * fields.
 */
export async function adminUpdateEvidenceRecord(
  evidenceId: string,
  input: AdminEvidenceUpdateInput,
): Promise<void> {
  // Defensive: reject forbidden client-facing phrases on client-visible note.
  const noteForClient = (input.clientVisibleNote ?? "").toLowerCase();
  for (const phrase of CLIENT_FORBIDDEN_EVIDENCE_PHRASES) {
    if (noteForClient.includes(phrase)) {
      throw new Error(
        `Forbidden client-facing phrase in note: "${phrase}".`,
      );
    }
  }
  if (
    input.evidenceSufficiencyStatus &&
    !EVIDENCE_SUFFICIENCY_STATUSES.includes(input.evidenceSufficiencyStatus)
  ) {
    throw new Error("Invalid sufficiency status.");
  }
  if (
    input.adminOnlyRegulatoryTag &&
    !ADMIN_ONLY_REGULATED_TAGS.includes(input.adminOnlyRegulatoryTag)
  ) {
    throw new Error("Invalid regulated tag.");
  }
  if (
    input.evidenceUseContext &&
    !EVIDENCE_USE_CONTEXTS.includes(input.evidenceUseContext)
  ) {
    throw new Error("Invalid use context.");
  }

  const patch: Record<string, unknown> = {
    evidence_title: input.evidenceTitle,
    evidence_description: input.evidenceDescription,
    evidence_type: input.evidenceType,
    evidence_category: input.evidenceCategory,
    related_gear: input.relatedGear,
    related_metric: input.relatedMetric,
    related_scorecard_run_id: input.relatedScorecardRunId,
    related_scorecard_item_key: input.relatedScorecardItemKey,
    related_report_draft_id: input.relatedReportDraftId,
    related_report_finding_key: input.relatedReportFindingKey,
    related_repair_map_item_id: input.relatedRepairMapItemId,
    related_tool_key: input.relatedToolKey,
    evidence_use_context: input.evidenceUseContext,
    evidence_sufficiency_status: input.evidenceSufficiencyStatus,
    admin_review_status: input.adminReviewStatus,
    client_visible_status: input.clientVisibleStatus,
    admin_only_note: input.adminOnlyNote,
    client_visible_note: input.clientVisibleNote,
    admin_only_regulatory_tag: input.adminOnlyRegulatoryTag,
    is_regulated_industry_sensitive: input.isRegulatedIndustrySensitive,
    contains_possible_pii_phi: input.containsPossiblePiiPhi,
    official_record_warning_acknowledged:
      input.officialRecordWarningAcknowledged,
    include_in_client_report: input.includeInClientReport,
    reviewed_by: input.reviewedBy,
    reviewed_at: input.adminReviewStatus ? new Date().toISOString() : undefined,
  };
  // Strip undefineds so we don't blank columns the admin didn't touch.
  Object.keys(patch).forEach((k) => {
    if (patch[k] === undefined) delete patch[k];
  });

  const { error } = await supabase
    .from("evidence_records")
    .update(patch as never)
    .eq("id", evidenceId);
  if (error) throw error;
}

/**
 * Admin-only: mark a record as superseded by a new version.
 */
export async function adminSupersedeEvidence(
  oldEvidenceId: string,
  newEvidenceId: string,
): Promise<void> {
  const { data: oldRow, error: oldErr } = await supabase
    .from("evidence_records")
    .select("version_group_id, version_number")
    .eq("id", oldEvidenceId)
    .maybeSingle();
  if (oldErr) throw oldErr;
  if (!oldRow) throw new Error("Original evidence not found.");

  const oldTyped = oldRow as { version_group_id: string; version_number: number };

  const { error: e1 } = await supabase
    .from("evidence_records")
    .update({ is_current_version: false } as never)
    .eq("id", oldEvidenceId);
  if (e1) throw e1;

  const { error: e2 } = await supabase
    .from("evidence_records")
    .update({
      version_group_id: oldTyped.version_group_id,
      version_number: oldTyped.version_number + 1,
      supersedes_evidence_id: oldEvidenceId,
      is_current_version: true,
    } as never)
    .eq("id", newEvidenceId);
  if (e2) throw e2;
}

/**
 * Build a client-safe report citation for an approved evidence record.
 * Never exposes file path, signed URL, admin note, or regulated tag.
 */
export interface SafeEvidenceCitation {
  evidenceId: string;
  title: string;
  reviewedAt: string | null;
  relatedGear: string | null;
  status: string;
  clientSafeNote: string | null;
}

export function buildSafeEvidenceCitation(row: {
  id: string;
  evidence_title: string | null;
  reviewed_at: string | null;
  related_gear: string | null;
  evidence_sufficiency_status: string;
  client_visible_note: string | null;
  include_in_client_report: boolean;
  client_visible_status: string;
}): SafeEvidenceCitation | null {
  if (!row.include_in_client_report) return null;
  if (row.client_visible_status === "private") return null;
  return {
    evidenceId: row.id,
    title: row.evidence_title ?? "Evidence record",
    reviewedAt: row.reviewed_at,
    relatedGear: row.related_gear,
    status: row.evidence_sufficiency_status,
    clientSafeNote: row.client_visible_note,
  };
}

/* ------------------------------------------------------------------ */
/* P68B — Repair Map evidence attachment + retrieval                  */
/* ------------------------------------------------------------------ */

/**
 * Admin-only: attach an evidence record to a Repair Map item.
 * Reuses `evidence_records.related_repair_map_item_id`. RLS on
 * `evidence_records` already restricts updates to admins for this column.
 */
export async function adminAttachEvidenceToRepairMapItem(
  evidenceId: string,
  repairMapItemId: string,
): Promise<void> {
  if (!evidenceId || !repairMapItemId) {
    throw new Error("evidenceId and repairMapItemId are required.");
  }
  const { error } = await supabase
    .from("evidence_records")
    .update({ related_repair_map_item_id: repairMapItemId } as never)
    .eq("id", evidenceId);
  if (error) throw error;
}

/** Admin-only: detach an evidence record from any Repair Map item. */
export async function adminDetachEvidenceFromRepairMapItem(
  evidenceId: string,
): Promise<void> {
  const { error } = await supabase
    .from("evidence_records")
    .update({ related_repair_map_item_id: null } as never)
    .eq("id", evidenceId);
  if (error) throw error;
}

export interface AdminRepairMapEvidenceRow {
  id: string;
  evidence_title: string | null;
  related_gear: string | null;
  related_metric: string | null;
  evidence_sufficiency_status: EvidenceSufficiencyStatus;
  admin_review_status: EvidenceAdminReviewStatus;
  client_visible_status: EvidenceClientVisibleStatus;
  include_in_client_report: boolean;
  is_regulated_industry_sensitive: boolean;
  contains_possible_pii_phi: boolean;
  admin_only_regulatory_tag: string | null;
  related_repair_map_item_id: string | null;
  is_current_version: boolean;
  created_at: string;
  updated_at: string;
}

/** Admin-only: load all evidence for a customer for the Repair Map picker. */
export async function adminListCustomerEvidenceForRepairPicker(
  customerId: string,
): Promise<AdminRepairMapEvidenceRow[]> {
  const { data, error } = await (supabase as never as {
    rpc: (
      n: string,
      a: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: { message: string } | null }>;
  }).rpc("admin_list_customer_evidence_for_repair_picker", {
    _customer_id: customerId,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as AdminRepairMapEvidenceRow[];
}

export interface ClientRepairMapEvidenceRow {
  evidence_id: string;
  repair_map_item_id: string;
  evidence_title: string | null;
  related_gear: string | null;
  evidence_sufficiency_status: string;
  client_visible_note: string | null;
  reviewed_at: string | null;
}

/**
 * Returns ONLY approved + client-visible evidence references attached to
 * Repair Map items for this customer. Safe to render in client-facing
 * Repair Map views and PDFs. The RPC is SECURITY DEFINER and enforces
 * admin-or-owner; clients only ever see their own data.
 */
export async function getClientRepairMapEvidence(
  customerId: string,
): Promise<ClientRepairMapEvidenceRow[]> {
  const { data, error } = await (supabase as never as {
    rpc: (
      n: string,
      a: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: { message: string } | null }>;
  }).rpc("get_client_repair_map_evidence", { _customer_id: customerId });
  if (error) throw new Error(error.message);
  return (data ?? []) as ClientRepairMapEvidenceRow[];
}

/** True if the evidence row would be a safety risk to attach to a client-visible Repair Map item. */
export function isUnsafeForClientVisibleRepairMap(
  row: Pick<
    AdminRepairMapEvidenceRow,
    | "client_visible_status"
    | "include_in_client_report"
    | "admin_review_status"
    | "admin_only_regulatory_tag"
    | "contains_possible_pii_phi"
  >,
): boolean {
  if (row.client_visible_status === "private") return true;
  if (!row.include_in_client_report) return true;
  if (row.admin_review_status !== "approved") return true;
  if (row.admin_only_regulatory_tag) return true;
  if (row.contains_possible_pii_phi) return true;
  return false;
}