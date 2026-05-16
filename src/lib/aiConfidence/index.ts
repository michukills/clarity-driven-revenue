/**
 * P95X — Global RGS AI Confidence Kernel.
 *
 * Shared, deterministic, framework-free helpers used by every AI-assisted
 * surface in RGS (Campaign Brain, Persona, SWOT, Repair Map, Worn Tooth,
 * Reports, Recommendations, Next-Best-Action, etc.).
 *
 * Goals:
 * - HIGH is the preferred target when inputs reasonably support it.
 * - MEDIUM is the minimum acceptable normal-quality answer.
 * - LOW is reserved for genuinely missing/contradictory/unsafe situations.
 * - Every LOW must be explainable with WHY + WHAT'S MISSING + HOW TO IMPROVE.
 *
 * This kernel does NOT:
 * - own any tool-specific schema
 * - call AI itself
 * - touch the network or Supabase
 * - know about Campaign Brain, Persona, SWOT, etc. directly
 *
 * Tool-specific contracts (e.g. `campaignBrainContract.ts`) compose this
 * kernel with their own Zod schemas.
 */

export const AI_CONFIDENCE_KERNEL_VERSION = "p95x-ai-confidence-kernel-v1";

export type ConfidenceLabel = "high" | "medium" | "low";

export type SafetyStatus = "passed" | "needs_review" | "blocked";

export type NextBestAction =
  | "proceed"
  | "request_more_inputs"
  | "rework_for_safety"
  | "escalate_for_admin_review";

/**
 * Source-quality ladder. Higher quality lifts confidence; weak/owner-only
 * inputs cannot, on their own, justify HIGH.
 */
export type EvidenceQuality =
  | "verified" // approved + verified evidence (admin-reviewed, imported live data)
  | "imported" // imported from a connected source, not yet admin-verified
  | "admin_reviewed" // admin-confirmed but not externally verified
  | "owner_claim" // owner self-reported, not yet corroborated
  | "stale" // present but expired/old
  | "missing"; // absent entirely

export const EVIDENCE_WEIGHT: Record<EvidenceQuality, number> = {
  verified: 3,
  imported: 2,
  admin_reviewed: 2,
  owner_claim: 1,
  stale: 0,
  missing: 0,
};

export interface ConfidenceInputs {
  /** Count of distinct approved signals supporting the answer. */
  approvedSignalCount: number;
  /** Count of pieces of verified, customer-specific proof/evidence. */
  verifiedEvidenceCount: number;
  /** True if all *core* required context for this surface is present. */
  coreRequiredSatisfied: boolean;
  /** Free-text descriptions of missing context, e.g. "no scorecard". */
  missingContext: readonly string[];
  /** Free-text descriptions of contradictory inputs. */
  contradictionFlags?: readonly string[];
  /** Overall safety check status for any free-text being reasoned over. */
  safetyStatus: SafetyStatus;
  /**
   * Optional weights from the evidence ladder. Each entry counted via
   * EVIDENCE_WEIGHT; sum lifts confidence ceiling.
   */
  evidenceLadder?: readonly EvidenceQuality[];
  /**
   * Surface-specific override hint. When `true` AND inputs are otherwise
   * usable, the kernel will not downgrade to LOW just because optional
   * proof is absent.
   */
  allowMediumWithoutVerifiedProof?: boolean;
}

export interface ConfidenceDecision {
  label: ConfidenceLabel;
  rationale: string;
  /** Specific, operator-readable suggestions to raise confidence next time. */
  improvementSuggestions: string[];
}

function evidenceLadderScore(ladder: readonly EvidenceQuality[] | undefined): number {
  if (!ladder || ladder.length === 0) return 0;
  return ladder.reduce((sum, q) => sum + (EVIDENCE_WEIGHT[q] ?? 0), 0);
}

/**
 * Deterministic confidence classification. Never returns LOW lazily — only
 * when blocked safety, hard contradictions, or core-required context is
 * genuinely missing.
 */
