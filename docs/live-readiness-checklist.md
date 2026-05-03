# Live Readiness Checklist (P46.2)

Living checklist for taking the **first paid diagnostic customer** on
Revenue & Growth Systems (RGS). This complements:

- `docs/final-launch-audit.md` (P46 audit + brand rules)
- `docs/final-client-journey-smoke-test.md` (P37 end-to-end smoke)
- `docs/public-site-scorecard-smoke-checklist.md` (public surface smoke)
- `docs/first-client-smoke-test.md` (P46.2 step-by-step smoke plan)
- `docs/connector-readiness.md` (truth-source / connector honesty)

Use this list pre-launch and again before the first real paid client.

---

## A. Public site readiness
- [ ] `/` (homepage) loads, no console errors, hero + primary CTA visible.
- [ ] `/scorecard` loads and runs deterministically (no 1–5/0–5 scales).
- [ ] `/diagnostic` (Diagnostic offer) loads with scope-safe copy.
- [ ] `/why-rgs-is-different` loads.
- [ ] `/system` / RGS Control System page loads with truth-source section.
- [ ] `/demo` loads and is clearly labeled demo where applicable.
- [ ] `/insights` index + at least one spoke article render.
- [ ] Footer + social links resolve to real, owner-controlled accounts.
- [ ] Primary CTA reads "See How Stable Your Business Really Is (0–1000)"
      and routes to `/scorecard`.
- [ ] Diagnostic CTA routes to the diagnostic offer / apply flow.
- [ ] No fake testimonials, "trusted by", or unsupported ROI claims.
- [ ] No placeholder/lorem text or TODO markers visible.

## B. Domain / DNS / hosting
- [ ] Production custom domain resolves and HTTPS is valid.
- [ ] `www` and apex behavior confirmed (one redirects to the other).
- [ ] Cloudflare / proxy settings reviewed (no unwanted caching of
      authenticated pages).
- [ ] No staging / preview URLs hard-coded into public CTAs or emails.
- [ ] Public assets (images, favicons, OG images) load over HTTPS.
- [ ] `robots.txt` and `sitemap.xml` reachable and correct.

## C. Legal / scope pages
- [ ] `/privacy` renders.
- [ ] `/eula` renders.
- [ ] Service-scope language present on Diagnostic, Implementation, and
      RGS Control System pages.
- [ ] No claim of attorney review unless a real review has happened.
- [ ] No legal, tax, accounting, or financial-advice guarantees.
- [ ] Manual: attorney review of EULA + Privacy Policy (out-of-product).

## D. Stripe / payment readiness
- [ ] Live Stripe keys set only in backend secrets (never in frontend bundle).
- [ ] No `SERVICE_ROLE`, `STRIPE_*_API_KEY`, or `WEBHOOK_SECRET` strings in
      `src/`.
- [ ] Diagnostic offer is `visibility=public` + `payment_lane=public_non_client`
      and resolved server-side via `get_payable_offer_by_slug`.
- [ ] Successful checkout marks `diagnostic_orders.status=paid` and creates
      an `admin_notifications` row with `next_action="Approve & send portal invite"`.
- [ ] Cancel / failure path returns the user safely (no portal access granted).
- [ ] Webhook idempotent (`payment_order_mark_paid`); replay does not unlock
      tools or duplicate customers.
- [ ] **Manual**: real Stripe sandbox + live charge end-to-end before
      opening checkout publicly (`4242 4242 4242 4242` for sandbox).

## E. Email / notifications readiness
- [ ] Resend (or chosen provider) API key configured in backend secrets.
- [ ] `from` and `reply-to` addresses set to a monitored RGS mailbox.
- [ ] Admin notification email sends on diagnostic-paid event
      (or logs `skipped_missing_config` cleanly).
- [ ] Portal-invite email renders with a working claim link.
- [ ] Scorecard lead capture writes a row even if email send fails.
- [ ] No broken templates, no merge-tag leakage.
- [ ] **Manual**: send a real test invite to an external inbox and confirm
      DKIM/SPF/DMARC pass.

## F. Account / invite readiness
- [ ] Public `signUp()` is closed on every client-facing surface.
- [ ] `admin-mint-portal-invite` is admin-gated and only mints for emails
      with a paid diagnostic order.
- [ ] One-time invite tokens are stored hashed; raw token returned once.
- [ ] Re-mint revokes prior unused invite.
- [ ] `/claim-invite?token=…` rejects missing / expired / accepted / revoked.
- [ ] Unpaid client cannot reach diagnostic tool routes (ClientToolGuard).
- [ ] Admin role retained — **never delete the RGS/admin owner account**.
- [ ] Tenant isolation: a customer cannot read another customer's rows
      (RLS spot-check in `supabase/tests/public_security_wrappers.sql`).

