import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * P18 — Portal security hardening + audit instrumentation regression guards.
 *
 * Static checks against the P18 migration text and the application source
 * tree. These do not require a live database; they prevent regressions in
 * the audit RPC contract, the fail-closed get_effective_tools_for_customer
 * guard, and the audit call-site wiring.
 */

const root = process.cwd();
const migrationsDir = join(root, "supabase/migrations");

const p18File = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .reverse()
  .find((f) =>
    /portal[_-]security[_-]hardening|p18[_-]portal/.test(f) ||
    readFileSync(join(migrationsDir, f), "utf8").includes(
      "P18 — Portal security hardening",
    ),
  );

if (!p18File) throw new Error("P18 migration not found");
const p18 = readFileSync(join(migrationsDir, p18File), "utf8");

function normalize(sql: string): string {
  return sql
    .replace(/--[^\n]*\n/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();
}
const p18n = normalize(p18);

describe("P18 — log_portal_audit hardening", () => {
  it("rejects callers whose role is not authenticated or service_role", () => {
    expect(p18n).toMatch(
      /v_caller_role\s+not\s+in\s*\(\s*'authenticated'\s*,\s*'service_role'\s*\)/,
    );
    expect(p18n).toMatch(/raise\s+exception\s+'invalid role'/);
  });

  it("requires action and customer_id", () => {
    expect(p18n).toMatch(
      /raise\s+exception\s+'action and customer_id are required'/,
    );
  });

  it("enforces tenant ownership or admin before insert", () => {
    expect(p18n).toMatch(/private\.is_admin\s*\(\s*v_actor\s*\)/);
    expect(p18n).toMatch(
      /private\.user_owns_customer\s*\(\s*v_actor\s*,\s*_customer_id\s*\)/,
    );
    expect(p18n).toMatch(
      /raise\s+exception\s+'not authorized for this customer'/,
    );
  });

  it("rate-limits authenticated audit inserts (max 100 / 60s)", () => {
    // Service role must NOT enter the rate limit branch — it should sit
    // inside the ELSE (non-service) block.
    expect(p18n).toMatch(/v_recent\s*>=\s*100/);
    expect(p18n).toMatch(/interval\s+'60 seconds'/);
    expect(p18n).toMatch(/raise\s+exception\s+'audit rate limit exceeded'/);
  });

  it("caps the details payload at 16 KB", () => {
    expect(p18n).toMatch(/pg_column_size\s*\(\s*coalesce\s*\(\s*_details/);
    expect(p18n).toMatch(/v_size\s*>\s*16384/);
    expect(p18n).toMatch(/raise\s+exception\s+'audit details too large'/);
  });

  it("revokes audit RPC from public/anon and grants only to authenticated/service_role", () => {
    expect(p18).toContain(
      "REVOKE ALL ON FUNCTION public.log_portal_audit(public.portal_audit_action, uuid, jsonb) FROM PUBLIC",
    );
    expect(p18).toContain(
      "REVOKE ALL ON FUNCTION public.log_portal_audit(public.portal_audit_action, uuid, jsonb) FROM anon",
    );
    expect(p18).toMatch(
      /GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.log_portal_audit\([^)]*\)\s+TO\s+authenticated,\s*service_role/,
    );
  });
});

describe("P18 — portal_audit_log integrity", () => {
  it("constrains actor_role to a known set and is NOT NULL", () => {
    expect(p18n).toMatch(
      /alter\s+table\s+public\.portal_audit_log\s+alter\s+column\s+actor_role\s+set\s+not\s+null/,
    );
    expect(p18n).toMatch(
      /add\s+constraint\s+portal_audit_log_actor_role_check\s+check\s*\(\s*actor_role\s+in\s*\(\s*'admin'\s*,\s*'client'\s*,\s*'service'\s*,\s*'unknown'\s*\)\s*\)/,
    );
  });
});

describe("P18 — get_effective_tools_for_customer fail-closed null check", () => {
  it("private function rejects a null customer_id", () => {
    // Look for the private function body and assert the guard appears
    // before the authorization check.
    expect(p18n).toMatch(
      /create\s+or\s+replace\s+function\s+private\.get_effective_tools_for_customer[\s\S]*?if\s+_customer_id\s+is\s+null\s+then\s+raise\s+exception\s+'customer_id required'/,
    );
  });

  it("public wrapper also rejects a null customer_id", () => {
    expect(p18n).toMatch(
      /create\s+or\s+replace\s+function\s+public\.get_effective_tools_for_customer[\s\S]*?if\s+_customer_id\s+is\s+null\s+then\s+raise\s+exception\s+'customer_id required'/,
    );
  });
});

describe("P18 — audit call-site wiring", () => {
  function read(p: string) {
    return readFileSync(join(root, p), "utf8");
  }

  it("logPortalAudit helper exists and uses the typed RPC", () => {
    const src = read("src/lib/portalAudit.ts");
    expect(src).toMatch(/export\s+async\s+function\s+logPortalAudit/);
    expect(src).toContain('supabase.rpc("log_portal_audit"');
  });

  it("client task status changes emit task_status_changed audit events", () => {
    const src = read("src/lib/clientTaskOutcomes.ts");
    expect(src).toMatch(/logPortalAudit\(\s*"task_status_changed"/);
    // Only minimal, safe payload fields — never note text or content.
    expect(src).not.toMatch(/logPortalAudit\([^)]*params\.note/);
  });

  it("client uploads emit file_uploaded audit events", () => {
    const src = read("src/pages/portal/Uploads.tsx");
    expect(src).toMatch(/logPortalAudit\(\s*"file_uploaded"/);
  });

  it("audit helper never forwards token/secret-shaped fields", () => {
    const src = read("src/lib/portalAudit.ts");
    // Strip line and block comments before scanning so the cautionary
    // documentation in the helper's header doesn't trigger false positives.
    // Also strip the explicit denylist constant — those string literals
    // exist precisely so the helper can REMOVE such fields, not forward them.
    const code = src
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:])\/\/[^\n]*/g, "$1")
      .replace(/const\s+DENYLIST\s*=\s*new\s+Set\(\[[\s\S]*?\]\);/, "");
    expect(code).not.toMatch(/access_token|refresh_token|ciphertext|api_key|secret/i);
  });
});

describe("P18 — frontend cannot reference token RPCs / private schema", () => {
  function walk(dir: string): string[] {
    const out: string[] = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
        out.push(...walk(full));
      } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
        out.push(full);
      }
    }
    return out;
  }

  // Tests, the generated supabase types file, and the security test
  // suites are allowed to mention these names.
  const srcFiles = walk(join(root, "src")).filter(
    (f) => !/__tests__|integrations\/supabase\/types\.ts$/.test(f),
  );

  it("never references QuickBooks token columns or RPCs from frontend code", () => {
    const offenders: string[] = [];
    for (const file of srcFiles) {
      const text = readFileSync(file, "utf8");
      if (
        /access_token_ciphertext|refresh_token_ciphertext|qb_(get|store)_connection_tokens|qb_token_encryption_key/.test(
          text,
        )
      ) {
        offenders.push(file);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("never reads .access_token or .refresh_token from a Supabase row in frontend code", () => {
    // Allow `session.access_token` / `session.refresh_token` (auth session
    // shape, not row data). Disallow anything that looks like row access:
    // `data.access_token`, `row.refresh_token`, `qc.access_token`, etc.
    const offenders: string[] = [];
    const rowAccessRe =
      /(?:row|rec|conn|qc|data|item|entry)\s*\??\.\s*(?:access|refresh)_token\b/;
    for (const file of srcFiles) {
      const text = readFileSync(file, "utf8");
      if (rowAccessRe.test(text)) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });

  it("never references the private schema from frontend code", () => {
    const offenders: string[] = [];
    for (const file of srcFiles) {
      const text = readFileSync(file, "utf8");
      if (
        /\.from\(\s*['"`]private\./.test(text) ||
        /\.schema\(\s*['"`]private['"`]/.test(text) ||
        /private\.quickbooks_connection_tokens/.test(text)
      ) {
        offenders.push(file);
      }
    }
    expect(offenders).toEqual([]);
  });
});