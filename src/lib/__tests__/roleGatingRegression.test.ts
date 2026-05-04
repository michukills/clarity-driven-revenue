import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const appTsx = readFileSync(join(root, "src/App.tsx"), "utf8");

/**
 * Security / role-gating regression pass.
 *
 * Static-only checks that lock in the public/client/admin separation
 * established by the P17–P20 hardening passes. They do not exercise
 * RLS at the database level (those are covered by portalSecurityModel
 * and supabaseSecurityHardening), but they prevent obvious regressions
 * in the route table and frontend secret hygiene.
 */
describe("Role-gating regression", () => {
  it("guards every /admin route with ProtectedRoute requireRole=\"admin\"", () => {
    const routeLines = appTsx.split("\n").filter((l) => l.includes("<Route "));
    const adminRoutes = routeLines.filter((l) => /path="\/admin/.test(l));
    for (const line of adminRoutes) {
      const isRedirect = /<Navigate\s+to=/.test(line) || /LegacyAdminBccRedirect/.test(line);
      const isGuarded = /requireRole="admin"/.test(line);
      expect(
        isRedirect || isGuarded,
        `New /admin/* route is missing ProtectedRoute requireRole="admin": ${line.trim()}`,
      ).toBe(true);
    }
  });

  it("wraps every /portal route with ProtectedRoute", () => {
    const routeLines = appTsx.split("\n").filter((l) => l.includes("<Route "));
    const portalRoutes = routeLines.filter((l) => /path="\/portal/.test(l));
    expect(portalRoutes.length).toBeGreaterThan(0);
    for (const line of portalRoutes) {
      expect(
        /ProtectedRoute/.test(line),
        `New /portal/* route is missing ProtectedRoute: ${line.trim()}`,
      ).toBe(true);
    }
  });

  it("client report queries explicitly exclude internal_notes", () => {
    const reportView = readFileSync(join(root, "src/pages/portal/ReportView.tsx"), "utf8");
    const reports = readFileSync(join(root, "src/pages/portal/Reports.tsx"), "utf8");
    expect(reportView).not.toMatch(/internal_notes(?!\s*from)/);
    expect(reports).not.toMatch(/internal_notes(?!\s*from)/);
    // Both files document the exclusion via P4.5 hygiene comment.
    expect(reportView).toMatch(/exclude\s+internal_notes/i);
    expect(reports).toMatch(/exclude\s+internal_notes/i);
  });

  it("frontend bundle does not reference service role / hardcoded provider secrets", () => {
    const banned = [
      /SUPABASE_SERVICE_ROLE_KEY/,
      /VITE_SUPABASE_SERVICE/,
      /sk_live_[A-Za-z0-9]{8,}/,
      /sk_test_[A-Za-z0-9]{16,}/,
    ];
    const skipDir = new Set(["__tests__", "node_modules"]);
    function walk(dir: string, files: string[] = []): string[] {
      for (const entry of readdirSync(dir)) {
        if (skipDir.has(entry)) continue;
        const full = join(dir, entry);
        const st = statSync(full);
        if (st.isDirectory()) walk(full, files);
        else if (/\.(ts|tsx)$/.test(entry) && !/\.test\./.test(entry)) files.push(full);
      }
      return files;
    }
    const files = walk(join(root, "src"));
    for (const file of files) {
      // The auto-generated Supabase types file references token columns
      // by name (DB schema mirror); not an actual secret value.
      if (file.endsWith("integrations/supabase/types.ts")) continue;
      const text = readFileSync(file, "utf8");
      for (const pattern of banned) {
        expect(pattern.test(text), `Banned secret pattern ${pattern} found in ${file}`).toBe(false);
      }
    }
  });

  it("portal tool routes that require assignment are wrapped in ClientToolGuard", () => {
    // Routes whose entitlement comes from public.get_effective_tools_for_customer.
    // Adding a tool route without ClientToolGuard would silently bypass the
    // tool-assignment gate.
    const mustGuard = [
      "/portal/scorecard",
      "/portal/reports",
      "/portal/uploads",
      "/portal/priority-tasks",
      "/portal/connected-sources",
      "/portal/business-control-center/revenue-tracker",
      "/portal/tools/self-assessment",
      "/portal/tools/implementation-tracker",
      "/portal/tools/weekly-reflection",
      "/portal/tools/revenue-risk-monitor",
      "/portal/tools/scorecard-history",
      "/portal/tools/tool-library",
    ];
    for (const path of mustGuard) {
      const line = appTsx.split("\n").find((l) => l.includes(`path="${path}"`));
      expect(line, `Route ${path} missing from App.tsx`).toBeTruthy();
      expect(/ClientToolGuard/.test(line!), `Route ${path} must use ClientToolGuard`).toBe(true);
    }
  });
});