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

describe("P50 — Workflow / Process Mapping Tool contract", () => {
  it("portal route is mounted behind ClientToolGuard with the correct tool key", () => {
    const app = read("src/App.tsx");
    expect(app).toMatch(
      /path="\/portal\/tools\/workflow-process-mapping"[\s\S]*ClientToolGuard\s+toolKey="workflow_process_mapping"/,
    );
  });

  it("admin route requires admin role", () => {
    const app = read("src/App.tsx");
    expect(app).toMatch(
      /path="\/admin\/customers\/:customerId\/workflow-process-mapping"[\s\S]*requireRole="admin"/,
    );
  });

  it("migration registers tool, creates table with RLS, and exposes a client-safe RPC", () => {
    const sql = allMigrations();
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.workflow_process_maps/);
    expect(sql).toMatch(/ALTER TABLE public\.workflow_process_maps ENABLE ROW LEVEL SECURITY/);
    expect(sql).toMatch(/Client read own visible workflow_process_maps[\s\S]*client_visible = true/);
    expect(sql).toMatch(/'workflow_process_mapping'[\s\S]*'implementation'[\s\S]*'\/portal\/tools\/workflow-process-mapping'/);
    expect(sql).toMatch(/FUNCTION public\.get_client_workflow_process_maps/);
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.get_client_workflow_process_maps\(uuid\) FROM PUBLIC/);
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.get_client_workflow_process_maps\(uuid\) TO authenticated/);
  });

  it("client-safe RPC does not return internal_notes", () => {
    const sql = allMigrations();
    const m = sql.match(/CREATE OR REPLACE FUNCTION public\.get_client_workflow_process_maps[\s\S]*?\$\$;/);
    expect(m).toBeTruthy();
    expect(m![0]).not.toMatch(/internal_notes/);
  });

  it("client portal page never references internal_notes and uses the safe RPC", () => {
    const page = read("src/pages/portal/tools/WorkflowProcessMapping.tsx");
    expect(page).not.toMatch(/internal_notes/);
    expect(page).toMatch(/getClientWorkflowMaps/);
    expect(page).not.toMatch(/from\(["']workflow_process_maps/);
  });

  it("docs and TS lib exist", () => {
    expect(existsSync(join(root, "docs/workflow-process-mapping-tool.md"))).toBe(true);
    expect(existsSync(join(root, "src/lib/workflowProcessMapping.ts"))).toBe(true);
  });

  it("classification metadata is documented as implementation lane", () => {
    const doc = read("docs/tool-lane-phase-industry-classification.md");
    expect(doc).toMatch(/workflow_process_mapping[\s\S]*implementation[\s\S]*implementation_execution/);
  });

  it("no scope-creep / banned wording in client workflow mapping surface", () => {
    const page = read("src/pages/portal/tools/WorkflowProcessMapping.tsx");
    const banned = [
      /unlimited support/i,
      /unlimited process mapping/i,
      /guaranteed operational improvement/i,
      /guaranteed employee performance/i,
      /guaranteed (results|revenue|roi)/i,
      /fully automated operations/i,
      /replaces management/i,
      /replaces legal review/i,
      /replaces compliance review/i,
      /RGS runs operations for you/i,
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
});
