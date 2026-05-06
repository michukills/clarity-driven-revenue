/**
 * P87 — Evidence Vault Slot data access (admin + client safe).
 *
 * - Client mutations only set status to "pending_review" upon upload.
 * - Admin reviews enforce: AI HITL gate, slot status allowlist, no
 *   forbidden client-facing phrases, optional source-of-truth conflict
 *   linkage, and propagate to P86 evidence_decay_records on Verified.
 * - Reads use a SECURITY DEFINER RPC that strips admin notes and
 *   storage paths before returning to clients.
 */
import { supabase } from "@/integrations/supabase/client";
import {
  EVIDENCE_VAULT_SLOTS,
  EVIDENCE_SLOT_STATUS_CLIENT_LABEL,
  type EvidenceSlotKey,
  type EvidenceSlotStatus,
  isAdminTransitionAllowed,
  findForbiddenSlotPhrase,
  getSlotDefinition,
  nextStatusOnClientUpload,
  resolveSlotForIndustry,
  type IndustryKey,
} from "@/config/evidenceVaultSlots";
import {
  evaluateHitlGate,
  HITL_CONFIRMATION_TEXT,
  type HitlAiTaskType,
} from "@/config/aiHitlAudit";
import {
  ttlForCategory,
  computeEvidenceDecayState,
} from "@/config/evidenceDecay";

