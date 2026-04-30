ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS account_kind TEXT NOT NULL DEFAULT 'client',
  ADD COLUMN IF NOT EXISTS account_kind_notes TEXT;

ALTER TABLE public.customers
  DROP CONSTRAINT IF EXISTS customers_account_kind_check;

ALTER TABLE public.customers
  ADD CONSTRAINT customers_account_kind_check
  CHECK (account_kind IN ('client', 'demo', 'test', 'internal_admin'));

CREATE INDEX IF NOT EXISTS idx_customers_account_kind
  ON public.customers (account_kind);