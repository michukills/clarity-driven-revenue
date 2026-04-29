-- P33 — classify non-client records so demo/test/internal rows do not pollute
-- the real client flow. RGS internal operating account is admin/internal only.

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS account_kind text NOT NULL DEFAULT 'client',
  ADD COLUMN IF NOT EXISTS account_kind_notes text;

ALTER TABLE public.customers
  DROP CONSTRAINT IF EXISTS customers_account_kind_check;

ALTER TABLE public.customers
  ADD CONSTRAINT customers_account_kind_check
  CHECK (account_kind IN ('client', 'demo', 'test', 'internal_admin'));

CREATE INDEX IF NOT EXISTS idx_customers_account_kind
  ON public.customers(account_kind);

-- RGS-owned operating ledger / admin account. It must remain available to
-- admin tools, but must never appear as a customer in the operating flow.
UPDATE public.customers
   SET account_kind = 'internal_admin',
       account_kind_notes = 'Revenue & Growth Systems internal/admin operating account.',
       status = 'internal',
       portal_unlocked = false,
       contributes_to_global_learning = false,
       learning_enabled = false,
       learning_exclusion_reason = 'Internal RGS admin account'
 WHERE lower(coalesce(email, '')) = 'internal@rgs.local'
    OR lower(coalesce(email, '')) LIKE '%revenueandgrowthsystems%'
    OR lower(coalesce(full_name, '')) LIKE '%rgs internal%'
    OR lower(coalesce(business_name, '')) LIKE '%revenue & growth systems%'
    OR lower(coalesce(business_name, '')) LIKE '%revenue and growth systems%';

-- Synthetic demo/showcase accounts. They remain visible when requested, but
-- are clearly labeled and excluded from global learning.
UPDATE public.customers
   SET account_kind = 'demo',
       account_kind_notes = COALESCE(account_kind_notes, 'Synthetic demo/showcase account.'),
       is_demo_account = true,
       contributes_to_global_learning = false,
       learning_exclusion_reason = COALESCE(learning_exclusion_reason, 'Demo/showcase account')
 WHERE account_kind <> 'internal_admin'
   AND (
     is_demo_account = true
     OR lower(coalesce(email, '')) LIKE '%@demo.rgs.local'
     OR lower(coalesce(email, '')) LIKE '%@showcase.rgs.local'
     OR lower(coalesce(full_name, '')) LIKE '%(showcase)%'
     OR lower(coalesce(business_name, '')) LIKE '%(showcase)%'
     OR lower(coalesce(business_name, '')) LIKE 'demo %'
     OR lower(coalesce(business_name, '')) LIKE 'demo-%'
     OR lower(coalesce(business_name, '')) LIKE 'demo:%'
   );

-- Explicit test accounts. They are not demo story data and should be labeled
-- separately from true clients.
UPDATE public.customers
   SET account_kind = 'test',
       account_kind_notes = COALESCE(account_kind_notes, 'Internal test account.'),
       is_demo_account = false,
       contributes_to_global_learning = false,
       learning_enabled = false,
       learning_exclusion_reason = COALESCE(learning_exclusion_reason, 'Test account')
 WHERE account_kind = 'client'
   AND (
     lower(coalesce(email, '')) LIKE '%@rgs-test.local'
     OR lower(coalesce(email, '')) LIKE '%@test.rgs.local'
     OR lower(coalesce(email, '')) LIKE '%+test@%'
     OR lower(coalesce(email, '')) LIKE 'test@%'
     OR lower(coalesce(full_name, '')) = 'test'
     OR lower(coalesce(full_name, '')) LIKE 'test %'
     OR lower(coalesce(business_name, '')) LIKE 'test %'
     OR lower(coalesce(business_name, '')) LIKE '% test account%'
   );

COMMENT ON COLUMN public.customers.account_kind IS
  'Classifies records as real client, demo/showcase, test, or internal admin so admin flow metrics stay honest.';
COMMENT ON COLUMN public.customers.account_kind_notes IS
  'Admin-only explanation for why a customer record is not a real client flow account.';
