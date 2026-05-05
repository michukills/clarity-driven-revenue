/**
 * P72 — Cost of Friction Calculator™ canonical config.
 *
 * Deterministic line-item registry for the five RGS gears + safe
 * client-facing wording rules. AI must not override these calculations.
 *
 * Per ORNRA: results are an operational decision-support estimate, not
 * a guarantee of savings, ROI, valuation impact, or financial outcome.
 */

export const COST_OF_FRICTION_NAME = "Cost of Friction Calculator™";

export const COST_OF_FRICTION_GEARS = [
  "demand_generation",
  "revenue_conversion",
  "operational_efficiency",
  "financial_visibility",
  "owner_independence",
] as const;
export type CostOfFrictionGear = (typeof COST_OF_FRICTION_GEARS)[number];

export const COST_OF_FRICTION_GEAR_LABELS: Record<CostOfFrictionGear, string> = {
  demand_generation: "Demand Generation",
  revenue_conversion: "Revenue Conversion",
  operational_efficiency: "Operational Efficiency",
  financial_visibility: "Financial Visibility",
  owner_independence: "Owner Independence",
};

/** Phrases that must NEVER appear in client-facing calculator copy. */
export const COST_OF_FRICTION_FORBIDDEN_CLIENT_PHRASES = [
  "guaranteed roi",
  "guaranteed savings",
  "guaranteed revenue",
  "guaranteed results",
  "guaranteed recovery",
  "exact loss",
  "proves you are losing",
  "cpa verified",
  "audit-ready",
  "audit ready",
  "lender-ready",
  "lender ready",
  "investor-ready",
  "investor ready",
  "investment-ready",
  "investment ready",
  "valuation increase",
  "appraisal",
  "fiduciary",
  "tax advice",
  "financial advice",
  "legal advice",
  "compliance certified",
  "safe harbor",
  "enforcement-proof",
  "enforcement proof",
  "rgs will recover",
] as const;

export function findCostOfFrictionForbiddenPhrase(
  text: string | null | undefined,
): string | null {
  if (!text) return null;
  const lower = text.toLowerCase();
  for (const p of COST_OF_FRICTION_FORBIDDEN_CLIENT_PHRASES) {
    if (lower.includes(p)) return p;
  }
  return null;
}

/**
 * Client-safe disclaimer rendered everywhere calculator results appear.
 * Must be visible in admin UI, client UI, and any report integration.
 */
export const COST_OF_FRICTION_CLIENT_DISCLAIMER =
  `${COST_OF_FRICTION_NAME} provides an operational estimate based on ` +
  "the numbers entered. It is not a guarantee of savings, revenue " +
  "recovery, ROI, profit improvement, valuation impact, tax outcome, " +
  "accounting result, or business performance. Use this as a " +
  "decision-support estimate. Review the assumptions before relying " +
  "on the result.";

export const COST_OF_FRICTION_TONE_REMINDER =
  "Estimate only. Cost of friction figures are operational " +
  "approximations — they help prioritize where to look, not what to claim.";

/**
 * Default editable assumptions shared by formulas. Conservative.
 */
export interface CostOfFrictionAssumptions {
  loadedHourlyCost: number; // dollars per hour for team labor
  ownerHourlyValue: number; // dollars per hour for owner time
  collectionsDragFactor: number; // monthly carrying cost % of past-due AR
}

export const DEFAULT_COST_OF_FRICTION_ASSUMPTIONS: CostOfFrictionAssumptions = {
  loadedHourlyCost: 45,
  ownerHourlyValue: 125,
  collectionsDragFactor: 0.015,
};

/**
 * Calculator line registry. Each line ties to a gear and computes a
 * monthly dollar friction estimate from typed numeric inputs and the
 * shared assumptions object. Returns null when there isn't enough data
 * — never fakes a value.
 */
export interface CostOfFrictionLine {
  key: string;
  gear: CostOfFrictionGear;
  label: string;
  helper: string;
  /** Field metadata for input UI. */
  inputs: ReadonlyArray<{
    key: string;
    label: string;
    placeholder?: string;
    /** "currency" | "count" | "percent" | "hours" */
    kind: "currency" | "count" | "percent" | "hours";
  }>;
  /** Returns null when not enough info to calculate. */
  compute: (
    inputs: Record<string, number | undefined>,
    a: CostOfFrictionAssumptions,
  ) => number | null;
}

