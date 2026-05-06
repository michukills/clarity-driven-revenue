/**
 * P86 Part 5 — Owner Intervention Log.
 *
 * Tracks when an owner jumps into roles/processes that should be handled
 * by a manager, team member, SOP, or system. Repeated patterns escalate
 * Owner Independence risk via deterministic threshold.
 */

export type OwnerInterventionType =
  | "owner_jumped_into_dispatch"
  | "owner_approved_discount"
  | "owner_resolved_customer_issue"
  | "owner_completed_staff_task"
  | "owner_corrected_inventory"
  | "owner_handled_scheduling"
  | "owner_overrode_sop"
  | "owner_made_unassigned_decision"
  | "other";

export const OWNER_INTERVENTION_TYPES: ReadonlyArray<OwnerInterventionType> = [
  "owner_jumped_into_dispatch",
  "owner_approved_discount",
  "owner_resolved_customer_issue",
  "owner_completed_staff_task",
  "owner_corrected_inventory",
  "owner_handled_scheduling",
  "owner_overrode_sop",
  "owner_made_unassigned_decision",
  "other",
];

export type OwnerInterventionSeverity = "low" | "medium" | "high";

/** Threshold of interventions in 30 days that triggers Owner Independence risk. */
export const OWNER_INTERVENTION_PATTERN_THRESHOLD_30D = 4;

export const OWNER_INTERVENTION_FORBIDDEN_CLAIMS: ReadonlyArray<string> = [
  "legal compliance",
  "tax compliance",
  "audit-ready",
  "lender-ready",
  "investor-ready",
  "compliance certification",
  "guaranteed",
  "fiduciary",
];

export function findOwnerInterventionForbiddenPhrase(
  text: string | null | undefined,
): string | null {
  if (!text) return null;
  const lc = text.toLowerCase();
  for (const p of OWNER_INTERVENTION_FORBIDDEN_CLAIMS) {
    if (lc.includes(p)) return p;
  }
  return null;
}

export interface OwnerInterventionRiskInput {
  interventionsLast30Days: number;
  hasRepeatedPatternFlag: boolean;
}

export interface OwnerInterventionRiskResult {
  triggers_owner_independence_risk: boolean;
  reason: string;
}

export function evaluateOwnerInterventionRisk(
  input: OwnerInterventionRiskInput,
): OwnerInterventionRiskResult {
  if (input.hasRepeatedPatternFlag) {
    return { triggers_owner_independence_risk: true, reason: "repeated_pattern_flag" };
  }
  if (input.interventionsLast30Days >= OWNER_INTERVENTION_PATTERN_THRESHOLD_30D) {
    return { triggers_owner_independence_risk: true, reason: "count_above_threshold" };
  }
  return { triggers_owner_independence_risk: false, reason: "below_threshold" };
}