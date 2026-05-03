/**
 * P42 — Stability Journey derivation.
 *
 * Pure, deterministic translation of P41 diagnostic state into the
 * client-facing Stability Journey: phase, recommended next move,
 * five-gear progress map, evidence strength, and report readiness.
 *
 * No fake completion. No score fabrication. No "report ready" unless a
 * real report record/status supports it. Language stays inside the paid
 * diagnostic scope — see docs/stability-journey.md.
 */

import type { DiagnosticToolSequenceRow } from "@/lib/diagnostics/toolSequence";
import { effectiveSequence, reasonFor } from "@/lib/diagnostics/toolSequence";
import { DIAGNOSTIC_TOOL_LABELS, type DiagnosticToolKey } from "@/lib/diagnostics/diagnosticRuns";

export type GearKey =
  | "demand_generation"
  | "revenue_conversion"
  | "operational_efficiency"
  | "financial_visibility"
  | "owner_independence";

export interface GearDef {
  key: GearKey;
  name: string;
  short: string;
  /** Owner Diagnostic Interview section keys that feed this gear. */
  interviewKeys: string[];
  /** Diagnostic tool that maps most directly to this gear. */
  primaryToolKey: DiagnosticToolKey;
}

export const STABILITY_GEARS: readonly GearDef[] = [
  {
    key: "demand_generation",
    name: "Demand Generation",
    short: "Demand",
    interviewKeys: ["demand_sources", "demand_reliable", "demand_unreliable"],
    primaryToolKey: "buyer_persona_tool",
  },
  {
    key: "revenue_conversion",
    name: "Revenue Conversion",
    short: "Conversion",
    interviewKeys: ["sales_process", "followup_process"],
    primaryToolKey: "customer_journey_mapper",
  },
  {
    key: "operational_efficiency",
    name: "Operational Efficiency",
    short: "Operations",
    interviewKeys: ["ops_bottleneck", "ops_owner_dependent"],
    primaryToolKey: "process_breakdown_tool",
  },
  {
    key: "financial_visibility",
    name: "Financial Visibility",
    short: "Finance",
    interviewKeys: ["fin_visibility", "fin_pricing_confidence"],
    primaryToolKey: "revenue_leak_finder",
  },
  {
    key: "owner_independence",
    name: "Owner Independence",
    short: "Autopilot",
    interviewKeys: ["owner_decisions_only", "owner_key_person_risk"],
    primaryToolKey: "rgs_stability_scorecard",
  },
] as const;

export type GearState =
  | "not_started"
  | "in_progress"
  | "evidence_light"
  | "evidence_moderate"
  | "evidence_strong"
  | "ready_for_review"
  | "diagnosed";

export const GEAR_STATE_LABEL: Record<GearState, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  evidence_light: "Evidence light",
  evidence_moderate: "Evidence moderate",
  evidence_strong: "Evidence strong",
  ready_for_review: "Ready for RGS review",
  diagnosed: "Diagnosed",
};

export type EvidenceStrength = "none" | "light" | "moderate" | "strong";

export const EVIDENCE_STRENGTH_LABEL: Record<EvidenceStrength, string> = {
  none: "Evidence not yet captured",
  light: "Evidence Light",
  moderate: "Evidence Moderate",
  strong: "Evidence Strong",
};

export type JourneyPhase =
  | "intake_not_started"
  | "owner_interview_in_progress"
  | "owner_interview_complete"
  | "diagnostic_tools_unlocked"
  | "core_gears_being_mapped"
  | "evidence_review_needed"
  | "ready_for_rgs_review"
  | "stability_report_in_progress"
  | "stability_report_ready";

export const JOURNEY_PHASE_LABEL: Record<JourneyPhase, string> = {
  intake_not_started: "Intake not started",
  owner_interview_in_progress: "Owner Diagnostic Interview in progress",
  owner_interview_complete: "Owner Diagnostic Interview complete",
  diagnostic_tools_unlocked: "Diagnostic tools unlocked",
  core_gears_being_mapped: "Core gears being mapped",
  evidence_review_needed: "Evidence review needed",
  ready_for_rgs_review: "Ready for RGS review",
  stability_report_in_progress: "Stability Report in progress",
  stability_report_ready: "Stability Report ready",
};

