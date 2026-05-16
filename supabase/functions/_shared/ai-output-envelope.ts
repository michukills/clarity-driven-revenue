/**
 * P103C — Shared edge-compatible AI output envelope.
 *
 * Deno-compatible mirror of the structured output envelope contract
 * defined by the P103 kernel. Edge functions can use this to validate
 * AI outputs at the boundary before persisting or returning to clients.
 *
 * Compatibility wrapper: callers may still return legacy shapes. This
 * utility is opt-in; it never mutates the caller's output unless the
 * caller asks for the client-safe envelope.
 */

export const AI_OUTPUT_ENVELOPE_VERSION = "p103c-ai-output-envelope-v1";

export type ConfidenceLabel = "low" | "medium" | "high";

export type EvidenceTier =
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
  confidence_level: ConfidenceLabel;
  confidence_reason: string;
  missing_inputs: string[];
  evidence_basis: EvidenceTier[];
  assumptions: string[];
  risk_warnings: string[];
  claim_safety_warnings: string[];
  human_review_required: true;
  client_safe_output: boolean;
  admin_review_notes?: string;
  output_schema_version: typeof AI_OUTPUT_ENVELOPE_VERSION;
}

export interface AiOutputValidationIssue {
  field: string;
  problem: string;
}

export interface AiOutputValidationResult {
  valid: boolean;
  issues: AiOutputValidationIssue[];
  clientSafeEnvelope?: Omit<AiOutputEnvelope, "admin_review_notes">;
}

const VAGUE_MISSING_INPUT = [
  /^\s*more\s+context\s*\.?\s*$/i,
  /^\s*more\s+data\s*\.?\s*$/i,
  /^\s*more\s+info(?:rmation)?\s*\.?\s*$/i,
  /^\s*additional\s+(?:context|data|info(?:rmation)?)\s*\.?\s*$/i,
  /^\s*business\s+info(?:rmation)?\s*\.?\s*$/i,
  /^\s*customer\s+info(?:rmation)?\s*\.?\s*$/i,
  /^\s*metrics?\s*\.?\s*$/i,
  /^\s*context\s*\.?\s*$/i,
  /^\s*data\s*\.?\s*$/i,
  /^\s*details?\s*\.?\s*$/i,
];

export function isVagueMissingInput(item: string): boolean {
  if (!item || item.trim().length < 6) return true;
  return VAGUE_MISSING_INPUT.some((re) => re.test(item));
}

const PRIORITY_BANNED_CLAIMS = [
  /\bguaranteed\s+(?:revenue|profit|roi|leads?|rankings?|growth|virality|outcomes?)\b/i,
  /\bautomatic(?:ally)?\s+post(?:ing|ed)?\b/i,
  /\bauto[-\s]?post(?:ing|ed)?\b/i,
  /\bauto[-\s]?schedul(?:e|ing|ed)\b/i,
  /\blive\s+analytics?\b/i,
  /\bdone[-\s]?for[-\s]?you\b/i,
  /\bcompliance\s+certifi(?:ed|cation)\b/i,
  /\bmedical\s+advice\b/i,
];

export function validateAiOutputEnvelope(
  env: AiOutputEnvelope,
): AiOutputValidationResult {
  const issues: AiOutputValidationIssue[] = [];
  if (!env.title?.trim()) issues.push({ field: "title", problem: "missing title" });
  if (!env.summary?.trim()) issues.push({ field: "summary", problem: "missing summary" });
  if (env.human_review_required !== true) {
    issues.push({ field: "human_review_required", problem: "AI may not bypass human review" });
  }
  for (const item of env.missing_inputs ?? []) {
    if (isVagueMissingInput(item)) {
      issues.push({ field: "missing_inputs", problem: `vague missing input rejected: "${item}"` });
    }
  }
  if (env.confidence_level === "low") {
    if (!env.confidence_reason || env.confidence_reason.trim().length < 20) {
      issues.push({ field: "confidence_reason", problem: "low confidence requires a specific reason (>= 20 chars)" });
    }
    if ((env.missing_inputs ?? []).filter((x) => !isVagueMissingInput(x)).length === 0) {
      issues.push({ field: "missing_inputs", problem: "low confidence requires at least one specific missing input" });
    }
  }
  if (!env.recommended_next_actions || env.recommended_next_actions.length === 0) {
    issues.push({ field: "recommended_next_actions", problem: "at least one concrete next action is required" });
  }
  const scanFields = [env.title, env.summary, env.confidence_reason, ...(env.recommended_next_actions ?? [])]
    .filter(Boolean)
    .join("\n");
  for (const re of PRIORITY_BANNED_CLAIMS) {
    const m = scanFields.match(re);
    if (m) issues.push({ field: "claim_safety", problem: `banned claim: "${m[0]}"` });
  }

  let clientSafeEnvelope: Omit<AiOutputEnvelope, "admin_review_notes"> | undefined;
  if (env.client_safe_output) {
    const { admin_review_notes: _ignored, ...rest } = env;
    clientSafeEnvelope = rest;
  }

  return { valid: issues.length === 0, issues, clientSafeEnvelope };
}

