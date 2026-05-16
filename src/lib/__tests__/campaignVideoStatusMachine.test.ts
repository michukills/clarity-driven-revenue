import { describe, it, expect } from "vitest";
import {
  isAssetEligibleForVideo,
  transitionCampaignVideo,
  MANUAL_PUBLISH_READY_CLARIFICATION,
  type CampaignVideoState,
} from "../campaignControl/campaignVideoStatusMachine";
import {
  generateVideoOutline,
  generateRemotionScenePlan,
  VIDEO_BRAIN_FORBIDDEN_ACTIONS,
} from "../campaignControl/campaignVideoBrain";

const base: CampaignVideoState = {
  video_status: "scene_plan_ready",
  approval_status: "draft",
  manual_publish_status: "not_ready",
  has_outline: true,
  has_scene_plan: true,
  has_render_output: false,
};

describe("P98 — campaign video eligibility", () => {
  it("blocks draft assets", () => {
    expect(isAssetEligibleForVideo({ approval_status: "draft" }).ok).toBe(false);
  });
  it("blocks rejected/archived", () => {
    expect(isAssetEligibleForVideo({ approval_status: "rejected" }).code).toBe("asset_rejected");
    expect(isAssetEligibleForVideo({ approval_status: "archived" }).code).toBe("asset_archived");
  });
  it("allows approved", () => {
    expect(isAssetEligibleForVideo({ approval_status: "approved" }).ok).toBe(true);
  });
});

describe("P98 — video status machine", () => {
  it("AI cannot approve (no actor_user_id)", () => {
    const r = transitionCampaignVideo(base, "approve", { is_ai_actor: true });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("ai_cannot_approve");
  });
  it("human can approve when outline + scene plan exist", () => {
    const r = transitionCampaignVideo(base, "approve", { actor_user_id: "u1" });
    expect(r.ok).toBe(true);
  });
  it("scene plan requires outline", () => {
    const r = transitionCampaignVideo({ ...base, has_outline: false }, "generate_scene_plan");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("outline_required");
  });
  it("render requires scene plan", () => {
    const r = transitionCampaignVideo({ ...base, has_scene_plan: false }, "request_render");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("scene_plan_required");
  });
  it("mark_ready_for_export requires approved + real render output", () => {
    const draftApproved = { ...base, approval_status: "approved" as const };
    const r1 = transitionCampaignVideo(draftApproved, "mark_ready_for_export");
    expect(r1.ok).toBe(false);
    if (!r1.ok) expect(r1.code).toBe("render_not_ready");
    const withOutput = { ...draftApproved, has_render_output: true };
    expect(transitionCampaignVideo(withOutput, "mark_ready_for_export").ok).toBe(true);
  });
  it("manual_publish_ready requires ready_for_manual_export first", () => {
    const r = transitionCampaignVideo(
      { ...base, approval_status: "approved", manual_publish_status: "not_ready" },
      "mark_manual_publish_ready",
    );
    expect(r.ok).toBe(false);
  });
  it("manual_publish_ready clarification is not posted/scheduled/live", () => {
    const lower = MANUAL_PUBLISH_READY_CLARIFICATION.toLowerCase();
    expect(lower).not.toMatch(/posted|scheduled|live|published/);
    expect(lower).toContain("manual");
  });
  it("archived is terminal", () => {
    const r = transitionCampaignVideo({ ...base, approval_status: "archived" }, "approve", { actor_user_id: "u1" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("archived_terminal");
  });
});

describe("P98 — video brain AI contract", () => {
  const ctx = {
    profile: { brand_voice_notes: "calm", target_audiences: ["ops leaders"], forbidden_claims: ["guaranteed ROI"] } as any,
    brief: {
      objective: "Awareness",
      target_audience: "Operators",
      offer_service_line: "Diagnostic",
      channel_platform: "organic_social",
      funnel_stage: "awareness",
      cta: "Book diagnostic",
      client_safe_notes: "",
      evidence_confidence: "medium" as const,
    },
    asset: {
      title: "Why operators stall",
      platform: "organic_social",
      asset_type: "social_post" as const,
      client_safe_explanation: "Frame the operational problem honestly.",
      draft_content: "Most operators don't have a clear view of where revenue is leaking.",
    },
  };

  it("outline includes confidence + missing inputs + risk notes", () => {
    const o = generateVideoOutline(ctx);
    expect(o.confidence_level).toBeDefined();
    expect(o.confidence_reason.length).toBeGreaterThan(0);
    expect(Array.isArray(o.missing_inputs)).toBe(true);
    expect(o.risk_notes.some((n) => n.toLowerCase().includes("manual upload only"))).toBe(true);
  });

  it("scene plan includes confidence, missing_inputs, risk_warnings, review checklist", () => {
    const o = generateVideoOutline(ctx);
    const p = generateRemotionScenePlan(o, ctx);
    expect(p.confidence_level).toBeDefined();
    expect(p.confidence_reason.length).toBeGreaterThan(0);
    expect(p.missing_inputs).toBeDefined();
    expect(p.risk_warnings.length).toBeGreaterThan(0);
    expect(p.human_review_checklist.length).toBeGreaterThan(0);
    expect(p.scenes.length).toBeGreaterThan(0);
    expect(p.cta_scene.on_screen_text).toContain("Book diagnostic");
  });

  it("brain forbidden actions list never includes generation", () => {
    expect(VIDEO_BRAIN_FORBIDDEN_ACTIONS).toContain("approve");
    expect(VIDEO_BRAIN_FORBIDDEN_ACTIONS).toContain("mark_manual_publish_ready");
    expect(VIDEO_BRAIN_FORBIDDEN_ACTIONS as readonly string[]).not.toContain("generate_outline");
  });
});

describe("P98 — no fake posting/scheduling/analytics copy", () => {
  it("UI source for admin + portal video components is honest", async () => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const files = [
      "src/components/campaignControl/CampaignVideoPanel.tsx",
      "src/components/campaignControl/CampaignVideoPortalCard.tsx",
    ];
    const banned = [
      /\bauto-post(ed|ing)?\b/i,
      /\bscheduled to\b/i,
      /\bgo(es)? live\b/i,
      /\bplatform synced\b/i,
      /\bperformance tracked\b/i,
      /\bguaranteed (leads|revenue|profit|roi|growth|virality|rankings)\b/i,
      /\bviral\b/i,
      /\b10x\b/i,
    ];
    for (const f of files) {
      const src = await fs.readFile(path.resolve(process.cwd(), f), "utf8");
      for (const re of banned) {
        expect(src, `${f} should not contain ${re}`).not.toMatch(re);
      }
    }
  });
});