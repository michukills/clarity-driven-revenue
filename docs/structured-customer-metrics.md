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

- CSV / QuickBooks / POS auto-population is a future slice.
- Client-visible read access (e.g. for a "your operating profile" view)
  is intentionally not enabled yet.

## P20.9 — Brain consumption of remaining structured metrics

These fields are now consumed by the deterministic industry brains:

| Field | Brain | Threshold | Finding |
|---|---|---|---|
| `unpaid_invoice_amount` | trades | `> 0` (high if `>= 10000`) | `unpaid_invoice_visibility_gap` (impact = amount) |
| `service_line_visibility` | trades | `false` | `service_line_visibility_gap` |
| `menu_margin_visible` | restaurant | `false` | `menu_margin_visibility_gap` |
| `vendor_cost_change_pct` | restaurant | `>= 5%` (high if `>= 10%`) | `vendor_cost_change_not_reviewed` |
| `high_sales_low_margin_count` | retail | `> 0` | `high_sales_low_margin_products` |
| `dead_stock_value` / `inventory_value` | retail | ratio `>= 15%` (high `>= 30%`) | `dead_inventory_cash_tie_up` |
| `cannabis_high_sales_low_margin_count` | cannabis | `> 0` | `cannabis_high_sales_low_margin_products` |
| `cannabis_dead_stock_value` / `cannabis_inventory_value` | cannabis | ratio `>= 15%` (high `>= 30%`) | `cannabis_dead_stock_cash_tie_up` |
| `cannabis_vendor_cost_increase_pct` + `cannabis_discount_impact_pct` or `cannabis_promotion_impact_pct` | cannabis | vendor `>= 5%` AND discount or promo `>= 10%` | `cannabis_vendor_discount_margin_squeeze` |

### Context-only fields (not yet a finding)

These map into `IndustryDataInput` and are available to brains/UI but do
not currently produce a leak on their own:

- `daily_sales`, `average_ticket` (restaurant)
- `average_order_value` (retail)

### Cannabis/MMC compliance (re-affirmed)

All P20.9 cannabis logic is regulated retail / inventory / margin only.
No healthcare/patient/claim/reimbursement/appointment/provider/clinical/
insurance/diagnosis terms appear in any field name, leak `type`,
`message`, or `recommended_fix`. A test in
`customerMetricsP20_9.test.ts` enforces this on the cannabis brain
output.

## P20.10 — Admin display: Metric Context + impact / source clarity

Display-only slice. Does NOT alter scoring, brains, thresholds, scorecard
rubric, security model, or AI logic.

### Metric Context panel

`AdminMetricContextPanel` is mounted on the admin Customer Detail →
Diagnostic tab, immediately below `AdminCustomerMetricsPanel` and above
`CustomerLeakIntelligencePanel`. It reads the latest
`client_business_metrics` row and renders only the metrics that have
values, grouped by Shared and the customer's industry.

- Money renders as dollars (`$7,500`).
- Percent renders as a human percent (`32.5%`).
- Counts render as integers.
- Booleans render as `Yes` / `No`. Null/blank renders as
  `Needs Verification`.
- Each row carries a small badge: `Used in findings` (green) or
  `Context` (blue).
- Derived rows: when `inventory_value` and `dead_stock_value` are both
  set, a "Dead stock ratio" row is shown. Same for cannabis
  (`cannabis_inventory_value` + `cannabis_dead_stock_value`). These are
  display-only and do not change priority scoring.
- Refuses to mount on the internal RGS / admin operating account.

### Context-only fields

These fields render with the `Context` badge and do not produce findings
on their own:

- restaurant: `daily_sales`, `average_ticket`
- retail: `average_order_value`

### Estimated impact display

`AdminLeakIntelligencePanel` Top-3 cards now show a short hint next to
the dollar impact when the impact is traceable to a structured metric:

- `unpaid_invoice_visibility_gap` → "from unpaid invoice amount"
- `dead_inventory_cash_tie_up` → "from dead stock value"
- `cannabis_dead_stock_cash_tie_up` → "from cannabis dead stock value"

No new impact is invented — the dollar value is whatever the leak
already carried.

### Source clarity

`Leak.source` enum values are unchanged. The admin renderer applies a
display helper that converts e.g. `manual` → `Structured Metrics` (when
the leak `type` matches a known structured-metric finding) or
`Manual / Brain` otherwise. Other sources render as `Estimate Workflow`,
`Invoice Workflow`, `Scorecard`, `Connector`, `Uploads`. The client view
still hides admin scoring internals.

### Cannabis / MMC display-language guard

The Metric Context panel's cannabis labels are strictly cannabis retail
/ inventory / margin / dispensary. The new test
`metricContextPanelP20_10.test.tsx` asserts no
patient/claim/reimbursement/appointment/provider/diagnosis/clinical/
insurance/healthcare wording appears in either the Metric Context panel
or the admin intelligence panel for cannabis customers.