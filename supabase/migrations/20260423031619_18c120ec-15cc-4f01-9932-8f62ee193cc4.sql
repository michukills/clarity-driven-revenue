-- P7.2.6a — Partial-payment amount tracking
-- Adds optional numeric amount fields per engagement section.
-- No card/bank/payment-method storage. No RLS, access, or RCC changes.

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS diagnostic_amount_due       numeric(12,2) NULL,
  ADD COLUMN IF NOT EXISTS diagnostic_amount_paid      numeric(12,2) NULL,
  ADD COLUMN IF NOT EXISTS implementation_amount_due   numeric(12,2) NULL,
  ADD COLUMN IF NOT EXISTS implementation_amount_paid  numeric(12,2) NULL,
  ADD COLUMN IF NOT EXISTS addon_amount_due            numeric(12,2) NULL,
  ADD COLUMN IF NOT EXISTS addon_amount_paid           numeric(12,2) NULL;

-- Non-negative checks (NULL allowed).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'customers_diagnostic_amount_due_nonneg') THEN
    ALTER TABLE public.customers
      ADD CONSTRAINT customers_diagnostic_amount_due_nonneg
      CHECK (diagnostic_amount_due IS NULL OR diagnostic_amount_due >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'customers_diagnostic_amount_paid_nonneg') THEN
    ALTER TABLE public.customers
      ADD CONSTRAINT customers_diagnostic_amount_paid_nonneg
      CHECK (diagnostic_amount_paid IS NULL OR diagnostic_amount_paid >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'customers_implementation_amount_due_nonneg') THEN
    ALTER TABLE public.customers
      ADD CONSTRAINT customers_implementation_amount_due_nonneg
      CHECK (implementation_amount_due IS NULL OR implementation_amount_due >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'customers_implementation_amount_paid_nonneg') THEN
    ALTER TABLE public.customers
      ADD CONSTRAINT customers_implementation_amount_paid_nonneg
      CHECK (implementation_amount_paid IS NULL OR implementation_amount_paid >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'customers_addon_amount_due_nonneg') THEN
    ALTER TABLE public.customers
      ADD CONSTRAINT customers_addon_amount_due_nonneg
      CHECK (addon_amount_due IS NULL OR addon_amount_due >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'customers_addon_amount_paid_nonneg') THEN
    ALTER TABLE public.customers
      ADD CONSTRAINT customers_addon_amount_paid_nonneg
      CHECK (addon_amount_paid IS NULL OR addon_amount_paid >= 0);
  END IF;
END$$;