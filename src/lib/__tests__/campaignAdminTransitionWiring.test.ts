import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("P97.1 — Admin Campaign Control wires writes through status machine + audit", () => {
  const file = readFileSync(
    join(process.cwd(), "src/pages/admin/CampaignControl.tsx"),
    "utf-8",
  );

  it("imports the deterministic status machine", () => {
    expect(file).toMatch(/transitionCampaignAsset/);
    expect(file).toMatch(/from "@\/lib\/campaignControl\/campaignStatusMachine"/);
  });

  it("imports the audit logger", () => {
    expect(file).toMatch(/logCampaignAuditEvent/);
    expect(file).toMatch(/from "@\/lib\/campaignControl\/campaignAudit"/);
  });

  it("routes approval/publish/archive/reject through runAssetTransition", () => {
    expect(file).toMatch(/runAssetTransition\(a, "request_review"/);
    expect(file).toMatch(/runAssetTransition\(a, "approve"/);
    expect(file).toMatch(/runAssetTransition\(a, "mark_ready_to_publish"/);
    expect(file).toMatch(/runAssetTransition\(a, "mark_manually_posted"/);
    expect(file).toMatch(/runAssetTransition\(a, "reject"/);
    expect(file).toMatch(/runAssetTransition\(a, "archive"/);
  });

  it("does not mutate approval_status directly from button handlers", () => {
    // Direct approval_status: 'approved' assignment in button onClick is forbidden.
    expect(file).not.toMatch(/updateAsset\([^)]*approval_status:\s*"approved"/);
    expect(file).not.toMatch(/updateAsset\([^)]*publishing_status:\s*"posted_manually"/);
  });

  it("keeps no-fake-posting copy (manual publishing only)", () => {
    expect(file).toMatch(/Ready for manual publishing/);
    expect(file).toMatch(/Mark manually posted/);
    expect(file).toMatch(/Scheduling integration not connected yet/);
    expect(file).not.toMatch(/Published to (Facebook|Instagram|LinkedIn|TikTok)/);
    expect(file).not.toMatch(/Auto-posted/);
  });
});
