/**
 * P85.6 — Trades / Home Services Operational Leakage™ deterministic
 * helpers + admin/client data access.
 *
 * No AI. No legal/payroll/tax/labor/accounting/OSHA/insurance
 * determinations. Pure arithmetic and boolean rules over admin-entered
 * inputs. Connector evidence is treated as manual export / upload only
 * unless a real live integration is wired (none in P85.6).
 */
import { supabase } from "@/integrations/supabase/client";
import {
  DISPATCH_CONTINUITY_HOURS,
  FIRST_TIME_FIX_CALLBACK_RATE_THRESHOLD,
  FIRST_TIME_FIX_DEDUCTION_POINTS,
  SHADOW_LABOR_GAP_PERCENT_THRESHOLD,
  isTradesIndustryKey,
  type TradesEvidenceSourceType,
  type TradesGearKey,
  type TradesMetricKey,
} from "@/config/tradesOperationalLeakage";

export type TradesStatus =
  | "verified_accountability"
  | "incomplete_accountability"
  | "shadow_labor_leak"
  | "callback_drag"
  | "shadow_dispatcher_risk"
  | "current"
  | "needs_review"
  | "invalid_input"
  | "source_conflict_possible"
  | "not_applicable";

export type TradesSeverity = "none" | "info" | "high" | "severe";

export interface TradesDetectionResult<TKey extends TradesMetricKey = TradesMetricKey> {
  metric_key: TKey;
  status: TradesStatus;
  severity: TradesSeverity;
  needs_reinspection: boolean;
  gears: ReadonlyArray<TradesGearKey>;
  trigger_value: number | null;
  threshold_value: number | null;
  scoring_impact_type: "none" | "deterministic_deduction" | "high_risk_alert_pending_scoring";
  scoring_impact_value: number | null;
  reason: string;
}

// ---------- Shadow Labor Leak™ ----------

export interface ShadowLaborInput {
  paidHours: number;
  billableHours: number;
  industryKey?: string | null;
}

export function calculateTechnicianUtilization(
  input: { paidHours: number; billableHours: number },
): number | null {
  if (!Number.isFinite(input.paidHours) || !Number.isFinite(input.billableHours)) return null;
  if (input.paidHours <= 0) return null;
  return (input.billableHours / input.paidHours) * 100;
}

export function calculateShadowLaborGapPercent(
  input: { paidHours: number; billableHours: number },
): number | null {
  if (!Number.isFinite(input.paidHours) || !Number.isFinite(input.billableHours)) return null;
  if (input.paidHours <= 0) return null;
  return ((input.paidHours - input.billableHours) / input.paidHours) * 100;
}

export function detectShadowLaborLeak(
  input: ShadowLaborInput,
): TradesDetectionResult<"shadow_labor_leak"> {
  const base = {
    metric_key: "shadow_labor_leak" as const,
    gears: ["financial_visibility", "operational_efficiency"] as const,
    threshold_value: SHADOW_LABOR_GAP_PERCENT_THRESHOLD,
    scoring_impact_type: "none" as const,
    scoring_impact_value: null,
  };
  if (input.industryKey !== undefined && !isTradesIndustryKey(input.industryKey)) {
    return {
      ...base,
      status: "not_applicable",
      severity: "none",
      needs_reinspection: false,
      trigger_value: null,
      reason: "not_applicable",
    };
  }
  if (!Number.isFinite(input.paidHours) || input.paidHours <= 0) {
    return {
      ...base,
      status: "invalid_input",
      severity: "info",
      needs_reinspection: false,
      trigger_value: null,
      reason: "paid_hours_invalid",
    };
  }
  if (!Number.isFinite(input.billableHours) || input.billableHours < 0) {
    return {
      ...base,
      status: "invalid_input",
      severity: "info",
      needs_reinspection: false,
      trigger_value: null,
      reason: "billable_hours_invalid",
    };
  }
  if (input.billableHours > input.paidHours) {
    return {
      ...base,
      status: "source_conflict_possible",
      severity: "info",
      needs_reinspection: false,
      trigger_value: null,
      reason: "billable_exceeds_paid",
    };
  }
  const gap = calculateShadowLaborGapPercent(input)!;
  if (gap > SHADOW_LABOR_GAP_PERCENT_THRESHOLD) {
    return {
      ...base,
      status: "shadow_labor_leak",
      severity: "high",
      needs_reinspection: true,
      trigger_value: gap,
      reason: "gap_above_threshold",
    };
  }
  return {
    ...base,
    status: "current",
    severity: "none",
    needs_reinspection: false,
    trigger_value: gap,
    reason: "within_threshold",
  };
}

