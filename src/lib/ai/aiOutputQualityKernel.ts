/**
 * P103 — High-Impact AI Output Quality Kernel.
 *
 * Shared, deterministic, additive quality layer for priority RGS AI
 * surfaces (Tool Report drafts, SOP / Training Bible, Buyer Persona /
 * ICP, SWOT Strategic Matrix, Campaign Brief / Strategy, Campaign Video
 * Plan, Workflow / Process Mapping).
 *
 * Composes existing primitives — does NOT duplicate them:
 *   - `@/lib/aiConfidence`         classifyConfidence, ConfidenceLabel, ...
 *   - `@/lib/gig/gigTier`          buildGigAiScopeContext, buildGigReportScopeMetadata
 *   - `@/lib/rgsAiSafety`          findForbiddenAiClaims
 *   - `@/lib/sopForbiddenPhrases`  findForbiddenSopPhrases
 *
 * This kernel never calls AI, never touches the network, never reads
 * Supabase. Surface-specific brains (campaignAiBrain, swotAiBrain,
 * sopTrainingBible, etc.) compose this with their own schemas.
 *
 * Boundary rules enforced by this kernel:
 *   - AI may draft / summarize / recommend / identify missing inputs.
 *   - AI may NOT approve reports, mark client_visible, verify evidence,
 *     override deterministic scoring, publish, schedule, or send.
 *   - Low confidence is never the default. It requires a hard reason.
 *   - Missing inputs must be specific and actionable.
 */

import {
  classifyConfidence,
  type ConfidenceDecision,
  type ConfidenceInputs,
  type ConfidenceLabel,
  type EvidenceQuality,
  type SafetyStatus,
} from "@/lib/aiConfidence";
import {
  buildGigAiScopeContext,
  buildGigReportScopeMetadata,
  detectUnsafeGigCopy,
  type GigAiScopeContext,
  type GigReportScopeMetadata,
  type GigTier,
} from "@/lib/gig/gigTier";
import { findForbiddenAiClaims } from "@/lib/rgsAiSafety";
import { findForbiddenSopPhrases } from "@/lib/sopForbiddenPhrases";

export const AI_OUTPUT_QUALITY_KERNEL_VERSION = "p103-ai-output-quality-kernel-v1";

/* -------------------------------------------------------------------------
 * Task types — priority AI surfaces in this pass.
 * --------------------------------------------------------------------- */

export type RgsAiTaskType =
  | "tool_report_draft"
  | "sop_training_bible"
  | "buyer_persona_icp"
  | "swot_strategic_matrix"
  | "campaign_brief"
  | "campaign_strategy"
  | "campaign_video_plan"
  | "workflow_process_mapping"
  | "decision_rights"
  | "goals_kpi_plan";

/**
 * Task-specific role definitions. These replace generic
 * "helpful assistant" prompting on priority surfaces.
 */
export const RGS_AI_TASK_ROLES: Record<RgsAiTaskType, string> = {
  tool_report_draft:
    "You are the RGS Report Writer. Convert approved tool output into a polished, client-safe deliverable within the allowed report scope. Do not exceed the allowed sections for this report mode.",
  sop_training_bible:
    "You are the RGS Operational Procedure Architect. Turn approved workflow context into a clear, trainable, owner-independent SOP that a team member can follow without guessing.",
  buyer_persona_icp:
    "You are the RGS Market Clarity Analyst. Define the best-fit customer using evidence, offer context, pain points, buying triggers, objections, and channel fit.",
  swot_strategic_matrix:
    "You are the RGS Strategic Pattern Analyst. Identify operationally relevant strengths, weaknesses, opportunities, and threats without hype or generic filler.",
  campaign_brief:
    "You are the RGS Campaign Strategy Director. Turn approved business context into campaign strategy, message direction, assets, and manual execution guidance without implying posting, scheduling, analytics, paid ads, or guaranteed outcomes.",
  campaign_strategy:
    "You are the RGS Campaign Strategy Director. Turn approved business context into campaign strategy, message direction, assets, and manual execution guidance without implying posting, scheduling, analytics, paid ads, or guaranteed outcomes.",
  campaign_video_plan:
    "You are the RGS Campaign Video Producer. Turn approved campaign context into a video outline and Remotion-ready scene plan for human review. Do not claim rendering or publishing unless those systems are actually wired.",
  workflow_process_mapping:
    "You are the RGS Workflow Architecture Analyst. Identify handoffs, bottlenecks, rework loops, owner dependencies, and missing accountability in the process.",
  decision_rights:
    "You are the RGS Decision Rights Analyst. Map who decides, who is consulted, and who is accountable for each operational decision without inventing org structure.",
  goals_kpi_plan:
    "You are the RGS Goals & Measurement Analyst. Translate approved business context into a small set of measurable, owner-actionable goals and indicators. No guarantees.",
};

