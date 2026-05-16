/**
 * P98 — Deterministic Campaign Video status machine.
 *
 * Pure functions. Mirrors the rigor of `campaignStatusMachine.ts` for
 * the video lifecycle. No DB, no network. Enforces:
 *
 *  - Only an approved source campaign asset may seed a video project.
 *  - AI cannot drive `approve` — `approve` requires an actor user id.
 *  - Outline must exist before a scene plan is marked ready.
 *  - Scene plan must exist before a render is requested.
 *  - Render outcomes (`draft_ready` / `failed` / `setup_required`) must
 *    be reflected honestly.
 *  - Only `approved` can move to `ready_for_manual_export` or
 *    `manual_publish_ready`.
 *  - `archived` is terminal.
 *  - `manual_publish_ready` is NOT scheduled / posted / live.
 */

export type CampaignVideoStatus =
  | "not_started"
  | "outline_draft"
  | "scene_plan_ready"
  | "render_queued"
  | "render_in_progress"
  | "render_draft_ready"
  | "render_failed"
  | "render_setup_required"
  | "needs_revision"
  | "approved"
  | "ready_for_manual_export"
  | "manual_publish_ready"
  | "archived";

export type CampaignVideoApprovalStatus =
  | "draft"
  | "needs_review"
  | "approved"
  | "rejected"
  | "archived";

export type CampaignVideoManualPublishStatus =
  | "not_ready"
  | "ready_for_manual_export"
  | "manual_publish_ready"
  | "archived";

export type CampaignVideoAction =
  | "generate_outline"
  | "generate_scene_plan"
  | "request_render"
  | "record_render_in_progress"
  | "record_render_draft_ready"
  | "record_render_failed"
  | "record_render_setup_required"
  | "request_revision"
  | "approve"
  | "reject"
  | "archive"
  | "mark_ready_for_export"
  | "mark_manual_publish_ready"
  | "mark_exported";

export interface CampaignVideoState {
  video_status: CampaignVideoStatus;
  approval_status: CampaignVideoApprovalStatus;
  manual_publish_status: CampaignVideoManualPublishStatus;
  has_outline: boolean;
  has_scene_plan: boolean;
  has_render_output: boolean;
}

export interface CampaignVideoTransition {
  video_status: CampaignVideoStatus;
  approval_status: CampaignVideoApprovalStatus;
  manual_publish_status: CampaignVideoManualPublishStatus;
}

export type CampaignVideoDenyCode =
  | "asset_not_approved"
  | "outline_required"
  | "scene_plan_required"
  | "render_not_ready"
  | "not_approved_cannot_publish_ready"
  | "not_publish_ready_cannot_export"
  | "ai_cannot_approve"
  | "archived_terminal"
  | "rejected_terminal"
  | "invalid_transition";

export type CampaignVideoOutcome =
  | {
      ok: true;
      next: CampaignVideoTransition;
      audit_action: string;
      from_status: CampaignVideoStatus;
      to_status: CampaignVideoStatus;
    }
  | { ok: false; reason: string; code: CampaignVideoDenyCode };

export interface EligibilityResult {
  ok: boolean;
  reason?: string;
  code?: "asset_not_approved" | "asset_archived" | "asset_rejected";
}

export interface SourceAssetSnapshot {
  approval_status: string;
}

/**
 * Eligibility gate — only approved campaign assets may seed a video
 * project. `draft`, `needs_review`, `rejected`, `archived` are blocked.
 */
export function isAssetEligibleForVideo(
  asset: SourceAssetSnapshot,
): EligibilityResult {
  if (asset.approval_status === "archived") {
    return {
      ok: false,
      code: "asset_archived",
      reason: "This campaign asset is archived. Restore the asset before drafting a video.",
    };
  }
  if (asset.approval_status === "rejected") {
    return {
      ok: false,
      code: "asset_rejected",
      reason: "This campaign asset was rejected. Resolve the rejection before drafting a video.",
    };
  }
  if (asset.approval_status !== "approved") {
    return {
      ok: false,
      code: "asset_not_approved",
      reason: "Video drafting is available after this campaign asset is approved.",
    };
  }
  return { ok: true };
}

export interface ActionContext {
  /** Actor user id — required for `approve`. AI/system runs must omit this. */
  actor_user_id?: string | null;
  /** Set true when an AI/system process is invoking the action. */
  is_ai_actor?: boolean;
}