// ---------- First-Time Fix Drag™ ----------

export interface FirstTimeFixInput {
  completedJobs: number;
  callbackJobs: number;
  industryKey?: string | null;
  /** When true, apply a deterministic Operational Efficiency deduction. */
  applyDeterministicDeduction?: boolean;
}

export function calculateCallbackRate(
  input: { completedJobs: number; callbackJobs: number },
): number | null {
  if (!Number.isFinite(input.completedJobs) || !Number.isFinite(input.callbackJobs)) return null;
  if (input.completedJobs <= 0) return null;
  return (input.callbackJobs / input.completedJobs) * 100;
}

export function calculateFirstTimeFixRate(
  input: { completedJobs: number; callbackJobs: number },
): number | null {
  const cr = calculateCallbackRate(input);
  if (cr === null) return null;
  return 100 - cr;
}

export function detectFirstTimeFixDrag(
  input: FirstTimeFixInput,
): TradesDetectionResult<"first_time_fix_drag"> {
  const base = {
    metric_key: "first_time_fix_drag" as const,
    gears: ["operational_efficiency"] as const,
    threshold_value: FIRST_TIME_FIX_CALLBACK_RATE_THRESHOLD,
  };
  const noScoring = {
    scoring_impact_type: "none" as const,
    scoring_impact_value: null,
  };
  if (input.industryKey !== undefined && !isTradesIndustryKey(input.industryKey)) {
    return {
      ...base,
      ...noScoring,
      status: "not_applicable",
      severity: "none",
      needs_reinspection: false,
      trigger_value: null,
      reason: "not_applicable",
    };
  }
  if (!Number.isFinite(input.completedJobs) || input.completedJobs <= 0) {
    return {
      ...base,
      ...noScoring,
      status: "invalid_input",
      severity: "info",
      needs_reinspection: false,
      trigger_value: null,
      reason: "completed_jobs_invalid",
    };
  }
  if (!Number.isFinite(input.callbackJobs) || input.callbackJobs < 0) {
    return {
      ...base,
      ...noScoring,
      status: "invalid_input",
      severity: "info",
      needs_reinspection: false,
      trigger_value: null,
      reason: "callback_jobs_invalid",
    };
  }
  if (input.callbackJobs > input.completedJobs) {
    return {
      ...base,
      ...noScoring,
      status: "source_conflict_possible",
      severity: "info",
      needs_reinspection: false,
      trigger_value: null,
      reason: "callbacks_exceed_completed",
    };
  }
  const rate = calculateCallbackRate(input)!;
  if (rate > FIRST_TIME_FIX_CALLBACK_RATE_THRESHOLD) {
    return {
      ...base,
      status: "callback_drag",
      severity: "high",
      needs_reinspection: true,
      trigger_value: rate,
      scoring_impact_type: input.applyDeterministicDeduction
        ? "deterministic_deduction"
        : "high_risk_alert_pending_scoring",
      scoring_impact_value: input.applyDeterministicDeduction
        ? FIRST_TIME_FIX_DEDUCTION_POINTS
        : null,
      reason: "callback_rate_above_threshold",
    };
  }
  return {
    ...base,
    ...noScoring,
    status: "current",
    severity: "none",
    needs_reinspection: false,
    trigger_value: rate,
    reason: "within_threshold",
  };
}

// ---------- Truck Inventory Accountability Loop™ ----------

export interface TruckInventoryInput {
  hasTruckInventory: boolean;
  hasMobileScanning?: boolean | null;
  hasLoggedPartsMovement?: boolean | null;
  hasJobCostingTieOut?: boolean | null;
  industryKey?: string | null;
}

