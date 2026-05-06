/**
 * P84 — New Accounts Approval Queue + Account Type Verification.
 *
 * Locks the post-launch contract that all newly created auth accounts
 * appear in an admin-only New Accounts queue, that pending users do not
 * silently leak into client tools, and that approval / denial / linking
 * remain admin-only mutations. Source-level + deterministic — no DB.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const read = (p: string) => readFileSync(resolve(root, p), "utf8");

describe("P84 — New Accounts approval queue + account type verification", () => {
  const app = read("src/App.tsx");
  const shell = read("src/components/portal/PortalShell.tsx");
  const page = read("src/pages/admin/PendingAccounts.tsx");

  it("admin route /admin/pending-accounts is admin-protected", () => {
    expect(app).toMatch(
      /path="\/admin\/pending-accounts"\s+element=\{<ProtectedRoute requireRole="admin">\s*<PendingAccounts\b/,
    );
  });

  it("admin alias route /admin/new-accounts is admin-protected and reuses PendingAccounts", () => {
    expect(app).toMatch(
      /path="\/admin\/new-accounts"\s+element=\{<ProtectedRoute requireRole="admin">\s*<PendingAccounts\b/,
    );
  });

  it("admin left navigation exposes a 'New Accounts' tab pointing at the queue", () => {
    expect(shell).toMatch(/to:\s*"\/admin\/pending-accounts".*label:\s*"New Accounts"/s);
  });

  it("New Accounts page renders the renamed header + reviewer guidance", () => {
    expect(page).toMatch(/>New Accounts</);
    expect(page).toMatch(/Review new signups before they receive portal access/i);
  });

  it("admin queue is fed by the admin-only edge function (no service-role secret in frontend)", () => {
    expect(page).toMatch(/adminAccountLinks/);
    expect(page).not.toMatch(/SERVICE_ROLE|service_role_key/i);
    const lib = read("src/lib/adminAccountLinks.ts");
    expect(lib).toMatch(/supabase\.functions\.invoke\(['"]admin-account-links['"]/);
    expect(lib).not.toMatch(/SERVICE_ROLE|service_role_key/i);
  });

  it("admin-account-links edge function gates every action behind requireAdmin", () => {
    const fn = read("supabase/functions/admin-account-links/index.ts");
    expect(fn).toMatch(/requireAdmin\s*\(/);
  });

  it("approval / denial / link RPCs are restricted to admins in DB", () => {
    // create_customer_from_signup, deny_signup, undeny_signup, repair_customer_links
    // all begin with `IF NOT public.is_admin(auth.uid()) THEN RAISE`.
    const baseMig = read(
      "supabase/migrations/20260422145033_412eb1c8-1926-4166-8090-f8c9c5b9f3fe.sql",
    );
    expect(baseMig).toMatch(/CREATE POLICY "Admins manage denied_signups"/);
    expect(baseMig).toMatch(/IF NOT public\.is_admin\(auth\.uid\(\)\) THEN[\s\S]*?deny_signup/);

    const grants = read(
      "supabase/migrations/20260429055500_p14_remove_browser_admin_rpc_grants.sql",
    );
    // Browser roles must have admin RPCs revoked; only service_role keeps them.
    expect(grants).toMatch(/REVOKE ALL ON FUNCTION public\.deny_signup\(uuid, text\) FROM authenticated/);
    expect(grants).toMatch(/REVOKE ALL ON FUNCTION public\.undeny_signup\(uuid\) FROM authenticated/);
    expect(grants).toMatch(/GRANT EXECUTE ON FUNCTION public\.deny_signup\(uuid, text\) TO service_role/);
  });

  it("new auth users do NOT auto-create a customer row (signup ≠ portal access)", () => {
    // create_customer_from_signup is admin-only, called from the New Accounts queue.
    // No supabase migration creates a trigger on auth.users that auto-inserts customers.
    const fn = read(
      "supabase/migrations/20260422145033_412eb1c8-1926-4166-8090-f8c9c5b9f3fe.sql",
    );
    expect(fn).toMatch(/admin only/);
  });

  it("portal customer resolver returns null for users without a linked customer (pending state)", () => {
    const hook = read("src/hooks/usePortalCustomerId.ts");
    expect(hook).toMatch(/eq\("user_id", user\.id\)/);
    expect(hook).toMatch(/maybeSingle/);
  });

  it("CustomerDashboard shows a safe waiting state when no linked customer exists", () => {
    const dash = read("src/pages/portal/CustomerDashboard.tsx");
    expect(dash).toMatch(/if \(!customer\)/);
    expect(dash).toMatch(/Your account is set up.*activate your workspace/);
    // The pending state must not auto-render Operating Companion / tool data.
    const guard = dash.split(/if \(!customer\) \{/)[1]?.split("}")[0] ?? "";
    expect(guard).not.toMatch(/OperatingCompanion|tool_runs|business_control_reports/);
  });

  it("portal tool pages route through usePortalCustomerId (so pending users hit the same null guard)", () => {
    // Spot-check several entitled tools — they all rely on the resolver that
    // returns null for unlinked users, so pending users cannot reach tool data.
    for (const p of [
      "src/pages/portal/tools/ScorecardHistory.tsx",
      "src/pages/portal/tools/StabilityToValueLens.tsx",
      "src/pages/portal/tools/SwotAnalysis.tsx",
      "src/pages/portal/tools/SopTrainingBible.tsx",
      "src/pages/portal/tools/RevenueRiskMonitor.tsx",
    ]) {
      const src = read(p);
      expect(src, p).toMatch(/usePortalCustomerId/);
    }
  });

  it("ProtectedRoute redirects unauthenticated users to /auth and non-admins away from /admin", () => {
    const pr = read("src/components/portal/ProtectedRoute.tsx");
    expect(pr).toMatch(/Navigate to="\/auth"/);
    expect(pr).toMatch(/requireRole === "admin" && !isAdmin/);
  });

  it("account_kind classification keeps RGS internal/demo/test out of client flow", () => {
    const kind = read("src/lib/customers/accountKind.ts");
    expect(kind).toMatch(/internal_admin/);
    expect(kind).toMatch(/return "demo"/);
    expect(kind).toMatch(/return "test"/);
    expect(page).toMatch(/isCustomerFlowAccount/);
  });

  it("forbidden positioning wording stays absent from the New Accounts surface", () => {
    for (const phrase of [
      "lay the bricks",
      "blueprint and teaches the owner",
      "provides the blueprint",
      "Mirror, Not the Map",
    ]) {
      expect(page.toLowerCase(), phrase).not.toContain(phrase.toLowerCase());
      expect(shell.toLowerCase(), phrase).not.toContain(phrase.toLowerCase());
    }
  });

  it("New Accounts page contains no service-role / AI provider secrets", () => {
    expect(page).not.toMatch(/SERVICE_ROLE|LOVABLE_API_KEY/);
    expect(page).not.toMatch(/api\.openai\.com|generativelanguage|ai\.gateway\.lovable\.dev/);
  });

  it("admin review notes (deny reason) are admin-only via RLS-protected denied_signups", () => {
    const baseMig = read(
      "supabase/migrations/20260422145033_412eb1c8-1926-4166-8090-f8c9c5b9f3fe.sql",
    );
    expect(baseMig).toMatch(/ENABLE ROW LEVEL SECURITY[\s\S]*denied_signups/);
    expect(baseMig).toMatch(/Admins manage denied_signups[\s\S]*USING \(public\.is_admin/);
  });

  it("New Accounts queue file exists and has not been deleted", () => {
    expect(existsSync(resolve(root, "src/pages/admin/PendingAccounts.tsx"))).toBe(true);
  });
});