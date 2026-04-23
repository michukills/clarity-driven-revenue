
-- P11.4 Acquisition Control Center schema

-- 1. marketing_channels
CREATE TABLE public.marketing_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  channel_key text NOT NULL,
  label text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_id, channel_key)
);
CREATE INDEX idx_marketing_channels_customer ON public.marketing_channels(customer_id);
ALTER TABLE public.marketing_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all on marketing_channels"
  ON public.marketing_channels FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Clients view own marketing_channels"
  ON public.marketing_channels FOR SELECT
  USING (customer_id IS NOT NULL AND public.user_owns_customer(auth.uid(), customer_id));

CREATE TRIGGER trg_marketing_channels_touch
  BEFORE UPDATE ON public.marketing_channels
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 2. marketing_spend_entries
CREATE TABLE public.marketing_spend_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  channel_id uuid NOT NULL REFERENCES public.marketing_channels(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  amount_spent numeric NOT NULL DEFAULT 0,
  source text DEFAULT 'Manual',
  source_ref text,
  notes text,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_marketing_spend_customer_period ON public.marketing_spend_entries(customer_id, period_start, period_end);
CREATE INDEX idx_marketing_spend_channel ON public.marketing_spend_entries(channel_id);
ALTER TABLE public.marketing_spend_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all on marketing_spend_entries"
  ON public.marketing_spend_entries FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Clients view own marketing_spend_entries"
  ON public.marketing_spend_entries FOR SELECT
  USING (customer_id IS NOT NULL AND public.user_owns_customer(auth.uid(), customer_id));

CREATE TRIGGER trg_marketing_spend_touch
  BEFORE UPDATE ON public.marketing_spend_entries
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3. lead_source_metrics
CREATE TABLE public.lead_source_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  channel_id uuid NOT NULL REFERENCES public.marketing_channels(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  leads numeric NOT NULL DEFAULT 0,
  qualified_leads numeric NOT NULL DEFAULT 0,
  booked_calls numeric NOT NULL DEFAULT 0,
  proposals_sent numeric NOT NULL DEFAULT 0,
  won_deals numeric NOT NULL DEFAULT 0,
  lost_deals numeric NOT NULL DEFAULT 0,
  revenue_attributed numeric NOT NULL DEFAULT 0,
  notes text,
  source text DEFAULT 'Manual',
  source_ref text,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_lead_metrics_customer_period ON public.lead_source_metrics(customer_id, period_start, period_end);
CREATE INDEX idx_lead_metrics_channel ON public.lead_source_metrics(channel_id);
ALTER TABLE public.lead_source_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all on lead_source_metrics"
  ON public.lead_source_metrics FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Clients view own lead_source_metrics"
  ON public.lead_source_metrics FOR SELECT
  USING (customer_id IS NOT NULL AND public.user_owns_customer(auth.uid(), customer_id));

CREATE TRIGGER trg_lead_metrics_touch
  BEFORE UPDATE ON public.lead_source_metrics
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
