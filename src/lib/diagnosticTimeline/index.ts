/**
 * P87 — Diagnostic Timeline data access (admin + client).
 * Reminders honor the P86 email consent gate.
 */
import { supabase } from "@/integrations/supabase/client";
import {
  DIAGNOSTIC_STAGE_KEYS,
  STAGE_NOTIFICATION_TYPE,
  STAGE_HAS_CLIENT_REMINDER,
  type DiagnosticStageKey,
  type DiagnosticStageStatus,
  validateExtendVaultClose,
} from "@/config/diagnosticTimeline";
import { attemptNotificationEmail, type EmailSendStatus } from "@/lib/emailConsent";

export interface AdminTimelineStageRow {
  id: string;
  customer_id: string;
  stage_key: DiagnosticStageKey;
  status: DiagnosticStageStatus;
  scheduled_at: string | null;
  completed_at: string | null;
  snoozed_until: string | null;
  extended_until: string | null;
  extension_reason: string | null;
  admin_only_note: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientTimelineStageRow {
  stage_key: DiagnosticStageKey;
  status: DiagnosticStageStatus;
  scheduled_at: string | null;
  completed_at: string | null;
  extended_until: string | null;
}

export async function adminListTimelineStages(customerId: string): Promise<AdminTimelineStageRow[]> {
  const { data, error } = await (supabase as any)
    .from("diagnostic_timeline_stages")
    .select("*")
    .eq("customer_id", customerId);
  if (error) throw error;
  return (data ?? []) as AdminTimelineStageRow[];
}

export async function getClientTimelineStages(customerId: string): Promise<ClientTimelineStageRow[]> {
  const { data, error } = await (supabase as any).rpc("get_client_diagnostic_timeline", {
    _customer_id: customerId,
  });
  if (error) throw error;
  return (data ?? []) as ClientTimelineStageRow[];
}

export interface UpsertStageInput {
  customerId: string;
  stageKey: DiagnosticStageKey;
  status: DiagnosticStageStatus;
  scheduledAt?: string | null;
  completedAt?: string | null;
  snoozedUntil?: string | null;
  extendedUntil?: string | null;
  extensionReason?: string | null;
  adminOnlyNote?: string | null;
  adminId?: string | null;
}

export async function adminUpsertTimelineStage(input: UpsertStageInput) {
  if (input.stageKey === "evidence_window_closes" && input.extendedUntil) {
    const v = validateExtendVaultClose({
      newCloseAt: input.extendedUntil,
      adminReason: input.extensionReason ?? "",
    });
    if (!v.ok) return { ok: false, reason: v.reason };
  }
  const { data, error } = await (supabase as any)
    .from("diagnostic_timeline_stages")
    .upsert(
      {
        customer_id: input.customerId,
        stage_key: input.stageKey,
        status: input.status,
        scheduled_at: input.scheduledAt ?? null,
        completed_at: input.completedAt ?? null,
        snoozed_until: input.snoozedUntil ?? null,
        extended_until: input.extendedUntil ?? null,
        extension_reason: input.extensionReason ?? null,
        admin_only_note: input.adminOnlyNote ?? null,
        reviewed_by: input.adminId ?? null,
      },
      { onConflict: "customer_id,stage_key" },
    )
    .select("id")
    .single();
  if (error) return { ok: false, reason: error.message };
  return { ok: true, id: data?.id };
}

export interface TimelineReminderInput {
  customerId: string;
  stageKey: DiagnosticStageKey;
  recipientEmail: string;
  userId?: string | null;
}

/**
 * Attempt a Day-4 / Day-6 (or other) timeline reminder. Always routed
 * through the P86 consent gate; if email backend is not wired, the
 * outcome is `blocked_no_email_backend` and the UI must say
 * admin-tracked only — never "sent".
 */
export async function adminCreateTimelineReminderAttempt(
  input: TimelineReminderInput,
): Promise<{ status: EmailSendStatus; admin_tracked_only: boolean }> {
  if (!STAGE_HAS_CLIENT_REMINDER[input.stageKey]) {
    return { status: "admin_tracked_only", admin_tracked_only: true };
  }
  const notificationType = STAGE_NOTIFICATION_TYPE[input.stageKey];
  const result = await attemptNotificationEmail({
    customerId: input.customerId,
    userId: input.userId ?? null,
    email: input.recipientEmail,
    notificationType,
    related_record_type: "diagnostic_timeline_stages",
    related_record_id: null,
  });
  const status = result.attempt?.send_status as EmailSendStatus;
  return {
    status,
    admin_tracked_only: status !== "sent",
  };
}

export const ALL_STAGE_KEYS = DIAGNOSTIC_STAGE_KEYS;