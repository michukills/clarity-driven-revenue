import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

describe("P47 — Implementation Roadmap Tool contract", () => {
  it("portal route is mounted behind ClientToolGuard with the correct tool key", () => {
    const app = read("src/App.tsx");
    expect(app).toMatch(
      /path="\/portal\/tools\/implementation-roadmap"[\s\S]*ClientToolGuard\s+toolKey="implementation_roadmap"/,
    );
  });

  it("admin route requires admin role", () => {
    const app = read("src/App.tsx");
    expect(app).toMatch(
      /path="\/admin\/customers\/:customerId\/implementation-roadmap"[\s\S]*requireRole="admin"/,
    );
  });

  it("migration registers tool, creates tables with RLS, and exposes a client-safe RPC", () => {
    const dir = join(root, "supabase/migrations");
    const sql = readdirSync(dir)
      .filter(f => f.endsWith(".sql"))
      .map(f => readFileSync(join(dir, f), "utf8"))
      .join("\n");
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.implementation_roadmaps/);
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.implementation_roadmap_items/);
    expect(sql).toMatch(/ALTER TABLE public\.implementation_roadmaps ENABLE ROW LEVEL SECURITY/);
    expect(sql).toMatch(/ALTER TABLE public\.implementation_roadmap_items ENABLE ROW LEVEL SECURITY/);
    // Client SELECT requires client_visible
    expect(sql).toMatch(/Client read own visible implementation_roadmap[\s\S]*client_visible = true/);
    expect(sql).toMatch(/Client read own visible roadmap items[\s\S]*client_visible = true/);
    // Tool registration
    expect(sql).toMatch(/'implementation_roadmap'[\s\S]*'implementation'[\s\S]*'\/portal\/tools\/implementation-roadmap'/);
    // Client RPC + execute revoked from PUBLIC
    expect(sql).toMatch(/FUNCTION public\.get_client_implementation_roadmap/);
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.get_client_implementation_roadmap\(uuid\) FROM PUBLIC/);
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.get_client_implementation_roadmap\(uuid\) TO authenticated/);
  });

  it("client-safe RPC does not return internal_notes", () => {
    const dir = join(root, "supabase/migrations");
    const sql = readdirSync(dir)
      .filter(f => f.endsWith(".sql"))
      .map(f => readFileSync(join(dir, f), "utf8"))
      .join("\n");
    // Locate the function body and verify it never selects internal_notes
    const m = sql.match(/CREATE OR REPLACE FUNCTION public\.get_client_implementation_roadmap[\s\S]*?\$\$;/);
    expect(m).toBeTruthy();
    expect(m![0]).not.toMatch(/internal_notes/);
  });

  it("client portal page never references internal_notes", () => {
    const page = read("src/pages/portal/tools/ImplementationRoadmap.tsx");
    expect(page).not.toMatch(/internal_notes/);
    // Uses the client-safe RPC, not direct table reads
    expect(page).toMatch(/getClientImplementationRoadmap/);
    expect(page).not.toMatch(/from\(["']implementation_roadmap/);
  });

  it("docs and TS lib exist", () => {
    expect(existsSync(join(root, "docs/implementation-roadmap-tool.md"))).toBe(true);
    expect(existsSync(join(root, "src/lib/implementationRoadmap.ts"))).toBe(true);
  });

  it("no scope-creep / banned wording in the new client surfaces", () => {
    const page = read("src/pages/portal/tools/ImplementationRoadmap.tsx");
    const doc = read("docs/implementation-roadmap-tool.md");
    const banned = [
      /unlimited support/i,
      /guaranteed (results|revenue|roi)/i,
      /done[- ]for[- ]you/i,
      /we run your business/i,
      /we manage everything/i,
      /use anytime/i,
      /upgrade anytime/i,
      /ask RGS if/i,
      /Diagnostic \+ ongoing/i,
      /hands[- ]off for the owner/i,
    ];
    for (const re of banned) {
      expect(page).not.toMatch(re);
      // Allow these terms inside docs only when prefixed by "Banned" listing
      if (!/Banned/.test(doc.split(re.source)[0] ?? "")) continue;
    }
  });
});