# Admin payments & client tracking — operations guide (P32)

This is the working reference for what happens after a payment, where to look,
and what to do next. Nothing here changes brand or marketing copy. Public
account creation remains disabled — invites are the only way clients enter
the portal.

## Where to look

- **`/admin/payments`** — every order and subscription, with a built-in
  *Action queue* of admin notifications and a *Next action* label per row.
- **`/admin/diagnostic-orders`** — paid-pending diagnostic intakes ready for
  invite minting.
- **`/admin/offers`** — server-controlled offer catalog (price, lane, billing
  type are resolved server-side; the frontend cannot override them).
- **Customer detail → Billing tab** — per-client payment history, tax/totals,
  and Revenue Control System subscription status.

## What happens after a public Diagnostic payment

1. Stripe checkout completes → `payments-webhook` marks the order `paid`.
2. The originating intake moves to `paid_pending_access`.
3. An `admin_notifications` row is created (`diagnostic_paid`, priority high)
   with the next action **Approve & send portal invite**.
4. Admin opens `/admin/diagnostic-orders`, reviews the intake, and uses
   **Approve & send invite**. This:
   - finds or creates the customer record,
   - mints a single-use invite token,
   - logs `portal_invite_sent` on the customer timeline,
   - creates a `portal_invite_sent` admin notification.
5. Client opens the link → `/claim-invite` → account is linked. Tools are NOT
   auto-unlocked. Admin assigns next-step tools manually.

## What happens after an existing-client payment

1. Admin opens the client and sends a payment link via the existing-client
   lane (`admin-create-payment-link`).
2. The function checks for **duplicate-risk** clients (same email or business
   name) and returns warnings the admin can review before sharing the link.
3. A pending order is recorded; an `admin_notifications`
   (`payment_link_created`) entry is added.
4. Stripe completes → webhook updates order to `paid`, refreshes the matching
   per-bucket payment status on `customers` (implementation, add-on, custom),
   logs `payment_received` on the customer timeline, and creates an
   `existing_client_paid` notification.
5. **Tools are not auto-unlocked.** The notification's next action is
   *Confirm next-step assignment* — admin still controls access.

## Revenue Control System subscriptions

`customer.subscription.{created,updated,deleted}` events flow through
`payment_subscription_upsert`, which mirrors the status onto
`customers.rcc_subscription_status`. Past-due and canceled events generate
high-priority admin notifications.

## Statuses you'll see

- Orders: `pending`, `paid`, `failed`, `canceled`, `refunded`.
- Subscriptions: `active`, `trialing`, `past_due`, `canceled`, `paused`,
  `incomplete`. Anything else surfaces as `needs_review`.

## Email notifications

Owner/admin email notifications are deferred. Email infrastructure is not
wired in this pass. Use the dashboard action queue at `/admin/payments` until
it is. Invite-mint already supports best-effort `RESEND_API_KEY` sending if
that secret is added later — without it the flow continues normally.

## What is intentionally not automated

- No customer record is created from a webhook payment alone (lookup only).
- No tool, portal section, or RCS feature unlocks automatically on payment.
- No public signup. Clients can only enter the portal through invites.
- Implementation and Revenue Control System remain private/existing-client
  offers — they are not exposed for public self-checkout.
