-- RGS SWOT Strategic Matrix: deeper data layer (parent analyses + items + signals)
-- Layered alongside existing P61 swot_analysis_items table.

DO $$ BEGIN
  CREATE TYPE public.swot_analysis_status AS ENUM (
    'draft','needs_inputs','ready_for_review','reviewed','approved','archived'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.swot_analysis_mode AS ENUM (
    'full_rgs_client','diagnostic_support','implementation_support',
    'control_system_support','standalone_gig','demo'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.swot_evidence_confidence AS ENUM (
    'verified','partially_supported','owner_claim_only','assumption','missing_evidence'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.swot_item_source_type AS ENUM (
    'scorecard','diagnostic','owner_interview','evidence_upload',
    'admin_observation','industry_brain','implementation','control_system',
    'manual','demo'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.swot_linked_gear AS ENUM (
    'demand_generation','revenue_conversion','operational_efficiency',
    'financial_visibility','owner_independence','multiple'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.swot_severity_or_leverage AS ENUM (
    'low','moderate','high','critical'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.swot_internal_external AS ENUM ('internal','external');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.swot_signal_type AS ENUM (
    'repair_priority','campaign_input','buyer_persona_input',
    'implementation_input','control_system_watch_item','reengagement_trigger',
    'evidence_needed','owner_independence_risk','conversion_risk',
    'demand_opportunity','financial_visibility_risk','operational_bottleneck'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ===== Parent analyses =====
CREATE TABLE IF NOT EXISTS public.swot_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  title text NOT NULL,
  status public.swot_analysis_status NOT NULL DEFAULT 'draft',
  analysis_mode public.swot_analysis_mode NOT NULL DEFAULT 'full_rgs_client',
  industry text,
  business_stage text,
  notes text,
  created_by uuid,
  reviewed_by uuid,
  approved_by uuid,
  reviewed_at timestamptz,
  approved_at timestamptz,
  client_visible boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_swot_analyses_customer ON public.swot_analyses(customer_id);
CREATE INDEX IF NOT EXISTS idx_swot_analyses_status ON public.swot_analyses(status);
ALTER TABLE public.swot_analyses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin manage swot analyses" ON public.swot_analyses;
CREATE POLICY "Admin manage swot analyses"
  ON public.swot_analyses FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Client read own approved visible swot analyses" ON public.swot_analyses;
CREATE POLICY "Client read own approved visible swot analyses"
  ON public.swot_analyses FOR SELECT
  USING (
    client_visible = true
    AND archived_at IS NULL
    AND status = 'approved'
    AND public.user_owns_customer(auth.uid(), customer_id)
  );

DROP TRIGGER IF EXISTS trg_swot_analyses_touch ON public.swot_analyses;
CREATE TRIGGER trg_swot_analyses_touch
  BEFORE UPDATE ON public.swot_analyses
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ===== Items =====
CREATE TABLE IF NOT EXISTS public.swot_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  swot_analysis_id uuid NOT NULL REFERENCES public.swot_analyses(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  category public.swot_category NOT NULL,
  title text NOT NULL,
  description text,
  evidence_summary text,
  evidence_confidence public.swot_evidence_confidence NOT NULL DEFAULT 'missing_evidence',
  source_type public.swot_item_source_type NOT NULL DEFAULT 'manual',
  linked_gear public.swot_linked_gear NOT NULL DEFAULT 'multiple',
  severity_or_leverage public.swot_severity_or_leverage NOT NULL DEFAULT 'moderate',
  internal_external public.swot_internal_external NOT NULL DEFAULT 'internal',
  client_safe_summary text,
  admin_only_notes text,
  recommended_action text,
  repair_map_relevance boolean NOT NULL DEFAULT false,
  implementation_relevance boolean NOT NULL DEFAULT false,
  campaign_relevance boolean NOT NULL DEFAULT false,
  control_system_monitoring_relevance boolean NOT NULL DEFAULT false,
  reengagement_trigger_relevance boolean NOT NULL DEFAULT false,
  client_visible boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_swot_items_analysis ON public.swot_items(swot_analysis_id);
CREATE INDEX IF NOT EXISTS idx_swot_items_customer ON public.swot_items(customer_id);
CREATE INDEX IF NOT EXISTS idx_swot_items_category ON public.swot_items(category);
CREATE INDEX IF NOT EXISTS idx_swot_items_gear ON public.swot_items(linked_gear);
ALTER TABLE public.swot_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin manage swot items" ON public.swot_items;
CREATE POLICY "Admin manage swot items"
  ON public.swot_items FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Client read own visible swot items" ON public.swot_items;
CREATE POLICY "Client read own visible swot items"
  ON public.swot_items FOR SELECT
  USING (
    client_visible = true
    AND public.user_owns_customer(auth.uid(), customer_id)
    AND EXISTS (
      SELECT 1 FROM public.swot_analyses a
      WHERE a.id = swot_items.swot_analysis_id
        AND a.customer_id = swot_items.customer_id
        AND a.status = 'approved'
        AND a.client_visible = true
        AND a.archived_at IS NULL
    )
  );

DROP TRIGGER IF EXISTS trg_swot_items_touch ON public.swot_items;
CREATE TRIGGER trg_swot_items_touch
  BEFORE UPDATE ON public.swot_items
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ===== Signals =====
CREATE TABLE IF NOT EXISTS public.swot_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  swot_analysis_id uuid NOT NULL REFERENCES public.swot_analyses(id) ON DELETE CASCADE,
  swot_item_id uuid REFERENCES public.swot_items(id) ON DELETE SET NULL,
  signal_type public.swot_signal_type NOT NULL,
  gear public.swot_linked_gear,
  summary text NOT NULL,
  confidence public.swot_evidence_confidence NOT NULL DEFAULT 'partially_supported',
  client_safe boolean NOT NULL DEFAULT false,
  admin_only boolean NOT NULL DEFAULT true,
  consumed_by text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_swot_signals_customer ON public.swot_signals(customer_id);
CREATE INDEX IF NOT EXISTS idx_swot_signals_analysis ON public.swot_signals(swot_analysis_id);
CREATE INDEX IF NOT EXISTS idx_swot_signals_type ON public.swot_signals(signal_type);
ALTER TABLE public.swot_signals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin manage swot signals" ON public.swot_signals;
CREATE POLICY "Admin manage swot signals"
  ON public.swot_signals FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Client read own client-safe swot signals" ON public.swot_signals;
CREATE POLICY "Client read own client-safe swot signals"
  ON public.swot_signals FOR SELECT
  USING (
    client_safe = true
    AND admin_only = false
    AND public.user_owns_customer(auth.uid(), customer_id)
    AND EXISTS (
      SELECT 1 FROM public.swot_analyses a
      WHERE a.id = swot_signals.swot_analysis_id
        AND a.customer_id = swot_signals.customer_id
        AND a.status = 'approved'
        AND a.client_visible = true
        AND a.archived_at IS NULL
    )
  );

DROP TRIGGER IF EXISTS trg_swot_signals_touch ON public.swot_signals;
CREATE TRIGGER trg_swot_signals_touch
  BEFORE UPDATE ON public.swot_signals
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
