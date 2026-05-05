/**
 * P72 — Cost of Friction Calculator™ service layer.
 *
 * Tenant-safe CRUD + workflow helpers for `cost_of_friction_runs`. RLS
 * enforces admin-only mutations and customer-only client-safe reads
 * via SECURITY DEFINER RPCs. Defensive scrubbing prevents forbidden
 * client-facing phrases from being persisted or rendered.
 */
import { supabase } from "@/integrations/supabase/client";
import {
  computeCostOfFriction,
  findCostOfFrictionForbiddenPhrase,
  type CostOfFrictionAssumptions,
  type CostOfFrictionInputs,
  type CostOfFrictionResult,
  DEFAULT_COST_OF_FRICTION_ASSUMPTIONS,
  COST_OF_FRICTION_NAME,
} from "@/config/costOfFriction";

export type CostOfFrictionStatus =
  | "draft"
  | "admin_review"
  | "approved"
  | "client_visible"
  | "archived";

export interface CostOfFrictionRunRow {
  id: string;
  customer_id: string;
  run_name: string;
  status: CostOfFrictionStatus;
  input_payload: CostOfFrictionInputs;
  assumptions_payload: CostOfFrictionAssumptions;
  result_payload: CostOfFrictionResult;
  monthly_total: number;
  annual_total: number;
  demand_generation_total: number;
  revenue_conversion_total: number;
  operational_efficiency_total: number;
  financial_visibility_total: number;
  owner_independence_total: number;
  client_visible: boolean;
  approved_for_client: boolean;
  include_in_report: boolean;
  admin_notes: string | null;
  client_safe_summary: string | null;
  linked_repair_map_item_id: string | null;
  linked_worn_tooth_signal_id: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientCostOfFrictionRunRow {
  id: string;
  run_name: string;
  client_safe_summary: string | null;
  monthly_total: number;
  annual_total: number;
  demand_generation_total: number;
  revenue_conversion_total: number;
  operational_efficiency_total: number;
  financial_visibility_total: number;
  owner_independence_total: number;
  result_payload: CostOfFrictionResult;
  assumptions_payload: CostOfFrictionAssumptions;
  reviewed_at: string | null;
  updated_at: string;
}

export interface ReportCostOfFrictionSummary {
  id: string;
  run_name: string;
  client_safe_summary: string | null;
  monthly_total: number;
  annual_total: number;
  demand_generation_total: number;
  revenue_conversion_total: number;
  operational_efficiency_total: number;
  financial_visibility_total: number;
  owner_independence_total: number;
}

function scrubClientSafe(text: string | null | undefined): void {
  const bad = findCostOfFrictionForbiddenPhrase(text);
  if (bad) throw new Error(`Forbidden client-facing phrase: "${bad}".`);
}

export interface UpsertCostOfFrictionRunInput {
  id?: string;
  customerId: string;
  runName?: string;
  status?: CostOfFrictionStatus;
  inputs: CostOfFrictionInputs;
  assumptions?: CostOfFrictionAssumptions;
  adminNotes?: string | null;
  clientSafeSummary?: string | null;
  approvedForClient?: boolean;
  clientVisible?: boolean;
  includeInReport?: boolean;
  linkedRepairMapItemId?: string | null;
  linkedWornToothSignalId?: string | null;
  createdByRole?: "admin" | "client";
}

/** Build the durable row payload from inputs by re-running the deterministic calculator. */
export function buildCostOfFrictionRowPayload(
  input: UpsertCostOfFrictionRunInput,
): Record<string, unknown> {
  scrubClientSafe(input.clientSafeSummary);
  const assumptions =
    input.assumptions ?? DEFAULT_COST_OF_FRICTION_ASSUMPTIONS;
  const result = computeCostOfFriction(input.inputs, assumptions);
  return {
    customer_id: input.customerId,
    run_name: input.runName ?? `${COST_OF_FRICTION_NAME} estimate`,
    status: input.status ?? "draft",
    input_payload: input.inputs,
    assumptions_payload: assumptions,
    result_payload: result,
    monthly_total: result.monthlyTotal,
    annual_total: result.annualTotal,
    demand_generation_total: result.byGear.demand_generation,
    revenue_conversion_total: result.byGear.revenue_conversion,
    operational_efficiency_total: result.byGear.operational_efficiency,
    financial_visibility_total: result.byGear.financial_visibility,
    owner_independence_total: result.byGear.owner_independence,
    admin_notes: input.adminNotes ?? null,
    client_safe_summary: input.clientSafeSummary ?? null,
    approved_for_client: input.approvedForClient ?? false,
    client_visible: input.clientVisible ?? false,
    include_in_report: input.includeInReport ?? false,
    linked_repair_map_item_id: input.linkedRepairMapItemId ?? null,
    linked_worn_tooth_signal_id: input.linkedWornToothSignalId ?? null,
    created_by_role: input.createdByRole ?? null,
  };
}

export async function upsertCostOfFrictionRun(
  input: UpsertCostOfFrictionRunInput,
): Promise<CostOfFrictionRunRow> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id ?? null;
  const payload = buildCostOfFrictionRowPayload(input);
  if (input.id) {
    const { data, error } = await (supabase as any)
      .from("cost_of_friction_runs")
      .update({
        ...payload,
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", input.id)
      .select("*")
      .single();
    if (error) throw error;
    return data as CostOfFrictionRunRow;
  }
  const { data, error } = await (supabase as any)
    .from("cost_of_friction_runs")
    .insert([{ ...payload, created_by: userId }])
    .select("*")
    .single();
  if (error) throw error;
  return data as CostOfFrictionRunRow;
}

export async function adminListCostOfFrictionRuns(
  customerId: string,
): Promise<CostOfFrictionRunRow[]> {
  const { data, error } = await (supabase as any)
    .from("cost_of_friction_runs")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as CostOfFrictionRunRow[];
}

export async function deleteCostOfFrictionRun(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from("cost_of_friction_runs")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

/** Client-facing read via SECURITY DEFINER RPC. */
export async function getClientCostOfFrictionRuns(
  customerId: string,
): Promise<ClientCostOfFrictionRunRow[]> {
  const { data, error } = await (supabase as any).rpc(
    "get_client_cost_of_friction_runs",
    { _customer_id: customerId },
  );
  if (error) throw error;
  return ((data ?? []) as ClientCostOfFrictionRunRow[]).filter(
    (r) => !findCostOfFrictionForbiddenPhrase(r.client_safe_summary),
  );
}

/** Admin report-builder read. */
export async function adminListReportCostOfFrictionRuns(
  customerId: string,
): Promise<ReportCostOfFrictionSummary[]> {
  const { data, error } = await (supabase as any).rpc(
    "admin_list_report_cost_of_friction_runs",
    { _customer_id: customerId },
  );
  if (error) throw error;
  return (data ?? []) as ReportCostOfFrictionSummary[];
}

/** Honest report renderer. */
export function renderCostOfFrictionForReport(
  runs: ReadonlyArray<ReportCostOfFrictionSummary>,
): string {
  if (!runs.length) {
    return (
      `No ${COST_OF_FRICTION_NAME} run has been reviewed and approved ` +
      "for inclusion in this report yet."
    );
  }
  const fmt = (n: number) =>
    `$${Math.round(n).toLocaleString()}`;
  const lines = runs.map((r) => {
    const summary = r.client_safe_summary
      ? `\n   ${r.client_safe_summary}`
      : "";
    return (
      `• ${r.run_name}\n` +
      `   Estimated monthly friction: ${fmt(r.monthly_total)}\n` +
      `   Estimated annual friction: ${fmt(r.annual_total)}\n` +
      `   By gear — Demand: ${fmt(r.demand_generation_total)} · ` +
      `Revenue: ${fmt(r.revenue_conversion_total)} · ` +
      `Operations: ${fmt(r.operational_efficiency_total)} · ` +
      `Financial: ${fmt(r.financial_visibility_total)} · ` +
      `Owner: ${fmt(r.owner_independence_total)}` +
      summary
    );
  });
  const disclaimer =
    "\n\nEstimate only. Cost of friction figures are operational " +
    "approximations — not a guarantee of savings, ROI, recovery, or " +
    "valuation impact.";
  return lines.join("\n\n") + disclaimer;
}