export function transitionCampaignVideo(
  state: CampaignVideoState,
  action: CampaignVideoAction,
  ctx: ActionContext = {},
): CampaignVideoOutcome {
  const { video_status, approval_status, manual_publish_status } = state;

  if (approval_status === "archived" && action !== "archive") {
    return { ok: false, reason: "Video project is archived.", code: "archived_terminal" };
  }
  if (
    approval_status === "rejected" &&
    action !== "archive" &&
    action !== "request_revision"
  ) {
    return { ok: false, reason: "Video project is rejected.", code: "rejected_terminal" };
  }

  switch (action) {
    case "generate_outline":
      return mk(state, { video_status: "outline_draft" }, "video_outline_generated", video_status, "outline_draft");

    case "generate_scene_plan":
      if (!state.has_outline) {
        return {
          ok: false,
          reason: "Generate the video outline before producing a scene plan.",
          code: "outline_required",
        };
      }
      return mk(state, { video_status: "scene_plan_ready" }, "video_scene_plan_generated", video_status, "scene_plan_ready");

    case "request_render":
      if (!state.has_scene_plan) {
        return {
          ok: false,
          reason: "A Remotion-ready scene plan is required before requesting a render.",
          code: "scene_plan_required",
        };
      }
      return mk(state, { video_status: "render_queued" }, "video_render_requested", video_status, "render_queued");

    case "record_render_in_progress":
      return mk(state, { video_status: "render_in_progress" }, "video_render_requested", video_status, "render_in_progress");

    case "record_render_draft_ready":
      return mk(state, { video_status: "render_draft_ready" }, "video_render_succeeded", video_status, "render_draft_ready");

    case "record_render_failed":
      return mk(state, { video_status: "render_failed" }, "video_render_failed", video_status, "render_failed");

    case "record_render_setup_required":
      return mk(
        state,
        { video_status: "render_setup_required" },
        "video_render_setup_required",
        video_status,
        "render_setup_required",
      );

    case "request_revision":
      return mk(
        state,
        { video_status: "needs_revision", approval_status: "draft" },
        "video_revision_requested",
        video_status,
        "needs_revision",
      );

    case "approve":
      if (ctx.is_ai_actor || !ctx.actor_user_id) {
        return {
          ok: false,
          reason: "Approval requires a human reviewer. AI cannot approve video assets.",
          code: "ai_cannot_approve",
        };
      }
      if (!state.has_outline || !state.has_scene_plan) {
        return {
          ok: false,
          reason: "Outline and scene plan must exist before approval.",
          code: "scene_plan_required",
        };
      }
      return mk(
        state,
        { video_status: "approved", approval_status: "approved" },
        "video_approved",
        video_status,
        "approved",
      );

    case "reject":
      return mk(
        state,
        { approval_status: "rejected" },
        "video_rejected",
        video_status,
        video_status,
      );

    case "archive":
      return mk(
        state,
        {
          approval_status: "archived",
          manual_publish_status: "archived",
          video_status: "archived",
        },
        "video_archived",
        video_status,
        "archived",
      );

    case "mark_ready_for_export":
      if (approval_status !== "approved") {
        return {
          ok: false,
          reason: "Only approved video assets can be marked ready for manual export.",
          code: "not_approved_cannot_publish_ready",
        };
      }
      if (!state.has_render_output) {
        return {
          ok: false,
          reason: "A real render output file is required before manual export.",
          code: "render_not_ready",
        };
      }
      return mk(
        state,
        {
          video_status: "ready_for_manual_export",
          manual_publish_status: "ready_for_manual_export",
        },
        "video_marked_ready_for_export",
        video_status,
        "ready_for_manual_export",
      );

    case "mark_manual_publish_ready":
      if (approval_status !== "approved") {
        return {
          ok: false,
          reason: "Only approved video assets can be marked manual publish-ready.",
          code: "not_approved_cannot_publish_ready",
        };
      }
      if (manual_publish_status !== "ready_for_manual_export") {
        return {
          ok: false,
          reason: "Mark the asset ready for manual export before flagging manual publish-ready.",
          code: "not_publish_ready_cannot_export",
        };
      }
      return mk(
        state,
        {
          video_status: "manual_publish_ready",
          manual_publish_status: "manual_publish_ready",
        },
        "video_manual_publish_ready_marked",
        video_status,
        "manual_publish_ready",
      );

    case "mark_exported":
      if (manual_publish_status !== "ready_for_manual_export" && manual_publish_status !== "manual_publish_ready") {
        return {
          ok: false,
          reason: "Mark the asset ready for manual export first.",
          code: "not_publish_ready_cannot_export",
        };
      }
      return mk(state, {}, "video_exported", video_status, video_status);
  }
}

function mk(
  state: CampaignVideoState,
  patch: Partial<CampaignVideoTransition>,
  audit_action: string,
  from_status: CampaignVideoStatus,
  to_status: CampaignVideoStatus,
): CampaignVideoOutcome {
  const next: CampaignVideoTransition = {
    video_status: patch.video_status ?? state.video_status,
    approval_status: patch.approval_status ?? state.approval_status,
    manual_publish_status: patch.manual_publish_status ?? state.manual_publish_status,
  };
  return { ok: true, next, audit_action, from_status, to_status };
}

/** UI helper — list of actions whose preconditions are currently met. */
export function allowedVideoActions(
  state: CampaignVideoState,
  ctx: ActionContext = {},
): CampaignVideoAction[] {
  const all: CampaignVideoAction[] = [
    "generate_outline",
    "generate_scene_plan",
    "request_render",
    "record_render_in_progress",
    "record_render_draft_ready",
    "record_render_failed",
    "record_render_setup_required",
    "request_revision",
    "approve",
    "reject",
    "archive",
    "mark_ready_for_export",
    "mark_manual_publish_ready",
    "mark_exported",
  ];
  return all.filter((a) => transitionCampaignVideo(state, a, ctx).ok);
}

/**
 * Documentation constant — `manual_publish_ready` is a manual-readiness
 * marker only. It is not "scheduled", "posted", "live", or
 * "performance tracked". UI surfaces and tests reference this.
 */
export const MANUAL_PUBLISH_READY_CLARIFICATION =
  "Ready for manual upload. RGS does not post to any platform in this phase.";