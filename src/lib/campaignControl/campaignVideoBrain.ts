/**
 * P98 — Campaign Video Brain (Phase 1).
 *
 * Wraps the existing Campaign Control AI architecture rather than
 * introducing a new brain. Generates two structured artifacts:
 *
 *   1. Video outline (compact narrative spec for human review).
 *   2. Remotion-ready scene plan (structured spec a renderer can consume).
 *
 * Both outputs always include:
 *   - confidence_level
 *   - confidence_reason
 *   - missing_inputs[]
 *   - risk_warnings[]
 *
 * AI is NEVER allowed to mark an asset approved or to claim that a real
 * render exists. Approval and render execution happen elsewhere through
 * the status machine and the render job table.
 */

import type {
  CampaignAssetDraft,
  CampaignBrief,
  CampaignProfile,
  CampaignConfidence,
} from "./types";

export type CampaignVideoFormat =
  | "vertical_short_form"
  | "square_social"
  | "landscape_web";

export interface VideoBrainContext {
  profile?: Pick<
    CampaignProfile,
    | "industry"
    | "target_audiences"
    | "primary_offers"
    | "brand_voice_notes"
    | "preferred_cta_types"
    | "forbidden_claims"
    | "channel_preferences"
  > | null;
  brief: Pick<
    CampaignBrief,
    | "objective"
    | "target_audience"
    | "offer_service_line"
    | "channel_platform"
    | "funnel_stage"
    | "cta"
    | "client_safe_notes"
    | "evidence_confidence"
  >;
  asset: Pick<
    CampaignAssetDraft,
    "title" | "platform" | "asset_type" | "client_safe_explanation" | "draft_content"
  >;
}

export interface VideoOutline {
  title: string;
  objective: string;
  target_viewer: string;
  buyer_stage: string;
  platform_use_case: string;
  core_message: string;
  emotional_angle: string;
  practical_angle: string;
  opening_hook: string;
  scenes_summary: string[];
  cta: string;
  risk_notes: string[];
  missing_inputs: string[];
  confidence_level: CampaignConfidence;
  confidence_reason: string;
}

export interface VideoScene {
  index: number;
  on_screen_text: string;
  voiceover: string;
  visual_direction: string;
  motion_direction: string;
  transition_in: string;
  assets_needed: string[];
}

export interface RemotionScenePlan {
  title: string;
  format: CampaignVideoFormat;
  aspect_ratio: string;
  duration_seconds_range: [number, number];
  scenes: VideoScene[];
  cta_scene: VideoScene;
  captions: string;
  accessibility_notes: string;
  brand_style_notes: string;
  claim_safety_notes: string;
  human_review_checklist: string[];
  missing_inputs: string[];
  risk_warnings: string[];
  confidence_level: CampaignConfidence;
  confidence_reason: string;
}

const PLATFORM_FORMAT_HINTS: Record<string, { format: CampaignVideoFormat; aspect: string; range: [number, number] }> = {
  meta_ads: { format: "square_social", aspect: "1:1", range: [15, 30] },
  organic_social: { format: "vertical_short_form", aspect: "9:16", range: [15, 45] },
  linkedin: { format: "landscape_web", aspect: "16:9", range: [30, 90] },
  email: { format: "landscape_web", aspect: "16:9", range: [30, 60] },
  seo: { format: "landscape_web", aspect: "16:9", range: [45, 120] },
  google_ads: { format: "landscape_web", aspect: "16:9", range: [15, 30] },
};

function pickFormat(channel: string | undefined | null) {
  const hint = channel ? PLATFORM_FORMAT_HINTS[channel] : undefined;
  return hint ?? { format: "vertical_short_form" as CampaignVideoFormat, aspect: "9:16", range: [15, 30] as [number, number] };
}

