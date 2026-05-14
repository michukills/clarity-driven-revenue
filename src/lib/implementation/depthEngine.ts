/**
 * P93E-E2F — Implementation Depth Engine.
 *
 * Deterministic, additive engine that turns Diagnostic findings + the
 * Industry Diagnostic Depth Matrix + the Industry Implementation
 * Sequencing into a premium prioritized implementation plan with:
 *
 *   - Recommendations (industry-aware, evidence-aware, dependency-aware)
 *   - Operational forecasting (risk-focused, never outcome-guaranteed)
 *   - Prioritization (multi-factor)
 *   - Dependency mapping
 *   - Control System continuation value
 *   - Admin vs. client visibility separation
 *
 * Score remains v3-deterministic. AI may assist at draft time outside this
 * module, but cannot move score and cannot bypass admin approval for
 * client-visible content.
 */

import {
  INDUSTRY_DIAGNOSTIC_DEPTH_MATRIX,
  MATRIX_GEAR_KEYS,
  type DiagnosticDepthCell,
  type MatrixGearKey,
  type MatrixIndustryKey,
  type RubricState,
} from "@/config/industryDiagnosticDepthMatrix";
import {
  getIndustrySequence,
  type ImplementationSequenceStep,
} from "@/config/industryImplementationSequencing";

/* ---------- Types ---------- */

export type EvidenceConfidence = "low" | "medium" | "high";
export type ImplementationDifficulty = "easy" | "medium" | "hard";
export type OwnerInvolvementLevel = "low" | "medium" | "high";
export type PriorityLevel = "critical" | "high" | "medium" | "low";

export interface DiagnosticFinding {
  /** Industry context the finding sits in. */
  industry: MatrixIndustryKey;
  /** Which RGS gear this finding belongs to. */
  gear: MatrixGearKey;
  /** Classified rubric state for this gear (deterministic; v3). */
  rubric_state: RubricState;
  /** Evidence confidence, derived deterministically upstream. */
  evidence_confidence: EvidenceConfidence;
  /** True if the diagnostic surfaced a contradiction (claim vs. evidence). */
  contradiction_flagged: boolean;
  /** True if the diagnostic flagged a "looks healthy" trap. */
  false_green_flagged: boolean;
}

export interface ImplementationRecommendation {
  /** Stable id; deterministic for the same finding. */
  id: string;
  industry: MatrixIndustryKey;
  gear: MatrixGearKey;
  title: string;
  problem_being_solved: string;
  evidence_basis: string;
  evidence_confidence: EvidenceConfidence;
  severity: PriorityLevel;
  /** Multi-factor priority score (higher = sooner). */
  priority_score: number;
  priority_level: PriorityLevel;
  sequence_number: number;
  dependency_order: number;
  prerequisite_step_numbers: ReadonlyArray<number>;
  unblocks: ReadonlyArray<string>;
  do_not_do_yet: ReadonlyArray<string>;
  implementation_difficulty: ImplementationDifficulty;
  owner_involvement_required: OwnerInvolvementLevel;
  owner_bottleneck_reduced: string;
  expected_control_lift: string;
  risk_if_ignored: string;
  first_three_actions: ReadonlyArray<string>;
  required_evidence: ReadonlyArray<string>;
  success_indicators: ReadonlyArray<string>;
  leading_indicators: ReadonlyArray<string>;
  control_system_monitoring: ReadonlyArray<string>;
  client_safe_explanation: string;
  admin_only_note: string;
  /** True if AI was used to assist drafting (always false at this layer). */
  ai_assisted: boolean;
  /** True until an admin approves it for client display. */
  admin_approval_required: boolean;
}

export interface OperationalForecast {
  industry: MatrixIndustryKey;
  gear: MatrixGearKey;
  /** Operational risk if the recommendation is deferred. Never outcome-guaranteed. */
  visibility_risk: PriorityLevel;
  owner_dependence_risk: PriorityLevel;
  capacity_drag_risk: PriorityLevel;
  evidence_freshness_risk: PriorityLevel;
  score_stability_risk: PriorityLevel;
  expected_control_improvement: "small" | "moderate" | "meaningful";
  leading_indicators_to_watch: ReadonlyArray<string>;
  /** Calm, non-promissory language. */
  forecast_summary: string;
}

