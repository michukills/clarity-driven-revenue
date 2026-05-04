/**
 * RGS Control System Tool Deep Hardening — contract tests.
 *
 * Verifies that the shared RcsScopeBanner is wired into the launch-relevant
 * RGS Control System client surfaces, that scope/banned wording is preserved,
 * that admin-only notes never leak into client surfaces, and that the report
 * framework + storage primitives remain intact.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

const RCS_CLIENT_PAGES = [
  "src/pages/portal/tools/RgsControlSystem.tsx",
  "src/pages/portal/tools/PriorityActionTracker.tsx",
  "src/pages/portal/tools/OwnerDecisionDashboard.tsx",
  "src/pages/portal/tools/MonthlySystemReview.tsx",
  "src/pages/portal/tools/ScorecardHistory.tsx",
  "src/pages/portal/tools/AdvisoryNotes.tsx",
  "src/pages/portal/tools/FinancialVisibility.tsx",
] as const;

const BANNED = [
  /unlimited support/i,
  /unlimited consulting/i,
  /unlimited implementation/i,
  /emergency support/i,
  /done[- ]for[- ]you/i,
  /full[- ]service/i,
  /guaranteed (revenue|roi|results|clean data|outcomes?)/i,
  /RGS runs your business/i,
  /RGS manages everything/i,
  /HIPAA/i,
];

describe("RGS Control System tool deep hardening", () => {
  it("RcsScopeBanner component exists and is reusable, no AI/secret refs", () => {
    const p = "src/components/tools/RcsScopeBanner.tsx";
    expect(existsSync(join(root, p))).toBe(true);
    const src = read(p);
    expect(src).toMatch(/RcsScopeBanner/);
    expect(src).not.toMatch(/LOVABLE_API_KEY/);
    expect(src).not.toMatch(/api\.openai\.com|generativelanguage|ai\.gateway\.lovable\.dev/);
    // No data fetching in a presentation banner.
    expect(src).not.toMatch(/supabase|fetch\(|rpc\(/);
  });

  for (const page of RCS_CLIENT_PAGES) {
    it(`${page} wires RcsScopeBanner`, () => {
      const src = read(page);
      expect(src).toMatch(/RcsScopeBanner/);
    });

    it(`${page} contains no banned scope-creep / out-of-scope wording`, () => {
      const src = read(page);
      for (const re of BANNED) expect(src, `matched ${re} in ${page}`).not.toMatch(re);
    });

    it(`${page} does not surface admin-only notes to clients`, () => {
      const src = read(page);
      // Allow narrative phrases like "admin-only notes" inside the scope banner
      // text, but never read raw internal_notes or admin_notes columns.
      expect(src).not.toMatch(/\binternal_notes\b/);
      expect(src).not.toMatch(/\.admin_notes\b/);
    });
  }

  it("RGS Control System umbrella keeps payment/secret internals hidden", () => {
    const src = read("src/pages/portal/tools/RgsControlSystem.tsx");
    expect(src).not.toMatch(/stripe_/i);
    expect(src).not.toMatch(/rcc_subscription_status/);
    expect(src).not.toMatch(/rcc_paid_through/);
  });

  it("client tools route through ClientToolGuard with the expected tool keys", () => {
    const app = read("src/App.tsx");
    const expected: Array<[string, string]> = [
      ["/portal/tools/rgs-control-system", "rgs_control_system"],
      ["/portal/tools/priority-action-tracker", "priority_action_tracker"],
      ["/portal/tools/owner-decision-dashboard", "owner_decision_dashboard"],
      ["/portal/tools/scorecard-history", "scorecard_history_tracker"],
      ["/portal/tools/monthly-system-review", "monthly_system_review"],
      ["/portal/tools/advisory-notes", "advisory_notes_clarification_log"],
      ["/portal/tools/financial-visibility", "connector_financial_visibility"],
      ["/portal/tools/tool-library", "tool_library_resource_center"],
    ];
    for (const [path, key] of expected) {
      const re = new RegExp(
        `path="${path.replace(/\//g, "\\/")}"[\\s\\S]*?ClientToolGuard\\s+toolKey="${key}"`,
      );
      expect(app, `missing guard for ${path} → ${key}`).toMatch(re);
    }
  });

  it("admin RGS Control System routes remain admin-gated", () => {
    const app = read("src/App.tsx");
    const adminRoutes = [
      "/admin/customers/:customerId/rgs-control-system",
      "/admin/customers/:customerId/priority-action-tracker",
      "/admin/customers/:customerId/owner-decision-dashboard",
      "/admin/customers/:customerId/scorecard-history",
      "/admin/customers/:customerId/monthly-system-review",
      "/admin/customers/:customerId/advisory-notes",
      "/admin/customers/:customerId/financial-visibility",
      "/admin/customers/:customerId/revenue-risk-monitor",
      "/admin/customers/:customerId/tool-library",
    ];
    for (const path of adminRoutes) {
      const re = new RegExp(
        `path="${path.replace(/\//g, "\\/").replace(/:/g, ":")}"[\\s\\S]*?requireRole="admin"`,
      );
      expect(app, `missing admin gate for ${path}`).toMatch(re);
    }
  });

  it("report framework and storage primitives remain present (no rebuild)", () => {
    expect(existsSync(join(root, "src/lib/reports/toolReports.ts"))).toBe(true);
    expect(existsSync(join(root, "src/components/admin/StoredToolReportsPanel.tsx"))).toBe(true);
  });

  it("docs file exists for this hardening pass", () => {
    expect(existsSync(join(root, "docs/rgs-control-system-tool-deep-hardening.md"))).toBe(true);
  });
});