# Decision Rights / Accountability Tool (P49)

## Purpose

Help RGS implementation clients clarify who owns which decisions, who is responsible for action, who approves changes, who must be consulted, and who needs to be informed. Reduces owner-dependency and bottlenecks. Does not turn RGS into the operator of the business.

## Classification (per P48.2)

- **Service lane:** `implementation`
- **Customer journey phase:** `implementation_planning` (also surfaces during `implementation_execution`)
- **Industry behavior:** `all_industries_shared` with optional industry-aware copy/examples per entry. Industry rule: trades/services, restaurant, retail, cannabis/MMJ/MMC/dispensary (cannabis/dispensary logic — not general healthcare), with general SMB fallback.
- **Direct diagnostic access:** no by default
- **Direct RCS access:** no unless separately assigned
- **Admin-only fields (internal notes):** never returned to clients

## Diagnostic vs Implementation boundary

The Diagnostic finds slipping gears. Implementation installs the repair plan — and Decision Rights is part of that install. The tool does not appear for diagnostic-only clients by default. RCS-only clients do not see it unless explicitly assigned.

## Access

- **Admin** can create, edit, archive, and toggle visibility of any entry.
- **Implementation client** can read only their own entries that are `client_visible = true`, not archived, and not in `draft` status. Reads are served through `public.get_client_decision_rights(_customer_id uuid)` which does **not** return `internal_notes`.
- Portal route is gated by `ClientToolGuard toolKey="decision_rights_accountability"`. Admin route is gated by `ProtectedRoute requireRole="admin"`.

## Responsibility model

- **Decision owner** — has authority to decide
- **Action owner** — responsible for doing or coordinating the work
- **Approver** — must approve before it changes
- **Consulted** — asked before the decision is final
- **Informed** — notified after the decision is made
- Plus: escalation path, handoff trigger, decision cadence

If the team uses RACI, this maps to it but the tool uses plain owner-respecting labels.

## Data model

Table: `public.decision_rights_entries`
- Per-customer with optional links to `implementation_roadmaps`, `implementation_roadmap_items`, `sop_training_entries`.
- Reuses `sop_status` (draft, ready_for_review, client_visible, active, needs_update, archived) and `sop_review_state` enums.
- Admin-only field: `internal_notes`.

## Statuses

`draft` (admin-only) → `ready_for_review` → `client_visible` → `active` → `needs_update` → `archived` (hidden).

## Visibility rules

- Drafts are admin-only.
- Archived entries are hidden from clients.
- The `client_visible` toggle is the explicit gate. Even with the toggle on, status `draft` and `archived_at IS NOT NULL` keep the entry hidden.
- `internal_notes` is never selected by the client RPC.

## Industry behavior

Single shared tool with optional `industry_context` and `business_area` fields per entry. No industry-specific compliance, legal, tax, HR, or medical guidance is implied. For cannabis/MMJ/MMC/dispensary, language stays compliance-sensitive ("review with qualified counsel/compliance support where required") and is treated as cannabis/dispensary business logic, not general healthcare.

## Connections to P47 / P48

Each entry can optionally link to:
- an Implementation Roadmap or Roadmap item
- an SOP / Training Bible entry

These linkages are stored as nullable foreign keys with `ON DELETE SET NULL`. No auto-generation; admin chooses when to link.

## Banned scope-creep wording

Not allowed in client copy: unlimited support, unlimited management, guaranteed accountability/employee performance/results/revenue/ROI, fully automated management, replaces management/legal/compliance review, "RGS makes decisions for you", "RGS manages the team for you", done-for-you/full-service, "we run your business", "we manage everything", hands-off for the owner, use anytime, upgrade anytime, "ask RGS if", "Diagnostic + ongoing".

## AI assist

Deferred. No AI wiring in P49. To be revisited in the AI Assist Wiring Pass once safe admin-reviewed backend patterns are confirmed.

## Deferred

- Roadmap-item / SOP-entry pickers in the admin UI (currently raw foreign-key fields are not exposed in the form; admin can link via direct DB or a future enhancement).
- Auto-generation from roadmap items.
- Industry-specific templates and example library.
- Drag-reorder for sort_order.
- Client preview / diff view.
- AI draft assist for client_summary and escalation_path.
