
CREATE TABLE IF NOT EXISTS public.client_service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  requested_by uuid,
  request_type text NOT NULL CHECK (request_type IN ('account_deactivation','addon_cancellation')),
  addon_key text,
  reason text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','reviewed','completed','declined')),
  admin_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_service_requests_customer
  ON public.client_service_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_client_service_requests_status
  ON public.client_service_requests(status);

ALTER TABLE public.client_service_requests ENABLE ROW LEVEL SECURITY;

-- Admins: full access.
CREATE POLICY "Admin manage service requests"
  ON public.client_service_requests
  FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Clients: view their own requests only.
CREATE POLICY "Clients view own service requests"
  ON public.client_service_requests
  FOR SELECT
  USING (public.user_owns_customer(auth.uid(), customer_id));

-- Clients: create requests for their own customer record only.
-- requested_by must match the authenticated user; status must start as pending;
-- admin-only fields must be empty at creation.
CREATE POLICY "Clients create own service requests"
  ON public.client_service_requests
  FOR INSERT
  WITH CHECK (
    public.user_owns_customer(auth.uid(), customer_id)
    AND requested_by = auth.uid()
    AND status = 'pending'
    AND admin_notes IS NULL
    AND reviewed_by IS NULL
    AND reviewed_at IS NULL
  );

-- Clients explicitly cannot UPDATE or DELETE — no policy granted.

CREATE TRIGGER client_service_requests_touch
  BEFORE UPDATE ON public.client_service_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
