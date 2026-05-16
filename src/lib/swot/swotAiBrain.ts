// RGS SWOT Strategic Matrix — AI assist brain (readiness-only).
//
// This file describes what the AI assist *may* do and what it *must not* do.
// It is intentionally readiness-only: the deterministic engine and downstream
// signals do not depend on AI being wired. When live AI is connected later,
// it must respect this contract.

export const SWOT_AI_BRAIN_VERSION = "swot.brain.v1";

import {
  buildAiContextEnvelope,
  buildPriorityPromptPreamble,
} from "@/lib/ai/aiOutputQualityKernel";

export const SWOT_AI_ALLOWED = [
  "draft_swot_items_from_owner_intake",
  "summarize_evidence",
  "suggest_gear_mapping",
  "suggest_missing_evidence",
  "suggest_client_safe_wording",
  "suggest_downstream_signal_relevance",
  "identify_possible_contradictions",
  "suggest_questions_for_admin_review",
] as const;

export const SWOT_AI_FORBIDDEN = [
  "override_deterministic_scoring",
  "invent_evidence",
  "mark_evidence_verified",
  "publish_findings_without_admin_review",
  "make_legal_tax_accounting_compliance_or_valuation_conclusions",
  "promise_revenue_profit_growth_or_outcomes",
  "leak_admin_only_notes",
  "use_other_customers_data",
] as const;

/** Returns true once the platform safely wires SWOT AI assist. */
export function isSwotAiLive(): boolean {
  return false;
}

export const SWOT_AI_READINESS_LABEL =
  "AI assist is not live. The SWOT engine and signals run deterministically.";

export const SWOT_AI_DRAFT_LABEL = "AI draft — review required";

/** System-level instructions for any future SWOT AI assist call. */
export const SWOT_AI_SYSTEM_PROMPT = `
You are an RGS SWOT assist. You may draft SWOT items, summarize evidence,
suggest gear mapping, suggest missing evidence, suggest client-safe wording,
and suggest downstream signal relevance.

You must not override deterministic scoring, invent evidence, mark evidence
verified, publish findings without admin review, make legal, tax, accounting,
compliance, or valuation conclusions, promise revenue, profit, growth, or
outcomes, leak admin-only notes, or use any other customer's data.

Cannabis or MMJ context is operational and documentation visibility only,
not regulatory or compliance certification.

Every output is an "AI draft" until an admin reviews and approves it.
`.trim();

/**
 * P103B — Wire the SWOT brain to the P103 priority kernel preamble.
 * Future live AI wiring must prepend this preamble to the system prompt.
 */
export function buildSwotAiPrompt(): string {
  const env = buildAiContextEnvelope({
    task_type: "swot_strategic_matrix",
    tool_key: "swot_strategic_matrix",
    customer_type: "full_client",
  });
  return [buildPriorityPromptPreamble(env), "", SWOT_AI_SYSTEM_PROMPT].join("\n");
}