/**
 * P103D — Helper to build a well-formed AI output envelope from light
 * hints. Centralizes safe defaults so each edge function does not
 * hand-construct envelope fields.
 *
 * Returns the envelope plus any validation issues. Callers should NOT
 * block on issues unless the surface explicitly requires it; the
 * envelope is attached for transparency alongside legacy fields.
 */
export interface EnvelopeMetaInput {
  title: string;
  summary: string;
  surface: string;
  recommended_next_actions?: string[];
  confidence_level?: ConfidenceLabel;
  confidence_reason?: string;
  missing_inputs?: string[];
  evidence_basis?: EvidenceTier[];
  assumptions?: string[];
  risk_warnings?: string[];
  claim_safety_warnings?: string[];
  /** Whether the output is safe to render to a non-admin client. */
  client_safe_output?: boolean;
  /** Admin-only notes. Stripped automatically when client_safe_output=true. */
  admin_review_notes?: string;
}

export function buildAiOutputEnvelopeMeta(input: EnvelopeMetaInput): {
  envelope: AiOutputEnvelope;
  validation: AiOutputValidationResult;
} {
  const clientSafe = input.client_safe_output ?? false;
  const env: AiOutputEnvelope = {
    title: input.title || `${input.surface} AI draft`,
    summary: input.summary || `AI-assisted draft from ${input.surface}. Admin review required before any client-visible use.`,
    recommended_next_actions:
      input.recommended_next_actions && input.recommended_next_actions.length > 0
        ? input.recommended_next_actions
        : ["Admin reviews this AI draft for accuracy, voice, and scope before any client-visible publish."],
    confidence_level: input.confidence_level ?? "medium",
    confidence_reason:
      input.confidence_reason ||
      "AI used the supplied admin context; confidence is medium pending human review of evidence.",
    missing_inputs: input.missing_inputs ?? [],
    evidence_basis: input.evidence_basis ?? ["structured_interview_claim"],
    assumptions: input.assumptions ?? [],
    risk_warnings: input.risk_warnings ?? [],
    claim_safety_warnings: input.claim_safety_warnings ?? [],
    human_review_required: true,
    client_safe_output: clientSafe,
    admin_review_notes: clientSafe ? undefined : input.admin_review_notes,
    output_schema_version: AI_OUTPUT_ENVELOPE_VERSION,
  };
  const validation = validateAiOutputEnvelope(env);
  return { envelope: env, validation };
}

/**
 * Attach a normalized AI output envelope to a legacy response payload.
 * Preserves all existing fields so current frontend consumers do not break.
 * When the surface is client-facing, admin_review_notes is always stripped.
 */
export function attachAiOutputEnvelope<T extends Record<string, unknown>>(
  legacyPayload: T,
  input: EnvelopeMetaInput,
): T & { ai_output_envelope: Omit<AiOutputEnvelope, "admin_review_notes"> | AiOutputEnvelope } {
  const { envelope } = buildAiOutputEnvelopeMeta(input);
  if (envelope.client_safe_output) {
    const { admin_review_notes: _drop, ...clientSafe } = envelope;
    return { ...legacyPayload, ai_output_envelope: clientSafe };
  }
  return { ...legacyPayload, ai_output_envelope: envelope };
}