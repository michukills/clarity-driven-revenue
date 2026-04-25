/**
 * P13.TruthTesting.Rubric.H.1 — Deterministic 100-point Truth-Test +
 * Commercial Readiness rubric.
 *
 * Free-safe: pure functions, no I/O, no paid AI calls. Used by admins to
 * pressure-test whether a scorecard run, diagnostic interview, or report
 * draft is strong enough to support RGS's paid offers.
 *
 * Trust contract:
 *   • Owner-reported evidence supports low/medium confidence only.
 *   • High confidence requires system-tracked or admin-validated evidence.
 *   • Demo/showcase data is never described as a real client outcome.
 *   • Generic advice is penalized unless tied to concrete evidence.
 *   • Missing data must lower confidence or block readiness.
 */

import type {
  DraftRecommendation,
  EvidenceItem,
  EvidenceSnapshot,
  MissingInfoItem,
  ReportConfidence,
  ReportDraftRow,
} from "@/lib/reports/types";

export const TRUTH_TEST_VERSION = "truth-test.v1" as const;

export type RubricCategory =
  | "core_issue_accuracy"
  | "specificity"
  | "evidence_support"
  | "confidence_calibration"
  | "missing_data_honesty"
  | "contradiction_awareness"
  | "ceia_completeness"
  | "owner_trust_readability"
  | "commercial_readiness"
  | "demo_trust_safety";

export interface CategoryResult {
  category: RubricCategory;
  label: string;
  score: number;
  max: number;
  pass: boolean;
  reason: string;
  improvement: string;
}

export type CommercialLabel =
  | "not_ready"
  | "diagnostic_ready"
  | "implementation_ready"
  | "premium_ready";

export interface ReadinessResult {
  label: CommercialLabel;
  diagnostic_ready: boolean;
  implementation_ready: boolean;
  premium_ready: boolean;
  blockers: string[];
}

export interface RubricResult {
  version: string;
  total: number;
  categories: CategoryResult[];
  readiness: ReadinessResult;
  top_weaknesses: CategoryResult[];
  must_improve: string[];
}

export const CATEGORY_WEIGHTS: Record<RubricCategory, number> = {
  core_issue_accuracy: 15,
  specificity: 10,
  evidence_support: 15,
  confidence_calibration: 10,
  missing_data_honesty: 10,
  contradiction_awareness: 10,
  ceia_completeness: 10,
  owner_trust_readability: 10,
  commercial_readiness: 5,
  demo_trust_safety: 5,
};

export const CATEGORY_LABEL: Record<RubricCategory, string> = {
  core_issue_accuracy: "Core issue accuracy",
  specificity: "Specificity / non-generic diagnosis",
  evidence_support: "Evidence support",
  confidence_calibration: "Confidence calibration",
  missing_data_honesty: "Missing-data honesty",
  contradiction_awareness: "Contradiction awareness",
  ceia_completeness: "Cause → Evidence → Impact → Action",
  owner_trust_readability: "Owner-trust / readability",
  commercial_readiness: "Commercial readiness",
  demo_trust_safety: "Demo / trust safety",
};

/** Generic phrases penalized unless tied to concrete evidence. */
export const GENERIC_PHRASES: readonly string[] = [
  "improve marketing",
  "streamline operations",
  "increase efficiency",
  "focus on growth",
  "optimize processes",
  "leverage synergies",
  "drive value",
  "best practices",
  "move the needle",
  "scale the business",
] as const;

const QUANT_HINT_REGEX = /\$\d|\d+\s?%|\d{2,}\s?(hour|hr|day|week|month|client|deal|invoice|lead|customer|sale|order)/i;
const NUMBER_REGEX = /\b\d/;

// ---------------------------------------------------------------------------
// Small detector helpers (exported for tests)
// ---------------------------------------------------------------------------

export function detectGenericLanguage(text: string | null | undefined): {
  hits: string[];
  ratio: number;
} {
  const t = (text ?? "").toLowerCase();
  if (!t.trim()) return { hits: [], ratio: 0 };
  const hits = GENERIC_PHRASES.filter((p) => t.includes(p));
  // ratio: hits per 100 words, clamped 0..1
  const words = Math.max(1, t.split(/\s+/).length);
  const ratio = Math.min(1, hits.length / Math.max(1, words / 100));
  return { hits, ratio };
}

export interface CeiaCheck {
  cause: boolean;
  evidence: boolean;
  impact: boolean;
  action: boolean;
  impact_explained_when_unquantified: boolean;
}

