CREATE TABLE IF NOT EXISTS public.customer_cleanup_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL CHECK (action IN ('archive','restore','delete')),
  customer_id uuid,
  target_email text,
  target_full_name text,
  target_business_name text,
  was_demo_account boolean,
  was_real_client boolean,
  performed_by uuid,
  performer_email text,
  reason text,
  success boolean NOT NULL DEFAULT false,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS customer_cleanup_audit_customer_idx
  ON public.customer_cleanup_audit (customer_id);
CREATE INDEX IF NOT EXISTS customer_cleanup_audit_created_idx
  ON public.customer_cleanup_audit (created_at DESC);

ALTER TABLE public.customer_cleanup_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read cleanup audit" ON public.customer_cleanup_audit;
CREATE POLICY "Admins can read cleanup audit"
  ON public.customer_cleanup_audit
  FOR SELECT
  USING (public.is_admin(auth.uid()));

-- No INSERT/UPDATE/DELETE policies: writes happen only via service-role
-- inside the admin-cleanup-customer edge function.
