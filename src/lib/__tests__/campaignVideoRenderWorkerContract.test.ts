import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * P99 — Static contract tests for the render-runner edge functions
 * and the worker scaffold. Keep deterministic and run-anywhere.
 */

const ROOT = path.resolve(__dirname, "../../..");
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");

const CLAIM = "supabase/functions/campaign-video-render-claim/index.ts";
const CALLBACK = "supabase/functions/campaign-video-render-callback/index.ts";
const DOWNLOAD = "supabase/functions/campaign-video-download/index.ts";
const WORKER_README = "worker/remotion-render-worker/README.md";
const WORKER_PKG = "worker/remotion-render-worker/package.json";

describe("P99 — edge function shared-secret authorization", () => {
  it("claim requires x-remotion-worker-secret matching env secret", () => {
    const src = read(CLAIM);
    expect(src).toMatch(/REMOTION_WORKER_SHARED_SECRET/);
    expect(src).toMatch(/x-remotion-worker-secret/);
    expect(src).toMatch(/Unauthorized/);
  });

  it("callback requires x-remotion-worker-secret matching env secret", () => {
    const src = read(CALLBACK);
    expect(src).toMatch(/REMOTION_WORKER_SHARED_SECRET/);
    expect(src).toMatch(/x-remotion-worker-secret/);
    expect(src).toMatch(/Unauthorized/);
  });

  it("download requires authenticated user via getClaims", () => {
    const src = read(DOWNLOAD);
    expect(src).toMatch(/getClaims/);
    expect(src).toMatch(/Unauthorized/);
    expect(src).not.toMatch(/x-remotion-worker-secret/);
  });
});

describe("P99 — claim returns only safe render payload", () => {
  const src = read(CLAIM);
  it("never selects admin_notes or internal-only columns", () => {
    // The select list and returned payload must not include any of these
    // admin/internal-only columns. We check the .select(...) call only.
    const selectMatch = src.match(/\.select\(\s*"([^"]+)"\s*\)/g) ?? [];
    const joined = selectMatch.join(" ");
    for (const banned of [
      "admin_notes",
      "ai_confidence_reason",
      "human_review_checklist",
      "risk_warnings",
      "claim_safety_notes",
    ]) {
      expect(joined).not.toContain(banned);
    }
  });
  it("only claims queued jobs and marks in_progress", () => {
    expect(src).toMatch(/\.eq\("status", "queued"\)/);
    expect(src).toMatch(/status: "in_progress"/);
  });
  it("audits video_render_worker_claimed", () => {
    expect(src).toMatch(/video_render_worker_claimed/);
  });
});

describe("P99 — callback contract", () => {
  const src = read(CALLBACK);
  it("success requires output bucket + path", () => {
    expect(src).toMatch(/output_storage_bucket and output_storage_path required/);
  });
  it("success sets draft_ready and audits video_render_succeeded", () => {
    expect(src).toMatch(/status: "draft_ready"/);
    expect(src).toMatch(/video_render_succeeded/);
  });
  it("failure sets failed and audits video_render_failed with safe message", () => {
    expect(src).toMatch(/status: "failed"/);
    expect(src).toMatch(/video_render_failed/);
    expect(src).toMatch(/safeErrorMessage/);
  });
  it("callback CANNOT approve or mark manual_publish_ready", () => {
    expect(src).not.toMatch(/approval_status:\s*"approved"/);
    expect(src).not.toMatch(/manual_publish_status:\s*"manual_publish_ready"/);
    expect(src).not.toMatch(/manual_publish_status:\s*"ready_for_manual_export"/);
  });
  it("only transitions jobs that are in_progress or queued", () => {
    expect(src).toMatch(/status !== "in_progress" && job\.status !== "queued"/);
  });
});

describe("P99 — download gating + signed URL safety", () => {
  const src = read(DOWNLOAD);
  it("requires approval_status === approved", () => {
    expect(src).toMatch(/approval_status !== "approved"/);
  });
  it("requires manual_publish_status ready_for_manual_export or manual_publish_ready", () => {
    expect(src).toMatch(/manual_publish_status !== "ready_for_manual_export"/);
    expect(src).toMatch(/manual_publish_status !== "manual_publish_ready"/);
  });
  it("only signs draft_ready jobs with an output path", () => {
    expect(src).toMatch(/\.eq\("status", "draft_ready"\)/);
    expect(src).toMatch(/\.not\("output_storage_path", "is", null\)/);
  });
  it("returns short-lived signed URL (<= 15 minutes)", () => {
    expect(src).toMatch(/SIGNED_URL_TTL_SECONDS\s*=\s*(\d+)/);
    const m = src.match(/SIGNED_URL_TTL_SECONDS\s*=\s*(\d+)/);
    const ttl = Number(m?.[1] ?? 0);
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(900);
  });
  it("non-admin users must own the customer record", () => {
    expect(src).toMatch(/customer\.user_id !== userId/);
  });
  it("audits signed URL issuance and denials", () => {
    expect(src).toMatch(/video_signed_url_issued/);
    expect(src).toMatch(/video_download_denied/);
  });
  it("does not create public bucket access", () => {
    expect(src).not.toMatch(/getPublicUrl/);
    expect(src).not.toMatch(/public:\s*true/);
  });
});

describe("P99 — worker scaffold present and documented", () => {
  it("worker README explains worker is external + deployment options", () => {
    const md = read(WORKER_README);
    expect(md).toMatch(/Not deployed inside Lovable/i);
    expect(md).toMatch(/Fly\.io|Railway|Render\.com|Cloud Run/);
    expect(md).toMatch(/REMOTION_WORKER_SHARED_SECRET/);
  });
  it("worker package.json declares Node 20 + Remotion deps", () => {
    const pkg = JSON.parse(read(WORKER_PKG));
    expect(pkg.engines.node).toMatch(/20/);
    expect(pkg.dependencies["@remotion/renderer"]).toBeTruthy();
    expect(pkg.dependencies["@supabase/supabase-js"]).toBeTruthy();
  });
});

describe("P99 — no fake render / posting / scheduling / guarantee copy", () => {
  const FORBIDDEN = [
    /\bPosted\b/, /\bScheduled\b/, /\bPublished\b/, /\bLive\b/,
    /\bAuto[- ]?posted\b/i, /\bAuto[- ]?published\b/i,
    /\bPerformance tracked\b/i, /\bAnalytics active\b/i,
    /\bViral\b/i, /\b10x\b/i,
    /\bGuaranteed (leads|revenue|ROI|growth|rankings)\b/i,
  ];
  it("edge functions do not contain forbidden copy", () => {
    for (const file of [CLAIM, CALLBACK, DOWNLOAD]) {
      const src = read(file);
      for (const re of FORBIDDEN) expect(src).not.toMatch(re);
    }
  });
});