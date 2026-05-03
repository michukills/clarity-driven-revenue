# P37 — Final Client Journey Smoke Test

Calm, end-to-end smoke pass for the first-client path. Covers public diagnostic
intake → payment → admin review → portal invite → client claim → limited portal
access → report visibility → existing-client payment lane → admin notifications.

This is a **smoke test and repair pass**, not a redesign. No security, RLS,
role-gating, invite-only, or CI gates are loosened. No new fake proof.

---

## 1. Public diagnostic intake — `/diagnostic-apply`

**Automated coverage**
- `src/lib/__tests__/firstClientBoundaryContract.test.ts` — required ack fields
  (`ack_no_guarantee`, `ack_one_primary_scope`) wired into form + DB.
- `src/lib/__tests__/legalScopeLanguageContract.test.ts` — no
  guarantee/advice/done-for-you copy on the public surface.
- `src/lib/__tests__/finalClientJourneySmoke.test.ts` (P37) — route exists,
  fit classifier branches `auto_qualified | needs_review | auto_declined`,
  no `signUp(` call on this surface, no portal/tool unlock.

**Manual sandbox steps**
1. Open `/diagnostic-apply`.
2. Submit with monthly revenue = `Under $5K` → expect declined branch, no
   checkout reached.
3. Submit with `$5K–$20K` → `needs_review`, intake row created, no portal
   account, no checkout.
4. Submit with `$50K–$100K` (or `$100K+`) → `auto_qualified` → checkout step.
5. Without checking the two acknowledgement boxes the submit must fail
   client-side.

**Expected DB state** — `diagnostic_intakes` row with `ack_no_guarantee=true`,
`ack_one_primary_scope=true`, `intake_status` in `submitted | fit_review | fit_passed`. No `auth.users` row, no `customers` row, no `resource_assignments`.

---

## 2. Stripe / Lovable payment path

Sandbox token (`pk_test_…`) is loaded by `PaymentTestModeBanner`. Test card:
`4242 4242 4242 4242`, any future expiry, any CVC.

**Server-controlled offer** — `create-diagnostic-checkout` resolves the offer
via `get_payable_offer_by_slug` and rejects anything not
`visibility=public` + `payment_lane=public_non_client` + billing
`one_time | deposit`. Frontend cannot override price.

**Webhook** — `payments-webhook?env=sandbox` routes through
`payment_order_mark_paid` (idempotent; only fires side effects once) and:
- updates `diagnostic_orders.status` → `paid` with totals/Stripe ref/lane;
- promotes intake to `paid_pending_access`;
- inserts an `admin_notifications` row (`kind=diagnostic_paid`,
  `next_action="Approve & send portal invite"`, `email_status=pending`);
- inserts a `customer_timeline` row only if a customer already exists;
- never writes `resource_assignments` (no auto tool unlock);
- never inserts a new `customers` row from this path.

**Email status** — `sendAdminEmail` writes back one of `sent | skipped_missing_config | failed`. Failure does not break the payment workflow; the dashboard row remains source of truth.

**Automated coverage** — `adminPaymentsContract.test.ts`,
`offerPaymentContract.test.ts`, `adminEmailContract.test.ts`.

---

## 3. Admin review + invite

1. Go to `/admin/payments` (admin-only via `ProtectedRoute`).
2. Locate the new paid order in the action queue with next action
   "Approve & send portal invite".
3. Open the linked intake / order detail.
4. Use **Mint portal invite** → calls `admin-mint-portal-invite`:
   - requires admin role,
   - requires a paid diagnostic order for the email,
   - generates a one-time token, stores only the hash, returns the raw token
     once,
   - inserts `admin_notifications` (`kind=portal_invite_sent`),
   - logs a timeline event,
   - emails (or returns copyable link if email is not configured).
5. Token rotation: re-mint should revoke the prior unused invite.

Raw tokens are never logged to admin emails or stored at rest.

---

## 4. Client claim — `/claim-invite?token=…`

- `lookup_invite_by_token` returns `null` for missing/revoked/expired/accepted.
- Account creation goes through the invite RPC, not `signUp()`. Public
  signup is closed (verified by `adminPaymentsContract` and
  `finalClientJourneySmoke`).
- On success the new `auth.users` row is linked to the `customers` row from
  the intake, the invite is marked accepted, the user is signed in and
  redirected to the portal.
- Replaying the token after acceptance fails.

---

## 5. Portal first-login state

- `/portal` renders the limited customer dashboard (`PortalShell` + role
  gating).
- Tools list is empty unless `resource_assignments` exist for that
  customer — payment alone does not unlock anything.
- Reports list shows only `published` reports owned by this customer (P34
  `clientSafeReportFields` allowlist).
- No `internal_notes`, no draft AI content, no admin notifications visible.

---

## 6. Report visibility & safety

Covered by `reportExportSafetyContract.test.ts` (P34): wrong-customer URLs
fail, drafts hidden, allowlist enforced, no broken export buttons.

---

## 7. Existing-client payment lane

- `/admin/payments` → **Create payment link** for an existing customer.
- `admin-create-payment-link` attaches to the existing customer (lookup-only,
  no duplicate insert in the webhook), surfaces `duplicateWarnings`, supports
  Implementation / Revenue Control System / custom offers.
- Webhook reuses `payment_order_mark_paid` → marks paid, refreshes per-bucket
  payment status on the customer, fires admin notification + timeline. No
  auto tool unlock.
- Subscription events route through `payment_subscription_upsert`
  (`active | trialing | past_due | canceled | paused | incomplete`).

End-to-end recurring renewals must be confirmed manually in the Stripe
sandbox (advance subscription clock).

---

## 8. Admin payments / notifications

- Action queue, email-status pills (`pending | sent | skipped_missing_config | failed`), retry flag, customer payment history, subscription tab, duplicate-risk warnings.
- Public/customer roles cannot reach `/admin/payments` (route guard +
  RLS-backed view).

---

## 9. Legal / scope checkpoints

`legalScopeLanguageContract.test.ts` enforces, across the public surface:
no-guarantee, no legal/tax/accounting/financial advice, one-primary-scope
ack, no instant-portal claim, no fake testimonials/results, Implementation
and Revenue Control System positioned as separate next steps.

---

## 10. Tests run for P37

`bunx vitest run` — **74 files / 2713 tests passing** (baseline carried from
P36.1, plus the new P37 smoke contract).

---

## 11. Manual launch checklist (cannot be automated here)

- [ ] Run a real sandbox checkout with `4242 4242 4242 4242`, confirm webhook
      arrival in Supabase function logs and `diagnostic_orders.status=paid`.
- [ ] Mint a real invite, claim it from a fresh browser profile, confirm
      portal lands in limited state.
- [ ] Generate an existing-client payment link, pay it, confirm history +
      timeline update.
- [ ] Trigger a Stripe subscription renewal/cancel in sandbox, confirm
      `payment_subscriptions` row + admin notification.
- [ ] Verify Resend (or chosen provider) is configured for live; otherwise
      `email_status=skipped_missing_config` is the documented fallback.
- [ ] Have an attorney review `/eula` and `/privacy` before public launch.

---

## 12. Blockers found in this pass

None. All journey path-points are wired and protected by automated contracts.
Anything above marked "manual" is intentionally deferred to a real Stripe
sandbox session because the webhook signing secret cannot be exercised from
the contract test runtime.