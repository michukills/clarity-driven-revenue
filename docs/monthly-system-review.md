# Monthly System Review (P58)

The Monthly System Review is an RGS Control System™ visibility / reporting tool. It lets RGS prepare a structured monthly review for an active RGS Control System™ client and share a calm, plain-language summary of:

- what changed this month
- signals worth reviewing (e.g. Revenue & Risk Monitor items)
- score and trend movement (e.g. Scorecard History snapshots)
- active priority actions (Priority Action Tracker)
- owner decisions needing attention (Owner Decision Dashboard)
- what RGS / admin reviewed
- what to review next month

## Boundaries

- This is a bounded review and visibility tool.
- It is NOT unlimited advisory, emergency support, accounting / legal / tax /
  compliance / payroll / HR review, financial forecast, business valuation,
  or guarantee of improvement.
- Internal notes never leave the admin view.
- Clients only see entries that are explicitly marked client-visible AND
  whose status is `shared_with_client`.

## Tool catalog row

- `tool_key`: `monthly_system_review`
- `service_lane`: `rgs_control_system`
- `customer_journey_phase`: `rcs_ongoing_visibility`
- `industry_behavior`: `all_industries_shared`
- `requires_active_client`: `true`
- `tool_type`: `reporting`
- `default_visibility`: `client_available`
- `route_path`: `/portal/tools/monthly-system-review`

## Schema

Table: `public.monthly_system_review_entries`

Enums:
- `msr_review_status` — draft, in_review, ready_for_client, shared_with_client, archived
- `msr_overall_signal` — improving, holding_steady, needs_attention, slipping, unknown
- `msr_section_kind` — what_changed, signals_to_review, score_trend, priority_actions, owner_decisions, rgs_reviewed, next_review, other

Constraints:
- `msr_period_order` — `review_period_end >= review_period_start` when both present.

## RLS

- Admins: full management access.
- Clients: SELECT only when `user_owns_customer`, `client_visible = true`,
  `archived_at IS NULL`, and `status = 'shared_with_client'`.

## Client-safe RPC

`public.get_client_monthly_system_review_entries(_customer_id uuid)`
returns only client-safe fields. It explicitly excludes:
- `internal_notes`
- `admin_summary`
- `admin_review_required`
- `status`
- audit fields (`created_by`, `updated_by`)

## Routes

- Client: `/portal/tools/monthly-system-review`, gated by
  `<ClientToolGuard toolKey="monthly_system_review">`.
- Admin: `/admin/customers/:customerId/monthly-system-review`, protected by
  `<ProtectedRoute requireRole="admin">`.

## Files

- Migration: `supabase/migrations/20260504122115_*_p58_monthly_system_review.sql`
- Lib: `src/lib/monthlySystemReview.ts`
- Client page: `src/pages/portal/tools/MonthlySystemReview.tsx`
- Admin page: `src/pages/admin/MonthlySystemReviewAdmin.tsx`
- Tests: `src/lib/__tests__/monthlySystemReviewContract.test.ts`
