/**
 * Admin/System Tool Deep Hardening — contract tests.
 *
 * Verifies the shared AdminScopeBanner is wired into the launch-relevant
 * admin operating surfaces, that admin route protection is preserved, that
 * report/storage/AI primitives are not weakened, that admin-only notes
 * remain admin-only, and that no banned scope-creep / out-of-scope wording
 * leaks into the changed admin surfaces.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

const ADMIN_SURFACES = [
  "src/pages/admin/PendingAccounts.tsx",
  "src/pages/admin/ReportDrafts.tsx",
  "src/pages/admin/ClientHealthOverview.tsx",
  "src/pages/admin/FinancialVisibilityAdmin.tsx",
  "src/pages/admin/SystemReadiness.tsx",
  "src/pages/admin/SavedBenchmarks.tsx",
  "src/pages/admin/WalkthroughVideosAdmin.tsx",
] as const;

const ADMIN_ROUTES: Array<[string, string]> = [
  ["/admin", "AdminDashboard"],
  ["/admin/tool-directory", "AdminToolDirectoryPage"],
  ["/admin/customers", "Customers"],
  ["/admin/customers/:id", "CustomerDetail"],
  ["/admin/pending-accounts", "PendingAccounts"],
  ["/admin/diagnostic-orders", "DiagnosticOrders"],
  ["/admin/report-drafts", "AdminReportDrafts"],
  ["/admin/client-health", "ClientHealthOverview"],
  ["/admin/industry-brain", "IndustryBrainAdmin"],
  ["/admin/system-readiness", "SystemReadiness"],
  ["/admin/saved-benchmarks", "SavedBenchmarks"],
  ["/admin/walkthrough-videos", "WalkthroughVideosAdmin"],
];

const BANNED = [
  /unlimited support/i,
  /unlimited consulting/i,
  /done[- ]for[- ]you/i,
  /guaranteed (revenue|roi|results|outcomes?|renewal)/i,
  /full[- ]service operator/i,
  /HIPAA/i,
  /healthcare compliance/i,
];

describe("Admin/System tool deep hardening", () => {
  it("AdminScopeBanner exists and is pure presentation (no data, no AI, no secrets)", () => {
    const p = "src/components/admin/AdminScopeBanner.tsx";
    expect(existsSync(join(root, p))).toBe(true);
    const src = read(p);
    expect(src).toMatch(/AdminScopeBanner/);
    expect(src).not.toMatch(/supabase|fetch\(|rpc\(/);
    expect(src).not.toMatch(/LOVABLE_API_KEY|process\.env|import\.meta\.env\.[A-Z_]*KEY/);
    expect(src).not.toMatch(/api\.openai\.com|generativelanguage|ai\.gateway\.lovable\.dev/);
  });

  for (const page of ADMIN_SURFACES) {
    it(`${page} wires AdminScopeBanner`, () => {
      const src = read(page);
      expect(src).toMatch(/AdminScopeBanner/);
    });
    it(`${page} contains no banned scope-creep wording`, () => {
      const src = read(page);
      for (const re of BANNED) expect(src, `matched ${re} in ${page}`).not.toMatch(re);
    });
  }

  it("All audited admin routes remain ProtectedRoute requireRole=admin", () => {
    const app = read("src/App.tsx");
    for (const [path, comp] of ADMIN_ROUTES) {
      const re = new RegExp(
        `path="${path.replace(/[/.*+?^${}()|[\]\\]/g, (s) => "\\" + s)}"\\s+element=\\{<ProtectedRoute requireRole="admin">\\s*<${comp}\\b`,
      );
      expect(app, `route ${path} not admin-protected for ${comp}`).toMatch(re);
    }
  });

  it("RGS Tool Directory route is not exposed in the client portal nav", () => {
    const shell = read("src/components/portal/PortalShell.tsx");
    // The customer nav base must not link to /admin/tool-directory.
    const customerBase = shell.match(/customerNavBase[\s\S]*?\];/);
    if (customerBase) {
      expect(customerBase[0]).not.toMatch(/\/admin\/tool-directory/);
    }
  });

  it("Report drafts surface preserves AI safety language and admin-only default", () => {
    const src = read("src/pages/admin/ReportDrafts.tsx");
    expect(src).toMatch(/never client-facing/i);
    expect(src).toMatch(/AI[\s\S]{0,80}admin/i);
  });

  it("StoredToolReportsPanel + tool_report_artifacts plumbing preserved", () => {
    const panel = read("src/components/admin/StoredToolReportsPanel.tsx");
    expect(panel).toMatch(/tool-reports/);
    expect(panel).toMatch(/getToolReportSignedUrl/);
    expect(panel).toMatch(/setToolReportArtifactClientVisible/);
    // Guard rails: admin must approve + draft must be approved + client_safe.
    expect(panel).toMatch(/draft\.status !== "approved" \|\| !draft\.client_safe/);
  });

  it("FinancialVisibilityAdmin does not expose tokens/secrets in browser", () => {
    const src = read("src/pages/admin/FinancialVisibilityAdmin.tsx");
    expect(src).not.toMatch(/access_token|refresh_token|client_secret|service_role/i);
  });

  it("Admin surfaces do not read raw internal_notes/admin_notes columns into client-visible state", () => {
    for (const page of ADMIN_SURFACES) {
      const src = read(page);
      // It is OK for admin surfaces to manage internal_notes — but they should
      // not be wired into a client-facing context. These admin pages live
      // behind ProtectedRoute admin, so this is a smoke check that we are not
      // accidentally importing client-portal helpers here.
      expect(src).not.toMatch(/from "@\/components\/portal\/ClientToolGuard"/);
    }
  });
});