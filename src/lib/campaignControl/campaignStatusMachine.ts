/**
 * P97 — Deterministic Campaign Control status transitions.
 *
 * Pure functions. No DB, no network. Enforces the gating rules from the
 * P97 spec so the UI cannot silently auto-approve, publish unapproved
 * work, or claim posting before manual review.
 *
 * Rules:
 *  - AI-generated drafts are never auto-approved.
 *  - Blocked safety (or unresolved blocking issues) prevents `approved`.
 *  - Only `approved` may transition to `ready_for_manual_post`.
 *  - Only `approved` or `ready_for_manual_post` (already approved
 *    upstream) may be marked `posted_manually`.
 *  - `rejected` / `archived` cannot publish.
 *  - All transitions are deterministic and test-covered.
 */
import type {
  CampaignApprovalStatus,
  CampaignBriefStatus,
  CampaignPublishingStatus,
  CampaignSafetyStatus,
} from "./types";

export type CampaignAssetAction =
  | "save_draft"
  | "request_review"
  | "request_edits"
  | "approve"
  | "reject"
  | "archive"
  | "mark_ready_to_publish"
  | "mark_manually_posted";

export interface CampaignAssetState {
  approval_status: CampaignApprovalStatus;
  publishing_status: CampaignPublishingStatus;
  safety_status: CampaignSafetyStatus;
}

export interface CampaignAssetTransition {
  approval_status: CampaignApprovalStatus;
  publishing_status: CampaignPublishingStatus;
}

export type TransitionOutcome<T> =
  | { ok: true; next: T; audit_action: string; from_status: string; to_status: string }
  | { ok: false; reason: string; code: TransitionDenyCode };

export type TransitionDenyCode =
  | "ai_generated_not_approvable"
  | "blocked_safety_cannot_approve"
  | "not_approved_cannot_publish"
  | "not_publish_ready_cannot_post"
  | "rejected_terminal"
  | "archived_terminal"
  | "invalid_transition";

const TERMINAL_APPROVAL: CampaignApprovalStatus[] = ["rejected", "archived"];

/**
 * Transition a single campaign asset. Returns a deny result with a
 * machine-readable code when the action is not permitted from the
 * current state, so the UI can surface a precise reason.
 */
export function transitionCampaignAsset(
  state: CampaignAssetState,
  action: CampaignAssetAction,
): TransitionOutcome<CampaignAssetTransition> {
  const { approval_status, publishing_status, safety_status } = state;

  if (action !== "archive" && approval_status === "archived") {
    return { ok: false, reason: "Asset is archived.", code: "archived_terminal" };
  }
  if (
    (action === "mark_ready_to_publish" || action === "mark_manually_posted") &&
    approval_status === "rejected"
  ) {
    return { ok: false, reason: "Rejected asset cannot be published.", code: "rejected_terminal" };
  }

  switch (action) {
    case "save_draft":
      return mk({ approval_status: "draft", publishing_status }, "asset_status_changed", approval_status, "draft");

    case "request_review":
      if (TERMINAL_APPROVAL.includes(approval_status)) {
        return { ok: false, reason: "Cannot request review on a finalized asset.", code: "invalid_transition" };
      }
      return mk({ approval_status: "needs_review", publishing_status }, "review_requested", approval_status, "needs_review");

    case "request_edits":
      if (approval_status !== "needs_review" && approval_status !== "approved") {
        return { ok: false, reason: "Edits can only be requested on an asset under or post review.", code: "invalid_transition" };
      }
      return mk({ approval_status: "draft", publishing_status }, "edits_requested", approval_status, "draft");

    case "approve":
      if (safety_status === "blocked") {
        return {
          ok: false,
          reason: "Blocked safety issues must be resolved before approval.",
          code: "blocked_safety_cannot_approve",
        };
      }
      if (approval_status === "draft") {
        // Draft is allowed to be promoted only after explicit review request.
        return {
          ok: false,
          reason: "Request review before approving an AI-generated draft.",
          code: "ai_generated_not_approvable",
        };
      }
      if (approval_status !== "needs_review") {
        return { ok: false, reason: "Only assets in review can be approved.", code: "invalid_transition" };
      }
      return mk({ approval_status: "approved", publishing_status }, "approved", approval_status, "approved");

    case "reject":
      if (TERMINAL_APPROVAL.includes(approval_status)) {
        return { ok: false, reason: "Asset is already finalized.", code: "invalid_transition" };
      }
      return mk({ approval_status: "rejected", publishing_status }, "rejected", approval_status, "rejected");

    case "archive":
      return mk({ approval_status: "archived", publishing_status }, "asset_archived", approval_status, "archived");

    case "mark_ready_to_publish":
      if (approval_status !== "approved") {
        return {
          ok: false,
          reason: "Only approved assets can be marked ready for manual publishing.",
          code: "not_approved_cannot_publish",
        };
      }
      return mk(
        { approval_status, publishing_status: "ready_for_manual_post" },
        "ready_to_publish_marked",
        publishing_status,
        "ready_for_manual_post",
      );

    case "mark_manually_posted":
      if (approval_status !== "approved") {
        return {
          ok: false,
          reason: "Only approved assets can be marked manually posted.",
          code: "not_approved_cannot_publish",
        };
      }
      if (
        publishing_status !== "ready_for_manual_post" &&
        publishing_status !== "manual_only"
      ) {
        return {
          ok: false,
          reason: "Mark the asset ready for manual publishing before recording the manual post.",
          code: "not_publish_ready_cannot_post",
        };
      }
      return mk(
        { approval_status, publishing_status: "posted_manually" },
        "manually_posted_marked",
        publishing_status,
        "posted_manually",
      );
  }
}

function mk(
  next: CampaignAssetTransition,
  audit_action: string,
  from_status: string,
  to_status: string,
): TransitionOutcome<CampaignAssetTransition> {
  return { ok: true, next, audit_action, from_status, to_status };
}

/**
 * Brief-level transitions are coarser. The existing `campaign_briefs.status`
 * column already carries the brief lifecycle; we only police the
 * `archived` and approval-related transitions here.
 */
export function canArchiveBrief(status: CampaignBriefStatus): boolean {
  return status !== "archived";
}

export function canApproveBrief(status: CampaignBriefStatus): boolean {
  return status === "in_review" || status === "generated";
}

/**
 * Convenience helper for UI: lists actions allowed from a state. Useful
 * for hiding/disabling buttons rather than rendering broken controls.
 */
export function allowedAssetActions(state: CampaignAssetState): CampaignAssetAction[] {
  const all: CampaignAssetAction[] = [
    "save_draft",
    "request_review",
    "request_edits",
    "approve",
    "reject",
    "archive",
    "mark_ready_to_publish",
    "mark_manually_posted",
  ];
  return all.filter((a) => transitionCampaignAsset(state, a).ok);
}