export interface AdminEvidenceSlotRow {
  id: string;
  customer_id: string;
  slot_key: EvidenceSlotKey;
  status: EvidenceSlotStatus;
  customer_upload_id: string | null;
  evidence_record_id: string | null;
  evidence_decay_record_id: string | null;
  client_safe_message: string | null;
  admin_only_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  ai_assistance_used: boolean;
  ai_hitl_audit_id: string | null;
  source_conflict_flag_id: string | null;
  ttl_category: string | null;
  ttl_days: number | null;
  scoring_effect_pending: boolean;
  not_applicable_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientEvidenceSlotRow {
  slot_key: EvidenceSlotKey;
  status: EvidenceSlotStatus;
  status_label: string;
  client_safe_message: string | null;
  updated_at: string | null;
}

/**
 * Mark a slot as pending_review for the customer (called when client
 * uploads a file). RLS prevents writing other admin-only fields.
 */
export async function clientMarkSlotPendingReview(args: {
  customerId: string;
  slotKey: EvidenceSlotKey;
  customerUploadId: string;
}) {
  const { customerId, slotKey, customerUploadId } = args;
  const status = nextStatusOnClientUpload("missing");
  const { data, error } = await (supabase as any)
    .from("evidence_vault_slots")
    .upsert(
      {
        customer_id: customerId,
        slot_key: slotKey,
        status,
        customer_upload_id: customerUploadId,
      },
      { onConflict: "customer_id,slot_key" },
    )
    .select("id")
    .single();
  if (error) throw error;
  return data?.id as string;
}

export async function getClientSlotsForCustomer(
  customerId: string,
): Promise<ClientEvidenceSlotRow[]> {
  const { data, error } = await (supabase as any).rpc(
    "get_client_evidence_vault_slots",
    { _customer_id: customerId },
  );
  if (error) throw error;
  const rows = (data ?? []) as Array<Omit<ClientEvidenceSlotRow, "status_label">>;
  return rows.map((r) => ({
    ...r,
    status_label: EVIDENCE_SLOT_STATUS_CLIENT_LABEL[r.status] ?? r.status,
  }));
}

export async function adminListSlotsForCustomer(
  customerId: string,
): Promise<AdminEvidenceSlotRow[]> {
  const { data, error } = await (supabase as any)
    .from("evidence_vault_slots")
    .select("*")
    .eq("customer_id", customerId)
    .order("slot_key");
  if (error) throw error;
  return (data ?? []) as AdminEvidenceSlotRow[];
}

export interface AdminReviewInput {
  customerId: string;
  slotKey: EvidenceSlotKey;
  targetStatus: EvidenceSlotStatus;
  adminId: string;
  adminOnlyNote?: string | null;
  clientSafeMessage?: string | null;
  notApplicableReason?: string | null;
  scoringEffectPending?: boolean;
  sourceConflictFlagId?: string | null;
  ai?: {
    used: boolean;
    taskType?: HitlAiTaskType;
    rawDocumentCrossChecked?: boolean;
    confirmationText?: string;
  };
}

export interface AdminReviewResult {
  ok: boolean;
  slotRowId?: string;
  blockedReason?: string;
  hitlAuditId?: string | null;
}

/**
 * Deterministic admin review handler.
 * - Blocks if target status not allowed.
 * - Blocks client-safe message containing a forbidden phrase.
 * - If AI was used, requires HITL gate (raw doc cross-checked +
 *   exact confirmation text) before allowing target=verified.
 * - Creates/updates an ai_hitl_audit_log row when AI was used.
 * - Creates/updates an evidence_decay_records row when target=verified.
 */
export async function adminReviewSlot(input: AdminReviewInput): Promise<AdminReviewResult> {
  if (!isAdminTransitionAllowed(input.targetStatus)) {
    return { ok: false, blockedReason: "status_not_allowed" };
  }
  const forbidden = findForbiddenSlotPhrase(input.clientSafeMessage);
  if (forbidden) {
    return { ok: false, blockedReason: `forbidden_phrase:${forbidden}` };
  }
  const slot = getSlotDefinition(input.slotKey);
  if (!slot) return { ok: false, blockedReason: "unknown_slot" };

  let hitlAuditId: string | null = null;
  if (input.ai?.used) {
    const gate = evaluateHitlGate({
      ai_assistance_used: true,
      raw_document_cross_checked: input.ai.rawDocumentCrossChecked ?? false,
      confirmation_text: input.ai.confirmationText ?? "",
    });
    if (input.targetStatus === "verified" && !gate.may_mark_verified) {
      return { ok: false, blockedReason: `hitl_blocked:${gate.reason}` };
    }
    const { data: hitlRow, error: hitlErr } = await (supabase as any)
      .from("ai_hitl_audit_log")
      .insert({
        customer_id: input.customerId,
        ai_task_type: input.ai.taskType ?? "interpret",
        ai_assistance_used: true,
        raw_document_cross_checked: input.ai.rawDocumentCrossChecked ?? false,
        confirmation_text: input.ai.confirmationText ?? null,
        may_mark_verified: gate.may_mark_verified,
        admin_id: input.adminId,
        source_table: "evidence_vault_slots",
      })
      .select("id")
      .single();
    if (hitlErr) return { ok: false, blockedReason: hitlErr.message };
    hitlAuditId = (hitlRow as any)?.id ?? null;
  }

  // Build decay metadata for verified
  let evidenceDecayRecordId: string | null = null;
  if (input.targetStatus === "verified") {
    const ttl = ttlForCategory(slot.verificationCategory);
    const verifiedAt = new Date().toISOString();
    const decay = computeEvidenceDecayState({
      verifiedAt,
      ttlDays: ttl,
      hasEvidence: true,
      reviewState: "approved",
    });
    const { data: decayRow, error: decayErr } = await (supabase as any)
      .from("evidence_decay_records")
      .insert({
        customer_id: input.customerId,
        gear_key: slot.gears[0] ?? "general",
        evidence_category: slot.verificationCategory,
        evidence_label: slot.clientLabel,
        review_state: "approved",
        verified_at: verifiedAt,
        ttl_days: ttl,
        expires_at: decay.expires_at,
        decay_state: decay.state,
        days_until_expiry: decay.days_until_expiry,
        client_visible: true,
        approved_for_client: true,
        client_safe_message: input.clientSafeMessage ?? null,
      })
      .select("id")
      .single();
    if (decayErr) return { ok: false, blockedReason: decayErr.message };
    evidenceDecayRecordId = (decayRow as any)?.id ?? null;
  }

  const patch = {
    customer_id: input.customerId,
    slot_key: input.slotKey,
    status: input.targetStatus,
    admin_only_note: input.adminOnlyNote ?? null,
    client_safe_message: input.clientSafeMessage ?? null,
    not_applicable_reason: input.notApplicableReason ?? null,
    reviewed_by: input.adminId,
    reviewed_at: new Date().toISOString(),
    ai_assistance_used: !!input.ai?.used,
    ai_hitl_audit_id: hitlAuditId,
    source_conflict_flag_id: input.sourceConflictFlagId ?? null,
    ttl_category: input.targetStatus === "verified" ? slot.verificationCategory : null,
    ttl_days: input.targetStatus === "verified" ? slot.defaultTtlDays : null,
    evidence_decay_record_id: evidenceDecayRecordId,
    scoring_effect_pending: input.scoringEffectPending ?? false,
  };
  const { data, error } = await (supabase as any)
    .from("evidence_vault_slots")
    .upsert(patch, { onConflict: "customer_id,slot_key" })
    .select("id")
    .single();
  if (error) return { ok: false, blockedReason: error.message };
  return { ok: true, slotRowId: data?.id, hitlAuditId };
}

/** Pure helper for UI: list slot definitions resolved to industry. */
export function listSlotsForIndustry(industry: IndustryKey | null) {
  return EVIDENCE_VAULT_SLOTS.map((s) => resolveSlotForIndustry(s.key, industry)!);
}

export { HITL_CONFIRMATION_TEXT };
