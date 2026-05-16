import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * P98 — Audit wiring + no-fake-posting copy guard + portal scope +
 * public-funnel non-regression. These are static-source contracts
 * (no DB) to keep the suite deterministic.
 */

const ROOT = path.resolve(__dirname, "../..");
const readSrc = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");

describe("P98 — audit wiring", () => {
  const data = readSrc("lib/campaignControl/campaignVideoData.ts");
  const audit = readSrc("lib/campaignControl/campaignAudit.ts");

  it("data layer logs all video lifecycle actions", () => {
    const required = [
      "video_project_created",
      "video_outline_generated",
      "video_scene_plan_generated",
      "video_render_setup_required",
      "video_render_requested",
      "video_render_failed",
    ];
    for (const a of required) expect(data).toContain(a);
  });

  it("audit module declares video actions", () => {
    for (const a of [
      "video_render_requested",
      "video_render_succeeded",
      "video_render_failed",
      "video_approved",
      "video_exported",
    ]) {
      expect(audit).toContain(a);
    }
  });

  it("admin transition path routes through logCampaignAuditEvent", () => {
    expect(data).toMatch(/logCampaignAuditEvent\(/);
  });
});

describe("P98 — no fake posting / scheduling / analytics copy", () => {
  const files = [
    "components/campaignControl/CampaignVideoPanel.tsx",
    "components/campaignControl/CampaignVideoPortalCard.tsx",
  ].map(readSrc);

  const FORBIDDEN = [
    /\bAuto[- ]?post(ed|ing)?\b/i,
    /\bAuto[- ]?schedul/i,
    /\bScheduled to post\b/i,
    /\bWe[' ]?ll post for you\b/i,
    /\bGuaranteed (results|virality|reach|engagement)\b/i,
    /\bGoing viral\b/i,
  ];

  it("no auto-post / scheduling / viral claims", () => {
    for (const src of files) {
      for (const re of FORBIDDEN) {
        expect(src).not.toMatch(re);
      }
    }
  });

  it("panel states render runner is not wired (no fake render claims)", () => {
    expect(files[0]).toMatch(/no fake renders|setup required|not wired/i);
  });
});

describe("P98 — portal scope boundary (read-only, approved only)", () => {
  const portal = readSrc("components/campaignControl/CampaignVideoPortalCard.tsx");
  const data = readSrc("lib/campaignControl/campaignVideoData.ts");

  it("portal does not import admin transition helpers", () => {
    expect(portal).not.toMatch(/adminTransitionVideoProject/);
    expect(portal).not.toMatch(/adminCreateVideoProject/);
    expect(portal).not.toMatch(/adminRequestRender/);
    expect(portal).not.toMatch(/adminRecordRenderFailed/);
  });

  it("client list query is filtered to approved only", () => {
    expect(data).toMatch(/clientListVideoProjectsForCustomer[\s\S]*?\.in\(\s*"approval_status"\s*,\s*\[\s*"approved"\s*\]\s*\)/);
  });
});

describe("P98 — public funnel non-regression", () => {
  const app = readSrc("App.tsx");

  it("/scorecard route still resolves to redirect-friendly element", () => {
    expect(app).toMatch(/path="\/scorecard"/);
  });

  it("/diagnostic/scorecard remains protected", () => {
    expect(app).toMatch(/path="\/diagnostic\/scorecard"[\s\S]{0,200}ProtectedRoute/);
  });

  it("/scan route exists", () => {
    expect(app).toMatch(/path="\/scan"/);
  });

  it("App.tsx does not introduce a public video route", () => {
    expect(app).not.toMatch(/path="\/campaign-video/);
    expect(app).not.toMatch(/path="\/video-campaigns/);
  });
});