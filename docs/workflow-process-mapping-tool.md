# Workflow / Process Mapping Tool (P50)

## Purpose
Help RGS and implementation clients map how work actually moves through the
business: trigger, steps, handoffs, decisions, bottlenecks, rework loops, and
revenue/time/risk leaks. Belongs to the Implementation lane.

## Service-lane classification
- `tool_catalog.tool_key = workflow_process_mapping`
- `service_lane = implementation`
- `customer_journey_phase = implementation_execution`
- `industry_behavior = industry_aware_outputs`
- `tool_type = implementation`, `default_visibility = client_available`
- Route: `/portal/tools/workflow-process-mapping`
- Admin route: `/admin/customers/:customerId/workflow-process-mapping`
- `requires_active_client = true`
- `contains_internal_notes = true`, `can_be_client_visible = true`

## Diagnostic vs Implementation boundary
- The Diagnostic finds the slipping gears.
- Implementation installs the repair plan — Workflow / Process Mapping lives
  here.
- The RGS Control System™ keeps the owner connected to the system without
  turning RGS into an operator inside the business.

## Access rules (rely on existing P43 / P43.1 / P49.1 enforcement)
- **Admins**: full create / edit / archive on maps.
- **Implementation clients**: see the tool only when implementation lane is
  active and `private.get_effective_tools_for_customer` resolves it enabled.
  `ClientToolGuard` enforces direct-route access.
- **Diagnostic-only clients**: cannot see or access by default.
- **RCS-only clients**: cannot access unless separately assigned.
- **Anonymous**: no access (RLS + ProtectedRoute).

## Visibility rules
- Client view goes through `public.get_client_workflow_process_maps`
  (SECURITY DEFINER, EXECUTE granted only to `authenticated`). The function
  projects only client-safe columns and never returns `internal_notes`.
- RLS on `workflow_process_maps` requires `client_visible = true`,
  `archived_at IS NULL`, and `status <> 'draft'` for client SELECT.
- Drafts and admin-only fields remain hidden from clients regardless of UI.

## Data model
Single table: `public.workflow_process_maps`. Fields include `customer_id`,
optional foreign keys to `implementation_roadmaps`,
`implementation_roadmap_items`, `sop_training_entries`, and
`decision_rights_entries`; descriptive fields for purpose / trigger /
current and desired state / owner / roles / systems / inputs / outputs /
handoffs / decisions / approvals / bottlenecks / rework loops / leaks;
`steps jsonb` for ordered steps; `client_summary` and `internal_notes`;
`status` (`sop_status`), `review_state` (`sop_review_state`), `version`,
`sort_order`, `client_visible`, `archived_at`.

Step JSONB shape:
```
{ "order": 1, "step_name": "Lead received", "role_owner": "Office manager",
  "action": "Log inquiry", "tool_or_system_used": "CRM",
  "input": "Customer request", "output": "Qualified job request",
  "handoff_to": "Estimator", "decision_required": false,
  "bottleneck_flag": false, "note": "" }
```

## Statuses & review states
- Status: `draft | ready_for_review | client_visible | active | needs_update | archived`
- Review: `not_reviewed | admin_reviewed | client_reviewed | needs_revision`

Reuses the existing `sop_status` and `sop_review_state` enums from P48.

## Workflows
**Admin**: create map → fill purpose / trigger / current vs desired state →
add ordered steps with roles, systems, inputs/outputs, handoffs, decision
and bottleneck flags → write client summary and internal notes → toggle
`client_visible` when ready → archive instead of deleting.

**Client**: opens `/portal/tools/workflow-process-mapping` → sees approved
maps grouped by business area, with purpose, trigger, current vs desired
state, ordered steps, handoffs, decisions, bottlenecks. Empty state:
*"Your workflow and process maps are being prepared."*

## Industry-aware behavior
Single shared structure with `industry_context` and example labels per
industry (trades, restaurant, retail, cannabis/MMJ/MMC/dispensary, general).
Cannabis/MMJ/MMC is treated as cannabis/dispensary business logic, not
healthcare. No legal/compliance guarantees are made; admin must mark
"compliance-sensitive" steps and review with qualified counsel where needed.

## Integration with Implementation Roadmap, SOP, Decision Rights
Optional foreign keys to roadmap / roadmap item / SOP entry / decision-rights
entry. Auto-generation, pickers, and import are deferred. Linked items
remain admin-only until explicitly marked `client_visible`.

## Scope-safe copy rules
Allowed: "process map", "workflow map", "how work moves", "handoffs",
"bottlenecks", "decision points", "approval points", "rework loops",
"operating standards", "built during implementation", "admin-reviewed",
"client-visible", "review before using with staff", "adapt to your business".

Banned (enforced by `workflowProcessMappingToolContract.test.ts`):
"unlimited support", "unlimited process mapping", "guaranteed operational
improvement", "guaranteed employee performance", "guaranteed results /
revenue / ROI", "fully automated operations", "replaces management",
"replaces legal review", "replaces compliance review", "RGS runs operations
for you", "RGS manages the team for you", "done-for-you", "full-service",
"we run your business", "we manage everything", "hands-off for the owner",
"use anytime", "upgrade anytime", "ask RGS if", "Diagnostic + ongoing".

## AI assist decision
**Deferred** to the AI Assist Wiring Pass. No AI is wired in P50. When AI
patterns mature, admin-only summarization of messy process notes and draft
client-visible summaries can be added behind admin review.

## Deferred
- Auto-generation of maps from roadmap / SOP / decision-rights entries.
- Drag-to-reorder UI for steps.
- Linked-record pickers (currently nullable IDs only).
- AI-assisted draft summarization.
- Visual canvas / node-edge diagram engine.