export function detectTruckInventoryAccountability(
  input: TruckInventoryInput,
): TradesDetectionResult<"truck_inventory_accountability_loop"> {
  const base = {
    metric_key: "truck_inventory_accountability_loop" as const,
    gears: ["operational_efficiency", "financial_visibility"] as const,
    threshold_value: null,
    scoring_impact_type: "none" as const,
    scoring_impact_value: null,
    trigger_value: null,
  };
  if (input.industryKey !== undefined && !isTradesIndustryKey(input.industryKey)) {
    return {
      ...base,
      status: "not_applicable",
      severity: "none",
      needs_reinspection: false,
      reason: "not_applicable",
    };
  }
  if (!input.hasTruckInventory) {
    return {
      ...base,
      status: "not_applicable",
      severity: "none",
      needs_reinspection: false,
      reason: "no_truck_inventory",
    };
  }
  const scanning = input.hasMobileScanning === true;
  const logged = input.hasLoggedPartsMovement === true;
  const tieOut = input.hasJobCostingTieOut === true;
  // Missing all evidence on accountability/tie-out — needs review.
  if (
    input.hasMobileScanning == null &&
    input.hasLoggedPartsMovement == null &&
    input.hasJobCostingTieOut == null
  ) {
    return {
      ...base,
      status: "needs_review",
      severity: "info",
      needs_reinspection: false,
      reason: "missing_evidence",
    };
  }
  if (!scanning && !logged) {
    return {
      ...base,
      status: "incomplete_accountability",
      severity: "high",
      needs_reinspection: true,
      reason: "no_scanning_or_logged_movement",
    };
  }
  if ((scanning || logged) && tieOut) {
    return {
      ...base,
      status: "verified_accountability",
      severity: "none",
      needs_reinspection: false,
      reason: "verified_accountability",
    };
  }
  return {
    ...base,
    status: "incomplete_accountability",
    severity: "high",
    needs_reinspection: true,
    reason: "missing_job_costing_tie_out",
  };
}

// ---------- Shadow Dispatcher Risk™ ----------

export interface ShadowDispatcherInput {
  hasDispatcher: boolean;
  dispatcherSinglePointOfFailure?: boolean | null;
  hasDispatchPriorityPlaybook?: boolean | null;
  canCoverDispatchFor48Hours?: boolean | null;
  industryKey?: string | null;
}

export function detectShadowDispatcherRisk(
  input: ShadowDispatcherInput,
): TradesDetectionResult<"shadow_dispatcher_risk"> {
  const base = {
    metric_key: "shadow_dispatcher_risk" as const,
    gears: ["owner_independence", "operational_efficiency"] as const,
    threshold_value: DISPATCH_CONTINUITY_HOURS,
    scoring_impact_type: "none" as const,
    scoring_impact_value: null,
    trigger_value: null,
  };
  if (input.industryKey !== undefined && !isTradesIndustryKey(input.industryKey)) {
    return { ...base, status: "not_applicable", severity: "none", needs_reinspection: false, reason: "not_applicable" };
  }
  if (!input.hasDispatcher) {
    return { ...base, status: "not_applicable", severity: "none", needs_reinspection: false, reason: "no_dispatcher" };
  }
  const playbook = input.hasDispatchPriorityPlaybook === true;
  const cover48 = input.canCoverDispatchFor48Hours === true;
  const spof = input.dispatcherSinglePointOfFailure === true;

  if (!playbook) {
    return {
      ...base,
      status: "shadow_dispatcher_risk",
      severity: "severe",
      needs_reinspection: true,
      reason: "no_dispatch_priority_playbook",
    };
  }
  if (input.canCoverDispatchFor48Hours === false || (!cover48 && input.canCoverDispatchFor48Hours == null && spof)) {
    // Explicit false on 48-hour continuity → high risk.
  }
  if (input.canCoverDispatchFor48Hours === false) {
    return {
      ...base,
      status: "shadow_dispatcher_risk",
      severity: "high",
      needs_reinspection: true,
      reason: "cannot_cover_48_hours",
    };
  }
  if (spof) {
    return {
      ...base,
      status: "shadow_dispatcher_risk",
      severity: "high",
      needs_reinspection: true,
      reason: "dispatcher_single_point_of_failure",
    };
  }
  if (input.canCoverDispatchFor48Hours == null || input.dispatcherSinglePointOfFailure == null) {
    return {
      ...base,
      status: "needs_review",
      severity: "info",
      needs_reinspection: false,
      reason: "continuity_evidence_missing",
    };
  }
  return {
    ...base,
    status: "current",
    severity: "none",
    needs_reinspection: false,
    reason: "playbook_and_continuity_in_place",
  };
}

// ---------- Data access ----------

