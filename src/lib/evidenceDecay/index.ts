/**
 * P86 — Evidence Decay & Pulse data access.
 *
 * Deterministic. No AI. No automated email claims. Reminders are
 * admin-tracked unless EVIDENCE_DECAY_EMAIL_AUTOMATION_WIRED is true
 * AND consent allows it (see emailConsent lib).
 */
import { supabase } from "@/integrations/supabase/client";
import {
  computeEvidenceDecayState,
  ttlForCategory,
  type EvidenceDecayCategory,
  type EvidenceDecayState,
  EVIDENCE_DECAY_EMAIL_AUTOMATION_WIRED,
} from "@/config/evidenceDecay";
import { attemptNotificationEmail } from "@/lib/emailConsent";

export interface AdminEvidenceDecayRow {
  id: string;
  customer_id: string;
  evidence_id: string | null;
  source_table: string | null;
  source_record_id: string | null;
  gear_key: string;
  evidence_category: EvidenceDecayCategory;
  evidence_label: string;
  review_state:
    | "missing" | "pending_review" | "partial" | "approved" | "rejected" | "not_applicable";
  verified_at: string | null;
  ttl_days: number | null;
  expires_at: string | null;
  decay_state: EvidenceDecayState;
  days_until_expiry: number | null;
  client_visible: boolean;
  approved_for_client: boolean;
  admin_notes: string | null;
  client_safe_message: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientEvidenceDecayRow {
  id: string;
  gear_key: string;
  evidence_category: string;
  evidence_label: string;
  review_state: string;
  decay_state: EvidenceDecayState;
  expires_at: string | null;
  days_until_expiry: number | null;
  client_safe_message: string | null;
  updated_at: string;
}

export interface UpsertDecayInput {
  id?: string;
  customer_id: string;
  gear_key: string;
  evidence_category: EvidenceDecayCategory;
  evidence_label: string;
  review_state: AdminEvidenceDecayRow["review_state"];
  verified_at?: string | null;
  evidence_id?: string | null;
  source_table?: string | null;
  source_record_id?: string | null;
  admin_notes?: string | null;
  client_safe_message?: string | null;
  approved_for_client?: boolean;
  client_visible?: boolean;
}

export async function adminCreateOrUpdateEvidenceDecayRecord(input: UpsertDecayInput) {
  const ttl = ttlForCategory(input.evidence_category);
  const decay = computeEvidenceDecayState({
    verifiedAt: input.verified_at ?? null,
    ttlDays: ttl,
    hasEvidence:
      input.review_state === "approved" || input.review_state === "partial",
    reviewState:
      input.review_state === "missing" ? null : input.review_state,
  });
  const row = {
    customer_id: input.customer_id,
    gear_key: input.gear_key,
    evidence_category: input.evidence_category,
    evidence_label: input.evidence_label,
    review_state: input.review_state,
    verified_at: input.verified_at ?? null,
    ttl_days: ttl,
    expires_at: decay.expires_at,
    decay_state: decay.state,
    days_until_expiry: decay.days_until_expiry,
    evidence_id: input.evidence_id ?? null,
    source_table: input.source_table ?? null,
    source_record_id: input.source_record_id ?? null,
    admin_notes: input.admin_notes ?? null,
    client_safe_message: input.client_safe_message ?? null,
    approved_for_client: input.approved_for_client ?? false,
    client_visible: input.client_visible ?? false,
  };
  if (input.id) {
    const { data, error } = await (supabase as any)
      .from("evidence_decay_records")
      .update(row)
      .eq("id", input.id)
      .select("*")
      .single();
    if (error) throw error;
    return data as AdminEvidenceDecayRow;
  }
  const { data, error } = await (supabase as any)
    .from("evidence_decay_records")
    .insert(row)
    .select("*")
    .single();
  if (error) throw error;
  return data as AdminEvidenceDecayRow;
}

export async function adminListEvidenceDecayRecords(customerId: string) {
  const { data, error } = await (supabase as any)
    .from("evidence_decay_records")
    .select("*")
    .eq("customer_id", customerId)
    .order("expires_at", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as AdminEvidenceDecayRow[];
}

export async function getClientEvidenceDecayRecords(customerId: string) {
  const { data, error } = await (supabase as any).rpc(
    "get_client_evidence_decay",
    { _customer_id: customerId },
  );
  if (error) throw error;
  return (data ?? []) as ClientEvidenceDecayRow[];
}

export async function adminApproveDecayForClient(id: string, clientSafeMessage?: string) {
  const update: Record<string, unknown> = {
    approved_for_client: true,
    client_visible: true,
  };
  if (clientSafeMessage && clientSafeMessage.trim()) {
    update.client_safe_message = clientSafeMessage;
  }
  const { error } = await (supabase as any)
    .from("evidence_decay_records")
    .update(update)
    .eq("id", id);
  if (error) throw error;
}

/**
 * Recompute decay_state/days_until_expiry for all rows of a customer.
 * Pure-DB write of derived columns; no email side effects.
 */
export async function adminRefreshDecayStates(customerId?: string) {
  let q = (supabase as any).from("evidence_decay_records").select("*");
  if (customerId) q = q.eq("customer_id", customerId);
  const { data, error } = await q;
  if (error) throw error;
  const rows = (data ?? []) as AdminEvidenceDecayRow[];
  for (const r of rows) {
    const decay = computeEvidenceDecayState({
      verifiedAt: r.verified_at,
      ttlDays: r.ttl_days,
      hasEvidence: r.review_state === "approved" || r.review_state === "partial",
      reviewState:
        r.review_state === "missing" ? null : (r.review_state as any),
    });
    if (
      decay.state !== r.decay_state ||
      decay.expires_at !== r.expires_at ||
      decay.days_until_expiry !== r.days_until_expiry
    ) {
      await (supabase as any)
        .from("evidence_decay_records")
        .update({
          decay_state: decay.state,
          expires_at: decay.expires_at,
          days_until_expiry: decay.days_until_expiry,
        })
        .eq("id", r.id);
    }
  }
  return rows.length;
}

export interface CreateExpirationReminderInput {
  customer_id: string;
  evidence_decay_record_id?: string | null;
  reminder_type: "expiring_soon" | "expired" | "refresh_requested";
  due_at?: string | null;
  recipient_email?: string | null;
  recipient_user_id?: string | null;
  admin_notes?: string | null;
  client_safe_message?: string | null;
  client_visible?: boolean;
}

export async function adminCreateExpirationReminder(input: CreateExpirationReminderInput) {
  // Decide email status honestly via consent gate
  let email_status: "sent" | "blocked_missing_consent" | "blocked_revoked_consent" | "blocked_no_email_backend" | "admin_tracked_only" | "failed" = "admin_tracked_only";
  let email_consent_checked = false;
  let email_consent_status: string | null = null;
  let email_attempt_id: string | null = null;

  if (input.recipient_email || input.recipient_user_id) {
    email_consent_checked = true;
    const { decision, attempt } = await attemptNotificationEmail({
      customerId: input.customer_id,
      userId: input.recipient_user_id ?? null,
      email: input.recipient_email ?? null,
      notificationType: "evidence_expiration_reminder",
      related_record_type: "evidence_decay_record",
      related_record_id: input.evidence_decay_record_id ?? null,
    });
    email_consent_status = decision.consent?.consent_status ?? "missing";
    email_attempt_id = (attempt as any)?.id ?? null;
    if (decision.allowed && EVIDENCE_DECAY_EMAIL_AUTOMATION_WIRED) {
      // No real backend wired. Stay honest.
      email_status = "admin_tracked_only";
    } else if (!decision.allowed) {
      email_status = decision.reason as typeof email_status;
    } else {
      email_status = "admin_tracked_only";
    }
  }

  const row = {
    customer_id: input.customer_id,
    evidence_decay_record_id: input.evidence_decay_record_id ?? null,
    reminder_type: input.reminder_type,
    due_at: input.due_at ?? null,
    status: "open",
    email_consent_checked,
    email_consent_status,
    email_attempt_id,
    email_status,
    admin_notes: input.admin_notes ?? null,
    client_safe_message: input.client_safe_message ?? null,
    client_visible: input.client_visible ?? false,
  };
  const { data, error } = await (supabase as any)
    .from("evidence_expiration_reminders")
    .insert(row)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function adminListEvidenceExpirationReminders(customerId?: string) {
  let q = (supabase as any).from("evidence_expiration_reminders").select("*").order("created_at", { ascending: false });
  if (customerId) q = q.eq("customer_id", customerId);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function adminCompleteExpirationReminder(id: string) {
  const { error } = await (supabase as any)
    .from("evidence_expiration_reminders")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export const EVIDENCE_DECAY_EMAIL_STATUS_LABEL: Record<string, string> = {
  sent: "Email sent",
  blocked_missing_consent: "Email not sent — consent missing",
  blocked_revoked_consent: "Email not sent — consent revoked / unsubscribed",
  blocked_no_email_backend: "Email not sent — automated email is not wired",
  admin_tracked_only: "Admin-tracked reminder only — automated email is not wired",
  failed: "Email send failed",
};