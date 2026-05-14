/**
 * P93F-Closeout — Server-side admin cleanup contract.
 *
 * Locks in:
 *  - The admin customer detail page no longer performs a client-side cascade
 *    delete via supabase.from(...).delete(); it routes through the
 *    admin-cleanup-customer edge function instead.
 *  - The new edge function exists, validates input with zod, calls
 *    requireAdmin(), supports archive/restore/delete, blocks real-client
 *    hard delete unless explicitly forced, and writes to the
 *    customer_cleanup_audit table.
 *  - The admin archive button also goes through the server function.
 *  - No Supabase service-role key is referenced in src/.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../../..");
const fnPath = path.join(
  ROOT,
  "supabase/functions/admin-cleanup-customer/index.ts",
);
const customerDetailPath = path.join(
  ROOT,
  "src/pages/admin/CustomerDetail.tsx",
);

describe("P93F-Closeout — admin cleanup edge function", () => {
  it("admin-cleanup-customer edge function exists", () => {
    expect(fs.existsSync(fnPath)).toBe(true);
  });

  const fnSrc = fs.existsSync(fnPath) ? fs.readFileSync(fnPath, "utf8") : "";

  it("validates input with zod and supports the three actions", () => {
    expect(fnSrc).toMatch(/from "https:\/\/esm\.sh\/zod/);
    expect(fnSrc).toMatch(/z\.enum\(\["archive", "restore", "delete"\]\)/);
    expect(fnSrc).toMatch(/z\.string\(\)\.uuid\(\)/);
  });

  it("requires admin auth via the shared helper", () => {
    expect(fnSrc).toMatch(
      /import \{[^}]*requireAdmin[^}]*\} from "\.\.\/_shared\/admin-auth\.ts"/,
    );
    expect(fnSrc).toMatch(/await requireAdmin\(/);
  });

  it("blocks real-client hard delete unless explicitly forced", () => {
    expect(fnSrc).toMatch(/forceRealClientDelete/);
    expect(fnSrc).toMatch(/Refusing to delete a real client account/);
    expect(fnSrc).toMatch(/real_client_blocked/);
  });

  it("requires confirmEmail to match the row email for delete", () => {
    expect(fnSrc).toMatch(/Confirmation email does not match target account/);
  });

  it("writes an audit row for every attempt (success and failure)", () => {
    expect(fnSrc).toMatch(/customer_cleanup_audit/);
    // Audit must be invoked on both success and failure paths.
    const matches = fnSrc.match(/logAudit\(\{/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(3);
  });

  it("uses the service-role client only inside the edge function", () => {
    expect(fnSrc).toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
  });
});

describe("P93F-Closeout — CustomerDetail no longer cascades from the client", () => {
  const detailSrc = fs.readFileSync(customerDetailPath, "utf8");

  it("delete handler invokes the admin-cleanup-customer edge function", () => {
    expect(detailSrc).toMatch(
      /supabase\.functions\.invoke\(\s*"admin-cleanup-customer"/,
    );
  });

  it("does not perform client-side cascade deletes against cascade tables", () => {
    const cascadeTables = [
      "resource_assignments",
      "customer_notes",
      "customer_tasks",
      "checklist_items",
      "customer_timeline",
      "customer_uploads",
    ];
    for (const t of cascadeTables) {
      const re = new RegExp(
        `supabase\\.from\\(\\s*"${t}"\\s*\\)\\.delete\\(\\)`,
      );
      expect(detailSrc).not.toMatch(re);
    }
    // The customers row itself must not be deleted from the client either.
    expect(detailSrc).not.toMatch(
      /supabase\.from\(\s*"customers"\s*\)\.delete\(\)/,
    );
  });

  it("archive/restore button also routes through the server function", () => {
    // The archive handler should no longer call .update({ archived_at }) directly.
    expect(detailSrc).not.toMatch(
      /supabase\.from\(\s*"customers"\s*\)\.update\(\s*\{\s*archived_at\s*\}/,
    );
    // It should call the edge function with action "archive" or "restore".
    expect(detailSrc).toMatch(
      /action:\s*c\.archived_at\s*\?\s*"restore"\s*:\s*"archive"/,
    );
  });
});

describe("P93F-Closeout — no service-role key in frontend", () => {
  it("src/ never references SUPABASE_SERVICE_ROLE_KEY or RESEND_API_KEY", () => {
    function walk(dir: string): string[] {
      const out: string[] = [];
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) {
          if (e.name === "__tests__" || e.name === "node_modules") continue;
          out.push(...walk(full));
        } else if (/\.(ts|tsx)$/.test(e.name)) {
          out.push(full);
        }
      }
      return out;
    }
    const offenders: string[] = [];
    for (const f of walk(path.join(ROOT, "src"))) {
      const src = fs.readFileSync(f, "utf8");
      if (/SUPABASE_SERVICE_ROLE_KEY|RESEND_API_KEY/.test(src)) {
        offenders.push(f);
      }
    }
    expect(offenders).toEqual([]);
  });
});