const num = (v: number | undefined): number | null =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null;

const pct = (v: number | undefined): number | null => {
  const n = num(v);
  if (n === null) return null;
  // Allow either fractional (0.25) or percent (25). Cap to [0,1].
  const f = n > 1 ? n / 100 : n;
  return f >= 0 && f <= 1 ? f : null;
};

export const COST_OF_FRICTION_LINES: readonly CostOfFrictionLine[] = [
  // ─── Demand Generation ──────────────────────────────────────────
  {
    key: "dg.lost_leads",
    gear: "demand_generation",
    label: "Estimated value of missed or weak leads",
    helper:
      "monthly_lost_leads × estimated_close_rate × average_order_value",
    inputs: [
      { key: "monthly_lost_leads", label: "Monthly lost or unanswered leads", kind: "count" },
      { key: "estimated_close_rate", label: "Estimated close rate (%)", kind: "percent" },
      { key: "average_order_value", label: "Average order value ($)", kind: "currency" },
    ],
    compute: (i) => {
      const leads = num(i.monthly_lost_leads);
      const close = pct(i.estimated_close_rate);
      const aov = num(i.average_order_value);
      if (leads === null || close === null || aov === null) return null;
      return leads * close * aov;
    },
  },
  // ─── Revenue Conversion ─────────────────────────────────────────
  {
    key: "rc.conversion_leakage",
    gear: "revenue_conversion",
    label: "Conversion leakage (close-rate gap)",
    helper:
      "monthly_qualified_leads × close_rate_gap × average_order_value",
    inputs: [
      { key: "monthly_qualified_leads", label: "Monthly qualified leads", kind: "count" },
      { key: "close_rate_gap", label: "Close-rate gap vs. target (%)", kind: "percent" },
      { key: "average_order_value", label: "Average order value ($)", kind: "currency" },
    ],
    compute: (i) => {
      const leads = num(i.monthly_qualified_leads);
      const gap = pct(i.close_rate_gap);
      const aov = num(i.average_order_value);
      if (leads === null || gap === null || aov === null) return null;
      return leads * gap * aov;
    },
  },
  {
    key: "rc.no_show_cancellation",
    gear: "revenue_conversion",
    label: "No-show or cancellation leakage",
    helper:
      "monthly_booked_opportunities × no_show_or_cancel_rate × average_order_value",
    inputs: [
      { key: "monthly_booked", label: "Monthly booked opportunities", kind: "count" },
      { key: "no_show_rate", label: "No-show / cancel rate (%)", kind: "percent" },
      { key: "average_order_value", label: "Average order value ($)", kind: "currency" },
    ],
    compute: (i) => {
      const booked = num(i.monthly_booked);
      const ns = pct(i.no_show_rate);
      const aov = num(i.average_order_value);
      if (booked === null || ns === null || aov === null) return null;
      return booked * ns * aov;
    },
  },
  // ─── Operational Efficiency ────────────────────────────────────
  {
    key: "oe.rework",
    gear: "operational_efficiency",
    label: "Rework cost",
    helper: "monthly_rework_hours × loaded_hourly_cost",
    inputs: [
      { key: "monthly_rework_hours", label: "Monthly rework hours", kind: "hours" },
    ],
    compute: (i, a) => {
      const h = num(i.monthly_rework_hours);
      if (h === null) return null;
      return h * a.loadedHourlyCost;
    },
  },
  {
    key: "oe.manual_process",
    gear: "operational_efficiency",
    label: "Manual process drag",
    helper: "manual_process_hours_per_month × loaded_hourly_cost",
    inputs: [
      { key: "manual_process_hours", label: "Manual process hours per month", kind: "hours" },
    ],
    compute: (i, a) => {
      const h = num(i.manual_process_hours);
      if (h === null) return null;
      return h * a.loadedHourlyCost;
    },
  },
  {
    key: "oe.documentation_gap",
    gear: "operational_efficiency",
    label: "Documentation gap friction",
    helper:
      "estimated_hours_lost_due_to_missing_sops × loaded_hourly_cost",
    inputs: [
      { key: "sop_gap_hours", label: "Hours lost per month from missing SOPs", kind: "hours" },
    ],
    compute: (i, a) => {
      const h = num(i.sop_gap_hours);
      if (h === null) return null;
      return h * a.loadedHourlyCost;
    },
  },
  // ─── Financial Visibility ──────────────────────────────────────
  {
    key: "fv.delayed_collections",
    gear: "financial_visibility",
    label: "Delayed collections drag (estimated monthly carrying)",
    helper:
      "average_past_due_amount × monthly carrying assumption (drag_factor)",
    inputs: [
      { key: "past_due_amount", label: "Average past-due A/R balance ($)", kind: "currency" },
    ],
    compute: (i, a) => {
      const due = num(i.past_due_amount);
      if (due === null) return null;
      return due * a.collectionsDragFactor;
    },
  },
  {
    key: "fv.owner_rebuild_numbers",
    gear: "financial_visibility",
    label: "Owner time rebuilding numbers each month",
    helper: "owner_hours_lost_rebuilding_numbers × owner_hourly_value",
    inputs: [
      { key: "owner_finance_hours", label: "Owner hours per month rebuilding numbers", kind: "hours" },
    ],
    compute: (i, a) => {
      const h = num(i.owner_finance_hours);
      if (h === null) return null;
      return h * a.ownerHourlyValue;
    },
  },
  // ─── Owner Independence ────────────────────────────────────────
  {
    key: "oi.owner_bottleneck",
    gear: "owner_independence",
    label: "Owner bottleneck cost",
    helper: "owner_hours_lost_per_month × owner_hourly_value",
    inputs: [
      { key: "owner_bottleneck_hours", label: "Owner hours per month on delegable work", kind: "hours" },
    ],
    compute: (i, a) => {
      const h = num(i.owner_bottleneck_hours);
      if (h === null) return null;
      return h * a.ownerHourlyValue;
    },
  },
] as const;