export interface ImplementationPlan {
  industry: MatrixIndustryKey;
  recommendations: ReadonlyArray<ImplementationRecommendation>;
  forecasts: ReadonlyArray<OperationalForecast>;
  /** Deterministic ordered repair sequence. */
  repair_sequence: ReadonlyArray<{
    sequence_number: number;
    title: string;
    why_first: string;
    do_not_do_yet: ReadonlyArray<string>;
  }>;
  /** Items the owner should defer right now. */
  deferred: ReadonlyArray<string>;
  /** Control System continuation: what stays watched after install. */
  control_system_monitoring_plan: ReadonlyArray<string>;
  /** Scope boundary the client must understand. */
  scope_boundary_notice: string;
}

/* ---------- Deterministic helpers ---------- */

const RUBRIC_SEVERITY: Record<RubricState, PriorityLevel> = {
  absent_or_unknown: "critical",
  informal_or_owner_in_head: "high",
  documented_but_inconsistent: "medium",
  tracked_with_review: "low",
  tracked_reviewed_and_evidence_supported: "low",
};

const SEVERITY_WEIGHT: Record<PriorityLevel, number> = {
  critical: 40,
  high: 28,
  medium: 16,
  low: 8,
};

const CONFIDENCE_WEIGHT: Record<EvidenceConfidence, number> = {
  high: 12,
  medium: 6,
  low: 0,
};

function difficultyFor(state: RubricState): ImplementationDifficulty {
  switch (state) {
    case "absent_or_unknown":
      return "hard";
    case "informal_or_owner_in_head":
      return "medium";
    case "documented_but_inconsistent":
      return "medium";
    default:
      return "easy";
  }
}

function ownerInvolvementFor(gear: MatrixGearKey, state: RubricState): OwnerInvolvementLevel {
  if (state === "absent_or_unknown") return "high";
  if (gear === "owner_independence") return "high";
  if (state === "informal_or_owner_in_head") return "high";
  if (state === "documented_but_inconsistent") return "medium";
  return "low";
}

function expectedControlLiftFor(state: RubricState): "small" | "moderate" | "meaningful" {
  if (state === "absent_or_unknown") return "meaningful";
  if (state === "informal_or_owner_in_head") return "meaningful";
  if (state === "documented_but_inconsistent") return "moderate";
  return "small";
}

function riskBandFor(state: RubricState, contradiction: boolean): PriorityLevel {
  if (state === "absent_or_unknown" || contradiction) return "critical";
  if (state === "informal_or_owner_in_head") return "high";
  if (state === "documented_but_inconsistent") return "medium";
  return "low";
}

const GEAR_URGENCY_BIAS: Record<MatrixGearKey, number> = {
  financial_visibility: 6,
  operational_efficiency: 4,
  revenue_conversion: 3,
  demand_generation: 2,
  owner_independence: 5,
};

/* ---------- Industry-specific gear-to-step mapping ---------- */

const GEAR_TO_STEP_NUMBER: Record<MatrixIndustryKey, Record<MatrixGearKey, number>> = {
  trades_home_services: {
    demand_generation: 1,
    revenue_conversion: 1,
    operational_efficiency: 2,
    financial_visibility: 4,
    owner_independence: 5,
  },
  restaurant_food_service: {
    demand_generation: 4,
    revenue_conversion: 4,
    operational_efficiency: 3,
    financial_visibility: 1,
    owner_independence: 5,
  },
  retail: {
    demand_generation: 4,
    revenue_conversion: 4,
    operational_efficiency: 3,
    financial_visibility: 1,
    owner_independence: 5,
  },
  professional_services: {
    demand_generation: 1,
    revenue_conversion: 2,
    operational_efficiency: 3,
    financial_visibility: 4,
    owner_independence: 5,
  },
  ecommerce_online_retail: {
    demand_generation: 5,
    revenue_conversion: 3,
    operational_efficiency: 4,
    financial_visibility: 1,
    owner_independence: 5,
  },
  cannabis_mmj_dispensary: {
    demand_generation: 4,
    revenue_conversion: 4,
    operational_efficiency: 2,
    financial_visibility: 3,
    owner_independence: 5,
  },
  general_service_other: {
    demand_generation: 1,
    revenue_conversion: 2,
    operational_efficiency: 3,
    financial_visibility: 4,
    owner_independence: 5,
  },
};

