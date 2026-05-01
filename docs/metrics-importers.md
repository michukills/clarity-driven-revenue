# Metrics Importers (P20.11)

`client_business_metrics` can be populated three ways:

1. **Manual** — admin form (`AdminCustomerMetricsPanel`). Source `manual`.
2. **CSV / spreadsheet upload** — admin uploads a one-row metrics CSV
   or `.xlsx` workbook from a downloadable template. Source
   `csv_upload` for `.csv`, `file_upload` for `.xlsx` / `.xls`.
3. **QuickBooks snapshot** — admin imports the latest persisted
   `quickbooks_period_summaries` row for the customer. Source
   `quickbooks`.
4. **Square snapshot** *(P20.12 mapper · P20.13 table · P20.15b admin
   UI)* — admin reads the latest persisted `square_period_summaries`
   row for this customer and imports the safely-mapped fields. Source
   `square`.
5. **Stripe snapshot** *(P20.12 mapper · P20.13 table · P20.15b admin
   UI)* — admin reads the latest persisted `stripe_period_summaries`
   row for this customer and imports the safely-mapped fields. Source
   `stripe`.

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

### XLSX support (P20.12)

`.xlsx` and `.xls` files use the same one-header-row + one-data-row
layout as CSV. Behavior is intentionally identical:

- Headers in row 1; the first non-empty visible sheet is used.
- Subsequent rows below the first data row are ignored.
- Blank cells stay null. They never become `0` or `false`.
- Unknown columns are surfaced as **ignored**, never silently saved.
- Invalid values are rejected per-column with a parse reason.
- The same alias catalog applies (e.g., `jobs_done` → `jobs_completed`).
- File size limit: 2 MB.

CSV and XLSX share the same `buildPreview` / `previewToPayload`
pipeline so downstream behavior is guaranteed identical.

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
- `cannabis` — cannabis / MMJ (regulated retail / dispensary).

### Cannabis / MMJ compliance

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
- Client-facing import is intentionally not enabled.
- Backend persistence tables for Square / Stripe period summaries
  (`square_period_summaries`, `stripe_period_summaries`) are not yet
  provisioned. The mappers in `squareSnapshot.ts` and
  `stripeSnapshot.ts` are pure functions ready to consume those rows
  once a backend sync edge function persists them. Tokens and OAuth
  secrets must remain server-side.
- Stripe-derived `payment_failure_rate_pct` and `refund_rate_pct` do
  not yet have schema columns; they are surfaced on
  `StripeSnapshotResult.derivedIndicators` for display only.

## Square snapshot importer (P20.12)

Pure function in `src/lib/customerMetrics/squareSnapshot.ts`. Reads
from a server-persisted `SquarePeriodSummary` shape (no tokens, no
OAuth, no live API calls in the browser).

### Safely mapped fields

| Industry          | Fields populated                                |
|-------------------|-------------------------------------------------|
| (all)             | `primary_data_source = "Square"`                |
| (all)             | `average_ticket` when `transaction_count` and a sales total support it |
| (all)             | `daily_sales` only when `day_count` is provided |
| mmj_cannabis      | `cannabis_discount_impact_pct` only when `discounts_total` and a sales total support it |
| mmj_cannabis      | `cannabis_has_daily_or_weekly_reporting` only when the summary explicitly proves recurring period reporting |

### Intentionally NOT inferred from Square

`inventory_value`, `dead_stock_value`, `stockout_count`,
`vendor_cost_change_pct`, `menu_margin_visible`, `has_category_margin`,
`service_line_visibility`, `jobs_completed`,
`jobs_completed_not_invoiced`, `gross_margin_pct`, `food_cost_pct`,
`labor_cost_pct`, all `cannabis_*` inventory / margin / compliance
fields not listed above (including `cannabis_payment_reconciliation_gap`
and `cannabis_uses_manual_pos_workaround`).

### Confidence rules

- ≥ 2 substantive fields beyond `primary_data_source` → `Confirmed`.
- 1 substantive field → `Estimated`.
- 0 substantive fields or no volume → `Needs Verification`.

## Stripe snapshot importer (P20.12)

Pure function in `src/lib/customerMetrics/stripeSnapshot.ts`. Reads
from a server-persisted `StripePeriodSummary` shape (no tokens, no
OAuth, no live API calls in the browser).

### Safely mapped fields

| Field                                      | Condition                                              |
|--------------------------------------------|--------------------------------------------------------|
| `primary_data_source = "Stripe"`           | Always when summary is present and has any volume.     |
| `average_order_value`                      | Both `successful_payment_count` and a volume present.  |

### Display-only derived indicators

These are computed but **not** written to `client_business_metrics`
today (no schema columns). They appear on
`StripeSnapshotResult.derivedIndicators` only:

- `payment_failure_rate_pct` — when failed and successful counts exist.
- `refund_rate_pct` — when `refunds_total > 0` and `gross_volume > 0`.

### Intentionally NOT inferred from Stripe

