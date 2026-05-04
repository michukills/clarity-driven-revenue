# Advisory Notes / Clarification Log (P60)

## Purpose
A controlled, client-safe log for bounded RGS advisory interpretation, clarification
requests, client-visible review notes, and follow-up context. It exists to keep
clarification history organized within the agreed RGS service scope. It is not open-ended
chat, not real-time messaging, not unlimited support, and not a substitute for owner
judgment or qualified accounting / legal / tax / compliance / payroll / HR review.

## Boundaries
- Bounded review and clarification materials only.
- Internal notes never leak to the client.
- Publishing a note does not bypass lane, payment, invite, tenant, or client-visibility rules.
- Stage-based access remains the default; manual exceptions remain override-only.
- Cannabis / dispensary (MMJ/MMC) flagged compliance-sensitive — review with qualified counsel where required.

## Routes
- Client: `/portal/tools/advisory-notes` — gated by `ClientToolGuard toolKey="advisory_notes_clarification_log"`
- Admin: `/admin/customers/:customerId/advisory-notes` — `ProtectedRoute requireRole="admin"`

## Tool catalog classification
- `tool_key`: `advisory_notes_clarification_log`
- `service_lane`: `shared_support`
- `customer_journey_phase`: `rcs_ongoing_visibility`
- `industry_behavior`: `all_industries_shared`
- `tool_type`: `reporting`
- `requires_active_client`: `true`
- `contains_internal_notes`: `true`
- `can_be_client_visible`: `true`

## Schema
Table `public.advisory_clarification_entries`. Notable columns:
- `customer_id` (FK to `customers`)
- `title`, `note_type`, `status`, `priority`
- `service_lane`, `customer_journey_phase`, `industry_behavior`
- `related_tool_key`, `related_source_type`, `related_source_id`, `related_gear`
- `client_visible_summary`, `client_visible_body`, `client_question`, `client_response`
- `internal_notes`, `admin_notes` (admin-only)
- `client_visible`, `pinned`, `display_order`, `due_date`, `resolved_at`, `archived_at`

Enums: `advisory_note_status`, `advisory_note_type`, `advisory_note_priority`,
`advisory_related_source_type`, `advisory_related_gear`.

## RLS
- Admin: full access (`is_admin(auth.uid())`).
- Client SELECT: own customer only AND `client_visible = true` AND `archived_at IS NULL`
  AND `status NOT IN ('draft','archived')`.

## Client-safe RPC
`public.get_client_advisory_clarification_entries(_customer_id uuid)`
- SECURITY DEFINER, REVOKE PUBLIC, GRANT authenticated.
- Verifies admin or `user_owns_customer`.
- Excludes `internal_notes`, `admin_notes`, `status`, `created_by`, `updated_by`, and other admin-only columns.
- Returns pinned-first, then `display_order`, then `updated_at`.

## Relationship to other tools (P54–P59)
- May reference Revenue & Risk Monitor, Priority Action Tracker, Owner Decision
  Dashboard, Scorecard History, Monthly System Review, and Tool Library via
  `related_source_type` / `related_source_id` / `related_tool_key`. No automatic
  cross-tool writes are performed.

## Deferred (do NOT build now unless safe + trivial)
- Real-time messaging / chat
- Email notifications
- Client-created freeform messages
- File upload / attachments
- AI note drafting / summarization / follow-up suggestion
- Automatic conversion of notes into Priority Actions / Owner Decisions / Monthly Review items / Resource Center entries
- Threaded comments, read receipts, notification badges
- Advanced audit timeline

## AI
Deferred. There is a later dedicated AI Assist Wiring Pass.
