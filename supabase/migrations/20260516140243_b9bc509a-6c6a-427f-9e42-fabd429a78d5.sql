
-- P100: Gig customer columns
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS is_gig boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS gig_tier text,
  ADD COLUMN IF NOT EXISTS gig_package_type text,
  ADD COLUMN IF NOT EXISTS gig_status text,
  ADD COLUMN IF NOT EXISTS gig_tier_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS gig_converted_to_full_client_at timestamptz,
  ADD COLUMN IF NOT EXISTS gig_converted_by uuid;

-- Constrain gig_tier values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'customers_gig_tier_check'
  ) THEN
    ALTER TABLE public.customers
      ADD CONSTRAINT customers_gig_tier_check
      CHECK (gig_tier IS NULL OR gig_tier IN ('basic','standard','premium'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'customers_gig_status_check'
  ) THEN
    ALTER TABLE public.customers
      ADD CONSTRAINT customers_gig_status_check
      CHECK (gig_status IS NULL OR gig_status IN ('active','archived','converted'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_customers_is_gig
  ON public.customers (is_gig) WHERE is_gig = true;

-- P100: Audit log for gig lifecycle events
CREATE TABLE IF NOT EXISTS public.customer_gig_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE,
  action text NOT NULL,
  prior_tier text,
  new_tier text,
  prior_status text,
  new_status text,
  package_type text,
  performed_by uuid,
  performer_email text,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_gig_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gig_audit_admin_select" ON public.customer_gig_audit;
CREATE POLICY "gig_audit_admin_select"
  ON public.customer_gig_audit FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "gig_audit_admin_insert" ON public.customer_gig_audit;
CREATE POLICY "gig_audit_admin_insert"
  ON public.customer_gig_audit FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_customer_gig_audit_customer
  ON public.customer_gig_audit (customer_id, created_at DESC);
