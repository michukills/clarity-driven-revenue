-- P20.13: Square + Stripe period summary tables.

-- ---------- square_period_summaries ----------
CREATE TABLE public.square_period_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  gross_sales numeric,
  net_sales numeric,
  discounts_total numeric,
  refunds_total numeric,
  tips_total numeric,
  tax_total numeric,
  transaction_count integer,
  day_count integer,
  has_recurring_period_reporting boolean,
  source_account_id text,
  source_location_id text,
  synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_square_summary_unique
  ON public.square_period_summaries (
    customer_id,
    COALESCE(source_account_id, ''),
    COALESCE(source_location_id, ''),
    period_start,
    period_end
  );

CREATE INDEX idx_square_summaries_customer_period
  ON public.square_period_summaries (customer_id, period_end DESC);

ALTER TABLE public.square_period_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage square_period_summaries"
  ON public.square_period_summaries
  FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Clients view own square_period_summaries"
  ON public.square_period_summaries
  FOR SELECT
  USING (customer_id IS NOT NULL AND public.user_owns_customer(auth.uid(), customer_id));

CREATE TRIGGER update_square_period_summaries_updated_at
  BEFORE UPDATE ON public.square_period_summaries
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

-- ---------- stripe_period_summaries ----------
CREATE TABLE public.stripe_period_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  gross_volume numeric,
  net_volume numeric,
  fees_total numeric,
  refunds_total numeric,
  disputes_total numeric,
  successful_payment_count integer,
  failed_payment_count integer,
  source_account_id text,
  synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_stripe_summary_unique
  ON public.stripe_period_summaries (
    customer_id,
    COALESCE(source_account_id, ''),
    period_start,
    period_end
  );

CREATE INDEX idx_stripe_summaries_customer_period
  ON public.stripe_period_summaries (customer_id, period_end DESC);

ALTER TABLE public.stripe_period_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage stripe_period_summaries"
  ON public.stripe_period_summaries
  FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Clients view own stripe_period_summaries"
  ON public.stripe_period_summaries
  FOR SELECT
  USING (customer_id IS NOT NULL AND public.user_owns_customer(auth.uid(), customer_id));

CREATE TRIGGER update_stripe_period_summaries_updated_at
  BEFORE UPDATE ON public.stripe_period_summaries
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();