export function classifyConfidence(inputs: ConfidenceInputs): ConfidenceDecision {
  const {
    approvedSignalCount,
    verifiedEvidenceCount,
    coreRequiredSatisfied,
    missingContext,
    contradictionFlags = [],
    safetyStatus,
    evidenceLadder,
    allowMediumWithoutVerifiedProof,
  } = inputs;

  const missingCount = missingContext.length;
  const ladderScore = evidenceLadderScore(evidenceLadder);

  // Hard LOW gates.
  if (safetyStatus === "blocked") {
    return {
      label: "low",
      rationale: "Safety check blocked the content; confidence cannot be raised until copy is reworked.",
      improvementSuggestions: ["Rework the flagged language so it passes the safety checker before re-running."],
    };
  }
  if (contradictionFlags.length > 0) {
    return {
      label: "low",
      rationale: `Inputs include contradictory context: ${contradictionFlags.slice(0, 3).join("; ")}.`,
      improvementSuggestions: [
        "Reconcile the contradictory inputs (owner claim vs evidence, or two evidence sources).",
        "Mark the authoritative source so the AI knows which signal to trust.",
      ],
    };
  }
  if (!coreRequiredSatisfied && missingCount >= 2) {
    return {
      label: "low",
      rationale: "Core required context for this surface is genuinely missing.",
      improvementSuggestions: missingContext
        .slice(0, 5)
        .map((m) => `Provide or approve: ${m}.`),
    };
  }

  // HIGH ceiling: strong signals + verified evidence + clean safety + no gaps.
  const strongEvidence = verifiedEvidenceCount >= 1 || ladderScore >= 3;
  if (
    coreRequiredSatisfied &&
    approvedSignalCount >= 2 &&
    strongEvidence &&
    safetyStatus === "passed" &&
    missingCount === 0
  ) {
    return {
      label: "high",
      rationale: "Multiple approved signals plus verified evidence with a clean safety check.",
      improvementSuggestions: [],
    };
  }

  // MEDIUM is the normal-quality floor: usable, but with room to harden.
  const suggestions: string[] = [];
  if (approvedSignalCount < 2) {
    suggestions.push("Approve at least two supporting signals (Scorecard, Diagnostic, Repair Map, etc.) to lift to HIGH.");
  }
  if (verifiedEvidenceCount < 1 && !allowMediumWithoutVerifiedProof) {
    suggestions.push("Attach at least one verified, customer-specific piece of evidence to lift to HIGH.");
  }
  if (missingCount > 0) {
    suggestions.push(`Resolve ${missingCount} missing-context item(s): ${missingContext.slice(0, 3).join("; ")}.`);
  }
  if (safetyStatus === "needs_review") {
    suggestions.push("Resolve safety review flags so the safety checker passes cleanly.");
  }

  return {
    label: "medium",
    rationale: "Inputs are partial but usable; operational reasoning is supported with caveats.",
    improvementSuggestions: suggestions,
  };
}

/**
 * A typed missing-input slot. Tools describe what they need; the kernel
 * generates operator-readable questions for whatever is absent.
 */
export interface MissingInputSlot {
  /** Stable machine key. */
  key: string;
  /** Whether this input is currently present and usable. */
  present: boolean;
  /** Operator-readable question used when `present === false`. */
  prompt: string;
}

export function buildMissingInputQuestions(
  slots: readonly MissingInputSlot[],
  extraMissingContext: readonly string[] = [],
): string[] {
  const out: string[] = [];
  for (const slot of slots) {
    if (!slot.present) out.push(slot.prompt);
  }
  for (const item of extraMissingContext) {
    out.push(`Please clarify missing context: ${item}`);
  }
  return out;
}

export interface NextBestActionInputs {
  confidence: ConfidenceLabel;
  safetyStatus: SafetyStatus;
  missingQuestionsCount: number;
  /** When true, force escalate even if safety/missing inputs look clean. */
  requiresAdminReview?: boolean;
}

export function decideNextBestAction(inputs: NextBestActionInputs): NextBestAction {
  if (inputs.safetyStatus === "blocked") return "rework_for_safety";
  if (inputs.safetyStatus === "needs_review" || inputs.requiresAdminReview) {
    return "escalate_for_admin_review";
  }
  if (inputs.confidence === "low" || inputs.missingQuestionsCount > 0) {
    return "request_more_inputs";
  }
  return "proceed";
}

/**
 * Returns true when the kernel says the current outputs are safe to surface
 * to a client (subject to tool-specific approval gating).
 */
export function isClientSafeForSurface(
  confidence: ConfidenceLabel,
  safetyStatus: SafetyStatus,
): boolean {
  return safetyStatus === "passed" && confidence !== "low";
}