function findStep(industry: MatrixIndustryKey, gear: MatrixGearKey): ImplementationSequenceStep {
  const seq = getIndustrySequence(industry);
  const target = GEAR_TO_STEP_NUMBER[industry][gear];
  return seq.find((s) => s.step_number === target) ?? seq[0];
}

/* ---------- Forecast ---------- */

export function buildOperationalForecast(finding: DiagnosticFinding): OperationalForecast {
  const visibility = riskBandFor(finding.rubric_state, finding.contradiction_flagged);
  const ownerDep = ownerInvolvementFor(finding.gear, finding.rubric_state) === "high"
    ? "high"
    : finding.rubric_state === "documented_but_inconsistent"
    ? "medium"
    : "low";
  const capacity = finding.gear === "operational_efficiency" || finding.gear === "owner_independence"
    ? riskBandFor(finding.rubric_state, finding.contradiction_flagged)
    : finding.rubric_state === "absent_or_unknown"
    ? "high"
    : "medium";
  const evidence: PriorityLevel =
    finding.evidence_confidence === "low" ? "high" : finding.evidence_confidence === "medium" ? "medium" : "low";
  const score: PriorityLevel = finding.contradiction_flagged
    ? "high"
    : finding.rubric_state === "tracked_reviewed_and_evidence_supported"
    ? "low"
    : "medium";
  const lift = expectedControlLiftFor(finding.rubric_state);
  const step = findStep(finding.industry, finding.gear);
  return {
    industry: finding.industry,
    gear: finding.gear,
    visibility_risk: visibility,
    owner_dependence_risk: ownerDep as PriorityLevel,
    capacity_drag_risk: capacity as PriorityLevel,
    evidence_freshness_risk: evidence,
    score_stability_risk: score,
    expected_control_improvement: lift,
    leading_indicators_to_watch: step.leading_indicators,
    forecast_summary:
      "If this remains unresolved, RGS would expect increased visibility risk, owner dependence, and capacity drag in this gear. RGS does not predict revenue, profit, valuation, or compliance outcomes.",
  };
}

/* ---------- Recommendation ---------- */

export function buildRecommendation(
  finding: DiagnosticFinding,
  cell: DiagnosticDepthCell,
  step: ImplementationSequenceStep,
): ImplementationRecommendation {
  const severity = RUBRIC_SEVERITY[finding.rubric_state];
  const evidenceWeight = CONFIDENCE_WEIGHT[finding.evidence_confidence];
  const contradictionBoost = finding.contradiction_flagged ? 12 : 0;
  const falseGreenBoost = finding.false_green_flagged ? 8 : 0;
  const dependencyBoost = step.prerequisite_step_numbers.length === 0 ? 10 : 0;
  const gearBias = GEAR_URGENCY_BIAS[finding.gear];
  const priorityScore =
    SEVERITY_WEIGHT[severity] +
    evidenceWeight +
    contradictionBoost +
    falseGreenBoost +
    dependencyBoost +
    gearBias;

  const priorityLevel: PriorityLevel =
    priorityScore >= 70 ? "critical" : priorityScore >= 50 ? "high" : priorityScore >= 30 ? "medium" : "low";

  return {
    id: `rec_${finding.industry}_${finding.gear}`,
    industry: finding.industry,
    gear: finding.gear,
    title: step.title,
    problem_being_solved: cell.failure_pattern,
    evidence_basis: cell.evidence_prompts.join("; "),
    evidence_confidence: finding.evidence_confidence,
    severity,
    priority_score: priorityScore,
    priority_level: priorityLevel,
    sequence_number: step.step_number,
    dependency_order: step.prerequisite_step_numbers.length,
    prerequisite_step_numbers: step.prerequisite_step_numbers,
    unblocks: step.unblocks,
    do_not_do_yet: step.do_not_do_yet,
    implementation_difficulty: difficultyFor(finding.rubric_state),
    owner_involvement_required: ownerInvolvementFor(finding.gear, finding.rubric_state),
    owner_bottleneck_reduced: step.owner_bottleneck_reduced,
    expected_control_lift:
      "RGS would expect a " +
      expectedControlLiftFor(finding.rubric_state) +
      " improvement in operational control and visibility for this gear. RGS does not promise revenue, profit, growth, valuation, or compliance outcomes.",
    risk_if_ignored:
      "If deferred, RGS would expect rising visibility risk, owner dependence, and capacity drag in this gear. RGS does not predict outcomes.",
    first_three_actions: [
      `Confirm the current state of: ${cell.process}.`,
      `Stage the evidence required: ${cell.evidence_prompts.slice(0, 2).join(" and ")}.`,
      `Install the operating step: ${step.title}.`,
    ],
    required_evidence: cell.evidence_prompts,
    success_indicators: [
      `Recurring review of: ${cell.kpi}.`,
      `Reduced owner intervention on: ${step.owner_bottleneck_reduced}.`,
    ],
    leading_indicators: step.leading_indicators,
    control_system_monitoring: [
      `Watch ${step.leading_indicators[0] ?? cell.kpi} on the standing operating cadence.`,
      "Re-check evidence freshness during the monthly system review.",
    ],
    client_safe_explanation: cell.client_safe_explanation,
    admin_only_note: cell.admin_review_note + " — " + step.admin_sequencing_note,
    ai_assisted: false,
    admin_approval_required: true,
  };
}

