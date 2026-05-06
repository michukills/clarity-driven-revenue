/**
 * P86 Part 3 — Labor Burden Calculator (Trades / Home Services).
 *
 * Deterministic. No AI. Connector mentions describe MANUAL EXPORT /
 * UPLOAD only. Operational-readiness language only — never legal,
 * payroll-law, wage-law, OSHA, or labor-compliance determinations.
 */

export const LABOR_BURDEN_GAP_HIGH_RISK_PCT_THRESHOLD = 20;
export const LABOR_BURDEN_OPERATIONAL_EFFICIENCY_DEDUCTION_POINTS = 15;

export type LaborBurdenStatus =
  | "current"
  | "high_risk"
  | "needs_admin_review"
  | "invalid_input"
  | "missing";

export type LaborBurdenEvidenceSource =
  | "quickbooks_manual_export"
  | "payroll_manual_export"
  | "jobber_manual_export"
  | "servicetitan_manual_export"
  | "housecall_pro_manual_export"
  | "other_manual_upload";

export const LABOR_BURDEN_EVIDENCE_SOURCES: ReadonlyArray<{
  key: LaborBurdenEvidenceSource;
  label: string;
  live_connector: false;
}> = [
  { key: "quickbooks_manual_export", label: "QuickBooks export (manual upload)", live_connector: false },
  { key: "payroll_manual_export", label: "Payroll export (manual upload)", live_connector: false },
  { key: "jobber_manual_export", label: "Jobber export (manual upload)", live_connector: false },
  { key: "servicetitan_manual_export", label: "ServiceTitan export (manual upload)", live_connector: false },
  { key: "housecall_pro_manual_export", label: "Housecall Pro export (manual upload)", live_connector: false },
  { key: "other_manual_upload", label: "Other manual upload", live_connector: false },
];

export const LABOR_BURDEN_FORBIDDEN_CLAIMS: ReadonlyArray<string> = [
  "wage law",
  "wage-law",
  "labor law",
  "labor-law",
  "osha",
  "payroll compliance",
  "tax compliance",
  "audit-ready",
  "lender-ready",
  "investor-ready",
  "compliance certification",
  "guaranteed",
];

export function findLaborBurdenForbiddenPhrase(text: string | null | undefined): string | null {
  if (!text) return null;
  const lc = text.toLowerCase();
  for (const p of LABOR_BURDEN_FORBIDDEN_CLAIMS) {
    if (lc.includes(p)) return p;
  }
  return null;
}

export const LABOR_BURDEN_CLIENT_SAFE_EXPLANATION =
  "Labor Burden compares paid field hours against billable hours from manually uploaded payroll and field-ops exports. It is an operational-readiness signal only.";

export interface LaborBurdenInput {
  totalFieldPayrollHours: number;
  totalBillableHours: number;
  hasEvidence: boolean;
}

export interface LaborBurdenResult {
  status: LaborBurdenStatus;
  paid_to_billable_gap_pct: number | null;
  scoring_impact_gear: "operational_efficiency";
  scoring_impact_points: number;
  reason: string;
}

export function computeLaborBurden(input: LaborBurdenInput): LaborBurdenResult {
  if (!input.hasEvidence) {
    return {
      status: "missing",
      paid_to_billable_gap_pct: null,
      scoring_impact_gear: "operational_efficiency",
      scoring_impact_points: 0,
      reason: "missing_evidence",
    };
  }
  const p = input.totalFieldPayrollHours;
  const b = input.totalBillableHours;
  if (!Number.isFinite(p) || !Number.isFinite(b) || p <= 0 || b < 0) {
    return {
      status: "invalid_input",
      paid_to_billable_gap_pct: null,
      scoring_impact_gear: "operational_efficiency",
      scoring_impact_points: 0,
      reason: "invalid_input",
    };
  }
  if (b > p) {
    return {
      status: "needs_admin_review",
      paid_to_billable_gap_pct: null,
      scoring_impact_gear: "operational_efficiency",
      scoring_impact_points: 0,
      reason: "billable_exceeds_payroll",
    };
  }
  const gap = ((p - b) / p) * 100;
  if (gap > LABOR_BURDEN_GAP_HIGH_RISK_PCT_THRESHOLD) {
    return {
      status: "high_risk",
      paid_to_billable_gap_pct: gap,
      scoring_impact_gear: "operational_efficiency",
      scoring_impact_points: LABOR_BURDEN_OPERATIONAL_EFFICIENCY_DEDUCTION_POINTS,
      reason: "gap_above_threshold",
    };
  }
  return {
    status: "current",
    paid_to_billable_gap_pct: gap,
    scoring_impact_gear: "operational_efficiency",
    scoring_impact_points: 0,
    reason: "within_threshold",
  };
}