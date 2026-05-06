// P83C — Admin Interview Mode + Admin Assist helpers.
// All operations use the standard Supabase client; RLS + the
// `diagnostic_intake_answers_guard` trigger enforce admin-only writes for
// admin attribution fields. There are no service-role keys in the frontend.
import { supabase } from "@/integrations/supabase/client";

export type InterviewMode = "interview" | "assist";
export type InterviewStatus = "active" | "paused" | "completed" | "cancelled";

export type SourceType =
  | "client_written"
  | "client_verbal"
  | "interview"
  | "uploaded_evidence"
  | "admin_observation"
  | "imported_data"
  | "ai_assisted_draft";

export type EvidenceStatus =
  | "verified"
  | "partial"
  | "owner_claimed"
  | "missing"
  | "needs_followup";

export type ClientConfirmationStatus =
  | "not_required"
  | "needs_client_confirmation"
  | "confirmed_by_client"
  | "disputed_by_client";

export interface InterviewSessionRow {
  id: string;
  customer_id: string;
  started_by: string;
  mode: InterviewMode;
  status: InterviewStatus;
  notes: string | null;
  started_at: string;
  ended_at: string | null;
}

export interface AdminAssistNoteRow {
  id: string;
  customer_id: string;
  section_key: string | null;
  interview_session_id: string | null;
  admin_user_id: string;
  note: string;
  created_at: string;
}

/** Returns the most recent active session for a customer, if any. */
export async function getActiveSession(customerId: string): Promise<InterviewSessionRow | null> {
  const { data, error } = await supabase
    .from("interview_sessions")
    .select("*")
    .eq("customer_id", customerId)
    .in("status", ["active", "paused"])
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as InterviewSessionRow | null) ?? null;
}

export async function startSession(opts: {
  customerId: string;
  startedBy: string;
  mode: InterviewMode;
  notes?: string;
}): Promise<InterviewSessionRow> {
  const { data, error } = await supabase
    .from("interview_sessions")
    .insert([{ customer_id: opts.customerId, started_by: opts.startedBy, mode: opts.mode, notes: opts.notes ?? null }])
    .select("*")
    .single();
  if (error) throw error;
  await logAuditEvent({
    customerId: opts.customerId,
    sessionId: (data as any).id,
    actorId: opts.startedBy,
    eventType: "interview_session_started",
    detail: { mode: opts.mode },
  });
  return data as InterviewSessionRow;
}

export async function endSession(opts: {
  sessionId: string;
  customerId: string;
  status: "completed" | "paused" | "cancelled";
  actorId: string;
}) {
  const { error } = await supabase
    .from("interview_sessions")
    .update({
      status: opts.status,
      ended_at: opts.status === "completed" || opts.status === "cancelled" ? new Date().toISOString() : null,
    })
    .eq("id", opts.sessionId);
  if (error) throw error;
  await logAuditEvent({
    customerId: opts.customerId,
    sessionId: opts.sessionId,
    actorId: opts.actorId,
    eventType: `interview_session_${opts.status}`,
  });
}

/** Admin upserts an answer on behalf of a client with full attribution. */
export async function adminSaveAnswer(opts: {
  customerId: string;
  sectionKey: string;
  answer: string;
  adminUserId: string;
  sessionId: string | null;
  sourceType: SourceType;
  evidenceStatus: EvidenceStatus;
  clientConfirmationStatus?: ClientConfirmationStatus;
  clientVisible?: boolean;
  adminClarificationNote?: string | null;
}) {
  const trimmed = opts.answer.trim();
  const payload = {
    answer: trimmed || null,
    submitted_by: opts.adminUserId,
    entered_by: "admin" as const,
    admin_user_id: opts.adminUserId,
    source_type: opts.sourceType,
    evidence_status: opts.evidenceStatus,
    client_confirmation_status:
      opts.clientConfirmationStatus ??
      (opts.evidenceStatus === "owner_claimed" ? "needs_client_confirmation" : "not_required"),
    client_visible: opts.clientVisible ?? true,
    admin_clarification_note: opts.adminClarificationNote ?? null,
    interview_session_id: opts.sessionId,
  };

  const { data: existing } = await supabase
    .from("diagnostic_intake_answers")
    .select("id")
    .eq("customer_id", opts.customerId)
    .eq("section_key", opts.sectionKey)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase
      .from("diagnostic_intake_answers")
      .update(payload)
      .eq("id", existing.id);
    if (error) throw error;
    await logAuditEvent({
      customerId: opts.customerId,
      sessionId: opts.sessionId,
      actorId: opts.adminUserId,
      eventType: "admin_assisted_answer_edited",
      sectionKey: opts.sectionKey,
      detail: { source_type: opts.sourceType, evidence_status: opts.evidenceStatus },
    });
    return;
  }

  const { error } = await supabase
    .from("diagnostic_intake_answers")
    .insert([{ customer_id: opts.customerId, section_key: opts.sectionKey, ...payload }]);
  if (error) throw error;
  await logAuditEvent({
    customerId: opts.customerId,
    sessionId: opts.sessionId,
    actorId: opts.adminUserId,
    eventType: "admin_assisted_answer_created",
    sectionKey: opts.sectionKey,
    detail: { source_type: opts.sourceType, evidence_status: opts.evidenceStatus },
  });
}

