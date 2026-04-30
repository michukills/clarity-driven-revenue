# Metrics Importers (P20.11)

`client_business_metrics` can be populated three ways:

1. **Manual** — admin form (`AdminCustomerMetricsPanel`). Source `manual`.
2. **CSV / spreadsheet upload** — admin uploads a one-row metrics CSV
   from a downloadable template. Source `csv_upload`.
3. **QuickBooks snapshot** — admin imports the latest persisted
   `quickbooks_period_summaries` row for the customer. Source
   `quickbooks`.

All three converge on `upsertCustomerMetrics()` and refresh the same
`AdminMetricContextPanel` + `CustomerLeakIntelligencePanel` downstream.
The deterministic industry brain logic is unchanged.

## CSV format

- One header row + one data row. Additional rows are ignored.
- Headers are matched **case-insensitively** after normalization
  (`toLowerCase`, spaces → `_`, non-alphanumerics dropped).
- Exact metric column names always match. Friendly aliases are also
  accepted; see catalog below.
- Unknown headers are reported as **ignored**, never silently saved.
- Blank cells stay null. They never become `0` or `false`.
- Default save behavior preserves existing values when imported cells
  are blank. Admin can opt in to "Clear blank fields" to overwrite
  with `null` instead.

### Value parsing

| Kind    | Accepts                          | Stored as       |
|---------|----------------------------------|-----------------|
| money   | `$12,500`, `12,500`, `12500`     | `12500` (number)|
| pct     | `35`, `35%`, ` 35 % `            | `35` (0..100)   |
| count   | `1,200`, `17`                    | integer         |
| number  | any numeric                      | number          |
| bool    | yes/no, true/false, y/n, 1/0     | boolean         |
| blank   | empty cell                       | `null`          |

Invalid values are rejected with a per-column reason and **not saved**.

## Aliases (selected)

| Alias                          | Canonical field                       |
|--------------------------------|---------------------------------------|
| `weekly_review`                | `has_weekly_review`                   |
| `assigned_owners`              | `has_assigned_owners`                 |
| `owner_bottleneck`             | `owner_is_bottleneck`                 |
| `manual_spreadsheet`           | `uses_manual_spreadsheet`             |
| `source_attribution`           | `source_attribution_visible`          |
| `unpaid_invoices`              | `unpaid_invoice_amount`               |
| `jobs_done`                    | `jobs_completed`                      |
| `jobs_not_invoiced`            | `jobs_completed_not_invoiced`         |
| `job_costing`                  | `has_job_costing`                     |
| `gross_margin`                 | `gross_margin_pct`                    |
| `food_cost`                    | `food_cost_pct`                       |
| `labor_cost`                   | `labor_cost_pct`                      |
| `menu_margin`                  | `menu_margin_visible`                 |
| `vendor_cost_change`           | `vendor_cost_change_pct`              |
| `avg_ticket`                   | `average_ticket`                      |
| `dead_stock`                   | `dead_stock_value`                    |
| `stockouts`                    | `stockout_count`                      |
| `returns`                      | `return_rate_pct`                     |
| `category_margin`              | `has_category_margin`                 |
| `high_sales_low_margin`        | `high_sales_low_margin_count`         |
| `aov`                          | `average_order_value`                 |
| `cannabis_dead_stock`          | `cannabis_dead_stock_value`           |
| `cannabis_stockouts`           | `cannabis_stockout_count`             |
| `cannabis_discount_impact`     | `cannabis_discount_impact_pct`        |
| `cannabis_promotion_impact`    | `cannabis_promotion_impact_pct`       |
| `cannabis_vendor_cost_increase`| `cannabis_vendor_cost_increase_pct`   |
| `cannabis_payment_recon_gap`   | `cannabis_payment_reconciliation_gap` |
| `cannabis_manual_pos`          | `cannabis_uses_manual_pos_workaround` |
| `cannabis_high_sales_low_margin` | `cannabis_high_sales_low_margin_count` |

## Templates

Per-industry CSV templates are generated client-side by
`buildMetricsTemplateCsv()` and downloaded via
`downloadMetricsTemplate()`. Each industry template includes the
shared columns plus its own:

- `shared` — universal operating signals only.
- `trades` — trades / field services.
- `restaurant` — restaurants.
- `retail` — retail.
- `cannabis` — cannabis / MMC (regulated retail / dispensary).

### Cannabis / MMC compliance

The cannabis template uses **regulated retail / inventory / margin**
language only. The following terms must NEVER appear in the cannabis
template, cannabis field labels, or any cannabis import surface:

`patient`, `claim`, `reimbursement`, `appointment`, `provider`,
`diagnosis`, `insurance`, `clinical`, `healthcare`.

Enforced by the `metricsImporterP20_11.test.ts` regression test.

## QuickBooks snapshot importer

Reads from the already-persisted `quickbooks_period_summaries` table
(written by the `qb-sync` edge function). The browser **never sees
QuickBooks tokens or OAuth secrets** — the importer only reads the
summary numbers and maps a small, safe subset.

### Safely mapped fields

| Industry          | Fields populated                                |
|-------------------|-------------------------------------------------|
| trade_field_service | `unpaid_invoice_amount`, `gross_margin_pct`   |
| restaurant        | `gross_margin_pct_restaurant`                   |
| retail            | `gross_margin_pct`                              |
| mmj_cannabis      | `cannabis_gross_margin_pct`                     |
| (all)             | `primary_data_source = "QuickBooks"`, `profit_visible = true` when revenue > 0 |

### Intentionally NOT inferred from QuickBooks

- `stockout_count`, `cannabis_stockout_count`
- `dead_stock_value`, `cannabis_dead_stock_value`
- `menu_margin_visible`, `service_line_visibility`
- `jobs_completed`, `jobs_completed_not_invoiced`
- `cannabis_payment_reconciliation_gap`
- `cannabis_product_margin_visible`, `cannabis_category_margin_visible`
- `cannabis_uses_manual_pos_workaround`
- `cannabis_has_daily_or_weekly_reporting`
- `cannabis_discount_impact_pct`, `cannabis_promotion_impact_pct`

If revenue is missing, readiness becomes `no_revenue` and confidence
`Needs Verification`. Nothing is invented.

### Confidence rules

- ≥ 3 populated fields → `Confirmed`.
- 1–2 populated fields → `Estimated`.
- 0 populated fields or no revenue → `Needs Verification`.

## Security & audit

- Importers mount only on real-customer flow accounts; the internal
  RGS operating account is excluded via `isCustomerFlowAccount()`.
- All writes go through `upsertCustomerMetrics()` which is gated by
  the `Admins manage client_business_metrics` RLS policy. Clients and
  the public cannot import.
- No service-role key, QuickBooks token, or OAuth secret is read in
  the browser. The QB importer reads only summary numbers from a row
  the server has already persisted.
- Successful imports emit `data_import_completed` with a small,
  count-only payload (no raw cells, no tokens). See `portalAudit.ts`
  denylist.

## Remaining TODOs

- Per-day sales aggregation from QuickBooks → `daily_sales`,
  `average_ticket` requires a sales-by-day report we don't yet pull.
- Inventory aging from QuickBooks → `dead_stock_value` /
  `cannabis_dead_stock_value` requires inventory-aging data we don't
  yet pull.
- Vendor purchase history → `vendor_cost_change_pct` /
  `cannabis_vendor_cost_increase_pct` requires vendor history mapping.
- POS / e-commerce snapshot importers (Square, Stripe, Shopify) are
  not yet built; the CSV path covers them today.
- Client-facing import is intentionally not enabled.