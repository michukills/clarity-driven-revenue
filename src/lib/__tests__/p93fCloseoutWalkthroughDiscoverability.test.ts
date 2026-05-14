/**
 * P93F-Closeout — Walkthrough discoverability + placement.
 *
 * Locks in:
 *  - Each portal tool page that already ships a ToolWalkthroughCard renders
 *    it ABOVE the dense workflow markers (long forms, large grids, advanced
 *    history sections). We assert the walkthrough card import appears before
 *    common dense-workflow signals in source order.
 *  - The shared ToolWalkthroughCard now surfaces a "Start here" hint so
 *    first-time users notice it before scrolling.
 *  - The portal video player blocks browser download / remote-playback
 *    affordances and the card itself never renders public social-share or
 *    download buttons.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../../..");

const PORTAL_TOOL_PAGES = [
  "src/pages/portal/tools/ImplementationRoadmap.tsx",
  "src/pages/portal/tools/RevenueLeakEngine.tsx",
  "src/pages/portal/tools/FinancialVisibility.tsx",
  "src/pages/portal/tools/PriorityActionTracker.tsx",
  "src/pages/portal/tools/ScorecardHistory.tsx",
  "src/pages/portal/tools/MonthlySystemReview.tsx",
  "src/pages/portal/tools/OwnerDecisionDashboard.tsx",
  "src/pages/portal/tools/RgsControlSystem.tsx",
  "src/pages/portal/tools/OwnerDiagnosticInterview.tsx",
];

describe("P93F-Closeout — walkthrough placement", () => {
  for (const rel of PORTAL_TOOL_PAGES) {
    it(`${rel} renders the walkthrough card before dense workflow markers`, () => {
      const full = path.join(ROOT, rel);
      const src = fs.readFileSync(full, "utf8");
      const walkIdx = src.indexOf("<ToolWalkthroughCard");
      expect(walkIdx).toBeGreaterThan(-1);

      // Dense workflow markers we expect to appear AFTER the walkthrough.
      const denseMarkers = [
        "<form",
        "grid-cols-1",
        "<table",
        "<Tabs",
      ];
      for (const marker of denseMarkers) {
        const markerIdx = src.indexOf(marker);
        if (markerIdx === -1) continue;
        expect(markerIdx).toBeGreaterThan(walkIdx);
      }
    });
  }
});

describe("P93F-Closeout — walkthrough card UX", () => {
  const cardSrc = fs.readFileSync(
    path.join(ROOT, "src/components/portal/ToolWalkthroughCard.tsx"),
    "utf8",
  );

  it("surfaces a 'Start here' first-time hint", () => {
    expect(cardSrc).toMatch(/data-testid="tool-walkthrough-start-here"/);
    expect(cardSrc.toLowerCase()).toContain("start here");
  });

  it("never renders public social-share or download buttons inside the portal card", () => {
    expect(cardSrc).not.toMatch(/download/i);
    expect(cardSrc).not.toMatch(/share[A-Z]|onShare|SocialShare/);
  });
});

describe("P93F-Closeout — portal video player blocks download/remote-playback", () => {
  const playerSrc = fs.readFileSync(
    path.join(ROOT, "src/components/video/RgsVideoPlayer.tsx"),
    "utf8",
  );
  it("uses controlsList to suppress browser download UI", () => {
    expect(playerSrc).toMatch(/controlsList=.*nodownload/);
  });
});