# RGS Control System™ Umbrella (P52)

## Purpose

Client-facing and admin-facing umbrella for the RGS Control System™ subscription
lane. Brings ongoing visibility tools, current priorities, review rhythm,
decision support, and connected truth-source signals into one organized view.

The RGS Control System™ is the ongoing visibility / guided-independence layer.
It is not implementation, not unlimited support, not RGS operating the business.

## Classification

| Field | Value |
|---|---|
| tool_key | `rgs_control_system` |
| service_lane | `rgs_control_system` |
| customer_journey_phase | `rcs_ongoing_visibility` |
| industry_behavior | `all_industries_shared` |
| tool_type | `tracking` |
| default_visibility | `client_available` |
| requires_active_client | true |
| contains_internal_notes | false |
| can_be_client_visible | true |

## Access

- Diagnostic-only clients: not visible by default.
- Implementation-only clients: not visible unless RCS is active or assigned.
- RCS clients: receive it through stage-based access + `client_tool_access`.
- Admin: read-only umbrella; full access to underlying override panels.

Access flows through the existing pipeline:

- `tool_catalog` row (this migration) +
- `private.get_effective_tools_for_customer` RPC +
- `ClientToolGuard` (toolKey `rgs_control_system`).

RCS subscription/grace/past-due/canceled rules continue to be enforced by
`useRccAccess` / `RccGate` for the underlying RCS tools (Revenue Control Center,
Revenue Tracker, etc.). The umbrella page itself surfaces those tools through
`get_effective_tools_for_customer`, so locked tools render as "Not currently
active" or "Coming soon" without exposing payment internals.

## Routes

- Client: `/portal/tools/rgs-control-system` — `ClientToolGuard toolKey="rgs_control_system"`.
- Admin: `/admin/customers/:customerId/rgs-control-system` — `requireRole="admin"`.

## Data model

No new tables. The umbrella is derived from existing `tool_catalog`, the
effective-tools RPC, and existing RCS subscription fields on `customers`.

## RCS tool grouping

- Revenue visibility — Revenue Control Center™, Revenue Tracker
- Risk and priority tracking — Revenue & Risk Monitor™, Priority Tasks
- Owner decision support — Weekly Alignment System
- Score and stability trends — Scorecard
- Connected truth sources — QuickBooks Sync Health
- Reports and reviews — Reports & Reviews

Tools not yet registered in `tool_catalog` render as "Coming soon".

## Truth-source positioning

Approved language: "Where supported, RGS can help connect key business truth
sources so the owner is not trying to interpret every tool in isolation."
QuickBooks, HubSpot, Stripe, Square, Xero, Salesforce, etc. remain the system
of record. RGS does not replace them and makes no claim of automatic sync for
every platform.

## Visibility rules

Clients never see internal admin notes, raw reason codes, payment internals,
other clients' data, admin-only tools, or implementation tools unless those are
separately assigned/active.

## Banned / scope-creep wording

No unlimited support / unlimited implementation / unlimited consulting,
emergency support, "RGS runs your business", "RGS manages everything",
done-for-you operations, full-service management, guaranteed revenue / ROI /
results / clean data, "automatic insight from every tool", replacement for
accounting/legal/tax/compliance review, "use anytime", "upgrade anytime",
"ask RGS if", or "Diagnostic + ongoing".

Contract tests guard these phrases on both client and admin surfaces.

## AI assist

Deferred to the AI Assist Wiring Pass. No AI patterns are wired in P52.

## Deferred

- Lightweight `rgs_control_system_overviews` table (review rhythm, next review
  date, client-visible advisory summary) when there is product demand.
- Industry-aware overview cards.
- AI-assisted summarization of monthly reviews.