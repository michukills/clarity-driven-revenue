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
    "ai-readiness-status",
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

  it("uses a configurable Gemini/Lovable model across all admin AI helpers", () => {
    for (const fn of ["persona-ai-seed", "journey-ai-seed", "process-ai-seed", "report-ai-assist"]) {
      const source = read(`supabase/functions/${fn}/index.ts`);
      expect(source).toContain('Deno.env.get("RGS_AI_MODEL") ?? "google/gemini-2.5-flash"');
      expect(source).toContain("model,");
    }
  });

  it("reports AI readiness without exposing secrets and includes launch operations", () => {
    const source = read("supabase/functions/ai-readiness-status/index.ts");
    expect(source).toContain("await requireAdmin(req, corsHeaders)");
    expect(source).toContain('!!Deno.env.get("LOVABLE_API_KEY")');
    expect(source).toContain("scorecard_intake");
    expect(source).toContain("diagnostic_interview");
    expect(source).toContain("Lovable dashboard -> Settings -> Cloud & AI balance");
    expect(source).toContain("deterministic_rubric");
    expect(source).toContain("AI does not directly assign the final 0-1000 score");
    expect(source).toContain("usage_summary: usageSummary");
    expect(source).not.toContain("LOVABLE_API_KEY,");
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
