-- P10.2c-Hardening — Audit log for per-customer learning control changes
CREATE TABLE IF NOT EXISTS public.customer_learning_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  changed_by uuid,
  previous_learning_enabled boolean,
  new_learning_enabled boolean,
  previous_contributes_to_global_learning boolean,
  new_contributes_to_global_learning boolean,
  previous_reason text,
  new_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS customer_learning_audit_customer_idx
  ON public.customer_learning_audit (customer_id, created_at DESC);

ALTER TABLE public.customer_learning_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all on customer_learning_audit"
  ON public.customer_learning_audit
  FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));