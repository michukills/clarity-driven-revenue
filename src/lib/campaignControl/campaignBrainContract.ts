import { z } from "zod";
import { checkCampaignSafety, type CampaignSafetyResult } from "./campaignSafety";
import {
  classifyConfidence,
  decideNextBestAction as kernelDecideNextBestAction,
  buildMissingInputQuestions as kernelBuildMissingInputQuestions,
  type ConfidenceLabel as KernelConfidenceLabel,
  type NextBestAction as KernelNextBestAction,
} from "@/lib/aiConfidence";

export const CAMPAIGN_BRAIN_CONTRACT_VERSION = "p95-campaign-brain-contract-v1";

export const ConfidenceLabelSchema = z.enum(["high", "medium", "low"]);
export type ConfidenceLabel = KernelConfidenceLabel;

export const ApprovedSignalSchema = z.object({
  signal_type: z.string().min(1),
  summary: z.string().min(1),
  approved: z.boolean(),
  source: z.string().optional(),
  confidence: ConfidenceLabelSchema.optional(),
});
export type ApprovedSignal = z.infer<typeof ApprovedSignalSchema>;

export const CampaignBrainInputSchema = z.object({
  customer: z.object({
    id: z.string().optional(),
    business_name: z.string().nullable().optional(),
    industry: z.string().nullable().optional(),
  }),
  objective: z.string().optional(),
  approved_signals: z.array(ApprovedSignalSchema).default([]),
  approved_persona: z
    .object({ name: z.string().min(1), summary: z.string().optional() })
    .nullable()
    .optional(),
  approved_proof: z
    .array(
      z.object({
        label: z.string().min(1),
        verified: z.boolean(),
        source: z.string().optional(),
      }),
    )
    .default([]),
  scorecard: z
    .object({
      total_score: z.number().nullable().optional(),
      confidence: ConfidenceLabelSchema.nullable().optional(),
    })
    .nullable()
    .optional(),
  diagnostic_refs: z.array(z.string()).default([]),
  repair_map_refs: z.array(z.string()).default([]),
  channel_preferences: z.array(z.string()).default([]),
  missing_context: z.array(z.string()).default([]),
  raw_copy_to_check: z.string().optional(),
});
export type CampaignBrainInput = z.input<typeof CampaignBrainInputSchema>;
export type ParsedCampaignBrainInput = z.output<typeof CampaignBrainInputSchema>;

export const NextBestActionSchema = z.enum([
  "draft_assets",
  "request_more_inputs",
  "rework_for_safety",
  "escalate_for_admin_review",
]);
export type NextBestAction = z.infer<typeof NextBestActionSchema>;

export const CampaignBrainOutputSchema = z.object({
  contract_version: z.literal(CAMPAIGN_BRAIN_CONTRACT_VERSION),
  confidence_label: ConfidenceLabelSchema,
  confidence_rationale: z.string().min(1),
  approved_signal_summary: z.string(),
  missing_context: z.array(z.string()),
  missing_input_questions: z.array(z.string()),
  safety_status: z.enum(["passed", "needs_review", "blocked"]),
  safety_issues: z.array(z.object({ issue_type: z.string(), severity: z.string(), matched_text: z.string() })),
  next_best_action: NextBestActionSchema,
  client_safe_explanation: z.string(),
  admin_only_rationale: z.string(),
  approval_required: z.literal(true),
});
export type CampaignBrainOutput = z.infer<typeof CampaignBrainOutputSchema>;

const CORE_REQUIRED_KEYS = ["approved_persona", "approved_signals", "objective"] as const;

export interface ConfidenceDecision {
  label: ConfidenceLabel;
  rationale: string;
}

