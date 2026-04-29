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
});