export type ReportReadiness =
  | "intake_not_started"
  | "interview_in_progress"
  | "interview_complete"
  | "diagnostic_tools_unlocked"
  | "core_gears_being_mapped"
  | "evidence_review_needed"
  | "ready_for_rgs_review"
  | "stability_report_in_progress"
  | "stability_report_ready";

export const REPORT_READINESS_LABEL: Record<ReportReadiness, string> = {
  intake_not_started: "Intake not started",
  interview_in_progress: "Interview in progress",
  interview_complete: "Interview complete",
  diagnostic_tools_unlocked: "Diagnostic tools unlocked",
  core_gears_being_mapped: "Core gears being mapped",
  evidence_review_needed: "Evidence review needed",
  ready_for_rgs_review: "Ready for RGS review",
  stability_report_in_progress: "Stability Report in progress",
  stability_report_ready: "Stability Report ready",
};

export interface JourneyInput {
  ownerInterviewCompletedAt: string | null;
  /** Map of owner-interview section_key → trimmed answer text. */
  interviewAnswers: Map<string, string>;
  /** Set of diagnostic tool keys that have at least one completed run. */
  completedToolKeys: Set<string>;
  /** Persisted personalized sequence (admin override applied). */
  sequence: DiagnosticToolSequenceRow | null;
  /**
   * Real report state, when available. We never invent this — if the host
   * doesn't pass it, report readiness stops at "ready_for_rgs_review".
   */
  reportState?: "in_progress" | "ready" | null;
}

export interface GearProgress {
  gear: GearDef;
  state: GearState;
  evidence: EvidenceStrength;
  /** True if the gear's primary diagnostic tool has been completed. */
  toolCompleted: boolean;
  /** Number of related interview answers captured (any text, including "I don't know"). */
  answeredCount: number;
  /** Total interview sections that feed this gear. */
  totalCount: number;
  /** Plain-English progress signal shown after meaningful progress. */
  miniInsight: string | null;
}

export interface RecommendedMove {
  /** Stable identifier — owner_diagnostic_interview or a diagnostic tool key. */
  key: string;
  label: string;
  /** Internal portal path. May be null if the host has no route mapping. */
  routePath: string | null;
  reason: string;
}

export interface JourneyResult {
  phase: JourneyPhase;
  phaseLabel: string;
  /** 0–100, derived from interview + completed diagnostic tools. Never a diagnosis. */
  progressPct: number;
  ownerInterviewComplete: boolean;
  evidenceStrength: EvidenceStrength;
  reportReadiness: ReportReadiness;
  recommendedNext: RecommendedMove;
  gears: GearProgress[];
  /** Diagnostic tool keys remaining in recommended order (excluding owner interview). */
  remainingToolKeys: string[];
  /** Diagnostic tool keys that have at least one completed run. */
  completedToolKeys: string[];
}

const TOOL_ROUTE: Record<string, string> = {
  owner_diagnostic_interview: "/portal/tools/owner-diagnostic-interview",
  rgs_stability_scorecard: "/portal/scorecard",
  revenue_leak_finder: "/portal/tools/revenue-leak-engine",
  buyer_persona_tool: "/portal/tools",
  customer_journey_mapper: "/portal/tools",
  process_breakdown_tool: "/portal/tools",
};

function answeredFor(input: JourneyInput, keys: string[]): number {
  let n = 0;
  for (const k of keys) {
    const v = input.interviewAnswers.get(k);
    if (v && v.trim().length > 0) n++;
  }
  return n;
}

function gearMiniInsight(g: GearDef, state: GearState): string | null {
  if (state === "not_started" || state === "in_progress") return null;
  switch (g.key) {
    case "demand_generation":
      return "Demand Generation mapped. RGS now has enough information to compare demand sources against conversion and financial visibility.";
    case "revenue_conversion":
      return "Revenue Conversion mapped. This gives RGS a clearer read on how buyers move from interest to purchase.";
    case "operational_efficiency":
      return "Operations pressure mapped. This helps show where work may depend too heavily on the owner or unclear handoffs.";
    case "financial_visibility":
      return "Financial visibility mapped. This helps RGS understand whether pricing, margin, cash flow, or expense visibility needs deeper review.";
    case "owner_independence":
      return "Owner Independence mapped. This helps show where decision rights, knowledge, or recurring interruptions may create owner dependence.";
  }
}

