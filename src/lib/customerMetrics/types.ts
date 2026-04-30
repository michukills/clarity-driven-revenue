// P20.8 — Structured customer business metrics types.
//
// Mirrors `public.client_business_metrics`. Stored in DB; mapped to
// `IndustryDataInput` for the deterministic intelligence pipeline.
// Percentages are stored 0..100 in the DB; mappers convert to 0..1
// decimals where the brain expects decimals.

export type CustomerMetricsSource =
  | "manual"
  | "csv_upload"
  | "file_upload"
  | "quickbooks"
  | "pos_export"
  | "admin_assumption"
  | "client_input";

export type CustomerMetricsConfidence =
  | "Confirmed"
  | "Estimated"
  | "Needs Verification";

export interface CustomerBusinessMetrics {
  id: string;
  customer_id: string;
  industry: string;
  metric_period_start: string | null;
  metric_period_end: string | null;
  source: CustomerMetricsSource;
  confidence: CustomerMetricsConfidence;

  // Shared
  has_weekly_review: boolean | null;
  has_assigned_owners: boolean | null;
  owner_is_bottleneck: boolean | null;
  uses_manual_spreadsheet: boolean | null;
  profit_visible: boolean | null;
  source_attribution_visible: boolean | null;
  review_cadence: string | null;
  primary_data_source: string | null;

  // Trades / Services
  estimates_sent: number | null;
  estimates_unsent: number | null;
  follow_up_backlog: number | null;
  jobs_completed: number | null;
  jobs_completed_not_invoiced: number | null;
  gross_margin_pct: number | null;
  has_job_costing: boolean | null;
  service_line_visibility: boolean | null;
  unpaid_invoice_amount: number | null;

  // Restaurant
  daily_sales: number | null;
  food_cost_pct: number | null;
  labor_cost_pct: number | null;
  gross_margin_pct_restaurant: number | null;
  tracks_waste: boolean | null;
  has_daily_reporting: boolean | null;
  menu_margin_visible: boolean | null;
  vendor_cost_change_pct: number | null;
  average_ticket: number | null;

  // Retail
  dead_stock_value: number | null;
  inventory_turnover: number | null;
  stockout_count: number | null;
  return_rate_pct: number | null;
  has_category_margin: boolean | null;
  high_sales_low_margin_count: number | null;
  inventory_value: number | null;
  average_order_value: number | null;

  // Cannabis / MMC (regulated retail — NOT healthcare)
  cannabis_gross_margin_pct: number | null;
  cannabis_product_margin_visible: boolean | null;
  cannabis_category_margin_visible: boolean | null;
  cannabis_dead_stock_value: number | null;
  cannabis_stockout_count: number | null;
  cannabis_inventory_turnover: number | null;
  cannabis_shrinkage_pct: number | null;
  cannabis_discount_impact_pct: number | null;
  cannabis_promotion_impact_pct: number | null;
  cannabis_vendor_cost_increase_pct: number | null;
  cannabis_payment_reconciliation_gap: boolean | null;
  cannabis_has_daily_or_weekly_reporting: boolean | null;
  cannabis_uses_manual_pos_workaround: boolean | null;
  cannabis_high_sales_low_margin_count: number | null;
  cannabis_inventory_value: number | null;

  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export type CustomerBusinessMetricsUpsert = Partial<
  Omit<CustomerBusinessMetrics, "id" | "created_at" | "updated_at">
> & {
  customer_id: string;
  industry: string;
  source?: CustomerMetricsSource;
  confidence?: CustomerMetricsConfidence;
};