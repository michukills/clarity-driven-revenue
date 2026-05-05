/**
 * P73 — Stability-to-Value Lens™ canonical config.
 *
 * Deterministic factor registry for the five RGS gears. The lens is an
 * OPERATIONAL stability/transferability lens — it is NOT a valuation,
 * appraisal, investment, lending, fiduciary, tax, accounting, or legal
 * opinion. Per ORNRA: "Operational Readiness, Not Regulatory Assurance."
 *
 * AI may help draft client-safe wording, but it MUST NOT calculate
 * value, override scoring, invent evidence, or auto-publish to clients.
 */

import { RGS_NAMES, STABILITY_TO_VALUE_DISCLAIMER } from "@/config/rgsNaming";

export const STABILITY_TO_VALUE_LENS_NAME = RGS_NAMES.stabilityToValue;

export const STABILITY_TO_VALUE_LENS_GEARS = [
  "demand_generation",
  "revenue_conversion",
  "operational_efficiency",
  "financial_visibility",
  "owner_independence",
] as const;
export type StabilityToValueGear = (typeof STABILITY_TO_VALUE_LENS_GEARS)[number];

export const STABILITY_TO_VALUE_GEAR_LABELS: Record<StabilityToValueGear, string> = {
  demand_generation: "Demand Generation",
  revenue_conversion: "Revenue Conversion",
  operational_efficiency: "Operational Efficiency",
  financial_visibility: "Financial Visibility",
  owner_independence: "Owner Independence",
};

export const STABILITY_TO_VALUE_STRUCTURE_RATINGS = [
  "stronger_structure",
  "developing_structure",
  "fragile_structure",
  "high_dependency",
  "insufficient_evidence",
] as const;
export type StabilityToValueStructureRating =
  (typeof STABILITY_TO_VALUE_STRUCTURE_RATINGS)[number];

export const STRUCTURE_RATING_LABELS: Record<StabilityToValueStructureRating, string> = {
  stronger_structure: "Stronger Structure",
  developing_structure: "Developing Structure",
  fragile_structure: "Fragile Structure",
  high_dependency: "High Dependency / Insufficient Structure",
  insufficient_evidence: "Insufficient Evidence",
};

export const PERCEIVED_RISK_LEVELS = [
  "low",
  "moderate",
  "elevated",
  "high",
  "unknown",
] as const;
export type PerceivedOperationalRiskLevel = (typeof PERCEIVED_RISK_LEVELS)[number];

/**
 * Phrases that must NEVER appear in client-facing Stability-to-Value
 * Lens™ copy. The product name is allowed via an explicit allowlist
 * exception in the scanner — the SCANNER intentionally trips on
 * unsafe valuation/appraisal/lending/investment claims.
 */
export const STV_FORBIDDEN_CLIENT_PHRASES = [
  "valuation",
  "appraisal",
  "fair market value",
  "enterprise value",
  "sale price",
  "investment advice",
  "investment-ready",
  "investment ready",
  "investor-ready",
  "investor ready",
  "lender-ready",
  "lender ready",
  "financing-ready",
  "financing ready",
  "loan-ready",
  "loan ready",
  "fiduciary",
  "tax advice",
  "accounting advice",
  "legal advice",
  "cpa verified",
  "audit-ready",
  "audit ready",
  "due diligence certified",
  "buyer-ready",
  "buyer ready",
  "sale-ready",
  "sale ready",
  "third-party reliance",
  "guaranteed value",
  "valuation increase",
  "multiple expansion",
  "ebitda multiple",
  "safe harbor",
  "compliance certified",
  "regulatory assurance",
] as const;

/**
 * Allowlisted exact strings that are permitted in client-facing copy
 * even though they contain a forbidden substring. The product name
 * "Stability-to-Value Lens™" is explicitly safe.
 */
const STV_PHRASE_ALLOWLIST = [
  "stability-to-value lens",
  "stability to value lens",
] as const;

/**
 * Returns the offending phrase if `text` contains a forbidden client
 * phrase, ignoring permitted product-name occurrences. The check
 * removes allowlisted strings before scanning so the product name
 * itself never trips the scanner.
 */
export function findStabilityToValueForbiddenPhrase(
  text: string | null | undefined,
): string | null {
  if (!text) return null;
  let lower = text.toLowerCase();
  for (const safe of STV_PHRASE_ALLOWLIST) {
    while (lower.includes(safe)) lower = lower.replace(safe, "");
  }
  for (const p of STV_FORBIDDEN_CLIENT_PHRASES) {
    if (lower.includes(p)) return p;
  }
  return null;
}

/**
 * Canonical client-facing disclaimer rendered everywhere the lens
 * appears (client portal page, admin client-safe summary, report,
 * PDF). Reuses the registry-locked STABILITY_TO_VALUE_DISCLAIMER as
 * its anchor.
 */
