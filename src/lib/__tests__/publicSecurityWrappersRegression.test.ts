import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Regression guard for the BCC / 403-storm bug.
 *
 * The Business Control Center failed because RLS policies call
 * public.is_admin() / public.user_owns_customer() / etc., but those
 * wrappers delegated into private.* without being SECURITY DEFINER.
 * Authenticated users do not have USAGE on the private schema, so RLS
 * evaluation returned 42501 "permission denied for schema private".
 *
 * This test asserts that the canonical migration that fixed the bug stays
 * in source and that no later migration silently rewrites these wrappers
 * back to SECURITY INVOKER, removes the safe search_path, or reintroduces
 * a wrapper without the private schema in scope.
 */

const MIGRATIONS_DIR = "supabase/migrations";
const FIX_MIGRATION = "20260430111918_0e7d7565-9162-4b2d-9591-3ecc4ee26c0d.sql";

const WRAPPERS = [
  { name: "is_admin", args: "_user_id uuid" },
  { name: "has_role", args: "_user_id uuid, _role app_role" },
  { name: "is_platform_owner", args: "_user_id uuid" },
  { name: "user_owns_customer", args: "_user_id uuid, _customer_id uuid" },
  { name: "user_has_resource_assignment", args: "_user_id uuid, _resource_id uuid" },
  { name: "resource_visibility_for", args: "_resource_id uuid" },
] as const;

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

/** Extract every CREATE [OR REPLACE] FUNCTION block targeting a public wrapper. */
function extractWrapperBlocks(sql: string, fnName: string): string[] {
  const re = new RegExp(
    String.raw`CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+public\.${fnName}\b[\s\S]*?\$function\$\s*;`,
    "gi",
  );
  return sql.match(re) ?? [];
}