## G. Diagnostic journey readiness
- [ ] Public scorecard remains deterministic (typed evidence, 0–1000 band).
- [ ] Lead capture saves and shows result without an AI/edge call.
- [ ] Diagnostic CTA on the result page routes to `/diagnostic-apply`.
- [ ] Paid client lands on Owner Diagnostic Interview first.
- [ ] Deeper diagnostic tools unlock only after interview completion.
- [ ] Personalized diagnostic tool sequence renders per the P41 logic.
- [ ] No 1–5 / 0–5 scoring, no canned response chips, no manual status
      selectors return.

## H. Admin readiness
- [ ] Admin sees the new customer in `/admin/payments` action queue.
- [ ] Admin can approve diagnostic access and mint a portal invite.
- [ ] Admin can review the Owner Diagnostic Interview submission.
- [ ] Admin can view/assign the diagnostic tool sequence.
- [ ] Admin can request clarification without exposing internal notes.
- [ ] Admin can mark a report ready / client-visible.
- [ ] Admin Scope / Access Snapshot panel renders.
- [ ] `internal_notes` and draft reports remain admin-only.

## I. Report / repair map readiness
- [ ] Report builder loads and saves drafts.
- [ ] Drafts are hidden from client until `published` + client-visible.
- [ ] Repair map visibility is explicit (locked vs. visible state).
- [ ] Export uses the P34 `clientSafeReportFields` allowlist (no admin
      notes leaked).
- [ ] Clarification log surfaces only client-safe content.

## J. RGS Control System / connector truth-source readiness
- [ ] Truth-source positioning section is live on the RGS Control System
      page and the Diagnostic FAQ.
- [ ] Connector readiness statuses honor `docs/connector-readiness.md`
      (only QuickBooks is currently live OAuth).
- [ ] Public copy does not claim live sync for Stripe, Square, Dutchie,
      Xero, HubSpot, Salesforce, Pipedrive, Paycom, ADP, Gusto, Jobber,
      Housecall Pro, or ServiceTitan.
- [ ] No claim that RGS replaces QuickBooks / HubSpot / Square / etc.
- [ ] No claim of guaranteed clean data, accounting, tax, or legal services.
- [ ] Demo / sample connector data, where shown, is clearly labeled.

## K. Manual launch blockers (out-of-product)
These intentionally cannot be enforced in code and must be confirmed by the
operator before public launch:

- [ ] Attorney review of EULA + Privacy Policy.
- [ ] Real Stripe sandbox + first live charge end-to-end.
- [ ] Email deliverability test from production sender domain.
- [ ] DNS / domain / Cloudflare final check on the production domain.
- [ ] Footer social links verified to resolve to owner-controlled accounts.
- [ ] Real client proof only after real, approved customer outcomes exist.
- [ ] Tax / CPA review (if applicable to the offer structure).
- [ ] Live subscription renewal + cancel behavior verified in Stripe if
      RGS Control System subscriptions are sold at launch.

---

## Future demo account and cleanup pass — not executed in P46.2

This is documentation only. **Do not execute in this pass.** No SQL, no
account deletion, no cleanup script is written or run as part of P46.2.

After new tools are added and before public demo use, plan to:

1. **Back up the current database** (full snapshot, retained off-platform).
2. **Confirm the real RGS / admin owner account.** Record its `auth.users`
   id, email, and `user_roles` row. **Never delete the real RGS / admin
   account** under any circumstance.
3. Identify all test / customer / demo accounts created during build-out.
4. Clear or archive **non-RGS** accounts only after explicit confirmation
   from the operator. Prefer archive over hard-delete where supported.
5. Create clean, clearly-labeled demo accounts:
   - `demo-diagnostic@…` — paid diagnostic client
   - `demo-implementation@…` — implementation client
   - `demo-rcs@…` — RGS Control System client
   - `demo-locked@…` — unpaid / locked client
   - `demo-completed@…` — completed diagnostic client
6. Run each demo account through its correct access state and confirm:
   - tenant isolation between demo accounts;
   - no demo account sees admin-only notes;
   - no demo proof appears public-facing;
   - demo / sample data is clearly labeled as such everywhere it renders.
7. Re-run `docs/first-client-smoke-test.md` end-to-end against the cleaned
   environment before opening to a real paying customer.

Hard rules for the future cleanup pass:

- Never delete the RGS / admin owner account.
- Never run destructive SQL without an explicit, scoped migration and a
  fresh backup.
- Never alter production-like data without operator confirmation.
- Never weaken RLS, role gating, payment gates, or scope-boundary
  enforcement during cleanup.