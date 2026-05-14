/**
 * P93E-E2G — RGS Control System Continuation Engine.
 *
 * Deterministic, additive engine for the post-Implementation Control
 * System add-on. Consumes existing Diagnostic findings, the Industry
 * Diagnostic Depth Matrix (E2E), and the Implementation Depth Engine
 * (E2F) to produce the client-operable continuation surface:
 *
 *   - Stage separation (Implementation vs. Control System)
 *   - Repair progress continuation (read-only continuation, not new install)
 *   - Evidence freshness monitoring
 *   - Owner-control / owner-dependence monitoring
 *   - Industry-specific ongoing leading indicators
 *   - Score / gear movement watchlist
 *   - Bounded support classification (uses controlSystemSupportBoundary)
 *   - Re-engagement triggers
 *   - Client-safe vs admin-only field separation
 *
 * Score remains v3-deterministic. AI may assist drafting upstream; this
 * engine never moves score, never publishes admin-only notes, never
 * creates new official findings, and never makes legal / tax /
 * accounting / compliance / valuation determinations.
 */

import type {
  MatrixGearKey,
  MatrixIndustryKey,
} from "@/config/industryDiagnosticDepthMatrix";
import {
  INDUSTRY_DIAGNOSTIC_DEPTH_MATRIX,
} from "@/config/industryDiagnosticDepthMatrix";
import {
  buildImplementationPlan,
  type DiagnosticFinding,
  type ImplementationRecommendation,
} from "@/lib/implementation/depthEngine";
import { getIndustrySequence } from "@/config/industryImplementationSequencing";

/* ---------- Stage labels (must NOT be reused across stages) ---------- */

export const RGS_STAGE_LABELS = {
  implementation: {
    key: "implementation" as const,
    label: "Implementation",
    one_liner: "RGS is installing the operating structure.",
    role: "Project-based installation, repair sequencing, and buildout. Admin-led.",
  },
  control_system: {
    key: "rgs_control_system" as const,
    label: "RGS Control System",
    one_liner: "You are now operating and monitoring the system RGS installed.",
    role: "Post-Implementation continuation. Client-operated visibility, monitoring, and bounded support. The Control System is not a new Implementation project.",
  },
} as const;

export type RgsStageKey = "implementation" | "rgs_control_system";

/* ---------- Inputs ---------- */

export type RepairStatus =
  | "not_started"
  | "in_progress"
  | "blocked"
  | "needs_evidence_refresh"
  | "client_action_needed"
  | "stable"
  | "slipping"
  | "complete";

export type EvidenceFreshness = "current" | "needs_refresh" | "stale" | "missing";

export interface RepairProgressInput {
  recommendation_id: string;
  gear: MatrixGearKey;
  status: RepairStatus;
  last_updated_iso: string | null;
  evidence_freshness: EvidenceFreshness;
  owner_action_pending: boolean;
}

export interface ScoreHistoryPoint {
  iso_date: string;
  total_score: number; // 0-1000 deterministic v3
  gear_scores: Record<MatrixGearKey, number>; // 0-200 each
}

export interface ControlSystemInput {
  industry: MatrixIndustryKey;
  findings: ReadonlyArray<DiagnosticFinding>;
  repair_progress: ReadonlyArray<RepairProgressInput>;
  score_history: ReadonlyArray<ScoreHistoryPoint>;
  add_on_active: boolean;
}

/* ---------- Outputs ---------- */

export interface RepairContinuationItem {
  recommendation_id: string;
  gear: MatrixGearKey;
  source_finding_summary: string;
  current_status: RepairStatus;
  dependency_status: "ready" | "waiting_on_prereq" | "blocked";
  owner_or_client_responsibility: "client" | "owner" | "shared";
  next_client_action: string;
  evidence_required: ReadonlyArray<string>;
  monitoring_frequency: "weekly" | "biweekly" | "monthly";
  control_system_watch_item: string;
  reengagement_trigger_if_scope_expands: string;
  client_safe_explanation: string;
  admin_only_note: string;
}

