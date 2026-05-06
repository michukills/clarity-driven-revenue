/**
 * P86 Part 6 — External Risk Diagnostic Triggers data access.
 * Manual admin entry only. No live monitoring.
 */
import { supabase } from "@/integrations/supabase/client";
import {
  evaluateExternalRiskTrigger,
  type ExternalRiskTriggerType,
  type ExternalRiskSeverity,
} from "@/config/externalRiskTriggers";

export interface AdminExternalRiskRow {
  id: string;
  customer_id: string;
  trigger_type: ExternalRiskTriggerType;
  affected_gear: string;
  source_note: string;
  source_url: string | null;
  severity: ExternalRiskSeverity;
  marks_needs_reinspection: boolean;
  status: "open" | "reviewed" | "dismissed" | "resolved";
  client_safe_summary: string | null;
  client_visible: boolean;
  approved_for_client: boolean;
  admin_notes: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface ClientExternalRiskRow {
  id: string;
  trigger_type: ExternalRiskTriggerType;
  affected_gear: string;
  severity: ExternalRiskSeverity;
  client_safe_summary: string | null;
  status: AdminExternalRiskRow["status"];
  created_at: string;
}

export interface CreateExternalRiskInput {
  customer_id: string;
  trigger_type: ExternalRiskTriggerType;
  affected_gear: string;
  source_note: string;
  source_url?: string | null;
  severity: ExternalRiskSeverity;
  admin_notes?: string | null;
  client_safe_summary?: string | null;
}

export async function adminCreateExternalRiskTrigger(input: CreateExternalRiskInput) {
  const v = evaluateExternalRiskTrigger({
    triggerType: input.trigger_type,
    sourceNote: input.source_note,
    affectedGear: input.affected_gear,
  });
  if (!v.valid) throw new Error(`External risk validation failed: ${v.reason}`);
  const row = {
    customer_id: input.customer_id,
    trigger_type: input.trigger_type,
    affected_gear: input.affected_gear,
    source_note: input.source_note,
    source_url: input.source_url ?? null,
    severity: input.severity,
    marks_needs_reinspection: v.marks_needs_reinspection,
    status: "open" as const,
    admin_notes: input.admin_notes ?? null,
    client_safe_summary: input.client_safe_summary ?? null,
    client_visible: false,
    approved_for_client: false,
  };
  const { data, error } = await (supabase as any)
    .from("external_risk_triggers").insert(row).select("*").single();
  if (error) throw error;
  return data as AdminExternalRiskRow;
}

export async function adminListExternalRiskTriggers(customerId: string) {
  const { data, error } = await (supabase as any)
    .from("external_risk_triggers").select("*")
    .eq("customer_id", customerId).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as AdminExternalRiskRow[];
}

export async function adminResolveExternalRisk(id: string) {
  const { error } = await (supabase as any).from("external_risk_triggers")
    .update({ status: "resolved", resolved_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

export async function adminDismissExternalRisk(id: string) {
  const { error } = await (supabase as any).from("external_risk_triggers")
    .update({ status: "dismissed" }).eq("id", id);
  if (error) throw error;
}

export async function adminApproveExternalRiskForClient(id: string, clientSafe?: string) {
  const update: Record<string, unknown> = { approved_for_client: true, client_visible: true };
  if (clientSafe && clientSafe.trim()) update.client_safe_summary = clientSafe;
  const { error } = await (supabase as any)
    .from("external_risk_triggers").update(update).eq("id", id);
  if (error) throw error;
}

export async function getClientExternalRiskTriggers(customerId: string) {
  const { data, error } = await (supabase as any).rpc("get_client_external_risks", {
    _customer_id: customerId,
  });
  if (error) throw error;
  return (data ?? []) as ClientExternalRiskRow[];
}