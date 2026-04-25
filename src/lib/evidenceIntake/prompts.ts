/**
 * P13.EvidenceIntake.H.1 — Hardened evidence-intake system prompts.
 *
 * This module is the single source of truth for the *guardrails* used by
 * the public scorecard, the diagnostic interview, and the report draft
 * engine. It intentionally contains NO network calls and adds NO paid AI
 * cost. The strings exported here serve two purposes:
 *
 *   1. Documentation for any future admin-triggered AI scoring or
 *      report generation. When/if those calls are wired, they MUST use
 *      these system prompts verbatim so behavior stays consistent.
 *
 *   2. Runtime-readable rule constants the deterministic engines and
 *      UI hints can import (e.g. clarification prompts surfaced when an
 *      answer is vague), so the trust contract is enforced in code, not
 *      just in the prompt copy.
 *
 * Trust contract (applies to ALL three surfaces):
 *   • Owner-reported is never the same as validated.
 *   • Demo / showcase data is never described as a real client outcome.
 *   • Confidence drops when answers are vague, missing, contradictory,
 *     or purely estimated.
 *   • Recommendations require a tied cause + tied evidence.
 *   • The public scorecard is preliminary and self-reported. The
 *     diagnostic interview maps evidence — it does not recommend. Report
 *     drafts are admin-reviewed before any client-facing surface.
 */

export const EVIDENCE_INTAKE_VERSION = "evidence-intake.v1" as const;

/** Canonical labels admins and engines should use to tag any data point. */
export type EvidenceTier =
  | "owner_reported"   // claim made by the owner without source data
  | "system_tracked"   // pulled from a system but not yet admin-reviewed
  | "admin_validated"  // reviewed by RGS admin against source data
  | "missing";         // no information available

export const EVIDENCE_TIER_LABEL: Record<EvidenceTier, string> = {
  owner_reported: "Owner-reported",
  system_tracked: "System-tracked",
  admin_validated: "Admin-validated",
  missing: "Missing / unverified",
};

/**
 * Universal clarification prompts. Engines use these whenever a freeform
 * answer is shorter than the strong threshold OR scored as low evidence.
 * They are intentionally generic so they can be applied across pillars.
 */
export const CLARIFICATION_PROMPTS: readonly string[] = [
  "Is that tracked, estimated, or based on experience?",
  "Would you say closer to 20%, 50%, or 80%?",
  "What system or report would prove that?",
  "Where would this show up — books, CRM, calendar, payroll, or job system?",
  "Roughly how often does this happen — weekly, monthly, or only when things go wrong?",
] as const;

/**
 * Minimum answer length (chars) below which an answer is treated as
 * vague and a clarification prompt should be surfaced. Kept conservative
 * so we never block submission, only nudge.
 */
export const VAGUE_ANSWER_MIN_CHARS = 30;

/**
 * Returns up to N clarification prompts a UI/engine can offer for a
 * specific answer. Deterministic and side-effect free.
 */
export function clarificationPromptsFor(
  answer: string | null | undefined,
  max = 3,
): string[] {
  const trimmed = (answer ?? "").trim();
  if (trimmed.length === 0) {
    // Nothing typed yet — only ask the most generic two.
    return CLARIFICATION_PROMPTS.slice(0, Math.min(max, 2));
  }
  if (trimmed.length >= VAGUE_ANSWER_MIN_CHARS) return [];
  return CLARIFICATION_PROMPTS.slice(0, max);
}

/**
 * Internal system prompt for the Diagnostic Interview. Used as a
 * documentation contract today and (if wired) as the system prompt for
 * an admin-triggered AI pass. The deterministic engine in
 * `src/lib/diagnosticInterview/engine.ts` already enforces these rules
 * structurally (no recommendations, evidence map per claim, owner
 * dependency signal, validation source needed).
 */
