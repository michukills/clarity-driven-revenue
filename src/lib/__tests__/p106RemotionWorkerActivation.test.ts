/**
 * P106 — Remotion worker activation + gated video render delivery.
 *
 * Static contract pins for the dead-letter pathway, worker readiness
 * probe, signed-URL download wiring, and worker Dockerfile/env.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

const CALLBACK = read("supabase/functions/campaign-video-render-callback/index.ts");
const STATUS = read("supabase/functions/campaign-video-render-status/index.ts");
const DOWNLOAD = read("supabase/functions/campaign-video-download/index.ts");
const DATA = read("src/lib/campaignControl/campaignVideoData.ts");
const PANEL = read("src/components/campaignControl/CampaignVideoPanel.tsx");
const PORTAL = read("src/components/campaignControl/CampaignVideoPortalCard.tsx");
const DOCKERFILE = "worker/remotion-render-worker/Dockerfile";
const ENV_EXAMPLE = "worker/remotion-render-worker/.env.example";

describe("P106 — callback dead-letter handling", () => {
  it("dead-letters when attempts reach max_worker_attempts", () => {
    expect(CALLBACK).toMatch(/max_worker_attempts/);
    expect(CALLBACK).toMatch(/dead_lettered_at/);
    expect(CALLBACK).toMatch(/dead_letter_reason/);
    expect(CALLBACK).toMatch(/status: dead \? "dead_lettered" : "failed"/);
  });
  it("audits video_render_dead_lettered separately from video_render_failed", () => {
    expect(CALLBACK).toMatch(/video_render_dead_lettered/);
  });
  it("still cannot approve or mark manual_publish_ready", () => {
    expect(CALLBACK).not.toMatch(/approval_status:\s*"approved"/);
    expect(CALLBACK).not.toMatch(/manual_publish_status:\s*"manual_publish_ready"/);
    expect(CALLBACK).not.toMatch(/manual_publish_status:\s*"ready_for_manual_export"/);
  });
});

describe("P106 — admin-only render worker status probe", () => {
  it("requires authenticated user and admin role", () => {
    expect(STATUS).toMatch(/getClaims/);
    expect(STATUS).toMatch(/\.eq\("role", "admin"\)/);
    expect(STATUS).toMatch(/Forbidden/);
  });
  it("returns presence (not value) of REMOTION_WORKER_SHARED_SECRET", () => {
    expect(STATUS).toMatch(/worker_configured/);
    expect(STATUS).toMatch(/!!Deno\.env\.get\("REMOTION_WORKER_SHARED_SECRET"\)/);
    // Never serialize the secret itself.
    expect(STATUS).not.toMatch(/REMOTION_WORKER_SHARED_SECRET[^!]*\)\s*\}/);
  });
});

describe("P106 — download wiring + portal/admin gating", () => {
  it("data layer exposes signed-download and worker-status helpers", () => {
    expect(DATA).toMatch(/requestCampaignVideoSignedDownload/);
    expect(DATA).toMatch(/campaign-video-download/);
    expect(DATA).toMatch(/adminGetRenderWorkerStatus/);
    expect(DATA).toMatch(/campaign-video-render-status/);
  });
  it("admin panel only shows download button for approved + draft_ready output", () => {
    expect(PANEL).toMatch(/data-testid="admin-video-download"/);
    expect(PANEL).toMatch(/j\.status === "draft_ready" && j\.output_storage_path && p\.approval_status === "approved"/);
    expect(PANEL).toMatch(/data-testid="render-worker-status"/);
  });
  it("portal only shows download for approved + manual-publish-ready projects", () => {
    expect(PORTAL).toMatch(/data-testid="portal-video-download"/);
    expect(PORTAL).toMatch(/approval_status[\s\S]*ready_for_manual_export[\s\S]*manual_publish_ready/);
  });
  it("download function still enforces approval + ready states and stays private", () => {
    expect(DOWNLOAD).toMatch(/approval_status !== "approved"/);
    expect(DOWNLOAD).toMatch(/manual_publish_status !== "ready_for_manual_export"/);
    expect(DOWNLOAD).not.toMatch(/getPublicUrl/);
    expect(DOWNLOAD).not.toMatch(/public:\s*true/);
  });
});

describe("P106 — worker hardening: Dockerfile + env defaults", () => {
  it("ships a Dockerfile with Node 20 + chromium + ffmpeg", () => {
    expect(existsSync(join(process.cwd(), DOCKERFILE))).toBe(true);
    const df = readFileSync(join(process.cwd(), DOCKERFILE), "utf8");
    expect(df).toMatch(/node:20/);
    expect(df).toMatch(/chromium/);
    expect(df).toMatch(/ffmpeg/);
    // Service-role key must NEVER be baked into the image.
    expect(df).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY\s*=\s*\S/);
    expect(df).not.toMatch(/REMOTION_WORKER_SHARED_SECRET\s*=\s*\S/);
  });
  it(".env.example documents MAX_ATTEMPTS and WORKER_ID", () => {
    const env = readFileSync(join(process.cwd(), ENV_EXAMPLE), "utf8");
    expect(env).toMatch(/MAX_ATTEMPTS=/);
    expect(env).toMatch(/WORKER_ID=/);
    expect(env).not.toMatch(/REMOTION_WORKER_SHARED_SECRET=[A-Za-z0-9]{20,}/);
  });
});

describe("P106 — copy safety + public route guards remain", () => {
  const FORBIDDEN = [
    /\bPosted\b/, /\bScheduled\b/, /\bPublished\b/, /\bLive\b/,
    /\bAuto[- ]?posted\b/i, /\bGuaranteed (leads|revenue|ROI|growth|rankings)\b/i,
    /\bViral\b/i, /\b10x\b/i,
  ];
  it("new edge function + UI files contain no forbidden copy", () => {
    for (const src of [STATUS, PANEL, PORTAL]) {
      for (const re of FORBIDDEN) expect(src).not.toMatch(re);
    }
  });
  it("public funnel redirects remain intact", () => {
    const app = read("src/App.tsx");
    expect(app).toMatch(/path="\/scorecard"[\s\S]*Navigate[\s\S]*"\/scan"/);
    expect(app).toMatch(/path="\/revenue-scorecard"[\s\S]*Navigate[\s\S]*"\/scan"/);
    expect(app).toMatch(/\/diagnostic\/scorecard[\s\S]*ProtectedRoute/);
    expect(app).not.toMatch(/path="\/campaign-video"/);
  });
});