/* -------------------------------------------------------------------------
 * RGS / Matt voice — banned phrases.
 * --------------------------------------------------------------------- */

/** Hype / generic / AI-filler phrases that must not appear in priority outputs. */
export const RGS_BANNED_VOICE_PHRASES: ReadonlyArray<RegExp> = [
  /\bunlock\b/i,
  /\bsupercharge\b/i,
  /\brevolutionize\b/i,
  /\bgame[-\s]?changing\b/i,
  /\bgame[-\s]?changer\b/i,
  /\bskyrocket\b/i,
  /\bdominate\b/i,
  /\b10x\b/i,
  /\bexplosive\s+growth\b/i,
  /\bguaranteed\b/i,
  /\bas\s+an\s+ai\b/i,
  /\bin\s+today's\s+fast[-\s]?paced\b/i,
  /\bbest\s+practices?\b/i,
  /\bcutting[-\s]?edge\b/i,
  /\bworld[-\s]?class\b/i,
  /\bnext[-\s]?level\b/i,
];

export interface VoiceViolation {
  field: string;
  phrase: string;
}

/** Detect banned voice phrases across a record of named string fields. */
export function detectVoiceViolations(
  fields: Record<string, string | null | undefined>,
): VoiceViolation[] {
  const hits: VoiceViolation[] = [];
  for (const [field, raw] of Object.entries(fields)) {
    if (!raw) continue;
    for (const re of RGS_BANNED_VOICE_PHRASES) {
      const m = raw.match(re);
      if (m) hits.push({ field, phrase: m[0] });
    }
  }
  return hits;
}

/* -------------------------------------------------------------------------
 * Missing input specificity.
 * --------------------------------------------------------------------- */

/** Vague phrases that fail the specificity bar for missing inputs. */
export const VAGUE_MISSING_INPUT_PHRASES: ReadonlyArray<RegExp> = [
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
  return VAGUE_MISSING_INPUT_PHRASES.some((re) => re.test(item));
}

export interface MissingInputValidation {
  valid: string[];
  rejected: string[];
}

/** Split a missing-input list into specific (kept) and vague (rejected). */
export function validateMissingInputs(items: readonly string[]): MissingInputValidation {
  const valid: string[] = [];
  const rejected: string[] = [];
  for (const raw of items) {
    const item = (raw ?? "").toString().trim();
    if (!item) continue;
    if (isVagueMissingInput(item)) rejected.push(item);
    else valid.push(item);
  }
  return { valid, rejected };
}

/* -------------------------------------------------------------------------
 * Evidence hierarchy.
 *
 * The hierarchy below is the canonical P103 hierarchy. It maps onto the
 * existing `EvidenceQuality` ladder used by the P95X confidence kernel.
 * --------------------------------------------------------------------- */

export type EvidenceTier =
  | "verified_evidence"
  | "admin_observed"
  | "structured_interview_claim"
  | "owner_estimate"
  | "missing_evidence"
  | "contradiction";

export const EVIDENCE_TIER_ORDER: readonly EvidenceTier[] = [
  "verified_evidence",
  "admin_observed",
  "structured_interview_claim",
  "owner_estimate",
  "missing_evidence",
  "contradiction",
];

/** Map P103 evidence tiers onto P95X confidence-kernel evidence quality. */
const TIER_TO_QUALITY: Record<EvidenceTier, EvidenceQuality | null> = {
  verified_evidence: "verified",
  admin_observed: "admin_reviewed",
  structured_interview_claim: "owner_claim",
  owner_estimate: "owner_claim",
  missing_evidence: "missing",
  contradiction: null,
};

export function tierToEvidenceQuality(tier: EvidenceTier): EvidenceQuality | null {
  return TIER_TO_QUALITY[tier] ?? null;
}

export function isOwnerOnly(tier: EvidenceTier): boolean {
  return tier === "owner_estimate" || tier === "structured_interview_claim";
}

/* -------------------------------------------------------------------------
 * AI Context Envelope — what every priority surface must feed the model.
 * --------------------------------------------------------------------- */

