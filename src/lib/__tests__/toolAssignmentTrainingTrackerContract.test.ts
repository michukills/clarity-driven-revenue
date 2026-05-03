import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");
const allMigrations = () => {
  const dir = join(root, "supabase/migrations");
  return readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .map((f) => readFileSync(join(dir, f), "utf8"))
    .join("\n");
};

describe("P51 — Tool Assignment + Training Tracker contract", () => {
  it("portal route is mounted behind ClientToolGuard with the correct tool key", () => {
    const app = read("src/App.tsx");
    expect(app).toMatch(
      /path="\/portal\/tools\/tool-assignment-training-tracker"[\s\S]*ClientToolGuard\s+toolKey="tool_assignment_training_tracker"/,
    );
  });

  it("admin route requires admin role", () => {
    const app = read("src/App.tsx");
    expect(app).toMatch(
      /path="\/admin\/customers\/:customerId\/tool-assignment-training-tracker"[\s\S]*requireRole="admin"/,
    );
  });

  it("migration creates table with RLS, client policy, and exposes a client-safe RPC", () => {
    const sql = allMigrations();
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.tool_training_tracker_entries/);
    expect(sql).toMatch(/ALTER TABLE public\.tool_training_tracker_entries ENABLE ROW LEVEL SECURITY/);
    expect(sql).toMatch(/Client read own visible tool_training_tracker_entries[\s\S]*client_visible = true/);
    expect(sql).toMatch(/'tool_assignment_training_tracker'[\s\S]*'implementation'[\s\S]*'training_handoff'/);
    expect(sql).toMatch(/FUNCTION public\.get_client_tool_training_tracker_entries/);
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.get_client_tool_training_tracker_entries\(uuid\) FROM PUBLIC/);
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.get_client_tool_training_tracker_entries\(uuid\) TO authenticated/);
  });

  it("client-safe RPC does not return internal_notes or handoff_notes", () => {
    const sql = allMigrations();
    const m = sql.match(/CREATE OR REPLACE FUNCTION public\.get_client_tool_training_tracker_entries[\s\S]*?\$\$;/);
    expect(m).toBeTruthy();
    expect(m![0]).not.toMatch(/internal_notes/);
    expect(m![0]).not.toMatch(/handoff_notes/);
  });

  it("client portal page never references internal_notes / handoff_notes and uses the safe RPC", () => {
    const page = read("src/pages/portal/tools/ToolAssignmentTrainingTracker.tsx");
    expect(page).not.toMatch(/internal_notes/);
    expect(page).not.toMatch(/handoff_notes/);
    expect(page).toMatch(/getClientTrackerEntries/);
    expect(page).not.toMatch(/from\(["']tool_training_tracker_entries/);
  });

  it("docs and TS lib exist", () => {
    expect(existsSync(join(root, "docs/tool-assignment-training-tracker.md"))).toBe(true);
    expect(existsSync(join(root, "src/lib/toolTrainingTracker.ts"))).toBe(true);
  });

  it("classification metadata is documented as implementation lane / training_handoff", () => {
    const doc = read("docs/tool-lane-phase-industry-classification.md");
    expect(doc).toMatch(/tool_assignment_training_tracker[\s\S]*implementation[\s\S]*training_handoff/);
  });

  it("no scope-creep / banned wording in client tracker surface", () => {
    const page = read("src/pages/portal/tools/ToolAssignmentTrainingTracker.tsx");
    const banned = [
      /unlimited support/i,
      /unlimited training/i,
      /guaranteed adoption/i,
      /guaranteed employee performance/i,
      /guaranteed (results|revenue|roi)/i,
      /fully automated training/i,
      /replaces management/i,
      /replaces legal review/i,
      /replaces compliance review/i,
      /RGS trains everyone for you/i,
      /RGS manages the team for you/i,
      /done[- ]for[- ]you/i,
      /full[- ]service/i,
      /we run your business/i,
      /we manage everything/i,
      /hands[- ]off for the owner/i,
      /use anytime/i,
      /upgrade anytime/i,
      /ask RGS if/i,
      /Diagnostic \+ ongoing/i,
    ];
    for (const re of banned) expect(page).not.toMatch(re);
  });

  it("no scope-creep / banned wording in admin tracker surface", () => {
    const page = read("src/pages/admin/ToolAssignmentTrainingTrackerAdmin.tsx");
    const banned = [
      /unlimited support/i,
      /unlimited training/i,
      /guaranteed adoption/i,
      /guaranteed (results|revenue|roi)/i,
      /done[- ]for[- ]you/i,
      /full[- ]service/i,
      /we run your business/i,
      /hands[- ]off for the owner/i,
      /use anytime/i,
      /upgrade anytime/i,
      /ask RGS if/i,
      /Diagnostic \+ ongoing/i,
    ];
    for (const re of banned) expect(page).not.toMatch(re);
  });
});