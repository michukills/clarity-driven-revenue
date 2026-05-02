# Admin Email Notifications (P33)

Operational alerts to RGS owner/admin about payments, intakes, invites, and
subscription state. **These are not marketing emails.**

## Recipients

Defaults: `info@revenueandgrowthsystems.com`, `jmchubb@revenueandgrowthsystems.com`.
Override with the `ADMIN_EMAIL_RECIPIENTS` secret (comma-separated).

## Required server-side secrets

- `RESEND_API_KEY` — Resend API key (server-only, never in frontend).
- `ADMIN_EMAIL_FROM` — verified from address (falls back to `INVITE_EMAIL_FROM`).
- `ADMIN_EMAIL_RECIPIENTS` — optional override.

If any of `RESEND_API_KEY` or `ADMIN_EMAIL_FROM` are missing, the helper
records `skipped_missing_config` on the notification and the workflow
continues normally. Dashboard notifications remain the source of truth.

## Events

| Event | Trigger | Subject |
| --- | --- | --- |
| `intake_needs_review` | Yellow-fit diagnostic intake submitted | RGS intake needs review — [Business] |
| `diagnostic_paid` | Stripe `checkout.session.completed` (public lane) | RGS Diagnostic paid — [Business] |
| `diagnostic_paid_invite_pending` | Admin mints portal invite | Action needed: send RGS portal invite — [Business] |
| `portal_invite_accepted` | Client claims invite (account linked) | RGS client account created — [Business] |
| `existing_client_payment_link_created` | Admin creates payment link/manual invoice | RGS payment link created — [Business] |
| `existing_client_paid` | Stripe completed (existing-client lane) | RGS client payment received — [Business] |
| `existing_client_payment_failed` | Stripe failed/canceled | RGS payment issue — [Business] |
| `subscription_active` | RCS subscription active/trialing | RGS Revenue Control System active — [Business] |
| `subscription_issue` | RCS past_due/canceled/paused | Action needed: RGS subscription issue — [Business] |

## Delivery tracking

`admin_notifications` columns added in P33:

- `email_status`: `pending` / `sent` / `skipped_missing_config` / `failed` / `retry_needed`
- `email_sent_at`, `email_error`, `email_recipients`, `email_attempts`, `last_email_attempt_at`

The Payments dashboard surfaces email status under each action-queue card
and offers a "Flag email retry" button for `failed` / `skipped_missing_config`
rows. Marking retry sets `email_status = retry_needed` for manual handling
(no scheduler exists yet).

## What is intentionally NOT in admin emails

- Raw invite tokens, Stripe secrets, service-role keys, webhook secrets.
- Client-sensitive internal notes.
- Marketing copy, fake proof, testimonials.

## Frontend boundary

- The email helper lives only in `supabase/functions/_shared/admin-email.ts`.
- The frontend never imports it and never references `RESEND_API_KEY`,
  `ADMIN_EMAIL_FROM`, or `ADMIN_EMAIL_RECIPIENTS`.
- The only frontend trigger is `notify-admin-event`, which re-verifies the
  underlying record's state in the DB (using the service role) and only
  emits emails for the allow-listed events `intake_needs_review` and
  `portal_invite_accepted`. Callers cannot trigger arbitrary admin emails.

## Failure model

- Missing config → `email_status = skipped_missing_config`, workflow continues.
- Send failure → `email_status = failed`, `email_error` recorded, workflow continues.
- Admin retries are manual (no cron). Reminder/scheduler logic is
  intentionally deferred until the project has scheduled jobs in place.

## Hardening flags

The Payments view's `next_action` column already flags:

- Diagnostic paid but invite not sent → "Approve & send portal invite"
- Failed payments → "Payment failed — review/follow up"
- Implementation paid → "Begin implementation"
- RCS paid → "Activate Revenue Control System"

RCS subscription issues (`past_due` / `canceled` / `paused`) generate
`high`-priority `admin_notifications` rows automatically.

## Troubleshooting

1. Email not received → check `admin_notifications.email_status` /
   `email_error` for the matching row.
2. `skipped_missing_config` → set `RESEND_API_KEY` and `ADMIN_EMAIL_FROM`.
3. `failed` → inspect the `email_error` column; common causes are a
   non-verified `from` domain in Resend or rate limits.
4. To resend, click "Flag email retry" in the Payments action queue and
   re-trigger the underlying event (or invoke the relevant edge function
   manually).