export interface AiContextEnvelopeInput {
  task_type: RgsAiTaskType;
  tool_key: string;
  customer_type: "gig" | "full_client";
  lifecycle_stage?: string | null;
  industry?: string | null;
  gig_tier?: GigTier | null;
  client_visible?: boolean;
  /** Approved prior context (e.g. approved Scorecard, prior tool outputs). */
  approved_context?: Record<string, unknown>;
  /** Evidence summary classified by tier. */
  evidence_context?: Array<{ tier: EvidenceTier; label: string }>;
  /** Free-text source descriptions (uploaded files, connected sources). */
  source_context?: readonly string[];
}

export interface AiContextEnvelope {
  schema_version: typeof AI_OUTPUT_QUALITY_KERNEL_VERSION;
  task_type: RgsAiTaskType;
  task_role: string;
  tool_key: string;
  customer_type: "gig" | "full_client";
  lifecycle_stage: string | null;
  industry: string | null;
  gig_scope_context: GigAiScopeContext;
  report_scope_context: GigReportScopeMetadata;
  approved_context: Record<string, unknown>;
  evidence_context: Array<{ tier: EvidenceTier; label: string }>;
  source_context: readonly string[];
  hitl_boundary_notice: string;
  voice_notice: string;
}

export const HITL_BOUNDARY_NOTICE =
  "AI may draft, summarize, recommend, identify missing inputs, and flag contradictions. AI may not approve reports, mark client_visible, verify evidence, override deterministic scoring, publish, schedule, or send.";

export const RGS_VOICE_NOTICE =
  "Use the RGS voice: calm, direct, practical, premium, specific, evidence-grounded, owner-respecting. No hype, no 'as an AI', no generic filler, no guarantees.";

export function buildAiContextEnvelope(input: AiContextEnvelopeInput): AiContextEnvelope {
  const isGig = input.customer_type === "gig";
  const gig_scope_context = buildGigAiScopeContext({
    isGig,
    gigTier: input.gig_tier ?? null,
    toolKey: input.tool_key,
  });
  const report_scope_context = buildGigReportScopeMetadata({
    isGig,
    gigTier: input.gig_tier ?? null,
    toolKey: input.tool_key,
    clientVisible: input.client_visible,
  });
  return {
    schema_version: AI_OUTPUT_QUALITY_KERNEL_VERSION,
    task_type: input.task_type,
    task_role: RGS_AI_TASK_ROLES[input.task_type],
    tool_key: input.tool_key,
    customer_type: input.customer_type,
    lifecycle_stage: input.lifecycle_stage ?? null,
    industry: input.industry ?? null,
    gig_scope_context,
    report_scope_context,
    approved_context: input.approved_context ?? {},
    evidence_context: [...(input.evidence_context ?? [])],
    source_context: [...(input.source_context ?? [])],
    hitl_boundary_notice: HITL_BOUNDARY_NOTICE,
    voice_notice: RGS_VOICE_NOTICE,
  };
}

/* -------------------------------------------------------------------------
 * Confidence from evidence — composes the P95X classifier.
 * --------------------------------------------------------------------- */

export interface ConfidenceFromEvidenceInput {
  evidence: readonly EvidenceTier[];
  approvedSignalCount: number;
  coreRequiredSatisfied: boolean;
  missingContext?: readonly string[];
  safetyStatus?: SafetyStatus;
  /** True if no proof is strictly required for this surface. */
  allowMediumWithoutVerifiedProof?: boolean;
}

export interface ConfidenceResult extends ConfidenceDecision {
  evidence_basis: readonly EvidenceTier[];
}

export function confidenceFromEvidence(
  input: ConfidenceFromEvidenceInput,
): ConfidenceResult {
  const ladder: EvidenceQuality[] = [];
  let verifiedCount = 0;
  let nonOwnerStrong = 0;
  const contradictions: string[] = [];
  for (const tier of input.evidence) {
    if (tier === "contradiction") {
      contradictions.push("evidence contradiction flagged");
      continue;
    }
    const q = tierToEvidenceQuality(tier);
    if (q) ladder.push(q);
    if (tier === "verified_evidence") verifiedCount += 1;
    if (tier === "verified_evidence" || tier === "admin_observed") nonOwnerStrong += 1;
  }
  const inputs: ConfidenceInputs = {
    approvedSignalCount: input.approvedSignalCount,
    verifiedEvidenceCount: verifiedCount,
    coreRequiredSatisfied: input.coreRequiredSatisfied,
    missingContext: input.missingContext ?? [],
    contradictionFlags: contradictions,
    safetyStatus: input.safetyStatus ?? "passed",
    evidenceLadder: ladder,
    allowMediumWithoutVerifiedProof: input.allowMediumWithoutVerifiedProof,
  };
  let decision = classifyConfidence(inputs);
  // P103 rule: owner-only evidence (no verified + no admin_observed) may
  // never reach HIGH on its own, regardless of how many owner claims stack.
  if (decision.label === "high" && nonOwnerStrong === 0) {
    decision = {
      label: "medium",
      rationale:
        "Owner-claim evidence alone cannot support HIGH confidence. Add at least one verified or admin-observed signal.",
      improvementSuggestions: [
        "Attach a verified, customer-specific piece of evidence to lift to HIGH.",
        ...decision.improvementSuggestions,
      ],
    };
  }
  return { ...decision, evidence_basis: input.evidence };
}

