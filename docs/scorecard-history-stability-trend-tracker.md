# Scorecard History / Stability Trend Tracker (P57)

## Classification
- **tool_key**: `scorecard_history_tracker`
- **service_lane**: `rgs_control_system`
- **customer_journey_phase**: `rcs_ongoing_visibility`
- **industry_behavior**: `all_industries_shared`
- **tool_type**: `tracking`
- **requires_active_client**: true
- **can_be_client_visible**: true
- **contains_internal_notes**: true
- **lane_sort_order**: 45 (after `owner_decision_dashboard`)
- **phase_sort_order**: 40 (after `owner_decision_dashboard`)

## Access rules
- Client route `/portal/tools/scorecard-history` is wrapped in `ProtectedRoute` and `ClientToolGuard toolKey="scorecard_history_tracker"`. Effective access is determined by `private.get_effective_tools_for_customer` (entitlement, stage, RCS lane).
- Admin route `/admin/customers/:customerId/scorecard-history` is `requireRole="admin"`.
- RLS:
  - Admins manage every row.
  - Clients can `SELECT` only rows for their own `customer_id` where `client_visible = true` and `archived_at IS NULL`.
- The client-safe RPC `public.get_client_scorecard_history_entries(_customer_id)` excludes `internal_notes`, `admin_summary`, `admin_review_required`, and `source_id`. It enforces `is_admin OR user_owns_customer`.

## Data model
Table `public.scorecard_history_entries`:
- title, source_type (`shte_source_type`), source_id, source_label
- total_score (0–1000), stability_band (`shte_stability_band`)
- five gear scores (0–200 each): demand_generation, revenue_conversion, operational_efficiency, financial_visibility, owner_independence
- prior_total_score, score_change, trend_direction (`shte_trend_direction`)
- client_visible_summary, admin_summary, internal_notes
- scored_at, next_review_date
- client_visible (default false), admin_review_required (default true)
- archived_at (soft delete)
- standard `created_by`, `updated_by`, `created_at`, `updated_at`

Score ranges enforced via CHECK constraints. `score_change` is unconstrained (can be negative).

## Source types
`public_scorecard`, `paid_diagnostic`, `admin_review`, `monthly_review`, `manual_import`, `rgs_control_system_review`, `other`.

## What this tracker does
- Stores reviewed score snapshots over time per customer.
- Surfaces the latest reviewed snapshot, prior score, score change, trend direction, and gear-level breakdown when populated.
- Lets admins curate a client-safe summary per snapshot and toggle client visibility.

## What it does not do
- Does not change deterministic public scorecard scoring logic (`scorecard_runs` is untouched).
- Does not guarantee improvement, results, ROI, stability, or revenue.
- Is not a business valuation, financial forecast, accounting/legal/tax/compliance/payroll/HR review, or done-for-you operating service.
- Does not replace owner judgment.

## Relationship to existing tools
- Sources can reference public scorecard runs, paid diagnostic reports, monthly reviews (P58), or manual imports.
- The Owner Decision Dashboard (P56) and Priority Action Tracker (P55) may, in future passes, summarize trend context from this tracker.
- Existing `customer_stability_scores` and `scorecard_runs` tables remain unchanged. This new table is the durable historical surface that captures gear-level breakdowns and client-safe summaries P56-style RPCs require.

## AI assist
Deferred to the later AI Assist Wiring Pass. Score change/trend direction can be entered manually by admins for now.

## Testing checklist
- `src/lib/__tests__/scorecardHistoryTrackerContract.test.ts` covers tool_catalog classification, route gating, RLS, RPC field exclusion, score range validation, gear coverage, banned-language scrub, and docs presence.
- `roleGatingRegression.test.ts` includes `/portal/tools/scorecard-history` in the must-guard list.

## Deferred items
- AI-assisted summary generation.
- Cross-tool automation (auto-creating Owner Decision Dashboard entries when score declines).
- Charts: deferred unless an existing chart library is already in use; current UI uses cards/tables only to avoid new dependencies.