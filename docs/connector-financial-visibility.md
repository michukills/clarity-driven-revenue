# Connector UI / Financial Visibility (P62)

_Status: P62 — added as a client-safe visibility layer on top of (not replacing)
the existing `customer_integrations` OAuth/sync table._

## Purpose

Give RGS a controlled, admin-curated visibility surface that organizes which
financial data sources are connected or documented for a client, what state
those sources are in, and what limitations apply. Helps RGS and the owner see
what information is available, what may be missing, and what may need review.

## Boundaries

- NOT accounting, tax, payroll, legal, or compliance review.
- NOT bookkeeping or financial forecasting.
- NOT a guarantee that connected data is complete, perfect, real-time, or
  accurate.
- NOT a replacement for owner judgment or qualified professionals.
- Tokens, refresh tokens, API keys, OAuth secrets are NEVER shown in the
  browser. They live only in backend storage (`customer_integrations.metadata`)
  and are never exposed by the client RPC or admin UI.

## Routes

- Client: `/portal/tools/financial-visibility` — `<ClientToolGuard toolKey="connector_financial_visibility">`
- Admin: `/admin/customers/:customerId/financial-visibility` — `<ProtectedRoute requireRole="admin">`

## tool_catalog classification

| field | value |
|---|---|
| `tool_key` | `connector_financial_visibility` |
| `service_lane` | `rgs_control_system` |
| `customer_journey_phase` | `rcs_ongoing_visibility` |
| `industry_behavior` | `industry_aware_outputs` (cannabis/MMJ cash-heavy contexts matter) |
| `tool_type` | `reporting` |
| `default_visibility` | `client_available` |
| `requires_active_client` | `true` |
| `contains_internal_notes` | `true` |
| `can_be_client_visible` | `true` |

## Schema — `public.financial_visibility_sources`

Per-customer visibility records. Domain columns include:

- `customer_id`, `display_name`
- `provider` (`quickbooks`, `xero`, `stripe`, `bank_account`, `point_of_sale`,
  `spreadsheet`, `manual_upload`, `cash_log`, `other`)
- `source_type` (accounting, payment_processor, bank, point_of_sale,
  revenue_log, expense_log, manual_financial_summary, other)
- `status` (not_connected, connected, needs_reconnect, sync_paused, sync_error,
  disconnected, manual_source, unknown)
- `health` (healthy, needs_attention, stale, incomplete, error, unknown)
- `service_lane`, `customer_journey_phase`, `industry_behavior`
- `related_tool_key`, `related_source_type`, `related_source_id`
- `last_sync_at`, `last_checked_at`
- Client-visible: `client_visible_summary`, `visibility_limitations`,
  `revenue_summary`, `expense_summary`, `cash_visibility_summary`,
  `margin_visibility_summary`, `invoice_payment_summary`,
  `data_quality_summary`, `industry_notes`
- Admin-only: `internal_notes`, `admin_notes` (never returned by client RPC)
- `tags`, `client_visible`, `pinned`, `display_order`, `archived_at`

The table holds no tokens or secrets at all. CHECK constraints align lane,
phase, and industry vocabularies with P54–P61.

## RLS

- Admin policy: full management via `is_admin(auth.uid())`.
- Client SELECT: `client_visible = true AND archived_at IS NULL AND user_owns_customer(auth.uid(), customer_id)`.

## Client-safe RPC

`public.get_client_financial_visibility_sources(_customer_id uuid)`:

- `SECURITY DEFINER`, restricted to admins or owners of the customer.
- Filters by `client_visible = true` and `archived_at IS NULL`.
- Returned columns explicitly exclude `internal_notes`, `admin_notes`,
  `created_by`, `updated_by`, and any token/secret/api_key field (none exist
  on this table by design — the exclusion is enforced contractually).
- Ordered by `pinned DESC`, `display_order`, `health`, `status`, `updated_at`.

## Relationship to existing structures

- **`customer_integrations`** (pre-existing): backend-only OAuth / token / sync
  state for QuickBooks (and any future live providers). NOT touched by P62.
  Tokens and provider secrets stay there and are never exposed.
- **Revenue & Risk Monitor (P54)**, **Priority Action Tracker (P55)**,
  **Owner Decision Dashboard (P56)**, **Scorecard History (P57)**,
  **Monthly System Review (P58)**, **Advisory Notes (P60)**: visibility records
  may reference these via `related_tool_key` / `related_source_type` /
  `related_source_id`. Auto-conversion workflows are deferred.

## Stage-based access

Access is gated by `ClientToolGuard` against `tool_catalog`. Stage/lane
filtering beyond `client_visible` + tenant scope is deferred to the existing
`private.get_effective_tools_for_customer` access pattern. Records are
classified with `service_lane` / `customer_journey_phase` / `industry_behavior`
metadata so future stage filtering can use those fields without schema changes.

## Industry / cannabis (MMJ/MMC) caveat

For cannabis, dispensary, and other cash-heavy or payment-limited operations,
treat any single connected payment processor or accounting source as a
**partial visibility source**. Use `visibility_limitations` to call out cash
sales, vendor cash flow, and any compliance-sensitive handling. Do not imply
that one connector captures the full revenue picture. Compliance review stays
with qualified counsel.

## Deferred (not built in P62)

- New OAuth provider implementations / token refresh.
- Live pulls from QuickBooks, Xero, Stripe, Plaid, or bank aggregators.
- Live financial calculations from raw transaction data.
- AI financial review, financial forecasting, business valuation,
  tax / accounting recommendations.
- Auto-create Revenue & Risk Monitor / Priority Action / Owner Decision items.
- Notifications for broken connectors.
- Public connector demo with real credentials.
- File upload / attachments.

## AI rule

AI assist is deferred for P62. When added later it must be backend / edge-
function only, admin-reviewed, never client-visible without explicit admin
approval, and clearly labeled as "AI draft" / "AI assist" / "review assist".
It must never expose tokens, secrets, or admin-only notes, and must not
produce financial forecasts or valuations.
