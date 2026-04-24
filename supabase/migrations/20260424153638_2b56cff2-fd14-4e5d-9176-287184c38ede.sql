-- P13.RCC.H.3 — short-lived QuickBooks OAuth state nonces
CREATE TABLE IF NOT EXISTS public.quickbooks_oauth_states (
  state TEXT PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  initiated_by UUID,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '15 minutes'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.quickbooks_oauth_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read oauth states"
  ON public.quickbooks_oauth_states
  FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Customer owners can read their own oauth states"
  ON public.quickbooks_oauth_states
  FOR SELECT
  USING (public.user_owns_customer(auth.uid(), customer_id));

CREATE INDEX IF NOT EXISTS idx_quickbooks_oauth_states_expires
  ON public.quickbooks_oauth_states (expires_at);
