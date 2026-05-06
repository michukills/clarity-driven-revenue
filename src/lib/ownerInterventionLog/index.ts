/**
 * P86 Part 5 — Owner Intervention Log data access.
 * Deterministic via evaluateOwnerInterventionRisk. No AI.
 */
import { supabase } from "@/integrations/supabase/client";
import {
  evaluateOwnerInterventionRisk,
  type OwnerInterventionType,
  type OwnerInterventionSeverity,
} from "@/config/ownerInterventionLog";

export interface AdminOwnerInterventionRow {
  id: string;
  customer_id: string;
  intervention_type: OwnerInterventionType;
  intervention_date: string;
  severity: OwnerInterventionSeverity;
  repeated_pattern_flag: boolean;
  triggers_owner_independence_risk: boolean;
  related_workflow: string | null;
  admin_notes: string | null;
  client_safe_summary: string | null;
  client_visible: boolean;
  approved_for_client: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClientOwnerInterventionRow {
  id: string;
  intervention_type: OwnerInterventionType;
  intervention_date: string;
  severity: OwnerInterventionSeverity;
  client_safe_summary: string | null;
  updated_at: string;
}

export interface CreateOwnerInterventionInput {
  customer_id: string;
  intervention_type: OwnerInterventionType;
  intervention_date: string;
  severity: OwnerInterventionSeverity;
  repeated_pattern_flag?: boolean;
  related_workflow?: string | null;
  admin_notes?: string | null;
  client_safe_summary?: string | null;
}

async function countLast30Days(customerId: string): Promise<number> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await (supabase as any)
    .from("owner_intervention_log")
    .select("id, intervention_date")
    .eq("customer_id", customerId)
    .gte("intervention_date", since);
  if (error) throw error;
  return (data ?? []).length;
}

export async function adminCreateOwnerIntervention(input: CreateOwnerInterventionInput) {
  const recent = await countLast30Days(input.customer_id);
  const risk = evaluateOwnerInterventionRisk({
    interventionsLast30Days: recent + 1,
    hasRepeatedPatternFlag: input.repeated_pattern_flag ?? false,
  });
  const row = {
    customer_id: input.customer_id,
    intervention_type: input.intervention_type,
    intervention_date: input.intervention_date,
    severity: input.severity,
    repeated_pattern_flag: input.repeated_pattern_flag ?? false,
    triggers_owner_independence_risk: risk.triggers_owner_independence_risk,
    related_workflow: input.related_workflow ?? null,
    admin_notes: input.admin_notes ?? null,
    client_safe_summary: input.client_safe_summary ?? null,
    client_visible: false,
    approved_for_client: false,
  };
  const { data, error } = await (supabase as any)
    .from("owner_intervention_log").insert(row).select("*").single();
  if (error) throw error;
  return data as AdminOwnerInterventionRow;
}

export async function adminListOwnerInterventions(customerId: string) {
  const { data, error } = await (supabase as any)
    .from("owner_intervention_log")
    .select("*")
    .eq("customer_id", customerId)
    .order("intervention_date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as AdminOwnerInterventionRow[];
}

export async function adminApproveOwnerInterventionForClient(id: string, clientSafe?: string) {
  const update: Record<string, unknown> = { approved_for_client: true, client_visible: true };
  if (clientSafe && clientSafe.trim()) update.client_safe_summary = clientSafe;
  const { error } = await (supabase as any)
    .from("owner_intervention_log").update(update).eq("id", id);
  if (error) throw error;
}

export async function getClientOwnerInterventions(customerId: string) {
  const { data, error } = await (supabase as any).rpc("get_client_owner_interventions", {
    _customer_id: customerId,
  });
  if (error) throw error;
  return (data ?? []) as ClientOwnerInterventionRow[];
}