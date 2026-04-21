-- Add visibility + screenshot to resources, expand categories
DO $$ BEGIN
  CREATE TYPE public.resource_visibility AS ENUM ('internal', 'customer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.resources
  ADD COLUMN IF NOT EXISTS visibility public.resource_visibility NOT NULL DEFAULT 'internal',
  ADD COLUMN IF NOT EXISTS screenshot_url text,
  ADD COLUMN IF NOT EXISTS downloadable boolean NOT NULL DEFAULT true;

-- Expand resource_category enum with new categories (idempotent)
DO $$ BEGIN
  ALTER TYPE public.resource_category ADD VALUE IF NOT EXISTS 'internal_revenue_worksheets';
EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE public.resource_category ADD VALUE IF NOT EXISTS 'internal_scorecards';
EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE public.resource_category ADD VALUE IF NOT EXISTS 'internal_client_workbooks';
EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE public.resource_category ADD VALUE IF NOT EXISTS 'client_revenue_worksheets';
EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE public.resource_category ADD VALUE IF NOT EXISTS 'client_implementation_trackers';
EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE public.resource_category ADD VALUE IF NOT EXISTS 'client_scorecard_sheets';
EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE public.resource_category ADD VALUE IF NOT EXISTS 'customer_financial_worksheets';
EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE public.resource_category ADD VALUE IF NOT EXISTS 'shared_implementation_tools';
EXCEPTION WHEN others THEN NULL; END $$;

-- Storage policies for resources bucket (admin upload, signed/public read via signed URLs)
-- Allow admins full control on resources bucket
DO $$ BEGIN
  CREATE POLICY "Admins manage resources bucket"
    ON storage.objects FOR ALL
    USING (bucket_id = 'resources' AND public.is_admin(auth.uid()))
    WITH CHECK (bucket_id = 'resources' AND public.is_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Allow authenticated users to read resources bucket (URLs gated by app-level RLS on resources table)
DO $$ BEGIN
  CREATE POLICY "Authenticated read resources bucket"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'resources' AND auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;