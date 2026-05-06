/**
 * P85.4 — RGS Complexity Scale™
 *
 * Deterministic complexity tiering used to adjust required operating
 * controls/scoring weights so a small efficient business is not judged
 * like a multi-department company. Three tiers:
 *
 *   Tier 1 — Solo / Micro
 *   Tier 2 — Growth
 *   Tier 3 — Scaled / Multi-Role
 *
 * No AI. No subjective scoring. Pure functions only.
 * Client-facing copy avoids the word "Enterprise" — RGS uses
 * "Scaled / Multi-Role" instead.
 */

export type ComplexityTierKey = "tier_1_solo_micro" | "tier_2_growth" | "tier_3_scaled_multi_role";

export type ComplexityConfirmationStatus =
  | "detected"
  | "admin_confirmed"
  | "admin_overridden"
  | "client_needs_confirmation";

export interface ComplexityTierDefinition {
  tier_key: ComplexityTierKey;
  tier_label: string;
  scorecard_label: string;
  report_label: string;
  revenue_threshold: { min: number | null; max: number | null };
  headcount_threshold: { min: number | null; max: number | null };
  client_safe_description: string;
  admin_interpretation: string;
  required_question_adjustments: string[];
  exempted_question_keys: string[];
  redistributed_weight_rules: { from: string; to: string; reason: string }[];
  penalty_rules: {
    rule_key: string;
    description: string;
    deduction_points: number;
  }[];
  ready_to_scale_language: string;
}

export const RGS_COMPLEXITY_TIERS: Record<ComplexityTierKey, ComplexityTierDefinition> = {
  tier_1_solo_micro: {
    tier_key: "tier_1_solo_micro",
    tier_label: "Tier 1 — Solo / Micro",
    scorecard_label: "Solo / Micro",
    report_label: "Solo / Micro operation",
    revenue_threshold: { min: null, max: 250000 },
    headcount_threshold: { min: 1, max: 3 },
    client_safe_description:
      "Your business is being scored as a Solo / Micro operation, so RGS focuses on simple repeatability, cash visibility, lead tracking, and reducing owner dependence rather than requiring corporate layers.",
    admin_interpretation:
      "Small operation. Normalize enterprise-style cadence/handoff requirements. Hold owner accountable for basic repeatability, cash visibility, lead tracking, and documented owner-critical processes.",
    required_question_adjustments: [
      "exempt_management_cadence_enterprise",
      "exempt_handoff_sop_enterprise",
      "redistribute_to_owner_independence",
    ],
    exempted_question_keys: [
      "management_cadence_enterprise",
      "handoff_sop_enterprise",
      "departmental_decision_rights",
      "departmental_escalation_rules",
    ],
    redistributed_weight_rules: [
      { from: "management_cadence_enterprise", to: "owner_independence", reason: "Solo/Micro: weight basic owner-independence over enterprise cadence." },
      { from: "handoff_sop_enterprise", to: "documented_owner_critical_processes", reason: "Solo/Micro: weight owner-critical SOPs over multi-team handoff." },
    ],
    penalty_rules: [],
    ready_to_scale_language:
      "A strong score at Tier 1 signals the business is ready to scale, not that it needs corporate bureaucracy.",
  },
  tier_2_growth: {
    tier_key: "tier_2_growth",
    tier_label: "Tier 2 — Growth",
    scorecard_label: "Growth",
    report_label: "Growth operation",
    revenue_threshold: { min: 250000, max: 1000000 },
    headcount_threshold: { min: 4, max: 12 },
    client_safe_description:
      "Your business is being scored as a Growth operation, where repeatable processes, role clarity, lead reliability, and documentation coverage become more important.",
    admin_interpretation:
      "Standard weighting. Focus on documentation coverage, lead reliability, role clarity, repeatable processes, and owner bottleneck reduction.",
    required_question_adjustments: ["standard_weighting"],
    exempted_question_keys: [],
    redistributed_weight_rules: [],
    penalty_rules: [],
    ready_to_scale_language:
      "A strong score at Tier 2 signals the business is ready to scale into multi-role operations.",
  },
  tier_3_scaled_multi_role: {
    tier_key: "tier_3_scaled_multi_role",
    tier_label: "Tier 3 — Scaled / Multi-Role",
    scorecard_label: "Scaled / Multi-Role",
    report_label: "Scaled / Multi-Role operation",
    revenue_threshold: { min: 1000000, max: null },
    headcount_threshold: { min: 13, max: null },
    client_safe_description:
      "Your business is being scored as a Scaled / Multi-Role operation, where decision rights, escalation rules, management cadence, and handoff clarity carry more weight.",
    admin_interpretation:
      "Penalty multiplier for missing structural controls. Missing Departmental Decision Rights or Escalation Rules triggers a -20 Structural Risk deduction. Focus on decision rights, escalation rules, management cadence, departmental handoffs, evidence freshness, and owner-independent execution.",
    required_question_adjustments: [
      "require_departmental_decision_rights",
      "require_escalation_rules",
      "require_management_cadence",
      "require_handoff_clarity",
    ],
    exempted_question_keys: [],
    redistributed_weight_rules: [],
    penalty_rules: [
      {
        rule_key: "missing_departmental_decision_rights",
        description: "Missing Departmental Decision Rights triggers Structural Risk deduction.",
        deduction_points: 20,
      },
      {
        rule_key: "missing_escalation_rules",
        description: "Missing Escalation Rules triggers Structural Risk deduction.",
        deduction_points: 20,
      },
    ],
    ready_to_scale_language:
      "At Tier 3, structural controls (decision rights, escalation, cadence, handoff) are required to keep the system stable.",
  },
};

