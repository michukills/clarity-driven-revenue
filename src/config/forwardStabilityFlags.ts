/**
 * P85.3 — Forward Stability Flags™ (deterministic catalog)
 *
 * Forward-looking risks that can weaken the system soon, even when the
 * business looks stable today. RGS surfaces these as operational review
 * triggers — never as legal, tax, accounting, compliance, valuation,
 * lending, or investment conclusions.
 */

export type ForwardFlagGearKey =
  | "demand_generation"
  | "revenue_conversion"
  | "operational_efficiency"
  | "financial_visibility"
  | "owner_independence";

export type ForwardFlagSeverity =
  | "low"
  | "medium"
  | "high"
  | "severe"
  | "critical";

export type ForwardFlagTriggerType =
  | "deterministic"
  | "manual_admin"
  | "admin_observation"
  | "imported_system_data";

export type ForwardFlagScoringImpact =
  | "none"
  | "needs_reinspection"
  | "gear_high_risk"
  | "gear_severe_risk"
  | "gear_critical_risk"
  | "score_penalty";

export interface ForwardStabilityFlagDefinition {
  flag_key: string;
  label: string;
  gear_key: ForwardFlagGearKey;
  category: string;
  trigger_type: ForwardFlagTriggerType;
  threshold?: string;
  severity: ForwardFlagSeverity;
  scoring_impact_type: ForwardFlagScoringImpact;
  deterministic_trigger_description: string;
  client_safe_explanation: string;
  admin_interpretation: string;
  needs_reinspection: boolean;
  recommended_admin_review_action: string;
  forbidden_claims: string[];
  external_risk?: boolean;
}

const STD_FORBIDDEN = [
  "legal compliance",
  "tax compliance",
  "accounting compliance",
  "regulatory assurance",
  "audit ready",
  "lender ready",
  "investor ready",
  "valuation",
  "guaranteed",
  "guaranteed cliff",
  "False Green Trap",
];

