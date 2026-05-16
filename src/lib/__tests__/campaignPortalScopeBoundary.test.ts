/**
 * P97 — Portal Campaign Control must remain scope-locked.
 *
 * Standalone / gig customers using campaign deliverables must NOT
 * unlock Diagnostic, Implementation, or the wider Control System.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SRC = readFileSync(
  join(process.cwd(), "src/pages/portal/tools/CampaignControl.tsx"),
  "utf8",
);

const FORBIDDEN_UNLOCK_REFERENCES: RegExp[] = [
  /unlockDiagnostic/i,
  /unlockImplementation/i,
  /unlockControlSystem/i,
  /grantFullClientAccess/i,
  /enableFullPortal/i,
  /from\s+["']@\/pages\/diagnostic/i,
  /from\s+["']@\/pages\/admin\/Implementation/i,
];

describe("P97 — Portal Campaign Control scope boundary", () => {
  it.each(FORBIDDEN_UNLOCK_REFERENCES)(
    "does not contain %s",
    (pat) => {
      expect(SRC).not.toMatch(pat);
    },
  );

  it("remains guarded by ClientToolGuard at the route level (sanity)", () => {
    const app = readFileSync(join(process.cwd(), "src/App.tsx"), "utf8");
    expect(app).toMatch(
      /\/portal\/tools\/campaign-control[\s\S]*ClientToolGuard[\s\S]*campaign_control_system/,
    );
  });
});