`inventory_value`, `dead_stock_value`, `stockout_count`,
`vendor_cost_change_pct`, `menu_margin_visible`, `has_category_margin`,
`service_line_visibility`, `jobs_completed`,
`jobs_completed_not_invoiced`, `gross_margin_pct`,
`gross_margin_pct_restaurant`, `food_cost_pct`, `labor_cost_pct`,
`owner_is_bottleneck`, `has_assigned_owners`, `has_weekly_review`,
`uses_manual_spreadsheet`, all `cannabis_*` inventory / margin /
compliance fields.

### Confidence rules

- ≥ 2 substantive fields beyond `primary_data_source` → `Confirmed`.
- 1 substantive field → `Estimated`.
- 0 substantive fields or no volume → `Needs Verification`.

## Cannabis / MMJ wording guard (extended in P20.12)

The healthcare-language guard now also applies to the JSON output of
the Square and Stripe mappers when the industry is `mmj_cannabis`.
Tests assert that no healthcare term (`patient`, `claim`,
`reimbursement`, `appointment`, `provider`, `diagnosis`, `insurance`,
`clinical`, `healthcare`, `treatment`) appears in the serialized
result. Cannabis remains framed as regulated retail / inventory /
margin / POS operations only.

## P20.13 — Backend Square / Stripe summary tables

Two new server-persisted tables back the Square and Stripe snapshot
importers. They follow the same security posture as
`quickbooks_period_summaries`.

### `square_period_summaries`

| Column | Notes |
|---|---|
| `customer_id` | FK to `customers`, ON DELETE CASCADE. |
| `period_start`, `period_end` | Date range covered. |
| `gross_sales`, `net_sales`, `discounts_total`, `refunds_total`, `tips_total`, `tax_total` | Numeric totals. |
| `transaction_count`, `day_count` | Integers. |
| `has_recurring_period_reporting` | Boolean — only true if the source proves continuous reporting. |
| `source_account_id`, `source_location_id` | Optional Square scoping. |
| `synced_at` | Set by the server on each upsert. |

Uniqueness: `(customer_id, source_account_id, source_location_id, period_start, period_end)`.

### `stripe_period_summaries`

| Column | Notes |
|---|---|
| `customer_id` | FK to `customers`, ON DELETE CASCADE. |
| `period_start`, `period_end` | Date range covered. |
| `gross_volume`, `net_volume`, `fees_total`, `refunds_total`, `disputes_total` | Numeric totals. |
| `successful_payment_count`, `failed_payment_count` | Integers. |
| `source_account_id` | Optional Stripe account scoping. |
| `synced_at` | Set by the server on each upsert. |

Uniqueness: `(customer_id, source_account_id, period_start, period_end)`.

### RLS

- RLS enabled on both tables.
- `Admins manage …` policy: `is_admin(auth.uid())` for `ALL`.
- `Clients view own …` policy: `SELECT` only when
  `user_owns_customer(auth.uid(), customer_id)`.
- No public / anon access. No broad authenticated SELECT.

### Edge functions (scaffold)

`supabase/functions/square-sync` and `supabase/functions/stripe-sync`
are honest scaffolds:

- Admin-only (verified server-side via `user_roles`).
- Use `SUPABASE_SERVICE_ROLE_KEY` server-side only — never in browser.
- `action: "status"` returns `{ configured: boolean }` based on the
  presence of `SQUARE_CLIENT_ID` / `SQUARE_CLIENT_SECRET` (Square) or
  `STRIPE_SECRET_KEY` (Stripe). When not configured, the function
  refuses live work and the UI shows "Not configured" / "No summary".
- `action: "ingest_summary"` accepts a normalized payload from a
  trusted backend caller and upserts into the matching summary table
  using whitelisted fields only. No raw transactions, tokens, or
  webhooks are persisted.
- Does not log raw payloads, tokens, refresh tokens, or OAuth
  responses. Successful responses echo only period bounds + counts.

### Source enum widening

`client_business_metrics.source` accepts two new values:

- `square`
- `stripe`

Used when the Admin Metrics Importer panel saves snapshots derived
from the Square / Stripe mappers.

### Admin importer UI

The QuickBooks-snapshot section in `AdminMetricsImporterPanel` is
joined by parallel **Square snapshot** and **Stripe snapshot**
sections. Each section:

- Reads the latest persisted summary row for this customer (RLS-safe).
- Shows one of: "Checking readiness…", "No summary on file",
  "Couldn't read … summary", or a populated readiness card.
- Lists which fields would be saved and which fields are intentionally
  not derived.
- For Stripe, surfaces the display-only derived indicators
  (`payment_failure_rate_pct`, `refund_rate_pct`) under an
  **admin-only** section labeled "not yet stored". They are NEVER
  written to `client_business_metrics`.
- Audit logging is count-only:
  `{ source, import_type, industry, field_count, confidence, readiness }`.

### Manual setup still required