export const FORWARD_STABILITY_FLAGS: ForwardStabilityFlagDefinition[] = [
  {
    flag_key: "revenue_concentration_risk",
    label: "Revenue Concentration Risk™",
    gear_key: "revenue_conversion",
    category: "concentration",
    trigger_type: "deterministic",
    threshold: ">20% from a single source",
    severity: "high",
    scoring_impact_type: "gear_high_risk",
    deterministic_trigger_description:
      "One revenue source > 20% of total revenue triggers high; > 35% severe; > 50% critical.",
    client_safe_explanation:
      "This creates structural revenue risk even when the current sales process looks organized.",
    admin_interpretation:
      "Single source dependency. Review concentration share, diversify pipeline, document owner action plan.",
    needs_reinspection: true,
    recommended_admin_review_action:
      "Review concentration share and confirm with owner. Approve client visibility if appropriate.",
    forbidden_claims: STD_FORBIDDEN,
  },
  {
    flag_key: "customer_concentration_risk",
    label: "Customer Concentration Risk",
    gear_key: "revenue_conversion",
    category: "concentration",
    trigger_type: "deterministic",
    threshold: ">20% from a single customer",
    severity: "high",
    scoring_impact_type: "gear_high_risk",
    deterministic_trigger_description:
      "Single customer share of revenue > 20%.",
    client_safe_explanation:
      "One customer represents an outsized share of revenue. RGS flags this for forward review.",
    admin_interpretation: "Customer dependence. Review retention risk and pipeline coverage.",
    needs_reinspection: true,
    recommended_admin_review_action:
      "Confirm customer share and review retention/pipeline coverage with owner.",
    forbidden_claims: STD_FORBIDDEN,
  },
  {
    flag_key: "channel_concentration_risk",
    label: "Channel Concentration Risk",
    gear_key: "demand_generation",
    category: "concentration",
    trigger_type: "deterministic",
    threshold: ">20% from a single channel",
    severity: "high",
    scoring_impact_type: "gear_high_risk",
    deterministic_trigger_description: "Single channel share of revenue > 20%.",
    client_safe_explanation:
      "One channel carries an outsized share of revenue. RGS flags this for forward review.",
    admin_interpretation:
      "Channel dependence. Review marketing diversification.",
    needs_reinspection: true,
    recommended_admin_review_action:
      "Confirm channel share and review diversification plan with owner.",
    forbidden_claims: STD_FORBIDDEN,
  },
  {
    flag_key: "expiring_major_contract",
    label: "Expiring Major Contract",
    gear_key: "revenue_conversion",
    category: "contract_risk",
    trigger_type: "manual_admin",
    severity: "high",
    scoring_impact_type: "needs_reinspection",
    deterministic_trigger_description:
      "Admin-entered expiring major contract or renewal date within review window.",
    client_safe_explanation:
      "A major contract is approaching renewal or expiration. RGS flags this for forward review.",
    admin_interpretation:
      "Material contract event. Confirm renewal posture and revenue exposure.",
    needs_reinspection: true,
    recommended_admin_review_action:
      "Add admin note with contract reference and renewal window.",
    forbidden_claims: STD_FORBIDDEN,
  },
  {
    flag_key: "major_vendor_dependency",
    label: "Major Vendor Dependency",
    gear_key: "operational_efficiency",
    category: "dependency",
    trigger_type: "manual_admin",
    severity: "high",
    scoring_impact_type: "needs_reinspection",
    deterministic_trigger_description:
      "Admin-entered single-vendor dependency for a critical input.",
    client_safe_explanation:
      "Operations depend heavily on a single vendor. RGS flags this for forward review.",
    admin_interpretation: "Single-vendor risk for critical input. Review backup options.",
    needs_reinspection: true,
    recommended_admin_review_action: "Document vendor and backup plan.",
    forbidden_claims: STD_FORBIDDEN,
  },
  {
    flag_key: "key_employee_dependency",
    label: "Key Employee Dependency",
    gear_key: "owner_independence",
    category: "dependency",
    trigger_type: "manual_admin",
    severity: "high",
    scoring_impact_type: "needs_reinspection",
    deterministic_trigger_description:
      "Admin-entered single-person dependency for a business-critical role.",
    client_safe_explanation:
      "A single person carries a business-critical role. RGS flags this for forward review.",
    admin_interpretation:
      "Key person risk. Review cross-training, documentation, and SOP coverage.",
    needs_reinspection: true,
    recommended_admin_review_action:
      "Note role, individual reference, and SOP gap.",
    forbidden_claims: STD_FORBIDDEN,
  },
  {
    flag_key: "upcoming_tax_liability",
    label: "Upcoming Tax Liability",
    gear_key: "financial_visibility",
    category: "financial_event",
    trigger_type: "manual_admin",
    severity: "high",
    scoring_impact_type: "needs_reinspection",
    deterministic_trigger_description:
      "Admin-entered upcoming tax liability not currently reflected in cash position.",
    client_safe_explanation:
      "An upcoming tax obligation may affect cash position. RGS flags this for forward review. This is operational visibility, not tax advice.",
    admin_interpretation:
      "Forward cash event. Review owner awareness and cash plan.",
    needs_reinspection: true,
    recommended_admin_review_action:
      "Note approximate amount and timing. Recommend qualified tax professional review.",
    forbidden_claims: STD_FORBIDDEN,
  },
  {
    flag_key: "large_ar_concentration",
    label: "Large AR Concentration",
    gear_key: "financial_visibility",
    category: "concentration",
    trigger_type: "deterministic",
    threshold: ">20% AR from a single customer",
    severity: "high",
    scoring_impact_type: "gear_high_risk",
    deterministic_trigger_description:
      "Single-customer share of accounts receivable > 20%.",
    client_safe_explanation:
      "A single customer represents an outsized share of receivables. RGS flags this for forward review.",
    admin_interpretation: "AR concentration risk. Review collections posture.",
    needs_reinspection: true,
    recommended_admin_review_action:
      "Confirm AR aging and collection plan with owner.",
    forbidden_claims: STD_FORBIDDEN,
  },
  {
    flag_key: "cash_runway_deterioration",
    label: "Cash Runway Deterioration",
    gear_key: "financial_visibility",
    category: "financial_trend",
    trigger_type: "manual_admin",
    severity: "severe",
    scoring_impact_type: "gear_severe_risk",
    deterministic_trigger_description:
      "Admin-entered runway trend showing material deterioration vs. prior period.",
    client_safe_explanation:
      "Cash runway visibility shows deterioration vs. prior period. RGS flags this for forward review.",
    admin_interpretation:
      "Runway trend pressure. Review with qualified accounting professional where appropriate.",
    needs_reinspection: true,
    recommended_admin_review_action:
      "Document basis and recommend professional review.",
    forbidden_claims: STD_FORBIDDEN,
  },
  {
    flag_key: "upcoming_license_renewal_deadline",
    label: "Upcoming License / Renewal / Documentation Deadline",
    gear_key: "operational_efficiency",
    category: "deadline",
    trigger_type: "manual_admin",
    severity: "high",
    scoring_impact_type: "needs_reinspection",
    deterministic_trigger_description:
      "Admin-entered upcoming license, permit, renewal, or documentation deadline.",
    client_safe_explanation:
      "A renewal or documentation deadline is approaching. RGS flags this for operational review. This is not legal or compliance certification.",
    admin_interpretation:
      "Operational readiness deadline. Confirm owner awareness and documentation status.",
    needs_reinspection: true,
    recommended_admin_review_action:
      "Note the deadline and document evidence reference. Recommend qualified professional review where applicable.",
    forbidden_claims: STD_FORBIDDEN,
    external_risk: true,
  },
  {
    flag_key: "major_market_shock",
    label: "Major Market Shock",
    gear_key: "demand_generation",
    category: "external_event",
    trigger_type: "manual_admin",
    severity: "high",
    scoring_impact_type: "needs_reinspection",
    deterministic_trigger_description:
      "Admin-entered material change in local or industry market conditions.",
    client_safe_explanation:
      "A material market change may affect demand. RGS flags this for forward review.",
    admin_interpretation: "External market signal. Review demand exposure.",
    needs_reinspection: true,
    recommended_admin_review_action: "Document source description.",
    forbidden_claims: STD_FORBIDDEN,
    external_risk: true,
  },
  {
    flag_key: "major_local_competitor_change",
    label: "Major Local Competitor Change",
    gear_key: "demand_generation",
    category: "external_event",
    trigger_type: "manual_admin",
    severity: "medium",
    scoring_impact_type: "needs_reinspection",
    deterministic_trigger_description:
      "Admin-entered material new local competitor or local competitor change.",
    client_safe_explanation:
      "A material local competitor change may affect demand. RGS flags this for forward review.",
    admin_interpretation: "Local competitive shift. Review positioning.",
    needs_reinspection: true,
    recommended_admin_review_action: "Document source description.",
    forbidden_claims: STD_FORBIDDEN,
    external_risk: true,
  },
  {
    flag_key: "platform_or_ad_rule_change",
    label: "Platform / Ad Rule Change",
    gear_key: "demand_generation",
    category: "external_event",
    trigger_type: "manual_admin",
    severity: "medium",
    scoring_impact_type: "needs_reinspection",
    deterministic_trigger_description:
      "Admin-entered platform/ad rule change affecting demand channel.",
    client_safe_explanation:
      "A platform or ad rule change may affect a demand channel. RGS flags this for forward review.",
    admin_interpretation: "External platform shift. Review channel exposure.",
    needs_reinspection: true,
    recommended_admin_review_action: "Document source description.",
    forbidden_claims: STD_FORBIDDEN,
    external_risk: true,
  },
  {
    flag_key: "supplier_disruption",
    label: "Supplier Disruption",
    gear_key: "operational_efficiency",
    category: "external_event",
    trigger_type: "manual_admin",
    severity: "high",
    scoring_impact_type: "needs_reinspection",
    deterministic_trigger_description:
      "Admin-entered supplier disruption affecting operations.",
    client_safe_explanation:
      "A supplier disruption may affect operations. RGS flags this for forward review.",
    admin_interpretation: "Operational input risk. Review backup posture.",
    needs_reinspection: true,
    recommended_admin_review_action: "Document supplier and disruption description.",
    forbidden_claims: STD_FORBIDDEN,
    external_risk: true,
  },
];

