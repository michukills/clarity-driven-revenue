
-- P12.4.B — Customer package entitlements + explicit lifecycle state.
-- Additive only. No data migration; existing fields (stage, track,
-- payment_status, rcc_subscription_status) remain authoritative for
-- their original purposes. These new columns make purchased products
-- and lifecycle position EXPLICIT and EDITABLE at the customer level.

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS package_diagnostic boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS package_implementation boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS package_revenue_tracker boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS package_ongoing_support boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS package_addons boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS package_full_bundle boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS package_notes text,
  ADD COLUMN IF NOT EXISTS lifecycle_state text NOT NULL DEFAULT 'lead',
  ADD COLUMN IF NOT EXISTS lifecycle_updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS lifecycle_notes text;

-- Lifecycle states are operational, separate from sales `stage`.
-- Allowed values represent the real business workflow.
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_lifecycle_state_check;
ALTER TABLE public.customers
  ADD CONSTRAINT customers_lifecycle_state_check
  CHECK (lifecycle_state IN (
    'lead',
    'diagnostic',
    'implementation',
    'completed',
    'ongoing_support',
    're_engagement',
    'inactive'
  ));
