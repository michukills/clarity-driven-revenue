# Tool Lane / Phase / Industry Classification (P48.2)

## Purpose

Every RGS tool must belong to a specific service lane, customer journey phase, and have a defined industry behavior. This stops tools from being treated as random add-ons and ensures each tool is exposed only where it belongs.

This is a **classification / metadata** pass. It does not change access control, RLS, RPCs, ClientToolGuard, or routes. The source of truth for tool availability remains `private.get_effective_tools_for_customer`.

## Service lanes

- **diagnostic** — one-time paid inspection / examination tools.
- **implementation** — separate paid project-based system installation tools.
- **rgs_control_system** (a.k.a. **revenue_control_system**) — subscription / ongoing visibility tools.
- **shared_support** — surfaces both lanes use (service requests, evidence uploads, weekly alignment).
- **report_only** — client-visible report outputs.
- **admin_only** — internal admin/operations tools, never exposed to clients.
- **public_pre_client** — public marketing / lead-gen surfaces (e.g. public scorecard).

> "The Diagnostic finds the slipping gears. Implementation installs the repair plan. The RGS Control System™ keeps the owner connected to the system without turning RGS into an operator inside the business."

## Customer journey phases

`public_pre_client`, `paid_diagnostic`, `owner_interview`, `diagnostic_tools`, `admin_review`, `report_repair_map`, `implementation_planning`, `implementation_execution`, `training_handoff`, `rcs_ongoing_visibility`, `renewal_health_monitoring`, `internal_admin_operations`.

## Industry behavior

`all_industries_shared`, `industry_aware_copy`, `industry_aware_questions`, `industry_aware_outputs`, `industry_specific_benchmarks`, `industry_specific_templates`, `industry_restricted`, `general_fallback`.

Industry rules:
- Trades / services logic for service businesses.
- Restaurant / food-service logic where applicable.
- Retail logic where applicable.
- **Cannabis / MMJ / MMC / dispensary** = cannabis/dispensary/medical-marijuana/recreational-marijuana business logic. **Not general healthcare.**
- General small-business logic as fallback.

Prefer one shared tool with industry-aware fields/outputs over duplicating tools per industry.

## Current classification

| Tool key | Lane | Phase | Industry | Client-visible | Internal notes |
|---|---|---|---|---|---|
| owner_diagnostic_interview | diagnostic | owner_interview | industry_aware_questions | yes | no |
| rgs_stability_scorecard | diagnostic | diagnostic_tools | all_industries_shared | yes | no |
| scorecard | public_pre_client | public_pre_client | all_industries_shared | yes | no |
| buyer_persona_tool | diagnostic | diagnostic_tools | industry_aware_outputs | no | yes |
| customer_journey_mapper | diagnostic | diagnostic_tools | industry_aware_outputs | no | yes |
| process_breakdown_tool | diagnostic | diagnostic_tools | industry_aware_outputs | no | yes |
| revenue_leak_finder | diagnostic | diagnostic_tools | industry_specific_benchmarks | no | yes |
| diagnostic_workspace | admin_only | admin_review | all_industries_shared | no | yes |
| implementation_roadmap | implementation | implementation_planning | all_industries_shared | yes | yes |
| sop_training_bible | implementation | training_handoff | all_industries_shared | yes | yes |
| workflow_process_mapping | implementation | implementation_execution | industry_aware_outputs | yes | yes |
| tool_assignment_training_tracker | implementation | training_handoff | all_industries_shared | yes | yes |
| rgs_control_system | rgs_control_system | rcs_ongoing_visibility | all_industries_shared | yes | no |
| implementation_foundation_system | implementation | implementation_execution | all_industries_shared | yes | no |
| implementation_command_tracker | implementation | implementation_execution | all_industries_shared | yes | no |
| priority_tasks | implementation | implementation_execution | all_industries_shared | yes | no |
| revenue_control_center | rgs_control_system | rcs_ongoing_visibility | all_industries_shared | yes | no |
| revenue_risk_monitor | rgs_control_system | rcs_ongoing_visibility | industry_specific_benchmarks | yes | no |
| revenue_tracker | rgs_control_system | rcs_ongoing_visibility | all_industries_shared | yes | no |
| priority_action_tracker | rgs_control_system | rcs_ongoing_visibility | all_industries_shared | yes | yes |
| owner_decision_dashboard | rgs_control_system | rcs_ongoing_visibility | all_industries_shared | yes | yes |
| quickbooks_sync_health | rgs_control_system | rcs_ongoing_visibility | all_industries_shared | yes | no |
| reports_and_reviews | report_only | report_repair_map | all_industries_shared | yes | yes |
| client_service_requests | shared_support | rcs_ongoing_visibility | all_industries_shared | yes | no |
| evidence_uploads | shared_support | diagnostic_tools | all_industries_shared | yes | no |
| weekly_alignment_system | shared_support | rcs_ongoing_visibility | all_industries_shared | yes | no |
| admin_settings, demo_sandbox_tools, learning_brain, operational_profile, outcome_review, priority_roadmap, report_drafts | admin_only | internal_admin_operations | all_industries_shared | no | yes |

## How Diagnostic / Implementation / RGS Control System tools differ

- **Diagnostic** tools are one-time and gated by paid diagnostic + owner interview completion. They produce findings the admin reviews and converts into the report / repair map.
- **Implementation** tools (Roadmap, SOP / Training Bible, Foundation, Command Tracker, Priority Tasks) require an active implementation engagement. Diagnostic-only and RCS-only clients do **not** see them by default.
- **RGS Control System™** tools require an active client and an active RCS subscription/assignment. They are not exposed to diagnostic-only or implementation-only clients unless explicitly assigned.

## Shared / report-only outputs

Reports & Reviews and other client-visible outputs respect each tool's `can_be_client_visible` flag and the existing `client_visible` filters in their RPCs. Internal notes are never returned to clients.

## Admin-only tools

Tools with `service_lane = 'admin_only'` are filtered out of `tool_catalog` for non-admin readers via the existing RLS policy (`tool_type <> 'admin_only'` AND `default_visibility <> 'admin_only'`). No client-side surface lists them.

## How to classify future tools

Before building any new tool:
1. Decide service lane.
2. Decide customer journey phase.
3. Decide industry behavior (prefer shared with industry-aware fields).
4. Decide whether outputs can be client-visible.
5. Decide whether internal notes exist.
6. Insert with classification populated; never leave nullable.

## What changed in P48.2

- Added nullable metadata columns to `tool_catalog`: `service_lane`, `customer_journey_phase`, `industry_behavior`, `can_be_client_visible`, `contains_internal_notes`, `lane_sort_order`, `phase_sort_order`.
- Soft check constraints validate allowed values when present.
- All 28 active tool_catalog rows now classified.
- Contract tests added: `src/lib/__tests__/toolLanePhaseIndustryClassificationContract.test.ts`.
- No access-control, RLS, RPC, or route changes.

## Deferred

- Admin UI to surface lane/phase/industry chips on the tool catalog admin page.
- Industry-aware templates/benchmarks for tools currently flagged `industry_aware_*` or `industry_specific_*`.
- Future P49 (Decision Rights), P50 (Workflow Mapping), P51 (Tool Assignment & Training Tracker) — must be classified at insert time.
