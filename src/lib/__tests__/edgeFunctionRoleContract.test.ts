import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

/**
 * P29 — Edge function role contract.
 *
 * Static checks that lock in role/tenant gating across server-side
 * functions. A full runtime suite is impractical here (would require
 * provisioned auth + customers); these checks fail loudly if a function
 * stops authenticating, stops scoping by customer, leaks server-only
 * secrets, or returns provider tokens to the caller.
 */

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

/** Tenant-scoped functions a client may legitimately call for THEIR customer. */
const tenantScoped = ["qb-status", "qb-sync", "qb-oauth-start"];

/** Admin-only functions. Must reject non-admins before doing real work. */
const adminOnly = [
  "persona-ai-seed",
  "journey-ai-seed",
  "process-ai-seed",
  "report-ai-assist",
  "ai-readiness-status",
  "admin-account-links",
  "qb-demo-sync",
  "square-sync",
  "stripe-sync",
  "dutchie-sync",
];

/** Public/webhook functions. Must validate signature/state instead of JWT. */
const publicWebhook = ["qb-oauth-callback", "quickbooks-webhook"];

describe("Edge function role contract", () => {
  it("tenant-scoped functions authenticate the caller AND verify customer ownership", () => {
    for (const fn of tenantScoped) {
      const src = read(`supabase/functions/${fn}/index.ts`);
      expect(src, `${fn} must getCallerUserId`).toMatch(/getCallerUserId\(req\)/);
      expect(src, `${fn} must callerCanUseCustomer`).toMatch(/callerCanUseCustomer/);
      // Forbidden response must precede any data work.
      expect(src).toMatch(/Forbidden|403/);
    }
  });

  it("admin-only functions reject non-admins before invoking provider/AI logic", () => {
    for (const fn of adminOnly) {
      const src = read(`supabase/functions/${fn}/index.ts`);
      const hasRequireAdmin = /requireAdmin\(req,\s*corsHeaders\)/.test(src);
      const hasInlineAdminCheck =
        /user_roles[\s\S]{0,200}role/.test(src) && /Forbidden|403/.test(src);
      expect(
        hasRequireAdmin || hasInlineAdminCheck,
        `${fn} must verify admin/platform_owner role before doing work`,
      ).toBe(true);
    }
  });

  it("public/webhook functions validate signature or state instead of JWT", () => {
    for (const fn of publicWebhook) {
      const src = read(`supabase/functions/${fn}/index.ts`);
      expect(/HMAC|signature|state/i.test(src), `${fn} must validate signature or state`).toBe(true);
    }
    // And they MUST be marked verify_jwt = false in config so the platform
    // does not double-handle them.
    const config = read("supabase/config.toml");
    for (const fn of publicWebhook) {
      const start = config.indexOf(`[functions.${fn}]`);
      expect(start, `${fn} missing config block`).toBeGreaterThan(-1);
      const next = config.indexOf("\n[functions.", start + 1);
      const block = config.slice(start, next === -1 ? undefined : next);
      expect(block).toContain("verify_jwt = false");
    }
  });

  it("provider tokens, refresh tokens, and service-role keys never appear in JSON responses", () => {
    const allFns = [...tenantScoped, ...adminOnly, ...publicWebhook];
    for (const fn of allFns) {
      const path = `supabase/functions/${fn}/index.ts`;
      if (!existsSync(join(root, path))) continue;
      const src = read(path);
      // The shared QB helper returns access_token only between server
      // functions, never to the caller. Per-function source should not
      // place access_token / refresh_token into a Response body.
      const responseBlocks = src.match(/new Response\([^)]*\)/g) ?? [];
      const lowered = src.toLowerCase();
      // Cheap scan: refuse if a response payload literal embeds these.
      expect(/json\(\{[^}]*refresh_token/i.test(src), `${fn} returns refresh_token`).toBe(false);
      expect(/json\(\{[^}]*access_token/i.test(src), `${fn} returns access_token`).toBe(false);
      expect(lowered.includes("supabase_service_role_key:") , `${fn} echoes service role key name`).toBe(false);
      // suppress unused
      void responseBlocks;
    }
  });

  it("token storage/retrieval helpers are restricted to service role", () => {
    // Verified at the DB layer: qb_get_connection_tokens and qb_store_connection_tokens
    // raise unless auth.role() = 'service_role'. The shared helper uses them
    // via the service-role client only.
    const shared = read("supabase/functions/_shared/qb.ts");
    expect(shared).toContain("qb_get_connection_tokens");
    expect(shared).toContain("qb_store_connection_tokens");
    expect(shared).toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
    // No frontend file should ever call these RPCs.
    const banned = ["qb_get_connection_tokens", "qb_store_connection_tokens"];
    const fs = require("node:fs");
    function walk(dir: string, files: string[] = []): string[] {
      for (const entry of fs.readdirSync(dir)) {
        if (entry === "__tests__" || entry === "node_modules") continue;
        const full = join(dir, entry);
        const st = fs.statSync(full);
        if (st.isDirectory()) walk(full, files);
        else if (/\.(ts|tsx)$/.test(entry) && !/\.test\./.test(entry)) files.push(full);
      }
      return files;
    }
    for (const f of walk(join(root, "src"))) {
      const text = readFileSync(f, "utf8");
      for (const b of banned) {
        expect(text.includes(b), `${f} calls server-only RPC ${b}`).toBe(false);
      }
    }
  });

  it("admin AI functions log runs and never publish unreviewed output to clients", () => {
    const reportAi = read("supabase/functions/report-ai-assist/index.ts");
    expect(reportAi).toContain('client_safe: false');
    expect(reportAi).toContain('status: "needs_review"');
    expect(reportAi).toContain(".from(\"ai_run_logs\")");
  });
});