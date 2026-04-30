ALTER TABLE public.client_business_metrics
  DROP CONSTRAINT IF EXISTS cbm_source_chk;

ALTER TABLE public.client_business_metrics
  ADD CONSTRAINT cbm_source_chk
  CHECK (source = ANY (ARRAY[
    'manual'::text,
    'csv_upload'::text,
    'file_upload'::text,
    'quickbooks'::text,
    'square'::text,
    'stripe'::text,
    'pos_export'::text,
    'admin_assumption'::text,
    'client_input'::text
  ]));