export const COMPLEXITY_TIER_LIST: ComplexityTierDefinition[] = [
  RGS_COMPLEXITY_TIERS.tier_1_solo_micro,
  RGS_COMPLEXITY_TIERS.tier_2_growth,
  RGS_COMPLEXITY_TIERS.tier_3_scaled_multi_role,
];

export function getComplexityTierDefinition(
  tier_key: ComplexityTierKey,
): ComplexityTierDefinition {
  return RGS_COMPLEXITY_TIERS[tier_key];
}

// ===== Detection =====

export interface ComplexityDetectionInput {
  annualRevenue?: number | null;
  headcount?: number | null;
}

export interface ComplexityDetectionResult {
  detected_tier: ComplexityTierKey;
  confirmation_status: ComplexityConfirmationStatus;
  detection_basis: string;
  input_annual_revenue: number | null;
  input_headcount: number | null;
  revenue_signal_tier: ComplexityTierKey | null;
  headcount_signal_tier: ComplexityTierKey | null;
  needs_confirmation: boolean;
}

export function normalizeComplexityInputs(
  input: ComplexityDetectionInput,
): { annualRevenue: number | null; headcount: number | null } {
  const r =
    input.annualRevenue !== undefined &&
    input.annualRevenue !== null &&
    Number.isFinite(input.annualRevenue) &&
    (input.annualRevenue as number) >= 0
      ? (input.annualRevenue as number)
      : null;
  const h =
    input.headcount !== undefined &&
    input.headcount !== null &&
    Number.isFinite(input.headcount) &&
    (input.headcount as number) >= 0
      ? Math.floor(input.headcount as number)
      : null;
  return { annualRevenue: r, headcount: h };
}

function tierFromRevenue(revenue: number | null): ComplexityTierKey | null {
  if (revenue === null) return null;
  if (revenue > 1_000_000) return "tier_3_scaled_multi_role";
  if (revenue >= 250_000) return "tier_2_growth";
  return "tier_1_solo_micro";
}

function tierFromHeadcount(headcount: number | null): ComplexityTierKey | null {
  if (headcount === null) return null;
  if (headcount >= 13) return "tier_3_scaled_multi_role";
  if (headcount >= 4) return "tier_2_growth";
  if (headcount >= 1) return "tier_1_solo_micro";
  return null;
}

const TIER_RANK: Record<ComplexityTierKey, number> = {
  tier_1_solo_micro: 1,
  tier_2_growth: 2,
  tier_3_scaled_multi_role: 3,
};

/**
 * Deterministic complexity tier detection.
 * - Higher-tier signal wins when revenue and headcount disagree.
 * - Missing both inputs defaults to Tier 2 Growth with needs_confirmation.
 */
export function detectComplexityTier(
  input: ComplexityDetectionInput,
): ComplexityDetectionResult {
  const { annualRevenue, headcount } = normalizeComplexityInputs(input);

  if (annualRevenue === null && headcount === null) {
    return {
      detected_tier: "tier_2_growth",
      confirmation_status: "client_needs_confirmation",
      detection_basis: "default_growth_no_inputs",
      input_annual_revenue: null,
      input_headcount: null,
      revenue_signal_tier: null,
      headcount_signal_tier: null,
      needs_confirmation: true,
    };
  }

  const revTier = tierFromRevenue(annualRevenue);
  const hcTier = tierFromHeadcount(headcount);

  let detected: ComplexityTierKey = "tier_1_solo_micro";
  if (revTier && hcTier) {
    detected = TIER_RANK[revTier] >= TIER_RANK[hcTier] ? revTier : hcTier;
  } else if (revTier) {
    detected = revTier;
  } else if (hcTier) {
    detected = hcTier;
  }

  let basis = "single_signal";
  if (revTier && hcTier) {
    basis = revTier === hcTier ? "revenue_and_headcount_agree" : "higher_tier_signal_wins";
  } else if (revTier) basis = "revenue_only";
  else if (hcTier) basis = "headcount_only";

  return {
    detected_tier: detected,
    confirmation_status: "detected",
    detection_basis: basis,
    input_annual_revenue: annualRevenue,
    input_headcount: headcount,
    revenue_signal_tier: revTier,
    headcount_signal_tier: hcTier,
    needs_confirmation: false,
  };
}