describe("public security wrapper regression — BCC / RLS 403 fix", () => {
  const fixSql = read(`${MIGRATIONS_DIR}/${FIX_MIGRATION}`);

  it("the canonical fix migration is present in source", () => {
    expect(fixSql.length).toBeGreaterThan(0);
    // The migration must mention the BCC symptom so the intent is preserved.
    expect(fixSql).toContain("permission denied for schema private");
  });

  for (const { name, args } of WRAPPERS) {
    describe(`public.${name}(${args})`, () => {
      const block = extractWrapperBlocks(fixSql, name)[0];

      it("is defined in the fix migration", () => {
        expect(block, `public.${name} is missing from ${FIX_MIGRATION}`).toBeTruthy();
      });

      it("is declared SECURITY DEFINER (not INVOKER)", () => {
        expect(block).toMatch(/SECURITY\s+DEFINER/i);
        expect(block).not.toMatch(/SECURITY\s+INVOKER/i);
      });

      it("has a stable, safe search_path that includes private", () => {
        // Must pin search_path so a session-level search_path cannot hijack it.
        expect(block).toMatch(/SET\s+search_path\s+TO\s+'public'\s*,\s*'private'/i);
      });

      it("delegates into the private.* implementation (does not bypass RLS logic)", () => {
        expect(block).toMatch(new RegExp(String.raw`SELECT\s+private\.${name}\s*\(`, "i"));
      });

      it("is marked STABLE so it can be used inside RLS without side effects", () => {
        expect(block).toMatch(/\bSTABLE\b/);
      });

      it("contains no data-modifying SQL (INSERT/UPDATE/DELETE/DROP/ALTER/TRUNCATE)", () => {
        // Body between the dollar-quoted delimiters is the only thing that runs.
        const bodyMatch = block.match(/\$function\$([\s\S]*?)\$function\$/i);
        const body = bodyMatch?.[1] ?? "";
        expect(body).not.toMatch(/\bINSERT\b/i);
        expect(body).not.toMatch(/\bUPDATE\b/i);
        expect(body).not.toMatch(/\bDELETE\b/i);
        expect(body).not.toMatch(/\bDROP\b/i);
        expect(body).not.toMatch(/\bALTER\b/i);
        expect(body).not.toMatch(/\bTRUNCATE\b/i);
      });

      it("does not expose private table data — only delegates to the matching private function", () => {
        const bodyMatch = block.match(/\$function\$([\s\S]*?)\$function\$/i);
        const body = (bodyMatch?.[1] ?? "").trim();
        // Allowed shape: SELECT private.<same name>(args). No FROM clauses,
        // no joins, no references to private tables.
        expect(body).not.toMatch(/\bFROM\s+private\./i);
        expect(body).not.toMatch(/\bJOIN\s+private\./i);
        // The only private.* reference allowed is the delegation call itself.
        const privateRefs = body.match(/private\.[a-z_]+/gi) ?? [];
        for (const ref of privateRefs) {
          expect(ref.toLowerCase()).toBe(`private.${name}`);
        }
      });
    });
  }

  it("no later migration silently downgrades a wrapper to SECURITY INVOKER", () => {
    const allMigrations = readdirSync(join(process.cwd(), MIGRATIONS_DIR))
      .filter((f) => f.endsWith(".sql") && f > FIX_MIGRATION)
      .sort();

    for (const file of allMigrations) {
      const body = read(`${MIGRATIONS_DIR}/${file}`);
      for (const { name } of WRAPPERS) {
        const blocks = extractWrapperBlocks(body, name);
        for (const block of blocks) {
          // If a later migration redefines a wrapper, it MUST keep the same
          // security shape — otherwise the BCC bug returns.
          expect(
            /SECURITY\s+DEFINER/i.test(block),
            `${file} redefines public.${name} without SECURITY DEFINER — this re-introduces the BCC 403 bug`,
          ).toBe(true);
          expect(
            /SET\s+search_path\s+TO\s+'public'\s*,\s*'private'/i.test(block),
            `${file} redefines public.${name} without the safe 'public, private' search_path`,
          ).toBe(true);
          expect(
            new RegExp(String.raw`private\.${name}\s*\(`, "i").test(block),
            `${file} redefines public.${name} but no longer delegates to private.${name}`,
          ).toBe(true);
        }
      }
    }
  });

  it("no later migration revokes EXECUTE from the authenticated role on a wrapper (RLS would break)", () => {
    const allMigrations = readdirSync(join(process.cwd(), MIGRATIONS_DIR))
      .filter((f) => f.endsWith(".sql") && f >= FIX_MIGRATION)
      .sort();

    for (const file of allMigrations) {
      const body = read(`${MIGRATIONS_DIR}/${file}`);
      // Scope the scan to a single statement at a time. The original regex
      // used `[\s\S]*?` and matched lazily across hundreds of unrelated SQL
      // lines (e.g. an `is_admin(auth.uid())` policy clause near the top of
      // the file paired with a `revoke execute on function
      // diagnostic_order_mark_paid ... from public` near the bottom). That
      // produced false positives whenever a migration both used a wrapper
      // in an RLS policy and revoked execute on an unrelated function.
      //
      // Splitting on `;` isolates each SQL statement so a REVOKE is only
      // flagged when the wrapper name and the `authenticated` role appear
      // in the same revoke statement.
      const statements = body.split(";");
      for (const { name } of WRAPPERS) {
        for (const stmt of statements) {
          const isRevoke = /\bREVOKE\b[\s\S]*\bEXECUTE\b/i.test(stmt);
          if (!isRevoke) continue;
          // Match the wrapper as an exact function reference (with `(` so
          // `is_admin` does not also match `diagnostic_order_mark_paid`).
          const targetsWrapper = new RegExp(
            String.raw`\bpublic\.${name}\s*\(`,
            "i",
          ).test(stmt);
          const targetsAuthenticated = /\bauthenticated\b/i.test(stmt);
          expect(
            targetsWrapper && targetsAuthenticated,
            `${file} revokes EXECUTE on public.${name} from authenticated — RLS policies will return 403`,
          ).toBe(false);
        }
      }
    }
  });
});

/**
 * Live-DB regression checks live in
 *   supabase/tests/public_security_wrappers.sql
 * and can be run with:
 *   psql "$SUPABASE_DB_URL" -f supabase/tests/public_security_wrappers.sql
 * That file is the source-of-truth for runtime guarantees (BCC lookup,
 * internal-account visibility, anon execute revoked, authenticated execute
 * preserved). This vitest spec is the source-of-truth for the migration
 * contract.
 */