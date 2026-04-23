ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS diagnostic_payment_status text NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS diagnostic_paid_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS implementation_payment_status text NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS implementation_paid_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS addon_payment_status text NOT NULL DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS addon_paid_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS billing_notes text NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'customers_diagnostic_payment_status_chk') THEN
    ALTER TABLE public.customers
      ADD CONSTRAINT customers_diagnostic_payment_status_chk
      CHECK (diagnostic_payment_status IN ('not_required','unpaid','partial','paid','refunded','waived'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'customers_implementation_payment_status_chk') THEN
    ALTER TABLE public.customers
      ADD CONSTRAINT customers_implementation_payment_status_chk
      CHECK (implementation_payment_status IN ('not_required','unpaid','partial','paid','refunded','waived'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'customers_addon_payment_status_chk') THEN
    ALTER TABLE public.customers
      ADD CONSTRAINT customers_addon_payment_status_chk
      CHECK (addon_payment_status IN ('not_required','unpaid','partial','paid','refunded','waived'));
  END IF;
END$$;