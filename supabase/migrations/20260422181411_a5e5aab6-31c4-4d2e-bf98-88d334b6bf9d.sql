-- ============================================================
-- P4.1 Security Hardening Sprint
-- ============================================================

-- 1. RESOURCES BUCKET — remove blanket authenticated read.
-- The "Customers read assigned files" policy already enforces assignment-based
-- access via resources.file_path = storage.objects.name. Dropping the blanket
-- policy leaves the assignment-scoped policy as the only client read path.
DROP POLICY IF EXISTS "Authenticated read resources bucket" ON storage.objects;

-- 2. CLIENT-UPLOADS BUCKET — add UPDATE + DELETE policies scoped to the
-- customer's own folder. Path convention: <customer_id>/<filename>.
CREATE POLICY "Customers update own uploads"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'client-uploads'
    AND EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.user_id = auth.uid()
        AND (storage.foldername(objects.name))[1] = c.id::text
    )
  )
  WITH CHECK (
    bucket_id = 'client-uploads'
    AND EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.user_id = auth.uid()
        AND (storage.foldername(objects.name))[1] = c.id::text
    )
  );

CREATE POLICY "Customers delete own uploads"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'client-uploads'
    AND EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.user_id = auth.uid()
        AND (storage.foldername(objects.name))[1] = c.id::text
    )
  );

-- Admin DELETE/UPDATE on client-uploads (parity with admin SELECT/INSERT)
CREATE POLICY "Admins update client uploads"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'client-uploads' AND public.is_admin(auth.uid()))
  WITH CHECK (bucket_id = 'client-uploads' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins delete client uploads"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'client-uploads' AND public.is_admin(auth.uid()));

-- 3. REALTIME — remove tables from publication. App does not currently
-- subscribe to these channels; removing them eliminates cross-client leakage.
ALTER PUBLICATION supabase_realtime DROP TABLE public.customers;
ALTER PUBLICATION supabase_realtime DROP TABLE public.checklist_items;
ALTER PUBLICATION supabase_realtime DROP TABLE public.customer_timeline;

-- 4. FINANCIAL_CATEGORIES — let clients read global default categories
-- (is_default = true, customer_id IS NULL) in addition to their own.
-- Existing INSERT/UPDATE/DELETE policies already require a non-null
-- customer_id owned by the user, so clients still cannot modify defaults.
CREATE POLICY "Clients view default categories"
  ON public.financial_categories FOR SELECT
  USING (is_default = true AND customer_id IS NULL);

-- 5. FUNCTION SEARCH_PATH — patch the only function missing a fixed path.
-- Logic unchanged; only adds SET search_path = public.
CREATE OR REPLACE FUNCTION public.tool_categories_for_stage(_stage pipeline_stage)
 RETURNS tool_category[]
 LANGUAGE sql
 IMMUTABLE
 SET search_path = public
AS $function$
  SELECT CASE
    WHEN _stage IN (
      'diagnostic_paid','diagnostic_in_progress','diagnostic_delivered',
      'diagnostic_complete','decision_pending','follow_up_nurture'
    ) THEN ARRAY['diagnostic']::public.tool_category[]
    WHEN _stage IN (
      'implementation_added','implementation_onboarding','tools_assigned',
      'client_training_setup','implementation_active','waiting_on_client',
      'review_revision_window','implementation_complete',
      'implementation','work_in_progress','work_completed'
    ) THEN ARRAY['diagnostic','implementation']::public.tool_category[]
    ELSE ARRAY[]::public.tool_category[]
  END
$function$;
