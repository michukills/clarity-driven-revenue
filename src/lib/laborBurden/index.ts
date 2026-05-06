/**
 * P86 — Labor Burden Calculator data access (Trades / Home Services).
 * Deterministic via computeLaborBurden. Never guess if evidence missing.
 */
import { supabase } from "@/integrations/supabase/client";
import {
  computeLaborBurden,
  type LaborBurdenStatus,
} from "@/config/laborBurden";

export interface AdminLaborBurdenRow {
  id: string;
  customer_id: string;
  industry_key: string;
  total_field_payroll_hours: number;
  total_billable_hours: number;
  has_payroll_evidence: boolean;
  payroll_evidence_label: string | null;
  field_ops_evidence_label: string | null;
  paid_to_billable_gap_pct: number | null;
  status: LaborBurdenStatus;
  scoring_impact_gear: string;
  scoring_impact_points: number;
  client_visible: boolean;
  approved_for_client: boolean;
  admin_notes: string | null;
  client_safe_explanation: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientLaborBurdenRow {
  id: string;
  industry_key: string;
  status: LaborBurdenStatus;
  paid_to_billable_gap_pct: number | null;
  scoring_impact_gear: string;
  scoring_impact_points: number;
  client_safe_explanation: string | null;
  updated_at: string;
}

export interface CreateLaborBurdenInput {
  customer_id: string;
  industry_key: string;
  total_field_payroll_hours: number;
  total_billable_hours: number;
  has_payroll_evidence: boolean;
  payroll_evidence_label?: string | null;
  field_ops_evidence_label?: string | null;
  admin_notes?: string | null;
  client_safe_explanation?: string | null;
}

export async function adminCreateLaborBurdenCalculation(input: CreateLaborBurdenInput) {
  const r = computeLaborBurden({
    totalFieldPayrollHours: input.total_field_payroll_hours,
    totalBillableHours: input.total_billable_hours,
    hasEvidence: input.has_payroll_evidence,
  });
  const row = {
    customer_id: input.customer_id,
    industry_key: input.industry_key,
    total_field_payroll_hours: input.total_field_payroll_hours,
    total_billable_hours: input.total_billable_hours,
    has_payroll_evidence: input.has_payroll_evidence,
    payroll_evidence_label: input.payroll_evidence_label ?? null,
    field_ops_evidence_label: input.field_ops_evidence_label ?? null,
    paid_to_billable_gap_pct: r.paid_to_billable_gap_pct,
    status: r.status,
    scoring_impact_gear: r.scoring_impact_gear,
    scoring_impact_points: r.scoring_impact_points,
    admin_notes: input.admin_notes ?? null,
    client_safe_explanation: input.client_safe_explanation ?? null,
    client_visible: false,
    approved_for_client: false,
  };
  const { data, error } = await (supabase as any)
    .from("labor_burden_calculations")
    .insert(row)
    .select("*")
    .single();
  if (error) throw error;
  return data as AdminLaborBurdenRow;
}

export async function adminListLaborBurdenCalculations(customerId: string) {
  const { data, error } = await (supabase as any)
    .from("labor_burden_calculations")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as AdminLaborBurdenRow[];
}

export async function getClientLaborBurdenCalculations(customerId: string) {
  const { data, error } = await (supabase as any).rpc("get_client_labor_burden", {
    _customer_id: customerId,
  });
  if (error) throw error;
  return (data ?? []) as ClientLaborBurdenRow[];
}

export async function adminApproveLaborBurdenForClient(id: string, clientSafe?: string) {
  const update: Record<string, unknown> = { approved_for_client: true, client_visible: true };
  if (clientSafe && clientSafe.trim()) update.client_safe_explanation = clientSafe;
  const { error } = await (supabase as any)
    .from("labor_burden_calculations").update(update).eq("id", id);
  if (error) throw error;
}