/**
 * P73 — Stability-to-Value Lens™ service layer.
 *
 * Tenant-safe CRUD + workflow helpers for `stability_to_value_lens_runs`.
 * RLS enforces admin-only mutations and customer-only client-safe reads
 * via SECURITY DEFINER RPCs. Defensive scrubbing prevents forbidden
 * client-facing valuation/appraisal/lending phrases from being persisted.
 */
import { supabase } from "@/integrations/supabase/client";
import {
  computeStabilityToValueLens,
  findStabilityToValueForbiddenPhrase,
  STABILITY_TO_VALUE_LENS_NAME,
  type StvAnswers,
  type StvResult,
  type StabilityToValueStructureRating,
  type PerceivedOperationalRiskLevel,
} from "@/config/stabilityToValueLens";

export type StabilityToValueLensStatus =
  | "draft"
  | "admin_review"
  | "approved"
  | "client_visible"
  | "archived";

export interface StabilityToValueLensRunRow {
  id: string;
  customer_id: string;
  run_name: string;
  status: StabilityToValueLensStatus;
  input_payload: StvAnswers;
  evidence_payload: Record<string, unknown>;
  result_payload: StvResult;
  total_score: number;
  demand_generation_score: number;
  revenue_conversion_score: number;
  operational_efficiency_score: number;
  financial_visibility_score: number;
  owner_independence_score: number;
  structure_rating: StabilityToValueStructureRating;
  perceived_operational_risk_level: PerceivedOperationalRiskLevel;
  transferability_readiness_label: string;
  client_safe_summary: string | null;
  admin_notes: string | null;
  approved_for_client: boolean;
  client_visible: boolean;
  include_in_report: boolean;
  linked_repair_map_item_id: string | null;
  linked_worn_tooth_signal_id: string | null;
  linked_reality_check_flag_id: string | null;
  linked_cost_of_friction_run_id: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientStabilityToValueLensRunRow {
  id: string;
  run_name: string;
  client_safe_summary: string | null;
  total_score: number;
  demand_generation_score: number;
  revenue_conversion_score: number;
  operational_efficiency_score: number;
  financial_visibility_score: number;
  owner_independence_score: number;
  structure_rating: StabilityToValueStructureRating;
  perceived_operational_risk_level: PerceivedOperationalRiskLevel;
  transferability_readiness_label: string;
  result_payload: StvResult;
  reviewed_at: string | null;
  updated_at: string;
}

export interface ReportStabilityToValueLensSummary {
  id: string;
  run_name: string;
  client_safe_summary: string | null;
  total_score: number;
  demand_generation_score: number;
  revenue_conversion_score: number;
  operational_efficiency_score: number;
  financial_visibility_score: number;
  owner_independence_score: number;
  structure_rating: StabilityToValueStructureRating;
  perceived_operational_risk_level: PerceivedOperationalRiskLevel;
  transferability_readiness_label: string;
}

function scrubClientSafe(text: string | null | undefined): void {
  const bad = findStabilityToValueForbiddenPhrase(text);
  if (bad) throw new Error(`Forbidden client-facing phrase: "${bad}".`);
}

export interface UpsertStabilityToValueLensRunInput {
  id?: string;
  customerId: string;
  runName?: string;
  status?: StabilityToValueLensStatus;
  answers: StvAnswers;
  evidence?: Record<string, unknown>;
  adminNotes?: string | null;
  clientSafeSummary?: string | null;
  approvedForClient?: boolean;
  clientVisible?: boolean;
  includeInReport?: boolean;
  linkedRepairMapItemId?: string | null;
  linkedWornToothSignalId?: string | null;
  linkedRealityCheckFlagId?: string | null;
  linkedCostOfFrictionRunId?: string | null;
  createdByRole?: "admin" | "client";
}

export function buildStabilityToValueLensRowPayload(
  input: UpsertStabilityToValueLensRunInput,
): Record<string, unknown> {
  scrubClientSafe(input.clientSafeSummary);
  const result = computeStabilityToValueLens(input.answers);
  return {
    customer_id: input.customerId,
    run_name: input.runName ?? `${STABILITY_TO_VALUE_LENS_NAME} run`,
    status: input.status ?? "draft",
    input_payload: input.answers,
    evidence_payload: input.evidence ?? {},
    result_payload: result,
    total_score: result.totalScore,
    demand_generation_score: result.byGear.demand_generation.score,
    revenue_conversion_score: result.byGear.revenue_conversion.score,
    operational_efficiency_score: result.byGear.operational_efficiency.score,
    financial_visibility_score: result.byGear.financial_visibility.score,
    owner_independence_score: result.byGear.owner_independence.score,
    structure_rating: result.structureRating,
    perceived_operational_risk_level: result.perceivedOperationalRiskLevel,
    transferability_readiness_label: result.transferabilityReadinessLabel,
    admin_notes: input.adminNotes ?? null,
    client_safe_summary: input.clientSafeSummary ?? null,
    approved_for_client: input.approvedForClient ?? false,
    client_visible: input.clientVisible ?? false,
    include_in_report: input.includeInReport ?? false,
    linked_repair_map_item_id: input.linkedRepairMapItemId ?? null,
    linked_worn_tooth_signal_id: input.linkedWornToothSignalId ?? null,
    linked_reality_check_flag_id: input.linkedRealityCheckFlagId ?? null,
    linked_cost_of_friction_run_id: input.linkedCostOfFrictionRunId ?? null,
    created_by_role: input.createdByRole ?? null,
  };
}

export async function upsertStabilityToValueLensRun(
  input: UpsertStabilityToValueLensRunInput,
): Promise<StabilityToValueLensRunRow> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id ?? null;
  const payload = buildStabilityToValueLensRowPayload(input);
  if (input.id) {
    const { data, error } = await (supabase as any)
      .from("stability_to_value_lens_runs")
      .update({
        ...payload,
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", input.id)
      .select("*")
      .single();
    if (error) throw error;
    return data as StabilityToValueLensRunRow;
  }
  const { data, error } = await (supabase as any)
    .from("stability_to_value_lens_runs")
    .insert([{ ...payload, created_by: userId }])
    .select("*")
    .single();
  if (error) throw error;
  return data as StabilityToValueLensRunRow;
}

export async function adminListStabilityToValueLensRuns(
  customerId: string,
): Promise<StabilityToValueLensRunRow[]> {
  const { data, error } = await (supabase as any)
    .from("stability_to_value_lens_runs")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as StabilityToValueLensRunRow[];
}

export async function deleteStabilityToValueLensRun(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from("stability_to_value_lens_runs")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function getClientStabilityToValueLensRuns(
  customerId: string,
): Promise<ClientStabilityToValueLensRunRow[]> {
  const { data, error } = await (supabase as any).rpc(
    "get_client_stability_to_value_lens_runs",
    { _customer_id: customerId },
  );
  if (error) throw error;
  return ((data ?? []) as ClientStabilityToValueLensRunRow[]).filter(
    (r) => !findStabilityToValueForbiddenPhrase(r.client_safe_summary),
  );
}

export async function adminListReportStabilityToValueLensRuns(
  customerId: string,
): Promise<ReportStabilityToValueLensSummary[]> {
  const { data, error } = await (supabase as any).rpc(
    "admin_list_report_stability_to_value_lens_runs",
    { _customer_id: customerId },
  );
  if (error) throw error;
  return (data ?? []) as ReportStabilityToValueLensSummary[];
}

/** Honest report renderer for the Structural Health Report™. */
export function renderStabilityToValueLensForReport(
  runs: ReadonlyArray<ReportStabilityToValueLensSummary>,
): string {
  if (!runs.length) {
    return (
      `No ${STABILITY_TO_VALUE_LENS_NAME} run has been reviewed and ` +
      "approved for inclusion in this report yet. This lens is an " +
      "operational stability/transferability lens — not a valuation, " +
      "appraisal, lending, investment, fiduciary, tax, accounting, or " +
      "legal opinion."
    );
  }
  const lines = runs.map((r) => {
    const summary = r.client_safe_summary ? `\n   ${r.client_safe_summary}` : "";
    return (
      `• ${r.run_name}\n` +
      `   Stability-to-Value readiness score: ${r.total_score}/100\n` +
      `   Structure rating: ${r.transferability_readiness_label}\n` +
      `   Perceived operational risk: ${r.perceived_operational_risk_level}\n` +
      `   By gear — Demand: ${r.demand_generation_score}/20 · ` +
      `Revenue: ${r.revenue_conversion_score}/20 · ` +
      `Operations: ${r.operational_efficiency_score}/20 · ` +
      `Financial: ${r.financial_visibility_score}/20 · ` +
      `Owner: ${r.owner_independence_score}/20` +
      summary
    );
  });
  const disclaimer =
    "\n\nThis lens is not a valuation, appraisal, lending, investment, " +
    "fiduciary, tax, accounting, or legal opinion. It is an operational " +
    "stability and transferability lens. Review with qualified " +
    "professionals before any lending, investment, sale, tax, or legal " +
    "decision.";
  return lines.join("\n\n") + disclaimer;
}