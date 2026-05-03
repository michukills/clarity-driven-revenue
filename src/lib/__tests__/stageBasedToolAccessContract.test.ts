// P49.1 — Stage-based tool access contract tests.
//
// These are static contract checks (no Supabase calls) that verify the
// stage-based access model is encoded where it should be:
//   1. The P43 RPC (private.get_effective_tools_for_customer) still derives
//      access from customer stage / payment / subscription fields and
//      preserves the lane gates and admin-only filtering.
//   2. Admin override panels are reframed as override/exception layers, not
//      as the primary access model.
//   3. The new docs file exists and lists the stage→tool mapping without
//      banned scope-creep copy.
//   4. The tool walkthrough rule is documented but no walkthrough component
//      is shipped in this pass.

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { REASON_LABEL } from "@/lib/toolCatalog";

const ROOT = resolve(__dirname, "../../..");

function latestRpcMigration(): string {
  const dir = resolve(ROOT, "supabase/migrations");
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  for (let i = files.length - 1; i >= 0; i--) {
    const body = readFileSync(resolve(dir, files[i]), "utf8");
    if (
      body.includes("private.get_effective_tools_for_customer") &&
      body.includes("v_diag_lane_active")
    ) {
      return body;
    }
  }
  throw new Error("stage-based RPC migration not found");
}

describe("P49.1 — stage-based tool access", () => {
  it("RPC derives access from stage / lifecycle / payment / subscription fields", () => {
    const sql = latestRpcMigration();
    for (const field of [
      "lifecycle_state",
      "stage",
      "diagnostic_payment_status",
      "diagnostic_status",
      "owner_interview_completed_at",
      "implementation_payment_status",
      "implementation_started_at",
      "implementation_ended_at",
      "rcc_subscription_status",
      "rcc_paid_through",
    ]) {
      expect(sql, `RPC missing ${field}`).toContain(field);
    }
  });

  it("RPC enforces all three lane gates and the owner-interview gate", () => {
    const sql = latestRpcMigration();
    expect(sql).toContain("diagnostic_lane_inactive");
    expect(sql).toContain("implementation_lane_inactive");
    expect(sql).toContain("rcs_lane_inactive");
    expect(sql).toContain("owner_interview_required");
  });

  it("RPC filters admin-only and hidden tools out of client results", () => {
    const sql = latestRpcMigration();
    // The final WHERE clause must exclude admin-only / hidden for non-admins.
    expect(sql).toMatch(/tool_type\s*<>\s*'admin_only'/);
    expect(sql).toMatch(/default_visibility\s*<>\s*'admin_only'/);
    expect(sql).toMatch(/default_visibility\s*<>\s*'hidden'/);
  });

  it("revoked override always wins; granted override bypasses lane gates only", () => {
    const sql = latestRpcMigration();
    expect(sql).toMatch(/override_state_v = 'revoked'[^A-Za-z]*THEN false/);
    // granted override must appear in lane-gate guards
    const occurrences = sql.match(/override_state_v <> 'granted'/g) ?? [];
    expect(occurrences.length).toBeGreaterThanOrEqual(3);
  });

  it("admin Scope panel reframes manual access as override/exception layer", () => {
    const body = readFileSync(
      resolve(ROOT, "src/components/admin/AdminScopeAccessSnapshotPanel.tsx"),
      "utf8",
    );
    expect(body).toMatch(/defaults to the client's current stage/i);
    expect(body).toMatch(/exceptions|early access|revoke/i);
  });

  it("admin ToolAccessPanel header documents stage-default model", () => {
    const body = readFileSync(
      resolve(ROOT, "src/components/admin/ToolAccessPanel.tsx"),
      "utf8",
    );
    expect(body).toMatch(/Stage-based access is the default/i);
    expect(body).toMatch(/override layer/i);
    expect(body).toMatch(/Admin-only tools can never be granted/i);
  });

  it("docs/stage-based-tool-access.md exists and documents the model", () => {
    const path = resolve(ROOT, "docs/stage-based-tool-access.md");
    expect(existsSync(path)).toBe(true);
    const md = readFileSync(path, "utf8");
    for (const phrase of [
      "Access hierarchy",
      "Stage → tool mapping",
      "Manual overrides",
      "Tool walkthrough",
      "owner_diagnostic_interview",
      "implementation_roadmap",
      "sop_training_bible",
      "decision_rights_accountability",
      "revenue_control_center",
    ]) {
      expect(md, `docs missing "${phrase}"`).toContain(phrase);
    }
    // Must not introduce scope-creep claims.
    for (const banned of [
      /guaranteed results/i,
      /we run your business/i,
      /RGS manages the team/i,
      /compliance guarantee/i,
    ]) {
      expect(md).not.toMatch(banned);
    }
  });

  it("walkthrough rule is documentation-only in this pass", () => {
    const md = readFileSync(
      resolve(ROOT, "docs/stage-based-tool-access.md"),
      "utf8",
    );
    expect(md).toMatch(/No walkthrough component is built in P49\.1/);
  });

  it("REASON_LABEL has friendly copy for every stage-gate reason (no raw codes leak)", () => {
    for (const code of [
      "diagnostic_lane_inactive",
      "implementation_lane_inactive",
      "rcs_lane_inactive",
      "owner_interview_required",
      "admin_only",
      "override_revoked",
    ]) {
      const label = REASON_LABEL[code];
      expect(label, `missing label for ${code}`).toBeTruthy();
      expect(label).not.toMatch(/_/); // friendly text, not a raw snake_case code
    }
  });
});