function collectMissing(ctx: VideoBrainContext): string[] {
  const missing: string[] = [];
  if (!ctx.brief.objective) missing.push("Campaign objective is missing.");
  if (!ctx.brief.target_audience) missing.push("Target audience is missing.");
  if (!ctx.brief.offer_service_line) missing.push("Offer / service line is missing.");
  if (!ctx.brief.channel_platform) missing.push("Target platform / channel is missing.");
  if (!ctx.brief.cta) missing.push("CTA destination is missing.");
  if (!ctx.asset.draft_content) missing.push("Approved campaign asset content is missing.");
  if (!ctx.profile?.brand_voice_notes) missing.push("Brand voice / personality setting is missing.");
  if (!ctx.profile?.target_audiences || ctx.profile.target_audiences.length === 0) {
    missing.push("Buyer persona has not been confirmed.");
  }
  return missing;
}

function deriveConfidence(missing: string[], brief: VideoBrainContext["brief"]): {
  level: CampaignConfidence;
  reason: string;
} {
  if (missing.length === 0 && brief.evidence_confidence === "high") {
    return { level: "high", reason: "All required campaign inputs are present and the source brief carries high evidence confidence." };
  }
  if (missing.length <= 2) {
    return {
      level: "medium",
      reason: missing.length === 0
        ? "All required inputs are present; brief evidence confidence is moderate."
        : `Most inputs are present. Missing: ${missing.slice(0, 2).join(" ")}`,
    };
  }
  return {
    level: "low",
    reason: `Several required inputs are missing (${missing.length}). Human review is required before any approval.`,
  };
}

function safeRiskNotes(ctx: VideoBrainContext): string[] {
  const notes: string[] = [];
  notes.push("No platform publishing is connected in this phase. Video is for manual upload only.");
  notes.push("Do not include guaranteed outcomes, viral language, or claims that imply RGS posts on the client's behalf.");
  if (ctx.profile?.forbidden_claims && ctx.profile.forbidden_claims.length) {
    notes.push(
      `Forbidden claims to avoid in this account: ${ctx.profile.forbidden_claims.join(", ")}.`,
    );
  }
  return notes;
}

/**
 * Deterministic outline. AI-assisted enhancement happens server-side
 * through the existing Campaign Control generation path; this baseline
 * runs synchronously so the UI and tests can rely on a stable shape.
 */
export function generateVideoOutline(ctx: VideoBrainContext): VideoOutline {
  const missing = collectMissing(ctx);
  const conf = deriveConfidence(missing, ctx.brief);
  const channel = String(ctx.brief.channel_platform ?? "");
  const titleSource = ctx.asset.title || ctx.brief.objective || "Campaign video";

  return {
    title: `${titleSource} — video draft`,
    objective: ctx.brief.objective || "(Objective missing)",
    target_viewer: ctx.brief.target_audience || "(Target viewer missing)",
    buyer_stage: ctx.brief.funnel_stage || "awareness",
    platform_use_case: channel || "(Platform missing)",
    core_message: ctx.asset.client_safe_explanation || ctx.brief.client_safe_notes || "Operational clarity over hype.",
    emotional_angle: "Calm, owner-respecting, evidence-grounded.",
    practical_angle: ctx.brief.offer_service_line || "(Offer missing)",
    opening_hook: ctx.asset.draft_content
      ? ctx.asset.draft_content.split(/[\n.]/).filter(Boolean)[0]?.slice(0, 140) ?? "(Hook missing)"
      : "(Hook missing — approved content required)",
    scenes_summary: [
      "Hook + audience callout",
      "Specific problem framed honestly",
      "What RGS actually does (no guarantees)",
      "Single clear CTA",
    ],
    cta: ctx.brief.cta || "(CTA missing)",
    risk_notes: safeRiskNotes(ctx),
    missing_inputs: missing,
    confidence_level: conf.level,
    confidence_reason: conf.reason,
  };
}

/**
 * Remotion-ready scene plan. Structured so a future Remotion runner can
 * consume it directly; today it is reviewed and approved by a human.
 */
