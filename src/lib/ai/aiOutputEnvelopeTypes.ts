/**
 * P103E — Shared client-side types and helpers for AI Output Envelope.
 *
 * Mirrors the shape attached by the P103D edge helper
 * (`supabase/functions/_shared/ai-output-envelope.ts`). This file is
 * intentionally type-only at runtime — it never imports from
 * `supabase/functions/*` (Deno) and never imports React.
 *
 * The envelope is OPTIONAL: legacy responses that pre-date P103D simply
 * omit it. UI consumers must render a safe fallback when missing.
 */

export type AiOutputEnvelopeConfidenceLevel = "low" | "medium" | "high";

export type AiOutputEnvelopeEvidenceTier =
  | "verified_evidence"
  | "admin_observed"
  | "structured_interview_claim"
  | "owner_estimate"
  | "missing_evidence"
  | "contradiction";

export interface AiOutputEnvelope {
  title: string;
  summary: string;
  sections?: Array<{ heading: string; body: string }>;
  recommended_next_actions: string[];
  confidence_level: AiOutputEnvelopeConfidenceLevel;
  confidence_reason: string;
  missing_inputs: string[];
  evidence_basis: AiOutputEnvelopeEvidenceTier[];
  assumptions: string[];
  risk_warnings: string[];
  claim_safety_warnings: string[];
  human_review_required: true;
  client_safe_output: boolean;
  /** Admin-only. Edge helper auto-strips this when client_safe_output. */
  admin_review_notes?: string;
  output_schema_version: string;
}

/**
 * Safe extractor. Returns `null` for any payload that does not look like
 * a P103D envelope. Never throws.
 */
export function extractAiOutputEnvelope(
  payload: unknown,
): AiOutputEnvelope | null {
  if (!payload || typeof payload !== "object") return null;
  const direct = (payload as { ai_output_envelope?: unknown })
    .ai_output_envelope;
  const env = direct ?? (payload as Partial<AiOutputEnvelope>);
  if (!env || typeof env !== "object") return null;
  const e = env as Partial<AiOutputEnvelope>;
  if (
    typeof e.confidence_level !== "string" ||
    !["low", "medium", "high"].includes(e.confidence_level) ||
    typeof e.output_schema_version !== "string"
  ) {
    return null;
  }
  return {
    title: typeof e.title === "string" ? e.title : "AI-assisted draft",
    summary: typeof e.summary === "string" ? e.summary : "",
    sections: Array.isArray(e.sections) ? e.sections : undefined,
    recommended_next_actions: Array.isArray(e.recommended_next_actions)
      ? e.recommended_next_actions.filter((x): x is string => typeof x === "string")
      : [],
    confidence_level: e.confidence_level as AiOutputEnvelopeConfidenceLevel,
    confidence_reason:
      typeof e.confidence_reason === "string" ? e.confidence_reason : "",
    missing_inputs: Array.isArray(e.missing_inputs)
      ? e.missing_inputs.filter((x): x is string => typeof x === "string")
      : [],
    evidence_basis: Array.isArray(e.evidence_basis)
      ? (e.evidence_basis.filter(
          (x): x is AiOutputEnvelopeEvidenceTier => typeof x === "string",
        ) as AiOutputEnvelopeEvidenceTier[])
      : [],
    assumptions: Array.isArray(e.assumptions)
      ? e.assumptions.filter((x): x is string => typeof x === "string")
      : [],
    risk_warnings: Array.isArray(e.risk_warnings)
      ? e.risk_warnings.filter((x): x is string => typeof x === "string")
      : [],
    claim_safety_warnings: Array.isArray(e.claim_safety_warnings)
      ? e.claim_safety_warnings.filter((x): x is string => typeof x === "string")
      : [],
    human_review_required: true,
    client_safe_output: Boolean(e.client_safe_output),
    admin_review_notes:
      typeof e.admin_review_notes === "string" ? e.admin_review_notes : undefined,
    output_schema_version: e.output_schema_version,
  };
}

/** Human-readable confidence copy. Never implies guarantee. */
export const AI_ENVELOPE_CONFIDENCE_COPY: Record<
  AiOutputEnvelopeConfidenceLevel,
  string
> = {
  high: "Strongly supported by the available context.",
  medium: "Usable, but some context or evidence is incomplete.",
  low: "Limited by missing, contradictory, or high-risk context.",
};

export const AI_ENVELOPE_EVIDENCE_TIER_LABEL: Record<
  AiOutputEnvelopeEvidenceTier,
  string
> = {
  verified_evidence: "Verified evidence",
  admin_observed: "Admin-observed",
  structured_interview_claim: "Structured interview claim",
  owner_estimate: "Owner estimate",
  missing_evidence: "Missing evidence",
  contradiction: "Contradiction",
};