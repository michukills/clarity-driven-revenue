/**
 * P88 — Admin Command Center aggregation helpers.
 *
 * Pure helpers + small admin-only data-access wrappers. Honest reminder
 * status labels — never imply an email was sent unless `send_status === "sent"`.
 */
import { supabase } from "@/integrations/supabase/client";
import { EVIDENCE_DECAY_EMAIL_AUTOMATION_WIRED } from "@/config/evidenceDecay";
import type { EmailSendStatus } from "@/lib/emailConsent";

export type ReminderDisplayStatus =
  | "sent"
  | "blocked_missing_consent"
  | "blocked_revoked_consent"
  | "blocked_no_email_backend"
  | "admin_tracked_only"
  | "failed"
  | "not_scheduled";

export const REMINDER_STATUS_LABEL: Record<ReminderDisplayStatus, string> = {
  sent: "Sent",
  blocked_missing_consent: "Blocked — client has not granted email consent",
  blocked_revoked_consent: "Blocked — client revoked email consent",
  blocked_no_email_backend: "Admin-tracked only — automated email not wired",
  admin_tracked_only: "Admin-tracked only — automated email not wired",
  failed: "Failed — admin follow-up required",
  not_scheduled: "Not scheduled",
};

export function reminderStatusLabel(s: string | null | undefined): string {
  if (!s) return REMINDER_STATUS_LABEL.not_scheduled;
  const key = (REMINDER_STATUS_LABEL as Record<string, string>)[s];
  return key ?? REMINDER_STATUS_LABEL.admin_tracked_only;
}

/**
 * Honest "is the email backend wired right now?" check. Currently the
 * project does not wire an email provider, so this is always false.
 * The UI must NOT say "sent" while this is false unless an actual
 * send_status row recorded "sent".
 */
export function isEmailBackendWired(): boolean {
  return EVIDENCE_DECAY_EMAIL_AUTOMATION_WIRED;
}

export interface AdminAttemptRow {
  id: string;
  customer_id: string | null;
  email: string;
  notification_type: string;
  consent_status_at_send: string | null;
  send_status: EmailSendStatus;
  email_backend: string | null;
  failure_reason: string | null;
  created_at: string;
}

export async function adminListRecentEmailAttempts(limit = 25): Promise<AdminAttemptRow[]> {
  const { data } = await (supabase as any)
    .from("email_notification_attempts")
    .select(
      "id, customer_id, email, notification_type, consent_status_at_send, send_status, email_backend, failure_reason, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  return ((data ?? []) as AdminAttemptRow[]) || [];
}

export interface AdminEvidenceQueueRow {
  id: string;
  customer_id: string;
  slot_key: string;
  status: string;
  updated_at: string;
}

/**
 * Admin-only: pending-review + partial + rejected + expiring/expired
 * across all customers. RLS enforces admin-only access — this query
 * MUST NOT be exposed to clients.
 */
export async function adminListEvidenceReviewQueue(limit = 50): Promise<AdminEvidenceQueueRow[]> {
  const { data } = await (supabase as any)
    .from("evidence_vault_slots")
    .select("id, customer_id, slot_key, status, updated_at")
    .in("status", ["pending_review", "partial", "rejected", "expiring_soon", "expired"])
    .order("updated_at", { ascending: false })
    .limit(limit);
  return ((data ?? []) as AdminEvidenceQueueRow[]) || [];
}

export interface AdminTimelineQueueRow {
  id: string;
  customer_id: string;
  stage_key: string;
  status: string;
  scheduled_at: string | null;
  extended_until: string | null;
}

export async function adminListTimelineAttention(limit = 50): Promise<AdminTimelineQueueRow[]> {
  const { data } = await (supabase as any)
    .from("diagnostic_timeline_stages")
    .select("id, customer_id, stage_key, status, scheduled_at, extended_until")
    .in("status", ["overdue", "due_soon", "extended", "snoozed"])
    .order("scheduled_at", { ascending: true, nullsFirst: false })
    .limit(limit);
  return ((data ?? []) as AdminTimelineQueueRow[]) || [];
}