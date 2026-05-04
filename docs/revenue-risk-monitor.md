# P54 — Revenue & Risk Monitor

## Classification

| Field | Value |
|---|---|
| tool_key | `revenue_risk_monitor` |
| service_lane | `rgs_control_system` |
| customer_journey_phase | `rcs_ongoing_visibility` |
| industry_behavior | `industry_specific_benchmarks` |
| tool_type | `tracking` |
| requires_active_client | true |
| can_be_client_visible | true |
| contains_internal_notes | true |

Lives **inside** the RGS Control System™ umbrella, alongside Revenue Control
System™. It is not a separate service lane.

## Access

- Diagnostic-only / implementation-only clients: not visible by default.
- RCS clients: receive via stage-based access + `ClientToolGuard` (toolKey
  `revenue_risk_monitor`) + existing `useRccAccess`/`RccGate` rules where applicable.
- Admin: `/admin/customers/:customerId/revenue-risk-monitor`.
- Client: `/portal/tools/revenue-risk-monitor`.

## Data

- Table `public.revenue_risk_monitor_items` with admin-curated signals.
- Enums: `rrm_signal_category`, `rrm_severity`, `rrm_status`, `rrm_trend`,
  `rrm_source_type`.
- RLS: admin full access; clients can SELECT only their own rows where
  `client_visible = true`, not archived, status ≠ `archived`.
- Client-safe RPC `public.get_client_revenue_risk_monitor_items(_customer_id)`
  excludes `internal_notes`, `admin_review_required`, `reviewed_by_admin_at`.

## What it does

- Surfaces revenue, cash, receivables, pipeline, operations, and risk signals
  for owner review.
- Tags severity, status, trend, source, and owner-review recommendation.
- Industry-aware: examples may include estimate follow-up delays (trades),
  food cost / labor pressure (restaurant), inventory turns (retail),
  inventory/payment handoff or compliance-sensitive process gaps (cannabis /
  MMJ / MMC — treated as cannabis/dispensary logic, not healthcare).

## What it does not do

Not accounting, legal, tax, payroll, HR, healthcare/clinical, or compliance review. Not
real-time monitoring. Not emergency support. No guaranteed revenue / ROI /
risk prevention / clean data. Does not replace owner judgment.

## AI

Deferred to the AI Assist Wiring Pass.

## Tests

`src/lib/__tests__/revenueRiskMonitorContract.test.ts` covers classification,
RLS shape, RPC field exclusion, route gating, and banned scope-creep wording.

## Deferred

- Connector-driven auto-population of items.
- AI-assisted draft summarization.
- Cross-linking to Priority Action Tracker (P55) and Owner Decision Dashboard (P56).