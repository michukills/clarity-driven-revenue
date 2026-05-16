/**
 * P97 — Deterministic campaign asset status transition contract.
 *
 * Pins the spec's gating rules:
 *  - AI-generated drafts are never auto-approved.
 *  - Blocked safety prevents `approved`.
 *  - Only `approved` → `ready_for_manual_post`.
 *  - Only `approved` (and already publish-ready) → `posted_manually`.
 *  - `rejected` / `archived` cannot publish.
 */
import { describe, it, expect } from "vitest";
import {
  transitionCampaignAsset,
  allowedAssetActions,
  type CampaignAssetState,
} from "@/lib/campaignControl/campaignStatusMachine";

const base: CampaignAssetState = {
  approval_status: "draft",
  publishing_status: "manual_only",
  safety_status: "needs_review",
};

describe("P97 — campaign asset status machine", () => {
  it("AI-generated draft cannot be approved directly", () => {
    const r = transitionCampaignAsset(base, "approve");
    expect(r.ok).toBe(false);
    if (!r.ok) expect((r as { code: string }).code).toBe("ai_generated_not_approvable");
  });

  it("blocked safety status prevents approval even after review request", () => {
    const r = transitionCampaignAsset(
      { ...base, approval_status: "needs_review", safety_status: "blocked" },
      "approve",
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect((r as { code: string }).code).toBe("blocked_safety_cannot_approve");
  });

  it("happy path: draft → needs_review → approved", () => {
    const reviewed = transitionCampaignAsset(base, "request_review");
    expect(reviewed.ok).toBe(true);
    if (!reviewed.ok) return;
    expect(reviewed.next.approval_status).toBe("needs_review");

    const approved = transitionCampaignAsset(
      { ...base, approval_status: "needs_review", safety_status: "passed" },
      "approve",
    );
    expect(approved.ok).toBe(true);
    if (approved.ok) expect(approved.next.approval_status).toBe("approved");
  });

  it("only approved assets can be marked ready for manual publishing", () => {
    const denied = transitionCampaignAsset(
      { ...base, approval_status: "needs_review", safety_status: "passed" },
      "mark_ready_to_publish",
    );
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect((denied as { code: string }).code).toBe("not_approved_cannot_publish");

    const allowed = transitionCampaignAsset(
      { ...base, approval_status: "approved", safety_status: "passed" },
      "mark_ready_to_publish",
    );
    expect(allowed.ok).toBe(true);
    if (allowed.ok) expect(allowed.next.publishing_status).toBe("ready_for_manual_post");
  });

  it("manually_posted only allowed once approved + publish-ready", () => {
    const denied = transitionCampaignAsset(
      { ...base, approval_status: "needs_review", safety_status: "passed" },
      "mark_manually_posted",
    );
    expect(denied.ok).toBe(false);

    const allowed = transitionCampaignAsset(
      {
        approval_status: "approved",
        publishing_status: "ready_for_manual_post",
        safety_status: "passed",
      },
      "mark_manually_posted",
    );
    expect(allowed.ok).toBe(true);
    if (allowed.ok) expect(allowed.next.publishing_status).toBe("posted_manually");
  });

  it("rejected assets cannot be published", () => {
    const r = transitionCampaignAsset(
      { ...base, approval_status: "rejected", safety_status: "passed" },
      "mark_ready_to_publish",
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect((r as { code: string }).code).toBe("rejected_terminal");
  });

  it("archived is terminal for everything except archive itself", () => {
    const state: CampaignAssetState = {
      approval_status: "archived",
      publishing_status: "manual_only",
      safety_status: "passed",
    };
    expect(transitionCampaignAsset(state, "approve").ok).toBe(false);
    expect(transitionCampaignAsset(state, "mark_ready_to_publish").ok).toBe(false);
    expect(transitionCampaignAsset(state, "mark_manually_posted").ok).toBe(false);
    expect(transitionCampaignAsset(state, "archive").ok).toBe(true);
  });

  it("allowedAssetActions excludes disallowed publish actions for a draft", () => {
    const actions = allowedAssetActions(base);
    expect(actions).not.toContain("approve");
    expect(actions).not.toContain("mark_ready_to_publish");
    expect(actions).not.toContain("mark_manually_posted");
    expect(actions).toContain("request_review");
    expect(actions).toContain("archive");
  });

  it("request_edits returns approved/under-review asset back to draft", () => {
    const r = transitionCampaignAsset(
      { ...base, approval_status: "needs_review", safety_status: "passed" },
      "request_edits",
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.next.approval_status).toBe("draft");
  });
});