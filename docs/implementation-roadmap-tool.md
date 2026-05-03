# Implementation Roadmap Tool (P47)

## Purpose
Turn diagnostic findings, repair-map items, and admin review decisions into a
**bounded** implementation plan with clear ownership, deliverables, and next
steps. Belongs to the Implementation lane.

## Service-lane classification
- `tool_catalog.tool_key = implementation_roadmap`
- `tool_type = implementation`, `default_visibility = client_available`
- Route: `/portal/tools/implementation-roadmap`
- Admin route: `/admin/customers/:customerId/implementation-roadmap`
- `requires_active_client = true` (lifecycle gate via existing RPC)

## Access rules
- **Admins**: full create / edit / archive on roadmaps and items; can see internal notes.
- **Implementation clients**: see the tool only when the implementation lane is active and the tool resolves enabled via `private.get_effective_tools_for_customer`. ClientToolGuard enforces direct-route access.
- **Diagnostic-only clients**: cannot see or access by default.
- **RCS-only clients**: cannot access unless separately assigned/lane active.
- **Anonymous**: no access (RLS + ProtectedRoute).

## Visibility rules
- Client view goes through `public.get_client_implementation_roadmap` (SECURITY DEFINER, `EXECUTE` granted only to `authenticated`). The function projects only client-safe columns and never returns `internal_notes`.
- RLS on `implementation_roadmaps` and `implementation_roadmap_items` requires `client_visible = true` AND `archived_at IS NULL` for client SELECT, and the item additionally requires its parent roadmap to be client-visible.
- Drafts and admin-only items remain hidden from clients regardless of UI.

## Workflows
**Admin**: create roadmap → add items (gear, phase, priority, owner, deliverable, success indicator, client summary, internal notes) → toggle each item `client_visible` → toggle the roadmap `client_visible` when ready.

**Client**: opens `/portal/tools/implementation-roadmap` → sees roadmap title/summary, items grouped by phase (Stabilize → Install → Train → Handoff → Optional ongoing visibility), priority, owner, deliverable, success indicator. Empty state: *"Your implementation roadmap is being prepared."*

## Statuses
- Roadmap: `draft | ready_for_client | active | paused | complete | archived`
- Item: `draft | not_started | in_progress | waiting_on_client | waiting_on_rgs | blocked | complete | archived`

## Scope-safe copy rules
Allowed: "bounded implementation plan", "install the repair plan", "who owns the next step", "based on diagnostic findings and available evidence".

Banned (enforced by `implementationRoadmapToolContract.test.ts`): "unlimited support", "guaranteed results / revenue / ROI", "done-for-you", "we run your business", "we manage everything", "use anytime", "upgrade anytime", "ask RGS if", "Diagnostic + ongoing", "full-service", "hands-off for the owner".

## Integration with diagnostic / report / repair map
`implementation_roadmap_items` carries optional `source_repair_map_item_id` and `source_finding_id` for traceability. Items default to `client_visible = false` so any imported draft remains admin-only until released.

## Deferred
- Auto-generation of items from `priority_engine_scores` is intentionally not implemented in P47; admin must explicitly create items.
- Drag-to-reorder (sort_order is editable but no drag UI yet).