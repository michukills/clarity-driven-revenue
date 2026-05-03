# First Client Smoke Test (P46.2)

Step-by-step manual smoke plan for the first paid diagnostic customer on
Revenue & Growth Systems (RGS). Pairs with
`docs/live-readiness-checklist.md` and the existing automated contract
`src/lib/__tests__/finalClientJourneySmoke.test.ts`.

No live data is altered by running this plan. Use a real Stripe sandbox
charge for Path 2 unless live readiness has already been confirmed.

---

## Path 1 — Public visitor

- [ ] Land on `/` (homepage). No console errors, hero + primary CTA visible.
- [ ] Click the primary CTA — confirm label is
      *"See How Stable Your Business Really Is (0–1000)"* and it routes to
      `/scorecard`.
- [ ] Complete the public scorecard end-to-end (typed evidence only — no
      1–5 / 0–5 scales, no canned chips, no manual status selectors).
- [ ] Submit lead capture (first name, last name, email, business name,
      business model). Confirm the submit button is disabled until valid.
- [ ] See the 0–1000 result with pillar bands and missing-information
      copy where applicable.
- [ ] Click the diagnostic CTA on the result page. Confirm the diagnostic
      offer page shows scope-safe pricing, scope, and acknowledgements.

Notes: ____________________________________________________

## Path 2 — Paid diagnostic client

- [ ] Submit `/diagnostic-apply` with both acknowledgements
      (`ack_no_guarantee`, `ack_one_primary_scope`) checked.
- [ ] Reach Stripe checkout for the public diagnostic offer.
- [ ] Complete a real sandbox charge with `4242 4242 4242 4242`.
- [ ] Confirm `diagnostic_orders.status = paid` and an `admin_notifications`
      row appears with `next_action="Approve & send portal invite"`.
- [ ] As admin, mint a portal invite from `/admin/payments`.
- [ ] Open the invite link in a fresh browser profile and complete
      `/claim-invite?token=…`.
- [ ] Land in the limited portal. **Tools list is empty** until assignments
      exist — payment alone unlocks nothing.
- [ ] Confirm the Owner Diagnostic Interview is the first available tool.
- [ ] Complete the Owner Diagnostic Interview.
- [ ] Confirm deeper diagnostic tools unlock per the personalized P41
      sequence — no implementation or RGS Control System tools appear.
- [ ] Complete the assigned diagnostic tools.
- [ ] Portal shows a clear *"report pending review"* state.

Notes: ____________________________________________________

## Path 3 — Admin review

- [ ] Admin sees the new submission in the diagnostic review queue.
- [ ] Admin reviews the Owner Diagnostic Interview without leaking
      `internal_notes` to the client.
- [ ] Admin reviews each diagnostic tool's typed evidence.
- [ ] Admin requests clarification (if needed) — client sees only the
      client-safe message.
- [ ] Admin builds the report / repair map in the report editor.
- [ ] Admin marks the report `published` and client-visible.
- [ ] Admin confirms only client-safe fields are exposed (P34
      `clientSafeReportFields`).

Notes: ____________________________________________________

## Path 4 — Client report

- [ ] Client sees the report only after it is `published` + client-visible.
- [ ] Client sees the repair map only when explicitly client-visible.
- [ ] Client does **not** see admin notes, draft AI content, or admin
      notifications.
- [ ] Client does **not** see implementation or RGS Control System tools
      unless separately assigned/active.
- [ ] Locked states use scope-safe copy (no raw reason codes, no
      scope-creep wording).

Notes: ____________________________________________________

## Path 5 — Access / security checks

- [ ] Diagnostic-only client cannot reach an implementation tool route by
      direct URL (ClientToolGuard blocks).
- [ ] Diagnostic-only client cannot reach an RGS Control System tool route
      by direct URL.
- [ ] Client A cannot read Client B's diagnostic data, reports, or files.
- [ ] Anonymous visitor cannot reach `/admin` or `/portal` routes.
- [ ] Raw reason codes / internal status enums never appear in client UI.
- [ ] Payment / access state controls tool visibility — toggling
      `client_tool_access` flips the My Tools list accordingly.

Notes: ____________________________________________________

## Path 6 — Failure states

- [ ] Stripe cancel / failure: user returns safely, no portal access
      granted, no tools unlocked.
- [ ] Invite not accepted: token expires; replay after acceptance fails.
- [ ] Client not approved: portal remains locked with a clear, scope-safe
      explanation.
- [ ] Report not ready: client sees a pending state, not a blank page.
- [ ] RGS Control System past-due / canceled: RccGate blocks subscription
      tools with scope-safe copy.
- [ ] Missing source data / connector not connected: surfaces
      *"request / setup"* language, not a fake "live sync" claim.

Notes: ____________________________________________________

---

## Sign-off

- [ ] All paths above pass for the first paid customer.
- [ ] No destructive changes were made to production-like data.
- [ ] The RGS / admin owner account is intact.
- [ ] Outstanding manual launch blockers from
      `docs/live-readiness-checklist.md` §K are recorded and assigned.

Operator: __________________  Date: __________