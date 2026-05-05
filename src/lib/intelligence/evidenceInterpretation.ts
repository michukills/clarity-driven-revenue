/**
 * IB-H4 — Evidence Interpretation Helpers.
 *
 * Non-AI, deterministic helpers that translate gear metric and
 * industry-depth answer states into structured admin-review signals,
 * report-ready section seeds, and priority repair-map candidates.
 *
 * Hard rules:
 *  - This module never mutates the deterministic 0–1000 scorecard or
 *    any file under `src/lib/scoring/*`.
 *  - This module performs no AI calls, no `fetch`, no Supabase access,
 *    and reads no secrets.
 *  - Every signal/section/candidate produced defaults to
 *    `clientVisibleDefault = false`, `reviewRequired = true`,
 *    `approvalRequired = true`. Admin-only notes are kept on a
 *    separate field and must never be merged into client-safe output.
 *  - Cannabis / MMJ context is dispensary / cannabis-retail operations
 *    only. No HIPAA, healthcare, patient care, clinical workflow,
 *    medical billing, or insurance-claim framing is generated here.
 *  - Synthetic / training case studies must never be surfaced as real
 *    proof; this helper does not pull case-study content at all.
 */
import {
  GEAR_METRIC_REGISTRY,
  getMetricByKey,
  type AnswerState,
  type GearKey,
  type GearMetric,
} from "./gearMetricRegistry";
import {
  INDUSTRY_DEPTH_QUESTIONS,
  type IndustryDepthIndustryKey,
  type IndustryDepthQuestion,
} from "./industryDepthQuestionRegistry";

export type SignalType =
  | "stable"
  | "visibility_weakness"
  | "slipping"
  | "critical_gap";

export type Severity = "low" | "medium" | "high" | "critical";

export type RepairMapBelongsTo =
  | "diagnostic_clarification"
  | "implementation"
  | "rgs_control_system";

export interface EvidenceInput {
  /** Gear key. Required so signals are always anchored to a gear. */
  gear: GearKey;
  /** Hard-truth metric key from GEAR_METRIC_REGISTRY. */
  metricKey: string;
  /** Question key — either an Owner Diagnostic or industry-depth key. */
  questionKey: string;
  /** Optional industry — when present, industry-depth context is layered. */
  industryKey?: IndustryDepthIndustryKey | null;
  answerState: AnswerState;
  /** Free-text evidence the owner provided (admin-only context). */
  evidenceText?: string | null;
  /** Whether the owner attached any evidence file/source reference. */
  hasEvidence?: boolean;
}

export interface EvidenceSignal {
  gear: GearKey;
  metricKey: string;
  questionKey: string;
  industryKey: IndustryDepthIndustryKey | null;
  answerState: AnswerState;
  signalType: SignalType;
  severity: Severity;
  adminReviewCue: string;
  clientSafeSummary: string;
  repairMapCandidate: boolean;
  reportFindingSeed: string;
  clarificationQuestion: string;
  relatedFailurePatterns: string[];
  relatedBenchmarkAnchors: string[];
  relatedTools: string[];
  /** Always false until an admin explicitly approves. */
  clientVisibleDefault: false;
  /** Always true at generation time. */
  reviewRequired: true;
  adminOnlyNotes: string;
}

export interface IndustryEvidenceReportSections {
  industryKey: IndustryDepthIndustryKey | null;
  strengths: string[];
  slippingSignals: string[];
  visibilityWeaknesses: string[];
  priorityClarifications: string[];
  industryContext: string[];
  benchmarkNotes: string[];
  clientSafeDraftSections: Array<{
    title: string;
    body: string;
    gear: GearKey;
    metricKey: string;
  }>;
  adminOnlyNotes: string[];
  reviewRequired: true;
  clientVisible: false;
}

export interface RepairMapCandidate {
  key: string;
  gear: GearKey;
  metricKey: string;
  questionKey: string;
  title: string;
  observedEvidence: string;
  failurePattern: string;
  severity: Severity;
  impact: number;
  ease: number;
  dependency: number;
  recommendedOrderHint: number;
  clientSafeAction: string;
  adminOnlyNotes: string;
  belongsTo: RepairMapBelongsTo;
  clientVisible: false;
  approvalRequired: true;
}

// ---------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------

function findDepthQuestion(
  industryKey: IndustryDepthIndustryKey | null | undefined,
  questionKey: string,
): IndustryDepthQuestion | undefined {
  if (!industryKey) return undefined;
  return INDUSTRY_DEPTH_QUESTIONS.find(
    (q) => q.industryKey === industryKey && q.questionKey === questionKey,
  );
}

