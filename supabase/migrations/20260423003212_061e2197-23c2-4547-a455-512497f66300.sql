ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS rcc_subscription_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS rcc_paid_through date NULL;

ALTER TABLE public.customers
  DROP CONSTRAINT IF EXISTS customers_rcc_subscription_status_check;

ALTER TABLE public.customers
  ADD CONSTRAINT customers_rcc_subscription_status_check
  CHECK (rcc_subscription_status IN ('none','active','past_due','cancelled','comped'));