/* -------------------------------------------------------------------------
 * AI output envelope — normalized output shape.
 * --------------------------------------------------------------------- */

export interface AiOutputEnvelope {
  title: string;
  summary: string;
  sections?: Array<{ heading: string; body: string }>;
  findings?: Array<{ label: string; detail: string }>;
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
  schema_version: typeof AI_OUTPUT_QUALITY_KERNEL_VERSION;
}

export interface AiOutputValidationIssue {
  field: string;
  problem: string;
}

export interface AiOutputValidationResult {
  valid: boolean;
  issues: AiOutputValidationIssue[];
  /**
   * If `client_safe_output` was true, this is the same envelope with
   * `admin_review_notes` stripped — never expose admin notes to clients.
   */
  clientSafeEnvelope?: Omit<AiOutputEnvelope, "admin_review_notes">;
}

/**
 * Validate an AI output envelope against P103 rules:
 *   - low confidence requires a non-generic reason + specific missing inputs
 *   - human_review_required must be true
 *   - vague missing inputs are rejected
 *   - admin_review_notes is stripped from client-safe outputs
 */
export function validateAiOutputEnvelope(env: AiOutputEnvelope): AiOutputValidationResult {
  const issues: AiOutputValidationIssue[] = [];

  if (!env.title?.trim()) issues.push({ field: "title", problem: "missing title" });
  if (!env.summary?.trim()) issues.push({ field: "summary", problem: "missing summary" });
  if (env.human_review_required !== true) {
    issues.push({
      field: "human_review_required",
      problem: "AI output may not bypass human review",
    });
  }

  // Missing-input specificity.
  const { rejected } = validateMissingInputs(env.missing_inputs ?? []);
  for (const r of rejected) {
    issues.push({
      field: "missing_inputs",
      problem: `vague missing input rejected: "${r}"`,
    });
  }

  // Low confidence guardrails.
  if (env.confidence_level === "low") {
    if (!env.confidence_reason || env.confidence_reason.trim().length < 20) {
      issues.push({
        field: "confidence_reason",
        problem: "low confidence requires a specific reason (>= 20 chars)",
      });
    }
    const genericLow =
      /(the\s+ai\s+is\s+not\s+sure|more\s+information\s+may\s+be\s+needed|limited\s+data|confidence\s+is\s+medium)/i;
    if (genericLow.test(env.confidence_reason ?? "")) {
      issues.push({
        field: "confidence_reason",
        problem: "generic low-confidence reason rejected",
      });
    }
    if ((env.missing_inputs ?? []).filter((x) => !isVagueMissingInput(x)).length === 0) {
      issues.push({
        field: "missing_inputs",
        problem: "low confidence requires at least one specific missing input",
      });
    }
  }

  // Recommendations must be concrete.
  if (!env.recommended_next_actions || env.recommended_next_actions.length === 0) {
    issues.push({
      field: "recommended_next_actions",
      problem: "at least one concrete next action is required",
    });
  }

  const valid = issues.length === 0;

  let clientSafeEnvelope: Omit<AiOutputEnvelope, "admin_review_notes"> | undefined;
  if (env.client_safe_output) {
    const { admin_review_notes: _ignored, ...rest } = env;
    clientSafeEnvelope = rest;
  }

  return { valid, issues, clientSafeEnvelope };
}

/* -------------------------------------------------------------------------
 * HITL boundary enforcement.
 * --------------------------------------------------------------------- */

export const HITL_FORBIDDEN_AI_ROLES: ReadonlyArray<string> = [
  "ai_approves_report",
  "ai_marks_client_visible",
  "ai_approves_campaign_asset",
  "ai_approves_video_asset",
  "ai_verifies_evidence",
  "ai_publishes",
  "ai_schedules",
  "ai_sends",
  "ai_overrides_deterministic_score",
];

