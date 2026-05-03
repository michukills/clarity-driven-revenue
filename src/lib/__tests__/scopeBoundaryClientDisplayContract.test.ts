// P43.1 — Client-side display contract tests for scope boundary filtering.
//
// Static checks (no Supabase). They verify:
//   1. MyTools hides legacy assignment groups for inactive lanes by deriving
//      lane activity from the P43 RPC result (single source of truth).
//   2. ClientToolGuard still blocks access via the RPC.
//   3. Client-facing surfaces never render raw P43 reason codes.
//   4. Locked-state copy avoids banned scope-creep wording.
//   5. Admin Scope/Access Snapshot exists and is wired into CustomerDetail.

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "../../..");
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf8");

const RAW_REASON_CODES = [
  "diagnostic_lane_inactive",
  "implementation_lane_inactive",
  "rcs_lane_inactive",
  "owner_interview_required",
  "admin_only",
];

const CLIENT_FACING_FILES = [
  "src/pages/portal/MyTools.tsx",
  "src/components/portal/ClientToolGuard.tsx",
  "src/components/portal/ToolCard.tsx",
  "src/components/portal/ClientToolMatrixCard.tsx",
  "src/components/journey/StabilityJourneyDashboard.tsx",
];

const BANNED_PHRASES = [
  /\bquarterly\b/i,
  /\bDiagnostic \+ ongoing\b/i,
  /\bafter major changes\b/i,
  /\bask RGS if\b/i,
  /\buse anytime\b/i,
  /\bupgrade anytime\b/i,
];

describe("P43.1 — client display scope filtering", () => {
  it("MyTools derives lane activity from the RPC and gates legacy lane groups", () => {
    const body = read("src/pages/portal/MyTools.tsx");
    expect(body).toMatch(/diagnosticLaneActive/);
    expect(body).toMatch(/implementationLaneActive/);
    expect(body).toMatch(/rcsLaneActive/);
    // grouped object must reference the lane activity flags so inactive
    // lanes are blanked out (single source of truth).
    expect(body).toMatch(/implementationLaneActive\s*\?[\s\S]+?:\s*\[\]/);
    expect(body).toMatch(/rcsLaneActive\s*\?[\s\S]+?:\s*\[\]/);
  });

  it("ClientToolGuard still calls the P43 RPC and shows a neutral denial", () => {
    const body = read("src/components/portal/ClientToolGuard.tsx");
    expect(body).toContain("getEffectiveToolsForCustomer");
    expect(body).toContain("not available for your account");
  });

  it("client-facing surfaces never render raw P43 reason codes", () => {
    for (const file of CLIENT_FACING_FILES) {
      const body = read(file);
      for (const code of RAW_REASON_CODES) {
        expect(body, `${file} surfaces internal token "${code}"`).not.toContain(code);
      }
    }
  });

  it("client-facing surfaces avoid banned scope-creep wording", () => {
    for (const file of CLIENT_FACING_FILES) {
      const body = read(file);
      for (const re of BANNED_PHRASES) {
        expect(body, `${file} contains banned copy ${re}`).not.toMatch(re);
      }
    }
  });

  it("admin Scope/Access Snapshot panel exists and is wired into CustomerDetail", () => {
    expect(existsSync(resolve(ROOT, "src/components/admin/AdminScopeAccessSnapshotPanel.tsx"))).toBe(true);
    const detail = read("src/pages/admin/CustomerDetail.tsx");
    expect(detail).toContain("AdminScopeAccessSnapshotPanel");
  });

  it("docs include the P43.1 section", () => {
    const body = read("docs/scope-boundary-client-access.md");
    expect(body).toMatch(/P43\.1/);
    expect(body).toMatch(/Stability Journey \/ My Tools filtering/);
    expect(body).toMatch(/Scope \/ Access Snapshot/i);
  });
});