function severityFor(
  state: AnswerState,
  metric: GearMetric | undefined,
): { signalType: SignalType; severity: Severity } {
  switch (state) {
    case "verified":
      return { signalType: "stable", severity: "low" };
    case "incomplete":
      return { signalType: "slipping", severity: "medium" };
    case "unknown":
      return { signalType: "visibility_weakness", severity: "high" };
    case "no": {
      // Independence/financial gear gaps are usually critical for owner exit.
      const critical =
        metric?.gear === "independence" || metric?.gear === "financial";
      return {
        signalType: critical ? "critical_gap" : "slipping",
        severity: critical ? "critical" : "high",
      };
    }
  }
}

function clientSafeSummaryFor(
  metric: GearMetric | undefined,
  state: AnswerState,
): string {
  if (!metric) return "Evidence noted for admin review.";
  switch (state) {
    case "verified":
      return `${metric.metricName}: confirmed with owner evidence — gear holding here.`;
    case "incomplete":
      return `${metric.metricName}: a process exists but is not consistently followed; this gear can slip under pressure.`;
    case "unknown":
      return `${metric.metricName}: not currently tracked. Visibility into this gear is missing.`;
    case "no":
      return `${metric.metricName}: no system in place. This is a gear gap to repair.`;
  }
}

function clarifyingQuestionFor(
  metric: GearMetric | undefined,
  depth: IndustryDepthQuestion | undefined,
  state: AnswerState,
): string {
  if (state === "verified") {
    return depth
      ? `Confirm cadence and owner of: ${depth.ownerFriendlyLabel}.`
      : metric
        ? `Confirm cadence and owner of: ${metric.metricName}.`
        : "Confirm cadence and owner of this metric.";
  }
  if (depth) return depth.evidencePrompt;
  if (metric) return metric.ownerFriendlyQuestion;
  return "Ask the owner to share where this is tracked today.";
}

function reportFindingSeedFor(
  metric: GearMetric | undefined,
  depth: IndustryDepthQuestion | undefined,
  state: AnswerState,
): string {
  if (depth?.reportLanguageSeed && state !== "verified") {
    return depth.reportLanguageSeed;
  }
  if (state === "verified") {
    return metric
      ? `Strength: ${metric.metricName} is currently visible and supported by evidence.`
      : "Strength noted.";
  }
  return metric
    ? `Slipping signal on ${metric.gear} gear — ${metric.metricName}: ${metric.slippingCondition}`
    : "Slipping signal flagged for admin review.";
}

function repairBelongsTo(state: AnswerState): RepairMapBelongsTo {
  if (state === "unknown") return "diagnostic_clarification";
  if (state === "incomplete") return "implementation";
  return "implementation";
}

// ---------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------

/**
 * Build a single evidence signal for one (metric, question, answer) input.
 * Pure / deterministic. Defaults are admin-only.
 */
export function buildEvidenceSignal(input: EvidenceInput): EvidenceSignal {
  const metric = getMetricByKey(input.metricKey);
  const depth = findDepthQuestion(input.industryKey ?? null, input.questionKey);
  const { signalType, severity } = severityFor(input.answerState, metric);
  const repairMapCandidate = input.answerState !== "verified";

  const adminCueParts: string[] = [];
  if (metric?.adminOnlyNotes) adminCueParts.push(metric.adminOnlyNotes);
  if (depth?.adminOnlyInterpretationNotes) {
    adminCueParts.push(depth.adminOnlyInterpretationNotes);
  }
  if (input.evidenceText) {
    adminCueParts.push(`Owner evidence (admin-only): ${input.evidenceText}`);
  }

  return {
    gear: input.gear,
    metricKey: input.metricKey,
    questionKey: input.questionKey,
    industryKey: input.industryKey ?? null,
    answerState: input.answerState,
    signalType,
    severity,
    adminReviewCue:
      adminCueParts.join(" | ") ||
      (metric
        ? `Review ${metric.metricName} on ${metric.gear} gear.`
        : "Review evidence for admin interpretation."),
    clientSafeSummary: clientSafeSummaryFor(metric, input.answerState),
    repairMapCandidate,
    reportFindingSeed: reportFindingSeedFor(metric, depth, input.answerState),
    clarificationQuestion: clarifyingQuestionFor(
      metric,
      depth,
      input.answerState,
    ),
    relatedFailurePatterns: depth?.failurePatternMappings
      ?? metric?.relatedFailurePatterns
      ?? [],
    relatedBenchmarkAnchors: depth?.benchmarkAnchorMappings
      ?? metric?.relatedBenchmarkAnchors
      ?? [],
    relatedTools: metric?.relatedTools ?? [],
    clientVisibleDefault: false,
    reviewRequired: true,
    adminOnlyNotes:
      adminCueParts.join("\n") ||
      "No additional admin-only notes for this signal.",
  };
}