export function generateRemotionScenePlan(
  outline: VideoOutline,
  ctx: VideoBrainContext,
): RemotionScenePlan {
  const channel = String(ctx.brief.channel_platform ?? "");
  const fmt = pickFormat(channel);
  const missing = collectMissing(ctx);
  const conf = deriveConfidence(missing, ctx.brief);

  const scenes: VideoScene[] = [
    {
      index: 1,
      on_screen_text: outline.opening_hook,
      voiceover: outline.opening_hook,
      visual_direction: "Tight shot, single subject, calm and grounded — no stock imagery.",
      motion_direction: "Slow ease-in from 95% to 100% scale; subtle vertical drift.",
      transition_in: "Cut",
      assets_needed: ["Owner-on-camera or operator B-roll", "Brand wordmark"],
    },
    {
      index: 2,
      on_screen_text: outline.target_viewer,
      voiceover: `For ${outline.target_viewer}.`,
      visual_direction: "Type-only frame with brand accent rule.",
      motion_direction: "Stagger reveal per line (12–18 frames apart).",
      transition_in: "Crossfade",
      assets_needed: ["Brand typography", "Accent rule"],
    },
    {
      index: 3,
      on_screen_text: outline.core_message,
      voiceover: outline.core_message,
      visual_direction: "Split frame: copy left, supporting evidence visual right.",
      motion_direction: "Parallax — foreground type drifts 4px, background drifts 12px.",
      transition_in: "Wipe from left",
      assets_needed: ["Evidence visual (chart, document, screenshot)"],
    },
    {
      index: 4,
      on_screen_text: outline.practical_angle,
      voiceover: `What this looks like: ${outline.practical_angle}.`,
      visual_direction: "Numbered list reveal — practical, specific.",
      motion_direction: "Springy per-item reveal (damping 18, stiffness 180).",
      transition_in: "Cut",
      assets_needed: ["Iconography matching brand"],
    },
  ];

  const cta_scene: VideoScene = {
    index: scenes.length + 1,
    on_screen_text: outline.cta,
    voiceover: outline.cta,
    visual_direction: "Full-bleed brand color, large CTA text, no buttons (this is video).",
    motion_direction: "Type-on reveal; subtle pulse at end.",
    transition_in: "Crossfade",
    assets_needed: ["Brand wordmark", "Final destination URL displayed as text"],
  };

  return {
    title: outline.title,
    format: fmt.format,
    aspect_ratio: fmt.aspect,
    duration_seconds_range: fmt.range,
    scenes,
    cta_scene,
    captions:
      "Burned-in captions required for short-form social formats. Use brand sans-serif at 4% screen height minimum.",
    accessibility_notes:
      "All voiceover content must be reflected in on-screen text or captions. Maintain WCAG AA contrast on type frames.",
    brand_style_notes:
      ctx.profile?.brand_voice_notes ||
      "Calm, direct, premium, owner-respecting, evidence-grounded — never hype or generic AI tone.",
    claim_safety_notes:
      "Do not include guaranteed leads, revenue, profit, ROI, ranking, or growth claims. Do not imply RGS posts or schedules content.",
    human_review_checklist: [
      "Confirm every claim is supported by approved Campaign Control evidence.",
      "Confirm no forbidden claims appear in voiceover or on-screen text.",
      "Confirm CTA destination matches approved brief CTA.",
      "Confirm format / aspect / duration match the intended platform.",
      "Confirm brand voice and accessibility standards are met.",
    ],
    missing_inputs: missing,
    risk_warnings: safeRiskNotes(ctx),
    confidence_level: conf.level,
    confidence_reason: conf.reason,
  };
}

/**
 * Contract: AI may produce a plan but MUST NOT mark approval. Used by
 * tests + UI to ensure no path lets the brain self-approve.
 */
export const VIDEO_BRAIN_FORBIDDEN_ACTIONS = [
  "approve",
  "mark_ready_for_export",
  "mark_manual_publish_ready",
  "mark_exported",
] as const;