export type TradesMetricStatus = TradesStatus;

export interface AdminTradesLeakageRow {
  id: string;
  customer_id: string;
  industry_key: string;
  metric_key: TradesMetricKey;
  metric_label: string;
  gear_key: TradesGearKey;
  trigger_value: number | null;
  threshold_value: number | null;
  status: TradesMetricStatus;
  severity: TradesSeverity;
  needs_reinspection: boolean;
  scoring_impact_type: string;
  scoring_impact_value: number | null;
  evidence_source_type: TradesEvidenceSourceType | null;
  evidence_label: string | null;
  evidence_id: string | null;
  client_visible: boolean;
  approved_for_client: boolean;
  admin_notes: string | null;
  client_safe_explanation: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientTradesLeakageRow {
  id: string;
  metric_key: TradesMetricKey;
  metric_label: string;
  gear_key: TradesGearKey;
  status: TradesMetricStatus;
  severity: TradesSeverity;
  needs_reinspection: boolean;
  trigger_value: number | null;
  threshold_value: number | null;
  client_safe_explanation: string | null;
  reviewed_at: string | null;
}

export async function listAdminTradesLeakageReviews(
  customerId: string,
): Promise<AdminTradesLeakageRow[]> {
  const { data, error } = await (supabase as any)
    .from("trades_operational_leakage_reviews")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as AdminTradesLeakageRow[];
}

export async function getClientTradesLeakageReviews(
  customerId: string,
): Promise<ClientTradesLeakageRow[]> {
  const { data, error } = await (supabase as any).rpc(
    "get_client_trades_operational_leakage",
    { _customer_id: customerId },
  );
  if (error) throw error;
  return (data ?? []) as ClientTradesLeakageRow[];
}

export interface CreateTradesLeakageReviewInput {
  customer_id: string;
  industry_key: string;
  metric_key: TradesMetricKey;
  metric_label: string;
  gear_key: TradesGearKey;
  trigger_value: number | null;
  threshold_value: number | null;
  status: TradesMetricStatus;
  severity: TradesSeverity;
  needs_reinspection: boolean;
  scoring_impact_type?: string;
  scoring_impact_value?: number | null;
  evidence_source_type?: TradesEvidenceSourceType | null;
  evidence_label?: string | null;
  evidence_id?: string | null;
  admin_notes?: string | null;
  client_safe_explanation?: string | null;
}

export async function createTradesLeakageReview(
  input: CreateTradesLeakageReviewInput,
) {
  const row = {
    customer_id: input.customer_id,
    industry_key: input.industry_key,
    metric_key: input.metric_key,
    metric_label: input.metric_label,
    gear_key: input.gear_key,
    trigger_value: input.trigger_value,
    threshold_value: input.threshold_value,
    status: input.status,
    severity: input.severity,
    needs_reinspection: input.needs_reinspection,
    scoring_impact_type: input.scoring_impact_type ?? "none",
    scoring_impact_value: input.scoring_impact_value ?? null,
    evidence_source_type: input.evidence_source_type ?? null,
    evidence_label: input.evidence_label ?? null,
    evidence_id: input.evidence_id ?? null,
    client_visible: false,
    approved_for_client: false,
    admin_notes: input.admin_notes ?? null,
    client_safe_explanation: input.client_safe_explanation ?? null,
    reviewed_at: new Date().toISOString(),
  };
  const { data, error } = await (supabase as any)
    .from("trades_operational_leakage_reviews")
    .insert(row)
    .select("*")
    .single();
  if (error) throw error;
  return data as AdminTradesLeakageRow;
}

export async function approveTradesLeakageForClient(
  id: string,
  client_safe_explanation?: string,
) {
  const update: Record<string, unknown> = {
    approved_for_client: true,
    client_visible: true,
  };
  if (client_safe_explanation && client_safe_explanation.trim().length > 0) {
    update.client_safe_explanation = client_safe_explanation;
  }
  const { error } = await (supabase as any)
    .from("trades_operational_leakage_reviews")
    .update(update)
    .eq("id", id);
  if (error) throw error;
}

export async function unapproveTradesLeakage(id: string) {
  const { error } = await (supabase as any)
    .from("trades_operational_leakage_reviews")
    .update({ approved_for_client: false, client_visible: false })
    .eq("id", id);
  if (error) throw error;
}
