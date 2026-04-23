
CREATE TABLE public.client_pipeline_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  stage_key text NOT NULL,
  label text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_id, stage_key)
);

CREATE INDEX idx_client_pipeline_stages_customer ON public.client_pipeline_stages(customer_id, display_order);

ALTER TABLE public.client_pipeline_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all on client_pipeline_stages"
  ON public.client_pipeline_stages FOR ALL
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Clients view own client_pipeline_stages"
  ON public.client_pipeline_stages FOR SELECT
  USING (customer_id IS NOT NULL AND user_owns_customer(auth.uid(), customer_id));

CREATE TRIGGER touch_client_pipeline_stages
  BEFORE UPDATE ON public.client_pipeline_stages
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.client_pipeline_deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  title text NOT NULL,
  company_or_contact text,
  source_channel text,
  stage_id uuid,
  estimated_value numeric NOT NULL DEFAULT 0,
  probability_percent numeric NOT NULL DEFAULT 50,
  weighted_value numeric GENERATED ALWAYS AS (COALESCE(estimated_value,0) * COALESCE(probability_percent,0) / 100.0) STORED,
  created_date date NOT NULL DEFAULT CURRENT_DATE,
  last_activity_date date,
  expected_close_date date,
  status text NOT NULL DEFAULT 'open',
  loss_reason text,
  notes text,
  source text DEFAULT 'Manual',
  source_ref text,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT client_pipeline_deals_status_chk
    CHECK (status IN ('open','won','lost','stalled','archived'))
);

CREATE INDEX idx_client_pipeline_deals_customer ON public.client_pipeline_deals(customer_id, status);
CREATE INDEX idx_client_pipeline_deals_stage ON public.client_pipeline_deals(stage_id);
CREATE INDEX idx_client_pipeline_deals_close ON public.client_pipeline_deals(expected_close_date);

ALTER TABLE public.client_pipeline_deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all on client_pipeline_deals"
  ON public.client_pipeline_deals FOR ALL
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Clients view own client_pipeline_deals"
  ON public.client_pipeline_deals FOR SELECT
  USING (customer_id IS NOT NULL AND user_owns_customer(auth.uid(), customer_id));

CREATE TRIGGER touch_client_pipeline_deals
  BEFORE UPDATE ON public.client_pipeline_deals
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
