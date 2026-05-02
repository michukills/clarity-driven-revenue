import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * P31 — Offer / payment-lane contract.
 *
 * Static contract checks that lock the offer-driven payment architecture so
 * regressions are caught at build time:
 *
 *  - Frontend cannot override price, billing type, lane, or customer linkage
 *    (checkout edge functions resolve everything server-side via
 *    `get_payable_offer_by_slug`).
 *  - Public diagnostic checkout only accepts public, public_non_client offers.
 *  - Admin client-payment-link only accepts existing_client lane offers and
 *    requires admin auth.
 *  - Service-role keys, Stripe secrets, and webhook secrets stay out of
 *    the frontend bundle.
 *  - Invite-only signup remains intact (no public signup form code).
 */

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

describe("Offer & payment-lane contract", () => {
  it("public diagnostic checkout resolves price server-side from the offer", () => {
    const src = read("supabase/functions/create-diagnostic-checkout/index.ts");
    expect(src).toMatch(/get_payable_offer_by_slug/);
    // Body schema must NOT accept price/amount/billing-type fields.
    expect(src).not.toMatch(/amount(_?cents)?\s*:\s*z\./i);
    expect(src).not.toMatch(/price_cents\s*:\s*z\./i);
    expect(src).not.toMatch(/billing_?type\s*:\s*z\./i);
    // Public lane gating.
    expect(src).toMatch(/payment_lane\s*!==\s*"public_non_client"/);
    expect(src).toMatch(/visibility\s*!==\s*"public"/);
  });

  it("admin payment link requires admin and uses existing_client lane only", () => {
    const src = read("supabase/functions/admin-create-payment-link/index.ts");
    expect(src).toMatch(/requireAdmin/);
    expect(src).toMatch(/get_payable_offer_by_slug/);
    expect(src).toMatch(/payment_lane\s*!==\s*"existing_client"/);
    // Must require an existing customer_id (no auto-create of customers).
    expect(src).toMatch(/customers/);
    expect(src).toMatch(/customer_not_found/);
    // Must not accept price from caller.
    expect(src).not.toMatch(/amount(_?cents)?\s*:\s*z\./i);
    expect(src).not.toMatch(/price_cents\s*:\s*z\./i);
  });

  it("offers schema migration defines all required enums and columns", () => {
    const mig = read(
      "supabase/migrations/" +
        // Find the latest migration that contains the offers table.
        require("node:fs")
          .readdirSync(join(root, "supabase/migrations"))
          .filter((f: string) => f.endsWith(".sql"))
          .reverse()
          .find((f: string) =>
            readFileSync(join(root, "supabase/migrations", f), "utf8").includes(
              "create table if not exists public.offers",
            ),
          ),
    );
    expect(mig).toMatch(/create type public\.offer_type/);
    expect(mig).toMatch(/create type public\.offer_billing_type/);
    expect(mig).toMatch(/create type public\.offer_payment_lane/);
    expect(mig).toMatch(/create type public\.tax_mode/);
    expect(mig).toMatch(/create table if not exists public\.offers/);
    expect(mig).toMatch(/create table if not exists public\.payment_subscriptions/);
    expect(mig).toMatch(/create table if not exists public\.app_payment_settings/);
    expect(mig).toMatch(/get_payable_offer_by_slug/);
    // Existing diagnostic_orders must be extended, not replaced.
    expect(mig).toMatch(/alter table public\.diagnostic_orders[\s\S]*offer_id/);
  });

  it("frontend does not import service-role keys or Stripe secrets", () => {
    const offers = read("src/pages/admin/Offers.tsx");
    expect(offers).not.toMatch(/SERVICE_ROLE/);
    expect(offers).not.toMatch(/STRIPE_(SANDBOX|LIVE)_API_KEY/);
    expect(offers).not.toMatch(/PAYMENTS_(SANDBOX|LIVE)_WEBHOOK_SECRET/);
  });

  it("public auth surface still has no open signup form", () => {
    const auth = read("src/pages/portal/Auth.tsx");
    // No password signup field / call. Only sign-in + invite redirect path.
    expect(auth).not.toMatch(/signUp\s*\(/);
  });
});