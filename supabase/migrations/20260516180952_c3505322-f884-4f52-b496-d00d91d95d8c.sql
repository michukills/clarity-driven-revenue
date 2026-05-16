
-- P101: report mode + gig tier scoping on tool report artifacts.
ALTER TABLE public.tool_report_artifacts
  ADD COLUMN IF NOT EXISTS report_mode text NOT NULL DEFAULT 'gig_report',
  ADD COLUMN IF NOT EXISTS gig_tier text,
  ADD COLUMN IF NOT EXISTS allowed_sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS excluded_sections jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Drop CHECK if re-running, then add fresh
DO $$ BEGIN
  ALTER TABLE public.tool_report_artifacts
    DROP CONSTRAINT IF EXISTS tool_report_artifacts_report_mode_chk;
  ALTER TABLE public.tool_report_artifacts
    DROP CONSTRAINT IF EXISTS tool_report_artifacts_gig_tier_chk;
END $$;

ALTER TABLE public.tool_report_artifacts
  ADD CONSTRAINT tool_report_artifacts_report_mode_chk
  CHECK (report_mode IN ('gig_report','full_rgs_report'));

ALTER TABLE public.tool_report_artifacts
  ADD CONSTRAINT tool_report_artifacts_gig_tier_chk
  CHECK (gig_tier IS NULL OR gig_tier IN ('basic','standard','premium'));

-- Safe backfill. Default for unresolved customers is the most restrictive
-- mode (gig_report) so a stale row can never grant full-RGS access.
UPDATE public.tool_report_artifacts a
   SET report_mode = CASE
                       WHEN c.is_gig = false THEN 'full_rgs_report'
                       ELSE 'gig_report'
                     END,
       gig_tier    = CASE
                       WHEN c.is_gig = true THEN c.gig_tier
                       ELSE NULL
                     END
  FROM public.customers c
 WHERE c.id = a.customer_id;

-- Write-time guard: a gig customer can never be assigned a full_rgs_report.
CREATE OR REPLACE FUNCTION public.enforce_tool_report_mode_vs_customer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_gig boolean;
  v_gig_tier text;
BEGIN
  SELECT is_gig, gig_tier INTO v_is_gig, v_gig_tier
    FROM public.customers WHERE id = NEW.customer_id;

  IF v_is_gig IS NULL THEN
    -- Customer not found: refuse rather than silently allow.
    RAISE EXCEPTION 'tool_report_artifacts: customer % not found', NEW.customer_id;
  END IF;

  IF v_is_gig = true AND NEW.report_mode = 'full_rgs_report' THEN
    RAISE EXCEPTION
      'tool_report_artifacts: gig customer % cannot receive a full_rgs_report artifact',
      NEW.customer_id;
  END IF;

  IF v_is_gig = false AND NEW.report_mode = 'gig_report' THEN
    -- Full client may downgrade to gig_report (e.g. converted accounts);
    -- allowed but tier must be null.
    NEW.gig_tier := NULL;
  END IF;

  IF v_is_gig = true AND NEW.gig_tier IS NULL THEN
    NEW.gig_tier := v_gig_tier;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tool_report_artifacts_mode_guard ON public.tool_report_artifacts;
CREATE TRIGGER tool_report_artifacts_mode_guard
  BEFORE INSERT OR UPDATE OF report_mode, customer_id, gig_tier
  ON public.tool_report_artifacts
  FOR EACH ROW EXECUTE FUNCTION public.enforce_tool_report_mode_vs_customer();

-- Read-time RLS: replace existing customer-read policy with one that
-- additionally denies a gig customer ever reading a full_rgs_report,
-- even if client_visible was incorrectly set.
DROP POLICY IF EXISTS "Customers read approved own tool report artifacts"
  ON public.tool_report_artifacts;

CREATE POLICY "Customers read approved own tool report artifacts"
  ON public.tool_report_artifacts FOR SELECT
  USING (
    archived_at IS NULL
    AND client_visible = true
    AND EXISTS (
      SELECT 1 FROM public.customers c
       WHERE c.id = tool_report_artifacts.customer_id
         AND c.user_id = auth.uid()
         -- gig customers can only ever see gig_report artifacts
         AND (c.is_gig = false OR tool_report_artifacts.report_mode = 'gig_report')
    )
    AND EXISTS (
      SELECT 1 FROM public.report_drafts d
       WHERE d.id = tool_report_artifacts.report_draft_id
         AND d.status = 'approved'
         AND d.client_safe = true
    )
  );

-- Storage objects RLS: mirror the gig/full-RGS denial at the object level.
DROP POLICY IF EXISTS "Customers read approved own tool report objects"
  ON storage.objects;

CREATE POLICY "Customers read approved own tool report objects"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'tool-reports'
    AND EXISTS (
      SELECT 1
        FROM public.tool_report_artifacts a
        JOIN public.customers c ON c.id = a.customer_id
        JOIN public.report_drafts d ON d.id = a.report_draft_id
       WHERE a.storage_bucket = 'tool-reports'
         AND a.storage_path = storage.objects.name
         AND a.client_visible = true
         AND a.archived_at IS NULL
         AND d.status = 'approved'
         AND d.client_safe = true
         AND c.user_id = auth.uid()
         AND (c.is_gig = false OR a.report_mode = 'gig_report')
    )
  );