/** Client confirms or disputes an admin-entered answer (or adds clarification). */
export async function clientReviewAnswer(opts: {
  customerId: string;
  sectionKey: string;
  status: "confirmed_by_client" | "disputed_by_client";
  clarificationNote?: string;
}) {
  const { error } = await supabase
    .from("diagnostic_intake_answers")
    .update({
      client_confirmation_status: opts.status,
      client_clarification_note: opts.clarificationNote ?? null,
    })
    .eq("customer_id", opts.customerId)
    .eq("section_key", opts.sectionKey);
  if (error) throw error;
  await supabase.from("interview_audit_log").insert([
    {
      customer_id: opts.customerId,
      actor_role: "client",
      event_type:
        opts.status === "confirmed_by_client" ? "client_confirmed_answer" : "client_disputed_answer",
      section_key: opts.sectionKey,
      detail: opts.clarificationNote ? { clarification_note: opts.clarificationNote } : null,
    },
  ]);
}

export async function addAdminNote(opts: {
  customerId: string;
  adminUserId: string;
  note: string;
  sectionKey?: string | null;
  sessionId?: string | null;
}) {
  const { error } = await supabase.from("admin_assist_notes").insert([
    {
      customer_id: opts.customerId,
      admin_user_id: opts.adminUserId,
      note: opts.note,
      section_key: opts.sectionKey ?? null,
      interview_session_id: opts.sessionId ?? null,
    },
  ]);
  if (error) throw error;
}

export async function loadAdminNotes(customerId: string): Promise<AdminAssistNoteRow[]> {
  const { data, error } = await supabase
    .from("admin_assist_notes")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as AdminAssistNoteRow[];
}

export async function logAuditEvent(opts: {
  customerId: string;
  sessionId?: string | null;
  actorId: string;
  eventType: string;
  sectionKey?: string;
  detail?: Record<string, unknown> | null;
}) {
  await supabase.from("interview_audit_log").insert([
    {
      customer_id: opts.customerId,
      interview_session_id: opts.sessionId ?? null,
      actor_id: opts.actorId,
      actor_role: "admin",
      event_type: opts.eventType,
      section_key: opts.sectionKey ?? null,
      detail: opts.detail ?? null,
    },
  ]);
}

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  client_written: "Client written",
  client_verbal: "Client verbal",
  interview: "Live interview",
  uploaded_evidence: "Uploaded evidence",
  admin_observation: "Admin observation",
  imported_data: "Imported data",
  ai_assisted_draft: "AI-assisted draft",
};

export const EVIDENCE_STATUS_LABELS: Record<EvidenceStatus, string> = {
  verified: "Verified",
  partial: "Partial evidence",
  owner_claimed: "Owner-claimed",
  missing: "Missing",
  needs_followup: "Needs follow-up",
};

export const CLIENT_CONFIRMATION_LABELS: Record<ClientConfirmationStatus, string> = {
  not_required: "Confirmation not required",
  needs_client_confirmation: "Needs client confirmation",
  confirmed_by_client: "Confirmed by client",
  disputed_by_client: "Disputed by client",
};
