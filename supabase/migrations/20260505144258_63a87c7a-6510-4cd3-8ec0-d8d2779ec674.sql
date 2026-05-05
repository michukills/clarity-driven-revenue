CREATE TABLE IF NOT EXISTS public.client_acknowledgments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agreement_key TEXT NOT NULL,
  agreement_name TEXT NOT NULL,
  agreement_version TEXT NOT NULL,
  acceptance_context TEXT NOT NULL,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  revoked_at TIMESTAMPTZ,
  supersedes_id UUID REFERENCES public.client_acknowledgments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_ack_customer_key
  ON public.client_acknowledgments (customer_id, agreement_key, accepted_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_ack_user
  ON public.client_acknowledgments (user_id, accepted_at DESC);

ALTER TABLE public.client_acknowledgments ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can view all acknowledgments"
  ON public.client_acknowledgments FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert acknowledgments"
  ON public.client_acknowledgments FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update acknowledgments (revocation only)"
  ON public.client_acknowledgments FOR UPDATE
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Clients can view their own customer's acknowledgments
CREATE POLICY "Clients can view their own acknowledgments"
  ON public.client_acknowledgments FOR SELECT
  USING (
    customer_id IN (
      SELECT id FROM public.customers WHERE user_id = auth.uid()
    )
  );

-- Clients can insert acknowledgments only for themselves on their own customer
CREATE POLICY "Clients can insert their own acknowledgments"
  ON public.client_acknowledgments FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND customer_id IN (
      SELECT id FROM public.customers WHERE user_id = auth.uid()
    )
  );

-- No client UPDATE / DELETE policies = immutable for clients.

-- Helper function: latest acceptance lookup
CREATE OR REPLACE FUNCTION public.get_latest_client_acknowledgment(
  _customer_id UUID,
  _agreement_key TEXT
)
RETURNS public.client_acknowledgments
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.client_acknowledgments
  WHERE customer_id = _customer_id
    AND agreement_key = _agreement_key
    AND revoked_at IS NULL
  ORDER BY accepted_at DESC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_latest_client_acknowledgment(UUID, TEXT) TO authenticated;