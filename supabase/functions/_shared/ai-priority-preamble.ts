/**
 * P103B — Edge-function mirror of the P103 AI Output Quality Kernel
 * priority prompt preamble.
 *
 * Edge functions cannot import from `src/`, so this module mirrors the
 * exact shape of `src/lib/ai/aiOutputQualityKernel.ts` for the priority
 * surfaces: campaign_brief, campaign_video_plan, tool_report_draft,
 * sop_training_bible, buyer_persona_icp, workflow_process_mapping,
 * swot_strategic_matrix. The two files are intentionally kept in sync
 * by P103B contract tests.
 *
 * This file is deterministic. No AI call. No network. No Supabase.
 */

export const AI_PRIORITY_PREAMBLE_VERSION = "p103b-ai-priority-preamble-v1";

export type RgsAiPriorityTaskType =
  | "tool_report_draft"
  | "sop_training_bible"
  | "buyer_persona_icp"
  | "swot_strategic_matrix"
  | "campaign_brief"
  | "campaign_video_plan"
  | "workflow_process_mapping";

export const RGS_AI_PRIORITY_ROLES: Record<RgsAiPriorityTaskType, string> = {
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
  campaign_video_plan:
    "You are the RGS Campaign Video Producer. Turn approved campaign context into a video outline and Remotion-ready scene plan for human review. Do not claim rendering or publishing unless those systems are actually wired.",
  workflow_process_mapping:
    "You are the RGS Workflow Architecture Analyst. Identify handoffs, bottlenecks, rework loops, owner dependencies, and missing accountability in the process.",
};

export const RGS_VOICE_NOTICE =
  "Use the RGS voice: calm, direct, practical, premium, specific, evidence-grounded, owner-respecting. No hype, no 'as an AI', no generic filler, no guarantees.";

export const HITL_BOUNDARY_NOTICE =
  "AI may draft, summarize, recommend, identify missing inputs, and flag contradictions. AI may not approve reports, mark client_visible, verify evidence, override deterministic scoring, publish, schedule, or send.";

export interface AiPriorityPreambleInput {
  task_type: RgsAiPriorityTaskType;
  tool_key?: string;
  customer_type?: "gig" | "full_client";
  gig_tier?: "basic" | "standard" | "premium" | null;
  industry?: string | null;
  lifecycle_stage?: string | null;
  allowed_sections?: readonly string[];
  excluded_sections?: readonly string[];
}

/**
 * Builds the deterministic preamble injected at the top of priority
 * AI prompts. Mirrors `buildPriorityPromptPreamble` in the kernel.
 */
export function buildAiPriorityPreamble(input: AiPriorityPreambleInput): string {
  const lines: string[] = [];
  lines.push(RGS_AI_PRIORITY_ROLES[input.task_type]);
  lines.push("");
  lines.push(RGS_VOICE_NOTICE);
  lines.push(HITL_BOUNDARY_NOTICE);
  lines.push("");

  if (input.tool_key) lines.push(`Tool key: ${input.tool_key}.`);
  if (input.industry) lines.push(`Industry: ${input.industry}.`);
  if (input.lifecycle_stage) lines.push(`Lifecycle stage: ${input.lifecycle_stage}.`);

  if (input.customer_type === "gig") {
    const tier = input.gig_tier ?? "unset";
    lines.push(
      `Gig mode is ON. Tier: ${tier}. Stay within purchased deliverable scope. ` +
        "Do not include full Diagnostic, Owner Interview, full Repair Map, " +
        "Implementation Roadmap, Control System, or Revenue & Risk Monitor sections. " +
        "Do not promise ongoing RGS Control System or unlimited support.",
    );
    if (input.allowed_sections && input.allowed_sections.length > 0) {
      lines.push(`Allowed report sections: ${input.allowed_sections.join(", ")}.`);
    }
    if (input.excluded_sections && input.excluded_sections.length > 0) {
      lines.push(`Excluded report sections: ${input.excluded_sections.join(", ")}.`);
    }
  } else if (input.customer_type === "full_client") {
    lines.push("Full client mode. Preserve full RGS depth within report scope.");
  }

  lines.push("");
  lines.push("Confidence rules:");
  lines.push("- HIGH only when structured context plus verified or admin-observed evidence supports it.");
  lines.push("- MEDIUM when context is usable but partially owner-claimed or incomplete.");
  lines.push("- LOW only when evidence is genuinely sparse, contradictory, or unsafe to infer.");
  lines.push("- Do not default to LOW. Explain WHY plus WHAT IS MISSING plus HOW TO IMPROVE.");
  lines.push("");
  lines.push(
    "Missing inputs must be specific (e.g. 'POS category margin report', 'Owner-approved target customer segment', 'Documented handoff owner'), not vague ('more data', 'more context', 'business information').",
  );
  lines.push("");
  lines.push("Evidence hierarchy (use in this order):");
  lines.push("1. verified_evidence  2. admin_observed  3. structured_interview_claim  4. owner_estimate  5. missing_evidence  6. contradiction.");
  lines.push("Owner claims are not verified facts. AI cannot mark evidence verified. AI cannot override deterministic scoring. Contradictions require admin review.");
  lines.push("");
  lines.push(
    "Claim safety: never claim guaranteed revenue/profit/ROI/leads/rankings/growth/virality, legal/tax/accounting/compliance/fiduciary/valuation certification, cannabis compliance certification, medical or health claims, fake live analytics, automatic posting/scheduling, paid ads execution, or done-for-you operations.",
  );
  return lines.join("\n");
}

/** Canonical kernel version signature used by P103B contract tests. */
export const AI_PRIORITY_PREAMBLE_SIGNATURE =
  "p103-ai-output-quality-kernel-v1";