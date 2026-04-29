import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

describe("admin-only AI edge function security", () => {
  const aiFunctions = [
    "persona-ai-seed",
    "journey-ai-seed",
    "process-ai-seed",
    "report-ai-assist",
  ];

  it("requires JWT verification in Supabase function config", () => {
    const config = read("supabase/config.toml");
    for (const fn of aiFunctions) {
      expect(config).toContain(`[functions.${fn}]`);
      const start = config.indexOf(`[functions.${fn}]`);
      const next = config.indexOf("\n[functions.", start + 1);
      const block = config.slice(start, next === -1 ? undefined : next);
      expect(block).toContain("verify_jwt = true");
    }
  });

  it("checks admin authorization inside every AI seed function before using the AI gateway", () => {
    for (const fn of aiFunctions) {
      const source = read(`supabase/functions/${fn}/index.ts`);
      expect(source).toContain('import { requireAdmin } from "../_shared/admin-auth.ts"');
      const authIdx = source.indexOf("await requireAdmin(req, corsHeaders)");
      const keyIdx = source.indexOf('Deno.env.get("LOVABLE_API_KEY")');
      expect(authIdx).toBeGreaterThan(-1);
      expect(keyIdx).toBeGreaterThan(-1);
      expect(authIdx).toBeLessThan(keyIdx);
    }
  });

  it("keeps report AI assist admin-only and logs backend usage", () => {
    const source = read("supabase/functions/report-ai-assist/index.ts");
    const authIdx = source.indexOf("await requireAdmin(req, corsHeaders)");
    const keyIdx = source.indexOf('Deno.env.get("LOVABLE_API_KEY")');
    expect(authIdx).toBeGreaterThan(-1);
    expect(keyIdx).toBeGreaterThan(-1);
    expect(authIdx).toBeLessThan(keyIdx);
    expect(source).toContain(".from(\"ai_run_logs\")");
    expect(source).toContain("client_safe: false");
    expect(source).toContain("status: \"needs_review\"");
  });
});

describe("admin account-link edge function security", () => {
  it("requires JWT verification and admin authorization", () => {
    const config = read("supabase/config.toml");
    const start = config.indexOf("[functions.admin-account-links]");
    const next = config.indexOf("\n[functions.", start + 1);
    const block = config.slice(start, next === -1 ? undefined : next);
    expect(block).toContain("verify_jwt = true");

    const source = read("supabase/functions/admin-account-links/index.ts");
    expect(source).toContain('import { requireAdmin } from "../_shared/admin-auth.ts"');
    expect(source).toContain("await requireAdmin(req, corsHeaders)");
    expect(source).toContain("SUPABASE_SERVICE_ROLE_KEY");
  });
});