export function explainComplexityTier(tier: ComplexityTierKey): string {
  return RGS_COMPLEXITY_TIERS[tier].client_safe_description;
}

// ===== Complexity-adjusted scoring helpers =====

export interface ComplexityAdjustmentControlState {
  /** Question key from scorecard (e.g. "departmental_decision_rights"). */
  question_key: string;
  /** Whether the control is present/satisfied per existing deterministic scoring. */
  satisfied: boolean;
}

export interface ComplexityAdjustmentInput {
  tier: ComplexityTierKey;
  controls: ComplexityAdjustmentControlState[];
}

export interface ComplexityAdjustmentResult {
  tier: ComplexityTierKey;
  exempted_controls: string[];
  redistributed_to: { from: string; to: string; reason: string }[];
  structural_risk_deductions: { rule_key: string; deduction_points: number; description: string }[];
  total_structural_risk_deduction: number;
  adjustment_summary: string;
  uses_ai: false;
}

/**
 * Deterministic complexity-adjusted scoring helper.
 *
 * - Tier 1: marks enterprise-style controls as exempted (N/A — complexity
 *   adjusted) and surfaces redistribution targets. Does not auto-grant credit.
 * - Tier 2: standard weighting passthrough.
 * - Tier 3: emits a -20 Structural Risk deduction for each unsatisfied
 *   penalty rule (missing decision rights / escalation rules).
 *
 * NO AI. Pure function.
 */
export function applyComplexityAdjustedScoring(
  input: ComplexityAdjustmentInput,
): ComplexityAdjustmentResult {
  const def = RGS_COMPLEXITY_TIERS[input.tier];
  const satisfiedMap = new Map(input.controls.map((c) => [c.question_key, c.satisfied]));

  const exempted_controls = [...def.exempted_question_keys];
  const redistributed_to = def.redistributed_weight_rules.map((r) => ({ ...r }));

  const structural_risk_deductions: ComplexityAdjustmentResult["structural_risk_deductions"] = [];
  if (input.tier === "tier_3_scaled_multi_role") {
    for (const rule of def.penalty_rules) {
      // map rule_key -> question_key
      const qkey =
        rule.rule_key === "missing_departmental_decision_rights"
          ? "departmental_decision_rights"
          : rule.rule_key === "missing_escalation_rules"
            ? "departmental_escalation_rules"
            : rule.rule_key;
      const satisfied = satisfiedMap.get(qkey);
      if (satisfied !== true) {
        structural_risk_deductions.push({
          rule_key: rule.rule_key,
          deduction_points: rule.deduction_points,
          description: rule.description,
        });
      }
    }
  }

  const total = structural_risk_deductions.reduce((s, d) => s + d.deduction_points, 0);

  let summary = "";
  if (input.tier === "tier_1_solo_micro") {
    summary =
      "Solo / Micro: enterprise-style cadence and handoff requirements normalized as N/A — complexity adjusted. Weight redistributed toward Owner Independence and owner-critical documentation.";
  } else if (input.tier === "tier_2_growth") {
    summary = "Growth: standard weighting. No exemptions.";
  } else {
    summary =
      structural_risk_deductions.length > 0
        ? `Scaled / Multi-Role: -${total} Structural Risk deduction for missing structural controls.`
        : "Scaled / Multi-Role: structural controls satisfied. No Structural Risk deduction.";
  }

  return {
    tier: input.tier,
    exempted_controls,
    redistributed_to,
    structural_risk_deductions,
    total_structural_risk_deduction: total,
    adjustment_summary: summary,
    uses_ai: false,
  };
}

// ===== Report-safe language =====

export const RGS_COMPLEXITY_SCALE_REPORT_SAFE_LANGUAGE =
  "RGS Complexity Scale™ adjusts which operating controls are expected at the current size and structure of the business. " +
  "It is an operational lens only — not a business value opinion, financing or lending opinion, regulatory determination, or assurance of business results.";

export const RGS_COMPLEXITY_SCALE_CLIENT_SAFE_INTRO =
  "Your score is adjusted to the complexity of your business. A smaller business is not expected to have corporate layers, but it still needs clear ownership, cash visibility, lead tracking, and repeatable core processes.";

/**
 * Phrases that must NEVER appear in a client-facing Complexity Scale
 * explanation. Operational-readiness language only.
 */
export const COMPLEXITY_SCALE_FORBIDDEN_CLIENT_PHRASES: readonly string[] = [
  "valuation",
  "appraisal",
  "lender ready",
  "investor ready",
  "investment grade",
  "audit ready",
  "audit guaranteed",
  "tax advice",
  "legal advice",
  "accounting advice",
  "compliance certification",
  "compliance certified",
  "regulatory assurance",
  "guaranteed",
];

export function findComplexityForbiddenPhrase(text: string): string | null {
  if (!text) return null;
  const lower = text.toLowerCase();
  for (const p of COMPLEXITY_SCALE_FORBIDDEN_CLIENT_PHRASES) {
    if (lower.includes(p.toLowerCase())) return p;
  }
  return null;
}