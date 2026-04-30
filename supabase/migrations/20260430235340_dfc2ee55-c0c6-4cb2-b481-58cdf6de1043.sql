-- P20.14: Dutchie period summary table + add 'dutchie' to client_business_metrics source whitelist.

CREATE TABLE public.dutchie_period_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  gross_sales numeric,
  net_sales numeric,
  discounts_total numeric,
  promotions_total numeric,
  transaction_count integer,
  average_ticket numeric,
  product_sales_total numeric,
  category_sales_total numeric,
  inventory_value numeric,
  dead_stock_value numeric,
  stockout_count integer,
  inventory_turnover numeric,
  shrinkage_pct numeric,
  payment_reconciliation_gap boolean,
  has_recurring_period_reporting boolean,
  product_margin_visible boolean,
  category_margin_visible boolean,
  source_account_id text,
  source_location_id text,
  synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_dutchie_summary_unique
  ON public.dutchie_period_summaries (
    customer_id,
    COALESCE(source_account_id, ''),
    COALESCE(source_location_id, ''),
    period_start,
    period_end
  );

CREATE INDEX idx_dutchie_summaries_customer_period
  ON public.dutchie_period_summaries (customer_id, period_end DESC);

ALTER TABLE public.dutchie_period_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage dutchie_period_summaries"
  ON public.dutchie_period_summaries
  FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Clients view own dutchie_period_summaries"
  ON public.dutchie_period_summaries
  FOR SELECT
  USING (customer_id IS NOT NULL AND public.user_owns_customer(auth.uid(), customer_id));

CREATE TRIGGER update_dutchie_period_summaries_updated_at
  BEFORE UPDATE ON public.dutchie_period_summaries
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

-- Extend allowed source values for client_business_metrics.
ALTER TABLE public.client_business_metrics
  DROP CONSTRAINT IF EXISTS cbm_source_chk;

ALTER TABLE public.client_business_metrics
  ADD CONSTRAINT cbm_source_chk
  CHECK (source = ANY (ARRAY[
    'manual'::text,
    'csv_upload'::text,
    'file_upload'::text,
    'quickbooks'::text,
    'square'::text,
    'stripe'::text,
    'dutchie'::text,
    'pos_export'::text,
    'admin_assumption'::text,
    'client_input'::text
  ]));