/** Rough Cause/Evidence/Impact/Action presence detector for a body of text. */
export function checkCauseEvidenceImpactAction(
  text: string | null | undefined,
  opts: { requireAction?: boolean } = {},
): CeiaCheck {
  const t = (text ?? "").toLowerCase();
  const cause = /(because|due to|driven by|root cause|caused by|stems from|why)/i.test(t);
  const evidence =
    /(evidence|data|reported|tracked|shows|indicates|per|according to|source|interview|quickbooks|qb|stripe|hubspot|csv|import|weekly check|scorecard)/i.test(
      t,
    );
  const impact = QUANT_HINT_REGEX.test(t) || /(impact|costs?|losing|revenue|cash|risk|exposure)/i.test(t);
  const impact_explained_when_unquantified =
    QUANT_HINT_REGEX.test(t) ||
    /(cannot be quantified|not yet quantified|insufficient data|unknown amount|to be measured)/i.test(t);
  const action = opts.requireAction
    ? /(do|fix|build|create|implement|track|stop|start|change|review|adopt|cadence|process|sop|playbook)/i.test(t)
    : true;
  return { cause, evidence, impact, action, impact_explained_when_unquantified };
}

export interface EvidenceCoverage {
  total_claims: number;
  with_evidence: number;
  ratio: number;
  any_system_tracked: boolean;
  any_admin_validated: boolean;
}

/** Coverage across recommendations + risks (anything making a claim). */
export function checkEvidenceCoverage(
  recommendations: readonly { evidence_refs?: readonly string[] | null }[],
  evidence: EvidenceSnapshot | null | undefined,
  opts: { adminValidated?: boolean } = {},
): EvidenceCoverage {
  const totalClaims = recommendations.length;
  const withEvidence = recommendations.filter(
    (r) => (r.evidence_refs ?? []).length > 0,
  ).length;
  const items = evidence?.items ?? [];
  const sys = items.some(
    (i) => i.is_synced === true || i.is_imported === true || /quickbooks|qb|stripe|hubspot|integration|sync|import/i.test(i.source ?? ""),
  );
  return {
    total_claims: totalClaims,
    with_evidence: withEvidence,
    ratio: totalClaims === 0 ? 0 : withEvidence / totalClaims,
    any_system_tracked: sys,
    any_admin_validated: !!opts.adminValidated,
  };
}