export interface HitlIntent {
  action:
    | "draft"
    | "summarize"
    | "recommend"
    | "identify_missing_inputs"
    | "flag_contradiction"
    | "approve_report"
    | "mark_client_visible"
    | "approve_campaign_asset"
    | "approve_video_asset"
    | "verify_evidence"
    | "publish"
    | "schedule"
    | "send"
    | "override_score";
}

export function isHitlAllowed(intent: HitlIntent): boolean {
  return ["draft", "summarize", "recommend", "identify_missing_inputs", "flag_contradiction"].includes(
    intent.action,
  );
}

/* -------------------------------------------------------------------------
 * Claim safety — composes existing scanners + adds priority bans.
 * --------------------------------------------------------------------- */

/** Priority surface-level claims that are never safe regardless of context. */
export const PRIORITY_BANNED_CLAIMS: ReadonlyArray<RegExp> = [
  /\bguaranteed\s+(?:revenue|profit|roi|leads?|rankings?|growth|virality|outcomes?)\b/i,
  /\bautomatic(?:ally)?\s+post(?:ing|ed)?\b/i,
  /\bauto[-\s]?post(?:ing|ed)?\b/i,
  /\bauto[-\s]?schedul(?:e|ing|ed)\b/i,
  /\bschedul(?:e|ed|ing)\s+automatic(?:ally)?\b/i,
  /\bpost(?:ed|ing)?\s+automatic(?:ally)?\b/i,
  /\blive\s+analytics?\b/i,
  /\bdone[-\s]?for[-\s]?you\b/i,
  /\bfull[-\s]?service\s+marketing\s+management\b/i,
  /\bunlimited\s+support\b/i,
  /\bcompliance\s+certifi(?:ed|cation)\b/i,
  /\bmedical\s+advice\b/i,
  /\bdispensary\s+compliance\s+guarantee\b/i,
];

export interface ClaimSafetyIssue {
  field: string;
  phrase: string;
  source: "global" | "sop" | "priority" | "gig_scope" | "voice";
}

/** Run all priority-surface claim-safety scans on a set of named fields. */
export function enforceClaimSafety(
  fields: Record<string, string | null | undefined>,
): ClaimSafetyIssue[] {
  const issues: ClaimSafetyIssue[] = [];
  for (const h of findForbiddenAiClaims(fields)) {
    issues.push({ field: h.field, phrase: h.phrase, source: "global" });
  }
  for (const h of findForbiddenSopPhrases(fields)) {
    issues.push({ field: h.field, phrase: h.phrase, source: "sop" });
  }
  for (const [field, raw] of Object.entries(fields)) {
    if (!raw) continue;
    for (const re of PRIORITY_BANNED_CLAIMS) {
      const m = raw.match(re);
      if (m) issues.push({ field, phrase: m[0], source: "priority" });
    }
    for (const phrase of detectUnsafeGigCopy(raw)) {
      issues.push({ field, phrase, source: "gig_scope" });
    }
  }
  for (const v of detectVoiceViolations(fields)) {
    issues.push({ field: v.field, phrase: v.phrase, source: "voice" });
  }
  return issues;
}

/* -------------------------------------------------------------------------
 * Convenience: build a prompt preamble for any priority surface.
 * --------------------------------------------------------------------- */

export function buildPriorityPromptPreamble(env: AiContextEnvelope): string {
  const lines: string[] = [];
  lines.push(env.task_role);
  lines.push("");
  lines.push(env.voice_notice);
  lines.push(env.hitl_boundary_notice);
  if (env.gig_scope_context.gig_mode) {
    lines.push(
      `Gig mode is ON. Tier: ${env.gig_scope_context.gig_tier ?? "unset"}. ` +
        `Depth: ${env.gig_scope_context.allowed_depth}. ` +
        `Excluded RGS sections: ${env.gig_scope_context.excluded_full_rgs_sections.join(", ") || "none"}.`,
    );
    for (const lim of env.gig_scope_context.scope_limitations) lines.push(`- ${lim}`);
  } else {
    lines.push("Full client mode. Preserve full RGS depth within report scope.");
  }
  lines.push("");
  lines.push("Confidence rules:");
  lines.push("- HIGH only when structured context plus verified or admin-observed evidence supports it.");
  lines.push("- MEDIUM when context is usable but partially owner-claimed or incomplete.");
  lines.push("- LOW only when evidence is genuinely sparse, contradictory, or unsafe to infer.");
  lines.push("- Do not default to LOW. Explain WHY plus WHAT IS MISSING plus HOW TO IMPROVE.");
  lines.push("");
  lines.push("Missing inputs must be specific (e.g. 'POS category margin report'), not vague ('more data').");
  return lines.join("\n");
}