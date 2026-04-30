# Structured Customer Metrics (P20.8)

## Purpose

The RGS intelligence pipeline (`CustomerLeakIntelligencePanel` →
`analyzeLeaks()` → industry brains) needs structured numeric inputs to
produce strong, deterministic findings (food cost %, dead stock value,
job costing, cannabis discount impact, etc.). `client_business_snapshots`
is mostly free-text, so we add a separate optional store:
`public.client_business_metrics`.

No AI. No prose extraction. Admins enter values directly (or future
importers can write them). Empty values stay null — never coerced to 0.

## Storage

Table: `public.client_business_metrics`

- One row per customer is the working "latest" row (multiple rows allowed
  for history; the panel reads the most recent).
- `source` ∈ manual / csv_upload / file_upload / quickbooks / pos_export /
  admin_assumption / client_input.
- `confidence` ∈ Confirmed / Estimated / Needs Verification.
- Percentages are stored **0..100**. Mappers divide by 100 when feeding
  brains that expect 0..1 decimals (food/labor/margin/return/etc.).
- Counts ≥ 0; money ≥ 0. CHECK constraints enforce ranges.

## RLS

Admin-only. `Admins manage client_business_metrics` policy gates all
access. Clients and the public have no read or write access. The internal
RGS operating account is excluded at the UI layer
(`isCustomerFlowAccount`).

## Service layer

`src/lib/customerMetrics/service.ts`:

- `getLatestCustomerMetrics(customerId)`
- `listCustomerMetrics(customerId)`
- `upsertCustomerMetrics(customerId, payload)` — updates the latest row
  if present, otherwise inserts.

## Intelligence wiring

`industryDataFromMetrics(metrics, industry)` in
`src/lib/intelligence/customerContext.ts` deterministically maps row →
`IndustryDataInput`. `CustomerLeakIntelligencePanel` now merges:

1. `industryDataFromScorecard(latestScorecardRun)`
2. `industryDataFromSnapshot(latestSnapshot, industry)`
3. `industryDataFromMetrics(latestMetrics, industry)` (overrides weaker
   free-text signals when a structured value is set)

Null fields are skipped, not mapped.

## Industry coverage

- **Trades / Services** — estimates_sent, estimates_unsent,
  follow_up_backlog, jobs_completed, jobs_completed_not_invoiced,
  gross_margin_pct, has_job_costing, service_line_visibility,
  unpaid_invoice_amount.
- **Restaurants** — daily_sales, food_cost_pct, labor_cost_pct,
  gross_margin_pct_restaurant, tracks_waste, has_daily_reporting,
  menu_margin_visible, vendor_cost_change_pct, average_ticket.
- **Retail** — dead_stock_value, inventory_turnover, stockout_count,
  return_rate_pct, has_category_margin, high_sales_low_margin_count,
  inventory_value, average_order_value.
- **Cannabis / MMC (regulated retail / dispensary — NOT healthcare)** —
  cannabis_gross_margin_pct, cannabis_product_margin_visible,
  cannabis_category_margin_visible, cannabis_dead_stock_value,
  cannabis_stockout_count, cannabis_inventory_turnover,
  cannabis_shrinkage_pct, cannabis_discount_impact_pct,
  cannabis_promotion_impact_pct, cannabis_vendor_cost_increase_pct,
  cannabis_payment_reconciliation_gap,
  cannabis_has_daily_or_weekly_reporting,
  cannabis_uses_manual_pos_workaround,
  cannabis_high_sales_low_margin_count, cannabis_inventory_value.
- **Shared (universal)** — has_weekly_review, has_assigned_owners,
  owner_is_bottleneck, uses_manual_spreadsheet, profit_visible,
  source_attribution_visible, review_cadence, primary_data_source.

### Cannabis / MMC compliance

Cannabis/MMC means **cannabis retail / inventory / margin / dispensary
operations**. There are no patient, claim, reimbursement, appointment,
provider, diagnosis, insurance, or clinical fields on this table or in
the cannabis brain output. A regression test
(`customerMetricsP20_8.test.ts`) asserts those terms never appear.

## Admin UI

`AdminCustomerMetricsPanel` is mounted on the admin Customer Detail →
Diagnostic tab, immediately above `CustomerLeakIntelligencePanel`. It
shows shared fields plus the subset relevant to the customer's industry,
plus `source` and `confidence`. Saving refreshes the customer load so
the intelligence panel re-evaluates with the new metrics.

## Remaining TODOs

- `unpaid_invoice_amount`, `vendor_cost_change_pct`,
  `high_sales_low_margin_count`, `cannabis_high_sales_low_margin_count`,
  and a few `service_line_visibility` / `menu_margin_visible` flags do
  **not** yet have brain consumers in `IndustryDataInput`. They are
  stored and editable today, and will be wired in when the corresponding
  brain logic is added.
- CSV / QuickBooks / POS auto-population is a future slice.
- Client-visible read access (e.g. for a "your operating profile" view)
  is intentionally not enabled yet.