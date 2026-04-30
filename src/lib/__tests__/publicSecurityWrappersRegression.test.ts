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
      for (const { name } of WRAPPERS) {
        const re = new RegExp(
          String.raw`REVOKE[\s\S]*?EXECUTE[\s\S]*?public\.${name}[\s\S]*?FROM[\s\S]*?\bauthenticated\b`,
          "i",
        );
        expect(
          re.test(body),
          `${file} revokes EXECUTE on public.${name} from authenticated — RLS policies will return 403`,
        ).toBe(false);
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