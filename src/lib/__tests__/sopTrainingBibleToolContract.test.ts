import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");
const allMigrations = () => {
  const dir = join(root, "supabase/migrations");
  return readdirSync(dir).filter(f => f.endsWith(".sql"))
    .map(f => readFileSync(join(dir, f), "utf8")).join("\n");
};

describe("P48 — SOP / Training Bible Creator contract", () => {
  it("portal route is mounted behind ClientToolGuard with the correct tool key", () => {
    const app = read("src/App.tsx");
    expect(app).toMatch(
      /path="\/portal\/tools\/sop-training-bible"[\s\S]*ClientToolGuard\s+toolKey="sop_training_bible"/,
    );
  });

  it("admin route requires admin role", () => {
    const app = read("src/App.tsx");
    expect(app).toMatch(
      /path="\/admin\/customers\/:customerId\/sop-training-bible"[\s\S]*requireRole="admin"/,
    );
  });

  it("migration registers tool, creates table with RLS, and exposes a client-safe RPC", () => {
    const sql = allMigrations();
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.sop_training_entries/);
    expect(sql).toMatch(/ALTER TABLE public\.sop_training_entries ENABLE ROW LEVEL SECURITY/);
    expect(sql).toMatch(/Client read own visible sop_training_entries[\s\S]*client_visible = true/);
    expect(sql).toMatch(/'sop_training_bible'[\s\S]*'implementation'[\s\S]*'\/portal\/tools\/sop-training-bible'/);
    expect(sql).toMatch(/FUNCTION public\.get_client_sop_training_bible/);
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.get_client_sop_training_bible\(uuid\) FROM PUBLIC/);
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.get_client_sop_training_bible\(uuid\) TO authenticated/);
  });

  it("client-safe RPC does not return internal_notes", () => {
    const sql = allMigrations();
    const m = sql.match(/CREATE OR REPLACE FUNCTION public\.get_client_sop_training_bible[\s\S]*?\$\$;/);
    expect(m).toBeTruthy();
    expect(m![0]).not.toMatch(/internal_notes/);
  });

  it("client portal page never references internal_notes and uses the safe RPC", () => {
    const page = read("src/pages/portal/tools/SopTrainingBible.tsx");
    expect(page).not.toMatch(/internal_notes/);
    expect(page).toMatch(/getClientSopTrainingBible/);
    expect(page).not.toMatch(/from\(["']sop_training_entries/);
  });

  it("docs and TS lib exist", () => {
    expect(existsSync(join(root, "docs/sop-training-bible-tool.md"))).toBe(true);
    expect(existsSync(join(root, "src/lib/sopTrainingBible.ts"))).toBe(true);
  });

  it("no scope-creep / banned wording in client SOP surfaces", () => {
    const page = read("src/pages/portal/tools/SopTrainingBible.tsx");
    const banned = [
      /unlimited support/i,
      /unlimited SOPs/i,
      /guaranteed compliance/i,
      /guaranteed employee performance/i,
      /guaranteed (results|revenue|roi)/i,
      /fully automated training/i,
      /replaces management/i,
      /replaces legal review/i,
      /replaces compliance review/i,
      /RGS runs training for you/i,
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
});
