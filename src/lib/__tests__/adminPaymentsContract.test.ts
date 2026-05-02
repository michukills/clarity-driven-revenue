import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * P32 — Admin payments / notifications / lifecycle contract.
 *
 * Static contract checks:
 *  - Admin payments page is wired to the admin-only ProtectedRoute.
 *  - Payment edge functions never expose Stripe secrets, service-role
 *    keys, or webhook secrets to frontend.
 *  - Webhook routes both lanes through `payment_order_mark_paid` and
 *    forwards subscription events through `payment_subscription_upsert`.
 *  - Webhook + admin edge functions write `admin_notifications` rows
 *    so nothing is lost.
 *  - Webhook does NOT auto-unlock tools (no resource_assignments writes).
 *  - Existing-client payments do not create new customers in the webhook
 *    path (lookup-and-attach only).
 *  - Invite-only signup remains intact (no signUp call in portal/Auth).
 */

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

describe("Admin payments + notifications contract", () => {
  it("admin payments dashboard is admin-only via ProtectedRoute", () => {
    const app = read("src/App.tsx");
    expect(app).toMatch(/path="\/admin\/payments"[\s\S]*requireRole="admin"[\s\S]*AdminPayments/);
  });

  it("admin payments page does not import Stripe or service-role secrets", () => {
    const src = read("src/pages/admin/Payments.tsx");
    expect(src).not.toMatch(/SERVICE_ROLE/);
    expect(src).not.toMatch(/STRIPE_(SANDBOX|LIVE)_API_KEY/);
    expect(src).not.toMatch(/PAYMENTS_(SANDBOX|LIVE)_WEBHOOK_SECRET/);
  });

  it("webhook routes both payment lanes via payment_order_mark_paid", () => {
    const src = read("supabase/functions/payments-webhook/index.ts");
    expect(src).toMatch(/payment_order_mark_paid/);
    expect(src).toMatch(/payment_subscription_upsert/);
    expect(src).toMatch(/admin_notifications/);
    expect(src).toMatch(/customer_timeline/);
  });

  it("webhook does NOT auto-unlock tools (no resource_assignments writes)", () => {
    const src = read("supabase/functions/payments-webhook/index.ts");
    expect(src).not.toMatch(/resource_assignments/);
    expect(src).not.toMatch(/portal_unlocked\s*:\s*true/);
  });

  it("webhook does not create customers (lookup-only)", () => {
    const src = read("supabase/functions/payments-webhook/index.ts");
    expect(src).not.toMatch(/from\("customers"\)\s*\.\s*insert/);
  });

  it("admin invite-mint and payment-link write admin_notifications", () => {
    const mint = read("supabase/functions/admin-mint-portal-invite/index.ts");
    const pay = read("supabase/functions/admin-create-payment-link/index.ts");
    expect(mint).toMatch(/admin_notifications/);
    expect(pay).toMatch(/admin_notifications/);
    // payment-link surfaces duplicate warnings to the admin
    expect(pay).toMatch(/duplicateWarnings/);
  });

  it("admin payments migration defines required tables, RPCs, and view", () => {
    const dir = join(root, "supabase/migrations");
    const sql = readdirSync(dir)
      .filter(f => f.endsWith(".sql"))
      .map(f => readFileSync(join(dir, f), "utf8"))
      .find(c => c.includes("create table if not exists public.admin_notifications"));
    expect(sql, "P32 migration not found").toBeTruthy();
    expect(sql!).toMatch(/payment_order_mark_paid/);
    expect(sql!).toMatch(/payment_subscription_upsert/);
    expect(sql!).toMatch(/v_admin_payment_orders/);
    expect(sql!).toMatch(/next_action/);
  });

  it("public auth surface still has no open signup form", () => {
    const auth = read("src/pages/portal/Auth.tsx");
    expect(auth).not.toMatch(/signUp\s*\(/);
  });
});