export const DIAGNOSTIC_INTERVIEW_SYSTEM_PROMPT = `
You are the RGS Diagnostic Interview engine.

Your job is to extract evidence — NOT to give advice, NOT to finalize
conclusions, and NOT to recommend tools or actions during the interview.

For every claim the owner makes, you must extract:
  • claim                       — what the owner said, in their words
  • area                        — one of the 5 RGS pillars: Demand
                                  Generation, Revenue Conversion,
                                  Operational Efficiency, Financial
                                  Visibility, Owner Independence
  • evidence_source             — what system, report, or document would
                                  prove or disprove the claim
  • tracked_or_estimated        — "tracked", "estimated", or "experience"
  • confidence                  — low / medium / high (drop a tier when
                                  the claim is owner-reported with no
                                  source data, contradictory to other
                                  answers, or only described in feel)
  • missing_data                — what is NOT available that would
                                  validate or contradict the claim
  • contradiction_risk          — note any other answer in the same run
                                  that appears to disagree
  • owner_dependency_signal     — does the answer suggest the owner is
                                  the system?
  • validation_source_needed    — the next concrete data step

Hard rules:
  • Never recommend a tool, vendor, or action inside the interview.
  • Never describe demo/showcase data as a real client outcome.
  • If the answer is short, vague, contradictory, or purely estimated,
    confidence MUST drop and you MUST list missing_data and a
    validation_source_needed.
  • Use plain English. Mirror the owner's language where possible.
  • Separate "owner-reported" from "validated" in every output. They are
    not interchangeable.

Output is consumed by an RGS admin. The admin — not you — decides what
becomes a recommendation, and what reaches the client.
`.trim();

/**
 * Internal system prompt for the Report Draft generator. The
 * deterministic engine in `src/lib/reports/draftEngine.ts` already
 * enforces these rules (every finding has issue + cause + evidence +
 * confidence + missing data; sections are tagged client_safe; admin
 * review is required before any client-facing publish).
 */
export const REPORT_GENERATION_SYSTEM_PROMPT = `
You are the RGS Report Draft generator.

Your job is to turn an EvidenceSnapshot into a structured admin-reviewed
draft. You do NOT publish to clients. You do NOT invent evidence. You do
NOT imply certainty where evidence is weak.

Every finding MUST contain:
  • issue                — one short sentence
  • what_is_happening    — observed behavior, in plain English
  • why_it_appears       — the most likely cause given the evidence
  • evidence             — the concrete sources from the snapshot
  • confidence           — low / medium / high
  • missing_data         — what would tighten or contradict this finding

Every recommendation MUST tie to:
  • a cause from the findings
  • the evidence that supports the cause
  • a single RGS pillar it strengthens
  • a confidence tier

Hard rules:
  • Plain English. Specific to this business. No generic advice.
  • Never imply a real-client outcome from demo / showcase data.
  • Never imply certainty when evidence is owner-reported only.
  • Always separate owner-reported, system-tracked, admin-validated,
    and missing in any data table or callout.
  • Always include a Missing Information section, even if short.
  • Default every section to admin-only. Only mark client_safe = true
    when the content is honest, validated, and safe for the client to
    read without an admin walkthrough.
`.trim();

/**
 * Public Scorecard trust copy. The public scorecard UI imports these
 * strings so the wording stays consistent across pages. Changing copy
 * here updates every surface that references it.
 */
export const PUBLIC_SCORECARD_TRUST_COPY = {
  preliminary_label: "Preliminary",
  self_reported_label: "Self-reported",
  not_a_diagnosis: "Not a final diagnosis.",
  validation_promise:
    "RGS would validate this against your real revenue, cash, and operating evidence before recommending any action.",
} as const;

/**
 * Per-finding required fields. Engines and reviewers use this to verify
 * a finding has the minimum trust shape before being considered complete.
 */
export const FINDING_REQUIRED_FIELDS = [
  "issue",
  "what_is_happening",
  "why_it_appears",
  "evidence",
  "confidence",
  "missing_data",
] as const;

export type FindingRequiredField = typeof FINDING_REQUIRED_FIELDS[number];

/**
 * Validates that a finding-shaped object has every required field
 * populated with a non-empty string / non-empty array. Returns the list
 * of missing fields (empty = valid).
 */
export function findingMissingFields(
  f: Partial<Record<FindingRequiredField, unknown>>,
): FindingRequiredField[] {
  const missing: FindingRequiredField[] = [];
  for (const k of FINDING_REQUIRED_FIELDS) {
    const v = f[k];
    if (v == null) {
      missing.push(k);
      continue;
    }
    if (typeof v === "string" && v.trim().length === 0) missing.push(k);
    else if (Array.isArray(v) && v.length === 0) missing.push(k);
  }
  return missing;
}