export interface EvidenceFreshnessItem {
  recommendation_id: string;
  gear: MatrixGearKey;
  freshness: EvidenceFreshness;
  last_updated_iso: string | null;
  why_it_matters: string;
  what_to_upload: string;
  admin_review_required: boolean;
  /** Stale evidence lowers confidence; it never certifies anything. */
  confidence_note: string;
}

export interface OwnerControlSignal {
  gear: MatrixGearKey;
  bottleneck_warning: string;
  decisions_still_routed_to_owner: string;
  what_owner_can_stop_carrying: string;
  owner_independence_trend: "improving" | "flat" | "regressing" | "unknown";
}

export interface IndustrySignal {
  gear: MatrixGearKey;
  signal_label: string;
  monitoring_question: string;
  client_safe_explanation: string;
}

export interface ScoreMovement {
  current_total: number | null;
  previous_total: number | null;
  delta: number | null;
  trend: "improving" | "flat" | "regressing" | "unknown";
  top_slipping_gear: MatrixGearKey | null;
  per_gear_delta: Partial<Record<MatrixGearKey, number>>;
}

export interface ControlSystemView {
  stage: typeof RGS_STAGE_LABELS.control_system;
  add_on_active: boolean;
  industry: MatrixIndustryKey;
  score_movement: ScoreMovement;
  repair_continuation: ReadonlyArray<RepairContinuationItem>;
  evidence_freshness: ReadonlyArray<EvidenceFreshnessItem>;
  owner_control_signals: ReadonlyArray<OwnerControlSignal>;
  industry_signals: ReadonlyArray<IndustrySignal>;
  monitoring_plan: ReadonlyArray<string>;
  recommended_next_client_action: string;
  included_support: ReadonlyArray<string>;
  reengagement_triggers: ReadonlyArray<string>;
  scope_boundary_notice: string;
  /** Admin-only note never echoed in client-safe surfaces. */
  admin_summary_note: string;
}

/* ---------- Helpers ---------- */

import {
  CONTROL_SYSTEM_INCLUDED_SUPPORT,
  CONTROL_SYSTEM_REENGAGEMENT_TRIGGERS,
} from "@/config/controlSystemSupportBoundary";

function dependencyStatus(
  rec: ImplementationRecommendation,
  progress: ReadonlyArray<RepairProgressInput>,
): "ready" | "waiting_on_prereq" | "blocked" {
  if (rec.prerequisite_step_numbers.length === 0) return "ready";
  const completedSteps = new Set(
    progress
      .filter((p) => p.status === "complete" || p.status === "stable")
      .map((p) => {
        const r = p.recommendation_id;
        const m = r.match(/_step_(\d+)$/);
        return m ? Number(m[1]) : null;
      })
      .filter((n): n is number => n !== null),
  );
  const missing = rec.prerequisite_step_numbers.filter((n) => !completedSteps.has(n));
  if (missing.length === 0) return "ready";
  return "waiting_on_prereq";
}

function ownerOrClient(rec: ImplementationRecommendation): "client" | "owner" | "shared" {
  if (rec.owner_involvement_required === "high") return "owner";
  if (rec.owner_involvement_required === "medium") return "shared";
  return "client";
}

function monitoringFrequency(gear: MatrixGearKey): "weekly" | "biweekly" | "monthly" {
  if (gear === "financial_visibility" || gear === "operational_efficiency") return "weekly";
  if (gear === "owner_independence") return "monthly";
  return "biweekly";
}

function freshnessReason(freshness: EvidenceFreshness): string {
  switch (freshness) {
    case "current":
      return "Evidence is current. Continue monitoring on the standing cadence.";
    case "needs_refresh":
      return "Evidence is approaching staleness. A refresh keeps monitoring confidence intact.";
    case "stale":
      return "Evidence has gone stale. Monitoring confidence is reduced until it is refreshed.";
    case "missing":
      return "Evidence is missing. The Control System cannot monitor this confidently without it.";
  }
}