export function decideConfidence(
  input: ParsedCampaignBrainInput,
  safety: CampaignSafetyResult,
): ConfidenceDecision {
  const approvedSignalCount = input.approved_signals.filter((s) => s.approved).length;
  const verifiedEvidenceCount = input.approved_proof.filter((p) => p.verified).length;
  const hasPersona = !!input.approved_persona?.name;
  const hasObjective = !!input.objective && input.objective.trim().length > 0;
  const coreRequiredSatisfied = hasObjective && hasPersona && approvedSignalCount > 0;
  const contradictionFlags = input.missing_context.filter((m) => /contradict/i.test(m));

  const decision = classifyConfidence({
    approvedSignalCount,
    verifiedEvidenceCount,
    coreRequiredSatisfied,
    missingContext: input.missing_context,
    contradictionFlags,
    safetyStatus: safety.status,
  });

  // Map kernel rationales to Campaign-Brain phrasing the contract callers expect.
  let rationale = decision.rationale;
  if (decision.label === "low" && safety.status === "blocked") {
    rationale = "Safety check blocked the copy; cannot raise confidence.";
  } else if (decision.label === "low" && contradictionFlags.length > 0) {
    rationale = "Inputs include contradictory context.";
  } else if (decision.label === "low") {
    rationale = "Core required context (objective, approved persona, or approved signals) is genuinely missing.";
  } else if (decision.label === "high") {
    rationale = "Strong approved signals, persona, verified proof, and clean safety check.";
  } else {
    rationale = "Inputs are partial but usable; some approved context is present.";
  }

  return { label: decision.label, rationale };
}

export function buildMissingInputQuestions(input: ParsedCampaignBrainInput): string[] {
  return kernelBuildMissingInputQuestions(
    [
      {
        key: "approved_signals",
        present: input.approved_signals.some((s) => s.approved),
        prompt: "Which approved campaign signals (Scorecard, Diagnostic, Repair Map) should this campaign use?",
      },
      {
        key: "approved_persona",
        present: !!input.approved_persona?.name,
        prompt: "Which approved buyer persona is this campaign aimed at?",
      },
      {
        key: "approved_proof",
        present: input.approved_proof.some((p) => p.verified),
        prompt: "Is there verified, customer-specific proof we can reference, or should the draft avoid proof claims?",
      },
      {
        key: "objective",
        present: !!input.objective && input.objective.trim().length > 0,
        prompt: "What is the specific business objective for this campaign?",
      },
    ],
    input.missing_context,
  );
}

function decideNextBestAction(
  confidence: ConfidenceLabel,
  safety: CampaignSafetyResult,
  missingQuestions: string[],
): NextBestAction {
  const action: KernelNextBestAction = kernelDecideNextBestAction({
    confidence,
    safetyStatus: safety.status,
    missingQuestionsCount: missingQuestions.length,
  });
  // Map the kernel's generic "proceed" action onto Campaign Brain's "draft_assets".
  return action === "proceed" ? "draft_assets" : (action as NextBestAction);
}

export function evaluateCampaignBrain(rawInput: unknown): CampaignBrainOutput {
  const input = CampaignBrainInputSchema.parse(rawInput);
  const safety = checkCampaignSafety(input.raw_copy_to_check ?? "");
  const confidence = decideConfidence(input, safety);
  const missingQuestions = buildMissingInputQuestions(input);
  const nextBestAction = decideNextBestAction(confidence.label, safety, missingQuestions);

  const approvedSignalSummary = input.approved_signals.filter((s) => s.approved).length
    ? `${input.approved_signals.filter((s) => s.approved).length} approved signal(s) available.`
    : "No approved signals supplied.";

  return CampaignBrainOutputSchema.parse({
    contract_version: CAMPAIGN_BRAIN_CONTRACT_VERSION,
    confidence_label: confidence.label,
    confidence_rationale: confidence.rationale,
    approved_signal_summary: approvedSignalSummary,
    missing_context: input.missing_context,
    missing_input_questions: missingQuestions,
    safety_status: safety.status,
    safety_issues: safety.issues.map((i) => ({
      issue_type: i.issue_type,
      severity: i.severity,
      matched_text: i.matched_text,
    })),
    next_best_action: nextBestAction,
    client_safe_explanation:
      safety.status === "passed"
        ? "Draft inputs reviewed against approved signals and safety rules. Admin review still required."
        : "Inputs need review before drafting can proceed.",
    admin_only_rationale: confidence.rationale,
    approval_required: true,
  });
}