export const STV_CLIENT_DISCLAIMER =
  `${STABILITY_TO_VALUE_LENS_NAME} is not a valuation, appraisal, ` +
  "investment analysis, lending opinion, fiduciary recommendation, " +
  "tax/accounting opinion, legal opinion, or third-party reliance " +
  "report. It is an operational lens that helps organize business " +
  "stability factors that may affect how risk, transferability, and " +
  "system maturity are perceived. Review this information with " +
  "qualified professionals before using it for lending, investment, " +
  "sale, tax, legal, accounting, or third-party decisions.";

export const STV_PLAIN_ENGLISH_DISCLAIMER =
  "This does not tell you what your business is worth. It helps show " +
  "which parts of the business may make the company look stronger, " +
  "weaker, easier to operate, or more dependent on the owner.";

/** Sanity check at module load: registry disclaimer used as anchor. */
export const STV_REGISTRY_DISCLAIMER_ANCHOR = STABILITY_TO_VALUE_DISCLAIMER;

/**
 * Lens factor — a single deterministic question. Each factor maps to a
 * gear and contributes points (0–4) toward that gear's 0–20 score.
 * Answers are explicit enums; "unknown" yields no points and counts as
 * insufficient evidence for that factor.
 */
export type StvAnswer = "yes" | "partial" | "no" | "unknown";

export const STV_ANSWER_POINTS: Record<StvAnswer, number> = {
  yes: 4,
  partial: 2,
  no: 0,
  unknown: 0,
};

export interface StvFactor {
  key: string;
  gear: StabilityToValueGear;
  prompt: string;
  helper: string;
}

export const STV_FACTORS: readonly StvFactor[] = [
  // Demand Generation (5 factors → max 20)
  { key: "dg.lead_source_diversity", gear: "demand_generation", prompt: "Lead sources are diversified (no single channel >60%)", helper: "Concentration risk if a single channel disappears." },
  { key: "dg.predictable_lead_flow", gear: "demand_generation", prompt: "Lead flow is predictable month over month", helper: "Documented historical pattern, not anecdotal." },
  { key: "dg.documented_acquisition", gear: "demand_generation", prompt: "Customer acquisition process is documented", helper: "A new team member could follow it." },
  { key: "dg.cost_per_lead_visibility", gear: "demand_generation", prompt: "Cost per qualified lead is tracked", helper: "Marketing spend is measurable." },
  { key: "dg.not_owner_referral_dependent", gear: "demand_generation", prompt: "Lead flow does not depend mainly on owner reputation/referrals", helper: "Business is not bottlenecked by the owner's network." },

  // Revenue Conversion (5)
  { key: "rc.consistent_close_rate", gear: "revenue_conversion", prompt: "Close rate is measured and reasonably consistent", helper: "Avoids hidden conversion volatility." },
  { key: "rc.documented_sales_process", gear: "revenue_conversion", prompt: "Sales process is documented end-to-end", helper: "Repeatable across team members." },
  { key: "rc.followup_discipline", gear: "revenue_conversion", prompt: "Quote/proposal follow-up has a documented cadence", helper: "Leads do not silently die." },
  { key: "rc.handoff_clarity", gear: "revenue_conversion", prompt: "Customer handoff from sale to delivery is clear", helper: "Reduces churn from rough onboarding." },
  { key: "rc.cancellation_control", gear: "revenue_conversion", prompt: "No-show / cancellation rate is tracked and managed", helper: "Revenue leakage is visible." },

  // Operational Efficiency (5)
  { key: "oe.sop_coverage", gear: "operational_efficiency", prompt: "Core workflows have written SOPs", helper: "Knowledge is not only in heads." },
  { key: "oe.workflow_consistency", gear: "operational_efficiency", prompt: "Workflows are followed consistently", helper: "Same job → same steps." },
  { key: "oe.rework_rate_visible", gear: "operational_efficiency", prompt: "Rework or error rate is tracked", helper: "Quality drag is measurable." },
  { key: "oe.role_accountability", gear: "operational_efficiency", prompt: "Each role has clear accountability", helper: "Owners know who owns what." },
  { key: "oe.handoff_clarity", gear: "operational_efficiency", prompt: "Handoffs between roles are documented", helper: "Avoids silent drops." },

  // Financial Visibility (5)
  { key: "fv.revenue_categories", gear: "financial_visibility", prompt: "Revenue is categorized cleanly (by service/product line)", helper: "Where the money comes from is visible." },
  { key: "fv.gross_margin_visible", gear: "financial_visibility", prompt: "Gross margin is visible monthly", helper: "Pricing/COGS health is measurable." },
  { key: "fv.cash_runway_visible", gear: "financial_visibility", prompt: "Cash runway is visible at any time", helper: "Owner can answer 'how long can we operate'." },
  { key: "fv.ar_aging_visible", gear: "financial_visibility", prompt: "AR aging is reviewed regularly", helper: "Past-due balances are not surprises." },
  { key: "fv.source_of_truth_books", gear: "financial_visibility", prompt: "Books have a clear source of truth (one accounting system reconciled)", helper: "Numbers are review-ready, not patchwork." },

  // Owner Independence (5)
  { key: "oi.vacation_test", gear: "owner_independence", prompt: "Business can operate for 2 weeks without the owner", helper: "Vacation test." },
  { key: "oi.decision_rights", gear: "owner_independence", prompt: "Decision rights for routine work are delegated", helper: "Not every decision routes to the owner." },
  { key: "oi.documented_responsibilities", gear: "owner_independence", prompt: "Team responsibilities are documented", helper: "Roles are explicit." },
  { key: "oi.no_single_point_of_failure", gear: "owner_independence", prompt: "No single person (incl. owner) is the only one who can do a critical task", helper: "Reduces fragility." },
  { key: "oi.relationship_concentration", gear: "owner_independence", prompt: "Key customer/vendor relationships are not concentrated solely with the owner", helper: "Transferability of relationships." },
];

