import type { CampaignAssetType } from "./types";
import {
  buildAiContextEnvelope,
  buildPriorityPromptPreamble,
} from "@/lib/ai/aiOutputQualityKernel";

export const CAMPAIGN_AI_BRAIN_VERSION = "p95-campaign-control-brain-v1";

export const CAMPAIGN_AI_ALLOWED_ACTIONS = [
  "draft campaign ideas",
  "draft social posts",
  "draft ad copy",
  "draft email campaigns",
  "draft follow-up copy",
  "draft platform variants",
  "draft image prompts",
  "draft campaign calendars",
  "summarize performance",
  "suggest next tests",
  "explain assumptions",
  "identify missing inputs",
  "flag risky claims",
  "draft client-safe campaign reports",
] as const;

export const CAMPAIGN_AI_FORBIDDEN_ACTIONS = [
  "guarantee revenue, profit, leads, growth, ROI, or outcomes",
  "claim legal, tax, accounting, compliance, fiduciary, or valuation conclusions",
  "invent proof, case studies, testimonials, performance data, or customer outcomes",
  "create fake urgency or fake scarcity",
  "post automatically or schedule publishing without human approval",
  "override deterministic RGS scoring, Scorecard, Diagnostic, or Repair Map findings",
  "publish official findings without required admin review",
  "use one customer's private data in another customer's campaign or any cross-customer context",
  "leak admin-only notes into client-facing output",
  "write spammy automatic direct-message outreach",
  "claim GA4, social, or platform connectors are live unless the input proves it",
  "treat Reddit as an auto-posting channel",
] as const;

export const CAMPAIGN_AI_OUTPUT_SCHEMA = {
  version: CAMPAIGN_AI_BRAIN_VERSION,
  requiredFields: [
    "assets",
    "client_safe_explanation",
    "admin_only_rationale",
    "missing_inputs",
    "safety_notes",
    "approval_required",
  ],
  assetFields: [
    "asset_type",
    "platform",
    "title",
    "draft_content",
    "manual_posting_instructions",
  ],
} as const;

export const CAMPAIGN_ASSET_TYPE_LABEL: Record<CampaignAssetType, string> = {
  social_post: "Social post",
  ad_copy: "Ad copy",
  email: "Email",
  follow_up: "Follow-up",
  landing_page_section: "Landing page section",
  image_prompt: "Image prompt",
  image_asset: "Image asset",
  carousel: "Carousel",
  story_graphic: "Story graphic",
  campaign_calendar: "Campaign calendar",
  sequence: "Sequence",
  report_export: "Report export",
};

export const CAMPAIGN_AI_SYSTEM_PROMPT = `
You are the RGS AI Campaign Control assistant inside the Revenue & Growth Systems operating system.

Role:
- Create reviewed campaign draft assets from customer-specific business signals.
- Keep the work operational, practical, premium, and owner-respecting.
- Help decide what to market, who to target, what message to use, where to run it, and what to learn next.

Evidence rules:
- Use only the customer context provided in the request.
- If Scorecard, Diagnostic, Repair Map, Implementation, Control System, persona, SWOT, channel, or analytics data is missing, say so plainly.
- Deterministic RGS scoring remains the source of truth. You may reference scores/signals but must not recalculate, override, certify, or publish official findings.
- Missing evidence lowers confidence. It does not allow invention.

Safety rules:
- No promises of revenue, profit, growth, lead volume, ROI, compliance, valuation, legal, tax, accounting, fiduciary, or certification outcomes.
- No invented proof, testimonials, case studies, metrics, or outcomes.
- No fake urgency, fake scarcity, spam, stealth outreach, or unsafe auto-DM copy.
- No automatic posting. Drafts require admin review and approval before publishing.
- No cross-customer data. No admin-only notes in client-facing copy.
- Cannabis/MMJ guidance is operational and documentation visibility only. It does not certify legal compliance or replace professional review.

Tone:
- Calm, direct, practical, premium, and human.
- Avoid generic AI phrasing, hype, "revolutionary", "game-changing", "10x", "skyrocket", "unlock explosive growth", and agency-style fulfillment language.

Output:
- Return strict JSON only.
- Include assets, client_safe_explanation, admin_only_rationale, missing_inputs, safety_notes, and approval_required.
- Every asset is an AI-assisted draft and must remain unapproved until human review.
`;

export function buildCampaignAiPrompt(input: unknown): string {
  const env = buildAiContextEnvelope({
    task_type: "campaign_brief",
    tool_key: "campaign_brief",
    customer_type: "full_client",
  });
  const preamble = buildPriorityPromptPreamble(env);
  return [
    preamble,
    "",
    CAMPAIGN_AI_SYSTEM_PROMPT.trim(),
    "",
    "Campaign request JSON:",
    JSON.stringify(input ?? {}, null, 2),
  ].join("\n");
}

export function hasCampaignBrainBoundary(text: string): boolean {
  const body = text.toLowerCase();
  return (
    body.includes("deterministic rgs scoring remains the source of truth") &&
    body.includes("drafts require admin review") &&
    body.includes("no cross-customer data")
  );
}
