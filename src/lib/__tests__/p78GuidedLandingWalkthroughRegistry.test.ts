/**
 * P78 — Client + Admin guided landing pages and tool walkthrough video
 * registry contract. Verifies the registry is honest, portal walkthroughs
 * never expose downloads or social-share, and the existing client/admin
 * landing surfaces continue to use the safe stage/command guidance helpers.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  TOOL_WALKTHROUGH_VIDEO_REGISTRY,
  isPlayableWalkthrough,
  getWalkthroughEntry,
  assertPortalWalkthroughSafety,
  type ToolWalkthroughVideoEntry,
} from "@/config/toolWalkthroughVideos";

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

describe("P78 — tool walkthrough video registry", () => {
  it("registry is non-empty and entries cover the key tools", () => {
    expect(TOOL_WALKTHROUGH_VIDEO_REGISTRY.length).toBeGreaterThan(8);
    const keys = TOOL_WALKTHROUGH_VIDEO_REGISTRY.map((e) => e.tool_key);
    for (const required of [
      "owner_diagnostic_interview",
      "evidence_vault",
      "rgs_repair_map",
      "sop_training_bible",
      "tool_specific_reports",
      "standalone_tool_runner",
      "admin_report_review",
    ]) {
      expect(keys).toContain(required);
    }
  });

  it("every entry has an honest production status (no fake 'finished' without a real URL)", () => {
    for (const e of TOOL_WALKTHROUGH_VIDEO_REGISTRY) {
      expect([
        "finished",
        "script_needed",
        "recording_needed",
        "editing_needed",
        "planned",
        "not_available",
      ]).toContain(e.video_status);
      if (e.video_status === "finished") {
        expect(e.video_url, `${e.tool_key} marked finished but missing URL`).toBeTruthy();
      } else {
        // Honest: not finished -> never claim a playable URL.
        expect(
          e.video_url,
          `${e.tool_key} is not finished but claims a video URL`,
        ).toBeNull();
      }
    }
  });

  it("portal-visible walkthroughs forbid download and social share", () => {
    for (const e of TOOL_WALKTHROUGH_VIDEO_REGISTRY) {
      if (e.show_in_client_portal) {
        expect(e.no_download).toBe(true);
        expect(e.no_social_share).toBe(true);
        expect(() => assertPortalWalkthroughSafety(e)).not.toThrow();
      }
    }
  });

  it("isPlayableWalkthrough only returns true for finished + URL", () => {
    const fake: ToolWalkthroughVideoEntry = {
      ...TOOL_WALKTHROUGH_VIDEO_REGISTRY[0],
      video_status: "planned",
      video_url: "https://example.com/should-not-play.mp4",
    };
    expect(isPlayableWalkthrough(fake)).toBe(false);
  });

  it("getWalkthroughEntry returns null for unknown keys", () => {
    expect(getWalkthroughEntry("nope_not_a_tool")).toBeNull();
    expect(getWalkthroughEntry("owner_diagnostic_interview")).not.toBeNull();
  });

  it("audience drives portal/admin visibility consistently", () => {
    for (const e of TOOL_WALKTHROUGH_VIDEO_REGISTRY) {
      if (e.audience === "client") expect(e.show_in_admin_portal).toBe(false);
      if (e.audience === "admin") expect(e.show_in_client_portal).toBe(false);
      if (e.audience === "both") {
        expect(e.show_in_client_portal).toBe(true);
        expect(e.show_in_admin_portal).toBe(true);
      }
    }
  });
});

describe("P78 — guided landing surfaces remain wired and safe", () => {
  it("client dashboard renders the guided welcome and the safe walkthrough card", () => {
    const dash = read("src/pages/portal/CustomerDashboard.tsx");
    expect(dash).toMatch(/GuidedClientWelcome/);
    expect(dash).toMatch(/ToolWalkthroughCard/);
  });

  it("admin dashboard renders the command guidance panel and links to standalone runner", () => {
    const adm = read("src/pages/admin/AdminDashboard.tsx");
    expect(adm).toMatch(/CommandGuidancePanel/);
    const panel = read("src/components/admin/CommandGuidancePanel.tsx");
    // Standalone Tool Runner link path from P77 must remain reachable from admin landing surface.
    expect(panel + adm).toMatch(/\/admin\/(report-drafts|customers|client-health)/);
  });

  it("admin and client landing routes remain protected", () => {
    const app = read("src/App.tsx");
    expect(app).toMatch(/path="\/admin"[\s\S]{0,200}requireRole="admin"[\s\S]{0,80}AdminDashboard/);
    expect(app).toMatch(/path="\/portal"[\s\S]{0,200}<ProtectedRoute>[\s\S]{0,200}CustomerDashboard/);
  });

  it("client walkthrough card never wires download or social share buttons", () => {
    const card = read("src/components/portal/ToolWalkthroughCard.tsx");
    expect(card).not.toMatch(/download=/i);
    expect(card).not.toMatch(/share-?on-?(twitter|facebook|linkedin)/i);
    expect(card).not.toMatch(/Share to /i);
    expect(card).not.toMatch(/Download walkthrough/i);
  });

  it("client guided welcome does not import admin-only services or surface admin notes", () => {
    const welcome = read("src/components/portal/GuidedClientWelcome.tsx");
    const stage = read("src/lib/clientStage.ts");
    for (const t of [welcome, stage]) {
      expect(t).not.toMatch(/internal_notes/);
      expect(t).not.toMatch(/admin_notes/);
      expect(t).not.toMatch(/admin_summary/);
      expect(t).not.toMatch(/Mirror, Not the Map/);
      expect(t).not.toMatch(new RegExp(["lay", "the", "bricks"].join(" ")));
      expect(t).not.toMatch(/provides the blueprint/);
    }
    // Admin-only modules should not be imported by client landing pieces.
    expect(welcome).not.toMatch(/from "@\/pages\/admin\//);
    expect(welcome).not.toMatch(/from "@\/components\/admin\//);
  });

  it("registry source declares no fake live-sync or fake-proof language", () => {
    const src = read("src/config/toolWalkthroughVideos.ts");
    for (const re of [
      /live[- ]sync(ed)?/i,
      /real[- ]time/i,
      /trusted by/i,
      /guaranteed/i,
      /AI advisor/i,
      /Mirror, Not the Map/i,
      new RegExp(["lay", "the", "bricks"].join(" "), "i"),
    ]) {
      expect(src).not.toMatch(re);
    }
  });
});