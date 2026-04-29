-- P32: Client Business Snapshot & Industry Verification (admin-only)

CREATE TABLE IF NOT EXISTS public.client_business_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL UNIQUE REFERENCES public.customers(id) ON DELETE CASCADE,
  -- Free-form, source-backed snapshot fields. NULL = Unknown / Not recorded.
  what_business_does text,
  products_services text,
  customer_type text,
  revenue_model text,
  operating_model text,
  service_area text,
  -- Industry verification metadata
  industry_confidence text NOT NULL DEFAULT 'unverified'
    CHECK (industry_confidence IN ('unverified','low','medium','high','verified')),
  industry_verification_notes text,
  industry_verified boolean NOT NULL DEFAULT false,
  industry_verified_by uuid,
  industry_verified_at timestamptz,
  -- Snapshot lifecycle
  snapshot_status text NOT NULL DEFAULT 'draft'
    CHECK (snapshot_status IN ('draft','admin_verified')),
  draft_generated_at timestamptz,
  last_updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_business_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage client_business_snapshots"
  ON public.client_business_snapshots
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER trg_client_business_snapshots_touch
  BEFORE UPDATE ON public.client_business_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();