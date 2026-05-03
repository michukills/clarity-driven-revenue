# SOP / Training Bible Creator (P48)

## Purpose
Turn approved processes, roles, tasks, and implementation roadmap items into
clear, repeatable, step-by-step operating instructions and training notes.
Belongs to the Implementation lane.

## Service-lane classification
- `tool_catalog.tool_key = sop_training_bible`
- `tool_type = implementation`, `default_visibility = client_available`
- Route: `/portal/tools/sop-training-bible`
- Admin route: `/admin/customers/:customerId/sop-training-bible`
- `requires_active_client = true`

## Diagnostic vs Implementation boundary
- **Diagnostic-only clients**: do not get direct-use access by default. Any
  SOP-style content reaches them only if it was packaged into the diagnostic
  report or explicitly marked client-visible by admin.
- **Implementation clients**: may use the tool when the implementation lane
  is active or the tool is explicitly assigned.
- **RGS Control System / RCS clients**: may receive ongoing refinement only
  when the RCS lane is active or the tool is separately assigned.
- **Anonymous**: no access (RLS + ProtectedRoute).

## Access rules
- Admins: full create / edit / archive on entries; can see internal notes.
- Implementation clients: see the tool only when the implementation lane
  resolves enabled via `private.get_effective_tools_for_customer`.
  ClientToolGuard enforces direct-route access.
- Clients can never read another client's SOPs (RLS).
- `internal_notes` is never returned to clients (client-safe RPC excludes it).
- Drafts (`status = 'draft'`) and archived entries are admin-only regardless
  of `client_visible`.

## Admin workflow
Create entry → fill title, purpose, category, role, trigger, inputs, steps,
quality standard, common mistakes, escalation, owner decision point,
training notes, client summary, internal notes → set status / review state →
toggle `client_visible` when ready → archive when retired.

## Client workflow
Open `/portal/tools/sop-training-bible` → see approved entries grouped by
category → read steps, quality standard, training notes, who owns the work.
Empty state: *"Your SOP / Training Bible is being prepared."*

## Statuses
- Entry status (`sop_status`): `draft | ready_for_review | client_visible | active | needs_update | archived`
- Review state (`sop_review_state`): `not_reviewed | admin_reviewed | client_reviewed | needs_revision`

## Step structure
Steps are stored as ordered JSON on `sop_training_entries.steps`:
`[{ order, instruction, expected_outcome?, note? }, ...]`. This keeps the
launch-day footprint small; a child table can be introduced later if needed.

## Training Bible grouping
The client view groups visible entries by `category` (falling back to
*General*). Role / gear / linked roadmap item are surfaced inside each card.

## Visibility rules
- Client view goes through `public.get_client_sop_training_bible`
  (SECURITY DEFINER, EXECUTE granted only to `authenticated`). The function
  projects only client-safe columns and never returns `internal_notes`.
- RLS on `sop_training_entries` requires `client_visible = true`,
  `archived_at IS NULL`, and `status <> 'draft'` for client SELECT.

## Internal notes
`internal_notes` is admin-only. The client RPC and the client UI never read
or render it. The contract test enforces this.

## Banned scope-creep copy
Enforced by `sopTrainingBibleToolContract.test.ts`:
*unlimited support*, *unlimited SOPs*, *guaranteed compliance*,
*guaranteed employee performance*, *guaranteed results / revenue / ROI*,
*fully automated training*, *replaces management*, *replaces legal review*,
*replaces compliance review*, *RGS runs training for you*, *done-for-you*,
*full-service*, *we run your business*, *we manage everything*,
*hands-off for the owner*, *use anytime*, *upgrade anytime*, *ask RGS if*,
*Diagnostic + ongoing*.

## Connection to Implementation Roadmap (P47)
Entries can optionally link to an `implementation_roadmap_id` and/or
`implementation_roadmap_item_id` for traceability. Auto-generation from
roadmap items is **deferred** — admin must create entries explicitly.

## Deferred
- Auto-generate SOP drafts from roadmap items.
- Drag-to-reorder steps and entries (sort_order is editable).
- AI-assisted drafting (none added in P48; if introduced later, must be
  admin-reviewed before client-visible).
