/**
 * P86 Part 7 — AI HITL Verification Audit data access.
 * AI never verifies, scores, certifies, or marks evidence verified alone.
 */
import { supabase } from "@/integrations/supabase/client";
import {
  evaluateHitlGate,
  HITL_CONFIRMATION_TEXT,
  type HitlAiTaskType,
} from "@/config/aiHitlAudit";

export interface AdminHitlAuditRow {
  id: string;
  customer_id: string;
  evidence_id: string | null;
  source_table: string | null;
  source_record_id: string | null;
  ai_task_type: HitlAiTaskType;
  ai_assistance_used: boolean;
  raw_document_cross_checked: boolean;
  confirmation_text: string | null;
  may_mark_verified: boolean;
  admin_id: string;
  created_at: string;
}

export interface CreateHitlAuditInput {
  customer_id: string;
  ai_task_type: HitlAiTaskType;
  ai_assistance_used: boolean;
  raw_document_cross_checked: boolean;
  confirmation_text?: string | null;
  admin_id: string;
  evidence_id?: string | null;
  source_table?: string | null;
  source_record_id?: string | null;
}

export async function adminCreateHitlAudit(input: CreateHitlAuditInput) {
  const gate = evaluateHitlGate({
    ai_assistance_used: input.ai_assistance_used,
    raw_document_cross_checked: input.raw_document_cross_checked,
    confirmation_text: input.confirmation_text ?? "",
  });
  // Only set may_mark_verified=true if gate passes; the DB trigger
  // will also enforce this.
  const row = {
    customer_id: input.customer_id,
    evidence_id: input.evidence_id ?? null,
    source_table: input.source_table ?? null,
    source_record_id: input.source_record_id ?? null,
    ai_task_type: input.ai_task_type,
    ai_assistance_used: input.ai_assistance_used,
    raw_document_cross_checked: input.raw_document_cross_checked,
    confirmation_text: input.confirmation_text ?? null,
    may_mark_verified: gate.may_mark_verified,
    admin_id: input.admin_id,
  };
  const { data, error } = await (supabase as any)
    .from("ai_hitl_audit_log").insert(row).select("*").single();
  if (error) throw error;
  return { row: data as AdminHitlAuditRow, gate };
}

export async function adminListHitlAudits(customerId: string) {
  const { data, error } = await (supabase as any)
    .from("ai_hitl_audit_log").select("*")
    .eq("customer_id", customerId).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as AdminHitlAuditRow[];
}

export { HITL_CONFIRMATION_TEXT };