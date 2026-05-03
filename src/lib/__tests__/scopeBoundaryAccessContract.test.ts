// P43 — Scope Boundary / Client Access contract tests.
//
// These tests are static contract checks (no Supabase calls). They verify:
//   1. The new lane reason codes exist on the toolCatalog reason map.
//   2. The effective-tools RPC migration still encodes the lane gates and
//      preserves the P41 owner-interview gate, the admin override semantics,
//      and the admin bypass.
//   3. The new docs file exists and avoids banned scope-creep copy.
//   4. ClientToolGuard does not leak lane / payment / admin reasons to clients.

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { REASON_LABEL } from "@/lib/toolCatalog";

const ROOT = resolve(__dirname, "../../..");

function latestRpcMigration(): string {
  const dir = resolve(ROOT, "supabase/migrations");
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (let i = files.length - 1; i >= 0; i--) {
    const body = readFileSync(resolve(dir, files[i]), "utf8");
    if (
      body.includes("private.get_effective_tools_for_customer") &&
      body.includes("diagnostic_lane_inactive")
    ) {
      return body;
    }
  }
  throw new Error("P43 lane-gate migration not found");
}

describe("P43 — scope boundary / client access", () => {
  it("exposes the three new lane reason codes with non-empty labels", () => {
    for (const key of [
      "diagnostic_lane_inactive",
      "implementation_lane_inactive",
      "rcs_lane_inactive",
    ]) {
      expect(REASON_LABEL[key], `missing label for ${key}`).toBeTruthy();
      expect(REASON_LABEL[key].length).toBeGreaterThan(8);
    }
  });

  it("RPC migration encodes diagnostic lane gate and preserves owner-interview gate", () => {
    const sql = latestRpcMigration();
    expect(sql).toContain("v_diag_lane_active");
    expect(sql).toContain("owner_interview_required");
    expect(sql).toContain("diagnostic_lane_inactive");
    // owner-interview gate must come BEFORE the diagnostic lane gate so the
    // existing reason code wins for clarity.
    const ownerIdx = sql.indexOf("owner_interview_required");
    const diagIdx = sql.indexOf("diagnostic_lane_inactive");
    expect(ownerIdx).toBeGreaterThan(0);
    expect(diagIdx).toBeGreaterThan(ownerIdx);
  });

  it("RPC migration encodes implementation and RCS lane gates", () => {
    const sql = latestRpcMigration();
    expect(sql).toContain("implementation_lane_inactive");
    expect(sql).toContain("rcs_lane_inactive");
    expect(sql).toContain("v_impl_lane_active");
    expect(sql).toContain("v_rcs_lane_active");
    // RCS grace window must be 30 days (mirrors RccEntitlement).
    expect(sql).toMatch(/30 days/);
  });

  it("RPC migration preserves admin bypass and admin-override semantics", () => {
    const sql = latestRpcMigration();
    // admins are never blocked by lane gates.
    expect(sql).toMatch(/NOT v_is_admin[\s\S]+?diagnostic_lane_inactive/);
    expect(sql).toMatch(/NOT v_is_admin[\s\S]+?implementation_lane_inactive/);
    expect(sql).toMatch(/NOT v_is_admin[\s\S]+?rcs_lane_inactive/);
    // granted per-client override bypasses lane gates.
    expect(sql).toContain("override_state_v <> 'granted'");
    // revoked override always wins.
    expect(sql).toMatch(/override_state_v = 'revoked'[^A-Za-z]*THEN false/);
  });

  it("docs/scope-boundary-client-access.md exists and avoids banned copy", () => {
    const docsPath = resolve(ROOT, "docs/scope-boundary-client-access.md");
    expect(existsSync(docsPath)).toBe(true);
    const body = readFileSync(docsPath, "utf8");
    expect(body).toMatch(/Diagnostic/);
    expect(body).toMatch(/Implementation/);
    expect(body).toMatch(/RGS Control System/);
    // Banned scope-creep copy must not appear in narrative prose. The
    // "banned copy" listing itself uses backtick code spans, which is allowed.
    const banned = [
      /\bquarterly\b/i,
      /\bDiagnostic \+ ongoing\b/i,
      /\bafter major changes\b/i,
      /\bask RGS if\b/i,
      /\buse anytime\b/i,
      /\bupgrade anytime\b/i,
    ];
    // strip code spans/blocks before scanning prose.
    const prose = body
      .replace(/```[\s\S]*?```/g, "")
      .replace(/`[^`]*`/g, "");
    for (const re of banned) {
      expect(prose, `banned copy ${re} appeared in scope-boundary docs`).not.toMatch(re);
    }
  });

  it("ClientToolGuard never reveals lane/payment/admin reasons to the client", () => {
    const body = readFileSync(
      resolve(ROOT, "src/components/portal/ClientToolGuard.tsx"),
      "utf8",
    );
    const banned = [
      "diagnostic_lane_inactive",
      "implementation_lane_inactive",
      "rcs_lane_inactive",
      "subscription",
      "payment",
      "admin_only",
      "owner_interview_required",
    ];
    for (const token of banned) {
      expect(
        body,
        `ClientToolGuard surfaces internal token "${token}" to clients`,
      ).not.toContain(token);
    }
  });
});