function deriveGearState(
  g: GearDef,
  ownerDone: boolean,
  answered: number,
  total: number,
  toolCompleted: boolean,
): GearState {
  if (!ownerDone && answered === 0 && !toolCompleted) return "not_started";
  if (!ownerDone && answered === 0) return "not_started";
  if (toolCompleted && answered >= total) return "ready_for_review";
  if (toolCompleted) return "evidence_strong";
  if (answered >= total) return "evidence_moderate";
  if (answered > 0) return "evidence_light";
  return "in_progress";
}

function gearEvidence(state: GearState): EvidenceStrength {
  switch (state) {
    case "not_started":
    case "in_progress":
      return "none";
    case "evidence_light":
      return "light";
    case "evidence_moderate":
      return "moderate";
    case "evidence_strong":
    case "ready_for_review":
    case "diagnosed":
      return "strong";
  }
}

function aggregateEvidence(gears: GearProgress[]): EvidenceStrength {
  const order: EvidenceStrength[] = ["none", "light", "moderate", "strong"];
  let strongCount = 0;
  let moderateCount = 0;
  let lightCount = 0;
  for (const g of gears) {
    if (g.evidence === "strong") strongCount++;
    else if (g.evidence === "moderate") moderateCount++;
    else if (g.evidence === "light") lightCount++;
  }
  if (strongCount >= 4) return "strong";
  if (strongCount + moderateCount >= 3) return "moderate";
  if (strongCount + moderateCount + lightCount >= 1) return "light";
  void order;
  return "none";
}

function pickRecommended(
  input: JourneyInput,
  gears: GearProgress[],
): RecommendedMove {
  const ownerDone = !!input.ownerInterviewCompletedAt;
  if (!ownerDone) {
    return {
      key: "owner_diagnostic_interview",
      label: "Owner Diagnostic Interview",
      routePath: TOOL_ROUTE.owner_diagnostic_interview,
      reason:
        "Complete the Owner Diagnostic Interview. This gives RGS the first read on how your business actually runs before deeper tools unlock.",
    };
  }

  const order = effectiveSequence(input.sequence);
  const completed = input.completedToolKeys;

  // Walk the persisted sequence and pick the first incomplete tool.
  for (const key of order) {
    if (key === "owner_diagnostic_interview") continue;
    if (completed.has(key)) continue;
    const label = DIAGNOSTIC_TOOL_LABELS[key as DiagnosticToolKey] ?? key;
    const reason =
      reasonFor(input.sequence, key) ??
      "Your answers suggest this is the next useful area to clarify.";
    return {
      key,
      label,
      routePath: TOOL_ROUTE[key] ?? null,
      reason,
    };
  }

  // No remaining diagnostic tools — pivot to evidence review.
  const lightGear = gears.find((g) => g.evidence === "none" || g.evidence === "light");
  if (lightGear) {
    return {
      key: `gear:${lightGear.gear.key}`,
      label: `Strengthen ${lightGear.gear.name}`,
      routePath: TOOL_ROUTE[lightGear.gear.primaryToolKey] ?? null,
      reason:
        "All recommended tools are complete. Strengthen evidence in this gear so RGS can review accurately.",
    };
  }

  return {
    key: "rgs_review",
    label: "Awaiting RGS review",
    routePath: null,
    reason:
      "Diagnostic evidence is captured across the five gears. Your RGS team will review and assemble your Stability Report.",
  };
}

function derivePhase(
  ownerDone: boolean,
  interviewAny: boolean,
  completedTools: number,
  evidence: EvidenceStrength,
  reportState: JourneyInput["reportState"],
): JourneyPhase {
  if (reportState === "ready") return "stability_report_ready";
  if (reportState === "in_progress") return "stability_report_in_progress";
  if (!ownerDone && !interviewAny) return "intake_not_started";
  if (!ownerDone) return "owner_interview_in_progress";
  if (completedTools === 0) return "diagnostic_tools_unlocked";
  if (evidence === "strong") return "ready_for_rgs_review";
  if (evidence === "moderate") return "evidence_review_needed";
  return "core_gears_being_mapped";
}