/* ---------- Engine ---------- */

export function buildControlSystemView(input: ControlSystemInput): ControlSystemView {
  const { industry, findings, repair_progress, score_history, add_on_active } = input;
  const matrix = INDUSTRY_DIAGNOSTIC_DEPTH_MATRIX[industry];
  const sequence = getIndustrySequence(industry);
  const plan = buildImplementationPlan(industry, findings);
  const recsById = new Map(plan.recommendations.map((r) => [r.id, r] as const));

  // Repair continuation derived from progress + recommendations.
  const repair_continuation: RepairContinuationItem[] = repair_progress.map((p) => {
    const rec =
      Array.from(recsById.values()).find((r) => r.gear === p.gear) ??
      plan.recommendations[0];
    const cell = matrix[p.gear];
    return {
      recommendation_id: p.recommendation_id,
      gear: p.gear,
      source_finding_summary: cell.failure_pattern,
      current_status: p.status,
      dependency_status: dependencyStatus(rec, repair_progress),
      owner_or_client_responsibility: ownerOrClient(rec),
      next_client_action:
        p.status === "complete"
          ? "Watch the leading indicator on the standing cadence."
          : p.evidence_freshness === "missing" || p.evidence_freshness === "stale"
          ? `Refresh evidence: ${cell.evidence_prompts[0] ?? cell.kpi}.`
          : `Continue ${rec.title.toLowerCase()} on the standing cadence.`,
      evidence_required: cell.evidence_prompts,
      monitoring_frequency: monitoringFrequency(p.gear),
      control_system_watch_item: rec.leading_indicators[0] ?? cell.kpi,
      reengagement_trigger_if_scope_expands:
        "If this repair scope expands beyond what RGS originally installed, a new Implementation engagement may be required.",
      client_safe_explanation: cell.client_safe_explanation,
      admin_only_note: rec.admin_only_note,
    };
  });

  // Evidence freshness items.
  const evidence_freshness: EvidenceFreshnessItem[] = repair_progress.map((p) => {
    const cell = matrix[p.gear];
    return {
      recommendation_id: p.recommendation_id,
      gear: p.gear,
      freshness: p.evidence_freshness,
      last_updated_iso: p.last_updated_iso,
      why_it_matters: cell.client_safe_explanation,
      what_to_upload: cell.evidence_prompts[0] ?? "Operating evidence for this gear.",
      admin_review_required: p.evidence_freshness === "stale" || p.evidence_freshness === "missing",
      confidence_note:
        freshnessReason(p.evidence_freshness) +
        " Evidence informs monitoring confidence; it does not certify legal, tax, accounting, compliance, or valuation status.",
    };
  });

  // Owner-control signals: one per gear.
  const owner_control_signals: OwnerControlSignal[] = (Object.keys(matrix) as MatrixGearKey[]).map(
    (gear) => {
      const rec = Array.from(recsById.values()).find((r) => r.gear === gear);
      const cell = matrix[gear];
      const trend: OwnerControlSignal["owner_independence_trend"] =
        score_history.length < 2
          ? "unknown"
          : (() => {
              const last = score_history[score_history.length - 1].gear_scores[gear];
              const prev = score_history[score_history.length - 2].gear_scores[gear];
              if (last > prev) return "improving";
              if (last < prev) return "regressing";
              return "flat";
            })();
      return {
        gear,
        bottleneck_warning: rec?.owner_bottleneck_reduced ?? cell.failure_pattern,
        decisions_still_routed_to_owner:
          rec?.owner_involvement_required === "high"
            ? "Owner is still the named decision point for this gear."
            : "Decision rights appear distributed for this gear.",
        what_owner_can_stop_carrying:
          rec?.owner_bottleneck_reduced ?? "Operating exception that should not require owner attention.",
        owner_independence_trend: trend,
      };
    },
  );

  // Industry signals: leading indicators per gear.
  const industry_signals: IndustrySignal[] = (Object.keys(matrix) as MatrixGearKey[]).map((gear) => {
    const rec = Array.from(recsById.values()).find((r) => r.gear === gear);
    const cell = matrix[gear];
    return {
      gear,
      signal_label: rec?.leading_indicators[0] ?? cell.kpi,
      monitoring_question: cell.scorecard_question,
      client_safe_explanation: cell.client_safe_explanation,
    };
  });

  // Score movement.
  const score_movement: ScoreMovement = (() => {
    if (score_history.length === 0) {
      return {
        current_total: null,
        previous_total: null,
        delta: null,
        trend: "unknown",
        top_slipping_gear: null,
        per_gear_delta: {},
      };
    }
    const current = score_history[score_history.length - 1];
    const previous = score_history.length > 1 ? score_history[score_history.length - 2] : null;
    if (!previous) {
      return {
        current_total: current.total_score,
        previous_total: null,
        delta: null,
        trend: "unknown",
        top_slipping_gear: null,
        per_gear_delta: {},
      };
    }
    const per: Partial<Record<MatrixGearKey, number>> = {};
    let worstGear: MatrixGearKey | null = null;
    let worstDelta = 0;
    for (const gear of Object.keys(current.gear_scores) as MatrixGearKey[]) {
      const delta = current.gear_scores[gear] - previous.gear_scores[gear];
      per[gear] = delta;
      if (delta < worstDelta) {
        worstDelta = delta;
        worstGear = gear;
      }
    }
    const totalDelta = current.total_score - previous.total_score;
    return {
      current_total: current.total_score,
      previous_total: previous.total_score,
      delta: totalDelta,
      trend: totalDelta > 0 ? "improving" : totalDelta < 0 ? "regressing" : "flat",
      top_slipping_gear: worstGear,
      per_gear_delta: per,
    };
  })();

  const monitoring_plan = [
    "Score history movement across the 5 gears over time.",
    "Evidence freshness on installed repair items.",
    "Owner intervention count and owner-dependence trend.",
    "Unresolved contradictions surfaced during diagnostic review.",
    "Implementation dependency blockers still open.",
    "Industry-specific leading indicators on the standing operating cadence.",
    "Recurring slipping gears.",
    "Stale priority actions.",
    "Risk re-emergence after initial repair.",
  ];

  const recommended_next_client_action =
    repair_continuation.find((r) => r.evidence_freshness_required(r) /* placeholder */ === undefined &&
      (r.current_status === "client_action_needed" || r.current_status === "needs_evidence_refresh"))
      ?.next_client_action ??
    repair_continuation.find((r) => r.current_status !== "complete" && r.current_status !== "stable")
      ?.next_client_action ??
    "Review the standing operating cadence; no immediate action required.";

  return {
    stage: RGS_STAGE_LABELS.control_system,
    add_on_active,
    industry,
    score_movement,
    repair_continuation,
    evidence_freshness,
    owner_control_signals,
    industry_signals,
    monitoring_plan,
    recommended_next_client_action,
    included_support: CONTROL_SYSTEM_INCLUDED_SUPPORT,
    reengagement_triggers: CONTROL_SYSTEM_REENGAGEMENT_TRIGGERS,
    scope_boundary_notice:
      "The RGS Control System is the post-Implementation continuation layer. It helps you keep using the installed RGS tools, monitor the system, keep evidence current, and know when something needs attention. It is not a new Implementation project, is not an open-ended retainer, and does not run the business for you. RGS does not promise revenue, profit, growth, valuation, or compliance outcomes. The owner remains the decision-maker.",
    admin_summary_note:
      "Control System view derived deterministically from installed Implementation recommendations and reported repair progress. AI was not used to generate any client-visible field on this view. No legal, tax, accounting, compliance, or valuation determination is provided.",
  };
}