/**
 * Build many signals at once.
 */
export function buildEvidenceSignals(
  inputs: EvidenceInput[],
): EvidenceSignal[] {
  return inputs.map(buildEvidenceSignal);
}

/**
 * Group signals into report-ready sections for admin review.
 * Output is draft-only and never client-visible by default.
 */
export function buildIndustryEvidenceReportSections(
  signals: EvidenceSignal[],
  industryKey: IndustryDepthIndustryKey | null = null,
): IndustryEvidenceReportSections {
  const strengths: string[] = [];
  const slippingSignals: string[] = [];
  const visibilityWeaknesses: string[] = [];
  const priorityClarifications: string[] = [];
  const industryContext: string[] = [];
  const benchmarkNotes: string[] = [];
  const adminOnlyNotes: string[] = [];
  const clientSafeDraftSections: IndustryEvidenceReportSections["clientSafeDraftSections"] = [];

  for (const s of signals) {
    if (s.signalType === "stable") {
      strengths.push(s.reportFindingSeed);
    } else if (s.signalType === "visibility_weakness") {
      visibilityWeaknesses.push(s.reportFindingSeed);
      priorityClarifications.push(s.clarificationQuestion);
    } else {
      slippingSignals.push(s.reportFindingSeed);
      if (s.severity === "critical" || s.severity === "high") {
        priorityClarifications.push(s.clarificationQuestion);
      }
    }

    if (s.relatedBenchmarkAnchors.length > 0) {
      benchmarkNotes.push(
        `[${s.gear}/${s.metricKey}] anchors: ${s.relatedBenchmarkAnchors.join(", ")}`,
      );
    }
    if (s.industryKey) {
      industryContext.push(`[${s.industryKey}] ${s.clientSafeSummary}`);
    }
    adminOnlyNotes.push(`[${s.gear}/${s.metricKey}] ${s.adminOnlyNotes}`);
    clientSafeDraftSections.push({
      title: `${s.gear} · ${s.metricKey}`,
      body: s.clientSafeSummary,
      gear: s.gear,
      metricKey: s.metricKey,
    });
  }

  return {
    industryKey,
    strengths,
    slippingSignals,
    visibilityWeaknesses,
    priorityClarifications,
    industryContext,
    benchmarkNotes,
    clientSafeDraftSections,
    adminOnlyNotes,
    reviewRequired: true,
    clientVisible: false,
  };
}

const SEVERITY_WEIGHT: Record<Severity, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

/**
 * Build priority repair-map candidates from signals. Verified answers
 * never produce repair items — they remain strengths only.
 */
export function buildRepairMapCandidatesFromEvidence(
  signals: EvidenceSignal[],
): RepairMapCandidate[] {
  const candidates: RepairMapCandidate[] = [];
  for (const s of signals) {
    if (s.answerState === "verified") continue; // strengths, not repairs
    const metric = getMetricByKey(s.metricKey);
    const failurePattern = s.relatedFailurePatterns[0] ?? "general_gear_slip";
    const titleVerb =
      s.answerState === "no"
        ? "Create system for"
        : s.answerState === "incomplete"
          ? "Harden system for"
          : "Establish visibility for";
    candidates.push({
      key: `repair.${s.gear}.${s.metricKey}.${s.answerState}`,
      gear: s.gear,
      metricKey: s.metricKey,
      questionKey: s.questionKey,
      title: `${titleVerb} ${metric?.metricName ?? s.metricKey}`,
      observedEvidence: s.clientSafeSummary,
      failurePattern,
      severity: s.severity,
      impact: SEVERITY_WEIGHT[s.severity] + 1,
      ease: s.answerState === "unknown" ? 4 : 3,
      dependency: s.gear === "financial" || s.gear === "independence" ? 4 : 3,
      recommendedOrderHint: SEVERITY_WEIGHT[s.severity],
      clientSafeAction:
        s.answerState === "unknown"
          ? `Begin tracking ${metric?.metricName ?? s.metricKey} so the gear becomes visible.`
          : s.answerState === "incomplete"
            ? `Tighten the existing process for ${metric?.metricName ?? s.metricKey} so it survives pressure.`
            : `Build a repeatable system for ${metric?.metricName ?? s.metricKey}.`,
      adminOnlyNotes: s.adminOnlyNotes,
      belongsTo: repairBelongsTo(s.answerState),
      clientVisible: false,
      approvalRequired: true,
    });
  }
  return candidates;
}

/** Convenience: ALL hard-truth metric keys (used by future seed flows). */
export function listAllMetricKeys(): string[] {
  return GEAR_METRIC_REGISTRY.map((m) => m.metricKey);
}
