# P53 — Revenue Control System™ Inside the RGS Control System™

## Product hierarchy

- **RGS Control System™** — umbrella subscription / ongoing visibility lane.
- **Revenue Control System™** — revenue visibility tool that lives **inside**
  the RGS Control System™. Not the whole subscription.
- Other RGS Control System™ tools (Revenue & Risk Monitor, Priority Tasks,
  Weekly Alignment / Owner Decision Support, Scorecard trends, Connected
  Truth Sources, Reports & Reviews) are sibling tools within the same lane.

## Definition

> The Revenue Control System™ lives inside the RGS Control System™. It
> focuses on revenue visibility: the numbers, signals, and movement that help
> an owner see what is changing before the business starts slipping.

## Classification (preserved from P48.2 / P52)

| tool_key | service_lane | customer_journey_phase | industry_behavior |
|---|---|---|---|
| `rgs_control_system` | `rgs_control_system` | `rcs_ongoing_visibility` | `all_industries_shared` |
| `revenue_control_center` | `rgs_control_system` | `rcs_ongoing_visibility` | `all_industries_shared` |
| `revenue_tracker` | `rgs_control_system` | `rcs_ongoing_visibility` | `all_industries_shared` |
| `revenue_risk_monitor` | `rgs_control_system` | `rcs_ongoing_visibility` | `industry_specific_benchmarks` |
| `quickbooks_sync_health` | `rgs_control_system` | `rcs_ongoing_visibility` | `all_industries_shared` |

No new rows, lanes, phases, or RPCs were created in P53. No new tables, no new
RLS, no new access gates.

## Access (unchanged)

- Diagnostic-only clients: do not see RGS Control System™ tools by default.
- Implementation-only clients: do not see RCS tools unless RCS is active or
  manually assigned.
- RCS clients: receive umbrella + child tools through stage-based access plus
  `client_tool_access` overrides.
- Live access continues to flow through `tool_catalog` →
  `get_effective_tools_for_customer` → `ClientToolGuard` plus
  `RccGate` / `useRccAccess` for RCS subscription/grace/past-due/canceled.

## Surfaces touched

- Public: `/revenue-control-system` — hero/SEO/copy now positions the tool as
  living inside the RGS Control System™.
- Client portal: `/portal/business-control-center/revenue-tracker` — eyebrow,
  description, and a back-link to `/portal/tools/rgs-control-system` make the
  parent/child relationship explicit.
- Client umbrella: `/portal/tools/rgs-control-system` — Revenue Control
  System™ is the first labeled group.

## What Revenue Control System™ does

- Revenue visibility: weekly revenue, expenses, payroll, receivables, cash
  movement.
- Surface signals an owner should review next.
- Where supported, organize key business truth sources (QuickBooks, HubSpot,
  Stripe, Square, Xero, Salesforce, Dutchie, etc.) into a clearer operating
  picture.

## What Revenue Control System™ does not do

- It is not the whole RGS Control System™ subscription.
- It is not implementation, accounting, legal, tax, payroll, HR, or
  compliance review.
- It does not replace QuickBooks, HubSpot, Stripe, Square, Xero, Salesforce,
  Dutchie, or any source system.
- It does not guarantee revenue, ROI, results, or clean data.
- It does not provide unlimited support, unlimited consulting, emergency
  support, or done-for-you operations.

## Banned wording (contract-tested)

`unlimited support`, `unlimited implementation`, `unlimited consulting`,
`emergency support`, `RGS runs your business`, `RGS manages everything`,
`done-for-you`, `full-service`, `guaranteed revenue/ROI/results/clean data`,
`automatic insight from every tool`, `replaces accounting/legal/tax/compliance`,
`use anytime`, `upgrade anytime`, `ask RGS if`, `Diagnostic + ongoing`.

## Tests

`src/lib/__tests__/revenueControlSystemInsideRgsContract.test.ts` enforces:

- public, portal RCC, and umbrella surfaces all describe Revenue Control
  System™ as part of the RGS Control System™;
- no duplicate Revenue Control System tool_catalog row was added;
- the umbrella `rgs_control_system` row from P52 remains intact;
- banned/scope-creep wording does not appear on these surfaces.

## Deferred

- Dedicated public umbrella marketing page for RGS Control System™ (currently
  client-only).
- AI-assisted Revenue Control System™ summaries.
- Cross-linking Revenue Control System™ insights into Reports & Reviews.