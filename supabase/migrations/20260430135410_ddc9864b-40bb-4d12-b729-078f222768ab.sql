-- P20.8 — Structured customer business metrics for the RGS intelligence pipeline.
-- Admin-only. Optional. Stored separately from free-text client_business_snapshots.

CREATE TABLE IF NOT EXISTS public.client_business_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  industry text NOT NULL,
  metric_period_start date,
  metric_period_end date,
  source text NOT NULL DEFAULT 'manual',
  confidence text NOT NULL DEFAULT 'Needs Verification',

  -- Shared / universal
  has_weekly_review boolean,
  has_assigned_owners boolean,
  owner_is_bottleneck boolean,
  uses_manual_spreadsheet boolean,
  profit_visible boolean,
  source_attribution_visible boolean,
  review_cadence text,
  primary_data_source text,

  -- Trades / Services
  estimates_sent integer,
  estimates_unsent integer,
  follow_up_backlog integer,
  jobs_completed integer,
  jobs_completed_not_invoiced integer,
  gross_margin_pct numeric,
  has_job_costing boolean,
  service_line_visibility boolean,
  unpaid_invoice_amount numeric,

  -- Restaurants
  daily_sales numeric,
  food_cost_pct numeric,
  labor_cost_pct numeric,
  gross_margin_pct_restaurant numeric,
  tracks_waste boolean,
  has_daily_reporting boolean,
  menu_margin_visible boolean,
  vendor_cost_change_pct numeric,
  average_ticket numeric,

  -- Retail
  dead_stock_value numeric,
  inventory_turnover numeric,
  stockout_count integer,
  return_rate_pct numeric,
  has_category_margin boolean,
  high_sales_low_margin_count integer,
  inventory_value numeric,
  average_order_value numeric,

  -- Cannabis / MMC (regulated retail / dispensary — NOT healthcare)
  cannabis_gross_margin_pct numeric,
  cannabis_product_margin_visible boolean,
  cannabis_category_margin_visible boolean,
  cannabis_dead_stock_value numeric,
  cannabis_stockout_count integer,
  cannabis_inventory_turnover numeric,
  cannabis_shrinkage_pct numeric,
  cannabis_discount_impact_pct numeric,
  cannabis_promotion_impact_pct numeric,
  cannabis_vendor_cost_increase_pct numeric,
  cannabis_payment_reconciliation_gap boolean,
  cannabis_has_daily_or_weekly_reporting boolean,
  cannabis_uses_manual_pos_workaround boolean,
  cannabis_high_sales_low_margin_count integer,
  cannabis_inventory_value numeric,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,

  CONSTRAINT cbm_source_chk CHECK (source IN (
    'manual','csv_upload','file_upload','quickbooks','pos_export','admin_assumption','client_input'
  )),
  CONSTRAINT cbm_confidence_chk CHECK (confidence IN (
    'Confirmed','Estimated','Needs Verification'
  )),

  -- Percentages stored 0..100
  CONSTRAINT cbm_pct_gross CHECK (gross_margin_pct IS NULL OR (gross_margin_pct >= 0 AND gross_margin_pct <= 100)),
  CONSTRAINT cbm_pct_food CHECK (food_cost_pct IS NULL OR (food_cost_pct >= 0 AND food_cost_pct <= 100)),
  CONSTRAINT cbm_pct_labor CHECK (labor_cost_pct IS NULL OR (labor_cost_pct >= 0 AND labor_cost_pct <= 100)),
  CONSTRAINT cbm_pct_gross_rest CHECK (gross_margin_pct_restaurant IS NULL OR (gross_margin_pct_restaurant >= 0 AND gross_margin_pct_restaurant <= 100)),
  CONSTRAINT cbm_pct_vendor CHECK (vendor_cost_change_pct IS NULL OR (vendor_cost_change_pct >= -100 AND vendor_cost_change_pct <= 100)),
  CONSTRAINT cbm_pct_return CHECK (return_rate_pct IS NULL OR (return_rate_pct >= 0 AND return_rate_pct <= 100)),
  CONSTRAINT cbm_pct_cn_gross CHECK (cannabis_gross_margin_pct IS NULL OR (cannabis_gross_margin_pct >= 0 AND cannabis_gross_margin_pct <= 100)),
  CONSTRAINT cbm_pct_cn_shrink CHECK (cannabis_shrinkage_pct IS NULL OR (cannabis_shrinkage_pct >= 0 AND cannabis_shrinkage_pct <= 100)),
  CONSTRAINT cbm_pct_cn_disc CHECK (cannabis_discount_impact_pct IS NULL OR (cannabis_discount_impact_pct >= 0 AND cannabis_discount_impact_pct <= 100)),
  CONSTRAINT cbm_pct_cn_promo CHECK (cannabis_promotion_impact_pct IS NULL OR (cannabis_promotion_impact_pct >= 0 AND cannabis_promotion_impact_pct <= 100)),
  CONSTRAINT cbm_pct_cn_vendor CHECK (cannabis_vendor_cost_increase_pct IS NULL OR (cannabis_vendor_cost_increase_pct >= -100 AND cannabis_vendor_cost_increase_pct <= 100)),

  -- Counts >= 0
  CONSTRAINT cbm_count_est_sent CHECK (estimates_sent IS NULL OR estimates_sent >= 0),
  CONSTRAINT cbm_count_est_unsent CHECK (estimates_unsent IS NULL OR estimates_unsent >= 0),
  CONSTRAINT cbm_count_follow CHECK (follow_up_backlog IS NULL OR follow_up_backlog >= 0),
  CONSTRAINT cbm_count_jobs_done CHECK (jobs_completed IS NULL OR jobs_completed >= 0),
  CONSTRAINT cbm_count_jobs_uninv CHECK (jobs_completed_not_invoiced IS NULL OR jobs_completed_not_invoiced >= 0),
  CONSTRAINT cbm_count_stockout CHECK (stockout_count IS NULL OR stockout_count >= 0),
  CONSTRAINT cbm_count_hslm CHECK (high_sales_low_margin_count IS NULL OR high_sales_low_margin_count >= 0),
  CONSTRAINT cbm_count_cn_stockout CHECK (cannabis_stockout_count IS NULL OR cannabis_stockout_count >= 0),
  CONSTRAINT cbm_count_cn_hslm CHECK (cannabis_high_sales_low_margin_count IS NULL OR cannabis_high_sales_low_margin_count >= 0),

  -- Money >= 0
  CONSTRAINT cbm_money_unpaid CHECK (unpaid_invoice_amount IS NULL OR unpaid_invoice_amount >= 0),
  CONSTRAINT cbm_money_daily_sales CHECK (daily_sales IS NULL OR daily_sales >= 0),
  CONSTRAINT cbm_money_avg_ticket CHECK (average_ticket IS NULL OR average_ticket >= 0),
  CONSTRAINT cbm_money_dead CHECK (dead_stock_value IS NULL OR dead_stock_value >= 0),
  CONSTRAINT cbm_money_inv CHECK (inventory_value IS NULL OR inventory_value >= 0),
  CONSTRAINT cbm_money_aov CHECK (average_order_value IS NULL OR average_order_value >= 0),
  CONSTRAINT cbm_money_cn_dead CHECK (cannabis_dead_stock_value IS NULL OR cannabis_dead_stock_value >= 0),
  CONSTRAINT cbm_money_cn_inv CHECK (cannabis_inventory_value IS NULL OR cannabis_inventory_value >= 0)
);

CREATE INDEX IF NOT EXISTS idx_cbm_customer_created
  ON public.client_business_metrics (customer_id, created_at DESC);

ALTER TABLE public.client_business_metrics ENABLE ROW LEVEL SECURITY;

-- Admin-only. Clients and public have no access.
CREATE POLICY "Admins manage client_business_metrics"
  ON public.client_business_metrics
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER trg_cbm_touch_updated_at
  BEFORE UPDATE ON public.client_business_metrics
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();