export type StvAnswers = Record<string, StvAnswer | undefined>;

export interface StvGearScore {
  gear: StabilityToValueGear;
  /** 0–20 deterministic score. */
  score: number;
  /** Number of factors answered (yes/partial/no). */
  answered: number;
  /** Number of factors total. */
  total: number;
  /** True if too few factors answered to be meaningful (<3 of 5). */
  insufficientEvidence: boolean;
}

export interface StvResult {
  totalScore: number;
  byGear: Record<StabilityToValueGear, StvGearScore>;
  structureRating: StabilityToValueStructureRating;
  perceivedOperationalRiskLevel: PerceivedOperationalRiskLevel;
  transferabilityReadinessLabel: string;
  /** Factors lacking an explicit answer. */
  insufficientEvidenceFactors: string[];
  /** True if overall result is "Insufficient Evidence". */
  isInsufficientEvidence: boolean;
}

const MIN_ANSWERED_PER_GEAR = 3;
const MIN_ANSWERED_OVERALL = Math.ceil(STV_FACTORS.length * 0.6);

/**
 * Deterministic scoring. Each gear has 5 factors × 4 pts = 20.
 * Total = sum of gears, 0–100. Returns "insufficient_evidence" when
 * fewer than 60% of factors are answered (or any gear has <3 answered).
 */
export function computeStabilityToValueLens(answers: StvAnswers): StvResult {
  const byGear = {} as Record<StabilityToValueGear, StvGearScore>;
  for (const g of STABILITY_TO_VALUE_LENS_GEARS) {
    byGear[g] = { gear: g, score: 0, answered: 0, total: 0, insufficientEvidence: false };
  }
  const insufficientEvidenceFactors: string[] = [];
  for (const f of STV_FACTORS) {
    const a = answers[f.key];
    byGear[f.gear].total += 1;
    if (a === undefined || a === "unknown") {
      insufficientEvidenceFactors.push(f.key);
      continue;
    }
    byGear[f.gear].answered += 1;
    byGear[f.gear].score += STV_ANSWER_POINTS[a];
  }
  let anyGearInsufficient = false;
  for (const g of STABILITY_TO_VALUE_LENS_GEARS) {
    if (byGear[g].answered < MIN_ANSWERED_PER_GEAR) {
      byGear[g].insufficientEvidence = true;
      anyGearInsufficient = true;
    }
  }
  const totalAnswered = STV_FACTORS.length - insufficientEvidenceFactors.length;
  const totalScore =
    byGear.demand_generation.score +
    byGear.revenue_conversion.score +
    byGear.operational_efficiency.score +
    byGear.financial_visibility.score +
    byGear.owner_independence.score;

  const isInsufficient =
    totalAnswered < MIN_ANSWERED_OVERALL || anyGearInsufficient;

  let structureRating: StabilityToValueStructureRating;
  let perceived: PerceivedOperationalRiskLevel;
  let transferability: string;
  if (isInsufficient) {
    structureRating = "insufficient_evidence";
    perceived = "unknown";
    transferability = "Insufficient Evidence";
  } else if (totalScore >= 80) {
    structureRating = "stronger_structure";
    perceived = "low";
    transferability = "More Transferable Structure";
  } else if (totalScore >= 60) {
    structureRating = "developing_structure";
    perceived = "moderate";
    transferability = "Developing Transferability";
  } else if (totalScore >= 40) {
    structureRating = "fragile_structure";
    perceived = "elevated";
    transferability = "Fragile Transferability";
  } else {
    structureRating = "high_dependency";
    perceived = "high";
    transferability = "High Dependency Structure";
  }

  return {
    totalScore,
    byGear,
    structureRating,
    perceivedOperationalRiskLevel: perceived,
    transferabilityReadinessLabel: transferability,
    insufficientEvidenceFactors,
    isInsufficientEvidence: isInsufficient,
  };
}