/** Owner-reported-only evidence with stated High confidence is a calibration failure. */
export function checkConfidenceCalibration(
  confidence: ReportConfidence,
  coverage: EvidenceCoverage,
  hasMissingInfo: boolean,
): { ok: boolean; reason: string } {
  if (confidence === "high" && !coverage.any_system_tracked && !coverage.any_admin_validated) {
    return {
      ok: false,
      reason:
        "High confidence claimed but no system-tracked or admin-validated evidence is attached.",
    };
  }
  if (confidence === "high" && hasMissingInfo) {
    return {
      ok: false,
      reason: "High confidence claimed while critical information is still missing.",
    };
  }
  if (confidence === "low" && coverage.any_system_tracked && coverage.ratio > 0.7) {
    return {
      ok: false,
      reason: "Confidence is low but most claims are backed by tracked sources — recalibrate up.",
    };
  }
  return { ok: true, reason: "Confidence appears calibrated to evidence quality." };
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function makeCategory(
  category: RubricCategory,
  score: number,
  passThreshold: number,
  reason: string,
  improvement: string,
): CategoryResult {
  const max = CATEGORY_WEIGHTS[category];
  const s = clamp(Math.round(score), 0, max);
  return {
    category,
    label: CATEGORY_LABEL[category],
    max,
    score: s,
    pass: s >= passThreshold,
    reason,
    improvement,
  };
}

// ---------------------------------------------------------------------------
// Per-input graders
// ---------------------------------------------------------------------------

export interface RecommendationGrade {
  generic: boolean;
  has_evidence: boolean;
  ceia: CeiaCheck;
  score: number; // 0..10
}

export function gradeRecommendation(rec: DraftRecommendation): RecommendationGrade {
  const text = `${rec.title}\n${rec.detail}`;
  const generic = detectGenericLanguage(text).hits.length > 0;
  const has_evidence = (rec.evidence_refs ?? []).length > 0;
  const ceia = checkCauseEvidenceImpactAction(text, { requireAction: true });
  let score = 10;
  if (generic && !has_evidence) score -= 5;
  if (!has_evidence) score -= 3;
  if (!ceia.cause) score -= 1;
  if (!ceia.evidence) score -= 1;
  if (!ceia.impact_explained_when_unquantified) score -= 1;
  if (!ceia.action) score -= 1;
  return { generic, has_evidence, ceia, score: clamp(score, 0, 10) };
}

// ---------------------------------------------------------------------------
// Top-level graders
// ---------------------------------------------------------------------------

export interface ReportDraftGradeInput {
  recommendations: readonly DraftRecommendation[];
  risks?: readonly { evidence_refs?: readonly string[] | null; detail?: string | null }[];
  missing_information?: readonly MissingInfoItem[];
  evidence_snapshot?: EvidenceSnapshot | null;
  confidence: ReportConfidence;
  approved_at?: string | null;
  status?: string | null;
  is_demo_account?: boolean;
  client_safe?: boolean;
  body_text?: string; // optional concatenated section bodies for generic detection
  report_type?: string;
}

export function gradeReportDraft(input: ReportDraftGradeInput): RubricResult {
  const recs = input.recommendations ?? [];
  const adminValidated =
    !!input.approved_at || (input.status ?? "") === "approved";
  const coverage = checkEvidenceCoverage(recs, input.evidence_snapshot ?? null, {
    adminValidated,
  });
  const hasMissingInfo = (input.missing_information ?? []).length > 0;
  const recGrades = recs.map(gradeRecommendation);
  const avgRec = recGrades.length
    ? recGrades.reduce((a, b) => a + b.score, 0) / recGrades.length
    : 0;
  const allText = [
    input.body_text ?? "",
    ...recs.map((r) => `${r.title} ${r.detail}`),
  ].join("\n");
  const generic = detectGenericLanguage(allText);

  // Core issue accuracy (15) — proxy: do recs reference evidence and ceia?
  const coreReasons: string[] = [];
  let core = 15;
  if (recs.length === 0) {
    core = 4;
    coreReasons.push("No recommendations / findings stated.");
  } else {
    if (coverage.ratio < 0.5) {
      core -= 5;
      coreReasons.push("Less than half of findings cite evidence.");
    }
    if (recGrades.filter((g) => g.ceia.cause).length / recGrades.length < 0.6) {
      core -= 4;
      coreReasons.push("Most findings do not state a cause.");
    }
    if (avgRec < 6) {
      core -= 3;
      coreReasons.push("Recommendation quality is weak on average.");
    }
  }
  const coreCat = makeCategory(
    "core_issue_accuracy",
    core,
    13,
    coreReasons.join(" ") || "Findings credibly identify likely core issues.",
    "Tie each finding to a stated cause and at least one evidence ref before approving.",
  );

  // Specificity (10)
  let spec = 10;
  const specReasons: string[] = [];
  if (generic.hits.length > 0) {
    spec -= Math.min(7, generic.hits.length * 2);
    specReasons.push(`Generic phrases: ${generic.hits.join(", ")}.`);
  }
  if (recs.length > 0) {
    const numericRecs = recs.filter((r) =>
      QUANT_HINT_REGEX.test(`${r.title} ${r.detail}`),
    ).length;
    if (numericRecs / recs.length < 0.3) {
      spec -= 3;
      specReasons.push("Few recommendations include numbers or concrete scope.");
    }
  }
  const specCat = makeCategory(
    "specificity",
    spec,
    8,
    specReasons.join(" ") || "Output names specific things, not generic advice.",
    "Replace vague phrasing with concrete numbers, systems, or named processes.",
  );

  // Evidence support (15)
  let evid = 15;
  const evidReasons: string[] = [];
  if (recs.length === 0) {
    evid = 4;
    evidReasons.push("No recommendations to evidence-check.");
  } else {
    if (coverage.ratio < 1) {
      evid -= Math.round((1 - coverage.ratio) * 8);
      evidReasons.push(
        `${recs.length - coverage.with_evidence} of ${recs.length} recommendations lack evidence refs.`,
      );
    }
    if (!coverage.any_system_tracked && !coverage.any_admin_validated) {
      // Owner-reported-only is a hard cap on evidence support — it cannot
      // clear the $3k diagnostic threshold (12/15) on owner statements alone.
      evid -= 5;
      evidReasons.push("No system-tracked or admin-validated evidence yet.");
    }
  }
  const evidCat = makeCategory(
    "evidence_support",
    evid,
    12,
    evidReasons.join(" ") || "Most claims trace back to evidence items.",
    "Attach evidence_refs to every recommendation and pull at least one tracked source.",
  );

  // Confidence calibration (10)
  const calib = checkConfidenceCalibration(input.confidence, coverage, hasMissingInfo);
  const calibCat = makeCategory(
    "confidence_calibration",
    calib.ok ? 10 : 4,
    8,
    calib.reason,
    calib.ok
      ? "Continue using owner-reported vs system-tracked tier labels."
      : "Lower confidence to medium until system-tracked or admin-validated evidence is attached.",
  );

  // Missing-data honesty (10)
  let miss = 10;
  const missReasons: string[] = [];
  if (!hasMissingInfo && coverage.ratio < 1) {
    miss -= 5;
    missReasons.push("Some recommendations lack evidence but no missing-info items declared.");
  }
  if (hasMissingInfo) {
    missReasons.push(
      `${input.missing_information!.length} missing-information item(s) acknowledged.`,
    );
  }
  const missCat = makeCategory(
    "missing_data_honesty",
    miss,
    8,
    missReasons.join(" ") || "Gaps are acknowledged honestly.",
    "Declare every gap explicitly in the missing_information list with what + why-it-matters.",
  );

  // Contradiction awareness (10) — heuristic: presence of risks + evidence notes
  const risks = input.risks ?? [];
  const notes = input.evidence_snapshot?.notes ?? [];
  let contradict = 7;
  const contradictReasons: string[] = [];
  if (risks.length > 0) {
    contradict += 2;
    contradictReasons.push(`${risks.length} risk(s) surfaced.`);
  }
  if (notes.length > 0) {
    contradict += 1;
    contradictReasons.push("Collector notes captured caveats.");
  }
  if (risks.length === 0 && notes.length === 0 && recs.length > 3) {
    contradict -= 3;
    contradictReasons.push("Many recommendations but no risks or caveats noted — review for contradictions.");
  }
  const contradictCat = makeCategory(
    "contradiction_awareness",
    contradict,
    7,
    contradictReasons.join(" ") || "Risks and caveats reviewed.",
    "Add a Risks entry when two evidence items disagree (e.g. owner says X but tracked data shows Y).",
  );

  // CEIA completeness (10)
  let ceiaScore = 10;
  const ceiaReasons: string[] = [];
  if (recs.length === 0) {
    ceiaScore = 3;
    ceiaReasons.push("No recommendations to score for CEIA.");
  } else {
    const counts = recGrades.reduce(
      (acc, g) => {
        if (!g.ceia.cause) acc.cause++;
        if (!g.ceia.evidence) acc.evidence++;
        if (!g.ceia.impact_explained_when_unquantified) acc.impact++;
        if (!g.ceia.action) acc.action++;
        return acc;
      },
      { cause: 0, evidence: 0, impact: 0, action: 0 },
    );
    const totalMisses = counts.cause + counts.evidence + counts.impact + counts.action;
    ceiaScore -= Math.min(8, totalMisses);
    if (totalMisses > 0)
      ceiaReasons.push(
        `Missing C/E/I/A pieces — cause:${counts.cause} evid:${counts.evidence} impact:${counts.impact} action:${counts.action}.`,
      );
  }
  const ceiaCat = makeCategory(
    "ceia_completeness",
    ceiaScore,
    9,
    ceiaReasons.join(" ") || "Each recommendation includes cause, evidence, impact, and action.",
    "If impact cannot be quantified, explicitly state why and which data would change that.",
  );

  // Owner-trust readability (10)
  let trust = 10;
  const trustReasons: string[] = [];
  if (input.body_text && input.body_text.length > 0) {
    const lower = input.body_text.toLowerCase();
    if (/leverage|synergy|paradigm|circle back|holistic/.test(lower)) {
      trust -= 3;
      trustReasons.push("Jargon detected in body — owners feel less understood.");
    }
  }
  if (recs.length > 0 && recs.every((r) => !r.detail || r.detail.length < 40)) {
    trust -= 3;
    trustReasons.push("Recommendation details are too short to feel personal.");
  }
  const trustCat = makeCategory(
    "owner_trust_readability",
    trust,
    8,
    trustReasons.join(" ") || "Tone is plain, specific, and respectful of the owner's reality.",
    "Write the way the owner would describe it — short sentences, named systems, no jargon.",
  );

  // Commercial readiness (5)
  let commercial = 5;
  const commercialReasons: string[] = [];
  if (coverage.ratio < 0.6) {
    commercial -= 2;
    commercialReasons.push("Evidence coverage is below the threshold for a paid diagnostic.");
  }
  if (recs.length === 0) {
    commercial -= 3;
    commercialReasons.push("No recommendations to support a paid offer.");
  }
  const commercialCat = makeCategory(
    "commercial_readiness",
    commercial,
    4,
    commercialReasons.join(" ") || "Output is shaped to support a paid diagnostic conversation.",
    "Tighten findings to map to the $3k diagnostic and the $10k implementation path.",
  );

  // Demo / trust safety (5)
  let demo = 5;
  const demoReasons: string[] = [];
  const claimsRealOutcome = /(case study|real client|proven results?|guaranteed)/i.test(allText);
  if (input.is_demo_account && input.client_safe) {
    demo -= 3;
    demoReasons.push("Demo account marked client-safe — risks being read as real proof.");
  }
  if (input.is_demo_account && claimsRealOutcome) {
    demo -= 4;
    demoReasons.push("Demo content uses real-outcome language.");
  }
  if (!input.is_demo_account && /demo|sample|seeded|showcase/i.test(allText)) {
    demo -= 2;
    demoReasons.push("Demo / seed wording leaked into a non-demo draft.");
  }
  const demoCat = makeCategory(
    "demo_trust_safety",
    demo,
    4,
    demoReasons.join(" ") || "Demo / showcase boundaries respected.",
    "Strip case-study / proof language unless a real client has approved it.",
  );

  const categories: CategoryResult[] = [
    coreCat,
    specCat,
    evidCat,
    calibCat,
    missCat,
    contradictCat,
    ceiaCat,
    trustCat,
    commercialCat,
    demoCat,
  ];

  const total = categories.reduce((a, c) => a + c.score, 0);
  const readiness = evaluateCommercialReadiness({
    total,
    categories,
    is_demo_safety_failed: !demoCat.pass,
    has_priority_order: recs.some((r) => r.priority === "high"),
    contradiction_reviewed: contradictCat.pass,
  });

  const top_weaknesses = [...categories]
    .sort((a, b) => a.score / a.max - b.score / b.max)
    .slice(0, 3);

  const must_improve = top_weaknesses
    .filter((c) => !c.pass)
    .map((c) => `${c.label}: ${c.improvement}`);

  return {
    version: TRUTH_TEST_VERSION,
    total,
    categories,
    readiness,
    top_weaknesses,
    must_improve,
  };
}

// ---------------------------------------------------------------------------
// Diagnostic interview + Scorecard graders (lighter — they don't have recs)
// ---------------------------------------------------------------------------

export interface DiagnosticInterviewGradeInput {
  answers?: Record<string, string | null | undefined> | null;
  evidence_map?: unknown[] | null;
  missing_information?: unknown[] | null;
  validation_checklist?: unknown[] | null;
  confidence?: ReportConfidence | string | null;
  is_demo?: boolean;
}

export function gradeDiagnosticInterview(
  input: DiagnosticInterviewGradeInput,
): RubricResult {
  const answers = input.answers ?? {};
  const answerTexts = Object.values(answers).filter(Boolean) as string[];
  const body = answerTexts.join("\n");
  const conf = (input.confidence as ReportConfidence) || "low";

  // Reuse report grader by synthesizing a recommendation-free input,
  // but provide body_text so generic / readability checks still run.
  const evidenceItems: EvidenceItem[] = (input.evidence_map ?? []).map(
    (e: any, i) => ({
      source: String(e?.source ?? "interview"),
      module: "Diagnostic interview",
      title: String(e?.title ?? `Evidence ${i + 1}`),
      client_safe: false,
    }),
  );
  return gradeReportDraft({
    recommendations: [],
    missing_information: (input.missing_information ?? []).map((m: any) => ({
      area: String(m?.area ?? "—"),
      what_is_missing: String(m?.what_is_missing ?? ""),
      why_it_matters: String(m?.why_it_matters ?? ""),
    })),
    evidence_snapshot: {
      collected_at: new Date().toISOString(),
      customer_id: null,
      customer_label: "",
      is_demo_account: !!input.is_demo,
      items: evidenceItems,
      counts: {},
      notes: [],
    },
    confidence: conf,
    is_demo_account: !!input.is_demo,
    client_safe: false,
    body_text: body,
  });
}

export interface ScorecardGradeInput {
  answers?: Record<string, string | null | undefined> | null;
  pillar_scores?: Record<string, number | null | undefined> | null;
  is_demo?: boolean;
}

export function gradeScorecardRun(input: ScorecardGradeInput): RubricResult {
  return gradeDiagnosticInterview({
    answers: input.answers ?? {},
    evidence_map: [],
    missing_information: [],
    confidence: "low",
    is_demo: input.is_demo,
  });
}

// ---------------------------------------------------------------------------
// Commercial readiness evaluator
// ---------------------------------------------------------------------------

export interface ReadinessInput {
  total: number;
  categories: CategoryResult[];
  is_demo_safety_failed: boolean;
  has_priority_order: boolean;
  contradiction_reviewed: boolean;
}

function findCat(cats: CategoryResult[], key: RubricCategory): CategoryResult | undefined {
  return cats.find((c) => c.category === key);
}

export function evaluateCommercialReadiness(input: ReadinessInput): ReadinessResult {
  const blockers: string[] = [];
  const get = (k: RubricCategory) => findCat(input.categories, k)?.score ?? 0;

  const evidence = get("evidence_support");
  const specificity = get("specificity");
  const missing = get("missing_data_honesty");
  const ceia = get("ceia_completeness");
  const core = get("core_issue_accuracy");

  // Diagnostic-ready
  const diagnostic_ready =
    input.total >= 85 &&
    evidence >= 12 &&
    specificity >= 8 &&
    missing >= 8 &&
    !input.is_demo_safety_failed;

  if (!diagnostic_ready) {
    if (input.total < 85) blockers.push(`Total score ${input.total}/100 < 85.`);
    if (evidence < 12) blockers.push(`Evidence support ${evidence}/15 < 12.`);
    if (specificity < 8) blockers.push(`Specificity ${specificity}/10 < 8.`);
    if (missing < 8) blockers.push(`Missing-data honesty ${missing}/10 < 8.`);
    if (input.is_demo_safety_failed) blockers.push("Demo / trust safety failed.");
  }

  // Implementation-ready
  const implementation_ready =
    diagnostic_ready &&
    input.total >= 90 &&
    ceia >= 9 &&
    core >= 13 &&
    input.has_priority_order &&
    input.contradiction_reviewed;

  if (diagnostic_ready && !implementation_ready) {
    if (input.total < 90) blockers.push(`Total score ${input.total}/100 < 90.`);
    if (ceia < 9) blockers.push(`CEIA completeness ${ceia}/10 < 9.`);
    if (core < 13) blockers.push(`Core issue accuracy ${core}/15 < 13.`);
    if (!input.has_priority_order)
      blockers.push("No prioritized (high-priority) recommendation present.");
    if (!input.contradiction_reviewed)
      blockers.push("Contradiction awareness not yet passing.");
  }

  // Premium-ready
  const premium_ready =
    implementation_ready && input.total >= 95 && evidence >= 13 && specificity >= 9;

  let label: CommercialLabel = "not_ready";
  if (premium_ready) label = "premium_ready";
  else if (implementation_ready) label = "implementation_ready";
  else if (diagnostic_ready) label = "diagnostic_ready";

  return {
    label,
    diagnostic_ready,
    implementation_ready,
    premium_ready,
    blockers,
  };
}

export const READINESS_LABEL: Record<CommercialLabel, string> = {
  not_ready: "Not ready",
  diagnostic_ready: "Diagnostic-ready ($3k)",
  implementation_ready: "Implementation-ready ($10k)",
  premium_ready: "Premium-ready",
};

/** Convenience for grading a stored ReportDraftRow. */
export function gradeStoredReportDraft(row: ReportDraftRow): RubricResult {
  const sections = row.draft_sections?.sections ?? [];
  const body = sections.map((s) => s.body).join("\n\n");
  return gradeReportDraft({
    recommendations: row.recommendations ?? [],
    risks: row.risks ?? [],
    missing_information: row.missing_information ?? [],
    evidence_snapshot: row.evidence_snapshot ?? null,
    confidence: row.confidence,
    approved_at: row.approved_at,
    status: row.status,
    is_demo_account: row.evidence_snapshot?.is_demo_account ?? false,
    client_safe: row.client_safe,
    body_text: body,
    report_type: row.report_type,
  });
}