import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * P29 — Tenant isolation contract.
 *
 * Static checks that lock in client-facing portal data scoping. These do
 * not exercise RLS at the database level (covered by portalSecurityModel
 * and supabaseSecurityHardening) but prevent obvious regressions in how
 * the frontend resolves the active customer and queries scoped data.
 */

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

function walk(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "__tests__" || entry === "node_modules") continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, files);
    else if (/\.(ts|tsx)$/.test(entry) && !/\.test\./.test(entry)) files.push(full);
  }
  return files;
}

describe("Tenant isolation contract", () => {
  it("portal pages resolve customer via usePortalCustomerId or auth, never trust route params for tenancy", () => {
    // Files that read business data scoped by customer must derive the
    // customer id from the authenticated session (usePortalCustomerId or
    // useAuth), not from URL params. ReportView is the one allowed
    // exception because it filters by the report id and RLS enforces
    // ownership server-side.
    const portalDataPages = [
      "src/pages/portal/Reports.tsx",
      "src/pages/portal/ClientRevenueTrackerPage.tsx",
      "src/pages/portal/Diagnostics.tsx",
      "src/pages/portal/BusinessControlCenter.tsx",
      "src/pages/portal/ConnectedSources.tsx",
      "src/pages/portal/PriorityTasks.tsx",
      "src/pages/portal/MyTools.tsx",
    ];
    for (const file of portalDataPages) {
      const text = read(file);
      // Must not destructure a customer/customer_id field directly out of useParams.
      const derivesFromParams =
        /const\s*\{[^}]*customer[^}]*\}\s*=\s*useParams/i.test(text);
      expect(derivesFromParams, `${file} must not derive customer from URL params`).toBe(false);
    }
  });

  it("ReportView filters by status='published' and relies on RLS for cross-tenant protection", () => {
    const text = read("src/pages/portal/ReportView.tsx");
    expect(text).toContain('.eq("status", "published")');
    // Must not bypass RLS by service-role client.
    expect(text).not.toMatch(/SERVICE_ROLE/);
  });

  it("Reports list filters by status='published' (no admin-only drafts leak)", () => {
    const text = read("src/pages/portal/Reports.tsx");
    expect(text).toContain('.eq("status", "published")');
  });

  it("usePortalCustomerId scopes lookups to user_id with archived filter", () => {
    const text = read("src/hooks/usePortalCustomerId.ts");
    expect(text).toMatch(/\.eq\("user_id", user\.id\)/);
    expect(text).toMatch(/\.is\("archived_at", null\)/);
    // Admin in preview MUST come from previewCustomerId only.
    expect(text).toContain("previewCustomerId");
  });

  it("ClientToolGuard uses get_effective_tools_for_customer as single source of truth", () => {
    const guard = read("src/components/portal/ClientToolGuard.tsx");
    expect(guard).toContain("getEffectiveToolsForCustomer");
    expect(guard).toContain("effective_enabled");
    // Catalog helper must call the SECURITY DEFINER RPC.
    const catalog = read("src/lib/toolCatalog.ts");
    expect(catalog).toMatch(/get_effective_tools_for_customer/);
  });

  it("ProtectedRoute enforces preview-as-client gating for admins on /portal", () => {
    const text = read("src/components/portal/ProtectedRoute.tsx");
    expect(text).toContain("previewAsClient");
    expect(text).toMatch(/Navigate to="\/admin"/);
  });

  it("admin preview-as-client transitions are audit-logged", () => {
    // The portal audit RPC is the only sanctioned write path for these events.
    const audit = read("src/lib/portalAudit.ts");
    expect(audit).toMatch(/log_portal_audit/);
  });

  it("no portal page selects internal_notes from any table", () => {
    const portalDir = join(root, "src/pages/portal");
    const files = walk(portalDir);
    for (const f of files) {
      const text = readFileSync(f, "utf8");
      // Allow comments that mention exclusion intent, ban actual selects.
      const matches = text.match(/internal_notes/g) ?? [];
      const allowed = (text.match(/exclude\s+internal_notes/gi) ?? []).length;
      expect(matches.length, `Unexpected internal_notes reference in ${f}`).toBeLessThanOrEqual(allowed);
    }
  });
});

describe("Frontend import boundary", () => {
  const adminOnlyImportPatterns = [
    /from\s+["']@\/lib\/admin\//,
    /from\s+["']@\/lib\/internal\//,
    /from\s+["']@\/components\/admin\//,
    /from\s+["']@\/pages\/admin\//,
  ];

  function publicAndPortalFiles(): string[] {
    const out: string[] = [];
    const pages = walk(join(root, "src/pages"));
    for (const f of pages) {
      const rel = f.slice(root.length + 1);
      if (rel.startsWith("src/pages/admin/")) continue;
      out.push(f);
    }
    return out;
  }

  it("public and portal pages do not import admin-only modules", () => {
    for (const file of publicAndPortalFiles()) {
      const text = readFileSync(file, "utf8");
      for (const pat of adminOnlyImportPatterns) {
        expect(pat.test(text), `${file} imports admin-only module: ${pat}`).toBe(false);
      }
    }
  });

  it("public and portal pages do not reference service-role / token-store helpers", () => {
    const banned = [
      /SUPABASE_SERVICE_ROLE_KEY/,
      /qb_get_connection_tokens/,
      /qb_store_connection_tokens/,
      /qb_token_encryption_key/,
      /pgp_sym_decrypt/,
    ];
    for (const file of publicAndPortalFiles()) {
      const text = readFileSync(file, "utf8");
      for (const pat of banned) {
        expect(pat.test(text), `${file} references server-only helper: ${pat}`).toBe(false);
      }
    }
  });
});