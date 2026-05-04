# P64 — Client Health / Renewal Risk Tool

## Purpose

Internal admin visibility layer for spotting clients who may need review,
follow-up, clarification, or renewal attention. It is **not** a client-facing
score, **not** a sales automation, and **not** a guarantee of renewal,
retention, or client outcomes.

It does **not** change payment or access gates.

## Boundaries

- Admin-only. No client route in P64.
- Internal notes stay admin-only and are never shown to the client.
- Renewal risk and churn labels are not exposed to clients.
- Professional review is recommended where compliance, legal, tax, or
  accounting questions exist.

## Routes

- `/admin/client-health` — global overview, grouped by attention/health.
- `/admin/customers/:customerId/client-health` — per-client management.

Both routes are protected by `ProtectedRoute requireRole="admin"`.

A "Client Health" button has been added on `CustomerDetail` for fast access.

## Schema

Table: `public.client_health_records`

Domain fields:
- `health_status` — healthy, stable, watch, needs_attention, at_risk, unknown
- `renewal_risk_level` — low, moderate, high, critical, unknown
- `engagement_status` — engaged, slow_response, stalled, inactive,
  waiting_on_client, waiting_on_rgs, unknown
- `admin_action_type` — none, review_needed, clarification_needed,
  monthly_review_due, priority_action_follow_up, owner_decision_follow_up,
  implementation_offer, rgs_control_system_offer, renewal_review,
  professional_review_recommended, payment_or_access_review, other
- `status` — draft, active, reviewed, archived
- Classification metadata: `service_lane`, `customer_journey_phase`,
  `industry_behavior`
- `related_tool_key`, `related_source_type`, `related_source_id` — link to
  signals from P54–P63 tools
- Summaries: `health_summary`, `renewal_risk_summary`,
  `recommended_admin_action`
- Flags: `attention_needed`, `professional_review_recommended`
- Dates: `next_review_date`, `renewal_date`, `last_reviewed_at`
- Admin-only: `internal_notes`, `admin_notes`
- `tags`, `display_order`, `archived_at`

## RLS

- RLS enabled.
- Single policy: `Admin manage client health records` —
  `USING/WITH CHECK public.is_admin(auth.uid())`.
- No client read policy. No client-safe RPC.

## Tool catalog

No `tool_catalog` row created — this is an admin-only system surface and
follows the precedent of other admin-only tools (Industry Brain, etc.).

## Relationship to P54–P63

The `related_source_type` enum allows linking a health record to signals
from existing tools:
- Revenue & Risk Monitor (P54)
- Priority Action Tracker (P55)
- Owner Decision Dashboard (P56)
- Scorecard History (P57)
- Monthly System Review (P58)
- Tool Library (P59)
- Advisory Notes (P60)
- Financial Visibility (P62)
- RGS Stability Snapshot / SWOT (P61)
- Industry Brain (P63)

Automatic cross-tool rollups are deferred (see below).

## Deferred items

- Automatic signal aggregation across P54–P63 tools.
- AI client health scoring / churn prediction / renewal recommendations.
- Automatic renewal offers, email reminders, push notifications.
- Client-facing health score or renewal risk labels.
- Auto-changing payment/access gates.
- Auto-generation of Priority Actions / Owner Decisions / Monthly Review
  items from health records.
- CRM integration and external calendar/reminder jobs.

AI assist for drafting admin-only summaries is deferred to the dedicated
AI Assist Wiring Pass.
