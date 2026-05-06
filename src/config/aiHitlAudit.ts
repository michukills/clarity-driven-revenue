/**
 * P86 Part 7 — AI Governance / HITL Verification Audit Trail.
 *
 * AI may assist admin review only. AI never verifies evidence. AI never
 * scores. AI never certifies compliance. Verification is blocked unless
 * the admin explicitly confirms cross-checking the AI output against
 * the raw document.
 */

export const HITL_CONFIRMATION_TEXT =
  "I have cross-referenced the AI summary with the raw PDF.";

export type HitlAiTaskType =
  | "summarize"
  | "interpret"
  | "classify"
  | "draft"
  | "other";

export const HITL_AI_TASK_TYPES: ReadonlyArray<HitlAiTaskType> = [
  "summarize",
  "interpret",
  "classify",
  "draft",
  "other",
];

export const HITL_CLIENT_SAFE_PHRASE =
  "RGS reviewed this evidence using admin-controlled review procedures.";

export interface HitlVerificationGate {
  ai_assistance_used: boolean;
  raw_document_cross_checked: boolean;
  confirmation_text: string;
}

export interface HitlGateResult {
  may_mark_verified: boolean;
  reason: string;
}

/**
 * Deterministic gate: if AI was used, verification is only permitted
 * when raw_document_cross_checked is true AND confirmation_text matches
 * the canonical HITL_CONFIRMATION_TEXT exactly.
 */
export function evaluateHitlGate(input: HitlVerificationGate): HitlGateResult {
  if (!input.ai_assistance_used) {
    return { may_mark_verified: true, reason: "no_ai_used" };
  }
  if (!input.raw_document_cross_checked) {
    return { may_mark_verified: false, reason: "ai_used_without_cross_check" };
  }
  if ((input.confirmation_text ?? "").trim() !== HITL_CONFIRMATION_TEXT) {
    return { may_mark_verified: false, reason: "confirmation_text_mismatch" };
  }
  return { may_mark_verified: true, reason: "ai_used_with_confirmed_cross_check" };
}

/** AI never scores, verifies, or certifies. Used in tests + UI copy. */
export const HITL_AI_FORBIDDEN_ROLES: ReadonlyArray<string> = [
  "ai_verifies_evidence",
  "ai_scores",
  "ai_certifies_compliance",
  "ai_marks_verified_alone",
];