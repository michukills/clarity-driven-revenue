# P56 — Owner Decision Dashboard

## Classification

| Field | Value |
|---|---|
| tool_key | `owner_decision_dashboard` |
| service_lane | `rgs_control_system` |
| customer_journey_phase | `rcs_ongoing_visibility` |
| industry_behavior | `all_industries_shared` (industry-aware copy/examples allowed) |
| tool_type | `tracking` (dashboard) |
| requires_active_client | true |
| can_be_client_visible | true |
| contains_internal_notes | true |

Lives **inside** the RGS Control System™ umbrella, alongside Revenue Control
System™, Revenue & Risk Monitor (P54), and Priority Action Tracker (P55).
It is not a separate service lane.

## Access

- Diagnostic-only / implementation-only clients: not visible by default.
- RCS clients: receive via stage-based access through
  `private.get_effective_tools_for_customer` + `ClientToolGuard`
  (toolKey `owner_decision_dashboard`) and existing `useRccAccess` / `RccGate`
  patterns where applicable.
- Manual `client_tool_access` overrides remain a secondary exception layer.
- Admin: `/admin/customers/:customerId/owner-decision-dashboard`.
- Client: `/portal/tools/owner-decision-dashboard`.

## Data

- New table `public.owner_decision_dashboard_items` (admin-curated owner-level
  decision prompts).
- Enums: `odd_decision_type`, `odd_gear`, `odd_priority_level`, `odd_status`,
  `odd_source_type`.
- RLS:
  - Admin: full access via `is_admin(auth.uid())`.
  - Client: SELECT only when `user_owns_customer`, `client_visible = true`,
    not archived, status ≠ `archived`.
- Client-safe RPC `public.get_client_owner_decision_dashboard(_customer_id)`
  unifies client-visible rows from:
  - `owner_decision_dashboard_items` (`item_type = 'owner_decision'`)
  - `priority_action_items` (P55, `item_type = 'priority_action'`)
  - `revenue_risk_monitor_items` (P54, `item_type = 'revenue_risk_monitor'`)
- The RPC excludes `internal_notes`, `admin_review_required`,
  `reviewed_by_admin_at`, payment internals, raw access reason codes, and
  data belonging to other customers.

## What it does

- Gives the owner a calm, plain-language view of decisions that need
  attention next.
- Surfaces, per item: decision question, recommended owner review, gear
  affected, priority/severity, status, source (Priority Action Tracker,
  Revenue & Risk Monitor, scorecard, monthly review, admin review, etc.),
  decision-needed-by date, and next review date.
- Industry-aware examples may include capacity / estimate follow-up / unpaid
  invoices (trades), labor pressure / food cost / menu margin (restaurant),
  stockouts / margin / repeat-customer follow-up (retail), inventory or
  budtender handoffs and compliance-sensitive process gaps (cannabis / MMJ /
  MMC — treated as cannabis/dispensary logic, not healthcare; review with
  qualified counsel/compliance support where required).

## What it does not do

Not a project-management suite, emergency support system, accounting / legal /
tax / compliance / payroll / HR / medical review, real-time monitoring, or
done-for-you execution. No guaranteed revenue / ROI / risk prevention / clean
data. Does not replace owner judgment or final authority.

## Relationship to P54 / P55

- The dashboard reads existing client-visible rows from Priority Action
  Tracker (P55) and Revenue & Risk Monitor (P54) through the unified RPC.
- New decision prompts created here use `source_type` values such as
  `priority_action_tracker`, `revenue_risk_monitor`, `decision_rights`,
  `monthly_review`, `scorecard`.
- No bi-directional sync, deep linking, or auto-generation in P56.

## AI

Deferred to the AI Assist Wiring Pass.

## Tests

`src/lib/__tests__/ownerDecisionDashboardContract.test.ts` covers
classification, RLS shape, RPC field exclusion, route gating, banned
scope-creep wording, source/gear enum coverage, and unified-feed safety.

## Deferred

- AI summarization of decision prompts.
- "Create dashboard prompt from this monitor / priority item" admin shortcut.
- Connector-driven auto-generation.