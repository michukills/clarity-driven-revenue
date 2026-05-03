# P55 — Priority Action Tracker

## Classification

| Field | Value |
|---|---|
| tool_key | `priority_action_tracker` |
| service_lane | `rgs_control_system` |
| customer_journey_phase | `rcs_ongoing_visibility` |
| industry_behavior | `all_industries_shared` (industry-aware copy/examples allowed) |
| tool_type | `tracking` |
| requires_active_client | true |
| can_be_client_visible | true |
| contains_internal_notes | true |

Lives **inside** the RGS Control System™ umbrella, alongside Revenue Control
System™ and the Revenue & Risk Monitor. It is not a separate service lane.

## Access

- Diagnostic-only / implementation-only clients: not visible by default.
- RCS clients: receive via stage-based access through
  `private.get_effective_tools_for_customer` + `ClientToolGuard`
  (toolKey `priority_action_tracker`) + existing `useRccAccess`/`RccGate` rules
  where applicable.
- Manual `client_tool_access` overrides remain a secondary exception layer.
- Admin: `/admin/customers/:customerId/priority-action-tracker`.
- Client: `/portal/tools/priority-action-tracker`.

## Data

- Table `public.priority_action_items` with admin-curated priority actions.
- Enums: `pat_action_category`, `pat_gear`, `pat_priority_level`,
  `pat_status`, `pat_owner_role`, `pat_source_type`.
- RLS:
  - Admin: full access via `is_admin(auth.uid())`.
  - Client: SELECT only when `user_owns_customer`, `client_visible = true`,
    not archived, status ≠ `archived`.
- Client-safe RPC `public.get_client_priority_action_items(_customer_id)`
  excludes `internal_notes`, `admin_review_required`, `reviewed_by_admin_at`.

## What it does

- Lets RGS turn reviewed diagnostic, implementation, revenue, and risk signals
  into a clear, owner-visible list of priority actions.
- Tags priority, status, gear, action category, owner role, source linkage,
  why-it-matters, recommended next step, success signal, due date, next review.
- Industry-aware examples may include estimate / capacity / receivables follow-up
  (trades), labor / inventory / margin pressure (restaurant), stockout / margin /
  repeat-customer follow-up (retail), inventory or budtender handoff and
  compliance-sensitive process gaps (cannabis / MMJ / MMC — treated as
  cannabis/dispensary logic, not healthcare).

## What it does not do

Not a project-management suite, emergency support system, accounting / legal /
tax / compliance / payroll / HR / medical review, real-time monitoring, or
done-for-you execution. No guaranteed revenue / ROI / risk prevention / clean
data. Does not replace owner judgment.

## Relationship to Revenue & Risk Monitor (P54)

- `source_type` includes `revenue_risk_monitor` so admins can mark a priority
  action as originating from a monitor item.
- `source_id` (uuid) and `source_label` (text) provide future linking without
  requiring a hard FK in P55.
- A dedicated "Create priority action from this monitor item" affordance on
  the P54 admin page is **deferred** to avoid risking P54 stability.

## AI

Deferred to the AI Assist Wiring Pass.

## Tests

`src/lib/__tests__/priorityActionTrackerContract.test.ts` covers
classification, RLS shape, RPC field exclusion, route gating, banned
scope-creep wording, and gear/source enum coverage.

## Deferred

- Connector- or AI-driven auto-population of priority actions.
- Hard FK / cascade on `source_id` to specific source tables.
- Cross-link affordance from Revenue & Risk Monitor admin page.
- Cross-tool surfacing on Owner Decision Dashboard (P56).