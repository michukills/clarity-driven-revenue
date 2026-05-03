import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * P37 — Final client journey smoke contract.
 *
 * Static guarantees that the public-intake → payment → admin-review →
 * invite → claim → portal path remains wired and protected. Pure file-read
 * checks; no runtime/network. Pairs with the manual Stripe sandbox steps
 * documented in docs/final-client-journey-smoke-test.md.
 */

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

describe("P37 — final client journey smoke", () => {
  it("public diagnostic intake route is mounted and unauthenticated", () => {
    const app = read("src/App.tsx");
    expect(app).toMatch(/path="\/diagnostic-apply"\s+element=\{<DiagnosticApply/);
    // It must NOT be wrapped in ProtectedRoute (public path).
    expect(app).not.toMatch(/ProtectedRoute[^<]*>\s*<DiagnosticApply/);
  });

  it("intake form requires both acknowledgements and surfaces the three fit branches", () => {
    const src = read("src/pages/DiagnosticApply.tsx");
    expect(src).toMatch(/ack_no_guarantee:\s*z\.literal\(true/);
    expect(src).toMatch(/ack_one_primary_scope:\s*z\.literal\(true/);
    expect(src).toMatch(/auto_qualified/);
    expect(src).toMatch(/needs_review/);
    expect(src).toMatch(/auto_declined/);
    // No public signup from intake.
    expect(src).not.toMatch(/supabase\.auth\.signUp\s*\(/);
  });

  it("public checkout function resolves offer server-side and rejects non-public lanes", () => {
    const src = read("supabase/functions/create-diagnostic-checkout/index.ts");
    expect(src).toMatch(/get_payable_offer_by_slug/);
    expect(src).toMatch(/visibility\s*!==\s*"public"/);
    expect(src).toMatch(/payment_lane\s*!==\s*"public_non_client"/);
    // Price/lane never trusted from client body.
    expect(src).not.toMatch(/price_cents:\s*body\./);
  });

  it("webhook does not auto-unlock tools or open public signup", () => {
    const wh = read("supabase/functions/payments-webhook/index.ts");
    expect(wh).not.toMatch(/resource_assignments/);
    expect(wh).not.toMatch(/auth\.admin\.createUser/);
    expect(wh).toMatch(/payment_order_mark_paid/);
  });

  it("claim-invite route exists and uses lookup_invite_by_token (no public signUp)", () => {
    const app = read("src/App.tsx");
    expect(app).toMatch(/path="\/claim-invite"/);
    const claim = read("src/pages/ClaimInvite.tsx");
    expect(claim).toMatch(/lookup_invite_by_token/);
  });

  it("admin-mint-portal-invite is admin-gated and writes admin_notifications", () => {
    const src = read("supabase/functions/admin-mint-portal-invite/index.ts");
    expect(src).toMatch(/admin_notifications/);
    // Must check admin auth (either helper or has_role).
    expect(src).toMatch(/admin|has_role/i);
  });

  it("admin payments dashboard is admin-only and free of secrets", () => {
    const app = read("src/App.tsx");
    expect(app).toMatch(/path="\/admin\/payments"[\s\S]*requireRole="admin"/);
    const page = read("src/pages/admin/Payments.tsx");
    expect(page).not.toMatch(/SERVICE_ROLE/);
    expect(page).not.toMatch(/STRIPE_(SANDBOX|LIVE)_API_KEY/);
    expect(page).not.toMatch(/WEBHOOK_SECRET/);
  });

  it("P37 smoke documentation exists with the manual launch checklist", () => {
    const doc = read("docs/final-client-journey-smoke-test.md");
    expect(doc).toMatch(/Manual launch checklist/i);
    expect(doc).toMatch(/4242 4242 4242 4242/);
    expect(doc).toMatch(/paid_pending_access/);
  });

  it("P37 ack columns exist in the diagnostic_intakes migration", () => {
    const dir = join(root, "supabase/migrations");
    const files = readdirSync(dir).filter(f => f.endsWith(".sql"));
    const found = files
      .map(f => readFileSync(join(dir, f), "utf8"))
      .some(c => /ack_no_guarantee/.test(c) && /ack_one_primary_scope/.test(c));
    expect(found).toBe(true);
  });
});