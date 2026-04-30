-- =====================================================================
-- P20.1 — Estimates workflow schema
-- =====================================================================

-- 1) Status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estimate_status') THEN
    CREATE TYPE public.estimate_status AS ENUM (
      'draft','sent','approved','rejected','expired','converted','cancelled'
    );
  END IF;
END $$;

-- 2) estimates
CREATE TABLE IF NOT EXISTS public.estimates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  period_id uuid REFERENCES public.business_financial_periods(id) ON DELETE SET NULL,
  estimate_number text,
  estimate_date date NOT NULL DEFAULT CURRENT_DATE,
  expires_at date,
  client_or_job text,
  service_category text,
  amount numeric NOT NULL DEFAULT 0,
  status public.estimate_status NOT NULL DEFAULT 'draft',
  sent_at timestamptz,
  approved_at timestamptz,
  rejected_at timestamptz,
  converted_invoice_id uuid REFERENCES public.invoice_entries(id) ON DELETE SET NULL,
  source text NOT NULL DEFAULT 'manual',
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_estimates_customer ON public.estimates(customer_id);
CREATE INDEX IF NOT EXISTS idx_estimates_status   ON public.estimates(status);
CREATE INDEX IF NOT EXISTS idx_estimates_date     ON public.estimates(estimate_date);

-- 3) estimate_status_history
CREATE TABLE IF NOT EXISTS public.estimate_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id uuid NOT NULL REFERENCES public.estimates(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  from_status public.estimate_status,
  to_status public.estimate_status NOT NULL,
  actor_id uuid,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_estimate_history_estimate ON public.estimate_status_history(estimate_id);
CREATE INDEX IF NOT EXISTS idx_estimate_history_customer ON public.estimate_status_history(customer_id);

-- 4) Link from invoices back to source estimate (nullable, additive)
ALTER TABLE public.invoice_entries
  ADD COLUMN IF NOT EXISTS source_estimate_id uuid
  REFERENCES public.estimates(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_ie_source_estimate ON public.invoice_entries(source_estimate_id);

-- 5) updated_at trigger
DROP TRIGGER IF EXISTS trg_estimates_updated_at ON public.estimates;
CREATE TRIGGER trg_estimates_updated_at
  BEFORE UPDATE ON public.estimates
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 6) Status-change audit trigger
CREATE OR REPLACE FUNCTION public.estimates_log_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.estimate_status_history
      (estimate_id, customer_id, from_status, to_status, actor_id)
    VALUES
      (NEW.id, NEW.customer_id, NULL, NEW.status, auth.uid());

    -- Auto-stamp lifecycle timestamps based on initial status
    IF NEW.status = 'sent' AND NEW.sent_at IS NULL THEN
      NEW.sent_at := now();
    ELSIF NEW.status = 'approved' AND NEW.approved_at IS NULL THEN
      NEW.approved_at := now();
    ELSIF NEW.status = 'rejected' AND NEW.rejected_at IS NULL THEN
      NEW.rejected_at := now();
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.estimate_status_history
      (estimate_id, customer_id, from_status, to_status, actor_id)
    VALUES
      (NEW.id, NEW.customer_id, OLD.status, NEW.status, auth.uid());

    IF NEW.status = 'sent' AND NEW.sent_at IS NULL THEN
      NEW.sent_at := now();
    ELSIF NEW.status = 'approved' AND NEW.approved_at IS NULL THEN
      NEW.approved_at := now();
    ELSIF NEW.status = 'rejected' AND NEW.rejected_at IS NULL THEN
      NEW.rejected_at := now();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_estimates_status_change ON public.estimates;
CREATE TRIGGER trg_estimates_status_change
  BEFORE INSERT OR UPDATE OF status ON public.estimates
  FOR EACH ROW EXECUTE FUNCTION public.estimates_log_status_change();

-- 7) RLS — mirror financial-tables pattern
ALTER TABLE public.estimates              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estimate_status_history ENABLE ROW LEVEL SECURITY;

-- estimates policies
DROP POLICY IF EXISTS "Admins manage all on estimates" ON public.estimates;
CREATE POLICY "Admins manage all on estimates"
  ON public.estimates
  FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Clients view own on estimates" ON public.estimates;
CREATE POLICY "Clients view own on estimates"
  ON public.estimates
  FOR SELECT
  USING (customer_id IS NOT NULL AND public.user_owns_customer(auth.uid(), customer_id));

DROP POLICY IF EXISTS "Clients insert own on estimates" ON public.estimates;
CREATE POLICY "Clients insert own on estimates"
  ON public.estimates
  FOR INSERT
  WITH CHECK (customer_id IS NOT NULL AND public.user_owns_customer(auth.uid(), customer_id));

DROP POLICY IF EXISTS "Clients update own on estimates" ON public.estimates;
CREATE POLICY "Clients update own on estimates"
  ON public.estimates
  FOR UPDATE
  USING (customer_id IS NOT NULL AND public.user_owns_customer(auth.uid(), customer_id))
  WITH CHECK (customer_id IS NOT NULL AND public.user_owns_customer(auth.uid(), customer_id));

DROP POLICY IF EXISTS "Clients delete own on estimates" ON public.estimates;
CREATE POLICY "Clients delete own on estimates"
  ON public.estimates
  FOR DELETE
  USING (customer_id IS NOT NULL AND public.user_owns_customer(auth.uid(), customer_id));

-- history: admins full; clients read-only on their own
DROP POLICY IF EXISTS "Admins manage all on estimate_status_history" ON public.estimate_status_history;
CREATE POLICY "Admins manage all on estimate_status_history"
  ON public.estimate_status_history
  FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Clients view own on estimate_status_history" ON public.estimate_status_history;
CREATE POLICY "Clients view own on estimate_status_history"
  ON public.estimate_status_history
  FOR SELECT
  USING (customer_id IS NOT NULL AND public.user_owns_customer(auth.uid(), customer_id));