- Live Square / Stripe ingestion is **not** wired yet. Either:
  - Add a server-side worker (or admin paste tool) that POSTs a
    normalized summary to `square-sync` / `stripe-sync` with
    `action: "ingest_summary"`, or
  - Add full provider OAuth (env vars + token storage) — at which
    point the scaffolds can be extended to fetch reports directly,
    in the same shape as `qb-sync`.
- Until then, the importer transparently shows "No summary on file".

## P20.14 / P20.15 — Dutchie cannabis/MMJ connector

Dutchie is a **cannabis / MMJ retail and POS** connector. It is treated
strictly as regulated retail / POS / inventory / promotions data. The
language guard for this connector is enforced by
`metricsImporterP20_14.test.ts` and `dutchieImporterPanelP20_15.test.tsx`,
which assert that no medical / care-delivery wording appears in the
mapper, edge function, panel, or this section.

### `dutchie_period_summaries`

Server-persisted summary table (RLS: `is_admin` for `ALL`, owner
`SELECT`). Columns include: `customer_id`, `period_start`,
`period_end`, `gross_sales`, `net_sales`, `discounts_total`,
`promotions_total`, `transaction_count`, `day_count`,
`average_ticket`, `product_sales_total`, `category_sales_total`,
`inventory_value`, `dead_stock_value`, `stockout_count`,
`inventory_turnover`, `shrinkage_pct`,
`payment_reconciliation_gap`, `has_recurring_period_reporting`,
`product_margin_visible`, `category_margin_visible`, `synced_at`.

### Mapper

`mapDutchieSummaryToMetrics(summary, industry)` in
`src/lib/customerMetrics/dutchieSnapshot.ts`. Pure function. No
network, no tokens, no secrets in the browser.

Source on save: `dutchie`.

### Safely populated fields (cannabis only)

- `primary_data_source = "Dutchie"`
- `average_ticket` (explicit, or derived from txn count + sales)
- `daily_sales` (only when `day_count` is provided)
- `cannabis_discount_impact_pct`
- `cannabis_promotion_impact_pct`
- `cannabis_inventory_value`
- `cannabis_dead_stock_value`
- `cannabis_stockout_count`
- `cannabis_inventory_turnover`
- `cannabis_shrinkage_pct`
- `cannabis_payment_reconciliation_gap`
- `cannabis_has_daily_or_weekly_reporting` (only when summary explicitly proves recurring reporting)
- `cannabis_product_margin_visible` (only when summary explicitly proves it)
- `cannabis_category_margin_visible` (only when summary explicitly proves it)

### Intentionally NOT inferred from Dutchie

- `cannabis_gross_margin_pct`
- `cannabis_vendor_cost_increase_pct`
- `cannabis_uses_manual_pos_workaround`
- compliance status (never inferred)
- owner independence / staff process quality
- generic accounting fields (`gross_margin_pct`, `food_cost_pct`, `labor_cost_pct`, `vendor_cost_change_pct`)
- non-cannabis operational fields (`jobs_completed`, `jobs_completed_not_invoiced`, `service_line_visibility`, `menu_margin_visible`, `has_category_margin`)

### Readiness states

- `no_summary` — nothing on file. UI shows "No Dutchie summary on file".
- `industry_mismatch` — customer is not cannabis/MMJ. UI shows "Not applicable for this customer" and import is disabled.
- `insufficient_volume` — summary has no transactions and no sales. Import disabled.
- `supported` — at least one substantive field can be safely written.

### Confidence rules

- ≥ 2 substantive fields beyond `primary_data_source` → `Confirmed`.
- 1 substantive field → `Estimated`.
- 0 substantive fields → `Needs Verification`.

### Admin UI (P20.15)

`AdminMetricsImporterPanel` includes a **Dutchie snapshot** section
next to QuickBooks / Square / Stripe.

- Reads only the latest persisted Dutchie summary row for this customer (RLS-safe).
- Shows one of: industry-mismatch alert (non-cannabis), "Checking Dutchie readiness…", "No Dutchie summary on file", error alert, or a populated readiness card.
- Lists exactly the fields that will be saved and the fields intentionally not derived.
- Import button is disabled unless the customer is cannabis/MMJ, a summary exists, readiness is `supported`, and at least one substantive field exists.
- On save, calls `upsertCustomerMetrics()` with `source: "dutchie"`. Existing metrics not present in the payload are preserved (no nulls written).
- Audit logging is **count-only**:
  `{ source: "metrics_dutchie", import_type: "client_business_metrics", industry, field_count, confidence, readiness }`.
- No raw Dutchie summary rows, no account IDs beyond what's needed, no tokens/secrets, and no payloads are written to the audit log.

### Manual setup still required

Live Dutchie ingestion requires Dutchie API credentials configured
server-side and a backend worker (or admin paste tool) that POSTs a
normalized summary into `dutchie_period_summaries` (or via the
`dutchie-sync` edge function). Until then, the importer transparently
shows "No Dutchie summary on file".