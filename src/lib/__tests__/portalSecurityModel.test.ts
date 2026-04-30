import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const migrationsDir = join(root, "supabase/migrations");

const p17Path = join(migrationsDir, "20260430085109_33fac8f4-2462-408d-9027-0dda64256e85.sql");
const p17 = readFileSync(p17Path, "utf8");

function normalize(sql: string): string {
  return sql
    .replace(/--[^\n]*\n/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();
}

const p17n = normalize(p17);

/**
 * P17 — portal-wide security model regression guards.
 *
 * These checks operate on the SQL text of the P17 migration plus a
 * filesystem scan of the rest of the codebase. They are static, do not
 * require a live database, and therefore safely run in CI.
 */
describe("P17 — portal audit log + tenant scoping", () => {
  it("creates the tenant-scoped portal_audit_log table", () => {
    expect(p17).toContain("CREATE TABLE IF NOT EXISTS public.portal_audit_log");
    // Must reference the customers table for tenant scoping.
    expect(p17n).toMatch(
      /customer_id\s+uuid\s+not\s+null\s+references\s+public\.customers/,
    );
    expect(p17).toContain("ALTER TABLE public.portal_audit_log ENABLE ROW LEVEL SECURITY");
  });

  it("scopes audit reads to admins or the owning customer", () => {
    expect(p17).toContain('CREATE POLICY "Admins read portal audit log"');
    expect(p17).toContain('CREATE POLICY "Clients read own portal audit log"');
    expect(p17n).toMatch(/using\s*\(\s*public\.user_owns_customer\s*\(\s*auth\.uid\(\)\s*,\s*customer_id\s*\)\s*\)/);
  });

  it("does not grant INSERT/UPDATE/DELETE on the audit table to clients", () => {
    // The migration only grants SELECT to authenticated; writes go via RPC.
    expect(p17).toContain("GRANT SELECT ON TABLE public.portal_audit_log TO authenticated");
    expect(p17n).not.toMatch(/grant\s+(insert|update|delete)\s+on\s+table\s+public\.portal_audit_log\s+to\s+(authenticated|anon|public)/);
    expect(p17n).not.toMatch(/grant\s+all\s+on\s+table\s+public\.portal_audit_log\s+to\s+(authenticated|anon|public)/);
  });

  it("exposes log_portal_audit as a SECURITY DEFINER RPC that enforces tenant ownership", () => {
    expect(p17).toContain("CREATE OR REPLACE FUNCTION public.log_portal_audit(");
    // SECURITY DEFINER + tenant ownership check.
    expect(p17n).toMatch(/security\s+definer/);
    expect(p17n).toMatch(/private\.user_owns_customer\s*\(\s*v_actor\s*,\s*_customer_id\s*\)/);
    expect(p17n).toMatch(/private\.is_admin\s*\(\s*v_actor\s*\)/);
    // Anonymous callers are denied.
    expect(p17n).toMatch(/raise\s+exception\s+'authentication required'/);
    // Non-owner non-admin callers are denied.
    expect(p17n).toMatch(/raise\s+exception\s+'not authorized for this customer'/);
  });

  it("revokes audit RPC from anon and grants it only to authenticated/service_role", () => {
    expect(p17).toContain(
      "REVOKE ALL ON FUNCTION public.log_portal_audit(public.portal_audit_action, uuid, jsonb) FROM PUBLIC",
    );
    expect(p17).toContain(
      "REVOKE ALL ON FUNCTION public.log_portal_audit(public.portal_audit_action, uuid, jsonb) FROM anon",
    );
    expect(p17).toContain(
      "GRANT EXECUTE ON FUNCTION public.log_portal_audit(public.portal_audit_action, uuid, jsonb) TO authenticated, service_role",
    );
  });

  it("covers all sensitive portal actions enumerated in P17", () => {
    const required = [
      "report_generated",
      "report_viewed",
      "task_assigned",
      "task_status_changed",
      "file_uploaded",
      "file_deleted",
      "connector_connected",
      "connector_disconnected",
      "data_import_started",
      "data_import_completed",
      "admin_note_created",
      "admin_note_edited",
      "ai_recommendation_generated",
      "client_record_updated",
    ];
    for (const action of required) {
      expect(p17, `portal_audit_action enum missing '${action}'`).toContain(`'${action}'`);
    }
  });
});

describe("P17 — public helpers move to SECURITY INVOKER wrappers", () => {
  const helpers = [
    "is_admin",
    "has_role",
    "is_platform_owner",
    "user_owns_customer",
    "resource_visibility_for",
    "user_has_resource_assignment",
  ];

  for (const fn of helpers) {
    it(`creates private.${fn} as SECURITY DEFINER and public.${fn} as a SECURITY INVOKER wrapper`, () => {
      // Private definer body
      const privateRe = new RegExp(
        `create\\s+or\\s+replace\\s+function\\s+private\\.${fn}\\b[\\s\\S]*?security\\s+definer`,
      );
      expect(p17n).toMatch(privateRe);

      // Public wrapper body must say SECURITY INVOKER and call private.<fn>
      const publicRe = new RegExp(
        `create\\s+or\\s+replace\\s+function\\s+public\\.${fn}\\b[\\s\\S]*?security\\s+invoker[\\s\\S]*?private\\.${fn}\\s*\\(`,
      );
      expect(p17n).toMatch(publicRe);
    });
  }

  it("denies anon execution of get_effective_tools_for_customer", () => {
    expect(p17).toContain(
      "REVOKE ALL ON FUNCTION public.get_effective_tools_for_customer(uuid) FROM anon",
    );
  });
});

describe("P17 — trigger guard functions are not directly callable", () => {
  const triggerFns = [
    "diagnostic_ai_followups_guard_client_update",
    "client_tasks_guard_client_update",
    "handle_new_user",
    "handle_customer_stage_change",
  ];

  it("emits revoke statements for known trigger guard functions", () => {
    // The DO block iterates over a list including these names. Assert the
    // names appear in the lockdown list and that the loop revokes from
    // anon/authenticated/PUBLIC.
    for (const fn of triggerFns) {
      expect(p17, `trigger guard ${fn} should be in the lockdown list`).toContain(`'${fn}'`);
    }
    expect(p17n).toMatch(/revoke\s+all\s+on\s+function\s+%s\s+from\s+public/);
    expect(p17n).toMatch(/revoke\s+all\s+on\s+function\s+%s\s+from\s+anon/);
    expect(p17n).toMatch(/revoke\s+all\s+on\s+function\s+%s\s+from\s+authenticated/);
  });
});

describe("P17 — frontend never reaches the private schema or service-role token RPCs", () => {
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

  const srcFiles = walk(join(root, "src")).filter(
    // Tests and the generated supabase types file are allowed to mention names.
    (f) => !/__tests__|integrations\/supabase\/types\.ts$/.test(f),
  );

  it("does not call .from('private.*') from the browser", () => {
    const offenders: string[] = [];
    for (const file of srcFiles) {
      const text = readFileSync(file, "utf8");
      if (/\.from\(\s*['"`]private\./.test(text)) offenders.push(file);
      if (/\.schema\(\s*['"`]private['"`]/.test(text)) offenders.push(file);
    }
    expect(offenders, `frontend referenced private schema in: ${offenders.join(", ")}`).toEqual([]);
  });

  it("does not invoke the QuickBooks token RPCs from the browser", () => {
    const offenders: string[] = [];
    for (const file of srcFiles) {
      const text = readFileSync(file, "utf8");
      if (/qb_(get|store)_connection_tokens|qb_token_encryption_key/.test(text)) {
        offenders.push(file);
      }
    }
    expect(offenders, `frontend referenced service-role-only RPCs in: ${offenders.join(", ")}`).toEqual([]);
  });
});

describe("P17 — RLS coverage of client-owned tables", () => {
  // Static check: every CREATE TABLE in supabase/migrations that has a
  // customer_id column should also enable RLS in the same migration set.
  const migrationFiles = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .map((f) => join(migrationsDir, f));

  const allSql = migrationFiles.map((f) => readFileSync(f, "utf8")).join("\n");
  const allSqlN = normalize(allSql);

  // Tables that have ever been created with a customer_id column.
  const tableRe =
    /create\s+table(?:\s+if\s+not\s+exists)?\s+(?:public\.)?([a-z_][a-z0-9_]*)\s*\(([\s\S]*?)\)\s*;/g;

  const clientOwnedTables = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = tableRe.exec(allSqlN)) !== null) {
    const name = m[1];
    const body = m[2];
    if (/\bcustomer_id\s+uuid/.test(body)) {
      clientOwnedTables.add(name);
    }
  }

  it("found client-owned tables to verify", () => {
    // Sanity: we should have detected a meaningful number of client tables.
    expect(clientOwnedTables.size).toBeGreaterThan(5);
  });

  it("enables RLS on every client-owned table somewhere in the migration history", () => {
    const missing: string[] = [];
    // Some migrations enable RLS via a `format('ALTER TABLE public.%I ENABLE
    // ROW LEVEL SECURITY', t)` loop over an array literal. Collect every
    // table name that appears inside such an array so we can credit it as
    // RLS-enabled even though there is no per-table ALTER statement.
    const dynamicallyEnabled = new Set<string>();
    const arrayLiteralRe = /array\s*\[\s*([^\]]+?)\s*\]/g;
    const formatRe =
      /format\(\s*'alter\s+table\s+public\.%i\s+enable\s+row\s+level\s+security'\s*,\s*([a-z_][a-z0-9_]*)/g;
    if (formatRe.test(allSqlN)) {
      // Pull all single-quoted identifiers from any nearby ARRAY[...] block.
      let am: RegExpExecArray | null;
      while ((am = arrayLiteralRe.exec(allSqlN)) !== null) {
        const items = am[1].split(",").map((s) => s.trim().replace(/^'|'$/g, ""));
        for (const t of items) {
          if (/^[a-z_][a-z0-9_]*$/.test(t)) dynamicallyEnabled.add(t);
        }
      }
    }

    for (const t of clientOwnedTables) {
      const re = new RegExp(
        `alter\\s+table\\s+(?:if\\s+exists\\s+)?(?:public\\.)?${t}\\s+enable\\s+row\\s+level\\s+security`,
      );
      if (!re.test(allSqlN) && !dynamicallyEnabled.has(t)) missing.push(t);
    }
    expect(missing, `missing ENABLE ROW LEVEL SECURITY for: ${missing.join(", ")}`).toEqual([]);
  });
});