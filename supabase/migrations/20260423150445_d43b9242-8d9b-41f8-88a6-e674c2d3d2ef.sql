ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS learning_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS contributes_to_global_learning boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS learning_exclusion_reason text NULL;

UPDATE public.customers
   SET contributes_to_global_learning = false,
       learning_exclusion_reason = COALESCE(learning_exclusion_reason, 'Demo/training account')
 WHERE lower(email) LIKE '%@demo.rgs.local'
   AND contributes_to_global_learning = true;