export const FORWARD_STABILITY_FLAGS_BY_KEY = new Map(
  FORWARD_STABILITY_FLAGS.map((f) => [f.flag_key, f]),
);

export function getForwardFlagDefinition(
  flag_key: string,
): ForwardStabilityFlagDefinition | null {
  return FORWARD_STABILITY_FLAGS_BY_KEY.get(flag_key) ?? null;
}

/**
 * Phrases that must NEVER appear in a client-facing Forward Stability Flag™
 * explanation. Operational-readiness language only.
 */
export const FORWARD_FLAG_FORBIDDEN_CLIENT_PHRASES: readonly string[] = [
  "guaranteed",
  "guaranteed cliff",
  "your business will fail",
  "valuation",
  "lender ready",
  "investor ready",
  "investment grade",
  "audit guaranteed",
  "tax advice",
  "legal advice",
  "accounting advice",
  "compliance certification",
  "compliance certified",
  "regulatory assurance",
  "False Green Trap",
];

export function findForwardFlagForbiddenPhrase(text: string): string | null {
  if (!text) return null;
  const lower = text.toLowerCase();
  for (const p of FORWARD_FLAG_FORBIDDEN_CLIENT_PHRASES) {
    if (lower.includes(p.toLowerCase())) return p;
  }
  return null;
}