/* ---------- Plan ---------- */

export function buildImplementationPlan(
  industry: MatrixIndustryKey,
  findings: ReadonlyArray<DiagnosticFinding>,
): ImplementationPlan {
  const matrix = INDUSTRY_DIAGNOSTIC_DEPTH_MATRIX[industry];
  const recs: ImplementationRecommendation[] = [];
  const forecasts: OperationalForecast[] = [];

  for (const f of findings) {
    if (f.industry !== industry) continue;
    const cell = matrix[f.gear];
    const step = findStep(industry, f.gear);
    recs.push(buildRecommendation(f, cell, step));
    forecasts.push(buildOperationalForecast(f));
  }

  // Deterministic ranking: priority_score desc, then sequence_number asc, then gear key asc.
  recs.sort((a, b) => {
    if (b.priority_score !== a.priority_score) return b.priority_score - a.priority_score;
    if (a.sequence_number !== b.sequence_number) return a.sequence_number - b.sequence_number;
    return a.gear.localeCompare(b.gear);
  });

  const seq = getIndustrySequence(industry);
  const repair_sequence = seq.map((s) => ({
    sequence_number: s.step_number,
    title: s.title,
    why_first: s.why_first,
    do_not_do_yet: s.do_not_do_yet,
  }));

  const deferred = recs
    .filter(
      (r) =>
        r.dependency_order > 0 &&
        recs.some((other) => r.prerequisite_step_numbers.includes(other.sequence_number)),
    )
    .flatMap((r) => r.do_not_do_yet);

  const control_system_monitoring_plan = [
    "Score history movement across the 5 gears over time.",
    "Evidence freshness on the most recently installed steps.",
    "Owner intervention count per cadence cycle.",
    "Unresolved contradictions surfaced during diagnostic review.",
    "Industry-specific leading indicators on the standing operating cadence.",
    "Re-emergence of risk after initial repair.",
  ];

  return {
    industry,
    recommendations: recs,
    forecasts,
    repair_sequence,
    deferred,
    control_system_monitoring_plan,
    scope_boundary_notice:
      "Implementation installs operating structure, repair sequencing, and visibility. RGS does not run the business, does not provide unlimited support, and does not promise revenue, profit, growth, valuation, or compliance outcomes. The owner remains the decision-maker; the RGS Control System keeps the owner connected to the system after installation.",
  };
}

export const IMPLEMENTATION_PRIORITIZATION_FACTORS: ReadonlyArray<string> = [
  "severity",
  "evidence_confidence",
  "business_risk",
  "control_impact",
  "operational_drag",
  "owner_bottleneck_reduction",
  "dependency_order",
  "implementation_difficulty",
  "industry_urgency",
  "repair_readiness",
  "data_quality",
  "evidence_freshness",
  "downstream_dependency",
];

export const IMPLEMENTATION_GEARS: ReadonlyArray<MatrixGearKey> = MATRIX_GEAR_KEYS;
