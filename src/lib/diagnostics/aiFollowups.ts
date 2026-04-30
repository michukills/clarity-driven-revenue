/**
 * P36 — Optional AI-Guided Diagnostic Interviewer (client helpers).
 *
 * Read + answer helpers for the `diagnostic_ai_followups` audit table.
 * Generation is performed via the `diagnostic-ai-followup` edge function.
 *
 * IMPORTANT: This data is NEVER used for deterministic scoring. The
 * deterministic intake (`diagnostic_intake_answers`) remains the sole
 * input to `buildIntakeProgress` and any rubric-based scoring.
 */
import { supabase } from "@/integrations/supabase/client";

export type AiFollowupRow = {
  id: string;
  customer_id: string;
  section_key: string;
  question: string;
  answer: string | null;
  model: string | null;
  rationale: string | null;
  hidden_from_report: boolean;
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_by: string | null;
  answered_by: string | null;
  answered_at: string | null;
  created_at: string;
  updated_at: string;
};

/** Load all AI follow-ups for a single customer. Admin or owning customer. */
export async function loadAiFollowups(customerId: string): Promise<AiFollowupRow[]> {
  const { data, error } = await supabase
    .from("diagnostic_ai_followups")
    .select(
      "id, customer_id, section_key, question, answer, model, rationale, hidden_from_report, admin_notes, reviewed_by, reviewed_at, created_by, answered_by, answered_at, created_at, updated_at",
    )
    .eq("customer_id", customerId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []) as AiFollowupRow[];
}

/** Group follow-ups by section_key for rendering. */
export function groupFollowupsBySection(rows: AiFollowupRow[]): Map<string, AiFollowupRow[]> {
  const m = new Map<string, AiFollowupRow[]>();
  for (const r of rows) {
    const list = m.get(r.section_key) || [];
    list.push(r);
    m.set(r.section_key, list);
  }
  return m;
}

/**
 * Save a client's answer to a single AI follow-up row. The RLS policy
 * + database trigger restrict non-admin updates to the answer field
 * only. We never mutate question/model/rationale here.
 */
export async function saveFollowupAnswer(opts: {
  followupId: string;
  answer: string;
  answeredBy: string | null;
}) {
  const trimmed = opts.answer.trim();
  const { error } = await supabase
    .from("diagnostic_ai_followups")
    .update({
      answer: trimmed || null,
      answered_by: opts.answeredBy,
      answered_at: trimmed ? new Date().toISOString() : null,
    })
    .eq("id", opts.followupId);
  if (error) throw error;
}

/** Generate up to 2 follow-up questions for a saved section answer. */
export async function generateFollowups(opts: {
  customerId: string;
  sectionKey: string;
  sectionLabel: string;
  sectionPrompt: string;
  savedAnswer: string;
}): Promise<AiFollowupRow[]> {
  const { data, error } = await supabase.functions.invoke("diagnostic-ai-followup", {
    body: {
      customer_id: opts.customerId,
      section_key: opts.sectionKey,
      section_label: opts.sectionLabel,
      section_prompt: opts.sectionPrompt,
      saved_answer: opts.savedAnswer,
    },
  });
  if (error) {
    // Surface a concise message; deterministic intake remains usable.
    const message = (error as any)?.message || "AI follow-ups unavailable.";
    throw new Error(message);
  }
  const followups = (data as { followups?: AiFollowupRow[] } | null)?.followups || [];
  return followups;
}

/** Admin-only: toggle whether a follow-up appears in admin reports. */
export async function setFollowupHidden(opts: {
  followupId: string;
  hidden: boolean;
  reviewerId: string | null;
}) {
  const { error } = await supabase
    .from("diagnostic_ai_followups")
    .update({
      hidden_from_report: opts.hidden,
      reviewed_by: opts.reviewerId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", opts.followupId);
  if (error) throw error;
}