// ===== Revenue Concentration Risk™ deterministic helpers =====

export const REVENUE_CONCENTRATION_HIGH_PCT = 20;
export const REVENUE_CONCENTRATION_SEVERE_PCT = 35;
export const REVENUE_CONCENTRATION_CRITICAL_PCT = 50;

export type RevenueSourceType =
  | "client_claim"
  | "verified_evidence"
  | "imported_system_data"
  | "admin_observation"
  | "admin_interview_confirmation";

export interface RevenueSourceInput {
  customer_id?: string;
  source_label: string;
  amount: number;
  source_type: RevenueSourceType;
  evidence_id?: string | null;
  period_start?: string;
  period_end?: string;
}

export interface RevenueConcentrationShare {
  source_label: string;
  amount: number;
  share_pct: number;
}

/**
 * Returns share % per source label, sorted descending. Negative or zero
 * total revenue returns an empty array (no determination possible).
 */
export function calculateRevenueConcentrationShare(
  revenueSources: RevenueSourceInput[],
): RevenueConcentrationShare[] {
  if (!revenueSources || revenueSources.length === 0) return [];
  const total = revenueSources.reduce(
    (s, r) => s + (Number.isFinite(r.amount) ? r.amount : 0),
    0,
  );
  if (total <= 0) return [];
  // Aggregate by source_label
  const agg = new Map<string, number>();
  for (const r of revenueSources) {
    const amt = Number.isFinite(r.amount) ? r.amount : 0;
    agg.set(r.source_label, (agg.get(r.source_label) ?? 0) + amt);
  }
  return [...agg.entries()]
    .map(([source_label, amount]) => ({
      source_label,
      amount,
      share_pct: (amount / total) * 100,
    }))
    .sort((a, b) => b.share_pct - a.share_pct);
}

export interface RevenueConcentrationRiskResult {
  triggered: boolean;
  top_share: RevenueConcentrationShare | null;
  severity: ForwardFlagSeverity | null;
  scoring_impact_type: ForwardFlagScoringImpact;
  client_safe_explanation: string;
}

/**
 * Deterministic Revenue Concentration Risk™.
 * Strictly > 20% triggers. Exactly 20% does NOT trigger.
 * > 35% escalates to severe. > 50% escalates to critical.
 * Pure function. No AI.
 */
export function detectRevenueConcentrationRisk(input: {
  revenueSources: RevenueSourceInput[];
}): RevenueConcentrationRiskResult {
  const shares = calculateRevenueConcentrationShare(input.revenueSources);
  const top = shares[0] ?? null;
  if (!top || top.share_pct <= REVENUE_CONCENTRATION_HIGH_PCT) {
    return {
      triggered: false,
      top_share: top,
      severity: null,
      scoring_impact_type: "none",
      client_safe_explanation: "",
    };
  }
  let severity: ForwardFlagSeverity = "high";
  let scoring_impact_type: ForwardFlagScoringImpact = "gear_high_risk";
  if (top.share_pct > REVENUE_CONCENTRATION_CRITICAL_PCT) {
    severity = "critical";
    scoring_impact_type = "gear_critical_risk";
  } else if (top.share_pct > REVENUE_CONCENTRATION_SEVERE_PCT) {
    severity = "severe";
    scoring_impact_type = "gear_severe_risk";
  }
  return {
    triggered: true,
    top_share: top,
    severity,
    scoring_impact_type,
    client_safe_explanation:
      "This creates structural revenue risk even when the current sales process looks organized.",
  };
}

export const FORWARD_STABILITY_FLAGS_REPORT_SAFE_LANGUAGE =
  "Forward Stability Flags™ identify known conditions that may require re-inspection. " +
  "They are operational review signals, not predictions, guarantees, compliance determinations, " +
  "valuation opinions, or financial advice.";