export type CostOfFrictionInputs = Record<string, Record<string, number | undefined>>;

export interface CostOfFrictionLineResult {
  key: string;
  gear: CostOfFrictionGear;
  label: string;
  monthly: number | null;
}

export interface CostOfFrictionResult {
  lines: CostOfFrictionLineResult[];
  byGear: Record<CostOfFrictionGear, number>;
  monthlyTotal: number;
  annualTotal: number;
  missingLines: string[];
}

export const MISSING_DATA_LABEL =
  "Not enough information to calculate this line yet.";

/** Pure, deterministic calculator. */
export function computeCostOfFriction(
  inputs: CostOfFrictionInputs,
  assumptions: CostOfFrictionAssumptions = DEFAULT_COST_OF_FRICTION_ASSUMPTIONS,
): CostOfFrictionResult {
  const lines: CostOfFrictionLineResult[] = [];
  const byGear: Record<CostOfFrictionGear, number> = {
    demand_generation: 0,
    revenue_conversion: 0,
    operational_efficiency: 0,
    financial_visibility: 0,
    owner_independence: 0,
  };
  const missingLines: string[] = [];
  let monthlyTotal = 0;
  for (const def of COST_OF_FRICTION_LINES) {
    const lineInputs = inputs[def.key] ?? {};
    const monthly = def.compute(lineInputs, assumptions);
    lines.push({ key: def.key, gear: def.gear, label: def.label, monthly });
    if (monthly === null) {
      missingLines.push(def.key);
    } else {
      byGear[def.gear] += monthly;
      monthlyTotal += monthly;
    }
  }
  return {
    lines,
    byGear,
    monthlyTotal,
    annualTotal: monthlyTotal * 12,
    missingLines,
  };
}

export const COST_OF_FRICTION_REPORT_PLACEHOLDER =
  `No ${COST_OF_FRICTION_NAME} run has been reviewed and approved for ` +
  "inclusion in this report yet.";