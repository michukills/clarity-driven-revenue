/**
 * P104 — Campaign Control UX clarity + status stream.
 *
 * Source-level pins (mirrors the style of existing P97/P102 tests).
 * Plus unit coverage for the pure stream derivation.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildCampaignStatusStreamEvents,
  type CampaignStreamEvent,
} from "@/components/campaignControl/CampaignStatusStream";

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");
const ADMIN = read("src/pages/admin/CampaignControl.tsx");
const PORTAL = read("src/pages/portal/tools/CampaignControl.tsx");
const STREAM = read("src/components/campaignControl/CampaignStatusStream.tsx");
const OVERVIEW = read("src/components/campaignControl/CampaignStatusOverview.tsx");
const NBA = read("src/components/campaignControl/CampaignNextBestAction.tsx");

describe("P104 — admin Campaign Control layout clarity", () => {
  it("mounts the status overview, next best action, and status stream", () => {
    expect(ADMIN).toMatch(/<CampaignStatusOverview /);
    expect(ADMIN).toMatch(/<CampaignNextBestAction /);
    expect(ADMIN).toMatch(/<CampaignStatusStream /);
  });
  it("keeps Campaign Video panel, AI envelope panel, and report-engine recommendation present", () => {
    expect(ADMIN).toMatch(/<CampaignVideoPanel /);
    expect(ADMIN).toMatch(/<AiOutputEnvelopePanel /);
    expect(ADMIN).toMatch(/Recommendation engine/);
  });
  it("does not introduce muted-gold accent tokens in this pass", () => {
    for (const src of [ADMIN, PORTAL, STREAM, OVERVIEW, NBA]) {
      expect(src).not.toMatch(/muted[-_ ]?gold/i);
      expect(src).not.toMatch(/--gold(\b|-)/);
    }
  });
});

describe("P104 — portal Campaign Control layout clarity", () => {
  it("mounts client-safe next-best-action and status stream", () => {
    expect(PORTAL).toMatch(/<CampaignNextBestAction[\s\S]*?variant="client"/);
    expect(PORTAL).toMatch(/<CampaignStatusStream[\s\S]*?variant="client"/);
  });
  it("never exposes admin notes, raw prompts, or admin-only metadata", () => {
    expect(PORTAL).not.toMatch(/admin_notes/);
    expect(PORTAL).not.toMatch(/admin_only_rationale/);
    expect(PORTAL).not.toMatch(/admin_review_notes/);
    expect(PORTAL).not.toMatch(/raw_prompt/i);
  });
  it("uses client-safe copy about manual upload and no platform publishing", () => {
    expect(PORTAL).toMatch(/Manual publish-ready/);
    expect(PORTAL).toMatch(/RGS does not post to platforms in this phase/);
  });
});

describe("P104 — Campaign Status Stream filters admin-only detail for clients", () => {
  const sample = {
    briefs: [
      { id: "b1", status: "approved", client_visible: true, objective: "Drive scorecard starts", updated_at: "2026-05-10T12:00:00Z" },
      { id: "b2", status: "needs_review", objective: "Holiday push", updated_at: "2026-05-11T12:00:00Z" },
    ],
    assets: [
      { id: "a1", title: "IG carousel", approval_status: "approved", publishing_status: "ready_for_manual_post", approved_at: "2026-05-12T12:00:00Z" },
      { id: "a2", title: "LI post", approval_status: "needs_review", updated_at: "2026-05-13T12:00:00Z" },
      { id: "a3", title: "Email", approval_status: "draft", updated_at: "2026-05-09T12:00:00Z" },
    ],
    proofs: [],
  };

  const events = buildCampaignStatusStreamEvents(sample);

  it("produces real events (no fabrication of platform posting/scheduling)", () => {
    expect(events.length).toBeGreaterThan(0);
    for (const e of events as CampaignStreamEvent[]) {
      expect(e.label.toLowerCase()).not.toMatch(/scheduled to|posted to (facebook|instagram|linkedin|tiktok|x|twitter|youtube)|live on (facebook|instagram|linkedin|tiktok|x|twitter|youtube)|auto-?post/);
    }
  });

  it("marks draft/needs-review events as admin-only", () => {
    const draft = events.find((e) => e.label.includes("draft"));
    const review = events.find((e) => e.label.includes("needs review"));
    expect(draft?.adminOnly).toBe(true);
    expect(review?.adminOnly).toBe(true);
  });

  it("flags missing connection proof with safe attention-tone copy", () => {
    const ev = events.find((e) => e.id === "no-connection-proof");
    expect(ev).toBeTruthy();
    expect(ev?.tone).toBe("attention");
    expect(ev?.detail).toMatch(/Manual posting and manual tracking remain available/);
  });

  it("returns an empty stream when no records exist (no fake events)", () => {
    const empty = buildCampaignStatusStreamEvents({ briefs: [], assets: [], proofs: [{ id: "p1", provider: "ga4", capability: "analytics", status: "verified_live" }] });
    // proof event present, but no fake brief/asset
    expect(empty.find((e) => e.icon === "brief")).toBeUndefined();
    expect(empty.find((e) => e.icon === "asset")).toBeUndefined();
  });
});

describe("P104 — public funnel and report/gig boundaries remain untouched", () => {
  const app = read("src/App.tsx");
  it("/scorecard still redirects to /scan and /diagnostic/scorecard remains protected", () => {
    expect(app).toMatch(/path="\/scorecard"[\s\S]*Navigate[\s\S]*"\/scan"/);
    expect(app).toMatch(/path="\/revenue-scorecard"[\s\S]*Navigate[\s\S]*"\/scan"/);
    expect(app).toMatch(/\/diagnostic\/scorecard[\s\S]*ProtectedRoute/);
  });
  it("does not introduce a public Campaign Control route", () => {
    expect(app).not.toMatch(/path="\/campaign-control"/);
  });
});