function deriveReportReadiness(phase: JourneyPhase): ReportReadiness {
  // Readiness mirrors the journey phase — it never claims "ready" unless
  // an actual report state was passed in (which produces the matching phase).
  switch (phase) {
    case "intake_not_started":
      return "intake_not_started";
    case "owner_interview_in_progress":
      return "interview_in_progress";
    case "owner_interview_complete":
      return "interview_complete";
    case "diagnostic_tools_unlocked":
      return "diagnostic_tools_unlocked";
    case "core_gears_being_mapped":
      return "core_gears_being_mapped";
    case "evidence_review_needed":
      return "evidence_review_needed";
    case "ready_for_rgs_review":
      return "ready_for_rgs_review";
    case "stability_report_in_progress":
      return "stability_report_in_progress";
    case "stability_report_ready":
      return "stability_report_ready";
  }
}

function progressPct(
  ownerDone: boolean,
  interviewAnswered: number,
  interviewTotal: number,
  completedTools: number,
  totalTools: number,
): number {
  // 50% weight on the Owner Interview (gateway), 50% on diagnostic tools.
  const interviewPart = ownerDone
    ? 0.5
    : interviewTotal > 0
      ? 0.5 * (interviewAnswered / interviewTotal)
      : 0;
  const toolPart = totalTools > 0 ? 0.5 * (completedTools / totalTools) : 0;
  return Math.max(0, Math.min(100, Math.round((interviewPart + toolPart) * 100)));
}

export function deriveStabilityJourney(input: JourneyInput): JourneyResult {
  const ownerDone = !!input.ownerInterviewCompletedAt;
  const interviewAny = Array.from(input.interviewAnswers.values()).some(
    (v) => v && v.trim().length > 0,
  );

  const gears: GearProgress[] = STABILITY_GEARS.map((g) => {
    const answered = answeredFor(input, g.interviewKeys);
    const total = g.interviewKeys.length;
    const toolCompleted = input.completedToolKeys.has(g.primaryToolKey);
    const state = deriveGearState(g, ownerDone, answered, total, toolCompleted);
    const evidence = gearEvidence(state);
    return {
      gear: g,
      state,
      evidence,
      toolCompleted,
      answeredCount: answered,
      totalCount: total,
      miniInsight: gearMiniInsight(g, state),
    };
  });

  const evidenceStrength = aggregateEvidence(gears);
  const order = effectiveSequence(input.sequence).filter(
    (k) => k !== "owner_diagnostic_interview",
  );
  const remainingToolKeys = order.filter((k) => !input.completedToolKeys.has(k));
  const completedToolKeys = order.filter((k) => input.completedToolKeys.has(k));

  const phase = derivePhase(
    ownerDone,
    interviewAny,
    completedToolKeys.length,
    evidenceStrength,
    input.reportState ?? null,
  );

  // Surface the "owner_interview_complete" phase only as a transient signal
  // before tools are touched.
  const finalPhase: JourneyPhase =
    phase === "diagnostic_tools_unlocked" && completedToolKeys.length === 0 && order.length === 0
      ? "owner_interview_complete"
      : phase;

  const recommendedNext = pickRecommended(input, gears);

  const interviewAnsweredTotal = Array.from(input.interviewAnswers.values()).filter(
    (v) => v && v.trim().length > 0,
  ).length;

  return {
    phase: finalPhase,
    phaseLabel: JOURNEY_PHASE_LABEL[finalPhase],
    progressPct: progressPct(
      ownerDone,
      interviewAnsweredTotal,
      Math.max(input.interviewAnswers.size, 1),
      completedToolKeys.length,
      Math.max(order.length, 1),
    ),
    ownerInterviewComplete: ownerDone,
    evidenceStrength,
    reportReadiness: deriveReportReadiness(finalPhase),
    recommendedNext,
    gears,
    remainingToolKeys,
    completedToolKeys,
  };
}
